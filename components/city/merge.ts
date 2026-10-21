import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Bakes the meshes that never move into a few big ones, one per material, so a frame costs a
 * couple of hundred draw calls instead of almost two thousand.
 *
 * What moves is found by running the animations for a while (`simulate`) and comparing every
 * object's own transform and visibility before and after. Meshes under a moving object are merged
 * into that object instead, so a rotating turbine keeps its blades and a driving car its wheels.
 * `anchors` are groups that move later on input (a building that grows on hover) and `skip` are
 * subtrees left alone entirely (the hero, effects that are shown only while playing).
 */
const baseCompile = THREE.Material.prototype.onBeforeCompile;
const paintMats = new Map<string, THREE.MeshStandardMaterial>();

/** A key for a material that is nothing but a flat colour, or null when it has more to it. */
function paintable(mat: THREE.Material, g: THREE.BufferGeometry): string | null {
  const m = mat as THREE.MeshStandardMaterial;
  if (m.type !== "MeshStandardMaterial" || m.transparent || m.opacity < 1 || m.vertexColors) return null;
  if (m.map || m.normalMap || m.roughnessMap || m.metalnessMap || m.emissiveMap || m.aoMap || m.alphaMap || m.bumpMap) return null;
  if (m.emissive.getHex() !== 0 || m.onBeforeCompile !== baseCompile || g.attributes.color || !g.attributes.normal) return null;
  return `${m.roughness.toFixed(2)}|${m.metalness.toFixed(2)}|${m.flatShading ? 1 : 0}|${m.side}|${m.envMapIntensity}`;
}

function painted(key: string, like: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  let m = paintMats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: like.roughness,
      metalness: like.metalness,
      flatShading: like.flatShading,
      side: like.side,
      envMapIntensity: like.envMapIntensity,
    });
    paintMats.set(key, m);
  }
  return m;
}

export async function mergeStatic(
  root: THREE.Object3D,
  o: { anchors: THREE.Object3D[]; skip: THREE.Object3D[]; simulate: () => void; pause: () => Promise<void> },
): Promise<number> {
  root.updateMatrixWorld(true);
  const before = new Map<THREE.Object3D, { m: number[]; v: boolean }>();
  root.traverse((ob) => before.set(ob, { m: ob.matrix.elements.slice(), v: ob.visible }));
  await o.pause();
  o.simulate();
  await o.pause();
  root.updateMatrixWorld(true);
  const moved = new Set<THREE.Object3D>();
  before.forEach((b, ob) => {
    if (b.v !== ob.visible) moved.add(ob);
    else {
      const e = ob.matrix.elements;
      for (let i = 0; i < 16; i++) {
        if (Math.abs(e[i] - b.m[i]) > 1e-5) {
          moved.add(ob);
          break;
        }
      }
    }
  });
  const anchors = new Set(o.anchors);
  const skip = new Set(o.skip);

  type Bucket = { anchor: THREE.Object3D; mat: THREE.Material; meshes: THREE.Mesh[]; paint: boolean };
  const buckets = new Map<string, Bucket>();
  const walk = (ob: THREE.Object3D, anchor: THREE.Object3D, ok: boolean) => {
    if (skip.has(ob) || !ob.visible) return;
    if (ob !== root && (moved.has(ob) || anchors.has(ob))) {
      /* this object moves: its children can still be merged, but relative to it */
      if (!(ob as THREE.Mesh).isMesh || ob.children.length) ob.children.forEach((c) => walk(c, ob, true));
      return;
    }
    const m = ob as THREE.Mesh;
    if (ok && m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh) {
      const mat = m.material;
      const g = m.geometry;
      if (
        !Array.isArray(mat) &&
        !mat.transparent &&
        !g.morphAttributes.position &&
        !m.userData.keep &&
        !m.children.length &&
        m.matrixWorld.determinant() > 0
      ) {
        const flags = `${anchor.id}|${m.castShadow ? 1 : 0}${m.receiveShadow ? 1 : 0}|${m.renderOrder}`;
        const plain = paintable(mat, g);
        let key: string;
        let use = mat;
        if (plain) {
          /* plain coloured surfaces share one material and carry their colour in the vertices */
          key = `${flags}|paint|${plain}`;
          use = painted(plain, mat as THREE.MeshStandardMaterial);
        } else {
          const attrs = Object.keys(g.attributes)
            .sort()
            .map((k) => `${k}${g.attributes[k].itemSize}`)
            .join(",");
          key = `${flags}|${mat.id}|${attrs}`;
        }
        let b = buckets.get(key);
        if (!b) buckets.set(key, (b = { anchor, mat: use, meshes: [], paint: !!plain }));
        b.meshes.push(m);
        return;
      }
    }
    ob.children.slice().forEach((c) => walk(c, anchor, ok));
  };
  walk(root, root, true);

  let removed = 0;
  const inv = new THREE.Matrix4();
  const rel = new THREE.Matrix4();
  for (const b of buckets.values()) {
    await o.pause();
    if (b.meshes.length < 2 && !b.paint) continue;
    inv.copy(b.anchor.matrixWorld).invert();
    const geos = b.meshes.map((m) => {
      let g = m.geometry.clone();
      if (b.paint) {
        const keep = new THREE.BufferGeometry();
        keep.setAttribute("position", g.attributes.position);
        keep.setAttribute("normal", g.attributes.normal);
        keep.setIndex(g.index);
        const c = (m.material as THREE.MeshStandardMaterial).color;
        const n = g.attributes.position.count;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n * 3; i += 3) {
          col[i] = c.r;
          col[i + 1] = c.g;
          col[i + 2] = c.b;
        }
        keep.setAttribute("color", new THREE.BufferAttribute(col, 3));
        g = keep;
      }
      g.clearGroups();
      for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k];
      if (!g.index) {
        const n = g.attributes.position.count;
        const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
        for (let i = 0; i < n; i++) idx[i] = i;
        g.setIndex(new THREE.BufferAttribute(idx, 1));
      }
      rel.multiplyMatrices(inv, m.matrixWorld);
      g.applyMatrix4(rel);
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const first = b.meshes[0];
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.renderOrder = first.renderOrder;
    mesh.matrixAutoUpdate = false;
    b.anchor.add(mesh);
    mesh.updateMatrixWorld(true);
    /* the originals leave the scene but keep their world matrices, so rays can still hit them */
    for (const m of b.meshes) m.removeFromParent();
    removed += b.meshes.length - 1;
  }
  return removed;
}
