import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { projects } from "@/lib/projects";

import { buildCity, TOWER } from "./city";
import { createShot, nightAt } from "./path";
import { hazeColor, setSky, skyMaterial } from "./sky";
import { buildTower } from "./tower";

export type Quality = "high" | "balanced" | "low";

export type Cine = {
  /** Scroll progress, 0 to 1. The camera eases towards it. */
  setProgress: (p: number) => void;
  setActive: (on: boolean) => void;
  dispose: () => void;
};

const PRESET: Record<Quality, { radius: number; cars: number; shadow: number; ao: boolean; pr: number; samples: number; lights: number }> = {
  high: { radius: 7, cars: 200, shadow: 2048, ao: true, pr: 1.75, samples: 4, lights: 3 },
  balanced: { radius: 6, cars: 130, shadow: 1024, ao: false, pr: 1.5, samples: 4, lights: 3 },
  low: { radius: 4, cars: 60, shadow: 0, ao: false, pr: 1.25, samples: 0, lights: 1 },
};

/* a film grade: a touch of teal in the shadows and warmth in the highlights, vignette and grain */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * vec3(0.94, 1.0, 1.06), 1.0 - smoothstep(0.0, 0.4, l));
      col = mix(col, col * vec3(1.05, 1.0, 0.94), smoothstep(0.45, 1.0, l));
      vec2 q = vUv - 0.5;
      col *= 1.0 - dot(q, q) * 0.55;
      col += (hash(vUv * uRes + fract(uTime) * 61.0) - 0.5) * 0.018;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

