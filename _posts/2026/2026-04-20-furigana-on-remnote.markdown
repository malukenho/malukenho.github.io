---
layout: post
title: "&#12405;&#12426;&#12364;&#12394; Furigana in RemNote: Three Attempts and One CSS Trick"
author: Jefersson Nathan
date: Mon Apr 20 10:00:00 CEST 2026
categories: [ "post" ]
description: "How I spent way too long trying to add furigana to RemNote flashcards — and the surprisingly simple CSS trick that finally worked."
tags: [japanese, css, remnote, spaced-repetition, hacks]
---

{: class="marginalia" }
**Furigana** (振り仮名) are<br/>the small hiragana<br/>annotations above kanji<br/>that show pronunciation.<br/>Essential for learners<br/>but invisible to most<br/>Japanese study apps.

I have been using [RemNote](https://www.remnote.com/){: class="external no-highlight"} for
everything — notes, flashcards, language learning. It is genuinely the best tool I have found
for spaced repetition. But there is one gap that kept bothering me: **furigana**.

When you are learning Japanese, you constantly need the reading (hiragana) printed above kanji.
Native readers don't need it, but for learners it is the difference between reading a sentence
and staring at a wall of beautiful symbols you cannot decode.

RemNote has no built-in furigana support. So I tried to add it myself. Three times.

---

<style>
/* ─── Journey timeline ──────────────────────────────────────── */
.journey {
  display: flex; flex-direction: column; gap: 0;
  position: relative; margin: 2rem 0;
}
.journey::before {
  content: ''; position: absolute; left: 22px; top: 0; bottom: 0;
  width: 3px; background: linear-gradient(to bottom, #f08080, #fbef8a, #7bcdab);
  border-radius: 4px;
}
.attempt {
  display: flex; gap: 1.2rem; padding: 1.2rem 0; position: relative;
}
.attempt-num {
  width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1rem; z-index: 1; border: 3px solid;
  transition: all .3s;
}
.attempt-num.fail    { background: #2a1616; border-color: #f08080; color: #f08080; }
.attempt-num.partial { background: #25240e; border-color: #fbef8a; color: #fbef8a; }
.attempt-num.win     { background: #152319; border-color: #7bcdab; color: #7bcdab; }
.attempt-body { flex: 1; }
.attempt-title {
  font-size: 1.05rem; font-weight: 700; color: #fbef8a;
  margin: 0 0 .4rem; display: flex; align-items: center; gap: .5rem;
}
.attempt-tag {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; padding: 2px 8px; border-radius: 12px;
}
.tag-fail    { background: rgba(240,80,80,.15);   color: #f08080; }
.tag-partial { background: rgba(251,239,138,.12); color: #fbef8a; }
.tag-win     { background: rgba(123,205,171,.15); color: #7bcdab; }
.attempt-desc {
  color: rgba(255,255,255,.72); font-size: .84rem;
  line-height: 1.75; margin: 0;
}

/* ─── Code blocks ──────────────────────────────────────────── */
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
.pp  { color: #fbef8a; }
.at  { color: #f0b429; }

/* ─── Callouts ──────────────────────────────────────────────── */
.callout { border-radius: 8px; padding: 1rem 1.2rem; margin: 1rem 0; font-size: .84rem; line-height: 1.7; }
.callout-green  { background: #1a2e22; border-left: 3px solid #7bcdab; color: rgba(255,255,255,.82); }
.callout-yellow { background: #25240e; border-left: 3px solid #fbef8a; color: rgba(255,255,255,.82); }
.callout-red    { background: #2a1616; border-left: 3px solid #f08080; color: rgba(255,255,255,.82); }
.callout strong { color: #fff; }

/* ─── Live furigana playground ──────────────────────────────── */
.furi-playground {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 12px; padding: 1.5rem; margin: 1.8rem 0;
}
.furi-playground h4 { margin: 0 0 1rem; color: #fbef8a; font-size: .95rem; }
.furi-input-row {
  display: grid; grid-template-columns: 1fr 1fr auto; gap: .6rem;
  align-items: end; margin-bottom: 1.2rem;
}
@media (max-width: 580px) { .furi-input-row { grid-template-columns: 1fr; } }
.furi-field label {
  display: block; font-size: 11px; text-transform: uppercase;
  letter-spacing: .07em; color: rgba(255,255,255,.38); margin-bottom: .3rem;
}
.furi-input {
  width: 100%; background: #111214; border: 1px solid #2e2f35; border-radius: 6px;
  color: rgba(255,255,255,.85); font-family: "JetBrains Mono", monospace;
  font-size: 13px; padding: 8px 10px; box-sizing: border-box;
}
.furi-input:focus { outline: none; border-color: #7bcdab; }
.add-btn {
  padding: 8px 18px; background: #152319; border: 1px solid #7bcdab;
  border-radius: 6px; color: #7bcdab; cursor: pointer; font-family: inherit;
  font-size: 13px; transition: all .2s; white-space: nowrap;
}
.add-btn:hover { background: #7bcdab; color: #19191c; }
.furi-preview-box {
  background: #111214; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 1.4rem 1.2rem; min-height: 64px; display: flex;
  align-items: center; gap: .2rem; flex-wrap: wrap;
}
.furi-preview-box .rem-word {
  display: inline-block; position: relative; margin: 1.4rem .15rem .2rem;
  font-size: 1.25rem;
}
.furi-preview-box .rem-word .reading {
  position: absolute; top: -1.3em; left: 50%; transform: translateX(-50%);
  font-size: .6rem; color: #fbef8a; white-space: nowrap;
  font-family: "JetBrains Mono", monospace;
  pointer-events: none;
}
.furi-preview-box .plain-word {
  font-size: 1.25rem; margin: .2rem .1rem; color: rgba(255,255,255,.7);
}
.furi-tokens { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .8rem; }
.furi-token {
  display: inline-flex; align-items: center; gap: .3rem;
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 6px;
  padding: 3px 8px; font-size: 12px; color: rgba(255,255,255,.6);
}
.furi-token .kanji  { color: #fbef8a; }
.furi-token .furi   { color: #7bcdab; }
.furi-token .remove {
  background: transparent; border: none; color: #f08080; cursor: pointer;
  font-size: 14px; padding: 0 0 0 4px; line-height: 1;
}
.remnote-badge {
  display: inline-block; background: #252629; border: 1px solid #3a3b40;
  border-radius: 4px; padding: 0 5px; font-family: "JetBrains Mono", monospace;
  font-size: .82rem; color: rgba(255,255,255,.65);
}
/* RemNote-like card preview */
.remnote-card {
  background: #fafafa; border-radius: 10px; padding: 1.2rem 1.6rem;
  margin: 1rem 0; display: flex; align-items: center; gap: 1rem;
  font-size: 1.2rem; color: #2d2d2d; position: relative; overflow: visible;
  box-shadow: 0 2px 12px rgba(0,0,0,.4);
}
.remnote-card .rn-bullet {
  width: 8px; height: 8px; border-radius: 50%; background: #2d2d2d;
  flex-shrink: 0; margin-top: 4px; align-self: flex-start;
}
.remnote-card .rn-content { display: flex; align-items: center; gap: .3rem; flex-wrap: wrap; }
.remnote-card .rn-word {
  position: relative; display: inline-block;
  margin-top: 1.2rem;
}
.remnote-card .rn-word .rn-furi {
  position: absolute; top: -1.2em; left: 50%; transform: translateX(-50%);
  font-size: .5em; white-space: nowrap; color: #555;
}
.remnote-card .rn-highlight { color: #e6900a; font-weight: 700; }
.remnote-card .rn-superscript-demo {
  position: absolute;
  margin-top: -4px;
  margin-left: -30px;
  font-size: .55em;
  color: #555;
  top: 0;
}
/* method comparison table */
.method-compare {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 1.5rem 0;
}
.method-compare th {
  padding: 10px 14px; background: #1e1f24; color: #fbef8a;
  font-size: 11px; text-transform: uppercase; letter-spacing: .07em; text-align: left;
}
.method-compare td { padding: 10px 14px; border-top: 1px solid #2e2f35; color: rgba(255,255,255,.8); }
.method-compare tr:hover td { background: #1e1f24; }
.ck { color: #7bcdab; } .cx { color: #f08080; } .cp { color: #fbef8a; }

/* ─── CSS anatomy diagram ───────────────────────────────────── */
.css-anatomy {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;
  font-family: "JetBrains Mono", monospace; font-size: 13px;
}
.css-anatomy h4 { color: #fbef8a; margin: 0 0 1rem; font-family: inherit; font-size: .9rem; }
.css-line { display: flex; align-items: flex-start; gap: .6rem; padding: .3rem 0; cursor: default; }
.css-prop { color: #7bcdab; flex-shrink: 0; }
.css-val  { color: #f8c555; }
.css-comment { color: #5a6272; font-style: italic; font-size: .75rem; }
.css-tooltip {
  display: none; position: absolute; background: #2a2b30;
  border: 1px solid #3a3b40; border-radius: 8px; padding: .7rem 1rem;
  font-size: .78rem; color: rgba(255,255,255,.85); z-index: 20;
  max-width: 220px; line-height: 1.6; pointer-events: none;
  box-shadow: 0 4px 20px rgba(0,0,0,.5);
}
.css-line:hover .css-tooltip { display: block; }
.css-line { position: relative; }
.css-hint {
  display: inline-block; width: 14px; height: 14px; border-radius: 50%;
  background: #2e2f35; color: rgba(255,255,255,.4); font-size: 9px;
  text-align: center; line-height: 14px; cursor: help; margin-left: 4px;
  flex-shrink: 0;
}
/* screenshot */
.screenshot-wrap {
  margin: 1.5rem 0; border-radius: 12px; overflow: hidden;
  border: 1px solid #2e2f35; box-shadow: 0 4px 24px rgba(0,0,0,.5);
}
.screenshot-wrap img { display: block; width: 100%; height: auto; }
.screenshot-caption {
  background: #1a1b1f; padding: .6rem 1rem; font-size: .78rem;
  color: rgba(255,255,255,.45); text-align: center;
}
</style>

## Why Furigana Matters

Before diving into the attempts, let me show you the result we are working toward.
This is what furigana looks like in a RemNote card — the small hiragana reading sitting
above the highlighted kanji:

<div class="screenshot-wrap">
  <img src="/imgs/furigana-remnote-result.png" alt="Furigana working in RemNote: the kanji 湿気 (shikke, meaning humidity) displayed with しっけ reading above it in a flashcard" />
  <div class="screenshot-caption">
    &#28207;&#27668; (shikke, "humidity") with furigana &#12375;&#12387;&#12369; above it &mdash;
    exactly what we needed for Japanese vocabulary cards.
  </div>
</div>

The word &#28207;&#27668; (*shikke*, humidity) shows its reading &#12375;&#12387;&#12369; above the kanji.
Simple, clean, readable. Getting here took three attempts.

---

## The Journey

<div class="journey">

  <!-- ─── Attempt 1 ─── -->
  <div class="attempt">
    <div class="attempt-num fail">1</div>
    <div class="attempt-body">
      <div class="attempt-title">
        The Plugin Idea
        <span class="attempt-tag tag-fail">Abandoned</span>
      </div>
      <p class="attempt-desc">
        My first instinct was the "right" engineer's answer: <em>write a RemNote plugin that
        intercepts the card renderer and rewrites REM text nodes into proper HTML
        <code>&lt;ruby&gt;&lt;rb&gt;&#28207;&#27668;&lt;/rb&gt;&lt;rt&gt;&#12375;&#12387;&#12369;&lt;/rt&gt;&lt;/ruby&gt;</code> elements.</em>
        The HTML <code>&lt;ruby&gt;</code> element was literally designed for this — it is the
        semantic, accessible, correct solution.
      </p>
      <p class="attempt-desc" style="margin-top:.6rem;">
        The problem: RemNote's plugin API gives you a lot of power over custom <em>widgets</em>,
        but not fine-grained control over the inline text rendering of existing REM nodes.
        You can add sidebars, power-up panes, custom views — but intercepting and rewriting
        the core editor's inline text is a different story. The DOM is re-rendered by a React
        virtual DOM and your mutations get blown away on the next update cycle.
        After a couple of evenings I had a prototype that worked for exactly one second
        before being wiped.
      </p>
    </div>
  </div>

  <!-- ─── Attempt 2 ─── -->
  <div class="attempt">
    <div class="attempt-num partial">2</div>
    <div class="attempt-body">
      <div class="attempt-title">
        Manual HTML Editing
        <span class="attempt-tag tag-partial">Worked, but painful</span>
      </div>
      <p class="attempt-desc">
        Fine. If I cannot inject HTML automatically, I will type it manually.
        RemNote lets you embed HTML in a REM via a special code block.
        I could write the full <code>&lt;ruby&gt;</code> markup directly in each card.
      </p>
      <p class="attempt-desc" style="margin-top:.6rem;">
        This technically worked. But typing raw HTML into every flashcard is not
        a workflow — it is punishment. For a vocabulary deck of a few hundred words,
        this would mean writing something like
        <code>&lt;ruby&gt;&lt;rb&gt;X&lt;/rb&gt;&lt;rt&gt;Y&lt;/rt&gt;&lt;/ruby&gt;</code>
        hundreds of times. The whole point of RemNote is fast capture.
        Making every card a 30-second HTML exercise defeats the purpose entirely.
      </p>
    </div>
  </div>

  <!-- ─── Attempt 3 ─── -->
  <div class="attempt">
    <div class="attempt-num win">3</div>
    <div class="attempt-body">
      <div class="attempt-title">
        CSS + Superscript
        <span class="attempt-tag tag-win">&#10003; This worked</span>
      </div>
      <p class="attempt-desc">
        RemNote has a native superscript formatting shortcut. And RemNote lets you inject
        custom CSS into your workspace. What if I styled the superscript so that instead
        of appearing <em>after and above</em> the preceding text, it appeared <em>directly
        above</em> it — like furigana?
      </p>
      <p class="attempt-desc" style="margin-top:.6rem;">
        The workflow: write the kanji, then immediately write the reading as a superscript.
        The CSS pulls the superscript up and left so it hovers above the kanji.
        No plugin, no raw HTML, no build step. Two keystrokes in RemNote.
      </p>
    </div>
  </div>

</div>

---

## How the CSS Trick Works

{: class="marginalia" }
RemNote superscripts get<br/>the class `.rn-superscript`.<br/>Because we only change<br/>positioning (not display),<br/>the text still reads<br/>correctly and the<br/>card still exports fine.

The entire solution is four lines of CSS injected into RemNote's custom CSS field:

<div class="code-wrap">
  <div class="code-lang">CSS <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre><span class="at">.rn-superscript</span> {
    <span class="pp">position</span>: <span class="st">absolute</span>;
    <span class="pp">margin-top</span>: <span class="ty">-4px</span>;
    <span class="pp">margin-left</span>: <span class="ty">-30px</span>;
}</pre>
</div>

Click on each property below to understand what it does:

<div class="css-anatomy">
  <h4>Property breakdown &mdash; hover any line</h4>

  <div class="css-line">
    <span class="css-prop">position:</span>
    <span class="css-val">absolute;</span>
    <span class="css-hint">?</span>
    <div class="css-tooltip">
      <strong>Takes the element out of normal flow.</strong><br/>
      Without this, the superscript sits inline after the kanji.
      Absolute positioning lets us freely move it with margin-top / margin-left.
    </div>
  </div>

  <div class="css-line">
    <span class="css-prop">margin-top:</span>
    <span class="css-val">-4px;</span>
    <span class="css-hint">?</span>
    <div class="css-tooltip">
      <strong>Pulls the element upward.</strong><br/>
      A negative top margin moves it above the baseline of the parent text.
      Combined with the browser's default superscript vertical-align, it lands
      just above the kanji character.
    </div>
  </div>

  <div class="css-line">
    <span class="css-prop">margin-left:</span>
    <span class="css-val">-30px;</span>
    <span class="css-hint">?</span>
    <div class="css-tooltip">
      <strong>Shifts the element leftward.</strong><br/>
      Without this, the reading would appear above the space <em>after</em> the kanji.
      &minus;30px pulls it back to sit above the kanji itself.
      You may need to adjust this based on the font size and kanji width.
    </div>
  </div>
</div>

<div class="callout callout-yellow">
  <strong>Adjust for your font:</strong> The <code>-30px</code> value is calibrated for RemNote's
  default font at the default zoom level. If you use a larger font or have zoomed in,
  you may need to increase this value. Try increments of 5px until the reading
  centres over the kanji.
</div>

### What it looks like in the editor

The reading is written as a **superscript** right after the kanji. In the rendered card, CSS
repositions it to appear above:

<div class="remnote-card">
  <div class="rn-bullet"></div>
  <div class="rn-content">
    &#20170;&#26085;&#12398;&#12288;
    <span class="rn-highlight rn-word">
      <span class="rn-furi">&#12375;&#12387;&#12369;</span>
      &#28207;&#27668;
    </span>
    &#12288;&#8594;&#12288; A humidade de hoje.
  </div>
</div>

---

## Try It: Build Your Own Furigana Card

{: class="marginalia" }
Type any kanji and its<br/>reading below to preview<br/>what the RemNote card<br/>will look like with the<br/>CSS applied. Multiple<br/>words appear in sequence.

Add words to build a sentence and preview the final RemNote card:

<div class="furi-playground">
  <h4>&#12405;&#12426;&#12364;&#12394; card builder</h4>

  <div class="furi-input-row">
    <div class="furi-field">
      <label>Kanji / word</label>
      <input class="furi-input" id="inp-kanji" placeholder="e.g. &#28207;&#27668;" maxlength="20"/>
    </div>
    <div class="furi-field">
      <label>Reading (furigana)</label>
      <input class="furi-input" id="inp-furi" placeholder="e.g. &#12375;&#12387;&#12369;" maxlength="20"/>
    </div>
    <button class="add-btn" onclick="addWord()">+ Add</button>
  </div>

  <div class="furi-tokens" id="furi-tokens">
    <!-- populated by JS -->
  </div>

  <div style="margin:.8rem 0 .4rem;font-size:.75rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.07em;">
    Card preview
  </div>
  <div class="furi-preview-box" id="furi-preview">
    <span style="color:rgba(255,255,255,.25);font-size:.85rem;">Add words above to see your card&hellip;</span>
  </div>
</div>

---

## How to Apply It in RemNote

<div class="code-wrap">
  <div class="code-lang">Steps <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre><span class="cm">// 1. Open RemNote Settings → Appearance → Custom CSS</span>
<span class="cm">// 2. Paste the following:</span>

<span class="at">.rn-superscript</span> {
    <span class="pp">position</span>: <span class="st">absolute</span>;
    <span class="pp">margin-top</span>: <span class="ty">-4px</span>;
    <span class="pp">margin-left</span>: <span class="ty">-30px</span>;
}

<span class="cm">// 3. In any REM, type the kanji normally.</span>
<span class="cm">// 4. Immediately after, use the superscript shortcut:</span>
<span class="cm">//    Mac:     Cmd + Shift + .</span>
<span class="cm">//    Windows: Ctrl + Shift + .</span>
<span class="cm">// 5. Type the hiragana reading.</span>
<span class="cm">// 6. Press the superscript shortcut again to exit superscript mode.</span></pre>
</div>

---

## Method Comparison

<table class="method-compare">
  <thead>
    <tr>
      <th>Method</th>
      <th>Works?</th>
      <th>Fast to use?</th>
      <th>No plugin needed?</th>
      <th>Exports cleanly?</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>&#9312; Plugin (ruby HTML)</td>
      <td class="cx">&#10007;</td>
      <td class="ck">&#10003;</td>
      <td class="cx">&#10007;</td>
      <td class="ck">&#10003;</td>
    </tr>
    <tr>
      <td>&#9313; Manual HTML</td>
      <td class="cp">~</td>
      <td class="cx">&#10007;</td>
      <td class="ck">&#10003;</td>
      <td class="ck">&#10003;</td>
    </tr>
    <tr>
      <td>&#9314; CSS + superscript</td>
      <td class="ck">&#10003;</td>
      <td class="ck">&#10003;</td>
      <td class="ck">&#10003;</td>
      <td class="ck">&#10003;</td>
    </tr>
  </tbody>
</table>

---

## The Lesson

The most elegant solution was not the one that used the right HTML element
(<code>&lt;ruby&gt;</code>). It was the one that worked within RemNote's actual constraints —
using a feature that already existed (superscript), combined with a CSS repositioning trick
that required zero changes to the app.

Sometimes the best engineering is not about adding new code, but about finding
the right angle on existing primitives.

&#28207;&#27668;&#12398;&#12424;&#12358;&#12395;&#12289;&#30495;&#23455;&#12399;&#12375;&#12400;&#12375;&#12400;&#34920;&#38996;&#12395;&#12354;&#12427;&#12290;

*(Like humidity — the solution was right there on the surface.)*

<script>
// ─── Furigana card builder ────────────────────────────────────
var words = [];

function addWord() {
  var kanji = document.getElementById('inp-kanji').value.trim();
  var furi  = document.getElementById('inp-furi').value.trim();
  if (!kanji) return;
  words.push({ kanji: kanji, furi: furi });
  document.getElementById('inp-kanji').value = '';
  document.getElementById('inp-furi').value  = '';
  renderBuilder();
  document.getElementById('inp-kanji').focus();
}

function removeWord(idx) {
  words.splice(idx, 1);
  renderBuilder();
}

function renderBuilder() {
  // tokens
  var tokHtml = '';
  words.forEach(function(w, i) {
    tokHtml += '<span class="furi-token">'
      + '<span class="kanji">' + esc(w.kanji) + '</span>'
      + (w.furi ? '<span style="color:rgba(255,255,255,.3)">:</span><span class="furi">' + esc(w.furi) + '</span>' : '')
      + '<button class="remove" onclick="removeWord(' + i + ')">&#215;</button>'
      + '</span>';
  });
  document.getElementById('furi-tokens').innerHTML = tokHtml;

  // preview
  if (!words.length) {
    document.getElementById('furi-preview').innerHTML =
      '<span style="color:rgba(255,255,255,.25);font-size:.85rem;">Add words above to see your card&hellip;</span>';
    return;
  }
  var html = '';
  words.forEach(function(w) {
    if (w.furi) {
      html += '<span class="rem-word">'
            + '<span class="reading">' + esc(w.furi) + '</span>'
            + esc(w.kanji)
            + '</span>';
    } else {
      html += '<span class="plain-word">' + esc(w.kanji) + '</span>';
    }
  });
  document.getElementById('furi-preview').innerHTML = html;
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Copy buttons ─────────────────────────────────────────────
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1600);
  });
}

// Enter key support
document.addEventListener('DOMContentLoaded', function() {
  ['inp-kanji','inp-furi'].forEach(function(id) {
    document.getElementById(id).addEventListener('keydown', function(e) {
      if (e.key === 'Enter') addWord();
    });
  });
  // Pre-populate with example
  words = [
    { kanji: '今日の', furi: '' },
    { kanji: '湿気', furi: 'しっけ' },
    { kanji: '→ A humidade', furi: '' },
  ];
  renderBuilder();
});
</script>
