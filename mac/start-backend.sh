#!/usr/bin/env bash
# PixFrameWorkspace - start-backend.sh
# Restart-Loop: Bei Exit-Code 0 (Update) oder Absturz automatisch neu starten.
# Beenden mit Ctrl+C.

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo -e "${RED}!! node_modules fehlt - bitte zuerst mac/install.sh ausfuehren${NC}"
    exit 1
fi

ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"
if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo -e "${GREEN}OK .env aus .env.example erstellt${NC}"
fi

cd "$BACKEND_DIR"
NODEMON="$BACKEND_DIR/node_modules/.bin/nodemon"

# Ctrl+C sauber abfangen
trap 'echo -e "\n${YELLOW}Backend beendet.${NC}"; exit 2' INT TERM

while true; do
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}  PixFrameWorkspace - Backend${NC}"
    echo -e "${CYAN}  http://localhost:3001${NC}"
    echo -e "${CYAN}  Stoppen: Ctrl+C${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""

    if [ -f "$NODEMON" ]; then
        "$NODEMON" server.js
    else
        node server.js
    fi

    EXIT_CODE=$?
    [ $EXIT_CODE -eq 2 ] && break
    echo -e "${CYAN}>> Neustart in 2 Sekunden (Exit: $EXIT_CODE)...${NC}"
    sleep 2
done
