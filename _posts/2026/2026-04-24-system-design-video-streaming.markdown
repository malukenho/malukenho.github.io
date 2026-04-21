---
layout: post
title: "System Design: Video Streaming — How YouTube Serves 1 Billion Hours Per Day"
date: 2026-04-24 10:00:00 +0000
categories: ["post"]
tags: [system-design, video, cdn, streaming, hls, interview]
series: "System Design Interview Series"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design Interview Prep &mdash; #10 of 15
</div>

{: class="marginalia" }
YouTube processes **500<br/>hours of video every<br/>single minute.** The<br/>infrastructure to<br/>receive, transcode, and<br/>deliver all of it is one<br/>of the largest media<br/>pipelines ever built.

Video streaming is the hardest content delivery problem in existence. Files are enormous (a single 4K movie exceeds 50 GB uncompressed), users are on wildly variable connections, the audience is global, and latency directly destroys the experience. YouTube serves **1 billion hours of video per day** — roughly 114,000 years of footage, every 24 hours. This article builds the system from a naive file server to a planet-scale adaptive streaming platform, one level at a time.

**The question:** *Design a video streaming platform like YouTube. Handle 500 hours of video uploaded per minute, 1 billion hours watched per day. Support fast start, smooth playback, and global reach.*

---

<style>
/* ── Series badge ───────────────────────────────────────── */
.series-badge {
  display: inline-flex; align-items: center; gap: .5rem;
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 20px;
  padding: 5px 14px; font-size: .75rem; color: rgba(255,255,255,.55);
  margin-bottom: 1.5rem;
}
.series-badge strong { color: #fbef8a; }

/* ── Code blocks ─────────────────────────────────────────── */
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
.code-wrap pre.code-block {
  margin: 0; padding: 16px 20px; overflow-x: auto;
  font-family: "JetBrains Mono","Fira Code",monospace; font-size: 13px;
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
.op  { color: rgba(255,255,255,.5); }

/* ── Callouts ────────────────────────────────────────────── */
.callout {
  border-radius: 8px; padding: 1rem 1.2rem; margin: 1rem 0;
  font-size: .84rem; line-height: 1.7;
}
.callout-green  { background: #1a2e22; border-left: 3px solid #7bcdab; color: rgba(255,255,255,.82); }
.callout-yellow { background: #25240e; border-left: 3px solid #fbef8a; color: rgba(255,255,255,.82); }
.callout-red    { background: #2a1616; border-left: 3px solid #f08080; color: rgba(255,255,255,.82); }
.callout strong { color: #fff; }

/* ── Stat grid ───────────────────────────────────────────── */
.stat-grid {
  display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; margin: 1.5rem 0;
}
@media (max-width:680px) { .stat-grid { grid-template-columns: repeat(2,1fr); } }
.stat-card {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1rem; text-align: center;
}
.stat-num   { font-size: 1.6rem; font-weight: 700; color: #fbef8a; line-height: 1.1; }
.stat-label { font-size: .72rem; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .06em; margin-top: .3rem; }
.stat-sub   { font-size: .75rem; color: rgba(255,255,255,.35); margin-top: .15rem; }

/* ── Comparison table ────────────────────────────────────── */
.compare-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 1rem 0;
}
.compare-table th {
  text-align: left; padding: 8px 14px; color: rgba(255,255,255,.45);
  font-weight: 500; font-size: 11px; text-transform: uppercase;
  letter-spacing: .07em; border-bottom: 1px solid #2e2f35;
}
.compare-table td {
  padding: 9px 14px; border-bottom: 1px solid #1c1d22;
  color: rgba(255,255,255,.78); vertical-align: top;
}
.compare-table tr:last-child td { border-bottom: none; }
.compare-table .yes  { color: #7bcdab; }
.compare-table .no   { color: #f08080; }
.compare-table .part { color: #fbef8a; }

/* ── Capacity table ──────────────────────────────────────── */
.cap-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 1rem 0;
}
.cap-table th {
  text-align: left; padding: 8px 14px; color: rgba(255,255,255,.45);
  font-weight: 500; font-size: 11px; text-transform: uppercase;
  letter-spacing: .07em; border-bottom: 1px solid #2e2f35;
}
.cap-table td {
  padding: 9px 14px; border-bottom: 1px solid #1c1d22;
  color: rgba(255,255,255,.78);
}
.cap-table td.num { text-align: right; font-family: "JetBrains Mono","Fira Code",monospace; color: #7bcdab; }
.cap-table tr:last-child td { border-bottom: none; }

/* ── Level badge ─────────────────────────────────────────── */
.level-badge {
  display: inline-block; background: #1e1f24; border: 1px solid #2e2f35;
  border-radius: 6px; padding: 3px 10px; font-size: .72rem; font-weight: 600;
  color: #fbef8a; letter-spacing: .06em; text-transform: uppercase;
  margin-bottom: .6rem;
}

/* ── Pipeline diagram ─────────────────────────────────────── */
.pipeline {
  display: flex; align-items: center; gap: 0; flex-wrap: wrap;
  margin: 1.5rem 0; background: #111214; border: 1px solid #2e2f35;
  border-radius: 10px; padding: 1.2rem 1rem; overflow-x: auto;
}
.pipeline-node {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .55rem .9rem; font-size: .78rem; color: rgba(255,255,255,.8);
  white-space: nowrap; text-align: center; flex-shrink: 0;
}
.pipeline-node.accent { border-color: #7bcdab; color: #7bcdab; }
.pipeline-node.warn   { border-color: #fbef8a; color: #fbef8a; }
.pipeline-arrow {
  color: rgba(255,255,255,.3); font-size: 1.1rem; padding: 0 .4rem;
  flex-shrink: 0;
}

/* ── Transcoding visualizer ──────────────────────────────── */
#transcode-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.4rem; margin: 1.5rem 0;
}
#transcode-wrap h4 { margin: 0 0 1rem; color: #fbef8a; font-size: .9rem; }
#tc-source {
  background: #1a1b1f; border: 1px solid #3a3b40; border-radius: 8px;
  padding: .8rem 1.2rem; font-size: .82rem; color: rgba(255,255,255,.75);
  margin-bottom: 1rem; display: flex; align-items: center; gap: .8rem;
}
#tc-source .tc-icon { font-size: 1.5rem; }
.tc-variants {
  display: grid; grid-template-columns: repeat(3,1fr); gap: .75rem;
}
@media (max-width:600px) { .tc-variants { grid-template-columns: repeat(2,1fr); } }
.tc-card {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .75rem; opacity: .35; transition: opacity .4s;
}
.tc-card.active { opacity: 1; border-color: #7bcdab; }
.tc-card.done   { opacity: 1; border-color: #2e2f35; }
.tc-quality { font-size: .85rem; font-weight: 700; color: #fbef8a; }
.tc-bitrate { font-size: .72rem; color: rgba(255,255,255,.45); margin: .15rem 0 .5rem; }
.tc-bar-bg  { background: #2e2f35; border-radius: 3px; height: 5px; overflow: hidden; }
.tc-bar     { height: 5px; border-radius: 3px; background: #7bcdab; width: 0; transition: width 1.2s ease; }
.tc-size    { font-size: .7rem; color: rgba(255,255,255,.38); margin-top: .35rem; }
#tc-btn {
  margin-top: 1rem; background: #7bcdab; color: #19191c; border: none;
  border-radius: 6px; padding: .45rem 1.1rem; font-size: .82rem;
  font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity .2s;
}
#tc-btn:disabled { opacity: .45; cursor: default; }

/* ── ABR simulator ───────────────────────────────────────── */
#abr-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.4rem; margin: 1.5rem 0;
}
#abr-wrap h4 { margin: 0 0 1rem; color: #fbef8a; font-size: .9rem; }
.abr-player {
  background: #0d0d0f; border: 1px solid #2e2f35; border-radius: 8px;
  overflow: hidden; margin-bottom: 1rem; position: relative;
  aspect-ratio: 16/9; max-height: 180px; display: flex;
  align-items: center; justify-content: center;
}
.abr-screen {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: .4rem;
}
.abr-quality-badge {
  background: rgba(0,0,0,.6); border: 1px solid #7bcdab; border-radius: 6px;
  padding: 4px 14px; font-size: 1.1rem; font-weight: 700; color: #7bcdab;
  transition: all .3s;
}
.abr-rebuffer {
  font-size: .72rem; color: #f08080; min-height: 1.1rem;
  transition: opacity .3s;
}
.abr-controls { display: flex; flex-direction: column; gap: .65rem; }
.abr-row { display: flex; align-items: center; gap: .8rem; font-size: .8rem; }
.abr-row label { color: rgba(255,255,255,.55); width: 100px; flex-shrink: 0; }
#abr-bw-slider {
  flex: 1; accent-color: #7bcdab; cursor: pointer;
}
#abr-bw-val { color: #fbef8a; font-weight: 700; width: 80px; text-align: right; font-size: .8rem; }
.abr-buf-bg { flex: 1; background: #2e2f35; border-radius: 4px; height: 8px; overflow: hidden; }
.abr-buf-fill { height: 8px; background: #7bcdab; border-radius: 4px; transition: width .6s ease; }
#abr-buf-pct { color: rgba(255,255,255,.45); font-size: .75rem; width: 40px; text-align: right; }
.abr-events { font-size: .72rem; color: rgba(255,255,255,.38); min-height: 1.2rem; }

/* ── CDN map ─────────────────────────────────────────────── */
#cdn-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.4rem; margin: 1.5rem 0;
}
#cdn-wrap h4 { margin: 0 0 .8rem; color: #fbef8a; font-size: .9rem; }
#cdn-map {
  position: relative; width: 100%; background: #0d1117;
  border: 1px solid #1c2030; border-radius: 8px; overflow: hidden;
  aspect-ratio: 2/1; max-height: 280px;
}
#cdn-canvas { width: 100%; height: 100%; display: block; }
.cdn-legend {
  display: flex; gap: 1.2rem; flex-wrap: wrap;
  margin: .75rem 0; font-size: .73rem; color: rgba(255,255,255,.45);
}
.cdn-legend span { display: flex; align-items: center; gap: .3rem; }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dot-pop  { background: #7bcdab; }
.dot-user { background: #fbef8a; }
.dot-origin { background: #f08080; }
.cdn-btns { display: flex; gap: .6rem; flex-wrap: wrap; margin-top: .5rem; }
.cdn-btn {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 6px;
  color: rgba(255,255,255,.65); font-size: .75rem; padding: .35rem .75rem;
  cursor: pointer; font-family: inherit; transition: all .2s;
}
.cdn-btn:hover { border-color: #7bcdab; color: #7bcdab; }
#cdn-status {
  margin-top: .75rem; font-size: .78rem; color: rgba(255,255,255,.55);
  min-height: 1.4rem; transition: color .3s;
}
#cdn-status.hit  { color: #7bcdab; }
#cdn-status.miss { color: #f08080; }

/* ── Upload pipeline ─────────────────────────────────────── */
.upload-pipeline {
  display: grid; gap: .75rem; margin: 1.5rem 0;
}
.up-row {
  display: flex; align-items: stretch; gap: .75rem;
}
.up-node {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .75rem 1rem; font-size: .8rem; color: rgba(255,255,255,.78);
  flex: 1; cursor: pointer; transition: all .25s; position: relative;
}
.up-node:hover { border-color: #7bcdab; }
.up-node .up-label { font-weight: 700; color: #fbef8a; margin-bottom: .25rem; }
.up-node .up-desc  { font-size: .71rem; color: rgba(255,255,255,.42); line-height: 1.5; }
.up-arrow-v {
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,.3); font-size: 1.2rem;
}
.up-node.selected { border-color: #7bcdab; background: #1a2e22; }
#up-detail {
  background: #1a2e22; border: 1px solid #7bcdab; border-radius: 8px;
  padding: 1rem 1.2rem; font-size: .81rem; color: rgba(255,255,255,.8);
  line-height: 1.7; min-height: 60px; margin-top: .5rem;
  display: none;
}
#up-detail.visible { display: block; }
</style>

## 1. The Problem

<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-num">500h</div>
    <div class="stat-label">Uploaded / min</div>
    <div class="stat-sub">83 hours/second</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">1B</div>
    <div class="stat-label">Hours watched / day</div>
    <div class="stat-sub">~114,000 years</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">11.5M</div>
    <div class="stat-label">Concurrent viewers</div>
    <div class="stat-sub">at any given moment</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">500 PB</div>
    <div class="stat-label">Daily CDN egress</div>
    <div class="stat-sub">at 4 Mbps avg bitrate</div>
  </div>
</div>

Video is the hardest content type to serve at scale. Three fundamental constraints make it uniquely difficult:

1. **Size.** A raw 1-hour 4K camera recording can exceed 100 GB. You cannot store or serve that directly.
2. **Variable bandwidth.** A user on 5G gets 100 Mbps; a user on rural LTE might see 500 kbps. The same file cannot serve both.
3. **Seeking.** Users skip to the middle constantly. A naive "download from byte 0" approach makes every seek a full restart.

Every architectural decision in this article is a direct response to one of these three constraints.

---

## 2. Level 1 — Naive: Serve the Raw File

<div class="level-badge">Level 1 · Naive</div>

The simplest approach: users upload a video file to a server; other users download it over HTTP. A single `nginx` serving files from disk.

<div class="pipeline">
  <div class="pipeline-node warn">User Upload</div>
  <div class="pipeline-arrow">→</div>
  <div class="pipeline-node">Origin Server</div>
  <div class="pipeline-arrow">→</div>
  <div class="pipeline-node">HTTP GET /video.mp4</div>
  <div class="pipeline-arrow">→</div>
  <div class="pipeline-node warn">Viewer Downloads</div>
</div>

**Where it fails immediately:**

- A 4K video at 8 Mbps needs an 8 Mbps connection *sustained* to avoid buffering. Half of global internet users cannot guarantee this.
- Raw camera footage (ProRes, AVCHD) is not browser-playable. You would serve it and get zero playback.
- Seeking to minute 45 means the browser must have already downloaded 45 minutes of video, or the server must support HTTP range requests — which most naive setups do not handle efficiently.
- A single server handling 11.5 million concurrent viewers at 4 Mbps = **46 Tbps** of egress. One machine has ~10 Gbps. You need 4,600 machines, all perfectly coordinated, serving the same files.
- Mobile users on 360p do not need — and cannot stream — the same file as desktop 4K viewers.

This fails on every axis: codec compatibility, variable bandwidth, seeking, and scale.

---

## 3. Level 2 — Video Transcoding Pipeline

<div class="level-badge">Level 2 · Transcoding</div>

{: class="marginalia" }
"Netflix uses a modified<br/>version of DASH they<br/>call **VMAF** (Video<br/>Multi-Method<br/>Assessment Fusion) to<br/>decide which quality<br/>level to stream — it's<br/>not just bitrate, it's<br/>perceptual quality."

The first fix: never store or serve the raw upload. Feed every upload into a **transcoding pipeline** that produces multiple output variants in browser-native codecs (H.264, VP9, AV1).

Each resolution gets a different target bitrate tuned for that resolution's pixel count:

<table class="compare-table">
  <thead>
    <tr>
      <th>Quality</th>
      <th>Resolution</th>
      <th>Target Bitrate</th>
      <th>Approx. file size (1h)</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>4K</td><td>3840 × 2160</td><td class="yes">8 Mbps</td><td>3.6 GB</td></tr>
    <tr><td>1080p</td><td>1920 × 1080</td><td class="yes">4 Mbps</td><td>1.8 GB</td></tr>
    <tr><td>720p</td><td>1280 × 720</td><td class="yes">2.5 Mbps</td><td>1.1 GB</td></tr>
    <tr><td>480p</td><td>854 × 480</td><td class="yes">1 Mbps</td><td>450 MB</td></tr>
    <tr><td>360p</td><td>640 × 360</td><td class="yes">0.5 Mbps</td><td>225 MB</td></tr>
    <tr><td>240p</td><td>426 × 240</td><td class="yes">0.25 Mbps</td><td>112 MB</td></tr>
    <tr><td>Audio only</td><td>—</td><td class="yes">128 kbps</td><td>57 MB</td></tr>
  </tbody>
</table>

**Interactive — Transcoding visualizer.** Upload one raw video file and watch it fan out into quality variants:

<div id="transcode-wrap">
  <h4>🎬 Transcoding Pipeline Visualizer</h4>
  <div id="tc-source">
    <span class="tc-icon">📹</span>
    <div>
      <div style="font-weight:700;color:#fbef8a;">raw_upload.mov</div>
      <div style="font-size:.72rem;color:rgba(255,255,255,.38);">ProRes 4K — 18 GB — not browser-playable</div>
    </div>
  </div>
  <div class="tc-variants" id="tc-variants">
    <div class="tc-card" data-q="4K (2160p)" data-br="8 Mbps" data-sz="3.6 GB">
      <div class="tc-quality">4K</div>
      <div class="tc-bitrate">8 Mbps · H.264</div>
      <div class="tc-bar-bg"><div class="tc-bar"></div></div>
      <div class="tc-size">3.6 GB</div>
    </div>
    <div class="tc-card" data-q="1080p" data-br="4 Mbps" data-sz="1.8 GB">
      <div class="tc-quality">1080p</div>
      <div class="tc-bitrate">4 Mbps · H.264</div>
      <div class="tc-bar-bg"><div class="tc-bar"></div></div>
      <div class="tc-size">1.8 GB</div>
    </div>
    <div class="tc-card" data-q="720p" data-br="2.5 Mbps" data-sz="1.1 GB">
      <div class="tc-quality">720p</div>
      <div class="tc-bitrate">2.5 Mbps · H.264</div>
      <div class="tc-bar-bg"><div class="tc-bar"></div></div>
      <div class="tc-size">1.1 GB</div>
    </div>
    <div class="tc-card" data-q="480p" data-br="1 Mbps" data-sz="450 MB">
      <div class="tc-quality">480p</div>
      <div class="tc-bitrate">1 Mbps · H.264</div>
      <div class="tc-bar-bg"><div class="tc-bar"></div></div>
      <div class="tc-size">450 MB</div>
    </div>
    <div class="tc-card" data-q="360p" data-br="0.5 Mbps" data-sz="225 MB">
      <div class="tc-quality">360p</div>
      <div class="tc-bitrate">0.5 Mbps · H.264</div>
      <div class="tc-bar-bg"><div class="tc-bar"></div></div>
      <div class="tc-size">225 MB</div>
    </div>
    <div class="tc-card" data-q="Audio" data-br="128 kbps" data-sz="57 MB">
      <div class="tc-quality">Audio</div>
      <div class="tc-bitrate">128 kbps · AAC</div>
      <div class="tc-bar-bg"><div class="tc-bar"></div></div>
      <div class="tc-size">57 MB</div>
    </div>
  </div>
  <button id="tc-btn">▶ Start Transcoding</button>
</div>

<script>
(function() {
  var cards = document.querySelectorAll('.tc-card');
  var btn   = document.getElementById('tc-btn');
  var delays = [0, 350, 600, 900, 1150, 1400];
  var running = false;

  function reset() {
    cards.forEach(function(c) {
      c.classList.remove('active','done');
      c.querySelector('.tc-bar').style.width = '0';
    });
    btn.disabled = false;
    btn.textContent = '▶ Start Transcoding';
    running = false;
  }

  btn.addEventListener('click', function() {
    if (running) { reset(); return; }
    running = true;
    btn.disabled = true;
    btn.textContent = '⏳ Transcoding…';

    cards.forEach(function(card, i) {
      setTimeout(function() {
        card.classList.add('active');
        card.querySelector('.tc-bar').style.width = '100%';
        setTimeout(function() {
          card.classList.remove('active');
          card.classList.add('done');
          if (i === cards.length - 1) {
            btn.disabled = false;
            btn.textContent = '↺ Reset';
          }
        }, 1300);
      }, delays[i]);
    });
  });
})();
</script>

Transcoding is CPU-intensive. YouTube uses a farm of dedicated transcoding workers (horizontal scale). A 1-hour 4K video can take 10–30 minutes to transcode fully, which is why newly uploaded videos sometimes show only low quality initially.

---

## 4. Level 3 — Chunked Streaming (HLS / DASH)

<div class="level-badge">Level 3 · Chunked Streaming</div>

Even with multiple quality levels, serving a 1.8 GB 1080p file means the viewer must wait for the entire download before seeking or even starting playback. The solution: **segment the video**.

Split every quality variant into small chunks (typically 2–10 seconds each). Create a **manifest file** that lists all segments in order. The player downloads the manifest first, then fetches segments sequentially. After the first 2–3 segments arrive, playback begins.

**Apple's HLS** (HTTP Live Streaming) uses `.m3u8` manifest files:

<div class="code-wrap">
  <div class="code-lang">
    <span>HLS Manifest (master.m3u8)</span>
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="pp">#EXTM3U</span>
<span class="pp">#EXT-X-VERSION:3</span>
<span class="cm"># Master playlist — lists quality variants</span>
<span class="pp">#EXT-X-STREAM-INF:</span><span class="ty">BANDWIDTH=</span><span class="nu">8000000</span><span class="op">,</span><span class="ty">RESOLUTION=</span><span class="nu">3840x2160</span>
<span class="st">4k/index.m3u8</span>
<span class="pp">#EXT-X-STREAM-INF:</span><span class="ty">BANDWIDTH=</span><span class="nu">4000000</span><span class="op">,</span><span class="ty">RESOLUTION=</span><span class="nu">1920x1080</span>
<span class="st">1080p/index.m3u8</span>
<span class="pp">#EXT-X-STREAM-INF:</span><span class="ty">BANDWIDTH=</span><span class="nu">1000000</span><span class="op">,</span><span class="ty">RESOLUTION=</span><span class="nu">854x480</span>
<span class="st">480p/index.m3u8</span></pre>
</div>

<div class="code-wrap">
  <div class="code-lang">
    <span>HLS Media Playlist (1080p/index.m3u8)</span>
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="pp">#EXTM3U</span>
<span class="pp">#EXT-X-VERSION:3</span>
<span class="pp">#EXT-X-TARGETDURATION:</span><span class="nu">6</span>
<span class="pp">#EXT-X-MEDIA-SEQUENCE:</span><span class="nu">0</span>

<span class="cm"># Each segment is exactly 6 seconds of video</span>
<span class="pp">#EXTINF:</span><span class="nu">6.0</span><span class="op">,</span>
<span class="st">segment_000.ts</span>
<span class="pp">#EXTINF:</span><span class="nu">6.0</span><span class="op">,</span>
<span class="st">segment_001.ts</span>
<span class="pp">#EXTINF:</span><span class="nu">6.0</span><span class="op">,</span>
<span class="st">segment_002.ts</span>
<span class="cm"># … 598 more segments for a 1-hour video …</span>
<span class="pp">#EXT-X-ENDLIST</span></pre>
</div>

**Why this solves seeking:** to jump to minute 45, the player calculates which segment contains that timestamp (`45 * 60 / 6 = segment_450.ts`) and fetches *only that segment*. No need to download anything before it. The server never needs to maintain state between requests — segments are just static files.

**DASH** (Dynamic Adaptive Streaming over HTTP, used by YouTube and Netflix) works identically but uses XML `.mpd` manifest files instead of `.m3u8`. The segment format and ABR algorithm differ, but the core concept is the same.

<div class="callout callout-green">
  <strong>Start latency:</strong> With 6-second segments, a viewer can start playing after downloading just 1 manifest file + 2–3 segment files (~12–18 seconds of video). Combined with CDN edge caching, this means time-to-first-frame under 2 seconds for popular content.
</div>

---

## 5. Level 4 — Adaptive Bitrate Streaming (ABR)

<div class="level-badge">Level 4 · Adaptive Bitrate</div>

{: class="marginalia" }
"The first 2–3 seconds<br/>of buffering before a<br/>video starts is almost<br/>entirely network<br/>round-trips to fetch<br/>the manifest and first<br/>segment — CDN edge<br/>nodes cut this to<br/>&lt;200 ms."

The master manifest lists multiple quality variants. The player monitors available bandwidth every few seconds and *dynamically switches* which quality tier it fetches next. On a fast connection it upgrades to 1080p. When the network degrades it drops to 360p — seamlessly, mid-playback.

The player maintains a **buffer**: a rolling window of pre-fetched segments ahead of the playhead. Buffer is the resilience reserve. As long as there is buffer, a temporary bandwidth drop does not cause a freeze. A good ABR algorithm tries to keep 15–30 seconds of buffer while targeting the highest quality the connection can sustain.

**Interactive — ABR Simulator:**

<div id="abr-wrap">
  <h4>📺 Adaptive Bitrate Simulator</h4>
  <div class="abr-player">
    <div class="abr-screen">
      <div class="abr-quality-badge" id="abr-q">1080p</div>
      <div class="abr-rebuffer" id="abr-rebuf"></div>
    </div>
  </div>
  <div class="abr-controls">
    <div class="abr-row">
      <label>Bandwidth</label>
      <input type="range" id="abr-bw-slider" min="0" max="100" value="55">
      <span id="abr-bw-val">4 Mbps</span>
    </div>
    <div class="abr-row">
      <label>Buffer ahead</label>
      <div class="abr-buf-bg"><div class="abr-buf-fill" id="abr-buf-fill" style="width:72%"></div></div>
      <span id="abr-buf-pct">22s</span>
    </div>
    <div class="abr-row">
      <label>Events</label>
      <div class="abr-events" id="abr-events">Drag the bandwidth slider to simulate network changes.</div>
    </div>
  </div>
</div>

<script>
(function() {
  var slider = document.getElementById('abr-bw-slider');
  var bwVal  = document.getElementById('abr-bw-val');
  var qBadge = document.getElementById('abr-q');
  var bufFill = document.getElementById('abr-buf-fill');
  var bufPct  = document.getElementById('abr-buf-pct');
  var rebuf   = document.getElementById('abr-rebuf');
  var events  = document.getElementById('abr-events');

  var tiers = [
    { label: '240p',  minMbps: 0,    bufPct: 5,  bufSec: 2  },
    { label: '360p',  minMbps: 0.3,  bufPct: 18, bufSec: 8  },
    { label: '480p',  minMbps: 0.8,  bufPct: 32, bufSec: 14 },
    { label: '720p',  minMbps: 2.0,  bufPct: 52, bufSec: 20 },
    { label: '1080p', minMbps: 3.5,  bufPct: 72, bufSec: 28 },
    { label: '4K',    minMbps: 7.0,  bufPct: 90, bufSec: 38 }
  ];

  var bwBreakpoints = [0.08, 0.2, 0.4, 1.0, 2.5, 7.0, 12, 25, 50];

  function sliderToMbps(v) {
    var idx = Math.floor(v / 100 * (bwBreakpoints.length - 1));
    var frac = (v / 100 * (bwBreakpoints.length - 1)) - idx;
    if (idx >= bwBreakpoints.length - 1) return bwBreakpoints[bwBreakpoints.length - 1];
    return bwBreakpoints[idx] + frac * (bwBreakpoints[idx + 1] - bwBreakpoints[idx]);
  }

  function formatMbps(m) {
    if (m < 1) return Math.round(m * 1000) + ' kbps';
    return m.toFixed(1) + ' Mbps';
  }

  var prevTier = null;
  var rebufTimer = null;

  function update() {
    var mbps = sliderToMbps(parseInt(slider.value));
    bwVal.textContent = formatMbps(mbps);

    var chosen = tiers[0];
    for (var i = tiers.length - 1; i >= 0; i--) {
      if (mbps >= tiers[i].minMbps) { chosen = tiers[i]; break; }
    }

    var tierChanged = prevTier && prevTier.label !== chosen.label;
    qBadge.textContent = chosen.label;

    if (chosen.label === '4K')    { qBadge.style.borderColor = '#fbef8a'; qBadge.style.color = '#fbef8a'; }
    else if (chosen.label === '1080p') { qBadge.style.borderColor = '#7bcdab'; qBadge.style.color = '#7bcdab'; }
    else if (chosen.label === '720p')  { qBadge.style.borderColor = '#89c0d0'; qBadge.style.color = '#89c0d0'; }
    else { qBadge.style.borderColor = '#f08080'; qBadge.style.color = '#f08080'; }

    bufFill.style.width = chosen.bufPct + '%';
    bufPct.textContent  = chosen.bufSec + 's';

    if (mbps < 0.25) {
      rebuf.textContent = '⚠ Rebuffering…';
      rebuf.style.opacity = '1';
    } else {
      rebuf.textContent = '';
      rebuf.style.opacity = '0';
    }

    if (tierChanged) {
      var dir = chosen.minMbps > prevTier.minMbps ? '⬆ upgraded' : '⬇ downgraded';
      events.textContent = dir + ' to ' + chosen.label + ' (' + formatMbps(mbps) + ' available)';
    }
    prevTier = chosen;
  }

  slider.addEventListener('input', update);
  update();
})();
</script>

The algorithm that decides when to upgrade or downgrade is non-trivial. Too aggressive upgrading causes rebuffering when bandwidth drops suddenly. Too conservative means users on fast connections watch 480p unnecessarily. Modern players use **model predictive control** — estimating future bandwidth from recent history to pre-emptively switch.

---

## 6. Level 5 — CDN Architecture

<div class="level-badge">Level 5 · CDN</div>

With 11.5 million concurrent viewers, all requests hitting origin servers is physically impossible. A single data centre cannot sustain 46+ Tbps of egress. The solution: **Content Delivery Networks**.

A CDN is a network of 200–2,000 geographically distributed **Points of Presence (PoPs)** — edge servers that cache content close to users. A viewer in Tokyo fetches segments from a Tokyo PoP, not from a US origin. Round-trip latency drops from 180ms to 8ms. For popular videos, cache hit rates exceed 99% — the origin never sees the request.

**Interactive — CDN World Map:**

<div id="cdn-wrap">
  <h4>🌍 CDN Points of Presence</h4>
  <div id="cdn-map">
    <canvas id="cdn-canvas"></canvas>
  </div>
  <div class="cdn-legend">
    <span><span class="dot dot-pop"></span> CDN PoP</span>
    <span><span class="dot dot-user"></span> Your viewer</span>
    <span><span class="dot dot-origin"></span> Origin (US-East)</span>
  </div>
  <div class="cdn-btns">
    <button class="cdn-btn" id="cdn-hit-btn">▶ Simulate Cache Hit</button>
    <button class="cdn-btn" id="cdn-miss-btn">▶ Simulate Cache Miss</button>
    <button class="cdn-btn" id="cdn-reset-btn">↺ Reset</button>
  </div>
  <div id="cdn-status">Click a simulation button to see how requests travel.</div>
</div>

<script>
(function() {
  var canvas = document.getElementById('cdn-canvas');
  var ctx    = canvas.getContext('2d');
  var status = document.getElementById('cdn-status');

  var pops = [
    { name: 'US-West',    rx: 0.10, ry: 0.38 },
    { name: 'US-East',    rx: 0.23, ry: 0.35, origin: true },
    { name: 'EU-West',    rx: 0.46, ry: 0.28 },
    { name: 'EU-East',    rx: 0.53, ry: 0.25 },
    { name: 'Asia-East',  rx: 0.82, ry: 0.35 },
    { name: 'Asia-South', rx: 0.72, ry: 0.50 },
    { name: 'SA-East',    rx: 0.30, ry: 0.68 },
    { name: 'AU-East',    rx: 0.87, ry: 0.72 }
  ];

  var user = { rx: 0.82, ry: 0.35 };
  var animState = null;
  var animT = 0;
  var animId = null;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();
  }

  function px(pop) {
    return { x: pop.rx * canvas.width, y: pop.ry * canvas.height };
  }

  function drawGrid() {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (var x = 0; x < canvas.width; x += canvas.width / 12) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (var y = 0; y < canvas.height; y += canvas.height / 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    var continents = [
      { x: 0.05, y: 0.22, w: 0.22, h: 0.32 },
      { x: 0.28, y: 0.38, w: 0.12, h: 0.34 },
      { x: 0.40, y: 0.18, w: 0.18, h: 0.32 },
      { x: 0.58, y: 0.15, w: 0.28, h: 0.38 },
      { x: 0.75, y: 0.60, w: 0.14, h: 0.22 }
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    continents.forEach(function(c) {
      ctx.beginPath();
      ctx.roundRect(c.x * canvas.width, c.y * canvas.height, c.w * canvas.width, c.h * canvas.height, 8);
      ctx.fill();
    });
  }

  function drawPops() {
    pops.forEach(function(pop) {
      var p = px(pop);
      var isOrigin = pop.origin;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isOrigin ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isOrigin ? '#f08080' : '#7bcdab';
      ctx.fill();
      ctx.font = '10px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(pop.name, p.x + 8, p.y + 4);
    });
    var u = px(user);
    ctx.beginPath();
    ctx.arc(u.x, u.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fbef8a';
    ctx.fill();
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('Viewer', u.x + 8, u.y + 4);
  }

  function draw() {
    drawGrid();
    if (animState) {
      var segs = animState.segments;
      var total = segs.reduce(function(s, seg) { return s + seg.dur; }, 0);
      var elapsed = animT;
      ctx.save();
      segs.forEach(function(seg) {
        if (elapsed <= 0) return;
        var frac = Math.min(elapsed / seg.dur, 1);
        elapsed -= seg.dur;
        var a = px(seg.from), b = px(seg.to);
        var mx = a.x + (b.x - a.x) * frac;
        var my = a.y + (b.y - a.y) * frac;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mx, my);
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fillStyle = seg.color;
        ctx.fill();
      });
      ctx.restore();
    }
    drawPops();
  }

  function animate() {
    animT += 0.016;
    var total = animState.segments.reduce(function(s, seg) { return s + seg.dur; }, 0);
    draw();
    if (animT < total) {
      animId = requestAnimationFrame(animate);
    } else {
      draw();
      status.textContent = animState.endMsg;
      status.className = animState.hitClass;
    }
  }

  function stopAnim() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    animState = null; animT = 0;
  }

  function runHit() {
    stopAnim();
    var nearPop = pops[4];
    animState = {
      hitClass: 'hit',
      endMsg: '✓ Cache HIT — segment served from Asia-East PoP in ~8ms (vs ~185ms to origin)',
      segments: [
        { from: user, to: nearPop, dur: 0.6, color: '#7bcdab' },
        { from: nearPop, to: user, dur: 0.6, color: '#fbef8a' }
      ]
    };
    status.textContent = 'Viewer → Asia-East PoP (cache hit)…';
    status.className = '';
    animId = requestAnimationFrame(animate);
  }

  function runMiss() {
    stopAnim();
    var nearPop  = pops[4];
    var origin   = pops[1];
    animState = {
      hitClass: 'miss',
      endMsg: '✗ Cache MISS — PoP fetched from origin in ~185ms, now cached for next viewer',
      segments: [
        { from: user,    to: nearPop, dur: 0.35, color: '#7bcdab' },
        { from: nearPop, to: origin,  dur: 0.90, color: '#f08080' },
        { from: origin,  to: nearPop, dur: 0.90, color: '#f08080' },
        { from: nearPop, to: user,    dur: 0.35, color: '#7bcdab' }
      ]
    };
    status.textContent = 'Viewer → Asia-East PoP → US-East Origin (cache miss)…';
    status.className = '';
    animId = requestAnimationFrame(animate);
  }

  document.getElementById('cdn-hit-btn').addEventListener('click', runHit);
  document.getElementById('cdn-miss-btn').addEventListener('click', runMiss);
  document.getElementById('cdn-reset-btn').addEventListener('click', function() {
    stopAnim(); draw();
    status.textContent = 'Click a simulation button to see how requests travel.';
    status.className = '';
  });

  window.addEventListener('resize', resize);
  resize();
})();
</script>

**CDN cache strategy for video segments:**

- **Popular videos** (top 5%): pre-warm CDN caches proactively. Push segments to all PoPs before the video goes viral.
- **Long-tail videos** (95%): cache on first access. First viewer triggers an origin fetch; subsequent viewers get the cached copy.
- **Cache TTL**: typically 24h for video segments (content never changes), shorter for manifests (may update for live streams).
- **Invalidation**: if a video is taken down or re-encoded, send invalidation commands to all PoPs simultaneously.

---

## 7. Level 6 — Upload Pipeline

<div class="level-badge">Level 6 · Upload Pipeline</div>

{: class="marginalia" }
"YouTube re-encodes<br/>every uploaded video<br/>with **VP9** (their<br/>open-source codec)<br/>which achieves 50%<br/>better compression<br/>than H.264 at the<br/>same quality — that<br/>alone saves petabytes<br/>daily."

The upload path is entirely separate from the playback path. It is an asynchronous data processing pipeline, not a synchronous API call. **Click any component to learn more:**

<div class="upload-pipeline">
  <div class="up-row">
    <div class="up-node" data-detail="<strong>User Browser / Mobile App</strong><br/>Splits the file into 10 MB chunks before sending. Each chunk is uploaded independently over HTTPS. Progress bar reflects chunk confirmations, not total bytes sent.">
      <div class="up-label">📱 User (Browser / App)</div>
      <div class="up-desc">Chunked upload via HTTPS</div>
    </div>
  </div>
  <div class="up-arrow-v">↓</div>
  <div class="up-row">
    <div class="up-node" data-detail="<strong>Upload Service</strong><br/>Receives raw upload chunks. Validates auth tokens. Checks content policy (file type, size limits). Assembles chunks into a single object. Returns an upload ID immediately so the client can track progress. Does NOT transcode anything.">
      <div class="up-label">🔁 Upload Service</div>
      <div class="up-desc">Validates · assembles chunks · assigns video ID</div>
    </div>
  </div>
  <div class="up-arrow-v">↓</div>
  <div class="up-row">
    <div class="up-node" data-detail="<strong>Raw Object Storage (S3-compatible)</strong><br/>The assembled raw video file lands here. Immutable object — never modified after write. Bucket policy: private, no public access. Lifecycle rule: move to Glacier-class storage after 90 days if no re-encode is needed.">
      <div class="up-label">🗄 Raw Storage (S3)</div>
      <div class="up-desc">Immutable raw upload, private bucket</div>
    </div>
  </div>
  <div class="up-arrow-v">↓</div>
  <div class="up-row">
    <div class="up-node" data-detail="<strong>Message Queue (Kafka)</strong><br/>Upload service publishes a 'video.uploaded' event with the S3 path and video ID. Kafka durably persists it. Multiple consumer groups subscribe: transcoding workers, thumbnail generator, abuse scanner, metadata indexer. All run independently and at their own pace.">
      <div class="up-label">📨 Message Queue (Kafka)</div>
      <div class="up-desc">Decouples upload from processing · fan-out to workers</div>
    </div>
  </div>
  <div class="up-arrow-v">↓</div>
  <div class="up-row">
    <div class="up-node" data-detail="<strong>Transcoding Workers</strong><br/>Stateless workers consume Kafka events. Each worker pulls the raw video from S3, runs FFmpeg/libx264 to produce one quality variant, uploads the segments back to S3. Multiple workers run in parallel — a 1h video spawns 6+ parallel jobs (one per quality tier). Workers are auto-scaled based on Kafka consumer lag.">
      <div class="up-label">⚙️ Transcoding Workers (×N)</div>
      <div class="up-desc">Parallel · stateless · auto-scaled · FFmpeg</div>
    </div>
  </div>
  <div class="up-arrow-v">↓</div>
  <div class="up-row">
    <div class="up-node" data-detail="<strong>Processed Storage (S3)</strong><br/>All quality-variant segments (.ts files) plus manifests (.m3u8 / .mpd) land here. Public bucket — CDN can pull directly. Organised as: /videos/{video_id}/{quality}/segment_NNN.ts. Typical total size: 8–10 GB for a 1h video across all variants.">
      <div class="up-label">📦 Processed Storage (S3)</div>
      <div class="up-desc">Segments + manifests · public · CDN origin</div>
    </div>
  </div>
  <div class="up-arrow-v">↓</div>
  <div class="up-row">
    <div class="up-node" data-detail="<strong>CDN Invalidation + Metadata DB</strong><br/>A completion event triggers: (1) CDN pre-warm for predicted popular videos, (2) metadata DB write to mark video 'available', (3) search index update (title, description, tags), (4) notification to subscribers. The video is now publicly discoverable and playable.">
      <div class="up-label">🌐 CDN Pre-warm + Metadata DB</div>
      <div class="up-desc">Video becomes available · search indexed · notifications sent</div>
    </div>
  </div>
</div>

<div id="up-detail"></div>

<script>
(function() {
  var nodes   = document.querySelectorAll('.up-node');
  var detail  = document.getElementById('up-detail');
  nodes.forEach(function(node) {
    node.addEventListener('click', function() {
      nodes.forEach(function(n) { n.classList.remove('selected'); });
      var d = node.getAttribute('data-detail');
      if (detail.innerHTML === d && detail.classList.contains('visible')) {
        detail.classList.remove('visible');
        detail.innerHTML = '';
      } else {
        node.classList.add('selected');
        detail.innerHTML = d;
        detail.classList.add('visible');
      }
    });
  });
})();
</script>

---

## 8. Level 7 — Thumbnail Generation & Hover Preview

<div class="level-badge">Level 7 · Thumbnails</div>

YouTube's scrubbing preview (hover over the progress bar → see a frame from that timestamp) is powered by **sprite sheets** — a single image file containing hundreds of thumbnail frames laid out in a grid.

**The math:**
- 1-hour video, 1 frame extracted every 10 seconds = **360 thumbnails**
- Each thumbnail: 160 × 90 px (keep them small — hover previews are small)
- Grid layout: 20 columns × 18 rows = 360 cells
- Single sprite sheet: 3200 × 1620 px = ~500 KB (JPEG compressed)

**Why a sprite sheet instead of 360 separate files?**

360 HTTP requests vs 1 HTTP request. The player uses CSS `background-position` to show the right frame:

<div class="code-wrap">
  <div class="code-lang">
    <span>Sprite sheet hover preview (CSS)</span>
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="cm">/* Seek to 4m 30s = frame at 270s / 10 = frame #27 */</span>
<span class="cm">/* Grid col = 27 % 20 = 7, row = floor(27 / 20) = 1 */</span>
<span class="ty">.preview-thumb</span> {
  <span class="kw">width</span>:  <span class="nu">160px</span>;
  <span class="kw">height</span>: <span class="nu">90px</span>;
  <span class="kw">background-image</span>:    <span class="fn">url</span>(<span class="st">sprite_sheet.jpg</span>);
  <span class="kw">background-size</span>:     <span class="nu">3200px 1620px</span>;
  <span class="kw">background-position</span>: <span class="op">-</span><span class="nu">1120px</span> <span class="op">-</span><span class="nu">90px</span>; <span class="cm">/* col×160, row×90 */</span>
}</pre>
</div>

The sprite sheet generation is another Kafka consumer — a separate lightweight worker that extracts frames with FFmpeg (`ffmpeg -vf fps=0.1 -s 160x90 frame_%04d.jpg`) and stitches them into a grid with ImageMagick.

---

## 9. Level 8 — Resumable Uploads

<div class="level-badge">Level 8 · Resumable Uploads</div>

A creator uploads a 10 GB 4K video on a spotty connection. At 70% — 7 GB transferred — the connection drops. Without resumable uploads, they restart from zero.

**The Google Resumable Upload API pattern:**

<div class="code-wrap">
  <div class="code-lang">
    <span>Resumable upload flow</span>
    <button class="copy-btn" onclick="copyCode(this)">copy</button>
  </div>
  <pre class="code-block"><span class="cm">// Step 1: Initiate — get a resumable upload URI</span>
<span class="kw">POST</span> <span class="st">/upload/videos?uploadType=resumable</span>
<span class="ty">X-Upload-Content-Length</span>: <span class="nu">10737418240</span>  <span class="cm">// 10 GB</span>
<span class="ty">X-Upload-Content-Type</span>: <span class="st">video/mp4</span>
<span class="cm">// Response: 200 OK</span>
<span class="ty">Location</span>: <span class="st">https://upload.example.com/upload/videos?upload_id=xa298sd</span>

<span class="cm">// Step 2: Upload in 10 MB chunks</span>
<span class="kw">PUT</span> <span class="st">/upload/videos?upload_id=xa298sd</span>
<span class="ty">Content-Range</span>: <span class="st">bytes 0-10485759/10737418240</span>
<span class="cm">// … chunk body … Response: 308 Resume Incomplete</span>

<span class="cm">// Step 3: After connection drop — query resume position</span>
<span class="kw">PUT</span> <span class="st">/upload/videos?upload_id=xa298sd</span>
<span class="ty">Content-Range</span>: <span class="st">bytes */10737418240</span>
<span class="cm">// Response: 308, Range: bytes=0-7340031999</span>
<span class="cm">// Server confirms: "I have bytes 0–7GB. Resume from byte 7,340,032,000."</span>

<span class="cm">// Step 4: Resume from confirmed position</span>
<span class="kw">PUT</span> <span class="st">/upload/videos?upload_id=xa298sd</span>
<span class="ty">Content-Range</span>: <span class="st">bytes 7340032000-10737418239/10737418240</span></pre>
</div>

The server tracks received byte ranges per upload session in a fast key-value store (Redis). Session expires after 24 hours of inactivity. No need to re-upload confirmed chunks.

<div class="callout callout-yellow">
  <strong>Implementation detail:</strong> Chunk size matters. 10 MB chunks are a common default — small enough that a retry only re-sends 10 MB, large enough that the overhead of one HTTP request per chunk is negligible at typical upload speeds. At very low bandwidth, use 256 KB chunks. At fiber speeds, use 32 MB.
</div>

---

## 10. Capacity Estimation

<table class="cap-table">
  <thead>
    <tr>
      <th>Metric</th>
      <th>Calculation</th>
      <th style="text-align:right">Value</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Upload rate</td><td>Given</td><td class="num">500 h/min</td></tr>
    <tr><td>Raw upload storage/hr</td><td>500h × 60min × ~1GB/h avg raw</td><td class="num">30 TB/hr</td></tr>
    <tr><td>After transcoding (6 variants + overhead)</td><td>30 TB × ~5×</td><td class="num">150 TB/hr</td></tr>
    <tr><td>New storage per day</td><td>150 TB × 24h</td><td class="num">3.6 PB/day</td></tr>
    <tr><td>Concurrent viewers</td><td>1B h/day ÷ 86400s × avg watch 30min</td><td class="num">~11.5M</td></tr>
    <tr><td>CDN egress bandwidth</td><td>11.5M × 4 Mbps avg</td><td class="num">46 Tbps</td></tr>
    <tr><td>CDN egress per day (data)</td><td>1B h × 4 Mbps = 1B × 1800 MB</td><td class="num">~500 PB/day</td></tr>
    <tr><td>Transcoding workers needed</td><td>500h/min ÷ ~10 h/worker/min (4K)</td><td class="num">50+ workers</td></tr>
    <tr><td>Thumbnail sprite sheets/day</td><td>500h/min × 60 × avg 30min video</td><td class="num">~900K videos/day</td></tr>
    <tr><td>Segments per 1h video (all variants)</td><td>6 qualities × 600 segments</td><td class="num">3,600 S3 objects</td></tr>
  </tbody>
</table>

<div class="callout callout-red">
  <strong>The uncomfortable number:</strong> 500 PB/day of CDN egress at even $0.005/GB = $2.5M/day in bandwidth alone. YouTube's CDN is almost entirely self-operated (Google's own network), reducing this cost by ~90%. For a startup, CDN cost is the single largest variable cost in video streaming.
</div>

---

## 11. Protocol Comparison: HLS vs DASH vs WebRTC

<table class="compare-table">
  <thead>
    <tr>
      <th>Feature</th>
      <th>HLS</th>
      <th>DASH</th>
      <th>WebRTC</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Typical latency</td>
      <td class="part">6–30 s</td>
      <td class="part">6–30 s</td>
      <td class="yes">&lt;500 ms</td>
    </tr>
    <tr>
      <td>Adaptive Bitrate</td>
      <td class="yes">Yes</td>
      <td class="yes">Yes</td>
      <td class="part">Limited</td>
    </tr>
    <tr>
      <td>Segment format</td>
      <td>.ts (MPEG-TS)</td>
      <td>.mp4 (fMP4)</td>
      <td>RTP packets</td>
    </tr>
    <tr>
      <td>Manifest format</td>
      <td>.m3u8</td>
      <td>.mpd (XML)</td>
      <td>SDP (ICE)</td>
    </tr>
    <tr>
      <td>Apple native</td>
      <td class="yes">Yes (Safari)</td>
      <td class="no">No (need MSE)</td>
      <td class="yes">Yes</td>
    </tr>
    <tr>
      <td>CDN-friendly</td>
      <td class="yes">Yes (static files)</td>
      <td class="yes">Yes (static files)</td>
      <td class="no">No (peer-to-peer)</td>
    </tr>
    <tr>
      <td>DRM support</td>
      <td class="yes">FairPlay</td>
      <td class="yes">Widevine / PlayReady</td>
      <td class="part">DTLS-SRTP</td>
    </tr>
    <tr>
      <td>Use case</td>
      <td>VOD · Live streaming</td>
      <td>VOD · Live streaming</td>
      <td>Video calls · gaming</td>
    </tr>
    <tr>
      <td>Who uses it</td>
      <td>Apple TV+, Twitch</td>
      <td>YouTube, Netflix</td>
      <td>Meet, Zoom, Discord</td>
    </tr>
  </tbody>
</table>

**Low-latency variants:** Both HLS and DASH have low-latency extensions (LL-HLS, LL-DASH) that achieve 1–3 s latency by using partial segments. Twitch uses LL-HLS for ~3 s live latency.

---

## 12. Summary — Levels at a Glance

| Level | Problem solved | Technique |
|-------|----------------|-----------|
| 1 | Baseline | Serve raw file over HTTP |
| 2 | Codec compat + bandwidth tiers | Transcoding pipeline (FFmpeg, 6 variants) |
| 3 | Buffering, seeking | Chunked HLS/DASH segments + manifest |
| 4 | Variable bandwidth | Adaptive Bitrate (ABR) switching |
| 5 | Global scale, latency | CDN with 200+ PoPs, 99%+ cache hit |
| 6 | Async processing | Kafka-driven upload pipeline |
| 7 | Hover preview | Sprite sheet thumbnails (1 file = 360 frames) |
| 8 | Large file resilience | Resumable chunked uploads |

In an interview, walk through Levels 2–5 in order — transcoding, chunking, ABR, CDN. That covers 90% of what interviewers want. Then add the upload pipeline as a follow-up. Mention resumable uploads if asked about reliability. Always end with the capacity numbers — 500 PB/day egress signals that you understand the true scale.

<script>
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre.code-block');
  var text = pre ? pre.innerText : '';
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function(){ btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}
</script>
