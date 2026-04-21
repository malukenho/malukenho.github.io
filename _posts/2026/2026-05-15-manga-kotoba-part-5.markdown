---
layout: post
title: "Manga Kotoba, Part 5: SwiftUI Polish, StoreKit Paywall, and Shipping to the App Store"
date: 2026-05-15 10:00:00 +0000
categories: ["post"]
tags: [ios, swift, swiftui, storekit, app-store, japanese, manga]
series: manga-kotoba
---

<style>
.mk5-root { color: rgba(255,255,255,0.8); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.mk5-root h2 { color: #fbef8a; margin-top: 2.5rem; }
.mk5-root h3 { color: #fbef8a; }
.mk5-root h4 { color: #7bcdab; }
.mk5-root a { color: #7bcdab; }
.mk5-root .card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
}
.mk5-root .btn {
  background: #7bcdab;
  color: #19191c;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  padding: 0.5rem 1.2rem;
  cursor: pointer;
  font-size: 0.95rem;
  display: inline-block;
}
.mk5-root .btn:hover { opacity: 0.88; }
.mk5-root .btn-outline {
  background: transparent;
  color: #7bcdab;
  border: 1.5px solid #7bcdab;
  border-radius: 8px;
  font-weight: 700;
  padding: 0.5rem 1.2rem;
  cursor: pointer;
  font-size: 0.95rem;
  display: inline-block;
}
.mk5-root pre.code-block {
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 1.2rem 1.4rem;
  overflow-x: auto;
  font-size: 0.82rem;
  line-height: 1.6;
  margin: 1rem 0 1.5rem;
  white-space: pre;
}
.mk5-root .kw { color: #f97583; }
.mk5-root .fn { color: #7bcdab; }
.mk5-root .st { color: #fbef8a; }
.mk5-root .cm { color: rgba(255,255,255,0.35); font-style: italic; }
.mk5-root .ty { color: #b392f0; }
.mk5-root .nu { color: #ffa94d; }
.mk5-root .marginalia {
  float: right;
  width: 210px;
  margin: 0 0 1rem 1.5rem;
  font-size: 0.78rem;
  line-height: 1.55;
  color: rgba(255,255,255,0.5);
  border-left: 2px solid #7bcdab;
  padding-left: 0.75rem;
  font-style: italic;
}
@media (max-width: 700px) {
  .mk5-root .marginalia { float: none; width: 100%; margin: 1rem 0; }
}
.mk5-root .series-nav {
  display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 1rem 0;
}
.mk5-root .series-nav a {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 0.3rem 0.8rem;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
}
.mk5-root .series-nav a.active { background: rgba(123,205,171,0.18); border-color: #7bcdab; color: #7bcdab; }
.mk5-root .tag {
  display: inline-block;
  background: rgba(123,205,171,0.15);
  color: #7bcdab;
  border-radius: 6px;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  margin-right: 0.25rem;
}
.mk5-root .tag-yellow {
  background: rgba(251,239,138,0.15);
  color: #fbef8a;
}
.mk5-root ul li { margin-bottom: 0.35rem; }
</style>

<div class="mk5-root">

<div class="series-nav">
  <a href="/post/2025/10/01/manga-kotoba-part-1.html">Part 1</a>
  <a href="/post/2025/11/15/manga-kotoba-part-2.html">Part 2</a>
  <a href="/post/2026/01/10/manga-kotoba-part-3.html">Part 3</a>
  <a href="/post/2026/03/01/manga-kotoba-part-4.html">Part 4</a>
  <a href="#" class="active">Part 5 ← finale</a>
</div>

<p>Five parts, seven months, one shipped app. This is the finale of the Manga Kotoba series — the one where we stop building and start <em>shipping</em>. We'll polish the SwiftUI layer, wire up StoreKit 2 for subscriptions, fight our way through App Store review, and reflect on what it all meant.</p>

---

## 1. Where We Left Off

<div class="card">
  <strong style="color:#fbef8a;">Series recap</strong>
  <ul style="margin-top:0.75rem;">
    <li><strong>Part 1</strong> — Architecture decisions: SwiftUI + Symfony 7 + API Platform. The vocabulary extraction pipeline for manga pages.</li>
    <li><strong>Part 2</strong> — Building the API: JWT auth, resource classes, custom state processors, OpenAPI docs.</li>
    <li><strong>Part 3</strong> — SwiftUI foundations: <code>NavigationStack</code>, async data fetching, the first <code>VocabCard</code> component.</li>
    <li><strong>Part 4</strong> — Production backend on Heroku + RDS, PostgreSQL migrations, staging/production environments, the vocabulary spaced-repetition engine (SM-2).</li>
    <li><strong>Part 5 (this post)</strong> — UI polish, StoreKit 2 paywall, onboarding, App Store submission and all the ways it went wrong.</li>
  </ul>
</div>

The app was <em>working</em> at the end of Part 4 — you could sign in, browse manga, study vocabulary cards with spaced repetition. But "working" and "App Store ready" are not the same thing. Missing: monetisation, a real onboarding flow, polished animations, and the courage to actually submit.

---

## 2. SwiftUI Component Gallery

{: class="marginalia" }
SwiftUI previews in Xcode 15+ are dramatically faster than the old simulator-based ones. I ran the canvas at 1× on a Mac Studio and got near-instant refreshes for most components.

Below is an interactive mock of the four main screens. Click the tab bar icons to switch. This runs entirely in the browser to give you a feel for the component architecture.

<div id="phone-demo" style="display:flex;flex-direction:column;align-items:center;margin:2rem 0;">

<style>
#phone-demo .phone-shell {
  width: 375px;
  height: 680px;
  background: #1a1a1e;
  border-radius: 44px;
  border: 2px solid rgba(255,255,255,0.15);
  box-shadow: 0 24px 64px rgba(0,0,0,0.7);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}
#phone-demo .notch {
  width: 120px; height: 28px;
  background: #0d0d0f;
  border-radius: 0 0 18px 18px;
  margin: 0 auto;
  flex-shrink: 0;
}
#phone-demo .screen-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}
#phone-demo .screen {
  display: none;
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
  box-sizing: border-box;
}
#phone-demo .screen.active { display: block; }
#phone-demo .tab-bar {
  display: flex;
  background: rgba(26,26,30,0.95);
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0.5rem 0 0.7rem;
  flex-shrink: 0;
}
#phone-demo .tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  font-size: 0.6rem;
  color: rgba(255,255,255,0.4);
  transition: color 0.2s;
}
#phone-demo .tab-item.active { color: #7bcdab; }
#phone-demo .tab-icon { font-size: 1.3rem; }

/* Vocab card */
#phone-demo .vocab-card-wrap {
  display: flex; justify-content: center; align-items: center;
  height: 100%;
  flex-direction: column;
  gap: 1rem;
}
#phone-demo .vocab-card {
  width: 300px; height: 200px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0.4rem;
  cursor: grab;
  position: relative;
  transition: transform 0.15s, box-shadow 0.15s;
  user-select: none;
}
#phone-demo .vocab-card .jlpt {
  position: absolute; top: 10px; right: 12px;
  background: rgba(251,239,138,0.2);
  color: #fbef8a;
  border-radius: 6px; padding: 0.1rem 0.45rem;
  font-size: 0.65rem; font-weight: 700;
}
#phone-demo .vocab-card .word {
  font-size: 2.2rem; color: #fff; font-weight: 700;
}
#phone-demo .vocab-card .reading {
  font-size: 0.85rem; color: #7bcdab;
}
#phone-demo .vocab-card .definition {
  font-size: 0.8rem; color: rgba(255,255,255,0.6);
  text-align: center; padding: 0 1rem;
}
#phone-demo .vocab-card .example {
  font-size: 0.7rem; color: rgba(255,255,255,0.4);
  text-align: center; padding: 0 1rem;
  font-style: italic;
}
#phone-demo .swipe-hint {
  display: flex; gap: 2rem; font-size: 0.7rem;
  color: rgba(255,255,255,0.35);
}
#phone-demo .swipe-hint .left { color: #f97583; }
#phone-demo .swipe-hint .right { color: #7bcdab; }
#phone-demo .swipe-overlay {
  position: absolute; inset: 0;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 3rem; font-weight: 900;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

