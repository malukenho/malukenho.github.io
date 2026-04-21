---
layout: post
title: "System Design: Flash Sale — Surviving Black Friday and Limited-Stock Drops"
date: 2026-06-04 10:00:00 +0000
categories: ["post"]
tags: [system-design, redis, queue, inventory, e-commerce, rate-limiting, web, interview]
series: "System Design: Web Scenarios"
---

<style>
.flash-sale-post { color: rgba(255,255,255,0.8); }
.flash-sale-post h2,
.flash-sale-post h3,
.flash-sale-post h4 { color: #fbef8a; }

.code-block {
  background: #0d0d10;
  border: 1px solid rgba(123,205,171,0.25);
  border-left: 3px solid #7bcdab;
  border-radius: 4px;
  padding: 1.2rem 1.4rem;
  overflow-x: auto;
  font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
  font-size: 0.83rem;
  line-height: 1.75;
  margin: 1.4rem 0;
  color: rgba(255,255,255,0.75);
  display: block;
  white-space: pre;
}
.code-block .kw  { color: #7bcdab; font-weight: 600; }
.code-block .cm  { color: rgba(255,255,255,0.32); font-style: italic; }
.code-block .str { color: #fbef8a; }
.code-block .fn  { color: #c5a3ff; }
.code-block .num { color: #f4a56a; }
.code-block .op  { color: rgba(255,255,255,0.45); }

.marginalia {
  font-size: 0.81rem;
  color: rgba(255,255,255,0.48);
  border-left: 2px solid #7bcdab;
  padding: 0.55rem 1rem;
  margin: 1.6rem 0;
  font-style: italic;
  background: rgba(123,205,171,0.04);
  border-radius: 0 4px 4px 0;
}

.demo-box {
  background: #111115;
  border: 1px solid rgba(123,205,171,0.28);
  border-radius: 8px;
  padding: 1.4rem;
  margin: 2rem 0;
}
.demo-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.1rem;
  flex-wrap: wrap;
}
.demo-title {
  color: #fbef8a;
  font-weight: 700;
  font-size: 0.88rem;
  flex: 1;
}
.demo-btn {
  background: #7bcdab;
  color: #19191c;
  border: none;
  border-radius: 4px;
  padding: 0.38rem 0.9rem;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.83rem;
  transition: opacity 0.15s;
}
.demo-btn:hover   { opacity: 0.82; }
.demo-btn:disabled { opacity: 0.4; cursor: default; }
.demo-btn.sec {
  background: transparent;
  border: 1px solid #7bcdab;
  color: #7bcdab;
}

/* Race condition demo */
.race-stock-wrap {
  text-align: center;
  margin: 0.8rem 0 1rem;
}
.race-stock-label {
  display: block;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.38);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.2rem;
}
.race-stock-num {
  font-size: 2.4rem;
  font-weight: 700;
  color: #7bcdab;
  transition: color 0.3s;
}
.race-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
  margin-bottom: 0.8rem;
}
.race-col {
  background: rgba(255,255,255,0.035);
  border-radius: 6px;
  padding: 0.9rem;
}
.race-col-hd {
  color: #7bcdab;
  font-weight: 700;
  font-size: 0.82rem;
  margin-bottom: 0.7rem;
}
.race-step {
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.76rem;
  margin-bottom: 0.35rem;
  color: rgba(255,255,255,0.28);
  border: 1px solid transparent;
  transition: all 0.25s;
}
.race-step.active {
  color: rgba(255,255,255,0.92);
  background: rgba(123,205,171,0.1);
  border-color: rgba(123,205,171,0.4);
}
.race-step.done {
  color: rgba(255,255,255,0.58);
  background: rgba(123,205,171,0.04);
  border-color: rgba(123,205,171,0.14);
}
.race-step.danger {
  color: #ff8585;
  background: rgba(255,100,100,0.1);
  border-color: rgba(255,100,100,0.38);
}
.race-banner {
  text-align: center;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 1rem;
  display: none;
  margin-top: 0.6rem;
}
.race-banner.oversold {
  background: rgba(255,80,80,0.12);
  color: #ff8585;
  border: 1px solid rgba(255,80,80,0.38);
}

/* Queue simulation */
.q-controls {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.q-controls label {
  font-size: 0.82rem;
  color: rgba(255,255,255,0.55);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.q-controls input[type=range] { accent-color: #7bcdab; width: 90px; }
.q-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.q-stat {
  background: rgba(255,255,255,0.04);
  border-radius: 5px;
  padding: 0.42rem 0.8rem;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.45);
}
.q-stat span { color: #fbef8a; font-weight: 700; font-size: 0.95rem; }
.q-stat.acc span { color: #7bcdab; }
.q-layout {
  display: grid;
  grid-template-columns: 1fr 190px;
  gap: 0.8rem;
}
#fs-user-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-content: flex-start;
  min-height: 110px;
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
  padding: 7px;
}
.u-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  transition: background 0.25s;
  cursor: default;
}
.u-dot.queued   { background: #7bcdab; }
.u-dot.bought   { background: rgba(123,205,171,0.45); }
.u-dot.soldout  { background: rgba(255,100,100,0.5); }
.u-dot.you      { background: #fbef8a; box-shadow: 0 0 5px #fbef8a; }
.q-panel {
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  padding: 0.5rem;
}
.q-panel-hd {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.35);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.35rem;
}
#fs-queue-list {
  overflow-y: auto;
  max-height: 180px;
}
.q-item {
  font-size: 0.7rem;
  padding: 0.18rem 0.4rem;
  border-radius: 3px;
  color: rgba(255,255,255,0.52);
  display: flex;
  justify-content: space-between;
  margin-bottom: 1px;
}
.q-item.you {
  background: rgba(251,239,138,0.12);
  color: #fbef8a;
}
#fs-queue-result {
  display: none;
  margin-top: 0.9rem;
  text-align: center;
  padding: 0.7rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.88rem;
}

/* Arch diagram */
.arch-diag {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(123,205,171,0.18);
  border-radius: 8px;
  padding: 1.4rem;
  margin: 1.4rem 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.55);
  line-height: 1.85;
  overflow-x: auto;
  white-space: pre;
}
.arch-diag .nd { color: #7bcdab; }
.arch-diag .lb { color: rgba(255,255,255,0.35); font-style: italic; }

/* Summary table */
.cap-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2rem 0;
  font-size: 0.86rem;
}
.cap-table th {
  color: #7bcdab;
  text-align: left;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid rgba(123,205,171,0.28);
  font-weight: 600;
}
.cap-table td {
  padding: 0.5rem 0.8rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.72);
}
.cap-table td:last-child { color: #fbef8a; font-weight: 600; }
.cap-table tr:last-child td { border-bottom: none; }

/* Level and problem badges */
.lv {
  display: inline-block;
  background: rgba(123,205,171,0.13);
  border: 1px solid rgba(123,205,171,0.38);
  color: #7bcdab;
  font-size: 0.69rem;
  padding: 0.12rem 0.45rem;
  border-radius: 3px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 0.4rem;
  vertical-align: middle;
}
.pb {
  display: inline-block;
  background: rgba(255,100,100,0.1);
  border: 1px solid rgba(255,100,100,0.32);
  color: #ff9494;
  font-size: 0.69rem;
  padding: 0.12rem 0.45rem;
  border-radius: 3px;
  font-weight: 700;
  vertical-align: middle;
  margin-left: 0.35rem;
}
.callout {
  background: rgba(251,239,138,0.06);
  border-left: 3px solid #fbef8a;
  border-radius: 0 5px 5px 0;
  padding: 0.75rem 1.1rem;
  margin: 1.3rem 0;
  font-size: 0.88rem;
  color: rgba(255,255,255,0.72);
}
.callout strong { color: #fbef8a; }
</style>

<div class="flash-sale-post">

<h2>The Interview Question</h2>

<p>You're sitting across from the interviewer. They lean forward:</p>

<blockquote>
<p>"Design a flash sale system. One thousand limited-edition sneakers go on sale at exactly 12:00 PM. Five hundred thousand users are waiting. The sale must be fair, there should be no overselling, bots must not win, the site must stay up, and all one thousand items must sell in under thirty seconds."</p>
</blockquote>

<p>This is not hypothetical. Nike SNKRS drops, Supreme launches, Taylor Swift tickets, Nvidia GPU releases — these systems fail publicly and memorably. Lets design one that does not.</p>

<hr>

<h2>1. The Three Hard Problems</h2>

<p>Every flash sale lives or dies by three interlocked failure modes. You cannot solve them independently.</p>

<p><strong>Problem 1: Overselling.</strong> When 500,000 people simultaneously try to buy the last item, naive code sells it to all of them. Each request reads <code>stock = 1</code>, checks <code>1 > 0</code>, then decrements. You end up at <code>stock = -499,999</code> and a customer service catastrophe.</p>

<p><strong>Problem 2: Thundering herd.</strong> At 12:00:00.000, every one of those 500,000 users clicks "Buy" simultaneously. Even if your system handles 10,000 req/sec normally, a 500,000 req/sec spike is 50x capacity. Servers fall over. The CDN does not help because these are authenticated purchase requests, not static assets.</p>

<p><strong>Problem 3: Bot fairness.</strong> Automated buyers run on cloud VMs with 1ms latency and sub-millisecond click timing. A human might submit their request 200ms after the sale opens. A bot cluster is already done. Without addressing bots, 100% of inventory goes to resellers every time.</p>

<p>The layered solution we build below addresses each problem specifically, with each level building on the last.</p>

<hr>

<h2>2. Level 1 — Naive SQL</h2>

<p><span class="lv">Level 1</span> <strong>The first instinct</strong></p>

<p>Here is what every developer writes first:</p>

<pre class="code-block"><span class="cm">-- Check availability</span>
<span class="kw">SELECT</span> stock <span class="kw">FROM</span> products <span class="kw">WHERE</span> id <span class="op">=</span> <span class="str">?</span>;

<span class="cm">-- Application logic: if stock > 0, proceed</span>
<span class="kw">UPDATE</span> products <span class="kw">SET</span> stock <span class="op">=</span> stock <span class="op">-</span> <span class="num">1</span> <span class="kw">WHERE</span> id <span class="op">=</span> <span class="str">?</span>;

<span class="kw">INSERT INTO</span> orders (user_id, product_id, created_at)
  <span class="kw">VALUES</span> (<span class="str">?</span>, <span class="str">?</span>, <span class="fn">NOW</span>());</pre>

<p>This has a classic <strong>check-then-act race condition</strong>. Between the SELECT and the UPDATE, another request can read the same stock value. If two requests both read <code>stock = 1</code> and both verify <code>1 &gt; 0 = true</code>, they both proceed to UPDATE and INSERT. Stock becomes -1. You have sold an item you do not have.</p>

<p>At 500,000 concurrent users this does not fail occasionally — it fails for nearly every transaction.</p>

<h3>Interactive Demo: The Race Condition</h3>

<p>Two purchase requests hit the database simultaneously. Watch them both read <code>stock = 1</code> and both proceed — leaving stock at -1.</p>

<div class="demo-box" id="race-demo">
  <div class="demo-header">
    <span class="demo-title">Race Condition: Two Simultaneous Purchase Requests</span>
    <button class="demo-btn" id="race-play-btn" onclick="racePlay()">&#9654; Run Demo</button>
    <button class="demo-btn sec" onclick="raceReset()">&#x21BA; Reset</button>
  </div>
  <div class="race-stock-wrap">
    <span class="race-stock-label">products.stock (in database)</span>
    <span class="race-stock-num" id="race-stock-num">1</span>
  </div>
  <div class="race-cols">
    <div class="race-col">
      <div class="race-col-hd">&#9889; Request A &nbsp;<small style="color:rgba(255,255,255,0.28);font-weight:400">User #1</small></div>
      <div class="race-step" id="ra1">SELECT stock FROM products &#8594; <strong>1</strong></div>
      <div class="race-step" id="ra2">CHECK stock &gt; 0 &#8594; <strong style="color:#7bcdab">true &#10003;</strong></div>
      <div class="race-step" id="ra3">UPDATE SET stock = 1 - 1</div>
      <div class="race-step" id="ra4">INSERT INTO orders &#10003;</div>
    </div>
    <div class="race-col">
      <div class="race-col-hd">&#9889; Request B &nbsp;<small style="color:rgba(255,255,255,0.28);font-weight:400">User #2</small></div>
      <div class="race-step" id="rb1">SELECT stock FROM products &#8594; <strong>1</strong></div>
      <div class="race-step" id="rb2">CHECK stock &gt; 0 &#8594; <strong style="color:#7bcdab">true &#10003;</strong></div>
      <div class="race-step" id="rb3">UPDATE SET stock = 1 - 1</div>
      <div class="race-step" id="rb4">INSERT INTO orders &#10003;</div>
    </div>
  </div>
  <div class="race-banner" id="race-banner"></div>
</div>

<script>
(function () {
  var running = false;

  function delay(ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  }

  function cls(id, c) {
    var el = document.getElementById(id);
    if (el) el.className = 'race-step' + (c ? ' ' + c : '');
  }

  function setStockColor(n) {
    var el = document.getElementById('race-stock-num');
    if (!el) return;
    el.textContent = String(n);
    el.style.color = n < 0 ? '#ff8585' : n === 0 ? '#fbef8a' : '#7bcdab';
  }

  window.racePlay = async function () {
    if (running) return;
    running = true;
    document.getElementById('race-play-btn').disabled = true;

    cls('ra1', 'active'); cls('rb1', 'active');
    await delay(700);
    cls('ra1', 'done');  cls('rb1', 'done');

    cls('ra2', 'active'); cls('rb2', 'active');
    await delay(650);
    cls('ra2', 'done');  cls('rb2', 'done');

    cls('ra3', 'active');
    await delay(280);
    cls('rb3', 'active');
    await delay(420);
    setStockColor(0);
    cls('ra3', 'done');
    await delay(220);
    setStockColor(-1);
    cls('rb3', 'danger');
    await delay(380);

    cls('ra4', 'done');
    cls('rb4', 'danger');
    await delay(300);

    var b = document.getElementById('race-banner');
    b.className = 'race-banner oversold';
    b.style.display = 'block';
    b.innerHTML = '&#10060; OVERSOLD: stock = -1 &mdash; 2 confirmed orders for 1 item';
    running = false;
  };

  window.raceReset = function () {
    running = false;
    setStockColor(1);
    ['ra1','ra2','ra3','ra4','rb1','rb2','rb3','rb4'].forEach(function (id) { cls(id, ''); });
    var b = document.getElementById('race-banner');
    b.style.display = 'none';
    b.className = 'race-banner';
    document.getElementById('race-play-btn').disabled = false;
  };
}());
</script>

<hr>

<h2>3. Level 2 — Pessimistic Locking</h2>

<p><span class="lv">Level 2</span> <strong>Row-level locks</strong></p>

<p>The first real fix is a database transaction with an exclusive row lock:</p>

<pre class="code-block"><span class="kw">BEGIN</span>;

<span class="kw">SELECT</span> stock <span class="kw">FROM</span> products
  <span class="kw">WHERE</span> id <span class="op">=</span> <span class="str">?</span>
  <span class="kw">FOR UPDATE</span>; <span class="cm">-- acquires exclusive row lock; others block here</span>

<span class="cm">-- application: if stock > 0:</span>
<span class="kw">UPDATE</span> products <span class="kw">SET</span> stock <span class="op">=</span> stock <span class="op">-</span> <span class="num">1</span> <span class="kw">WHERE</span> id <span class="op">=</span> <span class="str">?</span>;
<span class="kw">INSERT INTO</span> orders (user_id, product_id) <span class="kw">VALUES</span> (<span class="str">?</span>, <span class="str">?</span>);

<span class="kw">COMMIT</span>; <span class="cm">-- releases lock; next waiter proceeds</span></pre>

<p><code>FOR UPDATE</code> acquires an exclusive lock on the row before reading. Any other transaction attempting to read the same row must block until this transaction commits or rolls back. This is <strong>correct</strong> — no more overselling.</p>

<p>The problem is throughput. Every purchase attempt serializes through that single row lock. With 500,000 concurrent connections:</p>

<ul>
  <li>Connection pool exhaustion — databases cap connections at 200–500</li>
  <li>Lock queue — transactions pile up waiting, consuming memory and file descriptors</li>
  <li>Lock timeout cascades — transactions waiting too long start failing, generating user-visible errors</li>
  <li>Database CPU hits 100% managing the lock queue</li>
</ul>

<p><span class="pb">bottleneck</span> Throughput is bounded by lock serialization: roughly 1 purchase per DB round-trip, typically 50–200 purchases/sec even on powerful hardware. Adequate for a normal sale; fatal for a flash sale.</p>

<hr>

<h2>4. Level 3 — Optimistic Locking</h2>

<p><span class="lv">Level 3</span> <strong>Conflict detection, not prevention</strong></p>

<p>Optimistic locking assumes conflicts are rare and detects them on write instead of preventing them on read. Add a <code>version</code> column:</p>

<pre class="code-block"><span class="cm">-- Schema</span>
<span class="kw">ALTER TABLE</span> products <span class="kw">ADD COLUMN</span> version <span class="kw">INT NOT NULL DEFAULT</span> <span class="num">1</span>;

<span class="cm">-- Read without a lock</span>
<span class="kw">SELECT</span> stock, version <span class="kw">FROM</span> products <span class="kw">WHERE</span> id <span class="op">=</span> <span class="str">?</span>;
<span class="cm">-- got: stock=5, version=42</span>

<span class="cm">-- Update only if version still matches what we read</span>
<span class="kw">UPDATE</span> products
  <span class="kw">SET</span> stock <span class="op">=</span> stock <span class="op">-</span> <span class="num">1</span>, version <span class="op">=</span> version <span class="op">+</span> <span class="num">1</span>
  <span class="kw">WHERE</span> id <span class="op">=</span> <span class="str">?</span>
    <span class="kw">AND</span> version <span class="op">=</span> <span class="num">42</span>   <span class="cm">-- must match what we read</span>
    <span class="kw">AND</span> stock <span class="op">&gt;</span> <span class="num">0</span>;

<span class="cm">-- rows affected = 0: lost the race, retry or fail</span>
<span class="cm">-- rows affected = 1: success, proceed to INSERT order</span></pre>

<p>This allows concurrent reads (no lock held during SELECT) and detects conflicts at write time. Under normal concurrent load it performs very well. Under flash-sale load — 500,000 synchronized arrivals — the retry rate becomes catastrophic:</p>

<ul>
  <li>500,000 users attempt at T=0</li>
  <li>Only 1 succeeds with version=42; 499,999 get 0-rows-affected</li>
  <li>All 499,999 retry, colliding on version=43</li>
  <li>Without exponential backoff this creates a retry storm that is worse than the original problem</li>
  <li>Still hammers the database with ~499,999 failed write attempts per tick</li>
</ul>

<p>Optimistic locking is excellent for typical web workloads but poorly suited for the pathology of a synchronized-start flash sale where every contender arrives simultaneously.</p>

<hr>

<h2>5. Level 4 — Redis Atomic Decrement</h2>

<p><span class="lv">Level 4</span> <strong>Move the hot path to Redis</strong></p>

<p>Redis is single-threaded and executes each command atomically. The <code>DECR</code> command reads and decrements an integer in a single indivisible operation — no locks, no transactions, no race conditions at the application level.</p>

<p>Pre-load inventory before the sale opens:</p>

<pre class="code-block"><span class="cm">-- Before 12:00 PM: seed inventory counter</span>
<span class="kw">SET</span> product:sneaker-001:stock <span class="num">1000</span>
<span class="kw">SET</span> product:sneaker-001:stock:initial <span class="num">1000</span>

<span class="cm">-- At each purchase attempt:</span>
remaining <span class="op">=</span> <span class="kw">DECR</span> product:sneaker-001:stock

<span class="kw">IF</span> remaining <span class="op">&gt;=</span> <span class="num">0</span>:
    <span class="cm">-- Reservation successful</span>
    <span class="fn">createOrderAsync</span>(user_id, <span class="str">'sneaker-001'</span>)
    <span class="kw">RETURN</span> <span class="str">"reserved"</span>

<span class="kw">ELSE</span>:
    <span class="cm">-- Compensate: undo the decrement</span>
    <span class="kw">INCR</span> product:sneaker-001:stock
    <span class="kw">RETURN</span> <span class="str">"sold_out"</span></pre>

<p><code>DECR</code> is atomic at the command level. There is no window between reading and writing the value — it is a single CPU instruction from Redis's perspective. This eliminates the overselling race condition entirely.</p>

<p>Performance characteristics of a single Redis instance:</p>
<ul>
  <li>Throughput: 100,000–200,000 DECR operations per second</li>
  <li>Latency: under 0.1ms typical on the same network</li>
  <li>No connection pool exhaustion (Redis handles thousands of concurrent connections cheaply via epoll)</li>
  <li>Redis Cluster scales linearly with shard count</li>
</ul>

</div>

{: class="marginalia" }
The Redis DECR approach has a subtle failure mode: if DECR succeeds (reservation made) but the subsequent database write for the order fails, you have decremented stock without creating a confirmed order. The inventory count is now wrong. The fix is a **compensation step** — if the DB write fails, immediately run INCR to restore the count. This is the smallest possible saga pattern: a two-step distributed transaction with a defined rollback operation.

<div class="flash-sale-post">

<p>This solves overselling at high throughput. But it does not yet solve the thundering herd — 500,000 requests still hammer your API layer simultaneously at T=0. And it does not address fairness.</p>

<hr>

<h2>6. Level 5 — The Pre-Sale Queue</h2>

<p><span class="lv">Level 5</span> <strong>Decouple demand from fulfillment</strong></p>

<p>The key insight: you do not need to process 500,000 requests simultaneously. You only need to sell 1,000 items. Everything else is waste. The virtual queue separates <em>accepting demand</em> (which must be instantaneous and massively parallel) from <em>fulfilling orders</em> (which is controlled and serial).</p>

<h3>Architecture</h3>

</div>

<div class="arch-diag"><span class="nd">[Users]</span>  500k burst at T=0
    |
    v  (stateless queue entry service, scales horizontally)
<span class="nd">[Queue Entry API]</span>  <span class="lb">-- ZADD queue:sale:001 timestamp user_id</span>
    |                 <span class="lb">-- ZRANK  queue:sale:001 user_id  -> position</span>
    |                 <span class="lb">-- Return: position, estimated_wait_sec</span>
    v
<span class="nd">[Redis Sorted Set]</span>  <span class="lb">key:   queue:sale:001</span>
                    <span class="lb">score: arrival timestamp (ms)</span>
                    <span class="lb">member: user_id</span>
    |
    v  (single worker, or partitioned by sale_id)
<span class="nd">[Queue Processor]</span>  <span class="lb">-- ZPOPMIN 200/sec</span>
                   <span class="lb">-- DECR stock -> write order -> notify user</span>
    |
    +------------------+
    v                  v
<span class="nd">[PostgreSQL]</span>       <span class="nd">[WebSocket / SSE]</span>
<span class="lb">Order creation     "You got it!" / "Sold out"</span>
<span class="lb">200 writes/sec     499k notifications</span></div>

<div class="flash-sale-post">

<h3>Queue Entry — Absorbing the T=0 Spike</h3>

<p>When the user clicks "Buy Now":</p>

<pre class="code-block"><span class="cm">-- NX: only add if member does not exist (one entry per user)</span>
<span class="kw">ZADD</span> queue:sale:001 <span class="kw">NX</span> <span class="fn">timestamp_ms</span>() user_id

<span class="cm">-- Their position in line (0-indexed)</span>
position <span class="op">=</span> <span class="kw">ZRANK</span> queue:sale:001 user_id

<span class="cm">-- Estimated wait at current drain rate</span>
estimated_wait_sec <span class="op">=</span> position <span class="op">/</span> drain_rate_per_sec

<span class="cm">-- Respond to the user immediately</span>
<span class="kw">RETURN</span> position, estimated_wait_sec, queue_token</pre>

<p>The <code>NX</code> flag ensures a user can only enter the queue once (idempotent retries are safe). The sorted set scores by timestamp, so first-come-first-served ordering is enforced by Redis itself. A <code>ZADD</code> is O(log N) — at 500,000 entries, this is still well under 1ms.</p>

<h3>Queue Processor — Controlled Drain</h3>

<pre class="code-block"><span class="cm">-- Runs in a tight loop, every 1000ms:</span>
<span class="kw">LOOP</span>:
    <span class="cm">-- Atomically pop up to 200 entries from the front</span>
    entries <span class="op">=</span> <span class="kw">ZPOPMIN</span> queue:sale:001 <span class="num">200</span>

    <span class="kw">FOR EACH</span> entry <span class="kw">IN</span> entries:
        remaining <span class="op">=</span> <span class="kw">DECR</span> product:sneaker-001:stock

        <span class="kw">IF</span> remaining <span class="op">&gt;=</span> <span class="num">0</span>:
            <span class="fn">createOrder</span>(entry.user_id, <span class="str">'sneaker-001'</span>)
            <span class="fn">notifyUser</span>(entry.user_id, <span class="str">'purchased'</span>)

        <span class="kw">ELSE</span>:
            <span class="kw">INCR</span> product:sneaker-001:stock  <span class="cm">-- compensate</span>
            <span class="fn">notifyUser</span>(entry.user_id, <span class="str">'sold_out'</span>)
            <span class="fn">drainRemainingQueueAsSoldOut</span>()
            <span class="kw">BREAK</span>

    <span class="fn">sleep</span>(<span class="num">1000ms</span>)</pre>

<p>The processor runs at a rate you control. Set it to 200/sec: 1,000 items sell in exactly 5 seconds. The database sees a steady 200 writes/sec — well within capacity. Users are notified via WebSocket or server-sent events as their turn arrives.</p>

<h3>Interactive Demo: The Queue in Action</h3>

<p>Five hundred users rush in at T=0. The queue drains at a configurable rate. The yellow dot is <em>you</em> — watch your estimated wait time count down as the queue processes.</p>

<div class="demo-box" id="queue-demo">
  <div class="demo-header">
    <span class="demo-title">Queue Simulation: 500 Users, 100 Items in Stock</span>
  </div>
  <div class="q-controls">
    <button class="demo-btn" id="fs-start-btn" onclick="fsQueueStart()">&#9654; Start Sale</button>
    <button class="demo-btn sec" onclick="fsQueueReset()">&#x21BA; Reset</button>
    <label>
      Drain rate:
      <input type="range" id="fs-drain-range" min="1" max="50" value="20"
             oninput="document.getElementById('fs-drain-lbl').textContent = this.value">
      <span id="fs-drain-lbl">20</span>/sec
    </label>
  </div>
  <div class="q-stats">
    <div class="q-stat"><span id="fs-stock-val">100</span>&nbsp;stock left</div>
    <div class="q-stat"><span id="fs-queue-val">0</span>&nbsp;in queue</div>
    <div class="q-stat"><span id="fs-sold-val">0</span>&nbsp;sold</div>
    <div class="q-stat acc"><span id="fs-pos-val">&#8212;</span>&nbsp;your pos</div>
    <div class="q-stat acc"><span id="fs-wait-val">&#8212;</span>&nbsp;est wait</div>
  </div>
  <div class="q-layout">
    <div id="fs-user-grid"></div>
    <div class="q-panel">
      <div class="q-panel-hd">Queue</div>
      <div id="fs-queue-list"></div>
    </div>
  </div>
  <div id="fs-queue-result"></div>
</div>

<script>
(function () {
  var TOTAL = 500;
  var STOCK_MAX = 100;
  var YOU = 49;

  var users = [];
  var queue = [];
  var stock = STOCK_MAX;
  var sold = 0;
  var running = false;
  var drainTimer = null;
  var inited = false;

  function initSim() {
    users = [];
    queue = [];
    stock = STOCK_MAX;
    sold = 0;

    var grid = document.getElementById('fs-user-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (var i = 0; i < TOTAL; i++) {
      var d = document.createElement('div');
      d.className = 'u-dot' + (i === YOU ? ' you' : '');
      d.id = 'udt-' + i;
      d.title = i === YOU ? 'You (#' + (i + 1) + ')' : 'User #' + (i + 1);
      grid.appendChild(d);
      users.push({ id: i, status: 'waiting' });
    }

    document.getElementById('fs-queue-list').innerHTML = '';
    refreshStats();
    inited = true;
  }

  function refreshStats() {
    document.getElementById('fs-stock-val').textContent = String(stock);
    document.getElementById('fs-queue-val').textContent = String(queue.length);
    document.getElementById('fs-sold-val').textContent = String(sold);

    var youPos = queue.indexOf(YOU);
    var dr = parseInt(document.getElementById('fs-drain-range').value, 10);

    if (youPos >= 0) {
      document.getElementById('fs-pos-val').textContent = '#' + (youPos + 1);
      document.getElementById('fs-wait-val').textContent = (youPos / dr).toFixed(1) + 's';
    } else if (users[YOU] && users[YOU].status === 'bought') {
      document.getElementById('fs-pos-val').textContent = 'Got it!';
      document.getElementById('fs-wait-val').textContent = '&#8212;';
    } else if (users[YOU] && users[YOU].status === 'soldout') {
      document.getElementById('fs-pos-val').textContent = 'Sold out';
      document.getElementById('fs-wait-val').textContent = '&#8212;';
    } else {
      document.getElementById('fs-pos-val').textContent = '&#8212;';
      document.getElementById('fs-wait-val').textContent = '&#8212;';
    }
  }

  function dotClass(uid, extra) {
    var el = document.getElementById('udt-' + uid);
    if (el) el.className = 'u-dot ' + extra + (uid === YOU ? ' you' : '');
  }

  function addQueueItem(uid, pos) {
    var list = document.getElementById('fs-queue-list');
    var item = document.createElement('div');
    item.className = 'q-item' + (uid === YOU ? ' you' : '');
    item.id = 'qi-' + uid;
    item.innerHTML = (uid === YOU ? '&#11088; You' : 'User ' + (uid + 1)) +
      '<span>#' + pos + '</span>';
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
  }

  function removeQueueItem(uid) {
    var el = document.getElementById('qi-' + uid);
    if (el) el.remove();
  }

  function floodIn() {
    var order = [];
    for (var i = 0; i < TOTAL; i++) order.push(i);
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }

    var idx = 0;
    var BATCH = 60;

    function nextBatch() {
      var end = Math.min(idx + BATCH, order.length);
      for (var i = idx; i < end; i++) {
        var uid = order[i];
        users[uid].status = 'queued';
        dotClass(uid, 'queued');
        queue.push(uid);
        addQueueItem(uid, queue.length);
      }
      idx = end;
      refreshStats();
      if (idx < order.length) {
        setTimeout(nextBatch, 55);
      } else {
        beginDrain();
      }
    }
    nextBatch();
  }

  function beginDrain() {
    drainTimer = setInterval(function () {
      if (queue.length === 0) {
        clearInterval(drainTimer);
        finishSale();
        return;
      }

      var dr = parseInt(document.getElementById('fs-drain-range').value, 10);
      var count = Math.min(dr, queue.length);

      for (var i = 0; i < count; i++) {
        if (queue.length === 0) break;
        var uid = queue.shift();
        removeQueueItem(uid);

        if (stock > 0) {
          stock--;
          sold++;
          users[uid].status = 'bought';
          dotClass(uid, 'bought');
        } else {
          users[uid].status = 'soldout';
          dotClass(uid, 'soldout');
        }
      }
      refreshStats();

      if (stock <= 0 && queue.length === 0) {
        clearInterval(drainTimer);
        finishSale();
      }
    }, 1000);
  }

  function finishSale() {
    running = false;
    document.getElementById('fs-start-btn').disabled = false;
    var r = document.getElementById('fs-queue-result');
    r.style.display = 'block';
    r.style.background = 'rgba(123,205,171,0.09)';
    r.style.border = '1px solid rgba(123,205,171,0.35)';
    r.style.color = '#7bcdab';
    r.textContent = 'Sale complete. ' + sold + ' items sold. ' +
      (TOTAL - sold) + ' users received sold-out notifications.';
  }

  window.fsQueueStart = function () {
    if (running) return;
    if (!inited) initSim();
    running = true;
    document.getElementById('fs-start-btn').disabled = true;
    document.getElementById('fs-queue-result').style.display = 'none';
    floodIn();
  };

  window.fsQueueReset = function () {
    if (drainTimer) clearInterval(drainTimer);
    running = false;
    inited = false;
    document.getElementById('fs-start-btn').disabled = false;
    document.getElementById('fs-queue-result').style.display = 'none';
    initSim();
  };

  if (document.readyState !== 'loading') {
    initSim();
  } else {
    document.addEventListener('DOMContentLoaded', initSim);
  }
}());
</script>

<hr>

<h2>7. Level 6 — Anti-Bot Measures</h2>

<p><span class="lv">Level 6</span> <strong>Making bots pay the human tax</strong></p>

<p>A fair queue means nothing if automated buyers monopolize the first positions. Anti-bot layers must be enforced <em>at queue entry</em>, not at checkout.</p>

<h3>Rate Limiting with Redis Sliding Window</h3>

<pre class="code-block"><span class="cm">-- Max 1 queue entry attempt per user per 60-second window</span>
key <span class="op">=</span> <span class="str">"ratelimit:user:"</span> <span class="op">+</span> user_id <span class="op">+</span> <span class="str">":"</span> <span class="op">+</span> <span class="fn">floor</span>(now_sec <span class="op">/</span> <span class="num">60</span>)
count <span class="op">=</span> <span class="kw">INCR</span> key
<span class="kw">IF</span> count <span class="op">==</span> <span class="num">1</span>: <span class="kw">EXPIRE</span> key <span class="num">120</span>  <span class="cm">-- TTL just past window boundary</span>
<span class="kw">IF</span> count <span class="op">&gt;</span>  <span class="num">1</span>: <span class="kw">RETURN</span> <span class="str">"rate_limited"</span>

<span class="cm">-- IP-level: max 3 distinct users per IP per minute (catches bot farms)</span>
ip_key <span class="op">=</span> <span class="str">"ratelimit:ip:"</span> <span class="op">+</span> client_ip <span class="op">+</span> <span class="str">":"</span> <span class="op">+</span> <span class="fn">floor</span>(now_sec <span class="op">/</span> <span class="num">60</span>)
<span class="kw">IF</span> (<span class="kw">INCR</span> ip_key) <span class="op">&gt;</span> <span class="num">3</span>: <span class="kw">RETURN</span> <span class="str">"rate_limited"</span></pre>

<h3>Multi-Layer Bot Defence</h3>

<p><strong>Account age gate.</strong> Bots register new accounts for each sale. Require accounts to be at least 30 days old. This forces operators to maintain aged accounts — expensive at scale and detectable by statistical clustering.</p>

<p><strong>CAPTCHA before queue entry.</strong> Present an invisible CAPTCHA solved <em>before</em> the sale starts, not at T=0 when every second counts. Humans solve it during the countdown; bots that skip it are rejected at queue entry.</p>

<p><strong>Behavioral fingerprinting.</strong> Bots exhibit characteristic timing signatures:</p>
<ul>
  <li>Click arrives within 5ms of sale start — human reaction time is 150–300ms minimum</li>
  <li>Mouse path is a direct straight line from page load to the buy button with zero deviation</li>
  <li>No scroll events, no hover delay, no micro-pauses before clicking</li>
  <li>HTTP headers inconsistent with the declared browser version</li>
</ul>

<p><strong>Device-bound participation token.</strong> Issue a signed token 5–10 minutes before the sale. The token binds to a browser fingerprint (canvas hash, WebGL renderer string, installed fonts, screen resolution). Same device cannot join the queue twice:</p>

<pre class="code-block"><span class="cm">-- Participation token payload (signed with HMAC-SHA256)</span>
{
  <span class="str">"user_id"</span>:      <span class="str">"u_abc123"</span>,
  <span class="str">"sale_id"</span>:      <span class="str">"sale_2026_sneaker_001"</span>,
  <span class="str">"device_hash"</span>:  <span class="str">"sha256_of_fingerprint_components"</span>,
  <span class="str">"issued_at"</span>:    <span class="num">1748984400</span>,
  <span class="str">"expires_at"</span>:   <span class="num">1748988000</span>,
  <span class="str">"bot_score"</span>:    <span class="num">0.02</span>
}

<span class="cm">-- Token is single-use: mark consumed on first queue entry</span>
<span class="kw">SET</span> token:used:<span class="fn">sha256</span>(token) <span class="num">1</span> <span class="kw">EX</span> <span class="num">7200</span></pre>

<p><strong>Per-sale purchase cap.</strong> One account, one item, enforced at queue processing time:</p>

<pre class="code-block">purchased_key <span class="op">=</span> <span class="str">"purchased:"</span> <span class="op">+</span> sale_id <span class="op">+</span> <span class="str">":"</span> <span class="op">+</span> user_id
<span class="kw">IF</span> <span class="kw">EXISTS</span> purchased_key: <span class="kw">RETURN</span> <span class="str">"already_purchased"</span>
<span class="cm">-- Set on success:</span>
<span class="kw">SET</span> purchased_key <span class="num">1</span> <span class="kw">EX</span> <span class="num">86400</span></pre>

</div>

{: class="marginalia" }
Nike SNKRS drops are notoriously competitive — often 100,000 people competing for 1,000 pairs. Nike moved to a **randomized draw model** instead of first-come-first-served specifically to neutralize bots. You cannot bot a random draw: submitting faster gives zero advantage because the draw happens at a fixed cutoff time and all entries before that moment have equal probability. The queue-based approach can adopt the same idea — randomize queue order among entries that arrive within the first 500ms (the human reaction window).

<div class="flash-sale-post">

<hr>

<h2>8. Level 7 — The Waiting Room</h2>

<p><span class="lv">Level 7</span> <strong>Absorb pre-sale load on the CDN</strong></p>

<p>The waiting room is a completely static HTML page served from the CDN edge. It collects users before the sale opens, pre-validates them, and releases a controlled burst at T=0.</p>

<h3>Timeline</h3>

<p><strong>T-60 min:</strong> Users visit the product page and are served a redirect to the waiting room. This is a static file on CloudFront or Cloudflare — zero backend load, unlimited concurrent viewers, sub-10ms global latency.</p>

<p><strong>T-10 min:</strong> The waiting room begins accepting "intent registrations." The page sends the user's auth token to a lightweight validation endpoint which checks account age, purchase history, and device fingerprint, then issues a <strong>queue entry JWT</strong> valid for 15 minutes.</p>

<p><strong>T=0:</strong> The waiting room JavaScript detects the countdown reaching zero — either by local clock or by a server-sent event — and fires the queue entry request with the pre-validated JWT. Since validation already happened, queue entry is a single Redis ZADD with no database calls and no auth overhead.</p>

<pre class="code-block"><span class="cm">// Waiting room countdown fires queue entry at T=0</span>
<span class="kw">fetch</span>(<span class="str">'/api/sale/sneaker-001/start-time'</span>)
  .<span class="fn">then</span>(<span class="kw">function</span> (r) { <span class="kw">return</span> r.<span class="fn">json</span>(); })
  .<span class="fn">then</span>(<span class="kw">function</span> (cfg) {
    <span class="kw">var</span> saleStart <span class="op">=</span> <span class="kw">new</span> <span class="fn">Date</span>(cfg.start_time).<span class="fn">getTime</span>();

    <span class="kw">var</span> tick <span class="op">=</span> <span class="fn">setInterval</span>(<span class="kw">function</span> () {
      <span class="kw">var</span> remaining <span class="op">=</span> saleStart <span class="op">-</span> <span class="fn">Date</span>.<span class="fn">now</span>();

      <span class="kw">if</span> (remaining <span class="op">&lt;=</span> <span class="num">0</span>) {
        <span class="fn">clearInterval</span>(tick);
        <span class="fn">enterQueue</span>(queueEntryJWT);  <span class="cm">// single Redis ZADD</span>
        <span class="kw">return</span>;
      }

      <span class="kw">var</span> secs <span class="op">=</span> <span class="fn">Math</span>.<span class="fn">floor</span>(remaining <span class="op">/</span> <span class="num">1000</span>);
      <span class="kw">var</span> mins <span class="op">=</span> <span class="fn">Math</span>.<span class="fn">floor</span>(secs <span class="op">/</span> <span class="num">60</span>);
      <span class="kw">var</span> pad  <span class="op">=</span> (secs <span class="op">%</span> <span class="num">60</span>) <span class="op">&lt;</span> <span class="num">10</span> <span class="op">?</span> <span class="str">'0'</span> : <span class="str">''</span>;
      countdownEl.<span class="fn">textContent</span> <span class="op">=</span> mins <span class="op">+</span> <span class="str">':'</span> <span class="op">+</span> pad <span class="op">+</span> (secs <span class="op">%</span> <span class="num">60</span>);
    }, <span class="num">100</span>);
  });</pre>

<p>The key benefit: without the waiting room, T=0 triggers simultaneous authentication + authorization + bot-check + inventory operation for 500,000 users. With the waiting room, authentication is distributed over 10 minutes before the sale, and T=0 is reduced to a single Redis call per user.</p>

</div>

{: class="marginalia" }
Cloudflare Waiting Room and Queue-it sell exactly this pattern as managed products. A waiting room is fundamentally just a static countdown page with a WebSocket or SSE connection. The infrastructure cost to serve 500,000 people a CDN-cached countdown timer is essentially zero — a few dollars in bandwidth. The value is entirely in the controlled transition: at T=0, you decide exactly how many requests per second migrate from the waiting room to your real backend.

<div class="flash-sale-post">

<hr>

<h2>9. Handling Payment Failures</h2>

<p>A user reaches the front of the queue, their slot is reserved, stock decremented — then their payment fails. What happens to that inventory unit?</p>

<h3>The Soft Hold Pattern</h3>

<pre class="code-block"><span class="cm">-- Queue processor reserves a slot: create a hold with TTL</span>
order_id <span class="op">=</span> <span class="fn">uuid</span>()
<span class="kw">SET</span> hold:sneaker-001:<span class="op">+</span>order_id user_id <span class="kw">EX</span> <span class="num">300</span>  <span class="cm">-- 5-minute TTL</span>

<span class="kw">INSERT INTO</span> orders
  (id, user_id, product_id, status, hold_expires_at)
  <span class="kw">VALUES</span>
  (order_id, user_id, <span class="str">'sneaker-001'</span>, <span class="str">'pending_payment'</span>, <span class="fn">NOW</span>() <span class="op">+</span> <span class="num">300</span>);

<span class="cm">-- On successful payment:</span>
<span class="kw">UPDATE</span> orders <span class="kw">SET</span> status <span class="op">=</span> <span class="str">'confirmed'</span> <span class="kw">WHERE</span> id <span class="op">=</span> order_id;
<span class="kw">DEL</span> hold:sneaker-001:<span class="op">+</span>order_id
<span class="kw">SET</span> purchased:sale_id:user_id <span class="num">1</span> <span class="kw">EX</span> <span class="num">86400</span>

<span class="cm">-- On payment failure:</span>
<span class="kw">UPDATE</span> orders <span class="kw">SET</span> status <span class="op">=</span> <span class="str">'cancelled'</span> <span class="kw">WHERE</span> id <span class="op">=</span> order_id;
<span class="kw">DEL</span>  hold:sneaker-001:<span class="op">+</span>order_id
<span class="kw">INCR</span> product:sneaker-001:stock  <span class="cm">-- release unit back to inventory</span></pre>

<p>A background worker sweeps for expired holds every 60 seconds:</p>

<pre class="code-block"><span class="cm">-- Cleanup job: runs every 60 seconds</span>
expired <span class="op">=</span> <span class="kw">SELECT</span> id, user_id <span class="kw">FROM</span> orders
  <span class="kw">WHERE</span> status <span class="op">=</span> <span class="str">'pending_payment'</span>
    <span class="kw">AND</span> hold_expires_at <span class="op">&lt;</span> <span class="fn">NOW</span>();

<span class="kw">FOR EACH</span> order <span class="kw">IN</span> expired:
    <span class="kw">UPDATE</span> orders <span class="kw">SET</span> status <span class="op">=</span> <span class="str">'expired'</span> <span class="kw">WHERE</span> id <span class="op">=</span> order.id;
    <span class="kw">INCR</span> product:sneaker-001:stock     <span class="cm">-- reclaim the unit</span>
    <span class="fn">notifyUser</span>(order.user_id, <span class="str">'hold_expired'</span>)</pre>

<h3>Inventory Consistency Invariant</h3>

<p>At all times the following must hold true. Run this as a monitoring query and alert on any divergence:</p>

<pre class="code-block"><span class="cm">-- The invariant:</span>
<span class="cm">-- redis_stock = initial_stock</span>
<span class="cm">--            - COUNT(confirmed orders)</span>
<span class="cm">--            - COUNT(active holds not yet expired)</span>

redis_stock <span class="op">==</span> initial_stock
  <span class="op">-</span> (<span class="kw">SELECT COUNT</span>(<span class="op">*</span>) <span class="kw">FROM</span> orders <span class="kw">WHERE</span> status <span class="op">=</span> <span class="str">'confirmed'</span>)
  <span class="op">-</span> (<span class="kw">SELECT COUNT</span>(<span class="op">*</span>) <span class="kw">FROM</span> orders
     <span class="kw">WHERE</span> status <span class="op">=</span> <span class="str">'pending_payment'</span>
       <span class="kw">AND</span> hold_expires_at <span class="op">&gt;</span> <span class="fn">NOW</span>())

<span class="cm">-- Alert threshold: abs(divergence) > 1</span>
<span class="cm">-- Expected divergence in normal operation: 0</span></pre>

</div>

{: class="marginalia" }
Concert ticketing platforms like Ticketmaster use exactly this pattern. The countdown timer you see while completing your purchase is a soft hold enforced by a server-side Redis TTL. If you abandon checkout, those seats return to inventory automatically when the key expires. The 10-minute checkout window is not just UX — it is the TTL value in their hold key. They run the same background sweep to catch seats abandoned mid-payment.

<div class="flash-sale-post">

<hr>

<h2>10. Capacity Estimates</h2>

<table class="cap-table">
  <thead>
    <tr><th>Metric</th><th>Value</th></tr>
  </thead>
  <tbody>
    <tr><td>Users waiting at T=0</td><td>500,000</td></tr>
    <tr><td>Queue entry requests at T=0 (burst)</td><td>~500,000/sec</td></tr>
    <tr><td>Redis ZADD throughput (single node)</td><td>500,000+/sec</td></tr>
    <tr><td>API pods needed for queue entry (10k req/s each)</td><td>50 pods</td></tr>
    <tr><td>Controlled queue drain rate</td><td>200/sec</td></tr>
    <tr><td>Time to sell all 1,000 items</td><td>~5 seconds</td></tr>
    <tr><td>Steady-state DB write rate (order creation)</td><td>200/sec</td></tr>
    <tr><td>Users notified "sold out"</td><td>~499,000</td></tr>
    <tr><td>Active soft hold keys at peak</td><td>~200 (TTL 300s)</td></tr>
    <tr><td>Redis memory for full queue (500k entries × ~50 bytes)</td><td>~25 MB</td></tr>
    <tr><td>Waiting room CDN cost (500k users, static page)</td><td>~$0.50</td></tr>
  </tbody>
</table>

<p>The numbers reveal an important inversion: <strong>the hard engineering problem is not the 1,000 successful transactions — it is gracefully handling the 499,000 failures.</strong> Each rejection requires a polite notification. That is 499,000 WebSocket messages or SSE events to deliver, plus queue cleanup in Redis, plus user-facing messaging. Design your notification pipeline to handle this throughput before the first sale.</p>

<hr>

<h2>11. Failure Modes and Recovery</h2>

<p>What happens when components go down mid-sale?</p>

<p><strong>Redis failure.</strong> Both the queue and the inventory counter live in Redis. If Redis goes down, you cannot accept new queue entries or decrement stock. Mitigations:</p>
<ul>
  <li>Redis Sentinel or Redis Cluster with automatic failover — target under 1 second failover time</li>
  <li>Accept that a brief Redis outage pauses the sale; surface a "Technical difficulty — please wait" banner</li>
  <li>Never run a flash sale without Redis replication. A single Redis node is a single point of failure</li>
</ul>

<p><strong>Queue processor crash.</strong> If the worker processing the queue crashes mid-drain, items may be in a gap between "popped from sorted set" and "order written to DB." Use a two-set approach for safe handoff:</p>

<pre class="code-block"><span class="cm">-- Atomically move entries to a "processing" set</span>
<span class="kw">MULTI</span>
  entries <span class="op">=</span> <span class="kw">ZPOPMIN</span> queue:sale:001 <span class="num">200</span>
  <span class="kw">ZADD</span> queue:processing <span class="fn">timestamp</span>() entry.user_id  <span class="cm">-- for each</span>
<span class="kw">EXEC</span>

<span class="cm">-- Only remove from processing set after DB write confirmed:</span>
<span class="kw">ZREM</span> queue:processing user_id

<span class="cm">-- On worker restart: re-process anything stuck in queue:processing</span>
<span class="cm">-- Items stuck > 30s are stale; re-inject to front of main queue</span></pre>

<p><strong>Database overload.</strong> If the database cannot sustain 200 writes/sec (unlikely on modern hardware, possible under high I/O contention):</p>
<ul>
  <li>Switch to batched multi-row INSERT: accumulate 200 order records, insert as one statement per tick</li>
  <li>Temporarily reduce drain rate — 100/sec still sells 1,000 items in 10 seconds</li>
  <li>Write orders to a Kafka topic and let the DB consumer work at its own pace</li>
</ul>

<p><strong>Clock skew across API pods.</strong> Queue positions are sorted by arrival timestamp. If API servers disagree on the current time by ±50ms, queue ordering within that window is non-deterministic. This is acceptable — simultaneous arrival is indistinguishable from near-simultaneous arrival, and the window is far smaller than human reaction time differences. Use NTP with a local time server if tighter ordering matters.</p>

<hr>

<h2>12. Complete Architecture at a Glance</h2>

</div>

<div class="arch-diag"><span class="nd">CDN Edge</span>
  <span class="lb">Waiting room page, countdown JS, device fingerprinting</span>
  <span class="lb">Handles 10M+ concurrent viewers at zero backend cost</span>
  <span class="lb">Issues queue-entry JWTs at T-10 min (after account validation)</span>
          |
          |  T=0: 500k bursts simultaneously
          v
<span class="nd">API Gateway / Load Balancer</span>
  <span class="lb">Per-IP and per-user rate limiting (Redis INCR)</span>
  <span class="lb">JWT signature verification (CPU-only, no DB)</span>
  <span class="lb">Bot score threshold gate</span>
          |
          v  (autoscaled, stateless)
<span class="nd">Queue Entry Service  x50 pods</span>
  <span class="lb">ZADD queue:sale:X NX timestamp user_id</span>
  <span class="lb">ZRANK -> return position + estimated wait</span>
          |
          v
<span class="nd">Redis Cluster</span>
  <span class="lb">queue:sale:X       sorted set  ~500k entries, ~25MB</span>
  <span class="lb">queue:processing   sorted set  in-flight items</span>
  <span class="lb">product:X:stock    integer     atomic DECR/INCR</span>
  <span class="lb">ratelimit:*        counters    sliding window TTLs</span>
  <span class="lb">hold:*             strings     EX 300 soft holds</span>
  <span class="lb">token:used:*       strings     single-use token registry</span>
          |
          v  (single leader, or range-partitioned by sale)
<span class="nd">Queue Processor Worker</span>
  <span class="lb">ZPOPMIN 200/sec -> DECR stock -> write order -> notify</span>
  <span class="lb">Compensation: if DB write fails, INCR stock back</span>
          |
    +-----+-----------+
    v                 v
<span class="nd">PostgreSQL</span>        <span class="nd">Notification Service</span>
<span class="lb">orders table      WebSocket / SSE push</span>
<span class="lb">200 writes/sec    499k "sold out" messages</span>
<span class="lb">Batch INSERT OK   "You got it!" to 1k buyers</span></div>

<div class="flash-sale-post">

<hr>

<h2>Summary: The Six-Layer Defence</h2>

<table class="cap-table">
  <thead>
    <tr><th>Layer</th><th>Problem Solved</th><th>Mechanism</th></tr>
  </thead>
  <tbody>
    <tr><td>Redis atomic DECR</td><td>Overselling</td><td>Atomic read-decrement; no application-level race</td></tr>
    <tr><td>Virtual queue</td><td>Thundering herd</td><td>Absorb 500k burst; drain at controlled 200/sec</td></tr>
    <tr><td>Rate limiting</td><td>Bot request spam</td><td>Per-user and per-IP Redis sliding window counters</td></tr>
    <tr><td>Account requirements</td><td>Throwaway bot accounts</td><td>30-day age gate, prior purchase requirement</td></tr>
    <tr><td>Device-bound token</td><td>Multi-entry bots</td><td>Fingerprint-bound JWT, single-use enforcement</td></tr>
    <tr><td>Waiting room (CDN)</td><td>Pre-sale load spike</td><td>Static page absorbs crowd; pre-validates users</td></tr>
  </tbody>
</table>

<p>The answer the interviewer is looking for is not "use Redis." It is the recognition that flash sales have three distinct failure modes — overselling, thundering herd, and bot fairness — each requiring a different mechanism, and that the virtual queue is the architectural cornerstone that makes the other layers composable. Without the queue, you are applying point fixes to a fundamentally broken request flow.</p>

<p>The real challenge in production is not the 1,000 successful sales. It is the 499,000 graceful failures — delivered fast, politely, without crashing anything.</p>

</div>