export async function createCine(o: {
  canvas: HTMLCanvasElement;
  quality: Quality;
  reduceMotion: boolean;
  onProgress?: (done: number, total: number, label: string) => void;
  onContextLost?: () => void;
}): Promise<Cine | null> {
  const preset = PRESET[o.quality];
  const total = 7;
  let done = 0;
  const step = async (label: string) => {
    o.onProgress?.(++done, total, label);
    /* give the page a frame between the heavy steps */
    await new Promise((r) => setTimeout(r, 0));
  };

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = preset.shadow > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const pr = Math.min(window.devicePixelRatio || 1, preset.pr);
  renderer.setPixelRatio(pr);
  const size = () => ({ w: o.canvas.clientWidth || window.innerWidth, h: o.canvas.clientHeight || window.innerHeight });
  let { w, h } = size();
  renderer.setSize(w, h, false);

  const abort = new AbortController();
  o.canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      o.onContextLost?.();
    },
    { signal: abort.signal },
  );

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.3, 2600);
  scene.fog = new THREE.FogExp2(0xc9a487, 0.0014);
  await step("Setting the light");

  /* ---------- sky, sun and reflections ---------- */
  const sky = skyMaterial();
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), sky);
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = -1;
  scene.add(skyMesh);
  const sunDir = new THREE.Vector3();
  const sunAt = (night: number, out: THREE.Vector3) => {
    const elev = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(8, -4, night));
    return out.set(-0.42, Math.sin(elev), -1).normalize();
  };
  const hemi = new THREE.HemisphereLight(0x9fb6d8, 0x3b342c, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc48a, 3);
  sun.castShadow = preset.shadow > 0;
  if (sun.castShadow) {
    sun.shadow.mapSize.setScalar(preset.shadow);
    const c = sun.shadow.camera;
    c.left = -150;
    c.right = 150;
    c.top = 150;
    c.bottom = -150;
    c.near = 1;
    c.far = 900;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.6;
  }
  scene.add(sun, sun.target);

  /* the environment map, rendered from the sky itself at three times of day; reflections follow the hour */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMaterial());
  envScene.add(envSky);
  /* a dark ground in the reflection, so glass mirrors the city's floor and not the sky below */
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(9.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a1a1c }));
  envGround.position.y = -0.4;
  envScene.add(envGround);
  const envs = [0, 0.5, 1].map((n) => {
    setSky(envSky.material as THREE.ShaderMaterial, n, sunAt(n, new THREE.Vector3()));
    (envGround.material as THREE.MeshBasicMaterial).color.setScalar(0.2 - n * 0.16);
    return pmrem.fromScene(envScene, 0.02).texture;
  });
  pmrem.dispose();
  scene.environment = envs[0];
  await step("Laying out the streets");

  /* ---------- the city and the tower ---------- */
  const font = getComputedStyle(document.body).getPropertyValue("--font-body").trim() || "Arial";
  const city = buildCity(scene, { radius: preset.radius, cars: preset.cars, detail: o.quality !== "low", shadows: preset.shadow > 0 });
  await step("Raising the towers");
  const tower = buildTower(scene, projects, { lights: preset.lights, font: `${font}, Arial, sans-serif` });
  await step("Opening the lobby");

  /* ---------- post ---------- */
  const target = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: preset.samples });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pr);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  let gtao: GTAOPass | null = null;
  if (preset.ao) {
    gtao = new GTAOPass(scene, camera, w * pr, h * pr);
    gtao.updateGtaoMaterial({ radius: 2.5, distanceExponent: 1.5, thickness: 3, scale: 1, samples: 12 });
    gtao.blendIntensity = 0.8;
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.6, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GRADE);
  grade.uniforms.uRes.value.set(w * pr, h * pr);
  composer.addPass(grade);
  await step("Developing the film");

  /* ---------- the shot ---------- */
  const shot = createShot();
  let goal = 0;
  let p = 0;
  let first = true;
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const haze = new THREE.Color();
  const apply = (t: number, dt: number) => {
    camera.fov = shot.at(p, pos, look);
    /* a slow drift, as if the camera were on a drone and not a rail */
    if (!o.reduceMotion) {
      const amp = pos.y > 20 ? 0.6 : 0.04;
      pos.x += Math.sin(t * 0.31) * amp;
      pos.y += Math.sin(t * 0.23 + 1.3) * amp * 0.6;
    }
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    skyMesh.position.copy(camera.position);

    const night = nightAt(p);
    sunAt(night, sunDir);
    setSky(sky, night, sunDir);
    scene.environment = envs[night < 0.3 ? 0 : night < 0.75 ? 1 : 2];
    scene.environmentIntensity = THREE.MathUtils.lerp(1, 0.55, night);
    hazeColor(night, haze);
    (scene.fog as THREE.FogExp2).color.copy(haze);
    const indoors = pos.z < TOWER.z + TOWER.d / 2 && pos.z > TOWER.z - TOWER.d / 2 && Math.abs(pos.x) < TOWER.w / 2;
    (scene.fog as THREE.FogExp2).density = indoors ? 0.0003 : THREE.MathUtils.lerp(0.00075, 0.0006, night);
    sun.intensity = THREE.MathUtils.lerp(3.2, 0.0, THREE.MathUtils.smoothstep(night, 0.3, 0.8));
    sun.color.setHSL(0.07, 0.85, THREE.MathUtils.lerp(0.72, 0.55, night));
    hemi.intensity = THREE.MathUtils.lerp(0.9, 0.35, night);
    hemi.color.setHSL(0.6, 0.45, THREE.MathUtils.lerp(0.72, 0.4, night));
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.0, 1.12, night);
    bloom.strength = THREE.MathUtils.lerp(0.3, 0.55, night);
    bloom.threshold = THREE.MathUtils.lerp(0.92, 0.8, night);

    /* the shadow camera follows what the camera looks at */
    const focus = indoors ? pos : look.clone().lerp(pos, 0.35);
    sun.target.position.copy(focus);
    sun.position.copy(focus).addScaledVector(sunDir, 400);
    city.update(t, o.reduceMotion ? 0 : dt, night, focus);
    tower.update(camera.position, t, night, shot.screen(p));
  };

  /* compile every shader before the first frame, without blocking the page */
  apply(0, 0);
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    /* compiling ahead is only an optimisation */
  }
  await step("Warming up the lights");
  composer.render(0);
  await step("Ready");

  /* ---------- loop ---------- */
  let raf = 0;
  let active = true;
  let last = performance.now();
  let idleFrames = 0;
  let slow = 0;
  let ratio = pr;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const k = o.reduceMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    const moving = Math.abs(goal - p) > 0.00002;
    p += (goal - p) * k;
    /* when nothing scrolls, the city still lives (cars, lights) at a calmer frame rate */
    idleFrames = moving ? 0 : idleFrames + 1;
    if (!moving && idleFrames % 2 === 1) return;
    apply(t, moving ? dt : dt * 2);
    grade.uniforms.uTime.value = t;
    composer.render(dt);
    /* a simple governor: if frames keep running long, render fewer pixels */
    if (dt > 0.034) slow++;
    else slow = Math.max(0, slow - 1);
    if (slow > 40 && ratio > 0.75) {
      ratio = Math.max(0.75, ratio * 0.85);
      renderer.setPixelRatio(ratio);
      composer.setPixelRatio(ratio);
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      if (gtao) gtao.enabled = false;
      slow = 0;
    }
  };
  const start = () => {
    if (raf || !active || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()), { signal: abort.signal });
  const ro = new ResizeObserver(() => {
    ({ w, h } = size());
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    grade.uniforms.uRes.value.set(w * ratio, h * ratio);
  });
  ro.observe(o.canvas);
  start();

  return {
    setProgress(v) {
      goal = THREE.MathUtils.clamp(v, 0, 1);
      /* the first position cuts straight to where the visitor already is */
      if (first) {
        first = false;
        p = goal;
      }
    },
    setActive(on) {
      active = on;
      if (on) start();
      else stop();
    },
    dispose() {
      stop();
      abort.abort();
      ro.disconnect();
      city.dispose();
      tower.dispose();
      envs.forEach((e) => e.dispose());
      composer.dispose();
      target.dispose();
      gtao?.dispose();
      bloom.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose?.();
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
