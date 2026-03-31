---
layout: post
title: "System Design: Distributed Transactions — 2PC, Saga Pattern, and Event Sourcing"
date: 2026-05-17 10:00:00 +0000
categories: ["post"]
tags: [system-design, transactions, saga, event-sourcing, distributed-systems, interview]
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design Interview Prep &mdash; #14 of 15
</div>

{: class="marginalia" }
**2PC was invented for<br/>distributed databases<br/>in the 1970s.** It works,<br/>but the coordinator<br/>crash problem is why<br/>modern microservices<br/>almost universally<br/>prefer Sagas instead.

An e-commerce checkout looks simple from the outside: click *Buy*, get a confirmation email. Under the hood, that single user action touches four completely independent microservices — Payment, Inventory, Shipment, and Notification — each with its own database, its own failure modes, and zero awareness of what the others are doing. Keeping them consistent is one of the hardest unsolved problems in distributed systems.

**The question:** *An e-commerce order involves charging the payment, reserving inventory, creating a shipment record, and sending a confirmation email — across 4 microservices with 4 separate databases. How do you ensure all succeed or all roll back?*

---

<style>
.series-badge { display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem; }
.series-badge strong { color:#fbef8a; }

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
.viz-btn.danger { border-color:#f08080;color:#f08080; }
.viz-btn.danger:hover { background:#2a1616; }
</style>

## 1. The Problem with Distributed State

In a single relational database, ACID guarantees are free:

- **Atomicity** — either all rows update or none do
- **Consistency** — constraints are always valid
- **Isolation** — concurrent transactions don't see each other's partial writes
- **Durability** — committed data survives crashes

Across microservices, none of these guarantees exist. Each service owns its own database. There is no shared transaction manager. The network between services is unreliable. A service can crash at any moment.

The failure scenario is concrete: Payment service charges the customer's card ✓, then the Inventory service crashes mid-reservation. The customer is charged. No order is placed. Support tickets flood in.

<div class="callout callout-red">
<strong>The core tension:</strong> You need atomicity across boundaries that were explicitly designed to be independent. Every solution is a trade-off between consistency, availability, latency, and complexity.
</div>

---

## 2. Level 1 — The Naïve Approach (Wrong Answer)

The first instinct is to just call services sequentially:

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">place_order</span>(order):
    <span class="cm"># Step 1: charge payment</span>
    payment_result = payment_service.<span class="fn">charge</span>(order.user_id, order.amount)

    <span class="cm"># Step 2: reserve inventory  ← what if this crashes?</span>
    inventory_result = inventory_service.<span class="fn">reserve</span>(order.items)

    <span class="cm"># Step 3: create shipment  ← what if THIS crashes?</span>
    shipment_result = shipment_service.<span class="fn">create</span>(order)

    <span class="cm"># Step 4: send confirmation email</span>
    email_service.<span class="fn">send_confirmation</span>(order.user_id, order.id)

    <span class="kw">return</span> <span class="st">"order placed"</span></pre>
</div>

There is no error handling. There is no rollback. If `inventory_service.reserve()` raises a network timeout, the payment is gone and no one knows. If `shipment_service.create()` fails after inventory is reserved, you now have reserved stock for an order that doesn't exist.

**This is unacceptable in any financial system.** In a real interview, naming this anti-pattern early and immediately moving to solutions is a strong signal.

---

## 3. Level 2 — Two-Phase Commit (2PC)

2PC introduces a **coordinator** that orchestrates a two-round protocol across all participants:

**Phase 1 — Prepare:** The coordinator asks every participant: "Can you commit this transaction?" Each participant locks its resources, writes to a redo log, and votes YES or NO. Crucially, a YES vote is a *promise* — the participant guarantees it can commit if asked.

**Phase 2 — Commit or Rollback:** If every participant voted YES, the coordinator sends COMMIT to all. If any voted NO (or timed out), the coordinator sends ROLLBACK to all. Only once the coordinator gets acknowledgements from everyone does the transaction complete.

<div class="viz-wrap">
<div class="viz-title">Interactive 2PC Visualizer</div>
<div class="viz-controls">
  <button class="viz-btn" id="btn2pcRun" onclick="run2PC()">▶ Run 2PC</button>
  <button class="viz-btn" id="btn2pcFail" onclick="toggle2PCFail()">⚡ Inject Failure</button>
  <button class="viz-btn danger" id="btn2pcCrash" onclick="crash2PCCoordinator()">💀 Crash Coordinator</button>
  <button class="viz-btn" onclick="reset2PC()">↺ Reset</button>
</div>
<div id="twopc-canvas" style="position:relative;height:360px;"></div>
<div id="twopc-log" style="margin-top:.8rem;font-size:.75rem;color:rgba(255,255,255,.5);font-family:monospace;min-height:3em;max-height:5em;overflow-y:auto;background:#0d0e10;border-radius:6px;padding:.5rem .8rem;"></div>
</div>

<script>
(function() {
  var failMode = false;
  var animating = false;

  function getCanvas() { return document.getElementById('twopc-canvas'); }
  function getLog()    { return document.getElementById('twopc-log'); }

  function log2pc(msg) {
    var el = getLog();
    el.innerHTML += msg + '<br>';
    el.scrollTop = el.scrollHeight;
  }

  var participants = [
    { id:'pay',  label:'Payment',   x:72,  y:200, state:'idle' },
    { id:'inv',  label:'Inventory', x:202, y:200, state:'idle' },
    { id:'ship', label:'Shipment',  x:332, y:200, state:'idle' },
    { id:'mail', label:'Email',     x:462, y:200, state:'idle' }
  ];

  var stateColors = {
    idle:       '#1e1f24',
    preparing:  '#3a3200',
    prepared:   '#25240e',
    committed:  '#1a2e22',
    rolledback: '#2a1616',
    stuck:      '#2a1a08'
  };
  var stateBorders = {
    idle:       '#3a3b40',
    preparing:  '#fbef8a',
    prepared:   '#e0c870',
    committed:  '#7bcdab',
    rolledback: '#f08080',
    stuck:      '#ff8c42'
  };
  var stateLabels = {
    idle:       'idle',
    preparing:  'preparing…',
    prepared:   'ready ✓',
    committed:  'committed ✓',
    rolledback: 'rolled back',
    stuck:      'LOCKED ⚠'
  };

  function render2PC(coordState) {
    var c = getCanvas();
    var html = '';
    var coordColor = coordState === 'crashed' ? '#2a1616' : '#1e1f24';
    var coordBorder = coordState === 'crashed' ? '#f08080' : '#fbef8a';
    var coordText  = coordState === 'crashed' ? '💀 CRASHED' : 'Coordinator';

    html += '<div style="position:absolute;left:50%;top:20px;transform:translateX(-50%);' +
            'background:' + coordColor + ';border:2px solid ' + coordBorder + ';border-radius:8px;' +
            'padding:10px 28px;font-size:.8rem;color:#fbef8a;font-weight:700;text-align:center;min-width:120px;">' +
            coordText + '</div>';

    participants.forEach(function(p) {
      var bg  = stateColors[p.state]  || stateColors.idle;
      var bd  = stateBorders[p.state] || stateBorders.idle;
      var lbl = stateLabels[p.state]  || 'idle';
      var blink = p.state === 'stuck' ? 'animation:blink2pc 1s infinite;' : '';

      html += '<div style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;' +
              'background:' + bg + ';border:1px solid ' + bd + ';border-radius:8px;' +
              'padding:10px 12px;text-align:center;width:80px;' + blink + '">' +
              '<div style="font-size:.75rem;color:#fff;font-weight:600;">' + p.label + '</div>' +
              '<div style="font-size:.65rem;color:rgba(255,255,255,.5);margin-top:4px;">' + lbl + '</div>' +
              '</div>';
    });

    html += '<style>@keyframes blink2pc{0%,100%{opacity:1}50%{opacity:.3}}</style>';
    c.innerHTML = html;
  }

  function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  window.run2PC = async function() {
    if (animating) return;
    animating = true;
    reset2PC(true);
    var c = getCanvas();
    var logEl = getLog();
    logEl.innerHTML = '';

    log2pc('[Phase 1] Coordinator → all: PREPARE');
    participants.forEach(function(p) { p.state = 'preparing'; });
    render2PC('active');
    await delay(900);

    if (failMode) {
      participants[0].state = 'prepared';
      participants[2].state = 'prepared';
      participants[3].state = 'prepared';
      participants[1].state = 'rolledback';
      render2PC('active');
      log2pc('[Phase 1] Payment=YES  Inventory=NO  Shipment=YES  Email=YES');
      await delay(700);
      log2pc('[Phase 2] Coordinator → all: ROLLBACK');
      await delay(600);
      participants[0].state = 'rolledback';
      participants[2].state = 'rolledback';
      participants[3].state = 'rolledback';
      render2PC('active');
      log2pc('✗ Transaction rolled back on all participants.');
    } else {
      participants.forEach(function(p) { p.state = 'prepared'; });
      render2PC('active');
      log2pc('[Phase 1] Payment=YES  Inventory=YES  Shipment=YES  Email=YES');
      await delay(700);
      log2pc('[Phase 2] Coordinator → all: COMMIT');
      await delay(600);
      participants.forEach(function(p) { p.state = 'committed'; });
      render2PC('active');
      log2pc('✓ All participants committed. Transaction complete.');
    }
    animating = false;
  };

  window.toggle2PCFail = function() {
    failMode = !failMode;
    var btn = document.getElementById('btn2pcFail');
    btn.classList.toggle('active', failMode);
    btn.textContent = failMode ? '⚡ Failure ON' : '⚡ Inject Failure';
  };

  window.crash2PCCoordinator = async function() {
    if (animating) return;
    animating = true;
    reset2PC(true);
    getLog().innerHTML = '';
    log2pc('[Phase 1] Coordinator → all: PREPARE');
    participants.forEach(function(p) { p.state = 'preparing'; });
    render2PC('active');
    await delay(900);
    participants.forEach(function(p) { p.state = 'prepared'; });
    render2PC('active');
    log2pc('[Phase 1] All voted YES. Coordinator about to send COMMIT…');
    await delay(700);
    render2PC('crashed');
    log2pc('💀 COORDINATOR CRASHED. All participants hold locks waiting for Phase 2.');
    await delay(400);
    participants.forEach(function(p) { p.state = 'stuck'; });
    render2PC('crashed');
    log2pc('⚠  System is blocked. Locks held indefinitely. Manual intervention required.');
    animating = false;
  };

  window.reset2PC = function(silent) {
    animating = false;
    failMode = false;
    var btn = document.getElementById('btn2pcFail');
    if (btn) { btn.classList.remove('active'); btn.textContent = '⚡ Inject Failure'; }
    participants.forEach(function(p) { p.state = 'idle'; });
    render2PC('idle');
    if (!silent) getLog().innerHTML = '';
  };

  render2PC('idle');
})();
</script>

### Why 2PC Fails in Practice

The fatal flaw is the **coordinator crash problem**. Once a participant votes YES in Phase 1, it is locked — it cannot unilaterally commit or rollback. It must wait for Phase 2. If the coordinator crashes after Phase 1 but before Phase 2, every participant holds its locks forever. The system deadlocks until someone manually recovers the coordinator's log and replays Phase 2.

In a microservices environment with dozens of services, this is catastrophic. 2PC also requires all participants to be available simultaneously — one slow service blocks everyone. It is effectively incompatible with the independent deployability and failure isolation that microservices promise.

<div class="callout callout-yellow">
<strong>When 2PC is still used:</strong> Within a single database cluster (PostgreSQL distributed transactions), between two databases you fully control, or in systems where strong consistency is non-negotiable and the coordinator can recover quickly (XA transactions). For cross-team microservices: almost never.
</div>

---

## 4. Level 3 — The Saga Pattern

A Saga breaks the distributed transaction into a sequence of **local transactions**, each of which publishes an event or message when it completes. If any step fails, the Saga executes **compensating transactions** — undo operations — for every step that already succeeded.

The key insight: **compensating transactions are not rollbacks**. Rollbacks are atomic and invisible. Compensations are new transactions that undo the effect of previous ones. Other services may have already seen the intermediate state. This means Sagas provide **eventual consistency**, not ACID isolation.

### Choreography vs Orchestration

**Choreography:** Services react to events. No central controller. Payment service emits `PaymentCharged` → Inventory service listens and reserves stock → emits `InventoryReserved` → Shipment service creates record → etc. Simple to set up, hard to trace and debug.

**Orchestration:** A dedicated Saga Orchestrator sends explicit commands to each service and tracks the state machine. When a step fails, the orchestrator issues compensating commands in reverse order. More complex upfront, much easier to observe and reason about.

<div class="viz-wrap">
<div class="viz-title">Interactive Saga Flow</div>
<div class="viz-controls">
  <button class="viz-btn" onclick="runSagaHappy()">▶ Happy Path</button>
  <button class="viz-btn danger" onclick="runSagaFail(2)">✗ Fail at Inventory (step 3)</button>
  <button class="viz-btn danger" onclick="runSagaFail(1)">✗ Fail at Payment (step 2)</button>
  <button class="viz-btn" onclick="resetSaga()">↺ Reset</button>
</div>
<div id="saga-canvas" style="position:relative;min-height:320px;"></div>
<div id="saga-log" style="margin-top:.8rem;font-size:.75rem;color:rgba(255,255,255,.5);font-family:monospace;min-height:3em;max-height:5em;overflow-y:auto;background:#0d0e10;border-radius:6px;padding:.5rem .8rem;"></div>
</div>

<script>
(function() {
  var sagaSteps = [
    { id:'create',  label:'CreateOrder',       comp:'CancelOrder',       x:20  },
    { id:'pay',     label:'ChargePay',          comp:'RefundPayment',      x:140 },
    { id:'inv',     label:'ReserveInventory',   comp:'ReleaseInventory',   x:260 },
    { id:'ship',    label:'CreateShipment',     comp:'CancelShipment',     x:380 },
    { id:'email',   label:'SendEmail',          comp:'(no compensation)',  x:500 }
  ];

  var stepColors = {
    idle:        '#1e1f24',
    running:     '#25240e',
    done:        '#1a2e22',
    failed:      '#2a1616',
    compensating:'#1e1520',
    compensated: '#2a1616'
  };
  var stepBorders = {
    idle:        '#3a3b40',
    running:     '#fbef8a',
    done:        '#7bcdab',
    failed:      '#f08080',
    compensating:'#cc99cd',
    compensated: '#f08080'
  };

  function renderSaga(states, compStates) {
    var c = document.getElementById('saga-canvas');
    var html = '';
    sagaSteps.forEach(function(s, i) {
      var st  = states[i] || 'idle';
      var cst = compStates && compStates[i] ? compStates[i] : null;
      var bg  = stepColors[st];
      var bd  = stepBorders[st];

      html += '<div style="position:absolute;left:' + s.x + 'px;top:20px;width:110px;' +
              'background:' + bg + ';border:1px solid ' + bd + ';border-radius:8px;padding:10px 8px;text-align:center;">' +
              '<div style="font-size:.72rem;color:#fff;font-weight:600;">' + s.label + '</div>';
      if (st === 'done') html += '<div style="font-size:.65rem;color:#7bcdab;margin-top:4px;">✓</div>';
      if (st === 'failed') html += '<div style="font-size:.65rem;color:#f08080;margin-top:4px;">✗ FAILED</div>';
      html += '</div>';

      if (cst) {
        var cbg  = stepColors[cst];
        var cbd  = stepBorders[cst];
        html += '<div style="position:absolute;left:' + s.x + 'px;top:180px;width:110px;' +
                'background:' + cbg + ';border:1px solid ' + cbd + ';border-radius:8px;padding:10px 8px;text-align:center;">' +
                '<div style="font-size:.68rem;color:#cc99cd;font-weight:600;">' + s.comp + '</div>';
        if (cst === 'compensated') html += '<div style="font-size:.65rem;color:#f08080;margin-top:4px;">↺ done</div>';
        if (cst === 'compensating') html += '<div style="font-size:.65rem;color:#cc99cd;margin-top:4px;">running…</div>';
        html += '</div>';
      }

      if (i < sagaSteps.length - 1) {
        html += '<div style="position:absolute;left:' + (s.x + 110) + 'px;top:42px;font-size:1rem;color:rgba(255,255,255,.3);">→</div>';
      }
    });
    c.innerHTML = html;
  }

  function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  function logSaga(msg) {
    var el = document.getElementById('saga-log');
    el.innerHTML += msg + '<br>';
    el.scrollTop = el.scrollHeight;
  }

  window.runSagaHappy = async function() {
    document.getElementById('saga-log').innerHTML = '';
    var states = ['idle','idle','idle','idle','idle'];
    var comps  = [null,null,null,null,null];
    renderSaga(states, comps);
    for (var i = 0; i < sagaSteps.length; i++) {
      states[i] = 'running';
      renderSaga(states, comps);
      logSaga('→ ' + sagaSteps[i].label + '…');
      await delay(500);
      states[i] = 'done';
      renderSaga(states, comps);
      logSaga('  ✓ ' + sagaSteps[i].label + ' succeeded');
      await delay(200);
    }
    logSaga('✓ Order saga completed successfully.');
  };

  window.runSagaFail = async function(failAt) {
    document.getElementById('saga-log').innerHTML = '';
    var states = ['idle','idle','idle','idle','idle'];
    var comps  = [null,null,null,null,null];
    renderSaga(states, comps);

    for (var i = 0; i <= failAt; i++) {
      states[i] = 'running';
      renderSaga(states, comps);
      logSaga('→ ' + sagaSteps[i].label + '…');
      await delay(500);
      if (i === failAt) {
        states[i] = 'failed';
        renderSaga(states, comps);
        logSaga('  ✗ ' + sagaSteps[i].label + ' FAILED — starting compensation');
        await delay(600);
        break;
      }
      states[i] = 'done';
      renderSaga(states, comps);
      await delay(200);
    }

    for (var j = failAt - 1; j >= 0; j--) {
      comps[j] = 'compensating';
      renderSaga(states, comps);
      logSaga('↺ ' + sagaSteps[j].comp + '…');
      await delay(600);
      comps[j] = 'compensated';
      renderSaga(states, comps);
      logSaga('  ✓ ' + sagaSteps[j].comp + ' applied');
      await delay(200);
    }
    logSaga('⚠  Saga rolled back via compensating transactions. System is eventually consistent.');
  };

  window.resetSaga = function() {
    document.getElementById('saga-log').innerHTML = '';
    renderSaga(['idle','idle','idle','idle','idle'], [null,null,null,null,null]);
  };

  renderSaga(['idle','idle','idle','idle','idle'], [null,null,null,null,null]);
})();
</script>

### Compensating Transactions Are Not Free

Every forward step must have a pre-designed compensating action. `RefundPayment` needs to call the payment provider's refund API. `ReleaseInventory` needs to decrement the reservation counter. Compensations can also fail — which requires their own retry logic and dead-letter queues. The distributed systems complexity doesn't disappear; it moves into the compensation design.

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">OrderSagaOrchestrator</span>:
    <span class="kw">def</span> <span class="fn">execute</span>(<span class="kw">self</span>, order):
        completed = []

        steps = [
            (<span class="st">"create_order"</span>,   <span class="kw">self</span>.create_order,   <span class="kw">self</span>.cancel_order),
            (<span class="st">"charge_payment"</span>,  <span class="kw">self</span>.charge_payment,  <span class="kw">self</span>.refund_payment),
            (<span class="st">"reserve_inv"</span>,     <span class="kw">self</span>.reserve_inv,     <span class="kw">self</span>.release_inv),
            (<span class="st">"create_shipment"</span>, <span class="kw">self</span>.create_shipment, <span class="kw">self</span>.cancel_shipment),
            (<span class="st">"send_email"</span>,      <span class="kw">self</span>.send_email,      <span class="kw">None</span>),
        ]

        <span class="kw">for</span> name, forward, compensate <span class="kw">in</span> steps:
            <span class="kw">try</span>:
                forward(order)
                completed.<span class="fn">append</span>((name, compensate))
            <span class="kw">except</span> <span class="ty">Exception</span> <span class="kw">as</span> e:
                <span class="cm"># run compensating transactions in reverse</span>
                <span class="kw">for</span> _, comp <span class="kw">in</span> <span class="fn">reversed</span>(completed):
                    <span class="kw">if</span> comp:
                        comp(order)  <span class="cm"># must be idempotent</span>
                <span class="kw">raise</span> <span class="ty">SagaFailedError</span>(name, e)</pre>
</div>

---

## 5. Level 4 — The Outbox Pattern

Sagas rely on events being reliably published to a message bus (Kafka, RabbitMQ). Here lies a subtle trap: the **dual-write problem**.

When a service handles a command, it needs to do two things atomically:
1. Write to its own database (e.g., update order status to `PAYMENT_CHARGED`)
2. Publish an event to Kafka (`PaymentCharged`)

These two operations cannot be wrapped in a single transaction — one is a database write, the other is a network call to a different system. If the database commits but Kafka publish fails, the downstream services never see the event. The saga stalls silently.

**The Outbox Pattern** solves this by making Kafka publishing an asynchronous side effect of the database write:

<div class="code-wrap">
<div class="code-lang">sql <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">-- outbox table lives in the SAME database as your business data</span>
<span class="kw">CREATE TABLE</span> <span class="ty">outbox_events</span> (
    id            <span class="ty">UUID</span>        <span class="kw">PRIMARY KEY DEFAULT</span> <span class="fn">gen_random_uuid</span>(),
    aggregate_id  <span class="ty">TEXT</span>        <span class="kw">NOT NULL</span>,
    aggregate_type <span class="ty">TEXT</span>       <span class="kw">NOT NULL</span>,
    event_type    <span class="ty">TEXT</span>        <span class="kw">NOT NULL</span>,
    payload       <span class="ty">JSONB</span>       <span class="kw">NOT NULL</span>,
    created_at    <span class="ty">TIMESTAMPTZ</span> <span class="kw">NOT NULL DEFAULT NOW</span>(),
    published_at  <span class="ty">TIMESTAMPTZ</span>
);</pre>
</div>

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Inside a single database transaction:</span>
<span class="kw">with</span> db.<span class="fn">transaction</span>():
    <span class="cm"># business write</span>
    db.<span class="fn">execute</span>(
        <span class="st">"UPDATE orders SET status='PAYMENT_CHARGED' WHERE id=?"</span>,
        order_id
    )
    <span class="cm"># outbox write — same transaction, same atomicity guarantee</span>
    db.<span class="fn">execute</span>(
        <span class="st">"INSERT INTO outbox_events (aggregate_id, aggregate_type, event_type, payload)"</span>
        <span class="st">"VALUES (?, 'Order', 'PaymentCharged', ?)"</span>,
        order_id, json.<span class="fn">dumps</span>(payload)
    )
<span class="cm"># If this transaction commits, BOTH writes are durable.</span>
<span class="cm"># If it rolls back, NEITHER write happens.</span>

<span class="cm"># A separate relay process (Debezium CDC) tails the outbox table</span>
<span class="cm"># and publishes events to Kafka — independently, with retries.</span></pre>
</div>

The relay process (typically **Debezium** reading the database's change-data-capture stream) publishes the outbox event to Kafka and marks it as `published_at`. The relay can retry on Kafka failures without risk of data loss — the event is safely in the database until delivered. This gives you **exactly-once delivery** semantics at the cost of a small write amplification.

---

## 6. Level 5 — Event Sourcing

Event sourcing flips the storage model entirely. Instead of storing the *current state* of an entity, you store the **sequence of events** that produced that state. The current state is derived by replaying events from the beginning (or from a snapshot).

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Traditional storage: current state snapshot</span>
orders_table = {
    <span class="st">"order_id"</span>: <span class="st">"ord-42"</span>,
    <span class="st">"status"</span>: <span class="st">"shipped"</span>,
    <span class="st">"amount"</span>: <span class="nu">99.00</span>,
    <span class="st">"items"</span>: [<span class="op">...</span>]
}

<span class="cm"># Event sourcing: ordered log of immutable events</span>
event_store = [
    { <span class="st">"type"</span>: <span class="st">"OrderPlaced"</span>,       <span class="st">"orderId"</span>: <span class="st">"ord-42"</span>, <span class="st">"userId"</span>: <span class="st">"u-7"</span>,         <span class="st">"ts"</span>: <span class="st">"10:00:01"</span> },
    { <span class="st">"type"</span>: <span class="st">"PaymentCharged"</span>,    <span class="st">"orderId"</span>: <span class="st">"ord-42"</span>, <span class="st">"amount"</span>: <span class="nu">99.00</span>,      <span class="st">"ts"</span>: <span class="st">"10:00:03"</span> },
    { <span class="st">"type"</span>: <span class="st">"InventoryReserved"</span>, <span class="st">"orderId"</span>: <span class="st">"ord-42"</span>, <span class="st">"items"</span>: [<span class="op">...</span>],    <span class="st">"ts"</span>: <span class="st">"10:00:05"</span> },
    { <span class="st">"type"</span>: <span class="st">"OrderShipped"</span>,      <span class="st">"orderId"</span>: <span class="st">"ord-42"</span>, <span class="st">"tracking"</span>: <span class="st">"TRK-9"</span>, <span class="st">"ts"</span>: <span class="st">"10:02:10"</span> },
]

<span class="kw">def</span> <span class="fn">rebuild_order_state</span>(events):
    state = {}
    <span class="kw">for</span> e <span class="kw">in</span> events:
        <span class="kw">if</span> e[<span class="st">"type"</span>] == <span class="st">"OrderPlaced"</span>:
            state = { <span class="st">"id"</span>: e[<span class="st">"orderId"</span>], <span class="st">"status"</span>: <span class="st">"placed"</span>, <span class="st">"userId"</span>: e[<span class="st">"userId"</span>] }
        <span class="kw">elif</span> e[<span class="st">"type"</span>] == <span class="st">"PaymentCharged"</span>:
            state[<span class="st">"status"</span>] = <span class="st">"paid"</span>;  state[<span class="st">"amount"</span>] = e[<span class="st">"amount"</span>]
        <span class="kw">elif</span> e[<span class="st">"type"</span>] == <span class="st">"InventoryReserved"</span>:
            state[<span class="st">"status"</span>] = <span class="st">"reserved"</span>
        <span class="kw">elif</span> e[<span class="st">"type"</span>] == <span class="st">"OrderShipped"</span>:
            state[<span class="st">"status"</span>] = <span class="st">"shipped"</span>; state[<span class="st">"tracking"</span>] = e[<span class="st">"tracking"</span>]
    <span class="kw">return</span> state</pre>
</div>

{: class="marginalia" }
**Event sourcing sounds<br/>simple but the devil is<br/>in schema evolution** —<br/>when your event format<br/>changes, you need to<br/>migrate or version<br/>every event ever stored.<br/>This is why many teams<br/>start with it and<br/>regret it.

<div class="viz-wrap">
<div class="viz-title">Interactive Event Log Replay</div>
<div class="viz-controls">
  <button class="viz-btn" onclick="replayEvents()">▶ Replay All</button>
  <button class="viz-btn danger" onclick="addCancelEvent()">+ Add OrderCancelled</button>
  <button class="viz-btn" onclick="resetReplay()">↺ Reset</button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
  <div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.08em;">Event Log</div>
    <div id="event-log-list" style="font-size:.75rem;font-family:monospace;"></div>
  </div>
  <div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.08em;">Current State</div>
    <div id="event-state-panel" style="background:#0d0e10;border-radius:8px;padding:.8rem;font-size:.78rem;font-family:monospace;min-height:120px;color:rgba(255,255,255,.7);"></div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.25);margin-top:.5rem;">💡 Snapshot after 100 events: skip replay, load snapshot + tail</div>
  </div>
</div>
</div>

<script>
(function() {
  var baseEvents = [
    { type:'OrderPlaced',       data:{ orderId:'ord-42', userId:'u-7', items:['Widget x2','Gadget x1'] }, ts:'10:00:01' },
    { type:'PaymentCharged',    data:{ orderId:'ord-42', amount:99.00 },                                  ts:'10:00:03' },
    { type:'InventoryReserved', data:{ orderId:'ord-42', items:['Widget x2','Gadget x1'] },               ts:'10:00:05' },
    { type:'OrderShipped',      data:{ orderId:'ord-42', tracking:'TRK-9X2' },                            ts:'10:02:10' }
  ];
  var allEvents = baseEvents.slice();
  var cancelAdded = false;

  function renderEventList(activeIdx) {
    var el = document.getElementById('event-log-list');
    var html = '';
    allEvents.forEach(function(e, i) {
      var active = i <= activeIdx;
      var col = active ? '#7bcdab' : 'rgba(255,255,255,.25)';
      var bg  = active ? 'background:#1a2e22;' : '';
      html += '<div style="' + bg + 'border-radius:4px;padding:4px 8px;margin-bottom:4px;">' +
              '<span style="color:' + col + ';font-weight:600;">' + e.type + '</span>' +
              '<span style="color:rgba(255,255,255,.3);margin-left:8px;font-size:.68rem;">' + e.ts + '</span>' +
              '</div>';
    });
    el.innerHTML = html;
  }

  function rebuildState(upTo) {
    var state = { status:'(empty)' };
    for (var i = 0; i <= upTo && i < allEvents.length; i++) {
      var e = allEvents[i];
      if (e.type === 'OrderPlaced')       { state = { id: e.data.orderId, status:'placed', user: e.data.userId, items: e.data.items.join(', ') }; }
      if (e.type === 'PaymentCharged')    { state.status = 'paid';     state.amount = '$' + e.data.amount.toFixed(2); }
      if (e.type === 'InventoryReserved') { state.status = 'reserved'; }
      if (e.type === 'OrderShipped')      { state.status = 'shipped';  state.tracking = e.data.tracking; }
      if (e.type === 'OrderCancelled')    { state.status = 'CANCELLED'; state.cancelReason = e.data.reason; }
    }
    return state;
  }

  function renderState(state) {
    var el = document.getElementById('event-state-panel');
    var html = '';
    Object.keys(state).forEach(function(k) {
      var col = k === 'status' ? (state[k] === 'CANCELLED' ? '#f08080' : '#7bcdab') : 'rgba(255,255,255,.7)';
      html += '<div><span style="color:rgba(255,255,255,.35);">' + k + ': </span>' +
              '<span style="color:' + col + ';">' + state[k] + '</span></div>';
    });
    el.innerHTML = html || '<span style="color:rgba(255,255,255,.25);">—</span>';
  }

  function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  window.replayEvents = async function() {
    for (var i = -1; i < allEvents.length; i++) {
      renderEventList(i);
      renderState(i >= 0 ? rebuildState(i) : { status:'(empty)' });
      await delay(500);
    }
  };

  window.addCancelEvent = function() {
    if (cancelAdded) return;
    cancelAdded = true;
    allEvents.push({ type:'OrderCancelled', data:{ orderId:'ord-42', reason:'Customer request' }, ts:'10:15:00' });
    renderEventList(allEvents.length - 1);
    renderState(rebuildState(allEvents.length - 1));
  };

  window.resetReplay = function() {
    allEvents = baseEvents.slice();
    cancelAdded = false;
    renderEventList(-1);
    renderState({ status:'(empty)' });
  };

  renderEventList(-1);
  renderState({ status:'(empty)' });
})();
</script>

### Snapshot Optimization

For aggregates with long event histories (thousands of events), replaying from event zero on every read is expensive. The solution is periodic **snapshots**: after every N events, serialize the current state to a snapshot store. On read, load the most recent snapshot then replay only the events that occurred after it.

---

## 7. Level 6 — CQRS

**Command Query Responsibility Segregation (CQRS)** is the natural companion to Event Sourcing. The insight is that write workloads (processing commands, enforcing invariants) and read workloads (serving queries, generating views) have almost nothing in common — so separate them.

**Write side:** Commands → Aggregate (validates invariants, enforces business rules) → Event Store → Event Bus

**Read side:** Multiple independent projections subscribe to the event bus and maintain their own read-optimized stores. An Order History Projection might maintain a flat table sorted by user + timestamp. An Inventory Projection maintains current stock levels. An Analytics Projection feeds a data warehouse. Each is rebuilt independently from the event stream.

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># WRITE SIDE — command handler</span>
<span class="kw">class</span> <span class="ty">OrderAggregate</span>:
    <span class="kw">def</span> <span class="fn">handle_place_order</span>(<span class="kw">self</span>, cmd):
        <span class="kw">if self</span>.status != <span class="st">"new"</span>:
            <span class="kw">raise</span> <span class="ty">InvalidStateError</span>(<span class="st">"Order already placed"</span>)
        <span class="kw">self</span>.<span class="fn">apply</span>(<span class="ty">OrderPlaced</span>(cmd.order_id, cmd.user_id, cmd.items))

    <span class="kw">def</span> <span class="fn">apply</span>(<span class="kw">self</span>, event):
        <span class="kw">self</span>.event_store.<span class="fn">append</span>(event)
        <span class="kw">self</span>.event_bus.<span class="fn">publish</span>(event)  <span class="cm"># via outbox pattern</span>

<span class="cm"># READ SIDE — projections (one per read model)</span>
<span class="kw">class</span> <span class="ty">OrderHistoryProjection</span>:
    <span class="kw">def</span> <span class="fn">on_order_placed</span>(<span class="kw">self</span>, event):
        <span class="kw">self</span>.read_db.<span class="fn">upsert</span>(<span class="st">"order_history"</span>, {
            <span class="st">"order_id"</span>: event.order_id, <span class="st">"user_id"</span>: event.user_id,
            <span class="st">"placed_at"</span>: event.timestamp, <span class="st">"status"</span>: <span class="st">"placed"</span>
        })

    <span class="kw">def</span> <span class="fn">on_order_shipped</span>(<span class="kw">self</span>, event):
        <span class="kw">self</span>.read_db.<span class="fn">update</span>(<span class="st">"order_history"</span>,
            where={<span class="st">"order_id"</span>: event.order_id},
            set={<span class="st">"status"</span>: <span class="st">"shipped"</span>, <span class="st">"tracking"</span>: event.tracking}
        )</pre>
</div>

The key benefit: the read model is **disposable**. If you need a new query pattern, build a new projection and replay all historical events into it. The event store is the single source of truth.

---

## 8. Comparison: When to Use What

<table class="comp-table">
  <thead>
    <tr>
      <th>Pattern</th>
      <th>Consistency</th>
      <th>Complexity</th>
      <th>Latency</th>
      <th>Best For</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>2PC</strong></td>
      <td><span class="badge badge-green">Strong (ACID)</span></td>
      <td><span class="badge badge-yellow">High</span></td>
      <td><span class="badge badge-red">High (locks)</span></td>
      <td>Financial, same-team DBs</td>
    </tr>
    <tr>
      <td><strong>Saga (Choreography)</strong></td>
      <td><span class="badge badge-yellow">Eventual</span></td>
      <td><span class="badge badge-yellow">Medium</span></td>
      <td><span class="badge badge-green">Low</span></td>
      <td>Simple microservice flows</td>
    </tr>
    <tr>
      <td><strong>Saga (Orchestration)</strong></td>
      <td><span class="badge badge-yellow">Eventual</span></td>
      <td><span class="badge badge-red">High</span></td>
      <td><span class="badge badge-green">Low</span></td>
      <td>Complex, observable flows</td>
    </tr>
    <tr>
      <td><strong>Outbox Pattern</strong></td>
      <td><span class="badge badge-yellow">Eventual</span></td>
      <td><span class="badge badge-green">Low</span></td>
      <td><span class="badge badge-green">Low</span></td>
      <td>Reliable event publishing</td>
    </tr>
    <tr>
      <td><strong>Event Sourcing</strong></td>
      <td><span class="badge badge-yellow">Eventual</span></td>
      <td><span class="badge badge-red">Very High</span></td>
      <td><span class="badge badge-green">Low</span></td>
      <td>Audit trails, time-travel</td>
    </tr>
    <tr>
      <td><strong>CQRS</strong></td>
      <td><span class="badge badge-yellow">Eventual</span></td>
      <td><span class="badge badge-red">Very High</span></td>
      <td><span class="badge badge-green">Low (reads)</span></td>
      <td>High-read, complex domains</td>
    </tr>
  </tbody>
</table>

---

## 9. Real-World: Amazon Order Placement

Amazon's order flow uses Saga orchestration extensively. Here's a simplified walk-through of how placing a single order works, with the compensating actions that fire on failure:

| Step | Service | Compensation |
|---|---|---|
| 1 | Create order record (PENDING) | Delete pending order |
| 2 | Authorize payment (hold, not capture) | Release payment authorization |
| 3 | Reserve inventory at warehouse | Release inventory reservation |
| 4 | Assign carrier and tracking | Cancel carrier booking |
| 5 | Capture payment (finalize charge) | Issue refund |
| 6 | Trigger fulfillment pick-pack | Cancel pick-pack job |
| 7 | Send confirmation email | (no compensation needed) |

Notice that **payment authorization** (step 2) and **payment capture** (step 5) are separate. This is intentional: holding a reservation is cheaper to reverse than a completed charge. The saga is designed so the expensive, hard-to-compensate operations happen as late as possible.

Amazon's saga orchestrator persists its state to DynamoDB. If the orchestrator itself crashes mid-saga, it rehydrates from the persisted state and resumes from the last completed step. This is why every step must be **idempotent**.

---

## 10. Idempotency Is Non-Negotiable

Every saga step — forward and compensating — must be safely retryable. A network timeout doesn't mean the operation failed; the downstream service may have succeeded and the response was just lost. Retrying a non-idempotent operation doubles the charge, reserves twice the inventory, sends two emails.

The standard solution is the **idempotency key pattern**:

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Client side: generate a stable key from the logical operation</span>
idempotency_key = <span class="fn">hash</span>(saga_id + <span class="st">"."</span> + step_name)
<span class="cm"># e.g., "saga-ord-42.charge_payment" → deterministic UUID</span>

<span class="cm"># Server side (payment service): check before processing</span>
<span class="kw">def</span> <span class="fn">charge_payment</span>(request):
    existing = db.<span class="fn">get</span>(<span class="st">"idempotency_keys"</span>, request.idempotency_key)
    <span class="kw">if</span> existing:
        <span class="kw">return</span> existing.result  <span class="cm"># replay cached result, don't re-charge</span>

    result = stripe.<span class="fn">charge</span>(request.amount, request.card_token)

    db.<span class="fn">set</span>(<span class="st">"idempotency_keys"</span>, request.idempotency_key, result, ttl=<span class="nu">86400</span>)
    <span class="kw">return</span> result</pre>
</div>

The idempotency key table is keyed by `(service, key)` and stores the result. Retries within the TTL window return the cached response immediately without re-executing the business logic. Stripe, Braintree, and every major payment processor support this natively via the `Idempotency-Key` header.

<div class="callout callout-green">
<strong>Interview signal:</strong> Mentioning idempotency unprompted, alongside saga compensation design, is the mark of a senior engineer who has debugged distributed systems in production. Most candidates forget it until prompted.
</div>

---

## Summary

Distributed transactions are fundamentally a problem of **trust across failure boundaries**. The evolution from naïve sequential calls → 2PC → Saga → Event Sourcing + CQRS reflects the industry's growing understanding that strong consistency across microservices is usually not worth the coupling it requires.

For most e-commerce systems today the answer is **Saga orchestration + Outbox pattern**:

- Outbox guarantees reliable event delivery without dual-write risk
- Orchestrated Sagas give you observable, debuggable compensation flows
- Idempotency keys make every step safely retryable
- Eventually-consistent is acceptable for order processing (customers don't expect sub-millisecond confirmation)

Reserve Event Sourcing and CQRS for domains where **audit history is a first-class requirement** (financial ledgers, healthcare records, compliance systems) — not as a default architectural choice.

{: class="marginalia" }
**The Saga pattern was<br/>introduced by Hector<br/>Garcia-Molina in 1987**<br/>for long-lived<br/>transactions. The<br/>distributed systems<br/>community rediscovered<br/>it for microservices<br/>30 years later.

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
