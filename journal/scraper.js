#!/usr/bin/env node

/**
 * O Matinal — RSS Scraper
 * Coleta notícias e gera Markdown para Jekyll
 */

import axios from 'axios';
import xml2js from 'xml2js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchJokes } from './jokes-scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RSS_FEEDS = [
  { name: 'G1 - Globo', url: 'https://g1.globo.com/rss/feeds/geral/', category: 'Notícias' },
  { name: 'Folha - Poder', url: 'https://feeds.folha.uol.com.br/poder/rss091.xml', category: 'Política' },
  { name: 'Folha - Mundo', url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml', category: 'Mundo' },
  { name: 'Folha - Cotidiano', url: 'https://feeds.folha.uol.com.br/cotidiano/rss091.xml', category: 'Notícias' },
  { name: 'BBC News', url: 'https://feeds.bbc.co.uk/news/rss.xml', category: 'Mundo' }
];

async function fetchRSS(url) {
  try {
    const response = await axios.get(url, { timeout: 8000 });
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    const items = result.rss?.channel?.[0]?.item || [];
    return items.slice(0, 3).map((item) => ({
      title: item.title?.[0] || 'Sem título',
      description: item.description?.[0] || item.summary?.[0] || '',
      link: item.link?.[0] || '#',
      pubDate: item.pubDate?.[0] || new Date().toISOString(),
      category: item.category?.[0] || 'Geral'
    }));
  } catch (error) {
    console.warn(`⚠️  Erro ao buscar ${url}: ${error.message}`);
    return [];
  }
}

function generateNewspaperMarkdown(articles, jokes) {
  const today = new Date();
  const todayBR = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  let markdown = `---
layout: journal-vintage
title: "O Matinal — ${todayBR}"
date: ${today.toISOString()}
categories: journal
articles_count: ${articles.length}
jokes_count: ${jokes.length}
permalink: /journal_articles/${year}/${month}/${day}/
---

<section class="section">
  <h2 class="section-title">📰 Notícias Principais</h2>
`;

  // ... resto do código igual


  // Artigo destaque (o primeiro)
  if (articles.length > 0) {
    const featured = articles[0];
    markdown += `  <article class="article article-featured">
    <div class="article-source">⭐ ${featured.source}</div>
    <h3 class="article-title">${featured.title}</h3>
    <div class="article-content drop-cap">${featured.description}</div>
  </article>

  <div class="separator">─────────────────────</div>

`;
  }

  // Outros artigos
  for (let i = 1; i < Math.min(articles.length, 15); i++) {
    const article = articles[i];
    markdown += `  <article class="article">
    <div class="article-source">${article.source}</div>
    <h3 class="article-title">${article.title}</h3>
    <div class="article-content">${article.description}</div>
  </article>

`;
  }

  markdown += `</section>

`;

  // Seção de Piadas
  if (jokes.length > 0) {
    markdown += `<section class="section">
  <h2 class="section-title">😂 Anedotas & Pilhérias</h2>
  <p><em>"A risa é a melhor medicina" - Provérbio antigo</em></p>

`;

    jokes.forEach((joke, index) => {
      markdown += `  <div class="joke">
    <div class="joke-title">${index + 1}. ${joke.title}</div>
    <div class="joke-content">${joke.content}</div>
  </div>

`;
    });

    markdown += `</section>

`;
  }

  return markdown;
}

async function main() {
  console.log('\n📰 O Matinal — Gerando Edição...\n');

  try {
    // Coleta RSS
    const allArticles = [];
    for (const feed of RSS_FEEDS) {
      console.log(`  • ${feed.name}...`);
      const articles = await fetchRSS(feed.url);
      allArticles.push(...articles.map(a => ({ ...a, source: feed.name })));
    }

    console.log(`✅ ${allArticles.length} artigos coletados\n`);

    // Coleta piadas
    const jokes = await fetchJokes();
    console.log(`✅ ${jokes.length} piadas coletadas\n`);

    // Gera Markdown
    const markdown = generateNewspaperMarkdown(allArticles, jokes);

    // Prepara datas
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // Cria diretório YYYY/MM/DD
    const articleDir = path.join(__dirname, '..', '_journal_articles', String(year), month, day);
    await fs.mkdir(articleDir, { recursive: true });

    // Remove artigos individuais antigos (se houver)
    try {
      const files = await fs.readdir(articleDir);
      for (const file of files) {
        if (file.endsWith('.md') && file !== 'index.md') {
          await fs.unlink(path.join(articleDir, file));
        }
      }
    } catch (e) {
      // Diretório vazio, ignore
    }

    // Escreve index.md (página única)
    const filepath = path.join(articleDir, 'index.md');
    await fs.writeFile(filepath, markdown, 'utf-8');

    console.log(`📝 Edição criada: _journal_articles/${year}/${month}/${day}/index.md`);
    console.log('✅ Pronto para Jekyll gerar o HTML!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
