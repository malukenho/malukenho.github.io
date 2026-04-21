# 🔄 Como Testar o GitHub Actions Workflow

Guia para testar o workflow do jornal no GitHub Actions.

## 🚀 Setup Rápido

### Passo 1: Preparar Repositório

```bash
# Commitar todos os novos arquivos
git add .github/workflows/journal.yml
git add journal/scripts/
git commit -m "🔧 Configurar O Matinal — GitHub Actions"
git push origin main
```

### Passo 2: Adicionar API Key em GitHub Secrets

1. Vá para seu repositório no GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Name: `GEMINI_API_KEY`
5. Value: `AIzaSy...` (sua chave Gemini)
6. Clique em **Add secret**

✅ Pronto! Agora o workflow tem acesso à API.

---

## 🎯 Testar o Workflow

### Opção 1: Trigger Manual (Recomendado para Testes)

1. Vá para seu repositório
2. Clique em **Actions**
3. Na esquerda, selecione: **📰 O Matinal — Gerar Jornal Diário**
4. Clique em **Run workflow**
5. Clique em **Run workflow** novamente na caixa que aparecer
6. Aguarde a execução (2-3 minutos)

✅ O workflow irá executar sob demanda!

### Opção 2: Testar Localmente Primeiro (Recomendado)

Antes de fazer push, teste localmente:

```bash
cd journal/scripts

# Criar .env com sua chave
echo "GEMINI_API_KEY=AIzaSy..." > .env
echo "DEBUG=true" >> .env

# Instalar deps
npm install

# Executar
node generate.js
```

Se funcionar localmente, funcionará no GitHub Actions.

---

## 📊 Monitorar Execução

### Durante a Execução

1. Abra **Actions** no repositório
2. Veja a execução em tempo real
3. Clique no workflow para ver logs detalhados

### Logs Disponíveis

Para cada step, você verá:
- ✓ Checkout do repositório
- ✓ Setup Node.js
- ✓ Instalação de dependências
- ✓ Geração do jornal
- ✓ Arquivamento
- ✓ Commit e push

---

## ✅ Checklist: Verificar Sucesso

Após a execução, verifique:

- [ ] Workflow completou com ✓ verde
- [ ] Nenhuma mensagem de erro em vermelho
- [ ] Arquivo `YYYY-MM-DD.html` foi criado em `journal/`
- [ ] Arquivo anterior foi movido para `journal/archive/`
- [ ] Commit foi feito (verifique no Git log)

---

## 🔍 Verificar Resultado no GitHub

Depois de sucesso:

1. Vá para **Code** (abas no topo)
2. Navegue para **journal/**
3. Procure por arquivo com data de hoje
4. Clique para visualizar o HTML gerado

---

## 🕐 Trigger Automático

O workflow roda **automaticamente** às:
- **6 AM UTC** = **3 AM Brasília/Maceió**

Para verificar cronograma:

```bash
# Abra o arquivo
cat .github/workflows/journal.yml | grep cron
```

Saída deve ser:
```yaml
- cron: '0 6 * * *'
```

---

## ⏰ Agendamento do Cron

Formato: `minute hour day month dayofweek`

```
'0 6 * * *'   ← Dia: todo dia, Hora: 6 AM, Minuto: 00
  │ │ │ │ │
  │ │ │ │ └─ Dia da semana (0=Domingo, 6=Sábado)
  │ │ │ └─── Mês (1-12)
  │ │ └───── Dia do mês (1-31)
  │ └─────── Hora (0-23)
  └───────── Minuto (0-59)
```

### Exemplos de Cronogramas

```bash
# Todos os dias às 6 AM
'0 6 * * *'

# Segunda a Sexta às 8 AM
'0 8 * * 1-5'

# A cada 6 horas
'0 */6 * * *'

# Às 18:30
'30 18 * * *'
```

Para ajustar: edite `.github/workflows/journal.yml`

---

## ❌ Troubleshooting

### Workflow não aparece em "Actions"

**Solução:**
```bash
# Certifique-se que o arquivo está correto
cat .github/workflows/journal.yml | head -20

# Deve começar com:
# name: 📰 O Matinal — ...
# on:
#   schedule:
```

### Erro: "GEMINI_API_KEY not found"

**Solução:**
1. Vá para **Settings** → **Secrets**
2. Verifique se `GEMINI_API_KEY` está lá
3. Tente criar novo secret (pode haver delay)
4. Aguarde 1-2 minutos após criar

### Erro: "Failed to scrape RSS"

**Solução:**
1. Teste os RSS feeds localmente
2. Verifique URLs em `config.json`
3. Execute com `DEBUG=true` localmente
4. Tente novamente no GitHub

### Workflow timeout

**Solução:**
1. Aumentar timeout em `journal.yml`
2. Reduzir número de RSS feeds em `config.json`
3. Usar versão minimalista de scraper

---

## 📈 Monitoramento Contínuo

### Badge de Status

Adicione ao README:

```markdown
![O Matinal Workflow](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/journal.yml/badge.svg)
```

### Notificações

GitHub notifica automaticamente:
- ✓ Sucesso (commit feito)
- ✗ Falha (check runs)

---

## 🔒 Segurança

### Proteger API Key

✅ **Usando GitHub Secrets** (Correto!)
```yaml
env:
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

❌ **Nunca fazer isso:**
```yaml
env:
  GEMINI_API_KEY: 'AIzaSy...'  # Expostas publicamente!
```

### Permissões do Workflow

O workflow precisa de:
- ✓ Ler repositório (checkout)
- ✓ Escrever commits (push)
- ✓ Acessar secrets (GEMINI_API_KEY)

Verificar em **Settings** → **Actions** → **General**

---

## 📝 Exemplo de Execução Bem-Sucedida

```
✓ Checkout repositório (1s)
✓ Setup Node.js 18 (5s)
✓ Instalar dependências (15s)
✓ Gerar jornal (25s)
✓ Arquivar edição anterior (2s)
✓ Commit e push (3s)
✓ Sucesso! (Total: 51s)
```

---

## 🚀 Próximos Passos

1. **Testar localmente:** `npm run generate`
2. **Push para GitHub:** `git push origin main`
3. **Adicionar secret:** GitHub Settings
4. **Rodar manual:** Actions → Run workflow
5. **Aguardar automático:** 6 AM UTC de amanhã

---

## 📚 Mais Informações

- [Workflow local](LOCAL-SETUP.md) — Testar na máquina
- [GitHub Actions Docs](https://docs.github.com/en/actions) — Documentação oficial
- [Cronograma Cron](https://crontab.guru/) — Calculadora visual

---

**Pronto? Execute seu primeiro workflow manual!** 🚀

1. Push para GitHub
2. Vá para **Actions**
3. Clique em **Run workflow**
4. Aguarde resultado
5. Verifique arquivo gerado

Boa sorte! 📰✨
