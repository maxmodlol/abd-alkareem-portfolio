import * as THREE from "three";

import { canvasTex, FONT, roundRectPath, type Kit } from "./kit";
import { leafBlob } from "./nature";
import type { Folks } from "./people";

export type Gate = { open: boolean };

const CORAL = 0xf25c54;
const CREAM = 0xfff4e3;
const INK = 0x0f2229;

function newGroup(island: THREE.Group, id: string, x: number, z: number, ry = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  g.userData.id = id;
  island.add(g);
  return g;
}

function additive(color: number, opacity: number, boost = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(boost),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** A thin glowing line between two points, drawn as a stretched cylinder. */
export function beamBetween(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, mat: THREE.Material, r = 0.012) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 5, 1, true), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  parent.add(m);
  return m;
}

/* ------------------------------------------------------------------ */
/* VillageWellth: a glass CRM tower with setbacks, light fins, halo rings and a beacon.            */
/* ------------------------------------------------------------------ */
export function buildVillageWellth(kit: Kit, folks: Folks, island: THREE.Group): THREE.Group {
  const g = newGroup(island, "villagewellth", -4.6, -4.6);
  const stone = kit.mat(0xe7dcc8, 0.85);
  const steel = kit.mat(0x26333c, 0.45, 0.5);

  const pod = kit.facade("#e8dcc6", { cols: 9, rows: 2, seed: 11, lit: 0.65, rough: 0.7 });
  kit.box(g, 4.2, 0.9, 4.2, kit.sides(pod, stone), 0, 0, 0);

  const sections: { w: number; h: number; y: number; seed: number; cols: number; rows: number }[] = [
    { w: 3.2, h: 3.1, y: 0.9, seed: 21, cols: 8, rows: 7 },
    { w: 2.6, h: 2.2, y: 4.0, seed: 22, cols: 6, rows: 5 },
    { w: 1.9, h: 1.5, y: 6.2, seed: 23, cols: 5, rows: 3 },
  ];
  const fin = kit.glowMat(0x6fe3ff, 1.1, 3.6, 0x16313a);
  sections.forEach((s) => {
    const f = kit.facade("#9fb8c6", { cols: s.cols, rows: s.rows, seed: s.seed, glass: "#8fd0f0", lit: 0.5, rough: 0.35, metal: 0.35 });
    kit.box(g, s.w, s.h, s.w, kit.sides(f, steel), 0, s.y, 0);
    kit.box(g, s.w + 0.12, 0.09, s.w + 0.12, stone, 0, s.y + s.h, 0);
    const c = s.w / 2 + 0.01;
    ([-1, 1] as const).forEach((sx) => {
      ([-1, 1] as const).forEach((sz) => {
        kit.box(g, 0.06, s.h, 0.06, fin, sx * c, s.y, sz * c, false);
      });
    });
  });

  const band = kit.glowMat(0xff7a59, 1.3, 3.8, 0x3a1a14);
  kit.box(g, 2.0, 0.1, 2.0, band, 0, 7.7, 0, false);
  kit.cyl(g, 0.035, 0.07, 1.3, 0x26333c, 0, 7.8, 0, 8);
  const beacon = kit.ball(g, 0.14, kit.glowMat(0xff6b57, 2.6, 5.5, 0x3a1a14), 0, 9.25, 0, 14, false);
  kit.pointLight(g, 0xff7a59, 0.5, 2.0, 7, 0, 8.8, 0);
  const beamMat = additive(0xff6b57, 0.16, 1.6);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.25, 7, 14, 1, true), beamMat);
  beam.position.set(0, 12.75, 0);
  g.add(beam);

  /* halo rings with travelling orbs */
  const ringMat = additive(0xff6b57, 0.55, 1.8);
  const mkRing = (r: number, y: number) => {
    const grp = new THREE.Group();
    grp.position.y = y;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 90), ringMat);
    torus.rotation.x = Math.PI / 2;
    grp.add(torus);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), ringMat);
    orb.position.set(r, 0, 0);
    grp.add(orb);
    const orb2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), ringMat);
    orb2.position.set(-r, 0, 0);
    grp.add(orb2);
    g.add(grp);
    return grp;
  };
  const ring1 = mkRing(2.5, 5.0);
  const ring2 = mkRing(2.05, 6.95);

  /* entrance, signs, planters */
  kit.box(g, 0.9, 0.62, 0.06, 0x10181d, 0, 0, 2.12, false);
  kit.box(g, 1.7, 0.06, 0.75, CORAL, 0, 0.68, 2.45, true);
  kit.box(g, 0.05, 0.68, 0.05, steel, -0.8, 0, 2.75, false);
  kit.box(g, 0.05, 0.68, 0.05, steel, 0.8, 0, 2.75, false);
  const sign = kit.sign("VillageWellth", 2.9, 0.5, { fg: "#fff8ee", bg: "#f25c54", day: 0.45, night: 2.2 });
  sign.position.set(0, 0.74, 2.115);
  g.add(sign);
  const side = kit.sign("VillageWellth", 2.9, 0.5, { fg: "#fff8ee", bg: "#f25c54", day: 0.45, night: 2.2 });
  side.position.set(2.115, 0.74, 0);
  side.rotation.y = Math.PI / 2;
  g.add(side);
  const bush = kit.mat(0x3faf6e, 0.9, 0, true);
  ([-1, 1] as const).forEach((sx) => {
    ([-1, 1] as const).forEach((sz) => kit.ball(g, 0.2, bush, sx * 1.85, 1.0, sz * 1.85, 8));
  });
  kit.pointLight(g, 0xffc27a, 0.4, 1.8, 3, 0, 0.8, 2.9);
  kit.hit(g, 4.4, 8.9, 4.4, 4.45);

  folks.person(g, "stand", -1.3, 0, 2.8, Math.PI / 2, { prop: "bag" });
  folks.person(g, "stand", -0.95, 0, 2.8, -Math.PI / 2);
  folks.person(g, "wave", 1.6, 0, 2.85, 0.4);

  kit.anims.push((t) => {
    ring1.rotation.y = t * 0.7;
    ring2.rotation.y = -t * 1.0;
    beamMat.opacity = 0.03 + (0.03 + 0.05 * kit.night) * (0.5 + 0.5 * Math.sin(t * 2.2));
    beacon.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
  });
  return g;
}

