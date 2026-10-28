import * as THREE from "three";

import { LIFT, SCREEN_Z } from "./tower";

/**
 * The shot. The page is cut into beats of equal scroll length; each beat has a camera keyframe and
 * the camera glides between them along one continuous spline, easing into every keyframe so the
 * camera settles while the visitor reads, and moving between them like a crane or a drone would.
 *
 *  0  wide aerial of the city at golden hour        9-13 the rest of the gallery
 *  1  descending towards downtown                   14   to the glass elevator
 *  2  dropping between the towers                   15   rising up the outside of the tower
 *  3  flying low down the avenue                    16   above the city at the blue hour
 *  4  the plaza; the doors slide open
 *  5  through the doors into the lobby
 *  6-8 the gallery: one product screen per beat
 */

export const BEATS = 17;

type Key = { p: number; pos: [number, number, number]; look: [number, number, number]; fov: number };

function keys(): Key[] {
  const b = (i: number) => i / (BEATS - 1);
  const k: Key[] = [
    { p: b(0), pos: [330, 260, 520], look: [-10, 70, -150], fov: 38 },
    { p: b(1), pos: [170, 150, 340], look: [0, 50, -130], fov: 42 },
    { p: b(2), pos: [34, 46, 200], look: [0, 24, -110], fov: 46 },
    { p: b(3), pos: [2, 9, 40], look: [0, 12, -170], fov: 50 },
    { p: b(4), pos: [0, 3.6, -128], look: [0, 5.2, -170], fov: 50 },
    { p: b(5), pos: [0, 2.2, -158], look: [0, 3, -180], fov: 54 },
  ];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = SCREEN_Z[Math.floor(i / 2)];
    k.push({ p: b(6 + i), pos: [-side * 2, 2.3, z + 2.5], look: [side * 18, 4.2, z - 1.5], fov: 50 });
  }
  k.push(
    { p: b(13.65), pos: [14, 1.8, LIFT.z + 1], look: [30, 2.2, LIFT.z], fov: 52 },
    { p: b(14), pos: [LIFT.x, 1.8, LIFT.z], look: [60, 6, -140], fov: 52 },
    { p: b(15), pos: [LIFT.x, 96, LIFT.z], look: [120, 60, -20], fov: 50 },
    { p: b(16), pos: [LIFT.x, LIFT.top - 10, LIFT.z], look: [140, 190, 110], fov: 50 },
  );
  return k;
}

export type Shot = {
  /** Camera position, look target and field of view at scroll progress p (0 to 1). */
  at: (p: number, pos: THREE.Vector3, look: THREE.Vector3) => number;
  /** Which product screen the camera is looking at, or -1. */
  screen: (p: number) => number;
};

export function createShot(): Shot {
  const ks = keys();
  const posCurve = new THREE.CatmullRomCurve3(ks.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3(ks.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");
  const n = ks.length;
  const seg = (p: number) => {
    let i = 0;
    while (i < n - 2 && p > ks[i + 1].p) i++;
    const f = THREE.MathUtils.clamp((p - ks[i].p) / (ks[i + 1].p - ks[i].p), 0, 1);
    /* ease into each keyframe without a dead stop */
    const e = f * f * (3 - 2 * f);
    return { i, f: THREE.MathUtils.lerp(f, e, 0.7) };
  };
  return {
    at(p, pos, look) {
      const { i, f } = seg(THREE.MathUtils.clamp(p, 0, 1));
      const u = (i + f) / (n - 1);
      posCurve.getPoint(u, pos);
      lookCurve.getPoint(u, look);
      return THREE.MathUtils.lerp(ks[i].fov, ks[i + 1].fov, f);
    },
    screen(p) {
      const beat = Math.round(p * (BEATS - 1));
      return beat >= 6 && beat <= 13 ? beat - 6 : -1;
    },
  };
}

/** Time of day along the shot: golden hour over the city, the blue hour by the time we reach the top. */
export function nightAt(p: number): number {
  return 0.08 + 0.92 * THREE.MathUtils.smoothstep(p, 0.18, 0.96);
}
