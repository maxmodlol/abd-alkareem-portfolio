import * as THREE from "three";

import { buildArvo, buildCarebooks, buildDiwan, buildOliva, buildSahefa, buildSgsoft, buildVillageWellth, buildWatan } from "./buildings";
import { Explorer, type ExplorerEvents, type HeroFx, type RoutePoint } from "./explorer";
import { createFx } from "./fx";
import { Kit, type BuildingId } from "./kit";
import { makeMeadow } from "./nature";
import { Particles } from "./particles";
import { Folks } from "./people";
import { Sfx } from "./sfx";
import { Traffic } from "./traffic";
import { createSkyMaterial, makeArcs, makeSea, makeSkyLife, makeSky, makeStreets } from "./world";
import { grassR, makeCoast, makeDowntown, makeIslets, Palms, SGSOFT_POS, SGSOFT_ROT, type Solid } from "./coast";
import { mergeStatic } from "./merge";
import { prepareTextures } from "./textures";
import { gradeScene } from "./palette";

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

/**
 * Rendering presets. high: capable desktops (soft shadows, ambient occlusion, full resolution);
 * balanced: ordinary laptops and tablets (sharper but cheaper shadows, no occlusion);
 * low: phones and weak graphics (no shadows or point lights, fewer details, capped resolution).
 * The frame governor can still step down from any of them while frames run slow.
 */
export type Quality = "high" | "balanced" | "low";

export type CityOptions = {
  canvas: HTMLCanvasElement;
  tagEls: Partial<Record<BuildingId, HTMLElement | null>>;
  getMetrics: () => CityMetrics;
  onPick: (id: BuildingId) => void;
  reduceMotion: boolean;
  quality: Quality;
  /** Called as each real build step finishes, so a loading screen can show true progress. */
  onProgress?: (done: number, total: number, label: string) => void;
  /** The graphics context was lost (driver reset, GPU memory pressure, a backgrounded phone). */
  onContextLost?: () => void;
  /** Called when the escape key or a lost window focus should open the pause menu during play. */
  onPauseRequest?: () => void;
};

export type PlayHandlers = {
  onNear: (id: BuildingId | null) => void;
  onInteract: (id: BuildingId) => void;
  /** combo counts coins picked up in quick succession. */
  onCoin: (collected: number, total: number, combo: number) => void;
  onGem: (collected: number, total: number) => void;
};

export type CityScene = {
  focus: (key: FocusKey) => void;
  select: (id: BuildingId | null) => void;
  relayout: () => void;
  /** 0 is clear noon, 1 is deep night. */
  setNight: (n: number) => void;
  /** Shifts the island sideways on desktop while the detail card is open. */
  setPanelOpen: (open: boolean) => void;
  /** Starts the guided walk. Returns false when it is not available (reduced motion). */
  startWalk: (events: { onStop: (id: BuildingId) => void; onLeave: (id: BuildingId) => void }) => boolean;
  stopWalk: () => void;
  /** Tour: move on to the next building now. */
  skipStop: () => void;
  /** Free play: steer the character yourself, collect coins and visit every building. */
  startPlay: (h: PlayHandlers) => boolean;
  stopPlay: () => void;
  setPaused: (paused: boolean) => void;
  /** Touch stick, each axis from -1 to 1 (x right, y forward). */
  setStick: (x: number, y: number) => void;
  /** Jump button pressed or released. Holding it in the air glides. */
  setJump: (down: boolean) => void;
  dash: () => void;
  emote: (e: "wave" | "dance") => void;
  setMuted: (muted: boolean) => void;
  setVisited: (ids: BuildingId[]) => void;
  setMinimap: (canvas: HTMLCanvasElement | null) => void;
  /** Stops drawing entirely while the island is hidden (a full-screen panel, the landing view). */
  setActive: (on: boolean) => void;
  /** Frames per second over the last couple of seconds, for the settings readout. */
  fps: () => number;
  dispose: () => void;
};

type FocusSpec = { t: [number, number, number]; d: number; yaw: number; pitch: number; w: number; hh: number };

const TAG_HEIGHT: Record<BuildingId, number> = {
  villagewellth: 9.9,
  sahefa: 4.0,
  diwan: 3.4,
  oliva: 3.3,
  watan: 4.9,
  carebooks: 4.4,
  arvo: 4.2,
  sgsoft: 4.9,
};

const BUILDING_POS: Record<BuildingId, [number, number]> = {
  villagewellth: [-4.6, -4.6],
  sahefa: [4.6, -4.6],
  diwan: [-4.6, 4.6],
  oliva: [4.6, 4.6],
  watan: [-8.2, 0],
  carebooks: [9.0, 2.6],
  arvo: [9.0, -2.6],
  sgsoft: SGSOFT_POS,
};

/** Daytime is clear tropical noon; 1 is night. */
export const DAY = 0;

/* coins on the roofs, reached with the bounce pads and a glide */
const ROOF_COINS: [number, number][] = [
  [4.6, -4.6],
  [4.0, -4.0],
  [5.2, -5.2],
  [-4.6, 4.6],
  [-4.0, 4.0],
  [4.6, 4.6],
  [5.2, 4.0],
  [9.0, 2.6],
  [9.0, -2.6],
];

/* how far from a building's centre the character is blocked */
const RADIUS: Record<BuildingId, number> = {
  villagewellth: 2.6,
  sahefa: 2.7,
  diwan: 2.6,
  oliva: 2.6,
  watan: 1.2,
  carebooks: 1.6,
  arvo: 1.6,
  sgsoft: 1.35,
};

/* the guided walk: pavement on both sides of the main road, one stop in front of each building */
const WALK_ROUTE: RoutePoint[] = [
  { at: [-4.6, -1.4], stop: { id: "villagewellth", look: [-4.6, -4.6] } },
  { at: [4.6, -1.4], stop: { id: "sahefa", look: [4.6, -4.6] } },
  { at: [9.0, -1.4], stop: { id: "arvo", look: [9.0, -2.6] } },
  { at: [9.0, 1.4], stop: { id: "carebooks", look: [9.0, 2.6] } },
  { at: [4.6, 1.4], stop: { id: "oliva", look: [4.6, 4.6] } },
  { at: [-4.6, 1.4], stop: { id: "diwan", look: [-4.6, 4.6] } },
  { at: [-6.4, 1.4], stop: { id: "watan", look: [-8.2, 0] } },
  { at: [-6.4, -1.4] },
  { at: [-7.7, -4.3] },
  { at: [-7.7, -8.4] },
  { at: [-5.5, -9.1], stop: { id: "sgsoft", look: SGSOFT_POS } },
  { at: [-7.7, -8.4] },
  { at: [-7.7, -4.3] },
  { at: [-6.4, -1.4] },
];

function angDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/* hands the main thread back between building steps, so taps and scrolls stay instant while the island is built */
const breathe = () =>
  new Promise<void>((r) => {
    const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (s?.yield) s.yield().then(r, r);
    else setTimeout(r, 0);
  });

/* the same, but only once the current slice of work has run for a few milliseconds */
let sliceAt = 0;
const pause = async () => {
  if (performance.now() - sliceAt < 8) return;
  await breathe();
  sliceAt = performance.now();
};

const BUILD_STEPS = 22;

export async function createCityScene(opts: CityOptions): Promise<CityScene | null> {
  const { canvas, tagEls, getMetrics, onPick, reduceMotion, quality } = opts;
  const startNarrow = getMetrics().narrow;
  let stepsDone = 0;
  const step = async (label: string) => {
    stepsDone += 1;
    opts.onProgress?.(Math.min(stepsDone, BUILD_STEPS), BUILD_STEPS, label);
    await breathe();
  };
  /* the ground and sea maps are worked out in the background while the renderer and sky get going */
  const texturesReady = prepareTextures(quality === "low");

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  /* error checks read shader status back synchronously, which stalls the first frames */
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  /* no graphics card (software rendering, as in many test and remote machines): a still island that redraws when you move it */
  /* the poster images are shot on a machine without a graphics card; this flag (set by the capture
     script, never by the page) renders the full look there anyway */
  const capture = (globalThis as { __cityCapture?: boolean }).__cityCapture === true;
  const soft = !capture && (() => {
    try {
      const gl = renderer.getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return /swiftshader|llvmpipe|software|basic render/i.test(String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)));
    } catch {
      return false;
    }
  })();
  const cheap = quality === "low" || soft;
  const high = quality === "high" && !soft;
  renderer.shadowMap.enabled = !cheap;
  /* soft filtering only where there is headroom for it; plain PCF at half the map size looks nearly as good */
  renderer.shadowMap.type = high ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

  const abort = new AbortController();
  const { signal } = abort;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 900);
  scene.fog = new THREE.FogExp2(0xb59ad8, 0.007);

  /* light rig: a low rose sun under an indigo sky, turning into a cyan moon over a deep-sea night */
  const hemi = new THREE.HemisphereLight(0xc4ccff, 0x3a2a55, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2b4, 1.8);
  sun.castShadow = !cheap;
  sun.shadow.mapSize.setScalar(high ? 2048 : 1024);
  sun.shadow.radius = 3;
  sun.shadow.camera.left = -19;
  sun.shadow.camera.right = 19;
  sun.shadow.camera.top = 19;
  sun.shadow.camera.bottom = -19;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x7fd8ff, 0.5);
  fill.position.set(10, 8, 12);
  scene.add(fill);

  /* reflections for glass, metal and water: the dusk sky, plus a ring of distant city light on the horizon
     so that dark glass picks up warm glints instead of a flat gradient */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envMesh = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), createSkyMaterial());
  envScene.add(envMesh);
  const glintMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb3d6).multiplyScalar(1.6), side: THREE.DoubleSide });
  const glintGeo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.13;
    const g = new THREE.Mesh(glintGeo, glintMat);
    g.scale.set(3 + (i % 4) * 2.2, 0.5 + (i % 3) * 0.45, 1);
    g.position.set(Math.cos(a) * 30, 1 + (i % 2) * 0.6, Math.sin(a) * 30);
    g.lookAt(0, 0, 0);
    envScene.add(g);
  }
  /* compile the sky shader in the background first, so the reflections below don't wait on it */
  const envWarm = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  renderer.setRenderTarget(envWarm);
  try {
    await renderer.compileAsync(envScene, camera);
  } catch {
    /* compiled on first use instead */
  }
  renderer.setRenderTarget(null);
  envWarm.dispose();
  await breathe();
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.7;
  glintMat.dispose();
  glintGeo.dispose();
  await step("Lighting the sky");

  /* the world */
  const kit = new Kit();
  kit.lightsOn = !cheap;
  await step("Preparing materials");
  const folks = new Folks(kit);
  const traffic = new Traffic(kit);
  const sky = makeSky(scene);
  const island = new THREE.Group();
  scene.add(island);
  await texturesReady;
  await step("Generating surfaces");
  const sea = makeSea(scene);
  await step("Flooding the harbour");
  const palms = new Palms();
  const extraSolids: Solid[] = makeCoast(kit, island, palms);
  await step("Laying the promenade");
  makeIslets(kit, scene, palms);
  await step("Raising the far skyline");
  extraSolids.push(...makeDowntown(kit, island, palms));
  await step("Raising downtown");
  buildVillageWellth(kit, folks, island);
  await step("Building VillageWellth");
  buildSahefa(kit, folks, island);
  await step("Building Sahefa");
  buildDiwan(kit, folks, island);
  await step("Building DIWAN");
  buildOliva(kit, folks, island);
  await step("Building Oliva");
  const watan = buildWatan(kit, folks, island);
  await step("Building Watan");
  buildCarebooks(kit, folks, island, "CareBooks");
  buildArvo(kit, folks, island, "Arvo");
  await step("Building CareBooks and Arvo");
  buildSgsoft(kit, folks, island, SGSOFT_POS, SGSOFT_ROT);
  await step("Building SGSoft");
  traffic.zones.push({ axis: "x", dir: -1, stop: -7.55, red: () => !watan.gate.open });
  traffic.zones.push({ axis: "x", dir: 1, stop: -8.85, red: () => !watan.gate.open });
  makeStreets(kit, island, traffic, folks, palms);
  await step("Lighting the streets");
  palms.build(island, quality !== "low");
  await breathe();
  makeArcs(kit, island, {
    villagewellth: new THREE.Vector3(-4.6, 9.3, -4.6),
    sahefa: new THREE.Vector3(4.6, 3.4, -4.6),
    diwan: new THREE.Vector3(-4.6, 2.4, 4.6),
    oliva: new THREE.Vector3(4.6, 2.7, 4.6),
    watan: new THREE.Vector3(-8.2, 4.4, 0),
    carebooks: new THREE.Vector3(9.0, 3.6, 2.6),
    arvo: new THREE.Vector3(9.0, 3.4, -2.6),
    sgsoft: new THREE.Vector3(SGSOFT_POS[0], 7.6, SGSOFT_POS[1]),
  });
  makeSkyLife(kit, scene);
  await step("Setting traffic in motion");
  const explorer = new Explorer(kit, island, WALK_ROUTE);
  explorer.colliders = (Object.keys(RADIUS) as BuildingId[]).map((id): [number, number, number] => [
    BUILDING_POS[id][0],
    BUILDING_POS[id][1],
    RADIUS[id],
  ]);
  explorer.cars = () => traffic.probe();
  /* the whole lawn is walkable, downtown included, up to a step from the sand */
  explorer.edge = (a) => grassR(a) - 0.55;
  explorer.root.userData.keepColor = true;
  const particles = new Particles(island, quality === "low");
  const sfx = new Sfx();

  /* solid ground: a ray straight down onto the buildings gives walls and walkable roofs */
  const solidSets: { x: number; z: number; r: number; meshes: THREE.Mesh[] }[] = [];
  const probeRay = new THREE.Raycaster();
  const probeFrom = new THREE.Vector3();
  const probeDown = new THREE.Vector3(0, -1, 0);
  const probePt = new THREE.Vector3();
  const solid = (x: number, z: number): number => {
    let top = 0;
    for (const set of solidSets) {
      if (Math.hypot(x - set.x, z - set.z) > set.r) continue;
      probeFrom.set(x, 40, z);
      island.localToWorld(probeFrom);
      probeRay.set(probeFrom, probeDown);
      probeRay.far = 60;
      const hit = probeRay.intersectObjects(set.meshes, false)[0];
      if (hit) {
        probePt.copy(hit.point);
        island.worldToLocal(probePt);
        top = Math.max(top, probePt.y);
      }
    }
    return top;
  };
  explorer.solid = solid;

  /* coins along the pavements, one instanced mesh; roof coins are added once the buildings exist */
  const coinPts: [number, number, number][] = [];
  const free = (x: number, z: number) => !explorer.colliders.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + 0.5);
  for (let x = -9.6; x <= 9.7; x += 2.4) {
    if (free(x, -1.4)) coinPts.push([x, 0.62, -1.4]);
    if (free(x, 1.4)) coinPts.push([x, 0.62, 1.4]);
  }
  for (let z = -9; z <= 9.1; z += 2.4) {
    if (Math.abs(z) < 2.5) continue;
    if (free(-1.4, z)) coinPts.push([-1.4, 0.62, z]);
    if (free(1.4, z)) coinPts.push([1.4, 0.62, z]);
  }
  ROOF_COINS.forEach(([x, z]) => coinPts.push([x, -1, z]));
  const coinGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.045, 18);
  coinGeo.rotateX(Math.PI / 2);
  /* the collectibles are the one place gold is used at full strength */
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xff6fb0,
    roughness: 0.25,
    metalness: 0.9,
    emissive: 0x7a2a58,
    emissiveIntensity: 0.7,
  });
  coinMat.userData.keepColor = true;
  const coins = new THREE.InstancedMesh(coinGeo, coinMat, coinPts.length);
  coins.visible = false;
  coins.frustumCulled = false;
  island.add(coins);
  const coinGot: boolean[] = coinPts.map(() => false);
  const coinAt: number[] = coinPts.map(() => 0);
  const coinDummy = new THREE.Object3D();
  let combo = 0;
  let lastCoin = -10;

  const byId = {} as Record<BuildingId, THREE.Object3D>;
  island.children.forEach((c) => {
    if (c.userData.id) byId[c.userData.id as BuildingId] = c;
  });
  const ids = Object.keys(byId) as BuildingId[];
  for (const id of ids) {
    const meshes: THREE.Mesh[] = [];
    byId[id].traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!mat || !mat.visible || mat.transparent) return;
      meshes.push(m);
    });
    solidSets.push({ x: BUILDING_POS[id][0], z: BUILDING_POS[id][1], r: RADIUS[id] + 0.6, meshes });
  }
  /* downtown towers and the road portals are solid too */
  for (const s of extraSolids) {
    const meshes: THREE.Mesh[] = [];
    s.obj.traverse((o) => {
      const m = o as THREE.Mesh;
      const mat = m.isMesh ? (Array.isArray(m.material) ? m.material[0] : m.material) : null;
      if (mat && mat.visible && !mat.transparent) meshes.push(m);
    });
    solidSets.push({ x: s.x, z: s.z, r: s.r, meshes });
  }

  /* bounce pads, gems above them and coins on the roofs you can reach with them */
  const PADS: [number, number][] = [
    [-1.4, 8.4],
    [1.4, -8.4],
    [7.0, 1.4],
    [-6.6, -1.4],
  ];
  explorer.pads = PADS;
  const padGroup = new THREE.Group();
  padGroup.visible = false;
  island.add(padGroup);
  const padGlow = kit.glowMat(0x5ce6ff, 1.6, 4, 0x1a140c);
  const padTop = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.35, metalness: 0.6, emissive: 0x5ce6ff, emissiveIntensity: 0.18 });
  const padArrowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffb3d6).multiplyScalar(1.4),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const arrowShape = new THREE.Shape();
  padGroup.userData.keepColor = true;
  arrowShape.moveTo(-0.22, 0);
  arrowShape.lineTo(0, 0.2);
  arrowShape.lineTo(0.22, 0);
  arrowShape.lineTo(0.22, 0.07);
  arrowShape.lineTo(0, 0.27);
  arrowShape.lineTo(-0.22, 0.07);
  arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const pads: { top: THREE.Mesh; arrows: THREE.Mesh[]; kick: number }[] = [];
  PADS.forEach(([x, z]) => {
    const g = new THREE.Group();
    g.position.set(x, 0.06, z);
    padGroup.add(g);
    kit.cyl(g, 0.56, 0.62, 0.08, kit.mat(0x15181f, 0.5, 0.5), 0, 0, 0, 28);
    const ring = kit.put(g, new THREE.TorusGeometry(0.5, 0.035, 8, 40), padGlow, 0, 0.09, 0, false);
    ring.rotation.x = Math.PI / 2;
    const top = kit.put(g, new THREE.CylinderGeometry(0.42, 0.44, 0.06, 28), padTop, 0, 0.11, 0);
    const arrows: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Mesh(arrowGeo, padArrowMat);
      a.position.y = 0.3 + i * 0.35;
      g.add(a);
      const b = new THREE.Mesh(arrowGeo, padArrowMat);
      b.rotation.y = Math.PI / 2;
      a.add(b);
      arrows.push(a);
    }
    kit.pointLight(g, 0x5ce6ff, 0.4, 1.4, 3, 0, 0.5, 0);
    pads.push({ top, arrows, kick: 0 });
  });

  const gemPts: [number, number, number][] = PADS.map(([x, z], i) => {
    const a = (i * Math.PI) / 2 + 0.6;
    return [x + Math.sin(a) * 1.3, 3.4, z + Math.cos(a) * 1.3];
  });
  const gemGeo = new THREE.OctahedronGeometry(0.26, 0);
  gemGeo.scale(1, 1.4, 1);
  /* gems are the single cool accent: pale crystal with a cold inner light */
  const gemMat = new THREE.MeshStandardMaterial({
    color: 0xe8eefc,
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0xa9b8e6,
    emissiveIntensity: 1.0,
    flatShading: true,
  });
  gemMat.userData.keepColor = true;
  const gems = gemPts.map(([x, y, z]) => {
    const m = new THREE.Mesh(gemGeo, gemMat);
    m.position.set(x, y, z);
    m.visible = false;
    island.add(m);
    return m;
  });
  const gemGot: boolean[] = gemPts.map(() => false);
  let gemTotal = 0;
  await breathe();
  island.updateMatrixWorld(true);
  makeMeadow(
    kit,
    island,
    (x, z) => Math.hypot(x, z) < 10.7 && solid(x, z) < 0.02 && !PADS.some(([px, pz]) => Math.hypot(x - px, z - pz) < 0.9),
    quality === "low"
      ? { tufts: 700, flowers: 90, butterflies: 0 }
      : quality === "balanced"
        ? { tufts: 1600, flowers: 200, butterflies: 4 }
        : { tufts: 2600, flowers: 300, butterflies: 6 },
  );
  await step("Planting the parks");
  for (let i = coinPts.length - 1; i >= 0; i--) {
    const c = coinPts[i];
    if (c[1] >= 0) continue;
    const top = solid(c[0], c[2]);
    if (top < 0.5 || top > 5.2) {
      coinPts.splice(i, 1);
      coinGot.splice(i, 1);
      coinAt.splice(i, 1);
    } else c[1] = top + 0.55;
  }
  coins.count = coinPts.length;
  await breathe();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.035, 8, 96),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6fb0).multiplyScalar(2.0) }),
  );
  ring.userData.keepColor = true;
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  island.add(ring);

  /* game feel: every move the hero makes turns into dust, sparks, rings, sound and a little shake */
  explorer.onFx = (kind: HeroFx, x: number, y: number, z: number, a: number) => {
    switch (kind) {
      case "jump":
        particles.burst("dust", x, y, z, null, 1.4);
        sfx.play("jump");
        break;
      case "double":
        particles.burst("spark", x, y + 0.3, z, null, 0.8);
        particles.ring(x, y, z, 1.2, 0xf4f1ff);
        sfx.play("double");
        break;
      case "land":
        particles.burst("land", x, y, z, null, Math.min(1.2, a / 8));
        sfx.play("land");
        shake = Math.max(shake, Math.min(0.08, a * 0.008));
        break;
      case "bigland":
        particles.burst("land", x, y, z, null, 2);
        particles.ring(x, y, z, 3.2);
        sfx.play("land");
        shake = Math.max(shake, 0.28);
        break;
      case "dash":
        particles.burst("dust", x, y, z, a + Math.PI, 2);
        sfx.play("dash");
        break;
      case "trail":
        particles.burst("trail", x, y, z, a + Math.PI);
        break;
      case "pad": {
        particles.burst("pad", x, y + 0.2, z);
        particles.ring(x, y, z, 2.6, 0x5ce6ff);
        sfx.play("pad");
        shake = Math.max(shake, 0.1);
        const p = pads[PADS.findIndex(([px, pz]) => px === x && pz === z)];
        if (p) p.kick = 1;
        break;
      }
      case "runstep":
        particles.burst("dust", x, y, z, a + Math.PI, 0.6);
        sfx.play("step");
        break;
      case "step":
        break;
      case "hit":
        particles.burst("hit", x, y, z);
        particles.ring(x, 0, z, 1.8, 0x5ce6ff);
        sfx.play("hit");
        shake = Math.max(shake, 0.4);
        hitStop = 0.14;
        break;
    }
  };

  /* ---------- camera rig ---------- */
  const spec = (id: BuildingId, y: number, d: number, w: number, hh: number, pitch: number): FocusSpec => {
    const [x, z] = BUILDING_POS[id];
    return { t: [x, y, z], d, yaw: Math.atan2(-x, -z), pitch, w, hh };
  };
  const focusSpecs: Record<FocusKey, FocusSpec> = {
    /* low enough to see over the bay to the far skyline and the last light on the horizon */
    home: { t: [-1.4, 2.6, -1.4], d: 50, yaw: 0.75, pitch: 0.44, w: 15, hh: 11 },
    villagewellth: spec("villagewellth", 4.0, 25, 4.8, 5.2, 0.3),
    sahefa: spec("sahefa", 1.3, 17.5, 5.4, 3.0, 0.4),
    diwan: spec("diwan", 1.1, 16.5, 5.0, 2.7, 0.38),
    oliva: spec("oliva", 1.2, 16.5, 5.0, 3.0, 0.38),
    carebooks: { t: [9.0, 1.3, 2.6], d: 16, yaw: Math.PI * 0.92, pitch: 0.36, w: 3.8, hh: 3.2 },
    arvo: { t: [9.0, 1.3, -2.6], d: 16, yaw: 0.2, pitch: 0.36, w: 3.8, hh: 3.2 },
    watan: { t: [-8.2, 1.5, 0], d: 15, yaw: Math.PI / 2, pitch: 0.34, w: 4.8, hh: 3.4 },
    sgsoft: { t: [SGSOFT_POS[0], 3.4, SGSOFT_POS[1]], d: 20, yaw: SGSOFT_ROT + 0.5, pitch: 0.3, w: 4.2, hh: 5.4 },
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
  let panelOpen = false;
  let offX = 0;
  let offGoal = 0;
  let nightGoal = DAY;
  let walking = false;
  let playing = false;
  let paused = false;
  let nearId: BuildingId | null = null;
  let playH: PlayHandlers | null = null;
  let coinTotal = 0;
  let visitedSet = new Set<BuildingId>();
  let mini: HTMLCanvasElement | null = null;
  let miniTick = 0;
  const keys = new Set<string>();
  /* frame clock and governor settle time, declared early because input handlers reset them */
  let last = performance.now();
  let settleUntil = 0;
  const stick = { x: 0, y: 0 };
  let walkOff = 0;
  let playYaw = 0;
  let playPitch = 0.34;
  let shake = 0;
  let hitStop = 0;
  let lite = false;
  /* 0 is full quality; the frame governor below raises it while frames run slow */
  let tier = 0;
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
    /* each preset caps the pixel ratio; the governor then scales it down in steps, but never below
       0.8 of a CSS pixel, where the image would turn visibly soft */
    const dpr = window.devicePixelRatio || 1;
    const cap = Math.min(dpr, quality === "high" && !lite ? 2 : quality === "low" ? 1.25 : 1.5);
    const pr = Math.max(Math.min(dpr, 0.8), cap * [1, 0.85, 0.75, 0.66, 0.66][tier]);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    fx?.resize(w, h, pr);
    particles.setViewport(h * pr, narrow ? 58 : 46);
    camera.aspect = w / h;
    camera.clearViewOffset();
    if (!narrow) {
      freeFrac = 1;
      offGoal = panelOpen ? -Math.min(190, w * 0.13) : 0;
      offX = reduceMotion ? offGoal : offX;
      camera.setViewOffset(w, h, offX, 0, w, h);
    } else if (playing && !panelOpen) {
      freeFrac = 1;
      camera.setViewOffset(w, h, 0, 0, w, h);
    } else {
      freeFrac = Math.max(0.3, (m.deckTop - m.topH) / h);
      camera.setViewOffset(w, h, 0, (h - m.deckTop - m.topH) / 2, w, h);
    }
    camera.updateProjectionMatrix();
    applyFocus(currentKey, true);
  };
  layout();
  /* one colour grade for the whole city, before the static parts are baked together */
  gradeScene(scene);
  await step("Grading the city");
  /* bake everything that stands still into a few meshes; the scene was ~1,800 draw calls a frame */
  await mergeStatic(scene, {
    pause,
    anchors: ids.map((id) => byId[id]),
    skip: [explorer.root, explorer.ring, padGroup, ring, ...gems],
    simulate: () => {
      for (const n of [0, 1]) {
        kit.night = n;
        for (let t = 0.13; t < 40; t += 3.71) {
          folks.update(t, 0.05);
          traffic.update(t, 0.05);
          for (const a of kit.anims) a(t, 0.05);
        }
      }
      kit.night = 0;
    },
  });
  await step("Merging static geometry");
  /* without a graphics card the post effects cost more than the whole island, so draw it plainly.
     Multisampling stays on for phones: their tiled GPUs resolve it almost for free, and without it every
     edge of a dark tower against the sky shimmers. Ambient occlusion is only worth its cost on the high preset. */
  fx = soft ? null : createFx(renderer, scene, camera, { samples: 4, tilt: startNarrow ? 0 : 1, ao: high });
  layout();
  const t0 = performance.now();
  const introMs = reduceMotion || soft ? 1 : 3200;
  cam.dist = goal.dist;
  window.addEventListener("resize", layout, { signal });

  /* A lost context (driver reset, memory pressure, a phone that backgrounded the tab) cannot be trusted to
     come back with every texture and target intact, so the page rebuilds the island on a fresh canvas. */
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      active = false;
      cancelAnimationFrame(raf);
      opts.onContextLost?.();
    },
    { signal },
  );

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
      if (playing) {
        playYaw -= dx * 0.007;
        playPitch = Math.min(0.95, Math.max(0.08, playPitch + dy * 0.004));
        return;
      }
      if (walking) {
        walkOff = Math.max(-2.2, Math.min(2.2, walkOff - dx * 0.006));
        idleAt = performance.now() + 4000;
        return;
      }
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

  /* ---------- keyboard ----------
     Movement reads KeyboardEvent.code, the physical key, so WASD works on AZERTY, Arabic and every other
     layout, and with Caps Lock or Shift held. macOS sends no keyup for keys released while Command is
     down, so any modifier clears the held keys instead of leaving the character running. */
  const typing = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
  };
  /* a focused button or link keeps Space and Enter, so the pause menu and HUD stay usable from the keyboard */
  const onControl = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    return !!el && el !== document.body && el !== canvas && !!el.closest("button, a, [role='button'], [role='dialog']");
  };
  const MOVE: Record<string, string> = {
    KeyW: "f",
    ArrowUp: "f",
    KeyS: "b",
    ArrowDown: "b",
    KeyA: "l",
    ArrowLeft: "l",
    KeyD: "r",
    ArrowRight: "r",
    ShiftLeft: "run",
    ShiftRight: "run",
  };
  const releaseAll = () => {
    keys.clear();
    explorer.setJump(false);
  };
  window.addEventListener(
    "keydown",
    (e) => {
      if (!playing || typing(e)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) {
        /* a browser or system shortcut: let it through and drop whatever was held */
        releaseAll();
        return;
      }
      if (e.code === "Escape" || e.key === "Escape") return;
      if (onControl(e) && (e.code === "Space" || e.code === "Enter" || e.code === "Tab")) return;
      const move = MOVE[e.code];
      if (move || e.code === "Space") e.preventDefault();
      if (move) keys.add(move);
      if (e.repeat || paused) return;
      sfx.unlock();
      if (e.code === "KeyE" && nearId) {
        sfx.play("enter");
        playH?.onInteract(nearId);
      }
      if (e.code === "Space") explorer.setJump(true);
      if (e.code === "KeyQ" || e.code === "KeyX") explorer.dash();
      if (e.code === "Digit1") explorer.setEmote("wave");
      if (e.code === "Digit2") explorer.setEmote("dance");
    },
    { signal },
  );
  window.addEventListener(
    "keyup",
    (e) => {
      if (e.key === "Meta" || e.key === "Control" || e.key === "Alt") releaseAll();
      const move = MOVE[e.code];
      if (move) keys.delete(move);
      if (e.code === "Space") {
        explorer.setJump(false);
        if (playing && !onControl(e)) e.preventDefault();
      }
    },
    { signal },
  );
  const lostFocus = () => {
    releaseAll();
    ptrs.clear();
    down = null;
    pinch = null;
    canvas.classList.remove("drag");
    if (playing && !paused) opts.onPauseRequest?.();
  };
  window.addEventListener("blur", lostFocus, { signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) lostFocus();
      /* rAF stops in a hidden tab; restart the clock so nothing jumps when it comes back */
      last = performance.now();
      settleUntil = performance.now() + 1500;
    },
    { signal },
  );

  /* ---------- minimap: the island seen from above, turned so that ahead is up ---------- */
  const drawMini = () => {
    if (!mini) return;
    const ctx = mini.getContext("2d");
    if (!ctx) return;
    const S = mini.width;
    const sc = S / 38;
    const cy = Math.cos(cam.yaw);
    const sy = Math.sin(cam.yaw);
    const P = (x: number, z: number): [number, number] => [S / 2 + (x * cy - z * sy) * sc, S / 2 + (x * sy + z * cy) * sc];
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(9,11,16,0.92)";
    ctx.fillRect(0, 0, S, S);
    /* the island's real outline: sand, then lawn */
    for (const [col, off] of [["#3a3e48", 1.7], ["#1b2028", 0]] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const an = (i / 72) * Math.PI * 2;
        const r = grassR(an) + off;
        const q = P(Math.cos(an) * r, Math.sin(an) * r);
        if (i === 0) ctx.moveTo(q[0], q[1]);
        else ctx.lineTo(q[0], q[1]);
      }
      ctx.fill();
    }
    ctx.strokeStyle = "#5d6474";
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    let a = P(-11, 0);
    let b = P(11, 0);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    a = P(0, -11);
    b = P(0, 11);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.fillStyle = "#d7c68a";
    for (let i = 0; i < coinPts.length; i++) {
      if (coinGot[i]) continue;
      const q = P(coinPts[i][0], coinPts[i][2]);
      ctx.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3);
    }
    ctx.fillStyle = "#ffb45e";
    for (const [x, z] of PADS) {
      const q = P(x, z);
      ctx.beginPath();
      ctx.arc(q[0], q[1], 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#c4d0f2";
    gemPts.forEach(([x, , z], i) => {
      if (gemGot[i]) return;
      const q = P(x, z);
      ctx.save();
      ctx.translate(q[0], q[1]);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    });
    for (const id of ids) {
      const q = P(BUILDING_POS[id][0], BUILDING_POS[id][1]);
      ctx.fillStyle = visitedSet.has(id) ? "#777f91" : "#ecdcaa";
      ctx.beginPath();
      ctx.arc(q[0], q[1], id === nearId ? 6.5 : 5, 0, Math.PI * 2);
      ctx.fill();
      if (id === nearId) {
        ctx.strokeStyle = "#e8e4da";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    const p = P(explorer.px, explorer.pz);
    const hs = Math.sin(explorer.heading);
    const hc = Math.cos(explorer.heading);
    const ang = Math.atan2(hs * sy + hc * cy, hs * cy - hc * sy);
    ctx.translate(p[0], p[1]);
    ctx.rotate(ang);
    ctx.fillStyle = "#e8e4da";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, 5);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  /* ---------- loop ---------- */
  const k = reduceMotion ? 1 : soft ? 0.3 : 0.06;
  const v = new THREE.Vector3();
  /* dusk: a low amber key from the west that rakes long shadows; night: a high, cold moon */
  const sunDay = new THREE.Vector3(-0.78, 0.3, 0.55).normalize();
  const sunNight = new THREE.Vector3(-0.35, 0.8, 0.45).normalize();
  const sunDir = new THREE.Vector3();
  const cSunDay = new THREE.Color(0xffd2b4);
  const cSunNight = new THREE.Color(0x7fd8ff);
  const hSkyDay = new THREE.Color(0xc4ccff);
  const hSkyNight = new THREE.Color(0x3c4a9a);
  const hGroundDay = new THREE.Color(0x5a3a66);
  const hGroundNight = new THREE.Color(0x120c26);
  let raf = 0;
  let active = true;
  let fpsFrames = 0;
  let fpsAt = performance.now();
  let fpsNow = 0;

  /* Frame governor. It watches how long frames really take and, while they run slow, steps down:
     lower resolution with no ambient occlusion and fewer shadow updates, then no bloom, then even
     lower resolution, then half the frame rate. Phones also drop to half rate when nobody is touching. */
  let tick = 0;
  let prevCall = 0;
  let winN = 0;
  let winSlow = 0;
  let winGap = 0;
  let winStart = 0;
  let good = 0;
  const recovered = new Set<number>();
  let lastInput = performance.now();
  let softSig = "";
  let softLeft = 0;
  const touched = () => {
    lastInput = performance.now();
    softLeft = 6;
  };
  for (const ev of ["pointerdown", "pointermove", "keydown", "wheel"]) window.addEventListener(ev, touched, { signal, passive: true });
  const setTier = (next: number) => {
    tier = next;
    fx?.setTier(tier);
    renderer.shadowMap.autoUpdate = tier < 1;
    renderer.shadowMap.needsUpdate = true;
    /* a cooldown before judging again, so one slow moment never cascades through every step */
    settleUntil = performance.now() + 1500;
    good = 0;
    layout();
  };
  /* judged over about a second of frames, so a single hiccup never costs quality */
  const govern = (now: number, work: number, half: boolean) => {
    const gap = (now - prevCall) / (half ? 2 : 1);
    prevCall = now;
    if (now < settleUntil || gap > 5000) {
      winN = winSlow = winGap = 0;
      winStart = now;
      return;
    }
    winN++;
    winGap += gap;
    if (gap > 28 || work > 14) winSlow++;
    if (now - winStart < 1000 || winN < 3) return;
    /* very slow frames skip straight to the cheap end */
    if (winGap / winN > 90 && tier < 3) setTier(3);
    else if (winSlow > winN * 0.4 && tier < 4) setTier(tier + 1);
    else if (winSlow === 0 && tier > 0 && !soft && !recovered.has(tier) && ++good >= 3) {
      /* a few smooth seconds earn one step back up, once, so it never see-saws */
      recovered.add(tier);
      setTier(tier - 1);
    }
    if (winSlow) good = 0;
    winN = winSlow = winGap = 0;
    winStart = now;
  };

  const frame = (now: number) => {
    const began = performance.now();
    if (!active) return;
    raf = requestAnimationFrame(frame);
    tick++;
    const calm = (narrow && !playing && !walking && now - lastInput > 6000 && now - t0 > introMs) || (playing && paused);
    const half = tier >= 4 || calm;
    if (half && tick % 2) return;
    if (soft && !playing && !walking) {
      const sig = `${currentKey}|${selected}|${hoverId}|${nightGoal}|${panelOpen}|${ptrs.size}|${camera.aspect}`;
      if (sig !== softSig) {
        softSig = sig;
        touched();
      }
      if (now - lastInput > 1500 && softLeft <= 0) return;
      softLeft--;
    }
    if (!renderer.shadowMap.autoUpdate && tick % 6 === 0) renderer.shadowMap.needsUpdate = true;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    /* with reduced motion the city stands still, but a walk or a game the visitor started still moves */
    const moving = !reduceMotion || playing || walking;
    const t = moving ? (now - t0) / 1000 : 0;
    fpsFrames++;
    if (now - fpsAt > 2000) {
      fpsNow = (fpsFrames * 1000) / (now - fpsAt);
      fpsFrames = 0;
      fpsAt = now;
    }

    nightNow += (nightGoal - nightNow) * (reduceMotion ? 1 : Math.min(1, dt * 0.9));
    const n = nightNow;
    kit.applyNight(n);
    sunDir.lerpVectors(sunDay, sunNight, n).normalize();
    sun.position.copy(sunDir).multiplyScalar(34);
    sun.color.lerpColors(cSunDay, cSunNight, n);
    sun.intensity = lerp(3.2, 1.2, n);
    hemi.color.lerpColors(hSkyDay, hSkyNight, n);
    hemi.groundColor.lerpColors(hGroundDay, hGroundNight, n);
    hemi.intensity = lerp(2.0, 1.25, n);
    fill.intensity = lerp(0.5, 0.35, n);
    scene.environmentIntensity = lerp(0.9, 0.55, n);
    sky.update(n, sunDir, camera.position);
    (scene.fog as THREE.FogExp2).color.copy(sky.fog);
    (scene.fog as THREE.FogExp2).density = 0.0062 + n * 0.0025;
    fx?.setNight(n);
    sea.update(t, n);

    folks.cull(camera.position, 36);
    if (moving) {
      folks.update(t, dt);
      hitStop = Math.max(0, hitStop - dt);
      const hdt = paused ? 0 : hitStop > 0 ? dt * 0.12 : dt;
      explorer.update(t, hdt);
      particles.update(hdt);
      traffic.update(t, dt);
      for (const a of kit.anims) a(t, dt);
    } else {
      traffic.update(0, 0);
      for (const a of kit.anims) a(0, 0);
    }

    if (playing) {
      const side = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0) + stick.x;
      const fwd = (keys.has("f") ? 1 : 0) - (keys.has("b") ? 1 : 0) + stick.y;
      const run = keys.has("run") || Math.hypot(stick.x, stick.y) > 0.92;
      if (paused) explorer.setInput(0, 0, false, playYaw);
      else explorer.setInput(side, fwd, run, playYaw);

      let best: BuildingId | null = null;
      let bd = Infinity;
      for (const id of ids) {
        const d = Math.hypot(explorer.px - BUILDING_POS[id][0], explorer.pz - BUILDING_POS[id][1]) - RADIUS[id];
        if (d < 1.5 && d < bd) {
          bd = d;
          best = id;
        }
      }
      if (best !== nearId) {
        nearId = best;
        playH?.onNear(best);
      }

      const hy = explorer.py + 0.55;
      for (let i = 0; i < coinPts.length; i++) {
        const [cx, cy, cz] = coinPts[i];
        if (!coinGot[i] && Math.hypot(explorer.px - cx, explorer.pz - cz) < 0.7 && Math.abs(hy - cy) < 0.85) {
          coinGot[i] = true;
          coinAt[i] = t;
          coinTotal += 1;
          combo = t - lastCoin < 1.6 ? combo + 1 : 1;
          lastCoin = t;
          particles.burst("spark", cx, cy, cz, null, Math.min(2, 0.7 + combo * 0.12));
          sfx.play("coin", combo - 1);
          playH?.onCoin(coinTotal, coinPts.length, combo);
        }
        const bob = Math.sin(t * 3 + i) * 0.07;
        if (coinGot[i]) {
          const u = (t - coinAt[i]) / 0.35;
          coinDummy.position.set(cx, cy + bob + Math.min(1, u) * 0.9, cz);
          coinDummy.rotation.set(0, t * 14, 0);
          coinDummy.scale.setScalar(u < 1 ? (1 + u * 0.8) * (1 - u) + 0.0001 : 0.0001);
        } else {
          coinDummy.position.set(cx, cy + bob, cz);
          coinDummy.rotation.set(0, t * 3 + i, 0);
          coinDummy.scale.setScalar(1);
        }
        coinDummy.updateMatrix();
        coins.setMatrixAt(i, coinDummy.matrix);
      }
      coins.instanceMatrix.needsUpdate = true;

      gems.forEach((g, i) => {
        if (gemGot[i]) return;
        const [gx, gy, gz] = gemPts[i];
        g.position.y = gy + Math.sin(t * 2 + i) * 0.12;
        g.rotation.y = t * 1.6 + i;
        const d = Math.hypot(explorer.px - gx, explorer.pz - gz, hy - g.position.y);
        if (d < 0.8) {
          gemGot[i] = true;
          g.visible = false;
          gemTotal += 1;
          particles.burst("gem", gx, g.position.y, gz);
          particles.ring(gx, explorer.py, gz, 2.2, 0xa898ff);
          sfx.play("gem");
          shake = Math.max(shake, 0.12);
          playH?.onGem(gemTotal, gemPts.length);
        }
      });
      gemMat.emissiveIntensity = 0.9 + Math.sin(t * 4) * 0.3;

      pads.forEach((p) => {
        p.kick = Math.max(0, p.kick - dt * 3);
        p.top.scale.y = 1 - p.kick * 0.6;
        p.arrows.forEach((a, i) => {
          const u = (t * 0.9 + i / 3) % 1;
          a.position.y = 0.25 + u * 1.1;
          a.scale.setScalar(0.8 + (1 - u) * 0.4);
          a.rotation.y = t * 1.2;
        });
      });
      padArrowMat.opacity = 0.35 + Math.sin(t * 5) * 0.15;

      miniTick += 1;
      if (mini && miniTick % 2 === 0) drawMini();
    }

    if (walking || playing) {
      /* chase camera: behind him while he walks, in front of him while he greets the visitor */
      explorer.position(v);
      island.localToWorld(v);
      goal.t.copy(v);
      if (playing) {
        /* the camera drifts behind him while he moves; dragging orbits it */
        const sp = explorer.speed;
        if (ptrs.size === 0 && sp > 0.6 && !paused) {
          playYaw += angDiff(playYaw, explorer.heading + Math.PI) * Math.min(1, dt * 0.5 * Math.min(1, sp / 4));
        }
        const air = Math.max(0, explorer.py);
        goal.yaw = goal.yaw + angDiff(goal.yaw, playYaw);
        goal.pitch = playPitch + Math.min(0.35, air * 0.05);
        goal.dist = (narrow ? 6.9 : 6.6) + sp * 0.32 + Math.min(5, air * 0.7);
        goal.fov = (narrow ? 58 : 46) + Math.min(8, sp * 1.4);
      } else {
        const dwell = explorer.dwelling;
        const want = explorer.heading + (dwell ? 0.55 : Math.PI) + walkOff;
        goal.yaw += angDiff(goal.yaw, want);
        goal.pitch = dwell ? 0.2 : 0.3;
        goal.dist = (dwell ? 5.6 : 4.6) * (narrow ? 1.25 : 1);
        goal.fov = narrow ? 56 : 42;
      }
      if (ptrs.size === 0) walkOff *= 1 - Math.min(1, dt * 0.7);
    } else if (!reduceMotion && !selected && now > idleAt && ptrs.size === 0 && !soft) goal.yaw += dt * 0.042;
    const kk = reduceMotion ? 1 : 1 - Math.pow(1 - (playing ? 0.12 : walking ? 0.09 : k), dt * 60);
    cam.yaw += (goal.yaw - cam.yaw) * kk;
    cam.pitch += (goal.pitch - cam.pitch) * kk;
    cam.dist += (goal.dist - cam.dist) * kk;
    cam.fov += (goal.fov - cam.fov) * kk;
    cam.t.lerp(goal.t, kk);

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
    if (shake > 0.001 && reduceMotion) shake = 0;
    if (shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake;
      shake *= Math.max(0, 1 - dt * 7);
    }
    if (!narrow && Math.abs(offGoal - offX) > 0.3) {
      offX += (offGoal - offX) * 0.1;
      camera.setViewOffset(window.innerWidth, window.innerHeight, offX, 0, window.innerWidth, window.innerHeight);
    }
    if (Math.abs(camera.fov - cam.fov) > 0.01) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }

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
      /* keep the label below the top bar, where the tallest tower would otherwise hide it */
      const sy = (-v.y * 0.5 + 0.5) * h;
      const y = !narrow && sy > -80 && sy < 128 ? 128 : sy;
      el.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y - 6)}px,0) translate(-50%,-100%)`;
    });
    govern(now, performance.now() - began, half);
  };
  /* compile every shader up front, a few objects at a time and without waiting on the graphics card,
     instead of all at once inside the first frame */
  /* the post effects draw the scene into an off-screen target, which needs its own shader variants */
  const warmTarget = fx ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null;
  renderer.setRenderTarget(warmTarget);
  try {
    for (const group of [...island.children, ...scene.children]) {
      if (group === island) continue;
      renderer.compile(group, camera, scene);
      await pause();
    }
    await renderer.compileAsync(scene, camera);
    /* reading each program's uniforms is the other slow part of a first frame */
    for (const prog of renderer.info.programs ?? []) {
      (prog as unknown as { getUniforms: () => unknown }).getUniforms();
      await pause();
    }
  } catch {
    /* older browsers compile on first use */
  }
  renderer.setRenderTarget(null);
  warmTarget?.dispose();
  await step("Compiling shaders");
  await fx?.warm(pause);
  await step("Preparing the lens");
  /* and upload the textures a few at a time, instead of all of them inside the first frame */
  const textures = new Set<THREE.Texture>();
  scene.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    if (!mats) return;
    for (const m of Array.isArray(mats) ? mats : [mats]) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
    }
  });
  for (const tex of textures) {
    renderer.initTexture(tex);
    await pause();
  }
  await step("Uploading textures");
  if (soft) {
    setTier(4);
    /* no fly-in: start on the finished view */
    cam.yaw = goal.yaw;
    cam.pitch = goal.pitch;
    cam.dist = goal.dist;
    cam.fov = goal.fov;
    cam.t.copy(goal.t);
  }
  touched();
  /* the first frames still warm up the post effects, so judge from a moment later */
  settleUntil = performance.now() + 1500;
  raf = requestAnimationFrame(frame);

  const api: CityScene = {
    focus: (key) => {
      if (!walking && !playing) applyFocus(key, false);
    },
    select: (id) => {
      selected = id;
    },
    relayout: layout,
    setPanelOpen: (open) => {
      panelOpen = open;
      layout();
    },
    setNight: (n) => {
      nightGoal = Math.min(1, Math.max(0, n));
    },
    startWalk: (events) => {
      api.stopPlay();
      const ev: ExplorerEvents = {
        onStop: (id) => events.onStop(id as BuildingId),
        onLeave: (id) => events.onLeave(id as BuildingId),
      };
      walking = true;
      walkOff = 0;
      lite = true;
      fx?.setLite(true);
      layout();
      explorer.start(ev);
      return true;
    },
    skipStop: () => {
      if (walking) explorer.skip();
    },
    stopWalk: () => {
      if (!walking) return;
      walking = false;
      lite = false;
      explorer.stop();
      fx?.setLite(false);
      layout();
      applyFocus("home", false);
    },
    setActive: (on) => {
      if (on === active) return;
      active = on;
      cancelAnimationFrame(raf);
      if (on) {
        last = performance.now();
        settleUntil = performance.now() + 1500;
        raf = requestAnimationFrame(frame);
      }
    },
    fps: () => fpsNow,
    dispose: () => {
      active = false;
      cancelAnimationFrame(raf);
      explorer.dispose();
      particles.dispose();
      sfx.dispose();
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
      (envMesh.material as THREE.Material).dispose();
      renderer.dispose();
    },
    startPlay: (h) => {
      api.stopWalk();
      playH = h;
      sfx.unlock();
      coinGot.fill(false);
      coinTotal = 0;
      combo = 0;
      coins.visible = true;
      gemGot.fill(false);
      gemTotal = 0;
      gems.forEach((g) => (g.visible = true));
      padGroup.visible = true;
      playing = true;
      paused = false;
      nearId = null;
      walkOff = 0;
      lite = true;
      fx?.setLite(true);
      layout();
      explorer.startFree(-1.5, 1.4, Math.PI / 2);
      playYaw = -Math.PI / 2;
      playPitch = 0.34;
      h.onCoin(0, coinPts.length, 0);
      h.onGem(0, gemPts.length);
      return true;
    },
    stopPlay: () => {
      if (!playing) return;
      playing = false;
      lite = false;
      explorer.stop();
      explorer.setInput(0, 0, false, 0);
      coins.visible = false;
      gems.forEach((g) => (g.visible = false));
      padGroup.visible = false;
      nearId = null;
      keys.clear();
      stick.x = 0;
      stick.y = 0;
      fx?.setLite(false);
      layout();
      applyFocus("home", false);
    },
    setPaused: (p) => {
      paused = p;
      if (p) {
        stick.x = 0;
        stick.y = 0;
        keys.clear();
        explorer.setJump(false);
      }
    },
    setStick: (x, y) => {
      stick.x = Math.max(-1, Math.min(1, x));
      stick.y = Math.max(-1, Math.min(1, y));
    },
    setJump: (down) => {
      if (!playing) return;
      sfx.unlock();
      explorer.setJump(down && !paused);
    },
    dash: () => {
      if (playing && !paused) explorer.dash();
    },
    emote: (e) => {
      if (playing && !paused) explorer.setEmote(e);
    },
    setMuted: (m) => {
      sfx.muted = m;
    },
    setVisited: (ids) => {
      visitedSet = new Set(ids);
    },
    setMinimap: (c) => {
      mini = c;
    },
  };
  return api;
}