/* ------------------------------------------------------------------ */
/* Sahefa: six tenant houses wired to a shared platform mast.                                     */
/* ------------------------------------------------------------------ */
export function buildSahefa(kit: Kit, folks: Folks, island: THREE.Group): THREE.Group {
  const g = newGroup(island, "sahefa", 4.6, -4.6);
  const names = ["news", "food", "tech", "travel", "art", "sport"];
  const bodies = ["#f6e6cf", "#ffe3b3", "#d8efe3", "#fbd5c4", "#d6e6fb", "#e7dcf8"];
  const roofs = [0xf25c54, 0xe0a030, 0x58b88a, 0xe58a6a, 0x4f8ad0, 0x9b7be0];
  const bgs = ["#f25c54", "#d9962a", "#3faa7a", "#e07a5a", "#3f7fd0", "#8a6be0"];
  const wood = kit.mat(0x8a5a3c, 0.9);
  const tops: THREE.Vector3[] = [];

  kit.box(g, 4.8, 0.04, 4.0, kit.mat(0x86cf86, 0.95), 0, 0, 0, false);

  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = (col - 1) * 1.5;
    const z = (row - 0.5) * 2.0;
    const h = new THREE.Group();
    h.position.set(x, 0, z);
    g.add(h);
    const wall = kit.facade(bodies[i], { cols: 3, rows: 2, seed: 40 + i, glass: "#9ad0e8", lit: 0.7, rough: 0.8, night: 2.8 });
    kit.box(h, 1.2, 0.9, 1.1, kit.sides(wall, kit.mat(0xd8cdb8)), 0, 0, 0);
    const roof = kit.mat(roofs[i], 0.7);
    if (i % 3 === 0) {
      kit.put(h, kit.gable(1.38, 0.62, 1.25), roof, 0, 0.9, 0);
    } else if (i % 3 === 1) {
      kit.box(h, 1.3, 0.08, 1.2, roof, 0, 0.9, 0);
      kit.box(h, 0.8, 0.1, 0.55, 0x6bb56a, 0, 0.98, 0, false);
      kit.ball(h, 0.12, kit.mat(0x3faf6e, 0.9, 0, true), 0.2, 1.14, 0, 8);
    } else {
      const p = kit.put(h, new THREE.ConeGeometry(0.98, 0.7, 4), roof, 0, 1.25, 0);
      p.rotation.y = Math.PI / 4;
    }
    if (i % 2 === 0) kit.box(h, 0.14, 0.4, 0.14, 0x8a5a3c, 0.38, 1.05, -0.2);
    kit.box(h, 0.26, 0.5, 0.05, roofs[i], -0.3, 0, 0.56, false);
    kit.box(h, 0.4, 0.05, 0.2, 0xcfc4b0, -0.3, 0, 0.66, false);
    const s = kit.sign(names[i], 0.6, 0.2, { fg: "#fff8ee", bg: bgs[i], day: 0.4, night: 2 });
    s.position.set(0.22, 0.7, 0.555);
    h.add(s);
    kit.box(h, 0.5, 0.2, 0.06, wood, 0.32, 0, 0.8, false);
    kit.ball(h, 0.07, kit.mat(0xf25c54, 0.8), 0.22, 0.28, 0.8, 8, false);
    tops.push(new THREE.Vector3(x, 1.55, z));
  }

  /* the platform mast: every tenant house is linked to it */
  const mast = new THREE.Vector3(0, 3.3, 0);
  kit.cyl(g, 0.045, 0.07, 3.1, 0x33475b, 0, 0, 0, 8);
  kit.cyl(g, 0.3, 0.3, 0.05, 0x33475b, 0, 0.0, 0, 14, false);
  const core = kit.ball(g, 0.2, kit.glowMat(0xffb27a, 1.6, 4.5, 0x3a2418), mast.x, mast.y, mast.z, 14, false);
  kit.pointLight(g, 0xffb27a, 0.3, 1.2, 4, 0, 3.3, 0);
  const linkMat = additive(0xff8a5c, 0.42, 1.8);
  tops.forEach((tp) => beamBetween(g, mast, tp, linkMat, 0.014));
  const packetMat = additive(0xffd9a0, 1, 3);
  const packets = tops.map((tp, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), packetMat);
    g.add(m);
    return { m, from: tp, ph: i / 6 };
  });

  kit.lamp(g, -2.1, 2.9);
  kit.lamp(g, 2.1, 2.9);
  kit.hit(g, 5.2, 4.0, 4.6, 1.5);

  folks.person(g, "wave", 1.0, 0, 2.5, 0);
  folks.person(g, "stand", -0.7, 0, 2.55, Math.PI * 0.8, { prop: "bag" });

  kit.anims.push((t) => {
    linkMat.opacity = 0.3 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2));
    core.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
    packets.forEach((p) => {
      const u = (t * 0.5 + p.ph) % 1;
      const w = u < 0.5 ? u * 2 : 2 - u * 2;
      p.m.position.set(p.from.x * w, mast.y + (p.from.y - mast.y) * w, p.from.z * w);
    });
  });
  return g;
}

