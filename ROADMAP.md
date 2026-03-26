# PixFrameWorkspace — Roadmap
*Stand: v1.0.0-beta.1 · März 2026*
*Stack: Vue 3 + Pinia + Vite · Node.js + Express · JSON Storage (→ SQLite → PostgreSQL)*

---

## Aktueller Zustand

**Beta.** Alle Beta-Blocker behoben, alle Beta-Qualitäts-Features abgeschlossen.
Stabil für kontrollierte Einzelnutzung. Bekannte Bugs: siehe Beta-Popup beim Start.

Kontakt bei Bugs und Feedback: **markus.emanuel@gmail.com**

---

## Versionsschema

```
1.0.0-beta.1  ← aktuell
1.0.0-beta.2  ← nächster Pre-Release
1.0.0         ← stabile Version (nach E-Mail + Electron)
```

---

## Offene Punkte — Priorität 1

### E-Mail-Versand (`1.0.0`)
Infrastruktur vorhanden (`emailService.js`, SMTP-Tab in Einstellungen), aber nicht aktiviert.

**Noch fehlend:**
- Dokumente per Mail versenden (SendEmailModal fertig verdrahten)
- SMTP-Test-Funktion im Settings-Tab
- Template-Editor für Standard-Mailtext
- PDF-Anhang direkt aus Puppeteer

**Aufwand:** ~2 Tage

---

### Electron-Packaging (`1.0.0`)
Natives Desktop-Fenster statt Browser. Backend als Hintergrundprozess.

**Aufwand:** ~2 Tage

---

## Offene Punkte — Priorität 2

### PDF-Druck stabilisieren
- Gelegentliche Darstellungsfehler bei komplexen Layouts
- Logo im Header auf Folgeseiten
- Zeichenkodierung in Footer-Sonderzeichen

### DATEV-Export verbessern
- Export-Vorschau vor Download
- DATEV EXTF Format (statt CSV)

### Dashboard-Charts erweitern
- Auftragsstatus-Verteilung (Donut)
- Offene Forderungen

### ZUGFeRD erweitern
- EN-16931 Profile (MINIMUM → COMFORT)

---

## Langfristig geplant

| Feature | Aufwand | Voraussetzung |
|---|---|---|
| SQLite als Datenbankschicht | ~2 Tage | — |
| PostgreSQL + Docker | ~3–4 Tage | SQLite |
| Authentifizierung (JWT) | ~1 Woche | PostgreSQL |
| Multi-User / Team | ~2 Wochen | Auth + PostgreSQL |
| Auto-Update | ~1 Tag | — |

---

## Vollständig abgeschlossen

### Beta-Blocker (alle ✅)
| # | Beschreibung | Version |
|---|---|---|
| BB-1 | Path Traversal Fix in ZIP-Extraktion | v212 |
| BB-2 | Atomare Schreiboperationen | v212 |
| BB-3 | Placeholder-Texte im Vertragswerk | v212 |
| BB-4 | Race Condition Nummernvergabe → atomarer Counter | v212 |
| BB-5 | Ungenutzte Dependency entfernt | v212 |
| BB-6 | Settings-Cache implementiert | v212 |

### Beta-Qualität (alle ✅)
| # | Beschreibung | Version |
|---|---|---|
| BQ-1 | FiBu Beleg-Vorschau | v213 |
| BQ-2 | Dashboard Umsatz-Chart | v213 |
| BQ-3 | iCal-Export | v213 |
| BQ-4 | km-Pauschale konfigurierbar | v213 |
| BQ-5 | DATEV CSV-Export | v213 |
| BQ-6 | Mehrere Shooting-Termine | v215 |
| BQ-7 | Eingangsrechnungen | v215 |

### Kern-Features
- Vue 3 + Express + JSON-Speicher, vollständiges Design-System
- 7-Stufen-Auftragspipeline mit Sub-Komponenten
- Puppeteer PDF-Engine (9 Endpunkte, A4, Footer mit Firmendaten)
- Backup-System (ZIP, 10-Versionen-Rotation, Auto-Start)
- Update-System (ZIP mit Manifest-Vorschau, Auto-Neustart)
- GoBD-konformer Rechnungs-Workflow (Korrektur, Storno, Versionierung)
- FiBu: Einnahmen, Ausgaben, Fahrtenbuch, DATEV-Export, EAR-PDF
- Kalender mit Feiertagen + Schulferien
- Nummernkreise token-basiert (`{jjjj}`, `{mm}`, `{z,5}` …)
- macOS vollständig kompatibel (nodemon 3, iTerm2, Node-Check)
- B2B-Kalkulator mit Phasen und Nutzungsrechte-Modellen

---

## Beta-Checkliste

```
Beta-Blocker:  ✅ alle 6 behoben
Beta-Qualität: ✅ alle 7 umgesetzt

Für v1.0.0 verbleibend:
[ ] E-Mail-Versand vollständig aktiv
[ ] Electron-Packaging
```

---

*PixFrameWorkspace · v1.0.0-beta.1 · März 2026*
*Kontakt: markus.emanuel@gmail.com*
