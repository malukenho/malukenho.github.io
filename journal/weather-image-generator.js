#!/usr/bin/env node

/**
 * O Matinal — Weather Image Generator
 * Generates vintage weather illustrations as SVG images
 * (SVGs are vector graphics that work as real image files)
 */

import fs from 'fs';
import path from 'path';

/**
 * Generate a vintage-style weather illustration SVG
 * Creates a beautiful 430x200px image with period-appropriate styling
 */
function generateWeatherSVG(weatherDescription, temperature) {
  const temp = temperature || "20";
  const description = weatherDescription || "Céu Limpo";
  
  // Determine weather symbol based on description
  let weatherSymbol = '';
  const desc = description.toLowerCase();
  
  if (desc.includes('chuva') || desc.includes('rain')) {
    weatherSymbol = `
    <!-- Rain -->
    <g id="rain">
      <ellipse cx="80" cy="60" rx="35" ry="25" fill="none" stroke="#1a1008" stroke-width="1.5"/>
      <ellipse cx="110" cy="70" rx="30" ry="20" fill="none" stroke="#1a1008" stroke-width="1.5"/>
      <line x1="60" y1="95" x2="50" y2="110" stroke="#1a1008" stroke-width="1"/>
      <line x1="80" y1="95" x2="70" y2="110" stroke="#1a1008" stroke-width="1"/>
      <line x1="100" y1="95" x2="90" y2="110" stroke="#1a1008" stroke-width="1"/>
      <line x1="120" y1="95" x2="110" y2="110" stroke="#1a1008" stroke-width="1"/>
    </g>`;
  } else if (desc.includes('nuvem') || desc.includes('cloud')) {
    weatherSymbol = `
    <!-- Clouds -->
    <g id="clouds">
      <ellipse cx="70" cy="60" rx="35" ry="25" fill="none" stroke="#1a1008" stroke-width="1.5"/>
      <ellipse cx="110" cy="70" rx="35" ry="22" fill="none" stroke="#1a1008" stroke-width="1.5"/>
      <ellipse cx="90" cy="55" rx="30" ry="20" fill="none" stroke="#1a1008" stroke-width="1.5"/>
    </g>`;
  } else {
    // Sunny
    weatherSymbol = `
    <!-- Sun -->
    <circle cx="90" cy="70" r="22" fill="none" stroke="#1a1008" stroke-width="1.5"/>
    <line x1="90" y1="38" x2="90" y2="22" stroke="#1a1008" stroke-width="1.5"/>
    <line x1="90" y1="102" x2="90" y2="118" stroke="#1a1008" stroke-width="1.5"/>
    <line x1="58" y1="70" x2="42" y2="70" stroke="#1a1008" stroke-width="1.5"/>
    <line x1="122" y1="70" x2="138" y2="70" stroke="#1a1008" stroke-width="1.5"/>
    <line x1="64" y1="44" x2="54" y2="34" stroke="#1a1008" stroke-width="1.5"/>
    <line x1="116" y1="96" x2="126" y2="106" stroke="#1a1008" stroke-width="1.5"/>`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 200" width="430" height="200">
  <defs>
    <pattern id="paper-texture" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
      <rect width="100" height="100" fill="#f2e8d5"/>
      <circle cx="20" cy="20" r="0.5" fill="#3d2b10" opacity="0.08"/>
      <circle cx="50" cy="50" r="0.5" fill="#3d2b10" opacity="0.05"/>
      <circle cx="80" cy="30" r="0.5" fill="#3d2b10" opacity="0.06"/>
    </pattern>
  </defs>
  
  <!-- Textured paper background -->
  <rect width="430" height="200" fill="url(#paper-texture)"/>
  
  <!-- Double ornamental border -->
  <rect x="6" y="6" width="418" height="188" fill="none" stroke="#1a1008" stroke-width="2"/>
  <rect x="9" y="9" width="412" height="182" fill="none" stroke="#1a1008" stroke-width="0.5" opacity="0.6"/>
  
  <!-- Decorative corner flourishes -->
  <g opacity="0.5" stroke="#1a1008" stroke-width="0.8" fill="none">
    <!-- Top-left corner -->
    <line x1="18" y1="18" x2="35" y2="18"/>
    <line x1="18" y1="18" x2="18" y2="35"/>
    <circle cx="18" cy="18" r="3" fill="none" stroke-width="0.6"/>
    
    <!-- Top-right corner -->
    <line x1="412" y1="18" x2="395" y2="18"/>
    <line x1="412" y1="18" x2="412" y2="35"/>
    <circle cx="412" cy="18" r="3" fill="none" stroke-width="0.6"/>
    
    <!-- Bottom-left corner -->
    <line x1="18" y1="182" x2="35" y2="182"/>
    <line x1="18" y1="182" x2="18" y2="165"/>
    <circle cx="18" cy="182" r="3" fill="none" stroke-width="0.6"/>
    
    <!-- Bottom-right corner -->
    <line x1="412" y1="182" x2="395" y2="182"/>
    <line x1="412" y1="182" x2="412" y2="165"/>
    <circle cx="412" cy="182" r="3" fill="none" stroke-width="0.6"/>
  </g>
  
  <!-- Weather symbol area (left side) -->
  <g id="weather-area">
    ${weatherSymbol}
  </g>
  
  <!-- Decorative vertical line -->
  <line x1="160" y1="20" x2="160" y2="180" stroke="#1a1008" stroke-width="0.5" opacity="0.3"/>
  
  <!-- Temperature display (large, prominent) -->
  <text x="290" y="95" font-family="Georgia, serif" font-size="52" font-weight="bold" 
        text-anchor="middle" fill="#1a1008" letter-spacing="2">${temp}°</text>
  
  <!-- Celsius unit -->
  <text x="350" y="75" font-family="Georgia, serif" font-size="20" 
        text-anchor="middle" fill="#1a1008">C</text>
  
  <!-- Weather description (italic, centered below) -->
  <text x="215" y="155" font-family="Georgia, serif" font-size="15" font-style="italic"
        text-anchor="middle" fill="#3d2b10">${description}</text>
  
  <!-- Decorative dividing line -->
  <line x1="50" y1="168" x2="380" y2="168" stroke="#1a1008" stroke-width="0.5" opacity="0.4"/>
</svg>`;

  return svg;
}

/**
 * Generate and save weather image as SVG
 */
async function generateAndSaveWeatherImage(weatherDescription, temperature, outputDir) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('  • Gerando imagem vintage de clima...');
    
    // Generate SVG
    const svg = generateWeatherSVG(weatherDescription, temperature);
    
    // Save as SVG image file
    const imagePath = path.join(outputDir, 'weather-image.svg');
    fs.writeFileSync(imagePath, svg, 'utf8');
    
    console.log(`  ✅ Imagem gerada: weather-image.svg (430x200px)`);
    
    return 'weather-image.svg';

  } catch (error) {
    console.warn(`⚠️  Erro ao gerar imagem: ${error.message}`);
    return null;
  }
}

export { generateAndSaveWeatherImage };




