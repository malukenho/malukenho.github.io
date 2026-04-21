---
layout: post
title: "System Design: Multi-Region Failover — Global Load Balancing and Zero-Downtime Disaster Recovery"
date: 2026-06-18 10:00:00 +0000
categories: ["post"]
tags: [system-design, multi-region, failover, disaster-recovery, dns, replication, web, interview]
series: "System Design: Web Scenarios"
---

<style>
.sd-mr-post { background: #19191c; color: rgba(255,255,255,0.8); font-family: 'Inter', system-ui, sans-serif; line-height: 1.75; }
.sd-mr-post h1, .sd-mr-post h2, .sd-mr-post h3, .sd-mr-post h4 { color: #fbef8a; font-weight: 700; margin-top: 2.2rem; margin-bottom: .7rem; }
.sd-mr-post h2 { font-size: 1.45rem; border-bottom: 1px solid #2a2a2f; padding-bottom: .35rem; }
.sd-mr-post h3 { font-size: 1.18rem; }
.sd-mr-post a { color: #7bcdab; }
.sd-mr-post strong { color: #fff; }
.sd-mr-post code { background: #26262c; color: #7bcdab; padding: 1px 5px; border-radius: 3px; font-size: .88em; }
pre.code-block {
  background: #111115;
  border: 1px solid #2e2e38;
  border-left: 3px solid #7bcdab;
  border-radius: 6px;
  padding: 1.1rem 1.3rem;
  overflow-x: auto;
  font-size: .84rem;
  line-height: 1.6;
  margin: 1.3rem 0;
}
pre.code-block span.kw  { color: #c792ea; }
pre.code-block span.fn  { color: #82aaff; }
pre.code-block span.str { color: #c3e88d; }
pre.code-block span.cm  { color: #546e7a; font-style: italic; }
pre.code-block span.num { color: #f78c6c; }
pre.code-block span.op  { color: #89ddff; }
pre.code-block span.id  { color: #ffcb6b; }
pre.code-block span.ty  { color: #7bcdab; }
.marginalia {
  float: right;
  width: 210px;
  margin: 0 0 1.2rem 1.8rem;
  padding: .7rem .9rem;
  background: #111115;
  border-left: 3px solid #fbef8a;
  border-radius: 0 5px 5px 0;
  font-size: .78rem;
  line-height: 1.55;
  color: rgba(255,255,255,0.55);
  font-style: italic;
}
@media (max-width: 700px) {
  .marginalia { float: none; width: 100%; margin: 0 0 1rem 0; }
}
.sd-widget {
  background: #111115;
  border: 1px solid #2e2e38;
  border-radius: 8px;
  padding: 1.4rem 1.5rem;
  margin: 1.8rem 0;
}
.sd-widget h4 { color: #fbef8a; margin-top: 0; font-size: 1rem; letter-spacing: .03em; text-transform: uppercase; }
.sd-btn {
  background: #26262c;
  border: 1px solid #3e3e4a;
  color: rgba(255,255,255,0.85);
  padding: .38rem .85rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: .83rem;
  transition: background .15s, border-color .15s;
  margin: .25rem .2rem;
}
.sd-btn:hover { background: #32323c; border-color: #7bcdab; }
.sd-btn.active { background: #1a3a2e; border-color: #7bcdab; color: #7bcdab; }
.sd-label { font-size: .78rem; color: rgba(255,255,255,0.45); display: block; margin-bottom: .3rem; letter-spacing: .04em; text-transform: uppercase; }
.sd-meter-wrap { display: flex; align-items: center; gap: .7rem; margin: .4rem 0; }
.sd-meter-bar { height: 10px; border-radius: 5px; background: #2a2a32; flex: 1; overflow: hidden; }
.sd-meter-fill { height: 100%; border-radius: 5px; transition: width .5s ease, background .5s ease; }
.sd-meter-val { font-size: .8rem; min-width: 60px; text-align: right; color: rgba(255,255,255,0.7); }
.sd-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 600px) { .sd-two-col { grid-template-columns: 1fr; } }
.sd-region-box {
  background: #1a1a20;
  border: 2px solid #2e2e38;
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
  transition: border-color .3s, opacity .3s;
}
.sd-region-box.active  { border-color: #7bcdab; }
.sd-region-box.standby { border-color: #555; opacity: .7; }
.sd-region-box.dead    { border-color: #e57373; opacity: .45; }
.sd-region-box.promoted { border-color: #fbef8a; }
.sd-region-label { font-size: .72rem; letter-spacing: .07em; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: .3rem; }
.sd-region-name { font-size: 1rem; font-weight: 700; color: #fff; }
.sd-region-status { font-size: .78rem; margin-top: .35rem; }
.sd-arrow { text-align: center; font-size: 1.5rem; color: #7bcdab; line-height: 2; }
.sd-toggle-row { display: flex; align-items: center; gap: .75rem; margin: .8rem 0; }
.sd-toggle { position: relative; width: 42px; height: 22px; }
.sd-toggle input { opacity: 0; width: 0; height: 0; }
.sd-toggle-slider {
  position: absolute; inset: 0;
  background: #2a2a32;
  border-radius: 11px;
  cursor: pointer;
  transition: .25s;
}
.sd-toggle-slider:before {
  content: "";
  position: absolute;
  width: 16px; height: 16px;
  left: 3px; top: 3px;
  background: rgba(255,255,255,0.55);
  border-radius: 50%;
  transition: .25s;
}
.sd-toggle input:checked + .sd-toggle-slider { background: #1a3a2e; }
.sd-toggle input:checked + .sd-toggle-slider:before { transform: translateX(20px); background: #7bcdab; }
.sd-tl-step {
  display: flex;
  gap: .9rem;
  padding: .55rem 0;
  opacity: .3;
  transition: opacity .4s;
  align-items: flex-start;
}
.sd-tl-step.done  { opacity: 1; }
.sd-tl-step.active { opacity: 1; }
.sd-tl-dot {
  width: 28px; height: 28px; border-radius: 50%;
  background: #2a2a32; border: 2px solid #3e3e4a;
  display: flex; align-items: center; justify-content: center;
  font-size: .75rem; font-weight: 700; flex-shrink: 0;
  transition: background .3s, border-color .3s;
}
.sd-tl-step.done  .sd-tl-dot { background: #1a3a2e; border-color: #7bcdab; color: #7bcdab; }
.sd-tl-step.active .sd-tl-dot { background: #3a2a10; border-color: #fbef8a; color: #fbef8a; }
.sd-tl-body { flex: 1; }
.sd-tl-title { font-weight: 600; font-size: .9rem; color: #fff; }
.sd-tl-time  { font-size: .75rem; color: rgba(255,255,255,0.4); }
.sd-tl-note  { font-size: .8rem; color: rgba(255,255,255,0.55); margin-top: .2rem; }
.sd-db-row { display: flex; gap: 1rem; align-items: flex-start; justify-content: center; flex-wrap: wrap; margin: 1rem 0; }
.sd-db-node { background: #1a1a20; border: 2px solid #2e2e38; border-radius: 6px; padding: .9rem 1.1rem; min-width: 130px; text-align: center; transition: border-color .3s; }
.sd-db-node.primary { border-color: #7bcdab; }
.sd-db-node.replica { border-color: #3e3e4a; }
.sd-db-node.promoted { border-color: #fbef8a; }
.sd-db-icon { font-size: 1.6rem; }
.sd-db-lbl  { font-size: .72rem; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-top: .2rem; letter-spacing: .05em; }
.sd-db-name { font-weight: 700; color: #fff; font-size: .95rem; }
.sd-lag-bar-wrap { margin: .8rem 0; }
.sd-lag-bar-outer { background: #2a2a32; border-radius: 5px; height: 12px; overflow: hidden; }
.sd-lag-bar-inner { height: 100%; background: #7bcdab; border-radius: 5px; transition: width .4s ease, background .4s ease; }
.sd-lag-badge {
  display: inline-block;
  background: #1a3a2e;
  border: 1px solid #7bcdab;
  color: #7bcdab;
  border-radius: 3px;
  font-size: .75rem;
  padding: 1px 7px;
  margin-left: .4rem;
}
.sd-lag-badge.warn { background: #3a2200; border-color: #fbef8a; color: #fbef8a; }
.sd-lag-badge.danger { background: #2a0a0a; border-color: #e57373; color: #e57373; }
.sd-packet {
  display: inline-block;
  width: 12px; height: 12px; border-radius: 50%;
  background: #7bcdab;
  transition: transform .05s linear;
  vertical-align: middle;
}
.sd-dns-row { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; margin: .4rem 0; font-size: .85rem; }
.sd-dns-flag { font-size: 1rem; }
.sd-dns-arrow { color: #7bcdab; margin: 0 .15rem; }
.sd-dns-region { background: #1a1a20; border: 1px solid #2e2e38; border-radius: 4px; padding: .2rem .55rem; font-size: .8rem; color: rgba(255,255,255,0.8); }
.sd-table { width: 100%; border-collapse: collapse; font-size: .84rem; margin: 1rem 0; }
.sd-table th { background: #1a1a20; color: #fbef8a; padding: .5rem .75rem; text-align: left; border-bottom: 1px solid #2e2e38; font-weight: 600; }
.sd-table td { padding: .45rem .75rem; border-bottom: 1px solid #2a2a2f; color: rgba(255,255,255,0.75); }
.sd-table tr:last-child td { border-bottom: none; }
.sd-tag { display: inline-block; background: #1a1a20; border: 1px solid #2e2e38; border-radius: 3px; font-size: .75rem; padding: 1px 7px; color: rgba(255,255,255,0.55); margin: 2px; }
.sd-tag.green { border-color: #7bcdab; color: #7bcdab; }
.sd-tag.yellow { border-color: #fbef8a; color: #fbef8a; }
.sd-tag.red { border-color: #e57373; color: #e57373; }
.sd-info-box { background: #0d1f17; border: 1px solid #1a3a2e; border-radius: 6px; padding: .85rem 1rem; margin: 1rem 0; font-size: .85rem; color: rgba(255,255,255,0.7); }
.sd-warn-box { background: #1f1500; border: 1px solid #3a2800; border-radius: 6px; padding: .85rem 1rem; margin: 1rem 0; font-size: .85rem; color: rgba(255,255,255,0.7); }
</style>

<div class="sd-mr-post" id="sd-mr-post">

<p>
<strong>Interview question:</strong> Your application runs in a single AWS region (US-East). Design it to be globally available and survive a complete regional failure. Users in Asia should get under 100 ms latency. If US-East goes down, US-West should take over within 30 seconds with no data loss. Walk me through the architecture.
</p>

<p>This is one of the most common senior-level system design questions. It tests your understanding of DNS, database replication, distributed consistency, and operational runbooks. Let's build the answer systematically.</p>

---

<h2>1. Why single-region is not enough</h2>

{: class="marginalia" }
The AWS us-east-1 outage on December 7 2021 took down Alexa, Ring, Kindle, Prime Video, and large parts of the internet for 8+ hours. Even AWS's own status page was down — it was hosted in us-east-1.

<p>A single-region architecture has a deceptively simple failure mode: everything in that region can go dark simultaneously, and there is no fallback. This is not a theoretical concern.</p>

<p>The failure categories break down into four buckets:</p>

<p><strong>Natural disasters and physical failures.</strong> AWS us-east-1 suffered a catastrophic failure in December 2021 triggered by a runaway automated capacity scaling event that misconfigured network devices across the region. The cascading failure was so severe that AWS's own tooling used to remediate the issue was also hosted in the impacted region.</p>

<p><strong>Network partitions.</strong> Undersea fiber cables are cut several hundred times per year globally. A significant cut can dramatically degrade or sever connectivity between continents, partitioning your users from your data center even if the data center itself is healthy.</p>

<p><strong>Human error and bad deployments.</strong> A misconfigured firewall rule, a database migration gone wrong, or a cascading config change can take down a region-worth of infrastructure within minutes. These are statistically the most common cause of major outages.</p>

<p><strong>Regulatory constraints.</strong> GDPR (EU), data localisation laws (India, Russia, China), and financial regulations in many jurisdictions require data to physically reside within specific regions. Single-region designs often cannot meet these requirements for global products.</p>

<p>The solution space involves running your application in multiple regions simultaneously or keeping a warm standby ready to absorb traffic on short notice.</p>

---

<h2>2. The two fundamental models</h2>

<p>Before designing anything, you must choose between two primary multi-region architectures. They have very different cost, complexity, and recovery characteristics.</p>

<h3>Active-Passive (Primary-Standby)</h3>

<p><strong>How it works:</strong> One region (primary) serves 100% of traffic. A second region (standby) runs in a reduced or idle state but continuously receives replicated data from the primary. If the primary fails, traffic is redirected to the standby, which is promoted to accept writes.</p>

<p><strong>RTO</strong> (Recovery Time Objective — how long the system is down): 30–90 seconds depending on DNS TTL and promotion time.<br>
<strong>RPO</strong> (Recovery Point Objective — how much data can be lost): seconds, bounded by async replication lag at moment of failure.<br>
<strong>Cost:</strong> Moderate. The standby can run at reduced capacity or use smaller instance types since it handles no production traffic.</p>

<h3>Active-Active</h3>

<p><strong>How it works:</strong> Both regions serve production traffic simultaneously. Users are routed to their nearest region by a global load balancer. Each region can accept writes, and changes are replicated bidirectionally. If one region fails, 100% of traffic shifts to the surviving region — no "failover" step needed at the application layer.</p>

<p><strong>RTO:</strong> Near-zero. DNS TTL of 30–60 seconds is often the only delay.<br>
<strong>RPO:</strong> Near-zero for synchronous replication, seconds for async replication.<br>
<strong>Cost:</strong> High. Full duplicate infrastructure in every active region. The data layer complexity is substantial — bidirectional replication introduces split-brain risks (covered in section 5).</p>

<div class="sd-widget" id="widget-model-compare">
  <h4>&#9654; Interactive: Active-Passive vs Active-Active</h4>

  <div class="sd-toggle-row">
    <label class="sd-toggle">
      <input type="checkbox" id="mr-failure-toggle">
      <span class="sd-toggle-slider"></span>
    </label>
    <span style="font-size:.88rem;">Simulate regional failure (US-East goes down)</span>
  </div>

  <div class="sd-two-col" style="margin-top:1rem;">
    <div>
      <div class="sd-label">Active-Passive</div>
      <div style="display:flex; flex-direction:column; gap:.6rem;">
        <div class="sd-region-box active" id="ap-primary">
          <div class="sd-region-label">Primary</div>
          <div class="sd-region-name">&#127482;&#127480; US-East</div>
          <div class="sd-region-status" id="ap-primary-status" style="color:#7bcdab;">&#9679; Serving 100% traffic</div>
        </div>
        <div class="sd-arrow">&#8681;</div>
        <div class="sd-region-box standby" id="ap-standby">
          <div class="sd-region-label">Standby</div>
          <div class="sd-region-name">&#127482;&#127480; US-West</div>
          <div class="sd-region-status" id="ap-standby-status" style="color:rgba(255,255,255,0.4);">&#9675; Receiving replicated data</div>
        </div>
      </div>
      <div style="margin-top:.9rem;">
        <div class="sd-label">RTO</div>
        <div class="sd-meter-wrap">
          <div class="sd-meter-bar"><div class="sd-meter-fill" id="ap-rto-fill" style="width:30%;background:#7bcdab;"></div></div>
          <div class="sd-meter-val" id="ap-rto-val">~60s</div>
        </div>
        <div class="sd-label">RPO</div>
        <div class="sd-meter-wrap">
          <div class="sd-meter-bar"><div class="sd-meter-fill" id="ap-rpo-fill" style="width:20%;background:#7bcdab;"></div></div>
          <div class="sd-meter-val" id="ap-rpo-val">~5s</div>
        </div>
        <div class="sd-label">Cost overhead</div>
        <div class="sd-meter-wrap">
          <div class="sd-meter-bar"><div class="sd-meter-fill" id="ap-cost-fill" style="width:35%;background:#fbef8a;"></div></div>
          <div class="sd-meter-val" id="ap-cost-val">+35%</div>
        </div>
      </div>
      <div id="ap-event-msg" style="margin-top:.7rem;font-size:.8rem;min-height:1.2rem;color:#fbef8a;"></div>
    </div>
    <div>
      <div class="sd-label">Active-Active</div>
      <div style="display:flex; flex-direction:column; gap:.6rem;">
        <div class="sd-region-box active" id="aa-east">
          <div class="sd-region-label">Region A</div>
          <div class="sd-region-name">&#127482;&#127480; US-East</div>
          <div class="sd-region-status" id="aa-east-status" style="color:#7bcdab;">&#9679; Serving 50% traffic</div>
        </div>
        <div class="sd-arrow">&#8651;</div>
        <div class="sd-region-box active" id="aa-west">
          <div class="sd-region-label">Region B</div>
          <div class="sd-region-name">&#127482;&#127480; US-West</div>
          <div class="sd-region-status" id="aa-west-status" style="color:#7bcdab;">&#9679; Serving 50% traffic</div>
        </div>
      </div>
      <div style="margin-top:.9rem;">
        <div class="sd-label">RTO</div>
        <div class="sd-meter-wrap">
          <div class="sd-meter-bar"><div class="sd-meter-fill" id="aa-rto-fill" style="width:8%;background:#7bcdab;"></div></div>
          <div class="sd-meter-val" id="aa-rto-val">~30s</div>
        </div>
        <div class="sd-label">RPO</div>
        <div class="sd-meter-wrap">
          <div class="sd-meter-bar"><div class="sd-meter-fill" id="aa-rpo-fill" style="width:5%;background:#7bcdab;"></div></div>
          <div class="sd-meter-val" id="aa-rpo-val">~1s</div>
        </div>
        <div class="sd-label">Cost overhead</div>
        <div class="sd-meter-wrap">
          <div class="sd-meter-bar"><div class="sd-meter-fill" id="aa-cost-fill" style="width:70%;background:#fbef8a;"></div></div>
          <div class="sd-meter-val" id="aa-cost-val">+70%</div>
        </div>
      </div>
      <div id="aa-event-msg" style="margin-top:.7rem;font-size:.8rem;min-height:1.2rem;color:#fbef8a;"></div>
    </div>
  </div>
</div>

<script>
(function() {
  var toggle = document.getElementById('mr-failure-toggle');
  if (!toggle) return;
  toggle.addEventListener('change', function() {
    var failed = this.checked;

    var apPrimary = document.getElementById('ap-primary');
    var apStandby = document.getElementById('ap-standby');
    var apPrimaryStatus = document.getElementById('ap-primary-status');
    var apStandbyStatus = document.getElementById('ap-standby-status');
    var apRtoFill = document.getElementById('ap-rto-fill');
    var apRtoVal  = document.getElementById('ap-rto-val');
    var apRpoFill = document.getElementById('ap-rpo-fill');
    var apRpoVal  = document.getElementById('ap-rpo-val');
    var apCostFill = document.getElementById('ap-cost-fill');
    var apCostVal  = document.getElementById('ap-cost-val');
    var apMsg      = document.getElementById('ap-event-msg');

    var aaEast = document.getElementById('aa-east');
    var aaWest = document.getElementById('aa-west');
    var aaEastStatus = document.getElementById('aa-east-status');
    var aaWestStatus = document.getElementById('aa-west-status');
    var aaRtoFill = document.getElementById('aa-rto-fill');
    var aaRtoVal  = document.getElementById('aa-rto-val');
    var aaRpoFill = document.getElementById('aa-rpo-fill');
    var aaRpoVal  = document.getElementById('aa-rpo-val');
    var aaCostFill = document.getElementById('aa-cost-fill');
    var aaCostVal  = document.getElementById('aa-cost-val');
    var aaMsg      = document.getElementById('aa-event-msg');

    if (failed) {
      apPrimary.className = 'sd-region-box dead';
      apStandby.className = 'sd-region-box promoted';
      apPrimaryStatus.innerHTML = '&#10005; DOWN — no traffic';
      apPrimaryStatus.style.color = '#e57373';
      apStandbyStatus.innerHTML = '&#9679; PROMOTED — serving 100% traffic';
      apStandbyStatus.style.color = '#fbef8a';
      apRtoFill.style.width = '60%';
      apRtoFill.style.background = '#fbef8a';
      apRtoVal.textContent = '30-90s';
      apRpoFill.style.width = '20%';
      apRpoFill.style.background = '#e57373';
      apRpoVal.textContent = '0-30s lost';
      apCostFill.style.width = '35%';
      apCostVal.textContent = '+35%';
      apMsg.textContent = 'Failover in progress: health checks, DNS propagation, replica promotion';

      aaEast.className = 'sd-region-box dead';
      aaWest.className = 'sd-region-box active';
      aaEastStatus.innerHTML = '&#10005; DOWN';
      aaEastStatus.style.color = '#e57373';
      aaWestStatus.innerHTML = '&#9679; Serving 100% traffic (auto-rerouted)';
      aaWestStatus.style.color = '#7bcdab';
      aaRtoFill.style.width = '8%';
      aaRtoFill.style.background = '#7bcdab';
      aaRtoVal.textContent = '~30s (DNS TTL)';
      aaRpoFill.style.width = '5%';
      aaRpoFill.style.background = '#7bcdab';
      aaRpoVal.textContent = '~1s';
      aaCostFill.style.width = '70%';
      aaCostVal.textContent = '+70%';
      aaMsg.textContent = 'No failover step needed — health check removes failed region from routing';
    } else {
      apPrimary.className = 'sd-region-box active';
      apStandby.className = 'sd-region-box standby';
      apPrimaryStatus.innerHTML = '&#9679; Serving 100% traffic';
      apPrimaryStatus.style.color = '#7bcdab';
      apStandbyStatus.innerHTML = '&#9675; Receiving replicated data';
      apStandbyStatus.style.color = 'rgba(255,255,255,0.4)';
      apRtoFill.style.width = '30%';
      apRtoFill.style.background = '#7bcdab';
      apRtoVal.textContent = '~60s';
      apRpoFill.style.width = '20%';
      apRpoFill.style.background = '#7bcdab';
      apRpoVal.textContent = '~5s';
      apCostFill.style.width = '35%';
      apCostVal.textContent = '+35%';
      apMsg.textContent = '';

      aaEast.className = 'sd-region-box active';
      aaWest.className = 'sd-region-box active';
      aaEastStatus.innerHTML = '&#9679; Serving 50% traffic';
      aaEastStatus.style.color = '#7bcdab';
      aaWestStatus.innerHTML = '&#9679; Serving 50% traffic';
      aaWestStatus.style.color = '#7bcdab';
      aaRtoFill.style.width = '8%';
      aaRtoFill.style.background = '#7bcdab';
      aaRtoVal.textContent = '~30s';
      aaRpoFill.style.width = '5%';
      aaRpoFill.style.background = '#7bcdab';
      aaRpoVal.textContent = '~1s';
      aaCostFill.style.width = '70%';
      aaCostVal.textContent = '+70%';
      aaMsg.textContent = '';
    }
  });
})();
</script>

---

<h2>3. DNS-based global routing</h2>

{: class="marginalia" }
DNS TTL is a double-edged sword. Low TTL (30s) means fast failover propagation but more DNS queries (cost, slight latency). High TTL (300s) means stale caches linger for 5 minutes after a failover event. 60 seconds is a pragmatic default for production failover systems.

<p>The entry point for all global traffic routing is DNS. Two services dominate this space: <strong>AWS Route 53</strong> and <strong>Cloudflare</strong>. Both support the routing policies you need for multi-region architectures.</p>

<h3>Latency-based routing</h3>

<p>When a user in Tokyo queries your domain, Route 53 measures the latency from various AWS regions to that user's resolver and returns the IP of the closest healthy region. This is not pure geographic routing — it is network-topology-aware. A user in Singapore might be routed to us-west-2 if their ISP's peering makes that faster than ap-southeast-1.</p>

<div class="sd-info-box">
  <strong>DNS routing diagram:</strong>
  <div style="margin-top:.7rem;">
    <div class="sd-dns-row"><span class="sd-dns-flag">&#127479;&#127484;</span> Tokyo user <span class="sd-dns-arrow">&#8594;</span> Route 53 <span class="sd-dns-arrow">&#8594;</span> <span class="sd-dns-region">ap-northeast-1 (Tokyo)</span></div>
    <div class="sd-dns-row"><span class="sd-dns-flag">&#127468;&#127463;</span> London user <span class="sd-dns-arrow">&#8594;</span> Route 53 <span class="sd-dns-arrow">&#8594;</span> <span class="sd-dns-region">eu-west-2 (London)</span></div>
    <div class="sd-dns-row"><span class="sd-dns-flag">&#127482;&#127480;</span> New York user <span class="sd-dns-arrow">&#8594;</span> Route 53 <span class="sd-dns-arrow">&#8594;</span> <span class="sd-dns-region">us-east-1 (N. Virginia)</span></div>
    <div class="sd-dns-row"><span class="sd-dns-flag">&#127482;&#127480;</span> Seattle user <span class="sd-dns-arrow">&#8594;</span> Route 53 <span class="sd-dns-arrow">&#8594;</span> <span class="sd-dns-region">us-west-2 (Oregon)</span></div>
  </div>
</div>

<h3>Health checks</h3>

<p>Route 53 health checks poll your <code>/health</code> endpoint every 10 seconds from multiple AWS edge locations. If 3 consecutive checks fail (meaning ~30 seconds of confirmed failure), Route 53 removes that region's DNS record from responses. Traffic automatically shifts to the next healthy region according to your fallback configuration.</p>

<p>Important design detail: your <code>/health</code> endpoint must be a <strong>deep health check</strong>. A surface-level HTTP 200 from a server that cannot reach its database is worse than useless — it will keep the unhealthy region in rotation. Your health check should verify connectivity to the database, any required caches, and any downstream dependencies.</p>

<pre class="code-block"><span class="cm">// Express.js: deep health check endpoint</span>
<span class="id">app</span><span class="op">.</span><span class="fn">get</span>(<span class="str">'/health'</span>, <span class="kw">async</span> (<span class="id">req</span>, <span class="id">res</span>) <span class="op">=></span> {
  <span class="kw">try</span> {
    <span class="cm">// Check DB connectivity</span>
    <span class="kw">await</span> <span class="id">db</span><span class="op">.</span><span class="fn">raw</span>(<span class="str">'SELECT 1'</span>);

    <span class="cm">// Check Redis connectivity</span>
    <span class="kw">await</span> <span class="id">redis</span><span class="op">.</span><span class="fn">ping</span>();

    <span class="cm">// Check replication lag is acceptable (< 30s)</span>
    <span class="kw">const</span> <span class="id">lag</span> <span class="op">=</span> <span class="kw">await</span> <span class="fn">getReplicationLagSeconds</span>();
    <span class="kw">if</span> (<span class="id">lag</span> <span class="op">></span> <span class="num">30</span>) <span class="kw">throw</span> <span class="kw">new</span> <span class="ty">Error</span>(<span class="str">'Replication lag critical: '</span> <span class="op">+</span> <span class="id">lag</span> <span class="op">+</span> <span class="str">'s'</span>);

    <span class="id">res</span><span class="op">.</span><span class="fn">json</span>({ <span class="id">status</span>: <span class="str">'ok'</span>, <span class="id">region</span>: <span class="id">process</span><span class="op">.</span><span class="id">env</span><span class="op">.</span><span class="id">AWS_REGION</span>, <span class="id">lag</span> });
  } <span class="kw">catch</span> (<span class="id">err</span>) {
    <span class="id">res</span><span class="op">.</span><span class="fn">status</span>(<span class="num">503</span>)<span class="op">.</span><span class="fn">json</span>({ <span class="id">status</span>: <span class="str">'unhealthy'</span>, <span class="id">error</span>: <span class="id">err</span><span class="op">.</span><span class="id">message</span> });
  }
});</pre>

<h3>Failover DNS records</h3>

<p>Route 53 supports a <strong>failover routing policy</strong> with explicit primary and secondary records. When the primary health check fails, Route 53 automatically serves the secondary record. This is the Active-Passive mechanism at the DNS layer.</p>

<pre class="code-block"><span class="cm"># Terraform: Route 53 failover configuration</span>
<span class="kw">resource</span> <span class="str">"aws_route53_record"</span> <span class="str">"primary"</span> {
  <span class="id">zone_id</span>         <span class="op">=</span> <span class="id">aws_route53_zone</span><span class="op">.</span><span class="id">main</span><span class="op">.</span><span class="id">zone_id</span>
  <span class="id">name</span>            <span class="op">=</span> <span class="str">"api.example.com"</span>
  <span class="id">type</span>            <span class="op">=</span> <span class="str">"A"</span>
  <span class="id">set_identifier</span> <span class="op">=</span> <span class="str">"primary"</span>
  <span class="id">ttl</span>             <span class="op">=</span> <span class="num">60</span>
  <span class="id">records</span>         <span class="op">=</span> [<span class="str">"52.1.2.3"</span>]  <span class="cm"># US-East ALB</span>

  <span class="kw">failover_routing_policy</span> { <span class="id">type</span> <span class="op">=</span> <span class="str">"PRIMARY"</span> }
  <span class="id">health_check_id</span> <span class="op">=</span> <span class="id">aws_route53_health_check</span><span class="op">.</span><span class="id">us_east</span><span class="op">.</span><span class="id">id</span>
}

<span class="kw">resource</span> <span class="str">"aws_route53_record"</span> <span class="str">"secondary"</span> {
  <span class="id">zone_id</span>         <span class="op">=</span> <span class="id">aws_route53_zone</span><span class="op">.</span><span class="id">main</span><span class="op">.</span><span class="id">zone_id</span>
  <span class="id">name</span>            <span class="op">=</span> <span class="str">"api.example.com"</span>
  <span class="id">type</span>            <span class="op">=</span> <span class="str">"A"</span>
  <span class="id">set_identifier</span> <span class="op">=</span> <span class="str">"secondary"</span>
  <span class="id">ttl</span>             <span class="op">=</span> <span class="num">60</span>
  <span class="id">records</span>         <span class="op">=</span> [<span class="str">"54.4.5.6"</span>]  <span class="cm"># US-West ALB</span>

  <span class="kw">failover_routing_policy</span> { <span class="id">type</span> <span class="op">=</span> <span class="str">"SECONDARY"</span> }
  <span class="cm"># No health check needed — only activated when primary fails</span>
}</pre>

---

<h2>4. Database replication strategies</h2>

{: class="marginalia" }
Netflix's chaos engineering practice — Chaos Monkey, Chaos Kong (which kills entire AWS regions) — was born from a 2008 database corruption incident that took Netflix down for 3 days. They decided the only way to build resilience was to continuously inject failure in production.

<p>Replicating stateless application servers across regions is trivial — deploy more EC2 instances. The database layer is where multi-region architecture gets genuinely difficult. Every strategy involves a trade-off between consistency, latency, and complexity.</p>

<h3>Read replicas (easy win)</h3>

<p>Read replicas solve the latency problem for read-heavy workloads. Deploy a read replica in each region. Local users get sub-10ms read latency. Writes still route to the primary region. Replication lag means replicas may serve slightly stale data — acceptable for most read paths.</p>

<h3>Cross-region replication options</h3>

<table class="sd-table">
  <thead><tr><th>Technology</th><th>Replication lag</th><th>Consistency</th><th>Auto failover</th><th>Cost</th></tr></thead>
  <tbody>
    <tr><td>MySQL GTID async replication</td><td>10–100ms</td><td>Eventually consistent</td><td>Manual / MHA</td><td>Low</td></tr>
    <tr><td>PostgreSQL logical replication</td><td>10–200ms</td><td>Eventually consistent</td><td>Manual / Patroni</td><td>Low</td></tr>
    <tr><td>Aurora Global Database</td><td>&lt; 1s</td><td>Eventually consistent</td><td>Automated (~1min)</td><td>Medium</td></tr>
    <tr><td>CockroachDB multi-region</td><td>Synchronous</td><td>Serializable</td><td>Automatic</td><td>High</td></tr>
    <tr><td>Google Spanner</td><td>Synchronous</td><td>External consistency</td><td>Automatic</td><td>Very high</td></tr>
  </tbody>
</table>

<p><strong>Aurora Global Database</strong> is the pragmatic choice for AWS-based architectures. It replicates at the storage level (not at the SQL layer), achieves sub-1-second lag globally, and supports automated failover in under 1 minute with no data loss for the synchronous portion of writes.</p>

<p><strong>CockroachDB and Spanner</strong> offer synchronous multi-region writes with strong consistency guarantees. The cost is write latency: a write must be acknowledged by quorum across regions before returning to the caller. If US-East and EU-West are 80ms apart, writes take at minimum 80ms round-trip. This is often acceptable for financial or inventory systems but not for high-frequency user activity.</p>

<div class="sd-widget" id="widget-replication">
  <h4>&#9654; Replication lag visualizer</h4>

  <div style="margin-bottom:.9rem;">
    <div class="sd-label">Simulated network lag: <span id="lag-val-display">50ms</span></div>
    <input type="range" id="lag-slider" min="10" max="5000" value="50"
      style="width:100%;accent-color:#7bcdab;cursor:pointer;margin-bottom:.5rem;">
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
      <button class="sd-btn" id="btn-spike">Inject lag spike</button>
      <button class="sd-btn" id="btn-primary-fail">Fail primary</button>
      <button class="sd-btn" id="btn-repl-reset">Reset</button>
    </div>
  </div>

  <div class="sd-db-row">
    <div class="sd-db-node primary" id="db-primary">
      <div class="sd-db-icon">&#128452;</div>
      <div class="sd-db-lbl">Primary</div>
      <div class="sd-db-name">US-East</div>
      <div style="font-size:.75rem;color:rgba(255,255,255,0.5);margin-top:.3rem;" id="db-primary-state">Accepting writes</div>
    </div>
    <div style="display:flex;align-items:center;padding:0 .5rem;">
      <div>
        <div style="font-size:.7rem;color:rgba(255,255,255,0.4);text-align:center;margin-bottom:.2rem;">WAL stream</div>
        <div style="font-size:1.2rem;color:#7bcdab;" id="repl-arrow">&#10230;</div>
        <div id="repl-packet-area" style="text-align:center;height:16px;"></div>
      </div>
    </div>
    <div class="sd-db-node replica" id="db-replica">
      <div class="sd-db-icon">&#128452;</div>
      <div class="sd-db-lbl">Replica</div>
      <div class="sd-db-name">EU-West</div>
      <div style="font-size:.75rem;color:rgba(255,255,255,0.5);margin-top:.3rem;" id="db-replica-state">Read-only</div>
    </div>
  </div>

  <div class="sd-lag-bar-wrap">
    <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;">
      <span class="sd-label" style="margin:0;">Replication lag</span>
      <span id="lag-badge" class="sd-lag-badge">50ms</span>
    </div>
    <div class="sd-lag-bar-outer">
      <div class="sd-lag-bar-inner" id="lag-bar" style="width:1%;"></div>
    </div>
  </div>

  <div id="repl-status-msg" style="font-size:.82rem;color:rgba(255,255,255,0.6);min-height:1.4rem;margin-top:.4rem;"></div>
</div>

<script>
(function() {
  var slider       = document.getElementById('lag-slider');
  var lagDisplay   = document.getElementById('lag-val-display');
  var lagBadge     = document.getElementById('lag-badge');
  var lagBar       = document.getElementById('lag-bar');
  var btnSpike     = document.getElementById('btn-spike');
  var btnFail      = document.getElementById('btn-primary-fail');
  var btnReset     = document.getElementById('btn-repl-reset');
  var statusMsg    = document.getElementById('repl-status-msg');
  var dbPrimary    = document.getElementById('db-primary');
  var dbReplica    = document.getElementById('db-replica');
  var dbPrimState  = document.getElementById('db-primary-state');
  var dbReplState  = document.getElementById('db-replica-state');
  var replArrow    = document.getElementById('repl-arrow');

  if (!slider) return;

  var spiked  = false;
  var failed  = false;

  function lagToWidth(ms) {
    var pct = Math.min(100, (Math.log10(ms) - 1) / (Math.log10(5000) - 1) * 100);
    return Math.max(1, pct);
  }

  function updateLagUI(ms) {
    var w = lagToWidth(ms);
    lagBar.style.width = w + '%';

    var label, cls;
    if (ms < 100)       { label = ms + 'ms';  cls = ''; lagBar.style.background = '#7bcdab'; }
    else if (ms < 1000) { label = ms + 'ms';  cls = 'warn'; lagBar.style.background = '#fbef8a'; }
    else                { label = (ms/1000).toFixed(1) + 's'; cls = 'danger'; lagBar.style.background = '#e57373'; }

    lagBadge.textContent = label;
    lagBadge.className = 'sd-lag-badge' + (cls ? ' ' + cls : '');

    if (ms >= 1000) {
      statusMsg.textContent = 'Warning: replica is ' + (ms/1000).toFixed(1) + 's behind primary. RPO risk is growing.';
      statusMsg.style.color = '#e57373';
    } else if (ms >= 100) {
      statusMsg.textContent = 'Elevated lag detected. Monitor closely.';
      statusMsg.style.color = '#fbef8a';
    } else {
      statusMsg.textContent = 'Replication healthy. Replica is ' + ms + 'ms behind primary.';
      statusMsg.style.color = 'rgba(255,255,255,0.6)';
    }
  }

  slider.addEventListener('input', function() {
    lagDisplay.textContent = this.value + 'ms';
    if (!spiked && !failed) updateLagUI(parseInt(this.value));
  });

  btnSpike.addEventListener('click', function() {
    if (failed) return;
    spiked = true;
    var peak = 4200;
    lagDisplay.textContent = peak + 'ms';
    updateLagUI(peak);
    statusMsg.textContent = 'Network lag spike! Replication queue is backing up.';
    statusMsg.style.color = '#fbef8a';
    setTimeout(function() {
      spiked = false;
      var cur = parseInt(slider.value);
      lagDisplay.textContent = cur + 'ms';
      updateLagUI(cur);
    }, 3500);
  });

  btnFail.addEventListener('click', function() {
    if (failed) return;
    failed = true;
    dbPrimary.className = 'sd-db-node';
    dbPrimary.style.borderColor = '#e57373';
    dbPrimary.style.opacity = '0.45';
    dbPrimState.textContent = 'DOWN';
    dbPrimState.style.color = '#e57373';
    replArrow.style.color = '#555';
    updateLagUI(0);
    lagBadge.textContent = 'N/A';
    lagBadge.className = 'sd-lag-badge';
    lagBar.style.width = '0%';
    statusMsg.textContent = 'Primary failed! Promoting replica to primary... (Aurora: ~60s)';
    statusMsg.style.color = '#fbef8a';
    setTimeout(function() {
      dbReplica.className = 'sd-db-node promoted';
      dbReplState.textContent = 'PROMOTED — now primary';
      dbReplState.style.color = '#fbef8a';
      statusMsg.textContent = 'Promotion complete. EU-West is now the primary. Data at moment of failure may be lost (RPO window).';
    }, 3000);
  });

  btnReset.addEventListener('click', function() {
    spiked = false;
    failed = false;
    dbPrimary.className = 'sd-db-node primary';
    dbPrimary.style.borderColor = '';
    dbPrimary.style.opacity = '';
    dbPrimState.textContent = 'Accepting writes';
    dbPrimState.style.color = '';
    dbReplica.className = 'sd-db-node replica';
    dbReplState.textContent = 'Read-only';
    dbReplState.style.color = '';
    replArrow.style.color = '#7bcdab';
    slider.value = 50;
    lagDisplay.textContent = '50ms';
    updateLagUI(50);
  });

  updateLagUI(50);
})();
</script>

---

<h2>5. The split-brain problem</h2>

<p>Split-brain is the distributed systems nightmare: two nodes, both believing they are the authoritative primary, simultaneously accepting conflicting writes.</p>

<p>In an active-active setup with async replication: US-East accepts a write that changes user Bob's email to <code>bob@newdomain.com</code>. EU-West, one second later, accepts a write that changes Bob's email to <code>bob@work.com</code>. A network partition prevents these changes from syncing. When the partition heals, which write wins?</p>

<p>The problem is not merely theoretical. Cassandra, DynamoDB, and MongoDB all have configurable consistency levels precisely because they have encountered this reality at scale.</p>

<h3>Conflict resolution strategies</h3>

<p><strong>Last-write-wins (LWW).</strong> Each write is timestamped. On conflict, the write with the later timestamp wins. Simple to implement, but silently discards data. Clock skew between servers (even with NTP, typically 1–10ms) can cause the wrong write to win.</p>

<p><strong>Vector clocks / causal consistency.</strong> Each write carries a vector of version counters per node. Causally related writes can be ordered; concurrent writes are detected and flagged for resolution. Used by Amazon Dynamo, Riak. Complex to implement but provides semantic conflict detection rather than silent data loss.</p>

<p><strong>CRDT-based merges.</strong> Conflict-free Replicated Data Types are data structures mathematically guaranteed to merge without conflicts. Counters, sets, and maps have CRDT implementations. Shopping cart contents can be merged; a "delete item" operation needs careful handling (tombstones). Redis CRDT and Riak use this approach.</p>

<p><strong>Region affinity / geo-partitioning.</strong> Assign each data partition to an owning region. User records for EU users are owned by EU-West; user records for US users are owned by US-East. Each region is authoritative for its own partition. No cross-region write conflicts for normal operations. Reads can be served from any region via replication. This is CockroachDB's geo-partitioned replicas model.</p>

<div class="sd-warn-box">
  <strong>Practical advice for interviews:</strong> When asked about active-active, acknowledge split-brain immediately. Explain that most production systems either (a) avoid it by making one region authoritative for each data shard, or (b) accept eventual consistency for non-critical data and use conflict resolution for everything else. Very few teams implement true bidirectional write conflict resolution — the operational complexity is immense.
</div>

---

<h2>6. The failover runbook — animated</h2>

{: class="marginalia" }
The difference between RTO and RPO is subtle but critical. RTO is how long the system is down — a business and SLA question. RPO is how much data can be lost — a data integrity question. A system with RTO=5min and RPO=1hr might recover quickly but lose an hour of orders. Both numbers must be agreed with the business, not just engineering.

<p>Understanding the theory is one thing. Knowing the exact sequence of events during a real failover — and where the gaps are — is what separates a good answer from a great one.</p>

<div class="sd-widget" id="widget-failover-tl">
  <h4>&#9654; Failover timeline — US-East failure</h4>

  <div style="margin-bottom:1rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
    <button class="sd-btn" id="tl-start-btn">&#9654; Start simulation</button>
    <button class="sd-btn" id="tl-reset-btn">&#8635; Reset</button>
    <span id="tl-clock" style="font-size:.82rem;color:rgba(255,255,255,0.45);margin-left:.5rem;">T+0s</span>
  </div>

  <div id="tl-steps">
    <div class="sd-tl-step" id="tl-0">
      <div class="sd-tl-dot">1</div>
      <div class="sd-tl-body">
        <div class="sd-tl-title">US-East stops responding</div>
        <div class="sd-tl-time">T+0s</div>
        <div class="sd-tl-note">Power failure, network partition, or catastrophic deployment. All health checks begin failing.</div>
      </div>
    </div>
    <div class="sd-tl-step" id="tl-1">
      <div class="sd-tl-dot">2</div>
      <div class="sd-tl-body">
        <div class="sd-tl-title">Health checks failing (×1, ×2)</div>
        <div class="sd-tl-time">T+10s — T+20s</div>
        <div class="sd-tl-note">Route 53 checks from multiple edge locations. Two failures not yet sufficient to trigger failover — transient blips are common.</div>
      </div>
    </div>
    <div class="sd-tl-step" id="tl-2">
      <div class="sd-tl-dot">3</div>
      <div class="sd-tl-body">
        <div class="sd-tl-title">3rd consecutive failure — DNS failover triggered</div>
        <div class="sd-tl-time">T+30s</div>
        <div class="sd-tl-note">Route 53 removes US-East from DNS responses. New DNS queries resolve to US-West. Existing connections still hitting US-East.</div>
      </div>
    </div>
    <div class="sd-tl-step" id="tl-3">
      <div class="sd-tl-dot">4</div>
      <div class="sd-tl-body">
        <div class="sd-tl-title">Aurora replica promotion begins</div>
        <div class="sd-tl-time">T+30s (parallel)</div>
        <div class="sd-tl-note">Aurora Global Database detects loss of primary write endpoint. Begins promoting US-West replica. Applies any buffered WAL changes.</div>
      </div>
    </div>
    <div class="sd-tl-step" id="tl-4">
      <div class="sd-tl-dot">5</div>
      <div class="sd-tl-body">
        <div class="sd-tl-title">DNS TTL expires — clients re-resolve</div>
        <div class="sd-tl-time">T+30s — T+90s</div>
        <div class="sd-tl-note">Clients cached the old DNS record. As their 60s TTL expires, they re-query and receive the US-West IP. This is the "dark window" where requests fail.</div>
      </div>
    </div>
    <div class="sd-tl-step" id="tl-5">
      <div class="sd-tl-dot">6</div>
      <div class="sd-tl-body">
        <div class="sd-tl-title">Aurora promotion complete — US-West accepts writes</div>
        <div class="sd-tl-time">T+60s — T+90s</div>
        <div class="sd-tl-note">US-West replica is now the primary. Any writes made to US-East after the last replicated transaction are lost (RPO window).</div>
      </div>
    </div>
    <div class="sd-tl-step" id="tl-6">
      <div class="sd-tl-dot">7</div>
      <div class="sd-tl-body">
        <div class="sd-tl-title">Traffic fully on US-West — PagerDuty fires</div>
        <div class="sd-tl-time">T+90s — T+120s</div>
        <div class="sd-tl-note">Most clients now hitting US-West. Error rate returns to baseline. On-call engineers paged. Incident response begins.</div>
      </div>
    </div>
    <div class="sd-tl-step" id="tl-7">
      <div class="sd-tl-dot">8</div>
      <div class="sd-tl-body">
        <div class="sd-tl-title">US-East recovers — re-sync and re-add</div>
        <div class="sd-tl-time">T+N minutes</div>
        <div class="sd-tl-note">US-East comes back online. It must re-sync from US-West (now primary) before being re-added to DNS. Rush to re-add can cause a second failover if US-East is still unstable.</div>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  var startBtn = document.getElementById('tl-start-btn');
  var resetBtn = document.getElementById('tl-reset-btn');
  var clock    = document.getElementById('tl-clock');
  if (!startBtn) return;

  var steps    = [0,1,2,3,4,5,6,7];
  var delays   = [0, 1200, 2400, 3600, 4800, 6000, 7200, 8400];
  var labels   = ['T+0s','T+10s','T+20s','T+30s','T+60s','T+90s','T+120s','T+N min'];
  var running  = false;
  var timers   = [];

  function resetAll() {
    timers.forEach(function(t) { clearTimeout(t); });
    timers = [];
    running = false;
    steps.forEach(function(i) {
      var el = document.getElementById('tl-' + i);
      if (el) el.className = 'sd-tl-step';
    });
    clock.textContent = 'T+0s';
    startBtn.disabled = false;
  }

  startBtn.addEventListener('click', function() {
    if (running) return;
    running = true;
    startBtn.disabled = true;
    steps.forEach(function(i) {
      var t = setTimeout(function() {
        var prev = document.getElementById('tl-' + (i - 1));
        if (prev) prev.className = 'sd-tl-step done';
        var el = document.getElementById('tl-' + i);
        if (el) el.className = 'sd-tl-step active';
        clock.textContent = labels[i];
      }, delays[i]);
      timers.push(t);
    });
    var finalT = setTimeout(function() {
      var last = document.getElementById('tl-7');
      if (last) last.className = 'sd-tl-step done';
      running = false;
    }, delays[delays.length - 1] + 1200);
    timers.push(finalT);
  });

  resetBtn.addEventListener('click', resetAll);
})();
</script>

---

<h2>7. Stateless vs stateful services</h2>

<p>The reason multi-region is complex is that stateful services cannot simply be cloned. Here is the full inventory of stateful components in a typical web application and the recommended strategy for each.</p>

<table class="sd-table">
  <thead><tr><th>Service</th><th>Multi-region strategy</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Application servers (Node, Java, Go)</td><td>Deploy identical copies in each region behind regional ALBs</td><td>Trivial. Keep truly stateless — no in-process session state.</td></tr>
    <tr><td>PostgreSQL / MySQL</td><td>Aurora Global Database (async, &lt;1s lag)</td><td>Best managed option on AWS. Failover in ~60s.</td></tr>
    <tr><td>Redis / session cache</td><td>ElastiCache Global Datastore</td><td>Async replication. On failover, some sessions expire — users re-login. Design for this.</td></tr>
    <tr><td>S3 / object storage</td><td>Cross-Region Replication (CRR)</td><td>Async. New objects replicate within minutes. Existing objects need a one-time copy job.</td></tr>
    <tr><td>Elasticsearch / OpenSearch</td><td>Cross-Cluster Replication (CCR)</td><td>Follower index in each region. Reads from local, writes to primary.</td></tr>
    <tr><td>Kafka / event streams</td><td>MirrorMaker 2.0</td><td>Replicates topic partitions across clusters. Consumer offsets translated.</td></tr>
    <tr><td>Scheduled jobs / cron</td><td>Leader-election: only one region runs jobs</td><td>Use a distributed lock (DynamoDB conditional writes, Redis SETNX) to elect the primary scheduler.</td></tr>
  </tbody>
</table>

<p>A special case worth discussing: <strong>user session state</strong>. If you store session data in Redis and your Redis Global Datastore has async replication lag, a failover event means some recently-authenticated users lose their sessions. They see a logged-out screen. This is acceptable in most products — it is a minor annoyance, not data loss. Design your application to handle it gracefully: clear error messages, redirect to login.</p>

<p>Worse would be storing any financial transaction state in a session. Never do this. All durable state must live in the database, not in cache.</p>

---

<h2>8. Chaos engineering — testing your failover</h2>

<p>The most dangerous failure mode in a multi-region architecture is believing your failover works without having tested it under realistic conditions. Runbooks become stale. Configuration drift happens. A health check endpoint gets accidentally broken in a deploy.</p>

<p>Chaos engineering is the practice of deliberately injecting failures into production systems to verify their resilience. The foundational principle: if you do not test your failure scenarios regularly, you will discover them for the first time during an actual incident.</p>

<h3>GameDay exercises</h3>

<p>A GameDay is a scheduled, coordinated exercise where engineers deliberately take down a region, service, or dependency during low-traffic hours (typically 2–4 AM). The team practices the entire incident response flow: detection, communication, diagnosis, failover execution, and recovery. Lessons learned feed back into the runbook.</p>

<h3>Netflix Chaos Monkey</h3>

<p>Netflix's Chaos Monkey tool randomly terminates EC2 instances in their production environment during business hours. The rationale: if an instance can be lost at any moment, every service must be built to survive it. Chaos Kong goes further — it terminates entire availability zones or entire AWS regions on a schedule.</p>

<pre class="code-block"><span class="cm"># Chaos Mesh (Kubernetes) — network partition experiment</span>
<span class="kw">apiVersion</span>: chaos-mesh.org/v1alpha1
<span class="kw">kind</span>: NetworkChaos
<span class="kw">metadata</span>:
  <span class="id">name</span>: partition-us-east
  <span class="id">namespace</span>: default
<span class="kw">spec</span>:
  <span class="id">action</span>: partition
  <span class="id">mode</span>: all
  <span class="id">selector</span>:
    <span class="id">namespaces</span>: [<span class="str">"production"</span>]
    <span class="id">labelSelectors</span>:
      <span class="str">"region"</span>: <span class="str">"us-east-1"</span>
  <span class="id">direction</span>: both
  <span class="id">duration</span>: <span class="str">"2m"</span>   <span class="cm"># Partition lasts 2 minutes</span></pre>

<p><strong>AWS Fault Injection Simulator (FIS)</strong> is the managed alternative — it provides pre-built templates for injecting EC2 failures, RDS failovers, and network disruptions, with safety guardrails to prevent runaway experiments.</p>

<div class="sd-info-box">
  The only way to know your failover works is to exercise it regularly. A runbook that has never been executed under pressure is a hypothesis, not a plan.
</div>

---

<h2>9. Capacity planning and cost</h2>

<p>Multi-region is not free. Interviewers frequently ask about cost implications, and "it's expensive" is not a sufficient answer. You should be able to reason about the magnitude.</p>

<table class="sd-table">
  <thead><tr><th>Component</th><th>Cost model</th><th>Rough estimate</th></tr></thead>
  <tbody>
    <tr><td>Duplicate API server fleet (active-passive standby)</td><td>Reduced-capacity standby: ~30% of primary fleet</td><td>+30% compute cost</td></tr>
    <tr><td>Aurora Global Database replication</td><td>Per-GB replicated data transferred</td><td>~$0.20/GB across regions</td></tr>
    <tr><td>Route 53 health checks</td><td>Per health check per month</td><td>$0.50/check/month</td></tr>
    <tr><td>Cross-region data transfer (API responses)</td><td>Per-GB egress to other regions</td><td>~$0.02/GB</td></tr>
    <tr><td>S3 Cross-Region Replication</td><td>Per-request + per-GB</td><td>~$0.005/1000 requests + $0.02/GB</td></tr>
    <tr><td>ElastiCache Global Datastore replication</td><td>Per-GB replicated</td><td>~$0.20/GB</td></tr>
  </tbody>
</table>

<p>For a mid-size application running $10,000/month in a single region, expect active-passive multi-region to add 35–45% overhead (~$3,500–$4,500/month). Active-active with full duplicate capacity adds 70–100%.</p>

<p>The cost question always leads to: <strong>what is the cost of downtime?</strong> For a $1M/hour revenue business, 90 seconds of outage costs $25,000. Multi-region at $4,000/month ($48,000/year) easily justifies itself even at a single major outage per year. For a $10,000/month revenue business, the math is different — a read replica for latency plus a manual failover runbook may be sufficient.</p>

---

<h2>10. Putting it all together: the reference architecture</h2>

<p>Given the interview question — survive US-East failure, serve Asia under 100ms, US-West takes over in 30 seconds — here is the concrete architecture recommendation:</p>

<p><strong>Three active regions:</strong> us-east-1 (primary), us-west-2 (hot standby / secondary), ap-northeast-1 (Tokyo, read-only replica for APAC latency).</p>

<p><strong>DNS:</strong> Route 53 with latency-based routing. Health checks every 10 seconds, failover threshold 3×. TTL 60 seconds. Tokyo region serves APAC reads; US regions serve writes. All write requests for APAC users are proxied back to US-East over the private AWS backbone (~80ms, acceptable for writes).</p>

<p><strong>Database:</strong> Aurora Global Database with us-east-1 as write primary, us-west-2 and ap-northeast-1 as read replicas. Automated failover to us-west-2 on primary failure (&lt;60s). APAC replica used only for reads — no writes, no promotion risk.</p>

<p><strong>Cache:</strong> ElastiCache Global Datastore. Accept that some sessions will expire on failover. Build graceful re-authentication UX.</p>

<p><strong>Object storage:</strong> S3 with CRR enabled to all three regions. Use S3 Transfer Acceleration for user uploads to minimize cross-region latency.</p>

<p><strong>Chaos engineering:</strong> Monthly GameDay exercises failing us-east-1. Quarterly full-region Chaos Kong exercise.</p>

<pre class="code-block"><span class="cm"># Summary: RTO/RPO targets vs achieved</span>

<span class="cm"># Target</span>
<span class="id">RTO</span>: <span class="num">30</span> seconds
<span class="id">RPO</span>: <span class="num">0</span> seconds (no data loss)

<span class="cm"># Achieved with Aurora Global + Route 53</span>
<span class="id">RTO</span>: <span class="num">60</span>-<span class="num">90</span> seconds  <span class="cm"># DNS TTL 60s + Aurora promotion 60s, some overlap</span>
<span class="id">RPO</span>: <span class="num">0</span>-<span class="num">5</span> seconds    <span class="cm"># Aurora Global replication lag at moment of failure</span>

<span class="cm"># To achieve strict 30s RTO:</span>
<span class="cm">#   - Reduce DNS TTL to 30s (higher DNS cost, more queries)</span>
<span class="cm">#   - Pre-warm standby connections (keep app servers hot, not idle)</span>
<span class="cm">#   - Use Aurora Global "managed planned failover" for DNS-independent switchover</span>

<span class="cm"># To achieve strict 0s RPO:</span>
<span class="cm">#   - Switch to CockroachDB or Spanner (synchronous multi-region writes)</span>
<span class="cm">#   - Accept ~80ms write latency penalty (round-trip to quorum)</span></pre>

<h3>Trade-off framing for the interview</h3>

<p>End with the trade-offs clearly articulated. An interviewer is not looking for a perfect system — they are looking for a candidate who understands that every architectural decision is a trade-off, and who can reason about those trade-offs explicitly.</p>

<p>For this architecture: we chose active-passive over active-active because it avoids split-brain complexity at lower cost. We accepted 60–90 seconds RTO instead of the target 30 seconds because Aurora Global promotion takes time — reducing this further requires synchronous replication and its associated write latency cost. We accepted near-zero (not absolute zero) RPO because synchronous replication would add 80ms+ to every write operation — unacceptable for interactive web traffic. These are business trade-offs, not engineering failures.</p>

</div>