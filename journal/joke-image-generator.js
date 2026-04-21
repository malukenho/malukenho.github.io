#!/usr/bin/env node

/**
 * O Matinal — Joke Image Generator
 * Generates a vintage illustration for the first joke using Google Imagen API (paid tier)
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateJokeImage(jokeText, outputDir, retryCount = 0) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  try {
    // Create prompt based on joke
    const prompt = `Create a vintage 19th-century newspaper illustration in crosshatching etching and engraving style for this humorous/joke content:

PIADA: ${jokeText.substring(0, 150)}

Requirements:
- Black and white pen and ink engraving (Victorian era newspaper aesthetic)
- Humorous or whimsical illustration that captures the essence of the joke
- Ornamental decorative border with vintage flourishes
- Size: 430x200 pixels
- Classic 1800s-1900s illustration style with fine crosshatching details
- Background color: #ffffff
- Elegant and timeless appearance
- Suitable for a Brazilian newspaper "O Matinal" journal column
- Must be suitable for a Kindle display
- Include subtle visual humor`;

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
        const filename = 'joke-image.png';
        const imagePath = path.join(outputDir, filename);
        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`  ✅ Imagem gerada para piada com Imagen AI: ${filename}`);
        return filename;
      }
    }

    console.warn(`⚠️  Resposta inesperada da API Imagen para piada`);
    return null;

  } catch (error) {
    const status = error.response?.status;
    const msg = error.response?.data?.error?.message || error.message;
    
    // Retry on server errors (5xx) up to 2 times
    if (status >= 500 && retryCount < 2) {
      console.warn(`⚠️  Erro de servidor (${status}), tentando novamente em 3 segundos...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return generateJokeImage(jokeText, outputDir, retryCount + 1);
    }
    
    console.warn(`⚠️  Erro ao gerar imagem para piada: ${msg}${status ? ` (${status})` : ''}`);
    return null;
  }
}

/**
 * Generate and save joke image for first joke (if it doesn't exist)
 */
async function generateAndSaveJokeImage(jokes, outputDir) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Skip if no jokes
    if (!jokes || jokes.length === 0) {
      return null;
    }

    // Check if joke image already exists
    const jokeImagePath = path.join(outputDir, 'joke-image.png');
    if (fs.existsSync(jokeImagePath)) {
      console.log('  ✓ Imagem para piada já existe (usando arquivo existente)');
      return 'joke-image.png';
    }

    // Generate image for first joke
    console.log('  • Gerando imagem para primeira piada com Imagen AI...');
    const jokeImage = await generateJokeImage(jokes[0], outputDir);
    return jokeImage;

  } catch (error) {
    console.warn(`⚠️  Erro ao gerar imagem para piada: ${error.message}`);
    return null;
  }
}

export { generateAndSaveJokeImage };