/* Manga grid */
#phone-demo .manga-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
}
#phone-demo .manga-cover {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 0.75rem;
  display: flex; flex-direction: column; gap: 0.4rem;
}
#phone-demo .manga-cover .cover-art {
  height: 80px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem;
}
#phone-demo .manga-cover .manga-title {
  font-size: 0.72rem; font-weight: 700; color: #fff;
}
#phone-demo .manga-cover .manga-meta {
  font-size: 0.63rem; color: rgba(255,255,255,0.4);
}
#phone-demo .manga-cover .vocab-badge {
  background: rgba(123,205,171,0.2);
  color: #7bcdab;
  border-radius: 6px; padding: 0.1rem 0.4rem;
  font-size: 0.6rem; font-weight: 700;
  align-self: flex-start;
}

/* Progress ring */
#phone-demo .ring-screen {
  display: flex; flex-direction: column; align-items: center;
  gap: 1.2rem; padding-top: 1rem;
}
#phone-demo .ring-label {
  font-size: 0.75rem; color: rgba(255,255,255,0.5);
  text-align: center;
}
#phone-demo .ring-count {
  font-size: 2rem; font-weight: 700; color: #fff;
}
#phone-demo .ring-subtext {
  font-size: 0.7rem; color: rgba(255,255,255,0.4);
}

