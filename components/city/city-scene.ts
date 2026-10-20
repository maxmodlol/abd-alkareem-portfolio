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
import { createPhysicalSky, makeArcs, makeSea, makeSkyLife, makeSky, makeStreets } from "./world";
import { grassR, makeCoast, makeDowntown, makeIslets, Palms, SGSOFT_POS, SGSOFT_ROT, type Solid } from "./coast";
import { setTextureDetail } from "./textures";

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
  scene.fog = new THREE.FogExp2(0xcfeaf8, 0.006);

  /* light rig: a bright tropical sun that turns into moonlight, plus a cool fill */
  const hemi = new THREE.HemisphereLight(0xd6ecff, 0x6f8f5a, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc58a, 3.6);
  sun.castShadow = !startNarrow;
  sun.shadow.mapSize.set(4096, 4096);
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
  const fill = new THREE.DirectionalLight(0x8fb8ff, 0.5);
  fill.position.set(10, 8, 12);
  scene.add(fill);

  /* soft reflections from the sky, used by glass and water */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = createPhysicalSky();
  envSky.mesh.scale.setScalar(40);
  envSky.set(new THREE.Vector3(-0.5, 0.72, 0.48).normalize(), 1);
  const envMesh = envSky.mesh;
  envScene.add(envMesh);
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.7;

  /* the world */
  setTextureDetail(startNarrow);
  const kit = new Kit();
  kit.lightsOn = !startNarrow;
  const folks = new Folks(kit);
  const traffic = new Traffic(kit);
  const sky = makeSky(scene);
  const island = new THREE.Group();
  scene.add(island);
  const sea = makeSea(scene);
  const palms = new Palms();
  const extraSolids: Solid[] = makeCoast(kit, island, palms);
  makeIslets(kit, scene, palms);
  extraSolids.push(...makeDowntown(kit, island, palms));
  buildVillageWellth(kit, folks, island);
  buildSahefa(kit, folks, island);
  buildDiwan(kit, folks, island);
  buildOliva(kit, folks, island);
  const watan = buildWatan(kit, folks, island);
  buildCarebooks(kit, folks, island, "CareBooks");
  buildArvo(kit, folks, island, "Arvo");
  buildSgsoft(kit, folks, island, SGSOFT_POS, SGSOFT_ROT);
  traffic.zones.push({ axis: "x", dir: -1, stop: -7.55, red: () => !watan.gate.open });
  traffic.zones.push({ axis: "x", dir: 1, stop: -8.85, red: () => !watan.gate.open });
  makeStreets(kit, island, traffic, folks, palms);
  palms.build(island, !startNarrow);
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
  const explorer = new Explorer(kit, island, WALK_ROUTE);
  explorer.colliders = (Object.keys(RADIUS) as BuildingId[]).map((id): [number, number, number] => [
    BUILDING_POS[id][0],
    BUILDING_POS[id][1],
    RADIUS[id],
  ]);
  explorer.cars = () => traffic.probe();
  /* the whole lawn is walkable, downtown included, up to a step from the sand */
  explorer.edge = (a) => grassR(a) - 0.55;
  const particles = new Particles(island, startNarrow);
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
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xffc83d,
    roughness: 0.3,
    metalness: 0.6,
    emissive: 0xffa800,
    emissiveIntensity: 0.55,
  });
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
  const padGlow = kit.glowMat(0xff6b57, 1.6, 4, 0x2a1210);
  const padTop = new THREE.MeshStandardMaterial({ color: 0xfff4e3, roughness: 0.4, emissive: 0xffb27a, emissiveIntensity: 0.25 });
  const padArrowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffb27a).multiplyScalar(1.4),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const arrowShape = new THREE.Shape();
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
    kit.cyl(g, 0.56, 0.62, 0.08, 0x1d2a33, 0, 0, 0, 28);
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
    kit.pointLight(g, 0xff8a6a, 0.4, 1.4, 3, 0, 0.5, 0);
    pads.push({ top, arrows, kick: 0 });
  });

  const gemPts: [number, number, number][] = PADS.map(([x, z], i) => {
    const a = (i * Math.PI) / 2 + 0.6;
    return [x + Math.sin(a) * 1.3, 3.4, z + Math.cos(a) * 1.3];
  });
  const gemGeo = new THREE.OctahedronGeometry(0.26, 0);
  gemGeo.scale(1, 1.4, 1);
  const gemMat = new THREE.MeshStandardMaterial({
    color: 0x7fd3ff,
    roughness: 0.15,
    metalness: 0.3,
    emissive: 0x4aa8ff,
    emissiveIntensity: 1.1,
    flatShading: true,
  });
  const gems = gemPts.map(([x, y, z]) => {
    const m = new THREE.Mesh(gemGeo, gemMat);
    m.position.set(x, y, z);
    m.visible = false;
    island.add(m);
    return m;
  });
  const gemGot: boolean[] = gemPts.map(() => false);
  let gemTotal = 0;
  island.updateMatrixWorld(true);
  makeMeadow(
    kit,
    island,
    (x, z) => Math.hypot(x, z) < 10.7 && solid(x, z) < 0.02 && !PADS.some(([px, pz]) => Math.hypot(x - px, z - pz) < 0.9),
    startNarrow ? { tufts: 900, flowers: 140, butterflies: 6 } : { tufts: 2600, flowers: 340, butterflies: 10 },
  );
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

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.06, 8, 64),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf25c54).multiplyScalar(2.2) }),
  );
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
        particles.ring(x, y, z, 1.2, 0xffe08a);
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
        particles.ring(x, y, z, 2.6, 0xff8a6a);
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
        particles.ring(x, 0, z, 1.8, 0xf25c54);
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
    home: { t: [-1.4, 2.2, -1.4], d: 50, yaw: 0.75, pitch: 0.6, w: 15, hh: 11 },
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
  const stick = { x: 0, y: 0 };
  let walkOff = 0;
  let playYaw = 0;
  let playPitch = 0.34;
  let shake = 0;
  let hitStop = 0;
  let lite = false;
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
    const pr = Math.min(window.devicePixelRatio || 1, narrow || lite ? 1.5 : 2);
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
  fx = createFx(renderer, scene, camera, { samples: startNarrow ? 0 : 4, tilt: startNarrow ? 0 : 1, ao: !startNarrow });
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

  /* ---------- keyboard ---------- */
  const typing = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  };
  window.addEventListener(
    "keydown",
    (e) => {
      if (!playing || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();
      keys.add(key);
      if (e.repeat || paused) return;
      sfx.unlock();
      if (key === "e" && nearId) {
        sfx.play("enter");
        playH?.onInteract(nearId);
      }
      if (key === " ") explorer.setJump(true);
      if (key === "q" || key === "x") explorer.dash();
      if (key === "1") explorer.setEmote("wave");
      if (key === "2") explorer.setEmote("dance");
    },
    { signal },
  );
  window.addEventListener(
    "keyup",
    (e) => {
      const key = e.key.toLowerCase();
      keys.delete(key);
      if (key === " ") explorer.setJump(false);
    },
    { signal },
  );
  window.addEventListener(
    "blur",
    () => {
      keys.clear();
      explorer.setJump(false);
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
    ctx.fillStyle = "rgba(20,130,170,0.9)";
    ctx.fillRect(0, 0, S, S);
    /* the island's real outline: sand, then lawn */
    for (const [col, off] of [["#d9b06a", 1.7], ["#3f7a52", 0]] as const) {
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
    ctx.strokeStyle = "#5b6770";
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
    ctx.fillStyle = "#ffc83d";
    for (let i = 0; i < coinPts.length; i++) {
      if (coinGot[i]) continue;
      const q = P(coinPts[i][0], coinPts[i][2]);
      ctx.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3);
    }
    ctx.fillStyle = "#ff8a6a";
    for (const [x, z] of PADS) {
      const q = P(x, z);
      ctx.beginPath();
      ctx.arc(q[0], q[1], 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#7fd3ff";
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
      ctx.fillStyle = visitedSet.has(id) ? "#58c985" : "#f25c54";
      ctx.beginPath();
      ctx.arc(q[0], q[1], id === nearId ? 6.5 : 5, 0, Math.PI * 2);
      ctx.fill();
      if (id === nearId) {
        ctx.strokeStyle = "#fff";
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
    ctx.fillStyle = "#fff";
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
  const k = reduceMotion ? 1 : 0.06;
  const v = new THREE.Vector3();
  const sunDay = new THREE.Vector3(-0.5, 0.72, 0.48).normalize();
  const sunNight = new THREE.Vector3(-0.45, 0.75, 0.5).normalize();
  const sunDir = new THREE.Vector3();
  const cSunDay = new THREE.Color(0xfff0d8);
  const cSunNight = new THREE.Color(0x9bb8ff);
  const hSkyDay = new THREE.Color(0xd6ecff);
  const hSkyNight = new THREE.Color(0x5a6fb8);
  const hGroundDay = new THREE.Color(0x6f8f5a);
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
    sun.intensity = lerp(2.3, 0.9, n);
    hemi.color.lerpColors(hSkyDay, hSkyNight, n);
    hemi.groundColor.lerpColors(hGroundDay, hGroundNight, n);
    hemi.intensity = lerp(1.05, 0.7, n);
    fill.intensity = lerp(0.5, 0.25, n);
    scene.environmentIntensity = lerp(0.7, 0.25, n);
    sky.update(n, sunDir, camera.position);
    (scene.fog as THREE.FogExp2).color.copy(sky.fog);
    (scene.fog as THREE.FogExp2).density = 0.006 + n * 0.0045;
    fx?.setNight(n);
    sea.update(t, n);

    if (!reduceMotion) {
      folks.update(t, dt);
      hitStop = Math.max(0, hitStop - dt);
      const hdt = hitStop > 0 ? dt * 0.12 : dt;
      explorer.update(t, hdt);
      particles.update(hdt);
      traffic.update(t, dt);
      for (const a of kit.anims) a(t, dt);
    } else {
      traffic.update(0, 0);
      for (const a of kit.anims) a(0, 0);
    }

    if (playing) {
      const kd = (a: string, b: string) => keys.has(a) || keys.has(b);
      const side = (kd("d", "arrowright") ? 1 : 0) - (kd("a", "arrowleft") ? 1 : 0) + stick.x;
      const fwd = (kd("w", "arrowup") ? 1 : 0) - (kd("s", "arrowdown") ? 1 : 0) + stick.y;
      const run = keys.has("shift") || Math.hypot(stick.x, stick.y) > 0.92;
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
          particles.ring(gx, explorer.py, gz, 2.2, 0x7fd3ff);
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
    } else if (!reduceMotion && !selected && now > idleAt && ptrs.size === 0) goal.yaw += 0.0007;
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
  };
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
      if (reduceMotion) return false;
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
    stopWalk: () => {
      if (!walking) return;
      walking = false;
      lite = false;
      explorer.stop();
      fx?.setLite(false);
      layout();
      applyFocus("home", false);
    },
    dispose: () => {
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
      renderer.dispose();
    },
    startPlay: (h) => {
      if (reduceMotion) return false;
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
