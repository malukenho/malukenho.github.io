# 📰 O Matinal — Jornal Pessoal com Jekyll

Um jornal eletrônico gerado automaticamente em português brasileiro, inspirado em **O Malho** (1902).

## 🚀 Como Funciona

```
RSS Feeds → Node.js Scraper → Markdown Files → Jekyll → HTML Estático
```

### 1. **Coleta (Node.js)**
- Script Node.js coleta feeds RSS
- Extrai artigos de várias fontes
- Gera arquivo Markdown com front matter Jekyll

### 2. **Geração (Jekyll)**
- Jekyll processa o Markdown
- Aplica layout customizado
- Gera HTML puro e estático
- Sem JavaScript, compatível com Kindle

### 3. **Resultado**
- Arquivo HTML estático (`_site/journal/YYYY-MM-DD.html`)
- Listado em `/journal/` do seu site
- Arquivável permanentemente

## 📝 Usar Localmente

### Instalação

```bash
# Instalar dependências Node.js
cd journal
npm install

# Instalar/usar Jekyll (já no seu site)
bundle install
```

### Gerar Jornal

```bash
# Coletar notícias e criar Markdown
cd journal
npm run scrape

# Retorna ao raiz e faz build com Jekyll
cd ..
bundle exec jekyll build
```

Novo arquivo será criado:
- Markdown: `_journal_articles/2026-04-21-o-matinal.md`
- HTML: `_site/journal/2026-04-21-o-matinal.html`

## 🤖 Automação GitHub

Adicione a `.github/workflows/journal.yml`:

```yaml
name: Gerar O Matinal
on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC (3 AM Brasília)
  workflow_dispatch:      # Manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Scrape RSS feeds
        run: cd journal && npm install && npm run scrape
      
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.0
      
      - name: Build with Jekyll
        run: bundle install && bundle exec jekyll build
      
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add _journal_articles/
          git commit -m "📰 Gerar O Matinal de $(date +%Y-%m-%d)" || true
          git push
```

## 📁 Estrutura

```
.
├── _journal_articles/           ← Artigos Markdown (criados automaticamente)
│   └── 2026-04-21-o-matinal.md
├── _layouts/
│   └── journal.html             ← Layout customizado
├── journal/
│   ├── scraper.js               ← Coleta RSS
│   ├── package.json
│   └── index.md                 ← Homepage do jornal
└── _site/
    └── journal/
        ├── index.html           ← Página de índice
        └── 2026-04-21-o-matinal.html  ← Edição final
```

## 🎨 Customização

### Alterar RSS Feeds

Edite `journal/scraper.js`:

```javascript
const RSS_FEEDS = [
  { name: 'Seu Fonte', url: 'https://seu-feed.rss', category: 'Categoria' },
  // ...
];
```

### Customizar Layout

Edite `_layouts/journal.html` para mudar estilos, cores, etc.

### Adicionar Seções

No layout, você pode processar os dados do front matter e reorganizar o conteúdo.

## 💡 Vantagens desta Abordagem

✓ **Totalmente Jekyll** — Integrado com seu site  
✓ **Markdown** — Versionar artigos no Git  
✓ **HTML Puro** — Sem JavaScript, compatível com Kindle  
✓ **Automático** — GitHub Actions dispara diariamente  
✓ **Fácil Customização** — Tudo em um layout  
✓ **Sem Dependências** — Node.js apenas para coleta RSS  
✓ **Histórico** — Todos os artigos em Git  

## 🔧 Troubleshooting

### Erro: "Cannot find module 'axios'"
```bash
cd journal
npm install
```

### Erro: "Jekyll not found"
```bash
bundle install
bundle exec jekyll build
```

### Nenhum arquivo gerado
Verifique se os RSS feeds estão acessíveis:
```bash
cd journal
npm run scrape
# Verifique _journal_articles/
ls -la ../_journal_articles/
```

## 📱 Testar em Kindle

1. Abra o HTML gerado no navegador
2. Pressione F12 → Responsive Design Mode
3. Selecione "Kindle Paperwhite" (540×720px)

## ✨ Próximos Passos

1. Testar localmente: `npm run scrape && cd .. && bundle exec jekyll build`
2. Verificar resultado em `_site/journal/`
3. Adicionar workflow GitHub (`.github/workflows/journal.yml`)
4. Fazer push e ativar automação
