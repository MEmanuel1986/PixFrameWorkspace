# PixFrameWorkspace — Vollständiges Changelog

*Entwicklungsbeginn: 06. März 2026*

---

## v1.2.0-dev — PDF-Workspace, Pipeline-Buttons, Zahlungserfassung, Projektnummern

*02.–05. April 2026*

### System-Reset (geschützt durch Service-Passwort)

* Neuer API-Endpunkt `POST /api/reset/execute` — setzt Datenbank und Workspace auf Werkszustand zurück
* Neuer API-Endpunkt `POST /api/reset/validate` — prüft Service-Passwort ohne Reset
* Service-Passwort = heutiges Datum rückwärts (z.B. 05.04. → `4050`), täglich wechselnd
* Datenbank-Reset in einer Transaktion: löscht Kunden, Projekte, Dokumente, FiBu, Holiday-Cache
* Ein Demo-Kunde (K-00001, Marie Mustermann) wird automatisch angelegt
* Alle Counters werden zurückgesetzt (customer=1, Rest=0)
* Workspace-Ordner `auftraege/` und `buchhaltung/belege/` werden geleert
* **Behalten:** Settings (Firmendaten, Vertragstexte, AGB, DSGVO, ADV), Artikel, Schema-Version, Logo
* Frontend: Reset-Karte im System-Tab mit Warnhinweisen, Passwort-Eingabe und confirm-Dialog
* Vorher/Nachher-Statistik wird in der Erfolgsmeldung angezeigt
* Neue Dateien: `resetService.js`, `resetController.js`, `routes/reset.js`

### Dokumentenablage: Alle Dateien im Projektordner

* **AGB, DSGVO, ADV** werden beim Erstellen des Vertrags automatisch als PDF im Projektordner `vertraege/` abgelegt
* Frontend übergibt `projectId` als Query-Parameter an statische PDF-Routen (`/api/pdf/agb?projectId=xxx`)
* `resolveProjectContext()` in `workspace.js` erkennt jetzt AGB/DSGVO/ADV-Vertrag-Routen mit Projektbezug
* Neue Hilfsfunktion `extractQueryParam()` für URL-Query-Parameter-Extraktion
* **Hochgeladene unterschriebene Verträge** landen direkt im Projektordner `vertraege/` statt in `uploads/contracts/`
* **Hochgeladene unterschriebene Nachträge** ebenso im Projektordner `vertraege/`
* Alle Upload-Einträge speichern jetzt `absolutePath` für direkten Dateizugriff (rückwärtskompatibel mit Legacy-`url`-Feld)
* Download-/Löschhandler (`downloadSignedContract`, `deleteSignedContract`, `downloadSignedAddendum`, `deleteSignedAddendum`) nutzen `absolutePath` mit Fallback auf Legacy-`url`
* `projectController.js`: `resolveProjectFolder()`-Hilfsfunktion für Kunden- und Ordnernamen-Auflösung
* Doppelte Methoden-Definitionen in `projectController.js` bereinigt

### Buchhaltungsbelege im Workspace

* Neuer Workspace-Ordner `buchhaltung/belege/` fuer FiBu-Belege (Ausgaben, Eingangsrechnungen)
* `paths.js`: `BUCHHALTUNG_DIR` + `BUCHHALTUNG_BELEGE_DIR` als eigene Pfade, Auto-Erstellung beim Start
* `fibuService._saveReceiptFile()` speichert Belege nach `buchhaltung/belege/` statt `uploads/belege/`
* `app.js`: Neue statische Route `/buchhaltung` fuer Beleg-Auslieferung
* Rueckwaertskompatibel: Alte Belege unter `/uploads/receipts/` bleiben erreichbar

### PDF-Benennung & Unterordner-Logik

* `backend/src/routes/workspace.js` komplett neu: `resolveProjectContext()` gibt `standardFilename` + `subfolder` zurück
* Naming-Schema einheitlich:
  * Angebote: `Angebot_A-2026-04_00001_Mueller.pdf` → `dokumente/`
  * Rechnungen / Anzahlungsrechnungen / Storno / Korrektur → `dokumente/`
  * Verträge: `Vertrag_V-2026-04_00001_Mueller.pdf` → `vertraege/`
  * ADV: `ADV_Mueller.pdf` → `vertraege/`
  * Nachträge: `Nachtrag_N1_Mueller.pdf` → `vertraege/`
