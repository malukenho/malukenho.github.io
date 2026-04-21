---
layout: post
title: "System Design: Search Autocomplete — From Trie to Google-Scale"
date: 2026-04-19 10:00:00 +0000
categories: ["post"]
tags: [system-design, trie, autocomplete, search, interview]
series: "System Design Interview Series"
---

{: class="marginalia" }
Series **#6 of 15** in<br/>*System Design Interview*<br/>deep-dives. Each post<br/>stands alone but they<br/>build on each other.

<div class="series-label">System Design Interview Series &mdash; #6 of 15</div>

**The question:** Design a search autocomplete system like Google's search bar. When a user types "sys", show the top 5 suggestions in under 100ms. Handle 10M unique queries/day and 500M users.

This prompt hides a beautiful ladder of trade-offs — from a one-liner SQL query to a distributed, personalized, multi-layer system serving millions of keystrokes per second. Let's climb every rung.

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

/* ── Cards ───────────────────────────────────────────────────────── */
.ac-card {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 14px; padding: 1.4rem 1.6rem; margin: 1.6rem 0;
}
.ac-card h4 {
  margin: 0 0 .7rem; color: #fbef8a; font-size: 1rem;
}

/* ── Pills ───────────────────────────────────────────────────────── */
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

/* ── Trie visualiser ─────────────────────────────────────────────── */
#trie-demo {
  background: #111214; border: 1px solid #2e2f35;
  border-radius: 14px; padding: 1.6rem; margin: 1.6rem 0;
}
#trie-demo h4 { margin: 0 0 1rem; color: #fbef8a; }
.trie-controls {
  display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center;
}
.trie-input {
  background: #1a1b1f; border: 1px solid #3a3b40; border-radius: 7px;
  padding: 7px 12px; color: rgba(255,255,255,.85); font-family: inherit;
  font-size: 13px; outline: none; width: 160px; transition: border-color .2s;
}
.trie-input:focus { border-color: #7bcdab; }
#trie-canvas-wrap {
  width: 100%; overflow-x: auto; background: #0e0f12;
  border: 1px solid #2e2f35; border-radius: 10px; padding: .5rem 0;
}
#trie-canvas { display: block; margin: 0 auto; }
.trie-suggestions {
  margin-top: .8rem; display: flex; gap: .4rem; flex-wrap: wrap; min-height: 28px;
}
.trie-sug-item {
  background: #1a1b1f; border: 1px solid #3a3b40; border-radius: 6px;
  padding: 3px 10px; font-size: 13px; color: rgba(255,255,255,.78);
  font-family: "JetBrains Mono", monospace;
}
.trie-sug-item .match-prefix { color: #fbef8a; font-weight: 700; }
.trie-status {
  font-size: 12px; color: rgba(255,255,255,.4); margin-top: .5rem;
}

/* ── Algo two-col ────────────────────────────────────────────────── */
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

/* ── Compare table ───────────────────────────────────────────────── */
.compare-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: .8rem 0;
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

/* ── Architecture diagram ────────────────────────────────────────── */
#arch-diagram {
  background: #111214; border: 1px solid #2e2f35;
  border-radius: 14px; padding: 1.6rem; margin: 1.6rem 0;
}
#arch-diagram h4 { margin: 0 0 1rem; color: #fbef8a; }
.arch-canvas-wrap {
  width: 100%; overflow-x: auto;
}
.arch-desc {
  margin-top: 1rem; min-height: 52px;
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .8rem 1rem; font-size: 13px; color: rgba(255,255,255,.72);
  line-height: 1.65; transition: all .2s;
}
.arch-desc strong { color: #7bcdab; }

/* ── Live autocomplete demo ──────────────────────────────────────── */
#live-demo {
  background: #111214; border: 1px solid #2e2f35;
  border-radius: 14px; padding: 1.6rem; margin: 1.6rem 0;
}
#live-demo h4 { margin: 0 0 1rem; color: #fbef8a; }
.live-search-wrap {
  position: relative; max-width: 480px;
}
.live-search-input {
  width: 100%; box-sizing: border-box;
  background: #1a1b1f; border: 1px solid #3a3b40; border-radius: 9px;
  padding: 11px 16px; color: rgba(255,255,255,.9); font-family: inherit;
  font-size: 15px; outline: none; transition: border-color .2s;
}
.live-search-input:focus { border-color: #7bcdab; }
.live-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: #1a1b1f; border: 1px solid #3a3b40; border-radius: 9px;
  overflow: hidden; z-index: 99; display: none;
  box-shadow: 0 8px 32px rgba(0,0,0,.55);
}
.live-dropdown.open { display: block; }
.live-drop-item {
  padding: 9px 16px; font-size: 14px; color: rgba(255,255,255,.75);
  cursor: pointer; font-family: "JetBrains Mono", monospace;
  transition: background .1s; border-bottom: 1px solid #24252b;
}
.live-drop-item:last-child { border-bottom: none; }
.live-drop-item:hover, .live-drop-item.selected { background: #242529; }
.live-drop-item .hi { color: #fbef8a; font-weight: 700; }
.live-meta {
  margin-top: .6rem; font-size: 12px; color: rgba(255,255,255,.35);
  font-family: "JetBrains Mono", monospace;
}
</style>

## 1. Why Autocomplete Is Hard

On the surface, autocomplete looks trivial: the user types a few characters, you return matching words. But at Google's scale every requirement becomes a constraint:

- **Speed** — sub-100ms feels instant; anything over 300ms feels broken. Every character triggers a new request.
- **Relevance** — alphabetical order is useless. Return the *most searched* completions, not the lexicographically first ones.
- **Personalization** — your autocomplete should differ from a stranger's. Your location, language, and history matter.
- **Scale** — Google processes ~63,000 searches per second. Every keystroke in every search box is a request. That's potentially hundreds of thousands of autocomplete calls per second worldwide.

---

## 2. Level 1 — SQL `LIKE` Query

The simplest possible solution: a table of queries and their hit counts, queried with a `LIKE` prefix match.

<div class="code-wrap">
<div class="code-lang">SQL<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">SELECT</span> query, count
<span class="kw">FROM</span>   search_queries
<span class="kw">WHERE</span>  query <span class="kw">LIKE</span> <span class="st">'sys%'</span>
<span class="kw">ORDER BY</span> count <span class="kw">DESC</span>
<span class="kw">LIMIT</span>  <span class="nu">5</span>;</pre>
</div>

With a B-tree index on `query` this is fast for small datasets — a prefix scan on a sorted index is O(log N + K). At 10 million unique queries the index still helps. But at 1 billion rows the prefix scan becomes a full table scan of a subtree that could touch millions of rows, and sorting them all by count is O(N log N). Database CPU spikes; p99 latency balloons past a second.

<div class="ac-card">
<h4>When SQL is fine vs when it breaks</h4>
<table class="compare-table">
<thead><tr><th>Scale</th><th>Index scan rows</th><th>p99 latency</th><th>Verdict</th></tr></thead>
<tbody>
<tr><td>1M queries</td><td>~100</td><td>&lt; 5ms</td><td><span class="yes">✓ Fine</span></td></tr>
<tr><td>100M queries</td><td>~10,000</td><td>~50ms</td><td><span class="part">~ Borderline</span></td></tr>
<tr><td>1B queries</td><td>~100,000</td><td>&gt; 500ms</td><td><span class="no">✗ Too slow</span></td></tr>
</tbody>
</table>
</div>

---

## 3. Level 2 — Trie (Prefix Tree)

A **trie** (from *re**trie**val*) is a tree where each path from root to node spells out a prefix. Every node stores one character, and a flag indicating whether that position marks the end of a complete word.

<div class="code-wrap">
<div class="code-lang">JavaScript — Trie Node<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">TrieNode</span> {
  <span class="nm">constructor</span>() {
    <span class="kw">this</span>.children  <span class="op">=</span> {};        <span class="cm">// char → TrieNode</span>
    <span class="kw">this</span>.isEnd     <span class="op">=</span> <span class="kw">false</span>;     <span class="cm">// marks complete word</span>
    <span class="kw">this</span>.frequency <span class="op">=</span> <span class="nu">0</span>;         <span class="cm">// how often this query was searched</span>
    <span class="kw">this</span>.topK      <span class="op">=</span> [];         <span class="cm">// cached top-5 completions (Level 5)</span>
  }
}

<span class="kw">class</span> <span class="ty">Trie</span> {
  <span class="nm">constructor</span>() { <span class="kw">this</span>.root <span class="op">=</span> <span class="kw">new</span> <span class="ty">TrieNode</span>(); }

  <span class="nm">insert</span>(word, freq <span class="op">=</span> <span class="nu">1</span>) {
    <span class="kw">let</span> node <span class="op">=</span> <span class="kw">this</span>.root;
    <span class="kw">for</span> (<span class="kw">const</span> ch <span class="kw">of</span> word) {
      <span class="kw">if</span> (!node.children[ch]) node.children[ch] <span class="op">=</span> <span class="kw">new</span> <span class="ty">TrieNode</span>();
      node <span class="op">=</span> node.children[ch];
    }
    node.isEnd     <span class="op">=</span> <span class="kw">true</span>;
    node.frequency <span class="op">=</span> freq;
  }

  <span class="nm">search</span>(prefix) {
    <span class="kw">let</span> node <span class="op">=</span> <span class="kw">this</span>.root;
    <span class="kw">for</span> (<span class="kw">const</span> ch <span class="kw">of</span> prefix) {
      <span class="kw">if</span> (!node.children[ch]) <span class="kw">return</span> [];   <span class="cm">// prefix not found</span>
      node <span class="op">=</span> node.children[ch];
    }
    <span class="cm">// DFS from this node, collecting all complete words</span>
    <span class="kw">const</span> results <span class="op">=</span> [];
    <span class="kw">this</span>._dfs(node, prefix, results);
    <span class="kw">return</span> results.sort((a, b) <span class="op">=&gt;</span> b.freq <span class="op">-</span> a.freq).slice(<span class="nu">0</span>, <span class="nu">5</span>);
  }

  <span class="nm">_dfs</span>(node, current, results) {
    <span class="kw">if</span> (node.isEnd) results.push({ word: current, freq: node.frequency });
    <span class="kw">for</span> (<span class="kw">const</span> [ch, child] <span class="kw">of</span> <span class="ty">Object</span>.entries(node.children))
      <span class="kw">this</span>._dfs(child, current <span class="op">+</span> ch, results);
  }
}</pre>
</div>

Lookup time: **O(P + K)** where P = prefix length, K = number of completions under that prefix. Completely independent of dictionary size — no table scan.

### Interactive Trie Visualiser

{: class="marginalia" }
"Google's autocomplete<br/>handles ~63,000 searches<br/>per second — every keystroke<br/>in every search box worldwide."

<div id="trie-demo">
  <h4>🌲 Trie Visualiser</h4>
  <div class="trie-controls">
    <input class="trie-input" id="trieSearchInput" placeholder="Type a prefix…" autocomplete="off" spellcheck="false"/>
    <input class="trie-input" id="trieInsertInput" placeholder="Insert a word…" autocomplete="off" spellcheck="false" style="width:140px;"/>
    <button class="sim-btn" onclick="trieInsertWord()">Insert</button>
    <button class="sim-btn" onclick="trieReset()">Reset</button>
  </div>
  <div id="trie-canvas-wrap">
    <canvas id="trie-canvas" width="780" height="320"></canvas>
  </div>
  <div class="trie-suggestions" id="trieSuggestions"></div>
  <div class="trie-status" id="trieStatus">Pre-loaded with 7 words. Type a prefix to explore.</div>
</div>

---

## 4. Level 3 — Trie with Frequency Ranking

Augment the trie to store a **frequency score** at each terminal node. The score represents how many times that exact query was searched. On every autocomplete:

1. Traverse trie along the prefix — O(P)
2. DFS from the prefix node collecting all complete words — O(subtree size)
3. Sort collected words by frequency descending — O(K log K)
4. Return top 5

<div class="code-wrap">
<div class="code-lang">Python — DFS with frequency<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">autocomplete</span>(trie_root, prefix: <span class="ty">str</span>, k: <span class="ty">int</span> <span class="op">=</span> <span class="nu">5</span>) <span class="op">-&gt;</span> <span class="ty">list</span>:
    <span class="cm"># 1. Traverse to prefix node</span>
    node <span class="op">=</span> trie_root
    <span class="kw">for</span> ch <span class="kw">in</span> prefix:
        <span class="kw">if</span> ch <span class="kw">not in</span> node.children:
            <span class="kw">return</span> []
        node <span class="op">=</span> node.children[ch]

    <span class="cm"># 2. DFS collecting all complete words under this node</span>
    results <span class="op">=</span> []

    <span class="kw">def</span> <span class="nm">dfs</span>(n, current):
        <span class="kw">if</span> n.is_end:
            results.append((current, n.frequency))
        <span class="kw">for</span> ch, child <span class="kw">in</span> n.children.items():
            dfs(child, current <span class="op">+</span> ch)

    dfs(node, prefix)

    <span class="cm"># 3. Sort by frequency, return top-k</span>
    results.sort(key<span class="op">=</span><span class="kw">lambda</span> x: x[<span class="nu">1</span>], reverse<span class="op">=</span><span class="kw">True</span>)
    <span class="kw">return</span> [word <span class="kw">for</span> word, _ <span class="kw">in</span> results[:k]]</pre>
</div>

**Problem:** if the subtree under a popular prefix contains millions of words (think: every query starting with "a"), the DFS visits all of them. That's slow.

**Fix:** cache top-K at every node (Level 5 below).

---

## 5. Level 4 — Compressed Trie (Radix Tree)

A standard trie wastes memory when words have long unique tails. "system", "systems", and "syslog" share "sys", but then diverge. The nodes for "t-e-m" and "l-o-g" each have only a single child — a chain with no branching.

**Radix tree / Patricia trie** merges single-child chains into a single edge labelled with the full substring:

<div class="ac-card">
<h4>Standard Trie vs Compressed Radix Tree</h4>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;">
<div>
<p style="color:#7bcdab;font-size:12px;margin:0 0 .5rem;font-weight:700;">STANDARD TRIE — "system", "systems", "syslog"</p>
<pre style="margin:0;font-size:12px;color:rgba(255,255,255,.7);font-family:'JetBrains Mono',monospace;line-height:1.8;">root
└─ s
   └─ y
      └─ s
         ├─ t
         │  └─ e
         │     └─ m ★ freq:92k
         │        └─ s ★ freq:110k
         └─ l
            └─ o
               └─ g ★ freq:44k</pre>
</div>
<div>
<p style="color:#7bcdab;font-size:12px;margin:0 0 .5rem;font-weight:700;">RADIX TREE — same words</p>
<pre style="margin:0;font-size:12px;color:rgba(255,255,255,.7);font-family:'JetBrains Mono',monospace;line-height:1.8;">root
└─ "sys"
   ├─ "tem" ★ freq:92k
   │  └─ "s" ★ freq:110k
   └─ "log" ★ freq:44k</pre>
</div>
</div>
<p style="margin:.8rem 0 0;font-size:.88rem;color:rgba(255,255,255,.65);line-height:1.6;">The radix tree collapses 10 nodes into 4. For a dictionary with millions of long-tail queries, memory savings can reach <strong style="color:#fbef8a;">60–80%</strong>.</p>
</div>

Memory comparison: standard trie stores one node per character. English has average word length ≈ 7 chars → 7 nodes per word. Radix tree stores one node per branching point — often just 2-3 nodes per word.

---

## 6. Level 5 — Top-K Caching at Every Node

{: class="marginalia" }
"The top-k cache at each trie<br/>node is a classic space-time<br/>trade-off: use more memory<br/>but turn an O(n) subtree<br/>traversal into O(1)."

Instead of traversing the subtree on every query, **cache the top-5 completions at every single node**. A query for prefix "sys" simply reads the cache at the "s → y → s" node — O(P) and nothing more.

<div class="code-wrap">
<div class="code-lang">Python — insert with top-K cache propagation<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">insert_with_cache</span>(root, word: <span class="ty">str</span>, freq: <span class="ty">int</span>, k: <span class="ty">int</span> <span class="op">=</span> <span class="nu">5</span>):
    path <span class="op">=</span> []            <span class="cm"># track nodes visited so we can update their caches</span>
    node <span class="op">=</span> root
    <span class="kw">for</span> ch <span class="kw">in</span> word:
        <span class="kw">if</span> ch <span class="kw">not in</span> node.children:
            node.children[ch] <span class="op">=</span> <span class="ty">TrieNode</span>()
        path.append(node)
        node <span class="op">=</span> node.children[ch]
    node.is_end   <span class="op">=</span> <span class="kw">True</span>
    node.frequency <span class="op">=</span> freq
    path.append(node)

    <span class="cm"># Walk back up, updating top-k cache at every ancestor</span>
    <span class="kw">for</span> ancestor <span class="kw">in</span> path:
        candidate <span class="op">=</span> (word, freq)
        <span class="cm"># If word is better than worst in current top-k, replace it</span>
        <span class="kw">if</span> <span class="ty">len</span>(ancestor.top_k) <span class="op">&lt;</span> k:
            ancestor.top_k.append(candidate)
        <span class="kw">elif</span> freq <span class="op">&gt;</span> ancestor.top_k[<span class="op">-</span><span class="nu">1</span>][<span class="nu">1</span>]:
            ancestor.top_k[<span class="op">-</span><span class="nu">1</span>] <span class="op">=</span> candidate
        ancestor.top_k.sort(key<span class="op">=</span><span class="kw">lambda</span> x: x[<span class="nu">1</span>], reverse<span class="op">=</span><span class="kw">True</span>)

<span class="kw">def</span> <span class="nm">fast_autocomplete</span>(root, prefix: <span class="ty">str</span>) <span class="op">-&gt;</span> <span class="ty">list</span>:
    node <span class="op">=</span> root
    <span class="kw">for</span> ch <span class="kw">in</span> prefix:
        <span class="kw">if</span> ch <span class="kw">not in</span> node.children:
            <span class="kw">return</span> []
        node <span class="op">=</span> node.children[ch]
    <span class="kw">return</span> [w <span class="kw">for</span> w, _ <span class="kw">in</span> node.top_k]   <span class="cm"># O(1) — no traversal needed!</span></pre>
</div>

**Complexity:** O(P) lookup — prefix length only, completely independent of how many words are in the trie.

**Memory overhead:** Each node stores up to 5 `(word, freq)` tuples. For 100M nodes (a large trie), with average word length 8 bytes: 100M × 5 × 16 bytes ≈ **8 GB extra**. Acceptable for an in-memory service on a beefy machine.

---

## 7. Level 6 — Production Architecture

Click any component in the diagram for details.

<div id="arch-diagram">
  <h4>🏗️ Autocomplete System Architecture</h4>
  <div class="arch-canvas-wrap">
    <canvas id="arch-canvas" width="760" height="360" style="cursor:pointer;max-width:100%;display:block;"></canvas>
  </div>
  <div class="arch-desc" id="archDesc">
    Click any component above to learn what it does.
  </div>
</div>

**Key design decisions:**

<div class="two-col">
<div class="algo-card">
<h5>Trie updated hourly</h5>
<p>The main trie is rebuilt from aggregated logs every hour using an offline Spark/Hadoop job. The new trie is snapshotted to object storage, then loaded by the autocomplete service via a blue-green swap — zero downtime.</p>
</div>
<div class="algo-card">
<h5>Real-time trending via Redis</h5>
<p>Very recent queries (last 60 minutes) are tracked in Redis sorted sets. On each autocomplete request, Redis top-K is merged with the trie top-K. This captures breaking news and viral topics without rebuilding the trie.</p>
</div>
<div class="algo-card">
<h5>CDN for popular prefixes</h5>
<p>The top 10,000 most-queried prefixes are cached at the CDN edge with a 5-minute TTL. These cover the vast majority of traffic (power law distribution). Cache hit rate for autocomplete is typically 80–90%.</p>
</div>
<div class="algo-card">
<h5>Filter service</h5>
<p>A blocking list and ML classifier sit between the trie results and the user. Adult content, illegal queries, and defamatory autocompletes are removed. This runs in microseconds using a separate in-memory set.</p>
</div>
</div>

---

## 8. Level 7 — Personalization Layer

After retrieving the global top-5 from the trie, a personalization service re-ranks suggestions using per-user signals. The final score for a suggestion is a weighted blend:

<div class="code-wrap">
<div class="code-lang">Python — re-ranking formula<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="nm">personal_score</span>(suggestion, user_ctx) <span class="op">-&gt;</span> <span class="ty">float</span>:
    <span class="cm"># Base: global frequency (log-scaled to prevent dominance)</span>
    base   <span class="op">=</span> math.log1p(suggestion.global_freq)

    <span class="cm"># Boost: user searched this exact query in the last 30 days</span>
    hist   <span class="op">=</span> <span class="nu">3.0</span> <span class="kw">if</span> suggestion.query <span class="kw">in</span> user_ctx.recent_queries <span class="kw">else</span> <span class="nu">1.0</span>

    <span class="cm"># Boost: query matches user's primary language</span>
    lang   <span class="op">=</span> <span class="nu">1.5</span> <span class="kw">if</span> suggestion.language <span class="op">==</span> user_ctx.language <span class="kw">else</span> <span class="nu">0.8</span>

    <span class="cm"># Boost: query is trending in user's geographic region</span>
    geo    <span class="op">=</span> <span class="nu">1.3</span> <span class="kw">if</span> suggestion.region <span class="op">==</span> user_ctx.region <span class="kw">else</span> <span class="nu">1.0</span>

    <span class="kw">return</span> base <span class="op">*</span> hist <span class="op">*</span> lang <span class="op">*</span> geo</pre>
</div>

{: class="marginalia" }
"Personalization is the reason<br/>your autocomplete differs from<br/>your colleague's — the global<br/>trie is identical, but the<br/>re-ranking layer is per-user."

User history is stored as a Redis list (per user, capped at 100 recent queries). This lookup adds ~1ms of latency — acceptable because it runs in parallel with the trie lookup.

The re-ranking step takes the global top-15 (not top-5), re-scores each, and returns the best 5. Expanding from 5 to 15 at the trie stage increases the chance that a personalized result bubbles up to the final list.

---

## 9. Level 8 — Distributed Trie Sharding

A single trie for all languages and all queries cannot fit in one machine's RAM. English alone has hundreds of millions of unique search queries.

**Sharding strategies:**

<div class="ac-card">
<h4>Shard-by-first-character (simplest)</h4>
<p style="color:rgba(255,255,255,.72);font-size:.9rem;line-height:1.65;margin:.3rem 0 0;">26 shards for a-z, plus one for digits/symbols. A query "system" goes to shard S. Shard S holds all tries for prefixes starting with 's'. Simple, predictable routing. Problem: letters are not uniformly distributed — 's' and 'c' get far more traffic than 'x' and 'q'. Requires over-provisioning hot shards or secondary sharding by prefix length (s1–s3, s4–s6, ...).</p>
</div>

<div class="ac-card">
<h4>Shard-by-language (recommended)</h4>
<p style="color:rgba(255,255,255,.72);font-size:.9rem;line-height:1.65;margin:.3rem 0 0;">Each language gets its own trie cluster. English, Chinese, Spanish, Arabic, Japanese, etc. The user's Accept-Language header routes to the right cluster. This also makes personalization easier (language is already known). Drawback: small languages get underprovisioned or under-served.</p>
</div>

<div class="ac-card">
<h4>Consistent hashing by prefix</h4>
<p style="color:rgba(255,255,255,.72);font-size:.9rem;line-height:1.65;margin:.3rem 0 0;">Hash the first 3 characters of the prefix to select a node. Virtual nodes handle uneven distribution. Adding/removing nodes causes minimal reshuffling. This is the most flexible approach but requires a coordination layer (ZooKeeper or etcd) to maintain the ring mapping.</p>
</div>

Each shard runs as a separate service. The autocomplete API gateway fans out to 1 shard (deterministic routing), so there is **no fan-out latency problem**. The shard count can scale independently as the query volume grows.

---

## 10. Live Autocomplete Demo

<div id="live-demo">
  <h4>🔍 Try It — Real Trie in Your Browser</h4>
  <div class="live-search-wrap">
    <input class="live-search-input" id="liveInput" placeholder="Type a tech term…" autocomplete="off" spellcheck="false"/>
    <div class="live-dropdown" id="liveDropdown"></div>
  </div>
  <div class="live-meta" id="liveMeta">Start typing to search 50 pre-loaded tech terms.</div>
</div>

---

## 11. Latency vs Freshness Trade-off

<div class="ac-card">
<h4>Update Frequency Comparison</h4>
<table class="compare-table">
<thead>
<tr>
<th>Update Frequency</th>
<th>Freshness</th>
<th>Memory Overhead</th>
<th>Complexity</th>
<th>Used By</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Real-time</strong></td>
<td><span class="yes">Perfect</span></td>
<td><span class="no">Very High</span></td>
<td><span class="no">High</span></td>
<td>Twitter trending</td>
</tr>
<tr>
<td><strong>Every minute</strong></td>
<td><span class="yes">Near-real-time</span></td>
<td><span class="part">Medium</span></td>
<td><span class="part">Medium</span></td>
<td>News sites</td>
</tr>
<tr>
<td><strong>Every hour</strong> <span class="pill pill-green">recommended</span></td>
<td><span class="part">Slightly stale</span></td>
<td><span class="yes">Low</span></td>
<td><span class="yes">Easy</span></td>
<td>Google, Bing</td>
</tr>
<tr>
<td><strong>Daily rebuild</strong></td>
<td><span class="no">Stale</span></td>
<td><span class="yes">Minimal</span></td>
<td><span class="yes">Simplest</span></td>
<td>Internal tools</td>
</tr>
</tbody>
</table>
<p style="font-size:.88rem;color:rgba(255,255,255,.6);margin:.6rem 0 0;line-height:1.65;">The hybrid approach — hourly trie + real-time Redis layer — gives near-real-time freshness for trending topics while keeping the main trie simple and cheap to operate.</p>
</div>

---

## Summary — The Escalation Ladder

| Level | Approach | Lookup | Memory | Freshness |
|-------|----------|--------|--------|-----------|
| 1 | SQL `LIKE` | O(log N + K) | DB | Real-time |
| 2 | In-memory Trie | O(P + subtree) | ~1 GB/100M words | Hourly |
| 3 | Trie + frequency | O(P + subtree + K log K) | ~1 GB | Hourly |
| 4 | Radix tree | O(P + subtree) | ~400 MB | Hourly |
| 5 | Top-K cache | **O(P)** | ~9 GB | Hourly |
| 6 | Distributed | O(P) | Horizontal | Hourly + Redis |
| 7 | Personalized | O(P) + 1ms re-rank | Per-user Redis | Hourly + real-time |

The interview answer is almost never "Level 1". Start at Level 3 (trie with frequency), explain why, then escalate only when the interviewer pushes on scale.

---

<script>
/* ══════════════════════════════════════════
   COPY BUTTON
══════════════════════════════════════════ */
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.textContent = 'copy';
      btn.classList.remove('copied');
    }, 1800);
  });
}

