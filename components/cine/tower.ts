import * as THREE from "three";

import type { Project } from "@/lib/projects";

import { TOWER } from "./city";
import { facadeMaterial } from "./facade";

/**
 * The portfolio tower at the end of the avenue. Its ground floor is a double-height glass lobby: sliding
 * doors that open as the camera arrives, a polished stone floor that mirrors the ceiling lights, and a
 * gallery of eight large screens, one per product, that light up as the camera passes. At the back, a
 * glass elevator runs up the outside of the tower and carries the camera above the city.
 */

const FRONT = TOWER.z + TOWER.d / 2; // z of the glass front: -160
const BACK = TOWER.z - TOWER.d / 2 + 2; // inside face of the back wall: -198
const SIDE = TOWER.w / 2 - 2; // inside face of the side walls: 18
const LOBBY_H = 14;

export const SCREEN_Z = [-166, -173, -180, -187];
/** The elevator shaft runs up the right side of the tower, outside it. */
export const LIFT = { x: TOWER.w / 2 + 3.2, z: -194, w: 5.6, top: TOWER.h - 30 };

export type Tower = {
  update: (cam: THREE.Vector3, t: number, night: number, active: number) => void;
  dispose: () => void;
};

export function buildTower(scene: THREE.Scene, projects: Project[], o: { lights: number; font: string }): Tower {
  const group = new THREE.Group();
  scene.add(group);
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, shadow = true) => {
    const m = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  /* ---------- materials ---------- */
  const stone = keep(new THREE.MeshStandardMaterial({ color: 0xb4aa98, roughness: 0.75 }));
  const darkMetal = keep(new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.32, metalness: 0.85 }));
  const brushed = keep(new THREE.MeshStandardMaterial({ color: 0x8c8a86, roughness: 0.28, metalness: 0.95 }));
  const glass = keep(
    new THREE.MeshStandardMaterial({
      color: 0x9fb4bd,
      roughness: 0.04,
      metalness: 0.9,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  /* the elevator's glass is low-iron and nearly invisible from inside, so the view stays clear */
  const clear = keep(
    new THREE.MeshStandardMaterial({
      color: 0xc9d6da,
      roughness: 0.05,
      metalness: 0.3,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const wood = keep(new THREE.MeshStandardMaterial({ map: keep(woodTexture()), roughness: 0.55 }));
  const floorTex = keep(floorTexture());
  const floor = keep(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.18, metalness: 0.05, envMapIntensity: 0.4 }));
  const ceilTex = keep(ceilingTexture());
  const ceiling = keep(
    new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff0dc, emissiveMap: ceilTex, emissiveIntensity: 1.2, roughness: 0.9 }),
  );

  /* ---------- the tower above the lobby ---------- */
  const hero = facadeMaterial({
    frame: 0x15171a,
    glass: 0x2c3a44,
    cell: [1.5, 4.2],
    win: [0.9, 0.86],
    glassRough: 0.04,
    glassMetal: 0.95,
    frameRough: 0.3,
    frameMetal: 0.85,
    lit: 0.62,
    fins: 0.8,
  });
  keep(hero);
  const body = new THREE.Mesh(keep(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), hero);
  body.scale.set(TOWER.w, TOWER.h - LOBBY_H - 26, TOWER.d);
  body.position.set(TOWER.x, LOBBY_H, TOWER.z);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  const crownY = TOWER.h - 26;
  const crown = new THREE.Mesh(body.geometry, hero);
  crown.scale.set(TOWER.w - 6, 22, TOWER.d - 6);
  crown.position.set(TOWER.x, crownY, TOWER.z);
  crown.castShadow = true;
  group.add(crown);
  /* a thin band of light around the crown, and a mast */
  const band = keep(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffe3c0, emissiveIntensity: 0 }));
  for (const y of [crownY - 0.6, crownY + 22]) {
    box(TOWER.w + 0.4 - (y > crownY ? 6 : 0), 0.35, 0.3, band, 0, y, TOWER.z + (TOWER.d - (y > crownY ? 6 : 0)) / 2 + 0.1, false);
    box(TOWER.w + 0.4 - (y > crownY ? 6 : 0), 0.35, 0.3, band, 0, y, TOWER.z - (TOWER.d - (y > crownY ? 6 : 0)) / 2 - 0.1, false);
    box(0.3, 0.35, TOWER.d + 0.4 - (y > crownY ? 6 : 0), band, (TOWER.w - (y > crownY ? 6 : 0)) / 2 + 0.1, y, TOWER.z, false);
    box(0.3, 0.35, TOWER.d + 0.4 - (y > crownY ? 6 : 0), band, -(TOWER.w - (y > crownY ? 6 : 0)) / 2 - 0.1, y, TOWER.z, false);
  }
  const mast = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.25, 0.9, 30, 10).translate(0, 15, 0)), brushed);
  mast.position.set(TOWER.x, TOWER.h - 4, TOWER.z);
  group.add(mast);

  /* ---------- lobby shell ---------- */
  /* back wall and the left wall */
  box(TOWER.w, LOBBY_H, 2, stone, 0, 0, TOWER.z - TOWER.d / 2 + 1);
  box(2, LOBBY_H, TOWER.d, stone, -TOWER.w / 2 + 1, 0, TOWER.z);
  /* the right wall, with an opening into the elevator */
  const lz0 = LIFT.z - LIFT.w / 2;
  const lz1 = LIFT.z + LIFT.w / 2;
  box(2, LOBBY_H, FRONT - lz1, stone, TOWER.w / 2 - 1, 0, (FRONT + lz1) / 2);
  box(2, LOBBY_H, lz0 - (TOWER.z - TOWER.d / 2), stone, TOWER.w / 2 - 1, 0, (lz0 + TOWER.z - TOWER.d / 2) / 2);
  box(2, LOBBY_H - 3.4, LIFT.w, stone, TOWER.w / 2 - 1, 3.4, LIFT.z);
  /* wood lining on the inside of the side walls */
  for (const sx of [-1, 1]) {
    const lining = new THREE.Mesh(keep(new THREE.PlaneGeometry(BACK - FRONT, LOBBY_H - 0.4)), wood);
    lining.geometry = keep(new THREE.PlaneGeometry(FRONT - BACK, LOBBY_H - 0.4));
    lining.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    lining.position.set(sx * (SIDE - 0.02), LOBBY_H / 2, (FRONT + BACK) / 2);
    lining.receiveShadow = true;
    if (sx > 0) {
      /* leave the elevator opening clear */
      lining.geometry = keep(new THREE.PlaneGeometry(FRONT - lz1, LOBBY_H - 0.4));
      lining.position.z = (FRONT + lz1) / 2;
    }
    group.add(lining);
  }
  /* floor and ceiling */
  const fl = new THREE.Mesh(keep(new THREE.PlaneGeometry(SIDE * 2, FRONT - BACK).rotateX(-Math.PI / 2)), floor);
  fl.position.set(0, 0.03, (FRONT + BACK) / 2);
  fl.receiveShadow = true;
  group.add(fl);
  const cl = new THREE.Mesh(keep(new THREE.PlaneGeometry(SIDE * 2, FRONT - BACK).rotateX(Math.PI / 2)), ceiling);
  cl.position.set(0, LOBBY_H - 0.2, (FRONT + BACK) / 2);
  group.add(cl);
  /* columns */
  const colGeo = keep(new THREE.CylinderGeometry(0.55, 0.55, LOBBY_H, 24).translate(0, LOBBY_H / 2, 0));
  for (const x of [-9.5, 9.5]) {
    for (const z of [-169.5, -183.5]) {
      const c = new THREE.Mesh(colGeo, stone);
      c.position.set(x, 0, z);
      c.castShadow = c.receiveShadow = true;
      group.add(c);
    }
  }
  /* the back wall: a wide panel of backlit onyx with one line of type */
  const onyx = keep(
    new THREE.MeshStandardMaterial({ color: 0x2a2018, emissive: 0xffffff, emissiveMap: keep(onyxTexture(o.font)), emissiveIntensity: 0.9, roughness: 0.3 }),
  );
  const wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(22, 8)), onyx);
  wall.position.set(0, 5.4, BACK + 0.03);
  group.add(wall);

  /* reception desk, back left */
  box(9, 1.1, 1.6, darkMetal, -9, 0, BACK + 4);
  box(9.2, 0.06, 1.8, brushed, -9, 1.1, BACK + 4, false);
  const deskGlow = keep(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd2a0, emissiveIntensity: 2 }));
  box(9, 0.04, 0.04, deskGlow, -9, 0.12, BACK + 4.82, false);

  /* ---------- the glass front with sliding doors ---------- */
  const DOOR = 3;
  const DOOR_H = 4.6;
  const front = (x0: number, x1: number, y0: number, y1: number) => {
    const p = new THREE.Mesh(keep(new THREE.PlaneGeometry(x1 - x0, y1 - y0)), glass);
    p.position.set((x0 + x1) / 2, (y0 + y1) / 2, FRONT);
    p.renderOrder = 2;
    group.add(p);
  };
  front(-SIDE - 2, -DOOR, 0, LOBBY_H);
  front(DOOR, SIDE + 2, 0, LOBBY_H);
  front(-DOOR, DOOR, DOOR_H, LOBBY_H);
  for (let x = -SIDE - 2; x <= SIDE + 2.01; x += 3) {
    if (Math.abs(x) < DOOR + 0.1 && Math.abs(x) > 0.1) continue;
    box(0.12, LOBBY_H, 0.35, darkMetal, x, 0, FRONT, false);
  }
  for (const y of [DOOR_H, 9.4, LOBBY_H - 0.3]) box(TOWER.w, 0.16, 0.4, darkMetal, 0, y, FRONT, false);
  const leaves: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Group();
    const pane = new THREE.Mesh(keep(new THREE.PlaneGeometry(DOOR, DOOR_H)), glass);
    pane.position.set(0, DOOR_H / 2, 0);
    pane.renderOrder = 2;
    leaf.add(pane);
    for (const e of [-DOOR / 2, DOOR / 2]) {
      const edge = new THREE.Mesh(keep(new THREE.BoxGeometry(0.08, DOOR_H, 0.08)), brushed);
      edge.position.set(e, DOOR_H / 2, 0);
      leaf.add(edge);
    }
    const handle = new THREE.Mesh(keep(new THREE.BoxGeometry(0.05, 1.6, 0.1)), brushed);
    handle.position.set(-sx * (DOOR / 2 - 0.25), 1.1, 0.12);
    leaf.add(handle);
    leaf.position.set(sx * DOOR / 2, 0, FRONT + 0.05);
    leaf.userData.home = sx * DOOR / 2;
    leaf.userData.side = sx;
    leaves.push(leaf);
    group.add(leaf);
  }
  /* canopy over the entrance, with the sign on its edge and downlights below */
  box(26, 0.7, 9, darkMetal, 0, 6.2, FRONT + 4.5);
  const sign = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(24, 0.62)),
    keep(
      new THREE.MeshStandardMaterial({
        map: keep(signTexture(o.font)),
        emissive: 0xffffff,
        emissiveMap: null,
        emissiveIntensity: 0,
        roughness: 0.4,
        transparent: true,
      }),
    ),
  );
  const signMat = sign.material as THREE.MeshStandardMaterial;
  signMat.emissiveMap = signMat.map;
  sign.position.set(0, 6.55, FRONT + 9.02);
  group.add(sign);
  const down = keep(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffe2bf, emissiveIntensity: 4 }));
  const dlGeo = keep(new THREE.CircleGeometry(0.22, 16).rotateX(Math.PI / 2));
  for (let x = -10; x <= 10; x += 4) {
    for (const z of [FRONT + 2.5, FRONT + 6.5]) {
      const d = new THREE.Mesh(dlGeo, down);
      d.position.set(x, 6.18, z);
      group.add(d);
    }
  }

  /* ---------- the screens ---------- */
  const screens: THREE.MeshStandardMaterial[] = [];
  const SW = 6;
  const SH = 3.6;
  projects.slice(0, 8).forEach((p, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = SCREEN_Z[Math.floor(i / 2)];
    const tex = keep(screenTexture(p, i, projects.length, o.font));
    const mat = keep(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.6, roughness: 0.25 }));
    screens.push(mat);
    const scr = new THREE.Mesh(keep(new THREE.PlaneGeometry(SW, SH)), mat);
    scr.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    scr.position.set(side * (SIDE - 0.18), 2.6 + SH / 2, z);
    group.add(scr);
    box(0.16, SH + 0.24, SW + 0.24, darkMetal, side * (SIDE - 0.04), 2.48, z, false);
  });

  /* ---------- glass elevator outside the right wall ---------- */
  const lx0 = LIFT.x - LIFT.w / 2;
  const lx1 = LIFT.x + LIFT.w / 2;
  const postGeo = keep(new THREE.BoxGeometry(0.3, LIFT.top, 0.3).translate(0, LIFT.top / 2, 0));
  for (const x of [lx0, lx1]) {
    for (const z of [lz0, lz1]) {
      const post = new THREE.Mesh(postGeo, darkMetal);
      post.position.set(x, 0, z);
      post.castShadow = true;
      group.add(post);
    }
  }
  const ringGeo = keep(new THREE.BoxGeometry(LIFT.w, 0.14, 0.14));
  const ringGeoZ = keep(new THREE.BoxGeometry(0.14, 0.14, LIFT.w));
  const rings = new THREE.InstancedMesh(ringGeo, darkMetal, Math.ceil(LIFT.top / 12) * 2);
  const ringsZ = new THREE.InstancedMesh(ringGeoZ, darkMetal, Math.ceil(LIFT.top / 12));
  const m4 = new THREE.Matrix4();
  for (let k = 0, y = 6; y < LIFT.top; y += 12, k++) {
    rings.setMatrixAt(k * 2, m4.makeTranslation(LIFT.x, y, lz0));
    rings.setMatrixAt(k * 2 + 1, m4.makeTranslation(LIFT.x, y, lz1));
    ringsZ.setMatrixAt(k, m4.makeTranslation(lx1, y, LIFT.z));
  }
  group.add(rings, ringsZ);
  const shaftGlass = (w: number, x: number, z: number, ry: number) => {
    const p = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, LIFT.top)), clear);
    p.position.set(x, LIFT.top / 2, z);
    p.rotation.y = ry;
    p.renderOrder = 2;
    group.add(p);
  };
  shaftGlass(LIFT.w, LIFT.x, lz0, 0);
  shaftGlass(LIFT.w, LIFT.x, lz1, 0);
  shaftGlass(LIFT.w, lx1, LIFT.z, Math.PI / 2);
  /* the cab: a floor, a lit ceiling, a handrail and glass all round */
  const cab = new THREE.Group();
  const cabW = LIFT.w - 0.6;
  const cabFloor = new THREE.Mesh(keep(new THREE.BoxGeometry(cabW, 0.2, cabW)), darkMetal);
  cabFloor.position.y = -0.1;
  cab.add(cabFloor);
  const cabCeil = new THREE.Mesh(keep(new THREE.BoxGeometry(cabW, 0.2, cabW)), darkMetal);
  cabCeil.position.y = 3.1;
  cab.add(cabCeil);
  const cabLight = new THREE.Mesh(keep(new THREE.PlaneGeometry(cabW - 1, cabW - 1).rotateX(Math.PI / 2)), down);
  cabLight.position.y = 2.99;
  cab.add(cabLight);
  for (const [w, x, z, ry] of [
    [cabW, 0, -cabW / 2, 0],
    [cabW, 0, cabW / 2, 0],
    [cabW, cabW / 2, 0, Math.PI / 2],
  ] as const) {
    const g = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, 3)), clear);
    g.position.set(x, 1.5, z);
    g.rotation.y = ry;
    g.renderOrder = 2;
    cab.add(g);
    const rail = new THREE.Mesh(keep(new THREE.BoxGeometry(ry ? 0.05 : w - 0.3, 0.05, ry ? w - 0.3 : 0.05)), brushed);
    rail.position.set(x * 0.92, 1.0, z * 0.92);
    cab.add(rail);
  }
  cab.position.set(LIFT.x, 0.02, LIFT.z);
  group.add(cab);

  /* ---------- lobby lights ---------- */
  const lights: THREE.PointLight[] = [];
  const spots = o.lights >= 3 ? [-167, -179, -191] : [-176];
  for (const z of spots) {
    const l = new THREE.PointLight(0xffd9b0, o.lights >= 3 ? 70 : 160, 34, 2);
    l.position.set(0, LOBBY_H - 2, z);
    lights.push(l);
    group.add(l);
  }

  const glowCol = new THREE.Color();
  return {
    update(cam, t, night, active) {
      /* the doors slide open as the camera comes within 22 m, and stay open */
      const dz = cam.z - FRONT;
      const open = THREE.MathUtils.smoothstep(-dz, -22, -6) * (cam.z > BACK ? 1 : 0);
      for (const leaf of leaves) leaf.position.x = leaf.userData.home + leaf.userData.side * open * (DOOR - 0.1);
      /* the cab rides with the camera once the camera is inside it */
      const inCab = cam.x > SIDE + 1.2;
      cab.position.y = inCab ? Math.max(0.02, cam.y - 1.7) : 0.02;
      screens.forEach((m, i) => {
        const k = i === active ? 1 : 0;
        m.emissiveIntensity += (0.45 + k * 1.1 - m.emissiveIntensity) * 0.08;
      });
      band.emissiveIntensity = 0.5 + night * 5;
      signMat.emissiveIntensity = 0.8 + night * 2.5;
      ceiling.emissiveIntensity = 0.9 + night * 0.6;
      void t;
      void glowCol;
    },
    dispose() {
      for (const d of disposables) d.dispose();
      scene.remove(group);
    },
  };
}

