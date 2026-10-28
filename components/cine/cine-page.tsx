"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { jobs, person, skills } from "@/lib/content";
import { projects } from "@/lib/projects";

import type { Cine, Quality } from "./scene";

/**
 * The home page: one continuous camera move through a city, driven by the scroll. The text of the
 * portfolio is ordinary HTML in sections of the page, so it is readable, searchable and usable with
 * or without the 3D; the city behind it starts as a still and comes alive on the first scroll, key
 * press or pointer move, so loading it never slows down the first paint.
 */

type Stage = "idle" | "loading" | "live" | "failed" | "nogl";

let sceneModule: Promise<typeof import("./scene")> | null = null;
function loadSceneModule() {
  sceneModule ??= import("./scene").catch((e) => {
    sceneModule = null;
    throw e;
  });
  return sceneModule;
}

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

/** A first guess at the preset; the governor inside the scene lowers the resolution if frames run long. */
function autoQuality(): Quality | null {
  const gpu = rendererName();
  if (gpu === "none") return null;
  const capture = (globalThis as { __cityCapture?: boolean }).__cityCapture === true;
  if (capture) return (globalThis as { __cineQuality?: Quality }).__cineQuality ?? "high";
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) return "low";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.screen.width, window.screen.height) < 820;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if (coarse && small) return "low";
  if (coarse) return "balanced";
  if ((mem !== undefined && mem <= 4) || (cores !== undefined && cores <= 4)) return "balanced";
  if (/intel|mali|adreno|powervr/i.test(gpu) && !/arc/i.test(gpu)) return "balanced";
  return "high";
}

const CHAPTERS = [
  "Arrival",
  "Downtown",
  "Between the towers",
  "The avenue",
  "The tower",
  "The lobby",
  ...projects.map((p) => p.name),
  "Experience",
  "Skills",
  "Contact",
];
const WORK = 5;
const EXPERIENCE = 14;
const SKILLS = 15;
const CONTACT = 16;

