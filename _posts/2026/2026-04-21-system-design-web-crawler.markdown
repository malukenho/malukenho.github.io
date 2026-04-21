---
layout: post
title: "System Design: Web Crawler — From BFS to Petabyte-Scale Crawling"
date: 2026-04-21 10:00:00 +0000
categories: ["post"]
tags: [system-design, web-crawler, distributed-systems, bfs, interview]
series: "System Design Interview Series"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design Interview Prep &mdash; #7 of 15
</div>

{: class="marginalia" }
Google's crawler visits<br/>**trillions** of pages and<br/>re-crawls the entire<br/>known web every few<br/>days. Infrastructure<br/>for that dwarfs most<br/>national data centres.

A web crawler sounds almost trivially simple: follow links, download pages, repeat. Every computer science student has written one. Yet at the scale of a search engine — 1 billion pages, 1 month, fault-tolerant, polite — nearly every naïve assumption breaks spectacularly. This article dismantles the problem layer by layer, from a 30-line Python prototype to a distributed architecture that could actually power a real search index.

**The question:** *Design a web crawler for a search engine. Crawl 1 billion pages in a month. Handle duplicates, politeness, failures, and freshness.*

---

<style>
/* ── Series badge ───────────────────────────────────────── */
.series-badge {
  display: inline-flex; align-items: center; gap: .5rem;
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 20px;
  padding: 5px 14px; font-size: .75rem; color: rgba(255,255,255,.55);
  margin-bottom: 1.5rem;
}
.series-badge strong { color: #fbef8a; }

/* ── Code blocks ─────────────────────────────────────────── */
.code-wrap {
  position: relative; background: #111214; border: 1px solid #2e2f35;
  border-radius: 10px; overflow: hidden; margin: 1rem 0;
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
  font-family: "JetBrains Mono","Fira Code",monospace; font-size: 13px;
  line-height: 1.65; color: rgba(255,255,255,.85);
  background: transparent !important; border: none !important;
}
.kw  { color: #cc99cd; }
.ty  { color: #7bcdab; }
.st  { color: #f8c555; }
.cm  { color: #5a6272; font-style: italic; }
.fn  { color: #89c0d0; }
.nu  { color: #f08080; }
.pp  { color: #fbef8a; }
.op  { color: rgba(255,255,255,.5); }

/* ── Callouts ────────────────────────────────────────────── */
.callout {
  border-radius: 8px; padding: 1rem 1.2rem; margin: 1rem 0;
  font-size: .84rem; line-height: 1.7;
}
.callout-green  { background: #1a2e22; border-left: 3px solid #7bcdab; color: rgba(255,255,255,.82); }
.callout-yellow { background: #25240e; border-left: 3px solid #fbef8a; color: rgba(255,255,255,.82); }
.callout-red    { background: #2a1616; border-left: 3px solid #f08080; color: rgba(255,255,255,.82); }
.callout strong { color: #fff; }

/* ── Stat grid ───────────────────────────────────────────── */
.stat-grid {
  display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; margin: 1.5rem 0;
}
@media (max-width:680px) { .stat-grid { grid-template-columns: repeat(2,1fr); } }
.stat-card {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1rem; text-align: center;
}
.stat-num   { font-size: 1.6rem; font-weight: 700; color: #fbef8a; line-height: 1.1; }
.stat-label { font-size: .72rem; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .06em; margin-top: .3rem; }
.stat-sub   { font-size: .75rem; color: rgba(255,255,255,.35); margin-top: .15rem; }

/* ── Comparison table ────────────────────────────────────── */
.compare-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 1rem 0;
}
.compare-table th {
  text-align: left; padding: 8px 14px; color: rgba(255,255,255,.45);
  font-weight: 500; font-size: 11px; text-transform: uppercase;
  letter-spacing: .07em; border-bottom: 1px solid #2e2f35;
}
.compare-table td {
  padding: 9px 14px; border-bottom: 1px solid #1c1d22;
  color: rgba(255,255,255,.78); vertical-align: top;
}
.compare-table tr:last-child td { border-bottom: none; }
.yes  { color: #7bcdab; font-weight: 700; }
.no   { color: #f08080; font-weight: 700; }
.part { color: #fbef8a; font-weight: 700; }

/* ── Architecture diagram ────────────────────────────────── */
.arch-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.6rem; margin: 1.6rem 0;
}
.arch-title {
  font-size: .78rem; text-transform: uppercase; letter-spacing: .1em;
  color: rgba(255,255,255,.35); margin-bottom: 1.2rem;
}
.arch-grid {
  display: flex; flex-wrap: wrap; gap: .8rem; justify-content: center;
  margin-bottom: 1.4rem;
}
.arch-node {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .55rem 1rem; font-size: .8rem; cursor: pointer;
  transition: all .2s; user-select: none; text-align: center;
}
.arch-node:hover, .arch-node.active {
  border-color: #7bcdab; color: #7bcdab; background: rgba(123,205,171,.07);
}
.arch-node.frontier { border-color: #fbef8a; color: #fbef8a; }
.arch-node.frontier:hover, .arch-node.frontier.active { background: rgba(251,239,138,.07); }
.arch-detail {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 1rem 1.2rem; font-size: .84rem; line-height: 1.7;
  color: rgba(255,255,255,.75); min-height: 90px; transition: all .2s;
}
.arch-detail strong { color: #fbef8a; }
.arch-detail .failure { color: #f08080; }
.arch-arrows {
  display: flex; align-items: center; justify-content: center;
  gap: .4rem; flex-wrap: wrap; font-size: 11px;
  color: rgba(255,255,255,.3); margin-bottom: .8rem;
}
.arch-arrows span.node-ref { color: rgba(255,255,255,.6); font-weight: 600; }
.arch-arrows span.arrow   { color: #7bcdab; }

/* ── BFS visualiser ──────────────────────────────────────── */
.bfs-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.4rem; margin: 1.6rem 0;
}
.bfs-controls {
  display: flex; gap: .7rem; flex-wrap: wrap; align-items: center;
  margin-bottom: 1.2rem;
}
.bfs-btn {
  background: #1e1f24; border: 1px solid #3a3b40; border-radius: 6px;
  color: rgba(255,255,255,.7); font-size: 13px; padding: 6px 16px;
  cursor: pointer; font-family: inherit; transition: all .2s;
}
.bfs-btn:hover  { border-color: #7bcdab; color: #7bcdab; }
.bfs-btn.primary { background: rgba(123,205,171,.1); border-color: #7bcdab; color: #7bcdab; }
.bfs-btn:disabled { opacity: .35; cursor: not-allowed; }
.bfs-stats {
  display: flex; gap: 1.2rem; flex-wrap: wrap; font-size: 12px;
  color: rgba(255,255,255,.45); margin-bottom: 1rem;
}
.bfs-stats span strong { font-family: "JetBrains Mono",monospace; }
.bfs-stats .sv strong { color: #7bcdab; }
.bfs-stats .sq strong { color: #fbef8a; }
.bfs-stats .sf strong { color: #f08080; }
.bfs-canvas-wrap {
  background: #0e0f12; border: 1px solid #1e2025; border-radius: 10px;
  overflow: hidden; margin-bottom: 1rem;
}
#bfs-canvas { display: block; width: 100%; max-height: 340px; }
.bfs-log {
  background: #0e0f12; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .7rem 1rem; height: 90px; overflow-y: auto;
  font-family: "JetBrains Mono",monospace; font-size: 12px; line-height: 1.7;
}
.bfs-log .vis  { color: #7bcdab; }
.bfs-log .que  { color: #fbef8a; }
.bfs-log .dup  { color: #f08080; }
.bfs-log .info { color: rgba(255,255,255,.35); }

/* ── Capacity table ──────────────────────────────────────── */
.cap-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 1rem 0;
}
.cap-table th {
  background: #1c1d22; padding: 9px 14px; text-align: left;
  color: rgba(255,255,255,.45); font-size: 11px; text-transform: uppercase;
  letter-spacing: .06em; font-weight: 500;
}
.cap-table td {
  padding: 9px 14px; border-bottom: 1px solid #1c1d22;
  color: rgba(255,255,255,.78);
}
.cap-table td.num {
  font-family: "JetBrains Mono",monospace; color: #fbef8a; text-align: right;
}
.cap-table tr:last-child td { border-bottom: none; }

/* ── Memory bar ──────────────────────────────────────────── */
.mem-bar-row {
  display: flex; align-items: center; gap: .8rem; margin: .5rem 0; font-size: 12.5px;
}
.mem-bar-label { width: 130px; color: rgba(255,255,255,.55); flex-shrink: 0; }
.mem-bar-track {
  flex: 1; height: 22px; background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 4px; overflow: hidden;
}
.mem-bar-fill  { height: 100%; border-radius: 3px; transition: width .6s ease; }
.mem-bar-fill.big   { background: #f08080; }
.mem-bar-fill.small { background: #7bcdab; }
.mem-bar-val { width: 70px; text-align: right; font-family: "JetBrains Mono",monospace; font-size: 12px; color: rgba(255,255,255,.45); }

/* ── SimHash demo ────────────────────────────────────────── */
.simhash-wrap {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1rem 1.2rem; margin: 1rem 0; font-size: 13px;
}
.bit-row {
  display: flex; gap: 3px; flex-wrap: wrap; margin: .5rem 0;
}
.bit {
  width: 18px; height: 18px; border-radius: 3px; display: flex;
  align-items: center; justify-content: center; font-size: 10px;
  font-family: "JetBrains Mono",monospace; font-weight: 700;
}
.bit.one  { background: rgba(123,205,171,.2); color: #7bcdab; }
.bit.zero { background: rgba(255,255,255,.06); color: rgba(255,255,255,.35); }
.bit.diff { background: rgba(240,128,128,.2); color: #f08080; }

/* ── Priority formula box ────────────────────────────────── */
.formula-box {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1rem 1.4rem; margin: 1rem 0; text-align: center; font-size: 1.05rem;
  font-family: "JetBrains Mono",monospace; color: rgba(255,255,255,.8); letter-spacing: .02em;
}
.formula-box .fv { color: #fbef8a; }
.formula-box .fi { color: #7bcdab; }
.formula-box .fd { color: #f08080; }
</style>

## 1. The Problem

A web crawler visits URLs, downloads HTML, extracts new links, enqueues them, and repeats. The algorithm — breadth-first search on the web graph — fits in a whiteboard sketch. The scale does not.

<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-num">1B</div>
    <div class="stat-label">pages / month</div>
    <div class="stat-sub">target</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">~400</div>
    <div class="stat-label">pages / second</div>
    <div class="stat-sub">1B ÷ 30 days</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">40 MB/s</div>
    <div class="stat-label">raw download</div>
    <div class="stat-sub">@100KB / page</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">~100TB</div>
    <div class="stat-label">storage / month</div>
    <div class="stat-sub">HTML + metadata</div>
  </div>
</div>

Every requirement the interviewer adds — *deduplication, politeness, fault tolerance, freshness* — forces a new architectural layer. Let's build them one at a time.

---

## 2. Level 1 — Single-Threaded BFS

Start with the simplest possible implementation. It works for thousands of URLs, and it illustrates every bottleneck we'll need to fix.

<div class="code-wrap">
  <div class="code-lang">Python<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">from</span> <span class="ty">collections</span> <span class="kw">import</span> deque
<span class="kw">import</span> <span class="ty">requests</span>
<span class="kw">from</span> <span class="ty">bs4</span> <span class="kw">import</span> BeautifulSoup
<span class="kw">from</span> <span class="ty">urllib.parse</span> <span class="kw">import</span> urljoin, urlparse

<span class="kw">def</span> <span class="fn">crawl</span>(seed_urls, max_pages<span class="op">=</span><span class="nu">1000</span>):
    queue   <span class="op">=</span> deque(seed_urls)
    visited <span class="op">=</span> <span class="fn">set</span>()          <span class="cm"># ← naive dedup: O(n) memory</span>
    pages   <span class="op">=</span> []

    <span class="kw">while</span> queue <span class="kw">and</span> <span class="fn">len</span>(pages) <span class="op">&lt;</span> max_pages:
        url <span class="op">=</span> queue.<span class="fn">popleft</span>()
        <span class="kw">if</span> url <span class="kw">in</span> visited:
            <span class="kw">continue</span>
        visited.<span class="fn">add</span>(url)

        <span class="kw">try</span>:
            resp <span class="op">=</span> requests.<span class="fn">get</span>(url, timeout<span class="op">=</span><span class="nu">5</span>)
            <span class="kw">if</span> resp.status_code <span class="op">!=</span> <span class="nu">200</span>:
                <span class="kw">continue</span>
            pages.<span class="fn">append</span>((url, resp.text))
            soup <span class="op">=</span> <span class="ty">BeautifulSoup</span>(resp.text, <span class="st">"html.parser"</span>)
            <span class="kw">for</span> tag <span class="kw">in</span> soup.<span class="fn">find_all</span>(<span class="st">"a"</span>, href<span class="op">=</span><span class="kw">True</span>):
                link <span class="op">=</span> <span class="fn">urljoin</span>(url, tag[<span class="st">"href"</span>])
                <span class="kw">if</span> link <span class="kw">not in</span> visited:
                    queue.<span class="fn">append</span>(link)
        <span class="kw">except</span> <span class="ty">Exception</span>:
            <span class="kw">pass</span>          <span class="cm"># no retry, no logging</span>

    <span class="kw">return</span> pages</pre>
</div>

**Bottlenecks at scale:**

- Single thread → 1 page at a time. At 1s/page, 1B pages = 31 years.
- `visited` set at 1B URLs × ~100 bytes = **100 GB RAM** just for deduplication.
- No politeness — will get IP-banned within minutes.
- No content deduplication — mirrors get stored repeatedly.

---

## 3. Level 2 — URL Deduplication with Bloom Filters

{: class="marginalia" }
A Bloom filter for 1B URLs<br/>uses ~1.2 GB at 1% false<br/>positive rate. Without it,<br/>deduplication alone would<br/>need 100 GB of RAM —<br/>per crawler node.

The naïve `HashSet` approach is unusable at scale. Enter the **Bloom filter** — a probabilistic data structure that trades a small false-positive rate for enormous memory savings. (Covered in depth in Series #1.)

**Memory comparison for 1 billion URLs:**

<div class="code-wrap" style="margin-bottom:.5rem;">
  <div class="code-lang">Memory model</div>
  <pre class="code-block"><span class="cm"># HashSet (Python dict) — exact dedup</span>
<span class="nu">1_000_000_000</span> urls <span class="op">×</span> <span class="nu">100</span> bytes <span class="op">=</span> <span class="pp">100 GB</span>   <span class="cm">← not viable per node</span>

<span class="cm"># Bloom filter — probabilistic dedup (1% FPR)</span>
m <span class="op">=</span> <span class="op">-</span>(n <span class="op">×</span> ln p) <span class="op">/</span> (ln 2)²
  <span class="op">=</span> <span class="op">-</span>(<span class="nu">1e9</span> <span class="op">×</span> ln <span class="nu">0.01</span>) <span class="op">/</span> <span class="nu">0.480</span>
  <span class="op">≈</span> <span class="pp">9.585 billion bits</span> <span class="op">≈</span> <span class="pp">1.2 GB</span>   <span class="cm">← 83× smaller</span></pre>
</div>

<div style="background:#111214;border:1px solid #2e2f35;border-radius:10px;padding:1.2rem;margin:1rem 0;">
  <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.35);margin-bottom:.8rem;">Memory footprint — 1 billion URLs</div>
  <div class="mem-bar-row">
    <span class="mem-bar-label">HashSet</span>
    <div class="mem-bar-track"><div class="mem-bar-fill big" style="width:100%"></div></div>
    <span class="mem-bar-val">100 GB</span>
  </div>
  <div class="mem-bar-row">
    <span class="mem-bar-label">Bloom filter</span>
    <div class="mem-bar-track"><div class="mem-bar-fill small" style="width:1.2%"></div></div>
    <span class="mem-bar-val">1.2 GB</span>
  </div>
</div>

<div class="callout callout-yellow">
  <strong>Trade-off:</strong> A Bloom filter can produce false positives (1% means ~10M URLs incorrectly marked as "seen"). Those pages get skipped. For a web crawler this is acceptable — skipping 1% of new URLs is far better than running out of memory.
</div>

---

## 4. Level 3 — Politeness: robots.txt + Crawl Delay

{: class="marginalia" }
The politeness constraint is<br/>not optional — Google was<br/>nearly banned from the early<br/>web for crawling too<br/>aggressively. Respecting<br/>robots.txt is both ethical<br/>and practical.

Hammering a server with 400 requests/second will get your crawler blocked and possibly legally challenged. Two mechanisms govern polite crawling:

**robots.txt** — A convention (RFC 9309) that websites use to declare which paths are off-limits. Crawlers must fetch and cache it before visiting any page on a domain.

<div class="code-wrap">
  <div class="code-lang">robots.txt — example</div>
  <pre class="code-block"><span class="cm"># Disallow admin and private areas</span>
<span class="pp">User-agent:</span> <span class="op">*</span>
<span class="pp">Disallow:</span> <span class="st">/admin/</span>
<span class="pp">Disallow:</span> <span class="st">/private/</span>
<span class="pp">Disallow:</span> <span class="st">/search?</span>
<span class="pp">Crawl-delay:</span> <span class="nu">2</span>

<span class="cm"># Allow Googlebot full access</span>
<span class="pp">User-agent:</span> Googlebot
<span class="pp">Disallow:</span></pre>
</div>

<div class="code-wrap">
  <div class="code-lang">Python — robots.txt parser + per-domain rate limiter<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">import</span> <span class="ty">time</span>, heapq
<span class="kw">from</span> <span class="ty">urllib.robotparser</span> <span class="kw">import</span> RobotFileParser
<span class="kw">from</span> <span class="ty">urllib.parse</span> <span class="kw">import</span> urlparse

<span class="cm"># Cache: domain → (RobotFileParser, crawl_delay)</span>
robots_cache <span class="op">=</span> {}

<span class="kw">def</span> <span class="fn">get_robots</span>(domain):
    <span class="kw">if</span> domain <span class="kw">not in</span> robots_cache:
        rp <span class="op">=</span> <span class="ty">RobotFileParser</span>()
        rp.<span class="fn">set_url</span>(<span class="st">"https://"</span> <span class="op">+</span> domain <span class="op">+</span> <span class="st">"/robots.txt"</span>)
        rp.<span class="fn">read</span>()
        delay <span class="op">=</span> rp.<span class="fn">crawl_delay</span>(<span class="st">"*"</span>) <span class="kw">or</span> <span class="nu">1.0</span>   <span class="cm"># default 1 req/sec</span>
        robots_cache[domain] <span class="op">=</span> (rp, delay)
    <span class="kw">return</span> robots_cache[domain]

<span class="cm"># Priority queue: (next_allowed_time, url)</span>
frontier <span class="op">=</span> []
next_time <span class="op">=</span> {}   <span class="cm"># domain → next allowed fetch timestamp</span>

<span class="kw">def</span> <span class="fn">enqueue</span>(url):
    domain <span class="op">=</span> <span class="fn">urlparse</span>(url).netloc
    t      <span class="op">=</span> <span class="fn">max</span>(time.<span class="fn">time</span>(), next_time.<span class="fn">get</span>(domain, <span class="nu">0</span>))
    heapq.<span class="fn">heappush</span>(frontier, (t, url))

<span class="kw">def</span> <span class="fn">fetch_next</span>():
    t, url <span class="op">=</span> heapq.<span class="fn">heappop</span>(frontier)
    now    <span class="op">=</span> time.<span class="fn">time</span>()
    <span class="kw">if</span> t <span class="op">&gt;</span> now:
        time.<span class="fn">sleep</span>(t <span class="op">-</span> now)
    domain  <span class="op">=</span> <span class="fn">urlparse</span>(url).netloc
    rp, delay <span class="op">=</span> <span class="fn">get_robots</span>(domain)
    <span class="kw">if not</span> rp.<span class="fn">can_fetch</span>(<span class="st">"*"</span>, url):
        <span class="kw">return</span> <span class="kw">None</span>       <span class="cm"># disallowed by robots.txt</span>
    next_time[domain] <span class="op">=</span> time.<span class="fn">time</span>() <span class="op">+</span> delay
    <span class="kw">return</span> url</pre>
</div>

---

## 5. Level 4 — Content Deduplication (Near-Duplicate Detection)

URL deduplication ensures we don't visit the same URL twice. But what about two *different* URLs that serve identical or nearly identical content? (Mirrors, pagination, print views, trailing-slash variants.)

**Exact duplicates** are easy — compute MD5 of the response body:

<div class="code-wrap">
  <div class="code-lang">Python<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">import</span> <span class="ty">hashlib</span>

content_hashes <span class="op">=</span> <span class="fn">set</span>()

<span class="kw">def</span> <span class="fn">is_duplicate</span>(html_bytes):
    h <span class="op">=</span> hashlib.<span class="fn">md5</span>(html_bytes).<span class="fn">hexdigest</span>()
    <span class="kw">if</span> h <span class="kw">in</span> content_hashes:
        <span class="kw">return</span> <span class="kw">True</span>
    content_hashes.<span class="fn">add</span>(h)
    <span class="kw">return</span> <span class="kw">False</span></pre>
</div>

**Near-duplicates** require **SimHash** — a locality-sensitive hashing technique where similar documents produce hashes that differ in few bits.

{: class="marginalia" }
SimHash was invented by<br/>Moses Charikar in 2002.<br/>Google uses it to detect<br/>near-duplicate web pages<br/>across hundreds of billions<br/>of documents.

The intuition: split the document into shingles (word n-grams), hash each, weight them by term frequency, then collapse into a 64-bit fingerprint. Documents sharing 90%+ content will have fingerprints differing in ≤ 3 bits.

<div class="simhash-wrap">
  <div style="font-size:.78rem;color:rgba(255,255,255,.45);margin-bottom:.6rem;">SimHash comparison — "Article about crawlers" vs "Article about scrapers" (92% overlap)</div>
  <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:.3rem;">Doc A SimHash (64-bit):</div>
  <div class="bit-row" id="bits-a"></div>
  <div style="font-size:11px;color:rgba(255,255,255,.4);margin:.5rem 0 .3rem;">Doc B SimHash (3 bits differ — highlighted):</div>
  <div class="bit-row" id="bits-b"></div>
  <div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:.7rem;">Hamming distance: <strong style="color:#7bcdab;">3</strong> → near-duplicate (threshold ≤ 3)</div>
</div>

<script>
(function() {
  var a = [];
  var diff = [7, 31, 55];
  for (var i = 0; i < 64; i++) { a.push(Math.random() > 0.5 ? 1 : 0); }
  var b = a.slice();
  diff.forEach(function(i){ b[i] = b[i] === 1 ? 0 : 1; });
  function render(id, bits, diffIdx) {
    var el = document.getElementById(id);
    if (!el) return;
    bits.forEach(function(bit, i) {
      var d = document.createElement('div');
      d.className = 'bit ' + (diffIdx && diffIdx.indexOf(i) >= 0 ? 'diff' : (bit ? 'one' : 'zero'));
      d.textContent = bit;
      el.appendChild(d);
    });
  }
  render('bits-a', a, null);
  render('bits-b', b, diff);
})();
</script>

---

## 6. Level 5 — Distributed Architecture

Single-node crawling is a dead end. At 400 pages/second we need 100+ fetcher workers. Here is the full distributed pipeline — click each component to learn its role, failure modes, and scale.

<div class="arch-wrap">
  <div class="arch-title">Distributed Crawler — Component Map (click to explore)</div>
  <div class="arch-arrows">
    <span class="node-ref">URL Frontier</span>
    <span class="arrow">→</span>
    <span class="node-ref">Fetcher Workers</span>
    <span class="arrow">→</span>
    <span class="node-ref">HTML Parser</span>
    <span class="arrow">→</span>
    <span class="node-ref">Link Extractor</span>
    <span class="arrow">→</span>
    <span class="node-ref">URL Filter</span>
    <span class="arrow">→</span>
    <span class="node-ref">Bloom Filter</span>
    <span class="arrow">→</span>
    <span class="node-ref">URL Frontier</span>
    <span class="arrow" style="color:#f08080"> (loop)</span>
  </div>
  <div class="arch-arrows" style="margin-top:-.4rem;">
    <span class="node-ref">Fetcher Workers</span>
    <span class="arrow">→</span>
    <span class="node-ref">Content Store (S3)</span>
    <span style="color:rgba(255,255,255,.3);font-size:11px;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
    <span class="node-ref">DNS Resolver Cache</span>
    <span class="arrow">→</span>
    <span class="node-ref">Fetcher Workers</span>
  </div>
  <div class="arch-grid" id="arch-grid">
    <div class="arch-node frontier" data-key="frontier">URL Frontier</div>
    <div class="arch-node" data-key="fetcher">Fetcher Workers</div>
    <div class="arch-node" data-key="dns">DNS Resolver Cache</div>
    <div class="arch-node" data-key="content">Content Store (S3)</div>
    <div class="arch-node" data-key="parser">HTML Parser</div>
    <div class="arch-node" data-key="extractor">Link Extractor</div>
    <div class="arch-node" data-key="filter">URL Filter</div>
    <div class="arch-node" data-key="bloom">Bloom Filter</div>
  </div>
  <div class="arch-detail" id="arch-detail">
    <strong>Click a component</strong> to see its description, failure mode, and scale characteristics.
  </div>
</div>

<script>
(function() {
  var info = {
    frontier: {
      title: "URL Frontier",
      body: "A distributed priority queue (e.g., Kafka + Redis sorted sets) holding URLs waiting to be fetched. Partitioned by domain so each fetcher worker handles a disjoint set of domains — ensuring politeness per-domain is enforceable. Supports priority levels: news sites > reference sites > blogs.",
      failure: "Failure: If the frontier loses state (node crash), in-flight URLs are lost. Mitigation: write-ahead log or durable Kafka topics with replication factor ≥ 3.",
      scale: "Scale: Kafka handles millions of enqueues/sec; frontier queue can hold billions of URLs across a cluster."
    },
    fetcher: {
      title: "Fetcher Workers",
      body: "100–500 stateless worker nodes that pull URLs from the Frontier, issue HTTP GET requests, write raw HTML to the Content Store, and push extracted links to the Parser. Each node handles one domain at a time to honour crawl-delay.",
      failure: "Failure: Worker crashes mid-fetch. Mitigation: heartbeat + lease mechanism — if a URL is not acknowledged within 60s, it re-enters the frontier.",
      scale: "Scale: Horizontal scaling. 400 pages/sec × 500ms avg latency → 200 concurrent fetches per node × 100 nodes."
    },
    dns: {
      title: "DNS Resolver Cache",
      body: "A local (per-node) LRU cache of domain → IP mappings. At 400 pages/sec across ~50,000 distinct domains, uncached DNS queries would dominate latency. With 70% cache hit rate, only ~120 DNS lookups/sec reach the resolver.",
      failure: "Failure: Stale IP from expired TTL. Mitigation: respect TTL; evict entries when TTL expires, not on a fixed schedule.",
      scale: "Scale: Per-node cache is fine; no shared state needed. Typical cache: 100K entries × 50 bytes ≈ 5 MB per worker."
    },
    content: {
      title: "Content Store (S3)",
      body: "Raw HTML is written to object storage keyed by URL hash. Downstream indexers and content-deduplication jobs read from here asynchronously. Separating storage from processing is critical — the crawler doesn't wait for indexing.",
      failure: "Failure: S3 PUT failure during high ingestion. Mitigation: async write with local disk buffer; retry with exponential backoff.",
      scale: "Scale: 400 pages/sec × 100KB = 40 MB/s write throughput. S3 handles this comfortably; cost ~$2,300/month for 100TB at standard pricing."
    },
    parser: {
      title: "HTML Parser",
      body: "Parses raw HTML with a tolerant parser (e.g., lxml or html5lib). Extracts title, canonical URL, language, and the link graph. Runs as a separate pool of workers consuming from a Kafka topic written by Fetchers.",
      failure: "Failure: Malformed HTML causes parser crash. Mitigation: catch exceptions per-document, dead-letter-queue for unparseable pages.",
      scale: "Scale: CPU-bound. 400 pages/sec × ~5ms parse time → 2 CPU-seconds/sec → 2–4 parser nodes suffice."
    },
    extractor: {
      title: "Link Extractor",
      body: "Resolves relative URLs to absolute, normalises them (lowercase scheme+host, strip tracking params, canonicalise), and deduplicates within the batch. Passes candidate URLs to the URL Filter.",
      failure: "Failure: URL normalisation bugs cause the same URL to appear twice (e.g., http vs https, trailing slash). Mitigation: canonical URL hashing before Bloom filter lookup.",
      scale: "Scale: Lightweight; co-located with HTML Parser workers."
    },
    filter: {
      title: "URL Filter",
      body: "Applies policy rules before a URL enters the Bloom filter check: (1) scheme must be http/https, (2) domain not in blocklist, (3) path not excluded by robots.txt, (4) max URL depth (e.g., ≤ 10 slashes), (5) not a spider trap signature.",
      failure: "Failure: Overly aggressive filtering drops legitimate URLs. Mitigation: log all filtered URLs with reason; audit periodically.",
      scale: "Scale: Pure computation; runs inline with Link Extractor."
    },
    bloom: {
      title: "Bloom Filter",
      body: "A shared Bloom filter (Redis bitfield or dedicated service) holds all seen URLs. Before enqueuing, the Link Extractor checks: if the Bloom filter says 'seen', discard. At 1B URLs, uses ~1.2 GB RAM. False-positive rate 1% means ~10M valid URLs get skipped — acceptable.",
      failure: "Failure: Bloom filter node crash loses all state — entire URL set appears unseen. Mitigation: periodic snapshots to disk, or use a distributed consistent hash ring across 3 Bloom filter nodes.",
      scale: "Scale: Redis BITCOUNT ops at ~500K/sec per node. Partition the bit array across nodes if needed."
    }
  };
  document.getElementById('arch-grid').addEventListener('click', function(e) {
    var node = e.target.closest('.arch-node');
    if (!node) return;
    var key = node.getAttribute('data-key');
    var d = info[key];
    if (!d) return;
    document.querySelectorAll('.arch-node').forEach(function(n){ n.classList.remove('active'); });
    node.classList.add('active');
    document.getElementById('arch-detail').innerHTML =
      '<strong>' + d.title + '</strong> — ' + d.body +
      '<br/><span class="failure">⚠ ' + d.failure + '</span>' +
      '<br/><span style="color:#7bcdab;font-size:.8rem;">↑ ' + d.scale + '</span>';
  });
})();
</script>

---

## 7. Level 6 — URL Frontier Priority & Freshness

Not all URLs are equal. A breaking news article should be re-crawled within minutes; a Wikipedia stub from 2009 can wait days. The frontier must support **priority** and **freshness**.

**Priority** is based on site importance (PageRank-like score) and content type:

<table class="compare-table">
  <thead><tr><th>Site type</th><th>Priority</th><th>Re-crawl interval</th></tr></thead>
  <tbody>
    <tr><td>Major news (CNN, BBC)</td><td class="yes">High</td><td>15 minutes</td></tr>
    <tr><td>Wikipedia, reference</td><td class="yes">High</td><td>1–7 days</td></tr>
    <tr><td>Active blogs</td><td class="part">Medium</td><td>1–7 days</td></tr>
    <tr><td>Static corporate sites</td><td class="part">Medium</td><td>30 days</td></tr>
    <tr><td>Parked domains / low-quality</td><td class="no">Low</td><td>90+ days</td></tr>
  </tbody>
</table>

**Freshness formula** — used to schedule the next crawl time:

<div class="formula-box">
  <span class="fv">priority</span> = <span class="fi">site_importance</span> &times; ( 1 / <span class="fd">days_since_last_change</span> )
</div>

Sites that rarely change (days_since_last_change → ∞) converge to priority ≈ 0 and sink to the bottom of the queue. Sites that update daily stay near the top.

**Sitemap hints:** Many sites publish `sitemap.xml` with `<changefreq>` and `<lastmod>` tags. The crawler reads these to pre-compute freshness scores without needing to fetch every page blindly.

---

## 8. Level 7 — Handling Failures & Traps

### Spider Traps

A poorly designed website can create infinite URL spaces: `/calendar/2024/01/01`, `/calendar/2024/01/02`, ..., `/calendar/∞`. Or parameterised URLs that combine into millions of variants.

<div class="callout callout-red">
  <strong>Spider trap signatures:</strong> URL depth &gt; 10 path segments; same domain with &gt; 100,000 queued URLs; monotonically increasing numeric parameter in URL path.
</div>

Defences:

<div class="code-wrap">
  <div class="code-lang">Python — trap detection<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">from</span> <span class="ty">urllib.parse</span> <span class="kw">import</span> urlparse

MAX_DEPTH  <span class="op">=</span> <span class="nu">10</span>
MAX_DOMAIN <span class="op">=</span> <span class="nu">100_000</span>   <span class="cm"># URLs queued per domain</span>
domain_count <span class="op">=</span> {}

<span class="kw">def</span> <span class="fn">is_trap</span>(url):
    p      <span class="op">=</span> <span class="fn">urlparse</span>(url)
    depth  <span class="op">=</span> p.path.<span class="fn">count</span>(<span class="st">"/"</span>)
    domain <span class="op">=</span> p.netloc
    <span class="kw">if</span> depth <span class="op">&gt;</span> MAX_DEPTH:
        <span class="kw">return</span> <span class="kw">True</span>
    domain_count[domain] <span class="op">=</span> domain_count.<span class="fn">get</span>(domain, <span class="nu">0</span>) <span class="op">+</span> <span class="nu">1</span>
    <span class="kw">if</span> domain_count[domain] <span class="op">&gt;</span> MAX_DOMAIN:
        <span class="kw">return</span> <span class="kw">True</span>
    <span class="kw">return</span> <span class="kw">False</span></pre>
</div>

### Retry Logic with Exponential Backoff

<div class="code-wrap">
  <div class="code-lang">Python<button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">import</span> <span class="ty">time</span>, requests

<span class="kw">def</span> <span class="fn">fetch_with_retry</span>(url, max_retries<span class="op">=</span><span class="nu">3</span>):
    <span class="kw">for</span> attempt <span class="kw">in</span> <span class="fn">range</span>(max_retries):
        <span class="kw">try</span>:
            resp <span class="op">=</span> requests.<span class="fn">get</span>(url, timeout<span class="op">=</span><span class="nu">10</span>)
            <span class="kw">if</span> resp.status_code <span class="op">==</span> <span class="nu">429</span>:            <span class="cm"># Too Many Requests</span>
                retry_after <span class="op">=</span> <span class="fn">int</span>(resp.headers.<span class="fn">get</span>(<span class="st">"Retry-After"</span>, <span class="nu">60</span>))
                time.<span class="fn">sleep</span>(retry_after)
                <span class="kw">continue</span>
            <span class="kw">if</span> resp.status_code <span class="kw">in</span> (<span class="nu">500</span>, <span class="nu">502</span>, <span class="nu">503</span>, <span class="nu">504</span>):
                time.<span class="fn">sleep</span>(<span class="nu">2</span> <span class="op">**</span> attempt)            <span class="cm"># exponential backoff</span>
                <span class="kw">continue</span>
            <span class="kw">return</span> resp
        <span class="kw">except</span> requests.<span class="ty">Timeout</span>:
            time.<span class="fn">sleep</span>(<span class="nu">2</span> <span class="op">**</span> attempt)
    <span class="kw">return</span> <span class="kw">None</span>    <span class="cm"># give up after max_retries</span></pre>
</div>

---

## 9. Interactive: BFS Crawl Visualiser

Step through a mini web graph of 12 nodes. Watch how BFS discovers pages, queues new links, and how the Bloom filter catches already-visited URLs.

<div class="bfs-wrap">
  <div class="bfs-controls">
    <button class="bfs-btn primary" id="bfs-step">▶ Step</button>
    <button class="bfs-btn" id="bfs-auto">Auto-play</button>
    <button class="bfs-btn" id="bfs-reset">Reset</button>
  </div>
  <div class="bfs-stats">
    <span class="sv">Visited: <strong id="bfs-visited-count">0</strong></span>
    <span class="sq">Queued: <strong id="bfs-queue-count">0</strong></span>
    <span class="sf">Bloom-filtered: <strong id="bfs-filtered-count">0</strong></span>
    <span style="color:rgba(255,255,255,.4)">Current: <strong id="bfs-current">seed</strong></span>
  </div>
  <div class="bfs-canvas-wrap">
    <canvas id="bfs-canvas" width="700" height="320"></canvas>
  </div>
  <div class="bfs-log" id="bfs-log">
    <span class="info">Click "Step" to begin crawling from the seed node…</span>
  </div>
</div>

<script>
(function() {
  var W = 700, H = 320;
  var canvas = document.getElementById('bfs-canvas');
  var ctx = canvas.getContext('2d');

  /* Node layout */
  var nodes = [
    { id: 0, label: "seed.io",    x: 350, y: 50,  state: "seed"    },
    { id: 1, label: "page-A",     x: 160, y: 130, state: "unseen"  },
    { id: 2, label: "page-B",     x: 350, y: 130, state: "unseen"  },
    { id: 3, label: "page-C",     x: 540, y: 130, state: "unseen"  },
    { id: 4, label: "page-D",     x: 80,  y: 230, state: "unseen"  },
    { id: 5, label: "page-E",     x: 230, y: 230, state: "unseen"  },
    { id: 6, label: "page-F",     x: 350, y: 230, state: "unseen"  },
    { id: 7, label: "page-G",     x: 470, y: 230, state: "unseen"  },
    { id: 8, label: "page-H",     x: 620, y: 230, state: "unseen"  },
    { id: 9, label: "page-I",     x: 130, y: 300, state: "unseen"  },
    { id: 10, label: "page-J",   x: 350, y: 300, state: "unseen"  },
    { id: 11, label: "page-K",   x: 570, y: 300, state: "unseen"  }
  ];

  /* Adjacency list */
  var edges = [
    [0,1],[0,2],[0,3],
    [1,4],[1,5],
    [2,5],[2,6],
    [3,7],[3,8],
    [4,9],
    [5,9],[5,10],
    [6,10],
    [7,10],[7,11],
    [8,11],
    [9,5],   /* back-edge → Bloom filter catches this */
    [10,2]   /* back-edge → Bloom filter catches this */
  ];

  var STATE_COLOR = {
    seed:    "#fbef8a",
    unseen:  "rgba(255,255,255,0.12)",
    queued:  "#fbef8a",
    visited: "#7bcdab",
    active:  "#89c0d0",
    filtered:"#f08080"
  };
  var STATE_TEXT = {
    seed:    "#19191c",
    unseen:  "rgba(255,255,255,0.45)",
    queued:  "#19191c",
    visited: "#19191c",
    active:  "#19191c",
    filtered:"#19191c"
  };

  function adjOf(id) {
    var out = [];
    edges.forEach(function(e){ if (e[0] === id) out.push(e[1]); });
    return out;
  }

  var queue = [0];
  var visited = new Set();
  var filtered = 0;
  var autoTimer = null;

  function nodeState(id) { return nodes[id].state; }

  function draw() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width  = canvas.offsetWidth  * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    var cw = canvas.offsetWidth, ch = canvas.offsetHeight;
    var scaleX = cw / W, scaleY = ch / H;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#0e0f12";
    ctx.fillRect(0, 0, cw, ch);

    /* Draw edges */
    edges.forEach(function(e) {
      var a = nodes[e[0]], b = nodes[e[1]];
      ctx.beginPath();
      ctx.moveTo(a.x * scaleX, a.y * scaleY);
      ctx.lineTo(b.x * scaleX, b.y * scaleY);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    /* Draw nodes */
    nodes.forEach(function(n) {
      var nx = n.x * scaleX, ny = n.y * scaleY;
      var r = 22 * Math.min(scaleX, scaleY);
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fillStyle = STATE_COLOR[n.state] || STATE_COLOR.unseen;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = STATE_TEXT[n.state] || "rgba(255,255,255,0.45)";
      ctx.font = "bold " + Math.round(9 * Math.min(scaleX, scaleY)) + "px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, nx, ny);
    });
  }

  function log(msg, cls) {
    var el = document.getElementById('bfs-log');
    var line = document.createElement('div');
    line.className = cls || 'info';
    line.textContent = msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function updateStats() {
    document.getElementById('bfs-visited-count').textContent = visited.size;
    document.getElementById('bfs-queue-count').textContent   = queue.length;
    document.getElementById('bfs-filtered-count').textContent = filtered;
    var cur = queue.length > 0 ? nodes[queue[0]].label : (visited.size === nodes.length ? "done" : "—");
    document.getElementById('bfs-current').textContent = cur;
  }

  function step() {
    if (queue.length === 0) {
      log("✓ Crawl complete — " + visited.size + " pages visited", "vis");
      document.getElementById('bfs-step').disabled = true;
      document.getElementById('bfs-auto').disabled = true;
      stopAuto();
      return;
    }
    var id = queue.shift();
    if (visited.has(id)) {
      filtered++;
      nodes[id].state = "filtered";
      log("⊘ Bloom filter hit: " + nodes[id].label + " already visited", "dup");
      updateStats(); draw(); return;
    }
    nodes[id].state = "active";
    draw();

    setTimeout(function() {
      visited.add(id);
      nodes[id].state = "visited";
      log("✓ Visited: " + nodes[id].label, "vis");
      adjOf(id).forEach(function(nb) {
        if (!visited.has(nb) && queue.indexOf(nb) < 0) {
          queue.push(nb);
          nodes[nb].state = "queued";
          log("  → queued: " + nodes[nb].label, "que");
        } else if (visited.has(nb)) {
          filtered++;
          log("  ⊘ Bloom: " + nodes[nb].label + " already seen", "dup");
        }
      });
      updateStats(); draw();
    }, 180);
  }

  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    document.getElementById('bfs-auto').textContent = "Auto-play";
  }

  document.getElementById('bfs-step').addEventListener('click', step);
  document.getElementById('bfs-auto').addEventListener('click', function() {
    if (autoTimer) { stopAuto(); return; }
    this.textContent = "⏸ Pause";
    autoTimer = setInterval(step, 600);
  });
  document.getElementById('bfs-reset').addEventListener('click', function() {
    stopAuto();
    nodes.forEach(function(n,i){ n.state = i === 0 ? "seed" : "unseen"; });
    queue = [0]; visited = new Set(); filtered = 0;
    document.getElementById('bfs-log').innerHTML = '<span class="info">Click "Step" to begin crawling from the seed node…</span>';
    document.getElementById('bfs-step').disabled = false;
    document.getElementById('bfs-auto').disabled = false;
    updateStats(); draw();
  });

  nodes[0].state = "seed";
  draw(); updateStats();
  window.addEventListener('resize', draw);
})();
</script>

---

## 10. Capacity Estimation

<table class="cap-table">
  <thead>
    <tr>
      <th>Metric</th>
      <th>Assumption</th>
      <th style="text-align:right">Value</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Total pages</td><td>Target</td><td class="num">1,000,000,000</td></tr>
    <tr><td>Avg page size</td><td>HTML only</td><td class="num">100 KB</td></tr>
    <tr><td>Raw HTML storage</td><td>1B × 100KB</td><td class="num">100 TB</td></tr>
    <tr><td>Required throughput</td><td>1B ÷ 2,592,000s</td><td class="num">~400 pages/sec</td></tr>
    <tr><td>Network bandwidth</td><td>400 × 100KB</td><td class="num">~40 MB/s</td></tr>
    <tr><td>Min fetcher threads</td><td>400 pages/sec × 0.5s avg</td><td class="num">200 threads</td></tr>
    <tr><td>Fetcher nodes</td><td>100 threads/node</td><td class="num">~100 nodes</td></tr>
    <tr><td>DNS lookups/sec (raw)</td><td>400 req/sec × distinct domains</td><td class="num">~400/sec</td></tr>
    <tr><td>DNS lookups/sec (cached)</td><td>70% cache hit rate</td><td class="num">~120/sec</td></tr>
    <tr><td>Bloom filter RAM (1B URLs)</td><td>1% FPR, 9.6 bits/key</td><td class="num">1.2 GB</td></tr>
    <tr><td>URL metadata DB</td><td>1B × 200 bytes</td><td class="num">~200 GB</td></tr>
    <tr><td>robots.txt cache</td><td>50K domains × 2KB</td><td class="num">~100 MB</td></tr>
  </tbody>
</table>

<div class="callout callout-green">
  <strong>Rule of thumb:</strong> At search-engine scale, the bottleneck is almost never CPU — it's network I/O, DNS latency, and politeness constraints. Design the frontier and rate-limiter before worrying about parser throughput.
</div>

---

## 11. Scrapy vs. Custom Crawler

<table class="compare-table">
  <thead>
    <tr>
      <th>Feature</th>
      <th>Scrapy</th>
      <th>Custom (Distributed)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Setup time</td>
      <td class="yes">Hours</td>
      <td class="no">Weeks–months</td>
    </tr>
    <tr>
      <td>Scale ceiling</td>
      <td class="part">~1M pages/day (single node)</td>
      <td class="yes">Billions of pages/day</td>
    </tr>
    <tr>
      <td>Politeness built-in</td>
      <td class="yes">Yes (AUTOTHROTTLE)</td>
      <td class="part">Must implement manually</td>
    </tr>
    <tr>
      <td>robots.txt support</td>
      <td class="yes">Yes</td>
      <td class="part">Must implement manually</td>
    </tr>
    <tr>
      <td>Custom URL priority</td>
      <td class="part">Limited</td>
      <td class="yes">Full control</td>
    </tr>
    <tr>
      <td>Distributed frontier</td>
      <td class="no">No (use Scrapyd / Scrapy-Redis)</td>
      <td class="yes">Native design</td>
    </tr>
    <tr>
      <td>Fault tolerance</td>
      <td class="part">Basic (Scrapy-Redis helps)</td>
      <td class="yes">Designed in (leases, WAL)</td>
    </tr>
    <tr>
      <td>Best for</td>
      <td>Targeted scraping, ≤ 10M pages</td>
      <td>Search engine, ≥ 100M pages</td>
    </tr>
  </tbody>
</table>

---

## 12. Summary

The web crawler is a deceptively rich system design problem. Each layer of scale breaks the previous solution:

| Level | Problem introduced | Solution |
|-------|--------------------|----------|
| 1 | Speed | Multi-threading / multi-node |
| 2 | URL dedup memory | Bloom filter |
| 3 | Server abuse | robots.txt + per-domain rate limiting |
| 4 | Content dedup | MD5 (exact) + SimHash (near-duplicate) |
| 5 | Single point of failure | Distributed frontier + stateless fetchers |
| 6 | Stale content | Priority queue + freshness scoring |
| 7 | Infinite traps | Depth limit + domain URL cap + retry backoff |

In an interview, walk through these levels in order. Mention the Bloom filter's memory trade-off explicitly (interviewers love it). Draw the distributed pipeline with the feedback loop. And always name-check politeness — it signals real-world awareness that separates senior engineers from textbook answers.

<script>
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre.code-block');
  var text = pre ? pre.innerText : '';
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function(){ btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}
</script>
