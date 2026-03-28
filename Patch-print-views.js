/**
 * patch-print-views.js
 * Patcht alle Print-Views um downloadPdfFromBackend() mit dem
 * korrekten API-Pfad aufzurufen (Electron IPC statt window.print).
 *
 * Ausfuehren im Projekt-Root:
 *   node patch-print-views.js
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, 'frontend', 'src', 'pages');

function patch(file, replacements) {
  const filePath = path.join(PAGES_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP ${file} (nicht gefunden)`);
    return false;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  for (const [search, replace] of replacements) {
    if (content.includes(search)) {
      content = content.replace(search, replace);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  OK ${file}`);
  } else {
    console.log(`  -- ${file} (bereits gepatcht oder Pattern nicht gefunden)`);
  }
  return changed;
}

console.log('');
console.log('=== PixFrame: Print-Views patchen fuer Electron PDF ===');
console.log('');

let count = 0;

// ── AgbPrint.vue ──
// printPage() → window.print(), downloadPDF() → printPage()
// Fix: downloadPDF() ruft downloadPdfFromBackend('/api/pdf/agb', filename)
count += patch('AgbPrint.vue', [[
  `    async function downloadPDF() {
      printPage()
    }`,
  `    async function downloadPDF() {
      const name = (settings.value?.company?.name || 'Studio').replace(/[^a-z0-9äöüÄÖÜß\\- ]/gi, '_')
      const filename = 'AGB_' + name
      try {
        await downloadPdfFromBackend('/api/pdf/agb', filename)
      } catch(e) {
        console.error('PDF-Fehler:', e)
        printPage()
      }
    }`
]]) ? 1 : 0;

// ── AdvVertragPrint.vue ──
count += patch('AdvVertragPrint.vue', [[
  `    function downloadPDF() { printPage() }`,
  `    async function downloadPDF() {
      const name = (settings.value?.company?.name || 'Studio').replace(/[^a-z0-9äöüÄÖÜß\\- ]/gi, '_')
      const filename = 'ADV_Vertrag_' + name
      try {
        await downloadPdfFromBackend('/api/pdf/adv-vertrag', filename)
      } catch(e) {
        console.error('PDF-Fehler:', e)
        printPage()
      }
    }`
]]) ? 1 : 0;

// ── DsgvoPrint.vue ──
// Hat nur printPage(), kein downloadPDF. Wir fuegen downloadPDF hinzu
// und aendern den Button-Click (falls vorhanden)
count += patch('DsgvoPrint.vue', [[
  `    function printPage() {
      const orig = document.title
      const name = (settings.value.company.name || 'Studio').replace(/[^a-z0-9äöüÄÖÜß\\- ]/gi, '_')
      document.title = \`DSGVO_\${name}\`
      window.print()
      setTimeout(() => { document.title = orig }, 2000)
    }`,
  `    async function downloadPDF() {
      const name = (settings.value?.company?.name || 'Studio').replace(/[^a-z0-9äöüÄÖÜß\\- ]/gi, '_')
      const filename = 'DSGVO_' + name
      try {
        await downloadPdfFromBackend('/api/pdf/dsgvo', filename)
      } catch(e) {
        console.error('PDF-Fehler:', e)
        printPage()
      }
    }

    function printPage() {
      const orig = document.title
      const name = (settings.value?.company?.name || 'Studio').replace(/[^a-z0-9äöüÄÖÜß\\- ]/gi, '_')
      document.title = \`DSGVO_\${name}\`
      window.print()
      setTimeout(() => { document.title = orig }, 2000)
    }`
]]) ? 1 : 0;

// ── EarPrint.vue ──
count += patch('EarPrint.vue', [[
  `    function printPage() {
      const orig = document.title
      document.title = \`EAR_\${year}_\${(settings.value.company.name||'Studio').replace(/[^a-z0-9äöüÄÖÜß\\- ]/gi,'_')}\`
      window.print()
      setTimeout(() => { document.title = orig }, 2000)
    }`,
  `    async function downloadPDF() {
      const name = (settings.value?.company?.name || 'Studio').replace(/[^a-z0-9äöüÄÖÜß\\- ]/gi, '_')
      const filename = 'EUER_' + year + '_' + name
      try {
        await downloadPdfFromBackend('/api/pdf/ear/' + year, filename)
      } catch(e) {
        console.error('PDF-Fehler:', e)
        printPage()
      }
    }

    function printPage() {
      const orig = document.title
      document.title = \`EAR_\${year}_\${(settings.value?.company?.name||'Studio').replace(/[^a-z0-9äöüÄÖÜß\\- ]/gi,'_')}\`
      window.print()
      setTimeout(() => { document.title = orig }, 2000)
    }`
]]) ? 1 : 0;

// ── AddendumPrint.vue ──
// Uebergibt DOM-Element statt API-Pfad
count += patch('AddendumPrint.vue', [[
  `      try { await downloadPdfFromBackend(el, buildFilename()) }`,
  `      try { await downloadPdfFromBackend('/api/pdf/addendum/' + route.params.pid + '/' + route.params.aid, buildFilename()) }`
]]) ? 1 : 0;

// ── BlankContractPrint.vue ──
count += patch('BlankContractPrint.vue', [[
  `    function printContract() {
      const orig = document.title
      document.title = 'Blanko_Vertrag'
      window.print()`,
  `    async function downloadPDF() {
      try {
        await downloadPdfFromBackend('/api/pdf/blank-contract', 'Blanko_Vertrag')
      } catch(e) {
        console.error('PDF-Fehler:', e)
        printContract()
      }
    }

    function printContract() {
      const orig = document.title
      document.title = 'Blanko_Vertrag'
      window.print()`
]]) ? 1 : 0;

console.log('');
console.log(`=== ${count} Dateien gepatcht ===`);
console.log('');
console.log('Hinweis: DsgvoPrint und EarPrint haben jetzt downloadPDF().');
console.log('Falls deren Buttons noch @click="printPage" nutzen,');
console.log('aendere das manuell zu @click="downloadPDF".');
console.log('');