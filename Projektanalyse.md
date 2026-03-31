🏗️ PROJEKT-ANALYSE - Stand 30.03.2026
Projekt-Übersicht
Code
Repository: MEmanuel1986/PixFrameWorkspace
Version: v1.1.1 (30. März 2026)
Status: Stabiler Desktop-Release
Lizenz: MIT
Plattformen: Windows, macOS, Linux
📁 Projektstruktur
Code
PixFrameWorkspace/
├── 📂 electron/                  ← Desktop-Shell (Electron 30)
│   ├── main.js                   ← Window-Management, IPC, PDF-Generierung
│   └── preload.js                ← IPC-Bridge zu Frontend
│
├── 📂 backend/                   ← Express REST-API + SQLite (Node.js 22 LTS)
│   ├── server.js                 ← Server-Einstieg (Workspace-aware)
│   ├── src/
│   │   ├── app.js                ← Express-App-Setup
│   │   ├── database/             ← SQLite Schema + Migrations
│   │   │   ├── schema.js         ← 15 Tabellen-Definition (WAL-Mode, FK)
│   │   │   ├── databaseService.js
│   │   │   └── migrateFromJson.js
│   │   ├── services/             ← Business-Logik (9 Services)
│   │   │   ├── BaseRepository.js  ← Generisches SQLite-CRUD-Pattern
│   │   │   ├── customerService.js
│   │   │   ├── projectService.js
│   │   │   ├── documentService.js
│   │   │   ├── fibuService.js     ← Finanzbuchhaltung
│   │   │   ├── pdfService.js      ← Electron printToPDF
│   │   │   ├── backupService.js
│   │   │   ├── emailService.js    ← (v1.2.0 in Planung)
│   │   │   └── holidayService.js  ← JSON-Cache (BUG-1)
│   │   ├── controllers/          ← HTTP-Adapter (10 Controller)
│   │   ├── routes/               ← API-Routing (10 Routes)
│   │   ├── middleware/           ← Error Handler, Logging
│   │   ├── config/
│   │   │   ├── paths.js          ← Workspace-aware Pfade
│   │   │   └── config.js         ← Umgebungsvariablen
│   │   └── utils/                ← Helper (Logger, ZIP-Utility)
│   ├── .env.example              ← Konfiguration (BUG-7 behoben)
│   └── package.json              ← Dependencies
│
├── 📂 frontend/                  ← Vue 3 SPA (Vite)
│   ├── src/
│   │   ├── pages/                ← 11 App-Seiten + 9 Print-Views
│   │   │   ├── Dashboard.vue
│   │   │   ├── ProjectDetail.vue  ← 4.700 Zeilen (God-File, TD-2)
│   │   │   ├── Settings.vue       ← 3.200 Zeilen (God-File, TD-2)
│   │   │   ├── FiBuPage.vue
│   │   │   ├── DocumentPrint.vue
│   │   │   └── 8 weitere Print-Views
│   │   ├── components/           ← 40+ UI-Komponenten
│   │   │   ├── ProjectPipelineAngebot.vue
│   │   │   ├── ProjectPipelineVertrag.vue  ← 1.700 Zeilen
│   │   │   └── 7 Pipeline-Steps
│   │   ├── stores/               ← Pinia (5 Stores)
│   │   │   ├── projectStore.js
│   │   │   ├── documentStore.js
│   │   │   └── settingsStore.js
│   │   ├── services/
│   │   │   ├── api.js            ← Axios Client
│   │   │   ├── pdfExport.js      ← Electron IPC
│   │   │   └── zugferd.js        ← E-Rechnungen (ZUGFeRD)
│   │   └── styles/               ← Global CSS + Print-Overrides
│   ├── vite.config.js
│   └── package.json
│
├── 📂 windows/                   ← Windows Setup-Scripts
│   ├── install.bat               ← Install-Orchestrator
│   ├── install.ps1               ← Node.js v24 Check (BUG-2 behoben)
│   ├── start-all.bat             ← Start alle Services
│   └── start-backend.bat
│
├── 📂 mac/                       ← macOS Setup-Scripts
│   ├── install.sh                ← Xcode CLI Check
│   ├── start-all.sh              ← iTerm2-Unterstützung
│   └── start-backend.sh
│
├── 📂 assets/                    ← App-Icons (zu vervollständigen, F-3)
│   └── icon.* (ico/icns/png)
│
├── 📄 package.json               ← Root: Electron + concurrently + wait-on
├── 📄 CHANGELOG.md               ← v1.1.1 (gerade aktualisiert!)
├── 📄 ROADMAP.md                 ← v1.1.1 (gerade aktualisiert!)
├── 📄 ELECTRON_SETUP.md          ← Dev-Anleitung
└── 📄 README.md                  ← Übersicht
💻 Tech-Stack
Bereich	Technologie	Version
Desktop	Electron	30.x
Frontend	Vue 3	3.x
State Management	Pinia	2.x
Build Tool	Vite	4.x
HTTP Client	Axios	1.x
Backend	Express	4.18.x
Runtime	Node.js	22 LTS ⚠️ v24 nicht unterstützt
Datenbank	SQLite	better-sqlite3 11.7.0
PDF-Engine	Electron printToPDF	(kein Puppeteer)
Mail	Nodemailer	6.9.9
ZIP	yauzl + native Node.js	2.10.0
📊 Datenbank-Architektur
15 SQLite-Tabellen (WAL-Mode, Foreign Keys, Indizes)
Code
customers              ← Kunden + Kontaktdaten
projects               ← Shooting-Projekte + Termine
documents              ← Rechnungen, Angebote, Verträge
articles               ← Stammartikel (17 Standardartikel, löschgeschützt)
suppliers              ← Lieferanten
tags                   ← Projekt-Tags
expenses               ← Ausgaben (FiBu)
mileage                ← Fahrtenbuch (km-Pauschale)
external_invoices      ← Externe Rechnungen (BQ-7)
vat_rates              ← USt-Sätze
document_numbers       ← Nummernkreise (GoBD-konform)
app_version            ← System-Versionierung
backup_log             ← Backup-Historie
holiday_cache          ← JSON-Cache (⚠️ BUG-1: sollte SQLite sein)
counters               ← Atomare Zähler (Nummernvergabe)
Features:

✅ Atomic Transactions (Nummernvergabe, Storno)
✅ WAL-Mode (Concurrency ohne Locks)
✅ Foreign Keys (referenzielle Integrität)
✅ Indizes (Performance)
✅ Auto-Backup bei Serverstart
✅ v1 (JSON) → v2 (SQLite) Migration beim Init
🎯 Kernfunktionalität
App-Seiten (11 Hauptseiten)
Seite	Funktion	Status
Dashboard	KPI-Übersicht, Umsatz-Chart	✅ v1.1.0
Kunden	Customer Management	✅ v1.1.0
Projekte	Shooting-Projekte + Termine	✅ v1.1.0
Dokumente	Rechnungen, Angebote	✅ v1.1.0
FiBu	Ausgaben, Fahrtenbuch, Belege	✅ v1.1.0
Kalender	iCal-Export + Ferientage	✅ v1.1.0
Einstellungen	12 Tabs (Firmendaten, Artikel, Preise)	✅ v1.1.0
Send Email	(Infrastructure vorhanden, BUG-4 ausstehend)	🚧 v1.2.0
PDF-Generierung (9 Print-Views)
Dokument	Umfang	Status
Angebot (Offer)	3–6 Seiten	✅
Rechnung (Invoice)	2–4 Seiten	✅
Vertrag (Contract)	4–8 Seiten	✅
ADV-Vertrag	2 Seiten	✅
Addendum	1–2 Seiten	✅
AGB	Statisch	✅
DSGVO	Statisch	✅
Fahrtenbuch (Mileage)	2–5 Seiten	✅
Blank Contract	Template	✅
Engine: Electron printToPDF (kein Puppeteer, ~150 MB Einsparung)

