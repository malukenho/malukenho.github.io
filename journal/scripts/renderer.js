import fs from 'fs/promises';
import path from 'path';

const DEBUG = process.env.DEBUG === 'true';

class TemplateRenderer {
  constructor(templatePath) {
    this.templatePath = templatePath;
  }

  log(message) {
    if (DEBUG) console.log(`[RENDERER] ${message}`);
  }

  async render(data, config) {
    console.log('\n🎨 RENDERIZANDO TEMPLATE...\n');

    try {
      let html = await fs.readFile(this.templatePath, 'utf-8');
      const today = new Date();
      const dateStr = today.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).toUpperCase();

      // HEADER
      html = html.replace(
        'id="date-line">',
        `id="date-line">${dateStr}</`
      );

      // FEATURED ARTICLE (primeira notícia)
      const featured = data.articles[0] || {};
      html = html.replace('id="featured-title">', `id="featured-title">${featured.title || 'Notícia Principal'}</`);
      html = html.replace('id="featured-subtitle">', `id="featured-subtitle">${featured.summary || featured.description || 'Resumo importante'}</`);
      html = html.replace('id="featured-text">', `id="featured-text">${featured.description || featured.summary || 'Texto do artigo...'}</`);
      html = html.replace('id="featured-source">', `id="featured-source">${featured.source || 'Fonte'}</`);
      html = html.replace('id="featured-date">', `id="featured-date">${today.toLocaleDateString('pt-BR')}</`);
      
      if (featured.link) {
        html = html.replace('href="#" class="source-link"', `href="${featured.link}" class="source-link" target="_blank" rel="noopener noreferrer"`);
      }

      if (featured.imageUrl) {
        html = html.replace(
          'src="data:image/svg+xml,%3Csvg',
          `src="${featured.imageUrl}"`
        );
      }

      // ARTICLES GRID - Divide artigos por categoria
      const categorizedArticles = this.categorizeArticles(data.articles.slice(1));
      
      // Notícias Gerais (main news)
      let newsGrid = categorizedArticles.geral.slice(0, 6).map(a => this.renderArticleCard(a)).join('');
      html = html.replace('<!-- Articles inserted here -->', newsGrid);

      // Política & Economia
      let politicsGrid = categorizedArticles.politica.slice(0, 4).map(a => this.renderArticleCard(a)).join('');
      html = html.replace('<!-- Politics articles inserted here -->', politicsGrid);

      // Tecnologia
      let techGrid = categorizedArticles.tecnologia.slice(0, 4).map(a => this.renderArticleCard(a)).join('');
      html = html.replace('<!-- Tech articles inserted here -->', techGrid);

      // Cultura
      let cultureGrid = categorizedArticles.cultura.slice(0, 3).map(a => this.renderArticleCard(a)).join('');
      html = html.replace('<!-- Culture articles inserted here -->', cultureGrid);

      // Mundo
      let worldGrid = categorizedArticles.mundo.slice(0, 4).map(a => this.renderArticleCard(a)).join('');
      html = html.replace('<!-- World news inserted here -->', worldGrid);

      // OPINION
      const opinion = data.opinion || { 
        title: 'Reflexão Matinal', 
        text: 'A tecnologia e a natureza humanidade precisam conviver harmoniosamente para um futuro melhor.' 
      };
      html = html.replace('id="opinion-title">', `id="opinion-title">${opinion.title}</`);
      html = html.replace('id="opinion-text">', `id="opinion-text">${opinion.text}</`);

      // FACT
      const fact = data.facts && data.facts[0] 
        ? data.facts[0] 
        : 'O jornal O Malho foi publicado entre 1902 e 1930, marcando a história da imprensa brasileira.';
      html = html.replace('id="fact-box">', `id="fact-box"><strong>💡 Você sabia?</strong><p>${fact}</p></`);

      // QUOTE
      const quote = data.quote 
        ? (typeof data.quote === 'string' ? data.quote : data.quote.text || data.quote.quote)
        : 'A leitura é uma porta aberta para mundos infinitos.';
      html = html.replace('id="quote-box">', `id="quote-box">${quote}</`);

      // GAMES & ENTERTAINMENT
      let riddle = 'Qual é o animal que mais parece comigo?';
      let joke = 'Por que o livro de matemática se suicidou? Porque tinha muitos problemas!';
      let trivia = 'Resposta: A (1902)';

      if (data.games) {
        if (data.games.riddle) riddle = data.games.riddle;
        if (data.games.joke) joke = data.games.joke;
        if (data.games.trivia) trivia = data.games.trivia;
      }

      html = html.replace('id="riddle-text">', `id="riddle-text">${riddle}</`);
      html = html.replace('id="joke-text">', `id="joke-text">${joke}</`);
      html = html.replace('id="trivia-text">', `id="trivia-text">${trivia}</`);

      // TIPS
      const tips = data.tips 
        ? data.tips 
        : 'Mantenha-se hidratado! Beber água regularmente melhora a concentração, a energia e a saúde geral.';
      html = html.replace('id="tips-text">', `id="tips-text">${tips}</`);

      console.log('✅ Template renderizado com sucesso!\n');
      return html;
    } catch (error) {
      console.error('❌ Erro ao renderizar template:', error.message);
      throw error;
    }
  }

  categorizeArticles(articles) {
    const categories = {
      geral: [],
      politica: [],
      tecnologia: [],
      cultura: [],
      mundo: [],
      ciencia: []
    };

    for (const article of articles) {
      const cat = (article.category || '').toLowerCase();
      if (cat.includes('polít') || cat.includes('econom')) {
        categories.politica.push(article);
      } else if (cat.includes('tecn') || cat.includes('ia') || cat.includes('inovação')) {
        categories.tecnologia.push(article);
      } else if (cat.includes('cultur') || cat.includes('art') || cat.includes('literatur')) {
        categories.cultura.push(article);
      } else if (cat.includes('mundo') || cat.includes('internacio')) {
        categories.mundo.push(article);
      } else if (cat.includes('ciênc') || cat.includes('natur')) {
        categories.ciencia.push(article);
      } else {
        categories.geral.push(article);
      }
    }

    return categories;
  }

  renderArticleCard(article) {
    const img = article.imageUrl ? `<img class="article-card-image" src="${article.imageUrl}" alt="${article.title}">` : '';
    const source = `<span class="article-source">${article.source || 'Fonte'}</span>`;
    const link = `<a href="${article.link || '#'}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; font-weight: 600;">Ler mais →</a>`;

    return `
      <div class="article-card">
        ${img}
        <h3>${article.title || 'Sem título'}</h3>
        <p class="article-excerpt">${article.description || article.summary || 'Sem descrição disponível'}</p>
        <div class="article-meta">
          ${source}
          <div style="margin-top: 6px;">${link}</div>
        </div>
      </div>
    `;
  }
}

export default TemplateRenderer;
