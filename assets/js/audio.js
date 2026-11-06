/** Original Web Audio textures. Nothing is sampled from another site. */

const THEMES = ["brisa", "vidro", "madeira", "gota", "sino", "sopro", "zumbido", "corda", "faisca"];

export const THEME_LABELS = {
  brisa: { pt: "Brisa", en: "Breeze" },
  vidro: { pt: "Vidro", en: "Glass" },
  madeira: { pt: "Madeira", en: "Wood" },
  gota: { pt: "Gota", en: "Drop" },
  sino: { pt: "Sino", en: "Bell" },
  sopro: { pt: "Sopro", en: "Breath" },
  zumbido: { pt: "Zumbido", en: "Hum" },
  corda: { pt: "Corda", en: "String" },
  faisca: { pt: "Faísca", en: "Spark" },
};

function tone(ctx, dest, when, freq, dur, type, peak, attack = 0.01) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, freq), when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0008, peak), when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(dur, attack + 0.02));
  osc.connect(gain).connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.05);
  return osc;
}

function slide(ctx, dest, when, from, to, dur, type, peak) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), when + dur);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain).connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

function noise(ctx, dest, when, dur, freq, q, peak, filterType = "bandpass") {
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, when);
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(filter).connect(gain).connect(dest);
  src.start(when);
  src.stop(when + dur + 0.02);
}

const VOICES = {
  brisa(ctx, dest, t, f, kind) {
    const dur = kind === "tick" ? 0.16 : 0.42;
    tone(ctx, dest, t, f, dur, "sine", kind === "tick" ? 0.06 : 0.09, 0.02);
    tone(ctx, dest, t, f * 2, dur * 0.8, "sine", 0.025, 0.03);
  },
  vidro(ctx, dest, t, f) {
    tone(ctx, dest, t, f * 2, 0.9, "sine", 0.07, 0.004);
    tone(ctx, dest, t, f * 3.02, 0.7, "sine", 0.03, 0.004);
    tone(ctx, dest, t, f * 4.2, 0.45, "triangle", 0.012, 0.002);
  },
  madeira(ctx, dest, t, f, kind) {
    noise(ctx, dest, t, kind === "tick" ? 0.045 : 0.07, 680, 0.8, 0.12, "bandpass");
    tone(ctx, dest, t, f * 0.5, 0.12, "sine", 0.05, 0.002);
  },
  gota(ctx, dest, t, f) {
    slide(ctx, dest, t, f * 3.2, f * 0.85, 0.28, "sine", 0.08);
    tone(ctx, dest, t, f * 1.5, 0.18, "sine", 0.02, 0.01);
  },
  sino(ctx, dest, t, f) {
    tone(ctx, dest, t, f * 2, 0.85, "sine", 0.06, 0.003);
    tone(ctx, dest, t, f * 2 * 1.498, 0.7, "sine", 0.035, 0.003);
    tone(ctx, dest, t, f * 2.76, 0.4, "triangle", 0.015, 0.002);
  },
  sopro(ctx, dest, t, f, kind) {
    noise(ctx, dest, t, kind === "tick" ? 0.12 : 0.36, f * 2, 1.4, 0.07, "bandpass");
    tone(ctx, dest, t, f, 0.3, "sine", 0.02, 0.06);
  },
  zumbido(ctx, dest, t, f) {
    tone(ctx, dest, t, f * 0.5, 0.55, "sine", 0.07, 0.04);
    tone(ctx, dest, t, f, 0.4, "triangle", 0.02, 0.05);
  },
  corda(ctx, dest, t, f) {
    noise(ctx, dest, t, 0.03, 1800, 0.6, 0.08, "highpass");
    tone(ctx, dest, t, f, 0.32, "triangle", 0.09, 0.003);
    tone(ctx, dest, t, f * 2, 0.18, "sine", 0.02, 0.003);
  },
  faisca(ctx, dest, t, f) {
    tone(ctx, dest, t, f * 3, 0.12, "sine", 0.05, 0.002);
    tone(ctx, dest, t + 0.03, f * 4.1, 0.1, "sine", 0.035, 0.002);
    tone(ctx, dest, t + 0.06, f * 5.3, 0.09, "triangle", 0.02, 0.002);
  },
};

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = true;
  let theme = "brisa";

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.2;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 8;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  return {
    themes: THEMES,
    get muted() { return muted; },
    get theme() { return theme; },
    set theme(value) {
      if (VOICES[value]) theme = value;
    },
    setMuted(next) {
      muted = next;
      if (!muted) ensure();
    },
    unlock() {
      if (!muted) ensure();
    },
    play(kind = "tap", tNorm = 0.45) {
      if (muted) return;
      const context = ensure();
      if (!context || !master) return;
      const now = context.currentTime + 0.005;
      const freq = 196 * 2 ** (Math.min(1, Math.max(0, tNorm)) * 0.85);
      const voice = VOICES[theme] || VOICES.brisa;
      const shaped = kind === "tick" ? freq : kind === "turn" ? freq * 0.75 : freq;
      voice(context, master, now, shaped, kind);
    },
  };
}
