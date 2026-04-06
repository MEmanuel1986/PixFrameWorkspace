# PixFrameWorkspace

**Studio-Management-Software für Fotografen und Videografen**
Auftragsverwaltung · Kundenkartei · Verträge · Angebote · Rechnungen · FiBu · Fahrtenbuch · Kalender

![Version](https://img.shields.io/badge/version-1.2.0--dev-blue)
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

> **Hinweis:** Node.js v24 wird nicht unterstützt (keine better-sqlite3 Prebuilds). Node v22 LTS verwenden.

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

Nach dem Start öffnet sich automatisch die Electron Desktop-App. Beim ersten Start wird ein Workspace-Ordner gewählt und die Datenbank initialisiert (inkl. 17 Standardartikel).

### Produktions-Build

```bash
npm run build
```

Erstellt eine installierbare `.exe` (Windows) oder `.dmg` (macOS). Linux (`.AppImage`) ist vorbereitet, aber noch nicht vollständig getestet.

### Installation per Skript

**Windows:**
```
windows\install.ps1   ← Einmalig: Abhängigkeiten + better-sqlite3 Build-Tools prüfen
windows\start.ps1     ← Starten
```

**macOS:**
```bash
bash mac/install.sh   # Einmalig: Xcode CLI Tools + Abhängigkeiten
bash mac/start.sh     # Starten
```

---

## Architektur

```
PixFrameWorkspace/
├── electron/               ← Electron Main + Preload (Desktop-Shell)
│   ├── main.js             ← Fenster, IPC, PDF-Generierung, shell.openPath
│   └── preload.js          ← IPC-Bridge (window.pixframe)
├── backend/                ← Express REST-API + SQLite
│   ├── src/
│   │   ├── database/       ← Schema, Migrations, Seeds (17 Standardartikel)
│   │   ├── repositories/   ← BaseRepository (CRUD, camelCase↔snake_case)
│   │   ├── services/       ← Business-Logik
│   │   ├── controllers/    ← HTTP-Adapter
│   │   ├── routes/         ← API-Routing inkl. workspace, email
│   │   └── utils/          ← Logging, ZIP
│   └── server.js
├── frontend/               ← Vue 3 SPA
│   └── src/
│       ├── pages/          ← App-Seiten + 9 Print-Views + NewAnfragePage
│       ├── components/
│       │   ├── project/    ← 7 Pipeline-Sub-Komponenten
│       │   └── modals/     ← SendEmailModal, DocumentDetailModal, ...
│       ├── stores/         ← Pinia (5 Stores)
│       ├── services/       ← API-Client, PDF-Export, ZUGFeRD
│       └── styles/         ← Global CSS + Print-Overrides
├── assets/                 ← App-Icons (icon.ico vorhanden; .icns/.png fehlen noch)
├── windows/                ← Windows Install/Start Scripts
├── mac/                    ← macOS Install/Start Scripts
└── package.json            ← Root: Electron + concurrently + wait-on
```

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Desktop | Electron 30 |
| Frontend | Vue 3, Pinia, Vue Router, Axios, Vite 4 |
| Backend | Node.js 22 LTS, Express 4 |
| Datenbank | SQLite (better-sqlite3), WAL-Mode |
| PDF | Electron `printToPDF` (kein Puppeteer, kein Chromium-Download) |
| ZIP | Node.js native + yauzl |
| E-Mail | nodemailer (SMTP, konfigurierbar in Einstellungen) |

---

## Datenbank

SQLite mit 15 Tabellen, WAL-Mode, Foreign Keys und Indizes. Beim ersten Start werden automatisch 17 Standardartikel angelegt (löschgeschützt). Artikelpreise synchronisieren sich mit den Einstellungen.

Beim Update von v1.0.x (JSON-Speicher) wird eine einmalige Migration durchgeführt — die JSON-Originaldaten werden nach `data/_migrated_json/` archiviert.

---

## Workspace-Dateisystem

Pro Projekt wird automatisch eine standardisierte Ordnerstruktur angelegt:

```
[Workspace]/auftraege/K-00001/projects_[id]/
├── dokumente/     ← Angebote, Rechnungen, Storno, Korrekturen
├── vertraege/     ← Fotovertrag, ADV, Nachträge
├── medien/        ← Importierte Shooting-Dateien (geplant)
└── korrespondenz/ ← E-Mails, Notizen, sonstige Dateien
```

PDFs werden mit standardisierten Namen abgelegt (z.B. `Rechnung_R-2026-04_00001_Mueller.pdf`) und GoBD-konform nie überschrieben (Suffix `_v2`, `_v3` bei Wiederholung).

---

## PDF-Generierung

Pixelgenaue A4-PDFs via Electron's `printToPDF` — kein Puppeteer, kein Chromium-Download.

1. Frontend ruft `window.pixframe.generateAndOpenPDF('/api/pdf/...')` via IPC
2. Electron Main-Prozess erstellt unsichtbares BrowserWindow
3. Print-View wird geladen, CSS injiziert, `printToPDF` aufgerufen
4. PDF wird mit standardisiertem Namen im richtigen Unterordner gespeichert
5. Datei öffnet sich automatisch im System-Standard-Viewer (Adobe, Foxit, Vorschau.app …)
6. Kein Druckdialog, kein manuelles Speichern nötig

**Verfügbare PDF-Endpunkte:**

| Endpunkt | Beschreibung |
|----------|-------------|
| `/api/pdf/document/:id` | Rechnung / Angebot / Stornorechnung / Korrektur |
| `/api/pdf/contract/:projectId` | Fotovertrag |
| `/api/pdf/adv/:projectId` | ADV-Vertrag (Projekt) |
| `/api/pdf/addendum/:pid/:aid` | Nachtrag |
| `/api/pdf/agb` | AGB |
| `/api/pdf/dsgvo` | Datenschutzerklärung |
| `/api/pdf/adv-vertrag` | ADV-Standardvertrag |
| `/api/pdf/ear/:year` | EÜR |
| `/api/pdf/blank-contract` | Blanko-Vertrag |

---

## E-Mail-Versand

SMTP-Konfiguration in **Einstellungen → E-Mail**:

- Host, Port, SSL/STARTTLS, Benutzer, Passwort, Absendername
- Test-Mail-Button (speichert Einstellungen vor dem Test automatisch)
- E-Mail aus `DocumentDetailModal` direkt versenden (vorausgefüllter Text mit Kundenanrede + Dokumentnummer)
- PDF-Anhang per Base64

---

## Funktionsumfang

### Auftragsverwaltung — 7-Stufen-Pipeline

| Schritt | Inhalt |
|---------|--------|
| 1. Anfrage | Kundendaten, Termin, Leistungen, Honorar, B2B-Kalkulator |
| 2. Vorgespräch | Notizen mit Zeitstempel, Auftragsübersicht-Sidebar |
| 3. Angebot | Positionsliste, Artikelkatalog, NR-Modelle, aktive Version oben |
| 4. Vertrag | Fotovertrags-Generator, ADV, Nachträge |
| 5. Anzahlung | Anzahlungsrechnung, Zahlungserfassung mit Zahlungsart |
| 6. Abrechnung | Schlussrechnung, Übernahme aus Angebot/Vertrag, Korrekturen |
| 7. Abschluss | 🚧 In Entwicklung |

### Dokumente & Rechnungen (GoBD-konform)

- Angebote, Anzahlungs-/Schlussrechnungen, Korrektur- und Stornorechnungen
- Automatische Versionierung (`v1`, `v2`, `v3`-Badges)
- Zahlungserfassung: Datum + Zahlungsart (Überweisung, Bar, PayPal, SEPA, Vorkasse — konfigurierbar)
- ZUGFeRD 2.3 XML-Einbettung
- Alle PDFs im System-Viewer öffenbar, GoBD-konform archiviert

### FiBu

- Einnahmen aus Rechnungen, Ausgaben mit Belegupload
- Eingangsrechnungen (Lieferanten)
- Fahrtenbuch mit automatischen Einträgen
- EAR-Ausdruck als PDF, DATEV CSV-Export (SKR03), iCal-Export

### Konfiguration

| Tab | Inhalt |
|-----|--------|
| 🏢 Studio | Firmendaten, Logo, Steuer, Bank, Inhaber |
| 🔢 Nummernkreise | Token-basierte Schemas (`{jjjj}`, `{z,5}` …) |
| 📋 Auftrag | Stundensätze, Zahlungsarten (Checkbox-Chips), Storno-Staffel, Feiertage |
| 📝 Rechtsdoks | Vertragswesen, AGB, DSGVO, ADV editierbar + Nutzungsrechts-Referenz |
| ✉️ E-Mail | SMTP vollständig konfigurierbar + Test-Mail |
| 🎨 Darstellung | Theme, Schrift |
| ⚙️ System | Backup (SQLite VACUUM), Restore (v1 JSON + v2 SQLite), Systeminfos |

---

## API-Übersicht

| Ressource | Methoden |
|-----------|----------|
| Kunden | CRUD `/api/customers` |
| Lieferanten | CRUD `/api/suppliers` |
| Projekte | CRUD `/api/projects` |
| Dokumente | CRUD + generate, revise, correct, cancel, status, paidAt |
| Artikel | CRUD `/api/articles` |
| Einstellungen | GET/PUT + Logo-Upload |
| FiBu | GET + CRUD Ausgaben, Fahrten, Eingangsrechnungen |
| PDF | 9 GET-Endpunkte, Electron-printToPDF-generiert |
| Workspace | info, project-files, save-pdf `/api/workspace` |
| E-Mail | send, test, config `/api/email` |
| Backup | list, create, restore, import, delete, download |
| Feiertage | `GET /api/holidays/feiertage?states=MV&years=2026` |
| Health | `GET /api/health` (Version aus package.json) |

---

## Bekannte Einschränkungen (v1.2.0-dev)

- **Keine Tests** — 0% Testabdeckung (geplant für v1.2.0)
- **Kein ESLint/Prettier** — Code-Style inkonsistent (geplant für v1.2.0)
- **App-Icons unvollständig** — macOS/Linux-Build schlägt fehl (`icon.icns`, `icon.png` fehlen)
- **Abschluss-Reiter** — noch ohne strukturierten Inhalt
- **Medienimport-Reiter** — Struktur vorhanden, Funktionalität fehlt
- **ADV/DSGVO** — noch nicht automatisch am Projekt gespeichert
- **Logging** — nur `console.log`, kein strukturiertes Log-System

---

## Lizenz

MIT — © Markus Emanuel