/* ------------------------------------------------------------------ */
/* DIWAN: a furniture showroom with a glowing storefront, a deck of display pieces and a POS.     */
/* ------------------------------------------------------------------ */
export function buildDiwan(kit: Kit, folks: Folks, island: THREE.Group): THREE.Group {
  const g = newGroup(island, "diwan", -4.6, 4.6, Math.PI);
  const wood = kit.mat(0xc9955a, 0.8);
  const dark = kit.mat(0x1d2a33, 0.5, 0.3);

  const wall = kit.facade("#f4ede0", { cols: 8, rows: 2, seed: 61, glass: "#bfe0f5", lit: 0.5, rough: 0.8 });
  kit.box(g, 4.2, 1.5, 1.9, kit.sides(wall, kit.mat(0xd9d0c0)), 0, 0, -1.25);
  kit.box(g, 4.3, 0.1, 2.0, dark, 0, 1.5, -1.25);

  /* showroom seen through the glass, drawn as a lit interior */
  const interior = canvasTex(640, 200, (c, w, h) => {
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#ffecc9");
    bg.addColorStop(1, "#f2c487");
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#d9a76a";
    c.fillRect(0, h * 0.8, w, h * 0.2);
    const rr = (x: number, y: number, ww: number, hh: number, r: number, col: string) => {
      roundRectPath(c, x, y, ww, hh, r);
      c.fillStyle = col;
      c.fill();
    };
    rr(34, h * 0.5, 130, h * 0.3, 12, "#c9b6ff");
    rr(30, h * 0.42, 138, h * 0.16, 10, "#b29df5");
    c.fillStyle = "#33475b";
    c.fillRect(205, h * 0.18, 5, h * 0.62);
    c.fillStyle = "#ffe08a";
    c.beginPath();
    c.moveTo(188, h * 0.26);
    c.lineTo(228, h * 0.26);
    c.lineTo(220, h * 0.1);
    c.lineTo(196, h * 0.1);
    c.fill();
    rr(262, h * 0.16, 110, h * 0.64, 6, "#b98756");
    const books = ["#f25c54", "#2f80c8", "#ffe08a", "#58c985", "#c9b6ff"];
    for (let r = 0; r < 3; r++) {
      for (let b = 0; b < 6; b++) rr(272 + b * 16, h * 0.2 + r * h * 0.19, 11, h * 0.15, 2, books[(r + b) % 5]);
    }
    rr(410, h * 0.5, 56, h * 0.3, 10, "#f25c54");
    rr(408, h * 0.4, 14, h * 0.22, 6, "#e44b43");
    rr(500, h * 0.52, 110, h * 0.28, 6, "#33475b");
    rr(526, h * 0.3, 58, h * 0.2, 4, "#0f2229");
    c.fillStyle = "#7df0b4";
    c.font = `700 14px ${FONT}`;
    c.fillText("PAID", 534, h * 0.42);
  });
  const interiorMat = new THREE.MeshStandardMaterial({
    map: interior,
    emissiveMap: interior,
    emissive: 0xffffff,
    emissiveIntensity: 0.5,
    roughness: 0.6,
  });
  kit.glows.push({ m: interiorMat, day: 0.5, night: 1.7 });
  const shop = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 1.0), interiorMat);
  shop.position.set(0, 0.62, -0.295);
  g.add(shop);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(3.7, 1.0),
    new THREE.MeshStandardMaterial({
      color: 0xa9d8ff,
      transparent: true,
      opacity: 0.2,
      roughness: 0.04,
      metalness: 0.4,
      depthWrite: false,
    }),
  );
  glass.position.set(0, 0.62, -0.28);
  g.add(glass);
  kit.box(g, 3.9, 0.12, 0.08, dark, 0, 1.15, -0.28, false);
  kit.box(g, 3.9, 0.12, 0.08, dark, 0, 0.06, -0.28, false);
  for (let i = -2; i <= 2; i++) kit.box(g, 0.05, 1.0, 0.06, dark, i * 0.925, 0.1, -0.28, false);

  /* roof sign */
  kit.box(g, 3.1, 0.75, 0.1, kit.mat(0x2f80c8, 0.6), 0, 1.6, -0.55);
  const sign = kit.sign("DIWAN", 3.0, 0.7, { fg: "#fff8ee", bg: "#2f80c8", day: 0.5, night: 2.4 });
  sign.position.set(0, 1.97, -0.495);
  g.add(sign);

  /* striped awning */
  for (let i = 0; i < 6; i++) {
    const st = kit.box(g, 0.7, 0.06, 0.95, i % 2 ? CREAM : 0x58c3a0, -1.75 + i * 0.7, 1.22, 0.1);
    st.rotation.x = 0.32;
  }
  kit.box(g, 0.9, 0.02, 0.5, CORAL, 0, 0, 0.3, false);

  /* deck with display pieces */
  kit.box(g, 3.9, 0.07, 1.5, wood, 0, 0, 1.45, true);
  const dy = 0.07;
  kit.box(g, 1.7, 0.012, 1.0, 0xf0a08a, -0.45, dy, 1.5, false);
  const lilac = kit.mat(0xc9b6ff, 0.9);
  const lilac2 = kit.mat(0xb29df5, 0.9);
  kit.box(g, 1.0, 0.16, 0.45, lilac, -1.2, dy + 0.06, 1.35);
  kit.box(g, 1.0, 0.3, 0.1, lilac2, -1.2, dy + 0.06, 1.12);
  kit.box(g, 0.1, 0.24, 0.45, lilac2, -1.7, dy + 0.06, 1.35);
  kit.box(g, 0.1, 0.24, 0.45, lilac2, -0.7, dy + 0.06, 1.35);
  kit.box(g, 0.5, 0.025, 0.3, wood, -1.2, dy + 0.18, 1.85);
  kit.cyl(g, 0.02, 0.02, 0.18, 0x33475b, -1.2, dy, 1.85, 6, false);
  kit.ball(g, 0.07, kit.mat(0x3faf6e, 0.9, 0, true), -1.2, dy + 0.26, 1.85, 8, false);
  const coral = kit.mat(CORAL, 0.85);
  kit.box(g, 0.45, 0.15, 0.45, coral, 0.35, dy + 0.06, 1.6);
  kit.box(g, 0.45, 0.28, 0.08, coral, 0.35, dy + 0.06, 1.4);
  kit.box(g, 0.08, 0.2, 0.45, coral, 0.12, dy + 0.06, 1.6);
  kit.box(g, 0.08, 0.2, 0.45, coral, 0.58, dy + 0.06, 1.6);
  kit.cyl(g, 0.015, 0.02, 0.85, 0x33475b, 1.0, dy, 1.0, 6, false);
  kit.cone(g, 0.15, 0.2, kit.glowMat(0xffd9a0, 0.9, 3.4, 0x6b5a3a), 1.0, dy + 0.78, 1.0, 12, false);
  kit.pointLight(g, 0xffd9a0, 0.35, 1.5, 3.2, 1.0, 0.95, 1.1);
  kit.box(g, 0.9, 1.0, 0.28, wood, 1.55, dy, 0.9);
  const books = [0xf25c54, 0x2f80c8, 0xffe08a, 0x58c985, 0xc9b6ff];
  for (let r = 0; r < 3; r++) {
    for (let b = 0; b < 5; b++) kit.box(g, 0.1, 0.18, 0.1, books[(r + b) % 5], 1.25 + b * 0.15, dy + 0.1 + r * 0.3, 1.0, false);
  }
  kit.box(g, 0.6, 1.1, 0.36, kit.mat(0xa97a46, 0.8), 1.7, dy, 1.8);
  kit.box(g, 0.02, 0.9, 0.02, 0xe6c07a, 1.7, dy + 0.1, 1.99, false);

  /* the POS counter and terminal */
  kit.box(g, 0.55, 0.55, 0.4, 0x33475b, -1.95, dy, 0.55);
  const posScreen = canvasTex(256, 160, (c, w, h) => {
    c.fillStyle = "#0f2229";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#7df0b4";
    c.font = `800 26px ${FONT}`;
    c.fillText("DIWAN POS", 18, 44);
    c.fillStyle = "#fff4e3";
    c.font = `700 22px ${FONT}`;
    c.fillText("Sofa  $1,240", 18, 88);
    c.fillStyle = "#ffe08a";
    c.fillText("PAID", 18, 126);
  });
  const posMat = new THREE.MeshStandardMaterial({ map: posScreen, emissiveMap: posScreen, emissive: 0xffffff, emissiveIntensity: 1 });
  kit.glows.push({ m: posMat, day: 0.9, night: 2.4 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.21), posMat);
  screen.position.set(-1.95, dy + 0.7, 0.545);
  screen.rotation.x = -0.35;
  g.add(screen);
  kit.box(g, 0.4, 0.04, 0.05, 0x10181d, -1.95, dy + 0.55, 0.55, false);
  [0, 1, 2].forEach((i) => {
    kit.box(g, 0.2, 0.2, 0.2, 0xc99a63, -2.05 + (i % 2) * 0.03, i * 0.2, 0.02, true);
  });

  kit.hit(g, 4.6, 2.9, 4.6, 1.45, 0);

  folks.person(g, "stand", -0.7, dy, 2.15, Math.PI);
  folks.person(g, "stand", 0.2, dy, 2.2, Math.PI * 0.9, { prop: "bag" });
  folks.person(g, "stand", -1.95, 0, 0.12, 0);
  const porter = folks.person(g, "carry", -1.5, 0, 0.35, 0, { prop: "box" });
  folks.walker(porter, [[-1.5, 0.28], [1.5, 0.28], [1.5, 0.48], [-1.5, 0.48]], 0.45, 0.2, 0);
  return g;
}

