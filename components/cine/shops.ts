import * as THREE from "three";

import type { Project } from "@/lib/projects";

import { facadeMaterial, type FacadeStyle } from "./facade";
import { Batch, canvasTexture, rng, roundRect, Surfaces, wrap, type Surface } from "./kit";
import { LINE, SHOP, shopSide, shopZ } from "./layout";

/**
 * The eight buildings of the portfolio, one per project, each designed from what the product does:
 * a finance office with a stock ticker, a printing house for a publishing platform, a furniture
 * showroom, a trattoria, a travel information centre with a live route board, a bookshop, a fashion
 * boutique and an energy-smart building with solar panels and a wind turbine. Every one has a real
 * ground-floor interior behind sliding glass doors, furnished for its trade, with the project on a
 * large screen on the back wall.
 */

export type Shops = {
  update: (t: number, dt: number, night: number, char: THREE.Vector3) => void;
  dispose: () => void;
};

type Theme = {
  base: number;
  frame: number;
  wall: number;
  floor: number;
  floorKind: Surface;
  /** The floor's pattern and how rough it is. */
  pattern: "planks" | "tiles" | "concrete" | "terrazzo" | "slab";
  ceil: number;
  panel: THREE.Color;
  light: number;
  upper: FacadeStyle;
  h: number;
  sign: { bg: string; fg: string; font: string; accent?: string; text?: string };
};

const warmPanel = new THREE.Color(1.5, 1.38, 1.18);
const coolPanel = new THREE.Color(1.3, 1.4, 1.55);

const THEMES: Record<Project["id"], Theme> = {
  villagewellth: {
    base: 0x26292d,
    frame: 0x1b1d20,
    wall: 0xe8e5de,
    floor: 0xb08659,
    floorKind: "satin",
    pattern: "planks",
    ceil: 0xf1efe9,
    panel: warmPanel,
    light: 0xffe6c4,
    h: 28,
    upper: { frame: 0x1f2225, glass: 0x46535b, cell: [1.5, 3.6], win: [0.9, 0.78], glassRough: 0.05, glassMetal: 0.95, frameRough: 0.35, frameMetal: 0.8, lit: 0.5, fins: 0.5 },
    sign: { bg: "#17191c", fg: "#e7c78f", font: "600", accent: "#e7c78f" },
  },
  sahefa: {
    base: 0x6f3829,
    frame: 0x203a30,
    wall: 0x8c4c37,
    floor: 0x8a8781,
    floorKind: "satin",
    pattern: "concrete",
    ceil: 0x2d2c2a,
    panel: warmPanel,
    light: 0xffdcb0,
    h: 17,
    upper: { frame: 0x7a3e2d, glass: 0x2e363d, cell: [2.6, 3.2], win: [0.44, 0.6], glassRough: 0.1, glassMetal: 0.75, frameRough: 0.92, frameMetal: 0, lit: 0.7 },
    sign: { bg: "#203a30", fg: "#f1e7d0", font: "700", text: "serif" },
  },
  diwan: {
    base: 0xcbb898,
    frame: 0x3b2a1e,
    wall: 0xdcccb2,
    floor: 0x6a4a33,
    floorKind: "satin",
    pattern: "planks",
    ceil: 0xefe7da,
    panel: warmPanel,
    light: 0xffd9a8,
    h: 16,
    upper: { frame: 0xcdbd9b, glass: 0x3b464e, cell: [3.0, 3.5], win: [0.5, 0.58], glassRough: 0.08, glassMetal: 0.8, frameRough: 0.85, frameMetal: 0, lit: 0.62 },
    sign: { bg: "#3b2a1e", fg: "#d9b46a", font: "600" },
  },
  oliva: {
    base: 0xc58a55,
    frame: 0x2f4a33,
    wall: 0xeadfc8,
    floor: 0xa65a3d,
    floorKind: "satin",
    pattern: "tiles",
    ceil: 0xf0e6d3,
    panel: warmPanel,
    light: 0xffd29a,
    h: 14,
    upper: { frame: 0xd6a46d, glass: 0x334048, cell: [2.8, 3.2], win: [0.42, 0.6], glassRough: 0.1, glassMetal: 0.7, frameRough: 0.9, frameMetal: 0, lit: 0.7 },
    sign: { bg: "#2f4a33", fg: "#f3e9d2", font: "italic 600", text: "serif" },
  },
  watan: {
    base: 0xd6c9ad,
    frame: 0x2d3a33,
    wall: 0xe9e2d3,
    floor: 0xcdc3b1,
    floorKind: "satin",
    pattern: "slab",
    ceil: 0xf1ede5,
    panel: coolPanel,
    light: 0xf2f0ea,
    h: 15,
    upper: { frame: 0xe2d4b6, glass: 0x3a4650, cell: [3.0, 3.4], win: [0.46, 0.6], glassRough: 0.08, glassMetal: 0.8, frameRough: 0.85, frameMetal: 0, lit: 0.6 },
    sign: { bg: "#1f4434", fg: "#f4f1ea", font: "700", accent: "#e2b84d" },
  },
  carebooks: {
    base: 0x1e2a42,
    frame: 0xc8a25a,
    wall: 0x22324a,
    floor: 0x9a7149,
    floorKind: "satin",
    pattern: "planks",
    ceil: 0xeee6d6,
    panel: warmPanel,
    light: 0xffd8a4,
    h: 14,
    upper: { frame: 0xe5dac3, glass: 0x36414a, cell: [2.6, 3.3], win: [0.5, 0.6], glassRough: 0.1, glassMetal: 0.75, frameRough: 0.9, frameMetal: 0, lit: 0.7 },
    sign: { bg: "#1e2a42", fg: "#f2e3c2", font: "600", accent: "#e46a5a" },
  },
  arvo: {
    base: 0xefede8,
    frame: 0x151515,
    wall: 0xf3f1ec,
    floor: 0xd7d2c9,
    floorKind: "gloss",
    pattern: "terrazzo",
    ceil: 0xf6f5f2,
    panel: new THREE.Color(1.55, 1.5, 1.42),
    light: 0xfff2e6,
    h: 18,
    upper: { frame: 0xe9e8e4, glass: 0x3c4650, cell: [2.2, 3.6], win: [0.8, 0.7], glassRough: 0.06, glassMetal: 0.85, frameRough: 0.6, frameMetal: 0, lit: 0.55, fins: 0.4 },
    sign: { bg: "#f2f0eb", fg: "#ff4f7b", font: "500", text: "neon" },
  },
  sgsoft: {
    base: 0x2c3238,
    frame: 0x1a1d21,
    wall: 0x515a64,
    floor: 0x34393f,
    floorKind: "gloss",
    pattern: "concrete",
    ceil: 0x3a3f45,
    panel: coolPanel,
    light: 0xdbe8ff,
    h: 22,
    upper: { frame: 0x2f363d, glass: 0x4f6c78, cell: [1.6, 3.8], win: [0.92, 0.8], glassRough: 0.06, glassMetal: 0.92, frameRough: 0.45, frameMetal: 0.7, lit: 0.55 },
    sign: { bg: "#15191d", fg: "#9ff0c0", font: "700", accent: "#9ff0c0" },
  },
};

type Ctx = {
  s: number;
  z: number;
  ext: Batch;
  int: Batch;
  /** World position of (u, y, d). */
  X: (u: number, y: number, d: number) => number[];
  /** A box by centre (u, y, d) and size along u, y and d. */
  bx: (B: Batch, k: Surface, c: THREE.ColorRepresentation, u: number, y: number, d: number, su: number, sy: number, sd: number) => void;
  cy: (B: Batch, k: Surface, c: THREE.ColorRepresentation, u: number, y0: number, d: number, r1: number, r2: number, h: number, seg?: number) => void;
  plane: (parent: THREE.Object3D, mat: THREE.Material, u: number, y: number, d: number, w: number, h: number, facing: "street" | "+u" | "-u" | "up") => THREE.Mesh;
  outer: THREE.Group;
  inner: THREE.Group;
  anim: ((t: number, dt: number, night: number) => void)[];
  keep: <T extends { dispose: () => void }>(x: T) => T;
  font: string;
  R: () => number;
  surfaces: Surfaces;
};

