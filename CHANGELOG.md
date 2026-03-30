## v1.1.1 — Hotfixes: Node.js v24, Passwort-Sicherheit, Installation
*30. März 2026*

### Bug-Fixes
- ✅ **BUG-2:** Node.js v24 Kompatibilitätsprüfung in Installer-Skripten (Windows + macOS)
  - Windows: `install.ps1` prüft `node -v` auf v24+ und bricht mit Fehlermeldung ab
  - macOS: `install.sh` prüft Node-Version und empfiehlt Node.js v22 LTS
  - Nutzer wird auf Download-Link verwiesen

- ✅ **BUG-7:** Klartext-Passwort aus `backend/.env.example` entfernt
  - Sicheres Beispiel mit Kommentaren für SQLite-Konfiguration
  - Keine exponierten Zugangsdaten mehr

- ✅ **BUG-3:** `cleanup-project.ps1` und `project-files.txt` bereits aus Repo entfernt (v1.1.0)

- ✅ **BUG-5:** `multer` Dependency bereits entfernt (v1.1.0)

- ✅ **BUG-6:** Versionsnummer im Health-Endpoint auf `1.1.0` aktualisiert

### Installer-Verbesserungen
- Node.js Versionscheck vor Installation
- Klare Fehlermeldungen mit Lösungsvorschlägen
- Verweis auf Node.js LTS (v22, v20)
- Download-Link zum offiziellen Node.js-Repository

### Bekannte verbleibende Bugs (für v1.2.0+)
- BUG-1: `holidayController` JSON-Cache → SQLite
- BUG-4: HTTP-Input-Validierung mit `zod`

---

## v1.1.0 — Meilenstein: Electron + SQLite + printToPDF
*26.–28. März 2026*

### Großmigrationen
- **JSON → SQLite:** 15 Tabellen, WAL-Mode, Foreign Keys, atomare Transaktionen
- **Browser-App → Electron Desktop:** macOS + Windows Unterstützung
- **Puppeteer → Electron printToPDF:** PDF ohne externer Chromium-Download

### Datenbankmigrationen
- Customer, Project, Document, Settings, Articles, Tags
- FiBu: Expenses, Mileage, ExternalInvoices
- Accounting: VatRates, DocumentNumbers
- System: AppVersion, BackupLog
- WAL-Mode für Concurrency, Foreign Keys aktiviert
- Atomic Writes für Datensicherheit

### SQLite-Backup & Restore
- `VACUUM INTO` für konsistente Backups ohne Sperren
- Restore unterstützt v1 (JSON) und v2 (SQLite) Formate
- Auto-Backup beim Server-Start
- Workspace-Konfiguration persistent in Electron userData
- IPC-Bridge für Workspace-Wechsel, App-Version, Native-Ordner-Öffnung
- Graceful Shutdown: HTTP-Server + DB sauber schließen

### PDF-Engine: Puppeteer → Electron printToPDF
- Puppeteer komplett entfernt (~150 MB Chromium-Download entfällt)
- PDF-Generierung läuft über Electron IPC: Frontend → Main Process → verstecktes BrowserWindow → `printToPDF`
- Alle 9 Print-Views haben jetzt sichtbare Toolbar mit "💾 PDF speichern" Button
- Kein Druckdialog mehr — PDFs werden direkt als Datei gespeichert
- Kopf-/Fußzeile werden von den Vue-Print-Views gerendert (position:fixed CSS)
- Seitenzahlen via CSS `counter(page)` / `counter(pages)`
- Auto-Trigger im Workflow (Vertrag verschicken etc.) speichert PDF direkt
- Settings, FiBu und ProjectDetail rufen PDF via IPC statt `window.open()` — kein neues Fenster nötig
- Neue Fenster erhalten automatisch das Preload-Script (Electron `setWindowOpenHandler`)

### Projekt-Bereinigung
- `server.js`, `src/`-Ordner im Root entfernt (Duplikate aus ZIP-Overlay)
- Legacy Update-System entfernt: `updateService.js`, `updateController.js`, `update.js`, `update-manifest.json`
- `models/`, `storage/` Ordner entfernt (ersetzt durch SQLite)
- `INTEGRATION_PLAN.md`, `README.txt`, `ROADMAP.txt` entfernt
- `cleanup-project.ps1`, `project-files.txt` aus Repo entfernt

### Install-Scripts
- Windows: BAT + PowerShell mit better-sqlite3 Build-Tool-Prüfung
- Mac: Bash mit Xcode CLI Tools Check
- Cleanup-Scripts für Altlasten-Bereinigung (Windows + Mac)

