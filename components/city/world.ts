import * as THREE from "three";

import { canvasTex, rng, type Kit } from "./kit";
import { leafBlob, windify } from "./nature";
import { Sky as PhysicalSky } from "three/examples/jsm/objects/Sky.js";
import { asphaltMaps, pavingMaps, rippleNormal, worldUV } from "./textures";
import { ISLETS, SEA_Y, SHORE_GLSL, type Palms } from "./coast";
import type { Folks } from "./people";
import type { Traffic } from "./traffic";

export { SEA_Y };

/* ------------------------------------------------------------------ */
/* Sky                                                                                             */
/* ------------------------------------------------------------------ */
const SKY_DAY = {
  top: new THREE.Color(0x2d7fe0),
  mid: new THREE.Color(0x76bdf2),
  hor: new THREE.Color(0xbfe4fa),
  sun: new THREE.Color(0xfff3dc),
};
const SKY_NIGHT = {
  top: new THREE.Color(0x040818),
  mid: new THREE.Color(0x0e1a44),
  hor: new THREE.Color(0x1d2d63),
  sun: new THREE.Color(0x8fb0ff),
};

export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: SKY_DAY.top.clone() },
      uMid: { value: SKY_DAY.mid.clone() },
      uHor: { value: SKY_DAY.hor.clone() },
      uSun: { value: SKY_DAY.sun.clone() },
      uSunDir: { value: new THREE.Vector3(-0.62, 0.34, 0.7).normalize() },
      uSunPower: { value: 1 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uSun;
      uniform vec3 uSunDir; uniform float uSunPower;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.3, 1.0);
        vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.32, h));
        col = mix(col, uTop, smoothstep(0.22, 0.95, h));
        float s = max(dot(d, uSunDir), 0.0);
        col += uSun * uSunPower * (pow(s, 6.0) * 0.16 + pow(s, 70.0) * 0.5 + pow(s, 1400.0) * 5.0);
        col = mix(col, uHor * 0.55, smoothstep(0.0, -0.25, d.y));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export type Sky = {
  /** Horizon colour, reused as the fog colour. */
  fog: THREE.Color;
  update: (night: number, sunDir: THREE.Vector3, cam: THREE.Vector3) => void;
};

/** The Preetham daylight model on a clear day. alpha fades it into the stylised sky. */
export function createPhysicalSky(): { mesh: PhysicalSky; set: (sunDir: THREE.Vector3, alpha: number) => void } {
  const mesh = new PhysicalSky();
  const m = mesh.material as THREE.ShaderMaterial;
  m.uniforms.uAlpha = { value: 1 };
  m.uniforms.uGain = { value: 0.62 };
  m.fragmentShader = m.fragmentShader
    .replace("uniform vec3 up;", "uniform vec3 up;\nuniform float uAlpha;\nuniform float uGain;")
    .replace("gl_FragColor = vec4( retColor, 1.0 );", "gl_FragColor = vec4( retColor * uGain, uAlpha );");
  m.transparent = true;
  m.uniforms.turbidity.value = 2.4;
  m.uniforms.rayleigh.value = 1.3;
  m.uniforms.mieCoefficient.value = 0.004;
  m.uniforms.mieDirectionalG.value = 0.86;
  mesh.scale.setScalar(440);
  mesh.frustumCulled = false;
  return {
    mesh,
    set(sunDir, alpha) {
      (m.uniforms.sunPosition.value as THREE.Vector3).copy(sunDir);
      m.uniforms.uAlpha.value = alpha;
    },
  };
}

