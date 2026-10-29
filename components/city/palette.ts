import * as THREE from "three";

/**
 * The bloom palette: a city at the blue hour that glows like a reef at night. The island was modelled
 * in bright toy colours; instead of repainting every one of the few hundred colours by hand, everything
 * is passed once through the same grade after it is built. Surfaces become pale pearl, lilac and
 * mist with soft coral and mint where the model had warm or green colours; every light joins a small
 * family of cosmos pink, jellyfish cyan, lilac, peach and pearl. One rule keeps the island coherent,
 * and new buildings pick up the look without extra work.
 */
export const INK = 0x03050a;
export const DEEP = 0x0b1030;
export const PEARL = 0xf4f1ff;
export const COSMOS = 0xff6fb0;
export const JELLY = 0x5ce6ff;
export const LILAC = 0xa898ff;
export const PEACH = 0xffb38a;

const hsl = { h: 0, s: 0, l: 0 };
const cosmos = new THREE.Color(COSMOS);
const jelly = new THREE.Color(JELLY);
const lilac = new THREE.Color(LILAC);
const peach = new THREE.Color(PEACH);
const pearl = new THREE.Color(PEARL);

/** An opaque surface: pale and soft, with the model's colours kept as pastel hints of the family. */
export function gradeSurface(c: THREE.Color): THREE.Color {
  c.getHSL(hsl, THREE.SRGBColorSpace);
  const { h, s, l } = hsl;
  let L = 0.2 + 0.62 * Math.pow(l, 0.95);
  /* neutrals are pearl with a cool blue-lilac cast */
  let H = 0.66;
  let S = Math.min(0.12, s * 0.2 + 0.05);
  if (s > 0.3 && (h < 0.06 || h > 0.85)) {
    /* reds and magentas: coral pink */
    H = 0.94;
    S = Math.min(0.55, s * 0.6);
  } else if (s > 0.3 && h < 0.17) {
    /* oranges and yellows: peach */
    H = 0.05;
    S = Math.min(0.5, s * 0.55);
  } else if (s > 0.18 && h < 0.48) {
    /* foliage and lawns: deep teal and mint */
    H = 0.46;
    S = Math.min(0.42, s * 0.5);
    L *= 0.72;
  } else if (s > 0.25 && h < 0.7) {
    /* blues: aqua */
    H = 0.54;
    S = Math.min(0.5, s * 0.6);
  }
  return c.setHSL(H, S, L, THREE.SRGBColorSpace);
}

/** A light or an emissive surface: each one joins the nearest colour of the family, at its own brightness. */
export function gradeLight(c: THREE.Color): THREE.Color {
  const peak = Math.max(c.r, c.g, c.b);
  if (peak < 0.004) return c;
  c.getHSL(hsl, THREE.SRGBColorSpace);
  const { h, s } = hsl;
  let target = pearl;
  if (s > 0.3) {
    if (h < 0.04 || h > 0.82) target = cosmos;
    else if (h < 0.17) target = peach;
    else if (h < 0.68) target = jelly;
    else target = lilac;
  }
  return c.copy(target).multiplyScalar(peak);
}

/** Multipliers for the procedural ground maps, which are already shaded and only need the colour cast. */
const MAP_TINT: Record<string, number> = {
  grass: 0x7fc4b4,
  asphalt: 0x8c88a8,
  paving: 0xc8c2e0,
};

type AnyMat = THREE.Material & {
  color?: THREE.Color;
  emissive?: THREE.Color;
  map?: THREE.Texture | null;
  vertexColors?: boolean;
  metalness?: number;
  roughness?: number;
};

/**
 * Runs the grade over everything under root, once per material, geometry and light.
 * Anything flagged with userData.keepColor (the hero, the townsfolk) is left alone.
 */
export function gradeScene(root: THREE.Object3D): void {
  const mats = new Set<THREE.Material>();
  const geos = new Set<THREE.BufferGeometry>();
  const instanced = new Set<THREE.InstancedMesh>();
  const tmp = new THREE.Color();
  const visit = (o: THREE.Object3D) => {
    if (o.userData.keepColor) return;
    const light = o as THREE.PointLight;
    if (light.isLight && !(o as THREE.HemisphereLight).isHemisphereLight && !(o as THREE.DirectionalLight).isDirectionalLight) {
      gradeLight(light.color);
    }
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh || (o as THREE.Points).isPoints) {
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of list) if (m && !m.userData.keepColor && !m.userData.graded) mats.add(m);
      const im = o as THREE.InstancedMesh;
      if (im.isInstancedMesh && im.instanceColor) instanced.add(im);
      const col = mesh.geometry?.attributes.color;
      const keep = list.every((m) => m?.userData.keepColor);
      if (col && !keep && !mesh.geometry.userData.graded) geos.add(mesh.geometry);
    }
    for (const c of o.children) visit(c);
  };
  visit(root);

  for (const m of mats) {
    m.userData.graded = true;
    const a = m as AnyMat;
    const unlit = (m as THREE.MeshBasicMaterial).isMeshBasicMaterial || (m as THREE.PointsMaterial).isPointsMaterial;
    if (unlit) {
      if (a.color) gradeLight(a.color);
      continue;
    }
    if ((m as THREE.ShaderMaterial).isShaderMaterial) continue;
    const kind = a.map?.userData?.kind as string | undefined;
    if (kind && MAP_TINT[kind] !== undefined) a.color?.set(MAP_TINT[kind]);
    else if (a.color && !a.map) gradeSurface(a.color);
    if (a.emissive) gradeLight(a.emissive);
    /* pale surfaces read as satin ceramic, catching a little of the sky and the lights */
    if (a.metalness !== undefined && a.roughness !== undefined && !a.map && a.color) {
      a.color.getHSL(hsl, THREE.SRGBColorSpace);
      if (hsl.l > 0.4) {
        a.metalness = Math.max(a.metalness, 0.12);
        a.roughness = Math.min(a.roughness, 0.6);
      }
    }
  }
  for (const g of geos) {
    g.userData.graded = true;
    const col = g.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < col.count; i++) {
      tmp.setRGB(col.getX(i), col.getY(i), col.getZ(i));
      gradeSurface(tmp);
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
  }
  for (const im of instanced) {
    const col = im.instanceColor as THREE.InstancedBufferAttribute;
    for (let i = 0; i < col.count; i++) {
      tmp.setRGB(col.getX(i), col.getY(i), col.getZ(i));
      gradeSurface(tmp);
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
  }
}

/** A hex string in the bloom grade, for canvas-drawn textures. */
export function gradeCss(css: string, light = false): string {
  const c = new THREE.Color(css);
  if (light) gradeLight(c);
  else gradeSurface(c);
  return `#${c.getHexString(THREE.SRGBColorSpace)}`;
}
