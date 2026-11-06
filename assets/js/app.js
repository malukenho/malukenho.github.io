import { applySky, mountStars, skyAt } from "./sky.js";
import { createAudio } from "./audio.js";

const WORKS = [
  { org: "Angi", year: "2025" },
  { org: "Werkspot", year: "2017" },
  { org: "Marco Pivetta Web Development", year: "2014" },
  { org: "Alfama Web", year: "2014" },
  { org: "Swapi - Agência Digital", year: "2012" },
  { org: "DivaWeb", year: "2011" },
  { org: "mundozero", year: "2010" },
];

const COPY = {
  pt: {
    bio: (seen, when) => `Jefersson Nathan é cientista da computação, com mais de 17 anos de experiência, e um pouco demais de inteligência artificial. Mora nos Países Baixos. Visto por último ${seen}, ${when}.`,
    sample: "amostra",
    work: "Work",
    timeline: "Linha do tempo",
    map: "Mapa",
    search: "Buscar",
    searchPlaceholder: "Buscar lugar",
    empty: "Nenhuma cena com esse nome.",
    now: "Agora",
    north: "Apontar para o norte",
    mini: "Mini mapa",
    globe: "Globo",
    scrub: "Linha do tempo dos lugares",
    drag: "Arraste para girar",
    loadingMap: "A carregar o mapa…",
    mapFail: "O mapa não carregou.",
    backHome: "Voltar à página",
    cats: { all: "Tudo", rua: "Rua", interior: "Interior", verde: "Verde", marco: "Marco" },
    when: { today: ["hoje", "Hoje"], yesterday: ["ontem", "Ontem"] },
    locale: "pt-BR",
    hourCycle: "h23",
  },
  en: {
    bio: (seen, when) => `Jefersson Nathan is a computer scientist with 17+ years of experience, and a little too much AI. He lives in the Netherlands. Last seen at ${seen}, ${when}.`,
    sample: "sample",
    work: "Work",
    timeline: "Timeline",
    map: "Maps",
    search: "Search",
    searchPlaceholder: "Search places",
    empty: "No scenes match.",
    now: "Now",
    north: "Point north",
    mini: "Mini map",
    globe: "Globe",
    scrub: "Place timeline",
    drag: "Drag to turn",
    loadingMap: "Loading the map…",
    mapFail: "The map didn’t load.",
    backHome: "Back to the page",
    cats: { all: "All", rua: "Street", interior: "Indoors", verde: "Green", marco: "Landmark" },
    when: { today: ["today", "Today"], yesterday: ["yesterday", "Yesterday"] },
    locale: "en-US",
    hourCycle: "h12",
  },
};

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const MAP_JS = "https://unpkg.com/maplibre-gl@5.15.0/dist/maplibre-gl.js";
const MAP_CSS = "https://unpkg.com/maplibre-gl@5.15.0/dist/maplibre-gl.css";

const params = new URLSearchParams(location.search);
const audio = createAudio();
const FROZEN_MINUTES = 20 * 60 + 55;

function initialLang() {
  const query = params.get("lang");
  if (query === "en" || query === "pt") return query;
  try {
    const stored = localStorage.getItem("lang");
    if (stored === "en" || stored === "pt") return stored;
  } catch { /* private mode */ }
  return "en";
}

const state = {
  lang: initialLang(),
  scenes: [],
  index: 0,
  mode: "home",
  filter: "all",
  query: "",
  scrubbing: false,
};

const $ = (id) => document.getElementById(id);
const t = () => COPY[state.lang];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
function store(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } }

function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dayDiff(iso) {
  const target = parseDate(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - target) / 86400000);
}
function whenText(iso, sentence) {
  const diff = dayDiff(iso);
  const pair = diff === 0 ? t().when.today : diff === 1 ? t().when.yesterday : null;
  if (pair) return sentence ? pair[0] : pair[1];
  const locale = state.lang === "pt" ? "pt-BR" : "en-GB";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(parseDate(iso));
}
function formatClock(date) {
  return new Intl.DateTimeFormat(t().locale, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: t().hourCycle,
  }).format(date);
}
function currentHour() {
  return FROZEN_MINUTES / 60;
}
function skyDate() {
  const date = new Date();
  date.setHours(20, 55, 0, 0);
  return date;
}

const setStars = mountStars($("stars"));

function viewOf(scene) {
  return { poster: scene.posterNight };
}

