import * as THREE from "three";

import type { Project } from "@/lib/projects";

export type BuildingId = Project["id"];
export type Anim = (t: number, dt: number) => void;
export type Mat = THREE.Material | THREE.Material[] | number;

export const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, Arial, sans-serif";

/** Small deterministic random generator so the city looks the same on every load. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  srgb = true,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (g) draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function roundRectPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

type Glow = { m: THREE.MeshStandardMaterial; day: number; night: number };
type LightRec = { l: THREE.PointLight; day: number; night: number };

/** Shared factory for meshes, materials and the things that react to day and night. */
export class Kit {
  readonly glows: Glow[] = [];
  readonly lights: LightRec[] = [];
  readonly anims: Anim[] = [];
  readonly hits: THREE.Mesh[] = [];
  readonly boxGeo = new THREE.BoxGeometry(1, 1, 1);
  /** 0 = golden hour, 1 = night. Updated by the scene every frame. */
  night = 0;
  /** Point lights are skipped on small screens to keep the frame rate up. */
  lightsOn = true;

  private cache = new Map<string, THREE.MeshStandardMaterial>();
  private lampGeo = new THREE.SphereGeometry(0.1, 12, 10);
  private lampMat: THREE.MeshStandardMaterial | null = null;

  mat(color: number, rough = 0.78, metal = 0, flat = false): THREE.MeshStandardMaterial {
    const key = `${color}|${rough}|${metal}|${flat ? 1 : 0}`;
    let m = this.cache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: flat });
      this.cache.set(key, m);
    }
    return m;
  }

  glowMat(color: number, day: number, night: number, base = 0x1a1a1a): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color: base, emissive: color, emissiveIntensity: day, roughness: 0.4 });
    this.glows.push({ m, day, night });
    return m;
  }

  private resolve(m: Mat): THREE.Material | THREE.Material[] {
    return typeof m === "number" ? this.mat(m) : m;
  }

  put(
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    m: Mat,
    x = 0,
    y = 0,
    z = 0,
    shadow = true,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, this.resolve(m));
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  /** Box whose bottom sits at y. */
  box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    m: Mat,
    x: number,
    y: number,
    z: number,
    shadow = true,
  ): THREE.Mesh {
    const mesh = this.put(parent, this.boxGeo, m, x, y + h / 2, z, shadow);
    mesh.scale.set(w, h, d);
    return mesh;
  }

  /** Cylinder whose bottom sits at y. */
  cyl(
    parent: THREE.Object3D,
    rTop: number,
    rBot: number,
    h: number,
    m: Mat,
    x: number,
    y: number,
    z: number,
    seg = 24,
    shadow = true,
  ): THREE.Mesh {
    return this.put(parent, new THREE.CylinderGeometry(rTop, rBot, h, seg), m, x, y + h / 2, z, shadow);
  }

  /** Cone whose bottom sits at y. */
  cone(
    parent: THREE.Object3D,
    r: number,
    h: number,
    m: Mat,
    x: number,
    y: number,
    z: number,
    seg = 16,
    shadow = true,
  ): THREE.Mesh {
    return this.put(parent, new THREE.ConeGeometry(r, h, seg), m, x, y + h / 2, z, shadow);
  }

  /** Sphere centred at y. */
  ball(
    parent: THREE.Object3D,
    r: number,
    m: Mat,
    x: number,
    y: number,
    z: number,
    seg = 18,
    shadow = true,
  ): THREE.Mesh {
    return this.put(parent, new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7))), m, x, y, z, shadow);
  }

  /** Triangular prism for pitched roofs. The ridge runs along z. */
  gable(w: number, h: number, d: number): THREE.BufferGeometry {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  }

  /** A grid of windows. Lit windows glow through an emissive map that brightens at night. */
  facade(
    base: string,
    o: {
      cols: number;
      rows: number;
      seed: number;
      glass?: string;
      lit?: number;
      day?: number;
      night?: number;
      rough?: number;
      metal?: number;
    },
  ): THREE.MeshStandardMaterial {
    const cw = 28;
    const ch = 32;
    const R = rng(o.seed);
    const litChance = o.lit ?? 0.55;
    const cells: (string | null)[] = [];
    const warm = ["#ffd9a0", "#ffe9c4", "#ffc27a", "#ffeacc", "#cfe8ff"];
    for (let i = 0; i < o.cols * o.rows; i++) {
      cells.push(R() < litChance ? warm[Math.floor(R() * warm.length)] : null);
    }
    const W = o.cols * cw;
    const H = o.rows * ch;
    const map = canvasTex(W, H, (g) => {
      g.fillStyle = base;
      g.fillRect(0, 0, W, H);
      for (let r = 0; r < o.rows; r++) {
        for (let c = 0; c < o.cols; c++) {
          const x = c * cw;
          const y = r * ch;
          const grd = g.createLinearGradient(0, y + 5, 0, y + ch - 5);
          grd.addColorStop(0, o.glass ?? "#8ec3df");
          grd.addColorStop(1, "#2a5170");
          g.fillStyle = grd;
          g.fillRect(x + 5, y + 5, cw - 10, ch - 10);
          g.fillStyle = base;
          g.fillRect(x + cw / 2 - 0.75, y + 5, 1.5, ch - 10);
          g.fillStyle = "rgba(0,0,0,0.16)";
          g.fillRect(x + 4, y + ch - 5, cw - 8, 2);
          /* a sill under each window and a soft reflection streak across the glass */
          g.fillStyle = "rgba(255,255,255,0.35)";
          g.fillRect(x + 3, y + ch - 4, cw - 6, 1.5);
          g.fillStyle = "rgba(255,255,255,0.12)";
          g.beginPath();
          g.moveTo(x + 5, y + ch - 12);
          g.lineTo(x + 5, y + ch - 7);
          g.lineTo(x + cw - 5, y + 9);
          g.lineTo(x + cw - 5, y + 5);
          g.closePath();
          g.fill();
        }
      }
      /* weathering: grime collects towards the ground, with a little streaking */
      const grime = g.createLinearGradient(0, 0, 0, H);
      grime.addColorStop(0, "rgba(40,30,20,0)");
      grime.addColorStop(0.75, "rgba(40,30,20,0.04)");
      grime.addColorStop(1, "rgba(40,30,20,0.16)");
      g.fillStyle = grime;
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < o.cols * 2; i++) {
        g.fillStyle = `rgba(30,25,20,${0.02 + R() * 0.04})`;
        g.fillRect(R() * W, R() * H * 0.5, 1 + R() * 2, H * (0.2 + R() * 0.5));
      }
    });
    /* glass is smooth and a little metallic so it mirrors the sky; walls are matte (G roughness, B metalness) */
    const rm = canvasTex(
      W,
      H,
      (g) => {
        g.fillStyle = "rgb(0,225,0)";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "rgb(0,30,170)";
        for (let r = 0; r < o.rows; r++) {
          for (let c = 0; c < o.cols; c++) g.fillRect(c * cw + 5, r * ch + 5, cw - 10, ch - 10);
        }
      },
      false,
    );
    const emissive = canvasTex(W, H, (g) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, H);
      for (let r = 0; r < o.rows; r++) {
        for (let c = 0; c < o.cols; c++) {
          const col = cells[r * o.cols + c];
          if (!col) continue;
          g.fillStyle = col;
          g.fillRect(c * cw + 5, r * ch + 5, cw - 10, ch - 10);
        }
      }
    });
    const day = o.day ?? 0.18;
    const night = o.night ?? 2.6;
    const m = new THREE.MeshStandardMaterial({
      map,
      emissiveMap: emissive,
      emissive: 0xffffff,
      emissiveIntensity: day,
      roughness: 1,
      metalness: 1,
      roughnessMap: rm,
      metalnessMap: rm,
      envMapIntensity: 1.3,
    });
    this.glows.push({ m, day, night });
    return m;
  }

  /** Material list for a box: the facade on the four sides, plain on top and bottom. */
  sides(side: THREE.Material, top: THREE.Material): THREE.Material[] {
    return [side, side, top, top, side, side];
  }

  /** A lit sign: text on a coloured plate that glows at night. */
  sign(
    text: string,
    w: number,
    h: number,
    o: { fg: string; bg: string; day?: number; night?: number; radius?: number },
  ): THREE.Mesh {
    const pxW = 512;
    const pxH = Math.max(64, Math.round((512 * h) / w));
    const map = canvasTex(pxW, pxH, (g, cw, chh) => {
      g.fillStyle = o.bg;
      roundRectPath(g, 2, 2, cw - 4, chh - 4, (o.radius ?? 0.18) * chh);
      g.fill();
      g.fillStyle = o.fg;
      g.textAlign = "center";
      g.textBaseline = "middle";
      let size = chh * 0.62;
      g.font = `800 ${size}px ${FONT}`;
      while (g.measureText(text).width > cw * 0.88 && size > 10) {
        size -= 2;
        g.font = `800 ${size}px ${FONT}`;
      }
      g.fillText(text, cw / 2, chh / 2 + chh * 0.03);
    });
    const day = o.day ?? 0.35;
    const night = o.night ?? 1.8;
    const m = new THREE.MeshStandardMaterial({
      map,
      emissiveMap: map,
      emissive: 0xffffff,
      emissiveIntensity: day,
      roughness: 0.5,
    });
    this.glows.push({ m, day, night });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.castShadow = false;
    return mesh;
  }

  /** A street lamp. The head brightens at night. */
  lamp(parent: THREE.Object3D, x: number, z: number, h = 1.6): void {
    if (!this.lampMat) this.lampMat = this.glowMat(0xffd9a0, 0.6, 3.6);
    this.cyl(parent, 0.035, 0.055, h, 0x25323b, x, 0, z, 8);
    this.box(parent, 0.22, 0.04, 0.04, 0x25323b, x, h - 0.02, z, false);
    this.put(parent, this.lampGeo, this.lampMat, x, h + 0.04, z, false);
  }

  pointLight(
    parent: THREE.Object3D,
    color: number,
    day: number,
    night: number,
    dist: number,
    x: number,
    y: number,
    z: number,
  ): THREE.PointLight | null {
    if (!this.lightsOn) return null;
    const l = new THREE.PointLight(color, day, dist, 2);
    l.position.set(x, y, z);
    parent.add(l);
    this.lights.push({ l, day, night });
    return l;
  }

  /** Register an invisible box used for picking. */
  hit(g: THREE.Group, w: number, h: number, d: number, y: number, z = 0): void {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(0, y, z);
    g.add(m);
    this.hits.push(m);
  }

  /** Apply day/night to every registered glow and light. */
  applyNight(n: number): void {
    this.night = n;
    for (const g of this.glows) g.m.emissiveIntensity = g.day + (g.night - g.day) * n;
    for (const l of this.lights) l.l.intensity = l.day + (l.night - l.day) * n;
  }
}
