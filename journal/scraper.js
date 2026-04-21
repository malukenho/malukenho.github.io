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
import { generateAndSaveWeatherImage } from './weather-image-generator.js';
import { generateAndSaveHeaderImage } from './header-image-generator.js';
import { generateAndSaveJokeImage } from './joke-image-generator.js';
import { rewriteAllArticles } from './article-rewriter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache utilities
const CACHE_DIR = path.join(__dirname, '..', 'var', 'cache');
const CACHE_DURATION = 3600000; // 1 hour

async function getCacheFile(key) {
  try {
    const cacheFile = path.join(CACHE_DIR, `${key}.json`);
    const stat = await fs.stat(cacheFile);
    if (Date.now() - stat.mtimeMs < CACHE_DURATION) {
      const data = await fs.readFile(cacheFile, 'utf-8');
      console.log(`  ✓ Cache hit: ${key}`);
      return JSON.parse(data);
    }
  } catch (e) {
    // Cache miss or error
  }
  return null;
}

async function setCacheFile(key, data) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cacheFile = path.join(CACHE_DIR, `${key}.json`);
    await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn(`  ⚠️  Failed to write cache: ${e.message}`);
  }
}

// Mapeamento de charsets comuns para conversão
const charsetMap = {
  'iso-8859-1': 'latin1',
  'iso-8859-15': 'latin1',
  'cp1252': 'latin1',
  'utf-8': 'utf8',
};

const RSS_FEEDS = [
  // ===== BRASIL - Folha =====
  { section: 'Brasil', source: 'Folha - Poder', url: 'https://feeds.folha.uol.com.br/poder/rss091.xml' },
  { section: 'Brasil', source: 'Folha - Cotidiano', url: 'https://feeds.folha.uol.com.br/cotidiano/rss091.xml' },
  { section: 'Brasil', source: 'Folha - Mercado', url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml' },
  
  // ===== BRASIL - O Globo =====
  { section: 'Brasil', source: 'O Globo - Brasil', url: 'https://oglobo.globo.com/rss/feeds/2.xml' },
  { section: 'Brasil', source: 'O Globo - Política', url: 'https://oglobo.globo.com/politica/rss/feeds/2.xml' },
  
  // ===== MUNDO =====
  { section: 'Mundo', source: 'Folha - Mundo', url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml' },
  { section: 'Mundo', source: 'BBC News Mundo', url: 'https://feeds.bbc.co.uk/mundo/rss.xml' },
  
  // ===== TECNOLOGIA & IA & APPLE =====
  { section: 'Tecnologia & IA', source: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { section: 'Tecnologia & IA', source: 'WIRED', url: 'https://www.wired.com/feed/rss' },
  { section: 'Tecnologia & IA', source: 'MacRumors', url: 'https://feeds.macrumors.com/MacRumors/macrumorsall/' },
  { section: 'Tecnologia & IA', source: 'Folha - Tec', url: 'https://feeds.folha.uol.com.br/tec/rss091.xml' },
  
  // ===== CULTURA & HISTÓRIA & ARTE =====
  { section: 'Cultura & História', source: 'Folha - Ilustrada', url: 'https://feeds.folha.uol.com.br/ilustrada/rss091.xml' },
  
  // ===== HOLANDA & BRABANT & LOCAL =====
  { section: 'Holanda & Brabant', source: 'DutchNews', url: 'https://www.dutchnews.nl/feed/' },
  { section: 'Holanda & Brabant', source: 'NOS.nl', url: 'https://feeds.nos.nl/nosnieuwsalgemeen?format=rss' },
  
  // ===== GAMES =====
  { section: 'Games', source: 'IGN', url: 'https://feeds.ign.com/ign/all' },
  { section: 'Games', source: 'Kotaku', url: 'https://kotaku.com/rss' },
  
  // ===== ANIME & MANGA & CULTURA GEEK =====
  { section: 'Anime & Manga', source: 'ANN - Anime News', url: 'https://www.animenewsnetwork.com/news/rss.xml' },
  { section: 'Anime & Manga', source: 'MyAnimeList News', url: 'https://myanimelist.net/rss.php?type=news' },
];

async function fetchWeatherHelmond() {
  try {
    // Helmond coordinates: 51.4416°N, 5.2696°E
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: 51.4416,
        longitude: 5.2696,
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min',
        timezone: 'Europe/Amsterdam',
        temperature_unit: 'celsius'
      },
      timeout: 5000
    });

    const current = response.data.current;
    const daily = response.data.daily;
    
    const weatherDesc = getWeatherDescription(current.weather_code);
    
    return {
      location: 'Helmond, Holanda',
      temp: Math.round(current.temperature_2m),
      description: weatherDesc,
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      maxTemp: Math.round(daily.temperature_2m_max[0]),
      minTemp: Math.round(daily.temperature_2m_min[0])
    };
  } catch (error) {
    console.warn(`  ⚠️  Clima Helmond: ${error.message.substring(0, 40)}`);
    return null;
  }
}

