# PixFrameWorkspace — Roadmap & offene Punkte

*Stand: v1.3.0-dev · 09. April 2026*
*Stack: Vue 3 + Pinia + Vite · Electron 30 · Node.js + Express · SQLite (better-sqlite3)*

---

## 📊 Aktueller Zustand

**v1.1.1 ist produktionsreif für Einzelnutzung. v1.3.0-dev ist aktiv in Entwicklung (Refactoring).**

Fünf große Migrationen abgeschlossen:
- ✅ JSON → SQLite (15 Tabellen, WAL-Mode, Foreign Keys, Indizes)
- ✅ Browser-App → Electron-Desktop (Workspace-Picker, Auto-Backup)
- ✅ Puppeteer → Electron `printToPDF` (alle 9 Print-Views)
- ✅ PDF-Benennung & Workspace-Unterordner (dokumente/ vs. vertraege/)
- ✅ Settings.vue Refactoring → 13 Tab-Komponenten + Pinia Store (v1.3.0-dev)

E-Mail-Versand teilweise implementiert:
- ✅ Backend: `emailService.js`, Route `/api/email/send|test|config`
- ✅ Frontend: `SendEmailModal.vue` vollständig, in `DocumentDetailModal` eingebunden
- ✅ SMTP-Konfiguration + Test-Mail in Einstellungen
- 🚧 Versand-Status in Dokumentenliste fehlt noch
- 🚧 E-Mail direkt aus Pipeline-Stufen fehlt noch
- 🚧 „Coming soon"-Banner in Settings noch nicht entfernt

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| 🔴 | **KRITISCH** — Datenverlust oder Sicherheitsleck möglich |
| 🟠 | Hoch — Alltagsnutzung beeinträchtigt |
| 🟡 | Mittel — störend, aber umgehbar |
| 🟢 | Niedrig — kosmetisch, kein Blockercharakter |
| ✅ | Erledigt |
| 🚧 | In Arbeit / teilweise fertig |

---

## 🐛 Offene Bugs

### 🟠 BUG-4 — Fehlende Input-Validierung (HTTP-Level)

**Status:** OFFEN

Es gibt kein Validierungs-Framework auf API-Ebene. Ungültige Daten können direkt in die Datenbank gelangen (z.B. fehlerhafte E-Mail-Adressen, String statt Zahl bei Beträgen, null bei Pflichtfeldern).

**Fix:** `zod` einführen + pro Route ein Validierungs-Schema:

```javascript
const customerSchema = z.object({
  firstName: z.string().min(1),
  email:     z.string().email(),
});
app.post('/api/customers', (req, res) => {
  const result = customerSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.issues });
  ...
});
```

**Aufwand:** ~1 Tag · **Priorität:** v1.2.0

---

### 🔴 BUG-16 — Dokumente werden nicht persistent abgelegt bei "Speichern"

**Status:** OFFEN

Beim Klick auf "Speichern" oder "Neue Version" in den Pipeline-Stufen Angebot/Vertrag/Abrechnung wird das Dokument nur im Vue-State angezeigt, aber nicht als PDF im Workspace-Ordner abgelegt. Erst beim Klick auf "Öffnen" wird die PDF tatsächlich generiert und gespeichert.

**Erwartung:** "Speichern" muss die PDF sofort im Projektordner ablegen und den Status von Entwurf auf Gespeichert ändern.

**Ursache:** Der Speicher-Handler ruft vermutlich nicht `savePdfToProjectFolder` auf, sondern nur den DB-Eintrag. PDF-Erzeugung ist nur an den Öffnen-Button gekoppelt.

**Aufwand:** ~4h · **Priorität:** v1.2.0 (Critical — Datenverlust-Risiko)

---

### 🔴 BUG-17 — "Öffnen"-Button erstellt neues Dokument statt bestehendes zu laden

**Status:** OFFEN

Beim Klick auf "Öffnen" eines bestehenden Dokuments (z.B. Angebot AG-2026-001) wird ein neues Dokument mit neuer Nummer erstellt statt das bestehende zu öffnen. Führt zu Duplikaten und unnötig hochgezählten Nummernkreisen.

