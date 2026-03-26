#!/usr/bin/env bash
# PixFrameWorkspace - install.sh (v1.1.0)
# Installiert alle Abhängigkeiten für Backend und Frontend.
# Aufruf: bash mac/install.sh

set -e

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

step()  { echo -e "${CYAN}>> $1${NC}"; }
ok()    { echo -e "${GREEN}OK $1${NC}"; }
warn()  { echo -e "${YELLOW}!! $1${NC}"; }
fail()  { echo -e "${RED}XX $1${NC}"; exit 1; }

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  PixFrameWorkspace - Setup (macOS)${NC}"
echo -e "${CYAN}  Fotografie und Videografie Verwaltung${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true

# --- Voraussetzungen prüfen ---
step "Pruefe Voraussetzungen..."

if ! command -v node &>/dev/null; then
    fail "Node.js nicht gefunden.\n   Bitte installieren:\n   - Homebrew: brew install node\n   - Direkt:   https://nodejs.org"
fi
NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
    fail "Node.js v${NODE_VER} zu alt. Mindestens Node.js 18 erforderlich.\n   Upgrade: brew install node"
fi
ok "Node.js: $(node --version)"

if ! command -v npm &>/dev/null; then
    fail "npm nicht gefunden."
fi
ok "npm: v$(npm --version)"

# --- Build Tools für better-sqlite3 ---
step "Pruefe Build Tools fuer native Module..."
if command -v python3 &>/dev/null; then
    ok "Python3: $(python3 --version 2>&1)"
else
    warn "Python3 nicht gefunden."
    warn "better-sqlite3 benoetigt Python3 + Xcode Command Line Tools."
    warn "  xcode-select --install"
fi

if xcode-select -p &>/dev/null; then
    ok "Xcode CLI Tools vorhanden"
else
    warn "Xcode Command Line Tools fehlen."
    warn "  Installieren: xcode-select --install"
fi

# --- Backend .env prüfen ---
echo ""
step "Pruefe Backend-Konfiguration..."

ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"

if [ -f "$ENV_FILE" ]; then
    ok ".env bereits vorhanden"
elif [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    ok ".env aus .env.example erstellt"
else
    warn ".env fehlt - bitte manuell anlegen"
fi

# --- Backend installieren ---
echo ""
step "Installiere Backend-Abhaengigkeiten..."
warn "better-sqlite3 kompiliert native Bindings (kann 1-2 Min dauern)..."
cd "$BACKEND_DIR"

npm install --loglevel=error || fail "Backend: npm install fehlgeschlagen"
ok "Backend: npm install abgeschlossen"

# --- better-sqlite3 prüfen ---
echo ""
step "Pruefe better-sqlite3..."
if [ -d "$BACKEND_DIR/node_modules/better-sqlite3" ]; then
    ok "better-sqlite3 installiert"
else
    fail "better-sqlite3 nicht gefunden! Native Kompilierung fehlgeschlagen.\n   Versuche: xcode-select --install && npm install"
fi

# --- Frontend installieren ---
echo ""
step "Installiere Frontend-Abhaengigkeiten..."
cd "$FRONTEND_DIR"

npm install --loglevel=error || fail "Frontend: npm install fehlgeschlagen"
ok "Frontend: npm install abgeschlossen"

# --- Fertig ---
cd "$ROOT_DIR"
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Installation abgeschlossen!${NC}"
echo ""
echo -e "${YELLOW}  Starten:        bash mac/start-all.sh${NC}"
echo -e "${YELLOW}  Nur Backend:    bash mac/start-backend.sh${NC}"
echo -e "${YELLOW}  Nur Frontend:   bash mac/start-frontend.sh${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
