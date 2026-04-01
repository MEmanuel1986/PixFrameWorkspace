# PixFrameWorkspace — Vollständiges Changelog
*Entwicklungsbeginn: 06. März 2026*

---

## v1.1.1 — Hotfixes & Cleanup
*01. April 2026*

### Fixes
- cleanup-project.ps1 und project-files.txt entfernt
- multer Dependency entfernt (nicht genutzt)
- Versionsnummer im Health-Endpoint korrigiert

---

## v1.1.0 — SQLite, Electron, neue PDF-Engine
*26.–28. März 2026*

### Highlights
- Migration JSON → SQLite (better-sqlite3, WAL, FK, Indizes)
- Electron Desktop-App (Vue + Express integriert)
- PDF-Engine ersetzt (Puppeteer → Electron printToPDF)
- Backup-System erweitert (VACUUM INTO, Restore kompatibel)

### Details

#### Datenbank
- Automatische Migration inkl. Archivierung alter JSON-Daten
- Generisches Repository-System (CRUD, Mapping, Cache)

#### Electron
- Dev/Prod-Modus getrennt
- Frei wählbarer Workspace
- IPC-Bridge + sauberer Shutdown

#### PDF
- Kein Chromium-Download mehr (~150MB weniger)
- Direkter PDF-Export ohne Dialog
- CSS-basierte Layoutsteuerung

#### Backup
- Konsistente Snapshots ohne Locking
- Auto-Backup beim Start

---


---

## v232 — Vertragsreiter: NR-Daten aus Anfrage, Werbung entfernt
*März 2026*

**Nutzungsrechte & Veröffentlichung — Karte neu aufgebaut**
- Chip "Werbung / Marketing" entfernt. Nur noch: Privatkunde | B2B / Kommerziell
- usageType wird jetzt initial aus clientIsCompany der Anfrage gesetzt (B2B -> commercial)
- Wenn B2B + NR in der Anfrage aktiviert: neue Info-Box "Werbliche Nutzungsrechte"

*Simple-Modus:* Nutzungsarten als Chips, Laufzeit, Geltungsbereich, NR-Zuschlag (€)
*designaustria-Modus:* Nutzungsart, Thema, Geltungsgebiet, Laufzeit, Auftragsart,
  Kalkulations-Faktor (mit Hinweis designaustria)

Alles readonly — Änderungen nur über Anfrage bearbeiten.
Hinweis-Zeile am Ende der Info-Box.
frontend/src/components/project/ProjectPipelineVertrag.vue
frontend/src/pages/ProjectDetail.vue

---


## v232 — Fix: NR-Zuschlag wurde nicht in contractData gespeichert (B2B)
*März 2026*

Im B2B+Stunden-Modus gibt usageSurchargeAbs absichtlich 0 zurück (Doppelzählung vermeiden).
Dadurch wurde usageRightsSurcharge = 0 gespeichert und die NR-Position erschien nie im Angebot.

Fix: beim Speichern wird jetzt unterschieden:
- B2B + Stunden: usageRightsSurcharge = b2bImageNR + b2bVideoNR
- Alle anderen Modi: usageRightsSurcharge = usageSurchargeAbs
frontend/src/components/NewProjectForm.vue

---


## v232 — Privat-Stunden: leistungsaufgeschlüsselt mit Bildpaket
*März 2026*

**Anfrageformular — Privat + Stunden neu aufgebaut**
Statt einem einzigen Stundensatz-Feld gibt es jetzt getrennte Blöcke je aktivierter Leistung:
- 📷 Fotografie: Stundensatz Privat + geplante Stunden + optionales Bildpaket (Anzahl × Bildpreis)
- 🎬 Videografie: Stundensatz Privat + geplante Stunden
- Gesamtübersicht: Foto + Bilder + Video = Gesamtbetrag netto
Neue contractData-Felder: hourlyRatePhotoPrivat, hourlyRateVideoPrivat,
estimatedHoursPhoto, estimatedHoursVideo, imageCountPrivat, imagePricePrivat.
Rückwärtskompatibel: hourlyRate/estimatedHours bleiben als Fallback.

**Angebot + Rechnung: Privat-Positionen vollständig aufgeschlüsselt**
quotePrefillItems und prefillFromContract erzeugen jetzt je nach Konstellation:
- Fotografie (h × Satz) · Bildpaket Digital (n Bilder × Preis)
- Videografie (h × Satz)
Alle Werte kommen aus den gespeicherten Auftrags-Feldern, Fallback auf Einstellungen.
`frontend/src/components/NewProjectForm.vue` · `frontend/src/pages/ProjectDetail.vue`

---


## v232 — Fix: Angebot wird jetzt mit Anfrage-Positionen vorbefüllt
*März 2026*

Die Infrastruktur war vorhanden (quotePrefillItems computed, InlineQuoteForm-Prop), aber
`quoteStore.quotePrefillItems` wurde nie gesetzt bevor das Formular geöffnet wurde.

Fix: `openQuoteFromProject()` setzt jetzt `quoteStore.quotePrefillItems = quotePrefillItems.value`
bevor `quoteFormOpen = true`. Beim Schließen/Erstellen wird der Wert wieder auf null gesetzt.
`frontend/src/pages/ProjectDetail.vue`

---


## v232 — Angebot wird mit Anfrage-Artikeln vorbefüllt
*März 2026*

**quotePrefillItems komplett neu**
Das Angebot wird jetzt mit allen konfigurierten Positionen aus dem Anfrageformular vorbefüllt —
identische Logik wie die Rechnungs-Vorbefüllung.

*B2B + Stunden:*
- Fotografie Vorbereitung & Meetings (Rüstzeitsatz, nur wenn > 0h)
- Fotografie Shooting & Bildbearbeitung (Hauptstundensatz, nur wenn > 0h)
- Videografie Vorbereitung & Meetings (Rüstzeitsatz)
- Videografie Dreh & Schnitt (Hauptstundensatz)
- Bildpaket Digital (Anzahl × B2B-Bildpreis)
- Videoproduktion (Anzahl × Videopreis)
- Nutzungsrechte / Lizenz (NR-Zuschlag + dynamische Beschreibung per buildNRDescription)

*B2B + Pauschal:*
- Pauschale Arbeitsleistung + Bildpaket + Videopaket + Nutzungsrechte

*Privat + Stunden:*
- Einfacher Stundensatz pro Leistung (Fotografie, Videografie)
- Getting Ready, Danksagungskarten (Preis 0 als Platzhalter)

*Privat + Pauschal:*
- Pauschalbetrag mit Leistungsbeschreibung aus flatRateIncludes
`frontend/src/pages/ProjectDetail.vue`

---


## v232 — NR-Artikelbeschreibung dynamisch pro Auftrag
*März 2026*

**Nutzungsrechte-Position: dynamische Beschreibung je Auftrag**
Der Artikel „Nutzungsrechte / Lizenz" in der Rechnung/Abrechnung bekommt jetzt eine
vollständige, auftragsindividuelle Beschreibung — generiert aus der im Anfrageformular
gespeicherten NR-Konfiguration des jeweiligen Auftrags.

*Simple-Modus:*
Beispiel: `Nutzungsarten: Print / OOH (Anzeigen, Plakate), Online / Social Media · Laufzeit: 1 Jahr · Geltungsbereich: National (D/AT/CH)`

*designaustria-Modus:*
Beispiel: `Zweckgebundenes Werknutzungsrecht · Geltungsgebiet: National · Laufzeit: 1 Jahr · Thema: Produkt-Werbung · Bildstatus: Hauptelement · Auftragsart: Einzelauftrag · Kalkulations-Faktor: 1.125 (nach Richtlinien designaustria)`

