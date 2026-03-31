---
layout: post
title: "Manga Kotoba, Part 1: From Zero to First iOS Screen"
date: 2026-04-28 10:00:00 +0000
tags: [ios, swift, swiftui, japanese, manga, learning]
series: manga-kotoba
---

<!-- =====================================================================
     SERIES PROGRESS BAR
     ===================================================================== -->
<style>
/* ── Global post styles ─────────────────────────────────────────────────── */
.mk-section { margin: 2.8rem 0; }

/* Series progress bar */
.series-bar {
  display: flex; align-items: center; gap: 0;
  background: #1e1f24; border-radius: 12px;
  padding: 18px 24px; margin: 0 0 2.4rem; flex-wrap: wrap; gap: 8px;
  border: 1px solid #2e2f35;
}
.series-bar-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: .1em;
  color: rgba(255,255,255,.4); margin-bottom: 12px; width: 100%;
}
.series-part {
  display: flex; align-items: center; gap: 0; flex: 1; min-width: 0;
}
.series-part-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 14px; border-radius: 8px; background: transparent;
  border: 1px solid #2e2f35; cursor: default; flex: 1; min-width: 0;
  transition: border-color .2s;
}
.series-part-btn.current {
  background: #1a2e23; border-color: #7bcdab;
}
.series-part-btn.current .sp-dot { background: #7bcdab; box-shadow: 0 0 8px #7bcdab88; }
.series-part-btn.current .sp-title { color: #7bcdab; }
.series-part-btn.future .sp-dot { background: #2e2f35; }
.series-part-btn.future .sp-title { color: rgba(255,255,255,.35); }
.sp-dot {
  width: 10px; height: 10px; border-radius: 50%;
}
.sp-num { font-size: 10px; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .08em; }
.sp-title { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: center; }
.series-connector {
  width: 20px; height: 1px; background: #2e2f35; flex-shrink: 0; margin: 0 4px;
  align-self: center; margin-bottom: 20px;
}
@media (max-width: 620px) {
  .series-connector { display: none; }
  .series-part-btn { padding: 8px 6px; }
  .sp-title { font-size: 10px; }
}

/* Decision tree */
.dtree {
  background: #1e1f24; border-radius: 12px; padding: 24px;
  border: 1px solid #2e2f35; margin: 1.6rem 0;
}
.dtree h3 { margin: 0 0 20px; color: #fbef8a; font-size: 15px; }
.dt-step {
  display: none; animation: dtFadeIn .35s ease;
}
.dt-step.active { display: block; }
@keyframes dtFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.dt-question {
  font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 16px;
}
.dt-context {
  font-size: 14px; color: rgba(255,255,255,.6); margin-bottom: 18px; line-height: 1.7;
}
.dt-choices { display: flex; gap: 10px; flex-wrap: wrap; }
.dt-choice {
  padding: 10px 18px; border-radius: 8px; background: #252629;
  border: 1px solid #3a3b40; color: rgba(255,255,255,.8); font-size: 14px;
  cursor: pointer; transition: all .2s;
}
.dt-choice:hover { border-color: #7bcdab; color: #fff; background: #1a2e23; }
.dt-choice.chosen { border-color: #7bcdab; background: #1a2e23; color: #7bcdab; font-weight: 700; cursor: default; }
.dt-answer {
  margin-top: 20px; padding: 14px 18px;
  background: #252629; border-radius: 8px; border-left: 3px solid #7bcdab;
  font-size: 14px; line-height: 1.7; display: none;
}
.dt-answer.visible { display: block; animation: dtFadeIn .3s ease; }
.dt-answer strong { color: #7bcdab; }
.dt-next-btn {
  margin-top: 14px; padding: 9px 20px; border-radius: 8px;
  background: #7bcdab; border: none; color: #19191c; font-size: 14px;
  font-weight: 700; cursor: pointer; display: none; transition: opacity .2s;
}
.dt-next-btn:hover { opacity: .85; }
.dt-next-btn.visible { display: inline-block; }
.dt-progress {
  display: flex; gap: 6px; margin-bottom: 20px;
}
.dt-prog-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #2e2f35;
  transition: background .3s;
}
.dt-prog-dot.done { background: #7bcdab; }
.dt-prog-dot.active { background: #fbef8a; }

/* ER Diagram */
.er-wrap {
  background: #1e1f24; border-radius: 12px; padding: 24px 20px;
  border: 1px solid #2e2f35; margin: 1.6rem 0; overflow-x: auto;
}
.er-wrap h3 { margin: 0 0 20px; color: #fbef8a; font-size: 15px; }
.er-svg { min-width: 600px; width: 100%; display: block; }

/* Code blocks */
pre.code-block {
  background: #1e1f24; border-radius: 10px; padding: 18px 20px;
  overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 13px;
  line-height: 1.7; border: 1px solid #2e2f35; margin: 1.2rem 0;
}
.kw  { color: #c792ea; } /* keyword   */
.ty  { color: #7bcdab; } /* type      */
.fn  { color: #fbef8a; } /* function  */
.st  { color: #f0a070; } /* string    */
.cm  { color: rgba(255,255,255,.35); } /* comment */
.nu  { color: #f08080; } /* number    */
.at  { color: #80c8f0; } /* attribute */

/* iPhone mockup */
.iphone-scene {
  display: flex; justify-content: center; padding: 32px 0;
  background: #1a1b1f; border-radius: 14px; border: 1px solid #2e2f35;
  margin: 1.6rem 0; overflow: hidden;
}
.iphone-frame {
  width: 320px; height: 640px; border-radius: 46px;
  background: #0a0a0c; border: 2px solid #3a3b40;
  box-shadow: 0 0 0 1px #1a1b1e, 0 20px 60px rgba(0,0,0,.6);
  position: relative; overflow: hidden; flex-shrink: 0;
}
.iphone-notch {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 120px; height: 28px; background: #0a0a0c; border-radius: 0 0 20px 20px;
  z-index: 10;
}
.iphone-screen {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: #f2f2f7; overflow: hidden;
}
.iphone-statusbar {
  height: 44px; background: #fff; display: flex; align-items: flex-end;
  padding: 0 20px 6px; justify-content: space-between;
  font-size: 11px; font-weight: 600; color: #000; z-index: 5; position: relative;
}
.iphone-navbar {
  background: rgba(249,249,249,.95); backdrop-filter: blur(10px);
  padding: 10px 16px 8px; border-bottom: 1px solid rgba(0,0,0,.1);
}
.iphone-navbar h2 { margin: 0; font-size: 17px; font-weight: 700; color: #000; text-align: center; }
.iphone-content { overflow-y: auto; height: calc(100% - 44px - 49px - 49px); padding: 12px; }
.iphone-tabbar {
  position: absolute; bottom: 0; left: 0; right: 0; height: 49px;
  background: rgba(249,249,249,.95); backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0,0,0,.1);
  display: flex; align-items: center;
}
.tab-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-size: 9px; color: rgba(0,0,0,.4); cursor: pointer; padding: 6px 0;
  transition: color .15s;
}
.tab-item.active { color: #34a853; }
.tab-item svg { width: 22px; height: 22px; }

/* Manga grid inside phone */
.mk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mk-card {
  border-radius: 10px; overflow: hidden; background: #fff;
  box-shadow: 0 1px 6px rgba(0,0,0,.12); cursor: pointer;
  transition: transform .15s, box-shadow .15s; position: relative;
}
.mk-card:hover { transform: scale(1.03); box-shadow: 0 4px 14px rgba(0,0,0,.2); }
.mk-card-cover {
  height: 90px; display: flex; align-items: center; justify-content: center;
  font-size: 22px;
}
.mk-card-body { padding: 6px 8px 8px; }
.mk-card-title { font-size: 10px; font-weight: 700; color: #000; margin: 0 0 3px; }
.mk-card-sub { font-size: 9px; color: rgba(0,0,0,.45); margin: 0; }
.mk-progress-ring {
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px;
}

/* Detail view inside phone */
.phone-detail {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: #f2f2f7; transform: translateX(100%);
  transition: transform .35s cubic-bezier(.4,0,.2,1);
  z-index: 20;
}
.phone-detail.visible { transform: translateX(0); }
.phone-detail-header {
  height: 44px; background: rgba(249,249,249,.95);
  display: flex; align-items: center; padding: 0 12px;
  border-bottom: 1px solid rgba(0,0,0,.1);
}
.phone-back-btn {
  background: none; border: none; color: #007aff; font-size: 14px;
  cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0;
}
.phone-detail-title { flex: 1; text-align: center; font-weight: 700; font-size: 15px; color: #000; }
.volume-item {
  background: #fff; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 12px; cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}
.vol-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.vol-body { flex: 1; }
.vol-title { font-size: 13px; font-weight: 600; color: #000; margin: 0 0 2px; }
.vol-sub { font-size: 11px; color: rgba(0,0,0,.45); margin: 0; }

/* Swipe demo */
.swipe-scene {
  background: #1a1b1f; border-radius: 14px; border: 1px solid #2e2f35;
  padding: 32px 20px; margin: 1.6rem 0; display: flex;
  flex-direction: column; align-items: center; gap: 20px;
  overflow: hidden; position: relative;
}
.swipe-bg-card {
  width: 280px; height: 160px; border-radius: 16px;
  background: #252629; border: 1px solid #2e2f35;
  position: absolute; top: 32px; display: flex; align-items: center;
  justify-content: center; flex-direction: column; gap: 8px;
}
.swipe-bg-card .next-word { font-size: 22px; color: rgba(255,255,255,.3); }
.swipe-card-wrap {
  position: relative; z-index: 2; touch-action: none;
  user-select: none; width: 280px;
}
.swipe-card {
  width: 280px; height: 160px; border-radius: 16px;
  background: #252629; border: 1px solid #3a3b40;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; cursor: grab;
  transition: box-shadow .2s; box-shadow: 0 4px 24px rgba(0,0,0,.4);
  position: relative; will-change: transform;
}
.swipe-card:active { cursor: grabbing; }
.swipe-word { font-size: 28px; font-weight: 700; color: #fbef8a; }
.swipe-reading { font-size: 15px; color: rgba(255,255,255,.55); }
.swipe-meaning { font-size: 14px; color: #7bcdab; }
.swipe-hint { font-size: 11px; color: rgba(255,255,255,.25); margin-top: 4px; }
.swipe-verdict {
  position: absolute; top: 14px;
  padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 700;
  opacity: 0; transition: opacity .1s; pointer-events: none;
}
.swipe-verdict.known { right: 14px; background: #1a3a2a; color: #7bcdab; border: 1.5px solid #7bcdab; }
.swipe-verdict.skip  { left: 14px;  background: #3a1a1a; color: #f08080; border: 1.5px solid #f08080; }
.swipe-check {
  position: absolute; inset: 0; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 56px; opacity: 0; pointer-events: none;
  background: rgba(26,62,42,.9); transition: opacity .25s;
}
.swipe-buttons { display: flex; gap: 12px; position: relative; z-index: 3; }
.swipe-btn {
  padding: 10px 20px; border-radius: 24px; font-size: 14px; font-weight: 700;
  cursor: pointer; border: 2px solid; transition: all .15s;
}
.swipe-btn-skip { border-color: #f08080; color: #f08080; background: transparent; }
.swipe-btn-skip:hover { background: #3a1a1a; }
.swipe-btn-known { border-color: #7bcdab; color: #7bcdab; background: transparent; }
.swipe-btn-known:hover { background: #1a3a2a; }
.swipe-counter {
  font-size: 13px; color: rgba(255,255,255,.4); position: relative; z-index: 3;
}
.swipe-done {
  display: none; text-align: center;
  font-size: 16px; color: rgba(255,255,255,.7); line-height: 1.8;
}
.swipe-done .big { font-size: 40px; display: block; margin-bottom: 8px; }
.swipe-done .stats { color: #7bcdab; font-weight: 700; }
.swipe-restart {
  padding: 9px 22px; border-radius: 8px; background: #7bcdab;
  border: none; color: #19191c; font-size: 14px; font-weight: 700;
  cursor: pointer; margin-top: 12px;
}

/* tip / warn callouts */
.tip {
  border-left: 3px solid #7bcdab; background: #1a2e23; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.tip strong { color: #7bcdab; }
.warn {
  border-left: 3px solid #fbef8a; background: #2a2a1a; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px;
}
.warn strong { color: #fbef8a; }

/* Series preview cards */
.parts-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px; margin: 1.6rem 0;
}
.part-card {
  background: #1e1f24; border-radius: 10px; padding: 18px;
  border: 1px solid #2e2f35; transition: border-color .2s, transform .2s;
}
.part-card:hover { border-color: #3a3b40; transform: translateY(-2px); }
.part-card.this-one { border-color: #7bcdab; }
.part-num { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: rgba(255,255,255,.35); margin-bottom: 6px; }
.part-title { font-size: 14px; font-weight: 700; color: #fbef8a; margin-bottom: 8px; }
.part-desc { font-size: 13px; color: rgba(255,255,255,.55); line-height: 1.6; }
.part-tag { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 12px; background: #2e2f35; color: rgba(255,255,255,.5); margin-top: 8px; }
.part-card.this-one .part-tag { background: #1a3a2a; color: #7bcdab; }

@media (max-width: 600px) {
  .parts-grid { grid-template-columns: 1fr; }
  .swipe-card, .swipe-bg-card, .swipe-card-wrap { width: 240px; }
  .iphone-frame { width: 280px; height: 560px; }
}
</style>

<!-- SERIES BAR -->
<div class="series-bar">
  <div class="series-bar-label">📚 Manga Kotoba — Building an iOS vocabulary app</div>
  <div class="series-part">
    <div class="series-part-btn current">
      <span class="sp-num">Part 1</span>
      <span class="sp-dot"></span>
      <span class="sp-title">From Zero to Screen</span>
    </div>
  </div>
  <div class="series-connector"></div>
  <div class="series-part">
    <div class="series-part-btn future">
      <span class="sp-num">Part 2</span>
      <span class="sp-dot"></span>
      <span class="sp-title">Vocab Scraping + AI</span>
    </div>
  </div>
  <div class="series-connector"></div>
  <div class="series-part">
    <div class="series-part-btn future">
      <span class="sp-num">Part 3</span>
      <span class="sp-dot"></span>
      <span class="sp-title">Progress Tracking</span>
    </div>
  </div>
  <div class="series-connector"></div>
  <div class="series-part">
    <div class="series-part-btn future">
      <span class="sp-num">Part 4</span>
      <span class="sp-dot"></span>
      <span class="sp-title">Paywall + Auth</span>
    </div>
  </div>
  <div class="series-connector"></div>
  <div class="series-part">
    <div class="series-part-btn future">
      <span class="sp-num">Part 5</span>
      <span class="sp-dot"></span>
      <span class="sp-title">App Store Launch</span>
    </div>
  </div>
</div>

---

## The Spark

{: class="marginalia" }
"The hardest part of a side project isn't the code — it's having a problem you genuinely want to solve."

I've been learning Japanese for a while now. Not casually — I mean the full commitment: Anki decks at breakfast,
grammar guides on lunch breaks, anime with Japanese subtitles in the evening. And somewhere in all that, I fell
in love with manga. Not just as entertainment, but as a *learning medium*. Real dialogue, furigana on hard words,
visual context that makes meaning stick.

But there was a gap — a frustrating one. My vocabulary apps had no idea which manga I was reading. Anki didn't know
about *One Piece*. WaniKani couldn't tell me which kanji appear on page 12 of a specific volume. Everything was
disconnected. I'd encounter 湿気 (しっけ — *humidity*) in a beach chapter, look it up, and it'd vanish into a
generic deck with no connection to the page where I found it.

That's where **Manga Kotoba** was born. An iOS app backed by a real API that maps vocabulary *to the page it appears on*.
Browse your manga library, open any page, see exactly which words you don't know yet. Mark them as known. Track your progress.
Build vocabulary in context.

This is Part 1 of a five-part series about building it from scratch.

---

## Choosing the Stack — Interactive Decision Tree

Choosing a stack for a side project is surprisingly emotional. You want to learn something new, but you also
want to *ship something*. Every decision is a trade-off between exploration and pragmatism. Here's the exact
thought process I went through — click each node to see my reasoning.

<div class="dtree" id="decisionTree">
  <h3>🗺 Tech Stack Decision Tree</h3>
  <div class="dt-progress" id="dtProgress">
    <div class="dt-prog-dot active" id="dp0"></div>
    <div class="dt-prog-dot" id="dp1"></div>
    <div class="dt-prog-dot" id="dp2"></div>
    <div class="dt-prog-dot" id="dp3"></div>
  </div>

  <!-- Step 0 -->
  <div class="dt-step active" id="dt0">
    <div class="dt-question">What kind of app?</div>
    <div class="dt-context">The vocabulary is tied to physical pages of manga. Users need to browse a library on their phone, flip through volumes, and mark words inline. That calls for a native mobile experience — not a web app.</div>
    <div class="dt-choices">
      <button class="dt-choice" onclick="dtChoose(0,'web')">🌐 Web app</button>
      <button class="dt-choice" onclick="dtChoose(0,'mobile')">📱 Mobile app</button>
    </div>
    <div class="dt-answer" id="da0">
      <strong>Mobile app → iOS only.</strong> I have a Mac and an iPhone. Android would mean a whole separate toolchain.
      iOS means Xcode, and Xcode means either UIKit or SwiftUI. SwiftUI is the modern path — declarative,
      compositional, and honestly a pleasure once it clicks. Decision: <strong>SwiftUI</strong>.
    </div>
    <button class="dt-next-btn" id="dn0" onclick="dtNext(1)">Next →</button>
  </div>

  <!-- Step 1 -->
  <div class="dt-step" id="dt1">
    <div class="dt-question">Do you need a backend?</div>
    <div class="dt-context">The vocabulary data per page has to live somewhere. So does user auth, known-word tracking, and the manga library. All of that needs to be shared across devices and persisted server-side.</div>
    <div class="dt-choices">
      <button class="dt-choice" onclick="dtChoose(1,'no')">❌ No — local data only</button>
      <button class="dt-choice" onclick="dtChoose(1,'yes')">✅ Yes — real backend</button>
    </div>
    <div class="dt-answer" id="da1">
      <strong>Yes, definitely.</strong> A "local only" approach would mean bundling all the vocabulary for every
      manga into the app binary — infeasible at scale. The backend holds the vocabulary database,
      handles auth, and exposes a REST API. I know PHP well, I've shipped real apps with Symfony.
      <strong>Symfony 7</strong> it is.
    </div>
    <button class="dt-next-btn" id="dn1" onclick="dtNext(2)">Next →</button>
  </div>

  <!-- Step 2 -->
  <div class="dt-step" id="dt2">
    <div class="dt-question">Which database and API format?</div>
    <div class="dt-context">The data model is relational — manga has volumes, volumes have pages, pages have words, words are vocabulary entries. MySQL is a natural fit. As for the API layer...</div>
    <div class="dt-choices">
      <button class="dt-choice" onclick="dtChoose(2,'raw')">🔧 Raw Symfony controllers</button>
      <button class="dt-choice" onclick="dtChoose(2,'apiplatform')">⚡ API Platform</button>
    </div>
    <div class="dt-answer" id="da2">
      <strong>API Platform.</strong> It's the Symfony ecosystem's superpower. Add <code>#[ApiResource]</code>
      to an entity and you get GET/POST/PATCH/DELETE endpoints, pagination, filtering, serialisation groups,
      and OpenAPI docs — for free. I'd used it on client work before.
      The database: <strong>MySQL 8</strong> (familiar, reliable, excellent with Doctrine ORM).
    </div>
    <button class="dt-next-btn" id="dn2" onclick="dtNext(3)">Next →</button>
  </div>

  <!-- Step 3 -->
  <div class="dt-step" id="dt3">
    <div class="dt-question">Where to deploy?</div>
    <div class="dt-context">I need the backend accessible from the iOS simulator and eventually a real device. Self-hosting is an option. But for a side project in 2026...</div>
    <div class="dt-choices">
      <button class="dt-choice" onclick="dtChoose(3,'self')">🖥 Self-hosted VPS</button>
      <button class="dt-choice" onclick="dtChoose(3,'heroku')">🚀 Heroku</button>
    </div>
    <div class="dt-answer" id="da3">
      <strong>Heroku.</strong> Push to deploy, managed Postgres (though I swapped to MySQL addon), automatic
      HTTPS, no nginx config hell. For a learning project, the operational overhead of a VPS isn't worth it.
      There will be pain later (there's always pain with Heroku and HTTPS — spoiler: Part 1 ends with a
      commit called <em>"General fix, a lot of issues due to heroku usage"</em>).
    </div>
    <button class="dt-next-btn" id="dn3" onclick="dtDone()">See the result ✓</button>
  </div>
</div>

---

## Day 1: Raw Symfony — The Domain Model

The very first backend commit after the raw Symfony project was `b153737`:
`feat(db): add initial schema migration for manga platform`.

Before a single endpoint, before a single API call from the phone, I sat down and drew out the domain.
What *are* the things in this system?

<pre class="code-block"><span class="cm">// The core entities, sketched on paper first</span>

<span class="kw">Manga</span>       → has many <span class="kw">Volume</span>s
<span class="kw">Volume</span>      → belongs to <span class="kw">Manga</span>, has many <span class="kw">Page</span>s
<span class="kw">Page</span>        → belongs to <span class="kw">Volume</span>, has many <span class="kw">Word</span>s (occurrences)
<span class="kw">Vocabulary</span>  → the central dictionary (word, reading, meaning, JLPT)
<span class="kw">Word</span>        → a page-level occurrence linking <span class="kw">Page</span> ↔ <span class="kw">Vocabulary</span>
<span class="kw">KnownWord</span>   → User ↔ Vocabulary join (words the user has learned)
<span class="kw">UserLibrary</span> → User ↔ Manga join (the user's personal collection)</pre>

That first migration created all ten tables in one go. Here's the heart of it — the `manga` and `vocabulary`
tables that everything else hangs off:

<pre class="code-block"><span class="cm">// migrations/Version20260228145912.php</span>

<span class="kw">$this</span>-><span class="fn">addSql</span>(<span class="st">'CREATE TABLE manga (
    id          INT AUTO_INCREMENT NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description LONGTEXT DEFAULT NULL,
    cover_url   VARCHAR(500) DEFAULT NULL,
    author      VARCHAR(255) DEFAULT NULL,
    status      VARCHAR(10) DEFAULT NULL,
    total_pages INT NOT NULL DEFAULT 0,
    PRIMARY KEY(id)
) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB'</span>);

<span class="kw">$this</span>-><span class="fn">addSql</span>(<span class="st">'CREATE TABLE vocabulary (
    id             INT AUTO_INCREMENT NOT NULL,
    text           VARCHAR(255) NOT NULL,
    reading        VARCHAR(255) DEFAULT NULL,
    meaning        LONGTEXT DEFAULT NULL,
    jlpt_level     VARCHAR(2) DEFAULT NULL,
    part_of_speech VARCHAR(50) DEFAULT NULL,
    PRIMARY KEY(id)
) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB'</span>);</pre>

### Interactive Entity-Relationship Diagram

<div class="er-wrap">
  <h3>🗄 Domain Model — Entity Relationships</h3>
  <svg class="er-svg" viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#3a3b40"/>
      </marker>
      <marker id="arrow-g" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#7bcdab"/>
      </marker>
    </defs>

    <!-- Manga -->
    <rect x="20" y="40" width="140" height="130" rx="8" fill="#1e1f24" stroke="#7bcdab" stroke-width="1.5"/>
    <rect x="20" y="40" width="140" height="28" rx="8" fill="#1a3a2a"/>
    <rect x="20" y="56" width="140" height="12" rx="0" fill="#1a3a2a"/>
    <text x="90" y="59" text-anchor="middle" fill="#7bcdab" font-size="12" font-weight="700" font-family="JetBrains Mono,monospace">Manga</text>
    <text x="30" y="89" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">id: INT PK</text>
    <text x="30" y="105" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">title: VARCHAR</text>
    <text x="30" y="121" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">author: VARCHAR</text>
    <text x="30" y="137" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">status: VARCHAR</text>
    <text x="30" y="153" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">total_pages: INT</text>

    <!-- Volume -->
    <rect x="220" y="20" width="140" height="110" rx="8" fill="#1e1f24" stroke="#fbef8a" stroke-width="1.5"/>
    <rect x="220" y="20" width="140" height="28" rx="8" fill="#2a2a1a"/>
    <rect x="220" y="36" width="140" height="12" rx="0" fill="#2a2a1a"/>
    <text x="290" y="39" text-anchor="middle" fill="#fbef8a" font-size="12" font-weight="700" font-family="JetBrains Mono,monospace">Volume</text>
    <text x="230" y="67" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">id: INT PK</text>
    <text x="230" y="83" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">manga_id: INT FK</text>
    <text x="230" y="99" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">number: INT</text>
    <text x="230" y="115" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">title: VARCHAR</text>

    <!-- Page -->
    <rect x="420" y="20" width="140" height="110" rx="8" fill="#1e1f24" stroke="#80c8f0" stroke-width="1.5"/>
    <rect x="420" y="20" width="140" height="28" rx="8" fill="#1a2030"/>
    <rect x="420" y="36" width="140" height="12" rx="0" fill="#1a2030"/>
    <text x="490" y="39" text-anchor="middle" fill="#80c8f0" font-size="12" font-weight="700" font-family="JetBrains Mono,monospace">Page</text>
    <text x="430" y="67" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">id: INT PK</text>
    <text x="430" y="83" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">volume_id: INT FK</text>
    <text x="430" y="99" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">number: INT</text>
    <text x="430" y="115" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">image_url: VARCHAR</text>

    <!-- Vocabulary -->
    <rect x="600" y="120" width="145" height="130" rx="8" fill="#1e1f24" stroke="#c792ea" stroke-width="1.5"/>
    <rect x="600" y="120" width="145" height="28" rx="8" fill="#2a1a3a"/>
    <rect x="600" y="136" width="145" height="12" rx="0" fill="#2a1a3a"/>
    <text x="672" y="139" text-anchor="middle" fill="#c792ea" font-size="12" font-weight="700" font-family="JetBrains Mono,monospace">Vocabulary</text>
    <text x="610" y="166" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">id: INT PK</text>
    <text x="610" y="182" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">text: VARCHAR</text>
    <text x="610" y="198" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">reading: VARCHAR</text>
    <text x="610" y="214" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">meaning: TEXT</text>
    <text x="610" y="230" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">jlpt_level: VARCHAR</text>

    <!-- Word (join) -->
    <rect x="420" y="180" width="140" height="90" rx="8" fill="#1e1f24" stroke="#f0a070" stroke-width="1.5"/>
    <rect x="420" y="180" width="140" height="28" rx="8" fill="#2a1f10"/>
    <rect x="420" y="196" width="140" height="12" rx="0" fill="#2a1f10"/>
    <text x="490" y="199" text-anchor="middle" fill="#f0a070" font-size="12" font-weight="700" font-family="JetBrains Mono,monospace">Word</text>
    <text x="430" y="226" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">page_id: INT FK</text>
    <text x="430" y="242" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">vocabulary_id: INT FK</text>
    <text x="430" y="258" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">position: INT</text>

    <!-- KnownWord -->
    <rect x="20" y="230" width="140" height="90" rx="8" fill="#1e1f24" stroke="#7bcdab" stroke-width="1" stroke-dasharray="4,3"/>
    <rect x="20" y="230" width="140" height="28" rx="8" fill="#1a2e23"/>
    <rect x="20" y="246" width="140" height="12" rx="0" fill="#1a2e23"/>
    <text x="90" y="249" text-anchor="middle" fill="#7bcdab" font-size="11" font-weight="700" font-family="JetBrains Mono,monospace">KnownWord</text>
    <text x="30" y="276" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">user_id: INT FK</text>
    <text x="30" y="292" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">vocabulary_id: INT FK</text>
    <text x="30" y="308" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">UNIQUE constraint</text>

    <!-- UserLibrary -->
    <rect x="220" y="180" width="140" height="90" rx="8" fill="#1e1f24" stroke="#7bcdab" stroke-width="1" stroke-dasharray="4,3"/>
    <rect x="220" y="180" width="140" height="28" rx="8" fill="#1a2e23"/>
    <rect x="220" y="196" width="140" height="12" rx="0" fill="#1a2e23"/>
    <text x="290" y="199" text-anchor="middle" fill="#7bcdab" font-size="11" font-weight="700" font-family="JetBrains Mono,monospace">UserLibrary</text>
    <text x="230" y="226" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">user_id: INT FK</text>
    <text x="230" y="242" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">manga_id: INT FK</text>
    <text x="230" y="258" fill="rgba(255,255,255,.6)" font-size="10" font-family="JetBrains Mono,monospace">status: VARCHAR</text>

    <!-- Arrows: Manga → Volume -->
    <line x1="160" y1="75" x2="218" y2="60" stroke="#3a3b40" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="175" y="62" fill="rgba(255,255,255,.3)" font-size="9" font-family="sans-serif">1:N</text>

    <!-- Volume → Page -->
    <line x1="360" y1="65" x2="418" y2="65" stroke="#3a3b40" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="374" y="60" fill="rgba(255,255,255,.3)" font-size="9" font-family="sans-serif">1:N</text>

    <!-- Page → Word -->
    <line x1="490" y1="130" x2="490" y2="178" stroke="#3a3b40" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="494" y="160" fill="rgba(255,255,255,.3)" font-size="9" font-family="sans-serif">1:N</text>

    <!-- Word → Vocabulary -->
    <line x1="560" y1="220" x2="598" y2="185" stroke="#3a3b40" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="568" y="196" fill="rgba(255,255,255,.3)" font-size="9" font-family="sans-serif">N:1</text>

    <!-- UserLibrary → Manga -->
    <line x1="290" y1="180" x2="130" y2="130" stroke="#7bcdab" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrow-g)"/>

    <!-- KnownWord → Vocabulary -->
    <line x1="160" y1="275" x2="598" y2="185" stroke="#7bcdab" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrow-g)"/>

    <!-- Legend -->
    <rect x="22" y="345" width="10" height="2" fill="#3a3b40"/>
    <text x="36" y="351" fill="rgba(255,255,255,.4)" font-size="10" font-family="sans-serif">Core relation</text>
    <line x1="120" y1="346" x2="130" y2="346" stroke="#7bcdab" stroke-width="1" stroke-dasharray="4,3"/>
    <text x="134" y="351" fill="rgba(255,255,255,.4)" font-size="10" font-family="sans-serif">User feature join</text>
  </svg>
</div>

The design separates *content* (Manga/Volume/Page/Vocabulary) from *user state* (KnownWord/UserLibrary).
That separation would prove its worth later when adding progress tracking and subscriptions — the core content
never needs to know about any specific user.

---

## The API Platform Magic Moment

After the migration came the entities. And after the entities came the moment that made me laugh out loud in
my apartment at 11 PM.

I added `#[ApiResource]` to `Manga.php`:

<pre class="code-block"><span class="cm">// src/Entity/Manga.php</span>

<span class="at">#[ORM\Entity(repositoryClass: MangaRepository::class)]</span>
<span class="at">#[ApiResource(</span>
    <span class="fn">operations:</span> [
        <span class="kw">new</span> <span class="ty">GetCollection</span>(
            <span class="fn">normalizationContext:</span> [<span class="st">'groups'</span> => [<span class="st">'manga:read'</span>]],
            <span class="fn">security:</span> <span class="st">"is_granted('PUBLIC_ACCESS')"</span>,
        ),
        <span class="kw">new</span> <span class="ty">Get</span>(
            <span class="fn">normalizationContext:</span> [<span class="st">'groups'</span> => [<span class="st">'manga:read'</span>, <span class="st">'manga:item'</span>]],
            <span class="fn">security:</span> <span class="st">"is_granted('PUBLIC_ACCESS')"</span>,
        ),
        <span class="kw">new</span> <span class="ty">Post</span>(<span class="fn">security:</span> <span class="st">"is_granted('ROLE_MANAGER')"</span>),
        <span class="kw">new</span> <span class="ty">Patch</span>(<span class="fn">security:</span> <span class="st">"is_granted('ROLE_MANAGER')"</span>),
        <span class="kw">new</span> <span class="ty">Delete</span>(<span class="fn">security:</span> <span class="st">"is_granted('ROLE_MANAGER')"</span>),
    ],
<span class="at">)]</span>
<span class="kw">class</span> <span class="ty">Manga</span>
{
    <span class="at">#[ORM\Id]</span>
    <span class="at">#[ORM\GeneratedValue]</span>
    <span class="at">#[ORM\Column(type: 'integer')]</span>
    <span class="at">#[Groups(['manga:read'])]</span>
    <span class="kw">private</span> ?<span class="ty">int</span> <span class="kw">$id</span> = <span class="kw">null</span>;
    <span class="cm">// ... fields ...</span>
}</pre>

That's it. One PHP attribute. Now `GET /api/mangas` returns paginated JSON.
`GET /api/mangas/1` returns a single manga. `POST /api/mangas` (if you're ROLE_MANAGER) creates one.
OpenAPI docs appear at `/api/docs`. Filters, sorting, pagination — all configurable from the same attribute.

<div class="tip">
<strong>API Platform lesson:</strong> The serialization groups (<code>manga:read</code>, <code>manga:write</code>) are how you control exactly which fields appear in responses vs. mutations. Get these right early — retrofitting them is painful when the iOS app already expects a specific shape.
</div>

---

## The First iOS Screen — Browser Mockup

The iOS side started life as a pure mockup. The commit `97349b3 Browser screen mockup` had zero networking —
just hard-coded data and a `LazyVGrid`. The goal was to feel the UI before wiring up the API. Here's what
the browse screen looked like conceptually. Click a card to see the detail view:

<div class="iphone-scene">
  <div class="iphone-frame" id="iphoneFrame">
    <div class="iphone-notch"></div>
    <div class="iphone-screen">
      <!-- Browse screen -->
      <div id="browseScreen">
        <div class="iphone-statusbar">
          <span>9:41</span>
          <span>●●●</span>
        </div>
        <div class="iphone-navbar"><h2>Browse</h2></div>
        <div class="iphone-content">
          <div class="mk-grid" id="mangaGrid"></div>
        </div>
        <div class="iphone-tabbar">
          <div class="tab-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Library
          </div>
          <div class="tab-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Browse
          </div>
          <div class="tab-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile
          </div>
        </div>
      </div>

      <!-- Detail screen (slides in) -->
      <div class="phone-detail" id="detailScreen">
        <div class="phone-detail-header">
          <button class="phone-back-btn" onclick="closeDetail()">
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7L7 13" stroke="#007aff" stroke-width="2" stroke-linecap="round"/></svg>
            Browse
          </button>
          <span class="phone-detail-title" id="detailTitle">—</span>
          <span style="width:60px"></span>
        </div>
        <div style="padding:12px; overflow-y:auto; height:calc(100% - 44px)">
          <div id="volumeList"></div>
        </div>
      </div>
    </div>
  </div>
</div>

The `LazyVGrid` with `.adaptive(minimum: 150)` columns was the first piece of SwiftUI that genuinely
delighted me. Write it once and it adapts from a 3-column iPad layout down to 2-column on a small iPhone —
no breakpoints, no media queries, just adaptive layout from a single declaration.

<pre class="code-block"><span class="cm">// The browse grid — dead simple</span>
<span class="kw">struct</span> <span class="ty">BrowseSeriesView</span>: <span class="ty">View</span> {
    <span class="at">@State</span> <span class="kw">private var</span> searchText = <span class="st">""</span>
    <span class="kw">let</span> columns = [<span class="ty">GridItem</span>(.<span class="fn">adaptive</span>(minimum: <span class="nu">150</span>), spacing: <span class="nu">16</span>)]

    <span class="kw">var</span> body: <span class="kw">some</span> <span class="ty">View</span> {
        <span class="ty">NavigationStack</span> {
            <span class="ty">ScrollView</span> {
                <span class="ty">LazyVGrid</span>(columns: columns, spacing: <span class="nu">16</span>) {
                    <span class="ty">ForEach</span>(mangas) { manga <span class="kw">in</span>
                        <span class="ty">NavigationLink</span>(
                            destination: <span class="ty">MangaDetailView</span>(slug: manga.slug)
                        ) {
                            <span class="ty">MangaCardView</span>(manga: manga)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle(<span class="st">"Browse"</span>)
        }
    }
}</pre>

---

## The First SwiftUI Struggles

The mockup was easy. Wiring it to a real API was where the reality checks started coming in thick and fast.

### Problem 1 — `localhost` doesn't mean the same thing inside the Simulator

Commit `7b21662`: *"Make it work with the docker localhost"*. Three hours of debugging to understand something
that seems obvious in hindsight: the iOS Simulator runs in a separate network namespace. When you type
`http://localhost:8080` in Swift, you're asking the *iPhone simulator* to connect to port 8080 on *its*
localhost — which is empty.

The fix: use your Mac's local IP address instead.

<pre class="code-block"><span class="cm">// ❌ Before — connects to the simulator's own loopback</span>
<span class="kw">enum</span> <span class="ty">APIConfig</span> {
    <span class="kw">static let</span> baseURL = <span class="ty">URL</span>(string: <span class="st">"http://localhost:8080"</span>)!
}

<span class="cm">// ✅ After — connects to the Mac running the Docker container</span>
<span class="kw">enum</span> <span class="ty">APIConfig</span> {
    <span class="kw">static let</span> baseURL = <span class="ty">URL</span>(string: <span class="st">"http://192.168.1.42:8080"</span>)!
}</pre>

<div class="warn">
<strong>⚠️ iOS Simulator networking:</strong> The simulator shares your Mac's Wi-Fi connection but has its own loopback (<code>127.0.0.1</code>). Use <code>ifconfig | grep "inet " | grep -v 127</code> to find your Mac's local IP. Better yet, add an <code>#if DEBUG</code> block that swaps between your local IP and the production Heroku URL.
</div>

### Problem 2 — JSON-LD `@id` / `@type` fields that Codable doesn't expect

API Platform returns JSON-LD by default. That means every response includes `@id`, `@type`, and `hydra:*`
fields that Swift's `Codable` has never heard of. My first `MangaModels.swift` had a clean, simple struct:

<pre class="code-block"><span class="cm">// What I wanted</span>
<span class="kw">struct</span> <span class="ty">APIMangaItem</span>: <span class="ty">Codable</span> {
    <span class="kw">let</span> id:    <span class="ty">Int</span>
    <span class="kw">let</span> title: <span class="ty">String</span>
}

<span class="cm">// What the API actually returned</span>
<span class="cm">// {</span>
<span class="cm">//   "@id": "/api/mangas/1",</span>
<span class="cm">//   "@type": "Manga",</span>
<span class="cm">//   "id": 1,</span>
<span class="cm">//   "title": "Naruto"</span>
<span class="cm">// }</span>
<span class="cm">// → Swift crashes: "No value associated with key @id"</span></pre>

The solution was either switching API Platform to output plain JSON (add `format: 'json'` to the
`GetCollection` operation), or adding `CodingKeys` to ignore unknown fields. I went with the first option —
cleaner responses, no special-casing in the client:

<pre class="code-block"><span class="kw">new</span> <span class="ty">GetCollection</span>(
    <span class="fn">formats:</span> [<span class="st">'json'</span> => [<span class="st">'application/json'</span>]],
    <span class="fn">normalizationContext:</span> [<span class="st">'groups'</span> => [<span class="st">'manga:read'</span>]],
),</pre>

### Problem 3 — Heroku, HTTPS, and App Transport Security

Commit `c982321`: *"General fix, a lot of issues due to heroku usage"*. This one was a cluster of smaller
problems all arriving at once the first time I deployed to Heroku and pointed the app at the real URL.

iOS enforces **App Transport Security** (ATS) by default — all requests must be HTTPS. Heroku gives you HTTPS
for free on `.herokuapp.com` domains, but the backend was briefly returning HTTP redirects, and the Symfony
`TRUSTED_PROXIES` setting wasn't configured for Heroku's load balancer. The result: infinite redirect loops
or blank responses.

<div class="tip">
<strong>Heroku + Symfony tip:</strong> Set <code>TRUSTED_PROXIES=REMOTE_ADDR</code> in your Heroku config vars and add <code>APP_URL=https://your-app.herokuapp.com</code>. Symfony needs to know it's behind a proxy so it generates correct HTTPS URLs for API responses.
</div>

Also: CORS. The iOS simulator sends requests with an `Origin` header. Without `nelmio/cors-bundle` configured
correctly, every preflight returned 403. The fix was three lines of YAML, but finding those three lines cost
me an afternoon.

---

## Marking Words as Known — Swipe Demo

Commit `b45d99a`: *"Make it possible to mark a word as known"*. This was the feature that made the app feel
*real* for the first time. Not just a list of words — a thing you could act on.

The interaction model is obvious once you've used any flashcard app: swipe right to mark as known, swipe left
to skip. The iOS implementation uses a `DragGesture` on the word row that translates to a `CGAffineTransform`
and fires an API call on release if the offset is past a threshold.

Try it here — drag the card or use the buttons:

<div class="swipe-scene" id="swipeScene">
  <div class="swipe-bg-card">
    <span class="next-word" id="nextWordDisplay">—</span>
    <span style="font-size:11px;color:rgba(255,255,255,.25)">next word</span>
  </div>
  <div class="swipe-card-wrap" id="swipeCardWrap">
    <div class="swipe-card" id="swipeCard">
      <span class="swipe-verdict known" id="sKnown">✓ Known</span>
      <span class="swipe-verdict skip"  id="sSkip">✗ Skip</span>
      <span class="swipe-word" id="swipeWord">湿気</span>
      <span class="swipe-reading" id="swipeReading">しっけ</span>
      <span class="swipe-meaning" id="swipeMeaning">humidity</span>
      <span class="swipe-hint">← drag or use buttons →</span>
      <div class="swipe-check" id="swipeCheck">✓</div>
    </div>
  </div>
  <div class="swipe-buttons">
    <button class="swipe-btn swipe-btn-skip" onclick="swipeAction('skip')">✗ Skip</button>
    <button class="swipe-btn swipe-btn-known" onclick="swipeAction('known')">✓ Known →</button>
  </div>
  <div class="swipe-counter" id="swipeCounter">0 known · 0 skipped</div>
  <div class="swipe-done" id="swipeDone">
    <span class="big">🎉</span>
    Session complete!<br/>
    <span class="stats" id="swipeStats"></span><br/>
    <button class="swipe-restart" onclick="swipeRestart()">Start over</button>
  </div>
</div>

The SwiftUI implementation behind this is surprisingly tidy. A `@GestureState` property tracks the drag
offset and drives both the visual transform and the threshold detection:

<pre class="code-block"><span class="kw">struct</span> <span class="ty">VocabWordRowView</span>: <span class="ty">View</span> {
    <span class="kw">let</span> word: <span class="ty">VocabWord</span>
    <span class="kw">var</span> onMarkKnown: () -> <span class="ty">Void</span>

    <span class="at">@GestureState</span> <span class="kw">private var</span> dragOffset: <span class="ty">CGFloat</span> = <span class="nu">0</span>
    <span class="at">@State</span>        <span class="kw">private var</span> finalOffset: <span class="ty">CGFloat</span> = <span class="nu">0</span>
    <span class="kw">private let</span>   threshold: <span class="ty">CGFloat</span> = <span class="nu">100</span>

    <span class="kw">var</span> body: <span class="kw">some</span> <span class="ty">View</span> {
        <span class="kw">let</span> total = finalOffset + dragOffset
        <span class="kw">return</span> <span class="ty">HStack</span> {
            <span class="ty">WordContent</span>(word: word)
        }
        .offset(x: total)
        .opacity(<span class="nu">1.0</span> - <span class="fn">abs</span>(total) / <span class="nu">200</span>)
        .gesture(
            <span class="ty">DragGesture</span>()
                .updating(<span class="kw">$</span>dragOffset) { value, state, _ <span class="kw">in</span>
                    state = value.translation.width
                }
                .onEnded { value <span class="kw">in</span>
                    <span class="kw">if</span> value.translation.width > threshold {
                        onMarkKnown()
                    } <span class="kw">else</span> {
                        finalOffset = <span class="nu">0</span>
                    }
                }
        )
    }
}</pre>

<div class="tip">
<strong>SwiftUI gesture lesson:</strong> Using <code>@GestureState</code> instead of <code>@State</code> for drag offset means the value automatically resets to zero when the gesture ends — no need to manually reset it in <code>onEnded</code>. This eliminates an entire class of jitter bugs (see the much later commit: <em>"fix: eliminate swipe gesture jitter using @GestureState"</em>).
</div>

---

## Milestone: Real Data in a Real App

After all the wrangling — the localhost confusion, the JSON-LD chaos, the Heroku HTTPS debugging — there was
a moment that made everything feel worth it.

{: class="marginalia" }
"The first time your app loads real data from your own API is genuinely one of the best feelings in software development."

I had seeded a handful of manga into the database. I had the Symfony server running on Heroku. I opened
Xcode, hit the Run button, and watched the iOS Simulator boot. The `BrowseStore` kicked off its `URLSession`
request. `ProgressView("Loading…")` appeared on screen.

And then — manga cards. Real ones. With real titles from the database I'd designed, populated through an
API I'd built, decoded by a Swift struct I'd written.

The data model I'd sketched on paper was now pixels on a screen that lived in my pocket.

That feeling — small but undeniable — is why side projects exist.

---

## What's Next

Part 1 ends here: the stack chosen, the domain modelled, the first screen wired to a real API.
But there's a huge gap in the story: where does the actual vocabulary data come from? I haven't explained
how 10,000+ words end up associated with specific manga pages.

That's what Part 2 is about.

<div class="parts-grid">
  <div class="part-card this-one">
    <div class="part-num">Part 1 — you are here</div>
    <div class="part-title">From Zero to First iOS Screen</div>
    <div class="part-desc">Stack decisions, Symfony + API Platform setup, SwiftUI browser mockup, first networking struggles.</div>
    <span class="part-tag">✓ Published</span>
  </div>
  <div class="part-card">
    <div class="part-num">Part 2 — coming soon</div>
    <div class="part-title">Scraping, AI & the CSV Pipeline</div>
    <div class="part-desc">Building a vocabulary extraction engine with Gemini AI, page-by-page analysis, and the CSV import pipeline that populates the database.</div>
    <span class="part-tag">Swift · PHP · AI</span>
  </div>
  <div class="part-card">
    <div class="part-num">Part 3 — coming soon</div>
    <div class="part-title">Progress Tracking</div>
    <div class="part-desc">Read progress per volume, vocabulary density badges, the known-word ring, and making "how far through this manga am I?" a first-class feature.</div>
    <span class="part-tag">SwiftUI · UX</span>
  </div>
  <div class="part-card">
    <div class="part-num">Part 4 — coming soon</div>
    <div class="part-title">Paywall, Auth & Subscriptions</div>
    <div class="part-desc">Passkey login, StoreKit 2 subscription paywall, gating premium content, and the awkward dance of testing in-app purchases in Xcode.</div>
    <span class="part-tag">StoreKit · Security</span>
  </div>
  <div class="part-card">
    <div class="part-num">Part 5 — coming soon</div>
    <div class="part-title">App Store Launch</div>
    <div class="part-desc">Screenshots, metadata, App Review rejections, privacy policy, and what it actually feels like to ship something to the App Store for the first time.</div>
    <span class="part-tag">Launch · Reflection</span>
  </div>
</div>

If you're building something similar — an iOS app on top of a Symfony API, or just learning Japanese through
something you actually care about — I'd love to hear about it. The project is private for now but Part 2 will
include real code excerpts from the AI pipeline.

じゃあ、またね 👋

---

<!-- =====================================================================
     ALL JAVASCRIPT
     ===================================================================== -->
<script>
(function () {
"use strict";

/* ─── Decision Tree ────────────────────────────────────────────────────── */
var dtChoices = [null, null, null, null];

window.dtChoose = function(step, choice) {
  if (dtChoices[step] !== null) return;
  dtChoices[step] = choice;

  var btns = document.querySelectorAll('#dt' + step + ' .dt-choice');
  btns.forEach(function(b) {
    if (b.getAttribute('onclick').indexOf("'" + choice + "'") !== -1) {
      b.classList.add('chosen');
    } else {
      b.style.opacity = '0.35';
      b.style.pointerEvents = 'none';
    }
  });

  var ans = document.getElementById('da' + step);
  if (ans) { ans.classList.add('visible'); }
  var nxt = document.getElementById('dn' + step);
  if (nxt) { nxt.classList.add('visible'); }

  document.getElementById('dp' + step).classList.remove('active');
  document.getElementById('dp' + step).classList.add('done');
  var nextDot = document.getElementById('dp' + (step + 1));
  if (nextDot) { nextDot.classList.add('active'); }
};

window.dtNext = function(step) {
  var prev = document.getElementById('dt' + (step - 1));
  if (prev) { prev.classList.remove('active'); }
  var curr = document.getElementById('dt' + step);
  if (curr) { curr.classList.add('active'); }
};

window.dtDone = function() {
  var last = document.getElementById('dt3');
  if (last) {
    var ans = document.getElementById('da3');
    if (ans) { ans.classList.add('visible'); }
    var btn = document.getElementById('dn3');
    if (btn) {
      btn.textContent = '✓ Stack decided!';
      btn.style.background = '#1a3a2a';
      btn.style.color = '#7bcdab';
      btn.style.border = '1px solid #7bcdab';
      btn.style.pointerEvents = 'none';
    }
    document.getElementById('dp3').classList.remove('active');
    document.getElementById('dp3').classList.add('done');
  }
};

/* ─── iPhone Mockup ────────────────────────────────────────────────────── */
var MANGAS = [
  { title: "NARUTO", sub: "Masashi Kishimoto", color: "#ff6b35", emoji: "🍥",
    volumes: ["Vol. 1 — Enter: Naruto!", "Vol. 2 — The Worst Client", "Vol. 3 — Bridge of Courage"] },
  { title: "ONE PIECE", sub: "Eiichiro Oda", color: "#f7c59f", emoji: "☠️",
    volumes: ["Vol. 1 — Romance Dawn", "Vol. 2 — Buggy the Clown", "Vol. 3 — Don't Get Fooled Again"] },
  { title: "Attack on Titan", sub: "Hajime Isayama", color: "#7bcdab", emoji: "⚔️",
    volumes: ["Vol. 1 — To You, 2000 Years Hence", "Vol. 2 — That Day", "Vol. 3 — A Dim Light"] },
  { title: "Your Name.", sub: "Makoto Shinkai", color: "#c792ea", emoji: "🌠",
    volumes: ["Vol. 1 — Connections", "Vol. 2 — Exchange"] },
  { title: "Demon Slayer", sub: "Koyoharu Gotouge", color: "#f08080", emoji: "🗡️",
    volumes: ["Vol. 1 — Cruelty", "Vol. 2 — It Was You", "Vol. 3 — Sharpening"] },
  { title: "Fullmetal", sub: "Hiromu Arakawa", color: "#fbef8a", emoji: "⚙️",
    volumes: ["Vol. 1 — The Two Alchemists", "Vol. 2 — The Price of Life"] }
];

function buildGrid() {
  var grid = document.getElementById('mangaGrid');
  if (!grid) return;
  var html = '';
  MANGAS.forEach(function(m, i) {
    html += '<div class="mk-card" onclick="openDetail(' + i + ')">';
    html += '<div class="mk-card-cover" style="background:' + m.color + '22;">';
    html += '<span style="font-size:28px;">' + m.emoji + '</span>';
    html += '</div>';
    html += '<div class="mk-card-body">';
    html += '<p class="mk-card-title">' + m.title + '</p>';
    html += '<p class="mk-card-sub">' + m.sub + '</p>';
    html += '</div></div>';
  });
  grid.innerHTML = html;
}

window.openDetail = function(idx) {
  var m = MANGAS[idx];
  document.getElementById('detailTitle').textContent = m.title;
  var volList = document.getElementById('volumeList');
  var html = '';
  m.volumes.forEach(function(v, i) {
    html += '<div class="volume-item">';
    html += '<div class="vol-icon" style="background:' + m.color + '33;">' + m.emoji + '</div>';
    html += '<div class="vol-body">';
    html += '<p class="vol-title">' + v + '</p>';
    html += '<p class="vol-sub">Vocabulary: ' + (Math.floor(Math.random() * 60) + 30) + ' words</p>';
    html += '</div></div>';
  });
  volList.innerHTML = html;
  document.getElementById('detailScreen').classList.add('visible');
};

window.closeDetail = function() {
  document.getElementById('detailScreen').classList.remove('visible');
};

buildGrid();

/* ─── Swipe Demo ───────────────────────────────────────────────────────── */
var VOCAB = [
  { word: "湿気",   reading: "しっけ",       meaning: "humidity" },
  { word: "漫画",   reading: "まんが",       meaning: "manga / comics" },
  { word: "語彙",   reading: "ごい",         meaning: "vocabulary" },
  { word: "修行",   reading: "しゅぎょう",   meaning: "training / ascetic practice" },
  { word: "勇気",   reading: "ゆうき",       meaning: "courage" },
  { word: "仲間",   reading: "なかま",       meaning: "companion / friend" },
  { word: "笑顔",   reading: "えがお",       meaning: "smiling face" },
  { word: "覚悟",   reading: "かくご",       meaning: "resolution / preparedness" }
];

var swipeIdx = 0;
var swipeKnown = 0;
var swipeSkipped = 0;
var isDragging = false;
var startX = 0;
var currentX = 0;

function swipeSetCard(idx) {
  var card = VOCAB[idx % VOCAB.length];
  document.getElementById('swipeWord').textContent    = card.word;
  document.getElementById('swipeReading').textContent = card.reading;
  document.getElementById('swipeMeaning').textContent = card.meaning;
  var swipeCardEl = document.getElementById('swipeCard');
  swipeCardEl.style.transform = 'none';
  swipeCardEl.style.opacity = '1';
  document.getElementById('swipeCheck').style.opacity = '0';
  document.getElementById('sKnown').style.opacity = '0';
  document.getElementById('sSkip').style.opacity  = '0';

  var next = VOCAB[(idx + 1) % VOCAB.length];
  document.getElementById('nextWordDisplay').textContent = next.word;
}

function swipeUpdateCounter() {
  document.getElementById('swipeCounter').textContent =
    swipeKnown + ' known · ' + swipeSkipped + ' skipped';
}

window.swipeAction = function(type) {
  var card = document.getElementById('swipeCard');
  var dir = (type === 'known') ? 1 : -1;
  card.style.transition = 'transform .35s ease, opacity .35s ease';
  card.style.transform = 'translateX(' + (dir * 320) + 'px) rotate(' + (dir * 12) + 'deg)';
  card.style.opacity = '0';

  if (type === 'known') {
    document.getElementById('swipeCheck').style.opacity = '1';
    swipeKnown++;
  } else {
    swipeSkipped++;
  }

  swipeUpdateCounter();
  swipeIdx++;

  setTimeout(function() {
    card.style.transition = 'none';
    if (swipeIdx >= VOCAB.length) {
      document.getElementById('swipeCardWrap').style.display = 'none';
      document.querySelector('.swipe-buttons').style.display = 'none';
      document.getElementById('swipeCounter').style.display = 'none';
      document.getElementById('swipeDone').style.display = 'block';
      document.getElementById('swipeStats').textContent =
        swipeKnown + ' known, ' + swipeSkipped + ' skipped';
    } else {
      swipeSetCard(swipeIdx);
    }
  }, 380);
};

window.swipeRestart = function() {
  swipeIdx = 0; swipeKnown = 0; swipeSkipped = 0;
  document.getElementById('swipeCardWrap').style.display = 'block';
  document.querySelector('.swipe-buttons').style.display = 'flex';
  document.getElementById('swipeCounter').style.display = 'block';
  document.getElementById('swipeDone').style.display = 'none';
  swipeSetCard(0);
  swipeUpdateCounter();
};

/* Mouse / touch drag */
function getClientX(e) {
  return e.touches ? e.touches[0].clientX : e.clientX;
}

var swipeCardWrapEl = document.getElementById('swipeCardWrap');
if (swipeCardWrapEl) {
  swipeCardWrapEl.addEventListener('mousedown', function(e) { isDragging = true; startX = getClientX(e); });
  swipeCardWrapEl.addEventListener('touchstart', function(e) { isDragging = true; startX = getClientX(e); }, { passive: true });

  window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    currentX = getClientX(e) - startX;
    var card = document.getElementById('swipeCard');
    card.style.transition = 'none';
    card.style.transform = 'translateX(' + currentX + 'px) rotate(' + (currentX * 0.06) + 'deg)';
    var kn = document.getElementById('sKnown');
    var sk = document.getElementById('sSkip');
    if (currentX > 20)  { kn.style.opacity = String(Math.min(1, (currentX - 20) / 60)); sk.style.opacity = '0'; }
    else if (currentX < -20) { sk.style.opacity = String(Math.min(1, (-currentX - 20) / 60)); kn.style.opacity = '0'; }
    else { kn.style.opacity = '0'; sk.style.opacity = '0'; }
  });

  window.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    currentX = getClientX(e) - startX;
    var card = document.getElementById('swipeCard');
    card.style.transition = 'none';
    card.style.transform = 'translateX(' + currentX + 'px) rotate(' + (currentX * 0.06) + 'deg)';
    var kn = document.getElementById('sKnown');
    var sk = document.getElementById('sSkip');
    if (currentX > 20)  { kn.style.opacity = String(Math.min(1, (currentX - 20) / 60)); sk.style.opacity = '0'; }
    else if (currentX < -20) { sk.style.opacity = String(Math.min(1, (-currentX - 20) / 60)); kn.style.opacity = '0'; }
    else { kn.style.opacity = '0'; sk.style.opacity = '0'; }
  }, { passive: true });

  function onRelease() {
    if (!isDragging) return;
    isDragging = false;
    if (currentX > 80)       { swipeAction('known'); }
    else if (currentX < -80) { swipeAction('skip'); }
    else {
      var card = document.getElementById('swipeCard');
      card.style.transition = 'transform .3s ease';
      card.style.transform = 'none';
      document.getElementById('sKnown').style.opacity = '0';
      document.getElementById('sSkip').style.opacity  = '0';
    }
    currentX = 0;
  }
  window.addEventListener('mouseup', onRelease);
  window.addEventListener('touchend', onRelease);
}

swipeSetCard(0);

}());
</script>
