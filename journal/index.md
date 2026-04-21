---
layout: default
title: O Matinal - Jornal Pessoal
permalink: /journal/
---

<div class="journal-page">
  <header class="journal-page-header">
    <h1>📰 O Matinal</h1>
    <p class="subtitle">Seu jornal pessoal, gerado automaticamente cada manhã</p>
  </header>

  <section class="journal-description">
    <p>
      <strong>O Matinal</strong> é um jornal eletrônico gerado diariamente em português brasileiro,
      inspirado no clássico <em>O Malho</em> (1902). Receba as principais notícias do dia,
      curadas por inteligência artificial.
    </p>
  </section>

  <section class="journal-editions">
    <h2>Edições Recentes</h2>
    
    {% assign journal_posts = site.posts | where: "categories", "journal" | sort: "date" | reverse %}
    
    {% if journal_posts.size > 0 %}
      <ul class="editions-list">
        {% for post in journal_posts limit: 30 %}
          <li>
            <a href="{{ post.url }}">
              <span class="edition-date">{{ post.date | date: "%d de %b de %Y" }}</span>
              <span class="edition-title">{{ post.title }}</span>
            </a>
          </li>
        {% endfor %}
      </ul>
    {% else %}
      <p class="no-editions">
        Nenhuma edição gerada ainda. As edições aparecerão aqui assim que forem criadas.
      </p>
    {% endif %}
  </section>

  <section class="journal-info">
    <h2>Como Funciona?</h2>
    <div class="info-box">
      <h3>🔄 Processo Automático</h3>
      <ol>
        <li><strong>Coleta:</strong> RSS feeds são coletados de várias fontes</li>
        <li><strong>Processamento:</strong> Artigos são convertidos em Markdown</li>
        <li><strong>Geração:</strong> Jekyll compila para HTML estático</li>
        <li><strong>Publicação:</strong> Novo jornal disponível em seu site</li>
      </ol>
    </div>

    <div class="info-box">
      <h3>📱 Compatibilidade</h3>
      <ul>
        <li>✓ Desktop e navegadores web</li>
        <li>✓ Kindle e e-readers</li>
        <li>✓ Email (pode ser enviado)</li>
        <li>✓ Impressão em papel</li>
      </ul>
    </div>

    <div class="info-box">
      <h3>⚙️ Tecnologia</h3>
      <ul>
        <li>Node.js para coleta RSS</li>
        <li>Jekyll para geração estática</li>
        <li>GitHub Actions para automação</li>
        <li>100% HTML/CSS (sem JavaScript)</li>
      </ul>
    </div>
  </section>
</div>

<style>
  .journal-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
  }

  .journal-page-header {
    text-align: center;
    border-bottom: 3px double #3e2723;
    padding-bottom: 1.5rem;
    margin-bottom: 2rem;
  }

  .journal-page-header h1 {
    font-size: 3rem;
    color: #0a0705;
    margin: 0;
    font-style: italic;
  }

  .subtitle {
    color: #a1887f;
    font-size: 1.1rem;
    margin-top: 0.5rem;
  }

  .journal-description {
    background: #f0f0f0;
    padding: 1.5rem;
    border-left: 4px solid #d4af37;
    margin-bottom: 2rem;
    line-height: 1.8;
  }

  .journal-editions {
    margin: 2rem 0;
  }

  .journal-editions h2 {
    font-size: 1.5rem;
    color: #0a0705;
    border-bottom: 2px solid #d4af37;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  .editions-list {
    list-style: none;
    padding: 0;
  }

  .editions-list li {
    margin: 0.8rem 0;
    padding: 0.8rem;
    background: #fef9f3;
    border: 1px solid #e8dcc8;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .editions-list li:hover {
    background: #f9f3e8;
    border-color: #d4af37;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .editions-list a {
    text-decoration: none;
    color: inherit;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .edition-date {
    color: #a1887f;
    font-weight: bold;
    min-width: 150px;
  }

  .edition-title {
    color: #0a0705;
    flex: 1;
    margin-left: 1rem;
  }

  .no-editions {
    color: #a1887f;
    font-style: italic;
    padding: 1rem;
    text-align: center;
  }

  .journal-info {
    margin-top: 3rem;
  }

  .journal-info h2 {
    font-size: 1.5rem;
    color: #0a0705;
    border-bottom: 2px solid #d4af37;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  .info-box {
    background: #fef9f3;
    border: 1px solid #e8dcc8;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border-radius: 4px;
  }

  .info-box h3 {
    color: #8b0000;
    margin-top: 0;
  }

  .info-box ol,
  .info-box ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .info-box li {
    margin: 0.5rem 0;
    line-height: 1.6;
  }

  /* Responsivo */
  @media (max-width: 600px) {
    .journal-page {
      padding: 1rem;
    }

    .journal-page-header h1 {
      font-size: 2rem;
    }

    .editions-list a {
      flex-direction: column;
      align-items: flex-start;
    }

    .edition-title {
      margin-left: 0;
      margin-top: 0.5rem;
    }
  }
</style>