Der Preis bleibt wie bisher auftragsspezifisch aus `contractData.usageRightsSurcharge`.
Der Artikel ART-00012 im Stamm hat weiterhin Preis 0 — er ist nur Vorlage/Kategorie.
`frontend/src/pages/ProjectDetail.vue`

---


## v232 — Bildpaket in Pauschal, Auto-Artikelsync, NR-Artikel
*März 2026*

**Pauschal B2B: Bildpaket in Gesamtübersicht**
Die Zusammenfassung im Pauschal-Modus zeigt jetzt alle Positionen:
Pauschale Arbeitsleistung + Bildpaket (Anzahl × Preis) + Videopaket + NR-Zuschlag = Gesamtpauschale.

**Automatische Artikelpreis-Synchronisation**
Wenn in Einstellungen → Buchung & Storno Stundensätze oder Preise geändert und gespeichert werden,
aktualisiert der Backend-Service die entsprechenden Artikel in `articles.json` sofort atomar.
Mapping: 10 Artikel-IDs → bookingTerms-Felder. art-km-minus bekommt immer den negativen km-Satz.
`backend/src/services/settingsService.js`

**Neuer Artikel: Nutzungsrechte / Lizenz (ART-00012)**
Platzhalter-Artikel mit Preis 0 und Flag `autoFromNR: true`. Dient als Artikelstamm-Vorlage.
Beim Prefill der Rechnungspositionen aus dem Vertrag wird automatisch eine Position
„Nutzungsrechte / Lizenz" mit dem im Auftragsformular berechneten NR-Zuschlagsbetrag eingefügt —
ebenso Bildpaket und Videoproduktion sofern konfiguriert.
`backend/data/articles.json` · `frontend/src/pages/ProjectDetail.vue`

---


## v232 — Pauschal-Umbau, Rüstzeiten B2B, Individuell entfernt
*März 2026*

**Preismodell: "Individuell" entfernt**
Nur noch ⏱ Stunden und 📦 Pauschal. Kein separater Freitext-Modus mehr.
`frontend/src/components/NewProjectForm.vue`

**Pauschal-Block komplett neu**
- Pauschalbetrag (€ netto) + Freitext-Textarea „Enthaltene Leistungen" (erscheint im Vertrag)
- B2B: darunter Bilder/Videos-Inputs + vollständiger NR-Kalkulator (Simple oder designaustria)
  mit Zusammenfassung Pauschale + NR-Zuschlag = Gesamtpauschale
- Privat: nur Betrag + Leistungsbeschreibung

**Rüstzeiten B2B in Einstellungen + Artikelstamm**
Neues Feld „Rüstzeit B2B" für Fotografie und Videografie in Einstellungen → Buchung & Storno.
Standard: 100 €/h (Vorbereitung, Briefing, Meetings, Projektkoordination).
B2B-Hauptstundensätze auf 200 €/h gesenkt.
Zwei neue Artikel: ART-00010 „Fotografie – Rüstzeit B2B" und ART-00011 „Videografie – Rüstzeit B2B".
`frontend/src/pages/Settings.vue` · `backend/data/settings.json` · `backend/data/articles.json`

**Phasen-Kalkulator: Rüstzeitsatz für Vorbereitung + Abstimmung**
Die Phasen-Zeilen sind jetzt zweigeteilt:
- Vorbereitung/Konzeption + Abstimmung/Meetings → **Rüstzeitsatz** (gelb markiert)
- Shooting/Bearbeitung bzw. Dreh/Schnitt → **Hauptstundensatz**
`b2bPhotoNet` und `b2bVideoNet` rechnen mit den korrekten Sätzen je Phase.

---


## v232 — Zwei NR-Modelle wählbar + Umstrukturierung B2B-Kalkulator
*März 2026*

**Einstellungen → Buchung & Storno: NR-Modell auswählbar**
Neue Karte "©️ Nutzungsrechts-Modell" — Wahl zwischen:
- **Einfach**: Prozentzuschlag nach Nutzungsart (Print/OOH, Online/Social, TV/Video,
  PR/Redaktion), Laufzeit (1 Jahr / 2 Jahre / Unbegrenzt) und Gebiet
  (Regional / National / International). Schnell, intuitiv.
- **designaustria**: Faktor-Multiplikation über 6 Dimensionen (unverändert).
Neues Feld:  ('simple' | 'designaustria').

**Anfrageformular B2B: Struktur neu geordnet**
Reihenfolge jetzt: Phasen (Stunden) → Bilder/Videos → Nutzungsrechte → Formel-Summen.
Die Kalkulationszeilen (Fotografie-Summe / Videografie-Summe) erscheinen **nach** dem
NR-Block — damit steht der NR-Zuschlag direkt über der Endsumme.

**Simple NR-Modus im Anfrageformular**
Vier anklickbare Kacheln (🖨 Print/OOH, 🌐 Online/Social, 📺 TV/Video, 📰 PR/Redaktion),
je mit Hover-Tooltip (Erklärung was enthalten ist). Laufzeit + Gebiet klappen auf wenn
mind. eine Kachel aktiv. Mini-Zusammenfassung zeigt Bild-/Videosumme + Zuschlag%.
Die Zuschlagstabelle folgt MFM-Empfehlungen (z.B. Online/National/1 Jahr = 20%).

**NR-Faktor in Formelzeilen**
Im Simple-Modus:  · Im designaustria-Modus: .
Beide Modi berechnen identisch:  (additiv).

 · 


---


## v232 — Fix: NR-Faktor wurde doppelt gerechnet
*März 2026*

Im B2B-Stunden-Modus wurde der Nutzungsrechtsfaktor doppelt angewendet:
einmal in der Phasenkalkulation (b2bImageNR / b2bVideoNR) und ein zweites
Mal über usageSurchargeAbs auf die bereits korrekte Gesamtsumme.

Fix: usageSurchargeAbs gibt im B2B-Stunden-Modus 0 zurück — der NR-Zuschlag
steckt ausschließlich in den Phasen-Computeds. Der Nutzungsrechte-Block zeigt
im B2B-Modus nur noch den bereits eingerechneten Betrag als Info-Zeile an,
nicht als zusätzlichen Posten.
frontend/src/components/NewProjectForm.vue

---


## v232 — Fix: Korrektur der B2B-Kalkulations-Formel
*März 2026*

Die Berechnung der B2B-Auftragskosten war falsch — der NR-Faktor wurde mit der
Bildsumme multipliziert statt additiv aufgeschlagen. Korrekte Formel:

```
Stunden-Summe  = h × Stundensatz
Bild-Summe     = Bilder × Bildpreis
NR-Zuschlag    = Bild-Summe × NR-Faktor  (additiv!)
Gesamt         = Stunden-Summe + Bild-Summe + NR-Zuschlag
```

Die Formelanzeige im Formular wurde auf eine tabellarische Zeilenstruktur
umgestellt: jede Position (Stunden, Bilder, NR-Zuschlag) bekommt eine eigene
Zeile mit Beschreibung, Rechenschrittausdruck und Betrag. Die Gesamtzeile
ist farblich hervorgehoben.
`frontend/src/components/NewProjectForm.vue`

---


## v221 — Fix: HTML-Warnings <tr> ohne <tbody> in Settings.vue
*März 2026*

Vite/Vue-Hydration-Warnings behoben: alle `ur-ref-table`-Tabellen in
`Settings.vue` (Nutzungsrechte-Faktor-Referenz) fehlten ein `<tbody>`-Element.
`<tr>` darf laut HTML-Spec kein direktes Kind von `<table>` sein.
In alle 6 Tabellen der Referenzkarte wurde `<tbody>` / `</tbody>` ergänzt.
`frontend/src/pages/Settings.vue`

---


## v220 — Leistungen nach oben + B2B-Kalkulator gesteuert durch Leistungen + neue Formel
*März 2026*

