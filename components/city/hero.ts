import * as THREE from "three";

import type { Kit } from "./kit";

/** Everything the hero can be doing. Each state has its own pose, and the rig blends between them. */
export type HeroState =
  | "idle"
  | "walk"
  | "run"
  | "rise"
  | "fall"
  | "glide"
  | "land"
  | "roll"
  | "wave"
  | "dance"
  | "tumble";

/** Joint angles in radians, plus a hip height offset. Every pose fills the same fields. */
type Pose = {
  hipY: number;
  hipX: number;
  hipYaw: number;
  spineX: number;
  spineZ: number;
  spineYaw: number;
  headX: number;
  headYaw: number;
  headZ: number;
  lShX: number;
  lShZ: number;
  lElb: number;
  rShX: number;
  rShZ: number;
  rElb: number;
  lHipX: number;
  lHipZ: number;
  lKnee: number;
  rHipX: number;
  rHipZ: number;
  rKnee: number;
  lFoot: number;
  rFoot: number;
};

const KEYS = [
  "hipY",
  "hipX",
  "hipYaw",
  "spineX",
  "spineZ",
  "spineYaw",
  "headX",
  "headYaw",
  "headZ",
  "lShX",
  "lShZ",
  "lElb",
  "rShX",
  "rShZ",
  "rElb",
  "lHipX",
  "lHipZ",
  "lKnee",
  "rHipX",
  "rHipZ",
  "rKnee",
  "lFoot",
  "rFoot",
] as const satisfies readonly (keyof Pose)[];

const STATES: HeroState[] = ["idle", "walk", "run", "rise", "fall", "glide", "land", "roll", "wave", "dance", "tumble"];

const zero = (): Pose => Object.fromEntries(KEYS.map((k) => [k, 0])) as Pose;

/* Sign conventions, the hero faces +z:
   negative hipX / shoulder X swings a limb forward, positive knee bends the shin back,
   negative elbow bends the forearm forward, positive spineX leans the chest forward,
   arms go out to the side with negative lShZ and positive rShZ. */
function idle(p: Pose, t: number): void {
  const b = Math.sin(t * 1.8);
  p.hipY = b * 0.004;
  p.spineX = 0.03 + b * 0.015;
  p.headYaw = Math.sin(t * 0.45) * 0.35 * Math.max(0, Math.sin(t * 0.21));
  p.headX = -0.04 + Math.sin(t * 0.9) * 0.03;
  p.lShZ = -0.1;
  p.rShZ = 0.1;
  p.lElb = -0.18 + b * 0.04;
  p.rElb = -0.18 + b * 0.04;
  p.lKnee = 0.06;
  p.rKnee = 0.06;
  p.lHipZ = -0.04;
  p.rHipZ = 0.04;
}

function walk(p: Pose, ph: number): void {
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  p.hipY = -Math.abs(s) * 0.03;
  p.hipYaw = s * 0.12;
  p.spineYaw = -s * 0.16;
  p.spineX = 0.08;
  p.headX = -0.04;
  p.lHipX = -s * 0.55;
  p.rHipX = s * 0.55;
  p.lKnee = Math.max(0, c) * 0.95 + 0.08;
  p.rKnee = Math.max(0, -c) * 0.95 + 0.08;
  p.lFoot = Math.max(0, -c) * 0.25;
  p.rFoot = Math.max(0, c) * 0.25;
  p.lShX = s * 0.5;
  p.rShX = -s * 0.5;
  p.lShZ = -0.08;
  p.rShZ = 0.08;
  p.lElb = -0.35;
  p.rElb = -0.35;
}

function run(p: Pose, ph: number): void {
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  p.hipY = Math.abs(c) * 0.07 - 0.06;
  p.hipYaw = s * 0.2;
  p.spineYaw = -s * 0.28;
  p.spineX = 0.34;
  p.headX = -0.22;
  p.lHipX = -s * 1.0 - 0.15;
  p.rHipX = s * 1.0 - 0.15;
  p.lKnee = Math.max(0, c) * 1.8 + 0.25;
  p.rKnee = Math.max(0, -c) * 1.8 + 0.25;
  p.lFoot = 0.3;
  p.rFoot = 0.3;
  p.lShX = s * 1.05;
  p.rShX = -s * 1.05;
  p.lShZ = -0.16;
  p.rShZ = 0.16;
  p.lElb = -1.45;
  p.rElb = -1.45;
}

