"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * The moving parts of the landing screen: a field of glowing particles that drift up like a reef at
 * night, headline letters that rise one after another, counters that run up to their value, and the
 * colour "mixes" a visitor can shuffle with a click or the M key. All of it is plain DOM and a 2D
 * canvas, so none of it waits for the 3D city, and all of it stops when motion is off.
 */

export const MIXES = [
  { name: "Cosmos × Jellyfish", a: "#ff6fb0", b: "#a898ff", c: "#5ce6ff" },
  { name: "Peach × Lagoon", a: "#ffb38a", b: "#ff6fb0", c: "#4ff0c8" },
  { name: "Lilac × Lime", a: "#a898ff", b: "#5ce6ff", c: "#d6ff6f" },
  { name: "Coral × Ice", a: "#ff7a6b", b: "#ffc4e0", c: "#9fe9ff" },
] as const;

export function applyMix(i: number) {
  const m = MIXES[i % MIXES.length];
  const s = document.documentElement.style;
  s.setProperty("--accent", m.a);
  s.setProperty("--lilac", m.b);
  s.setProperty("--jelly", m.c);
}

/** Text whose letters rise into place one after another. Screen readers get the plain text once. */
export function Kinetic({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={`kin ${className}`}>
      <span className="sr">{text}</span>
      {Array.from(text).map((ch, i) => (
        <span key={i} aria-hidden="true" style={{ "--i": i + delay } as CSSProperties}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/** A number that runs up to its value once, or shows it at once when motion is off. */
export function Count({ to, still, dur = 1600 }: { to: number; still: boolean; dur?: number }) {
  const [n, setN] = useState(still ? to : 0);
  useEffect(() => {
    if (still) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setN(Math.round(from + (to - from) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, still, dur]);
  return <>{n.toLocaleString("en-US")}</>;
}

type Dot = { x: number; y: number; vx: number; vy: number; r: number; c: number; ph: number };

/** One soft glow per colour, drawn once and stamped for every particle. */
function sprite(color: string): HTMLCanvasElement {
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.18, color);
  grd.addColorStop(0.5, `${color}55`);
  grd.addColorStop(1, `${color}00`);
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  return cv;
}

/**
 * The particle field. It starts once the page has settled, keeps to about one particle per 9000 px²
 * (at most 170), caps the pixel ratio at 1.5 and stops whenever it is hidden, covered by the live city
 * or motion is off; then it holds one still frame.
 */
export function Bloom({ run, mix, onCount }: { run: boolean; mix: number; onCount?: (n: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{
    dots: Dot[];
    sprites: HTMLCanvasElement[];
    burst: number;
    px: number;
    py: number;
    still: (() => void) | null;
  }>({ dots: [], sprites: [], burst: 0, px: -1e4, py: -1e4, still: null });
  const countCb = useRef(onCount);
  countCb.current = onCount;
  /* nothing of the field is set up until the page has hydrated and gone quiet */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 800);
    return () => window.clearTimeout(id);
  }, []);

  /* a new mix recolours the field and throws every particle outwards from the centre */
  useEffect(() => {
    const st = state.current;
    const m = MIXES[mix % MIXES.length];
    if (!ready) return;
    st.sprites = [sprite(m.a), sprite(m.b), sprite(m.c)];
    if (st.dots.length && mix > 0) st.burst = 1;
    st.still?.();
  }, [mix, ready]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !ready) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const st = state.current;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();

    const size = () => {
      const pr = Math.min(1.5, window.devicePixelRatio || 1);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * pr);
      cv.height = Math.round(h * pr);
      g.setTransform(pr, 0, 0, pr, 0, 0);
      const want = Math.min(170, Math.round((w * h) / 9000));
      while (st.dots.length < want) {
        st.dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 0,
          vy: 0,
          r: 3 + Math.pow(Math.random(), 3) * 16,
          c: Math.floor(Math.random() * 3),
          ph: Math.random() * Math.PI * 2,
        });
      }
      st.dots.length = want;
      countCb.current?.(want);
    };

    const draw = (t: number, dt: number) => {
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      const cx = w / 2;
      const cy = h * 0.45;
      const b = st.burst;
      for (const d of st.dots) {
        if (dt > 0) {
          /* rise and sway, like plankton in a current */
          const sway = Math.sin(t * 0.0006 + d.ph) * 0.25;
          d.vx += (sway - d.vx) * 0.02;
          d.vy += (-0.18 - d.r * 0.012 - d.vy) * 0.02;
          /* the pointer parts the field */
          const ex = d.x - st.px;
          const ey = d.y - st.py;
          const e2 = ex * ex + ey * ey;
          if (e2 < 14400 && e2 > 1) {
            const f = (1 - Math.sqrt(e2) / 120) * 0.9;
            d.vx += (ex / Math.sqrt(e2)) * f;
            d.vy += (ey / Math.sqrt(e2)) * f;
          }
          if (b > 0.98) {
            const bx = d.x - cx;
            const by = d.y - cy;
            const bl = Math.hypot(bx, by) || 1;
            d.vx += (bx / bl) * (6 + Math.random() * 6);
            d.vy += (by / bl) * (6 + Math.random() * 6);
          }
          d.x += d.vx * dt * 0.06;
          d.y += d.vy * dt * 0.06;
          if (d.y < -30) {
            d.y = h + 30;
            d.x = Math.random() * w;
          } else if (d.y > h + 40) d.y = -20;
          if (d.x < -30) d.x = w + 20;
          else if (d.x > w + 30) d.x = -20;
        }
        const pulse = 0.75 + Math.sin(t * 0.002 + d.ph * 3) * 0.25;
        const s = d.r * 2 * pulse;
        g.globalAlpha = 0.55 + 0.45 * pulse;
        const sp = st.sprites[d.c];
        if (sp) g.drawImage(sp, d.x - s / 2, d.y - s / 2, s, s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      if (b > 0) st.burst = Math.max(0, b - 0.05);
    };

    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    };

    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      st.px = e.clientX - r.left;
      st.py = e.clientY - r.top;
    };
    const onLeave = () => {
      st.px = st.py = -1e4;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    let started = false;
    const start = () => {
      if (started || document.hidden) return;
      started = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      started = false;
      cancelAnimationFrame(raf);
    };
    const onVis = () => (document.hidden ? stop() : run && start());
    document.addEventListener("visibilitychange", onVis);

    /* one still frame at once, then motion once the page has settled */
    st.still = run ? null : () => draw(performance.now(), 0);
    draw(performance.now(), 0);
    if (run) start();

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [run, ready]);

  return <canvas ref={ref} className="bloom" aria-hidden="true" />;
}
