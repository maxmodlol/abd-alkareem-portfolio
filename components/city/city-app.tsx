"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { jobs, person, skills } from "@/lib/content";
import { projects, type Project } from "@/lib/projects";

import type { BuildingId, CityScene, Quality } from "./city-scene";
import { Dialog, HoldButton, Stick } from "./hud";

/* gold flecks for the end-of-game card */
const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 100) / 100,
  dur: 2.4 + ((i * 29) % 10) / 8,
  color: ["#d7c68a", "#f3e2b0", "#9a8762", "#777f91"][i % 4],
}));

/* the order the guided walk visits the buildings in (WALK_ROUTE in city-scene.ts) */
const TOUR_ORDER: BuildingId[] = ["villagewellth", "sahefa", "arvo", "carebooks", "oliva", "diwan", "watan", "sgsoft"];

type View = "home" | "work" | "project" | "exp" | "skills" | "contact";
type Tab = "work" | "exp" | "skills" | "contact";
type Stage = "idle" | "loading" | "live" | "failed" | "nogl";
type Intent = "explore" | "play" | "tour";
type QualityPref = Quality | "auto";

const tabs: { id: Tab; label: string }[] = [
  { id: "work", label: "Work" },
  { id: "exp", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

const QUALITY_LABEL: Record<QualityPref, string> = {
  auto: "Automatic",
  high: "High",
  balanced: "Balanced",
  low: "Low",
};

/* The city code (three.js and the scene, about 180 KB compressed) is fetched only when the visitor shows
   intent: hovering, focusing or touching a button that enters the city. Nothing of it runs during page load. */
let sceneModule: Promise<typeof import("./city-scene")> | null = null;
function loadSceneModule() {
  sceneModule ??= import("./city-scene").catch((e) => {
    sceneModule = null;
    throw e;
  });
  return sceneModule;
}
const warm = {
  onPointerEnter: () => void loadSceneModule().catch(() => undefined),
  onFocus: () => void loadSceneModule().catch(() => undefined),
  onTouchStart: () => void loadSceneModule().catch(() => undefined),
};

/** The name of the graphics renderer, used to spot software rendering and integrated GPUs. */
function rendererName(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return "none";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "";
  }
}

/**
 * A first guess at the right preset from what the browser reports. A missing signal is never read as
 * a weak device (Safari and Firefox hide memory size); the frame governor inside the scene corrects
 * the guess from real frame times afterwards.
 */
function autoQuality(): Quality {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.screen.width, window.screen.height) < 820;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const gpu = rendererName();
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) return "low";
  if (coarse && small) return "low";
  if (coarse) return "balanced";
  if ((mem !== undefined && mem <= 4) || (cores !== undefined && cores <= 4)) return "balanced";
  if (/intel|mali|adreno|powervr/i.test(gpu) && !/arc/i.test(gpu)) return "balanced";
  return "high";
}

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage is optional */
  }
}

