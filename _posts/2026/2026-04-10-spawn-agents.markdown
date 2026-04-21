---
layout: post
title: "🚀 Spawning Parallel Agents Across Multiple Repos"
author: Jefersson Nathan
date: Fri Apr 10 10:00:00 CEST 2026
categories: [ "post" ]
description: "How I use a single shell script to clone multiple repos into one Cursor workspace and let agents work across them simultaneously."
tags: [ai, cursor, agents, automation, shell, productivity, workflow]
---

{: class="marginalia" }
🧬 Each **spawn** creates<br/>a fully isolated copy<br/>of every repo via<br/>`git clone --local`<br/>(copy-on-write, near<br/>instant on macOS).

The biggest friction in modern AI-assisted development isn't the models — it's the **workspace problem**. You're shipping a feature that touches a backend service, a client library, and an infrastructure repo. You need the agent to reason across all three simultaneously, make consistent changes, and open PRs that actually cohere.

The usual answer? Open three terminal windows, manually create matching branches, context-switch constantly. It works, but it doesn't *flow*.

This post is about a small script I wrote called **`spawn`** that solves exactly this. It creates a clean, isolated workspace with all your repos cloned and pre-branched, then opens everything in a single Cursor window. One command, zero context-switching.

---

## The idea

{: class="marginalia" }
`git clone --local`<br/>uses hard-links on<br/>the same filesystem,<br/>so the clone is<br/>nearly instantaneous<br/>and uses minimal<br/>extra disk space.

Every agent gets its own **sandbox directory** — a folder that contains one `git clone --local` of each repo you care about. All clones are put on the same branch. A `.code-workspace` file stitches them into a single Cursor multi-root workspace so the AI can see across repo boundaries as if they were one project.

Think of it like spawning a new process: isolated state, clean branch, no side-effects on your main working copies.

<div id="concept-diagram"></div>

---

## Installation

The script lives at `~/gitlab.com/angi/anchor/spawn`. Drop a symlink so it's on your `PATH`:

```bash
ln -s ~/gitlab.com/angi/anchor/spawn ~/.local/bin/spawn
chmod +x ~/.local/bin/spawn
```

Dependencies: **bash ≥ 5**, **git**, **python3** (stdlib only), and **cursor** on your PATH.

---

## Configuration

{: class="marginalia" }
💡 The config file is<br/>created with sensible<br/>defaults on first use<br/>if it doesn't exist.

On first run `spawn` creates `~/.config/spawn/config.json`. You can also pass a custom path via `SPAWN_CONFIG=/path/to/file.json`.

**Build your config interactively below** — then copy the JSON into `~/.config/spawn/config.json`.

<div id="config-builder"></div>

The keys:

| Key | Required | Description |
|---|---|---|
| `workspace_root` | ✓ | Parent directory for all agent workspaces |
| `primary_repos` | ✓ | Always cloned (your core services) |
| `secondary_repos` | – | Only cloned with `--all` flag |

---

## Usage

{: class="marginalia" }
`spawn` without args<br/>prints the full help<br/>text — good habit<br/>to check after updates.

Hit **Run** below to watch a simulated spawn session:

<div id="terminal-demo"></div>

The four commands you'll actually use:

```bash
# create a new isolated workspace on branch feat/my-feature
spawn feat/my-feature

# same, but also clone secondary repos (docs, infra, etc.)
spawn --all feat/my-feature

# list all your agents and their current branches
spawn --list

# open an existing agent in Cursor
spawn --open feat-my-feature__a3f9c21b

# delete a finished agent (asks for confirmation)
spawn --remove feat-my-feature__a3f9c21b
```

---

## Watching agents work across repos

{: class="marginalia" }
🤖 In practice I run<br/>2–4 agents in parallel<br/>on separate branches.<br/>Each has its own<br/>Cursor window with<br/>the branch name in<br/>the title bar.

Once Cursor opens the workspace file, the agent sees every repo as a top-level folder in the Explorer. You can:

- Ask it to trace a type across `backend/` → `client-lib/` → `infra/` in one message
- Have it create matching migration + schema + client changes atomically
- Review all diffs in one `git status` across all roots

The simulation below shows **three parallel agents** running on separate spawned workspaces. Toggle them on/off to see what each is doing:

<div id="agent-board"></div>

---

## How the workspace file works

{: class="marginalia" }
The `window.title`<br/>setting embeds the<br/>branch name so you<br/>always know which<br/>agent is in which<br/>Cursor window.

`spawn` writes two files into each agent directory:

**`agent.code-workspace`**
```json
{
  "folders": [
    { "path": ".", "name": "feat/payments-v2" }
  ],
  "settings": {
    "window.title": "${dirty}${separator}feat/payments-v2${separator}${activeEditorShort}${separator}${appName}"
  }
}
```