function paint() {
  const sky = skyAt(currentHour());
  applySky(document.documentElement, sky);
  setStars(sky.night);
  const clock = $("clock-btn");
  const label = formatClock(skyDate());
  clock.textContent = label;
  clock.classList.remove("is-preview");
  const readout = $("time-readout");
  if (readout) readout.textContent = label;
  const range = $("time-range");
  if (range) range.value = String(FROZEN_MINUTES);
}

function visible() {
  const q = state.query.trim().toLowerCase();
  return state.scenes
    .map((scene, index) => ({ scene, index }))
    .filter(({ scene }) => {
      if (state.filter !== "all" && scene.category !== state.filter) return false;
      if (!q) return true;
      const blob = `${scene.name.pt} ${scene.name.en} ${scene.where.pt} ${scene.where.en} ${scene.address || ""}`.toLowerCase();
      return blob.includes(q);
    });
}

function renderChrome() {
  const copy = t();
  document.documentElement.lang = state.lang === "pt" ? "pt" : "en";
  $("lang-btn").textContent = state.lang === "pt" ? "EN" : "PT";
  $("lang-btn").setAttribute("aria-label", state.lang === "pt" ? "English" : "Português");
  $("time-now").textContent = copy.now;
  $("compass").setAttribute("aria-label", copy.north);
  $("proj-mini").textContent = copy.mini;
  $("proj-globe").textContent = copy.globe;
  $("work-label").innerHTML = `<a href="https://www.linkedin.com/in/malukenho/" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.work)}</a>`;
  $("scrubber").setAttribute("aria-label", copy.scrub);
  $("view-timeline").setAttribute("aria-label", copy.timeline);
  $("view-map").setAttribute("aria-label", copy.map);
  renderWork();
  renderFooter();
  renderBio();
  renderStrip();
  renderScrubber();
  renderRange();
  paint();
}

function renderWork() {
  $("work-list").innerHTML = WORKS.map((item) =>
    `<li><p class="job-title">${escapeHtml(item.org)} <span class="year">— ${escapeHtml(item.year)}</span></p></li>`
  ).join("");
}

function renderFooter() {
  $("foot").innerHTML = `
    <a href="https://www.linkedin.com/in/malukenho" target="_blank" rel="noopener noreferrer">LinkedIn</a>
    <span class="dot" aria-hidden="true">·</span>
    <a href="https://github.com/malukenho" target="_blank" rel="noopener noreferrer">GitHub</a>
    <span class="dot" aria-hidden="true">·</span>
    <a href="https://x.com/malukenho" target="_blank" rel="noopener noreferrer">X</a>`;
}

