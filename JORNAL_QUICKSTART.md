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
# _journal_articles/2026-04-21-o-matinal.md
```

### 3️⃣ Build Jekyll

```bash
cd ..
bundle exec jekyll build

# Resultado em:
# _site/journal/index.html
# _site/journal/2026-04-21-o-matinal.html
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
- ✅ Cria novo artigo em `_journal_articles/`
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

1. Abra `_site/journal/2026-04-21-o-matinal.html` no navegador
2. F12 → Responsive Design Mode
3. Selecione "Kindle Paperwhite" (540×720px)

---

## ✅ Verificar Status

```bash
# Ver se há artigos
ls -la _journal_articles/

# Ver se o site foi gerado
ls -la _site/journal/

# Testar scraper manualmente
cd journal && npm run scrape
```

---

## 🎯 Estrutura Final

Seu site terá uma nova seção:

```
seu-site.com/journal/
├── (homepage com lista de edições)
├── 2026-04-21-o-matinal.html
├── 2026-04-22-o-matinal.html
└── (...)
```

---

Pronto! Agora seu jornal é gerado automaticamente. 📰✨