**Ursache:** Der Öffnen-Button nutzt vermutlich denselben `generateDocument()`-Pfad wie "Speichern" statt ein `fetchDocument()` / `openExistingPdf()`.

**Aufwand:** ~4h · **Priorität:** v1.2.0 (Critical — Nummern-Duplikate)

---

### 🟠 BUG-18 — Vorgespräch-Termine synchronisieren nicht mit dem Kalender

**Status:** OFFEN

Termine aus dem Vorgespräch-Reiter (`consultation.date`) erscheinen nicht in der Kalender-View. Die Daten werden korrekt in der DB gespeichert, aber `Calendar.vue` → `allEvents` mappt nur `proj.booking` und `proj.deliveryDate` — das Vorgespräch-Datum wird nie ausgelesen.

**Fix:** In `Calendar.vue` `allEvents` computed einen Block für `proj.consultationDate` ergänzen (analog zum Booking-Block).

**Aufwand:** ~1h · **Priorität:** v1.2.0

---

### 🟡 BUG-19 — Auftragsübersicht im Angebot-Reiter: Layout-Anpassung

**Status:** OFFEN

Die Auftragsübersicht (Sidebar) steht im Angebot-Reiter links, soll aber nach rechts verschoben werden. Reine CSS-Änderung (`order`-Property auf `.qo-sidebar` und `.qo-main`).

**Aufwand:** ~30min · **Priorität:** v1.2.0

---

### 🟡 BUG-20 — PDFs öffnen sich im Browser statt im System-PDF-Reader (prüfen)

**Status:** OFFEN — Prüfen ob bereits durch v1.2.0-dev `generate-and-open-pdf` IPC behoben

PDFs sollen sich beim Klick auf "Öffnen" im Betriebssystem-Standard-PDF-Reader öffnen, nicht im Electron-internen Browser-Viewer. `shell.openPath()` wurde in v1.2.0-dev implementiert, aber möglicherweise nicht an allen Stellen angebunden.

**Aufwand:** ~1h (Verifizierung + ggf. restliche Stellen migrieren) · **Priorität:** v1.2.0

---

### 🟢 BUG-21 — Korrespondenz-Ordner und UI-Kacheln aus "Bearbeitungen" entfernen

**Status:** OFFEN — ⚠️ Widerspricht F-11 (Korrespondenz-Reiter ausbauen). Entscheidung: F-11 streichen oder BUG-21 verwerfen?

Im Bearbeitungen-Reiter werden Korrespondenz-Kacheln angezeigt, die nicht genutzt werden. Cleanup-Aufgabe.

**Aufwand:** ~1h · **Priorität:** v1.2.0

---

### 🟡 BUG-8 — Settings-SMTP-Tab zeigt "coming soon"-Banner

**Status:** OFFEN

Der SMTP-Tab zeigt noch den Text „Die SMTP-Anbindung wird in einer kommenden Version aktiviert", obwohl die Implementierung vollständig ist. Verwirrend für Nutzer.

**Fix:** Banner-Text in `SettingsTabEmail.vue` entfernen (`.s-coming-soon-banner` Block).

**Aufwand:** 5 Minuten · **Priorität:** v1.1.2 Hotfix

---

### 🟡 BUG-9 — mac/install.sh fehlt Node-v24-Check

**Status:** OFFEN

`windows/install.ps1` warnt bei Node v24+ (kein better-sqlite3 Prebuild). `mac/install.sh` hat diesen Check nicht.

**Fix:** In `mac/install.sh` ergänzen:
```bash
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -ge 24 ]; then
  echo "⚠️  Node.js v$NODE_MAJOR ist sehr neu. Empfohlen: v22 LTS"
fi
```

**Aufwand:** 10 Minuten · **Priorität:** v1.1.2

---

### 🟢 BUG-10 — App-Icons unvollständig

**Status:** OFFEN — `npm run build` schlägt auf macOS und Linux fehl

Vorhanden: `assets/icon.ico` (Windows)
Fehlend: `assets/icon.icns` (macOS), `assets/icon.png` (Linux 512×512)

