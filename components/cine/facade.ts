import * as THREE from "three";

/**
 * Building skins drawn in the shader from world position, so one material covers any size of tower
 * with windows of a constant, real size (a curtain-wall panel is 1.5 m wide, a floor 3.6 m high).
 * Every window gets its own random state: its glass reflects the sky, some are lit from inside with a
 * warm or cool office light, some have blinds half down. Far away, where a window would be smaller
 * than a pixel, the pattern fades to its average so towers never shimmer.
 */

export type FacadeStyle = {
  /** Frame, mullion and spandrel colour. */
  frame: number;
  /** Glass tint. */
  glass: number;
  /** Size of one window cell in metres: width, height (one floor). */
  cell: [number, number];
  /** Share of the cell that is glass: width, height. */
  win: [number, number];
  glassRough: number;
  glassMetal: number;
  frameRough: number;
  frameMetal: number;
  /** Share of windows lit at night. */
  lit: number;
  /** Vertical fins: their depth shading, 0 for none. */
  fins?: number;
};

export const FACADES: Record<string, FacadeStyle> = {
  /* blue-green curtain wall, the commonest skin of a business district */
  curtain: { frame: 0x3a4148, glass: 0x5d7480, cell: [1.6, 3.8], win: [0.92, 0.8], glassRough: 0.06, glassMetal: 0.92, frameRough: 0.45, frameMetal: 0.7, lit: 0.55 },
  /* dark bronze glass in a black frame */
  bronze: { frame: 0x1d1e21, glass: 0x4a4238, cell: [1.5, 3.6], win: [0.88, 0.76], glassRough: 0.05, glassMetal: 0.95, frameRough: 0.35, frameMetal: 0.8, lit: 0.5, fins: 0.5 },
  /* pale limestone with punched windows */
  stone: { frame: 0xb9b09f, glass: 0x3f4a52, cell: [3.2, 3.6], win: [0.5, 0.56], glassRough: 0.08, glassMetal: 0.8, frameRough: 0.85, frameMetal: 0, lit: 0.62 },
  /* raw concrete with ribbon windows */
  concrete: { frame: 0x8e8b85, glass: 0x34404a, cell: [2.4, 3.5], win: [0.86, 0.48], glassRough: 0.07, glassMetal: 0.85, frameRough: 0.9, frameMetal: 0, lit: 0.6 },
  /* brick apartments */
  brick: { frame: 0x6d4636, glass: 0x2e363d, cell: [2.8, 3.1], win: [0.42, 0.58], glassRough: 0.1, glassMetal: 0.75, frameRough: 0.92, frameMetal: 0, lit: 0.7 },
};

export type Shared = {
  uNight: { value: number };
  uTime: { value: number };
};

export const shared: Shared = { uNight: { value: 0 }, uTime: { value: 0 } };

const NOISE = /* glsl */ `
  float fHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float fNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(fHash(i), fHash(i + vec2(1.0, 0.0)), f.x), mix(fHash(i + vec2(0.0, 1.0)), fHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
`;

/** Adds world position and world normal varyings to a standard material. */
function worldVaryings(sh: THREE.WebGLProgramParametersWithUniforms) {
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vFP;\nvarying vec3 vFN;\nflat varying float vSeed;")
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      mat4 fM = modelMatrix;
      #ifdef USE_INSTANCING
        fM = modelMatrix * instanceMatrix;
      #endif
      vFP = (fM * vec4(position, 1.0)).xyz;
      vFN = normalize(mat3(fM) * normal);
      /* one seed per building, passed flat: hashing an interpolated value would sparkle */
      vSeed = floor(fract(sin(dot(floor(fM[3].xz), vec2(12.9898, 78.233))) * 43758.5453) * 997.0) / 997.0;`,
    );
  sh.fragmentShader = sh.fragmentShader.replace(
    "#include <common>",
    `#include <common>\nvarying vec3 vFP;\nvarying vec3 vFN;\nflat varying float vSeed;\nuniform float uNight;\nuniform float uTime;\n${NOISE}`,
  );
}