export function buildShops(scene: THREE.Scene, projects: Project[], o: { shadows: boolean; font: string; lights: number; surfaces: Surfaces }): Shops {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const ext = new Batch(o.surfaces);
  const outerAll = new THREE.Group();
  scene.add(outerAll);
  const shops: { z: number; s: number; inner: THREE.Group; doors: THREE.Group[]; screen: THREE.MeshBasicMaterial; sign: THREE.MeshStandardMaterial; neon: boolean }[] = [];
  const anim: Ctx["anim"] = [];

  projects.forEach((p, i) => {
    const s = shopSide(i);
    const z = shopZ(i);
    const T = THEMES[p.id];
    const int = new Batch(o.surfaces);
    const inner = new THREE.Group();
    inner.visible = false;
    scene.add(inner);
    const X = (u: number, y: number, d: number) => [s * (LINE + d), y, z + u];
    const c: Ctx = {
      s,
      z,
      ext,
      int,
      X,
      bx: (B, k, col, u, y, d, su, sy, sd) => B.box(k, col, X(u, y, d), [sd, sy, su]),
      cy: (B, k, col, u, y0, d, r1, r2, h, seg = 14) => {
        const w = X(u, 0, d);
        B.cyl(k, col, w[0], y0, w[2], r1, r2, h, seg);
      },
      plane: (parent, mat, u, y, d, w, h, facing) => {
        const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, h)), mat);
        m.position.set(...(X(u, y, d) as [number, number, number]));
        if (facing === "street") m.rotation.y = (-s * Math.PI) / 2;
        else if (facing === "-u") m.rotation.y = Math.PI;
        else if (facing === "up") m.rotation.x = -Math.PI / 2;
        parent.add(m);
        return m;
      },
      outer: outerAll,
      inner,
      anim,
      keep,
      font: o.font,
      R: rng(7 + i * 131),
      surfaces: o.surfaces,
    };

    /* ---------- the shell: floor, walls, ceiling and the shop front ---------- */
    const { bx } = c;
    const H = SHOP.floor;
    bx(ext, T.floorKind, T.floor, 0, 0.01, 9, 23.4, 0.04, 17.6);
    bx(ext, "matte", T.ceil, 0, H - 0.03, 9, 23.4, 0.06, 17.6);
    bx(ext, "matte", T.wall, -11.85, H / 2, 9, 0.3, H, 18);
    bx(ext, "matte", T.wall, 11.85, H / 2, 9, 0.3, H, 18);
    bx(ext, "matte", T.wall, 0, H / 2, 17.85, 24, H, 0.3);
    const fk: Surface = T.base === 0x26292d || T.base === 0x2c3238 ? "gloss" : "matte";
    for (const sx of [-1, 1]) {
      bx(ext, fk, T.base, sx * 11.25, H / 2, 0.175, 1.5, H, 0.35);
      bx(ext, fk, T.base, sx * 2, 1.5, 0.175, 1.2, 3.0, 0.35);
      bx(ext, fk, T.base, sx * 6.55, 0.25, 0.175, 7.9, 0.5, 0.35);
      bx(ext, fk, T.base, sx * 2, 3.65, 0.175, 1.2, 1.3, 0.35);
      /* the shop window: glass in a slim frame, with mullions */
      bx(ext, "glass", 0xd6e6ea, sx * 6.55, 2.4, 0.18, 7.9, 3.8, 0.03);
      bx(ext, "satin", T.frame, sx * 6.55, 0.53, 0.05, 8.0, 0.08, 0.12);
      bx(ext, "satin", T.frame, sx * 6.55, 4.27, 0.05, 8.0, 0.08, 0.12);
      for (const mu of [2.62, 6.55, 10.48]) bx(ext, "satin", T.frame, sx * mu, 2.4, 0.05, 0.08, 3.8, 0.12);
      /* the sill outside */
      bx(ext, "satin", 0xb9b2a5, sx * 6.55, 0.52, -0.08, 8.1, 0.05, 0.22);
    }
    bx(ext, fk, T.base, 0, 3.65, 0.175, 2.8, 1.3, 0.35);
    bx(ext, fk, T.base, 0, 4.95, 0.175, 24, 1.3, 0.35);
    /* a step and the threshold */
    bx(ext, "satin", 0x9b9790, 0, 0.03, -0.35, 3.4, 0.06, 0.7);
    /* the upper floors */
    const upper = new THREE.Mesh(keep(new THREE.BoxGeometry(18, T.h - H, 24)), keep(facadeMaterial(T.upper)));
    upper.position.set(...(X(0, (T.h + H) / 2, 9) as [number, number, number]));
    upper.castShadow = upper.receiveShadow = o.shadows;
    outerAll.add(upper);
    bx(ext, "satin", T.upper.frame, 0, T.h + 0.35, 9, 24.3, 0.7, 18.3);
    bx(ext, "satin", T.upper.frame, 0, H + 0.12, 8.95, 24.2, 0.24, 18.2);

    /* the floor, with its own pattern; skirting and pilasters along the walls */
    const floorTex = keep(floorTexture(T.pattern, T.floor));
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(17.6 / 2, 23.4 / 2);
    const floorMat = keep(
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: T.floorKind === "gloss" ? 0.22 : T.pattern === "planks" ? 0.45 : 0.7, envMapIntensity: 0.6 }),
    );
    c.plane(outerAll, floorMat, 0, 0.032, 9, 17.6, 23.4, "up").receiveShadow = o.shadows;
    const trim = new THREE.Color(T.wall).multiplyScalar(0.72);
    for (const sx of [-1, 1]) {
      bx(ext, "satin", trim, sx * 11.66, 0.07, 9, 0.04, 0.14, 17.3);
      for (const pd of [4.2, 8.4, 12.6]) bx(ext, "matte", T.wall, sx * 11.62, H / 2, pd, 0.16, H, 0.5);
    }
    bx(ext, "satin", trim, 0, 0.07, 17.66, 23.3, 0.14, 0.04);

    /* lit ceiling panels inside */
    for (const pu of [-8.5, -3, 3, 8.5]) for (const pd of [4, 9, 14]) bx(ext, "glow", T.panel, pu, H - 0.07, pd, 2.4, 0.03, 0.5);

    /* the sign over the door */
    const signTex = keep(signTexture(p.name, T.sign, o.font));
    const signMat = keep(new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.2, roughness: 0.55 }));
    c.plane(outerAll, signMat, 0, 4.95, -0.02, 9.6, 1.2, "street");

    /* the screen on the back wall, with the project on it */
    const screenTex = keep(screenTexture(p, i, projects.length, o.font));
    const screen = keep(new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, color: new THREE.Color(0.9, 0.9, 0.9) }));
    c.plane(inner, screen, -0.6, 2.75, 17.6, 7.2, 4.05, "street");
    bx(int, "satin", 0x111214, -0.6, 2.75, 17.66, 7.36, 4.2, 0.06);

    /* sliding glass doors */
    const doors = [-1, 1].map((sx) => {
      const g = new THREE.Group();
      const b = new Batch(o.surfaces);
      b.box("satin", T.frame, [0, 1.5, 0.66 * sx], [0.06, 3.0, 0.08]);
      b.box("satin", T.frame, [0, 1.5, -0.66 * sx], [0.06, 3.0, 0.08]);
      b.box("satin", T.frame, [0, 0.06, 0], [0.06, 0.12, 1.4]);
      b.box("satin", T.frame, [0, 2.95, 0], [0.06, 0.1, 1.4]);
      b.box("glass", 0xd6e6ea, [0, 1.5, 0], [0.02, 2.8, 1.24]);
      b.box("metal", 0xc9c9c9, [-s * 0.06, 1.1, -0.55 * sx], [0.03, 0.9, 0.03]);
      b.build(g, { cast: false, receive: o.shadows });
      g.userData.u = sx;
      outerAll.add(g);
      return g;
    });

    DECOR[p.id](c, T);
    int.build(inner, { cast: false, receive: o.shadows });
    shops.push({ z, s, inner, doors, screen, sign: signMat, neon: T.sign.text === "neon" });
  });
  ext.build(outerAll, { cast: o.shadows, receive: o.shadows });

  /* two lights that move into whichever building he is in */
  const lights = Array.from({ length: Math.max(1, Math.min(2, o.lights)) }, () => {
    const l = new THREE.PointLight(0xffe2bf, 40, 26, 2);
    scene.add(l);
    return l;
  });

  const tmp = new THREE.Vector3();
  return {
    update(t, dt, night, char) {
      let best = -1;
      let bestD = Infinity;
      shops.forEach((sh, i) => {
        const near = Math.abs(char.z - sh.z);
        sh.inner.visible = near < 30;
        if (near < bestD) {
          bestD = near;
          best = i;
        }
        const door = tmp.set(sh.s * LINE, 0, sh.z);
        const dd = Math.hypot(char.x - door.x, char.z - door.z);
        const open = 1 - THREE.MathUtils.smoothstep(dd, 1.4, 4.2);
        for (const g of sh.doors) {
          const u = g.userData.u as number;
          g.position.set(sh.s * (LINE + 0.42), 0, sh.z + u * (0.7 + open * 1.35));
        }
        sh.sign.emissiveIntensity = (sh.neon ? 0.9 : 0.2) + night * 1.2;
      });
      const sh = shops[best];
      const theme = THEMES[projects[best].id];
      lights.forEach((l, k) => {
        const u = lights.length === 1 ? 1 : k === 0 ? -5 : 5;
        const d = lights.length === 1 ? 9 : k === 0 ? 6 : 12;
        l.position.set(sh.s * (LINE + d), 4.7, sh.z + u);
        l.color.set(theme.light);
        l.intensity = bestD < 30 ? (lights.length === 1 ? 70 : 40) : 0;
      });
      for (const a of anim) a(t, dt, night);
    },
    dispose() {
      for (const d of disposables) d.dispose();
      for (const g of [outerAll, ...shops.map((s) => s.inner)]) g.traverse((obj) => (obj as THREE.Mesh).geometry?.dispose());
      lights.forEach((l) => l.dispose());
    },
  };
}