/* ══════════════════════════════════════════
   TRIE IMPLEMENTATION (shared)
══════════════════════════════════════════ */
function TrieNode() {
  this.children  = {};
  this.isEnd     = false;
  this.frequency = 0;
}

function TrieDS() {
  this.root = new TrieNode();
}

TrieDS.prototype.insert = function(word, freq) {
  var node = this.root;
  for (var i = 0; i < word.length; i++) {
    var ch = word[i];
    if (!node.children[ch]) node.children[ch] = new TrieNode();
    node = node.children[ch];
  }
  node.isEnd     = true;
  node.frequency = freq || 1;
};

TrieDS.prototype.search = function(prefix, k) {
  k = k || 5;
  var node = this.root;
  for (var i = 0; i < prefix.length; i++) {
    var ch = prefix[i];
    if (!node.children[ch]) return [];
    node = node.children[ch];
  }
  var results = [];
  var self = this;
  function dfs(n, cur) {
    if (n.isEnd) results.push({ word: cur, freq: n.frequency });
    var keys = Object.keys(n.children);
    for (var i = 0; i < keys.length; i++) dfs(n.children[keys[i]], cur + keys[i]);
  }
  dfs(node, prefix);
  results.sort(function(a, b) { return b.freq - a.freq; });
  return results.slice(0, k);
};

