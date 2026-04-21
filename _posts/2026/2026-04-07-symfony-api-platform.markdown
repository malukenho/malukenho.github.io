---
layout: post
title: "Building a Production REST API with Symfony 7 and API Platform 3"
date: 2026-04-07 10:00:00 +0000
categories: ["post"]
tags: [php, symfony, api-platform, rest, backend, docker]
---

{: class="marginalia" }
🇯🇵 **Kotoba** means<br/>"vocabulary" in Japanese.<br/>The app helps readers<br/>look up words they find<br/>in manga panels.

I needed a REST API in a weekend.

Not a toy — a real one. Authentication, pagination, filtering, OpenAPI docs, something an iOS app could actually talk to. The backend for *Kotoba*, a Japanese vocabulary app I was building for manga readers. Users import a volume, tap on a word they don't know, and the app saves it to a personal vocabulary list. Simple concept; non-trivial data model.

I'd built APIs in Laravel before, and I knew raw Symfony could be verbose. But a colleague had mentioned **API Platform** in passing: *"it's like Rails but for REST, and it actually respects HTTP."* I gave it a weekend. Six weeks later it was running on Heroku with real users. This is that story — the good parts and the parts I'd do differently.

---

<style>
/* ── Kotoba post styles ────────────────────────────────────────── */
.kb-section { margin: 2.4rem 0; }

