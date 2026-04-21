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

async function generateMarkdown(articles) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const jekyllDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let markdown = `---
layout: journal
title: "O Matinal — ${jekyllDate}"
date: ${today.toISOString()}
categories: journal
---

# 📰 O Matinal — ${jekyllDate}

Edição automática gerada com as principais notícias do dia.

## Notícias Principais

`;

  // Artigo destaque
  if (articles.length > 0) {
    const featured = articles[0];
    markdown += `### ${featured.title}

${featured.description}

**Fonte**: ${featured.source || 'G1'}  
[Ler na íntegra →](${featured.link})

---

`;
  }

  // Outros artigos
  for (let i = 1; i < Math.min(articles.length, 10); i++) {
    const article = articles[i];
    markdown += `### ${article.title}

${article.description}

**Fonte**: ${article.source || 'Fonte'}  
[Leia mais →](${article.link})

---

`;
  }

  return markdown;
}

async function main() {
  console.log('\n📰 O Matinal — Coletando notícias...\n');

  try {
    // Coleta RSS
    const allArticles = [];
    for (const feed of RSS_FEEDS) {
      console.log(`  • ${feed.name}...`);
      const articles = await fetchRSS(feed.url);
      allArticles.push(...articles.map(a => ({ ...a, source: feed.name })));
    }

    console.log(`\n✅ ${allArticles.length} artigos coletados\n`);

    // Gera Markdown
    const markdown = await generateMarkdown(allArticles);

    // Salva em _journal_articles/
    const today = new Date().toISOString().split('T')[0];
    const filename = `${today}-o-matinal.md`;
    const filepath = path.join(__dirname, '..', '_journal_articles', filename);

    // Garante que o diretório existe
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    await fs.writeFile(filepath, markdown, 'utf-8');

    console.log(`📝 Artigo criado: _journal_articles/${filename}`);
    console.log('✅ Pronto para Jekyll gerar o HTML!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
