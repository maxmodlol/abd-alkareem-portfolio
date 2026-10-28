import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { rng } from "./kit";
import type { Frame } from "./path";

/**
 * The guide: a stylised likeness of the portfolio's author at 1.79 m, built from smooth shapes on a
 * small skeleton of joints. Short curly hair faded at the sides, round metal glasses, a moustache and
 * chin beard, a mustard hoodie over a white T-shirt, dark jeans and white trainers. The walk is
 * procedural and driven by the distance he covers, so his feet keep pace with the ground at any
 * scroll speed; standing, he breathes, shifts his weight and turns his head to the camera.
 */

export type Character = {
  root: THREE.Group;
  update: (f: Frame, t: number, camera: THREE.Vector3) => void;
  dispose: () => void;
};

const SKIN = 0xc28c6a;
const HAIR = 0x16110e;
const HOODIE = 0xd49a1c;

export function buildCharacter(o: { shadows: boolean }): Character {
  const mats = {
    skin: new THREE.MeshPhysicalMaterial({ color: SKIN, roughness: 0.52, sheen: 0.4, sheenColor: new THREE.Color(0xff9f80), sheenRoughness: 0.5 }),
    hair: new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.62 }),
    fade: new THREE.MeshStandardMaterial({ color: 0x3a2a21, roughness: 0.9 }),
    beard: new THREE.MeshStandardMaterial({ color: 0x1c1511, roughness: 0.8 }),
    stubble: new THREE.MeshStandardMaterial({ color: 0x46322a, roughness: 0.85 }),
    hoodie: new THREE.MeshPhysicalMaterial({ color: HOODIE, roughness: 0.92, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffd27a) }),
    string: new THREE.MeshStandardMaterial({ color: 0xe8c05a, roughness: 0.8 }),
    tee: new THREE.MeshStandardMaterial({ color: 0xece8df, roughness: 0.85 }),
    denim: new THREE.MeshPhysicalMaterial({ color: 0x33445f, roughness: 0.88, sheen: 0.6, sheenColor: new THREE.Color(0x6a7ea6) }),
    shoe: new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.55 }),
    sole: new THREE.MeshStandardMaterial({ color: 0xcfc8ba, roughness: 0.8 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.28, metalness: 0.95 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.25, metalness: 1 }),
    lens: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.14, depthWrite: false, envMapIntensity: 2 }),
    eye: new THREE.MeshStandardMaterial({ color: 0xeee8e2, roughness: 0.2 }),
    iris: new THREE.MeshStandardMaterial({ color: 0x24160f, roughness: 0.15 }),
    lip: new THREE.MeshStandardMaterial({ color: 0xa36e5c, roughness: 0.5 }),
  };
  const geos: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, p?: number[], r?: number[], s?: number[]) => {
    geos.push(g);
    const x = new THREE.Mesh(g, m);
    if (p) x.position.set(p[0], p[1], p[2]);
    if (r) x.rotation.set(r[0], r[1], r[2]);
    if (s) x.scale.set(s[0], s[1], s[2]);
    x.castShadow = o.shadows && m !== mats.lens;
    x.receiveShadow = o.shadows;
    parent.add(x);
    return x;
  };
  const joint = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const j = new THREE.Group();
    j.position.set(x, y, z);
    parent.add(j);
    return j;
  };
  const sphere = (seg = 24) => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 14);

  /* ---------- skeleton ---------- */
  const root = new THREE.Group();
  const pelvis = joint(root, 0, 0.95, 0);
  const spine = joint(pelvis, 0, 0.02, 0);
  const neck = joint(spine, 0, 0.55, 0.0);
  const head = joint(neck, 0, 0.03, 0.012);
  /* a touch larger than life, so the face reads at a distance */
  head.scale.setScalar(1.08);
  const shoulder = [joint(spine, 0.19, 0.44, -0.005), joint(spine, -0.19, 0.44, -0.005)];
  const elbow = shoulder.map((s) => joint(s, 0, -0.29, 0));
  const wrist = elbow.map((e) => joint(e, 0, -0.265, 0));
  const hip = [joint(pelvis, 0.095, -0.05, 0), joint(pelvis, -0.095, -0.05, 0)];
  const knee = hip.map((h) => joint(h, 0, -0.42, 0));
  const ankle = knee.map((k) => joint(k, 0, -0.41, 0));

  /* ---------- hoodie ---------- */
  const profile = [
    [0.0, -0.14],
    [0.165, -0.14],
    [0.185, -0.11],
    [0.18, 0.0],
    [0.172, 0.12],
    [0.186, 0.27],
    [0.196, 0.38],
    [0.19, 0.45],
    [0.16, 0.51],
    [0.09, 0.545],
    [0.0, 0.55],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(new THREE.LatheGeometry(profile, 36), mats.hoodie, spine, [0, 0, 0], undefined, [1.06, 1, 0.62]);
  /* the hood lying round the neck and down the back */
  mesh(new THREE.TorusGeometry(0.1, 0.034, 12, 28), mats.hoodie, spine, [0, 0.535, -0.012], [Math.PI / 2 + 0.18, 0, 0], [1.08, 0.92, 0.75]);
  mesh(sphere(), mats.hoodie, spine, [0, 0.44, -0.1], [0.3, 0, 0], [0.13, 0.12, 0.06]);
  /* white T-shirt at the collar */
  mesh(new THREE.TorusGeometry(0.06, 0.009, 8, 20, Math.PI), mats.tee, spine, [0, 0.55, 0.02], [Math.PI / 2 + 0.35, 0, Math.PI], [1, 1, 0.9]);
  mesh(sphere(16), mats.tee, spine, [0, 0.515, 0.055], undefined, [0.05, 0.03, 0.025]);
  /* kangaroo pocket */
  mesh(new RoundedBoxGeometry(0.24, 0.13, 0.03, 3, 0.012), mats.hoodie, spine, [0, 0.06, 0.103]);
  /* drawstrings through steel eyelets */
  for (const sx of [-1, 1]) {
    mesh(new THREE.TorusGeometry(0.008, 0.003, 6, 14), mats.steel, spine, [sx * 0.045, 0.49, 0.112], [-0.35, 0, 0]);
    const cord = new THREE.CylinderGeometry(0.0045, 0.0045, 0.2, 6);
    mesh(cord, mats.string, spine, [sx * 0.05, 0.39, 0.12], [0.08, 0, sx * -0.05]);
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.025, 6), mats.steel, spine, [sx * 0.055, 0.28, 0.125]);
  }

  /* ---------- head ---------- */
  geos.push();
  const skull = mesh(sphere(32), mats.skin, head, [0, 0.13, 0], undefined, [0.079, 0.1, 0.094]);
  void skull;
  /* the jaw narrows to the chin */
  const jaw = (g: THREE.BufferGeometry) => {
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k);
      const taper = 0.6 + 0.4 * Math.pow(THREE.MathUtils.clamp((y + 1) / 1.5, 0, 1), 0.7);
      pos.setXYZ(k, pos.getX(k) * taper, y, pos.getZ(k) * (0.82 + 0.18 * taper));
    }
    g.computeVertexNormals();
    return g;
  };
  mesh(jaw(sphere(32)), mats.skin, head, [0, 0.074, 0.02], undefined, [0.068, 0.07, 0.084]);
  mesh(new THREE.CylinderGeometry(0.054, 0.058, 0.15, 14), mats.skin, neck, [0, 0.01, -0.008]);
  /* ears */
  for (const sx of [-1, 1]) mesh(sphere(14), mats.skin, head, [sx * 0.079, 0.125, -0.004], [0, sx * 0.3, 0], [0.013, 0.03, 0.021]);
  /* nose */
  mesh(sphere(16), mats.skin, head, [0, 0.12, 0.093], [0.3, 0, 0], [0.0105, 0.03, 0.014]);
  mesh(sphere(16), mats.skin, head, [0, 0.101, 0.103], undefined, [0.0115, 0.0095, 0.0105]);
  for (const sx of [-1, 1]) mesh(sphere(10), mats.skin, head, [sx * 0.0115, 0.0985, 0.097], undefined, [0.0075, 0.006, 0.0075]);
  /* eyes and brows */
  for (const sx of [-1, 1]) {
    mesh(sphere(16), mats.eye, head, [sx * 0.032, 0.141, 0.08], undefined, [0.0115, 0.0085, 0.0095]);
    mesh(sphere(12), mats.iris, head, [sx * 0.0315, 0.1405, 0.0888], undefined, [0.0058, 0.0058, 0.0025]);
    /* relaxed upper lids */
    mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), mats.skin, head, [sx * 0.032, 0.1405, 0.0805], [0.25, 0, 0], [0.0124, 0.0098, 0.0104]);
    mesh(new RoundedBoxGeometry(0.032, 0.007, 0.01, 2, 0.003), mats.beard, head, [sx * 0.033, 0.164, 0.087], [0, 0, sx * -0.1]);
  }
  /* lips, moustache and beard */
  mesh(sphere(16), mats.lip, head, [0, 0.0715, 0.0985], undefined, [0.016, 0.005, 0.006]);
  mesh(new THREE.TorusGeometry(0.024, 0.006, 8, 20, Math.PI), mats.beard, head, [0, 0.071, 0.094], [0.15, 0, 0], [1.05, 1, 0.6]);
  /* stubble along the jaw, a fuller beard on the chin */
  mesh(jaw(new THREE.SphereGeometry(1, 32, 20, Math.PI / 2 - 1.75, 3.5, Math.PI * 0.57, Math.PI * 0.41)), mats.stubble, head, [0, 0.074, 0.02], undefined, [0.071, 0.073, 0.087]);
  mesh(jaw(new THREE.SphereGeometry(1, 24, 16, Math.PI / 2 - 1.0, 2.0, Math.PI * 0.66, Math.PI * 0.32)), mats.beard, head, [0, 0.074, 0.02], undefined, [0.073, 0.075, 0.09]);
  mesh(sphere(14), mats.beard, head, [0, 0.058, 0.088], undefined, [0.011, 0.011, 0.007]);

  /* hair: a cap of small curls on top, faded short at the sides and back */
  const R = rng(1999);
  const curls: THREE.BufferGeometry[] = [];
  const dir = new THREE.Vector3();
  for (let n = 0; n < 260; n++) {
    dir.set(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1);
    if (dir.lengthSq() > 1 || dir.lengthSq() < 0.05) {
      n--;
      continue;
    }
    dir.normalize();
    if (dir.y < 0.55) {
      n--;
      continue;
    }
    /* keep the forehead clear */
    if (dir.z > 0.62 && dir.y < 0.72) {
      n--;
      continue;
    }
    const lift = 0.006 + R() * 0.008 + (dir.y - 0.55) * 0.03;
    const r = 0.012 + R() * 0.007;
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.translate(dir.x * (0.079 + lift), 0.13 + dir.y * (0.1 + lift), dir.z * (0.094 + lift));
    curls.push(g);
  }
  const curlGeo = mergeGeometries(curls);
  curls.forEach((g) => g.dispose());
  mesh(curlGeo, mats.hair, head);
  const shell = new THREE.SphereGeometry(1, 32, 16, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8, Math.PI * 0.1, Math.PI * 0.42);
  mesh(shell, mats.fade, head, [0, 0.13, 0], undefined, [0.082, 0.104, 0.097]);
  mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.3), mats.hair, head, [0, 0.135, -0.002], undefined, [0.085, 0.108, 0.098]);

  /* round metal glasses */
  for (const sx of [-1, 1]) {
    mesh(new THREE.TorusGeometry(0.025, 0.0019, 6, 32), mats.frame, head, [sx * 0.034, 0.142, 0.103]);
    mesh(new THREE.CircleGeometry(0.025, 24), mats.lens, head, [sx * 0.034, 0.142, 0.103]);
    const temple = new THREE.CylinderGeometry(0.0016, 0.0016, 0.105, 5);
    mesh(temple, mats.frame, head, [sx * 0.074, 0.146, 0.052], [Math.PI / 2, 0, 0], undefined).rotation.set(Math.PI / 2, 0, sx * -0.12);
  }
  mesh(new THREE.TorusGeometry(0.009, 0.0016, 5, 12, Math.PI), mats.frame, head, [0, 0.148, 0.106]);

  /* ---------- arms ---------- */
  for (let s = 0; s < 2; s++) {
    mesh(capsule(0.058, 0.2), mats.hoodie, shoulder[s], [0, -0.135, 0]);
    mesh(capsule(0.05, 0.19), mats.hoodie, elbow[s], [0, -0.12, 0]);
    mesh(new THREE.CylinderGeometry(0.044, 0.046, 0.045, 14), mats.hoodie, wrist[s], [0, 0.0, 0]);
    /* the hand: palm, fingers and thumb */
    const side = s === 0 ? 1 : -1;
    mesh(new RoundedBoxGeometry(0.075, 0.085, 0.03, 3, 0.012), mats.skin, wrist[s], [0, -0.06, 0]);
    mesh(new RoundedBoxGeometry(0.07, 0.065, 0.024, 3, 0.011), mats.skin, wrist[s], [0, -0.125, 0.002], [0.12, 0, 0]);
    mesh(capsule(0.011, 0.03), mats.skin, wrist[s], [side * -0.042, -0.07, 0.014], [0.3, 0, side * 0.5]);
  }

  /* ---------- legs ---------- */
  for (let s = 0; s < 2; s++) {
    mesh(capsule(0.088, 0.28), mats.denim, hip[s], [0, -0.2, 0]);
    mesh(capsule(0.07, 0.3), mats.denim, knee[s], [0, -0.2, 0]);
    mesh(new RoundedBoxGeometry(0.105, 0.085, 0.27, 3, 0.035), mats.shoe, ankle[s], [0, -0.03, 0.05]);
    mesh(new RoundedBoxGeometry(0.112, 0.025, 0.285, 2, 0.01), mats.sole, ankle[s], [0, -0.065, 0.05]);
  }

  /* ---------- animation ---------- */
  const look = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  let headYaw = 0;
  let headPitch = 0;
  return {
    root,
    update(f, t, camera) {
      root.position.copy(f.char);
      root.rotation.y = f.yaw;
      const w = f.walk;
      const idle = 1 - w;
      const ph = f.phase;
      const breathe = Math.sin(t * 1.7);

      /* legs: the stance leg straight, the swing leg bending at the knee */
      for (let s = 0; s < 2; s++) {
        const p = ph + s * Math.PI;
        const swing = -0.48 * Math.sin(p) * w;
        const bend = w * (0.06 + 0.82 * Math.pow(Math.max(0, Math.cos(p)), 2));
        hip[s].rotation.set(swing, 0, (s === 0 ? 1 : -1) * 0.02 * idle);
        knee[s].rotation.x = bend;
        ankle[s].rotation.x = -(swing + bend) * 0.75 + w * 0.12 * Math.max(0, Math.sin(p));
      }
      /* the body drops as the legs spread, and rides up over the stance leg */
      const spread = Math.abs(Math.sin(ph)) * 0.48 * w;
      pelvis.position.y = 0.95 - 0.83 * (1 - Math.cos(spread)) + 0.012 * w * Math.cos(ph * 2);
      pelvis.position.x = idle * 0.012 * Math.sin(t * 0.55);
      pelvis.rotation.set(0, -0.09 * w * Math.sin(ph), idle * 0.012 * Math.sin(t * 0.55));
      spine.rotation.set(0.05 * w + idle * 0.01 * breathe, 0.14 * w * Math.sin(ph), -idle * 0.01 * Math.sin(t * 0.55));
      spine.scale.set(1, 1 + idle * 0.006 * breathe, 1 + idle * 0.01 * breathe);

      /* arms swing against the legs; gestures blend over the top */
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? 1 : -1;
        const p = ph + s * Math.PI;
        let rx = 0.38 * Math.sin(p) * w + idle * 0.04;
        let rz = side * (0.09 + 0.02 * idle * breathe);
        let ry = 0;
        let ex = -0.2 - w * 0.22 * (0.5 + 0.5 * Math.sin(p));
        let ez = 0;
        let wy = 0;
        /* a wave with the right hand */
        if (s === 1 && f.wave > 0) {
          const k = f.wave;
          rx = THREE.MathUtils.lerp(rx, -0.25, k);
          rz = THREE.MathUtils.lerp(rz, -2.15, k);
          ex = THREE.MathUtils.lerp(ex, -0.15, k);
          ez = THREE.MathUtils.lerp(0, -0.85 + 0.38 * Math.sin(t * 7.5), k);
          wy = THREE.MathUtils.lerp(0, -0.3, k);
        }
        /* showing the screen, palm open */
        if (f.present > 0 && side === f.arm) {
          const k = f.present;
          rx = THREE.MathUtils.lerp(rx, -0.55, k);
          rz = THREE.MathUtils.lerp(rz, side * 0.95, k);
          ry = THREE.MathUtils.lerp(0, side * -0.4, k);
          ex = THREE.MathUtils.lerp(ex, -0.35 + 0.04 * Math.sin(t * 1.3), k);
          wy = THREE.MathUtils.lerp(0, side * 0.9, k);
        }
        shoulder[s].rotation.set(rx, ry, rz);
        elbow[s].rotation.set(ex, 0, ez);
        wrist[s].rotation.set(0, wy, 0);
      }

      /* the head turns to the camera when he stops */
      root.updateMatrixWorld();
      inv.copy(neck.matrixWorld).invert();
      look.copy(camera).applyMatrix4(inv);
      let yaw = Math.atan2(look.x, look.z);
      let pitch = -Math.atan2(look.y - 0.13, Math.hypot(look.x, look.z));
      const facing = Math.abs(yaw) < 1.9 ? 1 : 0;
      yaw = THREE.MathUtils.clamp(yaw, -0.85, 0.85) * f.gaze * facing;
      pitch = THREE.MathUtils.clamp(pitch, -0.3, 0.35) * f.gaze * facing;
      /* while walking he looks a little about him */
      yaw += w * 0.18 * Math.sin(t * 0.4);
      headYaw += (yaw - headYaw) * 0.25;
      headPitch += (pitch - headPitch) * 0.25;
      neck.rotation.set(headPitch * 0.4 - 0.05 * w, headYaw * 0.4, 0);
      head.rotation.set(headPitch * 0.6, headYaw * 0.6, 0);
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
  };
}
