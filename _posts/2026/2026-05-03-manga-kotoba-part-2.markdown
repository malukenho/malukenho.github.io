---
layout: post
title: "Manga Kotoba, Part 2: Scraping, AI Extraction, and the Vocabulary Engine"
date: 2026-05-03 10:00:00 +0000
tags: [php, symfony, ai, gemini, scraping, japanese]
series: manga-kotoba
---

<style>
/* ── Series banner ──────────────────────────────────────────────────────── */
.series-banner {
  background: #1e1f24;
  border: 1px solid #2e2f35;
  border-radius: 12px;
  padding: 18px 22px;
  margin: 0 0 2.4rem;
}
.series-banner .sb-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: rgba(255,255,255,.4);
  margin-bottom: 10px;
}
.series-banner .sb-parts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.series-banner .sb-part {
  flex: 1;
  min-width: 80px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  border: 1px solid #2e2f35;
  color: rgba(255,255,255,.45);
  background: #19191c;
  line-height: 1.4;
}
.series-banner .sb-part.active {
  background: #fbef8a;
  color: #19191c;
  border-color: #fbef8a;
}
.series-banner .sb-part.done {
  background: #1a2e23;
  color: #7bcdab;
  border-color: #7bcdab33;
}

/* ── General post styles ────────────────────────────────────────────────── */
.mk2-section { margin: 2.8rem 0; }

