---
layout: post
title: "System Design: How Gmail Checks Billions of Emails for Uniqueness"
date: 2026-04-14 10:00:00 +0000
categories: ["post"]
tags: [system-design, bloom-filter, redis, distributed-systems, interview]
series: "System Design Interview Series"
---

<style>
/* ── Series badge ────────────────────────────────────────────── */
.series-badge {
  display: inline-flex; align-items: center; gap: 10px;
  background: #1e1f24; border: 1px solid #7bcdab; border-radius: 20px;
  padding: 6px 16px 6px 8px; font-size: 13px; color: #7bcdab;
  font-weight: 600; margin-bottom: 1.8rem;
}
.series-num {
  background: #7bcdab; color: #19191c; border-radius: 50%;
  width: 24px; height: 24px; display: inline-flex; align-items: center;
  justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;
}

/* ── Level cards ─────────────────────────────────────────────── */
.level-card {
  background: #1e1f24; border-radius: 10px; padding: 20px 22px;
  border: 1px solid #2e2f35; margin: 1.4rem 0;
}
.level-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.level-badge {
  background: #2a2b30; border-radius: 6px; padding: 4px 10px;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; color: #7bcdab; white-space: nowrap;
}
.level-card h3 { margin: 0; color: #fbef8a; font-size: 16px; }

/* ── Code blocks ─────────────────────────────────────────────── */
.code-block {
  background: #141416; border-radius: 8px; padding: 16px 18px;
  overflow-x: auto; font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px; line-height: 1.75; margin: 1rem 0;
  border: 1px solid #2e2f35;
}
.code-block .kw  { color: #c678dd; }
.code-block .fn  { color: #61afef; }
.code-block .str { color: #98c379; }
.code-block .cmt { color: #5c6370; font-style: italic; }
.code-block .num { color: #d19a66; }
.code-block .cls { color: #e5c07b; }
.code-block .op  { color: #56b6c2; }
.code-block .var { color: #e06c75; }

/* ── Callouts ────────────────────────────────────────────────── */
.tip {
  border-left: 3px solid #7bcdab; background: #1a2e23;
  border-radius: 0 8px 8px 0; padding: 12px 16px;
  margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.tip strong { color: #7bcdab; }
.warn {
  border-left: 3px solid #fbef8a; background: #2a2a1a;
  border-radius: 0 8px 8px 0; padding: 12px 16px;
  margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.warn strong { color: #fbef8a; }
.info {
  border-left: 3px solid #7ab8cd; background: #1a2530;
  border-radius: 0 8px 8px 0; padding: 12px 16px;
  margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.info strong { color: #7ab8cd; }

/* ── Bloom filter visualizer ─────────────────────────────────── */
.bf-viz {
  background: #1e1f24; border-radius: 12px; padding: 24px;
  border: 1px solid #2e2f35; margin: 1.6rem 0;
}
.bf-viz h3 { color: #fbef8a; margin: 0 0 18px; font-size: 16px; }
.bf-controls { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; align-items: flex-end; }
.bf-input-group { flex: 1; min-width: 200px; }
.bf-input-group label {
  display: block; font-size: 11px; color: rgba(255,255,255,.45);
  text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px;
}
.bf-input-group input {
  width: 100%; padding: 9px 12px; background: #141416;
  border: 1px solid #3a3b40; border-radius: 6px; color: #fff;
  font-size: 14px; box-sizing: border-box; outline: none;
  font-family: 'JetBrains Mono', monospace;
}
.bf-input-group input:focus { border-color: #7bcdab; }
.bf-btn {
  padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 700;
  cursor: pointer; border: none; transition: all .2s; white-space: nowrap;
}
.bf-btn-add   { background: #7bcdab; color: #19191c; }
.bf-btn-add:hover { background: #8fddb9; }
.bf-btn-query { background: #fbef8a; color: #19191c; }
.bf-btn-query:hover { background: #fdf4a8; }
.bf-btn-reset { background: #2e2f35; color: rgba(255,255,255,.7); }
.bf-btn-reset:hover { background: #3a3b40; }
.bf-bit-array-label {
  font-size: 11px; color: rgba(255,255,255,.4); margin-bottom: 8px;
  text-transform: uppercase; letter-spacing: .07em;
}
.bf-bits { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 14px; }
.bf-bit {
  width: 20px; height: 20px; border-radius: 3px; background: #2e2f35;
  transition: background .22s, transform .18s; font-size: 8px; color: transparent;
  display: flex; align-items: center; justify-content: center; cursor: default;
  flex-shrink: 0;
}
.bf-bit.set       { background: #fbef8a; }
.bf-bit.highlight { background: #f08080; transform: scale(1.3); }
.bf-bit.match     { background: #7bcdab; transform: scale(1.25); }
.bf-bit.checking  { background: #a78bfa; transform: scale(1.2); }
.bf-hash-legend { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; font-size: 12px; }
.bf-hash-pill {
  padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
}
.bf-result {
  background: #141416; border-radius: 8px; padding: 14px 16px;
  font-size: 14px; min-height: 44px; margin-top: 12px;
  border: 1px solid #2e2f35; color: rgba(255,255,255,.6); line-height: 1.6;
}
.bf-result.negative { border-color: #7bcdab; color: #7bcdab; }
.bf-result.positive { border-color: #fbef8a; color: #fbef8a; }
.bf-result.fp       { border-color: #f08080; color: #f08080; }
.bf-slider-row {
  display: flex; gap: 20px; flex-wrap: wrap; margin-top: 14px;
  padding-top: 14px; border-top: 1px solid #2e2f35;
}
.bf-slider-group { flex: 1; min-width: 160px; }
.bf-slider-group label {
  display: flex; justify-content: space-between;
  font-size: 12px; color: rgba(255,255,255,.5); margin-bottom: 6px;
}
.bf-slider-group label span { color: #fbef8a; font-weight: 700; }
.bf-slider-group input[type=range] { width: 100%; accent-color: #7bcdab; cursor: pointer; }
.bf-slider-ticks {
  display: flex; justify-content: space-between;
  font-size: 10px; color: rgba(255,255,255,.25); margin-top: 2px;
}
.bf-fp-display { margin-top: 10px; font-size: 12px; color: rgba(255,255,255,.45); text-align: right; }
.bf-fp-display strong { color: #f08080; }
.bf-added-list { margin-top: 10px; font-size: 12px; color: rgba(255,255,255,.4); min-height: 20px; }
.added-email {
  display: inline-block; background: #1a2e23; border-radius: 12px;
  padding: 2px 10px; margin: 2px 3px; color: #7bcdab; font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Shard diagram ───────────────────────────────────────────── */
.shard-diagram { display: flex; gap: 10px; flex-wrap: wrap; margin: 1.4rem 0; align-items: center; }
.shard-box {
  flex: 1; min-width: 150px; background: #1e1f24; border-radius: 8px;
  padding: 14px 16px; border: 1px solid #2e2f35; text-align: center;
}
.shard-box .shard-label {
  font-size: 10px; color: rgba(255,255,255,.35); text-transform: uppercase;
  letter-spacing: .07em; margin-bottom: 6px;
}
.shard-box .shard-name  { color: #fbef8a; font-weight: 700; font-size: 14px; margin-bottom: 4px; }
.shard-box .shard-range { font-size: 11px; color: rgba(255,255,255,.45); margin-bottom: 10px; font-family: 'JetBrains Mono', monospace; }
.shard-bits { display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; }
.shard-bit { width: 8px; height: 8px; border-radius: 1px; background: #2e2f35; }
.shard-bit.on { background: #7bcdab; }
.shard-arrow { color: #3a3b40; font-size: 22px; flex-shrink: 0; }

/* ── Counting BF table ───────────────────────────────────────── */
.cbf-table-wrap { overflow-x: auto; margin: 1.2rem 0; }
.cbf-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
  font-family: 'JetBrains Mono', monospace; min-width: 480px;
}
.cbf-table th {
  padding: 8px 10px; background: #2a2b30; color: #fbef8a;
  font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
  border: 1px solid #3a3b40;
}
.cbf-table td { padding: 8px 10px; text-align: center; border: 1px solid #2e2f35; color: rgba(255,255,255,.75); }
.cbf-table .idx-row td { color: rgba(255,255,255,.3); font-size: 11px; }
.cbf-table .count-row td { background: #1e1f24; }
.cbf-table td.nonzero { color: #7bcdab; font-weight: 700; }

/* ── Production pipeline ─────────────────────────────────────── */
.pipeline { display: flex; align-items: stretch; gap: 8px; flex-wrap: wrap; margin: 1.4rem 0; }
.pipeline-step {
  flex: 1; min-width: 120px; background: #1e1f24; border-radius: 8px;
  padding: 16px 12px; border: 1px solid #2e2f35; text-align: center;
}
.ps-icon  { font-size: 26px; margin-bottom: 6px; }
.ps-label { font-size: 10px; color: rgba(255,255,255,.35); text-transform: uppercase; letter-spacing: .07em; }
.ps-name  { font-size: 14px; color: #fbef8a; font-weight: 700; margin-top: 4px; }
.ps-desc  { font-size: 11px; color: rgba(255,255,255,.45); margin-top: 4px; }
.pipeline-arrow { display: flex; align-items: center; color: #3a3b40; font-size: 22px; flex-shrink: 0; }

/* ── Complexity table ────────────────────────────────────────── */
.cmp-table-wrap { overflow-x: auto; margin: 1.4rem 0; }
.cmp-table {
  width: 100%; border-collapse: collapse; font-size: 14px;
  background: #1e1f24; border-radius: 10px; overflow: hidden; min-width: 560px;
}
.cmp-table thead tr { background: #2a2b30; }
.cmp-table th {
  padding: 12px 14px; text-align: left; color: #fbef8a;
  font-size: 11px; text-transform: uppercase; letter-spacing: .07em;
}
.cmp-table td { padding: 11px 14px; border-top: 1px solid #2e2f35; color: rgba(255,255,255,.82); }
.cmp-table tr:hover td { background: #252629; }
.cmp-table .highlight-row td { border-left: 3px solid #7bcdab; }
.cmp-badge {
  display: inline-block; padding: 2px 8px; border-radius: 12px;
  font-size: 11px; font-weight: 700;
}
.badge-good { background: #1a3a2a; color: #7bcdab; }
.badge-ok   { background: #2a2a1a; color: #fbef8a; }
.badge-bad  { background: #3a1a1a; color: #f08080; }

/* ── FP rate calculator ──────────────────────────────────────── */
.fp-calc {
  background: #1e1f24; border-radius: 12px; padding: 22px 24px;
  border: 1px solid #2e2f35; margin: 1.6rem 0;
}
.fp-calc h3 { color: #fbef8a; margin: 0 0 16px; }
.fp-calc-inputs { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.fp-calc-field { flex: 1; min-width: 140px; }
.fp-calc-field label {
  display: block; font-size: 11px; color: rgba(255,255,255,.45);
  text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px;
}
.fp-calc-field input {
  width: 100%; padding: 9px 12px; background: #141416;
  border: 1px solid #3a3b40; border-radius: 6px; color: #fff;
  font-size: 14px; box-sizing: border-box; outline: none;
}
.fp-calc-field input:focus { border-color: #7bcdab; }
.fp-formula-box {
  background: #141416; border-radius: 8px; padding: 18px 16px;
  text-align: center; font-size: 15px; color: rgba(255,255,255,.65);
  margin: 12px 0; border: 1px solid #2e2f35;
  font-family: 'JetBrains Mono', monospace; line-height: 2;
}
.fp-big-result {
  font-size: 30px; font-weight: 800; color: #f08080;
  margin-top: 6px; display: block;
}
.fp-big-result.good { color: #7bcdab; }
.fp-interpret { font-size: 12px; margin-top: 6px; color: rgba(255,255,255,.4); }

/* ── Interview tip cards ─────────────────────────────────────── */
.tip-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px; margin: 1.4rem 0;
}
.tip-card {
  background: #1e1f24; border-radius: 10px; padding: 16px 18px;
  border: 1px solid #2e2f35;
}
.tip-card .tc-num {
  width: 28px; height: 28px; border-radius: 50%; background: #7bcdab;
  color: #19191c; font-size: 13px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 10px;
}
.tip-card h4 { margin: 0 0 6px; color: #fbef8a; font-size: 14px; }
.tip-card p  { margin: 0; font-size: 13px; color: rgba(255,255,255,.6); line-height: 1.65; }

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 620px) {
  .fp-calc-inputs { flex-direction: column; }
  .pipeline { flex-direction: column; }
  .bf-controls { flex-direction: column; }
  .shard-arrow { transform: rotate(90deg); align-self: center; }
}
</style>

<div class="series-badge">
  <span class="series-num">1</span>
  <span>System Design Interview Series &mdash; Article 1 of 15</span>
</div>

The interview question sounds simple: *"How would you design Gmail's email uniqueness check?"*

Every time someone tries to create a new Gmail account, Google must answer one question in under 100 milliseconds: **is this email address already taken?** With over 1.8 billion active Gmail accounts — and billions of historical ones — this is far from trivial.

Most candidates start with "just query the database." That answer survives the first 30 seconds. What follows separates junior engineers from senior ones.

---

## The Problem at Scale

{: class="marginalia" }
📊 Gmail processes<br/>roughly **20 billion**<br/>email uniqueness<br/>checks per month.<br/>Every millisecond<br/>of latency is felt<br/>at the signup form.

Let's nail the requirements:

- **Scale**: 1.8 billion existing email addresses, growing by millions per day
- **Latency**: sub-100ms response (user is watching a spinner at the signup form)
- **Availability**: 99.999% uptime — this blocks account creation, a revenue-critical path
- **Correctness asymmetry**: A false negative (saying an email is free when it isn't) lets two people share an account — a catastrophic security failure. A false positive (saying it's taken when it isn't) is just annoying.

<div class="warn">
<strong>The asymmetry is your north star:</strong> The entire design flows from accepting false positives while making false negatives mathematically impossible. Keep this front and centre when you explain your solution.
</div>

---

## Level 1: Naive SQL — The First Instinct

<div class="level-card">
<div class="level-header">
  <span class="level-badge">Level 1</span>
  <h3>Full Table Scan</h3>
</div>

The most natural starting point: you have a `users` table, you query it.

<pre class="code-block"><span class="cmt">-- The naive approach</span>
<span class="kw">SELECT</span> <span class="fn">COUNT</span>(<span class="op">*</span>) <span class="kw">FROM</span> <span class="cls">users</span> <span class="kw">WHERE</span> <span class="var">email</span> <span class="op">=</span> <span class="str">'alice@gmail.com'</span><span class="op">;</span>

<span class="cmt">-- Slightly better: short-circuits on first match</span>
<span class="kw">SELECT</span> <span class="kw">EXISTS</span>(
  <span class="kw">SELECT</span> <span class="num">1</span> <span class="kw">FROM</span> <span class="cls">users</span> <span class="kw">WHERE</span> <span class="var">email</span> <span class="op">=</span> <span class="str">'alice@gmail.com'</span>
)<span class="op">;</span></pre>

**For 10,000 users:** instant. A warm buffer pool holds the entire heap; PostgreSQL scans it in microseconds.

**For 1.8 billion users:** A full table scan over a 200 GB table — reading at 3 GB/s on a fast NVMe — takes ~67 seconds. Completely unusable.
</div>

{: class="marginalia" }
🔍 A B-tree index on<br/>`email` reduces the<br/>lookup from O(n) to<br/>O(log n) — roughly<br/>**31 comparisons**<br/>for 2 billion rows.<br/>Each might be a<br/>separate page read.

You'd immediately add an index:

<pre class="code-block"><span class="cmt">-- Add a unique index (enforces uniqueness at write time too)</span>
<span class="kw">CREATE UNIQUE INDEX</span> <span class="fn">idx_users_email</span>
  <span class="kw">ON</span> <span class="cls">users</span>(<span class="var">email</span>)<span class="op">;</span>

<span class="cmt">-- With the index, this is now O(log n)</span>
<span class="kw">SELECT</span> <span class="kw">EXISTS</span>(
  <span class="kw">SELECT</span> <span class="num">1</span> <span class="kw">FROM</span> <span class="cls">users</span> <span class="kw">WHERE</span> <span class="var">email</span> <span class="op">=</span> <span class="str">'alice@gmail.com'</span>
)<span class="op">;</span></pre>

O(log n) for 2 billion rows is about 31 comparisons. On NVMe that's fast. But under high concurrency — thousands of simultaneous signups — you hit hard limits:

1. **Working set**: A B-tree index on 1.8B email strings (avg ~22 bytes each) consumes ~55 GB of memory to stay hot. That's an enormous, expensive working set.
2. **Write amplification**: Every new signup modifies index pages, causing lock contention and write stalls under peak load.
3. **No horizontal scaling**: One database, one index. You can read-replica it, but you can't shard the uniqueness check trivially.

---

## Level 2: Indexed Lookup + Redis Cache

<div class="level-card">
<div class="level-header">
  <span class="level-badge">Level 2</span>
  <h3>Hash Index + Cache Layer</h3>
</div>

The standard progression: add Redis in front of the database.

<pre class="code-block"><span class="kw">async function</span> <span class="fn">isEmailTaken</span>(email) <span class="op">{</span>
  <span class="cmt">// L1: Check Redis cache — ~0.5ms</span>
  <span class="kw">const</span> <span class="var">cached</span> <span class="op">=</span> <span class="kw">await</span> redis.<span class="fn">get</span>(<span class="str">'email:'</span> <span class="op">+</span> email)<span class="op">;</span>
  <span class="kw">if</span> (<span class="var">cached</span> <span class="op">!==</span> <span class="kw">null</span>) <span class="kw">return</span> <span class="var">cached</span> <span class="op">===</span> <span class="str">'1'</span><span class="op">;</span>

  <span class="cmt">// L2: Cache miss — query the database</span>
  <span class="kw">const</span> <span class="var">exists</span> <span class="op">=</span> <span class="kw">await</span> db.<span class="fn">query</span>(
    <span class="str">'SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)'</span>,
    [email]
  )<span class="op">;</span>

  <span class="cmt">// Write-back with 1-hour TTL</span>
  <span class="kw">await</span> redis.<span class="fn">setex</span>(<span class="str">'email:'</span> <span class="op">+</span> email, <span class="num">3600</span>, <span class="var">exists</span> <span class="op">?</span> <span class="str">'1'</span> <span class="op">:</span> <span class="str">'0'</span>)<span class="op">;</span>
  <span class="kw">return</span> <span class="var">exists</span><span class="op">;</span>
<span class="op">}</span></pre>

</div>

Better. A Redis `GET` handles millions of requests per second at ~0.5ms latency. Hot emails (common names, frequently checked) stay cached and the database barely sees them.

**But three deep problems remain:**

1. **Cache misses dominate the signup path.** When a real user tries a *new* email they've never tried before, you always miss the cache. Every single signup attempt hits the database.

2. **TTL invalidation is dangerous.** If you cache "email is free" with a 1-hour TTL and someone claims it during that hour, the next check returns stale data.

3. **Memory still scales linearly.** Storing all 1.8B emails in Redis requires roughly 80 bytes per entry: **~144 GB of RAM** just for this cache.

{: class="marginalia" }
💾 Redis uses ~50–100<br/>bytes per string key<br/>plus internal struct<br/>overhead. 1.8B entries<br/>at ~80 bytes = **144 GB**.<br/>At $10/GB/month on<br/>a cloud provider,<br/>that's $1,440/month<br/>for this single cache.

<div class="tip">
<strong>The fundamental insight:</strong> Both Level 1 and Level 2 store the <em>actual email address</em>. At billions of items the memory footprint is O(n) in the size of the data. We need a data structure that answers "have I seen this?" without storing the items themselves.
</div>

---

## Level 3: Bloom Filters — The Key Insight

<div class="level-card">
<div class="level-header">
  <span class="level-badge">Level 3</span>
  <h3>Probabilistic Membership Testing</h3>
</div>

A **Bloom filter** is a space-efficient probabilistic data structure that answers: *"Is this element **definitely not** in the set, or **probably** in the set?"*

**The guarantees:**
- **Zero false negatives**: If the filter says "not in set", the email is **guaranteed** to be free
- **Tunable false positives**: If the filter says "in set", it might be wrong — but at a configurable rate (e.g. 1%)
- **Fixed memory**: A ~1.2 GB Bloom filter handles 10 billion emails at 1% false positive rate
- **Blazing fast**: O(k) in-memory operations — typically microseconds

</div>

### How a Bloom Filter Works

Start with a **bit array** of `m` bits, all zero. Choose `k` independent hash functions.

**Adding** `alice@gmail.com`:
1. Compute k hash positions: h₁("alice@gmail.com"), h₂("alice@gmail.com"), ..., hₖ("alice@gmail.com")
2. Set those k bit positions to `1`

**Querying** `bob@gmail.com`:
1. Compute the same k hash positions for "bob@gmail.com"
2. If **any** bit is `0` → **definitely NOT in set** (cannot be a false negative)
3. If **all** bits are `1` → **probably in set** (could be a false positive)

The false positive arises because different emails can coincidentally set the same bits. If "alice", "charlie", and "dave" together set bits 3, 7, and 12 — and "bob" also maps to positions 3, 7, and 12 — the filter falsely reports bob as present.

<pre class="code-block"><span class="kw">class</span> <span class="cls">BloomFilter</span> <span class="op">{</span>
  <span class="fn">constructor</span>(m, k) <span class="op">{</span>
    <span class="kw">this</span>.<span class="var">m</span> <span class="op">=</span> m<span class="op">;</span>           <span class="cmt">// bit array size</span>
    <span class="kw">this</span>.<span class="var">k</span> <span class="op">=</span> k<span class="op">;</span>           <span class="cmt">// number of hash functions</span>
    <span class="kw">this</span>.<span class="var">bits</span> <span class="op">=</span> <span class="kw">new</span> <span class="cls">Uint8Array</span>(m)<span class="op">;</span>
  <span class="op">}</span>

  <span class="fn">add</span>(item) <span class="op">{</span>
    <span class="kw">for</span> (<span class="kw">let</span> <span class="var">i</span> <span class="op">=</span> <span class="num">0</span><span class="op">;</span> <span class="var">i</span> <span class="op">&lt;</span> <span class="kw">this</span>.<span class="var">k</span><span class="op">;</span> <span class="var">i</span><span class="op">++</span>) <span class="op">{</span>
      <span class="kw">const</span> <span class="var">pos</span> <span class="op">=</span> <span class="kw">this</span>.<span class="fn">_hash</span>(item, i) <span class="op">%</span> <span class="kw">this</span>.<span class="var">m</span><span class="op">;</span>
      <span class="kw">this</span>.<span class="var">bits</span>[<span class="var">pos</span>] <span class="op">=</span> <span class="num">1</span><span class="op">;</span>
    <span class="op">}</span>
  <span class="op">}</span>

  <span class="fn">mightContain</span>(item) <span class="op">{</span>
    <span class="kw">for</span> (<span class="kw">let</span> <span class="var">i</span> <span class="op">=</span> <span class="num">0</span><span class="op">;</span> <span class="var">i</span> <span class="op">&lt;</span> <span class="kw">this</span>.<span class="var">k</span><span class="op">;</span> <span class="var">i</span><span class="op">++</span>) <span class="op">{</span>
      <span class="kw">const</span> <span class="var">pos</span> <span class="op">=</span> <span class="kw">this</span>.<span class="fn">_hash</span>(item, i) <span class="op">%</span> <span class="kw">this</span>.<span class="var">m</span><span class="op">;</span>
      <span class="kw">if</span> (<span class="op">!</span><span class="kw">this</span>.<span class="var">bits</span>[<span class="var">pos</span>]) <span class="kw">return false</span><span class="op">;</span>  <span class="cmt">// guaranteed NOT present</span>
    <span class="op">}</span>
    <span class="kw">return true</span><span class="op">;</span>  <span class="cmt">// probably present</span>
  <span class="op">}</span>

  <span class="fn">_hash</span>(str, seed) <span class="op">{</span>
    <span class="kw">let</span> <span class="var">h</span> <span class="op">=</span> (seed <span class="op">+</span> <span class="num">1</span>) <span class="op">*</span> <span class="num">2654435761</span><span class="op">;</span>
    <span class="kw">for</span> (<span class="kw">let</span> <span class="var">j</span> <span class="op">=</span> <span class="num">0</span><span class="op">;</span> <span class="var">j</span> <span class="op">&lt;</span> str.<span class="var">length</span><span class="op">;</span> <span class="var">j</span><span class="op">++</span>) <span class="op">{</span>
      <span class="var">h</span> <span class="op">=</span> ((<span class="var">h</span> <span class="op">*</span> <span class="num">31</span>) <span class="op">+</span> str.<span class="fn">charCodeAt</span>(<span class="var">j</span>)) <span class="op">&amp;</span> <span class="num">0x7fffffff</span><span class="op">;</span>
    <span class="op">}</span>
    <span class="kw">return</span> <span class="var">h</span><span class="op">;</span>
  <span class="op">}</span>
<span class="op">}</span></pre>

### Interactive Bloom Filter Visualizer

{: class="marginalia" }
🔬 Try it: Add<br/>`alice@gmail.com`,<br/>then query<br/>`bob@gmail.com`<br/>→ "Definitely not".<br/>Add `alice`, then<br/>query `alice`<br/>→ "Probably in set".<br/>Try to trigger a<br/>false positive!

<div class="bf-viz" id="bfViz">
  <h3>🔬 Bloom Filter — Interactive Visualizer</h3>

  <div class="bf-controls">
    <div class="bf-input-group">
      <label>Add email to filter</label>
      <input type="text" id="bfAddInput" placeholder="e.g. alice@gmail.com" autocomplete="off" />
    </div>
    <button class="bf-btn bf-btn-add" id="bfAddBtn">Add ↓</button>
  </div>

  <div class="bf-controls">
    <div class="bf-input-group">
      <label>Query email (membership check)</label>
      <input type="text" id="bfQueryInput" placeholder="e.g. bob@gmail.com" autocomplete="off" />
    </div>
    <button class="bf-btn bf-btn-query" id="bfQueryBtn">Check →</button>
    <button class="bf-btn bf-btn-reset" id="bfResetBtn">Reset</button>
  </div>

  <div class="bf-hash-legend" id="bfHashLegend"></div>

  <div class="bf-bit-array-label">
    Bit array — <span id="bfBitCount">32</span> bits
    &nbsp;·&nbsp;
    <span style="color:#fbef8a">■</span> set (1)
    &nbsp;
    <span style="color:#2e2f35;border:1px solid #3a3b40;display:inline-block;width:10px;height:10px;vertical-align:middle"></span> clear (0)
  </div>
  <div class="bf-bits" id="bfBits"></div>

  <div class="bf-added-list" id="bfAddedList">No emails added yet.</div>
  <div class="bf-result" id="bfResult">Add an email above, then query to see the filter in action.</div>

  <div class="bf-slider-row">
    <div class="bf-slider-group">
      <label>Bit array size (m) <span id="bfMLabel">32</span> bits</label>
      <input type="range" id="bfMSlider" min="0" max="3" value="1" step="1" />
      <div class="bf-slider-ticks"><span>16</span><span>32</span><span>64</span><span>128</span></div>
    </div>
    <div class="bf-slider-group">
      <label>Hash functions (k) <span id="bfKLabel">3</span></label>
      <input type="range" id="bfKSlider" min="1" max="4" value="3" step="1" />
      <div class="bf-slider-ticks"><span>1</span><span>2</span><span>3</span><span>4</span></div>
    </div>
  </div>
  <div class="bf-fp-display" id="bfFpDisplay"></div>
</div>

---

## Level 4: Scalable Bloom Filter — Sharding

{: class="marginalia" }
🗂️ A Bloom filter<br/>must fit in one<br/>process's memory.<br/>Sharding lets you<br/>spread the space<br/>across machines<br/>and add replicas<br/>for fault tolerance.

A 1.2 GB Bloom filter for 10 billion emails fits comfortably on one machine. But it's a single point of failure, it can't scale reads beyond one node's CPU, and rebuilding it on restart takes minutes.

The solution: **partition the email space** across multiple Bloom filter nodes using consistent hashing.

<div class="shard-diagram">
  <div class="shard-box">
    <div class="shard-label">Shard 1</div>
    <div class="shard-name">BF Node A</div>
    <div class="shard-range">hash(email) mod 3 == 0</div>
    <div class="shard-bits" id="shardBitsA"></div>
  </div>
  <div class="shard-arrow">→</div>
  <div class="shard-box">
    <div class="shard-label">Shard 2</div>
    <div class="shard-name">BF Node B</div>
    <div class="shard-range">hash(email) mod 3 == 1</div>
    <div class="shard-bits" id="shardBitsB"></div>
  </div>
  <div class="shard-arrow">→</div>
  <div class="shard-box">
    <div class="shard-label">Shard 3</div>
    <div class="shard-name">BF Node C</div>
    <div class="shard-range">hash(email) mod 3 == 2</div>
    <div class="shard-bits" id="shardBitsC"></div>
  </div>
</div>

<pre class="code-block"><span class="kw">function</span> <span class="fn">routeToShard</span>(email) <span class="op">{</span>
  <span class="cmt">// Deterministic routing: same email always hits same node</span>
  <span class="kw">const</span> <span class="var">idx</span> <span class="op">=</span> <span class="fn">fnv1a</span>(email) <span class="op">%</span> <span class="var">bloomNodes</span>.<span class="var">length</span><span class="op">;</span>
  <span class="kw">return</span> <span class="var">bloomNodes</span>[<span class="var">idx</span>]<span class="op">;</span>
<span class="op">}</span>

<span class="kw">async function</span> <span class="fn">checkEmail</span>(email) <span class="op">{</span>
  <span class="kw">const</span> <span class="var">node</span> <span class="op">=</span> <span class="fn">routeToShard</span>(email)<span class="op">;</span>
  <span class="kw">if</span> (<span class="op">!</span>node.<span class="var">healthy</span>) <span class="op">{</span>
    <span class="cmt">// Node down: degrade gracefully to DB lookup</span>
    <span class="kw">return</span> db.<span class="fn">emailExists</span>(email)<span class="op">;</span>
  <span class="op">}</span>
  <span class="kw">return</span> node.<span class="fn">mightContain</span>(email)<span class="op">;</span>
<span class="op">}</span></pre>

**Properties:**
- Each node handles ~1/n of the email space independently
- A failed node degrades gracefully to the L2 database for its shard only
- Each node can be replicated for read scaling and high availability
- Nodes can be pre-warmed from a snapshot, minimising cold-start impact

---

## Level 5: Counting Bloom Filter — Handling Deletions

{: class="marginalia" }
🗑️ Account deletions<br/>happen millions of<br/>times per day.<br/>A standard Bloom<br/>filter can never<br/>"unset" a bit —<br/>once set, always set,<br/>even after deletion.

A classic Bloom filter has one critical limitation: **you cannot delete elements.** You can't un-set a bit because it might have been set by a completely different email address.

**Why this matters:** When users delete their Gmail accounts, those email addresses should eventually become available again. With a regular Bloom filter, a deleted email stays forever "probably taken."

**Solution:** Replace each bit with a small **counter** (typically 4 bits, values 0–15).

<div class="cbf-table-wrap">
<table class="cbf-table">
  <thead>
    <tr>
      <th>Field</th>
      <th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
      <th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th>
    </tr>
  </thead>
  <tbody>
    <tr class="idx-row">
      <td>Index</td>
      <td>0</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td>
      <td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td>
    </tr>
    <tr class="count-row">
      <td>Counter</td>
      <td>0</td><td>0</td><td class="nonzero">2</td>
      <td>0</td><td class="nonzero">1</td><td>0</td>
      <td class="nonzero">3</td><td>0</td><td class="nonzero">1</td>
      <td>0</td><td class="nonzero">2</td><td>0</td>
    </tr>
  </tbody>
</table>
</div>

**Add** increments the k counters. **Delete** decrements them. An element "exists" if all its k counters are greater than zero.

<pre class="code-block"><span class="kw">class</span> <span class="cls">CountingBloomFilter</span> <span class="op">{</span>
  <span class="fn">constructor</span>(m, k) <span class="op">{</span>
    <span class="kw">this</span>.<span class="var">m</span> <span class="op">=</span> m<span class="op">;</span> <span class="kw">this</span>.<span class="var">k</span> <span class="op">=</span> k<span class="op">;</span>
    <span class="kw">this</span>.<span class="var">counters</span> <span class="op">=</span> <span class="kw">new</span> <span class="cls">Uint8Array</span>(m)<span class="op">;</span>  <span class="cmt">// 4-bit per slot (clamp at 15)</span>
  <span class="op">}</span>

  <span class="fn">add</span>(item) <span class="op">{</span>
    <span class="kw">for</span> (<span class="kw">let</span> <span class="var">i</span> <span class="op">=</span> <span class="num">0</span><span class="op">;</span> <span class="var">i</span> <span class="op">&lt;</span> <span class="kw">this</span>.<span class="var">k</span><span class="op">;</span> <span class="var">i</span><span class="op">++</span>) <span class="op">{</span>
      <span class="kw">const</span> <span class="var">p</span> <span class="op">=</span> <span class="kw">this</span>.<span class="fn">_hash</span>(item, i) <span class="op">%</span> <span class="kw">this</span>.<span class="var">m</span><span class="op">;</span>
      <span class="kw">if</span> (<span class="kw">this</span>.<span class="var">counters</span>[<span class="var">p</span>] <span class="op">&lt;</span> <span class="num">15</span>) <span class="kw">this</span>.<span class="var">counters</span>[<span class="var">p</span>]<span class="op">++;</span>
    <span class="op">}</span>
  <span class="op">}</span>

  <span class="fn">remove</span>(item) <span class="op">{</span>
    <span class="kw">if</span> (<span class="op">!</span><span class="kw">this</span>.<span class="fn">mightContain</span>(item)) <span class="kw">return</span><span class="op">;</span>
    <span class="kw">for</span> (<span class="kw">let</span> <span class="var">i</span> <span class="op">=</span> <span class="num">0</span><span class="op">;</span> <span class="var">i</span> <span class="op">&lt;</span> <span class="kw">this</span>.<span class="var">k</span><span class="op">;</span> <span class="var">i</span><span class="op">++</span>) <span class="op">{</span>
      <span class="kw">const</span> <span class="var">p</span> <span class="op">=</span> <span class="kw">this</span>.<span class="fn">_hash</span>(item, i) <span class="op">%</span> <span class="kw">this</span>.<span class="var">m</span><span class="op">;</span>
      <span class="kw">if</span> (<span class="kw">this</span>.<span class="var">counters</span>[<span class="var">p</span>] <span class="op">&gt;</span> <span class="num">0</span>) <span class="kw">this</span>.<span class="var">counters</span>[<span class="var">p</span>]<span class="op">--;</span>
    <span class="op">}</span>
  <span class="op">}</span>

  <span class="fn">mightContain</span>(item) <span class="op">{</span>
    <span class="kw">for</span> (<span class="kw">let</span> <span class="var">i</span> <span class="op">=</span> <span class="num">0</span><span class="op">;</span> <span class="var">i</span> <span class="op">&lt;</span> <span class="kw">this</span>.<span class="var">k</span><span class="op">;</span> <span class="var">i</span><span class="op">++</span>) <span class="op">{</span>
      <span class="kw">if</span> (<span class="kw">this</span>.<span class="var">counters</span>[<span class="kw">this</span>.<span class="fn">_hash</span>(item, i) <span class="op">%</span> <span class="kw">this</span>.<span class="var">m</span>] <span class="op">===</span> <span class="num">0</span>)
        <span class="kw">return false</span><span class="op">;</span>
    <span class="op">}</span>
    <span class="kw">return true</span><span class="op">;</span>
  <span class="op">}</span>
<span class="op">}</span></pre>

**Trade-off:** 4× the memory of a standard Bloom filter (4-bit counters vs 1-bit flags). For Gmail's scale, this is still 50–80× cheaper than storing full email strings. Well worth it for deletion support.

---

## Level 6: Production Reality — Two-Phase Check

{: class="marginalia" }
⚡ Google's actual<br/>architecture is<br/>not public, but<br/>the two-phase<br/>layered approach<br/>is a well-known<br/>pattern across<br/>major storage<br/>systems.

No production system trusts a Bloom filter alone for a critical write path. The correct architecture is a **two-phase check**: the Bloom filter acts as a fast probabilistic pre-filter; an exact lookup resolves ambiguity.

<div class="pipeline">
  <div class="pipeline-step">
    <div class="ps-icon">📬</div>
    <div class="ps-label">Incoming</div>
    <div class="ps-name">User submits email</div>
    <div class="ps-desc">signup form POST</div>
  </div>
  <div class="pipeline-arrow">→</div>
  <div class="pipeline-step">
    <div class="ps-icon">🌸</div>
    <div class="ps-label">Phase 1 — L1</div>
    <div class="ps-name">Bloom Filter</div>
    <div class="ps-desc">~0.1ms · in-memory</div>
  </div>
  <div class="pipeline-arrow">→</div>
  <div class="pipeline-step">
    <div class="ps-icon">🗄️</div>
    <div class="ps-label">Phase 2 — L2</div>
    <div class="ps-name">DB Lookup</div>
    <div class="ps-desc">~10ms · only on hit</div>
  </div>
  <div class="pipeline-arrow">→</div>
  <div class="pipeline-step">
    <div class="ps-icon">✅</div>
    <div class="ps-label">Decision</div>
    <div class="ps-name">Final answer</div>
    <div class="ps-desc">taken / available</div>
  </div>
</div>

**The decision logic:**

1. **BF says NO** → Email is **definitely free**. Skip the DB entirely. Return "available" immediately. This is the fast path and handles the overwhelming majority of new-email attempts.
2. **BF says YES** → Email is *probably* taken. Do the exact DB lookup to confirm.
3. **DB says NO** (false positive) → BF was wrong; email is actually free. Rare (~1% of BF hits with good tuning). Log it so you can monitor filter saturation.
4. **DB says YES** → Email is genuinely taken. Return "email already in use."

<pre class="code-block"><span class="kw">async function</span> <span class="fn">checkEmailAvailability</span>(email) <span class="op">{</span>
  <span class="cmt">// Phase 1: Bloom filter — O(k), in-memory, ~0.1ms</span>
  <span class="kw">const</span> <span class="var">mightExist</span> <span class="op">=</span> bloomFilter.<span class="fn">mightContain</span>(email)<span class="op">;</span>

  <span class="kw">if</span> (<span class="op">!</span><span class="var">mightExist</span>) <span class="op">{</span>
    <span class="cmt">// Guaranteed free — no DB hit needed</span>
    metrics.<span class="fn">increment</span>(<span class="str">'bf.definite_miss'</span>)<span class="op">;</span>
    <span class="kw">return</span> <span class="op">{</span> available: <span class="kw">true</span>, latencyMs: <span class="num">0.1</span>, source: <span class="str">'bloom'</span> <span class="op">}</span><span class="op">;</span>
  <span class="op">}</span>

  <span class="cmt">// Phase 2: Exact DB lookup — O(log n), ~10ms</span>
  <span class="kw">const</span> <span class="var">inDb</span> <span class="op">=</span> <span class="kw">await</span> db.<span class="fn">emailExists</span>(email)<span class="op">;</span>

  <span class="kw">if</span> (<span class="op">!</span><span class="var">inDb</span>) <span class="op">{</span>
    <span class="cmt">// False positive — BF was wrong, email is actually free</span>
    metrics.<span class="fn">increment</span>(<span class="str">'bf.false_positive'</span>)<span class="op">;</span>
  <span class="op">}</span>

  <span class="kw">return</span> <span class="op">{</span> available: <span class="op">!</span><span class="var">inDb</span>, source: <span class="str">'db'</span> <span class="op">}</span><span class="op">;</span>
<span class="op">}</span></pre>

<div class="tip">
<strong>Monitor your false positive rate.</strong> Track <code>bf.false_positive / bf.total_hits</code> in your metrics. If it climbs above your target (e.g. 2%), the filter is becoming saturated — rebuild it with a larger <em>m</em> or higher <em>k</em>. This is a normal operational concern, not a sign of a broken design.
</div>

---

## Complexity Comparison

<div class="cmp-table-wrap">
<table class="cmp-table">
  <thead>
    <tr>
      <th>Approach</th>
      <th>Space</th>
      <th>Query Time</th>
      <th>False Positive</th>
      <th>False Negative</th>
      <th>Deletions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Naive SQL scan</td>
      <td><span class="cmp-badge badge-bad">O(n)</span></td>
      <td><span class="cmp-badge badge-bad">O(n)</span></td>
      <td><span class="cmp-badge badge-good">0%</span></td>
      <td><span class="cmp-badge badge-good">0%</span></td>
      <td><span class="cmp-badge badge-good">Yes</span></td>
    </tr>
    <tr>
      <td>B-tree index</td>
      <td><span class="cmp-badge badge-bad">O(n)</span></td>
      <td><span class="cmp-badge badge-ok">O(log n)</span></td>
      <td><span class="cmp-badge badge-good">0%</span></td>
      <td><span class="cmp-badge badge-good">0%</span></td>
      <td><span class="cmp-badge badge-good">Yes</span></td>
    </tr>
    <tr>
      <td>Redis cache + index</td>
      <td><span class="cmp-badge badge-bad">O(n)</span></td>
      <td><span class="cmp-badge badge-ok">O(1) hot</span></td>
      <td><span class="cmp-badge badge-good">0%</span></td>
      <td><span class="cmp-badge badge-good">0%</span></td>
      <td><span class="cmp-badge badge-ok">TTL risk</span></td>
    </tr>
    <tr class="highlight-row">
      <td><strong>Bloom Filter</strong></td>
      <td><span class="cmp-badge badge-good">O(m) fixed</span></td>
      <td><span class="cmp-badge badge-good">O(k)</span></td>
      <td><span class="cmp-badge badge-ok">~1%</span></td>
      <td><span class="cmp-badge badge-good">0%</span></td>
      <td><span class="cmp-badge badge-bad">No</span></td>
    </tr>
    <tr class="highlight-row">
      <td><strong>Counting BF</strong></td>
      <td><span class="cmp-badge badge-ok">O(4m) fixed</span></td>
      <td><span class="cmp-badge badge-good">O(k)</span></td>
      <td><span class="cmp-badge badge-ok">~1%</span></td>
      <td><span class="cmp-badge badge-good">0%</span></td>
      <td><span class="cmp-badge badge-good">Yes</span></td>
    </tr>
    <tr>
      <td><strong>BF + DB (two-phase)</strong></td>
      <td><span class="cmp-badge badge-good">O(m) + O(n)</span></td>
      <td><span class="cmp-badge badge-good">O(k) + rare DB</span></td>
      <td><span class="cmp-badge badge-good">0% effective</span></td>
      <td><span class="cmp-badge badge-good">0%</span></td>
      <td><span class="cmp-badge badge-good">Yes</span></td>
    </tr>
  </tbody>
</table>
</div>

{: class="marginalia" }
📐 The formula for<br/>optimal k given m<br/>and n is:<br/>**k = (m/n) × ln 2**<br/>At n=1B, m=9.6GB<br/>that gives k ≈ 6.6,<br/>so use k = 7 hash<br/>functions for best<br/>false positive rate.

---

## False Positive Rate Calculator

{: class="marginalia" }
🧮 A 1 GB Bloom<br/>filter can represent<br/>**10 billion emails**<br/>at ~1% false positive<br/>rate — that's the<br/>magic of probabilistic<br/>data structures. The<br/>formula assumes<br/>ideal, independent<br/>hash functions.

The false positive probability for a Bloom filter with `m` bits, `k` hash functions, and `n` inserted items:

<div style="background:#141416;border-radius:8px;padding:16px;text-align:center;border:1px solid #2e2f35;font-family:'JetBrains Mono',monospace;margin:1rem 0">
  <span style="color:rgba(255,255,255,.55);font-size:15px">
    p &nbsp;=&nbsp; ( 1 &minus; e<sup>&minus;kn/m</sup> )<sup>k</sup>
  </span>
</div>

<div class="fp-calc">
  <h3>🧮 False Positive Rate Calculator</h3>
  <div class="fp-calc-inputs">
    <div class="fp-calc-field">
      <label>n &mdash; Number of items</label>
      <input type="number" id="fpN" value="1000000000" min="1" />
    </div>
    <div class="fp-calc-field">
      <label>m &mdash; Bit array size (bits)</label>
      <input type="number" id="fpM" value="9600000000" min="1" />
    </div>
    <div class="fp-calc-field">
      <label>k &mdash; Hash functions</label>
      <input type="number" id="fpK" value="7" min="1" max="30" />
    </div>
  </div>
  <div class="fp-formula-box">
    <div style="font-size:13px;color:rgba(255,255,255,.45);margin-bottom:6px">
      p = ( 1 &minus; e<sup>-kn/m</sup> )<sup>k</sup>
    </div>
    <span class="fp-big-result" id="fpResult">—</span>
    <div class="fp-interpret" id="fpInterpret"></div>
  </div>
</div>

---

## Interview Tips

{: class="marginalia" }
🎯 The best answers<br/>mention **monitoring**:<br/>"I'd track the FP<br/>rate in real-time<br/>and trigger a filter<br/>rebuild when it<br/>exceeds 2%." That<br/>shows operational<br/>maturity beyond<br/>just the theory.

Here's what separates a good answer from a great one in the room:

<div class="tip-grid">
  <div class="tip-card">
    <div class="tc-num">1</div>
    <h4>Walk up the levels deliberately</h4>
    <p>Don't jump to Bloom filters. Start with SQL, explain why it fails, add an index, explain its limits, add a cache, explain its memory problem. Then motivate the probabilistic approach. Show your thinking.</p>
  </div>
  <div class="tip-card">
    <div class="tc-num">2</div>
    <h4>Name the asymmetry explicitly</h4>
    <p>Say: "false negatives are catastrophic, false positives are acceptable and recoverable." This shows you think about system correctness relative to business impact, not just data structure properties.</p>
  </div>
  <div class="tip-card">
    <div class="tc-num">3</div>
    <h4>Propose the two-phase approach</h4>
    <p>Never suggest a Bloom filter alone. Say: "we use it as a fast pre-filter — on a probable-hit we still do an exact DB lookup to eliminate false positives. False positives just add a rare extra DB query."</p>
  </div>
  <div class="tip-card">
    <div class="tc-num">4</div>
    <h4>Bring up sharding unprompted</h4>
    <p>"A 10 GB Bloom filter must live on one machine, so for horizontal scale and HA we partition the email space with consistent hashing across multiple BF nodes, each independently replicated."</p>
  </div>
  <div class="tip-card">
    <div class="tc-num">5</div>
    <h4>Volunteer the deletion problem</h4>
    <p>"One key limitation: standard Bloom filters can't delete. When accounts are removed, we'd need a Counting Bloom Filter — 4-bit counters instead of single bits, so we can decrement on delete."</p>
  </div>
  <div class="tip-card">
    <div class="tc-num">6</div>
    <h4>Quantify the memory savings</h4>
    <p>Interviewers love numbers. "Storing 1.8B emails as strings needs ~180 GB. A Bloom filter for the same at 1% FP rate needs about 2.2 GB — roughly 80× less memory."</p>
  </div>
</div>

<div class="warn">
<strong>The interview trap:</strong> Saying "just put all emails in a HashSet in memory." Technically correct for small scale, wrong at billions — a HashSet of 1.8B email strings requires ~200 GB of RAM, needs garbage collection, and can't be distributed. The interviewer is specifically testing whether you understand why the memory problem forces a probabilistic approach.
</div>

{: class="marginalia" }
🔮 Bloom filters are<br/>everywhere: Google<br/>Chrome uses one to<br/>check if a URL is<br/>malicious before<br/>making a network<br/>request — it ships<br/>a pre-built filter<br/>of millions of known<br/>bad URLs baked<br/>into the binary.

---

*Next in the series: **Article #2 — Designing a Rate Limiter** — token bucket vs. sliding window log vs. sliding window counter, and why distributed rate limiting is harder than it sounds.*

<script>
(function() {
'use strict';

/* ══════════════════════════════════════════════════════════════════════
   BLOOM FILTER VISUALIZER
   ══════════════════════════════════════════════════════════════════════ */

var BF_SIZES  = [16, 32, 64, 128];
var BF_COLORS = ['#f08080', '#7bcdab', '#a78bfa', '#fbef8a'];
var BF_NAMES  = ['h1', 'h2', 'h3', 'h4'];

var bfM     = 32;
var bfK     = 3;
var bfBits  = new Array(bfM).fill(0);
var bfAdded = [];

function bfHash(str, seed, size) {
  var h = (seed + 1) * 2654435761;
  for (var i = 0; i < str.length; i++) {
    h = ((h * 31) + str.charCodeAt(i)) & 0x7fffffff;
  }
  return h % size;
}

function bfPositions(email, m, k) {
  var pos = [];
  for (var i = 0; i < k; i++) {
    pos.push(bfHash(email, i, m));
  }
  return pos;
}

function bfFPRate(m, k, n) {
  if (n === 0) return 0;
  return Math.pow(1 - Math.exp(-k * n / m), k);
}

function bfRenderBits(hilitePos, hiliteCls) {
  var container = document.getElementById('bfBits');
  if (!container) return;
  var html = '';
  for (var i = 0; i < bfM; i++) {
    var cls = 'bf-bit';
    if (bfBits[i]) cls += ' set';
    if (hilitePos) {
      for (var j = 0; j < hilitePos.length; j++) {
        if (hilitePos[j] === i) {
          cls += ' ' + hiliteCls;
          break;
        }
      }
    }
    html += '<div class="' + cls + '" title="bit ' + i + '"></div>';
  }
  container.innerHTML = html;
  var bcEl = document.getElementById('bfBitCount');
  if (bcEl) bcEl.textContent = bfM;
}

function bfRenderLegend() {
  var el = document.getElementById('bfHashLegend');
  if (!el) return;
  var html = '';
  for (var i = 0; i < bfK; i++) {
    var c = BF_COLORS[i];
    html += '<span class="bf-hash-pill" style="background:' + c + '22;color:' + c + ';border:1px solid ' + c + '55">';
    html += BF_NAMES[i] + '(x, seed=' + (i + 1) + ')';
    html += '</span>';
  }
  el.innerHTML = html;
}

function bfUpdateAddedList() {
  var el = document.getElementById('bfAddedList');
  if (!el) return;
  if (bfAdded.length === 0) {
    el.textContent = 'No emails added yet.';
    return;
  }
  var html = '<span style="color:rgba(255,255,255,.3);margin-right:6px">Added:</span>';
  for (var i = 0; i < bfAdded.length; i++) {
    html += '<span class="added-email">' + bfAdded[i] + '</span>';
  }
  el.innerHTML = html;
}

function bfUpdateFP() {
  var el = document.getElementById('bfFpDisplay');
  if (!el) return;
  var rate = bfFPRate(bfM, bfK, bfAdded.length);
  var pct  = (rate * 100).toFixed(3);
  el.innerHTML = 'Estimated false positive rate with current state: <strong>' + pct + '%</strong>'
    + ' &nbsp;(m=' + bfM + ', k=' + bfK + ', n=' + bfAdded.length + ')';
}

function bfReset() {
  bfBits  = new Array(bfM).fill(0);
  bfAdded = [];
  bfRenderBits(null, '');
  bfRenderLegend();
  bfUpdateAddedList();
  bfUpdateFP();
  var res = document.getElementById('bfResult');
  if (res) {
    res.className   = 'bf-result';
    res.textContent = 'Filter reset. Add emails above, then query to see the filter in action.';
  }
}

function bfAdd() {
  var inp = document.getElementById('bfAddInput');
  if (!inp) return;
  var email = inp.value.trim();
  if (!email) return;

  var positions = bfPositions(email, bfM, bfK);
  for (var i = 0; i < positions.length; i++) {
    bfBits[positions[i]] = 1;
  }
  if (bfAdded.indexOf(email) === -1) bfAdded.push(email);

  bfRenderBits(positions, 'highlight');
  bfUpdateAddedList();
  bfUpdateFP();

  var res = document.getElementById('bfResult');
  if (res) {
    var posStr = '';
    for (var j = 0; j < positions.length; j++) {
      posStr += (j > 0 ? ', ' : '') + BF_NAMES[j] + '=' + positions[j];
    }
    res.className   = 'bf-result positive';
    res.textContent = 'Added "' + email + '". Set bits at positions: ' + posStr;
  }
  inp.value = '';
}

function bfQuery() {
  var inp = document.getElementById('bfQueryInput');
  if (!inp) return;
  var email = inp.value.trim();
  if (!email) return;

  var positions    = bfPositions(email, bfM, bfK);
  var allSet       = true;
  var missingBit   = -1;
  for (var i = 0; i < positions.length; i++) {
    if (!bfBits[positions[i]]) {
      allSet     = false;
      missingBit = positions[i];
      break;
    }
  }

  var reallyAdded = (bfAdded.indexOf(email) !== -1);
  var res         = document.getElementById('bfResult');

  if (!allSet) {
    bfRenderBits(positions, 'checking');
    if (res) {
      res.className   = 'bf-result negative';
      res.textContent = 'DEFINITELY NOT IN SET — bit ' + missingBit + ' is 0. "' + email + '" has never been added. Guaranteed free!';
    }
  } else if (reallyAdded) {
    bfRenderBits(positions, 'match');
    if (res) {
      res.className   = 'bf-result positive';
      res.textContent = 'PROBABLY IN SET — all ' + bfK + ' bits are 1. "' + email + '" was added. Proceed to DB lookup to confirm.';
    }
  } else {
    bfRenderBits(positions, 'highlight');
    if (res) {
      res.className   = 'bf-result fp';
      res.textContent = 'FALSE POSITIVE DETECTED! "' + email + '" was never added, but all ' + bfK + ' bits are set by other emails. This is why we need a two-phase check!';
    }
  }
}

/* Wire controls */
var addBtn   = document.getElementById('bfAddBtn');
var queryBtn = document.getElementById('bfQueryBtn');
var resetBtn = document.getElementById('bfResetBtn');
var addInp   = document.getElementById('bfAddInput');
var qInp     = document.getElementById('bfQueryInput');

if (addBtn)   addBtn.addEventListener('click', bfAdd);
if (queryBtn) queryBtn.addEventListener('click', bfQuery);
if (resetBtn) resetBtn.addEventListener('click', bfReset);
if (addInp)   addInp.addEventListener('keydown',   function(e) { if (e.key === 'Enter') bfAdd(); });
if (qInp)     qInp.addEventListener('keydown',     function(e) { if (e.key === 'Enter') bfQuery(); });

var mSlider = document.getElementById('bfMSlider');
var kSlider = document.getElementById('bfKSlider');
if (mSlider) {
  mSlider.addEventListener('input', function() {
    bfM = BF_SIZES[parseInt(mSlider.value, 10)];
    var lbl = document.getElementById('bfMLabel');
    if (lbl) lbl.textContent = bfM;
    bfReset();
  });
}
if (kSlider) {
  kSlider.addEventListener('input', function() {
    bfK = parseInt(kSlider.value, 10);
    var lbl = document.getElementById('bfKLabel');
    if (lbl) lbl.textContent = bfK;
    bfReset();
  });
}

/* Initial render */
bfRenderBits(null, '');
bfRenderLegend();
bfUpdateFP();

/* ══════════════════════════════════════════════════════════════════════
   SHARD DIAGRAM — illustrative random bits
   ══════════════════════════════════════════════════════════════════════ */
function fillShardBits(id, density) {
  var el = document.getElementById(id);
  if (!el) return;
  var html = '';
  for (var i = 0; i < 48; i++) {
    var on = (Math.random() < density);
    html += '<div class="shard-bit' + (on ? ' on' : '') + '"></div>';
  }
  el.innerHTML = html;
}
fillShardBits('shardBitsA', 0.32);
fillShardBits('shardBitsB', 0.27);
fillShardBits('shardBitsC', 0.30);

/* ══════════════════════════════════════════════════════════════════════
   FALSE POSITIVE RATE CALCULATOR
   ══════════════════════════════════════════════════════════════════════ */
function fpUpdate() {
  var nEl  = document.getElementById('fpN');
  var mEl  = document.getElementById('fpM');
  var kEl  = document.getElementById('fpK');
  var res  = document.getElementById('fpResult');
  var itp  = document.getElementById('fpInterpret');
  if (!nEl || !mEl || !kEl || !res) return;

  var n = parseFloat(nEl.value) || 0;
  var m = parseFloat(mEl.value) || 0;
  var k = parseFloat(kEl.value) || 0;
  if (n <= 0 || m <= 0 || k <= 0) {
    res.textContent = '—';
    res.className   = 'fp-big-result';
    if (itp) itp.textContent = '';
    return;
  }

  var p   = Math.pow(1 - Math.exp(-k * n / m), k);
  var pct = p * 100;
  var display;
  if (pct < 0.0001) {
    display = pct.toExponential(2) + '%';
  } else if (pct < 0.01) {
    display = pct.toFixed(5) + '%';
  } else {
    display = pct.toFixed(4) + '%';
  }

  res.textContent = display;
  res.style.color = '';

  if (p < 0.001) {
    res.className = 'fp-big-result good';
    if (itp) itp.textContent = 'Excellent — fewer than 1 false positive per 1,000 queries';
  } else if (p < 0.01) {
    res.className = 'fp-big-result good';
    if (itp) itp.textContent = 'Good — about ' + Math.round(p * 1000) + ' false positives per 1,000 queries. Only these hit the DB.';
  } else if (p < 0.05) {
    res.className = 'fp-big-result';
    res.style.color = '#fbef8a';
    if (itp) itp.textContent = 'Acceptable — ' + pct.toFixed(1) + '% of BF hits cause an extra DB query';
  } else {
    res.className = 'fp-big-result';
    res.style.color = '#f08080';
    if (itp) itp.textContent = 'High false positive rate — increase m (more bits) or tune k';
  }
}

var fpIds = ['fpN', 'fpM', 'fpK'];
for (var fi = 0; fi < fpIds.length; fi++) {
  var fpEl = document.getElementById(fpIds[fi]);
  if (fpEl) fpEl.addEventListener('input', fpUpdate);
}
fpUpdate();

})();
</script>
