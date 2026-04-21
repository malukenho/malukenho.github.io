---
layout: post
title: "Building macOS Menu Bar Apps with Swift in 2026"
date: 2026-04-04 10:00:00 +0000
categories: ["post"]
tags: [swift, macos, swiftui, appkit, menubar]
---

{: class="marginalia" }
🍎 Everything here<br/>is battle-tested on<br/>**OpenWhisper** — a<br/>voice dictation app<br/>I built and ship<br/>as open source.

A menu bar app is, I think, the perfect side-project format. The surface area is tiny: one icon, one popover, zero windows to manage. It runs all day in the corner of the screen, doing exactly one thing. Users barely notice it's there until they need it — and then it's *right there*.

I built **OpenWhisper** — a push-to-talk voice dictation app that uses on-device Whisper — as a menu bar app, and the journey taught me more about macOS internals than any documentation ever could. Dark corners of AppKit, the Accessibility permission dance, CGEventTap callbacks, panels that refuse to steal focus. All of it.

This post is a thorough brain-dump of everything I know. Whether you're building a clipboard manager, a quick-timer, a focus mode toggle, or something I haven't imagined, you'll hit the same walls. Let me show you how to break through them.

Popular menu bar apps for reference: **Bartender**, **Dato**, **Rectangle**, **CleanMyMac**, **1Password mini**, and — yes — **OpenWhisper**. All of them follow the same architectural skeleton underneath their polished UIs.

---

<style>
/* ── Post-scoped base styles ──────────────────────────────────── */
.mb-section { margin: 2.8rem 0; }