/* ---------- furniture and props, shared between shops ---------- */

function chair(c: Ctx, B: Batch, u: number, d: number, color: number, face: "+u" | "-u" | "+d" | "-d") {
  const { bx } = c;
  bx(B, "satin", color, u, 0.46, d, 0.46, 0.05, 0.46);
  const bu = face === "+u" ? -0.21 : face === "-u" ? 0.21 : 0;
  const bd = face === "+d" ? -0.21 : face === "-d" ? 0.21 : 0;
  bx(B, "satin", color, u + bu, 0.72, d + bd, bu ? 0.05 : 0.46, 0.5, bd ? 0.05 : 0.46);
  for (const a of [-0.19, 0.19]) for (const b of [-0.19, 0.19]) bx(B, "metal", 0x2a2a2a, u + a, 0.22, d + b, 0.035, 0.44, 0.035);
}

function roundTable(c: Ctx, B: Batch, u: number, d: number, r: number, top: number, leg: number) {
  c.cy(B, "satin", top, u, 0.72, d, r, r, 0.04, 24);
  c.cy(B, "metal", leg, u, 0.02, d, 0.04, 0.04, 0.7, 8);
  c.cy(B, "metal", leg, u, 0.0, d, 0.22, 0.24, 0.03, 16);
}

function plant(c: Ctx, B: Batch, u: number, d: number, k = 1, pot = 0x8a8278) {
  c.cy(B, "matte", pot, u, 0, d, 0.26 * k, 0.2 * k, 0.5 * k, 14);
  for (let n = 0; n < 5; n++) {
    const a = n * 1.3;
    B.add(new THREE.IcosahedronGeometry(0.28 * k, 1), "matte", 0x4f6b3a, {
      p: c.X(u + Math.cos(a) * 0.18 * k, (0.75 + (n % 3) * 0.28) * k, d + Math.sin(a) * 0.18 * k),
    });
  }
}

function pendant(c: Ctx, B: Batch, u: number, d: number, y: number, shade: number) {
  const { bx } = c;
  bx(B, "metal", 0x222222, u, (SHOP.floor + y) / 2, d, 0.015, SHOP.floor - y, 0.015);
  c.cy(B, "satin", shade, u, y - 0.25, d, 0.06, 0.3, 0.28, 18);
  B.add(new THREE.SphereGeometry(0.08, 10, 8), "glow", new THREE.Color(2.2, 1.8, 1.3), { p: c.X(u, y - 0.26, d) });
}

function sofa(c: Ctx, B: Batch, u: number, d: number, len: number, color: number, face: "+u" | "-u") {
  const { bx } = c;
  const back = face === "+u" ? -0.4 : 0.4;
  bx(B, "matte", color, u, 0.22, d, 0.95, 0.3, len);
  bx(B, "matte", color, u + back, 0.62, d, 0.2, 0.55, len);
  const n = Math.max(1, Math.round(len / 0.9));
  for (let k = 0; k < n; k++) {
    const cd = d - len / 2 + (len / n) * (k + 0.5);
    bx(B, "matte", color, u - back * 0.15, 0.45, cd, 0.68, 0.16, len / n - 0.04);
  }
  for (const e of [-1, 1]) bx(B, "matte", color, u, 0.42, d + e * (len / 2 + 0.1), 0.95, 0.42, 0.2);
}

function shelves(c: Ctx, B: Batch, u0: number, u1: number, d0: number, d1: number, y1: number, rows: number, wood: number, fill: (B: Batch, u: number, y: number, d: number, along: "u" | "d", len: number) => void) {
  const { bx } = c;
  const alongU = Math.abs(u1 - u0) > Math.abs(d1 - d0);
  const len = alongU ? Math.abs(u1 - u0) : Math.abs(d1 - d0);
  const cu = (u0 + u1) / 2;
  const cd = (d0 + d1) / 2;
  const depth = 0.35;
  for (let r = 0; r <= rows; r++) {
    const y = 0.1 + (r * (y1 - 0.1)) / rows;
    bx(B, "satin", wood, cu, y, cd, alongU ? len : depth, 0.04, alongU ? depth : len);
    if (r < rows) fill(B, alongU ? u0 : cu, y + 0.02, alongU ? cd : d0, alongU ? "u" : "d", len);
  }
  for (const e of [0, 1]) {
    const uu = alongU ? (e ? u1 : u0) : cu;
    const dd = alongU ? cd : e ? d1 : d0;
    bx(B, "satin", wood, uu, y1 / 2 + 0.05, dd, alongU ? 0.04 : depth, y1, alongU ? depth : 0.04);
  }
}

const BOOK_COLS = [0x8e2f2a, 0x24456b, 0xd9c08a, 0x3e6b4a, 0xe8e2d4, 0x5a3b62, 0xc46a3a, 0x1f1f22, 0x9fb7c9, 0xb8873b];

function books(c: Ctx) {
  return (B: Batch, u: number, y: number, d: number, along: "u" | "d", len: number) => {
    let x = 0.03;
    while (x < len - 0.06) {
      const w = 0.025 + c.R() * 0.04;
      const h = 0.2 + c.R() * 0.12;
      const col = BOOK_COLS[Math.floor(c.R() * BOOK_COLS.length)];
      if (c.R() < 0.06) {
        x += 0.1;
        continue;
      }
      if (along === "u") c.bx(B, "satin", col, u + x + w / 2, y + h / 2, d, w, h, 0.22);
      else c.bx(B, "satin", col, u, y + h / 2, d + x + w / 2, 0.22, h, w);
      x += w + 0.004;
    }
  };
}

function mannequin(c: Ctx, B: Batch, u: number, d: number, dress: number) {
  const p = (y: number) => c.X(u, y, d);
  c.cy(B, "metal", 0x222222, u, 0, d, 0.18, 0.2, 0.03, 16);
  c.cy(B, "metal", 0x222222, u, 0.03, d, 0.015, 0.015, 0.9, 6);
  B.add(new THREE.CylinderGeometry(0.17, 0.32, 0.75, 18), "matte", dress, { p: p(1.05) });
  B.add(new THREE.CapsuleGeometry(0.15, 0.32, 4, 12), "matte", dress, { p: p(1.52), s: [1, 1, 0.65] });
  B.add(new THREE.SphereGeometry(0.1, 14, 10), "gloss", 0xe9e5dd, { p: p(1.95), s: [0.85, 1, 0.9] });
  c.cy(B, "gloss", 0xe9e5dd, u, 1.76, d, 0.04, 0.045, 0.12, 8);
}

/* ---------- each shop's own decor ---------- */