.tip-box {
  border-left: 3px solid #7bcdab;
  background: #1a2e23;
  border-radius: 0 8px 8px 0;
  padding: 12px 18px;
  margin: 1.4rem 0;
  font-size: 14px;
  line-height: 1.75;
}
.tip-box strong { color: #7bcdab; }

.warn-box {
  border-left: 3px solid #fbef8a;
  background: #252515;
  border-radius: 0 8px 8px 0;
  padding: 12px 18px;
  margin: 1.4rem 0;
  font-size: 14px;
  line-height: 1.75;
}
.warn-box strong { color: #fbef8a; }

pre.code-block {
  background: #111113;
  border: 1px solid #2e2f35;
  border-radius: 8px;
  padding: 18px 20px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.75;
  margin: 1.4rem 0;
  font-family: 'JetBrains Mono', monospace;
}
pre.code-block .kw  { color: #c792ea; }
pre.code-block .fn  { color: #82aaff; }
pre.code-block .str { color: #c3e88d; }
pre.code-block .cm  { color: #546e7a; font-style: italic; }
pre.code-block .ty  { color: #ffcb6b; }
pre.code-block .nm  { color: #f78c6c; }
pre.code-block .kv  { color: #7bcdab; }
pre.code-block .px  { color: #89ddff; }

/* ── Pipeline diagram ───────────────────────────────────────────────────── */
.pipeline-wrap {
  background: #1e1f24;
  border: 1px solid #2e2f35;
  border-radius: 12px;
  padding: 28px 24px 20px;
  margin: 1.6rem 0;
}
.pipeline-wrap h3 {
  margin: 0 0 22px;
  color: #fbef8a;
  font-size: 15px;
}
.pipeline-stages {
  display: flex;
  align-items: stretch;
  gap: 0;
  flex-wrap: wrap;
  justify-content: center;
}
.pipeline-stage {
  background: #19191c;
  border: 1.5px solid #3a3b40;
  border-radius: 8px;
  padding: 12px 14px;
  min-width: 110px;
  max-width: 130px;
  text-align: center;
  cursor: pointer;
  transition: border-color .2s, transform .15s;
  position: relative;
  flex: 1;
}
.pipeline-stage:hover,
.pipeline-stage.active {
  border-color: #7bcdab;
  transform: translateY(-3px);
}
.pipeline-stage.active { border-color: #fbef8a; background: #252515; }
.pipeline-stage .ps-icon { font-size: 22px; display: block; margin-bottom: 6px; }
.pipeline-stage .ps-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,.75);
  text-transform: uppercase;
  letter-spacing: .06em;
  line-height: 1.35;
}
.pipeline-arrow {
  display: flex;
  align-items: center;
  padding: 0 4px;
  color: #3a3b40;
  font-size: 20px;
  flex-shrink: 0;
  align-self: center;
}
.pipeline-arrow.animated { animation: arrowPulse 1.4s infinite; }
@keyframes arrowPulse {
  0%, 100% { color: #3a3b40; }
  50% { color: #7bcdab; }
}
.pipeline-snippet {
  margin-top: 18px;
  display: none;
  animation: fadeInUp .25s ease;
}
.pipeline-snippet.visible { display: block; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.pipeline-snippet-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #fbef8a;
  margin-bottom: 8px;
  font-weight: 700;
}

/* ── CSV import demo ────────────────────────────────────────────────────── */
.csv-demo {
  background: #1e1f24;
  border: 1px solid #2e2f35;
  border-radius: 12px;
  padding: 24px;
  margin: 1.6rem 0;
}
.csv-demo h3 { margin: 0 0 16px; color: #fbef8a; font-size: 15px; }
.csv-textarea {
  width: 100%;
  background: #111113;
  border: 1px solid #3a3b40;
  border-radius: 6px;
  color: #c3e88d;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  padding: 12px 14px;
  line-height: 1.7;
  resize: vertical;
  min-height: 130px;
  box-sizing: border-box;
  outline: none;
}
.csv-textarea:focus { border-color: #7bcdab; }
.import-btn {
  margin-top: 12px;
  padding: 9px 22px;
  background: #7bcdab;
  color: #19191c;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: opacity .2s;
}
.import-btn:hover { opacity: .85; }
.import-btn:disabled { opacity: .4; cursor: not-allowed; }
.import-rows {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.import-row-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #19191c;
  border: 1px solid #2e2f35;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
  opacity: 0;
  transform: translateX(-10px);
  transition: opacity .3s, transform .3s, border-color .3s;
}
.import-row-item.visible { opacity: 1; transform: translateX(0); }
.import-row-item.ok { border-color: #7bcdab33; }
.import-row-item.dup { border-color: #fbef8a33; }
.import-row-item.err { border-color: #f0808033; }
.import-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}
.badge-ok  { background: #1a3a2a; color: #7bcdab; }
.badge-dup { background: #2a2a1a; color: #fbef8a; }
.badge-err { background: #3a1a1a; color: #f08080; }
.import-summary {
  margin-top: 14px;
  background: #252629;
  border-radius: 8px;
  padding: 12px 18px;
  font-size: 14px;
  display: none;
  gap: 20px;
  flex-wrap: wrap;
}
.import-summary.visible { display: flex; }
.import-summary .is-stat .is-num {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}
.import-summary .is-stat .is-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: rgba(255,255,255,.45);
  margin-top: 2px;
}
.is-ok  .is-num { color: #7bcdab; }
.is-dup .is-num { color: #fbef8a; }
.is-err .is-num { color: #f08080; }

/* ── Benchmark bars ─────────────────────────────────────────────────────── */
.bench-wrap {
  background: #1e1f24;
  border: 1px solid #2e2f35;
  border-radius: 12px;
  padding: 24px;
  margin: 1.6rem 0;
}
.bench-wrap h3 { margin: 0 0 20px; color: #fbef8a; font-size: 15px; }
.bench-row {
  margin-bottom: 16px;
}
.bench-row-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}
.bench-row-label { color: rgba(255,255,255,.75); font-weight: 600; }
.bench-row-time { font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.bench-row-time.slow { color: #f08080; }
.bench-row-time.fast { color: #7bcdab; }
.bench-bar-bg {
  background: #2e2f35;
  border-radius: 6px;
  height: 10px;
  overflow: hidden;
}
.bench-bar-fill {
  height: 100%;
  border-radius: 6px;
  width: 0;
  transition: width 1.1s cubic-bezier(.4,0,.2,1);
}
.bench-bar-fill.slow { background: linear-gradient(90deg, #f08080, #c04040); }
.bench-bar-fill.fast { background: linear-gradient(90deg, #3a8a6a, #7bcdab); }
.bench-note {
  font-size: 12px;
  color: rgba(255,255,255,.4);
  margin-top: 8px;
}
.bench-animate-btn {
  padding: 7px 18px;
  background: transparent;
  border: 1px solid #3a3b40;
  color: rgba(255,255,255,.65);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 18px;
  transition: border-color .2s, color .2s;
}
.bench-animate-btn:hover { border-color: #7bcdab; color: #fff; }

/* ── ER diagram ─────────────────────────────────────────────────────────── */
.er-wrap {
  background: #1e1f24;
  border: 1px solid #2e2f35;
  border-radius: 12px;
  padding: 24px;
  margin: 1.6rem 0;
  overflow-x: auto;
}
.er-wrap h3 { margin: 0 0 20px; color: #fbef8a; font-size: 15px; }
.er-diagram {
  display: flex;
  align-items: flex-start;
  gap: 0;
  min-width: 480px;
  justify-content: center;
}
.er-entity {
  background: #19191c;
  border: 1.5px solid #3a3b40;
  border-radius: 8px;
  min-width: 150px;
  overflow: hidden;
}
.er-entity-name {
  background: #252515;
  border-bottom: 1px solid #3a3b40;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #fbef8a;
  font-family: 'JetBrains Mono', monospace;
}
.er-entity-fields {
  padding: 10px 14px;
}
.er-field {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(255,255,255,.65);
  line-height: 1.8;
}
.er-field.pk { color: #7bcdab; font-weight: 700; }
.er-field.fk { color: #82aaff; }
.er-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  gap: 4px;
  align-self: center;
}
.er-connector-line {
  width: 40px;
  height: 2px;
  background: #3a3b40;
}
.er-connector-label {
  font-size: 10px;
  color: rgba(255,255,255,.35);
  white-space: nowrap;
}

/* ── Admin mockup ───────────────────────────────────────────────────────── */
.admin-mock {
  background: #1e1f24;
  border: 1px solid #2e2f35;
  border-radius: 12px;
  padding: 0;
  margin: 1.6rem 0;
  overflow: hidden;
}
.admin-mock-bar {
  background: #252629;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #2e2f35;
}
.admin-mock-bar .traffic-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.admin-mock-bar .url-bar {
  flex: 1;
  background: #19191c;
  border: 1px solid #3a3b40;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  color: rgba(255,255,255,.35);
  font-family: 'JetBrains Mono', monospace;
}
.admin-mock-inner { padding: 18px; }
.admin-mock-title {
  font-size: 16px;
  font-weight: 700;
  color: #fbef8a;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.add-word-btn {
  padding: 6px 14px;
  background: #7bcdab;
  color: #19191c;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: opacity .2s;
}
.add-word-btn:hover { opacity: .8; }
.vocab-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.vocab-table th {
  text-align: left;
  padding: 8px 12px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: rgba(255,255,255,.4);
  border-bottom: 1px solid #2e2f35;
}
.vocab-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #1e1f24;
  cursor: pointer;
  vertical-align: top;
}
.vocab-table tr:hover td { background: #252629; }
.vocab-table .jp-word {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}
.vocab-table .jp-reading {
  font-size: 11px;
  color: rgba(255,255,255,.45);
  margin-top: 2px;
}
.vocab-table .page-badge {
  display: inline-block;
  background: #252629;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(255,255,255,.55);
}
.expand-panel {
  background: #19191c;
  border-top: 1px solid #2e2f35;
  padding: 0 12px;
  max-height: 0;
  overflow: hidden;
  transition: max-height .35s ease, padding .35s ease;
}
.expand-panel.open {
  max-height: 200px;
  padding: 14px 12px;
}
.expand-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.expand-field label {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,.4);
  text-transform: uppercase;
  letter-spacing: .07em;
  margin-bottom: 4px;
}
.expand-field input {
  width: 100%;
  background: #252629;
  border: 1px solid #3a3b40;
  border-radius: 4px;
  padding: 7px 10px;
  color: #fff;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
}
.expand-field input:focus { border-color: #7bcdab; }
.expand-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
.btn-save {
  padding: 6px 14px;
  background: #7bcdab;
  color: #19191c;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.btn-remove {
  padding: 6px 14px;
  background: transparent;
  color: #f08080;
  border: 1px solid #f0808044;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}

/* ── Modal ──────────────────────────────────────────────────────────────── */
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.65);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}
.modal-overlay.open { display: flex; }
.modal-box {
  background: #1e1f24;
  border: 1px solid #2e2f35;
  border-radius: 12px;
  padding: 24px;
  width: 360px;
  max-width: 90vw;
  animation: fadeInUp .2s ease;
}
.modal-box h4 { margin: 0 0 18px; color: #fbef8a; font-size: 16px; }
.modal-fields { display: flex; flex-direction: column; gap: 12px; }
.modal-field label {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,.4);
  text-transform: uppercase;
  letter-spacing: .07em;
  margin-bottom: 4px;
}
.modal-field input {
  width: 100%;
  background: #252629;
  border: 1px solid #3a3b40;
  border-radius: 5px;
  padding: 8px 12px;
  color: #fff;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
}
.modal-field input:focus { border-color: #7bcdab; }
.modal-actions {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.btn-cancel {
  padding: 7px 16px;
  background: transparent;
  border: 1px solid #3a3b40;
  color: rgba(255,255,255,.6);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.btn-modal-save {
  padding: 7px 16px;
  background: #7bcdab;
  color: #19191c;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

/* ── Frequency chart ─────────────────────────────────────────────────────── */
.freq-wrap {
  background: #1e1f24;
  border: 1px solid #2e2f35;
  border-radius: 12px;
  padding: 24px;
  margin: 1.6rem 0;
}
.freq-wrap h3 { margin: 0 0 6px; color: #fbef8a; font-size: 15px; }
.freq-controls {
  display: flex;
  gap: 8px;
  margin: 12px 0 20px;
  flex-wrap: wrap;
}
.freq-pill {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #3a3b40;
  background: transparent;
  color: rgba(255,255,255,.6);
  transition: all .2s;
}
.freq-pill:hover { border-color: #7bcdab; color: #fff; }
.freq-pill.active { background: #7bcdab; border-color: #7bcdab; color: #19191c; font-weight: 700; }
.freq-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 160px;
  padding-bottom: 28px;
  position: relative;
}
.freq-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  position: relative;
}
.freq-bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: height .5s cubic-bezier(.4,0,.2,1), opacity .4s;
  position: relative;
}
.freq-bar.known { background: #3a1a2a; }
.freq-bar.unknown { background: #1a3a2a; }
.freq-bar:not(.known) { background: linear-gradient(180deg, #7bcdab, #3a8a6a); }
.freq-bar.fade { opacity: .15; }
.freq-bar-label {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: rgba(255,255,255,.4);
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
}
.freq-bar-val {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,.55);
  white-space: nowrap;
}
.freq-known-legend {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.freq-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255,255,255,.55);
}
.freq-legend-dot {
  width: 10px; height: 10px;
  border-radius: 2px;
}

@media (max-width: 600px) {
  .pipeline-stages { gap: 4px; }
  .pipeline-stage { min-width: 70px; }
  .pipeline-arrow { padding: 0 2px; font-size: 14px; }
  .er-diagram { min-width: 320px; }
  .expand-fields { grid-template-columns: 1fr; }
}
</style>

<div class="series-banner">
  <div class="sb-label">📚 Manga Kotoba series — 5 parts</div>
  <div class="sb-parts">
    <div class="sb-part done">Part 1<br/>Architecture &amp; iOS</div>
    <div class="sb-part active">Part 2<br/>Scraping &amp; AI ✦</div>
    <div class="sb-part">Part 3<br/>N+1 Crisis</div>
    <div class="sb-part">Part 4<br/>SRS Engine</div>
    <div class="sb-part">Part 5<br/>App Store</div>
  </div>
</div>

{: class="marginalia" }
This is Part 2 of 5.<br/>If you missed Part 1,<br/>it covers the overall<br/>architecture and the<br/>iOS app design.

An app that shows vocabulary is useless without vocabulary data. That sounds obvious,
but I didn't fully appreciate it until I had a working Symfony API, a polished SwiftUI frontend,
and absolutely nothing to put in the database. Part 2 is about solving that problem —
and the three increasingly-interesting approaches I took to do it.

The short version: I tried manual entry, I tried scraping, and I ended up building an AI
extraction pipeline on top of Gemini's vision API. Each approach taught me something,
and the final system is a combination of all three working together.

---

## The Data Problem

{: class="marginalia" }
A typical manga volume<br/>has around 180 pages.<br/>Each page can have<br/>20–40 vocabulary items.<br/>That's ~5,000 words<br/>per volume — by hand,<br/>completely impossible.

The vocabulary that powers Manga Kotoba comes from annotated manga pages. Each page
has a list of words with their readings and meanings. The iOS app surfaces those words
while you read, lets you mark them as known, and tracks your progress across volumes.

Three approaches, in order of how naive I was being at the time:

1. **Manual entry** — I actually tried this for about four hours. I got through twelve pages of one volume.
   At that rate it would take me approximately six months to import a single series. Hard no.
2. **Web scraping** — there are a handful of sites that annotate manga vocabulary. If I could parse
   their HTML, I'd have data instantly. This worked, kind of, and I'll show you the code.
3. **AI extraction from images** — give Gemini a manga page image, get back a structured CSV.
   This turned out to be the real answer.

---

## The Scraper Architecture

{: class="marginalia" }
`KotobaScraper` uses<br/>Symfony's `HttpClient`<br/>and `DomCrawler`. No<br/>Puppeteer, no headless<br/>browser — the source<br/>sites render server-side<br/>HTML, which helps.

Click any stage in the pipeline below to see the relevant code.

<div class="pipeline-wrap">
  <h3>⚙️ Scraping pipeline</h3>
  <div class="pipeline-stages" id="pipelineStages">
    <div class="pipeline-stage" data-stage="0" onclick="selectStage(0)">
      <span class="ps-icon">🌐</span>
      <div class="ps-label">Source URL</div>
    </div>
    <div class="pipeline-arrow animated">→</div>
    <div class="pipeline-stage" data-stage="1" onclick="selectStage(1)">
      <span class="ps-icon">📡</span>
      <div class="ps-label">HttpClient fetch</div>
    </div>
    <div class="pipeline-arrow animated">→</div>
    <div class="pipeline-stage" data-stage="2" onclick="selectStage(2)">
      <span class="ps-icon">🔍</span>
      <div class="ps-label">DomCrawler parse</div>
    </div>
    <div class="pipeline-arrow animated">→</div>
    <div class="pipeline-stage" data-stage="3" onclick="selectStage(3)">
      <span class="ps-icon">📦</span>
      <div class="ps-label">DTOs</div>
    </div>
    <div class="pipeline-arrow animated">→</div>
    <div class="pipeline-stage" data-stage="4" onclick="selectStage(4)">
      <span class="ps-icon">💾</span>
      <div class="ps-label">Doctrine persist</div>
    </div>
  </div>
  <div id="pipelineSnippet" class="pipeline-snippet">
    <div class="pipeline-snippet-title" id="pipelineSnippetTitle"></div>
    <pre class="code-block" id="pipelineSnippetCode" style="margin:0"></pre>
  </div>
</div>

<script>
var pipelineSnippets = [
  {
    title: "Stage 0 — Source URL",
    code: '<span class="cm">// Series URL pattern:</span>\n<span class="cm">// https://manga-kotoba.com/series/&lt;slug&gt;</span>\n\n<span class="kw">$seriesUrl</span> = <span class="str">\'https://manga-kotoba.com/series/yotsubato\'</span>;\n<span class="kw">$scraper</span>-><span class="fn">scrapeSeries</span>(<span class="kw">$seriesUrl</span>, maxVolumes: <span class="nm">3</span>, maxPages: <span class="nm">0</span>);'
  },
  {
    title: "Stage 1 — HttpClient fetch",
    code: '<span class="kw">private function</span> <span class="fn">fetch</span>(<span class="ty">string</span> <span class="kw">$url</span>): <span class="ty">string</span>\n{\n    <span class="kw">$response</span> = <span class="kw">$this</span>->httpClient-><span class="fn">request</span>(<span class="str">\'GET\'</span>, <span class="kw">$url</span>, [\n        <span class="str">\'headers\'</span> => [\n            <span class="str">\'User-Agent\'</span> => <span class="str">\'KotobaScraper/1.0 (vocab-research-bot)\'</span>,\n        ],\n    ]);\n    <span class="kw">return</span> <span class="kw">$response</span>-><span class="fn">getContent</span>();\n}'
  },
  {
    title: "Stage 2 — DomCrawler parse",
    code: '<span class="kw">$crawler</span> = <span class="kw">new</span> <span class="ty">Crawler</span>(<span class="kw">$html</span>, <span class="kw">$url</span>);\n\n<span class="cm">// Word rows are in #words table</span>\n<span class="kw">$crawler</span>-><span class="fn">filter</span>(<span class="str">\'#words tbody tr\'</span>)-><span class="fn">each</span>(<span class="kw">function</span> (<span class="ty">Crawler</span> <span class="kw">$row</span>) use (&<span class="kw">$words</span>) {\n    <span class="kw">$sourceId</span> = <span class="kw">$row</span>-><span class="fn">attr</span>(<span class="str">\'data-id\'</span>) ?? <span class="str">\'\'</span>;\n    <span class="kw">$text</span>     = <span class="kw">$row</span>-><span class="fn">filter</span>(<span class="str">\'.word-text\'</span>)-><span class="fn">text</span>(<span class="str">\'\'</span>);\n    <span class="kw">$reading</span>  = <span class="kw">$row</span>-><span class="fn">filter</span>(<span class="str">\'.word-reading\'</span>)-><span class="fn">text</span>(<span class="str">\'\'</span>);\n    <span class="kw">$words</span>[] = <span class="kw">new</span> <span class="ty">WordData</span>(<span class="kw">$sourceId</span>, <span class="kw">$text</span>, <span class="kw">$reading</span>, ...);\n});'
  },
  {
    title: "Stage 3 — DTOs (readonly value objects)",
    code: '<span class="kw">final class</span> <span class="ty">WordData</span>\n{\n    <span class="kw">public function</span> <span class="fn">__construct</span>(\n        <span class="kw">public readonly</span> <span class="ty">string</span>  <span class="kw">$sourceId</span>,\n        <span class="kw">public readonly</span> <span class="ty">string</span>  <span class="kw">$text</span>,\n        <span class="kw">public readonly</span> ?<span class="ty">string</span> <span class="kw">$reading</span>,\n        <span class="kw">public readonly</span> <span class="ty">string</span>  <span class="kw">$shortDefinition</span>,\n        <span class="cm">/** @var string[] */</span>\n        <span class="kw">public readonly</span> <span class="ty">array</span>   <span class="kw">$definitions</span>,\n        <span class="kw">public readonly</span> <span class="ty">int</span>     <span class="kw">$frequency</span>,\n    ) {}\n}'
  },
  {
    title: "Stage 4 — Doctrine persist",
    code: '<span class="kw">foreach</span> (<span class="kw">$seriesData</span>->volumes <span class="kw">as</span> <span class="kw">$volumeData</span>) {\n    <span class="kw">foreach</span> (<span class="kw">$volumeData</span>->pages <span class="kw">as</span> <span class="kw">$pageData</span>) {\n        <span class="kw">foreach</span> (<span class="kw">$pageData</span>->words <span class="kw">as</span> <span class="kw">$wordData</span>) {\n            <span class="kw">$vocab</span> = <span class="kw">$this</span>-><span class="fn">findOrCreate</span>(<span class="kw">$wordData</span>, <span class="kw">$vocabCache</span>);\n            <span class="kw">$this</span>->em-><span class="fn">persist</span>(<span class="kw">$vocab</span>);\n        }\n    }\n    <span class="kw">$this</span>->em-><span class="fn">flush</span>(); <span class="cm">// flush per volume</span>\n}'
  }
];

function selectStage(idx) {
  var stages = document.querySelectorAll('.pipeline-stage');
  stages.forEach(function(s) { s.classList.remove('active'); });
  stages[idx].classList.add('active');

  var snippet = document.getElementById('pipelineSnippet');
  var title   = document.getElementById('pipelineSnippetTitle');
  var code    = document.getElementById('pipelineSnippetCode');

  title.textContent = pipelineSnippets[idx].title;
  code.innerHTML    = pipelineSnippets[idx].code;
  snippet.classList.add('visible');
}
</script>

---

## The Scraper Code

The scraper is a single `KotobaScraper` class that walks the site's URL hierarchy:
series → volumes → paginated pages → word rows. Commit `d18ab71` has the full parser.

<pre class="code-block"><span class="cm">// src/Scraper/KotobaScraper.php (simplified)</span>
<span class="kw">final class</span> <span class="ty">KotobaScraper</span>
{
    <span class="kw">private const</span> <span class="kv">BASE_URL</span> = <span class="str">'https://manga-kotoba.com'</span>;

    <span class="kw">public function</span> <span class="fn">__construct</span>(
        <span class="kw">private readonly</span> <span class="ty">HttpClientInterface</span> <span class="kw">$httpClient</span>,
    ) {}

    <span class="kw">public function</span> <span class="fn">scrapeSeries</span>(<span class="ty">string</span> <span class="kw">$seriesUrl</span>, <span class="ty">int</span> <span class="kw">$maxVolumes</span> = <span class="nm">0</span>): <span class="ty">SeriesData</span>
    {
        <span class="kw">$html</span>    = <span class="kw">$this</span>-><span class="fn">fetch</span>(<span class="kw">$seriesUrl</span>);
        <span class="kw">$crawler</span> = <span class="kw">new</span> <span class="ty">Crawler</span>(<span class="kw">$html</span>, <span class="kw">$seriesUrl</span>);

        <span class="kw">$title</span>  = <span class="fn">trim</span>(<span class="kw">$crawler</span>-><span class="fn">filter</span>(<span class="str">'h1'</span>)-><span class="fn">first</span>()-><span class="fn">text</span>(<span class="str">''</span>));
        <span class="kw">$author</span> = <span class="kw">null</span>;

        <span class="cm">// Author link is inside #series-infobox, starts with /by/</span>
        <span class="kw">$crawler</span>-><span class="fn">filter</span>(<span class="str">'#series-infobox div > a'</span>)-><span class="fn">each</span>(
            <span class="kw">function</span> (<span class="ty">Crawler</span> <span class="kw">$node</span>) <span class="kw">use</span> (&<span class="kw">$author</span>) {
                <span class="kw">if</span> (<span class="fn">str_starts_with</span>(<span class="kw">$node</span>-><span class="fn">attr</span>(<span class="str">'href'</span>) ?? <span class="str">''</span>, <span class="str">'/by/'</span>)) {
                    <span class="kw">$author</span> = <span class="fn">trim</span>(<span class="kw">$node</span>-><span class="fn">text</span>(<span class="str">''</span>));
                }
            }
        );

        <span class="kw">$volumeSlugs</span> = [];
        <span class="kw">$crawler</span>-><span class="fn">filter</span>(<span class="str">'#series-volume-stats tbody tr td a'</span>)-><span class="fn">each</span>(
            <span class="kw">function</span> (<span class="ty">Crawler</span> <span class="kw">$node</span>) <span class="kw">use</span> (&<span class="kw">$volumeSlugs</span>) {
                <span class="kw">$href</span> = <span class="kw">$node</span>-><span class="fn">attr</span>(<span class="str">'href'</span>) ?? <span class="str">''</span>;
                <span class="kw">if</span> (<span class="fn">str_contains</span>(<span class="kw">$href</span>, <span class="str">'/volume/'</span>)) {
                    <span class="kw">$volumeSlugs</span>[] = <span class="kw">$this</span>-><span class="fn">slugFromUrl</span>(<span class="kv">self::BASE_URL</span> . <span class="kw">$href</span>, <span class="str">'volume'</span>);
                }
            }
        );

        <span class="kw">if</span> (<span class="kw">$maxVolumes</span> > <span class="nm">0</span>) {
            <span class="kw">$volumeSlugs</span> = <span class="fn">array_slice</span>(<span class="kw">$volumeSlugs</span>, <span class="nm">0</span>, <span class="kw">$maxVolumes</span>);
        }

        <span class="kw">$volumes</span> = <span class="fn">array_map</span>(<span class="kw">fn</span>(<span class="kw">$slug</span>) => <span class="kw">$this</span>-><span class="fn">scrapeVolume</span>(<span class="kw">$slug</span>), <span class="kw">$volumeSlugs</span>);

        <span class="kw">return new</span> <span class="ty">SeriesData</span>(<span class="kw">$title</span>, <span class="fn">slugify</span>(<span class="kw">$title</span>), <span class="kw">$author</span>, ..., <span class="kw">$volumes</span>);
    }
}</pre>

### The duplicate-key bug (`5a22fa8`)

{: class="marginalia" }
Doctrine's identity map<br/>only tracks flushed<br/>entities. Unflushed<br/>new entities are<br/>invisible to `find()`<br/>— which is what bit me<br/>here.

This was a fun one. The scraper called `findOrCreateVocabulary($sourceId)` for each word.
When the same word appeared on two different manga pages in a single scrape run,
the second call to `find()` returned `null` — because the first entity had been staged
in Doctrine's unit of work but not yet flushed to the database. Two `new Vocabulary` objects
with the same `source_id` ended up in the same flush, and the UNIQUE constraint exploded.

The fix was a local `$vocabCache` array keyed by `sourceId`, passed by reference through
the persistence loop. Three-level lookup: in-memory cache first, then Doctrine identity map,
then a real DB query.

<pre class="code-block"><span class="cm">// Three-level lookup — no more duplicate-key errors</span>
<span class="kw">private function</span> <span class="fn">findOrCreate</span>(<span class="ty">WordData</span> <span class="kw">$data</span>, <span class="ty">array</span> &<span class="kw">$cache</span>): <span class="ty">Vocabulary</span>
{
    <span class="cm">// 1. in-memory cache (same scrape session)</span>
    <span class="kw">if</span> (<span class="fn">isset</span>(<span class="kw">$cache</span>[<span class="kw">$data</span>->sourceId])) {
        <span class="kw">return</span> <span class="kw">$cache</span>[<span class="kw">$data</span>->sourceId];
    }

    <span class="cm">// 2. Doctrine identity map / DB</span>
    <span class="kw">$vocab</span> = <span class="kw">$this</span>->vocabRepo-><span class="fn">findOneBy</span>([<span class="str">'sourceId'</span> => <span class="kw">$data</span>->sourceId]);

    <span class="cm">// 3. create new entity</span>
    <span class="kw">if</span> (<span class="kw">$vocab</span> === <span class="kw">null</span>) {
        <span class="kw">$vocab</span> = <span class="ty">Vocabulary</span>::<span class="fn">fromWordData</span>(<span class="kw">$data</span>);
        <span class="kw">$this</span>->em-><span class="fn">persist</span>(<span class="kw">$vocab</span>);
    }

    <span class="kw">return</span> <span class="kw">$cache</span>[<span class="kw">$data</span>->sourceId] = <span class="kw">$vocab</span>;
}</pre>

---

## The Pivot: AI Extraction with Gemini

{: class="marginalia" }
Gemini's vision API is<br/>surprisingly good at<br/>reading manga — even<br/>handwritten speech<br/>bubbles in messy fonts.

The scraper worked well for the one site that had clean, parseable HTML.
The problem: every other vocabulary source had different markup, different pagination patterns,
different CSS selectors. Maintaining five separate HTML parsers felt like a maintenance nightmare.

The real answer was simpler: manga pages are *images*. And Gemini 2.5 Flash can read images.

Instead of scraping vocabulary from annotated HTML, I could take the original manga page scans,
send them to Gemini, and ask it to extract the vocabulary directly. The model sees the speech bubbles,
the furigana, the sound effects — and returns a structured CSV.

Here's the prompt that ended up in `AiProcessMangaCommand.php` after three iterations:

<pre class="code-block"><span class="cm">// The final prompt (commit 653d10d)</span>
<span class="kw">$prompt</span> = <span class="str">"Extract all Japanese vocabulary from this manga page."</span>
         . <span class="str">" Use the dictionary form. Avoid particles and intensifiers."</span>
         . <span class="str">" Format output as CSV (no header). Two row types:\n"</span>
         . <span class="str">"\n"</span>
         . <span class="str">"  Metadata row: &lt;PAGE_NUM&gt;,caption,notes,,,\n"</span>
         . <span class="str">"  Vocabulary row: &lt;PAGE_NUM&gt;,,,word,reading,position\n"</span>
         . <span class="str">"\n"</span>
         . <span class="str">"Caption values: Cover, Index, Extra, Chapter 1 ...\n"</span>
         . <span class="str">"Only return CSV lines. No markdown. Dictionary form always."</span>;</pre>

And an example of the output Gemini produces:

<pre class="code-block"><span class="cm"># 6-column CSV output from Gemini</span>
<span class="nm">3</span>,Chapter 1,Weather and everyday expressions,,,
<span class="nm">3</span>,,,湿気,しっけ,<span class="nm">1</span>
<span class="nm">3</span>,,,蒸し暑い,むしあつい,<span class="nm">2</span>
<span class="nm">3</span>,,,大丈夫,だいじょうぶ,<span class="nm">3</span>
<span class="nm">4</span>,Chapter 1,,,,
<span class="nm">4</span>,,,外,そと,<span class="nm">1</span>
<span class="nm">4</span>,,,遊ぶ,あそぶ,<span class="nm">2</span></pre>

<div class="tip-box">
<strong>Why 6 columns?</strong> The 6-column format was the third iteration of the AI prompt.
The first version just asked for word and reading. The second added meaning. The third
added caption and notes — context about the page itself that ends up in the admin panel
and helps the iOS app group vocabulary by chapter. Less is not always more when it comes
to structured extraction.
</div>

The command walks a folder of numbered images (`1.jpg`, `2.jpg`, ...), processes each
through Gemini's `generateContent` endpoint with the image base64-encoded, and streams
the results into a single `import.csv`:

<pre class="code-block"><span class="kw">$payload</span> = [
    <span class="str">'contents'</span> => [[
        <span class="str">'parts'</span> => [
            [<span class="str">'text'</span> => <span class="kw">$prompt</span>],
            [
                <span class="str">'inline_data'</span> => [
                    <span class="str">'mime_type'</span> => <span class="kw">$mimeType</span>,
                    <span class="str">'data'</span>      => <span class="fn">base64_encode</span>(<span class="fn">file_get_contents</span>(<span class="kw">$imagePath</span>)),
                ],
            ],
        ],
    ]],
];

<span class="kw">$response</span> = <span class="kw">$this</span>->httpClient-><span class="fn">request</span>(<span class="str">'POST'</span>, <span class="kv">self::GEMINI_API_URL</span>, [
    <span class="str">'query'</span>   => [<span class="str">'key'</span> => <span class="kw">$this</span>->googleApiKey],
    <span class="str">'json'</span>    => <span class="kw">$payload</span>,
    <span class="str">'timeout'</span> => <span class="nm">60</span>,
]);

<span class="kw">$text</span> = <span class="kw">$response</span>-><span class="fn">toArray</span>()[<span class="str">'candidates'</span>][<span class="nm">0</span>][<span class="str">'content'</span>][<span class="str">'parts'</span>][<span class="nm">0</span>][<span class="str">'text'</span>];</pre>

---

## The CSV Import Pipeline

{: class="marginalia" }
`CsvImportService` is<br/>the bridge between<br/>the AI-generated CSV<br/>and the Doctrine<br/>entities. It auto-detects<br/>4-column vs 6-column<br/>format.

Once you have the CSV, you import it into a volume through the admin panel. The demo below
simulates what the import process looks like for a small file. Hit **Import** and watch
each row get processed.

<div class="csv-demo">
  <h3>📂 CSV import simulator</h3>
  <textarea id="csvInput" class="csv-textarea" readonly>page,,,word,reading,position
3,,,湿気,しっけ,1
3,,,蒸し暑い,むしあつい,2
4,,,大丈夫,だいじょうぶ,1
4,,,外,そと,2
3,,,湿気,しっけ,3
5,,,遊ぶ,あそぶ,1</textarea>
  <br/>
  <button class="import-btn" id="importBtn" onclick="runImport()">▶ Import CSV</button>
  <div class="import-rows" id="importRows"></div>
  <div class="import-summary" id="importSummary">
    <div class="is-stat is-ok">
      <div class="is-num" id="sumOk">0</div>
      <div class="is-label">Imported</div>
    </div>
    <div class="is-stat is-dup">
      <div class="is-num" id="sumDup">0</div>
      <div class="is-label">Duplicate</div>
    </div>
    <div class="is-stat is-err">
      <div class="is-num" id="sumErr">0</div>
      <div class="is-label">Errors</div>
    </div>
  </div>
</div>

<script>
var importData = [
  { word: '湿気',    reading: 'しっけ',    page: 3, status: 'ok',  label: '✓ imported' },
  { word: '蒸し暑い', reading: 'むしあつい', page: 3, status: 'ok',  label: '✓ imported' },
  { word: '大丈夫',  reading: 'だいじょうぶ', page: 4, status: 'ok',  label: '✓ imported' },
  { word: '外',     reading: 'そと',      page: 4, status: 'ok',  label: '✓ imported' },
  { word: '湿気',    reading: 'しっけ',    page: 3, status: 'dup', label: '⚠ duplicate' },
  { word: '遊ぶ',    reading: 'あそぶ',    page: 5, status: 'ok',  label: '✓ imported' },
];

function runImport() {
  var btn = document.getElementById('importBtn');
  btn.disabled = true;

  var container = document.getElementById('importRows');
  container.innerHTML = '';
  document.getElementById('importSummary').classList.remove('visible');
  document.getElementById('sumOk').textContent  = '0';
  document.getElementById('sumDup').textContent = '0';
  document.getElementById('sumErr').textContent = '0';

  var okCount  = 0;
  var dupCount = 0;
  var errCount = 0;

  importData.forEach(function(row, idx) {
    var el = document.createElement('div');
    el.className = 'import-row-item';
    el.innerHTML =
      '<span class="import-badge badge-' + row.status + '">' + row.label + '</span>' +
      '<span style="font-weight:700;font-size:15px">' + row.word + '</span>' +
      '<span style="color:rgba(255,255,255,.45);font-size:12px">' + row.reading + '</span>' +
      '<span class="page-badge" style="margin-left:auto">p.' + row.page + '</span>';
    container.appendChild(el);

    setTimeout(function() {
      el.classList.add('visible', row.status);
      if (row.status === 'ok')  { okCount++;  document.getElementById('sumOk').textContent  = okCount; }
      if (row.status === 'dup') { dupCount++; document.getElementById('sumDup').textContent = dupCount; }
      if (row.status === 'err') { errCount++; document.getElementById('sumErr').textContent = errCount; }

      if (idx === importData.length - 1) {
        setTimeout(function() {
          document.getElementById('importSummary').classList.add('visible');
          btn.disabled = false;
        }, 400);
      }
    }, idx * 380 + 200);
  });
}
</script>

The `CsvImportService` in PHP mirrors exactly what the demo shows. It reads the file,
validates each row, checks for duplicates, and persists via Doctrine:

<pre class="code-block"><span class="cm">// src/Service/CsvImportService.php — validation loop (simplified)</span>
<span class="kw">while</span> ((<span class="kw">$data</span> = <span class="fn">fgetcsv</span>(<span class="kw">$csvHandle</span>, <span class="kw">null</span>, <span class="str">','</span>, <span class="str">'"'</span>, <span class="str">'\\'</span>)) !== <span class="kw">false</span>) {
    <span class="kw">$line</span>++;

    <span class="cm">// Skip header if present</span>
    <span class="kw">if</span> (<span class="kw">$line</span> === <span class="nm">1</span> && <span class="fn">strtolower</span>((<span class="ty">string</span>) (<span class="kw">$data</span>[<span class="nm">0</span>] ?? <span class="str">''</span>)) === <span class="str">'page'</span>) {
        <span class="kw">continue</span>;
    }

    <span class="cm">// Auto-detect 6-col vs 4-col format</span>
    <span class="kw">$is6Col</span> = <span class="fn">count</span>(<span class="kw">$data</span>) >= <span class="nm">6</span>;
    <span class="kw">$pageNum</span> = (<span class="ty">int</span>) <span class="kw">$data</span>[<span class="nm">0</span>];
    <span class="kw">$text</span>    = <span class="kw">$is6Col</span> ? (<span class="kw">$data</span>[<span class="nm">3</span>] ?? <span class="str">''</span>) : (<span class="kw">$data</span>[<span class="nm">1</span>] ?? <span class="str">''</span>);
    <span class="kw">$reading</span> = <span class="kw">$is6Col</span> ? (<span class="kw">$data</span>[<span class="nm">4</span>] ?? <span class="str">''</span>) : (<span class="kw">$data</span>[<span class="nm">2</span>] ?? <span class="str">''</span>);

    <span class="cm">// Metadata rows have empty word column</span>
    <span class="kw">if</span> (<span class="fn">trim</span>(<span class="kw">$text</span>) === <span class="str">''</span>) {
        <span class="kw">$this</span>-><span class="fn">handleMetadataRow</span>(<span class="kw">$data</span>, <span class="kw">$volume</span>);
        <span class="kw">continue</span>;
    }

    <span class="kw">$rows</span>[] = [<span class="kw">$pageNum</span>, <span class="kw">$text</span>, <span class="kw">$reading</span>, (<span class="ty">int</span>) <span class="kw">$data</span>[<span class="nm">5</span>] ?? <span class="nm">0</span>, <span class="kw">$line</span>];
    <span class="kw">$neededTexts</span>[]   = <span class="kw">$text</span>;
    <span class="kw">$neededPageNums</span>[] = <span class="kw">$pageNum</span>;
}</pre>

---

## The Batch-Loading Fix (`792920c`)

{: class="marginalia" }
Batch flushing is<br/>Doctrine 101, but it's<br/>the kind of thing you<br/>only learn after<br/>watching a 200-row<br/>import take 45 seconds<br/>and timing out on<br/>Heroku.

The original import worked, but it was slow. Embarrassingly slow. Each row triggered its own
`findVocabulary()` DB query and its own `$em->flush()`. For a 1,000-row CSV that meant
~2,000 SQL queries. On Heroku, that reliably hit the H12 30-second timeout.

The fix was a 4-pass batch approach:

1. **Pass 1** — parse the entire CSV into memory (no DB)
2. **Pass 2** — create all missing pages in one flush
3. **Pass 3** — batch-load all vocabulary with a single `SELECT ... WHERE text IN (...)`
4. **Pass 4** — assemble INSERT tuples and fire one `INSERT IGNORE`

<div class="bench-wrap">
  <h3>⏱ Import performance: before vs after</h3>
  <button class="bench-animate-btn" id="benchBtn" onclick="animateBench()">▶ Run comparison</button>
  <div class="bench-row">
    <div class="bench-row-header">
      <span class="bench-row-label">Before (per-row flush)</span>
      <span class="bench-row-time slow" id="benchTimeBefore">—</span>
    </div>
    <div class="bench-bar-bg">
      <div class="bench-bar-fill slow" id="benchBarBefore" style="width:0%"></div>
    </div>
    <div class="bench-note">~2,000 SQL queries for a 1,000-row CSV — H12 timeout on Heroku</div>
  </div>
  <div class="bench-row">
    <div class="bench-row-header">
      <span class="bench-row-label">After (4-pass batch)</span>
      <span class="bench-row-time fast" id="benchTimeAfter">—</span>
    </div>
    <div class="bench-bar-bg">
      <div class="bench-bar-fill fast" id="benchBarAfter" style="width:0%"></div>
    </div>
    <div class="bench-note">~4 SQL queries total — runs in under 3 seconds</div>
  </div>
</div>

<script>
function animateBench() {
  var btn = document.getElementById('benchBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Running...';

  document.getElementById('benchBarBefore').style.width = '0%';
  document.getElementById('benchBarAfter').style.width  = '0%';
  document.getElementById('benchTimeBefore').textContent = '—';
  document.getElementById('benchTimeAfter').textContent  = '—';

  setTimeout(function() {
    document.getElementById('benchBarBefore').style.width = '100%';
  }, 200);

  var elapsed = 0;
  var interval = setInterval(function() {
    elapsed += 0.5;
    document.getElementById('benchTimeBefore').textContent = elapsed.toFixed(1) + 's';
    if (elapsed >= 45) {
      clearInterval(interval);
      document.getElementById('benchTimeBefore').textContent = '45.0s ✗';
      setTimeout(function() {
        document.getElementById('benchBarAfter').style.width = '4.7%';
        var elB = 0;
        var ib = setInterval(function() {
          elB += 0.05;
          document.getElementById('benchTimeAfter').textContent = elB.toFixed(2) + 's';
          if (elB >= 2.1) {
            clearInterval(ib);
            document.getElementById('benchTimeAfter').textContent = '2.1s ✓';
            btn.disabled = false;
            btn.textContent = '↺ Run again';
          }
        }, 30);
      }, 500);
    }
  }, 12);
}
</script>

The key change — going from N individual flushes to a single batched INSERT:

<pre class="code-block"><span class="cm">// BEFORE — one flush per row</span>
<span class="kw">foreach</span> (<span class="kw">$rows</span> <span class="kw">as</span> <span class="kw">$row</span>) {
    <span class="kw">$vocab</span> = <span class="kw">$this</span>-><span class="fn">findVocabulary</span>(<span class="kw">$row</span>[<span class="str">'text'</span>], <span class="kw">$row</span>[<span class="str">'reading'</span>]);  <span class="cm">// 1 SELECT each</span>
    <span class="kw">$this</span>->em-><span class="fn">persist</span>(<span class="kw">$vocab</span>);
    <span class="kw">$this</span>->em-><span class="fn">flush</span>();  <span class="cm">// 1 INSERT each — 1000 rows = 2000 queries</span>
}

<span class="cm">// AFTER — batch select + single INSERT</span>
<span class="kw">$vocabMap</span> = <span class="kw">$this</span>-><span class="fn">batchLoadVocabulary</span>(<span class="kw">$uniqueTexts</span>);   <span class="cm">// 1 SELECT</span>

<span class="kw">$tuples</span> = [];
<span class="kw">foreach</span> (<span class="kw">$rows</span> <span class="kw">as</span> <span class="kw">$row</span>) {
    <span class="kw">$vocabId</span>  = <span class="kw">$vocabMap</span>[<span class="kw">$row</span>[<span class="str">'text'</span>]]?->getId();
    <span class="kw">$pageId</span>   = <span class="kw">$pages</span>[<span class="kw">$row</span>[<span class="str">'page'</span>]];
    <span class="kw">$tuples</span>[] = <span class="str">'('</span> . <span class="kw">$pageId</span> . <span class="str">','</span> . <span class="kw">$vocabId</span> . <span class="str">','</span> . <span class="kw">$row</span>[<span class="str">'pos'</span>] . <span class="str">')'</span>;
}

<span class="cm">// One INSERT IGNORE for the whole file</span>
<span class="kw">$this</span>->em-><span class="fn">getConnection</span>()-><span class="fn">executeStatement</span>(
    <span class="str">'INSERT IGNORE INTO page_vocabulary (page_id, vocabulary_id, position) VALUES '</span>
    . <span class="fn">implode</span>(<span class="str">','</span>, <span class="kw">$tuples</span>)
);</pre>

---

## Vocabulary Meaning Entities (`e5970a3`)

{: class="marginalia" }
A word like 大丈夫 has<br/>multiple senses: "OK",<br/>"safe", "certainly".<br/>Collapsing them into<br/>a single text column<br/>made filtering by<br/>part-of-speech<br/>impossible.

The original schema had a single `meaning TEXT` column on both `Vocabulary` and `Kanji`.
That worked fine until I needed to filter vocabulary by part of speech, or display individual
senses in the iOS app. Commit `e5970a3` replaced both columns with proper one-to-many
relationships — `VocabularyMeaning` and `KanjiMeaning` entities with a `position` field
for ordering.

<div class="er-wrap">
  <h3>🗂 Entity relationships</h3>
  <div class="er-diagram">
    <div class="er-entity">
      <div class="er-entity-name">Vocabulary</div>
      <div class="er-entity-fields">
        <div class="er-field pk">id: int PK</div>
        <div class="er-field">text: string</div>
        <div class="er-field">reading: ?string</div>
        <div class="er-field">frequency: ?int</div>
        <div class="er-field">sourceId: ?string</div>
      </div>
    </div>
    <div class="er-connector">
      <div class="er-connector-line"></div>
      <div class="er-connector-label">1 ──&lt;</div>
    </div>
    <div class="er-entity">
      <div class="er-entity-name">VocabularyMeaning</div>
      <div class="er-entity-fields">
        <div class="er-field pk">id: int PK</div>
        <div class="er-field fk">vocabulary_id: FK</div>
        <div class="er-field">definition: string</div>
        <div class="er-field">partOfSpeech: ?string</div>
        <div class="er-field">position: int</div>
      </div>
    </div>
    <div class="er-connector" style="margin-left:28px">
      <div class="er-connector-line"></div>
    </div>
    <div class="er-entity" style="margin-left:0">
      <div class="er-entity-name">Kanji</div>
      <div class="er-entity-fields">
        <div class="er-field pk">id: int PK</div>
        <div class="er-field">character: string</div>
        <div class="er-field">frequency: ?int</div>
      </div>
    </div>
    <div class="er-connector">
      <div class="er-connector-line"></div>
      <div class="er-connector-label">1 ──&lt;</div>
    </div>
    <div class="er-entity">
      <div class="er-entity-name">KanjiMeaning</div>
      <div class="er-entity-fields">
        <div class="er-field pk">id: int PK</div>
        <div class="er-field fk">kanji_id: FK</div>
        <div class="er-field">meaning: string</div>
        <div class="er-field">position: int</div>
      </div>
    </div>
  </div>
</div>

A backward-compatible `getMeaning()` helper on `Vocabulary` returns the first meaning from
the collection, so callers that only need the primary definition didn't need to change:

<pre class="code-block"><span class="cm">// Backward-compatible helper</span>
<span class="kw">public function</span> <span class="fn">getMeaning</span>(): <span class="ty">string</span>
{
    <span class="kw">return</span> <span class="kw">$this</span>->meanings-><span class="fn">first</span>()
        ?-><span class="fn">getDefinition</span>()
        ?? <span class="str">''</span>;
}

<span class="cm">// New: get all meanings for the iOS detail view</span>
<span class="kw">public function</span> <span class="fn">getMeanings</span>(): <span class="ty">Collection</span>
{
    <span class="kw">return</span> <span class="kw">$this</span>->meanings-><span class="fn">matching</span>(
        <span class="ty">Criteria</span>::<span class="fn">create</span>()-><span class="fn">orderBy</span>([<span class="str">'position'</span> => <span class="str">'ASC'</span>])
    );
}</pre>

---

## The Admin Panel

{: class="marginalia" }
The admin panel is<br/>server-rendered Twig<br/>with a full dark-mode<br/>redesign from `b5161b8`.<br/>No React, no Vue —<br/>just Symfony and a<br/>healthy respect for<br/>HTML forms.

Commit `e904c16` added per-page vocabulary management to the admin: view all words on a page,
reorder them, add new entries, set captions. The mockup below gives you an interactive feel
for how it works. Click any row to expand the edit form.

<div class="admin-mock">
  <div class="admin-mock-bar">
    <span class="traffic-dot" style="background:#f08080"></span>
    <span class="traffic-dot" style="background:#fbef8a;margin-left:4px"></span>
    <span class="traffic-dot" style="background:#7bcdab;margin-left:4px"></span>
    <div class="url-bar">admin.kotoba.app / manga / yotsubato / vol-1 / page / 3</div>
  </div>
  <div class="admin-mock-inner">
    <div class="admin-mock-title">
      <span>📄 Page 3 vocabulary</span>
      <button class="add-word-btn" onclick="openModal()">+ Add Word</button>
    </div>
    <table class="vocab-table" id="adminTable">
      <thead>
        <tr>
          <th>#</th>
          <th>Word</th>
          <th>Meaning</th>
          <th>Page</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="adminTbody"></tbody>
    </table>
  </div>
</div>

<div class="modal-overlay" id="addModal">
  <div class="modal-box">
    <h4>➕ Add vocabulary</h4>
    <div class="modal-fields">
      <div class="modal-field">
        <label>Word (kanji)</label>
        <input type="text" placeholder="e.g. 湿気" id="modalWord">
      </div>
      <div class="modal-field">
        <label>Reading (hiragana)</label>
        <input type="text" placeholder="e.g. しっけ" id="modalReading">
      </div>
      <div class="modal-field">
        <label>Meaning</label>
        <input type="text" placeholder="e.g. humidity / moisture" id="modalMeaning">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-modal-save" onclick="saveModal()">Add word</button>
    </div>
  </div>
</div>

<script>
var adminVocab = [
  { pos: 1, word: '湿気',    reading: 'しっけ',      meaning: 'humidity / moisture',   page: 3 },
  { pos: 2, word: '蒸し暑い', reading: 'むしあつい',   meaning: 'hot and humid',          page: 3 },
  { pos: 3, word: '大丈夫',  reading: 'だいじょうぶ', meaning: 'OK / all right / safe',  page: 4 },
  { pos: 4, word: '外',     reading: 'そと',        meaning: 'outside / outdoors',     page: 4 },
  { pos: 5, word: '遊ぶ',    reading: 'あそぶ',      meaning: 'to play / to have fun',  page: 5 },
];

function renderAdminTable() {
  var tbody = document.getElementById('adminTbody');
  tbody.innerHTML = '';
  adminVocab.forEach(function(v, idx) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><span class="page-badge">' + v.pos + '</span></td>' +
      '<td><div class="jp-word">' + v.word + '</div><div class="jp-reading">' + v.reading + '</div></td>' +
      '<td style="color:rgba(255,255,255,.65)">' + v.meaning + '</td>' +
      '<td><span class="page-badge">p.' + v.page + '</span></td>' +
      '<td style="font-size:12px;color:rgba(255,255,255,.35)">▼</td>';
    tr.onclick = function() { toggleExpand(idx); };
    tbody.appendChild(tr);

    var expandTr = document.createElement('tr');
    expandTr.id = 'expand-' + idx;
    expandTr.innerHTML =
      '<td colspan="5" style="padding:0">' +
      '<div class="expand-panel" id="panel-' + idx + '">' +
      '<div class="expand-fields">' +
      '<div class="expand-field"><label>Word</label><input type="text" value="' + v.word + '"></div>' +
      '<div class="expand-field"><label>Reading</label><input type="text" value="' + v.reading + '"></div>' +
      '<div class="expand-field"><label>Meaning</label><input type="text" value="' + v.meaning + '"></div>' +
      '<div class="expand-field"><label>Page</label><input type="number" value="' + v.page + '"></div>' +
      '</div>' +
      '<div class="expand-actions">' +
      '<button class="btn-save">Save</button>' +
      '<button class="btn-remove" onclick="removeRow(' + idx + ');event.stopPropagation()">Remove</button>' +
      '</div>' +
      '</div></td>';
    tbody.appendChild(expandTr);
  });
}

var openIdx = null;
function toggleExpand(idx) {
  if (openIdx !== null && openIdx !== idx) {
    document.getElementById('panel-' + openIdx).classList.remove('open');
  }
  var panel = document.getElementById('panel-' + idx);
  panel.classList.toggle('open');
  openIdx = panel.classList.contains('open') ? idx : null;
}

function removeRow(idx) {
  adminVocab.splice(idx, 1);
  openIdx = null;
  renderAdminTable();
}

function openModal()  { document.getElementById('addModal').classList.add('open'); }
function closeModal() { document.getElementById('addModal').classList.remove('open'); }
function saveModal() {
  var w = document.getElementById('modalWord').value.trim();
  var r = document.getElementById('modalReading').value.trim();
  var m = document.getElementById('modalMeaning').value.trim();
  if (!w) return;
  adminVocab.push({ pos: adminVocab.length + 1, word: w, reading: r, meaning: m, page: 3 });
  closeModal();
  document.getElementById('modalWord').value    = '';
  document.getElementById('modalReading').value = '';
  document.getElementById('modalMeaning').value = '';
  renderAdminTable();
}

renderAdminTable();
</script>

---

## Excluding Known Words from Frequency (`7324008`)

{: class="marginalia" }
The SQL subquery that<br/>excludes known words is<br/>deceptively simple but<br/>it's the feature users<br/>noticed most — "it only<br/>shows me words I don't<br/>already know!"

The `GET /api/vocabulary/common` endpoint returns the most frequent vocabulary items across
a manga series — but for logged-in users, it should skip words they already know.
That's a one-line SQL addition that makes the whole product feel personalised:

<pre class="code-block"><span class="cm">-- Core query for common vocabulary, unknown to this user</span>
<span class="kw">SELECT</span>
    v.id,
    v.text,
    v.reading,
    <span class="fn">COUNT</span>(DISTINCT pv.page_id) <span class="kw">AS</span> occurrences
<span class="kw">FROM</span> vocabulary v
<span class="kw">JOIN</span> page_vocabulary pv <span class="kw">ON</span> pv.vocabulary_id = v.id
<span class="kw">JOIN</span> page p            <span class="kw">ON</span> p.id = pv.page_id
<span class="kw">JOIN</span> volume vol        <span class="kw">ON</span> vol.id = p.volume_id
<span class="kw">WHERE</span> vol.manga_id = :mangaId
  <span class="kw">AND</span> v.id <span class="kw">NOT IN</span> (
      <span class="kw">SELECT</span> kw.vocabulary_id
      <span class="kw">FROM</span> known_word kw
      <span class="kw">WHERE</span> kw.user_id = :userId   <span class="cm">-- the magic line</span>
  )
<span class="kw">GROUP BY</span> v.id
<span class="kw">ORDER BY</span> occurrences <span class="kw">DESC</span>
<span class="kw">LIMIT</span> <span class="nm">50</span>;</pre>

The interactive chart below shows vocabulary frequency across a mock manga series.
Toggle between "Show all" and "Exclude known" to see how the known words disappear.

<div class="freq-wrap">
  <h3>📊 Word frequency across manga pages</h3>
  <div class="freq-controls">
    <button class="freq-pill active" id="pillAll" onclick="setFreqMode('all')">Show all</button>
    <button class="freq-pill" id="pillExclude" onclick="setFreqMode('exclude')">Exclude my known words</button>
  </div>
  <div class="freq-chart" id="freqChart"></div>
  <div class="freq-known-legend">
    <div class="freq-legend-item">
      <div class="freq-legend-dot" style="background:linear-gradient(#7bcdab,#3a8a6a)"></div>
      <span>Unknown to you</span>
    </div>
    <div class="freq-legend-item">
      <div class="freq-legend-dot" style="background:#3a1a2a"></div>
      <span>Already known (faded in "exclude" mode)</span>
    </div>
  </div>
</div>

<script>
var freqWords = [
  { word: '大丈夫', count: 47, known: true  },
  { word: '外',    count: 38, known: false },
  { word: '遊ぶ',   count: 31, known: false },
  { word: '湿気',   count: 28, known: true  },
  { word: '帰る',   count: 25, known: false },
  { word: '食べる', count: 22, known: false },
  { word: '見る',   count: 19, known: true  },
  { word: '楽しい', count: 15, known: false },
  { word: '友達',   count: 12, known: false },
  { word: '今日',   count: 9,  known: true  },
];

var freqMode = 'all';
var maxCount = 47;

function buildFreqChart() {
  var container = document.getElementById('freqChart');
  container.innerHTML = '';
  freqWords.forEach(function(w) {
    var col = document.createElement('div');
    col.className = 'freq-bar-col';

    var valEl = document.createElement('div');
    valEl.className = 'freq-bar-val';
    valEl.textContent = w.count;

    var bar = document.createElement('div');
    var pct = Math.round((w.count / maxCount) * 100);
    bar.className = 'freq-bar' + (w.known ? ' known' : '');
    bar.style.height = pct + '%';
    bar.id = 'fb-' + w.word;

    var lbl = document.createElement('div');
    lbl.className = 'freq-bar-label';
    lbl.textContent = w.word;

    col.appendChild(valEl);
    col.appendChild(bar);
    col.appendChild(lbl);
    container.appendChild(col);
  });
}

function setFreqMode(mode) {
  freqMode = mode;
  document.getElementById('pillAll').classList.toggle('active', mode === 'all');
  document.getElementById('pillExclude').classList.toggle('active', mode === 'exclude');

  freqWords.forEach(function(w) {
    var bar = document.getElementById('fb-' + w.word);
    if (!bar) return;
    if (mode === 'exclude' && w.known) {
      bar.classList.add('fade');
    } else {
      bar.classList.remove('fade');
    }
  });
}

buildFreqChart();
</script>

---

## What's Next

{: class="marginalia" }
Part 3 is where things<br/>got painful in a very<br/>instructive way. The<br/>N+1 query pattern<br/>shows up when you're<br/>not looking, and the<br/>fix changes how you<br/>think about ORMs.

The vocabulary engine works. You can scrape a series, run a folder of images through Gemini,
import the resulting CSV, and have a fully populated database in minutes. The admin panel
lets you review and fix anything the AI got wrong.

But as soon as I added real users and real reading sessions, the API started slowing down.
Pages that should load in 100ms were taking 2–3 seconds. The culprit was the N+1 query
pattern — hiding in places I didn't expect.

**Part 3** is about finding every N+1, fixing them with DQL joins and `EXTRA_LAZY` fetch modes,
and what I learned about Doctrine's behaviour that I wish someone had told me earlier.

See you in the next one.
