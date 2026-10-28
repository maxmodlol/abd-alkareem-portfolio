import * as THREE from "three";

/**
 * The 2049 palette. The city was modelled in bright toy colours; instead of repainting every one of the
 * few hundred colours by hand, everything is passed once through the same grade after it is built:
 * surfaces fall into dark steel, navy and bronze, foliage into deep moss, and every light into a
 * small family of warm amber, champagne and, rarely, a cool white. One rule keeps the whole island
 * coherent, and new buildings pick up the look without extra work.
 */
export const VOID = 0x090b10;
export const NAVY = 0x111521;
export const GOLD = 0xd7c68a;
export const STEEL = 0x777f91;
export const AMBER = 0xffb45e;
export const CHAMPAGNE = 0xf3e2b0;
export const COOL = 0xc4d0f2;

const hsl = { h: 0, s: 0, l: 0 };
const amber = new THREE.Color(AMBER);
const champagne = new THREE.Color(CHAMPAGNE);
const cool = new THREE.Color(COOL);

/** An opaque surface: dark composites and metals, with warm hues kept as bronze. */
export function gradeSurface(c: THREE.Color): THREE.Color {
  c.getHSL(hsl, THREE.SRGBColorSpace);
  const { h, s, l } = hsl;
  let L = 0.1 + 0.42 * Math.pow(l, 1.05);
  let H = 0.62;
  let S = Math.min(0.16, s * 0.3 + 0.06);
  if (s > 0.32 && (h < 0.15 || h > 0.9)) {
    /* reds, oranges and yellows: bronze and brass */
    H = 0.095;
    S = Math.min(0.24, s * 0.35);
    L *= 0.92;
  } else if (s > 0.18 && h > 0.18 && h < 0.48) {
    /* foliage and lawns: deep moss with a cold cast */
    H = 0.4;
    S = Math.min(0.22, s * 0.3);
    L *= 0.62;
  }
  return c.setHSL(H, S, L, THREE.SRGBColorSpace);
}

/** A light or an emissive surface: warm colours become amber, pale ones champagne, cold ones a cool white. */
export function gradeLight(c: THREE.Color): THREE.Color {
  const peak = Math.max(c.r, c.g, c.b);
  if (peak < 0.004) return c;
  c.getHSL(hsl, THREE.SRGBColorSpace);
  const { h, s } = hsl;
  let target = champagne;
  if (s > 0.45 && (h < 0.1 || h > 0.9)) target = amber;
  else if (s > 0.35 && h > 0.2 && h < 0.85) target = cool;
  return c.copy(target).multiplyScalar(peak);
}

/** Multipliers for the procedural ground maps, which are already shaded and only need the colour cast. */
const MAP_TINT: Record<string, number> = {
  grass: 0x6a7a70,
  asphalt: 0x7a808e,
  paving: 0x8a8e98,
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
    /* lighter surfaces read as brushed metal and composite panels, so they pick up the city's lights */
    if (a.metalness !== undefined && a.roughness !== undefined && !a.map && a.color) {
      a.color.getHSL(hsl, THREE.SRGBColorSpace);
      if (hsl.l > 0.24) {
        a.metalness = Math.max(a.metalness, 0.35);
        a.roughness = Math.min(a.roughness, 0.55);
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

/** A hex string in the 2049 grade, for canvas-drawn textures. */
export function gradeCss(css: string, light = false): string {
  const c = new THREE.Color(css);
  if (light) gradeLight(c);
  else gradeSurface(c);
  return `#${c.getHexString(THREE.SRGBColorSpace)}`;
}
