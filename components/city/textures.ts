import * as THREE from "three";

import { rng } from "./kit";

/**
 * Procedural, tileable surface maps: colour, normal and roughness, generated once at start-up.
 * No image files are downloaded; everything comes from a seeded noise field.
 */

/** Phones get half-size maps: a quarter of the start-up work, and the difference is not visible there. */
let detail = 1;
export function setTextureDetail(small: boolean): void {
  detail = small ? 0.5 : 1;
}
const px = (size: number) => Math.max(64, Math.round(size * detail));

/** Tileable value noise with a few octaves, on a size x size grid, values 0..1. */
function fbm(size: number, seed: number, cells: number, octaves = 4, gain = 0.5): Float32Array {
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
}

function toTexture(size: number, fill: (i: number, px: Uint8ClampedArray) => void, srgb: boolean, repeat: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const img = g.createImageData(size, size);
    for (let i = 0; i < size * size; i++) fill(i, img.data.subarray(i * 4, i * 4 + 4));
    g.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

/** A tangent-space normal map from a height field, wrapping at the edges. */
function normalFrom(h: Float32Array, size: number, strength: number, repeat: number): THREE.CanvasTexture {
  return toTexture(
    size,
    (i, px) => {
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
      px[0] = (nx * 0.5 + 0.5) * 255;
      px[1] = (ny * 0.5 + 0.5) * 255;
      px[2] = (nz * 0.5 + 0.5) * 255;
      px[3] = 255;
    },
    false,
    repeat,
  );
}

export type SurfaceMaps = { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture };

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Lawn: clumps of lighter and darker grass, dry patches and fine blade grain. */
export function grassMaps(repeat: number): SurfaceMaps {
  const S = px(512);
  const big = fbm(S, 11, 4, 4);
  const fine = fbm(S, 12, 64, 3, 0.6);
  const dry = fbm(S, 13, 6, 3);
  const map = toTexture(
    S,
    (i, px) => {
      const b = big[i];
      const f = fine[i];
      const d = Math.max(0, (dry[i] - 0.58) * 3.2);
      const shade = 0.72 + b * 0.45 + (f - 0.5) * 0.35;
      px[0] = Math.min(255, mix(78, 150, d) * shade);
      px[1] = Math.min(255, mix(150, 160, d) * shade);
      px[2] = Math.min(255, mix(70, 92, d) * shade);
      px[3] = 255;
    },
    true,
    repeat,
  );
  const h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) h[i] = fine[i] * 0.8 + big[i] * 0.2;
  return {
    map,
    normalMap: normalFrom(h, S, 6, repeat),
    roughnessMap: toTexture(S, (i, px) => {
      const v = 200 + fine[i] * 55;
      px[0] = px[1] = px[2] = v;
      px[3] = 255;
    }, false, repeat),
  };
}

/** Asphalt: dark grain, lighter worn tracks and patched repairs. */
export function asphaltMaps(repeat: number): SurfaceMaps {
  const S = px(512);
  const grain = fbm(S, 21, 128, 2, 0.7);
  const wear = fbm(S, 22, 5, 3);
  const patch = fbm(S, 23, 8, 2);
  const R = rng(24);
  const speck = new Float32Array(S * S);
  for (let i = 0; i < speck.length; i++) speck[i] = R() < 0.04 ? R() : 0;
  const map = toTexture(
    S,
    (i, px) => {
      const p = patch[i] > 0.66 ? -10 : 0;
      const v = 46 + grain[i] * 22 + wear[i] * 16 + speck[i] * 40 + p;
      px[0] = v;
      px[1] = v + 2;
      px[2] = v + 6;
      px[3] = 255;
    },
    true,
    repeat,
  );
  const h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) h[i] = grain[i] + speck[i] * 0.6;
  return {
    map,
    normalMap: normalFrom(h, S, 3.5, repeat),
    roughnessMap: toTexture(S, (i, px) => {
      const v = 190 + grain[i] * 40 - wear[i] * 50;
      px[0] = px[1] = px[2] = v;
      px[3] = 255;
    }, false, repeat),
  };
}

/** Paving slabs with grout lines and a little dirt. */
export function pavingMaps(repeat: number): SurfaceMaps {
  const S = px(256);
  const n = fbm(S, 31, 32, 3);
  const dirt = fbm(S, 32, 4, 3);
  const tiles = 4;
  const T = S / tiles;
  const grout = (i: number) => {
    const x = i % S;
    const y = (i / S) | 0;
    const off = Math.floor(y / T) % 2 ? T / 2 : 0;
    const gx = (x + off) % T;
    const gy = y % T;
    return Math.min(gx, T - gx, gy, T - gy) < 2 ? 1 : 0;
  };
  const map = toTexture(
    S,
    (i, px) => {
      const g = grout(i);
      const v = (g ? 150 : 214 + n[i] * 26) - dirt[i] * 30;
      px[0] = v;
      px[1] = v * 0.96;
      px[2] = v * 0.9;
      px[3] = 255;
    },
    true,
    repeat,
  );
  const h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) h[i] = (grout(i) ? 0 : 1) * 0.7 + n[i] * 0.3;
  return {
    map,
    normalMap: normalFrom(h, S, 2.5, repeat),
    roughnessMap: toTexture(S, (i, px) => {
      const v = 210 + n[i] * 40;
      px[0] = px[1] = px[2] = v;
      px[3] = 255;
    }, false, repeat),
  };
}

/** Small ripples for the sea, scrolled in two directions by the water shader. */
export function rippleNormal(repeat: number): THREE.Texture {
  const S = px(256);
  const a = fbm(S, 51, 8, 4, 0.55);
  const b = fbm(S, 52, 16, 3, 0.5);
  const h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.7 + b[i] * 0.3;
  return normalFrom(h, S, 10, repeat);
}

/** Maps a material's textures by world x and z instead of the mesh's own UVs, so long boxes tile evenly. */
export function worldUV<M extends THREE.MeshStandardMaterial>(mat: M, scale: number): M {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      "#include <uv_vertex>",
      `#include <uv_vertex>
      vec2 wuv = (modelMatrix * vec4(position, 1.0)).xz * ${scale.toFixed(4)};
      #ifdef USE_MAP
        vMapUv = wuv;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = wuv;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv = wuv;
      #endif`,
    );
  };
  mat.customProgramCacheKey = () => `wuv-${scale}`;
  return mat;
}
