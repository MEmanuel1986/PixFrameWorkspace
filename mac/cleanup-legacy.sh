#!/usr/bin/env bash
# PixFrameWorkspace - Altlasten bereinigen
# Entfernt nicht mehr benoetigte JSON-basierte Dateien aus v1.0.x

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  PixFrameWorkspace - Altlasten bereinigen${NC}"
echo -e "${CYAN}  v1.0.x JSON-Dateien entfernen${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo "  Folgende Altlasten werden entfernt:"
echo ""
echo "  1. backend/src/models/     (5 Dateien - ersetzt durch BaseRepository)"
echo "  2. backend/src/storage/    (fileStorage.js - ersetzt durch SQLite)"
echo ""

read -p "  Fortfahren? (j/n): " CONFIRM
if [ "$CONFIRM" != "j" ] && [ "$CONFIRM" != "J" ]; then
    echo "  Abgebrochen."
    exit 0
fi

echo ""

if [ -d "$BACKEND_DIR/src/models" ]; then
    rm -rf "$BACKEND_DIR/src/models"
    echo -e "${GREEN}OK models/ entfernt${NC}"
else
    echo "  -- models/ bereits entfernt"
fi

if [ -d "$BACKEND_DIR/src/storage" ]; then
    rm -rf "$BACKEND_DIR/src/storage"
    echo -e "${GREEN}OK storage/ entfernt${NC}"
else
    echo "  -- storage/ bereits entfernt"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Bereinigung abgeschlossen!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