**Leistungen direkt unter Kundenstatus**
Der Leistungs-Chip-Block (📷 Fotografie, 🎬 Videografie, 💌 Danksagung, 💄 Getting Ready)
wurde aus dem unteren Bereich „Honorar & Konditionen" nach ganz oben direkt neben den
Kundenstatus verschoben. Damit sind die wesentlichen Auftragsdaten auf einen Blick sichtbar.
`frontend/src/components/NewProjectForm.vue`

**B2B-Phasen-Kalkulator jetzt leistungsgesteuert**
Die Fotografie-Phasenblöcke erscheinen nur noch wenn „📷 Fotografie" aktiviert ist,
die Videografie-Phasenblöcke nur wenn „🎬 Videografie" aktiviert ist.
Keine überflüssigen Felder mehr bei reinen Foto- oder reinen Video-Aufträgen.

**Neue Kalkulationsformel für B2B**
Getrennte Summen je Sparte, jeweils mit Nutzungsrechtsfaktor auf Bild-/Videopreise:

```
Fotografie-Summe  = (Foto-Stunden × Foto-Stundensatz)
                  + (Anzahl Bilder × Bildpreis B2B × NR-Faktor)

Videografie-Summe = (Video-Stunden × Video-Stundensatz)
                  + (Anzahl Videos × Videopreis × NR-Faktor)

Gesamt = Fotografie-Summe + Videografie-Summe
```

Der NR-Faktor wird aus dem designaustria-Nutzungsrechte-Kalkulator übernommen
(nur wenn aktiviert, sonst Faktor 1). Die Formel wird live als lesbarer Ausdruck
unter den jeweiligen Blöcken angezeigt (z.B. `(8h × 250€) + (20 Bilder × 80€ × 1.125 NR) = 3.800 €`).

Bilder/Anzahl und Preisfelder wurden direkt in den jeweiligen Leistungsblock integriert —
Foto-Bilder gehören zum Foto-Block, Video-Einheiten zum Video-Block.

`frontend/src/components/NewProjectForm.vue`

---

## v219 — Artikelstamm-Neuaufstellung + B2B-Phasen-Kalkulator im Anfrageformular
*März 2026*

**Artikelstamm komplett neu aufgestellt**
Alle 8 alten Platzhalter-Artikel gelöscht und durch 9 strukturierte Stammartikel ersetzt:

| Nr. | Bezeichnung | Preis |
|---|---|---|
| ART-00001 | Fotografie – Stundensatz (Privat) | 250 €/h |
| ART-00002 | Fotografie – Stundensatz (B2B) | 250 €/h |
| ART-00003 | Videografie – Stundensatz (Privat) | 250 €/h |
| ART-00004 | Videografie – Stundensatz (B2B) | 250 €/h |
| ART-00005 | Kilometerpauschale | 0,50 €/km |
| ART-00006 | Kilometerpauschale (Gutschrift) | −0,50 €/km |
| ART-00007 | Einzelbild – Digital (B2B) | 80 €/Bild |
| ART-00008 | Einzelbild – Digital (Privat) | 40 €/Bild |
| ART-00009 | Videoproduktion – 10 Minuten | 1.200 €/Stück |

`backend/data/articles.json`

**Einstellungen → Buchung & Storno: 4 Stundensätze + Standardpreise**
Die bisherige einzelne `defaultHourlyRate`-Eingabe wurde durch eine strukturierte Karte ersetzt:
- 📷 Fotografie: Stundensatz Privat · Stundensatz B2B · Einzelbild Privat · Einzelbild B2B
- 🎬 Videografie: Stundensatz Privat · Stundensatz B2B · Video 10 min
- 🚗 Reisekosten: Kilometerpauschale (0,50 €/km Standard) · Freikilometer
Neue `bookingTerms`-Felder: `hourlyRatePhotoPrivat`, `hourlyRatePhotoB2B`, `hourlyRateVideoPrivat`,
`hourlyRateVideoB2B`, `imagePricePrivat`, `imagePriceB2B`, `videoPer10min`
`frontend/src/pages/Settings.vue` · `backend/data/settings.json`

**B2B-Phasen-Kalkulator im Anfrageformular**
Wenn B2B + Preismodell „Stunden" gewählt ist, erscheint statt des einfachen Stundensatz-
Eingabefelds ein strukturierter Kalkulations-Block:

*Fotografie-Phasen (mit eigenem Stundensatz):*
- Vorbereitung / Konzeption
- Abstimmung / Meetings
- Shooting
- Bildbearbeitung *(größter Block)*

*Videografie-Phasen (mit eigenem Stundensatz):*
- Vorbereitung / Konzeption
- Abstimmung / Meetings
- Dreh
- Schnitt / Nachbearbeitung *(größter Block)*

*Liefermenge & Bildrechte:*
- Anzahl Bilder (digital) × B2B-Bildpreis
- Anzahl Videos (10 min) × Videopreis

Jede Zeile zeigt Stunden × Satz = Betrag live. Darunter eine Gesamtübersicht der Teilpositionen
mit Summe. Für Privataufträge bleibt das einfache Stunden-Formular erhalten.

Alle neuen Felder werden mit dem Auftrag gespeichert: `photoPhases`, `videoPhases`,
`hourlyRatePhotoB2B`, `hourlyRateVideoB2B`, `imageCountB2B`, `videoCount10min`,
`imagePriceB2B`, `videoPer10min`.
`frontend/src/components/NewProjectForm.vue`

**Vertragsklausel B2B-Leistungsphasen**
In `settings.json → contractParagraphsList` wird automatisch eine neue Klausel unter dem
Vergütungs-Paragraph ergänzt: beschreibt die 4 Leistungsphasen mit Definitionen, hält fest
dass Stunden je Phase im Auftragsbestätigungsschreiben dokumentiert werden, und regelt
Mehrstunden.
`backend/data/settings.json`

---

## v219 — Artikelstamm neu, 4 Stundensätze, B2B-Phasenkalkulator
*März 2026*

**Artikelstamm komplett neu aufgesetzt**
Alle 8 alten Artikel (Hochzeitspakete, Portraitshooting, Glückwunschkarten, Anfahrt, km)
wurden gelöscht. Neue 9 Artikel:

| ART | Bezeichnung | Preis | Einheit |
|---|---|---|---|
| ART-00001 | Fotografie – Stundensatz Privat | 250 € | Stunde |
| ART-00002 | Fotografie – Stundensatz B2B | 250 € | Stunde |
| ART-00003 | Videografie – Stundensatz Privat | 250 € | Stunde |
| ART-00004 | Videografie – Stundensatz B2B | 250 € | Stunde |
| ART-00005 | Kilometerpauschale | 0,50 € | km |
| ART-00006 | Kilometerpauschale (Gutschrift) | −0,50 € | km |
| ART-00007 | Einzelbild – Digital B2B | 80 € | Bild |
| ART-00008 | Einzelbild – Digital Privat | 40 € | Bild |
| ART-00009 | Videoproduktion – 10 Minuten | 1.200 € | Stück |

**Einstellungen → Buchung & Storno: 4 Stundensätze + Bildpreise**
Die einzelne `defaultHourlyRate`-Karte wurde ersetzt durch eine strukturierte Karte
mit drei Abschnitten (Fotografie / Videografie / Reisekosten):
- 📷 Fotografie: Stundensatz Privat, Stundensatz B2B, Bildpreis Privat, Bildpreis B2B
- 🎬 Videografie: Stundensatz Privat, Stundensatz B2B, Videopreis 10 min
- 🚗 Reisekosten: Kilometerpauschale (jetzt 0,50 €/km), Freikilometer
Neue Settings-Felder: `hourlyRatePhotoPrivat/B2B`, `hourlyRateVideoPrivat/B2B`,
`imagePricePrivat/B2B`, `videoPer10min` — alle in `bookingTerms`.
`frontend/src/pages/Settings.vue` · `backend/data/settings.json`