export function CinePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Cine | null>(null);
  const beatRefs = useRef<(HTMLElement | null)[]>([]);
  const progressRef = useRef(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [load, setLoad] = useState({ done: 0, total: 1, label: "" });
  const [beat, setBeat] = useState(0);
  const [copied, setCopied] = useState(false);
  const [gen, setGen] = useState(0);

  /* scroll position to progress: each beat is reached when its section is centred in the window */
  const anchors = useCallback(() => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return beatRefs.current.map((el, i, all) => {
      if (!el) return 0;
      if (i === 0) return 0;
      if (i === all.length - 1) return max;
      const top = el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2;
      return Math.min(max, Math.max(0, top));
    });
  }, []);

  const measure = useCallback(() => {
    const a = anchors();
    const y = window.scrollY;
    let i = 0;
    while (i < a.length - 2 && y > a[i + 1]) i++;
    const f = a[i + 1] > a[i] ? Math.min(1, Math.max(0, (y - a[i]) / (a[i + 1] - a[i]))) : 0;
    const p = (i + f) / (a.length - 1);
    progressRef.current = p;
    sceneRef.current?.setProgress(p);
    document.documentElement.style.setProperty("--p", p.toFixed(4));
    const b = Math.round(p * (a.length - 1));
    setBeat((prev) => (prev === b ? prev : b));
  }, [anchors]);

  useEffect(() => {
    measure();
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        measure();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [measure]);

  /* ---------- the 3D city ---------- */
  const start = useCallback(() => {
    if (sceneRef.current || stage === "loading" || stage === "nogl") return;
    setStage("loading");
    setGen((g) => g + 1);
  }, [stage]);

  useEffect(() => {
    if (!gen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const quality = autoQuality();
    if (!quality) {
      setStage("nogl");
      return;
    }
    /* the poster capture script asks for still frames: no easing, no drift */
    const capture = (globalThis as { __cityCapture?: boolean }).__cityCapture === true;
    const reduce = capture || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    loadSceneModule()
      .then(async ({ createCine }) => {
        if (cancelled) return;
        const scene = await createCine({
          canvas,
          quality,
          reduceMotion: reduce,
          onProgress: (done, total, label) => !cancelled && setLoad({ done, total, label }),
          onContextLost: () => {
            sceneRef.current?.dispose();
            sceneRef.current = null;
            setStage("failed");
          },
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
        scene.setProgress(progressRef.current);
        setStage("live");
      })
      .catch(() => !cancelled && setStage("failed"));
    return () => {
      cancelled = true;
    };
  }, [gen]);

  useEffect(
    () => () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    },
    [],
  );

  /* the city loads on the first sign of a person: a scroll, a key, a touch or a moving pointer */
  useEffect(() => {
    if (stage !== "idle") return;
    const go = () => start();
    const events = ["scroll", "wheel", "touchstart", "pointermove", "keydown"] as const;
    for (const e of events) window.addEventListener(e, go, { passive: true, once: true });
    return () => {
      for (const e of events) window.removeEventListener(e, go);
    };
  }, [stage, start]);

  const goTo = (i: number) => {
    const a = anchors();
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: a[i] ?? 0, behavior: smooth ? "smooth" : "auto" });
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(person.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* the address is on screen to copy by hand */
    }
  };

  const pct = Math.round((load.done / Math.max(1, load.total)) * 100);
  const reg = (i: number) => (el: HTMLElement | null) => {
    beatRefs.current[i] = el;
  };

  return (
    <div className={`cine stage-${stage}`}>
      <picture className="cine-poster">
        <source media="(max-width: 759px)" srcSet="/cine-tall.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cine-wide.webp" alt="" fetchPriority="high" decoding="async" width={1600} height={900} />
      </picture>
      <canvas key={gen} ref={canvasRef} className="cine-canvas" aria-hidden="true" />
      <div className="cine-shade" aria-hidden="true" />

      <header className="cine-top">
        <button type="button" className="cine-brand" onClick={() => goTo(0)}>
          Abd Alkareem Abu-Alsoud
        </button>
        <nav aria-label="Sections">
          <button type="button" aria-current={beat >= WORK && beat < EXPERIENCE ? "true" : undefined} onClick={() => goTo(WORK)}>
            Work
          </button>
          <button type="button" aria-current={beat === EXPERIENCE ? "true" : undefined} onClick={() => goTo(EXPERIENCE)}>
            Experience
          </button>
          <button type="button" aria-current={beat === SKILLS ? "true" : undefined} onClick={() => goTo(SKILLS)}>
            Skills
          </button>
          <button type="button" aria-current={beat === CONTACT ? "true" : undefined} onClick={() => goTo(CONTACT)}>
            Contact
          </button>
          <a href={person.cv} download>
            CV
          </a>
        </nav>
      </header>
      <div className="cine-rail" aria-hidden="true">
        <i />
      </div>
      <p className="cine-chapter mono" aria-hidden="true">
        {String(beat + 1).padStart(2, "0")} <span>/ {CHAPTERS.length}</span> &nbsp;{CHAPTERS[beat]}
      </p>

      {stage === "loading" ? (
        <div className="cine-load" role="status" aria-live="polite">
          <span>{load.label || "Loading the city"}</span>
          <span className="mono">{load.done ? `${pct}%` : ""}</span>
          <i style={{ width: `${load.done ? pct : 4}%` }} />
        </div>
      ) : null}
      {stage === "failed" ? (
        <div className="cine-load err" role="alert">
          <span>The 3D city could not load.</span>
          <button type="button" onClick={() => start()}>
            Try again
          </button>
        </div>
      ) : null}

      <main className="cine-story">
        <section ref={reg(0)} className="c-beat c-hero">
          <p className="c-kicker">Full-stack software engineer · Palestine · remote</p>
          <h1>
            Abd Alkareem
            <br />
            Abu-Alsoud
          </h1>
          <p className="c-lead">I build the systems products run on: SaaS platforms, CRMs, APIs and mobile apps.</p>
          <p className="c-cue mono">Scroll to enter the city</p>
        </section>

        <section ref={reg(1)} className="c-beat left">
          <p className="c-kicker">Three years in production</p>
          <h2>Every tower in this city is a product someone depends on.</h2>
          <p>
            I lean towards the backend: data models, APIs, integrations and the infrastructure that keeps them up. I build
            the front end too, from Next.js dashboards to Flutter apps.
          </p>
        </section>

        <section ref={reg(2)} className="c-beat right">
          <p className="c-kicker">How I work</p>
          <h2>Quiet systems that keep working.</h2>
          <p>
            Multi-tenant platforms, webhook pipelines, single sign-on and caching that keeps pages fast. The kind of work
            nobody sees when it is done well.
          </p>
        </section>

        <section ref={reg(3)} className="c-beat left">
          <p className="c-kicker">At the end of the avenue</p>
          <h2>The work is in that tower.</h2>
          <dl className="c-stats">
            <div>
              <dt>Products</dt>
              <dd>{projects.length}</dd>
            </div>
            <div>
              <dt>Companies</dt>
              <dd>{jobs.length}</dd>
            </div>
            <div>
              <dt>Years</dt>
              <dd>3</dd>
            </div>
          </dl>
        </section>

        <section ref={reg(4)} className="c-beat center">
          <h2>Come inside.</h2>
        </section>

        <section ref={reg(5)} className="c-beat center" id="work">
          <p className="c-kicker">Selected work</p>
          <h2>Eight products, one on every screen.</h2>
        </section>

        {projects.map((p, i) => (
          <section key={p.id} ref={reg(6 + i)} className={`c-beat project ${i % 2 === 0 ? "right" : "left"}`}>
            <article className="c-card">
              <p className="c-kicker mono">
                {String(i + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")} · {p.kind}
              </p>
              <h2>{p.name}</h2>
              <p>{p.text}</p>
              <ul className="c-chips">
                {p.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </article>
          </section>
        ))}

        <section ref={reg(EXPERIENCE)} className="c-beat left long" id="experience">
          <article className="c-card wide">
            <p className="c-kicker">Experience</p>
            <h2>Where the work was done</h2>
            <ol className="c-jobs">
              {jobs.map((j) => (
                <li key={j.company + j.dates}>
                  <p className="mono c-when">{j.dates}</p>
                  <h3>{j.company}</h3>
                  <p className="c-role">{j.role}</p>
                  <ul>
                    {j.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section ref={reg(SKILLS)} className="c-beat right" id="skills">
          <article className="c-card">
            <p className="c-kicker">Skills</p>
            <h2>The toolkit</h2>
            <dl className="c-skills">
              {skills.map((s) => (
                <div key={s.name}>
                  <dt>{s.name}</dt>
                  <dd>{s.items}</dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <section ref={reg(CONTACT)} className="c-beat center c-contact" id="contact">
          <p className="c-kicker">Contact</p>
          <h2>Let&rsquo;s build the next one.</h2>
          <p className="c-mail">
            <a href={`mailto:${person.email}`}>{person.email}</a>
          </p>
          <div className="c-actions">
            <button type="button" className="btn primary" onClick={copyEmail}>
              {copied ? "Copied" : "Copy email"}
            </button>
            <a className="btn" href={person.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a className="btn" href={person.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="btn" href={person.cv} download>
              Download CV
            </a>
          </div>
          <p className="c-aside">
            <a href="/play">Play the mini game</a>
          </p>
        </section>
      </main>
    </div>
  );
}
