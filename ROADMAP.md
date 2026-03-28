# PixFrameWorkspace — Roadmap & offene Punkte

*Stand: v1.1.0 · März 2026*
*Stack: Vue 3 + Pinia + Vite · Electron 30 · Node.js + Express · SQLite (better-sqlite3)*

---

## Aktueller Zustand

**v1.1.0 ist ein echter Meilenstein.** Drei große Migrationen auf einmal abgeschlossen:
JSON → SQLite, Browser-App → Electron-Desktop, Puppeteer → `printToPDF`.
Das Projekt ist stabil für Einzelnutzung. Einige technische Schulden aus der Beta-Phase sind noch offen.

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| 🔴 | Kritisch — kann Datenverlust oder GoBD-Verletzung verursachen |
| 🟠 | Hoch — beeinträchtigt Alltagsnutzung oder Wartbarkeit spürbar |
| 🟡 | Mittel — störend, aber umgehbar |
| 🟢 | Niedrig — Verbesserung, kein Blockercharakter |
| ✅ | Erledigt in v1.1.0 |
| 🚧 | In Arbeit / teilweise fertig |

---

## Offene Bugs

### 🔴 BUG-1 — `holidayController` schreibt noch direkt in JSON-Cache-Dateien

**Datei:** `backend/src/controllers/holidayController.js`

Alle anderen 9 Services laufen auf SQLite — nur der Holiday-Controller nutzt noch direkte JSON-Schreiboperationen für seinen Feiertage-Cache. Das ist die einzige verbliebene nicht-atomare Schreiboperation im Backend und die letzte Zweischichtigkeit in der Datenhaltung (SQLite + JSON gleichzeitig).

**Fix:** Holiday-Cache in SQLite-Tabelle (`holiday_cache`) ablegen, `holidayController` auf `BaseRepository` umstellen.
**Aufwand:** ~2–3 Stunden

---

### 🔴 BUG-2 — Node.js v24 bricht `better-sqlite3` (kein Prebuilt)

**Datei:** `ELECTRON_SETUP.md`, Installer-Skripte

`better-sqlite3` veröffentlicht Prebuilts für Node 20 und 22, aber nicht sofort für neue Major-Releases. Nutzer, die Node v24 installiert haben, scheitern beim `npm install` mit einem nativen Kompilierfehler. Das ist die häufigste Fehlerquelle bei der Installation.

**Fix:** Installer-Skripte (Windows BAT/PS1 + Mac install.sh) prüfen aktiv die Node-Version und brechen mit einer klaren Fehlermeldung und Download-Link ab, wenn v24+ erkannt wird. Empfehlung: `node -v` gegen `^20 || ^22` testen.
**Aufwand:** ~1 Stunde

---

### 🟠 BUG-3 — `cleanup-project.ps1` noch im Repo-Root

Laut CHANGELOG v1.1.0 entfernt — ist aber laut GitHub-Ansicht noch vorhanden. Entweder fehlt der Commit oder die Datei wurde vergessen. Sieht nach Außen unprofessionell aus.

**Fix:** `git rm cleanup-project.ps1 project-files.txt` und committen.
**Aufwand:** 5 Minuten

---

### 🟠 BUG-4 — Fehlende Input-Validierung auf HTTP-Ebene

Es gibt keine HTTP-Level-Validierung (kein `joi`, `zod`, `express-validator`). Validierung geschieht teils in den alten Models, aber nicht konsistent in allen Controllern. Mit SQLite ist ein ungültiger Typ jetzt zwar weniger verheerend (kein korruptes JSON mehr), aber falsche Daten landen trotzdem in der Datenbank und können Laufzeitfehler im Frontend auslösen.

**Fix:** `zod` als Validierungs-Schema-Library einführen. Pro Route ein Schema, Fehler einheitlich über `errorHandler.js` zurückgeben.
**Aufwand:** ~1 Tag

---

### 🟡 BUG-5 — `multer` in `backend/package.json` — niemals verwendet

`multer ^1.4.5-lts.1` ist als Dependency eingetragen, wird aber nirgendwo importiert. Alle Datei-Uploads laufen über `express-fileupload`. Toter Code in den Dependencies.

**Fix:** `npm uninstall multer` im Backend.
**Aufwand:** 2 Minuten

---