export function CityApp() {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 1, label: "" });
  const [stalled, setStalled] = useState(false);
  const [failNote, setFailNote] = useState("");
  /* bumps for every build; the canvas is keyed on it so a rebuild always gets a fresh graphics context */
  const [gen, setGen] = useState(0);
  const [view, setView] = useState<View>("home");
  const [selected, setSelected] = useState<BuildingId | null>(null);
  const [copied, setCopied] = useState(false);
  const [night, setNight] = useState(false);
  const [touring, setTouring] = useState(false);
  const [tourPaused, setTourPaused] = useState(false);
  const [tourStop, setTourStop] = useState<BuildingId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [menu, setMenu] = useState<"none" | "pause" | "settings">("none");
  const [near, setNear] = useState<BuildingId | null>(null);
  const [coins, setCoins] = useState({ n: 0, total: 0 });
  const [gems, setGems] = useState({ n: 0, total: 0 });
  const [combo, setCombo] = useState({ n: 0, key: 0 });
  const [muted, setMuted] = useState(false);
  const [qualityPref, setQualityPref] = useState<QualityPref>("auto");
  const [qualityUsed, setQualityUsed] = useState<Quality>("balanced");
  const [fps, setFps] = useState(0);
  const [visited, setVisited] = useState<BuildingId[]>([]);
  const [winSeen, setWinSeen] = useState(false);
  const [touch, setTouch] = useState(false);
  const [narrowUi, setNarrowUi] = useState(false);

  const miniRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const addrRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const tagRefs = useRef<Partial<Record<BuildingId, HTMLElement | null>>>({});
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fromDeckRef = useRef(false);
  const progScroll = useRef(false);
  const deckTimer = useRef(0);
  const selectedRef = useRef<BuildingId | null>(null);
  const intentRef = useRef<Intent>("explore");
  const buildingRef = useRef(false);
  const lostAt = useRef(-Infinity);
  const stageRef = useRef<Stage>("idle");
  stageRef.current = stage;

  const live = stage === "live";

  /* ---------- views ---------- */
  const goHome = useCallback((fromDeck?: boolean) => {
    fromDeckRef.current = fromDeck === true;
    setSelected(null);
    setView("home");
  }, []);

  const choose = useCallback((id: BuildingId, fromDeck?: boolean) => {
    fromDeckRef.current = fromDeck === true;
    setSelected(id);
    setView("project");
  }, []);

  const stopTour = useCallback(() => {
    sceneRef.current?.stopWalk();
    setTouring(false);
    setTourPaused(false);
    setTourStop(null);
  }, []);

  const stopPlay = useCallback(() => {
    sceneRef.current?.stopPlay();
    setPlaying(false);
    setNear(null);
    setMenu("none");
  }, []);

  const openTab = useCallback(
    (t: Tab) => {
      if (touring) stopTour();
      fromDeckRef.current = false;
      setSelected(null);
      setView(t);
    },
    [stopTour, touring],
  );

  const pickManual = useCallback(
    (id: BuildingId) => {
      if (touring) stopTour();
      choose(id);
    },
    [choose, stopTour, touring],
  );

  /* ---------- the game and the tour ---------- */
  const startPlayNow = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    stopTour();
    const ok = scene.startPlay({
      onNear: setNear,
      onInteract: (id) => choose(id),
      onCoin: (n, total, c) => {
        setCoins({ n, total });
        if (c >= 2) setCombo({ n: c, key: n });
      },
      onGem: (n, total) => setGems({ n, total }),
    });
    if (!ok) return;
    /* a focused button would otherwise take the Space key the game uses for jumping */
    (document.activeElement as HTMLElement | null)?.blur?.();
    setVisited([]);
    setWinSeen(false);
    setSelected(null);
    setView("home");
    setMenu("none");
    setPlaying(true);
  }, [choose, stopTour]);

  const startTourNow = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    sceneRef.current?.stopPlay();
    setPlaying(false);
    setMenu("none");
    const walked = scene.startWalk({
      onStop: (id) => {
        setTourStop(id);
        choose(id);
      },
      onLeave: () => goHome(),
    });
    if (!walked) return;
    setSelected(null);
    setView("home");
    setTouring(true);
    setTourPaused(false);
    setTourStop(null);
  }, [choose, goHome]);

  const applyIntent = useCallback(() => {
    const intent = intentRef.current;
    intentRef.current = "explore";
    if (intent === "play") startPlayNow();
    else if (intent === "tour") startTourNow();
  }, [startPlayNow, startTourNow]);

  /** Starts the live city, or acts on it if it is already running. Repeated clicks only update the intent. */
  const enter = useCallback(
    (intent: Intent) => {
      intentRef.current = intent;
      if (stageRef.current === "live") {
        applyIntent();
        return;
      }
      if (buildingRef.current) return;
      setFailNote("");
      setStage("loading");
      setGen((g) => g + 1);
    },
    [applyIntent],
  );

  /** Puts the visitor back on the plain portfolio and frees the graphics card. */
  const leaveCity = useCallback(() => {
    stopTour();
    stopPlay();
    setMenu("none");
    goHome();
    sceneRef.current?.dispose();
    sceneRef.current = null;
    setStage("idle");
  }, [goHome, stopPlay, stopTour]);

  /* ---------- preferences ---------- */
  useEffect(() => {
    setMuted(readPref("city-muted", ["0", "1"] as const, "0") === "1");
    setQualityPref(readPref<QualityPref>("city-quality", ["auto", "high", "balanced", "low"] as const, "auto"));
    setNight(readPref("city-mood", ["dusk", "night"] as const, "dusk") === "night");
    const coarse = window.matchMedia("(pointer: coarse)");
    const narrow = window.matchMedia("(max-width: 759px)");
    const sync = () => {
      setTouch(coarse.matches);
      setNarrowUi(narrow.matches);
    };
    sync();
    coarse.addEventListener?.("change", sync);
    narrow.addEventListener?.("change", sync);
    return () => {
      coarse.removeEventListener?.("change", sync);
      narrow.removeEventListener?.("change", sync);
    };
  }, []);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    writePref("city-muted", m ? "1" : "0");
  };
  const toggleNight = () => {
    const n = !night;
    setNight(n);
    writePref("city-mood", n ? "night" : "dusk");
  };
  const chooseQuality = (q: QualityPref) => {
    setQualityPref(q);
    writePref("city-quality", q);
    const resolved = q === "auto" ? autoQuality() : q;
    if (stageRef.current === "live" && resolved !== qualityUsed) {
      /* presets change shadows, lights and detail, which are fixed at build time: rebuild in place */
      intentRef.current = playing ? "play" : "explore";
      stopTour();
      stopPlay();
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setStage("loading");
      setGen((g) => g + 1);
    }
  };

  useEffect(() => {
    sceneRef.current?.setMuted(muted);
  }, [muted, stage]);
  useEffect(() => {
    sceneRef.current?.setNight(night ? 1 : 0);
  }, [night, stage]);

  /* ---------- building the live city ---------- */
  useEffect(() => {
    if (gen === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let lastStep = performance.now();
    buildingRef.current = true;
    setStalled(false);
    setProgress({ done: 0, total: 1, label: "Downloading the city" });
    const watch = window.setInterval(() => {
      if (performance.now() - lastStep > 20000) setStalled(true);
    }, 2000);
    const quality = (() => {
      const pref = readPref<QualityPref>("city-quality", ["auto", "high", "balanced", "low"] as const, "auto");
      return pref === "auto" ? autoQuality() : pref;
    })();
    setQualityUsed(quality);

    loadSceneModule()
      .then(async ({ createCityScene }) => {
        if (cancelled) return;
        lastStep = performance.now();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const scene = await createCityScene({
          canvas,
          tagEls: tagRefs.current,
          getMetrics: () => ({
            narrow: window.innerWidth < 760,
            topH: topRef.current?.getBoundingClientRect().bottom ?? 0,
            deckTop: deckRef.current?.getBoundingClientRect().top ?? window.innerHeight,
          }),
          onPick: (id) => pickRef.current(id),
          reduceMotion: reduce,
          quality,
          onProgress: (done, total, label) => {
            lastStep = performance.now();
            if (!cancelled) {
              setStalled(false);
              setProgress({ done, total, label });
            }
          },
          onContextLost: () => lostRef.current(),
          onPauseRequest: () => pauseRef.current(),
        });
        if (cancelled) {
          scene?.dispose();
          return;
        }
        if (!scene) {
          setStage("nogl");
          return;
        }
        sceneRef.current = scene;
        scene.select(selectedRef.current);
        scene.focus(selectedRef.current ?? "home");
        setStage("live");
        requestAnimationFrame(() => requestAnimationFrame(() => canvas.classList.add("on")));
        if (document.fonts?.ready) document.fonts.ready.then(() => scene.relayout()).catch(() => undefined);
      })
      .catch(() => {
        if (cancelled) return;
        setFailNote("The city could not be downloaded. Check the connection and try again.");
        setStage("failed");
      })
      .finally(() => {
        window.clearInterval(watch);
        if (!cancelled) buildingRef.current = false;
      });
    return () => {
      cancelled = true;
      buildingRef.current = false;
      window.clearInterval(watch);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [gen]);

  /* once live, act on what the visitor asked for (enter, play or tour) */
  useEffect(() => {
    if (stage === "live") applyIntent();
  }, [stage, applyIntent]);

  /* latest handlers for callbacks the scene holds on to */
  const pickRef = useRef(pickManual);
  pickRef.current = pickManual;
  const pauseRef = useRef(() => undefined as void);
  pauseRef.current = () => {
    if (playing) setMenu("pause");
    if (touring) setTourPaused(true);
  };
  const lostRef = useRef(() => undefined as void);
  lostRef.current = () => {
    /* rebuild once on a fresh canvas; a second loss soon after means the device is struggling */
    const again = performance.now() - lostAt.current < 30000;
    lostAt.current = performance.now();
    intentRef.current = playing ? "play" : "explore";
    stopTour();
    stopPlay();
    sceneRef.current?.dispose();
    sceneRef.current = null;
    if (again) {
      setFailNote("The graphics card reset twice. The portfolio still works; you can try the city again.");
      setStage("failed");
    } else {
      setStage("loading");
      setGen((g) => g + 1);
    }
  };

  /* the island stops drawing whenever it cannot be seen */
  const sheetOpen = view === "exp" || view === "skills" || view === "contact" || view === "work";
  useEffect(() => {
    sceneRef.current?.setActive(live && !(narrowUi && sheetOpen && !playing));
  }, [live, narrowUi, sheetOpen, playing]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setPanelOpen(view !== "home");
    scene.setPaused((playing && (view !== "home" || menu !== "none")) || (touring && tourPaused));
    scene.setMinimap(playing && view === "home" ? miniRef.current : null);
  }, [view, playing, menu, touring, tourPaused, stage]);
  useEffect(() => {
    sceneRef.current?.setVisited(visited);
  }, [visited, stage]);
  useEffect(() => {
    if (!playing || !selected) return;
    setVisited((v) => (v.includes(selected) ? v : [...v, selected]));
  }, [selected, playing]);

  /* frame-rate readout while the settings are open */
  useEffect(() => {
    if (menu === "none") return;
    const id = window.setInterval(() => setFps(Math.round(sceneRef.current?.fps() ?? 0)), 1000);
    return () => window.clearInterval(id);
  }, [menu]);

  /* Escape always has a way out: close a menu, then a panel, then pause the game or end the tour */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menu !== "none") {
        e.preventDefault();
        setMenu("none");
      } else if (view !== "home") {
        e.preventDefault();
        goHome();
      } else if (playing) {
        e.preventDefault();
        setMenu("pause");
      } else if (touring) {
        stopTour();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, view, playing, touring, goHome, stopTour]);

  /* ---------- the phone deck ---------- */
  const scrollDeckTo = useCallback((idx: number, smooth: boolean) => {
    const deck = deckRef.current;
    const card = cardRefs.current[idx];
    if (!deck || !card) return;
    progScroll.current = true;
    deck.scrollTo({
      left: card.offsetLeft + card.offsetWidth / 2 - deck.clientWidth / 2,
      behavior: smooth ? "smooth" : "auto",
    });
    window.setTimeout(() => {
      progScroll.current = false;
    }, 700);
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
    const scene = sceneRef.current;
    scene?.select(selected);
    scene?.focus(selected ?? "home");
    if (fromDeckRef.current) return;
    if (!window.matchMedia("(max-width: 759px)").matches) return;
    const idx = selected ? projects.findIndex((p) => p.id === selected) + 1 : 0;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollDeckTo(idx, smooth);
  }, [selected, scrollDeckTo]);

  const onDeckScroll = () => {
    if (progScroll.current) return;
    window.clearTimeout(deckTimer.current);
    deckTimer.current = window.setTimeout(() => {
      const deck = deckRef.current;
      if (!deck) return;
      const mid = deck.scrollLeft + deck.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      const id = best === 0 ? null : projects[best - 1].id;
      if (id !== selectedRef.current) {
        if (id) choose(id, true);
        else goHome(true);
      }
    }, 90);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(person.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      const el = addrRef.current;
      if (!el) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const activeTab: Tab | null = view === "project" ? "work" : view === "home" ? null : view;
  const current: Project | undefined = projects.find((p) => p.id === selected);
  const next: Project | undefined = current ? projects[(projects.indexOf(current) + 1) % projects.length] : undefined;
  const pct = Math.round((progress.done / Math.max(1, progress.total)) * 100);
  const loading = stage === "loading";
  const tourIndex = tourStop ? TOUR_ORDER.indexOf(tourStop) + 1 : 0;
  const nearName = near ? projects.find((p) => p.id === near)?.name : null;

  const qualityChoices = (
    <fieldset className="opts">
      <legend>Graphics</legend>
      {(["auto", "high", "balanced", "low"] as const).map((q) => (
        <label key={q} className={qualityPref === q ? "on" : ""}>
          <input type="radio" name="quality" checked={qualityPref === q} onChange={() => chooseQuality(q)} />
          {QUALITY_LABEL[q]}
          {q === "auto" && live ? <small>{QUALITY_LABEL[qualityUsed]}</small> : null}
        </label>
      ))}
    </fieldset>
  );

  return (
    <div
      className={`city stage-${stage}${playing ? " playing" : ""}${touring ? " touring" : ""}${selected ? " sel" : ""}${
        view !== "home" ? " paneled" : ""
      }`}
    >
      {/* a picture of the city shows at once and stays as the fallback; the live city fades in over it */}
      <picture className="poster">
        <source media="(max-width: 759px)" srcSet="/city-tall.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/city-wide.webp" alt="" fetchPriority="high" decoding="async" width={1600} height={1000} />
      </picture>
      <canvas key={gen} ref={canvasRef} id="scene" tabIndex={-1} aria-label="The 3D city" />

      {/* ---------- landing ---------- */}
      {!live ? (
        <section className="gate" aria-labelledby="gate-title">
          <div className="gate-inner">
            <p className="eyebrow">Full-stack software engineer · Palestine · remote</p>
            <h1 id="gate-title" className="wordmark">
              <span>Abd Alkareem</span>
              <span>Abu-Alsoud</span>
            </h1>
            <p className="gate-line">Products are cities. I build the plumbing.</p>
            <p className="gate-lede">
              Three years shipping SaaS platforms, CRMs, APIs and mobile apps. Every building in this city is one of them.
            </p>

            {stage === "idle" ? (
              <div className="gate-actions">
                <button type="button" className="btn gold" onClick={() => enter("explore")} {...warm}>
                  Enter the city
                </button>
                <button type="button" className="btn" onClick={() => openTab("work")}>
                  Browse the work
                </button>
                <div className="gate-more">
                  <button type="button" className="link" onClick={() => enter("play")} {...warm}>
                    Play the game
                  </button>
                  <span aria-hidden="true">·</span>
                  <button type="button" className="link" onClick={() => enter("tour")} {...warm}>
                    Guided tour
                  </button>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="load" role="status" aria-live="polite">
                <div className="load-row">
                  <span>{progress.label}</span>
                  <span className="mono">{progress.done ? `${pct}%` : ""}</span>
                </div>
                <div
                  className="load-bar"
                  role="progressbar"
                  aria-label="Building the city"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.done ? pct : undefined}
                >
                  <i className={progress.done ? "" : "wait"} style={progress.done ? { width: `${pct}%` } : undefined} />
                </div>
                <p className="load-note">
                  {stalled
                    ? "This is taking longer than usual. You can keep waiting or read the portfolio meanwhile."
                    : intentRef.current === "play"
                      ? "The game starts as soon as the city is ready."
                      : "The portfolio stays readable while the city is built."}
                </p>
                <div className="load-actions">
                  <button type="button" className="link" onClick={() => openTab("work")}>
                    Browse the work meanwhile
                  </button>
                </div>
              </div>
            ) : null}

            {stage === "failed" ? (
              <div className="load err" role="alert">
                <p>{failNote || "Something went wrong while building the city."}</p>
                <div className="gate-actions">
                  <button type="button" className="btn gold" onClick={() => enter(intentRef.current)}>
                    Try again
                  </button>
                  <button type="button" className="btn" onClick={() => openTab("work")}>
                    Browse the work
                  </button>
                </div>
              </div>
            ) : null}

            {stage === "nogl" ? (
              <div className="load err" role="alert">
                <p>
                  This browser cannot draw the 3D city (WebGL is turned off or not supported). Everything in the portfolio is
                  still here.
                </p>
                <div className="gate-actions">
                  <button type="button" className="btn gold" onClick={() => openTab("work")}>
                    Browse the work
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ---------- labels over the buildings ---------- */}
      <div className="tags" aria-hidden={!live}>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            tabIndex={live ? 0 : -1}
            className={`${selected === p.id ? "tag on" : "tag"}${playing && visited.includes(p.id) ? " done" : ""}`}
            ref={(el) => {
              tagRefs.current[p.id] = el;
            }}
            onClick={() => pickManual(p.id)}
            aria-label={`Open ${p.name}, ${p.kind}`}
          >
            {p.tag}
          </button>
        ))}
      </div>

      {/* ---------- game HUD ---------- */}
      {playing && view === "home" ? (
        <div className={`hud${touch ? " touch" : ""}`}>
          <div className="hud-card">
            <div className="hud-top">
              <b>Explore the city</b>
              <span className="mono">
                {visited.length}/{projects.length}
              </span>
            </div>
            <div className="hud-bar" aria-hidden="true">
              <i style={{ width: `${(visited.length / projects.length) * 100}%` }} />
            </div>
            <div className="hud-row">
              <div className="hud-count" key={coins.n}>
                <span className="coin" aria-hidden="true" />
                {coins.n}
                <small>/ {coins.total} coins</small>
              </div>
              <div className="hud-count" key={`g${gems.n}`}>
                <span className="gem" aria-hidden="true" />
                {gems.n}
                <small>/ {gems.total}</small>
              </div>
            </div>
          </div>
          <button type="button" className="hud-pause" aria-label="Pause" onClick={() => setMenu("pause")}>
            <span aria-hidden="true" />
          </button>
          {combo.n >= 2 ? (
            <div className="hud-combo" key={combo.key} aria-hidden="true">
              ×{combo.n}
            </div>
          ) : null}
          <canvas ref={miniRef} className="hud-mini" width={300} height={300} aria-hidden="true" />
          {near ? (
            <button className="hud-act" type="button" onClick={() => choose(near)}>
              Enter {nearName} {touch ? null : <kbd>E</kbd>}
            </button>
          ) : null}
          {touch ? (
            <>
              <Stick onMove={(x, y) => sceneRef.current?.setStick(x, y)} />
              <HoldButton
                className="hud-jump"
                label="Jump, hold to glide"
                onDown={() => sceneRef.current?.setJump(true)}
                onUp={() => sceneRef.current?.setJump(false)}
              >
                Jump
              </HoldButton>
              <HoldButton className="hud-dash" label="Dash" onDown={() => sceneRef.current?.dash()}>
                Dash
              </HoldButton>
              <p className="hud-look" aria-hidden="true">
                Drag here to look
              </p>
            </>
          ) : (
            <>
              <p className="hud-help">
                <kbd>W A S D</kbd> move · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump, hold to glide · <kbd>Q</kbd> dash ·{" "}
                <kbd>E</kbd> enter · drag to look · <kbd>Esc</kbd> pause
              </p>
              <div className="hud-emotes">
                <button
                  type="button"
                  onClick={(ev) => {
                    sceneRef.current?.emote("wave");
                    /* hand Space back to the game instead of this button */
                    ev.currentTarget.blur();
                  }}
                >
                  Wave <kbd>1</kbd>
                </button>
                <button
                  type="button"
                  onClick={(ev) => {
                    sceneRef.current?.emote("dance");
                    /* hand Space back to the game instead of this button */
                    ev.currentTarget.blur();
                  }}
                >
                  Dance <kbd>2</kbd>
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {playing && view === "home" && visited.length === projects.length && !winSeen && menu === "none" ? (
        <div className="hud-win" role="dialog" aria-label="City explored">
          <div className="confetti" aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}
              />
            ))}
          </div>
          <p className="eyebrow">All eight buildings visited</p>
          <h2>City explored</h2>
          <p>
            {coins.n} of {coins.total} coins and {gems.n} of {gems.total} gems collected.
          </p>
          <div className="row">
            <button
              className="btn gold"
              type="button"
              onClick={() => {
                setWinSeen(true);
                stopPlay();
                openTab("contact");
              }}
            >
              Get in touch
            </button>
            <button className="btn" type="button" onClick={() => setWinSeen(true)}>
              Keep exploring
            </button>
          </div>
        </div>
      ) : null}

      {playing && view !== "home" ? (
        <button className={`hud-back${sheetOpen ? " sheet" : ""}`} type="button" onClick={() => goHome()}>
          Back to the game {touch ? null : <kbd>Esc</kbd>}
        </button>
      ) : null}

      {/* ---------- tour controls ---------- */}
      {touring ? (
        <div className="tourbar" role="group" aria-label="Guided tour">
          <div className="tour-info">
            <span className="eyebrow">Guided tour</span>
            <b>
              {tourIndex ? `${tourIndex} of ${TOUR_ORDER.length} · ${projects.find((p) => p.id === tourStop)?.name}` : "Walking to the first stop"}
            </b>
            <div className="tour-dots" aria-hidden="true">
              {TOUR_ORDER.map((id, i) => (
                <i key={id} className={i < tourIndex ? "on" : ""} />
              ))}
            </div>
          </div>
          <div className="tour-actions">
            <button type="button" onClick={() => setTourPaused((p) => !p)} aria-pressed={tourPaused}>
              {tourPaused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={() => sceneRef.current?.skipStop()}>
              Next stop
            </button>
            <button type="button" onClick={stopTour}>
              End tour
            </button>
          </div>
        </div>
      ) : null}

      {/* ---------- top bar (phone) ---------- */}
      <div className="mtop" ref={topRef}>
        <div className="brand">
          Abd Alkareem <span>Abu-Alsoud</span>
        </div>
        {live ? (
          <div className="mctl">
            {playing ? null : (
              <button type="button" onClick={touring ? stopTour : () => enter("tour")}>
                {touring ? "End tour" : "Tour"}
              </button>
            )}
            <button type="button" aria-pressed={playing} onClick={playing ? stopPlay : () => enter("play")}>
              {playing ? "Exit game" : "Play"}
            </button>
            {playing ? null : (
              <button type="button" aria-label="Settings" className="icon" onClick={() => setMenu("settings")}>
                <span className="gear" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* ---------- top bar (desktop) ---------- */}
      <header className="topnav">
        <div className="brand">
          Abd Alkareem <span>Abu-Alsoud</span>
        </div>
        <nav aria-label="Sections">
          {tabs.map((t) => (
            <button key={t.id} type="button" aria-pressed={activeTab === t.id} onClick={() => openTab(t.id)}>
              {t.label}
            </button>
          ))}
          <a href={person.cv} download>
            CV
          </a>
        </nav>
        <div className="topctl">
          {live ? (
            <>
              <button type="button" onClick={touring ? stopTour : () => enter("tour")}>
                {touring ? "End tour" : "Guided tour"}
              </button>
              <button type="button" aria-pressed={playing} onClick={playing ? stopPlay : () => enter("play")}>
                {playing ? "Exit game" : "Play"}
              </button>
              <button type="button" aria-pressed={night} onClick={toggleNight}>
                {night ? "Night" : "Dusk"}
              </button>
              <button type="button" className="icon" aria-label="Settings" onClick={() => setMenu("settings")}>
                <span className="gear" aria-hidden="true" />
              </button>
            </>
          ) : (
            <button type="button" className="gold" onClick={() => enter("explore")} disabled={loading} {...warm}>
              {loading ? "Building…" : "Enter the city"}
            </button>
          )}
        </div>
      </header>

      {live && !playing ? (
        <div className="dock" role="group" aria-label="Projects">
          {projects.map((p) => (
            <button key={p.id} type="button" className={selected === p.id ? "on" : ""} onClick={() => pickManual(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* ---------- portfolio panel: works with or without the city ---------- */}
      <aside className={`panel${sheetOpen ? " open" : ""}${view !== "home" ? " show" : ""}`} aria-label="Portfolio" aria-hidden={view === "home"}>
        <div className="bar">
          <div className="brand">Abd Alkareem</div>
          <button className="close" type="button" aria-label="Close" onClick={() => goHome()} tabIndex={view === "home" ? -1 : 0} />
        </div>

        <div className="views">
          <section hidden={view !== "work"}>
            <p className="eyebrow">Selected work · {projects.length} products</p>
            <h2>Products are cities. I build the plumbing.</h2>
            <p className="lede">
              I am a full-stack engineer with three years in production. Each of these runs real customers today.
            </p>
            <ul className="plist">
              {projects.map((p, i) => (
                <li key={p.id}>
                  <button type="button" onClick={() => pickManual(p.id)}>
                    <span className="num mono">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <b>{p.name}</b>
                      <span>{p.short}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!live ? (
              <p className="hint">
                <button type="button" className="link" onClick={() => enter("explore")}>
                  See them as buildings in the 3D city
                </button>
              </p>
            ) : null}
          </section>

          <section hidden={view !== "project"}>
            {current && next ? (
              <>
                <button className="back link" type="button" onClick={() => openTab("work")}>
                  All projects
                </button>
                <p className="eyebrow">{current.kind}</p>
                <h2>{current.name}</h2>
                <p className="vp">{current.text}</p>
                <div className="chips">
                  {current.stack.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <div className="row">
                  <button className="btn gold" type="button" onClick={() => choose(next.id)}>
                    Next: {next.name}
                  </button>
                  <button className="btn" type="button" onClick={() => openTab("contact")}>
                    Discuss this project
                  </button>
                </div>
              </>
            ) : null}
          </section>

          <section hidden={view !== "exp"}>
            <p className="eyebrow">Experience</p>
            <h2>Where I have shipped</h2>
            {jobs.map((j) => (
              <div className="job" key={j.company}>
                <div className="d mono">{j.dates}</div>
                <h3>{j.company}</h3>
                <div className="r">{j.role}</div>
                <ul>
                  {j.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section hidden={view !== "skills"}>
            <p className="eyebrow">Skills</p>
            <h2>What I work with</h2>
            {skills.map((g) => (
              <div className="grp" key={g.name}>
                <b>{g.name}</b>
                <p>{g.items}</p>
              </div>
            ))}
          </section>

          <section hidden={view !== "contact"}>
            <p className="eyebrow">Contact</p>
            <h2>Need an engineer who can own a feature end to end?</h2>
            <p className="lede">
              I am open to remote roles and relocation with product teams building SaaS platforms, CRM systems, fintech tools and
              mobile products.
            </p>
            <span className="addr mono" ref={addrRef}>
              {person.email}
            </span>
            <div className="row">
              <button className="btn gold" type="button" onClick={copyEmail}>
                {copied ? "Copied" : "Copy email"}
              </button>
              <a className="btn" href={person.linkedin}>
                LinkedIn
              </a>
              <a className="btn" href={person.github}>
                GitHub
              </a>
              <a className="btn" href={person.cv} download>
                Download CV
              </a>
            </div>
          </section>
        </div>
      </aside>

      {/* ---------- phone project deck ---------- */}
      {live ? (
        <div className="deck" ref={deckRef} onScroll={onDeckScroll} aria-label="Projects">
          <div
            className={selected === null ? "card on" : "card"}
            ref={(el) => {
              cardRefs.current[0] = el;
            }}
          >
            <p className="eyebrow">Eight products, one city</p>
            <h2>Swipe to visit each building</h2>
            <p>Or tap a building. Drag the city to look around, pinch to zoom.</p>
            <div className="row">
              <button className="btn gold" type="button" onClick={playing ? stopPlay : () => enter("play")}>
                {playing ? "Exit game" : "Play the city"}
              </button>
              <button className="btn" type="button" onClick={touring ? stopTour : () => enter("tour")}>
                {touring ? "End tour" : "Guided tour"}
              </button>
            </div>
          </div>
          {projects.map((p, i) => (
            <div
              key={p.id}
              className={selected === p.id ? "card on" : "card"}
              ref={(el) => {
                cardRefs.current[i + 1] = el;
              }}
            >
              <p className="eyebrow">{p.kind}</p>
              <h3>{p.name}</h3>
              <p>{p.text}</p>
              <div className="chips">
                {p.stack.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <nav className="mnav" aria-label="Sections">
        {tabs.map((t) => (
          <button key={t.id} type="button" aria-pressed={activeTab === t.id} onClick={() => openTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ---------- pause and settings ---------- */}
      {menu === "pause" ? (
        <Dialog title="Paused" labelId="pause-title" onClose={() => setMenu("none")}>
          <div className="menu-actions">
            <button type="button" className="btn gold" data-autofocus onClick={() => setMenu("none")}>
              Resume
            </button>
            <button type="button" className="btn" onClick={startPlayNow}>
              Restart
            </button>
            <button type="button" className="btn" onClick={stopPlay}>
              Exit game
            </button>
          </div>
          <div className="menu-cols">
            <div>
              <h3 className="eyebrow">Controls</h3>
              {touch ? (
                <ul className="keys">
                  <li>Left thumb: move, push to the edge to run</li>
                  <li>Right side: drag to look around</li>
                  <li>Jump: tap twice to flip, hold to glide</li>
                  <li>Dash: a quick burst forward</li>
                  <li>Walk up to a building to enter it</li>
                </ul>
              ) : (
                <ul className="keys">
                  <li>
                    <kbd>W A S D</kbd> or arrows: move
                  </li>
                  <li>
                    <kbd>Shift</kbd> run · <kbd>Q</kbd> dash
                  </li>
                  <li>
                    <kbd>Space</kbd> jump, twice to flip, hold to glide
                  </li>
                  <li>
                    <kbd>E</kbd> enter a building · drag to look
                  </li>
                  <li>
                    <kbd>Esc</kbd> pause and resume
                  </li>
                </ul>
              )}
            </div>
            <div>
              <h3 className="eyebrow">Settings</h3>
              <button type="button" className="toggle" aria-pressed={!muted} onClick={toggleMute}>
                Sound {muted ? "off" : "on"}
              </button>
              <button type="button" className="toggle" aria-pressed={night} onClick={toggleNight}>
                Mood: {night ? "night" : "dusk"}
              </button>
              {qualityChoices}
              <p className="fps mono">{fps ? `${fps} fps` : ""}</p>
            </div>
          </div>
        </Dialog>
      ) : null}

      {menu === "settings" ? (
        <Dialog title="Settings" labelId="settings-title" onClose={() => setMenu("none")} className="narrow">
          <button type="button" className="toggle" data-autofocus aria-pressed={!muted} onClick={toggleMute}>
            Sound {muted ? "off" : "on"}
          </button>
          <button type="button" className="toggle" aria-pressed={night} onClick={toggleNight}>
            Mood: {night ? "night" : "dusk"}
          </button>
          {qualityChoices}
          <p className="fps mono">{fps ? `${fps} fps · ${QUALITY_LABEL[qualityUsed]} preset` : ""}</p>
          <div className="menu-actions">
            <button type="button" className="btn gold" onClick={() => setMenu("none")}>
              Done
            </button>
            <button type="button" className="btn" onClick={leaveCity}>
              Leave the city
            </button>
          </div>
        </Dialog>
      ) : null}

      <div className="foot">Abd Alkareem Abu-Alsoud · Palestine</div>
    </div>
  );
}
