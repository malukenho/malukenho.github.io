---
layout: post
title: "System Design: A/B Testing Platform — Feature Flags and Experimentation at Scale"
date: 2026-06-12 10:00:00 +0000
categories: ["post"]
tags: [system-design, ab-testing, feature-flags, experimentation, statistics, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios
</div>

{: class="marginalia" }
**Amazon runs 1,000+<br/>A/B tests at any given<br/>moment. Every UI<br/>change, algorithm<br/>tweak, and pricing<br/>experiment goes<br/>through experimentation.<br/>The "1-Click Purchase"<br/>(1999) was one of the<br/>earliest — and they<br/>patented it.**

Design an A/B testing platform like Optimizely or LaunchDarkly. Engineers define experiments — *"show blue button to 50 % of users"* — each user is consistently assigned to a variant, the platform collects metrics, and a statistics engine determines whether the difference is real. Scale: **10,000 concurrent experiments** across **500 million users**.

**The question:** *Design an A/B testing / feature-flag platform. Engineers define experiments with traffic splits. Assignment must be deterministic per user, add less than 1 ms to request latency, and the system must support 10,000 simultaneous experiments across 500 M users. The platform collects conversion metrics and computes statistical significance.*

---

<style>
.code-wrap { position:relative;background:#111214;border:1px solid #2e2f35;border-radius:10px;overflow:hidden;margin:1rem 0; }
.code-lang { background:#1c1d22;padding:6px 16px;font-size:11px;color:rgba(255,255,255,.38);letter-spacing:.08em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center; }
.copy-btn { background:transparent;border:1px solid #3a3b40;border-radius:4px;color:rgba(255,255,255,.45);font-size:11px;padding:2px 8px;cursor:pointer;font-family:inherit;transition:all .2s; }
.copy-btn:hover,.copy-btn.copied { border-color:#7bcdab;color:#7bcdab; }
.code-wrap pre.code-block { margin:0;padding:16px 20px;overflow-x:auto;font-family:"JetBrains Mono","Fira Code",monospace;font-size:13px;line-height:1.65;color:rgba(255,255,255,.85);background:transparent!important;border:none!important; }
.kw  { color:#cc99cd; }
.ty  { color:#7bcdab; }
.st  { color:#f8c555; }
.cm  { color:#5a6272;font-style:italic; }
.fn  { color:#89c0d0; }
.nu  { color:#f08080; }
.pp  { color:#fbef8a; }
.op  { color:rgba(255,255,255,.5); }

.callout { border-radius:8px;padding:1rem 1.2rem;margin:1rem 0;font-size:.84rem;line-height:1.7; }
.callout-green  { background:#1a2e22;border-left:3px solid #7bcdab;color:rgba(255,255,255,.82); }
.callout-yellow { background:#25240e;border-left:3px solid #fbef8a;color:rgba(255,255,255,.82); }
.callout-red    { background:#2a1616;border-left:3px solid #f08080;color:rgba(255,255,255,.82); }
.callout strong { color:#fff; }

.stat-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin:1.5rem 0; }
.stat-card { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1.5rem;text-align:center; }
.stat-num  { font-size:1.6rem;font-weight:800;color:#fbef8a;display:block;line-height:1.2; }
.stat-lbl  { font-size:.74rem;color:rgba(255,255,255,.45);margin-top:.3rem;text-transform:uppercase;letter-spacing:.07em; }

.comp-table { width:100%;border-collapse:collapse;font-size:.82rem;margin:1.5rem 0; }
.comp-table th { background:#1e1f24;color:#fbef8a;padding:10px 14px;text-align:left;border-bottom:1px solid #2e2f35; }
.comp-table td { padding:9px 14px;border-bottom:1px solid #1e1f24;color:rgba(255,255,255,.78); }
.comp-table tr:hover td { background:#1a1b20; }
.badge { display:inline-block;padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:700; }
.badge-green  { background:#1a2e22;color:#7bcdab; }
.badge-yellow { background:#25240e;color:#fbef8a; }
.badge-red    { background:#2a1616;color:#f08080; }
.badge-blue   { background:#0e1e2e;color:#89c0d0; }

.viz-wrap { background:#111214;border:1px solid #2e2f35;border-radius:12px;padding:1.4rem;margin:1.5rem 0; }
.viz-title { font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:1rem; }
.viz-controls { display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1.2rem;align-items:center; }
.viz-btn { padding:6px 14px;border-radius:6px;border:1px solid #3a3b40;background:#1a1b1f;color:rgba(255,255,255,.75);font-size:.8rem;cursor:pointer;transition:all .2s;font-family:inherit; }
.viz-btn:hover { border-color:#7bcdab;color:#7bcdab; }
.viz-btn.active { border-color:#fbef8a;color:#fbef8a;background:#1e1d08; }
.viz-btn.run { background:#7bcdab;color:#19191c;border:none;border-radius:8px;font-weight:700;padding:.5rem 1.2rem;cursor:pointer; }
.viz-btn.run:hover { background:#5eb896; }

.arch-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.2rem 0; }
@media(max-width:600px) { .arch-grid { grid-template-columns:1fr; } }
.arch-card { background:#1a1b1f;border:1px solid #2e2f35;border-radius:10px;padding:1rem 1.1rem; }
.arch-card h4 { margin:0 0 .5rem;color:#fbef8a;font-size:.85rem; }
.arch-card p { margin:0;font-size:.8rem;color:rgba(255,255,255,.65);line-height:1.6; }

.pipe-flow { display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin:1.2rem 0; }
.pipe-node { background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.55rem .9rem;font-size:.78rem;color:rgba(255,255,255,.8);text-align:center;min-width:90px; }
.pipe-node.highlight { border-color:#7bcdab;background:#1a2e22;color:#7bcdab; }
.pipe-node.highlight-y { border-color:#fbef8a;background:#25240e;color:#fbef8a; }
.pipe-arrow { color:rgba(255,255,255,.22);font-size:.9rem;flex-shrink:0; }

.layer-wrap { margin:1.2rem 0; }
.layer-row { display:flex;align-items:stretch;gap:.5rem;margin:.4rem 0; }
.layer-label { writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);font-size:.65rem;color:rgba(255,255,255,.35);letter-spacing:.1em;text-transform:uppercase;min-width:24px;display:flex;align-items:center;justify-content:center; }
.layer-exps { display:flex;gap:.4rem;flex:1;flex-wrap:wrap; }
.layer-exp { border-radius:7px;padding:.5rem .8rem;font-size:.77rem;font-weight:600;flex:1;min-width:80px;text-align:center; }
.layer-exp.a { background:#1a2e22;border:1px solid #7bcdab;color:#7bcdab; }
.layer-exp.b { background:#25240e;border:1px solid #fbef8a;color:#fbef8a; }
.layer-exp.c { background:#0e1e2e;border:1px solid #89c0d0;color:#89c0d0; }
.layer-exp.d { background:#2a1616;border:1px solid #f08080;color:#f08080; }
.layer-exp.empty { background:#111214;border:1px dashed #2e2f35;color:rgba(255,255,255,.2); }

.slider-row { display:flex;align-items:center;gap:.8rem;margin:.6rem 0;font-size:.82rem;color:rgba(255,255,255,.75); }
.slider-row input[type=range] { flex:1;accent-color:#7bcdab; }
.slider-val { min-width:36px;text-align:right;color:#fbef8a;font-family:"JetBrains Mono","Fira Code",monospace;font-weight:700; }

.input-row { display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin:.5rem 0; }
.input-row label { font-size:.8rem;color:rgba(255,255,255,.6);min-width:160px; }
.input-row input[type=text], .input-row input[type=number] {
  background:#1a1b1f;border:1px solid #3a3b40;border-radius:6px;
  color:rgba(255,255,255,.85);padding:6px 10px;font-size:.82rem;font-family:inherit;
  width:160px;outline:none;
}
.input-row input:focus { border-color:#7bcdab; }

.result-box { background:#0d0e11;border:1px solid #1e2025;border-radius:8px;padding:1rem 1.2rem;font-size:.83rem;line-height:1.8;margin:.8rem 0;min-height:48px; }
.result-box .rb-label { color:rgba(255,255,255,.4);font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem; }
.rb-sig   { color:#7bcdab;font-weight:700; }
.rb-notsig { color:#fbef8a;font-weight:700; }
.rb-warn  { color:#f08080;font-weight:700; }

.hash-vis { display:flex;flex-wrap:wrap;gap:3px;margin:.8rem 0; }
.hash-cell { width:18px;height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:.55rem;font-family:monospace; }
.hash-cell.ctrl { background:#1a1b1f;border:1px solid #2e2f35;color:rgba(255,255,255,.3); }
.hash-cell.trt  { background:#1a2e22;border:1px solid #7bcdab;color:#7bcdab; }

.dist-bar-wrap { margin:.6rem 0; }
.dist-bar-row { display:flex;align-items:center;gap:.6rem;margin:.3rem 0;font-size:.8rem; }
.dist-bar-label { min-width:80px;color:rgba(255,255,255,.6); }
.dist-bar-track { flex:1;background:#1e1f24;border-radius:3px;height:14px;overflow:hidden;position:relative; }
.dist-bar-fill { height:100%;border-radius:3px;transition:width .5s; }
.dist-bar-fill.ctrl { background:#5a6272; }
.dist-bar-fill.trt  { background:#7bcdab; }
.dist-bar-num { min-width:44px;text-align:right;color:rgba(255,255,255,.5);font-family:"JetBrains Mono","Fira Code",monospace;font-size:.75rem; }

.sig-meter { height:12px;border-radius:6px;background:linear-gradient(to right,#f08080,#fbef8a,#7bcdab);margin:.6rem 0;position:relative; }
.sig-needle { position:absolute;top:-4px;width:4px;height:20px;background:#fff;border-radius:2px;transform:translateX(-50%);transition:left .6s; }

.peeking-chart { display:flex;align-items:flex-end;gap:2px;height:80px;margin:.8rem 0; }
.pk-bar { flex:1;border-radius:2px 2px 0 0;min-width:6px;transition:height .4s; }
.pk-threshold { border-top:1px dashed rgba(251,239,138,.5);position:relative; }

@keyframes pulse-dot { 0%,100% { opacity:1;transform:scale(1); } 50% { opacity:.4;transform:scale(.7); } }
.live-dot { width:8px;height:8px;background:#7bcdab;border-radius:50%;display:inline-block;margin-right:.4rem;animation:pulse-dot 1.4s ease-in-out infinite; }
</style>

## 1. What A/B Testing Solves

Before designing anything, ground the system in the four concrete problems it addresses:

<div class="arch-grid">
  <div class="arch-card">
    <h4>📊 Data-driven decisions</h4>
    <p>Does the blue button outperform the green? Does removing the sidebar increase conversions? Gut feeling is replaced with statistical evidence.</p>
  </div>
  <div class="arch-card">
    <h4>🚀 Progressive rollouts</h4>
    <p>Ship to 1% → 10% → 50% → 100%. Each stage validates stability and metrics before wider exposure. Reduces blast radius on failures.</p>
  </div>
  <div class="arch-card">
    <h4>🔴 Kill switches</h4>
    <p>Instantly disable a broken feature for all users — without a deployment. The flag is turned off; the code path is never executed again.</p>
  </div>
  <div class="arch-card">
    <h4>🎯 Personalization</h4>
    <p>Show different experiences to different user segments: premium vs free, country-specific UI, power users vs casual visitors.</p>
  </div>
</div>

---

## 2. The Core Requirements

Translate the business needs into technical constraints before touching architecture.

<table class="comp-table">
  <thead><tr><th>Requirement</th><th>Constraint</th><th>Why it matters</th></tr></thead>
  <tbody>
    <tr><td><strong>Deterministic assignment</strong></td><td>Same user → same variant, always</td><td>User experience consistency; statistical validity</td></tr>
    <tr><td><strong>Latency</strong></td><td>&lt; 1 ms per assignment</td><td>Called on every page load; can't add perceptible delay</td></tr>
    <tr><td><strong>Scale</strong></td><td>10,000 experiments, 500 M users</td><td>Millions of assignments/sec at peak</td></tr>
    <tr><td><strong>No I/O on hot path</strong></td><td>Assignment must be pure computation</td><td>Database lookups at 5 M req/s is impossible</td></tr>
    <tr><td><strong>Metrics collection</strong></td><td>Collect events, aggregate, compute statistics</td><td>The whole point: measure lift and significance</td></tr>
    <tr><td><strong>Statistical correctness</strong></td><td>No peeking problem; valid confidence intervals</td><td>Wrong statistics → wrong decisions → regression shipped</td></tr>
  </tbody>
</table>

---

## 3. Assignment: Consistent Hashing with MurmurHash

The core insight: **assignment must require zero I/O**. No database, no cache, no network call. Pure math.

<div class="code-wrap">
<div class="code-lang">pseudocode <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">// Deterministic variant assignment — no DB lookup needed</span>
<span class="kw">function</span> <span class="fn">assign</span>(userId, experimentId, trafficSplit):
  hashInput  <span class="op">=</span> userId <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> experimentId
  hashValue  <span class="op">=</span> <span class="fn">murmur3</span>(hashInput) <span class="op">%</span> <span class="nu">100</span>
  <span class="kw">if</span> hashValue <span class="op">&lt;</span> trafficSplit:
    <span class="kw">return</span> <span class="st">"treatment"</span>
  <span class="kw">else</span>:
    <span class="kw">return</span> <span class="st">"control"</span></pre>
</div>

Three properties make this design correct:

- **Deterministic:** the same `(userId, experimentId)` pair always produces the same hash → the same variant. No storage needed.
- **Uniform distribution:** MurmurHash distributes inputs uniformly across 0–99, so a 50 % split gives roughly equal groups.
- **Experiment isolation:** changing the `experimentId` in the hash input means existing user-to-experiment assignments are unaffected by adding new experiments.

### Interactive Assignment Demo

<div class="viz-wrap">
  <div class="viz-title">Assignment Simulator</div>
  <div class="input-row">
    <label>User ID</label>
    <input type="text" id="ab-userid" value="user_12345" oninput="abSimulate()" />
  </div>
  <div class="input-row">
    <label>Experiment ID</label>
    <input type="text" id="ab-expid" value="btn_color_v2" oninput="abSimulate()" />
  </div>
  <div class="slider-row">
    <span>Traffic Split</span>
    <input type="range" id="ab-split" min="0" max="100" value="50" oninput="abSimulate()" />
    <span class="slider-val" id="ab-split-val">50%</span>
  </div>
  <div class="result-box" id="ab-single-result"><span class="rb-label">Result</span><br/>Enter a user ID above.</div>
  <div style="margin-top:1rem;">
    <button class="viz-btn run" onclick="abGenerate100()">Generate 100 users</button>
    <span style="font-size:.78rem;color:rgba(255,255,255,.4);margin-left:.8rem;">Verify actual distribution matches the split</span>
  </div>
  <div id="ab-dist-wrap" style="display:none;margin-top:1rem;">
    <div class="dist-bar-row">
      <span class="dist-bar-label">Control</span>
      <div class="dist-bar-track"><div class="dist-bar-fill ctrl" id="ab-ctrl-bar" style="width:0%"></div></div>
      <span class="dist-bar-num" id="ab-ctrl-num">0</span>
    </div>
    <div class="dist-bar-row">
      <span class="dist-bar-label">Treatment</span>
      <div class="dist-bar-track"><div class="dist-bar-fill trt" id="ab-trt-bar" style="width:0%"></div></div>
      <span class="dist-bar-num" id="ab-trt-num">0</span>
    </div>
    <div class="hash-vis" id="ab-hash-cells"></div>
  </div>
</div>

---

## 4. Flag Delivery: Two Approaches

Once we know *how* assignment works, we need to decide *where* flag rules live.

<div class="arch-grid">
  <div class="arch-card">
    <h4>🖥️ Server-side evaluation</h4>
    <p>All flag rules live on the server. Request arrives → server evaluates rules in memory → serves the appropriate variant. Rules are loaded on startup and cached; evaluation is &lt; 1 μs. Rules are never exposed to end users. This is the dominant approach for back-end services.</p>
  </div>
  <div class="arch-card">
    <h4>🌐 Client-side evaluation</h4>
    <p>Rules are downloaded to the browser SDK on app start and evaluated in-browser — zero network round-trip on the hot path. Trade-off: rules are visible to the user (can be inspected), and a large rule set means a large download. Suitable for front-end feature flags where rule confidentiality is not required.</p>
  </div>
</div>

**SDK bootstrap flow (client-side):**

<div class="pipe-flow">
  <div class="pipe-node highlight">App Start</div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node">SDK Init</div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node highlight-y">Fetch Flag Bundle</div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node">Cache Locally</div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node highlight">Evaluate Flags<br/><span style="font-size:.68rem;opacity:.7;">synchronous, 0 I/O</span></div>
</div>

The "flag bundle" is a compact JSON document containing every flag rule relevant to the current user. The server pre-computes targeting-rule evaluation for the user and returns a stripped-down bundle — reducing client-side compute and hiding the full rule set.

---

## 5. Flag Storage and Rollout Rules

Each feature flag is a structured document with several logical components.

<div class="code-wrap">
<div class="code-lang">json <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block">{
  <span class="pp">"id"</span>:     <span class="st">"checkout_v3"</span>,
  <span class="pp">"name"</span>:   <span class="st">"Checkout Flow Redesign v3"</span>,
  <span class="pp">"status"</span>: <span class="st">"active"</span>,         <span class="cm">// active | inactive | archived</span>
  <span class="pp">"killSwitch"</span>: <span class="kw">false</span>,         <span class="cm">// if true → forces ALL users to control</span>
  <span class="pp">"trafficSplit"</span>: <span class="nu">50</span>,            <span class="cm">// % of matched users who get treatment</span>
  <span class="pp">"targetingRules"</span>: [
    {
      <span class="pp">"conditions"</span>: [
        { <span class="pp">"attribute"</span>: <span class="st">"country"</span>,  <span class="pp">"op"</span>: <span class="st">"eq"</span>,  <span class="pp">"value"</span>: <span class="st">"US"</span> },
        { <span class="pp">"attribute"</span>: <span class="st">"plan"</span>,     <span class="pp">"op"</span>: <span class="st">"eq"</span>,  <span class="pp">"value"</span>: <span class="st">"pro"</span> }
      ],
      <span class="pp">"variant"</span>: <span class="st">"treatment"</span>    <span class="cm">// force treatment for US Pro users</span>
    }
  ],
  <span class="pp">"metrics"</span>: [<span class="st">"purchase"</span>, <span class="st">"signup"</span>, <span class="st">"page_view"</span>]
}</pre>
</div>

**Storage architecture:**

<div class="pipe-flow">
  <div class="pipe-node highlight-y">PostgreSQL<br/><span style="font-size:.65rem;opacity:.7;">flag definitions<br/>source of truth</span></div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node highlight">Redis<br/><span style="font-size:.65rem;opacity:.7;">&lt; 1 ms reads<br/>hot flag cache</span></div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node">App Server<br/><span style="font-size:.65rem;opacity:.7;">in-memory copy<br/>polled every 30 s</span></div>
</div>

All 10,000 flags compress to roughly **100 MB** in Redis — a trivially small dataset. App servers keep a local in-memory copy updated via long-poll or SSE from the flag delivery service. Flag evaluation itself hits no external service.

---

## 6. Metrics Collection

Assignment alone is useless without outcome measurement. After a user is assigned a variant, the platform must collect conversion events and attribute them to the right experiment variant.

**Event schema:**

<div class="code-wrap">
<div class="code-lang">json <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block">{
  <span class="pp">"userId"</span>:       <span class="st">"user_12345"</span>,
  <span class="pp">"experimentId"</span>: <span class="st">"btn_color_v2"</span>,
  <span class="pp">"variant"</span>:      <span class="st">"treatment"</span>,
  <span class="pp">"eventType"</span>:    <span class="st">"purchase"</span>,
  <span class="pp">"timestamp"</span>:    <span class="nu">1718179200000</span>,
  <span class="pp">"value"</span>:        <span class="nu">49.99</span>         <span class="cm">// optional: revenue, duration, etc.</span>
}</pre>
</div>

**Collection pipeline:**

<div class="pipe-flow">
  <div class="pipe-node highlight">Client Event<br/><span style="font-size:.65rem;opacity:.7;">click / purchase<br/>/ page_view</span></div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node">Ingest API<br/><span style="font-size:.65rem;opacity:.7;">stateless HTTP<br/>write-only</span></div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node highlight-y">Kafka<br/><span style="font-size:.65rem;opacity:.7;">50B events/day<br/>durable queue</span></div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node">Flink<br/><span style="font-size:.65rem;opacity:.7;">stream processing<br/>deduplication</span></div>
  <span class="pipe-arrow">→</span>
  <div class="pipe-node highlight">ClickHouse<br/><span style="font-size:.65rem;opacity:.7;">OLAP storage<br/>fast aggregation</span></div>
</div>

ClickHouse is purpose-built for this: columnar storage, vectorized execution, and `GROUP BY` queries over billions of rows return in under a second. A query like *"count conversions by variant for experiment X in the last 7 days"* scans only the `experimentId` and `variant` columns — ignoring everything else.

---

## 7. Statistical Significance Calculator

The mathematics of deciding "is this result real, or just noise?" is the hardest part of A/B testing to get right.

**Z-test for proportions** is the standard approach when the metric is a conversion rate:

<div class="code-wrap">
<div class="code-lang">javascript <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">function</span> <span class="fn">zTest</span>(Nc, kc, Nt, kt) {
  <span class="cm">// Nc = control visitors, kc = control conversions</span>
  <span class="cm">// Nt = treatment visitors, kt = treatment conversions</span>
  <span class="kw">var</span> pc <span class="op">=</span> kc <span class="op">/</span> Nc;
  <span class="kw">var</span> pt <span class="op">=</span> kt <span class="op">/</span> Nt;
  <span class="cm">// Pooled proportion under H0</span>
  <span class="kw">var</span> p  <span class="op">=</span> (kc <span class="op">+</span> kt) <span class="op">/</span> (Nc <span class="op">+</span> Nt);
  <span class="kw">var</span> se <span class="op">=</span> <span class="ty">Math</span>.<span class="fn">sqrt</span>(p <span class="op">*</span> (<span class="nu">1</span> <span class="op">-</span> p) <span class="op">*</span> (<span class="nu">1</span><span class="op">/</span>Nc <span class="op">+</span> <span class="nu">1</span><span class="op">/</span>Nt));
  <span class="kw">var</span> z  <span class="op">=</span> (pt <span class="op">-</span> pc) <span class="op">/</span> se;
  <span class="kw">return</span> { z: z, pValue: <span class="fn">pFromZ</span>(<span class="ty">Math</span>.<span class="fn">abs</span>(z)) };
}

<span class="cm">// 95% CI for treatment conversion rate</span>
<span class="kw">function</span> <span class="fn">confidenceInterval</span>(k, N) {
  <span class="kw">var</span> p  <span class="op">=</span> k <span class="op">/</span> N;
  <span class="kw">var</span> se <span class="op">=</span> <span class="ty">Math</span>.<span class="fn">sqrt</span>(p <span class="op">*</span> (<span class="nu">1</span> <span class="op">-</span> p) <span class="op">/</span> N);
  <span class="kw">return</span> { lo: p <span class="op">-</span> <span class="nu">1.96</span> <span class="op">*</span> se, hi: p <span class="op">+</span> <span class="nu">1.96</span> <span class="op">*</span> se };
}</pre>
</div>

### Interactive Statistical Significance Calculator

<div class="viz-wrap">
  <div class="viz-title">Statistical Significance Calculator</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin-bottom:1rem;">
    <div>
      <div style="color:#fbef8a;font-size:.78rem;font-weight:700;margin-bottom:.5rem;">🟢 Control (Green Button)</div>
      <div class="input-row"><label>Visitors</label><input type="number" id="sc-nc" value="1000" oninput="sigCalc()" /></div>
      <div class="input-row"><label>Conversions</label><input type="number" id="sc-kc" value="50" oninput="sigCalc()" /></div>
    </div>
    <div>
      <div style="color:#7bcdab;font-size:.78rem;font-weight:700;margin-bottom:.5rem;">🔵 Treatment (Blue Button)</div>
      <div class="input-row"><label>Visitors</label><input type="number" id="sc-nt" value="1000" oninput="sigCalc()" /></div>
      <div class="input-row"><label>Conversions</label><input type="number" id="sc-kt" value="70" oninput="sigCalc()" /></div>
    </div>
  </div>
  <div class="input-row">
    <label>Daily visitors (for estimation)</label>
    <input type="number" id="sc-daily" value="500" oninput="sigCalc()" />
  </div>
  <div class="result-box" id="sc-result"><span class="rb-label">Result</span><br/>Fill in the fields above.</div>
  <div class="sig-meter" style="margin-top:1rem;">
    <div class="sig-needle" id="sc-needle" style="left:50%"></div>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:.68rem;color:rgba(255,255,255,.3);margin-top:.2rem;">
    <span>p = 1.0 (no signal)</span>
    <span>p = 0.05 (threshold)</span>
    <span>p = 0.001 (strong)</span>
  </div>
</div>

---

## 8. Mutual Exclusion and Experiment Interaction

Running 10,000 experiments simultaneously creates a subtle problem: **interaction effects**.

If user Alice is simultaneously in:
- Experiment A (button color: blue vs green)
- Experiment B (page layout: wide vs narrow)

…then the narrow layout might make the blue button look better for unrelated reasons. The two experiments contaminate each other's results.

**Solution: Layered architecture**

<div class="layer-wrap">
  <div style="font-size:.75rem;color:rgba(255,255,255,.4);margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.08em;">Experiment Layers</div>
  <div class="layer-row">
    <div class="layer-label">Layer 1 — UI</div>
    <div class="layer-exps">
      <div class="layer-exp a">btn_color_v2<br/><span style="font-size:.68rem;opacity:.7;">0–50% of users</span></div>
      <div class="layer-exp b">hero_image_v3<br/><span style="font-size:.68rem;opacity:.7;">50–80% of users</span></div>
      <div class="layer-exp empty">20% unassigned</div>
    </div>
  </div>
  <div class="layer-row">
    <div class="layer-label">Layer 2 — Ranking</div>
    <div class="layer-exps">
      <div class="layer-exp c">search_algo_v7<br/><span style="font-size:.68rem;opacity:.7;">0–60% of users</span></div>
      <div class="layer-exp d">rec_model_v4<br/><span style="font-size:.68rem;opacity:.7;">60–100% of users</span></div>
    </div>
  </div>
  <div class="layer-row">
    <div class="layer-label">Layer 3 — Pricing</div>
    <div class="layer-exps">
      <div class="layer-exp b">discount_strategy<br/><span style="font-size:.68rem;opacity:.7;">0–30% of users</span></div>
      <div class="layer-exp empty">70% unassigned</div>
    </div>
  </div>
</div>

**Rules:**
- Experiments within the **same layer** are **mutually exclusive** — a user can only be in one experiment per layer.
- Experiments in **different layers** are **orthogonal** — a user can be in one experiment per layer simultaneously. The layers are designed to test independent product dimensions (UI, ranking, pricing), so interaction effects are minimized.
- Each layer uses a different hash seed, so the 50 % split in Layer 1 is independent of the 60 % split in Layer 2.

<div class="callout callout-yellow">
<strong>Namespace isolation (alternative model):</strong> Some platforms use a single namespace of 0–9999 "slots". Each experiment is allocated a slice of the namespace. Users are assigned to a slot via hash; the experiment that owns that slot serves them. Mutually exclusive by construction — no user falls into two experiments that share slots.
</div>

---

## 9. The Peeking Problem

This is the most important section and the one most A/B testing implementations get wrong.

**The problem:** A researcher launches an experiment with a planned runtime of 14 days. On day 3, they check the dashboard and see p = 0.04 (significant!). They stop the experiment and ship the change. Six months later, it turns out the feature had no effect — the early result was pure noise.

**Why this happens:** The Z-test p-value is only valid *at the planned sample size*. Checking it repeatedly — and stopping when it crosses 0.05 — is called **optional stopping**. It inflates the false positive rate from 5 % to as high as 30 %.

<div class="callout callout-red">
<strong>False positive simulation:</strong> Run 1,000 A/A tests (control vs control — identical variants). Check the p-value every day for 14 days. Stop and "ship" whenever p &lt; 0.05. In a correctly-run experiment, about 5% of A/A tests should appear significant. With daily peeking and optional stopping, roughly 26–30% appear significant — a 5× inflation of false discoveries.
</div>

**Solutions:**

<table class="comp-table">
  <thead><tr><th>Approach</th><th>How it works</th><th>Trade-offs</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>Fixed-horizon test</strong></td>
      <td>Pre-commit to a sample size. Look at results only once.</td>
      <td>Simple. But researchers always peek early anyway.</td>
    </tr>
    <tr>
      <td><strong>Sequential testing (mSPRT)</strong></td>
      <td>Always-valid p-values — mathematically correct to check at any time without inflating false positive rate.</td>
      <td>Requires more samples to reach the same power. Used by Netflix, Booking.com.</td>
    </tr>
    <tr>
      <td><strong>Bayesian A/B testing</strong></td>
      <td>Compute P(treatment &gt; control). Inherently valid at any sample size — probability statements, not binary reject/fail.</td>
      <td>No hard significance threshold. Requires choosing a prior. Used by VWO, Google Optimize.</td>
    </tr>
  </tbody>
</table>

**Bayesian framing** is increasingly popular because it answers the question humans actually want: *"What is the probability that treatment is better than control?"* rather than *"Can we reject the null hypothesis?"*

<div class="code-wrap">
<div class="code-lang">pseudocode — bayesian estimate <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">// Beta-Binomial conjugate model</span>
<span class="cm">// Prior: Beta(1, 1) = uniform (no prior knowledge)</span>
<span class="cm">// Posterior: Beta(1 + conversions, 1 + non-conversions)</span>

posterior_control   <span class="op">=</span> <span class="fn">Beta</span>(<span class="nu">1</span> <span class="op">+</span> kc,  <span class="nu">1</span> <span class="op">+</span> Nc <span class="op">-</span> kc)
posterior_treatment <span class="op">=</span> <span class="fn">Beta</span>(<span class="nu">1</span> <span class="op">+</span> kt,  <span class="nu">1</span> <span class="op">+</span> Nt <span class="op">-</span> kt)

<span class="cm">// Monte Carlo: sample 10,000 times from each posterior</span>
wins <span class="op">=</span> <span class="fn">count</span>(sample_treatment[i] <span class="op">&gt;</span> sample_control[i]  <span class="kw">for</span> i <span class="kw">in</span> range(<span class="nu">10000</span>))
P(treatment <span class="op">&gt;</span> control) <span class="op">=</span> wins <span class="op">/</span> <span class="nu">10000</span></pre>
</div>

---

## 10. Capacity Estimate

<div class="stat-grid">
  <div class="stat-card"><span class="stat-num">10,000</span><div class="stat-lbl">Concurrent experiments</div></div>
  <div class="stat-card"><span class="stat-num">5 M/s</span><div class="stat-lbl">Peak assignments/sec</div></div>
  <div class="stat-card"><span class="stat-num">&lt; 1 ms</span><div class="stat-lbl">Flag eval latency</div></div>
  <div class="stat-card"><span class="stat-num">50 B/day</span><div class="stat-lbl">Metric events</div></div>
  <div class="stat-card"><span class="stat-num">~5 TB/day</span><div class="stat-lbl">ClickHouse ingestion</div></div>
  <div class="stat-card"><span class="stat-num">~100 MB</span><div class="stat-lbl">Redis flag cache</div></div>
</div>

<table class="comp-table">
  <thead><tr><th>Component</th><th>Scale driver</th><th>Solution</th></tr></thead>
  <tbody>
    <tr><td>Flag assignment</td><td>5 M assignments/sec</td><td>Pure hash computation, no I/O; horizontally scalable app servers</td></tr>
    <tr><td>Flag delivery</td><td>Flag bundle refreshes</td><td>Redis + CDN edge caching of flag bundles; 30 s TTL</td></tr>
    <tr><td>Event ingestion</td><td>50 B events/day</td><td>Kafka (600 partitions), stateless ingest API, sendBeacon on client</td></tr>
    <tr><td>Aggregation</td><td>Streaming computation</td><td>Flink for real-time rollups; ClickHouse for historical queries</td></tr>
    <tr><td>Flag storage</td><td>10,000 flags × rule complexity</td><td>PostgreSQL (source of truth) + Redis (read cache); 100 MB total</td></tr>
    <tr><td>Stat engine</td><td>Dashboard queries</td><td>Pre-aggregated daily rollups in ClickHouse; Z-test computed in-process</td></tr>
  </tbody>
</table>

**Why ClickHouse for metrics storage?**

A query like *"count distinct users with purchase events, grouped by variant, for experiment X, last 7 days"* over 350 billion rows sounds terrifying — but ClickHouse completes it in under 1 second thanks to:
- **Columnar storage:** only `experimentId`, `variant`, `eventType` columns are read
- **Vectorized execution:** SIMD operations over column batches
- **MergeTree partitioning:** data sharded by `(experimentId, date)`, so scans are localized

---

## 11. Full Architecture

<div class="pipe-flow" style="flex-direction:column;align-items:flex-start;gap:.8rem;">
  <div style="font-size:.75rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;">Control Plane (low traffic)</div>
  <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
    <div class="pipe-node highlight-y">Engineer<br/><span style="font-size:.65rem;">defines experiment</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node">Flag Service API<br/><span style="font-size:.65rem;">CRUD + validation</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node highlight-y">PostgreSQL<br/><span style="font-size:.65rem;">source of truth</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node highlight">Redis<br/><span style="font-size:.65rem;">hot cache</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node">App Servers<br/><span style="font-size:.65rem;">in-memory copy</span></div>
  </div>
  <div style="font-size:.75rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-top:.4rem;">Data Plane (high traffic)</div>
  <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
    <div class="pipe-node highlight">User Request<br/><span style="font-size:.65rem;">500 M users</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node">Assign Variant<br/><span style="font-size:.65rem;">hash(userId+expId)</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node highlight-y">Serve Experience<br/><span style="font-size:.65rem;">&lt;1ms, no I/O</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node">Event Fired<br/><span style="font-size:.65rem;">click/purchase</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node highlight">Kafka → Flink<br/><span style="font-size:.65rem;">→ ClickHouse</span></div>
  </div>
  <div style="font-size:.75rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-top:.4rem;">Analysis Plane</div>
  <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
    <div class="pipe-node">ClickHouse Query<br/><span style="font-size:.65rem;">aggregate metrics</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node highlight-y">Stat Engine<br/><span style="font-size:.65rem;">Z-test / Bayesian</span></div>
    <span class="pipe-arrow">→</span>
    <div class="pipe-node highlight">Dashboard<br/><span style="font-size:.65rem;">p-value, CI, lift</span></div>
  </div>
</div>

---

{: class="marginalia" }
**The "peeking problem"<br/>has caused many teams<br/>to ship regressions.<br/>A team sees "p=0.04"<br/>after 3 days and ships<br/>— not realizing it was<br/>a statistical fluke.<br/>Netflix's experiment<br/>platform uses<br/>sequential testing<br/>specifically to prevent<br/>premature decisions.**

## Key Takeaways for the Interview

When an interviewer asks *"design an A/B testing platform"*, they are probing for these specific insights:

1. **No I/O on the assignment hot path.** `murmur3(userId + experimentId) % 100` — that's the entire algorithm. No database, no cache read. This is the single most important insight.

2. **In-memory flag evaluation.** App servers hold all 10,000 flags in RAM (100 MB). Flags are refreshed every 30 seconds via background poll. Zero latency on the request path.

3. **Separate control plane from data plane.** Flag definition and editing (low traffic, strong consistency) is PostgreSQL. Flag evaluation (5 M/sec, pure compute) never touches the database.

4. **Kafka + ClickHouse for metrics.** Event write throughput (50 B/day) requires a queue. ClickHouse is the only mainstream database that can aggregate billions of events in under a second.

5. **The peeking problem is a real problem.** Don't just say "compute a p-value." Explain sequential testing (mSPRT) or Bayesian posteriors, and *why* naive Z-tests with optional stopping are broken.

6. **Layer architecture for mutual exclusion.** With 10,000 experiments, interaction effects are real. Experiments in the same dimension (UI, ranking, pricing) must be in the same layer and therefore mutually exclusive.

---

{: class="marginalia" }
**Google runs ~10,000<br/>live search experiments<br/>at any time. Their<br/>"layered" experiment<br/>design allows stacking:<br/>one experiment tests<br/>ranking algorithm,<br/>another tests UI layout,<br/>another tests ad format.<br/>Layers minimize<br/>interaction effects.**

*Happy shipping — and may your p-values always be valid.*

---

<script>
/* ─── MurmurHash3 (32-bit, pure JS) ─────────────────────────── */
function murmur3(str) {
  var seed = 0xdeadbeef;
  var h = seed;
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    h = Math.imul(h ^ c, 0x9e3779b9);
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0);
}

function abAssign(userId, experimentId, split) {
  var hash = murmur3(userId + ":" + experimentId) % 100;
  return { hash: hash, variant: hash < split ? "treatment" : "control" };
}

function abSimulate() {
  var uid   = document.getElementById("ab-userid").value || "user_1";
  var eid   = document.getElementById("ab-expid").value  || "exp_1";
  var split = parseInt(document.getElementById("ab-split").value, 10);
  document.getElementById("ab-split-val").textContent = split + "%";
  var r = abAssign(uid, eid, split);
  var variantColor = r.variant === "treatment" ? "#7bcdab" : "rgba(255,255,255,.55)";
  document.getElementById("ab-single-result").innerHTML =
    "<span class=\"rb-label\">Result</span><br/>" +
    "Hash bucket: <code style=\"color:#fbef8a\">" + r.hash + "</code> &nbsp;|&nbsp; " +
    "Variant: <strong style=\"color:" + variantColor + ";font-size:1rem\">" + r.variant.toUpperCase() + "</strong>" +
    "<br/><span style=\"font-size:.75rem;color:rgba(255,255,255,.4)\">" +
    "Bucket " + r.hash + " is " + (r.hash < split ? "below" : "at or above") + " split threshold " + split + "</span>";
}

function abGenerate100() {
  var eid   = document.getElementById("ab-expid").value || "exp_1";
  var split = parseInt(document.getElementById("ab-split").value, 10);
  var ctrl = 0, trt = 0;
  var cells = "";
  for (var i = 0; i < 100; i++) {
    var uid = "user_" + i;
    var r = abAssign(uid, eid, split);
    if (r.variant === "treatment") { trt++; cells += "<div class=\"hash-cell trt\" title=\"" + uid + " → " + r.hash + "\">" + r.hash + "</div>"; }
    else { ctrl++; cells += "<div class=\"hash-cell ctrl\" title=\"" + uid + " → " + r.hash + "\">" + r.hash + "</div>"; }
  }
  var wrap = document.getElementById("ab-dist-wrap");
  wrap.style.display = "block";
  document.getElementById("ab-ctrl-bar").style.width = ctrl + "%";
  document.getElementById("ab-trt-bar").style.width  = trt + "%";
  document.getElementById("ab-ctrl-num").textContent = ctrl;
  document.getElementById("ab-trt-num").textContent  = trt;
  document.getElementById("ab-hash-cells").innerHTML = cells;
}

/* ─── Normal distribution approximation (Abramowitz & Stegun) ── */
function normCDF(z) {
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  var p = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  return z >= 0 ? p : 1 - p;
}

function sigCalc() {
  var Nc = parseFloat(document.getElementById("sc-nc").value) || 0;
  var kc = parseFloat(document.getElementById("sc-kc").value) || 0;
  var Nt = parseFloat(document.getElementById("sc-nt").value) || 0;
  var kt = parseFloat(document.getElementById("sc-kt").value) || 0;
  var daily = parseFloat(document.getElementById("sc-daily").value) || 0;

  if (Nc < 2 || Nt < 2 || kc < 0 || kt < 0) {
    document.getElementById("sc-result").innerHTML = "<span class=\"rb-label\">Result</span><br/>Enter valid visitor and conversion counts.";
    return;
  }
  kc = Math.min(kc, Nc); kt = Math.min(kt, Nt);

  var pc = kc / Nc;
  var pt = kt / Nt;
  var lift = pc > 0 ? ((pt - pc) / pc * 100) : 0;

  var p  = (kc + kt) / (Nc + Nt);
  var se = Math.sqrt(p * (1 - p) * (1/Nc + 1/Nt));
  var z  = se > 0 ? (pt - pc) / se : 0;
  var pVal = 2 * (1 - normCDF(Math.abs(z)));

  var ciSe = Math.sqrt(pt * (1-pt) / Nt);
  var ciLo = (pt - 1.96 * ciSe) * 100;
  var ciHi = (pt + 1.96 * ciSe) * 100;

  var sig = pVal < 0.05;
  var sigLabel = sig
    ? "<span class=\"rb-sig\">&#x1F7E2; Statistically significant at 95% confidence</span>"
    : "<span class=\"rb-notsig\">&#x1F7E1; Not yet significant (p = " + pVal.toFixed(4) + ")</span>";

  /* Days-to-significance estimate: double current sample sizes until significant */
  var daysEst = "—";
  if (!sig && daily > 0 && se > 0) {
    for (var d = 1; d <= 365; d++) {
      var totalN = Nc + Nt + daily * d;
      var ratio = totalN / (Nc + Nt);
      var eNc = Nc * ratio / 2, eNt = Nt * ratio / 2;
      var ep = (kc + kt) / (eNc + eNt);
      var ese = Math.sqrt(ep * (1-ep) * (1/eNc + 1/eNt));
      var ez = ese > 0 ? (pt - pc) / ese : 0;
      if (2 * (1 - normCDF(Math.abs(ez))) < 0.05) { daysEst = d + " more day" + (d > 1 ? "s" : ""); break; }
    }
  }

  var needle = document.getElementById("sc-needle");
  var needlePct = Math.max(2, Math.min(98, (1 - pVal) * 100));
  needle.style.left = needlePct + "%";

  document.getElementById("sc-result").innerHTML =
    "<span class=\"rb-label\">Result</span><br/>" +
    "Control rate: <strong>" + (pc*100).toFixed(2) + "%</strong> &nbsp;|&nbsp; " +
    "Treatment rate: <strong>" + (pt*100).toFixed(2) + "%</strong><br/>" +
    "Relative lift: <strong style=\"color:" + (lift>=0?"#7bcdab":"#f08080") + "\">" + (lift>=0?"+":"") + lift.toFixed(1) + "%</strong> &nbsp;|&nbsp; " +
    "Z-score: <strong>" + z.toFixed(3) + "</strong> &nbsp;|&nbsp; " +
    "p-value: <strong>" + pVal.toFixed(4) + "</strong><br/>" +
    "95% CI for treatment: <strong>[" + ciLo.toFixed(2) + "%, " + ciHi.toFixed(2) + "%]</strong><br/>" +
    sigLabel + "<br/>" +
    (daysEst !== "—" ? "<span style=\"color:rgba(255,255,255,.5);font-size:.77rem;\">Estimated days to significance: " + daysEst + "</span>" : "");
}

/* ─── Copy button ────────────────────────────────────────────── */
function copyCode(btn) {
  var pre = btn.closest(".code-wrap").querySelector("pre.code-block");
  navigator.clipboard.writeText(pre.innerText || pre.textContent).then(function() {
    btn.textContent = "copied!";
    btn.classList.add("copied");
    setTimeout(function() { btn.textContent = "copy"; btn.classList.remove("copied"); }, 1800);
  });
}

/* ─── Init on load ───────────────────────────────────────────── */
(function() {
  abSimulate();
  sigCalc();
})();
</script>
