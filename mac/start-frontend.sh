#!/usr/bin/env bash
# PixFrameWorkspace - start-frontend.sh
# Startet den Vite Dev-Server (Port 5173)
#
# Aufruf: bash mac/start-frontend.sh

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${RED}!! node_modules fehlt - bitte zuerst mac/install.sh ausfuehren${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  PixFrameWorkspace - Frontend${NC}"
echo -e "${CYAN}  http://localhost:5173${NC}"
echo -e "${CYAN}  Stoppen: Ctrl+C${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

cd "$FRONTEND_DIR"

if [ -f "$FRONTEND_DIR/node_modules/.bin/vite" ]; then
    "$FRONTEND_DIR/node_modules/.bin/vite"
else
    npx vite
fi
