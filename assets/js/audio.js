/** Synthesized Web Audio. The only voice is Airy. Nothing is sampled from another site. */

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

function airy(ctx, dest, t, f, kind) {
  const dur = kind === "tick" ? 0.22 : 0.55;
  tone(ctx, dest, t, f, dur, "sine", kind === "tick" ? 0.045 : 0.07, 0.04);
  tone(ctx, dest, t, f * 2, dur * 0.8, "sine", 0.018, 0.06);
  noise(ctx, dest, t, dur * 0.7, f * 3, 0.7, 0.02, "bandpass");
}

export function createAudio() {
  let ctx = null;
  let master = null;
  let unlocked = false;

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
      const shaped = kind === "tick" ? freq * 1.12 : kind === "turn" ? freq * 0.82 : freq;
      airy(context, master, now, shaped, kind);
    },
  };
}
