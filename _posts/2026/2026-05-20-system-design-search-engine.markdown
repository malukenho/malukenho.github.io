---
layout: post
title: "System Design: Search Engine — Inverted Index, PageRank, and Query Processing at Scale"
date: 2026-05-20 10:00:00 +0000
categories: ["post"]
tags: [system-design, search, inverted-index, pagerank, elasticsearch, interview]
series: "System Design Interview Series"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series Finale</span>
  System Design Interview Prep &mdash; #15 of 15
</div>

{: class="marginalia" }
**Google's original PageRank<br/>paper (1998) titled<br/>"The Anatomy of a<br/>Large-Scale Hypertextual<br/>Web Search Engine"<br/>described an index of<br/>only 25 million pages.<br/>Today: 100 billion.**

Design Google Search. Users type queries; you must return the 10 most relevant web pages from an index of 100 billion pages in under 200ms. This is arguably the hardest system design problem in the canon — it touches nearly every concept we have covered in this series.

**The question:** *Design a search engine like Google. Users type queries; return the 10 most relevant results from 100 billion indexed pages in under 200ms.*

---

<style>
.series-badge { display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem; }
.series-badge strong { color:#fbef8a; }

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
.viz-controls { display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1.2rem; }
.viz-btn { padding:6px 14px;border-radius:6px;border:1px solid #3a3b40;background:#1a1b1f;color:rgba(255,255,255,.75);font-size:.8rem;cursor:pointer;transition:all .2s;font-family:inherit; }
.viz-btn:hover { border-color:#7bcdab;color:#7bcdab; }
.viz-btn.active { border-color:#fbef8a;color:#fbef8a;background:#1e1d08; }
.viz-btn.run { background:#7bcdab;color:#19191c;border:none;border-radius:8px;font-weight:700;padding:.5rem 1.2rem;cursor:pointer; }
.viz-btn.run:hover { background:#5eb896; }

.stat-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin:1.5rem 0; }
.stat-card { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1.5rem;text-align:center; }
.stat-num  { font-size:1.6rem;font-weight:800;color:#fbef8a;display:block;line-height:1.2; }
.stat-lbl  { font-size:.74rem;color:rgba(255,255,255,.45);margin-top:.3rem;text-transform:uppercase;letter-spacing:.07em; }

.pipeline-row { display:flex;gap:.5rem;flex-wrap:wrap;margin:1.5rem 0;align-items:stretch; }
.pipeline-box { flex:1;min-width:90px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:.7rem .6rem;text-align:center;cursor:pointer;transition:all .2s;font-size:.72rem;color:rgba(255,255,255,.75); }
.pipeline-box:hover,.pipeline-box.active { background:#1d2e24;border-color:#7bcdab;color:#7bcdab; }
.pipeline-box .pnum { display:block;font-size:1.1rem;font-weight:800;color:#fbef8a;margin-bottom:.3rem; }
.pipeline-arrow { display:flex;align-items:center;color:rgba(255,255,255,.25);font-size:1.1rem;flex-shrink:0; }
.pipeline-detail { background:#1a2e22;border:1px solid rgba(123,205,171,.25);border-radius:10px;padding:1.2rem;margin-top:.8rem;font-size:.84rem;line-height:1.7;color:rgba(255,255,255,.82);display:none; }
.pipeline-detail.show { display:block; }
.pipeline-detail strong { color:#fbef8a; }
.pipeline-detail .ex { font-family:"JetBrains Mono","Fira Code",monospace;font-size:.78rem;color:#7bcdab;background:#111214;padding:2px 6px;border-radius:3px; }

.index-visual { background:#0e0f12;border:1px solid #2e2f35;border-radius:10px;padding:1.2rem;margin:1rem 0;font-family:"JetBrains Mono","Fira Code",monospace;font-size:.8rem;overflow-x:auto; }
.index-row { display:flex;gap:1rem;align-items:baseline;padding:.3rem 0;border-bottom:1px solid #1e2025; }
.index-term { color:#fbef8a;min-width:80px;font-weight:700; }
.index-arrow { color:rgba(255,255,255,.3); }
.index-posting { color:#7bcdab; }
.index-posting .doc-match { background:#1a2e22;border-radius:3px;padding:1px 5px; }

.doc-card { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:.9rem 1rem;margin:.4rem 0;font-size:.83rem;line-height:1.6;cursor:pointer;transition:all .2s; }
.doc-card:hover { border-color:rgba(123,205,171,.4); }
.doc-card.matched { border-color:#7bcdab;background:#1a2e22; }
.doc-card.dim { opacity:.35; }
.doc-card .doc-id { font-size:.7rem;color:rgba(255,255,255,.4);margin-bottom:.2rem; }

.tfidf-bar-wrap { display:flex;align-items:center;gap:.8rem;margin:.4rem 0; }
.tfidf-bar-label { font-size:.78rem;color:rgba(255,255,255,.7);min-width:60px; }
.tfidf-bar-track { flex:1;background:#1e1f24;border-radius:4px;height:14px;overflow:hidden; }
.tfidf-bar-fill { height:100%;background:#7bcdab;border-radius:4px;transition:width .4s; }
.tfidf-bar-val { font-size:.75rem;color:#fbef8a;min-width:45px;text-align:right;font-family:"JetBrains Mono","Fira Code",monospace; }

.pr-canvas-wrap { position:relative;width:100%;max-width:520px;margin:0 auto; }

.trie-row { display:flex;gap:.5rem;flex-wrap:wrap;margin:.3rem 0; }
.trie-sug { background:rgba(123,205,171,.1);border:1px solid rgba(123,205,171,.25);border-radius:6px;padding:4px 10px;font-size:.8rem;color:#7bcdab;cursor:pointer;transition:all .2s; }
.trie-sug:hover { background:rgba(123,205,171,.2); }

.shard-row { display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;margin:1.2rem 0; }
.shard-box { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:.9rem;text-align:center;min-width:100px;position:relative;overflow:hidden; }
.shard-box .shard-label { font-size:.7rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.07em; }
.shard-box .shard-name { font-size:.95rem;color:#fbef8a;font-weight:700;margin:.3rem 0; }
.shard-box .shard-range { font-size:.72rem;color:#7bcdab; }
.shard-arrow-row { display:flex;justify-content:center;gap:.8rem;margin:.3rem 0; }
.shard-arrow { color:#7bcdab;font-size:1.2rem; }
</style>

## 1. Scale &amp; Constraints

Before designing anything, nail the numbers. Interviewers reward candidates who reason through scale before jumping to solutions.

<div class="stat-grid">
  <div class="stat-card"><span class="stat-num">8.5B</span><div class="stat-lbl">Searches / day</div></div>
  <div class="stat-card"><span class="stat-num">~100K</span><div class="stat-lbl">QPS peak</div></div>
  <div class="stat-card"><span class="stat-num">100B</span><div class="stat-lbl">Indexed pages</div></div>
  <div class="stat-card"><span class="stat-num">~1 PB</span><div class="stat-lbl">Raw crawled content</div></div>
  <div class="stat-card"><span class="stat-num">~100 TB</span><div class="stat-lbl">Compressed index</div></div>
  <div class="stat-card"><span class="stat-num">&lt;200ms</span><div class="stat-lbl">Latency target p99</div></div>
</div>

The constraints immediately rule out any naive approach. At 100K QPS and 100 billion pages, even a single microsecond per document would require 10<sup>11</sup> µs — about 27 hours — to scan everything for one query.

---

## 2. The Naïve Approach — Level 1

The instinct of every beginner: scan every document, check if it contains the query terms, return the matches.

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">linear_search</span>(query, documents):
    results = []
    <span class="kw">for</span> doc <span class="kw">in</span> documents:          <span class="cm"># iterate ALL 100 billion docs</span>
        <span class="kw">if</span> query <span class="kw">in</span> doc.text:
            results.<span class="fn">append</span>(doc)
    <span class="kw">return</span> results</pre>
</div>

**Why it fails:** O(N) per query. At 100 billion documents and 100K QPS, you need 10<sup>16</sup> operations per second. Even distributed across 10,000 servers you would need each server to scan 10<sup>12</sup> docs/second — physically impossible.

The correct answer reframes the problem: *precompute the mapping from words to documents at index time, then answer queries in O(1) lookups at query time.*

---

## 3. Inverted Index — Level 2

The inverted index is the core data structure of every search engine. Instead of document → words, it stores **word → list of documents** containing that word.

<div class="code-wrap">
<div class="code-lang">pseudocode</div>
<pre class="code-block"><span class="cm"># Forward index (what we want to avoid querying)</span>
doc1 → ["the", "quick", "brown", "fox"]
doc2 → ["the", "lazy", "dog", "sleeps"]

<span class="cm"># Inverted index (what we build at index time)</span>
"quick"  → [(doc1, freq:1, pos:[2]), (doc4, freq:1, pos:[1])]
"brown"  → [(doc1, freq:1, pos:[3]), (doc3, freq:1, pos:[1])]
"dog"    → [(doc2, freq:1, pos:[3]), (doc4, freq:1, pos:[2])]
"fox"    → [(doc1, freq:1, pos:[4])]
"lazy"   → [(doc2, freq:1, pos:[2])]</pre>
</div>

Each entry in the posting list stores:
- **docId** — which document
- **term frequency** — how often the term appears (relevance signal)
- **positions** — where in the document (enables phrase queries like `"quick brown fox"`)

**Multi-word query intersection:** Query "quick brown" → fetch posting list for "quick", fetch posting list for "brown", intersect by docId. Documents in both lists are candidates. This is O(k) where k is the size of the smaller posting list — typically tiny compared to the full corpus.

<div class="viz-wrap">
  <div class="viz-title">&#9654; Interactive Inverted Index Builder</div>

  <div id="doc-cards-area" style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:1rem;">
    <div class="doc-card" id="dc0"><div class="doc-id">doc1</div>The quick brown fox</div>
    <div class="doc-card" id="dc1"><div class="doc-id">doc2</div>The lazy dog sleeps</div>
    <div class="doc-card" id="dc2"><div class="doc-id">doc3</div>Brown bears eat fish</div>
    <div class="doc-card" id="dc3"><div class="doc-id">doc4</div>Quick dogs run fast</div>
  </div>

  <div class="viz-controls">
    <button class="viz-btn run" onclick="buildIndex()">Build Index</button>
    <button class="viz-btn" onclick="resetIndex()" style="margin-left:.3rem;">Reset</button>
  </div>

  <div id="index-result" style="display:none;">
    <div class="viz-title" style="margin-top:.8rem;">Resulting Inverted Index</div>
    <div class="index-visual" id="index-table"></div>

    <div style="margin-top:1.2rem;">
      <div class="viz-title">Search</div>
      <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;">
        <input id="search-input" placeholder="Type a word or two words..." style="background:#1a1b1f;border:1px solid #3a3b40;border-radius:6px;padding:.5rem .8rem;color:rgba(255,255,255,.85);font-size:.85rem;font-family:inherit;min-width:220px;" oninput="searchIndex(this.value)" />
        <span id="search-hint" style="font-size:.78rem;color:rgba(255,255,255,.4);"></span>
      </div>
    </div>
  </div>
</div>

<script>
var DOCS = [
  {id:"doc1", text:"The quick brown fox"},
  {id:"doc2", text:"The lazy dog sleeps"},
  {id:"doc3", text:"Brown bears eat fish"},
  {id:"doc4", text:"Quick dogs run fast"}
];
var STOPWORDS = ["the","a","an","and","or","of","in","is","are","was","were"];
var invertedIndex = {};

function tokenize(text) {
  return text.toLowerCase().split(/\s+/).filter(function(w){ return !STOPWORDS.includes(w); });
}

function buildIndex() {
  invertedIndex = {};
  var dcards = document.querySelectorAll('#doc-cards-area .doc-card');
  var i = 0;
  function processDoc() {
    if (i >= DOCS.length) {
      renderIndex();
      document.getElementById('index-result').style.display = 'block';
      return;
    }
    var doc = DOCS[i];
    var card = dcards[i];
    card.style.borderColor = '#fbef8a';
    card.style.background = '#25240e';
    var tokens = tokenize(doc.text);
    tokens.forEach(function(token, pos) {
      if (!invertedIndex[token]) invertedIndex[token] = [];
      var existing = invertedIndex[token].find(function(e){ return e.docId === doc.id; });
      if (existing) {
        existing.freq++;
        existing.pos.push(pos+1);
      } else {
        invertedIndex[token].push({docId: doc.id, freq: 1, pos: [pos+1]});
      }
    });
    i++;
    setTimeout(processDoc, 420);
  }
  processDoc();
}

function renderIndex() {
  var tbl = document.getElementById('index-table');
  var terms = Object.keys(invertedIndex).sort();
  var html = '';
  terms.forEach(function(term) {
    var postings = invertedIndex[term].map(function(e){
      return '<span class="doc-match">(' + e.docId + ', freq:' + e.freq + ', pos:[' + e.pos.join(',') + '])</span>';
    }).join(' ');
    html += '<div class="index-row"><span class="index-term">"' + term + '"</span><span class="index-arrow">→</span><span class="index-posting">' + postings + '</span></div>';
  });
  tbl.innerHTML = html;
}

function searchIndex(val) {
  var terms = val.toLowerCase().split(/\s+/).filter(function(t){ return t.length > 0 && !STOPWORDS.includes(t); });
  var dcards = document.querySelectorAll('#doc-cards-area .doc-card');
  var hint = document.getElementById('search-hint');

  dcards.forEach(function(c){ c.className = 'doc-card'; });
  if (terms.length === 0) { hint.textContent = ''; return; }

  var sets = terms.map(function(term) {
    var entry = invertedIndex[term];
    return entry ? entry.map(function(e){ return e.docId; }) : [];
  });

  var intersection = sets[0] ? sets[0].slice() : [];
  for (var k = 1; k < sets.length; k++) {
    intersection = intersection.filter(function(id){ return sets[k].includes(id); });
  }

  if (terms.length > 1) {
    hint.textContent = 'Intersecting ' + terms.length + ' posting lists → ' + intersection.length + ' match(es)';
  } else {
    hint.textContent = intersection.length + ' match(es)';
  }

  DOCS.forEach(function(doc, idx) {
    var card = dcards[idx];
    if (intersection.includes(doc.id)) {
      card.classList.add('matched');
    } else {
      card.classList.add('dim');
    }
  });
}

function resetIndex() {
  invertedIndex = {};
  document.getElementById('index-result').style.display = 'none';
  document.getElementById('search-input').value = '';
  var dcards = document.querySelectorAll('#doc-cards-area .doc-card');
  dcards.forEach(function(c){ c.className = 'doc-card'; c.style.borderColor=''; c.style.background=''; });
}
</script>

---

## 4. TF-IDF Ranking — Level 3

An inverted index tells you *which* documents contain a term. It does not tell you *how relevant* each document is. We need a scoring function.

{: class="marginalia" }
**TF-IDF was the dominant<br/>ranking signal from<br/>the 1970s through<br/>the mid-2000s. Modern<br/>engines layer PageRank,<br/>click-through data,<br/>and neural re-rankers<br/>on top — but TF-IDF<br/>remains in the mix.**

**TF (Term Frequency)** = how often the term appears in the document, normalized by document length:

<div class="code-wrap">
<div class="code-lang">formula</div>
<pre class="code-block">TF(t, d) = count(t in d) / total_words(d)

IDF(t)   = log( N / df(t) )
           where N = total documents, df(t) = documents containing t

Score(t, d) = TF(t, d) × IDF(t)</pre>
</div>

**Intuition:** A term that appears 20 times in a 100-word document (TF = 0.2) beats one that appears once in a 1,000-word document (TF = 0.001). But if the term appears in every document, IDF ≈ 0 and it contributes nothing — "the" has zero discriminating power.

<div class="viz-wrap">
  <div class="viz-title">&#9654; Interactive TF-IDF Calculator</div>
  <div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem;">
    <label style="font-size:.82rem;color:rgba(255,255,255,.6);">Select term:</label>
    <select id="tfidf-term" onchange="calcTFIDF(this.value)" style="background:#1a1b1f;border:1px solid #3a3b40;border-radius:6px;padding:.4rem .8rem;color:rgba(255,255,255,.85);font-size:.82rem;font-family:inherit;">
      <option value="">-- choose --</option>
      <option value="python">python</option>
      <option value="database">database</option>
      <option value="system">system</option>
      <option value="scale">scale</option>
      <option value="index">index</option>
    </select>
  </div>
  <div id="tfidf-result"></div>
</div>

<script>
var CORPUS = [
  {id:"Doc A", text:"python python python database system python scale python"},
  {id:"Doc B", text:"database system database index scale database query"},
  {id:"Doc C", text:"system design scale system distributed system index"},
  {id:"Doc D", text:"python index database python query python"},
  {id:"Doc E", text:"scale distributed system scale cache scale performance"}
];

function calcTFIDF(term) {
  var el = document.getElementById('tfidf-result');
  if (!term) { el.innerHTML = ''; return; }

  var scores = CORPUS.map(function(doc) {
    var words = doc.text.split(/\s+/);
    var cnt = words.filter(function(w){ return w === term; }).length;
    var tf = cnt / words.length;
    return {id: doc.id, cnt: cnt, tf: tf, words: words.length};
  });

  var df = scores.filter(function(s){ return s.cnt > 0; }).length;
  var N = CORPUS.length;
  var idf = df > 0 ? Math.log(N / df) : 0;

  var maxScore = Math.max.apply(null, scores.map(function(s){ return s.tf * idf; })) || 1;

  scores.sort(function(a,b){ return (b.tf*idf) - (a.tf*idf); });

  var html = '<div style="margin-bottom:.8rem;font-size:.8rem;color:rgba(255,255,255,.55);">';
  html += 'IDF("' + term + '") = log(' + N + ' / ' + df + ') = <span style="color:#fbef8a;font-weight:700;">' + idf.toFixed(4) + '</span>';
  html += '</div>';

  scores.forEach(function(s, rank) {
    var score = s.tf * idf;
    var pct = maxScore > 0 ? (score / maxScore * 100) : 0;
    html += '<div class="tfidf-bar-wrap">';
    html += '<span class="tfidf-bar-label">' + s.id + '</span>';
    html += '<div class="tfidf-bar-track"><div class="tfidf-bar-fill" style="width:' + pct.toFixed(1) + '%"></div></div>';
    html += '<span class="tfidf-bar-val">' + score.toFixed(4) + '</span>';
    html += '</div>';
  });

  el.innerHTML = html;
}
</script>

---

## 5. PageRank — Level 4

TF-IDF ranks documents by term relevance, but misses a crucial signal: **authority**. A page linked to by thousands of trusted sites is more authoritative than an obscure page that happens to use the query term 50 times.

PageRank models a *random surfer*: someone who clicks random links forever. The fraction of time the surfer spends on a page is that page's rank.

<div class="code-wrap">
<div class="code-lang">formula</div>
<pre class="code-block">PR(A) = (1 - d) / N  +  d × Σ( PR(Bi) / OutLinks(Bi) )

where:
  d     = damping factor (0.85) — probability surfer follows a link
  N     = total pages
  Bi    = pages that link TO page A
  1-d   = probability surfer jumps to a random page</pre>
</div>

{: class="marginalia" }
**Elasticsearch uses Lucene<br/>under the hood. Lucene's<br/>inverted index is built<br/>from immutable "segments".<br/>Updates write new segments;<br/>a background merge process<br/>compacts small segments<br/>into larger ones —<br/>same idea as LSM trees.**

The formula is iterated until convergence (typically 50–100 iterations on the full web graph). The key insight: **a link from a high-PR page is worth more than a link from a low-PR page**, creating a recursive, self-referencing quality signal.

<div class="viz-wrap">
  <div class="viz-title">&#9654; Interactive PageRank Visualizer</div>
  <canvas id="pr-canvas" width="520" height="340" style="width:100%;max-width:520px;display:block;margin:0 auto;border-radius:8px;background:#0e0f12;cursor:crosshair;"></canvas>
  <div class="viz-controls" style="margin-top:.8rem;justify-content:center;">
    <button class="viz-btn run" onclick="runPageRank()">Run PageRank (5 iterations)</button>
    <button class="viz-btn" onclick="resetPR()" style="margin-left:.5rem;">Reset</button>
  </div>
  <div id="pr-hint" style="font-size:.78rem;color:rgba(255,255,255,.4);text-align:center;margin-top:.4rem;">Click a node, then click another to add a link. Then re-run.</div>
  <div id="pr-ranks" style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;margin-top:.8rem;"></div>
</div>

<script>
var PR_NODES = [
  {id:0,label:"A",x:130,y:80,rank:1},
  {id:1,label:"B",x:300,y:60,rank:1},
  {id:2,label:"C",x:460,y:100,rank:1},
  {id:3,label:"D",x:80,y:200,rank:1},
  {id:4,label:"E",x:260,y:180,rank:1},
  {id:5,label:"F",x:430,y:220,rank:1},
  {id:6,label:"G",x:160,y:300,rank:1},
  {id:7,label:"H",x:370,y:310,rank:1}
];
var PR_EDGES = [
  [0,1],[0,4],[1,2],[1,4],[2,5],[3,0],[3,4],
  [4,5],[4,7],[5,2],[6,3],[6,7],[7,5],[7,2]
];
var prSelectedNode = null;
var prDamping = 0.85;

function drawPR(topNodes) {
  var canvas = document.getElementById('pr-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  var maxR = Math.max.apply(null, PR_NODES.map(function(n){ return n.rank; }));

  PR_EDGES.forEach(function(e) {
    var a = PR_NODES[e[0]], b = PR_NODES[e[1]];
    var dx = b.x-a.x, dy = b.y-a.y;
    var dist = Math.sqrt(dx*dx+dy*dy);
    var r = 14 + (a.rank/maxR)*16;
    var ex = a.x + dx/dist*(dist-r-4);
    var ey = a.y + dy/dist*(dist-r-4);

    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(ex,ey);
    ctx.strokeStyle = 'rgba(123,205,171,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var ang = Math.atan2(dy,dx);
    ctx.beginPath();
    ctx.moveTo(ex,ey);
    ctx.lineTo(ex-8*Math.cos(ang-0.35),ey-8*Math.sin(ang-0.35));
    ctx.lineTo(ex-8*Math.cos(ang+0.35),ey-8*Math.sin(ang+0.35));
    ctx.closePath();
    ctx.fillStyle = 'rgba(123,205,171,0.5)';
    ctx.fill();
  });

  PR_NODES.forEach(function(n) {
    var r = 14 + (n.rank/maxR)*18;
    var isTop = topNodes && topNodes.includes(n.id);
    var isSel = prSelectedNode === n.id;

    ctx.beginPath();
    ctx.arc(n.x,n.y,r,0,Math.PI*2);
    ctx.fillStyle = isTop ? '#fbef8a' : (isSel ? '#7bcdab' : '#22222a');
    ctx.fill();
    ctx.strokeStyle = isTop ? '#fbef8a' : (isSel ? '#7bcdab' : 'rgba(255,255,255,0.15)');
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = isTop ? '#19191c' : 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.label, n.x, n.y);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px monospace';
    ctx.fillText(n.rank.toFixed(2), n.x, n.y+r+9);
  });
}

function runPageRank() {
  var N = PR_NODES.length;
  PR_NODES.forEach(function(n){ n.rank = 1/N; });
  var iter = 0;
  var topNodes = null;

  function step() {
    var newRanks = PR_NODES.map(function(){ return (1-prDamping)/N; });
    PR_NODES.forEach(function(n) {
      var outgoing = PR_EDGES.filter(function(e){ return e[0]===n.id; });
      if (outgoing.length === 0) return;
      outgoing.forEach(function(e) {
        newRanks[e[1]] += prDamping * (n.rank / outgoing.length);
      });
    });
    PR_NODES.forEach(function(n,i){ n.rank = newRanks[i]; });
    iter++;
    if (iter >= 5) {
      var sorted = PR_NODES.slice().sort(function(a,b){ return b.rank-a.rank; });
      topNodes = sorted.slice(0,3).map(function(n){ return n.id; });
      renderPRRanks(sorted);
    }
    drawPR(topNodes);
    if (iter < 5) setTimeout(step, 350);
  }
  step();
}

function renderPRRanks(sorted) {
  var el = document.getElementById('pr-ranks');
  var html = '';
  sorted.forEach(function(n,i) {
    var color = i < 3 ? '#fbef8a' : 'rgba(255,255,255,.6)';
    html += '<span style="font-size:.78rem;padding:3px 9px;border-radius:4px;background:rgba(255,255,255,.05);color:' + color + ';">';
    html += n.label + ': ' + n.rank.toFixed(3);
    html += '</span>';
  });
  el.innerHTML = html;
}

function resetPR() {
  PR_NODES.forEach(function(n){ n.rank = 1; });
  prSelectedNode = null;
  document.getElementById('pr-ranks').innerHTML = '';
  drawPR(null);
}

document.getElementById('pr-canvas').addEventListener('click', function(e) {
  var rect = e.target.getBoundingClientRect();
  var scaleX = e.target.width / rect.width;
  var scaleY = e.target.height / rect.height;
  var mx = (e.clientX - rect.left) * scaleX;
  var my = (e.clientY - rect.top) * scaleY;

  var clicked = null;
  PR_NODES.forEach(function(n) {
    var dx = n.x - mx, dy = n.y - my;
    if (Math.sqrt(dx*dx+dy*dy) < 28) clicked = n.id;
  });

  if (clicked === null) return;

  if (prSelectedNode === null) {
    prSelectedNode = clicked;
    drawPR(null);
    document.getElementById('pr-hint').textContent = 'Now click another node to create a link from ' + PR_NODES[clicked].label + '.';
  } else {
    if (prSelectedNode !== clicked) {
      var exists = PR_EDGES.some(function(e){ return e[0]===prSelectedNode && e[1]===clicked; });
      if (!exists) PR_EDGES.push([prSelectedNode, clicked]);
    }
    prSelectedNode = null;
    drawPR(null);
    document.getElementById('pr-hint').textContent = 'Link added! Click Run PageRank to update scores.';
  }
});

drawPR(null);
</script>

---

## 6. Web Crawler — Level 5

Before you can index anything, you need to fetch the web. A crawler is a distributed system in its own right.

**Crawl pipeline:**

1. **Seed URLs** → initial set of known good pages
2. **Frontier queue** → priority queue of URLs to fetch (prioritised by PageRank estimate, freshness)
3. **Fetcher** → HTTP request, store raw HTML to object storage
4. **Parser** → extract text content, outbound links
5. **Deduplicator** → SimHash/MinHash to detect near-duplicate pages
6. **URL normaliser** → canonicalise URLs, check robots.txt
7. **Enqueue** → add new URLs back to frontier

**Politeness constraints:** Respect `robots.txt`, enforce per-domain crawl delays (e.g. 1 req/sec per domain), rotate IPs, set proper `User-Agent`.

**Deduplication at scale:** A Bloom filter with 100 billion slots uses ~125 GB of memory — feasible on a cluster. SimHash reduces an entire document to a 64-bit fingerprint; Hamming distance &lt; 3 means near-duplicate.

<div class="viz-wrap">
  <div class="viz-title">&#9654; Crawl Simulator (BFS from seed node)</div>
  <div style="display:flex;gap:1rem;flex-wrap:wrap;">
    <div style="flex:1;min-width:180px;">
      <canvas id="crawl-canvas" width="340" height="280" style="width:100%;border-radius:8px;background:#0e0f12;"></canvas>
    </div>
    <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:.6rem;">
      <div>
        <div class="viz-title">Frontier Queue</div>
        <div id="crawl-frontier" style="background:#0e0f12;border-radius:6px;padding:.6rem;font-size:.75rem;min-height:60px;font-family:monospace;color:#7bcdab;"></div>
      </div>
      <div>
        <div class="viz-title">Visited Set</div>
        <div id="crawl-visited" style="background:#0e0f12;border-radius:6px;padding:.6rem;font-size:.75rem;min-height:60px;font-family:monospace;color:rgba(255,255,255,.6);"></div>
      </div>
      <div>
        <div class="viz-title">Skipped (robots.txt)</div>
        <div id="crawl-skipped" style="background:#0e0f12;border-radius:6px;padding:.6rem;font-size:.75rem;min-height:30px;font-family:monospace;color:#f08080;"></div>
      </div>
    </div>
  </div>
  <div class="viz-controls" style="margin-top:.8rem;">
    <button class="viz-btn run" onclick="startCrawl()">Start Crawl</button>
    <button class="viz-btn" onclick="resetCrawl()" style="margin-left:.5rem;">Reset</button>
  </div>
</div>

<script>
var CW_NODES = [
  {id:0,label:"Seed",x:170,y:140,robots:false},
  {id:1,label:"P1",x:80,y:60,robots:false},
  {id:2,label:"P2",x:260,y:55,robots:false},
  {id:3,label:"P3",x:50,y:180,robots:true},
  {id:4,label:"P4",x:300,y:170,robots:false},
  {id:5,label:"P5",x:110,y:250,robots:false},
  {id:6,label:"P6",x:240,y:250,robots:true},
  {id:7,label:"P7",x:170,y:35,robots:false},
  {id:8,label:"P8",x:320,y:80,robots:false},
  {id:9,label:"P9",x:40,y:110,robots:false}
];
var CW_EDGES = [
  [0,1],[0,2],[0,3],[1,4],[1,7],[2,8],[2,4],
  [3,5],[4,6],[4,9],[5,9],[7,2],[8,4],[9,5]
];
var crawlState = {visited:[], frontier:[], skipped:[], current:-1, active:false};

function drawCrawl() {
  var canvas = document.getElementById('crawl-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);

  CW_EDGES.forEach(function(e) {
    var a = CW_NODES[e[0]], b = CW_NODES[e[1]];
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
    ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1.2; ctx.stroke();
  });

  CW_NODES.forEach(function(n) {
    var isVisited = crawlState.visited.includes(n.id);
    var isCurrent = crawlState.current === n.id;
    var isSkipped = crawlState.skipped.includes(n.id);
    var isFrontier = crawlState.frontier.includes(n.id);

    ctx.beginPath(); ctx.arc(n.x,n.y,16,0,Math.PI*2);
    ctx.fillStyle = isCurrent ? '#fbef8a' : isSkipped ? '#3a1a1a' : isVisited ? '#1a3a2a' : isFrontier ? '#1a2e40' : '#1e1f24';
    ctx.fill();
    ctx.strokeStyle = isCurrent ? '#fbef8a' : isSkipped ? '#f08080' : isVisited ? '#7bcdab' : isFrontier ? '#5bafd6' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth=2; ctx.stroke();

    ctx.fillStyle = isCurrent ? '#19191c' : 'rgba(255,255,255,0.8)';
    ctx.font='bold 10px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(n.label,n.x,n.y);
    if (n.robots) {
      ctx.fillStyle='#f08080'; ctx.font='9px sans-serif';
      ctx.fillText('✗',n.x+12,n.y-12);
    }
  });
}

function updateCrawlUI() {
  document.getElementById('crawl-frontier').textContent = crawlState.frontier.map(function(id){ return CW_NODES[id].label; }).join(', ') || '(empty)';
  document.getElementById('crawl-visited').textContent = crawlState.visited.map(function(id){ return CW_NODES[id].label; }).join(', ') || '(none)';
  document.getElementById('crawl-skipped').textContent = crawlState.skipped.map(function(id){ return CW_NODES[id].label; }).join(', ') || '(none)';
}

function startCrawl() {
  if (crawlState.active) return;
  crawlState = {visited:[], frontier:[0], skipped:[], current:-1, active:true};
  drawCrawl(); updateCrawlUI();

  function step() {
    if (crawlState.frontier.length === 0) { crawlState.active=false; crawlState.current=-1; drawCrawl(); return; }
    var nodeId = crawlState.frontier.shift();
    crawlState.current = nodeId;
    drawCrawl(); updateCrawlUI();

    setTimeout(function() {
      var node = CW_NODES[nodeId];
      if (node.robots) {
        crawlState.skipped.push(nodeId);
      } else {
        crawlState.visited.push(nodeId);
        var neighbors = CW_EDGES.filter(function(e){ return e[0]===nodeId; }).map(function(e){ return e[1]; });
        neighbors.forEach(function(nid) {
          if (!crawlState.visited.includes(nid) && !crawlState.frontier.includes(nid) && !crawlState.skipped.includes(nid)) {
            crawlState.frontier.push(nid);
          }
        });
      }
      crawlState.current = -1;
      drawCrawl(); updateCrawlUI();
      setTimeout(step, 500);
    }, 500);
  }
  step();
}

function resetCrawl() {
  crawlState = {visited:[], frontier:[], skipped:[], current:-1, active:false};
  drawCrawl(); updateCrawlUI();
}

drawCrawl(); updateCrawlUI();
</script>

---

## 7. Query Processing Pipeline — Level 6

{: class="marginalia" }
**The "two-index" trick —<br/>large stable index plus<br/>small fresh delta index —<br/>was described in Google's<br/>Bigtable paper as "tablet<br/>compaction". Keep the<br/>fast path fast while<br/>absorbing writes in<br/>a smaller mutable index.**

A user's keypress triggers a 7-stage pipeline, all completing in under 200ms. Click each stage to expand its details:

<div class="pipeline-row" id="pipeline-row">
  <div class="pipeline-box" onclick="showPipe(0)"><span class="pnum">1</span>Query<br/>Parsing</div>
  <div class="pipeline-arrow">›</div>
  <div class="pipeline-box" onclick="showPipe(1)"><span class="pnum">2</span>Query<br/>Expansion</div>
  <div class="pipeline-arrow">›</div>
  <div class="pipeline-box" onclick="showPipe(2)"><span class="pnum">3</span>Index<br/>Lookup</div>
  <div class="pipeline-arrow">›</div>
  <div class="pipeline-box" onclick="showPipe(3)"><span class="pnum">4</span>Scoring<br/>&amp; Merge</div>
  <div class="pipeline-arrow">›</div>
  <div class="pipeline-box" onclick="showPipe(4)"><span class="pnum">5</span>Re-<br/>Ranking</div>
  <div class="pipeline-arrow">›</div>
  <div class="pipeline-box" onclick="showPipe(5)"><span class="pnum">6</span>Snippet<br/>Gen</div>
  <div class="pipeline-arrow">›</div>
  <div class="pipeline-box" onclick="showPipe(6)"><span class="pnum">7</span>Response</div>
</div>

<div class="pipeline-detail" id="pipe-detail"></div>

<script>
var PIPE_DATA = [
  {
    title: "1 — Query Parsing",
    body: '<strong>Input:</strong> raw user string. <strong>Steps:</strong> tokenise on whitespace, lowercase all tokens, remove stopwords ("the", "a", "is"), apply stemming ("running" → "run", "searches" → "search"). <strong>Result:</strong> a normalised list of query terms ready for index lookup.',
    ex: '"Running Python searches" → ["run", "python", "search"]'
  },
  {
    title: "2 — Query Expansion",
    body: '<strong>Synonyms:</strong> "car" also matches "automobile", "vehicle". <strong>Spelling correction:</strong> edit-distance lookup in a dictionary, "searh" → "search". <strong>Entity recognition:</strong> "NYC" → "New York City". Expansion increases recall but must be tuned to avoid noise.',
    ex: '"car accident" → ["car","automobile","vehicle","accident","crash"]'
  },
  {
    title: "3 — Index Lookup",
    body: '<strong>Fan-out:</strong> query is sent to all relevant index shards in parallel. Each shard returns its local top-K results with scores. Lookup is a B-tree or hash lookup into the posting lists — O(1) per term. With 1,000 shards, this means 1,000 parallel RPCs.',
    ex: 'Shard 1..1000 each return top-100 → coordinator merges 100,000 candidates'
  },
  {
    title: "4 — Scoring & Merge",
    body: '<strong>BM25</strong> (an improved TF-IDF variant) scores each (term, document) pair. <strong>PageRank</strong> score is fetched from a separate store and multiplied in. Posting lists for multi-term queries are intersected or scored with AND/OR logic. A priority queue keeps running top-K.',
    ex: 'score = BM25(doc, query) × 0.7 + PageRank(doc) × 0.3'
  },
  {
    title: "5 — Re-Ranking",
    body: '<strong>Classical retrieval</strong> returns top-100 candidates cheaply. A <strong>BERT-based neural re-ranker</strong> then scores these 100 using deep contextual understanding — far more accurate but ~100× more expensive per document. Personalisation signals (user history, location) and freshness boost are applied here.',
    ex: 'BERT re-ranker runs on top-100 only — not all 100B docs'
  },
  {
    title: "6 — Snippet Generation",
    body: '<strong>Purpose:</strong> show a 2-line excerpt from the document that contains the query terms so the user can judge relevance without clicking. <strong>Approach:</strong> find the passage with highest density of query terms, extract surrounding context, bold the matched terms.',
    ex: '"...the <b>quick brown fox</b> jumps over..." with query "quick brown fox"'
  },
  {
    title: "7 — Response",
    body: '<strong>Top-10 results</strong> are serialised: title, URL, snippet, PageRank score (hidden), timestamp. JSON response is ~5–10 KB. The entire pipeline completes in &lt;200ms p99. Query servers maintain long-lived connections to index shards to avoid TCP handshake overhead on every query.',
    ex: '[{title:"...", url:"...", snippet:"...", score:0.94}, ...]'
  }
];

function showPipe(i) {
  var boxes = document.querySelectorAll('.pipeline-box');
  boxes.forEach(function(b,j){ b.className = 'pipeline-box' + (j===i ? ' active' : ''); });
  var detail = document.getElementById('pipe-detail');
  var d = PIPE_DATA[i];
  detail.innerHTML = '<strong style="color:#fbef8a;">' + d.title + '</strong><br/><br/>' + d.body + '<br/><br/><span class="ex">' + d.ex + '</span>';
  detail.className = 'pipeline-detail show';
}
</script>

---

## 8. Distributed Index Sharding

A 100 TB index cannot live on one machine. We shard it — and the choice of sharding strategy matters enormously.

**Document partitioning** (Google's approach): each shard holds a contiguous range of document IDs. A query fans out to *all* shards in parallel; each returns its local top-K; a coordinator merges them.

**Term partitioning**: each shard owns a set of terms. Routing is complex (a multi-term query may need 3 different shards), but reduces fan-out for popular terms.

Google uses document partitioning because it simplifies fan-out and lets each shard independently maintain its own BM25 statistics.

<div class="viz-wrap">
  <div class="viz-title">Query fan-out across 4 index shards</div>
  <div style="text-align:center;font-size:.8rem;color:rgba(255,255,255,.5);margin-bottom:.8rem;">Query Server</div>
  <div style="text-align:center;font-size:1.2rem;color:#7bcdab;margin-bottom:.4rem;">⬇</div>
  <div class="shard-row">
    <div class="shard-box"><div class="shard-label">Shard</div><div class="shard-name">1</div><div class="shard-range">docId 0–25B</div></div>
    <div class="shard-box"><div class="shard-label">Shard</div><div class="shard-name">2</div><div class="shard-range">docId 25B–50B</div></div>
    <div class="shard-box"><div class="shard-label">Shard</div><div class="shard-name">3</div><div class="shard-range">docId 50B–75B</div></div>
    <div class="shard-box"><div class="shard-label">Shard</div><div class="shard-name">4</div><div class="shard-range">docId 75B–100B</div></div>
  </div>
  <div style="text-align:center;font-size:.75rem;color:rgba(255,255,255,.3);margin-top:.3rem;">Each returns local top-K → coordinator merges → global top-10</div>
</div>

**Replication:** each shard is replicated 3×. At 100 TB index × 3 replicas = 300 TB storage. Each shard replica can serve read queries independently, distributing the 100K QPS load.

---

## 9. Handling Updates &amp; Freshness

A breaking news story published 30 seconds ago should appear in search results. But rebuilding a 100 TB index takes days. How do you bridge these?

<table class="comp-table">
  <thead>
    <tr><th>Strategy</th><th>Latency to Index</th><th>Complexity</th><th>Used By</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Batch rebuild</strong></td><td>Hours–days</td><td><span class="badge badge-green">Low</span></td><td>Early Google</td></tr>
    <tr><td><strong>Delta index</strong></td><td>Minutes</td><td><span class="badge badge-yellow">Medium</span></td><td>Google Caffeine</td></tr>
    <tr><td><strong>Real-time stream</strong></td><td>Seconds</td><td><span class="badge badge-red">High</span></td><td>Twitter, Elasticsearch</td></tr>
  </tbody>
</table>

**Google's Caffeine (2010):** A large, stable base index handles the bulk of queries. A small, fast delta index absorbs new and updated documents. At query time, results from both are merged. Periodically, the delta is compacted into the base index. This is exactly the LSM tree approach applied to search.

**Real-time indexing pipeline:**

<div class="code-wrap">
<div class="code-lang">pipeline</div>
<pre class="code-block">Crawler → Kafka topic "new-docs"
  → Flink job: parse, tokenise, compute BM25 stats
  → Elasticsearch write (inverted index segment)
  → Segment available to queries within ~2–5 seconds</pre>
</div>

---

## 10. Autocomplete

As users type, the search box shows suggestions. This is a latency-critical feature: suggestions must appear within 50–100ms of each keystroke.

**Data structure:** A Trie (prefix tree) where each node stores the top-K queries that pass through that prefix. Lookup is O(L) where L is the prefix length — effectively O(1) for practical query lengths.

**At scale:** Google processes 8.5 billion queries/day. The top-K suggestions at each prefix node are derived from actual query frequency logs, refreshed periodically. The Trie is sharded by first letter or first two letters.

<div class="viz-wrap">
  <div class="viz-title">&#9654; Interactive Trie Autocomplete</div>
  <input id="trie-input" placeholder="Start typing... (try 'sys', 'sea', 'sql')" oninput="trieSearch(this.value)"
    style="width:100%;box-sizing:border-box;background:#1a1b1f;border:1px solid #3a3b40;border-radius:8px;padding:.6rem 1rem;color:rgba(255,255,255,.85);font-size:.9rem;font-family:inherit;margin-bottom:.8rem;" />
  <div id="trie-suggestions" class="trie-row"></div>
  <div id="trie-path" style="font-size:.75rem;color:rgba(255,255,255,.35);margin-top:.5rem;font-family:monospace;"></div>
</div>

<script>
var TRIE_QUERIES = [
  "system design","system design interview","system design primer","system design questions",
  "search engine","search engine optimization","search algorithm","search binary",
  "sql vs nosql","sql joins","sql indexing","sql transactions",
  "elasticsearch tutorial","elasticsearch vs solr","elasticsearch mapping",
  "pagerank algorithm","pagerank explained","pagerank python",
  "inverted index","inverted index implementation","inverted index example",
  "distributed systems","distributed cache","distributed transactions","distributed tracing",
  "bloom filter","bloom filter false positive",
  "consistent hashing","consistent hashing algorithm",
  "rate limiter","rate limiting algorithms",
  "load balancer","load balancing strategies",
  "kafka tutorial","kafka vs rabbitmq",
  "redis cache","redis data structures"
];

function trieSearch(prefix) {
  var el = document.getElementById('trie-suggestions');
  var pathEl = document.getElementById('trie-path');
  prefix = prefix.toLowerCase().trim();
  if (prefix.length < 2) { el.innerHTML = ''; pathEl.textContent = ''; return; }

  var matches = TRIE_QUERIES.filter(function(q){ return q.startsWith(prefix); }).slice(0,5);

  if (matches.length === 0) {
    el.innerHTML = '<span style="color:rgba(255,255,255,.35);font-size:.8rem;">No suggestions</span>';
    pathEl.textContent = 'Trie traversal: "' + prefix + '" → no matches';
    return;
  }

  var html = matches.map(function(m) {
    var highlighted = '<strong style="color:#fbef8a;">' + m.slice(0,prefix.length) + '</strong>' + m.slice(prefix.length);
    return '<span class="trie-sug" onclick="document.getElementById(\'trie-input\').value=\'' + m + '\';trieSearch(\'' + m + '\')">' + highlighted + '</span>';
  }).join('');

  el.innerHTML = html;
  pathEl.textContent = 'Trie path: root → ' + prefix.split('').join(' → ') + ' → ' + matches.length + ' candidate(s)';
}
</script>

---

## 11. Capacity Estimation

<table class="comp-table">
  <thead>
    <tr><th>Component</th><th>Size / Rate</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td>Index size (compressed)</td><td><strong>~100 TB</strong></td><td>After inverted index + compression</td></tr>
    <tr><td>Daily crawl volume</td><td><strong>~1B pages/day</strong></td><td>New + updated pages</td></tr>
    <tr><td>Query QPS</td><td><strong>~100,000 / s</strong></td><td>8.5B searches / 86,400s</td></tr>
    <tr><td>Index shards</td><td><strong>1,000 shards</strong></td><td>~100 GB each at 100 TB total</td></tr>
    <tr><td>Replication factor</td><td><strong>3×</strong></td><td>300 TB total storage</td></tr>
    <tr><td>Query servers</td><td><strong>~500</strong></td><td>200 QPS per server × 500 = 100K QPS</td></tr>
    <tr><td>Latency target</td><td><strong>&lt; 200ms p99</strong></td><td>End-to-end including re-ranking</td></tr>
    <tr><td>Crawler fetchers</td><td><strong>~1,000</strong></td><td>~12,000 pages/sec sustained</td></tr>
  </tbody>
</table>

---

## 12. Architecture Summary

The complete system has two major subsystems: the **online query path** (latency-critical) and the **offline index build path** (throughput-critical).

<div class="viz-wrap">
  <div class="viz-title">Architecture Overview</div>
  <div style="font-size:.82rem;line-height:2;color:rgba(255,255,255,.75);">

  <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.5rem;">
    <div style="background:rgba(251,239,138,.1);border:1px solid rgba(251,239,138,.3);border-radius:8px;padding:.35rem .8rem;color:#fbef8a;font-weight:700;">User</div>
    <span style="color:rgba(255,255,255,.3);">→</span>
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:.35rem .8rem;">Load Balancer</div>
    <span style="color:rgba(255,255,255,.3);">→</span>
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:.35rem .8rem;">Query Servers</div>
    <span style="color:rgba(255,255,255,.3);">→</span>
    <div style="background:rgba(123,205,171,.08);border:1px solid rgba(123,205,171,.2);border-radius:8px;padding:.35rem .8rem;color:#7bcdab;">Result Assembler</div>
    <span style="color:rgba(255,255,255,.3);">→</span>
    <div style="background:rgba(251,239,138,.1);border:1px solid rgba(251,239,138,.3);border-radius:8px;padding:.35rem .8rem;color:#fbef8a;font-weight:700;">User</div>
  </div>

  <div style="margin-left:2rem;border-left:2px solid rgba(255,255,255,.1);padding-left:1rem;margin-top:.5rem;">
    Query Servers fan out to:
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.3rem;">
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:.25rem .6rem;font-size:.78rem;">Index Shards (×1,000)</div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:.25rem .6rem;font-size:.78rem;">PageRank Store</div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:.25rem .6rem;font-size:.78rem;">ML Re-Ranker (BERT)</div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:.25rem .6rem;font-size:.78rem;">Autocomplete Trie</div>
    </div>
  </div>

  <div style="margin-top:1rem;border-top:1px solid rgba(255,255,255,.08);padding-top:.8rem;">
    <strong style="color:rgba(255,255,255,.45);font-size:.74rem;text-transform:uppercase;letter-spacing:.08em;">Offline Index Build Path</strong>
    <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.4rem;">
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:.35rem .8rem;font-size:.82rem;">Crawler Fleet</div>
      <span style="color:rgba(255,255,255,.3);">→</span>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:.35rem .8rem;font-size:.82rem;">Object Storage (raw HTML)</div>
      <span style="color:rgba(255,255,255,.3);">→</span>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:.35rem .8rem;font-size:.82rem;">Kafka + Flink</div>
      <span style="color:rgba(255,255,255,.3);">→</span>
      <div style="background:rgba(123,205,171,.08);border:1px solid rgba(123,205,171,.2);border-radius:8px;padding:.35rem .8rem;font-size:.82rem;color:#7bcdab;">Index Writer → Shards</div>
    </div>
  </div>

  </div>
</div>

---

## 13. Trade-offs &amp; Interview Tips

<div class="callout callout-green">
<strong>What interviewers want to hear:</strong> Start with the inverted index. Explain TF-IDF scoring. Then add PageRank. Then discuss fan-out sharding and the coordinator merge. Then tackle freshness. Each step earns points; you do not need to cover all of them.
</div>

<div class="callout callout-yellow">
<strong>The BERT re-ranking trick:</strong> A common follow-up is "how do you use ML for ranking?" The correct answer is a two-stage pipeline: cheap BM25 retrieval narrows from 100B to top-100 candidates, then expensive BERT scoring runs only on those 100. This makes the neural model feasible at search-engine scale.
</div>

<div class="callout callout-red">
<strong>Common mistakes:</strong> Saying "shard by URL hash" without explaining that fan-out requires querying all shards anyway. Forgetting that the index must be kept fresh. Proposing a single index server for 100 TB of data.
</div>

{: class="marginalia" }
**BERT-based re-ranking runs<br/>on only the top-100<br/>candidates from classical<br/>retrieval — not all 100B<br/>documents. The cheap<br/>index lookup first,<br/>then the expensive<br/>neural model on a<br/>tiny candidate set.<br/>Two-stage pipelines<br/>are the key pattern.**

---

## 14. Key Takeaways

1. **Inverted index** transforms an O(N) scan into an O(1) lookup — the single most important data structure in search.
2. **TF-IDF + BM25** scores by term relevance within a document.
3. **PageRank** adds inter-document authority via the link graph.
4. **Two-stage ranking:** fast classical retrieval → expensive neural re-ranking on a small candidate set.
5. **Document-partitioned sharding** with coordinator merge is the practical approach at 100 billion pages.
6. **Delta index** (Caffeine pattern) decouples freshness latency from the cost of rebuilding a 100 TB base index.

---

<div style="background:rgba(251,239,138,0.06);border:1px solid rgba(251,239,138,0.2);border-radius:12px;padding:1.5rem;margin-top:2rem;">
  <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(251,239,138,.5);margin-bottom:.6rem;">Series Finale — #15 of 15</div>
  <p style="color:rgba(255,255,255,.85);line-height:1.75;margin:0 0 .8rem;">
    This is article <strong style="color:#fbef8a;">#15 of 15</strong> in the System Design Interview Series. We've covered everything from Bloom Filters to distributed transactions to building a search engine from scratch — and the common thread running through all of them is the same principle: <em>start simple, measure, then scale only what hurts.</em>
  </p>
  <p style="color:rgba(255,255,255,.85);line-height:1.75;margin:0 0 .8rem;">
    The inverted index is a Bloom filter applied to retrieval. PageRank is consistent hashing applied to authority. The delta index is the LSM tree applied to freshness. Every hard problem in distributed systems is a variation of a pattern you have already seen.
  </p>
  <p style="color:rgba(255,255,255,.6);font-size:.84rem;margin:0;">
    Start from the beginning of the series:
    <a href="/post/2026/04/14/system-design-unique-email.html" style="color:#7bcdab;">Article #1 — How Gmail Checks Billions of Emails for Uniqueness (Bloom Filters)</a>
  </p>
</div>

<script>
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  var text = pre ? pre.innerText : '';
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function(){ btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}
</script>
