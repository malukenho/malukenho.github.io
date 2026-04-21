# 🚀 Quick Start — O Matinal

Comece em 5 minutos!

## 1️⃣ Escolha o Template

Abra no navegador para comparar:
- `template-v1-classical.html` — 2-colunas, decorado
- `template-v2-responsive.html` — **RECOMENDADO** 
- `template-v3-minimalist.html` — Minimalista

**Recomendação:** Use **V2 (Responsivo)** para o melhor equilíbrio.

Para mudar o padrão, edite `config.json`:
```json
"template": "template-v2-responsive.html"
```

---

## 2️⃣ Gere a Chave da API Gemini

1. Acesse: https://makersuite.google.com/app/apikey
2. Clique em **"Create new API key"**
3. Copie a chave
4. Guarde em local seguro

---

## 3️⃣ Configure no GitHub

1. Vá para seu repositório
2. **Settings → Secrets and variables → Actions**
3. Clique em **"New repository secret"**
4. Name: `GEMINI_API_KEY`
5. Value: `<sua-chave-gemini>`
6. Clique em **"Add secret"**

---

## 4️⃣ Teste Localmente (Opcional)

```bash
# 1. Instale dependências
npm install dotenv axios cheerio node-rss @google/generative-ai sharp

# 2. Crie arquivo .env
cat > .env << EOF
GEMINI_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-2.0-flash
TIMEZONE=America/Maceio
TEMPLATE=template-v2-responsive.html
EOF

# 3. Execute o script
node journal/scripts/generate.js

# 4. Abra o arquivo gerado
open journal/$(date +%Y-%m-%d).html
```

---

## 5️⃣ Configure GitHub Actions

Crie o arquivo `.github/workflows/journal.yml`:

```yaml
name: 📰 Generate O Matinal

on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install dotenv axios cheerio node-rss @google/generative-ai sharp
      
      - name: Generate journal
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: node journal/scripts/generate.js
      
      - name: Archive & Deploy
        run: |
          mkdir -p journal/archive
          YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
          [ -f journal/$YESTERDAY.html ] && mv journal/$YESTERDAY.html journal/archive/
      
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add journal/
          git commit -m "📰 O Matinal - $(date +%Y-%m-%d)" || true
          git push
```

---

## 📚 Documentação Detalhada

- **[README.md](README.md)** — Overview completo
- **[TEMPLATES.md](TEMPLATES.md)** — Comparação das 3 versões
- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** — Código técnico + módulos

---

## 🔍 Testar no Kindle

### Online (Grátis)
1. Abra `template-v2-responsive.html` no navegador
2. Clique com botão direito → "Inspecionar" (F12)
3. Clique no ícone de dispositivo (mobile)
4. Selecione "Kindle Paperwhite"

### Kindle Cloud Reader
1. Acesse: https://read.amazon.com/
2. Cole o conteúdo HTML
3. Navegue e teste

### Kindle Real
1. Exporte HTML → EPUB (use Calibre)
2. Envie para seu Kindle via email

---

## 📝 Estrutura de Notícias Configurada

O `config.json` já inclui:

**Português (Brasil):**
- G1 (Globo) — Geral, Tech, Sergipe
- Folha de S.Paulo — Mundo, Política, Cotidiano
- O Globo — Notícias nacionais
- BBC Brasil
- Reuters Brasil

**Tecnologia:**
- TechCrunch
- Hacker News

**Internacional:**
- NOS.nl (Holanda)
- AT5 (Amsterdam)
- NHK World (Japão)

Adicione mais fontes editando `config.json` → `news_sources`.

---

## ⚠️ Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "API key not found" | Verifique se `GEMINI_API_KEY` está em GitHub Secrets |
| "Feed não carrega" | Teste a URL RSS em um feed reader online |
| "Imagens não aparecem" | Verifique permissões e tamanho dos arquivos |
| "Template em branco" | Valide o HTML com o W3C Validator |

---

## 🎯 Fluxo de Funcionamento

```
GitHub Actions (6 AM)
    ↓
Scraper: Coleta de RSS feeds
    ↓
Gemini API: Curação e escrita de artigos
    ↓
Image Processor: Otimização de imagens
    ↓
Template Renderer: Preenchimento do HTML
    ↓
Archive: Move edição anterior para histórico
    ↓
Publish: Envio para GitHub Pages / Repository
    ↓
Você lê no navegador ou Kindle ✅
```

---

## 🎨 O Malho Style (Seu Design)

Os templates foram inspirados em "O Malho", o clássico jornal satírico brasileiro:

- ✅ Tipografia elegante e formal
- ✅ Bordas decorativas
- ✅ Layout multi-coluna (V1) ou responsivo (V2/V3)
- ✅ Tom de crítica social refinada
- ✅ Português brasileiro formal

---

## 🆙 Próximas Fases

**Depois de configurar tudo:**

1. Teste a primeira geração (trigger manual)
2. Verifique em Kindle Cloud Reader
3. Ajuste o template conforme preferência
4. Aguarde a geração automática às 6 AM
5. Customize categorias em `config.json` se desejar

---

## 💡 Dicas

- **Kindle Cloud Reader:** Teste responsividade sem Kindle real
- **DevTools F12:** Use mobile view para simular Kindle
- **Calibre:** Converta HTML → EPUB/MOBI para Kindle real
- **GitHub Actions:** Use "Run workflow" para testar manualmente
- **Gemini Prompts:** Personalize em `curator.js` conforme desejar

---

**Pronto! Você tem tudo para começar. 📰✨**

Dúvidas? Consulte `README.md` ou `IMPLEMENTATION.md`.

