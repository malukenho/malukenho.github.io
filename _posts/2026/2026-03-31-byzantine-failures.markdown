---
layout: post
title: "🏛️ The Byzantine Problem: When You Can't Trust Your Own System"
author: Jefersson Nathan
date: Tue Mar 31 18:00:00 CEST 2026
categories: [ "post" ]
description: "Byzantine fault tolerance, digital signatures, and how cryptography defeats the traitor-in-your-network problem — with interactive simulations."
tags: [cryptography, distributed-systems, security, byzantine, consensus]
---

{: class="marginalia" }
The name comes from the<br/>Byzantine Empire's complex<br/>military structure, where<br/>generals communicated<br/>via unreliable messengers.<br/>The paper was published<br/>by Lamport, Shostak,<br/>and Pease in **1982**.

In 1982, Leslie Lamport posed a deceptively simple puzzle:

> *Four generals surround a city. To succeed they must all attack at the same moment, or all retreat.
> They can only communicate by messenger. One of the generals is a traitor.
> Can they still reach agreement?*

This became one of the most important problems in distributed systems — and
one of the most important motivations for cryptography in software.
The answer is: **yes, but only if the messages are signed**.

This is not a theoretical curiosity. It is the exact problem your web server faces every time
it processes a session token, a JWT, or a signed cookie. The traitor is not necessarily a general —
it might be an attacker who has compromised one node, a tampered packet, or a man-in-the-middle
sitting between your load balancer and your auth service.

---

