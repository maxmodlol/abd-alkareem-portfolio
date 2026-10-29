import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { FACADES, facadeMaterial, shared } from "./facade";
import { Batch, canvasTexture, rng, type Surfaces } from "./kit";
import { LINE, PLAZA, SHOP, SHOPS, shopSide, shopZ } from "./layout";

/**
 * The town around the eight project buildings: a paved pedestrian street lined with older buildings,
 * trees and lanterns, the plaza at its end with a fountain and a stone balustrade, and beyond it a
 * city spread across the valley below, fading into the evening haze.
 */

export type Street = {
  update: (t: number, night: number) => void;
  dispose: () => void;
};

type Box = { x: number; z: number; w: number; d: number; y: number; h: number };

export function buildStreet(scene: THREE.Scene, o: { shadows: boolean; detail: boolean; surfaces: Surfaces }): Street {
  const R = rng(4242);
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const group = new THREE.Group();
  scene.add(group);

  /* ---------- ground ---------- */
  const paving = keep(pavingTexture());
  paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
  const W = 2 * (LINE + 40);
  const L = 140 - PLAZA.z1;
  paving.repeat.set(W / 3, L / 3);
  const streetGeo = keep(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2).translate(0, 0, (140 + PLAZA.z1) / 2));
  const street = new THREE.Mesh(streetGeo, keep(new THREE.MeshStandardMaterial({ map: paving, roughness: 0.82, color: 0xffffff })));
  street.receiveShadow = o.shadows;
  group.add(street);
  const land = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(3000, 1600).rotateX(-Math.PI / 2).translate(0, -0.02, PLAZA.z1 + 800)),
    keep(new THREE.MeshStandardMaterial({ color: 0x8a857b, roughness: 0.95 })),
  );
  group.add(land);
  const valley = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(3000, 1800).rotateX(-Math.PI / 2).translate(0, -30, PLAZA.z1 - 900)),
    keep(new THREE.MeshStandardMaterial({ color: 0x6d6c5c, roughness: 0.95 })),
  );
  group.add(valley);

  const B = new Batch(o.surfaces);
  /* the retaining wall under the balustrade */
  B.box("matte", 0xb8ab90, [0, -15, PLAZA.z1 - 1], [400, 30, 2]);
  /* granite bands that edge the paving along the building line */
  for (const sx of [-1, 1]) B.box("satin", 0x77736b, [sx * (LINE - 0.4), 0.005, (40 + PLAZA.z0) / 2 + 30], [0.8, 0.01, 40 - PLAZA.z0 + 60]);

  /* ---------- buildings around the street ---------- */
  const styles = ["stone", "brick", "concrete", "stone", "brick"] as const;
  const boxes: Record<string, Box[]> = Object.fromEntries(Object.keys(FACADES).map((k) => [k, []]));
  const cornices: Box[] = [];
  const add = (x: number, z: number, w: number, d: number, h: number, skin: string, y = 0) => {
    boxes[skin].push({ x, z, w, d, y, h });
    if (y === 0) cornices.push({ x, z, w: w + 0.5, d: d + 0.5, y: h, h: 0.6 });
  };
  /* the lower end of a project lot that overlaps [z0, z1] on this side, or null */
  const taken = (sx: number, z0: number, z1: number) => {
    for (let i = 0; i < SHOPS; i++) {
      if (shopSide(i) !== sx) continue;
      const a = shopZ(i) - SHOP.half - 0.2;
      const b = shopZ(i) + SHOP.half + 0.2;
      if (z1 > a && z0 < b) return a;
    }
    return null;
  };
  for (const sx of [-1, 1]) {
    let z = 140;
    while (z > PLAZA.z0) {
      const w = 8 + R() * 8;
      let z0 = z - w;
      if (z0 < PLAZA.z0) z0 = PLAZA.z0;
      const lot = taken(sx, z0, z);
      if (lot !== null) {
        /* fill the gap down to the lot, then jump past it */
        const top = lot + SHOP.half * 2 + 0.4;
        if (z - top > 1) add(sx * (LINE + 9), (z + top) / 2, 18, z - top - 0.2, 10 + R() * 12, styles[Math.floor(R() * styles.length)]);
        z = lot;
        continue;
      }
      const h = 10 + R() * 14;
      const skin = styles[Math.floor(R() * styles.length)];
      add(sx * (LINE + 9), (z + z0) / 2, 18, z - z0 - 0.2, h, skin);
      z = z0;
    }
    /* the second row, taller */
    for (let z2 = 140; z2 > PLAZA.z1 - 10; z2 -= 22) add(sx * (LINE + 30), z2 - 11, 20, 21, 16 + R() * 26, R() < 0.5 ? "concrete" : "stone");
    /* the sides of the plaza */
    for (let z2 = PLAZA.z0; z2 > PLAZA.z1; z2 -= 13) add(sx * (PLAZA.half + 8), z2 - 6.5, 16, 12.6, 12 + R() * 10, styles[Math.floor(R() * styles.length)]);
  }
  /* a tall building closing the view at the start of the street */
  add(0, 152, 40, 20, 34, "stone");
  /* the wider city: a ring of towers, and the city in the valley below the balustrade */
  for (let k = 0; k < (o.detail ? 150 : 70); k++) {
    const a = R() * Math.PI * 2;
    const r = 240 + R() * 420;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (z < PLAZA.z1 - 40) continue;
    const h = 24 + Math.pow(R(), 2) * 110;
    const w = 18 + R() * 24;
    add(x, z, w, w * (0.7 + R() * 0.5), h, h > 70 ? "curtain" : R() < 0.5 ? "concrete" : "stone");
  }
  for (let k = 0; k < (o.detail ? 320 : 150); k++) {
    const x = (R() - 0.5) * 1400;
    const z = PLAZA.z1 - 70 - Math.pow(R(), 0.8) * 1100;
    const core = Math.exp(-Math.hypot(x + 120, z + 700) / 300);
    const h = 10 + R() * 30 + core * R() * 140;
    const w = 14 + R() * 22;
    add(x, z, w, w * (0.7 + R() * 0.5), h, h > 80 ? (R() < 0.5 ? "curtain" : "bronze") : styles[Math.floor(R() * styles.length)], -30);
  }

  const unit = keep(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const place = (mesh: THREE.InstancedMesh, list: Box[]) => {
    list.forEach((b, i) => mesh.setMatrixAt(i, m4.compose(v.set(b.x, b.y, b.z), q, s.set(b.w, b.h, b.d))));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  for (const [k, list] of Object.entries(boxes)) {
    if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(unit, keep(facadeMaterial(FACADES[k])), list.length);
    place(mesh, list);
    mesh.castShadow = mesh.receiveShadow = o.shadows;
    group.add(mesh);
  }
  const cornice = new THREE.InstancedMesh(unit, keep(new THREE.MeshStandardMaterial({ color: 0xb7ae9c, roughness: 0.85 })), cornices.length);
  place(cornice, cornices);
  cornice.castShadow = o.shadows;
  group.add(cornice);

  /* ---------- street furniture ---------- */
  const treeSpots: THREE.Vector3[] = [];
  for (let k = -1; k < 8; k++) for (const sx of [-1, 1]) treeSpots.push(new THREE.Vector3(sx * 6.4, 0, -20 - 30 * k));
  treeSpots.push(new THREE.Vector3(-6.4, 0, 34), new THREE.Vector3(6.4, 0, 34));
  treeSpots.push(new THREE.Vector3(16, 0, -258), new THREE.Vector3(-20, 0, -278), new THREE.Vector3(20, 0, -276), new THREE.Vector3(-22, 0, -252), new THREE.Vector3(24, 0, -250));
  for (const t of treeSpots) {
    B.box("satin", 0x8e877a, [t.x, 0.25, t.z], [1.6, 0.5, 1.6]);
    B.box("matte", 0x3b3127, [t.x, 0.51, t.z], [1.4, 0.02, 1.4]);
  }
  const canopy = keep(treeGeometry(R));
  const trunk = keep(new THREE.CylinderGeometry(0.12, 0.2, 3.6, 7).translate(0, 1.8, 0));
  const trees = new THREE.InstancedMesh(canopy, keep(new THREE.MeshStandardMaterial({ color: 0x5c7040, roughness: 0.8 })), treeSpots.length);
  const trunks = new THREE.InstancedMesh(trunk, keep(new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.9 })), treeSpots.length);
  const tint = new THREE.Color();
  treeSpots.forEach((p, i) => {
    const k = p.z < PLAZA.z0 ? 1.5 : 0.9 + R() * 0.25;
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, R() * 6.28);
    m4.compose(p, q, s.set(k, k, k));
    trees.setMatrixAt(i, m4);
    trunks.setMatrixAt(i, m4);
    trees.setColorAt(i, tint.setHSL(0.23 + R() * 0.05, 0.32, 0.75 + R() * 0.35));
  });
  q.identity();
  trees.castShadow = trunks.castShadow = o.shadows;
  trees.receiveShadow = o.shadows;
  group.add(trees, trunks);

  /* lanterns on posts */
  const lampSpots: THREE.Vector3[] = [];
  for (let k = -1; k < 8; k++) for (const sx of [-1, 1]) lampSpots.push(new THREE.Vector3(sx * 7.6, 0, -5 - 30 * k));
  for (const x of [-26, 26]) for (const z of [-252, -278]) lampSpots.push(new THREE.Vector3(x, 0, z));
  const post = keep(
    mergeGeometries([
      new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10).translate(0, 0.25, 0),
      new THREE.CylinderGeometry(0.06, 0.08, 3.4, 10).translate(0, 2.2, 0),
      new THREE.CylinderGeometry(0.22, 0.12, 0.12, 10).translate(0, 3.95, 0),
      new THREE.CylinderGeometry(0.02, 0.22, 0.28, 10).translate(0, 4.68, 0),
    ]),
  );
  const lantern = keep(new THREE.CylinderGeometry(0.17, 0.13, 0.55, 10).translate(0, 4.27, 0));
  const posts = new THREE.InstancedMesh(post, keep(new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.45, metalness: 0.7 })), lampSpots.length);
  const lampMat = keep(new THREE.MeshStandardMaterial({ color: 0xf2e6cf, emissive: 0xffc787, emissiveIntensity: 0, roughness: 0.3 }));
  const lanterns = new THREE.InstancedMesh(lantern, lampMat, lampSpots.length);
  lampSpots.forEach((p, i) => {
    m4.compose(p, q, s.set(1, 1, 1));
    posts.setMatrixAt(i, m4);
    lanterns.setMatrixAt(i, m4);
  });
  posts.castShadow = o.shadows;
  group.add(posts, lanterns);

  /* benches along the street */
  for (const [x, z, r] of [
    [-7.2, -50, 1],
    [7.2, -80, -1],
    [-7.2, -140, 1],
    [7.2, -170, -1],
    [-7.2, 0, 1],
  ] as const) {
    B.box("satin", 0x6b4a32, [x, 0.46, z], [0.5, 0.06, 2.0]);
    B.box("satin", 0x6b4a32, [x - r * 0.24, 0.75, z], [0.06, 0.4, 2.0]);
    for (const e of [-0.8, 0.8]) B.box("metal", 0x2a2c2f, [x, 0.22, z + e], [0.5, 0.44, 0.06]);
  }

  /* ---------- the plaza ---------- */
  const fx = -13;
  const fz = -262;
  B.cyl("satin", 0xcfc4ab, fx, 0, fz, 4.2, 4.3, 0.55, 40);
  B.cyl("gloss", 0x3e5b66, fx, 0.02, fz, 3.95, 3.95, 0.5, 40);
  B.cyl("satin", 0xcfc4ab, fx, 0, fz, 0.5, 0.65, 1.6, 20);
  B.cyl("satin", 0xcfc4ab, fx, 1.6, fz, 1.4, 0.4, 0.3, 24);
  B.cyl("gloss", 0x6f95a2, fx, 1.68, fz, 1.28, 1.28, 0.2, 24);
  B.cyl("satin", 0xcfc4ab, fx, 1.9, fz, 0.18, 0.26, 0.7, 12);
  for (const [x, z, r] of [
    [10, -264, 0],
    [-24, -270, 1.57],
    [24, -268, 1.57],
  ] as const) {
    const at = (dx: number, dz: number) => [x + Math.cos(r) * dx + Math.sin(r) * dz, 0, z - Math.sin(r) * dx + Math.cos(r) * dz];
    const p0 = at(0, 0);
    B.box("satin", 0x6b4a32, [p0[0], 0.46, p0[2]], r ? [0.5, 0.06, 2] : [2, 0.06, 0.5]);
    const pb = at(0, -0.24);
    B.box("satin", 0x6b4a32, [pb[0], 0.75, pb[2]], r ? [0.06, 0.4, 2] : [2, 0.4, 0.06]);
  }
  /* the balustrade */
  const bz = PLAZA.z1 + 0.6;
  B.box("satin", 0xd8ccb2, [0, 1.02, bz], [2 * PLAZA.half, 0.14, 0.42]);
  B.box("satin", 0xd8ccb2, [0, 0.1, bz], [2 * PLAZA.half, 0.2, 0.44]);
  for (let x = -PLAZA.half + 0.2; x < PLAZA.half; x += 0.36) {
    if (Math.abs(x % 6) < 0.3) B.box("satin", 0xd8ccb2, [x, 0.55, bz], [0.36, 0.95, 0.36]);
    else B.add(new THREE.CylinderGeometry(0.06, 0.09, 0.75, 8), "satin", 0xe1d6bf, { p: [x, 0.58, bz] });
  }
  B.build(group, { cast: o.shadows, receive: o.shadows });

  return {
    update(t, night) {
      shared.uNight.value = night;
      shared.uTime.value = t;
      lampMat.emissiveIntensity = THREE.MathUtils.smoothstep(night, 0.2, 0.45) * 3;
    },
    dispose() {
      for (const d of disposables) d.dispose();
      group.traverse((obj) => (obj as THREE.Mesh).geometry?.dispose());
    },
  };
}

