---
layout: post
title: "System Design: Ad Click Tracking — High-Throughput Event Ingestion and Fraud Detection"
date: 2026-06-19 10:00:00 +0000
categories: ["post"]
tags: [system-design, advertising, kafka, clickhouse, fraud-detection, event-ingestion, web, interview]
series: "System Design: Web Scenarios"
---

<style>
  .sd-ad { background: #19191c; color: rgba(255,255,255,0.8); padding: 1.5rem 1.75rem; border-radius: 8px; line-height: 1.75; }
  .sd-ad p { color: rgba(255,255,255,0.8); margin: 0.9rem 0; }
  .sd-ad h2 { color: #fbef8a; margin-top: 2.5rem; font-size: 1.3rem; border-bottom: 1px solid rgba(251,239,138,0.18); padding-bottom: 0.4rem; }
  .sd-ad h3 { color: #fbef8a; margin-top: 1.8rem; font-size: 1.1rem; }
  .sd-ad a  { color: #7bcdab; }
  .sd-ad strong { color: #fff; }
  .sd-ad ol, .sd-ad ul { padding-left: 1.4rem; }
  .sd-ad li { margin: 0.35rem 0; }
  .sd-ad hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 2rem 0; }

  .sd-ad .code-block {
    background: #0d0d10;
    border: 1px solid rgba(123,205,171,0.22);
    border-radius: 6px;
    padding: 1rem 1.25rem;
    overflow-x: auto;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 0.81rem;
    line-height: 1.65;
    margin: 1.2rem 0;
    color: rgba(255,255,255,0.72);
    white-space: pre;
  }
  .sd-ad .code-block .kw  { color: #fbef8a; }
  .sd-ad .code-block .fn  { color: #7bcdab; }
  .sd-ad .code-block .str { color: #f1948a; }
  .sd-ad .code-block .cm  { color: rgba(255,255,255,0.33); font-style: italic; }
  .sd-ad .code-block .num { color: #a29bfe; }
  .sd-ad .code-block .tp  { color: #74b9ff; }

  .sd-ad table { width: 100%; border-collapse: collapse; margin: 1.2rem 0; font-size: 0.87rem; }
  .sd-ad th { background: rgba(123,205,171,0.12); color: #fbef8a; text-align: left; padding: 0.5rem 0.85rem; border-bottom: 2px solid rgba(123,205,171,0.28); }
  .sd-ad td { padding: 0.45rem 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .sd-ad tr:hover td { background: rgba(255,255,255,0.025); }

  .sd-ad .marginalia {
    float: right;
    clear: right;
    width: 235px;
    margin: 0.2rem 0 1.2rem 1.5rem;
    padding: 0.7rem 0.9rem;
    background: rgba(251,239,138,0.055);
    border-left: 3px solid rgba(251,239,138,0.38);
    font-size: 0.76rem;
    line-height: 1.55;
    color: rgba(255,255,255,0.5);
    font-style: italic;
    border-radius: 0 4px 4px 0;
  }
  @media (max-width: 700px) {
    .sd-ad .marginalia { float: none; width: auto; margin: 1rem 0; }
  }

  /* ── pipeline demo ── */
  .pdemo-wrap  { background: #0d0d10; border: 1px solid rgba(123,205,171,0.18); border-radius: 8px; padding: 1.2rem; margin: 1.5rem 0; }
  .pdemo-stages { display: flex; align-items: center; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.9rem; }
  .pdemo-stage  { background: rgba(123,205,171,0.09); border: 1px solid rgba(123,205,171,0.32); border-radius: 6px; padding: 0.4rem 0.65rem; font-size: 0.77rem; color: #7bcdab; text-align: center; flex: 1; min-width: 78px; transition: background 0.3s; line-height: 1.3; }
  .pdemo-stage.kafka { color: #fbef8a; border-color: rgba(251,239,138,0.38); background: rgba(251,239,138,0.07); }
  .pdemo-arrow  { color: rgba(255,255,255,0.25); font-size: 1.1rem; flex-shrink: 0; }

  .pdemo-track-wrap { position: relative; height: 26px; background: rgba(255,255,255,0.028); border-radius: 13px; overflow: hidden; margin-bottom: 0.9rem; }
  .pdemo-dot       { position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #7bcdab; top: 8px; animation: pdot-flow 1.45s ease-in-out forwards; box-shadow: 0 0 7px rgba(123,205,171,0.65); }
  .pdemo-dot-fraud { background: #e74c3c; box-shadow: 0 0 7px rgba(231,76,60,0.75); }
  @keyframes pdot-flow {
    0%   { left:  2%; opacity: 0; }
    7%   { opacity: 1; }
    87%  { opacity: 1; }
    100% { left: 93%; opacity: 0; }
  }

  .pdemo-meters      { display: flex; gap: 0.9rem; flex-wrap: wrap; margin-bottom: 0.9rem; }
  .pdemo-meter       { flex: 1; min-width: 130px; background: rgba(255,255,255,0.035); border-radius: 6px; padding: 0.55rem 0.8rem; }
  .pdemo-meter-lbl   { font-size: 0.7rem; color: rgba(255,255,255,0.38); margin-bottom: 0.2rem; letter-spacing: 0.05em; }
  .pdemo-meter-val   { font-size: 1.15rem; font-weight: bold; color: #7bcdab; font-family: monospace; }
  .pdemo-bar-wrap    { height: 3px; background: rgba(255,255,255,0.07); border-radius: 2px; margin-top: 0.35rem; }
  .pdemo-bar         { height: 100%; border-radius: 2px; background: #7bcdab; width: 0%; transition: width 0.28s, background 0.28s; }

  .pdemo-controls { display: flex; gap: 0.65rem; flex-wrap: wrap; }
  .pdemo-btn { padding: 0.42rem 0.95rem; border: 1px solid #7bcdab; background: transparent; color: #7bcdab; border-radius: 5px; cursor: pointer; font-size: 0.81rem; transition: background 0.18s; }
  .pdemo-btn:hover   { background: rgba(123,205,171,0.14); }
  .pdemo-btn:disabled { opacity: 0.38; cursor: not-allowed; }
  .pdemo-btn.danger  { border-color: rgba(231,76,60,0.55); color: #e74c3c; }
  .pdemo-btn.muted   { border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.38); }

  /* ── fraud detector ── */
  .fd-wrap     { background: #0d0d10; border: 1px solid rgba(123,205,171,0.18); border-radius: 8px; padding: 1.2rem; margin: 1.5rem 0; }
  .fd-header   { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.9rem; }
  .fd-title    { color: #fbef8a; font-size: 0.88rem; font-weight: bold; }
  .fd-metrics  { display: flex; gap: 1.2rem; flex-wrap: wrap; }
  .fd-metric   { font-size: 0.79rem; color: rgba(255,255,255,0.45); }
  .fd-metric strong { color: #7bcdab; font-size: 0.95rem; }
  .fd-metric.alert strong { color: #e74c3c; }

  .fd-controls { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end; padding: 0.8rem 0; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 0.8rem; }
  .fd-cgroup   { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.78rem; color: rgba(255,255,255,0.45); }
  .fd-cgroup input[type=range] { accent-color: #7bcdab; width: 145px; cursor: pointer; }

  .fd-table    { width: 100%; border-collapse: collapse; font-size: 0.79rem; }
  .fd-table th { color: rgba(255,255,255,0.32); font-weight: normal; text-align: left; padding: 0.22rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.07); font-size: 0.69rem; text-transform: uppercase; letter-spacing: 0.06em; }
  .fd-table td { padding: 0.28rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.035); }

  .fd-btn { padding: 0.38rem 0.85rem; border: 1px solid rgba(231,76,60,0.52); background: transparent; color: #e74c3c; border-radius: 5px; cursor: pointer; font-size: 0.79rem; transition: all 0.18s; }
  .fd-btn:hover { background: rgba(231,76,60,0.13); }
</style>

<div class="sd-ad" markdown="1">

The interview prompt is deceptively simple: *"Design Google's ad click tracking system."* Underneath lies one of the most financially critical data pipelines in tech — 10 billion clicks per day, each click potentially representing billable revenue. Miss a click? An advertiser underpays. Double-count a click? An advertiser overpays and may dispute the charge. Let a bot click through? $120 billion per year in fraud globally.

This post walks through the full system: ingestion, deduplication, fraud detection, aggregation, and billing. Each piece involves real engineering tradeoffs with no obviously correct answer.

---

## 1. Scale and requirements

Start with numbers. "10 billion clicks/day" needs to be translated into engineering constraints before you can design anything.

| Requirement | Value |
|---|---|
| Clicks per day | 10,000,000,000 |
| Average clicks/sec | ~115,000 |
| Peak clicks/sec (5× average) | ~575,000 |
| Click payload size | ~500 bytes |
| Click-to-redirect latency | &lt; 200ms (user-visible) |
| Data durability | Zero loss — each click is billable |
| Deduplication window | 5 minutes per (userId, adId) pair |
| Report freshness | Real-time (&lt;1 min delay) + full history |
| Retention | 7 years (legal and billing audit) |

The redirect latency requirement is the hardest constraint. A user clicked an ad and is waiting to land on `advertiser.com`. The tracking infrastructure sits in their critical path. Any slowdown they notice degrades the perceived quality of search results — Google's core product.

115,000 clicks/sec average means the system must be **horizontally scalable with no single hot shard**. At 500 bytes each: 57 MB/sec of click data, ~5 TB/day raw, ~1.8 PB/year raw before compression.

---

## 2. The click redirect flow

When a user clicks an ad, the browser follows a URL like:

<pre class="code-block"><span class="cm">-- The rendered anchor in a Google Search result</span>
<span class="str">https://ads.google.com/click?adId=A123&amp;pub=P456&amp;redirect=https%3A%2F%2Fadvertiser.com%2Fproduct</span></pre>

The user never sees `advertiser.com` until after the redirect lands. This gives the tracking service a window to record the click. Three implementation options:

**Option A — Synchronous (simplest, adds latency):**
Record the click in a database, then return `302 Found`. Every click touches storage before the user navigates. Adds 50–200ms. Unacceptable at 115k clicks/sec.

**Option B — Fire-and-forget beacon (fastest, some loss):**
Return the redirect immediately. The browser fires `navigator.sendBeacon()` in the background. Risk: beacons are dropped on fast page unload, network failure, or certain mobile browsers. Loss rate 0.1–1%. For a billing system, this is a financial liability.

**Option C — Hybrid async (production choice):**
Click Collector receives the request, immediately publishes to Kafka (`acks=1`, &lt;5ms), then returns `302`. Kafka provides durability. Background processors handle everything else. Users see ~20–40ms overhead — imperceptible.

<pre class="code-block"><span class="cm">// Click Collector request handler (Go pseudocode)</span>
<span class="kw">func</span> <span class="fn">HandleClick</span>(w http.ResponseWriter, r *http.Request) {
    adId     := r.URL.Query().Get(<span class="str">"adId"</span>)
    redirect := r.URL.Query().Get(<span class="str">"redirect"</span>)

    click := ClickEvent{
        ID:         uuid.<span class="fn">New</span>().String(),   <span class="cm">// idempotency key</span>
        AdID:       adId,
        UserID:     <span class="fn">extractUserId</span>(r),
        IP:         r.RemoteAddr,
        UserAgent:  r.Header.<span class="fn">Get</span>(<span class="str">"User-Agent"</span>),
        Referrer:   r.<span class="fn">Referer</span>(),
        Timestamp:  time.Now().UTC(),
        GeoCountry: geoIP.<span class="fn">Lookup</span>(r.RemoteAddr),
    }

    <span class="cm">// Non-blocking: publish to Kafka, do not wait for consumer</span>
    kafkaProducer.<span class="fn">ProduceAsync</span>(click)

    <span class="cm">// Immediately redirect the user — tracking is off the critical path</span>
    http.<span class="fn">Redirect</span>(w, r, redirect, http.StatusFound)
}</pre>

The idempotency UUID is generated at collection time. If the request retries (browser back/forward, network retry), a new UUID is issued — but downstream deduplication catches duplicates by `(userId, adId, 5-minute window)`.

---

## 3. The ingestion pipeline

</div>

<div class="sd-ad">
<p>The full pipeline from click to storage has five stages. Each is independently scalable. Kafka decouples producers from consumers — if the fraud detector is slow, it simply builds consumer lag without blocking the user's redirect or the Click Collector.</p>

<div class="pdemo-wrap">
  <div class="pdemo-stages">
    <div class="pdemo-stage">User<br>Click</div>
    <span class="pdemo-arrow">&#8594;</span>
    <div class="pdemo-stage">Click<br>Collector</div>
    <span class="pdemo-arrow">&#8594;</span>
    <div class="pdemo-stage kafka">Kafka<br>ad-clicks</div>
    <span class="pdemo-arrow">&#8594;</span>
    <div class="pdemo-stage">Stream<br>Processor</div>
    <span class="pdemo-arrow">&#8594;</span>
    <div class="pdemo-stage">ClickHouse<br>+ Redis</div>
  </div>
  <div class="pdemo-track-wrap" id="pdemo-track"></div>
  <div class="pdemo-meters">
    <div class="pdemo-meter">
      <div class="pdemo-meter-lbl">THROUGHPUT</div>
      <div class="pdemo-meter-val" id="pdemo-throughput">0/s</div>
    </div>
    <div class="pdemo-meter">
      <div class="pdemo-meter-lbl">KAFKA CONSUMER LAG</div>
      <div class="pdemo-meter-val" id="pdemo-kafka-lag">0 msgs</div>
      <div class="pdemo-bar-wrap"><div class="pdemo-bar" id="pdemo-lag-bar"></div></div>
    </div>
    <div class="pdemo-meter">
      <div class="pdemo-meter-lbl">FRAUD SCORE</div>
      <div class="pdemo-meter-val" id="pdemo-fraud-score">0%</div>
      <div class="pdemo-bar-wrap"><div class="pdemo-bar" id="pdemo-fraud-bar"></div></div>
    </div>
  </div>
  <div class="pdemo-controls">
    <button class="pdemo-btn" id="pdemo-btn-sim">Simulate 1,000 clicks/sec</button>
    <button class="pdemo-btn danger" id="pdemo-btn-fraud">Inject Fraud Burst</button>
    <button class="pdemo-btn muted"  id="pdemo-btn-stop">Stop</button>
  </div>
</div>

<script>
(function() {
  var running    = false;
  var fraudBurst = false;
  var loopHandle = null;
  var kafkaLag   = 0;
  var fraudScore = 0;

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setBar(id, pct, color) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.width      = Math.min(100, pct) + '%';
    if (color) el.style.background = color;
  }

  function spawnDot(isFraud) {
    var track = document.getElementById('pdemo-track');
    if (!track) return;
    var d = document.createElement('div');
    d.className = isFraud ? 'pdemo-dot pdemo-dot-fraud' : 'pdemo-dot';
    d.style.top = (Math.random() * 6 + 8) + 'px';
    track.appendChild(d);
    setTimeout(function() { if (d.parentNode) d.parentNode.removeChild(d); }, 1550);
  }

  function tick() {
    if (running) {
      kafkaLag += Math.floor(Math.random() * 60 + 10);
      kafkaLag -= Math.floor(Math.random() * 55 + 15);
    } else {
      kafkaLag -= 70;
    }
    kafkaLag = Math.max(0, kafkaLag);

    if (fraudBurst) {
      fraudScore = Math.min(90, fraudScore + 4.5);
    } else {
      fraudScore = Math.max(1, fraudScore - 0.9);
    }

    setText('pdemo-kafka-lag',   kafkaLag.toLocaleString() + ' msgs');
    setText('pdemo-fraud-score', Math.round(fraudScore) + '%');
    setBar('pdemo-lag-bar',   kafkaLag / 12,  kafkaLag > 600 ? '#fbef8a' : '#7bcdab');
    setBar('pdemo-fraud-bar', fraudScore,     fraudScore > 40 ? '#e74c3c' : '#7bcdab');

    if (running) {
      var n = 4 + Math.floor(Math.random() * 5);
      for (var i = 0; i < n; i++) {
        spawnDot(fraudBurst && Math.random() < 0.42);
      }
    }
  }

  function startSim() {
    if (loopHandle) return;
    running = true;
    setText('pdemo-throughput', '1,000/s');
    loopHandle = setInterval(tick, 185);
    var b = document.getElementById('pdemo-btn-sim');
    if (b) { b.textContent = 'Running\u2026'; b.disabled = true; }
  }

  function stopSim() {
    running    = false;
    fraudBurst = false;
    clearInterval(loopHandle);
    loopHandle = null;
    setText('pdemo-throughput', '0/s');
    var bs = document.getElementById('pdemo-btn-sim');
    if (bs) { bs.textContent = 'Simulate 1,000 clicks/sec'; bs.disabled = false; }
    var bf = document.getElementById('pdemo-btn-fraud');
    if (bf) { bf.textContent = 'Inject Fraud Burst'; bf.style.background = ''; }
  }

  function toggleFraud() {
    if (!running) startSim();
    fraudBurst = !fraudBurst;
    var b = document.getElementById('pdemo-btn-fraud');
    if (!b) return;
    b.textContent      = fraudBurst ? 'Stop Fraud Burst' : 'Inject Fraud Burst';
    b.style.background = fraudBurst ? 'rgba(231,76,60,0.22)' : '';
  }

  function wire() {
    var s = document.getElementById('pdemo-btn-sim');
    var f = document.getElementById('pdemo-btn-fraud');
    var x = document.getElementById('pdemo-btn-stop');
    if (s) s.addEventListener('click', startSim);
    if (f) f.addEventListener('click', toggleFraud);
    if (x) x.addEventListener('click', stopSim);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
</script>

<p>Kafka is partitioned by <code>adId</code> so all clicks for a given ad go to the same partition. This preserves per-ad ordering and makes deduplication and per-ad aggregation efficient. With 100 partitions at 115k clicks/sec average, each partition handles ~1,150 clicks/sec — well below Kafka's per-partition ceiling of ~100 MB/sec.</p>

<p>The Stream Processor (Kafka Streams or Apache Flink) handles three tasks in a single pipeline pass:</p>
<ol>
  <li><strong>Deduplication:</strong> check Redis SET NX, mark duplicates before writing to ClickHouse</li>
  <li><strong>Fraud scoring:</strong> apply rule-based signals and ML model score; invalidate fraudulent clicks</li>
  <li><strong>Aggregation:</strong> increment Redis real-time counters; batch-write raw events to ClickHouse</li>
</ol>
</div>

<div class="sd-ad" markdown="1">

---

## 4. Deduplication

The business rule: the same user clicking the same ad twice within 5 minutes counts as one billable click. This is a set-membership problem with a TTL.

**Redis SET NX with expiry:**

<pre class="code-block"><span class="cm">-- Redis command — atomic, no race condition possible</span>
<span class="fn">SET</span> <span class="str">"click:user-8821:adA-456"</span> <span class="str">"1"</span> <span class="kw">NX</span> <span class="kw">EX</span> <span class="num">300</span>

<span class="cm">-- Returns OK  → first click in the 5-minute window → billable</span>
<span class="cm">-- Returns nil → key already existed → duplicate → not billable</span></pre>

`NX` means "set only if Not eXists" and is atomic. No race condition between two concurrent processors checking the same `(userId, adId)` pair.

**Memory calculation:** At 115,000 clicks/sec with a 300-second window, the maximum number of live keys is `115,000 × 300 = 34.5 million`. At ~50 bytes per key (prefix + userId + adId): approximately **1.7 GB** of Redis RAM. With Redis Cluster across three shards, each shard holds ~600 MB — trivial.

The dedup key is intentionally scoped to `(userId, adId)`, not `(IP, adId)`. A household with five people can each legitimately click the same ad. IP-based dedup would produce false positives for shared networks (offices, universities, mobile carrier NAT).

<pre class="code-block"><span class="cm">// Stream processor dedup logic (Go pseudocode)</span>
<span class="kw">func</span> <span class="fn">processClick</span>(click ClickEvent) {
    key    := <span class="str">"click:"</span> + click.UserID + <span class="str">":"</span> + click.AdID
    isNew, _ := redis.<span class="fn">SetNX</span>(key, <span class="str">"1"</span>, <span class="num">5</span>*time.Minute)

    <span class="kw">if</span> !isNew {
        click.Billable     = <span class="kw">false</span>
        click.DedupReason  = <span class="str">"window_duplicate"</span>
    } <span class="kw">else</span> {
        click.Billable     = <span class="kw">true</span>
    }

    <span class="fn">writeToClickHouse</span>(click)  <span class="cm">// always write, both billable and deduped</span>
}</pre>

Non-billable clicks are still persisted to ClickHouse. Advertisers can audit total clicks vs. unique billable clicks — that transparency is important for trust.

**Handling Redis failure:** Redis can lose data on restart without AOF persistence. The tradeoff: if a dedup key is lost, a duplicate gets billed (advertiser slightly overpays). The pragmatic choice is `appendfsync everysec` — accept up to 1 second of dedup data loss over adding 1–2ms disk latency per click. Nightly reconciliation catches and credits these rare discrepancies.

---

## 5. Fraud detection

</div>

<div class="sd-ad">

{: class="marginalia" }
Click fraud costs advertisers over $120 billion per year (2023, Juniper Research). Google's Invalid Click Detection is among the most sophisticated fraud detection systems ever built — they claim to catch over 99% of fraudulent clicks before billing advertisers. The remaining fraction is refunded when advertisers file an Invalid Activity report in Google Ads.

<p>Click fraud is an arms race: bot operators continuously evolve to evade detection. The five signal categories below are applied in real time. Use the sliders to tune detection sensitivity and observe how aggressiveness affects the fraud catch rate.</p>

<div class="fd-wrap">
  <div class="fd-header">
    <div class="fd-title">Live Fraud Detector</div>
    <div class="fd-metrics">
      <div class="fd-metric">Clicks: <strong id="fd-total">0</strong></div>
      <div class="fd-metric" id="fd-fraud-metric">Blocked: <strong id="fd-fraud-count">0</strong> (<strong id="fd-fraud-rate">0%</strong>)</div>
    </div>
  </div>
  <div class="fd-controls">
    <div class="fd-cgroup">
      <label>Max clicks/IP/min: <strong id="fd-max-ip-val">10</strong></label>
      <input type="range" id="fd-max-ip" min="1" max="50" value="10">
    </div>
    <div class="fd-cgroup">
      <label>Min interval between clicks: <strong id="fd-min-time-val">500ms</strong></label>
      <input type="range" id="fd-min-time" min="50" max="2000" value="500" step="50">
    </div>
    <button class="fd-btn" id="fd-btn-inject">Inject Fraud Wave</button>
  </div>
  <table class="fd-table">
    <thead>
      <tr>
        <th>Time</th>
        <th>IP Address</th>
        <th>User ID</th>
        <th>Ad ID</th>
        <th>Status</th>
        <th>Rule Triggered</th>
      </tr>
    </thead>
    <tbody id="fraud-tbody"></tbody>
  </table>
</div>

<script>
(function() {
  var fraudMode      = false;
  var totalClicks    = 0;
  var fraudCount     = 0;
  var ipCounts       = {};
  var maxPerIp       = 10;
  var minIntervalMs  = 500;

  setInterval(function() { ipCounts = {}; }, 60000);

  function ri(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
  function p2(n)      { return n < 10 ? '0' + n : '' + n; }

  function genClick() {
    var isFraudAttempt = fraudMode && Math.random() < 0.64;
    var ip, userId, adId, gap;
    if (isFraudAttempt) {
      var subs = ['10.0.1', '172.16.2', '192.168.5'];
      ip     = subs[ri(0, 2)] + '.' + ri(1, 8);
      userId = 'bot' + ri(0, 29);
      adId   = 'ad' + ri(200, 212);
      gap    = ri(25, 190);
    } else {
      ip     = ri(1, 220) + '.' + ri(0, 255) + '.' + ri(0, 255) + '.' + ri(1, 254);
      userId = 'u' + ri(100000, 9999999);
      adId   = 'ad' + ri(1, 9999);
      gap    = ri(900, 7500);
    }
    return { ip: ip, userId: userId, adId: adId, gap: gap };
  }

  function checkFraud(c) {
    ipCounts[c.ip] = (ipCounts[c.ip] || 0) + 1;
    if (ipCounts[c.ip] > maxPerIp) {
      return { fraud: true, rule: 'IP rate: ' + ipCounts[c.ip] + ' hits (limit ' + maxPerIp + '/min)' };
    }
    if (c.gap < minIntervalMs) {
      return { fraud: true, rule: 'Interval ' + c.gap + 'ms < min ' + minIntervalMs + 'ms' };
    }
    if (c.userId.indexOf('bot') === 0 && Math.random() < 0.22) {
      return { fraud: true, rule: 'UA fingerprint: headless browser detected' };
    }
    if (c.userId.indexOf('bot') === 0 && Math.random() < 0.15) {
      return { fraud: true, rule: 'Subnet cluster: datacenter IP block' };
    }
    return { fraud: false, rule: '' };
  }

  function addRow(c, result) {
    var tbody = document.getElementById('fraud-tbody');
    if (!tbody) return;
    var tr    = document.createElement('tr');
    tr.style.background = result.fraud ? 'rgba(231,76,60,0.10)' : 'transparent';
    var now   = new Date();
    var t     = p2(now.getHours()) + ':' + p2(now.getMinutes()) + ':' + p2(now.getSeconds());
    var sc    = result.fraud ? '#e74c3c' : '#7bcdab';
    var st    = result.fraud ? 'FRAUD'   : 'PASS';
    var rule  = result.rule  || '\u2014';
    tr.innerHTML =
      '<td style="font-size:0.7rem;color:rgba(255,255,255,0.35)">'  + t        + '</td>' +
      '<td style="font-family:monospace;font-size:0.77rem">'        + c.ip     + '</td>' +
      '<td style="font-size:0.77rem">'                              + c.userId + '</td>' +
      '<td style="font-size:0.77rem">'                              + c.adId   + '</td>' +
      '<td style="font-weight:bold;color:' + sc + '">'              + st       + '</td>' +
      '<td style="font-size:0.7rem;color:rgba(255,255,255,0.42)">'  + rule     + '</td>';
    tbody.insertBefore(tr, tbody.firstChild);
    while (tbody.children.length > 16) { tbody.removeChild(tbody.lastChild); }
  }

  function updateMetrics() {
    var rate   = totalClicks > 0 ? Math.round(fraudCount / totalClicks * 100) : 0;
    var tEl    = document.getElementById('fd-total');
    var fcEl   = document.getElementById('fd-fraud-count');
    var frEl   = document.getElementById('fd-fraud-rate');
    var mEl    = document.getElementById('fd-fraud-metric');
    if (tEl)  tEl.textContent  = totalClicks.toLocaleString();
    if (fcEl) fcEl.textContent = fraudCount.toLocaleString();
    if (frEl) frEl.textContent = rate + '%';
    if (mEl)  mEl.className   = 'fd-metric' + (rate > 30 ? ' alert' : '');
  }

  setInterval(function() {
    var c      = genClick();
    var result = checkFraud(c);
    totalClicks++;
    if (result.fraud) fraudCount++;
    addRow(c, result);
    updateMetrics();
  }, 370);

  function wire() {
    var maxEl = document.getElementById('fd-max-ip');
    var minEl = document.getElementById('fd-min-time');
    var btn   = document.getElementById('fd-btn-inject');

    if (maxEl) {
      maxEl.addEventListener('input', function() {
        maxPerIp = parseInt(this.value, 10);
        var lbl  = document.getElementById('fd-max-ip-val');
        if (lbl) lbl.textContent = this.value;
      });
    }
    if (minEl) {
      minEl.addEventListener('input', function() {
        minIntervalMs = parseInt(this.value, 10);
        var lbl       = document.getElementById('fd-min-time-val');
        if (lbl) lbl.textContent = this.value + 'ms';
      });
    }
    if (btn) {
      btn.addEventListener('click', function() {
        fraudMode          = !fraudMode;
        this.textContent   = fraudMode ? 'Stop Fraud Wave' : 'Inject Fraud Wave';
        this.style.background   = fraudMode ? 'rgba(231,76,60,0.22)' : '';
        this.style.borderColor  = fraudMode ? '#e74c3c' : 'rgba(231,76,60,0.52)';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
</script>

<p>Beyond rule-based detection, production systems add a <strong>gradient-boosted ML model</strong> that scores each click 0–100 for fraud probability. Features include: device fingerprint entropy, mouse movement patterns before the click, session behavior (did the user scroll? hover over the ad?), historical conversion rate for the publisher domain, and network topology signals (VPN exit nodes, datacenter IP ranges, Tor exits).</p>

<p>The ML model runs <strong>asynchronously</strong> — clicks are initially accepted, then retroactively invalidated within a 2-hour window if the model flags them. This prevents blocking the user redirect on ML inference latency (which may be 20–100ms on a complex model). Advertisers are credited for any clicks invalidated during the grace window.</p>

</div>

<div class="sd-ad" markdown="1">

---

## 6. Aggregation and reporting

Advertisers query a dashboard: *"Show me clicks, impressions, CTR, and spend for campaign C-789 for the last 30 days, broken down by keyword and device type."*

This is an OLAP workload. ClickHouse is purpose-built for it: columnar storage, vectorized query execution, and excellent compression on repetitive values (adId, campaignId appear billions of times and compress 10:1+).

**ClickHouse schema:**

<pre class="code-block"><span class="kw">CREATE TABLE</span> <span class="fn">ad_clicks</span> (
    click_id       <span class="tp">UUID</span>,
    ad_id          <span class="tp">String</span>,
    campaign_id    <span class="tp">String</span>,
    advertiser_id  <span class="tp">String</span>,
    publisher_id   <span class="tp">String</span>,
    user_id        <span class="tp">String</span>,
    ip_address     <span class="tp">String</span>,
    geo_country    <span class="tp">FixedString(2)</span>,
    device_type    <span class="tp">Enum8</span>(<span class="str">'desktop'</span>=<span class="num">1</span>, <span class="str">'mobile'</span>=<span class="num">2</span>, <span class="str">'tablet'</span>=<span class="num">3</span>),
    keyword        <span class="tp">String</span>,
    timestamp      <span class="tp">DateTime</span>,
    is_billable    <span class="tp">UInt8</span>,
    fraud_score    <span class="tp">Float32</span>,
    cpc            <span class="tp">Decimal(10, 6)</span>
) <span class="kw">ENGINE</span> = MergeTree()
<span class="kw">PARTITION BY</span> <span class="fn">toYYYYMM</span>(timestamp)
<span class="kw">ORDER BY</span>    (advertiser_id, campaign_id, timestamp)
<span class="kw">TTL</span>         timestamp + <span class="kw">INTERVAL</span> <span class="num">7</span> <span class="kw">YEAR</span>;</pre>

**Advertiser 30-day report query:**

<pre class="code-block"><span class="kw">SELECT</span>
    <span class="fn">toDate</span>(timestamp)              <span class="kw">AS</span> day,
    keyword,
    device_type,
    <span class="fn">count</span>(*)                       <span class="kw">AS</span> total_clicks,
    <span class="fn">countIf</span>(is_billable = <span class="num">1</span>)        <span class="kw">AS</span> billable_clicks,
    <span class="fn">sumIf</span>(cpc, is_billable = <span class="num">1</span>)     <span class="kw">AS</span> spend,
    <span class="fn">avg</span>(fraud_score)               <span class="kw">AS</span> avg_fraud_score
<span class="kw">FROM</span>  ad_clicks
<span class="kw">WHERE</span>
    advertiser_id = <span class="str">'ADV-12345'</span>
    <span class="kw">AND</span> campaign_id = <span class="str">'C-789'</span>
    <span class="kw">AND</span> timestamp  <span class="kw">BETWEEN</span> <span class="str">'2026-05-19'</span> <span class="kw">AND</span> <span class="str">'2026-06-19'</span>
<span class="kw">GROUP BY</span> day, keyword, device_type
<span class="kw">ORDER BY</span> day <span class="kw">DESC</span>, spend <span class="kw">DESC</span>;</pre>

ClickHouse executes this over 30 days of data with partition pruning on `toYYYYMM(timestamp)` and primary-key skipping on `(advertiser_id, campaign_id)`. Expected latency: under 500ms even at full scale.

**Real-time dashboard (last 60 minutes):**

Redis counters give sub-second freshness. The stream processor increments atomically:

<pre class="code-block"><span class="cm">-- Atomic pipeline for each billable click (Redis pipeline)</span>
<span class="fn">INCR</span>        <span class="str">"stats:adA123:clicks:2026061914"</span>    <span class="cm">-- hourly bucket key</span>
<span class="fn">INCR</span>        <span class="str">"stats:adA123:billable:2026061914"</span>
<span class="fn">INCRBYFLOAT</span> <span class="str">"stats:adA123:spend:2026061914"</span>  <span class="num">0.35</span>
<span class="fn">EXPIRE</span>      <span class="str">"stats:adA123:clicks:2026061914"</span>  <span class="num">7200</span>
<span class="fn">EXPIRE</span>      <span class="str">"stats:adA123:billable:2026061914"</span> <span class="num">7200</span>
<span class="fn">EXPIRE</span>      <span class="str">"stats:adA123:spend:2026061914"</span>   <span class="num">7200</span></pre>

The dashboard API reads Redis keys for the current and previous hour (real-time view) and queries ClickHouse for anything older. This gives advertisers a unified experience where recent data feels live.

---

## 7. Exactly-once processing challenge

The most critical correctness requirement: each click must be billed **exactly once** — not zero times (lost revenue), not twice (advertiser overpay, chargeback risk).

**The failure modes:**

| Scenario | What happens | Solution |
|---|---|---|
| Processor crashes mid-batch | Kafka offset not committed; batch reprocessed | Idempotency key unique constraint in DB |
| Network timeout writing to ClickHouse | Retry produces duplicate row | `click_id UUID` dedup key |
| Kafka message delivered twice | Consumer processes same message twice | UUID idempotency + Redis NX |
| Click Collector crashes after Kafka ack | Message in Kafka, collector never confirms | Kafka durability guarantees delivery |
| Redis dedup key expires before window ends | Duplicate click billed in same window | Accept; reconcile in nightly batch |

**Idempotent writes to ClickHouse using ReplacingMergeTree:**

<pre class="code-block"><span class="cm">-- ReplacingMergeTree deduplicates rows with same ORDER BY key in background</span>
<span class="kw">CREATE TABLE</span> <span class="fn">ad_clicks_deduped</span> (
    click_id    <span class="tp">UUID</span>,
    <span class="cm">-- ... other columns ...</span>
    version     <span class="tp">DateTime</span> <span class="kw">DEFAULT</span> <span class="fn">now</span>()
) <span class="kw">ENGINE</span> = ReplacingMergeTree(version)
<span class="kw">ORDER BY</span> click_id;

<span class="cm">-- FINAL forces merge at query time — use for billing queries only</span>
<span class="kw">SELECT</span> <span class="fn">count</span>(*) <span class="kw">FROM</span> ad_clicks_deduped <span class="kw">FINAL</span>
<span class="kw">WHERE</span> advertiser_id = <span class="str">'ADV-12345'</span>
  <span class="kw">AND</span> is_billable = <span class="num">1</span>;</pre>

`FINAL` forces ClickHouse to merge duplicate rows at query time, guaranteeing exactly-once semantics for billing reads. It is slower than a regular scan, so use it only for billing — dashboards can skip it and accept minor inaccuracy.

**The at-least-once contract:** Production systems accept at-least-once delivery from Kafka and enforce exactly-once semantics at the write layer via idempotency keys. Kafka's native exactly-once transactions exist but add ~30% latency overhead and significant operational complexity. That cost is not worth paying when the write layer can dedup via a unique constraint or ReplacingMergeTree.

---

## 8. Billing pipeline

Every verified click — non-fraud, non-deduplicated — triggers a budget decrement. Advertisers set a daily budget; when it is exhausted, their ads stop showing immediately.

<pre class="code-block"><span class="cm">// Budget decrement — atomic Redis operation</span>
<span class="cm">// Budget stored as micro-cents to avoid float precision issues</span>
remaining := redis.<span class="fn">DecrBy</span>(<span class="str">"budget:ADV-12345:daily"</span>, cpcMicroCents)

<span class="kw">if</span> remaining &lt;= <span class="num">0</span> {
    <span class="cm">// Publish to ad-control topic — Ad Servers stop bidding within ~100ms</span>
    kafka.<span class="fn">Produce</span>(<span class="str">"ad-paused"</span>, AdPauseEvent{
        AdvertiserID: <span class="str">"ADV-12345"</span>,
        Reason:       <span class="str">"daily_budget_exhausted"</span>,
        Timestamp:    time.<span class="fn">Now</span>(),
    })
}</pre>

The Ad Server subscribes to the `ad-paused` topic. On receiving a pause event, it removes the advertiser from the active bid pool within ~100ms. This is eventual consistency — a handful of clicks may slip through immediately after budget exhaustion. That is an accepted cost. Advertisers are never charged more than 20% over their daily budget (a Google Ads contractual guarantee enforced by a hard cap at `budget × 1.2`).

**Daily budget reset:**

<pre class="code-block"><span class="cm">-- Midnight UTC cron: reset budget and set 24-hour expiry</span>
<span class="fn">SET</span>    <span class="str">"budget:ADV-12345:daily"</span>  <span class="num">50000000</span>  <span class="cm">-- $500.00 = 50,000,000 micro-cents</span>
<span class="fn">EXPIRE</span> <span class="str">"budget:ADV-12345:daily"</span>  <span class="num">86400</span>     <span class="cm">-- auto-expire after 24 hours</span></pre>

**Reconciliation:** a nightly batch job compares the total decrements recorded in Redis against the sum of `cpc` for `is_billable = 1` rows in ClickHouse for the same day. Discrepancies over 0.01% trigger a PagerDuty alert. Discrepancies under 0.01% (expected from crash windows) are credited to the advertiser automatically.

---

## 9. Capacity estimate

| Component | Specification | Reasoning |
|---|---|---|
| Click Collector servers | 50 × 2,300 clicks/sec | ~50 MB/s each; limited by Kafka produce latency |
| Kafka partitions | 100 | 1,150 clicks/partition/sec, well below Kafka limits |
| Kafka retention | 7 days | Full replay window for disaster recovery |
| Kafka brokers | 15 | Replication factor 3; ~5 partition leaders per broker |
| Redis dedup cluster | 3 shards × 2 GB RAM | 34.5M keys × ~50 bytes = ~1.7 GB + 20% headroom |
| Redis budget cluster | 1 shard | Small dataset — one entry per advertiser |
| Stream Processor nodes | 30 | 100 partitions / ~3 partitions per node |
| ClickHouse cluster | 10 shards × 3 replicas | ~5 TB/day raw; ~500 GB/day compressed per shard |
| ClickHouse storage/year | ~180 TB compressed | 10:1 compression on repetitive ad attribution data |
| Raw storage/year | ~1.8 PB | Before compression; tiered to cold object storage after 90 days |

**Back-of-envelope check:**
- 115,000 clicks/sec × 500 bytes = **57.5 MB/sec** ingest rate
- ClickHouse handles up to 1 GB/sec per server with columnar storage
- 10 shards means ~5.75 MB/sec per shard — enormous headroom, room to grow 100×
- 30-day query at 10B rows/day: ~500ms with partition pruning, sub-second on warm cache

The bottleneck in most real deployments is **ClickHouse disk I/O during background merges** on ingest-heavy days. Use separate replica groups for ingest vs. query to prevent merge I/O from spiking query latency.

---

## 10. Notes and observations

{: class="marginalia" }
Click fraud is a $120 billion per year problem (2023 estimate by Juniper Research). Google's Invalid Click Detection is one of the most sophisticated fraud detection systems ever built — they claim to catch over 99% of fraudulent clicks before billing advertisers. The remaining under 1% is refunded when advertisers report it through the Invalid Activity report in Google Ads.

The three genuinely hard problems in this system are not the ones that sound hard. Kafka partitioning, Redis dedup, ClickHouse schema — these are well-understood patterns with documented solutions. The hard problems are:

1. **Fraud detection at the feature level.** Distinguishing a legitimate power user — a real estate agent clicking 50 competitor ads to research pricing — from a bot. Rule-based systems generate too many false positives. ML models require labeled training data, and fraudsters adapt continuously. The feedback loop between fraudster and detector runs faster than any release cycle.

2. **Budget enforcement with 100ms global consistency.** An advertiser's ad must stop showing within seconds of budget exhaustion, across thousands of Ad Server instances deployed in 30+ regions globally. This requires a distributed cache invalidation protocol that is faster than the incoming click rate. Pub/sub (Kafka or Redis) to all Ad Server pods is the production approach — it is not a solved problem when pods number in the thousands.

3. **Seven-year billing auditability.** Regulators and enterprise advertisers require click-level audit trails. Every click — with its fraud score, dedup decision, billing record, and the exact version of the fraud detection model that scored it — must be queryable for 7 years. ClickHouse with tiered storage (hot NVMe SSD → warm HDD → cold object storage) handles this. The model versioning is the underappreciated part: you must be able to replay fraud scoring with a historical model version to answer advertiser disputes.

{: class="marginalia" }
The first documented click fraud case was in 2004 — a website owner was clicking competitors' ads to drain their Google Ads budgets. Google and competitors had to rebuild their entire billing infrastructure around fraud detection within the first few years of AdWords. This is why Google's system treats fraud detection as a first-class architectural concern rather than an afterthought bolted on later.

The redirect flow also carries a subtle UX detail: Google's click tracking URL persists in browser history, so a user navigating back sees `ads.google.com/click?...` instead of `advertiser.com`. This is intentional — it lets Google distinguish ad-click return visits from organic return visits, which matters for conversion attribution modelling.

{: class="marginalia" }
Google processes over 8.5 billion searches per day, each potentially showing 3–5 ads. Even at a 1% click-through rate, that is 25–42 million ad clicks from Search alone. YouTube, Gmail, and the Display Network add hundreds of millions more. The click tracking infrastructure is, financially speaking, what funds Google's entire AI research program. The engineering investment in making it 99.99% reliable and fraud-resistant is not optional — it is the business.

The system described here is deliberately not over-engineered. Many companies start with Kafka → PostgreSQL. The jump to ClickHouse, Redis Cluster, and ML fraud scoring is **earned** as scale demands it. If you are designing this in an interview, identifying the right scaling triggers — when does a single Postgres instance break down? when does Redis dedup need clustering? — demonstrates more depth than naming every technology upfront.

</div>
