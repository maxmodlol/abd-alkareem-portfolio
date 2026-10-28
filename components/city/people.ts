import * as THREE from "three";

import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { rng, type Kit } from "./kit";

export type Mode = "walk" | "stand" | "sit" | "wave" | "carry" | "cook" | "serve";
export type Prop = "none" | "bag" | "box" | "tray";
export type Look = { shirt: number; pants: number; skin: number; hair: number };

export type Person = {
  root: THREE.Group;
  rig: THREE.Group;
  lArm: THREE.Group;
  rArm: THREE.Group;
  lLeg: THREE.Group;
  rLeg: THREE.Group;
  mode: Mode;
  phase: number;
};

type Walker = {
  p: Person;
  pts: [number, number][];
  cum: number[];
  total: number;
  speed: number;
  s: number;
  y: number;
};

const SKIN = [0xf3d2b3, 0xe0b189, 0xc68b5c, 0x9a6a45, 0x6f4a31];
/* townsfolk dress in the city's colours: charcoal, navy, stone, camel and the odd cream coat */
const SHIRT = [0x2a2f3a, 0x3b4252, 0x7d838f, 0x6b5a3e, 0xc9c2b0, 0x1c2030, 0x4a5468, 0x9a8762, 0x23293a];
const PANTS = [0x15181f, 0x23293a, 0x3a3328, 0x1c1c24, 0x4b505a];
const HAIR = [0x1b1511, 0x3a2a1c, 0x6b4426, 0xc9a050, 0x222222, 0x8a8a8a];

function angDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function pick(r: () => number, list: readonly number[]): number {
  return list[Math.floor(r() * list.length) % list.length];
}

let sharedMat: THREE.MeshStandardMaterial | null = null;
const peopleMat = () => {
  if (!sharedMat) {
    sharedMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    /* their colours are chosen above; the palette grade would turn skin grey */
    sharedMat.userData.keepColor = true;
  }
  return sharedMat;
};
const tint = new THREE.Color();
const spot = new THREE.Vector3();

/** A primitive moved into place and painted one colour, ready to merge with the rest of a body part. */
function bit(g: THREE.BufferGeometry, color: number, x: number, y: number, z: number): THREE.BufferGeometry {
  g.translate(x, y, z);
  tint.set(color);
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([tint.r, tint.g, tint.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return g;
}
/** Box whose bottom sits at y, like Kit.box. */
const boxBit = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) =>
  bit(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z);
const ballBit = (r: number, color: number, x: number, y: number, z: number, seg: number, sc?: [number, number, number]) => {
  const g = new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7)));
  if (sc) g.scale(sc[0], sc[1], sc[2]);
  return bit(g, color, x, y, z);
};
const cylBit = (rt: number, rb: number, h: number, color: number, x: number, y: number, z: number, seg: number) =>
  bit(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y + h / 2, z);

/** Low-poly townsfolk. Everyone is a handful of boxes with swinging arms and legs. */
export class Folks {
  readonly all: Person[] = [];
  private walkers: Walker[] = [];
  private rand: () => number;

  constructor(
    private kit: Kit,
    seed = 11,
  ) {
    this.rand = rng(seed);
  }

  look(): Look {
    const r = this.rand;
    return { shirt: pick(r, SHIRT), pants: pick(r, PANTS), skin: pick(r, SKIN), hair: pick(r, HAIR) };
  }

  /**
   * Creates a person facing +z (rotate with ry). For "sit", y is the seat surface height minus 0.2,
   * because the hips sit 0.2 above the root.
   */
  person(
    parent: THREE.Object3D,
    mode: Mode,
    x: number,
    y: number,
    z: number,
    ry = 0,
    o: { look?: Look; prop?: Prop; scale?: number; hat?: number } = {},
  ): Person {
    const L = o.look ?? this.look();
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = ry;
    root.scale.setScalar(o.scale ?? 1);
    const rig = new THREE.Group();
    root.add(rig);

    /* each body part is one vertex-coloured mesh, so a person is five draw calls */
    const part = (g: THREE.Object3D, bits: THREE.BufferGeometry[], shadow: boolean) => {
      const m = new THREE.Mesh(mergeGeometries(bits, false) ?? bits[0], peopleMat());
      m.castShadow = shadow;
      bits.forEach((b) => b.dispose());
      g.add(m);
      return m;
    };
    const leg = (lx: number) => {
      const g = new THREE.Group();
      g.position.set(lx, 0.2, 0);
      part(g, [boxBit(0.075, 0.2, 0.085, L.pants, 0, -0.2, 0), boxBit(0.08, 0.035, 0.12, 0x1c1c24, 0, -0.2, 0.018)], false);
      rig.add(g);
      return g;
    };
    const arm = (ax: number, bag: boolean) => {
      const g = new THREE.Group();
      g.position.set(ax, 0.43, 0);
      const bits = [boxBit(0.055, 0.2, 0.06, L.shirt, 0, -0.2, 0), ballBit(0.032, L.skin, 0, -0.208, 0, 8)];
      if (bag) bits.push(boxBit(0.1, 0.075, 0.035, 0x6b432b, 0, -0.3, 0.02));
      part(g, bits, false);
      rig.add(g);
      return g;
    };
    const prop = o.prop ?? "none";
    const lLeg = leg(-0.045);
    const rLeg = leg(0.045);
    const lArm = arm(-0.122, false);
    const rArm = arm(0.122, prop === "bag");
    const body = [boxBit(0.19, 0.24, 0.11, L.shirt, 0, 0.2, 0), ballBit(0.072, L.skin, 0, 0.5, 0, 12)];
    body.push(ballBit(0.077, L.hair, 0, 0.517, -0.012, 10, [1, 0.78, 1.04]));
    if (o.hat !== undefined) body.push(cylBit(0.07, 0.085, 0.13, o.hat, 0, 0.55, 0, 12));
    if (prop === "box") body.push(boxBit(0.2, 0.14, 0.14, 0xc99a63, 0, 0.27, 0.17));
    if (prop === "tray") {
      body.push(boxBit(0.2, 0.012, 0.14, 0xe6e6e6, 0.02, 0.33, 0.16));
      body.push(ballBit(0.03, 0xf25c54, 0.02, 0.35, 0.16, 8));
    }
    part(rig, body, true);

    parent.add(root);
    const p: Person = { root, rig, lArm, rArm, lLeg, rLeg, mode, phase: this.rand() * 6.28 };
    this.all.push(p);
    return p;
  }

