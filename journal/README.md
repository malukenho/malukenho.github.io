# 📰 O Matinal — Jornal Eletrônico Pessoal

Seu jornal automatizado em português, publicado diariamente às 6 da manhã com notícias curadas por IA, otimizado para Kindle.

## ✨ Recursos

- ✅ **Geração Automática**: Publicado diariamente às 6 AM via GitHub Actions
- ✅ **Múltiplos Idiomas**: Português, Inglês, Japonês, Holandês, Polonês
- ✅ **Múltiplas Regiões**: Brasil, Sergipe, Holanda (Helmond, Eindhoven), Japão
- ✅ **Curado por IA**: Usa Google Gemini para selecionar e escrever artigos
- ✅ **Otimizado para Kindle**: Leitura perfeita em e-readers
- ✅ **Responsivo**: Funciona em desktop, tablet e mobile
- ✅ **Arquivo**: Todos os edições anteriores acessíveis
- ✅ **Ligado à Fonte**: Links para artigos originais
- ✅ **Diversão**: Charadas, palavras do dia, curiosidades
- ✅ **Vintage**: Inspirado no clássico jornal "O Malho"

## 🎨 Templates Disponíveis

Três versões de templates foram criadas. Veja [TEMPLATES.md](./TEMPLATES.md) para comparação detalhada:

1. **V1 - Clássico** (`template-v1-classical.html`)
   - Layout em 2 colunas (desktop) → 1 coluna (mobile)
   - Estilo decorado, inspirado em "O Malho"
   - Melhor para desktop

2. **V2 - Responsivo** (`template-v2-responsive.html`) ⭐ **RECOMENDADO**
   - Single column otimizado
   - Perfeito em desktop e Kindle
   - Melhor equilíbrio

3. **V3 - Minimalista** (`template-v3-minimalist.html`)
   - Ultra-simples, máxima legibilidade
   - Ideal para Kindle puro
   - Mais leve

## 📂 Estrutura do Projeto

```
journal/
├── template-v1-classical.html      # Template clássico
├── template-v2-responsive.html     # Template responsivo
├── template-v3-minimalist.html     # Template minimalista
├── config.json                     # Configuração e fontes de notícias
├── TEMPLATES.md                    # Guia de templates
├── README.md                       # Este arquivo
└── archive/
    ├── index.html                  # Índice do arquivo
    ├── 2026-04-21.html            # Edição do dia 21 de abril
    ├── 2026-04-20.html
    └── ...
```

## 🔧 Configuração

### 1. Escolha o Template

Edite `config.json` e mude a linha:
```json
"template": "template-v2-responsive.html"
```

Para usar outro template:
- `template-v1-classical.html` (2-colunas)
- `template-v3-minimalist.html` (minimalista)

### 2. Configure as Fontes de Notícias

O arquivo `config.json` já contém:
- ✅ RSS feeds de jornais brasileiros (G1, Folha, O Globo, BBC Brasil)
- ✅ Fontes de tecnologia (TechCrunch, Hacker News)
- ✅ Notícias de Sergipe (G1 SE, Infonet)
- ✅ Cobertura de Holanda (NOS.nl, AT5, Omroep Eindhoven)
- ✅ Cobertura do Japão (NHK World, Japan Today)

Você pode adicionar, remover ou modificar fontes editando `config.json`.

### 3. Configure a API do Gemini

Você precisará de:
1. Uma conta Google Cloud
2. Ativar a Google Generative AI API
3. Gerar uma chave de API

Armazene a chave em um GitHub Secret chamado `GEMINI_API_KEY`.

## 🤖 Como Funciona o Pipeline

```mermaid
6:00 AM → GitHub Actions Trigger
         ↓
    [Fetch News Feeds]
         ↓
    [Gemini API Curation]
         ↓
    [Render Template]
         ↓
    [Archive Previous Issue]
         ↓
    [Publish to GitHub Pages]
         ↓
    [User Receives Notification]
```

## 📱 Otimização para Kindle

O CSS de todos os templates foi otimizado para Kindle:

- ✅ Fontes legíveis em e-ink
- ✅ Tamanhos de fonte aumentados em mobile
- ✅ Imagens redimensionadas
- ✅ Cores de alto contraste
- ✅ Layout single-column
- ✅ JavaScript mínimo

**Para ler no Kindle:**
1. Abra `_site/journal/` no seu navegador
2. Clique em "Enviar para Kindle" (se usar Kindle Cloud Reader)
3. Ou converta HTML → EPUB/MOBI com Calibre

## 📝 Conteúdo Incluído

Cada edição diária contém:

- **1 Artigo em Destaque** (notícia principal do dia)
- **8 Artigos Adicionais** (das diversas categorias)
- **3 Fatos do Dia** (curiosidades interessantes)
- **1 Citação do Dia** (sabedoria relevante)
- **Frases em 5 Idiomas** (português, inglês, japonês, holandês, polonês)
- **Jogos** (charada, palavra do dia, curiosidade)
- **Links para Fontes Originais** (sempre creditando)

## 🔗 Acesso ao Arquivo

Todas as edições anteriores ficam em `/journal/archive/`.

A página `archive/index.html` lista todas as edições com:
- Data de publicação
- Título em destaque
- Link para edição completa

## 📚 Categorias de Conteúdo

O jornal cobre:

- 🚀 **Tecnologia & IA**
- 📚 **História & Cultura**
- 🏛️ **Política & Economia**
- 🎨 **Literatura & Arte**
- 🔬 **Ciência & Natureza**
- 🇧🇷 **Notícias Brasil**
- 🏞️ **Sergipe**
- 🇳🇱 **Holanda** (Helmond, Eindhoven, Amsterdam)
- 🇯🇵 **Japão**

## 🛠️ Desenvolvimento

### Testar Templates Localmente

1. Abra `template-v1-classical.html` no navegador
2. Use DevTools (F12) para testar responsividade
3. Teste em Kindle Cloud Reader ou simulador online
4. Compare com as outras versões

### Adicionar Novas Fontes

Edite `config.json` → `news_sources` → adicione:

```json
{
  "name": "Nome da Fonte",
  "category": "Categoria",
  "rss_url": "https://...",
  "priority": 1
}
```

### Customizar Gemini API

Edite `config.json` → `gemini_api`:

```json
{
  "model": "gemini-2.0-flash",
  "temperature": 0.7,
  "max_tokens": 2000
}
```

## 📋 Checklist de Setup

- [ ] Escolher template preferido em `config.json`
- [ ] Ativar Google Generative AI API
- [ ] Gerar chave de API Gemini
- [ ] Adicionar `GEMINI_API_KEY` em GitHub Secrets
- [ ] Testar geração local (se aplicável)
- [ ] Configurar GitHub Actions workflow
- [ ] Publicar primeira edição
- [ ] Verificar em Kindle

## 🚀 Próximos Passos

1. **Script de Scraping** - Extrair notícias de RSS feeds
2. **Integração Gemini** - Curar e escrever artigos
3. **Renderizador de Template** - Preencher HTML com conteúdo
4. **GitHub Actions** - Automação diária
5. **Sistema de Arquivo** - Manter histórico

## 📖 Referências

- **O Malho** - Jornal satírico brasileiro (1902-1980s) que inspirou o design
- **Kindle Publishing** - Otimização para e-readers
- **Google Gemini API** - Curação de IA

## ❓ Dúvidas?

Consulte os comentários no código dos templates ou abra uma issue.

---

**O Matinal** — Publicado todos os dias às 6 da manhã, porque seu dia merece bom jornalismo.
