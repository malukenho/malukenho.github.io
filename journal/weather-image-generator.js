#!/usr/bin/env node

/**
 * O Matinal — Weather Image Generator
 * Generates vintage weather illustrations using Google Imagen API (paid tier)
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateWeatherImage(weatherData, outputDir, retryCount = 0) {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set, skipping image generation');
    return null;
  }

  try {
    console.log(`  • Gerando imagem de clima com Imagen AI${retryCount > 0 ? ` (tentativa ${retryCount + 1})` : ''}...`);
    
    // Create detailed prompt for vintage weather illustration with ALL weather info
    const prompt = `Create a vintage 19th-century newspaper weather illustration in crosshatching etching and engraving style.

LOCATION: ${weatherData.location}
CURRENT WEATHER: ${weatherData.description}
TEMPERATURE: ${weatherData.temp}°C
MAX TEMPERATURE: ${weatherData.maxTemp}°C
MIN TEMPERATURE: ${weatherData.minTemp}°C
HUMIDITY: ${weatherData.humidity}%
WIND SPEED: ${weatherData.windSpeed} km/h

Requirements:
- Title: Boletim Meteorológico
- Background color: #ffffff
- Black and white pen and ink engraving (Victorian era newspaper aesthetic)
- Ornamental decorative border with vintage flourishes
- Weather-appropriate symbols (sun for clear, clouds for cloudy, rain for rainy weather)
- Include ALL weather information displayed clearly in the image
- Temperature prominently displayed with max/min
- Include humidity and wind speed information
- Include location name
- Include weather description
- Suitable for a Brazilian newspaper "O Matinal" journal column
- Size: 430x200 pixels
- Classic 1800s-1900s illustration style with fine crosshatching details
- Elegant and timeless appearance
- Must be readable and include all data points`;

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
    const status = error.response?.status;
    
    // Retry on server errors (5xx) up to 2 times
    if (status >= 500 && retryCount < 2) {
      console.warn(`⚠️  Erro de servidor (${status}), tentando novamente em 3 segundos...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return generateWeatherImage(weatherData, outputDir, retryCount + 1);
    }
    
    console.warn(`⚠️  Erro ao gerar imagem com Imagen: ${msg}${status ? ` (${status})` : ''}`);
    console.warn('   Usando exibição de texto alternativa para clima');
    return null;
  }
}

/**
 * Generate and save weather image using Imagen AI
 */
async function generateAndSaveWeatherImage(weatherData, outputDir) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate image using Imagen AI with all weather data
    const imageName = await generateWeatherImage(weatherData, outputDir);
    
    return imageName;

  } catch (error) {
    console.warn(`⚠️  Erro ao salvar imagem: ${error.message}`);
    return null;
  }
}

export { generateAndSaveWeatherImage };