/* Settings */
#phone-demo .settings-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 0.82rem;
}
#phone-demo .settings-row:last-child { border-bottom: none; }
.mk5-toggle {
  width: 42px; height: 24px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.25s;
  flex-shrink: 0;
}
.mk5-toggle.on { background: #7bcdab; }
.mk5-toggle::after {
  content: '';
  position: absolute;
  width: 18px; height: 18px;
  background: #fff;
  border-radius: 50%;
  top: 3px; left: 3px;
  transition: left 0.25s;
}
.mk5-toggle.on::after { left: 21px; }
</style>

<div class="phone-shell">
  <div class="notch"></div>
  <div class="screen-area">

    <!-- Screen 0: Vocab Card -->
    <div class="screen active" id="sc-vocab">
      <div class="vocab-card-wrap">
        <div class="vocab-card" id="vc-card">
          <div class="jlpt">N3</div>
          <div class="swipe-overlay" id="vc-overlay"></div>
          <div class="word">仲間</div>
          <div class="reading">なかま (nakama)</div>
          <div class="definition">Companion; comrade; fellow</div>
          <div class="example">"俺の仲間を傷つけるな！"</div>
        </div>
        <div class="swipe-hint">
          <span class="left">← skip</span>
          <span class="right">know →</span>
        </div>
        <div style="font-size:0.65rem;color:rgba(255,255,255,0.25);text-align:center;">Click card to simulate swipe</div>
      </div>
    </div>

    <!-- Screen 1: Manga Browser -->
    <div class="screen" id="sc-manga">
      <div style="font-size:0.9rem;font-weight:700;color:#fbef8a;margin-bottom:0.75rem;">My Manga</div>
      <div class="manga-grid">
        <div class="manga-cover">
          <div class="cover-art" style="background:rgba(249,117,131,0.15);">🗡️</div>
          <div class="manga-title">Demon Slayer</div>
          <div class="manga-meta">23 chapters</div>
          <div class="vocab-badge">1,204 words</div>
        </div>
        <div class="manga-cover">
          <div class="cover-art" style="background:rgba(123,205,171,0.15);">🍥</div>
          <div class="manga-title">Naruto</div>
          <div class="manga-meta">72 chapters</div>
          <div class="vocab-badge">3,891 words</div>
        </div>
        <div class="manga-cover">
          <div class="cover-art" style="background:rgba(251,239,138,0.15);">⚔️</div>
          <div class="manga-title">One Piece</div>
          <div class="manga-meta">108 chapters</div>
          <div class="vocab-badge">5,120 words</div>
        </div>
        <div class="manga-cover" style="opacity:0.4;cursor:pointer;" onclick="document.getElementById('paywall-demo').scrollIntoView({behavior:'smooth'})">
          <div class="cover-art" style="background:rgba(255,255,255,0.05);">🔒</div>
          <div class="manga-title">Unlock Pro</div>
          <div class="manga-meta">+200 manga</div>
          <div class="vocab-badge">Go Pro</div>
        </div>
      </div>
    </div>

    <!-- Screen 2: Progress Ring -->
    <div class="screen" id="sc-ring">
      <div class="ring-screen">
        <div style="font-size:0.9rem;font-weight:700;color:#fbef8a;">Today's Progress</div>
        <svg width="150" height="150" viewBox="0 0 150 150" id="progress-svg">
          <circle cx="75" cy="75" r="60" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12"/>
          <circle cx="75" cy="75" r="60" fill="none" stroke="#7bcdab" stroke-width="12"
            stroke-dasharray="377" stroke-dashoffset="188" stroke-linecap="round"
            transform="rotate(-90 75 75)" id="progress-circle" style="transition:stroke-dashoffset 0.4s;"/>
          <text x="75" y="69" text-anchor="middle" fill="#fff" font-size="22" font-weight="700" id="ring-num">15</text>
          <text x="75" y="88" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="11">/ 20 words</text>
        </svg>
        <div class="ring-label">Daily goal: <strong style="color:#fbef8a;" id="ring-goal-lbl">20 words</strong></div>
        <button class="btn" onclick="incrementRing()" style="font-size:0.8rem;padding:0.4rem 1rem;">+ Study Word</button>
        <div style="font-size:0.7rem;color:rgba(255,255,255,0.3);">Click to simulate studying a card</div>
      </div>
    </div>

    <!-- Screen 3: Settings -->
    <div class="screen" id="sc-settings">
      <div style="font-size:0.9rem;font-weight:700;color:#fbef8a;margin-bottom:0.75rem;">Settings</div>
      <div class="settings-row">
        <span>Dark Mode</span>
        <div class="mk5-toggle on" id="tog-dark" onclick="toggleMk5('tog-dark')"></div>
      </div>
      <div class="settings-row">
        <span>Daily Notifications</span>
        <div class="mk5-toggle" id="tog-notif" onclick="toggleMk5('tog-notif')"></div>
      </div>
      <div class="settings-row">
        <span>Romaji hints</span>
        <div class="mk5-toggle on" id="tog-romaji" onclick="toggleMk5('tog-romaji')"></div>
      </div>
      <div class="settings-row">
        <span>Sound effects</span>
        <div class="mk5-toggle" id="tog-sound" onclick="toggleMk5('tog-sound')"></div>
      </div>
      <div class="settings-row" style="margin-top:0.5rem;">
        <span style="color:rgba(255,255,255,0.4);font-size:0.75rem;">Manga Kotoba v2.1.0</span>
      </div>
    </div>

  </div>
  <div class="tab-bar">
    <div class="tab-item active" onclick="switchTab(0)" id="tab-0">
      <div class="tab-icon">🃏</div>
      <div>Study</div>
    </div>
    <div class="tab-item" onclick="switchTab(1)" id="tab-1">
      <div class="tab-icon">📚</div>
      <div>Manga</div>
    </div>
    <div class="tab-item" onclick="switchTab(2)" id="tab-2">
      <div class="tab-icon">📊</div>
      <div>Progress</div>
    </div>
    <div class="tab-item" onclick="switchTab(3)" id="tab-3">
      <div class="tab-icon">⚙️</div>
      <div>Settings</div>
    </div>
  </div>
</div>

</div>

<script>
(function() {
  var screens = ['sc-vocab','sc-manga','sc-ring','sc-settings'];
  window.switchTab = function(idx) {
    screens.forEach(function(id, i) {
      var s = document.getElementById(id);
      var t = document.getElementById('tab-' + i);
      if (i === idx) { s.classList.add('active'); t.classList.add('active'); }
      else { s.classList.remove('active'); t.classList.remove('active'); }
    });
  };
  window.toggleMk5 = function(id) {
    document.getElementById(id).classList.toggle('on');
  };

  // Vocab card click to simulate swipe
  var vcCard = document.getElementById('vc-card');
  var vcOverlay = document.getElementById('vc-overlay');
  var vcToggle = 0;
  vcCard.addEventListener('click', function() {
    vcToggle = (vcToggle + 1) % 3;
    if (vcToggle === 1) {
      vcCard.style.transform = 'rotate(-6deg) translateX(-30px)';
      vcOverlay.style.background = 'rgba(249,117,131,0.35)';
      vcOverlay.textContent = '✗';
      vcOverlay.style.color = '#f97583';
      vcOverlay.style.opacity = '1';
    } else if (vcToggle === 2) {
      vcCard.style.transform = 'rotate(6deg) translateX(30px)';
      vcOverlay.style.background = 'rgba(123,205,171,0.35)';
      vcOverlay.textContent = '✓';
      vcOverlay.style.color = '#7bcdab';
      vcOverlay.style.opacity = '1';
    } else {
      vcCard.style.transform = '';
      vcOverlay.style.opacity = '0';
    }
  });

  // Progress ring
  var ringCount = 15;
  var ringGoal = 20;
  window.incrementRing = function() {
    if (ringCount < ringGoal) ringCount++;
    else ringCount = 0;
    document.getElementById('ring-num').textContent = ringCount;
    var circumference = 377;
    var offset = circumference - (ringCount / ringGoal) * circumference;
    document.getElementById('progress-circle').setAttribute('stroke-dashoffset', offset);
  };
})();
</script>

---

## 3. The Swipe-to-Know Gesture

Getting swipe gestures right in SwiftUI took three iterations.

### Attempt 1: onTapGesture

<pre class="code-block"><span class="cm">// ❌ Wrong — no directional info</span>
<span class="ty">VocabCardView</span>(card: card)
    .<span class="fn">onTapGesture</span> {
        <span class="cm">// We know it was tapped, but left or right?</span>
        viewModel.<span class="fn">markKnown</span>(card)
    }</pre>

Obvious in hindsight. `onTapGesture` gives you a tap location, but we need direction.

### Attempt 2: DragGesture with .onEnded

<pre class="code-block"><span class="cm">// ⚠️ Better, but no real-time feedback</span>
<span class="ty">VocabCardView</span>(card: card)
    .<span class="fn">gesture</span>(
        <span class="ty">DragGesture</span>()
            .<span class="fn">onEnded</span> { value <span class="kw">in</span>
                <span class="kw">if</span> value.translation.width > <span class="nu">50</span> {
                    viewModel.<span class="fn">markKnown</span>(card)
                } <span class="kw">else if</span> value.translation.width < -<span class="nu">50</span> {
                    viewModel.<span class="fn">markSkipped</span>(card)
                }
            }
    )</pre>

Works, but the card doesn't visually tilt while dragging. Feels unresponsive.

### Final: DragGesture with .onChanged + .onEnded

{: class="marginalia" }
The `.onChanged` closure fires every time the finger moves. Combining it with `withAnimation` keeps SwiftUI's layout engine happy and avoids dropped frames. On a real device this stays at 120 fps.

<pre class="code-block"><span class="kw">struct</span> <span class="ty">SwipeableCard</span>: <span class="ty">View</span> {
    <span class="kw">let</span> card: <span class="ty">VocabCard</span>
    <span class="kw">var</span> onSwipe: (<span class="ty">SwipeDirection</span>) -> <span class="ty">Void</span>

    <span class="kw">@State private var</span> dragOffset: <span class="ty">CGSize</span> = .zero
    <span class="kw">@State private var</span> isDragging = <span class="kw">false</span>

    <span class="kw">private var</span> rotation: <span class="ty">Double</span> {
        <span class="ty">Double</span>(dragOffset.width / <span class="nu">20</span>)
    }
    <span class="kw">private var</span> swipeIndicator: <span class="ty">SwipeDirection</span>? {
        <span class="kw">if</span> dragOffset.width > <span class="nu">60</span> { <span class="kw">return</span> .right }
        <span class="kw">if</span> dragOffset.width < -<span class="nu">60</span> { <span class="kw">return</span> .left }
        <span class="kw">return nil</span>
    }

    <span class="kw">var</span> body: <span class="kw">some</span> <span class="ty">View</span> {
        <span class="ty">ZStack</span> {
            <span class="fn">cardContent</span>
            <span class="kw">if let</span> dir = swipeIndicator {
                <span class="ty">SwipeLabel</span>(direction: dir)
                    .<span class="fn">transition</span>(.<span class="fn">opacity</span>)
            }
        }
        .<span class="fn">rotationEffect</span>(.<span class="fn">degrees</span>(rotation))
        .<span class="fn">offset</span>(dragOffset)
        .<span class="fn">gesture</span>(
            <span class="ty">DragGesture</span>()
                .<span class="fn">onChanged</span> { value <span class="kw">in</span>
                    <span class="fn">withAnimation</span>(.<span class="fn">interactiveSpring</span>()) {
                        dragOffset = value.translation
                        isDragging = <span class="kw">true</span>
                    }
                }
                .<span class="fn">onEnded</span> { value <span class="kw">in</span>
                    <span class="kw">let</span> threshold: <span class="ty">CGFloat</span> = <span class="nu">100</span>
                    <span class="kw">if</span> value.translation.width > threshold {
                        <span class="fn">flyOut</span>(to: .right)
                    } <span class="kw">else if</span> value.translation.width < -threshold {
                        <span class="fn">flyOut</span>(to: .left)
                    } <span class="kw">else</span> {
                        <span class="fn">withAnimation</span>(.<span class="fn">spring</span>()) { dragOffset = .zero }
                    }
                    isDragging = <span class="kw">false</span>
                }
        )
    }

    <span class="kw">private func</span> <span class="fn">flyOut</span>(to direction: <span class="ty">SwipeDirection</span>) {
        <span class="kw">let</span> xTarget: <span class="ty">CGFloat</span> = direction == .right ? <span class="nu">500</span> : -<span class="nu">500</span>
        <span class="fn">withAnimation</span>(.<span class="fn">easeIn</span>(duration: <span class="nu">0.25</span>)) {
            dragOffset = <span class="ty">CGSize</span>(width: xTarget, height: <span class="nu">0</span>)
        }
        <span class="ty">DispatchQueue</span>.main.<span class="fn">asyncAfter</span>(deadline: .now() + <span class="nu">0.3</span>) {
            <span class="fn">onSwipe</span>(direction)
        }
    }
}</pre>

### Interactive Drag Demo

Drag the card below left or right (or click the buttons):

<div id="drag-demo" style="display:flex;flex-direction:column;align-items:center;gap:1.2rem;margin:2rem 0;">
<style>
#drag-demo .flash-card {
  width: 300px; height: 180px;
  background: rgba(255,255,255,0.07);
  border: 1.5px solid rgba(255,255,255,0.15);
  border-radius: 18px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0.5rem; cursor: grab;
  position: relative; user-select: none;
  transition: box-shadow 0.15s;
}
#drag-demo .flash-card:active { cursor: grabbing; }
#drag-demo .drag-indicator {
  position: absolute; inset: 0; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.5rem; font-weight: 900; opacity: 0;
  pointer-events: none; transition: opacity 0.12s;
}
#drag-demo .demo-hint { font-size:0.7rem; color:rgba(255,255,255,0.3); }
#drag-demo .demo-btns { display:flex; gap:1rem; }
</style>
<div class="flash-card" id="fc-main">
  <div class="drag-indicator" id="fc-ind"></div>
  <div style="font-size:1.9rem;font-weight:700;color:#fff;">勇気</div>
  <div style="font-size:0.85rem;color:#7bcdab;">ゆうき (yūki)</div>
  <div style="font-size:0.8rem;color:rgba(255,255,255,0.55);">Courage; bravery</div>
  <div style="font-size:0.65rem;color:rgba(255,255,255,0.3);font-style:italic;">"勇気を出して！" — Be brave!</div>
