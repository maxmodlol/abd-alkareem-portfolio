import * as THREE from "three";

import { canvasTex, rng, type Kit } from "./kit";
import { boulder, leafBlob, palmGeo, windify } from "./nature";
import { grassMaps, pavingMaps } from "./textures";

/**
 * The island as a game map: an irregular lawn with a downtown lobe behind the projects, sandy beaches
 * that run down into a shallow turquoise sea, piers, small islets and a skyline of glass towers.
 * The shoreline is one formula, shared with the sea shader so the foam sits exactly on the sand.
 */

export const SEA_Y = -0.45;
/** Direction of the downtown lobe, behind the projects as seen from the opening shot. */
export const DOWNTOWN_A = 3.927;
const LOBE = 7.0;
const LOBE_W = 0.45;

const angD = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Radius of the lawn at angle a (radians, atan2(z, x)). */
export function grassR(a: number): number {
  const l = angD(a, DOWNTOWN_A);
  return 11.45 + 0.28 * Math.sin(3 * a + 0.7) + 0.18 * Math.sin(5 * a + 2.3) + LOBE * Math.exp(-(l * l) / (LOBE_W * LOBE_W));
}

/** Width of the beach from the lawn to the waterline. */
export function beachW(a: number): number {
  return 1.7 + 0.6 * Math.sin(3 * a + 0.4) + 0.35 * Math.sin(7 * a + 1.9);
}

/** Islets: x, z, waterline radius, hill height. The first ones are close by, the last three are on the horizon. */
export const ISLETS: [number, number, number, number][] = [
  [8.5, 14.7, 1.8, 0.9],
  [24.2, -14, 2.2, 0.5],
  [-24.2, 14, 2.6, 1.4],
  [-6.6, 37.4, 2.0, 1.1],
  [10, -37.2, 1.6, 0.8],
  [-27.2, -9.9, 1.4, 0.6],
  [-35.9, -98.7, 22, 15],
  [-86.1, -40.1, 16, 10],
  [39.3, -108, 18, 12],
];

/** The same shoreline in GLSL, for the sea. Needs `uniform vec3 uIslets[ISLET_COUNT]`. */
export const SHORE_GLSL = `
  float angD(float a, float b) { float d = a - b; return atan(sin(d), cos(d)); }
  float shoreR(float a) {
    float l = angD(a, ${DOWNTOWN_A.toFixed(3)});
    return 11.45 + 0.28 * sin(3.0 * a + 0.7) + 0.18 * sin(5.0 * a + 2.3) + ${LOBE.toFixed(2)} * exp(-(l * l) / ${(LOBE_W * LOBE_W).toFixed(4)})
      + 1.7 + 0.6 * sin(3.0 * a + 0.4) + 0.35 * sin(7.0 * a + 1.9);
  }
  float shoreDist(vec2 p) {
    float d = length(p) - shoreR(atan(p.y, p.x));
    for (int i = 0; i < ${ISLETS.length}; i++) d = min(d, length(p - uIslets[i].xy) - uIslets[i].z);
    return d;
  }
`;

const ROAD_ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
const nearRoad = (a: number, w = 0.2) => ROAD_ANGLES.some((q) => Math.abs(angD(a, q)) < w);

/** Collects palm positions from every part of the map and draws them all in one instanced mesh. */
export class Palms {
  private list: { x: number; y: number; z: number; s: number; r: number; v: number }[] = [];

  add(x: number, y: number, z: number, s: number, r: number): void {
    this.list.push({ x, y, z, s, r, v: this.list.length % 3 });
  }

  build(parent: THREE.Object3D, shadows: boolean): void {
    const mat = windify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.FrontSide }), "crown");
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    [0, 1, 2].forEach((v) => {
      const items = this.list.filter((it) => it.v === v);
      if (!items.length) return;
      const mesh = new THREE.InstancedMesh(palmGeo(v + 1), mat, items.length);
      items.forEach((it, i) => {
        q.setFromEuler(e.set(0, it.r, 0));
        m.compose(p.set(it.x, it.y, it.z), q, sc.setScalar(it.s));
        mesh.setMatrixAt(i, m);
      });
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      parent.add(mesh);
    });
  }
}