<style>
/* ─── Byzantine generals simulator ─────────────────────────────── */
.byz-sim {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 14px; padding: 1.6rem; margin: 1.8rem 0;
}
.byz-controls {
  display: flex; gap: .7rem; align-items: center; flex-wrap: wrap; margin-bottom: 1.2rem;
}
.byz-mode-tabs { display: flex; gap: 0; border: 1px solid #2e2f35; border-radius: 8px; overflow: hidden; }
.byz-tab {
  padding: 7px 18px; background: transparent; border: none;
  color: rgba(255,255,255,.45); cursor: pointer; font-family: inherit;
  font-size: 12px; transition: all .2s;
}
.byz-tab.active { background: #2e2f35; color: #fbef8a; }
.sim-btn {
  padding: 7px 18px; border-radius: 6px; border: 1px solid #7bcdab;
  background: #152319; color: #7bcdab; cursor: pointer;
  font-family: inherit; font-size: 12px; transition: all .2s;
}
.sim-btn:hover:not(:disabled) { background: #7bcdab; color: #19191c; }
.sim-btn:disabled { opacity: .4; cursor: default; }
.sim-btn.ghost { background: transparent; border-color: #3a3b40; color: rgba(255,255,255,.4); }
.sim-btn.ghost:hover:not(:disabled) { border-color: #7bcdab; color: #7bcdab; }
.traitor-toggle {
  display: flex; align-items: center; gap: .5rem;
  font-size: 12px; color: rgba(255,255,255,.55); cursor: pointer; user-select: none;
}
.traitor-toggle input { accent-color: #f08080; cursor: pointer; }
/* canvas wrapper */
.sim-canvas-wrap { position: relative; width: 100%; }
#byz-canvas { width: 100%; max-width: 520px; display: block; margin: 0 auto; }
/* step log */
.sim-log {
  background: #111214; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .8rem 1rem; margin-top: 1rem; min-height: 56px;
  font-size: .8rem; line-height: 1.6; color: rgba(255,255,255,.7);
  font-family: "JetBrains Mono", monospace;
}
.sim-log .log-ok   { color: #7bcdab; }
.sim-log .log-bad  { color: #f08080; }
.sim-log .log-warn { color: #fbef8a; }
.sim-log .log-dim  { color: rgba(255,255,255,.35); }
.sim-step-bar {
  display: flex; gap: 4px; margin-top: .8rem;
}
.sim-step-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #2e2f35; transition: background .3s;
}
.sim-step-dot.active { background: #7bcdab; }
.sim-step-dot.done   { background: #3a4a3a; }

/* ─── Signature tamper demo ─────────────────────────────────────── */
.tamper-demo {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 12px; padding: 1.5rem; margin: 1.8rem 0;
}
.jwt-parts { display: flex; gap: 4px; align-items: center; margin: .8rem 0; flex-wrap: wrap; }
.jwt-part {
  font-family: "JetBrains Mono", monospace; font-size: 12px;
  padding: 4px 10px; border-radius: 6px; word-break: break-all;
}
.jwt-header  { background: rgba(248,197,85,.12); color: #f8c555; border: 1px solid rgba(248,197,85,.3); }
.jwt-payload { background: rgba(123,205,171,.12); color: #7bcdab; border: 1px solid rgba(123,205,171,.3); }
.jwt-sig     { background: rgba(240,80,80,.12);  color: #f08080; border: 1px solid rgba(240,80,80,.3); }
.jwt-dot     { color: rgba(255,255,255,.3); font-weight: 700; }
.tamper-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
@media (max-width: 600px) { .tamper-row { grid-template-columns: 1fr; } }
.tamper-field label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.38); margin-bottom: .4rem; }
.tamper-input {
  width: 100%; background: #111214; border: 1px solid #2e2f35; border-radius: 6px;
  color: rgba(255,255,255,.85); font-family: "JetBrains Mono", monospace; font-size: 12px;
  padding: 8px 10px; box-sizing: border-box;
}
.tamper-input:focus { outline: none; border-color: #7bcdab; }
.verify-badge {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700;
  transition: all .3s;
}
.badge-ok  { background: rgba(123,205,171,.15); border: 1px solid rgba(123,205,171,.4); color: #7bcdab; }
.badge-fail{ background: rgba(240,80,80,.15);  border: 1px solid rgba(240,80,80,.4);  color: #f08080; }

/* ─── Code blocks ──────────────────────────────────────────────── */
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
.code-wrap pre {
  margin: 0; padding: 16px 20px; overflow-x: auto;
  font-family: "JetBrains Mono", monospace; font-size: 13px;
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

/* ─── Callouts ─────────────────────────────────────────────────── */
.callout { border-radius: 8px; padding: 1rem 1.2rem; margin: 1rem 0; font-size: .84rem; line-height: 1.7; }
.callout-green  { background: #1a2e22; border-left: 3px solid #7bcdab; color: rgba(255,255,255,.82); }
.callout-yellow { background: #25240e; border-left: 3px solid #fbef8a; color: rgba(255,255,255,.82); }
.callout-red    { background: #2a1616; border-left: 3px solid #f08080; color: rgba(255,255,255,.82); }
.callout strong { color: #fff; }

/* ─── Attack anatomy ────────────────────────────────────────────── */
.attack-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; margin: 1.5rem 0; }
@media (max-width: 640px) { .attack-grid { grid-template-columns: 1fr; } }
.attack-card {
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1rem; font-size: .82rem; color: rgba(255,255,255,.7);
}
.attack-card h4 { color: #fbef8a; margin: 0 0 .5rem; font-size: .88rem; }
.attack-card .atk-icon { font-size: 1.6rem; margin-bottom: .5rem; display: block; }
.attack-card .atk-tag {
  display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px;
  font-weight: 700; margin-top: .5rem; text-transform: uppercase; letter-spacing: .06em;
}
.tag-red    { background: rgba(240,80,80,.2);  color: #f08080; }
.tag-yellow { background: rgba(251,239,138,.15); color: #fbef8a; }

/* ─── Checklist ─────────────────────────────────────────────────── */
.checklist { list-style: none; padding: 0; margin: 1rem 0; }
.checklist li {
  display: flex; gap: .7rem; align-items: flex-start; padding: .55rem 0;
  border-bottom: 1px solid #1e1f24; font-size: .84rem; color: rgba(255,255,255,.75);
}
.checklist li:last-child { border-bottom: none; }
.checklist .ck { color: #7bcdab; font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
.checklist code { background: #1e1f24; padding: 1px 5px; border-radius: 3px; font-size: .8rem; }
</style>

## The Generals Problem, Visualised

{: class="marginalia" }
With **3f + 1** nodes you<br/>can tolerate **f** Byzantine<br/>traitors. So with 4 nodes<br/>you survive 1 traitor.<br/>This is the minimum bound<br/>proven by Lamport et al.

Before code, build intuition. The simulation below lets you run the two-round broadcast
protocol with and without digital signatures. Toggle the Commander as traitor and watch what happens:

<div class="byz-sim">
  <div class="byz-controls">
    <div class="byz-mode-tabs">
      <button class="byz-tab active" id="tab-nosig" onclick="setMode('nosig')">&#128274; No signatures</button>
      <button class="byz-tab" id="tab-sig" onclick="setMode('sig')">&#128275; With signatures</button>
    </div>
    <label class="traitor-toggle">
      <input type="checkbox" id="traitor-check" onchange="resetSim()"/> Make commander a traitor
    </label>
    <button class="sim-btn" id="btn-step" onclick="stepSim()">&#9654; Next step</button>
    <button class="sim-btn ghost" onclick="resetSim()">&#8635; Reset</button>
  </div>

  <div class="sim-canvas-wrap">
    <canvas id="byz-canvas" width="520" height="340"></canvas>
  </div>

  <div class="sim-step-bar" id="step-bar"></div>

  <div class="sim-log" id="sim-log">
    <span class="log-dim">Press "Next step" to begin the simulation.</span>
  </div>
</div>

The key difference: without signatures, the traitor can tell each general a *different* story
and no one can prove it. With digital signatures, the traitor's contradiction becomes
**cryptographic evidence** — a general who claims to have received an order can attach
the commander's signature, and everyone can verify it.

---

## Why This Maps Exactly to Web Security

{: class="marginalia" }
**Byzantine failures** in<br/>web systems: any node<br/>(server, client, proxy)<br/>that sends conflicting<br/>or forged messages<br/>to different parties<br/>to cause inconsistency.

The generals are your servers. The messengers are HTTP requests. The traitor is an attacker
(or a compromised node). Here are the real-world manifestations:

<div class="attack-grid">
  <div class="attack-card">
    <span class="atk-icon">&#128273;</span>
    <h4>JWT Algorithm Confusion</h4>
    Attacker changes the header from <code>alg: RS256</code> to <code>alg: none</code>,
    drops the signature, and the server accepts it — because it never checked.
    The traitor general claiming "I have the commander's seal" on a blank document.
    <div><span class="atk-tag tag-red">auth bypass</span></div>
  </div>
  <div class="attack-card">
    <span class="atk-icon">&#127850;</span>
    <h4>Session Cookie Tampering</h4>
    A cookie stores <code>role=user</code> without a signature or HMAC.
    Attacker edits it to <code>role=admin</code>. Server trusts it.
    The traitor relaying a forged order with no way to verify its origin.
    <div><span class="atk-tag tag-red">privilege esc.</span></div>
  </div>
  <div class="attack-card">
    <span class="atk-icon">&#128203;</span>
    <h4>MITM on API Calls</h4>
    A proxy between your frontend and auth service intercepts and modifies
    messages. Without mutual TLS or signed payloads, neither side can tell.
    A traitor intercepting messages between two loyal generals.
    <div><span class="atk-tag tag-yellow">interception</span></div>
  </div>
</div>

---

## The JWT Attack — Live Demo

{: class="marginalia" }
The `alg: none` vulnerability<br/>was discovered in 2015 and<br/>affected dozens of JWT<br/>libraries. **Never** trust<br/>the algorithm declared<br/>in the header — always<br/>enforce it server-side.

A JWT has three base64url-encoded parts: `header.payload.signature`.
Edit the payload below to see when the signature becomes invalid:

<div class="tamper-demo">
  <div class="jwt-parts" id="jwt-display">
    <span class="jwt-part jwt-header" id="jwt-h-display">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9</span>
    <span class="jwt-dot">.</span>
    <span class="jwt-part jwt-payload" id="jwt-p-display">...</span>
    <span class="jwt-dot">.</span>
    <span class="jwt-part jwt-sig" id="jwt-s-display">...</span>
  </div>

  <div class="tamper-row">
    <div class="tamper-field">
      <label>Payload (editable)</label>
      <textarea class="tamper-input" id="jwt-payload-input" rows="4" oninput="updateJWT()">{
  "sub": "user_123",
  "role": "user",
  "exp": 9999999999
}</textarea>
    </div>
    <div class="tamper-field">
      <label>HMAC secret (server only)</label>
      <input type="text" class="tamper-input" id="jwt-secret" value="super-secret-key-never-share" oninput="updateJWT()"/>
      <div style="margin-top:.8rem;font-size:.75rem;color:rgba(255,255,255,.35);">
        Change the payload. Signature will fail unless you also know the secret.
      </div>
      <div style="margin-top:.8rem;">
        <span class="verify-badge" id="verify-badge">&#10003; Signature valid</span>
      </div>
    </div>
  </div>

  <div style="margin-top:.8rem;">
    <button class="sim-btn" onclick="setPayload('admin')">Try: escalate to admin</button>
    <button class="sim-btn ghost" style="margin-left:.5rem;" onclick="setPayload('original')">Reset payload</button>
  </div>
</div>

The signature is an HMAC-SHA256 over `base64(header) + "." + base64(payload)` using the
secret. Change a single byte of the payload and the signature no longer matches.
That is cryptographic integrity: the loyal general's message cannot be tampered with in transit.

---

## The Real Code: PHP

### &#10060; Vulnerable — unsigned session data

<div class="code-wrap">
  <div class="code-lang">PHP &mdash; dangerous pattern <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre><span class="cm">// ❌ The role is stored in a cookie without any integrity check.</span>
<span class="cm">// An attacker edits the cookie in their browser: role=admin</span>
setcookie(<span class="st">'user'</span>, json_encode([
    <span class="st">'id'</span>   =&gt; <span class="nu">42</span>,
    <span class="st">'role'</span> =&gt; <span class="st">'user'</span>,
]), time() + <span class="nu">3600</span>);

<span class="cm">// Later: reading it back — blindly trusted</span>
<span class="kw">$data</span> = json_decode(<span class="kw">$_COOKIE</span>[<span class="st">'user'</span>], <span class="kw">true</span>);
<span class="kw">if</span> (<span class="kw">$data</span>[<span class="st">'role'</span>] === <span class="st">'admin'</span>) {
    <span class="cm">// 🚨 attacker is now admin</span>
}</pre>
</div>

### &#9989; Secure — HMAC-signed cookie

<div class="code-wrap">
  <div class="code-lang">PHP &mdash; HMAC integrity check <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre><span class="kw">define</span>(<span class="st">'COOKIE_SECRET'</span>, getenv(<span class="st">'COOKIE_SECRET'</span>));  <span class="cm">// 32+ byte random key</span>

<span class="kw">function</span> <span class="fn">sign_cookie</span>(<span class="ty">array</span> <span class="kw">$data</span>): <span class="ty">string</span>
{
    <span class="kw">$payload</span> = base64_encode(json_encode(<span class="kw">$data</span>));
    <span class="kw">$mac</span>     = hash_hmac(<span class="st">'sha256'</span>, <span class="kw">$payload</span>, COOKIE_SECRET);
    <span class="kw">return</span> <span class="kw">$payload</span> . <span class="st">'.'</span> . <span class="kw">$mac</span>;
}

<span class="kw">function</span> <span class="fn">verify_cookie</span>(<span class="ty">string</span> <span class="kw">$cookie</span>): ?<span class="ty">array</span>
{
    <span class="kw">$parts</span> = explode(<span class="st">'.'</span>, <span class="kw">$cookie</span>, <span class="nu">2</span>);
    <span class="kw">if</span> (count(<span class="kw">$parts</span>) !== <span class="nu">2</span>) <span class="kw">return</span> <span class="kw">null</span>;

    [<span class="kw">$payload</span>, <span class="kw">$mac</span>] = <span class="kw">$parts</span>;
    <span class="kw">$expected</span> = hash_hmac(<span class="st">'sha256'</span>, <span class="kw">$payload</span>, COOKIE_SECRET);

    <span class="cm">// ✅ constant-time comparison prevents timing attacks</span>
    <span class="kw">if</span> (!hash_equals(<span class="kw">$expected</span>, <span class="kw">$mac</span>)) {
        <span class="kw">return</span> <span class="kw">null</span>;  <span class="cm">// tampered — reject</span>
    }

    <span class="kw">return</span> json_decode(base64_decode(<span class="kw">$payload</span>), <span class="kw">true</span>);
}

<span class="cm">// Usage</span>
setcookie(<span class="st">'user'</span>, sign_cookie([<span class="st">'id'</span> =&gt; <span class="nu">42</span>, <span class="st">'role'</span> =&gt; <span class="st">'user'</span>]), ...);

<span class="kw">$data</span> = verify_cookie(<span class="kw">$_COOKIE</span>[<span class="st">'user'</span>] ?? <span class="st">''</span>);
<span class="kw">if</span> (<span class="kw">$data</span> === <span class="kw">null</span>) {
    <span class="cm">// tampered or missing — force re-login</span>
    header(<span class="st">'Location: /login'</span>);
    exit;
}</pre>
</div>

### &#10060; Vulnerable — JWT with `alg: none`

<div class="code-wrap">
  <div class="code-lang">PHP &mdash; the alg:none trap <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre><span class="cm">// ❌ Trusting the algorithm from the token's own header</span>
<span class="kw">$header</span> = json_decode(base64_decode(<span class="kw">$parts</span>[<span class="nu">0</span>]), <span class="kw">true</span>);
<span class="kw">$alg</span>    = <span class="kw">$header</span>[<span class="st">'alg'</span>];  <span class="cm">// attacker sends "none"</span>

<span class="kw">if</span> (<span class="kw">$alg</span> === <span class="st">'none'</span>) {
    <span class="cm">// skips verification entirely — 🚨 auth bypass</span>
    <span class="kw">return</span> json_decode(base64_decode(<span class="kw">$parts</span>[<span class="nu">1</span>]), <span class="kw">true</span>);
}</pre>
</div>

### &#9989; Secure — enforce the algorithm server-side

<div class="code-wrap">
  <div class="code-lang">PHP &mdash; safe JWT verification <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre><span class="kw">function</span> <span class="fn">verify_jwt</span>(<span class="ty">string</span> <span class="kw">$token</span>, <span class="ty">string</span> <span class="kw">$secret</span>): ?<span class="ty">array</span>
{
    <span class="kw">$parts</span> = explode(<span class="st">'.'</span>, <span class="kw">$token</span>);
    <span class="kw">if</span> (count(<span class="kw">$parts</span>) !== <span class="nu">3</span>) <span class="kw">return</span> <span class="kw">null</span>;

    [<span class="kw">$b64h</span>, <span class="kw">$b64p</span>, <span class="kw">$b64s</span>] = <span class="kw">$parts</span>;

    <span class="cm">// ✅ Never read alg from the token — always enforce HS256</span>
    <span class="kw">$expected_sig</span> = hash_hmac(
        <span class="st">'sha256'</span>,
        <span class="kw">$b64h</span> . <span class="st">'.'</span> . <span class="kw">$b64p</span>,
        <span class="kw">$secret</span>,
        binary: <span class="kw">true</span>
    );

    <span class="kw">$provided_sig</span> = base64_decode(
        strtr(<span class="kw">$b64s</span>, <span class="st">'-_'</span>, <span class="st">'+/'</span>)
    );

    <span class="cm">// ✅ Constant-time compare</span>
    <span class="kw">if</span> (!hash_equals(<span class="kw">$expected_sig</span>, <span class="kw">$provided_sig</span>)) {
        <span class="kw">return</span> <span class="kw">null</span>;
    }

    <span class="kw">$payload</span> = json_decode(base64_decode(
        strtr(<span class="kw">$b64p</span>, <span class="st">'-_'</span>, <span class="st">'+/'</span>)
    ), <span class="kw">true</span>);

    <span class="cm">// ✅ Check expiry</span>
    <span class="kw">if</span> ((<span class="kw">$payload</span>[<span class="st">'exp'</span>] ?? <span class="nu">0</span>) &lt; time()) {
        <span class="kw">return</span> <span class="kw">null</span>;
    }

    <span class="kw">return</span> <span class="kw">$payload</span>;
}</pre>
</div>

---

## Timing Attacks: The Subtle Byzantine

{: class="marginalia" }
A **timing attack** is a<br/>Byzantine failure where the<br/>"traitor" is time itself.<br/>If your MAC comparison<br/>short-circuits on the<br/>first wrong byte, an<br/>attacker can infer the<br/>correct MAC byte-by-byte<br/>in ~256 × n requests.

There is one more Byzantine failure that pure logic cannot fix: the **timing attack**.
A naive string comparison like `$a === $b` short-circuits the moment it finds the first
differing byte. An attacker can measure response times to infer how many leading bytes
of their forged MAC are correct.

The fix is `hash_equals()` in PHP — which always compares every byte regardless of where
they first differ. This is called **constant-time comparison** and it is mandatory
for any MAC or signature check.

<div class="code-wrap">
  <div class="code-lang">PHP &mdash; timing safe vs unsafe <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre><span class="cm">// ❌ Leaks timing information</span>
<span class="kw">if</span> (<span class="kw">$provided_mac</span> === <span class="kw">$expected_mac</span>) { ... }

<span class="cm">// ❌ Also leaks: early exit on mismatch</span>
<span class="kw">if</span> (strcmp(<span class="kw">$provided_mac</span>, <span class="kw">$expected_mac</span>) === <span class="nu">0</span>) { ... }

<span class="cm">// ✅ Always runs in the same time regardless of input</span>
<span class="kw">if</span> (hash_equals(<span class="kw">$expected_mac</span>, <span class="kw">$provided_mac</span>)) { ... }

<span class="cm">// Note: argument order matters for hash_equals — known value first!</span></pre>
</div>

---

## The Full Checklist

<ul class="checklist">
  <li><span class="ck">&#10003;</span><div>Sign every cookie that carries authoritative data. Use <code>hash_hmac('sha256', $payload, $secret)</code> and compare with <code>hash_equals()</code>.</div></li>
  <li><span class="ck">&#10003;</span><div>Never read <code>alg</code> from a JWT header. Enforce the algorithm on the server side — always.</div></li>
  <li><span class="ck">&#10003;</span><div>Use <code>hash_equals()</code> for every MAC, signature, or token comparison. Never <code>===</code> or <code>strcmp</code>.</div></li>
  <li><span class="ck">&#10003;</span><div>Store secrets in environment variables or a vault. Never hardcode them. Never commit them. Never log them.</div></li>
  <li><span class="ck">&#10003;</span><div>Validate JWT <code>exp</code>, <code>iss</code>, and <code>aud</code> claims explicitly. Signed does not mean authorised.</div></li>
  <li><span class="ck">&#10003;</span><div>Use HTTPS everywhere — TLS ensures the channel, but it does not replace payload signing (the channel can be terminated at a proxy).</div></li>
  <li><span class="ck">&#10003;</span><div>For distributed systems: require signatures on inter-service messages. A compromised internal node should not be trusted just because it is inside the VPC.</div></li>
</ul>

---

## The Insight That Lamport Gave Us

{: class="marginalia" }
In blockchain, **PBFT**<br/>(Practical BFT) and its<br/>descendants (Tendermint,<br/>HotStuff) are what make<br/>validators agree on<br/>a chain despite traitors.<br/>It all traces back to<br/>Lamport's 1982 paper.

The Byzantine Generals Problem sounds ancient and abstract. But its resolution — **you cannot
achieve reliable consensus without authenticated messages** — is the foundation of every
security primitive in use today:

- HMAC says: *"only someone with the shared secret can produce this signature"*
- RSA/ECDSA says: *"only someone with the private key can produce this signature"*
- TLS says: *"only the certificate's true owner could have completed this handshake"*
- JWT verification says: *"only the auth server that issued this token could have signed it"*

Every time you call `hash_equals()` instead of `===`, every time you enforce `alg: HS256`
instead of trusting the header, you are implementing the lesson from 1982:
**a message without a verifiable signature is worthless in an adversarial environment**.

The traitor general cannot lie if every message carries a proof that only a loyal general
could have created.

---

*Further reading:
[Lamport, Shostak, Pease — Byzantine Generals (1982)](https://lamport.azurewebsites.net/pubs/byz.pdf),
[OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html),
[PHP hash_equals](https://php.net/hash_equals).*

<script>
// ════════════════════════════════════════════════════════════════
//  BYZANTINE GENERALS SIMULATOR
// ════════════════════════════════════════════════════════════════
var canvas, ctx;
var simMode     = 'nosig';   // 'nosig' | 'sig'
var simStep     = -1;
var isTraitor   = false;
var animFrames  = [];
var simScripts  = {};

var W, H;   // canvas dimensions (set on init)
var NODES;  // set after we know W/H

function initCanvas() {
  canvas = document.getElementById('byz-canvas');
  ctx    = canvas.getContext('2d');
  W = canvas.width;
  H = canvas.height;

  // Pentagon layout: Commander at top, 4 lieutenants below
  var cx = W / 2, cy = H / 2 - 10;
  var r  = Math.min(W, H) * 0.36;
  NODES = [
    { id: 'C',  label: 'Commander', x: cx,                  y: cy - r        },
    { id: 'G1', label: 'Gen. I',    x: cx + r * Math.sin(Math.PI * 2 / 5),      y: cy - r * Math.cos(Math.PI * 2 / 5)    },
    { id: 'G2', label: 'Gen. II',   x: cx + r * Math.sin(Math.PI * 4 / 5),      y: cy - r * Math.cos(Math.PI * 4 / 5)    },
    { id: 'G3', label: 'Gen. III',  x: cx + r * Math.sin(Math.PI * 6 / 5),      y: cy - r * Math.cos(Math.PI * 6 / 5)    },
    { id: 'G4', label: 'Gen. IV',   x: cx + r * Math.sin(Math.PI * 8 / 5),      y: cy - r * Math.cos(Math.PI * 8 / 5)    },
  ];
  buildScripts();
  drawBase([]);
  buildStepBar();
}

function nodeById(id) {
  return NODES.find(function(n) { return n.id === id; });
}

// ── Draw ─────────────────────────────────────────────────────────
function drawBase(highlights) {
  ctx.clearRect(0, 0, W, H);

  // Edges
  var edges = [
    ['C','G1'],['C','G2'],['C','G3'],['C','G4'],
    ['G1','G2'],['G1','G3'],['G1','G4'],
    ['G2','G3'],['G2','G4'],
    ['G3','G4'],
  ];
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth   = 1;
  edges.forEach(function(e) {
    var a = nodeById(e[0]), b = nodeById(e[1]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  });

  // Highlight edges
  highlights.forEach(function(h) {
    var a = nodeById(h.from), b = nodeById(h.to);
    ctx.strokeStyle = h.color || 'rgba(123,205,171,.6)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]);
  });

  // Nodes
  NODES.forEach(function(n) {
    var traitor = (n.id === 'C' && isTraitor);
    var r = n.id === 'C' ? 28 : 24;

    // Shadow glow
    if (traitor) {
      ctx.shadowColor = '#f08080'; ctx.shadowBlur = 14;
    } else {
      ctx.shadowColor = '#7bcdab'; ctx.shadowBlur = 8;
    }

    // Circle
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle   = traitor ? '#2a1616' : '#152319';
    ctx.strokeStyle = traitor ? '#f08080' : '#7bcdab';
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle  = '#fff';
    ctx.font       = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.id, n.x, n.y);

    // Sub-label
    ctx.fillStyle  = 'rgba(255,255,255,.45)';
    ctx.font       = '9px "JetBrains Mono", monospace';
    var offsetY = n.id === 'C' ? -42 : (n.y < H/2 ? -38 : 38);
    ctx.fillText(n.label + (traitor ? ' ⚠' : ''), n.x, n.y + offsetY);
  });
}

// ── Animated packet ──────────────────────────────────────────────
function animatePacket(fromId, toId, label, color, done) {
  var a = nodeById(fromId), b = nodeById(toId);
  var t = 0, dur = 45;
  function frame() {
    t++;
    var p  = t / dur;
    var px = a.x + (b.x - a.x) * p;
    var py = a.y + (b.y - a.y) * p;
    // Draw packet dot
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.shadowBlur  = 0;
    // Label
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px, py - 14);
    if (t < dur) {
      animFrames.push(requestAnimationFrame(function() { drawBase([]); frame(); }));
    } else {
      if (done) done();
    }
  }
  frame();
}

// ── Scripts ───────────────────────────────────────────────────────
function buildScripts() {
  var ATTACK  = { label: 'ATK', color: '#7bcdab' };
  var RETREAT = { label: 'RET', color: '#f08080' };
  var FORGED  = { label: 'FAKE', color: '#f0b429' };

  simScripts.nosig_loyal = [
    {
      desc: '<span class="log-ok">Commander (loyal): sending ATTACK to all generals.</span>',
      packets: [
        { from: 'C', to: 'G1', ...ATTACK },
        { from: 'C', to: 'G2', ...ATTACK },
        { from: 'C', to: 'G3', ...ATTACK },
        { from: 'C', to: 'G4', ...ATTACK },
      ],
      highlights: [
        { from: 'C', to: 'G1', color: '#7bcdab44' },
        { from: 'C', to: 'G2', color: '#7bcdab44' },
        { from: 'C', to: 'G3', color: '#7bcdab44' },
        { from: 'C', to: 'G4', color: '#7bcdab44' },
      ]
    },
    {
      desc: '<span class="log-ok">Generals relay received order to each other:</span> <span class="log-dim">G1→G2: ATK, G1→G3: ATK, G2→G4: ATK …</span>',
      packets: [
        { from: 'G1', to: 'G2', ...ATTACK },
        { from: 'G2', to: 'G3', ...ATTACK },
        { from: 'G3', to: 'G4', ...ATTACK },
        { from: 'G4', to: 'G1', ...ATTACK },
      ],
      highlights: [
        { from: 'G1', to: 'G2', color: '#7bcdab44' },
        { from: 'G2', to: 'G3', color: '#7bcdab44' },
        { from: 'G3', to: 'G4', color: '#7bcdab44' },
        { from: 'G4', to: 'G1', color: '#7bcdab44' },
      ]
    },
    {
      desc: '<span class="log-ok">✅ Consensus: 4 out of 4 generals vote ATTACK. All execute together.</span>',
      packets: [],
      highlights: []
    },
  ];

  simScripts.nosig_traitor = [
    {
      desc: '<span class="log-bad">Commander (TRAITOR): sending ATTACK to G1 but RETREAT to G2, G3, G4.</span>',
      packets: [
        { from: 'C', to: 'G1', ...ATTACK },
        { from: 'C', to: 'G2', ...RETREAT },
        { from: 'C', to: 'G3', ...RETREAT },
        { from: 'C', to: 'G4', ...RETREAT },
      ],
      highlights: [
        { from: 'C', to: 'G1', color: '#7bcdab44' },
        { from: 'C', to: 'G2', color: '#f0808044' },
        { from: 'C', to: 'G3', color: '#f0808044' },
        { from: 'C', to: 'G4', color: '#f0808044' },
      ]
    },
    {
      desc: '<span class="log-warn">Generals relay what they received. G1 tells everyone ATK; G2/G3/G4 tell everyone RET.</span>',
      packets: [
        { from: 'G1', to: 'G2', ...ATTACK },
        { from: 'G2', to: 'G1', ...RETREAT },
        { from: 'G3', to: 'G4', ...RETREAT },
        { from: 'G4', to: 'G3', ...RETREAT },
      ],
      highlights: [
        { from: 'G1', to: 'G2', color: '#7bcdab44' },
        { from: 'G2', to: 'G1', color: '#f0808044' },
        { from: 'G3', to: 'G4', color: '#f0808044' },
      ]
    },
    {
      desc: '<span class="log-bad">❌ Byzantine failure: G1 sees {ATK, RET, RET, RET} → retreats. But G1 received ATTACK. They act differently!</span>',
      packets: [],
      highlights: []
    },
  ];

  simScripts.sig_loyal = simScripts.nosig_loyal;  // same outcome, trivially

  simScripts.sig_traitor = [
    {
      desc: '<span class="log-bad">Commander (TRAITOR): sends ATTACK to G1, RETREAT to others — but each message is signed.</span>',
      packets: [
        { from: 'C', to: 'G1', ...ATTACK },
        { from: 'C', to: 'G2', ...RETREAT },
        { from: 'C', to: 'G3', ...RETREAT },
        { from: 'C', to: 'G4', ...RETREAT },
      ],
      highlights: [
        { from: 'C', to: 'G1', color: '#7bcdab44' },
        { from: 'C', to: 'G2', color: '#f0808044' },
        { from: 'C', to: 'G3', color: '#f0808044' },
        { from: 'C', to: 'G4', color: '#f0808044' },
      ]
    },
    {
      desc: '<span class="log-warn">Generals relay with the commander\'s signature attached. G1 shows "ATK [sig:C]". G2 shows "RET [sig:C]".</span>',
      packets: [
        { from: 'G1', to: 'G2', ...ATTACK },
        { from: 'G2', to: 'G1', ...RETREAT },
        { from: 'G3', to: 'G2', ...RETREAT },
        { from: 'G4', to: 'G3', ...RETREAT },
      ],
      highlights: [
        { from: 'G1', to: 'G2', color: '#f0b42944' },
        { from: 'G2', to: 'G1', color: '#f0b42944' },
      ]
    },
    {
      desc: '<span class="log-ok">✅ G2 has two C-signed messages: ATK and RET. Impossible from a loyal commander. Traitor DETECTED! Fall back to safe default (RETREAT).</span>',
      packets: [],
      highlights: [
        { from: 'C', to: 'G1', color: '#f0b429aa' },
        { from: 'C', to: 'G2', color: '#f0b429aa' },
      ]
    },
  ];
}

function getScript() {
  var traitor = document.getElementById('traitor-check').checked;
  var key = simMode + '_' + (traitor ? 'traitor' : 'loyal');
  return simScripts[key] || simScripts.nosig_loyal;
}

function stepSim() {
  var script = getScript();
  simStep++;
  if (simStep >= script.length) { simStep = script.length - 1; return; }

  var step = script[simStep];
  setLog(step.desc);
  updateStepBar(simStep, script.length);

  // Enable/disable
  document.getElementById('btn-step').disabled = (simStep >= script.length - 1);

  // Draw base with highlights
  drawBase(step.highlights || []);

  // Animate packets sequentially
  var packets = step.packets.slice();
  function fire() {
    if (!packets.length) return;
    var p = packets.shift();
    animatePacket(p.from, p.to, p.label, p.color, function() {
      drawBase(step.highlights || []);
      fire();
    });
  }
  fire();
}

function resetSim() {
  animFrames.forEach(cancelAnimationFrame);
  animFrames = [];
  simStep = -1;
  isTraitor = document.getElementById('traitor-check').checked;
  buildScripts();
  drawBase([]);
  buildStepBar();
  setLog('<span class="log-dim">Press "Next step" to begin the simulation.</span>');
  document.getElementById('btn-step').disabled = false;
}

function setMode(m) {
  simMode = m;
  document.getElementById('tab-nosig').classList.toggle('active', m === 'nosig');
  document.getElementById('tab-sig').classList.toggle('active', m === 'sig');
  resetSim();
}

function setLog(html) {
  document.getElementById('sim-log').innerHTML = html;
}

function buildStepBar() {
  var script = getScript();
  var bar = document.getElementById('step-bar');
  bar.innerHTML = '';
  for (var i = 0; i < script.length; i++) {
    var d = document.createElement('div');
    d.className = 'sim-step-dot';
    bar.appendChild(d);
  }
}

function updateStepBar(current, total) {
  var dots = document.querySelectorAll('.sim-step-dot');
  dots.forEach(function(d, i) {
    d.classList.toggle('done',   i < current);
    d.classList.toggle('active', i === current);
  });
}

// ════════════════════════════════════════════════════════════════
//  JWT TAMPER DEMO  (HMAC-SHA256 in pure JS via SubtleCrypto)
// ════════════════════════════════════════════════════════════════
var ORIGINAL_PAYLOAD = '{\n  "sub": "user_123",\n  "role": "user",\n  "exp": 9999999999\n}';

function b64url(buf) {
  var bytes = new Uint8Array(buf);
  var str = '';
  bytes.forEach(function(b) { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function strToBytes(str) {
  return new TextEncoder().encode(str);
}

async function hmacSHA256(key, data) {
  var k = await crypto.subtle.importKey(
    'raw', strToBytes(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  return await crypto.subtle.sign('HMAC', k, strToBytes(data));
}

var HEADER_B64 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
var originalSig = null;

async function updateJWT() {
  var payloadText = document.getElementById('jwt-payload-input').value;
  var secret      = document.getElementById('jwt-secret').value;

  var payloadB64;
  try {
    payloadB64 = b64url(strToBytes(payloadText));
  } catch(e) {
    return;
  }

  var signing = HEADER_B64 + '.' + payloadB64;

  // compute current sig
  var sigBuf    = await hmacSHA256(secret, signing);
  var currentSig = b64url(sigBuf);

  // compute original sig (payload = original, same secret)
  var origPayB64 = b64url(strToBytes(ORIGINAL_PAYLOAD));
  var origSigBuf = await hmacSHA256(secret, HEADER_B64 + '.' + origPayB64);
  var origSig    = b64url(origSigBuf);

  // The displayed signature is always the ORIGINAL one (simulating the server's stored sig)
  document.getElementById('jwt-h-display').textContent = HEADER_B64;
  document.getElementById('jwt-p-display').textContent = payloadB64.substring(0, 32) + '…';
  document.getElementById('jwt-s-display').textContent = origSig.substring(0, 20) + '…';

  // Valid only when payload matches original
  var valid = (payloadText.trim() === ORIGINAL_PAYLOAD.trim());
  var badge = document.getElementById('verify-badge');
  if (valid) {
    badge.className = 'verify-badge badge-ok';
    badge.innerHTML = '&#10003; Signature valid';
  } else {
    badge.className = 'verify-badge badge-fail';
    badge.innerHTML = '&#10007; Signature INVALID — token rejected';
  }
}

function setPayload(which) {
  if (which === 'admin') {
    document.getElementById('jwt-payload-input').value =
      '{\n  "sub": "user_123",\n  "role": "admin",\n  "exp": 9999999999\n}';
  } else {
    document.getElementById('jwt-payload-input').value = ORIGINAL_PAYLOAD;
  }
  updateJWT();
}

// ─── Copy buttons ────────────────────────────────────────────────
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1600);
  });
}

// ─── Boot ────────────────────────────────────────────────────────
window.addEventListener('load', function() {
  initCanvas();
  updateJWT();

  // Redraw canvas on window resize
  window.addEventListener('resize', function() {
    var wrap  = canvas.parentElement;
    var scale = wrap.clientWidth / 520;
    canvas.style.width  = (520 * scale) + 'px';
    canvas.style.height = (340 * scale) + 'px';
  });
  window.dispatchEvent(new Event('resize'));
});
</script>
