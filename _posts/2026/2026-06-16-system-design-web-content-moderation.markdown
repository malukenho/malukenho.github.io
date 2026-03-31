---
layout: post
title: "System Design: Content Moderation Pipeline — Keeping Platforms Safe at Scale"
date: 2026-06-16 10:00:00 +0000
categories: ["post"]
tags: [system-design, moderation, ml, async-pipeline, kafka, trust-safety, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios
</div>

{: class="marginalia" }
Facebook's content<br/>moderation workforce<br/>is largely contracted —<br/>~15,000 contractors<br/>worldwide. These<br/>reviewers are exposed<br/>to the worst content<br/>daily. The psychological<br/>toll is severe; multiple<br/>lawsuits have been<br/>filed by traumatized<br/>moderators.

Design the content moderation system for a social media platform with **1 billion posts per day**. The system must detect: spam, hate speech, nudity, violence, misinformation, and copyright violations. Balance speed (don't make users wait), accuracy (minimize false positives on legitimate content), and scale.

**The question:** *Design a content moderation pipeline for a platform processing 1 billion posts per day. Detect spam, hate speech, NSFW content, violence, misinformation, and CSAM. Balance latency, accuracy, and scale. How do you handle false positives? What happens when ML is uncertain?*

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
.viz-btn.run { background:#7bcdab;color:#19191c;border:none;border-radius:8px;font-weight:700;padding:.5rem 1.2rem;cursor:pointer; }
.viz-btn.run:hover { background:#5eb896; }

.pipe-flow { display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin:1.2rem 0; }
.pipe-node { background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.55rem .9rem;font-size:.78rem;color:rgba(255,255,255,.8);text-align:center;min-width:80px;transition:all .4s; }
.pipe-node.lit { border-color:#7bcdab;background:#1a2e22;color:#7bcdab;box-shadow:0 0 12px rgba(123,205,171,.25); }
.pipe-node.lit-warn { border-color:#fbef8a;background:#25240e;color:#fbef8a;box-shadow:0 0 12px rgba(251,239,138,.2); }
.pipe-node.lit-bad  { border-color:#f08080;background:#2a1616;color:#f08080;box-shadow:0 0 12px rgba(240,128,128,.2); }
.pipe-node.kafka { border-color:#fbef8a;background:#25240e;color:#fbef8a; }
.pipe-arrow { color:rgba(255,255,255,.22);font-size:.9rem;flex-shrink:0; }

.score-bar-wrap { margin:.3rem 0; }
.score-bar-label { font-size:.75rem;color:rgba(255,255,255,.55);display:flex;justify-content:space-between;margin-bottom:3px; }
.score-bar-track { height:8px;background:#1e1f24;border-radius:4px;overflow:hidden; }
.score-bar-fill  { height:100%;border-radius:4px;transition:width .7s ease; }
.score-bar-fill.green  { background:#7bcdab; }
.score-bar-fill.yellow { background:#fbef8a; }
.score-bar-fill.red    { background:#f08080; }

.decision-box { border-radius:8px;padding:.8rem 1rem;margin:.8rem 0;font-size:.82rem;font-weight:700;text-align:center;display:none; }
.decision-box.show { display:block; }
.decision-published { background:#1a2e22;border:1px solid #7bcdab;color:#7bcdab; }
.decision-review    { background:#25240e;border:1px solid #fbef8a;color:#fbef8a; }
.decision-removed   { background:#2a1616;border:1px solid #f08080;color:#f08080; }

.queue-item { background:#1a1b1f;border:1px solid #2e2f35;border-radius:10px;padding:1rem 1.1rem;margin:.5rem 0;display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;transition:all .4s; }
.queue-item.removed { opacity:0;transform:translateX(40px); }
.queue-item.approved { opacity:0;transform:translateX(-40px); }
.queue-score { font-family:"JetBrains Mono","Fira Code",monospace;font-size:1.05rem;font-weight:700;min-width:42px;text-align:center; }
.queue-score.hi  { color:#f08080; }
.queue-score.mid { color:#fbef8a; }
.queue-score.lo  { color:#7bcdab; }
.queue-content { flex:1;min-width:0; }
.queue-text { font-size:.83rem;color:rgba(255,255,255,.8);margin-bottom:.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.queue-meta  { font-size:.72rem;color:rgba(255,255,255,.38); }
.queue-actions { display:flex;gap:.4rem;flex-shrink:0; }
.q-btn { padding:5px 12px;border-radius:6px;font-size:.78rem;cursor:pointer;font-family:inherit;font-weight:600;transition:all .2s; }
.q-btn.approve  { background:#1a2e22;border:1px solid #7bcdab;color:#7bcdab; }
.q-btn.approve:hover  { background:#7bcdab;color:#19191c; }
.q-btn.remove   { background:#2a1616;border:1px solid #f08080;color:#f08080; }
.q-btn.remove:hover   { background:#f08080;color:#19191c; }
.q-btn.escalate { background:#0e1e2e;border:1px solid #89c0d0;color:#89c0d0; }
.q-btn.escalate:hover { background:#89c0d0;color:#19191c; }

.feedback-chip { display:inline-flex;align-items:center;gap:.3rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:3px 10px;font-size:.72rem;color:rgba(255,255,255,.5);margin:.2rem .1rem;transition:all .3s; }
.feedback-chip.fired { border-color:#7bcdab;color:#7bcdab;background:#1a2e22; }

.arch-tier { background:#1a1b1f;border:1px solid #2e2f35;border-radius:10px;padding:1rem 1.1rem;margin:.5rem 0; }
.arch-tier-label { font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:.4rem; }
.arch-tier-title { font-size:.9rem;font-weight:700;margin-bottom:.3rem; }
.arch-tier-desc  { font-size:.8rem;color:rgba(255,255,255,.6);line-height:1.6; }
.tier-fast  { border-color:rgba(123,205,171,.3); }
.tier-fast .arch-tier-title  { color:#7bcdab; }
.tier-slow  { border-color:rgba(251,239,138,.3); }
.tier-slow .arch-tier-title  { color:#fbef8a; }
.tier-human { border-color:rgba(137,192,208,.3); }
.tier-human .arch-tier-title { color:#89c0d0; }
</style>

## 1. The Moderation Challenge

Three goals are perpetually in tension:

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin:1.5rem 0;">
  <div class="arch-tier tier-fast">
    <div class="arch-tier-label">Goal 1</div>
    <div class="arch-tier-title">&#9889; Speed</div>
    <div class="arch-tier-desc">Content should be visible immediately or within seconds. Users who post and see their content disappear into a "pending" void will churn. Latency = lost engagement.</div>
  </div>
  <div class="arch-tier tier-slow">
    <div class="arch-tier-label">Goal 2</div>
    <div class="arch-tier-title">&#128737; Safety</div>
    <div class="arch-tier-desc">Harmful content must not reach users. CSAM, terrorist recruitment, coordinated harassment — these cause real-world harm and legal liability if the platform is slow to act.</div>
  </div>
  <div class="arch-tier tier-human">
    <div class="arch-tier-label">Goal 3</div>
    <div class="arch-tier-title">&#9878; Fairness</div>
    <div class="arch-tier-desc">Legitimate content must not be suppressed. False positives silence users, especially marginalized communities whose speech patterns differ from the training majority.</div>
  </div>
</div>

These can't all be maximized simultaneously. Design choices reflect platform values — and those values have consequences.

---

## 2. Scale &amp; Numbers First

<div class="stat-grid">
  <div class="stat-card"><span class="stat-num">1B</span><div class="stat-lbl">Posts / day</div></div>
  <div class="stat-card"><span class="stat-num">~12K</span><div class="stat-lbl">Posts / sec (avg)</div></div>
  <div class="stat-card"><span class="stat-num">~50K</span><div class="stat-lbl">Posts / sec (peak)</div></div>
  <div class="stat-card"><span class="stat-num">~10M</span><div class="stat-lbl">Human review / day</div></div>
  <div class="stat-card"><span class="stat-num">~10K</span><div class="stat-lbl">Human reviewers</div></div>
  <div class="stat-card"><span class="stat-num">&lt; 500ms</span><div class="stat-lbl">Fast-path SLA</div></div>
</div>

Key insight: at 12,000 posts per second, every millisecond of ML inference latency × 12,000 = GPU-seconds consumed. The architecture must be ruthlessly efficient.

---

## 3. Content Types and Their Pipelines

Different content types require fundamentally different detection approaches:

<table class="comp-table">
  <thead>
    <tr><th>Content Type</th><th>Detection Method</th><th>Latency</th><th>Categories</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Text posts</strong></td>
      <td>BERT toxicity classifier, keyword blocklist, n-gram spam detector</td>
      <td><span class="badge badge-green">50–100ms</span></td>
      <td>Hate speech, spam, threats, misinformation triggers</td>
    </tr>
    <tr>
      <td><strong>Images</strong></td>
      <td>CNN NSFW classifier, PhotoDNA hash lookup, object detection</td>
      <td><span class="badge badge-yellow">80–200ms</span></td>
      <td>Nudity, CSAM, violence, graphic gore</td>
    </tr>
    <tr>
      <td><strong>Videos</strong></td>
      <td>Frame-sampled image analysis + audio transcription → text pipeline</td>
      <td><span class="badge badge-red">500ms–5s</span></td>
      <td>All image categories + audio-based hate speech</td>
    </tr>
    <tr>
      <td><strong>URLs</strong></td>
      <td>Domain reputation DB, phishing ML, SSRF-safe crawler for content</td>
      <td><span class="badge badge-green">10–50ms</span></td>
      <td>Phishing, malware, misinformation domains, copyright</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-yellow">
<strong>Interview trap:</strong> Many candidates describe a single "content moderation model." The real answer is a <em>portfolio</em> of specialized detectors — each tuned for its modality — running in parallel, whose outputs are combined by a decision engine.
</div>

---

## 4. Level 1 — Rule-Based (Fast, Dumb)

The first line of defense: pure keyword/hash matching.

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">RuleBasedFilter</span>:
    <span class="kw">def</span> <span class="fn">__init__</span>(<span class="kw">self</span>):
        <span class="cm"># Exact keyword blocklist — compiled to a trie for O(n) scan</span>
        <span class="kw">self</span>.blocklist <span class="op">=</span> <span class="ty">TrieSet</span>(<span class="fn">load_blocklist</span>())
        <span class="cm"># Known-bad URL hashes (MD5 of normalized domain)</span>
        <span class="kw">self</span>.url_hashes <span class="op">=</span> <span class="ty">BloomFilter</span>(<span class="fn">load_bad_domains</span>())

    <span class="kw">def</span> <span class="fn">check</span>(<span class="kw">self</span>, post):
        <span class="cm"># Fast path: exact-match keyword in text</span>
        <span class="kw">for</span> token <span class="kw">in</span> post.<span class="fn">tokenize</span>():
            <span class="kw">if</span> token <span class="kw">in</span> <span class="kw">self</span>.blocklist:
                <span class="kw">return</span> <span class="ty">Decision</span>(action<span class="op">=</span><span class="st">'REMOVE'</span>, reason<span class="op">=</span><span class="st">'blocklist_match'</span>, score<span class="op">=</span><span class="nu">1.0</span>)

        <span class="cm"># Fast path: URL domain in known-bad bloom filter</span>
        <span class="kw">for</span> url <span class="kw">in</span> post.<span class="fn">extract_urls</span>():
            <span class="kw">if</span> <span class="fn">domain_hash</span>(url) <span class="kw">in</span> <span class="kw">self</span>.url_hashes:
                <span class="kw">return</span> <span class="ty">Decision</span>(action<span class="op">=</span><span class="st">'REMOVE'</span>, reason<span class="op">=</span><span class="st">'bad_url'</span>, score<span class="op">=</span><span class="nu">1.0</span>)

        <span class="kw">return</span> <span class="ty">Decision</span>(action<span class="op">=</span><span class="st">'PASS'</span>, score<span class="op">=</span><span class="nu">0.0</span>)</pre>
</div>

**Properties:**
- **Fast:** O(n) text scan with a trie, &lt; 1ms per post
- **Deterministic:** same input always same output — easy to audit
- **Brittle:** "gun" in "begun" is a false positive; "g.u.n" bypasses it entirely
- **Use only as first-pass pre-filter.** Never as the sole line of defense.

---

## 5. Level 2 — ML Classifiers

Trained models for each content category, running in parallel:

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> asyncio

<span class="kw">async def</span> <span class="fn">run_ml_classifiers</span>(post):
    <span class="cm"># All classifiers run concurrently — total latency = max(individual latencies)</span>
    results <span class="op">=</span> <span class="kw">await</span> asyncio.<span class="fn">gather</span>(
        <span class="fn">text_toxicity_score</span>(post.text),       <span class="cm"># BERT: 50–80ms</span>
        <span class="fn">spam_score</span>(post),                    <span class="cm"># Gradient boosted trees: 5ms</span>
        <span class="fn">image_nsfw_score</span>(post.image),         <span class="cm"># ResNet: 80–150ms</span>
        <span class="fn">url_reputation_score</span>(post.urls),      <span class="cm"># Lookup table: 5ms</span>
        <span class="fn">photo_dna_hash_check</span>(post.image),     <span class="cm"># Hash lookup: &lt;1ms</span>
        return_exceptions<span class="op">=</span><span class="kw">True</span>
    )
    <span class="kw">return</span> {
        <span class="st">'toxicity'</span>:  results[<span class="nu">0</span>],
        <span class="st">'spam'</span>:      results[<span class="nu">1</span>],
        <span class="st">'nsfw'</span>:      results[<span class="nu">2</span>],
        <span class="st">'url'</span>:       results[<span class="nu">3</span>],
        <span class="st">'csam_hash'</span>: results[<span class="nu">4</span>],
    }

<span class="kw">def</span> <span class="fn">decide</span>(scores):
    <span class="cm"># CSAM: zero tolerance — hash match = immediate removal</span>
    <span class="kw">if</span> scores[<span class="st">'csam_hash'</span>]:
        <span class="kw">return</span> <span class="st">'REMOVE'</span>, <span class="nu">1.0</span>

    <span class="cm"># Any high-confidence signal = auto-remove</span>
    max_score <span class="op">=</span> <span class="fn">max</span>(scores[<span class="st">'toxicity'</span>], scores[<span class="st">'spam'</span>], scores[<span class="st">'nsfw'</span>], scores[<span class="st">'url'</span>])
    <span class="kw">if</span> max_score <span class="op">&gt;</span> <span class="nu">0.85</span>:
        <span class="kw">return</span> <span class="st">'REMOVE'</span>, max_score

    <span class="cm"># Uncertain: route to human review queue</span>
    <span class="kw">if</span> max_score <span class="op">&gt;</span> <span class="nu">0.40</span>:
        <span class="kw">return</span> <span class="st">'REVIEW'</span>, max_score

    <span class="cm"># Below threshold: publish</span>
    <span class="kw">return</span> <span class="st">'PUBLISH'</span>, max_score</pre>
</div>

**Classifier properties:**

<table class="comp-table">
  <thead>
    <tr><th>Model</th><th>Architecture</th><th>Latency</th><th>Accuracy</th></tr>
  </thead>
  <tbody>
    <tr><td>Text toxicity</td><td>BERT-base fine-tuned</td><td>50–80ms (GPU)</td><td>~94% F1</td></tr>
    <tr><td>Image NSFW</td><td>ResNet-50 / EfficientNet</td><td>80–150ms (GPU)</td><td>~97% F1</td></tr>
    <tr><td>Spam detector</td><td>Gradient boosted trees (XGBoost)</td><td>3–8ms (CPU)</td><td>~99% F1</td></tr>
    <tr><td>URL reputation</td><td>Hash lookup + ML on domain features</td><td>5–20ms</td><td>~98% F1</td></tr>
    <tr><td>PhotoDNA CSAM</td><td>Perceptual hash matching</td><td>&lt;1ms</td><td>Near-zero false positives</td></tr>
  </tbody>
</table>

---

## 6. The Moderation Pipeline Architecture

### Interactive: Pipeline Visualizer

<div class="viz-wrap">
  <div class="viz-title">&#9654; Content Moderation Pipeline — run a post through the system</div>
  <div class="viz-controls">
    <button class="viz-btn" id="ex-normal" onclick="selectExample('normal')">&#127859; Normal cooking post</button>
    <button class="viz-btn" id="ex-spam" onclick="selectExample('spam')">&#128444; Spam with suspicious URL</button>
    <button class="viz-btn" id="ex-borderline" onclick="selectExample('borderline')">&#9888; Borderline content (0.6 score)</button>
  </div>

  <div id="example-text" style="background:#1e1f24;border-radius:8px;padding:.8rem 1rem;font-size:.85rem;color:rgba(255,255,255,.75);margin-bottom:1rem;min-height:40px;line-height:1.6;">
    Select an example above to run it through the pipeline.
  </div>

  <button class="viz-btn run" id="run-btn" onclick="runPipeline()" style="display:none;margin-bottom:1rem;">&#9654; Run through pipeline</button>

  <div class="pipe-flow" id="pipe-flow" style="display:none;">
    <div class="pipe-node" id="pn-submit">Content<br/>Submitted</div>
    <div class="pipe-arrow">&#8594;</div>
    <div class="pipe-node kafka" id="pn-kafka">Kafka<br/>Topic</div>
    <div class="pipe-arrow">&#8594;</div>
    <div class="pipe-node" id="pn-rule">Rule<br/>Filter</div>
    <div class="pipe-arrow">&#8594;</div>
    <div style="display:flex;flex-direction:column;gap:.3rem;">
      <div class="pipe-node" id="pn-text">Text<br/>ML</div>
      <div class="pipe-node" id="pn-image">Image<br/>ML</div>
      <div class="pipe-node" id="pn-url">URL<br/>Check</div>
    </div>
    <div class="pipe-arrow">&#8594;</div>
    <div class="pipe-node" id="pn-decision">Decision<br/>Engine</div>
    <div class="pipe-arrow">&#8594;</div>
    <div class="pipe-node" id="pn-output">&#8203;</div>
  </div>

  <div id="scores-area" style="display:none;margin-top:1rem;">
    <div style="font-size:.75rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.6rem;">ML Confidence Scores</div>
    <div class="score-bar-wrap">
      <div class="score-bar-label"><span>Toxicity</span><span id="sc-tox">0.00</span></div>
      <div class="score-bar-track"><div class="score-bar-fill green" id="sb-tox" style="width:0%"></div></div>
    </div>
    <div class="score-bar-wrap" style="margin-top:.5rem;">
      <div class="score-bar-label"><span>Spam</span><span id="sc-spam">0.00</span></div>
      <div class="score-bar-track"><div class="score-bar-fill green" id="sb-spam" style="width:0%"></div></div>
    </div>
    <div class="score-bar-wrap" style="margin-top:.5rem;">
      <div class="score-bar-label"><span>NSFW</span><span id="sc-nsfw">0.00</span></div>
      <div class="score-bar-track"><div class="score-bar-fill green" id="sb-nsfw" style="width:0%"></div></div>
    </div>
    <div class="score-bar-wrap" style="margin-top:.5rem;">
      <div class="score-bar-label"><span>URL Risk</span><span id="sc-url">0.00</span></div>
      <div class="score-bar-track"><div class="score-bar-fill green" id="sb-url" style="width:0%"></div></div>
    </div>
  </div>

  <div id="decision-area"></div>
</div>

<script>
(function() {
  var examples = {
    normal: {
      text: '"Just made the most incredible homemade pasta carbonara \u2014 recipe in comments! \ud83c\udf5d\ud83e\udd73"',
      scores: { tox: 0.02, spam: 0.04, nsfw: 0.01, url: 0.00 },
      decision: 'PUBLISHED',
      decisionClass: 'decision-published',
      decisionText: '\u2705 Published immediately \u2014 all scores below threshold (max: 0.04)'
    },
    spam: {
      text: '"LIMITED TIME! Click NOW: http://c1ick-b4it.xyz/fr33-iph0ne \u2014 you won a prize!!! Share with 10 friends"',
      scores: { tox: 0.12, spam: 0.97, nsfw: 0.03, url: 0.94 },
      decision: 'AUTO-REMOVED',
      decisionClass: 'decision-removed',
      decisionText: '\u274c Auto-removed \u2014 URL reputation: 0.94, Spam score: 0.97 (both above 0.85 threshold)'
    },
    borderline: {
      text: '"Some people should just disappear from the internet, honestly. You know who you are."',
      scores: { tox: 0.61, spam: 0.05, nsfw: 0.02, url: 0.00 },
      decision: 'HUMAN REVIEW',
      decisionClass: 'decision-review',
      decisionText: '\u26a0\ufe0f Sent to human review queue \u2014 toxicity score 0.61 is in uncertain range (0.40\u20130.85)'
    }
  };

  var selected = null;

  window.selectExample = function(key) {
    selected = key;
    ['normal','spam','borderline'].forEach(function(k) {
      document.getElementById('ex-' + k).classList.remove('active');
    });
    document.getElementById('ex-' + key).classList.add('active');
    document.getElementById('example-text').textContent = examples[key].text;
    document.getElementById('run-btn').style.display = 'inline-block';
    document.getElementById('pipe-flow').style.display = 'none';
    document.getElementById('scores-area').style.display = 'none';
    document.getElementById('decision-area').innerHTML = '';
    resetNodes();
  };

  function resetNodes() {
    ['pn-submit','pn-kafka','pn-rule','pn-text','pn-image','pn-url','pn-decision','pn-output'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.className = el.className.replace(/ lit[^\s]*/g, '').replace(/ kafka[^\s]*/g, ''); }
    });
    document.getElementById('pn-kafka').className = 'pipe-node kafka';
    document.getElementById('pn-output').textContent = '\u200b';
  }

  function setScore(id, sbId, val) {
    document.getElementById(id).textContent = val.toFixed(2);
    var pct = Math.round(val * 100);
    var fill = document.getElementById(sbId);
    fill.style.width = '0%';
    setTimeout(function() { fill.style.width = pct + '%'; }, 50);
    fill.className = 'score-bar-fill ' + (val > 0.85 ? 'red' : val > 0.40 ? 'yellow' : 'green');
  }

  window.runPipeline = function() {
    if (!selected) return;
    var ex = examples[selected];
    var flow = document.getElementById('pipe-flow');
    flow.style.display = 'flex';
    document.getElementById('scores-area').style.display = 'none';
    document.getElementById('decision-area').innerHTML = '';
    resetNodes();

    var steps = [
      { id: 'pn-submit', cls: 'lit', delay: 0 },
      { id: 'pn-kafka',  cls: 'lit', delay: 350 },
      { id: 'pn-rule',   cls: 'lit', delay: 700 },
      { id: 'pn-text',   cls: 'lit', delay: 1100 },
      { id: 'pn-image',  cls: 'lit', delay: 1100 },
      { id: 'pn-url',    cls: 'lit', delay: 1100 }
    ];

    steps.forEach(function(s) {
      setTimeout(function() {
        var el = document.getElementById(s.id);
        if (el) { el.classList.add(s.cls); }
      }, s.delay);
    });

    setTimeout(function() {
      document.getElementById('scores-area').style.display = 'block';
      setScore('sc-tox',  'sb-tox',  ex.scores.tox);
      setScore('sc-spam', 'sb-spam', ex.scores.spam);
      setScore('sc-nsfw', 'sb-nsfw', ex.scores.nsfw);
      setScore('sc-url',  'sb-url',  ex.scores.url);
    }, 1600);

    setTimeout(function() {
      document.getElementById('pn-decision').classList.add('lit');
    }, 2200);

    setTimeout(function() {
      var outcomeMap = { 'PUBLISHED': 'lit', 'AUTO-REMOVED': 'lit-bad', 'HUMAN REVIEW': 'lit-warn' };
      var outNode = document.getElementById('pn-output');
      outNode.textContent = ex.decision;
      outNode.classList.add(outcomeMap[ex.decision] || 'lit');

      var area = document.getElementById('decision-area');
      var div = document.createElement('div');
      div.className = 'decision-box ' + ex.decisionClass + ' show';
      div.textContent = ex.decisionText;
      area.appendChild(div);
    }, 2700);
  };
})();
</script>

### The Two Paths

<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.2rem 0;">
  <div class="arch-tier tier-fast">
    <div class="arch-tier-label">Synchronous — &lt; 500ms</div>
    <div class="arch-tier-title">Fast Path</div>
    <div class="arch-tier-desc" style="font-size:.78rem;">
      1. Post submitted → Kafka <code>content-submitted</code><br/>
      2. Rule-based pre-filter (&lt;1ms)<br/>
      3. ML classifiers in parallel (50–200ms)<br/>
      4. Decision engine applies thresholds<br/>
      5. Content published / held / auto-removed
    </div>
  </div>
  <div class="arch-tier tier-slow">
    <div class="arch-tier-label">Asynchronous — seconds to minutes</div>
    <div class="arch-tier-title">Slow Path</div>
    <div class="arch-tier-desc" style="font-size:.78rem;">
      6. All content queued for deeper analysis<br/>
      7. Larger/slower models (cross-modal, LLM-based)<br/>
      8. Human review for uncertain cases<br/>
      9. Retroactive removal if slow path catches something<br/>
      10. Reviewer decisions feed back to retrain models
    </div>
  </div>
</div>

<div class="callout callout-green">
<strong>Key insight:</strong> The fast path optimistically publishes content. The slow path can retroactively remove it. This means a post might be live for seconds to minutes before removal — that tradeoff is deliberate. Most harmful content is not viral in the first 500ms.
</div>

---

## 7. Human Review Queue

{: class="marginalia" }
PhotoDNA was created<br/>by Hany Farid (Dartmouth)<br/>and donated to Microsoft<br/>in 2009. It's now used<br/>by Facebook, Google,<br/>Twitter, and 200+ platforms.<br/>The NCMEC database<br/>contains 3M+ known<br/>CSAM hashes. Meta<br/>reported 27M CSAM<br/>pieces in 2022 — the<br/>vast majority detected<br/>automatically.

When ML confidence falls in the uncertain range (score 0.40–0.85), content goes to human reviewers. The queue is prioritized: viral content first (to limit spread), borderline cases first within the same virality tier.

### Interactive: Review Queue Demo

<div class="viz-wrap">
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem;">
    <div class="viz-title" style="margin:0;">&#9654; Human Review Queue — approve, remove, or escalate</div>
    <div style="font-size:.8rem;color:rgba(255,255,255,.45);">Reviewed today: <span id="reviewed-count" style="color:#7bcdab;font-weight:700;">0</span> / <span id="total-count">5</span></div>
  </div>

  <div id="review-queue"></div>

  <div id="training-chips" style="margin-top:1rem;display:none;">
    <div style="font-size:.72rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem;">&#127302; Feedback to training data pipeline</div>
    <div id="chips-area"></div>
  </div>
</div>

<script>
(function() {
  var queueItems = [
    { id: 'qi1', score: 0.71, text: '"These politicians should all be lined up and dealt with properly, the country is done."', meta: 'Account age: 3 days | 2 reports | 0 shares', scoreClass: 'hi', label: 'hate_speech' },
    { id: 'qi2', score: 0.58, text: '"My doctor said this vaccine has microchips \u2014 read the studies at truthmed24.net before you comply"', meta: 'Account age: 14 months | 1 report | 47 shares', scoreClass: 'mid', label: 'misinfo' },
    { id: 'qi3', score: 0.44, text: '"I hate Mondays so much I want to destroy everything lol \ud83d\ude02\ud83d\udd25"', meta: 'Account age: 2 years | 0 reports | 3 shares', scoreClass: 'mid', label: 'toxicity' },
    { id: 'qi4', score: 0.67, text: '"DM me for the cheapest Insta followers you will find online 10K for $5 guaranteed"', meta: 'Account age: 6 days | 5 reports | 0 shares', scoreClass: 'hi', label: 'spam' },
    { id: 'qi5', score: 0.52, text: '"Stop eating sugar RIGHT NOW \u2014 pharma doesn\'t want you to know this ONE trick"', meta: 'Account age: 8 months | 1 report | 12 shares', scoreClass: 'mid', label: 'misinfo' }
  ];

  var reviewed = 0;
  var chips = [];

  function render() {
    var container = document.getElementById('review-queue');
    container.innerHTML = '';
    queueItems.forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'queue-item';
      div.id = item.id;
      div.innerHTML =
        '<div class="queue-score ' + item.scoreClass + '">' + item.score.toFixed(2) + '</div>' +
        '<div class="queue-content">' +
          '<div class="queue-text">' + item.text + '</div>' +
          '<div class="queue-meta">' + item.meta + '</div>' +
        '</div>' +
        '<div class="queue-actions">' +
          '<button class="q-btn approve"  onclick="reviewItem(\'' + item.id + '\',\'approve\')" >Approve</button>' +
          '<button class="q-btn remove"   onclick="reviewItem(\'' + item.id + '\',\'remove\')"  >Remove</button>' +
          '<button class="q-btn escalate" onclick="reviewItem(\'' + item.id + '\',\'escalate\')">Escalate</button>' +
        '</div>';
      container.appendChild(div);
    });
  }

  window.reviewItem = function(id, action) {
    var item = queueItems.find(function(q) { return q.id === id; });
    if (!item) return;

    var el = document.getElementById(id);
    if (!el) return;

    el.classList.add(action === 'remove' ? 'removed' : 'approved');
    reviewed++;
    document.getElementById('reviewed-count').textContent = reviewed;

    var label = action === 'approve' ? 'not_' + item.label : item.label;
    addChip(label, action);

    setTimeout(function() {
      queueItems = queueItems.filter(function(q) { return q.id !== id; });
      render();
    }, 400);
  };

  function addChip(label, action) {
    var area = document.getElementById('chips-area');
    var wrap = document.getElementById('training-chips');
    wrap.style.display = 'block';

    var chip = document.createElement('span');
    chip.className = 'feedback-chip';
    var color = action === 'approve' ? '#7bcdab' : action === 'remove' ? '#f08080' : '#89c0d0';
    var icon = action === 'approve' ? '\u2713 ' : action === 'remove' ? '\u2717 ' : '\u25b3 ';
    chip.innerHTML = '<span style="color:' + color + '">' + icon + '</span>' + label;
    area.appendChild(chip);

    setTimeout(function() { chip.classList.add('fired'); }, 50);
  }

  render();
})();
</script>

**How the queue is structured:**

- **Priority ordering:** viral posts (high share count) first — a post with 10,000 shares in review causes more harm per minute than a zero-share post
- **Reviewer specialization:** some reviewers handle hate speech, others CSAM, others misinformation — domain expertise matters
- **Appeals path:** removed users can appeal; a second reviewer re-evaluates cold (without seeing the first decision)
- **Feedback loop:** every approve/remove decision is a labeled training example — the queue *is* the data flywheel

---

## 8. PhotoDNA for CSAM

CSAM detection does *not* use ML classifiers. It uses **perceptual hashing (PhotoDNA)**:

<div class="code-wrap">
<div class="code-lang">pseudocode <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">// PhotoDNA: robust hash that survives re-encoding</span>
<span class="kw">function</span> <span class="fn">photoDNA</span>(image):
    greyscale  <span class="op">=</span> <span class="fn">toGreyscale</span>(image)
    resized    <span class="op">=</span> <span class="fn">resize</span>(greyscale, <span class="nu">144</span><span class="op">x</span><span class="nu">144</span>)
    <span class="cm">// DCT-based perceptual hash (144 bytes)</span>
    hash       <span class="op">=</span> <span class="fn">dctHash</span>(resized)
    <span class="kw">return</span> hash

<span class="cm">// Matching: Hamming distance, not exact equality</span>
<span class="kw">function</span> <span class="fn">isMatch</span>(hash, ncmecDatabase):
    <span class="kw">for</span> known_hash <span class="kw">in</span> ncmecDatabase:
        <span class="kw">if</span> <span class="fn">hammingDistance</span>(hash, known_hash) <span class="op">&lt;</span> THRESHOLD:
            <span class="kw">return</span> <span class="kw">true</span>   <span class="cm">// match even if resized / re-compressed</span>
    <span class="kw">return</span> <span class="kw">false</span></pre>
</div>

**Why hash-based, not ML-based?**
- ML has false positives. PhotoDNA match = auto-remove with no human review, no exceptions. A false positive on CSAM detection means an innocent person's content is deleted and possibly reported to authorities — unacceptable.
- Perceptual hashing survives re-encoding, resizing, and color shifts. ML models are easier to evade.
- The NCMEC database has 3M+ hashes. Lookup is O(1) with locality-sensitive hashing.

<div class="callout callout-red">
<strong>Legal requirement:</strong> In the US, CSAM detection and reporting to NCMEC is legally mandated under 18 U.S.C. § 2258A for electronic service providers. It is not optional.
</div>

---

## 9. Account-Level Signals

Individual post analysis misses coordinated behavior. The other detection layer is account-level:

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">AccountSignals</span>:
    <span class="kw">def</span> <span class="fn">scrutiny_multiplier</span>(<span class="kw">self</span>, account) <span class="op">-&gt;</span> <span class="kw">float</span>:
        multiplier <span class="op">=</span> <span class="nu">1.0</span>

        <span class="cm"># New accounts: higher scrutiny</span>
        age_hours <span class="op">=</span> account.<span class="fn">age_hours</span>()
        <span class="kw">if</span> age_hours <span class="op">&lt;</span> <span class="nu">24</span>:
            multiplier <span class="op">*=</span> <span class="nu">2.5</span>

        <span class="cm"># Velocity check: posting rate anomaly</span>
        posts_per_min <span class="op">=</span> account.<span class="fn">recent_post_rate</span>()
        <span class="kw">if</span> posts_per_min <span class="op">&gt;</span> <span class="nu">10</span>:
            multiplier <span class="op">*=</span> <span class="nu">3.0</span>

        <span class="cm"># IP reputation: VPN / known bot ASN</span>
        <span class="kw">if</span> <span class="fn">is_proxy_ip</span>(account.last_ip):
            multiplier <span class="op">*=</span> <span class="nu">1.8</span>

        <span class="cm"># Coordinated behavior: same content from many accounts</span>
        <span class="kw">if</span> account.<span class="fn">in_coordinated_cluster</span>():
            multiplier <span class="op">*=</span> <span class="nu">4.0</span>

        <span class="kw">return</span> multiplier

    <span class="kw">def</span> <span class="fn">adjusted_score</span>(<span class="kw">self</span>, base_score, account) <span class="op">-&gt;</span> <span class="kw">float</span>:
        <span class="cm"># Multiply ML score by scrutiny multiplier — may push borderline to auto-remove</span>
        <span class="kw">return</span> <span class="fn">min</span>(<span class="nu">1.0</span>, base_score <span class="op">*</span> <span class="kw">self</span>.<span class="fn">scrutiny_multiplier</span>(account))</pre>
</div>

**Spam ring detection:** Graph analysis finds clusters of accounts that post identical or near-identical content at coordinated times. One flagged account surfaces the ring; the whole cluster gets elevated scrutiny.

---

## 10. Cross-Platform Hash Sharing (GIFCT)

{: class="marginalia" }
The ML moderation false<br/>positive problem is<br/>asymmetric: a false positive<br/>(removing legitimate content)<br/>is visible and generates<br/>complaints; a false negative<br/>(missing harmful content)<br/>often goes unnoticed.<br/>This asymmetry drives<br/>under-moderation — platforms<br/>optimize for what gets<br/>them bad press.

Once harmful content is identified on one platform, the hash can be shared across all member platforms via the **GIFCT (Global Internet Forum to Counter Terrorism)** hash database:

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">on_confirmed_removal</span>(content, reason):
    <span class="kw">if</span> reason <span class="kw">in</span> [<span class="st">'terrorism'</span>, <span class="st">'csam'</span>, <span class="st">'violent_extremism'</span>]:
        <span class="cm"># Compute perceptual hash</span>
        p_hash <span class="op">=</span> <span class="fn">compute_perceptual_hash</span>(content)

        <span class="cm"># Add to our own blocklist immediately</span>
        local_blocklist.<span class="fn">add</span>(p_hash)

        <span class="cm"># Submit to GIFCT shared database</span>
        gifct_api.<span class="fn">submit_hash</span>(
            hash<span class="op">=</span>p_hash,
            category<span class="op">=</span>reason,
            platform<span class="op">=</span><span class="st">'our_platform'</span>
        )

        <span class="cm"># All member platforms now block re-uploads automatically</span>
        <span class="cm"># even if re-encoded, resized, or slightly modified</span></pre>
</div>

**Effect:** A terrorist recruitment video removed from YouTube is blocked on Facebook, Twitter, and 20+ other platforms within minutes — before it can be re-uploaded and gain traction.

---

## 11. Capacity Estimate

<table class="comp-table">
  <thead>
    <tr><th>Metric</th><th>Number</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td>Posts / day</td><td>1,000,000,000</td><td>Given requirement</td></tr>
    <tr><td>Posts / sec (average)</td><td>~12,000</td><td>1B / 86,400s</td></tr>
    <tr><td>Posts / sec (peak)</td><td>~50,000</td><td>~4x average for peak hours</td></tr>
    <tr><td>ML inference / sec</td><td>~50,000</td><td>Text + image in parallel per post</td></tr>
    <tr><td>GPU servers (ML)</td><td>~500</td><td>Each handles ~100 inferences/sec</td></tr>
    <tr><td>Posts routed to human review / day</td><td>~10M</td><td>~1% of all posts (0.4–0.85 range)</td></tr>
    <tr><td>Human reviewers</td><td>~10,000</td><td>Each reviews ~1,000 items/day</td></tr>
    <tr><td>PhotoDNA lookups / sec</td><td>~12,000</td><td>Bloom filter, &lt;1ms each</td></tr>
    <tr><td>Kafka throughput</td><td>~50 GB/hr</td><td>~1KB per post × 50K/sec at peak</td></tr>
  </tbody>
</table>

---

## 12. Thresholds and the False Positive Problem

The threshold values (0.40, 0.85) are not fixed. They're tuned by policy, not engineering:

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Thresholds vary by content category and platform policy</span>
THRESHOLDS = {
    <span class="st">'csam'</span>:       { <span class="st">'auto_remove'</span>: <span class="nu">0.0</span>,  <span class="st">'review'</span>: <span class="nu">0.0</span>  },  <span class="cm"># hash-based, zero tolerance</span>
    <span class="st">'terrorism'</span>:  { <span class="st">'auto_remove'</span>: <span class="nu">0.75</span>, <span class="st">'review'</span>: <span class="nu">0.40</span> },  <span class="cm"># aggressive</span>
    <span class="st">'hate_speech'</span>:{ <span class="st">'auto_remove'</span>: <span class="nu">0.90</span>, <span class="st">'review'</span>: <span class="nu">0.50</span> },  <span class="cm"># careful — high FP rate</span>
    <span class="st">'spam'</span>:       { <span class="st">'auto_remove'</span>: <span class="nu">0.85</span>, <span class="st">'review'</span>: <span class="nu">0.60</span> },  <span class="cm"># relatively safe to auto-remove</span>
    <span class="st">'nsfw'</span>:       { <span class="st">'auto_remove'</span>: <span class="nu">0.92</span>, <span class="st">'review'</span>: <span class="nu">0.50</span> },  <span class="cm"># visual, clearer signal</span>
    <span class="st">'misinformation'</span>:{ <span class="st">'auto_remove'</span>: <span class="nu">0.95</span>, <span class="st">'review'</span>: <span class="nu">0.65</span> },  <span class="cm"># very conservative — high FP risk</span>
}

<span class="cm"># Lowering auto_remove threshold → fewer false negatives, MORE false positives</span>
<span class="cm"># Raising auto_remove threshold → fewer false positives, MORE false negatives</span>
<span class="cm"># There is no neutral setting. The threshold IS the policy.</span></pre>
</div>

<div class="callout callout-yellow">
<strong>Interview signal:</strong> The best candidates recognize that threshold tuning is a <em>values question</em> disguised as an engineering question. "What's the right threshold?" cannot be answered without knowing platform policy on speech, legal exposure, and business priorities.
</div>

---

## 13. The Full Architecture

<div style="background:#111214;border:1px solid #2e2f35;border-radius:12px;padding:1.4rem;margin:1.5rem 0;font-size:.82rem;line-height:1.8;color:rgba(255,255,255,.75);">

<div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.3);margin-bottom:1rem;">System components</div>

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.8rem;">
  <div style="background:#1a1b1f;border:1px solid rgba(251,239,138,.25);border-radius:8px;padding:.9rem;">
    <div style="color:#fbef8a;font-weight:700;margin-bottom:.4rem;">&#8594; Ingestion</div>
    <div style="color:rgba(255,255,255,.6);">API Gateway → Kafka <code>content-submitted</code> topic. Kafka buffers peak load and fans out to multiple consumer groups.</div>
  </div>
  <div style="background:#1a1b1f;border:1px solid rgba(123,205,171,.25);border-radius:8px;padding:.9rem;">
    <div style="color:#7bcdab;font-weight:700;margin-bottom:.4rem;">&#9878; Rule Engine</div>
    <div style="color:rgba(255,255,255,.6);">Trie-based keyword blocklist + Bloom filter URL check. Runs in-process, &lt;1ms. Immediate removals bypass ML entirely.</div>
  </div>
  <div style="background:#1a1b1f;border:1px solid rgba(137,192,208,.25);border-radius:8px;padding:.9rem;">
    <div style="color:#89c0d0;font-weight:700;margin-bottom:.4rem;">&#129302; ML Inference Fleet</div>
    <div style="color:rgba(255,255,255,.6);">GPU cluster running specialized models. Text, image, URL classifiers in parallel. TorchServe / Triton for serving. Results aggregated by decision engine.</div>
  </div>
  <div style="background:#1a1b1f;border:1px solid rgba(240,128,128,.25);border-radius:8px;padding:.9rem;">
    <div style="color:#f08080;font-weight:700;margin-bottom:.4rem;">&#128737; PhotoDNA Service</div>
    <div style="color:rgba(255,255,255,.6);">Dedicated microservice. Computes perceptual hash, checks against NCMEC database (locality-sensitive hashing). Match → auto-remove + NCMEC report.</div>
  </div>
  <div style="background:#1a1b1f;border:1px solid rgba(251,239,138,.25);border-radius:8px;padding:.9rem;">
    <div style="color:#fbef8a;font-weight:700;margin-bottom:.4rem;">&#9878; Decision Engine</div>
    <div style="color:rgba(255,255,255,.6);">Combines all signals. Applies category-specific thresholds. Routes to: PUBLISH, REVIEW queue, or AUTO-REMOVE. Records decision + scores in audit log.</div>
  </div>
  <div style="background:#1a1b1f;border:1px solid rgba(123,205,171,.25);border-radius:8px;padding:.9rem;">
    <div style="color:#7bcdab;font-weight:700;margin-bottom:.4rem;">&#128104; Human Review System</div>
    <div style="color:rgba(255,255,255,.6);">Priority queue (viral-first). Reviewer UI with ML score explanations. Approve / Remove / Escalate. Appeals workflow. All decisions logged as training data.</div>
  </div>
  <div style="background:#1a1b1f;border:1px solid rgba(137,192,208,.25);border-radius:8px;padding:.9rem;">
    <div style="color:#89c0d0;font-weight:700;margin-bottom:.4rem;">&#127302; Training Flywheel</div>
    <div style="color:rgba(255,255,255,.6);">Reviewer decisions → labeled dataset. Periodic model retraining. A/B testing of new model versions. Shadow mode deployment before cutover.</div>
  </div>
  <div style="background:#1a1b1f;border:1px solid rgba(240,128,128,.25);border-radius:8px;padding:.9rem;">
    <div style="color:#f08080;font-weight:700;margin-bottom:.4rem;">&#128203; Audit &amp; Appeals</div>
    <div style="color:rgba(255,255,255,.6);">Immutable audit log of every moderation decision + model scores. User appeals routed to second reviewer. Regulatory compliance reporting.</div>
  </div>
</div>
</div>

---

## 14. What Interviewers Actually Want to Hear

<div class="callout callout-green">
<strong>The three-tier pipeline:</strong> Rule-based (fast/dumb) → ML classifiers (parallel, probabilistic) → human review (uncertain cases). Each tier handles what the previous couldn't. Describing only one tier is a failing answer.
</div>

<div class="callout callout-yellow">
<strong>The CSAM exception:</strong> Mentioning PhotoDNA, perceptual hashing, and NCMEC reporting as a separate non-ML path signals you understand the real constraints. This is legally mandated, not optional.
</div>

<div class="callout callout-red">
<strong>The feedback loop:</strong> The system improves over time because reviewer decisions become training data. Without this loop, ML models drift as content evolves. A static model is a decaying model.
</div>

---

<script>
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre.code-block');
  var text = pre ? pre.innerText : '';
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}
</script>