/* ------------------------------------------------------------------ */
/* Lawn, beach, gates, piers and beach life                                                        */
/* ------------------------------------------------------------------ */
export function makeCoast(kit: Kit, island: THREE.Group, palms: Palms): void {
  const N = 220;

  /* the lawn: one flat shape following the shoreline formula */
  const shape = new THREE.Shape();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = grassR(a);
    if (i === 0) shape.moveTo(Math.cos(a) * r, -Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, -Math.sin(a) * r);
  }
  const lawnGeo = new THREE.ShapeGeometry(shape, 1);
  lawnGeo.rotateX(-Math.PI / 2);
  const lp = lawnGeo.attributes.position as THREE.BufferAttribute;
  const luv = lawnGeo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < lp.count; i++) luv.setXY(i, lp.getX(i) / 23 + 0.5, lp.getZ(i) / 23 + 0.5);
  const lawn = grassMaps(9);
  const lawnMat = new THREE.MeshStandardMaterial({ ...lawn, roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) });
  const top = new THREE.Mesh(lawnGeo, lawnMat);
  top.receiveShadow = true;
  island.add(top);

  /* the beach: rings of sand from the lawn edge down under the water, dry on top and wet at the waterline */
  const ringOff = (w: number) => [-0.25, 0.3, Math.max(0.42, w * 0.55), w, w + 1.0, w + 2.8];
  const ringY = [-0.004, -0.05, -0.2, SEA_Y, SEA_Y - 0.45, SEA_Y - 1.4];
  const ringC = [0xf2c983, 0xefc07a, 0xe6b16c, 0xd29b5c, 0xbf8c54, 0x9f7a52].map((c) => new THREE.Color(c));
  const RN = ringY.length;
  const pos = new Float32Array((N + 1) * RN * 3);
  const col = new Float32Array((N + 1) * RN * 3);
  const R = rng(5);
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const g = grassR(a);
    const w = beachW(a);
    const offs = ringOff(w);
    for (let k = 0; k < RN; k++) {
      const r = g + offs[k];
      const j = i * RN + k;
      pos[j * 3] = Math.cos(a) * r;
      pos[j * 3 + 1] = ringY[k];
      pos[j * 3 + 2] = Math.sin(a) * r;
      const s = 0.96 + R() * 0.08;
      col[j * 3] = ringC[k].r * s;
      col[j * 3 + 1] = ringC[k].g * s;
      col[j * 3 + 2] = ringC[k].b * s;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < RN - 1; k++) {
      const a = i * RN + k;
      const b = (i + 1) * RN + k;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const sandGeo = new THREE.BufferGeometry();
  sandGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  sandGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  sandGeo.setIndex(idx);
  sandGeo.computeVertexNormals();
  const sand = new THREE.Mesh(sandGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  sand.receiveShadow = true;
  island.add(sand);

  /* a spot on the dry sand: k = 0 at the lawn, 1 at the waterline */
  const beach = (a: number, k: number): [number, number, number] => {
    const r = grassR(a) + beachW(a) * k;
    const y = k < 0.55 ? -0.05 - k * 0.27 : -0.2 + ((k - 0.55) / 0.45) * (SEA_Y + 0.2);
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };

  /* palms along the beach, with gaps for the roads and the piers */
  const PIERS = [0.32, 2.75];
  const busy = (a: number) => nearRoad(a, 0.24) || PIERS.some((p) => Math.abs(angD(a, p)) < 0.12);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + R() * 0.05;
    if (busy(a) || R() < 0.3) continue;
    const [x, y, z] = beach(a, 0.12 + R() * 0.3);
    palms.add(x, y, z, 0.75 + R() * 0.45, R() * 6.28);
  }

  /* umbrellas and loungers in a few beach clubs */
  const umbrellas: [number, number, number, number][] = [];
  const loungers: [number, number, number, number][] = [];
  [0.75, 2.2, 5.55, 4.75].forEach((c, ci) => {
    for (let k = 0; k < 4; k++) {
      const a = c + (k - 1.5) * 0.045;
      if (busy(a)) continue;
      const [x, y, z] = beach(a, 0.5 + (k % 2) * 0.12);
      umbrellas.push([x, y, z, ci * 4 + k]);
      const tx = -Math.sin(a);
      const tz = Math.cos(a);
      const [lx, ly, lz] = beach(a, 0.62 + (k % 2) * 0.12);
      loungers.push([lx + tx * 0.18, ly, lz + tz * 0.18, Math.atan2(Math.cos(a), Math.sin(a))]);
    }
  });
  const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.62, 5);
  poleGeo.translate(0, 0.31, 0);
  const canopyGeo = new THREE.ConeGeometry(0.36, 0.14, 10, 1, true);
  canopyGeo.translate(0, 0.62, 0);
  const poles = new THREE.InstancedMesh(poleGeo, kit.mat(0xfff4e3, 0.6), umbrellas.length);
  const canopies = new THREE.InstancedMesh(canopyGeo, new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), umbrellas.length);
  const shades = [0xf25c54, 0xffc83d, 0x2f9fd8, 0xff8fb1, 0x58c985].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4();
  umbrellas.forEach(([x, y, z, s], i) => {
    m4.makeTranslation(x, y, z);
    poles.setMatrixAt(i, m4);
    canopies.setMatrixAt(i, m4);
    canopies.setColorAt(i, shades[s % shades.length]);
  });
  canopies.castShadow = true;
  [poles, canopies].forEach((m) => {
    m.computeBoundingSphere();
    island.add(m);
  });
  const loungerGeo = new THREE.BoxGeometry(0.16, 0.05, 0.42);
  loungerGeo.translate(0, 0.06, 0);
  const lmesh = new THREE.InstancedMesh(loungerGeo, kit.mat(0xffffff, 0.7), loungers.length);
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  loungers.forEach(([x, y, z, r], i) => {
    m4.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, r), new THREE.Vector3(1, 1, 1));
    lmesh.setMatrixAt(i, m4);
  });
  lmesh.castShadow = true;
  lmesh.computeBoundingSphere();
  island.add(lmesh);

  /* a few rounded rocks at the waterline */
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xb3a089, roughness: 0.95, flatShading: false });
  for (let i = 0; i < 10; i++) {
    const a = R() * Math.PI * 2;
    if (busy(a)) continue;
    const [x, , z] = beach(a, 0.92 + R() * 0.2);
    const s = 0.22 + R() * 0.32;
    const m = kit.put(island, boulder(i % 5), rockMat, x, SEA_Y + s * 0.15, z);
    m.scale.setScalar(s);
    m.rotation.set(R() * 0.5, R() * 3, R() * 0.5);
  }

  /* wooden piers with a speedboat moored at each */
  const plank = kit.mat(0xb07f52, 0.85);
  const post = kit.mat(0x7a5434, 0.9);
  PIERS.forEach((a, pi) => {
    const r0 = grassR(a) + beachW(a) * 0.55;
    const len = beachW(a) * 0.45 + 3.2;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * r0, 0, Math.sin(a) * r0);
    g.rotation.y = -a + Math.PI / 2;
    island.add(g);
    kit.box(g, 0.7, 0.06, len, plank, 0, SEA_Y + 0.42, len / 2);
    for (let z = 0.6; z < len; z += 0.9) {
      kit.cyl(g, 0.04, 0.04, 0.8, post, -0.32, SEA_Y - 0.3, z, 6, false);
      kit.cyl(g, 0.04, 0.04, 0.8, post, 0.32, SEA_Y - 0.3, z, 6, false);
    }
    const boat = new THREE.Group();
    boat.position.set(0.85, SEA_Y + 0.05, len - 0.8);
    g.add(boat);
    const hull = kit.mat(pi ? 0x2f80c8 : 0xffffff, 0.45);
    kit.box(boat, 0.42, 0.2, 1.2, hull, 0, 0, 0);
    kit.put(boat, new THREE.ConeGeometry(0.3, 0.45, 4), hull, 0, 0.1, 0.8).rotation.set(Math.PI / 2, 0, Math.PI / 4);
    kit.box(boat, 0.3, 0.16, 0.36, 0xdbeef7, 0, 0.2, 0.1);
    kit.box(boat, 0.44, 0.03, 1.22, pi ? 0xffffff : 0xf25c54, 0, 0.17, 0, false);
    kit.anims.push((t) => {
      boat.position.y = SEA_Y + 0.05 + Math.sin(t * 1.4 + pi) * 0.025;
      boat.rotation.z = Math.sin(t * 1.1 + pi) * 0.04;
    });
  });

  /* portals where the roads leave the island: cars drive into a swirl of light */
  const frame = kit.mat(0xdfe7ec, 0.35, 0.2);
  const trim = kit.glowMat(0x4ff3ff, 0.9, 1.8, 0x103038);
  const swirl = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#04121c";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
      gr.addColorStop(0, "rgba(140,250,255,0.55)");
      gr.addColorStop(1, "rgba(20,120,170,0)");
      g.strokeStyle = `rgba(110,240,255,${0.15 + (i % 3) * 0.12})`;
      g.lineWidth = 6;
      g.beginPath();
      g.arc(w / 2, h / 2, 18 + i * 13, i * 0.7, i * 0.7 + Math.PI * 1.2);
      g.stroke();
      if (i === 0) {
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }
    }
  });
  swirl.center.set(0.5, 0.5);
  const holeMat = new THREE.MeshBasicMaterial({ map: swirl });
  const mouth = (axis: "x" | "z", s: 1 | -1) => {
    const g = new THREE.Group();
    g.position.set(axis === "x" ? s * 10.6 : 0, 0, axis === "z" ? s * 10.6 : 0);
    g.rotation.y = axis === "x" ? Math.PI / 2 : 0;
    island.add(g);
    kit.box(g, 2.5, 1.35, 1.2, frame, 0, 0, 0);
    kit.box(g, 2.6, 0.08, 1.3, trim, 0, 1.35, 0, false);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.95), holeMat);
    hole.position.set(0, 0.5, -0.61 * s);
    hole.rotation.y = s > 0 ? Math.PI : 0;
    g.add(hole);
    kit.box(g, 0.12, 1.08, 0.1, trim, -0.92, 0, -0.62 * s, false);
    kit.box(g, 0.12, 1.08, 0.1, trim, 0.92, 0, -0.62 * s, false);
    kit.box(g, 1.96, 0.1, 0.1, trim, 0, 1.0, -0.62 * s, false);
  };
  mouth("x", 1);
  mouth("x", -1);
  mouth("z", 1);
  mouth("z", -1);
  kit.anims.push((_t, dt) => {
    swirl.rotation -= dt * 0.9;
  });
}

