---
layout: post
title: "System Design: Live Sports Scores — Real-Time Updates for Millions of Fans"
date: 2026-06-10 10:00:00 +0000
categories: ["post"]
tags: [system-design, websockets, sse, redis, pub-sub, real-time, web, interview]
series: "System Design: Web Scenarios"
---

<style>
  .post-content { color: rgba(255,255,255,0.8); }
  h2, h3, h4 { color: #fbef8a; }
  a { color: #7bcdab; }
  .accent { color: #7bcdab; }

  .score-demo-wrap,
  .fanout-wrap,
  .protocol-compare-wrap,
  .capacity-table-wrap {
    background: #19191c;
    border: 1px solid rgba(123,205,171,0.25);
    border-radius: 10px;
    padding: 1.4rem 1.6rem;
    margin: 2rem 0;
  }

  .score-demo-wrap h4,
  .fanout-wrap h4,
  .protocol-compare-wrap h4 { margin-top: 0; color: #fbef8a; }

  pre.code-block {
    background: #111114;
    border: 1px solid rgba(251,239,138,0.15);
    border-radius: 8px;
    padding: 1.2rem 1.4rem;
    overflow-x: auto;
    font-size: 0.85rem;
    line-height: 1.7;
    margin: 1.4rem 0;
    color: rgba(255,255,255,0.85);
  }
  pre.code-block .kw  { color: #fbef8a; }
  pre.code-block .fn  { color: #7bcdab; }
  pre.code-block .str { color: #f9a87a; }
  pre.code-block .cmt { color: rgba(255,255,255,0.35); font-style: italic; }
  pre.code-block .num { color: #c3a6ff; }
  pre.code-block .op  { color: rgba(255,255,255,0.55); }

  .marginalia {
    float: right;
    clear: right;
    width: 220px;
    margin: 0 -250px 1.2rem 1.5rem;
    font-size: 0.78rem;
    line-height: 1.55;
    color: rgba(255,255,255,0.45);
    border-left: 2px solid rgba(123,205,171,0.35);
    padding-left: 0.8rem;
  }
  @media (max-width: 1100px) {
    .marginalia {
      float: none;
      width: auto;
      margin: 1rem 0;
      font-size: 0.8rem;
    }
  }

  .capacity-table-wrap table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  .capacity-table-wrap th {
    color: #fbef8a;
    border-bottom: 1px solid rgba(251,239,138,0.3);
    padding: 0.5rem 0.8rem;
    text-align: left;
  }
  .capacity-table-wrap td {
    padding: 0.45rem 0.8rem;
    color: rgba(255,255,255,0.8);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .capacity-table-wrap tr:last-child td { border-bottom: none; }

  /* Protocol compare */
  .proto-panels { display: flex; gap: 1rem; flex-wrap: wrap; }
  .proto-panel {
    flex: 1 1 180px;
    background: #111114;
    border: 1px solid rgba(123,205,171,0.2);
    border-radius: 8px;
    padding: 1rem;
    min-width: 160px;
  }
  .proto-panel h5 { color: #fbef8a; margin: 0 0 0.5rem 0; font-size: 0.9rem; }
  .proto-panel .proto-stat { font-size: 0.78rem; color: rgba(255,255,255,0.5); margin: 0.2rem 0; }
  .proto-panel .proto-val  { font-size: 1.05rem; color: #7bcdab; font-weight: bold; }
  .proto-vis {
    height: 50px;
    position: relative;
    margin: 0.6rem 0;
    overflow: hidden;
    border-radius: 4px;
    background: rgba(255,255,255,0.04);
  }
  .proto-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 4px;
    background: #7bcdab;
    border-radius: 2px;
    width: 0%;
    transition: width 0.4s;
  }
  .proto-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.1rem;
    opacity: 0;
    transition: all 0.3s;
  }
  .sim-controls { margin-top: 1rem; display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; }
  .sim-btn {
    background: #7bcdab;
    color: #19191c;
    border: none;
    border-radius: 5px;
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
    font-weight: bold;
    cursor: pointer;
  }
  .sim-btn:hover { background: #fbef8a; }
  .sim-btn:disabled { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.4); cursor: not-allowed; }
  .sim-log { font-size: 0.78rem; color: rgba(255,255,255,0.45); margin-top: 0.5rem; min-height: 1.2rem; }

  /* Fan-out canvas */
  #fanoutCanvas { display: block; width: 100%; height: 340px; border-radius: 8px; }

  /* Live score widget */
  .score-board {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    background: #111114;
    border-radius: 10px;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }
  .team-block { text-align: center; flex: 1; }
  .team-name { font-size: 0.85rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.3rem; }
  .team-score {
    font-size: 3rem;
    font-weight: 900;
    color: #fbef8a;
    transition: transform 0.25s, color 0.25s;
    line-height: 1;
  }
  .team-score.scored { transform: scale(1.35); color: #7bcdab; }
  .score-sep { font-size: 2rem; color: rgba(255,255,255,0.25); }
  .match-meta { text-align: center; font-size: 0.82rem; color: rgba(255,255,255,0.45); margin-bottom: 0.7rem; }
  .match-clock { color: #fbef8a; font-weight: bold; font-size: 1rem; }
  .match-state-badge {
    display: inline-block;
    padding: 0.15rem 0.55rem;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: rgba(123,205,171,0.15);
    color: #7bcdab;
    margin-left: 0.5rem;
  }
  .match-state-badge.halftime { background: rgba(251,239,138,0.15); color: #fbef8a; }
  .match-state-badge.fulltime { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.4); }

  .timeline-bar-outer {
    background: rgba(255,255,255,0.07);
    border-radius: 20px;
    height: 6px;
    position: relative;
    margin-bottom: 1.2rem;
  }
  .timeline-bar-inner {
    height: 100%;
    background: linear-gradient(90deg, #7bcdab, #fbef8a);
    border-radius: 20px;
    transition: width 0.5s;
  }
  .timeline-pip {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fbef8a;
    border: 2px solid #19191c;
  }

  .score-controls { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .goal-btn {
    flex: 1;
    padding: 0.6rem 0.5rem;
    border: none;
    border-radius: 7px;
    font-size: 0.9rem;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .goal-btn:active { transform: scale(0.96); }
  .goal-btn.home { background: #7bcdab; color: #19191c; }
  .goal-btn.away { background: #fbef8a; color: #19191c; }
  .goal-btn.ctrl { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); font-size: 0.8rem; }
  .goal-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .fans-counter {
    text-align: center;
    font-size: 0.82rem;
    color: rgba(255,255,255,0.4);
    margin-bottom: 0.7rem;
  }
  .fans-pulse {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #7bcdab;
    margin-right: 4px;
    vertical-align: middle;
    animation: none;
  }
  .fans-pulse.active { animation: pulseGlow 0.6s ease-out; }
  @keyframes pulseGlow {
    0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(123,205,171,0.8); }
    50%  { transform: scale(1.5); box-shadow: 0 0 0 8px rgba(123,205,171,0); }
    100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(123,205,171,0); }
  }

  .event-log {
    background: #111114;
    border-radius: 7px;
    padding: 0.8rem 1rem;
    max-height: 140px;
    overflow-y: auto;
    font-size: 0.78rem;
    color: rgba(255,255,255,0.5);
  }
  .event-log-entry { padding: 0.2rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .event-log-entry:last-child { border-bottom: none; }
  .ev-time { color: #fbef8a; font-weight: bold; margin-right: 0.5rem; }
  .ev-goal { color: #7bcdab; font-weight: bold; }
  .ev-card { color: #f9a87a; }
  .ev-sub  { color: rgba(255,255,255,0.55); }

  .delta-demo {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin: 1.2rem 0;
  }
  .delta-box {
    flex: 1 1 220px;
    background: #111114;
    border-radius: 8px;
    padding: 1rem 1.2rem;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .delta-box h5 { margin: 0 0 0.5rem 0; font-size: 0.85rem; }
  .delta-box .size-badge {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
    margin-top: 0.4rem;
  }
  .size-lg { background: rgba(249,168,122,0.2); color: #f9a87a; }
  .size-sm { background: rgba(123,205,171,0.2); color: #7bcdab; }
</style>

The interview question lands with deceptive simplicity: *design a live sports score app*. But hidden inside is one of the most demanding fan-out problems in web engineering. Fifty million people, all watching the same scoreboard, all expecting to see a goal appear within two seconds of the referee's whistle. Let's build it — layer by layer.

---

## 1. The Fan-Out Problem

{: class="marginalia" }
During the 2018 FIFA World Cup, Google reported that "World Cup" was searched 3.5 billion times over the tournament. The France vs Croatia final had tens of millions of concurrent score watchers — a load spike that would take down most architectures not specifically designed for it.

Every system design problem has a *core tension*. For live scores it is **fan-out**: one event (a goal is scored) must produce fifty million side-effects (screen updates) in under two seconds. The math alone is staggering. If you treat each notification as a separate unit of work, you are attempting to do 50,000,000 operations in 2,000 ms — or **25 million operations per second** just for one goal event.

No single machine does that. The architecture must distribute the fan-out across thousands of nodes, and the data model must be designed to keep each individual payload as tiny as possible.

The design decisions cascade: How do clients connect? How does the backend propagate the event? How does payload size scale with user count? We'll walk through six levels of increasing sophistication, then build a working demo that shows all the pieces together.

---

## 2. Level 1 — Naive Polling

The first instinct: have every browser call `/score?matchId=123` on a timer.

<pre class="code-block"><span class="cmt">// Client-side polling — the naive approach</span>
<span class="kw">function</span> <span class="fn">startPolling</span>(matchId) {
  <span class="fn">setInterval</span>(<span class="kw">async</span> () <span class="op">=></span> {
    <span class="kw">const</span> res <span class="op">=</span> <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">'/score?matchId='</span> <span class="op">+</span> matchId);
    <span class="kw">const</span> data <span class="op">=</span> <span class="kw">await</span> res.<span class="fn">json</span>();
    <span class="fn">updateScoreUI</span>(data);
  }, <span class="num">5000</span>); <span class="cmt">// every 5 seconds</span>
}
</pre>

Simple. Works. Terrible at scale.

- **50 M clients × 1 req / 5 s = 10 M requests/second** to your origin servers
- **~99.9% of those requests return "no change"** — pure wasted compute and bandwidth
- **Maximum latency: 5 seconds** (you just missed a goal update by 4.9 s)
- Each HTTP request carries full headers (~700 bytes), making even "empty" responses expensive

At 10 M req/s you need roughly 3,000 application servers just to accept connections (assuming ~3,000 RPS each). Your infrastructure bill is astronomical and your users still wait up to 5 seconds.

---

## 3. Level 2 — Conditional Polling (304 Not Modified)

Add a `lastUpdated` timestamp to every response. The client sends it back as `If-Modified-Since`. The server returns `304 Not Modified` with an empty body if nothing changed.

<pre class="code-block"><span class="cmt">// Conditional polling — saves bandwidth, not connections</span>
<span class="kw">let</span> lastUpdated <span class="op">=</span> <span class="kw">null</span>;

<span class="kw">function</span> <span class="fn">startConditionalPolling</span>(matchId) {
  <span class="fn">setInterval</span>(<span class="kw">async</span> () <span class="op">=></span> {
    <span class="kw">const</span> headers <span class="op">=</span> {};
    <span class="kw">if</span> (lastUpdated) {
      headers[<span class="str">'If-Modified-Since'</span>] <span class="op">=</span> lastUpdated;
    }

    <span class="kw">const</span> res <span class="op">=</span> <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">'/score?matchId='</span> <span class="op">+</span> matchId, { headers });

    <span class="kw">if</span> (res.status <span class="op">===</span> <span class="num">200</span>) {
      lastUpdated <span class="op">=</span> res.headers.<span class="fn">get</span>(<span class="str">'Last-Modified'</span>);
      <span class="kw">const</span> data <span class="op">=</span> <span class="kw">await</span> res.<span class="fn">json</span>();
      <span class="fn">updateScoreUI</span>(data);
    }
    <span class="cmt">// 304 response: body is empty, nothing to do</span>
  }, <span class="num">5000</span>);
}
</pre>

Better — but the improvement is only in *bytes transferred*, not in *connections made*. You still open 10 million TCP connections per second. Server CPU is dominated by accept/handshake overhead, not JSON serialisation. You haven't solved the fundamental problem.

---

## 4. Level 3 — Server-Sent Events (SSE)

{: class="marginalia" }
Server-Sent Events (SSE) was standardised in HTML5 (2009) but remained obscure for years. With HTTP/2 multiplexing, SSE became much more efficient — multiple SSE streams share one TCP connection. It's now the go-to choice for unidirectional real-time data: stock tickers, live feeds, sports scores.

The key insight: instead of the client *asking* repeatedly, flip the model — have the server *push* whenever something changes.

**SSE** (Server-Sent Events) is perfect here. The browser opens one long-lived HTTP connection. The server streams `data:` lines down it whenever it has something to say. When a goal is scored, one server-initiated push reaches the client instantly — no polling interval latency.

<pre class="code-block"><span class="cmt">// Server: Node.js SSE endpoint</span>
app.<span class="fn">get</span>(<span class="str">'/stream/score'</span>, (req, res) <span class="op">=></span> {
  <span class="kw">const</span> matchId <span class="op">=</span> req.query.matchId;

  res.<span class="fn">setHeader</span>(<span class="str">'Content-Type'</span>, <span class="str">'text/event-stream'</span>);
  res.<span class="fn">setHeader</span>(<span class="str">'Cache-Control'</span>, <span class="str">'no-cache'</span>);
  res.<span class="fn">setHeader</span>(<span class="str">'Connection'</span>, <span class="str">'keep-alive'</span>);
  res.<span class="fn">flushHeaders</span>();

  <span class="cmt">// Subscribe to score updates for this match</span>
  <span class="kw">const</span> onUpdate <span class="op">=</span> (payload) <span class="op">=></span> {
    res.<span class="fn">write</span>(<span class="str">'event: score\n'</span>);
    res.<span class="fn">write</span>(<span class="str">'data: '</span> <span class="op">+</span> <span class="fn">JSON.stringify</span>(payload) <span class="op">+</span> <span class="str">'\n\n'</span>);
  };

  scoreEmitter.<span class="fn">on</span>(<span class="str">'match:'</span> <span class="op">+</span> matchId, onUpdate);

  <span class="cmt">// Clean up when client disconnects</span>
  req.<span class="fn">on</span>(<span class="str">'close'</span>, () <span class="op">=></span> {
    scoreEmitter.<span class="fn">off</span>(<span class="str">'match:'</span> <span class="op">+</span> matchId, onUpdate);
  });
});
</pre>

<pre class="code-block"><span class="cmt">// Client: native EventSource API</span>
<span class="kw">const</span> es <span class="op">=</span> <span class="kw">new</span> <span class="fn">EventSource</span>(<span class="str">'/stream/score?matchId=123'</span>);

es.<span class="fn">addEventListener</span>(<span class="str">'score'</span>, (e) <span class="op">=></span> {
  <span class="kw">const</span> update <span class="op">=</span> <span class="fn">JSON.parse</span>(e.data);
  <span class="fn">applyDelta</span>(update);        <span class="cmt">// apply incremental update to local state</span>
});

es.<span class="fn">addEventListener</span>(<span class="str">'error'</span>, () <span class="op">=></span> {
  <span class="cmt">// EventSource reconnects automatically — built into the spec</span>
  console.<span class="fn">log</span>(<span class="str">'Reconnecting...'</span>);
});
</pre>

**Why SSE over WebSockets for this use case?**

Sports score updates are *unidirectional* — the server pushes, the client only consumes. WebSockets add bidirectional complexity (handshakes, framing, ping/pong, message type routing) that you simply don't need. SSE is a plain HTTP response — it works through proxies, CDNs, and load balancers without special configuration. The browser's `EventSource` API handles reconnection automatically, complete with `Last-Event-ID` header so you never miss an event across reconnects.

### Protocol Comparison

<div class="protocol-compare-wrap">
<h4>SSE vs WebSocket vs Polling — 30-Minute Match Simulation</h4>
<div class="proto-panels">
  <div class="proto-panel" id="panelPolling">
    <h5>Polling (5s)</h5>
    <div class="proto-vis">
      <div class="proto-arrow" id="arrowPolling" style="left:10px;">⬆️</div>
    </div>
    <div class="proto-stat">Total requests</div>
    <div class="proto-val" id="reqPolling">0</div>
    <div class="proto-stat">Data transferred</div>
    <div class="proto-val" id="dataPolling">0 KB</div>
    <div class="proto-stat">Max goal latency</div>
    <div class="proto-val" style="color:#f9a87a;">5,000 ms</div>
  </div>
  <div class="proto-panel" id="panelSSE">
    <h5>Server-Sent Events</h5>
    <div class="proto-vis">
      <div class="proto-arrow" id="arrowSSE" style="left:50%;transform:translateX(-50%) translateY(-50%);top:50%;">⬇️</div>
    </div>
    <div class="proto-stat">Total requests</div>
    <div class="proto-val" id="reqSSE">1</div>
    <div class="proto-stat">Data transferred</div>
    <div class="proto-val" id="dataSSE">0 KB</div>
    <div class="proto-stat">Max goal latency</div>
    <div class="proto-val" style="color:#7bcdab;">~50 ms</div>
  </div>
  <div class="proto-panel" id="panelWS">
    <h5>WebSocket</h5>
    <div class="proto-vis">
      <div class="proto-arrow" id="arrowWS" style="left:50%;transform:translateX(-50%) translateY(-50%);top:50%;">↕️</div>
    </div>
    <div class="proto-stat">Total requests</div>
    <div class="proto-val" id="reqWS">1</div>
    <div class="proto-stat">Data transferred</div>
    <div class="proto-val" id="dataWS">0 KB</div>
    <div class="proto-stat">Max goal latency</div>
    <div class="proto-val" style="color:#7bcdab;">~50 ms</div>
  </div>
</div>
<div class="sim-controls">
  <button class="sim-btn" id="simRunBtn" onclick="runProtocolSim()">▶ Run 30-min Simulation</button>
  <button class="sim-btn" id="simResetBtn" onclick="resetProtocolSim()" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);">Reset</button>
</div>
<div class="sim-log" id="simLog">Press Run to start the simulation</div>
</div>

<script>
(function() {
  var simTimer = null;
  var simTick = 0;
  var simGoals = [12, 23, 67, 78]; // minute indices (0-359 ticks of 5s each = 30 min)
  var goalTicks = simGoals.map(function(m) { return Math.floor(m * 60 / 5); });
  var pollingReqs = 0, pollingData = 0;
  var sseData = 0;
  var wsData = 0;
  var totalTicks = 360; // 30 min at 1 tick/5s

  window.resetProtocolSim = function() {
    if (simTimer) clearInterval(simTimer);
    simTimer = null;
    simTick = 0;
    pollingReqs = 0; pollingData = 0; sseData = 0; wsData = 0;
    document.getElementById('reqPolling').textContent = '0';
    document.getElementById('dataPolling').textContent = '0 KB';
    document.getElementById('reqSSE').textContent = '1';
    document.getElementById('dataSSE').textContent = '0 KB';
    document.getElementById('reqWS').textContent = '1';
    document.getElementById('dataWS').textContent = '0 KB';
    document.getElementById('simLog').textContent = 'Press Run to start the simulation';
    document.getElementById('simRunBtn').disabled = false;
    ['arrowPolling','arrowSSE','arrowWS'].forEach(function(id) {
      document.getElementById(id).style.opacity = '0';
    });
  };

  window.runProtocolSim = function() {
    document.getElementById('simRunBtn').disabled = true;
    var TICK_MS = 80; // compressed: 80ms per 5s real-time tick
    simTimer = setInterval(function() {
      simTick++;
      var isGoalTick = goalTicks.indexOf(simTick) !== -1;

      // Polling: every tick = 1 request, ~700B headers + maybe 200B body
      pollingReqs++;
      pollingData += isGoalTick ? 900 : 700; // bytes

      // SSE: only push on goal ticks (50B delta) + heartbeat every 30s (12 ticks) = 10B
      if (isGoalTick) { sseData += 50; }
      else if (simTick % 6 === 0) { sseData += 10; } // heartbeat

      // WS: similar to SSE but with 2B framing overhead per message
      if (isGoalTick) { wsData += 52; }
      else if (simTick % 6 === 0) { wsData += 12; }

      // Update display
      document.getElementById('reqPolling').textContent = pollingReqs.toLocaleString();
      document.getElementById('dataPolling').textContent = (pollingData / 1024).toFixed(1) + ' KB';
      document.getElementById('dataSSE').textContent = (sseData / 1024).toFixed(2) + ' KB';
      document.getElementById('dataWS').textContent = (wsData / 1024).toFixed(2) + ' KB';

      if (isGoalTick) {
        var minute = Math.round(simTick * 5 / 60);
        document.getElementById('simLog').textContent = 'GOAL at ' + minute + ' min! SSE/WS pushed instantly. Polling waits up to 5s.';
        ['arrowPolling','arrowSSE','arrowWS'].forEach(function(id) {
          var el = document.getElementById(id);
          el.style.opacity = '1';
          setTimeout(function() { el.style.opacity = '0'; }, 600);
        });
      } else {
        var pct = Math.round(simTick / totalTicks * 100);
        document.getElementById('simLog').textContent = 'Simulating... ' + pct + '% — ' + Math.round(simTick * 5 / 60) + ' min elapsed';
      }

      if (simTick >= totalTicks) {
        clearInterval(simTimer);
        document.getElementById('simLog').textContent =
          'Done! Polling: ' + pollingReqs + ' requests, ' + (pollingData/1024).toFixed(1) + ' KB. ' +
          'SSE: 1 connection, ' + (sseData/1024).toFixed(2) + ' KB. ' +
          'WS: 1 connection, ' + (wsData/1024).toFixed(2) + ' KB.';
      }
    }, TICK_MS);
  };
})();
</script>

---

## 5. Level 4 — Redis Pub/Sub Fan-Out

A single Node.js process can hold ~50,000 concurrent SSE connections comfortably (it's all I/O, no CPU). For 50 million users, that means you need **1,000 SSE servers**. But now there is a coordination problem: when a goal is scored, how does every one of those 1,000 servers know to push to its clients?

**Redis Pub/Sub** solves this cleanly.

<pre class="code-block"><span class="cmt">// Score Ingestion Service — publishes to Redis</span>
<span class="kw">const</span> redis <span class="op">=</span> <span class="kw">require</span>(<span class="str">'ioredis'</span>);
<span class="kw">const</span> pub <span class="op">=</span> <span class="kw">new</span> <span class="fn">redis</span>();

<span class="kw">async function</span> <span class="fn">publishGoal</span>(matchId, goalEvent) {
  <span class="kw">const</span> payload <span class="op">=</span> <span class="fn">JSON.stringify</span>({
    type: <span class="str">'GOAL'</span>,
    matchId,
    team: goalEvent.team,
    minute: goalEvent.minute,
    scorer: goalEvent.scorer,
    newScore: goalEvent.newScore,
    ts: <span class="fn">Date.now</span>()
  });

  <span class="cmt">// Single publish → all 1,000 subscribers receive it</span>
  <span class="kw">await</span> pub.<span class="fn">publish</span>(<span class="str">'match:'</span> <span class="op">+</span> matchId <span class="op">+</span> <span class="str">':score'</span>, payload);
}
</pre>

<pre class="code-block"><span class="cmt">// SSE Server — subscribes and pushes to clients</span>
<span class="kw">const</span> sub <span class="op">=</span> <span class="kw">new</span> <span class="fn">redis</span>();
<span class="kw">const</span> clients <span class="op">=</span> <span class="kw">new</span> <span class="fn">Map</span>(); <span class="cmt">// matchId → Set of response objects</span>

sub.<span class="fn">on</span>(<span class="str">'message'</span>, (channel, message) <span class="op">=></span> {
  <span class="cmt">// channel = "match:123:score", message = JSON delta string</span>
  <span class="kw">const</span> matchId <span class="op">=</span> channel.<span class="fn">split</span>(<span class="str">':'</span>)[<span class="num">1</span>];
  <span class="kw">const</span> matchClients <span class="op">=</span> clients.<span class="fn">get</span>(matchId);
  <span class="kw">if</span> (!matchClients) <span class="kw">return</span>;

  <span class="kw">const</span> frame <span class="op">=</span> <span class="str">'event: score\ndata: '</span> <span class="op">+</span> message <span class="op">+</span> <span class="str">'\n\n'</span>;

  matchClients.<span class="fn">forEach</span>((res) <span class="op">=></span> {
    <span class="kw">try</span> { res.<span class="fn">write</span>(frame); }
    <span class="kw">catch</span> (e) { matchClients.<span class="fn">delete</span>(res); }
  });
});

<span class="cmt">// Subscribe when first client joins a match</span>
<span class="kw">function</span> <span class="fn">ensureSubscribed</span>(matchId) {
  <span class="kw">if</span> (!clients.<span class="fn">has</span>(matchId)) {
    clients.<span class="fn">set</span>(matchId, <span class="kw">new</span> <span class="fn">Set</span>());
    sub.<span class="fn">subscribe</span>(<span class="str">'match:'</span> <span class="op">+</span> matchId <span class="op">+</span> <span class="str">':score'</span>);
  }
}
</pre>

**The fan-out math now:**

1. **1 Redis PUBLISH** to `match:123:score`
2. **1,000 SSE servers** each receive the message via their Redis subscription (network hop: ~1 ms)
3. **Each server pushes to ~50,000 clients** (I/O loop: ~5–20 ms)
4. **Total: 50 million clients notified in under 100 ms** in practice

The key is that Redis broadcasts to all subscribers in one atomic operation. There is no loop in your application code over 1,000 servers — Redis handles that fan-out tier.

---

## 6. Level 5 — Tiered Fan-Out for Mega Events

{: class="marginalia" }
The latency problem for live sports scores has an amusing human dimension: TV broadcast delay is typically 5–8 seconds. This means if you have a score alert on your phone AND are watching TV, you will see the goal on your phone *before* you see it on screen. Broadcasters have tried to compensate by deliberately delaying digital score alerts to match TV lag — a surreal engineering requirement.

At true World Cup scale, even Redis pub/sub can become a bottleneck. A single Redis node receiving millions of concurrent subscriptions and processing thousands of publishes per second hits CPU and memory ceilings. The answer is **tiered fan-out** — move from a flat architecture to a tree.

The tiers:

- **Tier 0 — Score source:** Data vendor (Sportradar, Opta) sends a single event to your ingestion service
- **Tier 1 — Kafka:** Score Ingestion Service writes to a Kafka topic `match-scores`. Kafka gives you durability, replay, and decoupling
- **Tier 2 — Fan-out workers:** 10 consumers read from Kafka. Each manages a *shard* of SSE servers — e.g., Worker 0 owns SSE servers 0–99, Worker 1 owns 100–199, etc.
- **Tier 3 — Regional Redis:** Each fan-out worker publishes to a *regional* Redis cluster (US-East, EU-West, APAC). SSE servers in that region subscribe locally
- **Tier 4 — SSE servers:** Each SSE server holds 50k connections; on Redis message, pushes to all local clients

<pre class="code-block"><span class="cmt">// Kafka consumer — Fan-out Worker</span>
<span class="kw">const</span> { Kafka } <span class="op">=</span> <span class="kw">require</span>(<span class="str">'kafkajs'</span>);
<span class="kw">const</span> kafka <span class="op">=</span> <span class="kw">new</span> <span class="fn">Kafka</span>({ brokers: [<span class="str">'kafka:9092'</span>] });

<span class="kw">const</span> consumer <span class="op">=</span> kafka.<span class="fn">consumer</span>({ groupId: <span class="str">'fanout-workers'</span> });

<span class="kw">await</span> consumer.<span class="fn">connect</span>();
<span class="kw">await</span> consumer.<span class="fn">subscribe</span>({ topic: <span class="str">'match-scores'</span> });

<span class="kw">await</span> consumer.<span class="fn">run</span>({
  <span class="fn">eachMessage</span>: <span class="kw">async</span> ({ message }) <span class="op">=></span> {
    <span class="kw">const</span> event <span class="op">=</span> <span class="fn">JSON.parse</span>(message.value.<span class="fn">toString</span>());
    <span class="kw">const</span> region <span class="op">=</span> <span class="fn">getRegionForEvent</span>(event);
    <span class="kw">const</span> regionalRedis <span class="op">=</span> redisClients[region];

    <span class="cmt">// Fan out to regional Redis — local SSE servers pick it up</span>
    <span class="kw">await</span> regionalRedis.<span class="fn">publish</span>(
      <span class="str">'match:'</span> <span class="op">+</span> event.matchId <span class="op">+</span> <span class="str">':score'</span>,
      <span class="fn">JSON.stringify</span>(event)
    );
  }
});
</pre>

This architecture keeps each component at a manageable scale:

| Component | Count | Load per unit |
|---|---|---|
| Score ingestion | 1 | Trivial |
| Kafka brokers | 3–5 | ~50 events/sec (all matches) |
| Fan-out workers | 10 | 5 events/sec each |
| Regional Redis | 3 | ~100 subscribing SSE servers |
| SSE servers | 1,000 | 50k connections, ~5 pushes/min |

### Fan-Out Propagation Visualiser

<div class="fanout-wrap">
<h4>Tiered Fan-Out — Goal Event Propagation</h4>
<canvas id="fanoutCanvas" width="700" height="340"></canvas>
<div class="sim-controls">
  <button class="sim-btn" id="fanoutBtn" onclick="triggerFanout()">⚽ Score Goal</button>
  <button class="sim-btn" onclick="resetFanout()" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);">Reset</button>
  <span id="fanoutCounter" style="font-size:0.85rem;color:#7bcdab;margin-left:0.5rem;"></span>
</div>
</div>

<script>
(function() {
  var canvas = document.getElementById('fanoutCanvas');
  var ctx = canvas.getContext('2d');
  var W = 700, H = 340;
  canvas.width = W; canvas.height = H;

  var nodes = {
    source:  { x: 350, y: 28,  label: 'Score Source', color: '#fbef8a', lit: false },
    kafka:   { x: 350, y: 90,  label: 'Kafka', color: '#f9a87a', lit: false },
    fw: [
      { x: 140, y: 165, label: 'Worker A', color: '#7bcdab', lit: false },
      { x: 350, y: 165, label: 'Worker B', color: '#7bcdab', lit: false },
      { x: 560, y: 165, label: 'Worker C', color: '#7bcdab', lit: false }
    ],
    sse: [
      { x: 70,  y: 265, label: 'SSE', color: '#c3a6ff', lit: false },
      { x: 140, y: 265, label: 'SSE', color: '#c3a6ff', lit: false },
      { x: 210, y: 265, label: 'SSE', color: '#c3a6ff', lit: false },
      { x: 280, y: 265, label: 'SSE', color: '#c3a6ff', lit: false },
      { x: 350, y: 265, label: 'SSE', color: '#c3a6ff', lit: false },
      { x: 420, y: 265, label: 'SSE', color: '#c3a6ff', lit: false },
      { x: 490, y: 265, label: 'SSE', color: '#c3a6ff', lit: false },
      { x: 560, y: 265, label: 'SSE', color: '#c3a6ff', lit: false },
      { x: 630, y: 265, label: 'SSE', color: '#c3a6ff', lit: false }
    ]
  };

  var particles = [];
  var clientCount = 0;

  function drawNode(n, r, labelBelow) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = n.lit ? n.color : 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = n.lit ? n.color : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = n.lit ? '#19191c' : 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(n.label, n.x, n.y + (r > 14 ? 3.5 : 3));
    if (labelBelow && n.lit) {
      ctx.fillStyle = n.color;
      ctx.font = '7px sans-serif';
      ctx.fillText('50k clients', n.x, n.y + r + 10);
    }
  }

  function drawEdge(a, b, alpha) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(123,205,171,' + alpha + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawScene() {
    ctx.clearRect(0, 0, W, H);

    // Edges
    nodes.fw.forEach(function(fw) { drawEdge(nodes.kafka, fw, 0.15); });
    nodes.fw.forEach(function(fw, fi) {
      for (var i = 0; i < 3; i++) {
        drawEdge(fw, nodes.sse[fi * 3 + i], 0.1);
      }
    });
    drawEdge(nodes.source, nodes.kafka, 0.15);

    // Nodes
    drawNode(nodes.source, 18, false);
    drawNode(nodes.kafka, 16, false);
    nodes.fw.forEach(function(fw) { drawNode(fw, 15, false); });
    nodes.sse.forEach(function(s) { drawNode(s, 12, true); });

    // Particles
    particles.forEach(function(p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251,239,138,' + p.alpha + ')';
      ctx.fill();
    });

    // Client counter
    if (clientCount > 0) {
      ctx.fillStyle = '#7bcdab';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(clientCount.toLocaleString() + ' fans notified', W / 2, H - 12);
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function addParticle(from, to, onArrive) {
    particles.push({ x: from.x, y: from.y, tx: to.x, ty: to.y, t: 0, alpha: 1, onArrive: onArrive });
  }

  var animFrame = null;
  function animate() {
    var done = true;
    particles.forEach(function(p) {
      p.t = Math.min(1, p.t + 0.045);
      p.x = lerp(p.x - 0, p.tx, p.t);
      p.y = lerp(p.y - 0, p.ty, p.t);
      if (p.t < 1) done = false;
      if (p.t >= 1 && !p.arrived) {
        p.arrived = true;
        if (p.onArrive) p.onArrive();
      }
    });
    particles = particles.filter(function(p) { return p.t < 1 || !p.arrived; });
    drawScene();
    if (!done || particles.length > 0) {
      animFrame = requestAnimationFrame(animate);
    } else {
      drawScene();
    }
  }

  window.resetFanout = function() {
    if (animFrame) cancelAnimationFrame(animFrame);
    particles = [];
    clientCount = 0;
    nodes.source.lit = false;
    nodes.kafka.lit = false;
    nodes.fw.forEach(function(n) { n.lit = false; });
    nodes.sse.forEach(function(n) { n.lit = false; });
    document.getElementById('fanoutCounter').textContent = '';
    drawScene();
  };

  window.triggerFanout = function() {
    resetFanout();
    nodes.source.lit = true;
    drawScene();

    setTimeout(function() {
      addParticle(nodes.source, nodes.kafka, function() {
        nodes.kafka.lit = true;
        nodes.fw.forEach(function(fw) {
          addParticle(nodes.kafka, fw, function() {
            fw.lit = true;
            var fwIdx = nodes.fw.indexOf(fw);
            for (var i = 0; i < 3; i++) {
              (function(sseNode) {
                addParticle(fw, sseNode, function() {
                  sseNode.lit = true;
                  clientCount += 5555556;
                  document.getElementById('fanoutCounter').textContent =
                    (clientCount >= 50000000 ? '50,000,000' : clientCount.toLocaleString()) + ' fans notified';
                });
              })(nodes.sse[fwIdx * 3 + i]);
            }
          });
        });
      });
      if (!animFrame) animate();
    }, 150);
  };

  drawScene();
})();
</script>

---

## 7. Level 6 — Delta Compression and Efficient Payloads

A critical multiplier in any fan-out system is **payload size**. Let's compare two approaches to the score update message.

<div class="delta-demo">
<div class="delta-box">
<h5 style="color:#f9a87a;">Full State Snapshot</h5>
<pre class="code-block" style="font-size:0.72rem;margin:0.4rem 0;padding:0.7rem 0.9rem;">{
  <span class="str">"matchId"</span>: <span class="str">"wc2026_final"</span>,
  <span class="str">"homeTeam"</span>: { <span class="str">"name"</span>: <span class="str">"Brazil"</span>, <span class="str">"code"</span>: <span class="str">"BRA"</span> },
  <span class="str">"awayTeam"</span>: { <span class="str">"name"</span>: <span class="str">"France"</span>, <span class="str">"code"</span>: <span class="str">"FRA"</span> },
  <span class="str">"score"</span>: { <span class="str">"home"</span>: <span class="num">1</span>, <span class="str">"away"</span>: <span class="num">0</span> },
  <span class="str">"minute"</span>: <span class="num">67</span>,
  <span class="str">"status"</span>: <span class="str">"LIVE"</span>,
  <span class="str">"events"</span>: [
    { <span class="str">"type"</span>: <span class="str">"GOAL"</span>, <span class="str">"minute"</span>: <span class="num">67</span>,
      <span class="str">"team"</span>: <span class="str">"home"</span>, <span class="str">"player"</span>: <span class="str">"Vinicius Jr"</span> }
    <span class="cmt">// ... all previous events ...</span>
  ],
  <span class="str">"lineups"</span>: { <span class="cmt">/* 22 players ... */</span> },
  <span class="str">"stats"</span>: { <span class="cmt">/* shots, possession ... */</span> }
}</pre>
<span class="size-badge size-lg">~5,000 bytes per update</span>
<div style="margin-top:0.5rem;font-size:0.75rem;color:rgba(255,255,255,0.4);">50M clients × 5 KB = <span style="color:#f9a87a;font-weight:bold;">250 GB</span> per goal</div>
</div>
<div class="delta-box">
<h5 style="color:#7bcdab;">Delta Update</h5>
<pre class="code-block" style="font-size:0.72rem;margin:0.4rem 0;padding:0.7rem 0.9rem;">{
  <span class="str">"matchId"</span>: <span class="str">"wc2026_final"</span>,
  <span class="str">"type"</span>: <span class="str">"GOAL"</span>,
  <span class="str">"team"</span>: <span class="str">"home"</span>,
  <span class="str">"minute"</span>: <span class="num">67</span>,
  <span class="str">"scorer"</span>: <span class="str">"Vinicius Jr"</span>,
  <span class="str">"score"</span>: { <span class="str">"home"</span>: <span class="num">1</span>, <span class="str">"away"</span>: <span class="num">0</span> },
  <span class="str">"ts"</span>: <span class="num">1749549600000</span>
}</pre>
<span class="size-badge size-sm">~120 bytes per update</span>
<div style="margin-top:0.5rem;font-size:0.75rem;color:rgba(255,255,255,0.4);">50M clients × 120 B = <span style="color:#7bcdab;font-weight:bold;">6 GB</span> per goal</div>
</div>
</div>

**The strategy:** clients maintain local match state. The server only sends *what changed*. On initial page load, the client fetches a full snapshot (`GET /api/match/wc2026_final/state`), then subscribes to the SSE stream for incremental deltas.

On reconnect, the `EventSource` API automatically sends `Last-Event-ID` (you set this via SSE's `id:` field). Your server can fast-replay any missed events since that ID from a short-lived Redis stream or Postgres events table.

<pre class="code-block"><span class="cmt">// Client: maintain local state, apply deltas</span>
<span class="kw">let</span> matchState <span class="op">=</span> <span class="kw">null</span>;

<span class="kw">async function</span> <span class="fn">initMatch</span>(matchId) {
  <span class="cmt">// 1. Fetch full snapshot once</span>
  <span class="kw">const</span> res <span class="op">=</span> <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">'/api/match/'</span> <span class="op">+</span> matchId <span class="op">+</span> <span class="str">'/state'</span>);
  matchState <span class="op">=</span> <span class="kw">await</span> res.<span class="fn">json</span>();
  <span class="fn">renderMatch</span>(matchState);

  <span class="cmt">// 2. Subscribe to deltas</span>
  <span class="kw">const</span> es <span class="op">=</span> <span class="kw">new</span> <span class="fn">EventSource</span>(<span class="str">'/stream/'</span> <span class="op">+</span> matchId);
  es.<span class="fn">addEventListener</span>(<span class="str">'score'</span>, (e) <span class="op">=></span> {
    <span class="kw">const</span> delta <span class="op">=</span> <span class="fn">JSON.parse</span>(e.data);
    matchState <span class="op">=</span> <span class="fn">applyDelta</span>(matchState, delta);
    <span class="fn">renderMatch</span>(matchState);
  });
}

<span class="kw">function</span> <span class="fn">applyDelta</span>(state, delta) {
  <span class="kw">switch</span> (delta.type) {
    <span class="kw">case</span> <span class="str">'GOAL'</span>:
      state.score[delta.team]<span class="op">++</span>;
      state.events.<span class="fn">push</span>(delta);
      <span class="kw">break</span>;
    <span class="kw">case</span> <span class="str">'YELLOW_CARD'</span>:
    <span class="kw">case</span> <span class="str">'RED_CARD'</span>:
    <span class="kw">case</span> <span class="str">'SUBSTITUTION'</span>:
      state.events.<span class="fn">push</span>(delta);
      <span class="kw">break</span>;
    <span class="kw">case</span> <span class="str">'STATUS_CHANGE'</span>:
      state.status <span class="op">=</span> delta.status;
      <span class="kw">break</span>;
  }
  <span class="kw">return</span> state;
}
</pre>

---

## 8. The Score Widget on Google

When you search "World Cup final score" on Google, the result appears *inline* — no page navigation, no separate API call, score updating in real time. How?

Google owns the whole stack, so they optimise at every layer:

1. **Server-side render the initial score** directly into the search result HTML. The score you see when the page loads costs zero additional requests — it's baked into the HTML by the time the CDN serves it.

2. **Distributed score cache (Spanner/Bigtable):** Google ingests data vendor feeds (or scrapes official sources) and stores match state in a globally replicated cache. Every datacenter has a local copy that's < 1 second stale.

3. **Inline SSE from the same domain:** The score widget opens an SSE connection back to Google's servers. Because Google controls their own CDN (Edgenetwork), the SSE termination can happen at the nearest Google PoP — often < 30 ms away from the user.

4. **No cross-origin overhead:** Same-origin SSE streams don't need CORS preflight. The EventSource connection is immediate.

5. **Graceful degradation:** If the SSE connection fails or the user has a slow connection, the last server-rendered score is still correct and visible. The widget doesn't blank out.

---

## 9. Interactive Live Score Demo

<div class="score-demo-wrap">
<h4>⚽ Live Match — FIFA World Cup 2026 Final</h4>

<div class="match-meta">
  <span id="matchStatus" class="match-state-badge">Live</span>
  <span class="match-clock" id="matchClock">00:00</span>
</div>

<div class="score-board">
  <div class="team-block">
    <div class="team-name">Brazil</div>
    <div class="team-score" id="homeScore">0</div>
  </div>
  <div class="score-sep">—</div>
  <div class="team-block">
    <div class="team-name">France</div>
    <div class="team-score" id="awayScore">0</div>
  </div>
</div>

<div class="timeline-bar-outer">
  <div class="timeline-bar-inner" id="timelineBar" style="width:0%"></div>
  <div class="timeline-pip" id="timelinePip" style="left:0%"></div>
</div>

<div class="fans-counter">
  <span class="fans-pulse" id="fansPulse"></span>
  <span id="fansCounter">1,000 fans connected</span>
</div>

<div class="score-controls">
  <button class="goal-btn home" id="btnHome" onclick="scoreGoal('home')">⚽ Brazil Goal</button>
  <button class="goal-btn away" id="btnAway" onclick="scoreGoal('away')">⚽ France Goal</button>
  <button class="goal-btn ctrl" id="btnHalf" onclick="setMatchState('halftime')">Half Time</button>
  <button class="goal-btn ctrl" id="btnFull" onclick="setMatchState('fulltime')">Full Time</button>
  <button class="goal-btn ctrl" id="btnReset" onclick="resetMatch()">Reset</button>
</div>

<div class="event-log" id="eventLog">
  <div class="event-log-entry" style="color:rgba(255,255,255,0.3);font-style:italic;">Match events will appear here...</div>
</div>
</div>

<script>
(function() {
  var homeGoals = 0, awayGoals = 0;
  var matchMinute = 0;
  var matchRunning = true;
  var clockInterval = null;
  var goalPlayers = {
    home: ['Vinicius Jr', 'Rodrygo', 'Endrick', 'Raphinha', 'Paquetá'],
    away: ['Mbappé', 'Dembélé', 'Griezmann', 'Thuram', 'Camavinga']
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function startClock() {
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(function() {
      if (!matchRunning) return;
      matchMinute = Math.min(matchMinute + 1, 90);
      document.getElementById('matchClock').textContent = pad(matchMinute) + ':00';
      var pct = (matchMinute / 90) * 100;
      document.getElementById('timelineBar').style.width = pct + '%';
      document.getElementById('timelinePip').style.left = pct + '%';
      if (matchMinute >= 90) {
        matchRunning = false;
        clearInterval(clockInterval);
      }
    }, 800);
  }

  function addEvent(html) {
    var log = document.getElementById('eventLog');
    var first = log.querySelector('.event-log-entry');
    if (first && first.style.fontStyle === 'italic') log.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'event-log-entry';
    div.innerHTML = html;
    log.insertBefore(div, log.firstChild);
  }

  function pulseScore(side) {
    var el = document.getElementById(side === 'home' ? 'homeScore' : 'awayScore');
    el.classList.add('scored');
    setTimeout(function() { el.classList.remove('scored'); }, 500);
  }

  function pulseFans() {
    var el = document.getElementById('fansPulse');
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
    setTimeout(function() { el.classList.remove('active'); }, 700);
  }

  window.scoreGoal = function(team) {
    if (!matchRunning && matchMinute >= 90) return;
    if (team === 'home') {
      homeGoals++;
      document.getElementById('homeScore').textContent = homeGoals;
    } else {
      awayGoals++;
      document.getElementById('awayScore').textContent = awayGoals;
    }
    pulseScore(team);
    pulseFans();
    var players = goalPlayers[team];
    var scorer = players[Math.floor(Math.random() * players.length)];
    var teamName = team === 'home' ? 'Brazil' : 'France';
    addEvent(
      '<span class="ev-time">' + pad(matchMinute) + '\''  + '</span>' +
      '<span class="ev-goal">⚽ GOAL! ' + scorer + ' (' + teamName + ')</span>' +
      ' — Score: ' + homeGoals + '–' + awayGoals
    );
    document.getElementById('fansCounter').textContent = '1,000 fans notified in ~50ms';
    setTimeout(function() {
      document.getElementById('fansCounter').textContent = '1,000 fans connected';
    }, 2000);
  };

  window.setMatchState = function(state) {
    matchRunning = false;
    if (clockInterval) clearInterval(clockInterval);
    if (state === 'halftime') {
      matchMinute = 45;
      document.getElementById('matchClock').textContent = '45:00';
      document.getElementById('timelineBar').style.width = '50%';
      document.getElementById('timelinePip').style.left = '50%';
      var badge = document.getElementById('matchStatus');
      badge.textContent = 'Half Time';
      badge.className = 'match-state-badge halftime';
      addEvent('<span class="ev-time">45\'</span><span class="ev-sub">— Half Time —</span>');
    } else {
      matchMinute = 90;
      document.getElementById('matchClock').textContent = '90:00';
      document.getElementById('timelineBar').style.width = '100%';
      document.getElementById('timelinePip').style.left = '100%';
      var badge2 = document.getElementById('matchStatus');
      badge2.textContent = 'Full Time';
      badge2.className = 'match-state-badge fulltime';
      addEvent(
        '<span class="ev-time">90\'</span><span class="ev-sub">— Full Time — Final: ' +
        homeGoals + '–' + awayGoals + ' —</span>'
      );
      document.getElementById('btnHome').disabled = true;
      document.getElementById('btnAway').disabled = true;
    }
  };

  window.resetMatch = function() {
    homeGoals = 0; awayGoals = 0; matchMinute = 0; matchRunning = true;
    document.getElementById('homeScore').textContent = '0';
    document.getElementById('awayScore').textContent = '0';
    document.getElementById('matchClock').textContent = '00:00';
    document.getElementById('timelineBar').style.width = '0%';
    document.getElementById('timelinePip').style.left = '0%';
    var badge3 = document.getElementById('matchStatus');
    badge3.textContent = 'Live';
    badge3.className = 'match-state-badge';
    document.getElementById('btnHome').disabled = false;
    document.getElementById('btnAway').disabled = false;
    document.getElementById('eventLog').innerHTML =
      '<div class="event-log-entry" style="color:rgba(255,255,255,0.3);font-style:italic;">Match events will appear here...</div>';
    document.getElementById('fansCounter').textContent = '1,000 fans connected';
    startClock();
  };

  startClock();
})();
</script>

---

## 10. Failure Modes and Resilience

The happy path is straightforward. The interesting engineering is in the failure modes.

**SSE server crash:** Clients automatically reconnect (EventSource handles this). They send `Last-Event-ID`. Your server replays any missed events from a Redis Stream (`XRANGE match:123:events lastId + COUNT 100`). The client is never stale for more than the reconnect interval (~3 seconds).

<pre class="code-block"><span class="cmt">// Redis Stream for event replay (server-side)</span>
<span class="kw">async function</span> <span class="fn">replayMissedEvents</span>(matchId, lastEventId, res) {
  <span class="kw">const</span> missed <span class="op">=</span> <span class="kw">await</span> redis.<span class="fn">xrange</span>(
    <span class="str">'match:'</span> <span class="op">+</span> matchId <span class="op">+</span> <span class="str">':events'</span>,
    lastEventId <span class="op">||</span> <span class="str">'-'</span>,
    <span class="str">'+'</span>,
    <span class="str">'COUNT'</span>, <span class="num">100</span>
  );
  missed.<span class="fn">forEach</span>(([id, fields]) <span class="op">=></span> {
    res.<span class="fn">write</span>(<span class="str">'id: '</span> <span class="op">+</span> id <span class="op">+</span> <span class="str">'\n'</span>);
    res.<span class="fn">write</span>(<span class="str">'event: score\n'</span>);
    res.<span class="fn">write</span>(<span class="str">'data: '</span> <span class="op">+</span> fields[<span class="num">1</span>] <span class="op">+</span> <span class="str">'\n\n'</span>);
  });
}
</pre>

**Redis pub/sub node failure:** Use Redis Sentinel or Redis Cluster. SSE servers reconnect to the replica that was just promoted. The fan-out gap during failover (~1–5 s) is covered by the client replaying from the Redis Stream when it reconnects.

**Data vendor outage:** The Score Ingestion Service should have a dead-letter queue in Kafka. When the vendor recovers, events replay in order. The Kafka consumer group offset ensures no event is processed twice.

**Thundering herd on reconnect:** After a major outage, all 50 million SSE clients reconnect simultaneously. Add jitter to the EventSource retry:

<pre class="code-block"><span class="cmt">// Prevent thundering herd on reconnect</span>
<span class="kw">function</span> <span class="fn">createSSEWithJitter</span>(matchId) {
  <span class="kw">function</span> <span class="fn">connect</span>() {
    <span class="kw">const</span> es <span class="op">=</span> <span class="kw">new</span> <span class="fn">EventSource</span>(<span class="str">'/stream/'</span> <span class="op">+</span> matchId);

    es.<span class="fn">addEventListener</span>(<span class="str">'error'</span>, () <span class="op">=></span> {
      es.<span class="fn">close</span>();
      <span class="cmt">// Jitter: 1–5 seconds random delay before reconnect</span>
      <span class="kw">const</span> delay <span class="op">=</span> <span class="num">1000</span> <span class="op">+</span> <span class="fn">Math.random</span>() <span class="op">*</span> <span class="num">4000</span>;
      <span class="fn">setTimeout</span>(connect, delay);
    });

    <span class="kw">return</span> es;
  }
  <span class="kw">return</span> <span class="fn">connect</span>();
}
</pre>

---

## 11. Capacity Estimate

<div class="capacity-table-wrap">
<table>
<thead><tr><th>Metric</th><th>Number</th></tr></thead>
<tbody>
<tr><td>Concurrent users (World Cup final)</td><td>50,000,000</td></tr>
<tr><td>SSE servers needed</td><td>1,000 (50k connections each)</td></tr>
<tr><td>Connections per SSE server</td><td>50,000</td></tr>
<tr><td>Score updates per 90-min match</td><td>~50 (goals, cards, substitutions)</td></tr>
<tr><td>Fan-out latency target</td><td>&lt; 2 seconds end-to-end</td></tr>
<tr><td>Typical achieved latency</td><td>50–200 ms</td></tr>
<tr><td>Payload size (delta)</td><td>~120 bytes</td></tr>
<tr><td>Bandwidth per goal event (50M × 120B)</td><td>~6 GB</td></tr>
<tr><td>Redis pub/sub messages per event</td><td>1 → 1,000 servers</td></tr>
<tr><td>Kafka partitions (match-scores topic)</td><td>20 (1 per fan-out worker pair)</td></tr>
<tr><td>Regional Redis clusters</td><td>3 (US-East, EU-West, APAC)</td></tr>
<tr><td>Memory per SSE connection (Node.js)</td><td>~10 KB</td></tr>
<tr><td>Total SSE server memory (50k × 10 KB)</td><td>~500 MB per server</td></tr>
</tbody>
</table>
</div>

---

## 12. Summary Architecture Diagram

<pre class="code-block"><span class="cmt">
  ┌─────────────────────────────────────────────────────────────────┐
  │                    Score Data Flow                              │
  └─────────────────────────────────────────────────────────────────┘

  [Sportradar/Opta]
         │  HTTP webhook / TCP feed
         ▼
  [Score Ingestion Service]
         │  Kafka PRODUCE → topic: match-scores
         ▼
  [Kafka Cluster]  ←─── durable, replayable, ordered
         │  10 consumer group instances
         ▼
  [Fan-out Workers x10]  ─── one per shard of SSE servers
         │  Redis PUBLISH → match:{id}:score
         ├──────────────────┬──────────────────────┐
         ▼                  ▼                      ▼
  [Redis US-East]   [Redis EU-West]       [Redis APAC]
         │                  │                      │
    ─────────────      ─────────────         ──────────────
    SSE x333           SSE x333              SSE x334
    50k clients ea.    50k clients ea.       50k clients ea.
    ─────────────      ─────────────         ──────────────
         │                  │                      │
         └──────────────────┴──────────────────────┘
                    50,000,000 clients
                    receive update in &lt; 200ms
</span></pre>

The elegance of this architecture is its **layered fan-out**: each tier multiplies the reach while keeping each individual node at a manageable load level. Redis doesn't talk to clients. SSE servers don't talk to Kafka. Each component does one job well.

{: class="marginalia" }
An interesting edge case: what happens when the official data vendor feed is *wrong*? Sportradar occasionally sends erroneous events. In 2014, a data error caused a goal to briefly appear in a match score on multiple platforms simultaneously before being retracted. Designing for *event correction* (a `RETRACT` or `AMEND` delta type) is part of a production score system — the client's local state machine must handle out-of-order corrections gracefully.

The design principles generalise far beyond sports scores. Any "one event → millions of notifications" problem — auction bids, stock prices, breaking news, collaborative document cursors — benefits from the same tiered fan-out pattern: durable queue (Kafka) → regional brokers (Redis) → persistent connections (SSE/WebSocket) → client-side state with delta application.

What makes the sports score case particularly instructive is the *bursty* nature of the load: the system must handle 50 million concurrent connections during a World Cup final but then serve a fraction of that for a mid-season league game the next afternoon. Auto-scaling the SSE tier (Kubernetes HPA on connection count) and keeping the fan-out workers stateless makes the scale-down as important as the scale-up.

Build the state machine on the client. Keep payloads tiny. Fan out through tiers. The rest is operations.
