# PixFrameWorkspace — Roadmap & offene Punkte

*Stand: v1.1.1 · 01. April 2026*
*Stack: Vue 3 + Pinia + Vite · Electron 30 · Node.js + Express · SQLite (better-sqlite3)*

---

## 📊 Aktueller Zustand

**v1.1.1 ist produktionsreif für Einzelnutzung.**

Drei große Migrationen abgeschlossen:
- ✅ JSON → SQLite (15 Tabellen, WAL-Mode, Foreign Keys, Indizes)
- ✅ Browser-App → Electron-Desktop (Workspace-Picker, Auto-Backup)
- ✅ Puppeteer → Electron `printToPDF` (alle 9 Print-Views)

E-Mail-Versand implementiert:
- ✅ Backend: `emailService.js`, Route `/api/email/send|test|config`
- ✅ Frontend: `SendEmailModal.vue` vollständig, in `DocumentDetailModal` eingebunden
- ✅ SMTP-Konfiguration + Test-Mail in Einstellungen

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

### 🟡 BUG-8 — Settings-SMTP-Tab zeigt "coming soon"-Banner

**Status:** OFFEN

Der SMTP-Tab zeigt noch den Text „Die SMTP-Anbindung wird in einer kommenden Version aktiviert", obwohl die Implementierung vollständig ist. Verwirrend für Nutzer.

**Fix:** Banner-Text in `Settings.vue` entfernen (Zeile ~1130).

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

**Status:** Wurde in v1.1.1 als erledigt dokumentiert, Datei ist aber noch vorhanden.

**Fix:** `git rm project-files.txt && git commit`

**Aufwand:** 1 Minute · **Priorität:** nächster Commit

---

## 🛠️ Technische Schulden

### 🔴 TD-1 — Zero Tests (0% Abdeckung)

Mit BaseRepository-Pattern und SQLite ist die Infrastruktur gut für Tests geeignet. Ohne Tests ist jede Refactoring-Runde blind.

**Priorisierte Testreihenfolge:**
1. `BaseRepository` — In-Memory SQLite (`:memory:`), CRUD, Locking (~4-6h)
2. `documentService` — Nummernvergabe, Storno, GoBD-Compliance (~3-4h)
3. `fibuService` — Buchungslogik, DATEV-Export-Format (~2-3h)
4. `emailService` — SMTP-Mock, Payload-Validierung (~1-2h)

**Tools:** vitest, better-sqlite3 `:memory:` mode

**Aufwand:** ~3-4 Tage für 70% Abdeckung · **Priorität:** v1.2.0

---

### 🟠 TD-2 — God-Files im Frontend

| Datei | Zeilen | Problem |
|---|---|---|
| `ProjectDetail.vue` | ~4.700 | Gesamte Projektlogik in einer Datei |
| `Settings.vue` | ~3.200 | 12+ Tabs als Monolith |
| `NewProjectForm.vue` | ~1.400 | B2B-Kalkulator + Formular vermischt |
| `ProjectPipelineVertrag.vue` | ~1.700 | Vertragslogik größer als viele Apps |

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

Keine Feature-Branches, keine aussagekräftigen Commit-Messages, keine Tags.

**Empfehlung ab sofort:**
- Feature-Branches: `feature/email-versand`, `fix/bug-8-smtp-banner`
- Conventional Commits: `fix(settings): remove coming-soon banner from SMTP tab`
- Tags: `git tag v1.1.1`

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

## ✨ Feature-Roadmap

### 🚧 F-1 — E-Mail-Versand vollständig integrieren (v1.1.2)

**Status: ~85% fertig**

Fertig: Backend, `SendEmailModal`, Einbindung in `DocumentDetailModal`, SMTP-Config + Test.

**Noch fehlend:**
- "Coming soon"-Banner in Settings entfernen (BUG-8, 5 Min)
- Versand-Status in Dokumentenliste anzeigen (gesendet / nicht gesendet)
- E-Mail-Versand direkt aus `ProjectDetail` Pipeline-Stufen

**Aufwand:** ~0.5 Tage

---

### 🟢 F-2 — Electron Auto-Update (v1.2.0)

**Status:** Vorbereitet — `electron-builder` bringt `electron-updater` mit.

