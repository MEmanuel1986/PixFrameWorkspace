# PixFrame – SQLite-Integrationsplan

## Übersicht

Dieser Plan beschreibt den exakten Ablauf, um das Backend von JSON-Dateien auf SQLite umzustellen. **Die Controller und das Frontend bleiben unverändert.** Nur die Service-Schicht und der Server-Einstiegspunkt werden ersetzt.

---

## Phase 1: Vorbereitung (5 Min)

### 1.1 Abhängigkeit installieren

```bash
cd backend
npm install better-sqlite3
npm uninstall puppeteer multer   # Altlasten entfernen
```

> `better-sqlite3` kompiliert native C-Bindings. Unter Windows brauchst du
> `windows-build-tools` oder Visual Studio Build Tools.
> Falls Electron: `electron-rebuild` nach der Installation ausführen.

### 1.2 Neuen Ordner anlegen

```
backend/src/database/         ← NEU
```

---

## Phase 2: Neue Dateien einfügen

### 2.1 Datei-Zuordnung (Was kommt wohin)

```
NEUE DATEI                              → ZIEL-PFAD
────────────────────────────────────────────────────────────────
schema.sql                              → backend/src/database/schema.sql
databaseService.js                      → backend/src/database/databaseService.js
migrateFromJson.js                      → backend/src/database/migrateFromJson.js

BaseRepository.js                       → backend/src/services/BaseRepository.js

customerService.js                      → backend/src/services/customerService.js     ← ERSETZT
articleService.js                       → backend/src/services/articleService.js       ← ERSETZT
supplierService.js                      → backend/src/services/supplierService.js     ← ERSETZT
projectService.js                       → backend/src/services/projectService.js      ← ERSETZT
documentService.js                      → backend/src/services/documentService.js     ← ERSETZT
fibuService.js                          → backend/src/services/fibuService.js         ← ERSETZT
settingsService.js                      → backend/src/services/settingsService.js     ← ERSETZT
counterService.js                       → backend/src/services/counterService.js      ← NEU
backupService.js                        → backend/src/services/backupService.js       ← ERSETZT

paths.js                                → backend/src/config/paths.js                 ← ERSETZT
server.js                               → backend/server.js                           ← ERSETZT
package.json                            → backend/package.json                        ← ERSETZT
```

### 2.2 Schritt-für-Schritt

```bash
# 1. Alten Services-Ordner sichern
cp -r backend/src/services backend/src/services_backup

# 2. Neuen Database-Ordner erstellen
mkdir -p backend/src/database

# 3. Dateien kopieren (aus dem bereitgestellten Paket)
cp database/schema.sql         backend/src/database/
cp database/databaseService.js backend/src/database/
cp database/migrateFromJson.js backend/src/database/

# 4. Services ersetzen
cp services/BaseRepository.js  backend/src/services/
cp services/counterService.js  backend/src/services/
cp services/customerService.js backend/src/services/
cp services/articleService.js  backend/src/services/
cp services/supplierService.js backend/src/services/
cp services/projectService.js  backend/src/services/
cp services/documentService.js backend/src/services/
cp services/fibuService.js     backend/src/services/
cp services/settingsService.js backend/src/services/
cp services/backupService.js   backend/src/services/

# 5. Config + Server ersetzen
cp config/paths.js             backend/src/config/paths.js
cp server.js                   backend/server.js
cp package.json                backend/package.json

# 6. Dependencies aktualisieren
cd backend && npm install
```

---

## Phase 3: Aufräumen – Dateien die rausfliegen

Diese Dateien werden **nicht mehr benötigt** und können gelöscht werden:

```
LÖSCHEN (nach erfolgreichem Test)
────────────────────────────────────────
backend/src/storage/fileStorage.js       ← Komplett ersetzt durch BaseRepository
backend/src/models/Customer.js           ← Validierung jetzt in Services
backend/src/models/Document.js           ← Validierung jetzt in Services
backend/src/models/Project.js            ← Validierung jetzt in Services
backend/src/models/Article.js            ← Validierung jetzt in Services
backend/src/models/Supplier.js           ← Validierung jetzt in Services
backend/src/storage/                     ← Ganzer Ordner
backend/src/models/                      ← Ganzer Ordner
```

