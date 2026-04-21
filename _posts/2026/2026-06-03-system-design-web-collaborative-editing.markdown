---
layout: post
title: "System Design: Collaborative Document Editing — How Google Docs Works"
date: 2026-06-03 10:00:00 +0000
categories: ["post"]
tags: [system-design, crdt, operational-transforms, google-docs, real-time, collaboration, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios
</div>

{: class="marginalia" }
Google Docs launched<br/>in 2006. Real-time<br/>multi-user editing felt<br/>like magic then — it<br/>still requires serious<br/>distributed systems<br/>thinking to build.

Design Google Docs. Multiple users edit the same document at the same time. Changes from any user appear in real-time on every other screen. The document must always be consistent — no lost edits, no corrupted state, no divergent copies.

**The question:** *Design a collaborative document editor like Google Docs. Support concurrent edits from multiple users. Guarantee convergence — all clients must end up with the same document.*

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

.stat-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin:1.5rem 0; }
.stat-card { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:1.2rem;text-align:center; }
.stat-num  { font-size:1.5rem;font-weight:800;color:#fbef8a;display:block;line-height:1.2; }
.stat-lbl  { font-size:.72rem;color:rgba(255,255,255,.45);margin-top:.3rem;text-transform:uppercase;letter-spacing:.07em; }

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
.viz-btn { padding:6px 14px;border-radius:6px;border:1px solid #3a3b40;background:#1a1b1f;color:rgba(255,255,255,.75);font-size:.8rem;cursor:pointer;transition:all .2s;font-family:inherit; }
.viz-btn:hover { border-color:#7bcdab;color:#7bcdab; }
.viz-btn.active { border-color:#fbef8a;color:#fbef8a;background:#1e1d08; }
.viz-btn.run { background:#7bcdab;color:#19191c;border:none;border-radius:8px;font-weight:700;padding:.5rem 1.2rem;cursor:pointer; }
.viz-btn.run:hover { background:#5eb896; }

.editor-panel { background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:1rem;flex:1;min-width:0; }
.editor-label { font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem; }
.editor-label.a { color:#fbef8a; }
.editor-label.b { color:#7bcdab; }
.editor-text { font-family:"JetBrains Mono","Fira Code",monospace;font-size:.95rem;letter-spacing:.04em;line-height:1.8;color:rgba(255,255,255,.85);min-height:40px; }
.editor-text .ins { background:rgba(123,205,171,.18);color:#7bcdab;border-radius:2px; }
.editor-text .del { background:rgba(240,128,128,.18);color:#f08080;text-decoration:line-through;border-radius:2px; }

.ot-step { background:#1e1f24;border:1px solid #2e2f35;border-radius:8px;padding:.8rem 1rem;margin:.4rem 0;font-size:.82rem;line-height:1.7;color:rgba(255,255,255,.75);display:none; }
.ot-step.show { display:block; }
.ot-step strong { color:#fbef8a; }
.ot-step .code { font-family:"JetBrains Mono","Fira Code",monospace;color:#7bcdab;background:#111214;padding:1px 5px;border-radius:3px; }

.crdt-char { display:inline-flex;flex-direction:column;align-items:center;margin:2px 1px;cursor:pointer;transition:all .2s; }
.crdt-char .ch { font-family:"JetBrains Mono","Fira Code",monospace;font-size:1.1rem;font-weight:700;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid #2e2f35;background:#1a1b1f;color:rgba(255,255,255,.85); }
.crdt-char .cid { font-size:.55rem;color:rgba(255,255,255,.3);font-family:"JetBrains Mono","Fira Code",monospace;text-align:center;margin-top:2px;line-height:1.2; }
.crdt-char:hover .ch { border-color:#7bcdab;color:#7bcdab; }
.crdt-char.new-a .ch { border-color:#fbef8a;background:#25240e;color:#fbef8a; }
.crdt-char.new-b .ch { border-color:#7bcdab;background:#1a2e22;color:#7bcdab; }

.arch-box { border-radius:8px;padding:.7rem 1rem;text-align:center;font-size:.78rem;line-height:1.5; }
.arch-client { background:#25240e;border:1px solid rgba(251,239,138,.3);color:#fbef8a; }
.arch-server { background:#1a2e22;border:1px solid rgba(123,205,171,.3);color:#7bcdab; }
.arch-store  { background:#0e1e2e;border:1px solid rgba(137,192,208,.3);color:#89c0d0; }
.arch-arrow  { color:rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:1.1rem;padding:0 .3rem; }
.arch-label  { font-size:.65rem;color:rgba(255,255,255,.35);margin-top:.3rem; }
</style>

---

## 1. The Core Problem

Two users open the same document simultaneously. Both see **"Hello"**. Now:

- **User A** inserts `" World"` at position 5 → sees `"Hello World"`
- **User B** deletes `"H"` at position 0 → sees `"ello"`

Each operation is valid in isolation. But both happen **concurrently** — neither user has seen the other's change when they act. If you apply both operations naively in different orders, you get different results:

<div class="code-wrap">
<div class="code-lang">pseudocode</div>
<pre class="code-block"><span class="cm"># Order 1: A first, then B</span>
<span class="st">"Hello"</span>
→ <span class="fn">INSERT</span>(<span class="st">" World"</span>, pos=<span class="nu">5</span>) → <span class="st">"Hello World"</span>
→ <span class="fn">DELETE</span>(pos=<span class="nu">0</span>)            → <span class="st">"ello World"</span>

<span class="cm"># Order 2: B first, then A</span>
<span class="st">"Hello"</span>
→ <span class="fn">DELETE</span>(pos=<span class="nu">0</span>)            → <span class="st">"ello"</span>
→ <span class="fn">INSERT</span>(<span class="st">" World"</span>, pos=<span class="nu">5</span>) → <span class="st">"ello World"</span> <span class="cm"># but position 5 is now past the end!</span>
<span class="cm"># → or corrupted, depending on how you handle out-of-bounds</span></pre>
</div>

The two clients **diverge**. This is the **concurrent edit conflict problem**, and it is the central challenge of collaborative editing at any scale.

<div class="callout callout-yellow">
<strong>Convergence requirement:</strong> Every client that applies the same set of operations — in any order — must end up with the same document. This property is called <strong>strong eventual consistency</strong>.
</div>

---

## 2. Level 1 — Pessimistic Locking

The simplest solution: lock the document when someone is editing. Only one user types at a time.

<div class="code-wrap">
<div class="code-lang">pseudocode</div>
<pre class="code-block"><span class="kw">function</span> <span class="fn">acquireLock</span>(docId, userId):
    <span class="kw">if</span> locks[docId] <span class="op">==</span> <span class="kw">null</span>:
        locks[docId] <span class="op">=</span> userId
        <span class="kw">return</span> <span class="kw">true</span>
    <span class="kw">return</span> <span class="kw">false</span>  <span class="cm"># Someone else has the lock — you must wait</span>

<span class="kw">function</span> <span class="fn">releaseLock</span>(docId, userId):
    <span class="kw">if</span> locks[docId] <span class="op">==</span> userId:
        locks[docId] <span class="op">=</span> <span class="kw">null</span></pre>
</div>

**Why this fails as a product:** Google Docs with a "Document locked — someone else is editing" banner would be unusable. Real-time collaboration is the product's core value proposition. Locking destroys it. You also have to handle lock expiry (what if the lock holder crashes?), which adds more complexity.

Pessimistic locking is correct for preventing conflicts but catastrophically wrong for collaborative UX.

---

## 3. Level 2 — Last-Write-Wins

Every operation gets a timestamp. When two operations conflict, the one with the higher timestamp wins.

<div class="code-wrap">
<div class="code-lang">pseudocode</div>
<pre class="code-block"><span class="ty">Operation</span> {
    content:   <span class="ty">string</span>
    position:  <span class="ty">int</span>
    timestamp: <span class="ty">int</span>   <span class="cm"># wall clock on client machine</span>
    userId:    <span class="ty">string</span>
}

<span class="kw">function</span> <span class="fn">applyWithLWW</span>(ops):
    <span class="cm"># Sort by timestamp, last writer wins on conflict</span>
    <span class="kw">return</span> ops.<span class="fn">sort</span>((a, b) <span class="op">=></span> b.timestamp <span class="op">-</span> a.timestamp)[<span class="nu">0</span>]</pre>
</div>

**Why this fails:** Client clocks are **not synchronized**. NTP drift can be hundreds of milliseconds. A user on a laptop with a slightly fast clock always wins. More critically, LWW silently **discards** one user's edit — User B's carefully typed paragraph vanishes with no warning. That is not "conflict resolution"; it is data loss.

<div class="callout callout-red">
<strong>The silent data loss problem:</strong> In LWW, every "conflict resolution" is actually a decision to silently throw away one user's work. For a document editor, this is unacceptable. Users must not lose edits they typed.
</div>

---

## 4. Level 3 — Operational Transformation (OT)

The original Google Docs approach (2006–2010). Still used in many systems today.

**Core idea:** when you receive a remote operation that conflicts with your local state, *transform* the remote operation to account for what you have already done locally, before applying it.

### How OT Works

Every operation has a type (INSERT or DELETE), a position, and content. The transformation function `T(op1, op2)` returns a new `op1` that has been adjusted to account for `op2` having already been applied.

<div class="code-wrap">
<div class="code-lang">javascript</div>
<pre class="code-block"><span class="cm">// Transform op1 assuming op2 was already applied</span>
<span class="kw">function</span> <span class="fn">transform</span>(op1, op2) {
  <span class="kw">if</span> (op1.type <span class="op">===</span> <span class="st">'INSERT'</span> <span class="op">&&</span> op2.type <span class="op">===</span> <span class="st">'INSERT'</span>) {
    <span class="kw">if</span> (op2.position <span class="op"><=</span> op1.position) {
      <span class="cm">// op2 inserted before op1's target — shift op1 right</span>
      <span class="kw">return</span> { ...op1, position: op1.position <span class="op">+</span> op2.content.length };
    }
    <span class="kw">return</span> op1; <span class="cm">// op2 was after op1's target — no shift needed</span>
  }

  <span class="kw">if</span> (op1.type <span class="op">===</span> <span class="st">'INSERT'</span> <span class="op">&&</span> op2.type <span class="op">===</span> <span class="st">'DELETE'</span>) {
    <span class="kw">if</span> (op2.position <span class="op"><</span> op1.position) {
      <span class="cm">// op2 deleted before op1's target — shift op1 left</span>
      <span class="kw">return</span> { ...op1, position: op1.position <span class="op">-</span> <span class="nu">1</span> };
    }
    <span class="kw">return</span> op1;
  }

  <span class="kw">if</span> (op1.type <span class="op">===</span> <span class="st">'DELETE'</span> <span class="op">&&</span> op2.type <span class="op">===</span> <span class="st">'INSERT'</span>) {
    <span class="kw">if</span> (op2.position <span class="op"><=</span> op1.position) {
      <span class="kw">return</span> { ...op1, position: op1.position <span class="op">+</span> op2.content.length };
    }
    <span class="kw">return</span> op1;
  }

  <span class="kw">if</span> (op1.type <span class="op">===</span> <span class="st">'DELETE'</span> <span class="op">&&</span> op2.type <span class="op">===</span> <span class="st">'DELETE'</span>) {
    <span class="kw">if</span> (op2.position <span class="op"><</span> op1.position) {
      <span class="kw">return</span> { ...op1, position: op1.position <span class="op">-</span> <span class="nu">1</span> };
    }
    <span class="kw">if</span> (op2.position <span class="op">===</span> op1.position) {
      <span class="kw">return</span> <span class="kw">null</span>; <span class="cm">// Both deleted the same character — op1 is a no-op</span>
    }
    <span class="kw">return</span> op1;
  }
}</pre>
</div>

### OT Example

Document: `"Hello"`. User A: `INSERT("!", 5)` → `"Hello!"`. User B (concurrently): `INSERT("?", 5)` → `"Hello?"`. B's op arrives at the server after A's op was already applied.

<div class="code-wrap">
<div class="code-lang">pseudocode</div>
<pre class="code-block"><span class="cm"># Server has already applied A's INSERT("!", 5)</span>
<span class="cm"># Document state: "Hello!"</span>

<span class="cm"># B's original op: INSERT("?", 5)</span>
<span class="cm"># Transform against A's INSERT("!", 5):</span>
<span class="cm">#   A inserted at position 5 → B's position 5 must shift to 6</span>
transformed_B <span class="op">=</span> <span class="fn">transform</span>(INSERT(<span class="st">"?"</span>, <span class="nu">5</span>), INSERT(<span class="st">"!"</span>, <span class="nu">5</span>))
<span class="cm"># → INSERT("?", 6)</span>

<span class="cm"># Apply transformed_B to "Hello!"</span>
<span class="cm"># → "Hello!?"  ✓  (both users' intent preserved)</span></pre>
</div>

{: class="marginalia" }
**Google Docs originally<br/>used OT, implemented<br/>from scratch in JavaScript.<br/>The OT algorithm for<br/>rich text — handling<br/>concurrent bold+italic+<br/>cursor+insert correctly —<br/>requires dozens of<br/>transformation cases.**

### Interactive OT Demo

<div class="viz-wrap">
  <div class="viz-title">&#9654; Operational Transform — Conflict Visualizer</div>

  <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.2rem;">
    <div class="editor-panel">
      <div class="editor-label a">&#9654; User A</div>
      <div class="editor-text" id="ot-doc-a">Hello</div>
      <div style="margin-top:.7rem;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="viz-btn" onclick="otUserA('insert')">Insert "!" at end</button>
        <button class="viz-btn" onclick="otUserA('delete')">Delete first char</button>
      </div>
    </div>
    <div class="editor-panel">
      <div class="editor-label b">&#9654; User B</div>
      <div class="editor-text" id="ot-doc-b">Hello</div>
      <div style="margin-top:.7rem;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="viz-btn" onclick="otUserB('insert')">Insert "?" at end</button>
        <button class="viz-btn" onclick="otUserB('delete')">Delete first char</button>
      </div>
    </div>
  </div>

  <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem;">
    <button class="viz-btn run" onclick="applyWithoutOT()">Apply without OT</button>
    <button class="viz-btn run" style="background:#fbef8a;color:#19191c;" onclick="applyWithOT()">Apply with OT</button>
    <button class="viz-btn" onclick="otReset()">Reset</button>
  </div>

  <div id="ot-steps-wrap"></div>

  <div style="margin-top:1rem;display:flex;gap:1rem;flex-wrap:wrap;">
    <div class="editor-panel" style="flex:1;min-width:0;">
      <div class="editor-label" style="color:rgba(255,255,255,.4);">Without OT (merged result)</div>
      <div class="editor-text" id="ot-result-naive" style="color:rgba(255,255,255,.4);">—</div>
    </div>
    <div class="editor-panel" style="flex:1;min-width:0;">
      <div class="editor-label" style="color:#7bcdab;">With OT (merged result)</div>
      <div class="editor-text" id="ot-result-ot" style="color:rgba(255,255,255,.4);">—</div>
    </div>
  </div>
</div>

<script>
(function() {
  var docBase = "Hello";
  var opA = null;
  var opB = null;

  window.otUserA = function(type) {
    if (type === 'insert') {
      opA = { type: 'INSERT', content: '!', position: docBase.length };
      document.getElementById('ot-doc-a').textContent = docBase + '!';
    } else {
      opA = { type: 'DELETE', position: 0 };
      document.getElementById('ot-doc-a').textContent = docBase.slice(1);
    }
  };

  window.otUserB = function(type) {
    if (type === 'insert') {
      opB = { type: 'INSERT', content: '?', position: docBase.length };
      document.getElementById('ot-doc-b').textContent = docBase + '?';
    } else {
      opB = { type: 'DELETE', position: 0 };
      document.getElementById('ot-doc-b').textContent = docBase.slice(1);
    }
  };

  function applyOp(doc, op) {
    if (!op) return doc;
    if (op.type === 'INSERT') {
      return doc.slice(0, op.position) + op.content + doc.slice(op.position);
    }
    if (op.type === 'DELETE') {
      return doc.slice(0, op.position) + doc.slice(op.position + 1);
    }
    return doc;
  }

  function transformOp(op1, op2) {
    if (!op1 || !op2) return op1;
    if (op1.type === 'INSERT' && op2.type === 'INSERT') {
      if (op2.position <= op1.position) {
        return Object.assign({}, op1, { position: op1.position + op2.content.length });
      }
      return op1;
    }
    if (op1.type === 'INSERT' && op2.type === 'DELETE') {
      if (op2.position < op1.position) {
        return Object.assign({}, op1, { position: op1.position - 1 });
      }
      return op1;
    }
    if (op1.type === 'DELETE' && op2.type === 'INSERT') {
      if (op2.position <= op1.position) {
        return Object.assign({}, op1, { position: op1.position + op2.content.length });
      }
      return op1;
    }
    if (op1.type === 'DELETE' && op2.type === 'DELETE') {
      if (op2.position < op1.position) {
        return Object.assign({}, op1, { position: op1.position - 1 });
      }
      if (op2.position === op1.position) return null;
      return op1;
    }
    return op1;
  }

  function addStep(html) {
    var wrap = document.getElementById('ot-steps-wrap');
    var div = document.createElement('div');
    div.className = 'ot-step show';
    div.innerHTML = html;
    wrap.appendChild(div);
  }

  function opDesc(op) {
    if (!op) return '<span class="code">none</span>';
    if (op.type === 'INSERT') return '<span class="code">INSERT("' + op.content + '", pos=' + op.position + ')</span>';
    return '<span class="code">DELETE(pos=' + op.position + ')</span>';
  }

  window.applyWithoutOT = function() {
    if (!opA && !opB) { alert('Choose an operation for User A and User B first.'); return; }
    document.getElementById('ot-steps-wrap').innerHTML = '';
    var after_a = applyOp(docBase, opA);
    var naive = applyOp(after_a, opB);
    addStep('<strong>No OT:</strong> Apply A first, then B with its original (untransformed) position.<br>' +
      'A: ' + opDesc(opA) + ' on <span class="code">"' + docBase + '"</span> → <span class="code">"' + after_a + '"</span><br>' +
      'B: ' + opDesc(opB) + ' on <span class="code">"' + after_a + '"</span> → <span class="code">"' + naive + '"</span>');
    var el = document.getElementById('ot-result-naive');
    el.textContent = naive;
    el.style.color = '#f08080';
  };

  window.applyWithOT = function() {
    if (!opA && !opB) { alert('Choose an operation for User A and User B first.'); return; }
    document.getElementById('ot-steps-wrap').innerHTML = '';

    var after_a = applyOp(docBase, opA);
    var transformed_b = transformOp(opB, opA);
    var result = applyOp(after_a, transformed_b);

    addStep('<strong>Step 1:</strong> Apply A\'s op to base document.<br>' +
      opDesc(opA) + ' on <span class="code">"' + docBase + '"</span> → <span class="code">"' + after_a + '"</span>');
    addStep('<strong>Step 2:</strong> Transform B\'s op against A\'s op.<br>' +
      'Original B: ' + opDesc(opB) + '<br>' +
      'Transformed B: ' + opDesc(transformed_b));
    addStep('<strong>Step 3:</strong> Apply transformed B to A\'s result.<br>' +
      opDesc(transformed_b) + ' on <span class="code">"' + after_a + '"</span> → <span class="code">"' + result + '"</span>');

    var el = document.getElementById('ot-result-ot');
    el.textContent = result;
    el.style.color = '#7bcdab';
  };

  window.otReset = function() {
    opA = null; opB = null;
    document.getElementById('ot-doc-a').textContent = docBase;
    document.getElementById('ot-doc-b').textContent = docBase;
    document.getElementById('ot-result-naive').textContent = '—';
    document.getElementById('ot-result-naive').style.color = 'rgba(255,255,255,.4)';
    document.getElementById('ot-result-ot').textContent = '—';
    document.getElementById('ot-result-ot').style.color = 'rgba(255,255,255,.4)';
    document.getElementById('ot-steps-wrap').innerHTML = '';
  };
})();
</script>

### OT Limitations

OT works but it has a nasty property: **the transformation function must handle every combination of concurrent operations**. For plain text, there are 4 combinations (INSERT/INSERT, INSERT/DELETE, DELETE/INSERT, DELETE/DELETE). For rich text with formatting (bold, italic, comments, table cells, embedded images), the number of cases explodes into the dozens. Even small bugs in transformation functions can cause subtle divergence that only appears under specific concurrency patterns.

The second critical limitation: **OT requires a central server** to serialize operations. All clients must agree on the canonical order of operations. Peer-to-peer OT is theoretically possible but extraordinarily difficult to get right.

---

## 5. Level 4 — CRDT (Conflict-free Replicated Data Types)

The modern approach. Used by Figma, Notion, Linear, and most new collaborative tools.

**Core insight:** instead of transforming operations based on positions, assign every character a **globally unique ID** and express insertions relative to IDs, not positions. Characters are never "at position 5" — they are "after character ID `abc:3`".

### Why This Solves Convergence

If two users insert characters concurrently "at the same place", in OT they create a conflict that needs transformation. In a CRDT, each character has a unique ID and a pointer to its predecessor ID. Applying both insertions is always safe — the ordering between them is resolved by a deterministic tie-breaking rule (e.g., larger `(timestamp, siteId)` tuple goes first). No server serialization is needed.

<div class="code-wrap">
<div class="code-lang">javascript</div>
<pre class="code-block"><span class="cm">// Each character in a CRDT document</span>
<span class="kw">class</span> <span class="ty">CRDTChar</span> {
  <span class="kw">constructor</span>(char, id, afterId) {
    <span class="kw">this</span>.char    <span class="op">=</span> char;     <span class="cm">// The actual character</span>
    <span class="kw">this</span>.id      <span class="op">=</span> id;       <span class="cm">// Unique ID: "siteId:counter"</span>
    <span class="kw">this</span>.afterId <span class="op">=</span> afterId;  <span class="cm">// Insert after this ID (null = beginning)</span>
    <span class="kw">this</span>.deleted <span class="op">=</span> <span class="kw">false</span>;    <span class="cm">// Tombstone — never physically remove</span>
  }
}

<span class="kw">class</span> <span class="ty">CRDTDocument</span> {
  <span class="kw">constructor</span>(siteId) {
    <span class="kw">this</span>.siteId  <span class="op">=</span> siteId;
    <span class="kw">this</span>.counter <span class="op">=</span> <span class="nu">0</span>;
    <span class="kw">this</span>.chars   <span class="op">=</span> []; <span class="cm">// ordered list of CRDTChar</span>
  }

  <span class="fn">insert</span>(char, afterId) {
    <span class="kw">const</span> id <span class="op">=</span> <span class="kw">this</span>.siteId <span class="op">+</span> <span class="st">':'</span> <span class="op">+</span> (<span class="op">++</span><span class="kw">this</span>.counter);
    <span class="kw">const</span> newChar <span class="op">=</span> <span class="kw">new</span> <span class="ty">CRDTChar</span>(char, id, afterId);
    <span class="kw">this</span>.<span class="fn">_integrate</span>(newChar);
    <span class="kw">return</span> id;
  }

  <span class="fn">_integrate</span>(newChar) {
    <span class="cm">// Find the position of afterId, then insert after it</span>
    <span class="cm">// Tie-break concurrent inserts at same position by ID comparison</span>
    <span class="kw">let</span> insertIdx <span class="op">=</span> <span class="nu">0</span>;
    <span class="kw">for</span> (<span class="kw">let</span> i <span class="op">=</span> <span class="nu">0</span>; i <span class="op"><</span> <span class="kw">this</span>.chars.length; i<span class="op">++</span>) {
      <span class="kw">if</span> (<span class="kw">this</span>.chars[i].id <span class="op">===</span> newChar.afterId) {
        insertIdx <span class="op">=</span> i <span class="op">+</span> <span class="nu">1</span>;
        <span class="cm">// Skip past any chars already inserted here with higher ID (tie-break)</span>
        <span class="kw">while</span> (insertIdx <span class="op"><</span> <span class="kw">this</span>.chars.length
               <span class="op">&&</span> <span class="kw">this</span>.chars[insertIdx].afterId <span class="op">===</span> newChar.afterId
               <span class="op">&&</span> <span class="kw">this</span>.chars[insertIdx].id <span class="op">></span> newChar.id) {
          insertIdx<span class="op">++</span>;
        }
        <span class="kw">break</span>;
      }
    }
    <span class="kw">this</span>.chars.<span class="fn">splice</span>(insertIdx, <span class="nu">0</span>, newChar);
  }

  <span class="fn">delete</span>(id) {
    <span class="cm">// Tombstone — mark deleted but keep in array (preserves IDs for future refs)</span>
    <span class="kw">const</span> ch <span class="op">=</span> <span class="kw">this</span>.chars.<span class="fn">find</span>(c <span class="op">=></span> c.id <span class="op">===</span> id);
    <span class="kw">if</span> (ch) ch.deleted <span class="op">=</span> <span class="kw">true</span>;
  }

  <span class="fn">getText</span>() {
    <span class="kw">return</span> <span class="kw">this</span>.chars.<span class="fn">filter</span>(c <span class="op">=></span> <span class="op">!</span>c.deleted).<span class="fn">map</span>(c <span class="op">=></span> c.char).<span class="fn">join</span>(<span class="st">''</span>);
  }
}</pre>
</div>

{: class="marginalia" }
**Figma switched to<br/>CRDTs in 2019. Their<br/>post "How Figma's<br/>multiplayer technology<br/>works" is one of the<br/>best technical deep-<br/>dives on real-world<br/>CRDT implementation.<br/>They chose CRDTs over<br/>OT because OT requires<br/>a central server to<br/>serialize operations —<br/>CRDTs can work<br/>peer-to-peer.**

### Interactive CRDT Visualizer

<div class="viz-wrap">
  <div class="viz-title">&#9654; CRDT Document — ID-Based Character Nodes</div>

  <div style="margin-bottom:.8rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;">
    <span style="font-size:.8rem;color:rgba(255,255,255,.5);">View mode:</span>
    <button class="viz-btn active" id="crdt-mode-crdt" onclick="setCRDTMode('crdt')">CRDT view (IDs)</button>
    <button class="viz-btn" id="crdt-mode-ot" onclick="setCRDTMode('ot')">OT view (positions)</button>
  </div>

  <div id="crdt-doc-display" style="display:flex;flex-wrap:wrap;gap:2px;padding:.8rem;background:#0e0f12;border-radius:8px;min-height:60px;align-items:flex-start;"></div>

  <div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap;">
    <button class="viz-btn" style="border-color:#fbef8a;color:#fbef8a;" onclick="crdtInsertA()">User A inserts "X" here</button>
    <button class="viz-btn" style="border-color:#7bcdab;color:#7bcdab;" onclick="crdtInsertB()">User B inserts "Y" here</button>
    <button class="viz-btn" onclick="crdtMerge()">Merge (apply both)</button>
    <button class="viz-btn" onclick="crdtReset()">Reset</button>
  </div>

  <div id="crdt-log" style="margin-top:1rem;font-size:.78rem;color:rgba(255,255,255,.5);font-family:'JetBrains Mono','Fira Code',monospace;line-height:1.8;"></div>
</div>

<script>
(function() {
  var crdtMode = 'crdt';
  var docChars = [
    { char: 'H', id: 'init:1', afterId: null,    deleted: false },
    { char: 'e', id: 'init:2', afterId: 'init:1', deleted: false },
    { char: 'l', id: 'init:3', afterId: 'init:2', deleted: false },
    { char: 'l', id: 'init:4', afterId: 'init:3', deleted: false },
    { char: 'o', id: 'init:5', afterId: 'init:4', deleted: false }
  ];
  var pendingA = null;
  var pendingB = null;

  function shortId(id) {
    return id.replace('init:', 'i').replace('A:', 'A').replace('B:', 'B');
  }

  function renderDoc() {
    var display = document.getElementById('crdt-doc-display');
    display.innerHTML = '';
    var visible = docChars.filter(function(c) { return !c.deleted; });
    visible.forEach(function(c, i) {
      var wrap = document.createElement('div');
      wrap.className = 'crdt-char' + (c.newA ? ' new-a' : '') + (c.newB ? ' new-b' : '');
      wrap.title = 'ID: ' + c.id + ' | after: ' + (c.afterId || 'START');
      var ch = document.createElement('div');
      ch.className = 'ch';
      ch.textContent = c.char;
      wrap.appendChild(ch);
      if (crdtMode === 'crdt') {
        var cid = document.createElement('div');
        cid.className = 'cid';
        cid.textContent = shortId(c.id);
        wrap.appendChild(cid);
      } else {
        var cid = document.createElement('div');
        cid.className = 'cid';
        cid.textContent = 'pos:' + i;
        wrap.appendChild(cid);
      }
      display.appendChild(wrap);
    });
  }

  function log(msg) {
    var el = document.getElementById('crdt-log');
    el.innerHTML = el.innerHTML + msg + '<br>';
  }

  function integrate(newChar) {
    var insertIdx = 0;
    for (var i = 0; i < docChars.length; i++) {
      if (docChars[i].id === newChar.afterId) {
        insertIdx = i + 1;
        while (insertIdx < docChars.length
               && docChars[insertIdx].afterId === newChar.afterId
               && docChars[insertIdx].id > newChar.id) {
          insertIdx++;
        }
        break;
      }
    }
    docChars.splice(insertIdx, 0, newChar);
  }

  window.setCRDTMode = function(mode) {
    crdtMode = mode;
    document.getElementById('crdt-mode-crdt').className = 'viz-btn' + (mode === 'crdt' ? ' active' : '');
    document.getElementById('crdt-mode-ot').className   = 'viz-btn' + (mode === 'ot'   ? ' active' : '');
    renderDoc();
  };

  window.crdtInsertA = function() {
    var afterId = 'init:2';
    pendingA = { char: 'X', id: 'A:1', afterId: afterId, deleted: false, newA: true };
    log('[User A] Wants to insert "X" after ID ' + afterId + ' — local op created: {id:"A:1", afterId:"' + afterId + '"}');
  };

  window.crdtInsertB = function() {
    var afterId = 'init:2';
    pendingB = { char: 'Y', id: 'B:1', afterId: afterId, deleted: false, newB: true };
    log('[User B] Wants to insert "Y" after ID ' + afterId + ' — local op created: {id:"B:1", afterId:"' + afterId + '"}');
  };

  window.crdtMerge = function() {
    if (!pendingA && !pendingB) { log('[merge] No pending ops.'); return; }
    if (pendingA) { integrate(pendingA); log('[merge] Applied A\'s op. No position math needed — just ID lookup.'); pendingA = null; }
    if (pendingB) { integrate(pendingB); log('[merge] Applied B\'s op. Tie-break: "B:1" < "A:1" so B goes after A.'); pendingB = null; }
    log('[result] Document: "' + docChars.filter(function(c){return!c.deleted;}).map(function(c){return c.char;}).join('') + '"');
    log('[result] Both inserts applied with no conflict, no position transformation needed.');
    renderDoc();
  };

  window.crdtReset = function() {
    docChars = [
      { char: 'H', id: 'init:1', afterId: null,    deleted: false },
      { char: 'e', id: 'init:2', afterId: 'init:1', deleted: false },
      { char: 'l', id: 'init:3', afterId: 'init:2', deleted: false },
      { char: 'l', id: 'init:4', afterId: 'init:3', deleted: false },
      { char: 'o', id: 'init:5', afterId: 'init:4', deleted: false }
    ];
    pendingA = null; pendingB = null;
    document.getElementById('crdt-log').innerHTML = '';
    renderDoc();
  };

  renderDoc();
})();
</script>

### Types of Text CRDTs

<table class="comp-table">
  <thead>
    <tr>
      <th>Algorithm</th>
      <th>Approach</th>
      <th>Used by</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>RGA</strong></td>
      <td>Each char has unique (timestamp, siteId) tuple; ordering is deterministic</td>
      <td>Many research systems</td>
      <td>Simple, well-studied</td>
    </tr>
    <tr>
      <td><strong>LSEQ</strong></td>
      <td>Tree-based fractional position identifiers</td>
      <td>Academic</td>
      <td>Space-efficient IDs</td>
    </tr>
    <tr>
      <td><strong>Logoot/WOOT</strong></td>
      <td>Position identifiers are tuples; unique across all sites</td>
      <td>Atom Teletype (early)</td>
      <td>Classic, readable spec</td>
    </tr>
    <tr>
      <td><strong>Yjs</strong></td>
      <td>YATA algorithm — custom CRDT with efficient encoding</td>
      <td>VS Code Live Share, Overleaf, ProseMirror</td>
      <td><span class="badge badge-green">Production proven</span></td>
    </tr>
    <tr>
      <td><strong>Automerge</strong></td>
      <td>JSON-compatible CRDT; RGA for sequences</td>
      <td>Various collaborative tools</td>
      <td>Rich data model</td>
    </tr>
  </tbody>
</table>

---

## 6. Level 5 — Real-Time Transport

Operations need to reach all collaborators within milliseconds. The transport layer is separate from the conflict-resolution algorithm.

### WebSocket Architecture

<div class="code-wrap">
<div class="code-lang">javascript</div>
<pre class="code-block"><span class="cm">// Client — connect to collaboration server and send ops</span>
<span class="kw">class</span> <span class="ty">CollabClient</span> {
  <span class="kw">constructor</span>(docId, userId) {
    <span class="kw">this</span>.ws <span class="op">=</span> <span class="kw">new</span> <span class="ty">WebSocket</span>(<span class="st">'wss://collab.example.com/doc/'</span> <span class="op">+</span> docId);
    <span class="kw">this</span>.userId <span class="op">=</span> userId;
    <span class="kw">this</span>.opBuffer <span class="op">=</span> [];     <span class="cm">// Ops queued while offline</span>
    <span class="kw">this</span>.revision <span class="op">=</span> <span class="nu">0</span>;     <span class="cm">// Last server revision seen</span>

    <span class="kw">this</span>.ws.<span class="fn">onopen</span> <span class="op">=</span> () <span class="op">=></span> <span class="kw">this</span>.<span class="fn">_flush</span>();
    <span class="kw">this</span>.ws.<span class="fn">onmessage</span> <span class="op">=</span> (e) <span class="op">=></span> <span class="kw">this</span>.<span class="fn">_recv</span>(<span class="ty">JSON</span>.<span class="fn">parse</span>(e.data));
    <span class="kw">this</span>.ws.<span class="fn">onclose</span>  <span class="op">=</span> () <span class="op">=></span> <span class="fn">setTimeout</span>(() <span class="op">=></span> <span class="kw">this</span>.<span class="fn">_reconnect</span>(), <span class="nu">1000</span>);
  }

  <span class="fn">sendOp</span>(op) {
    <span class="kw">const</span> msg <span class="op">=</span> { type: <span class="st">'op'</span>, op, revision: <span class="kw">this</span>.revision, userId: <span class="kw">this</span>.userId };
    <span class="kw">if</span> (<span class="kw">this</span>.ws.readyState <span class="op">===</span> <span class="ty">WebSocket</span>.OPEN) {
      <span class="kw">this</span>.ws.<span class="fn">send</span>(<span class="ty">JSON</span>.<span class="fn">stringify</span>(msg));
    } <span class="kw">else</span> {
      <span class="kw">this</span>.opBuffer.<span class="fn">push</span>(msg);  <span class="cm">// Queue for when reconnected</span>
    }
  }

  <span class="fn">_recv</span>(msg) {
    <span class="kw">if</span> (msg.type <span class="op">===</span> <span class="st">'op'</span> <span class="op">&&</span> msg.userId <span class="op">!==</span> <span class="kw">this</span>.userId) {
      <span class="kw">this</span>.revision <span class="op">=</span> msg.revision;
      <span class="fn">applyRemoteOp</span>(msg.op);  <span class="cm">// Apply the OT-transformed / CRDT op</span>
    }
    <span class="kw">if</span> (msg.type <span class="op">===</span> <span class="st">'ack'</span>) {
      <span class="kw">this</span>.revision <span class="op">=</span> msg.revision;  <span class="cm">// Server confirmed our op</span>
    }
    <span class="kw">if</span> (msg.type <span class="op">===</span> <span class="st">'presence'</span>) {
      <span class="fn">updateCursor</span>(msg.userId, msg.position, msg.color);
    }
  }

  <span class="fn">_flush</span>() {
    <span class="kw">while</span> (<span class="kw">this</span>.opBuffer.length) {
      <span class="kw">this</span>.ws.<span class="fn">send</span>(<span class="ty">JSON</span>.<span class="fn">stringify</span>(<span class="kw">this</span>.opBuffer.<span class="fn">shift</span>()));
    }
  }
}</pre>
</div>

### Operation Flow

Every keystroke generates an operation that travels through this pipeline:

<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin:1.5rem 0;align-items:stretch;" id="flow-pipeline">
  <div class="arch-box arch-client" style="flex:1;min-width:90px;">
    <div style="font-size:.9rem;font-weight:700;">Client A</div>
    <div class="arch-label">types char</div>
  </div>
  <div class="arch-arrow">→</div>
  <div class="arch-box" style="flex:1;min-width:90px;background:#1a1b1f;border:1px solid #2e2f35;color:rgba(255,255,255,.65);">
    <div style="font-size:.9rem;font-weight:700;">WebSocket</div>
    <div class="arch-label">op + revision</div>
  </div>
  <div class="arch-arrow">→</div>
  <div class="arch-box arch-server" style="flex:1;min-width:90px;">
    <div style="font-size:.9rem;font-weight:700;">Collab Server</div>
    <div class="arch-label">OT/CRDT transform</div>
  </div>
  <div class="arch-arrow">→</div>
  <div class="arch-box arch-store" style="flex:1;min-width:90px;">
    <div style="font-size:.9rem;font-weight:700;">Op Log DB</div>
    <div class="arch-label">append operation</div>
  </div>
  <div class="arch-arrow">→</div>
  <div class="arch-box arch-client" style="flex:1;min-width:90px;">
    <div style="font-size:.9rem;font-weight:700;">Clients B,C,D</div>
    <div class="arch-label">broadcast</div>
  </div>
</div>

The server **serializes** the operation stream. This is why OT requires a server — the server assigns a global revision number to each op, and clients use that revision to know which ops they need to transform against.

---

## 7. Level 6 — Persistence &amp; Version History

### Operation Log

Every operation is appended to an **operation log** — an immutable, ordered record of every change ever made to the document.

<div class="code-wrap">
<div class="code-lang">sql</div>
<pre class="code-block"><span class="cm">-- Operation log table</span>
<span class="kw">CREATE TABLE</span> <span class="ty">doc_operations</span> (
  revision   <span class="ty">BIGINT</span>      <span class="kw">NOT NULL</span>,
  doc_id     <span class="ty">UUID</span>        <span class="kw">NOT NULL</span>,
  user_id    <span class="ty">UUID</span>        <span class="kw">NOT NULL</span>,
  op_type    <span class="ty">VARCHAR</span>(<span class="nu">16</span>) <span class="kw">NOT NULL</span>, <span class="cm">-- INSERT | DELETE | FORMAT</span>
  op_data    <span class="ty">JSONB</span>       <span class="kw">NOT NULL</span>, <span class="cm">-- {position, content, attrs, ...}</span>
  created_at <span class="ty">TIMESTAMPTZ</span> <span class="kw">NOT NULL</span> <span class="kw">DEFAULT</span> <span class="fn">now</span>(),
  <span class="kw">PRIMARY KEY</span> (doc_id, revision)
);

<span class="cm">-- Snapshot table (periodic compaction)</span>
<span class="kw">CREATE TABLE</span> <span class="ty">doc_snapshots</span> (
  doc_id          <span class="ty">UUID</span>        <span class="kw">NOT NULL</span>,
  at_revision     <span class="ty">BIGINT</span>      <span class="kw">NOT NULL</span>,
  snapshot_data   <span class="ty">BYTEA</span>       <span class="kw">NOT NULL</span>, <span class="cm">-- serialized document state</span>
  created_at      <span class="ty">TIMESTAMPTZ</span> <span class="kw">NOT NULL</span>,
  <span class="kw">PRIMARY KEY</span> (doc_id, at_revision)
);</pre>
</div>

### Document State Reconstruction

<div class="code-wrap">
<div class="code-lang">pseudocode</div>
<pre class="code-block"><span class="kw">function</span> <span class="fn">loadDocument</span>(docId, atRevision <span class="op">=</span> <span class="kw">null</span>):
    <span class="cm"># Find nearest snapshot before atRevision</span>
    snap <span class="op">=</span> <span class="fn">getLatestSnapshot</span>(docId, before <span class="op">=</span> atRevision)

    <span class="cm"># Replay all ops from snapshot to target revision</span>
    ops <span class="op">=</span> <span class="fn">getOps</span>(docId, fromRevision <span class="op">=</span> snap.atRevision, toRevision <span class="op">=</span> atRevision)

    doc <span class="op">=</span> <span class="fn">deserialize</span>(snap.data)
    <span class="kw">for</span> op <span class="kw">in</span> ops:
        doc <span class="op">=</span> <span class="fn">applyOp</span>(doc, op)
    <span class="kw">return</span> doc</pre>
</div>

<div class="callout callout-green">
<strong>Version history for free:</strong> because every operation is stored in order, "See version history" in Google Docs is just <code>loadDocument(docId, atRevision=X)</code> — replay the op log up to revision X. The document at any point in time is always reconstructible.
</div>

### Storage Estimates

A typical heavily edited document after one year:

<div class="stat-grid">
  <div class="stat-card"><span class="stat-num">~100B</span><div class="stat-lbl">Bytes per op</div></div>
  <div class="stat-card"><span class="stat-num">~1M</span><div class="stat-lbl">Ops / year / heavy doc</div></div>
  <div class="stat-card"><span class="stat-num">~100MB</span><div class="stat-lbl">Op log / year</div></div>
  <div class="stat-card"><span class="stat-num">~1–5MB</span><div class="stat-lbl">Snapshot size</div></div>
</div>

Snapshots are taken periodically (e.g., every 10,000 ops or every 24 hours). On load, the client fetches the latest snapshot plus any ops since the snapshot — typically a small number. This bounds cold-start latency regardless of document age.

---

## 8. Level 7 — Cursors &amp; Presence Awareness

Showing other users' cursors and selections is a separate problem from document consistency. Cursor positions are **ephemeral** — they do not need to be persisted or replayed.

<div class="code-wrap">
<div class="code-lang">javascript</div>
<pre class="code-block"><span class="cm">// Broadcast presence on every cursor move</span>
<span class="kw">function</span> <span class="fn">onCursorMove</span>(position, selection) {
  ws.<span class="fn">send</span>(<span class="ty">JSON</span>.<span class="fn">stringify</span>({
    type:      <span class="st">'presence'</span>,
    userId:    currentUser.id,
    color:     currentUser.color,
    position:  position,
    selection: selection,   <span class="cm">// {start, end} or null</span>
    name:      currentUser.displayName
  }));
}

<span class="cm">// Render remote cursors as overlays</span>
<span class="kw">function</span> <span class="fn">updateCursor</span>(userId, position, color) {
  <span class="kw">let</span> cursor <span class="op">=</span> document.<span class="fn">getElementById</span>(<span class="st">'cursor-'</span> <span class="op">+</span> userId);
  <span class="kw">if</span> (<span class="op">!</span>cursor) {
    cursor <span class="op">=</span> document.<span class="fn">createElement</span>(<span class="st">'div'</span>);
    cursor.id <span class="op">=</span> <span class="st">'cursor-'</span> <span class="op">+</span> userId;
    cursor.className <span class="op">=</span> <span class="st">'remote-cursor'</span>;
    cursor.style.borderColor <span class="op">=</span> color;
    document.<span class="fn">getElementById</span>(<span class="st">'editor'</span>).<span class="fn">appendChild</span>(cursor);
  }
  <span class="cm">// Convert document position to pixel coords and reposition the cursor overlay</span>
  <span class="kw">const</span> coords <span class="op">=</span> <span class="fn">positionToCoords</span>(position);
  cursor.style.left <span class="op">=</span> coords.x <span class="op">+</span> <span class="st">'px'</span>;
  cursor.style.top  <span class="op">=</span> coords.y <span class="op">+</span> <span class="st">'px'</span>;
}</pre>
</div>

### Redis Pub/Sub for Presence

Each document session has a Redis channel. When a user joins or their cursor moves, the collaboration server publishes to that channel. All servers subscribed to that document receive the update and relay it to their connected clients.

<div class="code-wrap">
<div class="code-lang">pseudocode</div>
<pre class="code-block"><span class="cm"># Server: user joins document session</span>
<span class="kw">on</span> ws_connect(userId, docId):
    redis.<span class="fn">subscribe</span>(<span class="st">"doc:"</span> <span class="op">+</span> docId)
    redis.<span class="fn">publish</span>(<span class="st">"doc:"</span> <span class="op">+</span> docId, { event: <span class="st">"join"</span>, userId })
    redis.<span class="fn">hset</span>(<span class="st">"presence:"</span> <span class="op">+</span> docId, userId, <span class="fn">JSON.stringify</span>({ online: <span class="kw">true</span>, lastSeen: <span class="fn">now</span>() }))
    redis.<span class="fn">expire</span>(<span class="st">"presence:"</span> <span class="op">+</span> docId, <span class="nu">86400</span>)  <span class="cm"># TTL — auto-clean inactive sessions</span>

<span class="cm"># Broadcast presence updates to all servers for this doc</span>
<span class="kw">on</span> ws_message(userId, docId, presenceMsg):
    redis.<span class="fn">publish</span>(<span class="st">"doc:"</span> <span class="op">+</span> docId, presenceMsg)

<span class="cm"># On message received from Redis channel</span>
<span class="kw">on</span> redis_message(channel, msg):
    docId <span class="op">=</span> channel.<span class="fn">split</span>(<span class="st">":"</span>)[<span class="nu">1</span>]
    <span class="fn">broadcastToLocalClients</span>(docId, msg)</pre>
</div>

---

## 9. Conflict-Free Features Beyond Text

The CRDT concept extends naturally to other document features. Each feature maps to a specific CRDT data structure:

<table class="comp-table">
  <thead>
    <tr>
      <th>Feature</th>
      <th>CRDT Type</th>
      <th>Semantics</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Comments / suggestions</strong></td>
      <td>G-Set (grow-only set)</td>
      <td>Comments can only be added. "Delete" is a soft-delete flag, not a true removal. Ensures no comment is lost if two users delete the same comment concurrently.</td>
    </tr>
    <tr>
      <td><strong>Checkboxes / toggles</strong></td>
      <td>LWW-Register</td>
      <td>Last-write-wins per checkbox ID. Acceptable because the "conflict" (two users clicking a checkbox simultaneously) has no meaningful resolution — the last click wins.</td>
    </tr>
    <tr>
      <td><strong>Bold / italic formatting</strong></td>
      <td>OR-Set (observed-remove set)</td>
      <td>Removes only what the remover "saw". If A adds bold and B concurrently removes bold (on a stale view), A's add wins because B didn't observe A's add.</td>
    </tr>
    <tr>
      <td><strong>Document title</strong></td>
      <td>LWW-Register</td>
      <td>Last timestamp wins. Title conflicts are rare and LWW is acceptable for short string fields.</td>
    </tr>
    <tr>
      <td><strong>Cursor / selection</strong></td>
      <td>Ephemeral (not a CRDT)</td>
      <td>Not persisted. Broadcast only. No convergence needed — latest update always replaces previous.</td>
    </tr>
  </tbody>
</table>

{: class="marginalia" }
**The classic paper<br/>"Operational Transformation<br/>in Real-Time Group<br/>Editors" (Ellis &amp; Gibbs,<br/>1989) was written before<br/>the web existed. Google<br/>Docs is essentially a<br/>web-scale implementation<br/>of a 1989 research paper.**

---

## 10. Capacity Estimate

<table class="comp-table">
  <thead>
    <tr><th>Metric</th><th>Number</th></tr>
  </thead>
  <tbody>
    <tr><td>Concurrent collaborators per document</td><td>typically 2–10, max ~100</td></tr>
    <tr><td>Operations per user per second (active editing)</td><td>5–20</td></tr>
    <tr><td>Operation payload size</td><td>50–200 bytes</td></tr>
    <tr><td>Bandwidth per active collab session</td><td>~2–10 KB/s inbound per server</td></tr>
    <tr><td>WebSocket connections per server</td><td>~50K–100K (depends on RAM)</td></tr>
    <tr><td>Documents per collaboration server</td><td>~5K–10K active sessions</td></tr>
    <tr><td>Op log for a 1-year heavily edited document</td><td>~100MB</td></tr>
    <tr><td>Snapshot size for a large document</td><td>1–5 MB</td></tr>
    <tr><td>Redis presence TTL</td><td>24 hours after last activity</td></tr>
  </tbody>
</table>

---

## 11. Full Architecture

Click each component to see its responsibilities:

<div class="viz-wrap">
  <div class="viz-title">&#9654; Collaborative Editing Architecture</div>

  <div style="display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;margin-bottom:1rem;">
    <div class="arch-box arch-client" style="cursor:pointer;flex:1;min-width:100px;" onclick="showArch('client')">
      <div style="font-weight:700;">Client A</div>
      <div class="arch-label">WebSocket</div>
    </div>
    <div class="arch-arrow">⟶</div>
    <div class="arch-box arch-server" style="cursor:pointer;flex:1;min-width:120px;" onclick="showArch('lb')">
      <div style="font-weight:700;">Load Balancer</div>
      <div class="arch-label">sticky sessions</div>
    </div>
    <div class="arch-arrow">⟶</div>
    <div class="arch-box arch-server" style="cursor:pointer;flex:1;min-width:130px;" onclick="showArch('collab')">
      <div style="font-weight:700;">Collab Server</div>
      <div class="arch-label">OT Engine</div>
    </div>
  </div>

  <div style="display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;margin-bottom:1rem;">
    <div class="arch-box arch-store" style="cursor:pointer;flex:1;min-width:120px;" onclick="showArch('oplog')">
      <div style="font-weight:700;">Op Log DB</div>
      <div class="arch-label">append-only</div>
    </div>
    <div class="arch-arrow">+</div>
    <div class="arch-box arch-store" style="cursor:pointer;flex:1;min-width:120px;" onclick="showArch('redis')">
      <div style="font-weight:700;">Redis</div>
      <div class="arch-label">pub/sub + presence</div>
    </div>
    <div class="arch-arrow">+</div>
    <div class="arch-box arch-store" style="cursor:pointer;flex:1;min-width:120px;" onclick="showArch('snap')">
      <div style="font-weight:700;">Snapshot Worker</div>
      <div class="arch-label">periodic compaction</div>
    </div>
  </div>

  <div style="display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;">
    <div class="arch-box arch-client" style="cursor:pointer;flex:1;min-width:80px;max-width:200px;" onclick="showArch('clients')">
      <div style="font-weight:700;">Clients B, C, D</div>
      <div class="arch-label">receive broadcast</div>
    </div>
  </div>

  <div id="arch-detail" style="margin-top:1rem;display:none;background:#1a2e22;border:1px solid rgba(123,205,171,.25);border-radius:10px;padding:1.2rem;font-size:.84rem;line-height:1.75;color:rgba(255,255,255,.82);"></div>
</div>

<script>
(function() {
  var details = {
    client: '<strong>Client A</strong> — The browser or native app. Maintains a local copy of the document. On every keystroke, creates an operation and sends it via WebSocket. Applies its own op immediately (optimistic update) without waiting for server acknowledgement. Receives remote ops and applies them, running the CRDT/OT transform locally.',
    lb:     '<strong>Load Balancer</strong> — Uses sticky sessions (consistent hashing by docId or userId). All WebSocket connections for the same document must route to the same Collaboration Server so the OT engine can serialize operations for that document on one machine. Alternative: use Redis to coordinate across multiple servers.',
    collab: '<strong>Collaboration Server</strong> — Stateful WebSocket server. Holds in-memory OT state for active documents (revision counter, pending ops). On receiving an op: (1) transform it against any concurrent ops, (2) assign a revision number, (3) persist to Op Log DB, (4) broadcast transformed op to all other clients for this doc via Redis pub/sub.',
    oplog:  '<strong>Op Log DB</strong> — Append-only store. Every operation is written once, never updated. Could be PostgreSQL (with JSONB for op_data), Cassandra (append-heavy workload), or a dedicated log store. Supports queries for "all ops since revision N" to support reconnect sync and version history replay.',
    redis:  '<strong>Redis</strong> — Two roles: (1) pub/sub channel per document — allows Collab Servers to broadcast ops to each other when clients for the same document are spread across servers; (2) presence hash — tracks who is viewing each document, cursor positions, last-seen timestamps with TTL-based expiry.',
    snap:   '<strong>Snapshot Worker</strong> — Background job that periodically reads the op log and produces a full document snapshot. Stored in object storage (S3) or a blob column. Reduces cold-start latency: new clients load the latest snapshot plus a small number of ops since the snapshot, rather than replaying the entire op log.',
    clients:'<strong>Clients B, C, D</strong> — Receive transformed operations from the Collaboration Server via their WebSocket connections. Apply the ops using the same CRDT/OT logic. Render remote cursors as coloured overlays. The key property: every client applies the same set of (transformed) operations and converges to the same document state.',
  };

  window.showArch = function(key) {
    var el = document.getElementById('arch-detail');
    el.style.display = 'block';
    el.innerHTML = details[key] || '';
  };
})();
</script>

---

## 12. OT vs CRDT — When to Use Which

<table class="comp-table">
  <thead>
    <tr>
      <th>Property</th>
      <th>OT</th>
      <th>CRDT</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Requires central server</td>
      <td><span class="badge badge-red">Yes — to serialize ops</span></td>
      <td><span class="badge badge-green">No — peer-to-peer possible</span></td>
    </tr>
    <tr>
      <td>Algorithm complexity</td>
      <td>High for rich text (many transformation cases)</td>
      <td>Moderate; simpler reasoning</td>
    </tr>
    <tr>
      <td>Storage overhead</td>
      <td>Low — ops are compact</td>
      <td>Higher — tombstones accumulate, IDs add metadata</td>
    </tr>
    <tr>
      <td>Offline support</td>
      <td>Difficult — need server to reintegrate</td>
      <td><span class="badge badge-green">Natural — merge on reconnect</span></td>
    </tr>
    <tr>
      <td>Industry adoption</td>
      <td>Google Docs (original), Google Wave</td>
      <td>Figma, Notion, Linear, Yjs ecosystem</td>
    </tr>
    <tr>
      <td>Proven at scale</td>
      <td><span class="badge badge-green">Yes — 20 years production use</span></td>
      <td><span class="badge badge-green">Yes — growing rapidly</span></td>
    </tr>
  </tbody>
</table>

For a system design interview: **either is a valid answer**. State the trade-off explicitly: OT is simpler to reason about when you have a central server (as most web apps do); CRDT is preferable if you need offline-first or peer-to-peer capability.

---

## 13. Interview Checklist

When asked to design Google Docs in an interview, hit these points in order:

<div class="callout callout-green">
<strong>1. Identify the core problem</strong> — concurrent edits create divergence. Define convergence as the requirement.<br/><br/>
<strong>2. Eliminate bad approaches</strong> — pessimistic locking destroys UX; last-write-wins loses edits. Explain why, briefly.<br/><br/>
<strong>3. Choose OT or CRDT</strong> — describe the algorithm at a conceptual level. Show the INSERT/INSERT transformation example.<br/><br/>
<strong>4. Transport</strong> — WebSocket per client, Collaboration Server serializes the op stream, Redis pub/sub for multi-server broadcast.<br/><br/>
<strong>5. Persistence</strong> — append-only op log, periodic snapshots, version history is replay from snapshot + ops.<br/><br/>
<strong>6. Presence &amp; cursors</strong> — ephemeral, broadcast via WebSocket, Redis for cross-server fanout.<br/><br/>
<strong>7. Scale numbers</strong> — op size (~100B), bandwidth per session (~5 KB/s), storage (~100MB/year per heavy doc).
</div>

---

## Further Reading

- **"Operational Transformation in Real-Time Group Editors"** — Ellis &amp; Gibbs, 1989. The original paper.
- **"High-Latency, Low-Bandwidth Windowing in the Jupiter Collaboration System"** — Nichols et al., 1995. The Jupiter OT algorithm that Google Docs is based on.
- **Yjs documentation** — The most widely deployed CRDT library. Source is readable and educational.
- **"How Figma's multiplayer technology works"** — Figma Engineering Blog. Best real-world CRDT write-up.
- **Automerge** — Open-source CRDT library with an excellent introductory blog post series.

<script>
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre.code-block');
  if (!pre) return;
  navigator.clipboard.writeText(pre.innerText).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500);
  });
}
</script>
