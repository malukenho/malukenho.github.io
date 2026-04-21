---
layout: post
title: "OpenWhisper: Building a Privacy-First Voice Dictation App for macOS"
date: 2026-04-02 10:00:00 +0000
categories: ["post"]
tags: [swift, macos, whisper, ai, privacy, open-source]
---

{: class="marginalia" }
🎙️ I use this daily to<br/>dictate commit messages,<br/>Slack replies, and code<br/>comments without ever<br/>leaving my editor.

Here's a scenario I lived through too many times: I'm deep in a flow state, cursor blinking in the middle of a function, and I need to write a commit message. I alt-tab to Terminal, type the message badly because my fingers are still in code mode, make three typos, fix them, tab back, and spend thirty seconds remembering where I was.

It sounds minor. It isn't. That context switch is a small death each time it happens. Multiply it by the forty or fifty text-entry moments scattered across a developer's day — commit messages, PR descriptions, Slack threads, inline code comments, GitHub issue bodies — and you're hemorrhaging focus.

Voice dictation should be the answer. It is, in theory. In practice, macOS Dictation sends audio to Apple's servers. Dragon NaturallySpeaking is a $200 Windows relic. The built-in shortcuts require you to navigate to the field before activating them. And none of them are programmable: you can't say "transcribe this through Gemini first and fix the grammar."