</div>
<div class="demo-hint">Drag left (skip) or right (know)</div>
<div class="demo-btns">
  <button class="btn" style="background:#f97583;font-size:0.82rem;" onclick="triggerDrag(-1)">✗ Skip</button>
  <button class="btn" style="font-size:0.82rem;" onclick="triggerDrag(1)">✓ Know</button>
</div>
<div id="fc-result" style="font-size:0.85rem;color:rgba(255,255,255,0.5);min-height:1.2rem;"></div>
</div>

<script>
(function() {
  var card = document.getElementById('fc-main');
  var ind = document.getElementById('fc-ind');
  var result = document.getElementById('fc-result');
  var dragging = false;
  var startX = 0;
  var currentX = 0;

  function applyTransform(dx) {
    var rot = dx / 20;
    card.style.transform = 'translateX(' + dx + 'px) rotate(' + rot + 'deg)';
    var ratio = Math.min(Math.abs(dx) / 80, 1);
    if (dx > 20) {
      ind.style.background = 'rgba(123,205,171,0.35)';
      ind.textContent = '✓';
      ind.style.color = '#7bcdab';
      ind.style.opacity = ratio;
    } else if (dx < -20) {
      ind.style.background = 'rgba(249,117,131,0.35)';
      ind.textContent = '✗';
      ind.style.color = '#f97583';
      ind.style.opacity = ratio;
    } else {
      ind.style.opacity = '0';
    }
  }

  function reset() {
    card.style.transition = 'transform 0.35s cubic-bezier(.34,1.56,.64,1)';
    card.style.transform = '';
    ind.style.opacity = '0';
    setTimeout(function() { card.style.transition = ''; }, 380);
  }

  function flyOut(dir) {
    card.style.transition = 'transform 0.28s ease-in, opacity 0.28s';
    card.style.transform = 'translateX(' + (dir * 500) + 'px) rotate(' + (dir * 18) + 'deg)';
    card.style.opacity = '0';
    result.textContent = dir > 0 ? '✓ Marked as known!' : '✗ Skipped for later';
    result.style.color = dir > 0 ? '#7bcdab' : '#f97583';
    setTimeout(function() {
      card.style.transition = 'transform 0.35s, opacity 0.35s';
      card.style.transform = '';
      card.style.opacity = '1';
      ind.style.opacity = '0';
      result.textContent = '';
      setTimeout(function() { card.style.transition = ''; }, 380);
    }, 1100);
  }

  card.addEventListener('mousedown', function(e) {
    dragging = true; startX = e.clientX; currentX = 0;
    card.style.transition = '';
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    currentX = e.clientX - startX;
    applyTransform(currentX);
  });
  window.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    if (currentX > 100) { flyOut(1); }
    else if (currentX < -100) { flyOut(-1); }
    else { reset(); }
  });

  card.addEventListener('touchstart', function(e) {
    dragging = true; startX = e.touches[0].clientX; currentX = 0;
    card.style.transition = '';
  }, { passive: true });
  card.addEventListener('touchmove', function(e) {
    if (!dragging) return;
    currentX = e.touches[0].clientX - startX;
    applyTransform(currentX);
  }, { passive: true });
  card.addEventListener('touchend', function() {
    if (!dragging) return;
    dragging = false;
    if (currentX > 100) { flyOut(1); }
    else if (currentX < -100) { flyOut(-1); }
    else { reset(); }
  });

  window.triggerDrag = function(dir) { flyOut(dir); };
})();
</script>

---

## 4. StoreKit 2 Paywall

{: class="marginalia" }
StoreKit 2 was a complete rewrite released with iOS 15. The old StoreKit required parsing XML receipts and doing server-side OpenSSL verification. StoreKit 2 uses JWS tokens and async/await — it's dramatically simpler.

The freemium model: **3 manga free, unlimited with Pro** ($2.99/month or $19.99/year).

### Fetching Products

