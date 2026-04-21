# 🛠️ Guia de Implementação — O Matinal

Documento técnico com instruções passo a passo para implementar o pipeline completo de geração do jornal.

## 📋 Dependências

### Instalação Inicial

```bash
npm install dotenv axios cheerio node-rss
```

### Dependências Obrigatórias
- **Node.js** 18+ (para scripts de geração)
- **Google Generative AI SDK**: `npm install @google/generative-ai`
- **dotenv**: Variáveis de ambiente
- **axios**: Requisições HTTP
- **cheerio**: Parse HTML de páginas
- **node-rss**: Parsing de feeds RSS

---

## 🔑 Configuração da API do Gemini

### 1. Obter Chave de API

```bash
# Acesse: https://makersuite.google.com/app/apikey
# Clique em "Create new API key"
# Copie a chave
```

### 2. Adicionar ao GitHub Secrets

```bash
# No seu repositório GitHub:
# Settings → Secrets and variables → Actions
# Name: GEMINI_API_KEY
# Value: <sua-chave-aqui>
```

### 3. Criar .env Local (para testes)

```bash
GEMINI_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-2.0-flash
TIMEZONE=America/Maceio
TEMPLATE=template-v2-responsive.html
```

---

## 📡 Módulo 1: News Scraper

Arquivo: `journal/scripts/scraper.js`

```javascript
const axios = require('axios');
const cheerio = require('cheerio');

class NewsScraper {
  constructor(config) {
    this.config = config;
    this.articles = [];
  }

  async scrapeRSSFeed(feedUrl, category) {
    try {
      const response = await axios.get(feedUrl, { timeout: 10000 });
      // Parse XML com RSS parser
      // Extrair: título, descrição, link, data, imagem
      console.log(`✓ Scraped ${feedUrl}`);
      return articles;
    } catch (error) {
      console.error(`✗ Failed to scrape ${feedUrl}: ${error.message}`);
      return [];
    }
  }

  async scrapeAllFeeds(config) {
    const allArticles = [];
    
    for (const source of config.news_sources.portuguese_brazil) {
      const articles = await this.scrapeRSSFeed(
        source.rss_url,
        source.category
      );
      allArticles.push(...articles);
    }
    
    // Filtrar duplicatas por URL
    // Ordenar por data
    // Limitar a N artigos
    
    return allArticles;
  }
}

module.exports = NewsScraper;
```

### Estrutura de Artigo Retornado

```javascript
{
  title: "Título da Matéria",
  description: "Descrição curta...",
  content: "Conteúdo completo...",
  link: "https://fonte.com/artigo",
  imageUrl: "https://...",
  category: "Tecnologia",
  source: "G1",
  publishedAt: "2026-04-21T10:30:00Z",
  priority: 1
}
```

---

## 🤖 Módulo 2: Gemini Curator

Arquivo: `journal/scripts/curator.js`

```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiCurator {
  constructor(apiKey) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = "gemini-2.0-flash";
  }

  async generateJournalContent(articles, config) {
    // 1. Selecionar artigos melhores
    const selectedArticles = await this.selectBestArticles(
      articles,
      config.content_generation.article_count
    );

    // 2. Reescrever em estilo O Malho
    const refinedArticles = await Promise.all(
      selectedArticles.map(article => this.refineArticle(article))
    );

    // 3. Gerar conteúdo adicional
    const games = await this.generateGames();
    const quote = await this.generateQuote();
    const facts = await this.generateFacts();

    return {
      articles: refinedArticles,
      games,
      quote,
      facts,
      timestamp: new Date().toISOString()
    };
  }

  async refineArticle(article) {
    const prompt = `
Você é um jornalista clássico da revista O Malho (1902). 
Reescreva este artigo em português brasileiro elegante e formal, 
mantendo a essência, mas em estilo jornalístico vintage:

Título: ${article.title}
Conteúdo: ${article.description}

Forneça:
1. Um novo título elegante
2. Um resumo de 100 palavras em estilo O Malho
3. Highlight principal (1 frase)

Formato JSON:
{
  "title": "...",
  "summary": "...",
  "highlight": "..."
}
    `;

    const response = await this.client
      .getGenerativeModel({ model: this.model })
      .generateContent(prompt);

    return JSON.parse(response.response.text());
  }

  async generateGames() {
    // Gerar charada do dia
    // Gerar palavra do dia
    // Gerar curiosidade
  }

  async generateQuote() {
    const prompt = `