So I built **OpenWhisper** — a macOS menu bar app that runs [OpenAI Whisper](https://github.com/openai/whisper) entirely locally. Hold `FN`, speak, release. The transcription appears in whatever app you were in, even if you've switched windows since. Audio never leaves your machine. The whole thing is open source, MIT-licensed, and built in Swift.

This post is a deep dive into how it works, what I learned building it, and an interactive tour of the features that matter most.

---

<style>
/* ── Post-scoped styles ──────────────────────────────────────── */
.ow-section { margin: 2.6rem 0; }

/* Architecture diagram */
.arch-wrap {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.6rem 0;
  overflow: hidden;
}
.arch-wrap h3 { margin: 0 0 1rem; color: #fbef8a; font-size: 15px; }
#archCanvas { width: 100%; display: block; cursor: pointer; }
.arch-desc-card {
  background: #1e1f24;
  border: 1px solid #3a3b40;
  border-radius: 10px;
  padding: 14px 18px;
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.7;
  display: none;
  color: rgba(255,255,255,.82);
}
.arch-desc-card.visible { display: block; }
.arch-desc-card strong { color: #7bcdab; }
.arch-desc-card .arch-stage-title { color: #fbef8a; font-weight: 700; font-size: 15px; margin-bottom: 6px; }

/* Model table */
.model-table-wrap { overflow-x: auto; margin: 1.6rem 0; }
.model-table {
  width: 100%; border-collapse: collapse; font-size: 14px;
  background: #1e1f24; border-radius: 10px; overflow: hidden;
}
.model-table thead tr { background: #2a2b30; }
.model-table th {
  padding: 12px 16px; text-align: left; color: #fbef8a;
  font-size: 12px; text-transform: uppercase; letter-spacing: .07em;
  cursor: pointer; user-select: none; white-space: nowrap;
}
.model-table th:hover { color: #fff; }
.model-table th .sort-icon { margin-left: 4px; opacity: .45; }
.model-table th.sorted .sort-icon { opacity: 1; color: #7bcdab; }
.model-table td { padding: 11px 16px; border-top: 1px solid #2e2f35; color: rgba(255,255,255,.82); }
.model-table tr:hover td { background: #252629; }
.model-table .speed-stars { color: #fbef8a; letter-spacing: 2px; }
.model-table .badge-rec {
  display: inline-block; padding: 2px 8px; border-radius: 20px;
  font-size: 11px; font-weight: 700;
  background: #1a3a2a; color: #7bcdab;
}
.model-table .latency-bar {
  display: flex; align-items: center; gap: 8px;
}
.model-table .latency-bar .lb-track {
  flex: 1; background: #2e2f35; border-radius: 4px; height: 6px; overflow: hidden;
}
.model-table .latency-bar .lb-fill {
  height: 100%; border-radius: 4px;
  transition: width .5s ease;
}

/* Speed chart */
.chart-wrap {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.6rem 0;
}
.chart-wrap h3 { margin: 0 0 1rem; color: #fbef8a; font-size: 15px; }
#speedChart { width: 100%; display: block; }

/* Waveform demo */
.waveform-demo {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 2rem;
  margin: 1.6rem 0;
  text-align: center;
}
.waveform-demo h3 { margin: 0 0 .5rem; color: #fbef8a; }
.waveform-demo .wd-subtitle {
  color: rgba(255,255,255,.5); font-size: 13px; margin-bottom: 1.5rem;
}
.mic-btn {
  width: 80px; height: 80px; border-radius: 50%;
  background: #2a2b30; border: 2px solid #3a3b40;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.4rem; cursor: pointer;
  transition: all .2s; user-select: none; -webkit-user-select: none;
  font-size: 32px;
}
.mic-btn:hover { border-color: #7bcdab; }
.mic-btn.recording {
  background: #1a3a2a; border-color: #7bcdab;
  box-shadow: 0 0 0 8px rgba(123,205,171,.15), 0 0 0 16px rgba(123,205,171,.07);
  animation: mic-pulse 1.2s ease-in-out infinite;
}
@keyframes mic-pulse {
  0%, 100% { box-shadow: 0 0 0 8px rgba(123,205,171,.15), 0 0 0 16px rgba(123,205,171,.07); }
  50% { box-shadow: 0 0 0 14px rgba(123,205,171,.2), 0 0 0 26px rgba(123,205,171,.05); }
}
.waveform-bars {
  display: flex; align-items: flex-end; justify-content: center;
  gap: 3px; height: 48px; margin-bottom: 1.2rem;
}
.waveform-bars .bar {
  width: 4px; border-radius: 3px;
  background: #7bcdab;
  transition: height .1s ease;
}
.waveform-bars .bar.idle { background: #2e2f35; height: 4px !important; }
.wd-status {
  font-size: 14px; color: rgba(255,255,255,.7); min-height: 22px;
  margin-bottom: .8rem;
}
.wd-status.transcribing { color: #fbef8a; }
.wd-status.done { color: #7bcdab; }
.wd-result {
  background: #1e1f24; border-radius: 8px; padding: 14px 18px;
  font-family: 'JetBrains Mono', monospace; font-size: 14px;
  color: #fff; text-align: left; display: none; border-left: 3px solid #7bcdab;
  line-height: 1.5;
}
.wd-result.visible { display: block; }
.wd-hint {
  font-size: 12px; color: rgba(255,255,255,.3);
  margin-top: 1rem;
}

/* Code blocks */
.code-block {
  background: #13141a;
  border: 1px solid #2e2f35;
  border-radius: 10px;
  padding: 1.2rem 1.4rem;
  margin: 1rem 0;
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #e0e0e0;
}
.code-block .kw  { color: #c792ea; }
.code-block .ty  { color: #82aaff; }
.code-block .fn  { color: #82cfff; }
.code-block .st  { color: #c3e88d; }
.code-block .cm  { color: #546e7a; font-style: italic; }
.code-block .nu  { color: #f78c6c; }
.code-block .op  { color: #89ddff; }
.code-block .id  { color: #e0e0e0; }
.code-block .at  { color: #ffcb6b; }
.code-block .mc  { color: #f07178; }
.code-label {
  font-size: 11px; color: rgba(255,255,255,.35);
  text-transform: uppercase; letter-spacing: .08em;
  margin-bottom: .4rem;
}

/* Post-processing configurator */
.pp-config {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.6rem 0;
}
.pp-config h3 { margin: 0 0 1rem; color: #fbef8a; }
.pp-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.pp-field { flex: 1; min-width: 160px; }
.pp-field label {
  display: block; font-size: 12px; color: rgba(255,255,255,.5);
  margin-bottom: 6px; text-transform: uppercase; letter-spacing: .06em;
}
.pp-field select, .pp-field input, .pp-field textarea {
  width: 100%; padding: 9px 12px;
  background: #2a2b30; border: 1px solid #3a3b40;
  border-radius: 6px; color: #fff; font-size: 14px;
  box-sizing: border-box; outline: none;
  font-family: inherit;
}
.pp-field select:focus, .pp-field input:focus, .pp-field textarea:focus {
  border-color: #7bcdab;
}
.pp-field textarea { resize: vertical; min-height: 80px; }
.pp-gemini-row { display: none; margin-bottom: 12px; }
.pp-gemini-row.visible { display: block; }
.pp-preview-btn {
  background: #7bcdab; color: #19191c;
  border: none; border-radius: 8px;
  padding: 0.6rem 1.4rem; font-weight: 700; cursor: pointer;
  font-size: 14px; transition: opacity .2s;
}
.pp-preview-btn:hover { opacity: .85; }
.pp-preview-result {
  margin-top: 14px;
  background: #1e1f24; border-radius: 8px; padding: 16px 18px;
  display: none;
}
.pp-preview-result.visible { display: block; }
.pp-preview-result .pp-label {
  font-size: 11px; color: rgba(255,255,255,.4);
  text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px;
}
.pp-preview-result .pp-text {
  font-size: 14px; color: rgba(255,255,255,.85); line-height: 1.6;
}
.pp-preview-result .pp-arrow {
  color: #7bcdab; font-size: 20px; text-align: center;
  margin: 10px 0; display: block;
}
.pp-processing-anim {
  display: none; text-align: center; padding: 10px;
  color: #fbef8a; font-size: 13px;
}
.pp-processing-anim.visible { display: block; }
.pp-dots span {
  display: inline-block; width: 6px; height: 6px;
  border-radius: 50%; background: #fbef8a; margin: 0 2px;
  animation: pp-dot-bounce .8s ease-in-out infinite;
}
.pp-dots span:nth-child(2) { animation-delay: .2s; }
.pp-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes pp-dot-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

/* Privacy diagram */
.privacy-diagram {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.6rem 0;
}
.privacy-diagram h3 { margin: 0 0 1rem; color: #fbef8a; }
#privacyCanvas { width: 100%; display: block; }

/* Getting started checklist */
.checklist-wrap {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.6rem 0;
}
.checklist-wrap h3 { margin: 0 0 1rem; color: #fbef8a; }
.checklist-item {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 12px 14px; border-radius: 8px; margin-bottom: 6px;
  cursor: pointer; transition: background .2s;
  border: 1px solid transparent;
}
.checklist-item:hover { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.07); }
.checklist-item.done { background: rgba(123,205,171,.07); border-color: rgba(123,205,171,.2); }
.checklist-item .ci-check {
  width: 24px; height: 24px; border-radius: 50%;
  border: 2px solid #3a3b40;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; font-size: 13px;
  transition: all .25s;
}
.checklist-item.done .ci-check {
  background: #7bcdab; border-color: #7bcdab; color: #19191c;
  animation: check-pop .3s cubic-bezier(.175,.885,.32,1.275);
}
@keyframes check-pop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}
.checklist-item .ci-content { flex: 1; }
.checklist-item .ci-title {
  font-weight: 600; font-size: 15px;
  color: rgba(255,255,255,.9);
  transition: color .2s;
}
.checklist-item.done .ci-title { color: #7bcdab; }
.checklist-item .ci-detail {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; color: rgba(255,255,255,.4);
  margin-top: 3px;
}
.checklist-progress {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 1rem;
}
.checklist-progress .cp-bar {
  flex: 1; background: #2e2f35; border-radius: 4px; height: 6px; overflow: hidden;
}
.checklist-progress .cp-fill {
  height: 100%; background: #7bcdab; border-radius: 4px;
  transition: width .4s ease;
  width: 0%;
}
.checklist-progress .cp-label {
  font-size: 12px; color: rgba(255,255,255,.4); white-space: nowrap;
}

/* Highlight box */
.highlight-box {
  background: rgba(123,205,171,.08);
  border: 1px solid rgba(123,205,171,.25);
  border-radius: 10px;
  padding: 1rem 1.4rem;
  margin: 1.4rem 0;
}

/* Callout tip/warn */
.ow-tip {
  border-left: 3px solid #7bcdab; background: #1a2e23;
  border-radius: 0 8px 8px 0; padding: 12px 16px;
  margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.ow-tip strong { color: #7bcdab; }
.ow-warn {
  border-left: 3px solid #fbef8a; background: #2a2a1a;
  border-radius: 0 8px 8px 0; padding: 12px 16px;
  margin: 1.2rem 0; font-size: 14px;
}
.ow-warn strong { color: #fbef8a; }

@media (max-width: 600px) {
  .pp-row { flex-direction: column; }
}
</style>

---

## The Architecture

Before diving into the code, here's a bird's-eye view of the data flow. Click any stage in the diagram to see what's happening under the hood.

<div class="arch-wrap">
  <h3>Data flow — click a stage to explore</h3>
  <canvas id="archCanvas" height="120"></canvas>
  <div class="arch-desc-card" id="archDescCard">
    <div class="arch-stage-title" id="archStageTitle"></div>
    <div id="archStageBody"></div>
  </div>
</div>

The key architectural decision is that every single stage happens on your machine. There's no SaaS intermediary, no background upload, no analytics beacon. The worst that can happen is Gemini post-processing touches the *text* of your transcription — and even that is opt-in per app.

{: class="highlight-box" }
**Why local-first matters for developers:** Code snippets, internal project names, credentials you accidentally dictate, unreleased feature names — all of this ends up in dictation buffers on cloud services. With OpenWhisper, the audio never leaves the machine. Whisper runs entirely in-process on your Neural Engine or CPU.

---

## Whisper Model Selection

{: class="marginalia" }
🚀 The **turbo** model is a<br/>hidden gem — almost as<br/>good as large-v3 at<br/>roughly 30× the speed.<br/>I use it daily.

Choosing the right Whisper model is one of the most impactful decisions you'll make. The difference between `tiny` and `large-v3` is the difference between a fuzzy autocomplete and a verbatim transcript.

<div class="model-table-wrap">
  <table class="model-table" id="modelTable">
    <thead>
      <tr>
        <th data-col="name">Model <span class="sort-icon">↕</span></th>
        <th data-col="speed" class="sorted">Speed <span class="sort-icon">↓</span></th>
        <th data-col="latency">Latency (30 s audio) <span class="sort-icon">↕</span></th>
        <th data-col="bestFor">Best for <span class="sort-icon">↕</span></th>
        <th data-col="accuracy">Accuracy <span class="sort-icon">↕</span></th>
      </tr>
    </thead>
    <tbody id="modelTableBody"></tbody>
  </table>
</div>

<div class="chart-wrap">
  <h3>⚡ Transcription latency comparison (30 s audio clip, Apple M2 Pro)</h3>
  <canvas id="speedChart" height="200"></canvas>
</div>

My daily driver is `turbo`. It was added relatively late to the Whisper family and isn't as well-known as the others, but it punches massively above its weight class. For commit messages, Slack replies, and short prose, it's indistinguishable from `large-v3` in practice.

Use `base` if you're on an older machine or want the absolute fastest cold start. Use `large-v3` only if you're dictating long-form documents or you notice consistent errors with `turbo`.

---

## Push-to-Talk: The Interaction Model

{: class="marginalia" }
🤫 Push-to-talk means no<br/>accidental transcriptions.<br/>Perfect for open offices<br/>and video calls.

The signature interaction is dead simple: **hold `FN`, speak, release**. But making that feel right required solving a few non-obvious problems.

Try the demo below to get a feel for it — click and hold the mic button.

<div class="waveform-demo">
  <h3>🎙️ Interactive Push-to-Talk Demo</h3>
  <p class="wd-subtitle">Hold the mic button to "record", then release to transcribe</p>
  <div class="mic-btn" id="micBtn">🎙</div>
  <div class="waveform-bars" id="waveformBars"></div>
  <div class="wd-status" id="wdStatus">Hold to record</div>
  <div class="wd-result" id="wdResult"></div>
  <p class="wd-hint">Click multiple times to cycle through example transcriptions</p>
</div>

### The FN key problem

`FN` is special on macOS. It's not a standard `NSEvent` key — it doesn't go through the normal Cocoa responder chain. To intercept it globally, you need a `CGEventTap` at the `kCGHIDEventTap` level with `kCGEventFlagsChanged` monitoring.

Here's the core setup:

<div class="code-label">TranscriptionManager.swift — CGEventTap for FN key</div>
<pre class="code-block"><span class="kw">func</span> <span class="fn">setupHotkey</span>() {
    <span class="kw">let</span> <span class="id">eventMask</span> <span class="op">=</span> (<span class="nu">1</span> <span class="op">&lt;&lt;</span> <span class="ty">CGEventType</span><span class="op">.</span><span class="id">flagsChanged</span><span class="op">.</span><span class="id">rawValue</span>)
    <span class="kw">guard let</span> <span class="id">tap</span> <span class="op">=</span> <span class="fn">CGEvent</span><span class="op">.</span><span class="fn">tapCreate</span>(
        <span class="id">tap</span><span class="op">:</span> <span class="op">.</span><span class="id">cghidEventTap</span>,
        <span class="id">place</span><span class="op">:</span> <span class="op">.</span><span class="id">headInsertEventTap</span>,
        <span class="id">options</span><span class="op">:</span> <span class="op">.</span><span class="id">defaultTap</span>,
        <span class="id">eventsOfInterest</span><span class="op">:</span> <span class="ty">CGEventMask</span>(<span class="id">eventMask</span>),
        <span class="id">callback</span><span class="op">:</span> { <span class="id">proxy</span>, <span class="id">type</span>, <span class="id">event</span>, <span class="id">refcon</span> <span class="kw">in</span>
            <span class="kw">guard let</span> <span class="id">refcon</span> <span class="kw">else</span> { <span class="kw">return</span> <span class="ty">Unmanaged</span><span class="op">.</span><span class="fn">passRetained</span>(<span class="id">event</span>) }
            <span class="kw">let</span> <span class="id">mng</span> <span class="op">=</span> <span class="ty">Unmanaged</span><span class="op">&lt;</span><span class="ty">TranscriptionManager</span><span class="op">&gt;.</span><span class="fn">fromOpaque</span>(<span class="id">refcon</span>)<span class="op">.</span><span class="id">takeUnretainedValue</span>()
            <span class="id">mng</span><span class="op">.</span><span class="fn">handleFlagsChanged</span>(<span class="id">event</span><span class="op">:</span> <span class="id">event</span>)
            <span class="kw">return</span> <span class="ty">Unmanaged</span><span class="op">.</span><span class="fn">passRetained</span>(<span class="id">event</span>)
        },
        <span class="id">userInfo</span><span class="op">:</span> <span class="ty">Unmanaged</span><span class="op">.</span><span class="fn">passUnretained</span>(<span class="kw">self</span>)<span class="op">.</span><span class="id">toOpaque</span>()
    ) <span class="kw">else</span> {
        <span class="fn">print</span>(<span class="st">"Failed to create event tap — accessibility permission needed"</span>)
        <span class="kw">return</span>
    }

    <span class="kw">let</span> <span class="id">runLoopSource</span> <span class="op">=</span> <span class="fn">CFMachPortCreateRunLoopSource</span>(<span class="id">kCFAllocatorDefault</span>, <span class="id">tap</span>, <span class="nu">0</span>)
    <span class="fn">CFRunLoopAddSource</span>(<span class="ty">CFRunLoopGetCurrent</span>(), <span class="id">runLoopSource</span>, <span class="op">.</span><span class="id">commonModes</span>)
    <span class="fn">CGEvent</span><span class="op">.</span><span class="fn">tapEnable</span>(<span class="id">tap</span><span class="op">:</span> <span class="id">tap</span>, <span class="id">enable</span><span class="op">:</span> <span class="kw">true</span>)
}

<span class="kw">private func</span> <span class="fn">handleFlagsChanged</span>(<span class="id">event</span><span class="op">:</span> <span class="ty">CGEvent</span>) {
    <span class="kw">let</span> <span class="id">fnKeyCode</span><span class="op">:</span> <span class="ty">Int64</span> <span class="op">=</span> <span class="nu">63</span>  <span class="cm">// kVK_Function</span>
    <span class="kw">let</span> <span class="id">keyCode</span> <span class="op">=</span> <span class="id">event</span><span class="op">.</span><span class="fn">getIntegerValueField</span>(<span class="op">.</span><span class="id">keyboardEventKeycode</span>)
    <span class="kw">guard</span> <span class="id">keyCode</span> <span class="op">==</span> <span class="id">fnKeyCode</span> <span class="kw">else</span> { <span class="kw">return</span> }

    <span class="kw">let</span> <span class="id">isDown</span> <span class="op">=</span> <span class="id">event</span><span class="op">.</span><span class="id">flags</span><span class="op">.</span><span class="fn">contains</span>(<span class="op">.</span><span class="id">maskSecondaryFn</span>)

    <span class="kw">if</span> <span class="id">isDown</span> <span class="op">&amp;&amp;</span> <span class="op">!</span><span class="id">isFnKeyCurrentlyPressed</span> {
        <span class="id">isFnKeyCurrentlyPressed</span> <span class="op">=</span> <span class="kw">true</span>
        <span class="fn">handleFnDown</span>()
    } <span class="kw">else if</span> <span class="op">!</span><span class="id">isDown</span> <span class="op">&amp;&amp;</span> <span class="id">isFnKeyCurrentlyPressed</span> {
        <span class="id">isFnKeyCurrentlyPressed</span> <span class="op">=</span> <span class="kw">false</span>
        <span class="fn">handleFnUp</span>()
    }
}</pre>

---

## Launching Whisper: Process Management in Swift

Once recording stops, the WAV file gets handed to Whisper via `Foundation.Process`. This is more nuanced than it sounds — Whisper is a Python CLI, and it needs `ffmpeg` on `PATH` to decode audio formats. If you just pass your `$PATH`, it may not include Homebrew's bin directory when launched from a sandboxed app.

<div class="code-label">WhisperService.swift — launching transcription</div>
<pre class="code-block"><span class="kw">func</span> <span class="fn">transcribe</span>(
    <span class="id">audioURL</span><span class="op">:</span> <span class="ty">URL</span>,
    <span class="id">whisperPath</span><span class="op">:</span> <span class="ty">String</span>,
    <span class="id">ffmpegPath</span><span class="op">:</span> <span class="ty">String</span>,
    <span class="id">model</span><span class="op">:</span> <span class="ty">String</span> <span class="op">=</span> <span class="st">"base"</span>,
    <span class="id">completion</span><span class="op">: @escaping</span> (<span class="ty">String</span><span class="op">?</span>) <span class="op">-&gt;</span> <span class="ty">Void</span>
) {
    <span class="kw">let</span> <span class="id">process</span> <span class="op">=</span> <span class="ty">Process</span>()
    <span class="id">process</span><span class="op">.</span><span class="id">executableURL</span> <span class="op">=</span> <span class="ty">URL</span>(<span class="id">fileURLWithPath</span><span class="op">:</span> <span class="id">whisperPath</span>)

    <span class="cm">// Inject ffmpeg's directory into PATH so whisper can find it</span>
    <span class="kw">let</span> <span class="id">ffmpegDir</span> <span class="op">=</span> <span class="ty">URL</span>(<span class="id">fileURLWithPath</span><span class="op">:</span> <span class="id">ffmpegPath</span>)
        <span class="op">.</span><span class="id">deletingLastPathComponent</span>()<span class="op">.</span><span class="id">path</span>
    <span class="kw">var</span> <span class="id">env</span> <span class="op">=</span> <span class="ty">ProcessInfo</span><span class="op">.</span><span class="id">processInfo</span><span class="op">.</span><span class="id">environment</span>
    <span class="id">env</span>[<span class="st">"PATH"</span>] <span class="op">=</span> <span class="id">ffmpegDir</span> <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> (<span class="id">env</span>[<span class="st">"PATH"</span>] <span class="op">??</span> <span class="st">""</span>)
    <span class="id">process</span><span class="op">.</span><span class="id">environment</span> <span class="op">=</span> <span class="id">env</span>

    <span class="kw">let</span> <span class="id">outputDir</span> <span class="op">=</span> <span class="ty">FileManager</span><span class="op">.</span><span class="id">default</span><span class="op">.</span><span class="id">temporaryDirectory</span>
        <span class="op">.</span><span class="fn">appendingPathComponent</span>(<span class="st">"whisper_output"</span>)
    <span class="kw">try?</span> <span class="ty">FileManager</span><span class="op">.</span><span class="id">default</span><span class="op">.</span><span class="fn">createDirectory</span>(
        <span class="id">at</span><span class="op">:</span> <span class="id">outputDir</span>, <span class="id">withIntermediateDirectories</span><span class="op">:</span> <span class="kw">true</span>)

    <span class="id">process</span><span class="op">.</span><span class="id">arguments</span> <span class="op">=</span> [
        <span class="id">audioURL</span><span class="op">.</span><span class="id">path</span>,
        <span class="st">"--output_dir"</span>, <span class="id">outputDir</span><span class="op">.</span><span class="id">path</span>,
        <span class="st">"--output_format"</span>, <span class="st">"txt"</span>,
        <span class="st">"--model"</span>, <span class="id">model</span><span class="op">.</span><span class="id">isEmpty</span> <span class="op">?</span> <span class="st">"base"</span> <span class="op">:</span> <span class="id">model</span>
    ]

    <span class="id">process</span><span class="op">.</span><span class="id">terminationHandler</span> <span class="op">=</span> { <span class="kw">_</span> <span class="kw">in</span>
        <span class="kw">let</span> <span class="id">txtFile</span> <span class="op">=</span> <span class="id">outputDir</span><span class="op">.</span><span class="fn">appendingPathComponent</span>(
            <span class="id">audioURL</span><span class="op">.</span><span class="id">deletingPathExtension</span>()<span class="op">.</span><span class="id">lastPathComponent</span> <span class="op">+</span> <span class="st">".txt"</span>)
        <span class="kw">if let</span> <span class="id">text</span> <span class="op">=</span> <span class="kw">try?</span> <span class="ty">String</span>(<span class="id">contentsOf</span><span class="op">:</span> <span class="id">txtFile</span>, <span class="id">encoding</span><span class="op">:</span> <span class="op">.</span><span class="id">utf8</span>) {
            <span class="id">completion</span>(<span class="id">text</span><span class="op">.</span><span class="fn">trimmingCharacters</span>(<span class="id">in</span><span class="op">:</span> <span class="op">.</span><span class="id">whitespacesAndNewlines</span>))
        } <span class="kw">else</span> {
            <span class="id">completion</span>(<span class="kw">nil</span>)
        }
        <span class="kw">try?</span> <span class="ty">FileManager</span><span class="op">.</span><span class="id">default</span><span class="op">.</span><span class="fn">removeItem</span>(<span class="id">at</span><span class="op">:</span> <span class="id">txtFile</span>)
        <span class="kw">try?</span> <span class="ty">FileManager</span><span class="op">.</span><span class="id">default</span><span class="op">.</span><span class="fn">removeItem</span>(<span class="id">at</span><span class="op">:</span> <span class="id">audioURL</span>)
    }
    <span class="kw">try?</span> <span class="id">process</span><span class="op">.</span><span class="fn">run</span>()
}</pre>

---

## The Transcription Queue

One of the most satisfying features to build was the **queue**. The naive implementation processes one recording at a time and blocks new recordings until it's done. That's terrible UX — you end up holding your breath waiting for the transcription to finish before you can start speaking again.

The queue decouples recording from transcription. You can hold `FN` and start a new recording the moment you release from the previous one, even if Whisper is still processing the first clip.

<div class="code-label">TranscriptionJob.swift — job state machine</div>
<pre class="code-block"><span class="kw">enum</span> <span class="ty">JobState</span><span class="op">:</span> <span class="ty">Equatable</span> {
    <span class="kw">case</span> <span class="id">recording</span>      <span class="cm">// FN is held; microphone is active</span>
    <span class="kw">case</span> <span class="id">queued</span>         <span class="cm">// recording done; waiting for previous job to finish</span>
    <span class="kw">case</span> <span class="id">transcribing</span>   <span class="cm">// whisper process is running</span>
    <span class="kw">case</span> <span class="id">postProcessing</span>(<span class="ty">String</span>) <span class="cm">// Gemini / Shortcut running; payload = rule name</span>
}

<span class="kw">class</span> <span class="ty">TranscriptionJob</span><span class="op">:</span> <span class="ty">ObservableObject</span>, <span class="ty">Identifiable</span> {
    <span class="kw">let</span> <span class="id">id</span> <span class="op">=</span> <span class="ty">UUID</span>()
    <span class="kw">let</span> <span class="id">targetApp</span><span class="op">:</span> <span class="ty">NSRunningApplication</span><span class="op">?</span>
    <span class="kw">let</span> <span class="id">appIcon</span><span class="op">:</span> <span class="ty">NSImage</span><span class="op">?</span>

    <span class="at">@Published</span> <span class="kw">var</span> <span class="id">state</span><span class="op">:</span> <span class="ty">JobState</span> <span class="op">=</span> <span class="op">.</span><span class="id">recording</span>

    <span class="cm">/// Temp WAV path — whisper deletes this after transcription</span>
    <span class="kw">var</span> <span class="id">audioURL</span><span class="op">:</span> <span class="ty">URL</span><span class="op">?</span>
    <span class="cm">/// Persistent copy saved to ~/Library/Application Support/OpenWhisper/Recordings/</span>
    <span class="kw">var</span> <span class="id">savedAudioURL</span><span class="op">:</span> <span class="ty">URL</span><span class="op">?</span>

    <span class="cm">/// The AXUIElement of the focused window at recording start.</span>
    <span class="cm">/// Used to target the exact browser tab / terminal pane during paste.</span>
    <span class="kw">var</span> <span class="id">targetWindow</span><span class="op">:</span> <span class="ty">AXUIElement</span><span class="op">?</span>
    <span class="kw">var</span> <span class="id">targetPID</span><span class="op">:</span> <span class="ty">pid_t</span> <span class="op">=</span> <span class="nu">0</span>

    <span class="kw">init</span>(<span class="id">targetApp</span><span class="op">:</span> <span class="ty">NSRunningApplication</span><span class="op">?</span>) {
        <span class="kw">self</span><span class="op">.</span><span class="id">targetApp</span> <span class="op">=</span> <span class="id">targetApp</span>
        <span class="kw">self</span><span class="op">.</span><span class="id">appIcon</span> <span class="op">=</span> <span class="id">targetApp</span><span class="op">?.</span><span class="id">icon</span>
    }
}</pre>

Each job carries its own `targetApp`, `targetWindow` (an `AXUIElement`), and `targetPID`. When the transcription is ready to paste, it activates that specific window rather than just the foreground app. This is what makes the "switch away freely while transcribing" feature work correctly.

---

## Pasting with Precision: AXUIElement Targeting

{: class="marginalia" }
📋 I've been using this to<br/>dictate GitHub issue<br/>descriptions while<br/>reading code in a<br/>different window.

This is the part of the codebase I'm most proud of. The naive paste implementation is `NSPasteboard.general.setString(text)` followed by `⌘V` via `CGEvent`. That works — until you have multiple browser windows open, or multiple terminal tabs, or you've switched windows since starting the recording.

The precision targeting flow:
1. At recording start, capture `AXFocusedUIElement` from the system-wide accessibility element
2. Walk up the AX tree to find the parent `AXWindow`
3. Store both the `AXUIElement` and the app's `pid_t`
4. At paste time, call `AXUIElementPerformAction(window, kAXRaiseAction)` to bring that specific window forward, then post `⌘V` via `CGEventPostToPid`

<div class="code-label">TranscriptionManager.swift — AX window capture and paste</div>
<pre class="code-block"><span class="kw">static func</span> <span class="fn">captureAXTarget</span>() <span class="op">-&gt;</span> (<span class="ty">AXUIElement</span><span class="op">?</span>, <span class="ty">pid_t</span>) {
    <span class="kw">let</span> <span class="id">systemWide</span> <span class="op">=</span> <span class="fn">AXUIElementCreateSystemWide</span>()
    <span class="kw">var</span> <span class="id">focusedElement</span><span class="op">:</span> <span class="ty">AnyObject</span><span class="op">?</span>
    <span class="fn">AXUIElementCopyAttributeValue</span>(
        <span class="id">systemWide</span>,
        <span class="id">kAXFocusedUIElementAttribute</span> <span class="kw">as</span> <span class="ty">CFString</span>,
        <span class="op">&amp;</span><span class="id">focusedElement</span>
    )
    <span class="kw">guard let</span> <span class="id">element</span> <span class="op">=</span> <span class="id">focusedElement</span> <span class="kw">as!</span> <span class="ty">AXUIElement</span><span class="op">?</span> <span class="kw">else</span> {
        <span class="kw">return</span> (<span class="kw">nil</span>, <span class="nu">0</span>)
    }

    <span class="cm">// Walk up the AX hierarchy to find the containing AXWindow</span>
    <span class="kw">func</span> <span class="fn">findWindow</span>(<span class="id">from</span> <span class="id">el</span><span class="op">:</span> <span class="ty">AXUIElement</span>) <span class="op">-&gt;</span> <span class="ty">AXUIElement</span><span class="op">?</span> {
        <span class="kw">var</span> <span class="id">role</span><span class="op">:</span> <span class="ty">AnyObject</span><span class="op">?</span>
        <span class="fn">AXUIElementCopyAttributeValue</span>(<span class="id">el</span>, <span class="id">kAXRoleAttribute</span> <span class="kw">as</span> <span class="ty">CFString</span>, <span class="op">&amp;</span><span class="id">role</span>)
        <span class="kw">if</span> (<span class="id">role</span> <span class="kw">as?</span> <span class="ty">String</span>) <span class="op">==</span> <span class="id">kAXWindowRole</span> { <span class="kw">return</span> <span class="id">el</span> }
        <span class="kw">var</span> <span class="id">parent</span><span class="op">:</span> <span class="ty">AnyObject</span><span class="op">?</span>
        <span class="fn">AXUIElementCopyAttributeValue</span>(<span class="id">el</span>, <span class="id">kAXParentAttribute</span> <span class="kw">as</span> <span class="ty">CFString</span>, <span class="op">&amp;</span><span class="id">parent</span>)
        <span class="kw">guard let</span> <span class="id">p</span> <span class="op">=</span> <span class="id">parent</span> <span class="kw">as!</span> <span class="ty">AXUIElement</span><span class="op">?</span> <span class="kw">else</span> { <span class="kw">return nil</span> }
        <span class="kw">return</span> <span class="fn">findWindow</span>(<span class="id">from</span><span class="op">:</span> <span class="id">p</span>)
    }

    <span class="kw">var</span> <span class="id">pid</span><span class="op">:</span> <span class="ty">pid_t</span> <span class="op">=</span> <span class="nu">0</span>
    <span class="fn">AXUIElementGetPid</span>(<span class="id">element</span>, <span class="op">&amp;</span><span class="id">pid</span>)
    <span class="kw">return</span> (<span class="fn">findWindow</span>(<span class="id">from</span><span class="op">:</span> <span class="id">element</span>), <span class="id">pid</span>)
}

<span class="kw">private func</span> <span class="fn">pasteToTarget</span>(<span class="id">job</span><span class="op">:</span> <span class="ty">TranscriptionJob</span>, <span class="id">text</span><span class="op">:</span> <span class="ty">String</span>) {
    <span class="ty">NSPasteboard</span><span class="op">.</span><span class="id">general</span><span class="op">.</span><span class="fn">clearContents</span>()
    <span class="ty">NSPasteboard</span><span class="op">.</span><span class="id">general</span><span class="op">.</span><span class="fn">setString</span>(<span class="id">text</span>, <span class="id">forType</span><span class="op">:</span> <span class="op">.</span><span class="id">string</span>)

    <span class="cm">// Raise the specific window before pasting</span>
    <span class="kw">if let</span> <span class="id">window</span> <span class="op">=</span> <span class="id">job</span><span class="op">.</span><span class="id">targetWindow</span> {
        <span class="fn">AXUIElementPerformAction</span>(<span class="id">window</span>, <span class="id">kAXRaiseAction</span> <span class="kw">as</span> <span class="ty">CFString</span>)
    }
    <span class="id">job</span><span class="op">.</span><span class="id">targetApp</span><span class="op">?.</span><span class="fn">activate</span>(<span class="id">options</span><span class="op">:</span> <span class="op">.</span><span class="id">activateIgnoringOtherApps</span>)

    <span class="cm">// Post Cmd+V to the target PID directly</span>
    <span class="kw">let</span> <span class="id">src</span> <span class="op">=</span> <span class="fn">CGEventSource</span>(<span class="id">stateID</span><span class="op">:</span> <span class="op">.</span><span class="id">hidSystemState</span>)
    <span class="kw">let</span> <span class="id">keyDown</span> <span class="op">=</span> <span class="fn">CGEvent</span>(<span class="id">keyboardEventSource</span><span class="op">:</span> <span class="id">src</span>, <span class="id">virtualKey</span><span class="op">:</span> <span class="nu">0x09</span>, <span class="id">keyDown</span><span class="op">:</span> <span class="kw">true</span>)<span class="op">!</span>
    <span class="kw">let</span> <span class="id">keyUp</span>   <span class="op">=</span> <span class="fn">CGEvent</span>(<span class="id">keyboardEventSource</span><span class="op">:</span> <span class="id">src</span>, <span class="id">virtualKey</span><span class="op">:</span> <span class="nu">0x09</span>, <span class="id">keyDown</span><span class="op">:</span> <span class="kw">false</span>)<span class="op">!</span>
    <span class="id">keyDown</span><span class="op">.</span><span class="id">flags</span> <span class="op">=</span> <span class="op">.</span><span class="id">maskCommand</span>
    <span class="id">keyUp</span><span class="op">.</span><span class="id">flags</span>   <span class="op">=</span> <span class="op">.</span><span class="id">maskCommand</span>
    <span class="id">keyDown</span><span class="op">.</span><span class="fn">postToPid</span>(<span class="id">job</span><span class="op">.</span><span class="id">targetPID</span>)
    <span class="id">keyUp</span><span class="op">.</span><span class="fn">postToPid</span>(<span class="id">job</span><span class="op">.</span><span class="id">targetPID</span>)
}</pre>

<div class="ow-warn">
<strong>⚠️ Accessibility permission is non-negotiable.</strong> Without it, the CGEventTap for FN key monitoring won't work, and AXUIElement calls will return <code>kAXErrorAPIDisabled</code>. macOS will prompt you on first launch — if you accidentally decline, go to System Settings → Privacy & Security → Accessibility.
</div>

---

## Post-Processing Rules

{: class="marginalia" }
🧠 I use a Gemini rule in<br/>Slack to automatically<br/>clean up my dictated<br/>messages — it removes<br/>filler words and fixes<br/>grammar before pasting.

This is the feature that transforms OpenWhisper from a transcription tool into a writing assistant. For every app, you can set a rule that transforms the raw transcription before it gets pasted.

The three rule types:
- **Pass-through** — raw Whisper output, no changes
- **macOS Shortcut** — run any Shortcut you've built (grammar fix, translation, code formatting, anything)
- **Gemini AI** — a custom prompt template; `{text}` is replaced with the transcription

**Try the configurator below:**

<div class="pp-config">
  <h3>⚙️ Post-Processing Rule Builder</h3>
  <div class="pp-row">
    <div class="pp-field">
      <label>Target App</label>
      <select id="ppApp">
        <option value="Xcode">Xcode</option>
        <option value="Slack">Slack</option>
        <option value="Terminal">Terminal</option>
        <option value="VS Code">VS Code</option>
        <option value="Safari">Safari</option>
        <option value="Custom…">Custom…</option>
      </select>
    </div>
    <div class="pp-field">
      <label>Action</label>
      <select id="ppAction">
        <option value="passthrough">Pass-through</option>
        <option value="shortcut">macOS Shortcut</option>
        <option value="gemini">Gemini AI</option>
      </select>
    </div>
  </div>
  <div class="pp-gemini-row" id="ppGeminiRow">
    <div class="pp-field">
      <label>Gemini Prompt Template</label>
      <textarea id="ppPrompt" placeholder="e.g. Fix grammar and remove filler words from the following dictation. Keep it concise and professional. Text: {text}">Fix grammar and remove filler words. Keep the tone professional. Text: {text}</textarea>
    </div>
  </div>
  <div class="pp-gemini-row" id="ppShortcutRow">
    <div class="pp-field">
      <label>Shortcut Name</label>
      <input type="text" id="ppShortcutName" placeholder="e.g. Fix Grammar" value="Fix Grammar" />
    </div>
  </div>
  <button class="pp-preview-btn" id="ppPreviewBtn">▶ Preview Rule</button>
  <div class="pp-processing-anim" id="ppAnim">
    Processing <span class="pp-dots"><span></span><span></span><span></span></span>
  </div>
  <div class="pp-preview-result" id="ppPreviewResult">
    <div class="pp-label">Raw transcription (Whisper output)</div>
    <div class="pp-text" id="ppRawText"></div>
    <span class="pp-arrow">↓</span>
    <div class="pp-label">After rule: <span id="ppRuleLabel" style="color:#7bcdab"></span></div>
    <div class="pp-text" id="ppProcessedText"></div>
  </div>
</div>

The rules are stored as a simple array in `UserDefaults` (encoded as JSON). The matching logic checks if the frontmost app's bundle identifier or display name matches the rule's app name — first match wins.

---

## Privacy: How It Actually Works

I want to be precise here because "privacy-first" is overused. Here's the concrete truth about what data moves where:

<div class="privacy-diagram">
  <h3>🔐 Data flow — where does your audio and text go?</h3>
  <canvas id="privacyCanvas" height="180"></canvas>
</div>

Four specific guarantees:

1. **Audio is never uploaded.** The `whisper` binary runs as a local subprocess. Your WAV file lives on disk for the duration of transcription, then is deleted. If you enable audio history, a copy is saved to `~/Library/Application Support/OpenWhisper/Recordings/`.

2. **Clipboard is restored.** If you have "Copy to clipboard" disabled, OpenWhisper saves your existing clipboard contents before pasting, restores them afterwards, and clears the new content.

3. **Gemini is text-only and opt-in.** Even if you configure Gemini post-processing, only the text transcription is sent — never the audio. It's also per-app and requires you to provide your own API key.

4. **No telemetry, no analytics, no network traffic** beyond what you explicitly configure.

---

## Getting Started

Everything below is a one-time setup. Once it's done, the app requires zero maintenance — Whisper models are cached locally, and there's nothing to subscribe to or keep updated.

<div class="checklist-wrap">
  <h3>🚀 Setup Checklist</h3>
  <div class="checklist-progress">
    <div class="cp-bar"><div class="cp-fill" id="checklistFill"></div></div>
    <div class="cp-label" id="checklistLabel">0 / 7 complete</div>
  </div>
  <div id="checklistItems"></div>
</div>

<div class="ow-tip">
<strong>Apple Silicon tip:</strong> Whisper runs natively on the Neural Engine on M-series chips. The <code>small</code> and even <code>medium</code> models are fast enough for real-time use. Intel Macs should stick to <code>tiny</code>, <code>base</code>, or <code>turbo</code> for comfortable latency.
</div>

---

## What's Next

The app is in active development. The [CHANGELOG](https://github.com/malukenho/open-whisper) already tracks two significant releases, and there are a few things I want to tackle next:

- **Swift-native Whisper** via `whisper.cpp` or the Metal-accelerated bindings — eliminating the Python CLI dependency entirely would dramatically improve cold-start time and enable sandboxing
- **On-device post-processing** using Apple Intelligence APIs when they mature
- **Better hands-free mode** — the current double-tap detection has edge cases on fast FN keypresses
- **Waveform in the Dynamic Island overlay** — there's already an animated waveform during recording in the mini overlay; I want to make it show actual audio levels in real time

If any of this sounds interesting, the repo is at [github.com/malukenho/open-whisper](https://github.com/malukenho/open-whisper). PRs welcome — especially for the Swift-native Whisper integration, which I know a few people have been working on independently.

---

<script>
(function() {
"use strict";

/* =====================================================================
   ARCHITECTURE DIAGRAM
   ===================================================================== */
var STAGES = [
  {
    label: "🎤 Mic",
    color: "#7bcdab",
    title: "Microphone Input",
    body: "AVFoundation captures audio at 16kHz mono (Whisper's preferred format). The AudioRecorder class manages the AVAudioSession and writes a temporary WAV file to the system temp directory. Audio metering is updated at 60fps to drive the waveform overlay animation."
  },
  {
    label: "FN Key",
    color: "#fbef8a",
    title: "Global FN Key Hook (CGEventTap)",
    body: "A CGEventTap at kCGHIDEventTap intercepts NSEvent.flagsChanged events globally. keyCode 63 is kVK_Function. The tap is created with kCGEventFlagsChanged and lives on the main RunLoop. This requires Accessibility permission — without it, the tap creation returns nil and the app falls back to a menu bar button."
  },
  {
    label: "WAV File",
    color: "#7ab8cd",
    title: "Audio Recording + File I/O",
    body: "The recording is written as a PCM WAV file to a temp directory path derived from UUID(). Before handing it to Whisper, a persistent copy is saved to ~/Library/Application Support/OpenWhisper/Recordings/ for the audio history feature. The original temp file is cleaned up after transcription."
  },
  {
    label: "Whisper CLI",
    color: "#c792ea",
    title: "OpenAI Whisper (Local Process)",
    body: "A Foundation.Process runs the whisper CLI binary. ffmpeg's directory is injected into PATH so Whisper can decode audio. The --output_format txt flag produces a plain text file. The terminationHandler callback reads the result and fires the completion closure on whatever thread Whisper exits on — so the caller must dispatch to main if needed."
  },
  {
    label: "Post-Process",
    color: "#f78c6c",
    title: "Post-Processing (Optional)",
    body: "After transcription, the manager checks if the target app has a matching rule. Pass-through: no-op. macOS Shortcut: NSUserActivity / AppleScript triggers the named Shortcut with the text. Gemini AI: a URLSession call to the Gemini API with your API key and prompt template — text only, never audio."
  },
  {
    label: "📋 Paste",
    color: "#7bcdab",
    title: "Precise Paste via AX + CGEvent",
    body: "The AXUIElement of the focused window captured at recording start is raised via kAXRaiseAction. The target app is activated. Then Cmd+V is synthesised via CGEventPostToPid, targeting the app's PID directly rather than the current frontmost app. This ensures the paste lands in the right window even if you've switched away."
  }
];

function initArch() {
  var canvas = document.getElementById("archCanvas");
  if (!canvas) return;
  var descCard = document.getElementById("archDescCard");
  var stageTitle = document.getElementById("archStageTitle");
  var stageBody = document.getElementById("archStageBody");

  var activeStage = -1;
  var pulseFrame = 0;
  var animId;

  function draw() {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.offsetWidth;
    var h = 120;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + "px";
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    var n = STAGES.length;
    var slotW = w / n;
    var nodeR = 20;
    var cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // draw connectors first
    for (var i = 0; i < n - 1; i++) {
      var x1 = slotW * i + slotW / 2 + nodeR;
      var x2 = slotW * (i + 1) + slotW / 2 - nodeR;
      var mx = (x1 + x2) / 2;

      // animated pulsing dot on connector
      var t = ((pulseFrame / 60 + i * 0.3) % 1);
      var dotX = x1 + (x2 - x1) * t;

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, cy);
      ctx.lineTo(x2, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // arrow
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.moveTo(x2 + 6, cy);
      ctx.lineTo(x2 - 2, cy - 5);
      ctx.lineTo(x2 - 2, cy + 5);
      ctx.closePath();
      ctx.fill();

      // pulse dot
      ctx.beginPath();
      ctx.arc(dotX, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = STAGES[i].color;
      ctx.fill();
    }

    // draw nodes
    for (var j = 0; j < n; j++) {
      var cx2 = slotW * j + slotW / 2;
      var isActive = (j === activeStage);
      var pulse = isActive ? (1 + 0.12 * Math.sin(pulseFrame * 0.15)) : 1;

      // glow for active
      if (isActive) {
        var grad = ctx.createRadialGradient(cx2, cy, 0, cx2, cy, nodeR * 2.5);
        grad.addColorStop(0, STAGES[j].color + "44");
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx2, cy, nodeR * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx2, cy, nodeR * pulse, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? STAGES[j].color : "#2a2b30";
      ctx.strokeStyle = STAGES[j].color;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // label below
      ctx.fillStyle = isActive ? "#fff" : "rgba(255,255,255,0.6)";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(STAGES[j].label, cx2, cy + nodeR + 5);
    }

    pulseFrame++;
    animId = requestAnimationFrame(draw);
  }

  draw();

  canvas.addEventListener("click", function(e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var w2 = canvas.offsetWidth;
    var n2 = STAGES.length;
    var slotW2 = w2 / n2;
    var idx = Math.floor(x / slotW2);
    if (idx >= 0 && idx < n2) {
      activeStage = (activeStage === idx) ? -1 : idx;
      if (activeStage >= 0) {
        stageTitle.textContent = STAGES[activeStage].title;
        stageBody.textContent = STAGES[activeStage].body;
        descCard.classList.add("visible");
      } else {
        descCard.classList.remove("visible");
      }
    }
  });

  window.addEventListener("resize", function() {
    cancelAnimationFrame(animId);
    draw();
  });
}

/* =====================================================================
   MODEL TABLE + SPEED CHART
   ===================================================================== */
var MODELS = [
  { name: "tiny",     speed: 5, latency: 0.3,  bestFor: "Simple dictation, quick notes",   accuracy: 1, color: "#7bcdab" },
  { name: "base",     speed: 4, latency: 0.6,  bestFor: "Recommended default",              accuracy: 2, color: "#7ab8cd" },
  { name: "small",    speed: 3, latency: 1.5,  bestFor: "Better accuracy, still fast",      accuracy: 3, color: "#fbef8a" },
  { name: "medium",   speed: 2, latency: 4.0,  bestFor: "High accuracy",                   accuracy: 4, color: "#f08080" },
  { name: "large-v3", speed: 1, latency: 12.0, bestFor: "Maximum accuracy, long-form",      accuracy: 5, color: "#c49aff" },
  { name: "turbo",    speed: 5, latency: 0.4,  bestFor: "Near-large quality at tiny speed", accuracy: 4, color: "#ffd580" }
];

var sortCol = "speed";
var sortDir = -1;

function renderModelTable() {
  var tbody = document.getElementById("modelTableBody");
  if (!tbody) return;
  var sorted = MODELS.slice().sort(function(a, b) {
    return (a[sortCol] > b[sortCol] ? 1 : -1) * sortDir;
  });
  var maxLatency = 12.0;
  tbody.innerHTML = "";
  sorted.forEach(function(m) {
    var stars = "";
    for (var i = 0; i < 5; i++) {
      stars += (i < m.speed) ? "★" : "☆";
    }
    var barPct = Math.round((m.latency / maxLatency) * 100);
    var isRec = (m.name === "base" || m.name === "turbo");
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td style="font-family:\'JetBrains Mono\',monospace;color:' + m.color + '">' +
        m.name + (isRec ? ' <span class="badge-rec">' + (m.name === "turbo" ? "gem" : "default") + "</span>" : "") +
      "</td>" +
      '<td><span class="speed-stars">' + stars + "</span></td>" +
      '<td><div class="latency-bar">' +
        '<span style="min-width:38px;font-size:12px;font-family:\'JetBrains Mono\',monospace;color:rgba(255,255,255,.6)">' + m.latency + "s</span>" +
        '<div class="lb-track"><div class="lb-fill" style="width:' + barPct + '%;background:' + m.color + '"></div></div>' +
      "</div></td>" +
      "<td>" + m.bestFor + "</td>" +
      "<td>" + "▓".repeat(m.accuracy) + "░".repeat(5 - m.accuracy) + "</td>";
    tbody.appendChild(tr);
  });
}

function initModelTable() {
  renderModelTable();
  var ths = document.querySelectorAll(".model-table th[data-col]");
  ths.forEach(function(th) {
    th.addEventListener("click", function() {
      var col = th.getAttribute("data-col");
      if (sortCol === col) {
        sortDir *= -1;
      } else {
        sortCol = col;
        sortDir = -1;
      }
      ths.forEach(function(h) { h.classList.remove("sorted"); });
      th.classList.add("sorted");
      th.querySelector(".sort-icon").textContent = sortDir === 1 ? "↑" : "↓";
      renderModelTable();
    });
  });
}

function initSpeedChart() {
  var canvas = document.getElementById("speedChart");
  if (!canvas) return;

  function draw() {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.offsetWidth;
    var h = 200;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + "px";
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    var pad = { top: 20, right: 20, bottom: 50, left: 55 };
    var cw = w - pad.left - pad.right;
    var ch = h - pad.top - pad.bottom;
    var maxV = 13;
    var bw = Math.max(20, cw / MODELS.length - 8);

    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, w, h);

    // grid lines
    for (var i = 0; i <= 4; i++) {
      var yv = i / 4;
      var yp = pad.top + ch - yv * ch;
      ctx.strokeStyle = "#2e2f35";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(pad.left, yp); ctx.lineTo(pad.left + cw, yp); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,.3)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText((yv * maxV).toFixed(0) + "s", pad.left - 6, yp + 3);
    }

    MODELS.forEach(function(m, i) {
      var x = pad.left + i * (cw / MODELS.length) + (cw / MODELS.length - bw) / 2;
      var barH = (m.latency / maxV) * ch;
      var y = pad.top + ch - barH;
      var r = 4;

      ctx.fillStyle = m.color + "88";
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + bw - r, y);
      ctx.arcTo(x + bw, y, x + bw, y + r, r);
      ctx.lineTo(x + bw, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = m.color;
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(m.latency + "s", x + bw / 2, y - 5);

      ctx.save();
      ctx.translate(x + bw / 2, pad.top + ch + 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = "rgba(255,255,255,.65)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(m.name, 0, 0);
      ctx.restore();
    });
  }

  draw();
  window.addEventListener("resize", draw);
}

/* =====================================================================
   WAVEFORM DEMO
   ===================================================================== */
var TRANSCRIPTIONS = [
  "git commit -m 'fix: resolve authentication timeout on token refresh'",
  "TODO: refactor this method to use async/await — the callback chain is getting unwieldy",
  "Hey, just saw your PR — the approach looks good, left a couple of comments on the diff",
  "Open new issue: memory leak in recording overlay when switching overlay styles rapidly"
];
var wdIdx = 0;
var wdHeld = false;
var wdTimer = null;
var wdBars = [];
var wdAnimId = null;

function initWaveform() {
  var barsEl = document.getElementById("waveformBars");
  var micBtn = document.getElementById("micBtn");
  var statusEl = document.getElementById("wdStatus");
  var resultEl = document.getElementById("wdResult");

  if (!barsEl || !micBtn) return;

  // build 24 bars
  for (var i = 0; i < 24; i++) {
    var b = document.createElement("div");
    b.className = "bar idle";
    b.style.height = "4px";
    barsEl.appendChild(b);
    wdBars.push(b);
  }

  function startAnim() {
    cancelAnimationFrame(wdAnimId);
    function tick() {
      if (!wdHeld) return;
      wdBars.forEach(function(b, i) {
        var h = 4 + Math.random() * 40;
        b.style.height = h + "px";
        b.classList.remove("idle");
      });
      wdAnimId = requestAnimationFrame(tick);
    }
    tick();
  }

  function stopAnim() {
    cancelAnimationFrame(wdAnimId);
    wdBars.forEach(function(b) {
      b.style.height = "4px";
      b.classList.add("idle");
    });
  }

  function startRecording() {
    if (wdTimer) { clearTimeout(wdTimer); wdTimer = null; }
    wdHeld = true;
    micBtn.classList.add("recording");
    micBtn.textContent = "🔴";
    statusEl.textContent = "Recording…";
    statusEl.className = "wd-status";
    resultEl.classList.remove("visible");
    startAnim();
  }

  function stopRecording() {
    if (!wdHeld) return;
    wdHeld = false;
    micBtn.classList.remove("recording");
    micBtn.textContent = "⏳";
    statusEl.textContent = "Transcribing…";
    statusEl.className = "wd-status transcribing";
    stopAnim();

    wdTimer = setTimeout(function() {
      var text = TRANSCRIPTIONS[wdIdx % TRANSCRIPTIONS.length];
      wdIdx++;
      micBtn.textContent = "✅";
      statusEl.textContent = "Done — pasted to target app";
      statusEl.className = "wd-status done";
      resultEl.textContent = text;
      resultEl.classList.add("visible");
      wdTimer = setTimeout(function() {
        micBtn.textContent = "🎙";
        statusEl.textContent = "Hold to record";
        statusEl.className = "wd-status";
      }, 2500);
    }, 1500);
  }

  micBtn.addEventListener("mousedown", startRecording);
  micBtn.addEventListener("touchstart", function(e) { e.preventDefault(); startRecording(); });
  document.addEventListener("mouseup", stopRecording);
  document.addEventListener("touchend", stopRecording);
}

/* =====================================================================
   POST-PROCESSING CONFIGURATOR
   ===================================================================== */
function initPostProcessing() {
  var actionSel = document.getElementById("ppAction");
  var geminiRow = document.getElementById("ppGeminiRow");
  var shortcutRow = document.getElementById("ppShortcutRow");
  var previewBtn = document.getElementById("ppPreviewBtn");
  var anim = document.getElementById("ppAnim");
  var result = document.getElementById("ppPreviewResult");
  var rawText = document.getElementById("ppRawText");
  var processedText = document.getElementById("ppProcessedText");
  var ruleLabel = document.getElementById("ppRuleLabel");

  if (!actionSel) return;

  var RAW = "um so I wanted to uh mention that the the authentication thing is kind of broken in production right now and we should probably fix it before the uh release";

  var PROCESSED = {
    passthrough: RAW,
    shortcut: "The authentication flow is broken in production and needs to be fixed before the release.",
    gemini: "The production authentication flow has a critical bug that should be resolved prior to the release."
  };

  function updateVisibility() {
    var v = actionSel.value;
    geminiRow.classList.toggle("visible", v === "gemini");
    shortcutRow.classList.toggle("visible", v === "shortcut");
  }

  actionSel.addEventListener("change", function() {
    updateVisibility();
    result.classList.remove("visible");
  });
  updateVisibility();

  previewBtn.addEventListener("click", function() {
    var action = actionSel.value;
    rawText.textContent = RAW;
    result.classList.remove("visible");
    anim.classList.add("visible");

    var delay = action === "passthrough" ? 400 : 1400;
    setTimeout(function() {
      anim.classList.remove("visible");
      processedText.textContent = PROCESSED[action] || RAW;
      var labels = { passthrough: "Pass-through (no change)", shortcut: "macOS Shortcut: Fix Grammar", gemini: "Gemini AI" };
      ruleLabel.textContent = labels[action] || action;
      result.classList.add("visible");
    }, delay);
  });
}

/* =====================================================================
   PRIVACY DIAGRAM
   ===================================================================== */
function initPrivacy() {
  var canvas = document.getElementById("privacyCanvas");
  if (!canvas) return;

  var frame = 0;
  var animId2;

  function draw() {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.offsetWidth;
    var h = 180;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + "px";
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // Three zones: local / opt-in cloud / blocked cloud
    var zones = [
      { x: w * 0.05, y: 20, w: w * 0.55, h: 140, color: "#1a3a2a", border: "#7bcdab", label: "Your Mac (100% local)" },
      { x: w * 0.63, y: 30, w: w * 0.17, h: 120, color: "#2a2a1a", border: "#fbef8a", label: "Gemini API\n(text only, opt-in)" },
      { x: w * 0.83, y: 30, w: w * 0.13, h: 120, color: "#2a1a1a", border: "#f08080", label: "Cloud audio\n(blocked ✕)" }
    ];

    zones.forEach(function(z) {
      ctx.strokeStyle = z.border;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = z.color;
      ctx.setLineDash(z.label.indexOf("blocked") >= 0 ? [5, 3] : []);
      ctx.beginPath();
      ctx.roundRect(z.x, z.y, z.w, z.h, 10);
      ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = z.border;
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      var lines = z.label.split("\n");
      lines.forEach(function(ln, li) {
        ctx.fillText(ln, z.x + z.w / 2, z.y + 6 + li * 14);
      });
    });

    // Icons inside local zone
    var localNodes = [
      { x: w * 0.10, y: 90, icon: "🎤", label: "Mic" },
      { x: w * 0.22, y: 90, icon: "💾", label: "WAV" },
      { x: w * 0.34, y: 90, icon: "🤖", label: "Whisper" },
      { x: w * 0.46, y: 90, icon: "📋", label: "Paste" }
    ];

    for (var ni = 0; ni < localNodes.length - 1; ni++) {
      var n1 = localNodes[ni];
      var n2 = localNodes[ni + 1];
      var t2 = ((frame / 50 + ni * 0.4) % 1);
      var dotX2 = n1.x + (n2.x - n1.x) * t2;
      ctx.strokeStyle = "rgba(123,205,171,0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(n1.x + 14, n1.y); ctx.lineTo(n2.x - 14, n2.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(dotX2, n1.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#7bcdab";
      ctx.fill();
    }

    localNodes.forEach(function(n) {
      ctx.font = "22px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.icon, n.x, n.y);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px system-ui";
      ctx.textBaseline = "top";
      ctx.fillText(n.label, n.x, n.y + 14);
    });

    // Blocked arrow to cloud audio
    var bx = w * 0.76;
    var by = 90;
    ctx.strokeStyle = "#f0808066";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(w * 0.55, by); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    // X
    ctx.strokeStyle = "#f08080";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx - 6, by - 6); ctx.lineTo(bx + 6, by + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 6, by - 6); ctx.lineTo(bx - 6, by + 6); ctx.stroke();

    // Optional arrow to Gemini (text)
    var gx = w * 0.63;
    var gy = 90;
    ctx.strokeStyle = "#fbef8a66";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(w * 0.46 + 16, gy); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#fbef8a";
    ctx.font = "9px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("text only", (w * 0.46 + gx) / 2, gy - 10);

    frame++;
    animId2 = requestAnimationFrame(draw);
  }

  draw();
  window.addEventListener("resize", function() {
    cancelAnimationFrame(animId2);
    draw();
  });
}

/* =====================================================================
   GETTING STARTED CHECKLIST
   ===================================================================== */
function initChecklist() {
  var container = document.getElementById("checklistItems");
  var fill = document.getElementById("checklistFill");
  var label = document.getElementById("checklistLabel");
  if (!container) return;

  var ITEMS = [
    { title: "Install Homebrew", detail: "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"" },
    { title: "Install ffmpeg", detail: "brew install ffmpeg" },
    { title: "Install openai-whisper", detail: "pip3 install openai-whisper" },
    { title: "Clone the repo & open in Xcode", detail: "git clone github.com/malukenho/open-whisper && open OpenWhisper.xcodeproj" },
    { title: "Grant Accessibility permission", detail: "System Settings → Privacy & Security → Accessibility → OpenWhisper ✓" },
    { title: "Set binary paths in Settings", detail: "whisper: $(which whisper)  •  ffmpeg: $(which ffmpeg)" },
    { title: "Hold FN and speak!", detail: "Your first transcription will appear right where your cursor is 🎉" }
  ];

  var done = new Array(ITEMS.length).fill(false);

  function updateProgress() {
    var count = done.filter(Boolean).length;
    fill.style.width = (count / ITEMS.length * 100) + "%";
    label.textContent = count + " / " + ITEMS.length + " complete";
  }

  ITEMS.forEach(function(item, idx) {
    var el = document.createElement("div");
    el.className = "checklist-item";
    el.innerHTML =
      '<div class="ci-check"></div>' +
      '<div class="ci-content">' +
        '<div class="ci-title">' + (idx + 1) + ". " + item.title + "</div>" +
        '<div class="ci-detail">' + item.detail + "</div>" +
      "</div>";
    el.addEventListener("click", function() {
      done[idx] = !done[idx];
      el.classList.toggle("done", done[idx]);
      el.querySelector(".ci-check").textContent = done[idx] ? "✓" : "";
      updateProgress();
    });
    container.appendChild(el);
  });

  updateProgress();
}

/* =====================================================================
   INIT ALL
   ===================================================================== */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    initArch();
    initModelTable();
    initSpeedChart();
    initWaveform();
    initPostProcessing();
    initPrivacy();
    initChecklist();
  });
} else {
  initArch();
  initModelTable();
  initSpeedChart();
  initWaveform();
  initPostProcessing();
  initPrivacy();
  initChecklist();
}

})();
</script>
