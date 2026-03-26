#!/usr/bin/env bash
# PixFrameWorkspace - start-all.sh
# Startet Backend und Frontend in separaten Terminal-Tabs / Fenstern.
# KEIN automatisches npm install — bitte zuerst mac/install.sh ausführen.
#
# Aufruf: bash mac/start-all.sh

set -e

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

step()  { echo -e "${CYAN}>> $1${NC}"; }
ok()    { echo -e "${GREEN}OK $1${NC}"; }
warn()  { echo -e "${YELLOW}!! $1${NC}"; }
fail()  { echo -e "${RED}XX $1${NC}"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  PixFrameWorkspace - Start (macOS)${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# node_modules prüfen — NICHT automatisch installieren, nur warnen
MISSING=0
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    warn "Backend node_modules fehlt."
    MISSING=1
fi
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    warn "Frontend node_modules fehlt."
    MISSING=1
fi

if [ "$MISSING" -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}  Bitte zuerst die Installation ausführen:${NC}"
    echo -e "${YELLOW}  bash mac/install.sh${NC}"
    echo ""
    exit 1
fi

# Backend und Frontend in neuen Terminal-Fenstern starten
# Unterstützt Terminal.app und iTerm2

open_in_terminal() {
  local SCRIPT="$1"
  local TITLE="$2"
  # iTerm2 bevorzugen falls vorhanden
  if osascript -e 'tell application "System Events" to (name of processes) contains "iTerm2"' 2>/dev/null | grep -q true; then
    osascript -e "
      tell application \"iTerm2\"
        tell current window
          create tab with default profile
          tell current session
            write text \"bash \\\"$SCRIPT\\\"\"
          end tell
        end tell
        activate
      end tell
    " 2>/dev/null || true
  else
    osascript -e "
      tell application \"Terminal\"
        do script \"bash \\\"$SCRIPT\\\"\"
        activate
      end tell
    " 2>/dev/null || true
  fi
}

step "Starte Backend..."
open_in_terminal "$SCRIPT_DIR/start-backend.sh" "Backend"

sleep 2

step "Starte Frontend..."
open_in_terminal "$SCRIPT_DIR/start-frontend.sh" "Frontend"

sleep 3

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Beide Server gestartet!${NC}"
echo ""
echo -e "${YELLOW}  Backend:   http://localhost:3001${NC}"
echo -e "${YELLOW}  Frontend:  http://localhost:5173${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Browser öffnen
sleep 2
open "http://localhost:5173" 2>/dev/null || true