/* ------------------------------------------------------------------ */
/* Oliva: a terracotta-roofed restaurant with a lit pergola terrace, diners, a chef and a waiter.  */
/* ------------------------------------------------------------------ */
export function buildOliva(kit: Kit, folks: Folks, island: THREE.Group): THREE.Group {
  const g = newGroup(island, "oliva", 4.6, 4.6, Math.PI);
  const wood = kit.mat(0xb98756, 0.85);
  const cream = kit.mat(CREAM, 0.8);
  const terra = kit.mat(0xc8643b, 0.75);

  const wall = kit.facade("#f2dcb8", { cols: 7, rows: 2, seed: 71, glass: "#f7c98a", lit: 0.85, day: 0.45, night: 3.2, rough: 0.8 });
  kit.box(g, 3.6, 1.5, 1.5, kit.sides(wall, kit.mat(0xd9c8a8)), 0, 0, -1.45);
  const roof = kit.put(g, kit.gable(1.85, 0.9, 3.9), terra, 0, 1.5, -1.45);
  roof.rotation.y = Math.PI / 2;
  kit.box(g, 0.3, 0.7, 0.3, 0xa0603f, 1.1, 1.5, -1.85);

  kit.box(g, 0.72, 0.95, 0.06, 0x4a2f1f, 0, 0, -0.69, false);
  const sign = kit.sign("Oliva", 1.5, 0.42, { fg: "#fdf6e4", bg: "#4f6f2a", day: 0.5, night: 2.6 });
  sign.position.set(0, 1.12, -0.69);
  g.add(sign);
  for (let i = 0; i < 6; i++) {
    const st = kit.box(g, 0.56, 0.05, 0.85, i % 2 ? CREAM : CORAL, -1.4 + i * 0.56, 1.0, -0.7);
    st.rotation.x = 0.3;
  }

  /* terrace and pergola */
  kit.box(g, 4.0, 0.06, 2.8, wood, 0, 0, 0.7);
  const ty = 0.06;
  ([-1, 1] as const).forEach((sx) => {
    [0.15, 2.0].forEach((pz) => kit.box(g, 0.06, 1.4, 0.06, 0x6b432b, sx * 1.9, ty, pz, true));
  });
  [0.15, 2.0].forEach((pz) => kit.box(g, 3.95, 0.06, 0.08, 0x6b432b, 0, ty + 1.4, pz, true));
  for (let i = 0; i < 7; i++) kit.box(g, 0.05, 0.04, 1.95, 0x6b432b, -1.8 + i * 0.6, ty + 1.46, 1.075, false);
  const bulbMat = kit.glowMat(0xffd9a0, 0.9, 5, 0x4a3a20);
  const bulbGeo = new THREE.SphereGeometry(0.032, 8, 6);
  [0.5, 1.1, 1.7].forEach((lz) => {
    for (let i = 0; i <= 9; i++) {
      const u = i / 9;
      kit.put(g, bulbGeo, bulbMat, -1.9 + u * 3.8, ty + 1.38 - Math.sin(u * Math.PI) * 0.12, lz, false);
    }
  });
  kit.pointLight(g, 0xffc27a, 0.55, 3.4, 4.2, 0, 1.15, 1.1);
  kit.pointLight(g, 0xffc27a, 0.3, 1.4, 2.6, 0, 0.8, -0.2);

  /* tables, chairs, diners */
  const tables: [number, number][] = [[-1.1, 0.5], [1.1, 0.5], [-1.1, 1.6], [1.1, 1.6]];
  const candle = kit.glowMat(0xffb04a, 1.2, 5, 0x442200);
  tables.forEach(([tx, tz]) => {
    kit.cyl(g, 0.025, 0.03, 0.26, 0x33475b, tx, ty, tz, 6, false);
    kit.cyl(g, 0.27, 0.27, 0.03, cream, tx, ty + 0.26, tz, 16);
    kit.ball(g, 0.022, candle, tx, ty + 0.31, tz, 6, false);
    ([-1, 1] as const).forEach((s) => {
      const cz = tz + s * 0.42;
      kit.box(g, 0.2, 0.03, 0.2, wood, tx, ty + 0.17, cz, true);
      kit.box(g, 0.2, 0.2, 0.03, wood, tx, ty + 0.2, cz + s * 0.095, true);
      [-1, 1].forEach((lx) => [-1, 1].forEach((lz) => kit.box(g, 0.025, 0.17, 0.025, 0x4a2f1f, tx + lx * 0.08, ty, cz + lz * 0.08, false)));
    });
  });
  const seats: [number, number, number][] = [
    [-1.1, 0.5 - 0.42, 0],
    [-1.1, 0.5 + 0.42, Math.PI],
    [1.1, 0.5 + 0.42, Math.PI],
    [-1.1, 1.6 - 0.42, 0],
    [1.1, 1.6 - 0.42, 0],
    [1.1, 1.6 + 0.42, Math.PI],
  ];
  seats.forEach(([sx, sz, ry]) => folks.person(g, "sit", sx, ty, sz, ry));

  const waiter = folks.person(g, "serve", 0, ty, 0.2, 0, { prop: "tray" });
  folks.walker(waiter, [[-0.2, 0.0], [-0.2, 2.0], [0.2, 2.0], [0.2, 0.0]], 0.34, 0.0, ty);

  /* the grill, the chef and the smoke */
  kit.box(g, 0.55, 0.32, 0.3, 0x1c2228, -1.6, ty, -0.35);
  const coals = kit.glowMat(0xff6a1a, 1.4, 4.2, 0x2a0e00);
  kit.box(g, 0.45, 0.03, 0.22, coals, -1.6, ty + 0.32, -0.35, false);
  kit.pointLight(g, 0xff7a2a, 0.35, 1.2, 1.8, -1.6, 0.6, -0.1);
  folks.person(g, "cook", -1.6, ty, 0.02, Math.PI, { hat: 0xffffff });
  const puffs: { m: THREE.Mesh; ox: number; oz: number; base: number; ph: number }[] = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false });
  const addPuff = (ox: number, oz: number, base: number, ph: number, r: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), smokeMat);
    g.add(m);
    puffs.push({ m, ox, oz, base, ph });
  };
  for (let i = 0; i < 4; i++) addPuff(1.1, -1.85, 2.25, i * 0.25, 0.13);
  for (let i = 0; i < 3; i++) addPuff(-1.6, -0.35, 0.5, i * 0.33, 0.07);

  /* olive trees in planters */
  ([-1, 1] as const).forEach((sx) => {
    kit.box(g, 0.36, 0.28, 0.36, terra, sx * 2.02, ty, -0.1);
    kit.cyl(g, 0.03, 0.045, 0.5, 0x6b5a46, sx * 2.02, ty + 0.28, -0.1, 6);
    const olive = kit.mat(0x8a9a6a, 0.9);
    kit.put(g, leafBlob(3, 2), olive, sx * 2.02, ty + 0.95, -0.1).scale.setScalar(0.3);
    kit.put(g, leafBlob(4, 2), olive, sx * 2.02 + 0.18, ty + 0.78, 0.05).scale.setScalar(0.2);
  });
  kit.hit(g, 4.4, 3.3, 4.8, 1.6, 0.3);

  kit.anims.push((t) => {
    puffs.forEach((p) => {
      const u = (t * 0.35 + p.ph) % 1;
      p.m.position.set(p.ox + Math.sin(t + p.ph * 9) * 0.05 * u, p.base + u * 0.9, p.oz);
      p.m.scale.setScalar(0.6 + u * 1.2);
    });
    smokeMat.opacity = 0.32;
  });
  return g;
}