  /** Makes a person follow a closed loop of [x, z] points in their parent's space. */
  walker(p: Person, pts: [number, number][], speed: number, start = 0, y = 0): void {
    const loop = [...pts, pts[0]];
    const cum = [0];
    for (let i = 1; i < loop.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
    }
    const total = cum[cum.length - 1];
    this.walkers.push({ p, pts: loop, cum, total, speed, s: start * total, y });
  }

  /** Hides everyone further than `max` from the camera: a few pixels tall, but five draw calls each. */
  cull(cam: THREE.Vector3, max: number): void {
    for (const p of this.all) p.root.visible = spot.setFromMatrixPosition(p.root.matrixWorld).distanceTo(cam) < max;
  }

  update(t: number, dt: number): void {
    for (const w of this.walkers) {
      w.s = (w.s + w.speed * dt) % w.total;
      let i = 0;
      while (i < w.cum.length - 2 && w.cum[i + 1] < w.s) i++;
      const a = w.pts[i];
      const b = w.pts[i + 1];
      const seg = Math.max(1e-6, w.cum[i + 1] - w.cum[i]);
      const u = (w.s - w.cum[i]) / seg;
      w.p.root.position.set(a[0] + (b[0] - a[0]) * u, w.y, a[1] + (b[1] - a[1]) * u);
      const target = Math.atan2(b[0] - a[0], b[1] - a[1]);
      w.p.root.rotation.y += angDiff(w.p.root.rotation.y, target) * Math.min(1, dt * 9);
    }
    for (const p of this.all) {
      if (!p.root.visible) continue;
      const ph = p.phase;
      switch (p.mode) {
        case "walk": {
          const s = Math.sin(t * 8 + ph);
          p.lLeg.rotation.x = s * 0.75;
          p.rLeg.rotation.x = -s * 0.75;
          p.lArm.rotation.x = -s * 0.6;
          p.rArm.rotation.x = s * 0.6;
          p.rig.position.y = Math.abs(s) * 0.016;
          break;
        }
        case "carry": {
          const s = Math.sin(t * 8 + ph);
          p.lLeg.rotation.x = s * 0.75;
          p.rLeg.rotation.x = -s * 0.75;
          p.lArm.rotation.x = -1.25;
          p.rArm.rotation.x = -1.25;
          p.rig.position.y = Math.abs(s) * 0.016;
          break;
        }
        case "serve": {
          const s = Math.sin(t * 7 + ph);
          p.lLeg.rotation.x = s * 0.7;
          p.rLeg.rotation.x = -s * 0.7;
          p.lArm.rotation.x = s * 0.4;
          p.rArm.rotation.x = -1.4;
          p.rig.position.y = Math.abs(s) * 0.014;
          break;
        }
        case "sit": {
          p.lLeg.rotation.x = -1.5;
          p.rLeg.rotation.x = -1.5;
          p.lArm.rotation.x = -0.9 + Math.sin(t * 1.6 + ph) * 0.12;
          p.rArm.rotation.x = -0.9 + Math.cos(t * 1.3 + ph) * 0.12;
          p.rig.rotation.x = Math.sin(t * 0.8 + ph) * 0.03;
          break;
        }
        case "wave": {
          p.rArm.rotation.z = -2.5 + Math.sin(t * 8 + ph) * 0.35;
          p.lArm.rotation.x = Math.sin(t * 1.4 + ph) * 0.05;
          p.rig.position.y = Math.abs(Math.sin(t * 1.2 + ph)) * 0.006;
          break;
        }
        case "cook": {
          p.lArm.rotation.x = -1.1 + Math.sin(t * 9 + ph) * 0.35;
          p.rArm.rotation.x = -1.1 + Math.cos(t * 9 + ph) * 0.35;
          break;
        }
        default: {
          p.lArm.rotation.x = Math.sin(t * 1.3 + ph) * 0.06;
          p.rArm.rotation.x = Math.cos(t * 1.1 + ph) * 0.06;
          p.rig.position.y = Math.abs(Math.sin(t * 1.0 + ph)) * 0.004;
        }
      }
    }
  }
}
