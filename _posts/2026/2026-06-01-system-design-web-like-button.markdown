---
layout: post
title: "System Design: The Like Button — Counting at Billions of Clicks per Second"
date: 2026-06-01 10:00:00 +0000
categories: ["post"]
tags: [system-design, redis, counters, eventual-consistency, web, interview]
series: "System Design: Web Scenarios"
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

.pipeline-row { display:flex;gap:.5rem;flex-wrap:wrap;margin:1.5rem 0;align-items:stretch; }
.pipeline-box { flex:1;min-width:90px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:.7rem .6rem;text-align:center;cursor:pointer;transition:all .2s;font-size:.72rem;color:rgba(255,255,255,.75); }
.pipeline-box:hover,.pipeline-box.active { background:#1d2e24;border-color:#7bcdab;color:#7bcdab; }
.pipeline-box .picon { display:block;font-size:1.3rem;margin-bottom:.3rem; }
.pipeline-arrow { display:flex;align-items:center;color:rgba(255,255,255,.25);font-size:1.1rem;flex-shrink:0; }
.pipeline-detail { background:#1a2e22;border:1px solid rgba(123,205,171,.25);border-radius:10px;padding:1.2rem;margin-top:.8rem;font-size:.84rem;line-height:1.7;color:rgba(255,255,255,.82);display:none; }
.pipeline-detail.show { display:block; }
.pipeline-detail strong { color:#fbef8a; }

.like-demo-wrap { display:flex;flex-direction:column;align-items:center;gap:1.2rem;padding:1.5rem; }
.heart-btn { background:none;border:none;cursor:pointer;font-size:4rem;line-height:1;transition:transform .15s,filter .15s;outline:none;user-select:none; }
.heart-btn:active { transform:scale(.88); }
.heart-btn.liked { filter:drop-shadow(0 0 10px rgba(240,128,128,.8)); }
.like-count-display { font-size:2.2rem;font-weight:800;color:#fbef8a;font-family:"JetBrains Mono","Fira Code",monospace;min-width:100px;text-align:center;transition:transform .12s; }
.like-count-display.bump { transform:scale(1.18); }
.redis-log { background:#0e0f12;border:1px solid #2e2f35;border-radius:8px;padding:.8rem 1rem;font-family:"JetBrains Mono","Fira Code",monospace;font-size:.74rem;color:#7bcdab;max-height:140px;overflow-y:auto;width:100%;box-sizing:border-box; }
.redis-log .log-line { padding:.15rem 0;border-bottom:1px solid #1a1b20;opacity:.85; }
.redis-log .log-cmd { color:#fbef8a; }
.redis-log .log-resp { color:rgba(255,255,255,.45); }

.arch-wrap { display:flex;flex-direction:column;gap:.6rem;margin:1.5rem 0; }
.arch-row { display:flex;gap:.5rem;align-items:center;flex-wrap:wrap; }
.arch-box { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:.6rem 1rem;font-size:.8rem;color:rgba(255,255,255,.8);cursor:pointer;transition:all .2s;text-align:center;min-width:110px; }
.arch-box:hover,.arch-box.active { background:#1d2e24;border-color:#7bcdab;color:#7bcdab; }
.arch-arrow { color:rgba(255,255,255,.25);font-size:1rem;padding:0 .2rem; }
.arch-detail { background:#1a2e22;border:1px solid rgba(123,205,171,.25);border-radius:10px;padding:1rem 1.2rem;margin-top:.5rem;font-size:.83rem;line-height:1.7;color:rgba(255,255,255,.82);display:none; }
.arch-detail.show { display:block; }
.arch-detail strong { color:#fbef8a; }

.event-stream-wrap { position:relative;overflow:hidden;height:160px;background:#0e0f12;border:1px solid #2e2f35;border-radius:10px;margin:1rem 0; }
.event-lane { position:absolute;top:0;left:0;width:100%;height:100%; }
.ev-dot { position:absolute;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;transition:none;pointer-events:none; }
.pipeline-stages { display:flex;justify-content:space-between;padding:.4rem 1rem;background:#1a1b20;border-top:1px solid #2e2f35;font-size:.7rem;color:rgba(255,255,255,.35);letter-spacing:.06em;text-transform:uppercase; }

.flush-diagram { display:flex;flex-direction:column;gap:.8rem;margin:1.2rem 0; }
.flush-row { display:flex;align-items:center;gap:.6rem;flex-wrap:wrap; }
.flush-box { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:.5rem .9rem;font-size:.78rem;color:rgba(255,255,255,.78);text-align:center;min-width:100px; }
.flush-box.redis { border-color:rgba(123,205,171,.4);color:#7bcdab; }
.flush-box.db    { border-color:rgba(251,239,138,.4);color:#fbef8a; }
.flush-box.job   { border-color:rgba(137,192,208,.4);color:#89c0d0; }
.flush-arrow { color:rgba(255,255,255,.3);font-size:.9rem; }
.flush-timer { font-size:.7rem;color:rgba(255,255,255,.35);font-style:italic; }

.pn-counter-wrap { display:flex;gap:1rem;flex-wrap:wrap;margin:1.2rem 0;justify-content:center; }
.pn-box { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:1rem 1.2rem;text-align:center;min-width:120px; }
.pn-box .pn-label { font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.35);margin-bottom:.4rem; }
.pn-box .pn-val { font-size:2rem;font-weight:800;color:#fbef8a;font-family:"JetBrains Mono","Fira Code",monospace; }
.pn-box.pos .pn-val { color:#7bcdab; }
.pn-box.neg .pn-val { color:#f08080; }
</style>

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios
</div>

{: class="marginalia" }
**Facebook's "Reactions"<br/>(Like, Love, Haha, Wow,<br/>Sad, Angry) are<br/>architecturally the same<br/>problem — just 6 counters<br/>per post instead of 1.<br/>The 2016 launch added<br/>~6x write load to their<br/>like infrastructure<br/>overnight.**

Design the "Like" button for YouTube. At peak, a viral video receives **500,000 likes per minute**. Likes must be accurate, fast, and eventually consistent. Users should see a near-real-time count. Likes must be **idempotent** — clicking twice must not double-count.

This is one of the most common system design interview questions. It looks trivial. It is not.

---

## 1. Scale &amp; Constraints

<div class="stat-grid">
  <div class="stat-card"><span class="stat-num">800M</span><div class="stat-lbl">YouTube DAU</div></div>
  <div class="stat-card"><span class="stat-num">8,333</span><div class="stat-lbl">Likes/sec (viral video)</div></div>
  <div class="stat-card"><span class="stat-num">~2M</span><div class="stat-lbl">Platform likes/sec peak</div></div>
  <div class="stat-card"><span class="stat-num">1000:1</span><div class="stat-lbl">Read : Write ratio</div></div>
  <div class="stat-card"><span class="stat-num">&lt;100ms</span><div class="stat-lbl">Like latency target</div></div>
  <div class="stat-card"><span class="stat-num">~1s</span><div class="stat-lbl">Acceptable count lag</div></div>
</div>

The read:write asymmetry is critical. For every person clicking Like, roughly 1,000 users are just viewing the count. This means the **display path** must be ultra-cheap (cache-heavy), while the **write path** can tolerate slightly more latency and can be eventually consistent.

The constraints immediately rule out naive relational approaches. Let's walk through each level.

---

## 2. Level 1 — Naive SQL

The first instinct is to increment a counter in the database:

<div class="code-wrap">
<div class="code-lang">sql <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">-- Like a video</span>
<span class="kw">UPDATE</span> videos
<span class="kw">SET</span>    like_count <span class="op">=</span> like_count <span class="op">+</span> <span class="nu">1</span>
<span class="kw">WHERE</span>  id <span class="op">=</span> <span class="st">'video_abc'</span><span class="op">;</span>

<span class="cm">-- Idempotency via unique constraint</span>
<span class="kw">INSERT INTO</span> user_likes (user_id, video_id)
<span class="kw">VALUES</span> (<span class="st">'user_123'</span>, <span class="st">'video_abc'</span>)
<span class="kw">ON DUPLICATE KEY UPDATE</span> user_id <span class="op">=</span> user_id<span class="op">;</span></pre>
</div>

**Why it breaks at scale:**

The `UPDATE videos SET like_count = like_count + 1` statement acquires a **row-level lock** on that single row for the duration of the transaction. At 8,333 writes/sec all hitting the same `video_abc` row, you get:

- Lock contention: writes queue up, latency climbs from milliseconds to seconds
- Connection pool exhaustion: threads holding locks block new connections
- **Thundering herd**: a cache expiry causes all readers to hit DB simultaneously

<div class="callout callout-red">
<strong>Benchmark reality check:</strong> A single MySQL row can handle roughly 5,000–10,000 <em>simple</em> updates/sec under ideal conditions. But "simple" means no contention. When 8,333 concurrent writers target the <em>same row</em>, effective throughput collapses to a few hundred writes/sec — the rest queue or timeout. A single viral video breaks the database.
</div>

The idempotency table (`user_likes`) also creates a secondary write on every like, doubling DB load. And reads at 1000× the write rate hit the same DB unless you add read replicas — which don't help write throughput at all.

**Verdict:** Works for a small site. Fails at YouTube scale on a single hot video.

---

## 3. Level 2 — Write-Through Redis Counter

Replace the DB write with an atomic Redis operation:

<div class="code-wrap">
<div class="code-lang">redis-cli <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Atomic increment — O(1), no locks needed</span>
<span class="fn">INCR</span> <span class="st">video:likes:abc123</span>
<span class="cm"># Returns: (integer) 500001</span>

<span class="cm"># Idempotency: only INCR if user hasn't liked yet</span>
<span class="fn">SET</span>  <span class="st">user:liked:user123:abc123</span>  <span class="nu">1</span>  <span class="kw">NX</span>  <span class="kw">EX</span> <span class="nu">86400</span>
<span class="cm"># NX = only set if Not eXists → returns OK or nil</span>
<span class="cm"># EX 86400 = expire after 24h (memory management)</span>

<span class="cm"># Read the count (served from Redis — 100k ops/sec)</span>
<span class="fn">GET</span>  <span class="st">video:likes:abc123</span></pre>
</div>

Redis `INCR` is atomic because **Redis is single-threaded for command execution** — no locks, no contention. A single Redis node handles ~100,000 simple operations/second, which comfortably handles 8,333 writes/sec for one video.

{: class="marginalia" }
**The Redis INCR command is<br/>atomic because Redis is<br/>single-threaded for command<br/>execution. No locks needed<br/>— it's one of the reasons<br/>Redis counters are so popular<br/>for this exact use case.**

**Problems with Level 2:**
- Redis is **in-memory**: if the node crashes, like counts reset to zero
- The idempotency keys (`user:liked:…`) use significant memory across millions of users and videos
- We still haven't addressed persistence to a database

### Interactive Demo: Redis Like Counter

<div class="viz-wrap">
  <div class="viz-title">&#9654; Live Like Counter — Click the heart. Click again to unlike. Try rapid-clicking.</div>
  <div class="like-demo-wrap">
    <div>
      <button class="heart-btn" id="heart-btn" onclick="toggleLike()" title="Like this video">&#x1F90D;</button>
    </div>
    <div style="text-align:center;">
      <div class="like-count-display" id="like-count-display">500,000</div>
      <div style="font-size:.72rem;color:rgba(255,255,255,.35);margin-top:.3rem;text-transform:uppercase;letter-spacing:.07em;">Likes</div>
    </div>
    <div style="width:100%;max-width:480px;">
      <div class="viz-title">Redis Command Log</div>
      <div class="redis-log" id="redis-log">
        <div class="log-line"><span class="log-cmd">READY.</span> <span class="log-resp">Click the heart to start.</span></div>
      </div>
    </div>
    <div style="display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;">
      <button class="viz-btn run" onclick="rapidClickTest()">Rapid-Click Test (10x)</button>
      <button class="viz-btn" onclick="resetLikeDemo()">Reset Demo</button>
    </div>
    <div id="debounce-notice" style="font-size:.78rem;color:#fbef8a;display:none;text-align:center;">
      &#9888; Debounce active — 10 rapid clicks collapsed to 1 net operation
    </div>
  </div>
</div>

<script>
(function() {
  var likeCount = 500000;
  var isLiked = false;
  var debounceTimer = null;
  var pendingLikes = 0;

  function formatNum(n) {
    return n.toLocaleString();
  }

  function addLog(cmd, resp) {
    var log = document.getElementById('redis-log');
    var line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = '<span class="log-cmd">' + cmd + '</span> <span class="log-resp">' + resp + '</span>';
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  function bumpDisplay() {
    var el = document.getElementById('like-count-display');
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    setTimeout(function() { el.classList.remove('bump'); }, 200);
  }

  window.toggleLike = function() {
    var notice = document.getElementById('debounce-notice');
    notice.style.display = 'none';
    var btn = document.getElementById('heart-btn');
    if (!isLiked) {
      isLiked = true;
      likeCount++;
      btn.textContent = '\u2764\uFE0F';
      btn.classList.add('liked');
      document.getElementById('like-count-display').textContent = formatNum(likeCount);
      bumpDisplay();
      addLog('SET user:liked:you:video_abc 1 NX EX 86400', '(string) OK');
      addLog('INCR video:likes:video_abc', '(integer) ' + likeCount);
    } else {
      isLiked = false;
      likeCount--;
      btn.textContent = '\uD83E\uDC0D';
      btn.classList.remove('liked');
      document.getElementById('like-count-display').textContent = formatNum(likeCount);
      bumpDisplay();
      addLog('DEL user:liked:you:video_abc', '(integer) 1');
      addLog('DECR video:likes:video_abc', '(integer) ' + likeCount);
    }
  };

  window.rapidClickTest = function() {
    var notice = document.getElementById('debounce-notice');
    notice.style.display = 'none';
    var clickCount = 0;
    var baseCount = likeCount;
    addLog('--- Rapid-click test: 10 clicks in 200ms ---', '');
    var interval = setInterval(function() {
      clickCount++;
      if (clickCount <= 10) {
        addLog('click #' + clickCount + ' received', '(debouncing...)');
      } else {
        clearInterval(interval);
        var netOp = (clickCount % 2 === 0) ? 'no change' : (isLiked ? 'unlike' : 'like');
        if (clickCount % 2 !== 0) {
          isLiked = !isLiked;
          if (isLiked) {
            likeCount++;
            document.getElementById('heart-btn').textContent = '\u2764\uFE0F';
            document.getElementById('heart-btn').classList.add('liked');
          } else {
            likeCount--;
            document.getElementById('heart-btn').textContent = '\uD83E\uDC0D';
            document.getElementById('heart-btn').classList.remove('liked');
          }
          document.getElementById('like-count-display').textContent = formatNum(likeCount);
          bumpDisplay();
          addLog('INCR video:likes:video_abc', '(integer) ' + likeCount + ' [1 net op, not 10]');
        } else {
          addLog('no-op (even clicks cancel out)', '(integer) ' + likeCount + ' [debounce: 0 net ops]');
        }
        notice.style.display = 'block';
      }
    }, 20);
  };

  window.resetLikeDemo = function() {
    likeCount = 500000;
    isLiked = false;
    document.getElementById('heart-btn').textContent = '\uD83E\uDC0D';
    document.getElementById('heart-btn').classList.remove('liked');
    document.getElementById('like-count-display').textContent = formatNum(likeCount);
    document.getElementById('debounce-notice').style.display = 'none';
    var log = document.getElementById('redis-log');
    log.innerHTML = '<div class="log-line"><span class="log-cmd">RESET.</span> <span class="log-resp">Counter restored to 500,000.</span></div>';
  };

  window.copyCode = window.copyCode || function(btn) {
    var pre = btn.closest('.code-wrap').querySelector('pre');
    navigator.clipboard.writeText(pre.innerText).then(function() {
      btn.textContent = 'copied!';
      btn.classList.add('copied');
      setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500);
    });
  };
})();
</script>

---

## 4. Level 3 — Write-Behind with Batch Flush

The solution to the durability problem: **keep Redis as the live counter, but asynchronously flush deltas to the database**.

<div class="flush-diagram">
  <div class="flush-row">
    <div class="flush-box redis">Redis<br/><small>Live counter</small></div>
    <div class="flush-arrow">&#8594;</div>
    <div class="flush-box job">Background Job<br/><small>Every 30s</small></div>
    <div class="flush-arrow">&#8594;</div>
    <div class="flush-box db">MySQL/Postgres<br/><small>Source of truth</small></div>
  </div>
  <div class="flush-row" style="padding-left:.5rem;">
    <div class="flush-timer">INCR video:likes:{id} — instant, in-memory</div>
    <div style="flex:1;"></div>
    <div class="flush-timer">UPDATE videos SET likes = likes + delta</div>
  </div>
</div>

<div class="code-wrap">
<div class="code-lang">python — background flush job <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> redis, mysql.connector, time

r <span class="op">=</span> redis.<span class="fn">Redis</span>()
db <span class="op">=</span> mysql.connector.<span class="fn">connect</span>(<span class="op">...</span>)

<span class="kw">def</span> <span class="fn">flush_like_counts</span>():
    <span class="cm"># GETDEL atomically reads and removes the delta key</span>
    cursor <span class="op">=</span> r.<span class="fn">scan_iter</span>(<span class="st">"video:likes:delta:*"</span>)
    <span class="kw">for</span> key <span class="kw">in</span> cursor:
        delta <span class="op">=</span> r.<span class="fn">getdel</span>(key)       <span class="cm"># atomic read + delete</span>
        <span class="kw">if</span> delta:
            video_id <span class="op">=</span> key.<span class="fn">decode</span>().<span class="fn">split</span>(<span class="st">':'</span>)[<span class="op">-</span><span class="nu">1</span>]
            db.cursor().<span class="fn">execute</span>(
                <span class="st">"UPDATE videos SET likes = likes + %s WHERE id = %s"</span>,
                (<span class="fn">int</span>(delta), video_id)
            )
    db.<span class="fn">commit</span>()

<span class="kw">while</span> <span class="nu">True</span>:
    <span class="fn">flush_like_counts</span>()
    time.<span class="fn">sleep</span>(<span class="nu">30</span>)     <span class="cm"># flush every 30 seconds</span></pre>
</div>

**Two Redis keys per video:**

<div class="code-wrap">
<div class="code-lang">redis-cli <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Live display counter (absolute, loaded from DB + live delta)</span>
<span class="fn">GET</span>   <span class="st">video:likes:abc123</span>         <span class="cm"># → "500,423" (shown to user)</span>

<span class="cm"># Delta buffer (how many likes since last DB flush)</span>
<span class="fn">INCR</span>  <span class="st">video:likes:delta:abc123</span>   <span class="cm"># → incremented atomically</span>

<span class="cm"># On flush: read delta, write to DB, delete delta key</span>
<span class="fn">GETDEL</span> <span class="st">video:likes:delta:abc123</span>  <span class="cm"># → "8333" (30s of likes)</span></pre>
</div>

<div class="callout callout-green">
<strong>Write-behind properties:</strong> Reads are still ultra-fast (Redis GET). Writes hit Redis only (in-memory). DB writes are batched — instead of 8,333 writes/sec, the DB sees <strong>1 write per 30 seconds per video</strong>. If Redis crashes, we lose at most 30 seconds of likes — usually acceptable.
</div>

**What to say in an interview:** *"The trade-off is a 30-second window of data loss on Redis crash. We mitigate this with Redis persistence (AOF/RDB snapshots) and Redis Sentinel for HA. For a like count, losing 30 seconds of likes on a node failure is an acceptable trade-off versus the DB being the hot write path."*

---

## 5. Level 4 — Event Streaming with Kafka

For true scale, analytics, and full decoupling: publish every like/unlike as an **event**.

<div class="code-wrap">
<div class="code-lang">json — like event schema <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block">{
  <span class="pp">"userId"</span>:    <span class="st">"user_a1b2c3"</span>,
  <span class="pp">"videoId"</span>:   <span class="st">"video_abc123"</span>,
  <span class="pp">"action"</span>:    <span class="st">"like"</span>,           <span class="cm">// "like" | "unlike"</span>
  <span class="pp">"timestamp"</span>: <span class="nu">1748736000000</span>,    <span class="cm">// Unix ms</span>
  <span class="pp">"region"</span>:    <span class="st">"us-east-1"</span>,
  <span class="pp">"sessionId"</span>: <span class="st">"sess_xyz789"</span>
}</pre>
</div>

<div class="code-wrap">
<div class="code-lang">python — kafka producer <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">from</span> kafka <span class="kw">import</span> KafkaProducer
<span class="kw">import</span> json

producer <span class="op">=</span> <span class="fn">KafkaProducer</span>(
    bootstrap_servers<span class="op">=</span>[<span class="st">'kafka-1:9092'</span>, <span class="st">'kafka-2:9092'</span>],
    value_serializer<span class="op">=lambda</span> v: json.<span class="fn">dumps</span>(v).<span class="fn">encode</span>()
)

<span class="kw">def</span> <span class="fn">publish_like_event</span>(user_id, video_id, action):
    producer.<span class="fn">send</span>(
        topic<span class="op">=</span><span class="st">'video-likes'</span>,
        key<span class="op">=</span>video_id.<span class="fn">encode</span>(),     <span class="cm"># partition by videoId</span>
        value<span class="op">=</span>{
            <span class="st">'userId'</span>:    user_id,
            <span class="st">'videoId'</span>:   video_id,
            <span class="st">'action'</span>:    action,
            <span class="st">'timestamp'</span>: <span class="fn">time_ms</span>()
        }
    )</pre>
</div>

**Stream processor (Flink/Spark Streaming):**

<div class="code-wrap">
<div class="code-lang">pseudocode — 1-second tumbling window <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">// For each 1-second window of events:</span>
events
  .<span class="fn">filter</span>(e <span class="op">=&gt;</span> e.action <span class="op">==</span> <span class="st">"like"</span>)
  .<span class="fn">keyBy</span>(e <span class="op">=&gt;</span> e.videoId)
  .<span class="fn">window</span>(<span class="ty">TumblingEventTimeWindows</span>.<span class="fn">of</span>(<span class="nu">1</span>, SECONDS))
  .<span class="fn">aggregate</span>(<span class="fn">count</span>)
  .<span class="fn">sink</span>(redisSink)             <span class="cm">// INCRBY video:likes:X delta</span>

<span class="cm">// Every 60 seconds: snapshot Redis → MySQL</span>
<span class="cm">// (same flush pattern as Level 3)</span></pre>
</div>

**Why Kafka unlocks more:**
- **Replay**: if the aggregator has a bug, replay all events to recompute counts
- **Analytics**: who liked what, from where, at what time — fan out to a data warehouse
- **Multiple consumers**: the like feed can power recommendations, notifications, trending algorithms — all from the same event stream
- **Backpressure handling**: Kafka buffers spikes; the aggregator processes at its own pace

### Interactive: Event Stream Visualizer

<div class="viz-wrap">
  <div class="viz-title">&#9654; Event Stream Visualizer — Watch like events flow through the pipeline</div>
  <div class="viz-controls">
    <button class="viz-btn run" id="stream-start-btn" onclick="startStream()">Start Stream</button>
    <button class="viz-btn" onclick="stopStream()">Stop</button>
    <button class="viz-btn run" id="spike-btn" onclick="simulateSpike()" style="background:#f08080;margin-left:.3rem;">Simulate Viral Spike</button>
  </div>

  <div style="display:flex;justify-content:space-between;font-size:.7rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;padding:0 .5rem;margin-bottom:.3rem;">
    <span>User</span><span>Kafka</span><span>Aggregator</span><span>Redis</span><span>Display</span>
  </div>
  <div class="event-stream-wrap" id="event-stream-wrap"></div>

  <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:1rem;align-items:center;">
    <div>
      <div style="font-size:.7rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.07em;">Events/sec</div>
      <div style="font-size:1.4rem;font-weight:800;color:#7bcdab;font-family:'JetBrains Mono','Fira Code',monospace;" id="stream-eps">0</div>
    </div>
    <div>
      <div style="font-size:.7rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.07em;">Aggregated Count</div>
      <div style="font-size:1.4rem;font-weight:800;color:#fbef8a;font-family:'JetBrains Mono','Fira Code',monospace;" id="stream-count">500,000</div>
    </div>
    <div>
      <div style="font-size:.7rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.07em;">Window Batches</div>
      <div style="font-size:1.4rem;font-weight:800;color:#89c0d0;font-family:'JetBrains Mono','Fira Code',monospace;" id="stream-batches">0</div>
    </div>
  </div>
</div>

<script>
(function() {
  var streamInterval = null;
  var batchInterval = null;
  var streamCount = 500000;
  var streamBatches = 0;
  var currentEps = 0;
  var dots = [];
  var dotIdCounter = 0;

  var COLORS = ['#7bcdab','#fbef8a','#89c0d0','#f08080','#cc99cd'];
  var STAGES_X = [5, 25, 50, 75, 95]; // percent

  function makeDot(isSpike) {
    var wrap = document.getElementById('event-stream-wrap');
    if (!wrap) return;
    var dot = document.createElement('div');
    dot.className = 'ev-dot';
    var col = COLORS[Math.floor(Math.random() * COLORS.length)];
    var yPct = 15 + Math.random() * 65;
    dot.style.cssText = 'left:' + STAGES_X[0] + '%;top:' + yPct + '%;background:' + col + ';opacity:0;transition:left 1.4s linear,opacity .25s;z-index:2;';
    dot.textContent = isSpike ? '\u2764' : '\uD83D\uDC4D';
    dot.style.fontSize = isSpike ? '1rem' : '.75rem';
    wrap.appendChild(dot);
    var id = ++dotIdCounter;
    dot._id = id;
    dots.push(dot);

    setTimeout(function() { dot.style.opacity = '1'; }, 20);
    setTimeout(function() { dot.style.left = STAGES_X[4] + '%'; }, 40);
    setTimeout(function() {
      if (dot.parentNode) dot.parentNode.removeChild(dot);
      dots = dots.filter(function(d) { return d._id !== id; });
    }, 1800);
  }

  function tick(isSpike) {
    var count = isSpike ? 12 : 2;
    for (var i = 0; i < count; i++) {
      setTimeout(makeDot, i * (isSpike ? 20 : 80), isSpike);
    }
    currentEps = isSpike ? 180 : 14;
    var delta = isSpike ? Math.floor(Math.random() * 80 + 40) : Math.floor(Math.random() * 6 + 1);
    streamCount += delta;
    var epsEl = document.getElementById('stream-eps');
    var cntEl = document.getElementById('stream-count');
    if (epsEl) epsEl.textContent = currentEps;
    if (cntEl) cntEl.textContent = streamCount.toLocaleString();
  }

  function batchTick() {
    streamBatches++;
    var el = document.getElementById('stream-batches');
    if (el) el.textContent = streamBatches;
  }

  window.startStream = function() {
    if (streamInterval) return;
    streamInterval = setInterval(function() { tick(false); }, 500);
    batchInterval = setInterval(batchTick, 1000);
  };

  window.stopStream = function() {
    clearInterval(streamInterval);
    clearInterval(batchInterval);
    streamInterval = null;
    batchInterval = null;
    currentEps = 0;
    var epsEl = document.getElementById('stream-eps');
    if (epsEl) epsEl.textContent = '0';
  };

  window.simulateSpike = function() {
    var spikeTicks = 0;
    var spikeInterval = setInterval(function() {
      tick(true);
      spikeTicks++;
      if (spikeTicks >= 8) clearInterval(spikeInterval);
    }, 150);
    if (!streamInterval) {
      batchInterval = batchInterval || setInterval(batchTick, 1000);
    }
  };
})();
</script>

---

## 6. Level 5 — Idempotency at Scale

The hardest constraint: **one user = one like**, even across distributed nodes. Compare the options:

<table class="comp-table">
  <thead>
    <tr>
      <th>Option</th>
      <th>Mechanism</th>
      <th>Pros</th>
      <th>Cons</th>
      <th>Verdict</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>A</strong> — Redis SET NX</td>
      <td><code>SET user:liked:{uid}:{vid} 1 NX</code></td>
      <td>Fast, atomic, no DB touch</td>
      <td>Memory: grows O(users × videos); eviction loses data</td>
      <td><span class="badge badge-yellow">OK for hot videos</span></td>
    </tr>
    <tr>
      <td><strong>B</strong> — DB unique constraint</td>
      <td><code>UNIQUE(user_id, video_id)</code> in likes table</td>
      <td>Perfectly accurate; no memory issue</td>
      <td>DB write on every like; hot table at scale</td>
      <td><span class="badge badge-green">Best for correctness</span></td>
    </tr>
    <tr>
      <td><strong>C</strong> — Bloom filter</td>
      <td>Per-video probabilistic set membership</td>
      <td>Sub-MB memory per video; ultra-fast</td>
      <td>False positives → rare legitimate likes dropped; no undo</td>
      <td><span class="badge badge-red">Not for unlikes</span></td>
    </tr>
    <tr>
      <td><strong>D</strong> — UserID partition</td>
      <td>Shard by userId; each shard checks locally</td>
      <td>Distributed; each shard is independent</td>
      <td>Cross-shard queries needed for analytics; shard rebalancing</td>
      <td><span class="badge badge-blue">Best at extreme scale</span></td>
    </tr>
  </tbody>
</table>

**Recommended hybrid for an interview:**

<div class="callout callout-green">
<strong>Recommended approach:</strong> Use <strong>Redis SET NX</strong> as the fast path (in-memory idempotency for recent likes). Back it with a <strong>DB unique constraint</strong> as the authoritative check. Redis handles the hot path; the DB enforces correctness. If Redis evicts a key (memory pressure), the DB constraint catches the duplicate.
</div>

<div class="code-wrap">
<div class="code-lang">python — hybrid idempotency <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">like_video</span>(user_id, video_id):
    key <span class="op">=</span> <span class="st">'user:liked:'</span> <span class="op">+</span> user_id <span class="op">+</span> <span class="st">':'</span> <span class="op">+</span> video_id

    <span class="cm"># Fast path: Redis NX check (in-memory)</span>
    <span class="kw">if not</span> r.<span class="fn">set</span>(key, <span class="nu">1</span>, nx<span class="op">=True</span>, ex<span class="op">=</span><span class="nu">86400</span>):
        <span class="kw">return</span> <span class="st">"already_liked"</span>   <span class="cm"># idempotent — no-op</span>

    <span class="cm"># Increment the display counter</span>
    r.<span class="fn">incr</span>(<span class="st">'video:likes:'</span> <span class="op">+</span> video_id)
    r.<span class="fn">incr</span>(<span class="st">'video:likes:delta:'</span> <span class="op">+</span> video_id)

    <span class="cm"># Async: write to DB (background job or queue)</span>
    <span class="cm"># DB has UNIQUE(user_id, video_id) as safety net</span>
    queue.<span class="fn">enqueue</span>(<span class="st">'persist_like'</span>, user_id, video_id)

    <span class="kw">return</span> <span class="st">"liked"</span></pre>
</div>

---

## 7. Level 6 — Sharding &amp; Geographic Distribution

A single Redis node handles ~100k ops/sec. Platform-wide, we need ~2M ops/sec. The solution: **shard Redis by videoId**.

<div class="code-wrap">
<div class="code-lang">python — consistent hashing shard selection <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> hashlib

REDIS_SHARDS <span class="op">=</span> [
    <span class="st">'redis-shard-0:6379'</span>,
    <span class="st">'redis-shard-1:6379'</span>,
    <span class="st">'redis-shard-2:6379'</span>,
    <span class="st">'redis-shard-3:6379'</span>,
]

<span class="kw">def</span> <span class="fn">get_shard</span>(video_id):
    h <span class="op">=</span> <span class="fn">int</span>(hashlib.<span class="fn">md5</span>(video_id.<span class="fn">encode</span>()).<span class="fn">hexdigest</span>(), <span class="nu">16</span>)
    <span class="kw">return</span> REDIS_SHARDS[h <span class="op">%</span> <span class="fn">len</span>(REDIS_SHARDS)]

<span class="cm"># video_abc → shard-2, video_xyz → shard-0</span>
<span class="cm"># Each shard owns ~25% of videos; ~500k ops/sec each</span></pre>
</div>

**Global distribution:**

For a truly global video (viral in both Tokyo and New York simultaneously), regional Redis clusters reduce latency and distribute load:

<div class="arch-wrap" id="geo-arch">
  <div class="arch-row">
    <div class="arch-box" onclick="showGeoDetail('client')">Client Browser</div>
    <div class="arch-arrow">&#8594;</div>
    <div class="arch-box" onclick="showGeoDetail('cdn')">CDN / Edge</div>
    <div class="arch-arrow">&#8594;</div>
    <div class="arch-box" onclick="showGeoDetail('api')">Regional API</div>
    <div class="arch-arrow">&#8594;</div>
    <div class="arch-box" onclick="showGeoDetail('redis-regional')">Regional Redis</div>
  </div>
  <div class="arch-row" style="justify-content:flex-end;gap:.5rem;">
    <div class="arch-arrow" style="transform:rotate(90deg);">&#8595;</div>
  </div>
  <div class="arch-row" style="justify-content:flex-end;">
    <div class="arch-box" onclick="showGeoDetail('sync')">Async Region Sync</div>
    <div class="arch-arrow">&#8594;</div>
    <div class="arch-box" onclick="showGeoDetail('global-redis')">Global Redis / DB</div>
  </div>
  <div class="arch-detail" id="geo-detail-client"><strong>Client Browser:</strong> The user clicks Like. The browser sends a POST /api/like to the nearest regional API endpoint. The like count shown is fetched from Redis on page load via GET /api/video/:id/likes.</div>
  <div class="arch-detail" id="geo-detail-cdn"><strong>CDN / Edge:</strong> Like counts (reads) are served from CDN edge nodes with a short TTL (5–10 seconds). This absorbs the massive read:write asymmetry. Writes (likes) bypass CDN and go directly to the regional API.</div>
  <div class="arch-detail" id="geo-detail-api"><strong>Regional API:</strong> Handles authentication, rate limiting, idempotency checks. Publishes the like event to the nearest Kafka cluster, increments the regional Redis counter, and returns immediately. P99 latency target: &lt;50ms.</div>
  <div class="arch-detail" id="geo-detail-redis-regional"><strong>Regional Redis:</strong> Holds the like count for users in this region. Counts are initialized from the global DB and incremented locally. A background job periodically ships deltas to global storage. Users see slightly different counts across regions — acceptable for ~1 second.</div>
  <div class="arch-detail" id="geo-detail-sync"><strong>Async Region Sync:</strong> Every 1–5 seconds, regional Redis clusters push their deltas to a global aggregator. This keeps all regions within ~5 seconds of each other. The sync uses Kafka as the transport to ensure no delta is lost.</div>
  <div class="arch-detail" id="geo-detail-global-redis"><strong>Global Redis / DB:</strong> The authoritative count. Regional counts converge here. MySQL holds the permanent record for video metadata + like counts. Redis Cluster (global) serves the canonical count for cold-start and cross-region reads.</div>
</div>

<script>
(function() {
  var activeGeo = null;
  window.showGeoDetail = function(id) {
    if (activeGeo) {
      var prev = document.getElementById('geo-detail-' + activeGeo);
      if (prev) prev.classList.remove('show');
      document.querySelectorAll('#geo-arch .arch-box').forEach(function(b) { b.classList.remove('active'); });
    }
    if (activeGeo === id) { activeGeo = null; return; }
    activeGeo = id;
    var el = document.getElementById('geo-detail-' + id);
    if (el) el.classList.add('show');
    var boxes = document.querySelectorAll('#geo-arch .arch-box');
    boxes.forEach(function(b) {
      if (b.getAttribute('onclick') && b.getAttribute('onclick').indexOf("'" + id + "'") !== -1) {
        b.classList.add('active');
      }
    });
  };
})();
</script>

**Eventual consistency in practice:** A user in Tokyo and a user in NYC may see like counts that differ by a few thousand for ~1 second. This is **acceptable** — like counts are inherently approximate displays, not financial ledgers. YouTube itself shows rounded counts ("1.2M likes") for popular videos, which further masks small transient differences.

{: class="marginalia" }
**YouTube doesn't show exact<br/>like counts anymore for<br/>videos under ~10k likes<br/>(they show approximations).<br/>This reduces the psychological<br/>"one more click matters"<br/>effect and — conveniently<br/>— reduces the idempotency<br/>enforcement cost.**

---

## 8. The Unlike Problem &amp; CRDTs

Eventual consistency gets non-trivial when users change their minds:

<div class="callout callout-yellow">
<strong>Scenario:</strong> User A likes a video at T=0. The like propagates to all 3 regional clusters by T=1. At T=2, User A unlikes. The unlike event starts propagating. At T=3, Region B has received the unlike but Region C hasn't. Region C still shows the count as +1. What is the correct state?
</div>

The naive G-Counter (grow-only counter) cannot model this — it has no decrement. You need a **PN-Counter** (Positive-Negative Counter):

<div class="pn-counter-wrap">
  <div class="pn-box pos">
    <div class="pn-label">P (Likes)</div>
    <div class="pn-val" id="pn-p">3</div>
  </div>
  <div style="display:flex;align-items:center;font-size:1.5rem;color:rgba(255,255,255,.3);">&#8722;</div>
  <div class="pn-box neg">
    <div class="pn-label">N (Unlikes)</div>
    <div class="pn-val" id="pn-n">1</div>
  </div>
  <div style="display:flex;align-items:center;font-size:1.5rem;color:rgba(255,255,255,.3);">=</div>
  <div class="pn-box">
    <div class="pn-label">Net Count</div>
    <div class="pn-val" id="pn-net">2</div>
  </div>
</div>

<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin:-.5rem 0 1rem;">
  <button class="viz-btn run" onclick="pnLike()">+ Like</button>
  <button class="viz-btn" onclick="pnUnlike()" style="background:#2a1616;color:#f08080;border:1px solid #f08080;">- Unlike</button>
  <button class="viz-btn" onclick="pnReset()">Reset</button>
</div>

<script>
(function() {
  var p = 3, n = 1;
  function updatePN() {
    document.getElementById('pn-p').textContent = p;
    document.getElementById('pn-n').textContent = n;
    document.getElementById('pn-net').textContent = Math.max(0, p - n);
  }
  window.pnLike = function() { p++; updatePN(); };
  window.pnUnlike = function() { if (p - n > 0) { n++; updatePN(); } };
  window.pnReset = function() { p = 3; n = 1; updatePN(); };
})();
</script>

<div class="code-wrap">
<div class="code-lang">redis-cli — PN-Counter pattern <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Instead of one counter, maintain two</span>
<span class="fn">INCR</span> <span class="st">video:likes:p:abc123</span>     <span class="cm"># positive counter (likes)</span>
<span class="fn">INCR</span> <span class="st">video:likes:n:abc123</span>     <span class="cm"># negative counter (unlikes)</span>

<span class="cm"># Display count = P - N (always >= 0)</span>
<span class="fn">GET</span> <span class="st">video:likes:p:abc123</span>      <span class="cm"># → 500,423</span>
<span class="fn">GET</span> <span class="st">video:likes:n:abc123</span>      <span class="cm"># → 50,001</span>
<span class="cm"># net = 500,423 - 50,001 = 450,422</span>

<span class="cm"># Merging regions: take MAX of each regional P and N counter</span>
<span class="cm"># P_global = max(P_us, P_eu, P_asia)</span>
<span class="cm"># N_global = max(N_us, N_eu, N_asia)</span></pre>
</div>

**Why MAX for merging?** Each region only increments its own counter and never decrements it. If Region A has seen 3 likes and Region B has seen 5 likes for the same user actions, the global truth is 5 (Region B has more complete information). Taking MAX of monotonically-increasing G-Counters gives the correct CRDT merge.

---

## 9. Capacity Estimate

<table class="comp-table">
  <thead>
    <tr><th>Component</th><th>Numbers</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td>Viral video peak writes</td><td><strong>8,333 / sec</strong></td><td>500k likes/min ÷ 60</td></tr>
    <tr><td>Platform-wide like events</td><td><strong>~2M / sec</strong> peak</td><td>800M DAU, avg 150 likes/day each</td></tr>
    <tr><td>Kafka throughput needed</td><td><strong>~10 MB/sec</strong></td><td>2M events × ~50 bytes/event</td></tr>
    <tr><td>Redis memory per video</td><td><strong>~80 bytes</strong></td><td>P counter + N counter + delta + metadata</td></tr>
    <tr><td>Top 1M videos in Redis</td><td><strong>~80 MB</strong></td><td>Trivial; Redis can hold billions of small keys</td></tr>
    <tr><td>Idempotency keys (Redis NX)</td><td><strong>~50 bytes each</strong></td><td>For 10M active likers × top 10k videos = 500 GB — use TTL or DB fallback</td></tr>
    <tr><td>DB write rate (after flush)</td><td><strong>1 write / 30s / video</strong></td><td>vs 8,333/s without batching</td></tr>
    <tr><td>Like table in DB</td><td><strong>~500 bytes / like row</strong></td><td>userId(8) + videoId(8) + timestamp(8) + indexes + overhead</td></tr>
    <tr><td>Annual like storage</td><td><strong>~150 TB / year</strong></td><td>~300B likes/year × 500 bytes</td></tr>
  </tbody>
</table>

---

## 10. Full Architecture — Clickable Pipeline

Click each stage to see implementation details:

<div class="arch-wrap" id="full-arch">
  <div class="arch-row" style="flex-wrap:wrap;">
    <div class="arch-box" onclick="showArchDetail('client2')"><span style="font-size:1.2rem;">&#x1F4F1;</span><br/>Client</div>
    <div class="arch-arrow">&#8594;</div>
    <div class="arch-box" onclick="showArchDetail('cdn2')"><span style="font-size:1.2rem;">&#x1F310;</span><br/>CDN</div>
    <div class="arch-arrow">&#8594;</div>
    <div class="arch-box" onclick="showArchDetail('apigw')"><span style="font-size:1.2rem;">&#x1F6AA;</span><br/>API Gateway</div>
    <div class="arch-arrow">&#8594;</div>
    <div class="arch-box" onclick="showArchDetail('likesvc')"><span style="font-size:1.2rem;">&#x2764;</span><br/>Like Service</div>
  </div>
  <div style="display:flex;gap:.5rem;padding-left:2.5rem;align-items:center;">
    <div style="color:rgba(255,255,255,.2);font-size:.9rem;padding:.3rem;">&#8595;</div>
    <div style="color:rgba(255,255,255,.2);font-size:.9rem;padding:.3rem;margin-left:9rem;">&#8595;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#8595;</div>
  </div>
  <div class="arch-row" style="flex-wrap:wrap;padding-left:2.5rem;">
    <div class="arch-box" onclick="showArchDetail('redis2')"><span style="font-size:1.2rem;">&#x26A1;</span><br/>Redis Cluster</div>
    <div class="arch-arrow">&amp;</div>
    <div class="arch-box" onclick="showArchDetail('kafka2')"><span style="font-size:1.2rem;">&#x1F4E8;</span><br/>Kafka Topic</div>
  </div>
  <div style="display:flex;gap:.5rem;padding-left:2.5rem;align-items:center;">
    <div style="color:rgba(255,255,255,.2);font-size:.9rem;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#8595;</div>
  </div>
  <div class="arch-row" style="padding-left:2.5rem;flex-wrap:wrap;">
    <div class="arch-box" onclick="showArchDetail('flink')"><span style="font-size:1.2rem;">&#x1F504;</span><br/>Stream Processor</div>
    <div class="arch-arrow">&#8594;</div>
    <div class="arch-box" onclick="showArchDetail('redis-display')"><span style="font-size:1.2rem;">&#x1F4CA;</span><br/>Redis Display</div>
    <div class="arch-arrow">&amp;</div>
    <div class="arch-box" onclick="showArchDetail('dbsnap')"><span style="font-size:1.2rem;">&#x1F5C4;</span><br/>DB Snapshot</div>
  </div>

  <div class="arch-detail" id="arch-detail-client2"><strong>Client:</strong> Browser or mobile app. Sends POST /v1/likes with JWT auth. Optimistically updates the UI (increments counter immediately) without waiting for server confirmation. If the server returns an error, the UI rolls back. This is the "optimistic update" pattern used by YouTube, Twitter, etc.</div>
  <div class="arch-detail" id="arch-detail-cdn2"><strong>CDN (Read Path Only):</strong> Like counts (read-only) are served from CDN with a 5–10 second TTL. At 1000:1 read:write, this means 999 out of 1000 requests never reach the origin. Writes (likes/unlikes) bypass CDN and go directly to the API gateway with cache-busting headers.</div>
  <div class="arch-detail" id="arch-detail-apigw"><strong>API Gateway:</strong> Rate limiting (max 10 likes/minute per user per video to prevent abuse), authentication (JWT validation), request routing to the Like Service. Also handles DDoS protection and bot detection. A viral video announcement can trigger coordinated like-bot attacks.</div>
  <div class="arch-detail" id="arch-detail-likesvc"><strong>Like Service:</strong> Stateless microservice (horizontally scalable). Responsibilities: (1) Idempotency check via Redis NX, (2) increment Redis counter, (3) publish event to Kafka, (4) return response. Target: P99 latency under 50ms. Deployed in 3+ regions with auto-scaling triggered at 70% CPU.</div>
  <div class="arch-detail" id="arch-detail-redis2"><strong>Redis Cluster:</strong> Sharded by videoId using consistent hashing. 4–8 shards, each handling ~500k ops/sec. Redis Sentinel for HA with automatic failover. AOF persistence enabled (fsync every second) to limit data loss to 1 second on crash. Master + 2 replicas per shard.</div>
  <div class="arch-detail" id="arch-detail-kafka2"><strong>Kafka Topic (video-likes):</strong> Partitioned by videoId (ensures all events for a video go to the same partition, preserving ordering). Replication factor 3. Retention: 7 days (allows replay for analytics or bug fixes). At 2M events/sec × 50 bytes = ~10 MB/sec throughput — well within a 3-broker Kafka cluster's capacity.</div>
  <div class="arch-detail" id="arch-detail-flink"><strong>Stream Processor (Flink):</strong> Consumes from Kafka. Runs 1-second tumbling windows to count likes per video. Outputs delta counts to Redis (INCRBY) and publishes aggregated events to analytics pipelines (BigQuery, data lake). Also detects anomalies (sudden like spikes may indicate bot activity).</div>
  <div class="arch-detail" id="arch-detail-redis-display"><strong>Redis Display Layer:</strong> A separate Redis cluster optimized for reads. Stores the display count (what the user sees). Updated by the stream processor every 1 second. CDN pulls from here. This separation means a write-path Redis failure doesn't affect the read path — users keep seeing the last known count.</div>
  <div class="arch-detail" id="arch-detail-dbsnap"><strong>DB Snapshot (MySQL):</strong> Receives periodic batch writes from the flush job (every 30–60 seconds). Holds the permanent record: like counts per video, and the full likes table (userId, videoId, timestamp) for analytics and user-facing "your liked videos" history. Sharded by videoId for write scale.</div>
</div>

<script>
(function() {
  var activeArch = null;
  window.showArchDetail = function(id) {
    if (activeArch) {
      var prev = document.getElementById('arch-detail-' + activeArch);
      if (prev) prev.classList.remove('show');
    }
    if (activeArch === id) { activeArch = null; return; }
    activeArch = id;
    var el = document.getElementById('arch-detail-' + id);
    if (el) el.classList.add('show');
  };
})();
</script>

---

## 11. Interview Cheat Sheet

When asked "Design the Like button" in an interview, structure your answer around these escalation levels:

<table class="comp-table">
  <thead>
    <tr><th>Level</th><th>Approach</th><th>Max Throughput</th><th>Key Trade-off</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>SQL <code>UPDATE ... SET likes = likes + 1</code></td>
      <td>~500 writes/sec (hot row)</td>
      <td>Simple, correct, doesn't scale</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Redis INCR + write-through</td>
      <td>~100k writes/sec</td>
      <td>Fast; data loss on crash</td>
    </tr>
    <tr>
      <td>3</td>
      <td>Redis INCR + write-behind (30s flush)</td>
      <td>~100k writes/sec</td>
      <td>Durable; 30s loss window</td>
    </tr>
    <tr>
      <td>4</td>
      <td>Kafka events + stream aggregation</td>
      <td>~2M writes/sec</td>
      <td>Fully decoupled; operationally complex</td>
    </tr>
    <tr>
      <td>5</td>
      <td>Sharded Redis + geo-distribution + PN-Counters</td>
      <td>Theoretically unlimited</td>
      <td>Eventually consistent; ~1s lag</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-green">
<strong>The key insight interviewers look for:</strong> The like button is a <em>write-heavy, read-heavier</em> problem. The answer is not "use a faster database" — it's <strong>decouple reads from writes</strong> (Redis as read cache), <strong>batch writes</strong> (flush job), and <strong>use eventual consistency</strong> where strict consistency isn't needed (like counts, not bank balances).
</div>

---

## Summary

The "Like" button is a masterclass in the gap between appearances and complexity. A single `UPDATE` statement works for your side project. At YouTube scale, it requires:

1. **Redis atomic counters** for in-memory, lock-free increment/decrement
2. **Write-behind batching** to protect the database from hot-row contention
3. **Kafka event streaming** for durability, analytics, and decoupling
4. **Hybrid idempotency** (Redis NX fast path + DB unique constraint fallback)
5. **PN-Counters** for correct CRDT semantics when merging regional like/unlike data
6. **CDN-cached read path** to absorb the 1000:1 read:write asymmetry

Every design decision is a trade-off: memory vs. durability, consistency vs. latency, simplicity vs. scale. The right answer depends on where on that curve your system needs to be.

{: class="marginalia" }
**"Facebook's 'Reactions'<br/>(Like, Love, Haha, Wow,<br/>Sad, Angry) are<br/>architecturally the same<br/>problem — just 6 counters<br/>per post instead of 1.<br/>The 2016 launch added<br/>~6x write load to their<br/>like infrastructure<br/>overnight."**