/* Code blocks */
pre.code-block {
  background: #111214; border: 1px solid #2e2f35; border-radius: 8px;
  padding: 18px 20px; overflow-x: auto; font-family: 'JetBrains Mono', monospace;
  font-size: 13px; line-height: 1.75; margin: 1.4rem 0;
  color: #cdd6f4;
}
pre.code-block .kw  { color: #cba6f7; }
pre.code-block .fn  { color: #89b4fa; }
pre.code-block .st  { color: #a6e3a1; }
pre.code-block .cm  { color: #6c7086; font-style: italic; }
pre.code-block .at  { color: #f38ba8; }
pre.code-block .nb  { color: #fab387; }
pre.code-block .cl  { color: #f9e2af; }
pre.code-block .ln  { color: #45475a; user-select: none; display: inline-block; width: 28px; }

/* Tip / warn callouts */
.tip {
  border-left: 3px solid #7bcdab; background: #1a2e23;
  border-radius: 0 8px 8px 0; padding: 12px 16px;
  margin: 1.2rem 0; font-size: 14px; line-height: 1.7;
}
.tip strong { color: #7bcdab; }
.warn {
  border-left: 3px solid #fbef8a; background: #2a2a1a;
  border-radius: 0 8px 8px 0; padding: 12px 16px;
  margin: 1.2rem 0; font-size: 14px;
}
.warn strong { color: #fbef8a; }

/* ── Architecture diagram ──────────────────────────────────────── */
.arch-diagram { margin: 1.6rem 0; font-family: 'JetBrains Mono', monospace; }
.arch-layer {
  display: flex; align-items: stretch; margin-bottom: 4px;
  cursor: pointer; border-radius: 8px; overflow: hidden;
  border: 1px solid transparent; transition: border-color .2s;
}
.arch-layer:hover { border-color: #7bcdab; }
.arch-layer.open  { border-color: #fbef8a; }
.arch-badge {
  width: 180px; min-width: 180px; padding: 12px 16px;
  font-size: 12px; font-weight: 700; letter-spacing: .04em;
  display: flex; align-items: center; gap: 8px; color: #19191c;
}
.arch-name {
  flex: 1; padding: 12px 16px; background: #1e1f24;
  font-size: 13px; color: rgba(255,255,255,.75); display: flex; align-items: center;
}
.arch-desc {
  display: none; background: #252629; padding: 12px 18px;
  font-size: 13px; line-height: 1.7; color: rgba(255,255,255,.7);
  border-top: 1px solid #2e2f35; font-family: 'JetBrains Sans', sans-serif;
}
.arch-layer.open .arch-name { color: #fff; }
.arch-layer.open .arch-desc { display: block; }
.arch-arrow {
  text-align: center; color: #3a3b40; font-size: 16px;
  margin: 2px 0; line-height: 1;
}
.arch-wrap {
  background: #1a1b1f; border-radius: 10px; padding: 16px;
  border: 1px solid #2e2f35;
}
.arch-hint {
  text-align: center; font-size: 12px; color: rgba(255,255,255,.35);
  margin-bottom: 12px; letter-spacing: .04em; text-transform: uppercase;
}

/* ── JWT decoder ───────────────────────────────────────────────── */
.jwt-box {
  background: #1e1f24; border-radius: 10px; padding: 22px 24px;
  border: 1px solid #2e2f35; margin: 1.6rem 0;
}
.jwt-box h3 { margin: 0 0 14px; color: #fbef8a; font-size: 15px; }
.jwt-input {
  width: 100%; padding: 10px 12px; background: #111214;
  border: 1px solid #3a3b40; border-radius: 6px; color: #fff;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  box-sizing: border-box; resize: vertical; min-height: 72px; outline: none;
}
.jwt-input:focus { border-color: #7bcdab; }
.jwt-parts { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0; }
.jwt-seg {
  padding: 3px 10px; border-radius: 4px; font-size: 11px;
  font-family: 'JetBrains Mono', monospace; word-break: break-all;
}
.jwt-seg.header  { background: #2a1f3a; color: #cba6f7; }
.jwt-seg.payload { background: #1f2e1f; color: #a6e3a1; }
.jwt-seg.sig     { background: #3a1f1f; color: #f38ba8; }
.jwt-decoded {
  background: #111214; border-radius: 6px; padding: 14px 16px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  line-height: 1.7; color: #cdd6f4; white-space: pre-wrap;
  word-break: break-word; max-height: 260px; overflow-y: auto;
  border: 1px solid #2e2f35; margin-top: 10px;
}
.jwt-label { font-size: 11px; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .06em; margin: 10px 0 4px; }
.jwt-err { color: #f38ba8; font-size: 13px; margin-top: 8px; }

/* ── N+1 visualizer ────────────────────────────────────────────── */
.nplus-box {
  background: #1e1f24; border-radius: 10px; padding: 22px 24px;
  border: 1px solid #2e2f35; margin: 1.6rem 0;
}
.nplus-box h3 { margin: 0 0 6px; color: #fbef8a; font-size: 15px; }
.nplus-sub { font-size: 13px; color: rgba(255,255,255,.5); margin-bottom: 18px; }
.slider-row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.slider-row label { font-size: 13px; color: rgba(255,255,255,.6); white-space: nowrap; }
#nplusSlider {
  flex: 1; accent-color: #7bcdab; cursor: pointer;
}
#nplusVal {
  font-size: 16px; font-weight: 700; color: #fbef8a;
  min-width: 40px; text-align: right;
}
.bars-row { display: flex; gap: 20px; align-items: flex-end; margin-bottom: 12px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.bar-label { font-size: 12px; color: rgba(255,255,255,.55); text-align: center; line-height: 1.4; }
.bar-track { width: 100%; background: #252629; border-radius: 6px; overflow: hidden; height: 160px; display: flex; flex-direction: column; justify-content: flex-end; }
.bar-fill { width: 100%; border-radius: 6px 6px 0 0; transition: height .45s cubic-bezier(.4,0,.2,1); }
.bar-fill.bad  { background: linear-gradient(180deg, #f38ba8 0%, #d4617c 100%); }
.bar-fill.good { background: linear-gradient(180deg, #a6e3a1 0%, #5cb85c 100%); }
.bar-count { font-size: 18px; font-weight: 700; color: #fff; }
.bar-time  { font-size: 12px; color: rgba(255,255,255,.4); }
.nplus-legend { display: flex; gap: 16px; font-size: 12px; color: rgba(255,255,255,.5); margin-top: 4px; }
.nplus-legend span { display: flex; align-items: center; gap: 5px; }
.leg-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

/* ── Flip cards ────────────────────────────────────────────────── */
.flip-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 1.6rem 0; }
.flip-card { perspective: 900px; height: 260px; cursor: pointer; }
.flip-inner {
  width: 100%; height: 100%; transition: transform .55s;
  transform-style: preserve-3d; position: relative;
}
.flip-card.flipped .flip-inner { transform: rotateY(180deg); }
.flip-front, .flip-back {
  position: absolute; width: 100%; height: 100%;
  backface-visibility: hidden; border-radius: 10px;
  padding: 18px 20px; box-sizing: border-box;
  overflow-y: auto;
}
.flip-front {
  background: #1e1f24; border: 1px solid #2e2f35;
  display: flex; flex-direction: column;
}
.flip-back {
  background: #1a2e23; border: 1px solid #7bcdab;
  transform: rotateY(180deg);
  display: flex; flex-direction: column;
}
.flip-tag {
  font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
  padding: 3px 8px; border-radius: 12px; margin-bottom: 10px;
  align-self: flex-start;
}
.flip-front .flip-tag { background: #3a1a1a; color: #f38ba8; }
.flip-back  .flip-tag { background: #1a3a2a; color: #7bcdab; }
.flip-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 10px; }
.flip-hint { font-size: 11px; color: rgba(255,255,255,.35); margin-top: auto; text-align: right; }

/* ── Timeline ─────────────────────────────────────────────────── */
.timeline-wrap {
  background: #1e1f24; border-radius: 10px; padding: 24px;
  border: 1px solid #2e2f35; margin: 1.6rem 0; overflow-x: auto;
}
.timeline-wrap h3 { margin: 0 0 20px; color: #fbef8a; font-size: 15px; }
.tl-track {
  display: flex; align-items: flex-start; gap: 0;
  min-width: 540px; position: relative; padding-bottom: 20px;
}
.tl-track::before {
  content: ''; position: absolute; top: 18px; left: 30px;
  right: 30px; height: 2px; background: #2e2f35; z-index: 0;
}
.tl-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; }
.tl-dot {
  width: 36px; height: 36px; border-radius: 50%; border: 2px solid #3a3b40;
  background: #1e1f24; display: flex; align-items: center; justify-content: center;
  font-size: 14px; cursor: pointer; transition: all .2s; flex-shrink: 0;
}
.tl-dot:hover { border-color: #7bcdab; transform: scale(1.15); }
.tl-item.active .tl-dot { border-color: #fbef8a; background: #2a2a1a; box-shadow: 0 0 0 4px rgba(251,239,138,.15); }
.tl-day { font-size: 11px; color: rgba(255,255,255,.45); margin-top: 8px; text-transform: uppercase; letter-spacing: .06em; }
.tl-title { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 3px; text-align: center; max-width: 90px; line-height: 1.4; }
.tl-details {
  background: #252629; border-radius: 8px; padding: 14px 16px;
  font-size: 13px; line-height: 1.7; color: rgba(255,255,255,.75);
  margin-top: 16px; display: none; border: 1px solid #3a3b40;
}
.tl-details.visible { display: block; }
.tl-details strong { color: #fbef8a; }

/* ── Checklist ─────────────────────────────────────────────────── */
.checklist { list-style: none; padding: 0; margin: 1.4rem 0; }
.checklist li {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 14px; border-radius: 7px; margin-bottom: 6px;
  background: #1e1f24; border: 1px solid #2e2f35; cursor: pointer;
  transition: border-color .2s, background .2s; font-size: 14px; line-height: 1.6;
}
.checklist li:hover { border-color: #7bcdab; background: #1a2e23; }
.checklist li.checked { border-color: #7bcdab; background: #1a2e23; }
.check-icon {
  width: 20px; height: 20px; border: 2px solid #3a3b40; border-radius: 4px;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  font-size: 12px; transition: all .2s; margin-top: 1px; color: transparent;
}
.checklist li.checked .check-icon { background: #7bcdab; border-color: #7bcdab; color: #19191c; }
.check-text strong { color: #fff; display: block; margin-bottom: 2px; }
.check-text span { color: rgba(255,255,255,.55); font-size: 13px; }

@media (max-width: 600px) {
  .flip-row { grid-template-columns: 1fr; }
  .arch-badge { width: 120px; min-width: 120px; font-size: 11px; }
}
</style>

## The Stack

{: class="marginalia" }
**Why not Laravel?** I know<br/>Laravel well — but API<br/>Platform's JSON-LD<br/>support and built-in<br/>OpenAPI generation<br/>were hard to say no to.

Before I get into the code, here's every piece of the puzzle. Click any layer to learn what it does and why I chose it:

<div class="arch-wrap">
  <div class="arch-hint">Click a layer to expand ↓</div>
  <div class="arch-diagram" id="archDiagram">

    <div class="arch-layer" data-desc="The iOS app built with SwiftUI. It makes HTTP requests using URLSession, consuming JSON-LD responses. The @id and @type fields from API Platform let the app navigate relationships without hardcoded IDs.">
      <div class="arch-badge" style="background:#89b4fa;">📱 iOS</div>
      <div class="arch-name">SwiftUI + URLSession — JSON-LD consumer</div>
    </div>
    <div class="arch-arrow">↕</div>

    <div class="arch-layer" data-desc="Nginx acts as the entry point in both Docker and production. It serves the public/ directory statically and proxies PHP requests to PHP-FPM on port 9000. The config is minimal — about 20 lines.">
      <div class="arch-badge" style="background:#a6e3a1; color:#19191c;">🌐 Nginx</div>
      <div class="arch-name">Reverse proxy — static files + PHP proxy</div>
    </div>
    <div class="arch-arrow">↕</div>

    <div class="arch-layer" data-desc="PHP-FPM runs the Symfony application as a FastCGI process. Each request spawns a worker from the pool. On Heroku, I run Nginx + PHP-FPM in the same dyno using supervisord.">
      <div class="arch-badge" style="background:#cba6f7;">⚙️ PHP-FPM</div>
      <div class="arch-name">PHP 8.3 FastCGI process manager</div>
    </div>
    <div class="arch-arrow">↕</div>

    <div class="arch-layer" data-desc="Symfony 7.4 handles routing, DI container, security (JWT via LexikJWT), event listeners, and the console. I use very few bundles — API Platform does most of the heavy lifting.">
      <div class="arch-badge" style="background:#f9e2af; color:#19191c;">🎼 Symfony</div>
      <div class="arch-name">Symfony 7.4 — routing, security, DI</div>
    </div>
    <div class="arch-arrow">↕</div>

    <div class="arch-layer" data-desc="API Platform 3 reads PHP attributes on entity classes and generates JSON-LD endpoints, OpenAPI 3.1 docs, and Hydra collections automatically. It also handles pagination, filtering, and serialization groups.">
      <div class="arch-badge" style="background:#fab387; color:#19191c;">🚀 API Platform</div>
      <div class="arch-name">Auto-generates REST + OpenAPI from PHP attributes</div>
    </div>
    <div class="arch-arrow">↕</div>

    <div class="arch-layer" data-desc="Doctrine ORM maps PHP objects to MySQL tables. I use it for its QueryBuilder (essential for solving the N+1 problem) and migrations. UoW pattern means entities are tracked automatically.">
      <div class="arch-badge" style="background:#f38ba8; color:#19191c;">🗄️ Doctrine</div>
      <div class="arch-name">ORM — entity mapping, migrations, QueryBuilder</div>
    </div>
    <div class="arch-arrow">↕</div>

    <div class="arch-layer" data-desc="MySQL 8 runs in Docker locally and on Amazon RDS in production. I hit an SSL certificate issue with Doctrine on RDS — more on that in the deployment section.">
      <div class="arch-badge" style="background:#7bcdab; color:#19191c;">🐬 MySQL</div>
      <div class="arch-name">MySQL 8 — Docker locally, RDS in production</div>
    </div>
  </div>
</div>

<script>
(function() {
  document.querySelectorAll('.arch-layer').forEach(function(layer) {
    var desc = layer.getAttribute('data-desc');
    var nameEl = layer.querySelector('.arch-name');
    var descDiv = document.createElement('div');
    descDiv.className = 'arch-desc';
    descDiv.textContent = desc;
    layer.style.flexWrap = 'wrap';
    nameEl.parentNode.appendChild(descDiv);
    nameEl.style.flex = '1';
    layer.addEventListener('click', function() {
      var isOpen = layer.classList.contains('open');
      document.querySelectorAll('.arch-layer.open').forEach(function(l) { l.classList.remove('open'); });
      if (!isOpen) layer.classList.add('open');
    });
  });
})();
</script>

---

## API Platform in Five Minutes

{: class="marginalia" }
`#[ApiResource]` is the<br/>single attribute that<br/>turns a Doctrine entity<br/>into a full REST API.<br/>No controllers, no<br/>routes, no serializers.

The thing that genuinely surprised me about API Platform was the surface area of the boilerplate. Here is the *entire* Manga entity that gives you `GET /api/mangas`, `POST /api/mangas`, `GET /api/mangas/{id}`, `PUT`, `PATCH`, `DELETE`, pagination, filtering, and OpenAPI documentation:

<pre class="code-block"><span class="cm">// src/Entity/Manga.php</span>
<span class="kw">namespace</span> App\Entity;

<span class="kw">use</span> ApiPlatform\Metadata\ApiResource;
<span class="kw">use</span> ApiPlatform\Metadata\ApiFilter;
<span class="kw">use</span> ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
<span class="kw">use</span> Doctrine\ORM\Mapping <span class="kw">as</span> ORM;
<span class="kw">use</span> Symfony\Component\Serializer\Annotation\Groups;

<span class="at">#[ApiResource(</span>
<span class="at">    normalizationContext: ['groups' =&gt; ['manga:read']],</span>
<span class="at">    denormalizationContext: ['groups' =&gt; ['manga:write']],</span>
<span class="at">    paginationItemsPerPage: 20,</span>
<span class="at">)]</span>
<span class="at">#[ApiFilter(SearchFilter::class, properties: ['title' =&gt; 'partial'])]</span>
<span class="at">#[ORM\Entity(repositoryClass: MangaRepository::class)]</span>
<span class="kw">class</span> <span class="cl">Manga</span>
{
    <span class="at">#[ORM\Id, ORM\GeneratedValue, ORM\Column]</span>
    <span class="at">#[Groups(['manga:read'])]</span>
    <span class="kw">public</span> ?<span class="nb">int</span> <span class="fn">$id</span> = <span class="kw">null</span>;

    <span class="at">#[ORM\Column(length: 255)]</span>
    <span class="at">#[Groups(['manga:read', 'manga:write'])]</span>
    <span class="kw">public</span> <span class="nb">string</span> <span class="fn">$title</span> = <span class="st">''</span>;

    <span class="at">#[ORM\Column(length: 255, nullable: true)]</span>
    <span class="at">#[Groups(['manga:read', 'manga:write'])]</span>
    <span class="kw">public</span> ?<span class="nb">string</span> <span class="fn">$englishTitle</span> = <span class="kw">null</span>;

    <span class="at">#[ORM\Column(length: 512, nullable: true)]</span>
    <span class="at">#[Groups(['manga:read', 'manga:write'])]</span>
    <span class="kw">public</span> ?<span class="nb">string</span> <span class="fn">$coverImageUrl</span> = <span class="kw">null</span>;

    <span class="cm">// Computed, read-only — see N+1 section for how this is populated</span>
    <span class="at">#[Groups(['manga:read'])]</span>
    <span class="kw">public</span> <span class="nb">int</span> <span class="fn">$totalVocabularyCount</span> = <span class="nb">0</span>;

    <span class="cm">/** @var Collection&lt;int, Volume&gt; */</span>
    <span class="at">#[ORM\OneToMany(targetEntity: Volume::class, mappedBy: 'manga', cascade: ['persist'])]</span>
    <span class="at">#[Groups(['manga:read'])]</span>
    <span class="kw">public</span> Collection <span class="fn">$volumes</span>;
}</pre>

That's it. Run `symfony server:start` and you have a fully functioning JSON-LD API. Hit `/api` and you get the Hydra entrypoint. Hit `/api/docs` and you get a Swagger UI with every endpoint documented.

The full domain model — `Volume`, `Page`, `Vocabulary`, `KnownWord` — follows the same pattern. Each entity gets `#[ApiResource]` and `#[Groups]` annotations; API Platform handles the rest.

---

## Docker Setup

{: class="marginalia" }
The entrypoint trick —<br/>running migrations on<br/>container start — saves<br/>me from remembering<br/>to run them manually<br/>after every `git pull`.

My `docker-compose.yml` has three services: **app** (PHP-FPM), **nginx**, and **mysql**. The `entrypoint.sh` runs database migrations before the process starts. Zero-config onboarding for new contributors.

<pre class="code-block"><span class="cm"># docker-compose.yml</span>
<span class="kw">version</span>: <span class="st">'3.9'</span>

<span class="kw">services</span>:
  <span class="fn">app</span>:
    <span class="kw">build</span>: .
    <span class="kw">volumes</span>:
      - <span class="st">.:/var/www/html</span>
    <span class="kw">environment</span>:
      DATABASE_URL: <span class="st">"mysql://kotoba:secret@mysql:3306/kotoba?serverVersion=8.0"</span>
      JWT_SECRET_KEY: <span class="st">"%kernel.project_dir%/config/jwt/private.pem"</span>
      JWT_PUBLIC_KEY:  <span class="st">"%kernel.project_dir%/config/jwt/public.pem"</span>
      JWT_PASSPHRASE:  <span class="st">"change_me_in_prod"</span>
    <span class="kw">depends_on</span>:
      <span class="fn">mysql</span>:
        <span class="kw">condition</span>: service_healthy

  <span class="fn">nginx</span>:
    <span class="kw">image</span>: nginx:1.25-alpine
    <span class="kw">ports</span>:
      - <span class="st">"8080:80"</span>
    <span class="kw">volumes</span>:
      - <span class="st">.:/var/www/html</span>
      - <span class="st">./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf</span>

  <span class="fn">mysql</span>:
    <span class="kw">image</span>: mysql:8.0
    <span class="kw">environment</span>:
      MYSQL_DATABASE: kotoba
      MYSQL_USER: kotoba
      MYSQL_PASSWORD: secret
      MYSQL_ROOT_PASSWORD: rootsecret
    <span class="kw">healthcheck</span>:
      <span class="kw">test</span>: [<span class="st">"CMD"</span>, <span class="st">"mysqladmin"</span>, <span class="st">"ping"</span>, <span class="st">"-h"</span>, <span class="st">"localhost"</span>]
      <span class="kw">interval</span>: 5s
      <span class="kw">timeout</span>: 3s
      <span class="kw">retries</span>: 10</pre>

<pre class="code-block"><span class="cm">#!/bin/sh
# docker/entrypoint.sh</span>
<span class="kw">set</span> -e

<span class="fn">echo</span> <span class="st">"Waiting for database..."</span>
<span class="kw">until</span> php bin/console doctrine:query:sql <span class="st">"SELECT 1"</span> &gt;/dev/null 2&gt;&amp;1; <span class="kw">do</span>
  <span class="fn">sleep</span> 1
<span class="kw">done</span>

<span class="fn">echo</span> <span class="st">"Running migrations..."</span>
php bin/console doctrine:migrations:migrate --no-interaction

<span class="fn">exec</span> php-fpm</pre>

<div class="tip"><strong>Tip:</strong> The <code>healthcheck</code> on the MySQL service prevents a race condition where PHP-FPM starts before MySQL is ready to accept connections. Without it, the first container startup after <code>docker compose up</code> fails about 30% of the time.</div>

---

## JWT Authentication

{: class="marginalia" }
LexikJWTBundle handles<br/>key generation, signing,<br/>and verification. I only<br/>write the User entity<br/>and a login endpoint<br/>returning the token.

Kotoba uses LexikJWTAuthenticationBundle. After a user POSTs their credentials to `/api/auth/login`, they receive a signed JWT. Every subsequent request includes it in the `Authorization: Bearer <token>` header.

The login controller is trivial — LexikJWT handles the heavy lifting:

<pre class="code-block"><span class="cm">// src/Controller/AuthController.php</span>
<span class="at">#[Route('/api/auth/login', methods: ['POST'])]</span>
<span class="kw">public function</span> <span class="fn">login</span>(
    Request <span class="fn">$request</span>,
    UserRepository <span class="fn">$users</span>,
    UserPasswordHasherInterface <span class="fn">$hasher</span>,
    JWTTokenManagerInterface <span class="fn">$jwt</span>
): JsonResponse {
    <span class="fn">$data</span> = json_decode(<span class="fn">$request</span>-&gt;getContent(), <span class="kw">true</span>);
    <span class="fn">$user</span> = <span class="fn">$users</span>-&gt;<span class="fn">findOneByEmail</span>(<span class="fn">$data</span>[<span class="st">'email'</span>] ?? <span class="st">''</span>);

    <span class="kw">if</span> (!<span class="fn">$user</span> || !<span class="fn">$hasher</span>-&gt;<span class="fn">isPasswordValid</span>(<span class="fn">$user</span>, <span class="fn">$data</span>[<span class="st">'password'</span>] ?? <span class="st">''</span>)) {
        <span class="kw">return</span> <span class="fn">$this</span>-&gt;<span class="fn">json</span>([<span class="st">'error'</span> =&gt; <span class="st">'Invalid credentials'</span>], <span class="nb">401</span>);
    }

    <span class="kw">return</span> <span class="fn">$this</span>-&gt;<span class="fn">json</span>([<span class="st">'token'</span> =&gt; <span class="fn">$jwt</span>-&gt;<span class="fn">create</span>(<span class="fn">$user</span>)]);
}</pre>

Securing a resource operation is a single attribute:

<pre class="code-block"><span class="at">#[ApiResource(</span>
<span class="at">    operations: [</span>
<span class="at">        new GetCollection(security: "is_granted('ROLE_USER')"),</span>
<span class="at">        new Get(security: "is_granted('ROLE_USER') and object.user == user"),</span>
<span class="at">        new Post(security: "is_granted('ROLE_USER')"),</span>
<span class="at">        new Delete(security: "is_granted('ROLE_USER') and object.user == user"),</span>
<span class="at">    ]</span>
<span class="at">)]</span>
<span class="at">#[ORM\Entity]</span>
<span class="kw">class</span> <span class="cl">KnownWord</span> { <span class="cm">/* ... */</span> }</pre>

### Interactive JWT Decoder

Paste any JWT token below to inspect its claims. This is useful for debugging — I used it constantly during development to verify `exp`, `iat`, and custom claims.

<div class="jwt-box">
  <h3>🔑 JWT Inspector</h3>
  <div class="jwt-label">Paste a JWT token</div>
  <textarea class="jwt-input" id="jwtInput" placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAa290b2JhLmFwcCIsInJvbGVzIjpbIlJPTEVfVVNFUiJdLCJpYXQiOjE3MTIwMDAwMDAsImV4cCI6MTcxMjA4NjQwMH0.signature"></textarea>
  <div class="jwt-label">Token segments</div>
  <div id="jwtParts" class="jwt-parts"></div>
  <div id="jwtHeaderLabel" class="jwt-label" style="display:none">Header</div>
  <div id="jwtHeaderOut" class="jwt-decoded" style="display:none"></div>
  <div id="jwtPayloadLabel" class="jwt-label" style="display:none">Payload</div>
  <div id="jwtPayloadOut" class="jwt-decoded" style="display:none"></div>
  <div id="jwtErr" class="jwt-err"></div>
</div>

<script>
(function() {
  function b64decode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    try { return atob(str); } catch(e) { return null; }
  }
  function prettify(json) {
    try { return JSON.stringify(JSON.parse(json), null, 2); } catch(e) { return json; }
  }
  function decode() {
    var raw = document.getElementById('jwtInput').value.trim();
    var parts = document.getElementById('jwtParts');
    var hLabel = document.getElementById('jwtHeaderLabel');
    var hOut   = document.getElementById('jwtHeaderOut');
    var pLabel = document.getElementById('jwtPayloadLabel');
    var pOut   = document.getElementById('jwtPayloadOut');
    var err    = document.getElementById('jwtErr');
    parts.innerHTML = '';
    hLabel.style.display = hOut.style.display = pLabel.style.display = pOut.style.display = 'none';
    err.textContent = '';
    if (!raw) return;
    var segs = raw.split('.');
    if (segs.length !== 3) { err.textContent = 'Invalid JWT: expected 3 segments separated by dots.'; return; }
    var classes = ['header', 'payload', 'sig'];
    var labels  = ['Header', 'Payload', 'Signature'];
    segs.forEach(function(s, i) {
      var sp = document.createElement('span');
      sp.className = 'jwt-seg ' + classes[i];
      sp.title = labels[i];
      sp.textContent = s.length > 40 ? s.slice(0, 40) + '…' : s;
      parts.appendChild(sp);
    });
    var h = b64decode(segs[0]);
    var p = b64decode(segs[1]);
    if (!h || !p) { err.textContent = 'Could not base64-decode segments.'; return; }
    hLabel.style.display = pLabel.style.display = 'block';
    hOut.style.display = pOut.style.display = 'block';
    hOut.textContent = prettify(h);
    pOut.textContent = prettify(p);
    // Check expiry
    try {
      var payload = JSON.parse(p);
      if (payload.exp) {
        var now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          err.textContent = 'Token expired ' + Math.round((now - payload.exp) / 60) + ' minutes ago.';
          err.style.color = '#f38ba8';
        } else {
          err.textContent = 'Token valid for ' + Math.round((payload.exp - now) / 60) + ' more minutes.';
          err.style.color = '#a6e3a1';
        }
      }
    } catch(e) {}
  }
  document.getElementById('jwtInput').addEventListener('input', decode);
  decode();
})();
</script>

---

## The N+1 Query Problem

{: class="marginalia" }
The N+1 problem is when<br/>you load a list of N rows<br/>and then fire one extra<br/>query per row. 100 manga<br/>= 101 queries. Doctrine<br/>lazy-loads by default.

This bit me on the manga list endpoint. Each `Manga` has a `totalVocabularyCount` — the total number of vocabulary words across all its volumes and pages. My first implementation computed it via a PHP property that triggered a lazy-load for each manga. With 50 manga in the list, I was firing 51 queries.

The fix was a DQL subquery in the repository, fetching everything in one shot.

**The problem (N+1):**

<pre class="code-block"><span class="cm">// The naive approach — DO NOT do this in a list endpoint</span>
<span class="cm">// Each call to $vocab->count() triggers a new SELECT</span>
<span class="kw">public function</span> <span class="fn">getTotalVocabularyCount</span>(): <span class="nb">int</span>
{
    <span class="fn">$count</span> = <span class="nb">0</span>;
    <span class="kw">foreach</span> (<span class="fn">$this</span>-&gt;volumes <span class="kw">as</span> <span class="fn">$vol</span>) {
        <span class="kw">foreach</span> (<span class="fn">$vol</span>-&gt;pages <span class="kw">as</span> <span class="fn">$page</span>) {
            <span class="fn">$count</span> += <span class="fn">$page</span>-&gt;vocabularies-&gt;<span class="fn">count</span>();  <span class="cm">// ← lazy query</span>
        }
    }
    <span class="kw">return</span> <span class="fn">$count</span>;
}</pre>

**The fix (1 query):**

<pre class="code-block"><span class="cm">// src/Repository/MangaRepository.php</span>
<span class="kw">public function</span> <span class="fn">findAllWithVocabularyCount</span>(): <span class="nb">array</span>
{
    <span class="kw">return</span> <span class="fn">$this</span>-&gt;<span class="fn">createQueryBuilder</span>(<span class="st">'m'</span>)
        -&gt;<span class="fn">addSelect</span>(<span class="st">'(
            SELECT COUNT(v.id)
            FROM App\Entity\Vocabulary v
            JOIN v.page p
            JOIN p.volume vol
            WHERE vol.manga = m
        ) AS HIDDEN totalVocabularyCount'</span>)
        -&gt;<span class="fn">getQuery</span>()
        -&gt;<span class="fn">getResult</span>();
}</pre>

<div class="warn"><strong>Heads up:</strong> The <code>HIDDEN</code> keyword in DQL makes the computed value available during hydration but excludes it from the raw result array. You still need a custom hydrator or a <code>StateProvider</code> to map it back onto the entity property.</div>

Use the visualizer below to feel the difference:

<div class="nplus-box">
  <h3>⚡ N+1 Query Visualizer</h3>
  <div class="nplus-sub">Drag the slider to change the number of manga in the list.</div>
  <div class="slider-row">
    <label>Number of manga</label>
    <input type="range" id="nplusSlider" min="5" max="200" value="20" step="5">
    <span id="nplusVal">20</span>
  </div>
  <div class="bars-row" id="nBars">
    <div class="bar-col">
      <div class="bar-track"><div class="bar-fill bad" id="barBad"></div></div>
      <div class="bar-count" id="countBad">—</div>
      <div class="bar-time"  id="timeBad">—</div>
      <div class="bar-label">Without optimization<br/>(N+1 lazy-loads)</div>
    </div>
    <div class="bar-col">
      <div class="bar-track"><div class="bar-fill good" id="barGood"></div></div>
      <div class="bar-count" id="countGood">1</div>
      <div class="bar-time"  id="timeGood">~4 ms</div>
      <div class="bar-label">With DQL subquery<br/>(single query)</div>
    </div>
  </div>
  <div class="nplus-legend">
    <span><span class="leg-dot" style="background:#f38ba8;"></span> Queries without fix</span>
    <span><span class="leg-dot" style="background:#a6e3a1;"></span> Queries with fix</span>
  </div>
</div>

<script>
(function() {
  var slider   = document.getElementById('nplusSlider');
  var valEl    = document.getElementById('nplusVal');
  var barBad   = document.getElementById('barBad');
  var barGood  = document.getElementById('barGood');
  var countBad = document.getElementById('countBad');
  var timeBad  = document.getElementById('timeBad');
  var timeGood = document.getElementById('timeGood');

  function update() {
    var n = parseInt(slider.value, 10);
    valEl.textContent = n;
    var badQ  = n + 1;
    var badMs = Math.round(badQ * 3.2);
    countBad.textContent = badQ + ' queries';
    timeBad.textContent  = '~' + badMs + ' ms';
    timeGood.textContent = '~4 ms';
    var maxQ = 201;
    var badPct  = Math.min((badQ / maxQ) * 100, 100);
    var goodPct = (1 / maxQ) * 100;
    barBad.style.height  = badPct  + '%';
    barGood.style.height = Math.max(goodPct * 4, 3) + '%';
  }

  slider.addEventListener('input', update);
  update();
})();
</script>

---

## Serialization Groups

{: class="marginalia" }
Without serialization<br/>groups, API Platform<br/>serializes everything<br/>Doctrine loads — including<br/>internal fields, relations,<br/>and anything marked<br/>`#[Ignore]`.

The `#[Groups]` attribute is how you control which fields appear in which context. It seems like overhead at first, but it's the thing I'd enforce from day one on any real project.

Flip the cards below to see what the API response looks like with and without groups:

<div class="flip-row">
  <div class="flip-card" id="flipCard1" onclick="this.classList.toggle('flipped')">
    <div class="flip-inner">
      <div class="flip-front">
        <div class="flip-tag">❌ Without Groups</div>
        <div class="flip-title">GET /api/mangas/1</div>
        <pre style="font-size:11px;margin:0;line-height:1.6;color:rgba(255,255,255,.7);overflow:auto;flex:1;">{
  "id": 1,
  "title": "Yotsuba&!",
  "volumes": [...],
  "createdAt": "2024-01-01",
  "updatedAt": "2024-03-15",
  "__initializer__": null,
  "__cloner__": null,
  "__isInitialized__": true,
  "password": null,
  "roles": []
}</pre>
        <div class="flip-hint">click to flip →</div>
      </div>
      <div class="flip-back">
        <div class="flip-tag">✅ With Groups</div>
        <div class="flip-title">GET /api/mangas/1</div>
        <pre style="font-size:11px;margin:0;line-height:1.6;color:rgba(255,255,255,.85);overflow:auto;flex:1;">{
  "@context": "/api/contexts/Manga",
  "@id": "/api/mangas/1",
  "@type": "Manga",
  "id": 1,
  "title": "Yotsuba&!",
  "englishTitle": "Yotsuba&!",
  "coverImageUrl": "https://...",
  "totalVocabularyCount": 842
}</pre>
        <div class="flip-hint">← click to flip back</div>
      </div>
    </div>
  </div>

  <div class="flip-card" id="flipCard2" onclick="this.classList.toggle('flipped')">
    <div class="flip-inner">
      <div class="flip-front">
        <div class="flip-tag">❌ Leaking internals</div>
        <div class="flip-title">Vocabulary entity</div>
        <pre style="font-size:11px;margin:0;line-height:1.6;color:rgba(255,255,255,.7);overflow:auto;flex:1;">{
  "id": 99,
  "word": "食べる",
  "reading": "たべる",
  "meaning": "to eat",
  "page": {
    "id": 12,
    "pageNumber": 4,
    "volume": {
      "id": 3,
      "manga": {
        "id": 1,
        ...deeply nested...
      }
    }
  }
}</pre>
        <div class="flip-hint">click to flip →</div>
      </div>
      <div class="flip-back">
        <div class="flip-tag">✅ Controlled output</div>
        <div class="flip-title">Vocabulary entity</div>
        <pre style="font-size:11px;margin:0;line-height:1.6;color:rgba(255,255,255,.85);overflow:auto;flex:1;">{
  "@id": "/api/vocabularies/99",
  "@type": "Vocabulary",
  "id": 99,
  "word": "食べる",
  "reading": "たべる",
  "meaning": "to eat",
  "page": "/api/pages/12"
}</pre>
        <div class="flip-hint">← click to flip back</div>
      </div>
    </div>
  </div>
</div>

The right side shows a clean, intentional contract. The `page` relation is an IRI — the client can fetch it if they need it, or ignore it. No surprise circular references, no leaked Doctrine proxy internals.

---

## Heroku + RDS Deployment

{: class="marginalia" }
Heroku's ephemeral<br/>filesystem was the<br/>biggest gotcha. Any<br/>uploaded file survives<br/>only until the dyno<br/>restarts — which happens<br/>at least once a day.

The path from "works on my machine" to stable production took five days. Click each milestone to see what went wrong and how I fixed it:

<div class="timeline-wrap">
  <h3>🚀 Deployment Journey</h3>
  <div class="tl-track" id="tlTrack">
    <div class="tl-item" data-day="Day 1" data-title="Local success"
         data-desc="&lt;strong&gt;Docker works perfectly.&lt;/strong&gt; All endpoints responding, JWT auth working, migrations running on startup. Pushed to a private GitHub repo and added a Heroku remote. Heroku buildpack for PHP detected Composer and installed dependencies automatically. First &lt;code&gt;git push heroku main&lt;/code&gt; succeeded.">
      <div class="tl-dot">🐳</div>
      <div class="tl-day">Day 1</div>
      <div class="tl-title">Docker works locally</div>
    </div>
    <div class="tl-item" data-day="Day 2" data-title="Ephemeral FS disaster"
         data-desc="&lt;strong&gt;Uploaded manga cover images vanished overnight.&lt;/strong&gt; Heroku dynos have an ephemeral filesystem — anything written to disk is gone after a dyno restart. I was storing cover images in &lt;code&gt;public/uploads/&lt;/code&gt;. Every nightly restart wiped them. Had to rethink file storage.">
      <div class="tl-dot">💥</div>
      <div class="tl-day">Day 2</div>
      <div class="tl-title">Images vanish overnight</div>
    </div>
    <div class="tl-item" data-day="Day 3" data-title="S3 migration"
         data-desc="&lt;strong&gt;Switched to AWS S3 via league/flysystem-aws-s3-v3.&lt;/strong&gt; The VichUploaderBundle + Flysystem adapter made this surprisingly painless — just swap the storage adapter in config. Hit &lt;code&gt;AccessControlListNotSupported&lt;/code&gt; errors because my S3 bucket had ACLs disabled (the new AWS default). Fixed by setting &lt;code&gt;use_path_style_endpoint: false&lt;/code&gt; and removing &lt;code&gt;ACL: public-read&lt;/code&gt; from the upload config.">
      <div class="tl-dot">☁️</div>
      <div class="tl-day">Day 3</div>
      <div class="tl-title">Migrate to S3</div>
    </div>
    <div class="tl-item" data-day="Day 4" data-title="RDS SSL cert"
         data-desc="&lt;strong&gt;Doctrine refused to connect to RDS.&lt;/strong&gt; Amazon RDS requires SSL by default, but the root CA bundle wasn't trusted by the PHP container. Fixed by downloading the Amazon RDS CA bundle and adding &lt;code&gt;?sslca=/path/to/rds-ca-bundle.pem&lt;/code&gt; to the &lt;code&gt;DATABASE_URL&lt;/code&gt; env var. Also set &lt;code&gt;ATTR_SSL_VERIFY_SERVER_CERT: false&lt;/code&gt; in doctrine.yaml (acceptable for our threat model).">
      <div class="tl-dot">🔐</div>
      <div class="tl-day">Day 4</div>
      <div class="tl-title">RDS SSL cert woes</div>
    </div>
    <div class="tl-item" data-day="Day 5" data-title="Stable production"
         data-desc="&lt;strong&gt;Stable.&lt;/strong&gt; Images persisting on S3, DB connecting over SSL, JWT tokens working, OpenAPI docs live at &lt;code&gt;/api/docs&lt;/code&gt;. Set up a Heroku scheduler to prune expired JWT tokens daily. The iOS app shipped to TestFlight a week later.">
      <div class="tl-dot">✅</div>
      <div class="tl-day">Day 5</div>
      <div class="tl-title">Stable production</div>
    </div>
  </div>
  <div class="tl-details" id="tlDetails"></div>
</div>

<script>
(function() {
  var items = document.querySelectorAll('.tl-item');
  var details = document.getElementById('tlDetails');

  items.forEach(function(item) {
    item.querySelector('.tl-dot').addEventListener('click', function() {
      var wasActive = item.classList.contains('active');
      items.forEach(function(i) { i.classList.remove('active'); });
      details.classList.remove('visible');
      if (!wasActive) {
        item.classList.add('active');
        details.innerHTML = item.getAttribute('data-desc');
        details.classList.add('visible');
      }
    });
  });
})();
</script>

---

## Custom Operations

{: class="marginalia" }
Custom operations are<br/>the escape hatch. When<br/>the standard CRUD<br/>operations don't fit,<br/>you define exactly the<br/>HTTP contract you want.

Standard CRUD covers most of Kotoba, but one endpoint needed custom logic: `GET /api/vocabulary/common` — the most common words the authenticated user *hasn't* learned yet. This drives the "Study" tab in the iOS app.

<pre class="code-block"><span class="cm">// src/Entity/Vocabulary.php — custom collection operation</span>
<span class="at">#[ApiResource(</span>
<span class="at">    operations: [</span>
<span class="at">        new GetCollection(),</span>
<span class="at">        new Get(),</span>
<span class="at">        new GetCollection(</span>
<span class="at">            uriTemplate: '/vocabulary/common',</span>
<span class="at">            controller: CommonVocabularyController::class,</span>
<span class="at">            security: "is_granted('ROLE_USER')",</span>
<span class="at">            paginationEnabled: true,</span>
<span class="at">            openapiContext: [</span>
<span class="at">                'summary'     =&gt; 'Get most common unknown words for the current user',</span>
<span class="at">                'description' =&gt; 'Returns vocabulary words ordered by frequency across all manga, excluding words the user already knows.',</span>
<span class="at">            ]</span>
<span class="at">        ),</span>
<span class="at">    ]</span>
<span class="at">)]</span>
<span class="kw">class</span> <span class="cl">Vocabulary</span> { <span class="cm">/* ... */</span> }</pre>

<pre class="code-block"><span class="cm">// src/Controller/CommonVocabularyController.php</span>
<span class="kw">class</span> <span class="cl">CommonVocabularyController</span> <span class="kw">extends</span> <span class="cl">AbstractController</span>
{
    <span class="kw">public function</span> <span class="fn">__invoke</span>(
        VocabularyRepository <span class="fn">$repo</span>,
        Request <span class="fn">$request</span>
    ): <span class="nb">array</span> {
        <span class="fn">$user</span> = <span class="fn">$this</span>-&gt;<span class="fn">getUser</span>();
        <span class="fn">$page</span> = (int) <span class="fn">$request</span>-&gt;<span class="fn">query</span>-&gt;<span class="fn">get</span>(<span class="st">'page'</span>, <span class="nb">1</span>);
        <span class="fn">$limit</span> = (int) <span class="fn">$request</span>-&gt;<span class="fn">query</span>-&gt;<span class="fn">get</span>(<span class="st">'itemsPerPage'</span>, <span class="nb">20</span>);

        <span class="kw">return</span> <span class="fn">$repo</span>-&gt;<span class="fn">findCommonUnknownForUser</span>(<span class="fn">$user</span>, <span class="fn">$page</span>, <span class="fn">$limit</span>);
    }
}</pre>

<pre class="code-block"><span class="cm">// src/Repository/VocabularyRepository.php</span>
<span class="kw">public function</span> <span class="fn">findCommonUnknownForUser</span>(
    User <span class="fn">$user</span>,
    <span class="nb">int</span> <span class="fn">$page</span> = <span class="nb">1</span>,
    <span class="nb">int</span> <span class="fn">$limit</span> = <span class="nb">20</span>
): <span class="nb">array</span> {
    <span class="kw">return</span> <span class="fn">$this</span>-&gt;<span class="fn">createQueryBuilder</span>(<span class="st">'v'</span>)
        -&gt;<span class="fn">leftJoin</span>(
            <span class="st">'App\Entity\KnownWord'</span>, <span class="st">'kw'</span>,
            <span class="st">'WITH'</span>, <span class="st">'kw.vocabulary = v AND kw.user = :user'</span>
        )
        -&gt;<span class="fn">andWhere</span>(<span class="st">'kw.id IS NULL'</span>)
        -&gt;<span class="fn">setParameter</span>(<span class="st">'user'</span>, <span class="fn">$user</span>)
        -&gt;<span class="fn">orderBy</span>(<span class="st">'v.frequencyRank'</span>, <span class="st">'ASC'</span>)
        -&gt;<span class="fn">setFirstResult</span>((<span class="fn">$page</span> - <span class="nb">1</span>) * <span class="fn">$limit</span>)
        -&gt;<span class="fn">setMaxResults</span>(<span class="fn">$limit</span>)
        -&gt;<span class="fn">getQuery</span>()
        -&gt;<span class="fn">getResult</span>();
}</pre>

{: class="marginalia" }
API Platform generates<br/>OpenAPI docs automatically<br/>— your iOS and web clients<br/>always have up-to-date<br/>documentation without<br/>any extra work.

The `openapiContext` key on the custom operation means `/api/docs` shows a proper description for this endpoint. My iOS developer (me, wearing a different hat) never had to ask "what does this endpoint return?"

---

## Lessons Learned: Interactive Checklist

{: class="marginalia" }
The `messenger` component<br/>is perfect for async jobs<br/>like AI-based vocabulary<br/>extraction from manga<br/>images. Dispatch a message<br/>in the controller, process<br/>it in a background worker.

Six weeks of real usage crystallised these into non-negotiable practices. Click each item to mark it as acknowledged:

<ul class="checklist" id="lessons">
  <li>
    <div class="check-icon">✓</div>
    <div class="check-text">
      <strong>Use #[Groups] from day one</strong>
      <span>Without serialization groups, API Platform serializes everything Doctrine loads — including proxy internals, circular references, and fields you never intended to expose. Retrofitting groups onto an existing API is painful.</span>
    </div>
  </li>
  <li>
    <div class="check-icon">✓</div>
    <div class="check-text">
      <strong>Disable ACLs on S3 buckets</strong>
      <span>New AWS buckets have ACLs disabled by default. If you get <code>AccessControlListNotSupported</code>, remove <code>ACL: public-read</code> from your Flysystem config and use bucket policies instead for public read access.</span>
    </div>
  </li>
  <li>
    <div class="check-icon">✓</div>
    <div class="check-text">
      <strong>Use hash_equals() in custom auth, never ===</strong>
      <span>String comparison with <code>===</code> is vulnerable to timing attacks. <code>hash_equals()</code> runs in constant time regardless of where the strings diverge. Symfony's <code>isPasswordValid()</code> does this for you — but any custom comparison must too.</span>
    </div>
  </li>
  <li>
    <div class="check-icon">✓</div>
    <div class="check-text">
      <strong>Add X-Total-Count header for iOS pagination</strong>
      <span>API Platform returns a <code>hydra:totalItems</code> field in JSON-LD, but iOS's URLSession clients often find it easier to read a plain <code>X-Total-Count</code> header. Add an <code>EventSubscriber</code> on <code>kernel.response</code> to set it.</span>
    </div>
  </li>
  <li>
    <div class="check-icon">✓</div>
    <div class="check-text">
      <strong>Use ApiTestCase for integration tests</strong>
      <span><code>ApiPlatform\Symfony\Bundle\Test\ApiTestCase</code> gives you a real HTTP client that boots the kernel, runs migrations against a test DB, and lets you assert JSON-LD responses. Way more confidence than mocked unit tests alone.</span>
    </div>
  </li>
  <li>
    <div class="check-icon">✓</div>
    <div class="check-text">
      <strong>Profile with Symfony Profiler before optimizing</strong>
      <span>The Symfony web profiler shows every Doctrine query per request with execution time. I found three N+1 problems I didn't know about until I looked at the profiler. Don't guess — measure first.</span>
    </div>
  </li>
  <li>
    <div class="check-icon">✓</div>
    <div class="check-text">
      <strong>JSON-LD @id fields are worth the verbosity</strong>
      <span>At first the <code>@context</code>, <code>@id</code>, <code>@type</code> felt over-engineered. But the iOS app uses <code>@id</code> URIs to cache and invalidate resources. Relations become self-describing — the client navigates the API without hardcoded IDs.</span>
    </div>
  </li>
</ul>

<script>
(function() {
  document.querySelectorAll('.checklist li').forEach(function(li) {
    li.addEventListener('click', function() {
      li.classList.toggle('checked');
    });
  });
})();
</script>

---

## Where It Stands Today

{: class="marginalia" }
Next: replacing the manual<br/>vocabulary entry with an<br/>ML pipeline. Symfony<br/>Messenger dispatches<br/>an image to a FastAPI<br/>service that runs manga<br/>OCR and returns words.

Kotoba's API currently serves about 40 active beta users. The stack has been stable since that fifth day. Response times are well under 100ms for most endpoints — the DQL optimizations helped a lot.

If I were starting again, I'd make two changes: use **API Platform's State Providers** instead of custom controllers from the start (they compose better with the platform's pagination and filtering), and add the Symfony Profiler to the `dev` environment on day one rather than week three.

API Platform is the fastest way I've found to get from a domain model to a production-quality REST API in PHP. The JSON-LD layer feels heavy until you understand it — then it feels inevitable. The `#[ApiResource]` attribute is genuinely magic, until you need to step outside it, at which case the escape hatches (custom operations, state providers, event subscribers) are clean and well-documented.

The iOS app ships next month. The API will be ready.