/** Reflections come from scene.environment, which follows the time of day. */
export function facadeMaterial(style: FacadeStyle): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const u = {
    uFrame: { value: new THREE.Color(style.frame) },
    uGlass: { value: new THREE.Color(style.glass) },
    uCell: { value: new THREE.Vector2(...style.cell) },
    uWin: { value: new THREE.Vector2(...style.win) },
    uRough: { value: new THREE.Vector4(style.glassRough, style.glassMetal, style.frameRough, style.frameMetal) },
    uLit: { value: style.lit },
    uFins: { value: style.fins ?? 0 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, shared);
    worldVaryings(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uFrame; uniform vec3 uGlass; uniform vec2 uCell; uniform vec2 uWin; uniform vec4 uRough;
        uniform float uLit; uniform float uFins;
        float fGlass; float fLit; vec3 fLitCol; float fRoof;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 fn = normalize(vFN);
        fRoof = step(0.6, fn.y);
        /* facade coordinates: along the wall, and up */
        vec2 fuv = abs(fn.x) > 0.5 ? vec2(vFP.z * sign(fn.x), vFP.y) : vec2(-vFP.x * sign(fn.z), vFP.y);
        vec2 g = fuv / uCell;
        vec2 id = floor(g);
        vec2 f = fract(g);
        vec2 fw = fwidth(g);
        float far = smoothstep(0.25, 0.7, max(fw.x, fw.y));
        vec2 d = abs(f - 0.5) - uWin * 0.5;
        vec2 aa = max(fw, vec2(1e-4)) * 0.75;
        float wm = (1.0 - smoothstep(-aa.x, aa.x, d.x)) * (1.0 - smoothstep(-aa.y, aa.y, d.y));
        /* no windows in the ground course below 1 m or on the roof */
        wm *= step(1.0, vFP.y);
        wm = mix(wm, uWin.x * uWin.y, far);
        wm *= 1.0 - fRoof;
        fGlass = wm;
        /* offices are lit in runs: a tenant's whole bay of six to ten windows, often a whole floor */
        vec2 bay = vec2(floor(id.x / (6.0 + floor(vSeed * 5.0))), id.y);
        float r1 = fHash(bay + vSeed * 91.0);
        float r2 = fHash(bay.yx + vSeed * 17.0 + 3.1);
        float floorR = fHash(vec2(id.y, vSeed * 53.0));
        /* and some buildings are mostly empty, others busy */
        float busy = clamp(uLit * (0.35 + 0.9 * vSeed), 0.05, 0.85);
        float on = step(r1 * 0.45 + floorR * 0.55, busy);
        on = mix(on, busy * 0.8, far);
        /* office light: mostly warm white, some cool, with a ceiling glow and blinds part-way down */
        vec3 warm = mix(vec3(1.0, 0.78, 0.52), vec3(0.85, 0.9, 1.0), step(0.72, r2));
        float blind = mix(0.0, 0.6, step(0.6, fHash(id + 7.7)) * fHash(id + 2.3));
        float inside = smoothstep(0.1, 0.9, f.y) * 0.65 + 0.35;
        inside *= 1.0 - step(1.0 - blind, f.y) * 0.75;
        inside = mix(inside, 0.7, far);
        fLit = on * wm;
        fLitCol = warm * inside * (0.45 + 0.7 * r2);
        /* the ground floor is shops and lobbies: tall glass, lit warm, with a fascia above */
        float shop = 1.0 - step(4.8, vFP.y);
        if (shop > 0.5) {
          float sx = fract(fuv.x / 4.0);
          float sm = step(0.6, vFP.y) * (1.0 - step(4.0, vFP.y)) * step(0.04, sx) * (1.0 - step(0.96, sx));
          sm *= 1.0 - fRoof;
          float shopOn = step(0.3, fHash(vec2(floor(fuv.x / 4.0), vSeed * 31.0)));
          wm = sm;
          fGlass = sm;
          fLit = sm * shopOn;
          fLitCol = vec3(1.0, 0.8, 0.58) * (0.8 + 0.5 * smoothstep(4.0, 0.6, vFP.y));
        }
        /* frame colour with a little weathering, and fins that catch the light */
        float grime = fNoise(vFP.xz * 0.3 + vFP.y * 0.05) * 0.25 + fNoise(fuv * vec2(0.2, 0.6)) * 0.15;
        vec3 frame = uFrame * (0.88 + grime) * (0.92 + 0.16 * vSeed);
        float fin = uFins * (1.0 - smoothstep(0.0, 0.08, abs(f.x - 0.02))) * (1.0 - far);
        frame *= 1.0 + fin * 0.6;
        vec3 glass = uGlass * (0.85 + 0.3 * r2);
        vec3 roof = vec3(0.32, 0.32, 0.31) * (0.8 + grime);
        diffuseColor.rgb = mix(mix(frame, glass, wm), roof, fRoof);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(uRough.z, uRough.x + fHash(id + 5.0) * 0.06, fGlass), 0.9, fRoof);`,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(mix(uRough.w, uRough.y, fGlass), 0.0, fRoof);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += fLitCol * fLit * (0.03 + uNight * uNight * 0.85 + uNight * 0.2);`,
      );
  };
  m.customProgramCacheKey = () => `facade-${style.cell.join("x")}-${style.win.join("x")}-${style.fins ?? 0}`;
  return m;
}
