import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { FACADES, facadeMaterial, groundMaterial, shared } from "./facade";

/**
 * The city: a downtown grid of 60 m blocks and 16 m streets, with the tallest towers near the centre
 * and an avenue (x = 0) that runs straight to the plaza in front of the portfolio tower. Everything
 * repeated is instanced: one draw call per building skin, one for the cars, one for their lights,
 * one per street furniture part.
 */

export const PITCH = 60;
export const ROAD = 16;
/** The plaza in front of the portfolio tower: x0, z0, x1, z1. */
export const PLAZA = new THREE.Vector4(-60, -240, 60, -120);
export const TOWER = { x: 0, z: -180, w: 40, d: 40, h: 318 };

export type City = {
  update: (t: number, dt: number, night: number, focus: THREE.Vector3) => void;
  dispose: () => void;
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Box = { x: number; z: number; w: number; d: number; y: number; h: number };

export function buildCity(scene: THREE.Scene, o: { radius: number; cars: number; detail: boolean; shadows: boolean }): City {
  const R = rng(20491);
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  /* ---------- ground ---------- */
  const extent = (o.radius + 6) * PITCH * 2;
  const groundGeo = keep(new THREE.PlaneGeometry(extent, extent));
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, keep(groundMaterial({ pitch: PITCH, road: ROAD, plaza: PLAZA })));
  ground.receiveShadow = o.shadows;
  scene.add(ground);

  /* ---------- buildings ---------- */
  const skins = Object.keys(FACADES) as (keyof typeof FACADES)[];
  const boxes: Record<string, Box[]> = Object.fromEntries(skins.map((k) => [k, []]));
  const roofKit: Box[] = [];
  const beacons: THREE.Vector3[] = [];
  const parks: { x: number; z: number }[] = [];
  const lot = PITCH - ROAD - 6;
  const inPlaza = (x: number, z: number) => x > PLAZA.x - 1 && x < PLAZA.z + 1 && z > PLAZA.y - 1 && z < PLAZA.w + 1;

  const addTower = (cx: number, cz: number, w: number, d: number, h: number, skin: string) => {
    boxes[skin].push({ x: cx, z: cz, w, d, y: 0, h });
    let top = h;
    /* setbacks: tall towers step in once or twice near the top */
    if (h > 70 && R() < 0.75) {
      const k = 0.62 + R() * 0.2;
      const h2 = h * (0.18 + R() * 0.25);
      boxes[skin].push({ x: cx, z: cz, w: w * k, d: d * k, y: h, h: h2 });
      top = h + h2;
      if (h > 120 && R() < 0.5) {
        const h3 = 8 + R() * 18;
        boxes[skin].push({ x: cx, z: cz, w: w * k * 0.6, d: d * k * 0.6, y: top, h: h3 });
        top += h3;
      }
    }
    /* plant on the roof: a few service boxes */
    const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const bw = 2 + R() * 5;
      roofKit.push({ x: cx + (R() - 0.5) * w * 0.4, z: cz + (R() - 0.5) * d * 0.4, w: bw, d: bw * (0.6 + R() * 0.6), y: top, h: 1.5 + R() * 3 });
    }
    if (top > 110) beacons.push(new THREE.Vector3(cx, top + 0.6, cz));
  };

  for (let i = -o.radius; i < o.radius; i++) {
    for (let j = -o.radius; j < o.radius; j++) {
      const cx = (i + 0.5) * PITCH;
      const cz = (j + 0.5) * PITCH;
      if (inPlaza(cx, cz)) continue;
      const dist = Math.hypot(cx, cz + 120);
      const core = Math.exp(-dist / 260);
      /* the avenue's two sides are lined with tall towers: the canyon the camera flies down */
      const avenue = Math.abs(cx) < PITCH && cz > -120 && cz < 260;
      if (!avenue && R() < 0.06 && dist > 120) {
        parks.push({ x: cx, z: cz });
        continue;
      }
      const tall = avenue ? 0.9 : core;
      if (R() < 0.35 + tall * 0.6) {
        const w = lot * (0.55 + R() * 0.4);
        const d = lot * (0.55 + R() * 0.4);
        const h = Math.min(220, 30 + R() * 50 + tall * (50 + Math.pow(R(), 1.6) * 170));
        const skin = h > 90 ? (R() < 0.6 ? "curtain" : "bronze") : R() < 0.5 ? "stone" : "concrete";
        addTower(cx + (R() - 0.5) * (lot - w), cz + (R() - 0.5) * (lot - d), w, d, h, skin);
      } else {
        /* mid-rise block: two to four buildings sharing the lot */
        const split = R() < 0.5;
        const parts = split ? [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]] : [[-0.25, 0], [0.25, 0]];
        for (const [px, pz] of parts) {
          const w = lot * (split ? 0.46 : 0.48);
          const d = lot * (split ? 0.46 : 0.94);
          const h = 12 + R() * 26 + tall * 30;
          const skin = h < 24 ? "brick" : R() < 0.5 ? "stone" : R() < 0.5 ? "brick" : "concrete";
          addTower(cx + px * lot, cz + pz * lot, w * (0.9 + R() * 0.1), d * (0.9 + R() * 0.1), h, skin);
        }
      }
    }
  }
  /* a distant skyline beyond the streets, lost in the haze */
  const far = o.radius * PITCH;
  for (let k = 0; k < (o.detail ? 160 : 70); k++) {
    const a = R() * Math.PI * 2;
    const r = far + 40 + R() * 260;
    const h = 30 + Math.pow(R(), 2) * 160;
    const w = 18 + R() * 26;
    addTower(Math.cos(a) * r, Math.sin(a) * r - 120, w, w * (0.7 + R() * 0.5), h, h > 90 ? "curtain" : "concrete");
  }

  const unit = keep(new THREE.BoxGeometry(1, 1, 1));
  unit.translate(0, 0.5, 0);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const place = (mesh: THREE.InstancedMesh, list: Box[]) => {
    list.forEach((b, i) => {
      v.set(b.x, b.y, b.z);
      s.set(b.w, b.h, b.d);
      m4.compose(v, q, s);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  for (const k of skins) {
    const list = boxes[k];
    if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(unit, keep(facadeMaterial(FACADES[k])), list.length);
    place(mesh, list);
    mesh.castShadow = o.shadows;
    mesh.receiveShadow = o.shadows;
    scene.add(mesh);
  }
  const plant = new THREE.InstancedMesh(unit, keep(new THREE.MeshStandardMaterial({ color: 0x5d5f62, roughness: 0.7, metalness: 0.3 })), roofKit.length);
  place(plant, roofKit);
  plant.castShadow = o.shadows;
  scene.add(plant);

  /* red aviation lights on the tallest roofs, blinking slowly */
  const beaconMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.08, 0.04).multiplyScalar(6), toneMapped: false }));
  const beaconGeo = keep(new THREE.SphereGeometry(0.5, 8, 6));
  const beacon = new THREE.InstancedMesh(beaconGeo, beaconMat, Math.max(1, beacons.length));
  beacons.forEach((p, i) => beacon.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  beacon.count = beacons.length;
  scene.add(beacon);

  /* ---------- street furniture: lamps along every street near the centre ---------- */
  const lampSpots: { x: number; z: number; rot: number }[] = [];
  const near = Math.min(o.radius, o.detail ? 5 : 3);
  for (let i = -near; i <= near; i++) {
    for (let k = -near * PITCH; k < near * PITCH; k += 26) {
      for (const side of [-1, 1]) {
        const off = ROAD / 2 + 1.2;
        const x = i * PITCH + side * off;
        const z = k + 13;
        /* the arm reaches out over the road */
        const clear = (c: number) => Math.abs(c / PITCH - Math.round(c / PITCH)) * PITCH >= ROAD / 2 + 4;
        if (clear(z) && !inPlaza(x, z)) lampSpots.push({ x, z, rot: side < 0 ? Math.PI / 2 : -Math.PI / 2 });
        const x2 = k + 13;
        const z2 = i * PITCH + side * off;
        if (clear(x2) && !inPlaza(x2, z2)) lampSpots.push({ x: x2, z: z2, rot: side < 0 ? 0 : Math.PI });
      }
    }
  }
  const poleGeo = keep(
    mergeGeometries([
      new THREE.CylinderGeometry(0.09, 0.14, 8, 8).translate(0, 4, 0),
      new THREE.BoxGeometry(0.1, 0.1, 2.2).translate(0, 7.9, 1.0),
    ]),
  );
  const headGeo = keep(new THREE.BoxGeometry(0.34, 0.12, 0.8).translate(0, 7.82, 2.0));
  const poleMat = keep(new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.5, metalness: 0.7 }));
  const headMat = keep(new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc98f, emissiveIntensity: 0 }));
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, lampSpots.length);
  /* a soft pool of light on the road under each lamp, cheaper than a real light per lamp */
  const poolGeo = keep(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2).translate(0, 0.03, 2));
  const poolTex = keep(radial(128, "rgba(255,190,120,1)", "rgba(255,170,90,0)"));
  const poolMat = keep(
    new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
  );
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, lampSpots.length);
  lampSpots.forEach((l, i) => {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, l.rot);
    m4.compose(v.set(l.x, 0, l.z), q, s.set(1, 1, 1));
    poles.setMatrixAt(i, m4);
    heads.setMatrixAt(i, m4);
    pools.setMatrixAt(i, m4);
  });
  poles.castShadow = o.shadows;
  scene.add(poles, heads, pools);

  /* ---------- trees along the avenue and in the parks ---------- */
  const treeSpots: THREE.Vector3[] = [];
  for (let z = -112; z < o.radius * PITCH; z += 11) {
    if (Math.abs((z / PITCH) - Math.round(z / PITCH)) * PITCH < ROAD / 2 + 3) continue;
    treeSpots.push(new THREE.Vector3(-(ROAD / 2 + 2.6), 0, z), new THREE.Vector3(ROAD / 2 + 2.6, 0, z));
  }
  for (const p of parks) {
    for (let k = 0; k < 14; k++) treeSpots.push(new THREE.Vector3(p.x + (R() - 0.5) * lot, 0, p.z + (R() - 0.5) * lot));
  }
  /* the plaza: two rows of trees framing the approach to the tower */
  for (let z = -128; z > -150; z -= 7) for (const x of [-14, 14, -26, 26]) treeSpots.push(new THREE.Vector3(x, 0, z));
  const canopy = keep(treeGeometry(R));
  const trunk = keep(new THREE.CylinderGeometry(0.12, 0.2, 3.2, 6).translate(0, 1.6, 0));
  const leafMat = keep(new THREE.MeshStandardMaterial({ color: 0x55663a, roughness: 0.8 }));
  const barkMat = keep(new THREE.MeshStandardMaterial({ color: 0x3a2f27, roughness: 0.9 }));
  const trees = new THREE.InstancedMesh(canopy, leafMat, treeSpots.length);
  const trunks = new THREE.InstancedMesh(trunk, barkMat, treeSpots.length);
  const tint = new THREE.Color();
  treeSpots.forEach((p, i) => {
    const k = 0.8 + R() * 0.5;
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, R() * 6.28);
    m4.compose(p, q, s.set(k, k * (0.9 + R() * 0.3), k));
    trees.setMatrixAt(i, m4);
    trunks.setMatrixAt(i, m4);
    trees.setColorAt(i, tint.setHSL(0.24 + R() * 0.06, 0.3, 0.75 + R() * 0.4));
  });
  trees.castShadow = trunks.castShadow = o.shadows;
  trees.receiveShadow = o.shadows;
  scene.add(trees, trunks);

  /* ---------- traffic ---------- */
  type Car = { axis: 0 | 1; line: number; lane: number; dir: number; pos: number; speed: number; min: number; max: number };
  const cars: Car[] = [];
  const span = o.radius * PITCH;
  for (let n = 0; n < o.cars; n++) {
    const axis = (n % 2) as 0 | 1;
    /* a third of the traffic is on the avenue, where the camera sees it up close */
    const onAvenue = n % 3 === 0;
    const line = onAvenue ? 0 : (Math.floor(R() * (o.radius * 2 - 1)) - o.radius + 1) * PITCH;
    const dir = R() < 0.5 ? 1 : -1;
    const lane = dir * (1.9 + (R() < 0.5 ? 0 : 3.4));
    const realAxis = onAvenue ? 1 : axis;
    let min = -span;
    let max = span;
    /* nothing drives through the plaza */
    if (realAxis === 1 && Math.abs(line) < PLAZA.z) min = PLAZA.w + 2;
    if (realAxis === 0 && line > PLAZA.y && line < PLAZA.w) continue;
    cars.push({ axis: realAxis, line, lane, dir, pos: min + R() * (max - min), speed: 9 + R() * 7, min, max });
  }
  const body = new RoundedBoxGeometry(1.9, 0.75, 4.5, 2, 0.18).translate(0, 0.62, 0);
  const cabin = new RoundedBoxGeometry(1.7, 0.6, 2.4, 2, 0.16).translate(0, 1.22, -0.25);
  const wheels = [-1, 1].flatMap((sx) =>
    [-1.45, 1.45].map((wz) => new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10).rotateZ(Math.PI / 2).translate(sx * 0.86, 0.34, wz)),
  );
  const paint = (g: THREE.BufferGeometry, c: number) => {
    const col = new THREE.Color(c);
    const arr = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) arr.set([col.r, col.g, col.b], i);
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    if (g.index) return g.toNonIndexed();
    return g;
  };
  const carGeo = keep(
    mergeGeometries([paint(body, 0xffffff), paint(cabin, 0x0b0d10), ...wheels.map((w) => paint(w, 0x111111))].map((g) => {
      const ng = g.index ? g.toNonIndexed() : g;
      ng.deleteAttribute("uv");
      return ng;
    })),
  );
  const carMat = keep(
    new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.12 }),
  );
  const carMesh = new THREE.InstancedMesh(carGeo, carMat, Math.max(1, cars.length));
  const paints = [0xe9e9e6, 0x0e0f11, 0x8d9196, 0x1b2a44, 0x5b1517, 0x2f3236, 0xc9c6bd, 0x3d4a3a];
  cars.forEach((_, i) => carMesh.setColorAt(i, tint.set(paints[Math.floor(R() * paints.length)])));
  carMesh.castShadow = o.shadows;
  /* head and tail lights: one instanced mesh sharing the cars' matrices */
  const lamp = (x: number, z: number, c: number) => paint(new THREE.PlaneGeometry(0.42, 0.16).rotateY(z > 0 ? 0 : Math.PI).translate(x, 0.78, z), c);
  const lightGeo = keep(
    mergeGeometries(
      [lamp(-0.62, 2.26, 0xfff1d8), lamp(0.62, 2.26, 0xfff1d8), lamp(-0.66, -2.26, 0xff1a0a), lamp(0.66, -2.26, 0xff1a0a)].map((g) => {
        const ng = g.index ? g.toNonIndexed() : g;
        ng.deleteAttribute("uv");
        ng.deleteAttribute("normal");
        return ng;
      }),
    ),
  );
  const lightMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const lightMesh = new THREE.InstancedMesh(lightGeo, lightMat, Math.max(1, carMesh.count));
  carMesh.count = lightMesh.count = cars.length;
  scene.add(carMesh, lightMesh);

  const carQ = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const updateCars = (dt: number) => {
    cars.forEach((c, i) => {
      c.pos += c.dir * c.speed * dt;
      if (c.pos > c.max) c.pos = c.min;
      else if (c.pos < c.min) c.pos = c.max;
      /* ease in and out at the ends of the run, so cars never pop into view */
      const edge = Math.min(c.pos - c.min, c.max - c.pos);
      const k = Math.min(1, edge / 6);
      if (c.axis === 1) {
        v.set(c.line + c.lane, 0, c.pos);
        carQ.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, c.dir > 0 ? 0 : Math.PI);
      } else {
        v.set(c.pos, 0, c.line - c.lane);
        carQ.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      m4.compose(v, carQ, s.copy(one).multiplyScalar(k));
      carMesh.setMatrixAt(i, m4);
      lightMesh.setMatrixAt(i, m4);
    });
    carMesh.instanceMatrix.needsUpdate = true;
    lightMesh.instanceMatrix.needsUpdate = true;
  };
  updateCars(0);

  const lampCol = new THREE.Color();
  return {
    update(t, dt, night, focus) {
      void focus;
      shared.uNight.value = night;
      shared.uTime.value = t;
      if (dt > 0) updateCars(dt);
      const on = THREE.MathUtils.smoothstep(night, 0.25, 0.6);
      headMat.emissiveIntensity = on * 6;
      poolMat.opacity = on * 0.55;
      lightMat.color.copy(lampCol.setScalar(1.5 + night * 3));
      beaconMat.color.setRGB(1, 0.08, 0.04).multiplyScalar(Math.sin(t * 2.2) > 0.2 ? 5 + night * 4 : 0.3);
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

/** A tree canopy: a few lumpy blobs that read as foliage at street distance. */
function treeGeometry(R: () => number): THREE.BufferGeometry {
  const blobs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.IcosahedronGeometry(1.1 + R() * 0.6, 2);
    const p = g.attributes.position;
    const ph = R() * 10;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      const y = p.getY(k);
      const z = p.getZ(k);
      /* a smooth lumpy surface; a function of position, so shared corners move together */
      const n = 0.86 + 0.14 * Math.sin(x * 2.1 + ph) * Math.cos(z * 2.3 - ph) + 0.08 * Math.sin(y * 3.1 + ph);
      p.setXYZ(k, x * n, y * n * 0.85, z * n);
    }
    g.translate((R() - 0.5) * 2.2, 3.8 + R() * 1.8, (R() - 0.5) * 2.2);
    blobs.push(g);
  }
  const merged = mergeGeometries(blobs);
  merged.computeVertexNormals();
  return merged;
}

/** A soft round gradient as a texture. */
export function radial(size: number, inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
