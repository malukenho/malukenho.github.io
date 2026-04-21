#!/bin/bash

# 🎯 GUIA RÁPIDO: TESTAR O MATINAL LOCALMENTE

echo "╔════════════════════════════════════════════╗"
echo "║  📰 O MATINAL — SETUP LOCAL DE TESTES    ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Verificar Node.js
echo -e "${BLUE}✓ Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js não encontrado. Instale de: https://nodejs.org${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}  Versão: $NODE_VERSION${NC}\n"

# 2. Navegar para scripts
echo -e "${BLUE}✓ Navegando para diretório de scripts...${NC}"
cd "$(dirname "$0")" || exit
cd journal/scripts || exit
echo -e "${GREEN}  Diretório atual: $(pwd)${NC}\n"

# 3. Instalar dependências
echo -e "${BLUE}✓ Instalando dependências npm...${NC}"
npm install --no-save
echo -e "${GREEN}  Dependências instaladas!${NC}\n"

# 4. Criar .env se não existir
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Criando template...${NC}"
    cat > .env << 'EOF'
# Configure sua chave Gemini aqui
GEMINI_API_KEY=sua_chave_aqui

# Configurações
DEBUG=true
TEMPLATE=template-v2-responsive.html
TIMEZONE=America/Maceio
EOF
    echo -e "${GREEN}  Arquivo .env criado!${NC}"
    echo -e "${YELLOW}  ⚠️  IMPORTANTE: Edite .env e adicione sua GEMINI_API_KEY${NC}\n"
else
    echo -e "${GREEN}  .env encontrado${NC}\n"
fi

# 5. Executar geração
echo -e "${BLUE}✓ Executando gerador...${NC}"
echo ""
node generate.js

echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${GREEN}📚 PRÓXIMOS PASSOS:${NC}"
echo ""
echo -e "${YELLOW}1. Editar .env com sua GEMINI_API_KEY${NC}"
echo -e "${YELLOW}   GEMINI_API_KEY=sk-...${NC}"
echo ""
echo -e "${YELLOW}2. Executar novamente:${NC}"
echo -e "${YELLOW}   npm run dev${NC}"
echo ""
echo -e "${YELLOW}3. Abrir o arquivo gerado no navegador:${NC}"
echo -e "${BLUE}   $(ls -t ../*.html 2>/dev/null | head -1)${NC}"
echo ""
echo -e "${YELLOW}4. Testar em Kindle:${NC}"
echo -e "${BLUE}   F12 → Mobile View → Kindle Paperwhite${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