* `sanitizeForFilename()` + `buildCustomerLabel()` für sichere Dateinamen ohne Sonderzeichen
* `workspaceService.savePdfToProject()` akzeptiert optionalen `subfolder`-Parameter (Default: `dokumente`)
* GoBD-konform: Existierende Dateien werden nicht überschrieben, stattdessen Suffix `_v2`, `_v3`

### PDF im System-Viewer öffnen (statt Drucken/Herunterladen)

* `electron/preload.js`: neue IPC-Methode `generateAndOpenPDF(apiPath, options)`
* `electron/main.js`:
  * `savePdfToProjectFolder()` gibt jetzt den absoluten Pfad zurück
  * Neuer IPC-Handler `generate-and-open-pdf`: erzeugt → speichert → öffnet via `shell.openPath()`
  * Fallback ohne Projektbezug: temp-Datei in `os.tmpdir()`
* `ProjectDetail.vue`: zentrale Funktion `openPdfInViewer(apiPath)` — Electron → Viewer, Fallback → Browser-Preview
* Alle betroffenen Funktionen umgestellt: `openDocPrint`, `printQuote`, `downloadQuote`, `openContractPrint`, `printContract`, `downloadContract`, `openAdvPrint`, `openAddendumPrint`, `printAddendum`, `downloadAddendum`
* 4 Pipeline-Komponenten: alle „📥 Drucken / Herunterladen"-Buttons umbenannt zu „📂 Öffnen"
  * `ProjectPipelineAngebot.vue`: 1 Stelle
  * `ProjectPipelineAnzahlung.vue`: 2 Stellen
  * `ProjectPipelineVertrag.vue`: 3 Stellen
  * `ProjectPipelineAbrechnung.vue`: 2 Stellen
* Status wird beim Öffnen automatisch gesetzt: Angebote → Versendet, Verträge → Verschickt

### Zahlungserfassung ausgebaut

* Popup mit Pflichtfeldern Zahlungsdatum + Zahlungsart
* Zahlungsinfo als grüner Badge direkt in der Rechnungszeile
* Backend (`documentService`, `documentController`) persistiert `paidAt` + `paymentMethod`

### Zahlungsarten konfigurierbar

* „Kreditkarte" entfernt
* Einstellungen → Buchung: neue Karte „Zahlungsarten" mit Checkbox-Chips
* Verfügbar: Überweisung, Bar, PayPal, SEPA-Lastschrift, Vorkasse
* Payment-Popup liest aktive Methoden dynamisch aus `settingsData.bookingTerms.enabledPaymentMethods`

### Inhabername im Fußtext aller Dokumente

* Alle 6 Druckseiten (`DocumentPrint`, `ContractPrint`, `AddendumPrint`, `AgbPrint`, `AdvPrint`, `BlankContractPrint`): `v-if="owner !== name"`-Bedingung entfernt → `Inh. {{ settings.company.owner }}` wird immer angezeigt

### Pipeline-Reiter Verbesserungen

* Abrechnung-Panel komplett neu (iqf-Layout): lila Header mit Live-Betrag, Auftragsübersicht-Sidebar, editierbare Positionsliste, Übernahme aus Angebot/Vertrag per Button, Anzahlung als negative Position, Anfahrt-Schnelleingabe, Artikelkatalog-Picker
* Vorgespräch-Panel mit Auftragsübersicht (gleiches qo-Layout). Notizen landen mit Zeitstempel und Label `💬 Vorgespräch · Datum` in der Notizen-Kachel
* Aktives Angebot immer oben (Sort: `!supersededBy` → Version DESC → createdAt DESC)
* Angebotsformular startet leer — kein Auto-Prefill mehr aus Stundensatz/Pauschalpreis
* Rechnungsadresse standardmäßig eingeklappt, zeigt Hinweis `(falls abweichend vom Kunden)`
* USt.-Spalte wird bei §19-Kleinunternehmer ausgeblendet (`v-if="!isSmallBusiness"` auf `<th>` + `<td>`)
* Notizen-Modal: Breite `min(70vw, 900px)`, Höhe `min(70vh, 900px)`, wächst mit dem Inhalt

### Nummernkreis für Projekte (Projektnummer)