### 🟡 BUG-6 — Versionsnummer im Health-Endpoint hardcoded

**Datei:** `backend/src/app.js`

```js
version: '1.0.0-alpha'   // muss manuell bei jedem Release aktualisiert werden
```

**Fix:** `require('../../package.json').version` verwenden.
**Aufwand:** 10 Minuten

---

### 🟡 BUG-7 — Passwort-Beispiel im `.env`-Kommentar

**Datei:** `backend/.env` (und `.env.example`)

```
# DATABASE_URL=postgresql://pixframe:sicher123@localhost:5432/pixframe
```

Ein Klartext-Passwort in einem öffentlichen Repo, auch wenn nur auskommentiert. Schlechte Gewohnheit — das landet in Git-Historien.

**Fix:** Passwort durch `<password>` ersetzen.
**Aufwand:** 2 Minuten

---

## Technische Schulden

### 🔴 TD-1 — Keine Tests

Das gesamte Projekt hat null Unit-, Integration- oder E2E-Tests. Mit dem `BaseRepository`-Pattern und dem SQLite-Schema gibt es jetzt genau die richtige Abstraktionsebene, um sinnvoll zu testen. Ohne Tests ist jede größere Refactoring-Runde blind.

**Empfehlung — Priorität nach Risiko:**
1. `BaseRepository` — CRUD-Tests mit In-Memory-SQLite (`:memory:`)
2. `documentService` — Nummernvergabe, Storno, Korrektur (GoBD-Kern)
3. `fibuService` — Ausgaben, Fahrtenbuch (Datenverlust-Risiko)
4. `pdfService` — Smoke-Test: rendert eine URL ohne Crash

**Tools:** `vitest` (passt gut zum Vite-Stack), `better-sqlite3` In-Memory für Repository-Tests.
**Aufwand:** ~3 Tage für sinnvolle Basisabdeckung

---

### 🟠 TD-2 — God-Files im Frontend

| Datei | Zeilen | Problem |
|-------|--------|---------|
| `ProjectDetail.vue` | ~4.700 | Nahezu die gesamte Projektlogik in einer Datei |
| `Settings.vue` | ~3.200 | 12+ Tabs als ein Monolith |
| `NewProjectForm.vue` | ~1.400 | B2B-Kalkulator + Anfrageformular vermischt |
| `ProjectPipelineVertrag.vue` | ~1.700 | Vertragsreiter allein größer als viele ganze Apps |

Diese Dateien sind nicht testbar, kaum reviewbar und jede Änderung birgt Regressionsrisiken. Die Pipeline-Subkomponenten-Strategie (`ProjectPipelineAngebot.vue` etc.) zeigt, dass die Aufspaltungsidee schon da ist — sie wurde nur nicht konsequent auf `ProjectDetail.vue` selbst angewandt.

**Empfehlung:** `ProjectDetail.vue` in einen schlanken Router aufteilen, der zwischen den Pipeline-Komponenten wechselt. `Settings.vue` in ein `Settings/`-Verzeichnis mit je einer Komponente pro Tab-Gruppe.
**Aufwand:** ~2–3 Tage pro God-File

---

### 🟠 TD-3 — Kein Linting / Formatting

Kein `.eslintrc`, kein `prettier.config.js`. Der Code-Stil ist inkonsistent zwischen Dateien (Einrückung, Anführungszeichen, Semikolons). Mit wachsender Codebasis und eventuellen Mitwirkenden wird das zunehmend zum Problem.

**Fix:**
```bash
npm install -D eslint @eslint/js eslint-plugin-vue prettier eslint-config-prettier
```
Dann `.eslintrc.js` + `.prettierrc` + `"lint": "eslint src/"` in `package.json`.
**Aufwand:** ~2 Stunden (inkl. erste automatische Fixes)

---

### 🟠 TD-4 — Git-Workflow: 4 Commits für die gesamte Entwicklung

Die komplette Entwicklung von v0 bis v1.1.0 ist in einem Handvoll Commits. Das Git-Log ist damit als Entwicklungshistorie unbrauchbar. Für ein Soloprojekt tolerierbar — für spätere Mitwirkende oder ein Rollback auf einen bestimmten Zwischenstand problematisch.