export function makeSky(scene: THREE.Scene): Sky {
  const mat = createSkyMaterial();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), mat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  scene.add(dome);
  const phys = createPhysicalSky();
  phys.mesh.renderOrder = -9;
  scene.add(phys.mesh);

  const R = rng(99);
  const n = 1100;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = R() * Math.PI * 2;
    const y = 0.04 + R() * 0.96;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(u) * r * 420, y * 420, Math.sin(u) * r * 420], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.7,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(sg, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  const fog = new THREE.Color();
  return {
    fog,
    update(night, sunDir, cam) {
      const u = mat.uniforms;
      (u.uTop.value as THREE.Color).lerpColors(SKY_DAY.top, SKY_NIGHT.top, night);
      (u.uMid.value as THREE.Color).lerpColors(SKY_DAY.mid, SKY_NIGHT.mid, night);
      (u.uHor.value as THREE.Color).lerpColors(SKY_DAY.hor, SKY_NIGHT.hor, night);
      (u.uSun.value as THREE.Color).lerpColors(SKY_DAY.sun, SKY_NIGHT.sun, night);
      (u.uSunDir.value as THREE.Vector3).copy(sunDir);
      u.uSunPower.value = 1 - night * 0.55;
      fog.copy(u.uHor.value as THREE.Color);
      dome.position.copy(cam);
      phys.mesh.position.copy(cam);
      /* a light layer of real scattering over the clean game-sky gradient */
      phys.set(sunDir, Math.max(0, 0.35 - night * 0.6));
      stars.position.copy(cam);
      starMat.opacity = Math.max(0, night * 1.2 - 0.25);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Sea                                                                                             */
/* ------------------------------------------------------------------ */
export type Sea = { update: (t: number, night: number) => void };

/**
 * A stylised tropical sea: turquoise over the sand, deep blue further out, with foam that hugs every
 * shoreline and rolls in as broken bands. The shore distance is computed per pixel from the same
 * formula that shapes the beaches, so the two always meet.
 */
export function makeSea(scene: THREE.Scene): Sea {
  const size = 340;
  const seg = 170;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x061a2c,
    roughness: 0.22,
    metalness: 0,
    normalMap: rippleNormal(70),
    normalScale: new THREE.Vector2(0.28, 0.28),
    envMapIntensity: 0.3,
  });
  const seaU = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uIslets: { value: ISLETS.map(([x, z, r]) => new THREE.Vector3(x, z, r)) },
  };
  const head = `
    uniform float uTime; uniform float uNight; uniform vec3 uIslets[${ISLETS.length}];
    varying float vWave;
    varying vec2 vSeaP;
    ${SHORE_GLSL}`;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, seaU);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\n${head}`)
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float wx = position.x; float wz = position.z;
        float calm = smoothstep(0.0, 6.0, shoreDist(position.xz));
        float h = (sin(wx * 0.35 + uTime * 0.9) * 0.08 + cos(wz * 0.3 + uTime * 0.7) * 0.07
          + sin((wx + wz) * 0.2 + uTime * 0.5) * 0.09) * calm;
        transformed.y += h;
        vWave = h;
        vSeaP = position.xz;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        ${head}
        float seaFoam = 0.0;
        float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float sNoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float d = shoreDist(vSeaP);
        float n1 = sNoise(vSeaP * 1.6 + vec2(uTime * 0.18, -uTime * 0.12));
        float n2 = sNoise(vSeaP * 0.3 - vec2(uTime * 0.04));
        vec3 water = mix(vec3(0.1, 0.8, 0.78), vec3(0.03, 0.66, 0.86), smoothstep(0.1, 3.8, d + (n2 - 0.5) * 1.4));
        water = mix(water, vec3(0.02, 0.45, 0.8), smoothstep(3.0, 12.0, d));
        water = mix(water, vec3(0.02, 0.33, 0.68), smoothstep(18.0, 70.0, d));
        water = mix(water, vec3(0.8, 0.97, 0.97), smoothstep(0.08, 0.22, vWave) * 0.3);
        float edge = 1.0 - smoothstep(0.04, 0.22 + n1 * 0.3, d);
        float band = smoothstep(0.6, 0.92, sin(d * 3.3 - uTime * 1.3 + n2 * 5.0) * 0.5 + 0.5)
          * (1.0 - smoothstep(0.4, 2.6, d)) * smoothstep(0.3, 0.6, n1);
        seaFoam = clamp(max(edge, band * 0.75), 0.0, 1.0);
        vec3 dayCol = mix(water, vec3(0.98, 1.0, 1.0), seaFoam);
        diffuseColor.rgb = mix(dayCol, diffuseColor.rgb * (1.0 + seaFoam * 1.5), uNight);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.95, seaFoam);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `vec2 r1 = vNormalMapUv + vec2(uTime * 0.021, uTime * 0.013);
        vec2 r2 = vNormalMapUv * 2.3 - vec2(uTime * 0.017, -uTime * 0.026);
        vec3 n1m = texture2D(normalMap, r1).xyz * 2.0 - 1.0;
        vec3 n2m = texture2D(normalMap, r2).xyz * 2.0 - 1.0;
        vec3 mapN = normalize(vec3(n1m.xy + n2m.xy, n1m.z * n2m.z));
        mapN.xy *= normalScale * (1.0 - seaFoam) * (1.0 - smoothstep(30.0, 110.0, length(vSeaP)) * 0.7);
        normal = normalize(tbn * mapN);`,
      );
  };
  mat.customProgramCacheKey = () => "tropical-sea";
  const sea = new THREE.Mesh(geo, mat);
  sea.position.y = SEA_Y;
  sea.receiveShadow = true;
  scene.add(sea);

  return {
    update(t, night) {
      seaU.uTime.value = t;
      seaU.uNight.value = night;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Roads, crossings, lamps, trees and the people on the pavements                                  */
/* ------------------------------------------------------------------ */
export function makeStreets(kit: Kit, island: THREE.Group, traffic: Traffic, folks: Folks, palms: Palms): void {
  const asphalt = worldUV(new THREE.MeshStandardMaterial({ ...asphaltMaps(1), roughness: 1, normalScale: new THREE.Vector2(0.7, 0.7) }), 0.45);
  const curb = worldUV(new THREE.MeshStandardMaterial({ ...pavingMaps(1), roughness: 1, normalScale: new THREE.Vector2(0.9, 0.9) }), 1.1);
  const paint = kit.mat(0xfff1d0, 0.7);
  const amber = kit.mat(0xffd36b, 0.7);

  kit.box(island, 21, 0.04, 1.6, asphalt, 0, 0, 0, false);
  kit.box(island, 1.6, 0.038, 21, asphalt, 0, 0, 0, false);

  for (const s of [-1, 1] as const) {
    for (let u = 1.7; u < 10; u += 1.0) {
      kit.box(island, 0.5, 0.005, 0.07, amber, s * u, 0.04, 0, false);
      kit.box(island, 0.07, 0.005, 0.5, amber, 0, 0.038, s * u, false);
    }
    for (const e of [-1, 1] as const) {
      kit.box(island, 8.8, 0.005, 0.05, paint, s * 5.6, 0.04, e * 0.7, false);
      kit.box(island, 0.05, 0.005, 8.8, paint, e * 0.7, 0.038, s * 5.6, false);
    }
    /* zebra crossings */
    for (let i = -3; i <= 3; i++) {
      kit.box(island, 0.34, 0.006, 0.13, paint, s * 1.0, 0.04, i * 0.2, false);
      kit.box(island, 0.13, 0.006, 0.34, paint, i * 0.2, 0.039, s * 1.0, false);
    }
  }

  /* pavements, quadrant by quadrant */
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      kit.box(island, 9.2, 0.1, 0.55, curb, sx * 5.4, 0, sz * 1.075, false);
      kit.box(island, 0.55, 0.1, 8.65, curb, sx * 1.075, 0, sz * 5.675, false);
    }
  }

  /* a glowing hub where the two APIs cross */
  const hubMat = kit.glowMat(0xff6b57, 1.4, 3.8, 0x2a1210);
  const hub = kit.put(island, new THREE.TorusGeometry(0.52, 0.03, 8, 48), hubMat, 0, 0.05, 0, false);
  hub.rotation.x = Math.PI / 2;
  const hub2 = kit.put(island, new THREE.TorusGeometry(0.28, 0.02, 8, 36), hubMat, 0, 0.05, 0, false);
  hub2.rotation.x = Math.PI / 2;
  kit.pointLight(island, 0xff8a6a, 0.3, 1.2, 4, 0, 0.7, 0);
  traffic.lights(island);

  /* lamps */
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      for (const u of [3.0, 5.6, 8.2]) {
        kit.lamp(island, sx * u, sz * 1.27, 1.2);
        kit.lamp(island, sx * 1.27, sz * u, 1.2);
      }
    }
  }

  /* trees: a ring around the rim and a few in the corners */
  const rr = rng(17);
  const trunk = kit.mat(0x8a5a3c, 0.9);
  const leafA = [0x3f9a5a, 0x5aae5e, 0x2f8a52].map((c) =>
    windify(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, vertexColors: true }), "crown"),
  );
  const tree = (x: number, z: number, s: number) => {
    /* every other one is a palm, drawn with the rest in one instanced mesh */
    if (rr() < 0.5) {
      palms.add(x, 0, z, s * 0.85, rr() * 6.28);
      return;
    }
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    island.add(g);
    kit.cyl(g, 0.07, 0.11, 0.55, trunk, 0, 0, 0, 6);
    const leaf = leafA[Math.floor(rr() * 3)];
    {
      /* a broad crown built from a few overlapping leaf masses */
      const parts: [number, number, number, number][] = [
        [0, 1.0, 0, 0.5],
        [0.3, 0.8, 0.12, 0.36],
        [-0.28, 0.82, -0.12, 0.34],
        [0.05, 0.78, -0.3, 0.32],
        [-0.08, 1.28, 0.06, 0.32],
      ];
      parts.forEach(([px, py, pz, r]) => {
        const m = kit.put(g, leafBlob(Math.floor(rr() * 6), 3), leaf, px, py, pz);
        m.scale.setScalar(r);
        m.rotation.y = rr() * 6.28;
      });
    }
  };
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.1;
    const near = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].some((q) => Math.abs(Math.atan2(Math.sin(a - q), Math.cos(a - q))) < 0.2);
    if (near) continue;
    const rad = 10.35 + rr() * 0.5;
    tree(Math.cos(a) * rad, Math.sin(a) * rad, 0.9 + rr() * 0.6);
  }

  /* pedestrians on loops around each block */
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      const loop: [number, number][] = [
        [sx * 1.1, sz * 1.1],
        [sx * 7.15, sz * 1.1],
        [sx * 7.15, sz * 7.15],
        [sx * 1.1, sz * 7.15],
      ];
      const rev = [...loop].reverse() as [number, number][];
      for (let i = 0; i < 3; i++) {
        const p = folks.person(island, "walk", 0, 0.08, 0, 0, { prop: i === 1 ? "bag" : "none" });
        folks.walker(p, (i + (sx > 0 ? 1 : 0)) % 2 ? loop : rev, 0.34 + i * 0.06, (i * 0.33 + (sz > 0 ? 0.1 : 0)) % 1, 0.08);
      }
    }
  }

  /* traffic */
  const colors = [0xf25c54, 0x2f80c8, 0xfff4e3, 0x58c985, 0xc9b6ff, 0x33475b];
  let ci = 0;
  const nextColor = () => colors[ci++ % colors.length];
  traffic.add(island, "sedan", nextColor(), "x", 1, -9.0);
  traffic.add(island, "taxi", 0xffe08a, "x", 1, -4.8);
  traffic.add(island, "van", nextColor(), "x", 1, 2.5);
  traffic.add(island, "sedan", nextColor(), "x", -1, 8.4);
  traffic.add(island, "sedan", nextColor(), "x", -1, 3.6);
  traffic.add(island, "taxi", 0xffe08a, "x", -1, -2.5);
  traffic.add(island, "van", nextColor(), "z", 1, -8.2);
  traffic.add(island, "sedan", nextColor(), "z", 1, -2.4);
  traffic.add(island, "sedan", nextColor(), "z", -1, 7.2);
  traffic.add(island, "taxi", 0xffe08a, "z", -1, 1.8);

  kit.anims.push((t) => {
    hub.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    hub2.rotation.z = t * 1.5;
  });
}

/* ------------------------------------------------------------------ */
/* Light arcs: requests flying between the buildings                                              */
/* ------------------------------------------------------------------ */
export function makeArcs(kit: Kit, island: THREE.Group, points: Record<string, THREE.Vector3>): void {
  const pairs: [string, string][] = [
    ["villagewellth", "sahefa"],
    ["villagewellth", "diwan"],
    ["villagewellth", "watan"],
    ["sahefa", "oliva"],
    ["diwan", "oliva"],
    ["watan", "diwan"],
    ["carebooks", "sahefa"],
    ["carebooks", "oliva"],
    ["arvo", "sahefa"],
    ["arvo", "carebooks"],
    ["sgsoft", "villagewellth"],
    ["sgsoft", "watan"],
    ["sgsoft", "sahefa"],
  ];
  const lineMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xff8a6a).multiplyScalar(1.5),
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const orbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa27a).multiplyScalar(2.0), toneMapped: true });
  const orbGeo = new THREE.SphereGeometry(0.07, 8, 6);
  const orbs: { m: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; ph: number; sp: number }[] = [];
  pairs.forEach(([a, b], i) => {
    const pa = points[a];
    const pb = points[b];
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    mid.y = Math.max(pa.y, pb.y) + 2.4;
    const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
    island.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.01, 5, false), lineMat));
    for (let o = 0; o < 2; o++) {
      const m = new THREE.Mesh(orbGeo, orbMat);
      island.add(m);
      orbs.push({ m, curve, ph: (i * 0.17 + o * 0.5) % 1, sp: 0.14 + (i % 3) * 0.04 });
    }
  });
  void kit;
  kit.anims.push((t) => {
    orbs.forEach((o) => {
      const u = (o.ph + t * o.sp) % 1;
      o.m.position.copy(o.curve.getPoint(u));
      o.m.scale.setScalar(0.7 + Math.sin(u * Math.PI) * 0.8);
    });
    lineMat.opacity = 0.14 + kit.night * 0.14;
  });
}

/* ------------------------------------------------------------------ */
/* Life in the air and on the water                                                                */
/* ------------------------------------------------------------------ */
export function makeSkyLife(kit: Kit, scene: THREE.Scene): void {
  const R = rng(31);
  const dark = kit.mat(0x1d2a33, 0.5, 0.3);

  /* gulls */
  const birdMat = new THREE.MeshStandardMaterial({ color: 0xfff4e3, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x332a3a, emissiveIntensity: 0.4 });
  const wingGeo = new THREE.PlaneGeometry(0.3, 0.12);
  wingGeo.rotateX(-Math.PI / 2);
  const birds: { g: THREE.Group; l: THREE.Group; r: THREE.Group; rad: number; h: number; sp: number; a0: number; ph: number }[] = [];
  const flocks = [
    { rad: 15, h: 9.5, sp: 0.16, n: 5 },
    { rad: 19, h: 12, sp: -0.12, n: 4 },
    { rad: 13, h: 7.6, sp: 0.2, n: 3 },
  ];
  flocks.forEach((f, fi) => {
    for (let i = 0; i < f.n; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.28), birdMat);
      g.add(body);
      const mk = (s: number) => {
        const w = new THREE.Group();
        const m = new THREE.Mesh(wingGeo, birdMat);
        m.position.x = s * 0.15;
        w.add(m);
        g.add(w);
        return w;
      };
      const l = mk(-1);
      const r = mk(1);
      scene.add(g);
      birds.push({ g, l, r, rad: f.rad + (i % 2) * 0.7, h: f.h + (i % 3) * 0.35, sp: f.sp, a0: fi * 2 + i * 0.1, ph: R() * 6 });
    }
  });

  /* helicopter with a searchlight */
  const heli = new THREE.Group();
  scene.add(heli);
  const hullMat = kit.mat(0xf25c54, 0.45, 0.2);
  const hull = kit.ball(heli, 0.17, hullMat, 0, 0, 0, 12, false);
  hull.scale.set(0.85, 0.8, 1.5);
  kit.box(heli, 0.05, 0.05, 0.62, dark, 0, -0.03, -0.62, false);
  kit.box(heli, 0.02, 0.2, 0.1, dark, 0, 0.0, -0.9, false);
  kit.box(heli, 0.28, 0.015, 0.015, dark, 0, -0.17, 0.0, false).scale.set(0.28, 0.015, 0.6);
  const rotor = new THREE.Group();
  rotor.position.y = 0.19;
  heli.add(rotor);
  kit.box(rotor, 1.1, 0.01, 0.06, dark, 0, 0, 0, false);
  kit.box(rotor, 0.06, 0.01, 1.1, dark, 0, 0, 0, false);
  const tail = new THREE.Group();
  tail.position.set(0.05, 0.08, -0.9);
  heli.add(tail);
  kit.box(tail, 0.01, 0.3, 0.04, dark, 0, -0.15, 0, false);
  const nav = kit.ball(heli, 0.03, kit.glowMat(0xff3b30, 2, 6, 0x330000), 0, 0.1, -0.95, 6, false);
  kit.ball(heli, 0.03, kit.glowMat(0x3ddc84, 2, 6, 0x003300), 0.18, 0.0, 0.1, 6, false);
  const lightMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c0,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sl = new THREE.Mesh(new THREE.ConeGeometry(1.0, 7, 18, 1, true), lightMat);
  sl.position.set(0, -3.5, 0.3);
  void sl;
  heli.scale.setScalar(1.3);

  /* hot air balloon */
  const bal = new THREE.Group();
  scene.add(bal);
  const stripes = canvasTex(256, 128, (g, w, h) => {
    const cols = ["#f25c54", "#fff4e3", "#ffb27a", "#fff4e3", "#58c3a0", "#fff4e3", "#c9b6ff", "#fff4e3"];
    cols.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect((i * w) / cols.length, 0, w / cols.length + 1, h);
    });
  });
  const envMat = new THREE.MeshStandardMaterial({ map: stripes, emissiveMap: stripes, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.8 });
  kit.glows.push({ m: envMat, day: 0.12, night: 0.7 });
  const env = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), envMat);
  env.scale.set(1, 1.2, 1);
  env.position.y = 1.4;
  bal.add(env);
  kit.cone(bal, 0.32, 0.55, envMat, 0, 0.35, 0, 12, false).rotation.x = Math.PI;
  kit.box(bal, 0.34, 0.24, 0.34, 0x8a5a3c, 0, -0.1, 0, true);
  ([-1, 1] as const).forEach((sx) => ([-1, 1] as const).forEach((sz) => kit.box(bal, 0.012, 0.6, 0.012, 0x4a2f1f, sx * 0.15, 0.1, sz * 0.15, false).rotation.set(sz * 0.18, 0, -sx * 0.18)));
  kit.ball(bal, 0.05, kit.glowMat(0xffa040, 2, 6, 0x442200), 0, 0.3, 0, 8, false);
  bal.scale.setScalar(1.6);

  /* boats */
  const sailboat = (hullColor: number): THREE.Group => {
    const g = new THREE.Group();
    scene.add(g);
    const body = kit.mat(hullColor, 0.6);
    kit.box(g, 0.42, 0.18, 1.2, body, 0, 0, 0);
    const bow = kit.put(g, new THREE.ConeGeometry(0.3, 0.55, 4), body, 0, 0.09, 0.8);
    bow.rotation.set(Math.PI / 2, 0, Math.PI / 4);
    kit.box(g, 0.34, 0.03, 1.2, 0xc9955a, 0, 0.18, 0, false);
    kit.cyl(g, 0.02, 0.02, 1.7, 0xfff4e3, 0, 0.18, 0.1, 6, false);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.75, 0);
    shape.lineTo(0, 1.5);
    shape.closePath();
    const sg = new THREE.ShapeGeometry(shape);
    sg.rotateY(-Math.PI / 2);
    const sail = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0xfff4e3, side: THREE.DoubleSide, roughness: 0.9, emissive: 0x2a2030, emissiveIntensity: 0.4 }));
    sail.position.set(0, 0.28, 0.05);
    sail.castShadow = true;
    g.add(sail);
    kit.ball(g, 0.04, kit.glowMat(0xffd9a0, 1, 5, 0x442200), 0, 0.28, -0.55, 6, false);
    const wake = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 2.6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(0, 0.0, -1.9);
    g.add(wake);
    g.scale.setScalar(1.5);
    return g;
  };
  const ferry = (): THREE.Group => {
    const g = new THREE.Group();
    scene.add(g);
    kit.box(g, 0.9, 0.3, 3.2, 0x2f4a5c, 0, 0, 0);
    const cab = kit.facade("#fff4e3", { cols: 10, rows: 2, seed: 91, glass: "#9ad0e8", lit: 0.8, night: 3, rough: 0.6 });
    kit.box(g, 0.8, 0.45, 2.4, kit.sides(cab, kit.mat(0xe6e0d4)), 0, 0.3, -0.1);
    kit.box(g, 0.5, 0.25, 1.2, kit.sides(cab, kit.mat(0xe6e0d4)), 0, 0.75, -0.3);
    kit.cyl(g, 0.1, 0.12, 0.35, 0xf25c54, 0, 1.0, -0.7, 10, false);
    const w = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    w.rotation.x = -Math.PI / 2;
    w.position.set(0, 0.0, -3.2);
    g.add(w);
    g.scale.setScalar(1.3);
    return g;
  };
  const boats = [
    { g: sailboat(0xf25c54), rad: 23, sp: 0.04, a0: 0.5 },
    { g: sailboat(0x2f80c8), rad: 34, sp: 0.03, a0: 3.4 },
    { g: ferry(), rad: 43, sp: -0.022, a0: 2.2 },
  ];

  /* lighthouse on a rock */
  const lh = new THREE.Group();
  lh.position.set(ISLETS[1][0], -1.4, ISLETS[1][1]);
  scene.add(lh);
  for (let i = 0; i < 4; i++) {
    kit.cyl(lh, 0.55 - i * 0.05, 0.62 - i * 0.05, 0.9, i % 2 ? 0xfff4e3 : 0xf25c54, 0, 1.9 + i * 0.9, 0, 14);
  }
  kit.cyl(lh, 0.62, 0.62, 0.08, 0x1d2a33, 0, 5.5, 0, 14);
  const lamp = kit.ball(lh, 0.3, kit.glowMat(0xffe9a0, 1.6, 8, 0x665a20), 0, 5.85, 0, 12, false);
  kit.cone(lh, 0.5, 0.5, 0xf25c54, 0, 6.15, 0, 14);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a0,
    transparent: true,
    opacity: 0.06,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sweep = new THREE.Group();
  sweep.position.y = 5.85;
  lh.add(sweep);
  [0, Math.PI].forEach((a) => {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.9, 13, 16, 1, true), beamMat);
    b.rotation.z = Math.PI / 2;
    b.position.x = 6.5;
    const holder = new THREE.Group();
    holder.rotation.y = a;
    holder.add(b);
    sweep.add(holder);
  });

  /* soft clouds: billboards of layered puffs that catch the sunset on their lit side */
  const puff = canvasTex(256, 256, (g, w, h) => {
    const r = rng(77);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = w * (0.22 + r() * 0.56);
      const y = h * (0.38 + r() * 0.3);
      const rad = w * (0.1 + r() * 0.16);
      const gr = g.createRadialGradient(x, y - rad * 0.3, 0, x, y, rad);
      gr.addColorStop(0, "rgba(255,255,255,0.55)");
      gr.addColorStop(0.6, "rgba(250,246,244,0.25)");
      gr.addColorStop(1, "rgba(240,236,240,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    /* shade the underside */
    g.globalCompositeOperation = "source-atop";
    const under = g.createLinearGradient(0, h * 0.35, 0, h * 0.85);
    under.addColorStop(0, "rgba(255,236,220,0)");
    under.addColorStop(1, "rgba(150,120,140,0.55)");
    g.fillStyle = under;
    g.fillRect(0, 0, w, h);
  });
  const cloudMats: THREE.SpriteMaterial[] = [];
  const clouds: { g: THREE.Group; a: number; r: number; sp: number }[] = [];
  for (let c = 0; c < 12; c++) {
    const g = new THREE.Group();
    const n = 3 + (c % 3);
    for (let k = 0; k < n; k++) {
      const m = new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0.9, color: 0xffe2cc, fog: true });
      cloudMats.push(m);
      const sp = new THREE.Sprite(m);
      sp.position.set(k * 3.2 - n * 1.6 + R() * 1.5, R() * 1.2, R() * 2);
      sp.scale.set(7 + R() * 4, 4 + R() * 2, 1);
      sp.material.rotation = (R() - 0.5) * 0.2;
      g.add(sp);
    }
    const a = (c / 12) * Math.PI * 2;
    /* high enough that the camera never flies through them: they only show low on the horizon */
    const r = 80 + (c % 3) * 16;
    g.position.set(Math.cos(a) * r, 62 + (c % 4) * 5, Math.sin(a) * r);
    g.scale.setScalar(2.6 + (c % 3) * 0.8);
    scene.add(g);
    clouds.push({ g, a, r, sp: 0.006 + (c % 3) * 0.003 });
  }
  const cloudDay = new THREE.Color(0xffe2cc);
  const cloudNight = new THREE.Color(0x3a4670);

  /* drifting lanterns and fireflies */
  const nL = 110;
  const lp = new Float32Array(nL * 3);
  const seeds: { x: number; z: number; y: number; sp: number; ph: number }[] = [];
  for (let i = 0; i < nL; i++) {
    const a = R() * Math.PI * 2;
    const rad = 3 + R() * 12;
    seeds.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, y: R() * 11, sp: 0.18 + R() * 0.35, ph: R() * 6 });
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  const lanternMat = new THREE.PointsMaterial({
    color: 0xffd9a0,
    size: 0.16,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lanterns = new THREE.Points(lg, lanternMat);
  lanterns.frustumCulled = false;
  scene.add(lanterns);

  const tmp = new THREE.Vector3();
  kit.anims.push((t, dt) => {
    birds.forEach((b) => {
      const a = b.a0 + t * b.sp;
      const dirSign = b.sp > 0 ? 1 : -1;
      b.g.position.set(Math.cos(a) * b.rad, b.h + Math.sin(t * 0.7 + b.ph) * 0.4, Math.sin(a) * b.rad);
      tmp.set(-Math.sin(a) * dirSign, 0, Math.cos(a) * dirSign);
      b.g.rotation.y = Math.atan2(tmp.x, tmp.z);
      const f = Math.sin(t * 9 + b.ph) * 0.7;
      b.l.rotation.z = f;
      b.r.rotation.z = -f;
    });

    const ha = t * 0.23;
    heli.position.set(Math.cos(ha) * 14, 10.5 + Math.sin(t * 0.6) * 0.6, Math.sin(ha) * 14);
    heli.rotation.y = Math.atan2(-Math.sin(ha), Math.cos(ha));
    heli.rotation.z = -0.12;
    rotor.rotation.y = t * 30;
    tail.rotation.x = t * 40;
    nav.visible = Math.floor(t * 2) % 2 === 0;
    lightMat.opacity = 0.04 + kit.night * 0.12;

    const ba = t * 0.025 + 1.2;
    bal.position.set(Math.cos(ba) * 21 - 6, 8.5 + Math.sin(t * 0.5) * 0.5, Math.sin(ba) * 21 + 3);
    bal.rotation.y = t * 0.05;

    boats.forEach((b) => {
      const a = b.a0 + t * b.sp;
      const d = b.sp > 0 ? 1 : -1;
      b.g.position.set(Math.cos(a) * b.rad, SEA_Y + 0.1 + Math.sin(t * 1.3 + b.a0) * 0.05, Math.sin(a) * b.rad);
      b.g.rotation.set(0, Math.atan2(-Math.sin(a) * d, Math.cos(a) * d), Math.sin(t * 0.9 + b.a0) * 0.05);
    });

    sweep.rotation.y = t * 0.8;
    beamMat.opacity = kit.night * 0.07;
    lamp.scale.setScalar(1 + Math.sin(t * 5) * 0.04);

    cloudMats.forEach((m) => {
      m.color.lerpColors(cloudDay, cloudNight, kit.night);
      m.opacity = 0.9 - kit.night * 0.45;
    });
    clouds.forEach((c) => {
      c.a += c.sp * dt;
      c.g.position.x = Math.cos(c.a) * c.r;
      c.g.position.z = Math.sin(c.a) * c.r;
    });

    for (let i = 0; i < nL; i++) {
      const s = seeds[i];
      const y = (s.y + t * s.sp) % 11;
      lp[i * 3] = s.x + Math.sin(t * 0.5 + s.ph) * 0.5;
      lp[i * 3 + 1] = y + 0.4;
      lp[i * 3 + 2] = s.z + Math.cos(t * 0.4 + s.ph) * 0.5;
    }
    (lg.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    lanternMat.opacity = 0.15 + kit.night * 0.75;
  });
}
