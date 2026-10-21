import * as THREE from "three";

export type Burst = "dust" | "land" | "spark" | "gem" | "pad" | "trail" | "hit" | "splash";

type Spec = {
  n: number;
  color: number[];
  speed: [number, number];
  up: [number, number];
  life: [number, number];
  size: [number, number];
  grav: number;
  drag: number;
  glow: boolean;
};

const SPECS: Record<Burst, Spec> = {
  dust: { n: 5, color: [0xf3e2c8, 0xe6d3b5], speed: [0.3, 0.8], up: [0.2, 0.6], life: [0.35, 0.6], size: [0.1, 0.2], grav: -0.6, drag: 3, glow: false },
  land: { n: 16, color: [0xf3e2c8, 0xfff4e3], speed: [1.2, 2.4], up: [0.2, 0.8], life: [0.4, 0.75], size: [0.12, 0.26], grav: -0.4, drag: 4, glow: false },
  trail: { n: 2, color: [0xffb27a, 0xffe08a], speed: [0.05, 0.25], up: [0.1, 0.4], life: [0.25, 0.45], size: [0.06, 0.12], grav: 0, drag: 2, glow: true },
  spark: { n: 14, color: [0xffe08a, 0xffc83d, 0xfff4e3], speed: [1.5, 3.2], up: [1.0, 3.0], life: [0.35, 0.7], size: [0.06, 0.13], grav: 7, drag: 1.5, glow: true },
  gem: { n: 40, color: [0x7fd3ff, 0xc9b6ff, 0xfff4e3, 0x7ee2a0], speed: [2, 5], up: [1, 4], life: [0.6, 1.2], size: [0.08, 0.18], grav: 4, drag: 1.2, glow: true },
  pad: { n: 26, color: [0xff8a6a, 0xffe08a, 0xf25c54], speed: [0.6, 2.2], up: [3, 7], life: [0.5, 0.9], size: [0.07, 0.16], grav: 6, drag: 1, glow: true },
  hit: { n: 18, color: [0xffe08a, 0xfff4e3, 0xf25c54], speed: [2, 4], up: [1, 3], life: [0.3, 0.6], size: [0.08, 0.16], grav: 6, drag: 2, glow: true },
  splash: { n: 20, color: [0xbfe9f2, 0xffffff], speed: [1, 2.5], up: [2, 4.5], life: [0.5, 0.9], size: [0.08, 0.16], grav: 9, drag: 1, glow: false },
};

/**
 * Pooled soft particles drawn as one Points object per blending mode.
 * Bursts are cheap to fire every frame, and nothing is allocated after start-up.
 */
class Pool {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private max: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private base: Float32Array;
  private next = 0;
  private geo: THREE.BufferGeometry;

