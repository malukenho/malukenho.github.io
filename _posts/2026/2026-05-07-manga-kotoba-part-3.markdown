---
layout: post
title: "Manga Kotoba, Part 3: Performance Hell and the N+1 Crisis"
date: 2026-05-07 10:00:00 +0000
categories: ["post"]
tags: [php, symfony, performance, mysql, doctrine, optimization]
series: manga-kotoba
---

<!-- =====================================================================
     STYLES
     ===================================================================== -->
<style>
/* ── Series progress bar ──────────────────────────────────────────────── */
.series-bar {
  display: flex; gap: 0; margin: 0 0 2.4rem; border-radius: 8px; overflow: hidden;
  border: 1px solid #2e2f35;
}
.series-part {
  flex: 1; padding: 10px 6px; text-align: center; font-size: 12px;
  color: rgba(255,255,255,.45); background: #1e1f24; cursor: default;
  transition: background .2s; border-right: 1px solid #2e2f35; line-height: 1.4;
}
.series-part:last-child { border-right: none; }
.series-part.active {
  background: #fbef8a; color: #19191c; font-weight: 700; color: #19191c;
}
.series-part .part-num { font-size: 10px; text-transform: uppercase; letter-spacing: .07em; opacity: .7; }
.series-part.active .part-num { opacity: .6; }
.series-part .part-title { margin-top: 2px; font-size: 11px; }