**Empfehlung ab sofort:**
- Feature-Branches: `feature/email-versand`, `fix/holiday-sqlite`, `refactor/projectdetail-split`
- Aussagekräftige Commit-Messages: `fix(holiday): migrate cache to SQLite BaseRepository`
- Tags für Releases: `git tag v1.1.0`

---

### 🟡 TD-5 — `MARGIN` (14mm) in `pdfService.js` nicht mehr verwendet

Nach der Umstellung aller Endpunkte auf `showLogoHeader: true` und `MARGIN_WITH_HEADER` (22mm) ist die `MARGIN`-Konstante toter Code.

**Fix:** `const MARGIN = { ... }` entfernen, `showLogoHeader`-Parameter aus der Signatur streichen.
**Aufwand:** 10 Minuten

---

### 🟡 TD-6 — Duplizierter `buildNumber()`-Code

**Dateien:** `documentService.js` + `projectController.js`

`buildNumber()` und `loadSettings()` sind identisch in zwei Dateien implementiert. Mit dem SQLite-Umbau ist das Kollisionsrisiko entschärft, aber der Code-Duplizierung bleibt. Wenn sich das Nummernformat-Token-System ändert, muss es noch immer an zwei Stellen gepflegt werden.

**Fix:** `backend/src/utils/numberUtils.js` extrahieren, an beiden Stellen importieren.
**Aufwand:** 30 Minuten

---

## Feature-Roadmap

### 🚧 F-1 — E-Mail-Versand (`v1.2.0`)

Infrastruktur vorhanden (`emailService.js`, `nodemailer`, SMTP-Tab in Einstellungen), aber nicht vollständig verdrahtet.

**Noch fehlend:**
- `SendEmailModal.vue` vollständig an Backend-Route anbinden
- SMTP-Test-Button in Einstellungen (sendet eine Test-Mail an die eigene Adresse)
- Template-Editor für Standard-Mailtexte (Angebot, Rechnung, Vertrag)
- PDF direkt als Anhang via Electron `printToPDF` → Buffer → Nodemailer-Attachment
- Versand-Status in der Dokumentenübersicht tracken

**Aufwand:** ~2–3 Tage

---

### 🟢 F-2 — Electron Auto-Update (`v1.2.0`)

`electron-builder` bringt `electron-updater` mit. Das alte ZIP-basierte Update-System (v1.0.x) ist entfernt — ein nativer Auto-Updater wäre der richtige Ersatz.

**Optionen:**
- GitHub Releases als Update-Server (kostenlos, passt zum Repo)
- `autoUpdater` aus `electron-updater` konfigurieren
- Update-Dialog im App-Menü: „Auf Updates prüfen"

**Aufwand:** ~1 Tag

---

### 🟢 F-3 — App-Icons vervollständigen (`v1.1.x`)

Laut `ELECTRON_SETUP.md` müssen Icons in `assets/` angelegt werden:
- `icon.ico` — Windows (256×256)
- `icon.icns` — macOS
- `icon.png` — Linux (512×512)

Ohne diese Dateien schlägt `npm run build` fehl oder nutzt den Electron-Standard-Icon.