  constructor(
    private n: number,
    glow: boolean,
  ) {
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.max = new Float32Array(n).fill(1);
    this.grav = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.base = new Float32Array(n);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute("size", new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute("alpha", new THREE.BufferAttribute(this.alpha, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 600 }, uGlow: { value: glow ? 1.6 : 1 } },
      vertexShader: `
        attribute float size; attribute float alpha; attribute vec3 color;
        uniform float uScale;
        varying vec3 vCol; varying float vA;
        void main() {
          vCol = color; vA = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uGlow;
        varying vec3 vCol; varying float vA;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d) * 4.0;
          if (r > 1.0) discard;
          float a = (1.0 - r) * (1.0 - r) * vA;
          gl_FragColor = vec4(vCol * uGlow, a);
        }
      `,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  setScale(px: number): void {
    (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = px;
  }

  emit(spec: Spec, x: number, y: number, z: number, count: number, dir: number | null, r: () => number): void {
    const c = new THREE.Color();
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.n;
      const a = dir === null ? r() * Math.PI * 2 : dir + (r() - 0.5) * 1.2;
      const sp = spec.speed[0] + r() * (spec.speed[1] - spec.speed[0]);
      this.pos[i * 3] = x + (r() - 0.5) * 0.1;
      this.pos[i * 3 + 1] = y + r() * 0.06;
      this.pos[i * 3 + 2] = z + (r() - 0.5) * 0.1;
      this.vel[i * 3] = Math.sin(a) * sp;
      this.vel[i * 3 + 1] = spec.up[0] + r() * (spec.up[1] - spec.up[0]);
      this.vel[i * 3 + 2] = Math.cos(a) * sp;
      const L = spec.life[0] + r() * (spec.life[1] - spec.life[0]);
      this.life[i] = L;
      this.max[i] = L;
      this.grav[i] = spec.grav;
      this.drag[i] = spec.drag;
      this.base[i] = spec.size[0] + r() * (spec.size[1] - spec.size[0]);
      c.set(spec.color[Math.floor(r() * spec.color.length)]);
      this.col[i * 3] = c.r;
      this.col[i * 3 + 1] = c.g;
      this.col[i * 3 + 2] = c.b;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const u = Math.max(0, this.life[i] / this.max[i]);
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= d;
      this.vel[i * 3 + 2] *= d;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.alpha[i] = Math.min(1, u * 2.2);
      this.size[i] = this.base[i] * (0.6 + (1 - u) * 0.8);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
    this.geo.attributes.alpha.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

/** Ground shockwaves: a few rings that grow and fade. */
class Rings {
  private items: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; age: number; life: number; size: number }[] = [];
  private geo = new THREE.RingGeometry(0.82, 1, 40);
  constructor(parent: THREE.Object3D) {
    this.geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfff4e3,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(this.geo, mat);
      m.visible = false;
      parent.add(m);
      this.items.push({ m, mat, age: 0, life: 0, size: 1 });
    }
  }
  fire(x: number, y: number, z: number, size: number, color: number): void {
    const it = this.items.find((r) => r.age >= r.life) ?? this.items[0];
    it.age = 0;
    it.life = 0.5;
    it.size = size;
    it.mat.color.set(color);
    it.m.position.set(x, y + 0.03, z);
    it.m.visible = true;
  }
  update(dt: number): void {
    for (const r of this.items) {
      if (r.age >= r.life) {
        r.m.visible = false;
        continue;
      }
      r.age += dt;
      const u = Math.min(1, r.age / r.life);
      r.m.scale.setScalar(0.1 + (1 - Math.pow(1 - u, 3)) * r.size);
      r.mat.opacity = (1 - u) * 0.85;
    }
  }
  dispose(): void {
    this.geo.dispose();
    this.items.forEach((r) => r.mat.dispose());
  }
}

export class Particles {
  private soft: Pool;
  private glow: Pool;
  private rings: Rings;
  private seed = 1;
  private r = () => {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  };

  constructor(parent: THREE.Object3D, small: boolean) {
    this.soft = new Pool(small ? 160 : 320, false);
    this.glow = new Pool(small ? 220 : 480, true);
    parent.add(this.soft.points);
    parent.add(this.glow.points);
    this.rings = new Rings(parent);
  }

  /** Point size scale in pixels per unit at distance one. Follows the canvas height. */
  setViewport(heightPx: number, fov: number): void {
    const s = heightPx / (2 * Math.tan((fov * Math.PI) / 360));
    this.soft.setScale(s);
    this.glow.setScale(s);
  }

  burst(kind: Burst, x: number, y: number, z: number, dir: number | null = null, scale = 1): void {
    const spec = SPECS[kind];
    const pool = spec.glow ? this.glow : this.soft;
    pool.emit(spec, x, y, z, Math.max(1, Math.round(spec.n * scale)), dir, this.r);
  }

  ring(x: number, y: number, z: number, size: number, color = 0xfff4e3): void {
    this.rings.fire(x, y, z, size, color);
  }

  update(dt: number): void {
    this.soft.update(dt);
    this.glow.update(dt);
    this.rings.update(dt);
  }

  dispose(): void {
    this.soft.dispose();
    this.glow.dispose();
    this.rings.dispose();
  }
}
