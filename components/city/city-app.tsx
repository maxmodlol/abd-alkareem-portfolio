"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { jobs, person, skills } from "@/lib/content";
import { projects, type Project } from "@/lib/projects";

import { createCityScene, type BuildingId, type CityScene } from "./city-scene";

function Stick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const knob = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const set = (e: ReactPointerEvent) => {
    const el = area.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const R = r.width / 2;
    let dx = (e.clientX - (r.left + R)) / R;
    let dy = (e.clientY - (r.top + R)) / R;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    if (knob.current) knob.current.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`;
    onMove(dx, -dy);
  };
  const end = () => {
    active.current = false;
    if (knob.current) knob.current.style.transform = "";
    onMove(0, 0);
  };
  return (
    <div
      className="stick"
      ref={area}
      onPointerDown={(e) => {
        active.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* optional */
        }
        set(e);
      }}
      onPointerMove={(e) => {
        if (active.current) set(e);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      aria-hidden="true"
    >
      <div className="knob" ref={knob} />
    </div>
  );
}

const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 100) / 100,
  dur: 2.2 + ((i * 29) % 10) / 8,
  color: ["#f25c54", "#ffc83d", "#58c985", "#2f80c8", "#fff4e3"][i % 5],
}));

type View = "home" | "project" | "exp" | "skills" | "contact";
type Tab = "home" | "exp" | "skills" | "contact";

const tabs: { id: Tab; desktop: string; mobile: string }[] = [
  { id: "home", desktop: "Work", mobile: "Work" },
  { id: "exp", desktop: "Experience", mobile: "Experience" },
  { id: "skills", desktop: "Skills", mobile: "Skills" },
  { id: "contact", desktop: "Contact", mobile: "Contact" },
];

export function CityApp() {
  const [view, setView] = useState<View>("home");
  const [selected, setSelected] = useState<BuildingId | null>(null);
  const [copied, setCopied] = useState(false);
  const [glOk, setGlOk] = useState(true);
  const [night, setNight] = useState(false);
  const [touring, setTouring] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [near, setNear] = useState<BuildingId | null>(null);
  const [coins, setCoins] = useState({ n: 0, total: 0 });
  const [gems, setGems] = useState({ n: 0, total: 0 });
  const [combo, setCombo] = useState({ n: 0, key: 0 });
  const [muted, setMuted] = useState(false);
  const [visited, setVisited] = useState<BuildingId[]>([]);
  const [winSeen, setWinSeen] = useState(false);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const tourTimer = useRef(0);

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

  const stopTour = useCallback(() => {
    window.clearInterval(tourTimer.current);
    sceneRef.current?.stopWalk();
    setTouring(false);
  }, []);

  const stopPlay = useCallback(() => {
    sceneRef.current?.stopPlay();
    setPlaying(false);
    setNear(null);
  }, []);

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

  const openTab = useCallback(
    (t: Tab) => {
      stopTour();
      if (t === "home") {
        goHome();
        return;
      }
      fromDeckRef.current = false;
      setSelected(null);
      setView(t);
    },
    [goHome, stopTour],
  );

  const pickManual = useCallback(
    (id: BuildingId) => {
      stopTour();
      choose(id);
    },
    [choose, stopTour],
  );

  const startPlay = () => {
    stopTour();
    const ok = sceneRef.current?.startPlay({
      onNear: setNear,
      onInteract: (id) => choose(id),
      onCoin: (n, total, c) => {
        setCoins({ n, total });
        if (c >= 2) setCombo({ n: c, key: n });
      },
      onGem: (n, total) => setGems({ n, total }),
    });
    if (!ok) return;
    setVisited([]);
    setWinSeen(false);
    setSelected(null);
    setView("home");
    setPlaying(true);
  };

  const startTour = () => {
    stopPlay();
    window.clearInterval(tourTimer.current);
    setTouring(true);
    const walked = sceneRef.current?.startWalk({
      onStop: (id) => choose(id),
      onLeave: () => goHome(),
    });
    if (walked) return;
    let i = 0;
    const step = () => {
      choose(projects[i % projects.length].id);
      i += 1;
    };
    step();
    tourTimer.current = window.setInterval(step, 5500);
  };

  useEffect(() => () => window.clearInterval(tourTimer.current), []);
  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem("city-muted") === "1");
    } catch {
      /* storage is optional */
    }
  }, []);
  useEffect(() => {
    sceneRef.current?.setMuted(muted);
  }, [muted]);
  useEffect(() => {
    sceneRef.current?.setNight(night ? 1 : 0.22);
  }, [night]);
  useEffect(() => {
    sceneRef.current?.setPanelOpen(view !== "home");
    sceneRef.current?.setPaused(playing && view !== "home");
    sceneRef.current?.setMinimap(playing && view === "home" ? miniRef.current : null);
  }, [view, playing]);
  useEffect(() => {
    sceneRef.current?.setVisited(visited);
  }, [visited]);
  useEffect(() => {
    if (!playing || !selected) return;
    setVisited((v) => (v.includes(selected) ? v : [...v, selected]));
  }, [selected, playing]);

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

  /* Create and tear down the 3D scene. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = createCityScene({
      canvas,
      tagEls: tagRefs.current,
      getMetrics: () => ({
        narrow: window.innerWidth < 760,
        topH: topRef.current?.getBoundingClientRect().bottom ?? 0,
        deckTop: deckRef.current?.getBoundingClientRect().top ?? window.innerHeight,
      }),
      onPick: (id) => pickManual(id),
      reduceMotion: reduce,
    });
    sceneRef.current = scene;
    if (!scene) {
      setGlOk(false);
      return;
    }
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && deckRef.current) {
      observer = new ResizeObserver(() => scene.relayout());
      observer.observe(deckRef.current);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => scene.relayout()).catch(() => undefined);
    }
    return () => {
      observer?.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [pickManual]);

  /* Keep the camera, the selection ring and the phone deck in step with the selection. */
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

  const activeTab: Tab = view === "project" ? "home" : view;
  const sheetOpen = view === "exp" || view === "skills" || view === "contact";
  const current: Project | undefined = projects.find((p) => p.id === selected);
  const next: Project | undefined = current
    ? projects[(projects.indexOf(current) + 1) % projects.length]
    : undefined;

  return (
    <div className={`city${playing ? " playing" : ""}${selected ? " sel" : ""}`} data-gl={glOk ? "on" : "off"}>
      <canvas ref={canvasRef} id="scene" aria-hidden="true" />
      <div className="bars" aria-hidden="true" />
      <div className="intro" aria-hidden="true">
        <span>{person.name}</span>
        <b>Products are cities.</b>
      </div>

      <div>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
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

      {playing && view === "home" ? (
        <div className="hud">
          <div className="hud-card">
            <div className="hud-top">
              <b>Explore the city</b>
              <span>
                {visited.length}/{projects.length}
              </span>
            </div>
            <div className="hud-bar">
              <i style={{ width: `${(visited.length / projects.length) * 100}%` }} />
            </div>
            <div className="hud-row">
              <div className="hud-coins" key={coins.n}>
                <span className="coin" />
                {coins.n}
                <small>/ {coins.total}</small>
              </div>
              <div className="hud-coins hud-gems" key={`g${gems.n}`}>
                <span className="gem" />
                {gems.n}
                <small>/ {gems.total}</small>
              </div>
              <button
                className="hud-mute"
                type="button"
                aria-pressed={muted}
                aria-label={muted ? "Turn sound on" : "Turn sound off"}
                onClick={() => {
                  const m = !muted;
                  setMuted(m);
                  try {
                    window.localStorage.setItem("city-muted", m ? "1" : "0");
                  } catch {
                    /* storage is optional */
                  }
                }}
              >
                {muted ? "Sound off" : "Sound on"}
              </button>
            </div>
          </div>
          {combo.n >= 2 ? (
            <div className="hud-combo" key={combo.key} aria-hidden="true">
              x{combo.n} combo
            </div>
          ) : null}
          <canvas ref={miniRef} className="hud-mini" width={300} height={300} aria-hidden="true" />
          {near ? (
            <button className="hud-act" type="button" onClick={() => choose(near)}>
              Enter {projects.find((p) => p.id === near)?.name} <kbd>E</kbd>
            </button>
          ) : null}
          <p className="hud-help">
            <kbd>WASD</kbd> move · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump, twice to flip, hold to glide ·{" "}
            <kbd>Q</kbd> dash · <kbd>1</kbd> wave · <kbd>2</kbd> dance · <kbd>E</kbd> enter · drag to look around ·
            orange pads launch you to the gems and rooftops
          </p>
          <Stick onMove={(x, y) => sceneRef.current?.setStick(x, y)} />
          <button
            className="hud-jump"
            type="button"
            onPointerDown={(e) => {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* optional */
              }
              sceneRef.current?.setJump(true);
            }}
            onPointerUp={() => sceneRef.current?.setJump(false)}
            onPointerCancel={() => sceneRef.current?.setJump(false)}
          >
            Jump
          </button>
          <button className="hud-dash" type="button" onPointerDown={() => sceneRef.current?.dash()}>
            Dash
          </button>
          <div className="hud-emotes">
            <button type="button" onClick={() => sceneRef.current?.emote("wave")}>
              Wave
            </button>
            <button type="button" onClick={() => sceneRef.current?.emote("dance")}>
              Dance
            </button>
          </div>
        </div>
      ) : null}

      {playing && view === "home" && visited.length === projects.length && !winSeen ? (
        <div className="hud-win" role="dialog" aria-label="City explored">
          <div className="confetti" aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}
              />
            ))}
          </div>
          <h2>City explored!</h2>
          <p>
            You visited all {projects.length} projects, collected {coins.n} of {coins.total} coins and found {gems.n} of{" "}
            {gems.total} gems.
          </p>
          <div className="row">
            <button
              className="pill"
              type="button"
              onClick={() => {
                setWinSeen(true);
                openTab("contact");
              }}
            >
              Say hello
            </button>
            <button className="pill alt" type="button" onClick={() => setWinSeen(true)}>
              Keep exploring
            </button>
          </div>
        </div>
      ) : null}

      <div className="mtop" ref={topRef}>
        <div className="brand">{person.name}</div>
        <div className="mstat">
          <span className="dot" />
          Open to remote and relocation
        </div>
        <div className="mctl">
          <button type="button" onClick={touring ? stopTour : startTour}>
            {touring ? "Stop" : "Tour"}
          </button>
          <button type="button" aria-pressed={playing} onClick={playing ? stopPlay : startPlay}>
            {playing ? "Exit" : "Play"}
          </button>
          <button type="button" aria-pressed={night} aria-label="Toggle night" onClick={() => setNight((v) => !v)}>
            {night ? "Dusk" : "Night"}
          </button>
        </div>
      </div>

      <header className="topnav">
        <div className="brand">{person.name}</div>
        <nav aria-label="Sections">
          {tabs.map((t) => (
            <button key={t.id} type="button" aria-pressed={activeTab === t.id} onClick={() => openTab(t.id)}>
              {t.desktop}
            </button>
          ))}
        </nav>
        <div className="topctl">
          <button type="button" onClick={touring ? stopTour : startTour}>
            {touring ? "Stop tour" : "Guided tour"}
          </button>
          <button type="button" aria-pressed={playing} onClick={playing ? stopPlay : startPlay}>
            {playing ? "Exit game" : "Play game"}
          </button>
          <button type="button" aria-pressed={night} onClick={() => setNight((v) => !v)}>
            {night ? "Dusk" : "Night"}
          </button>
        </div>
      </header>

      <div className="dock" role="group" aria-label="Projects">
        {projects.map((p) => (
          <button key={p.id} type="button" className={selected === p.id ? "on" : ""} onClick={() => pickManual(p.id)}>
            {p.name}
          </button>
        ))}
      </div>

      <aside
        className={`panel${sheetOpen ? " open" : ""}${view !== "home" ? " show" : ""}`}
        aria-label="Portfolio"
      >
        <div className="bar">
          <div className="brand">{person.name}</div>
          <button className="close" type="button" aria-label="Close" onClick={() => goHome()} />
        </div>
        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={activeTab === t.id}
              onClick={() => openTab(t.id)}
            >
              {t.desktop}
            </button>
          ))}
        </div>

        <div className="views">
          <section hidden={view !== "home"}>
            <h1>Products are cities. I build the plumbing.</h1>
            <p className="lede">
              I am a full-stack engineer with three years in production. This small city is my work: every
              building is a product, every road is an API.
            </p>
            <div className="status">
              <span className="dot" />
              Open to remote roles and relocation
            </div>
            <ul className="plist">
              {projects.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => pickManual(p.id)}>
                    <b>{p.name}</b>
                    <span>{p.short}</span>
                  </button>
                </li>
              ))}
            </ul>
<div className="ctl">
              <button className="pill" type="button" onClick={touring ? stopTour : startTour}>
                {touring ? "Stop tour" : "Guided tour"}
              </button>
              <button className="pill alt" type="button" onClick={playing ? stopPlay : startPlay}>
                {playing ? "Exit game" : "Play the city"}
              </button>
              <button className="pill alt" type="button" aria-pressed={night} onClick={() => setNight((v) => !v)}>
                {night ? "Switch to dusk" : "Switch to night"}
              </button>
            </div>
            <p className="hint">Drag to turn the island. Click a building or tag to fly in.</p>
          </section>

          <section hidden={view !== "project"}>
            {current && next ? (
              <>
                <button className="back" type="button" onClick={() => goHome()}>
                  All projects
                </button>
                <h2>{current.name}</h2>
                <p className="kind">{current.kind}</p>
                <p className="vp">{current.text}</p>
                <div className="chips">
                  {current.stack.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <div className="row">
                  <button className="pill" type="button" onClick={() => choose(next.id)}>
                    Next: {next.name}
                  </button>
                  <button className="pill alt" type="button" onClick={() => openTab("contact")}>
                    Discuss this project
                  </button>
                </div>
              </>
            ) : null}
          </section>

          <section hidden={view !== "exp"}>
            <h2 className="mh">Experience</h2>
            {jobs.map((j) => (
              <div className="job" key={j.company}>
                <div className="d">{j.dates}</div>
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
            <h2 className="mh">Skills</h2>
            {skills.map((g) => (
              <div className="grp" key={g.name}>
                <b>{g.name}</b>
                <p>{g.items}</p>
              </div>
            ))}
          </section>

          <section hidden={view !== "contact"}>
            <h2>Need an engineer who can own a feature end to end?</h2>
            <p className="lede">
              I am open to remote roles and relocation with product teams building SaaS platforms, CRM systems,
              fintech tools and mobile products.
            </p>
            <span className="addr" ref={addrRef}>
              {person.email}
            </span>
            <div className="row">
              <button className="pill" type="button" onClick={copyEmail}>
                {copied ? "Copied" : "Copy email"}
              </button>
              <a className="pill alt" href={person.linkedin}>
                LinkedIn
              </a>
              <a className="pill alt" href={person.github}>
                GitHub
              </a>
              <a className="pill alt" href={person.cv} download>
                Download CV
              </a>
            </div>
          </section>
        </div>
      </aside>

      <div className="deck" ref={deckRef} onScroll={onDeckScroll} aria-label="Projects">
        <div
          className={selected === null ? "card on" : "card"}
          ref={(el) => {
            cardRefs.current[0] = el;
          }}
        >
          <h2>Products are cities. I build the plumbing.</h2>
          <p>Swipe to visit each building, or tap one on the island. Drag to look around.</p>
        </div>
        {projects.map((p, i) => (
          <div
            key={p.id}
            className={selected === p.id ? "card on" : "card"}
            ref={(el) => {
              cardRefs.current[i + 1] = el;
            }}
          >
            <h3>{p.name}</h3>
            <div className="kindline">{p.kind}</div>
            <p>{p.text}</p>
            <div className="chips">
              {p.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <nav className="mnav" aria-label="Sections">
        {tabs.map((t) => (
          <button key={t.id} type="button" aria-pressed={activeTab === t.id} onClick={() => openTab(t.id)}>
            {t.mobile}
          </button>
        ))}
      </nav>

      <div className="foot">{person.name}, from Palestine</div>
    </div>
  );
}