**`.vscode/settings.json`** (same `window.title` — Cursor reads both).

When you `cursor agent.code-workspace`, Cursor opens all subdirectories as workspace roots and shows the branch in the title bar, so you always know which agent is which at a glance.

---

## Tips & tricks

{: class="marginalia" }
🔑 `SPAWN_FORCE=1`<br/>skips the confirmation<br/>prompt for `--remove`.<br/>Useful in scripts.

<div id="tips-accordion"></div>

---

## The mental model

{: class="marginalia" }
🎯 One branch per task.<br/>One Cursor window<br/>per branch. Let the<br/>agent run. Review<br/>the diff. Merge.<br/>Delete the workspace.

A useful way to think about `spawn` is as **git worktree with superpowers**. Regular worktrees let you check out a different branch into a second directory — `spawn` does the same but for *N* repos at once, wires them into a Cursor workspace, and adds metadata so you can manage the lifecycle (`--list`, `--open`, `--remove`).

The workflow:

1. `spawn feat/my-feature` — agent opens in Cursor
2. Describe the cross-repo feature in Cursor's Composer
3. Agent edits files across all repos
4. `git diff` in each repo, review, push
5. `spawn --remove feat-my-feature__<id>` — clean up

Each task is a clean slate. No lingering uncommitted changes. No branch confusion. Just: spawn, build, ship, remove.

---

<style>
/* ── Post-scoped styles ──────────────────────────── */

