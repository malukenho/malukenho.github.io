---
layout: post
title: "🤖 AI Models Cost Guide for Software Engineers"
author: Jefersson Nathan
date: Mon Mar 31 14:00:00 CEST 2026
categories: [ "post" ]
description: "A practical guide to AI model costs, use cases, and when to use which model in your daily dev workflow."
tags: [ai, llm, cursor, openai, anthropic, productivity, tools]
---

{: class="marginalia" }
💸 Prices shown are<br/>per **1M tokens**.<br/>Always check the<br/>vendor's pricing page<br/>for the latest rates.

Every time I open Cursor or fire up a script that calls an LLM API, I feel the silent tick of a meter running.
Tokens in, tokens out — and the bill at the end of the month can surprise you if you haven't thought carefully
about *which model* you're calling and *when*.

This post is my attempt to map out the landscape: what the major models cost today, where they genuinely shine,
and a set of **opinionated recipes** for common software-engineering tasks so you can pick the right tool
without burning your budget.

---

<!-- =====================================================================
     INTERACTIVE COST TABLE
     ===================================================================== -->

<style>
/* ── Post-scoped styles ──────────────────────────────────────── */
.ai-section { margin: 2.4rem 0; }

/* Cost table */
.cost-table-wrap { overflow-x: auto; margin: 1.6rem 0; }
.cost-table {
  width: 100%; border-collapse: collapse; font-size: 14px;
  background: #1e1f24; border-radius: 10px; overflow: hidden;
}
.cost-table thead tr { background: #2a2b30; }
.cost-table th {
  padding: 12px 16px; text-align: left; color: #fbef8a;
  font-size: 12px; text-transform: uppercase; letter-spacing: .07em;
  cursor: pointer; user-select: none; white-space: nowrap;
}
.cost-table th:hover { color: #fff; }
.cost-table th .sort-icon { margin-left: 4px; opacity: .45; }
.cost-table th.sorted .sort-icon { opacity: 1; color: #7bcdab; }
.cost-table td { padding: 11px 16px; border-top: 1px solid #2e2f35; color: rgba(255,255,255,.82); }
.cost-table tr:hover td { background: #252629; }
.cost-table .badge {
  display: inline-block; padding: 2px 8px; border-radius: 20px;
  font-size: 11px; font-weight: 700; letter-spacing: .04em;
}
.badge-fast   { background: #1a3a2a; color: #7bcdab; }
.badge-smart  { background: #2a2a1a; color: #fbef8a; }
.badge-power  { background: #3a1a1a; color: #f08080; }
.badge-balanced { background: #1a2a3a; color: #7ab8cd; }

.tier-fast   td:first-child { border-left: 3px solid #7bcdab; }
.tier-smart  td:first-child { border-left: 3px solid #fbef8a; }
.tier-power  td:first-child { border-left: 3px solid #f08080; }

.cost-bar-cell { width: 120px; }
.cost-bar-bg {
  background: #2e2f35; border-radius: 4px; height: 6px;
  overflow: hidden; margin-top: 4px;
}
.cost-bar-fill { height: 100%; border-radius: 4px; transition: width .4s ease; }

/* Filter pills */
.filter-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1rem; }
.pill {
  padding: 5px 14px; border-radius: 20px; font-size: 13px; cursor: pointer;
  border: 1px solid #3a3b40; background: transparent; color: rgba(255,255,255,.6);
  transition: all .2s;
}
.pill:hover { border-color: #7bcdab; color: #fff; }
.pill.active { background: #7bcdab; border-color: #7bcdab; color: #19191c; font-weight: 700; }

/* Chart */
.chart-container {
  background: #1e1f24; border-radius: 10px; padding: 20px;
  margin: 1.6rem 0; position: relative;
}
.chart-container h3 { margin: 0 0 16px; color: #fbef8a; font-size: 15px; }
#costChart { width: 100%; display: block; }

/* Use-case cards */
.usecase-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px; margin: 1.6rem 0;
}
.usecase-card {
  background: #1e1f24; border-radius: 10px; padding: 18px 20px;
  border: 1px solid #2e2f35; transition: border-color .2s, transform .2s;
  cursor: pointer;
}
.usecase-card:hover { border-color: #7bcdab; transform: translateY(-2px); }
.usecase-card.expanded { border-color: #fbef8a; }
.usecase-card .uc-header { display: flex; align-items: center; gap: 10px; }
.usecase-card .uc-emoji { font-size: 22px; }
.usecase-card .uc-title { font-weight: 700; color: #fff; font-size: 15px; }
.usecase-card .uc-sub { color: rgba(255,255,255,.5); font-size: 13px; margin-top: 2px; }
.usecase-card .uc-body { margin-top: 14px; display: none; font-size: 14px; line-height: 1.7; }
.usecase-card.expanded .uc-body { display: block; }
.uc-rec { margin-top: 10px; }
.uc-rec strong { color: #7bcdab; }
.uc-rec .uc-why { color: rgba(255,255,255,.55); font-size: 13px; }
.uc-tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.uc-tag {
  font-size: 11px; padding: 2px 8px; border-radius: 12px;
  background: #2e2f35; color: rgba(255,255,255,.6);
}

/* Cost calculator */
.calc-box {
  background: #1e1f24; border-radius: 10px; padding: 22px 24px;
  border: 1px solid #2e2f35; margin: 1.6rem 0;
}
.calc-box h3 { margin: 0 0 16px; color: #fbef8a; }
.calc-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 12px; }
.calc-field { flex: 1; min-width: 160px; }
.calc-field label { display: block; font-size: 12px; color: rgba(255,255,255,.5); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .06em; }
.calc-field input, .calc-field select {
  width: 100%; padding: 9px 12px; background: #2a2b30; border: 1px solid #3a3b40;
  border-radius: 6px; color: #fff; font-size: 14px; box-sizing: border-box;
  outline: none;
}
.calc-field input:focus, .calc-field select:focus { border-color: #7bcdab; }
.calc-result {
  background: #252629; border-radius: 8px; padding: 16px 18px; margin-top: 12px;
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
}
.calc-result-item .cr-label { font-size: 11px; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .07em; }
.calc-result-item .cr-value { font-size: 22px; font-weight: 700; color: #7bcdab; margin-top: 4px; }

/* Radar / spider chart */
.radar-wrap {
  background: #1e1f24; border-radius: 10px; padding: 20px; margin: 1.6rem 0;
}
.radar-wrap h3 { margin: 0 0 12px; color: #fbef8a; font-size: 15px; }
.radar-controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.radar-toggle {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; cursor: pointer;
  border: 1px solid #3a3b40; background: transparent; color: rgba(255,255,255,.6);
  transition: all .2s;
}
.radar-toggle.on { font-weight: 700; }
#radarChart { width: 100%; max-width: 480px; display: block; margin: 0 auto; }

/* Tip callout */
.tip {
  border-left: 3px solid #7bcdab; background: #1a2e23; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.tip strong { color: #7bcdab; }

/* Warning */
.warn {
  border-left: 3px solid #fbef8a; background: #2a2a1a; border-radius: 0 8px 8px 0;
  padding: 12px 16px; margin: 1.2rem 0; font-size: 14px;
}
.warn strong { color: #fbef8a; }

@media (max-width: 600px) {
  .calc-result { grid-template-columns: 1fr 1fr; }
  .usecase-grid { grid-template-columns: 1fr; }
}
</style>

## The Pricing Landscape

{: class="marginalia" }
📌 Models are grouped<br/>by **tier**: Fast (green),<br/>Balanced (blue),<br/>Smart (yellow),<br/>Power (red).

Below is a live, sortable table of the most relevant models. Click any column header to sort.
Use the filter pills to narrow by tier.

<div class="ai-section">
<div class="filter-pills" id="tierFilter">
  <button class="pill active" data-tier="all">All models</button>
  <button class="pill" data-tier="fast">⚡ Fast &amp; Cheap</button>
  <button class="pill" data-tier="balanced">⚖️ Balanced</button>
  <button class="pill" data-tier="smart">🧠 Smart</button>
  <button class="pill" data-tier="power">🔥 Power</button>
</div>

<div class="cost-table-wrap">
<table class="cost-table" id="costTable">
  <thead>
    <tr>
      <th data-col="model">Model <span class="sort-icon">↕</span></th>
      <th data-col="provider">Provider <span class="sort-icon">↕</span></th>
      <th data-col="input" class="sorted">Input $/1M <span class="sort-icon">↑</span></th>
      <th data-col="output">Output $/1M <span class="sort-icon">↕</span></th>
      <th data-col="context">Context <span class="sort-icon">↕</span></th>
      <th data-col="tier">Tier <span class="sort-icon">↕</span></th>
      <th class="cost-bar-cell">Relative cost</th>
    </tr>
  </thead>
  <tbody id="tableBody"></tbody>
</table>
</div>
</div>

---

## Interactive Cost Calculator

{: class="marginalia" }
🧮 Tokens vary by task.<br/>A typical diff for a<br/>commit message is<br/>≈ 500 input tokens.<br/>A full file review<br/>can be 8 000+.

Estimate your monthly API spend before you commit to a model. Adjust the sliders to match your workflow.

<div class="calc-box">
  <h3>💰 Monthly cost estimator</h3>
  <div class="calc-row">
    <div class="calc-field">
      <label>Model</label>
      <select id="calcModel"></select>
    </div>
    <div class="calc-field">
      <label>Requests / day</label>
      <input type="number" id="calcReqs" value="50" min="1" max="10000">
    </div>
    <div class="calc-field">
      <label>Avg input tokens</label>
      <input type="number" id="calcInput" value="1000" min="1">
    </div>
    <div class="calc-field">
      <label>Avg output tokens</label>
      <input type="number" id="calcOutput" value="400" min="1">
    </div>
  </div>
  <div class="calc-result">
    <div class="calc-result-item">
      <div class="cr-label">Daily cost</div>
      <div class="cr-value" id="crDaily">—</div>
    </div>
    <div class="calc-result-item">
      <div class="cr-label">Monthly cost</div>
      <div class="cr-value" id="crMonthly">—</div>
    </div>
    <div class="calc-result-item">
      <div class="cr-label">Annual cost</div>
      <div class="cr-value" id="crAnnual">—</div>
    </div>
  </div>
</div>

---

## Visual cost comparison

{: class="marginalia" }
📊 The chart shows<br/>**total cost** for a<br/>typical request:<br/>1 000 input + 400<br/>output tokens.

<div class="chart-container">
  <h3>Cost per typical request (1k input + 400 output tokens)</h3>
  <canvas id="costChart" height="260"></canvas>
</div>

---

## Capability Radar

{: class="marginalia" }
⚡ Toggle models on/off<br/>to compare them across<br/>five dimensions.<br/>Scores are opinionated<br/>but research-backed.

How do the models stack up beyond price? Toggle models to compare across five dimensions:
**Speed**, **Reasoning**, **Coding**, **Context handling**, and **Cost-efficiency**.

<div class="radar-wrap">
  <h3>🕸 Model capability radar</h3>
  <div class="radar-controls" id="radarControls"></div>
  <canvas id="radarChart" height="400"></canvas>
</div>

---

## Use-case Recipes

{: class="marginalia" }
🎯 Click any card to<br/>expand the full recipe<br/>with recommended<br/>model, prompt tips,<br/>and token budgets.

The real question isn't "which model is best" but "which model is best **for this specific task**".
Here are the eight tasks I reach for AI on most often as a software engineer.

<div class="usecase-grid" id="usecaseGrid"></div>

---

## Cursor-specific tips

{: class="marginalia" }
🖱️ Cursor now has<br/>**first-party models**<br/>(Composer 1/1.5/2)<br/>trained specifically<br/>for agentic coding.

Cursor (as of March 2026) ships its own first-party **Composer** model family alongside access to frontier models from Anthropic, OpenAI, and Google. Here is how to map them to tasks:

<div class="tip">
<strong>Tab completion &amp; inline edits</strong> — always use Cursor's built-in tab model. It's near-instant and included in every plan. Zero API cost.
</div>

<div class="tip">
<strong>Agent / Composer loop</strong> — <strong>Composer 2 (Fast)</strong> is the new default and the best all-rounder for multi-file coding tasks. It was trained specifically on long-horizon agentic coding and beats Claude Opus 4.1 on SWE-bench Multilingual at a fraction of the price ($1.50/$7.50 per MTok vs $15/$75). Use <strong>Composer 2 Standard</strong> when you have a tight budget and can tolerate slightly slower throughput.
</div>

<div class="tip">
<strong>Chat / Ask</strong> — Claude Sonnet 4.6 remains excellent for reasoning-heavy questions. GPT-5.1 is a strong alternative. For quick "what does this do?" queries, Claude Haiku 4.5 is fast and cheap.
</div>

<div class="warn">
<strong>⚠️ Cursor usage pools</strong> — Composer requests and frontier model (Claude/GPT/Gemini) requests come from <strong>separate usage pools</strong>. Heavy Composer use won't eat your Claude quota. Check <em>Settings → Cursor Account → Usage</em> to see both pools. Pro plan includes generous allowances; Pro+ gives 3× usage on all pools.
</div>

<div class="tip">
<strong>Large codebase refactors</strong> — consider <strong>GPT-4.1</strong> (1M context window) when you need to pass entire repositories as context. It's cheaper than GPT-5.1 and handles massive context significantly better than 128k models.
</div>

---

## The rule of thumb

{: class="marginalia" }
💡 "Use the cheapest<br/>model that can reliably<br/>do the job" is almost<br/>always the right call.

Think of AI models like renting a car:

- You don't take a **Ferrari** to the supermarket → don't use Claude Opus 4.6 to write a three-word commit message.
- You don't drive a **hatchback** on a track day → don't use Haiku 4.5 to design your distributed system.
- A **mid-range saloon** covers 90 % of journeys → Composer 2 / Claude Sonnet 4.6 cover 90 % of dev tasks.

Build a habit: before you invoke an LLM, ask yourself *"Does this really need a power model, or will a fast one do?"*
Your wallet — and your monthly invoice — will thank you. 🙏

---

<!-- =====================================================================
     ALL JAVASCRIPT
     ===================================================================== -->
<script>
(function () {
"use strict";

/* ── Data ──────────────────────────────────────────────────────────────── */
const MODELS = [
  // ── Cursor-native ──────────────────────────────────────────────────────
  { model:"Composer 2 (Fast)",   provider:"Cursor",    input:1.50,  output:7.50,  context:"128k", tier:"smart",    speed:5,reasoning:5,coding:5,ctxHandle:4,costEff:4, cursorNative:true },
  { model:"Composer 2",          provider:"Cursor",    input:0.50,  output:2.50,  context:"128k", tier:"balanced", speed:3,reasoning:5,coding:5,ctxHandle:4,costEff:5, cursorNative:true },
  { model:"Composer 1.5",        provider:"Cursor",    input:0.40,  output:2.00,  context:"128k", tier:"balanced", speed:3,reasoning:4,coding:4,ctxHandle:4,costEff:5, cursorNative:true },
  { model:"Composer 1",          provider:"Cursor",    input:0.30,  output:1.50,  context:"128k", tier:"fast",     speed:3,reasoning:3,coding:3,ctxHandle:3,costEff:5, cursorNative:true },
  // ── Anthropic ──────────────────────────────────────────────────────────
  { model:"Claude Opus 4.6",     provider:"Anthropic", input:5.00,  output:25.00, context:"200k", tier:"power",    speed:2,reasoning:5,coding:5,ctxHandle:5,costEff:2 },
  { model:"Claude Sonnet 4.6",   provider:"Anthropic", input:3.00,  output:15.00, context:"200k", tier:"smart",    speed:4,reasoning:5,coding:5,ctxHandle:5,costEff:3 },
  { model:"Claude Haiku 4.5",    provider:"Anthropic", input:1.00,  output:5.00,  context:"200k", tier:"fast",     speed:5,reasoning:3,coding:4,ctxHandle:4,costEff:5 },
  { model:"Claude Opus 4.1",     provider:"Anthropic", input:15.00, output:75.00, context:"200k", tier:"power",    speed:1,reasoning:5,coding:5,ctxHandle:5,costEff:1 },
  { model:"Claude Haiku 3",      provider:"Anthropic", input:0.25,  output:1.25,  context:"200k", tier:"fast",     speed:5,reasoning:2,coding:3,ctxHandle:4,costEff:5 },
  // ── OpenAI ─────────────────────────────────────────────────────────────
  { model:"GPT-5.4",             provider:"OpenAI",    input:15.00, output:60.00, context:"128k", tier:"power",    speed:2,reasoning:5,coding:5,ctxHandle:4,costEff:1 },
  { model:"GPT-5.1",             provider:"OpenAI",    input:5.00,  output:20.00, context:"128k", tier:"smart",    speed:3,reasoning:5,coding:5,ctxHandle:4,costEff:2 },
  { model:"GPT-5.4 mini",        provider:"OpenAI",    input:0.40,  output:1.60,  context:"128k", tier:"fast",     speed:5,reasoning:3,coding:4,ctxHandle:4,costEff:5 },
  { model:"GPT-4.1",             provider:"OpenAI",    input:2.00,  output:8.00,  context:"1M",   tier:"balanced", speed:4,reasoning:4,coding:4,ctxHandle:5,costEff:4 },
  // ── Google ─────────────────────────────────────────────────────────────
  { model:"Gemini 2.5 Pro",      provider:"Google",    input:2.00,  output:12.00, context:"1M",   tier:"smart",    speed:3,reasoning:5,coding:4,ctxHandle:5,costEff:3 },
  { model:"Gemini 2.5 Flash",    provider:"Google",    input:0.25,  output:1.50,  context:"1M",   tier:"fast",     speed:5,reasoning:3,coding:3,ctxHandle:5,costEff:5 },
  // ── DeepSeek ───────────────────────────────────────────────────────────
  { model:"DeepSeek V3.2",       provider:"DeepSeek",  input:0.28,  output:0.42,  context:"128k", tier:"fast",     speed:4,reasoning:4,coding:4,ctxHandle:4,costEff:5 },
];

const TIER_COLOR = { fast:"#7bcdab", balanced:"#7ab8cd", smart:"#fbef8a", power:"#f08080" };
const TIER_LABEL = { fast:"⚡ Fast", balanced:"⚖️ Balanced", smart:"🧠 Smart", power:"🔥 Power" };
const TIER_CLASS = { fast:"tier-fast", balanced:"tier-balanced", smart:"tier-smart", power:"tier-power" };

const USE_CASES = [
  {
    emoji:"📝", title:"Commit messages", sub:"From a staged diff to a conventional commit",
    models:["Claude Haiku 4.5","DeepSeek V3.2","Composer 1"],
    why:"Commit messages need minimal reasoning — just intent extraction from a diff. Fast cheap models nail this perfectly.",
    tokens:"~500 in / ~80 out",
    tips:["Feed only the diff, not the full file","Ask for Conventional Commits format","Keep temperature ≤ 0.3 for consistency"],
    tags:["git","automation","daily"]
  },
  {
    emoji:"📋", title:"Changelog generation", sub:"Aggregate commits → release notes",
    models:["GPT-5.4 mini","Claude Haiku 4.5","Composer 1.5"],
    why:"Changelogs need grouping and light editorial judgment. Fast models handle small releases; Sonnet for large ones.",
    tokens:"~2k in / ~600 out",
    tips:["Group commits by type first","Ask the model to remove internal/chore commits","Request markdown output directly"],
    tags:["release","documentation","git"]
  },
  {
    emoji:"🏛️", title:"Architecture design", sub:"System design, ADRs, trade-off analysis",
    models:["Claude Opus 4.6","GPT-5.4","Claude Sonnet 4.6"],
    why:"Architecture requires deep reasoning across requirements, constraints, and long-term trade-offs. Invest in a power model.",
    tokens:"~3k in / ~1.5k out",
    tips:["Provide context: team size, scale, existing stack","Ask for explicit trade-offs and alternatives","Request an ADR-style output"],
    tags:["design","planning","senior"]
  },
  {
    emoji:"🔍", title:"Code review", sub:"PR feedback, security issues, style",
    models:["Claude Sonnet 4.6","Gemini 2.5 Pro","Composer 2 (Fast)"],
    why:"Code review benefits from broad coding knowledge and long context. Sonnet 4.6 or Composer 2 are the sweet spot.",
    tokens:"~4k in / ~800 out",
    tips:["Send only the changed files, not the full repo","Ask for security, performance, and correctness separately","Request line-number references in feedback"],
    tags:["quality","PR","security"]
  },
  {
    emoji:"🐛", title:"Bug investigation", sub:"Stack traces, reproduce + fix",
    models:["Composer 2 (Fast)","Claude Sonnet 4.6","DeepSeek V3.2"],
    why:"Bug fixing needs strong reasoning. Composer 2 is trained specifically for agentic coding. DeepSeek V3.2 is surprisingly capable and cheap.",
    tokens:"~2k in / ~600 out",
    tips:["Include the full stack trace + relevant code","Describe what you already tried","Ask for a root cause explanation before the fix"],
    tags:["debugging","quality"]
  },
  {
    emoji:"📖", title:"Documentation", sub:"README, JSDoc, API docs",
    models:["GPT-5.4 mini","Claude Haiku 4.5","Gemini 2.5 Flash"],
    why:"Docs are formulaic — fast models produce perfectly good output at a fraction of the cost.",
    tokens:"~1.5k in / ~800 out",
    tips:["Provide a concrete example of the style you want","Ask for a specific format (JSDoc, OpenAPI, etc.)","Review for hallucinated parameters"],
    tags:["docs","onboarding"]
  },
  {
    emoji:"♻️", title:"Refactoring", sub:"Extract function, rename, simplify",
    models:["Composer 2","Claude Sonnet 4.6","GPT-4.1"],
    why:"Refactoring is well-defined work. Composer 2 (standard) hits the ideal price/quality ratio. GPT-4.1 is great for large 1M-context refactors.",
    tokens:"~2k in / ~1.5k out",
    tips:["Describe the desired end-state, not just \"clean this up\"","Ask the model to preserve behaviour and list any assumptions","Always diff the output before applying"],
    tags:["quality","codebase","daily"]
  },
  {
    emoji:"🧪", title:"Test generation", sub:"Unit tests, edge cases, mocks",
    models:["GPT-5.4 mini","DeepSeek V3.2","Claude Haiku 4.5"],
    why:"Test generation is high-volume and repetitive. Use the cheapest model that understands your test framework.",
    tokens:"~1.5k in / ~1.2k out",
    tips:["Provide one example test to set the pattern","Ask explicitly for edge cases and error paths","Request mocks/stubs for external dependencies"],
    tags:["testing","quality","automation"]
  },
];

/* ── Table ──────────────────────────────────────────────────────────────── */
let sortCol = "input", sortDir = 1, activeTier = "all";
const maxCost = Math.max(...MODELS.map(m => m.input));

function renderTable() {
  const tbody = document.getElementById("tableBody");
  let rows = [...MODELS];
  if (activeTier !== "all") rows = rows.filter(m => m.tier === activeTier);
  rows.sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (typeof av === "string") av = av.toLowerCase(), bv = bv.toLowerCase();
    return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
  });

  tbody.innerHTML = rows.map(m => {
    const pct = Math.round((m.input / maxCost) * 100);
    const color = TIER_COLOR[m.tier];
    const cursorBadge = m.cursorNative ? ' <span class="badge" style="background:#1a1a3a;color:#a78bfa;font-size:10px">🖱 Cursor</span>' : '';
    return `<tr class="${TIER_CLASS[m.tier]}">
      <td><strong>${m.model}</strong>${cursorBadge}</td>
      <td>${m.provider}</td>
      <td>$${m.input.toFixed(2)}</td>
      <td>$${m.output.toFixed(2)}</td>
      <td>${m.context}</td>
      <td><span class="badge badge-${m.tier}">${TIER_LABEL[m.tier]}</span></td>
      <td class="cost-bar-cell">
        <div style="font-size:11px;color:rgba(255,255,255,.4)">${pct}%</div>
        <div class="cost-bar-bg"><div class="cost-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      </td>
    </tr>`;
  }).join("");
}

// Sort headers
document.querySelectorAll(".cost-table th[data-col]").forEach(th => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;
    if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
    document.querySelectorAll(".cost-table th").forEach(t => {
      t.classList.remove("sorted");
      const ic = t.querySelector(".sort-icon");
      if (ic) ic.textContent = "↕";
    });
    th.classList.add("sorted");
    const ic = th.querySelector(".sort-icon");
    if (ic) ic.textContent = sortDir === 1 ? "↑" : "↓";
    renderTable();
  });
});

// Tier filter pills
document.querySelectorAll("#tierFilter .pill").forEach(pill => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("#tierFilter .pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    activeTier = pill.dataset.tier;
    renderTable();
  });
});

renderTable();

/* ── Calculator ─────────────────────────────────────────────────────────── */
const calcModelEl = document.getElementById("calcModel");
MODELS.forEach(m => {
  const o = document.createElement("option");
  o.value = m.model;
  o.textContent = `${m.model} (${m.provider})`;
  calcModelEl.appendChild(o);
});
// default to GPT-4o mini
calcModelEl.value = "GPT-4o mini";

function updateCalc() {
  const m = MODELS.find(x => x.model === calcModelEl.value);
  if (!m) return;
  const reqs = parseFloat(document.getElementById("calcReqs").value) || 0;
  const inp  = parseFloat(document.getElementById("calcInput").value) || 0;
  const out  = parseFloat(document.getElementById("calcOutput").value) || 0;
  const daily = reqs * (inp / 1e6 * m.input + out / 1e6 * m.output);
  const fmt = v => v < 0.01 ? `$${(v*100).toFixed(3)}¢` : `$${v.toFixed(2)}`;
  document.getElementById("crDaily").textContent   = fmt(daily);
  document.getElementById("crMonthly").textContent = fmt(daily * 30);
  document.getElementById("crAnnual").textContent  = fmt(daily * 365);
}

["calcModel","calcReqs","calcInput","calcOutput"].forEach(id =>
  document.getElementById(id).addEventListener("input", updateCalc));
updateCalc();

/* ── Bar chart ──────────────────────────────────────────────────────────── */
(function drawBar() {
  const canvas = document.getElementById("costChart");
  if (!canvas) return;

  function draw() {
    const W = canvas.offsetWidth || 600;
    const H = 260;
    canvas.width  = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const pad = { top:20, right:20, bottom:70, left:60 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    // cost per typical request: 1000 input + 400 output tokens
    const data = MODELS.map(m => ({
      label: m.model,
      cost: (1000/1e6 * m.input) + (400/1e6 * m.output),
      color: TIER_COLOR[m.tier]
    })).sort((a,b) => a.cost - b.cost);

    const maxV = data[data.length-1].cost;
    const bw = Math.floor(cw / data.length) - 4;

    ctx.fillStyle = "#1e1f24";
    ctx.fillRect(0, 0, W, H);

    // grid lines
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ch - (i/4) * ch;
      ctx.strokeStyle = "#2e2f35";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
      const label = "$" + ((i/4 * maxV) * 1000).toFixed(3) + "¢ /req";
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(label, pad.left - 6, y + 3);
    }

    data.forEach((d, i) => {
      const x = pad.left + i * (cw / data.length) + 2;
      const barH = (d.cost / maxV) * ch;
      const y = pad.top + ch - barH;

      // bar
      ctx.fillStyle = d.color + "88";
      ctx.beginPath();
      const r = 4;
      ctx.moveTo(x + r, y); ctx.lineTo(x + bw - r, y);
      ctx.arcTo(x+bw, y, x+bw, y+r, r);
      ctx.lineTo(x+bw, y+barH); ctx.lineTo(x, y+barH);
      ctx.arcTo(x, y, x+r, y, r);
      ctx.closePath(); ctx.fill();

      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // value label
      ctx.fillStyle = d.color;
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("$" + (d.cost * 1000).toFixed(4) + "¢", x + bw/2, y - 5);

      // model label (rotated)
      ctx.save();
      ctx.translate(x + bw/2, pad.top + ch + 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(d.label, 0, 0);
      ctx.restore();
    });
  }

  draw();
  window.addEventListener("resize", draw);
})();

/* ── Radar chart ────────────────────────────────────────────────────────── */
(function initRadar() {
  const DIMS = ["Speed","Reasoning","Coding","Context","Cost-eff"];
  const RADAR_MODELS = [
    "Composer 2 (Fast)","Claude Sonnet 4.6","GPT-5.1","Claude Haiku 4.5","DeepSeek V3.2","Gemini 2.5 Flash"
  ];
  const DIM_MAP = { Speed:"speed", Reasoning:"reasoning", Coding:"coding", Context:"ctxHandle", "Cost-eff":"costEff" };
  const colors = ["#a78bfa","#f08080","#fbef8a","#7bcdab","#c49aff","#7ab8cd"];
  let active = new Set(["Composer 2 (Fast)","Claude Sonnet 4.6"]);

  const ctrl = document.getElementById("radarControls");
  RADAR_MODELS.forEach((name, i) => {
    const btn = document.createElement("button");
    btn.className = "radar-toggle" + (active.has(name) ? " on" : "");
    btn.textContent = name;
    btn.style.borderColor = colors[i];
    if (active.has(name)) btn.style.background = colors[i] + "33", btn.style.color = colors[i];
    btn.addEventListener("click", () => {
      if (active.has(name)) active.delete(name); else active.add(name);
      btn.classList.toggle("on");
      btn.style.background = active.has(name) ? colors[i] + "33" : "transparent";
      btn.style.color = active.has(name) ? colors[i] : "rgba(255,255,255,.5)";
      drawRadar();
    });
    ctrl.appendChild(btn);
  });

  function drawRadar() {
    const canvas = document.getElementById("radarChart");
    if (!canvas) return;
    const size = Math.min(canvas.offsetWidth || 400, 400);
    canvas.width  = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const cx = size/2, cy = size/2, r = size/2 - 50;
    const n = DIMS.length;

    ctx.fillStyle = "#1e1f24";
    ctx.fillRect(0, 0, size, size);

    // grid rings
    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath();
      for (let d = 0; d < n; d++) {
        const angle = (d / n) * 2 * Math.PI - Math.PI / 2;
        const x = cx + Math.cos(angle) * r * ring / 5;
        const y = cy + Math.sin(angle) * r * ring / 5;
        d === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#2e2f35";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // spokes
    for (let d = 0; d < n; d++) {
      const angle = (d / n) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = "#3a3b40";
      ctx.lineWidth = 1;
      ctx.stroke();

      // labels
      const lx = cx + Math.cos(angle) * (r + 22);
      const ly = cy + Math.sin(angle) * (r + 22);
      ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(DIMS[d], lx, ly);
    }

    // model polygons
    RADAR_MODELS.forEach((name, i) => {
      if (!active.has(name)) return;
      const m = MODELS.find(x => x.model === name);
      if (!m) return;
      ctx.beginPath();
      DIMS.forEach((dim, d) => {
        const val = m[DIM_MAP[dim]] / 5;
        const angle = (d / n) * 2 * Math.PI - Math.PI / 2;
        const x = cx + Math.cos(angle) * r * val;
        const y = cy + Math.sin(angle) * r * val;
        d === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = colors[i] + "22";
      ctx.fill();
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 2;
      ctx.stroke();

      // legend dot
      const dotY = 16 + i * 18;
      ctx.beginPath();
      ctx.arc(16, dotY, 5, 0, Math.PI*2);
      ctx.fillStyle = colors[i];
      ctx.fill();
      ctx.fillStyle = active.has(name) ? colors[i] : "rgba(255,255,255,.3)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(name, 26, dotY + 1);
    });
  }

  drawRadar();
  window.addEventListener("resize", drawRadar);
})();

/* ── Use-case cards ─────────────────────────────────────────────────────── */
const grid = document.getElementById("usecaseGrid");
USE_CASES.forEach(uc => {
  const card = document.createElement("div");
  card.className = "usecase-card";
  card.innerHTML = `
    <div class="uc-header">
      <span class="uc-emoji">${uc.emoji}</span>
      <div><div class="uc-title">${uc.title}</div><div class="uc-sub">${uc.sub}</div></div>
    </div>
    <div class="uc-body">
      <div class="uc-rec">
        <strong>Recommended:</strong> ${uc.models.join(", ")}<br/>
        <span class="uc-why">${uc.why}</span>
      </div>
      <div class="uc-rec" style="margin-top:8px">
        <strong>Token budget:</strong> <span style="color:rgba(255,255,255,.7)">${uc.tokens}</span>
      </div>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;color:rgba(255,255,255,.65)">
        ${uc.tips.map(t => `<li style="margin-bottom:4px">${t}</li>`).join("")}
      </ul>
      <div class="uc-tag-row">${uc.tags.map(t => `<span class="uc-tag">#${t}</span>`).join("")}</div>
    </div>`;
  card.addEventListener("click", () => {
    const wasExpanded = card.classList.contains("expanded");
    document.querySelectorAll(".usecase-card").forEach(c => c.classList.remove("expanded"));
    if (!wasExpanded) card.classList.add("expanded");
  });
  grid.appendChild(card);
});

})();
</script>