<pre class="code-block"><span class="kw">actor</span> <span class="ty">StoreService</span> {
    <span class="kw">static let</span> productIDs = [
        <span class="st">"com.mangakotoba.pro.monthly"</span>,
        <span class="st">"com.mangakotoba.pro.yearly"</span>
    ]

    <span class="kw">private(set) var</span> products: [<span class="ty">Product</span>] = []

    <span class="kw">func</span> <span class="fn">loadProducts</span>() <span class="kw">async throws</span> {
        products = <span class="kw">try await</span> <span class="ty">Product</span>.<span class="fn">products</span>(for: <span class="ty">Self</span>.productIDs)
    }
}</pre>

### Purchasing and Handling Result

<pre class="code-block"><span class="kw">func</span> <span class="fn">purchase</span>(_ product: <span class="ty">Product</span>) <span class="kw">async</span> {
    <span class="kw">do</span> {
        <span class="kw">let</span> result = <span class="kw">try await</span> product.<span class="fn">purchase</span>()
        <span class="kw">switch</span> result {
        <span class="kw">case</span> .<span class="fn">success</span>(<span class="kw">let</span> verification):
            <span class="kw">switch</span> verification {
            <span class="kw">case</span> .<span class="fn">verified</span>(<span class="kw">let</span> transaction):
                <span class="kw">await</span> transaction.<span class="fn">finish</span>()
                <span class="kw">await</span> <span class="fn">updateProStatus</span>()
            <span class="kw">case</span> .<span class="fn">unverified</span>:
                <span class="cm">// JWS signature check failed — treat as no purchase</span>
                <span class="kw">break</span>
            }
        <span class="kw">case</span> .userCancelled, .pending:
            <span class="kw">break</span>
        <span class="kw">@unknown default</span>:
            <span class="kw">break</span>
        }
    } <span class="kw">catch</span> {
        <span class="fn">print</span>(<span class="st">"Purchase error: "</span> + error.localizedDescription)
    }
}</pre>

### Checking Active Entitlements

<pre class="code-block"><span class="kw">func</span> <span class="fn">updateProStatus</span>() <span class="kw">async</span> {
    <span class="kw">var</span> isActive = <span class="kw">false</span>
    <span class="kw">for await</span> result <span class="kw">in</span> <span class="ty">Transaction</span>.currentEntitlements {
        <span class="kw">if case</span> .<span class="fn">verified</span>(<span class="kw">let</span> tx) = result,
           tx.productType == .autoRenewableSubscription {
            isActive = <span class="kw">true</span>
        }
    }
    <span class="kw">await</span> <span class="ty">MainActor</span>.<span class="fn">run</span> { isPro = isActive }
}</pre>

No more OpenSSL. No more base64-decoding receipt blobs. The entire entitlement check is four lines of async Swift.

### Interactive Paywall Demo

<div id="paywall-demo" style="max-width:480px;margin:2rem auto;">
<style>
#paywall-demo .pw-wrap {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; padding: 1.8rem;
}
#paywall-demo .pw-title {
  font-size:1.2rem; font-weight:800; color:#fbef8a;
  text-align:center; margin-bottom:0.3rem;
}
#paywall-demo .pw-sub {
  text-align:center; color:rgba(255,255,255,0.5);
  font-size:0.82rem; margin-bottom:1.5rem;
}
#paywall-demo .plan-cards { display:flex; gap:0.85rem; margin-bottom:1.2rem; }
#paywall-demo .plan-card {
  flex:1; border-radius:12px; padding:1.1rem 0.9rem;
  border: 2px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  cursor:pointer; transition: border-color 0.2s, background 0.2s;
  text-align:center;
}
#paywall-demo .plan-card.selected {
  border-color: #7bcdab;
  background: rgba(123,205,171,0.1);
}
#paywall-demo .plan-name { font-weight:700; font-size:0.9rem; color:#fff; margin-bottom:0.3rem; }
#paywall-demo .plan-price { font-size:1.4rem; font-weight:800; color:#fbef8a; }
#paywall-demo .plan-period { font-size:0.7rem; color:rgba(255,255,255,0.4); }
#paywall-demo .plan-badge {
  display:inline-block; background:rgba(251,239,138,0.2); color:#fbef8a;
  border-radius:6px; padding:0.15rem 0.5rem; font-size:0.65rem; font-weight:700;
  margin-top:0.4rem;
}
#paywall-demo .pw-cta {
  width:100%; padding:0.9rem; font-size:1rem; font-weight:700;
  background:#7bcdab; color:#19191c; border:none; border-radius:10px;
  cursor:pointer; transition:opacity 0.2s;
}
#paywall-demo .pw-cta:hover { opacity:0.88; }
#paywall-demo .pw-restore {
  text-align:center; margin-top:0.7rem;
  font-size:0.75rem; color:rgba(255,255,255,0.3);
  cursor:pointer; text-decoration:underline;
}
#paywall-demo .pw-spinner {
  text-align:center; padding:1.2rem;
  display:none;
  font-size:1rem; color:rgba(255,255,255,0.6);
}
#paywall-demo .pw-success {
  text-align:center; padding:1.2rem;
  display:none;
}
</style>
<div class="pw-wrap">
  <div class="pw-title">Unlock Manga Kotoba Pro</div>
  <div class="pw-sub">Unlimited manga · Offline mode · Advanced stats</div>
  <div id="pw-main">
    <div class="plan-cards">
      <div class="plan-card" id="plan-monthly" onclick="selectPlan('monthly')">
        <div class="plan-name">Monthly</div>
        <div class="plan-price">$2.99</div>
        <div class="plan-period">per month</div>
      </div>
      <div class="plan-card selected" id="plan-yearly" onclick="selectPlan('yearly')">
        <div class="plan-name">Annual</div>
        <div class="plan-price">$19.99</div>
        <div class="plan-period">per year</div>
        <div class="plan-badge">Save 44%</div>
      </div>
    </div>
    <button class="pw-cta" onclick="startPurchase()">Start Free Trial</button>
    <div class="pw-restore" onclick="restorePurchases()">Restore Purchases</div>
  </div>
  <div class="pw-spinner" id="pw-spinner">⏳ Purchasing…</div>
  <div class="pw-success" id="pw-success">
    <div style="font-size:3rem;">🎉</div>
    <div style="font-size:1.2rem;font-weight:700;color:#7bcdab;margin:0.5rem 0;">You're Pro!</div>
    <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);">Enjoy unlimited manga vocabulary.</div>
    <button class="pw-cta" style="margin-top:1rem;max-width:200px;" onclick="resetPaywall()">Continue →</button>
  </div>
</div>
</div>

<script>
(function() {
  var selectedPlan = 'yearly';
  window.selectPlan = function(plan) {
    selectedPlan = plan;
    document.getElementById('plan-monthly').classList.toggle('selected', plan === 'monthly');
    document.getElementById('plan-yearly').classList.toggle('selected', plan === 'yearly');
  };
  window.startPurchase = function() {
    document.getElementById('pw-main').style.display = 'none';
    document.getElementById('pw-spinner').style.display = 'block';
    setTimeout(function() {
      document.getElementById('pw-spinner').style.display = 'none';
      document.getElementById('pw-success').style.display = 'block';
    }, 1800);
  };
  window.restorePurchases = function() {
    alert('No previous purchases found in this demo.');
  };
  window.resetPaywall = function() {
    document.getElementById('pw-success').style.display = 'none';
    document.getElementById('pw-spinner').style.display = 'none';
    document.getElementById('pw-main').style.display = 'block';
  };
})();
</script>