function getWeatherDescription(code) {
  const descriptions = {
    0: 'Céu Limpo',
    1: 'Céu Claro',
    2: 'Parcialmente Nublado',
    3: 'Nublado',
    45: 'Nevoeiro',
    48: 'Nevoeiro',
    51: 'Garoa Leve',
    53: 'Garoa Moderada',
    55: 'Garoa Intensa',
    61: 'Chuva Leve',
    63: 'Chuva Moderada',
    65: 'Chuva Intensa',
    80: 'Aguaceiros Leves',
    81: 'Aguaceiros Moderados',
    82: 'Aguaceiros Intensos',
    85: 'Nevasca Leve',
    86: 'Nevasca Pesada',
    95: 'Tempestade',
    96: 'Tempestade com Granizo',
    99: 'Tempestade com Granizo Pesado'
  };
  return descriptions[code] || 'Variável';
}

function extractImageUrl(item) {
  // Try different ways to extract image URL from RSS item
  // 1. Try media:content
  if (item['media:content']) {
    const media = Array.isArray(item['media:content']) ? item['media:content'][0] : item['media:content'];
    if (media && media.$) return media.$.url;
  }
  
  // 2. Try media:thumbnail
  if (item['media:thumbnail']) {
    const thumb = Array.isArray(item['media:thumbnail']) ? item['media:thumbnail'][0] : item['media:thumbnail'];
    if (thumb && thumb.$) return thumb.$.url;
  }
  
  // 3. Try image tag in description
  const desc = item.description || item.summary || '';
  const imgMatch = String(desc).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  
  // 4. Return null if no image found (no placeholder)
  return null;
}

async function fetchRSS(feed) {
  try {
    // Check cache first
    const cacheKey = `rss-${feed.source.replace(/\s+/g, '-').toLowerCase()}`;
    const cached = await getCacheFile(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await axios.get(feed.url, { 
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer'
    });

    // Detecta charset do XML e converte corretamente
    const buffer = Buffer.from(response.data);
    const bufferStart = buffer.toString('latin1', 0, 300);
    const charsetMatch = bufferStart.match(/encoding=["']([^"']+)["']/i);
    const charset = charsetMap[charsetMatch?.[1]?.toLowerCase()] || 'utf8';
    
    const xmlString = buffer.toString(charset);
    
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      stripPrefix: true
    });
    
    const result = await parser.parseStringPromise(xmlString);
    
    const channel = result.rss?.channel;
    if (!channel) return [];
    
    const items = Array.isArray(channel.item) ? channel.item : [channel.item];
    if (!items) return [];
    
    const articles = items.slice(0, 1).map((item) => {
      let title = item.title || 'Sem título';
      let description = item.description || item.summary || item['content:encoded'] || '';
      let link = item.link || '#';
      
      // Remove CDATA
      title = String(title).replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1').trim();
      description = String(description)
        .replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1')
        .replace(/<p[^>]*>/gi, '') // Remove opening <p> tags
        .replace(/<\/p>/gi, ' ') // Replace closing </p> with space
        .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // No character limit on rewritten articles - keep the full text
      // The Gemini rewrite produces 2-minute reads (150-200 words) naturally
      // description = description.substring(0, 5000); // REMOVED: keeping full content
      
      // Try to extract image from description or use placeholder
      let image = extractImageUrl(item);
      
      return {
        section: feed.section,
        source: feed.source,
        title: title,
        description: description,
        link: link,
        image: image,
        pubDate: item.pubDate || new Date().toISOString()
      };
    });

    // Cache the results
    await setCacheFile(cacheKey, articles);
    return articles;
  } catch (error) {
    // Try to use stale cache on error
    const cacheKey = `rss-${feed.source.replace(/\s+/g, '-').toLowerCase()}`;
    try {
      const staleCache = await fs.readFile(path.join(CACHE_DIR, `${cacheKey}.json`), 'utf-8');
      console.warn(`  ⚠️  ${feed.source}: ${error.message.substring(0, 40)} (usando cache antiga)`);
      return JSON.parse(staleCache);
    } catch (e) {
      console.warn(`  ⚠️  ${feed.source}: ${error.message.substring(0, 40)}`);
      return [];
    }
  }
}