/* ── prefix path helper ── */
TrieDS.prototype.prefixNodes = function(prefix) {
  var path = [this.root];
  var node = this.root;
  for (var i = 0; i < prefix.length; i++) {
    var ch = prefix[i];
    if (!node.children[ch]) return path;
    node = node.children[ch];
    path.push(node);
  }
  return path;
};

/* ══════════════════════════════════════════
   TRIE VISUALISER
══════════════════════════════════════════ */
var vizTrie = new TrieDS();
var VIZ_WORDS = [
  ['system', 92000], ['systems', 110000], ['swift', 75000],
  ['swim', 22000], ['sync', 48000], ['syslog', 44000], ['syntax', 61000]
];
for (var _w = 0; _w < VIZ_WORDS.length; _w++) {
  vizTrie.insert(VIZ_WORDS[_w][0], VIZ_WORDS[_w][1]);
}

var activePrefix = '';

function buildLayout(root) {
  /* BFS, assign (x, y) positions to each node */
  var nodes = [];
  var edges = [];
  var queue = [{ node: root, ch: '', depth: 0, parent: -1 }];
  var idCounter = 0;

  /* First pass: build node list with parent links */
  while (queue.length > 0) {
    var item = queue.shift();
    var id   = idCounter++;
    nodes.push({
      id: id,
      ch: item.ch,
      node: item.node,
      depth: item.depth,
      parent: item.parent,
      x: 0, y: 0
    });
    if (item.parent >= 0) {
      edges.push({ from: item.parent, to: id, ch: item.ch });
    }
    var chs = Object.keys(item.node.children).sort();
    for (var ci = 0; ci < chs.length; ci++) {
      queue.push({
        node:   item.node.children[chs[ci]],
        ch:     chs[ci],
        depth:  item.depth + 1,
        parent: id
      });
    }
  }

  /* Assign leaf-order x positions */
  var maxDepth = 0;
  for (var ni = 0; ni < nodes.length; ni++) {
    if (nodes[ni].depth > maxDepth) maxDepth = nodes[ni].depth;
  }

  /* leaves first */
  var leafX = 0;
  function assignX(id) {
    var n = nodes[id];
    var children = edges.filter(function(e) { return e.from === id; });
    if (children.length === 0) {
      n.x = leafX++;
    } else {
      var sum = 0;
      for (var ci = 0; ci < children.length; ci++) {
        assignX(children[ci].to);
        sum += nodes[children[ci].to].x;
      }
      n.x = sum / children.length;
    }
  }
  assignX(0);

  var PAD_X = 44, PAD_Y = 60, TOP = 30;
  for (var ni = 0; ni < nodes.length; ni++) {
    nodes[ni].x = nodes[ni].x * PAD_X + 24;
    nodes[ni].y = TOP + nodes[ni].depth * PAD_Y;
  }

  return { nodes: nodes, edges: edges, leafCount: leafX };
}