**Aufwand:** 30 Minuten (Icon-Generierung via https://www.electron.build/icons)

---

### 🟢 F-4 — DATEV-Export verbessern (`v1.2.0`)

Aktuell: DATEV Buchungsexport als CSV (SKR03).

**Verbesserungen:**
- DATEV EXTF-Format statt reinem CSV (maschinenlesbarer, direkter Import in DATEV)
- Export-Vorschau vor Download (Tabelle der zu exportierenden Buchungen)
- Jahresfilter im Export-Dialog

**Aufwand:** ~1–2 Tage

---

### 🟢 F-5 — ZUGFeRD EN-16931 COMFORT Profile (`v1.2.0`)

Aktuell: ZUGFeRD 2.3 XML-Export vorhanden (`zugferd.js`, 276 Zeilen).

**Verbesserung:** Upgrade von MINIMUM auf COMFORT Profile (EN-16931 konform). COMFORT enthält alle Pflichtfelder für eine vollständig maschinell verarbeitbare E-Rechnung — relevant wenn ab 2025/2026 die E-Rechnungspflicht für B2B greift.

**Aufwand:** ~1 Tag

---

### 🟢 F-6 — Dashboard-Charts erweitern (`v1.2.0`)

Aktuell: Umsatz-Chart (letzte 6 Monate) vorhanden.

**Ergänzungen:**
- Auftragsstatus-Donut (Anfrage / Vertrag / Abschluss / Storniert)
- Offene Forderungen-Balken (überfällige Rechnungen)
- Jahresvergleich (aktuelles vs. Vorjahr)

**Aufwand:** ~1 Tag

---

### 🟡 F-7 — Rate Limiting für die REST-API (`v1.2.0`)

Aktuell: keine Anfrage-Begrenzung. Im Localhost-Betrieb unkritisch, in einem LAN-Szenario (z.B. App läuft auf einem NAS, andere Geräte im Heimnetz greifen zu) ist die API vollständig ungeschützt.

**Fix:** `express-rate-limit` einbinden, 100 Requests/Minute pro IP.
**Aufwand:** 30 Minuten

---

### 🟢 F-8 — Linux-Support ausbauen (`v1.3.0`)

`package.json` hat bereits `"linux": { "target": "AppImage" }` konfiguriert. Für einen vollständigen Linux-Support fehlen:
- Installer-Skript `linux/install.sh`
- Getestete Build-Pipeline (GitHub Actions?)
- `icon.png` (512×512)

**Aufwand:** ~1 Tag

---

## Langfristig

Diese Punkte sind bewusst nicht priorisiert — sie hängen von der Nutzerbasis und dem Aufwand-Nutzen-Verhältnis ab.

| Feature | Voraussetzung | Aufwand |
|---------|--------------|---------|
| Authentifizierung (JWT) | — | ~1 Woche |
| Multi-User / Team-Betrieb | Auth | ~2–3 Wochen |
| PostgreSQL als optionale DB | SQLite-Layer stabil | ~1 Woche |
| Mobile-App / PWA | Electron-Architektur stabilisiert | längerfristig |
| Kundenzugang (Self-Service-Portal) | Multi-User | längerfristig |

---

## Abgeschlossen ✅

| Feature / Bug | Version |
|--------------|---------|
| Path Traversal Fix ZIP-Extraktion (BB-1) | v212 |
| Atomare Schreiboperationen überall (BB-2) | v212 |
| Race Condition Nummernvergabe → atomarer Counter (BB-4) | v212 |
| `joi` Dependency entfernt (BB-5) | v212 |
| Settings-Cache (BB-6) | v212 |
| FiBu Beleg-Vorschau (BQ-1) | v213 |
| Dashboard Umsatz-Chart (BQ-2) | v213 |
| iCal-Export (BQ-3) | v213 |
| DATEV CSV-Export (BQ-5) | v213 |
| Mehrere Shooting-Termine (BQ-6) | v215 |
| Eingangsrechnungen (BQ-7) | v215 |
| macOS vollständig kompatibel | v1.0.0-beta.1 |
| Druckränder aller 9 Print-Views | v1.0.1 |
| Kopf-/Fußzeile alle Druckdokumente | v1.0.0-beta.2 |
| DsgvoPrint Header-Bug | v1.0.0-beta.2 |
| JSON → SQLite Migration (15 Tabellen, WAL, FK) | v1.1.0 |
| Electron Desktop-App | v1.1.0 |
| Puppeteer → Electron printToPDF | v1.1.0 |
| Workspace-Picker beim ersten Start | v1.1.0 |
| Graceful Shutdown (HTTP + DB) | v1.1.0 |
| Backup v1 (JSON) + v2 (SQLite) Restore | v1.1.0 |

---

## Versionsplan

```
v1.1.0  ← aktuell (Electron + SQLite + printToPDF)
v1.1.x  ← Hotfixes: BUG-1 bis BUG-7, TD-5, TD-6, Icons (F-3)
v1.2.0  ← E-Mail-Versand (F-1), Auto-Update (F-2), Linting (TD-3), Tests Kern (TD-1)
v1.3.0  ← DATEV EXTF (F-4), ZUGFeRD COMFORT (F-5), Dashboard-Erweiterung (F-6), Linux (F-8)
v2.0.0  ← Authentifizierung, Multi-User (langfristig)
```

---

*PixFrameWorkspace · v1.1.0 · Stand März 2026*
*Kontakt: markus.emanuel@gmail.com*