function generateNewspaperMarkdown(allArticles, jokes, weather, weatherImage, headerImage, jokeImage) {
  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const todayBR = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Agrupa artigos por seção
  const bySection = {};
  allArticles.forEach(article => {
    if (!bySection[article.section]) {
      bySection[article.section] = [];
    }
    bySection[article.section].push(article);
  });

  const sectionCount = Object.keys(bySection).length;
  const articleCount = allArticles.length;

  // Front matter YAML
  let markdown = `---
layout: journal-vintage
date: ${year}-${month}-${day}
title: "O Matinal — ${todayBR}"
edition: "${year}-${month}-${day}"
sections: ${sectionCount}
articles: ${articleCount}
permalink: /journal_articles/${year}/${month}/${day}/
---

`;

  // Header image if available (replaces text title)
  if (headerImage) {
    markdown += `<div class="header-image-container">
  <img src="${headerImage}" alt="O Matinal — ${todayBR}" style="width:100%;height:auto;display:block;margin:0;">
</div>

`;
  }

  // Generate vintage newspaper HTML content
  markdown += `<div class="cols-2">
`;

  // Weather section if available
  if (weather) {
    // If we have a generated AI image, show only the image (it contains all weather info)
    if (weatherImage) {
      markdown += `
  <div class="feature-box">
    <img src="${weatherImage}" alt="Clima de ${weather.location}: ${weather.description}" style="width:100%;height:auto;margin:0;display:block;">
  </div>
`;
    } else {
      // Fallback to text-based weather display if image generation failed
      markdown += `
  <div class="feature-box">
    <div class="article-headline">☀️ Clima em Helmond</div>
    <div class="article-subhead">${weather.location}</div>
    <p style="text-align: center; font-size: 20px; margin: 8px 0;">${weather.temp}°C</p>
    <p style="text-align: center; font-size: 13px; margin: 6px 0;">${weather.description}</p>
    <p style="text-align: center; font-size: 12px; color: var(--ink-mid);">
      Máxima: ${weather.maxTemp}°C | Mínima: ${weather.minTemp}°C<br>
      Umidade: ${weather.humidity}% | Vento: ${weather.windSpeed} km/h
    </p>
  </div>
`;
    }
  }

  // Renderiza cada seção
  Object.keys(bySection).sort().forEach((section, idx) => {
    const articles = bySection[section];
    
    markdown += `
  <div class="section-head"><span>${section}</span></div>
  <hr class="section-rule">
`;
    
    articles.forEach(article => {
      const imageHtml = article.image ? `<img src="${article.image}" alt="${article.title}" style="width:100%;height:auto;margin:8px 0;display:block;object-fit:cover;">` : '';
      // Replace newlines with <br> tags for proper HTML rendering
      const descriptionHtml = article.description.replace(/\n/g, '<br/>');
      
      if (article.title.includes('Kodansha')) {
      }
      
      markdown += `
  <div class="article">
    <div class="article-headline">${article.title}</div>
    <div class="article-subhead">${article.source}</div>
    ${imageHtml}
    <p>${descriptionHtml}</p>
    <a href="${article.link}" class="article-link">Leia na fonte →</a>
  </div>
`;
    });
  });

  // Seção de piadas
  if (jokes && jokes.length > 0) {
    markdown += `
  <div class="section-head"><span>Piadas & Humor</span></div>
  <hr class="section-rule">
`;
    // Add joke image if available
    if (jokeImage) {
      markdown += `  <img src="${jokeImage}" alt="Ilustração de piada" style="width:100%;height:auto;display:block;margin:8px 0;object-fit:cover;">
`;
    }
    jokes.forEach((joke) => {
      let jokeText;
      if (typeof joke === 'string') {
        jokeText = joke;
      } else if (joke.title && joke.content) {
        jokeText = `${joke.title}: ${joke.content}`;
      } else {
        jokeText = String(joke);
      }
      markdown += `
  <div class="joke-item">
    <strong>${jokeText}</strong>
  </div>
`;
    });
  }

  markdown += `
</div>
`;

  return markdown;
}

