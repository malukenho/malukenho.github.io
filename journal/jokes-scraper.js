#!/usr/bin/env node

/**
 * O Matinal — Jokes Scraper
 * Coleta piadas de historiadoriso.com.br (1800-1900)
 */

import axios from 'axios';

const JOKES_URL = 'https://historiadoriso.com.br/category/anedotas-piadas/1800-1900';

async function fetchJokes() {
  try {
    console.log('  • Coletando piadas de historiadoriso.com.br...');
    
    const response = await axios.get(JOKES_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    const jokes = [];

    // Pattern: Find article divs with class "art-Post"
    // Each contains h2.art-PostHeader with title, then div.art-PostContent with paragraphs
    const articlePattern = /<h2[^>]*class="art-PostHeader"[^>]*>[\s\S]*?>([^<]+)<\/a>\s*<\/h2>([\s\S]*?)(?=<div class="art-Post">|$)/gi;
    let match;
    
    while ((match = articlePattern.exec(html)) !== null) {
      let title = match[1]
        .replace(/&[^;]+;/g, (ent) => {
          const entities = {
            '&#8211;': '—',
            '&ndash;': '–',
            '&mdash;': '—',
            '&quot;': '"',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&apos;': "'",
            '&nbsp;': ' '
          };
          return entities[ent] || ent;
        })
        .trim();
      
      // Extract ALL paragraph content following the title
      const following = match[2];
      const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      
      let allParagraphs = [];
      let pMatch;
      
      while ((pMatch = pPattern.exec(following)) !== null) {
        let content = pMatch[1]
          .replace(/<[^>]+>/g, '') // Remove HTML tags (including <em>, <strong>, etc)
          .replace(/&#8211;/g, '—')
          .replace(/&ndash;/g, '–')
          .replace(/&mdash;/g, '—')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&apos;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (content.length > 20) {
          allParagraphs.push(content);
        }
      }
      
      if (allParagraphs.length > 0) {
        let fullContent = allParagraphs.join(' ');
        if (fullContent.length > 50 && title.length > 3) {
          jokes.push(`${title}: ${fullContent}`);
        }
      }
    }

    // Remove duplicates
    const uniqueJokes = [...new Set(jokes)];

    // Se encontrou poucos, tenta outra estratégia
    if (uniqueJokes.length < 3) {
      return getDefaultJokes();
    }

    // Retorna até 5 piadas aleatórias
    const shuffled = uniqueJokes.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
    
  } catch (error) {
    console.warn(`⚠️  Erro ao buscar piadas: ${error.message}`);
    return getDefaultJokes();
  }
}

function getDefaultJokes() {
  const allJokes = [
    {
      title: 'O Corretor de Provas',
      content: 'Um corretor de provas encontrou um aluno que havia escrito: "Napoleão morreu em 1821, quando ainda tinha muita vida pela frente". Comentou: "Concordo, era jovem demais para morrer!"'
    },
    {
      title: 'A Lógica do Barbeiro',
      content: 'Um barbeiro perguntava ao cliente: "Quer que eu corte todos os seus cabelos?" O cliente respondeu: "Não, meu amigo, pois se cortar todos, eles não crescem!"'
    },
    {
      title: 'O Filósofo Distraído',
      content: 'Um filósofo estava tão concentrado em seus pensamentos que colidiu com uma coluna na rua. Um amigo perguntou: "Acertou em cheio?" Respondeu: "Não, ela acertou em mim!"'
    },
    {
      title: 'A Conversa de Barbeiro',
      content: 'Cliente novo no barbeiro pergunta: "Você corta bem?" Barbeiro responde: "Sei, meu senhor, todos que entraram aqui saíram satisfeitos!" Cliente: "Satisfeitos? De quê?"'
    },
    {
      title: 'O Vendedor Astuto',
      content: 'Um vendedor de feijão alardeava: "Este feijão é tão bom que rende o dobro!" Cliente desconfiado: "Se rende tanto, por que você ainda vende?" Vendedor: "Porque tenho preguiça de cozinhar!"'
    },
    {
      title: 'O Médico Distraído',
      content: 'Um médico receita ao paciente: "Tome este remédio e volte daqui a uma semana." Paciente: "Doutor, se eu tomar este remédio, preciso voltar?" Médico: "Só se sobreviver!"'
    }
  ];

  // Retorna 3-5 aleatórias
  const shuffled = allJokes.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

export { fetchJokes };