function renderBio({ animate = true } = {}) {
  const scene = state.scenes[state.index];
  if (!scene) return;
  const bio = $("bio");
  const seen = scene.seen[state.lang];
  const when = whenText(scene.date, true).replace(/\.$/, "");
  const sample = scene.sample ? ` <span class="sample">${escapeHtml(t().sample)}</span>` : "";
  const address = scene.address ? `<span class="address">${escapeHtml(scene.address)}</span>` : "";
  bio.innerHTML = `${escapeHtml(t().bio("§", "¶"))}`
    .replace("§,", `<button type="button" class="text-link" data-open-map>${escapeHtml(seen)},</button>${sample}`)
    .replace("¶", escapeHtml(when)) + address;
  if (animate && !reduceMotion && !state.scrubbing) {
    bio.classList.remove("is-swap");
    void bio.offsetWidth;
    bio.classList.add("is-swap");
  }
  $("hero-still").alt = scene.name[state.lang];
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function renderStrip() {
  const strip = $("strip");
  const rows = visible();
  if (!rows.length) {
    strip.innerHTML = `<p class="empty">${escapeHtml(t().empty)}</p>`;
    return;
  }
  strip.innerHTML = rows.map(({ scene, index }) => {
    const withText = scene.with?.[state.lang];
    return `
    <button class="card${index === state.index ? " is-current" : ""}" type="button" data-index="${index}">
      <p class="when">${escapeHtml(whenText(scene.date, false))}</p>
      <span class="poster"><img src="${viewOf(scene).poster}" alt="" width="380" height="260" draggable="false"></span>
      <p class="name">${escapeHtml(scene.name[state.lang])}</p>
      <p class="meta">${scene.sample ? escapeHtml(t().sample) : escapeHtml(scene.where[state.lang])}</p>
      ${withText ? `<p class="with">${escapeHtml(withText)}</p>` : ""}
    </button>`;
  }).join("");
}

function renderScrubber() {
  const scrub = $("scrubber");
  const rows = visible();
  [...scrub.querySelectorAll(".tick, .scrub-label")].forEach((node) => node.remove());
  if (rows.length < 1) return;
  const start = parseDate(rows[0].scene.date).getTime();
  const end = parseDate(rows[rows.length - 1].scene.date).getTime();
  const span = Math.max(1, end - start);
  const days = Math.round(span / 86400000);
  const frag = document.createDocumentFragment();
  for (let i = 0; i <= days; i++) {
    const time = start + i * 86400000;
    const date = new Date(time);
    const tick = document.createElement("i");
    tick.className = "tick";
    if (date.getDate() === 1 || i === 0) tick.classList.add("month");
    if (rows.some(({ scene }) => parseDate(scene.date).getTime() === time)) tick.classList.add("has");
    tick.style.left = `${(i / Math.max(1, days)) * 100}%`;
    frag.appendChild(tick);
  }
  scrub.insertBefore(frag, $("playhead"));
  const current = rows.reduce((best, row) =>
    Math.abs(row.index - state.index) < Math.abs(best.index - state.index) ? row : best, rows[0]);
  placePlayhead((parseDate(current.scene.date).getTime() - start) / span);
  scrub.setAttribute("aria-valuemax", String(rows.length - 1));
  scrub.setAttribute("aria-valuenow", String(Math.max(0, rows.findIndex((row) => row.index === state.index))));
  scrub.dataset.start = String(start);
  scrub.dataset.span = String(span);
}

function placePlayhead(fraction) {
  $("playhead").style.left = `${clamp(fraction, 0, 1) * 100}%`;
}

function renderRange() {
  const range = $("range");
  const rows = visible();
  range.innerHTML = rows.map(({ scene, index }) =>
    `<button type="button" data-index="${index}" class="${index === state.index ? "is-on" : ""}" aria-label="${escapeHtml(scene.name[state.lang])}"></button>`
  ).join("");
}

let sceneToken = 0;
function showScene(index, { sound = true, swapCamera = true } = {}) {
  if (!state.scenes.length) return;
  index = clamp(index, 0, state.scenes.length - 1);
  const changed = index !== state.index;
  state.index = index;
  const scene = state.scenes[index];
  renderBio();
  document.querySelectorAll(".card").forEach((card) => {
    card.classList.toggle("is-current", Number(card.dataset.index) === index);
  });
  renderRange();
  if (!state.scrubbing) renderScrubber();
  const still = $("hero-still");
  const poster = viewOf(scene).poster;
  const same = (still.getAttribute("src") || "").endsWith(poster);
  if (swapCamera && !same) {
    const token = ++sceneToken;
    still.classList.add("is-out");
    window.setTimeout(() => {
      if (token !== sceneToken) return;
      still.src = poster;
      still.classList.remove("is-out");
    }, reduceMotion ? 0 : 160);
  }
  if (sound && changed) audio.play("open", index / Math.max(1, state.scenes.length - 1));
  if (mapApi) syncMap(false);
}

function setMode(mode, { push = true, sound = true } = {}) {
  if (!["home", "timeline", "map"].includes(mode)) mode = "home";
  state.mode = mode;
  document.body.dataset.mode = mode;
  for (const view of document.querySelectorAll(".view")) {
    const on = view.dataset.view === mode;
    view.classList.toggle("is-active", on);
    view.inert = !on;
  }
  if (mode === "timeline") {
    scrollLock = true;
    requestAnimationFrame(() => {
      scrollCard(state.index, "auto");
      requestAnimationFrame(() => { scrollLock = false; });
    });
  }
  if (mode === "map") ensureMap().then(() => mapApi && syncMap(true));
  closePopovers();
  if (push) {
    const hash = mode === "home" ? state.scenes[state.index]?.id || "" : mode;
    history.pushState({ mode }, "", hash ? `#${hash}` : location.pathname);
  }
  if (sound) audio.play("tap", mode === "map" ? 0.7 : mode === "timeline" ? 0.4 : 0.2);
}

function scrollCard(index, behavior) {
  const card = document.querySelector(`.card[data-index="${index}"]`);
  if (!card) return;
  const strip = $("strip");
  const left = card.offsetLeft - (strip.clientWidth - card.clientWidth) / 2;
  strip.scrollTo({ left, behavior: reduceMotion ? "auto" : behavior });
}

function closePopovers() {
  $("time-menu").hidden = true;
  $("clock-btn").setAttribute("aria-expanded", "false");
}

function togglePopover(id, button) {
  const el = $(id);
  const open = el.hidden;
  closePopovers();
  el.hidden = !open;
  button?.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) audio.play("tap", 0.55);
}

