/**
 * The pixel maths behind the procedural surface maps. It has no three.js or DOM in it, so it runs
 * in a background worker while the island is being built (see textures.worker.ts).
 */

export type Raw = { size: number; map?: Uint8Array; normal: Uint8Array; rough?: Uint8Array };
export type RawSet = Record<"grass" | "asphalt" | "paving" | "ripple", Raw>;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function generateAll(detail: number): RawSet {
  const px = (size: number) => Math.max(64, Math.round(size * detail));

  /** Tileable value noise with a few octaves, on a size x size grid, values 0..1. */
  const fbm = (size: number, seed: number, cells: number, octaves = 4, gain = 0.5): Float32Array => {
    const out = new Float32Array(size * size);
    const R = rng(seed);
    let amp = 1;
    let total = 0;
    let c = Math.max(1, Math.round(cells * detail));
    /* the lattice cell and smoothed fraction of every column, computed once per octave */
    const i0 = new Int32Array(size);
    const i1 = new Int32Array(size);
    const fr = new Float32Array(size);
    for (let o = 0; o < octaves; o++) {
      const lat = new Float32Array(c * c);
      for (let i = 0; i < lat.length; i++) lat[i] = R();
      const step = size / c;
      for (let x = 0; x < size; x++) {
        const g = x / step;
        const f = g - Math.floor(g);
        i0[x] = Math.floor(g) % c;
        i1[x] = (i0[x] + 1) % c;
        fr[x] = f * f * (3 - 2 * f);
      }
      for (let y = 0; y < size; y++) {
        const r0 = i0[y] * c;
        const r1 = i1[y] * c;
        const fy = fr[y];
        const row = y * size;
        for (let x = 0; x < size; x++) {
          const fx = fr[x];
          const a0 = lat[r0 + i0[x]];
          const b0 = lat[r1 + i0[x]];
          const a = a0 + (lat[r0 + i1[x]] - a0) * fx;
          const b = b0 + (lat[r1 + i1[x]] - b0) * fx;
          out[row + x] += (a + (b - a) * fy) * amp;
        }
      }
      total += amp;
      amp *= gain;
      c = Math.min(c * 2, size);
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
  };

  const pixels = (size: number, fill: (i: number, px: Uint8Array, o: number) => void): Uint8Array => {
    const out = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) fill(i, out, i * 4);
    return out;
  };
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  const grey = (size: number, value: (i: number) => number) =>
    pixels(size, (i, p, o) => {
      p[o] = p[o + 1] = p[o + 2] = clamp(value(i));
      p[o + 3] = 255;
    });

  /** A tangent-space normal map from a height field, wrapping at the edges. */
  const normalFrom = (h: Float32Array, size: number, strength: number) =>
    pixels(size, (i, p, o) => {
      const x = i % size;
      const y = (i / size) | 0;
      const l = h[y * size + ((x - 1 + size) % size)];
      const r = h[y * size + ((x + 1) % size)];
      const u = h[((y - 1 + size) % size) * size + x];
      const d = h[((y + 1) % size) * size + x];
      let nx = (l - r) * strength;
      let ny = (d - u) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      p[o] = (nx * 0.5 + 0.5) * 255;
      p[o + 1] = (ny * 0.5 + 0.5) * 255;
      p[o + 2] = (nz * 0.5 + 0.5) * 255;
      p[o + 3] = 255;
    });

  /* Lawn: clumps of lighter and darker grass, dry patches and fine blade grain. */
  const grass = (): Raw => {
    const S = px(512);
    const big = fbm(S, 11, 4, 4);
    const fine = fbm(S, 12, 64, 3, 0.6);
    const dry = fbm(S, 13, 6, 3);
    const map = pixels(S, (i, p, o) => {
      const b = big[i];
      const f = fine[i];
      const d = Math.max(0, (dry[i] - 0.58) * 3.2);
      const shade = 0.72 + b * 0.45 + (f - 0.5) * 0.35;
      p[o] = clamp(mix(78, 150, d) * shade);
      p[o + 1] = clamp(mix(150, 160, d) * shade);
      p[o + 2] = clamp(mix(70, 92, d) * shade);
      p[o + 3] = 255;
    });
    const h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) h[i] = fine[i] * 0.8 + big[i] * 0.2;
    return { size: S, map, normal: normalFrom(h, S, 6), rough: grey(S, (i) => 200 + fine[i] * 55) };
  };

  /* Asphalt: dark grain, lighter worn tracks and patched repairs. */
  const asphalt = (): Raw => {
    const S = px(512);
    const grain = fbm(S, 21, 128, 2, 0.7);
    const wear = fbm(S, 22, 5, 3);
    const patch = fbm(S, 23, 8, 2);
    const R = rng(24);
    const speck = new Float32Array(S * S);
    for (let i = 0; i < speck.length; i++) speck[i] = R() < 0.04 ? R() : 0;
    const map = pixels(S, (i, p, o) => {
      const pt = patch[i] > 0.66 ? -10 : 0;
      const v = 46 + grain[i] * 22 + wear[i] * 16 + speck[i] * 40 + pt;
      p[o] = clamp(v);
      p[o + 1] = clamp(v + 2);
      p[o + 2] = clamp(v + 6);
      p[o + 3] = 255;
    });
    const h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) h[i] = grain[i] + speck[i] * 0.6;
    return { size: S, map, normal: normalFrom(h, S, 3.5), rough: grey(S, (i) => 190 + grain[i] * 40 - wear[i] * 50) };
  };

  /* Paving slabs with grout lines and a little dirt. */
  const paving = (): Raw => {
    const S = px(256);
    const n = fbm(S, 31, 32, 3);
    const dirt = fbm(S, 32, 4, 3);
    const T = S / 4;
    const grout = (i: number) => {
      const x = i % S;
      const y = (i / S) | 0;
      const off = Math.floor(y / T) % 2 ? T / 2 : 0;
      const gx = (x + off) % T;
      const gy = y % T;
      return Math.min(gx, T - gx, gy, T - gy) < 2 ? 1 : 0;
    };
    const map = pixels(S, (i, p, o) => {
      const v = (grout(i) ? 150 : 214 + n[i] * 26) - dirt[i] * 30;
      p[o] = clamp(v);
      p[o + 1] = clamp(v * 0.96);
      p[o + 2] = clamp(v * 0.9);
      p[o + 3] = 255;
    });
    const h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) h[i] = (grout(i) ? 0 : 1) * 0.7 + n[i] * 0.3;
    return { size: S, map, normal: normalFrom(h, S, 2.5), rough: grey(S, (i) => 210 + n[i] * 40) };
  };

  /* Small ripples for the sea, scrolled in two directions by the water shader. */
  const ripple = (): Raw => {
    const S = px(256);
    const a = fbm(S, 51, 8, 4, 0.55);
    const b = fbm(S, 52, 16, 3, 0.5);
    const h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.7 + b[i] * 0.3;
    return { size: S, normal: normalFrom(h, S, 10) };
  };

  return { grass: grass(), asphalt: asphalt(), paving: paving(), ripple: ripple() };
}
