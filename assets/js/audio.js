/** Synthesized Web Audio. Nothing is sampled from another site. */

const THEMES = [
  "airy",
  "blend",
  "blendchord",
  "bowl",
  "breath",
  "chimes",
  "droplets",
  "felt",
  "glide",
  "hum",
  "kalimba",
  "recipe",
  "twinkle",
];

function tone(ctx, dest, when, freq, dur, type, peak, attack = 0.012) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, freq), when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0008, peak), when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(dur, attack + 0.03));
  osc.connect(gain).connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.06);
}

function slide(ctx, dest, when, from, to, dur, type, peak) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, from), when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), when + dur);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.018);
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
  airy(ctx, dest, t, f, kind) {
    const dur = kind === "tick" ? 0.22 : 0.55;
    tone(ctx, dest, t, f, dur, "sine", kind === "tick" ? 0.045 : 0.07, 0.04);
    tone(ctx, dest, t, f * 2, dur * 0.8, "sine", 0.018, 0.06);
    noise(ctx, dest, t, dur * 0.7, f * 3, 0.7, 0.02, "bandpass");
  },
  blend(ctx, dest, t, f) {
    tone(ctx, dest, t, f, 0.5, "sine", 0.06, 0.03);
    tone(ctx, dest, t + 0.04, f * 1.5, 0.46, "sine", 0.035, 0.05);
  },
  blendchord(ctx, dest, t, f) {
    tone(ctx, dest, t, f, 0.7, "sine", 0.05, 0.03);
    tone(ctx, dest, t, f * 1.25, 0.66, "sine", 0.032, 0.04);
    tone(ctx, dest, t + 0.02, f * 1.5, 0.6, "triangle", 0.02, 0.05);
  },
  bowl(ctx, dest, t, f) {
    tone(ctx, dest, t, f, 1.35, "sine", 0.06, 0.01);
    tone(ctx, dest, t, f * 2.76, 1.1, "sine", 0.018, 0.008);
    tone(ctx, dest, t, f * 5.4, 0.55, "sine", 0.006, 0.004);
  },
  breath(ctx, dest, t, f, kind) {
    noise(ctx, dest, t, kind === "tick" ? 0.16 : 0.42, f * 1.6, 0.8, 0.055, "bandpass");
    tone(ctx, dest, t, f, 0.36, "sine", 0.02, 0.08);
  },
  chimes(ctx, dest, t, f) {
    tone(ctx, dest, t, f * 2, 0.9, "sine", 0.045, 0.004);
    tone(ctx, dest, t + 0.03, f * 2.52, 0.75, "sine", 0.028, 0.004);
    tone(ctx, dest, t + 0.07, f * 3.76, 0.6, "triangle", 0.016, 0.003);
  },
  droplets(ctx, dest, t, f) {
    slide(ctx, dest, t, f * 3.1, f * 1.15, 0.22, "sine", 0.06);
    slide(ctx, dest, t + 0.08, f * 3.6, f * 1.4, 0.18, "sine", 0.035);
  },
  felt(ctx, dest, t, f) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, t);
    filter.connect(dest);
    tone(ctx, filter, t, f, 0.42, "triangle", 0.08, 0.008);
    tone(ctx, filter, t, f * 2, 0.2, "sine", 0.02, 0.006);
  },
  glide(ctx, dest, t, f) {
    slide(ctx, dest, t, f, f * 1.335, 0.38, "sine", 0.06);
    tone(ctx, dest, t, f * 2, 0.28, "triangle", 0.012, 0.02);
  },
  hum(ctx, dest, t, f) {
    tone(ctx, dest, t, f * 0.5, 0.7, "sine", 0.07, 0.06);
    tone(ctx, dest, t, f, 0.55, "sine", 0.02, 0.08);
  },
  kalimba(ctx, dest, t, f) {
    tone(ctx, dest, t, f * 2, 0.45, "sine", 0.07, 0.004);
    tone(ctx, dest, t, f * 2 * 2.9, 0.22, "triangle", 0.02, 0.003);
    tone(ctx, dest, t, f * 4, 0.12, "sine", 0.008, 0.002);
  },
  recipe(ctx, dest, t, f) {
    tone(ctx, dest, t, f, 0.16, "triangle", 0.055, 0.006);
    tone(ctx, dest, t + 0.09, f * 1.5, 0.16, "triangle", 0.045, 0.006);
    tone(ctx, dest, t + 0.18, f * 2, 0.22, "sine", 0.04, 0.008);
  },
  twinkle(ctx, dest, t, f) {
    tone(ctx, dest, t, f * 3, 0.16, "sine", 0.04, 0.003);
    tone(ctx, dest, t + 0.045, f * 4.02, 0.14, "sine", 0.03, 0.003);
    tone(ctx, dest, t + 0.09, f * 5.1, 0.12, "triangle", 0.016, 0.002);
  },
};

export function createAudio() {
  let ctx = null;
  let master = null;
  let unlocked = false;
  let theme = "airy";

  function ensure() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 10;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  return {
    themes: THEMES,
    get theme() { return theme; },
    set theme(value) {
      if (VOICES[value]) theme = value;
    },
    unlock() {
      unlocked = true;
      ensure();
    },
    play(kind = "tap", tNorm = 0.45) {
      if (!unlocked) return;
      const context = ensure();
      if (!context || !master) return;
      const now = context.currentTime + 0.005;
      const freq = 262 * 2 ** (Math.min(1, Math.max(0, tNorm)) * 0.6);
      const voice = VOICES[theme] || VOICES.airy;
      const shaped = kind === "tick" ? freq * 1.12 : kind === "turn" ? freq * 0.82 : freq;
      voice(context, master, now, shaped, kind);
    },
  };
}