let scrollLock = false;
function onStripScroll() {
  if (scrollLock || state.mode !== "timeline") return;
  const strip = $("strip");
  const mid = strip.scrollLeft + strip.clientWidth / 2;
  let best = null;
  let bestDist = Infinity;
  for (const card of strip.querySelectorAll(".card")) {
    const center = card.offsetLeft + card.clientWidth / 2;
    const dist = Math.abs(center - mid);
    if (dist < bestDist) { bestDist = dist; best = card; }
  }
  if (!best) return;
  const index = Number(best.dataset.index);
  if (index !== state.index) {
    const prev = state.index;
    showScene(index, { sound: false, swapCamera: true });
    audio.play("tick", index / Math.max(1, state.scenes.length - 1));
    if (Math.abs(index - prev) > 0) scrollLock = false;
  }
}

function scrubToClientX(clientX, { snap = false, sound = true } = {}) {
  const scrub = $("scrubber");
  const rect = scrub.getBoundingClientRect();
  const fraction = clamp((clientX - rect.left) / rect.width, 0, 1);
  const rows = visible();
  if (!rows.length) return;
  const start = Number(scrub.dataset.start);
  const span = Number(scrub.dataset.span) || 1;
  const time = start + fraction * span;
  let best = rows[0];
  let bestDist = Infinity;
  for (const row of rows) {
    const dist = Math.abs(parseDate(row.scene.date).getTime() - time);
    if (dist < bestDist) { bestDist = dist; best = row; }
  }
  placePlayhead(snap ? (parseDate(best.scene.date).getTime() - start) / span : fraction);
  if (best.index !== state.index) {
    showScene(best.index, { sound: false });
    if (sound) audio.play("tick", best.index / Math.max(1, state.scenes.length - 1));
    scrollLock = true;
    scrollCard(best.index, "auto");
    requestAnimationFrame(() => { scrollLock = false; });
  }
  let label = scrub.querySelector(".scrub-label");
  if (!label) {
    label = document.createElement("div");
    label.className = "scrub-label";
    scrub.appendChild(label);
  }
  label.hidden = false;
  label.textContent = whenText(best.scene.date, false);
  label.style.left = `${(snap ? (parseDate(best.scene.date).getTime() - start) / span : fraction) * 100}%`;
}

function hideScrubLabel() {
  const label = $("scrubber").querySelector(".scrub-label");
  if (label) label.hidden = true;
  $("ring").hidden = true;
}

let mapApi = null;
let mapReady = null;

function loadAsset(tag, attrs) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`failed ${attrs.src || attrs.href}`));
    document.head.appendChild(el);
  });
}

async function ensureMap() {
  if (mapReady) return mapReady;
  const note = $("map-note");
  note.hidden = false;
  note.textContent = t().loadingMap;
  mapReady = (async () => {
    if (!window.maplibregl) {
      await loadAsset("link", { rel: "stylesheet", href: MAP_CSS });
      await loadAsset("script", { src: MAP_JS });
    }
    const scene = state.scenes[state.index];
    const map = new maplibregl.Map({
      container: "map",
      style: MAP_STYLE,
      center: [scene.lng, scene.lat],
      zoom: 14.6,
      pitch: 62,
      bearing: -22,
      attributionControl: true,
      maxPitch: 72,
    });
    const mini = new maplibregl.Map({
      container: "minimap",
      style: MAP_STYLE,
      center: [scene.lng, scene.lat],
      zoom: 8.6,
      interactive: false,
      attributionControl: false,
    });
    const markers = [];
    map.on("load", () => {
      note.hidden = true;
      note.textContent = "";
      map.jumpTo({ pitch: 62, bearing: -22 });
      map.getContainer().dataset.pitch = String(Math.round(map.getPitch()));
      mapApi.cities = [
        { name: "Ospel", lng: 5.7853, lat: 51.2986 },
      ].map((place) => {
        const city = document.createElement("div");
        city.className = "city-pill";
        city.textContent = place.name;
        return new maplibregl.Marker({ element: city, anchor: "center" })
          .setLngLat([place.lng, place.lat])
          .addTo(map);
      });
      state.scenes.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pin";
        button.innerHTML = `<img alt="" src="${viewOf(item).poster}"><span>${escapeHtml(item.name[state.lang])}</span>`;
        button.addEventListener("click", () => {
          showScene(index);
          setMode("home", { sound: false });
        });
        const marker = new maplibregl.Marker({ element: button, anchor: "bottom" })
          .setLngLat([item.lng, item.lat])
          .addTo(map);
        markers.push({ index, marker, button });
      });
      tuneSky(map);
    });
    map.on("error", () => {
      note.hidden = false;
      note.textContent = t().mapFail;
    });
    map.on("move", () => {
      const b = map.getBearing();
      $("compass-rose").style.transform = `rotate(${-b}deg)`;
      if (mapApi?.projection !== "globe") {
        mini.jumpTo({ center: map.getCenter(), zoom: Math.max(1, map.getZoom() - 4.2) });
      }
    });
    mapApi = { map, mini, markers, projection: "mercator" };
    return mapApi;
  })().catch(() => {
    note.hidden = false;
    note.textContent = t().mapFail;
    mapReady = null;
  });
  return mapReady;
}

