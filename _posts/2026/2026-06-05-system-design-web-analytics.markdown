---
layout: post
title: "System Design: Web Analytics Pipeline — Building Google Analytics from Scratch"
date: 2026-06-05 10:00:00 +0000
categories: ["post"]
tags: [system-design, analytics, kafka, clickhouse, data-pipeline, olap, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios
</div>

{: class="marginalia" }
**ClickHouse was open-<br/>sourced by Yandex in<br/>2016. It was built to<br/>power Yandex.Metrica,<br/>which processes 25+<br/>billion events per day.<br/>Now used by Cloudflare,<br/>Uber, and thousands<br/>more.**

Design a web analytics system like Google Analytics. Website owners embed a tracking script. Every page view, click, and event is collected. The dashboard shows real-time active users, page views, sessions, bounce rate, top pages, and geographic breakdown. Scale: **10 billion events per day** across all customers.

**The question:** *Design a web analytics platform like Google Analytics. Website owners embed a JS snippet. Every event is collected, stored, and queryable in near-real-time. Support 10 billion events per day.*

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
.stat-card { background:#1a1b1f;border:1px solid #2e2f35;border-radius:10px;padding:1rem;text-align:center; }
.stat-num  { font-size:1.5rem;font-weight:700;color:#fbef8a;line-height:1.2; }
.stat-lbl  { font-size:.72rem;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.06em;margin-top:.3rem; }

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

.pipe-flow { display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin:1.2rem 0; }
.pipe-node { background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.55rem .9rem;font-size:.78rem;color:rgba(255,255,255,.8);text-align:center;min-width:90px;transition:all .4s; }
.pipe-node.lit { border-color:#7bcdab;background:#1a2e22;color:#7bcdab;box-shadow:0 0 12px rgba(123,205,171,.25); }
.pipe-node.kafka { border-color:#fbef8a;background:#25240e;color:#fbef8a; }
.pipe-node.kafka.lit { box-shadow:0 0 12px rgba(251,239,138,.25); }
.pipe-arrow { color:rgba(255,255,255,.22);font-size:.9rem;flex-shrink:0; }
.pipe-dot { width:8px;height:8px;border-radius:50%;background:#7bcdab;display:inline-block;margin:0 2px;opacity:0;transition:opacity .15s; }
.pipe-dot.on { opacity:1; }

.event-log { background:#0d0e11;border:1px solid #1e2025;border-radius:8px;font-family:"JetBrains Mono","Fira Code",monospace;font-size:.75rem;height:160px;overflow-y:auto;padding:.7rem;margin:.8rem 0;color:rgba(255,255,255,.6); }
.event-log .ev-row { padding:.2rem 0;border-bottom:1px solid #151618;display:flex;gap:.7rem; }
.event-log .ev-time { color:#5a6272;min-width:60px; }
.event-log .ev-type { color:#fbef8a;min-width:70px; }
.event-log .ev-page { color:#7bcdab; }

.payload-box { background:#0d0e11;border:1px solid #1e2025;border-radius:8px;padding:1rem;font-family:"JetBrains Mono","Fira Code",monospace;font-size:.77rem;line-height:1.7;color:rgba(255,255,255,.72);display:none;margin-top:.8rem; }
.payload-box.show { display:block; }

.arch-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.2rem 0; }
@media(max-width:600px) { .arch-grid { grid-template-columns:1fr; } }
.arch-card { background:#1a1b1f;border:1px solid #2e2f35;border-radius:10px;padding:1rem 1.1rem; }
.arch-card h4 { margin:0 0 .5rem;color:#fbef8a;font-size:.85rem; }
.arch-card p { margin:0;font-size:.8rem;color:rgba(255,255,255,.65);line-height:1.6; }

.dash-wrap { background:#141518;border:1px solid #2e2f35;border-radius:14px;overflow:hidden;margin:1.5rem 0; }
.dash-header { background:#1a1b1f;padding:.8rem 1.2rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #2e2f35;flex-wrap:wrap;gap:.6rem; }
.dash-header .dash-title { font-size:.9rem;font-weight:700;color:rgba(255,255,255,.85); }
.date-btns { display:flex;gap:.4rem; }
.date-btn { padding:4px 10px;border-radius:5px;border:1px solid #3a3b40;background:transparent;color:rgba(255,255,255,.55);font-size:.73rem;cursor:pointer;font-family:inherit;transition:all .2s; }
.date-btn.active { border-color:#7bcdab;color:#7bcdab;background:#1a2e22; }
.dash-body { padding:1.2rem; }
.kpi-row { display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.8rem;margin-bottom:1.2rem; }
.kpi-card { background:#1e1f24;border:1px solid #2e2f35;border-radius:10px;padding:.9rem;text-align:center; }
.kpi-val { font-size:1.35rem;font-weight:800;color:#fbef8a;line-height:1.2; }
.kpi-lbl { font-size:.68rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.07em;margin-top:.3rem; }
.kpi-delta { font-size:.72rem;margin-top:.2rem; }
.kpi-delta.up { color:#7bcdab; }
.kpi-delta.dn { color:#f08080; }

.chart-area { background:#0d0e11;border:1px solid #1e2025;border-radius:8px;margin-bottom:1rem;overflow:hidden; }
.top-pages-table { width:100%;border-collapse:collapse;font-size:.8rem; }
.top-pages-table th { color:rgba(255,255,255,.38);font-weight:500;font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;padding:7px 10px;border-bottom:1px solid #2e2f35;text-align:left; }
.top-pages-table td { padding:8px 10px;border-bottom:1px solid #1a1b1f;color:rgba(255,255,255,.75); }
.top-pages-table tr:hover td { background:#1a1b1f; }
.bar-mini { height:6px;border-radius:3px;background:#7bcdab;margin-top:3px; }
.realtime-widget { display:flex;align-items:center;justify-content:space-between;background:#1a2e22;border:1px solid rgba(123,205,171,.2);border-radius:10px;padding:.9rem 1.1rem;margin:.8rem 0; }
.rt-label { font-size:.75rem;color:rgba(255,255,255,.5); }
.rt-num { font-size:2rem;font-weight:800;color:#7bcdab;line-height:1; }
.rt-dot { width:10px;height:10px;background:#7bcdab;border-radius:50%;display:inline-block;margin-right:.4rem;animation:pulse-dot 1.4s ease-in-out infinite; }
@keyframes pulse-dot { 0%,100% { opacity:1;transform:scale(1); } 50% { opacity:.4;transform:scale(.7); } }

.geo-bar-row { display:flex;align-items:center;gap:.8rem;margin:.4rem 0; }
.geo-flag { font-size:1rem;min-width:24px; }
.geo-country { font-size:.8rem;color:rgba(255,255,255,.7);min-width:110px; }
.geo-track { flex:1;background:#1e1f24;border-radius:3px;height:10px;overflow:hidden; }
.geo-fill { height:100%;background:#7bcdab;border-radius:3px;transition:width .6s; }
.geo-pct { font-size:.75rem;color:rgba(255,255,255,.45);min-width:36px;text-align:right;font-family:"JetBrains Mono","Fira Code",monospace; }

.session-flow { display:flex;gap:.3rem;flex-wrap:wrap;margin:.8rem 0; }
.sf-event { background:#1a1b1f;border:1px solid #2e2f35;border-radius:6px;padding:.4rem .7rem;font-size:.75rem;color:rgba(255,255,255,.7);position:relative; }
.sf-event.same-session { border-color:#7bcdab;background:#1a2e22;color:#7bcdab; }
.sf-event.bounce { border-color:#f08080;background:#2a1616;color:#f08080; }
.sf-session-label { position:absolute;top:-18px;left:0;font-size:.65rem;color:rgba(255,255,255,.3);white-space:nowrap; }

.privacy-grid { display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin:1rem 0; }
@media(max-width:550px) { .privacy-grid { grid-template-columns:1fr; } }
.privacy-card { background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.9rem 1rem;font-size:.8rem;color:rgba(255,255,255,.7);line-height:1.6; }
.privacy-card strong { color:#fbef8a;display:block;margin-bottom:.3rem; }
</style>

## 1. Scale &amp; Constraints

Nail the numbers before proposing any architecture. Ten billion events per day sounds large in the abstract — let's make it concrete.

<div class="stat-grid">
  <div class="stat-card"><span class="stat-num">10B</span><div class="stat-lbl">Events / day</div></div>
  <div class="stat-card"><span class="stat-num">~115K</span><div class="stat-lbl">Events / sec (avg)</div></div>
  <div class="stat-card"><span class="stat-num">~500K</span><div class="stat-lbl">Events / sec (peak)</div></div>
  <div class="stat-card"><span class="stat-num">5 TB</span><div class="stat-lbl">Ingested / day</div></div>
  <div class="stat-card"><span class="stat-num">3.6 PB</span><div class="stat-lbl">Raw storage (2 yr)</div></div>
  <div class="stat-card"><span class="stat-num">&lt;1 s</span><div class="stat-lbl">Dashboard query SLA</div></div>
</div>

Three key insights jump out:
1. **Write throughput dominates.** 115K events/sec average, 500K peak. No SQL database handles this naively.
2. **Read patterns are analytical.** Dashboard queries are `GROUP BY`, `COUNT`, time-range scans — the opposite of OLTP point lookups.
3. **Retention is long.** 2 years of raw events, but lifetime of pre-aggregated rollups. Storage is the dominant cost.

---

## 2. The Tracking Snippet

Before designing servers, understand *how data enters the system*. Every analytics product starts with a few lines of JavaScript embedded on the customer's website.

<div class="code-wrap">
<div class="code-lang">html <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">&lt;!-- Embed on every page --&gt;</span>
<span class="op">&lt;</span><span class="ty">script</span> <span class="pp">src</span><span class="op">=</span><span class="st">"//analytics.example.com/track.js"</span><span class="op">&gt;&lt;/</span><span class="ty">script</span><span class="op">&gt;</span></pre>
</div>

The loaded script collects context and fires a beacon on every meaningful event:

<div class="code-wrap">
<div class="code-lang">javascript <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">// track.js — simplified</span>
<span class="kw">var</span> <span class="ty">Analytics</span> <span class="op">=</span> (<span class="kw">function</span>() {
  <span class="kw">var</span> SITE_ID <span class="op">=</span> <span class="fn">getScriptParam</span>(<span class="st">'site'</span>);
  <span class="kw">var</span> SESSION_ID <span class="op">=</span> <span class="fn">getOrCreateSession</span>();
  <span class="kw">var</span> ENDPOINT <span class="op">=</span> <span class="st">'//analytics.example.com/collect'</span>;

  <span class="kw">function</span> <span class="fn">buildPayload</span>(eventType, extra) {
    <span class="kw">return</span> <span class="ty">JSON</span>.<span class="fn">stringify</span>({
      siteId:    SITE_ID,
      sessionId: SESSION_ID,
      pageUrl:   <span class="ty">location</span>.href,
      referrer:  <span class="ty">document</span>.referrer,
      userAgent: <span class="ty">navigator</span>.userAgent,
      screenRes: <span class="ty">screen</span>.width <span class="op">+</span> <span class="st">'x'</span> <span class="op">+</span> <span class="ty">screen</span>.height,
      timestamp: <span class="ty">Date</span>.<span class="fn">now</span>(),
      eventType: eventType,
      extra:     extra <span class="op">||</span> {}
    });
  }

  <span class="kw">function</span> <span class="fn">send</span>(eventType, extra) {
    <span class="cm">// sendBeacon: fire-and-forget, survives page unload</span>
    <span class="kw">if</span> (<span class="ty">navigator</span>.sendBeacon) {
      <span class="ty">navigator</span>.<span class="fn">sendBeacon</span>(ENDPOINT, <span class="fn">buildPayload</span>(eventType, extra));
    } <span class="kw">else</span> {
      <span class="cm">// Fallback: synchronous XHR (blocks page close briefly)</span>
      <span class="kw">var</span> xhr <span class="op">=</span> <span class="kw">new</span> <span class="ty">XMLHttpRequest</span>();
      xhr.<span class="fn">open</span>(<span class="st">'POST'</span>, ENDPOINT, <span class="kw">false</span>);
      xhr.<span class="fn">send</span>(<span class="fn">buildPayload</span>(eventType, extra));
    }
  }

  <span class="cm">// Fire pageview on load</span>
  <span class="fn">send</span>(<span class="st">'pageview'</span>);

  <span class="cm">// Track single-page app navigation</span>
  <span class="kw">var</span> _pushState <span class="op">=</span> <span class="ty">history</span>.pushState;
  <span class="ty">history</span>.pushState <span class="op">=</span> <span class="kw">function</span>() {
    _pushState.<span class="fn">apply</span>(<span class="kw">this</span>, arguments);
    <span class="fn">send</span>(<span class="st">'pageview'</span>);
  };

  <span class="kw">return</span> { track: <span class="kw">function</span>(name, data) { <span class="fn">send</span>(name, data); } };
})();</pre>
</div>

**Why `sendBeacon` and not `fetch`?** `sendBeacon` is designed for analytics: it queues the request in the browser's network stack so it completes *even when the user navigates away or closes the tab*. `fetch` without `keepalive: true` is cancelled on page unload, silently dropping the event.

**Why not `<img src="?data=...">` (the classic tracking pixel)?** Limited to GET requests, URL length cap (~2 KB), no JSON body. Fine for ad impression tracking, wrong for rich event payloads.

<div class="callout callout-yellow">
<strong>Interview signal:</strong> Mentioning <code>sendBeacon</code> vs <code>fetch</code> vs image pixel and knowing <em>why</em> each exists immediately differentiates a systems-thinking candidate from someone who just described "an HTTP POST."
</div>

### Interactive: Tracking Snippet Demo

<div class="viz-wrap">
  <div class="viz-title">&#9654; Mock website — watch events fire</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
    <div style="background:#1a1b1f;border:1px solid #2e2f35;border-radius:10px;padding:1.2rem;">
      <div style="font-size:.72rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.8rem;">mock website</div>
      <div style="font-size:.95rem;color:rgba(255,255,255,.85);font-weight:700;margin-bottom:.5rem;">My Awesome Blog</div>
      <div style="font-size:.8rem;color:rgba(255,255,255,.5);margin-bottom:1rem;line-height:1.5;">Welcome! Click around to generate analytics events.</div>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem;">
        <button class="viz-btn" onclick="mockClick('button_click','Sign Up')">Sign Up CTA</button>
        <button class="viz-btn" onclick="mockClick('button_click','Read More')">Read More</button>
      </div>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
        <button class="viz-btn" onclick="mockNavigate('/blog/post-1')">&#8594; Blog Post 1</button>
        <button class="viz-btn" onclick="mockNavigate('/about')">&#8594; About</button>
        <button class="viz-btn" onclick="mockNavigate('/pricing')">&#8594; Pricing</button>
      </div>
      <div style="margin-top:1rem;">
        <button class="viz-btn" onclick="togglePayload()" id="payload-toggle">View Raw Payload</button>
      </div>
      <div class="payload-box" id="payload-display"></div>
    </div>
    <div>
      <div style="font-size:.72rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem;">event log (collector receives)</div>
      <div class="event-log" id="event-log-display">
        <div style="color:rgba(255,255,255,.2);padding:.5rem 0;">Events will appear here...</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.72rem;color:rgba(255,255,255,.35);padding:0 2px;">
        <span>Events fired: <span id="event-count" style="color:#fbef8a;">0</span></span>
        <span>Session: <span id="session-display" style="color:#7bcdab;">s_demo1</span></span>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  var evCount = 0;
  var lastPayload = null;
  var lastEventTime = Date.now();
  var sessionId = 's_' + Math.random().toString(36).substr(2, 6);
  document.getElementById('session-display').textContent = sessionId;

  window.mockClick = function(type, label) {
    fireEvent(type, { label: label, element: 'button' });
  };
  window.mockNavigate = function(path) {
    fireEvent('pageview', { page: path });
  };

  function fireEvent(type, extra) {
    var now = Date.now();
    var delta = now - lastEventTime;
    lastEventTime = now;
    evCount++;
    document.getElementById('event-count').textContent = evCount;

    var payload = {
      siteId: 'site_abc123',
      sessionId: sessionId,
      pageUrl: 'https://myblog.com' + (extra.page || '/'),
      referrer: evCount === 1 ? 'https://google.com' : 'https://myblog.com/',
      userAgent: 'Mozilla/5.0 (demo)',
      screenRes: '1440x900',
      timestamp: now,
      eventType: type,
      extra: extra
    };
    lastPayload = payload;

    var log = document.getElementById('event-log-display');
    if (evCount === 1) { log.innerHTML = ''; }
    var row = document.createElement('div');
    row.className = 'ev-row';
    var t = new Date(now);
    var ts = t.getHours() + ':' + String(t.getMinutes()).padStart(2,'0') + ':' + String(t.getSeconds()).padStart(2,'0');
    var pageText = extra.page || extra.label || '/';
    var deltaText = delta < 5000 ? ('+' + (delta/1000).toFixed(1) + 's') : 'new';
    row.innerHTML = '<span class="ev-time">' + ts + '</span><span class="ev-type">' + type + '</span><span class="ev-page">' + pageText + '</span><span style="color:#5a6272;font-size:.7rem;margin-left:auto;">' + deltaText + '</span>';
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;

    if (document.getElementById('payload-display').classList.contains('show')) {
      renderPayload(payload);
    }
  }

  function renderPayload(p) {
    var lines = [];
    lines.push('<span style="color:#fbef8a;">{</span>');
    Object.keys(p).forEach(function(k) {
      var v = p[k];
      var vs = (typeof v === 'object') ? JSON.stringify(v) : JSON.stringify(v);
      lines.push('  <span style="color:#89c0d0;">"' + k + '"</span><span style="color:rgba(255,255,255,.4);">:</span> <span style="color:#f8c555;">' + vs + '</span><span style="color:rgba(255,255,255,.3);">,</span>');
    });
    lines.push('<span style="color:#fbef8a;">}</span>');
    document.getElementById('payload-display').innerHTML = lines.join('\n');
  }

  window.togglePayload = function() {
    var box = document.getElementById('payload-display');
    var btn = document.getElementById('payload-toggle');
    if (box.classList.contains('show')) {
      box.classList.remove('show');
      btn.textContent = 'View Raw Payload';
    } else {
      box.classList.add('show');
      btn.textContent = 'Hide Payload';
      if (lastPayload) { renderPayload(lastPayload); }
      else { box.innerHTML = '<span style="color:rgba(255,255,255,.35);">Fire an event first.</span>'; }
    }
  };

  fireEvent('pageview', { page: '/' });
})();

function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText || pre.textContent).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}
</script>

---

## 3. Level 1 — Naive: Direct SQL Writes

The instinct: every beacon fires an `INSERT` into an `events` table.

<div class="code-wrap">
<div class="code-lang">sql</div>
<pre class="code-block"><span class="cm">-- The naive schema</span>
<span class="kw">CREATE TABLE</span> <span class="ty">events</span> (
  id         <span class="ty">BIGSERIAL PRIMARY KEY</span>,
  site_id    <span class="ty">TEXT</span>,
  session_id <span class="ty">TEXT</span>,
  page_url   <span class="ty">TEXT</span>,
  event_type <span class="ty">TEXT</span>,
  user_agent <span class="ty">TEXT</span>,
  ip_address <span class="ty">TEXT</span>,
  ts         <span class="ty">TIMESTAMPTZ</span>
);

<span class="cm">-- One INSERT per event: 115,000/sec average</span>
<span class="kw">INSERT INTO</span> events (site_id, session_id, page_url, event_type, ip_address, ts)
<span class="kw">VALUES</span> (<span class="st">'site_abc'</span>, <span class="st">'sess_xyz'</span>, <span class="st">'/home'</span>, <span class="st">'pageview'</span>, <span class="st">'203.0.113.5'</span>, <span class="fn">NOW</span>());</pre>
</div>

**Why this fails immediately:**
- PostgreSQL handles ~5–10K simple inserts/sec on a single node. You need 115K average.
- OLTP databases are row-oriented — every analytical query (`GROUP BY page_url`, `COUNT(*) WHERE site_id = ?`) does a full sequential scan.
- ACID overhead (WAL, MVCC) wastes I/O on write-once, never-update data.
- At 5 TB/day, storage costs on a SQL instance are punishing.

<div class="callout callout-red">
<strong>Red flag in an interview:</strong> Jumping straight to "shard the SQL database." Sharding adds complexity without fixing the fundamental mismatch between OLTP row storage and analytical read patterns.
</div>

---

## 4. Level 2 — Write Buffer + Batch Insert

Buffer events in memory (or Redis), flush every 5 seconds.

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Collector service — buffered writer</span>
<span class="kw">import</span> asyncio, collections

buffer <span class="op">=</span> collections.<span class="fn">deque</span>()
BATCH_SIZE <span class="op">=</span> <span class="nu">5000</span>
FLUSH_INTERVAL <span class="op">=</span> <span class="nu">5</span>  <span class="cm"># seconds</span>

<span class="kw">async def</span> <span class="fn">receive_event</span>(event):
    buffer.<span class="fn">append</span>(event)
    <span class="kw">if</span> <span class="fn">len</span>(buffer) <span class="op">>=</span> BATCH_SIZE:
        <span class="kw">await</span> <span class="fn">flush</span>()

<span class="kw">async def</span> <span class="fn">flush</span>():
    batch <span class="op">=</span> [buffer.<span class="fn">popleft</span>() <span class="kw">for</span> _ <span class="kw">in</span> <span class="fn">range</span>(<span class="fn">min</span>(BATCH_SIZE, <span class="fn">len</span>(buffer)))]
    <span class="kw">if</span> batch:
        <span class="kw">await</span> db.<span class="fn">executemany</span>(<span class="st">"INSERT INTO events ..."</span>, batch)

<span class="kw">async def</span> <span class="fn">periodic_flush</span>():
    <span class="kw">while</span> <span class="kw">True</span>:
        <span class="kw">await</span> asyncio.<span class="fn">sleep</span>(FLUSH_INTERVAL)
        <span class="kw">await</span> <span class="fn">flush</span>()</pre>
</div>

**Improvement:** Reduces write amplification from 115K individual INSERTs/sec to ~1 batch per 5 seconds. Batch inserts are 10–50× cheaper per row.

**Still broken:** The fundamental read-performance problem remains. SQL is still scanning billions of rows for every dashboard query. A `COUNT(*)` over 30 days of data requires reading every row in that time range. And you lose all events in the buffer if the collector crashes.

---

## 5. Level 3 — Kafka + ClickHouse (The Right Architecture)

This is where the real design begins. Two insights drive the architecture:

1. **Decouple ingestion from storage** using a durable message queue (Kafka). Collectors write fast; consumers write at their own pace.
2. **Use a columnar OLAP database** (ClickHouse) instead of a row-oriented SQL database.

### The Pipeline

<div class="viz-wrap">
  <div class="viz-title">&#9654; Animated pipeline — click "Fire Events" to watch data flow</div>
  <div class="pipe-flow" id="pipeline-flow">
    <div class="pipe-node" id="pn-script">JS Snippet</div>
    <div class="pipe-arrow">&#8594;</div>
    <div class="pipe-node" id="pn-collector">Collector<br/><span style="font-size:.68rem;color:rgba(255,255,255,.4);">50 servers</span></div>
    <div class="pipe-arrow">&#8594;</div>
    <div class="pipe-node kafka" id="pn-kafka">Kafka<br/><span style="font-size:.68rem;color:rgba(251,239,138,.5);">raw-events</span></div>
    <div class="pipe-arrow">&#8594;</div>
    <div class="pipe-node" id="pn-flink">Flink<br/><span style="font-size:.68rem;color:rgba(255,255,255,.4);">stream proc</span></div>
    <div class="pipe-arrow">&#8594;</div>
    <div style="display:flex;flex-direction:column;gap:.5rem;">
      <div class="pipe-node" id="pn-ch">ClickHouse<br/><span style="font-size:.68rem;color:rgba(255,255,255,.4);">raw + rollups</span></div>
      <div class="pipe-node" id="pn-redis">Redis<br/><span style="font-size:.68rem;color:rgba(255,255,255,.4);">real-time</span></div>
    </div>
  </div>

  <div class="viz-controls">
    <button class="viz-btn run" id="pipe-fire-btn" onclick="firePipelineEvents()">Fire 100 Events</button>
    <button class="viz-btn" onclick="queryDashboard()">Query Dashboard</button>
    <button class="viz-btn" onclick="resetPipeline()">Reset</button>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.8rem;margin-top:.8rem;">
    <div style="background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.8rem;font-size:.78rem;">
      <div style="color:rgba(255,255,255,.38);font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem;">Kafka lag</div>
      <div id="kafka-lag" style="color:#fbef8a;font-size:1.1rem;font-weight:700;">0 msg</div>
    </div>
    <div style="background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.8rem;font-size:.78rem;">
      <div style="color:rgba(255,255,255,.38);font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem;">ClickHouse rows</div>
      <div id="ch-rows" style="color:#7bcdab;font-size:1.1rem;font-weight:700;">0</div>
    </div>
    <div style="background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.8rem;font-size:.78rem;">
      <div style="color:rgba(255,255,255,.38);font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem;">Redis HLL keys</div>
      <div id="redis-keys" style="color:#89c0d0;font-size:1.1rem;font-weight:700;">0</div>
    </div>
  </div>

  <div id="pipe-query-result" style="display:none;margin-top:1rem;background:#0d0e11;border:1px solid #2e2f35;border-radius:8px;padding:.9rem;font-family:'JetBrains Mono','Fira Code',monospace;font-size:.78rem;color:rgba(255,255,255,.75);line-height:1.8;"></div>
</div>

<script>
(function() {
  var chRows = 0;
  var redisKeys = 0;
  var kafkaLag = 0;
  var pipeRunning = false;

  var nodes = ['pn-script','pn-collector','pn-kafka','pn-flink','pn-ch','pn-redis'];

  function litNode(id, duration) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.add('lit');
      setTimeout(function() { el.classList.remove('lit'); }, duration || 600);
    }
  }

  window.firePipelineEvents = function() {
    if (pipeRunning) return;
    pipeRunning = true;
    var btn = document.getElementById('pipe-fire-btn');
    btn.textContent = 'Firing...';
    btn.disabled = true;

    var evFired = 0;
    var total = 100;
    kafkaLag = total;
    document.getElementById('kafka-lag').textContent = kafkaLag + ' msg';

    var interval = setInterval(function() {
      if (evFired >= total) {
        clearInterval(interval);
        pipeRunning = false;
        btn.textContent = 'Fire 100 Events';
        btn.disabled = false;
        return;
      }
      var batch = Math.min(5, total - evFired);
      evFired += batch;

      litNode('pn-script', 300);
      setTimeout(function() { litNode('pn-collector', 300); }, 120);
      setTimeout(function() {
        litNode('pn-kafka', 400);
        kafkaLag = Math.max(0, total - evFired);
        document.getElementById('kafka-lag').textContent = kafkaLag + ' msg';
      }, 250);
      setTimeout(function() {
        litNode('pn-flink', 350);
      }, 400);
      setTimeout(function() {
        var roll = Math.floor(Math.random() * 2);
        if (roll === 0) {
          litNode('pn-ch', 350);
          chRows += batch;
          document.getElementById('ch-rows').textContent = chRows.toLocaleString();
        } else {
          litNode('pn-redis', 350);
          if (redisKeys < 12) { redisKeys += 1; }
          document.getElementById('redis-keys').textContent = redisKeys;
        }
        if (evFired % 10 === 0) {
          litNode('pn-ch', 350);
          litNode('pn-redis', 350);
          chRows += batch;
          redisKeys = Math.min(redisKeys + 1, 12);
          document.getElementById('ch-rows').textContent = chRows.toLocaleString();
          document.getElementById('redis-keys').textContent = redisKeys;
        }
      }, 560);
    }, 120);
  };

  window.queryDashboard = function() {
    var result = document.getElementById('pipe-query-result');
    if (chRows === 0) {
      result.style.display = 'block';
      result.innerHTML = '<span style="color:#f08080;">No data yet — fire some events first.</span>';
      return;
    }
    result.style.display = 'block';
    result.innerHTML = '<span style="color:rgba(255,255,255,.35);">Querying ClickHouse...</span>';
    setTimeout(function() {
      var pvToday = (chRows * 8 + 1247).toLocaleString();
      var uniq = Math.floor(chRows * 3.2 + 340).toLocaleString();
      result.innerHTML =
        '<span style="color:#fbef8a;">-- ClickHouse query (executes in ~42ms over ' + chRows.toLocaleString() + ' rows)</span>\n' +
        '<span style="color:#cc99cd;">SELECT</span> page_url, <span style="color:#fn">COUNT</span>(*) <span style="color:#cc99cd;">AS</span> views\n' +
        '<span style="color:#cc99cd;">FROM</span> events\n' +
        '<span style="color:#cc99cd;">WHERE</span> site_id = <span style="color:#f8c555;">\'site_abc\'</span>\n' +
        '  <span style="color:#cc99cd;">AND</span> ts &gt;= today() - 7\n' +
        '<span style="color:#cc99cd;">GROUP BY</span> page_url\n' +
        '<span style="color:#cc99cd;">ORDER BY</span> views <span style="color:#cc99cd;">DESC</span>\n' +
        '<span style="color:#cc99cd;">LIMIT</span> 5;\n\n' +
        '<span style="color:#7bcdab;">Results (42ms):</span>\n' +
        '  /home        ' + pvToday + ' views\n' +
        '  /blog        ' + Math.floor(chRows * 2.1 + 880).toLocaleString() + ' views\n' +
        '  /pricing     ' + Math.floor(chRows * 1.4 + 320).toLocaleString() + ' views\n' +
        '  /about       ' + Math.floor(chRows * 0.9 + 210).toLocaleString() + ' views\n' +
        '  /contact     ' + Math.floor(chRows * 0.5 + 90).toLocaleString() + ' views\n\n' +
        '<span style="color:#89c0d0;">-- Redis HyperLogLog (real-time active users)</span>\n' +
        '<span style="color:#7bcdab;">PFCOUNT active:site_abc:5min  =>  ' + (redisKeys * 14 + Math.floor(Math.random() * 20) + 30) + ' users</span>';
    }, 480);
  };

  window.resetPipeline = function() {
    chRows = 0; redisKeys = 0; kafkaLag = 0;
    document.getElementById('ch-rows').textContent = '0';
    document.getElementById('redis-keys').textContent = '0';
    document.getElementById('kafka-lag').textContent = '0 msg';
    document.getElementById('pipe-query-result').style.display = 'none';
    nodes.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('lit');
    });
  };
})();
</script>

### Why Kafka?

- **Durability:** Events are persisted to disk. Collector crashes don't lose data.
- **Backpressure isolation:** If ClickHouse is slow, Kafka absorbs the burst. Collectors never block.
- **Replay:** Re-process 2 years of events by rewinding Kafka offset — no separate archival system needed.
- **Fan-out:** Multiple consumers (ClickHouse writer, session stitcher, alerting) read the same topic independently.

### Why ClickHouse?

<div class="arch-grid">
  <div class="arch-card">
    <h4>Row-oriented (PostgreSQL)</h4>
    <p>Each row is stored together. Great for retrieving a single record. Terrible for <code>SELECT page, COUNT(*)</code> — must read every column of every row even if you only need two columns.</p>
  </div>
  <div class="arch-card">
    <h4>Columnar (ClickHouse)</h4>
    <p>Each column is stored in its own file. Analytical query reads <em>only</em> the columns it needs. All values of a column are the same type → compress 10:1 or better. Vectorized SIMD execution over compressed blocks.</p>
  </div>
</div>

<div class="code-wrap">
<div class="code-lang">sql <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">-- ClickHouse events table</span>
<span class="kw">CREATE TABLE</span> <span class="ty">events</span> (
  site_id    <span class="ty">LowCardinality(String)</span>,   <span class="cm">-- dictionary-encoded</span>
  session_id <span class="ty">String</span>,
  page_url   <span class="ty">String</span>,
  referrer   <span class="ty">String</span>,
  event_type <span class="ty">LowCardinality(String)</span>,
  country    <span class="ty">LowCardinality(FixedString(2))</span>,
  device     <span class="ty">LowCardinality(String)</span>,
  browser    <span class="ty">LowCardinality(String)</span>,
  ts         <span class="ty">DateTime</span>
) <span class="kw">ENGINE</span> <span class="op">=</span> <span class="fn">MergeTree</span>()
  <span class="kw">PARTITION BY</span> <span class="fn">toYYYYMM</span>(ts)      <span class="cm">-- one partition per month</span>
  <span class="kw">ORDER BY</span>   (site_id, ts)        <span class="cm">-- primary sort key</span>
  <span class="kw">SETTINGS</span>   index_granularity <span class="op">=</span> <span class="nu">8192</span>;

<span class="cm">-- This query runs in &lt;1 second over 1 billion rows:</span>
<span class="kw">SELECT</span> page_url, <span class="fn">COUNT</span>(<span class="op">*</span>) <span class="kw">AS</span> views
<span class="kw">FROM</span>   events
<span class="kw">WHERE</span>  site_id <span class="op">=</span> <span class="st">'site_abc'</span>
  <span class="kw">AND</span>  ts <span class="op">&gt;=</span> <span class="fn">now</span>() <span class="op">-</span> <span class="kw">INTERVAL</span> <span class="nu">30</span> <span class="kw">DAY</span>
<span class="kw">GROUP BY</span> page_url
<span class="kw">ORDER BY</span> views <span class="kw">DESC</span>
<span class="kw">LIMIT</span> <span class="nu">10</span>;</pre>
</div>

The `MergeTree` engine in ClickHouse sorts data by the `ORDER BY` key and stores a sparse index. Queries with `WHERE site_id = ?` skip entire parts that don't match, then scan only the `page_url` and `ts` columns — no others loaded.

---

## 6. Level 4 — Real-Time vs. Batch Aggregation

The dashboard has two fundamentally different query types with different freshness requirements.

<table class="comp-table">
  <thead><tr><th>Query</th><th>Freshness</th><th>Data Source</th><th>Latency</th></tr></thead>
  <tbody>
    <tr><td>Active users right now</td><td>&lt; 5 seconds</td><td>Redis HyperLogLog</td><td>~1 ms</td></tr>
    <tr><td>Page views in last hour</td><td>~30 seconds</td><td>ClickHouse real-time</td><td>~50 ms</td></tr>
    <tr><td>Top pages last 7 days</td><td>~5 minutes</td><td>ClickHouse raw table</td><td>~200 ms</td></tr>
    <tr><td>Monthly report last year</td><td>~1 hour</td><td>ClickHouse daily rollup</td><td>~80 ms</td></tr>
  </tbody>
</table>

### Real-Time: Redis HyperLogLog

"How many users are on the site RIGHT NOW?" must update in seconds and cannot query raw events.

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Flink stream processor: update Redis on every event</span>
<span class="kw">def</span> <span class="fn">process_event</span>(event):
    site   <span class="op">=</span> event[<span class="st">'siteId'</span>]
    user   <span class="op">=</span> event[<span class="st">'sessionId'</span>]  <span class="cm"># proxy for unique user</span>

    <span class="cm"># HyperLogLog: ~1% error, O(1) space per key (~12 KB)</span>
    redis.<span class="fn">pfadd</span>(<span class="st">'active:'</span> <span class="op">+</span> site <span class="op">+</span> <span class="st">':5min'</span>, user)
    redis.<span class="fn">expire</span>(<span class="st">'active:'</span> <span class="op">+</span> site <span class="op">+</span> <span class="st">':5min'</span>, <span class="nu">300</span>)   <span class="cm"># 5-minute window</span>

    <span class="cm"># Dashboard reads: PFCOUNT active:site_abc:5min => ~147</span></pre>
</div>

### Historical: Pre-Aggregated Rollups

For longer time ranges, pre-aggregate at write time using a Materialized View in ClickHouse:

<div class="code-wrap">
<div class="code-lang">sql <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">-- Materialized view auto-aggregates as data is written</span>
<span class="kw">CREATE MATERIALIZED VIEW</span> <span class="ty">daily_page_views</span>
<span class="kw">ENGINE</span> <span class="op">=</span> <span class="fn">SummingMergeTree</span>()
<span class="kw">ORDER BY</span> (site_id, page_url, day) <span class="kw">AS</span>
<span class="kw">SELECT</span>
  site_id,
  page_url,
  <span class="fn">toDate</span>(ts)              <span class="kw">AS</span> day,
  <span class="fn">count</span>()                 <span class="kw">AS</span> views,
  <span class="fn">uniqHLL12</span>(session_id)  <span class="kw">AS</span> unique_sessions
<span class="kw">FROM</span> events
<span class="kw">GROUP BY</span> site_id, page_url, day;</pre>
</div>

`SummingMergeTree` automatically merges rows with the same key, summing the numeric columns. The 30-day top-pages query now reads a tiny rollup table instead of raw events.

### Lambda vs. Kappa Architecture

<div class="arch-grid">
  <div class="arch-card">
    <h4>Lambda Architecture</h4>
    <p>Two parallel paths: a <em>speed layer</em> (stream processing, less accurate) and a <em>batch layer</em> (MapReduce/Spark, accurate). A query layer merges both. Complex to maintain: two codebases must agree on the same business logic.</p>
  </div>
  <div class="arch-card">
    <h4>Kappa Architecture ✓</h4>
    <p>Single stream (Kafka) as the source of truth. To reprocess history, replay from beginning with new code. Simpler: one codebase, one pipeline. ClickHouse materialized views replace the batch layer entirely.</p>
  </div>
</div>

---

## 7. Level 5 — Session Stitching

Raw events are individual beacons. The dashboard needs *sessions* — grouped sequences of events from the same user within a 30-minute inactivity window.

{: class="marginalia" }
**Google Analytics 4 (GA4)<br/>moved to an event-based<br/>model in 2023, replacing<br/>the session-based Universal<br/>Analytics. The backend<br/>runs on Google BigQuery<br/>— customers can query<br/>their own raw data via<br/>BigQuery export.**

A **session** ends when 30 minutes pass with no new events from that user. The Flink stream processor uses a *session window* — a gap-based window that closes after 30 minutes of silence.

<div class="code-wrap">
<div class="code-lang">java (flink pseudocode)</div>
<pre class="code-block"><span class="cm">// Flink: sessionize events per user</span>
events
  .<span class="fn">keyBy</span>(e <span class="op">-&gt;</span> e.siteId <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> e.sessionId)
  .<span class="fn">window</span>(<span class="ty">EventTimeSessionWindows</span>.<span class="fn">withGap</span>(<span class="ty">Time</span>.<span class="fn">minutes</span>(<span class="nu">30</span>)))
  .<span class="fn">aggregate</span>(<span class="kw">new</span> <span class="ty">SessionAggregator</span>())

<span class="cm">// SessionAggregator computes per session:</span>
<span class="cm">//   - duration (last_ts - first_ts)</span>
<span class="cm">//   - page_count</span>
<span class="cm">//   - entry_page (first event url)</span>
<span class="cm">//   - exit_page (last event url)</span>
<span class="cm">//   - is_bounce (page_count == 1)</span></pre>
</div>

### Session Stitching Visualizer

<div class="viz-wrap">
  <div class="viz-title">&#9654; Events stream in — watch sessions form (30-min gap = new session)</div>
  <div id="session-stream" style="font-size:.75rem;line-height:1.8;color:rgba(255,255,255,.65);min-height:80px;"></div>
  <div class="viz-controls" style="margin-top:.8rem;">
    <button class="viz-btn run" onclick="runSessionDemo()">Simulate Events</button>
    <button class="viz-btn" onclick="document.getElementById('session-stream').innerHTML=''">Clear</button>
  </div>
  <div id="session-summary" style="display:none;margin-top:.8rem;background:#1a2e22;border:1px solid rgba(123,205,171,.2);border-radius:8px;padding:.9rem;font-size:.8rem;color:rgba(255,255,255,.75);line-height:1.8;"></div>
</div>

<script>
window.runSessionDemo = function() {
  var container = document.getElementById('session-stream');
  container.innerHTML = '';
  var summary = document.getElementById('session-summary');
  summary.style.display = 'none';

  var rawEvents = [
    { user:'u1', page:'/home',    gap:0   },
    { user:'u1', page:'/blog',    gap:45  },
    { user:'u1', page:'/post-1',  gap:90  },
    { user:'u2', page:'/home',    gap:10  },
    { user:'u1', page:'/post-2',  gap:120 },
    { user:'u1', page:'/home',    gap:2100 },  // 35-min gap -> new session
    { user:'u2', page:'/pricing', gap:200 },
    { user:'u3', page:'/home',    gap:5   },
    { user:'u1', page:'/contact', gap:60  },
    { user:'u2', page:'/home',    gap:2400 }   // new session u2
  ];

  var sessionMap = {};
  var sessionCount = 0;
  var colors = { u1:'#7bcdab', u2:'#fbef8a', u3:'#89c0d0' };

  var timeOffset = 0;
  rawEvents.forEach(function(ev, idx) {
    timeOffset += ev.gap;
    setTimeout(function() {
      var key = ev.user;
      var prev = sessionMap[key];
      var newSession = !prev || (ev.gap > 1800);
      if (newSession) {
        sessionCount++;
        sessionMap[key] = { id: 'S' + sessionCount, pages: 0, startTime: timeOffset };
      }
      sessionMap[key].pages++;
      sessionMap[key].lastTime = timeOffset;

      var row = document.createElement('div');
      var mins = Math.floor(timeOffset / 60);
      var secs = timeOffset % 60;
      var ts = 'T+' + mins + ':' + String(secs).padStart(2,'0');
      var color = colors[ev.user] || '#7bcdab';
      var badge = '<span style="background:rgba(255,255,255,.07);border-radius:4px;padding:1px 6px;color:' + color + ';font-size:.7rem;">' + sessionMap[key].id + '</span>';
      var newTag = newSession ? '<span style="color:#fbef8a;font-size:.7rem;"> &#x25BA; new session</span>' : '';
      row.innerHTML = '<span style="color:#5a6272;min-width:60px;display:inline-block;">' + ts + '</span> ' +
        '<span style="color:' + color + ';min-width:24px;display:inline-block;">' + ev.user + '</span> ' +
        '<span style="color:rgba(255,255,255,.65);min-width:120px;display:inline-block;">' + ev.page + '</span> ' +
        badge + newTag;
      container.appendChild(row);
      container.scrollTop = container.scrollHeight;

      if (idx === rawEvents.length - 1) {
        setTimeout(function() {
          var sessions = [];
          Object.keys(sessionMap).forEach(function(u) {
            var s = sessionMap[u];
            var duration = s.lastTime - s.startTime;
            var bounce = s.pages === 1;
            sessions.push(s.id + ': user=' + u + ', pages=' + s.pages + ', duration=' + Math.round(duration/60) + 'min, bounce=' + bounce);
          });
          sessions.sort();
          summary.style.display = 'block';
          summary.innerHTML = '<strong style="color:#7bcdab;">Computed Sessions:</strong><br>' + sessions.join('<br>') +
            '<br><br><strong style="color:#fbef8a;">Bounce rate:</strong> ' +
            Math.round(sessions.filter(function(s) { return s.indexOf('bounce=true') !== -1; }).length / sessions.length * 100) + '%' +
            '&nbsp; &nbsp;<strong style="color:#fbef8a;">Avg session duration:</strong> ~2.1 min';
        }, 400);
      }
    }, idx * 200);
  });
};
</script>

---

## 8. Level 6 — Dashboard Design

The dashboard is the customer-facing product. It must feel instantaneous even when querying months of data.

{: class="marginalia" }
**The "bounce rate" metric<br/>is more nuanced than it<br/>appears. A bounce is a<br/>single-page session — but<br/>a user who reads your<br/>entire blog post and<br/>leaves is also a "bounce."<br/>GA4 replaced it with<br/>"engagement rate."**

<div class="dash-wrap">
  <div class="dash-header">
    <div class="dash-title">&#x1F4CA; Analytics Dashboard — myblog.com</div>
    <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;">
      <div class="realtime-widget" style="padding:.4rem .8rem;margin:0;">
        <span class="rt-dot"></span>
        <span class="rt-label" style="font-size:.73rem;">Live:&nbsp;</span>
        <span id="rt-users" class="rt-num" style="font-size:1.1rem;color:#7bcdab;">142</span>
        <span style="font-size:.72rem;color:rgba(255,255,255,.4);margin-left:.3rem;">users</span>
      </div>
      <div class="date-btns">
        <button class="date-btn active" onclick="switchRange(this,'7d')">7d</button>
        <button class="date-btn" onclick="switchRange(this,'30d')">30d</button>
        <button class="date-btn" onclick="switchRange(this,'90d')">90d</button>
      </div>
    </div>
  </div>
  <div class="dash-body">
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-val" id="kpi-pv">284,120</div><div class="kpi-lbl">Page Views</div><div class="kpi-delta up" id="kpi-pv-d">&#x25B2; +12%</div></div>
      <div class="kpi-card"><div class="kpi-val" id="kpi-uv">41,830</div><div class="kpi-lbl">Unique Visitors</div><div class="kpi-delta up" id="kpi-uv-d">&#x25B2; +8%</div></div>
      <div class="kpi-card"><div class="kpi-val" id="kpi-sess">58,200</div><div class="kpi-lbl">Sessions</div><div class="kpi-delta up" id="kpi-sess-d">&#x25B2; +5%</div></div>
      <div class="kpi-card"><div class="kpi-val" id="kpi-dur">2m 14s</div><div class="kpi-lbl">Avg Duration</div><div class="kpi-delta dn" id="kpi-dur-d">&#x25BC; -3%</div></div>
      <div class="kpi-card"><div class="kpi-val" id="kpi-br">62%</div><div class="kpi-lbl">Bounce Rate</div><div class="kpi-delta dn" id="kpi-br-d">&#x25BC; +4%</div></div>
    </div>

    <div class="chart-area">
      <canvas id="pv-chart" height="120" style="width:100%;display:block;"></canvas>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      <div>
        <div style="font-size:.72rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.6rem;">Top Pages</div>
        <table class="top-pages-table" id="top-pages-table"></table>
      </div>
      <div>
        <div style="font-size:.72rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.6rem;">Top Countries</div>
        <div id="geo-bars"></div>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  var rangeData = {
    '7d': {
      pv:'284,120', uv:'41,830', sess:'58,200', dur:'2m 14s', br:'62%',
      pvd:'+12%', uvd:'+8%', sessd:'+5%', durd:'-3%', brd:'+4%',
      pvdUp:true, uvdUp:true, sessdUp:true, durdUp:false, brdUp:false,
      chartBase: [8200,9100,7800,10200,11400,9800,12600],
      pages: [['/home','112,400',100],['/blog','68,300',61],['/post/best-practices','44,100',39],['/pricing','29,800',26],['/about','18,200',16]],
      geo: [['&#x1F1FA;&#x1F1F8;','United States',48],['&#x1F1EC;&#x1F1E7;','United Kingdom',14],['&#x1F1E9;&#x1F1EA;','Germany',9],['&#x1F1EE;&#x1F1F3;','India',8],['&#x1F1E8;&#x1F1E6;','Canada',6]]
    },
    '30d': {
      pv:'1,142,080', uv:'183,400', sess:'241,600', dur:'2m 08s', br:'64%',
      pvd:'+22%', uvd:'+18%', sessd:'+15%', durd:'-6%', brd:'+2%',
      pvdUp:true, uvdUp:true, sessdUp:true, durdUp:false, brdUp:false,
      chartBase: [34000,38000,41000,36000,42000,39000,45000,38000,44000,47000,41000,46000,43000,50000,44000,48000,52000,46000,51000,49000,55000,48000,54000,58000,51000,56000,53000,60000,55000,62000],
      pages: [['/home','448,200',100],['/blog','271,000',60],['/post/best-practices','176,400',39],['/pricing','118,600',26],['/about','72,100',16]],
      geo: [['&#x1F1FA;&#x1F1F8;','United States',46],['&#x1F1EC;&#x1F1E7;','United Kingdom',13],['&#x1F1E9;&#x1F1EA;','Germany',10],['&#x1F1EE;&#x1F1F3;','India',9],['&#x1F1E8;&#x1F1E6;','Canada',7]]
    },
    '90d': {
      pv:'3,381,440', uv:'541,200', sess:'712,800', dur:'2m 02s', br:'65%',
      pvd:'+41%', uvd:'+35%', sessd:'+30%', durd:'-9%', brd:'+3%',
      pvdUp:true, uvdUp:true, sessdUp:true, durdUp:false, brdUp:false,
      chartBase: [38000,40000,42000,39000,44000,41000,46000,43000,48000,45000,50000,47000,52000,49000,54000,51000,56000,53000,58000,55000,60000,57000,62000,59000,64000,61000,66000,63000,68000,65000,70000,67000,72000,69000,74000,71000,76000,73000,78000,75000,80000,77000,82000,79000,84000,81000,86000,83000,88000,85000,90000,87000,92000,89000,94000,91000,96000,93000,98000,100000,96000,102000,98000,104000,100000,102000,98000,104000,100000,106000,102000,108000,104000,110000,106000,112000,108000,114000,110000,116000,112000,118000,114000,120000,116000,118000,114000,120000,116000,122000],
      pages: [['/home','1,328,200',100],['/blog','801,800',60],['/post/best-practices','522,000',39],['/pricing','350,800',26],['/about','213,600',16]],
      geo: [['&#x1F1FA;&#x1F1F8;','United States',45],['&#x1F1EC;&#x1F1E7;','United Kingdom',13],['&#x1F1E9;&#x1F1EA;','Germany',11],['&#x1F1EE;&#x1F1F3;','India',10],['&#x1F1E8;&#x1F1E6;','Canada',7]]
    }
  };

  var currentRange = '7d';

  function drawChart(data) {
    var canvas = document.getElementById('pv-chart');
    if (!canvas) return;
    canvas.width = canvas.offsetWidth || 600;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    var max = Math.max.apply(null, data);
    var min = Math.min.apply(null, data);
    var range = max - min || 1;
    var padL = 8, padR = 8, padT = 12, padB = 28;
    var chartW = w - padL - padR;
    var chartH = h - padT - padB;
    var step = chartW / (data.length - 1);

    ctx.fillStyle = '#0d0e11';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var gy = padT + chartH - (g / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy); ctx.stroke();
    }

    // Area fill
    var gradient = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    gradient.addColorStop(0, 'rgba(123,205,171,.25)');
    gradient.addColorStop(1, 'rgba(123,205,171,0)');
    ctx.beginPath();
    data.forEach(function(v, i) {
      var x = padL + i * step;
      var y = padT + chartH - ((v - min) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + (data.length - 1) * step, padT + chartH);
    ctx.lineTo(padL, padT + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#7bcdab';
    ctx.lineWidth = 2;
    data.forEach(function(v, i) {
      var x = padL + i * step;
      var y = padT + chartH - ((v - min) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // X labels
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    var labelStep = Math.floor(data.length / 6);
    for (var i2 = 0; i2 < data.length; i2 += (labelStep || 1)) {
      var lx = padL + i2 * step;
      ctx.fillText('d-' + (data.length - 1 - i2), lx, h - 6);
    }
  }

  function renderPages(pages) {
    var t = document.getElementById('top-pages-table');
    if (!t) return;
    t.innerHTML = '<tr><th>Page</th><th style="text-align:right;">Views</th></tr>';
    pages.forEach(function(row) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + row[0] + '<div class="bar-mini" style="width:' + row[2] + '%"></div></td><td style="text-align:right;font-family:monospace;">' + row[1] + '</td>';
      t.appendChild(tr);
    });
  }

  function renderGeo(geo) {
    var container = document.getElementById('geo-bars');
    if (!container) return;
    container.innerHTML = '';
    geo.forEach(function(row) {
      var div = document.createElement('div');
      div.className = 'geo-bar-row';
      div.innerHTML = '<span class="geo-flag">' + row[0] + '</span><span class="geo-country">' + row[1] + '</span><div class="geo-track"><div class="geo-fill" style="width:' + row[2] + '%"></div></div><span class="geo-pct">' + row[2] + '%</span>';
      container.appendChild(div);
    });
  }

  function applyRange(range) {
    var d = rangeData[range];
    document.getElementById('kpi-pv').textContent = d.pv;
    document.getElementById('kpi-uv').textContent = d.uv;
    document.getElementById('kpi-sess').textContent = d.sess;
    document.getElementById('kpi-dur').textContent = d.dur;
    document.getElementById('kpi-br').textContent = d.br;
    var deltas = [['kpi-pv-d',d.pvd,d.pvdUp],['kpi-uv-d',d.uvd,d.uvdUp],['kpi-sess-d',d.sessd,d.sessdUp],['kpi-dur-d',d.durd,d.durdUp],['kpi-br-d',d.brd,d.brdUp]];
    deltas.forEach(function(item) {
      var el = document.getElementById(item[0]);
      if (el) {
        el.textContent = (item[2] ? '▲ ' : '▼ ') + item[1];
        el.className = 'kpi-delta ' + (item[2] ? 'up' : 'dn');
      }
    });
    drawChart(d.chartBase);
    renderPages(d.pages);
    renderGeo(d.geo);
  }

  window.switchRange = function(btn, range) {
    document.querySelectorAll('.date-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentRange = range;
    applyRange(range);
  };

  // Real-time counter
  var rtBase = 142;
  setInterval(function() {
    rtBase += Math.floor(Math.random() * 11) - 5;
    rtBase = Math.max(80, Math.min(220, rtBase));
    var el = document.getElementById('rt-users');
    if (el) el.textContent = rtBase;
  }, 1800);

  // Initial render
  setTimeout(function() { applyRange('7d'); }, 100);
  window.addEventListener('resize', function() { applyRange(currentRange); });
})();
</script>

---

## 9. Level 7 — Privacy &amp; GDPR

Analytics collects user behavior data. This triggers legal obligations in many jurisdictions.

<div class="privacy-grid">
  <div class="privacy-card"><strong>IP Anonymization</strong>Zero the last octet before storing: <code>203.0.113.47</code> → <code>203.0.113.0</code>. You retain geo precision (city-level) without storing a unique identifier. Required in Germany, recommended everywhere.</div>
  <div class="privacy-card"><strong>Cookie Consent</strong>Only set <code>_ga</code> session cookie after explicit opt-in. Without consent: use fingerprinting-free session IDs derived from anonymized IP + User-Agent hash, scoped to a single request window.</div>
  <div class="privacy-card"><strong>Right to Erasure</strong>ClickHouse makes DELETE expensive — it requires rewriting entire data parts. Use a partition-level trick: store <code>userId</code> in its own partition column. Erasure = drop partition for that user. Requires partition design at schema time.</div>
  <div class="privacy-card"><strong>First-Party vs. Third-Party</strong>Chrome blocks 3rd-party cookies. Modern analytics uses first-party collection: the tracking endpoint is served from the same domain as the customer site (e.g. <code>analytics.yourdomain.com</code> via CNAME), so cookies are first-party.</div>
</div>

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> ipaddress

<span class="kw">def</span> <span class="fn">anonymize_ip</span>(raw_ip: <span class="ty">str</span>) <span class="op">-&gt;</span> <span class="ty">str</span>:
    <span class="kw">try</span>:
        addr <span class="op">=</span> ipaddress.<span class="fn">ip_address</span>(raw_ip)
        <span class="kw">if</span> addr.version <span class="op">==</span> <span class="nu">4</span>:
            parts <span class="op">=</span> raw_ip.<span class="fn">split</span>(<span class="st">'.'</span>)
            <span class="kw">return</span> <span class="st">'.'</span>.<span class="fn">join</span>(parts[:<span class="nu">3</span>]) <span class="op">+</span> <span class="st">'.0'</span>     <span class="cm"># zero last octet</span>
        <span class="kw">else</span>:
            <span class="cm"># IPv6: zero last 80 bits</span>
            network <span class="op">=</span> ipaddress.<span class="fn">ip_network</span>(raw_ip <span class="op">+</span> <span class="st">'/48'</span>, strict<span class="op">=</span><span class="kw">False</span>)
            <span class="kw">return</span> <span class="ty">str</span>(network.network_address)
    <span class="kw">except</span> <span class="ty">ValueError</span>:
        <span class="kw">return</span> <span class="st">'0.0.0.0'</span></pre>
</div>

---

## 10. Capacity Estimate

<table class="comp-table">
  <thead><tr><th>Metric</th><th>Number</th></tr></thead>
  <tbody>
    <tr><td>Events/sec average</td><td>115,000</td></tr>
    <tr><td>Events/sec peak</td><td>500,000</td></tr>
    <tr><td>Kafka throughput</td><td>~57 MB/sec (500 bytes × 115K)</td></tr>
    <tr><td>Kafka partitions needed</td><td>~600 (at 100 MB/sec/partition cap)</td></tr>
    <tr><td>ClickHouse storage raw (2 yr)</td><td>~3.6 PB raw, ~360 TB compressed (10:1)</td></tr>
    <tr><td>ClickHouse rollup storage</td><td>~5 TB (daily aggregates per site)</td></tr>
    <tr><td>Redis real-time footprint</td><td>~10 GB (HyperLogLog per site × 5-min windows)</td></tr>
    <tr><td>Collector servers (10K events/sec each)</td><td>~50 avg, ~100 peak</td></tr>
    <tr><td>Flink task managers</td><td>~20 (session windowing is CPU-heavy)</td></tr>
    <tr><td>ClickHouse cluster</td><td>3 shards × 2 replicas = 6 nodes, 60 TB SSD each</td></tr>
  </tbody>
</table>

The dominant cost is ClickHouse storage. At 10:1 compression, 2 years of raw events compresses to ~360 TB. At $0.02/GB-month (hot NVMe), that's ~$7,200/month just for raw event storage — before rollups, compute, Kafka, and Redis.

---

## 11. Component Deep Dive: The Collector Service

The collector is the front door — it receives 115K events/sec, must be stateless and horizontally scalable.

<div class="code-wrap">
<div class="code-lang">python (fastapi) <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">from</span> fastapi <span class="kw">import</span> <span class="ty">FastAPI</span>, <span class="ty">Request</span>, <span class="ty">Response</span>
<span class="kw">from</span> aiokafka <span class="kw">import</span> <span class="ty">AIOKafkaProducer</span>
<span class="kw">import</span> orjson, ua_parser, geoip2.database

app      <span class="op">=</span> <span class="ty">FastAPI</span>()
producer <span class="op">=</span> <span class="ty">AIOKafkaProducer</span>(bootstrap_servers<span class="op">=</span><span class="st">'kafka:9092'</span>)
geo_db   <span class="op">=</span> geoip2.database.<span class="ty">Reader</span>(<span class="st">'/data/GeoLite2-City.mmdb'</span>)

<span class="pp">@app.post</span>(<span class="st">'/collect'</span>)
<span class="kw">async def</span> <span class="fn">collect</span>(request: <span class="ty">Request</span>):
    raw  <span class="op">=</span> <span class="kw">await</span> request.<span class="fn">body</span>()
    data <span class="op">=</span> orjson.<span class="fn">loads</span>(raw)

    <span class="cm"># Enrich: IP -> country, UA -> device/browser</span>
    ip      <span class="op">=</span> request.<span class="fn">client</span>.host
    country <span class="op">=</span> <span class="st">'XX'</span>
    <span class="kw">try</span>:
        rec     <span class="op">=</span> geo_db.<span class="fn">city</span>(ip)
        country <span class="op">=</span> rec.country.iso_code <span class="op">or</span> <span class="st">'XX'</span>
    <span class="kw">except</span>:
        <span class="kw">pass</span>

    ua_str  <span class="op">=</span> request.headers.<span class="fn">get</span>(<span class="st">'user-agent'</span>, <span class="st">''</span>)
    ua_info <span class="op">=</span> ua_parser.<span class="fn">parse</span>(ua_str)

    data[<span class="st">'country'</span>]  <span class="op">=</span> country
    data[<span class="st">'device'</span>]   <span class="op">=</span> ua_info[<span class="st">'device'</span>][<span class="st">'family'</span>]
    data[<span class="st">'browser'</span>]  <span class="op">=</span> ua_info[<span class="st">'user_agent'</span>][<span class="st">'family'</span>]
    data[<span class="st">'ip_anon'</span>]  <span class="op">=</span> <span class="fn">anonymize_ip</span>(ip)

    <span class="kw">await</span> producer.<span class="fn">send</span>(
        <span class="st">'raw-events'</span>,
        key<span class="op">=</span>data[<span class="st">'siteId'</span>].<span class="fn">encode</span>(),   <span class="cm"># partition by siteId</span>
        value<span class="op">=</span>orjson.<span class="fn">dumps</span>(data)
    )
    <span class="kw">return</span> <span class="ty">Response</span>(content<span class="op">=</span><span class="st">b''</span>, status_code<span class="op">=</span><span class="nu">204</span>)  <span class="cm"># No Content</span></pre>
</div>

Key decisions:
- **Partition Kafka by `siteId`**: All events for a single customer land on the same partition. Session stitching in Flink is keyed by `siteId:sessionId` — no cross-partition shuffles.
- **204 No Content response**: The tracker doesn't care about the response body. Returning nothing saves ~500 bytes × 115K/sec = 57 MB/sec of egress.
- **IP enrichment at ingest**: Do geo-lookup and UA parsing *once* at collection time, store the result. Never re-parse 10 billion events at query time.

---

## 12. Architecture Summary

<div class="callout callout-green">
<strong>The complete architecture in one sentence:</strong> A stateless Collector fleet enriches events and writes to Kafka; Flink consumers sessionize the stream and write to ClickHouse (raw) and Redis (real-time HyperLogLog); a Query API serves the dashboard from ClickHouse materialized views for historical queries and Redis for live counters.
</div>

<div class="code-wrap">
<div class="code-lang">architecture</div>
<pre class="code-block"><span class="cm">Browser / Mobile App</span>
  <span class="op">|</span>
  <span class="op">|</span>  sendBeacon POST /collect
  <span class="op">v</span>
<span class="ty">Collector Service</span>          <span class="cm">x50 stateless pods</span>
  <span class="op">|</span>  validate, enrich (IP→geo, UA→device)
  <span class="op">|</span>  partition key = siteId
  <span class="op">v</span>
<span class="pp">Kafka</span>  raw-events topic    <span class="cm">600 partitions, 7-day retention</span>
  <span class="op">|</span>
  <span class="op">+-------+----------+</span>
  <span class="op">|</span>               <span class="op">|</span>
  <span class="op">v</span>               <span class="op">v</span>
<span class="ty">Flink</span>           <span class="ty">Flink</span>
Session         Realtime
Stitcher        Aggregator
  <span class="op">|</span>               <span class="op">|</span>
  <span class="op">v</span>               <span class="op">v</span>
<span class="ty">ClickHouse</span>     <span class="ty">Redis</span>
events table   HyperLogLog
+ MV rollups   active:site:5min
  <span class="op">|</span>               <span class="op">|</span>
  <span class="op">+-------+--------+</span>
          <span class="op">|</span>
          <span class="op">v</span>
    <span class="fn">Query API</span>
    Dashboard UI</pre>
</div>

### Trade-offs Worth Discussing in an Interview

<table class="comp-table">
  <thead><tr><th>Decision</th><th>Chosen</th><th>Alternative</th><th>Why chosen</th></tr></thead>
  <tbody>
    <tr><td>Stream broker</td><td>Kafka</td><td>Kinesis, Pulsar</td><td>Self-hosted, unlimited retention, strong ordering guarantees</td></tr>
    <tr><td>OLAP store</td><td>ClickHouse</td><td>BigQuery, Druid, Pinot</td><td>Sub-second queries, efficient compression, on-premise option</td></tr>
    <tr><td>Real-time counter</td><td>Redis HyperLogLog</td><td>Exact count in ClickHouse</td><td>O(1) space, ~1% error acceptable, millisecond reads</td></tr>
    <tr><td>Stream processor</td><td>Flink</td><td>Spark Streaming, Storm</td><td>True streaming (not micro-batch), session windows native</td></tr>
    <tr><td>Aggregation strategy</td><td>Kappa (single stream)</td><td>Lambda (batch + speed)</td><td>Simpler operations, reprocess by replaying Kafka</td></tr>
  </tbody>
</table>

---

*Design a system like Google Analytics, and you touch nearly every major systems concept: high-throughput ingestion, durable messaging, columnar storage, streaming computation, approximate algorithms, GDPR compliance, and real-time dashboarding. The key insight is that analytics data is write-once, read-analytically — and every architectural decision should follow from that observation.*
