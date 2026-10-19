import * as THREE from "three";

import { buildArvo, buildCarebooks, buildDiwan, buildOliva, buildSahefa, buildVillageWellth, buildWatan } from "./buildings";
import { createFx } from "./fx";
import { Kit, type BuildingId } from "./kit";
import { Folks } from "./people";
import { Traffic } from "./traffic";
import { createSkyMaterial, makeArcs, makeIsland, makeSea, makeSkyLife, makeSky, makeStreets } from "./world";

export type { BuildingId };
export type FocusKey = BuildingId | "home";

export type CityMetrics = {
  /** True on phone-sized screens, where the project deck sits under the island. */
  narrow: boolean;
  /** Bottom edge of the fixed phone header, in px. */
  topH: number;
  /** Top edge of the phone project deck, in px. */
  deckTop: number;
};

export type CityOptions = {
  canvas: HTMLCanvasElement;
  tagEls: Partial<Record<BuildingId, HTMLElement | null>>;
  getMetrics: () => CityMetrics;
  onPick: (id: BuildingId) => void;
  reduceMotion: boolean;
};

export type CityScene = {
  focus: (key: FocusKey) => void;
  select: (id: BuildingId | null) => void;
  relayout: () => void;
  /** 0 is golden hour, 1 is deep night. */
  setNight: (n: number) => void;
  dispose: () => void;
};

type FocusSpec = { t: [number, number, number]; d: number; yaw: number; pitch: number; w: number; hh: number };

const TAG_HEIGHT: Record<BuildingId, number> = {
  villagewellth: 11.9,
  sahefa: 4.0,
  diwan: 3.4,
  oliva: 3.3,
  watan: 4.9,
  carebooks: 4.4,
  arvo: 4.2,
};

const BUILDING_POS: Record<BuildingId, [number, number]> = {
  villagewellth: [-4.6, -4.6],
  sahefa: [4.6, -4.6],
  diwan: [-4.6, 4.6],
  oliva: [4.6, 4.6],
  watan: [-8.2, 0],
  carebooks: [9.0, 2.6],
  arvo: [9.0, -2.6],
};

const DUSK = 0.22;

function angDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export function createCityScene(opts: CityOptions): CityScene | null {
  const { canvas, tagEls, getMetrics, onPick, reduceMotion } = opts;
  const startNarrow = getMetrics().narrow;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = !startNarrow;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const abort = new AbortController();
  const { signal } = abort;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 900);
  scene.fog = new THREE.FogExp2(0xffb36b, 0.0075);

  /* light rig: a low sun that turns into moonlight, plus a cool fill */
  const hemi = new THREE.HemisphereLight(0xffd2a8, 0x3b6a6f, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc58a, 3.6);
  sun.castShadow = !startNarrow;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8fb8ff, 0.5);
  fill.position.set(10, 8, 12);
  scene.add(fill);

  /* soft reflections from the sky, used by glass and water */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envMesh = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), createSkyMaterial());
  envScene.add(envMesh);
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;

  /* the world */
  const kit = new Kit();
  kit.lightsOn = !startNarrow;
  const folks = new Folks(kit);
  const traffic = new Traffic(kit);
  const sky = makeSky(scene);
  const island = new THREE.Group();
  scene.add(island);
  const sea = makeSea(scene, island);
  makeIsland(kit, island);
  buildVillageWellth(kit, folks, island);
  buildSahefa(kit, folks, island);
  buildDiwan(kit, folks, island);
  buildOliva(kit, folks, island);
  const watan = buildWatan(kit, folks, island);
  buildCarebooks(kit, folks, island, "CareBooks");
  buildArvo(kit, folks, island, "Arvo");
  traffic.zones.push({ axis: "x", dir: -1, stop: -7.55, red: () => !watan.gate.open });
  traffic.zones.push({ axis: "x", dir: 1, stop: -8.85, red: () => !watan.gate.open });
  makeStreets(kit, island, traffic, folks);
  makeArcs(kit, island, {
    villagewellth: new THREE.Vector3(-4.6, 10.9, -4.6),
    sahefa: new THREE.Vector3(4.6, 3.4, -4.6),
    diwan: new THREE.Vector3(-4.6, 2.4, 4.6),
    oliva: new THREE.Vector3(4.6, 2.7, 4.6),
    watan: new THREE.Vector3(-8.2, 4.4, 0),
    carebooks: new THREE.Vector3(9.0, 3.6, 2.6),
    arvo: new THREE.Vector3(9.0, 3.4, -2.6),
  });
  makeSkyLife(kit, scene);

  const byId = {} as Record<BuildingId, THREE.Object3D>;
  island.children.forEach((c) => {
    if (c.userData.id) byId[c.userData.id as BuildingId] = c;
  });
  const ids = Object.keys(byId) as BuildingId[];

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.06, 8, 64),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf25c54).multiplyScalar(2.2) }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  island.add(ring);

  /* ---------- camera rig ---------- */
  const spec = (id: BuildingId, y: number, d: number, w: number, hh: number, pitch: number): FocusSpec => {
    const [x, z] = BUILDING_POS[id];
    return { t: [x, y, z], d, yaw: Math.atan2(-x, -z), pitch, w, hh };
  };
  const focusSpecs: Record<FocusKey, FocusSpec> = {
    home: { t: [0, 0.4, 0], d: 33, yaw: 0.75, pitch: 0.55, w: 12.5, hh: 9 },
    villagewellth: spec("villagewellth", 4.9, 28, 4.8, 6.4, 0.3),
    sahefa: spec("sahefa", 1.3, 17.5, 5.4, 3.0, 0.4),
    diwan: spec("diwan", 1.1, 16.5, 5.0, 2.7, 0.38),
    oliva: spec("oliva", 1.2, 16.5, 5.0, 3.0, 0.38),
    carebooks: { t: [9.0, 1.3, 2.6], d: 16, yaw: Math.PI * 0.92, pitch: 0.36, w: 3.8, hh: 3.2 },
    arvo: { t: [9.0, 1.3, -2.6], d: 16, yaw: 0.2, pitch: 0.36, w: 3.8, hh: 3.2 },
    watan: { t: [-8.2, 1.5, 0], d: 15, yaw: Math.PI / 2, pitch: 0.34, w: 4.8, hh: 3.4 },
  };

  const cam = { yaw: 0.2, pitch: 0.5, dist: 40, fov: 34, t: new THREE.Vector3(0, 0, 0) };
  const goal = { yaw: 0.75, pitch: 0.55, dist: 27, fov: 34, t: new THREE.Vector3(0, 0.4, 0) };
  let currentKey: FocusKey = "home";
  let narrow = false;
  let freeFrac = 1;
  let idleAt = 0;
  let selected: BuildingId | null = null;
  let hoverId: BuildingId | null = null;
  let nightNow = 0;
  let nightGoal = DUSK;
  let fx: ReturnType<typeof createFx> = null;

  const fovFor = (key: FocusKey) => (narrow ? 50 : key === "home" ? 34 : 30);
  const distFor = (key: FocusKey): number => {
    const f = focusSpecs[key];
    if (!narrow) return f.d;
    const th = Math.tan((fovFor(key) * Math.PI) / 360);
    return Math.min(95, Math.max(7, Math.max(f.w / (th * camera.aspect), f.hh / (th * freeFrac)) * 1.2));
  };

  const applyFocus = (key: FocusKey, keepPose: boolean) => {
    const f = focusSpecs[key];
    currentKey = key;
    goal.dist = distFor(key);
    goal.fov = fovFor(key);
    if (keepPose) return;
    goal.t.set(f.t[0], f.t[1], f.t[2]);
    goal.yaw = goal.yaw + angDiff(goal.yaw, f.yaw);
    goal.pitch = f.pitch;
    idleAt = performance.now() + 2500;
  };

  const layout = () => {
    const m = getMetrics();
    const w = window.innerWidth;
    const h = window.innerHeight;
    narrow = m.narrow;
    const pr = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    fx?.resize(w, h, pr);
    camera.aspect = w / h;
    camera.clearViewOffset();
    if (!narrow) {
      freeFrac = 1;
      camera.setViewOffset(w, h, -Math.min(210, w * 0.14), 0, w, h);
    } else {
      freeFrac = Math.max(0.3, (m.deckTop - m.topH) / h);
      camera.setViewOffset(w, h, 0, (h - m.deckTop - m.topH) / 2, w, h);
    }
    camera.updateProjectionMatrix();
    applyFocus(currentKey, true);
  };
  layout();
  fx = createFx(renderer, scene, camera, { samples: startNarrow ? 0 : 4, tilt: startNarrow ? 0 : 1 });
  layout();
  const t0 = performance.now();
  const introMs = reduceMotion ? 1 : 3200;
  cam.dist = goal.dist;
  window.addEventListener("resize", layout, { signal });

  /* ---------- pointer input ---------- */
  const ptrs = new Map<number, { x: number; y: number }>();
  let down: { x: number; y: number; moved: number } | null = null;
  let pinch: { d0: number; base: number } | null = null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pinchDist = () => {
    const [a, b] = Array.from(ptrs.values());
    return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  };
  const pick = (e: PointerEvent): BuildingId | null => {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const r = ray.intersectObjects(kit.hits, false);
    if (!r.length) return null;
    let o: THREE.Object3D | null = r[0].object;
    while (o && !o.userData.id) o = o.parent;
    return o ? (o.userData.id as BuildingId) : null;
  };

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* capture is optional */
      }
      canvas.classList.add("drag");
      if (ptrs.size === 1) down = { x: e.clientX, y: e.clientY, moved: 0 };
      else if (ptrs.size === 2) {
        down = null;
        pinch = { d0: pinchDist(), base: goal.dist };
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      const p = ptrs.get(e.pointerId);
      if (p) {
        p.x = e.clientX;
        p.y = e.clientY;
      }
      if (pinch && ptrs.size >= 2) {
        goal.dist = Math.min(95, Math.max(7, (pinch.base * pinch.d0) / pinchDist()));
        idleAt = performance.now() + 4000;
        return;
      }
      if (!down) {
        hoverId = e.pointerType === "mouse" ? pick(e) : null;
        canvas.style.cursor = hoverId ? "pointer" : "";
        return;
      }
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      down.moved += Math.abs(dx) + Math.abs(dy);
      down.x = e.clientX;
      down.y = e.clientY;
      goal.yaw -= dx * 0.006;
      goal.pitch = Math.min(1.15, Math.max(0.18, goal.pitch + dy * 0.004));
      idleAt = performance.now() + 4000;
    },
    { signal },
  );
  const endPointer = (e: PointerEvent, allowClick: boolean) => {
    const wasClick = allowClick && down !== null && down.moved < 6 && pinch === null;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) {
      down = null;
      canvas.classList.remove("drag");
    }
    if (wasClick) {
      const id = pick(e);
      if (id) onPick(id);
    }
  };
  canvas.addEventListener("pointerup", (e) => endPointer(e, true), { signal });
  canvas.addEventListener("pointercancel", (e) => endPointer(e, false), { signal });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      goal.dist = Math.min(95, Math.max(7, goal.dist * (1 + e.deltaY * 0.001)));
    },
    { passive: false, signal },
  );

  /* ---------- loop ---------- */
  const k = reduceMotion ? 1 : 0.06;
  const v = new THREE.Vector3();
  const sunDay = new THREE.Vector3(-0.62, 0.34, 0.7).normalize();
  const sunNight = new THREE.Vector3(-0.45, 0.75, 0.5).normalize();
  const sunDir = new THREE.Vector3();
  const cSunDay = new THREE.Color(0xffc58a);
  const cSunNight = new THREE.Color(0x9bb8ff);
  const hSkyDay = new THREE.Color(0xffd2a8);
  const hSkyNight = new THREE.Color(0x5a6fb8);
  const hGroundDay = new THREE.Color(0x3b6a6f);
  const hGroundNight = new THREE.Color(0x0b1b2a);
  let raf = 0;
  let last = performance.now();

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = reduceMotion ? 0 : (now - t0) / 1000;

    nightNow += (nightGoal - nightNow) * (reduceMotion ? 1 : Math.min(1, dt * 0.9));
    const n = nightNow;
    kit.applyNight(n);
    sunDir.lerpVectors(sunDay, sunNight, n).normalize();
    sun.position.copy(sunDir).multiplyScalar(34);
    sun.color.lerpColors(cSunDay, cSunNight, n);
    sun.intensity = lerp(2.7, 0.9, n);
    hemi.color.lerpColors(hSkyDay, hSkyNight, n);
    hemi.groundColor.lerpColors(hGroundDay, hGroundNight, n);
    hemi.intensity = lerp(1.25, 0.7, n);
    fill.intensity = lerp(0.5, 0.25, n);
    scene.environmentIntensity = lerp(0.55, 0.3, n);
    sky.update(n, sunDir, camera.position);
    (scene.fog as THREE.FogExp2).color.copy(sky.fog);
    (scene.fog as THREE.FogExp2).density = 0.0075 + n * 0.003;
    fx?.setNight(n);
    sea.update(t, n);

    if (!reduceMotion) {
      folks.update(t, dt);
      traffic.update(t, dt);
      for (const a of kit.anims) a(t, dt);
    } else {
      traffic.update(0, 0);
      for (const a of kit.anims) a(0, 0);
    }

    if (!reduceMotion && !selected && now > idleAt && ptrs.size === 0) goal.yaw += 0.0007;
    cam.yaw += (goal.yaw - cam.yaw) * k;
    cam.pitch += (goal.pitch - cam.pitch) * k;
    cam.dist += (goal.dist - cam.dist) * k;
    cam.fov += (goal.fov - cam.fov) * k;
    cam.t.lerp(goal.t, k);

    /* the opening shot: a low sweep that rises and pulls in while the lights come on */
    const e = easeOut(Math.min(1, (now - t0) / introMs));
    const sway = reduceMotion ? 0 : 1;
    const yaw = cam.yaw - (1 - e) * 0.55;
    const pitch = cam.pitch - (1 - e) * 0.1;
    const dist = cam.dist * (1 + (1 - e) * 0.3);
    const cp = Math.cos(pitch);
    camera.position.set(
      cam.t.x + Math.sin(yaw) * cp * dist,
      cam.t.y + Math.sin(pitch) * dist,
      cam.t.z + Math.cos(yaw) * cp * dist,
    );
    camera.lookAt(cam.t);
    if (Math.abs(camera.fov - cam.fov) > 0.01) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }

    island.position.y = Math.sin(t * 0.8) * 0.05;
    ids.forEach((id) => {
      const target = id === selected ? 1.05 : id === hoverId ? 1.03 : 1;
      const g = byId[id];
      g.scale.setScalar(g.scale.x + (target - g.scale.x) * 0.15);
    });
    if (selected) {
      const sg = byId[selected];
      ring.visible = true;
      ring.position.set(sg.position.x, 0.12, sg.position.z);
      const rs = 1 + Math.sin(t * 3) * 0.04;
      ring.scale.set(rs, rs, rs);
    } else {
      ring.visible = false;
    }

    if (fx) fx.render(dt, t);
    else renderer.render(scene, camera);

    const w = window.innerWidth;
    const h = window.innerHeight;
    ids.forEach((id) => {
      const el = tagEls[id];
      if (!el) return;
      const g = byId[id];
      v.set(g.position.x, TAG_HEIGHT[id], g.position.z);
      island.localToWorld(v);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      el.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y - 6)}px,0) translate(-50%,-100%)`;
    });
  };
  raf = requestAnimationFrame(frame);

  return {
    focus: (key) => applyFocus(key, false),
    select: (id) => {
      selected = id;
    },
    relayout: layout,
    setNight: (n) => {
      nightGoal = Math.min(1, Math.max(0, n));
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      abort.abort();
      const seen = new Set<THREE.Texture>();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material;
        if (m) {
          (Array.isArray(m) ? m : [m]).forEach((mm) => {
            const std = mm as THREE.MeshStandardMaterial;
            [std.map, std.emissiveMap].forEach((tx) => {
              if (tx && !seen.has(tx)) {
                seen.add(tx);
                tx.dispose();
              }
            });
            mm.dispose();
          });
        }
      });
      fx?.dispose();
      envRT.dispose();
      pmrem.dispose();
      envMesh.geometry.dispose();
      renderer.dispose();
    },
  };
}