* Neuer Nummernkreis `project` mit Default-Format `Proj-{jjjj}-{mm}/{z,5}`
* `schema.sql`: Spalte `project_number TEXT` in `projects`-Tabelle + Index `idx_projects_number`
* DB-Schema-Version v1→v2: Migration fügt Spalte + Counter per `ALTER TABLE` hinzu
* `projectService.js`: Projektnummer wird bei `createProject()` atomar via `counterService.next('project')` generiert
* `projectService.js`: eigene `_buildNumber()`-Methode für Format-Platzhalter-Ersetzung
* Workspace-Ordnername ist jetzt die Projektnummer statt der Project-ID (z.B. `auftraege/K-00001/Proj-2026-04_00001/`)
* `workspace.js`: `getProjectFolderKey()` für rückwärtskompatible Ordnerauflösung (alte Projekte behalten ID-basierte Ordner)
* `Settings.vue`: Nummernkreis „Projektnummer“ in Einstellungen → Nummernkreise als erstes Schema unter „Dokumente“ sichtbar

### Bugfixes

* „Auftrag nicht gefunden": `watch(pipelineOpen,…)` stand vor der `ref()`-Deklaration → Temporal Dead Zone → ReferenceError → `setup()` crashtete. Fix: Watch nach `pipelineOpen`-Deklaration verschoben
* Anzahlungsrechnung 19 % USt. trotz §19-Kleinunternehmer: `openDepositInvoice()` hatte `taxRate: 19` zweimal hardcodiert → jetzt `isSmallBusiness.value ? 0 : 19`
* Anfrage-Notizen wanderten nicht in die Kachel: Bedingung `rawNotes !== project.value.notes` entfernt
* CSS-Grid: `order` hat in Grid-Layouts keinen Effekt (nur Flexbox) → Fix: explizite `grid-column`-Zuweisung auf Sidebar und Main, `overflow: hidden` auf `.qo-body`

---

## v1.1.1 — Hotfixes, Cleanup & E-Mail fertiggestellt

*01. April 2026*

### Fixes & Aufräumen

* `project-files.txt` aus Repository entfernt (→ noch offen, BUG-11)
* `multer` Dependency entfernt — nicht genutzt, `express-fileupload` übernimmt alle Uploads
* Versionsnummer im Health-Endpoint (`/api/health`) wird jetzt dynamisch aus `package.json` gelesen statt hardcoded

### E-Mail-Infrastruktur fertiggestellt

* `SendEmailModal.vue` vollständig implementiert: Empfänger, Betreff, Freitext, PDF-Anhang per Base64
* `DocumentDetailModal.vue` bindet `SendEmailModal` ein — Dokumente direkt aus dem Detail-Dialog versendbar
* `emailService.js` + `emailController.js` + Route `/api/email/send|test|config` vollständig implementiert
* SMTP-Tab in Einstellungen konfigurierbar: Host, Port, SSL/STARTTLS, Benutzer, Passwort, Absendername
* Test-Mail-Button funktioniert (speichert Einstellungen vor dem Testen automatisch)
* E-Mail-Text wird automatisch mit Kundenanrede, Dokumentnummer und Projektname vorausgefüllt
* SMTP-Status-Check beim Öffnen des Modals: zeigt Hinweis wenn nicht konfiguriert

### Noch offen nach v1.1.1

* `mac/install.sh` hat noch keinen Node-v24-Versionscheck (nur Windows `install.ps1` hat diesen)
* App-Icons unvollständig: `icon.icns` (macOS) und `icon.png` (Linux) fehlen → `npm run build` schlägt auf diesen Plattformen fehl
* Settings-SMTP-Tab zeigt noch „coming soon"-Hinweistext trotz funktionierender Implementierung

---

## v1.1.0 — SQLite-Migration, Electron-Shell, Electron PDF-Engine

*26.–28. März 2026*

### Datenbank: JSON → SQLite

* Gesamte Datenhaltung von JSON-Dateien auf SQLite (better-sqlite3) migriert
* 15-Tabellen-Schema mit WAL-Mode, Foreign Keys, Indizes
* Einmalige JSON→SQLite Migration beim ersten Start (transaktional, mit Rollback-Schutz)
* JSON-Originaldaten werden automatisch nach `data/_migrated_json/` archiviert
* BaseRepository: Generische CRUD-Basis mit camelCase↔snake_case Konvertierung, Prepared-Statement-Cache, Spalten-Whitelist
* Alle 9 Services auf SQLite umgestellt — Controller und Routes bleiben unverändert

### Standardartikel-System

