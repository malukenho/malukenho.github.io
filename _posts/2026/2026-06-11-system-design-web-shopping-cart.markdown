---
layout: post
title: "System Design: Shopping Cart — Consistency, Merging, and the Checkout Saga"
date: 2026-06-11 10:00:00 +0000
categories: ["post"]
tags: [system-design, e-commerce, crdt, saga, redis, consistency, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios &mdash; Shopping Cart
</div>

{: class="marginalia" }
**Amazon's Dynamo paper<br/>(2007) opens with the<br/>shopping cart as the<br/>primary example of why<br/>they chose eventual<br/>consistency over strong<br/>consistency — even for<br/>financial-adjacent data.**

Design Amazon's shopping cart. Users add and remove items. The cart must work offline — user on a plane with no connection. When they reconnect, the cart syncs. Users have the same cart on mobile and desktop. Checkout must reserve inventory and process payment atomically.

**The question:** *Design a shopping cart service that works offline, syncs across devices, and has a correct, rollback-capable checkout flow.*

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
.viz-btn.danger { border-color:#f08080;color:rgba(255,255,255,.75); }
.viz-btn.danger:hover { background:#2a1616;color:#f08080; }

.device-panel { background:#19191c;border:1px solid #2e2f35;border-radius:10px;padding:1rem;flex:1;min-width:180px; }
.device-header { font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.38);margin-bottom:.7rem;display:flex;align-items:center;gap:.4rem; }
.device-offline { display:inline-block;background:#2a1616;border:1px solid #f08080;border-radius:4px;padding:1px 6px;font-size:.65rem;color:#f08080; }
.device-online  { display:inline-block;background:#1a2e22;border:1px solid #7bcdab;border-radius:4px;padding:1px 6px;font-size:.65rem;color:#7bcdab; }
.cart-item { display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-radius:6px;margin-bottom:4px;font-size:.8rem;background:#1e1f24;color:rgba(255,255,255,.78); }
.cart-item.removed { background:#2a1616;color:#f08080;text-decoration:line-through; }
.cart-item.added   { background:#1a2e22;color:#7bcdab; }
.cart-item.conflict { background:#3a2800;color:#fbef8a; }

.saga-step { display:flex;flex-direction:column;align-items:center;gap:4px; }
.saga-box { width:90px;border-radius:8px;border:1px solid #3a3b40;background:#1e1f24;padding:8px 6px;text-align:center;font-size:.7rem;color:rgba(255,255,255,.72);transition:all .4s;line-height:1.3; }
.saga-box.pending   { border-color:#3a3b40;background:#1e1f24;color:rgba(255,255,255,.45); }
.saga-box.running   { border-color:#fbef8a;background:#25240e;color:#fbef8a;box-shadow:0 0 8px rgba(251,239,138,.2); }
.saga-box.done      { border-color:#7bcdab;background:#1a2e22;color:#7bcdab; }
.saga-box.failed    { border-color:#f08080;background:#2a1616;color:#f08080; }
.saga-box.compensating { border-color:#ff8c42;background:#2a1a08;color:#ff8c42;animation:pulse-saga .8s infinite; }
.saga-arrow { font-size:.9rem;color:rgba(255,255,255,.25);transition:color .4s; }
.saga-arrow.active { color:#7bcdab; }
.saga-arrow.back   { color:#ff8c42; }

@keyframes pulse-saga { 0%,100% { opacity:1; } 50% { opacity:.5; } }
@keyframes blink2pc { 0%,100% { opacity:1; } 50% { opacity:.4; } }
</style>

## 1. More Complex Than It Looks

The shopping cart seems trivial until you consider the real edge cases:

- User adds item on phone, adds a different item on laptop while both are offline → need to sync **both** additions
- User removes item on phone while server is unreachable → removal must persist after reconnect
- Same item added twice from two devices simultaneously → should not double-count
- Item goes out of stock between "add to cart" and "checkout" → must handle gracefully

These edge cases map directly to four classic distributed-systems problems: **partition tolerance**, **causal consistency**, **idempotency**, and **TOCTOU races**. A good interview answer names all four and then addresses them in order.

<div class="callout callout-yellow">
<strong>Why interviewers love this question:</strong> The shopping cart looks like a simple CRUD service. It is actually a miniature distributed-systems course — offline-first, CRDT merge, inventory reservation, and the saga pattern, all in one scenario.
</div>

---

## 2. Level 1 — Naïve Server-Side Cart

The naïve model stores the cart as a single DB row:

<div class="code-wrap">
<div class="code-lang">sql <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">CREATE TABLE</span> carts (
  user_id   <span class="ty">BIGINT</span> <span class="kw">PRIMARY KEY</span>,
  items     <span class="ty">JSONB</span>,           <span class="cm">-- [{"itemId":"B001","qty":2}, ...]</span>
  updated_at <span class="ty">TIMESTAMPTZ</span>
);

<span class="cm">-- Add item: read-modify-write</span>
<span class="kw">UPDATE</span> carts
  <span class="kw">SET</span> items <span class="op">=</span> items <span class="op">||</span> <span class="st">'[{"itemId":"B007","qty":1}]'</span>::<span class="ty">jsonb</span>,
      updated_at <span class="op">=</span> <span class="fn">now</span>()
  <span class="kw">WHERE</span> user_id <span class="op">=</span> <span class="nu">42</span>;</pre>
</div>

Every add or remove is an `UPDATE`. This breaks down immediately under two conditions:

**Offline:** user adds an item, but the network is unavailable — the `UPDATE` never reaches the DB. The change is lost when the app restarts.

**Concurrent devices:** phone and laptop both read the cart, each modify a different item, and both `UPDATE`. The second write stomps the first — **last-write-wins** silently drops one device's changes.

<div class="callout callout-red">
<strong>Last-write-wins (LWW)</strong> is the silent killer of cart implementations. Two devices, both online, can race each other. Whichever network request arrives a few milliseconds later wins — and the loser's changes disappear with no error shown to the user.
</div>

---

## 3. Level 2 — Cart as a CRDT

Amazon's Dynamo paper (2007) famously uses the shopping cart as the motivating example for **Conflict-free Replicated Data Types (CRDTs)**. The insight: instead of storing the *current* cart state, store the *history of operations* in a way that can always be merged correctly regardless of order.

Model the cart as two sets:

- `added` — every `(itemId, uniqueTag)` pair ever added
- `removed` — every tag explicitly removed by the user
- `current_cart = added − removed`

This is an **OR-Set (Observed-Remove Set)**:

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> uuid

<span class="kw">class</span> <span class="ty">ORSetCart</span>:
    <span class="kw">def</span> <span class="fn">__init__</span>(self):
        self.added   <span class="op">=</span> {}   <span class="cm"># itemId -> set of unique tags</span>
        self.removed <span class="op">=</span> set() <span class="cm"># set of tags</span>

    <span class="kw">def</span> <span class="fn">add</span>(self, item_id):
        tag <span class="op">=</span> <span class="fn">str</span>(uuid.<span class="fn">uuid4</span>())
        self.added.<span class="fn">setdefault</span>(item_id, <span class="fn">set</span>()).<span class="fn">add</span>(tag)
        <span class="kw">return</span> tag

    <span class="kw">def</span> <span class="fn">remove</span>(self, item_id):
        <span class="cm"># Remove ALL currently known tags for this item</span>
        tags <span class="op">=</span> self.added.<span class="fn">get</span>(item_id, <span class="fn">set</span>())
        self.removed.<span class="fn">update</span>(tags)

    <span class="kw">def</span> <span class="fn">items</span>(self):
        result <span class="op">=</span> {}
        <span class="kw">for</span> item_id, tags <span class="kw">in</span> self.added.<span class="fn">items</span>():
            live <span class="op">=</span> tags <span class="op">-</span> self.removed
            <span class="kw">if</span> live:
                result[item_id] <span class="op">=</span> <span class="fn">len</span>(live)  <span class="cm"># qty = number of live tags</span>
        <span class="kw">return</span> result

    <span class="kw">def</span> <span class="fn">merge</span>(self, other):
        <span class="cm"># Union both added sets, union both removed sets</span>
        merged <span class="op">=</span> <span class="ty">ORSetCart</span>()
        <span class="kw">for</span> item_id <span class="kw">in</span> <span class="fn">set</span>(self.added) <span class="op">|</span> <span class="fn">set</span>(other.added):
            merged.added[item_id] <span class="op">=</span> (
                self.added.<span class="fn">get</span>(item_id, <span class="fn">set</span>()) <span class="op">|</span>
                other.added.<span class="fn">get</span>(item_id, <span class="fn">set</span>())
            )
        merged.removed <span class="op">=</span> self.removed <span class="op">|</span> other.removed
        <span class="kw">return</span> merged</pre>
</div>

The key insight: when phone removes "Keyboard" and laptop concurrently re-adds "Keyboard", the re-add generates a **new tag** not present in phone's `removed` set — so after merge, Keyboard remains. The OR-Set correctly handles the "remove wins unless you re-add" semantics.

### Interactive CRDT Cart Merger

<div class="viz-wrap">
  <div class="viz-title">CRDT vs Last-Write-Wins — Offline Merge Simulation</div>
  <div class="viz-controls">
    <button class="viz-btn" id="btnGoOffline" onclick="goOffline()">✈ Go Offline</button>
    <button class="viz-btn" id="btnSync" onclick="syncCarts()" style="display:none">⚡ Sync Devices</button>
    <button class="viz-btn" onclick="resetCRDT()">↺ Reset</button>
  </div>
  <div id="crdt-status" style="font-size:.75rem;color:rgba(255,255,255,.45);margin-bottom:.8rem;">Both devices online. Showing shared cart.</div>
  <div style="display:flex;gap:1rem;flex-wrap:wrap;">
    <div class="device-panel" id="panel-phone">
      <div class="device-header">
        <span>📱 Phone</span>
        <span id="phone-badge" class="device-online">online</span>
      </div>
      <div id="phone-cart"></div>
      <div id="phone-actions" style="display:none;margin-top:.8rem;">
        <button class="viz-btn" style="font-size:.72rem;padding:4px 10px;margin:2px;" onclick="phoneAdd('Headphones')">+ Headphones</button>
        <button class="viz-btn" style="font-size:.72rem;padding:4px 10px;margin:2px;" onclick="phoneAdd('Monitor')">+ Monitor</button>
        <button class="viz-btn danger" style="font-size:.72rem;padding:4px 10px;margin:2px;" onclick="phoneRemove('Keyboard')">− Keyboard</button>
      </div>
    </div>
    <div class="device-panel" id="panel-laptop">
      <div class="device-header">
        <span>💻 Laptop</span>
        <span id="laptop-badge" class="device-online">online</span>
      </div>
      <div id="laptop-cart"></div>
      <div id="laptop-actions" style="display:none;margin-top:.8rem;">
        <button class="viz-btn" style="font-size:.72rem;padding:4px 10px;margin:2px;" onclick="laptopAdd('Mouse')">+ Mouse</button>
        <button class="viz-btn" style="font-size:.72rem;padding:4px 10px;margin:2px;" onclick="laptopAdd('Keyboard')">+ Keyboard (re-add)</button>
        <button class="viz-btn" style="font-size:.72rem;padding:4px 10px;margin:2px;" onclick="laptopAdd('USB Hub')">+ USB Hub</button>
      </div>
    </div>
    <div class="device-panel" id="panel-server" style="border-color:#2e2f35;opacity:.5;">
      <div class="device-header">
        <span>☁ Server</span>
        <span id="server-badge" class="device-online">online</span>
      </div>
      <div id="server-cart"></div>
    </div>
  </div>
  <div id="merge-result" style="display:none;margin-top:1rem;background:#0d0e10;border-radius:8px;padding:.8rem 1rem;">
    <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:.6rem;">Merge result comparison</div>
    <div style="display:flex;gap:1rem;flex-wrap:wrap;">
      <div style="flex:1;min-width:160px;">
        <div style="font-size:.72rem;color:#7bcdab;margin-bottom:.4rem;">✓ CRDT (OR-Set merge)</div>
        <div id="crdt-result"></div>
      </div>
      <div style="flex:1;min-width:160px;">
        <div style="font-size:.72rem;color:#f08080;margin-bottom:.4rem;">✗ Last-Write-Wins (phone wins)</div>
        <div id="lww-result"></div>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  var offline = false;

  var shared = {
    added: {
      'Book':     ['tag-book-1'],
      'Keyboard': ['tag-kb-1'],
      'Charger':  ['tag-chg-1']
    },
    removed: []
  };

  var phoneState  = null;
  var laptopState = null;

  function cloneState(s) {
    var a = {};
    Object.keys(s.added).forEach(function(k) {
      a[k] = s.added[k].slice();
    });
    return { added: a, removed: s.removed.slice() };
  }

  function currentItems(state) {
    var result = [];
    Object.keys(state.added).forEach(function(itemId) {
      var liveTags = state.added[itemId].filter(function(t) {
        return state.removed.indexOf(t) === -1;
      });
      if (liveTags.length > 0) result.push(itemId);
    });
    return result;
  }

  function renderCart(containerId, state, highlight) {
    var items = currentItems(state);
    var html = '';
    if (items.length === 0) {
      html = '<div style="font-size:.75rem;color:rgba(255,255,255,.3);padding:6px 0;">Empty cart</div>';
    } else {
      items.forEach(function(item) {
        var cls = 'cart-item';
        if (highlight && highlight.added && highlight.added.indexOf(item) !== -1) cls += ' added';
        if (highlight && highlight.removed && highlight.removed.indexOf(item) !== -1) cls += ' removed';
        html += '<div class="' + cls + '"><span>' + item + '</span></div>';
      });
    }
    document.getElementById(containerId).innerHTML = html;
  }

  function renderAll() {
    renderCart('phone-cart',  phoneState  || shared, null);
    renderCart('laptop-cart', laptopState || shared, null);
    renderCart('server-cart', shared, null);
  }

  window.goOffline = function() {
    offline = true;
    phoneState  = cloneState(shared);
    laptopState = cloneState(shared);

    document.getElementById('phone-badge').className  = 'device-offline';
    document.getElementById('phone-badge').textContent = 'offline';
    document.getElementById('laptop-badge').className = 'device-offline';
    document.getElementById('laptop-badge').textContent = 'offline';
    document.getElementById('server-badge').style.opacity = '.4';

    document.getElementById('phone-actions').style.display  = 'block';
    document.getElementById('laptop-actions').style.display = 'block';
    document.getElementById('btnGoOffline').style.display   = 'none';
    document.getElementById('btnSync').style.display        = 'inline-block';
    document.getElementById('crdt-status').textContent = 'Both devices offline. Make independent changes, then sync.';
    renderAll();
  };

  window.phoneAdd = function(item) {
    if (!phoneState) return;
    if (!phoneState.added[item]) phoneState.added[item] = [];
    phoneState.added[item].push('tag-p-' + item.toLowerCase().replace(/ /g,'-') + '-' + Date.now());
    renderCart('phone-cart', phoneState, null);
  };

  window.phoneRemove = function(item) {
    if (!phoneState) return;
    var tags = phoneState.added[item] || [];
    tags.forEach(function(t) {
      if (phoneState.removed.indexOf(t) === -1) phoneState.removed.push(t);
    });
    renderCart('phone-cart', phoneState, null);
  };

  window.laptopAdd = function(item) {
    if (!laptopState) return;
    if (!laptopState.added[item]) laptopState.added[item] = [];
    laptopState.added[item].push('tag-l-' + item.toLowerCase().replace(/ /g,'-') + '-' + Date.now());
    renderCart('laptop-cart', laptopState, null);
  };

  window.syncCarts = function() {
    if (!phoneState || !laptopState) return;

    var merged = { added: {}, removed: [] };
    var allItems = {};
    Object.keys(phoneState.added).forEach(function(k) { allItems[k] = true; });
    Object.keys(laptopState.added).forEach(function(k) { allItems[k] = true; });

    Object.keys(allItems).forEach(function(item) {
      var pTags = phoneState.added[item]  || [];
      var lTags = laptopState.added[item] || [];
      var combined = pTags.slice();
      lTags.forEach(function(t) { if (combined.indexOf(t) === -1) combined.push(t); });
      merged.added[item] = combined;
    });

    phoneState.removed.forEach(function(t) {
      if (merged.removed.indexOf(t) === -1) merged.removed.push(t);
    });
    laptopState.removed.forEach(function(t) {
      if (merged.removed.indexOf(t) === -1) merged.removed.push(t);
    });

    shared = merged;

    phoneState  = cloneState(shared);
    laptopState = cloneState(shared);

    document.getElementById('phone-badge').className   = 'device-online';
    document.getElementById('phone-badge').textContent  = 'online';
    document.getElementById('laptop-badge').className  = 'device-online';
    document.getElementById('laptop-badge').textContent = 'online';
    document.getElementById('server-badge').style.opacity = '1';
    document.getElementById('panel-server').style.opacity = '1';

    document.getElementById('phone-actions').style.display  = 'none';
    document.getElementById('laptop-actions').style.display = 'none';
    document.getElementById('btnSync').style.display        = 'none';
    document.getElementById('btnGoOffline').style.display   = 'inline-block';

    var crdtItems = currentItems(merged);

    var lwwItems = currentItems(phoneState);

    var crdtHtml = '';
    crdtItems.forEach(function(item) {
      crdtHtml += '<div class="cart-item added"><span>' + item + '</span></div>';
    });

    var lwwHtml = '';
    lwwItems.forEach(function(item) {
      var missing = crdtItems.indexOf(item) === -1;
      var extra   = lwwItems.indexOf(item) !== -1 && crdtItems.indexOf(item) === -1;
      lwwHtml += '<div class="cart-item' + (extra ? ' conflict' : '') + '"><span>' + item + '</span></div>';
    });
    crdtItems.forEach(function(item) {
      if (lwwItems.indexOf(item) === -1) {
        lwwHtml += '<div class="cart-item removed"><span>' + item + ' (lost)</span></div>';
      }
    });

    document.getElementById('crdt-result').innerHTML   = crdtHtml;
    document.getElementById('lww-result').innerHTML    = lwwHtml;
    document.getElementById('merge-result').style.display = 'block';

    document.getElementById('crdt-status').textContent = 'Synced! CRDT merge preserved all changes from both devices.';
    renderAll();
  };

  window.resetCRDT = function() {
    offline = false;
    shared = {
      added: {
        'Book':     ['tag-book-1'],
        'Keyboard': ['tag-kb-1'],
        'Charger':  ['tag-chg-1']
      },
      removed: []
    };
    phoneState  = null;
    laptopState = null;
    document.getElementById('phone-badge').className   = 'device-online';
    document.getElementById('phone-badge').textContent  = 'online';
    document.getElementById('laptop-badge').className  = 'device-online';
    document.getElementById('laptop-badge').textContent = 'online';
    document.getElementById('server-badge').style.opacity = '1';
    document.getElementById('panel-server').style.opacity = '1';
    document.getElementById('phone-actions').style.display  = 'none';
    document.getElementById('laptop-actions').style.display = 'none';
    document.getElementById('btnSync').style.display        = 'none';
    document.getElementById('btnGoOffline').style.display   = 'inline-block';
    document.getElementById('merge-result').style.display  = 'none';
    document.getElementById('crdt-status').textContent = 'Both devices online. Showing shared cart.';
    renderAll();
  };

  renderAll();
})();
</script>

**How it works:** Phone removes "Keyboard" (marks its existing tag as removed). Laptop re-adds "Keyboard" generating a *new* tag. On sync, merged `removed` contains only the old tag — the new tag is alive. Keyboard stays. Last-write-wins would have simply taken phone's state and silently dropped the laptop's re-addition.

---

## 4. Level 3 — Practical Cart Storage

Pure CRDTs are elegant but expensive to store at scale. Real systems use a pragmatic hybrid:

<table class="comp-table">
  <thead>
    <tr>
      <th>Layer</th>
      <th>Technology</th>
      <th>Purpose</th>
      <th>TTL</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Hot cache</strong></td>
      <td>Redis Hash</td>
      <td>Active cart reads/writes (sub-millisecond)</td>
      <td>30 days, sliding</td>
    </tr>
    <tr>
      <td><strong>Persistent store</strong></td>
      <td>DynamoDB / Cassandra</td>
      <td>Durability, cross-region replication</td>
      <td>90 days</td>
    </tr>
    <tr>
      <td><strong>Client cache</strong></td>
      <td>IndexedDB / localStorage</td>
      <td>Offline-first, instant UI response</td>
      <td>Session</td>
    </tr>
    <tr>
      <td><strong>Sync log</strong></td>
      <td>DynamoDB (event log)</td>
      <td>Ordered ops for delta sync protocol</td>
      <td>7 days</td>
    </tr>
  </tbody>
</table>

**Redis schema:**

<div class="code-wrap">
<div class="code-lang">redis <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Cart items stored as Hash field=itemId, value=JSON</span>
HSET cart:<span class="nu">42</span>  B001  <span class="st">'{"qty":2,"addedAt":1700000000,"price":29.99}'</span>
HSET cart:<span class="nu">42</span>  B007  <span class="st">'{"qty":1,"addedAt":1700000100,"price":9.99}'</span>
EXPIRE cart:<span class="nu">42</span>  <span class="nu">2592000</span>  <span class="cm"># 30 days in seconds</span>

<span class="cm"># Read full cart</span>
HGETALL cart:<span class="nu">42</span>

<span class="cm"># Remove one item</span>
HDEL cart:<span class="nu">42</span>  B001

<span class="cm"># Inventory soft hold (15-minute TTL)</span>
SET hold:B007:<span class="nu">42</span>  <span class="st">'{"qty":1,"expiresAt":1700000900}'</span>  EX <span class="nu">900</span></pre>
</div>

**Delta sync protocol** — the client does not send the full cart on every reconnect. It sends only changes since the last successful sync:

<div class="code-wrap">
<div class="code-lang">json <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">// POST /cart/sync</span>
{
  <span class="st">"userId"</span>: <span class="nu">42</span>,
  <span class="st">"lastSyncTs"</span>: <span class="nu">1700000000</span>,
  <span class="st">"ops"</span>: [
    { <span class="st">"op"</span>: <span class="st">"add"</span>,    <span class="st">"itemId"</span>: <span class="st">"B009"</span>, <span class="st">"tag"</span>: <span class="st">"uuid-1"</span>, <span class="st">"ts"</span>: <span class="nu">1700000050</span> },
    { <span class="st">"op"</span>: <span class="st">"remove"</span>, <span class="st">"itemId"</span>: <span class="st">"B001"</span>, <span class="st">"ts"</span>: <span class="nu">1700000080</span> }
  ]
}

<span class="cm">// Server response: merged state + server-side changes since lastSyncTs</span>
{
  <span class="st">"cart"</span>: [ <span class="cm">/* full current cart */</span> ],
  <span class="st">"syncTs"</span>: <span class="nu">1700000200</span>
}</pre>
</div>

---

## 5. Level 4 — Cart Expiry and Guest Carts

**Guest cart lifecycle:**

1. First visit → generate `guestSessionId`, store cart in `localStorage` + Redis key `guest-cart:{sessionId}`
2. User signs up or logs in → **merge** guest cart with existing logged-in cart
3. Merge policy: for each item, take `max(guestQty, loggedInQty)` — err on the side of the customer buying more
4. After merge, delete the guest cart key; set `cart:{userId}` in Redis

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">merge_on_login</span>(redis, user_id, guest_session_id):
    guest_key  <span class="op">=</span> <span class="st">"guest-cart:"</span> <span class="op">+</span> guest_session_id
    user_key   <span class="op">=</span> <span class="st">"cart:"</span> <span class="op">+</span> <span class="fn">str</span>(user_id)

    guest_items <span class="op">=</span> redis.<span class="fn">hgetall</span>(guest_key)   <span class="cm"># {itemId: json}</span>
    user_items  <span class="op">=</span> redis.<span class="fn">hgetall</span>(user_key)

    <span class="kw">for</span> item_id, guest_val <span class="kw">in</span> guest_items.<span class="fn">items</span>():
        guest_data <span class="op">=</span> json.<span class="fn">loads</span>(guest_val)
        user_data  <span class="op">=</span> json.<span class="fn">loads</span>(user_items.<span class="fn">get</span>(item_id, <span class="st">'{"qty":0}'</span>))
        merged_qty <span class="op">=</span> <span class="fn">max</span>(guest_data[<span class="st">'qty'</span>], user_data[<span class="st">'qty'</span>])

        redis.<span class="fn">hset</span>(user_key, item_id, json.<span class="fn">dumps</span>({
            <span class="st">'qty'</span>: merged_qty,
            <span class="st">'addedAt'</span>: <span class="fn">min</span>(guest_data.<span class="fn">get</span>(<span class="st">'addedAt'</span>, <span class="nu">0</span>), user_data.<span class="fn">get</span>(<span class="st">'addedAt'</span>, <span class="nu">0</span>)),
        }))

    redis.<span class="fn">expire</span>(user_key, <span class="nu">2592000</span>)
    redis.<span class="fn">delete</span>(guest_key)</pre>
</div>

**Abandoned cart emails** are triggered by a background job: every hour, scan DynamoDB for carts with items that have not had a checkout event in 24 hours, then enqueue a notification. This is an async workflow entirely decoupled from the cart service itself.

---

## 6. The Checkout Saga

Checkout spans multiple services. Every step must succeed — or every completed step must be **compensated** (rolled back). This is the **Saga pattern**.

The eight steps of checkout:

1. **Lock cart** — prevent concurrent checkout attempts for the same user
2. **Validate stock** — confirm all items are currently available
3. **Reserve inventory** — soft-hold the items (15-min TTL)
4. **Create order record** — write order to DB in `PENDING` state
5. **Process payment** — charge the card
6. **Confirm reservation** — convert soft-hold to committed reservation
7. **Send confirmation email** — async, fire-and-forget
8. **Clear cart** — remove items from Redis and DB

### Interactive Checkout Saga Visualizer

<div class="viz-wrap">
  <div class="viz-title">Checkout Saga — Step-by-Step Execution</div>
  <div class="viz-controls">
    <button class="viz-btn" onclick="runSaga('happy')">✅ Happy Path</button>
    <button class="viz-btn danger" onclick="runSaga('payment-fail')">💳 Payment Fails (Step 5)</button>
    <button class="viz-btn danger" onclick="runSaga('stock-fail')">📦 Out of Stock (Step 2)</button>
    <button class="viz-btn" onclick="resetSaga()">↺ Reset</button>
  </div>
  <div id="saga-steps" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:center;margin-bottom:1rem;"></div>
  <div id="saga-log" style="font-size:.75rem;color:rgba(255,255,255,.5);font-family:monospace;min-height:2.5em;max-height:6em;overflow-y:auto;background:#0d0e10;border-radius:6px;padding:.5rem .8rem;"></div>
</div>

<script>
(function() {
  var sagaLabels = [
    'Lock\nCart',
    'Validate\nStock',
    'Reserve\nInventory',
    'Create\nOrder',
    'Process\nPayment',
    'Confirm\nReservation',
    'Send\nEmail',
    'Clear\nCart'
  ];

  var sagaState = [];
  var sagaTimer = null;

  function initSaga() {
    sagaState = sagaLabels.map(function(l, i) {
      return { label: l, state: 'pending' };
    });
    renderSaga();
    document.getElementById('saga-log').innerHTML = '';
  }

  function renderSaga() {
    var html = '';
    sagaState.forEach(function(step, i) {
      html += '<div class="saga-step">';
      html += '<div class="saga-box ' + step.state + '">' + step.label.replace(/\n/g, '<br>') + '</div>';
      if (i < sagaState.length - 1) {
        var arrowCls = 'saga-arrow';
        if (step.state === 'done') arrowCls += ' active';
        if (step.state === 'compensating') arrowCls += ' back';
        html += '<div class="' + arrowCls + '">' + (step.compensating ? '←' : '→') + '</div>';
      }
      html += '</div>';
    });
    document.getElementById('saga-steps').innerHTML = html;
  }

  function logSaga(msg) {
    var el = document.getElementById('saga-log');
    el.innerHTML += msg + '<br>';
    el.scrollTop = el.scrollHeight;
  }

  function delay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  async function runSaga(mode) {
    if (sagaTimer) clearTimeout(sagaTimer);
    initSaga();

    var steps = [
      { name: 'Lock cart',             ok: true },
      { name: 'Validate stock',        ok: mode !== 'stock-fail' },
      { name: 'Reserve inventory',     ok: true },
      { name: 'Create order record',   ok: true },
      { name: 'Process payment',       ok: mode !== 'payment-fail' },
      { name: 'Confirm reservation',   ok: true },
      { name: 'Send confirmation email', ok: true },
      { name: 'Clear cart',            ok: true }
    ];

    var failAt = -1;
    if (mode === 'stock-fail')   failAt = 1;
    if (mode === 'payment-fail') failAt = 4;

    for (var i = 0; i < steps.length; i++) {
      sagaState[i].state = 'running';
      renderSaga();
      logSaga('[' + (i+1) + '] ' + steps[i].name + '…');
      await delay(600);

      if (!steps[i].ok) {
        sagaState[i].state = 'failed';
        renderSaga();
        logSaga('✗ ' + steps[i].name + ' FAILED — starting compensation');
        await delay(400);

        for (var j = i - 1; j >= 0; j--) {
          if (j === 2 && mode === 'payment-fail') {
            sagaState[j].state = 'compensating';
            sagaState[j].compensating = true;
            renderSaga();
            logSaga('  ↩ Compensate: Release inventory reservation');
            await delay(500);
            sagaState[j].state = 'rolledback';
          } else if (j === 0) {
            sagaState[j].state = 'compensating';
            sagaState[j].compensating = true;
            renderSaga();
            logSaga('  ↩ Compensate: Unlock cart');
            await delay(500);
            sagaState[j].state = 'rolledback';
          }
        }
        renderSaga();
        logSaga('Saga completed with compensation. ' + (mode === 'payment-fail' ? 'Payment declined — inventory released.' : 'Item out of stock — cart unlocked.'));
        return;
      }

      sagaState[i].state = 'done';
      renderSaga();
      logSaga('✓ ' + steps[i].name);
    }

    logSaga('✓ Checkout complete! Order confirmed.');
  }

  function resetSaga() {
    initSaga();
  }

  window.runSaga   = runSaga;
  window.resetSaga = resetSaga;

  initSaga();
})();
</script>

**Compensating transactions** are not rollbacks — they are new, forward-moving operations that undo the effect of a previous step. They must be idempotent (safe to run twice) and durable (persisted to a saga state machine in DynamoDB so they survive crashes).

<div class="callout callout-yellow">
<strong>Saga state machine durability:</strong> the saga orchestrator writes its current step to a durable store before executing each action. If the orchestrator crashes mid-saga and restarts, it reads its last known state and resumes — either completing the saga or running compensation from the point of failure.
</div>

---

## 7. Inventory Reservation — Hard vs Soft Hold

Two models exist for holding stock during checkout:

<table class="comp-table">
  <thead>
    <tr>
      <th>Model</th>
      <th>How it works</th>
      <th>Pros</th>
      <th>Cons</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Hard reservation</strong></td>
      <td>Decrement stock immediately when item added to cart</td>
      <td>Simple; no TOCTOU race at checkout</td>
      <td>Abandoned carts lock up stock indefinitely; needs expiry job</td>
    </tr>
    <tr>
      <td><strong>Soft hold (recommended)</strong></td>
      <td>Tentative hold at checkout start, TTL 15 min; confirmed on payment success</td>
      <td>Stock only locked when user is actively checking out</td>
      <td>Race between two users checking out same last item</td>
    </tr>
    <tr>
      <td><strong>Optimistic — no hold</strong></td>
      <td>Check stock at payment time; fail if unavailable</td>
      <td>Zero lock contention; simplest</td>
      <td>Payment processed then stock found gone → refund needed</td>
    </tr>
  </tbody>
</table>

**Soft-hold implementation with Redis:**

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">acquire_soft_hold</span>(redis, item_id, user_id, qty):
    hold_key    <span class="op">=</span> <span class="st">"hold:"</span> <span class="op">+</span> item_id <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> <span class="fn">str</span>(user_id)
    stock_key   <span class="op">=</span> <span class="st">"stock:"</span> <span class="op">+</span> item_id
    hold_ttl    <span class="op">=</span> <span class="nu">900</span>  <span class="cm"># 15 minutes</span>

    <span class="kw">with</span> redis.<span class="fn">pipeline</span>() <span class="kw">as</span> pipe:
        <span class="kw">while</span> <span class="kw">True</span>:
            <span class="kw">try</span>:
                pipe.<span class="fn">watch</span>(stock_key)
                available <span class="op">=</span> <span class="fn">int</span>(pipe.<span class="fn">get</span>(stock_key) <span class="kw">or</span> <span class="nu">0</span>)
                <span class="kw">if</span> available <span class="op">&lt;</span> qty:
                    <span class="kw">return</span> <span class="kw">False</span>  <span class="cm"># out of stock</span>

                pipe.<span class="fn">multi</span>()
                pipe.<span class="fn">decrby</span>(stock_key, qty)
                pipe.<span class="fn">setex</span>(hold_key, hold_ttl, qty)
                pipe.<span class="fn">execute</span>()
                <span class="kw">return</span> <span class="kw">True</span>

            <span class="kw">except</span> <span class="ty">WatchError</span>:
                <span class="kw">continue</span>  <span class="cm"># concurrent modification, retry</span>

<span class="kw">def</span> <span class="fn">confirm_hold</span>(redis, item_id, user_id):
    <span class="cm"># Delete the TTL-key; stock already decremented</span>
    redis.<span class="fn">delete</span>(<span class="st">"hold:"</span> <span class="op">+</span> item_id <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> <span class="fn">str</span>(user_id))

<span class="kw">def</span> <span class="fn">release_hold</span>(redis, item_id, user_id, qty):
    <span class="cm"># Compensation: put stock back</span>
    redis.<span class="fn">incrby</span>(<span class="st">"stock:"</span> <span class="op">+</span> item_id, qty)
    redis.<span class="fn">delete</span>(<span class="st">"hold:"</span> <span class="op">+</span> item_id <span class="op">+</span> <span class="st">":"</span> <span class="op">+</span> <span class="fn">str</span>(user_id))</pre>
</div>

The `WATCH`/`MULTI`/`EXEC` pattern provides optimistic concurrency: if any other client modifies `stock:{itemId}` between the watch and execute, the transaction aborts and the client retries — eliminating the stock-going-negative race without any distributed locking.

---

## 8. Price Guarantee

A user adds an item at $99. The price changes to $129 the next day. They check out two days later. Which price applies?

<table class="comp-table">
  <thead>
    <tr>
      <th>Policy</th>
      <th>Behaviour</th>
      <th>User experience</th>
      <th>Business impact</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Cart price lock</strong></td>
      <td>Price at add-time locked for 24–48 h; after that, re-evaluate</td>
      <td><span class="badge badge-green">Good</span> User sees the price they expected</td>
      <td>Potential margin loss on price increases</td>
    </tr>
    <tr>
      <td><strong>Current price always</strong></td>
      <td>Cart always shows live price; checkout uses live price</td>
      <td><span class="badge badge-yellow">Mixed</span> Surprise at checkout if price changed</td>
      <td>Maximises margin; simple to implement</td>
    </tr>
    <tr>
      <td><strong>Notify on change</strong></td>
      <td>Price snapshot stored; on change, show banner "price changed"</td>
      <td><span class="badge badge-green">Good</span> User is informed before committing</td>
      <td>Higher engineering cost; requires event-driven price feed</td>
    </tr>
    <tr>
      <td><strong>Lower of the two</strong></td>
      <td>Charge min(add-time price, checkout price)</td>
      <td><span class="badge badge-green">Best for user</span> Never worse than expected</td>
      <td>Revenue impact on flash-sale recovery</td>
    </tr>
  </tbody>
</table>

Amazon's documented behaviour: cart shows current price; if the price changes while an item is in your cart, a notice appears at checkout. No price lock is applied. The trade-off: simplicity and accurate revenue over customer price-certainty.

**Implementation of "notify on change":** when an item is added to cart, snapshot `priceAtAdd` in the cart record. A background job subscribes to the price-change event stream. When a price event fires for `itemId`, query all active carts containing that item (secondary index on DynamoDB) and write a `priceChanged=true` flag. Cart service reads this flag at checkout time and surfaces the banner.

---

## 9. Capacity Estimate

<table class="comp-table">
  <thead>
    <tr>
      <th>Metric</th>
      <th>Estimate</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Active carts</td>
      <td>~100 million</td>
      <td>Amazon scale; each cart = one Redis Hash key</td>
    </tr>
    <tr>
      <td>Cart size in Redis</td>
      <td>~500 bytes avg</td>
      <td>~10 items × 50 bytes each (itemId + qty + price JSON)</td>
    </tr>
    <tr>
      <td>Total Redis memory</td>
      <td>~50 GB</td>
      <td>100M × 500B; fits in a large Redis cluster</td>
    </tr>
    <tr>
      <td>Add-to-cart events/sec</td>
      <td>~10,000 req/s</td>
      <td>Redis HSET; well under 1M ops/s capacity</td>
    </tr>
    <tr>
      <td>Checkout transactions/sec</td>
      <td>~5,000 tx/s</td>
      <td>Each involves 8 saga steps; saga orchestrator must scale horizontally</td>
    </tr>
    <tr>
      <td>Peak multiplier (Prime Day)</td>
      <td>10×</td>
      <td>50,000 checkouts/sec; requires pre-scaled Redis and inventory service</td>
    </tr>
    <tr>
      <td>Abandoned cart email jobs/day</td>
      <td>~2 million</td>
      <td>Async; DynamoDB scan + SQS queue + email workers</td>
    </tr>
  </tbody>
</table>

---

## 10. Architecture Summary

The complete system breaks into five tiers:

**Client tier:** React/Native app with IndexedDB-backed cart. Every mutation is written locally first, queued for sync. Sync protocol sends delta ops to the cart API, receives merged state.

**Cart API tier:** Stateless Go/Java service. Reads/writes Redis for hot path. Writes DynamoDB asynchronously (write-behind cache). Exposes `/cart/sync` endpoint for delta merge.

**Checkout orchestrator:** Saga state machine backed by DynamoDB. Each saga instance is a record with `sagaId`, `currentStep`, `status`, and `compensationLog`. Orchestrator is idempotent — re-running the same saga from any step is safe.

**Inventory service:** Redis for real-time stock counters with optimistic locking. DynamoDB for authoritative stock. Publishes `StockReserved` and `StockReleased` events to Kafka.

**Payment service:** Wraps payment processor (Stripe/Braintree). Idempotency key = `orderId` to prevent double charges on retry. Emits `PaymentSucceeded` / `PaymentFailed` events consumed by the saga orchestrator.

<div class="callout callout-green">
<strong>Key interview takeaway:</strong> The shopping cart is not a CRUD service. It is a distributed system problem that requires offline-first client design, CRDT-based merge semantics, event-sourced sync, a choreographed checkout saga, and careful inventory locking strategy — all working together.
</div>

---

{: class="marginalia" }
**Amazon's Dynamo paper<br/>(2007) on the shopping<br/>cart: "The add to cart<br/>operation can never be<br/>rejected... a 'shopping<br/>cart' that cannot<br/>accept items is just<br/>an empty promise."**

The most important design decision in this entire system is the one Amazon made in 2007: **allow the cart to accept writes even when the system is degraded.** A cart that rejects adds because a replica is down is worse for the customer than a cart that temporarily shows a slightly stale state. The OR-Set CRDT is the technical embodiment of that business decision. Every subsequent design choice — soft holds, saga compensation, delta sync — flows from this same principle: prefer availability and eventual consistency over strong consistency for user-facing cart operations.

---

{: class="marginalia" }
**The guest cart merge<br/>problem has a famous<br/>edge case: user adds<br/>2 units as guest; their<br/>logged-in cart has 3.<br/>Amazon's policy: keep<br/>max(2,3)=3, erring<br/>toward buying more.**

The "merge guest cart on login" problem appears in every e-commerce system and has no universally correct answer. Amazon chose `max(guestQty, loggedInQty)` per item. Etsy has historically chosen "union all items, keep guest quantities for new items". Neither is wrong — they reflect different product philosophies about what a cart *means* to the customer. In an interview, the right answer is: name the ambiguity, pick a policy, justify the trade-off.

---

{: class="marginalia" }
**At Amazon scale, a<br/>single checkout spans<br/>50+ microservices. Each<br/>saga step has retry<br/>logic with exponential<br/>backoff + jitter. The<br/>orchestrator is a durable<br/>DynamoDB state machine.**

Checkout sagas at Amazon scale are not simple sequential chains. Each step may itself fan out to multiple sub-services. The saga orchestrator maintains a fully durable state machine — if the entire orchestrator fleet is replaced during a deployment, in-flight sagas resume from their last committed step. Exponential backoff with jitter prevents thundering-herd retries during the payment processor brownouts that tend to happen precisely when checkout volume is highest.

---

<script>
function copyCode(btn) {
  var pre = btn.closest('.code-wrap').querySelector('pre.code-block');
  var text = pre ? pre.innerText : '';
  if (!navigator.clipboard) { btn.textContent = 'copied'; return; }
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = 'copied';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.textContent = 'copy';
      btn.classList.remove('copied');
    }, 1800);
  });
}
</script>