/* ------------------------------------------------------------------ */
/* Islets: sandy rings with a hill and a palm or two; the far ones are mountains                   */
/* ------------------------------------------------------------------ */
export function makeIslets(kit: Kit, scene: THREE.Scene, palms: Palms): void {
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xefc07a, roughness: 1, side: THREE.DoubleSide });
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x5fae48, roughness: 0.95, flatShading: true });
  const farMat = new THREE.MeshStandardMaterial({ color: 0x5a9f52, roughness: 1, flatShading: true });
  const R = rng(61);
  ISLETS.forEach(([x, z, r, h], i) => {
    const far = r > 10;
    const prof = [
      new THREE.Vector2(0, 0.06),
      new THREE.Vector2(r * 0.7, 0.04),
      new THREE.Vector2(r, SEA_Y),
      new THREE.Vector2(r + (far ? 4 : 1.2), SEA_Y - (far ? 2 : 0.8)),
    ];
    const sand = new THREE.Mesh(new THREE.LatheGeometry(prof, far ? 40 : 28), sandMat);
    sand.position.set(x, 0, z);
    sand.receiveShadow = !far;
    scene.add(sand);
    const hill = new THREE.Mesh(boulder(10 + i), far ? farMat : hillMat);
    hill.position.set(x + (far ? 0 : r * 0.12), 0, z);
    hill.scale.set(r * (far ? 0.72 : 0.55), h, r * (far ? 0.66 : 0.5));
    hill.rotation.y = R() * 6;
    hill.castShadow = !far;
    hill.receiveShadow = !far;
    scene.add(hill);
    if (far || i === 1) return;
    const n = r > 2 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2;
      palms.add(x + Math.cos(a) * r * 0.62, 0.03, z + Math.sin(a) * r * 0.62, 0.7 + R() * 0.35, R() * 6.28);
    }
  });
  void kit;
}