**B2B-Phasenkalkulator im Anfrageformular**
Wenn B2B + Stundenmodell aktiv, erscheint statt des einfachen Stunden-Felds ein
vollständiger Phasenkalkulator mit Live-Kalkulation:

*Fotografie-Phasen:*
- Vorbereitung / Konzeption
- Abstimmung / Meetings
- Shooting
- Bildbearbeitung (größter Block)

*Videografie-Phasen:*
- Vorbereitung / Konzeption
- Abstimmung / Meetings
- Dreh
- Schnitt / Nachbearbeitung (größter Block)

Jede Phase zeigt: Label · Hint · Stundeneingabe · Live-Betrag (Stunden × Stundensatz).
Phasen-Totals pro Disziplin (h + €). Darunter Liefermenge: Bildanzahl B2B + Videoanzahl
(10-min-Einheiten) mit eigenen Preisfeldern. Gesamtübersicht als Summary-Box.
`autoBase` rechnet für B2B automatisch aus den Phasensummen.
`frontend/src/components/NewProjectForm.vue`

**Vertragsklausel & Paragraph für B2B-Stunden**
- Neue Sonderklausel `sc_b2b_phases` in `settings.contractClauses.specialClauses`
  (muss bei Bedarf im Vertrag aktiviert werden)
- Neuer Vertrags-Paragraph `cp_b2b_stunden` „Leistungsphasen & Stundendokumentation"
  mit 4 Absätzen (Phasengliederung, Dokumentation, Mehraufwand, Bildrechte)
`backend/data/settings.json`

---

## v218 — Settings-Umstrukturierung, Dashboard-Chart, Auftragsübersicht, Logo-Fix
*März 2026*

**Settings → Vertragswesen: Karten neu angeordnet**
Die veraltete Marktmatrix-Karte (MFM-Prozent-Tabelle) wurde entfernt.
Zahlungsarten und Nutzungsrechte-Faktor-Referenz stehen jetzt oben direkt nach dem
Vertragswesen-Header — logischer Lesfluss: Konfiguration → Referenz → Paragraphen-Texte.
`frontend/src/pages/Settings.vue`

**Dashboard: Umsatz-Chart vor die KPI-Kacheln verschoben**
Der Umsatz-Balkendiagramm (letzte 6 Monate) erscheint jetzt ganz oben, noch vor den KPI-
Kacheln — der wichtigste Trend ist sofort sichtbar ohne zu scrollen.
Balkenfarben:
- 🔴 Rot (`#fca5a5`) — kein Umsatz (0 €)
- 🟢 Helles Grün (`#86efac`) — normaler Monat
- 🟢 Kräftiges Grün (`#22c55e`) — starker Monat (≥ 70% des Maximums)
- 🟢 Dunkelgrün (`#16a34a`) — aktueller Monat
`frontend/src/pages/Dashboard.vue`

**Auftragsübersicht: Anfragedetails als Chip-Leiste**
Direkt unterhalb der KPI-Kacheln erscheint jetzt eine kompakte Chip-Leiste mit allen
relevanten Informationen aus dem Anfrageformular:
- Kundenstatus: 👤 Privatkunde (grün) · 🏢 B2B (blau)
- Preismodell: ⏱ Stunden mit Rate/Stunden · 📦 Pauschal mit Betrag · ✏️ Individuell
- ©️ Nutzungsrechte + Zuschlag in € (nur B2B, nur wenn aktiviert)
- 💶 Anzahlungsbetrag
- Leistungs-Chips: 📷 Foto · 🎬 Video · 💄 Getting Ready · 💌 Danksagung
- Gesamtbetrag (primärer violetter Chip, rechtsbündig)
`frontend/src/pages/ProjectDetail.vue`

**Fix: Logo wird in Einstellungen → Studio nicht geladen**
`previewUrl` wurde in `onMounted` gesetzt, aber erst *danach* als `ref('')` deklariert —
der Wert wurde verworfen bevor Vue ihn reaktiv tracken konnte. Fix: `previewUrl` und alle
Logo-Refs vor `onMounted` deklariert. Zusätzlich Cache-Buster `?t=Date.now()` beim
initialen Laden damit Browser-Caches kein veraltetes Logo zeigen.
`frontend/src/pages/Settings.vue`

---

## v217 — Hamburger-Bugs behoben + Nutzungsrechts-Kalkulator (designaustria)
*März 2026*

**Fix: Hamburger-Menü klappte hinter Settings-Tabbar auf**
Die `settings-tabbar` hatte `z-index: 100`, aber das Hamburger-Dropdown lag nur bei
`z-index: 200` — und die Settings-Dropdowns selbst bei `z-index: 9999`, womit sie
das Hamburger-Menü komplett überlagerten.
- `frontend/src/styles/global.css` — `.app-topbar` z-index: 100 → **300** + `position: relative`
- `frontend/src/components/TopBar.vue` — `.menu-overlay` z-index: 200 → **500**,
  `.dropdown-menu` bekommt explizit `z-index: 501`

**Fix: „Leistungen & Artikel" nicht mehr im Hamburger-Menü sichtbar**
Der Eintrag war in das einklappbare Untermenü „Dokumente" verschoben worden und damit
nicht mehr direkt sichtbar. Jetzt wieder als **eigenständiger Eintrag** im Studio-Abschnitt
des Hamburger-Menüs — immer ohne zusätzlichen Klick erreichbar. Das Dokumente-Untermenü
verbleibt, enthält aber nur noch die Dokumenttypen (Alle · Angebote · Rechnungen · Verträge).
`frontend/src/components/TopBar.vue`

**Nutzungsrechts-Kalkulator: Umstieg auf designaustria-Modell (multiplikativ)**
Das bisherige einfache Prozent-Modell (Kategorie × Laufzeit × Gebiet) wurde ersetzt durch
das anerkannte **Faktor-Multiplikations-Modell** nach den Kalkulations-Richtlinien von
designaustria (nutzungsrechte.online).

Formel: `Nutzungshonorar = Gestaltungshonorar × Thema × Bedeutung × Gebiet × Zeitraum × Nutzungsart × Auftragsart`

*`frontend/src/components/NewProjectForm.vue` — Anfrageformular (nur B2B):*
- Neuer **Aktivierungs-Toggle** „Nutzungsrechtszuschlag berechnen" — Kalkulator nur wenn
  explizit aktiviert, Badge zeigt errechneten Betrag sofort an
- **6 Faktor-Dimensionen** als anklickbare Chip-Gruppen mit Faktorwert (z.B. `1.50`):
  - Themenspezifisch (0,5 – 1,0): Branding / Produkt-Werbung / Unternehmenskomm.
  - Bedeutungsspezifisch (0,5 – 1,0): Hauptelement / Wichtiges Neben-el. / Untergeordnet
  - Kommunikations-/Nutzungsgebiet (0,5 – 2,0): Lokal → Weltweit
  - Einsatz-/Nutzungszeitraum (0,75 – 1,5): Einmalig / 1 Jahr / Dauernutzung
  - Nutzungsart (0 – 3,0): Kein Recht / Zweckgebunden / Ohne Zweckbindung / Bearbeitungsrecht
  - Auftragsart (0,75 – 1,5): Folgeauftrag / Rahmenvereinbarung / Einzelauftrag
- **Hover-Tooltips** (dunkel, Pfeil) mit Erklärungstext für jede Dimension und jeden Wert
- **Live-Formel-Anzeige** in der Zusammenfassung: alle Faktoren × … = Gesamtfaktor
- **Preiszusammenfassung**: Gestaltungshonorar + Nutzungshonorar = Auftragssumme netto
- Gespeicherte Felder: `contract.usageRights` (Objekt mit `enabled` + 6 Faktorwerten),
  `usageRightsSurcharge` (€-Betrag)