/* Concept diagram */
#concept-diagram {
  margin: 2rem 0;
  background: #1e1f24;
  border-radius: 12px;
  padding: 24px;
  overflow: hidden;
}
.cd-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.cd-box {
  background: #252629; border-radius: 8px; padding: 12px 16px;
  border: 1px solid #3a3b40; font-size: 13px; min-width: 100px; text-align: center;
}
.cd-box .cb-title { color: #fbef8a; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing:.06em; margin-bottom: 4px; }
.cd-box .cb-sub { color: rgba(255,255,255,.5); font-size: 11px; }
.cd-arrow { font-size: 22px; color: #7bcdab; flex-shrink: 0; }
.cd-repos { display: flex; flex-direction: column; gap: 8px; }
.cd-clone-set { display: flex; flex-direction: column; gap: 6px; }
.cd-clone {
  background: #1a2e23; border: 1px solid #7bcdab44; border-radius: 6px;
  padding: 6px 12px; font-size: 12px; color: #7bcdab; white-space: nowrap;
  transform: translateX(40px); opacity: 0; transition: all 0.5s ease;
}
.cd-clone.visible { transform: translateX(0); opacity: 1; }
.cd-workspace {
  background: #1a1a3a; border: 1px solid #a78bfa55; border-radius: 8px;
  padding: 10px 14px; font-size: 12px; color: #a78bfa; margin-top: 8px;
  opacity: 0; transition: opacity 0.4s ease;
}
.cd-workspace.visible { opacity: 1; }

/* Config builder */
#config-builder {
  background: #1e1f24; border-radius: 12px; padding: 22px 24px; margin: 1.6rem 0;
  border: 1px solid #2e2f35;
}
.cb-label { font-size: 12px; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing:.06em; margin-bottom: 6px; display: block; }
.cb-input {
  width: 100%; padding: 8px 12px; background: #252629; border: 1px solid #3a3b40;
  border-radius: 6px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none; margin-bottom: 8px;
}
.cb-input:focus { border-color: #7bcdab; }
.repo-row { display: flex; gap: 8px; margin-bottom: 6px; }
.repo-row .cb-input { margin-bottom: 0; flex: 1; }
.cb-del {
  background: #3a1a1a; border: 1px solid #f0808055; color: #f08080;
  border-radius: 6px; padding: 0 12px; cursor: pointer; font-size: 18px; flex-shrink: 0;
  transition: background .2s;
}
.cb-del:hover { background: #5a2a2a; }
.cb-add {
  background: transparent; border: 1px dashed #7bcdab66; color: #7bcdab;
  border-radius: 6px; padding: 7px 14px; cursor: pointer; font-size: 13px;
  margin-top: 4px; transition: all .2s;
}
.cb-add:hover { border-color: #7bcdab; background: #1a2e23; }
.cb-section { margin-bottom: 18px; }
.cb-output {
  background: #141416; border-radius: 8px; padding: 16px; margin-top: 16px;
  font-family: "BerkeleyMono", "JetBrains Mono", monospace; font-size: 12px;
  color: #7bcdab; white-space: pre; overflow-x: auto; border: 1px solid #2e2f35;
  position: relative;
}
.cb-copy {
  position: absolute; top: 8px; right: 8px; background: #2e2f35; border: none;
  color: rgba(255,255,255,.6); border-radius: 4px; padding: 4px 10px; font-size: 11px;
  cursor: pointer; transition: all .2s;
}
.cb-copy:hover { background: #7bcdab; color: #19191c; }

/* Terminal */
#terminal-demo {
  background: #141416; border-radius: 12px; overflow: hidden; margin: 1.6rem 0;
  border: 1px solid #2e2f35;
}
.term-titlebar {
  background: #252629; padding: 10px 16px; display: flex; align-items: center; gap: 8px;
}
.term-dot { width: 12px; height: 12px; border-radius: 50%; }
.term-dot-r { background: #f08080; }
.term-dot-y { background: #fbef8a; }
.term-dot-g { background: #7bcdab; }
.term-title { color: rgba(255,255,255,.4); font-size: 12px; margin-left: auto; margin-right: auto; }
.term-body {
  padding: 16px; font-family: "BerkeleyMono","JetBrains Mono",monospace; font-size: 13px;
  min-height: 220px; color: rgba(255,255,255,.8);
}
.term-line { margin: 2px 0; line-height: 1.6; opacity: 0; transition: opacity .15s; }
.term-line.show { opacity: 1; }
.term-prompt { color: #7bcdab; }
.term-cmd { color: #fff; }
.term-out-blue { color: #7ab8cd; }
.term-out-green { color: #7bcdab; }
.term-out-yellow { color: #fbef8a; }
.term-cursor { display: inline-block; width: 8px; height: 14px; background: #7bcdab; animation: blink 1s step-end infinite; vertical-align: text-bottom; }
@keyframes blink { 50% { opacity: 0; } }
.term-controls {
  padding: 12px 16px; border-top: 1px solid #2e2f35; display: flex; gap: 8px;
}
.term-btn {
  padding: 6px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none;
  font-weight: 600; transition: all .2s;
}
.term-btn-run { background: #7bcdab; color: #19191c; }
.term-btn-run:hover { background: #5db898; }
.term-btn-clear { background: #2e2f35; color: rgba(255,255,255,.6); }
.term-btn-clear:hover { background: #3a3b40; color: #fff; }

/* Agent board */
#agent-board {
  margin: 1.6rem 0;
}
.ab-controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.ab-toggle {
  padding: 5px 14px; border-radius: 20px; font-size: 13px; cursor: pointer;
  border: 1px solid; background: transparent; transition: all .2s; font-weight: 600;
}
.ab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.ab-card {
  background: #1e1f24; border-radius: 10px; border: 1px solid #2e2f35;
  overflow: hidden; transition: border-color .2s;
}
.ab-card.active { border-color: #7bcdab55; }
.ab-card-header {
  padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid #2e2f35;
}
.ab-agent-name { font-weight: 700; font-size: 14px; }
.ab-branch { font-size: 11px; color: rgba(255,255,255,.4); font-family: monospace; }
.ab-status-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  transition: background .3s;
}
.ab-status-idle { background: #555; }
.ab-status-working { background: #7bcdab; animation: pulse 1.5s ease-in-out infinite; }
.ab-status-done { background: #fbef8a; }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
.ab-repos { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
.ab-repo-row { display: flex; align-items: center; gap: 10px; font-size: 12px; }
.ab-repo-name { color: rgba(255,255,255,.6); width: 100px; flex-shrink: 0; font-family: monospace; }
.ab-progress-bg { flex: 1; height: 4px; background: #2e2f35; border-radius: 2px; overflow: hidden; }
.ab-progress-fill { height: 100%; border-radius: 2px; transition: width 0.8s ease; }
.ab-repo-action { font-size: 11px; color: rgba(255,255,255,.35); flex-shrink: 0; width: 80px; text-align: right; }
.ab-log { padding: 10px 16px; border-top: 1px solid #2e2f35; max-height: 90px; overflow-y: auto; }
.ab-log-line { font-size: 11px; color: rgba(255,255,255,.4); font-family: monospace; margin: 2px 0; }
.ab-log-line.recent { color: rgba(255,255,255,.75); }

/* Tips accordion */
#tips-accordion { margin: 1.2rem 0; }
.tip-item {
  border: 1px solid #2e2f35; border-radius: 8px; margin-bottom: 8px; overflow: hidden;
}
.tip-header {
  padding: 12px 16px; cursor: pointer; display: flex; justify-content: space-between;
  align-items: center; background: #1e1f24; transition: background .2s; font-size: 14px;
}
.tip-header:hover { background: #252629; }
.tip-icon { color: #fbef8a; font-size: 16px; transition: transform .25s; }
.tip-item.open .tip-icon { transform: rotate(90deg); }
.tip-body {
  padding: 0 16px; max-height: 0; overflow: hidden; transition: max-height .3s ease, padding .3s;
  font-size: 14px; color: rgba(255,255,255,.7); line-height: 1.7;
}
.tip-item.open .tip-body { max-height: 300px; padding: 12px 16px; }
.tip-code {
  background: #141416; border-radius: 4px; padding: 2px 6px;
  font-family: monospace; font-size: 12px; color: #7bcdab;
}

@media (max-width: 600px) {
  .ab-grid { grid-template-columns: 1fr; }
}
</style>

<script>
(function () {
"use strict";

/* ══════════════════════════════════════════════════════
   1. CONCEPT DIAGRAM
   ══════════════════════════════════════════════════════ */
(function buildDiagram() {
  const el = document.getElementById("concept-diagram");
  if (!el) return;
  el.innerHTML = `
    <div style="color:#fbef8a;font-weight:700;font-size:13px;margin-bottom:16px;text-transform:uppercase;letter-spacing:.07em">
      How spawn works
    </div>
    <div class="cd-row">
      <div class="cd-repos">
        <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Your repos</div>
        <div class="cd-box"><div class="cb-title">backend</div><div class="cb-sub">~/repos/backend</div></div>
        <div style="margin:4px 0"></div>
        <div class="cd-box"><div class="cb-title">client-lib</div><div class="cb-sub">~/repos/client-lib</div></div>
        <div style="margin:4px 0"></div>
        <div class="cd-box"><div class="cb-title">infra</div><div class="cb-sub">~/repos/infra</div></div>
      </div>
      <div class="cd-arrow">→</div>
      <div style="flex:1;min-width:180px">
        <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">spawn feat/payments-v2</div>
        <div class="cd-clone-set" id="cdClones">
          <div class="cd-clone" data-i="0">📁 backend/ <span style="color:rgba(255,255,255,.4)">(feat/payments-v2)</span></div>
          <div class="cd-clone" data-i="1">📁 client-lib/ <span style="color:rgba(255,255,255,.4)">(feat/payments-v2)</span></div>
          <div class="cd-clone" data-i="2">📁 infra/ <span style="color:rgba(255,255,255,.4)">(feat/payments-v2)</span></div>
          <div class="cd-workspace" id="cdWs">🗂 agent.code-workspace → opens in Cursor</div>
        </div>
      </div>
      <div class="cd-arrow">→</div>
      <div class="cd-box" style="border-color:#a78bfa55;background:#1a1a3a;min-width:110px">
        <div class="cb-title" style="color:#a78bfa">Cursor</div>
        <div class="cb-sub">multi-root workspace<br/>all repos visible</div>
      </div>
    </div>
    <button id="cdReplay" style="margin-top:16px;background:transparent;border:1px solid #7bcdab66;color:#7bcdab;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer">▶ Replay animation</button>
  `;
  function animateDiagram() {
    const clones = el.querySelectorAll(".cd-clone");
    const ws = el.querySelector("#cdWs");
    clones.forEach(c => c.classList.remove("visible"));
    ws.classList.remove("visible");
    clones.forEach((c, i) => setTimeout(() => c.classList.add("visible"), 300 + i * 400));
    setTimeout(() => ws.classList.add("visible"), 300 + clones.length * 400 + 200);
  }
  el.querySelector("#cdReplay").addEventListener("click", animateDiagram);
  setTimeout(animateDiagram, 600);
})();

/* ══════════════════════════════════════════════════════
   2. CONFIG BUILDER
   ══════════════════════════════════════════════════════ */
(function buildConfigBuilder() {
  const el = document.getElementById("config-builder");
  if (!el) return;

  let wsRoot = "~/agent-workspaces";
  let primary = ["~/repos/backend", "~/repos/client-lib"];
  let secondary = ["~/repos/infra", "~/repos/docs"];

  function render() {
    el.innerHTML = `
      <div style="color:#fbef8a;font-weight:700;font-size:14px;margin-bottom:16px">🛠 Config builder</div>
      <div class="cb-section">
        <label class="cb-label">workspace_root — where all agent folders are created</label>
        <input class="cb-input" id="cbWsRoot" value="${wsRoot}" placeholder="~/agent-workspaces">
      </div>
      <div class="cb-section">
        <label class="cb-label">primary_repos — always cloned on spawn</label>
        <div id="cbPrimary">${primary.map((p,i) => repoRow("p", i, p)).join("")}</div>
        <button class="cb-add" id="cbAddPrimary">+ add primary repo</button>
      </div>
      <div class="cb-section">
        <label class="cb-label">secondary_repos — cloned only with <code style="color:#a78bfa">--all</code></label>
        <div id="cbSecondary">${secondary.map((p,i) => repoRow("s", i, p)).join("")}</div>
        <button class="cb-add" id="cbAddSecondary">+ add secondary repo</button>
      </div>
      <div class="cb-output" id="cbOut">${renderJSON()}<button class="cb-copy" id="cbCopy">Copy</button></div>
    `;
    el.querySelector("#cbWsRoot").addEventListener("input", e => { wsRoot = e.target.value; refreshOutput(); });
    el.querySelector("#cbAddPrimary").addEventListener("click", () => { primary.push(""); render(); });
    el.querySelector("#cbAddSecondary").addEventListener("click", () => { secondary.push(""); render(); });
    el.querySelectorAll(".cb-del").forEach(btn => {
      btn.addEventListener("click", () => {
        const [type, idx] = [btn.dataset.type, +btn.dataset.idx];
        if (type === "p") primary.splice(idx, 1);
        else secondary.splice(idx, 1);
        render();
      });
    });
    el.querySelectorAll(".cb-repo-input").forEach(inp => {
      inp.addEventListener("input", e => {
        const [type, idx] = [inp.dataset.type, +inp.dataset.idx];
        if (type === "p") primary[idx] = e.target.value;
        else secondary[idx] = e.target.value;
        refreshOutput();
      });
    });
    el.querySelector("#cbCopy").addEventListener("click", () => {
      navigator.clipboard.writeText(renderJSON()).then(() => {
        const btn = el.querySelector("#cbCopy");
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy", 1500);
      });
    });
  }

  function repoRow(type, idx, val) {
    return `<div class="repo-row">
      <input class="cb-input cb-repo-input" data-type="${type}" data-idx="${idx}" value="${val}" placeholder="/absolute/or/~/relative/path">
      <button class="cb-del" data-type="${type}" data-idx="${idx}">×</button>
    </div>`;
  }

  function renderJSON() {
    const obj = { workspace_root: wsRoot, primary_repos: primary.filter(Boolean), secondary_repos: secondary.filter(Boolean) };
    return JSON.stringify(obj, null, 2);
  }

  function refreshOutput() {
    const out = el.querySelector("#cbOut");
    if (out) out.childNodes[0].textContent = renderJSON();
  }

  render();
})();

/* ══════════════════════════════════════════════════════
   3. TERMINAL DEMO
   ══════════════════════════════════════════════════════ */
(function buildTerminal() {
  const el = document.getElementById("terminal-demo");
  if (!el) return;

  const SCRIPT = [
    { type:"prompt", text:"spawn feat/payments-v2" },
    { type:"out-green", text:"creating agent at: ~/agent-workspaces/feat-payments-v2__a3f9c21b", delay:300 },
    { type:"out-blue", text:"repos to clone: 2 (primary only; use --all to add secondary_repos)", delay:150 },
    { type:"out-blue", text:"cloning backend → ~/agent-workspaces/feat-payments-v2__a3f9c21b/backend", delay:400 },
    { type:"out-green", text:"ready: backend (branch: feat/payments-v2)", delay:800 },
    { type:"out-blue", text:"cloning client-lib → ~/agent-workspaces/feat-payments-v2__a3f9c21b/client-lib", delay:300 },
    { type:"out-green", text:"ready: client-lib (branch: feat/payments-v2)", delay:700 },
    { type:"out-yellow", text:"opening Cursor workspace…", delay:400 },
    { type:"out-green", text:"done. Agent folder: ~/agent-workspaces/feat-payments-v2__a3f9c21b", delay:200 },
    { type:"blank", text:"", delay:600 },
    { type:"prompt", text:"spawn --list" },
    { type:"out-yellow", text:"agent workspaces under ~/agent-workspaces", delay:300 },
    { type:"blank", text:"", delay:100 },
    { type:"out-plain", text:"feat-payments-v2__a3f9c21b", delay:100 },
    { type:"out-plain", text:"  backend     — feat/payments-v2", delay:50 },
    { type:"out-plain", text:"  client-lib  — feat/payments-v2", delay:50 },
    { type:"blank", text:"", delay:100 },
    { type:"out-plain", text:"feat-auth-refactor__d82b5e11", delay:50 },
    { type:"out-plain", text:"  backend     — feat/auth-refactor", delay:50 },
    { type:"out-plain", text:"  client-lib  — feat/auth-refactor", delay:50 },
    { type:"blank", text:"", delay:100 },
  ];

  el.innerHTML = `
    <div class="term-titlebar">
      <div class="term-dot term-dot-r"></div>
      <div class="term-dot term-dot-y"></div>
      <div class="term-dot term-dot-g"></div>
      <div class="term-title">bash — ~/gitlab.com/angi/anchor/spawn</div>
    </div>
    <div class="term-body" id="termBody"><span class="term-cursor"></span></div>
    <div class="term-controls">
      <button class="term-btn term-btn-run" id="termRun">▶ Run demo</button>
      <button class="term-btn term-btn-clear" id="termClear">✕ Clear</button>
    </div>
  `;

  let running = false;
  let timeouts = [];

  function clearTerminal() {
    timeouts.forEach(clearTimeout);
    timeouts = [];
    running = false;
    const body = document.getElementById("termBody");
    if (body) body.innerHTML = `<span class="term-cursor"></span>`;
  }

  function runDemo() {
    if (running) return;
    clearTerminal();
    running = true;
    const body = document.getElementById("termBody");
    if (!body) return;
    body.innerHTML = "";
    let offset = 300;
    SCRIPT.forEach(step => {
      offset += step.delay || 200;
      const t = setTimeout(() => {
        const line = document.createElement("div");
        line.className = "term-line";
        if (step.type === "prompt") {
          line.innerHTML = `<span class="term-prompt">~ $</span> <span class="term-cmd">${step.text}</span>`;
        } else if (step.type === "out-green") {
          line.innerHTML = `<span class="term-out-green">✔ ${step.text}</span>`;
        } else if (step.type === "out-blue") {
          line.innerHTML = `<span class="term-out-blue">  ${step.text}</span>`;
        } else if (step.type === "out-yellow") {
          line.innerHTML = `<span class="term-out-yellow">  ${step.text}</span>`;
        } else if (step.type === "out-plain") {
          line.innerHTML = `<span style="color:rgba(255,255,255,.65)">${step.text}</span>`;
        } else {
          line.innerHTML = "&nbsp;";
        }
        body.appendChild(line);
        requestAnimationFrame(() => line.classList.add("show"));
        body.scrollTop = body.scrollHeight;
      }, offset);
      timeouts.push(t);
    });
    const finalT = setTimeout(() => {
      const cur = document.createElement("span");
      cur.className = "term-cursor";
      body.appendChild(cur);
      running = false;
    }, offset + 400);
    timeouts.push(finalT);
  }

  el.querySelector("#termRun").addEventListener("click", runDemo);
  el.querySelector("#termClear").addEventListener("click", clearTerminal);
})();

/* ══════════════════════════════════════════════════════
   4. AGENT BOARD
   ══════════════════════════════════════════════════════ */
(function buildAgentBoard() {
  const el = document.getElementById("agent-board");
  if (!el) return;

  const AGENTS = [
    {
      id: "a1", name: "Agent α", branch: "feat/payments-v2",
      color: "#7bcdab",
      repos: [
        { name: "backend", progress: 0, action: "idle" },
        { name: "client-lib", progress: 0, action: "idle" },
      ],
      log: [],
      script: [
        { t:800,  repo:0, prog:15, action:"parsing…",    log:"Reading PaymentService.kt" },
        { t:1600, repo:0, prog:40, action:"editing…",    log:"Adding StripeAdapter interface" },
        { t:2200, repo:1, prog:20, action:"parsing…",    log:"Reading payments.ts" },
        { t:2800, repo:0, prog:70, action:"writing…",    log:"Impl PaymentGateway.kt done" },
        { t:3400, repo:1, prog:55, action:"editing…",    log:"Updating PaymentClient.ts" },
        { t:4000, repo:0, prog:100, action:"✓ done",     log:"backend: 3 files changed" },
        { t:4600, repo:1, prog:85, action:"writing…",    log:"Adding StripeProvider.ts" },
        { t:5200, repo:1, prog:100, action:"✓ done",     log:"client-lib: 2 files changed" },
      ]
    },
    {
      id: "a2", name: "Agent β", branch: "feat/auth-refactor",
      color: "#fbef8a",
      repos: [
        { name: "backend", progress: 0, action: "idle" },
        { name: "client-lib", progress: 0, action: "idle" },
        { name: "infra", progress: 0, action: "idle" },
      ],
      log: [],
      script: [
        { t:500,  repo:0, prog:10, action:"parsing…",    log:"Scanning auth middleware" },
        { t:1200, repo:2, prog:25, action:"parsing…",    log:"Reading k8s auth config" },
        { t:1800, repo:0, prog:35, action:"editing…",    log:"Replacing JWT with PASETO" },
        { t:2400, repo:2, prog:60, action:"editing…",    log:"Updating RBAC policies" },
        { t:3000, repo:0, prog:65, action:"writing…",    log:"auth/handler.go refactored" },
        { t:3600, repo:1, prog:30, action:"parsing…",    log:"Reading auth hooks" },
        { t:4200, repo:2, prog:100, action:"✓ done",     log:"infra: 1 file changed" },
        { t:4800, repo:0, prog:100, action:"✓ done",     log:"backend: 5 files changed" },
        { t:5400, repo:1, prog:75, action:"editing…",    log:"useAuth.ts updated" },
        { t:6000, repo:1, prog:100, action:"✓ done",     log:"client-lib: 3 files changed" },
      ]
    },
    {
      id: "a3", name: "Agent γ", branch: "fix/perf-regression",
      color: "#f08080",
      repos: [
        { name: "backend", progress: 0, action: "idle" },
      ],
      log: [],
      script: [
        { t:1000, repo:0, prog:20, action:"profiling…",  log:"Running flamegraph analysis" },
        { t:2000, repo:0, prog:50, action:"editing…",    log:"Removing N+1 in OrderRepo" },
        { t:3000, repo:0, prog:80, action:"writing…",    log:"Adding DB index migration" },
        { t:4000, repo:0, prog:100, action:"✓ done",     log:"backend: 2 files changed" },
      ]
    },
  ];

  let activeAgents = new Set(["a1", "a2", "a3"]);
  let agentTimers = {};
  let agentStates = {};

  function initState() {
    AGENTS.forEach(a => {
      agentStates[a.id] = {
        repos: a.repos.map(r => ({...r})),
        log: [],
        done: false,
      };
    });
  }

  function resetAgent(agentId) {
    const a = AGENTS.find(x => x.id === agentId);
    agentStates[agentId] = {
      repos: a.repos.map(r => ({...r, progress:0, action:"idle"})),
      log: [],
      done: false,
    };
  }

  function runAgent(agentId) {
    const a = AGENTS.find(x => x.id === agentId);
    if (!a || !activeAgents.has(agentId)) return;
    resetAgent(agentId);
    if (agentTimers[agentId]) agentTimers[agentId].forEach(clearTimeout);
    agentTimers[agentId] = [];
    a.script.forEach(step => {
      const t = setTimeout(() => {
        if (!activeAgents.has(agentId)) return;
        const st = agentStates[agentId];
        st.repos[step.repo].progress = step.prog;
        st.repos[step.repo].action = step.action;
        st.log.unshift(step.log);
        if (st.log.length > 5) st.log.pop();
        if (step.prog === 100 && st.repos.every(r => r.progress === 100)) st.done = true;
        renderBoard();
      }, step.t);
      agentTimers[agentId].push(t);
    });
  }

  function renderBoard() {
    const grid = el.querySelector(".ab-grid");
    if (!grid) return;
    AGENTS.filter(a => activeAgents.has(a.id)).forEach(a => {
      const card = grid.querySelector(`[data-agent="${a.id}"]`);
      if (!card) return;
      const st = agentStates[a.id];
      const allDone = st.repos.every(r => r.progress === 100);
      const anyWorking = st.repos.some(r => r.progress > 0 && r.progress < 100);
      const dot = card.querySelector(".ab-status-dot");
      dot.className = "ab-status-dot " + (allDone ? "ab-status-done" : anyWorking ? "ab-status-working" : "ab-status-idle");
      card.classList.toggle("active", anyWorking || allDone);
      st.repos.forEach((repo, i) => {
        const fill = card.querySelector(`.ab-progress-fill[data-ri="${i}"]`);
        const act = card.querySelector(`.ab-repo-action[data-ri="${i}"]`);
        if (fill) fill.style.width = repo.progress + "%";
        if (act) act.textContent = repo.action;
      });
      const logEl = card.querySelector(".ab-log");
      if (logEl) {
        logEl.innerHTML = st.log.map((l,i) =>
          `<div class="ab-log-line ${i===0?'recent':''}">${l}</div>`
        ).join("");
      }
    });
  }

  function buildBoard() {
    el.innerHTML = `
      <div class="ab-controls" id="abControls"></div>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button id="abRunAll" style="padding:7px 18px;background:#7bcdab;color:#19191c;border:none;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer">▶ Run all agents</button>
        <button id="abReset" style="padding:7px 18px;background:#2e2f35;color:rgba(255,255,255,.7);border:none;border-radius:6px;font-size:13px;cursor:pointer">↺ Reset</button>
      </div>
      <div class="ab-grid" id="abGrid"></div>
    `;
    const ctrl = el.querySelector("#abControls");
    AGENTS.forEach(a => {
      const btn = document.createElement("button");
      btn.className = "ab-toggle";
      btn.dataset.agent = a.id;
      btn.textContent = `${a.name} · ${a.branch}`;
      btn.style.borderColor = a.color;
      btn.style.color = activeAgents.has(a.id) ? a.color : "rgba(255,255,255,.3)";
      btn.style.background = activeAgents.has(a.id) ? a.color + "22" : "transparent";
      btn.addEventListener("click", () => {
        if (activeAgents.has(a.id)) activeAgents.delete(a.id);
        else activeAgents.add(a.id);
        btn.style.color = activeAgents.has(a.id) ? a.color : "rgba(255,255,255,.3)";
        btn.style.background = activeAgents.has(a.id) ? a.color + "22" : "transparent";
        buildGrid();
      });
      ctrl.appendChild(btn);
    });
    buildGrid();
    el.querySelector("#abRunAll").addEventListener("click", () => {
      activeAgents.forEach(id => runAgent(id));
    });
    el.querySelector("#abReset").addEventListener("click", () => {
      Object.values(agentTimers).forEach(ts => ts.forEach(clearTimeout));
      agentTimers = {};
      initState();
      buildGrid();
    });
  }

  function buildGrid() {
    const grid = el.querySelector("#abGrid");
    if (!grid) return;
    grid.innerHTML = "";
    AGENTS.filter(a => activeAgents.has(a.id)).forEach(a => {
      const st = agentStates[a.id];
      const card = document.createElement("div");
      card.className = "ab-card";
      card.dataset.agent = a.id;
      card.innerHTML = `
        <div class="ab-card-header">
          <div>
            <div class="ab-agent-name" style="color:${a.color}">${a.name}</div>
            <div class="ab-branch">${a.branch}</div>
          </div>
          <div class="ab-status-dot ab-status-idle"></div>
        </div>
        <div class="ab-repos">
          ${st.repos.map((r,i) => `
            <div class="ab-repo-row">
              <span class="ab-repo-name">${r.name}</span>
              <div class="ab-progress-bg"><div class="ab-progress-fill" data-ri="${i}" style="width:0%;background:${a.color}"></div></div>
              <span class="ab-repo-action" data-ri="${i}">idle</span>
            </div>
          `).join("")}
        </div>
        <div class="ab-log"></div>
      `;
      grid.appendChild(card);
    });
  }

  initState();
  buildBoard();
})();

/* ══════════════════════════════════════════════════════
   5. TIPS ACCORDION
   ══════════════════════════════════════════════════════ */
(function buildTips() {
  const el = document.getElementById("tips-accordion");
  if (!el) return;

  const TIPS = [
    {
      title: "🌿 Use a meaningful branch name — it becomes the workspace label",
      body: `The branch name is slugified and embedded in both the directory name and the Cursor window title. <span class="tip-code">spawn feat/my-feature</span> creates <span class="tip-code">feat-my-feature__&lt;id&gt;/</span> and the title bar shows <em>feat/my-feature</em>. When you have 4 Cursor windows open you'll thank yourself for descriptive names.`
    },
    {
      title: "🔗 Add secondary repos for context-only repos",
      body: `Put docs, knowledge-base, and infra repos in <span class="tip-code">secondary_repos</span>. They're only cloned with <span class="tip-code">spawn --all</span>, so your normal <span class="tip-code">spawn</span> stays lean. Pass <span class="tip-code">--all</span> only when the agent actually needs cross-cutting context.`
    },
    {
      title: "💾 Disk usage: near zero thanks to --local",
      body: `<span class="tip-code">git clone --local</span> creates hard-links for object files on the same filesystem. A workspace with three 200MB repos typically costs &lt;10MB of actual extra disk. You can safely spawn dozens of agents without worrying about storage.`
    },
    {
      title: "⚙️ Override workspace root without touching the config",
      body: `<span class="tip-code">SPAWN_WORKSPACE_ROOT=/tmp/agents spawn feat/throwaway</span> puts the workspace in <span class="tip-code">/tmp/agents</span> for a one-off experiment, without modifying your <span class="tip-code">~/.config/spawn/config.json</span>.`
    },
    {
      title: "🤖 Run multiple agents on different tasks simultaneously",
      body: `Each spawn is fully isolated. You can run <span class="tip-code">spawn feat/payments-v2</span> in one terminal and <span class="tip-code">spawn fix/auth-bug</span> in another. Two separate Cursor windows, two separate branch sets, zero interference. Merge whichever finishes first.`
    },
    {
      title: "🧹 Cleaning up: remove finished agents",
      body: `After merging, run <span class="tip-code">spawn --list</span> to see all workspaces, then <span class="tip-code">spawn --remove &lt;name&gt;</span> to delete the directory. Add <span class="tip-code">SPAWN_FORCE=1</span> in front to skip the confirmation prompt — useful in post-merge hooks.`
    },
    {
      title: "🔄 Re-open a workspace later",
      body: `If you close Cursor but haven't deleted the agent, use <span class="tip-code">spawn --open &lt;name&gt;</span> to reopen it. The name is the directory name shown by <span class="tip-code">spawn --list</span>. Tab completion makes this instant once you have a few agents going.`
    },
  ];

  el.innerHTML = TIPS.map((t, i) => `
    <div class="tip-item" data-idx="${i}">
      <div class="tip-header">
        <span>${t.title}</span>
        <span class="tip-icon">›</span>
      </div>
      <div class="tip-body">${t.body}</div>
    </div>
  `).join("");

  el.querySelectorAll(".tip-header").forEach(h => {
    h.addEventListener("click", () => {
      const item = h.closest(".tip-item");
      item.classList.toggle("open");
    });
  });
})();

})();
</script>
