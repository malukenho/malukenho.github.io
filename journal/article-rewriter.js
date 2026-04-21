#!/usr/bin/env node

/**
 * O Matinal — Article Rewriter
 * Rewrites articles in the style of "O Malho" newspaper (1902 Brazilian Portuguese)
 * Uses Google Gemini API for content generation
 */

import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function rewriteArticleContent(article, retryCount = 0) {
  if (!GEMINI_API_KEY) {
    return article;
  }

  try {
    // Combine title and description for context
    const fullContent = `${article.title}\n${article.description}`;
    
    const prompt = `Rewrite the following article in a two minutes story using very polite Brazilian Portuguese vocabulary and style. It should look very similar to the articles in the newspaper "O Malho" from 1902, published in Brazil.

Article: ${fullContent}

Requirements:
- Use formal, elegant Portuguese from early 1900s Brazil
- Maintain the key information from the article
- Write as if it were published in O Malho newspaper
- Keep it to approximately 150-200 words (2 minute read)
- Use period-appropriate language and tone
- Start with an engaging opening that suits a newspaper
- Include vivid descriptions where appropriate
- End with a subtle conclusion

Return ONLY the rewritten article text, nothing else.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
          maxOutputTokens: 500,
          temperature: 0.7
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // Extract the generated text
    const candidates = response.data?.candidates;
    if (candidates && candidates.length > 0) {
      const generatedText = candidates[0]?.content?.parts?.[0]?.text;
      if (generatedText) {
        article.description = generatedText.trim();
        return article;
      }
    }

    return article;

  } catch (error) {
    const status = error.response?.status;
    
    // Retry on server errors (5xx) up to 2 times
    if (status >= 500 && retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return rewriteArticleContent(article, retryCount + 1);
    }
    
    // If rewrite fails, keep original content
    console.warn(`⚠️  Erro ao reescrever artigo "${article.title.substring(0, 30)}...": ${error.message}`);
    return article;
  }
}

/**
 * Rewrite all articles using Gemini
 * Processes them in parallel batches to avoid overwhelming the API
 */
async function rewriteAllArticles(articles) {
  if (!articles || articles.length === 0) {
    return articles;
  }

  try {
    console.log(`  • Reescrevendo ${articles.length} artigos no estilo de O Malho (1902)...`);
    
    // Process in batches of 5 to avoid overwhelming the API
    const batchSize = 5;
    const rewrittenArticles = [];
    
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const promises = batch.map(article => rewriteArticleContent(article));
      const rewrittenBatch = await Promise.all(promises);
      rewrittenArticles.push(...rewrittenBatch);
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`  ✅ ${articles.length} artigos reescritos no estilo O Malho`);
    return rewrittenArticles;

  } catch (error) {
    console.warn(`⚠️  Erro ao reescrever artigos: ${error.message}`);
    return articles;
  }
}

export { rewriteAllArticles };
