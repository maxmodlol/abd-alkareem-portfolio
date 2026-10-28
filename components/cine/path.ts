import * as THREE from "three";

import { PLAZA, SHOPS, shopSide, shopZ } from "./layout";

/**
 * The film. The page is cut into beats of equal scroll length; on every beat the camera, and the man
 * it follows, come to rest on a keyframe while the visitor reads, and between beats he walks the next
 * stretch of the street. Everything is a function of the scroll position, so scrolling back plays the
 * film backwards, frame for frame.
 *
 *  0     he turns to the camera and waves             2..17  each project: outside the building, then inside it
 *  1     he looks down the street                     18     the plaza (experience)
 *                                                    19     the view over the valley (skills)
 *                                                    20     he turns round and waves goodbye (contact)
 */

export const BEATS = 21;
export const projectBeat = (i: number) => 2 + i * 2;

type V3 = [number, number, number];
type Pose = "idle" | "wave" | "present";
type Key = {
  b: number;
  cam: V3;
  look: V3;
  fov: number;
  char: V3;
  /** A resting keyframe: which way he faces, what he does and whether he looks at the camera. */
  rest?: { yaw: number; pose: Pose; gaze: boolean; arm?: 1 | -1 };
};

function keys(): Key[] {
  const k: Key[] = [
    { b: 0, char: [0, 0, 18], cam: [0.9, 1.5, 22.0], look: [-1.05, 1.22, 18], fov: 36, rest: { yaw: 0, pose: "wave", gaze: true } },
    { b: 0.5, char: [0, 0, 13], cam: [3.4, 2.4, 19.5], look: [0, 1.3, 11], fov: 42 },
    { b: 1, char: [0.2, 0, 6], cam: [4.5, 6.5, 15.5], look: [-1, 3.5, -18], fov: 50, rest: { yaw: Math.PI, pose: "idle", gaze: false } },
    { b: 1.5, char: [-1.2, 0, -1], cam: [5.5, 3.2, 8], look: [-3, 2, -8], fov: 48 },
  ];
  for (let i = 0; i < SHOPS; i++) {
    const s = shopSide(i);
    const z = shopZ(i);
    const e = projectBeat(i);
    const n = e + 1;
    const at = (u: number, d: number, y = 0): V3 => [s * (9 + d), y, z + u];
    if (i > 0) {
      /* out of the last building (behind a cut to black) and on along the street */
      const ps = shopSide(i - 1);
      const pz = shopZ(i - 1);
      k.push(
        { b: e - 0.5, char: [-ps * 0.6, 0, pz - 6], cam: [ps * 2.5, 1.6, pz - 18], look: [-ps * 0.6, 1.3, pz - 6], fov: 46 },
        { b: e - 0.25, char: [-ps * 2.6, 0, pz - 15], cam: [ps * 4.5, 1.75, pz - 17.5], look: [-ps * 2.6, 1.3, pz - 15], fov: 46 },
      );
    }
    const char = at(4.6, 14);
    const cam = at(6.6, 7.6, 1.6);
    const toCam = Math.atan2(cam[0] - char[0], cam[2] - char[2]);
    const toScreen = Math.atan2(s * 3.4, -5.2);
    k.push(
      /* outside, facing the door */
      { b: e, char: [s * 5.4, 0, z + 1], cam: [-s * 6.5, 2.0, z + 15], look: [s * 12, 5.0, z - 3], fov: 48, rest: { yaw: (s * Math.PI) / 2, pose: "idle", gaze: false } },
      /* through the doors, the camera a step behind him */
      { b: e + 0.42, char: at(0.1, -0.4), cam: at(1.7, -6, 1.8), look: at(-0.5, 5, 1.7), fov: 52 },
      { b: e + 0.62, char: at(0.6, 2.8), cam: at(0.2, 0.6, 1.72), look: at(1.6, 9, 1.8), fov: 54 },
      { b: e + 0.8, char: at(3.4, 8.5), cam: at(2.4, 2.8, 1.7), look: at(3.5, 12, 1.7), fov: 52 },
      /* inside, beside the screen, showing it */
      {
        b: n,
        char,
        cam,
        look: at(1.2, 14.6, 2.0),
        fov: 50,
        rest: { yaw: lerpAngle(toCam, toScreen, 0.3), pose: "present", gaze: true, arm: s > 0 ? -1 : 1 },
      },
    );
  }
  const last = shopZ(SHOPS - 1);
  const ls = shopSide(SHOPS - 1);
  k.push(
    { b: 17.5, char: [-ls * 0.6, 0, last - 6], cam: [ls * 2.5, 1.6, last - 18], look: [-ls * 0.6, 1.3, last - 6], fov: 46 },
    { b: 17.75, char: [-0.4, 0, last - 16], cam: [5.5, 2.4, last - 24], look: [-0.4, 1.3, last - 16], fov: 46 },
    { b: 18, char: [0, 0, PLAZA.z0 - 4], cam: [-4.5, 5.2, PLAZA.z0 + 9], look: [-2, 1.6, PLAZA.z0 - 18], fov: 50, rest: { yaw: Math.PI, pose: "idle", gaze: false } },
    { b: 18.5, char: [0.2, 0, PLAZA.z0 - 18], cam: [-5, 2.6, PLAZA.z0 - 16], look: [0.2, 1.4, PLAZA.z0 - 22], fov: 48 },
    { b: 19, char: [0.4, 0, -276], cam: [3.2, 2.3, -268.8], look: [-3, -4, -400], fov: 50, rest: { yaw: Math.PI, pose: "idle", gaze: false } },
    { b: 19.55, char: [0.4, 0, -276], cam: [5.2, 1.9, -279.2], look: [0.4, 1.45, -276], fov: 46 },
    { b: 20, char: [0.4, 0, -276], cam: [-0.4, 1.52, -280.3], look: [1.6, 1.28, -276], fov: 38, rest: { yaw: Math.PI, pose: "wave", gaze: true } },
  );
  return k;
}