function rise(p: Pose, t: number): void {
  p.spineX = -0.08;
  p.headX = -0.15;
  p.lHipX = -1.0;
  p.lKnee = 1.5;
  p.rHipX = -0.25;
  p.rKnee = 0.55;
  p.rShX = -2.75;
  p.rShZ = 0.25;
  p.rElb = -0.1;
  p.lShX = 0.35;
  p.lShZ = -0.55;
  p.lElb = -0.6 + Math.sin(t * 6) * 0.1;
}

function fall(p: Pose, t: number): void {
  const f = Math.sin(t * 13);
  p.spineX = 0.06;
  p.headX = 0.2;
  p.lShZ = -1.25 + f * 0.35;
  p.rShZ = 1.25 - f * 0.35;
  p.lShX = -0.3;
  p.rShX = -0.3;
  p.lElb = -0.5;
  p.rElb = -0.5;
  p.lHipX = -0.4 + Math.sin(t * 9) * 0.45;
  p.rHipX = -0.4 - Math.sin(t * 9) * 0.45;
  p.lKnee = 0.8 + Math.cos(t * 9) * 0.4;
  p.rKnee = 0.8 - Math.cos(t * 9) * 0.4;
}

function glide(p: Pose, t: number): void {
  const w = Math.sin(t * 3);
  p.spineX = 0.75;
  p.headX = -0.6;
  p.lShZ = -1.45 + w * 0.06;
  p.rShZ = 1.45 + w * 0.06;
  p.lShX = -0.25;
  p.rShX = -0.25;
  p.lElb = -0.05;
  p.rElb = -0.05;
  p.lHipX = 0.35;
  p.rHipX = 0.25;
  p.lKnee = 0.35;
  p.rKnee = 0.5;
  p.lHipZ = -0.12;
  p.rHipZ = 0.12;
}

function land(p: Pose): void {
  p.hipY = -0.13;
  p.spineX = 0.42;
  p.headX = -0.3;
  p.lHipX = -0.8;
  p.rHipX = -0.6;
  p.lKnee = 1.35;
  p.rKnee = 1.1;
  p.lHipZ = -0.15;
  p.rHipZ = 0.15;
  p.lShZ = -0.7;
  p.rShZ = 0.7;
  p.lShX = 0.3;
  p.rShX = 0.3;
  p.lElb = -0.6;
  p.rElb = -0.6;
}

function roll(p: Pose): void {
  p.hipY = -0.14;
  p.spineX = 1.0;
  p.headX = 0.5;
  p.lHipX = -1.9;
  p.rHipX = -1.9;
  p.lKnee = 2.3;
  p.rKnee = 2.3;
  p.lShX = -1.0;
  p.rShX = -1.0;
  p.lElb = -1.9;
  p.rElb = -1.9;
  p.lShZ = 0.2;
  p.rShZ = -0.2;
}

function wave(p: Pose, t: number): void {
  idle(p, t);
  p.rShZ = 2.55 + Math.sin(t * 9) * 0.3;
  p.rShX = -0.15;
  p.rElb = -0.35 + Math.sin(t * 9) * 0.25;
  p.headZ = Math.sin(t * 4.5) * 0.12;
  p.spineZ = -0.06;
}

function dance(p: Pose, t: number): void {
  const b = Math.sin(t * 7.5);
  const h = Math.sin(t * 3.75);
  p.hipY = -Math.abs(b) * 0.06;
  p.spineZ = h * 0.22;
  p.spineYaw = h * 0.35;
  p.hipYaw = -h * 0.25;
  p.headZ = -h * 0.2;
  p.headX = b * 0.12;
  p.lShX = -2.5 * Math.max(0, h) - 0.4;
  p.rShX = -2.5 * Math.max(0, -h) - 0.4;
  p.lShZ = -0.5;
  p.rShZ = 0.5;
  p.lElb = -1.2 - b * 0.3;
  p.rElb = -1.2 + b * 0.3;
  p.lKnee = 0.3 + Math.max(0, b) * 0.6;
  p.rKnee = 0.3 + Math.max(0, -b) * 0.6;
  p.lHipX = -0.15 - Math.max(0, b) * 0.4;
  p.rHipX = -0.15 - Math.max(0, -b) * 0.4;
  p.lHipZ = -0.18;
  p.rHipZ = 0.18;
}

function tumble(p: Pose, t: number): void {
  const f = Math.sin(t * 16);
  p.lShZ = -1.5 + f * 0.4;
  p.rShZ = 1.5 - f * 0.4;
  p.lShX = -0.8;
  p.rShX = 0.4;
  p.lHipZ = -0.6;
  p.rHipZ = 0.6;
  p.lHipX = -0.5 + f * 0.3;
  p.rHipX = 0.3 - f * 0.3;
  p.lKnee = 0.6;
  p.rKnee = 0.9;
  p.headX = 0.3;
}

