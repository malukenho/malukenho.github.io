---
layout: post
title: "System Design: Chat System — From Polling to WhatsApp at Scale"
date: 2026-04-26 10:00:00 +0000
categories: ["post"]
tags: [system-design, websockets, chat, real-time, distributed-systems, interview]
series: "System Design Interview Series"
---

<style>
:root {
  --bg: #19191c;
  --heading: #fbef8a;
  --accent: #7bcdab;
  --body: rgba(255,255,255,0.8);
  --card: #22222a;
  --border: rgba(123,205,171,0.25);
  --muted: rgba(255,255,255,0.45);
}

.series-label {
  display: inline-block;
  background: rgba(123,205,171,0.12);
  border: 1px solid var(--border);
  color: var(--accent);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  padding: 4px 14px;
  border-radius: 20px;
  margin-bottom: 1.6rem;
  text-transform: uppercase;
}

.chat-callout {
  background: #1d2528;
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  padding: 1rem 1.4rem;
  margin: 1.4rem 0;
  color: var(--body);
  line-height: 1.75;
}

.chat-callout strong { color: var(--heading); }

pre.code-block {
  background: #111214;
  border: 1px solid #2e2f35;
  border-radius: 8px;
  padding: 1.1rem 1.4rem;
  overflow-x: auto;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 0.82rem;
  line-height: 1.7;
  color: rgba(255,255,255,0.85);
  margin: 1.2rem 0;
}