### Workspace-System
- Picker beim ersten Start: Wähle existierenden Workspace oder erstelle neuen
- Workspace-Daten in Electron userData (`~/Library/Application Support/pixframeworkspace/`)
- IPC-Commands für Workspace-Operationen

### Electron-Konfiguration
- `electron-builder` für Windows + macOS Distribution
- Signed DMG für macOS (notarized für Gatekeeper)
- NSIS Installer für Windows (mit Uninstaller)
- Menu-Bar mit App-Steuerung
- Graceful Shutdown mit Datenbank-Close

### Bekannte Einschränkungen
- `holidayController` schreibt noch direkt in JSON-Cache-Dateien (BUG-1)
- Node.js v24 hat keine better-sqlite3 Prebuilds (BUG-2, behoben in v1.1.1)

---

## v1.0.0-beta.2 — Kopf-/Fußzeile, Firmendaten, Nutzungsrechts-Referenz
*25. März 2026*

- Kopfzeile: Logo erscheint auf jeder Folgeseite (position:fixed, oben rechts) — alle 9 Druckansichten
- Fußzeile: 3-spaltig vereinheitlicht — Spalte 1: Name/Adresse/Website/E-Mail · Spalte 2: Bank/IBAN/BIC · Spalte 3: Steuernummer/Kleinunternehmer
- ContractPrint: fehlender Logo-Header nachgerüstet
- DsgvoPrint: Bug behoben — Header war in v-else-Zweig eingebettet und wurde nicht gerendert
- Firmendaten: Victoria Elisabeth Emanuel vorausgefüllt
- Einstellungen → Vertragswesen: Referenzkarte Einfache Nutzungsrechte mit Zuschlagstabelle ergänzt

---

## v1.0.1 — Fix: Druckränder
*24. März 2026*

**Druckränder aller Druckseiten korrigiert**
- `@page { margin: 14mm 18mm 20mm 18mm }` und `.a4 { padding: 14mm ... 30mm ... }` addierten sich — effektive Ränder waren bis zu 28 mm oben und 50 mm unten
- Fix: `@page { margin: 0 }` — Seitenränder werden ausschließlich über `.a4 padding` gesteuert (22 mm oben/unten, 20 mm links/rechts)
- Gilt für alle 9 Druckseiten: `DocumentPrint`, `ContractPrint`, `AddendumPrint`, `AdvPrint`, `AdvVertragPrint`, `AgbPrint`, `BlankContractPrint`, `DsgvoPrint`, `EarPrint`
- Browser-Druckbild entspricht jetzt dem Puppeteer-PDF-Export

---


## v1.0.0-beta.1 — Beta-Release: macOS-Fixes, Logo-Feedback, Dashboard-Version
*23. März 2026*

**macOS-Kompatibilität (vollständig auditiert)**
- `nodemon ^2.0.20` → `^3.1.0` — nodemon 2.x ist mit Node.js 18/20 inkompatibel
- `--exitcrash` Flag aus `mac/start-backend.sh` entfernt (in nodemon 3 nicht mehr vorhanden)
- `yauzl ^2.10.0` explizit in `package.json` eingetragen — bisher nur transitive Puppeteer-Abhängigkeit, fragil bei Updates
- `headless: 'new'` → `headless: true` in `pdfService.js` — `'new'` ist in Puppeteer 22 deprecated
- `install.sh`: Node.js-Mindestversion geprüft (≥ 18), bricht mit klarer Fehlermeldung ab
- `install.sh`: `chmod +x mac/*.sh` direkt am Anfang — Skripte sind nach ZIP-Entpacken ohne ausführbare Permissions
- `install.sh`: Hinweis auf macOS Gatekeeper und Puppeteer-Chromium-Download (~150 MB)
- `start-all.sh`: iTerm2-Unterstützung — erkennt automatisch ob iTerm2 läuft, öffnet dort neue Tabs

**Logo-Fehlerhinweis in Einstellungen**
- Beim Start der Einstellungen-Seite wird per `HEAD`-Request geprüft ob die Logo-Datei erreichbar ist
- Bei 404 (z.B. nach Neuinstallation ohne uploads-Ordner): roter Hinweis „Logo-Datei nicht gefunden — bitte neu hochladen"
- `settings.json` logoUrl wird dabei geleert damit das Formular sauber bleibt
- Kein stiller Fail mehr — Browser-Broken-Image entfällt

**Artikelnummer in Druckansichten**
- `item-sku` klebt nicht mehr direkt hinter dem Artikelnamen
- Eigene Zeile darunter: `Art.-Nr. ART-00001` in grauer 7pt-Schrift
- Gilt für alle Angebote und Rechnungen in `DocumentPrint.vue`