/* ------------------------------------------------------------------ */
/* Downtown: a plaza and a cluster of glass towers on the lobe behind the projects                  */
/* ------------------------------------------------------------------ */
type TowerStyle = { base: string; glass: string; roof: number };
const STYLES: TowerStyle[] = [
  { base: "#cfd9e3", glass: "#2d7ccf", roof: 0xc3ced8 },
  { base: "#cfe7e4", glass: "#1fa3b5", roof: 0xbcd9d5 },
  { base: "#d8d0ea", glass: "#5b6fd6", roof: 0xc8bfe0 },
  { base: "#c8603e", glass: "#7fbfe6", roof: 0xa94f33 },
  { base: "#e3d6bf", glass: "#3b8fd0", roof: 0xd2c3a8 },
];

export function makeDowntown(kit: Kit, island: THREE.Group, palms: Palms): void {
  const ax = Math.cos(DOWNTOWN_A);
  const az = Math.sin(DOWNTOWN_A);
  const at = (u: number, v: number): [number, number] => [ax * u - az * v, az * u + ax * v];
  const glow = kit.glowMat(0x4ff3ff, 0.7, 2.2, 0x0e2a30);
  const blink = kit.glowMat(0xff3b30, 1.5, 5, 0x330000);
  const blinkers: THREE.Mesh[] = [];
  const rings: THREE.Mesh[] = [];
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x6ff6ff).multiplyScalar(1.3),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  /* u along the lobe, v across it; w, d footprint; h height; style; extra */
  const towers: [number, number, number, number, number, number, "" | "spire" | "ring" | "antenna"][] = [
    [11.9, -2.9, 1.5, 1.5, 6.4, 0, "antenna"],
    [12.1, 3.0, 1.4, 1.6, 8.0, 1, "ring"],
    [14.6, -4.1, 1.4, 1.4, 5.2, 3, ""],
    [14.6, 4.1, 1.5, 1.5, 9.2, 0, "antenna"],
    [16.3, -1.7, 1.8, 1.8, 10.2, 4, "spire"],
    [16.5, 2.1, 1.3, 1.3, 7.2, 2, "ring"],
    [11.2, 0.1, 1.1, 1.1, 3.8, 3, ""],
    [17.2, 0.3, 1.0, 1.0, 4.6, 1, ""],
  ];
  towers.forEach(([u, v, w, d, h, si, extra], i) => {
    const [x, z] = at(u, v);
    const st = STYLES[si];
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    island.add(g);
    const fac = kit.facade(st.base, {
      cols: Math.max(3, Math.round(w * 3.2)),
      rows: Math.round(h * 2.4),
      seed: 300 + i,
      glass: st.glass,
      lit: 0.5,
      night: 2.4,
    });
    const roof = kit.mat(st.roof, 0.7);
    /* podium with a glowing shopfront band */
    kit.box(g, w + 0.36, 0.55, d + 0.36, kit.mat(0x3b4a57, 0.5, 0.3), 0, 0, 0);
    kit.box(g, w + 0.4, 0.06, d + 0.4, glow, 0, 0.42, 0, false);
    kit.box(g, w, h - 0.55, d, kit.sides(fac, roof), 0, 0.55, 0);
    /* light strips on the corners and a crown on top */
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) kit.box(g, 0.06, h - 0.6, 0.06, glow, (sx * w) / 2, 0.58, (sz * d) / 2, false);
    }
    kit.box(g, w * 0.72, 0.45, d * 0.72, roof, 0, h, 0);
    kit.box(g, w * 0.76, 0.05, d * 0.76, glow, 0, h + 0.45, 0, false);
    kit.box(g, 0.32, 0.22, 0.3, 0x9aa7b0, w * 0.18, h + 0.45, -d * 0.12);
    if (extra === "antenna" || extra === "spire") {
      const tall = extra === "spire" ? 2.4 : 1.1;
      if (extra === "spire") kit.cone(g, w * 0.3, tall, kit.mat(0xdfe6ea, 0.3, 0.6), 0, h + 0.45, 0, 8);
      else kit.cyl(g, 0.03, 0.04, tall, 0x9aa7b0, 0, h + 0.45, 0, 6, false);
      blinkers.push(kit.ball(g, 0.07, blink, 0, h + 0.5 + tall, 0, 8, false));
    }
    if (extra === "ring") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.95, 0.025, 6, 48), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h * 0.82;
      g.add(ring);
      rings.push(ring);
    }
  });

  /* the plaza: paving, a fountain, palms and benches */
  const [px, pz] = at(14.2, 0);
  const plaza = new THREE.Group();
  plaza.position.set(px, 0, pz);
  island.add(plaza);
  const paving = new THREE.MeshStandardMaterial({ ...pavingMaps(3), roughness: 1 });
  kit.put(plaza, new THREE.CylinderGeometry(1.75, 1.75, 0.05, 40), paving, 0, 0.025, 0, false);
  kit.cyl(plaza, 0.72, 0.78, 0.2, 0xe9eef2, 0, 0, 0, 28);
  const water = new THREE.MeshStandardMaterial({ color: 0x55d6e6, roughness: 0.1, emissive: 0x1c8aa0, emissiveIntensity: 0.3 });
  kit.cyl(plaza, 0.64, 0.64, 0.17, water, 0, 0.04, 0, 28, false);
  kit.cyl(plaza, 0.1, 0.14, 0.55, 0xe9eef2, 0, 0.2, 0, 10);
  const jetMat = new THREE.MeshBasicMaterial({ color: 0xdffcff, transparent: true, opacity: 0.55, depthWrite: false });
  const jet = kit.put(plaza, new THREE.ConeGeometry(0.16, 0.7, 10, 1, true), jetMat, 0, 1.08, 0, false);
  jet.rotation.x = Math.PI;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    palms.add(px + Math.cos(a) * 1.35, 0.05, pz + Math.sin(a) * 1.35, 0.7, a);
    kit.box(plaza, 0.4, 0.12, 0.12, 0xb07f52, Math.cos(a + 0.8) * 1.25, 0.05, Math.sin(a + 0.8) * 1.25);
  }

  /* bushes on the lawn between the towers */
  const bush = windify(new THREE.MeshStandardMaterial({ color: 0x4fae63, roughness: 0.9, vertexColors: true }), "crown");
  const R = rng(19);
  for (let i = 0; i < 14; i++) {
    const [x, z] = at(11 + R() * 7, (R() - 0.5) * 9);
    const a = Math.atan2(z, x);
    if (Math.hypot(x, z) > grassR(a) - 0.6) continue;
    if (towers.some(([u, v, w]) => {
      const [tx, tz] = at(u, v);
      return Math.hypot(tx - x, tz - z) < w * 0.9 + 0.5;
    })) continue;
    if (Math.hypot(x - px, z - pz) < 2) continue;
    const m = kit.put(island, leafBlob(i % 6, 2), bush, x, 0.12, z);
    m.scale.set(0.32, 0.24, 0.32);
  }

  /* hover cars on a loop through the skyline */
  const cars: { g: THREE.Group; ph: number; sp: number; y: number }[] = [];
  const carCols = [0xf25c54, 0xffffff, 0xffc83d, 0x2f9fd8];
  carCols.forEach((c, i) => {
    const g = new THREE.Group();
    island.add(g);
    const body = kit.ball(g, 0.2, kit.mat(c, 0.3, 0.4), 0, 0, 0, 14, true);
    body.scale.set(0.75, 0.45, 1.5);
    const cab = kit.ball(g, 0.12, kit.mat(0x1d3550, 0.1, 0.6), 0, 0.07, 0.04, 12, false);
    cab.scale.set(1, 0.7, 1.3);
    const under = kit.put(g, new THREE.CircleGeometry(0.14, 16), glow, 0, -0.09, 0, false);
    under.rotation.x = Math.PI / 2;
    kit.box(g, 0.2, 0.04, 0.04, glow, 0, -0.02, -0.29, false);
    cars.push({ g, ph: (i / carCols.length) * Math.PI * 2, sp: i % 2 ? 0.32 : -0.26, y: 4.4 + i * 0.75 });
  });
  const [cx, cz] = at(14.4, 0);
  const tmp = new THREE.Vector3();

  kit.anims.push((t) => {
    blinkers.forEach((b, i) => (b.visible = Math.floor(t * 1.4 + i * 0.3) % 2 === 0));
    rings.forEach((r, i) => {
      r.rotation.z = t * (0.6 + i * 0.2);
      r.position.y += Math.sin(t * 1.2 + i) * 0.002;
    });
    ringMat.opacity = 0.4 + Math.sin(t * 2) * 0.12 + kit.night * 0.3;
    jet.scale.y = 1 + Math.sin(t * 6) * 0.06;
    cars.forEach((c) => {
      const a = c.ph + t * c.sp;
      const lu = Math.cos(a) * 3.9;
      const lv = Math.sin(a) * 6.3;
      const [x, z] = [cx + ax * lu - az * lv, cz + az * lu + ax * lv];
      const a2 = a + 0.05 * Math.sign(c.sp);
      const lu2 = Math.cos(a2) * 3.9;
      const lv2 = Math.sin(a2) * 6.3;
      tmp.set(cx + ax * lu2 - az * lv2, 0, cz + az * lu2 + ax * lv2);
      c.g.position.set(x, c.y + Math.sin(t * 1.3 + c.ph) * 0.25, z);
      c.g.rotation.y = Math.atan2(tmp.x - x, tmp.z - z);
      c.g.rotation.z = -0.25 * Math.sign(c.sp);
    });
  });
}
