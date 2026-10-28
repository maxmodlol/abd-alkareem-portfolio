import * as THREE from "three";

import { Hero } from "./hero";
import type { Kit } from "./kit";

/** One point on the walking route. A point with a stop is a building the visitor pauses at. */
export type RoutePoint = { at: [number, number]; stop?: { id: string; look: [number, number] } };

export type ExplorerEvents = {
  /** The walker has arrived at a building and turned to greet the visitor. */
  onStop: (id: string) => void;
  /** The walker is about to leave that building. */
  onLeave: (id: string) => void;
};

/** Moments the scene turns into particles, sound and camera shake. a is a heading or a strength. */
export type HeroFx =
  | "jump"
  | "double"
  | "land"
  | "bigland"
  | "dash"
  | "pad"
  | "step"
  | "runstep"
  | "hit"
  | "trail";

export type CarProbe = { x: number; z: number; axis: "x" | "z"; dir: 1 | -1; v: number };

const TOUR_SPEED = 1.55;
const DWELL = 5.4;
const WALK = 2.4;
const RUN = 4.8;
const BACK = 1.4;
const GRAVITY = 15;
const JUMP_V = 5.2;
const DOUBLE_V = 5.0;
const PAD_V = 12.5;
const STEP_UP = 0.32;
const COYOTE = 0.12;
const BUFFER = 0.16;

function angDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * The visitor's guide and the game's hero. On the guided tour he follows a fixed route.
 * In free play he runs, jumps, double-jumps with a flip, glides, dashes, bounces on pads,
 * climbs onto roofs and gets knocked flying by traffic.
 */
export class Explorer {
  readonly root: THREE.Group;
  readonly hero: Hero;
  /** Direction he is facing, as a yaw in island space. */
  heading = 0;
  /** Circles [x, z, radius] around each building, used by the tour and the roof probe. */
  colliders: [number, number, number][] = [];
  /** He cannot walk further than this from the centre of the island. */
  bound = 9.8;
  /** How far from the centre the ground reaches at angle a (atan2(z, x)). Defaults to the round bound. */
  edge: (a: number) => number = () => this.bound;
  /** Height of whatever solid sits at (x, z), 0 for open ground. Set by the scene. */
  solid: (x: number, z: number) => number = () => 0;
  /** Bounce pads [x, z]. */
  pads: [number, number][] = [];
  cars: () => CarProbe[] = () => [];
  onFx: (kind: HeroFx, x: number, y: number, z: number, a: number) => void = () => undefined;

  readonly ring: THREE.Mesh;
  private route: RoutePoint[];
  private events: ExplorerEvents | null = null;
  private state: "off" | "walk" | "dwell" | "free" = "off";
  private next = 0;
  private wait = 0;
  private x = 0;
  private z = 0;
  private y = 0;
  private vx = 0;
  private vz = 0;
  private vy = 0;
  private grounded = true;
  private floor = 0;
  private airTime = 0;
  private sinceGround = 0;
  private jumpBuf = 0;
  private jumps = 0;
  private held = false;
  private gliding = false;
  private dashT = 0;
  private dashCd = 0;
  private airDash = false;
  private rollT = 0;
  private flipT = 0;
  private flipDur = 0;
  private flipTurns = 0;
  private landT = 0;
  private tumbleT = 0;
  private emote: "wave" | "dance" | null = null;
  private sq = 1;
  private sqV = 0;
  private lastStep = 0;
  private trailT = 0;
  private input = { mx: 0, my: 0, run: false, yaw: 0 };

