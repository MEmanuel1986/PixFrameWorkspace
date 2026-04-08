# PixFrameWorkspace — Refactoring-Plan

> **Erstellt:** April 2026  
> **Basis:** Projektstruktur, README, project-files.txt, Tech-Stack-Analyse  
> **Ziel:** Wartbarkeit, Lesbarkeit und langfristige Erweiterbarkeit wiederherstellen

---

## Executive Summary

Das Projekt ist eine ambitionierte Fotografen-Studio-Software auf Vue 3 + Express-Basis mit solidem Architektur-Grundgerüst (Stores, Controller, Services, Routes getrennt). Das Problem: Mehrere Kerndateien sind über die Zeit zu Monolithen gewachsen, die schwer zu lesen, zu testen und zu erweitern sind. Der Refactoring-Plan schlägt **3 Prioritätsstufen** vor — von kritisch bis nice-to-have — und ist so formuliert, dass er inkrementell ohne Breaking Changes umgesetzt werden kann.

### 🟠 God-Files im Frontend — Ist-Zustand

Die kritischsten Schmerzpunkte nach Zeilenzahl (aus TD-2 der internen Roadmap):

| Datei | Zeilen (ca.) | Kernproblem |
|-------|-------------|-------------|
| `ProjectDetail.vue` | **~4.700+** | Gesamte Projektlogik, Workspace, PDF-Aktionen und Pipeline-Hooks in einer Datei |
| `Settings.vue` | **~3.200** | 12+ Tabs als monolithischer Block |
| `ProjectPipelineVertrag.vue` | **~1.700** | Vertragslogik allein größer als viele eigenständige Apps |
| `NewProjectForm.vue` | **~1.400** | B2B-Kalkulator und Formular-Logik untrennbar vermischt |

> **Konsequenz:** Nicht testbar, kaum reviewbar, Regressionrisiko bei jeder Änderung. Ziel-Version für die Auflösung: **v1.3.0**

Der Plan unten adressiert alle vier Dateien systematisch.

---

## 🔴 Priorität 1 — Kritisch (sofort angehen)

Diese Dateien sind die größten Schmerzpunkte nach bestätigten Zeilenzahlen und sollten als erstes aufgeteilt werden.

### 1.1 `frontend/src/pages/Settings.vue` → Tab-Komponenten aufteilen

**Ist-Zustand:** ~3.200 Zeilen — 12+ Tabs als Monolith. Jeder Tab hat eigene Felder, Validierungslogik und API-Calls, alles in einer einzigen `.vue`-Datei. **Nicht testbar, kaum reviewbar.**

**Lösung — Neue Struktur:**

```
frontend/src/pages/settings/
├── SettingsPage.vue              ← nur Tab-Navigation + <component :is>
├── tabs/
│   ├── SettingsTabStudio.vue     ← Firmendaten, Logo, Steuer, Bank
│   ├── SettingsTabNummern.vue    ← Token-basierte Nummernkreis-Schemas
│   ├── SettingsTabAuftrag.vue    ← Stundensätze, Zahlungsarten, Storno
│   ├── SettingsTabRechtsdoks.vue ← Vertrag, AGB, DSGVO, ADV (Textarea-Editor)
│   ├── SettingsTabEmail.vue      ← SMTP-Konfiguration (in Entwicklung)
│   ├── SettingsTabDarstellung.vue← Theme, Schrift
│   └── SettingsTabSystem.vue     ← Backup, Update, Systeminfos
└── composables/
    └── useSettingsForm.js        ← Gemeinsame Speichern/Validierungs-Logik
```

**Vorgehen:**
1. `SettingsPage.vue` behält nur die Tab-Navigation mit dynamischem `<component :is="activeTab">`.
2. Jeden Tab-Inhalt 1:1 in die neue Datei ausschneiden — kein Logic-Refactoring in diesem Schritt.
3. Gemeinsame Hilfsfunktionen (z.B. `saveSettings`, Toast-Handling) in `useSettingsForm.js` extrahieren.

---