pre.code-block .kw  { color: #cc99cd; }
pre.code-block .ty  { color: #7bcdab; }
pre.code-block .st  { color: #f8c555; }
pre.code-block .cm  { color: rgba(255,255,255,0.35); font-style: italic; }
pre.code-block .fn  { color: #79b8ff; }
pre.code-block .nb  { color: #f97583; }
pre.code-block .nm  { color: #ffab70; }

/* ── Interactive widgets ───────────────────────────────────── */
.widget {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.4rem;
  margin: 1.6rem 0;
}

.widget-title {
  color: var(--heading);
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.widget-title::before {
  content: "";
  display: inline-block;
  width: 8px; height: 8px;
  background: var(--accent);
  border-radius: 50%;
}

.mode-btns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.2rem;
}

.mode-btn {
  padding: 7px 18px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.82rem;
  font-family: inherit;
  transition: all 0.2s;
}

.mode-btn:hover { color: var(--body); border-color: rgba(123,205,171,0.5); }
.mode-btn.active { background: rgba(123,205,171,0.15); color: var(--accent); border-color: var(--accent); }

.vis-canvas {
  width: 100%;
  height: 220px;
  display: block;
  border-radius: 6px;
  background: #111214;
}

.vis-stats {
  display: flex;
  gap: 1.2rem;
  margin-top: 0.8rem;
  flex-wrap: wrap;
}

.vis-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vis-stat-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; }
.vis-stat-value { font-size: 1.1rem; color: var(--heading); font-weight: 600; }

/* ── Architecture Diagram ─────────────────────────────────── */
.arch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.7rem;
  margin-bottom: 1rem;
}

.arch-node {
  background: #1a1d2a;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.arch-node:hover { border-color: var(--accent); background: #1e2430; }
.arch-node.selected { border-color: var(--heading); background: rgba(251,239,138,0.07); }

.arch-node-icon { font-size: 1.4rem; margin-bottom: 0.3rem; }
.arch-node-name { font-size: 0.75rem; color: var(--accent); font-weight: 600; }
.arch-node-sub  { font-size: 0.68rem; color: var(--muted); margin-top: 2px; }

.arch-desc {
  background: rgba(123,205,171,0.07);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem 1.2rem;
  color: var(--body);
  font-size: 0.87rem;
  line-height: 1.75;
  min-height: 70px;
  transition: all 0.2s;
}

.arch-desc strong { color: var(--heading); }
.arch-desc .arch-why { color: var(--accent); font-size: 0.78rem; margin-top: 0.4rem; display: block; }

/* ── Delivery Receipts ────────────────────────────────────── */
.receipt-demo {
  background: #1a1c24;
  border-radius: 10px;
  padding: 1.2rem;
  margin-bottom: 1rem;
}

.receipt-msg {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.6rem;
}

.receipt-bubble {
  background: #2a4a3a;
  border-radius: 12px 12px 4px 12px;
  padding: 0.55rem 0.9rem;
  max-width: 65%;
  position: relative;
}

.receipt-text { color: var(--body); font-size: 0.87rem; }

.receipt-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 3px;
}

.receipt-time { font-size: 0.65rem; color: var(--muted); }

.receipt-ticks {
  font-size: 0.78rem;
  color: var(--muted);
  transition: color 0.4s;
  letter-spacing: -2px;
}

.receipt-ticks.delivered { color: rgba(255,255,255,0.7); }
.receipt-ticks.read { color: #4fc3f7; }

.receipt-btns {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.receipt-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--body);
  cursor: pointer;
  font-size: 0.82rem;
  font-family: inherit;
  transition: all 0.2s;
}

.receipt-btn:hover { border-color: var(--accent); color: var(--accent); }
.receipt-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.receipt-status {
  font-size: 0.78rem;
  color: var(--accent);
  margin-top: 0.6rem;
  min-height: 1.2em;
  font-style: italic;
}

/* ── Mini Chat Demo ────────────────────────────────────────── */
.chat-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 600px) {
  .chat-demo { grid-template-columns: 1fr; }
}

.chat-window {
  background: #14161f;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 360px;
}

.chat-header {
  background: #1e2030;
  padding: 0.7rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-bottom: 1px solid var(--border);
}

.chat-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
}

.chat-header-name { font-size: 0.85rem; color: var(--body); font-weight: 600; }
.chat-header-status { font-size: 0.7rem; color: var(--accent); }

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: #2e2f35; border-radius: 2px; }

.chat-bubble-wrap {
  display: flex;
  flex-direction: column;
}

.chat-bubble-wrap.sent { align-items: flex-end; }
.chat-bubble-wrap.recv { align-items: flex-start; }

.chat-bubble {
  border-radius: 12px;
  padding: 0.5rem 0.85rem;
  max-width: 80%;
  font-size: 0.82rem;
  line-height: 1.5;
  word-break: break-word;
}

.chat-bubble.sent-bubble { background: #2a4a3a; color: var(--body); border-bottom-right-radius: 4px; }
.chat-bubble.recv-bubble { background: #1e2030; color: var(--body); border-bottom-left-radius: 4px; }

.chat-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  padding: 0 4px;
}

.chat-ts { font-size: 0.63rem; color: var(--muted); }

.chat-tick {
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: -2px;
  transition: color 0.4s;
}

.chat-tick.delivered-tick { color: rgba(255,255,255,0.65); }
.chat-tick.read-tick { color: #4fc3f7; }

.chat-input-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.7rem;
  border-top: 1px solid var(--border);
  background: #1a1c28;
}

.chat-input {
  flex: 1;
  background: #252730;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 7px 14px;
  color: var(--body);
  font-size: 0.82rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input:focus { border-color: var(--accent); }

.chat-send-btn {
  width: 34px; height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #111;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.chat-send-btn:hover { opacity: 0.85; }

/* ── Capacity table ───────────────────────────────────────── */
.capacity-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  margin: 1.2rem 0;
}

.capacity-table th {
  background: #1d1f28;
  color: var(--heading);
  padding: 0.6rem 0.9rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
}

.capacity-table td {
  padding: 0.6rem 0.9rem;
  color: var(--body);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.capacity-table tr:hover td { background: rgba(255,255,255,0.02); }
.capacity-table .val { color: var(--accent); font-weight: 600; font-family: monospace; }

/* ── Comparison table ─────────────────────────────────────── */
.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.83rem;
  margin: 1.2rem 0;
}

.compare-table th {
  background: #1d1f28;
  color: var(--heading);
  padding: 0.55rem 0.9rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.compare-table td {
  padding: 0.55rem 0.9rem;
  color: var(--body);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.compare-table .good { color: var(--accent); }
.compare-table .bad  { color: #f97583; }
.compare-table .mid  { color: #ffab70; }

/* ── E2EE flow ────────────────────────────────────────────── */
.e2ee-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  flex-wrap: wrap;
}

.e2ee-box {
  background: #1a1d28;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  color: var(--body);
}

.e2ee-arrow {
  color: var(--accent);
  font-size: 1rem;
}

.e2ee-key {
  background: rgba(251,239,138,0.1);
  border: 1px solid rgba(251,239,138,0.3);
  color: var(--heading);
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
}
</style>

<p class="series-label">Series #12 of 15 — System Design Interview Prep</p>

## 1. The Problem

Chat is deceptively simple at first glance: send a message, receive a message. You have
probably built a toy version of this in an afternoon. The complexity emerges at scale.

<div class="chat-callout">
<strong>Interview question:</strong> Design a real-time chat system like WhatsApp or Slack.
Support 1-1 messaging, group chats (up to 500 members), message delivery receipts
(sent / delivered / read), and offline message delivery. Handle <strong>50 million concurrent users</strong>.
</div>

The constraints turn a weekend project into a distributed systems challenge:

- **Real-time delivery** — users expect messages in under 100ms, not "eventually"
- **Offline queuing** — a message must survive even if the recipient is offline for days
- **Ordering** — messages must arrive in the order they were sent, across devices
- **Delivery receipts** — the double-tick ✓✓ is a product feature users depend on
- **Group fan-out** — one message to a 500-member group means 499 separate deliveries
- **Connection scale** — 50M concurrent WebSocket connections don't fit on one machine

WhatsApp handled 100 billion messages per day at peak, with a team of around 50 engineers.
The architecture decisions below are why that number is possible.

---

## 2. Level 1 — HTTP Polling

The simplest possible approach: the client asks the server for new messages every few seconds.

<pre class="code-block"><span class="cm">// Client polls every 5 seconds</span>
<span class="kw">setInterval</span>(<span class="kw">function</span>() {
  <span class="fn">fetch</span>(<span class="st">'/messages?since='</span> + lastMessageId)
    .<span class="fn">then</span>(<span class="kw">function</span>(r) { <span class="kw">return</span> r.<span class="fn">json</span>(); })
    .<span class="fn">then</span>(<span class="kw">function</span>(msgs) { <span class="fn">renderMessages</span>(msgs); });
}, <span class="nm">5000</span>);
</pre>

**What works:** Extremely simple. Any HTTP server handles it. No persistent connections.
Works through proxies, firewalls, and corporate networks that block WebSockets.

**What breaks at scale:** With 50M users polling every 5 seconds that is 10 million
requests per second — and the vast majority return an empty body. You are burning CPU,
bandwidth, and money to serve `[]` billions of times per day. Latency averages 2.5s (half
the poll interval), making the chat feel sluggish compared to SMS.

---

## 3. Level 2 — Long Polling

The server holds the connection open until a message arrives (or a timeout, typically 30s).
The client immediately reconnects after each response.

<pre class="code-block"><span class="cm">// Server holds request open — pseudocode</span>
<span class="fn">app.get</span>(<span class="st">'/poll'</span>, <span class="kw">async function</span>(req, res) {
  <span class="kw">const</span> deadline = <span class="ty">Date</span>.<span class="fn">now</span>() + <span class="nm">30000</span>;
  <span class="kw">while</span> (<span class="ty">Date</span>.<span class="fn">now</span>() &lt; deadline) {
    <span class="kw">const</span> msgs = <span class="kw">await</span> <span class="fn">checkForMessages</span>(req.userId);
    <span class="kw">if</span> (msgs.length) { <span class="kw">return</span> res.<span class="fn">json</span>(msgs); }
    <span class="kw">await</span> <span class="fn">sleep</span>(<span class="nm">500</span>);   <span class="cm">// check every 500ms</span>
  }
  res.<span class="fn">json</span>([]);      <span class="cm">// timeout — client reconnects</span>
});
</pre>

**Improvements:** Latency drops to near-zero when a message arrives. Wasted requests drop
dramatically — each connection lasts up to 30s instead of firing every 5s.

**Still problematic:** Every message delivery requires a new TCP handshake and HTTP
headers. Stateless HTTP servers cannot easily route to the right open connection — if
user A's request is held on server 1, and a message arrives on server 2, server 2 must
find and wake server 1. Connection limit per server is around 65,000 ephemeral ports.

<table class="compare-table">
<thead><tr><th>Method</th><th>Latency</th><th>Wasted requests</th><th>Server connections</th></tr></thead>
<tbody>
<tr><td>Polling (5s)</td><td class="bad">~2.5 s avg</td><td class="bad">~99% empty</td><td class="good">Stateless</td></tr>
<tr><td>Long Polling</td><td class="mid">~100 ms</td><td class="mid">~20% empty</td><td class="mid">One per user</td></tr>
<tr><td>WebSockets</td><td class="good">&lt;50 ms</td><td class="good">Zero wasted</td><td class="bad">Stateful</td></tr>
</tbody>
</table>

---

## 4. Level 3 — WebSockets

A WebSocket starts as an HTTP request and upgrades to a persistent, bidirectional TCP
connection. Once established, either side can send frames at any time with no headers,
no handshakes, and no polling overhead.

<pre class="code-block"><span class="cm">// Client — single connection, messages flow both ways</span>
<span class="kw">const</span> ws = <span class="kw">new</span> <span class="ty">WebSocket</span>(<span class="st">'wss://chat.example.com/ws'</span>);

ws.<span class="fn">onmessage</span> = <span class="kw">function</span>(event) {
  <span class="kw">const</span> msg = <span class="ty">JSON</span>.<span class="fn">parse</span>(event.data);
  <span class="fn">renderMessage</span>(msg);
};

<span class="kw">function</span> <span class="fn">sendMessage</span>(text) {
  ws.<span class="fn">send</span>(<span class="ty">JSON</span>.<span class="fn">stringify</span>({ type: <span class="st">'msg'</span>, text: text }));
}
</pre>

The key property: the server pushes messages to the client the instant they arrive.
No polling, no reconnect overhead. Latency is limited only by the network round trip.

<div class="widget">
  <div class="widget-title">Connection Mode Visualizer — Interactive</div>
  <div class="mode-btns">
    <button class="mode-btn active" onclick="setVisMode('polling')" id="vis-btn-polling">Polling</button>
    <button class="mode-btn" onclick="setVisMode('longpoll')" id="vis-btn-longpoll">Long Polling</button>
    <button class="mode-btn" onclick="setVisMode('ws')" id="vis-btn-ws">WebSockets</button>
  </div>
  <canvas class="vis-canvas" id="vis-canvas" width="800" height="220"></canvas>
  <div class="vis-stats">
    <div class="vis-stat">
      <span class="vis-stat-label">Mode</span>
      <span class="vis-stat-value" id="vis-mode-name">Polling</span>
    </div>
    <div class="vis-stat">
      <span class="vis-stat-label">Avg Latency</span>
      <span class="vis-stat-value" id="vis-latency">2500 ms</span>
    </div>
    <div class="vis-stat">
      <span class="vis-stat-label">Requests / min</span>
      <span class="vis-stat-value" id="vis-reqcount">12</span>
    </div>
    <div class="vis-stat">
      <span class="vis-stat-label">Wasted requests</span>
      <span class="vis-stat-value" id="vis-wasted">~95%</span>
    </div>
  </div>
</div>

<script>
(function() {
  var canvas = document.getElementById('vis-canvas');
  var ctx = canvas.getContext('2d');
  var mode = 'polling';
  var raf = null;
  var t = 0;

  var BG       = '#111214';
  var ACCENT   = '#7bcdab';
  var HEADING  = '#fbef8a';
  var MUTED    = 'rgba(255,255,255,0.35)';
  var BODY     = 'rgba(255,255,255,0.75)';
  var RED      = '#f97583';
  var BLUE     = '#79b8ff';

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = Math.floor(rect.width - 32);
    canvas.height = 220;
  }

  function drawLabel(x, y, text, col) {
    ctx.fillStyle = col || BODY;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
  }

  function drawBox(x, y, w, h, label, sub, col) {
    ctx.fillStyle = '#1a1d2a';
    ctx.strokeStyle = col || ACCENT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - w/2, y - h/2, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col || ACCENT;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 4);
    if (sub) {
      ctx.fillStyle = MUTED;
      ctx.font = '10px sans-serif';
      ctx.fillText(sub, x, y + 17);
    }
  }

  function drawArrow(x1, y1, x2, y2, col, label, progress) {
    var p = progress === undefined ? 1 : Math.min(1, Math.max(0, progress));
    var mx = x1 + (x2 - x1) * p;
    var my = y1 + (y2 - y1) * p;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(mx, my);
    ctx.stroke();
    if (p >= 0.95) {
      var ang = Math.atan2(y2 - y1, x2 - x1);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 9 * Math.cos(ang - 0.35), y2 - 9 * Math.sin(ang - 0.35));
      ctx.lineTo(x2 - 9 * Math.cos(ang + 0.35), y2 - 9 * Math.sin(ang + 0.35));
      ctx.closePath();
      ctx.fill();
    }
    if (label && p > 0.1) {
      var lx = x1 + (mx - x1) * 0.5;
      var ly = y1 + (my - y1) * 0.5 - 6;
      ctx.fillStyle = col;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, lx, ly);
    }
  }

  function drawPolling(t) {
    var W = canvas.width, H = canvas.height;
    var cx = W / 2;
    var clientX = W * 0.15, serverX = W * 0.85;
    var midY = H / 2;

    drawBox(clientX, midY, 90, 44, 'CLIENT', 'browser', ACCENT);
    drawBox(serverX, midY, 90, 44, 'SERVER', 'stateless', HEADING);

    var cycle = 2.5;
    var phase = (t / 60) % cycle;
    var reqY   = midY - 30;
    var respY  = midY + 30;

    var numDone = Math.floor(t / 60 / cycle);
    var i;
    for (i = Math.max(0, numDone - 2); i < numDone; i++) {
      drawArrow(clientX + 45, reqY,  serverX - 45, reqY,  ACCENT, 'GET /poll', 1);
      drawArrow(serverX - 45, respY, clientX + 45, respY, RED,    '[] empty', 1);
    }

    var p = phase / cycle;
    if (p < 0.4) {
      drawArrow(clientX + 45, reqY, serverX - 45, reqY, ACCENT, 'GET /poll', p / 0.4);
    } else if (p < 0.8) {
      drawArrow(clientX + 45, reqY,  serverX - 45, reqY,  ACCENT, 'GET /poll', 1);
      drawArrow(serverX - 45, respY, clientX + 45, respY, RED,    '[] empty', (p - 0.4) / 0.4);
    }

    ctx.fillStyle = MUTED;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Every 5 seconds — mostly empty responses', cx, H - 14);
  }

  function drawLongPoll(t) {
    var W = canvas.width, H = canvas.height;
    var clientX = W * 0.15, serverX = W * 0.85;
    var midY = H / 2;

    drawBox(clientX, midY, 90, 44, 'CLIENT', 'browser', ACCENT);
    drawBox(serverX, midY, 90, 44, 'SERVER', 'holds open', HEADING);

    var cx = W / 2;
    var cycle = 4.0;
    var phase = (t / 60) % cycle;
    var reqY  = midY - 30;
    var respY = midY + 30;

    if (phase < 0.15) {
      drawArrow(clientX + 45, reqY, serverX - 45, reqY, ACCENT, 'GET /poll', phase / 0.15);
    } else if (phase < 0.7) {
      drawArrow(clientX + 45, reqY, serverX - 45, reqY, ACCENT, 'GET /poll', 1);
      ctx.fillStyle = '#ffab70';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      var dots = '';
      var nd = Math.floor((phase - 0.15) / 0.12) % 4;
      for (var d = 0; d < nd; d++) { dots += '.'; }
      ctx.fillText('waiting' + dots, cx, midY - 50);
    } else if (phase < 1.0) {
      drawArrow(clientX + 45, reqY,  serverX - 45, reqY,  ACCENT,  'GET /poll', 1);
      drawArrow(serverX - 45, respY, clientX + 45, respY, '#4fc3f7', 'message!', (phase - 0.7) / 0.3);
    } else {
      drawArrow(serverX - 45, respY, clientX + 45, respY, '#4fc3f7', 'message!', 1);
      ctx.fillStyle = '#7bcdab';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('client reconnects immediately', cx, midY - 50);
    }

    ctx.fillStyle = MUTED;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Connection held open — delivered on arrival, then reconnect', cx, H - 14);
  }

  function drawWS(t) {
    var W = canvas.width, H = canvas.height;
    var clientX = W * 0.15, serverX = W * 0.85;
    var midY = H / 2;
    var cx = W / 2;

    drawBox(clientX, midY, 90, 44, 'CLIENT', 'ws://...', ACCENT);
    drawBox(serverX, midY, 90, 44, 'SERVER', 'push', HEADING);

    ctx.strokeStyle = 'rgba(123,205,171,0.3)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(clientX + 45, midY - 10);
    ctx.lineTo(serverX - 45, midY - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = ACCENT;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('persistent TCP connection', cx, midY - 20);

    var speed = 0.9;
    var cycle = 1.8;
    var p1 = ((t / 60) * speed) % cycle / cycle;
    var p2 = (((t / 60) * speed) + 0.9) % cycle / cycle;

    var ax1 = clientX + 45 + (serverX - clientX - 90) * p1;
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.arc(ax1, midY + 22, 4, 0, Math.PI * 2);
    ctx.fill();

    var ax2 = serverX - 45 - (serverX - clientX - 90) * p2;
    ctx.fillStyle = '#ffab70';
    ctx.beginPath();
    ctx.arc(ax2, midY + 38, 4, 0, Math.PI * 2);
    ctx.fill();

    var lblY = midY + 60;
    ctx.fillStyle = '#4fc3f7'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('● client → server', clientX, lblY);
    ctx.fillStyle = '#ffab70'; ctx.textAlign = 'right';
    ctx.fillText('● server → client', serverX, lblY);

    ctx.fillStyle = MUTED;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bidirectional — server pushes instantly, no reconnect overhead', cx, H - 14);
  }

  function frame() {
    resize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    t++;
    if (mode === 'polling')  { drawPolling(t); }
    if (mode === 'longpoll') { drawLongPoll(t); }
    if (mode === 'ws')       { drawWS(t); }
    raf = requestAnimationFrame(frame);
  }

  window.setVisMode = function(m) {
    mode = m; t = 0;
    document.getElementById('vis-btn-polling').classList.toggle('active', m === 'polling');
    document.getElementById('vis-btn-longpoll').classList.toggle('active', m === 'longpoll');
    document.getElementById('vis-btn-ws').classList.toggle('active', m === 'ws');
    var names   = { polling: 'Polling (5s)', longpoll: 'Long Polling', ws: 'WebSockets' };
    var latency = { polling: '2500 ms',      longpoll: '~100 ms',      ws: '<50 ms'     };
    var reqs    = { polling: '12 / min',      longpoll: '2 / min',      ws: '0 (push)'  };
    var wasted  = { polling: '~95%',          longpoll: '~20%',         ws: '0%'        };
    document.getElementById('vis-mode-name').textContent = names[m];
    document.getElementById('vis-latency').textContent   = latency[m];
    document.getElementById('vis-reqcount').textContent  = reqs[m];
    document.getElementById('vis-wasted').textContent    = wasted[m];
  };

  if (raf) { cancelAnimationFrame(raf); }
  frame();
})();
</script>

---

## 5. Level 4 — Message Service Architecture

A single Chat Server cannot hold 50M WebSocket connections. We need a fleet. The design
splits responsibilities into purpose-built services. Click each component to learn more.

<div class="widget">
  <div class="widget-title">Architecture Diagram — Click Any Component</div>
  <div class="arch-grid" id="arch-grid">
    <div class="arch-node" onclick="showArch('client-a')">
      <div class="arch-node-icon">💻</div>
      <div class="arch-node-name">Client A</div>
      <div class="arch-node-sub">WebSocket</div>
    </div>
    <div class="arch-node" onclick="showArch('chat-server-a')">
      <div class="arch-node-icon">🖥</div>
      <div class="arch-node-name">Chat Server A</div>
      <div class="arch-node-sub">100K conns</div>
    </div>
    <div class="arch-node" onclick="showArch('msg-service')">
      <div class="arch-node-icon">⚙️</div>
      <div class="arch-node-name">Message Service</div>
      <div class="arch-node-sub">write path</div>
    </div>
    <div class="arch-node" onclick="showArch('cassandra')">
      <div class="arch-node-icon">🗄</div>
      <div class="arch-node-name">Cassandra</div>
      <div class="arch-node-sub">message store</div>
    </div>
    <div class="arch-node" onclick="showArch('kafka')">
      <div class="arch-node-icon">📨</div>
      <div class="arch-node-name">Kafka</div>
      <div class="arch-node-sub">message queue</div>
    </div>
    <div class="arch-node" onclick="showArch('fanout')">
      <div class="arch-node-icon">📡</div>
      <div class="arch-node-name">Fan-out Service</div>
      <div class="arch-node-sub">delivery router</div>
    </div>
    <div class="arch-node" onclick="showArch('presence')">
      <div class="arch-node-icon">🟢</div>
      <div class="arch-node-name">Presence Service</div>
      <div class="arch-node-sub">online / offline</div>
    </div>
    <div class="arch-node" onclick="showArch('redis')">
      <div class="arch-node-icon">⚡</div>
      <div class="arch-node-name">Redis</div>
      <div class="arch-node-sub">presence + queue</div>
    </div>
    <div class="arch-node" onclick="showArch('chat-server-b')">
      <div class="arch-node-icon">🖥</div>
      <div class="arch-node-name">Chat Server B</div>
      <div class="arch-node-sub">100K conns</div>
    </div>
    <div class="arch-node" onclick="showArch('client-b')">
      <div class="arch-node-icon">📱</div>
      <div class="arch-node-name">Client B</div>
      <div class="arch-node-sub">WebSocket</div>
    </div>
  </div>
  <div class="arch-desc" id="arch-desc">
    ← Click any component above to learn what it does and why that technology was chosen.
  </div>
</div>

<script>
(function() {
  var data = {
    'client-a': {
      title: 'Client A — Sender',
      body: 'The sending device (web browser, iOS, Android). Holds a single persistent WebSocket connection to one Chat Server. Sends messages as JSON frames over the socket. Also receives delivery receipts back over the same connection.',
      why: 'WebSocket eliminates polling overhead. One connection per device is all that is needed.'
    },
    'chat-server-a': {
      title: 'Chat Server A — Connection Gateway',
      body: 'Maintains up to 100,000 concurrent WebSocket connections in memory. When a message arrives, it forwards it to the Message Service and looks up which Chat Server holds the recipient\'s connection (via the Presence Service) to route the delivery.',
      why: 'Built in Go or Erlang — both handle massive concurrency efficiently. ~500 servers for 50M users.'
    },
    'msg-service': {
      title: 'Message Service — Write Path',
      body: 'Persists the message to Cassandra, generates a globally-ordered Snowflake ID, publishes the message to Kafka for async fan-out, and returns a "sent" ACK to the sender. Stateless — can be scaled horizontally.',
      why: 'Decoupling write (persist) from deliver means Cassandra failures don\'t block Kafka delivery and vice versa.'
    },
    'cassandra': {
      title: 'Apache Cassandra — Message Store',
      body: 'Stores all messages partitioned by channel_id, clustered by message_id DESC. Optimized for high-throughput time-series writes. Supports multi-datacenter replication out of the box. A 1KB message at 1M writes/sec = 1 GB/sec write throughput.',
      why: 'Cassandra\'s wide-row model fits chat perfectly: fetch the latest 20 messages = one partition scan.'
    },
    'kafka': {
      title: 'Apache Kafka — Message Queue',
      body: 'Durable message bus between the write path and delivery. Partitioned by channel_id so all messages in a channel flow through the same partition in order. Fan-out Service consumes from Kafka and routes deliveries. Retains messages for 7 days for replay.',
      why: 'Kafka decouples write speed from fan-out speed. A slow recipient doesn\'t block message ingestion.'
    },
    'fanout': {
      title: 'Fan-out Service — Delivery Router',
      body: 'Consumes from Kafka. For each message, queries the Presence Service to find which Chat Servers hold the target users\' connections. Sends a delivery task to each relevant Chat Server. For offline users, appends to their Redis offline queue.',
      why: 'Separate from ingestion so fan-out for 500-member groups doesn\'t block 1-1 message latency.'
    },
    'presence': {
      title: 'Presence Service — Online Status',
      body: 'Tracks which Chat Server each user is connected to. Users send heartbeats every 30 seconds; if a heartbeat is missed, they are marked offline. Backed by Redis with a 60-second TTL per entry. The Fan-out Service queries this to route deliveries.',
      why: 'Redis hash with TTL: O(1) lookup per user. At 50M users, presence state fits in ~5GB RAM.'
    },
    'redis': {
      title: 'Redis — Dual Role',
      body: '<strong>Presence:</strong> Hash map of userId → chatServerId with 60s TTL per entry. <strong>Offline Queue:</strong> Redis List per user (RPUSH on receive, LPOP on reconnect). Messages expire after 30 days. Also used for rate limiting and session tokens.',
      why: 'Redis serves both roles well: sub-millisecond reads for presence routing and O(1) queue operations.'
    },
    'chat-server-b': {
      title: 'Chat Server B — Recipient Gateway',
      body: 'Holds the WebSocket connection for Client B. Receives a delivery instruction from the Fan-out Service, pushes the message frame over Client B\'s open socket, then immediately sends a "delivered" ACK back through the system to notify the sender.',
      why: 'Same technology as Server A — stateful WebSocket handler. Routing between servers uses Redis presence.'
    },
    'client-b': {
      title: 'Client B — Recipient',
      body: 'Receives the message instantly via the WebSocket push. Renders the message in the UI. Sends a "delivered" event back to the server automatically. Later, when the user opens the chat, sends a "read" event — triggering the blue double-tick on the sender\'s side.',
      why: 'All receipt events travel over the existing WebSocket — no extra HTTP calls needed.'
    }
  };

  window.showArch = function(key) {
    var d = data[key];
    if (!d) { return; }
    var nodes = document.querySelectorAll('.arch-node');
    nodes.forEach(function(n) { n.classList.remove('selected'); });
    event.currentTarget.classList.add('selected');
    var desc = document.getElementById('arch-desc');
    desc.innerHTML = '<strong>' + d.title + '</strong><br/>' + d.body + '<span class="arch-why">Why: ' + d.why + '</span>';
  };
})();
</script>

**Message flow summary (1-1 message):**

1. Client A sends message over WebSocket → Chat Server A
2. Chat Server A → Message Service → Cassandra (persist) + Kafka (publish)
3. Fan-out Service consumes Kafka → queries Presence → finds Client B on Chat Server B
4. Fan-out Service tells Chat Server B to deliver
5. Chat Server B pushes message to Client B over WebSocket
6. Client B device sends "delivered" ACK → Chat Server B → back to Client A (second tick ✓✓)

---

## 6. Level 5 — Message Storage & Ordering

### Why Cassandra?

Cassandra is a wide-column store built for high write throughput across distributed nodes.
Chat is a write-heavy workload: every message is a write, every delivery receipt is a write,
reads (fetching history) are less frequent. Cassandra also handles time-series data naturally
through its clustering key ordering.

### Schema

<pre class="code-block"><span class="cm">-- Messages table: one partition per channel, ordered by message time</span>
<span class="kw">CREATE TABLE</span> messages (
  channel_id   <span class="ty">UUID</span>,          <span class="cm">-- partition key: all messages for a channel together</span>
  message_id   <span class="ty">BIGINT</span>,        <span class="cm">-- clustering key DESC: newest first — Snowflake ID</span>
  sender_id    <span class="ty">UUID</span>,
  content      <span class="ty">TEXT</span>,
  type         <span class="ty">TEXT</span>,          <span class="cm">-- 'text' | 'image' | 'video' | 'system'</span>
  created_at   <span class="ty">TIMESTAMP</span>,
  <span class="kw">PRIMARY KEY</span> ((channel_id), message_id)
) <span class="kw">WITH CLUSTERING ORDER BY</span> (message_id <span class="kw">DESC</span>);

<span class="cm">-- Fetch last 20 messages in channel 123</span>
<span class="kw">SELECT</span> * <span class="kw">FROM</span> messages
<span class="kw">WHERE</span> channel_id = <span class="nm">123</span>
<span class="kw">LIMIT</span> <span class="nm">20</span>;

<span class="cm">-- Fetch messages before a cursor (pagination)</span>
<span class="kw">SELECT</span> * <span class="kw">FROM</span> messages
<span class="kw">WHERE</span> channel_id = <span class="nm">123</span>
  <span class="kw">AND</span> message_id &lt; <span class="nm">1745660400000</span>   <span class="cm">-- cursor from last page</span>
<span class="kw">LIMIT</span> <span class="nm">20</span>;
</pre>

### Snowflake IDs — Ordering Without Coordination

Cassandra does not provide auto-increment IDs across nodes. We need globally ordered IDs
generated without coordination (no single sequence counter). Twitter's Snowflake format:

<pre class="code-block"><span class="cm">-- 64-bit Snowflake ID layout</span>
<span class="cm">-- [41 bits timestamp ms] [10 bits machine id] [12 bits sequence]</span>
<span class="cm">--  2^41 ms = ~69 years of timestamps</span>
<span class="cm">--  2^10 = 1024 machines</span>
<span class="cm">--  2^12 = 4096 IDs per machine per millisecond</span>

<span class="kw">function</span> <span class="fn">generateSnowflakeId</span>(machineId, sequence) {
  <span class="kw">var</span> epoch  = <span class="nm">1700000000000</span>;   <span class="cm">// custom epoch (Nov 2023)</span>
  <span class="kw">var</span> ts     = <span class="ty">Date</span>.<span class="fn">now</span>() - epoch;
  <span class="kw">return</span> (ts * <span class="nm">1000000</span>) + (machineId * <span class="nm">4096</span>) + sequence;
}
</pre>

Snowflake IDs sort chronologically as integers — a range scan on `message_id` in Cassandra
gives you messages in time order without any `ORDER BY` on a separate timestamp column.

{: class="marginalia" }
The double-ratchet algorithm (Signal protocol) generates a new encryption key for every
single message — even if one key is compromised, past and future messages remain secure.
Forward secrecy means recorded ciphertext cannot be decrypted even if the long-term keys
are later stolen.

---

## 7. Level 6 — Delivery Receipts (the ✓✓ Problem)

Three distinct states exist for every message:

- **Sent (✓)** — the server received and persisted the message
- **Delivered (✓✓)** — the recipient's device received the message
- **Read (✓✓ blue)** — the recipient opened the conversation and saw the message

The ✓✓ mechanism is more complex than it appears because "delivered" and "read" are
events that originate on the **recipient's device** and must travel back to the **sender**.

<pre class="code-block"><span class="cm">-- Receipt events table</span>
<span class="kw">CREATE TABLE</span> receipts (
  message_id   <span class="ty">BIGINT</span>,
  user_id      <span class="ty">UUID</span>,
  status       <span class="ty">TEXT</span>,    <span class="cm">-- 'sent' | 'delivered' | 'read'</span>
  updated_at   <span class="ty">TIMESTAMP</span>,
  <span class="kw">PRIMARY KEY</span> (message_id, user_id)
);
</pre>

**Flow for a 1-1 message:**

1. Sender's device → Chat Server: `{type: "msg", text: "Hello"}` (over WebSocket)
2. Message Service persists → returns `{type: "ack", status: "sent", msgId: X}` to sender → **✓ appears**
3. Fan-out Service delivers to recipient's device → device auto-responds `{type: "delivered", msgId: X}`
4. Server updates receipts table → pushes `{type: "receipt", msgId: X, status: "delivered"}` to sender → **✓✓ appears**
5. Recipient opens the chat window → device sends `{type: "read", msgId: X}`
6. Server updates receipts → pushes `{type: "receipt", msgId: X, status: "read"}` to sender → **✓✓ turns blue**

<div class="widget">
  <div class="widget-title">Delivery Receipt Demo — Interactive</div>
  <div class="receipt-demo" id="receipt-demo">
    <div class="receipt-msg">
      <div class="receipt-bubble">
        <div class="receipt-text">Hey, are you free tonight?</div>
        <div class="receipt-meta">
          <span class="receipt-time">10:42</span>
          <span class="receipt-ticks" id="tick-0">✓</span>
        </div>
      </div>
    </div>
    <div class="receipt-msg">
      <div class="receipt-bubble">
        <div class="receipt-text">I was thinking we could grab dinner 🍕</div>
        <div class="receipt-meta">
          <span class="receipt-time">10:42</span>
          <span class="receipt-ticks" id="tick-1">✓</span>
        </div>
      </div>
    </div>
    <div class="receipt-msg">
      <div class="receipt-bubble">
        <div class="receipt-text">Let me know!</div>
        <div class="receipt-meta">
          <span class="receipt-time">10:43</span>
          <span class="receipt-ticks" id="tick-2">✓</span>
        </div>
      </div>
    </div>
  </div>
  <div class="receipt-btns">
    <button class="receipt-btn" id="btn-online" onclick="receiptOnline()">📱 Recipient comes online</button>
    <button class="receipt-btn" id="btn-read" onclick="receiptRead()" disabled>👁 Recipient opens chat</button>
    <button class="receipt-btn" onclick="receiptReset()">↺ Reset</button>
  </div>
  <div class="receipt-status" id="receipt-status">Messages sent — waiting for recipient...</div>
</div>

<script>
(function() {
  function delay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  window.receiptOnline = function() {
    document.getElementById('btn-online').disabled = true;
    document.getElementById('receipt-status').textContent = 'Recipient device received messages — sending delivery ACKs...';
    var ids = ['tick-0', 'tick-1', 'tick-2'];
    var i = 0;
    function deliverNext() {
      if (i >= ids.length) {
        document.getElementById('receipt-status').textContent = 'All messages delivered ✓✓ — tap "Recipient opens chat" for read receipts.';
        document.getElementById('btn-read').disabled = false;
        return;
      }
      var el = document.getElementById(ids[i]);
      el.textContent = '✓✓';
      el.classList.add('delivered');
      i++;
      setTimeout(deliverNext, 220);
    }
    setTimeout(deliverNext, 600);
  };

  window.receiptRead = function() {
    document.getElementById('btn-read').disabled = true;
    document.getElementById('receipt-status').textContent = 'Recipient opened chat — sending read ACKs...';
    var ids = ['tick-0', 'tick-1', 'tick-2'];
    var i = 0;
    function readNext() {
      if (i >= ids.length) {
        document.getElementById('receipt-status').textContent = 'All messages read ✓✓ (blue) — double blue ticks confirmed!';
        return;
      }
      var el = document.getElementById(ids[i]);
      el.classList.remove('delivered');
      el.classList.add('read');
      i++;
      setTimeout(readNext, 150);
    }
    setTimeout(readNext, 400);
  };

  window.receiptReset = function() {
    var ids = ['tick-0', 'tick-1', 'tick-2'];
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      el.textContent = '✓';
      el.classList.remove('delivered', 'read');
    });
    document.getElementById('btn-online').disabled = false;
    document.getElementById('btn-read').disabled = true;
    document.getElementById('receipt-status').textContent = 'Messages sent — waiting for recipient...';
  };
})();
</script>

---

## 8. Level 7 — Offline Message Delivery

When the recipient is offline, the Fan-out Service has no Chat Server connection to route to.
Messages must be durably queued until the user reconnects — possibly days later.

<pre class="code-block"><span class="cm">-- Redis offline queue per user</span>
<span class="cm">-- Key pattern: offline:{userId}</span>
<span class="cm">-- Structure: Redis List (RPUSH to enqueue, LRANGE to drain)</span>

<span class="cm">-- Fan-out Service: recipient offline</span>
<span class="fn">RPUSH</span> offline:<span class="nm">user_456</span>  <span class="st">'{"msgId":X,"from":"alice","text":"Hey!"}'</span>

<span class="cm">-- Set 30-day TTL so messages expire if never read</span>
<span class="fn">EXPIRE</span> offline:<span class="nm">user_456</span>  <span class="nm">2592000</span>

<span class="cm">-- On reconnect: drain the queue atomically</span>
<span class="fn">LRANGE</span>  offline:<span class="nm">user_456</span>  <span class="nm">0</span>  <span class="nm">-1</span>   <span class="cm">-- read all pending</span>
<span class="fn">DEL</span>     offline:<span class="nm">user_456</span>         <span class="cm">-- clear the queue</span>
</pre>

**Reconnect flow:**

1. User opens the app → device establishes WebSocket connection to Chat Server
2. Chat Server registers presence (Redis: `userId → serverId`)
3. Chat Server queries offline queue: `LRANGE offline:userId 0 -1`
4. Delivers all queued messages in order over the new WebSocket connection
5. Device sends delivery ACKs for each message, triggering sender-side receipt updates
6. Chat Server deletes the offline queue

**Edge cases:** Push notifications (APNs / FCM) wake the app when a message arrives so
the reconnect happens quickly. Message deduplication is needed because the device may have
received some messages via push before reconnecting.

---

## 9. Level 8 — Group Chat Fan-out

A 500-member group is the hardest fan-out scenario. One message generates up to 499
deliveries. At scale:

<div class="chat-callout">
1M group messages/min × 500 members = <strong>500M deliveries/min = ~8.3M deliveries/sec</strong>.
A single fan-out worker cannot handle this. Kafka partitioning and parallel workers are required.
</div>

**Fan-out strategy for large groups:**

<pre class="code-block"><span class="cm">-- Message arrives for group_id = 77</span>
<span class="cm">-- Kafka message: { group_id: 77, msg: {...} }</span>
<span class="cm">-- Partitioned by group_id — ensures ordering within a group</span>

<span class="cm">-- Fan-out worker algorithm</span>
<span class="kw">function</span> <span class="fn">fanoutGroupMessage</span>(groupId, message) {
  <span class="kw">var</span> members = <span class="fn">getGroupMembers</span>(groupId);       <span class="cm">// cached in Redis</span>

  members.<span class="fn">forEach</span>(<span class="kw">function</span>(userId) {
    <span class="kw">var</span> serverId = presence.<span class="fn">get</span>(userId);        <span class="cm">// O(1) Redis lookup</span>

    <span class="kw">if</span> (serverId) {
      chatServers.<span class="fn">deliver</span>(serverId, userId, message);  <span class="cm">// online</span>
    } <span class="kw">else</span> {
      offlineQueue.<span class="fn">push</span>(userId, message);             <span class="cm">// offline</span>
    }
  });
}
</pre>

**Optimizations for very large groups (1000+ members):**

- **Write fan-out vs. read fan-out:** For extremely large groups (Slack channels with
  10,000 members), instead of delivering to all connections immediately, store the message
  once and let clients pull when they open the channel. Hybrid: deliver to online members,
  pull for offline.
- **Group member cache:** Store member lists in Redis. Avoid hitting the database on
  every fan-out.
- **Kafka partition count:** More partitions → more parallel fan-out workers. Tune to
  match your delivery throughput target.

{: class="marginalia" }
WhatsApp famously runs on Erlang — a language built for telecom switches that needed to
handle millions of concurrent connections with sub-millisecond failover. In 2014 they had
450M users with just 50 engineers. Erlang's actor model maps directly to the "one process
per connection" model that WebSocket servers require.

---

## 10. Level 9 — End-to-End Encryption

In E2EE, the server stores only ciphertext. It cannot read your messages — only the
intended recipient's device can decrypt them.

**Key concepts:**

<div class="e2ee-row">
  <div class="e2ee-box">Alice's device</div>
  <div class="e2ee-key">🔑 Alice private key</div>
  <div class="e2ee-arrow">+</div>
  <div class="e2ee-key">🔓 Bob public key</div>
  <div class="e2ee-arrow">→</div>
  <div class="e2ee-box">Encrypt message</div>
  <div class="e2ee-arrow">→</div>
  <div class="e2ee-box">Server (ciphertext only)</div>
</div>

<div class="e2ee-row">
  <div class="e2ee-box">Bob's device</div>
  <div class="e2ee-key">🔑 Bob private key</div>
  <div class="e2ee-arrow">→</div>
  <div class="e2ee-box">Decrypt ciphertext</div>
  <div class="e2ee-arrow">→</div>
  <div class="e2ee-box">Plaintext message</div>
</div>

**The Signal Protocol (Double Ratchet Algorithm):**

<pre class="code-block"><span class="cm">-- Key agreement: X3DH (Extended Triple Diffie-Hellman)</span>
<span class="cm">-- Each party publishes a "pre-key bundle" to the server</span>
<span class="cm">-- Session established without both parties being online simultaneously</span>

<span class="cm">-- Double ratchet: new key per message</span>
<span class="cm">-- Two ratchets running in parallel:</span>
<span class="cm">--   1. Diffie-Hellman ratchet: new DH key on each round trip</span>
<span class="cm">--   2. Symmetric ratchet: chain key advances on each message</span>
<span class="cm">-- Result: forward secrecy + break-in recovery</span>

<span class="cm">-- Apps using Signal protocol: WhatsApp, Signal, iMessage (partial)</span>
</pre>

**Why this matters for system design:**

- The server's message store contains only encrypted blobs — a Cassandra data leak
  exposes ciphertext, not content.
- Search, spam filtering, and content moderation become impossible on-server —
  a deliberate privacy tradeoff.
- Multi-device support requires key exchange with each device separately.

---

## 11. Interactive: Mini Chat Demo

Two users, one conversation. Type and send messages as Alice or Bob.

<div class="widget">
  <div class="widget-title">Live Chat Simulator — Alice &amp; Bob</div>
  <div class="chat-demo">
    <div class="chat-window" id="chat-alice">
      <div class="chat-header">
        <div class="chat-avatar" style="background:rgba(123,205,171,0.25);color:#7bcdab;">A</div>
        <div>
          <div class="chat-header-name">Alice</div>
          <div class="chat-header-status">● online</div>
        </div>
      </div>
      <div class="chat-messages" id="msgs-alice"></div>
      <div class="chat-input-row">
        <input class="chat-input" id="input-alice" placeholder="Alice types..." maxlength="120"
               onkeydown="if(event.key==='Enter'){chatSend('alice')}"/>
        <button class="chat-send-btn" onclick="chatSend('alice')">➤</button>
      </div>
    </div>
    <div class="chat-window" id="chat-bob">
      <div class="chat-header">
        <div class="chat-avatar" style="background:rgba(251,239,138,0.2);color:#fbef8a;">B</div>
        <div>
          <div class="chat-header-name">Bob</div>
          <div class="chat-header-status">● online</div>
        </div>
      </div>
      <div class="chat-messages" id="msgs-bob"></div>
      <div class="chat-input-row">
        <input class="chat-input" id="input-bob" placeholder="Bob types..." maxlength="120"
               onkeydown="if(event.key==='Enter'){chatSend('bob')}"/>
        <button class="chat-send-btn" onclick="chatSend('bob')">➤</button>
      </div>
    </div>
  </div>
  <div style="font-size:0.72rem;color:var(--muted);margin-top:0.6rem;text-align:center;">
    Simulates 80ms network delay, delivery ACKs, and read receipts. No server involved — pure JS.
  </div>
</div>

<script>
(function() {
  var msgCounter = 0;

  function nowTime() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function scrollBottom(el) {
    el.scrollTop = el.scrollHeight;
  }

  function appendMessage(container, text, side, msgId) {
    var wrap = document.createElement('div');
    wrap.className = 'chat-bubble-wrap ' + side;
    wrap.id = 'wrap-' + msgId + '-' + container.id;

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (side === 'sent' ? 'sent-bubble' : 'recv-bubble');
    bubble.textContent = text;

    var meta = document.createElement('div');
    meta.className = 'chat-meta';

    var ts = document.createElement('span');
    ts.className = 'chat-ts';
    ts.textContent = nowTime();

    meta.appendChild(ts);

    if (side === 'sent') {
      var tick = document.createElement('span');
      tick.className = 'chat-tick';
      tick.textContent = '✓';
      tick.id = 'tick-' + msgId + '-' + container.id;
      meta.appendChild(tick);
    }

    wrap.appendChild(bubble);
    wrap.appendChild(meta);
    container.appendChild(wrap);
    scrollBottom(container);
    return wrap;
  }

  function simulateDelivery(msgId, senderMsgsId) {
    setTimeout(function() {
      var tickEl = document.getElementById('tick-' + msgId + '-' + senderMsgsId);
      if (tickEl) {
        tickEl.textContent = '✓✓';
        tickEl.classList.add('delivered-tick');
      }
    }, 80);

    setTimeout(function() {
      var tickEl = document.getElementById('tick-' + msgId + '-' + senderMsgsId);
      if (tickEl) {
        tickEl.classList.remove('delivered-tick');
        tickEl.classList.add('read-tick');
      }
    }, 1400);
  }

  window.chatSend = function(sender) {
    var inputEl = document.getElementById('input-' + sender);
    var text = inputEl.value.trim();
    if (!text) { return; }
    inputEl.value = '';

    var recipient = sender === 'alice' ? 'bob' : 'alice';
    var senderMsgsEl    = document.getElementById('msgs-' + sender);
    var recipientMsgsEl = document.getElementById('msgs-' + recipient);

    msgCounter++;
    var mid = msgCounter;

    appendMessage(senderMsgsEl, text, 'sent', mid);

    setTimeout(function() {
      appendMessage(recipientMsgsEl, text, 'recv', mid);
      simulateDelivery(mid, 'msgs-' + sender);
    }, 80);
  };
})();
</script>

---

## 12. Capacity Estimation

<table class="capacity-table">
<thead>
<tr><th>Metric</th><th>Assumption</th><th>Result</th></tr>
</thead>
<tbody>
<tr>
  <td>Concurrent WebSocket connections</td>
  <td>50M concurrent users, 1 connection each</td>
  <td class="val">50M connections</td>
</tr>
<tr>
  <td>Chat Servers needed</td>
  <td>100K connections per server</td>
  <td class="val">~500 servers</td>
</tr>
<tr>
  <td>Message throughput</td>
  <td>100B messages/day (WhatsApp scale)</td>
  <td class="val">~1.16M msg/sec</td>
</tr>
<tr>
  <td>Peak throughput (3× avg)</td>
  <td>Evening spike factor</td>
  <td class="val">~3.5M msg/sec</td>
</tr>
<tr>
  <td>Message storage per day</td>
  <td>100B msgs × 200 bytes avg (with metadata)</td>
  <td class="val">~20 TB/day</td>
</tr>
<tr>
  <td>Annual storage (3× replication)</td>
  <td>20 TB × 365 × 3 replicas</td>
  <td class="val">~22 PB/year</td>
</tr>
<tr>
  <td>Kafka throughput</td>
  <td>3.5M msg/sec × 200 bytes</td>
  <td class="val">~700 MB/sec</td>
</tr>
<tr>
  <td>Presence service memory</td>
  <td>50M users × 100 bytes (userId + serverId + TTL)</td>
  <td class="val">~5 GB RAM</td>
</tr>
<tr>
  <td>Fan-out at group scale</td>
  <td>1M groups msgs/min × 500 members</td>
  <td class="val">~8.3M deliveries/sec</td>
</tr>
</tbody>
</table>

**Cassandra cluster sizing:** At 3.5M writes/sec with 3× replication = 10.5M write ops/sec
across the cluster. At ~50K writes/sec per Cassandra node, you need ~210 nodes. With
commodity hardware (3 TB SSD each), that is ~630 TB raw capacity — covered.

**Kafka sizing:** 700 MB/sec write × 3 replicas = 2.1 GB/sec. At 1 Gbps per broker, you
need ~20 Kafka brokers with 7-day message retention (~1.2 PB total Kafka storage).

---

## Summary

The journey from a polling endpoint to a WhatsApp-scale chat system follows a clear
progression. Each level solves a specific bottleneck:

| Level | Problem Solved | Key Technology |
|-------|---------------|----------------|
| 1 — Polling | Works at all | HTTP GET |
| 2 — Long Polling | Latency | HTTP hold-open |
| 3 — WebSockets | Real-time + wasted requests | TCP upgrade |
| 4 — Message Service | Durability + decoupling | Kafka + Cassandra |
| 5 — Snowflake IDs | Ordering at scale | 64-bit composite ID |
| 6 — Receipts | ✓✓ blue ticks | ACK events over WebSocket |
| 7 — Offline Queue | Durability while disconnected | Redis Lists + TTL |
| 8 — Group Fan-out | 499 deliveries from 1 message | Kafka partitions |
| 9 — E2EE | Privacy | Signal protocol |

{: class="marginalia" }
WebSocket connections are stateful — this means you cannot simply add servers behind a
load balancer. You need sticky sessions or a pub/sub layer (Redis Pub/Sub or Kafka) so
any server can route delivery to any open connection. This is the core operational
complexity of running a chat system at scale.

In an interview, the progression from polling to WebSockets to the full distributed
architecture demonstrates the ability to start simple, identify bottlenecks, and apply
the right tool at each layer. The delivery receipt mechanism and offline queue are the
most commonly missed details — knowing them signals depth of understanding.