```javascript
const { autoUpdater } = require('electron-updater');
autoUpdater.checkForUpdatesAndNotify();
```

Updates via GitHub Releases. **Aufwand:** ~1 Tag

---

### 🟢 F-3 — DATEV EXTF-Format (v1.2.0)

**Status:** Aktuell nur CSV (SKR03, UTF-8 mit BOM)

Upgrade auf DATEV EXTF-Format (maschinenlesbar, direkt importierbar in DATEV-Software).

**Aufwand:** ~1-2 Tage

---

### 🟢 F-4 — ZUGFeRD COMFORT Profile (v1.2.0)

**Status:** MINIMUM-Profil vorhanden (`zugferd.js`, 276 Zeilen)

Upgrade: MINIMUM → COMFORT (EN-16931 konform). Relevant wegen E-Rechnungspflicht.

**Aufwand:** ~1 Tag

---

### 🟢 F-5 — Dashboard erweitern (v1.2.0)

**Status:** Aktuell nur Umsatz-Chart (letzte 6 Monate)

Geplant:
- Auftragsstatus-Donut (Anfragen / Aktiv / Abgeliefert)
- Offene Forderungen-Balken
- Jahresvergleich

**Aufwand:** ~1 Tag

---

### 🟡 F-6 — Rate Limiting (v1.2.0)

Für LAN-Szenarien (App auf NAS, andere Geräte im Heimnetz) sinnvoll.

**Fix:** `express-rate-limit`, 100 Requests/Minute pro IP. **Aufwand:** 30 Minuten

---

### 🟢 F-7 — Linux-Support (v1.3.0)

**Status:** AppImage-Target in `package.json` bereits konfiguriert.

Noch fehlend: `linux/install.sh`, `icon.png` (512×512), Build-Pipeline testen.

**Aufwand:** ~1 Tag

---

## 📅 Versions-Plan

```
v1.1.1 ✅ (aktuell)
  - Hotfixes, Cleanup, E-Mail-Infrastruktur fertig

v1.1.2 (~2-3h, nächste Woche)
  - BUG-8:  "Coming soon"-Banner entfernen (5 Min)
  - BUG-9:  Node-v24-Check mac/install.sh (10 Min)
  - BUG-10: App-Icons erstellen (20 Min)
  - BUG-11: project-files.txt aus Repo (1 Min)
  - TD-5:   buildNumber() extrahieren (30 Min)
  - TD-6:   .env.example Kommentar korrigieren (1 Min)
  - F-1:    E-Mail-Status in Dokumentenliste (0.5 Tage)

v1.2.0 (~2-3 Wochen)
  - BUG-4:  Input-Validierung mit Zod (1 Tag)
  - F-2:    Auto-Update (1 Tag)
  - F-3:    DATEV EXTF-Format (1-2 Tage)
  - F-4:    ZUGFeRD COMFORT (1 Tag)
  - F-5:    Dashboard erweitern (1 Tag)
  - F-6:    Rate Limiting (0.5 Tag)
  - TD-1:   Kern-Tests (3-4 Tage)
  - TD-3:   ESLint + Prettier (2h)

v1.3.0 (~2-3 Wochen)
  - TD-2:   God-Files aufsplitten (projektDetail, Settings)
  - F-7:    Linux-Support (1 Tag)

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

---

## 🎯 Zusammenfassung

| Kategorie | Anzahl | Priorität |
|---|---|---|
| Offene Bugs 🟠🟡🟢 | 5 (BUG-4, 8, 9, 10, 11) | v1.1.2 – v1.2.0 |
| Technische Schulden | 6 (TD-1 bis TD-6) | v1.1.2 – v1.3.0 |
| Features | 7 (F-1 bis F-7) | v1.1.2 – v1.3.0 |

**Bottom Line:** PixFrameWorkspace ist produktionsreif. Kein kritischer Bug blockiert die Nutzung. Nächster sinnvoller Schritt: v1.1.2 Hotfix (~2-3h) um die kleinen Restarbeiten zu erledigen, dann E-Mail-Versand vollständig fertigstellen.

---

*PixFrameWorkspace · v1.1.1 · April 2026 · © Markus Emanuel*
