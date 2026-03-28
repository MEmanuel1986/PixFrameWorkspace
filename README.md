# PixFrameWorkspace

**Studio-Management-Software für Fotografen und Videografen**
Auftragsverwaltung · Kundenkartei · Verträge · Angebote · Rechnungen · FiBu · Fahrtenbuch · Kalender

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Stack](https://img.shields.io/badge/stack-Vue3%20%2B%20Express%20%2B%20Electron-blue)
![DB](https://img.shields.io/badge/db-SQLite-green)
![Status](https://img.shields.io/badge/status-Beta-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)

---

## Voraussetzungen

| Tool | Version |
|------|---------|
| Node.js | **22.x LTS** (empfohlen) |
| npm | 9.x+ |

> **Hinweis:** Node.js v24 wird nicht unterstützt (keine better-sqlite3 Prebuilds).

---

## Schnellstart

### Entwicklung

```bash
# Abhängigkeiten installieren (Root + Backend + Frontend)
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Starten (Backend + Frontend + Electron gleichzeitig)
npm run dev
```

Nach dem Start öffnet sich automatisch die Electron Desktop-App.

### Produktions-Build

```bash
npm run build
```

Erstellt eine installierbare `.exe` (Windows), `.dmg` (Mac) oder `.AppImage` (Linux).

---

## Architektur

```
PixFrameWorkspace/
├── electron/           ← Electron Main + Preload (Desktop-Shell)
│   ├── main.js         ← Fenster, IPC, PDF-Generierung
│   └── preload.js      ← IPC-Bridge (window.pixframe)
├── backend/            ← Express REST-API + SQLite
│   ├── src/
│   │   ├── database/   ← Schema, Migrations, Seeds
│   │   ├── services/   ← Business-Logik (SQLite)
│   │   ├── controllers/← HTTP-Adapter
│   │   └── routes/     ← API-Routing
│   └── server.js
├── frontend/           ← Vue 3 SPA
│   └── src/
│       ├── pages/      ← App-Seiten + 9 Print-Views
│       ├── components/ ← UI-Komponenten + 7 Pipeline-Steps
│       ├── stores/     ← Pinia (5 Stores)
│       ├── services/   ← API-Client, PDF-Export, ZUGFeRD
│       └── styles/     ← Global CSS + Print-Overrides
├── windows/            ← Windows Install/Start Scripts
├── mac/                ← macOS Install/Start Scripts
└── package.json        ← Root: Electron + concurrently + wait-on
```

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Desktop | Electron 30 |
| Frontend | Vue 3, Pinia, Vue Router, Axios, Vite 4 |
| Backend | Node.js 22 LTS, Express 4 |
| Datenbank | SQLite (better-sqlite3), WAL-Mode |
| PDF | Electron `printToPDF` (kein Puppeteer) |
| ZIP | Node.js native + yauzl |

---

## Datenbank

SQLite mit 15 Tabellen, WAL-Mode, Foreign Keys und Indizes. Beim ersten Start werden automatisch 17 Standardartikel angelegt (löschgeschützt).

Beim Update von v1.0.x (JSON) wird eine einmalige Migration durchgeführt — die JSON-Originaldaten werden nach `data/_migrated_json/` archiviert.

---

## PDF-Generierung

Pixelgenaue A4-PDFs via Electron's `printToPDF` — kein Puppeteer, kein Chromium-Download.

- Frontend ruft `window.pixframe.generatePDF('/api/pdf/...')` via IPC
- Electron Main-Prozess erstellt unsichtbares BrowserWindow
- Print-View wird geladen, CSS injiziert, `printToPDF` aufgerufen
- PDF wird als Datei gespeichert — kein Druckdialog

**Verfügbare PDF-Endpunkte:**

| Endpunkt | Beschreibung |
|----------|-------------|
| `/api/pdf/document/:id` | Rechnung / Angebot |
| `/api/pdf/contract/:projectId` | Fotovertrag |
| `/api/pdf/adv/:projectId` | ADV-Vertrag (Projekt) |
| `/api/pdf/addendum/:pid/:aid` | Nachtrag |
| `/api/pdf/agb` | AGB |
| `/api/pdf/dsgvo` | Datenschutzerklärung |
| `/api/pdf/adv-vertrag` | ADV-Standardvertrag |
| `/api/pdf/ear/:year` | EÜR |
| `/api/pdf/blank-contract` | Blanko-Vertrag |

---

## Funktionsumfang

### Auftragsverwaltung
7-Stufen-Pipeline: Anfrage → Vorgespräch → Angebot → Vertrag → Anzahlung → Abrechnung → Abschluss

### Dokumente & Rechnungen (GoBD-konform)
Angebote, Anzahlungs-/Schlussrechnungen, Korrektur-/Stornorechnungen, ZUGFeRD 2.3

### FiBu
Einnahmen, Ausgaben mit Beleg, Fahrtenbuch, EAR-PDF, DATEV CSV-Export

### Konfiguration
Firmendaten, Nummernkreise, Stundensätze, Rechtstexte (Vertrag, AGB, DSGVO, ADV), Theme

---

## Lizenz

MIT — © Victoria Elisabeth Emanuel