async function main() {
  console.log('\n📰 O Matinal — Gerando Edição...\n');
  console.log('Coletando notícias:');

  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const articlesDir = path.join(__dirname, '..', '_journal_articles', year, month, day);

  // Coleta artigos em paralelo
  const allArticles = [];
  const promises = RSS_FEEDS.map(feed => fetchRSS(feed));
  const results = await Promise.all(promises);
  
  results.forEach(articles => {
    allArticles.push(...articles);
  });

  const kodanshaBefore = allArticles.find(a => a.title?.includes('Kodansha'));
  if (kodanshaBefore) {
  }

  // Reescreve artigos no estilo de O Malho (1902)
  const rewrittenArticles = await rewriteAllArticles(allArticles);

  // Coleta clima
  console.log('  • Coletando clima de Helmond...');
  const weather = await fetchWeatherHelmond();

  // Cria diretório se não existir
  await fs.mkdir(articlesDir, { recursive: true });

  // Gera imagem de clima (skip se já existe)
  let weatherImage = null;
  const weatherImagePath = path.join(articlesDir, 'weather-image.png');
  if (weather) {
    try {
      await fs.access(weatherImagePath);
      console.log('  ✓ Imagem de clima já existe (usando arquivo existente)');
      weatherImage = 'weather-image.png';
    } catch {
      weatherImage = await generateAndSaveWeatherImage(
        weather,
        articlesDir
      );
    }
  }

  // Gera cabeçalho do jornal com top 3 notícias (skip se já existe)
  let headerImage = null;
  const headerImagePath = path.join(articlesDir, 'header-image.png');
  if (rewrittenArticles.length >= 3) {
    try {
      await fs.access(headerImagePath);
      console.log('  ✓ Cabeçalho do jornal já existe (usando arquivo existente)');
      headerImage = 'header-image.png';
    } catch {
      console.log('  • Gerando cabeçalho do jornal com Imagen AI...');
      headerImage = await generateAndSaveHeaderImage(
        rewrittenArticles,
        new Date().toISOString().split('T')[0],
        articlesDir
      );
    }
  }

  // Coleta piadas
  console.log('  • Coletando piadas de historiadoriso.com.br...');
  const jokes = await fetchJokes();
  console.log(`✅ ${jokes.length} piadas coletadas`);

  // Gera imagem para primeira piada (skip se já existe)
  let jokeImage = null;
  if (jokes.length > 0) {
    jokeImage = await generateAndSaveJokeImage(jokes, articlesDir);
  }

  if (rewrittenArticles.length === 0) {
    console.log(`⚠️  Nenhum artigo coletado. Verificando feeds...\n`);
  }

  const kodanshaArticle = rewrittenArticles.find(a => a.title?.includes('Kodansha'));
  if (kodanshaArticle) {
  }

  const markdown = generateNewspaperMarkdown(rewrittenArticles, jokes, weather, weatherImage, headerImage, jokeImage);

  const kodanshaMatch = markdown.match(/Kodansha House.*?<\/div>/s);
  if (kodanshaMatch) {
  }

  // Cria diretório
  await fs.mkdir(articlesDir, { recursive: true });
  
  // Escreve arquivo
  const filePath = path.join(articlesDir, 'index.md');
  await fs.writeFile(filePath, markdown, 'utf8');

  console.log(`📝 Edição criada: ${filePath}`);
  console.log(`📊 Seções: ${Object.keys(allArticles.reduce((acc, a) => ({ ...acc, [a.section]: true }), {})).length}`);
  console.log(`📰 Artigos: ${allArticles.length}`);
  console.log('\n✅ Pronto para Jekyll gerar o HTML!\n');
}

main().catch(console.error);