function renderTrie() {
  var canvas = document.getElementById('trie-canvas');
  var ctx    = canvas.getContext('2d');
  var prefix = document.getElementById('trieSearchInput').value.trim().toLowerCase();
  activePrefix = prefix;

  var layout = buildLayout(vizTrie.root);
  var nodes  = layout.nodes;
  var edges  = layout.edges;

  /* resize canvas */
  var W = Math.max(780, layout.leafCount * 44 + 48);
  var depths = nodes.map(function(n) { return n.depth; });
  var maxD   = depths.reduce(function(a, b) { return Math.max(a, b); }, 0);
  var H      = 30 + (maxD + 1) * 60 + 20;
  canvas.width  = W;
  canvas.height = H;
  document.getElementById('trie-canvas').style.width = Math.min(W, 760) + 'px';

  ctx.clearRect(0, 0, W, H);

  /* determine highlighted path */
  var highlightedIds = new Set();
  var cur = vizTrie.root;
  if (prefix.length > 0) {
    highlightedIds.add(0);
    for (var pi = 0; pi < prefix.length; pi++) {
      var ch = prefix[pi];
      if (!cur.children[ch]) break;
      cur = cur.children[ch];
      /* find node id */
      for (var ni = 0; ni < nodes.length; ni++) {
        if (nodes[ni].node === cur) { highlightedIds.add(nodes[ni].id); break; }
      }
    }
  }

  /* draw edges */
  for (var ei = 0; ei < edges.length; ei++) {
    var e  = edges[ei];
    var fn = nodes[e.from];
    var tn = nodes[e.to];
    var highlighted = highlightedIds.has(fn.id) && highlightedIds.has(tn.id);
    ctx.beginPath();
    ctx.moveTo(fn.x, fn.y);
    ctx.lineTo(tn.x, tn.y);
    ctx.strokeStyle = highlighted ? '#7bcdab' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = highlighted ? 2.5 : 1.2;
    ctx.stroke();
  }

  /* draw nodes */
  for (var ni = 0; ni < nodes.length; ni++) {
    var n          = nodes[ni];
    var isHighlight = highlightedIds.has(n.id);
    var r          = n.depth === 0 ? 16 : 14;

    /* circle */
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    if (isHighlight) {
      ctx.fillStyle = 'rgba(123,205,171,0.25)';
      ctx.strokeStyle = '#7bcdab';
      ctx.lineWidth   = 2;
    } else {
      ctx.fillStyle = '#1a1b1f';
      ctx.strokeStyle = '#3a3b40';
      ctx.lineWidth   = 1.5;
    }
    ctx.fill();
    ctx.stroke();

    /* character label */
    ctx.fillStyle   = isHighlight ? '#fbef8a' : 'rgba(255,255,255,0.75)';
    ctx.font        = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.depth === 0 ? '●' : n.ch, n.x, n.y);

    /* end-of-word star */
    if (n.node.isEnd) {
      ctx.fillStyle = '#fbef8a';
      ctx.font      = '9px sans-serif';
      ctx.fillText('★', n.x + r - 4, n.y - r + 4);
    }
  }

  /* update suggestions */
  var sugBox = document.getElementById('trieSuggestions');
  sugBox.innerHTML = '';
  var statusEl = document.getElementById('trieStatus');

  if (prefix.length > 0) {
    var results = vizTrie.search(prefix, 5);
    if (results.length === 0) {
      statusEl.textContent = 'No completions found for "' + prefix + '".';
    } else {
      statusEl.textContent = 'Top ' + results.length + ' completions for "' + prefix + '":';
      for (var ri = 0; ri < results.length; ri++) {
        var r     = results[ri];
        var div   = document.createElement('div');
        div.className = 'trie-sug-item';
        var pfx   = '<span class="match-prefix">' + prefix + '</span>';
        var rest  = r.word.slice(prefix.length);
        div.innerHTML = pfx + rest + ' <span style="color:rgba(255,255,255,.3);font-size:11px;">(' + r.freq.toLocaleString() + ')</span>';
        sugBox.appendChild(div);
      }
    }
  } else {
    statusEl.textContent = 'Pre-loaded with ' + VIZ_WORDS.length + ' words. Type a prefix to explore.';
  }
}