/** Abd Alkareem's face: round glasses, brows, moustache and a short beard. Skin shows through the rest. */
function faceTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  if (g) {
    const ink = "#1b1511";
    g.fillStyle = ink;
    g.beginPath();
    g.moveTo(34, 150);
    g.quadraticCurveTo(44, 232, 128, 246);
    g.quadraticCurveTo(212, 232, 222, 150);
    g.quadraticCurveTo(200, 176, 168, 178);
    g.quadraticCurveTo(128, 190, 88, 178);
    g.quadraticCurveTo(56, 176, 34, 150);
    g.fill();
    g.beginPath();
    g.moveTo(76, 168);
    g.quadraticCurveTo(100, 150, 128, 162);
    g.quadraticCurveTo(156, 150, 180, 168);
    g.quadraticCurveTo(156, 184, 128, 174);
    g.quadraticCurveTo(100, 184, 76, 168);
    g.fill();
    g.strokeStyle = "#7a3f35";
    g.lineCap = "round";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(104, 196);
    g.quadraticCurveTo(128, 204, 152, 196);
    g.stroke();
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(82, 118, 8, 9, 0, 0, Math.PI * 2);
    g.ellipse(174, 118, 8, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(54, 86);
    g.quadraticCurveTo(80, 72, 106, 84);
    g.moveTo(150, 84);
    g.quadraticCurveTo(176, 72, 202, 86);
    g.stroke();
    g.fillStyle = "rgba(190,225,255,0.22)";
    g.strokeStyle = "#20262b";
    g.lineWidth = 7;
    g.beginPath();
    g.arc(82, 118, 36, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(174, 118, 36, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(116, 112);
    g.quadraticCurveTo(128, 104, 140, 112);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Abd Alkareem as a jointed figure: hips, spine, neck, two-part arms and legs.
 * Each state is a pose function, and the rig cross-fades between them, so a run can melt into a jump,
 * a glide or a roll without snapping. Height is about one unit, facing +z.
 */
export class Hero {
  readonly root = new THREE.Group();
  /** Rotates around the belly for flips, rolls and tumbles. */
  private spin = new THREE.Group();
  private hips = new THREE.Group();
  private spine = new THREE.Group();
  private head = new THREE.Group();
  private lSh = new THREE.Group();
  private rSh = new THREE.Group();
  private lEl = new THREE.Group();
  private rEl = new THREE.Group();
  private lHip = new THREE.Group();
  private rHip = new THREE.Group();
  private lKn = new THREE.Group();
  private rKn = new THREE.Group();
  private lFt = new THREE.Group();
  private rFt = new THREE.Group();
  private wings: THREE.Group;
  private wingMat: THREE.MeshBasicMaterial;
  private faceMap: THREE.CanvasTexture;

  state: HeroState = "idle";
  /** 0 is a stroll, 1 is a full sprint. Picks the blend between walk and run. */
  stride = 0;
  /** Gait phase, advanced by distance so the feet do not skate. */
  gait = 0;
  /** Extra rotation around the belly: x for flips and rolls, z for tumbles. */
  flip = 0;
  tilt = 0;
  /** 1 is rest. Below 1 squashes, above 1 stretches, keeping the volume. */
  squash = 1;
  /** 0 hides the light wings, 1 shows them fully spread. */
  wingOpen = 0;

  private w: Record<HeroState, number>;
  private pose = zero();
  private tmp = zero();
  private wa = zero();
  private wb = zero();

  constructor(kit: Kit) {
    /* his own materials, outside the palette grade: a muted gold hoodie keeps him the brightest thing on the street */
    const own = (color: number, roughness: number) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness });
      m.userData.keepColor = true;
      return m;
    };
    const hoodie = own(0xff6fb0, 0.8);
    const hoodDark = own(0x8f753d, 0.85);
    const pants = own(0x1c2029, 0.9);
    const skin = own(0xd5a074, 0.75);
    const hair = own(0x1b1511, 0.95);
    const shoe = own(0xe6e2d8, 0.6);
    const sole = own(0x15181f, 0.6);
    const bag = own(0x2a2f3a, 0.8);
    const lace = own(0xff6fb0, 0.7);

    const cap = (r: number, len: number, m: THREE.Material, parent: THREE.Object3D, y: number, x = 0, z = 0) => {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };

    this.root.add(this.spin);
    this.spin.position.y = 0.5;
    this.spin.add(this.hips);
    this.hips.position.y = -0.03;

    /* pelvis and the jointed legs: thigh, knee, shin, ankle, shoe */
    const pelvis = cap(0.095, 0.08, pants, this.hips, 0.0);
    pelvis.rotation.z = Math.PI / 2;
    pelvis.scale.set(1, 1, 0.85);
    const leg = (hip: THREE.Group, knee: THREE.Group, foot: THREE.Group, x: number) => {
      hip.position.set(x, -0.02, 0);
      this.hips.add(hip);
      cap(0.052, 0.14, pants, hip, -0.1);
      knee.position.y = -0.22;
      hip.add(knee);
      cap(0.045, 0.15, pants, knee, -0.1);
      foot.position.y = -0.22;
      knee.add(foot);
      kit.box(foot, 0.085, 0.05, 0.15, shoe, 0, -0.035, 0.03);
      kit.box(foot, 0.09, 0.018, 0.155, sole, 0, -0.04, 0.03, false);
    };
    leg(this.lHip, this.lKn, this.lFt, -0.055);
    leg(this.rHip, this.rKn, this.rFt, 0.055);

    /* torso in the yellow hoodie, with a pocket, drawstrings and a backpack */
    this.spine.position.y = 0.03;
    this.hips.add(this.spine);
    const torso = cap(0.11, 0.13, hoodie, this.spine, 0.14);
    torso.scale.set(1.12, 1, 0.82);
    kit.box(this.spine, 0.15, 0.06, 0.02, hoodDark, 0, 0.06, 0.085, false);
    kit.box(this.spine, 0.01, 0.075, 0.01, lace, -0.028, 0.18, 0.093, false);
    kit.box(this.spine, 0.01, 0.075, 0.01, lace, 0.028, 0.18, 0.093, false);
    const hood = cap(0.07, 0.1, hoodDark, this.spine, 0.28, 0, -0.06);
    hood.rotation.z = Math.PI / 2;
    kit.box(this.spine, 0.17, 0.2, 0.08, bag, 0, 0.06, -0.12);
    kit.box(this.spine, 0.12, 0.07, 0.02, own(0xff6fb0, 0.6), 0, 0.09, -0.165, false);

    /* light wings on his back: they unfold while he glides */
    this.wings = new THREE.Group();
    this.wings.position.set(0, 0.2, -0.16);
    this.spine.add(this.wings);
    this.wingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffb27a).multiplyScalar(1.6),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.35, 0.22, 0.78, 0.12);
    wingShape.quadraticCurveTo(0.55, 0.0, 0.62, -0.12);
    wingShape.quadraticCurveTo(0.3, -0.06, 0, -0.08);
    wingShape.closePath();
    const wingGeo = new THREE.ShapeGeometry(wingShape, 10);
    ([-1, 1] as const).forEach((s) => {
      const wm = new THREE.Mesh(wingGeo, this.wingMat);
      wm.scale.x = s;
      wm.rotation.y = s * 0.25;
      this.wings.add(wm);
    });
    this.wings.visible = false;

    /* arms: shoulder, elbow, hand */
    const arm = (sh: THREE.Group, el: THREE.Group, x: number) => {
      sh.position.set(x, 0.25, 0);
      this.spine.add(sh);
      kit.ball(sh, 0.05, hoodie, 0, 0, 0, 10);
      cap(0.04, 0.11, hoodie, sh, -0.08);
      el.position.y = -0.17;
      sh.add(el);
      cap(0.036, 0.1, hoodie, el, -0.06);
      kit.ball(el, 0.034, skin, 0, -0.15, 0, 10);
    };
    arm(this.lSh, this.lEl, -0.145);
    arm(this.rSh, this.rEl, 0.145);

    /* head: neck, curly hair, ears and the drawn face */
    this.head.position.y = 0.31;
    this.spine.add(this.head);
    cap(0.035, 0.03, skin, this.head, 0.02);
    const skull = kit.ball(this.head, 0.105, skin, 0, 0.13, 0, 18);
    skull.scale.set(1, 1.05, 0.98);
    [
      [0, 0.235, -0.01, 0.075],
      [-0.06, 0.215, 0.03, 0.058],
      [0.06, 0.215, 0.03, 0.058],
      [0, 0.22, 0.05, 0.055],
      [-0.075, 0.18, -0.03, 0.055],
      [0.075, 0.18, -0.03, 0.055],
      [0, 0.18, -0.07, 0.07],
      [-0.045, 0.235, -0.05, 0.06],
      [0.045, 0.235, -0.05, 0.06],
    ].forEach(([x, y, z, r]) => kit.ball(this.head, r, hair, x, y, z, 8));
    kit.ball(this.head, 0.022, skin, -0.105, 0.13, 0, 8, false);
    kit.ball(this.head, 0.022, skin, 0.105, 0.13, 0, 8, false);
    this.faceMap = faceTexture();
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.16),
      new THREE.MeshBasicMaterial({
        map: this.faceMap,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    face.position.set(0, 0.125, 0.1);
    this.head.add(face);

    this.w = Object.fromEntries(STATES.map((s) => [s, s === "idle" ? 1 : 0])) as Record<HeroState, number>;
  }

  /** Snap to the current state without blending, for example when the hero appears. */
  snap(): void {
    for (const s of STATES) this.w[s] = s === this.state ? 1 : 0;
  }

  update(t: number, dt: number): void {
    /* cross-fade: faster into airborne and impact poses, softer between ground poses */
    const fast = this.state === "land" || this.state === "roll" || this.state === "tumble" || this.state === "rise";
    const rate = Math.min(1, dt * (fast ? 18 : 10));
    let sum = 0;
    for (const s of STATES) {
      this.w[s] += ((s === this.state ? 1 : 0) - this.w[s]) * rate;
      sum += this.w[s];
    }

    const out = this.pose;
    for (const k of KEYS) out[k] = 0;
    const tmp = this.tmp;
    for (const s of STATES) {
      const wt = this.w[s] / sum;
      if (wt < 0.002) continue;
      for (const k of KEYS) tmp[k] = 0;
      switch (s) {
        case "idle":
          idle(tmp, t);
          break;
        case "walk":
        case "run": {
          /* walk and run share one gait, mixed by stride */
          const a = this.wa;
          const b = this.wb;
          walk(a, this.gait);
          run(b, this.gait);
          const m = s === "run" ? 1 : this.stride;
          for (const k of KEYS) tmp[k] = a[k] + (b[k] - a[k]) * m;
          break;
        }
        case "rise":
          rise(tmp, t);
          break;
        case "fall":
          fall(tmp, t);
          break;
        case "glide":
          glide(tmp, t);
          break;
        case "land":
          land(tmp);
          break;
        case "roll":
          roll(tmp);
          break;
        case "wave":
          wave(tmp, t);
          break;
        case "dance":
          dance(tmp, t);
          break;
        case "tumble":
          tumble(tmp, t);
          break;
      }
      for (const k of KEYS) out[k] += tmp[k] * wt;
    }

    const p = out;
    this.hips.position.y = -0.03 + p.hipY;
    this.hips.rotation.set(p.hipX, p.hipYaw, 0);
    this.spine.rotation.set(p.spineX, p.spineYaw, p.spineZ);
    this.head.rotation.set(p.headX, p.headYaw, p.headZ);
    this.lSh.rotation.set(p.lShX, 0, p.lShZ);
    this.rSh.rotation.set(p.rShX, 0, p.rShZ);
    this.lEl.rotation.x = p.lElb;
    this.rEl.rotation.x = p.rElb;
    /* the legs hang from the hips, so undo the pelvis lean to keep them under the body */
    this.lHip.rotation.set(p.lHipX - p.hipX * 0.5, 0, p.lHipZ);
    this.rHip.rotation.set(p.rHipX - p.hipX * 0.5, 0, p.rHipZ);
    this.lKn.rotation.x = p.lKnee;
    this.rKn.rotation.x = p.rKnee;
    this.lFt.rotation.x = p.lFoot - p.lKnee * 0.25;
    this.rFt.rotation.x = p.rFoot - p.rKnee * 0.25;

    this.spin.rotation.set(this.flip, 0, this.tilt);
    const sq = this.squash;
    const side = 1 / Math.sqrt(Math.max(0.3, sq));
    this.spin.scale.set(side, sq, side);
    this.spin.position.y = 0.5 * sq;

    this.wings.visible = this.wingOpen > 0.02;
    if (this.wings.visible) {
      const o = this.wingOpen;
      this.wings.scale.setScalar(0.2 + o * 0.8);
      this.wingMat.opacity = o * (0.55 + Math.sin(t * 10) * 0.12);
      this.wings.children.forEach((c, i) => {
        c.rotation.z = (i === 0 ? 1 : -1) * Math.sin(t * 6) * 0.12;
      });
    }
  }

  dispose(): void {
    this.faceMap.dispose();
  }
}
