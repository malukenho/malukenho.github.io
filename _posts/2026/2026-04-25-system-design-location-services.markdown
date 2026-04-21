---
layout: post
title: "System Design: Location Services — How Uber Matches Drivers in Real-Time"
date: 2026-04-25 10:00:00 +0000
categories: ["post"]
tags: [system-design, geospatial, geohash, uber, real-time, interview]
series: "System Design Interview Series"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design Interview Prep &mdash; #11 of 15
</div>

{: class="marginalia" }
This question appears in<br/>almost every senior eng<br/>interview at Uber, Lyft,<br/>DoorDash, and Google<br/>Maps. Geohash + Redis<br/>GEO is the canonical<br/>answer — know it cold.

**The question:** *Design Uber's ride-matching system. Find the nearest available driver within 5 km, match in under 500 ms, handle 10 million drivers updating location every 5 seconds, serve globally.*

The deceptively hard part isn't finding nearby drivers — it's doing it at scale: **2 million location writes per second**, global distribution, and sub-500 ms end-to-end latency under bursty demand. This post walks every level of the solution, from a naive SQL query to the geohash + Redis architecture Uber actually uses.

---

<style>
/* ── Base ──────────────────────────────────────────────────── */
.series-badge {
  display: inline-flex; align-items: center; gap: .5rem;
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 20px;
  padding: 5px 14px; font-size: .75rem; color: rgba(255,255,255,.55);
  margin-bottom: 1.5rem;
}
.series-badge strong { color: #fbef8a; }

/* ── Marginalia ───────────────────────────────────────────── */
.marginalia {
  float: right; clear: right;
  width: 190px; margin: 0 0 1.2rem 1.4rem;
  padding: .7rem .9rem;
  border-left: 2px solid rgba(123,205,171,.4);
  font-size: 11.5px; line-height: 1.6;
  color: rgba(255,255,255,.45); font-style: italic;
  background: rgba(123,205,171,.04); border-radius: 0 6px 6px 0;
}

/* ── Code blocks ──────────────────────────────────────────── */
.code-wrap {
  position: relative; background: #111214;
  border: 1px solid #2e2f35; border-radius: 10px;
  overflow: hidden; margin: 1.2rem 0;
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
  font-family: "JetBrains Mono","Fira Code",monospace;
  font-size: 13px; line-height: 1.65;
  color: rgba(255,255,255,.85);
  background: transparent !important; border: none !important;
}
.kw  { color: #cc99cd; }
.ty  { color: #7bcdab; }
.st  { color: #f8c555; }
.cm  { color: rgba(255,255,255,.35); font-style: italic; }
.nm  { color: #fbef8a; }
.op  { color: rgba(255,255,255,.55); }
.nu  { color: #f08080; }

/* ── Section headings ─────────────────────────────────────── */
.loc-h2 {
  font-size: 1.25rem; font-weight: 700; color: #fbef8a;
  margin: 2.4rem 0 .8rem; border-bottom: 1px solid #2e2f35; padding-bottom: .4rem;
}
.loc-h3 { font-size: 1.05rem; font-weight: 700; color: #7bcdab; margin: 1.6rem 0 .6rem; }

/* ── Info boxes ───────────────────────────────────────────── */
.callout {
  background: rgba(123,205,171,.07); border: 1px solid rgba(123,205,171,.25);
  border-radius: 8px; padding: 1rem 1.2rem; margin: 1.2rem 0;
  font-size: .93rem; color: rgba(255,255,255,.8);
}
.callout strong { color: #7bcdab; }
.warn-box {
  background: rgba(251,239,138,.06); border: 1px solid rgba(251,239,138,.25);
  border-radius: 8px; padding: 1rem 1.2rem; margin: 1.2rem 0;
  font-size: .93rem; color: rgba(255,255,255,.8);
}
.warn-box strong { color: #fbef8a; }

/* ── Tables ───────────────────────────────────────────────── */
.loc-table { width: 100%; border-collapse: collapse; margin: 1.2rem 0; font-size: .88rem; }
.loc-table th {
  background: #1c1d22; color: #fbef8a; padding: 8px 12px;
  border: 1px solid #2e2f35; text-align: left; font-weight: 600;
}
.loc-table td { padding: 7px 12px; border: 1px solid #2e2f35; color: rgba(255,255,255,.75); }
.loc-table tr:nth-child(even) td { background: rgba(255,255,255,.02); }

/* ── Interactive boxes ────────────────────────────────────── */
.interactive-box {
  background: #111214; border: 1px solid #2e2f35; border-radius: 12px;
  padding: 1.2rem; margin: 1.4rem 0;
}
.interactive-box h4 {
  margin: 0 0 .9rem; color: #fbef8a; font-size: .92rem; font-weight: 700;
  letter-spacing: .04em; text-transform: uppercase;
}
.ibox-ctrl { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .8rem; }
.ibox-btn {
  background: #1e1f24; border: 1px solid #3a3b40; border-radius: 6px;
  color: rgba(255,255,255,.75); padding: 5px 14px; font-size: 13px;
  cursor: pointer; transition: all .2s; font-family: inherit;
}
.ibox-btn:hover { border-color: #7bcdab; color: #7bcdab; }
.ibox-btn.active { background: rgba(123,205,171,.15); border-color: #7bcdab; color: #7bcdab; }
.ibox-label { font-size: 12px; color: rgba(255,255,255,.45); }
.ibox-val { font-size: 12px; color: #fbef8a; font-weight: 700; min-width: 2rem; }
.ibox-info {
  background: #0e0f11; border: 1px solid #2e2f35; border-radius: 6px;
  padding: .6rem 1rem; font-size: 12px; color: rgba(255,255,255,.6);
  font-family: "JetBrains Mono","Fira Code",monospace; margin-top: .7rem;
  min-height: 2.4rem;
}

/* ── Geohash grid ─────────────────────────────────────────── */
.gh-grid-wrap { overflow-x: auto; }
.gh-world-grid {
  display: grid; gap: 3px; margin: .5rem auto;
  max-width: 600px;
}
.gh-cell {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-family: "JetBrains Mono","Fira Code",monospace;
  font-size: 12px; color: rgba(255,255,255,.65); cursor: pointer;
  transition: all .15s; aspect-ratio: 1; min-width: 32px; min-height: 24px;
  user-select: none; position: relative;
}
.gh-cell:hover { border-color: #7bcdab; color: #7bcdab; background: rgba(123,205,171,.08); }
.gh-cell.selected { border-color: #fbef8a; color: #fbef8a; background: rgba(251,239,138,.1); }
.gh-cell.neighbor { border-color: rgba(123,205,171,.7); background: rgba(123,205,171,.12); }
.gh-cell.driver-cell { border-color: #f08080; background: rgba(240,128,128,.15); }
.gh-cell.driver-neighbor { border-color: rgba(240,128,128,.5); background: rgba(240,128,128,.07); }
.gh-cell .driver-dot {
  position: absolute; top: 3px; right: 3px;
  width: 6px; height: 6px; border-radius: 50%; background: #f08080;
}

/* ── Precision table ──────────────────────────────────────── */
.prec-table { width: 100%; border-collapse: collapse; margin: .6rem 0; font-size: .82rem; }
.prec-table th { background: #1c1d22; color: #fbef8a; padding: 6px 10px; border: 1px solid #2e2f35; font-weight: 600; }
.prec-table td { padding: 5px 10px; border: 1px solid #2e2f35; color: rgba(255,255,255,.7); font-family: "JetBrains Mono","Fira Code",monospace; font-size: 11px; }
.prec-table tr.active-prec td { background: rgba(251,239,138,.08); color: #fbef8a; }

/* ── Quad tree canvas ─────────────────────────────────────── */
#qtCanvas { display: block; margin: 0 auto; cursor: crosshair; max-width: 100%; border-radius: 8px; }
#qtInfo { font-size: 12px; color: rgba(255,255,255,.5); text-align: center; margin-top: .5rem; }

/* ── Architecture diagram ─────────────────────────────────── */
.arch-diagram {
  background: #0e0f11; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.2rem; margin: 1.2rem 0; overflow-x: auto;
}
.arch-row { display: flex; gap: .8rem; align-items: center; justify-content: center; flex-wrap: wrap; margin: .5rem 0; }
.arch-node {
  background: #1a1b1f; border: 1px solid #3a3b40; border-radius: 8px;
  padding: .55rem 1rem; font-size: 12px; color: rgba(255,255,255,.75);
  cursor: pointer; transition: all .2s; text-align: center; min-width: 110px;
}
.arch-node:hover, .arch-node.active { border-color: #7bcdab; color: #fbef8a; background: rgba(123,205,171,.08); }
.arch-node .node-icon { font-size: 1.3rem; display: block; margin-bottom: .2rem; }
.arch-node .node-label { font-weight: 700; font-size: 11px; color: #7bcdab; }
.arch-arrow { color: rgba(255,255,255,.3); font-size: 1.1rem; align-self: center; }
.arch-detail {
  background: rgba(123,205,171,.06); border: 1px solid rgba(123,205,171,.2);
  border-radius: 8px; padding: .8rem 1rem; margin-top: .8rem;
  font-size: .85rem; color: rgba(255,255,255,.75); display: none;
}
.arch-detail.visible { display: block; }

/* ── Surge grid ───────────────────────────────────────────── */
.surge-grid {
  display: grid; grid-template-columns: repeat(8, 1fr);
  gap: 3px; max-width: 520px; margin: .5rem auto;
}
.surge-cell {
  border-radius: 4px; aspect-ratio: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; font-size: 10px;
  font-family: "JetBrains Mono","Fira Code",monospace; cursor: default;
  transition: background .4s, border-color .4s;
  border: 1px solid transparent; padding: 2px;
}
.surge-cell .surge-hash { color: rgba(255,255,255,.4); font-size: 9px; }
.surge-cell .surge-ratio { font-weight: 700; font-size: 11px; }

/* ── Matching demo canvas ─────────────────────────────────── */
#matchCanvas { display: block; margin: 0 auto; max-width: 100%; border-radius: 8px; cursor: default; }
#matchStatus {
  text-align: center; font-size: 13px; color: rgba(255,255,255,.6);
  margin-top: .6rem; min-height: 1.6rem; font-style: italic;
}

/* ── Pill badges ──────────────────────────────────────────── */
.badge {
  display: inline-block; background: rgba(123,205,171,.12);
  border: 1px solid rgba(123,205,171,.3); border-radius: 12px;
  padding: 1px 9px; font-size: .78rem; color: #7bcdab; font-weight: 600;
  margin: 0 2px;
}
.badge-y { background: rgba(251,239,138,.1); border-color: rgba(251,239,138,.3); color: #fbef8a; }
.badge-r { background: rgba(240,128,128,.1); border-color: rgba(240,128,128,.3); color: #f08080; }
</style>

<div class="loc-h2">1. The Problem</div>

Scale the numbers first:

<table class="loc-table">
<thead><tr><th>Metric</th><th>Value</th><th>Implication</th></tr></thead>
<tbody>
<tr><td>Active drivers</td><td>10 million</td><td>Each holds a position record in memory</td></tr>
<tr><td>Location update interval</td><td>Every 5 seconds</td><td>10M ÷ 5s = <strong>2 million writes/sec</strong></td></tr>
<tr><td>Ride requests</td><td>~1 million/hour</td><td>~278 read queries/sec — actually modest</td></tr>
<tr><td>Search radius</td><td>5 km</td><td>In NYC that's ~100+ drivers in the polygon</td></tr>
<tr><td>End-to-end latency SLA</td><td>&lt; 500 ms</td><td>Location lookup + ETA calc + offer delivery</td></tr>
<tr><td>Coverage</td><td>Global</td><td>Multi-region with data locality</td></tr>
</tbody>
</table>

The write storm — **2 million location writes per second** — is the core challenge. Reads are comparatively light. Any solution that can't absorb those writes at millisecond latency fails immediately.

<div class="loc-h2">2. Level 1 — Naive SQL Radius Query</div>

The first instinct is a SQL query using the Haversine formula:

<div class="code-wrap">
<div class="code-lang">SQL<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">SELECT</span> id, lat, lng,
  (<span class="nu">6371</span> * <span class="nm">acos</span>(
    <span class="nm">cos</span>(<span class="nm">radians</span>(<span class="st">?</span>)) * <span class="nm">cos</span>(<span class="nm">radians</span>(lat))
    * <span class="nm">cos</span>(<span class="nm">radians</span>(lng) - <span class="nm">radians</span>(<span class="st">?</span>))
    + <span class="nm">sin</span>(<span class="nm">radians</span>(<span class="st">?</span>)) * <span class="nm">sin</span>(<span class="nm">radians</span>(lat))
  )) <span class="kw">AS</span> distance
<span class="kw">FROM</span> drivers
<span class="kw">WHERE</span> available = <span class="nu">1</span>
<span class="kw">HAVING</span> distance &lt; <span class="nu">5</span>
<span class="kw">ORDER BY</span> distance
<span class="kw">LIMIT</span> <span class="nu">10</span>;</pre>
</div>

This works perfectly at hundreds of drivers. At 10 million active drivers with 2 million writes per second, it's a disaster: **full table scan on every request**, `HAVING` filters applied after reading every row, trigonometric functions on every row, and the write rate alone saturates any relational database.

<div class="loc-h2">3. Level 2 — Bounding Box Optimization</div>

Instead of computing Haversine distance on every row, first narrow candidates with a cheap bounding box filter:

<div class="code-wrap">
<div class="code-lang">SQL<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">-- Pre-compute bounding box on application side</span>
<span class="cm">-- lat ± delta_lat, lng ± delta_lng (delta ≈ 0.045° per 5 km)</span>
<span class="kw">SELECT</span> id, lat, lng
<span class="kw">FROM</span> drivers
<span class="kw">WHERE</span> available = <span class="nu">1</span>
  <span class="kw">AND</span> lat <span class="kw">BETWEEN</span> <span class="st">?</span> <span class="kw">AND</span> <span class="st">?</span>
  <span class="kw">AND</span> lng <span class="kw">BETWEEN</span> <span class="st">?</span> <span class="kw">AND</span> <span class="st">?</span>
<span class="cm">-- Then apply Haversine only on this small result set</span></pre>
</div>

Add a composite spatial index on `(lat, lng)` — B-tree or R-tree. PostgreSQL's PostGIS uses exactly this approach. Better, but two problems remain: in dense areas the bounding box still returns thousands of candidates, and 2 million writes per second will saturate any relational write path via WAL overhead and index maintenance. We need something fundamentally different for the location data.

<div class="loc-h2">4. Level 3 — Geohashing</div>

{: class="marginalia" }
Geohash is elegant because<br/>it turns a 2D spatial<br/>problem into a 1D string<br/>prefix problem — and<br/>databases are <em>very</em> good<br/>at prefix queries.

Geohash encodes any (lat, lng) coordinate as a short string by **recursively bisecting** the world into a grid. Each additional character doubles precision in both dimensions. The magic: **nearby locations share the same prefix** (most of the time), so a spatial query becomes a string prefix query: `WHERE geohash LIKE 'u4pruy%'`.

**How encoding works:**
1. Start with lat range [−90, 90] and lng range [−180, 180]
2. Interleave bits: even bits bisect longitude, odd bits bisect latitude
3. Group every 5 bits into one base32 character (alphabet: `0123456789bcdefghjkmnpqrstuvwxyz`)
4. Longer hash = finer precision

**Precision table:**

<table class="prec-table" id="precTable">
<thead><tr><th>#</th><th>Cell size</th><th>Example</th><th>Use case</th></tr></thead>
<tbody>
<tr><td>1</td><td>≈ 5,000 × 5,000 km</td><td><code>u</code></td><td>Continent</td></tr>
<tr><td>2</td><td>≈ 1,250 × 625 km</td><td><code>u4</code></td><td>Country</td></tr>
<tr><td>3</td><td>≈ 156 × 156 km</td><td><code>u4p</code></td><td>State</td></tr>
<tr><td>4</td><td>≈ 39 × 20 km</td><td><code>u4pr</code></td><td>City</td></tr>
<tr><td>5</td><td>≈ 4.9 × 4.9 km</td><td><code>u4pru</code></td><td>Ride pickup zone</td></tr>
<tr><td>6</td><td>≈ 1.2 × 0.6 km</td><td><code>u4pruy</code></td><td>Street block</td></tr>
<tr><td>7</td><td>≈ 153 × 153 m</td><td><code>u4pruyd</code></td><td>Building</td></tr>
<tr><td>8</td><td>≈ 38 × 19 m</td><td><code>u4pruydp</code></td><td>Parking spot</td></tr>
</tbody>
</table>

**Interactive Geohash Explorer** — click any cell on the world grid to zoom into its sub-cells. Click "Place Driver" then click a cell to drop a driver and watch its geohash update as you change the precision slider.

<div class="interactive-box">
<h4>&#127758; Geohash Grid Explorer</h4>
<div class="ibox-ctrl">
  <button class="ibox-btn" id="ghZoomOut" onclick="ghGoLevel1()" disabled>&#8593; World View</button>
  <button class="ibox-btn" id="ghPlaceMode" onclick="ghTogglePlace()">&#128663; Place Driver</button>
  <button class="ibox-btn" onclick="ghClearDriver()">Clear Driver</button>
  <span class="ibox-label">Precision:</span>
  <input type="range" id="ghPrec" min="1" max="8" value="5" style="width:100px;" oninput="ghUpdatePrec(this.value)">
  <span class="ibox-val" id="ghPrecVal">5</span>
</div>
<div class="gh-grid-wrap">
  <div class="gh-world-grid" id="ghGrid" style="grid-template-columns: repeat(8, 1fr);"></div>
</div>
<div class="ibox-info" id="ghInfo">Click a cell to zoom into its geohash sub-cells. Neighbours are highlighted in teal.</div>
</div>

**The boundary problem:** A driver near a cell border will fall in a different cell than a nearby rider. Solution: **always query the 8 neighbouring cells** in addition to the rider's own cell. The grid above highlights these neighbours automatically.

<div class="loc-h2">5. Level 4 — Geohash Storage in Redis</div>

{: class="marginalia" }
Uber uses S2 geometry<br/>(from Google) in production<br/>— more accurate than<br/>geohash at cell boundaries<br/>— but geohash is perfect<br/>for interviews and gets<br/>you full marks.

Redis is the natural home for location data: **in-memory, sub-millisecond reads/writes, built-in GEO data structure**. Each geohash cell becomes a Redis sorted set key holding driver IDs. Redis GEO commands internally encode (lat, lng) as geohash and store in a sorted set.

<div class="code-wrap">
<div class="code-lang">Redis CLI<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Driver updates location — atomic: remove old, add new</span>
<span class="kw">ZREM</span> <span class="st">drivers:u4prue</span> <span class="nm">driver:42</span>          <span class="cm"># remove from old geohash</span>
<span class="kw">GEOADD</span> <span class="st">drivers:city:london</span> <span class="nu">-0.1276</span> <span class="nu">51.5074</span> <span class="nm">driver:42</span>

<span class="cm"># Rider requests ride — query own cell + 8 neighbours</span>
<span class="kw">GEORADIUS</span> <span class="st">drivers:city:london</span> <span class="nu">-0.1276</span> <span class="nu">51.5074</span> <span class="nu">5</span> <span class="nm">km</span>
  <span class="nm">WITHCOORD</span> <span class="nm">WITHDIST</span> <span class="nm">ASC</span> <span class="nm">COUNT</span> <span class="nu">20</span>

<span class="cm"># Check distance between two points</span>
<span class="kw">GEODIST</span> <span class="st">drivers:city:london</span> <span class="nm">driver:42</span> <span class="nm">driver:99</span> <span class="nm">km</span>

<span class="cm"># Get geohash string for a driver (precision 6)</span>
<span class="kw">GEOHASH</span> <span class="st">drivers:city:london</span> <span class="nm">driver:42</span>
<span class="cm"># → "gcpvhep"</span>

<span class="cm"># For the write storm: pipeline multiple updates</span>
<span class="kw">PIPELINE</span>
  <span class="kw">GEOADD</span> <span class="st">drivers:city:london</span> <span class="nu">-0.128</span> <span class="nu">51.507</span> <span class="nm">driver:42</span>
  <span class="kw">GEOADD</span> <span class="st">drivers:city:london</span> <span class="nu">-0.135</span> <span class="nu">51.512</span> <span class="nm">driver:99</span>
  <span class="kw">GEOADD</span> <span class="st">drivers:city:london</span> <span class="nu">-0.121</span> <span class="nu">51.503</span> <span class="nm">driver:7</span>
<span class="kw">EXEC</span></pre>
</div>

**Driver update flow:**
1. Driver app detects GPS change > 50 m → sends update to Location Service via WebSocket
2. Location Service calls `GEOADD city:geohash_key lng lat driver_id` in Redis
3. Old geohash entry is automatically overwritten (sorted set member is unique by name)

**Rider lookup flow:**
1. Rider taps "Request" → Matching Service receives (lat, lng, radius=5km)
2. `GEORADIUS` returns up to 20 nearest available drivers with distances, sorted by proximity
3. Matching Service ranks by ETA (calls Maps API for road distance on top 5 candidates)
4. Sends offer to best driver via WebSocket push

<div class="loc-h2">6. Level 5 — Quad Tree</div>

Geohash divides the world into uniform rectangular cells. **Quad trees** divide space adaptively: each node splits into 4 quadrants recursively until each leaf contains ≤ K points (e.g. K = 100). This gives dense coverage in cities (deep tree) and sparse coverage in rural areas (shallow tree), with constant lookup time proportional to tree depth rather than area.

**Interactive Quad Tree Builder** — click to place driver dots, then click "Build Quad Tree" to watch it subdivide. Capacity K controls when a cell splits.

<div class="interactive-box">
<h4>&#9632; Quad Tree Builder</h4>
<div class="ibox-ctrl">
  <span class="ibox-label">Capacity K:</span>
  <input type="range" id="qtK" min="1" max="10" value="4" style="width:80px;" oninput="document.getElementById('qtKVal').textContent=this.value">
  <span class="ibox-val" id="qtKVal">4</span>
  <button class="ibox-btn" onclick="qtBuild()">Build Quad Tree</button>
  <button class="ibox-btn" onclick="qtClear()">Clear</button>
</div>
<canvas id="qtCanvas" width="520" height="360"></canvas>
<div id="qtInfo">Click on the canvas to place drivers, then build the quad tree.</div>
</div>

**Quad tree vs geohash:**

<table class="loc-table">
<thead><tr><th>Property</th><th>Geohash</th><th>Quad Tree</th></tr></thead>
<tbody>
<tr><td>Cell size</td><td>Uniform per level</td><td>Adaptive to density</td></tr>
<tr><td>Storage</td><td>String key in Redis</td><td>In-memory tree structure</td></tr>
<tr><td>Update cost</td><td>O(1) — just change key</td><td>O(log n) — may need rebalancing</td></tr>
<tr><td>Range query</td><td>Prefix scan + 9 cells</td><td>Tree traversal</td></tr>
<tr><td>Boundary problem</td><td>Yes — check neighbours</td><td>Yes — check sibling nodes</td></tr>
<tr><td>Used by</td><td>Redis GEO, DynamoDB</td><td>PostGIS, game engines</td></tr>
</tbody>
</table>

<div class="loc-h2">7. Level 6 — Real-Time Matching Architecture</div>

Click any component in the diagram below to see its role in detail.

<div class="arch-diagram">
<div class="arch-row">
  <div class="arch-node" onclick="archShow('driver-app')"><span class="node-icon">&#128663;</span><div class="node-label">Driver App</div></div>
  <span class="arch-arrow">&#8594;</span>
  <div class="arch-node" onclick="archShow('ws-server')"><span class="node-icon">&#128268;</span><div class="node-label">WebSocket<br/>Gateway</div></div>
  <span class="arch-arrow">&#8594;</span>
  <div class="arch-node" onclick="archShow('loc-service')"><span class="node-icon">&#128205;</span><div class="node-label">Location<br/>Service</div></div>
  <span class="arch-arrow">&#8594;</span>
  <div class="arch-node" onclick="archShow('redis-geo')"><span class="node-icon">&#128190;</span><div class="node-label">Redis GEO<br/>Cluster</div></div>
</div>
<div class="arch-row" style="margin-top:.2rem;">
  <div class="arch-node" onclick="archShow('rider-app')"><span class="node-icon">&#128104;</span><div class="node-label">Rider App</div></div>
  <span class="arch-arrow">&#8594;</span>
  <div class="arch-node" onclick="archShow('request-svc')"><span class="node-icon">&#128221;</span><div class="node-label">Ride Request<br/>Service</div></div>
  <span class="arch-arrow">&#8594;</span>
  <div class="arch-node" onclick="archShow('match-svc')"><span class="node-icon">&#9889;</span><div class="node-label">Matching<br/>Service</div></div>
  <span class="arch-arrow">&#8594;</span>
  <div class="arch-node" onclick="archShow('maps-api')"><span class="node-icon">&#127968;</span><div class="node-label">Maps API<br/>(ETA)</div></div>
</div>
<div class="arch-detail" id="arch-driver-app"><strong>Driver App:</strong> Polls GPS every 1 s, applies 50 m filter client-side. Sends diffs only when threshold exceeded. Keeps persistent WebSocket connection to gateway. Handles offer delivery and accept/reject response.</div>
<div class="arch-detail" id="arch-ws-server"><strong>WebSocket Gateway:</strong> Maintains 10 M+ concurrent connections. Horizontally scaled, stateless (connection state in Redis). Routes location updates to Location Service, delivers match offers back to drivers. Uses sticky sessions for connection affinity.</div>
<div class="arch-detail" id="arch-loc-service"><strong>Location Service:</strong> Receives location updates, validates, writes to Redis GEO with pipelining. Batches updates within 100 ms windows. Shards by city/geohash prefix. Updates driver availability index. Target: &lt;10 ms per update end-to-end.</div>
<div class="arch-detail" id="arch-redis-geo"><strong>Redis GEO Cluster:</strong> One Redis node per major city (sharded by geohash prefix). GEOADD for writes (~sub-ms). GEORADIUS for reads (~1–3 ms for 5 km radius). Total RAM: ~500 MB for 10 M drivers. Replicated with Redis Sentinel for HA.</div>
<div class="arch-detail" id="arch-rider-app"><strong>Rider App:</strong> Sends ride request with pickup coordinates. Receives real-time driver position updates on map. Streams ETA updates every 10 s during trip. Handles offer acceptance, cancellation, and surge pricing display.</div>
<div class="arch-detail" id="arch-request-svc"><strong>Ride Request Service:</strong> Validates rider request, checks for surge pricing in zone, creates ride record in DB (Cassandra), forwards to Matching Service. Handles idempotency (no double bookings).</div>
<div class="arch-detail" id="arch-match-svc"><strong>Matching Service:</strong> Queries Redis GEO for nearest 20 drivers. Filters by availability and vehicle type. Calls Maps API for road ETA on top 5. Ranks by ETA + rating + acceptance rate. Sends offer via WebSocket. If rejected: offer next driver (up to 3 attempts in 30 s).</div>
<div class="arch-detail" id="arch-maps-api"><strong>Maps API (ETA):</strong> Returns road-distance ETA for driver-to-pickup. Results cached aggressively (5 min TTL per route segment). Falls back to straight-line × 1.3 multiplier on cache miss. Target: &lt;50 ms for cached, &lt;200 ms uncached.</div>
</div>

<div class="loc-h2">8. Level 7 — Handling the Write Storm</div>

2 million location writes per second is non-trivial. Four optimizations, ordered by impact:

**Optimization 1 — Client-side movement filter (saves ~60%)**

<div class="code-wrap">
<div class="code-lang">Swift / Kotlin (pseudo)<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">val</span> <span class="nm">MIN_DISTANCE_METERS</span> = <span class="nu">50.0</span>
<span class="kw">var</span> <span class="nm">lastSentLocation</span>: Location? = <span class="kw">null</span>

<span class="kw">fun</span> <span class="nm">onGpsUpdate</span>(newLoc: Location) {
  <span class="kw">if</span> (lastSentLocation == <span class="kw">null</span> ||
      newLoc.distanceTo(lastSentLocation!!) > MIN_DISTANCE_METERS) {
    sendLocationUpdate(newLoc)   <span class="cm">// only send if moved > 50 m</span>
    lastSentLocation = newLoc
  }
  <span class="cm">// otherwise discard silently — cheapest server call is none at all</span>
}</pre>
</div>

{: class="marginalia" }
The "50 metres moved" filter<br/>on the driver app saves<br/>~60% of location updates<br/>— the cheapest optimisation<br/>is the one that prevents<br/>the write from happening<br/>at all.

**Optimization 2 — Redis pipelining (batches multiple writes in one round-trip)**

<div class="code-wrap">
<div class="code-lang">Python<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">flush_location_batch</span>(updates):
  pipe = redis.pipeline(transaction=<span class="kw">False</span>)
  <span class="kw">for</span> driver_id, lat, lng <span class="kw">in</span> updates:
    city_key = <span class="st">"drivers:"</span> + get_city(lat, lng)
    pipe.geoadd(city_key, [lng, lat, driver_id])
  pipe.execute()  <span class="cm"># one network round-trip for all updates</span></pre>
</div>

**Optimization 3 — Shard Redis by city / geohash prefix**

<div class="code-wrap">
<div class="code-lang">Config<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Redis Cluster: consistent hashing across shards</span>
<span class="nm">shard-0</span>: <span class="st">drivers:london</span>, <span class="st">drivers:paris</span>, <span class="st">drivers:berlin</span>
<span class="nm">shard-1</span>: <span class="st">drivers:nyc</span>,    <span class="st">drivers:boston</span>,  <span class="st">drivers:dc</span>
<span class="nm">shard-2</span>: <span class="st">drivers:sf</span>,     <span class="st">drivers:la</span>,      <span class="st">drivers:seattle</span>
<span class="nm">shard-3</span>: <span class="st">drivers:tokyo</span>,  <span class="st">drivers:osaka</span>,   <span class="st">drivers:seoul</span>
<span class="cm"># → each shard handles ~500k writes/sec — well within Redis limits</span></pre>
</div>

**Optimization 4 — Dead zone suppression**

Drivers in slow traffic or at stop lights barely move. Track the last-sent geohash and skip writes entirely if the driver is still in the same precision-6 cell (~1.2 km × 0.6 km). For Uber this suppresses an additional 20–30% of writes during rush-hour gridlock.

<div class="loc-h2">9. Level 8 — Surge Pricing Zones</div>

Surge pricing is a direct consequence of geospatial aggregation: divide the city into geohash zones, count active riders vs available drivers per zone in real time, and compute a multiplier when supply is short.

<div class="code-wrap">
<div class="code-lang">Python<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">compute_surge</span>(geohash_prefix: str) -> float:
  zone_key = <span class="st">"zone:"</span> + geohash_prefix
  riders   = redis.get(zone_key + <span class="st">":riders"</span>)    <span class="cm"># active ride requests</span>
  drivers  = redis.zcard(<span class="st">"drivers:"</span> + geohash_prefix)  <span class="cm"># available drivers</span>

  <span class="kw">if</span> drivers == <span class="nu">0</span>: <span class="kw">return</span> <span class="nu">3.0</span>     <span class="cm"># no drivers → max surge</span>
  ratio = riders / drivers

  <span class="kw">if</span>   ratio &lt; <span class="nu">1.0</span>: <span class="kw">return</span> <span class="nu">1.0</span>    <span class="cm"># normal</span>
  <span class="kw">elif</span> ratio &lt; <span class="nu">2.0</span>: <span class="kw">return</span> <span class="nu">1.5</span>    <span class="cm"># mild surge</span>
  <span class="kw">elif</span> ratio &lt; <span class="nu">3.5</span>: <span class="kw">return</span> <span class="nu">2.0</span>    <span class="cm"># surge</span>
  <span class="kw">else</span>:             <span class="kw">return</span> <span class="nu">3.0</span>    <span class="cm"># high surge</span></pre>
</div>

**Live Surge Map** — click "Simulate Rush Hour" to see demand spike in city centre. Each zone shows rider/driver ratio and surge multiplier.

<div class="interactive-box">
<h4>&#9889; Surge Pricing Zone Map</h4>
<div class="ibox-ctrl">
  <button class="ibox-btn" onclick="surgeSimulate('normal')">Normal</button>
  <button class="ibox-btn" onclick="surgeSimulate('rush')">Simulate Rush Hour</button>
  <button class="ibox-btn" onclick="surgeSimulate('event')">Simulate Stadium Event</button>
  <button class="ibox-btn" onclick="surgeRandom()">Randomise</button>
</div>
<div class="surge-grid" id="surgeGrid"></div>
<div class="ibox-info" id="surgeInfo">Zones are geohash precision-5 cells (~5 km). Green = normal, amber = 1.5×, orange = 2×, red = 3× surge.</div>
</div>

<div class="loc-h2">10. Full Ride Matching Demo</div>

Watch the complete matching pipeline in action: five drivers move around the city in real time. Click "Request Ride" then click anywhere on the grid to drop a ride request — the system highlights the geohash cells, finds the nearest driver, and animates the match.

<div class="interactive-box">
<h4>&#127950; Live Ride Matching Simulator</h4>
<div class="ibox-ctrl">
  <button class="ibox-btn" id="matchReqBtn" onclick="matchStartRequest()">&#128205; Request Ride</button>
  <button class="ibox-btn" onclick="matchReset()">Reset</button>
  <span class="ibox-label" id="matchModeLabel"></span>
</div>
<canvas id="matchCanvas" width="520" height="380"></canvas>
<div id="matchStatus">Drivers moving in real time. Click "Request Ride" to begin.</div>
</div>

<div class="loc-h2">11. Capacity Estimation</div>

<table class="loc-table">
<thead><tr><th>Component</th><th>Calculation</th><th>Result</th></tr></thead>
<tbody>
<tr><td>Location write throughput</td><td>10M drivers × 200 B per update ÷ 5 s</td><td><strong>400 MB/s</strong> sustained</td></tr>
<tr><td>Redis GEO memory</td><td>10M drivers × ~50 B per GEO entry</td><td><strong>~500 MB</strong> — fits in one instance</td></tr>
<tr><td>Ride request read load</td><td>1M requests/hr = 278/s, each queries 9 cells</td><td>2,500 Redis ops/s — trivial</td></tr>
<tr><td>WebSocket connections</td><td>10M drivers + 5M active riders</td><td>15M connections, ~50 gateway servers at 300k/each</td></tr>
<tr><td>Geohash index size</td><td>10M entries × 12 B (hash + ID)</td><td>120 MB per precision level</td></tr>
<tr><td>Redis shards needed</td><td>500k writes/s per shard, 2M total</td><td><strong>4–8 Redis nodes</strong> for writes</td></tr>
<tr><td>Maps API calls</td><td>278 ride requests/s × 5 ETA checks</td><td>1,390 Maps API calls/s — cache aggressively</td></tr>
</tbody>
</table>

<div class="warn-box">
<strong>The counter-intuitive result:</strong> reads are easy (only 278 ride requests/sec), writes are hard (2M location updates/sec). Design around the write path. Redis with pipelining handles ~1M SET ops/sec per node — you need 2–4 nodes for the write load alone, then add replicas for HA.
</div>

<div class="loc-h2">12. Interview Cheat Sheet</div>

Hit these points in order when answering in an interview:

1. **Quantify the write storm first** — 10M drivers × 1/5s = 2M writes/sec. This disqualifies SQL immediately.
2. **Explain why geohash** — turns 2D spatial into 1D string prefix; databases love prefix queries.
3. **Name the boundary problem** — and explain the 9-cell (own + 8 neighbours) solution.
4. **Redis GEO** — GEOADD, GEORADIUS, GEOHASH. In-memory, sub-ms, ~500 MB for 10M drivers.
5. **Write optimisations in order** — client-side 50 m filter → pipelining → shard by city.
6. **ETA vs distance** — sort by straight-line first, call Maps API only on top 5 candidates.
7. **Mention S2** — Uber uses Google's S2 library in production; geohash is interview-correct but S2 handles polar distortion better.

<div class="callout">
<strong>Bonus points in interviews:</strong> explain the difference between geohash precision 5 (~5 km) for driver search and precision 6 (~600 m) for surge zone aggregation — they're deliberately different because the business problems are different. Surge needs fine-grained zones; driver search needs coarser ones to ensure enough candidates per cell.
</div>

---

*Next in the series: **#12 — Design a Distributed Message Queue** — Kafka internals, partitioning, consumer groups, and at-least-once vs exactly-once delivery.*

<script>
/* ============================================================
   UTILITIES
   ============================================================ */
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}

function archShow(id) {
  var all = document.querySelectorAll('.arch-detail');
  all.forEach(function(el) { el.classList.remove('visible'); });
  var nodes = document.querySelectorAll('.arch-node');
  nodes.forEach(function(el) { el.classList.remove('active'); });
  var target = document.getElementById('arch-' + id);
  if (target) target.classList.add('visible');
}

/* ============================================================
   GEOHASH UTILITIES
   ============================================================ */
var GH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function ghEncode(lat, lng, precision) {
  var idx = 0, bit = 0, evenBit = true, geohash = '';
  var latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  while (geohash.length < precision) {
    if (evenBit) {
      var lngMid = (lngMin + lngMax) / 2;
      if (lng >= lngMid) { idx = idx * 2 + 1; lngMin = lngMid; }
      else               { idx = idx * 2;     lngMax = lngMid; }
    } else {
      var latMid = (latMin + latMax) / 2;
      if (lat >= latMid) { idx = idx * 2 + 1; latMin = latMid; }
      else               { idx = idx * 2;     latMax = latMid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { geohash += GH_BASE32[idx]; bit = 0; idx = 0; }
  }
  return geohash;
}

function ghDecodeBounds(hash) {
  var evenBit = true;
  var latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  for (var i = 0; i < hash.length; i++) {
    var charIdx = GH_BASE32.indexOf(hash[i]);
    for (var bits = 4; bits >= 0; bits--) {
      var bitN = (charIdx >> bits) & 1;
      if (evenBit) {
        var lm2 = (lngMin + lngMax) / 2;
        if (bitN === 1) lngMin = lm2; else lngMax = lm2;
      } else {
        var la2 = (latMin + latMax) / 2;
        if (bitN === 1) latMin = la2; else latMax = la2;
      }
      evenBit = !evenBit;
    }
  }
  return { minLat: latMin, maxLat: latMax, minLng: lngMin, maxLng: lngMax };
}

function ghNeighbors(hash) {
  var b = ghDecodeBounds(hash);
  var clat = (b.minLat + b.maxLat) / 2;
  var clng = (b.minLng + b.maxLng) / 2;
  var dlat = b.maxLat - b.minLat;
  var dlng = b.maxLng - b.minLng;
  var prec = hash.length;
  var dirs = [
    { dlat: dlat,  dlng: 0    }, { dlat: dlat,  dlng: dlng  },
    { dlat: 0,     dlng: dlng }, { dlat: -dlat, dlng: dlng  },
    { dlat: -dlat, dlng: 0    }, { dlat: -dlat, dlng: -dlng },
    { dlat: 0,     dlng: -dlng}, { dlat: dlat,  dlng: -dlng }
  ];
  return dirs.map(function(d) {
    var nLat = Math.max(-90, Math.min(90, clat + d.dlat));
    var nLng = clng + d.dlng;
    while (nLng > 180) nLng -= 360;
    while (nLng < -180) nLng += 360;
    return ghEncode(nLat, nLng, prec);
  });
}

/* ============================================================
   GEOHASH VISUALIZER
   ============================================================ */
var ghState = {
  level: 1,
  parentHash: '',
  driverLat: null,
  driverLng: null,
  precision: 5,
  placing: false,
  currentHash: ''
};

function ghBuildLevel1() {
  var grid = [];
  for (var row = 0; row < 4; row++) {
    var gridRow = [];
    var lat = 90 - 45 * (row + 0.5);
    for (var col = 0; col < 8; col++) {
      var lng = -180 + 45 * (col + 0.5);
      gridRow.push({ hash: ghEncode(lat, lng, 1), lat: lat, lng: lng, row: row, col: col });
    }
    grid.push(gridRow);
  }
  return grid;
}

function ghBuildSubGrid(parentHash) {
  var b = ghDecodeBounds(parentHash);
  var level = parentHash.length;
  var isOdd = (level % 2 === 1);
  var cols = isOdd ? 4 : 8;
  var rows = isOdd ? 8 : 4;
  var latStep = (b.maxLat - b.minLat) / rows;
  var lngStep = (b.maxLng - b.minLng) / cols;
  var grid = [];
  for (var row = 0; row < rows; row++) {
    var gridRow = [];
    var lat = b.maxLat - latStep * (row + 0.5);
    for (var col = 0; col < cols; col++) {
      var lng = b.minLng + lngStep * (col + 0.5);
      var hash = ghEncode(lat, lng, level + 1);
      gridRow.push({ hash: hash, lat: lat, lng: lng, row: row, col: col });
    }
    grid.push(gridRow);
  }
  return { grid: grid, cols: cols, rows: rows };
}

function ghRenderGrid() {
  var container = document.getElementById('ghGrid');
  var data, cols;
  if (ghState.level === 1) {
    var l1 = ghBuildLevel1();
    data = l1; cols = 8;
  } else {
    var sub = ghBuildSubGrid(ghState.parentHash);
    data = sub.grid; cols = sub.cols;
  }

  var driverHash = '';
  if (ghState.driverLat !== null) {
    driverHash = ghEncode(ghState.driverLat, ghState.driverLng, ghState.level === 1 ? 1 : ghState.parentHash.length + 1);
  }
  var neighbors = driverHash ? ghNeighbors(driverHash) : [];
  var neighborSet = {};
  neighbors.forEach(function(h) { neighborSet[h] = true; });

  container.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  container.innerHTML = '';

  for (var r = 0; r < data.length; r++) {
    for (var c = 0; c < data[r].length; c++) {
      var cell = data[r][c];
      var el = document.createElement('div');
      el.className = 'gh-cell';
      el.textContent = cell.hash;
      el.title = cell.hash + ' (' + cell.lat.toFixed(1) + ', ' + cell.lng.toFixed(1) + ')';

      if (driverHash && cell.hash === driverHash) {
        el.classList.add('driver-cell');
        var dot = document.createElement('div');
        dot.className = 'driver-dot';
        el.appendChild(dot);
      } else if (neighborSet[cell.hash]) {
        el.classList.add('driver-neighbor');
      }

      (function(cellData) {
        el.addEventListener('click', function() { ghCellClick(cellData); });
      })(cell);
      container.appendChild(el);
    }
  }
}

function ghCellClick(cellData) {
  if (ghState.placing) {
    ghState.driverLat = cellData.lat;
    ghState.driverLng = cellData.lng;
    ghState.placing = false;
    document.getElementById('ghPlaceMode').classList.remove('active');
    ghUpdateInfo();
    ghRenderGrid();
    return;
  }
  if (ghState.level === 1) {
    ghState.level = 2;
    ghState.parentHash = cellData.hash;
    document.getElementById('ghZoomOut').disabled = false;
    ghUpdateInfo();
    ghRenderGrid();
  }
}

function ghGoLevel1() {
  ghState.level = 1;
  ghState.parentHash = '';
  document.getElementById('ghZoomOut').disabled = true;
  ghUpdateInfo();
  ghRenderGrid();
}

function ghTogglePlace() {
  ghState.placing = !ghState.placing;
  document.getElementById('ghPlaceMode').classList.toggle('active', ghState.placing);
}

function ghClearDriver() {
  ghState.driverLat = null;
  ghState.driverLng = null;
  ghState.placing = false;
  document.getElementById('ghPlaceMode').classList.remove('active');
  document.getElementById('ghInfo').textContent = 'Driver cleared. Click a cell to zoom, or Place Driver to add one.';
  ghRenderGrid();
}

function ghUpdatePrec(v) {
  ghState.precision = parseInt(v, 10);
  document.getElementById('ghPrecVal').textContent = v;
  var rows = document.querySelectorAll('#precTable tbody tr');
  rows.forEach(function(r, i) {
    r.classList.toggle('active-prec', i === parseInt(v, 10) - 1);
  });
  ghUpdateInfo();
}

function ghUpdateInfo() {
  var info = document.getElementById('ghInfo');
  if (ghState.driverLat !== null) {
    var hash = ghEncode(ghState.driverLat, ghState.driverLng, ghState.precision);
    var sizes = ['5000km','1250km','156km','40km','5km','1.2km','153m','38m'];
    var sz = sizes[Math.min(ghState.precision - 1, sizes.length - 1)];
    info.innerHTML = 'Driver geohash (precision ' + ghState.precision + '): <strong style="color:#fbef8a">' + hash + '</strong> &nbsp; cell size ~' + sz + ' &nbsp;|&nbsp; 8 neighbours highlighted';
  } else if (ghState.level === 2) {
    info.textContent = 'Showing sub-cells of "' + ghState.parentHash + '". Click "World View" to go back. Place a driver to see its geohash and neighbours.';
  } else {
    info.textContent = 'Click a cell to zoom into its sub-cells. Place a driver to see its geohash code.';
  }
}

/* ============================================================
   QUAD TREE
   ============================================================ */
var qtPoints = [];
var qtTree = null;
var qtCtx = null;
var qtW = 520, qtH = 360;

function QuadNode(x, y, w, h, cap) {
  this.x = x; this.y = y; this.w = w; this.h = h;
  this.cap = cap; this.pts = []; this.kids = null;
}
QuadNode.prototype.contains = function(p) {
  return p.x >= this.x && p.x < this.x + this.w && p.y >= this.y && p.y < this.y + this.h;
};
QuadNode.prototype.insert = function(p) {
  if (!this.contains(p)) return false;
  if (this.kids) {
    for (var i = 0; i < this.kids.length; i++) { if (this.kids[i].insert(p)) return true; }
    return false;
  }
  if (this.pts.length < this.cap) { this.pts.push(p); return true; }
  this.subdivide();
  for (var j = 0; j < this.kids.length; j++) { if (this.kids[j].insert(p)) break; }
  return true;
};
QuadNode.prototype.subdivide = function() {
  var hw = this.w / 2, hh = this.h / 2;
  this.kids = [
    new QuadNode(this.x,      this.y,      hw, hh, this.cap),
    new QuadNode(this.x + hw, this.y,      hw, hh, this.cap),
    new QuadNode(this.x,      this.y + hh, hw, hh, this.cap),
    new QuadNode(this.x + hw, this.y + hh, hw, hh, this.cap)
  ];
  for (var i = 0; i < this.pts.length; i++) {
    for (var j = 0; j < this.kids.length; j++) { if (this.kids[j].insert(this.pts[i])) break; }
  }
  this.pts = [];
};

function qtDrawNode(ctx, node, depth) {
  var hue = Math.min(depth * 25, 200);
  ctx.strokeStyle = 'rgba(123,' + (205 - depth * 15) + ',' + (171 - depth * 10) + ',0.6)';
  ctx.lineWidth = Math.max(0.5, 2 - depth * 0.35);
  ctx.strokeRect(node.x, node.y, node.w, node.h);
  if (node.kids) {
    node.kids.forEach(function(k) { qtDrawNode(ctx, k, depth + 1); });
  } else {
    node.pts.forEach(function(p) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#7bcdab'; ctx.fill();
    });
  }
}

function qtCountLeaves(node) {
  if (!node.kids) return 1;
  return node.kids.reduce(function(a, k) { return a + qtCountLeaves(k); }, 0);
}
function qtDepth(node) {
  if (!node.kids) return 0;
  return 1 + Math.max.apply(null, node.kids.map(qtDepth));
}

function qtRedraw() {
  var canvas = document.getElementById('qtCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, qtW, qtH);
  ctx.fillStyle = '#0e0f11';
  ctx.fillRect(0, 0, qtW, qtH);
  if (qtTree) {
    qtDrawNode(ctx, qtTree, 0);
    document.getElementById('qtInfo').textContent =
      qtPoints.length + ' drivers | depth: ' + qtDepth(qtTree) + ' | leaves: ' + qtCountLeaves(qtTree);
  } else {
    qtPoints.forEach(function(p) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#7bcdab'; ctx.fill();
    });
    if (qtPoints.length > 0) {
      document.getElementById('qtInfo').textContent = qtPoints.length + ' drivers placed. Click "Build Quad Tree" to see subdivisions.';
    }
  }
}

function qtBuild() {
  var k = parseInt(document.getElementById('qtK').value, 10);
  qtTree = new QuadNode(0, 0, qtW, qtH, k);
  qtPoints.forEach(function(p) { qtTree.insert(p); });
  qtRedraw();
}

function qtClear() {
  qtPoints = []; qtTree = null; qtRedraw();
  document.getElementById('qtInfo').textContent = 'Click on the canvas to place drivers, then build the quad tree.';
}

/* ============================================================
   SURGE PRICING
   ============================================================ */
var surgeData = [];

function surgeColor(ratio) {
  if (ratio < 1.0) return { bg: 'rgba(60,160,80,0.35)', border: 'rgba(60,200,80,0.5)',  label: '1.0x' };
  if (ratio < 2.0) return { bg: 'rgba(200,160,30,0.35)', border: 'rgba(230,190,50,0.6)', label: '1.5x' };
  if (ratio < 3.5) return { bg: 'rgba(220,100,20,0.4)',  border: 'rgba(240,120,30,0.7)', label: '2.0x' };
  return             { bg: 'rgba(200,40,40,0.45)',  border: 'rgba(230,60,60,0.8)',  label: '3.0x' };
}

function surgeHashes() {
  var hashes = [];
  var prefixes = ['gcpv', 'gcpu', 'gcpq', 'gcpr', 'gcpy', 'gcpw', 'gcpt', 'gcps',
                  'gcpm', 'gcpk', 'gcph', 'gcpj', 'gcpn', 'gcpp', 'gcpe', 'gcpg',
                  'gcpf', 'gcpc', 'gcpb', 'gcpd', 'gcpz', 'gcp9', 'gcp7', 'gcp6',
                  'gcp5', 'gcp4', 'gcp3', 'gcp2', 'gcp1', 'gcp0', 'gcnz', 'gcny',
                  'gcnx', 'gcnw', 'gcnv', 'gcnu', 'gcnt', 'gcns', 'gcnr', 'gcnq',
                  'gcnp', 'gcnn', 'gcnm', 'gcnk', 'gcnj', 'gcnh', 'gcng', 'gcnf'];
  return hashes.concat(prefixes).slice(0, 48);
}

function surgeRender() {
  var grid = document.getElementById('surgeGrid');
  grid.innerHTML = '';
  surgeData.forEach(function(d, i) {
    var c = surgeColor(d.ratio);
    var el = document.createElement('div');
    el.className = 'surge-cell';
    el.style.background = c.bg;
    el.style.borderColor = c.border;
    var hashSpan = document.createElement('div');
    hashSpan.className = 'surge-hash';
    hashSpan.textContent = surgeHashes()[i] || ('z' + i);
    var ratioSpan = document.createElement('div');
    ratioSpan.className = 'surge-ratio';
    ratioSpan.style.color = d.ratio >= 3.5 ? '#f08080' : (d.ratio >= 2.0 ? '#ffa07a' : (d.ratio >= 1.0 ? '#fbef8a' : '#7bcdab'));
    ratioSpan.textContent = c.label;
    el.appendChild(hashSpan);
    el.appendChild(ratioSpan);
    grid.appendChild(el);
  });
}

function surgeSimulate(mode) {
  surgeData = [];
  for (var i = 0; i < 48; i++) {
    var r, c;
    if (mode === 'normal') {
      r = 0.4 + Math.random() * 0.8;
    } else if (mode === 'rush') {
      var isCenter = (i >= 16 && i <= 31);
      r = isCenter ? 2.5 + Math.random() * 1.5 : 0.5 + Math.random() * 1.0;
    } else {
      var isStadium = (i >= 20 && i <= 27);
      r = isStadium ? 4.0 + Math.random() * 1.0 : 0.3 + Math.random() * 0.6;
    }
    surgeData.push({ ratio: r });
  }
  surgeRender();
}

function surgeRandom() {
  surgeData = [];
  for (var i = 0; i < 48; i++) {
    var vals = [0.3, 0.5, 0.7, 0.9, 1.2, 1.5, 1.8, 2.2, 3.0, 4.0];
    surgeData.push({ ratio: vals[Math.floor(Math.random() * vals.length)] });
  }
  surgeRender();
}

/* ============================================================
   RIDE MATCHING DEMO
   ============================================================ */
var matchState = {
  drivers: [], rider: null, requesting: false,
  matched: -1, phase: 'idle', animFrame: null,
  moveTimer: null, matchTimer: null, cellSize: 40
};

var MW = 520, MH = 380;
var MG_COLS = Math.floor(MW / matchState.cellSize);
var MG_ROWS = Math.floor(MH / matchState.cellSize);

function matchInitDrivers() {
  matchState.drivers = [];
  for (var i = 0; i < 5; i++) {
    matchState.drivers.push({
      x: (1 + Math.floor(Math.random() * (MG_COLS - 2))) * matchState.cellSize + matchState.cellSize / 2,
      y: (1 + Math.floor(Math.random() * (MG_ROWS - 2))) * matchState.cellSize + matchState.cellSize / 2,
      vx: (Math.random() - 0.5) * matchState.cellSize,
      vy: (Math.random() - 0.5) * matchState.cellSize,
      matched: false, color: '#4a9eff'
    });
  }
}

function matchMoveDrivers() {
  if (matchState.phase !== 'idle') return;
  matchState.drivers.forEach(function(d) {
    if (d.matched) return;
    d.x += (Math.random() - 0.5) * matchState.cellSize * 0.8;
    d.y += (Math.random() - 0.5) * matchState.cellSize * 0.8;
    d.x = Math.max(matchState.cellSize / 2, Math.min(MW - matchState.cellSize / 2, d.x));
    d.y = Math.max(matchState.cellSize / 2, Math.min(MH - matchState.cellSize / 2, d.y));
  });
  matchDraw();
}

function matchCellOf(x, y) {
  return { col: Math.floor(x / matchState.cellSize), row: Math.floor(y / matchState.cellSize) };
}

function matchDraw() {
  var canvas = document.getElementById('matchCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, MW, MH);

  ctx.fillStyle = '#0e0f11';
  ctx.fillRect(0, 0, MW, MH);

  for (var col = 0; col < MG_COLS; col++) {
    for (var row = 0; row < MG_ROWS; row++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(col * matchState.cellSize, row * matchState.cellSize, matchState.cellSize, matchState.cellSize);
    }
  }

  if (matchState.rider && matchState.phase !== 'idle') {
    var rc = matchCellOf(matchState.rider.x, matchState.rider.y);
    var offsets = [[0,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
    offsets.forEach(function(o) {
      var nc = rc.col + o[0], nr = rc.row + o[1];
      if (nc >= 0 && nc < MG_COLS && nr >= 0 && nr < MG_ROWS) {
        var isOwn = (o[0] === 0 && o[1] === 0);
        ctx.fillStyle = isOwn ? 'rgba(251,239,138,0.15)' : 'rgba(123,205,171,0.08)';
        ctx.fillRect(nc * matchState.cellSize, nr * matchState.cellSize, matchState.cellSize, matchState.cellSize);
        ctx.strokeStyle = isOwn ? 'rgba(251,239,138,0.5)' : 'rgba(123,205,171,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(nc * matchState.cellSize, nr * matchState.cellSize, matchState.cellSize, matchState.cellSize);
      }
    });
  }

  matchState.drivers.forEach(function(d, i) {
    var isMatch = (matchState.matched === i);
    var r = isMatch ? 10 : 7;
    if (isMatch) {
      ctx.beginPath(); ctx.arc(d.x, d.y, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(123,205,171,0.2)'; ctx.fill();
      ctx.beginPath(); ctx.arc(d.x, d.y, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#7bcdab'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isMatch ? '#7bcdab' : d.color; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('' + (i + 1), d.x, d.y);
  });

  if (matchState.rider) {
    ctx.beginPath(); ctx.arc(matchState.rider.x, matchState.rider.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f08080'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(matchState.rider.x, matchState.rider.y - 16);
    ctx.lineTo(matchState.rider.x - 6, matchState.rider.y - 8);
    ctx.lineTo(matchState.rider.x + 6, matchState.rider.y - 8);
    ctx.closePath();
    ctx.fillStyle = '#f08080'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('R', matchState.rider.x, matchState.rider.y);
  }
}

function matchStartRequest() {
  matchState.requesting = true;
  matchState.phase = 'waiting';
  document.getElementById('matchReqBtn').classList.add('active');
  document.getElementById('matchModeLabel').textContent = 'Click on the canvas to drop your ride request';
  document.getElementById('matchCanvas').style.cursor = 'crosshair';
  document.getElementById('matchStatus').textContent = 'Click anywhere on the map to place your ride request...';
}

function matchReset() {
  matchState.requesting = false;
  matchState.rider = null;
  matchState.matched = -1;
  matchState.phase = 'idle';
  if (matchState.matchTimer) clearTimeout(matchState.matchTimer);
  document.getElementById('matchReqBtn').classList.remove('active');
  document.getElementById('matchModeLabel').textContent = '';
  document.getElementById('matchCanvas').style.cursor = 'default';
  document.getElementById('matchStatus').textContent = 'Drivers moving in real time. Click "Request Ride" to begin.';
  matchState.drivers.forEach(function(d) { d.matched = false; d.color = '#4a9eff'; });
  matchDraw();
}

function matchFindNearest() {
  var rider = matchState.rider;
  var best = -1, bestDist = Infinity;
  matchState.drivers.forEach(function(d, i) {
    var dx = d.x - rider.x, dy = d.y - rider.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) { bestDist = dist; best = i; }
  });
  return best;
}

function matchAnimate() {
  if (matchState.phase !== 'moving') return;
  var d = matchState.drivers[matchState.matched];
  var rider = matchState.rider;
  var dx = rider.x - d.x, dy = rider.y - d.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) {
    d.x = rider.x; d.y = rider.y;
    matchState.phase = 'arrived';
    document.getElementById('matchStatus').textContent = 'Driver ' + (matchState.matched + 1) + ' arrived! Ride matched successfully.';
    matchDraw();
    return;
  }
  var speed = Math.min(dist * 0.08, 12);
  d.x += (dx / dist) * speed;
  d.y += (dy / dist) * speed;
  matchDraw();
  requestAnimationFrame(matchAnimate);
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {

  /* Geohash grid */
  ghRenderGrid();
  ghUpdatePrec(5);

  /* Quad tree canvas */
  var qtCanvas = document.getElementById('qtCanvas');
  if (qtCanvas) {
    qtCanvas.addEventListener('click', function(e) {
      var r = qtCanvas.getBoundingClientRect();
      var sx = qtCanvas.width / r.width;
      var sy = qtCanvas.height / r.height;
      var px = (e.clientX - r.left) * sx;
      var py = (e.clientY - r.top) * sy;
      qtPoints.push({ x: px, y: py });
      qtTree = null;
      qtRedraw();
    });
    qtRedraw();
  }

  /* Surge grid */
  surgeSimulate('normal');

  /* Match demo */
  matchInitDrivers();
  matchDraw();
  matchState.moveTimer = setInterval(matchMoveDrivers, 2000);

  var matchCanvas = document.getElementById('matchCanvas');
  if (matchCanvas) {
    matchCanvas.addEventListener('click', function(e) {
      if (!matchState.requesting) return;
      var r = matchCanvas.getBoundingClientRect();
      var sx = matchCanvas.width / r.width;
      var sy = matchCanvas.height / r.height;
      var px = (e.clientX - r.left) * sx;
      var py = (e.clientY - r.top) * sy;
      matchState.rider = { x: px, y: py };
      matchState.requesting = false;
      matchState.phase = 'searching';
      document.getElementById('matchReqBtn').classList.remove('active');
      document.getElementById('matchModeLabel').textContent = '';
      document.getElementById('matchCanvas').style.cursor = 'default';
      document.getElementById('matchStatus').textContent = 'Searching geohash cells for nearest driver...';
      matchDraw();

      matchState.matchTimer = setTimeout(function() {
        var best = matchFindNearest();
        matchState.matched = best;
        matchState.drivers[best].color = '#7bcdab';
        matchState.drivers[best].matched = true;
        document.getElementById('matchStatus').textContent = 'Driver ' + (best + 1) + ' matched! Sending offer via WebSocket...';
        matchDraw();

        matchState.matchTimer = setTimeout(function() {
          matchState.phase = 'moving';
          document.getElementById('matchStatus').textContent = 'Driver ' + (best + 1) + ' accepted! Driving to pickup...';
          requestAnimationFrame(matchAnimate);
        }, 800);
      }, 700);
    });
  }
});
</script>
