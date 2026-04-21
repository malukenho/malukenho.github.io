---
layout: post
title: "System Design: Real-Time Game Leaderboard — Rankings for Millions of Players"
date: 2026-06-17 10:00:00 +0000
categories: ["post"]
tags: [system-design, redis, sorted-sets, leaderboard, gaming, real-time, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios
</div>

{: class="marginalia" }
**Redis Sorted Sets use a<br/>skip list for O(log N)<br/>rank operations and a<br/>hash map for O(1) score<br/>lookups. Skip lists were<br/>invented by William Pugh<br/>in 1990 as a probabilistic<br/>alternative to balanced<br/>trees — simpler to<br/>implement, similar<br/>performance.**

Design a real-time leaderboard for a mobile game with 100 million players. The leaderboard shows the top 100 players globally and each player's personal rank ("You are #4,521,334 globally"). Scores update in real-time after every match. Design for correctness, low latency reads, and high write throughput.

**The question:** *Design a real-time leaderboard for a mobile game with 100 million players. Show the global top 100 and each player's personal rank. Scores update after every match. Design for correctness, low latency, and high write throughput.*

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

/* Leaderboard styles */
.lb-wrap { background:#111214;border:1px solid #2e2f35;border-radius:14px;overflow:hidden;margin:1.5rem 0; }
.lb-header { background:#1a1b1f;padding:.9rem 1.2rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #2e2f35;flex-wrap:wrap;gap:.6rem; }
.lb-title { font-size:.95rem;font-weight:700;color:rgba(255,255,255,.85); }
.lb-badge { background:#1a2e22;border:1px solid #7bcdab;border-radius:6px;padding:3px 10px;font-size:.72rem;color:#7bcdab;font-weight:700; }
.lb-body { padding:0; }
.lb-row { display:grid;grid-template-columns:40px 1fr 110px 70px;align-items:center;padding:.65rem 1.2rem;border-bottom:1px solid #161719;transition:background .25s,transform .35s;font-size:.83rem; }
.lb-row:last-child { border-bottom:none; }
.lb-row.up   { background:#0f1e14;animation:slideUp .35s ease; }
.lb-row.down { background:#1e0f0f;animation:slideDown .25s ease; }
.lb-row.gold   { background:#1a1700; }
.lb-row.silver { background:#151618; }
.lb-row.bronze { background:#1a1207; }
.lb-row.me { background:#0d1a2e;border-left:3px solid #7bcdab; }
@keyframes slideUp   { from { transform:translateY(8px);opacity:.4; } to { transform:translateY(0);opacity:1; } }
@keyframes slideDown { from { transform:translateY(-8px);opacity:.4; } to { transform:translateY(0);opacity:1; } }
.lb-rank { font-weight:700;font-size:.9rem; }
.rank-1 { color:#ffd700; }
.rank-2 { color:#c0c0c0; }
.rank-3 { color:#cd7f32; }
.rank-n { color:rgba(255,255,255,.4); }
.lb-player { color:rgba(255,255,255,.85);font-weight:500; }
.lb-score { color:#fbef8a;font-weight:700;text-align:right; }
.lb-delta { font-size:.75rem;text-align:right; }
.lb-delta.pos { color:#7bcdab; }
.lb-delta.neg { color:#f08080; }
.lb-delta.neu { color:rgba(255,255,255,.3); }
.lb-sep { background:#1a1b1f;padding:.55rem 1.2rem;font-size:.72rem;color:rgba(255,255,255,.3);letter-spacing:.08em;text-transform:uppercase; }
.lb-me-wrap { background:#0d1a2e;border-top:1px solid #2e2f35;padding:.8rem 1.2rem; }
.lb-me-row { display:grid;grid-template-columns:40px 1fr 110px 70px;align-items:center;font-size:.83rem; }
.lb-me-label { font-size:.72rem;color:#7bcdab;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem; }
.lb-controls { padding:1rem 1.2rem;background:#141518;border-top:1px solid #1e1f24;display:flex;gap:.6rem;flex-wrap:wrap;align-items:center; }
.lb-btn { padding:6px 14px;border-radius:6px;border:1px solid #3a3b40;background:#1a1b1f;color:rgba(255,255,255,.75);font-size:.79rem;cursor:pointer;transition:all .2s;font-family:inherit; }
.lb-btn:hover { border-color:#7bcdab;color:#7bcdab; }
.lb-btn.primary { background:#7bcdab;color:#19191c;border:none;font-weight:700; }
.lb-btn.primary:hover { background:#5eb896; }
.season-bar { background:#141518;border-top:1px solid #1e1f24;padding:.7rem 1.2rem;display:flex;align-items:center;gap:1rem;font-size:.78rem; }
.season-label { color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.07em;font-size:.7rem; }
.season-timer { color:#fbef8a;font-weight:700;font-variant-numeric:tabular-nums; }
.season-track { flex:1;background:#1e1f24;border-radius:4px;height:5px;overflow:hidden; }
.season-fill  { height:100%;background:linear-gradient(90deg,#7bcdab,#fbef8a);border-radius:4px;transition:width .5s; }
.season-over { color:#fbef8a;font-weight:700;font-size:.85rem; }

/* Redis command log */
.cmd-log { background:#0d0e11;border:1px solid #1e2025;border-radius:8px;font-family:"JetBrains Mono","Fira Code",monospace;font-size:.74rem;height:130px;overflow-y:auto;padding:.7rem;margin:.8rem 0;color:rgba(255,255,255,.6); }
.cmd-log .cl-row { padding:.18rem 0;border-bottom:1px solid #151618;display:flex;gap:.6rem; }
.cmd-log .cl-time { color:#5a6272;min-width:58px; }
.cmd-log .cl-cmd  { color:#fbef8a; }
.cmd-log .cl-resp { color:#7bcdab; }

/* Tie-breaker formula */
.formula-box { background:#141518;border:1px solid #2e2f35;border-radius:10px;padding:1.1rem 1.3rem;margin:1rem 0;font-family:"JetBrains Mono","Fira Code",monospace;font-size:.82rem;line-height:1.9; }
.formula-box .f-label { font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.3);margin-bottom:.5rem;font-family:inherit; }
.formula-box .f-line  { color:rgba(255,255,255,.82); }
.formula-box .f-hi    { color:#7bcdab; }
.formula-box .f-yellow { color:#fbef8a; }
.formula-box .f-comment { color:#5a6272; }

/* Shard diagram */
.shard-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem;margin:1.2rem 0; }
.shard-card { background:#1a1b1f;border:1px solid #2e2f35;border-radius:9px;padding:.9rem 1rem; }
.shard-card h4 { margin:0 0 .4rem;font-size:.82rem;color:#7bcdab; }
.shard-card p  { margin:0;font-size:.77rem;color:rgba(255,255,255,.6);line-height:1.6; }
</style>

---

## 1. What Makes Leaderboards Hard

<div class="stat-grid">
  <div class="stat-card"><div class="stat-num">100M</div><div class="stat-lbl">players</div></div>
  <div class="stat-card"><div class="stat-num">100K</div><div class="stat-lbl">score updates/sec</div></div>
  <div class="stat-card"><div class="stat-num">500K</div><div class="stat-lbl">rank reads/sec</div></div>
  <div class="stat-card"><div class="stat-num">&lt;1ms</div><div class="stat-lbl">rank latency target</div></div>
</div>

Four challenges make leaderboards deceptively hard:

1. **Write throughput:** 100M players finishing matches → score updates arrive in bursts. A popular game can see 100,000 ZADD operations per second.
2. **Global rank queries:** "What is my rank?" requires knowing how many players have a higher score. Naively that means scanning 100M rows.
3. **Top-100 freshness:** The moment someone's score pushes them into the top 100, they should appear. Stale caches won't do.
4. **Tie-breaking:** Two players at score 9,999 need a deterministic ordering — otherwise ranks flicker every time either player plays.

---

## 2. Level 1 — Naive SQL

The obvious first attempt: store scores in a relational table and query rank on demand.

<div class="code-wrap">
<div class="code-lang">sql <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">-- Schema</span>
<span class="kw">CREATE TABLE</span> scores (
  user_id  <span class="ty">BIGINT</span> <span class="kw">PRIMARY KEY</span>,
  score    <span class="ty">BIGINT</span> <span class="kw">NOT NULL</span>,
  updated  <span class="ty">TIMESTAMP</span> <span class="kw">DEFAULT</span> <span class="fn">NOW</span>()
);
<span class="kw">CREATE INDEX</span> idx_score <span class="kw">ON</span> scores (score <span class="kw">DESC</span>);

<span class="cm">-- Rank query for a given user</span>
<span class="kw">SELECT</span> <span class="fn">COUNT</span>(<span class="op">*</span>) <span class="op">+</span> <span class="nu">1</span>
<span class="kw">FROM</span>   scores
<span class="kw">WHERE</span>  score <span class="op">&gt;</span> (<span class="kw">SELECT</span> score <span class="kw">FROM</span> scores <span class="kw">WHERE</span> user_id <span class="op">=</span> <span class="op">?</span>);

<span class="cm">-- Top 100</span>
<span class="kw">SELECT</span> user_id, score
<span class="kw">FROM</span>   scores
<span class="kw">ORDER BY</span> score <span class="kw">DESC</span>
<span class="kw">LIMIT</span>  <span class="nu">100</span>;</pre>
</div>

**Why this fails at scale:**

- Rank query at 100M rows: the inner `SELECT` is O(log N) with the index; the outer `COUNT(*)` is O(log N + K) where K = players with higher score. At rank #4,521,334 that means scanning ~4.5M index entries.
- Top-100 query is fast with the index (index scan stops after 100 rows). But every score update rewrites the index — at 100K updates/sec that creates severe index contention.
- `ORDER BY score DESC LIMIT 100` triggers a potential lock on the entire index during writes.

<div class="callout callout-yellow">
<strong>SQL works fine up to ~1 million players</strong> with proper indexing. Beyond that, the rank query scan time grows linearly with the player's rank position — the worst case (last place) reads the entire index.
</div>

---

## 3. Level 2 — Redis Sorted Set (the Right Answer)

Redis Sorted Set (ZSET) is purpose-built for exactly this problem. Internally it combines a **skip list** for ordered traversal and a **hash map** for O(1) member lookup.

<table class="comp-table">
  <thead><tr><th>Command</th><th>Operation</th><th>Complexity</th></tr></thead>
  <tbody>
    <tr><td><code>ZADD leaderboard {score} {userId}</code></td><td>Add or update a player's score</td><td>O(log N)</td></tr>
    <tr><td><code>ZREVRANK leaderboard {userId}</code></td><td>Get rank (0 = highest score)</td><td>O(log N)</td></tr>
    <tr><td><code>ZREVRANGE leaderboard 0 99 WITHSCORES</code></td><td>Top 100 players with scores</td><td>O(log N + 100)</td></tr>
    <tr><td><code>ZSCORE leaderboard {userId}</code></td><td>Get a player's current score</td><td>O(1)</td></tr>
    <tr><td><code>ZREVRANGE leaderboard R-5 R+5 WITHSCORES</code></td><td>Players near rank R</td><td>O(log N + 10)</td></tr>
    <tr><td><code>ZCARD leaderboard</code></td><td>Total number of players</td><td>O(1)</td></tr>
  </tbody>
</table>

At 100M members, `ZREVRANK` runs in ~27 skip-list hops (log₂(100M) ≈ 27). At typical Redis latencies that's **sub-millisecond from the application server**.

### Interactive Redis ZSET Demo

<div class="viz-wrap" id="redis-demo">
  <div class="viz-title">Redis Sorted Set — Live Demo</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;" id="redis-grid">
    <div>
      <div style="font-size:.78rem;color:rgba(255,255,255,.45);margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.07em;">Leaderboard</div>
      <div id="zset-rows" style="font-family:'JetBrains Mono','Fira Code',monospace;font-size:.8rem;"></div>
    </div>
    <div>
      <div style="font-size:.78rem;color:rgba(255,255,255,.45);margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.07em;">Redis Command Log</div>
      <div class="cmd-log" id="redis-cmd-log"></div>
    </div>
  </div>
  <div class="viz-controls" style="margin-top:.8rem;">
    <button class="viz-btn" onclick="redisScoreEvent()">Score Event (+100)</button>
    <button class="viz-btn" onclick="redisFindRank()">Find My Rank (Player_42)</button>
    <button class="viz-btn" onclick="redisTop5()">Highlight Top 5</button>
    <button class="viz-btn" onclick="redisAddPlayer()">Add New Player</button>
    <button class="viz-btn" onclick="redisClearHighlight()">Clear Highlights</button>
  </div>
</div>

<script>
(function() {
  var players = [
    { id: 'ShadowX',    score: 98200 },
    { id: 'QuantumZ',   score: 97450 },
    { id: 'NightOwl',   score: 95800 },
    { id: 'BlazeFire',  score: 94300 },
    { id: 'Player_42',  score: 91100 },
    { id: 'IceStorm',   score: 89600 },
    { id: 'VoidWalker', score: 87900 },
    { id: 'CrimsonAce', score: 85400 },
    { id: 'StarDust99', score: 82700 },
    { id: 'LunarByte',  score: 79800 }
  ];
  var highlight = {};
  var newPlayerCount = 0;

  function sorted() {
    return players.slice().sort(function(a,b) { return b.score - a.score; });
  }

  function rankOf(id) {
    var s = sorted();
    for (var i = 0; i < s.length; i++) { if (s[i].id === id) return i; }
    return -1;
  }

  function fmt(n) { return n.toLocaleString(); }

  function ts() {
    var now = new Date();
    return now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
  }

  function logCmd(cmd, resp) {
    var log = document.getElementById('redis-cmd-log');
    if (!log) return;
    var row = document.createElement('div');
    row.className = 'cl-row';
    row.innerHTML = '<span class="cl-time">' + ts() + '</span><span class="cl-cmd">' + cmd + '</span><span class="cl-resp">' + resp + '</span>';
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function render() {
    var container = document.getElementById('zset-rows');
    if (!container) return;
    var s = sorted();
    var medals = ['🥇','🥈','🥉'];
    var html = '';
    s.forEach(function(p, i) {
      var hl = highlight[p.id] || '';
      var rankDisplay = i < 3 ? medals[i] : '#' + (i+1);
      var bg = hl === 'top5' ? 'background:#1d1a0a;' : hl === 'found' ? 'background:#0d1a2e;' : '';
      var nameColor = p.id === 'Player_42' ? '#7bcdab' : 'rgba(255,255,255,.82)';
      html += '<div style="display:grid;grid-template-columns:36px 1fr 90px;gap:.3rem;padding:.35rem .5rem;border-radius:5px;margin-bottom:2px;' + bg + 'transition:background .3s;">';
      html += '<span style="font-weight:700;color:rgba(255,255,255,.45);">' + rankDisplay + '</span>';
      html += '<span style="color:' + nameColor + ';">' + p.id + '</span>';
      html += '<span style="color:#fbef8a;text-align:right;">' + fmt(p.score) + '</span>';
      html += '</div>';
    });
    container.innerHTML = html;
  }

  window.redisScoreEvent = function() {
    var idx = Math.floor(Math.random() * players.length);
    var gain = Math.floor(Math.random() * 200) + 50;
    var p = players[idx];
    var oldRank = rankOf(p.id);
    p.score += gain;
    var newRank = rankOf(p.id);
    logCmd('ZADD leaderboard ' + p.score + ' ' + p.id, '(integer) 0');
    if (newRank !== oldRank) {
      logCmd('ZREVRANK leaderboard ' + p.id, '(integer) ' + newRank);
    }
    render();
  };

  window.redisFindRank = function() {
    var r = rankOf('Player_42');
    var s = players.find(function(p) { return p.id === 'Player_42'; });
    logCmd('ZSCORE leaderboard Player_42', '"' + s.score + '"');
    logCmd('ZREVRANK leaderboard Player_42', '(integer) ' + r);
    highlight = { 'Player_42': 'found' };
    render();
  };

  window.redisTop5 = function() {
    var s = sorted();
    var top5 = s.slice(0, 5).map(function(p) { return p.id + ' ' + p.score; }).join(', ');
    logCmd('ZREVRANGE leaderboard 0 4 WITHSCORES', top5);
    highlight = {};
    s.slice(0,5).forEach(function(p) { highlight[p.id] = 'top5'; });
    render();
  };

  window.redisAddPlayer = function() {
    newPlayerCount++;
    var newId = 'NewPlayer_' + newPlayerCount;
    var newScore = Math.floor(Math.random() * 80000) + 10000;
    players.push({ id: newId, score: newScore });
    var r = rankOf(newId);
    logCmd('ZADD leaderboard ' + newScore + ' ' + newId, '(integer) 1');
    logCmd('ZREVRANK leaderboard ' + newId, '(integer) ' + r);
    highlight = {};
    highlight[newId] = 'found';
    render();
  };

  window.redisClearHighlight = function() {
    highlight = {};
    render();
  };

  function copyCode(btn) {
    var pre = btn.closest('.code-wrap').querySelector('pre');
    navigator.clipboard.writeText(pre.innerText).then(function() {
      btn.textContent = 'copied!';
      btn.classList.add('copied');
      setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500);
    });
  }
  window.copyCode = copyCode;

  render();
  logCmd('ZADD leaderboard 98200 ShadowX', '(integer) 1');
  logCmd('ZADD leaderboard 97450 QuantumZ', '(integer) 1');
  logCmd('... (10 players loaded)', 'OK');
})();
</script>

---

## 4. Handling Ties

Two players with the same score need a deterministic ordering. Redis ZSET breaks ties lexicographically by member name — acceptable for usernames like "alice" vs "bob", but problematic if UserIDs are numeric or you want "first to achieve the score wins."

{: class="marginalia" }
**Fortnite's leaderboard<br/>system handles ~350 million<br/>registered players. Epic<br/>uses a combination of<br/>Redis for real-time<br/>rankings and Cassandra<br/>for historical stats. The<br/>global leaderboard is<br/>rarely shown — most<br/>players see region +<br/>friends leaderboards<br/>which are much smaller.**

The canonical solution: **encode the timestamp into the score as a decimal**.

<div class="formula-box">
  <div class="f-label">Tie-breaker encoding</div>
  <div class="f-line"><span class="f-yellow">MAX_EPOCH</span> = 9_999_999_999  <span class="f-comment">// 10-digit Unix timestamp (year ~2286)</span></div>
  <div class="f-line"><span class="f-hi">encoded_score</span> = points * 10_000_000_000 + (MAX_EPOCH - unix_ts_seconds)</div>
  <div class="f-line">&nbsp;</div>
  <div class="f-line"><span class="f-comment">// Player A: 9999 points at t=1700000000</span></div>
  <div class="f-line"><span class="f-hi">encoded_A</span> = 9999 * 10_000_000_000 + (9_999_999_999 - 1_700_000_000)</div>
  <div class="f-line">         = 99_998_299_999_999</div>
  <div class="f-line">&nbsp;</div>
  <div class="f-line"><span class="f-comment">// Player B: 9999 points at t=1700001000 (1000 seconds later)</span></div>
  <div class="f-line"><span class="f-hi">encoded_B</span> = 9999 * 10_000_000_000 + (9_999_999_999 - 1_700_001_000)</div>
  <div class="f-line">         = 99_998_298_999_999</div>
  <div class="f-line">&nbsp;</div>
  <div class="f-line"><span class="f-comment">// encoded_A &gt; encoded_B → Player A ranks higher (achieved score first)</span></div>
</div>

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> time, redis

MAX_EPOCH <span class="op">=</span> <span class="nu">9_999_999_999</span>
SCORE_MULT <span class="op">=</span> <span class="nu">10_000_000_000</span>

<span class="kw">def</span> <span class="fn">encode_score</span>(points: <span class="ty">int</span>, ts: <span class="ty">int</span> <span class="op">=</span> <span class="kw">None</span>) <span class="op">-&gt;</span> <span class="ty">int</span>:
    <span class="kw">if</span> ts <span class="kw">is</span> <span class="kw">None</span>:
        ts <span class="op">=</span> <span class="ty">int</span>(time.<span class="fn">time</span>())
    <span class="kw">return</span> points <span class="op">*</span> SCORE_MULT <span class="op">+</span> (MAX_EPOCH <span class="op">-</span> ts)

<span class="kw">def</span> <span class="fn">decode_score</span>(encoded: <span class="ty">int</span>) <span class="op">-&gt;</span> <span class="ty">tuple</span>[<span class="ty">int</span>, <span class="ty">int</span>]:
    points <span class="op">=</span> encoded <span class="op">//</span> SCORE_MULT
    ts     <span class="op">=</span> MAX_EPOCH <span class="op">-</span> (encoded <span class="op">%</span> SCORE_MULT)
    <span class="kw">return</span> points, ts

r <span class="op">=</span> redis.<span class="fn">Redis</span>()

<span class="kw">def</span> <span class="fn">record_match_result</span>(user_id: <span class="ty">str</span>, new_points: <span class="ty">int</span>):
    <span class="cm"># Only update if new score is higher than current</span>
    current_encoded <span class="op">=</span> r.<span class="fn">zscore</span>(<span class="st">'leaderboard'</span>, user_id)
    <span class="kw">if</span> current_encoded <span class="kw">is not</span> <span class="kw">None</span>:
        current_points, _ <span class="op">=</span> <span class="fn">decode_score</span>(<span class="ty">int</span>(current_encoded))
        <span class="kw">if</span> new_points <span class="op">&lt;=</span> current_points:
            <span class="kw">return</span>   <span class="cm"># no improvement</span>
    encoded <span class="op">=</span> <span class="fn">encode_score</span>(new_points)
    r.<span class="fn">zadd</span>(<span class="st">'leaderboard'</span>, {user_id: encoded})</pre>
</div>

This approach keeps the ZSET as a single sortable number. No secondary sorting step needed — the ZSET handles everything natively.

---

## 5. Partitioning for Massive Scale

100M players in one Redis ZSET is **perfectly feasible** — Redis handles ZSETs with hundreds of millions of members. But a single primary node becomes a write bottleneck at high throughput.

<div class="callout callout-green">
<strong>Memory math:</strong> 100M players × ~50 bytes each (skip list node + hash map entry) ≈ <strong>5 GB</strong>. A modern Redis instance with 8 GB RAM handles this comfortably with room for other keys.
</div>

### Sharding Strategies

<div class="shard-grid">
  <div class="shard-card">
    <h4>⏱ Time-windowed leaderboards</h4>
    <p>Separate ZSETs per day/week/season. Weekly boards have far fewer active players, naturally reducing size. Expire old boards automatically with <code>EXPIRE</code>.</p>
  </div>
  <div class="shard-card">
    <h4>🌍 Regional shards</h4>
    <p>Shard by player region: <code>leaderboard:Americas</code>, <code>leaderboard:EU</code>, <code>leaderboard:APAC</code>. Regional reads go to the nearest Redis node; a separate global aggregator merges them hourly.</p>
  </div>
  <div class="shard-card">
    <h4>📊 Score tier sharding</h4>
    <p>Split by score range: <code>lb:tier:bronze</code> (0–1000), <code>lb:tier:silver</code> (1000–10K), <code>lb:tier:gold</code> (10K+). Writes route to the right tier; rank = tier-offset + intra-tier rank.</p>
  </div>
  <div class="shard-card">
    <h4>👥 Friends leaderboard</h4>
    <p>Computed on-demand: fetch friends list, pipeline <code>ZSCORE</code> for each friend, sort client-side. Works for up to ~5000 friends; beyond that, maintain a per-user friends ZSET updated asynchronously.</p>
  </div>
</div>

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Time-windowed leaderboard keys</span>
<span class="kw">import</span> datetime

<span class="kw">def</span> <span class="fn">weekly_key</span>() <span class="op">-&gt;</span> <span class="ty">str</span>:
    iso <span class="op">=</span> datetime.date.<span class="fn">today</span>().<span class="fn">isocalendar</span>()
    <span class="kw">return</span> <span class="st">'leaderboard:'</span> <span class="op">+</span> <span class="ty">str</span>(iso.year) <span class="op">+</span> <span class="st">'-W'</span> <span class="op">+</span> <span class="ty">str</span>(iso.week).<span class="fn">zfill</span>(<span class="nu">2</span>)

<span class="kw">def</span> <span class="fn">zadd_with_ttl</span>(pipe, user_id: <span class="ty">str</span>, encoded: <span class="ty">int</span>):
    key <span class="op">=</span> <span class="fn">weekly_key</span>()
    pipe.<span class="fn">zadd</span>(key, {user_id: encoded})
    pipe.<span class="fn">expire</span>(key, <span class="nu">28</span> <span class="op">*</span> <span class="nu">86400</span>)  <span class="cm"># expire after 4 weeks</span>

<span class="cm"># Friends leaderboard</span>
<span class="kw">def</span> <span class="fn">friends_leaderboard</span>(user_id: <span class="ty">str</span>, friends: <span class="ty">list</span>[<span class="ty">str</span>]) <span class="op">-&gt;</span> <span class="ty">list</span>:
    pipe <span class="op">=</span> r.<span class="fn">pipeline</span>(transaction<span class="op">=</span><span class="kw">False</span>)
    all_ids <span class="op">=</span> friends <span class="op">+</span> [user_id]
    <span class="kw">for</span> fid <span class="kw">in</span> all_ids:
        pipe.<span class="fn">zscore</span>(<span class="st">'leaderboard'</span>, fid)
    scores <span class="op">=</span> pipe.<span class="fn">execute</span>()
    pairs <span class="op">=</span> [(all_ids[i], scores[i]) <span class="kw">for</span> i <span class="kw">in</span> <span class="fn">range</span>(<span class="fn">len</span>(all_ids)) <span class="kw">if</span> scores[i] <span class="kw">is not</span> <span class="kw">None</span>]
    pairs.<span class="fn">sort</span>(key<span class="op">=</span><span class="kw">lambda</span> x: x[<span class="nu">1</span>], reverse<span class="op">=</span><span class="kw">True</span>)
    <span class="kw">return</span> pairs</pre>
</div>

---

## 6. Multiple Leaderboard Types

<table class="comp-table">
  <thead><tr><th>Type</th><th>Key pattern</th><th>Size</th><th>TTL</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Global all-time</td><td><code>leaderboard:global</code></td><td>100M</td><td>None</td><td>Never expires; authoritative source</td></tr>
    <tr><td>Weekly</td><td><code>leaderboard:2026-W24</code></td><td>~10M active</td><td>28 days</td><td>New key each Monday; old ones auto-expire</td></tr>
    <tr><td>Daily</td><td><code>leaderboard:2026-06-17</code></td><td>~2M active</td><td>7 days</td><td>Great for Daily Challenge features</td></tr>
    <tr><td>Regional</td><td><code>leaderboard:region:EU</code></td><td>~25M</td><td>None</td><td>Shards write load across 4 Redis primaries</td></tr>
    <tr><td>Clan</td><td><code>leaderboard:clan:{clanId}</code></td><td>2–500</td><td>None</td><td>Aggregate clan score; update on each member match</td></tr>
    <tr><td>Friends</td><td>Computed on-demand</td><td>~500</td><td>None</td><td>Pipeline ZSCORE per friend; sort client-side</td></tr>
  </tbody>
</table>

---

## 7. Real-Time Updates to the Client

The top 100 players watching the leaderboard should see it update live. Use WebSockets.

<div class="code-wrap">
<div class="code-lang">python (change detection loop) <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> asyncio, json, redis.asyncio <span class="kw">as</span> aioredis

r_async <span class="op">=</span> aioredis.<span class="fn">Redis</span>()
prev_top100: <span class="ty">list</span> <span class="op">=</span> []

<span class="kw">async def</span> <span class="fn">top100_watcher</span>(broadcast_fn):
    <span class="kw">global</span> prev_top100
    <span class="kw">while</span> <span class="kw">True</span>:
        raw <span class="op">=</span> <span class="kw">await</span> r_async.<span class="fn">zrevrange</span>(
            <span class="st">'leaderboard'</span>, <span class="nu">0</span>, <span class="nu">99</span>, withscores<span class="op">=</span><span class="kw">True</span>
        )
        current <span class="op">=</span> [(uid.<span class="fn">decode</span>(), <span class="ty">int</span>(sc)) <span class="kw">for</span> uid, sc <span class="kw">in</span> raw]
        <span class="kw">if</span> current <span class="op">!=</span> prev_top100:
            changes <span class="op">=</span> <span class="fn">compute_diff</span>(prev_top100, current)
            <span class="kw">await</span> <span class="fn">broadcast_fn</span>(json.<span class="fn">dumps</span>({<span class="st">'type'</span>: <span class="st">'top100_update'</span>, <span class="st">'changes'</span>: changes}))
            prev_top100 <span class="op">=</span> current
        <span class="kw">await</span> asyncio.<span class="fn">sleep</span>(<span class="nu">0.5</span>)   <span class="cm"># poll every 500ms</span>

<span class="kw">def</span> <span class="fn">compute_diff</span>(old, new):
    old_map <span class="op">=</span> {uid: (i, sc) <span class="kw">for</span> i, (uid, sc) <span class="kw">in</span> <span class="fn">enumerate</span>(old)}
    new_map <span class="op">=</span> {uid: (i, sc) <span class="kw">for</span> i, (uid, sc) <span class="kw">in</span> <span class="fn">enumerate</span>(new)}
    changes <span class="op">=</span> []
    <span class="kw">for</span> uid, (new_rank, new_sc) <span class="kw">in</span> new_map.<span class="fn">items</span>():
        old_rank, old_sc <span class="op">=</span> old_map.<span class="fn">get</span>(uid, (new_rank, new_sc))
        <span class="kw">if</span> new_rank <span class="op">!=</span> old_rank <span class="kw">or</span> new_sc <span class="op">!=</span> old_sc:
            changes.<span class="fn">append</span>({
                <span class="st">'userId'</span>: uid,
                <span class="st">'rank'</span>: new_rank <span class="op">+</span> <span class="nu">1</span>,
                <span class="st">'score'</span>: new_sc,
                <span class="st">'delta'</span>: new_sc <span class="op">-</span> old_sc
            })
    <span class="kw">return</span> changes</pre>
</div>

The 500ms polling is aggressive but cheap: `ZREVRANGE 0 99` is O(log N + 100) — sub-millisecond. For 100K connected spectators, use pub/sub: the watcher publishes to a Redis channel, and a fan-out layer broadcasts to WebSocket connections.

---

## 8. The "Nearby Players" Feature

{: class="marginalia" }
**The 'friends leaderboard'<br/>is psychologically more<br/>engaging than the global<br/>leaderboard. Seeing that<br/>your friend is rank<br/>#3,421,002 while you're<br/>#3,421,001 is motivating.<br/>Game designers have known<br/>this for decades — it's<br/>why local arcade high<br/>score tables were more<br/>compelling than national<br/>ones.**

"Show me the players just ahead of and behind me."

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">nearby_players</span>(user_id: <span class="ty">str</span>, window: <span class="ty">int</span> <span class="op">=</span> <span class="nu">5</span>) <span class="op">-&gt;</span> <span class="ty">dict</span>:
    pipe <span class="op">=</span> r.<span class="fn">pipeline</span>(transaction<span class="op">=</span><span class="kw">False</span>)
    pipe.<span class="fn">zrevrank</span>(<span class="st">'leaderboard'</span>, user_id)
    pipe.<span class="fn">zscore</span>(<span class="st">'leaderboard'</span>, user_id)
    pipe.<span class="fn">zcard</span>(<span class="st">'leaderboard'</span>)
    rank_0indexed, score, total <span class="op">=</span> pipe.<span class="fn">execute</span>()

    <span class="kw">if</span> rank_0indexed <span class="kw">is</span> <span class="kw">None</span>:
        <span class="kw">return</span> {<span class="st">'error'</span>: <span class="st">'player not found'</span>}

    start <span class="op">=</span> <span class="fn">max</span>(<span class="nu">0</span>, rank_0indexed <span class="op">-</span> window)
    end   <span class="op">=</span> <span class="fn">min</span>(total <span class="op">-</span> <span class="nu">1</span>, rank_0indexed <span class="op">+</span> window)

    raw <span class="op">=</span> r.<span class="fn">zrevrange</span>(<span class="st">'leaderboard'</span>, start, end, withscores<span class="op">=</span><span class="kw">True</span>)
    nearby <span class="op">=</span> [
        {<span class="st">'rank'</span>: start <span class="op">+</span> i <span class="op">+</span> <span class="nu">1</span>, <span class="st">'userId'</span>: uid.<span class="fn">decode</span>(), <span class="st">'score'</span>: <span class="ty">int</span>(sc)}
        <span class="kw">for</span> i, (uid, sc) <span class="kw">in</span> <span class="fn">enumerate</span>(raw)
    ]
    <span class="kw">return</span> {
        <span class="st">'myRank'</span>: rank_0indexed <span class="op">+</span> <span class="nu">1</span>,
        <span class="st">'myScore'</span>: <span class="ty">int</span>(score),
        <span class="st">'totalPlayers'</span>: total,
        <span class="st">'nearby'</span>: nearby
    }</pre>
</div>

This makes three pipelined Redis calls and one `ZREVRANGE`. At rank 4,521,334 out of 100M players, `ZREVRANGE 4521329 4521339` still runs in O(log N + 10) — indistinguishable in latency from a top-10 query.

---

## 9. Full Interactive Leaderboard

<div class="lb-wrap" id="full-lb">
  <div class="lb-header">
    <div class="lb-title">🏆 Global Leaderboard</div>
    <div style="display:flex;gap:.5rem;align-items:center;">
      <div class="lb-badge" id="live-badge">● LIVE</div>
      <div style="font-size:.75rem;color:rgba(255,255,255,.4);" id="update-counter">0 updates</div>
    </div>
  </div>
  <div class="lb-body" id="lb-main-rows"></div>
  <div class="lb-sep">· · · · · · · · · ·</div>
  <div class="lb-me-wrap">
    <div class="lb-me-label">Your Position</div>
    <div id="lb-me-row" class="lb-me-row"></div>
  </div>
  <div class="lb-controls">
    <button class="lb-btn primary" id="lb-auto-btn" onclick="lbToggleAuto()">⏸ Pause Auto-Update</button>
    <button class="lb-btn" onclick="lbFastForward()">⏩ Fast-forward Season</button>
    <button class="lb-btn" onclick="lbResetSeason()">🔄 New Season</button>
    <span style="font-size:.75rem;color:rgba(255,255,255,.35);margin-left:.4rem;" id="lb-status"></span>
  </div>
  <div class="season-bar">
    <div class="season-label">Season</div>
    <div class="season-timer" id="season-time">47:58:32</div>
    <div class="season-track"><div class="season-fill" id="season-fill" style="width:0%"></div></div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.35);" id="season-end-label">48h season</div>
  </div>
</div>

<script>
(function() {
  var SEASON_DURATION = 48 * 3600;
  var seasonElapsed = 100;
  var seasonOver = false;
  var autoRunning = true;
  var updateCount = 0;
  var autoInterval = null;

  var ALL_PLAYERS = [
    { id: 'ShadowX',       score: 98200, region: 'NA' },
    { id: 'QuantumZ',      score: 97450, region: 'EU' },
    { id: 'NightOwl',      score: 95800, region: 'APAC' },
    { id: 'BlazeFire',     score: 94300, region: 'NA' },
    { id: 'IceStorm',      score: 93100, region: 'EU' },
    { id: 'VoidWalker',    score: 91800, region: 'NA' },
    { id: 'CrimsonAce',    score: 90400, region: 'APAC' },
    { id: 'StarDust99',    score: 88700, region: 'EU' },
    { id: 'LunarByte',     score: 87200, region: 'NA' },
    { id: 'PhantomRush',   score: 85900, region: 'APAC' },
    { id: 'NebulaX',       score: 84100, region: 'EU' },
    { id: 'TurboFox',      score: 82600, region: 'NA' },
    { id: 'OmegaStrike',   score: 80300, region: 'APAC' },
    { id: 'CyberPulse',    score: 78800, region: 'EU' },
    { id: 'DawnBreaker',   score: 77200, region: 'NA' },
    { id: 'FrostEdge',     score: 75500, region: 'EU' },
    { id: 'CosmicRay42',   score: 73900, region: 'APAC' },
    { id: 'IronClad77',    score: 72100, region: 'NA' },
    { id: 'GlitchHunter',  score: 70400, region: 'EU' },
    { id: 'You',           score: 68900, region: 'NA' }
  ];

  var prevRanks = {};
  var deltaMap = {};

  function sorted() {
    return ALL_PLAYERS.slice().sort(function(a,b) { return b.score - a.score; });
  }

  function fmt(n) { return n.toLocaleString(); }

  function fmtDuration(secs) {
    var h = Math.floor(secs / 3600);
    var m = Math.floor((secs % 3600) / 60);
    var s = secs % 60;
    return h.toString().padStart(2,'0') + ':' + m.toString().padStart(2,'0') + ':' + s.toString().padStart(2,'0');
  }

  function render() {
    var s = sorted();
    var container = document.getElementById('lb-main-rows');
    if (!container) return;

    var html = '';
    var mePos = -1;

    s.forEach(function(p, i) {
      var rank = i + 1;
      var prevRank = prevRanks[p.id];
      var dir = '';
      if (prevRank !== undefined && prevRank !== rank) {
        dir = rank < prevRank ? 'up' : 'down';
      }
      var rowClass = 'lb-row';
      if (rank === 1) rowClass += ' gold';
      else if (rank === 2) rowClass += ' silver';
      else if (rank === 3) rowClass += ' bronze';
      if (dir) rowClass += ' ' + dir;
      if (p.id === 'You') { rowClass += ' me'; mePos = rank; }

      var rankHtml = '';
      if (rank === 1) rankHtml = '<span class="lb-rank rank-1">🥇</span>';
      else if (rank === 2) rankHtml = '<span class="lb-rank rank-2">🥈</span>';
      else if (rank === 3) rankHtml = '<span class="lb-rank rank-3">🥉</span>';
      else rankHtml = '<span class="lb-rank rank-n">#' + rank + '</span>';

      var d = deltaMap[p.id] || 0;
      var deltaHtml = d > 0 ? '<span class="lb-delta pos">+' + fmt(d) + '</span>' : d < 0 ? '<span class="lb-delta neg">' + fmt(d) + '</span>' : '<span class="lb-delta neu">—</span>';
      var nameColor = p.id === 'You' ? '#7bcdab' : 'rgba(255,255,255,.85)';

      if (i < 10 || p.id === 'You') {
        html += '<div class="' + rowClass + '">';
        html += rankHtml;
        html += '<span class="lb-player" style="color:' + nameColor + ';">' + p.id + (seasonOver && rank === 1 ? ' 👑' : '') + '</span>';
        html += '<span class="lb-score">' + fmt(p.score) + '</span>';
        html += deltaHtml;
        html += '</div>';
      }
    });

    container.innerHTML = html;

    var meEl = document.getElementById('lb-me-row');
    if (meEl && mePos > -1) {
      var me = ALL_PLAYERS.find(function(p) { return p.id === 'You'; });
      var d = deltaMap['You'] || 0;
      var deltaHtml = d > 0 ? '<span class="lb-delta pos">+' + fmt(d) + '</span>' : d < 0 ? '<span class="lb-delta neg">' + fmt(d) + '</span>' : '<span class="lb-delta neu">—</span>';
      meEl.innerHTML = '<span class="lb-rank" style="color:#7bcdab;">#' + mePos + '</span>' +
        '<span class="lb-player" style="color:#7bcdab;">You</span>' +
        '<span class="lb-score">' + fmt(me.score) + '</span>' +
        deltaHtml;
    }

    s.forEach(function(p, i) { prevRanks[p.id] = i + 1; });
  }

  function tick() {
    if (seasonOver) return;
    var numUpdates = Math.floor(Math.random() * 3) + 1;
    for (var i = 0; i < numUpdates; i++) {
      var idx = Math.floor(Math.random() * ALL_PLAYERS.length);
      var gain = Math.floor(Math.random() * 490) + 10;
      ALL_PLAYERS[idx].score += gain;
      deltaMap[ALL_PLAYERS[idx].id] = gain;
    }
    updateCount++;
    var uc = document.getElementById('update-counter');
    if (uc) uc.textContent = updateCount + ' updates';
    render();
    setTimeout(function() {
      var keys = Object.keys(deltaMap);
      keys.forEach(function(k) { delete deltaMap[k]; });
    }, 800);

    seasonElapsed += 2;
    var pct = Math.min(100, (seasonElapsed / SEASON_DURATION) * 100);
    var fill = document.getElementById('season-fill');
    var timer = document.getElementById('season-time');
    if (fill) fill.style.width = pct.toFixed(1) + '%';
    var remaining = Math.max(0, SEASON_DURATION - seasonElapsed);
    if (timer) timer.textContent = fmtDuration(remaining);
    if (remaining <= 0 && !seasonOver) endSeason();
  }

  function endSeason() {
    seasonOver = true;
    if (autoInterval) clearInterval(autoInterval);
    var badge = document.getElementById('live-badge');
    if (badge) { badge.textContent = '■ ENDED'; badge.style.color = '#f08080'; badge.style.borderColor = '#f08080'; }
    var status = document.getElementById('lb-status');
    if (status) status.textContent = 'Season over! Scores frozen.';
    var timer = document.getElementById('season-time');
    if (timer) timer.textContent = '00:00:00';
    var endLabel = document.getElementById('season-end-label');
    if (endLabel) endLabel.textContent = 'Season ended';
    render();
  }

  window.lbToggleAuto = function() {
    if (seasonOver) return;
    var btn = document.getElementById('lb-auto-btn');
    if (autoRunning) {
      clearInterval(autoInterval);
      autoInterval = null;
      autoRunning = false;
      if (btn) btn.textContent = '▶ Resume Auto-Update';
    } else {
      autoInterval = setInterval(tick, 2000);
      autoRunning = true;
      if (btn) btn.textContent = '⏸ Pause Auto-Update';
    }
  };

  window.lbFastForward = function() {
    if (seasonOver) return;
    for (var i = 0; i < 60; i++) {
      ALL_PLAYERS.forEach(function(p) {
        p.score += Math.floor(Math.random() * 300);
      });
      seasonElapsed += 900;
    }
    var pct = Math.min(100, (seasonElapsed / SEASON_DURATION) * 100);
    var fill = document.getElementById('season-fill');
    if (fill) fill.style.width = pct.toFixed(1) + '%';
    var remaining = Math.max(0, SEASON_DURATION - seasonElapsed);
    var timer = document.getElementById('season-time');
    if (timer) timer.textContent = fmtDuration(remaining);
    if (remaining <= 0 && !seasonOver) { endSeason(); return; }
    render();
  };

  window.lbResetSeason = function() {
    seasonOver = false;
    seasonElapsed = 100;
    updateCount = 0;
    Object.keys(prevRanks).forEach(function(k) { delete prevRanks[k]; });
    Object.keys(deltaMap).forEach(function(k) { delete deltaMap[k]; });
    ALL_PLAYERS.forEach(function(p, i) { p.score = Math.floor(Math.random() * 30000) + 10000; });
    var badge = document.getElementById('live-badge');
    if (badge) { badge.textContent = '● LIVE'; badge.style.color = ''; badge.style.borderColor = ''; }
    var status = document.getElementById('lb-status');
    if (status) status.textContent = '';
    var endLabel = document.getElementById('season-end-label');
    if (endLabel) endLabel.textContent = '48h season';
    var uc = document.getElementById('update-counter');
    if (uc) uc.textContent = '0 updates';
    if (!autoRunning) {
      var btn = document.getElementById('lb-auto-btn');
      if (btn) btn.textContent = '⏸ Pause Auto-Update';
      autoRunning = true;
    }
    if (autoInterval) clearInterval(autoInterval);
    autoInterval = setInterval(tick, 2000);
    render();
  };

  render();
  autoInterval = setInterval(tick, 2000);
})();
</script>

---

## 10. Capacity Estimate

<table class="comp-table">
  <thead><tr><th>Metric</th><th>Number</th></tr></thead>
  <tbody>
    <tr><td>Players</td><td>100 million</td></tr>
    <tr><td>ZSET memory</td><td>~5 GB (50 bytes/player)</td></tr>
    <tr><td>Score updates/sec</td><td>100,000</td></tr>
    <tr><td>Top-100 reads/sec</td><td>500,000</td></tr>
    <tr><td>ZADD latency</td><td>~0.1 ms (O log N)</td></tr>
    <tr><td>ZREVRANGE top-100 latency</td><td>~0.5 ms</td></tr>
    <tr><td>ZREVRANK latency</td><td>~0.15 ms (27 skip-list hops)</td></tr>
    <tr><td>Redis primaries needed (100K ZADD/sec)</td><td>2–4 (50K writes/sec/node comfortable)</td></tr>
    <tr><td>WebSocket connections (top-100 watchers)</td><td>~100K concurrent</td></tr>
    <tr><td>Fan-out broadcast cost per top-100 change</td><td>~100K × 500 bytes = 50 MB/event</td></tr>
  </tbody>
</table>

<div class="callout callout-green">
<strong>Key insight:</strong> Redis ZSET operations are O(log N). Going from 1M to 100M players adds only log₂(100) ≈ 7 extra skip-list hops. The latency increase from 1M to 100M players is negligible — about 30 microseconds. This is why Redis ZSET scales so gracefully.
</div>

---

## 11. Architecture Summary

<div class="code-wrap">
<div class="code-lang">architecture</div>
<pre class="code-block"><span class="cm">Mobile Game Client</span>
  <span class="op">|</span>
  <span class="op">|</span>  POST /match/result  (score, userId, matchId)
  <span class="op">v</span>
<span class="ty">Match Result Service</span>          <span class="cm">stateless, x20 pods</span>
  <span class="op">|</span>  validate, deduplicate (matchId → idempotency key)
  <span class="op">|</span>  compute new score (points + bonus)
  <span class="op">v</span>
<span class="pp">Redis Cluster</span>
  <span class="op">|</span>  ZADD leaderboard:global   encoded_score   userId
  <span class="op">|</span>  ZADD leaderboard:weekly   encoded_score   userId
  <span class="op">|</span>  ZADD leaderboard:region:X encoded_score   userId
  <span class="op">|</span>
  <span class="op">+--------+----------------+</span>
  <span class="op">|</span>                        <span class="op">|</span>
  <span class="op">v</span>                        <span class="op">v</span>
<span class="ty">Rank API</span>                <span class="ty">Top-100 Watcher</span>
  <span class="op">|</span>  ZREVRANK               <span class="op">|</span>  poll every 500ms
  <span class="op">|</span>  ZREVRANGE nearby       <span class="op">|</span>  compute diff
  <span class="op">|</span>  ZSCORE friends         <span class="op">v</span>
  <span class="op">v</span>                   <span class="pp">Redis Pub/Sub</span>
<span class="fn">REST / gRPC clients</span>         <span class="op">|</span>
                            <span class="op">v</span>
                      <span class="ty">WebSocket Fan-out</span>
                            <span class="op">|</span>  x5 nodes, 20K conn each
                            <span class="op">v</span>
                       <span class="cm">Live Clients (top-100 watchers)</span>

<span class="cm">Write path also fans to:</span>
<span class="ty">PostgreSQL</span>  <span class="cm">→  match history, audit log</span>
<span class="ty">Kafka</span>       <span class="cm">→  analytics, anti-cheat pipeline</span></pre>
</div>

### Trade-offs Worth Discussing in an Interview

<table class="comp-table">
  <thead><tr><th>Decision</th><th>Chosen</th><th>Alternative</th><th>Why chosen</th></tr></thead>
  <tbody>
    <tr><td>Rank store</td><td>Redis ZSET</td><td>PostgreSQL + index</td><td>O(log N) all ops; no index contention at 100K writes/sec</td></tr>
    <tr><td>Tie-breaking</td><td>Encoded timestamp in score</td><td>Lex order of userId</td><td>Deterministic; "first to achieve wins" is better UX</td></tr>
    <tr><td>Live updates</td><td>WebSocket + poll ZREVRANGE</td><td>Redis keyspace notifications</td><td>Polling is simpler; keyspace notifications at scale create noisy fan-out</td></tr>
    <tr><td>Friends leaderboard</td><td>Pipeline ZSCORE per friend</td><td>Per-user friends ZSET</td><td>Simpler; only add per-user ZSET if friend list exceeds ~5000</td></tr>
    <tr><td>Durability</td><td>Redis AOF + RDB snapshots</td><td>Rebuild from PostgreSQL on restart</td><td>AOF gives sub-second durability; rebuild from PG is acceptable fallback</td></tr>
    <tr><td>Score validation</td><td>Match result deduplication by matchId</td><td>Client-side score submission</td><td>Prevents duplicate submissions on retry; matchId is server-generated</td></tr>
  </tbody>
</table>

---

*Design a leaderboard, and you touch O(log N) data structures, tie-breaking with composite keys, high write throughput, real-time fan-out, and the psychology of competitive ranking. The key insight: Redis Sorted Set is the right abstraction — not because SQL can't do it, but because ZSET does exactly this and nothing else, with optimal complexity at every operation.*