### 1.2 `frontend/src/pages/ProjectDetail.vue` — God-File zerschlagen

**Ist-Zustand:** ~4.700+ Zeilen — die mit Abstand größte Datei im Projekt. Enthält gesamte Projektlogik, Workspace-Layout, alle PDF-Aktionen, Pipeline-Hooks und Berechnungen in einer einzigen Datei. Die 7 `ProjectPipeline*.vue`-Subkomponenten existieren bereits, aber `ProjectDetail.vue` orchestriert alles und trägt noch enorm viel eigene Logik.

**Lösung:**

```
frontend/src/pages/project/
├── ProjectDetailPage.vue         ← nur Layout + Pipeline-Koordination (<150 Zeilen Ziel)
└── composables/
    ├── useProjectLoader.js       ← API-Call + Reaktivität für Projektdaten
    ├── useProjectCalculator.js   ← B2B-Kalkulator, Rüstzeiten, MFM-Berechnung
    ├── useProjectDocuments.js    ← Dokument-Aktionen (create, cancel, correct)
    └── useProjectPipeline.js     ← Status-Übergänge, Pipeline-Guards
```

**Aufwand:** ~2–3 Tage · **Ziel-Version:** v1.3.0

---

### 1.3 `frontend/src/components/NewProjectForm.vue` — Kalkulator herauslösen

**Ist-Zustand:** ~1.400 Zeilen — B2B-Kalkulator und Formular-Logik sind untrennbar vermischt. Der Kalkulator (Rüstzeiten, Stundensätze, Nutzungsrechte) ist eigenständige Business-Logik, die nichts im Formular-Template zu suchen hat.

**Lösung:**

```
frontend/src/components/project/
├── NewProjectForm.vue              ← nur Formular-Felder + Submit (~300 Zeilen Ziel)
├── ProjectCalculatorPanel.vue      ← B2B-Kalkulator als eigenständige Komponente
└── composables/
    ├── useNewProjectForm.js        ← Formular-State, Validierung, Submit
    └── useProjectCalculator.js     ← Kalkulator-Logik (wiederverwendbar in ProjectDetail)
```

> **Bonus:** `useProjectCalculator.js` kann dann auch von `ProjectDetail.vue` importiert werden — DRY-Prinzip.

**Aufwand:** ~1–2 Tage · **Ziel-Version:** v1.3.0

---

### 1.4 `frontend/src/components/project/ProjectPipelineVertrag.vue` — Vertragslogik aufteilen

**Ist-Zustand:** ~1.700 Zeilen — die Vertragskomponente ist allein größer als viele eigenständige Anwendungen. Sie verwaltet Vertragsanzeige, Unterschriftsprozess, PDF-Download, ADV-Anhänge und Nachtragsverwaltung in einer Datei.

**Lösung:**

```
frontend/src/components/project/vertrag/
├── ProjectPipelineVertrag.vue      ← Koordination + Vertrags-Status (~200 Zeilen Ziel)
├── VertragAnzeige.vue              ← Vertragsvorschau + Unterschriftsstatus
├── VertragNachtraege.vue           ← Nachtragsliste + Nachtrag hinzufügen
├── VertragAdv.vue                  ← ADV-Vertrag separat
└── composables/
    └── useVertragActions.js        ← PDF-Download, Unterschrift, Statuswechsel
```

**Aufwand:** ~2–3 Tage · **Ziel-Version:** v1.3.0

---

### 1.5 `frontend/src/pages/FiBu.vue` → FiBu-Submodule

**Problem:** Die FiBu-Seite verwaltet mindestens 4 völlig eigenständige Module — Einnahmen/Rechnungen, Ausgaben (mit Belegupload), Eingangsrechnungen und Fahrtenbuch — plus EÜR-Ausdruck und DATEV/iCal-Export. Das sind de facto 4 Mini-Applikationen in einer Datei.

**Lösung — Neue Struktur:**

