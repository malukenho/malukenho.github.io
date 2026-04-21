---
layout: post
title: "System Design: Distributed Cache — Consistent Hashing, Eviction, and Beyond"
date: 2026-04-17 10:00:00 +0000
categories: ["post"]
tags: [system-design, cache, consistent-hashing, redis, interview]
series: "System Design Interview Series"
---

{: class="marginalia" }
Series **#4 of 15** in<br/>*System Design Interview*<br/>deep-dives. Each post<br/>stands alone but they<br/>build on each other.

<div class="series-label">System Design Interview Series &mdash; #4 of 15</div>

**The question:** Design a distributed cache like Memcached/Redis that serves **1 million requests per second** with sub-millisecond latency and handles node failures gracefully.

This is a layered problem. You start with a HashMap in memory, quickly discover why that breaks, then build up through consistent hashing, eviction policies, and stampede prevention until you have a system that could actually run in production.

---

<style>
/* ── Base ─────────────────────────────────────────────────────────── */
.series-label {
  display: inline-block; background: rgba(123,205,171,.12);
  border: 1px solid rgba(123,205,171,.35); border-radius: 20px;
  padding: 4px 14px; font-size: 12px; color: #7bcdab;
  letter-spacing: .06em; margin-bottom: 1.6rem;
}

