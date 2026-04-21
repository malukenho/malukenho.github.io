---
layout: post
title: "System Design: Notification System — Push, Email, SMS at Billions of Scale"
date: 2026-04-22 10:00:00 +0000
categories: ["post"]
tags: [system-design, notifications, kafka, push, distributed-systems, interview]
series: "System Design Interview Series"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design Interview Prep &mdash; #8 of 15
</div>

{: class="marginalia" }
APNs (Apple Push Notification<br/>service) has a **4 KB payload**<br/>limit per notification —<br/>if your payload is larger,<br/>store the data server-side<br/>and send a "fetch"<br/>notification instead.

Notifications are the silent backbone of modern apps. A like on Instagram, a two-factor authentication code, a "your package has shipped" text — none of these feel special until the moment they fail to arrive. Designing a system that reliably delivers billions of notifications across push, email, and SMS channels is a deceptively hard problem that touches queuing theory, distributed systems, third-party API quirks, and user experience all at once.

**The question:** *Design a notification system like Facebook/Instagram's that sends push notifications, emails, and SMS. Handle 10 million notifications/day across multiple channels, with delivery guarantees and user preferences.*

---

<style>
/* ── Base ────────────────────────────────────────────────── */
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
.yes  { color: #7bcdab; font-weight: 700; }
.no   { color: #f08080; font-weight: 700; }
.part { color: #fbef8a; font-weight: 700; }

/* ── Architecture diagram ────────────────────────────────── */
.arch-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.6rem; margin: 1.6rem 0;
}
.arch-title {
  font-size: .78rem; text-transform: uppercase; letter-spacing: .1em;
  color: rgba(255,255,255,.35); margin-bottom: 1.2rem;
}
.arch-flow {
  display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; gap: .5rem; margin-bottom: 1.4rem;
}
.arch-node {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .55rem 1rem; font-size: .8rem; cursor: pointer;
  transition: all .2s; user-select: none; text-align: center; min-width: 110px;
}
.arch-node:hover, .arch-node.active {
  border-color: #7bcdab; color: #7bcdab; background: rgba(123,205,171,.07);
}
.arch-node.kafka { border-color: #fbef8a; color: #fbef8a; }
.arch-node.kafka:hover, .arch-node.kafka.active { background: rgba(251,239,138,.07); }
.arch-node.worker { border-color: #89c0d0; color: #89c0d0; }
.arch-node.worker:hover, .arch-node.worker.active { background: rgba(137,192,208,.07); }
.arch-node.provider { border-color: #cc99cd; color: #cc99cd; }
.arch-node.provider:hover, .arch-node.provider.active { background: rgba(204,153,205,.07); }
.arch-node.dlq { border-color: #f08080; color: #f08080; }
.arch-node.dlq:hover, .arch-node.dlq.active { background: rgba(240,128,128,.07); }
.arch-arrow { color: rgba(255,255,255,.3); font-size: 1rem; line-height: 1; }
.arch-fanout {
  display: flex; flex-direction: column; gap: .5rem; align-items: flex-start;
}
.arch-detail {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 1rem 1.2rem; font-size: .84rem; line-height: 1.7;
  color: rgba(255,255,255,.75); min-height: 90px; transition: all .2s;
}
.arch-detail strong { color: #fbef8a; }
.arch-detail .failure { color: #f08080; }
.arch-detail .ok { color: #7bcdab; }

/* ── Decision tree ───────────────────────────────────────── */
.dtree-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.4rem; margin: 1.6rem 0; text-align: center;
}
.dtree-node {
  display: inline-block; background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 8px; padding: .4rem .9rem; font-size: .82rem;
  color: rgba(255,255,255,.8); margin: .3rem;
}
.dtree-node.ok  { border-color: #7bcdab; color: #7bcdab; background: rgba(123,205,171,.06); }
.dtree-node.err { border-color: #f08080; color: #f08080; background: rgba(240,128,128,.06); }
.dtree-node.q   { border-color: #fbef8a; color: #fbef8a; background: rgba(251,239,138,.06); }
.dtree-arrow { color: rgba(255,255,255,.3); font-size: .85rem; display: block; margin: .1rem 0; }
.dtree-row { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; margin: .2rem 0; }
.dtree-branch { display: flex; flex-direction: column; align-items: center; }
.dtree-label { font-size: .72rem; color: rgba(255,255,255,.35); margin: .1rem; }

/* ── Simulator ───────────────────────────────────────────── */
.sim-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.4rem; margin: 1.6rem 0;
}
.sim-title {
  font-size: .78rem; text-transform: uppercase; letter-spacing: .1em;
  color: rgba(255,255,255,.35); margin-bottom: 1rem;
}
.sim-controls {
  display: flex; gap: .7rem; flex-wrap: wrap; align-items: center;
  margin-bottom: 1.2rem;
}
.sim-btn {
  background: #1e1f24; border: 1px solid #3a3b40; border-radius: 6px;
  color: rgba(255,255,255,.7); font-size: 13px; padding: 6px 16px;
  cursor: pointer; font-family: inherit; transition: all .2s;
}
.sim-btn:hover  { border-color: #7bcdab; color: #7bcdab; }
.sim-btn.primary { background: rgba(123,205,171,.1); border-color: #7bcdab; color: #7bcdab; }
.sim-btn.danger  { background: rgba(240,128,128,.08); border-color: #f08080; color: #f08080; }
.sim-btn.danger.active { background: rgba(240,128,128,.2); }
.sim-btn:disabled { opacity: .35; cursor: not-allowed; }
.sim-stage {
  display: grid; grid-template-columns: 120px 40px 140px 40px 1fr;
  gap: 0; align-items: start; margin-bottom: 1rem;
}
@media (max-width:640px) {
  .sim-stage { grid-template-columns: 1fr; }
  .sim-arrow-col { display: none; }
}
.sim-box {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .7rem .9rem; font-size: .82rem; text-align: center;
  min-height: 58px; display: flex; flex-direction: column;
  justify-content: center; align-items: center; gap: .2rem;
}
.sim-box-label { font-size: .7rem; color: rgba(255,255,255,.35); text-transform: uppercase; letter-spacing: .07em; }
.sim-box-name  { font-size: .9rem; color: rgba(255,255,255,.85); font-weight: 600; }
.sim-arrow-col {
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; color: rgba(255,255,255,.25); padding-top: 20px;
}
.sim-channels { display: flex; flex-direction: column; gap: .5rem; }
.sim-channel {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .55rem .9rem; font-size: .8rem; display: flex; align-items: center;
  gap: .7rem; transition: border-color .3s;
}
.sim-ch-icon { font-size: 1rem; }
.sim-ch-name { color: rgba(255,255,255,.7); font-weight: 600; min-width: 50px; }
.sim-ch-status {
  flex: 1; font-size: .78rem; color: rgba(255,255,255,.38);
  font-family: "JetBrains Mono",monospace;
}
.sim-ch-badge {
  font-size: .7rem; padding: 2px 8px; border-radius: 10px;
  font-weight: 700; white-space: nowrap;
}
.badge-idle     { background: #1e2025; color: rgba(255,255,255,.3); }
.badge-sending  { background: rgba(251,239,138,.15); color: #fbef8a; }
.badge-ok       { background: rgba(123,205,171,.15); color: #7bcdab; }
.badge-retrying { background: rgba(240,128,128,.15); color: #f08080; }
.badge-fallback { background: rgba(137,192,208,.15); color: #89c0d0; }
.sim-dot {
  width: 10px; height: 10px; border-radius: 50%; background: #fbef8a;
  display: inline-block; margin-left: .4rem;
  animation: pulse-dot .6s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: .4; transform: scale(.7); }
}
.sim-log {
  background: #0e0f12; border: 1px solid #2e2f35; border-radius: 8px;
  padding: .7rem 1rem; height: 110px; overflow-y: auto;
  font-family: "JetBrains Mono",monospace; font-size: 12px; line-height: 1.7;
  margin-top: .8rem;
}
.sim-log .ok    { color: #7bcdab; }
.sim-log .warn  { color: #fbef8a; }
.sim-log .err   { color: #f08080; }
.sim-log .info  { color: rgba(255,255,255,.35); }

/* ── Cost calculator ─────────────────────────────────────── */
.cost-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.4rem; margin: 1.6rem 0;
}
.cost-slider-row {
  display: flex; align-items: center; gap: 1rem; margin-bottom: .9rem; flex-wrap: wrap;
}
.cost-slider-row label {
  font-size: .82rem; color: rgba(255,255,255,.6); min-width: 160px;
}
.cost-slider-row input[type=range] {
  flex: 1; min-width: 160px; accent-color: #7bcdab;
}
.cost-slider-row .cost-val {
  font-family: "JetBrains Mono",monospace; font-size: .82rem;
  color: #fbef8a; min-width: 80px; text-align: right;
}
.cost-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: .8rem; margin-top: 1rem;
}
@media (max-width:560px) { .cost-grid { grid-template-columns: 1fr; } }
.cost-card {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1rem; text-align: center;
}
.cost-card-title { font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.4); margin-bottom: .5rem; }
.cost-card-amt   { font-size: 1.5rem; font-weight: 700; color: #fbef8a; line-height: 1.1; }
.cost-card-sub   { font-size: .72rem; color: rgba(255,255,255,.3); margin-top: .2rem; }

/* ── Priority queue diagram ──────────────────────────────── */
.pq-wrap {
  background: #111214; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.4rem; margin: 1.6rem 0;
}
.pq-row { display: flex; gap: .6rem; align-items: center; margin-bottom: .7rem; flex-wrap: wrap; }
.pq-tag {
  font-size: .72rem; padding: 2px 10px; border-radius: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
}
.pq-tag.critical  { background: rgba(240,128,128,.15); color: #f08080; }
.pq-tag.marketing { background: rgba(89,89,100,.3); color: rgba(255,255,255,.45); }
.pq-node {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 6px;
  padding: .35rem .8rem; font-size: .78rem; color: rgba(255,255,255,.7);
}
.pq-node.hi  { border-color: #f08080; color: #f08080; }
.pq-node.lo  { border-color: rgba(255,255,255,.15); }
.pq-arrow { color: rgba(255,255,255,.25); font-size: .9rem; }
</style>

## 1. The Problem

<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-num">10M</div>
    <div class="stat-label">Notifications/day</div>
    <div class="stat-sub">~116/sec average</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">2,778</div>
    <div class="stat-label">Peak/sec</div>
    <div class="stat-sub">Marketing blast (10M / 1 hr)</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">3</div>
    <div class="stat-label">Channels</div>
    <div class="stat-sub">Push · Email · SMS</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">99.9%</div>
    <div class="stat-label">Target delivery</div>
    <div class="stat-sub">≤ 9 hours downtime/yr</div>
  </div>
</div>

Notifications are everywhere: a like on Instagram, a payment receipt, a delivery update. Three delivery channels exist, each with radically different characteristics:

- **Push** (iOS APNs / Android FCM) — free, sub-second latency, but only reaches online devices and has a 4 KB payload limit
- **Email** (SendGrid/SES) — cheap at $0.0001/msg, high reliability (~99%), but latency ranges from 1 to 60 seconds
- **SMS** (Twilio) — expensive at $0.0075/msg, near-universal reach, 98% open rate, ~99.9% delivery

The core challenge: at 10M/day average, a single marketing blast can spike to **2,778 messages/second** — a 24× surge. The system must absorb that spike without losing messages, slowing down the user-facing API, or hammering third-party provider rate limits.

---

## 2. Level 1 — Synchronous, In-Request Notification

The simplest possible design: when a user likes a photo, the API handler calls APNs directly before returning a response.

<div class="code-wrap">
  <div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">def</span> <span class="fn">like_photo</span>(user_id, photo_id):
    photo = <span class="fn">db.get_photo</span>(photo_id)
    <span class="fn">db.create_like</span>(user_id, photo_id)

    <span class="cm"># BAD: synchronous notification inline</span>
    device_token = <span class="fn">db.get_device_token</span>(photo.owner_id)
    <span class="fn">apns.send</span>(device_token, <span class="st">"Someone liked your photo!"</span>)
    <span class="cm"># if APNs is slow or down, the entire API call hangs</span>

    <span class="kw">return</span> <span class="st">"ok"</span></pre>
</div>

**Problems:**
- If APNs responds in 3s, every like API call takes 3s
- If APNs is down, likes fail completely
- No retry — if the call fails, the notification is lost forever
- No rate limiting — a viral post could spawn thousands of concurrent APNs connections

---

## 3. Level 2 — Async with a Simple Queue

Decouple the notification from the API response. The handler publishes an event to a queue; a background worker consumes and sends it.

<div class="code-wrap">
  <div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="cm"># API handler — returns instantly</span>
<span class="kw">def</span> <span class="fn">like_photo</span>(user_id, photo_id):
    <span class="fn">db.create_like</span>(user_id, photo_id)
    <span class="fn">queue.push</span>({
        <span class="st">"type"</span>: <span class="st">"like"</span>,
        <span class="st">"recipient_id"</span>: photo.owner_id,
        <span class="st">"actor_id"</span>: user_id,
    })
    <span class="kw">return</span> <span class="st">"ok"</span>  <span class="cm"># fast!</span>

<span class="cm"># Background worker</span>
<span class="kw">def</span> <span class="fn">worker_loop</span>():
    <span class="kw">while</span> <span class="kw">True</span>:
        event = <span class="fn">queue.pop</span>()
        device_token = <span class="fn">db.get_device_token</span>(event[<span class="st">"recipient_id"</span>])
        <span class="fn">apns.send</span>(device_token, <span class="fn">build_message</span>(event))</pre>
</div>

This is significantly better: the API is fast and the notification is decoupled. But there are still gaps:

- **Single queue = SPOF** — if the queue node dies, all notifications are lost (unless you use durable queuing)
- **No per-channel routing** — push, email, and SMS all compete on the same queue
- **No priority** — a 2FA SMS sits behind 10M marketing emails
- **No backpressure** — a marketing blast overwhelms the single worker

---

## 4. Level 3 — Channel-Specific Workers + Fanout via Kafka

The production-grade architecture introduces Kafka for durable, partitioned, high-throughput messaging with independent consumer groups per channel.

<div class="arch-wrap">
  <div class="arch-title">Click any node to see details</div>
  <div class="arch-flow">
    <div class="arch-node" onclick="showArch('producer')" id="an-producer">
      🖥 API / Backend<br/><small style="color:rgba(255,255,255,.35);font-size:.7rem;">Event Producer</small>
    </div>
    <div class="arch-arrow">→</div>
    <div class="arch-node kafka" onclick="showArch('kafka')" id="an-kafka">
      ⚡ Kafka<br/><small style="font-size:.7rem;">topic: notifications</small>
    </div>
    <div class="arch-arrow">→</div>
    <div class="arch-fanout">
      <div style="display:flex;align-items:center;gap:.5rem;">
        <div class="arch-node worker" onclick="showArch('push')" id="an-push">📱 Push Worker</div>
        <div class="arch-arrow">→</div>
        <div class="arch-node provider" onclick="showArch('apns')" id="an-apns">APNs / FCM</div>
        <div class="arch-arrow">→</div>
        <div class="arch-node dlq" onclick="showArch('dlq-push')" id="an-dlq-push">DLQ Push</div>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;">
        <div class="arch-node worker" onclick="showArch('email')" id="an-email">📧 Email Worker</div>
        <div class="arch-arrow">→</div>
        <div class="arch-node provider" onclick="showArch('sendgrid')" id="an-sendgrid">SendGrid/SES</div>
        <div class="arch-arrow">→</div>
        <div class="arch-node dlq" onclick="showArch('dlq-email')" id="an-dlq-email">DLQ Email</div>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;">
        <div class="arch-node worker" onclick="showArch('sms')" id="an-sms">📟 SMS Worker</div>
        <div class="arch-arrow">→</div>
        <div class="arch-node provider" onclick="showArch('twilio')" id="an-twilio">Twilio</div>
        <div class="arch-arrow">→</div>
        <div class="arch-node dlq" onclick="showArch('dlq-sms')" id="an-dlq-sms">DLQ SMS</div>
      </div>
    </div>
  </div>
  <div class="arch-detail" id="arch-detail">
    Click a node above to explore its role, throughput characteristics, and failure handling.
  </div>
</div>

<script>
var archData = {
  producer: {
    title: "API / Backend — Event Producer",
    body: "Publishes a <strong>notification event</strong> to Kafka after every user action (like, comment, payment, etc). The event is a small JSON blob: <code>{ type, recipient_id, actor_id, notif_id, channels: [\"push\",\"email\"] }</code>. Publishing is fire-and-forget — the API returns to the caller immediately. Kafka guarantees durability: even if all consumers are down, the event is not lost. <strong>Throughput:</strong> 2,800 events/sec at peak burst. The producer uses async batching to coalesce multiple events into a single Kafka write."
  },
  kafka: {
    title: "Kafka — Message Bus",
    body: "Topic <code>notifications</code> is partitioned by <strong>recipient_id % num_partitions</strong> to maintain per-user ordering. Three independent <strong>consumer groups</strong> — one per channel — each get a full copy of every message. Kafka retains messages for 7 days, allowing consumers to replay on recovery. <strong>Throughput:</strong> Kafka handles 1M+ messages/sec per broker; at 2,800/sec we need only 1 broker, but we run 3 for HA. <strong>Key config:</strong> <code>acks=all</code>, <code>replication.factor=3</code> for durability."
  },
  push: {
    title: "Push Worker — Consumer Group",
    body: "Reads from the <code>notifications</code> topic, filters for events with <code>channels=[\"push\"]</code>. Fetches the device token from the device registry (Redis-cached). Calls APNs (iOS) or FCM (Android). On <span class='failure'>token-not-registered</span> error, removes the stale token from the DB. On <span class='failure'>service unavailable</span>, retries with exponential backoff: 1s → 2s → 4s → 8s. After 4 retries, emits to the Push DLQ. <strong>Scale:</strong> 3 replicas, auto-scaled by consumer group lag metric."
  },
  email: {
    title: "Email Worker — Consumer Group",
    body: "Handles email delivery. Renders the notification template with user variables, then calls SendGrid or SES. On <span class='failure'>bounce</span>, marks the email address as invalid in the user DB (do not retry). On <span class='failure'>rate-limit (429)</span>, backs off and retries. Tracks sent/delivered/bounced events. <strong>Throughput:</strong> SendGrid's free tier allows 100 emails/day; production uses a dedicated IP pool with 10M/day quota. Emails are batched into digest format for marketing campaigns to reduce costs."
  },
  sms: {
    title: "SMS Worker — Consumer Group",
    body: "Sends SMS via Twilio. Only triggered for high-priority events (2FA, payment alerts, critical delivery updates) or when push+email both fail. Checks user's country code to select the correct Twilio sending number. On <span class='failure'>invalid number</span>, marks the number as invalid — do not retry. <strong>Cost control:</strong> SMS is 75× more expensive than email; a rate limiter ensures marketing campaigns never use SMS. <strong>Throughput:</strong> Twilio's standard plan supports 1 msg/sec per long code; use a short code or Alphanumeric ID for high volume."
  },
  apns: {
    title: "APNs / FCM — Push Providers",
    body: "<strong>APNs</strong> (Apple): HTTP/2 API, 4 KB payload limit, requires a device token + certificate or token-based auth. Tokens expire; <span class='failure'>BadDeviceToken</span> means unregister and don't retry. <strong>FCM</strong> (Google): REST or gRPC API, 4 KB limit, tokens also expire. <span class='failure'>registration_ids_mismatch</span> means update your token DB. Both providers guarantee <span class='ok'>at-least-once delivery to online devices</span>. If the device is offline, APNs stores 1 notification for up to 28 days; FCM stores for up to 4 weeks (configurable)."
  },
  sendgrid: {
    title: "SendGrid / AWS SES — Email Providers",
    body: "Industry-standard transactional email APIs. <strong>SendGrid:</strong> RESTful API, supports templates, click tracking, open tracking via 1×1 pixel, unsubscribe link injection. <strong>SES:</strong> cheaper at $0.10/1000, tightly integrated with AWS. Both provide <span class='ok'>delivery receipts via webhooks</span> — use these to update your analytics DB. <strong>Bounce handling is critical:</strong> sending to known-bounced addresses damages your sending reputation and can get your domain blacklisted. Maintain a suppression list."
  },
  twilio: {
    title: "Twilio — SMS Provider",
    body: "Programmable SMS via REST API. Twilio routes across global carrier networks for maximum deliverability. Supports delivery receipts via status callbacks (webhook). <strong>Pricing:</strong> ~$0.0075/outbound SMS in the US; international rates vary widely. <strong>Regulatory:</strong> TCPA in the US, GDPR in Europe — users must opt in to receive SMS marketing. Always include opt-out instructions (<code>Reply STOP</code>). <strong>Short codes</strong> (5-6 digit numbers) allow 100 SMS/sec vs 1/sec for long codes — essential for 2FA at scale."
  },
  "dlq-push": {
    title: "Dead Letter Queue — Push Failures",
    body: "All push notifications that failed after max retries land here with <strong>full error context</strong>: original payload, recipient, error code, retry count, timestamps. An ops dashboard reads from the DLQ for alerting. A forensics tool allows engineers to inspect and manually replay specific failures. <span class='failure'>Common causes:</span> APNs token expired (update token DB), device offline for >28 days (de-register), APNs rate limit hit (backoff issue in worker). DLQ messages are retained for 30 days."
  },
  "dlq-email": {
    title: "Dead Letter Queue — Email Failures",
    body: "Email failures after max retries land here. <span class='failure'>Common causes:</span> bounced address (add to suppression list immediately), SendGrid account suspended (billing issue), template rendering error (missing variable). The DLQ also captures permanent failures that should never be retried (e.g., hard bounces). An automated job reads the DLQ daily and updates the user DB suppression flags."
  },
  "dlq-sms": {
    title: "Dead Letter Queue — SMS Failures",
    body: "SMS failures are particularly expensive because of cost: $0.0075 per attempt. <span class='failure'>Common causes:</span> invalid number (update user DB), carrier filtering (happens for certain message content — avoid spammy words), Twilio rate limit. Given the cost, the SMS DLQ also triggers a fallback to email if available. All DLQ entries are monitored by PagerDuty for anomaly detection."
  }
};

function showArch(key) {
  var d = archData[key];
  if (!d) return;
  var detail = document.getElementById("arch-detail");
  detail.innerHTML = "<strong>" + d.title + "</strong><br/><br/>" + d.body;
  var nodes = document.querySelectorAll(".arch-node");
  nodes.forEach(function(n) { n.classList.remove("active"); });
  var el = document.getElementById("an-" + key);
  if (el) el.classList.add("active");
}
</script>

**Why Kafka over RabbitMQ here?** Kafka's consumer groups give each channel worker independent read cursors — email falling behind doesn't slow down push. Messages are replayed on crash without redelivery to other consumers. For 10M/day that's only ~116 msg/sec, well within a single Kafka broker's capacity, but Kafka's durability story (replicated, durable log) makes it worth the operational overhead.

---

## 5. Level 4 — User Preferences & Opt-Out

Before sending any notification, check whether the user actually wants it.

<div class="dtree-wrap">
  <div class="dtree-node q">Notification Event Received</div>
  <div class="dtree-arrow">↓</div>
  <div class="dtree-node">Fetch User Preferences<br/><small style="color:rgba(255,255,255,.35);">Redis cache → MySQL fallback</small></div>
  <div class="dtree-arrow">↓</div>
  <div class="dtree-node q">Is this a Critical notification?<br/><small style="color:rgba(255,255,255,.35)">(2FA, payment, security alert)</small></div>
  <div class="dtree-arrow">↓</div>
  <div class="dtree-row">
    <div class="dtree-branch">
      <div class="dtree-label">YES (critical)</div>
      <div class="dtree-node ok">Send on ALL opted-in channels<br/>(ignore marketing opt-outs)</div>
    </div>
    <div class="dtree-branch">
      <div class="dtree-label">NO (marketing / social)</div>
      <div class="dtree-node q">Check per-channel preference</div>
      <div class="dtree-arrow" style="margin-top:.3rem">↓</div>
      <div class="dtree-row">
        <div class="dtree-branch">
          <div class="dtree-label">Push opted in?</div>
          <div class="dtree-node ok">Send Push</div>
        </div>
        <div class="dtree-branch">
          <div class="dtree-label">Email opted in?</div>
          <div class="dtree-node ok">Send Email</div>
        </div>
        <div class="dtree-branch">
          <div class="dtree-label">SMS opted in?</div>
          <div class="dtree-node err">Never for marketing</div>
        </div>
      </div>
    </div>
  </div>
</div>

The preference service has two layers: a **Redis cache** for hot-path lookups (TTL = 5 minutes) and a **MySQL database** as the source of truth. When a user updates preferences in the app, both are updated: MySQL first (durable), then Redis cache is invalidated (so next request re-fetches).

<div class="code-wrap">
  <div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">def</span> <span class="fn">should_send</span>(user_id, notif_type, channel):
    pref_key = <span class="st">"pref:"</span> + <span class="fn">str</span>(user_id)
    prefs = <span class="fn">redis.get</span>(pref_key)

    <span class="kw">if not</span> prefs:
        prefs = <span class="fn">db.get_preferences</span>(user_id)
        <span class="fn">redis.setex</span>(pref_key, <span class="nu">300</span>, prefs)   <span class="cm"># TTL 5 min</span>

    <span class="cm"># Critical notifications bypass marketing opt-outs</span>
    <span class="kw">if</span> notif_type <span class="kw">in</span> CRITICAL_TYPES:
        <span class="kw">return</span> prefs.get(<span class="st">"channel_"</span> + channel + <span class="st">"_active"</span>, <span class="kw">True</span>)

    <span class="cm"># Marketing: honour all opt-outs</span>
    <span class="kw">if not</span> prefs.get(<span class="st">"marketing_enabled"</span>, <span class="kw">True</span>):
        <span class="kw">return False</span>

    <span class="kw">return</span> prefs.get(<span class="st">"channel_"</span> + channel + <span class="st">"_enabled"</span>, <span class="kw">True</span>)</pre>
</div>

---

## 6. Level 5 — Delivery Guarantees

{: class="marginalia" }
The **dead letter queue** is<br/>your forensics tool —<br/>every failed notification<br/>lands there with the full<br/>error. Without it, you're<br/>flying blind on delivery<br/>failures.

**At-least-once vs exactly-once:** Kafka provides at-least-once delivery by default. For notifications, a duplicate push ("Someone liked your photo!" × 2) is annoying but not catastrophic. Exactly-once requires distributed transactions across Kafka + the provider API — complex and slow.

The practical solution: **idempotency keys**. Each notification event carries a `notif_id` (UUID generated by the producer). Workers pass this key to the provider:

<div class="code-wrap">
  <div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="cm"># Worker deduplication with idempotency key</span>
<span class="kw">def</span> <span class="fn">send_push_with_idempotency</span>(event):
    dedup_key = <span class="st">"sent:"</span> + event[<span class="st">"notif_id"</span>] + <span class="st">":"</span> + <span class="st">"push"</span>

    <span class="cm"># Check if already sent (Redis SET NX with TTL)</span>
    acquired = <span class="fn">redis.set</span>(dedup_key, <span class="nu">1</span>, nx=<span class="kw">True</span>, ex=<span class="nu">86400</span>)
    <span class="kw">if not</span> acquired:
        <span class="fn">logger.info</span>(<span class="st">"Duplicate, skipping: "</span> + event[<span class="st">"notif_id"</span>])
        <span class="kw">return</span>

    <span class="fn">apns.send</span>(
        device_token=event[<span class="st">"device_token"</span>],
        payload=event[<span class="st">"payload"</span>],
        apns_id=event[<span class="st">"notif_id"</span>]  <span class="cm"># APNs native dedup key</span>
    )</pre>
</div>

The Redis `SET NX` (set if not exists) is atomic — even if two worker replicas pick up the same Kafka message during a rebalance, only one will acquire the lock and send. The key expires after 24 hours to avoid unbounded memory growth.

---

## 7. Level 6 — Retry Logic & Failure Handling

Different errors require different responses:

<table class="compare-table">
  <thead>
    <tr>
      <th>Error</th>
      <th>Channel</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>BadDeviceToken</code></td>
      <td>APNs</td>
      <td>Remove token from DB. <span class="no">Do not retry.</span></td>
    </tr>
    <tr>
      <td><code>Unregistered</code></td>
      <td>FCM</td>
      <td>Remove registration ID. <span class="no">Do not retry.</span></td>
    </tr>
    <tr>
      <td><code>ServiceUnavailable</code></td>
      <td>APNs / FCM</td>
      <td>Exponential backoff. <span class="yes">Retry up to 4×.</span></td>
    </tr>
    <tr>
      <td>Bounce (hard)</td>
      <td>Email</td>
      <td>Add to suppression list. <span class="no">Do not retry.</span></td>
    </tr>
    <tr>
      <td>Bounce (soft)</td>
      <td>Email</td>
      <td>Retry once after 1 hour.</td>
    </tr>
    <tr>
      <td>Rate limit (429)</td>
      <td>Any</td>
      <td>Respect <code>Retry-After</code> header. <span class="yes">Retry.</span></td>
    </tr>
    <tr>
      <td>Invalid number</td>
      <td>SMS</td>
      <td>Mark invalid in user DB. <span class="no">Do not retry.</span></td>
    </tr>
    <tr>
      <td>Carrier filtering</td>
      <td>SMS</td>
      <td>Escalate to ops. Review message content.</td>
    </tr>
  </tbody>
</table>

Exponential backoff schedule (jitter added to prevent thundering herd):

<div class="code-wrap">
  <div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">import</span> random, time

BACKOFF_BASE = <span class="nu">1.0</span>    <span class="cm"># seconds</span>
BACKOFF_MAX  = <span class="nu">8.0</span>    <span class="cm"># seconds</span>
MAX_RETRIES  = <span class="nu">4</span>

<span class="kw">def</span> <span class="fn">send_with_retry</span>(send_fn, event):
    <span class="kw">for</span> attempt <span class="kw">in</span> <span class="fn">range</span>(MAX_RETRIES):
        <span class="kw">try</span>:
            <span class="kw">return</span> <span class="fn">send_fn</span>(event)
        <span class="kw">except</span> <span class="ty">PermanentError</span>:
            <span class="kw">raise</span>   <span class="cm"># never retry permanent errors</span>
        <span class="kw">except</span> <span class="ty">TransientError</span>:
            delay = <span class="fn">min</span>(BACKOFF_BASE * (<span class="nu">2</span> ** attempt), BACKOFF_MAX)
            jitter = delay * <span class="nu">0.2</span> * random.<span class="fn">random</span>()
            <span class="fn">time.sleep</span>(delay + jitter)

    <span class="cm"># Exhausted retries — emit to DLQ</span>
    <span class="fn">dlq.publish</span>(event)</pre>
</div>

---

## 8. Level 7 — Notification Templates & Personalization

Hard-coding notification text in worker code doesn't scale. The **Template Service** stores versioned templates in a DB and renders them at send time:

<div class="code-wrap">
  <div class="code-lang">json (template stored in DB) <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block">{
  <span class="pp">"template_id"</span>: <span class="st">"order_shipped_push"</span>,
  <span class="pp">"channel"</span>: <span class="st">"push"</span>,
  <span class="pp">"locale"</span>: <span class="st">"en"</span>,
  <span class="pp">"title"</span>: <span class="st">"Your order is on its way!"</span>,
  <span class="pp">"body"</span>: <span class="st">"Hi [[ name ]], order [[ orderId ]] has shipped!"</span>,
  <span class="pp">"ab_variant"</span>: <span class="st">"A"</span>
}</pre>
</div>

<div class="callout callout-yellow">
  <strong>Jekyll note:</strong> Template syntax uses <code>[[ name ]]</code> in these examples to avoid conflicts with Liquid templating. In production, use your preferred engine — Mustache (<code>&#123;&#123;name&#125;&#125;</code>), Jinja2 (<code>&#123;&#123; name &#125;&#125;</code>), or Handlebars.
</div>

<div class="code-wrap">
  <div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">def</span> <span class="fn">render_template</span>(template_id, locale, variables):
    tmpl = <span class="fn">template_db.get</span>(template_id, locale=locale)
    body = tmpl[<span class="st">"body"</span>]

    <span class="cm"># Simple variable substitution (no Liquid conflicts)</span>
    <span class="kw">for</span> key, value <span class="kw">in</span> variables.<span class="fn">items</span>():
        body = body.<span class="fn">replace</span>(<span class="st">"[[ "</span> + key + <span class="st">" ]]"</span>, <span class="fn">str</span>(value))

    <span class="kw">return</span> body

<span class="cm"># Usage</span>
msg = <span class="fn">render_template</span>(
    <span class="st">"order_shipped_push"</span>,
    locale=user.locale,
    variables={<span class="st">"name"</span>: <span class="st">"Alice"</span>, <span class="st">"orderId"</span>: <span class="st">"ORD-4821"</span>}
)
<span class="cm"># → "Hi Alice, order ORD-4821 has shipped!"</span></pre>
</div>

**A/B testing:** Templates carry an `ab_variant` field. The orchestrator randomly assigns users to variant A or B (using `user_id % 2`) and selects the matching template. Analytics later reveal which copy drives higher open or click rates.

**Localization:** Templates are stored per `(template_id, locale)` pair. If the user's locale doesn't have a matching template, fall back to `en`. This enables a single notification event to be rendered in 50+ languages by the worker at send time.

---

## 9. Level 8 — Analytics & Tracking

Knowing a notification was *sent* is not the same as knowing it was *seen*. Tracking the full funnel:

<table class="compare-table">
  <thead>
    <tr>
      <th>Event</th>
      <th>Push</th>
      <th>Email</th>
      <th>SMS</th>
      <th>How</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Sent</td>
      <td class="yes">✓</td>
      <td class="yes">✓</td>
      <td class="yes">✓</td>
      <td>Logged by worker on successful provider call</td>
    </tr>
    <tr>
      <td>Delivered</td>
      <td class="yes">✓</td>
      <td class="yes">✓</td>
      <td class="yes">✓</td>
      <td>Provider delivery webhook → event stream</td>
    </tr>
    <tr>
      <td>Opened</td>
      <td class="yes">✓</td>
      <td class="yes">✓</td>
      <td class="no">✗</td>
      <td>Push: app SDK callback; Email: 1×1 tracking pixel</td>
    </tr>
    <tr>
      <td>Clicked</td>
      <td class="part">App</td>
      <td class="yes">✓</td>
      <td class="part">Link</td>
      <td>Email: redirect via tracking domain; Push: deep link</td>
    </tr>
    <tr>
      <td>Bounced</td>
      <td class="part">Token err</td>
      <td class="yes">✓</td>
      <td class="part">Carrier err</td>
      <td>Provider webhook → suppression list update</td>
    </tr>
  </tbody>
</table>

All events flow to an **event stream** (another Kafka topic: `notif_events`) and are consumed by an analytics pipeline that writes to ClickHouse for fast OLAP queries:

<div class="code-wrap">
  <div class="code-lang">sql <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="cm">-- Delivery funnel for campaign 1042</span>
<span class="kw">SELECT</span>
    channel,
    <span class="fn">countIf</span>(event_type = <span class="st">'sent'</span>)      <span class="kw">AS</span> sent,
    <span class="fn">countIf</span>(event_type = <span class="st">'delivered'</span>)  <span class="kw">AS</span> delivered,
    <span class="fn">countIf</span>(event_type = <span class="st">'opened'</span>)     <span class="kw">AS</span> opened,
    <span class="fn">round</span>(<span class="fn">countIf</span>(event_type=<span class="st">'opened'</span>) * <span class="nu">100.0</span>
          / <span class="fn">nullIf</span>(<span class="fn">countIf</span>(event_type=<span class="st">'delivered'</span>), <span class="nu">0</span>), <span class="nu">2</span>) <span class="kw">AS</span> open_rate_pct
<span class="kw">FROM</span> notif_events
<span class="kw">WHERE</span> campaign_id = <span class="nu">1042</span>
  <span class="kw">AND</span> ts >= <span class="fn">now</span>() - <span class="fn">INTERVAL</span> <span class="nu">7</span> DAY
<span class="kw">GROUP BY</span> channel;</pre>
</div>

---

## 10. Interactive: Notification Flow Simulator

<div class="sim-wrap">
  <div class="sim-title">Notification Delivery Simulator</div>
  <div class="sim-controls">
    <button class="sim-btn primary" id="sim-send-btn" onclick="simSend()">▶ Send Notification</button>
    <button class="sim-btn danger" id="sim-fail-btn" onclick="simToggleFail()">⚡ Simulate APNs Failure</button>
    <button class="sim-btn" onclick="simReset()">↺ Reset</button>
  </div>
  <div class="sim-stage">
    <div class="sim-box" id="sim-api">
      <div class="sim-box-label">Step 1</div>
      <div class="sim-box-name">API Server</div>
    </div>
    <div class="sim-arrow-col">→</div>
    <div class="sim-box" id="sim-kafka">
      <div class="sim-box-label">Step 2</div>
      <div class="sim-box-name">Kafka</div>
    </div>
    <div class="sim-arrow-col">→</div>
    <div class="sim-channels" id="sim-channels">
      <div class="sim-channel" id="sim-ch-push">
        <span class="sim-ch-icon">📱</span>
        <span class="sim-ch-name">Push</span>
        <span class="sim-ch-status" id="sim-st-push">idle</span>
        <span class="sim-ch-badge badge-idle" id="sim-badge-push">idle</span>
      </div>
      <div class="sim-channel" id="sim-ch-email">
        <span class="sim-ch-icon">📧</span>
        <span class="sim-ch-name">Email</span>
        <span class="sim-ch-status" id="sim-st-email">idle</span>
        <span class="sim-ch-badge badge-idle" id="sim-badge-email">idle</span>
      </div>
      <div class="sim-channel" id="sim-ch-sms">
        <span class="sim-ch-icon">📟</span>
        <span class="sim-ch-name">SMS</span>
        <span class="sim-ch-status" id="sim-st-sms">idle</span>
        <span class="sim-ch-badge badge-idle" id="sim-badge-sms">idle</span>
      </div>
    </div>
  </div>
  <div class="sim-log" id="sim-log"></div>
</div>

<script>
var simFailMode = false;
var simRunning  = false;

function simToggleFail() {
  simFailMode = !simFailMode;
  var btn = document.getElementById("sim-fail-btn");
  if (simFailMode) {
    btn.classList.add("active");
    btn.textContent = "⚡ APNs Failure ON";
    simLog("warn", "[APNs] Failure mode enabled — push will retry then fall back to email");
  } else {
    btn.classList.remove("active");
    btn.textContent = "⚡ Simulate APNs Failure";
    simLog("info", "[Config] APNs failure mode disabled");
  }
}

function simLog(cls, msg) {
  var log = document.getElementById("sim-log");
  var line = document.createElement("div");
  line.className = cls;
  line.textContent = msg;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function setChannel(ch, status, badgeClass, badgeText, statusText) {
  var el = document.getElementById("sim-ch-" + ch);
  var st = document.getElementById("sim-st-" + ch);
  var badge = document.getElementById("sim-badge-" + ch);
  st.textContent = statusText || status;
  badge.className = "sim-ch-badge " + badgeClass;
  badge.textContent = badgeText;
}

function highlightBox(id, on) {
  var el = document.getElementById(id);
  if (el) {
    el.style.borderColor = on ? "#7bcdab" : "";
    el.style.background  = on ? "rgba(123,205,171,.07)" : "";
  }
}

function simReset() {
  simRunning = false;
  document.getElementById("sim-send-btn").disabled = false;
  ["push","email","sms"].forEach(function(ch) {
    setChannel(ch, "idle", "badge-idle", "idle", "idle");
    document.getElementById("sim-ch-" + ch).style.borderColor = "";
  });
  highlightBox("sim-api",   false);
  highlightBox("sim-kafka", false);
}

function simSend() {
  if (simRunning) return;
  simRunning = true;
  document.getElementById("sim-send-btn").disabled = true;

  simLog("info", "─────────────────────────────────────");
  simLog("ok",   "[API] User liked a photo → publishing event to Kafka");
  highlightBox("sim-api", true);

  setTimeout(function() {
    highlightBox("sim-api",   false);
    highlightBox("sim-kafka", true);
    simLog("ok", "[Kafka] Event written to topic 'notifications' (partition 3)");

    setTimeout(function() {
      highlightBox("sim-kafka", false);
      simLog("info", "[Kafka] 3 consumer groups awakened: push, email, sms");

      // Email worker — starts immediately
      setChannel("email", "sending", "badge-sending", "sending", "checking prefs…");
      setTimeout(function() {
        simLog("ok", "[Email] Preference check passed — marketing enabled");
        setChannel("email", "sending", "badge-sending", "sending", "rendering template…");
        setTimeout(function() {
          simLog("ok", "[Email] Template rendered — calling SendGrid API");
          setTimeout(function() {
            simLog("ok", "[Email] SendGrid → 202 Accepted");
            setChannel("email", "delivered", "badge-ok", "delivered", "delivered ✓");
            document.getElementById("sim-ch-email").style.borderColor = "#7bcdab";
          }, 700);
        }, 400);
      }, 300);

      // SMS worker — for this demo, SMS is only triggered for critical
      setChannel("sms", "skipped", "badge-idle", "skipped", "not critical — skipped");

      // Push worker — may fail
      setChannel("push", "sending", "badge-sending", "sending", "checking prefs…");
      setTimeout(function() {
        simLog("ok", "[Push] Preference check passed — push enabled");
        setChannel("push", "sending", "badge-sending", "sending", "fetching device token…");

        setTimeout(function() {
          simLog("ok", "[Push] Device token found — calling APNs");

          if (!simFailMode) {
            setTimeout(function() {
              simLog("ok", "[APNs] 200 OK — notification delivered");
              setChannel("push", "delivered", "badge-ok", "delivered", "delivered ✓");
              document.getElementById("sim-ch-push").style.borderColor = "#7bcdab";
              simRunning = false;
              document.getElementById("sim-send-btn").disabled = false;
            }, 600);
          } else {
            // Simulate APNs failure + retries
            setTimeout(function() {
              simLog("err", "[APNs] 503 ServiceUnavailable — attempt 1/4 failed");
              setChannel("push", "retrying", "badge-retrying", "retry 1/4", "retry backoff: 1s");
              setTimeout(function() {
                simLog("err", "[APNs] 503 ServiceUnavailable — attempt 2/4 failed");
                setChannel("push", "retrying", "badge-retrying", "retry 2/4", "retry backoff: 2s");
                setTimeout(function() {
                  simLog("err", "[APNs] 503 ServiceUnavailable — attempt 3/4 failed");
                  setChannel("push", "retrying", "badge-retrying", "retry 3/4", "retry backoff: 4s");
                  setTimeout(function() {
                    simLog("err", "[APNs] 503 ServiceUnavailable — attempt 4/4 failed");
                    simLog("warn", "[Push] Max retries exceeded → emitting to DLQ");
                    simLog("warn", "[Push] Fallback: routing to email channel");
                    setChannel("push", "dlq", "badge-retrying", "→ DLQ", "fallback to email");
                    document.getElementById("sim-ch-push").style.borderColor = "#f08080";
                    setTimeout(function() {
                      simLog("ok", "[Email] Fallback push → email triggered");
                      simLog("ok", "[Email] SendGrid fallback → 202 Accepted");
                      simLog("info", "[Push] DLQ entry written for forensics");
                      simRunning = false;
                      document.getElementById("sim-send-btn").disabled = false;
                    }, 800);
                  }, 900);
                }, 700);
              }, 600);
            }, 500);
          }
        }, 400);
      }, 500);

    }, 400);
  }, 600);
}
</script>

---

## 11. Cost Comparison & Calculator

{: class="marginalia" }
**SMS is 75× more expensive**<br/>than email but has a **98%<br/>open rate** vs ~20% for<br/>email — choose your channel<br/>based on message urgency<br/>and audience, not cost alone.

<table class="compare-table">
  <thead>
    <tr>
      <th>Channel</th>
      <th>Cost / message</th>
      <th>Latency</th>
      <th>Reliability</th>
      <th>Open Rate</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>📱 Push (FCM/APNs)</td>
      <td><span class="yes">Free</span></td>
      <td>&lt; 1 s</td>
      <td>~95% (device must be online)</td>
      <td>~15%</td>
    </tr>
    <tr>
      <td>📧 Email (SendGrid)</td>
      <td>$0.0001</td>
      <td>1 – 60 s</td>
      <td>~99%</td>
      <td>~20%</td>
    </tr>
    <tr>
      <td>📟 SMS (Twilio, US)</td>
      <td><span class="no">$0.0075</span></td>
      <td>&lt; 5 s</td>
      <td>~99.9%</td>
      <td>~98%</td>
    </tr>
  </tbody>
</table>

<div class="cost-wrap">
  <div class="arch-title">Interactive Cost Calculator</div>
  <div class="cost-slider-row">
    <label>Notifications per day</label>
    <input type="range" id="cost-slider" min="0" max="4" step="1" value="1" oninput="updateCost()"/>
    <span class="cost-val" id="cost-vol-label">10M</span>
  </div>
  <div class="cost-grid">
    <div class="cost-card">
      <div class="cost-card-title">📱 Push</div>
      <div class="cost-card-amt" id="cost-push">$0</div>
      <div class="cost-card-sub">FCM / APNs — free</div>
    </div>
    <div class="cost-card">
      <div class="cost-card-title">📧 Email</div>
      <div class="cost-card-amt" id="cost-email">$0.00</div>
      <div class="cost-card-sub">@ $0.0001 / msg</div>
    </div>
    <div class="cost-card">
      <div class="cost-card-title">📟 SMS</div>
      <div class="cost-card-amt" id="cost-sms">$0.00</div>
      <div class="cost-card-sub">@ $0.0075 / msg (US)</div>
    </div>
  </div>
</div>

<script>
var costVols = [1000000, 10000000, 50000000, 100000000, 1000000000];
var costLabels = ["1M", "10M", "50M", "100M", "1B"];

function fmtMoney(n) {
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return "$" + (n / 1000).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

function updateCost() {
  var idx  = parseInt(document.getElementById("cost-slider").value, 10);
  var vol  = costVols[idx];
  document.getElementById("cost-vol-label").textContent = costLabels[idx];
  document.getElementById("cost-push").textContent  = "$0";
  document.getElementById("cost-email").textContent = fmtMoney(vol * 0.0001);
  document.getElementById("cost-sms").textContent   = fmtMoney(vol * 0.0075);
}

updateCost();
</script>

---

## 12. Priority Queues

Not all notifications are equal. A 2FA code that doesn't arrive means a locked-out user; a marketing email that arrives 10 minutes late is fine.

<div class="pq-wrap">
  <div class="arch-title">Priority routing in Kafka</div>
  <div class="pq-row">
    <span class="pq-tag critical">critical</span>
    <span style="font-size:.8rem;color:rgba(255,255,255,.6)">2FA / payment / security alert</span>
    <span class="pq-arrow">→</span>
    <span class="pq-node hi">Partition 0 (priority)</span>
    <span class="pq-arrow">→</span>
    <span class="pq-node hi">Dedicated Worker Pool (3×)</span>
    <span class="pq-arrow">→</span>
    <span class="pq-node hi">Provider (no queue wait)</span>
  </div>
  <div class="pq-row">
    <span class="pq-tag marketing">marketing</span>
    <span style="font-size:.8rem;color:rgba(255,255,255,.6)">newsletters / promotions</span>
    <span class="pq-arrow">→</span>
    <span class="pq-node lo">Partitions 1–15 (standard)</span>
    <span class="pq-arrow">→</span>
    <span class="pq-node lo">Shared Worker Pool</span>
    <span class="pq-arrow">→</span>
    <span class="pq-node lo">Provider (may batch)</span>
  </div>
</div>

The separation is enforced at the **producer** level: notification events include a `priority` field (`critical` | `standard`), and the producer routes them to different Kafka topics or partitions:

<div class="code-wrap">
  <div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
  <pre class="code-block"><span class="kw">def</span> <span class="fn">publish_notification</span>(event):
    topic    = <span class="st">"notif-critical"</span> <span class="kw">if</span> event[<span class="st">"priority"</span>] == <span class="st">"critical"</span> <span class="kw">else</span> <span class="st">"notif-standard"</span>
    producer.<span class="fn">send</span>(topic, value=event, key=event[<span class="st">"recipient_id"</span>].<span class="fn">encode</span>())

<span class="cm"># Dedicated workers only subscribe to notif-critical</span>
critical_consumer = <span class="fn">KafkaConsumer</span>(
    <span class="st">"notif-critical"</span>,
    group_id=<span class="st">"push-workers-critical"</span>,
    <span class="cm"># no max_poll_records limit — drain as fast as possible</span>
)

<span class="cm"># Shared workers subscribe to notif-standard</span>
standard_consumer = <span class="fn">KafkaConsumer</span>(
    <span class="st">"notif-standard"</span>,
    group_id=<span class="st">"push-workers-standard"</span>,
    max_poll_records=<span class="nu">100</span>,  <span class="cm"># batch for throughput</span>
)</pre>
</div>

**SLA targets by priority:**

<table class="compare-table">
  <thead>
    <tr><th>Type</th><th>P99 Latency</th><th>Queue Depth Alert</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="no">Critical</span> (2FA, payment)</td>
      <td>&lt; 1 second</td>
      <td>Alert if &gt; 10 messages</td>
    </tr>
    <tr>
      <td><span class="part">Transactional</span> (order shipped)</td>
      <td>&lt; 30 seconds</td>
      <td>Alert if &gt; 1,000 messages</td>
    </tr>
    <tr>
      <td><span style="color:rgba(255,255,255,.45)">Marketing</span> (newsletter)</td>
      <td>&lt; 15 minutes</td>
      <td>Alert if &gt; 1M messages</td>
    </tr>
  </tbody>
</table>

---

## 13. Putting It All Together

<div class="callout callout-green">
  <strong>The complete Level 7 architecture:</strong><br/>
  API → Kafka (2 topics: critical + standard) → 3 channel consumer groups (push, email, sms) per topic → preference check (Redis + MySQL) → idempotency check (Redis SET NX) → template render → provider call → analytics event to ClickHouse → DLQ for failures.
</div>

The system handles 10M/day easily and can scale to billions with horizontal Kafka partitioning and worker auto-scaling on consumer group lag. Key interview talking points:

1. **Decouple producers from consumers** with Kafka — the API never waits on providers
2. **Per-channel workers** with independent consumer groups — email slowness never delays push
3. **User preferences** checked before every send — respect opt-outs, GDPR-compliant
4. **Idempotency keys** prevent duplicate sends during Kafka rebalances
5. **Priority routing** gives 2FA codes a dedicated fast lane
6. **DLQ** for every channel — never lose a failure silently
7. **Analytics pipeline** closes the loop — you know delivery rate, open rate, bounce rate

{: class="marginalia" }
At Facebook scale,<br/>notifications are a **product**<br/>in themselves — the team<br/>that owns the notification<br/>infrastructure is separate<br/>from the teams that trigger<br/>notifications.

A common follow-up question: *what if a user has 10 devices?* The device registry stores all active tokens per user. The push worker fans out to all tokens in parallel. If any token returns `BadDeviceToken`, it's removed; if all fail, it falls back to email. This is why the idempotency key must include the device token: `notif_id + ":" + device_token`, not just `notif_id`.

Another common extension: **digest notifications**. Instead of sending 50 "X liked your photo" pushes, batch them into "Alice and 49 others liked your photo". The fanout service groups events by recipient within a 30-second window before publishing to Kafka. This reduces provider API calls and prevents notification fatigue — one of the most impactful product improvements you can make to a notification system.

---

<script>
function copyCode(btn) {
  var pre = btn.closest(".code-wrap").querySelector("pre.code-block");
  var text = pre ? pre.textContent : "";
  if (!navigator.clipboard) { btn.textContent = "copied!"; btn.classList.add("copied"); return; }
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = "copied!";
    btn.classList.add("copied");
    setTimeout(function() { btn.textContent = "copy"; btn.classList.remove("copied"); }, 1800);
  });
}
</script>
