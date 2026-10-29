import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { projects } from "@/lib/projects";

import { buildCharacter } from "./character";
import { Surfaces } from "./kit";
import { LINE, SHOP } from "./layout";
import { createShot, newFrame, timeAt } from "./path";
import { buildShops } from "./shops";
import { hazeColor, setSky, skyMaterial } from "./sky";
import { buildStreet } from "./street";

export type Quality = "high" | "balanced" | "low";

export type Cine = {
  /** Scroll progress, 0 to 1. The camera eases towards it. */
  setProgress: (p: number) => void;
  setActive: (on: boolean) => void;
  dispose: () => void;
};

const PRESET: Record<Quality, { detail: boolean; shadow: number; ao: boolean; pr: number; samples: number; lights: number }> = {
  high: { detail: true, shadow: 2048, ao: true, pr: 1.75, samples: 4, lights: 2 },
  balanced: { detail: true, shadow: 2048, ao: false, pr: 1.5, samples: 4, lights: 2 },
  low: { detail: false, shadow: 1024, ao: false, pr: 1.25, samples: 0, lights: 1 },
};

/* a film grade: a touch of teal in the shadows and warmth in the highlights, vignette and grain */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uFade: { value: 0 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uFade; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * vec3(0.94, 1.0, 1.06), 1.0 - smoothstep(0.0, 0.4, l));
      col = mix(col, col * vec3(1.05, 1.0, 0.94), smoothstep(0.45, 1.0, l));
      vec2 q = vUv - 0.5;
      col *= 1.0 - dot(q, q) * 0.55;
      col += (hash(vUv * uRes + fract(uTime) * 61.0) - 0.5) * 0.018;
      /* the cut to black between scenes */
      col *= 1.0 - uFade;
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
  const total = 8;
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
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.08, 3000);
  scene.fog = new THREE.FogExp2(0xc9a487, 0.0014);
  await step("Setting the light");

  /* ---------- sky, sun and reflections ---------- */
  const sky = skyMaterial();
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), sky);
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = -1;
  scene.add(skyMesh);
  const sunDir = new THREE.Vector3();
  /* the sun is low over the start of the street, so he walks away from it and turns back into it */
  const sunAt = (elevation: number, out: THREE.Vector3) => {
    const e = THREE.MathUtils.degToRad(elevation);
    return out.set(0.14 * Math.cos(e), Math.sin(e), Math.cos(e)).normalize();
  };
  const hemi = new THREE.HemisphereLight(0xb4c6e0, 0x5a5046, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a0, 3);
  sun.castShadow = preset.shadow > 0;
  if (sun.castShadow) {
    sun.shadow.mapSize.setScalar(preset.shadow);
    const c = sun.shadow.camera;
    c.left = -34;
    c.right = 34;
    c.top = 34;
    c.bottom = -34;
    c.near = 1;
    c.far = 400;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
  }
  scene.add(sun, sun.target);

  /* the environment map, rendered from the sky at three times of day; reflections follow the hour */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMaterial());
  envScene.add(envSky);
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(9.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5a554d }));
  envGround.position.y = -0.4;
  envScene.add(envGround);
  const hours = [0, 0.5, 1].map((p) => timeAt(p));
  const envs = hours.map(({ night, elevation }) => {
    setSky(envSky.material as THREE.ShaderMaterial, night, sunAt(elevation, new THREE.Vector3()));
    (envGround.material as THREE.MeshBasicMaterial).color.setScalar(0.32 - night * 0.3);
    return pmrem.fromScene(envScene, 0.02).texture;
  });
  pmrem.dispose();
  scene.environment = envs[0];
  await step("Paving the street");

  /* ---------- the town, the buildings and the man ---------- */
  const font = getComputedStyle(document.body).getPropertyValue("--font-body").trim() || "Arial";
  const surfaces = new Surfaces();
  const shadows = preset.shadow > 0;
  const street = buildStreet(scene, { shadows, detail: preset.detail, surfaces });
  await step("Raising the buildings");
  const shops = buildShops(scene, projects, { shadows, font: `${font}, Arial, sans-serif`, lights: preset.lights, surfaces });
  await step("Furnishing the rooms");
  const guide = buildCharacter({ shadows });
  scene.add(guide.root);
  await step("Waking him up");

  /* ---------- post ---------- */
  const target = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: preset.samples });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pr);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  let gtao: GTAOPass | null = null;
  if (preset.ao) {
    gtao = new GTAOPass(scene, camera, w * pr, h * pr);
    gtao.updateGtaoMaterial({ radius: 0.8, distanceExponent: 1.5, thickness: 1.5, scale: 1, samples: 12 });
    gtao.blendIntensity = 0.75;
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GRADE);
  grade.uniforms.uRes.value.set(w * pr, h * pr);
  composer.addPass(grade);
  await step("Developing the film");

  /* ---------- the shot ---------- */
  const shot = createShot();
  const shotFrame = newFrame();
  let goal = 0;
  let p = 0;
  let first = true;
  const haze = new THREE.Color();
  const focus = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const head = new THREE.Vector3();
  const apply = (t: number, dt: number) => {
    shot.at(p, shotFrame);
    camera.fov = shotFrame.fov;
    camera.position.copy(shotFrame.cam);
    /* a hand-held camera: the slightest breathing drift */
    if (!o.reduceMotion) {
      camera.position.x += Math.sin(t * 0.37) * 0.025;
      camera.position.y += Math.sin(t * 0.29 + 1.3) * 0.018;
    }
    /* on a tall phone screen the frame is narrow and the text sits in its lower half: step back
       from him when close, keep him in frame and tilt down so he stands in the upper half */
    const narrow = THREE.MathUtils.clamp(1 - camera.aspect, 0, 0.6);
    head.set(shotFrame.char.x, 1.35, shotFrame.char.z);
    const dist = camera.position.distanceTo(head);
    camera.position.addScaledVector(lookAt.subVectors(camera.position, head), narrow * 0.7 * (1 - THREE.MathUtils.smoothstep(dist, 4, 9)));
    lookAt.copy(shotFrame.look).lerp(head, narrow * 0.75);
    lookAt.y -= narrow * Math.min(dist, 12) * 0.3;
    camera.fov = shotFrame.fov * (1 + narrow * 0.3);
    camera.lookAt(lookAt);
    /* the still-frame script can place the camera anywhere */
    const dbg = globalThis as { __cityCapture?: boolean; __cineCam?: { pos: [number, number, number]; look: [number, number, number]; fov?: number } };
    if (dbg.__cityCapture && dbg.__cineCam) {
      camera.position.fromArray(dbg.__cineCam.pos);
      camera.lookAt(...dbg.__cineCam.look);
      camera.fov = dbg.__cineCam.fov ?? camera.fov;
    }
    camera.updateProjectionMatrix();
    skyMesh.position.copy(camera.position);

    const { night, elevation } = timeAt(p);
    sunAt(elevation, sunDir);
    setSky(sky, night, sunDir);
    scene.environment = envs[p < 0.33 ? 0 : p < 0.8 ? 1 : 2];
    const cx = Math.abs(camera.position.x);
    const indoors = cx > LINE + 0.3 && cx < LINE + SHOP.depth && camera.position.y < SHOP.floor;
    scene.environmentIntensity = indoors ? 0.55 : THREE.MathUtils.lerp(1, 0.7, night);
    hazeColor(night, haze);
    (scene.fog as THREE.FogExp2).color.copy(haze);
    (scene.fog as THREE.FogExp2).density = indoors ? 0.0004 : THREE.MathUtils.lerp(0.0013, 0.0016, night);
    sun.intensity = THREE.MathUtils.lerp(3.4, 2.2, THREE.MathUtils.smoothstep(night, 0.1, 0.42));
    sun.color.setHSL(0.075, 0.8, THREE.MathUtils.lerp(0.78, 0.66, night * 2));
    hemi.intensity = THREE.MathUtils.lerp(1.0, 0.7, night * 2);
    renderer.toneMappingExposure = indoors ? 1.05 : THREE.MathUtils.lerp(1.0, 1.08, night * 2);
    bloom.strength = THREE.MathUtils.lerp(0.22, 0.4, night * 2);
    grade.uniforms.uFade.value = shotFrame.fade;

    /* the shadows follow him */
    focus.copy(shotFrame.char);
    sun.target.position.copy(focus);
    sun.position.copy(focus).addScaledVector(sunDir, 200);
    street.update(t, night);
    shops.update(t, o.reduceMotion ? 0.016 : dt, night, shotFrame.char);
    guide.update(shotFrame, t, camera.position);
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
    /* when nothing scrolls, he still breathes and the town still lives, at a calmer frame rate */
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
      street.dispose();
      shops.dispose();
      guide.dispose();
      surfaces.dispose();
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
