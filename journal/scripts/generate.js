#!/usr/bin/env node

import 'dotenv/config.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import NewsScraper from './scraper.js';
import GeminiCurator from './curator.js';
import TemplateRenderer from './renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  const DEBUG = process.env.DEBUG === 'true';
  const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║  📰 O MATINAL — GERADOR DE JORNAL    ║', 'blue');
  log('╚════════════════════════════════════════╝\n', 'blue');

  try {
    // 1. Carregar configuração
    log('📂 Carregando configuração...', 'yellow');
    const configPath = path.join(__dirname, '..', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    log('✓ Configuração carregada\n', 'green');

    // 2. Scraping de notícias
    log('📰 ETAPA 1: Coletando notícias...', 'blue');
    const scraper = new NewsScraper(config);
    const articles = await scraper.scrapeAllFeeds(config);

    if (articles.length === 0) {
      throw new Error('Nenhum artigo foi coletado. Verifique os RSS feeds.');
    }

    // 3. Curação com Gemini
    let curatedContent;
    if (process.env.GEMINI_API_KEY) {
      log('🤖 ETAPA 2: Curando conteúdo com Gemini...', 'blue');
      const curator = new GeminiCurator(process.env.GEMINI_API_KEY);
      curatedContent = await curator.generateJournalContent(articles);
    } else {
      log('⚠️  ETAPA 2: GEMINI_API_KEY não configurada, usando conteúdo bruto...', 'yellow');
      curatedContent = {
        articles: articles.map(a => ({
          ...a,
          summary: a.description,
          highlight: a.title
        })),
        quote: { quote: 'Conhecimento é poder', author: 'Provérbio' },
        facts: ['Fato 1', 'Fato 2', 'Fato 3'],
        games: {
          charada: 'Charada do dia?',
          palavra: { word: 'palavra', definition: 'definição' },
          curiosidade: 'Curiosidade do dia'
        }
      };
    }

    // 4. Renderizar template
    log('\n🎨 ETAPA 3: Renderizando template...', 'blue');
    const templateName = config.journal.template || 'template-premium.html';
    const templatePath = path.join(__dirname, '..', templateName);
    
    const renderer = new TemplateRenderer(templatePath);
    const html = await renderer.render(curatedContent, config);

    // 5. Salvar arquivo
    log('\n💾 ETAPA 4: Salvando arquivo...', 'blue');
    const today = new Date().toISOString().split('T')[0];
    const outputPath = path.join(__dirname, '..', `${today}.html`);
    
    await fs.writeFile(outputPath, html, 'utf-8');
    log(`✓ Jornal salvo: ${outputPath}\n`, 'green');

    // 6. Relatório final
    log('╔════════════════════════════════════════╗', 'green');
    log('║           ✅ SUCESSO!                 ║', 'green');
    log('╚════════════════════════════════════════╝', 'green');
    
    log(`\n📊 RESUMO DA GERAÇÃO:`, 'green');
    log(`  • Data: ${today}`, 'green');
    log(`  • Artigos: ${curatedContent.articles.length}`, 'green');
    log(`  • Template: ${templateName}`, 'green');
    log(`  • Arquivo: ${outputPath}`, 'green');

    if (!GITHUB_ACTIONS) {
      log(`\n🔗 Abra no navegador:`, 'green');
      log(`  file://${outputPath}`, 'blue');
    }

    log('\n📱 Para testar em Kindle:');
    log('  1. Abra em navegador (desktop)', 'yellow');
    log('  2. F12 → Modo responsivo → Kindle Paperwhite', 'yellow');
    log('  3. Ou use: https://read.amazon.com/', 'yellow');

    process.exit(0);

  } catch (error) {
    log('\n╔════════════════════════════════════════╗', 'red');
    log('║           ❌ ERRO!                    ║', 'red');
    log('╚════════════════════════════════════════╝', 'red');
    
    log(`\n${error.message}\n`, 'red');

    if (DEBUG) {
      log('\nStack trace:', 'red');
      console.error(error);
    }

    log('💡 Dicas para resolver:');
    log('  1. Verifique GEMINI_API_KEY em .env ou GitHub Secrets', 'yellow');
    log('  2. Teste os RSS feeds manualmente', 'yellow');
    log('  3. Verifique permissões de arquivo', 'yellow');
    log('  4. Execute com DEBUG=true para mais detalhes', 'yellow');

    process.exit(1);
  }
}

// Executar
main();
