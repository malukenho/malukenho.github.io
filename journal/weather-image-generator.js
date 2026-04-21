#!/usr/bin/env node

/**
 * O Matinal — Weather Image Generator
 * Generates vintage weather illustrations using Google Imagen API (paid tier)
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateWeatherImage(weatherDescription, temperature, outputDir) {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set, skipping image generation');
    return null;
  }

  try {
    console.log('  • Gerando imagem de clima com Imagen AI...');
    
    // Create detailed prompt for vintage weather illustration
    const prompt = `Create a vintage 19th-century newspaper weather illustration in crosshatching etching and engraving style.

Weather: ${weatherDescription}
Temperature: ${temperature}°C

Requirements:
- Black and white pen and ink engraving (Victorian era newspaper aesthetic)
- Ornamental decorative border with vintage flourishes
- Weather-appropriate symbols (sun for clear, clouds for cloudy, rain for rainy weather)
- Temperature prominently displayed
- Suitable for a Brazilian newspaper "O Matinal" journal column
- Size: 430x200 pixels
- Classic 1800s-1900s illustration style with fine crosshatching details
- Elegant and timeless appearance`;

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
        const imagePath = path.join(outputDir, 'weather-image.png');
        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`  ✅ Imagem gerada com Imagen AI: weather-image.png`);
        return 'weather-image.png';
      }
    }

    console.warn(`⚠️  Resposta inesperada da API Imagen`);
    return null;

  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.warn(`⚠️  Erro ao gerar imagem com Imagen: ${msg}`);
    return null;
  }
}

/**
 * Generate and save weather image using Imagen AI
 */
async function generateAndSaveWeatherImage(weatherDescription, temperature, outputDir) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate image using Imagen AI
    const imageName = await generateWeatherImage(weatherDescription, temperature, outputDir);
    
    return imageName;

  } catch (error) {
    console.warn(`⚠️  Erro ao salvar imagem: ${error.message}`);
    return null;
  }
}

export { generateAndSaveWeatherImage };