🔐 GoBD-Compliance
✅ Atomare Dokumentenvergabe (Nummernkreise)
✅ Unveränderbare Dokumenthistorie (SQLite)
✅ Storno + Korrektur (regelkonform)
✅ DATEV-Export (CSV, v1.2.0: EXTF-Format geplant)
✅ ZUGFeRD 2.3 XML (v1.2.0: COMFORT-Profile geplant)
✅ Backup + Restore (konsistent via VACUUM INTO)
🐛 Bugs & Schulden (Stand v1.1.1)
Offene Bugs (v1.2.0+)
ID	Typ	Beschreibung	Aufwand
BUG-1	🔴 Kritisch	Holiday-Controller: JSON-Cache → SQLite	2–3h
BUG-4	🟠 Hoch	HTTP-Validierung (kein zod)	1 Tag
Technische Schulden
ID	Typ	Beschreibung	Aufwand
TD-1	🔴 Kritisch	Keine Tests (Unit/Integration/E2E)	3 Tage
TD-2	🟠 Hoch	God-Files (ProjectDetail 4.7k, Settings 3.2k)	2–3 Tage
TD-3	🟠 Hoch	Kein Linting/Formatting (eslint + prettier)	2 Stunden
TD-4	🟠 Hoch	Git-Workflow (4 Commits, kein History)	Laufend
TD-5	🟡 Mittel	Toter Code (MARGIN in pdfService)	10 Min
TD-6	🟡 Mittel	Duplizierter buildNumber()-Code	30 Min
✨ Geplante Features (v1.2.0–v1.3.0)
Feature	Version	Aufwand	Status
E-Mail-Versand	v1.2.0	2–3 Tage	🚧 Backend ready
Electron Auto-Update	v1.2.0	1 Tag	🟢 Planned
App-Icons	v1.1.x	30 Min	🟢 Planned
DATEV EXTF	v1.2.0	1–2 Tage	🟢 Planned
ZUGFeRD COMFORT	v1.2.0	1 Tag	🟢 Planned
Dashboard-Charts	v1.2.0	1 Tag	🟢 Planned
Rate Limiting	v1.2.0	30 Min	🟢 Planned
Linux Support	v1.3.0	1 Tag	🟢 Planned
Authentifizierung (JWT)	v2.0.0	1 Woche	🟡 Langfristig
Multi-User / Team	v2.0.0	2–3 Wochen	🟡 Langfristig
📈 Projekt-Metriken (geschätzt)
Metrik	Wert
Gesamte Code-Zeilen	~30.000–40.000
Backend-Code	~8.000–10.000
Frontend-Code	~15.000–20.000
Vue-Komponenten	50+
Express-Routes	10
SQLite-Tabellen	15
PDF-Views	9
Dependencies	~100 (Frontend + Backend)
Testabdeckung	0% ⚠️
🚀 Deployment & Build
Entwicklung:
bash
npm run dev              # Alles zusammen (Backend + Frontend + Electron)
npm run dev:backend     # Nur Express
npm run dev:frontend    # Nur Vite
npm run dev:electron    # Nur Electron
Produktion:
bash
npm run build           # Electron-App paketieren (.exe/.dmg/.AppImage)
npm run build:frontend  # Vue-Build only
Systemanforderungen:
Node.js: 22 LTS (empfohlen) oder 20+
npm: 9+
Windows: Visual Studio Build Tools (für native Module)
macOS: Xcode CLI Tools
⚠️ Node v24: NICHT unterstützt (BUG-2 in v1.1.1 gefixt)
📋 Workspace-Architektur
Code
Benutzer wählt Workspace-Ordner beim Start
                    ↓
        (z.B. Desktop, NAS, externe Festplatte)
                    ↓
        PIXFRAME_WORKSPACE environment variable
                    ↓
        backend/src/config/paths.js (workspace-aware)
                    ↓
        data/                ← SQLite-DB, Settings
        uploads/             ← Bilder, Logos, Rechnungen
        backups/             ← Auto-Backups (10 Versionen)
        logs/                ← Applikations-Logs
Vorteil: Keine AppData-Abhängigkeit, Benutzer bestimmt Speicherort

✅ v1.1.1 Status (30. März 2026)
Gerade Erledigt:
✅ BUG-2: Node.js v24 Kompatibilitätsprüfung
✅ BUG-7: Passwort-Sicherheit in .env.example
✅ BUG-3, BUG-5, BUG-6: Weitere Cleanups
✅ CHANGELOG.md & ROADMAP.md aktualisiert
Nächste Priorität (v1.2.0):
🔴 TD-1: Unit-Tests (BaseRepository, documentService, fibuService)
🔴 BUG-1: Holiday-Controller JSON → SQLite
🟠 BUG-4: zod Input-Validierung
✨ F-1: E-Mail-Versand (Backend ready)
🎯 Fazit
Das Projekt ist ein solides, produktionsreifes Electron-Desktop-App mit:

✅ Stabiler SQLite-Datenbank (15 Tabellen, WAL-Mode)
✅ GoBD-konformer Dokumentenverwaltung
✅ 9 professionelle PDF-Views
✅ Workspace-Abstraktions-Layer (flexible Daten-Lokation)
⚠️ 0 Tests (Hauptrisiko)
⚠️ 2 offene Bugs (Holiday + Validierung)
🚧 God-Files im Frontend (Refactoring nötig)
Reife: 7/10 — Produktionsreif, aber Skalierbarkeit gefährdet ohne Tests