function trieInsertWord() {
  var val = document.getElementById('trieInsertInput').value.trim().toLowerCase();
  if (!val || val.length < 2) return;
  vizTrie.insert(val, Math.floor(Math.random() * 50000) + 1000);
  document.getElementById('trieInsertInput').value = '';
  renderTrie();
}

function trieReset() {
  vizTrie = new TrieDS();
  for (var _w = 0; _w < VIZ_WORDS.length; _w++) {
    vizTrie.insert(VIZ_WORDS[_w][0], VIZ_WORDS[_w][1]);
  }
  document.getElementById('trieSearchInput').value = '';
  renderTrie();
}

document.getElementById('trieSearchInput').addEventListener('input', renderTrie);
document.addEventListener('DOMContentLoaded', renderTrie);
setTimeout(renderTrie, 100);

/* ══════════════════════════════════════════
   ARCHITECTURE DIAGRAM
══════════════════════════════════════════ */
(function() {
  var canvas = document.getElementById('arch-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 760, H = 360;
  canvas.width  = W;
  canvas.height = H;

  /* Component definitions */
  var comps = [
    { id: 'client',     x:  30, y: 155, w: 90,  h: 44, color: '#7bcdab', label: 'Browser',
      desc: '<strong>Browser / Client</strong> — Every keystroke fires a debounced request (50–100ms delay to avoid a request per character). The browser also caches the last few prefix responses locally so backspace feels instant.' },
    { id: 'cdn',        x: 165, y: 155, w: 90,  h: 44, color: '#fbef8a', label: 'CDN',
      desc: '<strong>CDN Edge Cache</strong> — The top 10,000 most-queried prefixes are cached at the CDN with a 5-minute TTL. This absorbs 80–90% of all autocomplete traffic before it touches your origin servers. Cache key = (prefix + language).' },
    { id: 'lb',         x: 300, y: 155, w: 90,  h: 44, color: '#7bcdab', label: 'Load Balancer',
      desc: '<strong>Load Balancer</strong> — Routes traffic to autocomplete service nodes. Uses consistent hashing on prefix so the same prefix always hits the same (or nearby) node, improving local in-process cache hit rate.' },
    { id: 'svc',        x: 435, y: 155, w: 110, h: 44, color: '#cc99cd', label: 'Autocomplete Svc',
      desc: '<strong>Autocomplete Service</strong> — Stateless Go/Java service. On each request: (1) query in-memory trie for top-15, (2) query Redis for real-time trending, (3) merge and re-rank, (4) return top-5. Target p99 latency: &lt;15ms.' },
    { id: 'trie',       x: 360, y: 280, w: 90,  h: 40, color: '#f08080', label: 'In-Memory Trie',
      desc: '<strong>In-Memory Trie</strong> — Loaded entirely into RAM (~2–8 GB depending on language). Updated hourly by atomically swapping a pointer to a new trie. The radix tree with top-K caching at every node delivers O(prefix_length) lookups.' },
    { id: 'redis',      x: 500, y: 280, w: 90,  h: 40, color: '#f08080', label: 'Redis (trending)',
      desc: '<strong>Redis Sorted Set</strong> — Stores every query seen in the last 60 minutes, scored by recency-weighted count. ZINCRBY on write, ZREVRANGE on read. Used to surface trending queries that the hourly trie does not yet know about.' },
    { id: 'kafka',      x: 600, y: 155, w: 80,  h: 44, color: '#fbef8a', label: 'Kafka',
      desc: '<strong>Kafka</strong> — Every search event is published to a "search-events" topic. Topics are partitioned by user_id. This decouples the search service from the data pipeline completely.' },
    { id: 'spark',      x: 640, y: 275, w: 80,  h: 44, color: '#7bcdab', label: 'Spark / Agg',
      desc: '<strong>Spark Aggregator</strong> — Reads the Kafka topic hourly. Counts query frequencies, applies dampening for old queries, removes offensive content, and outputs a sorted (query, frequency) file to object storage.' },
    { id: 'store',      x: 680, y: 155, w: 0,   h: 0,  color: 'transparent', label: '',
      desc: '' }, /* placeholder to keep indexes aligned */
    { id: 'builder',    x: 710, y: 275, w: 0,   h: 0,  color: 'transparent', label: '', desc: '' }
  ];

  var arrows = [
    { from: 'client', to: 'cdn',    label: 'HTTPS' },
    { from: 'cdn',    to: 'lb',     label: 'cache miss' },
    { from: 'lb',     to: 'svc',    label: '' },
    { from: 'svc',    to: 'trie',   label: 'read' },
    { from: 'svc',    to: 'redis',  label: 'merge' },
    { from: 'svc',    to: 'kafka',  label: 'log event' },
    { from: 'kafka',  to: 'spark',  label: 'stream' },
  ];

  /* helper: find comp center */
  function cx(id) {
    var c = comps.find(function(c) { return c.id === id; });
    return c ? c.x + c.w / 2 : 0;
  }
  function cy(id) {
    var c = comps.find(function(c) { return c.id === id; });
    return c ? c.y + c.h / 2 : 0;
  }

  function drawArrow(x1, y1, x2, y2) {
    var headlen = 8;
    var angle   = Math.atan2(y2 - y1, x2 - x1);
    var r       = 8;
    var sx = x1 + r * Math.cos(angle);
    var sy = y1 + r * Math.sin(angle);
    var ex = x2 - r * Math.cos(angle);
    var ey = y2 - r * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headlen * Math.cos(angle - Math.PI / 6), ey - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(ex - headlen * Math.cos(angle + Math.PI / 6), ey - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();
  }

  function draw(hoveredId) {
    ctx.clearRect(0, 0, W, H);

    /* draw arrows */
    for (var ai = 0; ai < arrows.length; ai++) {
      var a = arrows[ai];
      if (!comps.find(function(c){return c.id===a.from;}).w) continue;
      drawArrow(cx(a.from), cy(a.from), cx(a.to), cy(a.to));
      /* arrow label */
      if (a.label) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.font      = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        var lx = (cx(a.from) + cx(a.to)) / 2;
        var ly = (cy(a.from) + cy(a.to)) / 2 - 6;
        ctx.fillText(a.label, lx, ly);
      }
    }

    /* draw components */
    for (var ci = 0; ci < comps.length; ci++) {
      var comp = comps[ci];
      if (!comp.w) continue;
      var isHover = comp.id === hoveredId;

      /* box */
      ctx.beginPath();
      ctx.roundRect(comp.x, comp.y, comp.w, comp.h, 8);
      ctx.fillStyle   = isHover ? 'rgba(123,205,171,0.18)' : '#1a1b1f';
      ctx.strokeStyle = isHover ? comp.color : '#2e2f35';
      ctx.lineWidth   = isHover ? 2 : 1.5;
      ctx.fill();
      ctx.stroke();

      /* label */
      ctx.fillStyle    = isHover ? comp.color : 'rgba(255,255,255,0.72)';
      ctx.font         = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(comp.label, comp.x + comp.w / 2, comp.y + comp.h / 2);
    }

    /* legend */
    ctx.fillStyle    = 'rgba(255,255,255,0.2)';
    ctx.font         = '11px sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Click any box for details', 10, H - 8);
  }

  draw(null);

  canvas.addEventListener('click', function(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width  / rect.width;
    var scaleY = canvas.height / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top)  * scaleY;
    for (var ci = 0; ci < comps.length; ci++) {
      var comp = comps[ci];
      if (!comp.w || !comp.desc) continue;
      if (mx >= comp.x && mx <= comp.x + comp.w && my >= comp.y && my <= comp.y + comp.h) {
        document.getElementById('archDesc').innerHTML = comp.desc;
        draw(comp.id);
        return;
      }
    }
  });

  canvas.addEventListener('mousemove', function(e) {
    var rect   = canvas.getBoundingClientRect();
    var scaleX = canvas.width  / rect.width;
    var scaleY = canvas.height / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top)  * scaleY;
    var found = null;
    for (var ci = 0; ci < comps.length; ci++) {
      var comp = comps[ci];
      if (!comp.w) continue;
      if (mx >= comp.x && mx <= comp.x + comp.w && my >= comp.y && my <= comp.y + comp.h) {
        found = comp.id;
        break;
      }
    }
    canvas.style.cursor = found ? 'pointer' : 'default';
    draw(found);
  });
})();