const DECOR: Record<Project["id"], (c: Ctx, T: Theme) => void> = {
  /* finance: dark granite, a stock ticker band, an open office of trading desks */
  villagewellth(c) {
    const { bx, int, ext } = c;
    const tick = c.keep(tickerTexture(c.font));
    tick.wrapS = THREE.RepeatWrapping;
    const tickMat = c.keep(new THREE.MeshBasicMaterial({ map: tick, toneMapped: false, color: new THREE.Color(1.1, 1.1, 1.1) }));
    c.plane(c.outer, tickMat, 0, 6.15, -0.1, 24, 0.7, "street");
    bx(ext, "satin", 0x0d0e10, 0, 6.15, -0.05, 24.2, 0.84, 0.1);
    c.anim.push((_, dt) => {
      tick.offset.x = (tick.offset.x + dt * 0.03) % 1;
    });
    for (const pu of [-7, 7]) {
      bx(ext, "satin", 0x2e3135, pu, 0.35, -1.0, 1.2, 0.7, 1.2);
      plant(c, ext, pu, -1.0, 1.3, 0x2e3135);
    }
    const chart = c.keep(chartTexture());
    const mon = c.keep(new THREE.MeshBasicMaterial({ map: chart, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) }));
    for (const du of [-9.6, -6.6]) {
      for (const dd of [3.6, 7.2, 10.8, 14.4]) {
        bx(int, "satin", 0xe9e6e0, du, 0.74, dd, 1.5, 0.04, 3.0);
        for (const e of [-1, 1]) bx(int, "metal", 0x2a2c2f, du, 0.37, dd + e * 1.4, 1.3, 0.72, 0.04);
        for (const e of [-0.7, 0.7]) {
          bx(int, "satin", 0x18191b, du - 0.35, 1.06, dd + e, 0.03, 0.38, 0.62);
          bx(int, "metal", 0x2a2c2f, du - 0.35, 0.86, dd + e, 0.03, 0.2, 0.04);
          c.plane(c.inner, mon, du - 0.33, 1.06, dd + e, 0.58, 0.34, "+u");
          chair(c, int, du + 0.6, dd + e, 0x2b2d31, "-u");
        }
      }
    }
    /* the meeting corner and plants */
    roundTable(c, int, 9.2, 12.5, 0.6, 0xe9e6e0, 0x2a2c2f);
    for (const a of [0, 1.6, 3.2, 4.8]) chair(c, int, 9.2 + Math.cos(a) * 0.95, 12.5 + Math.sin(a) * 0.95, 0x2b2d31, "+d");
    plant(c, int, 10.8, 16.6, 1.6);
    plant(c, int, -10.9, 1.2, 1.4);
    /* by the screen: tall plants, a credenza and clocks for the markets */
    plant(c, int, 6.8, 16.9, 1.9);
    plant(c, int, -5.2, 16.9, 1.6);
    bx(int, "satin", 0x2a2c30, -8.4, 0.4, 17.3, 4.4, 0.8, 0.6);
    bx(int, "satin", 0xb08659, -8.4, 0.82, 17.3, 4.5, 0.04, 0.64);
    for (let k = 0; k < 3; k++) {
      const p = c.X(-10 + k * 1.6, 3.4, 17.62);
      int.add(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 32), "satin", 0xf4f2ec, { p, r: [0, 0, Math.PI / 2] });
      int.add(new THREE.TorusGeometry(0.42, 0.035, 8, 32), "metal", 0x222326, { p, r: [0, Math.PI / 2, 0] });
      int.add(new THREE.BoxGeometry(0.03, 0.3, 0.025), "satin", 0x18191b, { p: c.X(-10 + k * 1.6, 3.45, 17.57), r: [k * 0.9 + 0.4, 0, 0] });
    }
  },

  /* publishing: a print house with tenants' banners on the front and a press inside */
  sahefa(c) {
    const { bx, int, ext } = c;
    const banners = [0xd2553f, 0x2f6f8f, 0xe0b440, 0x3f7a4f, 0x7a4d8f, 0xe07a4a];
    banners.forEach((col, k) => {
      const u = -9.5 + k * 3.8;
      bx(ext, "metal", 0x222222, u, 11.4, -0.5, 0.05, 0.05, 1.0);
      bx(ext, "matte", col, u, 9.4, -0.95, 1.1, 3.8, 0.04);
      bx(ext, "matte", 0xf2ebd9, u, 10.3, -0.98, 0.5, 0.5, 0.02);
    });
    /* a newspaper stand by the door */
    bx(ext, "satin", 0x203a30, -5.5, 0.6, -1.0, 1.4, 1.2, 0.6);
    for (let k = 0; k < 4; k++) bx(ext, "matte", 0xf0ebe0, -6.05 + k * 0.36, 1.25 + (k % 2) * 0.04, -1.0, 0.32, 0.02, 0.45);
    /* the press: a long machine with rollers and a web of paper running through it */
    bx(int, "satin", 0x2f4a3f, -8.4, 0.75, 9, 2.0, 1.5, 9.0);
    for (let k = 0; k < 6; k++) {
      const d = 5.2 + k * 1.5;
      int.add(new THREE.CylinderGeometry(0.32, 0.32, 1.8, 20), "metal", 0x9ea3a8, { p: c.X(-8.4, 1.82, d), r: [Math.PI / 2, 0, 0] });
      bx(int, "satin", 0x24382f, -9.45, 1.7, d, 0.1, 0.9, 0.5);
      bx(int, "satin", 0x24382f, -7.35, 1.7, d, 0.1, 0.9, 0.5);
    }
    bx(int, "matte", 0xf4f1e8, -8.4, 2.16, 9, 1.6, 0.012, 8.4);
    for (let k = 0; k < 5; k++) bx(int, "matte", 0xf0ece2, -8.4 + (k % 2) * 0.1, 0.06 + k * 0.1, 3.0, 1.2, 0.1, 0.85);
    /* racks of finished papers and a long editing table */
    shelves(c, int, 11.4, 11.4, 6, 16.5, 2.4, 5, 0x4a3524, (B, u, y, d, _a, len) => {
      for (let x = 0.2; x < len - 0.3; x += 0.55) c.bx(B, "matte", c.R() < 0.5 ? 0xf3efe6 : 0xe7dfcd, u, y + 0.06 + c.R() * 0.03, d + x + 0.25, 0.3, 0.12 + c.R() * 0.06, 0.45);
    });
    bx(int, "satin", 0x6b4a32, -4.5, 0.74, 14, 1.0, 0.05, 4.0);
    for (const e of [-1.8, 1.8]) bx(int, "metal", 0x222222, -4.5, 0.37, 14 + e, 0.9, 0.72, 0.05);
    for (const e of [-1, 0, 1]) bx(int, "satin", 0x1c1c1e, -4.5, 0.78, 14 + e * 1.2, 0.34, 0.02, 0.24);
    for (const pd of [4, 9, 14]) pendant(c, int, -2.5, pd, 3.4, 0x1f3a2f);
    /* front pages framed on the back wall, and bundles ready to go */
    const page = c.keep(frontPageTexture(c.font));
    const pageMat = c.keep(new THREE.MeshStandardMaterial({ map: page, roughness: 0.8 }));
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 3; k++) {
        c.plane(c.inner, pageMat, -10 + k * 1.9, 2.2 + r * 1.9, 17.6, 1.3, 1.65, "street");
        bx(int, "satin", 0x1c1c1c, -10 + k * 1.9, 2.2 + r * 1.9, 17.65, 1.42, 1.77, 0.04);
      }
    for (let k = 0; k < 4; k++) bx(int, "matte", 0xeee8da, 6.6 + (k % 2) * 0.62, 0.22 + Math.floor(k / 2) * 0.44, 16.9, 0.55, 0.42, 0.42);
  },

  /* furniture: a stone front with arches and a showroom of sofas, rugs and lamps, with the till */
  diwan(c) {
    const { bx, int, ext } = c;
    for (const sx of [-1, 1]) {
      ext.add(new THREE.TorusGeometry(3.95, 0.28, 10, 32, Math.PI), "matte", 0xbfae8c, {
        p: c.X(sx * 6.55, 4.3, -0.1),
        r: [0, (-c.s * Math.PI) / 2, 0],
        s: [1, 0.55, 1],
      });
    }
    const rug = c.keep(rugTexture());
    const rugMat = c.keep(new THREE.MeshStandardMaterial({ map: rug, roughness: 0.95 }));
    c.plane(c.inner, rugMat, -7.8, 0.035, 8.5, 4.6, 6.2, "up");
    sofa(c, int, -10.4, 8.5, 4.4, 0x7f8a6c, "+u");
    sofa(c, int, -8.0, 12.6, 2.2, 0x7f8a6c, "-u");
    bx(int, "satin", 0x4a3424, -7.6, 0.38, 8.5, 1.1, 0.06, 2.0);
    for (const e of [-0.9, 0.9]) bx(int, "satin", 0x4a3424, -7.6, 0.18, 8.5 + e, 1.0, 0.36, 0.06);
    /* armchairs and floor lamps */
    for (const [u, d] of [
      [-6.0, 5.0],
      [-6.0, 12.0],
    ]) {
      bx(int, "matte", 0x2f5d62, u, 0.25, d, 0.9, 0.36, 0.9);
      bx(int, "matte", 0x2f5d62, u + 0.36, 0.65, d, 0.18, 0.55, 0.9);
      for (const e of [-1, 1]) bx(int, "matte", 0x2f5d62, u, 0.48, d + e * 0.4, 0.9, 0.3, 0.12);
    }
    for (const [u, d] of [
      [-11.1, 5.6],
      [-11.1, 11.6],
    ]) {
      c.cy(int, "metal", 0x8c6b3a, u, 0, d, 0.02, 0.02, 1.6, 6);
      c.cy(int, "satin", 0xf0e2c4, u, 1.5, d, 0.18, 0.26, 0.32, 16);
      int.add(new THREE.SphereGeometry(0.07, 8, 6), "glow", new THREE.Color(2, 1.7, 1.2), { p: c.X(u, 1.58, d) });
    }
    /* the till: a counter with the point-of-sale terminal */
    bx(int, "satin", 0x4a3424, 9.6, 0.55, 13.5, 1.0, 1.1, 3.2);
    bx(int, "satin", 0xe8dfcf, 9.6, 1.12, 13.5, 1.1, 0.04, 3.3);
    bx(int, "satin", 0x1a1a1a, 9.4, 1.36, 13.0, 0.06, 0.3, 0.42);
    bx(int, "glow", new THREE.Color(0.7, 0.85, 1.0), 9.36, 1.36, 13.0, 0.01, 0.26, 0.38);
    pendant(c, int, 9.6, 12.6, 3.0, 0xd9b46a);
    pendant(c, int, 9.6, 14.4, 3.0, 0xd9b46a);
    /* window displays */
    bx(ext, "matte", 0xa65a3d, -6.5, 0.6, 1.4, 1.0, 0.4, 0.9);
    bx(ext, "matte", 0xa65a3d, -6.1, 0.95, 1.4, 0.2, 0.5, 0.9);
    bx(ext, "matte", 0x7f8a6c, 8.6, 0.6, 1.4, 1.0, 0.4, 0.9);
    bx(ext, "matte", 0x7f8a6c, 9.0, 0.95, 1.4, 0.2, 0.5, 0.9);
    plant(c, int, 10.9, 4.0, 1.4);
    /* a sideboard with vases under a framed print, and a reading lamp by the screen */
    bx(int, "satin", 0x4a3424, -8.0, 0.42, 17.25, 4.0, 0.84, 0.7);
    for (const [u, h, col] of [
      [-9.4, 0.5, 0x2f5d62],
      [-8.6, 0.32, 0xd9b46a],
      [-6.8, 0.42, 0xe9e2d4],
    ] as const)
      c.cy(int, "gloss", col, u, 0.84, 17.2, 0.1, 0.13, h, 16);
    bx(int, "satin", 0xc49a5a, -8.0, 2.6, 17.64, 3.0, 1.9, 0.05);
    bx(int, "matte", 0x8c5a3c, -8.0, 2.6, 17.6, 2.6, 1.5, 0.04);
    bx(int, "matte", 0xd9b46a, -8.5, 2.75, 17.57, 0.9, 0.9, 0.02);
    c.cy(int, "metal", 0x8c6b3a, 7.0, 0, 16.6, 0.02, 0.02, 1.6, 6);
    c.cy(int, "satin", 0xf0e2c4, 7.0, 1.5, 16.6, 0.18, 0.26, 0.32, 16);
    sofa(c, int, 9.4, 16.6, 2.4, 0xb08a5a, "-u");
  },

  /* restaurant: an awning, tables on the pavement, olive trees, and a time clock for the staff */
  oliva(c) {
    const { bx, int, ext } = c;
    const stripes = c.keep(stripeTexture());
    const awn = c.keep(new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.85, side: THREE.DoubleSide }));
    for (const sx of [-1, 1]) {
      const m = c.plane(c.outer, awn, sx * 6.55, 3.6, -0.8, 7.9, 1.9, "street");
      m.rotateX(-0.6);
      m.castShadow = true;
      bx(ext, "matte", 0x2f4a33, sx * 6.55, 2.75, -1.36, 7.9, 0.22, 0.03);
    }
    for (const [u, d] of [
      [-6.5, -1.7],
      [7.2, -1.7],
    ]) {
      roundTable(c, ext, u, d, 0.38, 0xf0ece4, 0x2a2a2a);
      chair(c, ext, u - 0.75, d, 0x2f4a33, "+u");
      chair(c, ext, u + 0.75, d, 0x2f4a33, "-u");
    }
    for (const u of [-3.4, 3.4]) {
      c.cy(ext, "matte", 0xa8573a, u, 0, -0.7, 0.36, 0.28, 0.6, 16);
      c.cy(ext, "matte", 0x5a4632, u, 0.6, -0.7, 0.05, 0.07, 1.0, 6);
      for (let n = 0; n < 6; n++) {
        const a = n * 1.1;
        ext.add(new THREE.IcosahedronGeometry(0.36, 1), "matte", 0x7f8c5e, { p: c.X(u + Math.cos(a) * 0.3, 1.75 + (n % 3) * 0.2, -0.7 + Math.sin(a) * 0.3) });
      }
    }
    /* wainscot, tables, the bar and its bottles */
    bx(int, "satin", 0x2f4a33, -11.66, 0.55, 9, 0.04, 1.1, 17);
    for (const [u, d] of [
      [-9.4, 4.0],
      [-6.4, 7.0],
      [-9.4, 10.0],
      [-6.4, 13.0],
    ]) {
      roundTable(c, int, u, d, 0.45, 0xf2ede4, 0x262626);
      chair(c, int, u - 0.8, d, 0x6b4a32, "+u");
      chair(c, int, u + 0.8, d, 0x6b4a32, "-u");
      int.add(new THREE.SphereGeometry(0.035, 8, 6), "glow", new THREE.Color(2.4, 1.6, 0.8), { p: c.X(u, 0.82, d) });
    }
    bx(int, "satin", 0x5a3d28, -7.6, 0.55, 16.3, 4.2, 1.1, 0.7);
    bx(int, "satin", 0xe5dccb, -7.6, 1.12, 16.3, 4.3, 0.05, 0.8);
    for (let r = 0; r < 3; r++) {
      bx(int, "satin", 0x5a3d28, -7.6, 1.6 + r * 0.55, 17.5, 4.2, 0.04, 0.3);
      for (let k = 0; k < 16; k++) {
        const col = [0x2f5a35, 0x6b1f22, 0xc9a24a, 0x2a3b2f][Math.floor(c.R() * 4)];
        c.cy(int, "gloss", col, -9.5 + k * 0.25, 1.63 + r * 0.55, 17.5, 0.035, 0.04, 0.3, 8);
      }
    }
    for (const u of [-9.1, -7.6, -6.1]) {
      c.cy(int, "metal", 0x262626, u, 0, 15.5, 0.03, 0.03, 0.75, 6);
      c.cy(int, "satin", 0x6b4a32, u, 0.75, 15.5, 0.2, 0.2, 0.05, 14);
    }
    plant(c, int, 7.2, 16.8, 1.5, 0xa8573a);
    /* the staff time clock by the screen, and a wall clock */
    bx(int, "satin", 0x1d1d1f, 6.4, 1.45, 17.62, 0.42, 0.55, 0.12);
    bx(int, "glow", new THREE.Color(0.75, 1.1, 0.8), 6.4, 1.52, 17.55, 0.32, 0.22, 0.01);
    const clockC = c.X(-11.6, 3.4, 8);
    int.add(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), "satin", 0xf6f2ea, { p: clockC, r: [0, 0, Math.PI / 2] });
    int.add(new THREE.TorusGeometry(0.42, 0.03, 8, 32), "satin", 0x2f4a33, { p: clockC, r: [0, Math.PI / 2, 0] });
    for (const pd of [4, 8, 12]) pendant(c, int, -7.9, pd, 3.0, 0x2f4a33);
  },

  /* checkpoint status: limestone, a traffic signal and a lifted barrier, a route map, a live board inside */
  watan(c) {
    const { bx, int, ext } = c;
    const map = c.keep(mapTexture(c.font));
    const mapMat = c.keep(new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.7 }));
    c.plane(c.outer, mapMat, 0, 9.6, -0.04, 13, 6.5, "street");
    bx(ext, "satin", 0x2d3a33, 0, 9.6, -0.01, 13.4, 6.9, 0.04);
    /* the signal: red and amber dark, green lit */
    c.cy(ext, "metal", 0x2b2f33, -4.6, 0, -1.4, 0.07, 0.08, 3.2, 10);
    bx(ext, "satin", 0x1b1d20, -4.6, 3.55, -1.4, 0.36, 1.1, 0.3);
    const lamps: [number, THREE.Color][] = [
      [3.9, new THREE.Color(0.25, 0.04, 0.03)],
      [3.55, new THREE.Color(0.28, 0.18, 0.03)],
      [3.2, new THREE.Color(0.3, 2.4, 0.9)],
    ];
    for (const [y, col] of lamps) ext.add(new THREE.SphereGeometry(0.11, 12, 8), "glow", col, { p: c.X(-4.6, y, -1.57) });
    /* the barrier arm, raised */
    bx(ext, "satin", 0xe8e4da, -6.4, 0.55, -1.5, 0.4, 1.1, 0.4);
    for (let k = 0; k < 6; k++) {
      const a = 1.15;
      const len = 0.75;
      const r = k * len + len / 2;
      ext.add(new THREE.BoxGeometry(0.08, 0.1, len), "satin", k % 2 ? 0xe8e4da : 0xc8322b, {
        p: c.X(-6.4 - Math.cos(a) * r, 1.1 + Math.sin(a) * r, -1.5),
        r: [a, 0, 0],
      });
    }
    /* the map table and benches */
    bx(int, "satin", 0x3b3a36, -8.2, 0.45, 9, 3.2, 0.9, 6.0);
    c.plane(c.inner, mapMat, -8.2, 0.91, 9, 6.0, 3.2, "up").rotation.z = (c.s * Math.PI) / 2;
    for (const u of [-11.0, -5.4]) bx(int, "satin", 0x6b4a32, u, 0.45, 9, 0.45, 0.06, 5.0);
    /* the live board on the side wall */
    const board = c.keep(boardTexture(c.font));
    const boardMat = c.keep(new THREE.MeshBasicMaterial({ map: board, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) }));
    c.plane(c.inner, boardMat, -8.0, 3.0, 17.6, 5.0, 2.5, "street");
    bx(int, "satin", 0x111214, -8.0, 3.0, 17.66, 5.14, 2.64, 0.06);
    plant(c, int, -10.9, 15.8, 1.6);
    plant(c, int, 10.9, 3.0, 1.4);
    plant(c, int, 6.9, 16.9, 1.8);
    plant(c, int, -4.9, 16.9, 1.5);
    for (const u of [-9.6, -6.4]) bx(int, "satin", 0x6b4a32, u, 0.45, 15.6, 2.4, 0.06, 0.5);
  },

  /* books: the front is a wall of giant spines, the inside lined with shelves and reading chairs */
  carebooks(c) {
    const { bx, int, ext } = c;
    let u = -11.8;
    while (u < 11.6) {
      const w = 0.45 + c.R() * 0.55;
      const h = 2.6 + c.R() * 1.0;
      const col = BOOK_COLS[Math.floor(c.R() * BOOK_COLS.length)];
      for (const y0 of [5.9, 9.8]) {
        const hh = Math.min(h, 3.7);
        bx(ext, "satin", col, u + w / 2, y0 + hh / 2, -0.18, w - 0.04, hh, 0.36);
        bx(ext, "satin", 0xc8a25a, u + w / 2, y0 + hh * 0.82, -0.37, w - 0.04, 0.06, 0.02);
      }
      u += w;
    }
    bx(ext, "satin", 0x6b4a32, 0, 9.65, -0.2, 24, 0.12, 0.45);
    bx(ext, "satin", 0x6b4a32, 0, 13.55, -0.2, 24, 0.12, 0.45);
    const fill = books(c);
    shelves(c, int, -11.4, -11.4, 1.0, 16.8, 3.6, 7, 0x5a3d28, fill);
    shelves(c, int, -11.2, -4.6, 17.4, 17.4, 3.6, 7, 0x5a3d28, fill);
    shelves(c, int, 3.6, 11.2, 17.4, 17.4, 3.6, 7, 0x5a3d28, fill);
    shelves(c, int, 11.4, 11.4, 8.0, 16.8, 3.6, 7, 0x5a3d28, fill);
    /* reading corner */
    const rug = c.keep(rugTexture());
    const rugMat = c.keep(new THREE.MeshStandardMaterial({ map: rug, roughness: 0.95 }));
    c.plane(c.inner, rugMat, -7.5, 0.035, 9, 4.0, 4.0, "up");
    for (const [cu, cd, f] of [
      [-8.6, 7.8, 1],
      [-6.4, 10.2, -1],
    ] as const) {
      bx(int, "matte", 0x8e2f2a, cu, 0.25, cd, 0.85, 0.36, 0.85);
      bx(int, "matte", 0x8e2f2a, cu - f * 0.34, 0.68, cd, 0.18, 0.6, 0.85);
      for (const e of [-1, 1]) bx(int, "matte", 0x8e2f2a, cu, 0.5, cd + e * 0.38, 0.85, 0.32, 0.12);
    }
    roundTable(c, int, -7.5, 9, 0.4, 0x5a3d28, 0x2a2a2a);
    int.add(new THREE.BoxGeometry(0.2, 0.02, 0.28), "matte", 0xf3ede0, { p: c.X(-7.5, 0.77, 8.86), r: [0.2, 0, 0] });
    int.add(new THREE.BoxGeometry(0.2, 0.02, 0.28), "matte", 0xf3ede0, { p: c.X(-7.5, 0.77, 9.14), r: [-0.2, 0, 0] });
    /* a display table of new books */
    bx(int, "satin", 0x5a3d28, -4.6, 0.4, 4.0, 1.4, 0.8, 2.2);
    for (let k = 0; k < 8; k++) bx(int, "satin", BOOK_COLS[k % BOOK_COLS.length], -4.95 + (k % 2) * 0.7, 0.84 + Math.floor(k / 4) * 0.05, 3.3 + (k % 4) * 0.45, 0.5, 0.05, 0.36);
    for (const pd of [5, 9, 13]) pendant(c, int, -7.5, pd, 3.2, 0xc8a25a);
  },

  /* fashion: a white boutique with a neon sign, mannequins in the windows and racks of clothes */
  arvo(c) {
    const { bx, int, ext } = c;
    const garments = [0xe8d9c4, 0x2b2b2e, 0xb5523b, 0x6f7d5c, 0xd9a6a0, 0x3d4f6b, 0xf2efe8, 0x8a6f52];
    mannequin(c, ext, -6.5, 1.3, 0xb5523b);
    mannequin(c, ext, -4.4, 1.3, 0x2b2b2e);
    mannequin(c, ext, 8.4, 1.3, 0xd9a6a0);
    for (const ru of [-9.8, -6.6]) {
      c.cy(int, "metal", 0x1c1c1c, ru, 0, 4.0, 0.02, 0.02, 1.7, 6);
      c.cy(int, "metal", 0x1c1c1c, ru, 0, 13.5, 0.02, 0.02, 1.7, 6);
      int.add(new THREE.CylinderGeometry(0.02, 0.02, 9.5, 6), "metal", 0x1c1c1c, { p: c.X(ru, 1.7, 8.75), r: [0, 0, Math.PI / 2] });
      for (let d = 4.4; d < 13.2; d += 0.16 + c.R() * 0.1) {
        const col = garments[Math.floor(c.R() * garments.length)];
        const len = 0.75 + c.R() * 0.35;
        bx(int, "matte", col, ru, 1.65 - len / 2, d, 0.5, len, 0.05);
      }
    }
    /* bundles: folded stacks on a low table */
    bx(int, "satin", 0xe7e2da, -4.2, 0.35, 9.0, 1.4, 0.7, 3.0);
    for (let k = 0; k < 6; k++) {
      for (let h = 0; h < 4; h++) bx(int, "matte", garments[(k + h * 3) % garments.length], -4.5 + (k % 2) * 0.6, 0.74 + h * 0.07, 7.9 + Math.floor(k / 2) * 1.0, 0.45, 0.065, 0.55);
    }
    mannequin(c, int, -6.0, 16.4, 0x6f7d5c);
    mannequin(c, int, -8.0, 16.6, 0x3d4f6b);
    mannequin(c, int, 7.0, 16.6, 0xb5523b);
    /* a tall mirror */
    bx(int, "metal", 0xdfe3e6, 11.62, 1.4, 5.0, 0.03, 2.4, 1.0);
    bx(int, "satin", 0x1c1c1c, 11.66, 1.4, 5.0, 0.04, 2.5, 1.1);
    for (const [u, d] of [
      [-8, 5],
      [-8, 12],
      [-4.2, 9],
    ])
      int.add(new THREE.SphereGeometry(0.3, 18, 12), "glow", new THREE.Color(1.6, 1.52, 1.4), { p: c.X(u, 4.3, d) });
  },

  /* energy: solar panels and a turbine on the roof, energy-level bars on the front, a control room */
  sgsoft(c, T) {
    const { bx, int, ext } = c;
    const H = T.h;
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 6; k++) {
        ext.add(new THREE.BoxGeometry(2.8, 0.06, 3.2), "metal", 0x1d2c4a, {
          p: c.X(-8.5 + k * 3.4, H + 1.4, 3 + r * 3.6),
          r: [0, 0, c.s * 0.35],
        });
        bx(ext, "metal", 0x8a8f94, -8.5 + k * 3.4, H + 0.9, 3 + r * 3.6, 0.06, 1.0, 0.06);
      }
    }
    /* the wind turbine */
    const [tx, , tz] = c.X(8, 0, 14);
    ext.add(new THREE.CylinderGeometry(0.18, 0.3, 12, 12), "satin", 0xeef0f2, { p: [tx, H + 6.7, tz] });
    ext.add(new THREE.BoxGeometry(0.5, 0.5, 1.2), "satin", 0xeef0f2, { p: [tx, H + 12.8, tz] });
    const rotor = new THREE.Group();
    rotor.position.set(tx - c.s * 0.0, H + 12.8, tz + 0.7);
    const blades = new Batch(c.surfaces);
    for (let k = 0; k < 3; k++) {
      blades.add(new THREE.BoxGeometry(0.28, 4.6, 0.06), "satin", 0xf4f5f6, { p: [Math.sin((k * Math.PI * 2) / 3) * 2.4, Math.cos((k * Math.PI * 2) / 3) * 2.4, 0], r: [0, 0, (-k * Math.PI * 2) / 3] });
    }
    blades.add(new THREE.SphereGeometry(0.25, 12, 8), "satin", 0xeef0f2);
    blades.build(rotor, { cast: true });
    c.outer.add(rotor);
    c.anim.push((t) => {
      rotor.rotation.z = t * 1.4;
    });
    /* LED bars that show each floor's energy use */
    const barGeo = c.keep(new THREE.BoxGeometry(0.3, 1, 0.3));
    barGeo.translate(0, 0.5, 0);
    const barMat = c.keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.2, 1.1), toneMapped: false }));
    const bars = new THREE.InstancedMesh(barGeo, barMat, 6);
    const m4 = new THREE.Matrix4();
    const pos = Array.from({ length: 6 }, (_, k) => c.X(-9 + k * 3.6, 6.2, -0.2));
    c.outer.add(bars);
    for (let k = 0; k < 6; k++) bx(ext, "satin", 0x0d0f11, -9 + k * 3.6, 6.2 + (H - 7.5) / 2, -0.1, 0.44, H - 7.5, 0.2);
    c.anim.push((t) => {
      for (let k = 0; k < 6; k++) {
        const level = 0.35 + 0.3 * Math.sin(t * 0.6 + k * 1.7) + 0.15 * Math.sin(t * 1.9 + k);
        m4.makeScale(1, Math.max(0.5, level * (H - 7.6)), 1).setPosition(pos[k][0], pos[k][1], pos[k][2]);
        bars.setMatrixAt(k, m4);
      }
      bars.instanceMatrix.needsUpdate = true;
    });
    /* racks with blinking lights */
    for (let k = 0; k < 6; k++) {
      const d = 3.5 + k * 1.0;
      bx(int, "satin", 0x111315, -9.6, 1.05, d, 1.1, 2.1, 0.9);
      for (let r = 0; r < 8; r++) {
        const col = c.R() < 0.75 ? new THREE.Color(0.3, 1.8, 0.8) : new THREE.Color(0.4, 0.8, 2.0);
        bx(int, "glow", col, -9.04, 0.3 + r * 0.22, d - 0.25 + c.R() * 0.4, 0.01, 0.03, 0.08);
      }
    }
    for (let k = 0; k < 6; k++) {
      const d = 11 + k * 1.0;
      bx(int, "satin", 0x111315, -9.6, 1.05, d, 1.1, 2.1, 0.9);
      for (let r = 0; r < 8; r++) bx(int, "glow", new THREE.Color(0.3, 1.8, 0.8), -9.04, 0.3 + r * 0.22, d - 0.25 + c.R() * 0.4, 0.01, 0.03, 0.08);
    }
    /* meters on the side wall */
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 5; k++) {
        bx(int, "satin", 0xd9dde1, -10.6 + k * 1.15, 1.2 + r * 0.8, 17.6, 0.8, 0.55, 0.12);
        bx(int, "glow", new THREE.Color(0.5, 1.9, 1.0), -10.6 + k * 1.15, 1.32 + r * 0.8, 17.53, 0.5, 0.12, 0.01);
      }
    }
    bx(int, "metal", 0x6a7076, 0, 4.9, 9, 22, 0.08, 0.5);
    bx(int, "satin", 0x1b1e22, -4.5, 0.74, 12, 1.0, 0.05, 3.4);
    for (const e of [-1.5, 1.5]) bx(int, "metal", 0x1b1e22, -4.5, 0.37, 12 + e, 0.9, 0.72, 0.05);
    bx(int, "glow", new THREE.Color(0.4, 0.9, 1.6), -4.6, 1.05, 12, 0.03, 0.42, 0.75);
  },
};

