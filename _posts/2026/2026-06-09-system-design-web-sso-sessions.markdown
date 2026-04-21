---
layout: post
title: "System Design: SSO and Session Management — Authentication at Scale"
date: 2026-06-09 10:00:00 +0000
categories: ["post"]
tags: [system-design, sso, oauth, jwt, sessions, authentication, security, web, interview]
series: "System Design: Web Scenarios"
---

<div style="display:inline-flex;align-items:center;gap:.5rem;background:#1e1f24;border:1px solid #2e2f35;border-radius:20px;padding:5px 14px;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:1.5rem;">
  <span style="color:#fbef8a;font-weight:700;">Series</span>
  System Design: Web Scenarios
</div>

{: class="marginalia" }
**Google's auth system<br/>is called GAIA** — Google<br/>Accounts and ID<br/>Administration. It<br/>handles every login<br/>across every Google<br/>product for billions<br/>of users, every day.

Logging into Gmail and instantly being logged into YouTube, Drive, and Maps feels like magic. It isn't. Behind that seamless experience sits one of the most carefully engineered systems in software: a distributed Single Sign-On (SSO) infrastructure that manages billions of active sessions, issues and rotates cryptographic tokens, and must never go down — because when it does, half the internet notices.

**The interview question:** *Design the authentication system for a company like Google, where logging into one service (Gmail) also logs you into all other services (Drive, YouTube, Maps). Handle millions of sessions, token refresh, logout-everywhere, and support third-party apps via OAuth.*

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

