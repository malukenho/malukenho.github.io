# 🚀 O Matinal — Guia Rápido de Inicio

## Começar em 5 minutos

### 1️⃣ Instalar (primeira vez)

```bash
cd journal
npm install
```

### 2️⃣ Gerar Jornal (local)

```bash
cd journal
npm run scrape

# Isso cria:
# _journal_articles/2026/04/21/
#   ├── 01-primeiro-artigo.md
#   ├── 02-segundo-artigo.md
#   └── 03-terceiro-artigo.md
```

### 3️⃣ Build Jekyll

```bash
cd ..
bundle exec jekyll build

# Resultado em:
# _site/journal/index.html
# _site/journal_articles/2026/04/21/01-primeiro-artigo.html
# _site/journal_articles/2026/04/21/02-segundo-artigo.html
```

### 4️⃣ Visualizar

```bash
open _site/journal/index.html
```

---

## 🤖 Automação (GitHub)

Adicione a `.github/workflows/journal.yml` (já incluído!) e faça push:

```bash
git push origin main
```

O workflow roda:
- ✅ Automaticamente às 6 AM UTC (3 AM Brasília)
- ✅ Manualmente via GitHub Actions
- ✅ Cria novos artigos em `_journal_articles/YYYY/MM/DD/`
- ✅ Jekyll compila automaticamente

---

## 📝 Customizar

### Mudar RSS Feeds

Edite `journal/scraper.js`:

```javascript
const RSS_FEEDS = [
  { name: 'BBC News', url: 'https://...', category: 'Mundo' },
  // Adicione seus feeds aqui
];
```

### Customizar Design

Edite `_layouts/journal.html` para mudar cores, fontes, layout.

---

## 📱 Testar em Kindle

1. Abra `_site/journal_articles/2026/04/21/01-artigo.html` no navegador
2. F12 → Responsive Design Mode
3. Selecione "Kindle Paperwhite" (540×720px)

---

## ✅ Verificar Status

```bash
# Ver se há artigos gerados
find _journal_articles -type f

# Ver se o site foi gerado
ls -la _site/journal_articles/

# Testar scraper manualmente
cd journal && npm run scrape
```

---

## 🎯 Estrutura Final

Seu site terá uma nova seção com artigos organizados por data:

```
seu-site.com/journal/
├── index.html (homepage com lista de edições)
└── journal_articles/
    └── 2026/
        └── 04/
            ├── 21/
            │   ├── 01-artigo.html
            │   ├── 02-artigo.html
            │   └── 03-artigo.html
            └── 22/
                ├── 01-artigo.html
                └── (...)
```

---

Pronto! Agora seu jornal é gerado automaticamente com artigos organizados por data. 📰✨
