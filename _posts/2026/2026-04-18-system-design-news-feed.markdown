---
layout: post
title: "System Design: News Feed — How Twitter and Instagram Scale to Billions"
date: 2026-04-18 10:00:00 +0000
categories: ["post"]
tags: [system-design, news-feed, fan-out, distributed-systems, interview]
series: "System Design Interview Series"
---

<div class="series-label">System Design Interview Series &mdash; #5 of 15</div>

{: class="marginalia" }
Twitter serves **500M+** users<br/>a personalised feed in<br/>under 500 ms. The<br/>engineering behind it<br/>took a decade to perfect.

Scroll your Twitter timeline. Tap Instagram Stories. The feed appears in under a second — effortlessly. What's invisible is one of the most difficult distributed-systems challenges in production engineering: delivering the right posts, from the right people, to 500 million users, faster than they can blink.

This post walks the news feed problem from naïve SQL all the way to the hybrid architecture that Twitter, Instagram, and Meta actually run. Each level exposes a real failure mode from the previous one — the same progression you need to demonstrate in a system-design interview.

---

<style>
/* ─── Series label ──────────────────────────────────────────── */
.series-label {
  display: inline-flex; align-items: center; gap: .5rem;
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 20px;
  padding: 5px 14px; font-size: .75rem; color: rgba(255,255,255,.55);
  margin-bottom: 1.5rem; font-family: "Courier New", monospace;
}

/* ─── Marginalia ────────────────────────────────────────────── */
.marginalia {
  float: right; clear: right;
  width: 190px; margin: 0 0 1.4rem 1.8rem;
  padding: 11px 14px;
  background: rgba(123,205,171,.06);
  border-left: 3px solid #7bcdab;
  border-radius: 0 5px 5px 0;
  font-size: .78rem; line-height: 1.55;
  color: #888; font-style: italic;
}
@media (max-width: 680px) {
  .marginalia { float: none; width: 100%; margin: 1rem 0; }
}