  constructor(kit: Kit, parent: THREE.Object3D, route: RoutePoint[]) {
    this.route = route;
    this.hero = new Hero(kit);
    this.root = this.hero.root;
    parent.add(this.root);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.26, 0.33, 40),
      new THREE.MeshBasicMaterial({
        color: 0xd7c68a,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.01;
    parent.add(this.ring);
    this.root.visible = false;
    this.ring.visible = false;
  }

  get dwelling(): boolean {
    return this.state === "dwell";
  }

  get active(): boolean {
    return this.state !== "off";
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

  get py(): number {
    return this.y;
  }

  /** Horizontal speed, used by the camera to pull back while he sprints. */
  get speed(): number {
    return Math.hypot(this.vx, this.vz);
  }

  get airborne(): boolean {
    return !this.grounded;
  }

  /** Island-space position of his chest, where the camera looks. */
  position(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.x, 0.06 + this.y + 0.6, this.z);
  }

  start(events: ExplorerEvents): void {
    this.events = events;
    const spawn = this.route[this.route.length - 1].at;
    this.x = spawn[0];
    this.z = spawn[1];
    this.y = 0;
    this.next = 0;
    this.state = "walk";
    this.hero.state = "walk";
    this.hero.stride = 0;
    this.hero.flip = 0;
    this.hero.tilt = 0;
    this.hero.squash = 1;
    this.hero.wingOpen = 0;
    this.hero.snap();
    this.root.visible = true;
    this.ring.visible = true;
    const to = this.route[0].at;
    this.heading = Math.atan2(to[0] - this.x, to[1] - this.z);
    this.place();
  }

  /** Tour: leave the current stop now, or walk straight on to the next one. */
  skip(): void {
    if (this.state !== "walk" && this.state !== "dwell") return;
    const here = this.route[this.next];
    let i = this.next;
    if (this.state === "dwell" && here.stop) {
      this.events?.onLeave(here.stop.id);
      i = (i + 1) % this.route.length;
    }
    /* the next point with a stop, reached from the point before it so he still walks the last metres */
    for (let k = 0; k < this.route.length && !this.route[i].stop; k++) i = (i + 1) % this.route.length;
    const prev = this.route[(i - 1 + this.route.length) % this.route.length].at;
    const to = this.route[i].at;
    this.x = prev[0] + (to[0] - prev[0]) * 0.75;
    this.z = prev[1] + (to[1] - prev[1]) * 0.75;
    this.next = i;
    this.state = "walk";
    this.hero.state = "walk";
    this.heading = Math.atan2(to[0] - this.x, to[1] - this.z);
    this.hero.snap();
    this.place();
  }

  /** Free play: he drops in from the sky at (x, z) and is steered with setInput. */
  startFree(x: number, z: number, heading: number): void {
    this.events = null;
    this.state = "free";
    this.x = x;
    this.z = z;
    this.y = 7;
    this.vx = 0;
    this.vz = 0;
    this.vy = -2;
    this.grounded = false;
    this.floor = 0;
    this.jumps = 2;
    this.airTime = 1;
    this.sinceGround = 1;
    this.heading = heading;
    this.flipT = 0;
    this.rollT = 0;
    this.dashT = 0;
    this.dashCd = 0;
    this.tumbleT = 0;
    this.landT = 0;
    this.emote = null;
    this.hero.state = "fall";
    this.hero.snap();
    this.root.visible = true;
    this.ring.visible = true;
    this.place();
  }

  /** mx: -1 left to 1 right. my: -1 back to 1 forward. Both relative to the camera, whose yaw is camYaw. */
  setInput(mx: number, my: number, run: boolean, camYaw: number): void {
    const m = Math.hypot(mx, my);
    const k = m > 1 ? 1 / m : 1;
    this.input.mx = mx * k;
    this.input.my = my * k;
    this.input.run = run;
    this.input.yaw = camYaw;
  }

  /** Press starts a jump (or a double jump in the air). Holding it while falling glides. */
  setJump(down: boolean): void {
    if (this.state !== "free") return;
    if (down && !this.held) this.jumpBuf = BUFFER;
    this.held = down;
  }

  dash(): void {
    if (this.state !== "free" || this.dashCd > 0 || this.tumbleT > 0) return;
    if (!this.grounded && this.airDash) return;
    this.dashT = 0.3;
    this.dashCd = 0.85;
    this.emote = null;
    if (this.grounded) {
      this.rollT = 0.5;
    } else {
      this.airDash = true;
      this.vy = Math.max(this.vy, 1.2);
      this.startFlip(0.4, 1);
    }
    this.onFx("dash", this.x, this.y, this.z, this.heading);
  }

  /** wave or dance on the spot. Moving cancels it. */
  setEmote(e: "wave" | "dance"): void {
    if (this.state !== "free" || !this.grounded) return;
    this.emote = this.emote === e ? null : e;
  }

  stop(): void {
    this.state = "off";
    this.root.visible = false;
    this.ring.visible = false;
    this.events = null;
    this.held = false;
    this.gliding = false;
  }

  private startFlip(dur: number, turns: number): void {
    this.flipT = dur;
    this.flipDur = dur;
    this.flipTurns = turns;
  }

  private place(): void {
    this.root.rotation.y = this.heading;
    this.root.position.set(this.x, 0.06 + this.y, this.z);
    this.ring.position.set(this.x, 0.07 + this.floor, this.z);
  }

  /** Can he stand at (x, z) coming from height y? Returns the floor there, or -1 if a wall is in the way. */
  private floorAt(x: number, z: number, y: number): number {
    const h = this.solid(x, z);
    return h > y + STEP_UP ? -1 : h;
  }

  update(t: number, dt: number): void {
    if (this.state === "off") return;
    if (this.state === "free") {
      /* small fixed steps keep fast moves from passing through walls on slow frames */
      const n = Math.max(1, Math.ceil(dt / 0.034));
      for (let i = 0; i < n; i++) this.updateFree(t, dt / n);
    } else this.updateTour(t, dt);
    this.hero.update(t, dt);
    const pulse = 1 + Math.sin(t * 4) * 0.08;
    const lift = Math.max(0, Math.min(1, 1 - (this.y - this.floor) / 4));
    this.ring.scale.setScalar(pulse * (0.6 + lift * 0.4));
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.2 + lift * 0.4;
  }

  private updateTour(t: number, dt: number): void {
    const pt = this.route[this.next];
    let want = this.heading;
    let moved = 0;
    if (this.state === "walk") {
      const dx = pt.at[0] - this.x;
      const dz = pt.at[1] - this.z;
      const dist = Math.hypot(dx, dz);
      const step = TOUR_SPEED * dt;
      want = Math.atan2(dx, dz);
      if (dist <= step) {
        this.x = pt.at[0];
        this.z = pt.at[1];
        moved = dist;
        if (pt.stop) {
          this.state = "dwell";
          this.wait = DWELL;
          this.hero.state = "wave";
          this.events?.onStop(pt.stop.id);
        } else {
          this.next = (this.next + 1) % this.route.length;
        }
      } else {
        this.x += (dx / dist) * step;
        this.z += (dz / dist) * step;
        moved = step;
      }
    } else if (pt.stop) {
      /* turn his back on the building and greet whoever is looking */
      want = Math.atan2(pt.at[0] - pt.stop.look[0], pt.at[1] - pt.stop.look[1]);
      this.wait -= dt;
      if (this.wait <= 0) {
        this.events?.onLeave(pt.stop.id);
        this.state = "walk";
        this.hero.state = "walk";
        this.next = (this.next + 1) % this.route.length;
      }
    }
    this.hero.gait += moved * 5.7;
    this.heading += angDiff(this.heading, want) * Math.min(1, dt * (this.state === "dwell" ? 4 : 8));
    this.place();
    void t;
  }

  private updateFree(t: number, dt: number): void {
    const inp = this.input;
    const h = this.hero;

    /* timers */
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.landT = Math.max(0, this.landT - dt);
    this.rollT = Math.max(0, this.rollT - dt);
    this.tumbleT = Math.max(0, this.tumbleT - dt);
    this.sinceGround = this.grounded ? 0 : this.sinceGround + dt;
    this.airTime = this.grounded ? 0 : this.airTime + dt;

    /* where the stick points, turned from camera space into island space */
    const fx = -Math.sin(inp.yaw);
    const fz = -Math.cos(inp.yaw);
    const rx = Math.cos(inp.yaw);
    const rz = -Math.sin(inp.yaw);
    let mx = fx * inp.my + rx * inp.mx;
    let mz = fz * inp.my + rz * inp.mx;
    const len = Math.hypot(mx, mz);
    const mag = Math.min(1, len);
    if (len > 0.001) {
      mx /= len;
      mz /= len;
    }
    if (mag > 0.15) this.emote = null;
    const stunned = this.tumbleT > 0;

    /* horizontal motion */
    if (this.dashT > 0) {
      this.dashT -= dt;
      const sp = 9.5;
      this.vx = Math.sin(this.heading) * sp;
      this.vz = Math.cos(this.heading) * sp;
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.025;
        this.onFx("trail", this.x, this.y + 0.5, this.z, this.heading);
      }
    } else if (!stunned) {
      const top = this.gliding ? 5.4 : inp.run ? RUN : WALK;
      const back = inp.my < -0.5 && Math.abs(inp.mx) < 0.3 && this.grounded ? BACK / WALK : 1;
      const tx = mx * mag * top * back;
      const tz = mz * mag * top * back;
      const acc = this.grounded ? (mag > 0.05 ? 12 : 16) : this.gliding ? 2.5 : 4;
      this.vx += (tx - this.vx) * Math.min(1, dt * acc);
      this.vz += (tz - this.vz) * Math.min(1, dt * acc);
      if (mag > 0.1) {
        const want = Math.atan2(mx, mz);
        this.heading += angDiff(this.heading, want) * Math.min(1, dt * (this.grounded ? 14 : 7));
      }
    } else {
      this.vx *= 1 - Math.min(1, dt * 1.2);
      this.vz *= 1 - Math.min(1, dt * 1.2);
    }

    /* move with wall and roof checks, sliding along walls */
    const nx = this.x + this.vx * dt;
    const nz = this.z + this.vz * dt;
    if (this.floorAt(nx, nz, this.y) >= 0) {
      this.x = nx;
      this.z = nz;
    } else if (this.floorAt(nx, this.z, this.y) >= 0) {
      this.x = nx;
      this.vz *= 0.5;
    } else if (this.floorAt(this.x, nz, this.y) >= 0) {
      this.z = nz;
      this.vx *= 0.5;
    } else {
      this.vx = 0;
      this.vz = 0;
      if (this.dashT > 0) this.dashT = 0;
    }
    const r = Math.hypot(this.x, this.z);
    const lim = this.edge(Math.atan2(this.z, this.x));
    if (r > lim) {
      this.x *= lim / r;
      this.z *= lim / r;
      const nxr = this.x / lim;
      const nzr = this.z / lim;
      const out = this.vx * nxr + this.vz * nzr;
      if (out > 0) {
        this.vx -= out * nxr;
        this.vz -= out * nzr;
      }
    }

    /* jumping: buffered presses, coyote time, a flip on the double jump */
    if (this.jumpBuf > 0 && !stunned) {
      if (this.grounded || this.sinceGround < COYOTE) {
        this.vy = JUMP_V;
        this.grounded = false;
        this.jumps = 1;
        this.jumpBuf = 0;
        this.sqV = 3;
        this.emote = null;
        this.onFx("jump", this.x, this.y, this.z, this.heading);
      } else if (this.jumps < 2) {
        this.vy = DOUBLE_V;
        this.jumps = 2;
        this.jumpBuf = 0;
        this.startFlip(0.5, 1);
        this.onFx("double", this.x, this.y, this.z, this.heading);
      }
    }

    /* bounce pads */
    if (this.grounded && !stunned) {
      for (const [px, pz] of this.pads) {
        if (Math.hypot(this.x - px, this.z - pz) < 0.6) {
          this.vy = PAD_V;
          this.grounded = false;
          this.jumps = 1;
          this.sqV = 5;
          this.startFlip(1.0, 2);
          this.onFx("pad", px, this.y, pz, 0);
          break;
        }
      }
    }

    /* traffic */
    if (!stunned && this.y < 0.7) {
      for (const c of this.cars()) {
        if (c.v < 0.4) continue;
        const along = c.axis === "x" ? this.x - c.x : this.z - c.z;
        const cross = c.axis === "x" ? this.z - c.z : this.x - c.x;
        if (Math.abs(along) < 0.62 && Math.abs(cross) < 0.4) {
          const push = 3 + c.v * 1.8;
          const side = cross >= 0 ? 1 : -1;
          if (c.axis === "x") {
            this.vx = c.dir * push;
            this.vz = side * 2.4;
          } else {
            this.vz = c.dir * push;
            this.vx = side * 2.4;
          }
          this.vy = 6;
          this.grounded = false;
          this.tumbleT = 1.1;
          this.emote = null;
          this.dashT = 0;
          this.onFx("hit", this.x, this.y + 0.5, this.z, 0);
          break;
        }
      }
    }

    /* gravity, gliding and landing */
    this.floor = Math.max(0, this.solid(this.x, this.z));
    if (this.floor > this.y + STEP_UP) this.floor = this.y;
    this.gliding = !this.grounded && this.held && this.vy < 0 && this.airTime > 0.25 && !stunned && this.dashT <= 0;
    if (!this.grounded) {
      if (this.dashT > 0 && this.airDash) this.vy = Math.max(this.vy - 4 * dt, 0);
      else if (this.gliding) this.vy = Math.max(this.vy - 4 * dt, -1.1);
      else this.vy -= GRAVITY * (this.vy < 0 && !this.held ? 1.25 : 1) * dt;
      this.y += this.vy * dt;
      if (this.y <= this.floor) {
        const impact = -this.vy;
        this.y = this.floor;
        this.vy = 0;
        this.grounded = true;
        this.jumps = 0;
        this.airDash = false;
        this.gliding = false;
        if (this.tumbleT > 0) this.tumbleT = Math.min(this.tumbleT, 0.35);
        this.sqV = -Math.min(7, 1.5 + impact * 0.55);
        if (impact > 9) {
          this.landT = 0.28;
          this.onFx("bigland", this.x, this.y, this.z, impact);
        } else if (impact > 3) {
          this.landT = 0.14;
          this.onFx("land", this.x, this.y, this.z, impact);
        }
      }
    } else if (this.y > this.floor + 0.05) {
      /* walked off a ledge */
      this.grounded = false;
    } else {
      this.y = this.floor;
    }

    /* squash and stretch spring */
    this.sqV += (1 - this.sq) * 220 * dt - this.sqV * 14 * dt;
    this.sq = Math.max(0.6, Math.min(1.3, this.sq + this.sqV * dt));
    h.squash = this.sq;

    /* gait and footsteps */
    const sp = Math.hypot(this.vx, this.vz);
    h.stride = Math.max(0, Math.min(1, (sp - WALK * 0.9) / (RUN - WALK * 0.9)));
    if (this.grounded && this.dashT <= 0) {
      const k = 5.7 + (3.9 - 5.7) * h.stride;
      h.gait += sp * dt * k;
      const step = Math.floor(h.gait / Math.PI);
      if (step !== this.lastStep && sp > 0.5) {
        this.lastStep = step;
        this.onFx(h.stride > 0.5 ? "runstep" : "step", this.x, this.y, this.z, this.heading);
      }
    }

    /* flips, rolls and tumbles turn the whole body */
    if (this.flipT > 0) {
      this.flipT = Math.max(0, this.flipT - dt);
      const u = 1 - this.flipT / this.flipDur;
      h.flip = (u * u * (3 - 2 * u)) * Math.PI * 2 * this.flipTurns;
    } else if (this.rollT > 0) {
      h.flip = (1 - this.rollT / 0.5) * Math.PI * 2;
    } else if (this.tumbleT > 0 && !this.grounded) {
      h.flip += dt * 9;
      h.tilt += dt * 5;
    } else {
      h.flip = 0;
      h.tilt += (0 - h.tilt) * Math.min(1, dt * 10);
    }
    if (this.grounded && this.flipT > 0) this.flipT = 0;

    /* pick the pose */
    let s: typeof h.state;
    if (stunned && !this.grounded) s = "tumble";
    else if (stunned) s = "land";
    else if (this.rollT > 0) s = "roll";
    else if (!this.grounded) s = this.gliding ? "glide" : this.flipT > 0 ? "roll" : this.vy > 0.6 ? "rise" : "fall";
    else if (this.landT > 0) s = "land";
    else if (this.emote) s = this.emote;
    else if (sp > 0.25) s = h.stride > 0.45 ? "run" : "walk";
    else s = "idle";
    h.state = s;
    h.wingOpen += ((this.gliding ? 1 : 0) - h.wingOpen) * Math.min(1, dt * 8);
    this.place();
    void t;
  }

  dispose(): void {
    this.hero.dispose();
  }
}
