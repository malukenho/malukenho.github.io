---
layout: post
title: "System Design: Key-Value Store — From HashMap to Dynamo-Style Distributed DB"
date: 2026-04-23 10:00:00 +0000
categories: ["post"]
tags: [system-design, key-value, dynamo, consistent-hashing, cap-theorem, interview]
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design Interview Prep &mdash; #9 of 15
</div>

{: class="marginalia" }
The Amazon Dynamo paper<br/>(2007) is one of the most<br/>influential papers in<br/>distributed systems — it<br/>introduced consistent<br/>hashing + vector clocks<br/>+ quorum reads/writes<br/>as a practical package.

A key-value store is the simplest possible database interface: `get(key)`, `put(key, value)`, `delete(key)`. Yet making one that's distributed, fault-tolerant, and consistent is one of the hardest problems in computer science. This post walks the full journey — from a single-machine HashMap to a Dynamo-style ring that handles petabytes, partial failures, and concurrent writes.

**The question:** *Design a distributed key-value store like Amazon DynamoDB or Apache Cassandra. Support GET/PUT/DELETE, handle node failures, maintain consistency, scale to petabytes.*

---

<style>
/* ── Base ─────────────────────────────────────────────────── */
.series-badge {
  display: inline-flex; align-items: center; gap: .5rem;
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 20px;
  padding: 5px 14px; font-size: .75rem; color: rgba(255,255,255,.55);
  margin-bottom: 1.5rem;
}
.series-badge strong { color: #fbef8a; }

/* ── Marginalia ──────────────────────────────────────────── */
.marginalia {
  float: right; clear: right;
  width: 190px; margin: 0 0 1.2rem 1.4rem;
  padding: .7rem .9rem;
  border-left: 2px solid rgba(123,205,171,.4);
  font-size: 11.5px; line-height: 1.6;
  color: rgba(255,255,255,.45); font-style: italic;
  background: rgba(123,205,171,.04); border-radius: 0 6px 6px 0;
}

/* ── Code blocks ─────────────────────────────────────────── */
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

/* ── Section headings ────────────────────────────────────── */
.kv-h2 {
  font-size: 1.25rem; font-weight: 700; color: #fbef8a;
  margin: 2.4rem 0 .8rem; border-bottom: 1px solid #2e2f35; padding-bottom: .4rem;
}
.kv-h3 {
  font-size: 1.05rem; font-weight: 600; color: #7bcdab;
  margin: 1.6rem 0 .6rem;
}

/* ── Info / warning callouts ─────────────────────────────── */
.callout {
  border-left: 3px solid #7bcdab; background: rgba(123,205,171,.06);
  border-radius: 0 8px 8px 0; padding: .8rem 1rem; margin: 1rem 0;
  font-size: 13.5px; color: rgba(255,255,255,.75); line-height: 1.6;
}
.callout.warn { border-color: #fbef8a; background: rgba(251,239,138,.05); }
.callout strong { color: #7bcdab; }
.callout.warn strong { color: #fbef8a; }

/* ── Diagram box ─────────────────────────────────────────── */
.diagram {
  background: #111214; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.4rem 1.6rem; margin: 1.2rem 0; font-family: "JetBrains Mono","Fira Code",monospace;
  font-size: 12.5px; line-height: 1.7; color: rgba(255,255,255,.7);
  overflow-x: auto; white-space: pre;
}

/* ── Interactive container ───────────────────────────────── */
.interactive-box {
  background: #111214; border: 1px solid #2e2f35; border-radius: 12px;
  padding: 1.4rem 1.6rem; margin: 1.4rem 0;
}
.interactive-box h4 {
  margin: 0 0 1rem; color: #fbef8a; font-size: .9rem;
  letter-spacing: .05em; text-transform: uppercase;
}

/* ── Comparison table ────────────────────────────────────── */
.cmp-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 1rem 0 1.6rem;
}
.cmp-table th {
  text-align: left; padding: 9px 14px; color: rgba(255,255,255,.45);
  font-weight: 600; font-size: 11px; text-transform: uppercase;
  letter-spacing: .07em; border-bottom: 1px solid #2e2f35;
  background: #1c1d22;
}
.cmp-table td {
  padding: 8px 14px; border-bottom: 1px solid #1c1d22;
  color: rgba(255,255,255,.78); vertical-align: middle;
}
.cmp-table tr:last-child td { border-bottom: none; }
.cmp-table tr:hover td { background: rgba(255,255,255,.025); }
.tag-pill {
  display: inline-block; padding: 2px 8px; border-radius: 20px;
  font-size: 11px; font-weight: 600; margin: 1px 2px;
}
.tag-ap  { background: rgba(123,205,171,.15); color: #7bcdab; border: 1px solid rgba(123,205,171,.3); }
.tag-cp  { background: rgba(251,239,138,.12); color: #fbef8a; border: 1px solid rgba(251,239,138,.3); }
.tag-opt { background: rgba(255,255,255,.07); color: rgba(255,255,255,.55); border: 1px solid #2e2f35; }

/* ── Sim buttons ─────────────────────────────────────────── */
.sim-btn {
  padding: 7px 16px; border-radius: 7px; border: 1px solid #7bcdab;
  background: #152319; color: #7bcdab; cursor: pointer;
  font-family: inherit; font-size: 13px; transition: all .2s; margin: 3px 2px;
}
.sim-btn:hover { background: rgba(123,205,171,.18); }
.sim-btn.danger { border-color: #f08080; background: #1f1515; color: #f08080; }
.sim-btn.danger:hover { background: rgba(240,128,128,.15); }

/* ── Slider row ──────────────────────────────────────────── */
.slider-row {
  display: flex; align-items: center; gap: .8rem; margin: .5rem 0;
  font-size: 13px; color: rgba(255,255,255,.75);
}
.slider-row label { width: 30px; color: #fbef8a; font-weight: 700; }
.slider-row input[type=range] { flex: 1; accent-color: #7bcdab; }
.slider-row .val {
  min-width: 28px; text-align: right; font-weight: 700; color: #7bcdab;
}

/* ── Status badge ────────────────────────────────────────── */
.status-badge {
  display: inline-flex; align-items: center; gap: .35rem;
  padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;
  margin: 2px 3px;
}
.status-ok   { background: rgba(123,205,171,.15); color: #7bcdab; border: 1px solid rgba(123,205,171,.3); }
.status-warn { background: rgba(251,239,138,.12); color: #fbef8a; border: 1px solid rgba(251,239,138,.3); }
.status-err  { background: rgba(240,128,128,.12); color: #f08080; border: 1px solid rgba(240,128,128,.3); }

/* ── Gossip nodes ────────────────────────────────────────── */
.gossip-canvas { display: block; margin: 0 auto; cursor: pointer; }
.gossip-legend { display: flex; gap: 1.2rem; justify-content: center; font-size: 12px; margin-top: .6rem; }
.gossip-legend span { display: flex; align-items: center; gap: .35rem; color: rgba(255,255,255,.6); }
.gossip-legend i { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.g-healthy { background: #7bcdab; }
.g-suspect { background: #fbef8a; }
.g-dead    { background: #f08080; }

/* ── Architecture diagram ────────────────────────────────── */
.arch-canvas { display: block; margin: 0 auto; }
</style>

---

## 1. The Problem

The key-value interface is brutally simple:

<div class="code-wrap">
<div class="code-lang">interface<span></span></div>
<pre class="code-block"><span class="kw">interface</span> <span class="ty">KeyValueStore</span> {
  <span class="nm">get</span>(<span class="nm">key</span>: <span class="ty">string</span>): <span class="ty">Value</span> | <span class="kw">null</span>;
  <span class="nm">put</span>(<span class="nm">key</span>: <span class="ty">string</span>, <span class="nm">value</span>: <span class="ty">Value</span>): <span class="kw">void</span>;
  <span class="nm">delete</span>(<span class="nm">key</span>: <span class="ty">string</span>): <span class="kw">void</span>;
}</pre>
</div>

Yet to make this distributed, fault-tolerant, and consistent at petabyte scale you must solve:

- **Partitioning** — how to split data across hundreds of nodes
- **Replication** — how many copies, and where
- **Consistency** — what happens when replicas disagree
- **Failure detection** — how nodes know when peers are dead
- **Recovery** — how to heal after partitions

We'll build up layer by layer, explaining *why* each decision exists before showing *how* it works.

---

## 2. Level 1 — In-Memory HashMap

The simplest implementation: a hash map in memory.

<div class="code-wrap">
<div class="code-lang">java<span></span></div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">SimpleKVStore</span> {
    <span class="kw">private final</span> <span class="ty">Map</span>&lt;<span class="ty">String</span>, <span class="ty">byte[]</span>&gt; <span class="nm">store</span> = <span class="kw">new</span> <span class="ty">HashMap</span>&lt;&gt;();

    <span class="kw">public</span> <span class="ty">byte[]</span> <span class="nm">get</span>(<span class="ty">String</span> <span class="nm">key</span>) {
        <span class="kw">return</span> <span class="nm">store</span>.<span class="nm">get</span>(<span class="nm">key</span>);   <span class="cm">// O(1)</span>
    }

    <span class="kw">public void</span> <span class="nm">put</span>(<span class="ty">String</span> <span class="nm">key</span>, <span class="ty">byte[]</span> <span class="nm">value</span>) {
        <span class="nm">store</span>.<span class="nm">put</span>(<span class="nm">key</span>, <span class="nm">value</span>);   <span class="cm">// O(1)</span>
    }

    <span class="kw">public void</span> <span class="nm">delete</span>(<span class="ty">String</span> <span class="nm">key</span>) {
        <span class="nm">store</span>.<span class="nm">remove</span>(<span class="nm">key</span>);      <span class="cm">// O(1)</span>
    }
}</pre>
</div>

**Problems:**
- **No persistence** — process crash loses all data
- **Single machine** — bound by one machine's RAM
- **No fault tolerance** — one machine going down means 100% downtime

### Adding a Write-Ahead Log (WAL)

Before any mutation, append it to a log file. On startup, replay the log to rebuild state.

<div class="code-wrap">
<div class="code-lang">java<span></span></div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">WALKVStore</span> {
    <span class="kw">private final</span> <span class="ty">Map</span>&lt;<span class="ty">String</span>, <span class="ty">byte[]</span>&gt; <span class="nm">store</span> = <span class="kw">new</span> <span class="ty">HashMap</span>&lt;&gt;();
    <span class="kw">private final</span> <span class="ty">FileWriter</span> <span class="nm">wal</span>;

    <span class="kw">public void</span> <span class="nm">put</span>(<span class="ty">String</span> <span class="nm">key</span>, <span class="ty">byte[]</span> <span class="nm">value</span>) <span class="kw">throws</span> <span class="ty">IOException</span> {
        <span class="cm">// 1. Write to WAL first (crash-safe)</span>
        <span class="nm">wal</span>.<span class="nm">write</span>(<span class="st">"PUT,"</span> + <span class="nm">key</span> + <span class="st">","</span> + <span class="ty">Base64</span>.<span class="nm">encode</span>(<span class="nm">value</span>) + <span class="st">"\n"</span>);
        <span class="nm">wal</span>.<span class="nm">flush</span>(); <span class="cm">// fsync for durability</span>
        <span class="cm">// 2. Apply to in-memory map</span>
        <span class="nm">store</span>.<span class="nm">put</span>(<span class="nm">key</span>, <span class="nm">value</span>);
    }

    <span class="kw">public void</span> <span class="nm">recover</span>() <span class="kw">throws</span> <span class="ty">IOException</span> {
        <span class="cm">// Replay WAL on restart</span>
        <span class="kw">for</span> (<span class="ty">String</span> <span class="nm">line</span> : <span class="ty">Files</span>.<span class="nm">readAllLines</span>(<span class="nm">walPath</span>)) {
            <span class="ty">String[]</span> <span class="nm">parts</span> = <span class="nm">line</span>.<span class="nm">split</span>(<span class="st">","</span>);
            <span class="kw">if</span> (<span class="nm">parts</span>[<span class="nu">0</span>].<span class="nm">equals</span>(<span class="st">"PUT"</span>))
                <span class="nm">store</span>.<span class="nm">put</span>(<span class="nm">parts</span>[<span class="nu">1</span>], <span class="ty">Base64</span>.<span class="nm">decode</span>(<span class="nm">parts</span>[<span class="nu">2</span>]));
            <span class="kw">else if</span> (<span class="nm">parts</span>[<span class="nu">0</span>].<span class="nm">equals</span>(<span class="st">"DEL"</span>))
                <span class="nm">store</span>.<span class="nm">remove</span>(<span class="nm">parts</span>[<span class="nu">1</span>]);
        }
    }
}</pre>
</div>

The WAL solves durability. But the data is still on one machine. We need to scale.

---

## 3. Level 2 — Single-Node with Persistence (LSM Tree)

{: class="marginalia" }
LSM trees are write-optimized<br/>by design: every write is a<br/>sequential append. Random<br/>writes are the nemesis of<br/>spinning disks, and LSM<br/>eliminates them entirely.

Random disk writes (updating a B-Tree in place) are the bottleneck for write-heavy workloads. The **Log-Structured Merge Tree (LSM Tree)** turns all writes into sequential appends:

**Write path:**
1. Write goes to in-memory **MemTable** (a sorted balanced BST, e.g. Red-Black tree)
2. When MemTable exceeds threshold (~64 MB), flush to an immutable **SSTable** file on disk
3. Background **compaction** merges SSTables, removing old versions and tombstones

**Read path:**
1. Check MemTable (newest data first)
2. Check SSTables from newest to oldest (aided by Bloom filters to skip non-existent keys)

<div class="diagram">  Write Path:
  ─────────────────────────────────────────────────────────────
  Client PUT(k, v)
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  WAL (append-only, for crash recovery)       │
  └─────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  MemTable (sorted in memory, ~64 MB cap)     │  ◄── fast O(log n)
  └──────────────────┬──────────────────────────┘
                     │ flush when full
                     ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ SSTable₀ │  │ SSTable₁ │  │ SSTable₂ │  ◄── immutable, sorted
  └──────────┘  └──────────┘  └──────────┘
       │              │             │
       └──────────────┴─────────────┘
                      │ compaction (background)
                      ▼
              ┌──────────────┐
              │  SSTable_new │  ◄── merged, deduped, tombstones removed
              └──────────────┘

  Used by: RocksDB, LevelDB, Cassandra, HBase, ScyllaDB</div>

<div class="callout">
<strong>Bloom filters</strong> are probabilistic data structures that answer "is this key definitely NOT in this SSTable?" in O(1). They eliminate most disk reads for missing keys — critical when you have dozens of SSTable files.
</div>

---

## 4. Level 3 — CAP Theorem

Before distributing, we need the fundamental theorem of distributed systems.

<div class="callout warn">
<strong>CAP Theorem:</strong> A distributed system can guarantee at most two of: Consistency, Availability, and Partition Tolerance. In practice, network partitions <em>will</em> happen — so you're really choosing between C and A.
</div>

- **Consistency (C):** Every read receives the most recent write
- **Availability (A):** Every request receives a response (not necessarily the most recent)
- **Partition Tolerance (P):** The system continues operating despite network partitions

<div class="interactive-box">
  <h4>&#9651; CAP Triangle — Click a system to explore</h4>
  <canvas id="capCanvas" width="520" height="320" style="display:block;margin:0 auto;cursor:pointer;max-width:100%;"></canvas>
  <div id="capInfo" style="margin-top:.9rem;padding:.8rem 1rem;border-radius:8px;background:#1a1b20;border:1px solid #2e2f35;font-size:13px;color:rgba(255,255,255,.75);min-height:56px;line-height:1.6;">
    Click a system label to learn where it sits on the CAP triangle.
  </div>
</div>

<script>
(function() {
  var canvas = document.getElementById('capCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var vC = { x: W/2, y: 28 };       // Consistency (top)
  var vA = { x: 40,  y: H - 32 };   // Availability (bottom-left)
  var vP = { x: W - 40, y: H - 32 }; // Partition (bottom-right)

  var midCA = { x: (vC.x+vA.x)/2, y: (vC.y+vA.y)/2 };
  var midCP = { x: (vC.x+vP.x)/2, y: (vC.y+vP.y)/2 };
  var midAP = { x: (vA.x+vP.x)/2, y: (vA.y+vP.y)/2 };

  var systems = [
    { id:'mysql',    label:'MySQL',      region:'CA', x: midCA.x - 28, y: midCA.y + 10,
      desc:'<strong style="color:#fbef8a">CA — Traditional SQL (MySQL, PostgreSQL):</strong> Consistent and available on a single node, but cannot tolerate network partitions. In practice, all databases must handle partitions somehow — "CA" means they sacrifice availability when a partition occurs.' },
    { id:'pg',       label:'PostgreSQL', region:'CA', x: midCA.x - 32, y: midCA.y + 28,
      desc:'<strong style="color:#fbef8a">CA — PostgreSQL:</strong> Like MySQL, PostgreSQL is consistent and highly available on a single node or synchronous replica setup. It opts to reject writes during a partition rather than risk inconsistency.' },
    { id:'hbase',    label:'HBase',      region:'CP', x: midCP.x + 10, y: midCP.y + 8,
      desc:'<strong style="color:#7bcdab">CP — HBase / ZooKeeper:</strong> Consistent and partition-tolerant. During a partition, HBase may refuse reads/writes to ensure no stale data is returned. ZooKeeper uses a quorum — if majority nodes are unavailable, it stops serving.' },
    { id:'zoo',      label:'ZooKeeper',  region:'CP', x: midCP.x + 8,  y: midCP.y + 26,
      desc:'<strong style="color:#7bcdab">CP — ZooKeeper:</strong> Uses Zab consensus protocol. Requires a quorum (majority) to proceed. Will reject requests rather than serve potentially stale data. Ideal for distributed coordination, leader election, config management.' },
    { id:'cassandra',label:'Cassandra',  region:'AP', x: midAP.x - 44, y: midAP.y - 18,
      desc:'<strong style="color:#7bcdab">AP — Cassandra / CouchDB:</strong> Always available and partition-tolerant. During a partition, nodes may return stale data (eventual consistency). Cassandra lets you tune consistency per-operation with quorum settings.' },
    { id:'dynamo',   label:'DynamoDB',   region:'AP', x: midAP.x - 44, y: midAP.y,
      desc:'<strong style="color:#7bcdab">AP — DynamoDB:</strong> Amazon\'s managed key-value store. Defaults to eventual consistency for maximum availability. Offers "strongly consistent reads" as an option at higher latency cost. Designed around the original Dynamo paper.' },
    { id:'couch',    label:'CouchDB',    region:'AP', x: midAP.x - 40, y: midAP.y + 18,
      desc:'<strong style="color:#7bcdab">AP — CouchDB:</strong> Uses multi-version concurrency control (MVCC). Embraces eventual consistency with built-in conflict detection. Conflicts are exposed to the application for resolution — similar to git merges.' },
  ];

  var hovered = null;
  var selected = null;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Triangle fill regions
    var grad;

    // CA region (left side)
    ctx.beginPath();
    ctx.moveTo(vC.x, vC.y); ctx.lineTo(vA.x, vA.y);
    ctx.lineTo((vC.x+vA.x+vP.x)/3, (vC.y+vA.y+vP.y)/3); ctx.closePath();
    ctx.fillStyle = 'rgba(251,239,138,0.06)'; ctx.fill();

    // CP region (right side)
    ctx.beginPath();
    ctx.moveTo(vC.x, vC.y); ctx.lineTo(vP.x, vP.y);
    ctx.lineTo((vC.x+vA.x+vP.x)/3, (vC.y+vA.y+vP.y)/3); ctx.closePath();
    ctx.fillStyle = 'rgba(123,205,171,0.06)'; ctx.fill();

    // AP region (bottom)
    ctx.beginPath();
    ctx.moveTo(vA.x, vA.y); ctx.lineTo(vP.x, vP.y);
    ctx.lineTo((vC.x+vA.x+vP.x)/3, (vC.y+vA.y+vP.y)/3); ctx.closePath();
    ctx.fillStyle = 'rgba(200,130,200,0.06)'; ctx.fill();

    // Triangle border
    ctx.beginPath();
    ctx.moveTo(vC.x, vC.y); ctx.lineTo(vA.x, vA.y); ctx.lineTo(vP.x, vP.y); ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5; ctx.stroke();

    // Center lines
    var cx = (vC.x+vA.x+vP.x)/3, cy = (vC.y+vA.y+vP.y)/3;
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(vC.x, vC.y); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vA.x, vA.y); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vP.x, vP.y); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.setLineDash([]);

    // Vertex labels
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fbef8a';
    ctx.fillText('Consistency', vC.x, vC.y - 10);
    ctx.fillStyle = '#cc99cd';
    ctx.fillText('Availability', vA.x, vA.y + 18);
    ctx.fillStyle = '#7bcdab';
    ctx.fillText('Partition Tolerance', vP.x, vP.y + 18);

    // Region labels
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(251,239,138,0.4)'; ctx.textAlign = 'center';
    ctx.fillText('CA', (vC.x+vA.x)/2 - 18, (vC.y+vA.y)/2 - 4);
    ctx.fillStyle = 'rgba(123,205,171,0.4)';
    ctx.fillText('CP', (vC.x+vP.x)/2 + 18, (vC.y+vP.y)/2 - 4);
    ctx.fillStyle = 'rgba(200,130,200,0.4)';
    ctx.fillText('AP', (vA.x+vP.x)/2, (vA.y+vP.y)/2 + 14);

    // System labels
    systems.forEach(function(s) {
      var isSelected = selected && selected.id === s.id;
      var isHovered  = hovered  && hovered.id  === s.id;
      ctx.font = (isSelected ? 'bold ' : '') + '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = isSelected ? '#fbef8a' : (isHovered ? '#fff' : 'rgba(255,255,255,0.6)');
      ctx.fillText('▸ ' + s.label, s.x, s.y);
    });
  }

  function getSystem(mx, my) {
    for (var i = 0; i < systems.length; i++) {
      var s = systems[i];
      if (mx >= s.x - 4 && mx <= s.x + 100 && my >= s.y - 14 && my <= s.y + 4) return s;
    }
    return null;
  }

  canvas.addEventListener('mousemove', function(e) {
    var r = canvas.getBoundingClientRect();
    var scaleX = canvas.width / r.width;
    var scaleY = canvas.height / r.height;
    var mx = (e.clientX - r.left) * scaleX;
    var my = (e.clientY - r.top)  * scaleY;
    hovered = getSystem(mx, my);
    canvas.style.cursor = hovered ? 'pointer' : 'default';
    draw();
  });

  canvas.addEventListener('click', function(e) {
    var r = canvas.getBoundingClientRect();
    var scaleX = canvas.width / r.width;
    var scaleY = canvas.height / r.height;
    var mx = (e.clientX - r.left) * scaleX;
    var my = (e.clientY - r.top)  * scaleY;
    var s = getSystem(mx, my);
    selected = s;
    draw();
    var info = document.getElementById('capInfo');
    if (s) {
      info.innerHTML = s.desc;
      info.style.borderColor = s.region === 'CP' ? '#7bcdab' : (s.region === 'CA' ? '#fbef8a' : '#cc99cd');
    } else {
      info.innerHTML = 'Click a system label to learn where it sits on the CAP triangle.';
      info.style.borderColor = '#2e2f35';
    }
  });

  draw();
})();
</script>

---

## 5. Level 4 — Consistent Hashing for Partitioning

A naive approach: `node = hash(key) % N`. Problem: when N changes (node added/removed), *every* key remaps. With 1 billion keys and 10 nodes, adding one node moves ~900 million keys.

**Consistent hashing** maps both keys and nodes onto the same circular ring (0 to 2³²). A key belongs to the first node clockwise from its hash.

- Adding a node: only keys between the new node and its predecessor need to move (~1/N of keys)
- Removing a node: only that node's keys need to move to its successor

<div class="diagram">  Consistent Hash Ring (simplified, 4 nodes):

            hash(key_a) = 45
                  │
             0    ▼                    2³²
  ──────────────────────────────────────────
  │   [Node A: 60]       [Node B: 170]    │
  │                                       │
  │   [Node D: 310]      [Node C: 240]    │
  ──────────────────────────────────────────

  key_a hashes to 45 → next node clockwise = Node A (60)
  key_b hashes to 200 → next node clockwise = Node C (240)

  Virtual Nodes: each physical node occupies V positions on the ring
  (e.g. V=150). This smooths load distribution even with heterogeneous
  hardware, and is used by Cassandra (vnodes) and DynamoDB.</div>

<div class="callout">
<strong>Why virtual nodes?</strong> Without them, when a node is removed, all its load moves to a single successor — creating a hotspot. With 150 virtual nodes per physical node, the departed load fans out across all remaining nodes proportionally.
</div>

---

## 6. Level 5 — Replication

{: class="marginalia" }
Quorum with N=3, W=2, R=2<br/>is the sweet spot: you can<br/>tolerate one node failure<br/>on both reads and writes<br/>while still maintaining<br/>strong consistency.

Data is replicated to **N** consecutive nodes on the ring (the *preference list*). Three strategies for handling writes:

| Strategy | How | Consistency | Latency |
|---|---|---|---|
| **Synchronous** | Coordinator waits for all N replicas to ACK | Strong | Slowest (worst case: slowest node) |
| **Asynchronous** | Coordinator writes to 1, replicates in background | Eventual | Fastest |
| **Quorum** | Write to W, read from R, require W+R > N | Tunable | Middle |

The quorum approach is the key insight from the Dynamo paper: by tuning W and R, you can slide a dial between consistency and performance.

<div class="interactive-box">
  <h4>&#9670; Quorum Calculator — Tune N, W, R</h4>
  <div class="slider-row">
    <label>N</label>
    <input type="range" id="slN" min="1" max="7" value="3" oninput="updateQuorum()">
    <span class="val" id="valN">3</span>
    <span style="font-size:12px;color:rgba(255,255,255,.4);margin-left:.4rem;">total replicas</span>
  </div>
  <div class="slider-row">
    <label>W</label>
    <input type="range" id="slW" min="1" max="7" value="2" oninput="updateQuorum()">
    <span class="val" id="valW">2</span>
    <span style="font-size:12px;color:rgba(255,255,255,.4);margin-left:.4rem;">write quorum</span>
  </div>
  <div class="slider-row">
    <label>R</label>
    <input type="range" id="slR" min="1" max="7" value="2" oninput="updateQuorum()">
    <span class="val" id="valR">2</span>
    <span style="font-size:12px;color:rgba(255,255,255,.4);margin-left:.4rem;">read quorum</span>
  </div>
  <div id="quorumResult" style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:.4rem;"></div>
  <div id="quorumExplain" style="margin-top:.8rem;font-size:13px;color:rgba(255,255,255,.6);line-height:1.65;padding:.7rem;background:#1a1b20;border-radius:8px;border:1px solid #2e2f35;"></div>
</div>

<script>
function updateQuorum() {
  var N = parseInt(document.getElementById('slN').value);
  var W = parseInt(document.getElementById('slW').value);
  var R = parseInt(document.getElementById('slR').value);
  document.getElementById('valN').textContent = N;
  document.getElementById('valW').textContent = W;
  document.getElementById('valR').textContent = R;

  // Clamp W and R to N
  if (W > N) { W = N; document.getElementById('slW').value = N; document.getElementById('valW').textContent = N; }
  if (R > N) { R = N; document.getElementById('slR').value = N; document.getElementById('valR').textContent = N; }

  var strongConsistent = (W + R) > N;
  var writeToleratesFailures = N - W; // can lose this many nodes and still write
  var readToleratesFailures  = N - R;
  var latencyImpact = Math.round(((W + R) / (2 * N)) * 100);

  var resultDiv = document.getElementById('quorumResult');
  resultDiv.innerHTML =
    '<span class="status-badge ' + (strongConsistent ? 'status-ok' : 'status-warn') + '">' +
      (strongConsistent ? '&#10003; Strong Consistent' : '&#9888; Eventual Only') +
    '</span>' +
    '<span class="status-badge status-ok">&#10003; Always Writable (W &le; N)</span>' +
    '<span class="status-badge status-ok">&#10003; Always Readable (R &le; N)</span>' +
    '<span class="status-badge ' + (latencyImpact < 60 ? 'status-ok' : (latencyImpact < 85 ? 'status-warn' : 'status-err')) + '">' +
      'Latency pressure: ' + latencyImpact + '%' +
    '</span>';

  var explainDiv = document.getElementById('quorumExplain');
  var lines = [];
  lines.push('<strong style="color:#fbef8a">W+R = ' + (W+R) + ', N = ' + N + '</strong> &rarr; ' +
    (strongConsistent
      ? 'Strong consistency guaranteed: read quorum overlaps with write quorum, so you always see the latest write.'
      : 'No consistency guarantee: read and write quorums may not overlap, so stale reads are possible.'));
  lines.push('Write can tolerate <strong style="color:#7bcdab">' + writeToleratesFailures + '</strong> node failure(s) before blocking. ' +
    'Read can tolerate <strong style="color:#7bcdab">' + readToleratesFailures + '</strong> node failure(s).');
  if (W === N) lines.push('<strong style="color:#f08080">W = N:</strong> Writes must reach ALL replicas — this is synchronous replication. Highest consistency, slowest writes.');
  if (R === 1) lines.push('<strong style="color:#fbef8a">R = 1:</strong> Reads touch only one replica — fastest reads, but stale data risk if W+R &le; N.');
  if (W === 1 && R === 1) lines.push('<strong style="color:#cc99cd">W=1, R=1:</strong> Fire-and-forget writes, single-replica reads. Maximum throughput, eventual consistency only.');
  explainDiv.innerHTML = lines.join('<br/>');
}
updateQuorum();
</script>

---

## 7. Level 6 — Conflict Resolution with Vector Clocks

With async replication, two nodes can independently accept writes for the same key, resulting in conflicting versions. How do you know which is "correct"?

### Last-Write-Wins (LWW)

Use timestamps: keep the value with the highest timestamp. Simple, but clocks drift — NTP can be off by tens of milliseconds. A causally *earlier* write with a slightly later system clock wins incorrectly.

### Vector Clocks

Each value carries a **version vector** — a map of `{nodeId → counter}`. When a node updates a value, it increments its own counter.

<div class="diagram">  Vector Clock Example:
  ─────────────────────────────────────────────────────────
  Initial: key="cart", value=[], vc={}

  Client A writes to Node 1: value=["book"], vc={N1:1}
  Client B writes to Node 2: value=["pen"],  vc={N2:1}
         ↓ (both accepted — nodes were partitioned)

  Later, Node 3 reads both versions:
    Version 1: value=["book"], vc={N1:1}
    Version 2: value=["pen"],  vc={N2:1}

  Neither vector clock dominates the other (can't compare N1:1 vs N2:1)
  → CONFLICT detected → application must merge → ["book", "pen"]

  If version had been:
    Version 1: value=["book"],        vc={N1:1}
    Version 2: value=["book","pen"],  vc={N1:1, N2:1}
  Then V2 dominates V1 (all counters ≥) → V2 wins, no conflict.</div>

<div class="callout">
<strong>Amazon shopping cart</strong> is the canonical example: two devices add items concurrently during a network partition. Vector clocks detect the conflict; the client merges by taking the union. This is safer than LWW (which could silently discard a purchase).
</div>

### Causality vs. Conflict

Two events are *causally related* if one happened-before the other (Lamport's happens-before relation). Vector clocks capture this precisely:

- V1 **dominates** V2 if every counter in V1 ≥ corresponding counter in V2 → V1 is a successor, discard V2
- Neither dominates → **concurrent** → conflict, application must merge

---

## 8. Level 7 — Gossip Protocol for Failure Detection

In a large cluster, a central failure detector is a single point of failure. Gossip protocols give us decentralized, scalable failure detection.

**How it works:**
1. Every T seconds, each node picks K random peers and sends a "heartbeat" message with its membership list
2. The receiver merges the membership list (taking max generation/heartbeat counts)
3. If a node's heartbeat hasn't increased in T_suspect seconds → mark **suspect**
4. If still silent after T_dead seconds → mark **dead**, redistribute its keys

<div class="interactive-box">
  <h4>&#8767; Gossip Protocol Visualizer — Click a node to kill it</h4>
  <canvas id="gossipCanvas" class="gossip-canvas" width="480" height="300" style="max-width:100%;cursor:pointer;"></canvas>
  <div class="gossip-legend">
    <span><i class="g-healthy"></i> Healthy</span>
    <span><i class="g-suspect"></i> Suspect</span>
    <span><i class="g-dead"></i>    Dead</span>
  </div>
  <div style="margin-top:.7rem;display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">
    <button class="sim-btn" onclick="gossipReset()">&#8635; Reset</button>
    <button class="sim-btn danger" onclick="gossipKillRandom()">&#9760; Kill Random Node</button>
  </div>
  <div id="gossipLog" style="margin-top:.7rem;font-size:11.5px;color:rgba(255,255,255,.45);font-family:monospace;min-height:38px;line-height:1.7;max-height:80px;overflow-y:auto;"></div>
</div>

<script>
(function() {
  var canvas = document.getElementById('gossipCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var logEl = document.getElementById('gossipLog');

  var NODE_COUNT = 6;
  var cx = W / 2, cy = H / 2, radius = 108;
  var nodes = [];
  var pulses = [];
  var timer = null;
  var tick = 0;
  var logs = [];

  function addLog(msg) {
    logs.unshift('[t=' + tick + '] ' + msg);
    if (logs.length > 12) logs.pop();
    logEl.innerHTML = logs.join('<br/>');
  }

  function initNodes() {
    nodes = [];
    for (var i = 0; i < NODE_COUNT; i++) {
      var angle = (2 * Math.PI * i / NODE_COUNT) - Math.PI / 2;
      nodes.push({
        id: i,
        label: 'N' + (i + 1),
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        status: 'healthy', // healthy | suspect | dead
        heartbeat: 100,
        lastSeen: 0,
        suspectAt: -1,
        deadAt: -1
      });
    }
    pulses = [];
    tick = 0;
    logs = [];
    logEl.innerHTML = 'All nodes healthy. Click a node or use "Kill Random Node".';
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw gossip pulses
    pulses = pulses.filter(function(p) { return p.alpha > 0; });
    pulses.forEach(function(p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(123,205,171,' + p.alpha + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      p.r += 2;
      p.alpha -= 0.06;
    });

    // Draw edges (ring topology)
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i], b = nodes[(i + 1) % nodes.length];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Cross-ring random edges
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    [[0,3],[1,4],[2,5]].forEach(function(pair) {
      ctx.beginPath();
      ctx.moveTo(nodes[pair[0]].x, nodes[pair[0]].y);
      ctx.lineTo(nodes[pair[1]].x, nodes[pair[1]].y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(function(n) {
      var color = n.status === 'healthy' ? '#7bcdab' :
                  n.status === 'suspect' ? '#fbef8a' : '#f08080';
      var glowColor = n.status === 'healthy' ? 'rgba(123,205,171,0.25)' :
                      n.status === 'suspect' ? 'rgba(251,239,138,0.25)' : 'rgba(240,128,128,0.2)';

      // Glow
      var grd = ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, 28);
      grd.addColorStop(0, glowColor);
      grd.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(n.x, n.y, 28, 0, 2 * Math.PI);
      ctx.fillStyle = grd; ctx.fill();

      // Circle
      ctx.beginPath(); ctx.arc(n.x, n.y, 18, 0, 2 * Math.PI);
      ctx.fillStyle = n.status === 'dead' ? '#2a1515' : '#1a1b20';
      ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

      // Label
      ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.fillText(n.label, n.x, n.y + 4);

      if (n.status !== 'healthy') {
        ctx.font = '9px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(n.status.toUpperCase(), n.x, n.y + 32);
      }
    });
  }

  function gossipTick() {
    tick++;
    var alive = nodes.filter(function(n) { return n.status !== 'dead'; });
    alive.forEach(function(n) { n.heartbeat++; });

    // Gossip: each healthy node sends heartbeat to 2 random peers
    alive.filter(function(n) { return n.status === 'healthy'; }).forEach(function(n) {
      var peers = alive.filter(function(p) { return p.id !== n.id; });
      var shuffled = peers.sort(function() { return Math.random() - .5; }).slice(0, 2);
      shuffled.forEach(function(peer) {
        peer.lastSeen = tick;
        pulses.push({ x: n.x, y: n.y, r: 8, alpha: 0.6 });
      });
    });

    // Check for nodes that haven't been heard from
    nodes.forEach(function(n) {
      if (n.status === 'dead') return;
      var silent = tick - n.lastSeen;
      if (n.status === 'healthy' && silent > 5) {
        n.status = 'suspect';
        n.suspectAt = tick;
        addLog(n.label + ' not heard from — marking SUSPECT');
      } else if (n.status === 'suspect' && silent > 10) {
        n.status = 'dead';
        n.deadAt = tick;
        addLog(n.label + ' confirmed DEAD — redistributing keys');
      }
    });

    draw();
  }

  window.gossipReset = function() {
    clearInterval(timer);
    initNodes();
    draw();
    timer = setInterval(gossipTick, 600);
  };

  window.gossipKillRandom = function() {
    var alive = nodes.filter(function(n) { return n.status === 'healthy'; });
    if (!alive.length) { addLog('No healthy nodes to kill!'); return; }
    var victim = alive[Math.floor(Math.random() * alive.length)];
    victim.status = 'dead';
    victim.deadAt = tick;
    addLog(victim.label + ' killed manually — gossip will propagate...');
    draw();
  };

  canvas.addEventListener('click', function(e) {
    var r = canvas.getBoundingClientRect();
    var scaleX = canvas.width / r.width;
    var scaleY = canvas.height / r.height;
    var mx = (e.clientX - r.left) * scaleX;
    var my = (e.clientY - r.top) * scaleY;
    nodes.forEach(function(n) {
      var dx = mx - n.x, dy = my - n.y;
      if (Math.sqrt(dx*dx + dy*dy) < 22) {
        if (n.status !== 'dead') {
          n.status = 'dead';
          n.deadAt = tick;
          addLog(n.label + ' killed by click — gossip propagating...');
        } else {
          n.status = 'healthy';
          n.heartbeat = tick;
          n.lastSeen = tick;
          addLog(n.label + ' revived — rejoining gossip ring');
        }
        draw();
      }
    });
  });

  initNodes();
  nodes.forEach(function(n) { n.lastSeen = 0; });
  draw();
  timer = setInterval(gossipTick, 600);
})();
</script>

---

## 9. Level 8 — Read Repair & Hinted Handoff

Two mechanisms that keep the cluster eventually consistent without coordinator intervention:

### Read Repair

When the coordinator sends a quorum read, it compares versions from R replicas. If any replica returns a stale version, the coordinator sends an async write to bring it up to date.

<div class="diagram">  Read Repair:

  Client GET("user:42")
       │
  Coordinator reads from R=2 replicas:
       │── Node A: value="Alice", vc={N1:5}     ◄── newer
       │── Node B: value="Alice_old", vc={N1:3} ◄── stale
       │
  Return {N1:5} to client (newest version)
       │
  Async: coordinator sends PUT to Node B to bring it up to date
       ↓
  Node B: value="Alice", vc={N1:5}              ◄── healed</div>

### Hinted Handoff

If the target replica for a write is temporarily down, another node stores the write with a "hint" (the intended recipient's ID). When the target comes back online, the hint-holder delivers the queued writes.

<div class="diagram">  Hinted Handoff:

  PUT("order:99", data) → should go to Node C (down!)
       │
  Coordinator stores on Node D instead:
    {
      data: ...,
      hint: "deliver to Node C when it recovers"
    }
       │
  Node C recovers → Node D detects this (via gossip)
       │
  Node D delivers the hinted write to Node C
  Node D deletes the hint
       │
  Cluster fully consistent again</div>

<div class="callout">
<strong>Hinted handoff has a time limit.</strong> If Node C is down for too long (e.g. a week), hints are discarded to avoid unbounded storage. This is why Cassandra uses anti-entropy with Merkle trees for long-term reconciliation — comparing tree hashes to find diverged data ranges.
</div>

---

## 10. Full Architecture

<div class="interactive-box">
  <h4>&#9676; Complete System Architecture</h4>
  <canvas id="archCanvas" class="arch-canvas" width="560" height="400" style="max-width:100%;"></canvas>
  <div id="archInfo" style="margin-top:.8rem;font-size:13px;color:rgba(255,255,255,.65);min-height:44px;padding:.7rem;background:#1a1b20;border-radius:8px;border:1px solid #2e2f35;line-height:1.6;">
    Hover over a component to learn about its role.
  </div>
</div>

<script>
(function() {
  var canvas = document.getElementById('archCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var components = [
    { id:'client', label:'Client', x:50, y:185, w:80, h:40,
      color:'#cc99cd', desc:'Any application that calls GET/PUT/DELETE. Connects to any node — all nodes are peers, no special master.' },
    { id:'coord',  label:'Coordinator', x:195, y:175, w:120, h:60,
      color:'#fbef8a', desc:'The node that received the client request becomes the coordinator. It: (1) hashes the key, (2) finds N replicas on the ring, (3) sends reads/writes to R or W of them, (4) returns the result.' },
    { id:'ring',   label:'Gossip Ring', x:200, y:295, w:110, h:38,
      color:'#7bcdab', desc:'All nodes participate in gossip. Membership changes (node joins, leaves, failures) propagate within seconds using the gossip protocol. No central registry.' },
    { id:'r1',     label:'Replica 1', x:390, y:100, w:90, h:42,
      color:'#7bcdab', desc:'Primary replica for this key range. Stores: WAL (durability) + MemTable (fast writes) + SSTables (persistent storage). Participates in quorum reads/writes.' },
    { id:'r2',     label:'Replica 2', x:390, y:185, w:90, h:42,
      color:'#7bcdab', desc:'Second replica. Async replication from coordinator. May lag behind Replica 1 during high load. Read repair keeps it synchronized.' },
    { id:'r3',     label:'Replica 3', x:390, y:270, w:90, h:42,
      color:'#7bcdab', desc:'Third replica. Provides fault tolerance: with N=3, the system can survive one full node failure without losing data or availability (with W=2, R=2).' },
    { id:'wal',    label:'WAL + MemTable + SSTable', x:355, y:345, w:195, h:36,
      color:'rgba(255,255,255,0.4)', desc:'Each replica\'s storage stack: Write-Ahead Log (crash recovery) → MemTable (fast in-memory writes) → SSTables (immutable sorted files on disk). Background compaction merges SSTables.' },
  ];

  var arrows = [
    { from:'client', to:'coord',  label:'GET/PUT' },
    { from:'coord',  to:'r1',     label:'replicate' },
    { from:'coord',  to:'r2',     label:'replicate' },
    { from:'coord',  to:'r3',     label:'replicate' },
    { from:'coord',  to:'ring',   label:'gossip' },
  ];

  var hovered = null;

  function getCenter(c) {
    return { x: c.x + c.w/2, y: c.y + c.h/2 };
  }

  function drawArrow(x1, y1, x2, y2, label, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color || 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5; ctx.stroke();
    // Arrowhead
    var angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 8*Math.cos(angle-0.4), y2 - 8*Math.sin(angle-0.4));
    ctx.lineTo(x2 - 8*Math.cos(angle+0.4), y2 - 8*Math.sin(angle+0.4));
    ctx.closePath();
    ctx.fillStyle = color || 'rgba(255,255,255,0.18)'; ctx.fill();
    if (label) {
      var mx = (x1+x2)/2, my = (y1+y2)/2;
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(label, mx + 4, my - 5);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Arrows
    arrows.forEach(function(a) {
      var from = components.find(function(c) { return c.id === a.from; });
      var to   = components.find(function(c) { return c.id === a.to;   });
      if (!from || !to) return;
      var fc = getCenter(from), tc = getCenter(to);
      drawArrow(fc.x, fc.y, tc.x, tc.y, a.label);
    });

    // Components
    components.forEach(function(c) {
      var isHov = hovered && hovered.id === c.id;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(c.x, c.y, c.w, c.h, 8) :
                      ctx.rect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = isHov ? 'rgba(255,255,255,0.07)' : '#1a1b20';
      ctx.fill();
      ctx.strokeStyle = isHov ? c.color : (c.color === 'rgba(255,255,255,0.4)' ? '#2e2f35' : c.color + '88');
      ctx.lineWidth = isHov ? 2 : 1.5; ctx.stroke();

      ctx.font = (isHov ? 'bold ' : '') + '12px sans-serif';
      ctx.textAlign = 'center'; ctx.fillStyle = c.color;
      ctx.fillText(c.label, c.x + c.w/2, c.y + c.h/2 + 4);
    });
  }

  canvas.addEventListener('mousemove', function(e) {
    var r = canvas.getBoundingClientRect();
    var scaleX = canvas.width / r.width;
    var scaleY = canvas.height / r.height;
    var mx = (e.clientX - r.left) * scaleX;
    var my = (e.clientY - r.top) * scaleY;
    hovered = null;
    components.forEach(function(c) {
      if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) hovered = c;
    });
    canvas.style.cursor = hovered ? 'pointer' : 'default';
    draw();
    var info = document.getElementById('archInfo');
    info.innerHTML = hovered ? hovered.desc : 'Hover over a component to learn about its role.';
  });

  draw();
})();
</script>

**Request flow for `PUT("user:42", data)` with N=3, W=2:**

1. Client sends to any node (becomes coordinator)
2. Coordinator hashes `"user:42"` → position on ring → finds 3 consecutive nodes
3. Coordinator sends write to all 3 replicas
4. Waits for W=2 ACKs → responds success to client
5. Third replica ACKs asynchronously (best-effort)
6. If a replica is down → hinted handoff stores the write
7. Read repair and anti-entropy keep replicas synchronized

---

## 11. Comparison

<table class="cmp-table">
<thead>
<tr>
<th>Feature</th>
<th>Redis</th>
<th>DynamoDB</th>
<th>Cassandra</th>
<th>RocksDB</th>
</tr>
</thead>
<tbody>
<tr>
<td>Persistence</td>
<td>Optional (RDB/AOF)</td>
<td>Yes (managed)</td>
<td>Yes (SSTable)</td>
<td>Yes (LSM)</td>
</tr>
<tr>
<td>Distribution</td>
<td>Cluster mode</td>
<td>Fully managed</td>
<td>Yes (ring)</td>
<td>Single node only</td>
</tr>
<tr>
<td>Consistency</td>
<td>Strong (single node)</td>
<td>Tunable</td>
<td>Tunable</td>
<td>Single-node strong</td>
</tr>
<tr>
<td>CAP</td>
<td><span class="tag-pill tag-cp">CP</span></td>
<td><span class="tag-pill tag-ap">AP</span></td>
<td><span class="tag-pill tag-ap">AP</span></td>
<td><span class="tag-pill tag-opt">—</span></td>
</tr>
<tr>
<td>Data model</td>
<td>Rich types (list, set, sorted set, hash)</td>
<td>Document + KV</td>
<td>Wide-column</td>
<td>Pure KV bytes</td>
</tr>
<tr>
<td>Best for</td>
<td>Cache, leaderboards, sessions</td>
<td>Serverless, variable scale</td>
<td>Time-series, IoT, writes</td>
<td>Embedded storage engine</td>
</tr>
<tr>
<td>Latency</td>
<td>Sub-ms (in-memory)</td>
<td>Single-digit ms</td>
<td>Low ms</td>
<td>Sub-ms</td>
</tr>
</tbody>
</table>

---

## 12. Interview Cheat Sheet

When answering this question in an interview, hit these points in order:

1. **Clarify requirements** — read-heavy vs write-heavy? Consistency vs latency? Data size?
2. **Start simple** — HashMap + WAL → single node works, but doesn't scale
3. **Add partitioning** — consistent hashing for minimal key redistribution on topology changes
4. **Add replication** — N=3, pick W and R based on consistency needs
5. **Failure detection** — gossip protocol, no central coordinator
6. **Recovery** — read repair for temporary skew, hinted handoff for node downtime, anti-entropy (Merkle trees) for long-term divergence
7. **Conflict resolution** — LWW for simple cases, vector clocks when application semantics matter

{: class="marginalia" }
Quorum with N=3, W=2, R=2<br/>is the sweet spot: tolerates<br/>one node failure on both<br/>reads and writes while<br/>maintaining strong<br/>consistency.

<div class="callout">
<strong>The Dynamo paper (2007)</strong> is required reading. In 12 pages, Amazon described how they solved all of this in production — consistent hashing, vector clocks, quorum NWR, gossip-based membership, hinted handoff, and Merkle tree anti-entropy. Every major distributed KV store since has been a variation on this design.
</div>

**What distinguishes a great answer:**
- Explain *why* LSM trees are better than B-trees for write-heavy KV stores (sequential vs random I/O)
- Explain *why* consistent hashing (minimal key redistribution) vs modulo hashing (full reshuffle)
- Explain the quorum math: W+R > N means the read set and write set overlap by at least one node
- Know the tradeoff: vector clocks give you conflict *detection* but not conflict *resolution* — that's the application's job

---

*Next in the series: **#10 — Design a Notification System** — fan-out patterns, push vs pull, and at-least-once delivery guarantees.*