/* ------------------------------------------------------------------ */
/* Watan: a checkpoint on the western road, with a barrier, a status gantry and a watchtower.      */
/* ------------------------------------------------------------------ */
export function buildWatan(kit: Kit, folks: Folks, island: THREE.Group): { group: THREE.Group; gate: Gate } {
  const g = newGroup(island, "watan", -8.2, 0);
  const gate: Gate = { open: false };
  const concrete = kit.mat(0xcfc8bb, 0.9);
  const dark = kit.mat(0x1d2a33, 0.5, 0.3);
  const white = CREAM;

  ([-1, 1] as const).forEach((s) => {
    kit.box(g, 0.34, 0.6, 0.34, concrete, 0, 0, s * 1.05);
    kit.box(g, 0.36, 0.1, 0.36, CORAL, 0, 0.14, s * 1.05, false);
    kit.box(g, 0.36, 0.1, 0.36, CORAL, 0, 0.38, s * 1.05, false);
  });
  const arm = new THREE.Group();
  arm.position.set(0, 0.34, -1.05);
  g.add(arm);
  for (let i = 0; i < 8; i++) kit.box(arm, 0.07, 0.07, 0.26, i % 2 ? white : CORAL, 0, -0.035, 0.13 + i * 0.26, false);

  /* status gantry with a live LED panel */
  ([-1, 1] as const).forEach((s) => kit.box(g, 0.1, 1.5, 0.1, 0x33475b, 1.0, 0, s * 1.22));
  kit.box(g, 0.16, 0.12, 2.6, 0x33475b, 1.0, 1.5, 0);
  const led = canvasTex(320, 100, () => undefined);
  const ledCanvas = led.image as unknown as HTMLCanvasElement;
  const drawLed = (open: boolean) => {
    const c = ledCanvas.getContext("2d");
    if (!c) return;
    c.fillStyle = "#0b1217";
    c.fillRect(0, 0, 320, 100);
    c.fillStyle = open ? "#5cf2a0" : "#ff6a4d";
    c.font = `800 30px ${FONT}`;
    c.textAlign = "left";
    c.fillText("WATAN LIVE", 18, 40);
    c.font = `800 36px ${FONT}`;
    c.fillText(open ? "OPEN" : "CLOSED", 18, 82);
    c.beginPath();
    c.arc(280, 52, 16, 0, Math.PI * 2);
    c.fill();
    led.needsUpdate = true;
  };
  drawLed(false);
  const ledMat = new THREE.MeshStandardMaterial({ map: led, emissiveMap: led, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.5 });
  kit.glows.push({ m: ledMat, day: 1.0, night: 2.6 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.53), ledMat);
  panel.position.set(1.09, 1.9, 0);
  panel.rotation.y = Math.PI / 2;
  g.add(panel);
  kit.box(g, 0.06, 0.6, 1.8, 0x10181d, 1.04, 1.6, 0, false);

  /* guard booth, tower, barriers and cones */
  const bw = kit.facade("#bfb7a8", { cols: 3, rows: 2, seed: 81, glass: "#cfe9ff", lit: 0.85, rough: 0.8 });
  kit.box(g, 0.9, 1.0, 0.9, kit.sides(bw, concrete), -0.2, 0, -2.0);
  kit.box(g, 1.1, 0.1, 1.1, dark, -0.2, 1.0, -2.0);
  const tw = kit.mat(0xbdb5a6, 0.9);
  kit.box(g, 0.7, 2.2, 0.7, tw, -0.4, 0, 2.4);
  const cabin = kit.facade("#8a8f93", { cols: 4, rows: 2, seed: 82, glass: "#cfe9ff", lit: 0.9, rough: 0.5 });
  kit.box(g, 1.1, 0.6, 1.1, kit.sides(cabin, dark), -0.4, 2.2, 2.4);
  kit.box(g, 1.3, 0.1, 1.3, dark, -0.4, 2.8, 2.4);
  kit.cyl(g, 0.02, 0.02, 0.5, 0x33475b, -0.4, 2.9, 2.4, 6, false);
  const spot = new THREE.Group();
  spot.position.set(-0.4, 2.5, 2.4);
  g.add(spot);
  const spotMat = additive(0xfff0c0, 0.12, 1.4);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 3.2, 14, 1, true), spotMat);
  cone.position.set(0, -0.1, 1.6);
  cone.rotation.x = Math.PI / 2 + 0.45;
  spot.add(cone);
  [-1, 1].forEach((s) => {
    kit.box(g, 0.9, 0.34, 0.3, concrete, -1.4, 0, s * 1.3);
    kit.box(g, 0.9, 0.34, 0.3, concrete, 1.9, 0, s * 1.3);
  });
  for (let i = 0; i < 5; i++) {
    kit.cone(g, 0.07, 0.2, 0xff8a2a, 1.6 + i * 0.5, 0.04, 0, 10, false);
    kit.cyl(g, 0.045, 0.055, 0.04, CREAM, 1.6 + i * 0.5, 0.1, 0, 10, false);
  }

  /* map pin beacon with ripples */
  const pin = new THREE.Group();
  pin.position.set(0, 3.9, 0);
  g.add(pin);
  const pinMat = kit.glowMat(0xff5a4a, 1.2, 2.6, 0x3a1612);
  const tip = kit.put(pin, new THREE.ConeGeometry(0.4, 0.85, 14), pinMat, 0, 0, 0, false);
  tip.rotation.x = Math.PI;
  kit.ball(pin, 0.44, pinMat, 0, 0.62, 0, 16, false);
  kit.ball(pin, 0.17, kit.glowMat(0xfff4e3, 2.0, 4, 0x888888), 0, 0.62, 0.34, 10, false);
  kit.pointLight(g, 0xff6a55, 0.5, 2.0, 7, 0, 3.4, 0);
  const pillarMat = additive(0xff5a4a, 0.14, 1.6);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 3.5, 14, 1, true), pillarMat);
  pillar.position.set(0, 1.75, 0);
  g.add(pillar);
  const ripples = [0, 1, 2].map((i) => {
    const mat = additive(0xff5a4a, 0.4, 1.8);
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 6, 48), mat);
    m.rotation.x = Math.PI / 2;
    m.position.y = 0.08;
    g.add(m);
    return { m, mat, ph: i / 3 };
  });
  kit.hit(g, 4.4, 5.0, 6.4, 2.0, 0);

  const guard = folks.person(g, "stand", 0.6, 0, -1.7, 0, { hat: 0x33475b });
  guard.root.scale.setScalar(1.02);
  [2.2, 2.7, 3.2].forEach((x) => folks.person(g, "stand", x, 0, 1.75, -Math.PI / 2));
  folks.person(g, "wave", 3.8, 0, 1.75, -Math.PI / 2);

  let angle = 0;
  let lastOpen = false;
  kit.anims.push((t, dt) => {
    const ph = t % 11;
    gate.open = ph >= 5 && ph < 9;
    angle += ((gate.open ? 1 : 0) - angle) * Math.min(1, dt * 3);
    arm.rotation.x = -angle * 1.3;
    if (gate.open !== lastOpen) {
      lastOpen = gate.open;
      drawLed(gate.open);
    }
    pin.position.y = 3.9 + Math.sin(t * 2) * 0.16;
    pin.rotation.y = t * 1.1;
    pillarMat.opacity = 0.04 + 0.03 * (0.5 + 0.5 * Math.sin(t * 2.4)) + kit.night * 0.05;
    spot.rotation.y = t * 0.9;
    spotMat.opacity = kit.night * 0.06;
    ripples.forEach((r) => {
      const u = (t * 0.45 + r.ph) % 1;
      r.m.scale.setScalar(0.6 + u * 3.2);
      r.mat.opacity = (1 - u) * 0.5;
    });
  });
  return { group: g, gate };
}