Gere uma citação inspiradora ou pensamento profundo do dia,
relacionado a tecnologia, cultura ou vida. Em português.
    `;
    // Chamar Gemini e retornar citação
  }

  async generateFacts() {
    // Gerar 3 fatos interessantes do dia
  }
}

module.exports = GeminiCurator;
```

### Prompt Principal (Refinado para O Malho)

```
Você é um jornalista clássico da revista "O Malho", 
uma das mais importantes publicações satíricas brasileiras (1902-1980).

Reescreva os seguintes artigos em seu estilo:
- Linguagem formal e elegante em português brasileiro
- Tons de crítica social e reflexão
- Estrutura: Manchete → Lide → Corpo do texto
- Máximo 300 palavras por artigo
- Inclua nuances de humor/ironia quando apropriado

Artigos a processar: [LISTA]
```

---

## 🖼️ Módulo 3: Image Processor

Arquivo: `journal/scripts/image-processor.js`

```javascript
const fs = require('fs').promises;
const axios = require('axios');
const sharp = require('sharp'); // npm install sharp

class ImageProcessor {
  constructor(outputDir) {
    this.outputDir = outputDir;
  }

  async downloadAndOptimize(imageUrl, articleId) {
    try {
      // 1. Baixar imagem
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 5000
      });

      // 2. Otimizar com sharp
      const optimized = await sharp(response.data)
        .resize(600, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toBuffer();

      // 3. Verificar tamanho
      if (optimized.length > 200 * 1024) {
        // Reduzir qualidade se > 200KB
        const smaller = await sharp(response.data)
          .resize(600, 400, { fit: 'cover' })
          .jpeg({ quality: 50 })
          .toBuffer();
        return smaller;
      }

      return optimized;
    } catch (error) {
      console.warn(`Failed to process image: ${error.message}`);
      return null;
    }
  }
}

module.exports = ImageProcessor;
```

---

## 🎨 Módulo 4: Template Renderer

Arquivo: `journal/scripts/renderer.js`

```javascript
const fs = require('fs').promises;

class TemplateRenderer {
  constructor(templatePath) {
    this.templatePath = templatePath;
  }

  async render(data) {
    let html = await fs.readFile(this.templatePath, 'utf-8');

    // Substituir placeholders
    html = html.replace(
      '{{featured-title}}',
      data.articles[0].title
    );
    html = html.replace(
      '{{featured-excerpt}}',
      data.articles[0].summary
    );
    html = html.replace(
      '{{featured-image}}',
      data.articles[0].imageUrl || ''
    );

    // Renderizar artigos adicionais
    let articlesHtml = '';
    for (const article of data.articles.slice(1)) {
      articlesHtml += `
        <article>
            <p class="category">${article.category}</p>
            <h3>${article.title}</h3>
            <p>${article.summary}</p>
            ${article.imageUrl ? 
              `<img src="${article.imageUrl}" alt="${article.title}">` 
              : ''}
            <p class="source-attribution">
              <a href="${article.link}">Leia na íntegra →</a> 
              — ${article.source}
            </p>
        </article>
      `;
    }
    html = html.replace('{{articles-section}}', articlesHtml);

    // Renderizar jogos
    html = html.replace('{{riddle}}', data.games.charada);
    html = html.replace('{{word-of-day}}', data.games.palavra);
    html = html.replace('{{curiosity}}', data.games.curiosidade);

    // Renderizar citação
    html = html.replace('{{daily-quote}}', data.quote);

    // Renderizar fatos
    let factsHtml = '';
    for (const fact of data.facts) {
      factsHtml += `<li>${fact}</li>`;
    }
    html = html.replace('{{dailyfacts}}', factsHtml);

    return html;
  }
}

module.exports = TemplateRenderer;
```

---

## ⚙️ Módulo 5: Main Generator Pipeline

Arquivo: `journal/scripts/generate.js`