/* ---------- canvas textures ---------- */

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Large-format dark stone slabs with a faint vein. */
function floorTexture() {
  const t = canvas(1024, 1024, (g) => {
    g.fillStyle = "#1b1c1e";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const v = 22 + Math.random() * 8;
        g.fillStyle = `rgb(${v},${v},${v + 2})`;
        g.fillRect(i * 256 + 2, j * 256 + 2, 252, 252);
      }
    }
    g.strokeStyle = "rgba(160,150,140,0.08)";
    g.lineWidth = 1.5;
    for (let k = 0; k < 40; k++) {
      g.beginPath();
      let x = Math.random() * 1024;
      let y = Math.random() * 1024;
      g.moveTo(x, y);
      for (let s = 0; s < 8; s++) {
        x += (Math.random() - 0.3) * 60;
        y += (Math.random() - 0.5) * 60;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 9.5);
  return t;
}

function woodTexture() {
  const t = canvas(512, 512, (g) => {
    g.fillStyle = "#5c3d28";
    g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 32) {
      const v = Math.random() * 30 - 15;
      g.fillStyle = `rgb(${92 + v},${61 + v * 0.7},${40 + v * 0.5})`;
      g.fillRect(x + 2, 0, 28, 512);
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(x, 0, 2, 512);
      for (let k = 0; k < 6; k++) {
        g.strokeStyle = `rgba(40,24,14,${0.08 + Math.random() * 0.1})`;
        g.beginPath();
        const ox = x + 4 + Math.random() * 22;
        g.moveTo(ox, 0);
        g.bezierCurveTo(ox + 4, 170, ox - 4, 340, ox + 2, 512);
        g.stroke();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 1);
  return t;
}

/** Lines of light in a dark coffered ceiling. */
function ceilingTexture() {
  const t = canvas(512, 512, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = "#fff";
    for (let y = 40; y < 512; y += 128) g.fillRect(0, y, 512, 6);
    g.fillStyle = "rgba(255,255,255,0.08)";
    for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 2, 512);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

function onyxTexture(font: string) {
  return canvas(1408, 512, (g) => {
    const bg = g.createRadialGradient(704, 256, 40, 704, 256, 760);
    bg.addColorStop(0, "#c98d55");
    bg.addColorStop(0.6, "#7a4f2c");
    bg.addColorStop(1, "#3a2414");
    g.fillStyle = bg;
    g.fillRect(0, 0, 1408, 512);
    /* veins in the stone */
    for (let k = 0; k < 60; k++) {
      g.strokeStyle = `rgba(255,${200 + Math.random() * 40},${150 + Math.random() * 40},${0.04 + Math.random() * 0.08})`;
      g.lineWidth = 1 + Math.random() * 6;
      g.beginPath();
      let x = Math.random() * 1408;
      let y = Math.random() * 512;
      g.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (Math.random() - 0.5) * 220;
        y += (Math.random() - 0.5) * 90;
        g.quadraticCurveTo(x + 40, y - 30, x, y);
      }
      g.stroke();
    }
    g.fillStyle = "rgba(20,12,6,0.85)";
    g.font = `600 64px ${font}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "6px";
    g.fillText("Products are cities. I build the plumbing.", 704, 262);
  });
}

function signTexture(font: string) {
  return canvas(2048, 54, (g) => {
    g.clearRect(0, 0, 2048, 54);
    g.fillStyle = "#f3ead8";
    g.font = `600 34px ${font}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "18px";
    g.fillText("ABD ALKAREEM ABU-ALSOUD", 1024, 29);
  });
}

/** A product screen: the name, what it is and its stack beside a sketch of its interface. */
function screenTexture(p: Project, i: number, n: number, font: string) {
  return canvas(1280, 768, (g) => {
    const bg = g.createLinearGradient(0, 0, 1280, 768);
    bg.addColorStop(0, "#14171c");
    bg.addColorStop(1, "#0a0b0d");
    g.fillStyle = bg;
    g.fillRect(0, 0, 1280, 768);
    g.fillStyle = "#8b8f97";
    g.font = `500 26px ${font}`;
    g.fillText(`${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`, 72, 104);
    g.fillStyle = "#f2efe8";
    g.font = `600 92px ${font}`;
    g.fillText(p.name, 72, 230);
    g.fillStyle = "#c9c4b8";
    g.font = `400 34px ${font}`;
    wrap(g, p.kind, 72, 296, 560, 44);
    g.font = `500 24px ${font}`;
    let x = 72;
    let y = 600;
    for (const s of p.stack.slice(0, 6)) {
      const w = g.measureText(s).width + 36;
      if (x + w > 640) {
        x = 72;
        y += 54;
      }
      g.strokeStyle = "rgba(242,239,232,0.35)";
      g.lineWidth = 2;
      roundRect(g, x, y - 32, w, 44, 22);
      g.stroke();
      g.fillStyle = "#e6e2d8";
      g.fillText(s, x + 18, y - 2);
      x += w + 12;
    }
    /* a sketch of the product's interface */
    const ux = 700;
    const uy = 80;
    g.fillStyle = "#1d2127";
    roundRect(g, ux, uy, 500, 600, 18);
    g.fill();
    g.fillStyle = "#262b33";
    g.fillRect(ux, uy + 50, 120, 550);
    const seed = p.name.length * 7 + i;
    for (let k = 0; k < 6; k++) {
      g.fillStyle = k === 1 ? "#d9b98a" : "#3a414c";
      g.fillRect(ux + 18, uy + 80 + k * 46, 84, 14);
    }
    for (let r = 0; r < 3; r++) {
      g.fillStyle = "#2c323b";
      roundRect(g, ux + 140 + r * 118, uy + 70, 106, 80, 10);
      g.fill();
      g.fillStyle = r === seed % 3 ? "#e9c58f" : "#9aa3b0";
      g.fillRect(ux + 152 + r * 118, uy + 112, 50 + ((seed * (r + 3)) % 40), 10);
    }
    g.strokeStyle = "#e9c58f";
    g.lineWidth = 4;
    g.beginPath();
    for (let k = 0; k <= 10; k++) {
      const px = ux + 150 + k * 32;
      const py = uy + 330 - Math.sin(k * 0.8 + seed) * 40 - k * 9;
      if (k) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
    for (let r = 0; r < 4; r++) {
      g.fillStyle = r % 2 ? "#232830" : "#272d36";
      g.fillRect(ux + 140, uy + 400 + r * 46, 340, 40);
      g.fillStyle = "#6c7480";
      g.fillRect(ux + 156, uy + 416 + r * 46, 120 + ((seed * (r + 2)) % 90), 8);
    }
  });
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = "";
  for (const w of text.split(" ")) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > max && line) {
      g.fillText(line, x, y);
      y += lh;
      line = w;
    } else line = t;
  }
  g.fillText(line, x, y);
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
