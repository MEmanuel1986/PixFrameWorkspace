# PixFrameWorkspace — Roadmap & offene Punkte

*Stand: v1.1.0 · 01. April 2026*
*Stack: Vue 3 + Pinia + Vite · Electron 30 · Node.js + Express · SQLite (better-sqlite3)*

---

## 📊 Aktueller Zustand

**v1.1.0 ist produktionsreif für Einzelnutzung.** Drei große Migrationen erfolgreich abgeschlossen:
- ✅ JSON → SQLite (15 Tabellen, WAL-Mode, Foreign Keys, Indizes)
- ✅ Browser-App → Electron-Desktop (Workspace-Picker, Auto-Backup)
- ✅ Puppeteer → Electron `printToPDF` (alle 9 Print-Views funktionieren)

**Realität:** Das Projekt ist **stabil und nutzbar**. Nur **1 echter Bug offen** (BUG-4: Input-Validierung).

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| 🔴 | **KRITISCH** — Datenverlust oder Sicherheitsleck möglich |
| 🟠 | Hoch — Alltagsnutzung beeinträchtigt |
| 🟡 | Mittel — störend, aber umgehbar |
| 🟢 | Niedrig — kosmetisch, kein Blockercharakter |
| ✅ | Erledigt in v1.1.0 |
| 🚧 | In Arbeit / teilweise fertig |

---

## 🔍 Offene Bugs — Realistische Einschätzung

### 🔴 **BUG-4 — Fehlende Input-Validierung (HTTP-Level)** — DER EINZIGE ECHTE BUG

**Status:** OFFEN, aber durch SQLite entschärft

**Problem:**
Es gibt kein Framework für Request-Validierung (kein `joi`, `zod`, `express-validator`).
Das bedeutet: ungültige Daten können direkt in die Datenbank gelangen.