```
frontend/src/pages/fibu/
├── FiBuPage.vue                  ← Tab-Navigation, Jahr-Selektor
├── tabs/
│   ├── FiBuEinnahmen.vue         ← Rechnungs-Einnahmen (read-only aus Dokumenten)
│   ├── FiBuAusgaben.vue          ← Ausgaben + Belegupload
│   ├── FiBuEingangsrechnungen.vue← Lieferanten-Eingangsrechnungen
│   └── FiBuFahrtenbuch.vue       ← Fahrtenerfassung + automatische Einträge
├── components/
│   ├── FiBuSummaryCard.vue       ← Jahres-Übersichtskarte
│   ├── FiBuExportBar.vue         ← EÜR, DATEV CSV, iCal Buttons
│   └── BelegUpload.vue           ← Wiederverwendbare Upload-Komponente
└── composables/
    └── useFiBuFilters.js         ← Jahres-/Kategorie-Filter-Logik
```

**Vorgehen:** Gleich wie Settings — zunächst nur ausschneiden, dann in einem zweiten Schritt die Composables extrahieren.

---

### 1.6 `backend/src/services/pdfService.js` → Template-Splitting

**Problem:** Die `pdfService.js` enthält wahrscheinlich alle 9 PDF-Templates als inline HTML-Strings innerhalb eines einzigen Files. Puppeteer-Templates mit hunderten Zeilen HTML direkt im JS-Code sind extrem schwer zu lesen und zu warten.

**Lösung — Neue Struktur:**

```
backend/src/services/pdf/
├── pdfService.js                 ← nur: launch(), renderHtml(), generatePdf()
├── renderer.js                   ← gemeinsame Puppeteer-Wrapper-Logik
├── templates/
│   ├── document.template.js      ← Rechnung / Angebot / Stornorechnung
│   ├── contract.template.js      ← Fotovertrag mit Logo-Header
│   ├── adv.template.js           ← ADV-Vertrag
│   ├── addendum.template.js      ← Nachtrag
│   ├── agb.template.js           ← AGB
│   ├── dsgvo.template.js         ← Datenschutzerklärung
│   ├── advVertrag.template.js    ← ADV-Standardvertrag
│   ├── ear.template.js           ← EÜR
│   └── blankContract.template.js ← Blanko-Vertrag
└── shared/
    ├── pdfHeader.js              ← Wiederverwendbarer Logo-Header
    ├── pdfFooter.js              ← Seitenzahl, Adresszeile
    └── pdfStyles.js              ← Gemeinsames CSS (A4, Fonts, Print-Overrides)
```

Jedes Template exportiert eine Funktion `generateHtml(data)`, die einen vollständigen HTML-String zurückgibt. `pdfService.js` importiert das benötigte Template und ruft `renderer.js` auf.

---

## 🟡 Priorität 2 — Wichtig (innerhalb der nächsten Wochen)

### 2.1 `backend/src/services/documentService.js` — State Machine auslagern

**Problem:** `documentService.js` verwaltet einen komplexen Zustandsautomaten für Dokumente (generate → revise → correct → cancel → status-Übergänge mit GoBD-Konformität, Versionierung, atomarer Nummernvergabe). Das ist Business-kritische Logik, die aktuell wahrscheinlich in einer einzigen großen Service-Datei steckt und damit schwer isoliert testbar ist.

**Lösung:**

```
backend/src/services/document/
├── documentService.js            ← öffentliche API (CRUD + Orchestrierung)
├── documentStateMachine.js       ← Status-Übergänge mit Guards (GoBD)
├── documentNumbering.js          ← atomare Nummernvergabe (counterService wrappen)
├── documentVersioning.js         ← Revisionierung, KOR-, STORNO-Logik
└── zugferdService.js             ← ZUGFeRD 2.3 XML (bereits frontend/src/services/zugferd.js — Backend-Version erstellen)
```

---

### 2.2 `frontend/src/stores/useStore.js` — Store aufteilen

**Problem:** Ein generischer `useStore.js` deutet auf einen alten Catch-All-Store hin, der nie aufgeteilt wurde, obwohl bereits spezialisierte Stores existieren (`useProjectDetailStore`, `useInvoiceStore`, `useContractStore`, `useQuoteStore`, `useSettings`).

