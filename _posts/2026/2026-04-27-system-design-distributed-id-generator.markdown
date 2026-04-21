---
layout: post
title: "System Design: Distributed ID Generator — From UUID to Twitter Snowflake"
date: 2026-04-27 10:00:00 +0000
categories: ["post"]
tags: [system-design, snowflake, uuid, distributed-systems, interview]
series: "System Design Interview Series"
---

<style>
.sd-art { color: rgba(255,255,255,0.8); line-height: 1.78; }
.sd-art h2 {
  color: #fbef8a; margin-top: 2.6rem; font-size: 1.35rem;
  border-bottom: 1px solid #2e2f35; padding-bottom: 0.45rem;
}
.sd-art h3 { color: #7bcdab; margin-top: 1.8rem; font-size: 1.05rem; }
.sd-art strong { color: #fbef8a; }
.sd-art a { color: #7bcdab; }
.sd-art ul { padding-left: 1.4rem; }
.sd-art li { margin-bottom: 0.35rem; }
.sd-art p { margin-bottom: 1rem; }

.series-pill {
  display: inline-block;
  background: rgba(123,205,171,0.1);
  border: 1px solid rgba(123,205,171,0.35);
  color: #7bcdab; padding: 0.3rem 1rem;
  border-radius: 20px; font-size: 0.82rem; margin-bottom: 1.8rem;
}

/* ── Code blocks ────────────────────────────────────────── */
pre.code-block {
  background: #0e0e11; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 1.1rem 1.4rem; overflow-x: auto;
  font-family: "JetBrains Mono","Fira Code","Courier New",monospace;
  font-size: 0.82rem; line-height: 1.65; margin: 1.1rem 0;
  color: rgba(255,255,255,0.82);
}
.kw  { color: #c792ea; }
.fn  { color: #82aaff; }
.str { color: #c3e88d; }
.cm  { color: #546e7a; font-style: italic; }
.num { color: #f78c6c; }
.tp  { color: #ffcb6b; }
.op  { color: #89ddff; }

/* ── Callout boxes ──────────────────────────────────────── */
.callout {
  background: #13131a; border-left: 4px solid #7bcdab;
  padding: 0.9rem 1.2rem; margin: 1.2rem 0;
  border-radius: 0 6px 6px 0; font-size: 0.88rem;
}
.callout.yellow { border-left-color: #fbef8a; }
.callout.red    { border-left-color: #f07178; }

/* ── Marginalia ─────────────────────────────────────────── */
.marginalia {
  float: right; width: 195px; margin: 0 0 1.2rem 1.6rem;
  padding: 0.65rem 0.85rem; border-left: 3px solid rgba(123,205,171,0.3);
  font-size: 0.76rem; color: rgba(255,255,255,0.5); line-height: 1.55;
  clear: right;
}
.clearfix::after { content:''; display:table; clear:both; }

/* ── Snowflake Visualizer ───────────────────────────────── */
.sf-box {
  background: #0e0e11; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.4rem; margin: 1.4rem 0;
}
.sf-box-title { color: #fbef8a; font-weight: bold; font-size: 0.95rem; margin-bottom: 1rem; }
.sf-legend {
  display: flex; gap: 1.1rem; flex-wrap: wrap; margin-bottom: 1rem; font-size: 0.78rem;
}
.sf-leg-item { display:flex; align-items:center; gap:0.4rem; }
.sf-leg-dot  { width:13px; height:13px; border-radius:3px; flex-shrink:0; }
.c-sign    { background:#555; }
.c-ts      { background:#9a8830; }
.c-machine { background:#2f7a5e; }
.c-seq     { background:#2b5b94; }

/* segment colour classes for blocks */
.seg-bar { display:flex; gap:3px; margin-bottom:6px; }
.seg-blk {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:0.55rem 0.4rem; border-radius:5px; font-size:0.73rem; text-align:center;
  position:relative; cursor:default; overflow:hidden;
}
.seg-blk .slabel { font-weight:bold; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.seg-blk .sbits  { font-size:0.63rem; opacity:0.75; }
.seg-blk .sval   { font-size:0.68rem; font-family:monospace; margin-top:0.25rem; word-break:break-all; color:#fff; }
.sb-sign    { background:#3d3d3d; flex:1; min-width:28px; }
.sb-ts      { background:#5e521a; flex:41; }
.sb-machine { background:#1d5e44; flex:10; }
.sb-seq     { background:#1c3f6e; flex:12; }

/* individual bit cells */
.bit-wrap { overflow-x:auto; margin:0.7rem 0; }
.bit-row  { display:flex; gap:1px; min-width:640px; }
.bit-cell {
  flex:1; height:24px; display:flex; align-items:center; justify-content:center;
  font-size:0.5rem; font-family:monospace; border-radius:2px; cursor:default;
  transition:opacity 0.15s;
}
.bit-cell:hover { opacity:0.65; }
.bc-s { background:#444; color:#bbb; }
.bc-t { background:#7a6820; color:#fff; }
.bc-m { background:#1f5e3e; color:#fff; }
.bc-q { background:#1e4070; color:#fff; }

.sf-out {
  background:#141418; border:1px solid #2e2f35; border-radius:6px;
  padding:0.9rem 1rem; margin-top:0.9rem; font-family:monospace; font-size:0.82rem;
  display:none;
}
.sf-out .olabel { color:#fbef8a; display:inline-block; width:145px; }
.sf-out .oval   { color:#7bcdab; }

.decode-row { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.8rem; }
.decode-inp {
  background:#141418; border:1px solid #444; color:rgba(255,255,255,0.8);
  padding:0.45rem 0.75rem; border-radius:5px; font-family:monospace; font-size:0.82rem;
  width:230px;
}
.decode-inp:focus { outline:none; border-color:#7bcdab; }

/* ── Buttons ────────────────────────────────────────────── */
.btn {
  background:rgba(123,205,171,0.1); border:1px solid #7bcdab; color:#7bcdab;
  padding:0.45rem 1.1rem; border-radius:5px; cursor:pointer; font-size:0.85rem;
  font-family:inherit; transition:background 0.18s; margin-right:0.4rem; margin-top:0.4rem;
}
.btn:hover  { background:rgba(123,205,171,0.25); }
.btn.yellow { border-color:#fbef8a; color:#fbef8a; background:rgba(251,239,138,0.08); }
.btn.yellow:hover { background:rgba(251,239,138,0.2); }

/* ── Tooltip ────────────────────────────────────────────── */
.tt-wrap { position:relative; display:inline-block; }
.tt-text {
  visibility:hidden; background:#1e1e25; border:1px solid #3e3e45;
  color:rgba(255,255,255,0.88); border-radius:5px; padding:0.45rem 0.65rem;
  position:absolute; bottom:110%; left:50%; transform:translateX(-50%);
  white-space:nowrap; font-size:0.74rem; z-index:200; pointer-events:none;
}
.tt-wrap:hover .tt-text { visibility:visible; }

/* ── Comparison table ───────────────────────────────────── */
.cmp-table {
  width:100%; border-collapse:collapse; font-size:0.82rem; margin:1.4rem 0;
}
.cmp-table th {
  background:#141418; color:#fbef8a; padding:0.65rem 0.85rem;
  text-align:left; border-bottom:2px solid #3e3e45;
}
.cmp-table td { padding:0.55rem 0.85rem; border-bottom:1px solid #222228; }
.cmp-table tr:hover td { background:#111116; }
.yes     { color:#7bcdab; }
.no      { color:#f07178; }
.partial { color:#fbef8a; }

/* ── ID compare cards ───────────────────────────────────── */
.id-grid {
  display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
  gap:1rem; margin:1.4rem 0;
}
.id-card {
  background:#0e0e11; border:1px solid #2e2f35; border-radius:8px; padding:1rem;
}
.id-card-title {
  color:#fbef8a; font-weight:bold; font-size:0.86rem; margin-bottom:0.7rem;
  display:flex; align-items:center; justify-content:space-between;
}
.id-list { list-style:none; padding:0; margin:0; font-family:monospace; font-size:0.68rem; }
.id-list li {
  padding:0.22rem 0; border-bottom:1px solid #1a1a22;
  word-break:break-all; color:rgba(255,255,255,0.75);
}
.id-list li.ok  { color:#7bcdab; }
.id-list li.bad { color:#f07178; }
.id-meta { font-size:0.7rem; color:rgba(255,255,255,0.45); margin-top:0.5rem; }
.id-meta span { margin-right:0.7rem; }

/* ── Sonyflake compare table ────────────────────────────── */
.sf-vs {
  width:100%; border-collapse:collapse; font-size:0.82rem; margin:1rem 0;
}
.sf-vs th { background:#141418; color:#fbef8a; padding:0.6rem 0.85rem; text-align:left; }
.sf-vs td { padding:0.5rem 0.85rem; border-bottom:1px solid #222228; }
.v-sf   { color:#fbef8a; }
.v-sony { color:#7bcdab; }

/* ── B-tree demo ────────────────────────────────────────── */
.bt-box {
  background:#0e0e11; border:1px solid #2e2f35; border-radius:10px;
  padding:1.4rem; margin:1.4rem 0;
}
.bt-title { color:#fbef8a; font-weight:bold; margin-bottom:1rem; }
.bt-row  { display:flex; align-items:flex-start; gap:0.6rem; margin-bottom:0.8rem; }
.bt-lbl  { width:105px; font-size:0.75rem; color:rgba(255,255,255,0.5); text-align:right; padding-top:6px; flex-shrink:0; }
.bt-pages { display:flex; gap:4px; flex-wrap:wrap; }
.bt-page {
  width:46px; height:36px; border:1px solid #3e3e45; border-radius:4px;
  display:flex; flex-wrap:wrap; gap:2px; padding:3px; align-content:flex-start;
  background:#13131a;
}
.bt-slot { width:9px; height:9px; border-radius:2px; background:#2a2a33; }
.bt-slot.seq  { background:#7bcdab; }
.bt-slot.rand { background:#f07178; }
.bt-slot.hot  { background:#fbef8a; animation:hot-pulse 0.8s infinite; }
@keyframes hot-pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
.bt-desc { font-size:0.76rem; color:rgba(255,255,255,0.5); margin-top:0.6rem; line-height:1.55; }
</style>

<div class="sd-art">

<span class="series-pill">Series #13 of 15 — System Design Interview Prep</span>

**Interview question:** Design a distributed unique ID generator that produces IDs at 10,000/sec, is sortable by creation time, works across 100 servers without coordination, and fits in 64 bits.

This question recurs in every senior distributed-systems interview because it is deceptively simple on the surface and layered with real trade-offs underneath. We will work through every level — from the naïve answer to the Twitter production design — and build interactive tools along the way.

---

## 1. The Problem — Why Not AUTO_INCREMENT?

In a single relational database, `AUTO_INCREMENT` (MySQL) or `SERIAL` (Postgres) is perfectly fine. The database engine guarantees a monotonically increasing counter, atomic across concurrent inserts.

Distributed systems shatter this assumption immediately.

Imagine you are Twitter, storing 500 million tweets per day, spread across 100 MySQL shards to handle the write volume. The question becomes: which shard assigns the next ID? You need a single authority — a single point of failure. Every write must round-trip to the ID server before it can proceed. Under load it becomes the bottleneck. If it fails, your entire write path stops.

The requirements we need to satisfy before proposing a solution:

- **Globally unique** — no two IDs ever collide, across any server, any datacenter, any point in time
- **64-bit** — must fit in a `long` / `int64`. 128-bit IDs double the storage cost of every index and foreign key
- **Time-sortable** — if ID *A* was generated before ID *B*, then *A* &lt; *B* numerically. This makes range queries (`WHERE id > X AND id < Y`) meaningful as time ranges
- **No runtime coordination** — each node generates IDs fully independently at runtime. Startup coordination (e.g. assigning machine IDs) is acceptable
- **10,000+ IDs/sec per node** — at minimum. Production systems need 100K–1M/sec

---

## 2. Level 1 — UUID v4

The simplest globally unique ID is a UUID (Universally Unique Identifier). Version 4 uses 122 random bits:

<pre class="code-block"><span class="cm">// UUID v4 format (128 bits total, displayed as 32 hex digits + 4 dashes)</span>
<span class="num">550e8400</span>-<span class="num">e29b</span>-<span class="num">41d4</span>-<span class="num">a716</span>-<span class="num">446655440000</span>
<span class="cm">//          ^^^^                   version = 4 (random)</span>
<span class="cm">//               ^                  variant = 10xx (RFC 4122)</span></pre>

<pre class="code-block"><span class="cm">// Java</span>
<span class="kw">import</span> java.util.<span class="tp">UUID</span>;

<span class="kw">public class</span> <span class="tp">UUIDDemo</span> {
    <span class="kw">public static</span> <span class="tp">String</span> <span class="fn">generate</span>() {
        <span class="kw">return</span> <span class="tp">UUID</span>.<span class="fn">randomUUID</span>().<span class="fn">toString</span>();
        <span class="cm">// "a3bb189e-8bf9-3888-9912-ace4e6543002"</span>
    }
}

<span class="cm">// Python</span>
<span class="kw">import</span> uuid
uid = str(uuid.<span class="fn">uuid4</span>())   <span class="cm"># "f47ac10b-58cc-4372-a567-0e02b2c3d479"</span></pre>

**What works:** Zero coordination needed. Works offline. Probabilistically unique — the chance of collision among 1 trillion UUIDs is about 1 in a billion. Good enough for almost any real-world system.

**The four problems:**

1. **128 bits** — doubles the storage cost of every index and foreign key. A billion-row table with a UUID primary key costs ~128 bytes per index entry vs 8 bytes for a 64-bit integer.
2. **Not time-sortable** — the 122 random bits have no time component. You cannot derive insertion order from UUID values.
3. **B-tree fragmentation** — random values insert at unpredictable positions in the B-tree index, causing frequent page splits and cache evictions. We will visualize this in Section 11.
4. **URL-unfriendly** — 36 characters with dashes; awkward in REST endpoints and log files.

UUID v1 uses a timestamp in its structure, but it leaks the MAC address of the generating machine (a privacy issue) and still has poor locality due to the timestamp byte order.

---

## 3. Level 2 — Database Auto-Increment with Multiple Servers

A pragmatic workaround: multiple database servers, each claiming a different stride of the integer space.

{: class="marginalia" }
Twitter open-sourced Snowflake in 2010, and it has since been reimplemented in every major language. Instagram, Discord, and Mastodon all use Snowflake-style IDs.

With two servers generating IDs cooperatively:

<pre class="code-block"><span class="cm">-- Server A: generates odd IDs (1, 3, 5, 7 ...)</span>
<span class="tp">SET</span> @@auto_increment_offset    = <span class="num">1</span>;
<span class="tp">SET</span> @@auto_increment_increment = <span class="num">2</span>;

<span class="cm">-- Server B: generates even IDs (2, 4, 6, 8 ...)</span>
<span class="tp">SET</span> @@auto_increment_offset    = <span class="num">2</span>;
<span class="tp">SET</span> @@auto_increment_increment = <span class="num">2</span>;</pre>

Flickr famously used this pattern in production for years. It is simple, battle-tested, and requires no application-level changes — the database handles everything.

**Where it breaks down:**

- Hard-coded to exactly *N* servers. Scaling from 2 to 3 means reassigning offsets and carefully migrating live data.
- Adding a server mid-flight risks collisions unless every table's current max is analysed and new offsets are chosen carefully.
- IDs from the two servers are interleaved but not strictly time-ordered. Server A's ID 999 may have been generated hours after Server B's ID 1000.
- Each server is still a single point of failure for its ID range.

This is an acceptable solution for an early-stage product with one or two databases. It stops scaling cleanly well before you need it most.

---

## 4. Level 3 — Timestamp + Random Suffix

Each server independently concatenates the current millisecond with random bits:

<pre class="code-block"><span class="cm">// 48-bit ms timestamp + 16-bit random = 64-bit ID</span>
<span class="kw">function</span> <span class="fn">generate</span>() {
    <span class="kw">const</span> ts   = Date.<span class="fn">now</span>();                       <span class="cm">// ms since Unix epoch (~48 bits)</span>
    <span class="kw">const</span> rand = Math.<span class="fn">floor</span>(Math.<span class="fn">random</span>() * <span class="num">65536</span>); <span class="cm">// 16-bit random</span>
    <span class="kw">return</span> ts * <span class="num">65536</span> + rand;
}</pre>

IDs generated in different milliseconds will sort correctly. IDs in the *same* millisecond sort by their random component — which may not match generation order.

**The collision problem:** At 10,000 IDs/sec you expect roughly 10 IDs per millisecond per server. With 65,536 random values available, the birthday-problem collision probability within one millisecond is approximately (10² / (2 × 65536)) ≈ 0.08%. Small — but not zero. Under a traffic spike it gets meaningfully worse.

Adding a machine ID prefix reduces cross-server collisions to zero, but within a single server in a single millisecond, collisions remain possible under load. For any system requiring a hard uniqueness guarantee this is not good enough.

---

## 5. Level 4 — Twitter Snowflake ⭐

Snowflake solves every requirement by carefully partitioning 64 bits into three non-overlapping fields:

<div class="callout yellow">
<strong>64-bit Snowflake = [1 sign bit] + [41 timestamp bits] + [10 machine-ID bits] + [12 sequence bits]</strong><br>
The timestamp occupies the most significant bits, so IDs are strictly ordered by time. The sequence increments atomically within a millisecond, so no coordination is needed between calls on the same node.
</div>

**Interactive Snowflake Visualizer — try it:**

<div class="sf-box" id="sf-main">
  <div class="sf-box-title">&#x1F522; Snowflake ID — 64-bit Bit Layout</div>

  <div class="sf-legend">
    <div class="sf-leg-item"><div class="sf-leg-dot c-sign"></div><span>Bit 63: Sign (always 0)</span></div>
    <div class="sf-leg-item"><div class="sf-leg-dot c-ts"></div><span>Bits 62–22: 41-bit Timestamp (ms since epoch)</span></div>
    <div class="sf-leg-item"><div class="sf-leg-dot c-machine"></div><span>Bits 21–12: 10-bit Machine ID</span></div>
    <div class="sf-leg-item"><div class="sf-leg-dot c-seq"></div><span>Bits 11–0: 12-bit Sequence</span></div>
  </div>

  <div class="seg-bar" id="sf-seg-bar">
    <div class="seg-blk sb-sign tt-wrap">
      <span class="slabel">Sign</span>
      <span class="sbits">1 bit</span>
      <span class="sval" id="seg-sign-val">0</span>
      <span class="tt-text">Always 0 — keeps the ID a positive signed 64-bit integer</span>
    </div>
    <div class="seg-blk sb-ts tt-wrap">
      <span class="slabel">Timestamp</span>
      <span class="sbits">41 bits — ms since 2010-01-01</span>
      <span class="sval" id="seg-ts-val">—</span>
      <span class="tt-text">Milliseconds elapsed since the custom epoch (Jan 1 2010). 2^41 ms = 69.7 years.</span>
    </div>
    <div class="seg-blk sb-machine tt-wrap">
      <span class="slabel">Machine ID</span>
      <span class="sbits">10 bits — 1024 nodes</span>
      <span class="sval" id="seg-machine-val">—</span>
      <span class="tt-text">Identifies the generating server. 2^10 = 1024 unique machines. Often split 5 bits datacenter + 5 bits node.</span>
    </div>
    <div class="seg-blk sb-seq tt-wrap">
      <span class="slabel">Sequence</span>
      <span class="sbits">12 bits — 4096/ms</span>
      <span class="sval" id="seg-seq-val">—</span>
      <span class="tt-text">Auto-increments per millisecond on this machine. Resets to 0 on each new ms. 2^12 = 4096 IDs/ms/machine.</span>
    </div>
  </div>

  <div class="bit-wrap">
    <div class="bit-row" id="sf-bit-row"><!-- filled by JS --></div>
  </div>

  <button class="btn yellow" id="btn-gen-sf">&#x25B6; Generate Snowflake ID</button>

  <div class="sf-out" id="sf-out-main">
    <div><span class="olabel">Decimal ID:</span><span class="oval" id="sfo-dec">—</span></div>
    <div><span class="olabel">Timestamp offset:</span><span class="oval" id="sfo-ts">—</span></div>
    <div><span class="olabel">Date / Time (UTC):</span><span class="oval" id="sfo-date">—</span></div>
    <div><span class="olabel">Machine ID:</span><span class="oval" id="sfo-machine">42 (demo)</span></div>
    <div><span class="olabel">Sequence:</span><span class="oval" id="sfo-seq">—</span></div>
  </div>

  <div style="margin-top:1.5rem; border-top:1px solid #2e2f35; padding-top:1rem;">
    <div class="sf-box-title" style="font-size:0.88rem;">&#x1F50D; Decode Any Snowflake ID</div>
    <div class="decode-row">
      <input type="text" class="decode-inp" id="sf-decode-inp" placeholder="Paste a Snowflake ID (decimal)…" />
      <button class="btn" id="btn-sf-decode">Decode</button>
    </div>
    <div class="sf-out" id="sf-out-decode">
      <div><span class="olabel">Timestamp offset:</span><span class="oval" id="sfd-ts">—</span></div>
      <div><span class="olabel">Date / Time (UTC):</span><span class="oval" id="sfd-date">—</span></div>
      <div><span class="olabel">Machine ID:</span><span class="oval" id="sfd-machine">—</span></div>
      <div><span class="olabel">Sequence:</span><span class="oval" id="sfd-seq">—</span></div>
      <div><span class="olabel">Binary (segmented):</span><span class="oval" id="sfd-bin" style="word-break:break-all;font-size:0.68rem;">—</span></div>
    </div>
  </div>
</div>

**The maths behind Snowflake:**

- **41-bit timestamp** = 2^41 ms = 2,199,023,255,552 ms ÷ 86,400,000 ms/day ÷ 365.25 ≈ **69.7 years**. Set your custom epoch to Jan 1 2020 and you are covered until 2089.
- **10-bit machine ID** = 2^10 = **1,024 unique nodes**. In practice this is often split into 5 bits for datacenter (32 datacenters) and 5 bits for machine within that datacenter (32 machines each), giving 1,024 total nodes with structured routing.
- **12-bit sequence** = 2^12 = **4,096 IDs per millisecond per machine** → **4,096,000 IDs/sec per machine**. The 10K/sec requirement is satisfied by a factor of 400×.

The key insight: because the timestamp occupies bits 63–22 (the most significant non-sign bits), any two Snowflake IDs are ordered by time as long as they were generated in different milliseconds. Within the same millisecond, the machine ID and sequence break ties deterministically.

---

## 6. Level 5 — The Clock Drift Problem

Snowflake has one serious vulnerability: it assumes server clocks move only forward.

In production, NTP (Network Time Protocol) adjustments can move a server's clock backward by tens of milliseconds. If your clock jumps back 50 ms, the Snowflake generator will start producing IDs with timestamps it has already used — creating duplicates.

{: class="marginalia" }
The 41-bit timestamp in Snowflake gives you 69.7 years from your custom epoch. Set your epoch to 2020 and you are covered until 2089 — almost certainly enough for any system you build today.

Every production Snowflake implementation must include a clock-drift guard:

<pre class="code-block"><span class="kw">public class</span> <span class="tp">SnowflakeGenerator</span> {

    <span class="kw">private static final long</span> EPOCH      = <span class="num">1577836800000L</span>; <span class="cm">// Jan 1 2020 UTC</span>
    <span class="kw">private static final long</span> MACHINE_ID = <span class="fn">readMachineId</span>();  <span class="cm">// from config / ZooKeeper</span>

    <span class="kw">private long</span> lastTimestamp = <span class="op">-</span><span class="num">1L</span>;
    <span class="kw">private long</span> sequence      = <span class="num">0L</span>;

    <span class="kw">public synchronized long</span> <span class="fn">nextId</span>() {
        <span class="kw">long</span> currentMs = <span class="fn">currentTimeMs</span>();

        <span class="cm">// ─── Clock drift guard ──────────────────────────────────</span>
        <span class="kw">if</span> (currentMs <span class="op">&lt;</span> lastTimestamp) {
            <span class="kw">long</span> drift = lastTimestamp <span class="op">-</span> currentMs;
            <span class="kw">if</span> (drift <span class="op">&lt;=</span> <span class="num">5</span>) {
                <span class="cm">// Small drift: sleep it off</span>
                <span class="fn">sleepMs</span>(drift);
                currentMs = <span class="fn">currentTimeMs</span>();
            } <span class="kw">else</span> {
                <span class="cm">// Large drift: fail loudly — cannot guarantee uniqueness</span>
                <span class="kw">throw new</span> <span class="tp">ClockMovedBackwardException</span>(
                    <span class="str">"Clock moved back "</span> <span class="op">+</span> drift <span class="op">+</span> <span class="str">"ms. Last="</span>
                    <span class="op">+</span> lastTimestamp <span class="op">+</span> <span class="str">" current="</span> <span class="op">+</span> currentMs
                );
            }
        }
        <span class="cm">// ────────────────────────────────────────────────────────</span>

        <span class="kw">if</span> (currentMs <span class="op">==</span> lastTimestamp) {
            sequence = (sequence <span class="op">+</span> <span class="num">1</span>) <span class="op">&amp;</span> <span class="num">0xFFFL</span>;   <span class="cm">// 12-bit mask</span>
            <span class="kw">if</span> (sequence <span class="op">==</span> <span class="num">0</span>) {
                currentMs = <span class="fn">waitNextMs</span>(lastTimestamp); <span class="cm">// exhausted 4096 IDs this ms</span>
            }
        } <span class="kw">else</span> {
            sequence = <span class="num">0</span>;
        }

        lastTimestamp = currentMs;

        <span class="kw">return</span> ((currentMs <span class="op">-</span> EPOCH) <span class="op">&lt;&lt;</span> <span class="num">22</span>)
             <span class="op">|</span> (MACHINE_ID           <span class="op">&lt;&lt;</span> <span class="num">12</span>)
             <span class="op">|</span>  sequence;
    }
}</pre>

Three strategies for handling drift, in order of aggressiveness:

1. **Wait and retry (small drift)** — if drift is ≤ 5 ms, sleep until the clock catches up. Safe for most workloads; adds negligible latency.
2. **Throw an exception (large drift)** — for drifts above a threshold, fail fast. The caller retries against a healthy node. Prevents silent ID corruption.
3. **Monotonic clock** — decouple from wall-clock time entirely. Java's `System.nanoTime()` is monotonic. Use it to increment a logical counter, periodically anchored to wall-clock time. This is the most robust approach but the hardest to implement correctly.

Modern cloud VMs (AWS, GCP, Azure) have extremely well-disciplined clocks with NTP adjustments under 1 ms in practice. But the guard code is still essential — especially for financial systems where duplicate IDs cause data corruption.

---

## 7. Level 6 — Sonyflake (A Snowflake Variant)

Sony's open-source [Sonyflake](https://github.com/sony/sonyflake) makes different trade-offs: lower timestamp resolution in exchange for a longer lifespan and automatic machine ID assignment:

<table class="sf-vs">
  <thead>
    <tr><th>Field</th><th class="v-sf">Snowflake</th><th class="v-sony">Sonyflake</th></tr>
  </thead>
  <tbody>
    <tr><td>Total bits</td><td class="v-sf">64</td><td class="v-sony">63</td></tr>
    <tr><td>Timestamp resolution</td><td class="v-sf">1 ms</td><td class="v-sony">10 ms</td></tr>
    <tr><td>Timestamp bits</td><td class="v-sf">41 bits</td><td class="v-sony">39 bits</td></tr>
    <tr><td>Lifespan from epoch</td><td class="v-sf">69.7 years</td><td class="v-sony">174 years</td></tr>
    <tr><td>Machine ID bits</td><td class="v-sf">10 bits (1024 machines)</td><td class="v-sony">8 bits (256 machines)</td></tr>
    <tr><td>Machine ID source</td><td class="v-sf">Config / ZooKeeper</td><td class="v-sony">Lower 16 bits of private IP</td></tr>
    <tr><td>Sequence bits</td><td class="v-sf">12 bits (4096/ms)</td><td class="v-sony">16 bits (65536/10 ms)</td></tr>
    <tr><td>Max IDs/sec/machine</td><td class="v-sf">4,096,000</td><td class="v-sony">6,553,600</td></tr>
  </tbody>
</table>

Sonyflake's headline design choice: use the lower 16 bits of the machine's private IP address as the machine identifier. In a standard AWS VPC (10.0.0.0/16), the last two octets are unique per instance — no configuration required. The trade-off is fewer available machines (256 vs 1024).

<pre class="code-block"><span class="cm">// Sonyflake 63-bit layout (Go)</span>
<span class="cm">// [39 bits: 10ms timestamp] [8 bits: machine ID] [16 bits: sequence]</span>

<span class="kw">type</span> <span class="tp">Sonyflake</span> <span class="kw">struct</span> {
    mutex       sync.<span class="tp">Mutex</span>
    startTime   <span class="tp">int64</span>    <span class="cm">// custom epoch in 10ms units</span>
    elapsedTime <span class="tp">int64</span>    <span class="cm">// 10ms ticks since startTime</span>
    sequence    <span class="tp">uint16</span>   <span class="cm">// 16-bit per-tick counter</span>
    machineID   <span class="tp">uint16</span>   <span class="cm">// lower 16 bits of private IP</span>
}

<span class="kw">func</span> (sf <span class="op">*</span><span class="tp">Sonyflake</span>) <span class="fn">NextID</span>() (<span class="tp">uint64</span>, <span class="tp">error</span>) {
    <span class="kw">const</span> maskSequence = <span class="tp">uint16</span>(<span class="num">0xFFFF</span>)
    sf.mutex.<span class="fn">Lock</span>()
    <span class="kw">defer</span> sf.mutex.<span class="fn">Unlock</span>()
    current := <span class="fn">toSonyflakeTime</span>(time.<span class="fn">Now</span>())
    <span class="kw">if</span> sf.elapsedTime <span class="op">&lt;</span> current {
        sf.elapsedTime = current
        sf.sequence = <span class="num">0</span>
    } <span class="kw">else</span> {
        sf.sequence++
        <span class="kw">if</span> sf.sequence == <span class="num">0</span> {
            sf.elapsedTime++
            <span class="fn">sleepTime</span>(sf.elapsedTime <span class="op">-</span> current) <span class="cm">// wait for tick</span>
        }
    }
    <span class="kw">return</span> sf.<span class="fn">toID</span>(), <span class="kw">nil</span>
}</pre>

---

## 8. Level 7 — MongoDB ObjectID

MongoDB's ObjectID predates Snowflake and uses a different decomposition — 96 bits (12 bytes) with second-precision timestamps:

<pre class="code-block"><span class="cm">// MongoDB ObjectID: 12 bytes = 96 bits</span>
<span class="cm">//  ┌──────────────────────────────────────────────────────────┐</span>
<span class="cm">//  │ 4-byte timestamp │ 5-byte random │ 3-byte counter        │</span>
<span class="cm">//  │  (Unix seconds)  │ (machine+pid) │ (incrementing)        │</span>
<span class="cm">//  └──────────────────────────────────────────────────────────┘</span>

<span class="cm">// Example: 507f1f77bcf86cd799439011</span>
<span class="cm">//          ^^^^^^^^</span>
<span class="cm">//          507f1f77 → 0x507f1f77 = 1350949751 (Unix) = Oct 22 2012 21:49:11 UTC</span>

<span class="tp">Bytes 0–3</span>:   4-byte big-endian Unix timestamp (second precision) → sortable to the second
<span class="tp">Bytes 4–8</span>:   5-byte random value generated at process startup (machine + pid hash)
<span class="tp">Bytes 9–11</span>:  3-byte incrementing counter, random initial value → 16,777,216 IDs/sec/process</pre>

MongoDB ObjectIDs are **roughly sortable**: two IDs from different seconds will compare correctly. Two IDs from the *same* second will sort by the 5-byte random machine field, which carries no time information.

The 5-byte random value was historically derived from the machine's hostname + process ID. Modern MongoDB drivers use a purely random value at startup to avoid hostname collision in containerised environments where many processes share the same hostname.

At 96 bits, ObjectIDs are heavier than Snowflake but lighter than UUID. If you are already using MongoDB and do not need strict millisecond ordering, ObjectID is a fine native choice.

---

## 9. Level 8 — ULID

ULID (Universally Unique Lexicographically Sortable Identifier) combines UUID's universality with Snowflake's sortability, encoded as a URL-safe string:

<pre class="code-block"><span class="cm">// ULID: 128 bits → 26 Crockford Base32 characters</span>
<span class="cm">// Example: 01ARZ3NDEKTSV4RRFFQ69G5FAV</span>
<span class="cm">//          ^^^^^^^^^^                   = 10-char timestamp (48-bit ms Unix epoch)</span>
<span class="cm">//                    ^^^^^^^^^^^^^^^^   = 16-char random    (80-bit cryptographic random)</span>

<span class="cm">// Crockford Base32 alphabet — removes I, L, O, U to avoid visual confusion:</span>
<span class="cm">// 0123456789ABCDEFGHJKMNPQRSTVWXYZ</span></pre>

<pre class="code-block"><span class="cm">// ULID generator (JavaScript, no external libs)</span>
<span class="kw">function</span> <span class="fn">generateULID</span>() {
    <span class="kw">var</span> ENC = <span class="str">"0123456789ABCDEFGHJKMNPQRSTVWXYZ"</span>;

    <span class="cm">// 10-char timestamp</span>
    <span class="kw">var</span> ms  = Date.<span class="fn">now</span>();
    <span class="kw">var</span> ts  = <span class="str">""</span>;
    <span class="kw">var</span> t   = ms;
    <span class="kw">for</span> (<span class="kw">var</span> i = <span class="num">9</span>; i <span class="op">&gt;=</span> <span class="num">0</span>; i<span class="op">--</span>) {
        ts = ENC[t <span class="op">%</span> <span class="num">32</span>] + ts;
        t  = Math.<span class="fn">floor</span>(t <span class="op">/</span> <span class="num">32</span>);
    }

    <span class="cm">// 16-char random</span>
    <span class="kw">var</span> rand = <span class="str">""</span>;
    <span class="kw">for</span> (<span class="kw">var</span> j = <span class="num">0</span>; j <span class="op">&lt;</span> <span class="num">16</span>; j<span class="op">++</span>) {
        rand <span class="op">+=</span> ENC[Math.<span class="fn">floor</span>(Math.<span class="fn">random</span>() <span class="op">*</span> <span class="num">32</span>)];
    }

    <span class="kw">return</span> ts <span class="op">+</span> rand;
}</pre>

ULID advantages over Snowflake and UUID:

- **String-sortable** — `01ARZ3` &lt; `01ARZ4` lexicographically, which maps to time order. Store as a `VARCHAR(26)` and `ORDER BY id` gives you time order.
- **No special characters** — safe in URLs, filenames, JSON keys, and database columns without quoting.
- **Case-insensitive** — `01arz3ndek` and `01ARZ3NDEK` are the same ULID.
- **128-bit collision resistance** — same strength as UUID v4 for the random component.

The main disadvantage vs Snowflake: 128 bits vs 64. And two ULIDs generated in the same millisecond will sort by their random component, not strict generation order. The optional monotonic ULID spec addresses this by incrementing the random part within a millisecond.

---

## 10. Interactive: ID Algorithm Comparison

Generate IDs for each algorithm and observe sortability. The colour indicates whether the five generated IDs, when sorted lexicographically, appear in the same order they were created (green = time-sorted, red = scrambled).

<div class="id-grid">
  <div class="id-card">
    <div class="id-card-title">UUID v4 <button class="btn" style="font-size:0.72rem;padding:0.3rem 0.7rem;" onclick="runUUIDs()">Generate 5</button></div>
    <ul class="id-list" id="uuid-list"><li style="color:rgba(255,255,255,0.3)">Click to generate…</li></ul>
    <div class="id-meta" id="uuid-meta"><span>128 bits</span><span>Coord: <span class="yes">No</span></span></div>
  </div>
  <div class="id-card">
    <div class="id-card-title">Auto-Increment <button class="btn" style="font-size:0.72rem;padding:0.3rem 0.7rem;" onclick="runAutoInc()">Generate 5</button></div>
    <ul class="id-list" id="autoinc-list"><li style="color:rgba(255,255,255,0.3)">Click to generate…</li></ul>
    <div class="id-meta" id="autoinc-meta"><span>64 bits</span><span>Coord: <span class="no">Yes (DB)</span></span></div>
  </div>
  <div class="id-card">
    <div class="id-card-title">Snowflake <button class="btn" style="font-size:0.72rem;padding:0.3rem 0.7rem;" onclick="runSnowflakes()">Generate 5</button></div>
    <ul class="id-list" id="snow-list"><li style="color:rgba(255,255,255,0.3)">Click to generate…</li></ul>
    <div class="id-meta" id="snow-meta"><span>64 bits</span><span>Coord: <span class="yes">No</span></span></div>
  </div>
  <div class="id-card">
    <div class="id-card-title">ULID <button class="btn" style="font-size:0.72rem;padding:0.3rem 0.7rem;" onclick="runULIDs()">Generate 5</button></div>
    <ul class="id-list" id="ulid-list"><li style="color:rgba(255,255,255,0.3)">Click to generate…</li></ul>
    <div class="id-meta" id="ulid-meta"><span>128 bits</span><span>Coord: <span class="yes">No</span></span></div>
  </div>
</div>

<p style="font-size:0.77rem;color:rgba(255,255,255,0.4);margin-top:0;">Green = IDs sort in generation order. Red = sort order does not match generation order.</p>

---

## 11. DB Index Locality — The Hidden Performance Cliff

One of the most practically important differences between random and sequential IDs is their impact on write performance in clustered database indexes (InnoDB, Postgres B-tree, RocksDB).

{: class="marginalia" }
Random UUID inserts into a MySQL InnoDB table with 100 million rows can be 10–50× slower than sequential IDs due to B-tree page fragmentation. This is a real production performance cliff that teams hit when they first scale a UUID-keyed table.

A B-tree index stores keys in sorted order across fixed-size pages (16 KB in MySQL). When you insert a new key:

- **Sequential IDs** always insert at the rightmost leaf page — the current maximum. Pages fill left to right, the buffer pool cache stays warm, writes are sequential on disk.
- **Random IDs** insert at a random position in the tree. The target leaf page is almost certainly not in the buffer pool. The engine must perform a random disk read, find the target page, potentially split it (expensive), and write it back.

<div class="bt-box">
  <div class="bt-title">B-Tree Leaf Page Fill Pattern</div>
  <div class="bt-row">
    <div class="bt-lbl">Sequential<br>(Snowflake)</div>
    <div class="bt-pages" id="bt-seq"></div>
  </div>
  <div class="bt-row">
    <div class="bt-lbl">Random<br>(UUID v4)</div>
    <div class="bt-pages" id="bt-rand"></div>
  </div>
  <div style="margin-top:0.9rem;">
    <button class="btn yellow" id="btn-bt-run">&#x25B6; Animate</button>
    <button class="btn" id="btn-bt-reset">Reset</button>
  </div>
  <div class="bt-desc">
    Sequential inserts (green) always append to the rightmost page — minimal cache misses, no page splits until a page is full, then only the last page splits.<br>
    Random inserts (red) scatter across all pages. With a large table most pages will be cold in the buffer pool — each insert pays a random I/O penalty.
  </div>
</div>

In practice, on a 100-million-row InnoDB table running on spinning disks:

- **Snowflake / sequential IDs:** sustained insert throughput of **50,000–200,000 rows/sec**
- **UUID v4 / random IDs:** insert throughput of **3,000–20,000 rows/sec**, degrading as the table grows

On SSDs the gap narrows (random reads are cheaper) but does not disappear — even on NVMe storage, scattered B-tree page splits consume buffer pool capacity and create write amplification that hurts throughput under load.

---

## 12. Full Algorithm Comparison

<table class="cmp-table">
  <thead>
    <tr>
      <th>Algorithm</th><th>Bits</th><th>Time-Sortable</th><th>Coordination</th><th>Max IDs/sec/node</th><th>Best Use Case</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>UUID v4</td><td>128</td><td><span class="no">No</span></td><td><span class="yes">No</span></td><td>Unlimited</td><td>Simple unique IDs, no ordering needed</td>
    </tr>
    <tr>
      <td>Auto-Increment</td><td>64</td><td><span class="yes">Yes</span></td><td><span class="no">Yes (DB)</span></td><td>~10K</td><td>Single-database, low-scale systems</td>
    </tr>
    <tr>
      <td>Timestamp + Random</td><td>64</td><td><span class="partial">~Yes</span></td><td><span class="yes">No</span></td><td>~65K</td><td>Approximate ordering, low-contention</td>
    </tr>
    <tr>
      <td><strong>Snowflake</strong></td><td><strong>64</strong></td><td><span class="yes"><strong>Yes</strong></span></td><td><span class="yes"><strong>No</strong></span></td><td><strong>4,096,000</strong></td><td><strong>Distributed systems, social platforms</strong></td>
    </tr>
    <tr>
      <td>Sonyflake</td><td>63</td><td><span class="yes">Yes</span></td><td><span class="yes">No</span></td><td>6,553,600</td><td>Auto-configured, private-IP networks</td>
    </tr>
    <tr>
      <td>MongoDB ObjectID</td><td>96</td><td><span class="partial">~Yes (1s)</span></td><td><span class="yes">No</span></td><td>16,777,216</td><td>MongoDB-native applications</td>
    </tr>
    <tr>
      <td>ULID</td><td>128</td><td><span class="yes">Yes</span></td><td><span class="yes">No</span></td><td>Unlimited</td><td>URL-safe sortable IDs, human-readable logs</td>
    </tr>
  </tbody>
</table>

---

## Interview Answer Summary

When this question is posed in a system design interview, the ideal answer moves through these steps:

1. **Clarify requirements** — confirm the 64-bit constraint, throughput target, whether strict millisecond sorting is required, and the number of nodes.
2. **Rule out naive solutions** — explain why UUID is too large and not sortable; explain why auto-increment requires central coordination.
3. **Propose Snowflake** — sketch the three-field layout, derive the capacity maths out loud (69.7 years, 4M IDs/sec per node), explain how uniqueness is guaranteed without coordination.
4. **Address the failure modes** — clock drift guard (wait or throw), machine ID assignment strategy (static config, ZooKeeper ephemeral node, or IP-based like Sonyflake).
5. **Mention alternatives** — ULID if URL-safety or lexicographic sortability matters, Sonyflake if you want zero-configuration machine IDs, MongoDB ObjectID if the stack is already Mongo.

<div class="callout yellow">
<strong>The 64-bit constraint is the whole point.</strong> With 128 bits you can lazily concatenate timestamp and random bits and get good-enough behaviour. With 64 bits, every bit counts — you are forced to reason carefully about the trade-offs between lifespan, node count, and per-node throughput. That reasoning is what interviewers are evaluating.
</div>

</div><!-- end .sd-art -->

<script>
(function() {

  /* =====================================================
     Snowflake ID generator
     ===================================================== */
  var SF_EPOCH  = 1262304000000; // Jan 1 2010 UTC in ms
  var DEMO_MACHINE = 42;
  var lastSfMs = -1;
  var sfSeq    = 0;

  function genSnowflake() {
    var now = Date.now();
    var ms  = now - SF_EPOCH;
    if (ms < 0) ms = 0;

    if (ms === lastSfMs) {
      sfSeq = (sfSeq + 1) & 0xFFF;
      if (sfSeq === 0) {
        while (Date.now() - SF_EPOCH <= ms) { /* spin */ }
        ms = Date.now() - SF_EPOCH;
      }
    } else {
      sfSeq = 0;
    }
    lastSfMs = ms;

    var tsBig = BigInt(ms);
    var mBig  = BigInt(DEMO_MACHINE);
    var sBig  = BigInt(sfSeq);
    return (tsBig << BigInt(22)) | (mBig << BigInt(12)) | sBig;
  }

  function sfToBin64(id) {
    var result = "";
    for (var i = 63; i >= 0; i--) {
      result += Number((id >> BigInt(i)) & BigInt(1));
    }
    return result;
  }

  function renderBitRow(id) {
    var row = document.getElementById("sf-bit-row");
    if (!row) return;
    row.innerHTML = "";
    for (var i = 63; i >= 0; i--) {
      var bit = Number((id >> BigInt(i)) & BigInt(1));
      var idx = 63 - i;
      var cls = "bit-cell ";
      if      (idx === 0)       cls += "bc-s";
      else if (idx <= 41)       cls += "bc-t";
      else if (idx <= 51)       cls += "bc-m";
      else                      cls += "bc-q";

      var titles = ["Sign: always 0"];
      var lbl =
        idx === 0 ? "Sign: always 0" :
        idx <= 41 ? "Bit " + (63 - idx) + ": Timestamp" :
        idx <= 51 ? "Bit " + (63 - idx) + ": Machine ID" :
                    "Bit " + (63 - idx) + ": Sequence";

      var span = document.createElement("span");
      span.className = cls;
      span.title     = lbl;
      span.textContent = String(bit);
      row.appendChild(span);
    }
  }

  function updateSegments(id) {
    var ts  = Number(id >> BigInt(22));
    var mac = Number((id >> BigInt(12)) & BigInt(0x3FF));
    var seq = Number(id & BigInt(0xFFF));
    var tv = document.getElementById("seg-ts-val");
    var mv = document.getElementById("seg-machine-val");
    var sv = document.getElementById("seg-seq-val");
    if (tv) tv.textContent = String(ts) + " ms";
    if (mv) mv.textContent = String(mac);
    if (sv) sv.textContent = String(seq);
  }

  function showMainOut(id) {
    var el = document.getElementById("sf-out-main");
    if (!el) return;
    el.style.display = "block";
    var ts   = Number(id >> BigInt(22));
    var mac  = Number((id >> BigInt(12)) & BigInt(0x3FF));
    var seq  = Number(id & BigInt(0xFFF));
    var date = new Date(ts + SF_EPOCH);
    document.getElementById("sfo-dec").textContent     = id.toString();
    document.getElementById("sfo-ts").textContent      = String(ts) + " ms";
    document.getElementById("sfo-date").textContent    = date.toUTCString();
    document.getElementById("sfo-machine").textContent = String(mac) + " (demo)";
    document.getElementById("sfo-seq").textContent     = String(seq);
  }

  var btnGen = document.getElementById("btn-gen-sf");
  if (btnGen) {
    btnGen.addEventListener("click", function() {
      var id = genSnowflake();
      renderBitRow(id);
      updateSegments(id);
      showMainOut(id);
    });
  }

  var btnDecode = document.getElementById("btn-sf-decode");
  if (btnDecode) {
    btnDecode.addEventListener("click", function() {
      var raw = document.getElementById("sf-decode-inp").value.trim();
      var out = document.getElementById("sf-out-decode");
      if (!raw || !out) return;
      try {
        var id   = BigInt(raw);
        var ts   = Number(id >> BigInt(22));
        var mac  = Number((id >> BigInt(12)) & BigInt(0x3FF));
        var seq  = Number(id & BigInt(0xFFF));
        var date = new Date(ts + SF_EPOCH);
        var bin  = sfToBin64(id);
        out.style.display = "block";
        document.getElementById("sfd-ts").textContent      = String(ts) + " ms";
        document.getElementById("sfd-date").textContent    = date.toUTCString();
        document.getElementById("sfd-machine").textContent = String(mac);
        document.getElementById("sfd-seq").textContent     = String(seq);
        document.getElementById("sfd-bin").textContent     =
          bin.substring(0,1) + " | " +
          bin.substring(1,42) + " | " +
          bin.substring(42,52) + " | " +
          bin.substring(52,64);
      } catch (e) {
        out.style.display = "block";
        document.getElementById("sfd-ts").textContent      = "Invalid ID — enter a decimal number";
        document.getElementById("sfd-date").textContent    = "";
        document.getElementById("sfd-machine").textContent = "";
        document.getElementById("sfd-seq").textContent     = "";
        document.getElementById("sfd-bin").textContent     = "";
      }
    });
  }

  /* =====================================================
     UUID v4 generator
     ===================================================== */
  function genUUID() {
    var h = [];
    for (var i = 0; i < 32; i++) h.push(Math.floor(Math.random() * 16).toString(16));
    h[12] = "4";
    h[16] = (parseInt(h[16], 16) & 3 | 8).toString(16);
    return h.slice(0,8).join("") + "-" +
           h.slice(8,12).join("") + "-" +
           h.slice(12,16).join("") + "-" +
           h.slice(16,20).join("") + "-" +
           h.slice(20).join("");
  }

  function isSorted(arr) {
    for (var i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i-1]) return false;
    }
    return true;
  }

  function renderIdList(listId, ids, sortKey) {
    var list = document.getElementById(listId);
    if (!list) return;
    var keys  = sortKey ? ids.map(sortKey) : ids.slice();
    var sorted = isSorted(keys);
    list.innerHTML = ids.map(function(id, i) {
      var cls = sorted ? "ok" : "bad";
      return "<li class='" + cls + "'>" + id + "</li>";
    }).join("");
    return sorted;
  }

  window.runUUIDs = function() {
    var ids = [];
    for (var i = 0; i < 5; i++) ids.push(genUUID());
    var sorted = renderIdList("uuid-list", ids, null);
    document.getElementById("uuid-meta").innerHTML =
      "<span>128 bits</span>" +
      "<span>Sortable: <span class='" + (sorted ? "yes" : "no") + "'>" + (sorted ? "Yes" : "No") + "</span></span>" +
      "<span>Coord: <span class='yes'>No</span></span>";
  };

  /* =====================================================
     Auto-increment simulator
     ===================================================== */
  var autoCounter = Math.floor(Math.random() * 9000) + 1000;
  window.runAutoInc = function() {
    var ids = [];
    for (var i = 0; i < 5; i++) ids.push(String(autoCounter++));
    renderIdList("autoinc-list", ids, null);
    document.getElementById("autoinc-meta").innerHTML =
      "<span>64 bits</span>" +
      "<span>Sortable: <span class='yes'>Yes</span></span>" +
      "<span>Coord: <span class='no'>Yes (DB)</span></span>";
  };

  /* =====================================================
     Snowflake batch generator
     ===================================================== */
  window.runSnowflakes = function() {
    var ids = [];
    for (var i = 0; i < 5; i++) ids.push(genSnowflake().toString());
    renderIdList("snow-list", ids, function(s) { return s.padStart(20, "0"); });
    document.getElementById("snow-meta").innerHTML =
      "<span>64 bits</span>" +
      "<span>Sortable: <span class='yes'>Yes</span></span>" +
      "<span>Coord: <span class='yes'>No</span></span>";
  };

  /* =====================================================
     ULID generator
     ===================================================== */
  var ULID_ENC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  function genULID() {
    var ms = Date.now();
    var ts = "";
    var t  = ms;
    for (var i = 9; i >= 0; i--) {
      ts = ULID_ENC[t % 32] + ts;
      t  = Math.floor(t / 32);
    }
    var rand = "";
    for (var j = 0; j < 16; j++) rand += ULID_ENC[Math.floor(Math.random() * 32)];
    return ts + rand;
  }

  window.runULIDs = function() {
    var ids = [];
    for (var i = 0; i < 5; i++) ids.push(genULID());
    renderIdList("ulid-list", ids, null);
    document.getElementById("ulid-meta").innerHTML =
      "<span>128 bits</span>" +
      "<span>Sortable: <span class='yes'>Yes</span></span>" +
      "<span>Coord: <span class='yes'>No</span></span>";
  };

  /* =====================================================
     B-Tree animation
     ===================================================== */
  var BT_PAGES = 8;
  var BT_SLOTS = 9; // per page

  var btSeq  = [];
  var btRand = [];
  var btAnimRunning = false;
  var btSeqIdx  = 0;
  var btRandIdx = 0;

  function btInit() {
    btSeq  = [];
    btRand = [];
    for (var i = 0; i < BT_PAGES; i++) {
      btSeq.push ({ slots: new Array(BT_SLOTS).fill(0), active: -1 });
      btRand.push({ slots: new Array(BT_SLOTS).fill(0), active: -1 });
    }
    btSeqIdx  = 0;
    btRandIdx = 0;
    btRender();
  }

  function btRender() {
    btRenderRow("bt-seq",  btSeq,  "seq");
    btRenderRow("bt-rand", btRand, "rand");
  }

  function btRenderRow(cid, pages, filledCls) {
    var container = document.getElementById(cid);
    if (!container) return;
    container.innerHTML = "";
    pages.forEach(function(pg) {
      var div = document.createElement("div");
      div.className = "bt-page";
      pg.slots.forEach(function(filled, si) {
        var slot = document.createElement("div");
        var cls  = "bt-slot";
        if      (pg.active === si)  cls += " hot";
        else if (filled)            cls += " " + filledCls;
        slot.className = cls;
        div.appendChild(slot);
      });
      container.appendChild(div);
    });
  }

  function btStep() {
    if (!btAnimRunning) return;

    // Sequential: fill pages left to right, slots top to bottom
    btSeq.forEach(function(p) { p.active = -1; });
    if (btSeqIdx < BT_PAGES * BT_SLOTS) {
      var sp  = Math.floor(btSeqIdx / BT_SLOTS);
      var ss  = btSeqIdx % BT_SLOTS;
      btSeq[sp].slots[ss] = 1;
      btSeq[sp].active    = ss;
      btSeqIdx++;
    }

    // Random: pick a random page, find a random empty slot
    btRand.forEach(function(p) { p.active = -1; });
    var attempts = 0;
    while (attempts < 50) {
      var rp = Math.floor(Math.random() * BT_PAGES);
      var empties = [];
      btRand[rp].slots.forEach(function(v, i) { if (!v) empties.push(i); });
      if (empties.length > 0) {
        var rs = empties[Math.floor(Math.random() * empties.length)];
        btRand[rp].slots[rs] = 1;
        btRand[rp].active    = rs;
        btRandIdx++;
        break;
      }
      attempts++;
    }

    btRender();

    var seqDone  = btSeqIdx  >= BT_PAGES * BT_SLOTS;
    var randDone = btRand.every(function(p) { return p.slots.every(function(v) { return v === 1; }); });

    if (seqDone && randDone) {
      btAnimRunning = false;
      return;
    }
    setTimeout(btStep, 160);
  }

  var btnBtRun = document.getElementById("btn-bt-run");
  if (btnBtRun) {
    btnBtRun.addEventListener("click", function() {
      if (btAnimRunning) return;
      btAnimRunning = true;
      btStep();
    });
  }

  var btnBtReset = document.getElementById("btn-bt-reset");
  if (btnBtReset) {
    btnBtReset.addEventListener("click", function() {
      btAnimRunning = false;
      btInit();
    });
  }

  btInit();

})();
</script>
