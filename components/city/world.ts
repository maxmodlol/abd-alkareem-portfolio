import * as THREE from "three";

import { canvasTex, rng, type Kit } from "./kit";
import type { Folks } from "./people";
import type { Traffic } from "./traffic";

export const SEA_Y = -2.4;
export const ISLE = 11.5;

/* ------------------------------------------------------------------ */
/* Sky                                                                                             */
/* ------------------------------------------------------------------ */
const SKY_DAY = {
  top: new THREE.Color(0x3b5fa8),
  mid: new THREE.Color(0xe58a7c),
  hor: new THREE.Color(0xffb36b),
  sun: new THREE.Color(0xffc98a),
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

export function makeSky(scene: THREE.Scene): Sky {
  const mat = createSkyMaterial();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), mat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  scene.add(dome);

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
      stars.position.copy(cam);
      starMat.opacity = Math.max(0, night * 1.2 - 0.25);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Sea                                                                                             */
/* ------------------------------------------------------------------ */
export type Sea = { update: (t: number, night: number) => void };

export function makeSea(scene: THREE.Scene, island: THREE.Group): Sea {
  const size = 260;
  const seg = 150;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = Float32Array.from(pos.array as ArrayLike<number>);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a8f9a, roughness: 0.22, metalness: 0.18, flatShading: true });
  const sea = new THREE.Mesh(geo, mat);
  sea.position.y = SEA_Y;
  scene.add(sea);

  /* foam where the cliffs meet the water */
  const foamTex = canvasTex(256, 256, (g, w, h) => {
    const c = w / 2;
    const gr = g.createRadialGradient(c, h / 2, 0, c, h / 2, c);
    gr.addColorStop(0.7, "rgba(255,255,255,0)");
    gr.addColorStop(0.77, "rgba(255,255,255,0.9)");
    gr.addColorStop(0.88, "rgba(255,255,255,0.22)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const foamMat = new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, opacity: 0.55, depthWrite: false });
  const foam = new THREE.Mesh(new THREE.RingGeometry(9.6, 14.2, 72), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = SEA_Y + 0.06;
  scene.add(foam);
  void island;

  const dayC = new THREE.Color(0x2a8f9a);
  const nightC = new THREE.Color(0x07243a);
  return {
    update(t, night) {
      const arr = pos.array as Float32Array;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        arr[i * 3 + 1] = Math.sin(x * 0.35 + t * 0.9) * 0.1 + Math.cos(z * 0.3 + t * 0.7) * 0.09 + Math.sin((x + z) * 0.2 + t * 0.5) * 0.12;
      }
      pos.needsUpdate = true;
      mat.color.lerpColors(dayC, nightC, night);
      foam.scale.setScalar(1 + Math.sin(t * 0.8) * 0.012);
      foamMat.opacity = 0.5 - night * 0.18;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Island body: grass, cliffs, rocks, waterfalls, tunnel mouths                                    */
/* ------------------------------------------------------------------ */
export function makeIsland(kit: Kit, island: THREE.Group): void {
  const grass = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#6bb56a";
    g.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 1100; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(84,166,96,0.32)" : "rgba(128,204,112,0.28)";
      g.beginPath();
      g.arc(r() * w, r() * h, 5 + r() * 24, 0, Math.PI * 2);
      g.fill();
    }
  });
  const soil = kit.mat(0x7a5a42, 1, 0, true);
  const top = new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 });
  kit.put(island, new THREE.CylinderGeometry(ISLE, ISLE, 0.5, 72), [soil, top, soil], 0, -0.25, 0, true);

  /* faceted cliffs, vertex-coloured from soil down to wet stone */
  const rs = 60;
  const hs = 8;
  const cg = new THREE.CylinderGeometry(ISLE - 0.05, 9.4, 3.9, rs, hs, true);
  const cp = cg.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(cp.count * 3);
  const R = rng(3);
  const falls = [0.62, 3.76];
  const table: number[][] = [];
  for (let iy = 0; iy <= hs; iy++) {
    const row: number[] = [];
    for (let ix = 0; ix < rs; ix++) row.push(R());
    table.push(row);
  }
  const cSoil = new THREE.Color(0x7a5a42);
  const cTan = new THREE.Color(0xc08a5e);
  const cWet = new THREE.Color(0x5e4f52);
  const tmp = new THREE.Color();
  for (let iy = 0; iy <= hs; iy++) {
    for (let ix = 0; ix <= rs; ix++) {
      const i = iy * (rs + 1) + ix;
      const k = ix % rs;
      const ang = (k / rs) * Math.PI * 2;
      const nearFall = falls.some((a) => Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a))) < 0.2);
      const j = table[iy][k] - 0.5;
      const amp = iy === 0 || nearFall ? 0 : iy < 3 ? 0.07 : 0.16;
      const f = 1 + j * amp;
      cp.setXYZ(i, cp.getX(i) * f, cp.getY(i) + (iy === 0 || nearFall ? 0 : j * 0.22), cp.getZ(i) * f);
      const u = iy / hs;
      tmp.lerpColors(cSoil, cTan, Math.min(1, u * 2.8));
      if (u > 0.55) tmp.lerp(cWet, (u - 0.55) * 1.8);
      tmp.toArray(colors, i * 3);
    }
  }
  cg.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  cg.computeVertexNormals();
  const cliff = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  cliff.position.y = -1.97;
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  island.add(cliff);

  /* boulders at the waterline */
  const rockMat = kit.mat(0x8a7a6a, 1, 0, true);
  const rr = rng(8);
  for (let i = 0; i < 14; i++) {
    const a = rr() * Math.PI * 2;
    const rad = 10.1 + rr() * 2.6;
    const s = 0.35 + rr() * 0.9;
    const m = kit.put(island, new THREE.DodecahedronGeometry(s, 0), rockMat, Math.cos(a) * rad, SEA_Y + s * 0.2, Math.sin(a) * rad);
    m.rotation.set(rr() * 3, rr() * 3, rr() * 3);
  }

  /* rim shrubs */
  const shrubGeo = new THREE.IcosahedronGeometry(1, 0);
  const greens = [0x3faf6e, 0x58c985, 0x2f9a60];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const near = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].some((q) => Math.abs(Math.atan2(Math.sin(a - q), Math.cos(a - q))) < 0.16);
    if (near || falls.some((f) => Math.abs(Math.atan2(Math.sin(a - f), Math.cos(a - f))) < 0.2)) continue;
    const s = 0.16 + rr() * 0.16;
    const m = kit.put(island, shrubGeo, kit.mat(greens[i % 3], 0.9, 0, true), Math.cos(a) * 11.05, s * 0.7, Math.sin(a) * 11.05, false);
    m.scale.set(s * 1.4, s, s * 1.4);
  }

  /* waterfalls spilling off the rim */
  const streak = canvasTex(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const r = rng(21);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`;
      g.fillRect(r() * w, r() * h, 2 + r() * 4, 30 + r() * 110);
    }
    g.fillStyle = "rgba(150,225,240,0.35)";
    g.fillRect(0, 0, w, h);
  });
  streak.wrapT = THREE.RepeatWrapping;
  const fallMat = new THREE.MeshBasicMaterial({ map: streak, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  const mists: THREE.Mesh[] = [];
  const mistMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false });
  falls.forEach((a) => {
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 11.5, -0.04, Math.sin(a) * 11.5);
    pivot.rotation.y = Math.PI / 2 - a;
    island.add(pivot);
    const geo = new THREE.PlaneGeometry(0.9, 2.5);
    geo.translate(0, -1.25, 0);
    const sheet = new THREE.Mesh(geo, fallMat);
    sheet.rotation.x = 0.5;
    sheet.position.z = 0.05;
    pivot.add(sheet);
    kit.box(pivot, 0.9, 0.03, 2.4, 0x5ccfe8, 0, 0.03, -1.2, false);
    [0, 1, 2].forEach((m) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), mistMat);
      puff.position.set((m - 1) * 0.35, -2.4, 1.1);
      pivot.add(puff);
      mists.push(puff);
    });
  });
  kit.anims.push((t, dt) => {
    streak.offset.y -= dt * 1.1;
    mists.forEach((m, i) => m.scale.setScalar(1 + Math.sin(t * 1.6 + i) * 0.25));
  });

  /* tunnel mouths where the roads leave the island */
  const stone = kit.mat(0x9a8f80, 0.95);
  const black = new THREE.MeshBasicMaterial({ color: 0x05080a });
  const mouth = (axis: "x" | "z", s: 1 | -1) => {
    const g = new THREE.Group();
    g.position.set(axis === "x" ? s * 10.6 : 0, 0, axis === "z" ? s * 10.6 : 0);
    g.rotation.y = axis === "x" ? Math.PI / 2 : 0;
    island.add(g);
    kit.box(g, 3.4, 1.7, 1.2, stone, 0, 0, 0);
    kit.box(g, 3.5, 0.12, 1.3, 0x6bb56a, 0, 1.7, 0, false);
    const face = s * (axis === "x" ? 1 : 1);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.95), black);
    hole.position.set(0, 0.5, -0.61 * face);
    hole.rotation.y = face > 0 ? Math.PI : 0;
    g.add(hole);
    kit.box(g, 0.2, 1.0, 0.1, 0xf25c54, -0.92, 0, -0.62 * face, false);
    kit.box(g, 0.2, 1.0, 0.1, 0xf25c54, 0.92, 0, -0.62 * face, false);
    kit.box(g, 2.0, 0.12, 0.1, 0xf25c54, 0, 1.0, -0.62 * face, false);
  };
  mouth("x", 1);
  mouth("x", -1);
  mouth("z", 1);
  mouth("z", -1);
}

/* ------------------------------------------------------------------ */
/* Roads, crossings, lamps, trees and the people on the pavements                                  */
/* ------------------------------------------------------------------ */
export function makeStreets(kit: Kit, island: THREE.Group, traffic: Traffic, folks: Folks): void {
  const asphalt = kit.mat(0x2b3640, 0.92);
  const curb = kit.mat(0xd4c9b5, 0.9);
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
  const leafA = [kit.mat(0x3faf6e, 0.85, 0, true), kit.mat(0x58c985, 0.85, 0, true), kit.mat(0x2f9a60, 0.85, 0, true)];
  const tree = (x: number, z: number, s: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    island.add(g);
    kit.cyl(g, 0.07, 0.11, 0.55, trunk, 0, 0, 0, 6);
    const pine = rr() < 0.5;
    const leaf = leafA[Math.floor(rr() * 3)];
    if (pine) {
      kit.cone(g, 0.5, 0.9, leaf, 0, 0.4, 0, 7);
      kit.cone(g, 0.38, 0.8, leaf, 0, 0.9, 0, 7);
      kit.cone(g, 0.25, 0.6, leaf, 0, 1.35, 0, 7);
    } else {
      kit.put(g, new THREE.IcosahedronGeometry(0.5, 0), leaf, 0, 0.95, 0);
      kit.put(g, new THREE.IcosahedronGeometry(0.34, 0), leaf, 0.3, 0.7, 0.1);
      kit.put(g, new THREE.IcosahedronGeometry(0.3, 0), leaf, -0.28, 0.75, -0.12);
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
  heli.add(sl);
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
  env.castShadow = true;
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
    { g: sailboat(0xf25c54), rad: 20, sp: 0.04, a0: 0.5 },
    { g: sailboat(0x2f80c8), rad: 25, sp: 0.03, a0: 3.4 },
    { g: ferry(), rad: 31, sp: -0.022, a0: 2.2 },
  ];

  /* lighthouse on a rock */
  const lh = new THREE.Group();
  lh.position.set(25, SEA_Y, -17);
  scene.add(lh);
  const rock = kit.mat(0x8a7a6a, 1, 0, true);
  kit.put(lh, new THREE.DodecahedronGeometry(2.2, 0), rock, 0, 0.3, 0);
  kit.put(lh, new THREE.DodecahedronGeometry(1.2, 0), rock, 1.8, 0.1, 1.0);
  kit.put(lh, new THREE.DodecahedronGeometry(1.0, 0), rock, -1.5, 0.2, -1.2);
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

  /* clouds that catch the sunset */
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0x6b3a3a, emissiveIntensity: 0.35 });
  const clouds: { g: THREE.Group; a: number; r: number; sp: number }[] = [];
  for (let c = 0; c < 9; c++) {
    const g = new THREE.Group();
    const n = 3 + (c % 3);
    for (let k = 0; k < n; k++) {
      const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + (k % 2) * 0.35, 1), cloudMat);
      sp.position.set(k * 1.1 - n * 0.55, (k % 2) * 0.3, (k % 3) * 0.25);
      sp.scale.y = 0.55;
      g.add(sp);
    }
    const a = (c / 9) * Math.PI * 2;
    const r = 26 + (c % 3) * 9;
    g.position.set(Math.cos(a) * r, 10 + (c % 4) * 1.6, Math.sin(a) * r);
    g.scale.setScalar(1.3 + (c % 3) * 0.5);
    scene.add(g);
    clouds.push({ g, a, r, sp: 0.006 + (c % 3) * 0.003 });
  }

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
    beamMat.opacity = 0.03 + kit.night * 0.2;
    lamp.scale.setScalar(1 + Math.sin(t * 5) * 0.04);

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