*`frontend/src/pages/Settings.vue` → Tab Vertragswesen:*
- Neue **Faktor-Referenztabelle** am Ende des Tabs: alle 6 Dimensionen mit Werten und
  Erklärungen, Formel-Darstellung, ausgearbeitete Beispielrechnung, Link zu nutzungsrechte.online

---

## v216 — Studio-Tab bereinigt + Nutzungsrechts-Marktmatrix (B2B)
*März 2026*

**Fix: KOR/STORNO-Nummernkreise aus Studio-Tab entfernt**
Der Studio-Tab zeigte den Block „↩ Abgeleitete Nummern" (Korrekturrechnung + Stornorechnung)
doppelt — er gehört ausschließlich in den Tab „Nummernkreise" (dort war er bereits korrekt
hinterlegt). Block im Studio-Tab vollständig entfernt.
`frontend/src/pages/Settings.vue`

**Nutzungsrechts-Marktmatrix im Anfrageformular (nur B2B)**
Für gewerbliche Kunden können werbliche Nutzungsrechte mit Zuschlagskalkulation erfasst werden.
Die Matrix ist nur sichtbar wenn „🏢 B2B" aktiv ist.

- `frontend/src/components/NewProjectForm.vue`:
  - Neues Formular-Abschnitt „Werbliche Nutzungsrechte" (erscheint zwischen Honorarfeldern
    und Anzahlung, nur bei B2B)
  - **4 Nutzungsarten** als anklickbare Kacheln:
    🖨 Print / OOH · 🌐 Online / Social · 📺 TV / Video · 📰 PR / Redaktion
  - **Laufzeit** (1 Jahr / 2 Jahre / Unbegrenzt) und **Geltungsbereich** (Regional /
    National / International) — erscheinen erst wenn mind. eine Nutzungsart aktiv
  - **Preiszusammenfassung** (nur wenn Honorarbasis bekannt):
    Honorar + Nutzungsrechtszuschlag = Auftragssumme netto
  - Zuschlag-Badge „+XX%" neben dem Label, solange Nutzungsarten aktiv
  - Zuschlagssätze orientieren sich an MFM-Richtwerten (vereinfacht):

| Nutzungsart | 1 J. / national | 2 J. / national | unbegrenzt / national |
|---|---|---|---|
| Print / OOH | 25% | 38% | 55% |
| Online / Social | 20% | 30% | 45% |
| TV / Video | 50% | 70% | 100% |
| PR / Redaktion | 10% | 15% | 22% |

  - `contract.usageRightsMatrix` (Objekt mit 4 Booleans), `usageRightsDuration`,
    `usageRightsScope`, `usageRightsSurcharge` (€-Betrag, wird beim Speichern gesetzt)
    werden mit dem Auftrag gespeichert
  - `autoTotal` (Honorar + Zuschlag) ersetzt `autoBase` als Basis für Anzahlungsvorschlag
    und `budget.estimatedAmount`

---

## v215 — Mehrere Shooting-Termine (BQ-6) + Eingangsrechnungen (BQ-7)
*März 2026*

**BQ-6 — Mehrere Shooting-Termine pro Auftrag**
Hochzeiten und Events haben oft mehrere Zeitpunkte (Getting Ready, Zeremonie, Feier).
Bisher war nur ein Termin pro Auftrag möglich.

- `backend/src/models/Project.js` — neues Array-Feld `shootingDates: [{ id, date, time, label }]`.
  Das Feld `booking`/`bookingTime` bleibt Haupt-Termin (Rückwärtskompatibilität gewahrt).
  Neues optionales Feld `bookingLabel` für die Bezeichnung des Haupt-Termins.
- `frontend/src/components/NewProjectForm.vue` — Buchungsdatum-Sektion ersetzt durch
  „Shooting-Termin(e)"-Block: Haupt-Termin-Zeile (violett hinterlegt) + Schaltfläche
  „+ Termin" für beliebig viele Zusatztermine (Datum · Uhrzeit · Bezeichnung).
- `frontend/src/pages/ProjectDetail.vue` — Hero zeigt alle Zusatztermine als grüne Chips
  neben den Haupttermin-Metadaten. Sidebar-Edit erweitert um „Bezeichnung Haupt-Termin"
  und vollständigen Editor für Zusatztermine (inline hinzufügen/entfernen).

**BQ-7 — Externer Rechnungsimport, Variante A (manuell + PDF-Ablage)**
Eingangsrechnungen von Lieferanten (Kamera, Software, Versicherung …) können jetzt
direkt in der FiBu erfasst werden — Daten manuell eingeben, fertiges PDF optional anhängen.

- `backend/src/services/fibuService.js` — CRUD-Funktionen `createExternalInvoice`,
  `updateExternalInvoice`, `deleteExternalInvoice`. `read()` migriert `fibu.json`
  automatisch: fügt `externalInvoices: []` nach wenn das Feld fehlt.
- `backend/src/controllers/fibuController.js` — drei neue Controller-Methoden.
- `backend/src/routes/fibu.js` — drei neue Routen:
  `POST /api/fibu/external-invoices`, `PUT …/:id`, `DELETE …/:id`.
- `frontend/src/pages/FiBu.vue` — neuer Tab „📥 Eingangsrechnungen":
  - Tabelle mit Lieferant, Rechnungs-Nr., Kategorie, Netto/MwSt./Brutto, Status, Beleg
  - Popup-Formular: Datum, Lieferant, Rechnungs-Nr., Kategorie, Beschreibung,
    Netto+MwSt.→Brutto-Autokalkulation, Zahlungsstatus/Datum/Art, Beleg-Upload (PDF/JPG/PNG),
    Notizen — identisches UX-Muster wie die Ausgaben-Erfassung
  - Inline-Bearbeitungs- und Löschfunktion
  - Tabellenanzeige mit Beleg-Icon (🖼 / 📄) direkt anklickbar

---

## v214 — DATEV: Haben-Buchungen ergänzt + Hamburger-Menü bereinigt
*März 2026*

**Fix: DATEV-Export enthielt nur Soll-Buchungen (Ausgaben)**
Der Export fehlte die Haben-Seite (Einnahmen). Bezahlte Rechnungen aus
`documents.json` wurden nicht übergeben. Behoben:
- `datevController` lädt jetzt `documentService.getAllDocuments()` und filtert
  nach `status === 'Bezahlt'` + `paidAt` im gewählten Jahr
- `datevService.generateDatevCsv()` nimmt `invoices` als 4. Parameter
- Rechnungen werden als `'H'` (Haben) mit Erlöskonto (8200/8400/8300) gebucht
- Steuersatz aus `taxGroups[0].rate` ermittelt, Fallback: §19 (0%)

**Vollständiger Export jetzt:**
| Typ | Kz | Konto | Gegenkonto |
|---|---|---|---|
| Bezahlte Rechnung | H | 8200/8400/8300 | 1800 (Bank) |
| Betriebsausgabe | S | 0480/4822/4670/… | 1800 (Bank) |
| Fahrtkosten (km×Pauschale) | S | 4670 | 1800 (Bank) |

**Hamburger-Menü bereinigt**
Der deaktivierte Platzhalter-Eintrag „DATEV-Export (Bald)" wurde aus dem
Hamburger-Menü der TopBar entfernt. Der Export ist jetzt direkt in der
FiBu-Ansicht über den Button „📤 DATEV CSV" erreichbar.

---

## v213 — Beta-Qualität BQ-1 bis BQ-5 implementiert
*März 2026*

**BQ-1 — FiBu Beleg-Vorschau**
In der Ausgaben-Tabelle wird jetzt für JPG/PNG-Belege ein 36×36px-Thumbnail
direkt in der Zeile angezeigt. Für PDFs erscheint ein 📄-Icon. Klick öffnet
den Beleg im neuen Tab. Das Thumbnail skaliert beim Hover leicht auf.
`frontend/src/pages/FiBu.vue`