/* ------------------------------------------------------------------ */
/* CareBooks: a small library-bookshop with a ramp, a reading garden and a floating open book.     */
/* ------------------------------------------------------------------ */
export function buildCarebooks(kit: Kit, folks: Folks, island: THREE.Group, label: string): THREE.Group {
  const g = newGroup(island, "carebooks", 9.0, 2.6, Math.PI);
  const wall = kit.facade("#ead9c3", { cols: 5, rows: 3, seed: 101, glass: "#cfe4f5", lit: 0.8, day: 0.4, night: 3, rough: 0.8 });
  kit.box(g, 2.4, 1.7, 1.3, kit.sides(wall, kit.mat(0xd9c8aa)), 0, 0, -0.55);
  const roof = kit.put(g, kit.gable(1.55, 0.75, 2.6), kit.mat(0x4f6f9a, 0.75), 0, 1.7, -0.55);
  roof.rotation.y = Math.PI / 2;
  kit.box(g, 0.5, 0.85, 0.06, 0x3a4f6b, 0.0, 0, 0.11, false);
  const sign = kit.sign(label, 1.6, 0.4, { fg: "#fff8ee", bg: "#3f6fa8", day: 0.5, night: 2.4 });
  sign.position.set(0, 1.2, 0.115);
  g.add(sign);

  /* ramp up to the door, a bench, a reading garden */
  const ramp = kit.box(g, 0.7, 0.05, 1.1, 0xcfc4b0, 0.75, 0.04, 0.65, true);
  ramp.rotation.x = 0.12;
  kit.box(g, 0.03, 0.22, 1.1, 0x33475b, 1.12, 0.06, 0.65, false);
  kit.box(g, 0.7, 0.04, 0.2, 0x8a5a3c, -0.5, 0.17, 0.2, true);
  kit.box(g, 0.7, 0.2, 0.03, 0x8a5a3c, -0.5, 0.2, 0.11, true);
  kit.box(g, 0.05, 0.17, 0.2, 0x4a2f1f, -0.8, 0, 0.2, false);
  kit.box(g, 0.05, 0.17, 0.2, 0x4a2f1f, -0.2, 0, 0.2, false);
  const leaf = kit.mat(0x4fae63, 0.85);
  ([-1, 1] as const).forEach((sx) => {
    kit.cyl(g, 0.05, 0.07, 0.4, 0x8a5a3c, sx * 1.1, 0, 1.0, 6);
    kit.put(g, leafBlob(sx > 0 ? 1 : 2, 2), leaf, sx * 1.1, 0.75, 1.0).scale.setScalar(0.34);
  });
  kit.lamp(g, -1.0, 0.7, 1.0);
  kit.pointLight(g, 0xffd9a0, 0.3, 1.4, 3, 0, 1.0, 0.7);

  /* a wheelchair user with a friend, and two readers on the bench */
  kit.box(g, 0.22, 0.03, 0.22, 0x33475b, 0.1, 0.17, 0.95, false);
  kit.box(g, 0.22, 0.2, 0.03, 0x33475b, 0.1, 0.2, 0.84, false);
  ([-1, 1] as const).forEach((s) => {
    const w = kit.put(g, new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), kit.mat(0x1c1c24, 0.6), 0.1 + s * 0.14, 0.1, 0.95, false);
    w.rotation.z = Math.PI / 2;
  });
  folks.person(g, "sit", 0.1, 0, 0.95, Math.PI * 0.8);
  folks.person(g, "stand", 0.38, 0, 1.02, Math.PI * 1.2);
  folks.person(g, "sit", -0.65, 0.01, 0.22, Math.PI * 0.9);
  folks.person(g, "sit", -0.35, 0.01, 0.22, Math.PI * 1.1);

  /* the open book that floats above the roof */
  const book = new THREE.Group();
  book.position.set(0, 3.1, -0.55);
  g.add(book);
  const cover = kit.glowMat(0xffd9a0, 1.1, 3.4, 0x4a3a20);
  const pageMat = additive(0xfff4e3, 0.9, 2.2);
  const left = new THREE.Group();
  const right = new THREE.Group();
  book.add(left, right);
  kit.box(left, 0.55, 0.03, 0.75, cover, -0.28, 0, 0, false);
  kit.box(right, 0.55, 0.03, 0.75, cover, 0.28, 0, 0, false);
  const pages: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const pg = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), pageMat);
    m.rotation.x = -Math.PI / 2;
    m.position.x = 0.26;
    pg.add(m);
    book.add(pg);
    pages.push(pg);
  }
  kit.pointLight(g, 0xffd9a0, 0.4, 1.6, 4, 0, 2.6, -0.55);
  kit.hit(g, 2.8, 3.6, 2.8, 1.8, 0);

  kit.anims.push((t) => {
    book.position.y = 3.1 + Math.sin(t * 1.4) * 0.1;
    book.rotation.y = Math.sin(t * 0.4) * 0.3;
    left.rotation.z = -0.35;
    right.rotation.z = 0.35;
    pages.forEach((pg, i) => {
      const u = (t * 0.55 + i * 0.25) % 1;
      pg.rotation.z = Math.PI - 0.35 - u * (Math.PI - 0.7);
      pg.visible = u < 0.98;
    });
  });
  return g;
}