/* ── Marginalia ──────────────────────────────────────────────────── */
.marginalia {
  float: right; clear: right;
  width: 190px; margin: 0 0 1.2rem 1.4rem;
  padding: .7rem .9rem;
  border-left: 2px solid rgba(123,205,171,.4);
  font-size: 11.5px; line-height: 1.6;
  color: rgba(255,255,255,.45); font-style: italic;
  background: rgba(123,205,171,.04); border-radius: 0 6px 6px 0;
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

/* ── Latency table ───────────────────────────────────────────────── */
.lat-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 1rem 0 1.6rem;
}
.lat-table th {
  text-align: left; padding: 8px 14px; color: rgba(255,255,255,.45);
  font-weight: 500; font-size: 11px; text-transform: uppercase;
  letter-spacing: .07em; border-bottom: 1px solid #2e2f35;
}
.lat-table td {
  padding: 8px 14px; border-bottom: 1px solid #1c1d22;
  color: rgba(255,255,255,.78); vertical-align: middle;
}
.lat-table tr:last-child td { border-bottom: none; }
.lat-bar-track {
  background: #1a1b20; border-radius: 3px; height: 10px;
  overflow: hidden; width: 160px; display: inline-block; vertical-align: middle;
}
.lat-bar { height: 100%; border-radius: 3px; background: #7bcdab; }
.lat-fast { background: #7bcdab; }
.lat-med  { background: #fbef8a; }
.lat-slow { background: #f08080; }

/* ── Sim buttons ─────────────────────────────────────────────────── */
.sim-btn {
  padding: 7px 16px; border-radius: 7px; border: 1px solid #7bcdab;
  background: #152319; color: #7bcdab; cursor: pointer;
  font-family: inherit; font-size: 13px; transition: all .2s; margin: 3px 2px;
}
.sim-btn:hover:not(:disabled) { background: #7bcdab; color: #19191c; }
.sim-btn:disabled { opacity: .38; cursor: default; }
.sim-btn.danger { border-color: #f08080; background: rgba(240,128,128,.08); color: #f08080; }
.sim-btn.danger:hover:not(:disabled) { background: #f08080; color: #19191c; }
.sim-btn.warn { border-color: #fbef8a; background: rgba(251,239,138,.08); color: #fbef8a; }
.sim-btn.warn:hover:not(:disabled) { background: #fbef8a; color: #19191c; }
.sim-btn.neutral { border-color: rgba(255,255,255,.25); background: transparent; color: rgba(255,255,255,.6); }
.sim-btn.neutral:hover:not(:disabled) { background: rgba(255,255,255,.08); }

/* ── Interactive boxes ───────────────────────────────────────────── */
.ibox {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 14px; padding: 1.4rem 1.6rem; margin: 1.6rem 0;
}
.ibox-title {
  font-size: 11px; text-transform: uppercase; letter-spacing: .09em;
  color: rgba(255,255,255,.35); margin: 0 0 1rem; display: flex;
  align-items: center; gap: .5rem;
}
.ibox-title::before {
  content: ''; display: inline-block; width: 8px; height: 8px;
  border-radius: 50%; background: #7bcdab;
}

/* ── Ring canvas ─────────────────────────────────────────────────── */
#ringCanvas {
  display: block; margin: .5rem auto;
  border-radius: 8px; background: #111214;
  border: 1px solid #2e2f35;
}
.ring-controls {
  display: flex; flex-wrap: wrap; gap: .4rem;
  justify-content: center; margin: .8rem 0 .4rem;
  align-items: center;
}
.ring-result {
  text-align: center; font-size: 13px; min-height: 1.4rem;
  color: #7bcdab; font-family: "JetBrains Mono", monospace;
  margin-top: .4rem;
}
.ring-input {
  background: #111214; border: 1px solid #3a3b40; color: #e0e0e8;
  border-radius: 6px; padding: 6px 10px; font-size: 13px;
  width: 160px; font-family: "JetBrains Mono", monospace;
}
.ring-input:focus { outline: none; border-color: #7bcdab; }

/* ── Eviction comparison ─────────────────────────────────────────── */
.evict-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: .7rem; margin: 1rem 0;
}
@media (max-width: 680px) {
  .evict-grid { grid-template-columns: repeat(2, 1fr); }
}
.evict-col {
  background: #111214; border: 1px solid #2e2f35;
  border-radius: 10px; padding: .8rem;
}
.evict-col h4 {
  margin: 0 0 .6rem; font-size: 12px; text-align: center;
  color: #fbef8a; letter-spacing: .05em; text-transform: uppercase;
}
.evict-slots {
  display: flex; flex-direction: column; gap: 4px; min-height: 150px;
}
.evict-slot {
  border-radius: 5px; padding: 5px 8px; font-size: 12px;
  font-family: "JetBrains Mono", monospace; font-weight: 600;
  border: 1px solid #2e2f35; background: #1a1b1f;
  color: rgba(255,255,255,.7); text-align: center;
  transition: all .25s;
}
.evict-slot.recent { border-color: #7bcdab; background: rgba(123,205,171,.12); color: #7bcdab; }
.evict-slot.evicted { border-color: #f08080; background: rgba(240,128,128,.12); color: #f08080; text-decoration: line-through; }
.evict-slot.added   { border-color: #fbef8a; background: rgba(251,239,138,.1); color: #fbef8a; }
.evict-note {
  font-size: 10.5px; color: rgba(255,255,255,.3); margin-top: .5rem;
  text-align: center; min-height: 14px; font-style: italic;
}
.access-btns {
  display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;
  margin: .8rem 0 .5rem;
}

/* ── Cache simulator ─────────────────────────────────────────────── */
.sim-cache-display {
  display: flex; flex-wrap: wrap; gap: 6px; margin: .7rem 0;
  min-height: 44px;
}
.sim-cache-slot {
  border-radius: 6px; padding: 5px 10px; font-size: 12px;
  font-family: "JetBrains Mono", monospace; font-weight: 600;
  border: 1px solid #2e2f35; background: #1a1b1f;
  color: rgba(255,255,255,.75); text-align: center;
  transition: all .3s; min-width: 70px;
}
.sim-cache-slot.hit   { border-color: #7bcdab; background: rgba(123,205,171,.15); color: #7bcdab; }
.sim-cache-slot.miss  { border-color: #f08080; background: rgba(240,128,128,.12); color: #f08080; }
.sim-cache-slot.empty { border-style: dashed; color: rgba(255,255,255,.2); }
.sim-log {
  background: #0e0f12; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .7rem 1rem; height: 150px; overflow-y: auto;
  font-family: "JetBrains Mono", monospace; font-size: 12px;
  line-height: 1.7; margin-top: .7rem;
}
.sim-log .hit-line  { color: #7bcdab; }
.sim-log .miss-line { color: #f08080; }
.sim-log .set-line  { color: #bd93f9; }
.sim-log .info-line { color: rgba(255,255,255,.35); }
.sim-input-row {
  display: flex; gap: .5rem; align-items: center; flex-wrap: wrap;
  margin: .6rem 0;
}
.sim-cmd-input {
  background: #111214; border: 1px solid #3a3b40; color: #e0e0e8;
  border-radius: 6px; padding: 7px 11px; font-size: 13px; flex: 1; min-width: 180px;
  font-family: "JetBrains Mono", monospace;
}
.sim-cmd-input:focus { outline: none; border-color: #7bcdab; }
.sim-stats {
  display: flex; gap: 1.2rem; font-size: 12px; margin-top: .5rem; flex-wrap: wrap;
}
.sim-stat { color: rgba(255,255,255,.45); }
.sim-stat span { font-weight: 700; color: #fbef8a; font-family: "JetBrains Mono", monospace; }

/* ── Capacity calculator ─────────────────────────────────────────── */
.calc-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: .8rem 1.2rem;
  margin: .8rem 0;
}
@media (max-width: 480px) { .calc-grid { grid-template-columns: 1fr; } }
.calc-row label {
  display: block; font-size: 11px; color: rgba(255,255,255,.45);
  text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px;
}
.calc-row input, .calc-row select {
  width: 100%; background: #111214; border: 1px solid #3a3b40;
  color: #e0e0e8; border-radius: 6px; padding: 7px 10px;
  font-size: 13px; box-sizing: border-box;
}
.calc-row input:focus, .calc-row select:focus {
  outline: none; border-color: #7bcdab;
}
.calc-result {
  background: rgba(123,205,171,.07); border: 1px solid rgba(123,205,171,.25);
  border-radius: 10px; padding: 1rem 1.2rem; margin-top: .8rem;
}
.calc-result-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.05);
  font-size: 13px;
}
.calc-result-row:last-child { border-bottom: none; }
.calc-result-row .label { color: rgba(255,255,255,.5); }
.calc-result-row .value { color: #fbef8a; font-family: "JetBrains Mono", monospace; font-weight: 700; }
.calc-result-row.total .value { color: #7bcdab; font-size: 15px; }

/* ── Trade-off table ─────────────────────────────────────────────── */
.trade-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 1rem 0;
}
.trade-table th {
  text-align: left; padding: 8px 14px; color: rgba(255,255,255,.45);
  font-size: 11px; text-transform: uppercase; letter-spacing: .07em;
  border-bottom: 1px solid #2e2f35;
}
.trade-table td {
  padding: 8px 14px; border-bottom: 1px solid #1c1d22;
  color: rgba(255,255,255,.75); vertical-align: top; font-size: 13px;
}
.trade-table tr:last-child td { border-bottom: none; }
.trade-table td:first-child { color: #7bcdab; font-weight: 600; }
.yes { color: #7bcdab; font-weight: 700; }
.no  { color: #f08080; font-weight: 700; }
.part { color: #fbef8a; font-weight: 700; }

/* ── Architecture diagram ────────────────────────────────────────── */
.arch-row {
  display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; gap: 0; margin: 1.2rem 0;
}
.arch-box {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 8px 14px; font-size: 12px; color: rgba(255,255,255,.75);
  text-align: center; min-width: 90px;
}
.arch-box.accent { border-color: rgba(123,205,171,.5); color: #7bcdab; background: rgba(123,205,171,.07); }
.arch-box.yellow { border-color: rgba(251,239,138,.4); color: #fbef8a; background: rgba(251,239,138,.07); }
.arch-arr { color: rgba(255,255,255,.25); padding: 0 6px; font-size: 16px; }

/* ── Callout ─────────────────────────────────────────────────────── */
.callout {
  background: rgba(251,239,138,.06); border-left: 3px solid rgba(251,239,138,.5);
  border-radius: 0 8px 8px 0; padding: .8rem 1.1rem; margin: 1.2rem 0;
  font-size: 13px; color: rgba(255,255,255,.72); line-height: 1.7;
}
.callout strong { color: #fbef8a; }

/* ── Pill badges ─────────────────────────────────────────────────── */
.pill {
  display: inline-block; border-radius: 5px; padding: 2px 8px;
  font-size: 11px; font-weight: 600; letter-spacing: .04em;
}
.pill-g { background: rgba(123,205,171,.14); color: #7bcdab; border: 1px solid rgba(123,205,171,.3); }
.pill-y { background: rgba(251,239,138,.12); color: #fbef8a; border: 1px solid rgba(251,239,138,.3); }
.pill-r { background: rgba(240,128,128,.12); color: #f08080; border: 1px solid rgba(240,128,128,.3); }
</style>

---

## 1. Why Cache? The Latency Numbers

The fundamental asymmetry that makes caching valuable: **memory is 50,000× faster than a database query.** That's not an exaggeration — it's physics.

<table class="lat-table">
  <thead>
    <tr>
      <th>Storage Layer</th>
      <th>Typical Latency</th>
      <th>Relative Scale</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>L1 CPU Cache</td>
      <td>~1 ns</td>
      <td><div class="lat-bar-track"><div class="lat-bar lat-fast" style="width:1%"></div></div></td>
    </tr>
    <tr>
      <td>L2/L3 CPU Cache</td>
      <td>~10 ns</td>
      <td><div class="lat-bar-track"><div class="lat-bar lat-fast" style="width:2%"></div></div></td>
    </tr>
    <tr>
      <td>RAM / In-Process Cache</td>
      <td>~100 ns</td>
      <td><div class="lat-bar-track"><div class="lat-bar lat-fast" style="width:4%"></div></div></td>
    </tr>
    <tr>
      <td>Redis (network + RAM)</td>
      <td>~0.3–1 ms</td>
      <td><div class="lat-bar-track"><div class="lat-bar lat-fast" style="width:12%"></div></div></td>
    </tr>
    <tr>
      <td>SSD Random Read</td>
      <td>~100 µs</td>
      <td><div class="lat-bar-track"><div class="lat-bar lat-med" style="width:20%"></div></div></td>
    </tr>
    <tr>
      <td>Database Query (indexed)</td>
      <td>~5–50 ms</td>
      <td><div class="lat-bar-track"><div class="lat-bar lat-slow" style="width:65%"></div></div></td>
    </tr>
    <tr>
      <td>Cross-datacenter Network</td>
      <td>~150 ms</td>
      <td><div class="lat-bar-track"><div class="lat-bar lat-slow" style="width:100%"></div></div></td>
    </tr>
  </tbody>
</table>

The **80/20 rule** of data access holds remarkably well in production: roughly 20% of your data receives 80% of your reads. Cache that hot 20% in RAM and you can absorb the overwhelming majority of traffic before it ever reaches your database.

A PostgreSQL server optimised for read-heavy workloads handles around 10,000–50,000 queries per second. Redis on the same hardware handles 1,000,000 operations per second. That factor of 20–100× is why caching exists.

---

## 2. Level 1: Single-Node Cache

The simplest implementation is a `HashMap` in memory. Java's `LinkedHashMap` with access-order tracking gives us LRU eviction essentially for free:

<div class="code-wrap">
<div class="code-lang">Java — LRU cache with LinkedHashMap<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">public class</span> <span class="ty">LRUCache</span> {
    <span class="kw">private final int</span> <span class="nm">capacity</span>;
    <span class="kw">private final</span> <span class="ty">LinkedHashMap</span>&lt;<span class="ty">String</span>, <span class="ty">String</span>&gt; <span class="nm">store</span>;

    <span class="kw">public</span> <span class="ty">LRUCache</span>(<span class="kw">int</span> capacity) {
        <span class="kw">this</span>.capacity = capacity;
        <span class="cm">// accessOrder=true: get() moves entry to the back (most-recent end)</span>
        <span class="kw">this</span>.store = <span class="kw">new</span> <span class="ty">LinkedHashMap</span>&lt;&gt;(capacity, <span class="nu">0.75f</span>, <span class="kw">true</span>) {
            <span class="kw">protected boolean</span> <span class="nm">removeEldestEntry</span>(<span class="ty">Map.Entry</span>&lt;<span class="ty">String</span>,<span class="ty">String</span>&gt; e) {
                <span class="kw">return</span> size() &gt; capacity;
            }
        };
    }

    <span class="kw">public synchronized</span> <span class="ty">String</span> <span class="nm">get</span>(<span class="ty">String</span> key) {
        <span class="kw">return</span> store.getOrDefault(key, <span class="kw">null</span>);   <span class="cm">// null = cache miss</span>
    }

    <span class="kw">public synchronized void</span> <span class="nm">set</span>(<span class="ty">String</span> key, <span class="ty">String</span> value) {
        store.put(key, value);
    }
}</pre>
</div>

This works beautifully for a single-server deployment. Gets are a HashMap lookup — sub-microsecond. Eviction is automatic. Memory is bounded.

**This breaks the moment you need any of:**
- **Fault tolerance** — server crashes → entire cache gone → thundering herd on DB
- **Scale-out** — data is too large for one machine's RAM
- **Multiple app servers** — server A has `user:42` cached, server B doesn't; the same key produces inconsistent results across servers

---

## 3. Level 2: Naive Sharding — The Modulo Trap

The natural extension is distributing keys across *N* cache nodes using modulo hashing:

<div class="code-wrap">
<div class="code-lang">Pseudocode — modulo sharding</div>
<pre class="code-block"><span class="nm">node_index</span> <span class="op">=</span> hash(key) <span class="op">%</span> N       <span class="cm">// e.g. hash("user:42") % 3 = 1 → Node 1</span>

<span class="cm">// This is consistent: same key always routes to same node</span>
<span class="cm">// Works perfectly... until N changes</span></pre>
</div>

<div class="code-wrap">
<div class="code-lang">The problem — adding or removing a node</div>
<pre class="code-block"><span class="cm">// 3-node cluster: hash("user:42") % 3 = 1  →  Node 1  ✓ (cache hit)</span>

<span class="cm">// After adding Node 4 (N=4):
// hash("user:42") % 4 = 3  →  Node 3  ✗ (cache miss — data is on Node 1!)</span>

<span class="cm">// Keys remapped when adding 1 node to a 3-node cluster:</span>
keys_remapped <span class="op">=</span> <span class="nu">1</span> <span class="op">-</span> (N_old <span class="op">/</span> N_new) <span class="op">=</span> <span class="nu">1</span> <span class="op">-</span> (<span class="nu">3</span><span class="op">/</span><span class="nu">4</span>) <span class="op">=</span> <span class="nu">75%</span>

<span class="cm">// Removing 1 node from 3 (N=2): ~50% of keys remap
// Removing 1 node from 10 (N=9): ~10% of keys remap — still painful at scale</span></pre>
</div>

When 75% of your cache keys suddenly miss simultaneously, every one of those requests falls through to your database. Your DB, sized for perhaps 5% of traffic, receives 100% of traffic in an instant. This is a **cache stampede** — it has taken down production systems at Twitter, Reddit, and GitHub.

---

## 4. Level 3: Consistent Hashing

{: class="marginalia" }
The consistent hashing ring is one of the most elegant algorithms in distributed systems — adding a node to a 10-node cluster only moves ~10% of keys, not 90%. Invented by Karger *et al.* at MIT in 1997, it underpins virtually every distributed cache and DHT today.

Consistent hashing maps both **nodes** and **keys** onto a shared circular space — the *ring* — spanning from 0 to 2³²−1. A key is served by the first node you encounter travelling **clockwise** from the key's position.

**The magic property:** when you add or remove one node from an *N*-node cluster, only ~1/N of keys need to relocate. The rest stay put.

<div class="code-wrap">
<div class="code-lang">Python — consistent hashing ring core</div>
<pre class="code-block"><span class="kw">import</span> <span class="ty">hashlib</span>, <span class="ty">bisect</span>

<span class="kw">class</span> <span class="ty">ConsistentHashRing</span>:
    <span class="kw">def</span> <span class="nm">__init__</span>(self, vnodes_per_node<span class="op">=</span><span class="nu">150</span>):
        self.vnodes_per_node <span class="op">=</span> vnodes_per_node
        self.ring   <span class="op">=</span> {}         <span class="cm"># hash_pos → node_name</span>
        self.sorted_keys <span class="op">=</span> []    <span class="cm"># sorted list of hash positions</span>

    <span class="kw">def</span> <span class="nm">_hash</span>(self, key: <span class="ty">str</span>) <span class="op">-&gt;</span> <span class="ty">int</span>:
        <span class="kw">return</span> int(hashlib.md5(key.encode()).hexdigest(), <span class="nu">16</span>)

    <span class="kw">def</span> <span class="nm">add_node</span>(self, node: <span class="ty">str</span>):
        <span class="kw">for</span> i <span class="kw">in</span> range(self.vnodes_per_node):
            vkey  <span class="op">=</span> node <span class="op">+</span> <span class="st">"-vnode-"</span> <span class="op">+</span> str(i)
            h     <span class="op">=</span> self._hash(vkey)
            self.ring[h] <span class="op">=</span> node
            bisect.insort(self.sorted_keys, h)

    <span class="kw">def</span> <span class="nm">remove_node</span>(self, node: <span class="ty">str</span>):
        <span class="kw">for</span> i <span class="kw">in</span> range(self.vnodes_per_node):
            vkey <span class="op">=</span> node <span class="op">+</span> <span class="st">"-vnode-"</span> <span class="op">+</span> str(i)
            h    <span class="op">=</span> self._hash(vkey)
            <span class="kw">del</span> self.ring[h]
            self.sorted_keys.remove(h)

    <span class="kw">def</span> <span class="nm">get_node</span>(self, key: <span class="ty">str</span>) <span class="op">-&gt;</span> <span class="ty">str</span>:
        h   <span class="op">=</span> self._hash(key)
        idx <span class="op">=</span> bisect.bisect(self.sorted_keys, h) <span class="op">%</span> len(self.sorted_keys)
        <span class="kw">return</span> self.ring[self.sorted_keys[idx]]</pre>
</div>

**Virtual nodes** solve uneven distribution. Without them, three nodes at positions 30°, 32°, and 35° would leave a 320° arc unbalanced. Each physical node is represented by 100–200 *virtual* positions spread across the ring, making load distribution nearly uniform.

<div class="ibox">
<div class="ibox-title">Interactive — Consistent Hashing Ring</div>

<canvas id="ringCanvas" width="440" height="360"></canvas>

<div class="ring-controls">
  <input type="text" id="ringKey" class="ring-input" placeholder="Type a cache key…" />
  <button class="sim-btn" onclick="ringLookup()">Lookup Key</button>
</div>
<div class="ring-controls">
  <button class="sim-btn" id="btnAddD" onclick="ringAddD()">+ Add Node D</button>
  <button class="sim-btn danger" id="btnRemoveB" onclick="ringRemoveB()">&#8722; Remove Node B</button>
  <button class="sim-btn neutral" onclick="ringReset()">Reset</button>
  <label style="font-size:12px; color:rgba(255,255,255,.5); display:flex; align-items:center; gap:5px; cursor:pointer;">
    <input type="checkbox" id="vnodeCheck" onchange="ringDraw()" style="cursor:pointer;" />
    Virtual nodes (3×)
  </label>
</div>
<div class="ring-result" id="ringResult">&nbsp;</div>
</div>

---

## 5. Level 4: Eviction Policies

{: class="marginalia" }
LFU sounds better than LRU in theory — why evict something recently used when you could evict the least popular item? But LFU is harder to implement correctly: old-but-popular items accumulate high counts and become "immortal". Redis uses approximated LRU by default; LFU was only added in Redis 4.0.

When the cache is full and a new item must be inserted, which existing item gets evicted? Four common strategies:

| Policy | Evicts | Best for | Weakness |
|--------|--------|----------|----------|
| **LRU** — Least Recently Used | The item not accessed for the longest time | General-purpose workloads | Poor for scan-heavy workloads (one full table scan evicts your entire working set) |
| **LFU** — Least Frequently Used | The item accessed the fewest times | Hot-item workloads with a stable access pattern | Doesn't adapt quickly to changing access patterns |
| **FIFO** — First In, First Out | The oldest-inserted item | Streaming pipelines | Ignores access frequency entirely |
| **Random** | A random item | Simple caches, approximations | Unpredictable; occasionally evicts hot items |

<div class="ibox">
<div class="ibox-title">Interactive — Eviction Policy Comparison</div>

<p style="font-size:12px; color:rgba(255,255,255,.45); margin: 0 0 .8rem;">
  Click items to access them, then click <strong style="color:#fbef8a;">Add New Item</strong> to see which each policy evicts.
</p>

<div class="evict-grid" id="evictGrid"></div>

<div class="access-btns" id="accessBtns">
  <button class="sim-btn" onclick="evictAccess('A')">Access A</button>
  <button class="sim-btn" onclick="evictAccess('B')">Access B</button>
  <button class="sim-btn" onclick="evictAccess('C')">Access C</button>
  <button class="sim-btn" onclick="evictAccess('D')">Access D</button>
  <button class="sim-btn" onclick="evictAccess('E')">Access E</button>
  <button class="sim-btn warn" onclick="evictAddItem()">Add New Item</button>
  <button class="sim-btn neutral" onclick="evictReset()">Reset</button>
</div>
</div>

---

## 6. Level 5: Write Policies

Reads are the easy part. The difficult question is: **when the application writes new data, what happens to the cache?**

<table class="trade-table">
  <thead>
    <tr>
      <th>Policy</th>
      <th>Write path</th>
      <th>Consistency</th>
      <th>Perf</th>
      <th>Risk</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Write-through</td>
      <td>Write to cache AND DB in the same request (synchronous)</td>
      <td><span class="yes">Strong</span></td>
      <td><span class="part">Medium</span></td>
      <td>Latency added to every write</td>
    </tr>
    <tr>
      <td>Write-behind (write-back)</td>
      <td>Write to cache immediately; flush to DB asynchronously</td>
      <td><span class="no">Eventual</span></td>
      <td><span class="yes">Fast</span></td>
      <td>Data loss if cache node crashes before flush</td>
    </tr>
    <tr>
      <td>Write-around</td>
      <td>Write directly to DB, skip cache entirely</td>
      <td><span class="yes">Strong</span></td>
      <td><span class="part">Medium</span></td>
      <td>Cache miss on next read; cold-start penalty</td>
    </tr>
    <tr>
      <td>Cache-aside (lazy loading)</td>
      <td>Invalidate cache on write; populate on next cache miss</td>
      <td><span class="part">Near-strong</span></td>
      <td><span class="part">Medium</span></td>
      <td>Brief window of stale data; thundering herd on cold start</td>
    </tr>
  </tbody>
</table>

**For most production systems: write-through for critical user data, write-behind for analytics and counters.** The latency overhead of write-through (one extra network round-trip to the cache) is usually acceptable compared to the risk of data loss in write-behind.

<div class="code-wrap">
<div class="code-lang">Python — write-through pattern</div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">update_user_profile</span>(user_id: <span class="ty">str</span>, data: <span class="ty">dict</span>):
    <span class="cm"># 1. Write to DB first (source of truth)</span>
    db.execute(<span class="st">"UPDATE users SET ... WHERE id = %s"</span>, user_id)

    <span class="cm"># 2. Immediately update cache (synchronous — same request)</span>
    cache_key <span class="op">=</span> <span class="st">"user:"</span> <span class="op">+</span> user_id
    redis.setex(cache_key, <span class="nu">3600</span>, json.dumps(data))

    <span class="cm"># 3. Both DB and cache are now consistent</span>
    <span class="cm"># Next read hits cache; no stale data window</span></pre>
</div>

---

## 7. Level 6: Cache Invalidation

<div class="callout">
<strong>"There are only two hard things in Computer Science: cache invalidation and naming things."</strong><br/>
— Phil Karlton, Netscape, ~1996
</div>

Cache invalidation is hard because the cache and the database are two different systems that can diverge. Three main strategies:

**TTL-based (Time-To-Live)** — Every cache entry expires after N seconds. Simple, always eventually consistent. Drawback: stale data can exist for up to TTL seconds; setting TTL too short defeats the purpose of caching.

**Event-based** — DB changes trigger cache invalidation via events (DB triggers, CDC/Debezium, application-level pub/sub). Cache is updated in near real-time. Complex to implement; requires reliable event delivery — what if the invalidation event is lost?

**Version-based** — Embed a version token in the cache key: `user:42:v7`. When the object changes, increment the version. Old cache entries become unreachable (and eventually expire by TTL). Simple, correct, but leaves dead entries in memory until they TTL out.

<div class="code-wrap">
<div class="code-lang">Python — version-based key invalidation</div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">get_user</span>(user_id: <span class="ty">str</span>) <span class="op">-&gt;</span> <span class="ty">dict</span>:
    version  <span class="op">=</span> redis.get(<span class="st">"user:"</span> <span class="op">+</span> user_id <span class="op">+</span> <span class="st">":version"</span>) <span class="kw">or</span> <span class="st">"1"</span>
    cache_key <span class="op">=</span> <span class="st">"user:"</span> <span class="op">+</span> user_id <span class="op">+</span> <span class="st">":v"</span> <span class="op">+</span> version.decode()

    cached <span class="op">=</span> redis.get(cache_key)
    <span class="kw">if</span> cached:
        <span class="kw">return</span> json.loads(cached)

    <span class="cm"># cache miss — fetch from DB</span>
    user <span class="op">=</span> db.query(<span class="st">"SELECT * FROM users WHERE id = %s"</span>, user_id)
    redis.setex(cache_key, <span class="nu">3600</span>, json.dumps(user))
    <span class="kw">return</span> user

<span class="kw">def</span> <span class="nm">update_user</span>(user_id: <span class="ty">str</span>, data: <span class="ty">dict</span>):
    db.execute(<span class="st">"UPDATE users SET ... WHERE id = %s"</span>, user_id)
    <span class="cm"># increment version — old cache entry becomes unreachable immediately</span>
    redis.incr(<span class="st">"user:"</span> <span class="op">+</span> user_id <span class="op">+</span> <span class="st">":version"</span>)</pre>
</div>

---

## 8. Level 7: Cache Stampede Prevention

{: class="marginalia" }
Cache stampede is a real production incident waiting to happen. Every major site has been taken down by it at some point. When a popular item's TTL expires, 10,000 simultaneous requests hit the DB. The DB slows under load, slowing the cache-fill, which means more requests continue hitting the DB, causing further slowdown — a death spiral.

The **cache stampede** (also called *thundering herd* or *dog-pile effect*) happens when a popular cached item expires and many concurrent requests all experience a miss simultaneously, all querying the database at once.

**Three solutions, in order of elegance:**

**A — Mutex Lock:** The first request acquires a lock and regenerates the cache. All other requests wait.

<div class="code-wrap">
<div class="code-lang">Python — mutex lock pattern</div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">get_with_lock</span>(key: <span class="ty">str</span>) <span class="op">-&gt;</span> <span class="ty">str</span>:
    value <span class="op">=</span> redis.get(key)
    <span class="kw">if</span> value:
        <span class="kw">return</span> value

    lock_key <span class="op">=</span> key <span class="op">+</span> <span class="st">":lock"</span>
    <span class="cm"># NX = only set if Not eXists; EX = expire in 10s</span>
    acquired <span class="op">=</span> redis.set(lock_key, <span class="st">"1"</span>, nx<span class="op">=</span><span class="kw">True</span>, ex<span class="op">=</span><span class="nu">10</span>)

    <span class="kw">if</span> acquired:
        value <span class="op">=</span> expensive_db_query(key)
        redis.setex(key, <span class="nu">3600</span>, value)
        redis.delete(lock_key)
        <span class="kw">return</span> value
    <span class="kw">else</span>:
        <span class="cm"># another process is regenerating; return stale or wait briefly</span>
        time.sleep(<span class="nu">0.05</span>)
        <span class="kw">return</span> redis.get(key) <span class="kw">or</span> fallback(key)</pre>
</div>

**B — Early Recomputation:** Refresh the cache shortly *before* it expires. Set TTL to 1 hour, but trigger background recomputation when 50 minutes have elapsed.

**C — XFetch Algorithm (probabilistic early expiration):** A mathematically elegant solution from Facebook Research (2015). Each request independently decides — with increasing probability as expiry approaches — whether to recompute. No locks, no coordination.

<div class="code-wrap">
<div class="code-lang">Python — XFetch probabilistic early expiration</div>
<pre class="code-block"><span class="kw">import</span> <span class="ty">math</span>, <span class="ty">time</span>, <span class="ty">random</span>

<span class="kw">def</span> <span class="nm">xfetch_get</span>(key: <span class="ty">str</span>, beta: <span class="ty">float</span> <span class="op">=</span> <span class="nu">1.0</span>) <span class="op">-&gt;</span> <span class="ty">str</span>:
    <span class="cm">"""
    beta > 1.0 = eager recomputation (less stampede risk)
    beta = 1.0 = balanced (default)
    beta < 1.0 = lazy (more stampede risk)
    """</span>
    cached <span class="op">=</span> redis.hgetall(key)   <span class="cm"># stores: value, delta, expiry</span>

    <span class="kw">if</span> cached:
        value  <span class="op">=</span> cached[<span class="st">"value"</span>]
        delta  <span class="op">=</span> float(cached[<span class="st">"delta"</span>])   <span class="cm"># last recompute duration (seconds)</span>
        expiry <span class="op">=</span> float(cached[<span class="st">"expiry"</span>])   <span class="cm"># absolute unix expiry</span>

        <span class="cm"># XFetch decision: recompute if this inequality holds</span>
        now <span class="op">=</span> time.time()
        <span class="kw">if</span> now <span class="op">-</span> beta <span class="op">*</span> delta <span class="op">*</span> math.log(random.random()) <span class="op">&lt;</span> expiry:
            <span class="kw">return</span> value   <span class="cm"># still "fresh enough", serve it</span>

    <span class="cm"># recompute — this request wins the probabilistic race</span>
    t0    <span class="op">=</span> time.time()
    value <span class="op">=</span> expensive_db_query(key)
    delta <span class="op">=</span> time.time() <span class="op">-</span> t0
    ttl   <span class="op">=</span> <span class="nu">3600</span>

    redis.hset(key, mapping<span class="op">=</span>{
        <span class="st">"value"</span>:  value,
        <span class="st">"delta"</span>:  str(delta),
        <span class="st">"expiry"</span>: str(time.time() <span class="op">+</span> ttl),
    })
    redis.expire(key, ttl)
    <span class="kw">return</span> value</pre>
</div>

The insight behind XFetch: the probability of recomputing increases exponentially as the expiry approaches, weighted by how long recomputation takes (`delta`). A query that takes 2 seconds to recompute starts early-recomputing much sooner than a 10ms query.

---

## 9. Level 8: Two-Tier Cache (L1 + L2)

For ultra-high-throughput systems, even Redis at 0.3ms introduces too much network latency. The solution is a **two-tier hierarchy**:

<div class="arch-row">
  <div class="arch-box yellow">App Server<br/><small style="opacity:.6">JVM / Python process</small></div>
  <div class="arch-arr">→</div>
  <div class="arch-box accent">L1: In-process<br/><small style="opacity:.7">HashMap, ~100ns</small></div>
  <div class="arch-arr">→</div>
  <div class="arch-box accent">L2: Redis Cluster<br/><small style="opacity:.7">3 shards + replicas, ~0.3ms</small></div>
  <div class="arch-arr">→</div>
  <div class="arch-box">PostgreSQL<br/><small style="opacity:.6">Primary + read replicas</small></div>
</div>

| Tier | Size | Latency | Scope | Eviction |
|------|------|---------|-------|----------|
| L1 in-process | 100–500 MB | ~100 ns | Per-instance | LRU (Caffeine, Guava) |
| L2 Redis Cluster | 50–500 GB | ~0.3 ms | Shared across all instances | LRU or LFU |
| Database | Unlimited | 5–50 ms | Ground truth | N/A |

**The critical challenge with L1:** when data changes, you must invalidate L1 on all app server instances, not just the one handling the write. Solutions:

1. **Short TTL on L1** (5–30 seconds) — accept brief staleness, simple to implement
2. **Pub/Sub invalidation** — on write, publish an invalidation event to a Redis channel; all app servers subscribe and clear their local L1 entry
3. **Version-tagged keys** — L1 key includes a version number; stale entries are simply never hit

<div class="code-wrap">
<div class="code-lang">Python — two-tier cache with pub/sub invalidation</div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">TieredCache</span>:
    <span class="kw">def</span> <span class="nm">__init__</span>(self):
        self.l1     <span class="op">=</span> {}                    <span class="cm"># in-process dict (tiny, fast)</span>
        self.l1_ttl <span class="op">=</span> {}                    <span class="cm"># expiry timestamps</span>
        self.redis  <span class="op">=</span> RedisCluster(...)
        self.pubsub <span class="op">=</span> self.redis.pubsub()
        self.pubsub.subscribe(<span class="st">"cache:invalidate"</span>, self._on_invalidate)

    <span class="kw">def</span> <span class="nm">get</span>(self, key: <span class="ty">str</span>):
        <span class="cm"># L1 check (in-process, no network)</span>
        <span class="kw">if</span> key <span class="kw">in</span> self.l1 <span class="kw">and</span> time.time() <span class="op">&lt;</span> self.l1_ttl.get(key, <span class="nu">0</span>):
            <span class="kw">return</span> self.l1[key]

        <span class="cm"># L2 check (Redis, one network hop)</span>
        value <span class="op">=</span> self.redis.get(key)
        <span class="kw">if</span> value:
            self.l1[key]     <span class="op">=</span> value
            self.l1_ttl[key] <span class="op">=</span> time.time() <span class="op">+</span> <span class="nu">30</span>   <span class="cm"># 30s L1 TTL</span>
            <span class="kw">return</span> value

        <span class="cm"># DB fallback</span>
        value <span class="op">=</span> db.query(key)
        self.redis.setex(key, <span class="nu">3600</span>, value)
        self.l1[key]     <span class="op">=</span> value
        self.l1_ttl[key] <span class="op">=</span> time.time() <span class="op">+</span> <span class="nu">30</span>
        <span class="kw">return</span> value

    <span class="kw">def</span> <span class="nm">invalidate</span>(self, key: <span class="ty">str</span>):
        self.redis.delete(key)
        <span class="cm"># notify ALL app server instances to drop their L1 entry</span>
        self.redis.publish(<span class="st">"cache:invalidate"</span>, key)

    <span class="kw">def</span> <span class="nm">_on_invalidate</span>(self, msg):
        key <span class="op">=</span> msg[<span class="st">"data"</span>]
        self.l1.pop(key, <span class="kw">None</span>)
        self.l1_ttl.pop(key, <span class="kw">None</span>)</pre>
</div>

---

## 10. Interactive Cache Simulator

Try building your own cache. Type `GET key` or `SET key value` to interact. The simulator applies your chosen eviction policy when the cache is full.

<div class="ibox">
<div class="ibox-title">Interactive — Cache Simulator</div>

<div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center; margin-bottom:.8rem;">
  <label style="font-size:12px; color:rgba(255,255,255,.45);">
    Capacity:
    <select id="simCapacity" onchange="simReset()" style="margin-left:6px;">
      <option value="3">3 slots</option>
      <option value="4">4 slots</option>
      <option value="5" selected>5 slots</option>
      <option value="6">6 slots</option>
      <option value="8">8 slots</option>
    </select>
  </label>
  <label style="font-size:12px; color:rgba(255,255,255,.45);">
    Policy:
    <select id="simPolicy" onchange="simReset()" style="margin-left:6px;">
      <option value="lru">LRU — Least Recently Used</option>
      <option value="lfu">LFU — Least Frequently Used</option>
    </select>
  </label>
  <button class="sim-btn neutral" onclick="simReset()">Reset</button>
</div>

<div class="sim-cache-display" id="simDisplay"></div>

<div class="sim-input-row">
  <input type="text" id="simCmd" class="sim-cmd-input" placeholder="GET user:42  or  SET user:42 Alice" />
  <button class="sim-btn" onclick="simRun()">Run</button>
</div>
<div style="font-size:11px; color:rgba(255,255,255,.3); margin:.3rem 0 .5rem;">
  Quick: <button class="sim-btn neutral" style="padding:3px 8px;font-size:11px;" onclick="simQuick('GET user:1')">GET user:1</button>
  <button class="sim-btn neutral" style="padding:3px 8px;font-size:11px;" onclick="simQuick('SET user:1 Alice')">SET user:1</button>
  <button class="sim-btn neutral" style="padding:3px 8px;font-size:11px;" onclick="simQuick('SET user:2 Bob')">SET user:2</button>
  <button class="sim-btn neutral" style="padding:3px 8px;font-size:11px;" onclick="simQuick('SET user:3 Carol')">SET user:3</button>
  <button class="sim-btn neutral" style="padding:3px 8px;font-size:11px;" onclick="simQuick('GET user:1')">GET user:1</button>
</div>

<div class="sim-stats" id="simStats">
  <div class="sim-stat">Hits: <span id="simHits">0</span></div>
  <div class="sim-stat">Misses: <span id="simMisses">0</span></div>
  <div class="sim-stat">Hit rate: <span id="simRate">—</span></div>
</div>

<div class="sim-log" id="simLog"></div>
</div>

---

## 11. Capacity Planning

How much RAM does your distributed cache actually need? The formula:

<div class="code-wrap">
<div class="code-lang">Formula — cache RAM estimation</div>
<pre class="code-block">total_ram_bytes <span class="op">=</span> num_keys
                <span class="op">×</span> (avg_key_size <span class="op">+</span> avg_value_size <span class="op">+</span> overhead_per_entry)
                <span class="op">×</span> overhead_factor      <span class="cm">// Redis adds ~90 bytes/key overhead</span>
                <span class="op">×</span> replication_factor    <span class="cm">// each replica is a full copy</span>

<span class="cm">// Redis key overhead: ~90 bytes per key (dict entry + object header + expiry)
// Memcached: ~60 bytes per key
// overhead_factor ≈ 1.2–1.5 (memory fragmentation, hash table load factor)</span></pre>
</div>

<div class="ibox">
<div class="ibox-title">Interactive — Capacity Calculator</div>

<div class="calc-grid">
  <div class="calc-row">
    <label>Number of cached items</label>
    <input type="number" id="calcKeys" value="10000000" min="1" oninput="calcUpdate()" />
  </div>
  <div class="calc-row">
    <label>Average key size (bytes)</label>
    <input type="number" id="calcKeySize" value="40" min="1" oninput="calcUpdate()" />
  </div>
  <div class="calc-row">
    <label>Average value size (bytes)</label>
    <input type="number" id="calcValSize" value="512" min="1" oninput="calcUpdate()" />
  </div>
  <div class="calc-row">
    <label>Redis key overhead (bytes)</label>
    <input type="number" id="calcOverhead" value="90" min="0" oninput="calcUpdate()" />
  </div>
  <div class="calc-row">
    <label>Memory fragmentation factor</label>
    <input type="number" id="calcFrag" value="1.3" min="1" step="0.1" oninput="calcUpdate()" />
  </div>
  <div class="calc-row">
    <label>Replication factor</label>
    <input type="number" id="calcReplica" value="2" min="1" max="10" oninput="calcUpdate()" />
  </div>
</div>

<div class="calc-result" id="calcResult"></div>
</div>

---

## The Interview Answer

If asked "Design a distributed cache" in a system design interview, here is the progression that will impress:

1. **Clarify** — read-heavy or write-heavy? What consistency guarantees are needed? What's the hot-data size? Single-region or multi-region?

2. **Start simple** — in-process HashMap with LRU eviction. Acknowledge limitations immediately: not distributed, not fault-tolerant.

3. **Introduce sharding** — explain modulo hashing, then immediately explain why it breaks on node changes.

4. **Introduce consistent hashing** — walk through the ring, virtual nodes, and the ~1/N remapping property. This is the core concept.

5. **Eviction** — LRU for general-purpose, LFU for stable hot-item workloads. Mention Redis approximated LRU.

6. **Write policy** — write-through for consistency, write-behind for throughput. Explain the tradeoff.

7. **Stampede prevention** — mutex lock is obvious; XFetch is the impressive answer. Show you know about probabilistic early expiration.

8. **Two-tier** — mention L1 (in-process) + L2 (Redis Cluster) for latency-critical paths. Discuss invalidation.

9. **Capacity** — back-of-envelope: "10M objects × (40 + 512 + 90 bytes) × 1.3 fragmentation × 2 replicas ≈ **17 GB** of Redis RAM".

The candidate who walks through all nine levels — and explains *why* each escalation is needed — will stand out from the majority who jump straight to "use Redis".

---

<script>
/* ── Copy buttons ─────────────────────────────────────────────────── */
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   CONSISTENT HASHING RING
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  var nodes = ['A', 'B', 'C'];
  var hlKey  = null;   /* highlighted key angle (0-359) */
  var hlNode = null;   /* highlighted responsible node  */

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function nodeAngle(name) {
    return hashStr('ring-node-' + name + '-seed42') % 360;
  }

  function vnodeAngle(name, idx) {
    return hashStr('vring-' + name + '-' + idx + '-seed42') % 360;
  }

  function getPoints() {
    var useVnodes = document.getElementById('vnodeCheck').checked;
    var pts = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (useVnodes) {
        for (var v = 0; v < 3; v++) {
          pts.push({ name: n, angle: vnodeAngle(n, v), virt: true });
        }
      } else {
        pts.push({ name: n, angle: nodeAngle(n), virt: false });
      }
    }
    return pts.sort(function(a, b) { return a.angle - b.angle; });
  }

  function findResponsible(angle, pts) {
    if (!pts.length) return null;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].angle >= angle) return pts[i].name;
    }
    return pts[0].name; /* wrap-around */
  }

  function toXY(deg, cx, cy, r) {
    var rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  var NODE_COLORS = { A: '#fbef8a', B: '#7bcdab', C: '#bd93f9', D: '#f08080' };

  window.ringDraw = function() {
    var canvas = document.getElementById('ringCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var cx = W / 2, cy = H / 2, r = 150;
    ctx.clearRect(0, 0, W, H);

    /* ring */
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#2e2f35';
    ctx.lineWidth = 2;
    ctx.stroke();

    var pts = getPoints();

    /* arc highlight for looked-up key */
    if (hlKey !== null && pts.length) {
      var tNode = findResponsible(hlKey, pts);
      var tPt = null;
      for (var i = 0; i < pts.length; i++) {
        if (pts[i].angle >= hlKey) { tPt = pts[i]; break; }
      }
      if (!tPt) tPt = pts[0];
      if (tPt) {
        var col = NODE_COLORS[tPt.name] || '#aaa';
        ctx.beginPath();
        ctx.arc(cx, cy, r, (hlKey - 90) * Math.PI / 180, (tPt.angle - 90) * Math.PI / 180);
        ctx.strokeStyle = col;
        ctx.lineWidth = 5;
        ctx.globalAlpha = 0.45;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
      }
    }

    /* node markers */
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var pos = toXY(p.angle, cx, cy, r);
      var col = NODE_COLORS[p.name] || '#aaa';
      var isHL = (hlNode === p.name);
      var sz = p.virt ? 5 : 9;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = isHL ? col : col + '55';
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = isHL ? 2.5 : 1.5;
      ctx.stroke();
      if (!p.virt) {
        var lpos = toXY(p.angle, cx, cy, r + 22);
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.name, lpos.x, lpos.y);
      }
    }

    /* key marker */
    if (hlKey !== null) {
      var kpos = toXY(hlKey, cx, cy, r);
      ctx.beginPath();
      ctx.arc(kpos.x, kpos.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6666';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      var klpos = toXY(hlKey, cx, cy, r - 24);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#ff9999';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('key', klpos.x, klpos.y);
    }

    /* centre label */
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#3a3b42';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hash Ring (0\u2013360)', cx, cy);
  };

  window.ringLookup = function() {
    var k = document.getElementById('ringKey').value.trim();
    if (!k) return;
    var pts = getPoints();
    if (!pts.length) return;
    var angle = hashStr(k) % 360;
    hlKey  = angle;
    hlNode = findResponsible(angle, pts);
    ringDraw();
    var res = document.getElementById('ringResult');
    res.textContent = '"' + k + '" (pos:' + angle + '\u00b0) \u2192 Node ' + hlNode;
  };

  window.ringAddD = function() {
    if (nodes.indexOf('D') === -1) nodes.push('D');
    document.getElementById('btnAddD').disabled = true;
    hlKey = null; hlNode = null;
    ringDraw();
    document.getElementById('ringResult').textContent =
      'Node D added. Only ~' + Math.round(100 / nodes.length) + '% of keys remapped.';
  };

  window.ringRemoveB = function() {
    var idx = nodes.indexOf('B');
    if (idx !== -1) nodes.splice(idx, 1);
    document.getElementById('btnRemoveB').disabled = true;
    hlKey = null; hlNode = null;
    ringDraw();
    document.getElementById('ringResult').textContent =
      "Node B removed. Only B's arc migrated to next clockwise node.";
  };

  window.ringReset = function() {
    nodes = ['A', 'B', 'C'];
    hlKey = null; hlNode = null;
    document.getElementById('btnAddD').disabled = false;
    document.getElementById('btnRemoveB').disabled = false;
    document.getElementById('ringKey').value = '';
    document.getElementById('ringResult').textContent = '\u00a0';
    ringDraw();
  };

  document.getElementById('ringKey').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') ringLookup();
  });

  ringDraw();
})();


/* ═══════════════════════════════════════════════════════════════════
   EVICTION POLICY COMPARISON
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  var ITEMS = ['A', 'B', 'C', 'D', 'E'];
  var newItemCounter = 5;

  /* LRU state: array ordered most-recently-used last */
  var lruOrder = ['A', 'B', 'C', 'D', 'E'];

  /* LFU state: map of freq counts + insertion order */
  var lfuFreq  = { A: 1, B: 2, C: 3, D: 4, E: 5 };
  var lfuOrder = ['A', 'B', 'C', 'D', 'E'];   /* tie-break: oldest first */

  /* FIFO state: queue (front = oldest) */
  var fifoQueue = ['A', 'B', 'C', 'D', 'E'];

  /* Random state */
  var randItems = ['A', 'B', 'C', 'D', 'E'];

  var lastEvictions = { lru: null, lfu: null, fifo: null, rand: null };

  function renderAll() {
    var grid = document.getElementById('evictGrid');
    if (!grid) return;

    var policies = [
      { id: 'lru',  label: 'LRU', items: lruOrder,   note: lruNote() },
      { id: 'lfu',  label: 'LFU', items: lfuOrder,   note: lfuNote() },
      { id: 'fifo', label: 'FIFO', items: fifoQueue, note: 'First-in will be evicted next' },
      { id: 'rand', label: 'Random', items: randItems, note: 'Any item equally likely' },
    ];

    grid.innerHTML = '';
    for (var i = 0; i < policies.length; i++) {
      var p = policies[i];
      var col = document.createElement('div');
      col.className = 'evict-col';
      var h4 = document.createElement('h4');
      h4.textContent = p.label;
      col.appendChild(h4);

      var slots = document.createElement('div');
      slots.className = 'evict-slots';

      for (var j = 0; j < p.items.length; j++) {
        var item = p.items[j];
        var slot = document.createElement('div');
        slot.className = 'evict-slot';
        var evictedItem = lastEvictions[p.id];
        if (item === evictedItem) {
          /* this is the slot that just got replaced — show new item */
        }
        /* highlight most-recently-used (last in lruOrder / most-freq) */
        if (p.id === 'lru' && j === p.items.length - 1) slot.classList.add('recent');
        if (p.id === 'fifo' && j === 0) {
          slot.style.borderColor = 'rgba(240,128,128,.4)';
          slot.style.color = 'rgba(240,128,128,.6)';
        }
        slot.textContent = item;
        /* show freq for LFU */
        if (p.id === 'lfu') {
          slot.textContent = item + ' (' + lfuFreq[item] + ')';
          if (lfuFreq[item] === Math.min.apply(null, Object.keys(lfuFreq).map(function(k) { return lfuFreq[k]; }))) {
            slot.style.borderColor = 'rgba(240,128,128,.4)';
            slot.style.color = 'rgba(240,128,128,.65)';
          } else if (lfuFreq[item] === Math.max.apply(null, Object.keys(lfuFreq).map(function(k) { return lfuFreq[k]; }))) {
            slot.classList.add('recent');
          }
        }
        slots.appendChild(slot);
      }
      col.appendChild(slots);

      var note = document.createElement('div');
      note.className = 'evict-note';
      note.textContent = p.note;
      col.appendChild(note);

      grid.appendChild(col);
    }
  }

  function lruNote() {
    return 'Next evict: ' + lruOrder[0] + ' (least recent)';
  }

  function lfuNote() {
    var minFreq = Math.min.apply(null, Object.keys(lfuFreq).map(function(k) { return lfuFreq[k]; }));
    var victim = null;
    for (var i = 0; i < lfuOrder.length; i++) {
      if (lfuFreq[lfuOrder[i]] === minFreq) { victim = lfuOrder[i]; break; }
    }
    return 'Next evict: ' + victim + ' (freq=' + minFreq + ')';
  }

  window.evictAccess = function(item) {
    /* LRU: move to back */
    var idx = lruOrder.indexOf(item);
    if (idx !== -1) { lruOrder.splice(idx, 1); lruOrder.push(item); }

    /* LFU: increment frequency */
    if (lfuFreq[item] !== undefined) lfuFreq[item]++;

    /* FIFO: no change on access */

    /* Random: no change */

    lastEvictions = { lru: null, lfu: null, fifo: null, rand: null };
    renderAll();
  };

  window.evictAddItem = function() {
    newItemCounter++;
    var newItem = 'F' + (newItemCounter - 5);

    /* LRU: evict front (least recent), append new */
    var lruVictim = lruOrder[0];
    lruOrder.shift(); lruOrder.push(newItem);
    lastEvictions.lru = lruVictim;

    /* LFU: evict min-freq (oldest insertion as tie-break) */
    var minFreq = Math.min.apply(null, Object.keys(lfuFreq).map(function(k) { return lfuFreq[k]; }));
    var lfuVictim = null;
    for (var i = 0; i < lfuOrder.length; i++) {
      if (lfuFreq[lfuOrder[i]] === minFreq) { lfuVictim = lfuOrder[i]; break; }
    }
    lfuOrder.splice(lfuOrder.indexOf(lfuVictim), 1);
    lfuOrder.push(newItem);
    delete lfuFreq[lfuVictim];
    lfuFreq[newItem] = 1;
    lastEvictions.lfu = lfuVictim;

    /* FIFO: evict front */
    var fifoVictim = fifoQueue[0];
    fifoQueue.shift(); fifoQueue.push(newItem);
    lastEvictions.fifo = fifoVictim;

    /* Random */
    var randIdx = Math.floor(Math.random() * randItems.length);
    var randVictim = randItems[randIdx];
    randItems.splice(randIdx, 1, newItem);
    lastEvictions.rand = randVictim;

    renderAll();

    /* flash evicted slots red briefly */
    var slots = document.querySelectorAll('.evict-slot');
    slots.forEach(function(sl) {
      if (sl.textContent.indexOf(newItem) !== -1) {
        sl.classList.add('added');
        setTimeout(function() { sl.classList.remove('added'); }, 800);
      }
    });
  };

  window.evictReset = function() {
    newItemCounter = 5;
    lruOrder  = ['A', 'B', 'C', 'D', 'E'];
    lfuFreq   = { A: 1, B: 2, C: 3, D: 4, E: 5 };
    lfuOrder  = ['A', 'B', 'C', 'D', 'E'];
    fifoQueue = ['A', 'B', 'C', 'D', 'E'];
    randItems = ['A', 'B', 'C', 'D', 'E'];
    lastEvictions = { lru: null, lfu: null, fifo: null, rand: null };
    renderAll();
  };

  renderAll();
})();


/* ═══════════════════════════════════════════════════════════════════
   CACHE SIMULATOR (LRU / LFU)
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  /* cache state: array of {key, value, freq, order} */
  var simCache = [];
  var simHits = 0, simMisses = 0, simOpCounter = 0;

  function simCapacity() {
    return parseInt(document.getElementById('simCapacity').value, 10);
  }
  function simPolicy() {
    return document.getElementById('simPolicy').value;
  }

  function simFindKey(key) {
    for (var i = 0; i < simCache.length; i++) {
      if (simCache[i].key === key) return i;
    }
    return -1;
  }

  function simEvict() {
    if (!simCache.length) return;
    var policy = simPolicy();
    var victim = 0;
    if (policy === 'lru') {
      /* evict smallest order value */
      for (var i = 1; i < simCache.length; i++) {
        if (simCache[i].order < simCache[victim].order) victim = i;
      }
    } else {
      /* LFU: evict smallest freq, then smallest order as tie-break */
      for (var i = 1; i < simCache.length; i++) {
        if (simCache[i].freq < simCache[victim].freq ||
           (simCache[i].freq === simCache[victim].freq && simCache[i].order < simCache[victim].order)) {
          victim = i;
        }
      }
    }
    var evicted = simCache[victim].key;
    simCache.splice(victim, 1);
    return evicted;
  }

  function simGet(key) {
    simOpCounter++;
    var idx = simFindKey(key);
    if (idx !== -1) {
      simCache[idx].order = simOpCounter;
      simCache[idx].freq++;
      simHits++;
      simLog('HIT  GET ' + key + ' = "' + simCache[idx].value + '"', 'hit-line');
      simRender(key, true);
      return;
    }
    simMisses++;
    simLog('MISS GET ' + key + ' (not in cache)', 'miss-line');
    simRender(key, false);
  }

  function simSet(key, value) {
    simOpCounter++;
    var idx = simFindKey(key);
    if (idx !== -1) {
      simCache[idx].value = value;
      simCache[idx].order = simOpCounter;
      simCache[idx].freq++;
      simLog('SET  ' + key + ' = "' + value + '" (updated)', 'set-line');
    } else {
      var cap = simCapacity();
      var evicted = null;
      if (simCache.length >= cap) {
        evicted = simEvict();
      }
      simCache.push({ key: key, value: value, freq: 1, order: simOpCounter });
      var msg = 'SET  ' + key + ' = "' + value + '"';
      if (evicted) msg += ' (evicted: ' + evicted + ')';
      simLog(msg, 'set-line');
    }
    simRender(null, null);
  }

  function simRender(flashKey, isHit) {
    var display = document.getElementById('simDisplay');
    if (!display) return;
    var cap = simCapacity();
    display.innerHTML = '';

    /* filled slots */
    for (var i = 0; i < simCache.length; i++) {
      var e = simCache[i];
      var slot = document.createElement('div');
      slot.className = 'sim-cache-slot';
      slot.textContent = e.key + ': ' + e.value;
      if (flashKey === e.key) {
        slot.classList.add(isHit ? 'hit' : 'miss');
        (function(s) {
          setTimeout(function() { s.classList.remove('hit', 'miss'); }, 600);
        })(slot);
      }
      display.appendChild(slot);
    }

    /* empty slots */
    for (var j = simCache.length; j < cap; j++) {
      var empty = document.createElement('div');
      empty.className = 'sim-cache-slot empty';
      empty.textContent = 'empty';
      display.appendChild(empty);
    }

    /* stats */
    document.getElementById('simHits').textContent   = simHits;
    document.getElementById('simMisses').textContent = simMisses;
    var total = simHits + simMisses;
    document.getElementById('simRate').textContent =
      total ? Math.round(100 * simHits / total) + '%' : '\u2014';
  }

  function simLog(msg, cls) {
    var log = document.getElementById('simLog');
    if (!log) return;
    var line = document.createElement('div');
    line.className = cls || 'info-line';
    line.textContent = '> ' + msg;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  window.simRun = function() {
    var input = document.getElementById('simCmd');
    var raw = input.value.trim();
    if (!raw) return;
    input.value = '';
    var parts = raw.split(/\s+/);
    var cmd = parts[0].toUpperCase();
    if (cmd === 'GET' && parts.length >= 2) {
      simGet(parts[1]);
    } else if (cmd === 'SET' && parts.length >= 3) {
      simSet(parts[1], parts.slice(2).join(' '));
    } else {
      simLog('Unknown command. Use: GET key  or  SET key value', 'info-line');
    }
  };

  window.simQuick = function(cmd) {
    document.getElementById('simCmd').value = cmd;
    simRun();
  };

  window.simReset = function() {
    simCache = []; simHits = 0; simMisses = 0; simOpCounter = 0;
    var log = document.getElementById('simLog');
    if (log) log.innerHTML = '';
    document.getElementById('simHits').textContent   = '0';
    document.getElementById('simMisses').textContent = '0';
    document.getElementById('simRate').textContent   = '\u2014';
    simRender(null, null);
    var info = document.createElement('div');
    info.className = 'info-line';
    info.textContent = '> Cache reset. Capacity: ' + simCapacity() + ', Policy: ' + simPolicy().toUpperCase();
    if (log) log.appendChild(info);
  };

  document.getElementById('simCmd').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') simRun();
  });

  simReset();
})();


/* ═══════════════════════════════════════════════════════════════════
   CAPACITY CALCULATOR
   ═══════════════════════════════════════════════════════════════════ */
function calcUpdate() {
  var keys      = parseFloat(document.getElementById('calcKeys').value)     || 0;
  var keySize   = parseFloat(document.getElementById('calcKeySize').value)  || 0;
  var valSize   = parseFloat(document.getElementById('calcValSize').value)  || 0;
  var overhead  = parseFloat(document.getElementById('calcOverhead').value) || 0;
  var frag      = parseFloat(document.getElementById('calcFrag').value)     || 1;
  var replicas  = parseFloat(document.getElementById('calcReplica').value)  || 1;

  var perEntry    = keySize + valSize + overhead;
  var rawBytes    = keys * perEntry;
  var withFrag    = rawBytes * frag;
  var withReplica = withFrag * replicas;

  function fmt(bytes) {
    if (bytes >= 1e12) return (bytes / 1e12).toFixed(2) + ' TB';
    if (bytes >= 1e9)  return (bytes / 1e9).toFixed(2)  + ' GB';
    if (bytes >= 1e6)  return (bytes / 1e6).toFixed(2)  + ' MB';
    return (bytes / 1e3).toFixed(1) + ' KB';
  }

  function fmtN(n) {
    if (n >= 1e9)  return (n / 1e9).toFixed(1)  + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'M';
    if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
    return n.toString();
  }

  var nodesNeeded = Math.ceil(withFrag / (8 * 1024 * 1024 * 1024)); /* assuming 8 GB RAM per node */

  var result = document.getElementById('calcResult');
  result.innerHTML =
    '<div class="calc-result-row"><span class="label">Bytes per entry</span><span class="value">' + perEntry.toFixed(0) + ' B</span></div>' +
    '<div class="calc-result-row"><span class="label">Raw cache data (' + fmtN(keys) + ' keys)</span><span class="value">' + fmt(rawBytes) + '</span></div>' +
    '<div class="calc-result-row"><span class="label">With fragmentation (' + frag + 'x)</span><span class="value">' + fmt(withFrag) + '</span></div>' +
    '<div class="calc-result-row total"><span class="label">Total RAM (x' + replicas + ' replicas)</span><span class="value">' + fmt(withReplica) + '</span></div>' +
    '<div class="calc-result-row"><span class="label">Estimated Redis nodes (8 GB each)</span><span class="value">' + nodesNeeded + ' nodes</span></div>';
}

calcUpdate();
</script>