**BQ-2 — Dashboard Umsatz-Chart**
Zwischen KPI-Kacheln und Auftrags-Stream erscheint jetzt ein Balkendiagramm
der letzten 6 Monate (bezahlte Rechnungen nach `paidAt`). Reines CSS/SVG —
keine neue Dependency. Der aktuelle Monat ist farblich hervorgehoben.
`frontend/src/pages/Dashboard.vue`

**BQ-3 — iCal-Export im Kalender**
Neuer Button „📅 iCal" in der Kalender-Toolbar. Exportiert alle sichtbaren
Termine (Shootings, Abgaben, manuelle Termine) als RFC-5545-konformes `.ics`-
File (`pixframe-termine.ics`). Kompatibel mit Google Calendar, Apple Calendar,
Outlook. Kein Backend nötig — generiert direkt im Browser.
`frontend/src/pages/Calendar.vue`

**BQ-4 — km-Pauschale aus Einstellungen**
Der EAR-Ausdruck zeigte immer hardcodiert „0,30 €/km". Jetzt wird
`settings.bookingTerms.defaultKmRate` verwendet — konfigurierbar unter
Einstellungen → Buchung & Storno → Kilometerpauschale. Fallback: 0,30 €/km.
`frontend/src/pages/EarPrint.vue`

**BQ-5 — DATEV CSV-Export aus FiBu**
Neuer Button „📤 DATEV CSV" neben dem EAR-PDF-Button in der FiBu-Ansicht.
Exportiert alle Ausgaben und Fahrtenbuch-Einträge des gewählten Jahres als
DATEV-kompatibles CSV (SKR03-Kontenrahmen, UTF-8 mit BOM für Excel).
- Neues `backend/src/services/datevService.js` mit `generateDatevCsv()`
- Konten automatisch aus Kategorie abgeleitet (Kamera→0480, Software→4822, etc.)
- Neuer Endpunkt `GET /api/fibu/datev-export?year=2026`
- Kilometerpauschale aus `settings.bookingTerms.defaultKmRate`

---

## v212 — Beta-Blocker BB-1 bis BB-6 behoben
*März 2026*

Alle 6 Beta-Blocker aus der technischen Analyse (v211) behoben.
Das Projekt ist damit bereit für eine geschlossene Beta.

**BB-1 — Path Traversal Fix in `zipUtils.extractZip()`**
Ein manipuliertes Update-ZIP konnte Dateien außerhalb des Zielverzeichnisses
schreiben (`../../backend/.env`). Fix: `path.resolve()` prüft ob `destPath`
innerhalb von `targetDir` liegt — andernfalls wird der Eintrag übersprungen.

**BB-2 — Atomare Schreiboperationen in `fileStorage.js`**
`fs.writeFileSync()` direkt auf die Zieldatei konnte bei Stromausfall oder
Prozess-Kill eine korrupte JSON-Datei hinterlassen → Datenverlust aller Einträge.
Fix: Write-to-tmp + `fs.renameSync()` — atomar auf POSIX und Windows NTFS.

**BB-3 — `{minCopyrightDamage}` Placeholder ersetzt**
Der Vertragstext (§ 5 Urheberrecht) enthielt zweimal den unleserlichen
Placeholder `{minCopyrightDamage}%`. Ersetzt durch `300` (branchenüblicher
Wert: 300% des Honorars pro Verstoß gem. Urheberrecht).

**BB-4 — Race Condition in `nextNumber()` behoben**
`Math.max(...existingNumbers) + 1` lieferte bei zwei gleichzeitigen API-Aufrufen
doppelte Nummern (GoBD-Verletzung). Ersetzt durch atomaren Counter:
- Neue Datei `backend/data/counters.json` → `{ "invoice": 42, "quote": 17, ... }`
- `nextNumber()` liest, inkrementiert und schreibt den Counter atomar zurück
- Selbstheilend: beim ersten Aufruf wird der Counter aus vorhandenen Dokumenten initialisiert

**BB-5 — `joi` Dependency entfernt**
`"joi": "^17.9.1"` war in `package.json` eingetragen aber nirgendwo importiert.
Validation läuft über eigene `Model.validate()` Methoden. Dependency entfernt.

**BB-6 — Settings-Cache implementiert + Atomic Write**
`settings.json` wurde bei jedem API-Call (PDF-Render, Dokumenterstellung, etc.)
neu vom Disk gelesen. Modul-Level Cache `_settingsCache` verhindert das.
Invalidierung bei `updateSettings()`, `saveLogo()` und `deleteLogo()`.
Bonus: `writeSettings()` nutzt jetzt ebenfalls Write-tmp+rename (BB-2-Prinzip).

---

## v211 — Mac-Audit: CRLF, Script-Bugs, Permissions
*März 2026*

Vollständiger Audit aller Mac-relevanten Punkte — 5 Probleme gefunden und behoben:

| # | Problem | Datei(en) | Auswirkung |
|---|---|---|---|
| 1 | **CRLF-Zeilenenden** in Quelldateien | `projectService.js` (93×), `fileStorage.js` (86×), `customers.js`, `errorHandler.js`, `vite.config.js`, `frontend/package.json` | Bash/Node läuft, aber einige Tools (diff, grep) zeigen Artefakte |
| 2 | **`cp` Argumente vertauscht** | `mac/start-backend.sh` | `.env.example` wurde mit leerer `.env` überschrieben — `.env` blieb leer |
| 3 | **Keine +x Permissions** | `mac/*.sh` | `bash mac/install.sh` funktioniert, aber `./mac/install.sh` nicht |
| 4 | **FRONTEND_URL fehlte in `.env`** | `backend/.env` | `pdfService.js` konnte `require('../config').FRONTEND_URL` nicht auflösen |
| 5 | **Kein `start-frontend.sh`-Fallback** | `mac/start-frontend.sh` | Bei fehlendem lokalen `vite`-Binary → `npx vite` als Fallback ✓ |

**Kein Start-App-Bug:** `start-all.sh` nutzt `osascript` → öffnet Terminal.app-Fenster auf macOS.
Funktioniert auf macOS 12+. Für iTerm2-Nutzer ist kein separates Skript nötig.

---

## v210 — Fix: Update-System + Workflow Angebot-Standard
*März 2026*

**Kritischer Fix: Update-System (`update-manifest.json fehlt`)**
`extractZip()` in `zipUtils.js` ist eine `async`-Funktion (gibt Promise zurück),
wurde aber ohne `await` aufgerufen. Der Code lief weiter bevor die ZIP entpackt war —
`update-manifest.json` war noch nicht auf der Festplatte.
Betroffen: `updateService.js` (2 Stellen) + `backupService.js` (2 Stellen).

```js
// VORHER — kein await, Manifest-Datei noch nicht da
extractZip(zipPath, tempDir);
JSON.parse(fs.readFileSync(path.join(tempDir, 'update-manifest.json')));

// NACHHER
await extractZip(zipPath, tempDir);
JSON.parse(fs.readFileSync(path.join(tempDir, 'update-manifest.json')));
```

**Workflow: Angebot standardmäßig ausgeblendet**

| Vorher | Nachher |
|---|---|
| Checkbox: „Angebot-Schritt überspringen" | Checkbox: **„Angebot gewünscht"** |
| Standard: Angebot **sichtbar** | Standard: Angebot **ausgeblendet** |
| Checkbox aktiv → Angebot versteckt | Checkbox aktiv → Angebot **eingeblendet** |

Betroffen: `NewProjectForm.vue`, `ProjectDetail.vue`, `Project.js` (alle `skipQuote ?? true`)

---

## v209 — Kritischer Bugfix: SyntaxError in updateService.js
*März 2026*