```javascript
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

const NewsScraper = require('./scraper');
const GeminiCurator = require('./curator');
const ImageProcessor = require('./image-processor');
const TemplateRenderer = require('./renderer');

const config = require('../config.json');

async function generateJournal() {
  console.log('🔄 Iniciando geração de O Matinal...\n');

  try {
    // Step 1: Scrape news
    console.log('📰 Etapa 1: Coletando notícias...');
    const scraper = new NewsScraper(config);
    const articles = await scraper.scrapeAllFeeds(config);
    console.log(`✓ Coletadas ${articles.length} notícias\n`);

    // Step 2: Curate with Gemini
    console.log('🤖 Etapa 2: Curando conteúdo com Gemini...');
    const curator = new GeminiCurator(process.env.GEMINI_API_KEY);
    const curatedContent = await curator.generateJournalContent(articles, config);
    console.log('✓ Conteúdo curado\n');

    // Step 3: Process images
    console.log('🖼️ Etapa 3: Otimizando imagens...');
    const imageProcessor = new ImageProcessor('./images');
    // Process each article's image
    console.log('✓ Imagens otimizadas\n');

    // Step 4: Render template
    console.log('🎨 Etapa 4: Renderizando template...');
    const templatePath = path.join(__dirname, '..', config.journal.template);
    const renderer = new TemplateRenderer(templatePath);
    const html = await renderer.render(curatedContent);
    
    // Step 5: Save output
    const today = new Date().toISOString().split('T')[0];
    const outputPath = path.join(__dirname, '..', `${today}.html`);
    await fs.writeFile(outputPath, html);
    console.log(`✓ Jornal salvo em: ${outputPath}\n`);

    // Step 6: Archive previous (if running in CI/CD)
    if (process.env.GITHUB_ACTIONS) {
      console.log('📦 Etapa 5: Arquivando edição anterior...');
      // Move today's to archive
      // Update archive index
      console.log('✓ Arquivo atualizado\n');
    }

    console.log('✅ Geração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante geração:', error.message);
    process.exit(1);
  }
}

generateJournal();
```

### Execução Local

```bash
# Teste local (requer .env)
node journal/scripts/generate.js

# Output: YYYY-MM-DD.html na pasta journal/
```

---

## 🔄 GitHub Actions Workflow

Arquivo: `.github/workflows/journal.yml`

```yaml
name: 📰 Generate O Matinal

on:
  schedule:
    # 6 AM UTC = 3 AM Brasília (ajuste conforme zona)
    - cron: '0 6 * * *'
  workflow_dispatch: # Permite trigger manual

jobs:
  generate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install dotenv axios cheerio node-rss @google/generative-ai sharp
      
      - name: Generate journal
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: node journal/scripts/generate.js
      
      - name: Archive previous issue
        run: |
          mkdir -p journal/archive
          YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
          [ -f journal/$YESTERDAY.html ] && mv journal/$YESTERDAY.html journal/archive/
      
      - name: Update archive index
        run: node journal/scripts/update-archive-index.js
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
          destination_dir: ./
```

---

## 🧪 Testes

### Teste Local Completo

```bash
# 1. Configure .env
echo "GEMINI_API_KEY=sua_chave" > .env

# 2. Execute geração
node journal/scripts/generate.js

# 3. Abra o arquivo gerado
open journal/$(date +%Y-%m-%d).html

# 4. Teste responsividade (F12)
# 5. Teste em Kindle Cloud Reader
```

### Validação de HTML

```bash
npm install html-validator --save-dev
html-validator journal/*.html
```

---

## 📊 Checklist de Implementação

- [ ] npm install das dependências
- [ ] Gerar chave Gemini API
- [ ] Adicionar GEMINI_API_KEY a GitHub Secrets
- [ ] Implementar `scraper.js` (teste com 1 feed)
- [ ] Implementar `curator.js` (teste com 1 artigo)
- [ ] Implementar `image-processor.js`
- [ ] Implementar `renderer.js`
- [ ] Implementar `generate.js`
- [ ] Testar pipeline local completo
- [ ] Criar `journal.yml` workflow
- [ ] Testar trigger manual no GitHub Actions
- [ ] Verificar primeira edição em production
- [ ] Configurar GitHub Pages se necessário
- [ ] Testar em Kindle Cloud Reader

---

## 🐛 Troubleshooting

### Erro: "GEMINI_API_KEY not found"
```
Solução: Adicione a chave em GitHub Secrets ou crie .env local
```

### Erro: "Failed to scrape RSS feed"
```
Solução: Verifique se a URL RSS está válida e acessível
```

### Imagens não aparecem
```
Solução: Verifique permissões de acesso e tamanho dos arquivos
```

### Template não renderiza
```
Solução: Valide o HTML e placeholders {{}}
```

---

## 📚 Recursos Adicionais

- [Google Generative AI Node.js SDK](https://github.com/google/generative-ai-js)
- [RSS Feed Parsing](https://www.npmjs.com/package/feed)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

Próxima fase: **Começar com o `scraper.js`**