function tuneSky(map) {
  const sky = skyAt(currentHour());
  try {
    map.setSky({
      "sky-color": sky.top,
      "horizon-color": sky.bottom,
      "fog-color": sky.mid,
      "sky-horizon-blend": 0.55,
      "horizon-fog-blend": 0.65,
      "fog-ground-blend": 0.75,
    });
  } catch { /* style may not expose sky yet */ }
}

function syncMap(fly = true) {
  if (!mapApi) return;
  const scene = state.scenes[state.index];
  const rows = new Set(visible().map((row) => row.index));
  const globe = mapApi.projection === "globe";
  for (const item of mapApi.markers) {
    item.button.style.display = !globe && rows.has(item.index) ? "" : "none";
    item.button.querySelector("span").textContent = state.scenes[item.index].name[state.lang];
  }
  for (const city of mapApi.cities || []) city.getElement().style.display = globe ? "none" : "";
  if (mapApi.projection === "globe") return;
  const zoom = String(scene.id).includes("ospel") ? 16.3 : 15.1;
  const move = { center: [scene.lng, scene.lat], zoom, pitch: 62, bearing: -22, duration: reduceMotion ? 0 : 700 };
  if (fly) mapApi.map.easeTo(move);
  tuneSky(mapApi.map);
}

function setProjection(kind) {
  if (!mapApi) return;
  mapApi.projection = kind;
  const globe = kind === "globe";
  $("proj-mini").setAttribute("aria-pressed", globe ? "false" : "true");
  $("proj-globe").setAttribute("aria-pressed", globe ? "true" : "false");
  $("minimap").hidden = globe;
  $("minimap").style.display = globe ? "none" : "";
  try {
    mapApi.map.setProjection({ type: globe ? "globe" : "mercator" });
  } catch { /* older builds */ }
  if (globe) {
    for (const item of mapApi.markers) item.button.style.display = "none";
    for (const city of mapApi.cities || []) city.getElement().style.display = "none";
    mapApi.map.easeTo({ center: [5.66, 51.48], zoom: 2.2, pitch: 0, bearing: 0, duration: 900 });
  } else syncMap(true);
  audio.play("open", globe ? 0.2 : 0.8);
}

function savedSound() {
  try {
    localStorage.removeItem("sound");
    localStorage.removeItem("sound-theme");
  } catch { /* ignore */ }
}

