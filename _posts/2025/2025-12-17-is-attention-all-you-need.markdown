---
layout: post
title: "Is Attention All You Need?"
author: Jefersson Nathan
date: Wed Dec 17 07:21:54 CEST 2025
categories: [ "post" ]
description: "From a single LLM call to a fully autonomous ReAct agent — an iterative guide to building agents in C++."
---

{: class="marginalia" }
Named after the landmark<br/>2017 paper *"Attention Is<br/>All You Need"* by Vaswani<br/>et al. — the paper that<br/>introduced Transformers<br/>and changed everything.

In 2017, eight Google researchers published a paper that changed everything.
*"Attention Is All You Need"* gave us the Transformer — the architecture behind every
LLM you have talked to this year. For the neural network itself, attention really is enough.

For **you**, the developer building *with* these models? That is a very different question.

A raw LLM is a text-in, text-out function. No memory, no tools, no way to act on the world.
To build something useful — something that can search, compute, read files, and loop until it
finds an answer — you need scaffolding. That scaffolding is what we call an **agent**.

This post walks through exactly that construction, from a single HTTP call to a proper
autonomous loop, using [Ollama](https://ollama.com/){: class="external no-highlight"} and
C++ (the king of all languages). Same patterns apply in any language.

---

<style>
/* ─── Stage Navigator ──────────────────────────────────────────── */
.stage-nav {
  display: flex; gap: 0; margin: 2rem 0 0;
  border-bottom: 2px solid #2e2f35; flex-wrap: wrap;
}
.stage-btn {
  padding: 10px 18px; background: transparent; border: none;
  border-bottom: 3px solid transparent; margin-bottom: -2px;
  color: rgba(255,255,255,.45); cursor: pointer; font-size: 13px;
  font-family: inherit; transition: all .2s; white-space: nowrap;
}
.stage-btn:hover { color: rgba(255,255,255,.85); }
.stage-btn.active { color: #fbef8a; border-bottom-color: #fbef8a; }
.stage-panel { display: none; padding: 1.6rem 0; }
.stage-panel.active { display: block; }
.stage-title {
  font-size: 1.15rem; color: #fbef8a; margin: 0 0 .6rem;
  display: flex; align-items: center; gap: .5rem;
}
.stage-complexity { display: inline-flex; gap: 3px; margin-left: .4rem; }
.stage-complexity span {
  width: 8px; height: 8px; border-radius: 50%; background: #2e2f35; display: inline-block;
}
.stage-complexity span.lit { background: #7bcdab; }
.stage-desc { color: rgba(255,255,255,.78); line-height: 1.75; margin-bottom: 1.2rem; }

/* ─── Code blocks ──────────────────────────────────────────────── */
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
.code-wrap pre {
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

/* ─── Pro / con boxes ──────────────────────────────────────────── */
.pro-con { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
@media (max-width: 600px) { .pro-con { grid-template-columns: 1fr; } }
.pro-con-box { background: #1e1f24; border-radius: 8px; padding: 1rem; }
.pro-con-box ul {
  margin: 0; padding-left: 1.2rem; font-size: .82rem;
  color: rgba(255,255,255,.72); line-height: 1.9;
}
.box-label { font-size: .72rem; text-transform: uppercase; letter-spacing: .07em; margin-bottom: .5rem; font-weight: 700; }
.box-green { color: #7bcdab; }
.box-red   { color: #f08080; }

/* ─── Callouts ─────────────────────────────────────────────────── */
.callout { border-radius: 8px; padding: 1rem 1.2rem; margin: 1rem 0; font-size: .84rem; line-height: 1.7; }
.callout-green  { background: #1a2e22; border-left: 3px solid #7bcdab; color: rgba(255,255,255,.82); }
.callout-yellow { background: #25240e; border-left: 3px solid #fbef8a; color: rgba(255,255,255,.82); }
.callout-red    { background: #2a1616; border-left: 3px solid #f08080; color: rgba(255,255,255,.82); }
.callout strong { color: #fff; }

/* ─── Concept diagram ──────────────────────────────────────────── */
.concept-grid {
  display: grid; grid-template-columns: 1fr 2px 1fr; gap: 1.5rem;
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 12px; padding: 1.8rem 1.4rem; margin: 1.5rem 0; align-items: start;
}
@media (max-width: 550px) { .concept-grid { grid-template-columns: 1fr; } .concept-divider { display: none; } }
.concept-divider { background: #2e2f35; }
.concept-col-title { font-size: .72rem; color: rgba(255,255,255,.38); text-transform: uppercase; letter-spacing: .07em; margin-bottom: .8rem; }
.flow-col { display: flex; flex-direction: column; align-items: center; gap: .5rem; }
.flow-node {
  background: #252629; border: 2px solid #3a3b40; border-radius: 8px;
  padding: 9px 18px; font-size: 13px; color: rgba(255,255,255,.85);
  min-width: 120px; text-align: center; transition: all .35s;
}
.flow-node.fuser  { border-color: #fbef8a; background: #24230e; }
.flow-node.fagent { border-color: #7bcdab; background: #152319; }
.flow-arrow { color: rgba(255,255,255,.3); font-size: 18px; }

/* ─── Label Playground ─────────────────────────────────────────── */
.playground {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;
}
.pg-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 680px) { .pg-cols { grid-template-columns: 1fr; } }
.pg-label { font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.38); margin-bottom: .4rem; }
.pg-textarea {
  width: 100%; height: 170px; background: #111214; border: 1px solid #2e2f35;
  border-radius: 6px; color: rgba(255,255,255,.85);
  font-family: "JetBrains Mono", monospace; font-size: 12px;
  padding: 10px; resize: vertical; box-sizing: border-box; line-height: 1.65;
}
.pg-textarea:focus { outline: none; border-color: #7bcdab; }
.pg-output {
  background: #111214; border: 1px solid #2e2f35; border-radius: 6px;
  padding: 10px; min-height: 170px; font-size: 12px; line-height: 1.7; overflow-y: auto;
}
.label-tag {
  display: inline-block; background: rgba(240,180,41,.13);
  border: 1px solid rgba(240,180,41,.38); border-radius: 4px;
  color: #f0b429; font-weight: 700; padding: 1px 6px; font-size: 11px; margin: 0 1px;
}
.label-result {
  background: #1c1d22; border-left: 3px solid #7bcdab;
  border-radius: 0 6px 6px 0; padding: 8px 12px; margin: 5px 0;
}
.lr-name { color: #f0b429; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
.lr-args { color: rgba(255,255,255,.65); font-size: 12px; margin: 2px 0; }
.lr-exec { color: #7bcdab; font-size: 11px; font-style: italic; }

/* ─── Loop Visualizer ──────────────────────────────────────────── */
.loop-vis {
  background: #1a1b1f; border: 1px solid #2e2f35;
  border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;
}
.vis-controls { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; margin-bottom: 1.2rem; }
.vis-input {
  flex: 1; min-width: 200px; background: #111214; border: 1px solid #2e2f35;
  border-radius: 6px; color: rgba(255,255,255,.85); font-family: inherit;
  font-size: 13px; padding: 8px 12px;
}
.vis-input:focus { outline: none; border-color: #7bcdab; }
.run-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px;
  background: #152319; border: 1px solid #7bcdab; border-radius: 6px;
  color: #7bcdab; cursor: pointer; font-family: inherit; font-size: 13px;
  transition: all .2s; white-space: nowrap;
}
.run-btn:hover:not(:disabled) { background: #7bcdab; color: #19191c; }
.run-btn:disabled { opacity: .45; cursor: default; }
.run-btn.ghost { background: transparent; border-color: #3a3b40; color: rgba(255,255,255,.45); }
.run-btn.ghost:hover:not(:disabled) { background: transparent; border-color: #7bcdab; color: #7bcdab; }
.loop-steps { display: flex; flex-direction: column; gap: 0; position: relative; }
.loop-steps::before {
  content: ''; position: absolute; left: 20px; top: 0; bottom: 0;
  width: 2px; background: #2e2f35; z-index: 0;
}
.loop-step { display: flex; align-items: flex-start; gap: 1rem; padding: .65rem 0; position: relative; }
.ls-icon {
  width: 42px; height: 42px; border-radius: 50%; background: #252629;
  border: 2px solid #3a3b40; display: flex; align-items: center;
  justify-content: center; font-size: 17px; flex-shrink: 0; z-index: 1; transition: all .4s;
}
.loop-step.active .ls-icon { border-color: #7bcdab; background: #152319; box-shadow: 0 0 16px rgba(123,205,171,.35); }
.loop-step.done .ls-icon   { border-color: #333; opacity: .5; }
.ls-body { flex: 1; padding-top: 8px; }
.ls-title { font-size: .85rem; font-weight: 700; color: rgba(255,255,255,.9); margin-bottom: 2px; }
.ls-detail {
  font-size: .78rem; color: #7bcdab; font-family: "JetBrains Mono", monospace;
  background: #111214; padding: 4px 8px; border-radius: 4px; margin-top: 4px;
  display: none; white-space: pre-wrap; word-break: break-word;
}
.loop-step.active .ls-detail { display: block; }

/* ─── Comparison table ─────────────────────────────────────────── */
.cmp-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 1.5rem 0; }
.cmp-table th {
  padding: 10px 14px; background: #1e1f24; color: #fbef8a;
  font-size: 11px; text-transform: uppercase; letter-spacing: .07em; text-align: left;
}
.cmp-table td { padding: 10px 14px; border-top: 1px solid #2e2f35; color: rgba(255,255,255,.8); }
.cmp-table tr:hover td { background: #1e1f24; }
.ck { color: #7bcdab; } .cx { color: #f08080; } .cp { color: #fbef8a; }
</style>

## Setting Up

{: class="marginalia" }
**Local vs Cloud:** local<br/>models are free, private,<br/>and offline. Cloud models<br/>(Claude, GPT) are smarter<br/>but cost money and send<br/>your data to a server.<br/>For learning, go local.

First, install [Ollama](https://ollama.com/){: class="external no-highlight"} and pull a model:

```bash
brew install ollama
ollama pull deepseek-r1:8b
# starts REST API on localhost:11434
```

For C++ we need two libraries: `cpr` for HTTP and `nlohmann/json` for JSON.
Both are easily fetched via CMake's FetchContent or vcpkg:

```bash
# CMakeLists.txt excerpt
find_package(cpr REQUIRED)
find_package(nlohmann_json REQUIRED)
target_link_libraries(agent PRIVATE cpr::cpr nlohmann_json::nlohmann_json)
```

---

## What Is an Agent?

At its core, an agent is: **a loop where an LLM decides what to do next.**

<div class="concept-grid">
  <div>
    <div class="concept-col-title">Simple call — no agent</div>
    <div class="flow-col">
      <div class="flow-node fuser">&#128100; User prompt</div>
      <div class="flow-arrow">&#8595;</div>
      <div class="flow-node">&#129302; LLM</div>
      <div class="flow-arrow">&#8595;</div>
      <div class="flow-node fuser">&#128172; Response</div>
    </div>
  </div>
  <div class="concept-divider"></div>
  <div>
    <div class="concept-col-title">Agent loop</div>
    <div class="flow-col">
      <div class="flow-node fuser">&#128100; User prompt</div>
      <div class="flow-arrow">&#8595;</div>
      <div class="flow-node fagent">&#129302; LLM thinks</div>
      <div class="flow-arrow">&#8595;</div>
      <div class="flow-node fagent">&#128269; Parse output</div>
      <div class="flow-arrow">&#8595;</div>
      <div class="flow-node fagent">&#128295; Run tool</div>
      <div class="flow-arrow" style="color:#7bcdab;">&#8635; loop until done</div>
      <div class="flow-node fuser">&#9989; Final answer</div>
    </div>
  </div>
</div>

The model decides **what** to do. Your code **executes** it and feeds the result back.
Simple contract. Profound consequences.

---

## The Five Stages

Click any stage to explore the code:

<div class="stage-nav" id="stage-nav">
  <button class="stage-btn active" onclick="switchStage(0)">&#9312; Raw Call</button>
  <button class="stage-btn" onclick="switchStage(1)">&#9313; The Loop</button>
  <button class="stage-btn" onclick="switchStage(2)">&#9314; Labels</button>
  <button class="stage-btn" onclick="switchStage(3)">&#9315; Functions</button>
  <button class="stage-btn" onclick="switchStage(4)">&#9316; ReAct</button>
</div>

<!-- ─────────────── STAGE 0 ─────────────── -->
<div class="stage-panel active" id="stage-0">
  <div class="stage-title">
    The Single Call
    <span class="stage-complexity">
      <span class="lit"></span><span></span><span></span><span></span><span></span>
    </span>
  </div>
  <p class="stage-desc">
    Send a prompt, get a response, done. No loop, no memory, no tools.
    One prompt &#8594; one reply. Perfect for self-contained, one-shot tasks where
    the model needs no external data to answer correctly.
  </p>

  <div class="code-wrap">
    <div class="code-lang">C++ &mdash; single Ollama call <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
    <pre><span class="pp">#include</span> <span class="st">&lt;cpr/cpr.h&gt;</span>
<span class="pp">#include</span> <span class="st">&lt;nlohmann/json.hpp&gt;</span>
<span class="pp">#include</span> <span class="st">&lt;iostream&gt;</span>
<span class="kw">using</span> json = nlohmann::json;

<span class="ty">std::string</span> <span class="fn">ask</span>(<span class="kw">const</span> <span class="ty">std::string</span>&amp; prompt) {
    json body;
    body[<span class="st">"model"</span>]  = <span class="st">"deepseek-r1:8b"</span>;
    body[<span class="st">"prompt"</span>] = prompt;
    body[<span class="st">"stream"</span>] = <span class="kw">false</span>;

    <span class="kw">auto</span> r = cpr::Post(
        cpr::Url{<span class="st">"http://localhost:11434/api/generate"</span>},
        cpr::Header{ {<span class="st">"Content-Type"</span>, <span class="st">"application/json"</span>} },
        cpr::Body{body.dump()}
    );
    <span class="kw">return</span> json::parse(r.text)[<span class="st">"response"</span>];
}

<span class="ty">int</span> <span class="fn">main</span>() {
    std::cout &lt;&lt; <span class="fn">ask</span>(<span class="st">"What does inakamono mean?"</span>) &lt;&lt; <span class="st">"\n"</span>;
    <span class="kw">return</span> <span class="nu">0</span>;
}</pre>
  </div>

  <div class="pro-con">
    <div class="pro-con-box">
      <div class="box-label box-green">&#10003; Good for</div>
      <ul>
        <li>Summarization</li>
        <li>One-shot code generation</li>
        <li>Translation and reformatting</li>
        <li>Single factual questions</li>
      </ul>
    </div>
    <div class="pro-con-box">
      <div class="box-label box-red">&#10007; Cannot do</div>
      <ul>
        <li>Remember earlier messages</li>
        <li>Look up real-time information</li>
        <li>Take multi-step actions</li>
        <li>Recover from wrong guesses</li>
      </ul>
    </div>
  </div>
</div>

<!-- ─────────────── STAGE 1 ─────────────── -->
<div class="stage-panel" id="stage-1">
  <div class="stage-title">
    The Conversation Loop
    <span class="stage-complexity">
      <span class="lit"></span><span class="lit"></span><span></span><span></span><span></span>
    </span>
  </div>
  <p class="stage-desc">
    Add a <code>while</code> loop and a message array. Each turn you append the user message,
    call the model, and append its reply. The model appears to "remember" earlier turns —
    but really you are just sending its own past responses back to it on every request.
    This is how every ChatGPT-style interface works.
  </p>

  <div class="code-wrap">
    <div class="code-lang">C++ &mdash; chat loop with history <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
    <pre><span class="ty">int</span> <span class="fn">main</span>() {
    json messages = json::array();   <span class="cm">// growing conversation history</span>

    <span class="kw">while</span> (<span class="kw">true</span>) {
        std::cout &lt;&lt; <span class="st">"You: "</span>;
        <span class="ty">std::string</span> input;
        std::getline(std::cin, input);
        <span class="kw">if</span> (input == <span class="st">"/quit"</span>) <span class="kw">break</span>;

        <span class="cm">// 1. append user message</span>
        json user_msg;
        user_msg[<span class="st">"role"</span>]    = <span class="st">"user"</span>;
        user_msg[<span class="st">"content"</span>] = input;
        messages.push_back(user_msg);

        <span class="cm">// 2. call /api/chat (not /api/generate)</span>
        json body;
        body[<span class="st">"model"</span>]    = <span class="st">"deepseek-r1:8b"</span>;
        body[<span class="st">"messages"</span>] = messages;
        body[<span class="st">"stream"</span>]   = <span class="kw">false</span>;

        <span class="kw">auto</span> r = cpr::Post(
            cpr::Url{<span class="st">"http://localhost:11434/api/chat"</span>},
            cpr::Header{ {<span class="st">"Content-Type"</span>, <span class="st">"application/json"</span>} },
            cpr::Body{body.dump()}
        );

        <span class="ty">std::string</span> reply =
            json::parse(r.text)[<span class="st">"message"</span>][<span class="st">"content"</span>];

        <span class="cm">// 3. append assistant reply, loop</span>
        json asst;
        asst[<span class="st">"role"</span>]    = <span class="st">"assistant"</span>;
        asst[<span class="st">"content"</span>] = reply;
        messages.push_back(asst);

        std::cout &lt;&lt; <span class="st">"Bot: "</span> &lt;&lt; reply &lt;&lt; <span class="st">"\n"</span>;
    }
    <span class="kw">return</span> <span class="nu">0</span>;
}</pre>
  </div>

  <div class="callout callout-yellow">
    <strong>Token cost trap:</strong> Every request sends the <em>entire</em> history.
    A 20-turn conversation costs 20&times; the tokens of the last message alone.
    For long sessions consider a sliding window or a periodic summarisation step.
  </div>
</div>

<!-- ─────────────── STAGE 2 ─────────────── -->
<div class="stage-panel" id="stage-2">
  <div class="stage-title">
    Labels as Primitive Tools
    <span class="stage-complexity">
      <span class="lit"></span><span class="lit"></span><span class="lit"></span><span></span><span></span>
    </span>
  </div>
  <p class="stage-desc">
    Before OpenAI shipped function calling, this was the trick everyone used.
    You teach the model — in its system prompt — to output special <strong>labelled tags</strong>
    when it wants to do something: <code>[SEARCH: rust lifetimes]</code>,
    <code>[CALC: 42 * 1.5]</code>.
    Your code scans every response for these labels, executes the matching action,
    and injects the result back as a new message. The loop continues until the model
    outputs <code>[FINAL: ...]</code>.
  </p>
  <p class="stage-desc">
    It is fragile if the model drifts from the format, but it works on <em>any</em> model
    — even ones with no native tool-calling support.
  </p>

  <div class="code-wrap">
    <div class="code-lang">System prompt &mdash; define the label vocabulary <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
    <pre>You are a helpful assistant with access to tools.

To use a tool, output its label on its own line:

  [SEARCH: &lt;query&gt;]        -- search the web for information
  [CALC: &lt;expression&gt;]     -- evaluate a math expression
  [FILE: &lt;path&gt;]           -- read a file from disk
  [RUN: &lt;shell command&gt;]   -- execute a shell command

After each tool call you will receive its output as:
  [RESULT: &lt;output&gt;]

When you have a complete answer, output:
  [FINAL: &lt;your answer here&gt;]

Never guess. Use tools for anything uncertain.</pre>
  </div>

  <div class="code-wrap">
    <div class="code-lang">C++ &mdash; agent loop with label parsing <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
    <pre><span class="pp">#include</span> <span class="st">&lt;regex&gt;</span>
<span class="pp">#include</span> <span class="st">&lt;functional&gt;</span>
<span class="pp">#include</span> <span class="st">&lt;unordered_map&gt;</span>

<span class="kw">using</span> ToolFn = std::function&lt;<span class="ty">std::string</span>(<span class="kw">const</span> <span class="ty">std::string</span>&amp;)&gt;;

<span class="ty">int</span> <span class="fn">main</span>() {
    <span class="cm">// 1. register tools</span>
    std::unordered_map&lt;<span class="ty">std::string</span>, ToolFn&gt; tools;
    tools[<span class="st">"SEARCH"</span>] = [](const <span class="ty">std::string</span>&amp; q)    { <span class="kw">return</span> web_search(q);   };
    tools[<span class="st">"CALC"</span>]   = [](const <span class="ty">std::string</span>&amp; expr) { <span class="kw">return</span> evaluate(expr);  };
    tools[<span class="st">"FILE"</span>]   = [](const <span class="ty">std::string</span>&amp; path) { <span class="kw">return</span> read_file(path); };
    tools[<span class="st">"RUN"</span>]    = [](const <span class="ty">std::string</span>&amp; cmd)  { <span class="kw">return</span> shell_exec(cmd); };

    <span class="cm">// 2. label regex: matches [NAME: args]</span>
    std::regex label_re(<span class="st">R"(\[([A-Z_]+):\s*([^\]]+)\])"</span>);

    json messages = build_system_messages();
    messages.push_back(user_message(initial_question));

    <span class="kw">for</span> (<span class="ty">int</span> step = <span class="nu">0</span>; step &lt; <span class="nu">15</span>; ++step) {
        <span class="ty">std::string</span> reply = chat(messages);
        messages.push_back(assistant_msg(reply));

        <span class="cm">// 3. scan response for labels</span>
        std::sregex_iterator it(reply.begin(), reply.end(), label_re);
        std::sregex_iterator end_it;

        <span class="kw">if</span> (it == end_it) {
            std::cout &lt;&lt; reply &lt;&lt; <span class="st">"\n"</span>;
            <span class="kw">break</span>;
        }

        <span class="ty">std::string</span> results;
        <span class="kw">for</span> (; it != end_it; ++it) {
            <span class="ty">std::string</span> name = (*it)[<span class="nu">1</span>];
            <span class="ty">std::string</span> args = (*it)[<span class="nu">2</span>];

            <span class="kw">if</span> (name == <span class="st">"FINAL"</span>) {
                std::cout &lt;&lt; <span class="st">"Answer: "</span> &lt;&lt; args &lt;&lt; <span class="st">"\n"</span>;
                <span class="kw">return</span> <span class="nu">0</span>;
            }
            <span class="cm">// 4. execute tool and collect result</span>
            <span class="kw">auto</span> fn = tools.find(name);
            <span class="kw">if</span> (fn != tools.end())
                results += <span class="st">"[RESULT: "</span> + fn-&gt;second(args) + <span class="st">"]\n"</span>;
        }
        <span class="cm">// 5. inject results, loop again</span>
        messages.push_back(tool_results_msg(results));
    }
}</pre>
  </div>

  <div class="callout callout-green">
    <strong>Why it works:</strong> Models are trained on enormous amounts of structured text.
    Once you show them the label pattern in the system prompt, they reliably output labels
    in the correct format. You are exploiting instruction-following, not any special API feature.
  </div>
</div>

<!-- ─────────────── STAGE 3 ─────────────── -->
<div class="stage-panel" id="stage-3">
  <div class="stage-title">
    Structured Function Calling
    <span class="stage-complexity">
      <span class="lit"></span><span class="lit"></span><span class="lit"></span><span class="lit"></span><span></span>
    </span>
  </div>
  <p class="stage-desc">
    Modern LLM APIs (OpenAI, Anthropic, Ollama with capable models) support
    <strong>native tool use</strong>.
    Instead of parsing free-form text, you declare your tools as JSON schemas.
    The model returns a typed <code>tool_call</code> object — no regex,
    no parsing fragility. The model was fine-tuned on this format, so reliability
    is dramatically better than the label approach.
  </p>

  <div class="code-wrap">
    <div class="code-lang">JSON &mdash; tool schema <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
    <pre>{
  <span class="st">"type"</span>: <span class="st">"function"</span>,
  <span class="st">"function"</span>: {
    <span class="st">"name"</span>: <span class="st">"search"</span>,
    <span class="st">"description"</span>: <span class="st">"Search the web for up-to-date information"</span>,
    <span class="st">"parameters"</span>: {
      <span class="st">"type"</span>: <span class="st">"object"</span>,
      <span class="st">"properties"</span>: {
        <span class="st">"query"</span>: {
          <span class="st">"type"</span>: <span class="st">"string"</span>,
          <span class="st">"description"</span>: <span class="st">"The search query"</span>
        }
      },
      <span class="st">"required"</span>: [<span class="st">"query"</span>]
    }
  }
}</pre>
  </div>

  <div class="code-wrap">
    <div class="code-lang">C++ &mdash; dispatching a tool_call response <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
    <pre><span class="cm">// When finish_reason == "tool_calls" the response looks like:</span>
<span class="cm">// { "message": { "tool_calls": [</span>
<span class="cm">//   { "id": "call_xyz",</span>
<span class="cm">//     "function": { "name": "search",</span>
<span class="cm">//                   "arguments": "{\"query\":\"C++ cpr library\"}" }}]}}</span>

<span class="ty">int</span> <span class="fn">main</span>() {
    json messages = build_system();
    messages.push_back(user_message(question));

    <span class="kw">while</span> (<span class="kw">true</span>) {
        json resp = chat_with_tools(messages, tools_schema);
        messages.push_back(resp[<span class="st">"message"</span>]);

        <span class="kw">if</span> (resp[<span class="st">"finish_reason"</span>] == <span class="st">"stop"</span>) {
            std::cout &lt;&lt; resp[<span class="st">"message"</span>][<span class="st">"content"</span>];
            <span class="kw">break</span>;
        }

        <span class="kw">for</span> (<span class="kw">auto</span>&amp; tc : resp[<span class="st">"message"</span>][<span class="st">"tool_calls"</span>]) {
            <span class="ty">std::string</span> fn   = tc[<span class="st">"function"</span>][<span class="st">"name"</span>];
            json         args = json::parse(
                tc[<span class="st">"function"</span>][<span class="st">"arguments"</span>].get&lt;<span class="ty">std::string</span>&gt;()
            );

            <span class="ty">std::string</span> result = dispatch(fn, args);

            <span class="cm">// inject result with role "tool"</span>
            json tool_msg;
            tool_msg[<span class="st">"role"</span>]         = <span class="st">"tool"</span>;
            tool_msg[<span class="st">"tool_call_id"</span>] = tc[<span class="st">"id"</span>];
            tool_msg[<span class="st">"content"</span>]      = result;
            messages.push_back(tool_msg);
        }
    }
}</pre>
  </div>
</div>

<!-- ─────────────── STAGE 4 ─────────────── -->
<div class="stage-panel" id="stage-4">
  <div class="stage-title">
    The Full ReAct Loop
    <span class="stage-complexity">
      <span class="lit"></span><span class="lit"></span><span class="lit"></span><span class="lit"></span><span class="lit"></span>
    </span>
  </div>
  <p class="stage-desc">
    <strong>ReAct</strong> (Reasoning + Acting, Yao et al. 2022) is the canonical pattern
    for autonomous agents. The model writes an explicit <em>Thought</em> before every
    <em>Action</em>. You inject an <em>Observation</em>. It loops until
    <em>Final Answer</em>.
    Making reasoning visible reduces errors — the model catches its own mistakes in
    the Thought step before acting.
  </p>

  <div class="code-wrap">
    <div class="code-lang">System prompt &mdash; ReAct format <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
    <pre>Answer the question using this format. Repeat as needed:

Thought: &lt;what you are currently thinking&gt;
Action: &lt;tool name&gt;
Action Input: &lt;input to the tool&gt;
Observation: &lt;you will receive the tool result here&gt;

When you have enough information:
Thought: I now know the final answer.
Final Answer: &lt;the complete answer&gt;</pre>
  </div>

  <div class="code-wrap">
    <div class="code-lang">C++ &mdash; ReAct parsing and loop <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
    <pre><span class="kw">struct</span> <span class="ty">ReActStep</span> {
    <span class="ty">std::string</span> thought;
    <span class="ty">std::string</span> action;
    <span class="ty">std::string</span> action_input;
    <span class="ty">std::string</span> final_answer;
    <span class="ty">bool</span>        is_final = <span class="kw">false</span>;
};

<span class="ty">ReActStep</span> <span class="fn">parse_react</span>(<span class="kw">const</span> <span class="ty">std::string</span>&amp; text) {
    <span class="ty">ReActStep</span> s;
    std::smatch m;
    <span class="kw">if</span> (std::regex_search(text, m, std::regex(<span class="st">R"(Thought:\s*(.+?)(?:\n|$))"</span>)))
        s.thought = m[<span class="nu">1</span>];
    <span class="kw">if</span> (std::regex_search(text, m, std::regex(<span class="st">R"(Action:\s*(.+?)(?:\n|$))"</span>)))
        s.action = m[<span class="nu">1</span>];
    <span class="kw">if</span> (std::regex_search(text, m, std::regex(<span class="st">R"(Action Input:\s*(.+?)(?:\n|$))"</span>)))
        s.action_input = m[<span class="nu">1</span>];
    <span class="kw">if</span> (std::regex_search(text, m, std::regex(<span class="st">R"(Final Answer:\s*(.+))"</span>))) {
        s.final_answer = m[<span class="nu">1</span>];
        s.is_final = <span class="kw">true</span>;
    }
    <span class="kw">return</span> s;
}

<span class="ty">int</span> <span class="fn">main</span>() {
    json messages = build_react_system();
    messages.push_back(user_message(question));

    <span class="kw">for</span> (<span class="ty">int</span> step = <span class="nu">0</span>; step &lt; <span class="nu">10</span>; ++step) {   <span class="cm">// always cap the loop!</span>
        <span class="ty">std::string</span> reply = chat(messages);
        messages.push_back(assistant_msg(reply));

        <span class="ty">ReActStep</span> s = parse_react(reply);
        std::cerr &lt;&lt; <span class="st">"[thought] "</span> &lt;&lt; s.thought &lt;&lt; <span class="st">"\n"</span>;

        <span class="kw">if</span> (s.is_final) {
            std::cout &lt;&lt; <span class="st">"Answer: "</span> &lt;&lt; s.final_answer &lt;&lt; <span class="st">"\n"</span>;
            <span class="kw">return</span> <span class="nu">0</span>;
        }

        <span class="ty">std::string</span> obs = run_tool(s.action, s.action_input);
        messages.push_back(observation_msg(obs));
    }
    std::cerr &lt;&lt; <span class="st">"[warn] max steps reached\n"</span>;
}</pre>
  </div>

  <div class="callout callout-red">
    <strong>Always cap the loop.</strong> Without a step limit a confused model can loop
    indefinitely. At $15&nbsp;/&nbsp;MTok for premium models that is an expensive mistake.
    Ten iterations is a reasonable default; raise it only for known deep-research tasks.
  </div>
</div>

---

## Label Playground

{: class="marginalia" }
This is Stage 3 in action.<br/>Edit the fake LLM output<br/>and watch the parser<br/>extract labels in real time<br/>— exactly what your C++<br/>loop would do.

<div class="playground">
  <div class="pg-cols">
    <div>
      <div class="pg-label">LLM output (editable)</div>
      <textarea class="pg-textarea" id="pg-input" oninput="parseLabelInput()">Let me look into this for you.

[SEARCH: deepseek r1 architecture 2025]

I also need to verify the token price.

[CALC: 0.14 * 1000000 / 1000000]

Based on what I found, here is my answer.

[FINAL: DeepSeek R1 uses MoE with 671B total parameters, 37B active per token. Cost: ~$0.14 per million input tokens.]</textarea>
    </div>
    <div>
      <div class="pg-label">Parsed labels &rarr; tool dispatch</div>
      <div class="pg-output" id="pg-output"></div>
    </div>
  </div>
  <div style="margin-top:.8rem;font-size:.75rem;color:rgba(255,255,255,.32);">
    Recognised:
    <code>[SEARCH: ...]</code>
    <code>[CALC: ...]</code>
    <code>[FILE: ...]</code>
    <code>[RUN: ...]</code>
    <code>[FINAL: ...]</code>
  </div>
</div>

---

## Watch the ReAct Loop Animate

{: class="marginalia" }
Notice the LLM is called<br/>**twice** for this question.<br/>Once to decide the tool,<br/>once to synthesise the<br/>result. Each call costs<br/>tokens — that is the<br/>trade-off for reasoning.

<div class="loop-vis">
  <div class="vis-controls">
    <input class="vis-input" id="vis-q" value="What is the file size of /etc/hosts?"/>
    <button class="run-btn" id="vis-run" onclick="runLoopVis()">&#9654; Run agent</button>
    <button class="run-btn ghost" onclick="resetLoopVis()">&#8635; Reset</button>
  </div>

  <div class="loop-steps" id="loop-steps">
    <div class="loop-step" id="ls-0">
      <div class="ls-icon">&#128100;</div>
      <div class="ls-body">
        <div class="ls-title">User question received</div>
        <div class="ls-detail" id="ls-0-d"></div>
      </div>
    </div>
    <div class="loop-step" id="ls-1">
      <div class="ls-icon">&#129302;</div>
      <div class="ls-body">
        <div class="ls-title">LLM &mdash; first thought</div>
        <div class="ls-detail" id="ls-1-d">Thought: I need to check the file size. I will run a shell command.
Action: RUN
Action Input: stat -f%z /etc/hosts</div>
      </div>
    </div>
    <div class="loop-step" id="ls-2">
      <div class="ls-icon">&#128295;</div>
      <div class="ls-body">
        <div class="ls-title">Tool executed</div>
        <div class="ls-detail" id="ls-2-d">$ stat -f%z /etc/hosts
&rarr; 213</div>
      </div>
    </div>
    <div class="loop-step" id="ls-3">
      <div class="ls-icon">&#128065;</div>
      <div class="ls-body">
        <div class="ls-title">Observation injected into context</div>
        <div class="ls-detail" id="ls-3-d">Observation: 213</div>
      </div>
    </div>
    <div class="loop-step" id="ls-4">
      <div class="ls-icon">&#129302;</div>
      <div class="ls-body">
        <div class="ls-title">LLM &mdash; final reasoning</div>
        <div class="ls-detail" id="ls-4-d">Thought: I have the size. I can now answer.
Final Answer: The file /etc/hosts is 213 bytes.</div>
      </div>
    </div>
    <div class="loop-step" id="ls-5">
      <div class="ls-icon">&#9989;</div>
      <div class="ls-body">
        <div class="ls-title">Final answer returned to user</div>
        <div class="ls-detail" id="ls-5-d">The file /etc/hosts is 213 bytes.</div>
      </div>
    </div>
  </div>
</div>

---

## All Five Stages at a Glance

<table class="cmp-table">
  <thead>
    <tr>
      <th>Stage</th>
      <th>Memory</th>
      <th>Tools</th>
      <th>Loop</th>
      <th>Reasoning trace</th>
      <th>Best for</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>&#9312; Raw call</td>
      <td class="cx">&#10007;</td><td class="cx">&#10007;</td>
      <td class="cx">&#10007;</td><td class="cx">&#10007;</td>
      <td>One-shot tasks</td>
    </tr>
    <tr>
      <td>&#9313; Loop</td>
      <td class="ck">&#10003;</td><td class="cx">&#10007;</td>
      <td class="ck">&#10003;</td><td class="cx">&#10007;</td>
      <td>Chat interfaces</td>
    </tr>
    <tr>
      <td>&#9314; Labels</td>
      <td class="ck">&#10003;</td><td class="cp">~</td>
      <td class="ck">&#10003;</td><td class="cx">&#10007;</td>
      <td>Any model, quick prototypes</td>
    </tr>
    <tr>
      <td>&#9315; Functions</td>
      <td class="ck">&#10003;</td><td class="ck">&#10003;</td>
      <td class="ck">&#10003;</td><td class="cx">&#10007;</td>
      <td>Production agents</td>
    </tr>
    <tr>
      <td>&#9316; ReAct</td>
      <td class="ck">&#10003;</td><td class="ck">&#10003;</td>
      <td class="ck">&#10003;</td><td class="ck">&#10003;</td>
      <td>Complex multi-step reasoning</td>
    </tr>
  </tbody>
</table>

---

## So, Is Attention All You Need?

{: class="marginalia" }
My honest answer: for a<br/>demo, yes. For anything<br/>you'd run in production,<br/>no. The loop, the tools,<br/>and the guardrails are<br/>what separate a toy<br/>from a product.

For a neural network architecture? Apparently yes — the Transformer proved that.

For an AI **product**? No. Attention handles the hard part (understanding and generating language),
but you also need:

- **A loop** to handle multi-step tasks
- **Tools** to interact with the real world
- **Memory** to maintain context across turns
- **A step cap** to prevent runaway costs and hallucination spirals

The journey from Stage 1 to Stage 5 is a journey from "calling a smart autocomplete"
to "building infrastructure for autonomous decision-making." Each stage adds one primitive —
loop, tool dispatch, structured calls, explicit reasoning — and the emergent behaviour
changes dramatically.

Start at Stage 1. Add a loop when you need memory. Use labels when your model has no native
tool-calling. Graduate to function calls when reliability matters. Add explicit reasoning
when you need to debug complex chains.

The model's attention is the engine. Everything else is the car.

---

*Further reading:
[ReAct paper (Yao et al. 2022)](https://arxiv.org/abs/2210.03629),
[Ollama API docs](https://github.com/ollama/ollama/blob/main/docs/api.md),
[cpr HTTP library](https://github.com/libcpr/cpr),
[nlohmann/json](https://github.com/nlohmann/json).*

<script>
// ─── Stage navigator ────────────────────────────────────────────
function switchStage(idx) {
  document.querySelectorAll('.stage-btn').forEach(function(b, i) {
    b.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.stage-panel').forEach(function(p, i) {
    p.classList.toggle('active', i === idx);
  });
}

// ─── Copy buttons ────────────────────────────────────────────────
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1600);
  });
}

// ─── Label playground ────────────────────────────────────────────
var LABELS = {
  SEARCH: { icon: 'SEARCH', exec: function(a) { return 'querying web: "' + a + '"'; } },
  CALC:   { icon: 'CALC',   exec: function(a) { try { return '= ' + eval(a); } catch(e) { return '(eval error)'; } } },
  FILE:   { icon: 'FILE',   exec: function(a) { return 'reading: ' + a; } },
  RUN:    { icon: 'RUN',    exec: function(a) { return '$ ' + a; } },
  FINAL:  { icon: 'FINAL',  exec: function(a) { return 'answer: ' + a; } }
};

function parseLabelInput() {
  var text = document.getElementById('pg-input').value;
  var out  = document.getElementById('pg-output');
  var re   = /\[([A-Z_]+):\s*([^\]]+)\]/g;
  var html = '', m, found = 0;
  while ((m = re.exec(text)) !== null) {
    var name = m[1], args = m[2], def = LABELS[name];
    if (!def) continue;
    found++;
    html += '<div class="label-result">'
          + '<div class="lr-name">[' + name + ']</div>'
          + '<div class="lr-args">' + args.trim() + '</div>'
          + '<div class="lr-exec">&rarr; ' + def.exec(args.trim()) + '</div>'
          + '</div>';
  }
  out.innerHTML = found
    ? html
    : '<div style="color:rgba(255,255,255,.28);padding:.5rem;font-size:.8rem;">No labels found. Try adding [SEARCH: something]</div>';
}
parseLabelInput();

// ─── Agent loop visualiser ───────────────────────────────────────
var visTimer = null;

function resetLoopVis() {
  if (visTimer) { clearTimeout(visTimer); visTimer = null; }
  document.querySelectorAll('.loop-step').forEach(function(s) {
    s.classList.remove('active', 'done');
  });
  var btn = document.getElementById('vis-run');
  btn.disabled = false;
  btn.innerHTML = '&#9654; Run agent';
}

function runLoopVis() {
  var btn = document.getElementById('vis-run');
  btn.disabled = true;
  btn.textContent = 'Running...';

  var q = document.getElementById('vis-q').value || 'What is the file size of /etc/hosts?';
  document.getElementById('ls-0-d').textContent = q;

  var steps  = Array.from(document.querySelectorAll('.loop-step'));
  var delays = [700, 1600, 1200, 900, 1600, 900];
  var i = 0;

  function tick() {
    if (i > 0) {
      var prev = steps[i - 1];
      prev.classList.remove('active');
      prev.classList.add('done');
    }
    if (i >= steps.length) {
      btn.disabled = false;
      btn.innerHTML = '&#9654; Run again';
      return;
    }
    steps[i].classList.add('active');
    visTimer = setTimeout(tick, delays[i]);
    i++;
  }
  tick();
}
</script>