export function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export type Frame = {
  cam: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  char: THREE.Vector3;
  yaw: number;
  /** Walk cycle: phase in radians and how much of a walk it is (0 standing, 1 walking). */
  phase: number;
  walk: number;
  wave: number;
  present: number;
  /** The arm he shows the screen with: 1 left, -1 right. */
  arm: number;
  gaze: number;
  /** Black between scenes, 0 to 1. */
  fade: number;
  /** The beat, eased: whole numbers are the resting keyframes. */
  beat: number;
};

export type Shot = {
  at: (p: number, out: Frame) => Frame;
};

export function newFrame(): Frame {
  return {
    cam: new THREE.Vector3(),
    look: new THREE.Vector3(),
    fov: 45,
    char: new THREE.Vector3(),
    yaw: 0,
    phase: 0,
    walk: 0,
    wave: 0,
    present: 0,
    arm: 1,
    gaze: 0,
    fade: 0,
    beat: 0,
  };
}

const STRIDE = 1.5;

export function createShot(): Shot {
  const ks = keys();
  const n = ks.length;
  const curve = (f: (k: Key) => V3) => new THREE.CatmullRomCurve3(ks.map((k) => new THREE.Vector3(...f(k))), false, "centripetal");
  const camC = curve((k) => k.cam);
  const lookC = curve((k) => k.look);
  const charC = curve((k) => k.char);
  const rests = ks.filter((k) => k.rest);
  const fades = Array.from({ length: SHOPS }, (_, i) => projectBeat(i) + 1.5);

  /* the distance walked along his path, so his feet keep pace with the ground */
  const SAMPLES = 4000;
  const dist = new Float32Array(SAMPLES + 1);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  charC.getPoint(0, a);
  for (let i = 1; i <= SAMPLES; i++) {
    charC.getPoint(i / SAMPLES, b);
    dist[i] = dist[i - 1] + Math.hypot(b.x - a.x, b.z - a.z);
    a.copy(b);
  }
  const tangent = new THREE.Vector3();

  return {
    at(p, out) {
      const raw = THREE.MathUtils.clamp(p, 0, 1) * (BEATS - 1);
      /* ease into every beat, so the camera settles where the visitor reads */
      const bi = Math.min(BEATS - 2, Math.floor(raw));
      const f = raw - bi;
      const beat = bi + THREE.MathUtils.lerp(f, f * f * (3 - 2 * f), 0.75);
      let j = 0;
      while (j < n - 2 && beat > ks[j + 1].b) j++;
      const lf = THREE.MathUtils.clamp((beat - ks[j].b) / (ks[j + 1].b - ks[j].b), 0, 1);
      const t = (j + lf) / (n - 1);
      camC.getPoint(t, out.cam);
      lookC.getPoint(t, out.look);
      charC.getPoint(t, out.char);
      out.char.y = 0;
      out.fov = THREE.MathUtils.lerp(ks[j].fov, ks[j + 1].fov, lf);
      out.beat = beat;

      const di = t * SAMPLES;
      const d0 = Math.floor(di);
      const walked = THREE.MathUtils.lerp(dist[d0], dist[Math.min(SAMPLES, d0 + 1)], di - d0);
      out.phase = (walked / STRIDE) * Math.PI * 2;

      /* how close he is to a resting keyframe */
      let near: Key | null = null;
      let w = 0;
      for (const k of rests) {
        const kw = 1 - THREE.MathUtils.smoothstep(Math.abs(beat - k.b), 0.04, 0.24);
        if (kw > w) {
          w = kw;
          near = k;
        }
      }
      /* metres walked per beat here: zero where he only turns on the spot */
      const span = 2;
      const lo = Math.max(0, d0 - span);
      const hi = Math.min(SAMPLES, d0 + span);
      const rate = ((dist[hi] - dist[lo]) / ((hi - lo) / SAMPLES) / (n - 1)) / (ks[j + 1].b - ks[j].b);
      out.walk = (1 - w) * THREE.MathUtils.smoothstep(rate, 1, 4);
      charC.getTangent(t, tangent);
      let walkYaw = Math.atan2(tangent.x, tangent.z);
      if (Math.hypot(tangent.x, tangent.z) < 0.2 || rate < 1) {
        /* standing still between two rests: face the way of the nearer one */
        let best = Infinity;
        for (const k of rests) {
          const dd = Math.abs(beat - k.b);
          if (dd < best) {
            best = dd;
            walkYaw = k.rest!.yaw;
          }
        }
      }
      out.yaw = near ? lerpAngle(walkYaw, near.rest!.yaw, w) : walkYaw;
      out.wave = near?.rest!.pose === "wave" ? w : 0;
      out.present = near?.rest!.pose === "present" ? w : 0;
      out.arm = near?.rest!.arm ?? 1;
      out.gaze = near?.rest!.gaze ? w : 0;

      let fade = 0;
      for (const c of fades) fade = Math.max(fade, 1 - THREE.MathUtils.smoothstep(Math.abs(beat - c), 0.05, 0.17));
      out.fade = fade;
      return out;
    },
  };
}

/** The light along the film: a warm afternoon that turns to sunset by the end. */
export function timeAt(p: number) {
  const s = THREE.MathUtils.smoothstep(p, 0, 1);
  return {
    night: 0.02 + 0.4 * THREE.MathUtils.smoothstep(p, 0.55, 1),
    elevation: THREE.MathUtils.lerp(34, 8, s),
  };
}