/* ─── Code blocks ───────────────────────────────────────────── */
.code-wrap {
  position: relative; background: #111214; border: 1px solid #2e2f35;
  border-radius: 10px; overflow: hidden; margin: 1.2rem 0;
}
.code-lang {
  background: #1c1d22; padding: 6px 16px; font-size: 11px;
  color: rgba(255,255,255,.38); letter-spacing: .08em; text-transform: uppercase;
  font-family: "Courier New", monospace;
}
.code-wrap pre.code-block {
  margin: 0; padding: 16px 20px; overflow-x: auto;
  font-family: "JetBrains Mono", "Fira Code", "Courier New", monospace;
  font-size: 13px; line-height: 1.65;
  color: rgba(255,255,255,.85);
  background: transparent !important; border: none !important;
}
.kw  { color: #cc99cd; }
.ty  { color: #7bcdab; }
.st  { color: #f8c555; }
.cm  { color: #5a6272; font-style: italic; }
.fn  { color: #89c0d0; }
.nu  { color: #f08080; }
.op  { color: #fbef8a; }
.nm  { color: #c9d1d9; }

/* ─── Interactive containers ─────────────────────────────────── */
.sd-box {
  background: #111214; border: 1px solid #2a2b30;
  border-radius: 10px; padding: 1.4rem;
  margin: 1.8rem 0;
}
.sd-box-title {
  font-size: .72rem; letter-spacing: .1em; text-transform: uppercase;
  color: #7bcdab; font-family: "Courier New", monospace;
  margin-bottom: 1.1rem; padding-bottom: .55rem;
  border-bottom: 1px solid #2a2b30;
}
.sd-btn {
  background: rgba(123,205,171,.1); border: 1px solid #7bcdab;
  color: #7bcdab; padding: 6px 14px; border-radius: 5px;
  cursor: pointer; font-size: .8rem; font-family: "Courier New", monospace;
  transition: background .2s, color .2s; letter-spacing: .03em;
}
.sd-btn:hover  { background: rgba(123,205,171,.22); color: #fbef8a; }
.sd-btn.active { background: #7bcdab; color: #19191c; font-weight: bold; }
.sd-btn.muted  { border-color: #444; color: #666; background: transparent; }
.sd-btn.muted:hover { border-color: #666; color: #999; }

/* ─── Fan-out visualizer ──────────────────────────────────────── */
.fo-controls {
  display: flex; gap: 8px; flex-wrap: wrap;
  align-items: center; margin-bottom: .9rem;
}
.fo-counter {
  font-family: "Courier New", monospace; font-size: .8rem;
  padding: 5px 12px; background: #0d0d0f;
  border: 1px solid #2a2b30; border-radius: 4px; color: #c9d1d9;
}
.fo-counter .writes { color: #ff7b72; font-weight: bold; font-size: .95rem; }
#fo-svg { width: 100%; height: 360px; display: block; }
#fo-log {
  font-family: "Courier New", monospace; font-size: .72rem; color: #7bcdab;
  background: #090909; border: 1px solid #1e1f24; border-radius: 4px;
  padding: 7px 11px; margin-top: .7rem; height: 64px;
  overflow-y: auto; line-height: 1.6;
}

/* ─── Architecture diagram ────────────────────────────────────── */
.arch-wrap { display: flex; flex-direction: column; gap: .45rem; }
.arch-row  { display: flex; gap: .45rem; justify-content: center; align-items: center; flex-wrap: wrap; }
.arch-node {
  background: #1a1b1f; border: 2px solid #333;
  border-radius: 7px; padding: 9px 14px; text-align: center;
  font-family: "Courier New", monospace; font-size: .76rem;
  color: #c9d1d9; cursor: pointer; transition: all .22s;
  min-width: 108px;
}
.arch-node:hover { border-color: #7bcdab; color: #7bcdab; }
.arch-node.hl    { border-color: #fbef8a; color: #fbef8a; background: rgba(251,239,138,.07); box-shadow: 0 0 10px rgba(251,239,138,.18); }
.arch-node.push  { border-color: #7bcdab; color: #7bcdab; background: rgba(123,205,171,.09); }
.arch-node.pull  { border-color: #ff7b72; color: #ff7b72; background: rgba(255,123,114,.09); }
.arch-node.read  { border-color: #fbef8a; color: #fbef8a; background: rgba(251,239,138,.07); }
.arch-sub { font-size: .65rem; color: #555; display: block; margin-top: 2px; font-style: italic; }
.arch-arr  { color: #444; font-size: 1.1rem; padding: 0 2px; font-family: monospace; flex-shrink: 0; }
.arch-legend {
  display: flex; gap: 1rem; margin-top: .9rem;
  font-size: .73rem; font-family: "Courier New", monospace; flex-wrap: wrap;
}
.arch-legend-item {
  display: flex; align-items: center; gap: 6px;
  color: #888; cursor: pointer; padding: 3px 9px;
  border-radius: 4px; border: 1px solid transparent; transition: all .18s;
}
.arch-legend-item:hover { border-color: #2a2b30; background: #1a1b1f; }
.arch-dot { width: 9px; height: 9px; border-radius: 50%; }
.arch-info {
  margin-top: .9rem; padding: 11px 15px; background: #0d0d0f;
  border: 1px solid #2a2b30; border-radius: 6px;
  font-size: .78rem; color: #c9d1d9; font-family: "Courier New", monospace;
  min-height: 46px; line-height: 1.6;
}

/* ─── Feed simulator ──────────────────────────────────────────── */
.sim-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
}
@media (max-width: 640px) { .sim-grid { grid-template-columns: 1fr; } }
.sim-panel {
  background: #0d0d0f; border: 1px solid #2a2b30;
  border-radius: 8px; padding: .9rem;
}
.sim-panel-title {
  font-size: .68rem; text-transform: uppercase; letter-spacing: .1em;
  color: #555; font-family: "Courier New", monospace;
  margin-bottom: .7rem; padding-bottom: .45rem;
  border-bottom: 1px solid #1c1d22;
}
.user-row  { display: flex; align-items: center; gap: 9px; padding: 5px 0; border-bottom: 1px solid #161618; }
.avatar    { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: .72rem; color: #19191c; flex-shrink: 0; font-family: "Courier New", monospace; }
.user-info { flex: 1; }
.user-name { font-size: .8rem; color: #c9d1d9; font-family: "Courier New", monospace; }
.user-foll { font-size: .68rem; color: #555; font-family: "Courier New", monospace; }
.follow-btn {
  background: transparent; border: 1px solid #7bcdab; color: #7bcdab;
  padding: 3px 9px; border-radius: 10px; cursor: pointer;
  font-size: .68rem; font-family: "Courier New", monospace; transition: all .15s;
}
.follow-btn.on { background: #7bcdab; color: #19191c; font-weight: bold; }
.feed-list  { max-height: 300px; overflow-y: auto; }
.feed-post  { display: flex; gap: 9px; padding: 7px 0; border-bottom: 1px solid #161618; animation: fdIn .28s ease; }
@keyframes fdIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
.fp-avatar  { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .65rem; font-weight: bold; color: #19191c; flex-shrink: 0; font-family: "Courier New", monospace; }
.fp-author  { font-size: .72rem; color: #fbef8a; font-family: "Courier New", monospace; font-weight: bold; }
.fp-time    { font-size: .65rem; color: #555; font-family: "Courier New", monospace; margin-left: 4px; }
.fp-text    { font-size: .76rem; color: #c9d1d9; line-height: 1.4; margin-top: 2px; }
.sim-ctrls  { display: flex; gap: 7px; margin-bottom: .7rem; flex-wrap: wrap; align-items: center; }
.sim-status { font-size: .7rem; color: #7bcdab; font-family: "Courier New", monospace; min-height: 18px; padding: 2px 0; }
.model-ind  {
  font-size: .7rem; font-family: "Courier New", monospace;
  padding: 4px 9px; border-radius: 4px; margin-bottom: .6rem;
}
.model-ind.push { background: rgba(123,205,171,.08); color: #7bcdab; border: 1px solid rgba(123,205,171,.25); }
.model-ind.pull { background: rgba(255,123,114,.08); color: #ff7b72; border: 1px solid rgba(255,123,114,.25); }
.empty-feed { color: #555; font-size: .76rem; font-family: "Courier New", monospace; text-align: center; padding: 1.8rem 0; }
.model-row  { display: flex; gap: 8px; align-items: center; margin-bottom: .9rem; flex-wrap: wrap; }
.model-lbl  { font-size: .73rem; color: #666; font-family: "Courier New", monospace; }

/* ─── Table ─────────────────────────────────────────────────── */
table { width: 100%; border-collapse: collapse; font-size: .8rem; font-family: "Courier New", monospace; margin: 1.2rem 0; }
th { background: #1a1b1f; color: #fbef8a; padding: 7px 11px; text-align: left; border: 1px solid #2a2b30; font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; }
td { padding: 6px 11px; border: 1px solid #1e1f24; color: #c9d1d9; vertical-align: top; }
tr:nth-child(even) td { background: rgba(255,255,255,.02); }
</style>

## 1. The Core Problem

When Alice loads her feed she wants to see posts from everyone she follows, sorted newest-first, paginated. That requirement looks almost trivial — it isn't.

Here is what "trivial" actually means at scale:

- Alice follows **200 people** on average
- Those 200 people post at rates from once a week to once a minute
- Her feed must load in **under 500 ms** — or she closes the app
- Meanwhile, **500 million other Alices** are doing the exact same thing simultaneously
- Beyoncé just posted, which means **200 million feeds** need updating *right now*

The fundamental tension is between **read latency** (how fast can Alice load her feed?) and **write amplification** (how much work does one post create across the system?). Every architectural decision you make is a negotiation between these two forces.

---

## 2. Requirements

Before designing anything, nail down the constraints. Interviewers reward explicit requirement scoping.

**Functional requirements:**
- Users follow / unfollow other users
- Users see a feed of posts from followed accounts, sorted reverse-chronologically
- Feed supports infinite scroll (cursor-based pagination)
- Posts include: text (up to 280 chars), optional media reference, timestamp, author

**Non-functional requirements:**
- Feed load time: **&lt; 500 ms at p99**
- Scale: **500 M daily active users**
- Post ingestion: **1 B posts / day** ≈ **11,500 posts / sec**
- Read / write ratio: **~100:1** (heavily read-dominant)
- Average follows per user: **200**
- 95th-percentile celebrity follower count: **50 M+**
- Availability: **99.99 %** (under 1 hour downtime per year)
- Eventual consistency acceptable — a few seconds of feed staleness is fine

**Back-of-envelope to keep in mind:**

| Metric | Calculation | Result |
|---|---|---|
| Posts/sec | 1 B / 86 400 | ~11 500 / sec |
| Fan-out writes/sec (push) | 11 500 × 200 avg followers | ~2.3 M / sec |
| Feed reads/sec | 500 M × 20 reads / day | ~115 000 / sec |
| Post row size | ~1 KB (text + metadata) | — |
| 5-yr post storage | 1 B × 365 × 5 × 1 KB | ~1.8 PB |
| With 3× replication | 1.8 PB × 3 | ~5.4 PB |

---

## 3. Level 1 — Naive Pull (Fan-out on Read)

The first instinct is to compute the feed dynamically at read time. When Alice requests her feed:

1. Fetch Alice's list of 200 followed user-IDs
2. Query the `posts` table for those IDs in the last 24 hours
3. Sort by timestamp, paginate to 20, return

<div class="code-wrap">
<div class="code-lang">SQL — naive feed query</div>
<pre class="code-block"><span class="cm">-- Compute the feed on every single read request</span>
<span class="kw">SELECT</span>
    p.id,
    p.author_id,
    p.content,
    p.created_at,
    p.media_url
<span class="kw">FROM</span>  posts p
<span class="kw">WHERE</span> p.author_id <span class="kw">IN</span> (
    <span class="kw">SELECT</span> followee_id
    <span class="kw">FROM</span>  follows
    <span class="kw">WHERE</span> follower_id <span class="op">=</span> <span class="nu">:alice_user_id</span>
)
<span class="kw">AND</span>   p.created_at <span class="op">&gt;</span> NOW() <span class="op">-</span> INTERVAL <span class="st">'24 hours'</span>
<span class="kw">ORDER</span> <span class="kw">BY</span> p.created_at <span class="kw">DESC</span>
<span class="kw">LIMIT</span> <span class="nu">20</span>;</pre>
</div>

**Why this works (for a while):** Simple, consistent, no pre-computation. Every read reflects the absolute latest data instantly.

**Why this breaks at scale:** The `IN` clause with 200 IDs can still be fast with indexes at low traffic. But the real problem is **thundering herd**: 115 000 feed reads per second all hitting the `posts` table with complex range scans. Even with read replicas, each query is expensive. When a celebrity posts to 50 M followers and *everyone* refreshes simultaneously, your database falls over.

**Measured latency:** 50–200 ms on a warm, lightly loaded database. 2–10 seconds under real production load. Unacceptable at scale.

---

## 4. Level 2 — Fan-out on Write (Push Model)

The insight: **pre-compute the feed at write time**. When a user posts, immediately push that post into the feed cache of every follower. Reads become a trivial cache lookup.

**Write path:** User Bob creates a post → post saved to DB → fan-out worker fetches Bob's follower list → writes the post ID into a Redis sorted set for each follower.

**Read path:** Alice requests feed → read `feed:{alice_id}` from Redis → done.

<div class="code-wrap">
<div class="code-lang">Python — fan-out on write</div>
<pre class="code-block"><span class="cm"># Write path: fan-out to each follower's sorted set</span>
<span class="kw">def</span> <span class="fn">fanout_post</span>(post_id, author_id, timestamp):
    followers = <span class="fn">get_followers</span>(author_id)         <span class="cm"># fetch follower IDs</span>
    score     = timestamp                          <span class="cm"># Unix ms as sort key</span>

    <span class="kw">for</span> follower_id <span class="kw">in</span> followers:
        key = <span class="st">"feed:"</span> <span class="op">+</span> <span class="fn">str</span>(follower_id)
        redis.<span class="fn">zadd</span>(key, {post_id: score})        <span class="cm"># O(log N) per write</span>
        redis.<span class="fn">zremrangebyrank</span>(key, <span class="nu">0</span>, <span class="op">-</span><span class="nu">1001</span>)    <span class="cm"># keep latest 1000 only</span>

<span class="cm"># Read path: single Redis call, sub-millisecond</span>
<span class="kw">def</span> <span class="fn">get_feed</span>(user_id, cursor<span class="op">=</span><span class="kw">None</span>, limit<span class="op">=</span><span class="nu">20</span>):
    key      = <span class="st">"feed:"</span> <span class="op">+</span> <span class="fn">str</span>(user_id)
    post_ids = redis.<span class="fn">zrevrangebyscore</span>(
                   key, cursor <span class="kw">or</span> <span class="st">"+inf"</span>, <span class="st">"-inf"</span>,
                   start<span class="op">=</span><span class="nu">0</span>, num<span class="op">=</span>limit)
    <span class="kw">return</span> <span class="fn">batch_fetch_posts</span>(post_ids)           <span class="cm"># mget from post cache</span></pre>
</div>

**Why reads are blazing fast:** Sub-millisecond sorted set range queries. No SQL joins, no table scans. A feed page loads in 1–5 ms including network.

**The celebrity problem:** Bob has 200 followers → 200 Redis writes. Fine. Beyoncé has 200 million followers. One tweet = 200 million Redis sorted-set writes. At 100 000 writes / second that takes **33 minutes**. Early followers see the post; late followers wait half an hour. Completely unacceptable.

{: class="marginalia" }
The celebrity problem is why the hybrid approach is necessary. The math simply does not work: 200 M writes × ~1 μs each = 200 s of pure single-threaded Redis time, ignoring network and coordination overhead.

This is the **write amplification** problem, and solving it is the central engineering challenge of every major news feed system.

---

## 5. Level 3 — Fan-out Visualizer

Watch write amplification in action. Click each user to simulate a post and observe how differently the system behaves based on follower count.

<div class="sd-box" id="fo-viz">
  <div class="sd-box-title">⚡ Fan-out on Write — Interactive Visualizer</div>
  <div class="fo-controls">
    <button class="sd-btn" onclick="foPost('alice')">Alice posts (10 followers)</button>
    <button class="sd-btn" onclick="foPost('bob')">Bob posts (5 followers)</button>
    <button class="sd-btn" onclick="foPost('celeb')">CelebC posts (1 000 followers)</button>
    <button class="sd-btn muted" onclick="foReset()">Reset</button>
    <div class="fo-counter">
      Write amplification: <span class="writes" id="fo-writes">0</span> Redis writes
    </div>
  </div>
  <svg id="fo-svg" viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg"></svg>
  <div id="fo-log">&gt; Click a user to simulate posting...</div>
</div>

<script>
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var totalW = 0, busy = false;

  var posters = {
    alice: { label: "Alice",  color: "#7bcdab", followers: 10,   display: 10 },
    bob:   { label: "Bob",    color: "#79c0ff", followers: 5,    display: 5  },
    celeb: { label: "CelebC", color: "#fbef8a", followers: 1000, display: 28 }
  };

  var COLS = 14, SX = 28, SY = 120, DX = 46, DY = 42;

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function svg() { return document.getElementById("fo-svg"); }

  function clear() {
    var s = svg(); while (s.firstChild) s.removeChild(s.firstChild);
  }

  function drawBase(p) {
    var s = svg();
    s.appendChild(el("circle", { cx: 350, cy: 52, r: 26, fill: p.color, opacity: ".14" }));
    s.appendChild(el("circle", { cx: 350, cy: 52, r: 20, fill: p.color }));
    var t = el("text", { x: 350, y: 48, "text-anchor": "middle", fill: "#19191c",
                         "font-size": "10", "font-weight": "bold", "font-family": "Courier New" });
    t.textContent = p.label[0];
    s.appendChild(t);
    var n = el("text", { x: 350, y: 62, "text-anchor": "middle", fill: "#19191c",
                         "font-size": "7", "font-family": "Courier New" });
    n.textContent = p.label;
    s.appendChild(n);
    var fl = el("text", { x: 350, y: 88, "text-anchor": "middle", fill: p.color,
                          "font-size": "8", "font-family": "Courier New" });
    fl.textContent = p.followers + " followers";
    s.appendChild(fl);

    for (var i = 0; i < p.display; i++) {
      var cx = SX + (i % COLS) * DX;
      var cy = SY + Math.floor(i / COLS) * DY;
      s.appendChild(el("circle", { cx: cx, cy: cy, r: 10, fill: "#1a1b1f",
                                   stroke: "#333", "stroke-width": "1",
                                   id: "fd-" + i }));
      var dt = el("text", { x: cx, y: cy + 3, "text-anchor": "middle", fill: "#444",
                            "font-size": "6", "font-family": "Courier New" });
      dt.textContent = "F" + (i + 1);
      s.appendChild(dt);
    }
    if (p.followers > p.display) {
      var mt = el("text", { x: SX + COLS * DX - 10, y: SY + 4,
                            fill: "#555", "font-size": "8", "font-family": "Courier New" });
      mt.textContent = "+" + (p.followers - p.display) + " more";
      s.appendChild(mt);
    }
  }

  function log(msg) {
    var l = document.getElementById("fo-log");
    l.innerHTML = l.innerHTML + "<br>" + msg;
    l.scrollTop = l.scrollHeight;
  }

  window.foPost = function (id) {
    if (busy) return;
    busy = true;
    var p = posters[id];
    clear();
    drawBase(p);
    document.getElementById("fo-log").innerHTML =
      "&gt; " + p.label + " posts! Fan-out to " + p.followers + " followers starting...";

    var s = svg();
    var done = 0;
    var batch = id === "celeb" ? 7 : 2;
    var gap   = id === "celeb" ? 55 : 140;

    for (var i = 0; i < p.display; i++) {
      (function (idx) {
        var delay = Math.floor(idx / batch) * gap;
        setTimeout(function () {
          var cx = SX + (idx % COLS) * DX;
          var cy = SY + Math.floor(idx / COLS) * DY;
          var ln = el("line", { x1: 350, y1: 72, x2: 350, y2: 72,
                                stroke: p.color, "stroke-width": "1.3", opacity: ".65" });
          s.appendChild(ln);
          var dur = id === "celeb" ? 280 : 460, t0 = null;
          function step(ts) {
            if (!t0) t0 = ts;
            var prog = Math.min((ts - t0) / dur, 1);
            ln.setAttribute("x2", 350 + (cx - 350) * prog);
            ln.setAttribute("y2", 72  + (cy - 72)  * prog);
            if (prog < 1) { requestAnimationFrame(step); }
            else {
              var dot = document.getElementById("fd-" + idx);
              if (dot) dot.setAttribute("fill", p.color);
            }
          }
          requestAnimationFrame(step);

          totalW++;
          document.getElementById("fo-writes").textContent = totalW;
          done++;

          if (done === p.display) {
            var remaining = p.followers - p.display;
            if (remaining > 0) {
              var left = remaining;
              var iv = setInterval(function () {
                var chunk = Math.min(60, left);
                left  -= chunk;
                totalW += chunk;
                document.getElementById("fo-writes").textContent = totalW;
                if (left <= 0) {
                  clearInterval(iv);
                  if (id === "celeb") {
                    document.getElementById("fo-writes").style.color = "#ff7b72";
                    log("&gt; Total: " + p.followers + " writes. Queue saturated. Workers falling behind.");
                    log("&gt; At 200 M followers this fan-out takes ~33 minutes to complete.");
                  } else {
                    log("&gt; Done. " + p.followers + " writes. Fast and manageable.");
                  }
                  busy = false;
                }
              }, 18);
            } else {
              log("&gt; Done. " + p.followers + " writes. " + (id === "celeb" ? "Watch that counter." : "Healthy."));
              busy = false;
            }
          }
        }, delay);
      })(i);
    }
  };

  window.foReset = function () {
    busy = false; totalW = 0; clear();
    document.getElementById("fo-writes").textContent = "0";
    document.getElementById("fo-writes").style.color = "#ff7b72";
    document.getElementById("fo-log").innerHTML = "&gt; Click a user to simulate posting...";
    drawBase(posters.alice);
  };

  drawBase(posters.alice);
})();
</script>

---

## 6. Level 4 — The Hybrid Approach

The solution Twitter, Instagram, and Facebook converged on is a **hybrid routing model**: fan-out on write for regular users, fan-out on read for celebrities.

**The routing rule:**

<div class="code-wrap">
<div class="code-lang">Python — hybrid fan-out routing</div>
<pre class="code-block"><span class="cm"># Threshold separating regular users from celebrities</span>
CELEBRITY_THRESHOLD = <span class="nu">1_000_000</span>

<span class="kw">def</span> <span class="fn">handle_new_post</span>(post, author):
    <span class="kw">if</span> author.follower_count <span class="op">&lt;</span> CELEBRITY_THRESHOLD:
        <span class="cm"># Regular user: fan-out on write → push to Redis</span>
        <span class="fn">fanout_to_followers</span>(post, author.follower_ids)
    <span class="kw">else</span>:
        <span class="cm"># Celebrity: store in celebrity cache; merge at read time</span>
        celebrity_cache.<span class="fn">add_post</span>(post)

<span class="kw">def</span> <span class="fn">get_feed</span>(user_id):
    <span class="cm"># Step 1: Pre-computed feed from Redis (regular follows)</span>
    regular_posts = redis.<span class="fn">zrevrange</span>(<span class="st">"feed:"</span> <span class="op">+</span> user_id, <span class="nu">0</span>, <span class="nu">49</span>)

    <span class="cm"># Step 2: Live pull for celebrity follows</span>
    celeb_ids   = <span class="fn">get_celebrity_followees</span>(user_id)
    celeb_posts = celebrity_cache.<span class="fn">get_recent</span>(celeb_ids, limit<span class="op">=</span><span class="nu">20</span>)

    <span class="cm"># Step 3: Merge, sort by score/time, paginate</span>
    <span class="kw">return</span> <span class="fn">merge_sorted</span>(regular_posts, celeb_posts)[:<span class="nu">20</span>]</pre>
</div>

**Trade-off matrix:**

| Approach | Read latency | Write amplification | Celebrity problem | Cache pressure |
|---|---|---|---|---|
| Fan-out on read | 100–500 ms | None | ✓ Handled | Low |
| Fan-out on write | 1–5 ms | O(followers) | ❌ Catastrophic | High |
| **Hybrid** | **5–20 ms** | **Low (skips celebrities)** | **✓ Handled** | **Medium** |

The celebrity threshold (1 M) is configurable. Some systems use 100 K; Instagram reportedly adjusts it dynamically based on current system load. Users near the threshold may flip between paths as follower counts change — the system handles this gracefully because it queries *both* paths on every read regardless, deduplicating by post ID.

---

## 7. Level 5 — Feed Service Architecture

The complete system consists of cooperating services with clearly separated concerns. Click any node to learn its role, or highlight a data flow path using the legend.

<div class="sd-box">
  <div class="sd-box-title">🏗 Feed Service Architecture — click any node or path</div>
  <div class="arch-wrap" id="arch-wrap">

    <div class="arch-row">
      <div class="arch-node" id="an-client" onclick="archClick('client')">
        Client<span class="arch-sub">iOS / Android / Web</span>
      </div>
      <span class="arch-arr">→</span>
      <div class="arch-node" id="an-post-svc" onclick="archClick('post-svc')">
        Post Service<span class="arch-sub">Write API</span>
      </div>
      <span class="arch-arr">→</span>
      <div class="arch-node" id="an-kafka" onclick="archClick('kafka')">
        Message Queue<span class="arch-sub">Kafka</span>
      </div>
    </div>

    <div class="arch-row" style="justify-content:flex-end;padding-right:calc(50% - 56px);">
      <span class="arch-arr">↓</span>
      <div class="arch-node" id="an-fanout" onclick="archClick('fanout')">
        Fan-out Worker<span class="arch-sub">Routes push vs pull</span>
      </div>
    </div>

    <div class="arch-row">
      <div class="arch-node push" id="an-feed-cache" onclick="archClick('feed-cache')">
        Feed Cache<span class="arch-sub">Redis sorted sets</span>
      </div>
      <span class="arch-arr" style="color:#7bcdab;">← push</span>
      <div style="min-width:50px;"></div>
      <span class="arch-arr" style="color:#ff7b72;">pull →</span>
      <div class="arch-node pull" id="an-celeb-cache" onclick="archClick('celeb-cache')">
        Celebrity Cache<span class="arch-sub">Redis + CDN</span>
      </div>
    </div>

    <div class="arch-row">
      <div class="arch-node" id="an-follow-svc" onclick="archClick('follow-svc')">
        Follow Service<span class="arch-sub">Social graph</span>
      </div>
      <span class="arch-arr">→</span>
      <div class="arch-node" id="an-feed-read" onclick="archClick('feed-read')">
        Feed Read Service<span class="arch-sub">Merge + Rank + Page</span>
      </div>
      <span class="arch-arr">←</span>
      <div class="arch-node" id="an-rank" onclick="archClick('rank')">
        Ranking Service<span class="arch-sub">ML scoring</span>
      </div>
    </div>

    <div class="arch-row">
      <div class="arch-node" id="an-posts-db" onclick="archClick('posts-db')">
        Posts DB<span class="arch-sub">Cassandra</span>
      </div>
      <span class="arch-arr">—</span>
      <div class="arch-node" id="an-user-db" onclick="archClick('user-db')">
        User / Follow DB<span class="arch-sub">MySQL + graph cache</span>
      </div>
      <span class="arch-arr">—</span>
      <div class="arch-node" id="an-media" onclick="archClick('media')">
        Media Store<span class="arch-sub">S3 + CDN</span>
      </div>
    </div>

  </div>

  <div class="arch-legend">
    <div class="arch-legend-item" onclick="archPath('push')">
      <div class="arch-dot" style="background:#7bcdab;"></div> Push path
    </div>
    <div class="arch-legend-item" onclick="archPath('pull')">
      <div class="arch-dot" style="background:#ff7b72;"></div> Pull path
    </div>
    <div class="arch-legend-item" onclick="archPath('read')">
      <div class="arch-dot" style="background:#fbef8a;"></div> Read path
    </div>
    <div class="arch-legend-item" onclick="archPath('none')">
      <div class="arch-dot" style="background:#444;"></div> Clear
    </div>
  </div>
  <div class="arch-info" id="arch-info">Click any node or legend item to explore the architecture...</div>
</div>

<script>
(function () {
  var info = {
    "client":      "Client (iOS/Android/Web): Two request types — POST /posts (write) and GET /feed (read). The client sends an opaque cursor on scroll for pagination. Read path is heavily cached; write path is fire-and-forget (async fan-out).",
    "post-svc":    "Post Service (Write API): Validates, stores the post to Cassandra, then publishes a PostCreated event to Kafka. Returns 200 immediately — it does NOT wait for fan-out. Stateless; scales horizontally. Rate-limits per user to prevent spam bursts.",
    "kafka":       "Message Queue (Kafka): Decouples post creation from fan-out. Fan-out is async — a temporary worker outage doesn't affect post creation. Events are partitioned by author_id (preserving per-author ordering) and retained for 7 days for replay on worker failures.",
    "fanout":      "Fan-out Worker: Consumes PostCreated events. Fetches the author's follower count. If below the celebrity threshold → pushes the post ID into each follower's Redis sorted set. If above → writes to Celebrity Cache only. Scales by adding more consumer instances.",
    "feed-cache":  "Feed Cache (Redis sorted sets): One sorted set per user: feed:{userId}. Score = Unix timestamp. Stores only post IDs — not full post content. Capped at 1 000 entries via ZREMRANGEBYRANK. A page read is a single ZREVRANGEBYSCORE — O(log N + page_size).",
    "celeb-cache": "Celebrity Post Cache (Redis + CDN): Stores recent posts from accounts over the celebrity threshold, keyed by author_id. The Feed Read Service queries this at read time for any celebrities the user follows. Hot entries can be pushed to CDN edge nodes for global latency reduction.",
    "follow-svc":  "Follow Service: Manages the social graph. Backed by a denormalized MySQL table with heavy Redis caching (follower/following lists pre-serialised). The fan-out worker reads from here. Cache hit target: >99%. Celebrity follower lists are sharded across multiple cache nodes.",
    "feed-read":   "Feed Read Service (hot path): Merges the pre-computed Redis feed with live celebrity post fetches. Applies ranking scores. Handles cursor-based pagination. Batch-fetches full post objects by ID from a post cache or Cassandra. Target: <50 ms p99 including all downstream calls.",
    "rank":        "Ranking Service (ML Scoring): Optional layer for non-chronological feeds. Scores each candidate post using: recency decay, engagement signals (likes/comments/shares), relationship strength (interaction history), and content-type affinity. Runs as a sidecar or separate gRPC service.",
    "posts-db":    "Posts DB (Cassandra): Append-only workload — posts are never updated after creation. Cassandra partition key: (author_id, month) for time-series locality. Read by post_id uses a global secondary index. Replicated across 3+ data-centres for availability.",
    "user-db":     "User / Follow DB (MySQL + cache): User profiles and the follow graph in MySQL, with a Redis cache of pre-serialised follower lists for hot users. Follower counts maintained as Redis counters to avoid hot-row contention in MySQL.",
    "media":       "Media Store (S3 + CDN): Post images/videos stored in S3-compatible object storage. Post rows in Cassandra store a media_url string, not the bytes. A CDN (CloudFront / Fastly) serves media globally from edge PoPs; the origin S3 bucket is rarely hit after initial upload."
  };

  window.archClick = function (id) {
    document.querySelectorAll(".arch-node").forEach(function (n) {
      n.classList.remove("hl");
    });
    var node = document.getElementById("an-" + id);
    if (node) node.classList.add("hl");
    document.getElementById("arch-info").textContent = info[id] || "No info.";
  };

  var paths = {
    push: ["an-post-svc", "an-kafka", "an-fanout", "an-feed-cache"],
    pull: ["an-post-svc", "an-kafka", "an-fanout", "an-celeb-cache"],
    read: ["an-client", "an-feed-read", "an-follow-svc", "an-feed-cache", "an-celeb-cache", "an-rank"]
  };
  var pathDesc = {
    push: "PUSH PATH: Post Service → Kafka → Fan-out Worker → Redis Feed Cache. Used for regular users with fewer than 1 M followers. Fan-out writes the post ID into each follower's sorted set asynchronously.",
    pull: "PULL PATH: Post Service → Kafka → Fan-out Worker → Celebrity Cache. Used for celebrities (>1 M followers). The Feed Read Service merges celebrity posts at read time instead of pushing to every follower.",
    read: "READ PATH: Client → Feed Read Service, which queries Redis (pre-computed feed) + Celebrity Cache (live pull for celebrity follows) + Ranking Service, then merges, scores, and paginates the final result."
  };

  window.archPath = function (name) {
    document.querySelectorAll(".arch-node").forEach(function (n) {
      n.classList.remove("hl", "push", "pull", "read");
    });
    if (name === "none") {
      document.getElementById("arch-info").textContent = "Click any node or legend item to explore the architecture...";
      return;
    }
    var cls = name;
    (paths[name] || []).forEach(function (nodeId) {
      var el = document.getElementById(nodeId);
      if (el) el.classList.add(cls);
    });
    document.getElementById("arch-info").textContent = pathDesc[name] || "";
  };
})();
</script>

---

## 8. Level 6 — Feed Ranking

Pure reverse-chronological order was Instagram's original approach. After switching to a ranked feed, engagement increased by roughly 40 %. The tradeoff: ranked feeds are stickier but reduce serendipity and can create filter bubbles.

**Why ranking beats chronological:**
- A celebrity's low-quality retweet shouldn't displace a close friend's life milestone
- Viral content from yesterday is often more interesting than a routine post from 30 seconds ago
- Different users have different engagement patterns — personalisation increases time-in-app

**Scoring model:**

<div class="code-wrap">
<div class="code-lang">Python — simplified feed ranking score</div>
<pre class="code-block"><span class="kw">import</span> math, time

<span class="kw">def</span> <span class="fn">score_post</span>(post, user):
    <span class="cm"># Recency: exponential decay, half-life = 6 hours</span>
    age_hrs  = (time.<span class="fn">time</span>() <span class="op">-</span> post.created_at) <span class="op">/</span> <span class="nu">3600</span>
    recency  = math.<span class="fn">exp</span>(<span class="op">-</span><span class="nu">0.693</span> <span class="op">*</span> age_hrs <span class="op">/</span> <span class="nu">6.0</span>)   <span class="cm"># [0.0, 1.0]</span>

    <span class="cm"># Engagement: log-scaled, comments/shares weighted higher</span>
    raw_eng  = post.likes <span class="op">+</span> post.comments <span class="op">*</span> <span class="nu">3</span> <span class="op">+</span> post.shares <span class="op">*</span> <span class="nu">5</span>
    engage   = math.<span class="fn">log1p</span>(raw_eng) <span class="op">/</span> <span class="nu">20.0</span>              <span class="cm"># normalised [0.0, ~1.0]</span>

    <span class="cm"># Relationship strength: how often user has interacted with author</span>
    rel      = user.<span class="fn">interaction_score</span>(post.author_id)   <span class="cm"># [0.0, 1.0]</span>

    <span class="cm"># Content-type affinity: user preference for photo / video / text</span>
    affinity = user.<span class="fn">content_pref</span>(post.media_type)       <span class="cm"># [0.0, 1.0]</span>

    <span class="cm"># Weighted combination (weights learned by gradient boosting)</span>
    score = (<span class="nu">0.35</span> <span class="op">*</span> recency
           <span class="op">+</span> <span class="nu">0.25</span> <span class="op">*</span> engage
           <span class="op">+</span> <span class="nu">0.25</span> <span class="op">*</span> rel
           <span class="op">+</span> <span class="nu">0.15</span> <span class="op">*</span> affinity)
    <span class="kw">return</span> score</pre>
</div>

In production, the scoring function is a trained ML model — typically a gradient-boosted tree or a two-tower neural network. The features above are inputs; the model weights are learned from implicit feedback signals: did the user like it, comment, share, or scroll past in under 0.3 seconds (a strong negative signal)?

**Where ranking runs:** Ranking scores are computed in the Feed Read Service after candidate retrieval, before the final sort-and-paginate step. Ranking the entire Redis sorted set would be too slow; in practice only the top ~200 candidates from the cache are scored, then the top 20 are returned.

---

## 9. Level 7 — Pagination

You cannot paginate a live feed with page numbers. Here is why.

Alice opens her feed and sees posts 1–20. She scrolls. While she reads, 5 new posts arrive at the top. She requests "page 2." With offset-based pagination:

<div class="code-wrap">
<div class="code-lang">SQL — why OFFSET breaks on live feeds</div>
<pre class="code-block"><span class="cm">-- Page 2 with offset pagination (WRONG for live feeds)</span>
<span class="kw">SELECT</span> <span class="op">*</span> <span class="kw">FROM</span> feed_posts
<span class="kw">WHERE</span>  user_id <span class="op">=</span> <span class="nu">:uid</span>
<span class="kw">ORDER</span> <span class="kw">BY</span> score <span class="kw">DESC</span>
<span class="kw">LIMIT</span> <span class="nu">20</span> <span class="kw">OFFSET</span> <span class="nu">20</span>;

<span class="cm">-- The 5 new posts at the top shifted everything down by 5.</span>
<span class="cm">-- Alice sees posts 16–20 again (duplicates).</span>
<span class="cm">-- Posts 21–25 are silently skipped (missing content).</span>
<span class="cm">-- Page 2 of a live feed is a DIFFERENT page 2 every time.</span></pre>
</div>

**Cursor-based pagination** solves this. The cursor encodes the position of the last seen item — new posts at the top do not affect it.

<div class="code-wrap">
<div class="code-lang">Python — cursor-based feed pagination</div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">get_feed_page</span>(user_id, cursor<span class="op">=</span><span class="kw">None</span>, limit<span class="op">=</span><span class="nu">20</span>):
    <span class="kw">if</span> cursor <span class="kw">is</span> <span class="kw">None</span>:
        <span class="cm"># First page: get most recent posts</span>
        posts = redis.<span class="fn">zrevrangebyscore</span>(
            <span class="st">"feed:"</span> <span class="op">+</span> user_id, <span class="st">"+inf"</span>, <span class="st">"-inf"</span>,
            start<span class="op">=</span><span class="nu">0</span>, num<span class="op">=</span>limit
        )
    <span class="kw">else</span>:
        <span class="cm"># Subsequent page: posts with score STRICTLY LESS THAN cursor</span>
        <span class="cm"># "(" prefix in Redis means exclusive bound</span>
        posts = redis.<span class="fn">zrevrangebyscore</span>(
            <span class="st">"feed:"</span> <span class="op">+</span> user_id,
            <span class="st">"("</span> <span class="op">+</span> <span class="fn">str</span>(cursor),   <span class="cm"># exclusive lower-than-cursor</span>
            <span class="st">"-inf"</span>,
            start<span class="op">=</span><span class="nu">0</span>, num<span class="op">=</span>limit
        )

    next_cursor = posts[<span class="op">-</span><span class="nu">1</span>].score <span class="kw">if</span> posts <span class="kw">else</span> <span class="kw">None</span>
    <span class="kw">return</span> {"posts": posts, "next_cursor": next_cursor}</pre>
</div>

{: class="marginalia" }
Cursor-based pagination isn't just better for feeds — it's essential. Page 2 of a real-time feed is a different page 2 every time you load it. Offset-based pagination is a correctness bug, not just a performance issue.

The cursor is opaque to the client — it sends back whatever the server gave it. Internally it can be a Unix millisecond timestamp, a post ID, or a composite (timestamp + post ID to handle ties). For ranked feeds, the cursor must encode the ranking score, not just timestamp, to prevent items re-appearing or disappearing as scores change during a scroll session.

---

## 10. The Feed Simulator

Follow users, generate posts, and toggle between push and pull models to see how the system behaves differently. Notice that with the push model, only followed-user posts pre-populate your feed — unfollowing removes them on the *next* refresh (not immediately, a known trade-off).

<div class="sd-box" id="feed-sim">
  <div class="sd-box-title">📰 Feed Simulator — follow users, post, toggle models</div>

  <div class="model-row">
    <span class="model-lbl">Model:</span>
    <button class="sd-btn active" id="btn-push" onclick="simModel('push')">Push (fan-out on write)</button>
    <button class="sd-btn"        id="btn-pull" onclick="simModel('pull')">Pull (fan-out on read)</button>
  </div>

  <div class="sim-grid">
    <div>
      <div class="sim-panel">
        <div class="sim-panel-title">Users — click to Follow / Unfollow</div>
        <div id="sim-users"></div>
      </div>
      <div class="sim-panel" style="margin-top:.8rem;">
        <div class="sim-panel-title">Simulate</div>
        <div class="sim-ctrls">
          <button class="sd-btn" onclick="simPost()">▶ Random post</button>
          <button class="sd-btn" onclick="simBurst()">▶▶ Burst (5 posts)</button>
        </div>
        <div class="sim-status" id="sim-status"></div>
      </div>
    </div>

    <div class="sim-panel">
      <div class="sim-panel-title">Your Feed</div>
      <div class="model-ind push" id="model-ind">⚡ Push — feed pre-computed in Redis</div>
      <div class="feed-list" id="sim-feed">
        <div class="empty-feed">Follow some users then generate posts</div>
      </div>
    </div>
  </div>
</div>

<script>
(function () {
  var model = "push";
  var following = new Set([1, 3]);
  var pushFeed = [], allPosts = [], postId = 0;

  var users = [
    { id: 1, name: "Alice",  init: "AL", color: "#7bcdab", foll: "892 followers"  },
    { id: 2, name: "Bob",    init: "BO", color: "#79c0ff", foll: "1 240 followers" },
    { id: 3, name: "Carol",  init: "CA", color: "#d2a8ff", foll: "543 followers"  },
    { id: 4, name: "Dave",   init: "DV", color: "#fbef8a", foll: "2 891 followers" },
    { id: 5, name: "Eve",    init: "EV", color: "#ff7b72", foll: "387 followers"  }
  ];

  var texts = [
    "Just shipped distributed tracing end-to-end. Three weeks of pain, one beautiful flamegraph.",
    "Hot take: eventual consistency is not a compromise — it is a superpower.",
    "Spent 3 hours debugging a race condition. It was a missing mutex. It is always a mutex.",
    "Fan-out on write is elegant until the celebrity with 200M followers posts for the first time.",
    "Redis sorted sets are criminally underrated. Everything is a leaderboard if you squint.",
    "Cursor pagination saved my weekend. Offset pagination on a live feed is a silent correctness bug.",
    "CAP theorem at 3 AM: consistency or availability — pick one and defend it to your SRE.",
    "Cassandra partition key design is 80% of your performance story. Choose wisely.",
    "Kafka makes every pipeline better, including standups.",
    "The best system designs are boring. Exciting architectures are on-call nightmares.",
    "Deployed to prod on a Friday. It worked. I will not be doing that again.",
    "Graph databases: for when your joins have joins that have joins.",
    "Service meshes: solving problems you did not know you had with abstractions you cannot explain.",
    "Sharding by user_id and then wondering why celebrity queries are slow. A classic tale.",
    "Write-ahead logging is the unsung hero of every database you have ever trusted."
  ];

  function getUserById(id) {
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === id) return users[i];
    }
    return null;
  }

  function renderUsers() {
    var el = document.getElementById("sim-users");
    if (!el) return;
    var html = "";
    users.forEach(function (u) {
      var on = following.has(u.id);
      html += '<div class="user-row">';
      html += '<div class="avatar" style="background:' + u.color + '">' + u.init + '</div>';
      html += '<div class="user-info"><div class="user-name">' + u.name + '</div>';
      html += '<div class="user-foll">' + u.foll + '</div></div>';
      html += '<button class="follow-btn' + (on ? ' on' : '') + '" onclick="simFollow(' + u.id + ')">';
      html += on ? 'Following' : 'Follow';
      html += '</button></div>';
    });
    el.innerHTML = html;
  }

  window.simFollow = function (id) {
    if (following.has(id)) { following.delete(id); }
    else { following.add(id); }
    renderUsers();
    if (model === "pull") renderFeed();
  };

  function makePost(userId) {
    var u = getUserById(userId);
    if (!u) return null;
    postId++;
    return {
      id: postId, userId: userId, name: u.name,
      init: u.init, color: u.color,
      text: texts[Math.floor(Math.random() * texts.length)],
      ts: new Date()
    };
  }

  function relTime(d) {
    var s = Math.floor((new Date() - d) / 1000);
    if (s < 10) return "just now";
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    return Math.floor(s / 3600) + "h ago";
  }

  function setStatus(msg) {
    var el = document.getElementById("sim-status");
    if (el) el.textContent = msg;
  }

  window.simPost = function () {
    var u = users[Math.floor(Math.random() * users.length)];
    var p = makePost(u.id);
    if (!p) return;
    allPosts.unshift(p);
    if (allPosts.length > 200) allPosts.pop();

    if (model === "push") {
      if (following.has(u.id)) {
        pushFeed.unshift(p);
        if (pushFeed.length > 100) pushFeed.pop();
        setStatus("\u26a1 " + u.name + " posted \u2192 fan-out to Redis feed cache.");
      } else {
        setStatus("\ud83d\udce5 " + u.name + " posted (not in your feed \u2014 not following).");
      }
    } else {
      if (following.has(u.id)) {
        setStatus("\ud83d\udd0d " + u.name + " posted \u2192 stored in DB, fetched at read time.");
      } else {
        setStatus("\ud83d\udce5 " + u.name + " posted (not in your feed \u2014 not following).");
      }
    }
    renderFeed();
  };

  window.simBurst = function () {
    for (var i = 0; i < 5; i++) {
      (function (d) { setTimeout(function () { window.simPost(); }, d * 220); })(i);
    }
  };

  function renderFeed() {
    var el = document.getElementById("sim-feed");
    if (!el) return;
    var feed;
    if (model === "push") {
      feed = pushFeed;
    } else {
      feed = allPosts.filter(function (p) { return following.has(p.userId); });
    }
    if (feed.length === 0) {
      el.innerHTML = '<div class="empty-feed">Follow some users then generate posts</div>';
      return;
    }
    var html = "";
    var lim = Math.min(feed.length, 20);
    for (var i = 0; i < lim; i++) {
      var p = feed[i];
      html += '<div class="feed-post">';
      html += '<div class="fp-avatar" style="background:' + p.color + '">' + p.init + '</div>';
      html += '<div><div class="fp-author">' + p.name + '<span class="fp-time">' + relTime(p.ts) + '</span></div>';
      html += '<div class="fp-text">' + p.text + '</div></div>';
      html += '</div>';
    }
    el.innerHTML = html;
  }

  window.simModel = function (m) {
    model = m;
    var bp = document.getElementById("btn-push");
    var bl = document.getElementById("btn-pull");
    var ind = document.getElementById("model-ind");
    if (m === "push") {
      if (bp) bp.classList.add("active");
      if (bl) bl.classList.remove("active");
      if (ind) { ind.className = "model-ind push"; ind.textContent = "\u26a1 Push \u2014 feed pre-computed in Redis"; }
      setStatus("Push model active. Feed served from Redis cache.");
    } else {
      if (bp) bp.classList.remove("active");
      if (bl) bl.classList.add("active");
      if (ind) { ind.className = "model-ind pull"; ind.textContent = "\ud83d\udd0d Pull \u2014 feed computed from post DB at read time"; }
      setStatus("Pull model active. Feed queries post DB on every load.");
    }
    renderFeed();
  };

  renderUsers();
  renderFeed();
})();
</script>

---

## 11. Storage Estimation

No system design answer is complete without storage math.

**Post row schema:**

<div class="code-wrap">
<div class="code-lang">SQL — posts table schema</div>
<pre class="code-block"><span class="kw">CREATE TABLE</span> posts (
    post_id        <span class="ty">BIGINT</span>       <span class="kw">NOT NULL</span>,  <span class="cm">-- 8 B  (Snowflake ID encodes time + node)</span>
    author_id      <span class="ty">BIGINT</span>       <span class="kw">NOT NULL</span>,  <span class="cm">-- 8 B</span>
    content        <span class="ty">VARCHAR</span>(<span class="nu">280</span>) <span class="kw">NOT NULL</span>,  <span class="cm">-- avg ~140 B UTF-8</span>
    media_url      <span class="ty">VARCHAR</span>(<span class="nu">256</span>),            <span class="cm">-- 256 B nullable</span>
    created_at     <span class="ty">BIGINT</span>       <span class="kw">NOT NULL</span>,  <span class="cm">-- 8 B  Unix ms</span>
    likes_count    <span class="ty">INT</span>          <span class="kw">DEFAULT</span> <span class="nu">0</span>, <span class="cm">-- 4 B</span>
    comments_count <span class="ty">INT</span>          <span class="kw">DEFAULT</span> <span class="nu">0</span>, <span class="cm">-- 4 B</span>
    metadata       <span class="ty">JSONB</span>,                   <span class="cm">-- ~200 B avg (hashtags, mentions, geo)</span>
    <span class="kw">PRIMARY KEY</span> (author_id, post_id)        <span class="cm">-- Cassandra: partition by author</span>
);
<span class="cm">-- Estimated row size: ~850 B raw ≈ 1 KB with Cassandra overhead + secondary indexes</span></pre>
</div>

**Volume calculations:**

| Component | Calculation | Size |
|---|---|---|
| Posts raw | 1 B/day × 365 × 5 yr × 1 KB | ~1.8 PB |
| Posts with replication (×3) | 1.8 PB × 3 | ~5.4 PB |
| Redis feed cache | 500 M users × 1 000 post-IDs × 8 B | ~4 TB |
| Redis active only (20 % DAU) | 4 TB × 0.20 | ~800 GB |
| Follow graph | 500 M × 200 follows × 8 B | ~800 GB |
| Media (images, 20 % of posts) | 200 M/day × 500 KB | ~100 TB/day |
| Media CDN origin (5 yr) | 100 TB × 365 × 5 | ~183 PB |

**Ingestion bandwidth:**
- Posts DB write: 11 500 / sec × 1 KB = **11.5 MB / sec** — comfortable for a 20-node Cassandra cluster
- Fan-out writes: 2.3 M Redis ops / sec — requires a Redis cluster of ~15–20 shards
- Media ingest: 100 TB / day = **~1.2 GB / sec** — handled by S3 multipart upload with transfer acceleration

**Feed cache sizing:** 4 TB is the theoretical max. In practice, LRU eviction is applied to users inactive for more than 30 days. Instagram reported ~60 % of users are DAU, so the working set fits in roughly 2.4 TB of Redis RAM — about 20 nodes at 128 GB each, leaving headroom for replication.

---

## 12. Key Takeaways

Walking all seven levels, the core principles are clear.

**Read / write tension is the whole game.** Every news-feed decision is a negotiation: faster reads require more write work. The hybrid model is the industry consensus because it optimises for the common case (regular users, cheap fan-out) while isolating the edge case (celebrities, skip fan-out).

**Architecture evolves with load.** The naïve SQL approach works at 10 K users. Fan-out on write works at 1 M users. The hybrid is *necessary* at 100 M+. There is no universally correct architecture — only architectures appropriate for a given load.

**Cursor pagination is non-negotiable.** On any feed with live updates, offset-based pagination produces incorrect results. This is a correctness requirement, not a performance optimisation.

**Decouple writes from side-effects.** The Kafka layer between Post Service and Fan-out Worker makes the system resilient to worker outages without affecting write availability. Post creation returns in &lt; 5 ms; fan-out completes asynchronously.

**Store IDs in caches, not documents.** The Redis feed cache holds post IDs, not full post content. This means posts can be edited or deleted without invalidating feed caches — the downstream batch fetch always retrieves the current version. Cache invalidation becomes trivial.

{: class="marginalia" }
Twitter's original architecture used fan-out on write exclusively — until Justin Bieber joined. His first tweet triggered fan-out to millions of followers simultaneously, saturating all fan-out workers. The "Bieber problem" forced Twitter to build the hybrid architecture now used industry-wide.

**Interview checklist:**

1. Scope requirements: DAU, posts/sec, read/write ratio, follower distribution
2. Naive pull → identify thundering-herd DB bottleneck
3. Fan-out on write → identify celebrity write-amplification problem
4. Hybrid routing → explain the threshold and merge strategy
5. Draw full architecture: Post Service → Kafka → Fan-out Worker → Redis / Celebrity Cache → Feed Read Service
6. Cursor-based pagination — explain why OFFSET is wrong
7. Ranking as an enhancement — recency decay + engagement + relationship strength
8. Back-of-envelope: storage, bandwidth, Redis cluster sizing

Demonstrate that progression coherently and you have answered one of the most common distributed-systems questions at senior-level engineering interviews.

---

*Next in the series: **#6 — Design a Distributed Cache** — from a single Redis node to a globally consistent multi-region caching layer.*