* 17 Standardartikel beim DB-Init automatisch angelegt (Seed-System), löschgeschützt
* Artikelpreise synchronisieren sich automatisch mit Einstellungen (bookingTerms)
* Kilometergutschrift (`art-km-minus`) wird automatisch als negativer Wert der Pauschale gesetzt

### Electron Desktop-App

* Vue-Frontend + Express-Backend in Electron-Shell gekapselt
* Dev-Modus: Electron öffnet nur ein Fenster (kein Native-Module-Konflikt)
* Prod-Modus: Express läuft im Electron-Prozess, Vue-Build wird ausgeliefert
* Frei wählbarer Workspace-Ordner beim ersten Start (kein AppData-Zwang)
* IPC-Bridge für Workspace-Wechsel, App-Version, Native-Ordner-Öffnung
* Graceful Shutdown: HTTP-Server + DB sauber schließen

### Workspace-Dateisystem

* Automatische Ordnerstruktur pro Projekt: `auftraege/K-00001/projects_xxx/dokumente|vertraege|medien|korrespondenz`
* `workspaceService.js`: PDF-Ablage, Dateilisting, Projektordner-Init
* Route `/api/workspace/info|project-files|save-pdf`
* Generierte PDFs werden automatisch im Projektordner gespeichert

### Backup-System

* SQLite-Backup via VACUUM INTO (konsistente Kopie ohne Sperren)
* Restore unterstützt v1 (JSON) und v2 (SQLite) Formate
* Auto-Backup beim Serverstart

### PDF-Engine: Puppeteer → Electron printToPDF

* Puppeteer komplett entfernt (~150 MB Chromium-Download entfällt)
* PDF-Generierung läuft über Electron IPC → verstecktes BrowserWindow → `printToPDF`
* Alle 9 Print-Views mit „💾 PDF speichern" Toolbar-Button
* Kopf-/Fußzeile gerendert via `position:fixed` CSS, Seitenzahlen via `counter(page)`
* PDFs werden automatisch im Projektordner abgelegt

### Holiday-Cache

* `holidayController.js` nutzt SQLite-Tabelle `holiday_cache` vollständig via `databaseService.db`
* Kein JSON-Filesystem-Zugriff mehr im gesamten Backend

### Install-Scripts

* Windows: BAT + PowerShell mit better-sqlite3 Build-Tool-Prüfung, Node-v24-Warnung
* Mac: Bash mit Xcode CLI Tools Check

---

## v1.0.0-beta.2 — Kopf-/Fußzeile, Firmendaten, Nutzungsrechts-Referenz

*25. März 2026*

* Kopfzeile mit Logo auf jeder Folgeseite — alle 9 Druckansichten
* Fußzeile 3-spaltig: Name/Adresse/Website · Bank/IBAN/BIC · Steuernummer/Kleinunternehmer
* ContractPrint: fehlender Logo-Header nachgerüstet
* DsgvoPrint: Header-Rendering-Bug behoben (war in v-else-Zweig eingebettet)
* Referenzkarte Einfache Nutzungsrechte mit Zuschlagstabelle in Einstellungen

---

## v1.0.1 — Fix: Druckränder

*24. März 2026*

* `@page { margin: 0 }` — Seitenränder ausschließlich über `.a4 padding` (22 mm oben/unten, 20 mm links/rechts)
* Gilt für alle 9 Druckseiten

---

## v1.0.0-beta.1 — Beta-Release: macOS-Fixes, Logo-Feedback, Dashboard-Version

*23. März 2026*

* macOS-Kompatibilität vollständig auditiert (nodemon 3, iTerm2-Support, Node-Check)
* Logo-Fehlerhinweis bei 404 statt stillem Broken Image
* Artikelnummer in Druckansichten auf eigener Zeile
* Dashboard-Versionsnummer als Footer-Badge

---

## v213–v232 — Beta-Qualitätsziele, B2B-Kalkulator, NR-Modelle

*März 2026*

* BQ-1: FiBu Beleg-Vorschau (Thumbnails, PDF-Icon)
* BQ-2: Dashboard Umsatz-Chart (letzte 6 Monate, bezahlte Rechnungen)
* BQ-3: iCal-Export im Kalender (.ics)
* BQ-4: km-Pauschale aus Einstellungen
* BQ-5: DATEV CSV-Export (SKR03, UTF-8 mit BOM)
* BQ-6: Mehrere Shooting-Termine pro Auftrag
* BQ-7: Eingangsrechnungsimport im FiBu-Tab
* B2B-Phasenkalkulator mit Live-Kalkulation
* Zwei NR-Modelle: Simple (MFM-basiert) + designaustria (Faktor-Multiplikation)
* Angebot wird mit Anfrage-Positionen vorbefüllt

