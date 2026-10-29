#!/usr/bin/env node
/**
 * Encodes the clips of the home page film for scroll scrubbing.
 *
 *   node scripts/film.mjs [source folder, default film-src]
 *
 * The folder holds the clips in playing order by name (01-hello.mp4, 02-street.mp4, ...) and, if
 * needed, film.config.json: { "beats": [{ "clip": 0, "at": 0.45 }, ...], "focus": 0.5 } with one
 * entry per section of the page, `at` being how far into that clip (0 to 1) the section rests. With
 * no config the twelve-shot plan is assumed: hello, the street, eight projects, plaza, goodbye.
 *
 * Writes public/film/ (a large and a small cut of each clip in WebM and MP4, a first frame of each,
 * the posters) and components/cine/film.json, which switches the page from the live 3D to the film.
 * Needs ffmpeg and ffprobe on the path.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const SECTIONS = 21;
const src = process.argv[2] ?? "film-src";
const out = "public/film";
const KEY = 8; /* a keyframe every third of a second keeps seeking quick in both directions */

const run = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const probe = (file) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

const files = readdirSync(src)
  .filter((f) => /\.(mp4|mov|webm|mkv)$/i.test(f))
  .sort();
if (!files.length) {
  console.error(`No clips in ${src}`);
  process.exit(1);
}
const cfgPath = join(src, "film.config.json");
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
const focus = cfg.focus ?? 0.5;

function defaultBeats(n) {
  if (n === 12) {
    const b = [
      { clip: 0, at: 0.6 },
      { clip: 1, at: 0.55 },
    ];
    for (let i = 0; i < 8; i++) b.push({ clip: 2 + i, at: 0.28 }, { clip: 2 + i, at: 0.88 });
    b.push({ clip: 10, at: 0.35 }, { clip: 10, at: 0.96 }, { clip: 11, at: 0.9 });
    return b;
  }
  /* any other count: the sections spread evenly over the whole film */
  return Array.from({ length: SECTIONS }, (_, i) => {
    const g = (i / (SECTIONS - 1)) * n * 0.999;
    return { clip: Math.floor(g), at: g - Math.floor(g) };
  });
}
const beatsCfg = cfg.beats ?? defaultBeats(files.length);
if (beatsCfg.length !== SECTIONS) {
  console.error(`film.config.json needs ${SECTIONS} beats, one per section; it has ${beatsCfg.length}`);
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const clips = [];
for (const [i, f] of files.entries()) {
  const name = `${String(i + 1).padStart(2, "0")}-${basename(f, extname(f))
    .replace(/^\d+[-_ ]*/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "clip"}`;
  const input = join(src, f);
  console.log(`${f} -> ${name}`);
  const cuts = [
    { suffix: "", width: 1920, vp9: 33, h264: 23 },
    { suffix: "-s", width: 960, vp9: 36, h264: 26 },
  ];
  for (const c of cuts) {
    const vf = `fps=24,scale='min(${c.width},iw)':-2:flags=lanczos,format=yuv420p`;
    run(["-i", input, "-an", "-vf", vf, "-c:v", "libvpx-vp9", "-crf", String(c.vp9), "-b:v", "0", "-g", String(KEY), "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", `${out}/${name}${c.suffix}.webm`]);
    run(["-i", input, "-an", "-vf", vf, "-c:v", "libx264", "-crf", String(c.h264), "-preset", "slow", "-g", String(KEY), "-bf", "0", "-movflags", "+faststart", `${out}/${name}${c.suffix}.mp4`]);
  }
  run(["-i", input, "-frames:v", "1", "-vf", "scale='min(960,iw)':-2", "-quality", "72", `${out}/${name}.webp`]);
  clips.push({ name, duration: Math.round(probe(`${out}/${name}.webm`) * 1000) / 1000, input });
}

const starts = [];
let t = 0;
for (const c of clips) {
  starts.push(t);
  t += c.duration;
}
const beats = beatsCfg.map(({ clip, at }) => {
  const c = clips[clip];
  if (!c) throw new Error(`beat refers to clip ${clip}, there are ${clips.length}`);
  return Math.round((starts[clip] + Math.min(c.duration - 1 / 24, at * c.duration)) * 1000) / 1000;
});

/* the posters are the hero's resting frame, wide and cropped tall around the focus */
const hero = beatsCfg[0];
const heroAt = String(Math.min(clips[hero.clip].duration - 0.05, hero.at * clips[hero.clip].duration));
const heroIn = clips[hero.clip].input;
run(["-ss", heroAt, "-i", heroIn, "-frames:v", "1", "-vf", "scale=1600:900:force_original_aspect_ratio=increase,crop=1600:900", "-quality", "70", `${out}/poster-wide.webp`]);
run(["-ss", heroAt, "-i", heroIn, "-frames:v", "1", "-vf", `scale=-2:1298,crop=600:1298:(iw-600)*${focus}:0`, "-quality", "70", `${out}/poster-tall.webp`]);

const manifest = { clips: clips.map(({ name, duration }) => ({ name, duration })), beats, focus };
writeFileSync("components/cine/film.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`${clips.length} clips, ${t.toFixed(1)} s; manifest written to components/cine/film.json`);
