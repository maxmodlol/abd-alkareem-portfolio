import * as THREE from "three";

import type { Kit } from "./kit";
import type { Folks, Person } from "./people";

/** One point on the walking route. A point with a stop is a building the visitor pauses at. */
export type RoutePoint = { at: [number, number]; stop?: { id: string; look: [number, number] } };

export type ExplorerEvents = {
  /** The walker has arrived at a building and turned to greet the visitor. */
  onStop: (id: string) => void;
  /** The walker is about to leave that building. */
  onLeave: (id: string) => void;
};

const SPEED = 1.55;
const DWELL = 5.4;
const SCALE = 1.7;

function angDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Abd Alkareem's face: round glasses, brows, moustache and a short beard. Skin shows through the rest. */
function faceTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  if (g) {
    g.clearRect(0, 0, 256, 256);
    const ink = "#1b1511";
    /* beard: along the jaw and chin, with a gap for the mouth */
    g.fillStyle = ink;
    g.beginPath();
    g.moveTo(34, 150);
    g.quadraticCurveTo(44, 232, 128, 246);
    g.quadraticCurveTo(212, 232, 222, 150);
    g.quadraticCurveTo(200, 176, 168, 178);
    g.quadraticCurveTo(128, 190, 88, 178);
    g.quadraticCurveTo(56, 176, 34, 150);
    g.fill();
    /* moustache */
    g.beginPath();
    g.moveTo(76, 168);
    g.quadraticCurveTo(100, 150, 128, 162);
    g.quadraticCurveTo(156, 150, 180, 168);
    g.quadraticCurveTo(156, 184, 128, 174);
    g.quadraticCurveTo(100, 184, 76, 168);
    g.fill();
    /* mouth */
    g.strokeStyle = "#7a3f35";
    g.lineCap = "round";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(104, 196);
    g.quadraticCurveTo(128, 204, 152, 196);
    g.stroke();
    /* eyes and brows */
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(82, 118, 8, 9, 0, 0, Math.PI * 2);
    g.ellipse(174, 118, 8, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(54, 86);
    g.quadraticCurveTo(80, 72, 106, 84);
    g.moveTo(150, 84);
    g.quadraticCurveTo(176, 72, 202, 86);
    g.stroke();
    /* round glasses */
    g.fillStyle = "rgba(190,225,255,0.22)";
    g.strokeStyle = "#20262b";
    g.lineWidth = 7;
    g.beginPath();
    g.arc(82, 118, 36, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(174, 118, 36, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(116, 112);
    g.quadraticCurveTo(128, 104, 140, 112);
    g.stroke();
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(46, 112);
    g.lineTo(18, 104);
    g.moveTo(210, 112);
    g.lineTo(238, 104);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * The visitor's guide: a small character who walks the pavement from building to building.
 * Nothing physical happens here, he just follows a fixed route, which keeps it cheap on any device.
 */
export class Explorer {
  readonly root: THREE.Group;
  /** Direction he is facing, as a yaw in island space. */
  heading = 0;
  private person: Person;
  private ring: THREE.Mesh;
  private route: RoutePoint[];
  private events: ExplorerEvents | null = null;
  private state: "off" | "walk" | "dwell" | "free" = "off";
  private next = 0;
  private wait = 0;
  private x = 0;
  private z = 0;
  private faceMap: THREE.CanvasTexture;
  private input = { turn: 0, fwd: 0, run: false };
  private speed = 0;
  private y = 0;
  private vy = 0;
  /** Circles [x, z, radius] he cannot walk into. */
  colliders: [number, number, number][] = [];
  /** He cannot walk further than this from the centre of the island. */
  bound = 10.3;

  constructor(kit: Kit, folks: Folks, parent: THREE.Object3D, route: RoutePoint[]) {
    this.route = route;
    this.person = folks.person(parent, "walk", 0, 0.06, 0, 0, {
      look: { shirt: 0xe3a62a, pants: 0x23323d, skin: 0xd5a074, hair: 0x1b1511 },
      scale: SCALE,
    });
    this.root = this.person.root;
    const rig = this.person.rig;

    /* his yellow hoodie: hood bundled behind the neck, drawstrings, a bag, curly hair and ears */
    const hoodie = 0xe3a62a;
    const hairMat = kit.mat(0x1b1511, 0.9);
    const skinMat = kit.mat(0xd5a074, 0.8);
    kit.box(rig, 0.13, 0.075, 0.07, hoodie, 0, 0.365, -0.055, false);
    kit.box(rig, 0.012, 0.09, 0.008, 0xfff4e3, -0.025, 0.28, 0.058, false);
    kit.box(rig, 0.012, 0.09, 0.008, 0xfff4e3, 0.025, 0.28, 0.058, false);
    kit.box(rig, 0.13, 0.17, 0.06, 0x33475b, 0, 0.21, -0.09, false);
    [
      [0, 0.585, 0.0, 0.05],
      [-0.04, 0.57, 0.02, 0.04],
      [0.04, 0.57, 0.02, 0.04],
      [0, 0.575, -0.04, 0.045],
      [-0.05, 0.54, -0.02, 0.035],
      [0.05, 0.54, -0.02, 0.035],
    ].forEach(([x, y, z, r]) => kit.ball(rig, r, hairMat, x, y, z, 8, false));
    kit.ball(rig, 0.017, skinMat, -0.075, 0.5, 0, 6, false);
    kit.ball(rig, 0.017, skinMat, 0.075, 0.5, 0, 6, false);
    this.faceMap = faceTexture();
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.1),
      new THREE.MeshBasicMaterial({
        map: this.faceMap,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    face.position.set(0, 0.497, 0.0675);
    rig.add(face);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.26, 40),
      new THREE.MeshBasicMaterial({
        color: 0xf25c54,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.01;
    this.root.add(this.ring);
    this.root.visible = false;
  }

  get dwelling(): boolean {
    return this.state === "dwell";
  }

  get active(): boolean {
    return this.state !== "off";
  }

  /** World-space-ish position (island space) of his chest, where the camera looks. */
  position(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.x, 0.06 + this.y + 0.5 * SCALE, this.z);
  }

  start(events: ExplorerEvents): void {
    this.events = events;
    const spawn = this.route[this.route.length - 1].at;
    this.x = spawn[0];
    this.z = spawn[1];
    this.next = 0;
    this.state = "walk";
    this.person.mode = "walk";
    this.root.visible = true;
    const to = this.route[0].at;
    this.heading = Math.atan2(to[0] - this.x, to[1] - this.z);
    this.root.rotation.y = this.heading;
    this.root.position.set(this.x, 0.06, this.z);
  }

  get free(): boolean {
    return this.state === "free";
  }

  get px(): number {
    return this.x;
  }

  get pz(): number {
    return this.z;
  }

  /** Free play: he starts here and is steered with setInput. */
  startFree(x: number, z: number, heading: number): void {
    this.events = null;
    this.state = "free";
    this.x = x;
    this.z = z;
    this.y = 0;
    this.vy = 0;
    this.speed = 0;
    this.heading = heading;
    this.person.mode = "stand";
    this.person.rArm.rotation.z = 0;
    this.root.visible = true;
    this.root.rotation.y = heading;
    this.root.position.set(x, 0.06, z);
  }

  /** turn: -1 left to 1 right. fwd: -1 back to 1 forward. */
  setInput(turn: number, fwd: number, run: boolean): void {
    this.input.turn = Math.max(-1, Math.min(1, turn));
    this.input.fwd = Math.max(-1, Math.min(1, fwd));
    this.input.run = run;
  }

  jump(): void {
    if (this.state === "free" && this.y < 0.01) this.vy = 3.6;
  }

  stop(): void {
    this.state = "off";
    this.root.visible = false;
    this.person.rArm.rotation.z = 0;
    this.events = null;
  }

  update(t: number, dt: number): void {
    if (this.state === "off") return;
    let want = this.heading;
    if (this.state === "free") {
      const inp = this.input;
      const top = inp.fwd >= 0 ? (inp.run ? 3.7 : 2.2) : 1.3;
      this.speed += (inp.fwd * top - this.speed) * Math.min(1, dt * 7);
      this.heading -= inp.turn * (Math.abs(this.speed) > 0.2 ? 2.4 : 3.0) * dt;
      this.x += Math.sin(this.heading) * this.speed * dt;
      this.z += Math.cos(this.heading) * this.speed * dt;
      const r = Math.hypot(this.x, this.z);
      if (r > this.bound) {
        this.x *= this.bound / r;
        this.z *= this.bound / r;
      }
      for (const [cx, cz, cr] of this.colliders) {
        const dx = this.x - cx;
        const dz = this.z - cz;
        const d = Math.hypot(dx, dz);
        const min = cr + 0.25;
        if (d < min && d > 1e-4) {
          this.x = cx + (dx / d) * min;
          this.z = cz + (dz / d) * min;
        }
      }
      this.vy -= 12 * dt;
      this.y += this.vy * dt;
      if (this.y < 0) {
        this.y = 0;
        this.vy = 0;
      }
      this.person.mode = Math.abs(this.speed) > 0.2 && this.y < 0.01 ? "walk" : "stand";
      this.root.rotation.y = this.heading;
      this.root.position.set(this.x, 0.06 + this.y, this.z);
      const pulse = 1 + Math.sin(t * 4) * 0.08;
      this.ring.scale.set(pulse, pulse, pulse);
      return;
    }
    const pt = this.route[this.next];

    if (this.state === "walk") {
      const dx = pt.at[0] - this.x;
      const dz = pt.at[1] - this.z;
      const dist = Math.hypot(dx, dz);
      const step = SPEED * dt;
      want = Math.atan2(dx, dz);
      if (dist <= step) {
        this.x = pt.at[0];
        this.z = pt.at[1];
        if (pt.stop) {
          this.state = "dwell";
          this.wait = DWELL;
          this.person.mode = "wave";
          this.events?.onStop(pt.stop.id);
        } else {
          this.next = (this.next + 1) % this.route.length;
        }
      } else {
        this.x += (dx / dist) * step;
        this.z += (dz / dist) * step;
      }
    } else if (pt.stop) {
      /* turn his back on the building and greet whoever is looking */
      want = Math.atan2(pt.at[0] - pt.stop.look[0], pt.at[1] - pt.stop.look[1]);
      this.wait -= dt;
      if (this.wait <= 0) {
        this.events?.onLeave(pt.stop.id);
        this.state = "walk";
        this.person.mode = "walk";
        this.person.rArm.rotation.z = 0;
        this.next = (this.next + 1) % this.route.length;
      }
    }

    this.heading += angDiff(this.heading, want) * Math.min(1, dt * (this.state === "dwell" ? 4 : 8));
    this.root.rotation.y = this.heading;
    this.root.position.set(this.x, 0.06, this.z);
    const pulse = 1 + Math.sin(t * 4) * 0.08;
    this.ring.scale.set(pulse, pulse, pulse);
  }

  dispose(): void {
    this.faceMap.dispose();
  }
}
