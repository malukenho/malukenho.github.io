/** Time-of-day sky. Colors are original stops in the same calm register as a daylight gradient. */

const STAGES = [
  { h: 0, top: "#020304", mid: "#040506", bottom: "#07080b" },
  { h: 3.2, top: "#06080d", mid: "#0b0e16", bottom: "#0f1219" },
  { h: 5.0, top: "#0a0e18", mid: "#121826", bottom: "#171c27" },
  { h: 6.15, top: "#0d2554", mid: "#1c3e78", bottom: "#2c5598" },
  { h: 7.05, top: "#56689f", mid: "#c4848a", bottom: "#ee9f7e" },
  { h: 8.15, top: "#8fb1d6", mid: "#e4c9a4", bottom: "#f4c07c" },
  { h: 10, top: "#b1cced", mid: "#d5dfec", bottom: "#faf2e9" },
  { h: 16.4, top: "#b1cced", mid: "#d5dfec", bottom: "#faf2e9" },
  { h: 17.7, top: "#8fb1d6", mid: "#e7c49a", bottom: "#f4c07c" },
  { h: 19.0, top: "#56689f", mid: "#c47d78", bottom: "#ee9f7e" },
  { h: 20.05, top: "#0d2554", mid: "#1a3f7c", bottom: "#2c5598" },
  { h: 21.15, top: "#0a0e18", mid: "#10151f", bottom: "#171c27" },
  { h: 22.6, top: "#06080d", mid: "#0b0e16", bottom: "#0f1219" },
  { h: 24, top: "#020304", mid: "#040506", bottom: "#07080b" },
];

const DAY_INK = {
  text: "#032242",
  secondary: "#54749a",
  faint: "#7fa1c9",
  link: "#2f5f93",
  border: "#dfe5ec",
  surface: "#f6f9fd",
  pill: "#234164",
  accent: "#7d4600",
};

const NIGHT_INK = {
  text: "#e8eef6",
  secondary: "#9aabc0",
  faint: "#6d7c90",
  link: "#b7cbe4",
  border: "#2a3342",
  surface: "#141a22",
  pill: "#d5deea",
  accent: "#ffb15a",
};

function hexToLin(hex) {
  return [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}

function linToHex(rgb) {
  const s = rgb.map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  });
  return "#" + s.join("");
}

function mix(a, b, t) {
  const A = hexToLin(a);
  const B = hexToLin(b);
  return linToHex(A.map((v, i) => v + (B[i] - v) * t));
}

function luma(hex) {
  const [r, g, b] = hexToLin(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function nightAmount(hour) {
  const h = ((hour % 24) + 24) % 24;
  const smooth = (t) => t * t * (3 - 2 * t);
  if (h >= 9 && h <= 16.5) return 0;
  if (h >= 20.6 || h <= 4.8) return 1;
  if (h > 16.5 && h < 20.6) return smooth((h - 16.5) / 4.1);
  return 1 - smooth((h - 4.8) / 4.2);
}

export function skyAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < STAGES.length - 2 && STAGES[i + 1].h <= h) i++;
  const a = STAGES[i];
  const b = STAGES[i + 1];
  const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
  const top = mix(a.top, b.top, t);
  const mid = mix(a.mid, b.mid, t);
  const bottom = mix(a.bottom, b.bottom, t);
  const night = nightAmount(h);
  const inkT = luma(mid) < 0.22 ? 1 : luma(mid) > 0.45 ? 0 : (0.45 - luma(mid)) / 0.23;
  const ink = {};
  for (const key of Object.keys(DAY_INK)) ink[key] = mix(DAY_INK[key], NIGHT_INK[key], inkT);
  return { top, mid, bottom, night, ink, hour: h };
}

export function applySky(root, sky) {
  const s = root.style;
  s.setProperty("--sky-top", sky.top);
  s.setProperty("--sky-mid", sky.mid);
  s.setProperty("--sky-bottom", sky.bottom);
  s.setProperty("--text", sky.ink.text);
  s.setProperty("--secondary", sky.ink.secondary);
  s.setProperty("--faint", sky.ink.faint);
  s.setProperty("--link", sky.ink.link);
  s.setProperty("--border", sky.ink.border);
  s.setProperty("--surface", sky.ink.surface);
  s.setProperty("--pill", sky.ink.pill);
  s.setProperty("--accent", sky.ink.accent);
  s.setProperty("--night", sky.night.toFixed(3));
  s.setProperty("--shadow", (0.3 - sky.night * 0.16).toFixed(3));
  root.dataset.night = sky.night > 0.55 ? "1" : "0";
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute("content", sky.bottom);
}

export function mountStars(canvas) {
  const ctx = canvas.getContext("2d");
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random(),
    y: Math.random() * 0.78,
    r: Math.random() * 1.15 + 0.25,
    p: Math.random() * Math.PI * 2,
    s: 0.35 + Math.random() * 1.4,
  }));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let night = 0;

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
  }
  resize();
  addEventListener("resize", resize);

  function frame(t) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const alpha = Math.max(0, (night - 0.28) / 0.62);
    if (alpha > 0.01) {
      for (const star of stars) {
        const tw = reduce ? 0.85 : 0.55 + 0.45 * Math.sin(t * 0.001 * star.s + star.p);
        ctx.globalAlpha = alpha * tw;
        ctx.fillStyle = "#f4f7ff";
        ctx.beginPath();
        ctx.arc(star.x * canvas.width, star.y * canvas.height, star.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return (amount) => {
    night = amount;
  };
}

export function clockParts(date = new Date()) {
  return { hour: date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600, date };
}
