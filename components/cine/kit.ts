import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Small tools for building the scene by hand: a batch that merges every box, cylinder and sphere of a
 * kind of surface into one mesh (colours go into the vertices, so a whole shop front is a handful of
 * draw calls), and canvas textures for signs and screens.
 */

export type Surface = "matte" | "satin" | "gloss" | "metal" | "glow" | "glass";

const SURFACES: Record<Surface, () => THREE.Material> = {
  matte: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 }),
  satin: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0 }),
  gloss: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0 }),
  metal: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.9 }),
  /* lamps, LEDs and lit panels: not lit by the scene, slightly over white so they bloom */
  glow: () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  glass: () =>
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false }),
};

/** One material per surface kind, shared by every batch. */
export class Surfaces {
  private cache = new Map<Surface, THREE.Material>();
  get(k: Surface) {
    let m = this.cache.get(k);
    if (!m) {
      m = SURFACES[k]();
      this.cache.set(k, m);
    }
    return m;
  }
  dispose() {
    this.cache.forEach((m) => m.dispose());
  }
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();

export class Batch {
  private parts = new Map<Surface, THREE.BufferGeometry[]>();
  constructor(private surfaces: Surfaces) {}

  /** Adds a geometry (consumed) painted in one colour, placed by position, rotation and scale. */
  add(geo: THREE.BufferGeometry, kind: Surface, color: THREE.ColorRepresentation, at?: { p?: number[]; r?: number[]; s?: number[] }) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    if (at) {
      tmpE.set(at.r?.[0] ?? 0, at.r?.[1] ?? 0, at.r?.[2] ?? 0);
      tmpQ.setFromEuler(tmpE);
      tmpV.set(at.p?.[0] ?? 0, at.p?.[1] ?? 0, at.p?.[2] ?? 0);
      tmpS.set(at.s?.[0] ?? 1, at.s?.[1] ?? 1, at.s?.[2] ?? 1);
      g.applyMatrix4(tmpM.compose(tmpV, tmpQ, tmpS));
    }
    tmpC.set(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    let list = this.parts.get(kind);
    if (!list) this.parts.set(kind, (list = []));
    list.push(g);
    return this;
  }

  /** An axis-aligned box by its centre and size. */
  box(kind: Surface, color: THREE.ColorRepresentation, c: number[], size: number[], r?: number[]) {
    return this.add(new THREE.BoxGeometry(size[0], size[1], size[2]), kind, color, { p: c, r });
  }

  /** A vertical cylinder standing on y0. */
  cyl(kind: Surface, color: THREE.ColorRepresentation, x: number, y0: number, z: number, rTop: number, rBot: number, h: number, seg = 12) {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), kind, color, { p: [x, y0 + h / 2, z] });
  }

  build(parent: THREE.Object3D, o: { cast?: boolean; receive?: boolean } = {}) {
    const meshes: THREE.Mesh[] = [];
    this.parts.forEach((list, kind) => {
      const geo = mergeGeometries(list);
      list.forEach((g) => g.dispose());
      if (!geo) return;
      const m = new THREE.Mesh(geo, this.surfaces.get(kind));
      m.castShadow = !!o.cast && kind !== "glass" && kind !== "glow";
      m.receiveShadow = !!o.receive && kind !== "glow";
      parent.add(m);
      meshes.push(m);
    });
    this.parts.clear();
    return meshes;
  }
}

/* ---------- canvas textures ---------- */

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > max && line) {
      g.fillText(line, x, y);
      y += lh;
      line = word;
    } else line = next;
  }
  if (line) g.fillText(line, x, y);
  return y;
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** A soft round gradient. */
export function radial(size: number, inner: string, outer: string): THREE.CanvasTexture {
  return canvasTexture(size, size, (g) => {
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  });
}

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