/* ---------- textures ---------- */

function frontPageTexture(font: string) {
  return canvasTexture(256, 320, (g) => {
    g.fillStyle = "#f3efe4";
    g.fillRect(0, 0, 256, 320);
    g.fillStyle = "#1c1c1c";
    g.font = `700 30px Georgia, "Times New Roman", serif`;
    g.fillText("Sahefa", 64, 40);
    g.fillRect(16, 52, 224, 2);
    g.font = `600 18px ${font}`;
    g.fillText("Every tenant, its own paper", 16, 80);
    g.fillStyle = "#9a9284";
    g.fillRect(16, 96, 120, 90);
    for (let k = 0; k < 16; k++) {
      g.fillStyle = "#bdb6a8";
      g.fillRect(k < 6 ? 146 : 16, 100 + (k < 6 ? k * 14 : 96 + (k - 6) * 12), k < 6 ? 94 : 224, 5);
    }
  });
}

/** Floors, 2 m to a tile: oak planks, square tiles, polished concrete, terrazzo or stone slabs. */
function floorTexture(kind: Theme["pattern"], base: number) {
  const R = rng(base);
  const col = new THREE.Color(base);
  const hsl = { h: 0, s: 0, l: 0 };
  col.getHSL(hsl, THREE.SRGBColorSpace);
  const shade = (dl: number, ds = 0) => `hsl(${hsl.h * 360}, ${Math.max(0, hsl.s * 100 + ds)}%, ${Math.min(96, Math.max(4, hsl.l * 100 + dl))}%)`;
  return canvasTexture(512, 512, (g) => {
    g.fillStyle = shade(0);
    g.fillRect(0, 0, 512, 512);
    if (kind === "planks") {
      const w = 512 / 10;
      for (let k = 0; k < 10; k++) {
        let y = -R() * 200;
        while (y < 512) {
          const len = 160 + R() * 260;
          g.fillStyle = shade((R() - 0.5) * 9, (R() - 0.5) * 8);
          g.fillRect(k * w + 1, y + 1, w - 2, len - 2);
          /* grain */
          g.strokeStyle = shade(-6);
          g.globalAlpha = 0.25;
          for (let n = 0; n < 4; n++) {
            g.beginPath();
            const x = k * w + 6 + R() * (w - 12);
            g.moveTo(x, y + 4);
            g.bezierCurveTo(x + 4, y + len * 0.3, x - 4, y + len * 0.6, x + 2, y + len - 4);
            g.stroke();
          }
          g.globalAlpha = 1;
          y += len;
        }
      }
    } else if (kind === "tiles" || kind === "slab") {
      const n = kind === "tiles" ? 8 : 4;
      const w = 512 / n;
      for (let a = 0; a < n; a++)
        for (let b = 0; b < n; b++) {
          g.fillStyle = shade((R() - 0.5) * (kind === "tiles" ? 10 : 6));
          g.fillRect(a * w + 2, b * w + 2, w - 4, w - 4);
        }
    } else {
      /* concrete and terrazzo: mottled, terrazzo with chips of stone */
      for (let k = 0; k < 900; k++) {
        g.fillStyle = shade((R() - 0.5) * 10);
        g.globalAlpha = 0.08;
        const r = 10 + R() * 50;
        g.beginPath();
        g.arc(R() * 512, R() * 512, r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      if (kind === "terrazzo")
        for (let k = 0; k < 1400; k++) {
          g.fillStyle = ["#8f8a82", "#b9a48d", "#6f7477", "#e9e5de", "#c98e7a"][Math.floor(R() * 5)];
          g.fillRect(R() * 512, R() * 512, 2 + R() * 5, 2 + R() * 4);
        }
      else {
        g.strokeStyle = shade(-8);
        g.lineWidth = 2;
        g.strokeRect(0, 0, 512, 512);
      }
    }
  });
}

function signTexture(name: string, st: Theme["sign"], font: string) {
  return canvasTexture(1024, 128, (g) => {
    g.fillStyle = st.bg;
    g.fillRect(0, 0, 1024, 128);
    const family = st.text === "serif" ? `Georgia, "Times New Roman", serif` : font;
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (st.text === "neon") {
      g.shadowColor = st.fg;
      g.shadowBlur = 18;
    }
    g.fillStyle = st.fg;
    g.font = `${st.font} 76px ${family}`;
    const label = st.text === "serif" || st.text === "neon" ? name : name.toUpperCase();
    if (st.text !== "serif" && st.text !== "neon") (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "10px";
    g.fillText(label, 512, 68);
    if (st.accent) {
      g.fillStyle = st.accent;
      g.fillRect(412, 112, 200, 3);
    }
  });
}

function tickerTexture(font: string) {
  const items = ["VWL 284.10 +2.4%", "LEADS 1,284 +36", "COMMISSIONS +12.8%", "BROKERS 14", "AUM 92.4M +1.1%", "PIPELINE 3.2M", "DOCS READ 18,442", "CRM SYNC OK"];
  return canvasTexture(2048, 64, (g) => {
    g.fillStyle = "#050607";
    g.fillRect(0, 0, 2048, 64);
    g.font = `600 30px ${font}`;
    g.textBaseline = "middle";
    let x = 20;
    items.forEach((it, k) => {
      const up = k % 4 !== 2;
      g.fillStyle = "#f2c56f";
      g.fillText(it, x, 33);
      x += g.measureText(it).width + 14;
      g.fillStyle = up ? "#3fdc8a" : "#ff5a4a";
      g.fillText(up ? "▲" : "▼", x, 33);
      x += 70;
    });
  });
}

function chartTexture() {
  return canvasTexture(256, 160, (g) => {
    g.fillStyle = "#0e1a26";
    g.fillRect(0, 0, 256, 160);
    g.strokeStyle = "#5fb0ff";
    g.lineWidth = 3;
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const y = 110 - Math.sin(k * 0.7) * 22 - k * 3;
      if (k) g.lineTo(14 + k * 14, y);
      else g.moveTo(14, y);
    }
    g.stroke();
    for (let k = 0; k < 6; k++) {
      g.fillStyle = k === 3 ? "#f2c56f" : "#2f5d86";
      g.fillRect(20 + k * 38, 140 - k * 6 - 10, 24, k * 6 + 10);
    }
  });
}

function stripeTexture() {
  return canvasTexture(256, 64, (g) => {
    for (let k = 0; k < 8; k++) {
      g.fillStyle = k % 2 ? "#f1e6cf" : "#2f5a38";
      g.fillRect(k * 32, 0, 32, 64);
    }
  });
}

function rugTexture() {
  return canvasTexture(512, 512, (g) => {
    g.fillStyle = "#a6553b";
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "#e9d8b8";
    g.lineWidth = 10;
    g.strokeRect(24, 24, 464, 464);
    g.strokeStyle = "#2f4a5a";
    g.lineWidth = 6;
    g.strokeRect(48, 48, 416, 416);
    g.fillStyle = "#e9d8b8";
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++) {
        const x = 110 + k * 98;
        const y = 110 + r * 98;
        g.beginPath();
        g.moveTo(x, y - 30);
        g.lineTo(x + 30, y);
        g.lineTo(x, y + 30);
        g.lineTo(x - 30, y);
        g.closePath();
        g.fill();
      }
    }
  });
}