**Dashboard — Versionsnummer**
- Neue Versionsleiste am unteren Rand: `PixFrameWorkspace · v1.0.0-beta.1 · März 2026`
- Styled als dezenter Footer, monospace Badge

**Versionsschema ab jetzt: `MAJOR.MINOR.PATCH[-prerelease]`**
- `1.0.0-beta.1` = erste öffentlich weitergebbare Beta
- Nächste stabile Version: `1.0.0` wenn E-Mail-Versand und Electron-Migration abgeschlossen

---

## v232 — Vertragsreiter: NR-Daten aus Anfrage, Werbung entfernt
*März 2026*

- Chip „Werbung / Marketing" entfernt, nur noch Privatkunde / B2B / Kommerziell
- `usageType` initial aus `clientIsCompany` der Anfrage gesetzt
- Simple-Modus + designaustria-Modus für Nutzungsrechte
- NR-Zuschlag Fix (doppelte Berechnung behoben)
- Privat-Stunden: leistungsaufgeschlüsselt mit Bildpaket
- Angebot wird mit Anfrage-Positionen vorbefüllt
- NR-Artikelbeschreibung dynamisch pro Auftrag
- Bildpaket in Pauschal, Auto-Artikelsync, NR-Artikel ART-00012

---

## v221–v231 — Settings-Fixes, Kalkulator-Umstrukturierung
*März 2026*

- HTML-Warnings `<tr>` ohne `<tbody>` behoben
- Leistungen nach oben, B2B-Kalkulator leistungsgesteuert
- Neue Kalkulationsformel für B2B (additiv, nicht multiplikativ)
- Pauschal-Umbau, Rüstzeiten B2B
- Zwei NR-Modelle: Simple (MFM-basiert) + designaustria (Faktor-Multiplikation)

---

## v219–v220 — Artikelstamm-Neuaufstellung, B2B-Phasenkalkulator
*März 2026*

- 9 strukturierte Stammartikel (Foto/Video Stundensätze, km, Bildpreise)
- 4 Stundensätze in Einstellungen (Privat/B2B je Fotografie/Videografie)
- B2B-Phasenkalkulator mit Live-Kalkulation im Anfrageformular
- Rüstzeiten als eigene Artikelkategorie

---

## v218 — Settings-Umstrukturierung, Dashboard-Chart, Auftragsübersicht
*März 2026*

- Umsatz-Chart vor KPI-Kacheln verschoben
- Chip-Leiste mit Anfragedetails in Auftragsübersicht
- Fix: Logo wird in Einstellungen korrekt geladen (Deklarationsreihenfolge)

---

## v217 — Hamburger-Bugs + Nutzungsrechts-Kalkulator (designaustria)
*März 2026*

- Fix: Hamburger-Menü z-index Korrekturen
- Nutzungsrechts-Kalkulator nach designaustria-Modell
- 6 Faktor-Dimensionen mit Hover-Tooltips, Live-Formel-Anzeige

---

## v215–v216 — Mehrere Shooting-Termine, Eingangsrechnungen
*März 2026*

- BQ-6: Mehrere Shooting-Termine pro Auftrag (Haupt- + Zusatztermine)
- BQ-7: Externer Rechnungsimport (manuell + PDF-Ablage) im FiBu-Tab

---

## v213–v214 — Beta-Qualität BQ-1 bis BQ-5
*März 2026*

- BQ-1: FiBu Beleg-Vorschau (Thumbnails, PDF-Icon)
- BQ-2: Dashboard Umsatz-Chart (letzte 6 Monate)
- BQ-3: iCal-Export im Kalender (.ics)
- BQ-4: km-Pauschale aus Einstellungen
- BQ-5: DATEV CSV-Export
- Fix: DATEV enthielt nur Soll-Buchungen — Haben-Seite ergänzt

---

## v212 — Beta-Blocker BB-1 bis BB-6 behoben
*März 2026*

- BB-1: Path Traversal Fix in `zipUtils.extractZip()`
- BB-2: Atomare Schreiboperationen (`write-tmp + rename`)
- BB-3: `{minCopyrightDamage}` Placeholder → 300%
- BB-4: Race Condition in `nextNumber()` → atomarer Counter (`counters.json`)
- BB-5: `joi` Dependency entfernt
- BB-6: Settings-Cache + atomares Write

---

## v211 — Mac-Audit: CRLF, Script-Bugs, Permissions
*März 2026*

- CRLF-Zeilenenden in 6 Quelldateien entfernt
- `cp`-Argumente in `start-backend.sh` korrigiert (`.env` wurde überschrieben)
- `+x` Permissions für `mac/*.sh` dokumentiert
- `FRONTEND_URL` in `.env` ergänzt

---