.flow-step { display:flex;align-items:flex-start;gap:.8rem;padding:.7rem 0;border-bottom:1px solid #1e1f24; }
.flow-step:last-child { border-bottom:none; }
.step-num { min-width:26px;height:26px;border-radius:50%;background:#1e1f24;border:1px solid #3a3b40;display:flex;align-items:center;justify-content:center;font-size:.72rem;color:#fbef8a;font-weight:700;flex-shrink:0;margin-top:2px; }
.step-body { color:rgba(255,255,255,.78);font-size:.84rem;line-height:1.65; }
.step-body strong { color:#fff; }
.step-body code { background:#1e1f24;padding:1px 5px;border-radius:3px;font-size:.8em;color:#7bcdab; }

.token-part { display:inline-block;padding:3px 8px;border-radius:4px;font-family:monospace;font-size:.8rem;margin:2px; }
.token-header  { background:#1a2030;color:#89c0d0; }
.token-payload { background:#1a2a1a;color:#7bcdab; }
.token-sig     { background:#2a1a1a;color:#f08080; }

.capacity-table { width:100%;border-collapse:collapse;font-size:.82rem;margin:1.5rem 0; }
.capacity-table th { background:#1e1f24;color:#fbef8a;padding:10px 14px;text-align:left;border-bottom:1px solid #2e2f35; }
.capacity-table td { padding:9px 14px;border-bottom:1px solid #1e1f24;color:rgba(255,255,255,.78); }
.capacity-table td:last-child { color:#7bcdab;font-weight:600; }
.capacity-table tr:hover td { background:#1a1b20; }
</style>

## 1. Session vs Token: The Fundamental Choice

Every authentication system faces the same foundational question first: where does the server keep track of who is logged in?

### Server-Side Sessions

The traditional model: a user logs in, the server generates a random `sessionId`, stores the session data in a database (or Redis), and sends only the `sessionId` to the browser as a cookie. On every subsequent request, the server looks up the `sessionId` to find the user.

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Login: server creates a session in Redis</span>
<span class="kw">def</span> <span class="fn">login</span>(username, password):
    user = db.<span class="fn">find_user</span>(username)
    <span class="kw">if not</span> <span class="fn">verify_password</span>(password, user.password_hash):
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"invalid credentials"</span>)

    session_id = <span class="fn">generate_random_id</span>()        <span class="cm"># e.g. "a3f9c..." (128-bit random)</span>
    session_data = {
        <span class="st">"userId"</span>:    user.id,
        <span class="st">"createdAt"</span>: <span class="fn">now</span>(),
        <span class="st">"expiresAt"</span>: <span class="fn">now</span>() + <span class="ty">timedelta</span>(days=<span class="nu">30</span>),
        <span class="st">"ip"</span>:        request.remote_addr,
        <span class="st">"userAgent"</span>: request.headers[<span class="st">"User-Agent"</span>],
    }
    redis.<span class="fn">setex</span>(
        <span class="st">"session:"</span> + session_id,
        <span class="nu">86400</span> * <span class="nu">30</span>,           <span class="cm"># TTL: 30 days in seconds</span>
        <span class="fn">json_encode</span>(session_data)
    )
    <span class="kw">return</span> session_id       <span class="cm"># stored in browser cookie</span>

<span class="cm"># Every request: server validates the session</span>
<span class="kw">def</span> <span class="fn">authenticate_request</span>(request):
    session_id = request.cookies.<span class="fn">get</span>(<span class="st">"session_id"</span>)
    session = redis.<span class="fn">get</span>(<span class="st">"session:"</span> + session_id)
    <span class="kw">if not</span> session <span class="kw">or</span> session[<span class="st">"expiresAt"</span>] <span class="op">&lt;</span> <span class="fn">now</span>():
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"session expired or invalid"</span>)
    <span class="kw">return</span> session[<span class="st">"userId"</span>]</pre>
</div>

**Pros:** Instant revocation — delete the key from Redis and the user is immediately logged out on their next request. Small cookie (just the ID). Full control over session lifecycle.

**Cons:** Stateful — every application server must reach the same session store, adding a network round-trip to every authenticated request. The session store becomes a critical single point of failure.

### JWT (JSON Web Tokens)

A different model: the server signs a token containing the user's identity and hands it back to the client. The client sends that token on every request. The server verifies the *signature* locally — no database lookup required.

A JWT has three base64url-encoded parts separated by dots:

<div style="margin:1rem 0;padding:1rem;background:#111214;border:1px solid #2e2f35;border-radius:8px;word-break:break-all;line-height:2;">
  <span class="token-part token-header">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9</span><span style="color:rgba(255,255,255,.3);">.</span><span class="token-part token-payload">eyJ1c2VySWQiOiJ1XzEyMyIsImVtYWlsIjoiYWxpY2VAZ21haWwuY29tIiwidG9rZW5WZXJzaW9uIjo3LCJpYXQiOjE3MTc5MzQwMDAsImV4cCI6MTcxNzkzNDkwMH0</span><span style="color:rgba(255,255,255,.3);">.</span><span class="token-part token-sig">SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c</span>
</div>
<div style="display:flex;gap:1rem;font-size:.75rem;margin-bottom:1rem;flex-wrap:wrap;">
  <span><span class="token-part token-header" style="margin:0;">header</span> — algorithm &amp; type</span>
  <span><span class="token-part token-payload" style="margin:0;">payload</span> — user data (claims)</span>
  <span><span class="token-part token-sig" style="margin:0;">signature</span> — HMAC or RSA over header.payload</span>
</div>

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Login: server issues a signed JWT</span>
<span class="kw">def</span> <span class="fn">login_jwt</span>(username, password):
    user = db.<span class="fn">find_user</span>(username)
    <span class="kw">if not</span> <span class="fn">verify_password</span>(password, user.password_hash):
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"invalid credentials"</span>)

    payload = {
        <span class="st">"userId"</span>:       user.id,
        <span class="st">"email"</span>:        user.email,
        <span class="st">"tokenVersion"</span>: user.token_version,   <span class="cm"># for revocation (section 2)</span>
        <span class="st">"iat"</span>:          <span class="fn">now_unix</span>(),
        <span class="st">"exp"</span>:          <span class="fn">now_unix</span>() + <span class="nu">900</span>,      <span class="cm"># expires in 15 minutes</span>
    }
    <span class="kw">return</span> jwt.<span class="fn">encode</span>(payload, SECRET_KEY, algorithm=<span class="st">"HS256"</span>)

<span class="cm"># Every request: server verifies locally — NO Redis lookup</span>
<span class="kw">def</span> <span class="fn">authenticate_request_jwt</span>(request):
    token = request.headers.<span class="fn">get</span>(<span class="st">"Authorization"</span>).<span class="fn">split</span>()[<span class="nu">1</span>]
    <span class="kw">try</span>:
        claims = jwt.<span class="fn">decode</span>(token, SECRET_KEY, algorithms=[<span class="st">"HS256"</span>])
    <span class="kw">except</span> jwt.<span class="ty">ExpiredSignatureError</span>:
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"token expired"</span>)
    <span class="kw">except</span> jwt.<span class="ty">InvalidTokenError</span>:
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"invalid token"</span>)

    <span class="cm"># Optionally verify tokenVersion against DB (section 2)</span>
    <span class="kw">return</span> claims[<span class="st">"userId"</span>]</pre>
</div>

**Pros:** Stateless — any server can verify a token without shared storage. Scales horizontally with zero coordination. Works naturally across domains.

**Cons:** The logout problem — a signed token is valid until it expires. You can't "un-sign" it. If a token is stolen, you're stuck until expiry (up to 15 minutes for a short-lived token, or days if misconfigured).

<table class="comp-table">
  <thead><tr><th>Property</th><th>Server Sessions</th><th>JWT</th></tr></thead>
  <tbody>
    <tr><td>Revocation speed</td><td><span class="badge badge-green">Instant</span></td><td><span class="badge badge-red">On expiry only</span></td></tr>
    <tr><td>Horizontal scaling</td><td><span class="badge badge-yellow">Needs shared store</span></td><td><span class="badge badge-green">Zero coordination</span></td></tr>
    <tr><td>Cross-domain</td><td><span class="badge badge-red">Cookie limitations</span></td><td><span class="badge badge-green">Header-based, works anywhere</span></td></tr>
    <tr><td>Token size</td><td><span class="badge badge-green">~50 bytes (ID only)</span></td><td><span class="badge badge-yellow">~200–500 bytes</span></td></tr>
    <tr><td>DB lookup per request</td><td><span class="badge badge-red">Always</span></td><td><span class="badge badge-green">Never (or optional)</span></td></tr>
    <tr><td>Payload tampering</td><td><span class="badge badge-green">Not possible</span></td><td><span class="badge badge-green">Detected by signature</span></td></tr>
  </tbody>
</table>

---

## 2. The JWT Revocation Problem

{: class="marginalia" }
The JWT spec (RFC 7519)<br/>defines no revocation<br/>mechanism at all.<br/>This was a deliberate<br/>trade-off for<br/>statelessness — and<br/>the source of<br/>countless security bugs.

A JWT cannot be "un-issued." Once signed, it is valid until its `exp` claim passes. This creates a fundamental tension: short expiry improves security but creates constant re-authentication friction. Long expiry improves UX but leaves stolen tokens valid for hours or days.

Three real solutions exist, each with different trade-offs:

### Solution A: Short-Lived Access Tokens + Refresh Tokens

This is the industry standard (used by Google, GitHub, Stripe, and most major platforms).

- **Access token:** Short-lived (15 minutes). Stateless JWT. Used for every API call.
- **Refresh token:** Long-lived (30 days). Opaque random string stored in the DB. Used *only* to get a new access token.

Revocation is now possible: delete the refresh token from the database. The access token lives at most 15 more minutes — an acceptable window for most threat models.

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Issuing tokens at login</span>
<span class="kw">def</span> <span class="fn">login_with_refresh</span>(username, password):
    user = db.<span class="fn">authenticate</span>(username, password)

    access_token = jwt.<span class="fn">encode</span>({
        <span class="st">"userId"</span>: user.id,
        <span class="st">"exp"</span>:    <span class="fn">now_unix</span>() + <span class="nu">900</span>,     <span class="cm"># 15 minutes</span>
    }, SECRET_KEY)

    refresh_token = <span class="fn">generate_secure_random</span>(<span class="nu">64</span>)
    db.<span class="fn">store_refresh_token</span>({
        <span class="st">"token"</span>:     <span class="fn">sha256</span>(refresh_token),  <span class="cm"># store hash, not plaintext</span>
        <span class="st">"userId"</span>:    user.id,
        <span class="st">"expiresAt"</span>: <span class="fn">now</span>() + <span class="ty">timedelta</span>(days=<span class="nu">30</span>),
        <span class="st">"deviceId"</span>:  request.<span class="fn">get_device_id</span>(),
    })

    <span class="kw">return</span> {<span class="st">"access_token"</span>: access_token, <span class="st">"refresh_token"</span>: refresh_token}

<span class="cm"># Client calls this when access_token expires (HTTP 401)</span>
<span class="kw">def</span> <span class="fn">refresh_access_token</span>(refresh_token):
    token_hash = <span class="fn">sha256</span>(refresh_token)
    record = db.<span class="fn">find_refresh_token</span>(token_hash)

    <span class="kw">if not</span> record <span class="kw">or</span> record[<span class="st">"expiresAt"</span>] <span class="op">&lt;</span> <span class="fn">now</span>():
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"refresh token invalid or expired"</span>)

    <span class="cm"># Rotate: old token out, new token in (prevents replay)</span>
    db.<span class="fn">delete_refresh_token</span>(token_hash)
    <span class="kw">return</span> <span class="fn">login_with_refresh</span>.<span class="fn">issue_new_pair</span>(record[<span class="st">"userId"</span>])</pre>
</div>

### Solution B: Token Blacklist in Redis

When a token is revoked, store its `jti` (JWT ID claim) in Redis with TTL equal to the token's remaining lifetime. Each request checks the blacklist.

<div class="callout callout-yellow">
<strong>Trade-off:</strong> This effectively reintroduces a Redis lookup on every request — partially defeating the "stateless" argument for JWT. The upside is that only revoked tokens are in the blacklist (usually a tiny fraction), so the data structure stays small.
</div>

### Solution C: Token Versioning

Store a `tokenVersion` integer on the user record in the database. Include it in the JWT payload. On every request, verify the JWT's `tokenVersion` matches the current value in the DB.

Revoking all sessions for a user is a single `UPDATE users SET token_version = token_version + 1 WHERE id = ?`. All existing tokens fail their version check on the next request.

<div class="code-wrap">
<div class="code-lang">sql <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">-- Revoke all sessions for a user</span>
<span class="kw">UPDATE</span> users
<span class="kw">SET</span>    token_version <span class="op">=</span> token_version <span class="op">+</span> <span class="nu">1</span>
<span class="kw">WHERE</span>  id <span class="op">=</span> <span class="st">'user_123'</span>;

<span class="cm">-- Application check (pseudo-code in SQL style)</span>
<span class="cm">-- jwt.tokenVersion must equal users.token_version</span>
<span class="kw">SELECT</span> token_version
<span class="kw">FROM</span>   users
<span class="kw">WHERE</span>  id <span class="op">=</span> jwt_claim_user_id
  <span class="kw">AND</span>  token_version <span class="op">=</span> jwt_claim_token_version;</pre>
</div>

This approach re-introduces one DB read per request, but only a single integer column — fast with a primary key lookup and easily cached.

---

## 3. SSO Architecture

{: class="marginalia" }
The protocol underlying<br/>most SSO systems is<br/>**SAML 2.0** (enterprises)<br/>or **OpenID Connect**<br/>(modern web). OIDC is<br/>OAuth 2.0 + an identity<br/>layer (the `id_token`).<br/>Google uses OIDC.

Single Sign-On answers the question: *how does logging into one service automatically authenticate you to all others?* The answer is a centralized **Identity Provider (IdP)** — `accounts.google.com` — that all services (called **Service Providers** or **Relying Parties**) delegate authentication to.

The canonical flow:

<div class="viz-wrap">
<div class="viz-title">SSO Authentication Flow</div>
<div class="flow-step"><div class="step-num">1</div><div class="step-body">User visits <code>mail.google.com</code>. Gmail checks for a local session — none found. Gmail redirects to <code>accounts.google.com/login?service=gmail&amp;return_to=https://mail.google.com</code></div></div>
<div class="flow-step"><div class="step-num">2</div><div class="step-body">User enters credentials on <code>accounts.google.com</code>. Auth Server verifies password (and MFA if enrolled). Creates a long-lived <strong>SSO session</strong> in Redis, sets an <code>accounts.google.com</code> cookie (httpOnly, Secure).</div></div>
<div class="flow-step"><div class="step-num">3</div><div class="step-body">Auth Server generates a short-lived (60-second) <strong>SSO token</strong> — a signed, single-use ticket. Redirects to <code>mail.google.com?sso_token=XYZ</code>.</div></div>
<div class="flow-step"><div class="step-num">4</div><div class="step-body">Gmail sends <code>sso_token</code> to Auth Server for validation (server-to-server). Auth Server verifies signature, marks token as used (prevents replay), returns user identity.</div></div>
<div class="flow-step"><div class="step-num">5</div><div class="step-body">Gmail creates its own local session for the user. Sets a <code>mail.google.com</code> cookie. User is now authenticated to Gmail.</div></div>
<div class="flow-step"><div class="step-num">6</div><div class="step-body">User clicks <code>youtube.com</code>. YouTube has no local session. Redirects to <code>accounts.google.com</code>. Auth Server detects the existing SSO session cookie — <strong>no credentials re-entry needed</strong>. Issues a new SSO token for YouTube. Steps 3–5 repeat silently.</div></div>
</div>

The key architectural insight: each service maintains its *own* local session (for performance — they don't hit the Auth Server on every request), but all of them were bootstrapped via the same central SSO session.

<div class="callout callout-green">
<strong>The SSO cookie lives on a different domain</strong> (<code>accounts.google.com</code>) from the service cookies (<code>mail.google.com</code>, <code>youtube.com</code>). Browsers scope cookies to domains, so the SSO cookie travels with every request to the Auth Server but is invisible to the individual services. This is not a bug — it's the design.
</div>

### The SSO Token Exchange (Server-to-Server Validation)

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm"># Auth Server: issue SSO token after successful authentication</span>
<span class="kw">def</span> <span class="fn">issue_sso_token</span>(user_id, service, return_to):
    token_id = <span class="fn">generate_random_id</span>()
    token_data = {
        <span class="st">"userId"</span>:    user_id,
        <span class="st">"service"</span>:   service,
        <span class="st">"return_to"</span>: return_to,
        <span class="st">"createdAt"</span>: <span class="fn">now_unix</span>(),
        <span class="st">"expiresAt"</span>: <span class="fn">now_unix</span>() + <span class="nu">60</span>,   <span class="cm"># 60-second window</span>
        <span class="st">"used"</span>:      <span class="ty">False</span>,
    }
    redis.<span class="fn">setex</span>(<span class="st">"sso_token:"</span> + token_id, <span class="nu">120</span>, <span class="fn">json_encode</span>(token_data))
    <span class="kw">return</span> token_id

<span class="cm"># Service Provider: validate SSO token (server-to-server)</span>
<span class="kw">def</span> <span class="fn">validate_sso_token</span>(token_id):
    key = <span class="st">"sso_token:"</span> + token_id
    data = redis.<span class="fn">get</span>(key)

    <span class="kw">if not</span> data:
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"token not found or expired"</span>)
    <span class="kw">if</span> data[<span class="st">"expiresAt"</span>] <span class="op">&lt;</span> <span class="fn">now_unix</span>():
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"token expired"</span>)
    <span class="kw">if</span> data[<span class="st">"used"</span>]:
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"token already used — replay attack?"</span>)

    <span class="cm"># Mark as used atomically to prevent replay</span>
    redis.<span class="fn">hset</span>(key, <span class="st">"used"</span>, <span class="ty">True</span>)

    <span class="kw">return</span> data[<span class="st">"userId"</span>]</pre>
</div>

---

## 4. OAuth 2.0 + PKCE for Third-Party Apps

{: class="marginalia" }
**OAuth 2.0 is not an<br/>authentication protocol.**<br/>It is an authorization<br/>framework. OpenID<br/>Connect (OIDC) adds<br/>the identity layer on<br/>top. "Login with Google"<br/>is OIDC, not raw OAuth.

OAuth solves a different problem: how does a third-party application (say, a calendar app) get limited access to your Google data, without you giving it your Google password?

The **Authorization Code Flow with PKCE** (Proof Key for Code Exchange) is the current standard for all OAuth clients, especially mobile and single-page apps that cannot safely store a client secret.

### Why PKCE?

Without PKCE, the authorization code returned in the redirect URL could be intercepted by a malicious app on the same device (common on mobile — any app can register a URL scheme). PKCE makes the authorization code useless without the original `code_verifier` known only to the legitimate app.

<div class="viz-wrap">
<div class="viz-title">OAuth 2.0 + PKCE — Authorization Code Flow</div>
<div class="flow-step"><div class="step-num">1</div><div class="step-body"><strong>App generates PKCE pair:</strong><br/>
<code>code_verifier</code> = 64 random bytes (base64url-encoded)<br/>
<code>code_challenge</code> = BASE64URL(SHA256(code_verifier))<br/>
App stores <code>code_verifier</code> in memory (never sent to server).</div></div>
<div class="flow-step"><div class="step-num">2</div><div class="step-body"><strong>Redirect user to Auth Server:</strong><br/>
<code>GET /authorize?response_type=code&amp;client_id=APP_ID&amp;redirect_uri=https://app.example.com/callback&amp;scope=email+calendar&amp;code_challenge=CHALLENGE&amp;code_challenge_method=S256&amp;state=RANDOM_STATE</code><br/>
The <code>state</code> parameter prevents CSRF attacks.</div></div>
<div class="flow-step"><div class="step-num">3</div><div class="step-body"><strong>User authenticates and consents.</strong> Auth Server stores <code>code_challenge</code> alongside the generated authorization code. Redirects to:<br/>
<code>https://app.example.com/callback?code=AUTH_CODE&amp;state=RANDOM_STATE</code></div></div>
<div class="flow-step"><div class="step-num">4</div><div class="step-body"><strong>App exchanges code for tokens</strong> (back-channel, server-to-server):<br/>
<code>POST /token { grant_type=authorization_code, code=AUTH_CODE, redirect_uri=..., code_verifier=VERIFIER }</code><br/>
Auth Server recomputes SHA256(code_verifier) and verifies it matches the stored code_challenge. If it does, issues tokens.</div></div>
<div class="flow-step"><div class="step-num">5</div><div class="step-body"><strong>Auth Server responds:</strong><br/>
<code>{ "access_token": "...", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "...", "id_token": "..." }</code><br/>
The <code>id_token</code> is an OIDC JWT containing the user's identity (sub, email, name).</div></div>
</div>

<div class="code-wrap">
<div class="code-lang">javascript <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="cm">// PKCE: generating the code_verifier and code_challenge</span>
<span class="kw">async function</span> <span class="fn">generatePKCE</span>() {
    <span class="cm">// 1. Generate a cryptographically random verifier</span>
    <span class="kw">const</span> array = <span class="kw">new</span> <span class="ty">Uint8Array</span>(<span class="nu">64</span>);
    crypto.<span class="fn">getRandomValues</span>(array);
    <span class="kw">const</span> verifier = <span class="fn">base64URLEncode</span>(array);

    <span class="cm">// 2. Hash it: challenge = BASE64URL(SHA256(verifier))</span>
    <span class="kw">const</span> data = <span class="kw">new</span> <span class="ty">TextEncoder</span>().<span class="fn">encode</span>(verifier);
    <span class="kw">const</span> hashBuffer = <span class="kw">await</span> crypto.subtle.<span class="fn">digest</span>(<span class="st">"SHA-256"</span>, data);
    <span class="kw">const</span> challenge = <span class="fn">base64URLEncode</span>(<span class="kw">new</span> <span class="ty">Uint8Array</span>(hashBuffer));

    <span class="kw">return</span> { verifier, challenge };
}

<span class="kw">function</span> <span class="fn">base64URLEncode</span>(buffer) {
    <span class="kw">return</span> <span class="ty">btoa</span>(<span class="ty">String</span>.<span class="fn">fromCharCode</span>(...buffer))
        .<span class="fn">replace</span>(<span class="op">/\+/g</span>, <span class="st">"-"</span>)
        .<span class="fn">replace</span>(<span class="op">/\//g</span>, <span class="st">"_"</span>)
        .<span class="fn">replace</span>(<span class="op">/=/g</span>, <span class="st">""</span>);
}</pre>
</div>

---

## 5. Interactive: JWT Playground

<div class="viz-wrap" id="jwt-playground">
<div class="viz-title">JWT Decode &amp; Tamper Playground</div>

<div style="margin-bottom:.8rem;">
  <label style="font-size:.78rem;color:rgba(255,255,255,.5);display:block;margin-bottom:.3rem;">JWT Token</label>
  <textarea id="jwt-input" style="width:100%;box-sizing:border-box;background:#0d0e10;border:1px solid #2e2f35;border-radius:6px;color:rgba(255,255,255,.8);font-family:'JetBrains Mono','Fira Code',monospace;font-size:.75rem;padding:.6rem;line-height:1.5;resize:vertical;min-height:80px;" spellcheck="false"></textarea>
</div>

<div class="viz-controls">
  <button class="viz-btn active" onclick="decodeJWT()">Decode</button>
  <button class="viz-btn" onclick="tamperJWT()" id="tamper-btn">Tamper Payload</button>
  <button class="viz-btn" onclick="resetJWT()">Reset</button>
</div>

<div id="jwt-output" style="font-size:.8rem;"></div>
</div>

<script>
(function() {
  var SAMPLE_SECRET = "sso-demo-secret-key";

  var samplePayload = {
    userId: "u_4829",
    email: "alice@gmail.com",
    tokenVersion: 7,
    iat: Math.floor(Date.now() / 1000) - 120,
    exp: Math.floor(Date.now() / 1000) + 780
  };

  function b64url(str) {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  function buildSampleJWT() {
    var header  = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    var payload = b64url(JSON.stringify(samplePayload));
    var sig = b64url("demo-signature-" + header + "." + payload);
    return header + "." + payload + "." + sig;
  }

  function atobSafe(s) {
    var r = s.replace(/-/g, "+").replace(/_/g, "/");
    while (r.length % 4) r += "=";
    try { return atob(r); } catch(e) { return null; }
  }

  window.decodeJWT = function() {
    var token = document.getElementById("jwt-input").value.trim();
    var parts = token.split(".");
    if (parts.length !== 3) {
      document.getElementById("jwt-output").innerHTML = "<p style='color:#f08080'>Invalid JWT format — expected 3 parts separated by dots.</p>";
      return;
    }
    var headerRaw  = atobSafe(parts[0]);
    var payloadRaw = atobSafe(parts[1]);
    if (!headerRaw || !payloadRaw) {
      document.getElementById("jwt-output").innerHTML = "<p style='color:#f08080'>Could not base64-decode JWT parts.</p>";
      return;
    }
    var headerObj, payloadObj;
    try { headerObj  = JSON.parse(headerRaw); }  catch(e) { headerObj  = {}; }
    try { payloadObj = JSON.parse(payloadRaw); } catch(e) { payloadObj = {}; }

    var now   = Math.floor(Date.now() / 1000);
    var expTs = payloadObj.exp;
    var iatTs = payloadObj.iat;
    var expStr = expTs ? (expTs > now
      ? "<span style='color:#7bcdab'>valid — expires in " + Math.round((expTs - now) / 60) + " min " + ((expTs - now) % 60) + " sec</span>"
      : "<span style='color:#f08080'>EXPIRED " + Math.abs(Math.round((now - expTs) / 60)) + " min ago</span>")
      : "<span style='color:rgba(255,255,255,.4)'>no exp claim</span>";

    var sigNote = token === buildSampleJWT()
      ? "<span style='color:#7bcdab'>&#10003; VALID SIGNATURE</span>"
      : "<span style='color:#f08080'>&#10007; INVALID SIGNATURE — payload has been tampered</span>";

    document.getElementById("jwt-output").innerHTML =
      "<div style='display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:.5rem;'>" +
      "<div><div style='font-size:.7rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem;'>Header <span class='token-part token-header' style='font-size:.65rem;'>part 1</span></div>" +
      "<pre style='background:#0d0e10;border:1px solid #1e1f24;border-radius:6px;padding:.7rem;margin:0;font-size:.75rem;color:#89c0d0;overflow:auto;'>" + JSON.stringify(headerObj, null, 2) + "</pre></div>" +
      "<div><div style='font-size:.7rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem;'>Payload <span class='token-part token-payload' style='font-size:.65rem;'>part 2</span></div>" +
      "<pre style='background:#0d0e10;border:1px solid #1e1f24;border-radius:6px;padding:.7rem;margin:0;font-size:.75rem;color:#7bcdab;overflow:auto;'>" + JSON.stringify(payloadObj, null, 2) + "</pre></div>" +
      "</div>" +
      "<div style='margin-top:.8rem;padding:.6rem .8rem;background:#0d0e10;border:1px solid #1e1f24;border-radius:6px;font-size:.78rem;'>" +
      "<div style='margin-bottom:.3rem;'><strong style='color:rgba(255,255,255,.5);'>Expiry:</strong> " + expStr + "</div>" +
      "<div><strong style='color:rgba(255,255,255,.5);'>Signature:</strong> " + sigNote + "</div>" +
      "</div>";
  };

  window.tamperJWT = function() {
    var token  = document.getElementById("jwt-input").value.trim();
    var parts  = token.split(".");
    if (parts.length !== 3) return;
    var payloadRaw = atobSafe(parts[1]);
    if (!payloadRaw) return;
    var obj;
    try { obj = JSON.parse(payloadRaw); } catch(e) { return; }
    obj.email = "hacker@evil.com";
    obj.userId = "admin";
    var newPayload = b64url(JSON.stringify(obj));
    document.getElementById("jwt-input").value = parts[0] + "." + newPayload + "." + parts[2];
    window.decodeJWT();
  };

  window.resetJWT = function() {
    document.getElementById("jwt-input").value = buildSampleJWT();
    window.decodeJWT();
  };

  document.addEventListener("DOMContentLoaded", function() {
    var el = document.getElementById("jwt-input");
    if (el) {
      el.value = buildSampleJWT();
      window.decodeJWT();
    }
  });

  var el = document.getElementById("jwt-input");
  if (el) { el.value = buildSampleJWT(); setTimeout(window.decodeJWT, 0); }
})();
</script>

---

## 6. Interactive: SSO Flow Visualizer

<div class="viz-wrap" id="sso-demo">
<div class="viz-title">SSO Session Propagation</div>

<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:.8rem;margin-bottom:1.2rem;" id="sso-boxes">
  <div id="box-auth" style="background:#1a1b1f;border:2px solid #2e2f35;border-radius:10px;padding:.8rem;text-align:center;transition:all .4s;">
    <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:.3rem;">Auth Server</div>
    <div style="font-size:.85rem;color:#fbef8a;font-weight:700;">accounts.google.com</div>
    <div id="auth-status" style="font-size:.72rem;margin-top:.4rem;color:rgba(255,255,255,.4);">Idle</div>
  </div>
  <div id="box-gmail" style="background:#1a1b1f;border:2px solid #2e2f35;border-radius:10px;padding:.8rem;text-align:center;transition:all .4s;">
    <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:.3rem;">Service</div>
    <div style="font-size:.85rem;color:rgba(255,255,255,.75);font-weight:700;">Gmail</div>
    <div id="gmail-status" style="font-size:.72rem;margin-top:.4rem;color:rgba(255,255,255,.4);">Not logged in</div>
  </div>
  <div id="box-youtube" style="background:#1a1b1f;border:2px solid #2e2f35;border-radius:10px;padding:.8rem;text-align:center;transition:all .4s;">
    <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:.3rem;">Service</div>
    <div style="font-size:.85rem;color:rgba(255,255,255,.75);font-weight:700;">YouTube</div>
    <div id="youtube-status" style="font-size:.72rem;margin-top:.4rem;color:rgba(255,255,255,.4);">Not logged in</div>
  </div>
  <div id="box-drive" style="background:#1a1b1f;border:2px solid #2e2f35;border-radius:10px;padding:.8rem;text-align:center;transition:all .4s;">
    <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:.3rem;">Service</div>
    <div style="font-size:.85rem;color:rgba(255,255,255,.75);font-weight:700;">Drive</div>
    <div id="drive-status" style="font-size:.72rem;margin-top:.4rem;color:rgba(255,255,255,.4);">Not logged in</div>
  </div>
</div>

<div class="viz-controls">
  <button class="viz-btn active" onclick="ssoLogin()" id="btn-login">Login to Gmail</button>
  <button class="viz-btn" onclick="ssoVisit('youtube')" id="btn-yt" disabled>Visit YouTube</button>
  <button class="viz-btn" onclick="ssoVisit('drive')" id="btn-drive" disabled>Visit Drive</button>
  <button class="viz-btn danger" onclick="ssoLogoutAll()" id="btn-logout" disabled>Logout Everywhere</button>
</div>

<div id="sso-log" style="background:#0d0e10;border:1px solid #1e1f24;border-radius:6px;padding:.8rem;font-size:.75rem;font-family:'JetBrains Mono','Fira Code',monospace;min-height:90px;max-height:180px;overflow-y:auto;color:rgba(255,255,255,.65);"></div>
</div>

<script>
(function() {
  var ssoActive = false;
  var gmailSession = false;
  var ytSession = false;
  var driveSession = false;
  var logEl = document.getElementById("sso-log");
  var steps = [];
  var stepIdx = 0;

  function log(msg, color) {
    color = color || "rgba(255,255,255,.65)";
    var ts = new Date().toLocaleTimeString();
    logEl.innerHTML += "<span style='color:rgba(255,255,255,.3);'>[" + ts + "]</span> <span style='color:" + color + ";'>" + msg + "</span>\n";
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setBox(id, borderColor, statusText, statusColor) {
    var box = document.getElementById("box-" + id);
    var stat = document.getElementById(id + "-status");
    if (box) box.style.borderColor = borderColor;
    if (stat) { stat.textContent = statusText; stat.style.color = statusColor; }
  }

  window.ssoLogin = function() {
    if (gmailSession) { log("Already logged in to Gmail.", "rgba(255,255,255,.4)"); return; }
    log("User visits mail.google.com — no local session found.", "#fbef8a");
    setTimeout(function() {
      log("Gmail redirects to accounts.google.com/login ...", "rgba(255,255,255,.6)");
      setBox("auth", "#fbef8a", "Processing login...", "#fbef8a");
    }, 400);
    setTimeout(function() {
      log("User submits credentials. Password verified.", "#7bcdab");
      ssoActive = true;
      setBox("auth", "#7bcdab", "SSO session active", "#7bcdab");
    }, 1000);
    setTimeout(function() {
      log("Auth Server issues SSO token (60s TTL). Redirects to Gmail.", "#7bcdab");
    }, 1600);
    setTimeout(function() {
      log("Gmail validates SSO token (server-to-server). Creates local session.", "#7bcdab");
      gmailSession = true;
      setBox("gmail", "#7bcdab", "Logged in", "#7bcdab");
      document.getElementById("btn-yt").disabled = false;
      document.getElementById("btn-drive").disabled = false;
      document.getElementById("btn-logout").disabled = false;
    }, 2200);
  };

  window.ssoVisit = function(service) {
    if (!ssoActive) { log("No active SSO session.", "#f08080"); return; }
    var already = service === "youtube" ? ytSession : driveSession;
    if (already) { log("Already logged in to " + service + ".", "rgba(255,255,255,.4)"); return; }
    log("User visits " + service + ".com — no local session.", "#fbef8a");
    setTimeout(function() {
      log(service + " redirects to accounts.google.com ...", "rgba(255,255,255,.6)");
      setBox("auth", "#fbef8a", "Checking SSO session...", "#fbef8a");
    }, 300);
    setTimeout(function() {
      log("SSO session found — no credentials needed. Issuing token silently.", "#7bcdab");
      setBox("auth", "#7bcdab", "SSO session active", "#7bcdab");
    }, 800);
    setTimeout(function() {
      log(service + " validates token. Local session created. Done.", "#7bcdab");
      if (service === "youtube") { ytSession = true; setBox("youtube", "#7bcdab", "Logged in", "#7bcdab"); }
      else { driveSession = true; setBox("drive", "#7bcdab", "Logged in", "#7bcdab"); }
    }, 1400);
  };

  window.ssoLogoutAll = function() {
    log("User clicked 'Sign out of all devices'.", "#f08080");
    setTimeout(function() {
      log("Auth Server: all refresh tokens deleted for user.", "#f08080");
      log("Auth Server: tokenVersion incremented — all JWTs now invalid.", "#f08080");
    }, 400);
    setTimeout(function() {
      log("SSO session destroyed. All service sessions expiring...", "#f08080");
      ssoActive = false; gmailSession = false; ytSession = false; driveSession = false;
      setBox("auth",    "#2e2f35", "Idle",          "rgba(255,255,255,.4)");
      setBox("gmail",   "#2e2f35", "Not logged in", "rgba(255,255,255,.4)");
      setBox("youtube", "#2e2f35", "Not logged in", "rgba(255,255,255,.4)");
      setBox("drive",   "#2e2f35", "Not logged in", "rgba(255,255,255,.4)");
      document.getElementById("btn-yt").disabled = true;
      document.getElementById("btn-drive").disabled = true;
      document.getElementById("btn-logout").disabled = true;
    }, 1200);
  };
})();
</script>

---

## 7. Session Storage at Scale

{: class="marginalia" }
**Redis is not a database.**<br/>It is an in-memory<br/>store with optional<br/>persistence. For session<br/>data you can afford<br/>to lose (user just<br/>logs in again), this<br/>is fine. For refresh<br/>tokens, you need<br/>durability — use<br/>Redis AOF or a proper DB.

Google has roughly 5 billion active sessions. Keeping all of them in a single Redis instance is impossible (memory limit) and unwise (single point of failure). The solution is tiered storage based on session activity.

**Hot tier — Redis Cluster:**
- Sessions active in the last 7 days
- Sharded by `sessionId` across 50+ nodes (~50 GB each)
- O(1) reads, sub-millisecond latency
- LRU eviction pushes cold sessions to warm tier

**Warm tier — Redis with disk persistence:**
- Sessions 7–30 days inactive
- Slower access acceptable — user is returning after a gap
- When accessed, session is promoted back to hot tier

**Cold tier — Cassandra:**
- Sessions 30+ days inactive (keep for "remember me" scenarios)
- Wide-column model: partition key is `userId`, clustering key is `sessionId`
- Batch deletion of expired sessions via TTL

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">class</span> <span class="ty">TieredSessionStore</span>:

    <span class="kw">def</span> <span class="fn">get</span>(self, session_id):
        <span class="cm"># 1. Check hot tier (Redis) first</span>
        session = self.redis_hot.<span class="fn">get</span>(<span class="st">"sess:"</span> + session_id)
        <span class="kw">if</span> session:
            self.redis_hot.<span class="fn">expire</span>(<span class="st">"sess:"</span> + session_id, <span class="nu">604800</span>)  <span class="cm"># refresh TTL</span>
            <span class="kw">return</span> <span class="fn">decode</span>(session)

        <span class="cm"># 2. Check warm tier</span>
        session = self.redis_warm.<span class="fn">get</span>(<span class="st">"sess:"</span> + session_id)
        <span class="kw">if</span> session:
            self.<span class="fn">_promote_to_hot</span>(session_id, session)
            <span class="kw">return</span> <span class="fn">decode</span>(session)

        <span class="cm"># 3. Check cold tier (Cassandra)</span>
        row = self.cassandra.<span class="fn">execute</span>(
            <span class="st">"SELECT * FROM sessions WHERE session_id = ?"</span>,
            [session_id]
        ).<span class="fn">one</span>()
        <span class="kw">if</span> row:
            self.<span class="fn">_promote_to_hot</span>(session_id, <span class="fn">encode</span>(row))
            <span class="kw">return</span> row

        <span class="kw">return</span> <span class="ty">None</span>  <span class="cm"># session not found anywhere</span>

    <span class="kw">def</span> <span class="fn">_promote_to_hot</span>(self, session_id, data):
        self.redis_hot.<span class="fn">setex</span>(<span class="st">"sess:"</span> + session_id, <span class="nu">604800</span>, data)
        <span class="cm"># Optionally delete from warm/cold to avoid duplication</span></pre>
</div>

---

## 8. Logout Everywhere

When a user clicks "Sign out of all devices," the system must invalidate every active session across every device, every browser, every service. This is the logout problem at its hardest.

<div class="flow-step"><div class="step-num">1</div><div class="step-body"><strong>Increment tokenVersion in DB:</strong> One SQL statement: <code>UPDATE users SET token_version = token_version + 1 WHERE id = 'user_123'</code>. All access tokens now carry a stale version — they will fail on next use.</div></div>
<div class="flow-step"><div class="step-num">2</div><div class="step-body"><strong>Delete all refresh tokens:</strong> <code>DELETE FROM refresh_tokens WHERE user_id = 'user_123'</code>. Clients can no longer silently renew their access tokens.</div></div>
<div class="flow-step"><div class="step-num">3</div><div class="step-body"><strong>Destroy SSO session:</strong> Delete the SSO session from Redis. Any service that redirects back to the Auth Server will find no active session and force re-authentication.</div></div>
<div class="flow-step"><div class="step-num">4</div><div class="step-body"><strong>Local service sessions:</strong> These expire naturally. If the access token has a 15-minute TTL, within 15 minutes every service will return 401 and the user will be prompted to log in again. For near-instant revocation, services must check tokenVersion on each request.</div></div>

<div class="callout callout-yellow">
<strong>The 15-minute gap:</strong> Even after logout-everywhere, an active access token remains usable until it expires. For most systems, 15 minutes is acceptable. For high-security scenarios (compromised account, banking), use token versioning with a per-request DB check — you lose the stateless benefit but gain instant revocation.
</div>

---

## 9. Multi-Factor Authentication (MFA)

{: class="marginalia" }
**TOTP (RFC 6238)** uses<br/>HMAC-SHA1 over the<br/>current Unix time<br/>divided by 30. The<br/>same algorithm runs<br/>on your phone and<br/>the server — if<br/>clocks are in sync,<br/>the codes match.<br/>No network needed.

MFA adds a second verification step after password authentication. The most common mechanism is TOTP (Time-based One-Time Password), used by Google Authenticator, Authy, and 1Password.

**TOTP algorithm:**

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">import</span> hmac, hashlib, struct, time, base64

<span class="kw">def</span> <span class="fn">generate_totp</span>(secret_base32, digits=<span class="nu">6</span>, period=<span class="nu">30</span>):
    <span class="cm"># 1. Decode the shared secret (stored in user DB, displayed as QR code)</span>
    secret = base64.<span class="fn">b32decode</span>(secret_base32.<span class="fn">upper</span>())

    <span class="cm"># 2. Compute time counter: 30-second windows since Unix epoch</span>
    counter = <span class="fn">int</span>(time.<span class="fn">time</span>()) <span class="op">//</span> period

    <span class="cm"># 3. HMAC-SHA1 of the 8-byte big-endian counter</span>
    msg = struct.<span class="fn">pack</span>(<span class="st">">Q"</span>, counter)
    h = hmac.<span class="fn">new</span>(secret, msg, hashlib.sha1).<span class="fn">digest</span>()

    <span class="cm"># 4. Dynamic truncation: take 4 bytes at offset indicated by last nibble</span>
    offset = h[<span class="op">-</span><span class="nu">1</span>] <span class="op">&amp;</span> <span class="nu">0x0F</span>
    code = struct.<span class="fn">unpack</span>(<span class="st">">I"</span>, h[offset:offset<span class="op">+</span><span class="nu">4</span>])[<span class="nu">0</span>] <span class="op">&amp;</span> <span class="nu">0x7FFFFFFF</span>

    <span class="cm"># 5. Modulo to get N-digit code</span>
    <span class="kw">return</span> <span class="fn">str</span>(code <span class="op">%</span> (<span class="nu">10</span> <span class="op">**</span> digits)).<span class="fn">zfill</span>(digits)

<span class="kw">def</span> <span class="fn">verify_totp</span>(secret, provided_code, window=<span class="nu">1</span>):
    <span class="cm"># Accept current window and ±1 (clock skew tolerance)</span>
    <span class="kw">for</span> drift <span class="kw">in</span> <span class="fn">range</span>(<span class="op">-</span>window, window <span class="op">+</span> <span class="nu">1</span>):
        expected = <span class="fn">generate_totp</span>(secret, period=<span class="nu">30</span>)
        <span class="kw">if</span> hmac.<span class="fn">compare_digest</span>(expected, provided_code):
            <span class="kw">return</span> <span class="ty">True</span>
    <span class="kw">return</span> <span class="ty">False</span></pre>
</div>

**The MFA challenge flow:**

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">login_step1</span>(username, password):
    user = db.<span class="fn">authenticate</span>(username, password)
    <span class="kw">if not</span> user.mfa_enabled:
        <span class="kw">return</span> <span class="fn">issue_full_session</span>(user)  <span class="cm"># no MFA, done</span>

    <span class="cm"># Issue a short-lived challenge token (not a full session!)</span>
    challenge = {
        <span class="st">"userId"</span>:    user.id,
        <span class="st">"mfaNeeded"</span>: <span class="ty">True</span>,
        <span class="st">"exp"</span>:       <span class="fn">now_unix</span>() + <span class="nu">60</span>,  <span class="cm"># 60-second window to enter MFA code</span>
    }
    challenge_token = jwt.<span class="fn">encode</span>(challenge, MFA_KEY, algorithm=<span class="st">"HS256"</span>)
    <span class="kw">return</span> {<span class="st">"mfa_required"</span>: <span class="ty">True</span>, <span class="st">"challenge_token"</span>: challenge_token}

<span class="kw">def</span> <span class="fn">login_step2</span>(challenge_token, totp_code):
    claims = jwt.<span class="fn">decode</span>(challenge_token, MFA_KEY, algorithms=[<span class="st">"HS256"</span>])
    user = db.<span class="fn">find_user</span>(claims[<span class="st">"userId"</span>])

    <span class="kw">if not</span> <span class="fn">verify_totp</span>(user.mfa_secret, totp_code):
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"invalid TOTP code"</span>)

    <span class="kw">return</span> <span class="fn">issue_full_session</span>(user)  <span class="cm"># MFA passed, issue real session</span></pre>
</div>

---

## 10. Capacity Estimate

<table class="capacity-table">
  <thead><tr><th>Metric</th><th>Assumption</th><th>Result</th></tr></thead>
  <tbody>
    <tr><td>Active sessions (Google-scale)</td><td>~5 billion logged-in users</td><td>~5,000,000,000</td></tr>
    <tr><td>Session size in Redis</td><td>userId + metadata + expiry</td><td>~500 bytes</td></tr>
    <tr><td>Total session storage</td><td>5B × 500 bytes</td><td>~2.5 TB</td></tr>
    <tr><td>Redis nodes required</td><td>50 GB usable per node</td><td>~50 nodes</td></tr>
    <tr><td>Auth requests / second</td><td>5B sessions / 10s avg request interval</td><td>~500,000 req/s</td></tr>
    <tr><td>Token refresh requests / day</td><td>Every access token refreshed every 15 min</td><td>~5B × 96 = ~480B/day</td></tr>
    <tr><td>Refresh token DB size</td><td>1 row per device × avg 3 devices/user</td><td>~15B rows</td></tr>
    <tr><td>Auth Server replication</td><td>500K req/s at 5ms/req per core</td><td>~1,000 cores</td></tr>
  </tbody>
</table>

<div class="callout callout-green">
<strong>Why not one Redis?</strong> A single Redis node handles ~100K ops/sec with sub-millisecond latency. At 500K auth req/sec plus session reads/writes, you need a Redis Cluster with at minimum 10–20 shards, with replicas for fault tolerance — realistically 50+ nodes for Google-scale with redundancy.
</div>

---

## 11. Security Hardening Checklist

{: class="marginalia" }
**httpOnly cookies vs<br/>localStorage for JWTs:**<br/>httpOnly prevents XSS<br/>reads but is vulnerable<br/>to CSRF. localStorage<br/>blocks CSRF but is<br/>readable by JS (XSS).<br/>Neither is perfect.<br/>The security community<br/>debates this endlessly —<br/>the right answer is<br/>"it depends on your<br/>threat model."

Beyond the core architecture, production-grade auth systems require these mitigations:

**CSRF protection:**
Every state-changing request must include either a CSRF token (double-submit cookie pattern) or use the `SameSite=Strict` cookie attribute to prevent cross-site form submissions.

**Token storage:**
Store access tokens in `httpOnly` cookies (inaccessible to JavaScript — prevents XSS token theft). Store refresh tokens the same way. Never put tokens in `localStorage` if XSS is a realistic threat vector.

**Rate limiting on auth endpoints:**
The login endpoint is the most-attacked endpoint in any system. Apply per-IP rate limiting (e.g., 10 attempts per 15 minutes), account lockout after N failures, and CAPTCHA after repeated failures.

**Refresh token rotation:**
On every use of a refresh token, immediately issue a new one and invalidate the old. If a refresh token is used twice, it likely means the original was stolen — revoke all tokens for that user.

<div class="code-wrap">
<div class="code-lang">python <button class="copy-btn" onclick="copyCode(this)">copy</button></div>
<pre class="code-block"><span class="kw">def</span> <span class="fn">use_refresh_token</span>(token):
    record = db.<span class="fn">find_refresh_token</span>(<span class="fn">sha256</span>(token))

    <span class="kw">if not</span> record:
        <span class="cm"># Token not found — either expired or already used.</span>
        <span class="cm"># Check if this token was recently rotated (possible replay attack)</span>
        rotated = db.<span class="fn">find_rotated_token</span>(<span class="fn">sha256</span>(token))
        <span class="kw">if</span> rotated:
            <span class="cm"># Replay detected: revoke the entire token family</span>
            db.<span class="fn">revoke_token_family</span>(rotated.family_id)
            <span class="kw">raise</span> <span class="ty">SecurityAlert</span>(<span class="st">"refresh token reuse detected"</span>)
        <span class="kw">raise</span> <span class="ty">AuthError</span>(<span class="st">"token invalid"</span>)

    <span class="cm"># Valid: rotate (issue new, invalidate old)</span>
    new_token = <span class="fn">generate_secure_random</span>(<span class="nu">64</span>)
    db.<span class="fn">rotate_refresh_token</span>(
        old_token_hash=<span class="fn">sha256</span>(token),
        new_token_hash=<span class="fn">sha256</span>(new_token),
        family_id=record.family_id
    )
    new_access = <span class="fn">issue_access_token</span>(record.user_id)
    <span class="kw">return</span> {<span class="st">"access_token"</span>: new_access, <span class="st">"refresh_token"</span>: new_token}

<span class="cm"># Secure cookie settings</span>
<span class="cm"># Set-Cookie: refresh_token=XYZ; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh</span>
<span class="cm"># Path=/auth/refresh means the cookie is ONLY sent to the refresh endpoint</span></pre>
</div>

---

## 12. System Diagram: Full Architecture

<div class="viz-wrap">
<div class="viz-title">Component Overview</div>
<pre style="font-size:.72rem;color:rgba(255,255,255,.7);line-height:1.8;margin:0;font-family:'JetBrains Mono','Fira Code',monospace;overflow-x:auto;">
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│   Cookies: accounts.google.com (SSO)  +  mail.google.com     │
└──────────┬──────────────────────────────────────┬────────────┘
           │  HTTPS                               │  HTTPS
           ▼                                      ▼
┌──────────────────────┐               ┌──────────────────────┐
│  Auth Server Cluster │               │  Service Cluster     │
│  accounts.google.com │               │  (Gmail, YouTube...) │
│                      │◄── s2s ──────►│                      │
│  - GAIA auth logic   │  token valid? │  - Local session     │
│  - MFA verification  │               │  - API calls         │
│  - OAuth 2.0 + OIDC  │               │  - Verifies JWT      │
└──────────┬───────────┘               └──────────┬───────────┘
           │                                      │
    ┌──────▼──────┐                        ┌──────▼──────┐
    │ Redis Cluster│                        │  Redis Hot  │
    │  SSO sessions│                        │  (sessions) │
    │  MFA tokens  │                        └──────┬──────┘
    │  Blacklist   │                               │
    └──────┬───────┘                        ┌──────▼──────┐
           │                                │  Redis Warm │
    ┌──────▼───────┐                        └──────┬──────┘
    │  Primary DB  │                               │
    │  - users     │                        ┌──────▼──────┐
    │  - tokenVer  │                        │  Cassandra  │
    │  - refresh   │                        │  (cold)     │
    │    tokens    │                        └─────────────┘
    └──────────────┘
</pre>
</div>

---

## Summary: Interview Cheat Sheet

<table class="comp-table">
  <thead><tr><th>Topic</th><th>Key Decision</th><th>Production Recommendation</th></tr></thead>
  <tbody>
    <tr><td>Token type</td><td>Sessions vs JWT</td><td>JWT access tokens (15 min) + opaque refresh tokens (30 days)</td></tr>
    <tr><td>Revocation</td><td>Instant vs eventual</td><td>Token versioning in DB for logout-everywhere; blacklist for single-token revocation</td></tr>
    <tr><td>SSO mechanism</td><td>Central IdP</td><td>Single auth domain issues short-lived SSO tokens; services create local sessions</td></tr>
    <tr><td>Third-party auth</td><td>OAuth flow</td><td>Authorization Code + PKCE; mandatory for mobile/SPA; never use Implicit Flow</td></tr>
    <tr><td>Session storage</td><td>Hot/warm/cold</td><td>Redis Cluster (hot) → Redis+disk (warm) → Cassandra (cold)</td></tr>
    <tr><td>Token storage</td><td>Cookie vs localStorage</td><td>httpOnly cookies; SameSite=Strict; Path-scoped refresh endpoint</td></tr>
    <tr><td>MFA</td><td>TOTP vs push</td><td>TOTP (RFC 6238) + recovery codes; push notifications for enterprise</td></tr>
    <tr><td>Scale</td><td>Auth bottleneck</td><td>Stateless JWT verification removes auth from critical path; 50+ Redis shards for sessions</td></tr>
  </tbody>
</table>

<script>
function copyCode(btn) {
  var pre = btn.closest(".code-wrap").querySelector("pre.code-block");
  var text = pre ? pre.innerText : "";
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      btn.textContent = "copied!";
      btn.classList.add("copied");
      setTimeout(function() { btn.textContent = "copy"; btn.classList.remove("copied"); }, 1500);
    });
  }
}
</script>