> **Wichtig:** Erst löschen nachdem alle Tests bestanden sind!

---

## Phase 4: Was sich NICHT ändert

Diese Dateien bleiben **komplett unangetastet**:

```
UNVERÄNDERT (kein Eingriff nötig)
────────────────────────────────────────
backend/src/app.js                       ✓  Express-Setup, Routes, Middleware
backend/src/config/index.js              ✓  Config-Werte

backend/src/controllers/*                ✓  ALLE Controller bleiben identisch
  customerController.js                  ✓
  documentController.js                  ✓
  fibuController.js                      ✓
  articleController.js                   ✓
  supplierController.js                  ✓
  projectController.js                   ✓
  settingsController.js                  ✓
  backupController.js                    ✓
  pdfController.js                       ✓
  emailController.js                     ✓
  holidayController.js                   ✓
  updateController.js                    ✓

backend/src/routes/*                     ✓  ALLE Routes bleiben identisch

backend/src/services/emailService.js     ✓  Kein DB-Zugriff
backend/src/services/pdfService.js       ✓  Kein DB-Zugriff
backend/src/services/datevService.js     ✓  Bekommt Daten als Parameter
backend/src/services/updateService.js    ✓  Kein DB-Zugriff

backend/src/utils/logger.js             ✓
backend/src/utils/zipUtils.js           ✓
backend/src/middleware/errorHandler.js   ✓

frontend/*                               ✓  KOMPLETT unverändert
```

### Warum funktioniert das ohne Controller-Änderungen?

Die neuen Services exportieren **exakt die gleichen Funktionsnamen**:

```
customerService.getAllCustomers()         ← Gleicher Name
customerService.getCustomerById(id)      ← Gleicher Name
customerService.createCustomer(data)     ← Gleicher Name, gleiche Signatur
customerService.searchCustomers(query)   ← Gleicher Name

documentService.createQuoteOrInvoice()   ← Gleicher Name
documentService.invoiceFromQuote()       ← Gleicher Name
documentService.correctInvoice()         ← Gleicher Name
...

settingsService.getSettings()            ← Gleicher Name
settingsService.updateSettings(patch)    ← Gleicher Name
settingsService.saveLogo(file)           ← Gleicher Name
settingsService.deleteLogo()             ← Gleicher Name

fibuService.getAllFibu()                 ← Gleicher Name
fibuService.createExpense(body, file)    ← Gleicher Name
...
```

Die Controller merken keinen Unterschied — sie rufen dieselben Funktionen auf und bekommen dieselben camelCase-Objekte zurück.

---

## Phase 5: Erster Start & Migration

### 5.1 Start

```bash
cd backend
node server.js
```

### 5.2 Was beim ersten Start passiert

```
📂 Workspace: /pfad/zum/backend
🗄️  SQLite geöffnet: /pfad/zum/backend/data/pixframe.sqlite (NEU)
⚙️  Pragmas gesetzt (WAL, FK, 64MB Cache)
🏗️  Erstelle Schema v1 ...
✅ Schema erstellt.
🌱 Spiele Standard-Daten ein ...
✅ Defaults eingespielt.
✅ Datenbank bereit.

🔄 Alte JSON-Daten gefunden – starte einmalige Migration ...
═══════════════════════════════════════════════════════
  JSON → SQLite Migration gestartet
  Quelle: /pfad/zum/backend/data
═══════════════════════════════════════════════════════
  ✅ Migration erfolgreich abgeschlossen!
  Kunden:           1
  Artikel:          17
  Projekte:         1
  Dokumente:        1
    Positionen:     1
  Settings-Keys:    15
  Holiday-Caches:   6
═══════════════════════════════════════════════════════
✅ JSON-Dateien nach /data/_migrated_json/ archiviert.

================================================
  PixFrameWorkspace Backend läuft
  http://localhost:3001
  🗄️  DB: /pfad/zum/backend/data/pixframe.sqlite
================================================
```

### 5.3 Was mit den JSON-Dateien passiert

Die alten JSON-Dateien werden **nicht gelöscht** sondern nach `data/_migrated_json/` verschoben. Du kannst sie jederzeit inspizieren oder manuell löschen.

