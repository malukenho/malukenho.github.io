# 🚀 Como Executar O Matinal Localmente

Guia completo para testar e gerar seu jornal no computador antes de configurar automação.

## ⚡ Quick Start (5 minutos)

```bash
# 1. Ir para o diretório de scripts
cd journal/scripts

# 2. Instalar dependências
npm install

# 3. Criar .env com sua chave Gemini
cat > .env << EOF
GEMINI_API_KEY=sua_chave_aqui
DEBUG=true
EOF

# 4. Executar gerador
node generate.js
```

Pronto! Seu jornal foi gerado em `journal/YYYY-MM-DD.html`

---

## 📋 Pré-requisitos

### ✅ Node.js 18+
```bash
# Verificar versão instalada
node -v

# Se não tiver, instale de:
# https://nodejs.org
```

### ✅ Google Gemini API Key
1. Acesse: https://makersuite.google.com/app/apikey
2. Clique em "Create new API key"
3. Copie a chave
4. Guarde em lugar seguro!

---

## 🔧 Setup Completo Passo a Passo

### Passo 1: Navegar para o diretório de scripts

```bash
cd journal/scripts
```

### Passo 2: Instalar as dependências

```bash
npm install
```

Isso instala:
- `axios` — Requisições HTTP
- `cheerio` — Parse HTML
- `xml2js` — Parse XML/RSS
- `@google/generative-ai` — SDK do Gemini
- `dotenv` — Variáveis de ambiente

### Passo 3: Criar arquivo `.env`

```bash
cat > .env << EOF
GEMINI_API_KEY=sua_chave_api_aqui
DEBUG=true
TEMPLATE=template-v2-responsive.html
TIMEZONE=America/Maceio
EOF
```

**Ou edite manualmente:**
```bash
# macOS/Linux
nano .env

# Windows
notepad .env
```

Conteúdo do `.env`:
```
GEMINI_API_KEY=sk-1234567890abcdef...
DEBUG=true
TEMPLATE=template-v2-responsive.html
TIMEZONE=America/Maceio
```

### Passo 4: Executar o gerador

**Modo normal (sem debug):**
```bash
node generate.js
```

**Modo debug (com logs detalhados):**
```bash
DEBUG=true node generate.js
```

**Ou usando npm:**
```bash
npm run generate      # Normal
npm run dev           # Com debug
npm run test          # Teste
```

---

## 📊 Fluxo de Execução

Quando você executa `node generate.js`, acontece:

```
1️⃣  Carregar config.json
      ↓
2️⃣  Scraping de RSS feeds (5-10 segundos)
      ↓
3️⃣  Curação com Gemini API (10-20 segundos)
      ↓
4️⃣  Renderizar template HTML (1-2 segundos)
      ↓
5️⃣  Salvar arquivo YYYY-MM-DD.html
      ↓
✅ Sucesso! Arquivo gerado
```

**Tempo total:** ~20-30 segundos

---

## 📂 Estrutura de Arquivos

```
journal/
├── scripts/
│   ├── package.json           ← Dependências
│   ├── .env                   ← Chave da API (criar!)
│   ├── generate.js            ← Script principal
│   ├── scraper.js             ← Extrator de RSS
│   ├── curator.js             ← Curador com Gemini
│   ├── renderer.js            ← Renderizador HTML
│   └── setup-local.sh         ← Script setup automático
│
├── 2026-04-21.html            ← ⭐ Arquivo gerado
├── template-v2-responsive.html
├── config.json
└── archive/
```

---

## 🎯 Testando Localmente

### Opção 1: Abrir no Navegador

```bash
# macOS
open journal/$(date +%Y-%m-%d).html

# Linux
xdg-open journal/$(date +%Y-%m-%d).html

# Windows
start journal\%DATE:~-4,4%-%DATE:~-10,2%-%DATE:~-7,2%.html
```

### Opção 2: Servidor Local

```bash
# Python 3
cd journal
python3 -m http.server 8000

# Node.js
npx http-server journal

# Em seguida, abra:
# http://localhost:8000
```

### Opção 3: Sim Kindle Cloud Reader

1. Abra: https://read.amazon.com/
2. Cole o conteúdo do arquivo HTML
3. Teste a leitura

---

## 📱 Testar Responsividade (Para Kindle)

1. Abra o arquivo HTML no navegador
2. Pressione `F12` (DevTools)
3. Clique no ícone de dispositivo (mobile)
4. Selecione "Kindle Paperwhite" ou simule 600x800px
5. Observe a renderização

