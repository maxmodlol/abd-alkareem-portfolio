import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { rng, type Kit } from "./kit";

/** One clock for every swaying material. */
export const wind = { uTime: { value: 0 }, uGust: { value: 1 } };

/**
 * Makes a material sway in the wind. "crown" moves whole tree tops by their height above the ground,
 * "blade" bends grass from the root, so the tip moves most.
 */
export function windify<M extends THREE.Material>(mat: M, mode: "crown" | "blade"): M {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind.uTime;
    sh.uniforms.uGust = wind.uGust;
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime; uniform float uGust;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 wpos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpos = instanceMatrix * wpos;
        #endif
        wpos = modelMatrix * wpos;
        float gust = 0.6 + 0.4 * sin(uTime * 0.35 + wpos.x * 0.08) * uGust;
        float ph = uTime * 1.7 + wpos.x * 0.55 + wpos.z * 0.4;
        ${
          mode === "crown"
            ? `float amp = max(0.0, wpos.y - 0.35) * 0.045 * gust;
        transformed.x += sin(ph) * amp;
        transformed.z += cos(ph * 0.8) * amp * 0.6;`
            : `float amp = position.y * position.y * 0.3 * gust;
        transformed.x += (sin(ph * 1.6) * 0.6 + 0.5) * amp;
        transformed.z += cos(ph * 1.3) * amp * 0.5;`
        }`,
      );
  };
  mat.customProgramCacheKey = () => `wind-${mode}`;
  return mat;
}

/**
 * Tufts of grass and wildflowers over the open lawns, plus a few butterflies.
 * free(x, z) says whether a spot is open lawn.
 */
export function makeMeadow(
  kit: Kit,
  island: THREE.Group,
  free: (x: number, z: number) => boolean,
  o: { tufts: number; flowers: number; butterflies: number },
): void {
  const R = rng(73);
  const spot = (minR = 1.6, maxR = 10.6): [number, number] | null => {
    for (let k = 0; k < 12; k++) {
      const a = R() * Math.PI * 2;
      const r = Math.sqrt(minR * minR + R() * (maxR * maxR - minR * minR));
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 1.5 || Math.abs(z) < 1.5) continue;
      if (free(x, z)) return [x, z];
    }
    return null;
  };

  /* a tuft is three blades leaning out from one root */
  const blade = new THREE.ConeGeometry(0.035, 1, 3, 1);
  blade.translate(0, 0.5, 0);
  const parts = [0, 1, 2].map((i) => {
    const g = blade.clone();
    const a = (i / 3) * Math.PI * 2;
    g.applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 0.32));
    g.translate(Math.sin(a) * 0.03, 0, Math.cos(a) * 0.03);
    g.scale(1, 0.75 + i * 0.15, 1);
    return g;
  });
  const tuft = mergeGeometries(parts);
  if (tuft) {
    const mat = windify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), "blade");
    const mesh = new THREE.InstancedMesh(tuft, mat, o.tufts);
    const greens = [0x4fae63, 0x6bc06c, 0x3f9a58, 0x86cf72, 0x5cb86a].map((c) => new THREE.Color(c));
    const m = new THREE.Object3D();
    let n = 0;
    for (let i = 0; i < o.tufts * 1.6 && n < o.tufts; i++) {
      const p = spot();
      if (!p) continue;
      const s = 0.14 + R() * 0.16;
      m.position.set(p[0], 0, p[1]);
      m.rotation.set(0, R() * Math.PI * 2, 0);
      m.scale.set(s * 1.4, s, s * 1.4);
      m.updateMatrix();
      mesh.setMatrixAt(n, m.matrix);
      mesh.setColorAt(n, greens[Math.floor(R() * greens.length)]);
      n++;
    }
    mesh.count = n;
    mesh.receiveShadow = true;
    island.add(mesh);
  }

  /* wildflowers: a bloom on a short stem */
  const stem = new THREE.CylinderGeometry(0.008, 0.008, 1, 4);
  stem.translate(0, 0.5, 0);
  const bloom = new THREE.IcosahedronGeometry(0.075, 0);
  bloom.scale(1, 0.6, 1);
  bloom.translate(0, 1, 0);
  const stemMesh = new THREE.InstancedMesh(stem, windify(new THREE.MeshStandardMaterial({ color: 0x3f8a4e }), "blade"), o.flowers);
  const bloomMesh = new THREE.InstancedMesh(
    bloom,
    windify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true }), "blade"),
    o.flowers,
  );
  const petals = [0xf25c54, 0xffe08a, 0xfff4e3, 0xc9b6ff, 0xff9f6b, 0xffb3c7].map((c) => new THREE.Color(c));
  const fm = new THREE.Object3D();
  let fn = 0;
  for (let i = 0; i < o.flowers * 1.6 && fn < o.flowers; i++) {
    const p = spot();
    if (!p) continue;
    /* flowers grow in little patches */
    const patch = 1 + Math.floor(R() * 4);
    for (let k = 0; k < patch && fn < o.flowers; k++) {
      const x = p[0] + (R() - 0.5) * 0.5;
      const z = p[1] + (R() - 0.5) * 0.5;
      if (!free(x, z)) continue;
      const h = 0.14 + R() * 0.12;
      fm.position.set(x, 0, z);
      fm.rotation.set(0, R() * 6.28, 0);
      fm.scale.set(1, h, 1);
      fm.updateMatrix();
      stemMesh.setMatrixAt(fn, fm.matrix);
      bloomMesh.setMatrixAt(fn, fm.matrix);
      bloomMesh.setColorAt(fn, petals[Math.floor(R() * petals.length)]);
      fn++;
    }
  }
  stemMesh.count = fn;
  bloomMesh.count = fn;
  island.add(stemMesh);
  island.add(bloomMesh);

  /* butterflies drifting between the flowers */
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.bezierCurveTo(0.05, 0.08, 0.14, 0.09, 0.13, 0.02);
  wingShape.bezierCurveTo(0.14, -0.05, 0.06, -0.08, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 6);
  wingGeo.rotateX(-Math.PI / 2);
  const flies: { g: THREE.Group; l: THREE.Object3D; r: THREE.Object3D; cx: number; cz: number; rad: number; sp: number; ph: number }[] = [];
  const wingCols = [0xffb27a, 0xfff4e3, 0x7fd3ff, 0xffe08a, 0xc9b6ff];
  for (let i = 0; i < o.butterflies; i++) {
    const p = spot(2.5, 9.5);
    if (!p) continue;
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: wingCols[i % wingCols.length],
      side: THREE.DoubleSide,
      roughness: 0.7,
      emissive: wingCols[i % wingCols.length],
      emissiveIntensity: 0.2,
    });
    const l = new THREE.Mesh(wingGeo, mat);
    const r = new THREE.Mesh(wingGeo, mat);
    r.scale.x = -1;
    const lp = new THREE.Group();
    const rp = new THREE.Group();
    lp.add(l);
    rp.add(r);
    g.add(lp, rp);
    kit.box(g, 0.012, 0.012, 0.07, 0x1d2a33, 0, -0.006, 0, false);
    island.add(g);
    flies.push({ g, l: lp, r: rp, cx: p[0], cz: p[1], rad: 0.6 + R() * 1.2, sp: 0.4 + R() * 0.5, ph: R() * 6.28 });
  }

  kit.anims.push((t) => {
    wind.uTime.value = t;
    for (const f of flies) {
      const a = t * f.sp + f.ph;
      const x = f.cx + Math.sin(a) * f.rad + Math.sin(a * 2.3) * 0.25;
      const z = f.cz + Math.cos(a * 0.8) * f.rad;
      const y = 0.45 + Math.abs(Math.sin(a * 3.1)) * 0.35 + Math.sin(a * 0.7) * 0.15;
      const dx = Math.cos(a) * f.rad + Math.cos(a * 2.3) * 0.575;
      const dz = -Math.sin(a * 0.8) * f.rad * 0.8;
      f.g.position.set(x, y, z);
      f.g.rotation.y = Math.atan2(dx, dz);
      const flap = Math.sin(t * 22 + f.ph) * 1.1;
      f.l.rotation.z = flap;
      f.r.rotation.z = -flap;
    }
  });
}