/* ------------------------------------------------------------------ */
/* Arvo: a fashion boutique with a lit window, a clothes rack, mannequins and a floating bundle.   */
/* ------------------------------------------------------------------ */
export function buildArvo(kit: Kit, folks: Folks, island: THREE.Group, label: string): THREE.Group {
  const g = newGroup(island, "arvo", 9.0, -2.6);
  const wall = kit.facade("#f1e4d4", { cols: 5, rows: 3, seed: 111, glass: "#e9d7c4", lit: 0.6, day: 0.3, night: 2.6, rough: 0.8 });
  kit.box(g, 2.4, 1.6, 1.3, kit.sides(wall, kit.mat(0xd8c3a8)), 0, 0, -0.55);
  kit.box(g, 2.55, 0.14, 1.45, kit.mat(0xb5654a, 0.8), 0, 1.6, -0.55);

  /* the lit shop window, drawn as an interior */
  const interior = canvasTex(512, 200, (c, w, h) => {
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#fff0dc");
    bg.addColorStop(1, "#f1cfa2");
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#d9b98a";
    c.fillRect(0, h * 0.82, w, h * 0.18);
    const cols = ["#c8643b", "#2f4a5c", "#e9b86a", "#7a8f5a", "#f25c54", "#33475b", "#c9b6ff"];
    c.fillStyle = "#33475b";
    c.fillRect(20, h * 0.18, w - 40, 4);
    for (let i = 0; i < 12; i++) {
      const x = 34 + i * 38;
      c.fillStyle = "#33475b";
      c.fillRect(x + 12, h * 0.18, 2, 16);
      c.fillStyle = cols[i % cols.length];
      c.beginPath();
      c.moveTo(x, h * 0.18 + 16);
      c.lineTo(x + 26, h * 0.18 + 16);
      c.lineTo(x + 34, h * 0.62);
      c.lineTo(x - 8, h * 0.62);
      c.closePath();
      c.fill();
    }
    for (let i = 0; i < 7; i++) {
      c.fillStyle = cols[(i + 2) % cols.length];
      c.fillRect(30 + i * 62, h * 0.72, 54, 12);
      c.fillStyle = cols[(i + 4) % cols.length];
      c.fillRect(34 + i * 62, h * 0.72 - 11, 46, 11);
    }
  });
  const interiorMat = new THREE.MeshStandardMaterial({ map: interior, emissiveMap: interior, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.6 });
  kit.glows.push({ m: interiorMat, day: 0.5, night: 1.7 });
  const shop = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), interiorMat);
  shop.position.set(-0.35, 0.6, 0.105);
  g.add(shop);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.75),
    new THREE.MeshStandardMaterial({ color: 0xfff0dc, transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0.4, depthWrite: false }),
  );
  glass.position.set(-0.35, 0.6, 0.12);
  g.add(glass);
  kit.box(g, 1.6, 0.06, 0.05, 0x1f1a1a, -0.35, 0.95, 0.115, false);
  kit.box(g, 1.6, 0.06, 0.05, 0x1f1a1a, -0.35, 0.2, 0.115, false);
  kit.box(g, 0.45, 0.85, 0.05, 0x1f1a1a, 0.82, 0, 0.12, false);

  const sign = kit.sign(label, 1.3, 0.36, { fg: "#f3cfa0", bg: "#1f1a1a", day: 0.5, night: 2.6 });
  sign.position.set(0, 1.28, 0.105);
  g.add(sign);
  for (let i = 0; i < 5; i++) {
    const st = kit.box(g, 0.5, 0.05, 0.7, i % 2 ? CREAM : 0xc8643b, -1.0 + i * 0.5, 1.07, 0.1);
    st.rotation.x = 0.3;
  }

  /* clothes rack, mannequins, bags */
  const dark = kit.mat(0x1f1a1a, 0.5, 0.3);
  kit.box(g, 0.03, 0.55, 0.03, dark, -0.95, 0, 0.8, false);
  kit.box(g, 0.03, 0.55, 0.03, dark, -0.2, 0, 0.8, false);
  kit.box(g, 0.78, 0.025, 0.025, dark, -0.575, 0.55, 0.8, false);
  const garments = [0xc8643b, 0x2f4a5c, 0xe9b86a, 0x7a8f5a, 0xf25c54, 0xc9b6ff];
  garments.forEach((c, i) => kit.box(g, 0.09, 0.26 + (i % 2) * 0.06, 0.05, c, -0.9 + i * 0.13, 0.27 - (i % 2) * 0.06, 0.8, false));
  ([0.7, 1.05] as const).forEach((mx, i) => {
    kit.cyl(g, 0.12, 0.14, 0.04, dark, mx, 0, 0.9, 12, false);
    kit.cyl(g, 0.012, 0.012, 0.3, dark, mx, 0.04, 0.9, 6, false);
    kit.cone(g, 0.12, 0.34, garments[(i + 2) % 6], mx, 0.2, 0.9, 12, true);
    kit.box(g, 0.11, 0.16, 0.07, garments[(i + 2) % 6], mx, 0.46, 0.9, true);
    kit.ball(g, 0.045, 0xf1d9c4, mx, 0.66, 0.9, 10, false);
  });
  [0xc8643b, 0x2f4a5c, 0xe9b86a].forEach((c, i) => kit.box(g, 0.14, 0.18, 0.08, c, 0.3 + i * 0.18, 0, 0.55, false));
  kit.lamp(g, 1.1, 1.1, 1.0);
  kit.pointLight(g, 0xffd9a0, 0.3, 1.4, 3, 0, 1.0, 0.7);

  folks.person(g, "stand", -0.3, 0, 1.05, Math.PI, { prop: "bag" });
  folks.person(g, "stand", -0.75, 0, 1.1, Math.PI * 0.95);
  const shopper = folks.person(g, "walk", 0.2, 0, 1.0, 0, { prop: "bag" });
  folks.walker(shopper, [[0.1, 0.45], [1.0, 0.45], [1.0, 1.15], [0.1, 1.15]], 0.3, 0.3, 0);

  /* the bundle floating above the roof */
  const bundle = new THREE.Group();
  bundle.position.set(0, 3.0, -0.55);
  g.add(bundle);
  const boxM = kit.glowMat(0xf25c54, 0.9, 3, 0x3a1612);
  const ribbon = kit.glowMat(0xffe9c4, 1.2, 3.6, 0x555040);
  kit.box(bundle, 0.5, 0.5, 0.5, boxM, 0, -0.25, 0, false);
  kit.box(bundle, 0.1, 0.52, 0.52, ribbon, 0, -0.26, 0, false);
  kit.box(bundle, 0.52, 0.52, 0.1, ribbon, 0, -0.26, 0, false);
  kit.ball(bundle, 0.09, ribbon, -0.09, 0.3, 0, 8, false);
  kit.ball(bundle, 0.09, ribbon, 0.09, 0.3, 0, 8, false);
  const items = [0xc8643b, 0x2f4a5c, 0xe9b86a].map((c) => {
    const m = kit.box(bundle, 0.16, 0.2, 0.06, kit.glowMat(c, 0.7, 2.4, 0x222222), 0, 0, 0, false);
    return m;
  });
  kit.hit(g, 2.8, 3.8, 2.8, 1.9, 0);

  kit.anims.push((t) => {
    bundle.position.y = 3.0 + Math.sin(t * 1.3) * 0.1;
    bundle.rotation.y = t * 0.6;
    items.forEach((m, i) => {
      const a = t * 0.9 + (i * Math.PI * 2) / 3;
      m.position.set(Math.cos(a) * 0.75, 0.15 + Math.sin(t * 1.5 + i) * 0.08, Math.sin(a) * 0.75);
      m.rotation.y = -a;
    });
  });
  return g;
}

export const BUILDING_ACCENT = { coral: CORAL, ink: INK };
