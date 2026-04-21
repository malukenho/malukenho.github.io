---
layout: post
title: "System Design: Rate Limiter — From Token Bucket to Distributed Throttling"
date: 2026-04-16 10:00:00 +0000
categories: ["post"]
tags: [system-design, rate-limiting, redis, distributed-systems, interview]
series: "System Design Interview Series"
---

{: class="marginalia" }
Series **#3 of 15** in<br/>*System Design Interview*<br/>deep-dives. Each post<br/>stands alone but they<br/>build on each other.

<div class="series-label">System Design Interview Series &mdash; #3 of 15</div>

**The question:** Design a rate limiter that limits API calls to 100 requests per minute per user. Make it work across a distributed cluster of 10 API servers.

This deceptively simple prompt hides a rabbit hole of trade-offs: accuracy vs. memory, simplicity vs. correctness, single-server vs. distributed. Let's go deep.

---

<style>
/* ── Base ─────────────────────────────────────────────────────────── */
.series-label {
  display: inline-block; background: rgba(123,205,171,.12);
  border: 1px solid rgba(123,205,171,.35); border-radius: 20px;
  padding: 4px 14px; font-size: 12px; color: #7bcdab;
  letter-spacing: .06em; margin-bottom: 1.6rem;
}

/* ── Code blocks ─────────────────────────────────────────────────── */
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
  font-family: "JetBrains Mono", "Fira Code", monospace;
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

/* ── Section cards ───────────────────────────────────────────────── */
.rl-card {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 14px; padding: 1.4rem 1.6rem; margin: 1.6rem 0;
}
.rl-card h4 {
  margin: 0 0 .7rem; color: #fbef8a; font-size: 1rem;
}

