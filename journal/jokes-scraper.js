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

    // Tenta encontrar padrões de posts/artigos
    // Procura por títulos de post (h2, h3 com links ou em divs class="post")
    
    // Padrão 1: <h2><a>Título</a></h2> ou similar em posts
    const titlePattern = /<h[2-3][^>]*>.*?<a[^>]*>([^<]+)<\/a>/gs;
    let match;
    
    const titleMatches = [];
    while ((match = titlePattern.exec(html)) !== null) {
      titleMatches.push(match[1].trim().substring(0, 100));
    }

    // Padrão 2: Procura por parágrafos que parecem ser conteúdo
    const contentPattern = /<p[^>]*>([^<]{50,300})<\/p>/g;
    const contentMatches = [];
    while ((match = contentPattern.exec(html)) !== null) {
      let content = match[1]
        .replace(/<[^>]+>/g, '') // Remove tags HTML
        .replace(/&[^;]+;/g, '') // Remove entities
        .trim();
      
      if (content.length > 50) {
        contentMatches.push(content.substring(0, 250));
      }
    }

    // Combina títulos com conteúdo (se tiver)
    for (let i = 0; i < titleMatches.length && i < 10; i++) {
      jokes.push({
        title: titleMatches[i],
        content: contentMatches[i] || titleMatches[i]
      });
    }

    // Se encontrou poucos, tenta outra estratégia
    if (jokes.length < 3) {
      return getDefaultJokes();
    }

    // Retorna até 5 piadas aleatórias
    const shuffled = jokes.sort(() => Math.random() - 0.5);
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