.code-block {
  background: #111215;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 1.2rem 1.4rem;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  line-height: 1.75;
  color: #c9d1d9;
  margin: 1.4rem 0;
}
.kw  { color: #f97583; }
.ty  { color: #79b8ff; }
.fn  { color: #b392f0; }
.st  { color: #9ecbff; }
.cm  { color: #6a737d; font-style: italic; }
.nu  { color: #79b8ff; }
.at  { color: #ffab70; }
.id  { color: #e1e4e8; }

/* Cards */
.mb-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1rem 0;
}
.mb-card h4 {
  margin: 0 0 .8rem;
  color: #fbef8a;
  font-size: 15px;
}

/* Buttons */
.mb-btn {
  background: #7bcdab;
  color: #19191c;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.4rem;
  font-weight: 700;
  cursor: pointer;
  font-size: 13px;
  transition: opacity .15s;
  font-family: inherit;
}
.mb-btn:hover { opacity: .85; }
.mb-btn.secondary {
  background: transparent;
  border: 1px solid #7bcdab;
  color: #7bcdab;
}
.mb-btn.secondary:hover { background: rgba(123,205,171,.1); }

/* Tip / warning callouts */
.mb-tip {
  border-left: 3px solid #7bcdab;
  background: rgba(123,205,171,.07);
  border-radius: 0 8px 8px 0;
  padding: 12px 16px;
  margin: 1.2rem 0;
  font-size: 14px;
  line-height: 1.7;
}
.mb-tip strong { color: #7bcdab; }
.mb-warn {
  border-left: 3px solid #fbef8a;
  background: rgba(251,239,138,.06);
  border-radius: 0 8px 8px 0;
  padding: 12px 16px;
  margin: 1.2rem 0;
  font-size: 14px;
}
.mb-warn strong { color: #fbef8a; }

/* Architecture diagram */
.arch-diagram {
  background: #111215;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 1.6rem;
  margin: 1.4rem 0;
}
.arch-layers {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.arch-layer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all .22s;
  user-select: none;
}
.arch-layer:hover { transform: translateX(4px); }
.arch-layer.active { border-color: #7bcdab; background: rgba(123,205,171,.09); }
.arch-layer-icon { font-size: 20px; width: 32px; text-align: center; flex-shrink: 0; }
.arch-layer-name {
  font-weight: 700;
  font-size: 15px;
  color: #fbef8a;
  min-width: 200px;
}
.arch-layer-sub { font-size: 13px; color: rgba(255,255,255,.5); }
.arch-connector {
  width: 2px;
  height: 12px;
  background: rgba(255,255,255,.18);
  margin: 0 auto 0 30px;
  border-radius: 2px;
}
.arch-detail {
  margin-top: 1rem;
  padding: 1rem 1.2rem;
  background: rgba(251,239,138,.05);
  border: 1px solid rgba(251,239,138,.15);
  border-radius: 10px;
  display: none;
  animation: fadeIn .2s ease;
}
.arch-detail.visible { display: block; }
.arch-detail .ad-title { color: #fbef8a; font-weight: 700; margin-bottom: .5rem; }
.arch-detail .ad-desc { font-size: 14px; color: rgba(255,255,255,.75); line-height: 1.7; }
@keyframes fadeIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: none; } }

/* Entitlement checker */
.ent-table { width: 100%; border-collapse: collapse; margin: .8rem 0; }
.ent-table th {
  text-align: left;
  padding: 10px 14px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: #fbef8a;
  background: #1c1d21;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.ent-table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,.05);
  font-size: 13.5px;
  vertical-align: middle;
}
.ent-table tr:last-child td { border-bottom: none; }
.ent-row.needs-perm td { color: #f0a0a0; }
.ent-row.no-perm td { color: rgba(255,255,255,.55); }
.ent-checkbox { cursor: pointer; width: 16px; height: 16px; accent-color: #7bcdab; }
.ent-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
}
.ent-badge.required { background: rgba(240,128,128,.15); color: #f08080; border: 1px solid rgba(240,128,128,.3); }
.ent-badge.optional { background: rgba(123,205,171,.12); color: #7bcdab; border: 1px solid rgba(123,205,171,.25); }
.ent-badge.none     { background: rgba(255,255,255,.06); color: rgba(255,255,255,.4); }
.ent-snippet {
  margin-top: 1rem;
  background: #111215;
  border-radius: 8px;
  padding: .9rem 1.1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  line-height: 1.7;
  min-height: 60px;
  border: 1px solid rgba(255,255,255,.07);
  transition: all .2s;
}

/* Popover vs Panel comparison */
.pvp-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 1.2rem 0;
}
@media (max-width: 640px) { .pvp-wrap { grid-template-columns: 1fr; } }
.pvp-card {
  background: rgba(255,255,255,0.04);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1.2rem;
  cursor: pointer;
  transition: all .22s;
  text-align: center;
}
.pvp-card:hover { border-color: rgba(123,205,171,.5); transform: translateY(-2px); }
.pvp-card.pvp-selected { border-color: #7bcdab; background: rgba(123,205,171,.08); }
.pvp-card h4 { color: #fbef8a; margin: .6rem 0 .4rem; font-size: 15px; }
.pvp-card p { font-size: 13px; color: rgba(255,255,255,.6); margin: 0; line-height: 1.6; }
.pvp-mockup { margin: 0 auto 8px; }
.pvp-detail {
  display: none;
  margin-top: 1rem;
  padding: 1rem;
  background: #111215;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.07);
}
.pvp-detail.visible { display: block; animation: fadeIn .2s ease; }
.pvp-detail h5 { color: #7bcdab; margin: 0 0 .5rem; }
.pvp-detail ul { margin: 0; padding-left: 1.2rem; font-size: 13.5px; color: rgba(255,255,255,.7); line-height: 1.8; }

/* Notarization terminal */
.fake-term {
  background: #0d0d10;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.08);
  overflow: hidden;
  margin: 1.4rem 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}
.fake-term-bar {
  background: #1e1f24;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.term-dot { width: 12px; height: 12px; border-radius: 50%; }
.term-dot.red   { background: #ff5f57; }
.term-dot.yel   { background: #febc2e; }
.term-dot.grn   { background: #28c840; }
.fake-term-title { font-size: 12px; color: rgba(255,255,255,.4); margin-left: auto; margin-right: auto; }
.fake-term-body { padding: 16px 18px; min-height: 120px; }
.term-line { display: block; line-height: 1.9; }
.term-prompt { color: #7bcdab; }
.term-cmd    { color: #e0e0e0; }
.term-out    { color: rgba(255,255,255,.45); }
.term-ok     { color: #7bcdab; }
.term-cursor {
  display: inline-block;
  width: 8px;
  height: 14px;
  background: #7bcdab;
  vertical-align: middle;
  animation: blink 1s step-end infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
.term-btn-row { padding: 0 18px 16px; }

/* Flip cards for gotchas */
.gotcha-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin: 1.4rem 0;
}
.flip-card {
  height: 200px;
  perspective: 900px;
  cursor: pointer;
}
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform .55s cubic-bezier(.4,0,.2,1);
  transform-style: preserve-3d;
}
.flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
.flip-front, .flip-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 12px;
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.flip-front {
  background: rgba(251,239,138,.06);
  border: 1px solid rgba(251,239,138,.18);
}
.flip-back {
  background: rgba(123,205,171,.07);
  border: 1px solid rgba(123,205,171,.25);
  transform: rotateY(180deg);
}
.flip-front .fc-num {
  font-size: 28px;
  font-weight: 900;
  color: rgba(251,239,138,.25);
  line-height: 1;
}
.flip-front .fc-prob {
  font-size: 14px;
  font-weight: 700;
  color: #fbef8a;
  line-height: 1.5;
}
.flip-front .fc-hint {
  font-size: 11px;
  color: rgba(255,255,255,.35);
  text-transform: uppercase;
  letter-spacing: .08em;
}
.flip-back .fc-fix-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #7bcdab;
  font-weight: 700;
}
.flip-back .fc-fix {
  font-size: 13px;
  color: rgba(255,255,255,.82);
  line-height: 1.65;
  flex: 1;
  margin: .5rem 0;
}
.flip-back .fc-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  background: rgba(0,0,0,.3);
  border-radius: 6px;
  padding: 6px 10px;
  color: #9ecbff;
}
</style>

## Architecture overview

Before writing a single line of code, it helps to see the mental model. A menu bar app is a stack of three or four OS-level objects that sit on top of each other. Click any layer below to explore it.

<div class="arch-diagram mb-section">
  <div class="arch-layers" id="archLayers">

    <div class="arch-layer" data-layer="0" style="background:rgba(251,239,138,.05);">
      <span class="arch-layer-icon">📊</span>
      <span class="arch-layer-name">NSStatusBar</span>
      <span class="arch-layer-sub">System-provided status bar container</span>
    </div>
    <div class="arch-connector"></div>
    <div class="arch-layer" data-layer="1" style="background:rgba(123,205,171,.05);">
      <span class="arch-layer-icon">🔲</span>
      <span class="arch-layer-name">NSStatusItem + NSStatusButton</span>
      <span class="arch-layer-sub">Your icon slot in the menu bar</span>
    </div>
    <div class="arch-connector"></div>
    <div class="arch-layer" data-layer="2" style="background:rgba(120,150,255,.05);">
      <span class="arch-layer-icon">📋</span>
      <span class="arch-layer-name">NSMenu / NSPopover</span>
      <span class="arch-layer-sub">Dropdown menu or floating popover UI</span>
    </div>
    <div class="arch-connector"></div>
    <div class="arch-layer" data-layer="3" style="background:rgba(200,130,255,.05);">
      <span class="arch-layer-icon">🪟</span>
      <span class="arch-layer-name">NSPanel / SwiftUI View</span>
      <span class="arch-layer-sub">Optional custom floating window</span>
    </div>

  </div>
  <div class="arch-detail" id="archDetail">
    <div class="ad-title" id="archDetailTitle"></div>
    <div class="ad-desc" id="archDetailDesc"></div>
  </div>
</div>

<script>
(function() {
  var details = [
    {
      title: "NSStatusBar — The singleton that owns the menu bar",
      desc: "You never create NSStatusBar directly. You call <code>NSStatusBar.system</code> to get the shared instance, then ask it for an NSStatusItem. The status bar manages item ordering, spacing, and the system-level rendering of the strip. You can set a preferred length (<code>.variableLength</code> or a fixed px value) but Apple controls the rest. One important constraint: if the screen is too narrow, macOS may hide your item — always check for this in your UI."
    },
    {
      title: "NSStatusItem + NSStatusButton — Your real estate in the bar",
      desc: "NSStatusItem is the slot. NSStatusButton is the clickable button inside it. You configure the button's <code>image</code> (usually an SF Symbol with <code>isTemplate = true</code> for automatic dark/light adaptation), its <code>alternateImage</code> (shown while menu is open), and its <code>action</code> selector. The <code>isTemplate</code> flag is crucial — without it your icon will look wrong on dark menu bars."
    },
    {
      title: "NSMenu / NSPopover — Two very different UX patterns",
      desc: "An NSMenu gives you the traditional dropdown list — items, submenus, separators, key equivalents. Dead simple, no sizing headaches. An NSPopover gives you a full SwiftUI or AppKit view inside a floating bubble with an arrow pointing at your button. Popovers auto-dismiss on outside click, which is usually what you want. For complex UIs (OpenWhisper's live transcript view, for example) the popover is far more flexible."
    },
    {
      title: "NSPanel / SwiftUI — The power user move",
      desc: "When a popover isn't enough — maybe you need a resizable window, or you want the panel to stay visible while the user types in another app — you reach for NSPanel with the <code>.nonactivatingPanel</code> style mask. This means clicks inside your panel do NOT steal keyboard focus from whatever the user was typing. It's genuinely magical. SwiftUI views can be hosted inside both NSPopover and NSPanel via NSHostingController."
    }
  ];

  var layers = document.querySelectorAll('.arch-layer');
  var detail = document.getElementById('archDetail');
  var titleEl = document.getElementById('archDetailTitle');
  var descEl = document.getElementById('archDetailDesc');

  layers.forEach(function(layer) {
    layer.addEventListener('click', function() {
      var idx = parseInt(layer.getAttribute('data-layer'));
      var wasActive = layer.classList.contains('active');

      layers.forEach(function(l) { l.classList.remove('active'); });
      detail.classList.remove('visible');

      if (!wasActive) {
        layer.classList.add('active');
        titleEl.innerHTML = details[idx].title;
        descEl.innerHTML = details[idx].desc;
        detail.classList.add('visible');
      }
    });
  });
})();
</script>

---

## The minimal setup — five key areas

Let's build from zero. I'll walk through each decision point with real, annotated code.

### 1 — App protocol vs AppDelegate

SwiftUI 3+ lets you skip AppDelegate entirely for simple cases. For menu bar apps I recommend a hybrid: use the `App` protocol as the entry point but keep a reference to your `AppDelegate` for status item management.

<pre class="code-block"><span class="kw">import</span> <span class="ty">SwiftUI</span>

<span class="at">@main</span>
<span class="kw">struct</span> <span class="ty">OpenWhisperApp</span>: <span class="ty">App</span> {
    <span class="at">@NSApplicationDelegateAdaptor</span>(<span class="ty">AppDelegate</span>.<span class="kw">self</span>) <span class="kw">var</span> <span class="id">delegate</span>

    <span class="kw">var</span> <span class="id">body</span>: <span class="kw">some</span> <span class="ty">Scene</span> {
        <span class="cm">// An empty WindowGroup is required by the compiler</span>
        <span class="cm">// but LSUIElement = YES ensures it never shows.</span>
        <span class="ty">Settings</span> { <span class="ty">EmptyView</span>() }
    }
}

<span class="kw">class</span> <span class="ty">AppDelegate</span>: <span class="ty">NSObject</span>, <span class="ty">NSApplicationDelegate</span> {
    <span class="kw">var</span> <span class="id">statusItem</span>: <span class="ty">NSStatusItem</span>!
    <span class="kw">var</span> <span class="id">popover</span> = <span class="ty">NSPopover</span>()

    <span class="kw">func</span> <span class="fn">applicationDidFinishLaunching</span>(<span class="id">_</span> <span class="id">note</span>: <span class="ty">Notification</span>) {
        <span class="fn">setupStatusItem</span>()
        <span class="fn">setupPopover</span>()
        <span class="fn">registerGlobalHotkey</span>()
    }
}</pre>

{: class="marginalia" }
`LSUIElement = YES` is<br/>the single line that<br/>makes your app<br/>**invisible** to the<br/>Dock and App Switcher<br/>— arguably the most<br/>important line in<br/>any menu bar app.

### 2 — Custom status bar icon

Always use an SF Symbol rendered as a template image. Template images automatically adapt to dark and light menu bars, and invert when your menu/popover is open.

<pre class="code-block"><span class="kw">func</span> <span class="fn">setupStatusItem</span>() {
    <span class="id">statusItem</span> = <span class="ty">NSStatusBar</span>.<span class="id">system</span>
        .<span class="fn">statusItem</span>(<span class="id">withLength</span>: <span class="ty">NSStatusItem</span>.<span class="id">variableLength</span>)

    <span class="kw">guard</span> <span class="kw">let</span> <span class="id">button</span> = <span class="id">statusItem</span>.<span class="id">button</span> <span class="kw">else</span> { <span class="kw">return</span> }

    <span class="cm">// SF Symbol — use a 16pt weight that reads well at small sizes</span>
    <span class="kw">let</span> <span class="id">config</span> = <span class="ty">NSImage</span>.<span class="ty">SymbolConfiguration</span>(
        <span class="id">pointSize</span>: <span class="nu">16</span>, <span class="id">weight</span>: .<span class="id">medium</span>
    )
    <span class="kw">let</span> <span class="id">img</span> = <span class="ty">NSImage</span>(
        <span class="id">systemSymbolName</span>: <span class="st">"waveform.circle"</span>,
        <span class="id">accessibilityDescription</span>: <span class="st">"OpenWhisper"</span>
    )!.<span class="fn">withSymbolConfiguration</span>(<span class="id">config</span>)!

    <span class="id">img</span>.<span class="id">isTemplate</span> = <span class="kw">true</span>  <span class="cm">// ← critical</span>
    <span class="id">button</span>.<span class="id">image</span> = <span class="id">img</span>
    <span class="id">button</span>.<span class="id">action</span> = <span class="at">#selector</span>(<span class="fn">togglePopover</span>)
    <span class="id">button</span>.<span class="id">target</span> = <span class="kw">self</span>
    <span class="id">button</span>.<span class="id">sendAction</span>(<span class="id">on</span>: [.<span class="id">leftMouseUp</span>, .<span class="id">rightMouseUp</span>])
}</pre>

### 3 — Popover management

Show on click, dismiss on click-outside. Deceptively tricky because `NSPopover` doesn't tell you when it dismisses itself.

<pre class="code-block"><span class="kw">func</span> <span class="fn">setupPopover</span>() {
    <span class="id">popover</span>.<span class="id">contentSize</span>    = <span class="ty">NSSize</span>(<span class="id">width</span>: <span class="nu">380</span>, <span class="id">height</span>: <span class="nu">480</span>)
    <span class="id">popover</span>.<span class="id">behavior</span>       = .<span class="id">transient</span>  <span class="cm">// auto-dismiss on outside click</span>
    <span class="id">popover</span>.<span class="id">animates</span>       = <span class="kw">true</span>
    <span class="id">popover</span>.<span class="id">contentViewController</span> =
        <span class="ty">NSHostingController</span>(<span class="id">rootView</span>: <span class="ty">ContentView</span>())
}

<span class="at">@objc</span> <span class="kw">func</span> <span class="fn">togglePopover</span>() {
    <span class="kw">guard</span> <span class="kw">let</span> <span class="id">button</span> = <span class="id">statusItem</span>.<span class="id">button</span> <span class="kw">else</span> { <span class="kw">return</span> }

    <span class="kw">if</span> <span class="id">popover</span>.<span class="id">isShown</span> {
        <span class="id">popover</span>.<span class="fn">performClose</span>(<span class="kw">nil</span>)
    } <span class="kw">else</span> {
        <span class="id">popover</span>.<span class="fn">show</span>(
            <span class="id">relativeTo</span>: <span class="id">button</span>.<span class="id">bounds</span>,
            <span class="id">of</span>:         <span class="id">button</span>,
            <span class="id">preferredEdge</span>: .<span class="id">minY</span>
        )
        <span class="cm">// Bring to front so it receives key events immediately</span>
        <span class="id">popover</span>.<span class="id">contentViewController</span>?.<span class="id">view</span>.<span class="id">window</span>?.<span class="fn">makeKey</span>()
    }
}</pre>

### 4 — Window level (floating panel)

When you need the panel to float above all other apps:

<pre class="code-block"><span class="kw">func</span> <span class="fn">makeFloatingPanel</span>() -> <span class="ty">NSPanel</span> {
    <span class="kw">let</span> <span class="id">panel</span> = <span class="ty">NSPanel</span>(
        <span class="id">contentRect</span>: <span class="ty">NSRect</span>(<span class="id">x</span>: <span class="nu">0</span>, <span class="id">y</span>: <span class="nu">0</span>, <span class="id">width</span>: <span class="nu">400</span>, <span class="id">height</span>: <span class="nu">300</span>),
        <span class="id">styleMask</span>: [
            .<span class="id">nonactivatingPanel</span>,  <span class="cm">// ← magic: no focus steal</span>
            .<span class="id">fullSizeContentView</span>,
            .<span class="id">borderless</span>
        ],
        <span class="id">backing</span>: .<span class="id">buffered</span>,
        <span class="id">defer</span>: <span class="kw">false</span>
    )
    <span class="id">panel</span>.<span class="id">level</span>                  = .<span class="id">floating</span>
    <span class="id">panel</span>.<span class="id">collectionBehavior</span>      = [.<span class="id">canJoinAllSpaces</span>, .<span class="id">fullScreenAuxiliary</span>]
    <span class="id">panel</span>.<span class="id">isMovableByWindowBackground</span> = <span class="kw">true</span>
    <span class="id">panel</span>.<span class="id">backgroundColor</span>        = .<span class="id">clear</span>
    <span class="id">panel</span>.<span class="id">isOpaque</span>               = <span class="kw">false</span>
    <span class="id">panel</span>.<span class="id">hasShadow</span>              = <span class="kw">true</span>
    <span class="id">panel</span>.<span class="id">contentViewController</span>  =
        <span class="ty">NSHostingController</span>(<span class="id">rootView</span>: <span class="ty">PanelView</span>())
    <span class="kw">return</span> <span class="id">panel</span>
}</pre>

{: class="marginalia" }
`NSPanel` with<br/>`.nonactivatingPanel`<br/>is magic — clicks<br/>inside don't steal<br/>focus from whatever<br/>the user was typing<br/>in. Perfect for<br/>dictation apps.

### 5 — Global hotkey with CGEventTap

This is where most tutorials stop and most bugs live. I'll cover it properly in its own section below.

---

## The Accessibility challenge

{: class="marginalia" }
The Accessibility<br/>permission dialog<br/>appears **once**.<br/>If the user denies,<br/>you must send them<br/>to System Settings<br/>— you cannot re-prompt.

Building a menu bar app that interacts with other apps — reading what's on screen, injecting keystrokes, monitoring global hotkeys — requires the **Accessibility** entitlement and usually the **Input Monitoring** entitlement too. Getting these wrong is the number one reason menu bar apps break after macOS updates.

Use the interactive checker below. Toggle which features your app needs and see which entitlements are required.

<div class="mb-card mb-section" id="entChecker">
  <h4>🔐 Entitlement requirements checker</h4>
  <div style="overflow-x:auto;">
  <table class="ent-table" id="entTable">
    <thead>
      <tr>
        <th style="width:36px;">Need?</th>
        <th>Capability</th>
        <th>Entitlement / Permission</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody id="entTbody"></tbody>
  </table>
  </div>
  <div style="margin-top:.6rem;font-size:13px;color:rgba(255,255,255,.45);">Toggle the checkboxes to mark what your app needs.</div>
  <div class="ent-snippet" id="entSnippet"><span style="color:rgba(255,255,255,.3);font-style:italic;">// Check capabilities above to see the required entitlements.plist snippet.</span></div>
</div>

<script>
(function() {
  var caps = [
    { label: "Monitor global key events (hotkeys)", ent: "Accessibility (AX)", entKey: "com.apple.security.accessibility", level: "required" },
    { label: "Simulate keyboard input (CGEvent post)", ent: "Accessibility (AX)", entKey: "com.apple.security.accessibility", level: "required" },
    { label: "Read frontmost window title (AXUIElement)", ent: "Accessibility (AX)", entKey: "com.apple.security.accessibility", level: "required" },
    { label: "Listen for input device events (mouse/kb)", ent: "Input Monitoring", entKey: "com.apple.security.device.input-monitoring", level: "required" },
    { label: "Read/write clipboard", ent: "None needed", entKey: null, level: "none" },
    { label: "Network requests", ent: "com.apple.security.network.client", entKey: "com.apple.security.network.client", level: "optional" },
    { label: "Read user files (open panel)", ent: "None (sandboxed: user-selected)", entKey: null, level: "none" },
    { label: "Launch at login (SMAppService)", ent: "None (modern API)", entKey: null, level: "none" }
  ];

  var checked = {};
  var tbody = document.getElementById('entTbody');
  var snippet = document.getElementById('entSnippet');

  function renderSnippet() {
    var needed = {};
    caps.forEach(function(c, i) {
      if (checked[i] && c.entKey) {
        needed[c.entKey] = true;
      }
    });
    var keys = Object.keys(needed);
    if (keys.length === 0) {
      snippet.innerHTML = '<span style="color:rgba(255,255,255,.3);font-style:italic;">// Check capabilities above to see the required entitlements.plist snippet.</span>';
      return;
    }
    var lines = [];
    lines.push('<span style="color:#f97583;">&lt;?xml</span> <span style="color:#ffab70;">version</span>=<span style="color:#9ecbff;">"1.0"</span> <span style="color:#ffab70;">encoding</span>=<span style="color:#9ecbff;">"UTF-8"</span><span style="color:#f97583;">?&gt;</span>');
    lines.push('<span style="color:#f97583;">&lt;!DOCTYPE</span> plist <span style="color:#ffab70;">PUBLIC</span> <span style="color:#9ecbff;">"-//Apple//DTD PLIST 1.0//EN"</span> <span style="color:#9ecbff;">"..."</span><span style="color:#f97583;">&gt;</span>');
    lines.push('<span style="color:#f97583;">&lt;plist</span> <span style="color:#ffab70;">version</span>=<span style="color:#9ecbff;">"1.0"</span><span style="color:#f97583;">&gt;&lt;dict&gt;</span>');
    keys.forEach(function(k) {
      lines.push('  <span style="color:#f97583;">&lt;key&gt;</span>' + k + '<span style="color:#f97583;">&lt;/key&gt;</span>');
      lines.push('  <span style="color:#f97583;">&lt;true/&gt;</span>');
    });
    lines.push('<span style="color:#f97583;">&lt;/dict&gt;&lt;/plist&gt;</span>');
    snippet.innerHTML = lines.join('\n');
  }

  caps.forEach(function(cap, i) {
    var tr = document.createElement('tr');
    tr.className = 'ent-row no-perm';
    var badgeClass = cap.level === 'required' ? 'required' : cap.level === 'optional' ? 'optional' : 'none';
    tr.innerHTML =
      '<td><input type="checkbox" class="ent-checkbox" data-idx="' + i + '"></td>' +
      '<td>' + cap.label + '</td>' +
      '<td style="font-family:\'JetBrains Mono\',monospace;font-size:12px;color:rgba(255,255,255,.6);">' + cap.ent + '</td>' +
      '<td><span class="ent-badge ' + badgeClass + '">' + cap.level + '</span></td>';
    tbody.appendChild(tr);

    tr.querySelector('.ent-checkbox').addEventListener('change', function(e) {
      checked[i] = e.target.checked;
      tr.className = e.target.checked ? 'ent-row needs-perm' : 'ent-row no-perm';
      renderSnippet();
    });
  });
})();
</script>

---

## Global key monitor — CGEventTap deep dive

{: class="marginalia" }
CGEventTap callbacks<br/>are **C function pointers**.<br/>In Swift you bridge<br/>them via a closure<br/>stored in a<br/>`Unmanaged` context<br/>or a global function.

This is the most technically dense part of any menu bar app, and it's where OpenWhisper spent most of its early bug-squashing sessions. A CGEventTap lets you listen for (and optionally intercept) every key event system-wide — without the user having to click in your app first.

<pre class="code-block"><span class="kw">import</span> <span class="ty">CoreGraphics</span>

<span class="cm">// The callback must be a C-compatible function.</span>
<span class="cm">// In Swift we use a private global function as the bridge.</span>
<span class="kw">private func</span> <span class="fn">eventTapCallback</span>(
    <span class="id">proxy</span>:  <span class="ty">CGEventTapProxy</span>,
    <span class="id">type</span>:   <span class="ty">CGEventType</span>,
    <span class="id">event</span>:  <span class="ty">CGEvent</span>,
    <span class="id">refcon</span>: <span class="ty">UnsafeMutableRawPointer</span>?
) -> <span class="ty">Unmanaged</span>&lt;<span class="ty">CGEvent</span>&gt;? {

    <span class="kw">guard</span> <span class="kw">let</span> <span class="id">refcon</span> <span class="kw">else</span> { <span class="kw">return</span> <span class="ty">Unmanaged</span>.<span class="fn">passRetained</span>(<span class="id">event</span>) }
    <span class="kw">let</span> <span class="id">delegate</span> = <span class="ty">Unmanaged</span>&lt;<span class="ty">AppDelegate</span>&gt;
        .<span class="fn">fromOpaque</span>(<span class="id">refcon</span>).<span class="fn">takeUnretainedValue</span>()

    <span class="kw">if</span> <span class="id">type</span> == .<span class="id">keyDown</span> {
        <span class="kw">let</span> <span class="id">keyCode</span> = <span class="id">event</span>.<span class="fn">getIntegerValueField</span>(.<span class="id">keyboardEventKeycode</span>)
        <span class="kw">if</span> <span class="id">keyCode</span> == <span class="nu">63</span> { <span class="cm">// kVK_Function (FN key)</span>
            <span class="ty">DispatchQueue</span>.<span class="id">main</span>.<span class="fn">async</span> { <span class="id">delegate</span>.<span class="fn">startRecording</span>() }
            <span class="kw">return</span> <span class="kw">nil</span>  <span class="cm">// consume the event</span>
        }
    }
    <span class="kw">if</span> <span class="id">type</span> == .<span class="id">keyUp</span> {
        <span class="kw">let</span> <span class="id">keyCode</span> = <span class="id">event</span>.<span class="fn">getIntegerValueField</span>(.<span class="id">keyboardEventKeycode</span>)
        <span class="kw">if</span> <span class="id">keyCode</span> == <span class="nu">63</span> {
            <span class="ty">DispatchQueue</span>.<span class="id">main</span>.<span class="fn">async</span> { <span class="id">delegate</span>.<span class="fn">stopRecording</span>() }
            <span class="kw">return</span> <span class="kw">nil</span>
        }
    }
    <span class="kw">return</span> <span class="ty">Unmanaged</span>.<span class="fn">passRetained</span>(<span class="id">event</span>)
}

<span class="kw">func</span> <span class="fn">registerGlobalHotkey</span>() {
    <span class="kw">let</span> <span class="id">mask</span>: <span class="ty">CGEventMask</span> = (
        (<span class="nu">1</span> &lt;&lt; <span class="ty">CGEventType</span>.<span class="id">keyDown</span>.<span class="id">rawValue</span>) |
        (<span class="nu">1</span> &lt;&lt; <span class="ty">CGEventType</span>.<span class="id">keyUp</span>.<span class="id">rawValue</span>)
    )
    <span class="kw">let</span> <span class="id">selfPtr</span> = <span class="ty">Unmanaged</span>.<span class="fn">passUnretained</span>(<span class="kw">self</span>).<span class="fn">toOpaque</span>()

    <span class="kw">guard</span> <span class="kw">let</span> <span class="id">tap</span> = <span class="ty">CGEvent</span>.<span class="fn">tapCreate</span>(
        <span class="id">tap</span>:        .<span class="id">cgSessionEventTap</span>,
        <span class="id">place</span>:      .<span class="id">headInsertEventTap</span>,
        <span class="id">options</span>:    .<span class="id">defaultTap</span>,
        <span class="id">eventsOfInterest</span>: <span class="id">mask</span>,
        <span class="id">callback</span>:   <span class="id">eventTapCallback</span>,
        <span class="id">userInfo</span>:   <span class="id">selfPtr</span>
    ) <span class="kw">else</span> {
        <span class="ty">print</span>(<span class="st">"⚠️ Failed to create event tap — Accessibility permission?"</span>)
        <span class="kw">return</span>
    }

    <span class="kw">let</span> <span class="id">source</span> = <span class="ty">CFMachPortCreateRunLoopSource</span>(<span class="kw">nil</span>, <span class="id">tap</span>, <span class="nu">0</span>)
    <span class="ty">CFRunLoop</span>.<span class="fn">main</span>.<span class="fn">add</span>(<span class="id">source</span>, <span class="id">forMode</span>: .<span class="id">common</span>)
    <span class="ty">CGEvent</span>.<span class="fn">tapEnable</span>(<span class="id">tap</span>: <span class="id">tap</span>, <span class="id">enable</span>: <span class="kw">true</span>)
}</pre>

<div class="mb-warn">
<strong>⚠️ Always run on CFRunLoop.main.</strong> If you add the run loop source to a background queue's run loop, the tap silently stops delivering events after the system suspends that run loop. Seen this burn two days of debugging. Use <code>CFRunLoop.main</code>.
</div>

Re-registering after sleep is also essential. Wire it up in `applicationDidFinishLaunching`:

<pre class="code-block"><span class="ty">NotificationCenter</span>.<span class="id">default</span>.<span class="fn">addObserver</span>(
    <span class="id">forName</span>: <span class="ty">NSWorkspace</span>.<span class="id">willSleepNotification</span>,
    <span class="id">object</span>: <span class="kw">nil</span>,
    <span class="id">queue</span>: .<span class="id">main</span>
) { [<span class="kw">weak</span> <span class="kw">self</span>] <span class="id">_</span> <span class="kw">in</span>
    <span class="kw">self</span>?.<span class="fn">teardownEventTap</span>()
}
<span class="ty">NotificationCenter</span>.<span class="id">default</span>.<span class="fn">addObserver</span>(
    <span class="id">forName</span>: <span class="ty">NSWorkspace</span>.<span class="id">didWakeNotification</span>,
    <span class="id">object</span>: <span class="kw">nil</span>,
    <span class="id">queue</span>: .<span class="id">main</span>
) { [<span class="kw">weak</span> <span class="kw">self</span>] <span class="id">_</span> <span class="kw">in</span>
    <span class="kw">self</span>?.<span class="fn">registerGlobalHotkey</span>()
}</pre>

---

## Popover vs Panel — Interactive comparison

Click on each approach to see its trade-offs in detail.

<div class="mb-section">
<div class="pvp-wrap" id="pvpWrap">

  <div class="pvp-card" id="pvpPopover">
    <div class="pvp-mockup">
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="120" height="14" rx="3" fill="#2a2b30"/>
        <rect x="48" y="2" width="24" height="10" rx="2" fill="#7bcdab" opacity=".7"/>
        <rect x="10" y="22" width="100" height="62" rx="8" fill="#1e1f24" stroke="#7bcdab" stroke-width="1.5"/>
        <polygon points="60,14 54,22 66,22" fill="#1e1f24" stroke="#7bcdab" stroke-width="1.5"/>
        <rect x="20" y="32" width="80" height="7" rx="3" fill="#2e2f35"/>
        <rect x="20" y="45" width="55" height="7" rx="3" fill="#2e2f35"/>
        <rect x="20" y="58" width="66" height="7" rx="3" fill="#2e2f35"/>
        <rect x="20" y="71" width="40" height="8" rx="4" fill="#7bcdab" opacity=".6"/>
      </svg>
    </div>
    <h4>NSPopover</h4>
    <p>Attached arrow, auto-dismiss, traditional macOS feel</p>
  </div>

  <div class="pvp-card" id="pvpPanel">
    <div class="pvp-mockup">
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="120" height="14" rx="3" fill="#2a2b30"/>
        <rect x="48" y="2" width="24" height="10" rx="2" fill="#fbef8a" opacity=".7"/>
        <rect x="15" y="18" width="90" height="66" rx="10" fill="#1e1f24" stroke="#fbef8a" stroke-width="1.5"/>
        <rect x="24" y="28" width="72" height="7" rx="3" fill="#2e2f35"/>
        <rect x="24" y="41" width="50" height="7" rx="3" fill="#2e2f35"/>
        <rect x="24" y="54" width="60" height="7" rx="3" fill="#2e2f35"/>
        <rect x="24" y="67" width="36" height="8" rx="4" fill="#fbef8a" opacity=".5"/>
        <circle cx="98" cy="24" r="5" fill="#2e2f35"/>
        <line x1="95" y1="21" x2="101" y2="27" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
        <line x1="101" y1="21" x2="95" y2="27" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
      </svg>
    </div>
    <h4>NSPanel</h4>
    <p>Free-floating, non-activating, draggable, persistent</p>
  </div>

</div>

<div class="pvp-detail" id="pvpDetailPopover">
  <h5>NSPopover — the default choice</h5>
  <ul>
    <li>Arrow automatically anchors to your status bar button</li>
    <li><code>.transient</code> behavior dismisses on outside click — no event monitor needed</li>
    <li>Captures keyboard focus when shown — great for forms and search</li>
    <li><strong>Limitation:</strong> cannot be resized by the user; fixed <code>contentSize</code></li>
    <li><strong>Limitation:</strong> dismissed when the user switches Spaces or opens Mission Control</li>
    <li>SwiftUI hosted via <code>NSHostingController</code> — works perfectly</li>
  </ul>
</div>

<div class="pvp-detail" id="pvpDetailPanel">
  <h5>NSPanel — the power move</h5>
  <ul>
    <li>Set <code>.nonactivatingPanel</code> to prevent focus stealing — perfect for dictation</li>
    <li>Set <code>level = .floating</code> to stay above all other app windows</li>
    <li>Add <code>.canJoinAllSpaces</code> to persist across Spaces</li>
    <li>You manage show/hide yourself — dismiss on Escape with <code>NSEvent.addLocalMonitorForEvents</code></li>
    <li><strong>Complexity:</strong> you handle click-outside detection manually</li>
    <li>Best for: live transcript viewers, always-on timers, HUD overlays</li>
  </ul>
</div>

</div>

<script>
(function() {
  var popCard   = document.getElementById('pvpPopover');
  var panelCard = document.getElementById('pvpPanel');
  var popDetail = document.getElementById('pvpDetailPopover');
  var panelDetail = document.getElementById('pvpDetailPanel');

  function selectPopover() {
    popCard.classList.add('pvp-selected');
    panelCard.classList.remove('pvp-selected');
    popDetail.classList.add('visible');
    panelDetail.classList.remove('visible');
  }
  function selectPanel() {
    panelCard.classList.add('pvp-selected');
    popCard.classList.remove('pvp-selected');
    panelDetail.classList.add('visible');
    popDetail.classList.remove('visible');
  }
  function toggle(card, fn) {
    card.addEventListener('click', function() {
      if (card.classList.contains('pvp-selected')) {
        card.classList.remove('pvp-selected');
        popDetail.classList.remove('visible');
        panelDetail.classList.remove('visible');
      } else {
        fn();
      }
    });
  }
  toggle(popCard, selectPopover);
  toggle(panelCard, selectPanel);
})();
</script>

---

## Distributing without the App Store

{: class="marginalia" }
Apple Silicon's<br/>Neural Engine makes<br/>local ML models<br/>**viable in menu bar**<br/>**apps** in 2026 —<br/>think on-device<br/>Whisper, LLMs,<br/>image classifiers.<br/>Notarize and ship<br/>direct — no App<br/>Store tax.

Skipping the App Store means no 30% cut, no review delays, and no sandboxing restrictions that would cripple a hotkey monitor. The trade-off: you handle notarization yourself. Here's the full flow, with a live terminal animation showing the exact commands.

The four steps:
1. **Code-sign** with your Developer ID Application certificate
2. **Notarize** by submitting to Apple's notarization service
3. **Wait** for the JSON response (usually under 5 minutes)
4. **Staple** the ticket so the app works offline

<div class="fake-term" id="notaryTerm">
  <div class="fake-term-bar">
    <div class="term-dot red"></div>
    <div class="term-dot yel"></div>
    <div class="term-dot grn"></div>
    <div class="fake-term-title">Terminal — notarize.sh</div>
  </div>
  <div class="fake-term-body" id="notaryBody">
    <span class="term-line"><span class="term-prompt">$</span> <span class="term-cursor"></span></span>
  </div>
  <div class="term-btn-row">
    <button class="mb-btn" id="notaryPlay" style="font-size:12px;padding:.45rem 1rem;">▶ Run demo</button>
    <button class="mb-btn secondary" id="notaryReset" style="font-size:12px;padding:.45rem 1rem;margin-left:.5rem;">↺ Reset</button>
  </div>
</div>

<script>
(function() {
  var body   = document.getElementById('notaryBody');
  var play   = document.getElementById('notaryPlay');
  var reset  = document.getElementById('notaryReset');
  var timer  = null;
  var step   = 0;

  var steps = [
    { delay: 400,  html: '<span class="term-line"><span class="term-prompt">$</span> <span class="term-cmd">codesign --deep --force --options runtime \\</span></span><span class="term-line">  <span class="term-cmd">--sign "Developer ID Application: You (TEAMID)" \\</span></span><span class="term-line">  <span class="term-cmd">OpenWhisper.app</span></span>' },
    { delay: 1200, html: '<span class="term-line"><span class="term-ok">✓ OpenWhisper.app: signed</span></span>' },
    { delay: 600,  html: '<span class="term-line"><span class="term-out"></span></span><span class="term-line"><span class="term-prompt">$</span> <span class="term-cmd">ditto -c -k --keepParent OpenWhisper.app OpenWhisper.zip</span></span>' },
    { delay: 900,  html: '<span class="term-line"><span class="term-ok">✓ OpenWhisper.zip created (18.4 MB)</span></span>' },
    { delay: 600,  html: '<span class="term-line"><span class="term-out"></span></span><span class="term-line"><span class="term-prompt">$</span> <span class="term-cmd">xcrun notarytool submit OpenWhisper.zip \\</span></span><span class="term-line">  <span class="term-cmd">--apple-id "you@example.com" \\</span></span><span class="term-line">  <span class="term-cmd">--team-id "YOURTEAMID" \\</span></span><span class="term-line">  <span class="term-cmd">--password "@keychain:AC_PASSWORD" \\</span></span><span class="term-line">  <span class="term-cmd">--wait</span></span>' },
    { delay: 1800, html: '<span class="term-line"><span class="term-out">Submitting OpenWhisper.zip for notarization...</span></span>' },
    { delay: 2200, html: '<span class="term-line"><span class="term-out">  id: 9a4c1b2e-dead-beef-cafe-000000000001</span></span><span class="term-line"><span class="term-out">  status: In Progress</span></span>' },
    { delay: 2800, html: '<span class="term-line"><span class="term-out">  status: In Progress</span></span>' },
    { delay: 2400, html: '<span class="term-line"><span class="term-ok">  status: Accepted</span></span><span class="term-line"><span class="term-ok">✓ Notarization complete.</span></span>' },
    { delay: 700,  html: '<span class="term-line"><span class="term-out"></span></span><span class="term-line"><span class="term-prompt">$</span> <span class="term-cmd">xcrun stapler staple OpenWhisper.app</span></span>' },
    { delay: 1100, html: '<span class="term-line"><span class="term-ok">✓ Processing: OpenWhisper.app</span></span><span class="term-line"><span class="term-ok">✓ The staple and validate action worked!</span></span>' },
    { delay: 700,  html: '<span class="term-line"><span class="term-out"></span></span><span class="term-line"><span class="term-prompt">$</span> <span class="term-cmd">xcrun stapler validate OpenWhisper.app</span></span>' },
    { delay: 900,  html: '<span class="term-line"><span class="term-ok">✓ The validate action worked!</span></span><span class="term-line"><span class="term-out"></span></span><span class="term-line"><span class="term-out">🎉 OpenWhisper.app is notarized and ready to ship.</span></span>' }
  ];

  function appendLine(html) {
    var cursor = body.querySelector('.term-cursor');
    if (cursor) { cursor.parentElement.removeChild(cursor); }
    var div = document.createElement('div');
    div.innerHTML = html;
    while (div.firstChild) { body.appendChild(div.firstChild); }
    var cur = document.createElement('span');
    cur.className = 'term-line';
    cur.innerHTML = '<span class="term-cursor"></span>';
    body.appendChild(cur);
  }

  function runStep() {
    if (step >= steps.length) { play.disabled = false; play.textContent = '✓ Done'; return; }
    var s = steps[step++];
    timer = setTimeout(function() {
      appendLine(s.html);
      runStep();
    }, s.delay);
  }

  play.addEventListener('click', function() {
    play.disabled = true;
    play.textContent = '⏳ Running...';
    runStep();
  });

  reset.addEventListener('click', function() {
    clearTimeout(timer);
    step = 0;
    play.disabled = false;
    play.textContent = '▶ Run demo';
    body.innerHTML = '<span class="term-line"><span class="term-prompt">$</span> <span class="term-cursor"></span></span>';
  });
})();
</script>

<div class="mb-tip">
<strong>💡 Store your App Store Connect password in Keychain.</strong> Use <code>xcrun notarytool store-credentials</code> to create a named profile, then reference it with <code>--keychain-profile "YourProfile"</code> instead of inline credentials. Never put passwords in shell scripts.
</div>

For GitHub Actions CI/CD, store your certificate as a base64-encoded secret and use the `create-dmg` action to produce a signed, notarized DMG automatically on every tagged release. OpenWhisper's workflow does exactly this — the whole release pipeline is under 80 lines of YAML.

---

## Common gotchas — flip to see the fix

I've hit every one of these. Flip the cards to see the solution.

<div class="gotcha-grid" id="gotchaGrid">

  <div class="flip-card" onclick="this.classList.toggle('flipped')">
    <div class="flip-card-inner">
      <div class="flip-front">
        <div class="fc-num">01</div>
        <div class="fc-prob">App shows in the Dock even though it's a menu bar app</div>
        <div class="fc-hint">tap to see fix →</div>
      </div>
      <div class="flip-back">
        <div class="fc-fix-label">✓ Fix</div>
        <div class="fc-fix">Set <strong>LSUIElement</strong> to <code>YES</code> in your <code>Info.plist</code>. This marks the app as a "UI Element" — no Dock icon, no App Switcher entry. Without this, every time your popover becomes key, a Dock icon flashes in.</div>
        <div class="fc-code">&lt;key&gt;LSUIElement&lt;/key&gt;<br/>&lt;true/&gt;</div>
      </div>
    </div>
  </div>

  <div class="flip-card" onclick="this.classList.toggle('flipped')">
    <div class="flip-card-inner">
      <div class="flip-front">
        <div class="fc-num">02</div>
        <div class="fc-prob">FN key events are not intercepted at all</div>
        <div class="fc-hint">tap to see fix →</div>
      </div>
      <div class="flip-back">
        <div class="fc-fix-label">✓ Fix</div>
        <div class="fc-fix">CGEventTap for keyboard events requires <strong>Accessibility permission</strong>. Check <code>AXIsProcessTrusted()</code> at launch and prompt the user via <code>AXIsProcessTrustedWithOptions</code> with the prompt flag set to <code>true</code>.</div>
        <div class="fc-code">AXIsProcessTrustedWithOptions(<br/>  [kAXTrustedCheckOptionPrompt: true]<br/>  as CFDictionary)</div>
      </div>
    </div>
  </div>

  <div class="flip-card" onclick="this.classList.toggle('flipped')">
    <div class="flip-card-inner">
      <div class="flip-front">
        <div class="fc-num">03</div>
        <div class="fc-prob">Menu bar icon disappears after logout / reboot</div>
        <div class="fc-hint">tap to see fix →</div>
      </div>
      <div class="flip-back">
        <div class="fc-fix-label">✓ Fix</div>
        <div class="fc-fix">Use <strong>SMAppService</strong> (macOS 13+) to register as a Login Item. The old <code>LSSharedFileList</code> API is deprecated. <code>SMAppService.mainApp.register()</code> persists across reboots without prompting.</div>
        <div class="fc-code">try SMAppService.mainApp.register()</div>
      </div>
    </div>
  </div>

  <div class="flip-card" onclick="this.classList.toggle('flipped')">
    <div class="flip-card-inner">
      <div class="flip-front">
        <div class="fc-num">04</div>
        <div class="fc-prob">SwiftUI popover flickers or is blank on first open</div>
        <div class="fc-hint">tap to see fix →</div>
      </div>
      <div class="flip-back">
        <div class="fc-fix-label">✓ Fix</div>
        <div class="fc-fix">SwiftUI lazily initialises views. <strong>Warm up</strong> the hosting controller at launch by triggering a layout pass on the view before the popover is ever shown. Create the <code>NSHostingController</code> in <code>applicationDidFinishLaunching</code>, not lazily.</div>
        <div class="fc-code">// In applicationDidFinishLaunching:<br/>_ = popover.contentViewController?.view</div>
      </div>
    </div>
  </div>

  <div class="flip-card" onclick="this.classList.toggle('flipped')">
    <div class="flip-card-inner">
      <div class="flip-front">
        <div class="fc-num">05</div>
        <div class="fc-prob">CGEventTap stops delivering events after system sleep</div>
        <div class="fc-hint">tap to see fix →</div>
      </div>
      <div class="flip-back">
        <div class="fc-fix-label">✓ Fix</div>
        <div class="fc-fix">The event tap is silently disabled on wake. Listen for <strong>NSWorkspace.didWakeNotification</strong> and call <code>CGEvent.tapEnable(tap:enable:true)</code> — or tear down and re-create the tap entirely. Re-creating is more reliable.</div>
        <div class="fc-code">NSWorkspace.didWakeNotification →<br/>  teardownEventTap()<br/>  registerGlobalHotkey()</div>
      </div>
    </div>
  </div>

</div>

---

## Putting it all together — the OpenWhisper flow

Here's how all the pieces connect in a real app. The entire interaction loop for push-to-talk dictation:

<pre class="code-block"><span class="cm">// 1. FN key down → CGEventTap fires eventTapCallback</span>
<span class="cm">// 2. AVAudioEngine starts capturing mic</span>
<span class="cm">// 3. Status bar icon animates (pulsing red dot)</span>
<span class="cm">// 4. FN key up → stop capture</span>
<span class="cm">// 5. WhisperKit transcribes the audio buffer on-device</span>
<span class="cm">// 6. Text is pasted into the frontmost app via CGEvent</span>

<span class="kw">func</span> <span class="fn">pasteText</span>(<span class="id">_</span> <span class="id">text</span>: <span class="ty">String</span>) {
    <span class="cm">// Write to pasteboard</span>
    <span class="ty">NSPasteboard</span>.<span class="id">general</span>.<span class="fn">clearContents</span>()
    <span class="ty">NSPasteboard</span>.<span class="id">general</span>.<span class="fn">setString</span>(<span class="id">text</span>, <span class="id">forType</span>: .<span class="id">string</span>)

    <span class="cm">// Synthesise Cmd+V</span>
    <span class="kw">let</span> <span class="id">src</span> = <span class="ty">CGEventSource</span>(<span class="id">stateID</span>: .<span class="id">hidSystemState</span>)
    <span class="kw">let</span> <span class="id">down</span> = <span class="ty">CGEvent</span>(<span class="id">keyboardEventSource</span>: <span class="id">src</span>, <span class="id">virtualKey</span>: <span class="nu">0x09</span>, <span class="id">keyDown</span>: <span class="kw">true</span>)!
    <span class="kw">let</span> <span class="id">up</span>   = <span class="ty">CGEvent</span>(<span class="id">keyboardEventSource</span>: <span class="id">src</span>, <span class="id">virtualKey</span>: <span class="nu">0x09</span>, <span class="id">keyDown</span>: <span class="kw">false</span>)!
    <span class="id">down</span>.<span class="id">flags</span> = .<span class="id">maskCommand</span>
    <span class="id">up</span>.<span class="id">flags</span>   = .<span class="id">maskCommand</span>
    <span class="id">down</span>.<span class="fn">post</span>(<span class="id">tap</span>: .<span class="id">cgAnnotatedSessionEventTap</span>)
    <span class="id">up</span>.<span class="fn">post</span>(<span class="id">tap</span>:   .<span class="id">cgAnnotatedSessionEventTap</span>)
}</pre>

<div class="mb-tip">
<strong>💡 WhisperKit</strong> is the open-source Swift package that brings on-device Whisper transcription to Apple Silicon. On an M2 MacBook, a 10-second audio clip transcribes in under 400ms. No server, no API key, no privacy concerns.
</div>

---

## Closing thoughts

Menu bar apps are the best kind of side project: small enough to ship in a weekend, useful enough to keep open all day, and technically deep enough that you'll learn something new every time you dig in.

I built OpenWhisper in roughly three weekends of focused work. The CGEventTap bugs alone took most of weekend two, which is partly why this post exists — so you don't lose the same hours I did.

A few parting principles I've landed on:

- **Do one thing.** The icon takes up permanent space on every user's screen. Justify the pixel.
- **Respect focus.** If you can use `.nonactivatingPanel`, use it. Never steal the keyboard from the user.
- **Handle permissions gracefully.** Guide the user to System Settings with a clear explanation, not just a crash.
- **Warm up your SwiftUI views.** The first-open flicker is the first impression. Don't let it be a bad one.
- **Re-register your event tap after sleep.** Every time. No exceptions.

The full source for OpenWhisper — including the CGEventTap bridge, the WhisperKit integration, and the GitHub Actions notarization workflow — is on GitHub at `github.com/malukenho/openwhisper`. Go build something.

{: class="marginalia" }
The whole OpenWhisper<br/>codebase is under<br/>**2 000 lines** of<br/>Swift. Small is<br/>a feature, not<br/>a limitation.

---

<div style="text-align:center;padding:2rem 0 1rem;color:rgba(255,255,255,.35);font-size:13px;">
  Swift 6 · macOS 14+ · Tested on Apple Silicon & Intel · Last updated April 2026
</div>