**Vorgehen:**
1. Analysieren, was `useStore.js` noch enthält (Kunden, Dokumente, Artikel?).
2. Für jeden verbleibenden Bereich einen spezialisierten Store anlegen:
   - `useCustomerStore.js`
   - `useArticleStore.js`
   - `useDocumentStore.js` (falls noch nicht vorhanden)
3. `useStore.js` als leeren Re-Export der neuen Stores kurz weiterführen, dann entfernen.

---

### 2.3 Doppelte Changelog-Dateien bereinigen

**Problem:** Sowohl `CHANGELOG.md` als auch `CHANGELOG.txt` existieren — das ist redundant und fehleranfällig.

**Lösung:** `CHANGELOG.txt` löschen, nur `CHANGELOG.md` pflegen. Im README-Verweis anpassen.

---

### 2.4 `frontend/src/services/zugferd.js` — Backend-Migration

**Problem:** ZUGFeRD-XML-Generierung gehört in den Backend-Kontext (Serverside PDF-Generierung), nicht ins Frontend. Die Frontend-Datei kann Clients eventuell direkte XML-Generierung ermöglichen, ohne serverseitige Validierung.

**Lösung:** ZUGFeRD-Logik in `backend/src/services/document/zugferdService.js` verlagern und über einen eigenen Endpunkt `/api/documents/:id/zugferd` exponieren.

---

## 🟢 Priorität 3 — Nice to Have (mittelfristig)

### 3.1 Datenbank-Migration (JSON → SQLite) abschließen

**Status:** `backend/src/database/schema.sql` und `migrateFromJson.js` existieren bereits — die Migration ist vorbereitet, aber offenbar noch nicht aktiviert.

**Vorgehen:**
1. `databaseService.js` auf SQLite umschalten (better-sqlite3 ist für Node empfohlen, da synchron und kein Callback-Hell).
2. `BaseRepository.js` als generischen SQLite-Adapter fertigstellen.
3. Alle Services schrittweise auf `BaseRepository` umstellen (beginnen mit `articleService`, da am einfachsten).
4. JSON-Dateien in `data/` als Backup behalten, aber nicht mehr primär lesen.

**Reihenfolge:** articles → customers → suppliers → projects → documents → fibu → settings

---

### 3.2 Gemeinsame Vue-Composables für API-Fehlerbehandlung

**Problem:** `try/catch`-Blöcke mit Toast-Notifications sind wahrscheinlich in jedem Store und vielen Komponenten dupliziert.

**Lösung:**

```javascript
// frontend/src/composables/useApiCall.js
export function useApiCall() {
  const loading = ref(false)
  const error = ref(null)

  async function call(fn, successMsg) {
    loading.value = true
    error.value = null
    try {
      const result = await fn()
      if (successMsg) toast.success(successMsg)
      return result
    } catch (e) {
      error.value = e.message
      toast.error(e.response?.data?.message ?? e.message)
    } finally {
      loading.value = false
    }
  }

  return { loading, error, call }
}
```

---

### 3.3 Print-Views in eigenes Verzeichnis

**Problem:** 10 Print-Views (`*Print.vue`) liegen direkt in `frontend/src/pages/` neben den regulären App-Seiten. Das macht die Übersicht schwieriger.

**Lösung:**

```
frontend/src/pages/print/
├── DocumentPrint.vue
├── ContractPrint.vue
├── AdvPrint.vue
├── AdvVertragPrint.vue
├── AddendumPrint.vue
├── AgbPrint.vue
├── BlankContractPrint.vue
├── DsgvoPrint.vue
└── EarPrint.vue
```

Router-Pfade bleiben identisch (`/print/document/:id`), nur die physische Dateistruktur ändert sich.

---

### 3.4 TypeScript (optional, langfristig)

Vue 3 + Vite unterstützen TypeScript nativ. Da das Projekt noch in der Beta-Phase ist, wäre jetzt der ideale Zeitpunkt für eine schrittweise Migration:

1. `tsconfig.json` hinzufügen + `vite.config.js` anpassen
2. Neue Composables direkt in `.ts` schreiben
3. Stores mit typisiertem State versehen
4. Bestehende `.vue`-Dateien schrittweise auf `<script setup lang="ts">` umstellen

**Hinweis:** Nur empfohlen, wenn das Projekt langfristig gewartet werden soll und kein harter Zeitdruck besteht.

---

## Umsetzungs-Roadmap

| Phase | Version | Inhalt | Aufwand |
|-------|---------|--------|---------|
| **Phase 1a** | v1.3.0 | `ProjectDetail.vue` (~4.700 Z.) → Composables + Koordinator | 2–3 Tage |
| **Phase 1b** | v1.3.0 | `Settings.vue` (~3.200 Z.) → 12 Tab-Komponenten | 2–3 Tage |
| **Phase 1c** | v1.3.0 | `ProjectPipelineVertrag.vue` (~1.700 Z.) → Subkomponenten | 2–3 Tage |
| **Phase 1d** | v1.3.0 | `NewProjectForm.vue` (~1.400 Z.) → Formular + Kalkulator trennen | 1–2 Tage |
| **Phase 1e** | v1.3.0 | `FiBu.vue` → 4 Tab-Komponenten + Export-Bar | 1–2 Tage |
| **Phase 2a** | v1.4.0 | `pdfService.js` → 9 Template-Dateien extrahieren | 1 Tag |
| **Phase 2b** | v1.4.0 | `documentService.js` → State Machine auslagern | 1–2 Tage |
| **Phase 2c** | v1.4.0 | `useStore.js` aufräumen → spezialisierte Stores | 1 Tag |
| **Phase 3** | v1.5.0 | Print-Views verschieben, Changelog bereinigen, ZUGFeRD ins Backend | 1 Tag |
| **Phase 4** | laufend | SQLite-Migration schrittweise abschließen | — |

---

## Regeln für dieses Refactoring

Um während des Refactorings keine Bugs einzuführen, gelten diese Grundregeln:

**1. Kein Logic-Refactoring beim Splitten.**  
Wenn eine Datei aufgeteilt wird, wird der Code 1:1 verschoben, nicht verändert. Optimierungen kommen in einem separaten Commit danach.

**2. Ein Feature pro Commit.**  
Z.B.: `refactor: split Settings.vue into 7 tab components` — kein Mischen mit anderen Änderungen.

**3. Manuelle Smoke-Tests nach jedem Schritt.**  
Jeden aufgeteilten Bereich einmal manuell durchklicken, bevor der nächste angegangen wird.

**4. Git-Branch pro Phase.**  
`refactor/phase-1-settings`, `refactor/phase-1-fibu`, etc. — so kann jede Phase unabhängig reviewt und gemergt werden.

---

## Bekannte Risiken

| Risiko | Wahrscheinlichkeit | Mitigierung |
|--------|-------------------|-------------|
| ProjectDetail-Split bricht Pipeline-Koordination | hoch | Pro Composable einzeln extrahieren + testen, nicht alles auf einmal |
| Props/Emit-Ketten durch Tab-Splitting (Settings/FiBu) | mittel | Pinia-Store als Datenaustausch statt Props |
| NewProjectForm-Split: Kalkulator-State verloren | mittel | `useProjectCalculator.js` zuerst schreiben + isoliert testen |
| PipelineVertrag-Split bricht Unterschriftsprozess | mittel | Vertrag-Flow manuell end-to-end testen nach jedem Schritt |
| Router-Links brechen bei Print-Views-Verschiebung | niedrig | Router-Aliase oder Redirect-Regeln ergänzen |
| pdfService-Refactoring bricht PDF-Rendering | mittel | Nach jedem Template einzeln testen |
| SQLite-Migration: Datenverlust | niedrig | JSON-Backups behalten + Migrations-Script dry-run |

---

*Ende des Refactoring-Plans — © PixFrameWorkspace Projektanalyse 2026*