const CITIES: [string, number, number][] = [
  ["Jenin", 0.46, 0.12],
  ["Tulkarm", 0.22, 0.24],
  ["Nablus", 0.5, 0.32],
  ["Qalqilya", 0.18, 0.4],
  ["Ramallah", 0.42, 0.55],
  ["Jericho", 0.78, 0.6],
  ["Bethlehem", 0.44, 0.74],
  ["Hebron", 0.36, 0.88],
];
const ROUTES: [number, number, string][] = [
  [0, 2, "#38c172"],
  [1, 2, "#e3b23c"],
  [2, 4, "#38c172"],
  [3, 4, "#e3523c"],
  [4, 5, "#38c172"],
  [4, 6, "#e3b23c"],
  [6, 7, "#38c172"],
  [1, 3, "#38c172"],
];

function mapTexture(font: string) {
  return canvasTexture(1024, 512, (g) => {
    g.fillStyle = "#e8e0cc";
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = "#d8cdb2";
    g.beginPath();
    g.ellipse(520, 256, 300, 230, 0.2, 0, Math.PI * 2);
    g.fill();
    const P = (k: number) => [140 + CITIES[k][1] * 760, 30 + CITIES[k][2] * 450];
    g.lineCap = "round";
    for (const [a, b, col] of ROUTES) {
      const [x1, y1] = P(a);
      const [x2, y2] = P(b);
      g.strokeStyle = col;
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }
    g.font = `600 26px ${font}`;
    CITIES.forEach(([name], k) => {
      const [x, y] = P(k);
      g.fillStyle = "#1f2a24";
      g.beginPath();
      g.arc(x, y, 12, 0, Math.PI * 2);
      g.fill();
      g.fillText(name, x + 18, y - 12);
    });
  });
}

