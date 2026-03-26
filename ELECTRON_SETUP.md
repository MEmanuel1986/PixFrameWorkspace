# PixFrame Workspace - Electron Setup

## Projektstruktur nach Electron-Integration

```
PixFrame_v1.1.0/
├── electron/
│   ├── main.js          ← Electron Hauptprozess
│   └── preload.js       ← IPC Bridge zum Frontend
├── backend/
│   ├── server.js        ← Express (startet automatisch in Electron)
│   ├── src/             ← Alle Services, Controller, Routes
│   └── package.json     ← Backend-Dependencies
├── frontend/
│   ├── src/             ← Vue 3 App
│   ├── vite.config.js   ← Angepasst für Electron (base: './')
│   └── package.json     ← Frontend-Dependencies
├── assets/
│   ├── icon.ico         ← Windows App-Icon
│   ├── icon.icns        ← macOS App-Icon
│   └── icon.png         ← Linux App-Icon
├── package.json         ← Root: Electron + Build-Scripts
└── ELECTRON_SETUP.md    ← Diese Datei
```

## Voraussetzungen

- Node.js 22 LTS (empfohlen) oder 20+
- npm 9+
- Windows: Visual Studio Build Tools (für native Module)

## Installation

```bash
# 1. Root-Dependencies installieren (Electron + Tools)
npm install

# 2. Backend + Frontend Dependencies installieren
npm run postinstall
# (oder manuell: cd backend && npm install && cd ../frontend && npm install)
```

## Entwicklung (Dev-Modus)

```bash
# Startet Backend + Frontend + Electron gleichzeitig
npm run dev
```

Das startet drei Prozesse:
- **Backend** (Express auf :3001)
- **Frontend** (Vite Dev Server auf :5173 mit Hot Reload)
- **Electron** (wartet bis beide Server laufen, öffnet dann Fenster)

Alternativ einzeln starten:
```bash
npm run dev:backend      # Nur Express
npm run dev:frontend     # Nur Vite
npm run dev:electron     # Nur Electron (braucht Backend + Frontend)
```

## Ohne Electron (wie bisher)

Falls du weiterhin ohne Electron arbeiten willst:

```bash
cd backend && node server.js     # Backend starten
cd frontend && npm run dev       # Frontend starten
# Browser öffnen: http://localhost:5173
```

## Produktion (App bauen)

```bash
# 1. Frontend bauen
npm run build:frontend

# 2. Electron-App paketieren
npm run build
```

Die fertige App liegt dann in `dist-electron/`.

## Workspace-Ordner

Beim ersten Start fragt Electron nach einem **Workspace-Ordner**:
- Hier liegen ALLE Daten: SQLite-DB, Uploads, Backups, Logs
- Frei wählbar (Desktop, Dokumente, NAS, externe Festplatte)
- KEIN AppData-Zwang — du bestimmst wo deine Daten liegen

Den Workspace kann man später über das Menü wechseln
(erfordert Neustart der App).

## Architektur

```
Electron Main Process
├── Workspace-Manager (Ordner-Auswahl)
├── Express Server (in-process, kein Child-Prozess)
│   ├── SQLite (better-sqlite3)
│   ├── REST API (/api/...)
│   └── Static Files (Vue Build in Produktion)
└── BrowserWindow
    └── Vue 3 SPA
        ├── Dev:  http://localhost:5173 (Vite HMR)
        └── Prod: http://localhost:3001 (Express)
```

Express läuft **im gleichen Node.js-Prozess** wie Electron.
Kein Port-Konflikt, kein Child-Process-Management, direkter DB-Zugriff.

## Icons

Lege App-Icons in den `assets/` Ordner:
- `icon.ico` — Windows (256x256, .ico Format)
- `icon.icns` — macOS (.icns Format)
- `icon.png` — Linux (512x512, .png Format)

Tools zum Erstellen: https://www.electron.build/icons