**Checklist:**
- [ ] Fontes legíveis
- [ ] Imagens redimensionadas
- [ ] Sem overflow horizontal
- [ ] Espaçamento adequado
- [ ] Contraste suficiente

---

## 🔑 Obtendo a API Key do Gemini

### Passo 1: Acessar Google AI Studio

Vá para: https://makersuite.google.com/app/apikey

### Passo 2: Criar Nova Chave

1. Clique em "Create new API key"
2. Selecione "Create API key in new Google Cloud project"
3. Aguarde a criação

### Passo 3: Copiar a Chave

A chave aparecerá como: `AIzaSyDxxx...`

### Passo 4: Adicionar ao `.env`

```
GEMINI_API_KEY=AIzaSyDxxx...
```

### ⚠️ Segurança

- **Nunca** commite `.env` no Git
- **Nunca** compartilhe sua API key
- Em GitHub, adicione a `GitHub Secrets`

---

## ❌ Troubleshooting

### Erro: "GEMINI_API_KEY not found"

**Solução:**
```bash
# Verificar se .env existe
ls -la .env

# Se não existir, criar:
cat > .env << EOF
GEMINI_API_KEY=sua_chave
DEBUG=true
EOF
```

### Erro: "Cannot find module 'axios'"

**Solução:**
```bash
# Instalar dependências
npm install

# Ou reinstalar tudo
rm -rf node_modules package-lock.json
npm install
```

### Erro: "RSS feed returned empty"

**Solução:**
1. Teste o RSS no navegador: `https://g1.globo.com/rss/feeds/geral/`
2. Verifique se a URL está correta em `config.json`
3. Tente com `DEBUG=true` para ver logs detalhados

### Erro: "Failed to generate content with Gemini"

**Solução:**
1. Verifique se a API key é válida
2. Verifique se tem quotas disponíveis
3. Tente novamente em alguns segundos
4. O script usa fallback automático se Gemini falhar

### Template não renderiza

**Solução:**
1. Verifique o nome do template em `.env`
2. Certifique-se que o arquivo existe em `journal/`
3. Valide o HTML: https://validator.w3.org/

---

## 📊 Configuração de Debug

Para obter logs detalhados durante a execução:

```bash
DEBUG=true node generate.js
```

Isso mostrará:
- ✓ Cada RSS feed sendo raspado
- ✓ Cada artigo sendo refinado
- ✓ Cada chamada de API
- ✓ Tempo de execução
- ✓ Nomes de funções sendo executadas

---

## 🔄 Workflow Recomendado

### 1. Primeira Execução
```bash
cd journal/scripts
npm install
# Editar .env com API key
DEBUG=true node generate.js
```

### 2. Verificar Resultado
```bash
# Abrir no navegador
open ../$(date +%Y-%m-%d).html
```

### 3. Testar em Kindle
```bash
# F12 → Mobile View
# Selecione Kindle Paperwhite
```

### 4. Ajustar se Necessário
```bash
# Editar config.json
# Editar template se quiser
# Executar novamente
node generate.js
```

### 5. Depois: Configurar GitHub Actions
```bash
# Commitar e push
git add .
git commit -m "Configurar O Matinal"
git push
```

---

## 🚀 Próximo Passo: GitHub Actions

Depois de testar localmente com sucesso:

1. Commitar arquivo `.github/workflows/journal.yml`
2. Adicionar `GEMINI_API_KEY` em GitHub Secrets
3. Testar com "Run workflow" (manual)
4. Aguardar primeiro trigger automático às 6 AM

---

## 📚 Referências

- [Guia de Setup](QUICKSTART.md) — 5 passos rápidos
- [Documentação Principal](README.md) — Visão geral completa
- [Implementação Técnica](IMPLEMENTATION.md) — Código detalhado
- [Google Gemini API](https://ai.google.dev/) — Docs oficiais

---

## 💡 Dicas

1. **Teste os RSS feeds:** Cole URLs em um leitor RSS online para confirmar que funcionam
2. **Customize as categorias:** Edite `config.json` para mudar fontes
3. **Escolha seu template:** Mude `TEMPLATE` em `.env`
4. **Monitorar logs:** Use `DEBUG=true` enquanto desenvolve
5. **Backup de .env:** Guarde sua API key em lugar seguro (não no Git!)

---

**Pronto para começar? Execute:**

```bash
cd journal/scripts && npm install && node generate.js
```

🎉 Seu jornal será gerado em segundos!