function boardTexture(font: string) {
  return canvasTexture(1024, 512, (g) => {
    g.fillStyle = "#0b0e0d";
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = "#e2b84d";
    g.font = `600 30px ${font}`;
    g.fillText("LIVE ROUTE STATUS", 40, 56);
    g.font = `500 28px ${font}`;
    ROUTES.slice(0, 7).forEach(([a, b, col], k) => {
      const y = 116 + k * 54;
      g.fillStyle = "#e9ece8";
      g.fillText(`${CITIES[a][0]}  →  ${CITIES[b][0]}`, 40, y);
      g.fillStyle = col;
      g.beginPath();
      g.arc(760, y - 9, 11, 0, Math.PI * 2);
      g.fill();
      g.fillText(col === "#38c172" ? "Open" : col === "#e3b23c" ? "Slow" : "Closed", 790, y);
    });
  });
}

function screenTexture(p: Project, i: number, n: number, font: string) {
  return canvasTexture(1280, 720, (g) => {
    const bg = g.createLinearGradient(0, 0, 1280, 720);
    bg.addColorStop(0, "#14171c");
    bg.addColorStop(1, "#0a0b0d");
    g.fillStyle = bg;
    g.fillRect(0, 0, 1280, 720);
    g.fillStyle = "#8b8f97";
    g.font = `500 26px ${font}`;
    g.fillText(`${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`, 72, 100);
    g.fillStyle = "#f2efe8";
    g.font = `600 92px ${font}`;
    g.fillText(p.name, 72, 222);
    g.fillStyle = "#c9c4b8";
    g.font = `400 34px ${font}`;
    wrap(g, p.kind, 72, 288, 560, 44);
    g.fillStyle = "#9da2aa";
    g.font = `400 24px ${font}`;
    wrap(g, p.short, 72, 380, 560, 34);
    g.font = `500 24px ${font}`;
    let x = 72;
    let y = 560;
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
    const uy = 70;
    g.fillStyle = "#1d2127";
    roundRect(g, ux, uy, 500, 580, 18);
    g.fill();
    g.fillStyle = "#262b33";
    g.fillRect(ux, uy + 50, 120, 530);
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
