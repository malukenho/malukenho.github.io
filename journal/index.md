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
    <h2>Artigos</h2>
    
    {% assign journal_articles = site.journal_articles | sort: "date" | reverse %}
    
    {% if journal_articles.size > 0 %}
      <div class="today-articles">
        <p class="edition-header">📰 Artigos Recentes</p>
        <ul class="articles-list">
          {% for article in journal_articles limit: 20 %}
            <li class="article-item">
              <a href="{{ article.url }}">
                <span class="article-title">{{ article.title }}</span>
                <span class="article-source">{{ article.source }}</span>
              </a>
            </li>
          {% endfor %}
        </ul>
      </div>
    {% else %}
      <p class="no-editions">
        Nenhum artigo disponível ainda. Volte mais tarde!
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
    margin-top: 2rem;
  }

  .today-articles {
    background: #fef9f3;
    border: 2px solid #d4af37;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border-radius: 4px;
  }

  .edition-header {
    font-size: 1.2rem;
    font-weight: bold;
    color: #0a0705;
    margin: 0 0 1rem 0;
  }

  .articles-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .article-item {
    margin: 0.6rem 0;
    padding: 0.8rem;
    background: white;
    border: 1px solid #e8dcc8;
    border-radius: 3px;
    transition: all 0.2s;
  }

  .article-item:hover {
    background: #f9f3e8;
    border-color: #8b0000;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .article-item a {
    text-decoration: none;
    color: inherit;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .article-title {
    color: #0a0705;
    font-weight: 500;
    flex: 1;
  }

  .article-source {
    color: #a1887f;
    font-size: 0.9rem;
    margin-left: 1rem;
  }

  .editions-archive {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .edition-group {
    margin: 0.8rem 0;
    padding: 1rem;
    background: #fef9f3;
    border: 1px solid #e8dcc8;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .edition-date {
    color: #0a0705;
    font-weight: bold;
  }

  .article-count {
    color: #a1887f;
    font-size: 0.9rem;
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

    .article-item a {
      flex-direction: column;
      align-items: flex-start;
    }

    .article-source {
      margin-left: 0;
      margin-top: 0.5rem;
    }

    .edition-group {
      flex-direction: column;
      align-items: flex-start;
    }

    .article-count {
      margin-top: 0.5rem;
    }
  }
</style>