---

## v212 — Beta-Blocker BB-1 bis BB-6 behoben

*März 2026*

* BB-1: Path Traversal Fix
* BB-2: Atomare Schreiboperationen
* BB-3: `{minCopyrightDamage}` Placeholder → 300%
* BB-4: Race Condition in `nextNumber()` → atomarer Counter
* BB-5: `joi` entfernt
* BB-6: Settings-Cache + atomares Write

---

## v173–v211 — Architektur, FiBu, Mac-Kompatibilität, PDF-Engine

*März 2026*

* Layered Backend-Architektur (routes → controllers → services → storage)
* 5 Pinia Stores, ProjectDetail in 7 Sub-Komponenten
* FiBu: Einnahmen, Ausgaben mit Upload, Fahrtenbuch, EAR-PDF
* Puppeteer PDF-Engine (9 Endpunkte)
* Backup-System (ZIP, 10-Versionen-Rotation)
* plattformunabhängiges ZIP (reines Node.js, kein Shell-Aufruf)
* zentrale Pfad-Abstraktion `paths.js` für Windows + macOS

---

## v195 — Vollständiger Rechnungs-Workflow (GoBD-konform)

*März 2026*

* Korrekturrechnung (`KOR-`), Stornorechnung (`STORNO-`)
* v1/v2/v3-Badges, transitive Dokument-Zuordnung

---

## v156–v172 — Pipeline-Reiter, Notizen-System, Kundenauswahl

*März 2026*

* NewAnfrageModal: Suchfeld sticky, Live-Zähler, Tastaturnavigation (↑↓ Enter), Avatar-Chips
* `NewAnfragePage.vue` als eigenständige Route `/projects/new?customerId=xxx`
* ProjectDetail Hero-Banner: Live-Daten-Update via `update:live`-Emit, Datum/Uhrzeit getrennt mit Icons
* Location-Datalist: 17 Vorschläge für MV/Rostock (Studio, Warnemünde Strand, Schloss Gelbensande, Rügen usw.)
* Notizen-Logik bereinigt: timestamped Einträge mit Source-Badge (💬 Vorgespräch, Anfrage)
* Vorgespräch-Panel und Abrechnung-Panel in iqf/qo-Layout integriert

---

## v0–v155 — Fundament, Redesign, Leistungs-Features

*06.–14. März 2026*

* Vue 3 + Express + JSON-Speicher, REST-API, Dokumenten-Workflow
* 7-Stufen-Pipeline, AGB/DSGVO/ADV editierbar
* Visuelles Redesign (TopBar, Theme-System)
* Kalender mit Feiertagen + Schulferien (16 Bundesländer)
* E-Mail-Infrastruktur (nodemailer, SMTP-Config)
* Leistungs-Chips (Foto, Video, Getting Ready, Danksagung)

---

## Meilenstein-Übersicht

| Meilenstein | Version | Datum |
|---|---|---|
| Erstes Grundgerüst | v0 | 06.03.2026 |
| Vertragsgenerator | v50 | 07.03.2026 |
| Kalender + E-Mail-Infra | v92 | 09.03.2026 |
| Redesign | v172 | 14.03.2026 |
| FiBu + DSGVO | v183 | 15.03.2026 |
| Rechnungs-Workflow GoBD | v195 | 16.03.2026 |
| Beta-Blocker + BQ-Ziele | v215 | 22.03.2026 |
| B2B-Kalkulator, NR-Modelle | v232 | 23.03.2026 |
| **Beta-Release** | **v1.0.0-beta.1** | **23.03.2026** |
| Druckränder-Fix | v1.0.1 | 24.03.2026 |
| Kopf-/Fußzeile | v1.0.0-beta.2 | 25.03.2026 |
| **SQLite + Electron + PDF** | **v1.1.0** | **26.–28.03.2026** |
| **Hotfixes + E-Mail fertig** | **v1.1.1** | **01.04.2026** |
| PDF-Workspace + Zahlungserfassung + Pipeline-UI + Projektnummern | **v1.2.0-dev** | **02.–05.04.2026** |

---

*PixFrameWorkspace · v1.2.0-dev · April 2026*