## v208–v210 — Mac-Kompatibilität, plattformunabhängiges ZIP
*März 2026*

- `zipUtils.js`: reines Node.js, kein Shell-Aufruf, kein Binary
- `paths.js`: zentrale Pfad-Abstraktion für Windows + macOS
- Fix: `await extractZip()` (async/await-Bug)
- Fix: Angebot standardmäßig ausgeblendet (`skipQuote=true`)

---

## v199–v207 — PDF-Engine, Backup, Update-System
*März 2026*

- Puppeteer PDF-Engine (9 Endpunkte)
- Backup-System (ZIP, 10-Versionen-Rotation)
- Update-System (ZIP mit Manifest, Auto-Neustart)
- PDF A4-Fix: Margins, Footer, Seitenzahlen
- `emulateMediaType('print')`, grauer Hintergrund behoben

---

## v195 — Vollständiger Rechnungs-Workflow (GoBD-konform)
*März 2026*

- Korrekturrechnung (`KOR-`), Stornorechnung (`STORNO-`)
- v1/v2/v3-Badges, transitive Dokument-Zuordnung
- FiBu EAR: Korrekturen summiert, Ersetzte durchgestrichen

---

## v184–v194 — Architektur-Refactoring, Pipeline-UX
*März 2026*

- 5 Pinia Stores, ProjectDetail in 7 Sub-Komponenten
- Backend Layered Architecture
- Pipeline Auto-Open, `handlePipelineCall` async

---

## v173–v183 — DSGVO, FiBu-Modul, Dokumenten-Aktionen
*März 2026*

- FiBu: Einnahmen, Ausgaben mit Upload, Fahrtenbuch
- EAR-Ausdruck als A4-PDF
- Einheitliches Corporate Design aller Dokumente

---

## v93–v172 — Redesign, Leistungs-Features
*März 2026*

- Visuelles Redesign (TopBar, Theme-System)
- Leistungs-Chips (Foto, Video, Getting Ready, Danksagung)
- DSGVO-Blankoformular, ADV-Vertrag

---

## v76–v92 — Kalender, E-Mail-Infrastruktur
*März 2026*

- Kalender mit Feiertagen + Schulferien (16 Bundesländer)
- E-Mail-Infrastruktur (nodemailer, SMTP-Config)
- Lieferantenverwaltung

---

## v51–v75 — Pipeline, AGB, Rechtsdokumente
*März 2026*

- 7-Stufen-Pipeline
- AGB, DSGVO, ADV editierbar
- DSGVO-Blankoformular

---

## v23–v50 — Vertragswesen, Druckansichten
*März 2026*

- Vollständiger Fotovertrag (`ContractPrint.vue`)
- ADV, Blankovertrag, AGB als Druckseiten

---

## v0–v22 — Fundament & Stabilisierung
*06. März 2026*

- Vue 3 + Express + JSON-Speicher
- REST-API, Dokumenten-Workflow, Statusverwaltung
- Alle Grundbugs behoben (Phase 0)

---

## Meilenstein-Übersicht

| Meilenstein | Version | Datum |
|---|---|---|
| Erstes Grundgerüst | v0 | 06.03.2026 |
| Dokumenten-Workflow | v22 | 07.03.2026 |
| Vertragsgenerator | v50 | 07.03.2026 |
| Pipeline + Rechtsdokumente | v75 | 08.03.2026 |
| Kalender + E-Mail | v92 | 09.03.2026 |
| Redesign | v172 | 14.03.2026 |
| FiBu + DSGVO | v183 | 15.03.2026 |
| Architektur-Refactoring | v190 | 15.03.2026 |
| Rechnungs-Workflow GoBD | v195 | 16.03.2026 |
| PDF-Engine + API_BASE | v197 | 20.03.2026 |
| Backup + Update | v199 | 21.03.2026 |
| PDF A4-Fix | v203 | 21.03.2026 |
| Mac-Kompatibilität | v208 | 21.03.2026 |
| Beta-Blocker behoben | v212 | 22.03.2026 |
| Beta-Qualität abgeschlossen | v215 | 22.03.2026 |
| B2B-Kalkulator, NR-Modelle | v220 | 23.03.2026 |
| NR-Fixes, Angebotsprefill | v232 | 23.03.2026 |
| **Beta-Release** | **v1.0.0-beta.1** | **23.03.2026** |
| Druckränder-Fix | v1.0.1 | 24.03.2026 |
| Kopf-/Fußzeile | v1.0.0-beta.2 | 25.03.2026 |
| **SQLite + Electron + PDF** | **v1.1.0** | **26.–28.03.2026** |

---

*PixFrameWorkspace · v1.1.0 · März 2026*
