# AgbPrint: downloadPDF() soll IPC nutzen
(Get-Content frontend\src\pages\AgbPrint.vue -Raw) -replace 'async function downloadPDF\(\) \{\s*printPage\(\)\s*\}', @'
async function downloadPDF() {
      const name = (settings.value?.company?.name || 'Studio').replace(/[^a-z0-9]/gi, '_')
      try { await downloadPdfFromBackend('/api/pdf/agb', 'AGB_' + name) }
      catch(e) { console.error('PDF:', e); printPage() }
    }
'@ | Set-Content frontend\src\pages\AgbPrint.vue -NoNewline

# AdvVertragPrint
(Get-Content frontend\src\pages\AdvVertragPrint.vue -Raw) -replace 'function downloadPDF\(\) \{ printPage\(\) \}', @'
async function downloadPDF() {
      const name = (settings.value?.company?.name || 'Studio').replace(/[^a-z0-9]/gi, '_')
      try { await downloadPdfFromBackend('/api/pdf/adv-vertrag', 'ADV_Vertrag_' + name) }
      catch(e) { console.error('PDF:', e); printPage() }
    }
'@ | Set-Content frontend\src\pages\AdvVertragPrint.vue -NoNewline
```

Weißt was, das wird in PowerShell ein Regex-Albtraum. Einfacher — öffne die Dateien manuell und ändere jeweils die `downloadPDF`/`printPage` Funktion. Hier die **exakten Änderungen** für jede Datei:

**1. `frontend/src/pages/AgbPrint.vue`** (Zeile ~167):
```
// ALT:
async function downloadPDF() {
  printPage()
}

// NEU:
async function downloadPDF() {
  const name = (settings.value?.company?.name || 'Studio').replace(/[^a-z0-9]/gi, '_')
  try { await downloadPdfFromBackend('/api/pdf/agb', 'AGB_' + name) }
  catch(e) { console.error('PDF:', e); printPage() }
}
```

**2. `frontend/src/pages/AdvVertragPrint.vue`** (Zeile ~159):
```
// ALT:
function downloadPDF() { printPage() }

// NEU:
async function downloadPDF() {
  const name = (settings.value?.company?.name || 'Studio').replace(/[^a-z0-9]/gi, '_')
  try { await downloadPdfFromBackend('/api/pdf/adv-vertrag', 'ADV_Vertrag_' + name) }
  catch(e) { console.error('PDF:', e); printPage() }
}
```

**3. `frontend/src/pages/AddendumPrint.vue`** (Zeile ~192):
```
// ALT:
try { await downloadPdfFromBackend(el, buildFilename()) }

// NEU:
try { await downloadPdfFromBackend('/api/pdf/addendum/' + route.params.pid + '/' + route.params.aid, buildFilename()) }