/* ══════════════════════════════════════════
   LIVE AUTOCOMPLETE DEMO
══════════════════════════════════════════ */
(function() {
  var TECH_TERMS = [
    ['javascript', 980000], ['java', 850000], ['python', 920000],
    ['postgresql', 310000], ['redis', 420000], ['rabbitmq', 180000],
    ['react', 760000], ['rust', 390000], ['ruby', 340000],
    ['reactnative', 220000], ['redis cluster', 90000],
    ['kubernetes', 510000], ['kafka', 370000], ['kotlin', 280000],
    ['graphql', 310000], ['golang', 440000], ['git', 880000],
    ['github', 920000], ['gradle', 195000], ['grpc', 210000],
    ['docker', 680000], ['django', 315000], ['dynamodb', 200000],
    ['elasticsearch', 350000], ['express', 410000],
    ['node', 730000], ['nginx', 460000], ['nosql', 280000],
    ['mysql', 590000], ['mongodb', 480000],
    ['typescript', 620000], ['terraform', 310000],
    ['vue', 520000], ['vuejs', 490000],
    ['swift', 380000], ['svelte', 160000], ['spark', 290000],
    ['postgresql index', 75000], ['python list comprehension', 120000],
    ['kubernetes pod', 88000], ['kafka consumer group', 65000],
    ['redis sorted set', 72000], ['react hooks', 310000],
    ['docker compose', 270000], ['git rebase', 195000],
    ['aws lambda', 340000], ['azure', 380000], ['angular', 510000],
    ['ansible', 230000], ['apache', 420000]
  ];

  var liveTrie = new TrieDS();
  for (var i = 0; i < TECH_TERMS.length; i++) {
    liveTrie.insert(TECH_TERMS[i][0], TECH_TERMS[i][1]);
  }

  var liveInput    = document.getElementById('liveInput');
  var liveDropdown = document.getElementById('liveDropdown');
  var liveMeta     = document.getElementById('liveMeta');
  var selIdx       = -1;

  function updateDropdown() {
    var val = liveInput.value.trim().toLowerCase();
    liveDropdown.innerHTML = '';
    selIdx = -1;

    if (!val) {
      liveDropdown.classList.remove('open');
      liveMeta.textContent = 'Start typing to search ' + TECH_TERMS.length + ' pre-loaded tech terms.';
      return;
    }

    var t0      = performance.now();
    var results = liveTrie.search(val, 5);
    var t1      = performance.now();
    var elapsed = (t1 - t0).toFixed(3);

    if (results.length === 0) {
      liveDropdown.classList.remove('open');
      liveMeta.textContent = 'No results for "' + val + '". Try: react, python, kubernetes…';
      return;
    }

    for (var ri = 0; ri < results.length; ri++) {
      var r    = results[ri];
      var item = document.createElement('div');
      item.className = 'live-drop-item';
      var pfxHtml  = '<span class="hi">' + val + '</span>';
      var restHtml = r.word.slice(val.length);
      item.innerHTML = pfxHtml + restHtml;
      item.dataset.word = r.word;
      item.addEventListener('mousedown', function(ev) {
        ev.preventDefault();
        liveInput.value = this.dataset.word;
        liveDropdown.classList.remove('open');
        liveMeta.textContent = 'Selected: ' + this.dataset.word;
      });
      liveDropdown.appendChild(item);
    }

    liveDropdown.classList.add('open');
    liveMeta.textContent = 'Showing ' + results.length + ' results — query time: ' + elapsed + 'ms';
  }

  liveInput.addEventListener('input', updateDropdown);

  liveInput.addEventListener('keydown', function(e) {
    var items = liveDropdown.querySelectorAll('.live-drop-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selIdx = Math.min(selIdx + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selIdx = Math.max(selIdx - 1, -1);
    } else if (e.key === 'Enter' && selIdx >= 0) {
      e.preventDefault();
      liveInput.value = items[selIdx].dataset.word;
      liveDropdown.classList.remove('open');
      liveMeta.textContent = 'Selected: ' + items[selIdx].dataset.word;
      return;
    } else if (e.key === 'Escape') {
      liveDropdown.classList.remove('open');
      return;
    }
    for (var ii = 0; ii < items.length; ii++) {
      items[ii].classList.toggle('selected', ii === selIdx);
    }
  });

  document.addEventListener('click', function(e) {
    if (!document.getElementById('live-demo').contains(e.target)) {
      liveDropdown.classList.remove('open');
    }
  });
})();
</script>