Beim Bereinigen in v208 wurde der Kopf der `applyFiles`-Funktion inkl.
`isProtected()` entfernt — nur der Rumpf blieb. Ungültiges JavaScript.

**Symptom-Kaskade:**
```
SyntaxError updateService.js
→ Backend startet nicht
  → Alle API-Aufrufe schlagen fehl (Network Error)
    → Kunden anlegen nicht möglich
    → Rechtstexte (AGB/DSGVO/ADV/Vertragswesen) erscheinen leer
```

Rechtstexte waren in `settings.json` vollständig vorhanden (12 AGB, 7 DSGVO,
8 ADV, 8 Vertragsparagraphen) — sie konnten nur nicht geladen werden.
Fix: Vollständige `isProtected()` und `applyFiles()` Funktionen wiederhergestellt.

---

## v208 — Mac-Kompatibilität: Pfad-Abstraktion & plattformunabhängiges ZIP
*März 2026*

| Datei | Problem | Risiko |
|---|---|---|
| `logger.js` | `__dirname` statt `paths.LOGS_DIR` | Gering |
| `pdfService.js` | Eigene `FRONTEND_URL` Konstante (doppelt zu config.js) | Gering |
| `backupService.js` | `execSync('zip -r ...')` via Shell | **Kritisch auf Mac** |
| `updateService.js` | `PowerShell Expand-Archive` / `execSync('unzip ...')` | **Kritisch auf Mac** |

**Neue Datei `backend/src/utils/zipUtils.js`** — reines Node.js:
- Erstellen: Eigene CRC32 + `zlib.deflateRaw` — kein Shell-Aufruf, kein Binary
- Entpacken: `yauzl` (bereits als Puppeteer-Dependency vorhanden)
- Funktioniert auf macOS auch bei Pfaden mit Leerzeichen zuverlässig

---

## v207 — Vollversion: Alle PDF + Navigations-Fixes kumuliert
*März 2026*

Kumulative Vollversion mit allen Fixes v203–v206 plus `emulateMediaType('print')`,
`body { background:white }` in print-override.css, und Settings-Dropdown-Fix.

---

## v206 — Fix: Grauer Hintergrund + Versatz im PDF
*März 2026*

**3 Ursachen, alle am Screenshot nachgewiesen:**

1. `body { background: #e0e0e0 }` ohne `@media screen` Guard → mit `printBackground:true`
   erscheint grauer Hintergrund im PDF. Fix: `@media print { html,body { background:white } }`

2. `emulateMediaType('print')` fehlte in `pdfService.js` → Chromium lud die Seite
   im Screen-Modus (Flex-Centering, grauer Hintergrund). Fix: `await page.emulateMediaType('print')` vor `page.goto()`

3. `.page-wrap` Flex-Centering im Print aktiv → Versatz.
   Fix: `@media print { .page-wrap { display:block; padding:0 } }`

---

## v205 — Fix: Einstellungen-Dropdown klappt auf
*März 2026*

`position:absolute` wird von jedem Vorfahren mit `overflow:hidden` geclippt
— unabhängig vom `z-index`. Dreifach gestapelt:

```
.settings-page { overflow: hidden }   ← clippte
.settings-nav  { overflow: hidden }   ← clippte (Hauptursache)
.s-dropdown    { position: absolute } ← nie sichtbar
```

Fix: alle drei Container + `.settings-body` → `overflow: visible`,
`.s-dropdown { z-index: 9999 }`.

---

## v204 — Einstellungen: Gruppierte Navigation mit Dropdown-Menüs
*März 2026*

12 flache Tabs (letzte 3 nicht sichtbar bei 100% Zoom) → 7 Einträge mit 3 Gruppen:

| Eintrag | Typ | Enthält |
|---|---|---|
| 🏢 Studio | direkt | — |
| 🔢 Nummernkreise | direkt | — |
| 📋 Auftrag | **Gruppe** | Buchung & Storno, Kalender |
| 📝 Rechtsdoks | **Gruppe** | Vertragswesen, AGB, DSGVO, ADV-Vertrag |
| ✉️ E-Mail | direkt | — |
| 🎨 Darstellung | direkt | — |
| ⚙️ System | **Gruppe** | Backup, Update, System |

Hover öffnet Dropdown sofort · Klick toggelt (Touch-freundlich) ·
Aktive Gruppe zeigt aktiven Kind-Tab-Namen an.

---

## v203 — PDF A4-Fix: Margins, Footer-Template, Seitenzahlen
*März 2026*

4 Bugs, alle am echten PDF-Textlayer nachgewiesen (V-2026-01_00023_Peters.pdf):

| Bug | Ursache | Fix |
|---|---|---|
| Footer überlagert Inhalt Seite 2+ | `margin.bottom:0mm` + CSS-Padding nur auf Seite 1 | `margin.bottom:'28mm'` in Puppeteer page.pdf() |
| „Seite 0 von 0" | `counter(page)` ohne `displayHeaderFooter` = 0 | `displayHeaderFooter:true` + `<span class="pageNumber">` |
| Kein Top-Margin Seite 2+ | `margin.top:'0mm'` | `margin.top:'14mm'` immer gesetzt |
| Tabellen mitten abgeschnitten | Kein `break-inside:avoid` auf `tr` | `print-override.css` global |

Neue `frontend/src/styles/print-override.css` + Import in `main.js`.
Kein einziges Print-Vue-File geändert.

---

## v202 — PDF-System: Puppeteer-Margins + Footer-Template (Architektur-Rebuild)
*März 2026*

`pdfService.js` + `pdfController.js` vollständig neu geschrieben.
- `buildFooterTemplate(company, docLabel)` → 3-spaltiger Footer auf jeder Seite
- `margin: { top:'14mm', right:'18mm', bottom:'28mm', left:'18mm' }` — gilt für jede Seite
- Firmendaten für Footer aus `settingsService.getSettings()` geladen
- Typspezifische `docLabel` pro Endpunkt (Rechnung / Stornorechnung / Angebot / Vertrag …)

---

## v201 — Anfrage: Angebot optional + mehrere Locations · Restart-Fix
*März 2026*

**Bugfix:** `updateController.js`: `res.end(payload, callback)` mit
`setImmediate(() => process.exit(0))` — Neustart nach vollständigem Response-Flush.

**Feature: Angebot-Schritt optional**
- `NewProjectForm.vue`: Checkbox im Anfrage-Reiter
- `ProjectDetail.vue`: Angebot-Step wird ausgeblendet wenn `skipQuote: true`
- `Project.js`: Neues Feld `skipQuote`

**Feature: Mehrere Locations mit Kategorie**
(Trauung, Kirche, Standesamt, Hotel, Feier, Getting Ready, Studio, Outdoor, Sonstiges)
- Multi-Location-UI mit Kategorie-Dropdown, jede Location einzeln löschbar
- Locations als Badges in der Auftragsübersicht (Hero-Bereich)
- Rückwärtskompatibel: `location`-String-Feld bleibt erhalten

---

## v200 — Bugfix: Nummernkreise Korrektur/Storno nur im richtigen Tab
*März 2026*

Doppelter Block „↩ Abgeleitete Nummern" (KOR / STORNO) am Ende des Studio-Tabs
entfernt. Ausschließlich unter **Einstellungen → Nummernkreise** zu finden.

---

## v199 — Update-System + Backup-System + Pfad-Abstraktion
*März 2026*

- **Backup-System:** ZIP-Backup, 10-Versionen-Rotation, Pre-Restore-Backup,
  automatisches Backup beim Start
- **Update-System:** ZIP-basiert mit `update-manifest.json`, Manifest-Vorschau,
  Auto-Backup vor Update, Restart-Loop (PowerShell / bash)
