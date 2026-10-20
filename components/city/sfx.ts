export type Sound = "coin" | "jump" | "double" | "land" | "pad" | "dash" | "hit" | "gem" | "enter" | "win" | "step";

/**
 * Tiny synthesised sound effects, so the game needs no audio files.
 * The context is created on the first sound, which always follows a click or key press.
 */
export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.32;
      this.out.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Call from a user gesture so browsers let the audio start. */
  unlock(): void {
    const c = this.ensure();
    if (c && c.state === "suspended") c.resume().catch(() => undefined);
  }

  private tone(type: OscillatorType, f0: number, f1: number, at: number, dur: number, vol: number): void {
    const c = this.ctx;
    if (!c || !this.out) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(this.out);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  private hiss(at: number, dur: number, vol: number, f0: number, f1: number): void {
    const c = this.ctx;
    if (!c || !this.out || !this.noise) return;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, at);
    f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.out);
    s.start(at);
    s.stop(at + dur + 0.02);
  }

  /** combo raises the pitch of chained coins. */
  play(s: Sound, combo = 0): void {
    if (this.muted) return;
    const c = this.ensure();
    if (!c || c.state !== "running") return;
    const t = c.currentTime;
    switch (s) {
      case "coin": {
        const k = Math.pow(2, Math.min(combo, 12) / 12);
        this.tone("square", 988 * k, 988 * k, t, 0.06, 0.12);
        this.tone("square", 1319 * k, 1319 * k, t + 0.06, 0.14, 0.12);
        break;
      }
      case "jump":
        this.tone("square", 240, 620, t, 0.16, 0.1);
        break;
      case "double":
        this.tone("square", 420, 980, t, 0.14, 0.09);
        this.tone("triangle", 840, 1600, t + 0.05, 0.18, 0.08);
        break;
      case "land":
        this.tone("sine", 140, 50, t, 0.14, 0.3);
        this.hiss(t, 0.12, 0.12, 900, 300);
        break;
      case "step":
        this.hiss(t, 0.05, 0.03, 1400, 700);
        break;
      case "pad":
        this.tone("sawtooth", 120, 900, t, 0.45, 0.09);
        this.tone("square", 300, 1200, t + 0.05, 0.4, 0.06);
        this.hiss(t, 0.5, 0.08, 400, 3000);
        break;
      case "dash":
        this.hiss(t, 0.28, 0.2, 2500, 500);
        break;
      case "hit":
        this.tone("sawtooth", 300, 60, t, 0.35, 0.16);
        this.hiss(t, 0.2, 0.15, 1200, 200);
        break;
      case "gem":
        [0, 4, 7, 12, 16].forEach((n, i) => this.tone("triangle", 660 * Math.pow(2, n / 12), 660 * Math.pow(2, n / 12), t + i * 0.06, 0.25, 0.1));
        break;
      case "enter":
        this.tone("triangle", 520, 780, t, 0.12, 0.1);
        this.tone("triangle", 780, 1040, t + 0.1, 0.16, 0.1);
        break;
      case "win":
        [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => this.tone("square", 523 * Math.pow(2, n / 12), 523 * Math.pow(2, n / 12), t + i * 0.09, 0.2, 0.08));
        break;
    }
  }

  dispose(): void {
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
