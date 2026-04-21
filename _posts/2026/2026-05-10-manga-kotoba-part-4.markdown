---
layout: post
title: "Manga Kotoba, Part 4: Going Live — Heroku, RDS, S3 and the Ephemeral Filesystem"
date: 2026-05-10 10:00:00 +0000
categories: ["post"]
tags: [heroku, deployment, aws, s3, rds, devops, symfony]
series: manga-kotoba
---

<!-- =====================================================================
     STYLES
     ===================================================================== -->
<style>
/* ── Series progress bar ──────────────────────────────────────────────── */
.series-bar {
  display: flex; gap: 8px; margin: 0 0 2rem; flex-wrap: wrap;
}
.series-step {
  flex: 1; min-width: 0; padding: 10px 14px; border-radius: 8px;
  background: #1e1f24; border: 1px solid #2e2f35; text-align: center;
  font-size: 12px; color: rgba(255,255,255,.45); transition: border-color .2s;
  cursor: default;
}
.series-step .s-num { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
.series-step .s-title { margin-top: 3px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.series-step.active {
  background: #232418; border-color: #fbef8a; color: #fbef8a; font-weight: 700;
}
.series-step.done {
  background: #19261f; border-color: #7bcdab; color: #7bcdab;
}
@media (max-width: 600px) {
  .series-step .s-title { display: none; }
  .series-step { padding: 8px 6px; }
}

/* ── General post components ──────────────────────────────────────────── */
.tip {
  border-left: 3px solid #7bcdab; background: #1a2e23; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.tip strong { color: #7bcdab; }
.warn {
  border-left: 3px solid #fbef8a; background: #2a2a1a; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.warn strong { color: #fbef8a; }
.danger {
  border-left: 3px solid #f08080; background: #2a1a1a; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.danger strong { color: #f08080; }
.commit-ref {
  display: inline-block; font-family: 'JetBrains Mono', monospace;
  background: #1e1f24; border: 1px solid #2e2f35; border-radius: 4px;
  padding: 1px 7px; font-size: 12px; color: #7bcdab;
  text-decoration: none;
}
.commit-ref:hover { border-color: #7bcdab; }

/* ── Code blocks ─────────────────────────────────────────────────────── */
pre.code-block {
  background: #111214; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 18px 20px; overflow-x: auto; font-family: 'JetBrains Mono', monospace;
  font-size: 13px; line-height: 1.7; margin: 1.4rem 0;
}
pre.code-block .kw  { color: #cc99cd; }
pre.code-block .fn  { color: #7bcdab; }
pre.code-block .str { color: #fbef8a; }
pre.code-block .cm  { color: rgba(255,255,255,.3); font-style: italic; }
pre.code-block .ty  { color: #7ab8cd; }
pre.code-block .var { color: #e0e0e0; }
pre.code-block .num { color: #f08080; }
pre.code-block .att { color: #ffa07a; }
.code-label {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  color: rgba(255,255,255,.35); text-transform: uppercase; letter-spacing: .08em;
  margin: 1.6rem 0 -0.6rem;
}

/* ── Architecture diagram ─────────────────────────────────────────────── */
.arch-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 12px;
  padding: 24px; margin: 1.6rem 0; position: relative; overflow: hidden;
}
.arch-wrap h3 { margin: 0 0 20px; color: #fbef8a; font-size: 15px; }
.arch-stage {
  display: flex; align-items: center; justify-content: center;
  gap: 0; flex-wrap: nowrap; overflow-x: auto;
}
.arch-node {
  flex-shrink: 0; background: #1e1f24; border: 2px solid #2e2f35;
  border-radius: 10px; padding: 14px 18px; text-align: center;
  cursor: pointer; transition: border-color .2s, transform .18s, background .2s;
  min-width: 90px; max-width: 120px;
}
.arch-node:hover { border-color: #7bcdab; transform: translateY(-3px); background: #252629; }
.arch-node.active { border-color: #fbef8a; background: #28271a; }
.arch-node .an-icon { font-size: 26px; }
.arch-node .an-label { font-size: 11px; color: rgba(255,255,255,.55); margin-top: 5px; line-height: 1.3; }
.arch-node .an-name { font-size: 13px; font-weight: 700; color: #fff; margin-top: 2px; }
.arch-arrow {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
  gap: 3px; padding: 0 4px; position: relative;
}
.arch-arrow .ar-label { font-size: 10px; color: rgba(255,255,255,.3); white-space: nowrap; }
.arch-arrow .ar-line {
  width: 36px; height: 2px; background: linear-gradient(90deg, #3a3b40, #7bcdab44);
  position: relative;
}
.arch-arrow .ar-line::after {
  content: '▶'; position: absolute; right: -7px; top: -7px;
  font-size: 10px; color: #7bcdab44;
}
.arch-info {
  margin-top: 20px; background: #1a2e23; border-radius: 8px;
  padding: 14px 18px; font-size: 14px; line-height: 1.7;
  display: none; border-left: 3px solid #7bcdab;
}
.arch-info.visible { display: block; }
.arch-info .ai-title { font-weight: 700; color: #7bcdab; margin-bottom: 6px; }
.arch-info .ai-detail { color: rgba(255,255,255,.75); }

/* ── Ephemeral filesystem demo ────────────────────────────────────────── */
.eph-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 12px;
  padding: 24px; margin: 1.6rem 0;
}
.eph-wrap h3 { margin: 0 0 6px; color: #fbef8a; font-size: 15px; }
.eph-subtitle { font-size: 13px; color: rgba(255,255,255,.45); margin: 0 0 20px; }
.eph-stage {
  display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap;
  justify-content: center;
}
.eph-col {
  flex: 1; min-width: 180px; max-width: 240px;
  background: #1a1b20; border-radius: 8px; border: 1px solid #2e2f35;
  padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
}
.eph-col-title {
  font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
  color: rgba(255,255,255,.4); margin-bottom: 10px; border-bottom: 1px solid #2e2f35;
  padding-bottom: 6px;
}
.eph-file {
  display: flex; align-items: center; gap: 7px;
  padding: 4px 0; transition: opacity .4s;
}
.eph-file .ef-icon { font-size: 14px; }
.eph-file .ef-name { color: rgba(255,255,255,.7); }
.eph-file.gone { opacity: 0; }
.eph-file.gone .ef-icon::after { content: ' ✗'; color: #f08080; }
.eph-s3-item {
  display: flex; align-items: center; gap: 7px;
  padding: 4px 0; opacity: 0; transition: opacity .4s;
}
.eph-s3-item.visible { opacity: 1; }
.eph-s3-item .ef-icon { color: #7bcdab; }
.eph-actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
.eph-btn {
  padding: 8px 18px; border-radius: 6px; font-size: 13px; cursor: pointer;
  border: 1px solid #3a3b40; background: #1e1f24; color: rgba(255,255,255,.75);
  transition: all .2s; font-family: 'JetBrains Mono', monospace;
}
.eph-btn:hover { border-color: #7bcdab; color: #fff; }
.eph-btn.danger-btn:hover { border-color: #f08080; color: #f08080; }
.eph-status {
  margin-top: 14px; font-size: 13px; font-family: 'JetBrains Mono', monospace;
  min-height: 20px; color: rgba(255,255,255,.5);
}
.eph-status .ok  { color: #7bcdab; }
.eph-status .err { color: #f08080; }
.eph-status .warn-c { color: #fbef8a; }

/* ── Terminal / deployment log ────────────────────────────────────────── */
.term-wrap {
  background: #0d0e10; border: 1px solid #2e2f35; border-radius: 12px;
  overflow: hidden; margin: 1.6rem 0; font-family: 'JetBrains Mono', monospace;
}
.term-bar {
  background: #1a1b20; padding: 10px 16px; display: flex;
  align-items: center; gap: 8px; border-bottom: 1px solid #2e2f35;
}
.term-dot { width: 12px; height: 12px; border-radius: 50%; }
.term-title { font-size: 12px; color: rgba(255,255,255,.35); margin-left: 4px; flex: 1; text-align: center; }
.term-body {
  padding: 16px 20px; min-height: 180px; font-size: 13px;
  line-height: 1.8; overflow-y: auto; max-height: 380px;
}
.term-line { margin: 0; white-space: pre-wrap; }
.term-line.t-cmd  { color: #7bcdab; }
.term-line.t-info { color: rgba(255,255,255,.55); }
.term-line.t-ok   { color: #7bcdab; }
.term-line.t-err  { color: #f08080; }
.term-line.t-warn { color: #fbef8a; }
.term-line.t-dim  { color: rgba(255,255,255,.3); }
.term-controls { padding: 12px 16px; border-top: 1px solid #1a1b20; display: flex; gap: 10px; flex-wrap: wrap; }
.term-btn {
  padding: 7px 16px; border-radius: 6px; font-size: 12px; cursor: pointer;
  border: 1px solid #3a3b40; background: #1a1b20; color: rgba(255,255,255,.65);
  transition: all .2s; font-family: 'JetBrains Mono', monospace;
}
.term-btn:hover { border-color: #7bcdab; color: #fff; }
.term-cursor {
  display: inline-block; width: 8px; height: 15px;
  background: #7bcdab; vertical-align: middle; animation: blink 1s step-end infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

/* ── Env var manager ──────────────────────────────────────────────────── */
.env-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 12px;
  padding: 24px; margin: 1.6rem 0;
}
.env-wrap h3 { margin: 0 0 16px; color: #fbef8a; font-size: 15px; }
.env-group-title {
  font-size: 11px; text-transform: uppercase; letter-spacing: .09em;
  color: rgba(255,255,255,.35); margin: 14px 0 6px;
}
.env-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; background: #1a1b20; border-radius: 7px;
  border: 1px solid #2e2f35; margin-bottom: 6px; cursor: pointer;
  transition: border-color .2s;
}
.env-row:hover { border-color: #7bcdab; }
.env-row.open { border-color: #fbef8a; background: #201f17; }
.env-key {
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
  color: #7bcdab; flex: 1; font-weight: 700;
}
.env-arrow { font-size: 10px; color: rgba(255,255,255,.3); transition: transform .2s; }
.env-row.open .env-arrow { transform: rotate(90deg); }
.env-detail {
  display: none; padding: 12px 14px; background: #141518;
  border-radius: 0 0 7px 7px; margin-top: -7px; margin-bottom: 6px;
  border: 1px solid #2e2f35; border-top: none; font-size: 13px; line-height: 1.8;
}
.env-detail.open { display: block; }
.env-detail .ed-label { font-size: 11px; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .07em; }
.env-detail .ed-val {
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  background: #0d0e10; padding: 3px 8px; border-radius: 4px;
  color: rgba(255,255,255,.6); display: inline-block; margin: 2px 0 8px;
}
.env-detail .ed-cmd {
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  background: #0d0e10; padding: 5px 10px; border-radius: 4px;
  color: #7bcdab; display: block; margin-top: 6px;
  white-space: pre-wrap; word-break: break-all;
}

/* ── Checklist ────────────────────────────────────────────────────────── */
.checklist-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 12px;
  padding: 24px; margin: 1.6rem 0;
}
.checklist-wrap h3 { margin: 0 0 16px; color: #fbef8a; font-size: 15px; }
.cl-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 10px 0; border-bottom: 1px solid #1e1f24; cursor: pointer;
  transition: all .15s; border-radius: 4px;
}
.cl-item:last-child { border-bottom: none; }
.cl-item:hover .cl-box { border-color: #7bcdab; }
.cl-box {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 5px;
  border: 2px solid #3a3b40; background: #1a1b20; margin-top: 1px;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s;
}
.cl-item.checked .cl-box {
  background: #7bcdab; border-color: #7bcdab; color: #19191c;
  font-size: 13px; font-weight: 900;
}
.cl-text { font-size: 14px; line-height: 1.5; }
.cl-item.checked .cl-text { text-decoration: line-through; color: rgba(255,255,255,.4); }
.cl-text .cl-sub { font-size: 12px; color: rgba(255,255,255,.35); display: block; margin-top: 2px; }
.cl-item.checked .cl-text .cl-sub { color: rgba(255,255,255,.2); }
.cl-progress {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
}
.cl-prog-bar {
  flex: 1; height: 6px; background: #2e2f35; border-radius: 3px; overflow: hidden;
}
.cl-prog-fill {
  height: 100%; background: linear-gradient(90deg, #7bcdab, #5bb894);
  border-radius: 3px; transition: width .4s ease;
}
.cl-prog-label { font-size: 12px; color: rgba(255,255,255,.45); white-space: nowrap; }
</style>

<!-- =====================================================================
     SERIES PROGRESS BAR
     ===================================================================== -->
<div class="series-bar">
  <div class="series-step done">
    <div class="s-num">Part 1</div>
    <div class="s-title">Architecture</div>
  </div>
  <div class="series-step done">
    <div class="s-num">Part 2</div>
    <div class="s-title">Scraper</div>
  </div>
  <div class="series-step done">
    <div class="s-num">Part 3</div>
    <div class="s-title">API &amp; Admin</div>
  </div>
  <div class="series-step active">
    <div class="s-num">Part 4</div>
    <div class="s-title">Going Live</div>
  </div>
  <div class="series-step">
    <div class="s-num">Part 5</div>
    <div class="s-title">iOS App</div>
  </div>
</div>

{: class="marginalia" }
🚢 Three days.<br/>That's how long<br/>"just deploying<br/>it" actually took.

I was done. Or so I thought.

The API was humming along in Docker. The admin panel worked. The scraper was pulling manga metadata with surgical precision, all images landing neatly in `public/uploads/`. I had written tests. I had *reviewed* those tests. The Symfony profiler showed clean queries. It was beautiful.

Then I typed `git push heroku main`.

Three days later — eyes bloodshot, surrounded by empty coffee cups and a browser history consisting entirely of Heroku docs, AWS forums, and very specific StackOverflow questions about PHP PDO SSL constants — I had a working production deployment.

This is the story of those three days.

---

## The Production Stack

{: class="marginalia" }
📐 Every component<br/>here cost me at least<br/>one unexpected<br/>error in production.

Before I get into the war stories, let me show you what the final architecture looks like. Click any component to learn what it does and how it connects to the rest of the system.

<div class="arch-wrap">
  <h3>Production architecture — click any component</h3>
  <div class="arch-stage">
    <div class="arch-node" id="an-ios" onclick="archClick('ios')">
      <div class="an-icon">📱</div>
      <div class="an-name">iOS App</div>
      <div class="an-label">SwiftUI client</div>
    </div>
    <div class="arch-arrow">
      <div class="ar-label">HTTPS</div>
      <div class="ar-line"></div>
    </div>
    <div class="arch-node" id="an-cf" onclick="archClick('cf')">
      <div class="an-icon">🔒</div>
      <div class="an-name">SSL / DNS</div>
      <div class="an-label">Heroku SSL + custom domain</div>
    </div>
    <div class="arch-arrow">
      <div class="ar-label">HTTP/1.1</div>
      <div class="ar-line"></div>
    </div>
    <div class="arch-node" id="an-heroku" onclick="archClick('heroku')">
      <div class="an-icon">🟣</div>
      <div class="an-name">Heroku Dyno</div>
      <div class="an-label">Nginx + PHP-FPM</div>
    </div>
    <div class="arch-arrow">
      <div class="ar-label">PDO/SSL</div>
      <div class="ar-line"></div>
    </div>
    <div class="arch-node" id="an-rds" onclick="archClick('rds')">
      <div class="an-icon">🗄️</div>
      <div class="an-name">Amazon RDS</div>
      <div class="an-label">MySQL 8.0</div>
    </div>
    <div class="arch-arrow">
      <div class="ar-label">HTTPS</div>
      <div class="ar-line"></div>
    </div>
    <div class="arch-node" id="an-s3" onclick="archClick('s3')">
      <div class="an-icon">🪣</div>
      <div class="an-name">Amazon S3</div>
      <div class="an-label">Cover images</div>
    </div>
  </div>
  <div class="arch-info" id="arch-info">
    <div class="ai-title" id="arch-info-title"></div>
    <div class="ai-detail" id="arch-info-detail"></div>
  </div>
</div>

The dyno is the brains of the operation — it runs both Nginx and PHP-FPM as sibling processes, started by a `Procfile`. The database lives in Amazon RDS (not Heroku's own add-ons, more on that), and images bypass the dyno's filesystem entirely and go straight to S3.

---

## The Procfile and the Heroku Way

{: class="marginalia" }
🐳 Locally I used<br/>`docker-compose.yml`.<br/>On Heroku the same<br/>`Dockerfile` runs,<br/>but `Procfile`<br/>takes over process<br/>management.

The shift from Docker Compose to Heroku is conceptually simple, but it trips people up the first time. Locally, `docker-compose.yml` manages how services start. On Heroku, a `Procfile` in the repo root does the job instead. My final `Procfile` looks like this:

<div class="code-label">Procfile</div>
<pre class="code-block"><span class="kw">release</span>: <span class="fn">php</span> bin/console doctrine:migrations:migrate --no-interaction
<span class="kw">web</span>:     <span class="fn">heroku-php-nginx</span> -C nginx_app.conf public/</pre>

Two lines. `release` runs once before traffic is routed to the new dyno — it's the right place for migrations (more on that shortly). `web` declares the actual server process using Heroku's official PHP buildpack helper that wires up Nginx and PHP-FPM together.

The `docker/entrypoint.sh` I used locally does the same job, but differently — it polls until the DB is ready, runs migrations, warms the cache, then execs PHP-FPM:

<div class="code-label">docker/entrypoint.sh (local only)</div>
<pre class="code-block"><span class="att">#!/bin/sh</span>
<span class="kw">set -e</span>

<span class="fn">echo</span> <span class="str">"Waiting for DB to be ready..."</span>
<span class="kw">until</span> <span class="fn">php</span> bin/console doctrine:migrations:status --no-interaction > /dev/null 2>&amp;1; <span class="kw">do</span>
  <span class="fn">echo</span> <span class="str">"  DB not ready yet, retrying..."</span>
  <span class="fn">sleep</span> <span class="num">3</span>
<span class="kw">done</span>

<span class="fn">echo</span> <span class="str">"Running migrations..."</span>
<span class="fn">php</span> bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration || <span class="kw">true</span>

<span class="fn">echo</span> <span class="str">"Clearing cache..."</span>
<span class="fn">php</span> bin/console cache:warmup --no-interaction || <span class="kw">true</span>

<span class="fn">echo</span> <span class="str">"Starting PHP-FPM..."</span>
<span class="kw">exec</span> <span class="fn">php-fpm</span></pre>

The polling loop makes sense with Docker Compose because the DB container might not be ready when the app container starts. On Heroku, RDS is always up — no polling needed.

---

## The Ephemeral Filesystem: The Lesson That Hurts

{: class="marginalia" }
💾 "Ephemeral" is a<br/>polite word for<br/>"everything you<br/>wrote to disk is<br/>gone on the next<br/>deploy."

Here is the gotcha that almost every developer runs into the first time they deploy a file-upload feature to Heroku:

**The filesystem does not persist between deploys.**

Every time you push to Heroku, the entire dyno is rebuilt from the Docker image. Any files written to disk during the previous dyno's lifetime — uploaded images, generated PDFs, cached thumbnails — simply do not exist anymore.

I discovered this at 11pm on day one, after spending the afternoon building a very pretty image upload UI. I deployed. I uploaded a manga cover. I visited the page. The image was there. I deployed again (fixing a typo in a CSS class). I visited the page. The image was gone.

The simulation below shows exactly what happened, and then the fix:

<div class="eph-wrap">
  <h3>🎬 Ephemeral filesystem simulator</h3>
  <p class="eph-subtitle">Upload files, then deploy — and watch what happens.</p>
  <div class="eph-stage">
    <div class="eph-col">
      <div class="eph-col-title">📁 Heroku dyno filesystem<br/><span style="color:#f08080">public/uploads/</span></div>
      <div id="eph-fs-list"></div>
    </div>
    <div class="eph-col">
      <div class="eph-col-title">🪣 Amazon S3<br/><span style="color:#7bcdab">manga-kotoba/covers/</span></div>
      <div id="eph-s3-list"></div>
    </div>
  </div>
  <div class="eph-actions">
    <button class="eph-btn" id="eph-upload-btn" onclick="ephUpload()">📤 Upload image (local disk)</button>
    <button class="eph-btn" id="eph-upload-s3-btn" onclick="ephUploadS3()" style="display:none">☁️ Upload image (S3)</button>
    <button class="eph-btn danger-btn" onclick="ephDeploy()">🚀 git push heroku main</button>
    <button class="eph-btn" onclick="ephReset()">↺ Reset</button>
  </div>
  <div class="eph-status" id="eph-status"></div>
</div>

The fix, once you understand the problem, is obvious: don't use the local filesystem. Use a proper object store — in this case, Amazon S3.

---

## Migrating Images to S3

{: class="marginalia" }
☁️ The `league/flysystem`<br/>abstraction is great<br/>for this, but I went<br/>with a thin custom<br/>wrapper so I could<br/>control the URL<br/>format exactly.

Flysystem is the canonical PHP approach to filesystem abstraction. You configure adapters (local, S3, GCS, SFTP) and swap them without changing application code. I ended up writing a lighter-weight `S3StorageService` instead — it gives me more control over the public URL format and the fallback behaviour.

First, the dependency:

<div class="code-label">terminal</div>
<pre class="code-block"><span class="fn">composer</span> require aws/aws-sdk-php</pre>

Then the service. The key design decision: `isConfigured()` returns `false` when the env vars are empty, so local development keeps working without any AWS setup:

<div class="code-label">src/Service/S3StorageService.php — commit 28828d3</div>
<pre class="code-block"><span class="kw">final class</span> <span class="ty">S3StorageService</span>
{
    <span class="kw">private</span> ?<span class="ty">S3Client</span> <span class="var">$client</span> = <span class="kw">null</span>;

    <span class="kw">public function</span> <span class="fn">__construct</span>(
        <span class="kw">private readonly</span> <span class="ty">string</span> <span class="var">$bucket</span>,
        <span class="kw">private readonly</span> <span class="ty">string</span> <span class="var">$region</span>,
        <span class="kw">private readonly</span> <span class="ty">string</span> <span class="var">$accessKeyId</span>,
        <span class="kw">private readonly</span> <span class="ty">string</span> <span class="var">$secretAccessKey</span>,
    ) {}

    <span class="kw">public function</span> <span class="fn">isConfigured</span>(): <span class="ty">bool</span>
    {
        <span class="kw">return</span> <span class="var">$this</span>-><span class="var">bucket</span> !== <span class="str">''</span> &amp;&amp; <span class="var">$this</span>-><span class="var">region</span> !== <span class="str">''</span>;
    }

    <span class="kw">public function</span> <span class="fn">upload</span>(<span class="ty">mixed</span> <span class="var">$source</span>, <span class="ty">string</span> <span class="var">$key</span>, <span class="ty">string</span> <span class="var">$mimeType</span> = <span class="str">'application/octet-stream'</span>): <span class="ty">string</span>
    {
        <span class="var">$body</span> = <span class="fn">is_string</span>(<span class="var">$source</span>) ? <span class="fn">fopen</span>(<span class="var">$source</span>, <span class="str">'rb'</span>) : <span class="var">$source</span>;

        <span class="var">$this</span>-><span class="fn">getClient</span>()-><span class="fn">putObject</span>([
            <span class="str">'Bucket'</span>      => <span class="var">$this</span>-><span class="var">bucket</span>,
            <span class="str">'Key'</span>         => <span class="var">$key</span>,
            <span class="str">'Body'</span>        => <span class="var">$body</span>,
            <span class="str">'ContentType'</span> => <span class="var">$mimeType</span>,
        ]);

        <span class="kw">return</span> <span class="var">$this</span>-><span class="fn">publicUrl</span>(<span class="var">$key</span>);
    }

    <span class="kw">public function</span> <span class="fn">publicUrl</span>(<span class="ty">string</span> <span class="var">$key</span>): <span class="ty">string</span>
    {
        <span class="cm">// Virtual-hosted-style: https://bucket.s3.region.amazonaws.com/key</span>
        <span class="kw">return</span> <span class="fn">sprintf</span>(<span class="str">'https://%s.s3.%s.amazonaws.com/%s'</span>, <span class="var">$this</span>-><span class="var">bucket</span>, <span class="var">$this</span>-><span class="var">region</span>, <span class="var">$key</span>);
    }
}</pre>

The `ImageDownloaderService` (used by the scraper to mirror cover images) changed from "save to `public/uploads/`" to "upload to S3 or fall back to disk":

<div class="code-label">Before (local disk only)</div>
<pre class="code-block"><span class="cm">/**
 * Downloads remote images to the local public/uploads/ directory
 * and returns a server-relative URL stored in the database.
 */</span>
<span class="kw">class</span> <span class="ty">ImageDownloaderService</span>
{
    <span class="kw">public function</span> <span class="fn">__construct</span>(
        <span class="kw">private readonly</span> <span class="ty">HttpClientInterface</span> <span class="var">$httpClient</span>,
        <span class="kw">private readonly</span> <span class="ty">string</span> <span class="var">$projectDir</span>,
    ) {}

    <span class="kw">public function</span> <span class="fn">download</span>(<span class="ty">string</span> <span class="var">$remoteUrl</span>, <span class="ty">string</span> <span class="var">$subfolder</span> = <span class="str">'covers'</span>): ?<span class="ty">string</span>
    {
        <span class="var">$ext</span>      = <span class="fn">pathinfo</span>(...);
        <span class="var">$basename</span> = <span class="fn">hash</span>(<span class="str">'sha256'</span>, <span class="var">$remoteUrl</span>) . <span class="str">'.'</span> . <span class="var">$ext</span>;
        <span class="var">$localPath</span> = <span class="var">$this</span>-><span class="var">projectDir</span> . <span class="str">'/public/uploads/'</span> . <span class="var">$subfolder</span> . <span class="str">'/'</span> . <span class="var">$basename</span>;

        <span class="cm">// ... write to local filesystem ...</span>
        <span class="kw">return</span> <span class="str">'/uploads/'</span> . <span class="var">$subfolder</span> . <span class="str">'/'</span> . <span class="var">$basename</span>; <span class="cm">// server-relative URL</span>
    }
}</pre>

<div class="code-label">After (S3 with local fallback) — commit 28828d3</div>
<pre class="code-block"><span class="cm">/**
 * Downloads remote images and stores them in S3 (when configured)
 * or on local disk (development fallback).
 */</span>
<span class="kw">class</span> <span class="ty">ImageDownloaderService</span>
{
    <span class="kw">public function</span> <span class="fn">__construct</span>(
        <span class="kw">private readonly</span> <span class="ty">HttpClientInterface</span> <span class="var">$httpClient</span>,
        <span class="kw">private readonly</span> <span class="ty">string</span> <span class="var">$projectDir</span>,
        <span class="kw">private readonly</span> <span class="ty">S3StorageService</span> <span class="var">$s3</span>,  <span class="cm">// new</span>
    ) {}

    <span class="kw">public function</span> <span class="fn">download</span>(<span class="ty">string</span> <span class="var">$remoteUrl</span>, <span class="ty">string</span> <span class="var">$subfolder</span> = <span class="str">'covers'</span>): ?<span class="ty">string</span>
    {
        <span class="var">$ext</span>      = <span class="fn">pathinfo</span>(...);
        <span class="var">$basename</span> = <span class="fn">hash</span>(<span class="str">'sha256'</span>, <span class="var">$remoteUrl</span>) . <span class="str">'.'</span> . <span class="var">$ext</span>;
        <span class="var">$key</span>      = <span class="var">$subfolder</span> . <span class="str">'/'</span> . <span class="var">$basename</span>;

        <span class="cm">// ... fetch $bytes from $remoteUrl ...</span>

        <span class="kw">if</span> (<span class="var">$this</span>-><span class="var">s3</span>-><span class="fn">isConfigured</span>()) {
            <span class="kw">return</span> <span class="var">$this</span>-><span class="var">s3</span>-><span class="fn">upload</span>(<span class="var">$stream</span>, <span class="var">$key</span>, <span class="var">$mimeType</span>);  <span class="cm">// full HTTPS URL</span>
        }

        <span class="cm">// Local fallback: write to public/uploads/</span>
        <span class="fn">file_put_contents</span>(<span class="var">$localPath</span>, <span class="var">$bytes</span>);
        <span class="kw">return</span> <span class="str">'/uploads/'</span> . <span class="var">$key</span>;
    }
}</pre>

### The ACL Gotcha

<span class="commit-ref">7f89234</span> was a one-line fix that took 45 minutes to diagnose.

The original `upload()` method included `'ACL' => 'public-read'` in the `putObject` call. AWS recently changed the default for new S3 buckets to **Object Ownership: Bucket owner enforced** — which means ACLs are *disabled at the bucket level*. If you try to set an ACL on an object in such a bucket, you get:

<div class="danger">
<strong>AccessControlListNotSupported:</strong> The bucket does not allow ACLs
</div>

The fix: remove the `ACL` line entirely. Public access is now controlled via the **bucket policy** instead, which is actually cleaner. One line deleted:

<div class="code-label">src/Service/S3StorageService.php — commit 7f89234</div>
<pre class="code-block">  <span class="var">$this</span>-><span class="fn">getClient</span>()-><span class="fn">putObject</span>([
      <span class="str">'Bucket'</span>      => <span class="var">$this</span>-><span class="var">bucket</span>,
      <span class="str">'Key'</span>         => <span class="var">$key</span>,
      <span class="str">'Body'</span>        => <span class="var">$body</span>,
      <span class="str">'ContentType'</span> => <span class="var">$mimeType</span>,
<span class="cm">-     'ACL'         => 'public-read',</span>  <span class="cm">// ← removed; bucket has ACLs disabled</span>
  ]);</pre>

---

## Amazon RDS: The SSL Nightmare

{: class="marginalia" }
🔐 The `global-bundle.pem`<br/>file from AWS is<br/>a common stumbling<br/>block — there are<br/>3 different ways<br/>to configure it<br/>and 2 of them<br/>don't work on<br/>Heroku.

The original plan was to use Heroku's JawsDB MySQL add-on. It works, but I wanted more control: larger instances, RDS-level backups, the ability to run in the same AWS region as my S3 bucket. So I switched to Amazon RDS.

That decision kicked off a 36-hour SSL certificate saga.

Play through the deployment log below to see every step of the journey:

<div class="term-wrap">
  <div class="term-bar">
    <div class="term-dot" style="background:#f08080"></div>
    <div class="term-dot" style="background:#fbef8a"></div>
    <div class="term-dot" style="background:#7bcdab"></div>
    <div class="term-title">heroku deployments — rds ssl saga</div>
  </div>
  <div class="term-body" id="term-body">
    <p class="term-line t-dim">Press "Play" to replay the deployment log</p>
    <p class="term-line"><span class="term-cursor"></span></p>
  </div>
  <div class="term-controls">
    <button class="term-btn" onclick="termPlay()">▶ Play</button>
    <button class="term-btn" onclick="termReset()">↺ Reset</button>
  </div>
</div>

The key insight: PDO's `MYSQL_ATTR_SSL_CA` (constant `1009`) and `MYSQL_ATTR_SSL_VERIFY_SERVER_CERT` (constant `1014`) need to be set using their integer values in `doctrine.yaml` because Symfony's YAML parser doesn't resolve PHP constants.

Here is the final working `doctrine.yaml` after commits `5ed1ee0` and `72c8e22`:

<div class="code-label">config/packages/doctrine.yaml — final state</div>
<pre class="code-block">doctrine:
    dbal:
        url: <span class="str">'%env(resolve:DATABASE_URL)%'</span>
        server_version: <span class="str">'8.0.42'</span>
        profiling_collect_backtrace: <span class="str">'%kernel.debug%'</span>
        options:
            <span class="cm"># PDO::MYSQL_ATTR_SSL_CA = 1009</span>
            <span class="num">1009</span>: <span class="str">'%kernel.project_dir%/global-bundle.pem'</span>
            <span class="cm"># PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT = 1014</span>
            <span class="cm"># Disable strict chain verification (Heroku OpenSSL vs multi-cert bundle).</span>
            <span class="cm"># Connection is still fully encrypted via TLS.</span>
            <span class="num">1014</span>: <span class="kw">false</span>
    orm:
        naming_strategy: doctrine.orm.naming_strategy.underscore_number_aware
        auto_mapping: <span class="kw">true</span></pre>

<div class="warn">
<strong>⚠️ Tradeoff:</strong> Setting <code>MYSQL_ATTR_SSL_VERIFY_SERVER_CERT = false</code> means we don't validate the RDS certificate chain. The connection is still encrypted, but you are theoretically vulnerable to a man-in-the-middle attack from inside AWS's network. For a hobby project this is acceptable. For anything handling sensitive data, spend the time to get the cert path working correctly.
</div>

---

## Database Migrations in Production

{: class="marginalia" }
🚀 A release phase in<br/>`Procfile` is one of<br/>the simplest and<br/>most reliable ways<br/>to handle database<br/>migrations in Heroku<br/>deployments.

Running database migrations in production is one of those things that looks simple and isn't. The naive approach is to run `doctrine:migrations:migrate` in the Docker entrypoint — but that means migrations run *in parallel with the old app still serving traffic*.

If migration A drops a column that the old app is still reading, you have a bad time.

Heroku's **release phase** solves this cleanly. Declare a `release` process in `Procfile`:

<div class="code-label">Procfile</div>
<pre class="code-block"><span class="kw">release</span>: <span class="fn">php</span> bin/console doctrine:migrations:migrate --no-interaction
<span class="kw">web</span>:     <span class="fn">heroku-php-nginx</span> -C nginx_app.conf public/</pre>

Heroku's behaviour:

1. Builds the new Docker image
2. Runs the `release` command in a one-off container using the **new** image
3. **Only if `release` exits 0**, routes traffic to the new `web` dynos
4. If `release` fails, the old dynos keep running — no downtime

This means migrations run atomically before the new code is live. No concurrent access to the new schema from the old code. It's not a full zero-downtime migration strategy (you still need backward-compatible migrations for that), but it's a huge improvement over running migrations in the entrypoint.

---

## The 400 on Admin Login

{: class="marginalia" }
🕵️ Heroku's reverse proxy<br/>changes the HTTP<br/>environment in subtle<br/>ways. Always test<br/>your auth flows<br/>in a staging env<br/>before going live.

After the SSL saga, I thought I was done. I opened the admin panel. Entered my credentials. Hit Submit.

**400 Bad Request.**

Locally it worked fine. On Heroku, 400. No other information. No logs. Just 400.

After an hour of adding `dump()` calls everywhere, I traced it to Symfony's `form_login` authenticator. The issue: Symfony's form login looks for specific request parameter names (`_username` and `_password` by default). My login form was sending `email` and `password`. Locally, some quirk of the request handling let this slide. On Heroku, with its reverse proxy adding headers and potentially changing Content-Type negotiation, it broke.

The fix was to explicitly tell Symfony which field names to use <span class="commit-ref">d6dbd2c</span>:

<div class="code-label">config/packages/security.yaml</div>
<pre class="code-block">security:
    firewalls:
        main:
            form_login:
                login_path: app_login
                check_path: app_login
                enable_csrf: <span class="kw">true</span>
                default_target_path: admin_index
<span class="fn">+               username_parameter: email</span>
<span class="fn">+               password_parameter: password</span>
            logout:
                path: app_logout
                target: app_login</pre>

---

## Environment Variables

{: class="marginalia" }
🔑 Never commit `.env`<br/>with real credentials<br/>to git. Use<br/>`heroku config:set`<br/>and keep your<br/>`.env` file for<br/>local defaults only.

One of the most important things to get right in any Heroku deployment: **environment variable hygiene**. The app needs a surprising number of them. Click each variable to see where it comes from and how to set it:

<div class="env-wrap">
  <h3>⚙️ Required Heroku config vars</h3>
  <div class="env-group-title">🏗️ Symfony core</div>
  <div id="env-list-symfony"></div>
  <div class="env-group-title">🗄️ Database</div>
  <div id="env-list-db"></div>
  <div class="env-group-title">🔐 JWT Authentication</div>
  <div id="env-list-jwt"></div>
  <div class="env-group-title">☁️ AWS / S3</div>
  <div id="env-list-aws"></div>
</div>

---

## The N+1 Query Bomb

{: class="marginalia" }
📊 The `max_questions`<br/>limit on RDS free tier<br/>is surprisingly low.<br/>One N+1 query in<br/>a list endpoint<br/>can hit it instantly.

When I switched from JawsDB to RDS free tier I hit a new problem almost immediately: the API started returning 500 errors under minimal load.

The logs showed: `SQLSTATE[HY000]: General error: 1226 User 'kotoba_user' has exceeded the 'max_questions' resource`

The culprit was a classic N+1 query in the manga listing endpoint. For each manga, the endpoint was executing a separate query to count its volumes. With 500 mangas in the DB, one page request fired 501 queries. Commit <span class="commit-ref">86dcf38</span> killed it with an eager JOIN:

<div class="code-label">Before — N+1</div>
<pre class="code-block"><span class="cm">// For each manga, a separate COUNT query — O(n) database calls</span>
<span class="kw">foreach</span> (<span class="var">$mangas</span> <span class="kw">as</span> <span class="var">$manga</span>) {
    <span class="var">$volumeCount</span> = <span class="var">$this</span>-><span class="var">volumeRepository</span>-><span class="fn">count</span>([<span class="str">'manga'</span> => <span class="var">$manga</span>]);
}</pre>

<div class="code-label">After — single JOIN</div>
<pre class="code-block"><span class="cm">// One query with LEFT JOIN + GROUP BY — O(1) database calls</span>
<span class="var">$qb</span>-><span class="fn">select</span>(<span class="str">'m, COUNT(v.id) AS HIDDEN volumeCount'</span>)
    -><span class="fn">leftJoin</span>(<span class="str">'m.volumes'</span>, <span class="str">'v'</span>)
    -><span class="fn">groupBy</span>(<span class="str">'m.id'</span>)
    -><span class="fn">addOrderBy</span>(<span class="str">'volumeCount'</span>, <span class="str">'DESC'</span>);</pre>

---

## Production Readiness Checklist

{: class="marginalia" }
✅ I went through this<br/>list at 2am before<br/>sharing the app URL.<br/>It's not exhaustive,<br/>but it covers the<br/>things that bit me<br/>most in this deploy.

Tick off each item as you go. Progress is tracked in the bar at the top.

<div class="checklist-wrap">
  <h3>🚀 Pre-launch checklist</h3>
  <div class="cl-progress">
    <div class="cl-prog-bar"><div class="cl-prog-fill" id="cl-fill" style="width:0%"></div></div>
    <div class="cl-prog-label" id="cl-label">0 / 9</div>
  </div>
  <div id="cl-items"></div>
</div>

---

## What's Next: Part 5

{: class="marginalia" }
📱 The iOS side of<br/>the project was<br/>where the real<br/>magic happened —<br/>swipe cards,<br/>furigana rendering,<br/>StoreKit paywall.

With the backend deployed and battle-tested, it was time to build the thing users actually touch: the iOS app.

Part 5 covers the SwiftUI deep-dive:
- **Onboarding flow** — welcome screens, permissions, initial manga selection
- **The swipe card UI** — the `DragGesture` implementation that makes vocabulary review feel satisfying
- **Furigana rendering** — combining `AttributedString` and a custom layout to show readings above kanji
- **StoreKit 2 paywall** — subscription management, purchase restoration, receipt validation

The backend is just plumbing. The iOS app is where the product lives.

---

<!-- =====================================================================
     ALL JAVASCRIPT
     ===================================================================== -->
<script>
(function () {
"use strict";

/* ── Architecture diagram ─────────────────────────────────────────────── */
var ARCH_DATA = {
  ios: {
    title: "iOS App (SwiftUI)",
    detail: "The SwiftUI client running on the user's iPhone. It talks to the Heroku API over HTTPS, fetching manga metadata, vocabulary words, and quiz data. Cover images are loaded directly from S3 CDN URLs stored in the database — the app never touches Heroku for images."
  },
  cf: {
    title: "SSL Termination + Custom Domain",
    detail: "Heroku provides automatic SSL certificates via Let's Encrypt for custom domains. The domain manga-kotoba.app is pointed to Heroku's DNS target. All HTTP traffic is permanently redirected to HTTPS at the router level — the app never sees an unencrypted request."
  },
  heroku: {
    title: "Heroku Dyno (Nginx + PHP-FPM)",
    detail: "A single Eco dyno running Nginx and PHP-FPM as sibling processes, wired together by the heroku-php-nginx buildpack helper. Nginx handles static files and proxies dynamic requests to PHP-FPM. The Procfile release phase runs Doctrine migrations before traffic is routed here."
  },
  rds: {
    title: "Amazon RDS — MySQL 8.0.42",
    detail: "A db.t3.micro RDS instance running MySQL 8.0.42 in us-east-1. Doctrine connects over TLS (MYSQL_ATTR_SSL_CA pointing to global-bundle.pem). Certificate chain verification is disabled to work around an OpenSSL/Heroku compatibility issue — the connection is still fully encrypted."
  },
  s3: {
    title: "Amazon S3 — Cover Images",
    detail: "All manga cover images live in an S3 bucket in us-east-1. The bucket has Object Ownership set to 'Bucket owner enforced' (ACLs disabled), and public read access is granted via a bucket policy. The iOS app fetches images directly from the virtual-hosted S3 URL — zero load on the Heroku dyno."
  }
};

function archClick(id) {
  document.querySelectorAll('.arch-node').forEach(function(n) { n.classList.remove('active'); });
  var node = document.getElementById('an-' + id);
  if (node) node.classList.add('active');
  var info = document.getElementById('arch-info');
  var title = document.getElementById('arch-info-title');
  var detail = document.getElementById('arch-info-detail');
  var d = ARCH_DATA[id];
  if (!d) return;
  title.textContent = d.title;
  detail.textContent = d.detail;
  info.classList.add('visible');
}
window.archClick = archClick;

/* ── Ephemeral filesystem simulator ──────────────────────────────────── */
var ephFiles = [];
var ephS3Files = [];
var s3Mode = false;
var ephCounter = 0;
var COVERS = ['naruto-v1.jpg', 'bleach-cover.avif', 'one-piece-v3.webp', 'demon-slayer.jpg', 'jjk-v5.avif'];

function ephRender() {
  var fsList = document.getElementById('eph-fs-list');
  var s3List = document.getElementById('eph-s3-list');
  fsList.innerHTML = '';
  s3List.innerHTML = '';

  if (ephFiles.length === 0) {
    fsList.innerHTML = '<div style="color:rgba(255,255,255,.25);font-size:12px;padding:6px 0">(empty)</div>';
  } else {
    ephFiles.forEach(function(f) {
      var div = document.createElement('div');
      div.className = 'eph-file' + (f.gone ? ' gone' : '');
      div.innerHTML = '<span class="ef-icon">' + (f.gone ? '❌' : '🖼️') + '</span><span class="ef-name">' + f.name + '</span>';
      fsList.appendChild(div);
    });
  }

  if (ephS3Files.length === 0) {
    s3List.innerHTML = '<div style="color:rgba(255,255,255,.25);font-size:12px;padding:6px 0">(empty)</div>';
  } else {
    ephS3Files.forEach(function(f) {
      var div = document.createElement('div');
      div.className = 'eph-s3-item' + (f.visible ? ' visible' : '');
      div.innerHTML = '<span class="ef-icon" style="color:#7bcdab">☁️</span><span class="ef-name" style="color:#7bcdab">' + f.name + '</span>';
      s3List.appendChild(div);
    });
  }
}

function ephSetStatus(html) {
  document.getElementById('eph-status').innerHTML = html;
}

function ephUpload() {
  if (ephCounter >= COVERS.length) {
    ephSetStatus('<span class="warn-c">⚠ No more sample files — click Reset</span>');
    return;
  }
  var name = COVERS[ephCounter++];
  ephFiles.push({ name: name, gone: false });
  ephRender();
  ephSetStatus('<span class="ok">✓ Uploaded ' + name + ' → public/uploads/covers/' + name + '</span>');
}
window.ephUpload = ephUpload;

function ephUploadS3() {
  if (ephCounter >= COVERS.length) {
    ephSetStatus('<span class="warn-c">⚠ No more sample files — click Reset</span>');
    return;
  }
  var name = COVERS[ephCounter++];
  ephS3Files.push({ name: name, visible: false });
  ephRender();
  setTimeout(function() {
    ephS3Files[ephS3Files.length - 1].visible = true;
    ephRender();
    ephSetStatus('<span class="ok">✓ Uploaded ' + name + ' → s3://manga-kotoba/covers/' + name + '</span>');
  }, 300);
}
window.ephUploadS3 = ephUploadS3;

function ephDeploy() {
  if (ephFiles.length === 0 && ephS3Files.length === 0) {
    ephSetStatus('<span class="warn-c">⚠ Upload some files first</span>');
    return;
  }
  ephSetStatus('<span class="warn-c">🚀 Deploying… building slug…</span>');
  setTimeout(function() {
    var localCount = ephFiles.length;
    ephFiles = [];
    ephRender();
    var s3Count = ephS3Files.length;
    if (localCount > 0 && s3Count === 0) {
      ephSetStatus('<span class="err">✗ Deploy complete — ' + localCount + ' file(s) wiped from ephemeral filesystem. Images gone.</span>');
    } else if (s3Count > 0 && localCount === 0) {
      ephSetStatus('<span class="ok">✓ Deploy complete — S3 files persist. ' + s3Count + ' image(s) still accessible.</span>');
    } else if (s3Count > 0 && localCount > 0) {
      ephSetStatus('<span class="err">✗ ' + localCount + ' local file(s) wiped.</span> <span class="ok">✓ ' + s3Count + ' S3 file(s) safe.</span>');
    } else {
      ephSetStatus('<span class="ok">✓ Deploy complete. Nothing to lose.</span>');
    }
    if (!s3Mode) {
      s3Mode = true;
      document.getElementById('eph-upload-btn').style.display = 'none';
      document.getElementById('eph-upload-s3-btn').style.display = '';
    }
  }, 1200);
}
window.ephDeploy = ephDeploy;

function ephReset() {
  ephFiles = [];
  ephS3Files = [];
  ephCounter = 0;
  s3Mode = false;
  document.getElementById('eph-upload-btn').style.display = '';
  document.getElementById('eph-upload-s3-btn').style.display = 'none';
  ephSetStatus('');
  ephRender();
}
window.ephReset = ephReset;

ephRender();

/* ── Deployment log terminal ─────────────────────────────────────────── */
var DEPLOY_STEPS = [
  { cls: 't-cmd',  text: '$ git push heroku main', delay: 0 },
  { cls: 't-info', text: 'Enumerating objects: 47, done.', delay: 600 },
  { cls: 't-info', text: 'Counting objects: 100% (47/47), done.', delay: 900 },
  { cls: 't-info', text: 'Writing objects: 100% (47/47), 8.52 KiB | 2.13 MiB/s, done.', delay: 1300 },
  { cls: 't-dim',  text: '-----> Building on the Heroku-24 stack', delay: 1800 },
  { cls: 't-dim',  text: '-----> Detected PHP app', delay: 2100 },
  { cls: 't-dim',  text: '-----> Composer: installing dependencies (optimized autoloader)', delay: 2400 },
  { cls: 't-dim',  text: '-----> Build succeeded, slug size: 42.3 MB', delay: 3200 },
  { cls: 't-warn', text: '-----> Running release command...', delay: 3800 },
  { cls: 't-info', text: '       > php bin/console doctrine:migrations:migrate --no-interaction', delay: 4000 },
  { cls: 't-err',  text: 'SQLSTATE[HY000]: SSL connection error: SSL certificate problem: unable', delay: 5000 },
  { cls: 't-err',  text: '       to get local issuer certificate', delay: 5050 },
  { cls: 't-err',  text: 'Error: Process exited with status 1', delay: 5100 },
  { cls: 't-err',  text: '! Release command declared: this new release will not be used', delay: 5400 },
  { cls: 't-dim',  text: '', delay: 6200 },
  { cls: 't-warn', text: '--- Attempt 2: adding global-bundle.pem to Docker image ---', delay: 6500 },
  { cls: 't-cmd',  text: '$ git push heroku main', delay: 7000 },
  { cls: 't-dim',  text: '-----> Build succeeded, slug size: 43.1 MB', delay: 8500 },
  { cls: 't-warn', text: '-----> Running release command...', delay: 9000 },
  { cls: 't-err',  text: 'SQLSTATE[HY000]: SSL connection error: SSL certificate problem:', delay: 10000 },
  { cls: 't-err',  text: '       certificate verify failed', delay: 10050 },
  { cls: 't-dim',  text: '', delay: 10500 },
  { cls: 't-warn', text: '--- Attempt 3: disable MYSQL_ATTR_SSL_VERIFY_SERVER_CERT ---', delay: 10800 },
  { cls: 't-cmd',  text: '$ git push heroku main', delay: 11300 },
  { cls: 't-dim',  text: '-----> Build succeeded, slug size: 43.1 MB', delay: 12800 },
  { cls: 't-warn', text: '-----> Running release command...', delay: 13300 },
  { cls: 't-info', text: '       > php bin/console doctrine:migrations:migrate', delay: 13600 },
  { cls: 't-ok',   text: '       [OK] No migrations to execute.', delay: 14400 },
  { cls: 't-ok',   text: '-----> Release command succeeded', delay: 14700 },
  { cls: 't-ok',   text: '-----> Launching... done, v18', delay: 15200 },
  { cls: 't-ok',   text: '       https://manga-kotoba.herokuapp.com/ deployed to Heroku', delay: 15600 },
];

var termPlaying = false;
var termTimers = [];

function termClear() {
  document.getElementById('term-body').innerHTML = '<p class="term-line"><span class="term-cursor"></span></p>';
}

function termReset() {
  termTimers.forEach(function(t) { clearTimeout(t); });
  termTimers = [];
  termPlaying = false;
  termClear();
}
window.termReset = termReset;

function termPlay() {
  if (termPlaying) return;
  termPlaying = true;
  termClear();
  var body = document.getElementById('term-body');
  DEPLOY_STEPS.forEach(function(step) {
    var t = setTimeout(function() {
      var cursor = body.querySelector('.term-cursor');
      if (cursor) cursor.parentElement.remove();
      var p = document.createElement('p');
      p.className = 'term-line ' + step.cls;
      p.textContent = step.text;
      body.appendChild(p);
      var cur = document.createElement('p');
      cur.className = 'term-line';
      cur.innerHTML = '<span class="term-cursor"></span>';
      body.appendChild(cur);
      body.scrollTop = body.scrollHeight;
    }, step.delay);
    termTimers.push(t);
  });
  var totalTime = DEPLOY_STEPS[DEPLOY_STEPS.length - 1].delay + 1000;
  var endT = setTimeout(function() { termPlaying = false; }, totalTime);
  termTimers.push(endT);
}
window.termPlay = termPlay;

/* ── Environment variable manager ───────────────────────────────────── */
var ENV_VARS = {
  symfony: [
    {
      key: 'APP_ENV',
      from: 'Symfony',
      example: 'prod',
      desc: 'Set to "prod" in production. Controls error display, caching, and debug tools. Never set to "dev" on a public server.',
      cmd: 'heroku config:set APP_ENV=prod'
    },
    {
      key: 'APP_SECRET',
      from: 'Generated',
      example: 'a9f3...8c2d (32 hex chars)',
      desc: 'A random 32-character secret used for CSRF tokens, session signing, and other cryptographic operations. Generate with: php -r "echo bin2hex(random_bytes(16));"',
      cmd: 'heroku config:set APP_SECRET=$(php -r "echo bin2hex(random_bytes(16));")'
    }
  ],
  db: [
    {
      key: 'DATABASE_URL',
      from: 'Amazon RDS',
      example: 'mysql://user:pass@host.rds.amazonaws.com:3306/dbname',
      desc: 'Full DSN for the RDS MySQL instance. Must include the username, password, hostname, port, and database name. Doctrine parses this automatically.',
      cmd: 'heroku config:set DATABASE_URL="mysql://kotoba:SECRET@manga-kotoba.caxw8k6qaocy.us-east-1.rds.amazonaws.com:3306/kotoba"'
    }
  ],
  jwt: [
    {
      key: 'JWT_SECRET_KEY',
      from: 'Generated (openssl)',
      example: '-----BEGIN RSA PRIVATE KEY----- ...',
      desc: 'The RSA private key used to sign JWT tokens. Generate a keypair with: openssl genrsa -out private.pem -aes256 4096. Store the contents of the PEM file here (not the file path).',
      cmd: 'heroku config:set JWT_SECRET_KEY="$(cat private.pem)"'
    },
    {
      key: 'JWT_PUBLIC_KEY',
      from: 'Generated (openssl)',
      example: '-----BEGIN PUBLIC KEY----- ...',
      desc: 'The RSA public key used to verify JWT tokens. Derived from the private key: openssl rsa -in private.pem -outform PEM -pubout -out public.pem.',
      cmd: 'heroku config:set JWT_PUBLIC_KEY="$(cat public.pem)"'
    },
    {
      key: 'JWT_PASSPHRASE',
      from: 'Generated',
      example: 'a long random passphrase',
      desc: 'The passphrase used to encrypt the JWT private key. Required if you generated the key with -aes256. Keep this secret — anyone with this and the encrypted private key can sign tokens.',
      cmd: 'heroku config:set JWT_PASSPHRASE="your-passphrase-here"'
    }
  ],
  aws: [
    {
      key: 'AWS_ACCESS_KEY_ID',
      from: 'AWS IAM',
      example: 'AKIA... (20 chars)',
      desc: 'The AWS access key ID for the IAM user that has s3:PutObject and s3:GetObject permissions on your bucket. Create a dedicated IAM user — never use root credentials.',
      cmd: 'heroku config:set AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE'
    },
    {
      key: 'AWS_SECRET_ACCESS_KEY',
      from: 'AWS IAM',
      example: 'wJalrXUtn... (40 chars)',
      desc: 'The secret access key paired with the access key ID above. You only see this once when creating the IAM user — store it securely immediately.',
      cmd: 'heroku config:set AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    },
    {
      key: 'AWS_S3_BUCKET',
      from: 'AWS S3 console',
      example: 'manga-kotoba-covers',
      desc: 'The name of the S3 bucket where cover images are stored. Must be in the same region as AWS_S3_REGION. Object Ownership should be set to "Bucket owner enforced".',
      cmd: 'heroku config:set AWS_S3_BUCKET=manga-kotoba-covers'
    },
    {
      key: 'AWS_S3_REGION',
      from: 'AWS S3 console',
      example: 'us-east-1',
      desc: 'The AWS region where your S3 bucket lives. Should match the region of your RDS instance to minimise latency and data transfer costs.',
      cmd: 'heroku config:set AWS_S3_REGION=us-east-1'
    }
  ]
};

function buildEnvGroup(listId, vars) {
  var container = document.getElementById(listId);
  if (!container) return;
  vars.forEach(function(v, i) {
    var rowId = listId + '-row-' + i;
    var detailId = listId + '-detail-' + i;
    var row = document.createElement('div');
    row.className = 'env-row';
    row.id = rowId;
    row.innerHTML = '<span class="env-key">' + v.key + '</span>'
      + '<span style="font-size:11px;color:rgba(255,255,255,.3);margin-right:auto">' + v.from + '</span>'
      + '<span class="env-arrow">▶</span>';
    row.addEventListener('click', function() {
      var isOpen = row.classList.contains('open');
      document.querySelectorAll('.env-row.open').forEach(function(r) {
        r.classList.remove('open');
        var d = document.getElementById(r.id.replace('-row-', '-detail-'));
        if (d) d.classList.remove('open');
      });
      if (!isOpen) {
        row.classList.add('open');
        var detail = document.getElementById(detailId);
        if (detail) detail.classList.add('open');
      }
    });
    container.appendChild(row);
    var detail = document.createElement('div');
    detail.className = 'env-detail';
    detail.id = detailId;
    detail.innerHTML = '<div class="ed-label">Description</div>'
      + '<div style="color:rgba(255,255,255,.7);margin-bottom:10px;font-size:13px">' + v.desc + '</div>'
      + '<div class="ed-label">Example value</div>'
      + '<span class="ed-val">' + v.example + '</span>'
      + '<div class="ed-label" style="margin-top:8px">How to set</div>'
      + '<div class="ed-cmd">' + v.cmd + '</div>';
    container.appendChild(detail);
  });
}

buildEnvGroup('env-list-symfony', ENV_VARS.symfony);
buildEnvGroup('env-list-db',      ENV_VARS.db);
buildEnvGroup('env-list-jwt',     ENV_VARS.jwt);
buildEnvGroup('env-list-aws',     ENV_VARS.aws);

/* ── Production checklist ────────────────────────────────────────────── */
var CL_ITEMS = [
  {
    text: 'Ephemeral filesystem handled',
    sub: 'Use S3, GCS, or a CDN for any user-uploaded or generated files — never the local dyno filesystem'
  },
  {
    text: 'Database on a managed service',
    sub: 'RDS, PlanetScale, Supabase, or similar — not a local container or Heroku add-on with limited headroom'
  },
  {
    text: 'Migrations in the release phase',
    sub: 'Declare "release: php bin/console doctrine:migrations:migrate" in Procfile so migrations run before traffic'
  },
  {
    text: 'ENV vars set in Heroku config',
    sub: 'Use heroku config:set — never commit real credentials to .env or any file tracked by git'
  },
  {
    text: 'HTTPS enforced, HTTP redirects to HTTPS',
    sub: 'Heroku router handles this automatically for custom domains with Automated Certificate Management'
  },
  {
    text: 'Indexes on all foreign keys and common query columns',
    sub: 'Run EXPLAIN on your most frequent API queries and check for full table scans'
  },
  {
    text: 'CORS configured for your iOS app bundle ID / domain',
    sub: 'Set the Access-Control-Allow-Origin header specifically — never use * in production'
  },
  {
    text: 'Error reporting set up (Sentry / Rollbar)',
    sub: 'You need to know about 500s in production before your users tell you'
  },
  {
    text: 'Rate limiting on public API endpoints',
    sub: 'Symfony RateLimiter or an Nginx limit_req_zone — protect against scraping and abuse'
  }
];

var clChecked = new Array(CL_ITEMS.length).fill(false);

function clUpdateProgress() {
  var done = clChecked.filter(Boolean).length;
  var pct = Math.round((done / CL_ITEMS.length) * 100);
  document.getElementById('cl-fill').style.width = pct + '%';
  document.getElementById('cl-label').textContent = done + ' / ' + CL_ITEMS.length;
}

function buildChecklist() {
  var container = document.getElementById('cl-items');
  if (!container) return;
  CL_ITEMS.forEach(function(item, i) {
    var div = document.createElement('div');
    div.className = 'cl-item';
    div.id = 'cl-item-' + i;
    div.innerHTML = '<div class="cl-box" id="cl-box-' + i + '"></div>'
      + '<div class="cl-text">' + item.text
      + '<span class="cl-sub">' + item.sub + '</span></div>';
    div.addEventListener('click', function() {
      clChecked[i] = !clChecked[i];
      var box = document.getElementById('cl-box-' + i);
      if (clChecked[i]) {
        div.classList.add('checked');
        box.textContent = '✓';
      } else {
        div.classList.remove('checked');
        box.textContent = '';
      }
      clUpdateProgress();
    });
    container.appendChild(div);
  });
  clUpdateProgress();
}

buildChecklist();

}());
</script>
