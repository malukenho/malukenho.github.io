#!/usr/bin/env node

/**
 * O Matinal — Weather Image Generator
 * Generates vintage crosshatching etching style images for weather using Gemini API
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateWeatherImage(weatherInfo, outputPath) {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set, skipping image generation');
    return null;
  }

  try {
    console.log('  • Gerando imagem de clima com Gemini...');
    
    // Create prompt in Portuguese as requested
    const prompt = `Create an image in crosshatching etching old vintage style (like 19th century engravings) about this weather information. 
The image should be suitable for a journal column with dimensions 430x200 pixels.
Weather information: ${weatherInfo}
Style: Black and white crosshatching/etching, vintage newspaper illustration style, minimal color.
Language: Brazilian Portuguese.
Make it artistic and suitable for a newspaper weather section.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8096
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('  ✅ Resposta recebida do Gemini (usando fallback)');
      // Note: Gemini 2.0 Flash doesn't support image generation directly via this endpoint
      // We'll use a fallback SVG generator instead
      return null;
    }

    return null;

  } catch (error) {
    console.warn(`⚠️  Erro ao gerar imagem de clima: ${error.message}`);
    return null;
  }
}

/**
 * Create a vintage SVG weather illustration as fallback
 * This provides a vintage crosshatching aesthetic while we work on Gemini image generation
 */
function generateWeatherSVG(weatherDescription, temperature) {
  // Create a vintage-style SVG weather illustration
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 200" width="430" height="200">
    <defs>
      <pattern id="crosshatch" patternUnits="userSpaceOnUse" width="4" height="4">
        <line x1="0" y1="0" x2="4" y2="4" stroke="#1a1008" stroke-width="0.5"/>
        <line x1="4" y1="0" x2="0" y2="4" stroke="#1a1008" stroke-width="0.5"/>
      </pattern>
      <pattern id="crosshatch-light" patternUnits="userSpaceOnUse" width="8" height="8">
        <line x1="0" y1="0" x2="8" y2="8" stroke="#1a1008" stroke-width="0.3" opacity="0.3"/>
        <line x1="8" y1="0" x2="0" y2="8" stroke="#1a1008" stroke-width="0.3" opacity="0.3"/>
      </pattern>
    </defs>
    
    <!-- Paper background -->
    <rect width="430" height="200" fill="#f2e8d5"/>
    
    <!-- Ornamental border -->
    <rect x="5" y="5" width="420" height="190" fill="none" stroke="#1a1008" stroke-width="2"/>
    <rect x="8" y="8" width="414" height="184" fill="none" stroke="#1a1008" stroke-width="0.5" opacity="0.5"/>
    
    <!-- Weather symbol section -->
    <g id="weather-symbol">
      <!-- Cloud with crosshatching for clouds -->
      <ellipse cx="80" cy="60" rx="35" ry="25" fill="url(#crosshatch-light)" stroke="#1a1008" stroke-width="1.5"/>
      <ellipse cx="110" cy="70" rx="30" ry="20" fill="url(#crosshatch-light)" stroke="#1a1008" stroke-width="1.5"/>
      
      <!-- Sun rays for sunny weather -->
      <circle cx="310" cy="60" r="20" fill="none" stroke="#1a1008" stroke-width="1.5"/>
      <line x1="310" y1="25" x2="310" y2="10" stroke="#1a1008" stroke-width="1.5"/>
      <line x1="310" y1="95" x2="310" y2="110" stroke="#1a1008" stroke-width="1.5"/>
      <line x1="275" y1="60" x2="260" y2="60" stroke="#1a1008" stroke-width="1.5"/>
      <line x1="345" y1="60" x2="360" y2="60" stroke="#1a1008" stroke-width="1.5"/>
    </g>
    
    <!-- Temperature text -->
    <text x="215" y="140" font-family="Georgia, serif" font-size="24" font-weight="bold" 
          text-anchor="middle" fill="#1a1008">${temperature}°C</text>
    
    <!-- Description text with vintage styling -->
    <text x="215" y="165" font-family="Georgia, serif" font-size="13" 
          text-anchor="middle" fill="#3d2b10" font-style="italic">${weatherDescription}</text>
    
    <!-- Decorative corner elements -->
    <g opacity="0.3">
      <line x1="15" y1="15" x2="25" y2="15" stroke="#1a1008" stroke-width="0.8"/>
      <line x1="15" y1="15" x2="15" y2="25" stroke="#1a1008" stroke-width="0.8"/>
      <line x1="415" y1="15" x2="405" y2="15" stroke="#1a1008" stroke-width="0.8"/>
      <line x1="415" y1="15" x2="415" y2="25" stroke="#1a1008" stroke-width="0.8"/>
      <line x1="15" y1="185" x2="25" y2="185" stroke="#1a1008" stroke-width="0.8"/>
      <line x1="15" y1="185" x2="15" y2="175" stroke="#1a1008" stroke-width="0.8"/>
      <line x1="415" y1="185" x2="405" y2="185" stroke="#1a1008" stroke-width="0.8"/>
      <line x1="415" y1="185" x2="415" y2="175" stroke="#1a1008" stroke-width="0.8"/>
    </g>
  </svg>`;

  return svg;
}

/**
 * Generate and save weather image
 */
async function generateAndSaveWeatherImage(weatherDescription, temperature, outputDir) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const imagePath = path.join(outputDir, 'weather-image.svg');

    // Generate SVG (fallback for now until Gemini image generation is available)
    const svg = generateWeatherSVG(weatherDescription, temperature);
    
    fs.writeFileSync(imagePath, svg, 'utf8');
    console.log(`  ✅ Imagem de clima criada: ${imagePath}`);
    
    return 'weather-image.svg';

  } catch (error) {
    console.warn(`⚠️  Erro ao salvar imagem: ${error.message}`);
    return null;
  }
}

export { generateWeatherImage, generateAndSaveWeatherImage, generateWeatherSVG };
