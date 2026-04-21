---
layout: post
title: "System Design: URL Shortener (bit.ly at Scale)"
date: 2026-04-15 10:00:00 +0000
categories: ["post"]
tags: [system-design, hashing, distributed-systems, redis, interview]
series: "System Design Interview Series"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design Interview Prep &mdash; #2 of 15
</div>

{: class="marginalia" }
bit.ly processes over<br/>**600 million** redirects per<br/>day. At that volume, every<br/>architectural decision<br/>has measurable cost.

Every system design interview eventually asks you to build one. A URL shortener seems trivial — until you think about billions of redirects, collision-free code generation across distributed servers, and sub-10ms latency requirements.

This post works through the problem from first principles: a naïve single-server implementation all the way to a production-grade distributed system. Each level introduces a real failure mode from the previous one.

---

<style>
/* ─── Series badge ───────────────────────────────────────────── */
.series-badge {
  display: inline-flex; align-items: center; gap: .5rem;
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 20px;
  padding: 5px 14px; font-size: .75rem; color: rgba(255,255,255,.55); margin-bottom: 1.5rem;
}
.series-badge strong { color: #fbef8a; }

/* ─── Code blocks ──────────────────────────────────────────────── */
.code-wrap {
  position: relative; background: #111214; border: 1px solid #2e2f35;
  border-radius: 10px; overflow: hidden; margin: 1rem 0;
}
.code-lang {
  background: #1c1d22; padding: 6px 16px; font-size: 11px;
  color: rgba(255,255,255,.38); letter-spacing: .08em; text-transform: uppercase;
  display: flex; justify-content: space-between; align-items: center;
}
.copy-btn {
  background: transparent; border: 1px solid #3a3b40; border-radius: 4px;
  color: rgba(255,255,255,.45); font-size: 11px; padding: 2px 8px;
  cursor: pointer; font-family: inherit; transition: all .2s;
}
.copy-btn:hover, .copy-btn.copied { border-color: #7bcdab; color: #7bcdab; }
.code-wrap pre.code-block {
  margin: 0; padding: 16px 20px; overflow-x: auto;
  font-family: "JetBrains Mono", "Fira Code", monospace; font-size: 13px;
  line-height: 1.65; color: rgba(255,255,255,.85);
  background: transparent !important; border: none !important;
}
.kw  { color: #cc99cd; }
.ty  { color: #7bcdab; }
.st  { color: #f8c555; }
.cm  { color: #5a6272; font-style: italic; }
.fn  { color: #89c0d0; }
.nu  { color: #f08080; }
.pp  { color: #fbef8a; }
.op  { color: rgba(255,255,255,.5); }

/* ─── Callouts ─────────────────────────────────────────────────── */
.callout { border-radius: 8px; padding: 1rem 1.2rem; margin: 1rem 0; font-size: .84rem; line-height: 1.7; }
.callout-green  { background: #1a2e22; border-left: 3px solid #7bcdab; color: rgba(255,255,255,.82); }
.callout-yellow { background: #25240e; border-left: 3px solid #fbef8a; color: rgba(255,255,255,.82); }
.callout-red    { background: #2a1616; border-left: 3px solid #f08080; color: rgba(255,255,255,.82); }
.callout strong { color: #fff; }

/* ─── Stat grid ─────────────────────────────────────────────────── */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0; }
@media (max-width: 680px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
.stat-card {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1rem; text-align: center;
}
.stat-num { font-size: 1.6rem; font-weight: 700; color: #fbef8a; line-height: 1.1; }
.stat-label { font-size: .72rem; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .06em; margin-top: .3rem; }
.stat-sub { font-size: .75rem; color: rgba(255,255,255,.35); margin-top: .15rem; }

/* ─── Level timeline ───────────────────────────────────────────── */
.level-pill {
  display: inline-flex; align-items: center; gap: .4rem;
  background: #1a2e22; border: 1px solid rgba(123,205,171,.3); border-radius: 20px;
  padding: 4px 14px; font-size: .75rem; color: #7bcdab; margin-bottom: .5rem;
}
.level-pill .lv-num { font-weight: 700; font-size: .85rem; }

/* ─── Problem badge ─────────────────────────────────────────────── */
.problem-badge {
  display: inline-flex; align-items: center; gap: .4rem;
  background: #2a1616; border: 1px solid rgba(240,128,128,.3); border-radius: 6px;
  padding: 4px 10px; font-size: .78rem; color: #f08080; margin-top: .5rem;
}

/* ─── Interactive panels ────────────────────────────────────────── */
.interactive-panel {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.6rem; margin: 1.8rem 0;
}
.interactive-panel h3 {
  color: #fbef8a; margin: 0 0 1rem; font-size: 1rem;
  display: flex; align-items: center; gap: .5rem;
}
.panel-input {
  width: 100%; background: #111214; border: 1px solid #2e2f35; border-radius: 6px;
  color: rgba(255,255,255,.85); font-family: "JetBrains Mono", monospace; font-size: 13px;
  padding: 8px 12px; box-sizing: border-box; margin-bottom: .6rem;
}
.panel-input:focus { outline: none; border-color: #7bcdab; }
.panel-btn {
  padding: 8px 20px; border-radius: 6px; border: 1px solid #7bcdab;
  background: #152319; color: #7bcdab; cursor: pointer;
  font-family: inherit; font-size: 13px; transition: all .2s;
}
.panel-btn:hover { background: #7bcdab; color: #19191c; }
.panel-result {
  background: #111214; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 1rem; margin-top: .8rem; font-family: "JetBrains Mono", monospace;
  font-size: 13px; color: rgba(255,255,255,.8); line-height: 1.8;
  min-height: 60px;
}
.res-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.35); }
.res-value { color: #7bcdab; font-weight: 700; font-size: 1.1rem; }
.res-accent { color: #fbef8a; }

/* ─── Base62 table ──────────────────────────────────────────────── */
.b62-table {
  display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; margin-top: .8rem;
}
.b62-cell {
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 4px;
  text-align: center; padding: 4px 2px; font-family: "JetBrains Mono", monospace;
  font-size: 11px; color: rgba(255,255,255,.55); transition: all .25s;
}
.b62-cell.active { background: rgba(123,205,171,.2); border-color: #7bcdab; color: #7bcdab; }
.b62-cell .b62-idx { display: block; font-size: 9px; color: rgba(255,255,255,.25); }

/* ─── Architecture diagram ──────────────────────────────────────── */
.arch-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.6rem; margin: 1.8rem 0; position: relative;
}
.arch-canvas-area {
  position: relative; width: 100%; min-height: 320px;
  overflow: hidden;
}
.arch-node {
  position: absolute; border-radius: 10px; border: 2px solid #2e2f35;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s; padding: .5rem .8rem;
  text-align: center; font-size: .75rem; font-weight: 600; line-height: 1.3;
  user-select: none; min-width: 90px;
}
.arch-node:hover { transform: translateY(-2px); }
.arch-node.selected { border-width: 2px; }
.node-client   { background: #1a2230; border-color: #3a7bd5; color: #89b8f5; }
.node-lb       { background: #1c2416; border-color: #5a8a5a; color: #7bcdab; }
.node-api      { background: #2a1e16; border-color: #8a6840; color: #d4a07a; }
.node-cache    { background: #2a1628; border-color: #8a406a; color: #d47ab0; }
.node-db       { background: #1a2230; border-color: #405a8a; color: #7aaad4; }
.node-counter  { background: #252416; border-color: #8a8a40; color: #d4d47a; }
.node-cdn      { background: #1e2424; border-color: #406a6a; color: #7ab8b8; }
.node-client.selected   { border-color: #89b8f5; box-shadow: 0 0 0 3px rgba(137,184,245,.2); }
.node-lb.selected       { border-color: #7bcdab; box-shadow: 0 0 0 3px rgba(123,205,171,.2); }
.node-api.selected      { border-color: #d4a07a; box-shadow: 0 0 0 3px rgba(212,160,122,.2); }
.node-cache.selected    { border-color: #d47ab0; box-shadow: 0 0 0 3px rgba(212,122,176,.2); }
.node-db.selected       { border-color: #7aaad4; box-shadow: 0 0 0 3px rgba(122,170,212,.2); }
.node-counter.selected  { border-color: #d4d47a; box-shadow: 0 0 0 3px rgba(212,212,122,.2); }
.node-cdn.selected      { border-color: #7ab8b8; box-shadow: 0 0 0 3px rgba(122,184,184,.2); }
.node-icon { font-size: 1.4rem; margin-bottom: .2rem; }
.node-info-panel {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.2rem; margin-top: 1rem; font-size: .84rem;
  color: rgba(255,255,255,.78); line-height: 1.75; min-height: 100px;
  transition: all .3s;
}
.node-info-panel h4 { margin: 0 0 .5rem; color: #fbef8a; font-size: .9rem; }
.node-info-panel .info-row { display: flex; gap: .5rem; align-items: flex-start; margin-bottom: .35rem; }
.node-info-panel .info-icon { flex-shrink: 0; width: 16px; color: #7bcdab; }
.failure-tag {
  display: inline-block; background: rgba(240,128,128,.15);
  border: 1px solid rgba(240,128,128,.3); color: #f08080;
  font-size: .7rem; padding: 2px 8px; border-radius: 12px; margin-left: .3rem;
}
.scale-tag {
  display: inline-block; background: rgba(123,205,171,.15);
  border: 1px solid rgba(123,205,171,.3); color: #7bcdab;
  font-size: .7rem; padding: 2px 8px; border-radius: 12px; margin-left: .3rem;
}

/* ─── Capacity estimator ────────────────────────────────────────── */
.estimator {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.6rem; margin: 1.8rem 0;
}
.estimator h3 { color: #fbef8a; margin: 0 0 1.2rem; font-size: 1rem; }
.slider-row {
  display: grid; grid-template-columns: 1fr 180px; gap: 1rem;
  align-items: center; margin-bottom: .9rem;
}
@media (max-width: 560px) { .slider-row { grid-template-columns: 1fr; } }
.slider-label { font-size: .82rem; color: rgba(255,255,255,.65); }
.slider-label span { color: #fbef8a; font-weight: 700; font-family: "JetBrains Mono", monospace; }
.est-slider { width: 100%; accent-color: #7bcdab; cursor: pointer; }
.est-results {
  display: grid; grid-template-columns: repeat(3,1fr); gap: .8rem; margin-top: 1.2rem;
}
@media (max-width: 560px) { .est-results { grid-template-columns: 1fr; } }
.est-card {
  background: #111214; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .8rem; text-align: center;
}
.est-num { font-size: 1.3rem; font-weight: 700; color: #7bcdab; font-family: "JetBrains Mono", monospace; }
.est-lbl { font-size: .7rem; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .06em; margin-top: .2rem; }

/* ─── Short code generator ──────────────────────────────────────── */
.gen-row { display: flex; gap: .6rem; margin-bottom: .6rem; flex-wrap: wrap; }
.gen-output-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; margin-top: .8rem; }
@media (max-width: 560px) { .gen-output-grid { grid-template-columns: 1fr; } }
.gen-box {
  background: #111214; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .8rem; font-size: .82rem;
}
.gen-box .glabel { font-size: .68rem; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.35); margin-bottom: .3rem; }
.gen-box .gval { color: #7bcdab; font-family: "JetBrains Mono", monospace; font-size: .95rem; word-break: break-all; }
.gen-box .gval.accent { color: #fbef8a; font-size: 1.3rem; font-weight: 700; }

/* ─── Checklist ─────────────────────────────────────────────────── */
.checklist { list-style: none; padding: 0; margin: 1rem 0; }
.checklist li {
  display: flex; gap: .7rem; align-items: flex-start; padding: .55rem 0;
  border-bottom: 1px solid #1e1f24; font-size: .84rem; color: rgba(255,255,255,.75);
}
.checklist li:last-child { border-bottom: none; }
.checklist .ck { color: #7bcdab; font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
.checklist code { background: #1e1f24; padding: 1px 5px; border-radius: 3px; font-size: .8rem; }

/* ─── Pro/con ───────────────────────────────────────────────────── */
.pro-con { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
@media (max-width: 600px) { .pro-con { grid-template-columns: 1fr; } }
.pro-con-box { background: #1e1f24; border-radius: 8px; padding: 1rem; }
.pro-con-box ul { margin: 0; padding-left: 1.2rem; font-size: .82rem; color: rgba(255,255,255,.72); line-height: 1.9; }
.box-label { font-size: .72rem; text-transform: uppercase; letter-spacing: .07em; margin-bottom: .5rem; font-weight: 700; }
.box-green { color: #7bcdab; }
.box-red   { color: #f08080; }

/* ─── redirect comparison ────────────────────────────────────────── */
.redirect-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
@media (max-width: 600px) { .redirect-grid { grid-template-columns: 1fr; } }
.redirect-card {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.2rem;
}
.redirect-card h4 { margin: 0 0 .6rem; font-size: .9rem; }
.redirect-card ul { font-size: .8rem; color: rgba(255,255,255,.7); line-height: 1.8; padding-left: 1.2rem; margin: 0; }
.tag-301 { color: #f08080; }
.tag-302 { color: #7bcdab; }

/* ─── SVG arrows ─────────────────────────────────────────────────── */
#arch-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }

/* ─── Birthday paradox box ───────────────────────────────────────── */
.math-box {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.2rem 1.5rem; margin: 1rem 0; font-size: .85rem;
  color: rgba(255,255,255,.75); line-height: 2;
}
.math-box .math-title { color: #fbef8a; font-weight: 700; margin-bottom: .4rem; }
.math-formula { font-family: "JetBrains Mono", monospace; color: #7bcdab; font-size: .9rem; }

/* ─── Section divider ─────────────────────────────────────────────── */
.section-divider {
  display: flex; align-items: center; gap: 1rem; margin: 2.5rem 0 1.5rem;
  color: rgba(255,255,255,.2); font-size: .8rem;
}
.section-divider::before, .section-divider::after {
  content: ''; flex: 1; height: 1px; background: #2e2f35;
}
</style>

## 1. Requirements

Before touching any code, pin down what you're actually building.

**Functional requirements:**
- Given a long URL, return a unique short code (e.g. `sho.rt/aB3k9z`)
- Given a short code, redirect to the original URL
- Support custom aliases (`sho.rt/my-company`)
- Support optional expiry dates
- Track click analytics per short code

**Non-functional requirements:**

<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-num">100M</div>
    <div class="stat-label">URLs shortened/day</div>
    <div class="stat-sub">~1,157 writes/sec</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">1B</div>
    <div class="stat-label">Redirects/day</div>
    <div class="stat-sub">~11,570 reads/sec</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">&lt;10ms</div>
    <div class="stat-label">Redirect latency</div>
    <div class="stat-sub">p99 target</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">5 yr</div>
    <div class="stat-label">Data retention</div>
    <div class="stat-sub">~183B total URLs</div>
  </div>
</div>

**Back-of-envelope math:**
- 100M writes/day ÷ 86,400 sec/day ≈ **1,157 writes/sec**
- 10:1 read/write ratio → **11,570 redirects/sec**
- Average URL length: 200 bytes. Short code + metadata: ~500 bytes per record
- 100M × 365 × 5 years × 500 bytes ≈ **91 TB** total storage over 5 years
- Hot URLs: 20% of URLs drive 80% of traffic → cache the top ~200M entries

<div class="callout callout-yellow">
  <strong>Interview tip:</strong> Always do the envelope math before proposing a design. "100M URLs/day" sounds big. 1,157 writes/sec is much more tangible — a single Postgres instance handles that easily. The reads at 11,570/sec are what demand Redis.
</div>

---

## 2. Level 1 — The Naïve Approach: Random ID

<div class="level-pill"><span class="lv-num">L1</span> Random ID</div>

The simplest possible approach: generate a random 6-character string, check if it already exists in the database, store it if not.

<div class="code-wrap">
  <div class="code-lang">JavaScript
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="kw">function</span> <span class="fn">generateRandomCode</span>(<span class="ty">length</span> <span class="op">=</span> <span class="nu">6</span>) {
  <span class="kw">const</span> chars <span class="op">=</span> <span class="st">'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'</span><span class="op">;</span>
  <span class="kw">let</span> code <span class="op">=</span> <span class="st">''</span><span class="op">;</span>
  <span class="kw">for</span> (<span class="kw">let</span> i <span class="op">=</span> <span class="nu">0</span><span class="op">;</span> i <span class="op">&lt;</span> length<span class="op">;</span> i<span class="op">++</span>) {
    code <span class="op">+=</span> chars[Math.<span class="fn">floor</span>(Math.<span class="fn">random</span>() <span class="op">*</span> chars.length)]<span class="op">;</span>
  }
  <span class="kw">return</span> code<span class="op">;</span>
}

<span class="kw">async function</span> <span class="fn">shortenUrl</span>(<span class="ty">longUrl</span>) {
  <span class="kw">let</span> code<span class="op">;</span>
  <span class="kw">do</span> {
    code <span class="op">=</span> <span class="fn">generateRandomCode</span>()<span class="op">;</span>
  } <span class="kw">while</span> (<span class="kw">await</span> db.<span class="fn">exists</span>(code))<span class="op">;</span>  <span class="cm">// retry on collision</span>

  <span class="kw">await</span> db.<span class="fn">insert</span>({ code, url: longUrl, createdAt: Date.<span class="fn">now</span>() })<span class="op">;</span>
  <span class="kw">return</span> <span class="st">'https://sho.rt/'</span> <span class="op">+</span> code<span class="op">;</span>
}</pre>
</div>

With 6 characters from a 62-character alphabet, you have 62⁶ = **56.8 billion** possible codes. Sounds safe. But here's the trap.

<div class="math-box">
  <div class="math-title">The Birthday Paradox</div>
  The probability of <em>at least one</em> collision after inserting <strong>n</strong> items into a space of size <strong>N</strong>:
  <br/><br/>
  <span class="math-formula">P(collision) ≈ 1 − e^(−n²/2N)</span>
  <br/><br/>
  At n = 100M URLs and N = 56.8B (6-char codes):
  <br/>
  <span class="math-formula">P ≈ 1 − e^(−(10⁸)²/(2×5.68×10¹⁰)) ≈ 1 − e^(−88) ≈ 100%</span>
  <br/><br/>
  After just 100M URLs, every new code insert will almost certainly require at least one collision retry. At 1B URLs, retry loops become multi-round. The <strong>do-while loop becomes a performance bomb</strong>.
</div>

<div class="problem-badge">⚠ Problem: Birthday paradox makes collision retries expensive at scale</div>

---

## 3. Level 2 — Hash + Truncate

<div class="level-pill"><span class="lv-num">L2</span> Hash-based</div>

Instead of pure randomness, hash the input URL. Same input always produces the same output (useful for deduplication), and hashes are well-distributed.

<div class="code-wrap">
  <div class="code-lang">JavaScript
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="kw">const</span> crypto <span class="op">=</span> <span class="fn">require</span>(<span class="st">'crypto'</span>)<span class="op">;</span>

<span class="kw">function</span> <span class="fn">hashUrl</span>(<span class="ty">longUrl</span>) {
  <span class="cm">// MD5 produces 128 bits = 32 hex chars. Take first 7.</span>
  <span class="kw">const</span> hash <span class="op">=</span> crypto.<span class="fn">createHash</span>(<span class="st">'md5'</span>).<span class="fn">update</span>(longUrl).<span class="fn">digest</span>(<span class="st">'hex'</span>)<span class="op">;</span>
  <span class="kw">return</span> hash.<span class="fn">slice</span>(<span class="nu">0</span>, <span class="nu">7</span>)<span class="op">;</span>
}

<span class="cm">// "https://example.com/very-long-path"</span>
<span class="cm">// → md5 → "a3f8b2c..."</span>
<span class="cm">// → take 7 → "a3f8b2c"</span></pre>
</div>

<div class="pro-con">
  <div class="pro-con-box">
    <div class="box-label box-green">✓ Better</div>
    <ul>
      <li>Deterministic: same URL → same code (natural deduplication)</li>
      <li>No DB lookup before write (can check after)</li>
      <li>No randomness involved</li>
    </ul>
  </div>
  <div class="pro-con-box">
    <div class="box-label box-red">✗ Still broken</div>
    <ul>
      <li>Two different URLs can still produce the same 7-char prefix (hash collision)</li>
      <li>Deduplication breaks custom aliases — same URL can't have two short codes</li>
      <li>MD5 is considered cryptographically broken (not an issue here, but sloppy)</li>
    </ul>
  </div>
</div>

<div class="problem-badge">⚠ Problem: Truncated hashes still collide; no monotonic ordering for sharding</div>

---

## 4. Level 3 — Base62 Encoding

<div class="level-pill"><span class="lv-num">L3</span> Base62 counter</div>

{: class="marginalia" }
**Base62 with 7 characters**<br/>gives you 3.5 trillion<br/>unique codes. At 100M/day<br/>that's **95 years** of URLs<br/>before you run out.

The insight: use a **monotonically increasing integer counter** as the primary key, then encode that integer in base62. No collision is possible — each integer is unique by definition.

**Base62 alphabet:** `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`

62⁷ = **3,521,614,606,208** — over 3.5 trillion unique codes from 7 characters.

<div class="code-wrap">
  <div class="code-lang">Python
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="ty">ALPHABET</span> <span class="op">=</span> <span class="st">"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"</span>
<span class="ty">BASE</span>     <span class="op">=</span> <span class="fn">len</span>(<span class="ty">ALPHABET</span>)  <span class="cm"># 62</span>

<span class="kw">def</span> <span class="fn">to_base62</span>(<span class="ty">n</span>: <span class="ty">int</span>) <span class="op">-&gt;</span> <span class="ty">str</span>:
    <span class="kw">if</span> n <span class="op">==</span> <span class="nu">0</span>:
        <span class="kw">return</span> <span class="ty">ALPHABET</span>[<span class="nu">0</span>]
    result <span class="op">=</span> <span class="st">[]</span>
    <span class="kw">while</span> n <span class="op">&gt;</span> <span class="nu">0</span>:
        result.<span class="fn">append</span>(<span class="ty">ALPHABET</span>[n <span class="op">%</span> <span class="ty">BASE</span>])
        n <span class="op">//=</span> <span class="ty">BASE</span>
    <span class="kw">return</span> <span class="st">''</span>.<span class="fn">join</span>(<span class="fn">reversed</span>(result))

<span class="kw">def</span> <span class="fn">from_base62</span>(<span class="ty">s</span>: <span class="ty">str</span>) <span class="op">-&gt;</span> <span class="ty">int</span>:
    result <span class="op">=</span> <span class="nu">0</span>
    <span class="kw">for</span> char <span class="kw">in</span> s:
        result <span class="op">=</span> result <span class="op">*</span> <span class="ty">BASE</span> <span class="op">+</span> <span class="ty">ALPHABET</span>.<span class="fn">index</span>(char)
    <span class="kw">return</span> result

<span class="cm"># ID 1          → "1"</span>
<span class="cm"># ID 62         → "a0"</span>
<span class="cm"># ID 1_000_000  → "4c92"</span>
<span class="cm"># ID 3.5T       → 7-char code</span></pre>
</div>

### Interactive Base62 Encoder

<div class="interactive-panel">
  <h3>⚙️ Live Base62 Encoder</h3>
  <p style="font-size:.83rem;color:rgba(255,255,255,.55);margin:.0 0 .8rem;">Enter any integer (counter ID) to see the base62 short code and which characters are active in the alphabet table.</p>
  <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
    <input class="panel-input" id="b62-input" type="number" min="0" max="1000000000" value="1157000" placeholder="Enter a number (0 – 1,000,000,000)" style="max-width:320px;" oninput="encodeB62()"/>
  </div>
  <div class="panel-result" id="b62-result">
    <div class="res-label">SHORT CODE</div>
    <div class="res-value" id="b62-code">&mdash;</div>
    <div style="margin-top:.5rem;font-size:.78rem;color:rgba(255,255,255,.45);" id="b62-steps"></div>
  </div>
  <div style="margin-top:1rem;">
    <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.35);margin-bottom:.5rem;">Base62 alphabet — highlighted chars used in this code</div>
    <div class="b62-table" id="b62-alphabet"></div>
  </div>
</div>

---

## 5. Level 4 — The Distributed Counter Problem

<div class="level-pill"><span class="lv-num">L4</span> Distributed IDs</div>

{: class="marginalia" }
The **counter pre-allocation**<br/>trick is elegant: each app<br/>server grabs a range of<br/>1,000 IDs at startup.<br/>Only talk to the counter<br/>service once per 1,000 URLs.

A single auto-increment database counter is a **single point of failure and a write bottleneck**. Three API servers competing for the same sequence creates lock contention. Solutions:

### Strategy A: Range-Based Allocation

Each server claims a pre-allocated range from a central coordinator.

<div class="code-wrap">
  <div class="code-lang">Python
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="cm"># Counter service (runs once on startup per app server)</span>
<span class="kw">class</span> <span class="ty">RangeAllocator</span>:
    RANGE_SIZE <span class="op">=</span> <span class="nu">1_000</span>

    <span class="kw">def</span> <span class="fn">__init__</span>(<span class="ty">self</span>, redis_client):
        <span class="ty">self</span>.redis <span class="op">=</span> redis_client
        <span class="ty">self</span>.current <span class="op">=</span> <span class="nu">0</span>
        <span class="ty">self</span>.max_id  <span class="op">=</span> <span class="op">-</span><span class="nu">1</span>

    <span class="kw">def</span> <span class="fn">next_id</span>(<span class="ty">self</span>) <span class="op">-&gt;</span> <span class="ty">int</span>:
        <span class="kw">if</span> <span class="ty">self</span>.current <span class="op">&gt;</span> <span class="ty">self</span>.max_id:
            <span class="cm"># Grab the next range atomically from Redis</span>
            end <span class="op">=</span> <span class="ty">self</span>.redis.<span class="fn">incrby</span>(<span class="st">"global_counter"</span>, <span class="ty">self</span>.RANGE_SIZE)
            <span class="ty">self</span>.current <span class="op">=</span> end <span class="op">-</span> <span class="ty">self</span>.RANGE_SIZE
            <span class="ty">self</span>.max_id  <span class="op">=</span> end <span class="op">-</span> <span class="nu">1</span>

        <span class="ty">self</span>.current <span class="op">+=</span> <span class="nu">1</span>
        <span class="kw">return</span> <span class="ty">self</span>.current</pre>
</div>

**Why this works:** Each server only contacts Redis once every 1,000 URL creations. Redis `INCRBY` is atomic — no two servers get overlapping ranges. If a server crashes, at most 1,000 IDs are wasted (gaps in the sequence are fine for URL shorteners).

### Strategy B: Redis INCR

Simpler: just call Redis `INCR url_counter` for every URL. Redis single-threaded operations are atomic. At 1,157 writes/sec this is well within Redis capacity (~100K ops/sec). Add Redis Sentinel for HA.

### Strategy C: Snowflake-style ID

A 64-bit ID composed of timestamp + datacenter ID + machine ID + sequence. Twitter/Sonyflake approach. No coordination needed between machines.

<div class="code-wrap">
  <div class="code-lang">Go
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="cm">// Snowflake ID layout (64 bits)</span>
<span class="cm">// [41 bits timestamp ms] [5 bits datacenter] [5 bits machine] [12 bits sequence]</span>

<span class="kw">type</span> <span class="ty">Snowflake</span> <span class="kw">struct</span> {
    datacenterID <span class="ty">int64</span>
    machineID    <span class="ty">int64</span>
    sequence     <span class="ty">int64</span>
    lastTS       <span class="ty">int64</span>
    mu           sync.<span class="ty">Mutex</span>
}

<span class="kw">func</span> (s <span class="op">*</span><span class="ty">Snowflake</span>) <span class="fn">Next</span>() <span class="ty">int64</span> {
    s.mu.<span class="fn">Lock</span>()
    <span class="kw">defer</span> s.mu.<span class="fn">Unlock</span>()

    ts <span class="op">:=</span> <span class="fn">nowMs</span>()
    <span class="kw">if</span> ts <span class="op">==</span> s.lastTS {
        s.sequence <span class="op">=</span> (s.sequence <span class="op">+</span> <span class="nu">1</span>) <span class="op">&amp;</span> <span class="nu">0xFFF</span>
        <span class="kw">if</span> s.sequence <span class="op">==</span> <span class="nu">0</span> { ts <span class="op">=</span> <span class="fn">waitNextMs</span>(ts) }
    } <span class="kw">else</span> {
        s.sequence <span class="op">=</span> <span class="nu">0</span>
    }
    s.lastTS <span class="op">=</span> ts

    <span class="kw">return</span> (ts <span class="op">&lt;&lt;</span> <span class="nu">22</span>) <span class="op">|</span> (s.datacenterID <span class="op">&lt;&lt;</span> <span class="nu">17</span>) <span class="op">|</span> (s.machineID <span class="op">&lt;&lt;</span> <span class="nu">12</span>) <span class="op">|</span> s.sequence
}</pre>
</div>

<div class="callout callout-green">
  <strong>Recommendation for interviews:</strong> Propose Range-Based Allocation (Strategy A). It is easy to explain, requires no distributed consensus, and demonstrates you understand both the problem and operational concerns like crash recovery.
</div>

---

## 6. Level 5 — Full Architecture

<div class="level-pill"><span class="lv-num">L5</span> Production Architecture</div>

Click any component to learn about its role, failure modes, and scaling strategy.

<div class="arch-wrap">
  <div style="font-size:.78rem;color:rgba(255,255,255,.35);margin-bottom:1rem;">Click nodes to explore</div>
  <div class="arch-canvas-area" id="arch-canvas" style="height:340px;">
    <svg id="arch-svg" xmlns="http://www.w3.org/2000/svg"></svg>

    <div class="arch-node node-client" id="node-client"
         style="left:2%;top:40%;transform:translateY(-50%);"
         onclick="selectNode('client')">
      <span class="node-icon">🌐</span>Client
    </div>

    <div class="arch-node node-lb" id="node-lb"
         style="left:18%;top:40%;transform:translateY(-50%);"
         onclick="selectNode('lb')">
      <span class="node-icon">⚖️</span>Load<br/>Balancer
    </div>

    <div class="arch-node node-api" id="node-api-1"
         style="left:36%;top:15%;"
         onclick="selectNode('api')">
      <span class="node-icon">🖥️</span>API<br/>Server 1
    </div>
    <div class="arch-node node-api" id="node-api-2"
         style="left:36%;top:38%;transform:translateY(-50%);"
         onclick="selectNode('api')">
      <span class="node-icon">🖥️</span>API<br/>Server 2
    </div>
    <div class="arch-node node-api" id="node-api-3"
         style="left:36%;top:72%;"
         onclick="selectNode('api')">
      <span class="node-icon">🖥️</span>API<br/>Server 3
    </div>

    <div class="arch-node node-cache" id="node-cache"
         style="left:58%;top:18%;"
         onclick="selectNode('cache')">
      <span class="node-icon">⚡</span>Redis<br/>Cache
    </div>

    <div class="arch-node node-db" id="node-db"
         style="left:58%;top:62%;"
         onclick="selectNode('db')">
      <span class="node-icon">🗄️</span>MySQL<br/>+ Replicas
    </div>

    <div class="arch-node node-counter" id="node-counter"
         style="left:78%;top:18%;"
         onclick="selectNode('counter')">
      <span class="node-icon">🔢</span>Counter<br/>Service
    </div>

    <div class="arch-node node-cdn" id="node-cdn"
         style="left:78%;top:62%;"
         onclick="selectNode('cdn')">
      <span class="node-icon">🚀</span>CDN<br/>Edge
    </div>
  </div>

  <div class="node-info-panel" id="node-info">
    <div style="color:rgba(255,255,255,.35);font-size:.82rem;">← Select a component above to see its description, failure modes, and scaling strategy.</div>
  </div>
</div>

---

## 7. Level 6 — Redirect Optimization

<div class="level-pill"><span class="lv-num">L6</span> HTTP semantics</div>

{: class="marginalia" }
**301 vs 302 is a trap question**<br/>— most interviewers know<br/>to ask it. 301 breaks click<br/>analytics; 302 adds server<br/>load. The right answer is<br/>"it depends on your SLA."

The redirect itself is a single HTTP response. The status code choice has major system consequences.

<div class="redirect-grid">
  <div class="redirect-card">
    <h4 class="tag-301">HTTP 301 — Permanent Redirect</h4>
    <ul>
      <li>Browser caches the redirect forever</li>
      <li>Subsequent visits skip your server entirely</li>
      <li>Massively reduces server load for popular links</li>
      <li><strong style="color:#f08080">Breaks click analytics</strong> — you never see repeat visits</li>
      <li>Cannot revoke or update the destination</li>
      <li>Use when: static marketing links, no analytics needed</li>
    </ul>
  </div>
  <div class="redirect-card">
    <h4 class="tag-302">HTTP 302 — Temporary Redirect</h4>
    <ul>
      <li>Browser always hits your server</li>
      <li>Full click tracking: timestamp, referer, user-agent</li>
      <li>Can change destination at any time</li>
      <li><strong style="color:#f08080">Higher server load</strong> — every click is a request</li>
      <li>Mitigate with aggressive Redis caching</li>
      <li>Use when: analytics required, A/B testing destinations</li>
    </ul>
  </div>
</div>

### Redis Cache Strategy (80/20 Rule)

20% of your URLs receive 80% of the traffic. Cache the hot 20% in Redis. With 100M active URLs, the hot set is ~20M records. Each entry: 7-byte key + 200-byte URL = ~207 bytes. Total: ~4 GB — fits comfortably in a single Redis instance.

<div class="code-wrap">
  <div class="code-lang">Python — redirect handler
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="kw">async def</span> <span class="fn">redirect</span>(<span class="ty">short_code</span>: <span class="ty">str</span>):
    <span class="cm"># 1. Try Redis first (hot path)</span>
    url <span class="op">=</span> <span class="kw">await</span> redis.<span class="fn">get</span>(<span class="st">"url:"</span> <span class="op">+</span> short_code)

    <span class="kw">if not</span> url:
        <span class="cm"># 2. Cache miss → query MySQL read replica</span>
        record <span class="op">=</span> <span class="kw">await</span> db.<span class="fn">query_one</span>(
            <span class="st">"SELECT long_url, expires_at FROM urls WHERE code = %s"</span>,
            short_code
        )
        <span class="kw">if not</span> record:
            <span class="kw">return</span> <span class="fn">HTTP_404</span>()

        <span class="kw">if</span> record.expires_at <span class="kw">and</span> record.expires_at <span class="op">&lt;</span> <span class="fn">now</span>():
            <span class="kw">return</span> <span class="fn">HTTP_410</span>()  <span class="cm"># Gone</span>

        url <span class="op">=</span> record.long_url
        <span class="cm"># 3. Populate cache with TTL</span>
        <span class="kw">await</span> redis.<span class="fn">setex</span>(<span class="st">"url:"</span> <span class="op">+</span> short_code, <span class="nu">3600</span>, url)

    <span class="cm"># 4. Fire-and-forget analytics (non-blocking)</span>
    <span class="fn">asyncio.create_task</span>(<span class="fn">record_click</span>(short_code))

    <span class="kw">return</span> <span class="fn">HTTP_302</span>(location<span class="op">=</span>url)</pre>
</div>

---

## 8. Level 7 — Custom Aliases &amp; Expiry

<div class="level-pill"><span class="lv-num">L7</span> Advanced features</div>

### Custom Aliases

`sho.rt/my-company` requires a uniqueness check before write. Two concerns:

1. **Namespace collision**: A user wants `my-company`, but it was already taken (or reserved).
2. **Bloom filter optimization**: Before hitting the DB, use a Bloom filter to check "definitely not exists" in O(1). Only proceed to DB on probable matches.

<div class="code-wrap">
  <div class="code-lang">Python — custom alias creation
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="kw">async def</span> <span class="fn">create_custom</span>(<span class="ty">alias</span>: <span class="ty">str</span>, <span class="ty">long_url</span>: <span class="ty">str</span>):
    <span class="cm"># Validate format: 3-50 chars, alphanumeric + hyphens only</span>
    <span class="kw">if not</span> re.<span class="fn">match</span>(<span class="st">r'^[a-zA-Z0-9-]{3,50}$'</span>, alias):
        <span class="kw">raise</span> <span class="ty">ValueError</span>(<span class="st">"Invalid alias format"</span>)

    <span class="cm"># Bloom filter fast-path (no false negatives)</span>
    <span class="kw">if</span> bloom.<span class="fn">might_contain</span>(alias):
        <span class="cm"># Might exist — confirm with DB</span>
        <span class="kw">if</span> <span class="kw">await</span> db.<span class="fn">exists</span>(<span class="st">"SELECT 1 FROM urls WHERE code = %s"</span>, alias):
            <span class="kw">raise</span> <span class="ty">ConflictError</span>(<span class="st">"Alias already taken"</span>)

    <span class="cm"># INSERT with unique constraint as safety net</span>
    <span class="kw">try</span>:
        <span class="kw">await</span> db.<span class="fn">insert</span>({
            <span class="st">"code"</span>: alias,
            <span class="st">"long_url"</span>: long_url,
            <span class="st">"is_custom"</span>: <span class="kw">True</span>,
        })
        bloom.<span class="fn">add</span>(alias)
    <span class="kw">except</span> <span class="ty">UniqueConstraintViolation</span>:
        <span class="kw">raise</span> <span class="ty">ConflictError</span>(<span class="st">"Race condition: alias taken"</span>)</pre>
</div>

### URL Expiry: Two Approaches

<div class="pro-con">
  <div class="pro-con-box">
    <div class="box-label box-green">Lazy Deletion</div>
    <ul>
      <li>Check <code>expires_at</code> on each redirect request</li>
      <li>Return HTTP 410 Gone if expired</li>
      <li>No background jobs needed</li>
      <li>Expired rows sit in DB until actively accessed</li>
      <li>Simple, works well for sparse expiry</li>
    </ul>
  </div>
  <div class="pro-con-box">
    <div class="box-label box-green">TTL + Cron Sweep</div>
    <ul>
      <li>Redis TTL automatically evicts from cache</li>
      <li>Nightly cron: <code>DELETE WHERE expires_at &lt; NOW()</code></li>
      <li>Keeps DB storage bounded</li>
      <li>Cron must be idempotent and run on one node</li>
      <li>Better for high-volume expiring links (campaigns)</li>
    </ul>
  </div>
</div>

<div class="callout callout-yellow">
  <strong>Recommendation:</strong> Use both. Lazy deletion for correctness (always check on read). Background sweep for storage hygiene. Delete in batches of 10,000 rows with a sleep between batches to avoid table locks.
</div>

---

## 9. Analytics Architecture

Tracking every click naïvely destroys your write throughput. Each redirect triggering an INSERT is 11,570 writes/sec to the database — far exceeding comfortable MySQL territory.

**Evolution of the analytics pipeline:**

<div class="code-wrap">
  <div class="code-lang">Python — naive (DON'T DO THIS at scale)
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="cm"># Every redirect does this — disaster at 11,570 req/sec</span>
<span class="kw">async def</span> <span class="fn">record_click_naive</span>(<span class="ty">code</span>, <span class="ty">req</span>):
    <span class="kw">await</span> db.<span class="fn">execute</span>(
        <span class="st">"INSERT INTO clicks (code, ts, ip, referer) VALUES (%s,%s,%s,%s)"</span>,
        code, <span class="fn">now</span>(), req.ip, req.headers[<span class="st">"Referer"</span>]
    )</pre>
</div>

<div class="code-wrap">
  <div class="code-lang">Python — production: Kafka + batch writes
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="cm"># On redirect: non-blocking publish to Kafka</span>
<span class="kw">async def</span> <span class="fn">record_click</span>(<span class="ty">code</span>, <span class="ty">req</span>):
    <span class="kw">await</span> kafka_producer.<span class="fn">send</span>(
        topic <span class="op">=</span> <span class="st">"url.clicks"</span>,
        value <span class="op">=</span> {
            <span class="st">"code"</span>: code, <span class="st">"ts"</span>: <span class="fn">now</span>(),
            <span class="st">"ip"</span>: req.ip, <span class="st">"referer"</span>: req.headers.<span class="fn">get</span>(<span class="st">"Referer"</span>),
        }
    )  <span class="cm"># Returns immediately, ~0.1ms</span>

<span class="cm"># Separate consumer: batch flush every 5 seconds</span>
<span class="kw">class</span> <span class="ty">ClickConsumer</span>:
    <span class="kw">async def</span> <span class="fn">run</span>(<span class="ty">self</span>):
        batch <span class="op">=</span> []
        <span class="kw">async for</span> msg <span class="kw">in</span> kafka_consumer:
            batch.<span class="fn">append</span>(msg.value)
            <span class="kw">if</span> <span class="fn">len</span>(batch) <span class="op">&gt;=</span> <span class="nu">1000</span> <span class="kw">or</span> <span class="fn">elapsed</span>() <span class="op">&gt;</span> <span class="nu">5</span>:
                <span class="kw">await</span> timescaledb.<span class="fn">bulk_insert</span>(batch)
                batch.<span class="fn">clear</span>()</pre>
</div>

The Kafka stream also enables real-time dashboards: a separate consumer aggregates counts per code into Redis sorted sets (`ZINCRBY clicks:daily {code} 1`), giving you a live top-N leaderboard.

---

## 10. Interactive: Short Code Generator

<div class="interactive-panel">
  <h3>🔗 Client-side Short Code Preview</h3>
  <p style="font-size:.83rem;color:rgba(255,255,255,.55);margin:0 0 .8rem;">Paste any URL. A simulated counter ID is derived from a simple hash, then encoded to base62. This shows exactly what the server-side encoding produces — no network call needed.</p>
  <div class="gen-row">
    <input class="panel-input" id="gen-url" type="text" placeholder="https://example.com/some/very/long/path?query=123" style="flex:1;" oninput="generateCode()"/>
  </div>
  <div class="gen-output-grid" id="gen-output" style="display:none;">
    <div class="gen-box">
      <div class="glabel">Simulated Counter ID</div>
      <div class="gval" id="gen-id"></div>
    </div>
    <div class="gen-box">
      <div class="glabel">Base62 Short Code</div>
      <div class="gval accent" id="gen-code"></div>
    </div>
    <div class="gen-box">
      <div class="glabel">Short URL</div>
      <div class="gval" id="gen-short"></div>
    </div>
    <div class="gen-box">
      <div class="glabel">Encoding Steps</div>
      <div class="gval" id="gen-steps" style="font-size:.78rem;color:rgba(255,255,255,.55);"></div>
    </div>
  </div>
</div>

---

## 11. Capacity Estimator

<div class="estimator">
  <h3>📊 Interactive Capacity Estimator</h3>
  <div class="slider-row">
    <div class="slider-label">URLs shortened per day: <span id="lbl-urls">100,000,000</span></div>
    <input class="est-slider" type="range" id="sl-urls" min="1000000" max="500000000" step="1000000" value="100000000" oninput="updateEstimator()"/>
  </div>
  <div class="slider-row">
    <div class="slider-label">Retention period: <span id="lbl-years">5 years</span></div>
    <input class="est-slider" type="range" id="sl-years" min="1" max="20" step="1" value="5" oninput="updateEstimator()"/>
  </div>
  <div class="slider-row">
    <div class="slider-label">Avg. bytes per record: <span id="lbl-bytes">500 B</span></div>
    <input class="est-slider" type="range" id="sl-bytes" min="100" max="2000" step="50" value="500" oninput="updateEstimator()"/>
  </div>
  <div class="slider-row">
    <div class="slider-label">Read/write ratio: <span id="lbl-ratio">10×</span></div>
    <input class="est-slider" type="range" id="sl-ratio" min="1" max="50" step="1" value="10" oninput="updateEstimator()"/>
  </div>
  <div class="est-results">
    <div class="est-card">
      <div class="est-num" id="est-qps-w">—</div>
      <div class="est-lbl">Write QPS</div>
    </div>
    <div class="est-card">
      <div class="est-num" id="est-qps-r">—</div>
      <div class="est-lbl">Read QPS</div>
    </div>
    <div class="est-card">
      <div class="est-num" id="est-storage">—</div>
      <div class="est-lbl">Total Storage</div>
    </div>
    <div class="est-card">
      <div class="est-num" id="est-cache">—</div>
      <div class="est-lbl">Cache Memory (20% hot)</div>
    </div>
    <div class="est-card">
      <div class="est-num" id="est-total">—</div>
      <div class="est-lbl">Total URLs (lifetime)</div>
    </div>
    <div class="est-card">
      <div class="est-num" id="est-codes">—</div>
      <div class="est-lbl">Code length needed</div>
    </div>
  </div>
</div>

---

## 12. Interview Checklist

What interviewers are actually checking. Walk through each point deliberately.

<ul class="checklist">
  <li><span class="ck">✓</span><div><strong>Scope the problem first.</strong> Ask: custom aliases? expiry? analytics? read-heavy or write-heavy? International users? Clarifying questions signal seniority.</div></li>
  <li><span class="ck">✓</span><div><strong>Do envelope math before designing.</strong> State: 1,157 writes/sec, 11,570 reads/sec, 91 TB over 5 years. Then justify your component choices against these numbers.</div></li>
  <li><span class="ck">✓</span><div><strong>Explain why random IDs fail at scale.</strong> Birthday paradox. Collision retries. Show the formula: <code>P ≈ 1 − e^(−n²/2N)</code>.</div></li>
  <li><span class="ck">✓</span><div><strong>Choose base62 counter encoding.</strong> Explain 62⁷ = 3.5T unique codes. Zero collisions. Then immediately address the distributed counter problem.</div></li>
  <li><span class="ck">✓</span><div><strong>Address distributed counter explicitly.</strong> Name range-based allocation, Redis INCR, or Snowflake. Explain tradeoffs. Range allocation is the easiest to explain clearly.</div></li>
  <li><span class="ck">✓</span><div><strong>Distinguish 301 vs 302.</strong> This is a trap. 301 caches at browser, breaks analytics. 302 always hits server, enables full tracking. Know which to use and why.</div></li>
  <li><span class="ck">✓</span><div><strong>Propose Redis caching for reads.</strong> 80/20 rule. ~4 GB for 20M hot URLs. Show you know cache-aside pattern and TTL management.</div></li>
  <li><span class="ck">✓</span><div><strong>Decouple analytics writes.</strong> Kafka queue + batch flush to time-series DB. Never INSERT per click on the critical path.</div></li>
  <li><span class="ck">✓</span><div><strong>Handle expiry two ways.</strong> Lazy deletion (check on read, return 410) + background sweep. Explain why both are needed.</div></li>
  <li><span class="ck">✓</span><div><strong>Name failure modes.</strong> Counter service down → pre-cached ranges. Redis down → fallback to DB. DB primary down → failover to replica (accept brief read-only mode).</div></li>
</ul>

---

{: class="marginalia" }
The counter pre-allocation<br/>trick is elegant: each app<br/>server grabs a range of<br/>**1,000 IDs** at startup.<br/>Only talk to the counter<br/>service once per 1,000 URLs.

*This is post #2 in the System Design Interview Prep series. The next post covers the design of a distributed rate limiter — another interview staple where the tricky part isn't the algorithm but the failure semantics of your counter store.*

---

<script>
// ─── Base62 encoder ──────────────────────────────────────────────
var B62_ALPHA = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(n) {
  if (n === 0) return B62_ALPHA[0];
  var result = [];
  var steps = [];
  while (n > 0) {
    var rem = n % 62;
    result.push(B62_ALPHA[rem]);
    steps.push(n + ' % 62 = ' + rem + ' → ' + B62_ALPHA[rem]);
    n = Math.floor(n / 62);
  }
  return { code: result.reverse().join(''), steps: steps.reverse() };
}

function buildAlphabetTable() {
  var wrap = document.getElementById('b62-alphabet');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (var i = 0; i < 62; i++) {
    var cell = document.createElement('div');
    cell.className = 'b62-cell';
    cell.id = 'b62-cell-' + i;
    cell.innerHTML = '<span class="b62-idx">' + i + '</span>' + B62_ALPHA[i];
    wrap.appendChild(cell);
  }
}

function encodeB62() {
  var inp = document.getElementById('b62-input');
  var n = parseInt(inp.value, 10);
  if (isNaN(n) || n < 0) {
    document.getElementById('b62-code').textContent = '—';
    document.getElementById('b62-steps').textContent = '';
    return;
  }
  var res = toBase62(n);
  document.getElementById('b62-code').textContent = res.code;
  document.getElementById('b62-steps').innerHTML =
    res.steps.slice(0, 8).join('<br/>') + (res.steps.length > 8 ? '<br/>...' : '');

  // Highlight active chars
  for (var i = 0; i < 62; i++) {
    var cell = document.getElementById('b62-cell-' + i);
    if (cell) cell.classList.remove('active');
  }
  for (var ci = 0; ci < res.code.length; ci++) {
    var idx = B62_ALPHA.indexOf(res.code[ci]);
    var c = document.getElementById('b62-cell-' + idx);
    if (c) c.classList.add('active');
  }
}

// ─── Architecture diagram ────────────────────────────────────────
var nodeData = {
  client: {
    title: '🌐 Client (Browser / Mobile App)',
    desc: 'The end user accessing a short URL. Sends GET /aB3k9z to the load balancer. Receives a 302 redirect response.',
    failure: 'Client-side: browser caching stale 301 redirects. Mitigation: use 302 for analytics-tracked links.',
    scale: 'Clients are inherently distributed. No scaling needed on this side.'
  },
  lb: {
    title: '⚖️ Load Balancer (Nginx / AWS ALB)',
    desc: 'Distributes traffic across API servers using round-robin or least-connections. Terminates TLS. Performs health checks.',
    failure: 'LB failure = total outage. Mitigation: active-passive pair with virtual IP failover (keepalived / AWS managed).',
    scale: 'AWS ALB scales automatically. Nginx: run two instances with floating IP. Rate-limit per IP here to block abuse.'
  },
  api: {
    title: '🖥️ API Servers (Stateless, 3+ nodes)',
    desc: 'Handles two endpoints: POST /shorten (creates short code) and GET /:code (redirects). Stateless — any server handles any request.',
    failure: 'Server crash: LB health check removes it within 5s. Stateless design means no session to lose.',
    scale: 'Horizontal scaling. Add nodes behind the LB. Each server caches its own ID range (pre-allocated 1,000 IDs). Autoscale on CPU > 70%.'
  },
  cache: {
    title: '⚡ Redis Cache Cluster',
    desc: 'Stores hot URL mappings: key = short code, value = long URL. TTL = 1 hour. Handles ~80% of redirect lookups without touching MySQL.',
    failure: 'Redis node failure: replica promotion via Redis Sentinel (~30s failover). During failover, all requests fall through to MySQL. Plan for 2× DB load spike.',
    scale: 'Redis Cluster (16 shards) for horizontal scaling. 4 GB for 20M hot URLs. Add read replicas per shard for read-heavy traffic.'
  },
  db: {
    title: '🗄️ MySQL + Read Replicas',
    desc: 'Primary source of truth. Schema: (code VARCHAR(16) PK, long_url TEXT, created_at TIMESTAMP, expires_at TIMESTAMP, is_custom BOOL). Writes go to primary, reads to replicas.',
    failure: 'Primary failure: promote replica (5-30s downtime with MySQL Orchestrator). During promotion: reads succeed, writes fail. Queue writes and replay.',
    scale: '1 primary + 3 read replicas. Shard by code prefix (a-z, A-Z, 0-9) for write scaling beyond 5,000 writes/sec. Consider Vitess for transparent sharding.'
  },
  counter: {
    title: '🔢 Counter Service (Redis INCRBY)',
    desc: 'Single source of monotonic IDs. API servers call INCRBY global_counter 1000 to claim a range of 1,000 IDs. Each server then uses those IDs locally.',
    failure: 'Redis counter failure: servers exhaust pre-allocated ranges within ~1 second at 1,157 writes/sec. Mitigation: replicated Redis with fast failover, or fallback to UUID-based IDs temporarily.',
    scale: 'Single Redis INCRBY handles millions of ops/sec. Range allocation means counter is called only 1× per 1,000 URLs — negligible load. Add standby replica for HA.'
  },
  cdn: {
    title: '🚀 CDN Edge (CloudFront / Fastly)',
    desc: 'Caches redirect responses at edge nodes globally. For viral links (millions of requests), the CDN absorbs traffic before it ever reaches your servers.',
    failure: 'CDN outage: traffic falls back to origin servers. Ensure origin can handle 100% traffic surge. Set Cache-Control: no-store for analytics-tracked links (302).',
    scale: 'CDN auto-scales globally. Use for 301 redirects only (deterministic destination). Cache-Control: max-age=3600 for moderate freshness.'
  }
};

function selectNode(id) {
  // Clear all selected states
  var nodes = document.querySelectorAll('.arch-node');
  nodes.forEach(function(n) { n.classList.remove('selected'); });

  // Select matching nodes (multiple API servers share same data)
  document.querySelectorAll('[onclick="selectNode(\'' + id + '\')"]').forEach(function(n) {
    n.classList.add('selected');
  });

  var d = nodeData[id];
  if (!d) return;
  var panel = document.getElementById('node-info');
  panel.innerHTML =
    '<h4>' + d.title + '</h4>' +
    '<div class="info-row"><span class="info-icon">📋</span><span>' + d.desc + '</span></div>' +
    '<div class="info-row"><span class="info-icon">💥</span><span><strong>Failure mode:</strong><span class="failure-tag">risk</span> ' + d.failure + '</span></div>' +
    '<div class="info-row"><span class="info-icon">📈</span><span><strong>Scaling:</strong><span class="scale-tag">scale</span> ' + d.scale + '</span></div>';
}

// Draw SVG arrows between nodes
function drawArrows() {
  var svg = document.getElementById('arch-svg');
  var canvas = document.getElementById('arch-canvas');
  if (!svg || !canvas) return;
  var w = canvas.offsetWidth;
  var h = canvas.offsetHeight;
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

  function midpoint(el) {
    var rect = el.getBoundingClientRect();
    var cRect = canvas.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - cRect.left,
      y: rect.top + rect.height / 2 - cRect.top
    };
  }

  var pairs = [
    ['node-client',  'node-lb',     '#3a7bd5'],
    ['node-lb',      'node-api-1',  '#5a8a5a'],
    ['node-lb',      'node-api-2',  '#5a8a5a'],
    ['node-lb',      'node-api-3',  '#5a8a5a'],
    ['node-api-1',   'node-cache',  '#8a406a'],
    ['node-api-2',   'node-cache',  '#8a406a'],
    ['node-api-1',   'node-db',     '#405a8a'],
    ['node-api-2',   'node-db',     '#405a8a'],
    ['node-api-3',   'node-db',     '#405a8a'],
    ['node-cache',   'node-counter','#8a8a40'],
    ['node-db',      'node-cdn',    '#406a6a'],
  ];

  var lines = '';
  pairs.forEach(function(pair) {
    var a = document.getElementById(pair[0]);
    var b = document.getElementById(pair[1]);
    if (!a || !b) return;
    var pa = midpoint(a), pb = midpoint(b);
    var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
    lines += '<line x1="' + pa.x + '" y1="' + pa.y + '" x2="' + pb.x + '" y2="' + pb.y + '"' +
      ' stroke="' + pair[2] + '" stroke-width="1.5" stroke-opacity="0.45" stroke-dasharray="4 3"/>';
  });
  svg.innerHTML = '<defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">' +
    '<path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.2)"/></marker></defs>' + lines;
}

// ─── Short code generator ────────────────────────────────────────
function simpleHash(str) {
  var hash = 5381;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0x7FFFFFFF;
  }
  return Math.abs(hash) % 1000000000;
}

function generateCode() {
  var url = document.getElementById('gen-url').value.trim();
  var out = document.getElementById('gen-output');
  if (!url) { out.style.display = 'none'; return; }
  out.style.display = 'grid';

  var id = simpleHash(url);
  var res = toBase62(id);
  var code = res.code;
  // Pad to 7 chars
  while (code.length < 7) { code = '0' + code; }

  document.getElementById('gen-id').textContent = id.toLocaleString();
  document.getElementById('gen-code').textContent = code;
  document.getElementById('gen-short').textContent = 'https://sho.rt/' + code;
  document.getElementById('gen-steps').innerHTML = res.steps.slice(0, 5).join('<br/>');
}

// ─── Capacity estimator ──────────────────────────────────────────
function fmtNum(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + ' T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + ' B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + ' M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + ' K';
  return n.toString();
}
function fmtBytes(b) {
  if (b >= 1e15) return (b / 1e15).toFixed(1) + ' PB';
  if (b >= 1e12) return (b / 1e12).toFixed(1) + ' TB';
  if (b >= 1e9)  return (b / 1e9).toFixed(1) + ' GB';
  if (b >= 1e6)  return (b / 1e6).toFixed(1) + ' MB';
  return (b / 1e3).toFixed(1) + ' KB';
}

function updateEstimator() {
  var urls   = parseInt(document.getElementById('sl-urls').value);
  var years  = parseInt(document.getElementById('sl-years').value);
  var bytes  = parseInt(document.getElementById('sl-bytes').value);
  var ratio  = parseInt(document.getElementById('sl-ratio').value);

  document.getElementById('lbl-urls').textContent  = fmtNum(urls);
  document.getElementById('lbl-years').textContent = years + ' year' + (years > 1 ? 's' : '');
  document.getElementById('lbl-bytes').textContent = bytes + ' B';
  document.getElementById('lbl-ratio').textContent = ratio + '\u00d7';

  var writeQps  = Math.round(urls / 86400);
  var readQps   = writeQps * ratio;
  var totalUrls = urls * 365 * years;
  var storage   = totalUrls * bytes;
  var cacheHot  = totalUrls * 0.2 * bytes;
  var codeLen   = Math.ceil(Math.log(totalUrls) / Math.log(62));

  document.getElementById('est-qps-w').textContent   = fmtNum(writeQps) + '/s';
  document.getElementById('est-qps-r').textContent   = fmtNum(readQps) + '/s';
  document.getElementById('est-storage').textContent = fmtBytes(storage);
  document.getElementById('est-cache').textContent   = fmtBytes(cacheHot);
  document.getElementById('est-total').textContent   = fmtNum(totalUrls);
  document.getElementById('est-codes').textContent   = codeLen + ' chars';
}

// ─── Copy button ─────────────────────────────────────────────────
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  navigator.clipboard.writeText(pre.textContent).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.textContent = 'copy';
      btn.classList.remove('copied');
    }, 1800);
  });
}

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  buildAlphabetTable();
  encodeB62();
  updateEstimator();
  setTimeout(drawArrows, 200);
  window.addEventListener('resize', function() { setTimeout(drawArrows, 100); });
});
</script>