**Praktische Risiken:**
```javascript
// ❌ Szenario 1: Customer mit ungültiger E-Mail
POST /api/customers { name: "Max", email: "keine-email" }
// → Speichert sich, Frontend kann später nicht damit umgehen

// ❌ Szenario 2: Dokumentbetrag als String
POST /api/documents { amount: "abc" }
// → SQLite speichert es, Summen-Berechnungen schlagen fehl

// ❌ Szenario 3: Null-Wert bei Required-Field
POST /api/projects { name: null }
// → Kann in Ausgabefunktionen crashen

zod einführen + Pro Route ein Validierungs-Schema:
const customerSchema = z.object({
  name: z.string().min(1, "Name erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().optional(),
});

app.post('/api/customers', (req, res) => {
  const result = customerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      error: "Validierung fehlgeschlagen",
      issues: result.error.issues 
    });
  }
  // Nur valide Daten gelangen hier hin
  const customer = db.insert('customers', result.data);
  res.json({ data: customer });
});

✅ BUG-1 — Holiday-Cache SQLite — BEREITS GELÖST ✅
Status: ERLEDIGT IN v1.1.0

holidayController.js nutzt bereits SQLite-Tabelle holiday_cache:

JavaScript
// Funktioniert seit v1.1.0:
function readCache(id) {
  const row = databaseService.db
    .prepare('SELECT data, fetched_at FROM holiday_cache WHERE id = ?')
    .get(id);
  if (!row) return null;
  if (Date.now() - new Date(row.fetched_at).getTime() > CACHE_TTL) return null;
  return JSON.parse(row.data);
}

function writeCache(id, data) {
  databaseService.db
    .prepare('INSERT OR REPLACE INTO holiday_cache (id, data, fetched_at) VALUES (?, ?, ?)')
    .run(id, JSON.stringify(data), new Date().toISOString());
}
✅ Prepared Statements ✅ Atomare Operationen ✅ TTL-Handling ✅ Kein Code-Duplizierung mehr

Aufwand: 0h (bereits erledigt)

🟡 BUG-2 — Node.js v24 bricht better-sqlite3 — NIEDRIG
Status: Nur wenn Nutzer Node v24+ hat

better-sqlite3 hat kein Prebuilt für Node v24+. Wenn jemand Node 24 installiert hat, scheitert npm install.

Fix: Installer-Skripte mit Versionscheck:

bash
# windows/install.ps1
$nodeVersion = (node -v).Substring(1)
if ($nodeVersion -match "^24\.|^25\.") {
  Write-Error "Node.js v24+ wird nicht unterstützt. Bitte Node v20 oder v22 verwenden."
  exit 1
}
Aufwand: ~30 Minuten

Priorisierung: Für v1.1.1 Hotfix

🟡 BUG-3 — cleanup-project.ps1 noch im Repo — KOSMETIK
Status: Laut CHANGELOG gelöscht, aber noch vorhanden

Sieht unprofessionell aus, funktioniert aber.

Fix: git rm cleanup-project.ps1 project-files.txt && git commit

Aufwand: 2 Minuten

Priorisierung: v1.1.1

🟢 BUG-5 — multer Dependency ungnutzt — SEHR NIEDRIG
Status: Toter Code

multer ^1.4.5-lts.1 ist installiert, wird aber nicht genutzt. Alle Uploads laufen über express-fileupload.

Fix: npm uninstall multer im Backend

Aufwand: 1 Minute

Priorisierung: Irgendwann in v1.1.x

🟢 BUG-6 — Versionsnummer im Health-Endpoint hardcoded — SEHR NIEDRIG
Datei: backend/src/app.js Zeile 55

JavaScript
// ❌ JETZT:
version: '1.1.0',

// ✅ SOLLTE SEIN:
version: require('../../package.json').version,
Aufwand: 5 Minuten

Priorisierung: v1.1.1

🟢 BUG-7 — Passwort im .env.example — SEHR NIEDRIG
Datei: backend/.env.example

bash
# ❌ JETZT:
# DATABASE_URL=postgresql://pixframe:sicher123@localhost:5432/pixframe

# ✅ SOLLTE SEIN:
# DATABASE_URL=postgresql://pixframe:<password>@localhost:5432/pixframe
Aufwand: 1 Minute

Priorisierung: v1.1.1

🛠️ Technische Schulden
🔴 TD-1 — Zero Tests (0% Abdeckung)
Status: Keine Unit-, Integration- oder E2E-Tests

Mit BaseRepository-Pattern und SQLite-Schema ist die Infrastruktur perfekt für Tests. Risiko: Jede größere Refactoring-Runde ist blind.

Priorisierte Test-Reihenfolge:

BaseRepository Tests (~4-6h)

In-Memory SQLite (:memory:)
CRUD-Operationen
Locking & Concurrency
documentService Tests (~3-4h)

Nummernvergabe (Counter-Logik)
Stornierung & Korrektur
GoBD-Compliance
fibuService Tests (~2-3h)

Buchungslogik
Jahresabschluss
DATEV-Export-Format
pdfService Smoke-Tests (~1-2h)

Kein Crash beim Rendern
PDF-Buffer wird korrekt erzeugt
Tools: vitest (perfekt zum Vite-Stack), better-sqlite3 :memory: mode

Gesamtaufwand: ~3-4 Tage für Basisabdeckung (70%)

Priorisierung: v1.2.0

🟠 TD-2 — God-Files im Frontend
Status: 4 Monster-Dateien mit >1.400 Zeilen

Datei	Zeilen	Problem
ProjectDetail.vue	~4.700	Gesamte Projektlogik in einer Datei
Settings.vue	~3.200	12+ Tabs als Monolith
NewProjectForm.vue	~1.400	B2B-Kalkulator + Formular vermischt
ProjectPipelineVertrag.vue	~1.700	Vertragslogik allein größer als viele Apps
Problem: Nicht testbar, kaum reviewbar, Regressionrisiko bei jeder Änderung.

Lösung: Komponenten-Aufspaltung

ProjectDetail.vue → schlanker Router + Sub-Komponenten
Settings.vue → Settings/General.vue, Settings/Billing.vue, etc.
NewProjectForm.vue → Calculator.vue + Form.vue trennen
Aufwand: ~2-3 Tage pro Datei

Priorisierung: v1.3.0+ (kann warten, blockiert nicht)

🟠 TD-3 — Kein ESLint / Prettier
Status: Keine Code-Style-Konvention

Inkonsistenzen zwischen Dateien (Einrückung, Quotes, Semikolons).

Fix:

bash
npm install -D eslint @eslint/js eslint-plugin-vue prettier eslint-config-prettier
# .eslintrc.js + .prettierrc erstellen
# "lint": "eslint src/" in package.json
Aufwand: ~2 Stunden

Priorisierung: v1.2.0 (sollte Standard sein)

🟠 TD-4 — Git-Workflow: 4 Commits für komplette Entwicklung
Status: Git-History unbrauchbar

v0 → v1.1.0 in einem Handvoll Commits. Keine Feature-Branches, keine aussagekräftigen Messages.

Empfehlung ab sofort:

Feature-Branches: feature/email, fix/bug-4, refactor/projectdetail
Conventional Commits: fix(holiday): migrate to SQLite
Tags: git tag v1.1.0
Aufwand: 0h (nur Gewohnheit)

Priorisierung: Ab sofort

🟡 TD-5 — MARGIN Konstante in pdfService.js — Toter Code
Status: Unused nach printToPDF-Migration

Nach Umstellung auf showLogoHeader: true + MARGIN_WITH_HEADER ist MARGIN toter Code.

Fix: const MARGIN = {...} entfernen

Aufwand: 5 Minuten

Priorisierung: v1.1.1

🟡 TD-6 — Duplizierter buildNumber()-Code
Dateien: documentService.js + projectController.js

Identische Logik an 2 Stellen. Änderungen müssen doppelt gepflegt werden.

Fix: backend/src/utils/numberUtils.js extrahieren + importieren

Aufwand: 30 Minuten

Priorisierung: v1.1.1

✨ Feature-Roadmap
🚧 F-1 — E-Mail-Versand (v1.2.0)
Status: 60% fertig

Infrastruktur vorhanden (emailService.js, nodemailer, SMTP-Tab), aber nicht vollständig verdrahtet.

Noch fehlend:

 SendEmailModal.vue ↔ Backend-Route verbindung
 SMTP-Test-Button in Settings
 Template-Editor (Angebot, Rechnung, Vertrag)
 PDF als Attachment (printToPDF → Buffer → Nodemailer)
 Versand-Status in Dokumentenliste
Aufwand: ~2-3 Tage

🟢 F-2 — Electron Auto-Update (v1.2.0)
Status: Vorbereitet

electron-builder bringt electron-updater mit.

Fix:

JavaScript
const { autoUpdater } = require('electron-updater');
autoUpdater.checkForUpdatesAndNotify();
Updates via GitHub Releases.

Aufwand: ~1 Tag

🟢 F-3 — App-Icons vervollständigen (v1.1.x)
Status: Fehlend

Ohne diese → npm run build schlägt fehl.

icon.ico (256×256, Windows)
icon.icns (macOS)
icon.png (512×512, Linux)
Aufwand: 20 Minuten

🟢 F-4 — DATEV EXTF-Format (v1.2.0)
Status: Aktuell nur CSV

Upgrade: CSV → DATEV EXTF-Format (maschinenlesbar).

Features:

EXTF-Format statt CSV
Export-Vorschau
Jahresfilter
Aufwand: ~1-2 Tage

🟢 F-5 — ZUGFeRD COMFORT Profile (v1.2.0)
Status: MINIMUM vorhanden

Upgrade: MINIMUM → COMFORT (EN-16931 konform).

Relevanz: E-Rechnungspflicht ab 2025/2026.

Aufwand: ~1 Tag

🟢 F-6 — Dashboard erweitern (v1.2.0)
Status: Aktuell nur Umsatz-Chart

Neu:

Auftragsstatus-Donut
Offene Forderungen-Balken
Jahresvergleich
Aufwand: ~1 Tag

🟡 F-7 — Rate Limiting (v1.2.0)
Status: Keine Begrenzung

Für LAN-Szenarien (App auf NAS, andere Geräte im Heimnetz greifen zu) sinnvoll.

Fix: express-rate-limit, 100 Requests/Minute pro IP

Aufwand: 30 Minuten

🟢 F-8 — Linux-Support (v1.3.0)
Status: AppImage bereits konfiguriert

Noch fehlend:

linux/install.sh
Build-Pipeline getestet
icon.png (512×512)
Aufwand: ~1 Tag

📅 Realistic Version Plan
Code
v1.1.0 ✅  (aktuell — Electron + SQLite + printToPDF)

v1.1.1 (~3-4h Hotfixes)
  - BUG-2: Node v24-Versionscheck
  - BUG-3: cleanup-project.ps1 löschen
  - BUG-6: Version aus package.json
  - BUG-7: Passwort-Beispiel in .env
  - TD-5: MARGIN-Konstante entfernen
  - TD-6: buildNumber() extrahieren
  - F-3: App-Icons erstellen

v1.2.0 (~2-3 Wochen)
  - BUG-4: Input-Validierung mit Zod (1 Tag)
  - F-1: E-Mail-Versand (2-3 Tage)
  - F-2: Auto-Update (1 Tag)
  - F-4: DATEV EXTF (1-2 Tage)
  - F-5: ZUGFeRD COMFORT (1 Tag)
  - F-6: Dashboard erweitern (1 Tag)
  - F-7: Rate Limiting (0.5 Tag)
  - TD-1: Kern-Tests (3-4 Tage)
  - TD-3: ESLint + Prettier (2h)

v1.3.0 (~2-3 Wochen)
  - TD-2: ProjectDetail.vue aufsplitten (2-3 Tage)
  - F-8: Linux-Support (1 Tag)
  - Weitere Stabilisierungen

v2.0.0 (Langfristig)
  - Authentifizierung (JWT)
  - Multi-User / Team-Betrieb
  - PostgreSQL-Support
🔮 Langfristig (v2.0.0+)
Feature	Voraussetzung	Aufwand
Authentifizierung (JWT)	—	~1 Woche
Multi-User / Teams	Auth	~2-3 Wochen
PostgreSQL-Support	SQLite-Layer stabil	~1 Woche
NAS-Deployment + Docker	—	~1 Woche
Mobile-App / PWA	Electron-Architektur	längerfristig
Kundenzugang (Portal)	Multi-User + Auth	längerfristig
✅ Abgeschlossen in v1.1.0
Feature / Bug	Details
JSON → SQLite	15 Tabellen, WAL, Foreign Keys, Indizes
Electron Desktop-App	Workspace-Picker, Auto-Backup, Graceful Shutdown
Puppeteer → printToPDF	Alle 9 Print-Views konvertiert
Holiday-Cache SQLite	✅ Bereits gelöst, nicht "zu erledigen"
Workspace-Picker	Funktioniert auf Windows/Mac/Linux
Backup/Restore	v1 (JSON) + v2 (SQLite) beide unterstützt
🎯 Zusammenfassung
Kategorie	Anzahl	Priorisierung
Kritische Bugs 🔴	1 (BUG-4)	v1.2.0
Kosmetische Bugs 🟡🟢	4	v1.1.1 (Hotfix)
Technische Schulden	6	v1.2.0 - v1.3.0
Features	8	v1.2.0 - v1.3.0
Bottom Line: PixFrameWorkspace ist produktionsreif. Nur BUG-4 sollte vor v1.2.0 gefixt werden.

PixFrameWorkspace · v1.1.0 · 31. März 2026 Kontakt: markus.emanuel@gmail.com