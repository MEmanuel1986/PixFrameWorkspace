# PixFrameWorkspace

**Studio-Management-Software für Fotografen und Videografen**
Auftragsverwaltung · Kundenkartei · Verträge · Angebote · Rechnungen · FiBu · Fahrtenbuch · Kalender

![Version](https://img.shields.io/badge/version-1.0.0--beta.1-blue)
![Stack](https://img.shields.io/badge/stack-Vue3%20%2B%20Express-blue)
![Status](https://img.shields.io/badge/status-Beta-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)

---

## Voraussetzungen

| Tool | Mindestversion |
|---|---|
| Node.js | **18.x** (wird geprüft) |
| npm | 9.x |

---

## Schnellstart

### Windows

| Datei | Aktion |
|---|---|
| `win\Install.bat` | Einmalig — installiert alle Abhängigkeiten inkl. Puppeteer/Chromium |
| `win\Start-All.bat` | Backend + Frontend zusammen starten |

### macOS

```bash
# Einmalig — installiert alle Abhängigkeiten
bash mac/install.sh

# Starten
bash mac/start-all.sh
```

> **Hinweis:** Beim ersten Start lädt Puppeteer Chromium herunter (~150 MB, einmalig).
> Falls macOS Gatekeeper den Start blockiert: Systemeinstellungen → Sicherheit → Dennoch öffnen.

Nach dem Start:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health-Check:** http://localhost:3001/api/health

---

## Was ist neu in v1.0.0-beta.1?

- 🍎 **macOS vollständig kompatibel** — nodemon 3, iTerm2-Support, Node-Mindestversion geprüft
- ⚠️ **Logo-Fehlerhinweis** — bei fehlendem Logo nach Neuinstallation klare Meldung statt Broken Image
- 🏷️ **Artikelnummer im Druck** — eigene Zeile statt direkt am Artikelnamen
- 🔢 **Versionsnummer im Dashboard** — immer sichtbar unten links

---

## Projektstruktur

```
PixFrameWorkspace/
│
├── win/                            ← Windows Start- & Installationsskripte
│   ├── Install.bat / Install.ps1
│   ├── Start-All.bat / Start-All.ps1
│   ├── Start-Backend.ps1           ← Restart-Loop (nodemon)
│   └── Start-Frontend.bat
│
├── mac/                            ← macOS Start- & Installationsskripte
│   ├── install.sh                  ← Node-Check (≥18), chmod +x, Gatekeeper-Hinweis
│   ├── start-all.sh                ← Terminal.app + iTerm2 unterstützt
│   └── start-backend.sh            ← Restart-Loop (bash while)
│
├── backend/
│   ├── .env                        ← PORT, CORS_ORIGIN, FRONTEND_URL
│   ├── data/                       ← JSON-Datenspeicher (nie überschreiben!)
│   │   ├── customers.json
│   │   ├── projects.json
│   │   ├── documents.json
│   │   ├── articles.json
│   │   ├── counters.json           ← Atomare Nummernvergabe (BB-4)
│   │   ├── fibu.json
│   │   └── settings.json           ← Firmendaten, Rechtstexte, Nummernkreise
│   ├── uploads/
│   │   ├── logo/                   ← Firmenlogo (logo.png/jpg/svg)
│   │   ├── contracts/              ← Unterschriebene Verträge
│   │   └── receipts/               ← FiBu-Belege
│   ├── backups/                    ← Automatische + manuelle Backups
│   └── src/
│       ├── config/
│       │   ├── index.js            ← PORT, CORS, FRONTEND_URL
│       │   └── paths.js            ← Zentrale Pfade (Win + Mac)
│       ├── services/
│       │   ├── pdfService.js       ← Puppeteer PDF-Engine
│       │   ├── backupService.js    ← ZIP-Backup-System
│       │   ├── updateService.js    ← ZIP-Update-System
│       │   └── …
│       └── utils/
│           └── zipUtils.js         ← Plattformunabhängiges ZIP (kein Shell)
│
└── frontend/
    └── src/
        ├── pages/                  ← App-Seiten + Print-Views
        ├── components/project/     ← 7 Pipeline-Sub-Komponenten
        ├── stores/                 ← Pinia (5 Stores)
        ├── services/
        │   ├── api.js              ← API_BASE (einzige URL-Konstante)
        │   └── pdfExport.js
        └── styles/
            ├── global.css
            └── print-override.css  ← Globale @media print Overrides
```

---

## Backend-Architektur

| Schicht | Verantwortung |
|---|---|
| `routes/` | HTTP-Routing — nur Weiterleitung |
| `controllers/` | HTTP-Adapter — Request/Response |
| `services/` | Business-Logik |
| `storage/` | JSON lesen/schreiben (atomar) |
| `models/` | Datenmodelle mit Validierung |
| `utils/` | Logger, ZIP |

---

## PDF-Generierung (Puppeteer)

Pixelgenaue A4-PDFs über Headless-Chrome.

**Verfügbare Endpunkte:**

| Endpunkt | Beschreibung |
|---|---|
| `GET /api/pdf/document/:id` | Rechnung / Angebot / Stornorechnung |
| `GET /api/pdf/contract/:projectId` | Fotovertrag (Logo-Header) |
| `GET /api/pdf/adv/:projectId` | ADV-Vertrag |
| `GET /api/pdf/addendum/:pid/:aid` | Nachtrag |
| `GET /api/pdf/agb` | AGB |
| `GET /api/pdf/dsgvo` | Datenschutzerklärung |
| `GET /api/pdf/adv-vertrag` | ADV-Standardvertrag |
| `GET /api/pdf/ear/:year` | EÜR |
| `GET /api/pdf/blank-contract` | Blanko-Vertrag |

---

## Funktionsumfang (v1.0.0-beta.1)

### Auftragsverwaltung
7-Stufen-Pipeline: **Anfrage → Vorgespräch → Angebot** *(optional)* **→ Vertrag → Anzahlung → Abrechnung → Abschluss**

- Mehrere Locations pro Auftrag (Trauung, Kirche, Hotel, Getting Ready …)
- Mehrere Shooting-Termine pro Auftrag
- B2B-Phasenkalkulator mit Rüstzeiten
- Nutzungsrechte: Simple (MFM) + designaustria-Modell
- Leistungs-Chips (Fotografie, Videografie, Getting Ready, Danksagungskarten)

### Dokumente & Rechnungen (GoBD-konform)
- Angebote, Anzahlungs- und Schlussrechnungen
- Korrektur- (`KOR-`) und Stornorechnungen (`STORNO-`) mit Versionierung
- Atomare Nummernvergabe (kein Duplikat-Risiko)
- ZUGFeRD 2.3 XML-Export

### FiBu
- Einnahmen aus Rechnungen, Ausgaben mit Belegupload
- Eingangsrechnungen (Lieferanten)
- Fahrtenbuch mit automatischen Einträgen
- EAR-Ausdruck als PDF, DATEV CSV-Export, iCal-Export

### Konfiguration
| Tab | Inhalt |
|---|---|
| 🏢 Studio | Firmendaten, Logo, Steuer, Bank |
| 🔢 Nummernkreise | Token-basierte Schemas (`{jjjj}`, `{z,5}` …) |
| 📋 Auftrag | Stundensätze, Zahlungsarten, Storno-Staffel, Kalender |
| 📝 Rechtsdoks | Vertragswesen, AGB, DSGVO, ADV editierbar |
| ✉️ E-Mail 🚧 | SMTP (in Entwicklung) |
| 🎨 Darstellung | Theme, Schrift |
| ⚙️ System | Backup (ZIP), Update (ZIP mit Manifest), Systeminfos |

---

## API-Übersicht

| Ressource | Methoden |
|---|---|
| Kunden | CRUD `/api/customers` |
| Lieferanten | CRUD `/api/suppliers` |
| Projekte | CRUD `/api/projects` |
| Dokumente | CRUD + generate, revise, correct, cancel, status |
| Artikel | CRUD `/api/articles` |
| Einstellungen | GET/PUT + Logo-Upload |
| FiBu | GET + CRUD Ausgaben, Fahrten, Eingangsrechnungen |
| PDF | 9 GET-Endpunkte, Puppeteer-generiert |
| Backup | list, create, restore, import, delete, download |
| Update | preview, apply |
| Feiertage | `GET /api/holidays/feiertage?states=MV&years=2026` |

---

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | Vue 3, Pinia, Vue Router, Axios, Vite 4 |
| Backend | Node.js ≥18, Express 4, nodemailer |
| PDF | Puppeteer 22 (Headless-Chrome) |
| ZIP | Node.js native + yauzl (kein Shell) |
| Speicher | JSON-Dateien (→ SQLite → PostgreSQL geplant) |

---

## Konfiguration (`.env`)

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE_MB=50
```

---

## Update einspielen

Updates via **Einstellungen → ⚙️ System → Update** als ZIP.

```
update-v1.0.1.zip
├── update-manifest.json    ← Pflicht: { version, title, date, changes[] }
├── backend/src/…
└── frontend/src/…
```

Geschützte Pfade werden nie überschrieben: `data/`, `uploads/`, `backups/`, `.env`

---

## Lizenz

MIT — © Markus Emanuel
