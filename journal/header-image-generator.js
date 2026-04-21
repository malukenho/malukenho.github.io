#!/usr/bin/env node

/**
 * O Matinal — Header Image Generator
 * Generates vintage newspaper headers with daily news headlines using Imagen AI
 * Style: Victorian-era engraving with "O MATINAL" title and top 3 stories
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateHeaderImage(articles, date, outputDir, retryCount = 0) {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set, skipping header image generation');
    return null;
  }

  try {
    console.log(`  • Gerando cabeçalho do jornal com Imagen AI${retryCount > 0 ? ` (tentativa ${retryCount + 1})` : ''}...`);
    
    // Get top 3 articles from different sections
    const topStories = articles.slice(0, 3).map((article, idx) => ({
      index: idx,
      title: article.title || 'Notícia sem título',
      source: article.source || 'Fonte desconhecida'
    }));

    // Format date in Portuguese (e.g., "terça-feira, 21 de abril de 2026")
    const dateObj = new Date(date);
    const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    
    const dayName = days[dateObj.getDay()];
    const dayNum = dateObj.getDate();
    const monthName = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    const formattedDate = `${dayName}, ${dayNum} de ${monthName} de ${year}`;

    // Create detailed prompt for vintage newspaper header
    const prompt = `Create a vintage 19th-century Brazilian newspaper header in the style of "O Malho" or similar periodicals from 1800s-1900s.

HEADER DESIGN:
- Main title at top: "O MATINAL" (large, ornate serif letters with crosshatching detail)
- Ornamental illustration below title: Victorian-era port city scene with historic buildings, ships with full sails, towers, churches (similar to Lisbon or Brazilian colonial port city aesthetic)
- Fine detail work: Black and white engraving style with detailed crosshatching and line work
- Elegant ornamental border/frame elements around edges
- Three columns of text at the bottom in decorative boxes/banners

CONTENT TO INCLUDE:
Left column headline: "${topStories[0]?.title?.substring(0, 50) || 'NOTÍCIA PRINCIPAL'}"
Left column subtitle: "${topStories[0]?.source || 'Fonte'}"

Center column headline: "${topStories[1]?.title?.substring(0, 50) || 'GRANDE NOVIDADE'}"
Center column subtitle: "${topStories[1]?.source || 'Fonte'}"

Right column headline: "${topStories[2]?.title?.substring(0, 50) || 'ÚLTIMA HORA'}"
Right column subtitle: "${topStories[2]?.source || 'Fonte'}"

STYLE REQUIREMENTS:
- Authentic 1800s Brazilian newspaper aesthetic
- All text in Brazilian Portuguese
- Black and white engraving only (no colors)
- High contrast, crisp lines
- Ornamental flourishes and decorative elements
- Professional newspaper layout with clear hierarchy
- Ready for print publication
- Perfect for Kindle and digital reading

The image should be landscape orientation, approximately 800x600 pixels, showing complete newspaper header ready to be used on a digital newspaper front page.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`,
      {
        instances: [
          {
            prompt: prompt
          }
        ],
        parameters: {
          sampleCount: 1
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    // Check for generated image in response
    const predictions = response.data?.predictions;
    if (predictions && predictions.length > 0) {
      const imageData = predictions[0];
      
      // Handle different response formats
      let imageBuffer = null;
      
      if (typeof imageData === 'string') {
        // Base64 string
        imageBuffer = Buffer.from(imageData, 'base64');
      } else if (imageData.bytesBase64Encoded) {
        imageBuffer = Buffer.from(imageData.bytesBase64Encoded, 'base64');
      } else if (imageData.rawBytes) {
        imageBuffer = Buffer.from(imageData.rawBytes, 'base64');
      }
      
      if (imageBuffer) {
        const imagePath = path.join(outputDir, 'header-image.png');
        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`  ✅ Cabeçalho gerado com Imagen AI: header-image.png`);
        return 'header-image.png';
      }
    }

    console.warn(`⚠️  Resposta inesperada da API Imagen para cabeçalho`);
    return null;

  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    const status = error.response?.status;
    
    // Retry on server errors (5xx) up to 2 times
    if (status >= 500 && retryCount < 2) {
      console.warn(`⚠️  Erro de servidor (${status}), tentando novamente em 3 segundos...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return generateHeaderImage(articles, date, outputDir, retryCount + 1);
    }
    
    console.warn(`⚠️  Erro ao gerar cabeçalho com Imagen: ${msg}${status ? ` (${status})` : ''}`);
    console.warn('   Usando exibição de texto alternativa para cabeçalho');
    return null;
  }
}

/**
 * Generate and save header image using Imagen AI
 */
async function generateAndSaveHeaderImage(articles, date, outputDir) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate image using Imagen AI with top stories
    const imageName = await generateHeaderImage(articles, date, outputDir);
    
    return imageName;

  } catch (error) {
    console.warn(`⚠️  Erro ao salvar cabeçalho: ${error.message}`);
    return null;
  }
}

export { generateAndSaveHeaderImage };
