---
layout: post
title: "System Design: Live Chat at Scale — YouTube Live, Twitch, and 100k Concurrent Viewers"
date: 2026-06-02 10:00:00 +0000
categories: ["post"]
tags: [system-design, websockets, kafka, real-time, chat, fan-out, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios
</div>

{: class="marginalia" }
**Twitch chat during major<br/>esports events receives<br/>50,000+ messages per<br/>minute. Twitch uses a<br/>custom IRC-over-WebSocket<br/>protocol and client-side<br/>throttling — your client<br/>silently drops messages<br/>if the stream is too fast.**

Design the live chat for YouTube Live. A streamer has 100,000 concurrent viewers. Each viewer can send messages. Messages must appear to all viewers within 2 seconds. The system must survive chat "explosions" — when a streamer says something controversial and everyone types at once.

This is a real-world distributed systems problem with a clean progression of solutions, each solving a real failure mode of the previous. It's also a favourite interview question because it touches WebSockets, pub/sub, Kafka, rate limiting, and fan-out simultaneously.

---

<style>
.marginalia {
  float: right; clear: right;
  width: 190px; margin: 0 0 1.4rem 1.8rem;
  padding: 11px 14px;
  background: rgba(123,205,171,.06);
  border-left: 3px solid #7bcdab;
  border-radius: 0 5px 5px 0;
  font-size: .78rem; line-height: 1.55;
  color: #888; font-style: italic;
}
@media (max-width: 680px) {
  .marginalia { float: none; width: 100%; margin: 1rem 0; }
}

.code-wrap {
  position: relative; background: #111214; border: 1px solid #2e2f35;
  border-radius: 10px; overflow: hidden; margin: 1.2rem 0;
}
.code-lang {
  background: #1c1d22; padding: 6px 16px; font-size: 11px;
  color: rgba(255,255,255,.38); letter-spacing: .08em; text-transform: uppercase;
  font-family: "Courier New", monospace;
}
.code-wrap pre.code-block {
  margin: 0; padding: 16px 20px; overflow-x: auto;
  font-family: "JetBrains Mono","Fira Code","Courier New",monospace;
  font-size: 13px; line-height: 1.65;
  color: rgba(255,255,255,.85);
  background: transparent !important; border: none !important;
}
.kw  { color: #cc99cd; }
.ty  { color: #7bcdab; }
.st  { color: #f8c555; }
.cm  { color: #5a6272; font-style: italic; }
.fn  { color: #89c0d0; }
.nu  { color: #f08080; }
.op  { color: rgba(255,255,255,.5); }
.nm  { color: #c9d1d9; }

.callout { border-radius: 8px; padding: 1rem 1.2rem; margin: 1rem 0; font-size: .84rem; line-height: 1.7; }
.callout-green  { background: #1a2e22; border-left: 3px solid #7bcdab; color: rgba(255,255,255,.82); }
.callout-yellow { background: #25240e; border-left: 3px solid #fbef8a; color: rgba(255,255,255,.82); }
.callout-red    { background: #2a1616; border-left: 3px solid #f08080; color: rgba(255,255,255,.82); }
.callout strong { color: #fff; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 1rem; margin: 1.5rem 0; }
.stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.2rem; text-align: center; }
.stat-num  { font-size: 1.5rem; font-weight: 800; color: #fbef8a; display: block; line-height: 1.2; }
.stat-lbl  { font-size: .74rem; color: rgba(255,255,255,.45); margin-top: .3rem; text-transform: uppercase; letter-spacing: .07em; }

.level-badge {
  display: inline-block; background: rgba(123,205,171,.12); border: 1px solid rgba(123,205,171,.35);
  color: #7bcdab; font-size: .72rem; letter-spacing: .08em; padding: 3px 10px;
  border-radius: 20px; margin-bottom: .5rem; text-transform: uppercase;
  font-family: "Courier New", monospace;
}
.level-badge.bad { background: rgba(240,128,128,.1); border-color: rgba(240,128,128,.35); color: #f08080; }
.level-badge.warn { background: rgba(251,239,138,.1); border-color: rgba(251,239,138,.35); color: #fbef8a; }

.comp-table { width: 100%; border-collapse: collapse; font-size: .82rem; margin: 1.5rem 0; }
.comp-table th { background: #1e1f24; color: #fbef8a; padding: 10px 14px; text-align: left; border-bottom: 1px solid #2e2f35; }
.comp-table td { padding: 9px 14px; border-bottom: 1px solid #1e1f24; color: rgba(255,255,255,.78); }
.comp-table tr:hover td { background: #1a1b20; }

.viz-wrap { background: #111214; border: 1px solid #2e2f35; border-radius: 12px; padding: 1.4rem; margin: 1.5rem 0; }
.viz-title { font-size: .72rem; text-transform: uppercase; letter-spacing: .1em; color: rgba(255,255,255,.35); margin-bottom: 1rem; }
.viz-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #3a3b40; background: #1a1b1f; color: rgba(255,255,255,.75); font-size: .8rem; cursor: pointer; transition: all .2s; font-family: inherit; }
.viz-btn:hover { border-color: #7bcdab; color: #7bcdab; }
.viz-btn.run { background: #7bcdab; color: #19191c; border: none; font-weight: 700; padding: .45rem 1.2rem; }
.viz-btn.run:hover { background: #5eb896; }
.viz-btn.danger { background: rgba(240,128,128,.12); border-color: #f08080; color: #f08080; }
.viz-btn.danger:hover { background: rgba(240,128,128,.25); }
.viz-btn.warn-btn { background: rgba(251,239,138,.1); border-color: #fbef8a; color: #fbef8a; }
.viz-btn.warn-btn:hover { background: rgba(251,239,138,.22); }
.viz-btn.active { background: #7bcdab; color: #19191c; border-color: #7bcdab; font-weight: 700; }
</style>

## 1. Scale &amp; Constraints

<div class="stat-grid">
  <div class="stat-card"><span class="stat-num">100K</span><div class="stat-lbl">Concurrent viewers / stream</div></div>
  <div class="stat-card"><span class="stat-num">1,000</span><div class="stat-lbl">Messages / sec peak</div></div>
  <div class="stat-card"><span class="stat-num">&lt; 2s</span><div class="stat-lbl">Delivery latency target</div></div>
  <div class="stat-card"><span class="stat-num">3 hrs</span><div class="stat-lbl">Message retention for replay</div></div>
  <div class="stat-card"><span class="stat-num">Millions</span><div class="stat-lbl">Platform-wide concurrent users</div></div>
  <div class="stat-card"><span class="stat-num">1,000s</span><div class="stat-lbl">Simultaneous live streams</div></div>
</div>

The numbers immediately rule out naive approaches. Let's walk through the levels.

---

## 2. Level 1 — Naive Polling

<div class="level-badge bad">Level 1 — Fails at Scale</div>

The simplest implementation: every client polls an HTTP endpoint every second asking "any new messages?"

<div class="code-wrap">
<div class="code-lang">http</div>
<pre class="code-block"><span class="cm"># Client polls every 1 second</span>
<span class="kw">GET</span> <span class="ty">/chat?streamId=abc&amp;since=msg_1234</span>
<span class="op">→</span> <span class="st">200 OK</span>  <span class="cm">{"messages": [...], "lastId": "msg_1250"}</span>

<span class="cm"># If no new messages</span>
<span class="kw">GET</span> <span class="ty">/chat?streamId=abc&amp;since=msg_1250</span>
<span class="op">→</span> <span class="st">200 OK</span>  <span class="cm">{"messages": []}</span></pre>
</div>

**Why it fails:**

- 100,000 clients × 1 req/sec = **100,000 requests/second** for a single stream
- Latency up to 1 second (you only see a message at the next poll interval)
- Most requests return an empty array — pure waste
- Thundering herd: all clients poll in sync, creating spikes
- A busy platform with 10,000 concurrent streams → **1 billion req/sec**

<div class="callout callout-red"><strong>Rule:</strong> Any solution where N clients generate N requests per second is a non-starter for live media. The request rate must be sub-linear in the viewer count.</div>

---

## 3. Level 2 — Long Polling

<div class="level-badge warn">Level 2 — Better, but Stateful HTTP</div>

Long polling keeps the HTTP connection open until a message arrives (or a timeout fires). The server holds the request and responds only when there's new data.

<div class="code-wrap">
<div class="code-lang">pseudocode — server</div>
<pre class="code-block"><span class="kw">function</span> <span class="fn">longPollHandler</span>(req, res) {
  <span class="kw">const</span> timeout = <span class="fn">setTimeout</span>(() <span class="op">=&gt;</span> res.<span class="fn">json</span>([]), <span class="nu">30000</span>);

  chatStore.<span class="fn">subscribe</span>(req.query.streamId, (msg) <span class="op">=&gt;</span> {
    <span class="fn">clearTimeout</span>(timeout);
    res.<span class="fn">json</span>([msg]);    <span class="cm">// respond immediately on new message</span>
  });
}</pre>
</div>

This halves the request rate, but the fundamental problem remains: every viewer still needs a **stateful HTTP connection** parked on the server. A typical HTTP server handles a few thousand concurrent connections. At 100,000 viewers, you would need 20–30 web servers just to hold connections open — and you still have no mechanism to fan a message out to connections on different servers.

---

## 4. Level 3 — WebSockets

<div class="level-badge">Level 3 — Right Protocol, New Problem</div>

WebSockets give us a persistent bidirectional connection. The server can **push** messages to clients the instant they arrive. No polling. No wasted requests.

<div class="code-wrap">
<div class="code-lang">javascript — client</div>
<pre class="code-block"><span class="kw">const</span> ws = <span class="kw">new</span> <span class="ty">WebSocket</span>(<span class="st">'wss://chat.example.com/stream/abc'</span>);

ws.<span class="fn">onopen</span> = () <span class="op">=&gt;</span> {
  ws.<span class="fn">send</span>(<span class="ty">JSON</span>.<span class="fn">stringify</span>({ type: <span class="st">'join'</span>, streamId: <span class="st">'abc'</span> }));
};

ws.<span class="fn">onmessage</span> = (event) <span class="op">=&gt;</span> {
  <span class="kw">const</span> msg = <span class="ty">JSON</span>.<span class="fn">parse</span>(event.data);
  <span class="fn">renderChatMessage</span>(msg);   <span class="cm">// instant push, no polling</span>
};

ws.<span class="fn">onclose</span> = () <span class="op">=&gt;</span> {
  <span class="fn">setTimeout</span>(() <span class="op">=&gt;</span> <span class="fn">reconnect</span>(), <span class="nu">2000</span>);  <span class="cm">// reconnect with backoff</span>
};</pre>
</div>

**The new problem: cross-server fan-out.**

A single server can hold roughly 10,000 WebSocket connections (limited by file descriptors and memory, not CPU). For 100,000 viewers you need **at least 10 chat servers**. When a message arrives on Chat Server 1, it must also reach viewers connected to Chat Servers 2 through 10.

How does Server 1 tell the others? This is the **fan-out problem**.

---

## 5. Level 4 — Redis Pub/Sub for Cross-Server Fan-Out

<div class="level-badge">Level 4 — Production-Ready Fan-Out</div>

Redis Pub/Sub provides a lightweight message bus. Every chat server subscribes to the same channel. When any server receives a message, it publishes to Redis, and all servers receive it simultaneously.

<div class="code-wrap">
<div class="code-lang">pseudocode — chat server</div>
<pre class="code-block"><span class="cm">// On startup: subscribe to this stream's chat channel</span>
redis.<span class="fn">subscribe</span>(<span class="st">'stream:'</span> + streamId + <span class="st">':chat'</span>, (message) <span class="op">=&gt;</span> {
  <span class="cm">// Received from Redis — push to ALL local WebSocket clients</span>
  localClients.<span class="fn">forEach</span>(client <span class="op">=&gt;</span> client.<span class="fn">send</span>(message));
});

<span class="cm">// When a viewer sends a message</span>
ws.<span class="fn">onmessage</span> = (rawMsg) <span class="op">=&gt;</span> {
  <span class="kw">const</span> msg = <span class="fn">validate</span>(rawMsg);
  redis.<span class="fn">publish</span>(<span class="st">'stream:'</span> + streamId + <span class="st">':chat'</span>, <span class="ty">JSON</span>.<span class="fn">stringify</span>(msg));
};</pre>
</div>

The fan-out path:
1. Viewer on Server 3 sends a message via WebSocket
2. Server 3 publishes the message to Redis channel `stream:abc:chat`
3. Redis delivers it to **all** subscribers — Server 1, Server 2, Server 3, …, Server 10
4. Each server pushes to its local WebSocket clients
5. All 100,000 viewers receive the message — typically in **under 50ms**

<div class="callout callout-yellow"><strong>Limitation:</strong> Redis Pub/Sub is fire-and-forget. If a chat server restarts, it loses all messages during the downtime window. There is no persistence, no replay, no offset. A viewer joining mid-stream cannot retrieve the last 100 messages.</div>

---

### Interactive — WebSocket Fan-Out Visualizer

<div class="viz-wrap" id="fanout-wrap">
  <div class="viz-title">&#9654; WebSocket Fan-Out &amp; Redis Pub/Sub — Live Animation</div>
  <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem;">
    <button class="viz-btn run" id="fanout-play-btn" onclick="fanoutPlay()">&#9654; Send Message</button>
    <button class="viz-btn" onclick="fanoutReset()">Reset</button>
  </div>
  <canvas id="fanout-canvas" width="640" height="320" style="width:100%;border-radius:8px;display:block;background:#0d0e11;"></canvas>
  <div id="fanout-log" style="font-family:'Courier New',monospace;font-size:.72rem;color:#7bcdab;background:#090909;border:1px solid #1e1f24;border-radius:4px;padding:7px 11px;margin-top:.7rem;height:56px;overflow-y:auto;line-height:1.6;"></div>
</div>

<script>
(function() {
  var canvas = document.getElementById('fanout-canvas');
  var ctx = canvas.getContext('2d');
  var log = document.getElementById('fanout-log');
  var animId = null;
  var particles = [];
  var nodeStates = {};

  var W = 640, H = 320;

  var nodes = {
    streamer: { x: 80, y: 160, label: 'Streamer', sub: 'sends msg', color: '#fbef8a', r: 22 },
    redis:    { x: 320, y: 160, label: 'Redis', sub: 'pub/sub', color: '#f08080', r: 26 },
    s1:  { x: 500, y: 60,  label: 'Chat', sub: 'Server 1', color: '#7bcdab', r: 20 },
    s2:  { x: 500, y: 160, label: 'Chat', sub: 'Server 2', color: '#7bcdab', r: 20 },
    s3:  { x: 500, y: 260, label: 'Chat', sub: 'Server 3', color: '#7bcdab', r: 20 },
    v1a: { x: 610, y: 30,  label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v1b: { x: 610, y: 65,  label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v1c: { x: 610, y: 100, label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v1d: { x: 610, y: 130, label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v2a: { x: 610, y: 140, label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v2b: { x: 610, y: 165, label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v2c: { x: 610, y: 190, label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v2d: { x: 610, y: 215, label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v3a: { x: 610, y: 230, label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v3b: { x: 610, y: 255, label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v3c: { x: 610, y: 280, label: 'V', sub: '', color: '#89c0d0', r: 12 },
    v3d: { x: 610, y: 305, label: 'V', sub: '', color: '#89c0d0', r: 12 }
  };

  var viewerGroups = {
    s1: ['v1a','v1b','v1c','v1d'],
    s2: ['v2a','v2b','v2c','v2d'],
    s3: ['v3a','v3b','v3c','v3d']
  };

  function resetStates() {
    Object.keys(nodes).forEach(function(k) { nodeStates[k] = 'idle'; });
  }
  resetStates();

  function logMsg(txt) {
    var t = new Date().toISOString().substr(11,8);
    log.innerHTML += '<span style="color:#5a6272;">[' + t + ']</span> ' + txt + '\n';
    log.scrollTop = log.scrollHeight;
  }

  function drawScene() {
    ctx.clearRect(0, 0, W, H);

    // Draw static edges
    var edges = [
      ['streamer','redis'],
      ['redis','s1'], ['redis','s2'], ['redis','s3'],
      ['s1','v1a'], ['s1','v1b'], ['s1','v1c'], ['s1','v1d'],
      ['s2','v2a'], ['s2','v2b'], ['s2','v2c'], ['s2','v2d'],
      ['s3','v3a'], ['s3','v3b'], ['s3','v3c'], ['s3','v3d']
    ];
    edges.forEach(function(e) {
      var a = nodes[e[0]], b = nodes[e[1]];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw particles
    particles.forEach(function(p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.color || '#fbef8a';
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color || '#fbef8a';
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw nodes
    Object.keys(nodes).forEach(function(k) {
      var n = nodes[k];
      var state = nodeStates[k];
      var glowColor = state === 'active' ? n.color : 'transparent';
      if (state === 'active') {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2);
        ctx.fillStyle = n.color.replace(')', ',0.18)').replace('rgb', 'rgba').replace('#', 'rgba(').replace('rgba(', 'rgba(');
        // Simple glow via shadow
        ctx.shadowBlur = 18;
        ctx.shadowColor = n.color;
        ctx.fillStyle = 'transparent';
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = state === 'active' ? n.color : '#1a1b1f';
      ctx.strokeStyle = state === 'active' ? n.color : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = state === 'active' ? '#19191c' : n.color;
      ctx.font = 'bold ' + (n.r > 15 ? '9' : '7') + 'px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y - (n.sub ? 3 : 0));
      if (n.sub) {
        ctx.font = (n.r > 15 ? '7' : '6') + 'px Courier New';
        ctx.fillStyle = state === 'active' ? 'rgba(25,25,28,0.8)' : 'rgba(255,255,255,0.4)';
        ctx.fillText(n.sub, n.x, n.y + 7);
      }
    });
  }

  function addParticle(fromKey, toKey, color, cb) {
    var a = nodes[fromKey], b = nodes[toKey];
    var p = { x: a.x, y: a.y, tx: b.x, ty: b.y, color: color, done: false, cb: cb };
    particles.push(p);
  }

  function animateStep() {
    var allDone = true;
    particles.forEach(function(p) {
      if (p.done) return;
      var dx = p.tx - p.x, dy = p.ty - p.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 4) {
        p.x = p.tx; p.y = p.ty; p.done = true;
        if (p.cb) p.cb();
      } else {
        p.x += dx * 0.12;
        p.y += dy * 0.12;
        allDone = false;
      }
    });
    drawScene();
    if (!allDone) {
      animId = requestAnimationFrame(animateStep);
    } else {
      particles = particles.filter(function(p) { return !p.done; });
      if (particles.length > 0) {
        animId = requestAnimationFrame(animateStep);
      }
    }
  }

  function wait(ms, cb) { setTimeout(cb, ms); }

  window.fanoutPlay = function() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    particles = [];
    resetStates();
    log.innerHTML = '';
    document.getElementById('fanout-play-btn').disabled = true;

    logMsg('Streamer sends: "Let\'s GO!!"');
    nodeStates['streamer'] = 'active';
    drawScene();

    wait(400, function() {
      logMsg('Message arrives at Chat Server via WebSocket');
      nodeStates['s2'] = 'active';
      addParticle('streamer', 'redis', '#fbef8a', function() {
        logMsg('Server 2 PUBLISHes to Redis channel stream:abc:chat');
        nodeStates['redis'] = 'active';
        drawScene();
        wait(300, function() {
          logMsg('Redis delivers to ALL subscribed chat servers');
          var servers = ['s1','s2','s3'];
          var done = 0;
          servers.forEach(function(srv) {
            addParticle('redis', srv, '#f08080', function() {
              nodeStates[srv] = 'active';
              drawScene();
              done++;
              if (done === servers.length) {
                logMsg('Each server pushes to its local WebSocket clients');
                wait(200, function() {
                  var allViewers = ['v1a','v1b','v1c','v1d','v2a','v2b','v2c','v2d','v3a','v3b','v3c','v3d'];
                  var vdone = 0;
                  allViewers.forEach(function(v) {
                    var srvKey = v.substr(0,2);
                    addParticle(srvKey, v, '#7bcdab', function() {
                      nodeStates[v] = 'active';
                      drawScene();
                      vdone++;
                      if (vdone === allViewers.length) {
                        logMsg('All 100,000 viewers received the message in ~30ms');
                        document.getElementById('fanout-play-btn').disabled = false;
                      }
                    });
                  });
                });
              }
            });
          });
          animId = requestAnimationFrame(animateStep);
        });
      });
      animId = requestAnimationFrame(animateStep);
    });
  };

  window.fanoutReset = function() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    particles = [];
    resetStates();
    log.innerHTML = '';
    document.getElementById('fanout-play-btn').disabled = false;
    drawScene();
  };

  drawScene();
})();
</script>

---

## 6. Level 5 — Kafka for Durability and Replay

<div class="level-badge">Level 5 — Durable Delivery</div>

{: class="marginalia" }
**YouTube Live introduced<br/>'Top Chat' — an ML<br/>model that runs on every<br/>message in real-time to<br/>filter the highest-quality<br/>ones from the flood.<br/>At 50k messages/min<br/>that's serious inference<br/>at scale.**

Redis Pub/Sub has a critical flaw: it has **no persistence**. Messages are delivered to current subscribers and immediately discarded. If a chat server restarts mid-stream, it misses every message during downtime. A viewer who joins 30 minutes in cannot fetch chat history.

Kafka solves this. Each stream's chat becomes a Kafka topic, partitioned by stream ID. Messages are retained on disk for the configured retention period (here: 3 hours). Chat servers are Kafka consumer groups. New servers joining simply pick up from the last committed offset.

<div class="code-wrap">
<div class="code-lang">pseudocode — kafka producer</div>
<pre class="code-block"><span class="cm">// When a viewer sends a message</span>
kafka.<span class="fn">produce</span>({
  topic: <span class="st">'live-chat'</span>,
  partition: <span class="fn">hash</span>(streamId) <span class="op">%</span> NUM_PARTITIONS,
  key: streamId,
  value: <span class="ty">JSON</span>.<span class="fn">stringify</span>({
    msgId:    <span class="fn">uuid</span>(),
    streamId: streamId,
    userId:   req.user.id,
    text:     sanitized,
    ts:       <span class="ty">Date</span>.<span class="fn">now</span>()
  })
});</pre>
</div>

<div class="code-wrap">
<div class="code-lang">pseudocode — kafka consumer (chat server)</div>
<pre class="code-block"><span class="cm">// Chat server subscribes as a consumer group</span>
kafka.<span class="fn">subscribe</span>({
  topics: [<span class="st">'live-chat'</span>],
  groupId: <span class="st">'chat-servers-group'</span>
}, (message) <span class="op">=&gt;</span> {
  <span class="kw">const</span> streamId = message.key;
  <span class="cm">// Push to all local WebSocket clients watching this stream</span>
  localSubs.<span class="fn">get</span>(streamId).<span class="fn">forEach</span>(client <span class="op">=&gt;</span> {
    client.<span class="fn">send</span>(message.value);
  });
});

<span class="cm">// New viewer joining mid-stream: fetch last 100 messages</span>
<span class="kw">const</span> history = <span class="kw">await</span> kafka.<span class="fn">fetchFromOffset</span>({
  topic: <span class="st">'live-chat'</span>,
  partition: <span class="fn">hash</span>(streamId),
  fromOffset: <span class="st">'latest'</span>,
  limit: <span class="nu">100</span>
});</pre>
</div>

**Kafka vs Redis trade-off:**

<table class="comp-table">
  <thead>
    <tr><th>Property</th><th>Redis Pub/Sub</th><th>Kafka</th></tr>
  </thead>
  <tbody>
    <tr><td>Latency</td><td style="color:#7bcdab;">&lt; 5ms</td><td style="color:#fbef8a;">50–100ms</td></tr>
    <tr><td>Persistence</td><td style="color:#f08080;">None — fire and forget</td><td style="color:#7bcdab;">Durable (configurable retention)</td></tr>
    <tr><td>Replay / history</td><td style="color:#f08080;">No</td><td style="color:#7bcdab;">Yes — seek to any offset</td></tr>
    <tr><td>Fan-out to many consumers</td><td style="color:#7bcdab;">Instant broadcast</td><td style="color:#fbef8a;">Consumer group — partitioned</td></tr>
    <tr><td>Operational complexity</td><td style="color:#7bcdab;">Low</td><td style="color:#f08080;">High (ZooKeeper/KRaft, brokers)</td></tr>
  </tbody>
</table>

**Best practice used by major platforms:** use **both**. Redis Pub/Sub for the hot path (sub-10ms live delivery to connected servers), Kafka for durability and replay. The write path publishes to both. Kafka's consumer group is used for message history, analytics, and moderation pipelines — not for the real-time fan-out.

<div class="callout callout-green"><strong>Architecture:</strong> Viewer sends message → Chat Server → (1) Redis PUBLISH for live fan-out AND (2) Kafka produce for persistence. Chat Server also consumes Kafka to serve chat replay to late-joining viewers.</div>

---

## 7. Level 6 — Rate Limiting and Moderation

<div class="level-badge">Level 6 — Production Hardening</div>

A stream with 100,000 viewers where every viewer can send messages without limits becomes unusable within seconds. Rate limiting and moderation are not optional features — they are prerequisites for a functioning chat.

### 7a. Per-User Rate Limiting (Sliding Window in Redis)

<div class="code-wrap">
<div class="code-lang">lua — redis sliding window rate limiter</div>
<pre class="code-block"><span class="cm">-- Key: ratelimit:{userId}:{streamId}</span>
<span class="cm">-- Allow max 2 messages per 1000ms sliding window</span>
<span class="kw">local</span> key    = KEYS[<span class="nu">1</span>]
<span class="kw">local</span> now    = <span class="fn">tonumber</span>(ARGV[<span class="nu">1</span>])
<span class="kw">local</span> window = <span class="fn">tonumber</span>(ARGV[<span class="nu">2</span>])  <span class="cm">-- 1000 ms</span>
<span class="kw">local</span> limit  = <span class="fn">tonumber</span>(ARGV[<span class="nu">3</span>])  <span class="cm">-- 2 messages</span>

<span class="cm">-- Remove events outside the window</span>
redis.<span class="fn">call</span>(<span class="st">'ZREMRANGEBYSCORE'</span>, key, <span class="nu">0</span>, now - window)

<span class="cm">-- Count remaining events in window</span>
<span class="kw">local</span> count = redis.<span class="fn">call</span>(<span class="st">'ZCARD'</span>, key)

<span class="kw">if</span> count &lt; limit <span class="kw">then</span>
  redis.<span class="fn">call</span>(<span class="st">'ZADD'</span>, key, now, now)
  redis.<span class="fn">call</span>(<span class="st">'EXPIRE'</span>, key, <span class="nu">2</span>)
  <span class="kw">return</span> <span class="nu">1</span>  <span class="cm">-- allowed</span>
<span class="kw">else</span>
  <span class="kw">return</span> <span class="nu">0</span>  <span class="cm">-- throttled</span>
<span class="kw">end</span></pre>
</div>

### 7b. Streamer-Controlled Modes

- **Slow mode:** 1 message per N seconds per user — enforced with a Redis key with TTL
- **Subscriber-only mode:** check `userId` against subscriber set in Redis
- **Emote-only mode:** validate message against regex on the chat server before publishing

<div class="code-wrap">
<div class="code-lang">pseudocode — slow mode check</div>
<pre class="code-block"><span class="kw">async function</span> <span class="fn">canSendInSlowMode</span>(userId, streamId, cooldownSecs) {
  <span class="kw">const</span> key = <span class="st">'slowmode:'</span> + streamId + <span class="st">':'</span> + userId;
  <span class="kw">const</span> exists = <span class="kw">await</span> redis.<span class="fn">exists</span>(key);
  <span class="kw">if</span> (exists) <span class="kw">return false</span>;
  <span class="kw">await</span> redis.<span class="fn">set</span>(key, <span class="nu">1</span>, <span class="st">'EX'</span>, cooldownSecs);
  <span class="kw">return true</span>;
}</pre>
</div>

### 7c. Auto-Moderation Pipeline

Messages pass through a moderation pipeline before being published:

1. **Keyword filter** — Redis SET of banned words, O(1) lookup per word token
2. **Regex patterns** — phone numbers, emails, URLs (configurable per channel)
3. **ML classifier** — harassment/hate-speech model; runs asynchronously, messages flagged after delivery can be retroactively removed
4. **Channel-specific blocklists** — streamers maintain their own ban lists

---

### Interactive — Live Chat Demo

<div class="viz-wrap" id="chat-demo-wrap">
  <div class="viz-title">&#9654; Live Chat Demo — Rate Limiting &amp; Moderation</div>

  <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;">
    <button class="viz-btn danger" onclick="spamAttack()">&#128165; Spam Attack (50 msgs)</button>
    <button class="viz-btn warn-btn" id="slow-mode-btn" onclick="toggleSlowMode()">&#128336; Enable Slow Mode (30s)</button>
    <button class="viz-btn" onclick="sendToxic()">&#9888;&#65039; Send Toxic Message</button>
    <button class="viz-btn" onclick="clearChat()" style="margin-left:auto;">Clear</button>
  </div>

  <div style="display:grid;grid-template-columns:1fr 260px;gap:1rem;">
    <div>
      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.3);margin-bottom:.5rem;">Live Chat</div>
      <div id="chat-window" style="background:#0d0e11;border:1px solid #2e2f35;border-radius:8px;height:320px;overflow-y:auto;padding:.6rem .8rem;display:flex;flex-direction:column;gap:.3rem;"></div>
      <div style="display:flex;gap:.5rem;margin-top:.6rem;">
        <input id="chat-input" placeholder="Send a message..." style="flex:1;background:#1a1b1f;border:1px solid #3a3b40;border-radius:6px;padding:.45rem .8rem;color:rgba(255,255,255,.85);font-size:.82rem;font-family:inherit;" onkeydown="if(event.key==='Enter')sendUserMsg()" />
        <button class="viz-btn run" onclick="sendUserMsg()" style="padding:.45rem 1rem;">Send</button>
      </div>
    </div>
    <div>
      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.3);margin-bottom:.5rem;">System Stats</div>
      <div style="background:#0d0e11;border:1px solid #2e2f35;border-radius:8px;padding:.8rem;font-family:'Courier New',monospace;font-size:.76rem;color:rgba(255,255,255,.7);line-height:1.9;">
        <div>Mode: <span id="stat-mode" style="color:#7bcdab;">normal</span></div>
        <div>Msgs delivered: <span id="stat-delivered" style="color:#fbef8a;">0</span></div>
        <div>Msgs throttled: <span id="stat-throttled" style="color:#f08080;">0</span></div>
        <div>Msgs removed: <span id="stat-removed" style="color:#cc99cd;">0</span></div>
        <div>Msgs/sec: <span id="stat-mps" style="color:#89c0d0;">0</span></div>
        <div style="margin-top:.5rem;padding-top:.5rem;border-top:1px solid #2e2f35;">Rate limit: <span id="stat-ratelimit" style="color:#7bcdab;">2/sec</span></div>
        <div>Kafka lag: <span id="stat-lag" style="color:#7bcdab;">12ms</span></div>
        <div>Redis RTT: <span id="stat-redis" style="color:#7bcdab;">2ms</span></div>
      </div>
      <div style="margin-top:.8rem;">
        <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.3);margin-bottom:.4rem;">Moderation Log</div>
        <div id="mod-log" style="background:#0d0e11;border:1px solid #2e2f35;border-radius:8px;height:120px;overflow-y:auto;padding:.5rem .7rem;font-family:'Courier New',monospace;font-size:.7rem;color:#888;line-height:1.7;"></div>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  var delivered = 0, throttled = 0, removed = 0;
  var slowMode = false;
  var slowModeUsers = {};
  var msgWindow = [];
  var lastSecCount = 0;

  var userNames = ['GamerX99','PogChamp','KappaKing','Kreygasm','4Head','LUL','BibleThump','PJSalt','FeelsBadMan','FeelsGoodMan','monkaS','OMEGALUL','pepeLaugh','widepeepoHappy','forsenE'];
  var userColors = ['#7bcdab','#fbef8a','#89c0d0','#f08080','#cc99cd','#ffab70','#f8c555','#79b8ff'];
  var toxicWords = ['badword','hate','toxic','spam','idiot'];
  var normalMsgs = [
    'PogChamp', 'LUL LUL LUL', 'this is insane!', 'LETS GO!!', '5Head actually', 'OMEGALUL',
    'no way bro', 'I cant believe it', 'monkaS', 'Clap Clap Clap', 'KEKW', 'ez clap',
    'forsenE forsenE', 'actual gameplay', 'the read!!', 'widepeepoHappy', 'pepeLaugh',
    'BASED', 'W + ratio', 'copium', 'hypers', '!!!', 'chat is cooked', 'GGs'
  ];

  function randName() { return userNames[Math.floor(Math.random() * userNames.length)]; }
  function randColor() { return userColors[Math.floor(Math.random() * userColors.length)]; }
  function randMsg() { return normalMsgs[Math.floor(Math.random() * normalMsgs.length)]; }

  function appendMsg(name, text, color, moderated, isSystem) {
    var win = document.getElementById('chat-window');
    var el = document.createElement('div');
    el.style.cssText = 'font-size:.8rem;line-height:1.5;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
    if (isSystem) {
      el.style.color = 'rgba(255,255,255,0.3)';
      el.style.fontStyle = 'italic';
      el.style.fontFamily = "'Courier New', monospace";
      el.style.fontSize = '.72rem';
      el.innerHTML = text;
    } else if (moderated) {
      el.innerHTML = '<span style="color:' + color + ';font-weight:600;">' + name + '</span>: <span style="color:#f08080;font-style:italic;">[removed by automod]</span>';
      removed++;
      document.getElementById('stat-removed').textContent = removed;
      addModLog('REMOVED from ' + name + ': "' + text + '"');
    } else {
      el.innerHTML = '<span style="color:' + color + ';font-weight:600;">' + name + '</span>: <span style="color:rgba(255,255,255,0.82);">' + text + '</span>';
      delivered++;
      document.getElementById('stat-delivered').textContent = delivered;
    }
    win.appendChild(el);
    win.scrollTop = win.scrollHeight;
    msgWindow.push(Date.now());
    updateMps();
  }

  function updateMps() {
    var now = Date.now();
    msgWindow = msgWindow.filter(function(t) { return now - t < 1000; });
    document.getElementById('stat-mps').textContent = msgWindow.length;
  }

  function addModLog(txt) {
    var ml = document.getElementById('mod-log');
    var t = new Date().toISOString().substr(11,8);
    ml.innerHTML += '<span style="color:#5a6272;">[' + t + ']</span> ' + txt + '\n';
    ml.scrollTop = ml.scrollHeight;
  }

  function isToxic(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < toxicWords.length; i++) {
      if (lower.indexOf(toxicWords[i]) !== -1) return true;
    }
    return false;
  }

  function checkSlowMode(userId) {
    if (!slowMode) return true;
    var now = Date.now();
    var last = slowModeUsers[userId];
    if (last && now - last < 30000) return false;
    slowModeUsers[userId] = now;
    return true;
  }

  function tryDeliverMsg(userId, name, color, text) {
    if (!checkSlowMode(userId)) {
      throttled++;
      document.getElementById('stat-throttled').textContent = throttled;
      addModLog('SLOW-MODE throttle: ' + name);
      return;
    }
    if (isToxic(text)) {
      appendMsg(name, text, color, true, false);
    } else {
      appendMsg(name, text, color, false, false);
    }
  }

  var spamTimers = [];
  window.spamAttack = function() {
    spamTimers.forEach(clearTimeout);
    spamTimers = [];
    appendMsg('', '--- SPAM ATTACK: 50 messages flooding in ---', '', false, true);
    addModLog('SPAM ATTACK detected: 50 msgs queued');
    var allowed = 0, blocked = 0;
    for (var i = 0; i < 50; i++) {
      (function(idx) {
        var t = spamTimers.push(setTimeout(function() {
          var name = randName();
          var color = randColor();
          var text = randMsg();
          // Simulate rate limiting: allow roughly 1 in 5 through
          if (Math.random() < 0.22) {
            appendMsg(name, text, color, false, false);
            allowed++;
          } else {
            throttled++;
            document.getElementById('stat-throttled').textContent = throttled;
            if (Math.random() < 0.3) addModLog('RATE-LIMIT drop: ' + name + ' (sliding window)');
          }
        }, idx * 60));
      })(i);
    }
  };

  window.toggleSlowMode = function() {
    slowMode = !slowMode;
    var btn = document.getElementById('slow-mode-btn');
    var modeEl = document.getElementById('stat-mode');
    if (slowMode) {
      btn.classList.add('active');
      btn.textContent = '\u23F9\uFE0F Slow Mode ON (30s)';
      modeEl.textContent = 'slow (30s)';
      modeEl.style.color = '#fbef8a';
      appendMsg('', '--- Slow Mode enabled: 1 message per 30s per user ---', '', false, true);
      document.getElementById('stat-ratelimit').textContent = '1/30s';
    } else {
      btn.classList.remove('active');
      btn.textContent = '\u23F0 Enable Slow Mode (30s)';
      modeEl.textContent = 'normal';
      modeEl.style.color = '#7bcdab';
      appendMsg('', '--- Slow Mode disabled ---', '', false, true);
      document.getElementById('stat-ratelimit').textContent = '2/sec';
      slowModeUsers = {};
    }
  };

  window.sendToxic = function() {
    var name = randName();
    var color = randColor();
    var text = 'This stream is toxic idiot content';
    appendMsg(name, text, color, true, false);
  };

  window.clearChat = function() {
    document.getElementById('chat-window').innerHTML = '';
    document.getElementById('mod-log').innerHTML = '';
    delivered = 0; throttled = 0; removed = 0;
    document.getElementById('stat-delivered').textContent = 0;
    document.getElementById('stat-throttled').textContent = 0;
    document.getElementById('stat-removed').textContent = 0;
    msgWindow = [];
    updateMps();
  };

  window.sendUserMsg = function() {
    var input = document.getElementById('chat-input');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    tryDeliverMsg('you', 'You', '#fbef8a', text);
  };

  // Simulate a trickle of organic chat
  function organicMsg() {
    var name = randName();
    var color = randColor();
    var text = randMsg();
    tryDeliverMsg(name, name, color, text);
    setTimeout(organicMsg, 800 + Math.random() * 2200);
  }
  setTimeout(organicMsg, 1200);

  // Simulate fluctuating Kafka lag
  setInterval(function() {
    var lag = (8 + Math.random() * 30).toFixed(0);
    var rtt = (1 + Math.random() * 4).toFixed(0);
    document.getElementById('stat-lag').textContent = lag + 'ms';
    document.getElementById('stat-redis').textContent = rtt + 'ms';
  }, 2000);
})();
</script>

---

## 8. Level 7 — Viewer Count (HyperLogLog)

{: class="marginalia" }
**Discord built its<br/>real-time engine on<br/>Elixir/Erlang — a<br/>runtime designed for<br/>telecom switches that<br/>must handle millions of<br/>lightweight processes<br/>concurrently. At<br/>Discord's scale this<br/>wasn't premature<br/>optimisation; it was<br/>the right tool<br/>from day one.**

Displaying an accurate live viewer count sounds simple. It isn't.

**Naive approach — count WebSocket connections:**

<div class="code-wrap">
<div class="code-lang">sql</div>
<pre class="code-block"><span class="cm">-- Called every second: terrible idea</span>
<span class="kw">SELECT</span> <span class="fn">COUNT</span>(<span class="op">*</span>) <span class="kw">FROM</span> connections
<span class="kw">WHERE</span> stream_id <span class="op">=</span> <span class="st">'abc'</span>
  <span class="kw">AND</span> last_heartbeat <span class="op">&gt;</span> <span class="fn">NOW</span>() <span class="op">-</span> INTERVAL <span class="st">'30 seconds'</span>;</pre>
</div>

At millions of connections per second, this is a write-heavy table. The query touches the full index for every stream every second. It scales linearly with stream count — a disaster.

**Production approach — Redis HyperLogLog:**

HyperLogLog is a probabilistic data structure that estimates cardinality in O(1) time with only 12KB of memory, regardless of how many unique elements it has seen. The error rate is ±0.81%.

<div class="code-wrap">
<div class="code-lang">redis commands</div>
<pre class="code-block"><span class="cm"># Viewer joins or sends heartbeat</span>
<span class="kw">PFADD</span>  stream:<span class="nm">abc</span>:viewers  user:<span class="nm">12345</span>

<span class="cm"># Get approximate viewer count (12 KB memory, ±0.81% error)</span>
<span class="kw">PFCOUNT</span>  stream:<span class="nm">abc</span>:viewers

<span class="cm"># Merge across regional clusters</span>
<span class="kw">PFMERGE</span>  stream:<span class="nm">abc</span>:viewers:global  stream:<span class="nm">abc</span>:viewers:us  stream:<span class="nm">abc</span>:viewers:eu</pre>
</div>

Viewers send a heartbeat every 30 seconds. On disconnect or missed heartbeat the HLL key is not modified — HLL only adds, never removes. Instead, you rotate the HLL key every minute: copy it, expire the old one, start fresh. The count displayed is a 1-minute rolling window.

<div class="callout callout-green"><strong>Trade-off accepted:</strong> ±0.81% error on a viewer count is imperceptible to humans. "100,000 viewers" vs "100,810 viewers" — nobody cares. Trading exactness for O(1) memory and O(1) time is the correct engineering call.</div>

---

## 9. Geographic Distribution

A single regional cluster introduces a problem: a viewer in Tokyo watching a US stream routes all WebSocket traffic to US data centres — adding 150ms of network latency on top of application latency. For chat, which should feel instantaneous, this is noticeable.

**Multi-region architecture:**

<div class="code-wrap">
<div class="code-lang">architecture</div>
<pre class="code-block">User (Tokyo) 
  <span class="op">→</span> Anycast DNS / GeoDNS 
  <span class="op">→</span> Asia-Pacific Chat Cluster (WebSocket)
    <span class="op">→</span> AP Redis Pub/Sub  <span class="cm"># local fan-out &lt; 5ms</span>
    <span class="op">→</span> AP Kafka Broker   <span class="cm"># local durability</span>
      <span class="op">→</span> Kafka MirrorMaker 2.0
        <span class="op">→</span> US-East Kafka Broker  <span class="cm"># cross-region replication ~100ms</span>
        <span class="op">→</span> EU Kafka Broker</pre>
</div>

Messages from a Tokyo viewer reach other Tokyo viewers in under 10ms via local Redis. The cross-region Kafka replication ensures US-East and EU viewers also receive the message — with an additional ~80–120ms of network transit. For chat, this is completely acceptable and unnoticeable to users.

**Consistency model:** eventual consistency across regions. Chat is not a financial transaction — a 100ms ordering discrepancy between a Tokyo viewer and a New York viewer is invisible and irrelevant.

---

## 10. Capacity Estimate

<table class="comp-table">
  <thead>
    <tr><th>Metric</th><th>Number</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td>WebSocket connections / server</td><td style="color:#fbef8a;">~10,000</td><td>Limited by fd ulimit + memory (~10KB per conn)</td></tr>
    <tr><td>Chat servers for 100k viewers</td><td style="color:#fbef8a;">10</td><td>Plus 3–5 spare for rolling deploys</td></tr>
    <tr><td>Peak messages / sec</td><td style="color:#fbef8a;">1,000</td><td>Single popular stream</td></tr>
    <tr><td>Redis pub/sub throughput</td><td style="color:#fbef8a;">&lt; 5ms</td><td>In-memory, no disk I/O</td></tr>
    <tr><td>Kafka write throughput</td><td style="color:#fbef8a;">~500 KB/sec</td><td>500 bytes avg × 1,000 msg/sec</td></tr>
    <tr><td>Kafka retention (3hr)</td><td style="color:#fbef8a;">~5.4 GB</td><td>Per popular stream (500B × 1000/s × 10,800s)</td></tr>
    <tr><td>Redis HLL per stream</td><td style="color:#fbef8a;">12 KB</td><td>Regardless of viewer count</td></tr>
    <tr><td>Rate limit keys in Redis</td><td style="color:#fbef8a;">~100k</td><td>One per active user, TTL 2s</td></tr>
    <tr><td>Platform-wide Kafka throughput</td><td style="color:#fbef8a;">~50 MB/sec</td><td>100 popular streams simultaneously</td></tr>
  </tbody>
</table>

---

## 11. Full Architecture Summary

<div class="viz-wrap">
  <div class="viz-title">&#9654; Complete System Architecture</div>
  <div style="font-family:'Courier New',monospace;font-size:.78rem;line-height:1.9;color:rgba(255,255,255,.75);overflow-x:auto;">
    <div style="display:grid;grid-template-columns:auto auto auto auto auto;gap:.3rem .6rem;align-items:center;">
      <div style="background:#1a1b1f;border:1px solid #fbef8a;border-radius:6px;padding:.4rem .8rem;color:#fbef8a;text-align:center;grid-column:1;">Viewer</div>
      <div style="color:rgba(255,255,255,.3);">&#8594;</div>
      <div style="background:#1a1b1f;border:1px solid #7bcdab;border-radius:6px;padding:.4rem .8rem;color:#7bcdab;text-align:center;">Load Balancer<br/><span style="font-size:.65rem;color:rgba(255,255,255,.35);">sticky sessions / L4</span></div>
      <div style="color:rgba(255,255,255,.3);">&#8594;</div>
      <div style="background:#1a1b1f;border:1px solid #7bcdab;border-radius:6px;padding:.4rem .8rem;color:#7bcdab;text-align:center;">Chat Server<br/><span style="font-size:.65rem;color:rgba(255,255,255,.35);">WebSocket + rate limit</span></div>
    </div>
    <div style="margin:.5rem 0;color:rgba(255,255,255,.25);padding-left:calc(2 * (60px + .6rem) + 2 * 1rem + 2 * 1.6rem);">&#8595; publish</div>
    <div style="display:grid;grid-template-columns:auto auto auto auto auto;gap:.3rem .6rem;align-items:center;margin-top:.2rem;">
      <div></div><div></div><div></div><div></div>
      <div style="background:#1a1b1f;border:1px solid #f08080;border-radius:6px;padding:.4rem .8rem;color:#f08080;text-align:center;">Redis Pub/Sub<br/><span style="font-size:.65rem;color:rgba(255,255,255,.35);">fan-out &lt; 5ms</span></div>
    </div>
    <div style="display:grid;grid-template-columns:auto auto auto auto auto;gap:.3rem .6rem;align-items:center;margin-top:.3rem;">
      <div></div><div></div><div></div><div></div>
      <div style="background:#1a1b1f;border:1px solid #cc99cd;border-radius:6px;padding:.4rem .8rem;color:#cc99cd;text-align:center;">Kafka<br/><span style="font-size:.65rem;color:rgba(255,255,255,.35);">durability + replay</span></div>
    </div>
    <div style="display:grid;grid-template-columns:auto auto auto;gap:.3rem .6rem;align-items:center;margin-top:.3rem;">
      <div style="background:#1a1b1f;border:1px solid #89c0d0;border-radius:6px;padding:.4rem .8rem;color:#89c0d0;text-align:center;">Moderation Service<br/><span style="font-size:.65rem;color:rgba(255,255,255,.35);">keyword + ML</span></div>
      <div style="color:rgba(255,255,255,.3);">&#8592; Kafka consumer</div>
      <div style="background:#1a1b1f;border:1px solid #89c0d0;border-radius:6px;padding:.4rem .8rem;color:#89c0d0;text-align:center;">Analytics Pipeline<br/><span style="font-size:.65rem;color:rgba(255,255,255,.35);">Flink / Spark</span></div>
    </div>
  </div>
</div>

**Message lifecycle:**

1. Viewer sends message via WebSocket to Chat Server
2. Chat Server checks rate limit (Redis, sliding window) — reject if exceeded
3. Chat Server runs synchronous moderation (keyword filter) — reject if flagged
4. Chat Server PUBLISHes to Redis `stream:{id}:chat` channel (live fan-out)
5. Chat Server produces to Kafka `live-chat` topic (durability + async moderation)
6. All Chat Servers subscribed to Redis channel receive the message and push via WebSocket
7. Kafka consumers (moderation service, analytics) process the message asynchronously
8. If async ML moderation flags the message, a "retract" event is published to Redis + Kafka

---

## 12. Interview Checklist

When presenting this in an interview, hit these beats:

<div class="callout callout-green">
<strong>&#9989; Functional requirements confirmed:</strong> message delivery &lt; 2s, 100k concurrent viewers, chat history for replay, rate limiting and moderation<br/>
<strong>&#9989; Non-functional confirmed:</strong> high availability, horizontal scalability, durability (3hr retention)<br/>
<strong>&#9989; Estimation done:</strong> 10 chat servers for 100k viewers, 500KB/s Kafka, 5.4GB retention per stream<br/>
<strong>&#9989; Protocol chosen and justified:</strong> WebSocket over polling — permanent connection, server-push<br/>
<strong>&#9989; Fan-out solved:</strong> Redis Pub/Sub for cross-server broadcast<br/>
<strong>&#9989; Durability solved:</strong> Kafka for persistence, replay, and pipeline consumers<br/>
<strong>&#9989; Rate limiting designed:</strong> sliding window in Redis, slow mode, subscriber-only<br/>
<strong>&#9989; Viewer count solved:</strong> HyperLogLog — O(1) memory, O(1) time, ±0.81% accuracy<br/>
<strong>&#9989; Geographic distribution mentioned:</strong> GeoDNS, regional clusters, Kafka MirrorMaker<br/>
</div>

**Common follow-up questions:**

- *"What happens when a chat server crashes?"* — Clients reconnect (with exponential backoff). Kafka consumers rebalance within the consumer group. No messages are lost because they are already in Kafka. The reconnecting server subscribes to Redis and resumes.
- *"How do you handle a celebrity joining a stream, suddenly jumping from 1k to 500k viewers?"* — Horizontal auto-scaling of chat servers behind the load balancer. Redis Pub/Sub handles the fan-out channel automatically; new servers just subscribe. The load balancer redistributes connections across the new fleet.
- *"How do you display the last 100 messages to a viewer joining late?"* — Chat servers query Kafka by seeking to `(latest offset - 100)` for the stream's partition, fetch the messages, and send them to the client before joining the live Redis channel.

---

*Next in this series: Designing Real-Time Collaborative Editing — Google Docs at Scale.*