---

## 5. Onboarding Flow

{: class="marginalia" }
Apple's review team has gotten faster — average review time in 2025 is under 24 hours for most apps. But the first submission of a new app often takes 2-3 days as a human reviewer looks at it more carefully.

First-launch onboarding shows exactly once and then is dismissed forever. Five screens.

<div id="onboarding-demo" style="display:flex;flex-direction:column;align-items:center;margin:2rem 0;gap:1rem;">
<style>
#onboarding-demo .ob-shell {
  width:340px; background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.1); border-radius:20px;
  overflow:hidden;
}
#onboarding-demo .ob-screen {
  display:none; padding:1.8rem 1.5rem;
  min-height:360px; flex-direction:column;
  justify-content:space-between;
}
#onboarding-demo .ob-screen.active { display:flex; }
#onboarding-demo .ob-emoji { font-size:3rem; text-align:center; margin-bottom:0.5rem; }
#onboarding-demo .ob-heading { font-size:1.2rem; font-weight:800; color:#fbef8a; text-align:center; }
#onboarding-demo .ob-body { font-size:0.82rem; color:rgba(255,255,255,0.6); text-align:center; margin:0.5rem 0 1rem; }
#onboarding-demo .ob-nav { display:flex; justify-content:space-between; align-items:center; margin-top:auto; }
#onboarding-demo .ob-dots { display:flex; gap:6px; }
#onboarding-demo .ob-dot {
  width:8px;height:8px; border-radius:50%;
  background:rgba(255,255,255,0.2);
}
#onboarding-demo .ob-dot.active { background:#7bcdab; }
#onboarding-demo .manga-pick-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem; margin:0.5rem 0; }
#onboarding-demo .ob-manga-item {
  border-radius:10px; padding:0.6rem 0.3rem;
  background:rgba(255,255,255,0.05); border:1.5px solid rgba(255,255,255,0.08);
  text-align:center; cursor:pointer; transition:all 0.2s;
  font-size:0.7rem; color:rgba(255,255,255,0.6);
}
#onboarding-demo .ob-manga-item.picked { border-color:#7bcdab; background:rgba(123,205,171,0.15); color:#7bcdab; }
#onboarding-demo .ob-manga-item .ob-m-icon { font-size:1.5rem; }
#onboarding-demo .goal-slider { width:100%; accent-color:#7bcdab; margin:0.5rem 0; }
#onboarding-demo .goal-display {
  text-align:center; font-size:1.5rem; font-weight:800;
  color:#fbef8a; margin-bottom:0.2rem;
}
#onboarding-demo .goal-label { text-align:center; font-size:0.75rem; color:rgba(255,255,255,0.4); }
</style>
<div class="ob-shell">

  <!-- Screen 0: Welcome -->
  <div class="ob-screen active" id="ob-0">
    <div>
      <div class="ob-emoji">🇯🇵</div>
      <div class="ob-heading">Welcome to Manga Kotoba</div>
      <div class="ob-body">Learn Japanese vocabulary through the manga you already love. Real words, real context, real retention.</div>
    </div>
    <div class="ob-nav">
      <span style="font-size:0.75rem;color:rgba(255,255,255,0.3);">5 quick steps</span>
      <div class="ob-dots" id="ob-dots-0"></div>
      <button class="btn" onclick="obGo(1)" style="font-size:0.8rem;padding:0.4rem 1rem;">Next →</button>
    </div>
  </div>

  <!-- Screen 1: Pick manga -->
  <div class="ob-screen" id="ob-1">
    <div>
      <div class="ob-heading">Pick your manga</div>
      <div class="ob-body">Choose 3 titles to start with. You can add more later.</div>
      <div class="manga-pick-grid">
        <div class="ob-manga-item" onclick="toggleMangaPick(this)"><div class="ob-m-icon">⚔️</div>One Piece</div>
        <div class="ob-manga-item" onclick="toggleMangaPick(this)"><div class="ob-m-icon">🗡️</div>Demon Slayer</div>
        <div class="ob-manga-item" onclick="toggleMangaPick(this)"><div class="ob-m-icon">🍥</div>Naruto</div>
        <div class="ob-manga-item" onclick="toggleMangaPick(this)"><div class="ob-m-icon">💥</div>My Hero Academia</div>
        <div class="ob-manga-item" onclick="toggleMangaPick(this)"><div class="ob-m-icon">🏋️</div>Berserk</div>
        <div class="ob-manga-item" onclick="toggleMangaPick(this)"><div class="ob-m-icon">🎓</div>Spy x Family</div>
      </div>
    </div>
    <div class="ob-nav">
      <button class="btn-outline" onclick="obGo(0)" style="font-size:0.8rem;padding:0.4rem 0.9rem;">← Back</button>
      <div class="ob-dots" id="ob-dots-1"></div>
      <button class="btn" onclick="obGo(2)" style="font-size:0.8rem;padding:0.4rem 1rem;">Next →</button>
    </div>
  </div>

  <!-- Screen 2: Daily goal -->
  <div class="ob-screen" id="ob-2">
    <div>
      <div class="ob-heading">Daily goal</div>
      <div class="ob-body">How many words per day? Consistency beats intensity.</div>
      <div class="goal-display" id="ob-goal-num">10</div>
      <div class="goal-label">words per day</div>
      <input type="range" class="goal-slider" min="1" max="5" value="2"
        oninput="updateGoal(this.value)" id="ob-goal-slider">
      <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:rgba(255,255,255,0.3);">
        <span>5</span><span>10</span><span>15</span><span>20</span><span>30</span>
      </div>
    </div>
    <div class="ob-nav">
      <button class="btn-outline" onclick="obGo(1)" style="font-size:0.8rem;padding:0.4rem 0.9rem;">← Back</button>
      <div class="ob-dots" id="ob-dots-2"></div>
      <button class="btn" onclick="obGo(3)" style="font-size:0.8rem;padding:0.4rem 1rem;">Next →</button>
    </div>
  </div>

  <!-- Screen 3: Notifications -->
  <div class="ob-screen" id="ob-3">
    <div>
      <div class="ob-emoji">🔔</div>
      <div class="ob-heading">Stay on track</div>
      <div class="ob-body">Enable daily reminders to keep your streak alive. We'll only ping you once a day.</div>
      <div style="display:flex;justify-content:center;margin-top:1rem;">
        <div class="mk5-toggle" id="ob-notif-tog" onclick="this.classList.toggle('on')"></div>
      </div>
    </div>
    <div class="ob-nav">
      <button class="btn-outline" onclick="obGo(2)" style="font-size:0.8rem;padding:0.4rem 0.9rem;">← Back</button>
      <div class="ob-dots" id="ob-dots-3"></div>
      <button class="btn" onclick="obGo(4)" style="font-size:0.8rem;padding:0.4rem 1rem;">Next →</button>
    </div>
  </div>

  <!-- Screen 4: Ready -->
  <div class="ob-screen" id="ob-4">
    <div>
      <div class="ob-emoji">🚀</div>
      <div class="ob-heading">You're ready!</div>
      <div class="ob-body" id="ob-ready-text">Your journey to reading manga in Japanese starts now.</div>
    </div>
    <div class="ob-nav">
      <button class="btn-outline" onclick="obGo(3)" style="font-size:0.8rem;padding:0.4rem 0.9rem;">← Back</button>
      <div class="ob-dots" id="ob-dots-4"></div>
      <button class="btn" onclick="obGo(0)" style="font-size:0.8rem;padding:0.4rem 1rem;">Start →</button>
    </div>
  </div>