/** Square-cut stone pavers in a running bond, warm grey with a little variation; 3 m to a tile. */
function pavingTexture() {
  const R = rng(77);
  return canvasTexture(512, 512, (g) => {
    g.fillStyle = "#8a847a";
    g.fillRect(0, 0, 512, 512);
    const rowH = 512 / 10;
    for (let r = 0; r < 10; r++) {
      const off = (r % 2) * 0.5;
      const w = 512 / 5;
      for (let k = -1; k < 6; k++) {
        const x = (k + off) * w;
        const l = 58 + R() * 7;
        const hue = 30 + R() * 10;
        g.fillStyle = `hsl(${hue}, ${7 + R() * 6}%, ${l}%)`;
        g.fillRect(x + 2, r * rowH + 2, w - 4, rowH - 4);
        /* wear: a soft lighter patch */
        g.fillStyle = `rgba(255,255,255,${R() * 0.06})`;
        g.fillRect(x + 8, r * rowH + 6, (w - 16) * R(), rowH - 12);
      }
    }
  });
}

/** A tree canopy: a few lumpy blobs. */
function treeGeometry(R: () => number): THREE.BufferGeometry {
  const blobs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const ico = new THREE.IcosahedronGeometry(1.0 + R() * 0.6, 3);
    ico.deleteAttribute("normal");
    ico.deleteAttribute("uv");
    /* weld the corners so the blob shades smooth, not faceted */
    const g = mergeVertices(ico);
    ico.dispose();
    const p = g.attributes.position;
    const ph = R() * 10;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      const y = p.getY(k);
      const z = p.getZ(k);
      const n = 0.86 + 0.14 * Math.sin(x * 2.1 + ph) * Math.cos(z * 2.3 - ph) + 0.08 * Math.sin(y * 3.1 + ph);
      p.setXYZ(k, x * n, y * n * 0.85, z * n);
    }
    g.translate((R() - 0.5) * 2.2, 4.2 + R() * 1.6, (R() - 0.5) * 2.2);
    blobs.push(g);
  }
  const merged = mergeGeometries(blobs);
  blobs.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}