function bind() {
  document.body.addEventListener("click", (event) => {
    if (event.target.closest("[data-open-map]")) {
      setMode("map");
      return;
    }
    const card = event.target.closest(".card");
    if (card) {
      showScene(Number(card.dataset.index));
      setMode("home", { sound: false });
      return;
    }
    const rangeBtn = event.target.closest("#range button");
    if (rangeBtn) {
      showScene(Number(rangeBtn.dataset.index));
      return;
    }
    if (!event.target.closest(".popover") && !event.target.closest("#clock-btn")) {
      closePopovers();
    }
  });

  $("clock-btn").addEventListener("click", () => {
    $("time-range").value = String(FROZEN_MINUTES);
    togglePopover("time-menu", $("clock-btn"));
  });
  $("lang-btn").addEventListener("click", () => {
    state.lang = state.lang === "pt" ? "en" : "pt";
    store("lang", state.lang);
    renderChrome();
    if (mapApi) syncMap(false);
    audio.play("tap", 0.8);
  });
  $("time-range").addEventListener("input", () => {
    $("time-range").value = String(FROZEN_MINUTES);
    paint();
  });
  $("time-now").addEventListener("click", () => {
    $("time-range").value = String(FROZEN_MINUTES);
    paint();
    if (mapApi) tuneSky(mapApi.map);
    audio.play("tap", currentHour() / 24);
  });
  $("compass").addEventListener("click", () => {
    mapApi?.map.easeTo({ bearing: 0, duration: 500 });
    audio.play("tap", 0.3);
  });
  $("proj-mini").addEventListener("click", () => setProjection("mercator"));
  $("proj-globe").addEventListener("click", () => setProjection("globe"));

  const scrub = $("scrubber");
  let pressTimer = 0;
  let startX = 0;
  let startY = 0;
  scrub.addEventListener("pointerdown", (event) => {
    state.scrubbing = true;
    scrub.setPointerCapture(event.pointerId);
    startX = event.clientX;
    startY = event.clientY;
    scrubToClientX(event.clientX);
    pressTimer = window.setTimeout(() => {
      const ring = $("ring");
      ring.hidden = false;
      ring.style.left = `${event.clientX}px`;
      ring.style.top = `${event.clientY}px`;
      ring.textContent = whenText(state.scenes[state.index].date, false);
    }, 420);
  });
  scrub.addEventListener("pointermove", (event) => {
    if (!state.scrubbing) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 6) {
      clearTimeout(pressTimer);
      $("ring").hidden = true;
    }
    scrubToClientX(event.clientX);
  });
  const endScrub = (event) => {
    if (!state.scrubbing) return;
    state.scrubbing = false;
    clearTimeout(pressTimer);
    scrubToClientX(event.clientX, { snap: true, sound: false });
    window.setTimeout(hideScrubLabel, 700);
  };
  scrub.addEventListener("pointerup", endScrub);
  scrub.addEventListener("pointercancel", endScrub);
  $("strip").addEventListener("scroll", () => {
    if (scrollLock) return;
    onStripScroll();
  }, { passive: true });
  $("view-timeline").addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    $("strip").scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });

  $("hero").addEventListener("click", () => {
    if (state.mode !== "home") return;
    setMode("timeline");
  });
  addEventListener("pointerdown", () => audio.unlock(), { once: false });
  addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) {
      if (event.key === "Escape") closePopovers();
      return;
    }
    if (event.key === "Escape") {
      if (!$("time-menu").hidden) closePopovers();
      else if (state.mode !== "home") setMode("home");
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    }
  });
  addEventListener("popstate", () => applyHash(false));
  addEventListener("resize", () => mapApi?.map.resize());
}

function step(dir) {
  const rows = state.mode === "home" ? state.scenes.map((scene, index) => ({ scene, index })) : visible();
  if (!rows.length) return;
  const pos = Math.max(0, rows.findIndex((row) => row.index === state.index));
  const next = rows[clamp(pos + dir, 0, rows.length - 1)];
  if (!next || next.index === state.index) return;
  showScene(next.index);
  if (state.mode === "timeline") {
    scrollLock = true;
    scrollCard(next.index, reduceMotion ? "auto" : "smooth");
    window.setTimeout(() => { scrollLock = false; }, 400);
  }
}

function applyHash(push) {
  const hash = location.hash.replace("#", "");
  if (hash === "timeline" || hash === "linha") setMode("timeline", { push, sound: false });
  else if (hash === "map" || hash === "mapa") setMode("map", { push, sound: false });
  else {
    const found = state.scenes.findIndex((scene) => scene.id === hash);
    if (found >= 0) showScene(found, { sound: false });
    setMode("home", { push, sound: false });
  }
}

async function main() {
  savedSound();
  const response = await fetch("assets/data/scenes.json");
  state.scenes = await response.json();
  state.scenes.sort((a, b) => a.date.localeCompare(b.date));
  state.index = state.scenes.length - 1;
  bind();
  renderChrome();
  const initial = state.scenes[state.index];
  $("hero-still").src = viewOf(initial).poster;
  if (location.hash) applyHash(false);
  else showScene(state.index, { sound: false });
  paint();
  for (const view of document.querySelectorAll(".view")) view.inert = !view.classList.contains("is-active");
}

main().catch((error) => {
  console.error(error);
  $("bio").textContent = "Não foi possível abrir as cenas.";
});