- **Pfad-Abstraktion:** `backend/src/config/paths.js` — alle Pfade über
  `path.resolve(__dirname, ...)`, funktioniert auf Windows + macOS

---

## v1.97.3 — PDF-Header-Fix: Seite 1 ohne Header, Logo ab Seite 2
*März 2026*

- `ContractPrint.vue`: Fehlerhaften `<header class="page-header no-screen">` entfernt
- `ContractPrint.vue`: `@page :first { margin-top: 0 !important }` unterdrückt
  Puppeteer-Kopfrand auf Seite 1
- `pdfService.js`: Option `logoHeader: true` → rechtsbündiges Firmenlogo ab Seite 2

---

## v1.97.2 — Systemweites Refactoring: API_BASE + FormData-Cleanup
*März 2026*

- `api.js` exportiert `API_BASE = 'http://localhost:3001'` — **einzige Stelle** im Frontend
- 20+ hardcodierte URLs in allen Dateien auf `{ API_BASE }` umgestellt
- Request-Interceptor löscht `Content-Type` bei FormData — Belegupload-Fix
- `Dashboard.vue` und `ProjectDetail.vue` auf `apiClient` umgestellt

---

## v1.97.1 — Bugfix: „Auftrag nicht gefunden" vom Dashboard
*März 2026*

- `Array.isArray()`-Guards in allen Store-Fetches
- `fetchProjectById(id)` als Fallback wenn Projekt nach dem Laden nicht im Store
- `onMounted` in `ProjectDetail.vue` mit Fallback-Fetch

---

## v1.97 — Puppeteer PDF-Engine (ersetzt html2pdf.js)
*März 2026*

- 9 PDF-Endpunkte via Headless-Chrome: document, contract, adv, addendum,
  agb, dsgvo, adv-vertrag, ear, blank-contract
- `pdfService.js`: A4-Viewport (794×1123 px, 2× deviceScaleFactor),
  `networkidle0`-Wait, 900ms Vue-Settle, `waitForFunction(.state-screen)`,
  PUPPETEER_HIDE_CSS-Injection
- `pdfExport.js`: `downloadPdfFromBackend()` mit `window.print()` Fallback
- FiBu Belegupload-Fix (FormData-Header-Problem)

---

## v195 — Vollständiger Rechnungs-Workflow (GoBD-konform)
*März 2026*

- Korrekturrechnung editierbar, Originalbeträge vorbefüllt, `KOR-`-Nummernschema
- Stornorechnung mit Bestätigung + Stornierungsgrund, negierte Beträge, `STORNO-`
- v1/v2/v3-Badges, transitive Dokument-Zuordnung
- FiBu EAR: ersetzte Rechnungen durchgestrichen, Korrekturen summiert

---

## v191–v194 — Pipeline-UX & Cleanup
*März 2026*

- Auto-Open aktueller Pipeline-Schritt
- `handlePipelineCall` async (Race-Condition-Fix)
- Vorgespräch-Pflicht respektiert Einstellungen
- Formular-Konsistenz: alle Panels einheitlicher Gradient-Header

---

## v184–v190 — Architektur-Refactoring
*März 2026*

- 5 Pinia Stores: `useProjectDetailStore`, `useContractStore`, `useInvoiceStore`,
  `useQuoteStore`, `useSettings`
- `ProjectDetail.vue` aufgeteilt in 7 Sub-Komponenten (−28% Zeilen)
- Backend Layered Architecture vollständig
- 33 tote Refs, 17 CSS-Blöcke bereinigt

---

## v173–v183 — DSGVO, Dokumenten-Aktionen & FiBu
*März 2026*

- FiBu-Modul: Einnahmen, Ausgaben (mit Upload), Fahrtenbuch
- EAR-Ausdruck als A4-PDF mit Logo
- Einheitliches Corporate Design aller Druckdokumente
- `documentService.js`, `emailService.js`, `fibuService.js` extrahiert

---

## v93–v172 — Großes Redesign & Leistungs-Features
*März 2026*

- Komplettes visuelles Redesign
- Leistungs-Chips (Foto, Video, Getting Ready, Danksagungskarten)
- Parkkosten-Klausel, Standard-aktiv-Flag (★) für Sonderklauseln
- 🔍 PDF anzeigen · 🖨️ Drucken · ⬇️ Download in allen Dokumentlisten

---

## v76–v92 — Kalender, E-Mail & UX-Verbesserungen
*März 2026*

- Kalender: Monats-/Wochenansicht, Feiertage + Schulferien (16 Bundesländer)
- E-Mail-Infrastruktur (SMTP via nodemailer — 🚧 noch nicht vollständig aktiv)
- Lieferantenverwaltung

---

## v51–v75 — Pipeline, AGB & Rechtsdokumente
*März 2026*

- 7-Stufen-Pipeline mit `autoUpdateProjectStatus`
- AGB, DSGVO, ADV editierbar in Einstellungen
- DSGVO-Blankoformular (Einwilligungserklärung §22 KUG)

---

## v23–v50 — Vertragswesen & Druckansichten
*März 2026*

- `ContractPrint.vue` — vollständiger Fotovertrag
- ADV-Vertrag, Blankovertrag, AGB, DSGVO als Druckansichten
- Konfigurierbare Paragraphentexte in Einstellungen

---

## v0–v22 — Fundament & Stabilisierung
*März 2026*

- Vue 3 + Express + JSON-Speicher Grundgerüst
- REST-API, Dokumenten-Workflow, Statusverwaltung
- Windows Start-Skripte
- Alle systemischen Grundbugs behoben (Phase 0)

---

## Gesamtentwicklung auf einen Blick

| Meilenstein | Version | Datum |
|---|---|---|
| Erstes lauffähiges Grundgerüst | v0 | 06.03.2026 |
| Vollständiger Dokumenten-Workflow | v22 | 07.03.2026 |
| Vertragsgenerator & Druckansichten | v50 | 07.03.2026 |
| 7-Stufen-Pipeline, AGB, Rechtsdokumente | v75 | 08.03.2026 |
| Kalender, E-Mail-Infrastruktur | v92 | 09.03.2026 |
| Großes Redesign, Leistungs-Features | v172 | 14.03.2026 |
| FiBu, DSGVO, einheitliche Dokumente | v183 | 15.03.2026 |
| Architektur-Refactoring | v190 | 15.03.2026 |
| Vollständiger Rechnungs-Workflow | v195 | 16.03.2026 |
| Puppeteer PDF-Engine, API_BASE | v197 | 20.03.2026 |
| Backup + Update-System | v199 | 21.03.2026 |
| Multi-Location, Angebot optional | v201 | 21.03.2026 |
| PDF A4-Fix vollständig | v203 | 21.03.2026 |
| Einstellungen-Navigation gruppiert | v204 | 21.03.2026 |
| PDF Screen-CSS-Fix | v206 | 21.03.2026 |
| Mac-Kompatibilität, plattformunabh. ZIP | v208 | 21.03.2026 |
| SyntaxError-Fix + Angebot-Workflow-Fix | v210 | 21.03.2026 |

---

## Technische Kennzahlen

| Metrik | v0 | v210 |
|---|---|---|
| Backend-Routen | 2 | 11 |
| Frontend-Seiten/Komponenten | 8 | 30+ |
| ProjectDetail.vue Zeilen | 5.795 | 4.221 |
| Pinia Stores | 1 | 5 |
| Pipeline Sub-Komponenten | 0 | 7 |
| Backend Services | 3 | 10 |
| PDF-Endpunkte (Puppeteer) | 0 | 9 |
| Backup-Endpunkte | 0 | 6 |
| Update-Endpunkte | 0 | 2 |
| Einstellungs-Tabs (in Gruppen) | 0 | 12 (7 Einträge) |
| Entwicklungstage | — | 16 |

---

*PixFrameWorkspace · vollständiges Changelog v0–v214 · März 2026*