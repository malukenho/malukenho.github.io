---
layout: post
title: "System Design: Link Unfurling — How Slack and WhatsApp Generate URL Previews"
date: 2026-06-15 10:00:00 +0000
categories: ["post"]
tags: [system-design, scraping, cache, security, ssrf, open-graph, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios
</div>

{: class="marginalia" }
The Open Graph Protocol<br/>was created by Facebook<br/>in 2010 alongside the<br/>"Like" button launch.<br/>The intent was to turn<br/>the entire web into a<br/>Facebook graph — it<br/>succeeded beyond all<br/>expectations.

Design the URL preview system for Slack. When a user pastes a URL in a message, Slack fetches that URL and shows a rich preview: title, description, thumbnail image. Handle millions of URLs per day, protect against SSRF attacks, cache aggressively, and support custom Open Graph metadata.

**The question:** *Design the link unfurling system used by Slack. When a user pastes a URL, show a rich preview with title, description, and thumbnail. Handle 250M unfurl requests per day, protect against SSRF, and cache aggressively.*

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
.viz-btn.danger { background:#f08080;color:#19191c;border:none;border-radius:8px;font-weight:700;padding:.5rem 1.2rem;cursor:pointer; }
.viz-btn.danger:hover { background:#e06060; }

.pipe-flow { display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin:1.2rem 0; }
.pipe-node { background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.55rem .9rem;font-size:.78rem;color:rgba(255,255,255,.8);text-align:center;min-width:90px;transition:all .4s; }
.pipe-node.lit { border-color:#7bcdab;background:#1a2e22;color:#7bcdab;box-shadow:0 0 12px rgba(123,205,171,.25); }
.pipe-node.blocked { border-color:#f08080;background:#2a1616;color:#f08080;box-shadow:0 0 12px rgba(240,128,128,.25); }
.pipe-arrow { color:rgba(255,255,255,.22);font-size:.9rem;flex-shrink:0; }

.preview-card { background:#1e1f24;border:1px solid #2e2f35;border-radius:10px;overflow:hidden;max-width:420px;margin:1rem 0;font-family:inherit; }
.preview-image { width:100%;height:160px;object-fit:cover;background:#2a2b30;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.25);font-size:.8rem; }
.preview-body { padding:.9rem 1rem; }
.preview-domain { font-size:.7rem;color:rgba(255,255,255,.38);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.35rem; }
.preview-title { font-size:.9rem;font-weight:700;color:rgba(255,255,255,.9);margin-bottom:.35rem;line-height:1.4; }
.preview-desc { font-size:.78rem;color:rgba(255,255,255,.5);line-height:1.55; }

.ssrf-row { display:flex;align-items:flex-start;gap:.8rem;background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.8rem 1rem;margin:.5rem 0;cursor:pointer;transition:all .2s; }
.ssrf-row:hover { border-color:#3a3b40; }
.ssrf-row.selected { border-color:#7bcdab;background:#12201a; }
.ssrf-row.selected.bad { border-color:#f08080;background:#1e1212; }
.ssrf-url { font-family:"JetBrains Mono","Fira Code",monospace;font-size:.78rem;color:#89c0d0;flex:1;word-break:break-all; }
.ssrf-verdict { font-size:.72rem;font-weight:700;white-space:nowrap; }
.ssrf-verdict.safe { color:#7bcdab; }
.ssrf-verdict.block { color:#f08080; }

.ssrf-detail { background:#111214;border:1px solid #2e2f35;border-radius:8px;padding:1rem;margin-top:.8rem;font-size:.82rem;line-height:1.7;color:rgba(255,255,255,.72);display:none; }
.ssrf-detail.show { display:block; }
.ssrf-detail .step { display:flex;align-items:flex-start;gap:.6rem;margin:.4rem 0; }
.ssrf-detail .step-icon { font-size:.9rem;flex-shrink:0;margin-top:.1rem; }
.ssrf-detail .step-text { color:rgba(255,255,255,.7); }
.ssrf-detail .step-text strong { color:#fbef8a; }
.ssrf-detail .step-text .blocked-label { color:#f08080;font-weight:700; }
.ssrf-detail .step-text .safe-label { color:#7bcdab;font-weight:700; }

.toggle-switch { display:flex;align-items:center;gap:.7rem;margin:.8rem 0; }
.toggle-track { width:44px;height:24px;background:#2e2f35;border-radius:12px;position:relative;cursor:pointer;transition:background .2s; }
.toggle-track.on { background:#7bcdab; }
.toggle-thumb { width:18px;height:18px;background:#fff;border-radius:50%;position:absolute;top:3px;left:3px;transition:left .2s; }
.toggle-track.on .toggle-thumb { left:23px; }
.toggle-label { font-size:.82rem;color:rgba(255,255,255,.7); }

.cache-key-demo { background:#0d0e11;border:1px solid #1e2025;border-radius:8px;padding:1rem;font-family:"JetBrains Mono","Fira Code",monospace;font-size:.8rem;line-height:2;color:rgba(255,255,255,.7);margin:.8rem 0; }
.cache-key-demo .before { color:#f08080;text-decoration:line-through; }
.cache-key-demo .after  { color:#7bcdab; }
.cache-key-demo .arrow  { color:rgba(255,255,255,.25);margin:0 .5rem; }
</style>

## 1. What is link unfurling?

When you paste `https://github.com/torvalds/linux` in Slack, within seconds it expands into a rich card:

<div class="preview-card">
  <div class="preview-image" style="background:linear-gradient(135deg,#1a1b1f 0%,#2a2b35 100%);height:120px;display:flex;align-items:center;justify-content:center;">
    <span style="font-size:2rem;">🐧</span>
  </div>
  <div class="preview-body">
    <div class="preview-domain">github.com</div>
    <div class="preview-title">torvalds/linux: Linux kernel source tree</div>
    <div class="preview-desc">Linux kernel source tree. Contribute to torvalds/linux development by creating an account on GitHub.</div>
  </div>
</div>

Slack's servers fetched the URL behind the scenes, parsed the `<meta property="og:...">` tags, stored an image proxy copy, and pushed the preview to every client in the channel — all in under 500ms.

This is called **link unfurling** (or URL enrichment). It involves web scraping, caching, security validation, and real-time push to clients. Every major messaging platform has this problem: Slack, WhatsApp, iMessage, Discord, Telegram.

---

## 2. The Open Graph Protocol

{: class="marginalia" }
Facebook created OG<br/>in 2010 alongside the<br/>"Like" button. The spec<br/>was intentionally open<br/>so every platform<br/>would adopt it — and<br/>every major one did.

Facebook's Open Graph Protocol (2010) standardised how pages declare preview metadata. A page that wants to control its preview embeds these tags in `<head>`:

<div class="code-wrap">
<div class="code-lang">html <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="op">&lt;</span><span class="cm">!-- Open Graph meta tags in &lt;head&gt; --&gt;</span>
<span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">property</span><span class="op">=</span><span class="st">"og:title"</span>       <span class="pp">content</span><span class="op">=</span><span class="st">"Linux kernel source tree"</span> <span class="op">/&gt;</span>
<span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">property</span><span class="op">=</span><span class="st">"og:description"</span>  <span class="pp">content</span><span class="op">=</span><span class="st">"Contribute to torvalds/linux..."</span> <span class="op">/&gt;</span>
<span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">property</span><span class="op">=</span><span class="st">"og:image"</span>        <span class="pp">content</span><span class="op">=</span><span class="st">"https://opengraph.githubassets.com/..."</span> <span class="op">/&gt;</span>
<span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">property</span><span class="op">=</span><span class="st">"og:url"</span>          <span class="pp">content</span><span class="op">=</span><span class="st">"https://github.com/torvalds/linux"</span> <span class="op">/&gt;</span>
<span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">property</span><span class="op">=</span><span class="st">"og:type"</span>         <span class="pp">content</span><span class="op">=</span><span class="st">"website"</span> <span class="op">/&gt;</span></pre>
</div>

When a page has **no OG tags**, the unfurler falls back gracefully:

1. `og:title` → `<title>` tag content
2. `og:description` → `<meta name="description">` → first 200 chars of `<p>` text
3. `og:image` → first `<img>` with `width > 200px`
4. `og:url` → the requested URL itself

Twitter (now X) added their own variant — `twitter:card` tags — which follow the same idea but with different property names.

### Interactive: Open Graph Parser

<div class="viz-wrap">
  <div class="viz-title">&#9654; Open Graph tag parser — see how preview data is extracted</div>

  <div class="toggle-switch" style="margin-bottom:1rem;">
    <div class="toggle-track" id="og-toggle" onclick="toggleOgMode()">
      <div class="toggle-thumb"></div>
    </div>
    <span class="toggle-label" id="og-toggle-label">Mode: <strong style="color:#fbef8a;">With OG tags</strong></span>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
    <div>
      <div style="font-size:.72rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.6rem;">mock html document</div>
      <div class="code-wrap" style="margin:0;">
        <div class="code-lang">html</div>
        <pre class="code-block" id="og-source-code" style="font-size:.75rem;line-height:1.55;max-height:260px;overflow-y:auto;"></pre>
      </div>
      <button class="viz-btn run" onclick="parseOgTags()" style="margin-top:.8rem;">Parse OG Tags</button>
    </div>
    <div>
      <div style="font-size:.72rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.6rem;">extracted metadata</div>
      <div id="og-metadata" style="background:#0d0e11;border:1px solid #1e2025;border-radius:8px;padding:1rem;font-family:'JetBrains Mono','Fira Code',monospace;font-size:.77rem;line-height:1.9;color:rgba(255,255,255,.6);min-height:120px;">
        <span style="color:rgba(255,255,255,.25);font-style:italic;">Click "Parse OG Tags" to extract...</span>
      </div>
      <div style="font-size:.72rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.1em;margin:.8rem 0 .4rem;">slack-style preview</div>
      <div id="og-preview" class="preview-card" style="display:none;max-width:100%;"></div>
      <div id="og-no-preview" style="color:rgba(255,255,255,.28);font-size:.8rem;font-style:italic;">Preview will appear here</div>
    </div>
  </div>
</div>

---

## 3. The Unfurling Pipeline

There are two paths: **synchronous** (fast, cached) and **asynchronous** (slow, background).

### Synchronous path — target: under 500ms

<div class="pipe-flow" id="sync-pipe">
  <div class="pipe-node" id="sn0">User sends<br/>message</div>
  <div class="pipe-arrow">&#8594;</div>
  <div class="pipe-node" id="sn1">Detect URL<br/>pattern</div>
  <div class="pipe-arrow">&#8594;</div>
  <div class="pipe-node" id="sn2">POST /unfurl<br/>{url}</div>
  <div class="pipe-arrow">&#8594;</div>
  <div class="pipe-node" id="sn3">Redis<br/>cache check</div>
  <div class="pipe-arrow">&#8594;</div>
  <div class="pipe-node" id="sn4">Fetch &amp;<br/>parse HTML</div>
  <div class="pipe-arrow">&#8594;</div>
  <div class="pipe-node" id="sn5">Cache &amp;<br/>return</div>
  <div class="pipe-arrow">&#8594;</div>
  <div class="pipe-node" id="sn6">Preview<br/>shown</div>
</div>

<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem;">
  <button class="viz-btn run" onclick="animatePipeline('sync')">Animate (Cache Hit)</button>
  <button class="viz-btn" onclick="animatePipeline('miss')" style="border-color:#fbef8a;color:#fbef8a;">Animate (Cache Miss)</button>
</div>

On a **cache hit** (step 3 succeeds), the pipeline short-circuits — no HTTP fetch needed, response in < 5ms from Redis. On a **cache miss**, the system fetches the URL with a strict 3-second timeout, parses the HTML, stores the result in Redis, then returns the preview data.

### Asynchronous path — for slow URLs

Some URLs take 2–5 seconds (JavaScript-heavy pages, slow servers). Making the user wait is bad UX. Instead:

1. Message is sent **immediately** — no preview yet
2. Unfurl job is **enqueued** (SQS / Kafka)
3. Worker fetches and parses asynchronously
4. When complete, result is **pushed via WebSocket** to every client in the channel
5. Preview appears inline — message UI updates seamlessly

<div class="callout callout-yellow">
<strong>Interview signal:</strong> Mentioning both paths — and knowing <em>when</em> to use each — demonstrates you understand latency/UX tradeoffs. Don't design a purely synchronous system; slow URLs will block message sending.
</div>

### The unfurler service (pseudocode)

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">async def</span> <span class="fn">unfurl</span>(url: <span class="ty">str</span>) -&gt; <span class="ty">Preview</span>:
    <span class="cm"># 1. Normalise: lowercase, strip tracking params</span>
    key <span class="op">=</span> <span class="fn">cache_key</span>(url)

    <span class="cm"># 2. Cache check</span>
    cached <span class="op">=</span> <span class="kw">await</span> redis.<span class="fn">get</span>(key)
    <span class="kw">if</span> cached:
        <span class="kw">return</span> <span class="ty">Preview</span>.<span class="fn">from_json</span>(cached)

    <span class="cm"># 3. SSRF validation BEFORE any network call</span>
    <span class="fn">validate_url</span>(url)   <span class="cm"># raises SSRFError if blocked</span>

    <span class="cm"># 4. Fetch with timeout</span>
    html <span class="op">=</span> <span class="kw">await</span> <span class="fn">fetch_html</span>(
        url,
        timeout<span class="op">=</span><span class="nu">3.0</span>,
        max_size<span class="op">=</span><span class="nu">500_000</span>,  <span class="cm"># 500 KB max</span>
        follow_redirects<span class="op">=</span><span class="nu">3</span>,
        re_validate_ip<span class="op">=</span><span class="ty">True</span>
    )

    <span class="cm"># 5. Parse OG tags with fallback</span>
    preview <span class="op">=</span> <span class="fn">parse_og</span>(html, url)

    <span class="cm"># 6. Cache the result</span>
    ttl <span class="op">=</span> <span class="fn">choose_ttl</span>(url)  <span class="cm"># 1h news, 24h default</span>
    <span class="kw">await</span> redis.<span class="fn">setex</span>(key, ttl, preview.<span class="fn">to_json</span>())

    <span class="kw">return</span> preview</pre>
</div>

---

## 4. SSRF: The Most Dangerous Bug in Link Unfurling

{: class="marginalia" }
SSRF was the attack<br/>vector in the 2019<br/>Capital One breach.<br/>An SSRF flaw let the<br/>attacker reach the AWS<br/>EC2 metadata endpoint<br/>and steal IAM creds,<br/>exposing 100 million<br/>customer records.

**Server-Side Request Forgery (SSRF)** is when an attacker tricks your server into making HTTP requests to internal infrastructure — using *your server's* network privileges.

Imagine this request arriving at Slack's unfurl endpoint:

<div class="code-wrap">
<div class="code-lang">http</div>
<pre class="code-block"><span class="kw">POST</span> <span class="fn">/unfurl</span>
<span class="ty">Content-Type</span><span class="op">:</span> application/json

<span class="op">{</span>
  <span class="pp">"url"</span><span class="op">:</span> <span class="st">"http://169.254.169.254/latest/meta-data/iam/security-credentials/"</span>
<span class="op">}</span></pre>
</div>

Slack's unfurl service, running on AWS, dutifully fetches that URL. The response is the **EC2 instance's IAM credentials** — the attacker now has full AWS access.

### SSRF mitigations

<div class="comp-table-wrapper" style="overflow-x:auto;">
<table class="comp-table">
<thead><tr><th>Mitigation</th><th>How it works</th><th>Catches</th></tr></thead>
<tbody>
<tr><td><strong>DNS pre-resolve + block</strong></td><td>Resolve hostname to IP before fetching; reject RFC1918 / loopback / link-local ranges</td><td>Direct IP attacks, hostname aliases</td></tr>
<tr><td><strong>Separate VPC</strong></td><td>Unfurl service runs in isolated network with no route to internal services</td><td>Lateral movement even if IP check bypassed</td></tr>
<tr><td><strong>Redirect re-validation</strong></td><td>After each redirect, re-check the destination IP</td><td>Open-redirect SSRF chains</td></tr>
<tr><td><strong>Allowlist public IPs only</strong></td><td>Only allow routable, non-reserved IP space</td><td>Cloud metadata endpoints, private ranges</td></tr>
<tr><td><strong>Max 3 redirects</strong></td><td>Limit redirect chain length</td><td>Redirect loops, deep redirect chains</td></tr>
<tr><td><strong>DNS rebinding protection</strong></td><td>Re-resolve hostname at connection time; compare to pre-resolved IP</td><td>DNS rebinding attacks</td></tr>
</tbody>
</table>
</div>

**Blocked IP ranges:**

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> <span class="ty">ipaddress</span>

BLOCKED_RANGES <span class="op">=</span> [
    <span class="st">"10.0.0.0/8"</span>,        <span class="cm"># RFC1918 private</span>
    <span class="st">"172.16.0.0/12"</span>,     <span class="cm"># RFC1918 private</span>
    <span class="st">"192.168.0.0/16"</span>,    <span class="cm"># RFC1918 private</span>
    <span class="st">"127.0.0.0/8"</span>,       <span class="cm"># loopback</span>
    <span class="st">"169.254.0.0/16"</span>,    <span class="cm"># link-local / AWS IMDS</span>
    <span class="st">"::1/128"</span>,           <span class="cm"># IPv6 loopback</span>
    <span class="st">"fc00::/7"</span>,          <span class="cm"># IPv6 unique-local</span>
    <span class="st">"fe80::/10"</span>,         <span class="cm"># IPv6 link-local</span>
]

<span class="kw">def</span> <span class="fn">is_safe_ip</span>(ip_str: <span class="ty">str</span>) -&gt; <span class="ty">bool</span>:
    addr <span class="op">=</span> ipaddress.<span class="fn">ip_address</span>(ip_str)
    <span class="kw">for</span> cidr <span class="kw">in</span> BLOCKED_RANGES:
        <span class="kw">if</span> addr <span class="kw">in</span> ipaddress.<span class="fn">ip_network</span>(cidr):
            <span class="kw">return</span> <span class="ty">False</span>
    <span class="kw">return</span> <span class="ty">True</span>

<span class="kw">def</span> <span class="fn">validate_url</span>(url: <span class="ty">str</span>):
    parsed <span class="op">=</span> urllib.<span class="fn">parse</span>.<span class="fn">urlparse</span>(url)
    <span class="kw">if</span> parsed.scheme <span class="kw">not in</span> (<span class="st">'http'</span>, <span class="st">'https'</span>):
        <span class="kw">raise</span> <span class="ty">SSRFError</span>(<span class="st">"non-http scheme blocked"</span>)
    ips <span class="op">=</span> socket.<span class="fn">getaddrinfo</span>(parsed.hostname, <span class="ty">None</span>)
    <span class="kw">for</span> (_, _, _, _, sockaddr) <span class="kw">in</span> ips:
        <span class="kw">if</span> <span class="kw">not</span> <span class="fn">is_safe_ip</span>(sockaddr[<span class="nu">0</span>]):
            <span class="kw">raise</span> <span class="ty">SSRFError</span>(<span class="st">"resolved to blocked IP: "</span> <span class="op">+</span> sockaddr[<span class="nu">0</span>])</pre>
</div>

### Interactive: SSRF Checker

<div class="viz-wrap">
  <div class="viz-title">&#128737;&#65039; SSRF validation — click a URL to see the validation pipeline</div>

  <div id="ssrf-list">
    <div class="ssrf-row" onclick="checkSSRF(0)">
      <div class="ssrf-url">https://github.com/torvalds/linux</div>
      <div class="ssrf-verdict safe">&#10003; Safe</div>
    </div>
    <div class="ssrf-row" onclick="checkSSRF(1)">
      <div class="ssrf-url">http://192.168.1.1/admin</div>
      <div class="ssrf-verdict block">&#10007; Blocked</div>
    </div>
    <div class="ssrf-row" onclick="checkSSRF(2)">
      <div class="ssrf-url">http://169.254.169.254/latest/meta-data/iam/security-credentials/</div>
      <div class="ssrf-verdict block">&#10007; Blocked</div>
    </div>
    <div class="ssrf-row" onclick="checkSSRF(3)">
      <div class="ssrf-url">http://localhost:6379/</div>
      <div class="ssrf-verdict block">&#10007; Blocked</div>
    </div>
    <div class="ssrf-row" onclick="checkSSRF(4)">
      <div class="ssrf-url">https://evil.com/redirect?to=http://10.0.0.1</div>
      <div class="ssrf-verdict block">&#10007; Blocked (after redirect)</div>
    </div>
  </div>

  <div class="ssrf-detail" id="ssrf-detail"></div>
</div>

---

## 5. Caching Strategy

{: class="marginalia" }
Slack's unfurl system<br/>has been creatively<br/>abused — users craft<br/>pages with specific OG<br/>metadata to generate<br/>custom Slack message<br/>cards. Rate limiting<br/>was added to prevent<br/>this kind of misuse.

Caching is the most important performance lever in link unfurling. The same GitHub or YouTube URL will be pasted by thousands of users — fetching it every time is wasteful and slow.

### Cache key normalisation

Before looking up the cache, normalise the URL so that equivalent URLs share one cache entry:

<div class="cache-key-demo">
  <div><span class="before">https://GitHub.com/torvalds/linux?utm_source=newsletter&utm_medium=email</span></div>
  <div class="arrow" style="text-align:center;">&#8595; normalize</div>
  <div><span class="after">https://github.com/torvalds/linux</span></div>
  <br/>
  <div><span class="before">https://example.com/page?ref=twitter&fbclid=abc123</span></div>
  <div class="arrow" style="text-align:center;">&#8595; normalize</div>
  <div><span class="after">https://example.com/page</span></div>
</div>

Normalisation steps:
1. Lowercase the scheme and hostname
2. Remove known tracking params: `utm_*`, `fbclid`, `ref`, `source`, `campaign`
3. Sort remaining query parameters alphabetically
4. Remove trailing slashes from the path

### TTL policy

<div class="comp-table-wrapper" style="overflow-x:auto;">
<table class="comp-table">
<thead><tr><th>URL type</th><th>TTL</th><th>Rationale</th></tr></thead>
<tbody>
<tr><td>News articles (bbc.com, nytimes.com)</td><td>1 hour</td><td>Content and headline may change</td></tr>
<tr><td>GitHub repos, docs, wikis</td><td>24 hours</td><td>Rarely changes intraday</td></tr>
<tr><td>YouTube videos</td><td>24 hours</td><td>Title/thumbnail very stable</td></tr>
<tr><td>Twitter/X posts</td><td>4 hours</td><td>Engagement numbers update frequently</td></tr>
<tr><td>404 / error responses</td><td>1 hour</td><td>Negative cache — site may come back</td></tr>
<tr><td>Default</td><td>24 hours</td><td>Conservative default</td></tr>
</tbody>
</table>
</div>

### Image proxying

Never hotlink the `og:image` directly. Instead:

1. **Download** the image to your own CDN at unfurl time
2. **Serve** from your CDN — stable URL, controlled by you
3. **Resize** to max 1200×630px to save bandwidth
4. **Convert** to WebP for modern clients

If you hotlink directly, images disappear when the source site removes them, and the site owner can track every Slack user who views the message via image request logs.

### Cache invalidation

Users can click **"Refresh preview"** on any Slack message. This:
1. Issues `POST /unfurl?bust=1 {url}` — skip cache, force re-fetch
2. Overwrites the cache entry with fresh data
3. Pushes the updated preview to all channel clients via WebSocket

---

## 6. Scale Estimates

<div class="stat-grid">
  <div class="stat-card"><span class="stat-num">50M</span><div class="stat-lbl">Slack users</div></div>
  <div class="stat-card"><span class="stat-num">250M</span><div class="stat-lbl">Unfurl requests / day</div></div>
  <div class="stat-card"><span class="stat-num">~3K</span><div class="stat-lbl">Requests / sec</div></div>
  <div class="stat-card"><span class="stat-num">80%</span><div class="stat-lbl">Cache hit rate</div></div>
  <div class="stat-card"><span class="stat-num">600</span><div class="stat-lbl">Actual fetches / sec</div></div>
  <div class="stat-card"><span class="stat-num">120 MB/s</span><div class="stat-lbl">Outbound bandwidth</div></div>
</div>

The math: 50M users × 5 URLs/day = 250M requests/day = ~3,000/sec. With 80% cache hit rate (GitHub, YouTube, Twitter dominate), actual external HTTP fetches drop to ~600/sec. At 200KB average page size, that's 120 MB/sec outbound — manageable with a fleet of ~20 fetch workers.

**Why is cache hit rate so high?** Pareto principle applies hard here. A small number of popular domains (GitHub, YouTube, Twitter, Wikipedia, Notion) account for a huge fraction of all shared URLs. These hit the cache constantly.

**Sizing Redis cache storage:**
- 100M cached URL previews × ~1KB per entry = ~100 GB
- Redis with LRU eviction handles this comfortably on a few large nodes
- Use Redis Cluster for horizontal scaling and HA

---

## 7. JavaScript-Rendered Pages

A simple HTTP GET of a React or Vue app returns near-empty HTML — the content is injected by JavaScript after load. The `<head>` OG tags may be present (server-side rendering), but increasingly they are not.

**Solutions in order of cost:**

<div class="comp-table-wrapper" style="overflow-x:auto;">
<table class="comp-table">
<thead><tr><th>Approach</th><th>Latency</th><th>Cost</th><th>Use case</th></tr></thead>
<tbody>
<tr><td>Plain HTTP fetch + HTML parse</td><td>&lt;300ms</td><td>Very low</td><td>Most sites (SSR, static)</td></tr>
<tr><td>Server-Side Rendering detection</td><td>&lt;300ms</td><td>Very low</td><td>Sites with SSR but blank SPA shell</td></tr>
<tr><td>Headless Chrome render</td><td>2–5 sec</td><td>High (CPU)</td><td>Pure SPA sites, no SSR</td></tr>
<tr><td>Pre-rendering cache (rendertron)</td><td>Varies</td><td>Medium</td><td>Frequently-shared SPA URLs</td></tr>
</tbody>
</table>
</div>

**Tiered approach (recommended):**

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">async def</span> <span class="fn">fetch_with_fallback</span>(url: <span class="ty">str</span>) -&gt; <span class="ty">Preview</span>:
    <span class="cm"># Tier 1: fast plain fetch</span>
    html <span class="op">=</span> <span class="kw">await</span> <span class="fn">http_get</span>(url, timeout<span class="op">=</span><span class="nu">3.0</span>)
    preview <span class="op">=</span> <span class="fn">parse_og</span>(html, url)

    <span class="kw">if</span> preview.<span class="fn">is_empty</span>():
        <span class="cm"># Tier 2: queue for headless render (async)</span>
        <span class="kw">await</span> queue.<span class="fn">enqueue</span>(<span class="st">'headless_render'</span>, url<span class="op">=</span>url)
        <span class="cm"># Return partial preview now; push update when headless completes</span>
        <span class="kw">return</span> <span class="ty">Preview</span>(url<span class="op">=</span>url, title<span class="op">=</span><span class="fn">extract_domain</span>(url))

    <span class="kw">return</span> preview</pre>
</div>

Headless Chrome workers are expensive — keep a pool of ~10 warm Chromium instances. Each render takes 2–5 seconds. At 600 actual fetches/sec with ~5% needing headless rendering, that's 30 headless renders/sec. A pool of 10 workers × 0.5 renders/sec each = 5/sec — clearly you need more workers or a separate headless fleet. Use autoscaling here.

---

## 8. Special Handling for Major Platforms

Most traffic comes from a few sites. Custom parsers for each deliver better previews than generic OG parsing:

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">parse_og</span>(html: <span class="ty">str</span>, url: <span class="ty">str</span>) -&gt; <span class="ty">Preview</span>:
    domain <span class="op">=</span> <span class="fn">extract_domain</span>(url)

    <span class="cm"># Custom parsers for high-traffic domains</span>
    <span class="kw">if</span> domain <span class="op">==</span> <span class="st">'youtube.com'</span> <span class="kw">or</span> domain <span class="op">==</span> <span class="st">'youtu.be'</span>:
        <span class="kw">return</span> <span class="fn">parse_youtube</span>(html, url)

    <span class="kw">if</span> domain <span class="op">==</span> <span class="st">'twitter.com'</span> <span class="kw">or</span> domain <span class="op">==</span> <span class="st">'x.com'</span>:
        <span class="kw">return</span> <span class="fn">parse_twitter</span>(html, url)

    <span class="kw">if</span> domain <span class="op">==</span> <span class="st">'github.com'</span>:
        <span class="kw">return</span> <span class="fn">parse_github</span>(html, url)

    <span class="cm"># Generic OG parser as default</span>
    <span class="kw">return</span> <span class="fn">parse_generic_og</span>(html, url)


<span class="kw">def</span> <span class="fn">parse_twitter</span>(html: <span class="ty">str</span>, url: <span class="ty">str</span>) -&gt; <span class="ty">Preview</span>:
    soup <span class="op">=</span> <span class="ty">BeautifulSoup</span>(html)
    <span class="cm"># Twitter uses twitter:* tags, not og:*</span>
    title <span class="op">=</span> <span class="fn">meta_content</span>(soup, <span class="st">'twitter:title'</span>)
    image <span class="op">=</span> <span class="fn">meta_content</span>(soup, <span class="st">'twitter:image'</span>)
    desc  <span class="op">=</span> <span class="fn">meta_content</span>(soup, <span class="st">'twitter:description'</span>)
    <span class="kw">return</span> <span class="ty">Preview</span>(title<span class="op">=</span>title, image<span class="op">=</span>image, description<span class="op">=</span>desc, url<span class="op">=</span>url)</pre>
</div>

**Platform-specific notes:**
- **YouTube:** thumbnail URL follows a stable pattern (`img.youtube.com/vi/{video_id}/maxresdefault.jpg`) — can be constructed without parsing HTML at all
- **GitHub:** uses a dynamic OG image service that generates repo cards server-side — these are reliable and cache well
- **Instagram / Facebook:** rate-limit aggressive scrapers heavily; requires rotating user-agents and respecting crawl delays

---

## 9. Content Safety

Before surfacing a preview to a user, the unfurl pipeline should validate it:

<div class="comp-table-wrapper" style="overflow-x:auto;">
<table class="comp-table">
<thead><tr><th>Risk</th><th>Check</th><th>When</th></tr></thead>
<tbody>
<tr><td>Phishing / malware URL</td><td>Google Safe Browsing API lookup</td><td>Synchronous, before fetch</td></tr>
<tr><td>NSFW thumbnail image</td><td>ML image classifier (nudity/gore)</td><td>Async, after image download</td></tr>
<tr><td>Malware download</td><td>VirusTotal URL scan</td><td>Async (result cached)</td></tr>
<tr><td>Misleading OG title</td><td>Text similarity between og:title and page title</td><td>Synchronous</td></tr>
<tr><td>Copyright trap</td><td>Block known piracy domains</td><td>URL blocklist lookup</td></tr>
</tbody>
</table>
</div>

**Misleading previews** are a real attack vector: a bad actor sets `og:title` to "Official COVID Vaccine Guide" while the page content is disinformation. One defence: if `og:title` diverges significantly from the `<title>` tag (cosine similarity below threshold), display the `<title>` instead and flag for review.

---

## 10. Architecture Diagram

<div class="viz-wrap" style="overflow-x:auto;">
  <div class="viz-title">&#9643; service architecture</div>
  <div style="min-width:560px;">
    <div style="display:grid;grid-template-columns:1fr;gap:.5rem;">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
        <div style="background:#1e1f24;border:1px solid #fbef8a;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:#fbef8a;font-weight:700;">Slack Client</div>
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;">&#8594; POST /unfurl</div>
        <div style="background:#1e1f24;border:1px solid #2e2f35;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:rgba(255,255,255,.8);">API Gateway</div>
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;">&#8594;</div>
        <div style="background:#1e1f24;border:1px solid #7bcdab;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:#7bcdab;">Unfurl Service</div>
      </div>
      <div style="padding-left:3rem;display:flex;align-items:flex-start;gap:.5rem;flex-wrap:wrap;">
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;margin-top:.7rem;">&#8595; check</div>
        <div style="background:#1a2e22;border:1px solid #7bcdab;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:#7bcdab;margin-left:.5rem;">Redis Cache</div>
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;margin-top:.7rem;">&#8249;hit returns&#8250;</div>
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;margin-top:.7rem;">&nbsp;&nbsp;&#8595; miss</div>
        <div style="background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:rgba(255,255,255,.75);">SSRF Validator</div>
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;margin-top:.7rem;">&#8594;</div>
        <div style="background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:rgba(255,255,255,.75);">HTTP Fetcher</div>
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;margin-top:.7rem;">&#8594;</div>
        <div style="background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:rgba(255,255,255,.75);">OG Parser</div>
      </div>
      <div style="padding-left:3rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-top:.3rem;">
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;">slow URLs &#8594;</div>
        <div style="background:#25240e;border:1px solid #fbef8a;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:#fbef8a;">Job Queue</div>
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;">&#8594;</div>
        <div style="background:#1a1b1f;border:1px solid #2e2f35;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:rgba(255,255,255,.75);">Headless Chrome Workers</div>
        <div style="color:rgba(255,255,255,.3);font-size:.85rem;">&#8594; WebSocket push</div>
        <div style="background:#1e1f24;border:1px solid #fbef8a;border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:#fbef8a;font-weight:700;">Slack Client</div>
      </div>
    </div>
  </div>
</div>

---

## 11. Capacity Estimate

<div class="comp-table-wrapper" style="overflow-x:auto;">
<table class="comp-table">
<thead><tr><th>Metric</th><th>Value</th></tr></thead>
<tbody>
<tr><td>Unfurl requests / sec</td><td>3,000</td></tr>
<tr><td>Cache hit rate</td><td>80%</td></tr>
<tr><td>Actual external fetches / sec</td><td>600</td></tr>
<tr><td>Avg fetched page size</td><td>200 KB</td></tr>
<tr><td>Outbound bandwidth</td><td>120 MB/sec</td></tr>
<tr><td>Redis cache storage</td><td>~100 GB (100M entries × 1 KB)</td></tr>
<tr><td>Image CDN storage</td><td>~5 TB</td></tr>
<tr><td>Headless workers needed</td><td>~60 (30 renders/sec × 2 sec each)</td></tr>
<tr><td>Fetch worker fleet</td><td>~20 pods (600 fetches/sec ÷ 30/pod)</td></tr>
</tbody>
</table>
</div>

---

{: class="marginalia" }
The Open Graph Protocol<br/>is now supported by<br/>every major social<br/>platform, messaging app,<br/>search engine, and<br/>link-in-bio tool — a<br/>rare case of a single<br/>company's proprietary<br/>format becoming a<br/>genuine open standard.

<script>
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre.code-block');
  var text = pre ? pre.innerText : '';
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1600);
  });
}

/* ---------- OG PARSER DEMO ---------- */
var ogMode = true;

var OG_HTML_WITH_TAGS = '<span class="op">&lt;</span><span class="ty">html</span><span class="op">&gt;</span>\n<span class="op">&lt;</span><span class="ty">head</span><span class="op">&gt;</span>\n  <span class="op">&lt;</span><span class="ty">title</span><span class="op">&gt;</span>torvalds/linux<span class="op">&lt;/</span><span class="ty">title</span><span class="op">&gt;</span>\n\n  <span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">property</span><span class="op">=</span><span class="st">"og:title"</span>\n        <span class="pp">content</span><span class="op">=</span><span class="st">"Linux kernel source tree"</span><span class="op">/&gt;</span>\n  <span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">property</span><span class="op">=</span><span class="st">"og:description"</span>\n        <span class="pp">content</span><span class="op">=</span><span class="st">"Linux kernel source tree.\n  Contribute to development on GitHub."</span><span class="op">/&gt;</span>\n  <span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">property</span><span class="op">=</span><span class="st">"og:image"</span>\n        <span class="pp">content</span><span class="op">=</span><span class="st">"https://opengraph.githubassets.com/\n  linux-og-image.png"</span><span class="op">/&gt;</span>\n  <span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">property</span><span class="op">=</span><span class="st">"og:url"</span>\n        <span class="pp">content</span><span class="op">=</span><span class="st">"https://github.com/torvalds/linux"</span><span class="op">/&gt;</span>\n<span class="op">&lt;/</span><span class="ty">head</span><span class="op">&gt;</span>\n<span class="op">&lt;</span><span class="ty">body</span><span class="op">&gt;</span>\n  <span class="op">&lt;</span><span class="ty">h1</span><span class="op">&gt;</span>torvalds / linux<span class="op">&lt;/</span><span class="ty">h1</span><span class="op">&gt;</span>\n  <span class="op">&lt;</span><span class="ty">p</span><span class="op">&gt;</span>Linux kernel source...<span class="op">&lt;/</span><span class="ty">p</span><span class="op">&gt;</span>\n<span class="op">&lt;/</span><span class="ty">body</span><span class="op">&gt;</span>\n<span class="op">&lt;/</span><span class="ty">html</span><span class="op">&gt;</span>';

var OG_HTML_NO_TAGS = '<span class="op">&lt;</span><span class="ty">html</span><span class="op">&gt;</span>\n<span class="op">&lt;</span><span class="ty">head</span><span class="op">&gt;</span>\n  <span class="op">&lt;</span><span class="ty">title</span><span class="op">&gt;</span>My Startup | Build Amazing Things<span class="op">&lt;/</span><span class="ty">title</span><span class="op">&gt;</span>\n  <span class="op">&lt;</span><span class="ty">meta</span> <span class="pp">name</span><span class="op">=</span><span class="st">"description"</span>\n        <span class="pp">content</span><span class="op">=</span><span class="st">"We help teams ship faster with\n  AI-powered developer tools."</span><span class="op">/&gt;</span>\n  <span class="cm">&lt;!-- NO og: meta tags --&gt;</span>\n<span class="op">&lt;/</span><span class="ty">head</span><span class="op">&gt;</span>\n<span class="op">&lt;</span><span class="ty">body</span><span class="op">&gt;</span>\n  <span class="op">&lt;</span><span class="ty">img</span> <span class="pp">src</span><span class="op">=</span><span class="st">"/hero.jpg"</span> <span class="pp">width</span><span class="op">=</span><span class="st">"1200"</span>\n       <span class="pp">alt</span><span class="op">=</span><span class="st">"Hero image"</span><span class="op">/&gt;</span>\n  <span class="op">&lt;</span><span class="ty">h1</span><span class="op">&gt;</span>Build Amazing Things<span class="op">&lt;/</span><span class="ty">h1</span><span class="op">&gt;</span>\n  <span class="op">&lt;</span><span class="ty">p</span><span class="op">&gt;</span>We help teams ship faster...<span class="op">&lt;/</span><span class="ty">p</span><span class="op">&gt;</span>\n<span class="op">&lt;/</span><span class="ty">body</span><span class="op">&gt;</span>\n<span class="op">&lt;/</span><span class="ty">html</span><span class="op">&gt;</span>';

function renderOgSource() {
  var el = document.getElementById('og-source-code');
  if (el) el.innerHTML = ogMode ? OG_HTML_WITH_TAGS : OG_HTML_NO_TAGS;
}

function toggleOgMode() {
  ogMode = !ogMode;
  var track = document.getElementById('og-toggle');
  var label = document.getElementById('og-toggle-label');
  if (track) {
    if (ogMode) {
      track.classList.add('on');
      label.innerHTML = 'Mode: <strong style="color:#fbef8a;">With OG tags</strong>';
    } else {
      track.classList.remove('on');
      label.innerHTML = 'Mode: <strong style="color:#f08080;">No OG tags (fallback)</strong>';
    }
  }
  renderOgSource();
  document.getElementById('og-metadata').innerHTML = '<span style="color:rgba(255,255,255,.25);font-style:italic;">Click \u201CParse OG Tags\u201D to extract...</span>';
  document.getElementById('og-preview').style.display = 'none';
  document.getElementById('og-no-preview').style.display = 'block';
}

function parseOgTags() {
  var meta, preview;
  if (ogMode) {
    meta = {
      source: 'og: meta tags',
      title: 'Linux kernel source tree',
      description: 'Linux kernel source tree. Contribute to torvalds/linux development by creating an account on GitHub.',
      image: 'og:image (GitHub OG image service)',
      url: 'https://github.com/torvalds/linux'
    };
    preview = {
      domain: 'github.com',
      title: 'Linux kernel source tree',
      desc: 'Linux kernel source tree. Contribute to torvalds/linux development.',
      imgLabel: 'GitHub OG image'
    };
  } else {
    meta = {
      source: 'fallback — no og: tags found',
      title: 'My Startup | Build Amazing Things  \u2190 from &lt;title&gt;',
      description: 'We help teams ship faster with AI-powered developer tools.  \u2190 from &lt;meta name="description"&gt;',
      image: '/hero.jpg  \u2190 first &lt;img&gt; with width &gt; 200px',
      url: 'https://mystartup.com'
    };
    preview = {
      domain: 'mystartup.com',
      title: 'My Startup | Build Amazing Things',
      desc: 'We help teams ship faster with AI-powered developer tools.',
      imgLabel: 'First large image on page'
    };
  }

  var metaEl = document.getElementById('og-metadata');
  if (metaEl) {
    metaEl.innerHTML =
      '<span style="color:rgba(255,255,255,.35);">// ' + meta.source + '</span>\n' +
      '<span style="color:#fbef8a;">title</span>       <span style="color:rgba(255,255,255,.4);">=</span> <span style="color:#f8c555;">"' + meta.title + '"</span>\n' +
      '<span style="color:#fbef8a;">description</span> <span style="color:rgba(255,255,255,.4);">=</span> <span style="color:#f8c555;">"' + meta.description + '"</span>\n' +
      '<span style="color:#fbef8a;">image</span>       <span style="color:rgba(255,255,255,.4);">=</span> <span style="color:#f8c555;">"' + meta.image + '"</span>\n' +
      '<span style="color:#fbef8a;">url</span>         <span style="color:rgba(255,255,255,.4);">=</span> <span style="color:#f8c555;">"' + meta.url + '"</span>';
  }

  var previewEl = document.getElementById('og-preview');
  var noPreviewEl = document.getElementById('og-no-preview');
  if (previewEl) {
    previewEl.innerHTML =
      '<div class="preview-image" style="background:linear-gradient(135deg,#1a2e22 0%,#1a1b2e 100%);height:90px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.35);font-size:.75rem;">' +
      preview.imgLabel +
      '</div>' +
      '<div class="preview-body">' +
      '<div class="preview-domain">' + preview.domain + '</div>' +
      '<div class="preview-title">' + preview.title + '</div>' +
      '<div class="preview-desc">' + preview.desc + '</div>' +
      '</div>';
    previewEl.style.display = 'block';
  }
  if (noPreviewEl) noPreviewEl.style.display = 'none';
}

/* ---------- PIPELINE ANIMATION ---------- */
function animatePipeline(mode) {
  var nodes = [0,1,2,3,4,5,6];
  nodes.forEach(function(i) {
    var el = document.getElementById('sn' + i);
    if (el) { el.classList.remove('lit'); el.classList.remove('blocked'); }
  });

  if (mode === 'sync') {
    var steps = [
      { id: 'sn0', delay: 0 },
      { id: 'sn1', delay: 250 },
      { id: 'sn2', delay: 500 },
      { id: 'sn3', delay: 750, stop: true }
    ];
    steps.forEach(function(s) {
      setTimeout(function() {
        var el = document.getElementById(s.id);
        if (el) el.classList.add('lit');
      }, s.delay);
    });
    setTimeout(function() {
      var el = document.getElementById('sn6');
      if (el) el.classList.add('lit');
    }, 1000);
  } else {
    var allSteps = [0,1,2,3,4,5,6];
    allSteps.forEach(function(i, idx) {
      setTimeout(function() {
        var el = document.getElementById('sn' + i);
        if (el) el.classList.add('lit');
      }, idx * 280);
    });
  }
}

/* ---------- SSRF DEMO ---------- */
var ssrfData = [
  {
    url: 'https://github.com/torvalds/linux',
    safe: true,
    steps: [
      { icon: '\u2705', text: '<strong>Scheme check:</strong> HTTPS \u2014 <span class="safe-label">allowed</span>' },
      { icon: '\u2705', text: '<strong>DNS resolve:</strong> github.com \u2192 140.82.121.4 \u2014 <span class="safe-label">public IP</span>' },
      { icon: '\u2705', text: '<strong>Range check:</strong> 140.82.121.4 is not in any blocked CIDR \u2014 <span class="safe-label">safe</span>' },
      { icon: '\u2705', text: '<strong>Safe Browsing:</strong> not listed as phishing or malware \u2014 <span class="safe-label">safe</span>' },
      { icon: '\u{1F7E2}', text: '<strong>Result:</strong> <span class="safe-label">ALLOWED \u2014 proceeding to fetch</span>' }
    ]
  },
  {
    url: 'http://192.168.1.1/admin',
    safe: false,
    steps: [
      { icon: '\u2705', text: '<strong>Scheme check:</strong> HTTP \u2014 <span class="safe-label">allowed</span>' },
      { icon: '\u274c', text: '<strong>DNS resolve:</strong> 192.168.1.1 is a bare IP address (no DNS needed)' },
      { icon: '\u274c', text: '<strong>Range check:</strong> 192.168.1.1 matches <code>192.168.0.0/16</code> (RFC1918 private) \u2014 <span class="blocked-label">BLOCKED</span>' },
      { icon: '\u{1F534}', text: '<strong>Result:</strong> <span class="blocked-label">SSRF BLOCKED \u2014 private IP range</span>' }
    ]
  },
  {
    url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    safe: false,
    steps: [
      { icon: '\u2705', text: '<strong>Scheme check:</strong> HTTP \u2014 <span class="safe-label">allowed</span>' },
      { icon: '\u274c', text: '<strong>Range check:</strong> 169.254.169.254 matches <code>169.254.0.0/16</code> (link-local / AWS IMDS endpoint) \u2014 <span class="blocked-label">BLOCKED</span>' },
      { icon: '\u26a0\ufe0f', text: '<strong>Attack type:</strong> AWS EC2 Instance Metadata Service (IMDS) — would return IAM credentials' },
      { icon: '\u{1F534}', text: '<strong>Result:</strong> <span class="blocked-label">SSRF BLOCKED \u2014 cloud metadata endpoint</span>' }
    ]
  },
  {
    url: 'http://localhost:6379/',
    safe: false,
    steps: [
      { icon: '\u2705', text: '<strong>Scheme check:</strong> HTTP \u2014 <span class="safe-label">allowed</span>' },
      { icon: '\u274c', text: '<strong>DNS resolve:</strong> localhost \u2192 127.0.0.1 \u2014 matches <code>127.0.0.0/8</code> (loopback) \u2014 <span class="blocked-label">BLOCKED</span>' },
      { icon: '\u26a0\ufe0f', text: '<strong>Attack type:</strong> Redis on default port 6379 \u2014 could dump cached secrets or run arbitrary commands' },
      { icon: '\u{1F534}', text: '<strong>Result:</strong> <span class="blocked-label">SSRF BLOCKED \u2014 loopback address</span>' }
    ]
  },
  {
    url: 'https://evil.com/redirect?to=http://10.0.0.1',
    safe: false,
    steps: [
      { icon: '\u2705', text: '<strong>Scheme check:</strong> HTTPS \u2014 <span class="safe-label">allowed</span>' },
      { icon: '\u2705', text: '<strong>DNS resolve:</strong> evil.com \u2192 203.0.113.5 \u2014 <span class="safe-label">public IP, initially safe</span>' },
      { icon: '\u26a0\ufe0f', text: '<strong>Fetch step:</strong> server returns HTTP 302 redirect to <code>http://10.0.0.1</code>' },
      { icon: '\u274c', text: '<strong>Re-validate redirect target:</strong> 10.0.0.1 matches <code>10.0.0.0/8</code> (RFC1918) \u2014 <span class="blocked-label">BLOCKED</span>' },
      { icon: '\u{1F534}', text: '<strong>Result:</strong> <span class="blocked-label">SSRF BLOCKED \u2014 open-redirect chain to private IP</span>' }
    ]
  }
];

function checkSSRF(idx) {
  var rows = document.querySelectorAll('.ssrf-row');
  rows.forEach(function(r, i) {
    r.classList.remove('selected', 'bad');
    if (i === idx) {
      r.classList.add('selected');
      if (!ssrfData[idx].safe) r.classList.add('bad');
    }
  });

  var detail = document.getElementById('ssrf-detail');
  if (!detail) return;
  var d = ssrfData[idx];
  var html = '<div style="font-size:.75rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.6rem;">validation trace</div>';
  d.steps.forEach(function(s) {
    html += '<div class="step"><span class="step-icon">' + s.icon + '</span><span class="step-text">' + s.text + '</span></div>';
  });
  detail.innerHTML = html;
  detail.classList.add('show');
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', function() {
  renderOgSource();
  var track = document.getElementById('og-toggle');
  if (track) track.classList.add('on');
});
</script>
