import axios from 'axios';
import * as cheerio from 'cheerio';
import xml2js from 'xml2js';

const DEBUG = process.env.DEBUG === 'true';

class NewsScraper {
  constructor(config) {
    this.config = config;
    this.articles = [];
    this.parser = new xml2js.Parser();
  }

  log(message) {
    if (DEBUG) console.log(`[SCRAPER] ${message}`);
  }

  async scrapeRSSFeed(source) {
    try {
      this.log(`Scraping RSS: ${source.rss_url}`);
      
      const response = await axios.get(source.rss_url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; O-Matinal-Bot)'
        }
      });

      const parsed = await this.parser.parseStringPromise(response.data);
      const items = parsed.rss?.channel?.[0]?.item || [];

      const articles = items.slice(0, 3).map((item, index) => ({
        id: `${source.source}-${index}`,
        title: item.title?.[0] || 'Sem título',
        description: item.description?.[0] || 'Sem descrição',
        content: item.content || item.description?.[0] || '',
        link: item.link?.[0] || '#',
        category: source.category || 'Geral',
        source: source.name || 'Fonte',
        imageUrl: this.extractImageFromContent(item.description?.[0] || ''),
        publishedAt: item.pubDate?.[0] || new Date().toISOString(),
        priority: source.priority || 2
      }));

      this.log(`✓ ${articles.length} artigos de ${source.name}`);
      return articles;
    } catch (error) {
      console.warn(`⚠️ Erro ao scraping ${source.name}: ${error.message}`);
      return [];
    }
  }

  extractImageFromContent(htmlContent) {
    if (!htmlContent) return '';
    const $ = cheerio.load(htmlContent);
    const imgSrc = $('img').attr('src');
    return imgSrc || '';
  }

  async scrapeAllFeeds(config) {
    console.log('\n📰 INICIANDO COLETA DE NOTÍCIAS...\n');

    const allSources = [
      ...config.news_sources.portuguese_brazil,
      ...config.news_sources.portuguese_sergipe,
      ...config.news_sources.international_english
    ];

    // Limitar a 5 primeiras fontes para testes
    const sourcesToScrape = allSources.slice(0, 5);

    const results = await Promise.all(
      sourcesToScrape.map(source => this.scrapeRSSFeed(source))
    );

    this.articles = results
      .flat()
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    console.log(`\n✅ Total de artigos coletados: ${this.articles.length}\n`);
    return this.articles;
  }
}

export default NewsScraper;
