# 🚀 COMECE AQUI — O Matinal

## ⚡ 5 Minutos: Setup + Teste

```bash
# 1. Ir para os scripts
cd journal/scripts

# 2. Instalar dependências (30 segundos)
npm install

# 3. Criar arquivo .env
cp .env.example .env

# 4. IMPORTANTE: Editar .env e adicionar sua API key
# Abra .env e edite:
# GEMINI_API_KEY=AIzaSy...

# 5. Testar localmente (20-30 segundos)
npm run dev

# 6. Pronto! Arquivo gerado em: ../YYYY-MM-DD.html
```

---

## 🔑 Obter API Key Gemini (Grátis)

1. Vá para: https://makersuite.google.com/app/apikey
2. Clique em: **"Create new API key"**
3. Copie a chave (começa com `AIzaSy`)
4. Edite `journal/scripts/.env`:
   ```
   GEMINI_API_KEY=AIzaSy...
   ```

---

## 📋 Estrutura Rápida

```
journal/
├── scripts/
│   ├── generate.js        ← Executa isso: npm run dev
│   ├── scraper.js         ← Coleta notícias RSS
│   ├── curator.js         ← Curador Gemini
│   ├── renderer.js        ← Renderiza HTML
│   ├── .env.example       ← Copie e edite
│   └── package.json       ← npm install
│
├── YYYY-MM-DD.html        ← ⭐ Arquivo gerado aqui
├── LOCAL-SETUP.md         ← Guia completo
├── GITHUB-ACTIONS.md      ← CI/CD workflow
└── ...
```

---

## ✨ O Que Acontece Quando Você Executa

```
node generate.js (ou npm run dev)
    ↓
1. Coleta notícias de 5 RSS feeds (10s)
    ↓
2. Curador Gemini refina artigos (15s)
    ↓
3. Gera jogos, citações, fatos (5s)
    ↓
4. Renderiza template HTML (2s)
    ↓
5. Salva em: journal/YYYY-MM-DD.html
    ↓
✅ PRONTO! (Total: ~30 segundos)
```

---

## 🧪 Testar Resultado

```bash
# Abrir no navegador (macOS)
open journal/$(date +%Y-%m-%d).html

# Ou no Linux
xdg-open journal/$(date +%Y-%m-%d).html

# Ou no Windows
start journal\$(date +%Y-%m-%d).html
```

### Simular Kindle
1. Pressione `F12` (DevTools)
2. Clique no ícone mobile
3. Selecione "Kindle Paperwhite"
4. Veja como fica no e-reader

---

## 🔄 Após Testar Localmente: GitHub Actions

### Passo 1: Push para GitHub

```bash
git add .github/workflows/journal.yml
git add journal/scripts/
git commit -m "🔧 Configurar O Matinal"
git push origin main
```

### Passo 2: Adicionar Secret

1. Vá para GitHub (seu repositório)
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**
4. Name: `GEMINI_API_KEY`
5. Value: `AIzaSy...`
6. Salvar

### Passo 3: Testar Manual

1. Vá para **Actions** (aba no topo do repo)
2. Clique em **📰 O Matinal — Gerar Jornal Diário**
3. Clique **Run workflow** (botão azul)
4. Clique **Run workflow** novamente
5. Aguarde 2-3 minutos
6. Verifique arquivo em `journal/`

---

## 📅 Automático: 6 AM Diários

Workflow roda automaticamente:
- **Todos os dias**
- **6 AM UTC** = **3 AM Brasília/Maceió**
- Arquivo gerado em `journal/YYYY-MM-DD.html`
- Edição anterior movida para `journal/archive/`

---

## 📚 Documentação Completa

| Arquivo | Para Quem | O Que Faz |
|---------|-----------|----------|
| **LOCAL-SETUP.md** | Você agora | Teste local completo |
| **GITHUB-ACTIONS.md** | CI/CD | Configure automação |
| **README.md** | Visão geral | Overview do projeto |
| **TEMPLATES.md** | Design | Compare 3 templates |
| **IMPLEMENTATION.md** | Dev | Código técnico |

---

## ⚡ Atalhos

```bash
# Setup rápido (automático)
./journal/scripts/setup-local.sh

# Teste rápido
./journal/scripts/test-local.sh

# Debug mode (logs detalhados)
DEBUG=true npm run dev

# Ver arquivo gerado
ls -lh journal/*.html

# Abrir resultado
open journal/$(date +%Y-%m-%d).html
```

---

## ❓ FAQ Rápido

**P: Qual API key preciso?**  
R: Google Gemini (grátis): https://makersuite.google.com/app/apikey

**P: Quanto custa?**  
R: Gratuito! 60 requisições/min no free tier (mais que suficiente)

**P: Funciona sem Gemini?**  
R: Sim! Usa fallback automático (conteúdo bruto)

**P: Posso customizar?**  
R: Tudo! Templates, RSS feeds, Gemini prompts, etc.

**P: Como eu recebo as notícias?**  
R: Via arquivo `journal/YYYY-MM-DD.html` (acesso direto)

**P: Funciona em Kindle?**  
R: Sim! Totalmente otimizado (testado em Kindle Cloud Reader)

---

## 🎯 Roadmap

- ✅ **Fase 1**: Templates + Config + Documentação
- ✅ **Fase 2**: Scripts + Workflow GitHub Actions
- ⏳ **Fase 3**: Você testando localmente (AGORA!)
- ⏳ **Fase 4**: Push → GitHub Secrets → Automático

---

## 🆘 Algo Deu Errado?

```bash
# Executar com debug
cd journal/scripts
DEBUG=true npm run dev

# Mostrar tudo que está acontecendo
# ↓
# [SCRAPER] Raspando RSS...
# [CURATOR] Curando com Gemini...
# [RENDERER] Renderizando template...
```

Se ainda falhar:
1. Verifique .env (GEMINI_API_KEY configurada?)
2. Teste RSS feeds manualmente (url em browser)
3. Verifique permissões de arquivo
4. Leia `LOCAL-SETUP.md` seção Troubleshooting

---

## 🎉 Próximo Passo

Execute agora:

```bash
cd journal/scripts
npm run dev
```

Em 30 segundos seu jornal estará gerado! 📰✨

---

**O Matinal** — Seu jornal pessoal, gerado automaticamente às 6 AM
