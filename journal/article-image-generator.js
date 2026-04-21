#!/usr/bin/env node

/**
 * O Matinal — Article Image Generator
 * Generates vintage article illustrations using Google Imagen API (paid tier)
 * Only generates if image doesn't exist and source is not external
 * Limited to top articles per section to avoid excessive API usage
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_IMAGES_PER_SECTION = 2; // Limit articles per section to save tokens

const PLACEHOLDER_SVG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3E[Imagem]%3C/text%3E%3C/svg%3E';

async function generateArticleImage(article, index, outputDir, retryCount = 0) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  try {
    // Create prompt based on article title and description
    const prompt = `Create a vintage 19th-century newspaper illustration in crosshatching etching and engraving style based on this article:

TÍTULO: ${article.title}
DESCRIÇÃO: ${article.description.substring(0, 200)}

Requirements:
- Black and white pen and ink engraving (Victorian era newspaper aesthetic)
- Ornamental decorative border with vintage flourishes
- Illustration style matches the article topic
- Size: 400x300 pixels
- Classic 1800s-1900s illustration style with fine crosshatching details
- Background color: #ffffff
- Elegant and timeless appearance
- Suitable for a Brazilian newspaper "O Matinal" journal column
- Must be suitable for a Kindle display`;

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
        const filename = `article-${index}.png`;
        const imagePath = path.join(outputDir, filename);
        fs.writeFileSync(imagePath, imageBuffer);
        return filename;
      }
    }

    return null;

  } catch (error) {
    const status = error.response?.status;
    
    // Retry on server errors (5xx) up to 2 times
    if (status >= 500 && retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return generateArticleImage(article, index, outputDir, retryCount + 1);
    }
    
    return null;
  }
}

/**
 * Generate and save article images for articles without images
 * Limited to prevent excessive API usage and token waste
 */
async function generateAndSaveArticleImages(articles, outputDir) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const articlesWithImages = [];
    let generatedCount = 0;
    const sectionImageCounts = {}; // Track images per section

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      
      // Initialize section counter if not exists
      if (!sectionImageCounts[article.section]) {
        sectionImageCounts[article.section] = 0;
      }
      
      // Skip if article already has a real image from source (not placeholder)
      if (article.image && article.image !== PLACEHOLDER_SVG && !article.image.startsWith('article-')) {
        articlesWithImages.push(article);
        continue;
      }

      // Check if we already generated this article image
      const filename = `article-${i}.png`;
      const imagePath = path.join(outputDir, filename);
      
      if (fs.existsSync(imagePath)) {
        // Image already exists, use it
        article.image = filename;
        articlesWithImages.push(article);
        sectionImageCounts[article.section]++;
        continue;
      }

      // Skip if we've already generated max images for this section
      if (sectionImageCounts[article.section] >= MAX_IMAGES_PER_SECTION) {
        articlesWithImages.push(article);
        continue;
      }

      // Generate new image only for articles with placeholder/no image
      if (!article.image || article.image === PLACEHOLDER_SVG) {
        const generatedImage = await generateArticleImage(article, i, outputDir);
        if (generatedImage) {
          article.image = generatedImage;
          generatedCount++;
          sectionImageCounts[article.section]++;
        }
      }
      
      articlesWithImages.push(article);
    }

    if (generatedCount > 0) {
      console.log(`  ✅ ${generatedCount} imagens de artigos geradas com Imagen AI`);
    }

    return articlesWithImages;

  } catch (error) {
    console.warn(`⚠️  Erro ao gerar imagens de artigos: ${error.message}`);
    return articles;
  }
}

export { generateAndSaveArticleImages };

