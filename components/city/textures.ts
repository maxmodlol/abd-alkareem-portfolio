import * as THREE from "three";

import { generateAll, type Raw, type RawSet } from "./texture-gen";

/**
 * Procedural, tileable surface maps: colour, normal and roughness, generated once at start-up.
 * No image files are downloaded; everything comes from a seeded noise field. The pixels are
 * worked out in a background worker while the rest of the island is built.
 */

/** Phones get half-size maps: a quarter of the start-up work, and the difference is not visible there. */
let detail = 1;
let raw: RawSet | null = null;
let pending: Promise<void> | null = null;

/** Starts generating the maps in a worker. Await the result before building anything that uses them. */
export function prepareTextures(small: boolean): Promise<void> {
  detail = small ? 0.5 : 1;
  pending = new Promise<void>((resolve) => {
    try {
      const w = new Worker(new URL("./textures.worker.ts", import.meta.url));
      w.onmessage = (e: MessageEvent<RawSet>) => {
        raw = e.data;
        w.terminate();
        resolve();
      };
      w.onerror = () => {
        w.terminate();
        resolve();
      };
      w.postMessage(detail);
    } catch {
      resolve();
    }
  });
  return pending;
}

/* one texture per map; every material that asks for it gets a clone that shares the upload */
const made = new Map<Uint8Array, THREE.DataTexture>();
function tex(data: Uint8Array, size: number, srgb: boolean, repeat: number): THREE.Texture {
  let t = made.get(data);
  if (!t) {
    t = new THREE.DataTexture(data as Uint8Array<ArrayBuffer>, size, size, THREE.RGBAFormat);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.flipY = true;
    t.anisotropy = 8;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    made.set(data, t);
  }
  const c = t.clone();
  c.repeat.set(repeat, repeat);
  return c;
}

/* without a worker (or if it failed) the same maths runs here */
const get = (k: keyof RawSet): Raw => (raw ??= generateAll(detail))[k];

export type SurfaceMaps = { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture };

function surface(r: Raw, repeat: number): SurfaceMaps {
  return {
    map: tex(r.map!, r.size, true, repeat),
    normalMap: tex(r.normal, r.size, false, repeat),
    roughnessMap: tex(r.rough!, r.size, false, repeat),
  };
}

/** Lawn: clumps of lighter and darker grass, dry patches and fine blade grain. */
export const grassMaps = (repeat: number) => surface(get("grass"), repeat);
/** Asphalt: dark grain, lighter worn tracks and patched repairs. */
export const asphaltMaps = (repeat: number) => surface(get("asphalt"), repeat);
/** Paving slabs with grout lines and a little dirt. */
export const pavingMaps = (repeat: number) => surface(get("paving"), repeat);
/** Small ripples for the sea, scrolled in two directions by the water shader. */
export function rippleNormal(repeat: number): THREE.Texture {
  const r = get("ripple");
  return tex(r.normal, r.size, false, repeat);
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
