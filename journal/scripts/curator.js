import { GoogleGenerativeAI } from '@google/generative-ai';

const DEBUG = process.env.DEBUG === 'true';

class GeminiCurator {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada. Configure em GitHub Secrets ou .env');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = 'gemini-2.0-flash';
  }

  log(message) {
    if (DEBUG) console.log(`[CURATOR] ${message}`);
  }

  async generateJournalContent(articles) {
    console.log('\n🤖 CURANDO CONTEÚDO COM GEMINI...\n');

    try {
      // Refinar artigos
      const refinedArticles = await Promise.all(
        articles.slice(0, 9).map((article, i) => this.refineArticle(article, i))
      );

      // Gerar conteúdo adicional
      const quote = await this.generateQuote();
      const facts = await this.generateFacts(3);
      const games = await this.generateGames();

      console.log('\n✅ Conteúdo curado com sucesso!\n');

      return {
        articles: refinedArticles,
        quote,
        facts,
        games,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao curar conteúdo:', error.message);
      // Retornar fallback
      return this.getFallbackContent(articles);
    }
  }

  async refineArticle(article, index) {
    try {
      this.log(`Refinando artigo ${index + 1}...`);

      const prompt = `Você é um jornalista clássico da revista O Malho (1902), publicação brasileira renomada.

Reescreva este artigo em português brasileiro elegante e formal, mantendo a essência mas com estilo vintage:

TÍTULO ORIGINAL: ${article.title}
CONTEÚDO: ${article.description.substring(0, 500)}

Forneça um JSON com:
{
  "title": "Novo título elegante (máx 100 caracteres)",
  "summary": "Resumo de 150-200 palavras em estilo O Malho",
  "highlight": "Melhor frase do artigo (1-2 linhas)"
}`;

      const model = this.client.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Parse JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta não é JSON válido');

      const refined = JSON.parse(jsonMatch[0]);

      return {
        ...article,
        title: refined.title || article.title,
        summary: refined.summary || article.description,
        highlight: refined.highlight || ''
      };
    } catch (error) {
      console.warn(`⚠️ Erro ao refinar artigo: ${error.message}`);
      return {
        ...article,
        summary: article.description.substring(0, 300),
        highlight: article.title
      };
    }
  }

  async generateQuote() {
    try {
      this.log('Gerando citação do dia...');

      const prompt = `Gere uma citação inspiradora ou pensamento profundo do dia em português brasileiro. 
      Pode ser sobre tecnologia, cultura, vida ou sabedoria.
      Formato: JSON {"quote": "texto", "author": "autor"}`;

      const model = this.client.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Quote JSON inválido');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn(`⚠️ Erro ao gerar citação: ${error.message}`);
      return {
        quote: 'A vida é uma aventura extraordinária.',
        author: 'Aluísio Azevedo'
      };
    }
  }

  async generateFacts(count = 3) {
    try {
      this.log(`Gerando ${count} fatos do dia...`);

      const prompt = `Gere ${count} fatos interessantes e curiosos sobre história, ciência ou cultura brasileira.
      Forneça como JSON: ["fato 1", "fato 2", "fato 3"]`;

      const model = this.client.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Facts JSON inválido');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn(`⚠️ Erro ao gerar fatos: ${error.message}`);
      return [
        'O Brasil tem o maior bioma do mundo: a Floresta Amazônica.',
        'A bandeira brasileira é a única que muda de cor de acordo com a posição do espectador.',
        'O português é a quinta língua mais falada no mundo.'
      ];
    }
  }

  async generateGames() {
    try {
      this.log('Gerando jogos do dia...');

      const prompt = `Crie em português:
      1. Uma charada ou adivinha (com resposta)
      2. Uma palavra interessante com definição
      3. Uma curiosidade divertida
      
      Formato JSON:
      {
        "charada": "Charada? Resposta: ...",
        "palavra": {"word": "palavra", "definition": "definição"},
        "curiosidade": "texto da curiosidade"
      }`;

      const model = this.client.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Games JSON inválido');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn(`⚠️ Erro ao gerar jogos: ${error.message}`);
      return {
        charada: 'Sou verde, mas não sou árvore. O que sou? Resposta: Rã',
        palavra: { word: 'Serendipidade', definition: 'Capacidade de fazer descobertas felizes por acaso' },
        curiosidade: 'O próprio Aristóteles percorria enquanto lecionava. Por isso sua escola era chamada de "Liceu".'
      };
    }
  }

  getFallbackContent(articles) {
    console.log('⚠️ Usando conteúdo fallback...');
    return {
      articles: articles.slice(0, 9).map(a => ({
        ...a,
        summary: a.description,
        highlight: a.title
      })),
      quote: {
        quote: 'Cada dia é uma oportunidade de aprender algo novo.',
        author: 'Provérbio anônimo'
      },
      facts: [
        'O Brasil é o país com a maior biodiversidade do mundo.',
        'A história brasileira é rica em cultura e tradição.',
        'Inovação e criatividade definem o espírito brasileiro.'
      ],
      games: {
        charada: 'Sou verde, mas não sou árvore. O que sou? Resposta: Rã',
        palavra: { word: 'Saudade', definition: 'Sentimento melancólico de tristeza' },
        curiosidade: 'O Brasil tem influências de culturas indígena, portuguesa e africana.'
      }
    };
  }
}

export default GeminiCurator;
