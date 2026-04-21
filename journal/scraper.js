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

function formatDateBR(date) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

async function generateArticleMarkdown(article, index, todayDate, todayBR) {
  const markdown = `---
layout: journal
title: "${article.title}"
date: ${todayDate}
categories: journal
source: "${article.source}"
---

# ${article.title}

${article.description}

**Fonte**: ${article.source}  
[Ler na íntegra →](${article.link})
`;

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

    // Prepara datas
    const today = new Date();
    const todayISO = today.toISOString();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayBR = formatDateBR(today);

    // Cria diretório YYYY/MM/DD
    const articleDir = path.join(__dirname, '..', '_journal_articles', String(year), month, day);
    await fs.mkdir(articleDir, { recursive: true });

    // Escreve cada artigo em um arquivo separado
    for (let i = 0; i < allArticles.length; i++) {
      const article = allArticles[i];
      const markdown = await generateArticleMarkdown(article, i, todayISO, todayBR);
      
      const articleNum = String(i + 1).padStart(2, '0');
      const filename = `${articleNum}-${article.title.toLowerCase().replace(/[^\w]/g, '-').replace(/-+/g, '-').substring(0, 30)}.md`;
      const filepath = path.join(articleDir, filename);
      
      await fs.writeFile(filepath, markdown, 'utf-8');
      console.log(`📝 ${filename}`);
    }

    console.log(`\n✅ ${allArticles.length} artigos criados em _journal_articles/${year}/${month}/${day}/`);
    console.log('✅ Pronto para Jekyll gerar o HTML!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