**Fix:** Icons erstellen (Tool: https://www.electron.build/icons)

**Aufwand:** 20 Minuten · **Priorität:** v1.1.2

---

### 🟢 BUG-11 — project-files.txt noch im Repository

**Status:** OFFEN — in v1.1.1 als erledigt dokumentiert, Datei ist aber noch im Repo vorhanden (bestätigt via GitHub)

**Fix:** `git rm project-files.txt && git commit`

**Aufwand:** 1 Minute · **Priorität:** nächster Commit

---

### 🟢 BUG-12 — README.md auf GitHub zeigt veralteten Stand (v1.0.0-beta.1)

**Status:** OFFEN — GitHub-README beschreibt noch Puppeteer, JSON-Speicher, alte Projektstruktur und alte Schnellstart-Anleitung

**Fix:** Aktualisiertes README.md ins Repository pushen

**Aufwand:** bereits erledigt (Datei liegt vor), nur noch `git push` · **Priorität:** nächster Commit

---

### 🟡 BUG-13 — Medienimport-Reiter (Bearbeitungs-Timeline) unvollständig

**Status:** OFFEN — Reiter ist angelegt, Kernfunktionalität fehlt

Der SD-Karten-Import / Bearbeitungs-Timeline-Reiter wurde bei der Entwicklung durch einen Vite-SFC-Compiler-Fehler (Template-Code nach `</style>`) ausgeblendet. Grundstruktur existiert, aber folgende Funktionen sind nicht implementiert:

- Importierte Mediendateien anzeigen (Thumbnail-Grid aus Workspace-Ordner `medien/`)
- Bearbeitungsschritte mit Zeitstempel protokollieren (Status: Roh / In Bearbeitung / Fertig / Ausgeliefert)
- Dateianzahl-Badge am Reiter-Tab
- Verknüpfung mit `workspaceService` (Listing aus `medien/`-Unterordner)

**Aufwand:** ~1–2 Tage · **Priorität:** v1.2.0

---

### ✅ BUG-14 — ADV/DSGVO nicht am Projekt gespeichert

**Status:** ERLEDIGT (v1.2.0-dev, 05.04.2026)

ADV, DSGVO und AGB werden jetzt beim ersten Vertragsspeichern automatisch als PDFs im Projektordner `vertraege/` abgelegt. `resolveProjectContext()` erkennt statische PDF-Routen mit `?projectId=`-Query-Parameter. Hochgeladene unterschriebene Verträge und Nachträge landen ebenfalls direkt im Projektordner `vertraege/` statt in `uploads/contracts/`.

---

### 🟡 BUG-15 — Abschluss-Reiter ohne Funktion

**Status:** OFFEN

Der letzte Pipeline-Schritt „Abschluss" hat noch keinen strukturierten Inhalt. Geplante Inhalte:

- Checkliste: Alle Zahlungen eingegangen? Alle Dateien ausgeliefert? Vertrag unterschrieben zurück?
- „Auftrag abschließen"-Button mit Status-Wechsel und Archivierungs-Hinweis
- Optionale Abschluss-Notiz / Bewertung

**Aufwand:** ~0.5 Tage · **Priorität:** v1.2.0

---

## 🛠️ Technische Schulden

### 🔴 TD-1 — Zero Tests (0% Abdeckung)

Mit BaseRepository-Pattern und SQLite ist die Infrastruktur gut für Tests geeignet. Ohne Tests ist jede Refactoring-Runde blind.

**Priorisierte Testreihenfolge:**
1. `BaseRepository` — In-Memory SQLite (`:memory:`), CRUD, Locking (~4-6h)
2. `documentService` — Nummernvergabe, Storno, GoBD-Compliance (~3-4h)
3. `fibuService` — Buchungslogik, DATEV-Export-Format (~2-3h)
4. `emailService` — SMTP-Mock, Payload-Validierung (~1-2h)
5. `workspaceService` — Dateinamens-Logik, Unterordner-Routing (~1h)

**Tools:** vitest, better-sqlite3 `:memory:` mode

**Aufwand:** ~3-4 Tage für 70% Abdeckung · **Priorität:** v1.2.0

---

### 🟠 TD-2 — God-Files im Frontend

| Datei | Zeilen (ca.) | Problem |
|---|---|---|
| `ProjectDetail.vue` | ~4.700+ | Gesamte Projektlogik, Workspace, PDF, Pipeline-Hooks in einer Datei |
| `Settings.vue` | ~3.200 | 12+ Tabs als Monolith |
| `NewProjectForm.vue` | ~1.400 | B2B-Kalkulator + Formular vermischt |
| `ProjectPipelineVertrag.vue` | ~1.700 | Vertragslogik größer als viele Apps |

**Fortschritt:**
- ✅ `Settings.vue` (~3.200 Z.) → 13 Tab-Komponenten + Pinia Store (v1.3.0-dev, 09.04.2026)
- 🚧 `ProjectDetail.vue` (~4.700 Z.) — nächste Phase

**Nicht testbar, kaum reviewbar, Regressionrisiko bei jeder Änderung.**

**Aufwand:** ~2-3 Tage pro Datei · **Priorität:** v1.3.0

---

### 🟠 TD-3 — Kein ESLint / Prettier

Inkonsistente Code-Style zwischen Dateien. Kein automatisches Formatting.

**Fix:**
```bash
npm install -D eslint @eslint/js eslint-plugin-vue prettier eslint-config-prettier
```

**Aufwand:** ~2 Stunden · **Priorität:** v1.2.0

---

### 🟠 TD-4 — Git-Workflow: 4 Commits für komplette Entwicklung

Keine Feature-Branches, keine aussagekräftigen Commit-Messages, keine Tags. Das GitHub-Repository ist faktisch ein reines Backup.

**Empfehlung ab sofort:**
- Feature-Branches: `feature/email-versand`, `fix/bug-8-smtp-banner`
- Conventional Commits: `fix(settings): remove coming-soon banner from SMTP tab`
- Tags für jede Version: `git tag v1.1.1`
- Regelmäßige Pushes — nicht nur nach großen Milestones

**Aufwand:** 0h (nur Gewohnheit) · **Priorität:** ab sofort

---

### 🟡 TD-5 — Duplizierter `buildNumber()`-Code

Identische Logik in `documentService.js` (`_buildNumber()`) und `projectController.js` (`buildNumber()`).

**Fix:** `backend/src/utils/numberUtils.js` extrahieren + überall importieren.

**Aufwand:** 30 Minuten · **Priorität:** v1.1.2

---

### 🟢 TD-6 — `.env.example` hat veralteten Kommentar

```
# URL des Vue-Dev-Servers (für Puppeteer PDF-Rendering)
FRONTEND_URL=http://localhost:5173
```

Puppeteer ist längst entfernt. Kommentar ist irreführend.

**Fix:** Kommentar auf `# Electron PDF-Renderer` aktualisieren.

**Aufwand:** 1 Minute · **Priorität:** nächster Commit

---

### 🟡 TD-7 — Internes Logging fehlt

Kein strukturiertes Logging im Backend (nur `console.log`). Bei Produktionsproblemen ist Debugging schwierig.

**Geplant:**
- `winston` oder `pino` einführen (JSON-Logging, Log-Level, Datei-Output)
- Log-Rotation (tägliche Dateien, max. 7 Tage)
- Frontend-Fehler via IPC in Electron-Log-Datei schreiben (nutzt `electron-log`)
- Log-Viewer in Einstellungen → System (letzte 200 Zeilen)

**Aufwand:** ~1 Tag · **Priorität:** v1.2.0

---

### 🟡 TD-8 — Kein internes Testsystem / Dev-Modus-Helfer

Für manuelle QA und Entwicklung fehlen:
- Seed-Daten für realistische Testprojekte (Button in Dev-Modus: „Testdaten einspielen")
- ✅ ~~Reset-Funktion für Testzwecke~~ → System-Reset mit Service-Passwort in Einstellungen → System implementiert (v1.2.0-dev)
- Health-Dashboard in Einstellungen → System (DB-Größe, Tabellenzeilen, letztes Backup, SMTP-Status)

**Aufwand:** ~0.5 Tage · **Priorität:** v1.2.0

---

## ✨ Feature-Roadmap

### 🚧 F-1 — E-Mail-Versand vollständig integrieren (v1.2.0)

**Status: ~85% fertig**

Fertig: Backend, `SendEmailModal`, Einbindung in `DocumentDetailModal`, SMTP-Config + Test.

**Noch fehlend:**
- „Coming soon"-Banner in Settings entfernen (BUG-8, 5 Min)
- Versand-Status in Dokumentenliste anzeigen (gesendet / nicht gesendet / Datum)
- E-Mail-Versand direkt aus `ProjectDetail` Pipeline-Stufen (Angebot versenden, Rechnung senden)
- E-Mail-Log pro Projekt (welche Mails wann an wen gesendet)

**Aufwand:** ~0.5–1 Tag

---

### 🚧 F-2 — Bearbeitungs-Reiter / Medienimport fertigstellen (v1.2.0)

**Status:** Struktur vorhanden, Funktion fehlt (→ auch BUG-13)

- Thumbnail-Grid aus `medien/`-Workspace-Ordner
- Bearbeitungsstatus je Datei / Charge (Roh → In Bearbeitung → Fertig → Ausgeliefert)
- Import-Protokoll mit Zeitstempeln
- Dateianzahl-Badge am Tab

**Aufwand:** ~1–2 Tage

---

### 🚧 F-3 — Abschluss-Reiter fertigstellen (v1.2.0)

**Status:** Tab existiert, Inhalt fehlt (→ auch BUG-15)

- Abschluss-Checkliste (Zahlungen, Dateilieferung, Vertragsrücklauf)
- „Auftrag abschließen"-Aktion mit Status-Wechsel
- Abschluss-Notiz / Sternebewertung intern

**Aufwand:** ~0.5 Tage

---

### ✅ F-4 — ADV/DSGVO projektbezogen speichern (v1.2.0)

**Status:** ERLEDIGT (v1.2.0-dev, 05.04.2026)

Beim Erstellen eines Vertrags werden AGB, DSGVO und ADV automatisch als projektbezogene PDFs im `vertraege/`-Ordner abgelegt. Hochgeladene unterschriebene Verträge und Nachträge landen ebenfalls im Projektordner. → Siehe BUG-14.

---

### 🟢 F-5 — Electron Auto-Update (v1.2.0)

**Status:** Vorbereitet — `electron-builder` bringt `electron-updater` mit.

```javascript
const { autoUpdater } = require('electron-updater');
autoUpdater.checkForUpdatesAndNotify();
```

Updates via GitHub Releases. **Aufwand:** ~1 Tag

---

### 🟢 F-6 — DATEV EXTF-Format (v1.2.0)

**Status:** Aktuell nur CSV (SKR03, UTF-8 mit BOM)

Upgrade auf DATEV EXTF-Format (maschinenlesbar, direkt importierbar in DATEV-Software).

**Aufwand:** ~1-2 Tage

---

### 🟢 F-7 — ZUGFeRD COMFORT Profile (v1.2.0)

**Status:** MINIMUM-Profil vorhanden (`zugferd.js`, 276 Zeilen)

Upgrade: MINIMUM → COMFORT (EN-16931 konform). Relevant wegen E-Rechnungspflicht.

**Aufwand:** ~1 Tag

---

### 🟢 F-8 — Dashboard erweitern (v1.2.0)

**Status:** Aktuell nur Umsatz-Chart (letzte 6 Monate)

Geplant:
- Auftragsstatus-Donut (Anfragen / Aktiv / Abgeliefert)
- Offene Forderungen-Balken
- Jahresvergleich

**Aufwand:** ~1 Tag

---

### 🟡 F-9 — Rate Limiting (v1.2.0)

Für LAN-Szenarien (App auf NAS, andere Geräte im Heimnetz) sinnvoll.

**Fix:** `express-rate-limit`, 100 Requests/Minute pro IP. **Aufwand:** 30 Minuten

---

### 🟢 F-10 — Linux-Support (v1.3.0)

**Status:** AppImage-Target in `package.json` bereits konfiguriert.

Noch fehlend: `linux/install.sh`, `icon.png` (512×512), Build-Pipeline testen.

**Aufwand:** ~1 Tag

---

### 🟢 F-11 — Korrespondenz-Reiter ausbauen

**Status:** Ordner `korrespondenz/` im Workspace-Dateisystem angelegt, aber kein UI dafür.

Geplant:
- Upload beliebiger Dateien (PDFs, Bilder, Word-Dokumente) in den `korrespondenz/`-Ordner
- Anzeige als Liste mit Dateiname, Datum, Größe
- Öffnen via `shell.openPath()`

**Aufwand:** ~0.5 Tage · **Priorität:** v1.2.0

---

## 📅 Versions-Plan

```
v1.1.1 ✅ (aktuell stabil)
  - Hotfixes, Cleanup, E-Mail-Infrastruktur fertig

v1.2.0-dev 🚧 (aktiv)
  - PDF-Benennung + Workspace-Unterordner ✅
  - PDF im System-Viewer öffnen ✅
  - Zahlungserfassung mit Zahlungsart ✅
  - Pipeline-UI-Verbesserungen ✅
  - Nummernkreis für Projekte (Proj-Nummer) ✅

v1.1.2 (~2-3h, nächste Woche)
  - BUG-8:  "Coming soon"-Banner entfernen (5 Min)
  - BUG-9:  Node-v24-Check mac/install.sh (10 Min)
  - BUG-10: App-Icons erstellen (20 Min)
  - BUG-11: project-files.txt aus Repo (1 Min)
  - BUG-12: README.md auf GitHub aktualisieren (bereits fertig, push nötig)
  - TD-5:   buildNumber() extrahieren (30 Min)
  - TD-6:   .env.example Kommentar korrigieren (1 Min)
  - F-1:    E-Mail-Status in Dokumentenliste (0.5 Tage)

v1.2.0 (~2-3 Wochen)
  - BUG-16: Dokumente nicht persistent abgelegt (4h) 🔴
  - BUG-17: Öffnen erstellt neues Dokument (4h) 🔴
  - BUG-18: Vorgespräch-Kalender-Sync (1h)
  - BUG-19: Auftragsübersicht Layout rechts (30min)
  - BUG-20: PDF im System-Viewer prüfen (1h)
  - BUG-21: Korrespondenz-Cleanup (1h) — oder F-11 behalten?
  - BUG-4:  Input-Validierung mit Zod (1 Tag)
  - BUG-13: Medienimport-Reiter fertigstellen (1-2 Tage)
  - BUG-15: Abschluss-Reiter ausbauen (0.5 Tage)
  - F-1:    E-Mail vollständig (Pipeline-Integration, Log)
  - F-5:    Auto-Update (1 Tag)
  - F-6:    DATEV EXTF-Format (1-2 Tage)
  - F-7:    ZUGFeRD COMFORT (1 Tag)
  - F-8:    Dashboard erweitern (1 Tag)
  - F-9:    Rate Limiting (0.5 Tag)
  - F-11:   Korrespondenz-Reiter (0.5 Tage) — ⚠️ Entfällt wenn BUG-21 umgesetzt
  - TD-1:   Kern-Tests (3-4 Tage)
  - TD-3:   ESLint + Prettier (2h)
  - TD-7:   Logging (1 Tag)
  - TD-8:   Testsystem / Dev-Helfer (0.5 Tage)

v1.3.0-dev 🚧 (aktiv — Refactoring)
  - TD-2:   Settings.vue → 13 Tab-Komponenten + Pinia Store ✅
  - TD-2:   ProjectDetail.vue → Composables (nächste Phase)
  - TD-2:   FiBu.vue → Tab-Komponenten (geplant)
  - TD-2:   NewProjectForm.vue → Kalkulator trennen (geplant)
  - TD-2:   ProjectPipelineVertrag.vue → Subkomponenten (geplant)
  - F-10:   Linux-Support (1 Tag)

v1.3.0 (~2-3 Wochen)

v2.0.0 (Langfristig)
  - Authentifizierung (JWT)
  - Multi-User / Team-Betrieb
  - PostgreSQL-Support
  - NAS-Deployment + Docker
```

---

## 🔮 Langfristig (v2.0.0+)

| Feature | Voraussetzung | Aufwand |
|---|---|---|
| Authentifizierung (JWT) | — | ~1 Woche |
| Multi-User / Teams | Auth | ~2-3 Wochen |
| PostgreSQL-Support | SQLite-Layer stabil | ~1 Woche |
| NAS-Deployment + Docker | — | ~1 Woche |
| Mobile-App / PWA | Electron-Architektur | längerfristig |
| Kundenzugang (Portal) | Multi-User + Auth | längerfristig |

---

## ✅ Abgeschlossen

| Feature / Bug | Version | Details |
|---|---|---|
| JSON → SQLite | v1.1.0 | 15 Tabellen, WAL, Foreign Keys, Indizes |
| Electron Desktop-App | v1.1.0 | Workspace-Picker, Auto-Backup, Graceful Shutdown |
| Puppeteer → printToPDF | v1.1.0 | Alle 9 Print-Views, kein Chromium-Download |
| Workspace-Dateisystem | v1.1.0 | PDF-Ablage in Projektordner, Dateilisting |
| Holiday-Cache → SQLite | v1.1.0 | `holiday_cache` Tabelle, kein JSON-Filesystem |
| multer entfernt | v1.1.1 | express-fileupload übernimmt alle Uploads |
| Health-Endpoint Versionsnummer | v1.1.1 | dynamisch aus package.json |
| E-Mail-Infrastruktur | v1.1.1 | Backend + Modal + SMTP-Config + Test-Mail |
| Beta-Blocker BB-1 bis BB-6 | v1.0 | Path Traversal, Atomare Writes, Race Condition, etc. |
| Beta-Qualitätsziele BQ-1 bis BQ-7 | v1.0 | FiBu, Dashboard-Chart, iCal, DATEV CSV, etc. |
| PDF-Benennung + Workspace-Unterordner | v1.2.0-dev | standardFilename, subfolder, GoBD-konform |
| PDF im System-Viewer öffnen | v1.2.0-dev | generate-and-open-pdf IPC, shell.openPath |
| Zahlungserfassung mit Zahlungsart | v1.2.0-dev | paidAt + paymentMethod, konfigurierbarer Chip |
| Inhabername in allen Druckseiten | v1.2.0-dev | Inh.-Zeile immer sichtbar (v-if entfernt) |
| Pipeline-UI Verbesserungen | v1.2.0-dev | Abrechnung-Panel, Vorgespräch-Panel, Notizen-Badge |
| Nummernkreis für Projekte | v1.2.0-dev | DB-Migration v2, atomare Nummernvergabe, Ordnername = Projektnummer |
| Dokumentenablage im Projektordner | v1.2.0-dev | AGB/DSGVO/ADV automatisch in vertraege/, Uploads direkt im Projektordner |
| System-Reset (Service-Passwort) | v1.2.0-dev | DB+Workspace zurücksetzen, Demo-Kunde, Settings/Artikel/AGB bleiben erhalten |
| **Settings.vue Refactoring** | **v1.3.0-dev** | **3.200 Z. → 13 Tab-Komponenten + Pinia Store (useSettingsFormStore)** |

---

## 🎯 Zusammenfassung

| Kategorie | Anzahl | Priorität |
|---|---|---|
| Offene Bugs 🔴🟠🟡🟢 | 13 (BUG-4, 8–13, 15–21) | v1.1.2 – v1.2.0 |
| Technische Schulden | 8 (TD-1 bis TD-8) | v1.1.2 – v1.3.0 |
| Features | 10 (F-1 bis F-11, ohne F-4 ✅) | v1.1.2 – v1.3.0 |

**Bottom Line:** PixFrameWorkspace ist produktionsreif für den Grundbetrieb. **Zwei kritische Pipeline-Bugs (BUG-16/17)** müssen vor produktiver Dokumentenerstellung behoben werden. Die v1.2.0 bringt die fehlenden Pipeline-Reiter (Medienimport, Abschluss), ADV/DSGVO-Projektbindung, E-Mail-Vollintegration und Logging. Vorher ist ein schneller v1.1.2-Hotfix sinnvoll (~2-3h) für die kleinen Restarbeiten.

---

*PixFrameWorkspace · v1.3.0-dev · April 2026 · © Markus Emanuel*
