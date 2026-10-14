import * as THREE from "three";

import type { Project } from "@/lib/projects";

export type BuildingId = Project["id"];
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
  dispose: () => void;
};

type FocusSpec = { t: [number, number, number]; d: number; yaw: number; w: number; hh: number };

const COLORS = {
  coral: 0xf25c54,
  peach: 0xffb27a,
  butter: 0xffe08a,
  cream: 0xfff4e3,
  ink: 0x0f2229,
  slate: 0x33475b,
  mint: 0x9fe3c4,
  sky: 0x8ec8ff,
  lilac: 0xc9b6ff,
};

const TAG_HEIGHT: Record<BuildingId, number> = {
  villagewellth: 7.8,
  sahefa: 3.1,
  diwan: 4.1,
  oliva: 4.2,
  watan: 4.9,
};

function angDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createCityScene(opts: CityOptions): CityScene | null {
  const { canvas, tagEls, getMetrics, onPick, reduceMotion } = opts;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const abort = new AbortController();
  const { signal } = abort;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 260);
  scene.add(new THREE.HemisphereLight(0xd6eeff, 0x3b6a6f, 2.5));
  const sun = new THREE.DirectionalLight(0xfff1d6, 3.1);
  sun.position.set(10, 18, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 50;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const island = new THREE.Group();
  scene.add(island);

  /* ---------- builders ---------- */
  const mat = (color: number) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });

  function put(
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    return put(parent, new THREE.BoxGeometry(w, h, d), mat(color), x, y + h / 2, z);
  }

  function windowTexture(base: string, win: string, cols: number, rows: number): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = cols * 16;
    c.height = rows * 16;
    const g = c.getContext("2d");
    if (g) {
      g.fillStyle = base;
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = win;
      for (let r = 0; r < rows; r++) {
        for (let q = 0; q < cols; q++) g.fillRect(q * 16 + 4, r * 16 + 4, 8, 9);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    return t;
  }

  function boxWin(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    base: string,
    win: string,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const cols = Math.max(2, Math.round(w * 1.5));
    const rows = Math.max(2, Math.round(h * 1.4));
    const side = new THREE.MeshStandardMaterial({ map: windowTexture(base, win, cols, rows), roughness: 0.85 });
    const plain = mat(new THREE.Color(base).getHex());
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, plain, plain, side, side]);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function awning(
    g: THREE.Object3D,
    n: number,
    w: number,
    x0: number,
    y: number,
    z: number,
    c1: number,
    c2: number,
  ) {
    for (let a = 0; a < n; a++) {
      const st = box(g, w, 0.1, 1.0, a % 2 ? c2 : c1, x0 + a * w, y, z);
      st.rotation.x = 0.35;
    }
  }

  /* ---------- island ---------- */
  put(island, new THREE.CylinderGeometry(10.5, 10.5, 0.7, 48), mat(0x7fd39a), 0, -0.35, 0);
  put(island, new THREE.CylinderGeometry(10.5, 7.5, 1.6, 48), mat(0xe9b17e), 0, -1.5, 0);
  put(island, new THREE.ConeGeometry(7.4, 4.2, 20), mat(0xc77d5b), 0, -4.4, 0).rotation.x = Math.PI;
  put(island, new THREE.ConeGeometry(2.4, 3, 7), mat(0xb86a4b), -3, -5.2, 2).rotation.x = Math.PI;
  put(island, new THREE.ConeGeometry(1.8, 2.4, 7), mat(0xb86a4b), 3.4, -4.8, -2).rotation.x = Math.PI;

  box(island, 20, 0.06, 1.5, COLORS.slate, 0, 0, 0);
  box(island, 1.5, 0.06, 20, COLORS.slate, 0, 0, 0);
  for (let i = -9; i <= 9; i += 2) {
    box(island, 0.7, 0.07, 0.12, COLORS.cream, i, 0, 0);
    box(island, 0.12, 0.07, 0.7, COLORS.cream, 0, 0, i);
  }

  const hits: THREE.Mesh[] = [];
  function makeHit(g: THREE.Group, w: number, h: number, d: number, y: number, z = 0) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    m.position.set(0, y, z);
    g.add(m);
    hits.push(m);
  }

  const byId = {} as Record<BuildingId, THREE.Group>;
  function building(id: BuildingId, x: number, z: number): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.userData.id = id;
    island.add(g);
    byId[id] = g;
    return g;
  }

  /* VillageWellth: the CRM tower (north-west) */
  const crm = building("villagewellth", -4.5, -4.5);
  boxWin(crm, 3.2, 1.4, 3.2, "#FFB27A", "#FFF4E3", 0, 0, 0);
  boxWin(crm, 2.5, 2.2, 2.5, "#FF9F6B", "#FFF4E3", 0, 1.4, 0);
  boxWin(crm, 1.8, 2.0, 1.8, "#FFB27A", "#FFF4E3", 0, 3.6, 0);
  box(crm, 0.14, 1.4, 0.14, COLORS.ink, 0, 5.6, 0);
  put(crm, new THREE.SphereGeometry(0.22, 12, 10), mat(COLORS.coral), 0, 7.1, 0);
  makeHit(crm, 3.4, 7.4, 3.4, 3.7);

  /* Sahefa: six tenant houses (north-east) */
  const cms = building("sahefa", 4.5, -4.5);
  const roofs = [COLORS.coral, COLORS.butter, COLORS.mint, COLORS.peach, COLORS.sky, COLORS.lilac];
  for (let h = 0; h < 6; h++) {
    const hx = ((h % 3) - 1) * 1.9;
    const hz = (Math.floor(h / 3) - 0.5) * 2.0;
    box(cms, 1.4, 1.1, 1.4, COLORS.cream, hx, 0, hz);
    const roof = put(cms, new THREE.ConeGeometry(1.15, 0.85, 4), mat(roofs[h]), hx, 1.5, hz);
    roof.rotation.y = Math.PI / 4;
  }
  makeHit(cms, 5.8, 2.4, 4.2, 1.2);

  /* DIWAN: the furniture store with a checkout (south-west) */
  const shop = building("diwan", -4.5, 4.5);
  boxWin(shop, 4.0, 1.8, 2.8, "#8EC8FF", "#FFF4E3", 0, 0, 0);
  box(shop, 4.2, 0.2, 3.0, 0x5fa8e8, 0, 1.8, 0);
  box(shop, 0.8, 1.2, 0.06, COLORS.ink, 0, 0, 1.43);
  awning(shop, 6, 0.66, -1.65, 1.35, 1.9, COLORS.mint, COLORS.cream);
  const chair = new THREE.Group();
  box(chair, 0.9, 0.14, 0.9, COLORS.coral, 0, 0.9, 0);
  box(chair, 0.9, 0.9, 0.14, COLORS.coral, 0, 1.05, -0.38);
  const legs: [number, number][] = [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]];
  legs.forEach(([lx, lz]) => box(chair, 0.1, 0.9, 0.1, COLORS.ink, lx, 0, lz));
  chair.position.set(0, 2.0, 0);
  chair.scale.set(1.2, 1.2, 1.2);
  shop.add(chair);
  box(shop, 1.8, 0.4, 0.8, COLORS.lilac, -1.3, 0, 3.1);
  box(shop, 1.8, 0.55, 0.2, 0xb29df5, -1.3, 0.4, 2.8);
  box(shop, 0.2, 0.6, 0.8, 0xb29df5, -2.1, 0.3, 3.1);
  box(shop, 0.2, 0.6, 0.8, 0xb29df5, -0.5, 0.3, 3.1);
  box(shop, 0.06, 1.4, 0.06, COLORS.ink, 0.9, 0, 3.0);
  put(shop, new THREE.SphereGeometry(0.28, 12, 10), mat(COLORS.butter), 0.9, 1.55, 3.0);
  box(shop, 0.5, 0.6, 0.5, COLORS.slate, 1.8, 0, 2.7);
  box(shop, 0.6, 0.12, 0.45, COLORS.ink, 1.8, 0.6, 2.7);
  const screen = box(shop, 0.46, 0.3, 0.05, COLORS.butter, 1.8, 0.7, 2.52);
  screen.rotation.x = -0.5;
  makeHit(shop, 4.6, 3.6, 5.2, 1.8, 0.9);

  /* Oliva: the restaurant (south-east) */
  const rest = building("oliva", 4.5, 4.5);
  boxWin(rest, 3.6, 2.0, 2.8, "#FFE08A", "#FFF4E3", 0, 0, 0);
  awning(rest, 6, 0.6, -1.5, 1.45, 1.9, COLORS.coral, COLORS.cream);
  box(rest, 0.5, 1.0, 0.5, 0xc77d5b, 1.1, 2.0, -0.7);
  const steam: { m: THREE.Mesh; base: number; ph: number }[] = [];
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let s = 0; s < 3; s++) {
    const sm = new THREE.Mesh(new THREE.SphereGeometry(0.17 + s * 0.04, 10, 8), steamMat);
    sm.position.set(1.1, 3.2 + s * 0.4, -0.7);
    rest.add(sm);
    steam.push({ m: sm, base: 3.2 + s * 0.4, ph: s * 1.7 });
  }
  box(rest, 0.1, 0.9, 0.1, COLORS.ink, -0.8, 2.0, 0.2);
  const plate = put(rest, new THREE.CylinderGeometry(0.55, 0.55, 0.1, 24), mat(0xffffff), -0.8, 3.15, 0.2);
  plate.rotation.x = Math.PI / 2;
  box(rest, 0.08, 0.7, 0.05, COLORS.coral, -0.97, 2.8, 0.3);
  box(rest, 0.1, 0.7, 0.05, COLORS.coral, -0.63, 2.8, 0.3);
  const tables: [number, number][] = [[-1.2, COLORS.coral], [0, COLORS.mint], [1.2, COLORS.lilac]];
  tables.forEach(([tx, umbrella]) => {
    box(rest, 0.06, 0.62, 0.06, COLORS.ink, tx, 0, 3.1);
    put(rest, new THREE.CylinderGeometry(0.38, 0.38, 0.06, 16), mat(COLORS.cream), tx, 0.65, 3.1);
    box(rest, 0.03, 0.9, 0.03, COLORS.ink, tx, 0.62, 3.1);
    put(rest, new THREE.ConeGeometry(0.6, 0.3, 12), mat(umbrella), tx, 1.65, 3.1);
  });
  makeHit(rest, 4.4, 3.8, 6.0, 1.9, 0.8);

  /* Watan: the checkpoint gate (west end of the east-west road) */
  const gate = building("watan", -8.2, 0);
  box(gate, 0.55, 2.4, 0.55, COLORS.cream, 0, 0, -1.3);
  box(gate, 0.55, 2.4, 0.55, COLORS.cream, 0, 0, 1.3);
  for (let s = 0; s < 6; s++) {
    box(gate, 0.22, 0.22, 0.44, s % 2 ? COLORS.cream : COLORS.coral, 0, 1.6, -1.1 + s * 0.44);
  }
  box(gate, 1.2, 1.3, 1.2, COLORS.butter, 1.1, 0, -2.4);
  box(gate, 1.4, 0.18, 1.4, COLORS.coral, 1.1, 1.3, -2.4);
  const pin = new THREE.Group();
  put(pin, new THREE.ConeGeometry(0.42, 0.9, 12), mat(COLORS.coral), 0, 0, 0).rotation.x = Math.PI;
  put(pin, new THREE.SphereGeometry(0.46, 14, 12), mat(COLORS.coral), 0, 0.7, 0);
  pin.position.set(0, 3.8, 0);
  gate.add(pin);
  makeHit(gate, 3.6, 3.6, 6.2, 1.6, -0.4);

  /* trees */
  function tree(x: number, z: number, sc: number) {
    const g = new THREE.Group();
    put(g, new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6), mat(0x8a5a3c), 0, 0.3, 0);
    put(g, new THREE.ConeGeometry(0.62, 1.3, 7), mat(0x3faf6e), 0, 1.15, 0);
    put(g, new THREE.ConeGeometry(0.46, 1.0, 7), mat(0x58c985), 0, 1.75, 0);
    g.position.set(x, 0, z);
    g.scale.set(sc, sc, sc);
    island.add(g);
  }
  const treeSpots: [number, number, number][] = [
    [2.2, -8.4, 0.9], [-1.8, -7.8, 1], [7.8, -1.9, 0.9], [8.4, 2.4, 0.8], [1.9, 8.2, 1],
    [-1.8, 2.4, 0.7], [-8.2, -6.4, 0.9], [8.6, -7.2, 0.8], [-1.4, 7.4, 0.9], [-9, 4.6, 0.7], [8.4, 7.4, 0.6],
  ];
  treeSpots.forEach(([x, z, s]) => tree(x, z, s));

  /* selection ring */
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.9, 0.09, 8, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.coral }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  island.add(ring);

  /* requests travelling along the roads */
  const packetMat = new THREE.MeshBasicMaterial({ color: COLORS.coral });
  const packets = Array.from({ length: 10 }, (_, p) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), packetMat);
    island.add(m);
    return { m, axis: p % 2 ? "x" : "z", lane: p % 4 < 2 ? -0.35 : 0.35, ph: p / 10, sp: 0.05 + (p % 3) * 0.018 };
  });

  /* clouds */
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const cloudData: { g: THREE.Group; a: number; r: number }[] = [];
  for (let c = 0; c < 5; c++) {
    const cg = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.9 + k * 0.15, 10, 8), cloudMat);
      sp.position.set(k * 1.0 - 1, (k % 2) * 0.25, 0);
      sp.scale.y = 0.6;
      cg.add(sp);
    }
    const a = (c / 5) * Math.PI * 2;
    cg.position.set(Math.cos(a) * 15, 8 + (c % 3), Math.sin(a) * 15);
    clouds.add(cg);
    cloudData.push({ g: cg, a, r: 15 });
  }
  scene.add(clouds);

  /* ---------- camera rig ---------- */
  const focusSpecs: Record<FocusKey, FocusSpec> = {
    home: { t: [0, 0.2, 0], d: 25, yaw: 0.75, w: 11.4, hh: 9 },
    villagewellth: { t: [-4.5, 2.8, -4.5], d: 12.5, yaw: Math.atan2(-4.5, -4.5), w: 3.9, hh: 4.8 },
    sahefa: { t: [4.5, 1.1, -4.5], d: 12.5, yaw: Math.atan2(4.5, -4.5), w: 4.0, hh: 2.8 },
    diwan: { t: [-4.5, 1.2, 4.5], d: 12.5, yaw: Math.atan2(-4.5, 4.5), w: 4.2, hh: 3.2 },
    oliva: { t: [4.5, 1.4, 4.5], d: 12.5, yaw: Math.atan2(4.5, 4.5), w: 4.2, hh: 3.4 },
    watan: { t: [-8.2, 1.2, 0], d: 11, yaw: Math.atan2(-8.2, 0), w: 3.6, hh: 3.4 },
  };

  const cam = { yaw: 0.2, pitch: 0.7, dist: 46, t: new THREE.Vector3(0, 0, 0) };
  const goal = { yaw: 0.75, pitch: 0.62, dist: 25, t: new THREE.Vector3(0, 0.2, 0) };
  let currentKey: FocusKey = "home";
  let narrow = false;
  let freeFrac = 1;
  let idleAt = 0;
  let selected: BuildingId | null = null;
  let hoverId: BuildingId | null = null;

  const distFor = (key: FocusKey): number => {
    const f = focusSpecs[key];
    if (!narrow) return f.d;
    const th = Math.tan((camera.fov * Math.PI) / 360);
    return Math.min(95, Math.max(7, Math.max(f.w / (th * camera.aspect), f.hh / (th * freeFrac))));
  };

  const applyFocus = (key: FocusKey, keepPose: boolean) => {
    const f = focusSpecs[key];
    currentKey = key;
    goal.dist = distFor(key);
    if (keepPose) return;
    goal.t.set(f.t[0], f.t[1], f.t[2]);
    goal.yaw = goal.yaw + angDiff(goal.yaw, f.yaw);
    goal.pitch = key === "home" ? 0.62 : 0.5;
    idleAt = performance.now() + 2500;
  };

  const layout = () => {
    const m = getMetrics();
    const w = window.innerWidth;
    const h = window.innerHeight;
    narrow = m.narrow;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = narrow ? 50 : 34;
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
  cam.dist = goal.dist * 1.8;
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
    const r = ray.intersectObjects(hits, false);
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
      goal.pitch = Math.min(1.15, Math.max(0.25, goal.pitch + dy * 0.004));
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
  const t0 = performance.now();
  const lerp = reduceMotion ? 1 : 0.07;
  const v = new THREE.Vector3();
  const ids = Object.keys(byId) as BuildingId[];
  let raf = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const t = reduceMotion ? 0 : (now - t0) / 1000;

    if (!reduceMotion && !selected && now > idleAt && ptrs.size === 0) goal.yaw += 0.0016;

    cam.yaw += (goal.yaw - cam.yaw) * lerp;
    cam.pitch += (goal.pitch - cam.pitch) * lerp;
    cam.dist += (goal.dist - cam.dist) * lerp;
    cam.t.lerp(goal.t, lerp);
    const cp = Math.cos(cam.pitch);
    camera.position.set(
      cam.t.x + Math.sin(cam.yaw) * cp * cam.dist,
      cam.t.y + Math.sin(cam.pitch) * cam.dist,
      cam.t.z + Math.cos(cam.yaw) * cp * cam.dist,
    );
    camera.lookAt(cam.t);

    island.position.y = Math.sin(t * 0.8) * 0.12;
    pin.position.y = 3.8 + Math.sin(t * 2) * 0.18;
    pin.rotation.y = t * 1.2;
    steam.forEach((s) => {
      const u = (t * 0.5 + s.ph) % 2;
      s.m.position.y = s.base + (u > 1 ? 2 - u : u) * 0.5;
    });

    ids.forEach((id) => {
      const target = id === selected ? 1.07 : id === hoverId ? 1.04 : 1;
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

    packets.forEach((k) => {
      const u = ((k.ph + t * k.sp) % 1) * 17 - 8.5;
      if (k.axis === "x") k.m.position.set(u, 0.3, k.lane);
      else k.m.position.set(k.lane, 0.3, u);
    });
    cloudData.forEach((c) => {
      const a = c.a + t * 0.02;
      c.g.position.x = Math.cos(a) * c.r;
      c.g.position.z = Math.sin(a) * c.r;
    });

    renderer.render(scene, camera);

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
    dispose: () => {
      cancelAnimationFrame(raf);
      abort.abort();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material;
        if (m) {
          (Array.isArray(m) ? m : [m]).forEach((mm) => {
            const std = mm as THREE.MeshStandardMaterial;
            if (std.map) std.map.dispose();
            mm.dispose();
          });
        }
      });
      renderer.dispose();
    },
  };
}