/* ── General callouts ─────────────────────────────────────────────────── */
.tip {
  border-left: 3px solid #7bcdab; background: #1a2e23; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.tip strong { color: #7bcdab; }
.warn {
  border-left: 3px solid #fbef8a; background: #2a2a1a; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.warn strong { color: #fbef8a; }
.danger {
  border-left: 3px solid #f08080; background: #2a1a1a; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.danger strong { color: #f08080; }

/* ── Code blocks ──────────────────────────────────────────────────────── */
pre.code-block {
  background: #111113; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 18px 20px; overflow-x: auto; font-family: "JetBrains Mono", monospace;
  font-size: 13px; line-height: 1.65; margin: 1.4rem 0;
}
pre.code-block .kw  { color: #cc99cd; }
pre.code-block .fn  { color: #7bcdab; }
pre.code-block .str { color: #fbef8a; }
pre.code-block .cmt { color: rgba(255,255,255,.35); font-style: italic; }
pre.code-block .cls { color: #f08080; }
pre.code-block .var { color: #e0e0e0; }
pre.code-block .num { color: #a0d0ff; }
pre.code-block .ann { color: #c49aff; }
pre.code-block .op  { color: rgba(255,255,255,.55); }

.code-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
  color: rgba(255,255,255,.4); margin-bottom: -8px; padding-left: 2px;
}
.code-label.before { color: #f08080; }
.code-label.after  { color: #7bcdab; }

/* ── N+1 visualizer ───────────────────────────────────────────────────── */
.n1-demo {
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 24px; margin: 1.6rem 0;
}
.n1-demo h3 { margin: 0 0 16px; color: #fbef8a; font-size: 15px; }
.n1-controls {
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 20px;
}
.n1-mode-btn {
  padding: 7px 16px; border-radius: 20px; font-size: 13px; cursor: pointer;
  border: 1px solid #3a3b40; background: transparent; color: rgba(255,255,255,.6);
  transition: all .2s; font-family: inherit;
}
.n1-mode-btn:hover { border-color: #7bcdab; color: #fff; }
.n1-mode-btn.active { background: #7bcdab; border-color: #7bcdab; color: #19191c; font-weight: 700; }
.n1-load-btn {
  padding: 7px 20px; border-radius: 20px; font-size: 13px; cursor: pointer;
  border: none; background: #fbef8a; color: #19191c; font-weight: 700;
  transition: all .2s; font-family: inherit;
}
.n1-load-btn:hover { background: #fff; }
.n1-load-btn:disabled { opacity: .4; cursor: not-allowed; }

.n1-stats {
  display: flex; gap: 24px; margin-bottom: 18px; flex-wrap: wrap;
}
.n1-stat { text-align: center; }
.n1-stat .stat-val {
  font-size: 26px; font-weight: 700; color: #7bcdab; font-family: "JetBrains Mono", monospace;
}
.n1-stat.bad .stat-val { color: #f08080; }
.n1-stat .stat-label { font-size: 11px; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .06em; }

.n1-arena {
  display: grid; grid-template-columns: 1fr 60px 1fr; gap: 0; align-items: start;
  min-height: 260px;
}
.n1-manga-list { display: flex; flex-direction: column; gap: 8px; }
.n1-manga-row {
  background: #252629; border-radius: 6px; padding: 8px 12px; font-size: 13px;
  border: 1px solid #2e2f35; display: flex; align-items: center; gap: 8px;
  transition: border-color .2s;
}
.n1-manga-row.querying { border-color: #fbef8a; }
.n1-manga-row .m-icon { font-size: 16px; }
.n1-manga-row .m-name { color: #e0e0e0; }
.n1-manga-row .m-badge {
  margin-left: auto; font-size: 11px; padding: 2px 7px; border-radius: 10px;
  background: #2e2f35; color: rgba(255,255,255,.4); white-space: nowrap;
}
.n1-manga-row.done .m-badge { background: #1a3a2a; color: #7bcdab; }

.n1-wire {
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  padding-top: 8px;
}
.n1-ping {
  width: 10px; height: 10px; border-radius: 50%; background: #fbef8a;
  opacity: 0; position: relative;
  box-shadow: 0 0 8px #fbef8a;
}
.n1-ping.fly { animation: pingFly .45s ease forwards; }
@keyframes pingFly {
  0%   { opacity: 0; transform: translateY(0); }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(30px); }
}

.n1-db-side { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.n1-db-icon {
  font-size: 36px; position: relative; transition: transform .15s;
}
.n1-db-icon.hit { animation: dbHit .2s ease; }
@keyframes dbHit {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.25); }
  100% { transform: scale(1); }
}
.n1-query-log {
  background: #111113; border-radius: 6px; padding: 10px 12px;
  font-family: "JetBrains Mono", monospace; font-size: 11px; line-height: 1.7;
  color: rgba(255,255,255,.55); width: 100%; box-sizing: border-box;
  max-height: 200px; overflow-y: auto; min-height: 60px;
}
.n1-query-log .ql-entry { animation: qlFade .25s ease; }
@keyframes qlFade { from { opacity:0; transform: translateX(6px); } to { opacity:1; transform: none; } }
.ql-entry.type-list { color: #7bcdab; }
.ql-entry.type-vol  { color: #fbef8a; }
.ql-entry.type-cov  { color: #a0d0ff; }
.ql-entry.type-join { color: #7bcdab; }

/* ── Profiler mockup ──────────────────────────────────────────────────── */
.profiler-mock {
  background: #1a1a1f; border: 1px solid #2e2f35; border-radius: 8px;
  overflow: hidden; margin: 1.6rem 0; font-family: "JetBrains Mono", monospace;
  font-size: 12px;
}
.profiler-topbar {
  background: #111113; padding: 8px 14px; display: flex; align-items: center;
  gap: 14px; border-bottom: 1px solid #2e2f35;
}
.profiler-topbar .ptb-label { color: rgba(255,255,255,.4); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
.profiler-topbar .ptb-badge {
  padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 700;
}
.ptb-badge.bad  { background: #3a1a1a; color: #f08080; }
.ptb-badge.good { background: #1a3a2a; color: #7bcdab; }
.profiler-rows { }
.p-row {
  display: flex; align-items: center; gap: 0; border-bottom: 1px solid #1e1f24;
  transition: background .15s; cursor: default;
}
.p-row:hover { background: #252629; }
.p-row:last-child { border-bottom: none; }
.p-row .p-num { width: 36px; text-align: right; padding: 6px 10px; color: rgba(255,255,255,.3); flex-shrink: 0; }
.p-row .p-time { width: 56px; text-align: right; padding: 6px 8px; color: #fbef8a; flex-shrink: 0; }
.p-row .p-sql { padding: 6px 10px; color: rgba(255,255,255,.65); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex: 1; }
.p-row .p-sql .kw2 { color: #cc99cd; }
.p-row.highlight .p-sql { color: #f08080; }
.p-row.highlight .p-num { color: #f08080; }
.profiler-footer {
  background: #111113; padding: 8px 14px; border-top: 1px solid #2e2f35;
  color: rgba(255,255,255,.4); font-size: 11px; display: flex; gap: 20px;
}
.profiler-footer strong { color: #f08080; }

/* ── Density score calculator ─────────────────────────────────────────── */
.density-calc {
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 24px; margin: 1.6rem 0;
}
.density-calc h3 { margin: 0 0 20px; color: #fbef8a; font-size: 15px; }
.slider-group { margin-bottom: 18px; }
.slider-group label {
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 13px; color: rgba(255,255,255,.7); margin-bottom: 8px;
}
.slider-group label span { font-family: "JetBrains Mono", monospace; color: #7bcdab; font-size: 14px; font-weight: 700; }
.slider-group input[type="range"] {
  -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
  background: #2e2f35; border-radius: 2px; outline: none; cursor: pointer;
}
.slider-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
  background: #7bcdab; cursor: pointer; border: 2px solid #19191c;
}
.density-result {
  background: #111113; border-radius: 8px; padding: 20px 24px;
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap; margin-top: 8px;
}
.density-gauge {
  width: 90px; height: 90px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; flex-direction: column;
  border: 4px solid #2e2f35; flex-shrink: 0; transition: border-color .3s;
}
.density-gauge .dg-val { font-size: 22px; font-weight: 700; font-family: "JetBrains Mono", monospace; }
.density-gauge .dg-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.4); margin-top: 2px; }
.density-desc { flex: 1; min-width: 180px; }
.density-desc .dd-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.density-desc .dd-sub { font-size: 13px; color: rgba(255,255,255,.55); line-height: 1.6; }
.density-bar-wrap { width: 100%; margin-top: 10px; }
.density-bar-track {
  height: 8px; background: #2e2f35; border-radius: 4px; overflow: hidden;
}
.density-bar-fill { height: 100%; border-radius: 4px; transition: width .3s ease, background .3s ease; }
.density-legend {
  display: flex; gap: 16px; margin-top: 8px; font-size: 11px; color: rgba(255,255,255,.4);
}
.density-legend span::before { content: "●"; margin-right: 4px; }
.dl-low::before  { color: #f08080; }
.dl-med::before  { color: #fbef8a; }
.dl-high::before { color: #7bcdab; }

/* ── Manga shelf ──────────────────────────────────────────────────────── */
.shelf-demo {
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 24px; margin: 1.6rem 0;
}
.shelf-demo h3 { margin: 0 0 8px; color: #fbef8a; font-size: 15px; }
.shelf-hint { font-size: 13px; color: rgba(255,255,255,.45); margin-bottom: 20px; }
.shelf-volumes {
  display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 20px;
}
.shelf-vol {
  width: 68px; cursor: pointer; user-select: none;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.vol-spine {
  width: 68px; height: 100px; border-radius: 6px; display: flex;
  align-items: center; justify-content: center; font-size: 11px;
  font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  transition: all .2s; border: 2px solid transparent; flex-direction: column; gap: 4px;
  position: relative; overflow: hidden;
}
.vol-spine.unread   { background: #252629; border-color: #3a3b40; color: rgba(255,255,255,.3); }
.vol-spine.reading  { background: #2a2a1a; border-color: #fbef8a; color: #fbef8a; }
.vol-spine.completed { background: #1a3a2a; border-color: #7bcdab; color: #7bcdab; }
.vol-spine:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,.4); }
.vol-spine .vol-icon { font-size: 22px; }
.vol-spine .vol-num  { font-size: 10px; }
.vol-spine .vol-status-dot {
  position: absolute; top: 6px; right: 6px; width: 7px; height: 7px;
  border-radius: 50%; background: currentColor;
}
.shelf-vol .vol-label { font-size: 11px; color: rgba(255,255,255,.4); text-align: center; }
.shelf-summary {
  background: #111113; border-radius: 8px; padding: 14px 18px;
  display: flex; gap: 20px; flex-wrap: wrap; align-items: center;
}
.shelf-summary .ss-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.shelf-summary .ss-dot { width: 10px; height: 10px; border-radius: 50%; }
.ss-dot.unread   { background: #3a3b40; }
.ss-dot.reading  { background: #fbef8a; }
.ss-dot.completed { background: #7bcdab; }
.shelf-summary .ss-count { font-weight: 700; }

/* ── Vocab histogram ──────────────────────────────────────────────────── */
.vocab-chart {
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 24px; margin: 1.6rem 0;
}
.vocab-chart h3 { margin: 0 0 6px; color: #fbef8a; font-size: 15px; }
.vocab-chart-hint { font-size: 13px; color: rgba(255,255,255,.45); margin-bottom: 18px; }
.vocab-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
  transition: opacity .2s;
}
.vocab-row.known { opacity: .3; }
.vocab-row .vr-check {
  width: 16px; height: 16px; border-radius: 3px; border: 1px solid #3a3b40;
  flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center;
  background: transparent; transition: all .2s; font-size: 11px; color: #19191c;
}
.vocab-row .vr-check.checked { background: #7bcdab; border-color: #7bcdab; }
.vocab-row .vr-word { font-family: "JetBrains Mono", monospace; font-size: 15px; min-width: 52px; }
.vocab-row .vr-reading { font-size: 11px; color: rgba(255,255,255,.4); min-width: 60px; }
.vocab-row .vr-bar-wrap { flex: 1; position: relative; }
.vocab-row .vr-bar-bg { background: #2e2f35; height: 20px; border-radius: 4px; overflow: hidden; }
.vocab-row .vr-bar-fill { height: 100%; background: #7bcdab; border-radius: 4px; transition: width .3s ease; }
.vocab-row .vr-count { font-family: "JetBrains Mono", monospace; font-size: 12px; color: rgba(255,255,255,.5); min-width: 36px; text-align: right; }
.vocab-chart-footer { font-size: 12px; color: rgba(255,255,255,.35); margin-top: 12px; }
.vocab-chart-footer strong { color: #7bcdab; }

/* ── Flip cards ───────────────────────────────────────────────────────── */
.flip-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px; margin: 1.6rem 0;
}
.flip-card {
  height: 180px; perspective: 800px; cursor: pointer;
}
.flip-inner {
  width: 100%; height: 100%; position: relative; transition: transform .5s ease;
  transform-style: preserve-3d;
}
.flip-card.flipped .flip-inner { transform: rotateY(180deg); }
.flip-face {
  position: absolute; inset: 0; border-radius: 10px; padding: 18px;
  backface-visibility: hidden; display: flex; flex-direction: column;
  justify-content: center;
}
.flip-front {
  background: #1e1f24; border: 1px solid #2e2f35;
  align-items: center; text-align: center;
}
.flip-front .ff-num {
  font-size: 11px; color: rgba(255,255,255,.3); text-transform: uppercase;
  letter-spacing: .08em; margin-bottom: 10px;
}
.flip-front .ff-emoji { font-size: 28px; margin-bottom: 10px; }
.flip-front .ff-title { font-size: 14px; font-weight: 700; color: #fbef8a; line-height: 1.4; }
.flip-back {
  background: #1a2e23; border: 1px solid #7bcdab;
  transform: rotateY(180deg);
}
.flip-back .fb-lesson { font-size: 13px; color: #e0e0e0; line-height: 1.65; }
.flip-back .fb-lesson strong { color: #7bcdab; }
.flip-hint { text-align: center; font-size: 12px; color: rgba(255,255,255,.3); margin-bottom: 8px; }

/* ── Next-up card ─────────────────────────────────────────────────────── */
.next-up {
  background: linear-gradient(135deg, #1a2e23 0%, #1e1f24 100%);
  border: 1px solid #7bcdab; border-radius: 10px; padding: 22px 24px;
  margin: 2rem 0; display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;
}
.next-up .nu-icon { font-size: 36px; flex-shrink: 0; }
.next-up .nu-body { flex: 1; min-width: 200px; }
.next-up .nu-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #7bcdab; margin-bottom: 6px; }
.next-up .nu-title { font-size: 17px; font-weight: 700; color: #fbef8a; margin-bottom: 6px; }
.next-up .nu-desc { font-size: 14px; color: rgba(255,255,255,.6); line-height: 1.6; }

@media (max-width: 560px) {
  .n1-arena { grid-template-columns: 1fr 40px auto; }
  .flip-grid { grid-template-columns: 1fr 1fr; }
  .n1-stats  { gap: 12px; }
}
</style>

<!-- SERIES PROGRESS BAR -->
<div class="series-bar">
  <div class="series-part">
    <div class="part-num">Part 1</div>
    <div class="part-title">The Idea</div>
  </div>
  <div class="series-part">
    <div class="part-num">Part 2</div>
    <div class="part-title">Building the Core</div>
  </div>
  <div class="series-part active">
    <div class="part-num">Part 3</div>
    <div class="part-title">Performance Hell</div>
  </div>
  <div class="series-part">
    <div class="part-num">Part 4</div>
    <div class="part-title">Heroku &amp; S3</div>
  </div>
  <div class="series-part">
    <div class="part-num">Part 5</div>
    <div class="part-title">Retrospective</div>
  </div>
</div>

{: class="marginalia" }
This is part 3 of 5.<br/>Parts 1–2 covered the<br/>concept and the core<br/>Symfony/Doctrine setup.<br/>You can read those first<br/>or jump in here.

The app worked. I'd wired up the Symfony controllers, built the Doctrine entities, seeded a handful of manga titles and volumes, and I could hit the API endpoints and get JSON back. It felt good — that fragile, optimistic good you feel before you feed the system real data.

Then I imported my actual manga library.

Forty titles. Each with multiple volumes. Each volume with pages and vocabulary entries. The manga list endpoint — the one the frontend hits first, on every page load — started responding in **four to six seconds**. On a page refresh. For a list endpoint.

I opened the Symfony Web Profiler toolbar. The query counter read **83**.

This is the story of how I fixed that.

---

## Anatomy of an N+1 Query

{: class="marginalia" }
"N+1" means 1 query<br/>to fetch N rows,<br/>then N more queries<br/>to fetch related data<br/>for each row. It's one<br/>of the most common<br/>ORM performance bugs.

Before I show the fix, let me show you exactly what was happening. The interactive demo below illustrates the difference between N+1 loading and a proper eager JOIN. Click **Load** to see the queries fire in real time.

<div class="n1-demo">
  <h3>⚡ N+1 Query Visualizer</h3>
  <div class="n1-controls">
    <button class="n1-mode-btn active" id="modeN1Btn">N+1 Mode (bad)</button>
    <button class="n1-mode-btn" id="modeOptBtn">Optimized Mode (good)</button>
    <button class="n1-load-btn" id="n1LoadBtn">▶ Load</button>
  </div>
  <div class="n1-stats">
    <div class="n1-stat" id="n1StatQueries">
      <div class="stat-val" id="n1QueryCount">0</div>
      <div class="stat-label">Queries fired</div>
    </div>
    <div class="n1-stat" id="n1StatTime">
      <div class="stat-val" id="n1TimeVal">0ms</div>
      <div class="stat-label">Simulated time</div>
    </div>
    <div class="n1-stat">
      <div class="stat-val" id="n1StatusTxt" style="font-size:14px;padding-top:6px;color:rgba(255,255,255,.5)">idle</div>
      <div class="stat-label">Status</div>
    </div>
  </div>
  <div class="n1-arena">
    <div class="n1-manga-list" id="n1MangaList">
      <!-- populated by JS -->
    </div>
    <div class="n1-wire" id="n1Wire">
      <div class="n1-ping" id="n1Ping"></div>
    </div>
    <div class="n1-db-side">
      <div class="n1-db-icon" id="n1DbIcon">🗄️</div>
      <div class="n1-query-log" id="n1QueryLog">
        <span style="color:rgba(255,255,255,.25);font-size:11px">— queries will appear here —</span>
      </div>
    </div>
  </div>
</div>

The difference is stark. N+1 fires a query for the manga list, then a query per manga for volumes, then another per manga for cover images. With 5 titles that's already 11 queries. With 40 real titles it was 83.

Every query is a round-trip to the database. On Heroku, your database might be in a different availability zone. Each round-trip can cost 5–20ms. Forty round-trips × 20ms = up to 800ms of *pure waiting*, before any computation happens.

---

## Finding the Problem — The Symfony Profiler

{: class="marginalia" }
The Symfony Web<br/>Profiler toolbar is the<br/>dark bar at the bottom<br/>of every dev-env page.<br/>Click the database icon<br/>to see all queries.

The Symfony Web Profiler is indispensable. In dev mode, a slim toolbar appears at the bottom of every page (and every API response in the profiler UI). Clicking the database icon opens a full list of every Doctrine query, with execution times and the exact SQL generated.

Here's what mine looked like after loading the manga list:

<div class="profiler-mock">
  <div class="profiler-topbar">
    <span class="ptb-label">Doctrine</span>
    <span class="ptb-badge bad">83 queries</span>
    <span class="ptb-badge bad">412 ms</span>
    <span style="color:rgba(255,255,255,.3);font-size:11px;margin-left:auto">GET /api/manga &nbsp;200</span>
  </div>
  <div class="profiler-rows" id="profilerRows">
    <!-- populated by JS -->
  </div>
  <div class="profiler-footer">
    <span>Total: <strong>83 queries</strong></span>
    <span>Query time: <strong>412 ms</strong></span>
    <span style="color:rgba(255,255,255,.3)">Hydration: 18 ms</span>
  </div>
</div>

When you see a pattern like `SELECT ... WHERE manga_id = ?` repeated twenty or forty times with only the `id` value changing — that's your N+1. Each line is a separate network round-trip to the database.

The profiler also lets you click any query to see the exact Doctrine call stack that generated it, which makes pinpointing the source trivially fast.

---

## The `max_questions` Heroku Limit

{: class="marginalia" }
Heroku's free MySQL<br/>(via ClearDB) had a<br/>`max_questions` limit<br/>of 3600 per hour.<br/>The N+1 queries were<br/>eating through it in<br/>minutes.

I was running on Heroku's free tier with ClearDB (MySQL). What I didn't know until the app started failing in production was that ClearDB's free plan enforces a `max_questions` limit — a cap on the total number of SQL statements executed per hour.

My N+1 queries were burning through that limit every time a real user loaded the app.

<div class="danger">
  <strong>Error seen in production logs:</strong><br/>
  <code style="font-size:13px">SQLSTATE[HY000]: General error: 2006 MySQL server has gone away</code><br/><br/>
  This cryptic message was Heroku cutting off the connection after the quota was exhausted. It took me an embarrassingly long time to connect the dots between N+1 queries and this error.
</div>

The fix had two dimensions: eliminate the N+1 queries structurally, and also reduce unnecessary queries in the import pipeline. Commits `86dcf38` and `f036f4c` addressed the API layer; `2ba7d0e` fixed the CSV importer.

---

## The Fix — Eager JOIN Fetching in DQL

{: class="marginalia" }
Doctrine's default<br/>fetch mode is LAZY:<br/>it defers loading<br/>associations until<br/>you access them.<br/>Each access = a query.

Doctrine's default behaviour is **lazy loading**. When you call `$manga->getVolumes()`, Doctrine fires a `SELECT` right there. In a loop over forty manga, that's forty queries you never explicitly wrote — they materialise invisibly as your code iterates.

The pattern that caused the problem:

<p class="code-label before">❌ Before — implicit N+1</p>
<pre class="code-block"><span class="cmt">// MangaRepository.php</span>
<span class="kw">public function</span> <span class="fn">findAllWithStats</span>(): <span class="cls">array</span>
{
    <span class="cmt">// Returns Manga objects with lazy-loaded associations</span>
    <span class="kw">return</span> <span class="var">$this</span>-&gt;<span class="fn">findAll</span>();
}

<span class="cmt">// In the controller / serializer — each call below fires a query</span>
<span class="kw">foreach</span> (<span class="var">$mangas</span> <span class="kw">as</span> <span class="var">$manga</span>) {
    <span class="var">$volumeCount</span> = <span class="fn">count</span>(<span class="var">$manga</span>-&gt;<span class="fn">getVolumes</span>());  <span class="cmt">// QUERY #2, #3, #4 …</span>
    <span class="var">$cover</span>       = <span class="var">$manga</span>-&gt;<span class="fn">getCoverImage</span>();         <span class="cmt">// QUERY #N+2, #N+3 …</span>
}</pre>

The fix is to write an explicit DQL query that `JOIN FETCH`es the associations you know you'll need:

<p class="code-label after">✅ After — single eager JOIN</p>
<pre class="code-block"><span class="cmt">// MangaRepository.php</span>
<span class="kw">public function</span> <span class="fn">findAllWithVolumesAndCovers</span>(): <span class="cls">array</span>
{
    <span class="kw">return</span> <span class="var">$this</span>-&gt;<span class="fn">createQueryBuilder</span>(<span class="str">'m'</span>)
        -&gt;<span class="fn">select</span>(<span class="str">'m'</span>, <span class="str">'v'</span>, <span class="str">'c'</span>)
        -&gt;<span class="fn">leftJoin</span>(<span class="str">'m.volumes'</span>, <span class="str">'v'</span>)
        -&gt;<span class="fn">leftJoin</span>(<span class="str">'m.coverImage'</span>, <span class="str">'c'</span>)
        -&gt;<span class="fn">getQuery</span>()
        -&gt;<span class="fn">getResult</span>();
}

<span class="cmt">// Controller: volumes and coverImage are already hydrated —</span>
<span class="cmt">// accessing them fires ZERO additional queries</span>
<span class="kw">foreach</span> (<span class="var">$mangas</span> <span class="kw">as</span> <span class="var">$manga</span>) {
    <span class="var">$volumeCount</span> = <span class="fn">count</span>(<span class="var">$manga</span>-&gt;<span class="fn">getVolumes</span>());  <span class="cmt">// no query</span>
    <span class="var">$cover</span>       = <span class="var">$manga</span>-&gt;<span class="fn">getCoverImage</span>();         <span class="cmt">// no query</span>
}</pre>

After this change, the manga list endpoint dropped from 83 queries to **3**. Response time: from 4–6 seconds down to under 200ms.

<div class="tip">
  <strong>Rule of thumb:</strong> if you know you'll iterate over a collection and access a relationship, always JOIN FETCH it. If you only need it sometimes (e.g. a detail page vs a list page), keep separate repository methods for each use case.
</div>

---

## The COALESCE Wall — When DQL Isn't SQL

{: class="marginalia" }
Commit <code>ccae44c</code>:<br/>"fix: replace COALESCE<br/>DQL (unsupported) with<br/>two-query fallback".<br/>DQL is a subset of SQL<br/>— not everything<br/>translates directly.

After sorting the N+1 issue, I wanted to add a "known vocabulary percentage" to each manga — the proportion of words in the manga that the user had already learned. My first instinct was to reach for SQL's `COALESCE` to handle the null case when a user had no vocabulary records yet.

The DQL I tried:

<p class="code-label before">❌ Failing DQL with COALESCE</p>
<pre class="code-block"><span class="cmt">// This looks reasonable, but Doctrine's DQL parser rejects it</span>
<span class="var">$dql</span> = <span class="str">'SELECT m,
    COALESCE(
        (SELECT COUNT(uv.id)
         FROM App\Entity\UserVocabulary uv
         WHERE uv.manga = m AND uv.user = :user),
        0
    ) AS knownCount
FROM App\Entity\Manga m'</span>;

<span class="cmt">// Error thrown:</span>
<span class="cmt">// [Semantical Error] line 0, col 18 near 'COALESCE(': Error:</span>
<span class="cmt">// 'COALESCE' is not defined as a DQL function.</span></pre>

Doctrine's DQL supports a limited set of aggregate and scalar functions. `COALESCE` on a subquery result isn't one of them in the version I was on — it either rejected the syntax outright or silently mishandled the null.

The working solution was to split it into two queries and do the null-coalescing in PHP:

<p class="code-label after">✅ Two-query PHP fallback</p>
<pre class="code-block"><span class="cmt">// Query 1: fetch all manga</span>
<span class="var">$mangas</span> = <span class="var">$this</span>-&gt;<span class="fn">mangaRepository</span>-&gt;<span class="fn">findAllWithVolumesAndCovers</span>();

<span class="cmt">// Query 2: fetch known vocabulary counts for this user, keyed by manga ID</span>
<span class="var">$knownCounts</span> = <span class="var">$this</span>-&gt;<span class="fn">userVocabRepository</span>
    -&gt;<span class="fn">countKnownByMangaForUser</span>(<span class="var">$user</span>);
<span class="cmt">// Returns: ['manga_id' =&gt; count, ...]</span>

<span class="cmt">// PHP null-coalescing instead of SQL COALESCE</span>
<span class="kw">foreach</span> (<span class="var">$mangas</span> <span class="kw">as</span> <span class="var">$manga</span>) {
    <span class="var">$known</span> = <span class="var">$knownCounts</span>[<span class="var">$manga</span>-&gt;<span class="fn">getId</span>()] <span class="op">??</span> <span class="num">0</span>;
    <span class="var">$total</span> = <span class="var">$manga</span>-&gt;<span class="fn">getTotalVocabularyCount</span>();
    <span class="var">$pct</span>   = <span class="var">$total</span> &gt; <span class="num">0</span> ? <span class="fn">round</span>(<span class="var">$known</span> / <span class="var">$total</span> * <span class="num">100</span>) : <span class="num">0</span>;
    <span class="var">$manga</span>-&gt;<span class="fn">setKnownPercentage</span>(<span class="var">$pct</span>);
}</pre>

Two queries instead of 83, and no DQL parsing headaches. The slight redundancy of loading all counts upfront is trivially cheap compared to the N+1 alternative.

---

## Density Score — How Vocabulary-Heavy Is a Page?

{: class="marginalia" }
Commit <code>3ad213b</code>:<br/>"feat: add<br/>uniqueVocabCount and<br/>densityScore per page<br/>in volume API".<br/>Users use this to pick<br/>which pages to study.

One feature I'm genuinely proud of is the **density score**. It's a simple metric, but it turned out to be exactly what users wanted: a way to quickly identify which pages are good study material versus action pages dominated by sound effects.

The formula:

<pre class="code-block"><span class="cmt">// densityScore: how "vocabulary dense" is this page?</span>
<span class="var">$densityScore</span> = <span class="var">$uniqueWordCount</span> / <span class="fn">max</span>(<span class="var">$totalWordCount</span>, <span class="num">1</span>) * <span class="var">$depthWeight</span>;

<span class="cmt">// depthWeight: discount pages with very few words (splash pages, etc.)</span>
<span class="var">$depthWeight</span> = <span class="fn">min</span>(<span class="var">$totalWordCount</span> / <span class="num">10.0</span>, <span class="num">1.0</span>);

<span class="cmt">// Result: 0.0 (pure repetition / sound effects)</span>
<span class="cmt">//     to: 1.0 (every word is unique and the page has many words)</span></pre>

Try it below — drag the sliders to explore how the score reacts to different page compositions:

<div class="density-calc">
  <h3>🧮 Density Score Calculator</h3>
  <div class="slider-group">
    <label>Total words on page <span id="totalWordsVal">20</span></label>
    <input type="range" id="totalWordsSlider" min="0" max="50" value="20">
  </div>
  <div class="slider-group">
    <label>Unique words <span id="uniqueWordsVal">12</span></label>
    <input type="range" id="uniqueWordsSlider" min="0" max="50" value="12">
  </div>
  <div class="density-result">
    <div class="density-gauge" id="densityGauge">
      <div class="dg-val" id="densityVal">0.00</div>
      <div class="dg-label">Score</div>
    </div>
    <div class="density-desc">
      <div class="dd-title" id="densityTitle">Medium density</div>
      <div class="dd-sub" id="densitySub">A decent mix of vocabulary. Worth studying but not exceptional.</div>
      <div class="density-bar-wrap">
        <div class="density-bar-track">
          <div class="density-bar-fill" id="densityBarFill" style="width:0%"></div>
        </div>
        <div class="density-legend">
          <span class="dl-low">Low (&lt;0.3)</span>
          <span class="dl-med">Medium (0.3–0.7)</span>
          <span class="dl-high">High (&gt;0.7)</span>
        </div>
      </div>
    </div>
  </div>
</div>

Action pages — panels filled with `ドカーン!` and `ガガガ!` — score near zero. Dialogue-heavy pages, especially those with a variety of N3/N2 vocabulary, score near 1.0. Users can sort pages by density score and build targeted study sessions.

---

## Volume Read Progress Tracking

{: class="marginalia" }
Commit <code>363ecb9</code>:<br/>"feat: volume read<br/>progress tracking<br/>(unread/reading/<br/>completed)".<br/>Simple state machine,<br/>big UX win.

Tracking read progress feels obvious in retrospect, but it wasn't in the original spec. A user asked: *"can I mark which volumes I've already read so I don't re-study vocabulary I already know from that volume?"*

The data model is straightforward — a join table with a status enum:

<pre class="code-block"><span class="cmt">// VolumeProgress.php entity</span>
<span class="ann">#[ORM\Entity]</span>
<span class="kw">class</span> <span class="cls">VolumeProgress</span>
{
    <span class="ann">#[ORM\ManyToOne(targetEntity: User::class)]</span>
    <span class="kw">private</span> <span class="cls">User</span> <span class="var">$user</span>;

    <span class="ann">#[ORM\ManyToOne(targetEntity: Volume::class)]</span>
    <span class="kw">private</span> <span class="cls">Volume</span> <span class="var">$volume</span>;

    <span class="ann">#[ORM\Column(type: <span class="str">'string'</span>, enumType: ReadStatus::class)]</span>
    <span class="kw">private</span> <span class="cls">ReadStatus</span> <span class="var">$status</span> = <span class="cls">ReadStatus</span>::<span class="var">UNREAD</span>;
}

<span class="kw">enum</span> <span class="cls">ReadStatus</span>: <span class="cls">string</span>
{
    <span class="kw">case</span> <span class="var">UNREAD</span>    = <span class="str">'unread'</span>;
    <span class="kw">case</span> <span class="var">READING</span>   = <span class="str">'reading'</span>;
    <span class="kw">case</span> <span class="var">COMPLETED</span> = <span class="str">'completed'</span>;
}</pre>

The UI cycles through the three states on click. Try it:

<div class="shelf-demo">
  <h3>📚 Volume Progress Shelf</h3>
  <p class="shelf-hint">Click any volume to cycle: unread → reading → completed</p>
  <div class="shelf-volumes" id="shelfVolumes"></div>
  <div class="shelf-summary" id="shelfSummary"></div>
</div>

On the backend, the API accepts a `PATCH /api/volumes/{id}/progress` with `{"status": "reading"}`. The status feeds back into the vocabulary learning system: completed volumes' words get lower priority in flashcard queues.

---

## The Common Vocabulary Endpoint

{: class="marginalia" }
Commit <code>b936b14</code>:<br/>"feat: add GET<br/>/api/vocabulary/<br/>common endpoint".<br/>The most useful<br/>endpoint in the<br/>whole API.

`GET /api/vocabulary/common` returns words that appear most frequently across the user's manga library — filtered to exclude words the user already knows. It's the "what should I learn next" endpoint.

The DQL is a subquery that ranks by occurrence count:

<pre class="code-block"><span class="cmt">// VocabularyRepository.php</span>
<span class="kw">public function</span> <span class="fn">findCommonUnknown</span>(<span class="cls">User</span> <span class="var">$user</span>, <span class="cls">int</span> <span class="var">$limit</span> = <span class="num">20</span>): <span class="cls">array</span>
{
    <span class="kw">return</span> <span class="var">$this</span>-&gt;<span class="fn">createQueryBuilder</span>(<span class="str">'v'</span>)
        -&gt;<span class="fn">select</span>(<span class="str">'v'</span>, <span class="str">'COUNT(pv.id) AS HIDDEN occurrences'</span>)
        -&gt;<span class="fn">join</span>(<span class="str">'v.pageVocabularies'</span>, <span class="str">'pv'</span>)
        <span class="cmt">// exclude words the user already knows</span>
        -&gt;<span class="fn">leftJoin</span>(
            <span class="str">'App\Entity\UserVocabulary'</span>, <span class="str">'uv'</span>,
            <span class="str">'WITH'</span>,
            <span class="str">'uv.vocabulary = v AND uv.user = :user'</span>
        )
        -&gt;<span class="fn">where</span>(<span class="str">'uv.id IS NULL'</span>)
        -&gt;<span class="fn">setParameter</span>(<span class="str">'user'</span>, <span class="var">$user</span>)
        -&gt;<span class="fn">groupBy</span>(<span class="str">'v.id'</span>)
        -&gt;<span class="fn">orderBy</span>(<span class="str">'occurrences'</span>, <span class="str">'DESC'</span>)
        -&gt;<span class="fn">setMaxResults</span>(<span class="var">$limit</span>)
        -&gt;<span class="fn">getQuery</span>()
        -&gt;<span class="fn">getResult</span>();
}</pre>

Note the `HIDDEN` keyword in the `select` clause — this is a DQL trick that lets you use the aliased aggregate in `orderBy` without Doctrine trying to hydrate it as an entity field.

The frequency histogram below shows sample output. Toggle words you know to remove them from the queue:

<div class="vocab-chart">
  <h3>📊 Common Vocabulary — Frequency Chart</h3>
  <p class="vocab-chart-hint">Check words you know — they'll be removed from the learning queue.</p>
  <div id="vocabRows"></div>
  <div class="vocab-chart-footer" id="vocabFooter"></div>
</div>

---

## Lessons Learned

{: class="marginalia" }
Flip each card to<br/>reveal the lesson<br/>behind the headline.

<p class="flip-hint">👆 Click any card to flip it</p>
<div class="flip-grid" id="flipGrid"></div>

---

## What the Numbers Looked Like

To put the improvement in perspective:

| Metric | Before | After |
|--------|--------|-------|
| Queries per `/api/manga` | 83 | 3 |
| Response time (avg) | 4 800 ms | 185 ms |
| ClearDB `max_questions` / hour used | ~3 600 (full quota) | ~210 |
| Time to `MySQL server has gone away` | ~15 min of usage | never |

The indexes on `volume.manga_id`, `page.volume_id`, and `user_vocabulary.user_id` were added as part of the same sprint (`741fdfb`). Without them, even the JOINed queries would have been doing full table scans.

<div class="tip">
  <strong>Add indexes to every foreign key column.</strong> Doctrine won't do this automatically. In Symfony you add them via <code>#[ORM\Index]</code> on the entity or via a migration. It's boilerplate, but it's the difference between a 3ms lookup and a 300ms scan on a table with 50k rows.
</div>

---

<div class="next-up">
  <div class="nu-icon">🚀</div>
  <div class="nu-body">
    <div class="nu-eyebrow">Up next — Part 4</div>
    <div class="nu-title">Deploying to Heroku with RDS and S3</div>
    <div class="nu-desc">
      The ephemeral filesystem disaster, why uploaded manga pages vanished on every dyno restart,
      migrating from ClearDB to Amazon RDS, and the environmental variable rabbit hole.
    </div>
  </div>
</div>

<!-- =====================================================================
     ALL JAVASCRIPT
     ===================================================================== -->
<script>
(function () {
"use strict";

/* ── N+1 Visualizer ────────────────────────────────────────────────────── */
(function initN1() {

  var MANGA = [
    { name: "Berserk",         icon: "⚔️"  },
    { name: "One Piece",       icon: "🏴‍☠️" },
    { name: "Fullmetal Alchemist", icon: "⚗️" },
    { name: "Vinland Saga",    icon: "🪓"  },
    { name: "Vagabond",        icon: "🗡️"  }
  ];

  var isN1Mode = true;
  var isRunning = false;

  var modeN1Btn  = document.getElementById("modeN1Btn");
  var modeOptBtn = document.getElementById("modeOptBtn");
  var loadBtn    = document.getElementById("n1LoadBtn");
  var mangaList  = document.getElementById("n1MangaList");
  var queryLog   = document.getElementById("n1QueryLog");
  var dbIcon     = document.getElementById("n1DbIcon");
  var ping       = document.getElementById("n1Ping");
  var countEl    = document.getElementById("n1QueryCount");
  var timeEl     = document.getElementById("n1TimeVal");
  var statusEl   = document.getElementById("n1StatusTxt");
  var statQEl    = document.getElementById("n1StatQueries");
  var statTEl    = document.getElementById("n1StatTime");

  function buildRows() {
    mangaList.innerHTML = "";
    MANGA.forEach(function (m) {
      var row = document.createElement("div");
      row.className = "n1-manga-row";
      row.id = "n1row-" + m.name.replace(/\s/g, "-");
      row.innerHTML = "<span class='m-icon'>" + m.icon + "</span>"
        + "<span class='m-name'>" + m.name + "</span>"
        + "<span class='m-badge' id='badge-" + m.name.replace(/\s/g, "-") + "'>—</span>";
      mangaList.appendChild(row);
    });
  }

  function resetUI() {
    buildRows();
    queryLog.innerHTML = "<span style='color:rgba(255,255,255,.25);font-size:11px'>— queries will appear here —</span>";
    countEl.textContent = "0";
    timeEl.textContent  = "0ms";
    statusEl.textContent = "idle";
    statusEl.style.color = "rgba(255,255,255,.5)";
    statQEl.classList.remove("bad");
    statTEl.classList.remove("bad");
  }

  function addQuery(text, cls) {
    if (queryLog.querySelector("span[style]")) queryLog.innerHTML = "";
    var e = document.createElement("div");
    e.className = "ql-entry " + cls;
    e.textContent = text;
    queryLog.appendChild(e);
    queryLog.scrollTop = queryLog.scrollHeight;
  }

  function fireDbPing() {
    ping.classList.remove("fly");
    void ping.offsetWidth;
    ping.classList.add("fly");
    dbIcon.classList.remove("hit");
    void dbIcon.offsetWidth;
    dbIcon.classList.add("hit");
  }

  function delay(ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  }

  function setCount(n) {
    countEl.textContent = n;
    if (n > 5) {
      statQEl.classList.add("bad");
      countEl.style.color = "#f08080";
    }
  }

  function setTime(ms) {
    timeEl.textContent = ms + "ms";
    if (ms > 200) {
      statTEl.classList.add("bad");
      timeEl.style.color = "#f08080";
    }
  }

  async function runN1() {
    var q = 0;
    var t = 0;

    statusEl.textContent = "running…";
    statusEl.style.color = "#fbef8a";

    // Query 1: fetch manga list
    fireDbPing();
    addQuery("SELECT * FROM manga LIMIT 20", "type-list");
    q++; t += 12;
    setCount(q); setTime(t);
    await delay(500);

    // Per-manga: volumes
    addQuery("— fetching volumes for each manga —", "type-vol");
    for (var i = 0; i < MANGA.length; i++) {
      var key = MANGA[i].name.replace(/\s/g, "-");
      var row = document.getElementById("n1row-" + key);
      if (row) row.classList.add("querying");
      fireDbPing();
      addQuery("SELECT * FROM volume WHERE manga_id = " + (i + 1), "type-vol");
      q++; t += 15;
      setCount(q); setTime(t);
      await delay(300);
    }

    // Per-manga: covers
    addQuery("— fetching cover images for each manga —", "type-cov");
    for (var j = 0; j < MANGA.length; j++) {
      fireDbPing();
      addQuery("SELECT * FROM cover_image WHERE manga_id = " + (j + 1), "type-cov");
      q++; t += 14;
      setCount(q); setTime(t);
      await delay(250);
      var key2 = MANGA[j].name.replace(/\s/g, "-");
      var row2 = document.getElementById("n1row-" + key2);
      var badge = document.getElementById("badge-" + key2);
      if (row2) { row2.classList.remove("querying"); row2.classList.add("done"); }
      if (badge) badge.textContent = "loaded";
    }

    statusEl.textContent = "done — " + q + " queries!";
    statusEl.style.color = "#f08080";
  }

  async function runOptimized() {
    statusEl.textContent = "running…";
    statusEl.style.color = "#fbef8a";

    fireDbPing();
    addQuery(
      "SELECT m.*, v.*, c.*\n"
      + "  FROM manga m\n"
      + "  LEFT JOIN volume v ON v.manga_id = m.id\n"
      + "  LEFT JOIN cover_image c ON c.manga_id = m.id",
      "type-join"
    );
    var t = 18;
    setCount(1); setTime(t);
    await delay(400);

    // Mark all rows done immediately
    MANGA.forEach(function (m) {
      var key = m.name.replace(/\s/g, "-");
      var row = document.getElementById("n1row-" + key);
      var badge = document.getElementById("badge-" + key);
      if (row) row.classList.add("done");
      if (badge) badge.textContent = "loaded";
    });

    statusEl.textContent = "done — 1 query ✓";
    statusEl.style.color = "#7bcdab";
    countEl.style.color  = "#7bcdab";
    timeEl.style.color   = "#7bcdab";
  }

  modeN1Btn.addEventListener("click", function () {
    if (isRunning) return;
    isN1Mode = true;
    modeN1Btn.classList.add("active");
    modeOptBtn.classList.remove("active");
    resetUI();
  });

  modeOptBtn.addEventListener("click", function () {
    if (isRunning) return;
    isN1Mode = false;
    modeOptBtn.classList.add("active");
    modeN1Btn.classList.remove("active");
    resetUI();
    countEl.style.color = "#7bcdab";
    timeEl.style.color  = "#7bcdab";
    statQEl.classList.remove("bad");
    statTEl.classList.remove("bad");
  });

  loadBtn.addEventListener("click", function () {
    if (isRunning) return;
    isRunning = true;
    loadBtn.disabled = true;
    resetUI();

    var run = isN1Mode ? runN1() : runOptimized();
    run.then(function () {
      isRunning = false;
      loadBtn.disabled = false;
    });
  });

  buildRows();
})();

/* ── Profiler mockup ───────────────────────────────────────────────────── */
(function initProfiler() {
  var rows = [
    { t: "2ms",  sql: "SELECT m0_.id, m0_.title, m0_.slug FROM manga m0_",                                 cls: "type-list", highlight: false },
    { t: "14ms", sql: "SELECT v0_.id, v0_.number FROM volume v0_ WHERE v0_.manga_id = 1",                  cls: "type-vol",  highlight: true  },
    { t: "13ms", sql: "SELECT v0_.id, v0_.number FROM volume v0_ WHERE v0_.manga_id = 2",                  cls: "type-vol",  highlight: true  },
    { t: "12ms", sql: "SELECT v0_.id, v0_.number FROM volume v0_ WHERE v0_.manga_id = 3",                  cls: "type-vol",  highlight: true  },
    { t: "15ms", sql: "SELECT v0_.id, v0_.number FROM volume v0_ WHERE v0_.manga_id = 4",                  cls: "type-vol",  highlight: true  },
    { t: "11ms", sql: "SELECT v0_.id, v0_.number FROM volume v0_ WHERE v0_.manga_id = 5",                  cls: "type-vol",  highlight: true  },
    { t: "13ms", sql: "SELECT c0_.id, c0_.path FROM cover_image c0_ WHERE c0_.manga_id = 1",               cls: "type-cov",  highlight: true  },
    { t: "14ms", sql: "SELECT c0_.id, c0_.path FROM cover_image c0_ WHERE c0_.manga_id = 2",               cls: "type-cov",  highlight: true  },
    { t: "12ms", sql: "SELECT c0_.id, c0_.path FROM cover_image c0_ WHERE c0_.manga_id = 3",               cls: "type-cov",  highlight: true  },
    { t: "11ms", sql: "SELECT c0_.id, c0_.path FROM cover_image c0_ WHERE c0_.manga_id = 4",               cls: "type-cov",  highlight: true  },
    { t: "13ms", sql: "SELECT c0_.id, c0_.path FROM cover_image c0_ WHERE c0_.manga_id = 5",               cls: "type-cov",  highlight: true  },
    { t: "…",   sql: "… 72 more queries (manga_id = 6 through 40) …",                                      cls: "",          highlight: false },
  ];

  var container = document.getElementById("profilerRows");
  rows.forEach(function (r, i) {
    var div = document.createElement("div");
    div.className = "p-row" + (r.highlight ? " highlight" : "");
    div.innerHTML = "<span class='p-num'>" + (i + 1) + "</span>"
      + "<span class='p-time'>" + r.t + "</span>"
      + "<span class='p-sql'>" + r.sql + "</span>";
    container.appendChild(div);
  });
})();

/* ── Density Score Calculator ──────────────────────────────────────────── */
(function initDensity() {
  var totalSlider  = document.getElementById("totalWordsSlider");
  var uniqueSlider = document.getElementById("uniqueWordsSlider");
  var totalVal     = document.getElementById("totalWordsVal");
  var uniqueVal    = document.getElementById("uniqueWordsVal");
  var scoreEl      = document.getElementById("densityVal");
  var gaugeEl      = document.getElementById("densityGauge");
  var titleEl      = document.getElementById("densityTitle");
  var subEl        = document.getElementById("densitySub");
  var barFill      = document.getElementById("densityBarFill");

  function update() {
    var total  = parseInt(totalSlider.value, 10);
    var unique = Math.min(parseInt(uniqueSlider.value, 10), total);

    // keep unique slider capped
    if (parseInt(uniqueSlider.value, 10) > total) {
      uniqueSlider.value = total;
    }
    uniqueVal.textContent = unique;
    totalVal.textContent  = total;

    var depthWeight = Math.min(total / 10.0, 1.0);
    var ratio       = total > 0 ? unique / total : 0;
    var score       = ratio * depthWeight;

    scoreEl.textContent = score.toFixed(2);
    barFill.style.width = Math.round(score * 100) + "%";

    var color, title, sub;
    if (score < 0.3) {
      color = "#f08080";
      title = total < 5 ? "Splash / title page" : "Low density";
      sub   = total < 5
        ? "Very few words — likely a splash page or title spread."
        : "Mostly sound effects or repeated vocabulary. Lower study value.";
    } else if (score < 0.7) {
      color = "#fbef8a";
      title = "Medium density";
      sub   = "A decent mix of vocabulary. Worth studying but not exceptional.";
    } else {
      color = "#7bcdab";
      title = "High density ✨";
      sub   = "Rich, varied vocabulary. Excellent study material — prioritise this page.";
    }

    gaugeEl.style.borderColor = color;
    scoreEl.style.color       = color;
    titleEl.style.color       = color;
    titleEl.textContent       = title;
    subEl.textContent         = sub;
    barFill.style.background  = color;
  }

  totalSlider.addEventListener("input", update);
  uniqueSlider.addEventListener("input", update);
  update();
})();

/* ── Manga Shelf ───────────────────────────────────────────────────────── */
(function initShelf() {
  var VOLUMES = [
    { num: 1, title: "Vol. 1", icon: "📕" },
    { num: 2, title: "Vol. 2", icon: "📗" },
    { num: 3, title: "Vol. 3", icon: "📘" },
    { num: 4, title: "Vol. 4", icon: "📙" },
    { num: 5, title: "Vol. 5", icon: "📔" }
  ];

  var STATUSES = ["unread", "reading", "completed"];
  var STATUS_ICONS  = { unread: "○", reading: "◑", completed: "●" };
  var state = { 1: "unread", 2: "reading", 3: "unread", 4: "completed", 5: "unread" };

  var container = document.getElementById("shelfVolumes");
  var summary   = document.getElementById("shelfSummary");

  function render() {
    container.innerHTML = "";
    VOLUMES.forEach(function (v) {
      var status = state[v.num];
      var outer = document.createElement("div");
      outer.className = "shelf-vol";
      outer.innerHTML = "<div class='vol-spine " + status + "' title='Click to change status'>"
        + "<span class='vol-icon'>" + v.icon + "</span>"
        + "<span class='vol-num'>" + v.title + "</span>"
        + "<span class='vol-status-dot'></span>"
        + "</div>"
        + "<div class='vol-label'>" + STATUS_ICONS[status] + " " + status + "</div>";
      outer.addEventListener("click", function () {
        var idx = STATUSES.indexOf(state[v.num]);
        state[v.num] = STATUSES[(idx + 1) % STATUSES.length];
        render();
      });
      container.appendChild(outer);
    });
    renderSummary();
  }

  function renderSummary() {
    var counts = { unread: 0, reading: 0, completed: 0 };
    Object.values(state).forEach(function (s) { counts[s]++; });

    summary.innerHTML = STATUSES.map(function (s) {
      return "<div class='ss-item'>"
        + "<div class='ss-dot " + s + "'></div>"
        + "<span class='ss-count'>" + counts[s] + "</span>"
        + "<span style='color:rgba(255,255,255,.45)'>" + s + "</span>"
        + "</div>";
    }).join("");
  }

  render();
})();

/* ── Vocabulary Frequency Histogram ───────────────────────────────────── */
(function initVocab() {
  var WORDS = [
    { word: "食べる", reading: "taberu",   freq: 94, known: false },
    { word: "強い",   reading: "tsuyoi",   freq: 87, known: false },
    { word: "行く",   reading: "iku",      freq: 82, known: true  },
    { word: "剣",     reading: "ken",      freq: 75, known: false },
    { word: "戦う",   reading: "tatakau",  freq: 68, known: false },
    { word: "仲間",   reading: "nakama",   freq: 61, known: true  },
    { word: "力",     reading: "chikara",  freq: 55, known: false },
    { word: "敵",     reading: "teki",     freq: 48, known: false },
    { word: "夢",     reading: "yume",     freq: 41, known: false },
    { word: "覚悟",   reading: "kakugo",   freq: 34, known: false }
  ];

  var maxFreq = Math.max.apply(null, WORDS.map(function (w) { return w.freq; }));
  var container = document.getElementById("vocabRows");
  var footer    = document.getElementById("vocabFooter");

  function renderRows() {
    container.innerHTML = "";
    WORDS.forEach(function (w, idx) {
      var row = document.createElement("div");
      row.className = "vocab-row" + (w.known ? " known" : "");
      row.id = "vrow-" + idx;

      var pct = Math.round(w.freq / maxFreq * 100);
      var checkIcon = w.known ? "✓" : "";

      row.innerHTML = "<div class='vr-check" + (w.known ? " checked" : "") + "' data-idx='" + idx + "'>"
        + checkIcon + "</div>"
        + "<span class='vr-word'>" + w.word + "</span>"
        + "<span class='vr-reading'>" + w.reading + "</span>"
        + "<div class='vr-bar-wrap'>"
        + "<div class='vr-bar-bg'>"
        + "<div class='vr-bar-fill' style='width:" + pct + "%'></div>"
        + "</div></div>"
        + "<span class='vr-count'>" + w.freq + "×</span>";

      container.appendChild(row);

      row.querySelector(".vr-check").addEventListener("click", function () {
        WORDS[idx].known = !WORDS[idx].known;
        renderRows();
        renderFooter();
      });
    });
  }

  function renderFooter() {
    var unknown = WORDS.filter(function (w) { return !w.known; }).length;
    var known   = WORDS.length - unknown;
    footer.innerHTML = "<strong>" + unknown + " words</strong> remaining in queue &nbsp;·&nbsp; "
      + known + " marked as known";
  }

  renderRows();
  renderFooter();
})();

/* ── Flip Cards ────────────────────────────────────────────────────────── */
(function initFlipCards() {
  var CARDS = [
    {
      emoji: "🔬",
      title: "Always profile before optimising",
      lesson: "<strong>The Symfony Profiler</strong> shows exactly how many queries each request fires, with stack traces. Without it I'd have been guessing. Profile first — the bottleneck is rarely where you think it is."
    },
    {
      emoji: "🪤",
      title: "Doctrine lazy loading is a trap",
      lesson: "<strong>Lazy loading is the default</strong> and it's fine for small collections. But with lists, it's a catastrophe. Use <code>fetch: EAGER</code> in the entity mapping, or write explicit DQL with <code>JOIN FETCH</code> for any relationship you know you'll iterate over."
    },
    {
      emoji: "📦",
      title: "Test with production-scale data",
      lesson: "Ten records feels fast. <strong>500 records exposes everything</strong>. I should have seeded a realistic dataset from day one. The N+1 was invisible in dev and catastrophic in prod."
    },
    {
      emoji: "🔣",
      title: "DQL ≠ SQL",
      lesson: "Doctrine's DQL is a <strong>typed, ORM-aware query language</strong> — not raw SQL. Some SQL features (COALESCE on subqueries, certain window functions) need workarounds or PHP-side logic. Know the limits before you design the query."
    },
    {
      emoji: "🗂️",
      title: "Index your foreign keys",
      lesson: "<strong>Doctrine creates foreign keys but not indexes on them</strong> by default. Every <code>manga_id</code>, <code>volume_id</code>, and <code>user_id</code> column needs an index. Without them, even a single JOIN query does a full table scan."
    }
  ];

  var grid = document.getElementById("flipGrid");

  CARDS.forEach(function (c, i) {
    var card = document.createElement("div");
    card.className = "flip-card";
    card.innerHTML = "<div class='flip-inner'>"
      + "<div class='flip-face flip-front'>"
      + "<div class='ff-num'>Lesson " + (i + 1) + "</div>"
      + "<div class='ff-emoji'>" + c.emoji + "</div>"
      + "<div class='ff-title'>" + c.title + "</div>"
      + "</div>"
      + "<div class='flip-face flip-back'>"
      + "<div class='fb-lesson'>" + c.lesson + "</div>"
      + "</div>"
      + "</div>";
    card.addEventListener("click", function () {
      card.classList.toggle("flipped");
    });
    grid.appendChild(card);
  });
})();

})();
</script>