/* ── Info pill ───────────────────────────────────────────────────── */
.pill {
  display: inline-block; border-radius: 6px; padding: 2px 9px;
  font-size: 12px; font-weight: 600; letter-spacing: .04em;
}
.pill-green  { background: rgba(123,205,171,.15); color: #7bcdab; border: 1px solid rgba(123,205,171,.3); }
.pill-yellow { background: rgba(251,239,138,.12); color: #fbef8a; border: 1px solid rgba(251,239,138,.3); }
.pill-red    { background: rgba(240,128,128,.12); color: #f08080; border: 1px solid rgba(240,128,128,.3); }

/* ── Sim button ──────────────────────────────────────────────────── */
.sim-btn {
  padding: 8px 20px; border-radius: 7px; border: 1px solid #7bcdab;
  background: #152319; color: #7bcdab; cursor: pointer;
  font-family: inherit; font-size: 13px; transition: all .2s; margin: 4px 3px;
}
.sim-btn:hover:not(:disabled) { background: #7bcdab; color: #19191c; }
.sim-btn:disabled { opacity: .38; cursor: default; }
.sim-btn.danger  { border-color: #f08080; background: rgba(240,128,128,.08); color: #f08080; }
.sim-btn.danger:hover:not(:disabled) { background: #f08080; color: #19191c; }

/* ── Edge case animation ─────────────────────────────────────────── */
.edge-anim {
  background: #111214; border: 1px solid #2e2f35;
  border-radius: 12px; padding: 1.4rem; margin: 1.4rem 0;
}
.edge-timeline {
  position: relative; height: 64px; border-radius: 8px;
  background: #0e0f12; border: 1px solid #2e2f35; overflow: hidden;
  margin: .8rem 0;
}
.edge-marker {
  position: absolute; top: 0; bottom: 0; width: 2px;
  background: rgba(123,205,171,.3);
}
.edge-req {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 10px; height: 10px; border-radius: 50%;
  transition: left .4s ease;
}
.edge-req.ok  { background: #7bcdab; box-shadow: 0 0 6px #7bcdab; }
.edge-req.bad { background: #f08080; box-shadow: 0 0 6px #f08080; }
.edge-label {
  font-size: 11px; color: rgba(255,255,255,.4);
  display: flex; justify-content: space-between; margin-bottom: .3rem;
}

/* ── Token bucket ────────────────────────────────────────────────── */
.bucket-demo {
  background: #111214; border: 1px solid #2e2f35;
  border-radius: 14px; padding: 1.6rem; margin: 1.6rem 0;
}
.bucket-wrap {
  display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap;
}
.bucket-svg-area { flex: 0 0 180px; }
.bucket-info { flex: 1; min-width: 200px; }
.bucket-stat {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; border-bottom: 1px solid #1e1f24; font-size: 13px;
}
.bucket-stat:last-child { border-bottom: none; }
.bucket-stat .label { color: rgba(255,255,255,.5); }
.bucket-stat .value { color: #fbef8a; font-family: "JetBrains Mono", monospace; font-weight: 700; }
.bucket-log {
  background: #0e0f12; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .7rem 1rem; height: 120px; overflow-y: auto;
  font-family: "JetBrains Mono", monospace; font-size: 12px;
  line-height: 1.7; margin-top: 1rem;
}
.bucket-log .ok   { color: #7bcdab; }
.bucket-log .fail { color: #f08080; }
.bucket-log .info { color: rgba(255,255,255,.38); }
.flash-429 {
  display: none; position: fixed; inset: 0; z-index: 9999;
  background: rgba(240,80,80,.18); pointer-events: none;
  animation: flash429 .5s ease forwards;
}
@keyframes flash429 {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}

/* ── Leaky bucket comparison ────────────────────────────────────── */
.two-col {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin: 1.4rem 0;
}
@media (max-width: 620px) { .two-col { grid-template-columns: 1fr; } }
.algo-card {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 12px; padding: 1.2rem;
}
.algo-card h5 { margin: 0 0 .6rem; color: #7bcdab; font-size: .95rem; }
.algo-card p  { font-size: .88rem; line-height: 1.65; color: rgba(255,255,255,.72); margin: 0; }

/* ── Algorithm comparison table ────────────────────────────────── */
.algo-tabs {
  display: flex; gap: 0; border-bottom: 2px solid #2e2f35;
  flex-wrap: wrap; margin-bottom: 0;
}
.algo-tab {
  padding: 9px 18px; background: transparent; border: none;
  border-bottom: 3px solid transparent; margin-bottom: -2px;
  color: rgba(255,255,255,.42); cursor: pointer; font-size: 12px;
  font-family: inherit; transition: all .2s; white-space: nowrap;
}
.algo-tab:hover { color: rgba(255,255,255,.8); }
.algo-tab.active { color: #fbef8a; border-bottom-color: #fbef8a; }
.algo-panel { display: none; padding: 1.2rem 0; }
.algo-panel.active { display: block; }
.compare-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 1.2rem;
}
.compare-table th {
  text-align: left; padding: 8px 14px; color: rgba(255,255,255,.45);
  font-weight: 500; font-size: 11px; text-transform: uppercase;
  letter-spacing: .07em; border-bottom: 1px solid #2e2f35;
}
.compare-table td {
  padding: 9px 14px; border-bottom: 1px solid #1c1d22;
  color: rgba(255,255,255,.78); vertical-align: middle;
}
.compare-table tr:last-child td { border-bottom: none; }
.yes  { color: #7bcdab; font-weight: 700; }
.no   { color: #f08080; font-weight: 700; }
.part { color: #fbef8a; font-weight: 700; }

/* ── Simulation bar ─────────────────────────────────────────────── */
.sim-bar-wrap { margin: 1rem 0; }
.sim-bar-row  {
  display: flex; align-items: center; gap: .7rem; margin: .3rem 0; font-size: 12px;
}
.sim-bar-label { width: 160px; color: rgba(255,255,255,.5); flex-shrink: 0; }
.sim-bar-track {
  flex: 1; height: 18px; background: #111214;
  border: 1px solid #2e2f35; border-radius: 4px; overflow: hidden;
  display: flex;
}
.sim-seg { height: 100%; transition: width .08s; }
.sim-seg.pass { background: #7bcdab; }
.sim-seg.fail { background: #f08080; }
.sim-count { width: 60px; text-align: right; color: rgba(255,255,255,.45); flex-shrink: 0; }

/* ── HTTP response ──────────────────────────────────────────────── */
.http-block {
  background: #111214; border: 1px solid #2e2f35; border-radius: 10px;
  overflow: hidden; margin: 1.2rem 0;
}
.http-status-bar {
  padding: 7px 16px; display: flex; align-items: center; gap: .8rem;
  font-family: "JetBrains Mono", monospace; font-size: 12px;
}
.http-status-bar.ok  { background: rgba(123,205,171,.1); border-bottom: 1px solid rgba(123,205,171,.2); }
.http-status-bar.err { background: rgba(240,128,128,.08); border-bottom: 1px solid rgba(240,128,128,.2); }
.http-status-code { font-size: 15px; font-weight: 700; }
.http-status-bar.ok  .http-status-code { color: #7bcdab; }
.http-status-bar.err .http-status-code { color: #f08080; }
.http-body {
  padding: 14px 20px; font-family: "JetBrains Mono", monospace;
  font-size: 12px; line-height: 1.8; color: rgba(255,255,255,.75);
}
.http-header-name  { color: #fbef8a; }
.http-header-value { color: #7bcdab; }
.http-body-json    { color: #f8c555; }
</style>

## 1. Why Rate Limiting?

Before writing a single line of code, it's worth internalising *why* this problem matters. Rate limiting sits at the intersection of reliability, fairness, and economics.

**Prevent abuse & DDoS** — Without limits, a single misbehaving client (or attacker) can saturate your servers and degrade service for everyone else. A rate limiter is the first line of defence.

**Fair usage** — In a multi-tenant system, one large customer shouldn't be able to monopolise shared resources at the expense of smaller ones.

**Cost control** — Many APIs call downstream paid services (LLMs, SMS, geocoding). A single runaway script can generate a surprise $40,000 cloud bill overnight.

**Real-world examples:**

<div class="rl-card">
<h4>Public API Rate Limits in the Wild</h4>
<table class="compare-table">
<thead><tr><th>Service</th><th>Limit</th><th>Window</th><th>Key</th></tr></thead>
<tbody>
<tr><td>Twitter / X (free tier)</td><td>15 calls</td><td>15 minutes</td><td>App token</td></tr>
<tr><td>Stripe</td><td>100 requests</td><td>1 second</td><td>API key</td></tr>
<tr><td>GitHub REST API</td><td>5 000 requests</td><td>1 hour</td><td>OAuth token</td></tr>
<tr><td>OpenAI (GPT-4o)</td><td>500 requests</td><td>1 minute</td><td>Org + model</td></tr>
<tr><td>Twilio SMS</td><td>1 message/sec</td><td>sustained</td><td>Phone number</td></tr>
</tbody>
</table>
</div>

---

## 2. Level 1 — In-Memory Counter (Single Server)

The simplest possible solution: keep a `HashMap` in RAM. For each user, store the request count and the window start time. At the start of every new minute, reset the counter.

<div class="code-wrap">
<div class="code-lang">Java<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">InMemoryRateLimiter</span> {
    <span class="kw">private</span> <span class="kw">final</span> <span class="ty">Map</span>&lt;<span class="ty">String</span>, <span class="ty">long[]</span>&gt; store <span class="op">=</span> <span class="kw">new</span> <span class="ty">ConcurrentHashMap</span>&lt;&gt;();
    <span class="kw">private</span> <span class="kw">static</span> <span class="kw">final</span> <span class="ty">int</span> <span class="nm">LIMIT</span>  <span class="op">=</span> <span class="nu">100</span>;
    <span class="kw">private</span> <span class="kw">static</span> <span class="kw">final</span> <span class="ty">long</span> <span class="nm">WINDOW</span> <span class="op">=</span> <span class="nu">60_000</span>; <span class="cm">// 1 minute in ms</span>

    <span class="cm">/**
     * Returns true if request is allowed, false if rate-limited.
     * store[userId] = [count, windowStartMs]
     */</span>
    <span class="kw">public synchronized boolean</span> <span class="nm">allow</span>(<span class="ty">String</span> userId) {
        <span class="ty">long</span> now <span class="op">=</span> <span class="ty">System</span>.currentTimeMillis();
        <span class="ty">long[]</span> state <span class="op">=</span> store.computeIfAbsent(userId, k <span class="op">-&gt;</span> <span class="kw">new</span> <span class="ty">long[]</span>{<span class="nu">0</span>, now});

        <span class="kw">if</span> (now <span class="op">-</span> state[<span class="nu">1</span>] <span class="op">&gt;=</span> <span class="nm">WINDOW</span>) {
            state[<span class="nu">0</span>] <span class="op">=</span> <span class="nu">0</span>;      <span class="cm">// reset count</span>
            state[<span class="nu">1</span>] <span class="op">=</span> now;   <span class="cm">// new window start</span>
        }
        <span class="kw">if</span> (state[<span class="nu">0</span>] <span class="op">&lt;</span> <span class="nm">LIMIT</span>) { state[<span class="nu">0</span>]<span class="op">++</span>; <span class="kw">return true</span>; }
        <span class="kw">return false</span>;
    }
}</pre>
</div>

**Problems with this approach:**

- 💀 **State lost on restart** — every deploy wipes the counters; a user who made 99 requests just before a rolling restart gets a free 100 more.
- 💀 **Doesn't work across servers** — with 10 API servers each keeping independent state, a user can make 100 requests per server = 1,000 requests per minute total.
- ✅ Zero latency (in-process)
- ✅ Fine for development / single-instance tools

---

## 3. Level 2 — Fixed Window Counter (Redis)

Move the counter to Redis. `INCR` is atomic; `EXPIRE` sets the TTL so the key auto-deletes at the end of the window.

<div class="code-wrap">
<div class="code-lang">Python<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> redis, time, math

r <span class="op">=</span> redis.<span class="ty">Redis</span>(host<span class="op">=</span><span class="st">'localhost'</span>)

<span class="kw">def</span> <span class="nm">allow_fixed_window</span>(user_id: <span class="ty">str</span>, limit: <span class="ty">int</span> <span class="op">=</span> <span class="nu">100</span>) <span class="op">-&gt;</span> <span class="ty">bool</span>:
    window <span class="op">=</span> math.floor(time.time() <span class="op">/</span> <span class="nu">60</span>)          <span class="cm"># current 1-minute window</span>
    key    <span class="op">=</span> <span class="st">"rl:"</span> <span class="op">+</span> user_id <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> <span class="ty">str</span>(window) <span class="cm"># e.g. "rl:u42:28591234"</span>

    pipe <span class="op">=</span> r.pipeline()
    pipe.incr(key)
    pipe.expire(key, <span class="nu">60</span>)
    count, _ <span class="op">=</span> pipe.execute()

    <span class="kw">return</span> count <span class="op">&lt;=</span> limit</pre>
</div>

Simple, fast, and works across any number of servers. But there is a nasty edge case.

### The Boundary Spike Problem

<div class="edge-anim" id="edgeAnim">
  <div class="edge-label">
    <span>t = 0:58</span><span>t = 1:00 (window boundary)</span><span>t = 1:02</span>
  </div>
  <div class="edge-timeline" id="edgeTimeline"></div>
  <div style="margin-top:.6rem;font-size:12px;color:rgba(255,255,255,.5);">
    Window A (0:00–1:00) &nbsp;|&nbsp; Window B (1:00–2:00)
  </div>
  <div style="margin-top:.8rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;">
    <button class="sim-btn" onclick="runEdgeAnim()">▶ Animate spike</button>
    <span id="edgeStatus" style="font-size:13px;color:rgba(255,255,255,.55);">
      A user sends 100 requests in the last 2s of window A, then 100 more in the first 2s of window B — 200 requests in 4 seconds, both windows report ≤ 100.
    </span>
  </div>
</div>

{: class="marginalia" }
The sliding window counter<br/>uses ~10× less memory than<br/>the sliding window log for<br/>the same accuracy — that's<br/>the **production sweet spot**.

This is the fundamental flaw of fixed-window counting: a client can double-spend by straddling a window boundary.

---

## 4. Level 3 — Sliding Window Log

Instead of a counter, store the **timestamp of every request** in a sorted set. On each new request:
1. Remove all timestamps older than `now - 60s`
2. Count remaining entries
3. If count < limit → add timestamp and allow; else deny

<div class="code-wrap">
<div class="code-lang">Python / Redis<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">allow_sliding_log</span>(user_id: <span class="ty">str</span>, limit: <span class="ty">int</span> <span class="op">=</span> <span class="nu">100</span>) <span class="op">-&gt;</span> <span class="ty">bool</span>:
    now    <span class="op">=</span> time.time()
    cutoff <span class="op">=</span> now <span class="op">-</span> <span class="nu">60</span>
    key    <span class="op">=</span> <span class="st">"rl_log:"</span> <span class="op">+</span> user_id

    <span class="kw">with</span> r.pipeline() <span class="kw">as</span> pipe:
        pipe.zremrangebyscore(key, <span class="nu">0</span>, cutoff)   <span class="cm"># remove old entries</span>
        pipe.zcard(key)                            <span class="cm"># count remaining</span>
        pipe.zadd(key, {<span class="ty">str</span>(now): now})          <span class="cm"># add current timestamp</span>
        pipe.expire(key, <span class="nu">70</span>)                     <span class="cm"># TTL safety net</span>
        _, count, _, _ <span class="op">=</span> pipe.execute()

    <span class="kw">if</span> count <span class="op">&gt;</span> limit:
        r.zrem(key, <span class="ty">str</span>(now))   <span class="cm"># undo the add — request denied</span>
        <span class="kw">return False</span>
    <span class="kw">return True</span></pre>
</div>

**Accuracy:** Perfect — no boundary spike problem.

**Memory cost:** Each request stores a full 64-bit timestamp. A user making 100 req/min stores 100 entries. With 1 million users at the limit, that's ~800 MB just for timestamps. At scale this becomes painful.

---

## 5. Level 4 — Sliding Window Counter (Recommended)

The elegant middle ground: keep only **two counters** (current window + previous window), then compute a weighted estimate of the rolling window count.

<div class="rl-card">
<h4>The Weighted Formula</h4>
<p style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#7bcdab;margin:.3rem 0 .8rem;">
  rolling_count = prev_count × overlap_ratio + curr_count
</p>
<p style="color:rgba(255,255,255,.7);font-size:.9rem;line-height:1.7;margin:0;">
  <strong style="color:#fbef8a;">overlap_ratio</strong> = the fraction of the previous window that still falls inside our 60-second lookback.<br/>
  If we're 15 seconds into the current window, overlap_ratio = (60 − 15) / 60 = 0.75.
</p>
</div>

**Example:** User made 80 requests in the previous minute. We're 20 seconds into the current minute and they've made 30 requests so far.

`rolling_count = 80 × (40/60) + 30 = 53.3 + 30 = 83.3 → allowed (< 100)`

<div class="code-wrap">
<div class="code-lang">Python / Redis<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">allow_sliding_counter</span>(user_id: <span class="ty">str</span>, limit: <span class="ty">int</span> <span class="op">=</span> <span class="nu">100</span>) <span class="op">-&gt;</span> <span class="ty">bool</span>:
    now         <span class="op">=</span> time.time()
    window_size <span class="op">=</span> <span class="nu">60.0</span>
    curr_window <span class="op">=</span> math.floor(now <span class="op">/</span> window_size)
    prev_window <span class="op">=</span> curr_window <span class="op">-</span> <span class="nu">1</span>
    elapsed     <span class="op">=</span> now <span class="op">-</span> (curr_window <span class="op">*</span> window_size)
    overlap     <span class="op">=</span> (window_size <span class="op">-</span> elapsed) <span class="op">/</span> window_size

    curr_key <span class="op">=</span> <span class="st">"rl:"</span> <span class="op">+</span> user_id <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> <span class="ty">str</span>(curr_window)
    prev_key <span class="op">=</span> <span class="st">"rl:"</span> <span class="op">+</span> user_id <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> <span class="ty">str</span>(prev_window)

    pipe <span class="op">=</span> r.pipeline()
    pipe.get(prev_key)
    pipe.incr(curr_key)
    pipe.expire(curr_key, <span class="nu">120</span>)
    prev_count_raw, curr_count, _ <span class="op">=</span> pipe.execute()

    prev_count   <span class="op">=</span> <span class="ty">int</span>(prev_count_raw) <span class="kw">if</span> prev_count_raw <span class="kw">else</span> <span class="nu">0</span>
    rolling      <span class="op">=</span> prev_count <span class="op">*</span> overlap <span class="op">+</span> curr_count

    <span class="kw">if</span> rolling <span class="op">&gt;</span> limit:
        r.decr(curr_key)   <span class="cm"># undo the increment — request denied</span>
        <span class="kw">return False</span>
    <span class="kw">return True</span></pre>
</div>

Memory: 2 keys per user (each storing a single integer). **~10,000× less memory than the sliding log** at scale, with accuracy typically within 0.1% of the true rolling count.

---

## 6. Level 5 — Token Bucket (Interactive Demo)

Token bucket is the algorithm used by most major API gateways (AWS API Gateway, Nginx, Kong). The intuition:

- A bucket holds up to `capacity` tokens
- Tokens are added at `refill_rate` tokens/second
- Each request consumes 1 token
- If the bucket is empty → **429 Too Many Requests**
- The bucket can accumulate tokens up to `capacity`, enabling **burst handling**

<div class="bucket-demo" id="bucketDemo">
  <h4 style="margin:0 0 1rem;color:#fbef8a;">🪣 Token Bucket — Live Demo</h4>
  <div class="bucket-wrap">
    <div class="bucket-svg-area">
      <svg id="bucketSvg" viewBox="0 0 180 220" style="width:100%;max-width:180px;">
        <!-- Bucket outline -->
        <path d="M30 60 L15 190 L165 190 L150 60 Z"
              fill="none" stroke="#3a3b40" stroke-width="2.5" stroke-linejoin="round"/>
        <!-- Liquid fill (animated) -->
        <clipPath id="bucketClip">
          <path d="M30 60 L15 190 L165 190 L150 60 Z"/>
        </clipPath>
        <rect id="tokenFill" x="0" y="0" width="180" height="220"
              fill="#7bcdab" clip-path="url(#bucketClip)" opacity="0.55"
              style="transition: y 0.3s ease, height 0.3s ease;"/>
        <!-- Token count text -->
        <text id="tokenCountSvg" x="90" y="135"
              text-anchor="middle" fill="#fbef8a"
              font-family="JetBrains Mono, monospace"
              font-size="28" font-weight="700">10</text>
        <text x="90" y="156" text-anchor="middle"
              fill="rgba(255,255,255,0.4)" font-size="11" font-family="inherit">tokens</text>
        <!-- Refill arrow -->
        <text x="90" y="30" text-anchor="middle"
              fill="#7bcdab" font-size="11" font-family="inherit">▼ +1 / sec</text>
        <!-- Drain arrow -->
        <text x="90" y="210" text-anchor="middle"
              fill="rgba(255,255,255,0.25)" font-size="10" font-family="inherit">requests consume tokens</text>
      </svg>
    </div>
    <div class="bucket-info">
      <div class="bucket-stat">
        <span class="label">Tokens remaining</span>
        <span class="value" id="tokenCountDisplay">10 / 10</span>
      </div>
      <div class="bucket-stat">
        <span class="label">Refill rate</span>
        <span class="value">1 token / sec</span>
      </div>
      <div class="bucket-stat">
        <span class="label">Capacity</span>
        <span class="value">10 tokens</span>
      </div>
      <div class="bucket-stat">
        <span class="label">Total allowed</span>
        <span class="value" id="totalAllowed">0</span>
      </div>
      <div class="bucket-stat">
        <span class="label">Total rejected</span>
        <span class="value" id="totalRejected" style="color:#f08080;">0</span>
      </div>
      <div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="sim-btn" onclick="bucketRequest(1)">Send 1 Request</button>
        <button class="sim-btn" onclick="bucketRequest(5)">Send 5 Burst</button>
        <button class="sim-btn danger" onclick="bucketRequest(15)">Send 15 (over limit)</button>
      </div>
      <div class="bucket-log" id="bucketLog"></div>
    </div>
  </div>
</div>

<div id="flash429" class="flash-429"></div>

{: class="marginalia" }
Token bucket allows bursting,<br/>which is usually what you want<br/>for APIs — a legitimate user<br/>doing a one-time large batch<br/>shouldn't be penalised the<br/>same way as a sustained<br/>abuser.

---

## 7. Level 6 — Leaky Bucket

Leaky bucket is the mirror image of token bucket. Instead of tokens, think of a queue with a hole at the bottom that drains at a fixed rate.

<div class="two-col">
<div class="algo-card">
<h5>🪣 Token Bucket</h5>
<p>Tokens accumulate when idle. Burst requests consume banked tokens. Allows short bursts above the average rate. Good for user-facing APIs where occasional spikes are legitimate.</p>
<p style="margin-top:.6rem;"><span class="pill pill-green">Burst-friendly</span></p>
</div>
<div class="algo-card">
<h5>🚰 Leaky Bucket</h5>
<p>Requests enter a FIFO queue. Processed at a fixed drain rate. No bursting — requests are smoothed to a constant output rate. Ideal for metered billing or downstream services that can't handle spikes.</p>
<p style="margin-top:.6rem;"><span class="pill pill-red">No bursting</span> <span class="pill pill-yellow">Smooth output</span></p>
</div>
</div>

<div class="code-wrap">
<div class="code-lang">Python<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">LeakyBucket</span>:
    <span class="kw">def</span> <span class="nm">__init__</span>(self, capacity: <span class="ty">int</span>, drain_rate: <span class="ty">float</span>):
        self.capacity   <span class="op">=</span> capacity    <span class="cm"># max queue depth</span>
        self.drain_rate <span class="op">=</span> drain_rate  <span class="cm"># requests processed per second</span>
        self.queue      <span class="op">=</span> <span class="nu">0</span>           <span class="cm"># current queue depth</span>
        self.last_drain <span class="op">=</span> time.time()

    <span class="kw">def</span> <span class="nm">_drain</span>(self):
        now      <span class="op">=</span> time.time()
        elapsed  <span class="op">=</span> now <span class="op">-</span> self.last_drain
        drained  <span class="op">=</span> elapsed <span class="op">*</span> self.drain_rate
        self.queue <span class="op">=</span> max(<span class="nu">0</span>, self.queue <span class="op">-</span> drained)
        self.last_drain <span class="op">=</span> now

    <span class="kw">def</span> <span class="nm">allow</span>(self) <span class="op">-&gt;</span> <span class="ty">bool</span>:
        self._drain()
        <span class="kw">if</span> self.queue <span class="op">&lt;</span> self.capacity:
            self.queue <span class="op">+=</span> <span class="nu">1</span>
            <span class="kw">return True</span>
        <span class="kw">return False</span>   <span class="cm"># queue full — drop request</span></pre>
</div>

---

## 8. Level 7 — Distributed Rate Limiting

This is where the interview question gets interesting. With 10 API servers, naive approaches fail:

**Approach A — Sticky sessions:** Route each user to the same server using consistent hashing. Simple, but defeats load balancing; one hot server is a bottleneck.

**Approach B — Centralized Redis:** All servers talk to a single Redis. Works, but Redis becomes a single point of failure and adds 1–2ms of network latency to every request.

**Approach C — Redis Cluster + Lua atomic script:** Use a Redis Cluster (3 primaries, 3 replicas). The critical insight: the check-and-increment must be **atomic**. A Lua script in Redis runs atomically — no other command can interleave.

{: class="marginalia" }
Lua scripts in Redis are<br/>**atomic** — this is crucial<br/>for rate limiting. Without<br/>atomicity you have a race<br/>condition where two requests<br/>can both pass a limit of 1.

<div class="code-wrap">
<div class="code-lang">Lua (Redis EVALSHA)<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">-- rate_limit.lua
-- KEYS[1] = rate limit key  (e.g. "rl:u42:28591234")
-- ARGV[1] = limit            (e.g. "100")
-- ARGV[2] = window_seconds   (e.g. "60")
-- Returns: {allowed, current_count, ttl}</span>

<span class="kw">local</span> key   <span class="op">=</span> KEYS[<span class="nu">1</span>]
<span class="kw">local</span> limit <span class="op">=</span> <span class="ty">tonumber</span>(ARGV[<span class="nu">1</span>])
<span class="kw">local</span> ttl   <span class="op">=</span> <span class="ty">tonumber</span>(ARGV[<span class="nu">2</span>])

<span class="kw">local</span> count <span class="op">=</span> <span class="ty">redis.call</span>(<span class="st">'INCR'</span>, key)

<span class="kw">if</span> count <span class="op">==</span> <span class="nu">1</span> <span class="kw">then</span>
    <span class="cm">-- First request in this window — set expiry</span>
    <span class="ty">redis.call</span>(<span class="st">'EXPIRE'</span>, key, ttl)
<span class="kw">end</span>

<span class="kw">if</span> count <span class="op">&gt;</span> limit <span class="kw">then</span>
    <span class="cm">-- Undo the increment — we must not let it drift upward</span>
    <span class="ty">redis.call</span>(<span class="st">'DECR'</span>, key)
    <span class="kw">return</span> {<span class="nu">0</span>, count <span class="op">-</span> <span class="nu">1</span>, <span class="ty">redis.call</span>(<span class="st">'TTL'</span>, key)}
<span class="kw">end</span>

<span class="kw">return</span> {<span class="nu">1</span>, count, <span class="ty">redis.call</span>(<span class="st">'TTL'</span>, key)}</pre>
</div>

<div class="code-wrap">
<div class="code-lang">Python — loading and calling the Lua script<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> redis, math, time

r <span class="op">=</span> redis.<span class="ty">Redis</span>(host<span class="op">=</span><span class="st">'redis-cluster'</span>)

<span class="cm"># Load once at startup — returns a SHA hash</span>
with <span class="ty">open</span>(<span class="st">'rate_limit.lua'</span>) <span class="kw">as</span> f:
    LUA_SHA <span class="op">=</span> r.script_load(f.read())

<span class="kw">def</span> <span class="nm">allow</span>(user_id: <span class="ty">str</span>, limit: <span class="ty">int</span> <span class="op">=</span> <span class="nu">100</span>) <span class="op">-&gt;</span> <span class="ty">tuple</span>[<span class="ty">bool</span>, <span class="ty">int</span>, <span class="ty">int</span>]:
    window <span class="op">=</span> math.floor(time.time() <span class="op">/</span> <span class="nu">60</span>)
    key    <span class="op">=</span> <span class="st">"rl:"</span> <span class="op">+</span> user_id <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> <span class="ty">str</span>(window)
    <span class="cm"># evalsha is ~20% faster than eval — script is already compiled</span>
    allowed, count, ttl <span class="op">=</span> r.evalsha(LUA_SHA, <span class="nu">1</span>, key, limit, <span class="nu">60</span>)
    <span class="kw">return</span> <span class="ty">bool</span>(allowed), <span class="ty">int</span>(count), <span class="ty">int</span>(ttl)</pre>
</div>

**Approach D — Local approximation + async sync:** Each server keeps a local counter. Every 100ms, all servers gossip their deltas to a central store and pull the global total. A request is allowed if `local_count + last_known_global < limit`. This trades perfect accuracy for near-zero added latency. Netflix uses a variant of this.

---

## 9. Level 8 — Rate Limiting by Different Keys

Real systems enforce limits at multiple granularities simultaneously.

<div class="code-wrap">
<div class="code-lang">Key schema<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># By user ID (most common)</span>
<span class="st">rate_limit:user:{userId}:{window}</span>

<span class="cm"># By IP address (unauthenticated traffic)</span>
<span class="st">rate_limit:ip:{ipAddr}:{window}</span>

<span class="cm"># By API key (for partner integrations)</span>
<span class="st">rate_limit:apikey:{hashedKey}:{window}</span>

<span class="cm"># By endpoint (prevent expensive endpoints from being hammered)</span>
<span class="st">rate_limit:endpoint:{endpoint}:{window}</span>

<span class="cm"># Hierarchical: user + specific endpoint</span>
<span class="st">rate_limit:user:{userId}:endpoint:{endpoint}:{window}</span>

<span class="cm"># Global (platform-wide circuit breaker)</span>
<span class="st">rate_limit:global:{window}</span></pre>
</div>

<div class="code-wrap">
<div class="code-lang">Python — hierarchical rate limiting<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">allow_hierarchical</span>(user_id: <span class="ty">str</span>, endpoint: <span class="ty">str</span>, ip: <span class="ty">str</span>) <span class="op">-&gt;</span> <span class="ty">bool</span>:
    <span class="cm"># All three must pass — deny on the first failure</span>
    checks <span class="op">=</span> [
        (ip,                   <span class="nu">30</span>),   <span class="cm"># 30/min per IP (unauthenticated guard)</span>
        (user_id,             <span class="nu">100</span>),   <span class="cm"># 100/min per user (main SLA)</span>
        (user_id <span class="op">+</span> endpoint,  <span class="nu">20</span>),   <span class="cm"># 20/min per user per endpoint</span>
    ]
    <span class="kw">for</span> key_suffix, limit <span class="kw">in</span> checks:
        allowed, _, _ <span class="op">=</span> allow(key_suffix, limit)
        <span class="kw">if not</span> allowed:
            <span class="kw">return False</span>
    <span class="kw">return True</span></pre>
</div>

---

## 10. Interactive: Algorithm Comparison

<div style="background:#1a1b1f;border:1px solid #2e2f35;border-radius:14px;padding:1.4rem;margin:1.4rem 0;">
<div class="algo-tabs" id="algoTabs">
  <button class="algo-tab active" onclick="switchAlgo(0)">Fixed Window</button>
  <button class="algo-tab" onclick="switchAlgo(1)">Sliding Log</button>
  <button class="algo-tab" onclick="switchAlgo(2)">Sliding Counter</button>
  <button class="algo-tab" onclick="switchAlgo(3)">Token Bucket</button>
</div>

<div class="algo-panel active" id="algoPanel0">
<table class="compare-table">
<thead><tr><th>Property</th><th>Value</th></tr></thead>
<tbody>
<tr><td>Memory per user</td><td>O(1) — 1 integer key</td></tr>
<tr><td>Time complexity</td><td>O(1)</td></tr>
<tr><td>Allows bursting</td><td><span class="yes">Yes</span> (at window boundary)</td></tr>
<tr><td>Boundary spike problem</td><td><span class="no">Yes — up to 2× limit in 1s</span></td></tr>
<tr><td>Redis operations</td><td>2 (INCR + EXPIRE)</td></tr>
<tr><td>Production use</td><td>Simple internal tools, batch jobs</td></tr>
</tbody>
</table>
<p style="color:rgba(255,255,255,.6);font-size:.88rem;line-height:1.65;">
The simplest distributed approach. Works well when brief spikes at window boundaries are acceptable and you prioritise operational simplicity. The 2× burst window is often not a problem for internal APIs.
</p>
</div>

<div class="algo-panel" id="algoPanel1">
<table class="compare-table">
<thead><tr><th>Property</th><th>Value</th></tr></thead>
<tbody>
<tr><td>Memory per user</td><td>O(requests/window) — 1 timestamp per request</td></tr>
<tr><td>Time complexity</td><td>O(log N) — sorted set operations</td></tr>
<tr><td>Allows bursting</td><td><span class="yes">Yes</span> (accurate rolling window)</td></tr>
<tr><td>Boundary spike problem</td><td><span class="yes">None — true sliding window</span></td></tr>
<tr><td>Redis operations</td><td>4 (ZREMRANGE + ZCARD + ZADD + EXPIRE)</td></tr>
<tr><td>Production use</td><td>When accuracy is critical; low-traffic premium APIs</td></tr>
</tbody>
</table>
<p style="color:rgba(255,255,255,.6);font-size:.88rem;line-height:1.65;">
Perfectly accurate but costly at scale. Storing a timestamp per request means at 100 req/min × 1M users = 100M Redis entries just for rate limit logs. Most systems can't afford this overhead.
</p>
</div>

<div class="algo-panel" id="algoPanel2">
<table class="compare-table">
<thead><tr><th>Property</th><th>Value</th></tr></thead>
<tbody>
<tr><td>Memory per user</td><td>O(1) — 2 integer keys</td></tr>
<tr><td>Time complexity</td><td>O(1)</td></tr>
<tr><td>Allows bursting</td><td><span class="yes">Yes</span> (within rolling window)</td></tr>
<tr><td>Boundary spike problem</td><td><span class="part">~0.1% error</span> — statistically negligible</td></tr>
<tr><td>Redis operations</td><td>3 (GET prev + INCR curr + EXPIRE)</td></tr>
<tr><td>Production use</td><td><strong style="color:#fbef8a;">Recommended default</strong> — Cloudflare, Figma</td></tr>
</tbody>
</table>
<p style="color:rgba(255,255,255,.6);font-size:.88rem;line-height:1.65;">
The sweet spot: near-perfect accuracy with O(1) memory. The weighted formula introduces a tiny approximation error (~0.1%) in exchange for 10,000× less memory than the log approach. This is what you should propose in most interviews.
</p>
</div>

<div class="algo-panel" id="algoPanel3">
<table class="compare-table">
<thead><tr><th>Property</th><th>Value</th></tr></thead>
<tbody>
<tr><td>Memory per user</td><td>O(1) — count + last refill timestamp</td></tr>
<tr><td>Time complexity</td><td>O(1)</td></tr>
<tr><td>Allows bursting</td><td><span class="yes">Yes — by design</span></td></tr>
<tr><td>Boundary spike problem</td><td><span class="yes">None</span> — continuous time model</td></tr>
<tr><td>Redis operations</td><td>1 Lua script (atomic GET+SET)</td></tr>
<tr><td>Production use</td><td>AWS API Gateway, Kong, Nginx limit_req</td></tr>
</tbody>
</table>
<p style="color:rgba(255,255,255,.6);font-size:.88rem;line-height:1.65;">
Best for traffic shaping. Burst capacity is explicit and controlled. Ideal when you want to allow a user to make 10 requests immediately after a long idle period, but not sustain 10× the limit indefinitely.
</p>
</div>

<div style="border-top:1px solid #2e2f35;margin-top:1.2rem;padding-top:1.2rem;">
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin-bottom:.8rem;">
  <span style="font-size:13px;color:rgba(255,255,255,.6);">Simulation: 150 requests in 60s (limit = 100/min, 10 req burst at t=58s)</span>
  <button class="sim-btn" onclick="runSimulation()">▶ Run Simulation</button>
</div>
<div class="sim-bar-wrap" id="simBars">
  <div class="sim-bar-row">
    <span class="sim-bar-label">Fixed Window</span>
    <div class="sim-bar-track" id="simBar0"></div>
    <span class="sim-count" id="simCount0">0/150</span>
  </div>
  <div class="sim-bar-row">
    <span class="sim-bar-label">Sliding Log</span>
    <div class="sim-bar-track" id="simBar1"></div>
    <span class="sim-count" id="simCount1">0/150</span>
  </div>
  <div class="sim-bar-row">
    <span class="sim-bar-label">Sliding Counter</span>
    <div class="sim-bar-track" id="simBar2"></div>
    <span class="sim-count" id="simCount2">0/150</span>
  </div>
  <div class="sim-bar-row">
    <span class="sim-bar-label">Token Bucket</span>
    <div class="sim-bar-track" id="simBar3"></div>
    <span class="sim-count" id="simCount3">0/150</span>
  </div>
</div>
</div>
</div>

---

## 11. Response Headers — Telling Clients What Happened

{: class="marginalia" }
`Retry-After` is the most<br/>important header — a good<br/>client will back off and<br/>retry after that interval<br/>rather than hammering<br/>the server and making<br/>things worse.

A good rate limiter communicates its state to clients through standardised headers. This enables clients to self-throttle and implement exponential backoff correctly.

**Allowed request (200 OK):**

<div class="http-block">
<div class="http-status-bar ok">
  <span class="http-status-code">200</span>
  <span style="color:rgba(255,255,255,.5);">OK</span>
</div>
<div class="http-body">
<span class="http-header-name">X-RateLimit-Limit</span>: <span class="http-header-value">100</span><br/>
<span class="http-header-name">X-RateLimit-Remaining</span>: <span class="http-header-value">73</span><br/>
<span class="http-header-name">X-RateLimit-Reset</span>: <span class="http-header-value">1713261600</span>  <span style="color:rgba(255,255,255,.3);"># Unix epoch of window reset</span><br/>
<span class="http-header-name">Content-Type</span>: <span class="http-header-value">application/json</span>
</div>
</div>

**Rate-limited request (429 Too Many Requests):**

<div class="http-block">
<div class="http-status-bar err">
  <span class="http-status-code">429</span>
  <span style="color:rgba(255,255,255,.5);">Too Many Requests</span>
</div>
<div class="http-body">
<span class="http-header-name">X-RateLimit-Limit</span>: <span class="http-header-value">100</span><br/>
<span class="http-header-name">X-RateLimit-Remaining</span>: <span class="http-header-value">0</span><br/>
<span class="http-header-name">X-RateLimit-Reset</span>: <span class="http-header-value">1713261600</span><br/>
<span class="http-header-name">Retry-After</span>: <span class="http-header-value">37</span>  <span style="color:rgba(255,255,255,.3);"># seconds until window resets</span><br/>
<span class="http-header-name">Content-Type</span>: <span class="http-header-value">application/json</span><br/>
<br/>
<span class="http-body-json">{</span><br/>
<span class="http-body-json">  "error": "rate_limit_exceeded",</span><br/>
<span class="http-body-json">  "message": "Too many requests. Retry after 37 seconds.",</span><br/>
<span class="http-body-json">  "limit": 100,</span><br/>
<span class="http-body-json">  "window": "60s"</span><br/>
<span class="http-body-json">}</span>
</div>
</div>

<div class="code-wrap">
<div class="code-lang">Python / FastAPI middleware<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">from</span> fastapi <span class="kw">import</span> <span class="ty">Request</span>, <span class="ty">Response</span>
<span class="kw">from</span> starlette.middleware.base <span class="kw">import</span> <span class="ty">BaseHTTPMiddleware</span>

<span class="kw">class</span> <span class="ty">RateLimitMiddleware</span>(<span class="ty">BaseHTTPMiddleware</span>):
    <span class="kw">async def</span> <span class="nm">dispatch</span>(self, request: <span class="ty">Request</span>, call_next) <span class="op">-&gt;</span> <span class="ty">Response</span>:
        user_id  <span class="op">=</span> request.headers.get(<span class="st">"X-User-Id"</span>, request.client.host)
        allowed, count, ttl <span class="op">=</span> allow(user_id)

        <span class="kw">if not</span> allowed:
            <span class="kw">return</span> <span class="ty">Response</span>(
                content<span class="op">=</span><span class="st">'{"error":"rate_limit_exceeded"}'</span>,
                status_code<span class="op">=</span><span class="nu">429</span>,
                headers<span class="op">=</span>{
                    <span class="st">"X-RateLimit-Limit"</span>:     <span class="st">"100"</span>,
                    <span class="st">"X-RateLimit-Remaining"</span>: <span class="st">"0"</span>,
                    <span class="st">"Retry-After"</span>:           <span class="ty">str</span>(ttl),
                    <span class="st">"Content-Type"</span>:          <span class="st">"application/json"</span>,
                }
            )

        response <span class="op">=</span> <span class="kw">await</span> call_next(request)
        response.headers[<span class="st">"X-RateLimit-Limit"</span>]     <span class="op">=</span> <span class="st">"100"</span>
        response.headers[<span class="st">"X-RateLimit-Remaining"</span>] <span class="op">=</span> <span class="ty">str</span>(<span class="nu">100</span> <span class="op">-</span> count)
        response.headers[<span class="st">"X-RateLimit-Reset"</span>]     <span class="op">=</span> <span class="ty">str</span>(<span class="ty">int</span>(time.time()) <span class="op">+</span> ttl)
        <span class="kw">return</span> response</pre>
</div>

---

## The Interview Answer

If asked "Design a rate limiter" in a system design interview, here is the progression to walk through:

1. **Clarify** — per-user or per-IP? What granularity (req/sec, req/min, req/day)? Single server or distributed? Hard limit or soft?
2. **Start simple** — in-memory HashMap. Acknowledge its limitations immediately.
3. **Evolve to Redis** — INCR + EXPIRE. Mention atomicity.
4. **Identify the edge case** — fixed window boundary spike. Propose sliding window counter.
5. **Discuss Token Bucket** — for burst-tolerant systems. Mention leaky bucket as the smoothed alternative.
6. **Address distribution** — Redis Cluster + Lua script for atomicity. Mention gossip/local-approx as the high-performance alternative.
7. **Round off** — key schema, response headers, monitoring (track rejection rates per user).

The sliding window counter + Redis Cluster + Lua is the answer that will impress most interviewers. It is O(1) memory, near-perfect accuracy, distributed, and atomic.

---

<script>
/* ── Copy button ─────────────────────────────────────────────── */
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}

/* ── Algorithm tabs ──────────────────────────────────────────── */
function switchAlgo(idx) {
  var tabs   = document.querySelectorAll('#algoTabs .algo-tab');
  var panels = document.querySelectorAll('.algo-panel');
  tabs.forEach(function(t, i) { t.classList.toggle('active', i === idx); });
  panels.forEach(function(p, i) { p.classList.toggle('active', i === idx); });
}

/* ── Edge-case animation ─────────────────────────────────────── */
function runEdgeAnim() {
  var tl = document.getElementById('edgeTimeline');
  tl.innerHTML = '';

  /* window boundary marker at 50% */
  var mk = document.createElement('div');
  mk.className = 'edge-marker';
  mk.style.left = '50%';
  tl.appendChild(mk);

  /* 100 green dots before boundary, 100 red dots after */
  for (var i = 0; i < 20; i++) {
    (function(idx) {
      setTimeout(function() {
        var dot = document.createElement('div');
        dot.className = 'edge-req ok';
        var pct = 25 + (idx / 20) * 23;
        dot.style.left = pct + '%';
        tl.appendChild(dot);
      }, idx * 30);
    })(i);
  }
  for (var j = 0; j < 20; j++) {
    (function(jdx) {
      setTimeout(function() {
        var dot = document.createElement('div');
        dot.className = 'edge-req bad';
        var pct = 51 + (jdx / 20) * 24;
        dot.style.left = pct + '%';
        tl.appendChild(dot);
      }, 700 + jdx * 30);
    })(j);
  }

  document.getElementById('edgeStatus').textContent =
    'Window A: 100 requests just before boundary ✓ | Window B: 100 more just after ✓ — ' +
    '200 requests pass in ~4 seconds!';
}

/* ── Token Bucket demo ───────────────────────────────────────── */
var _tbTokens  = 10;
var _tbCap     = 10;
var _tbAllowed = 0;
var _tbDenied  = 0;

function updateBucketUI() {
  var pct  = _tbTokens / _tbCap;
  /* SVG fill: bucket interior runs from y≈62 to y≈188 (height 126px) */
  var fillH = Math.max(0, pct * 126);
  var fillY = 188 - fillH;
  var fill  = document.getElementById('tokenFill');
  if (fill) { fill.setAttribute('y', fillY); fill.setAttribute('height', fillH); }

  var cnt = document.getElementById('tokenCountSvg');
  if (cnt) cnt.textContent = Math.floor(_tbTokens);

  var disp = document.getElementById('tokenCountDisplay');
  if (disp) disp.textContent = Math.floor(_tbTokens) + ' / ' + _tbCap;

  var ta = document.getElementById('totalAllowed');
  var tr = document.getElementById('totalRejected');
  if (ta) ta.textContent = _tbAllowed;
  if (tr) tr.textContent = _tbDenied;
}

function bucketLog(msg, cls) {
  var log  = document.getElementById('bucketLog');
  if (!log) return;
  var span = document.createElement('div');
  span.className = cls;
  var ts   = new Date().toLocaleTimeString('en-GB', {hour12: false});
  span.textContent = ts + '  ' + msg;
  log.appendChild(span);
  log.scrollTop = log.scrollHeight;
}

function flash429() {
  var el = document.getElementById('flash429');
  if (!el) return;
  el.style.display = 'block';
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'flash429 .5s ease forwards';
  setTimeout(function() { el.style.display = 'none'; }, 520);
}

function bucketRequest(n) {
  for (var i = 0; i < n; i++) {
    if (_tbTokens >= 1) {
      _tbTokens -= 1;
      _tbAllowed++;
      bucketLog('Request #' + _tbAllowed + ' allowed  (tokens: ' + Math.floor(_tbTokens) + ')', 'ok');
    } else {
      _tbDenied++;
      flash429();
      bucketLog('Request DENIED → 429 Too Many Requests', 'fail');
    }
  }
  updateBucketUI();
}

/* refill 1 token/sec */
setInterval(function() {
  if (_tbTokens < _tbCap) {
    _tbTokens = Math.min(_tbCap, _tbTokens + 1);
    updateBucketUI();
    var log = document.getElementById('bucketLog');
    if (log && log.childElementCount < 2) {
      bucketLog('Refilled  (tokens: ' + Math.floor(_tbTokens) + ')', 'info');
    }
  }
}, 1000);

updateBucketUI();

/* ── Algorithm simulation ────────────────────────────────────── */
function runSimulation() {
  /*
   * Simulate 150 requests over 60 virtual seconds.
   * Requests 1-90 arrive at t=0..55s (uniform).
   * Requests 91-100 arrive at t=58s (burst at boundary).
   * Requests 101-150 arrive at t=60-65s (new window).
   */
  var reqs = [];
  for (var i = 0; i < 90; i++)  reqs.push({ t: i * (55 / 90) });
  for (var j = 0; j < 10; j++)  reqs.push({ t: 58 + j * 0.1 });
  for (var k = 0; k < 50; k++)  reqs.push({ t: 60 + k * 0.1 });

  var results = [
    simulateFixedWindow(reqs),
    simulateSlidingLog(reqs),
    simulateSlidingCounter(reqs),
    simulateTokenBucket(reqs),
  ];

  for (var alg = 0; alg < 4; alg++) {
    renderSimBar(alg, results[alg]);
  }
}

function simulateFixedWindow(reqs) {
  var limit = 100;
  var windowCounts = {};
  var out = [];
  reqs.forEach(function(r) {
    var w = Math.floor(r.t / 60);
    if (!windowCounts[w]) windowCounts[w] = 0;
    windowCounts[w]++;
    out.push(windowCounts[w] <= limit);
  });
  return out;
}

function simulateSlidingLog(reqs) {
  var limit = 100;
  var log = [];
  return reqs.map(function(r) {
    var cutoff = r.t - 60;
    log = log.filter(function(ts) { return ts > cutoff; });
    if (log.length < limit) { log.push(r.t); return true; }
    return false;
  });
}

function simulateSlidingCounter(reqs) {
  var limit = 100;
  var windows = {};
  return reqs.map(function(r) {
    var cw    = Math.floor(r.t / 60);
    var pw    = cw - 1;
    var elap  = r.t - cw * 60;
    var over  = (60 - elap) / 60;
    if (!windows[cw]) windows[cw] = 0;
    windows[cw]++;
    var rolling = ((windows[pw] || 0) * over) + windows[cw];
    if (rolling > limit) { windows[cw]--; return false; }
    return true;
  });
}

function simulateTokenBucket(reqs) {
  var cap    = 100;
  var refill = 100 / 60;
  var tokens = cap;
  var lastT  = 0;
  return reqs.map(function(r) {
    tokens = Math.min(cap, tokens + (r.t - lastT) * refill);
    lastT  = r.t;
    if (tokens >= 1) { tokens -= 1; return true; }
    return false;
  });
}

function renderSimBar(idx, results) {
  var bar   = document.getElementById('simBar' + idx);
  var label = document.getElementById('simCount' + idx);
  if (!bar || !label) return;
  bar.innerHTML = '';

  var allowed = results.filter(Boolean).length;
  var denied  = results.length - allowed;
  var pctPass = (allowed / results.length * 100).toFixed(1);
  var pctFail = (denied  / results.length * 100).toFixed(1);

  if (allowed > 0) {
    var s = document.createElement('div');
    s.className = 'sim-seg pass';
    s.style.width = pctPass + '%';
    bar.appendChild(s);
  }
  if (denied > 0) {
    var f = document.createElement('div');
    f.className = 'sim-seg fail';
    f.style.width = pctFail + '%';
    bar.appendChild(f);
  }
  label.textContent = allowed + '/' + results.length;
}
</script>
