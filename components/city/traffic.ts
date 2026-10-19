import * as THREE from "three";

import type { Kit } from "./kit";

type Axis = "x" | "z";
export type CarKind = "sedan" | "van" | "taxi";
type Dir = 1 | -1;

type Car = {
  g: THREE.Group;
  axis: Axis;
  dir: Dir;
  lane: number;
  u: number;
  v: number;
  max: number;
};

/** A place where cars stop while red() is true. stop is the position of the stop line along the axis. */
export type Zone = { axis: Axis; dir: Dir; stop: number; red: () => boolean };

type Signal = { r: THREE.MeshStandardMaterial; y: THREE.MeshStandardMaterial; g: THREE.MeshStandardMaterial };

const CYCLE = 14;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Cars, traffic lights and queues. Roads run along x and z through the centre of the island. */
export class Traffic {
  readonly zones: Zone[] = [];
  private cars: Car[] = [];
  private ewRed = false;
  private nsRed = true;
  private beamMat: THREE.MeshBasicMaterial;
  private wheelGeo: THREE.CylinderGeometry;
  private headMat: THREE.MeshStandardMaterial;
  private tailMat: THREE.MeshStandardMaterial;
  private sig: { ew: Signal; ns: Signal };

  constructor(private kit: Kit) {
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xffe7b0,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.wheelGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.07, 12);
    this.headMat = kit.glowMat(0xfff2cc, 0.9, 3.4);
    this.tailMat = kit.glowMat(0xff3b30, 0.5, 2.2);
    const mk = (c: number) =>
      new THREE.MeshStandardMaterial({ color: 0x151515, emissive: c, emissiveIntensity: 0.05, roughness: 0.4 });
    this.sig = {
      ew: { r: mk(0xff3b30), y: mk(0xffb020), g: mk(0x3ddc84) },
      ns: { r: mk(0xff3b30), y: mk(0xffb020), g: mk(0x3ddc84) },
    };
    this.zones.push({ axis: "x", dir: 1, stop: -1.15, red: () => this.ewRed });
    this.zones.push({ axis: "x", dir: -1, stop: 1.15, red: () => this.ewRed });
    this.zones.push({ axis: "z", dir: 1, stop: -1.15, red: () => this.nsRed });
    this.zones.push({ axis: "z", dir: -1, stop: 1.15, red: () => this.nsRed });
  }

  /** A little car or van, long axis along z, front at +z. */
  buildCar(kind: CarKind, color: number): THREE.Group {
    const k = this.kit;
    const g = new THREE.Group();
    const body = k.mat(color, 0.35, 0.35);
    const dark = k.mat(0x151c22, 0.3, 0.2);
    const glass = k.mat(0x1f3a52, 0.12, 0.5);
    const len = kind === "van" ? 1.1 : 0.95;
    k.box(g, 0.46, 0.13, len, body, 0, 0.06, 0);
    if (kind === "van") {
      k.box(g, 0.46, 0.27, 0.72, body, 0, 0.19, -0.14);
      k.box(g, 0.4, 0.12, 0.02, glass, 0, 0.27, 0.225);
    } else {
      k.box(g, 0.4, 0.12, 0.5, glass, 0, 0.19, -0.04);
      k.box(g, 0.38, 0.025, 0.46, body, 0, 0.31, -0.04);
    }
    if (kind === "taxi") {
      const sign = k.glowMat(0xffe08a, 0.8, 3, 0x333333);
      k.box(g, 0.14, 0.05, 0.08, sign, 0, 0.335, -0.04, false);
    }
    const wy = 0.085;
    const wz = len / 2 - 0.2;
    ([-1, 1] as const).forEach((sx) => {
      ([-1, 1] as const).forEach((sz) => {
        const w = k.put(g, this.wheelGeo, dark, sx * 0.235, wy, sz * wz, false);
        w.rotation.z = Math.PI / 2;
      });
    });
    ([-1, 1] as const).forEach((sx) => {
      k.box(g, 0.08, 0.05, 0.02, this.headMat, sx * 0.15, 0.08, len / 2, false);
      k.box(g, 0.08, 0.05, 0.02, this.tailMat, sx * 0.15, 0.08, -len / 2, false);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.3, 10, 1, true), this.beamMat);
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(sx * 0.15, 0.1, len / 2 + 0.65);
      g.add(beam);
    });
    return g;
  }

  add(parent: THREE.Object3D, kind: CarKind, color: number, axis: Axis, dir: Dir, u: number, max = 1.7): void {
    const g = this.buildCar(kind, color);
    parent.add(g);
    this.cars.push({ g, axis, dir, lane: axis === "x" ? 0.4 * dir : -0.4 * dir, u, v: 0, max });
  }

  /** Four-way traffic lights on poles at the corners of the crossing. */
  lights(parent: THREE.Object3D): void {
    const k = this.kit;
    const pole = (x: number, z: number, s: Signal) => {
      k.cyl(parent, 0.03, 0.04, 0.95, 0x25323b, x, 0, z, 8);
      k.box(parent, 0.13, 0.34, 0.13, 0x10161b, x, 0.95, z, false);
      const bulb = new THREE.SphereGeometry(0.04, 8, 6);
      k.put(parent, bulb, s.r, x, 1.2, z + 0.07, false);
      k.put(parent, bulb, s.y, x, 1.12, z + 0.07, false);
      k.put(parent, bulb, s.g, x, 1.04, z + 0.07, false);
    };
    pole(1.05, 1.05, this.sig.ew);
    pole(-1.05, -1.05, this.sig.ew);
    pole(-1.05, 1.05, this.sig.ns);
    pole(1.05, -1.05, this.sig.ns);
  }

  update(t: number, dt: number): void {
    const ph = t % CYCLE;
    const ewGreen = ph < 5.2;
    const ewAmber = ph >= 5.2 && ph < 6;
    const nsGreen = ph >= 7 && ph < 12.2;
    const nsAmber = ph >= 12.2 && ph < 13;
    this.ewRed = !ewGreen;
    this.nsRed = !nsGreen;
    const boost = 1 + this.kit.night * 2;
    const paint = (s: Signal, green: boolean, amber: boolean) => {
      s.g.emissiveIntensity = green ? 2 * boost : 0.04;
      s.y.emissiveIntensity = amber ? 2 * boost : 0.04;
      s.r.emissiveIntensity = !green && !amber ? 2 * boost : 0.04;
    };
    paint(this.sig.ew, ewGreen, ewAmber);
    paint(this.sig.ns, nsGreen, nsAmber);
    this.beamMat.opacity = this.kit.night * 0.08;

    for (const c of this.cars) {
      let target = c.max;
      for (const z of this.zones) {
        if (z.axis !== c.axis || z.dir !== c.dir || !z.red()) continue;
        const df = (z.stop - c.u) * c.dir - 0.55;
        if (df > -0.08 && df < 1.1) target = Math.min(target, Math.max(0, df) * 1.5);
      }
      for (const o of this.cars) {
        if (o === c || o.axis !== c.axis || o.dir !== c.dir) continue;
        const ahead = (o.u - c.u) * c.dir;
        if (ahead <= 0) continue;
        const gap = ahead - 1.15;
        if (gap < 0.9) target = Math.min(target, Math.max(0, gap) * 1.6);
      }
      c.v += clamp(target - c.v, -7 * dt, 2.4 * dt);
      c.u += c.dir * c.v * dt;
      if (c.u * c.dir > 11) c.u = -c.dir * 10.9;
      c.g.visible = Math.abs(c.u) < 9.8;
      if (c.axis === "x") {
        c.g.position.set(c.u, 0.04, c.lane);
        c.g.rotation.y = c.dir * (Math.PI / 2);
      } else {
        c.g.position.set(c.lane, 0.04, c.u);
        c.g.rotation.y = c.dir === 1 ? 0 : Math.PI;
      }
    }
  }
}