</div>
</div>

<script>
(function() {
  var goalValues = [5, 10, 15, 20, 30];
  window.obGo = function(idx) {
    for (var i = 0; i < 5; i++) {
      var s = document.getElementById('ob-' + i);
      if (s) s.classList.toggle('active', i === idx);
      var d = document.getElementById('ob-dots-' + i);
      if (d) {
        d.innerHTML = '';
        for (var j = 0; j < 5; j++) {
          var dot = document.createElement('div');
          dot.className = 'ob-dot' + (j === idx ? ' active' : '');
          d.appendChild(dot);
        }
      }
    }
  };
  // init dots
  for (var i = 0; i < 5; i++) {
    var d = document.getElementById('ob-dots-' + i);
    if (d) {
      d.innerHTML = '';
      for (var j = 0; j < 5; j++) {
        var dot = document.createElement('div');
        dot.className = 'ob-dot' + (j === 0 ? ' active' : '');
        d.appendChild(dot);
      }
    }
  }
  window.toggleMangaPick = function(el) { el.classList.toggle('picked'); };
  window.updateGoal = function(v) {
    var val = goalValues[parseInt(v) - 1] || 10;
    document.getElementById('ob-goal-num').textContent = val;
    document.getElementById('ob-ready-text').textContent =
      'Goal set: ' + val + ' words per day. Your Japanese journey starts now!';
  };
})();
</script>

The SwiftUI implementation uses a `PageTabViewStyle` inside a `TabView`, which gives us the swipe-between-pages animation for free:

<pre class="code-block"><span class="ty">TabView</span>(selection: $onboardingPage) {
    <span class="ty">WelcomeView</span>().tag(<span class="nu">0</span>)
    <span class="ty">MangaPickerView</span>().tag(<span class="nu">1</span>)
    <span class="ty">DailyGoalView</span>().tag(<span class="nu">2</span>)
    <span class="ty">NotificationsView</span>().tag(<span class="nu">3</span>)
    <span class="ty">ReadyView</span>().tag(<span class="nu">4</span>)
}
.<span class="fn">tabViewStyle</span>(.<span class="fn">page</span>(indexDisplayMode: .never))
.<span class="fn">fullScreenCover</span>(isPresented: $showOnboarding) { ... }</pre>

The `showOnboarding` flag is stored in `@AppStorage("hasCompletedOnboarding")` — it defaults to `false` on first launch and is set to `true` when the user taps "Start".

---

## 6. App Store Submission Horror Stories

The app was ready in early April. Submission was… not clean.

### Rejection 1: Missing NSCameraUsageDescription

<div class="card">
  <strong style="color:#f97583;">Rejection reason:</strong> "This app requires access to the camera. Please provide a usage description in your Info.plist."<br><br>
  <strong>The problem:</strong> We don't use the camera. But our Symfony API was serving an image picker component that referenced <code>AVFoundation</code> indirectly through a library. The iOS app's Swift Package dependency graph pulled in a package that declared a camera capability in its own Info.plist fragment, which Apple's binary analysis flagged.<br><br>
  <strong>The fix:</strong> Added <code>NSCameraUsageDescription</code> with "This app does not use the camera. This key is required by an indirect dependency." Resubmitted. Approved.
</div>

### Rejection 2: "App Does Not Function As Advertised"

<div class="card">
  <strong style="color:#f97583;">Rejection reason:</strong> "We were unable to sign in with the credentials provided. The app appears to require a valid account to access its core functionality."<br><br>
  <strong>The problem:</strong> We'd been developing against staging (api-staging.mangakotoba.io) and shipped the production binary (api.mangakotoba.io). The test account credentials in the submission notes were for the staging environment. The reviewer tried to log in to production with a staging-only account. It failed.<br><br>
  <strong>The fix:</strong> Created a dedicated App Review account on production, updated submission notes with the new credentials, triple-checked. Resubmitted.
</div>

### The 3-Day Human Review Wait

After automated checks passed (usually ~30 minutes), we sat in "Waiting for Review" for 68 hours before a human looked at it. This is normal for first-time app submissions. After that initial friction, subsequent updates reviewed in under 8 hours.

### Rejection 3: Screenshot Metadata Mismatch

<div class="card">
  <strong style="color:#f97583;">Rejection reason (metadata, not binary):</strong> "Your screenshots do not accurately represent the app's current UI."<br><br>
  The screenshots were from a design mockup created two sprints before the final UI. The paywall screen in the screenshots had a "Start 7-day Free Trial" button; the actual app shipped with "Start Free Trial" (we removed the 7-day duration wording after legal review). One reviewer noticed.<br><br>
  <strong>The fix:</strong> Re-shot all screenshots with Xcode Simulator on iPhone 15 Pro, uploaded, resubmitted metadata only (no binary needed).
</div>

### Lessons Learned

- **Test App Review accounts on production before submitting.** This is obvious in retrospect.
- **Audit your dependency tree** for privacy manifest keys. Even if *your* code doesn't use a capability, your dependencies might declare one.
- **Screenshots should be taken from the final binary**, not mockups. Automate this if you can (Fastlane's `snapshot` tool).
- **Metadata changes don't require binary resubmission**, but they still go through review. Budget time.
- **Keep an App Store rejection log.** It becomes an invaluable reference for the next app.

---

## 7. "Would I Do It Again?" Retrospective

{: class="marginalia" }
The App Store takes a 30% cut (15% for small developers under $1M/year revenue via the Small Business Program). For a $2.99/month subscription, you net ~$2.09 after Apple's cut.

<div id="retro-widget" style="max-width:560px;margin:2rem auto;">
<style>
#retro-widget .timeline {
  border-left: 2px solid rgba(255,255,255,0.1);
  padding-left: 1.2rem;
  margin-bottom: 1.5rem;
}
#retro-widget .tl-item {
  margin-bottom: 1rem; position: relative;
}
#retro-widget .tl-item::before {
  content: '';
  position: absolute; left: -1.55rem; top: 5px;
  width: 10px; height: 10px; border-radius: 50%;
  background: #7bcdab; border: 2px solid #19191c;
}
#retro-widget .tl-part { font-size:0.8rem; font-weight:700; color:#fbef8a; }
#retro-widget .tl-desc { font-size:0.78rem; color:rgba(255,255,255,0.5); }
#retro-widget .mood-row {
  display:flex; align-items:center; gap:0.8rem; margin:1rem 0;
}
#retro-widget .mood-label { font-size:0.75rem; color:rgba(255,255,255,0.4); flex-shrink:0; }
#retro-widget .mood-slider { flex:1; accent-color:#7bcdab; }
#retro-widget .retro-quote {
  background: rgba(123,205,171,0.08);
  border-left: 3px solid #7bcdab;
  border-radius: 0 10px 10px 0;
  padding: 1rem 1.2rem;
  font-size: 0.88rem;
  color: rgba(255,255,255,0.75);
  font-style: italic;
  min-height: 60px;
  transition: opacity 0.3s;
}
</style>

