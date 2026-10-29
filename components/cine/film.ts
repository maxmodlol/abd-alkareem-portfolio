import type { Cine } from "./scene";

/**
 * The film as video: a run of generated clips that play end to end as one shot, scrubbed by the
 * scroll. Each clip is its own small file so the first one plays while the rest load, nearest the
 * visitor first. The clips are fetched whole into memory before they are shown, because seeking a
 * video that is still streaming stalls on most browsers; until a clip is in, its first frame stands
 * in for it.
 *
 * The page hands over the same progress as it does to the 3D scene (0 to 1, in beats of equal
 * scroll); the manifest says at which second of the film each beat comes to rest.
 */

export type FilmManifest = {
  /** In playing order. Files are /film/<name>.webm and .mp4, -s for the small cut, .webp for the first frame. */
  clips: { name: string; duration: number }[];
  /** Film time in seconds at which each beat rests, one per section of the page. */
  beats: number[];
  /** Horizontal focus on screens narrower than the film, 0 to 1. */
  focus?: number;
};

type Slot = {
  start: number;
  duration: number;
  name: string;
  root: HTMLDivElement;
  video: HTMLVideoElement;
  state: "none" | "loading" | "ready" | "failed";
  url?: string;
  /** The time last asked of the video, so a seek is not repeated while it runs. */
  asked: number;
};

const FRAME = 1 / 24;

function pickFormat(): { ext: string; small: boolean } {
  const probe = document.createElement("video");
  const webm = probe.canPlayType('video/webm; codecs="vp9"') !== "";
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const small = window.matchMedia("(max-width: 759px)").matches || conn?.saveData === true;
  return { ext: webm ? "webm" : "mp4", small };
}

export async function createFilm(o: {
  host: HTMLElement;
  manifest: FilmManifest;
  reduceMotion: boolean;
  onProgress?: (done: number, total: number, label: string) => void;
}): Promise<Cine | null> {
  const { manifest: m, host } = o;
  if (!m.clips.length || m.beats.length < 2) return null;
  const { ext, small } = pickFormat();
  const base = "/film/";

  let t = 0;
  const slots: Slot[] = m.clips.map((c) => {
    const root = document.createElement("div");
    root.className = "film-clip";
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.disablePictureInPicture = true;
    video.setAttribute("aria-hidden", "true");
    root.appendChild(video);
    host.appendChild(root);
    const s: Slot = { start: t, duration: c.duration, name: c.name, root, video, state: "none", asked: -1 };
    video.addEventListener("seeked", () => (s.asked = -1));
    t += c.duration;
    return s;
  });
  const total = t;
  if (m.focus !== undefined) host.style.setProperty("--film-focus", `${Math.round(m.focus * 100)}%`);

  /* ---------- loading, nearest first ---------- */
  let disposed = false;
  let loaded = 0;
  const controllers: AbortController[] = [];
  const load = async (s: Slot) => {
    if (s.state !== "none") return;
    s.state = "loading";
    const ctl = new AbortController();
    controllers.push(ctl);
    try {
      const res = await fetch(`${base}${s.name}${small ? "-s" : ""}.${ext}`, { signal: ctl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      if (disposed) return;
      s.url = URL.createObjectURL(blob);
      s.video.src = s.url;
      await new Promise<void>((ok, bad) => {
        s.video.addEventListener("loadeddata", () => ok(), { once: true });
        s.video.addEventListener("error", () => bad(new Error("decode")), { once: true });
      });
      s.state = "ready";
      loaded++;
      o.onProgress?.(loaded, slots.length, "Loading the film");
    } catch {
      if (!disposed) s.state = "failed";
    }
  };
  const slotAt = (time: number) => {
    let i = 0;
    while (i < slots.length - 1 && time >= slots[i + 1].start) i++;
    return i;
  };
  /* two at a time, ordered by distance from wherever the visitor is now */
  const queue = async () => {
    for (;;) {
      if (disposed) return;
      const here = slotAt(current);
      const next = slots
        .map((s, i) => ({ s, d: Math.abs(i - here) + (i < here ? 0.5 : 0) }))
        .filter((x) => x.s.state === "none")
        .sort((a, b) => a.d - b.d)[0];
      if (!next) return;
      await load(next.s);
    }
  };

  /* ---------- the timeline ---------- */
  const beats = m.beats;
  const timeAt = (p: number) => {
    const raw = Math.min(1, Math.max(0, p)) * (beats.length - 1);
    const bi = Math.min(beats.length - 2, Math.floor(raw));
    const f = raw - bi;
    /* ease into each beat, so the picture settles where the visitor reads */
    const e = f + (f * f * (3 - 2 * f) - f) * 0.75;
    return beats[bi] + (beats[bi + 1] - beats[bi]) * e;
  };

  let target = 0;
  let current = 0;
  let shown = -1;
  /* the opening plays on its own up to the first beat, once, unless motion is reduced */
  let intro = o.reduceMotion ? -1 : 0;

  const first = slots[slotAt(beats[0])];
  o.onProgress?.(0, slots.length, "Loading the film");
  await load(first);
  if (first.state !== "ready") {
    for (const s of slots) s.root.remove();
    throw new Error("film");
  }
  void queue();
  void queue();

  /* first frames are fetched for the clips around the visitor only */
  const poster = (s: Slot | undefined) => {
    if (s && !s.root.style.backgroundImage) s.root.style.backgroundImage = `url(${base}${s.name}.webp)`;
  };
  const show = (i: number) => {
    if (i === shown) return;
    for (let k = i - 1; k <= i + 2; k++) poster(slots[k]);
    slots[i].root.classList.add("on");
    if (shown >= 0) slots[shown].root.classList.remove("on");
    shown = i;
  };

  let raf = 0;
  let active = true;
  let last = performance.now();
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (intro >= 0) {
      /* the hero holds at beats[0]; the intro runs up to it in real time */
      if (target <= beats[0] + FRAME) {
        intro = Math.min(beats[0], intro + dt);
        current = intro;
        if (intro >= beats[0]) intro = -1;
      } else {
        intro = -1;
      }
    } else if (o.reduceMotion) {
      current = target;
    } else {
      current += (target - current) * (1 - Math.exp(-dt * 7));
      if (Math.abs(target - current) < FRAME / 4) current = target;
    }
    const i = slotAt(current);
    const s = slots[i];
    show(i);
    if (s.state === "none") void load(s).then(queue);
    if (s.state !== "ready") return;
    const local = Math.min(s.duration - FRAME / 2, Math.max(0, current - s.start));
    if (s.asked < 0 && !s.video.seeking && Math.abs(s.video.currentTime - local) > FRAME / 2) {
      s.asked = local;
      s.video.currentTime = local;
    }
  };

  const setActive = (on: boolean) => {
    if (on === active) return;
    active = on;
    cancelAnimationFrame(raf);
    if (on) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  const onVis = () => setActive(!document.hidden);
  document.addEventListener("visibilitychange", onVis);
  raf = requestAnimationFrame(tick);

  return {
    setProgress: (p) => {
      target = Math.min(total, timeAt(p));
    },
    setActive,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      for (const c of controllers) c.abort();
      for (const s of slots) {
        s.video.removeAttribute("src");
        s.video.load();
        if (s.url) URL.revokeObjectURL(s.url);
        s.root.remove();
      }
    },
  };
}
