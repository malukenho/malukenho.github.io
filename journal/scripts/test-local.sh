#!/bin/bash

# 📰 TESTE RÁPIDO DO O MATINAL

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   📰 O MATINAL — TESTE RÁPIDO LOCAL       ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Navegar para scripts
cd "$(dirname "$0")" || exit

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js não encontrado${NC}"
    echo "  Instale de: https://nodejs.org"
    exit 1
fi

echo -e "${BLUE}✓ Node.js encontrado: $(node -v)${NC}"
echo ""

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}✓ Instalando dependências...${NC}"
    npm install --silent
    echo ""
fi

# Criar .env se não existir
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env não encontrado!${NC}"
    echo ""
    echo -e "${BLUE}Opções:${NC}"
    echo "  1. Crie .env com: cat .env.example > .env"
    echo "  2. Edite e adicione sua GEMINI_API_KEY"
    echo "  3. Execute novamente"
    echo ""
    echo -e "${YELLOW}Criando .env com valores de exemplo...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env criado (edite com sua API key)${NC}"
    echo ""
fi

# Verificar GEMINI_API_KEY
if ! grep -q "GEMINI_API_KEY=AIzaSy" .env; then
    echo -e "${YELLOW}⚠️  IMPORTANTE: GEMINI_API_KEY ainda não configurada!${NC}"
    echo ""
    echo "Siga estes passos:"
    echo "  1. Acesse: https://makersuite.google.com/app/apikey"
    echo "  2. Clique em 'Create new API key'"
    echo "  3. Copie a chave (AIzaSy...)"
    echo "  4. Edite .env e cole a chave:"
    echo "     GEMINI_API_KEY=AIzaSy..."
    echo ""
    echo "Depois, execute novamente:"
    echo "  npm run dev"
    echo ""
    exit 1
fi

# Executar gerador
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Iniciando gerador de jornal...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

DEBUG=true node generate.js

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Sucesso! Jornal gerado.${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo ""
    
    # Encontrar arquivo gerado
    GENERATED_FILE=$(ls -t ../*.html 2>/dev/null | head -1)
    if [ -n "$GENERATED_FILE" ]; then
        echo -e "${GREEN}📄 Arquivo gerado:${NC}"
        echo -e "   ${BLUE}$GENERATED_FILE${NC}"
        echo ""
        echo -e "${YELLOW}🔗 Abrir no navegador:${NC}"
        echo -e "   ${BLUE}open $GENERATED_FILE${NC}"
        echo ""
        echo -e "${YELLOW}📱 Teste em Kindle:${NC}"
        echo -e "   F12 → Mobile View → Simule Kindle Paperwhite${NC}"
    fi
else
    echo -e "${RED}═══════════════════════════════════════════${NC}"
    echo -e "${RED}❌ Erro na geração.${NC}"
    echo -e "${RED}═══════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Possíveis causas:${NC}"
    echo "  • GEMINI_API_KEY inválida"
    echo "  • RSS feeds inacessíveis"
    echo "  • Erro na conexão com Gemini API"
    echo ""
    echo "Tente com debug:"
    echo "  npm run dev"
fi

echo ""