<div class="timeline">
  <div class="tl-item">
    <div class="tl-part">Part 1 — Architecture</div>
    <div class="tl-desc">🏗️ Chose SwiftUI + Symfony 7 + API Platform. Built the vocabulary extraction pipeline.</div>
  </div>
  <div class="tl-item">
    <div class="tl-part">Part 2 — API</div>
    <div class="tl-desc">🔌 JWT auth, API Platform resources, custom state processors, OpenAPI docs.</div>
  </div>
  <div class="tl-item">
    <div class="tl-part">Part 3 — SwiftUI Core</div>
    <div class="tl-desc">📱 NavigationStack, async data layer, first VocabCard. The app became real.</div>
  </div>
  <div class="tl-item">
    <div class="tl-part">Part 4 — Production</div>
    <div class="tl-desc">🚀 Heroku + RDS, staging environment, SM-2 spaced repetition engine.</div>
  </div>
  <div class="tl-item">
    <div class="tl-part">Part 5 — Shipped</div>
    <div class="tl-desc">🎉 StoreKit 2, onboarding, polish, 3 rejections, and finally: live on the App Store.</div>
  </div>
</div>

<div style="font-size:0.85rem;font-weight:700;color:#fbef8a;margin-bottom:0.5rem;">How do I feel about building this?</div>
<div class="mood-row">
  <div class="mood-label">😩 Never again</div>
  <input type="range" class="mood-slider" min="1" max="5" value="4" oninput="updateMood(this.value)" id="mood-slider">
  <div class="mood-label">🚀 Absolutely</div>
</div>

<div class="retro-quote" id="retro-quote">
  Worth it — but I'd do it differently. The Symfony backend with API Platform was the right call: the OpenAPI docs alone saved me hours of debugging the Swift HTTP layer. I'd keep it. For the iOS side, I'm proud of the SwiftUI architecture, but I underestimated how much Apple-specific ceremony (provisioning, App Store Connect, review) would dominate the last 20% of development time. Next time I'd budget two weeks just for that.
</div>
</div>

<script>
(function() {
  var quotes = [
    "Never again. The App Store review process alone nearly broke me. Next time it's a web app.",
    "Probably not. Too much time spent fighting iOS tooling. The actual product was fun to build — the shipping was not.",
    "Maybe. With the right scope. I spent too long on infrastructure and not enough on the thing users actually care about. Smaller MVP next time.",
    "Worth it — but I'd do it differently. The Symfony backend with API Platform was the right call: the OpenAPI docs alone saved me hours of debugging the Swift HTTP layer. I'd keep it. For the iOS side, I'm proud of the SwiftUI architecture, but I underestimated how much Apple-specific ceremony (provisioning, App Store Connect, review) would dominate the last 20% of development time. Next time I'd budget two weeks just for that.",
    "Absolutely and immediately. Shipping a real app — with real users, real payments, real feedback — teaches you things no tutorial can. SwiftUI is genuinely delightful to write once you have the mental model. Symfony 7 + API Platform is a superb backend stack. I'd do this again in a heartbeat."
  ];
  window.updateMood = function(v) {
    var q = document.getElementById('retro-quote');
    q.style.opacity = '0';
    setTimeout(function() {
      q.textContent = quotes[parseInt(v) - 1];
      q.style.opacity = '1';
    }, 200);
  };
})();
</script>

### What I'm Proud Of

- **The vocabulary extraction pipeline** — parsing manga pages, normalising Japanese text, linking to JLPT word lists, and surfacing the most useful vocabulary per chapter. This is the product's actual moat.
- **The SwiftUI architecture** — clean separation between `View`, `ViewModel`, and the async `APIClient`. Easy to test, easy to extend.
- **Actually shipping.** 95% of side projects don't make it to the App Store. This one did.

### What I'd Change

- **Earlier monetisation thinking.** StoreKit integration came in at the very end. It would have been easier to design the feature gates earlier in the codebase.
- **Expo/React Native instead of SwiftUI?** Considered it. Decided against it for the "real native" experience. I don't regret it, but for a solo developer who needs Android too, RN is worth the trade-off.
- **Keep Symfony?** Yes, without question. The API Platform overhead is real — writing resource classes and state processors feels verbose at first — but the auto-generated OpenAPI docs and the Symfony ecosystem (Messenger, Doctrine, the security system) were worth every line.

---

## 8. What's Next

<div class="card">
  <ul style="margin:0;">
    <li><strong style="color:#7bcdab;">Android version</strong> — The backend is already there. The question is native Kotlin vs React Native. Leaning React Native for speed.</li>
    <li><strong style="color:#7bcdab;">More manga</strong> — The current pipeline requires manual QA per manga. A self-serve submission form (or a web scraping pipeline with human review) would scale this to hundreds of titles.</li>
    <li><strong style="color:#7bcdab;">Community features</strong> — Shared word lists, user annotations, "this word appeared in chapter 47 of X" context links.</li>
    <li><strong style="color:#7bcdab;">Open-sourcing the backend</strong> — The vocabulary engine and API layer are reasonably generic. Considering it under MIT once the business model is validated.</li>
    <li><strong style="color:#7bcdab;">Sentence mining mode</strong> — Anki-style sentence cards generated automatically from manga panels, with audio via a TTS API.</li>
  </ul>
</div>

---

<p style="text-align:center;color:rgba(255,255,255,0.35);font-size:0.85rem;margin-top:2rem;">
  Thanks for following along through all five parts. If you built something with this series, I'd love to hear about it —
  <a href="https://twitter.com/malukenho" style="color:#7bcdab;">@malukenho</a> on Twitter/X.
</p>

<div class="series-nav" style="justify-content:center;margin-top:1.5rem;">
  <a href="/post/2025/10/01/manga-kotoba-part-1.html">Part 1</a>
  <a href="/post/2025/11/15/manga-kotoba-part-2.html">Part 2</a>
  <a href="/post/2026/01/10/manga-kotoba-part-3.html">Part 3</a>
  <a href="/post/2026/03/01/manga-kotoba-part-4.html">Part 4</a>
  <a href="#" class="active">Part 5 ✓</a>
</div>

</div>