---

## Phase 6: Verifikation

### 6.1 Schnelltest Checkliste

Öffne das Frontend und teste diese Kernfunktionen:

```
□  Kunden-Liste laden                GET /api/customers
□  Kunden anlegen                    POST /api/customers
□  Kunden bearbeiten                 PUT /api/customers/:id
□  Kunden suchen                     GET /api/customers?search=...

□  Projekt anlegen                   POST /api/projects
□  Projekt-Details laden             GET /api/projects/:id
    → shootingDates, locations, team als Arrays vorhanden?

□  Angebot erstellen                 POST /api/documents/generate
    → Dokumentnummer korrekt generiert?
    → LineItems vorhanden?
□  Rechnung aus Angebot              POST /api/documents/:id/invoice
□  Status ändern                     PATCH /api/documents/:id/status

□  Einstellungen laden               GET /api/settings
□  Einstellungen speichern           PUT /api/settings

□  FiBu: Ausgabe anlegen             POST /api/fibu/expenses
□  FiBu: Fahrt anlegen               POST /api/fibu/mileage

□  Backup erstellen                  POST /api/backup
□  Backup-Liste laden                GET /api/backup

□  Artikel-Liste laden               GET /api/articles
□  Lieferanten-Liste laden           GET /api/suppliers
```

### 6.2 DB direkt prüfen

```bash
# SQLite CLI (falls installiert)
sqlite3 backend/data/pixframe.sqlite

sqlite> .tables
sqlite> SELECT COUNT(*) FROM customers;
sqlite> SELECT id, customer_number, first_name, last_name FROM customers;
sqlite> SELECT id, document_number, type, status, total FROM documents;
sqlite> SELECT * FROM counters;
sqlite> .quit
```

---

## Zusammenfassung der Architektur

```
                    Frontend (Vue 3 + Pinia)
                           │
                    ┌──────┴──────┐
                    │  Express    │  app.js (UNVERÄNDERT)
                    │  Routes     │  routes/* (UNVERÄNDERT)
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ Controllers │  controllers/* (UNVERÄNDERT)
                    └──────┬──────┘
                           │ require('../services/...')
                    ┌──────┴──────────────────────────┐
                    │          Services (NEU)          │
                    │                                  │
                    │  customerService   ─┐            │
                    │  projectService    ─┤            │
                    │  documentService   ─┤ extends    │
                    │  articleService    ─┤            │
                    │  supplierService   ─┘            │
                    │       │                          │
                    │  BaseRepository                  │
                    │       │                          │
                    │  counterService                  │
                    │  settingsService                 │
                    │  fibuService                     │
                    │  backupService                   │
                    └──────┬──────────────────────────┘
                           │ require('../database/databaseService')
                    ┌──────┴──────┐
                    │ Database    │  databaseService.js (Singleton)
                    │ Service     │  schema.sql
                    │             │  migrateFromJson.js
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │  SQLite     │  pixframe.sqlite (WAL mode)
                    │  (better-   │  data/pixframe.sqlite
                    │   sqlite3)  │
                    └─────────────┘
```

---

## Bekannte Sonderfälle

### datevService.js
Braucht keine Änderung. Der `fibuController` ruft `datevService.generateDatevCsv(fibu, settings, year, invoices)` mit bereits geladenen Daten auf. Die Daten kommen jetzt aus SQLite statt JSON, aber das Format ist identisch.

### pdfService.js
Kein DB-Zugriff. Bekommt alle Daten als Parameter vom `pdfController`. **Puppeteer wird in Phase 2 durch Electron Print API ersetzt** — das ist ein separates Refactoring.

### holidayController.js
Schreibt aktuell direkt in JSON-Dateien im `holiday_cache/`-Ordner. Die `holiday_cache`-Tabelle in SQLite ist vorbereitet, aber der Controller muss erst umgestellt werden. **Priorität: Niedrig** — funktioniert vorerst weiter mit Dateien.

### Electron-Integration (nächster Schritt)
Im `main.js` von Electron den Workspace-Pfad per ENV setzen:
```js
process.env.PIXFRAME_WORKSPACE = userChosenPath;
```
Der `server.js` und `paths.js` lesen diesen Pfad automatisch.
