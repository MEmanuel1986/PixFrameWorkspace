'use strict';
/**
 * pdfService.js  —  Puppeteer PDF-Generierung für PixFrameWorkspace
 *
 * v1.1.0: Puppeteer wird lazy geladen (try/catch). Der Server startet
 * auch ohne Puppeteer — PDF-Export gibt dann einen klaren Fehler zurück.
 * Wird später durch Electron Print API ersetzt.
 */

// ── Lazy Puppeteer Load ──────────────────────────────────────────────────────
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch {
  console.warn('⚠️  Puppeteer nicht installiert — PDF-Export deaktiviert.');
  console.warn('   Installieren mit: npm install puppeteer');
}

const fs   = require('fs');
const path = require('path');
const paths = require('../config/paths');

// FRONTEND_URL aus zentraler config
const FRONTEND_URL = require('../config').FRONTEND_URL;

// ── Seitenränder ──────────────────────────────────────────────────────────────
const MARGIN = {
  top:    '14mm',
  right:  '18mm',
  bottom: '28mm',
  left:   '18mm',
};

const MARGIN_WITH_HEADER = {
  top:    '22mm',
  right:  '18mm',
  bottom: '28mm',
  left:   '18mm',
};

// ── HTML-Escape ───────────────────────────────────────────────────────────────
function esc(v) {
  return String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Logo laden ────────────────────────────────────────────────────────────────
function getLogoDataUrl() {
  const exts = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
  for (const ext of exts) {
    const candidate = path.join(paths.LOGO_DIR, `logo${ext}`);
    if (fs.existsSync(candidate)) {
      try {
        const data = fs.readFileSync(candidate);
        const mime =
          ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
          ext === '.svg'                    ? 'image/svg+xml' :
          ext === '.webp'                   ? 'image/webp' :
                                              'image/png';
        return `data:${mime};base64,${data.toString('base64')}`;
      } catch {}
    }
  }
  return null;
}

// ── Footer-Template ───────────────────────────────────────────────────────────
function buildFooterTemplate(company = {}, docLabel = 'Dokument') {
  const name    = esc(company.name || '');
  const owner   = company.owner ? `Inh. ${esc(company.owner)}` : '';
  const street  = esc(company.street || '');
  const city    = `${esc(company.zipCode || '')} ${esc(company.city || '')}`.trim();
  const contact = [company.email, company.website].filter(Boolean).map(esc).join(' &middot; ');

  const col1 = [name, owner, [street, city].filter(Boolean).join(', '), contact]
    .filter(Boolean).join('<br>');

  const col2 = [
    company.bankName ? `<strong>${esc(company.bankName)}</strong>` : null,
    company.iban     ? `IBAN ${esc(company.iban)}` : null,
    company.bic      ? `BIC ${esc(company.bic)}`   : null,
  ].filter(Boolean).join('<br>');

  const col3 = [
    company.taxNumber                          ? `StNr: ${esc(company.taxNumber)}` : null,
    !company.smallBusiness && company.vatId    ? `USt-IdNr.: ${esc(company.vatId)}` : null,
    company.smallBusiness                      ? 'Kleinunternehmer &sect;&nbsp;19&nbsp;UStG' : null,
  ].filter(Boolean).join('<br>');

  return `<div style="
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
    font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;
    font-size:0;
    width:100%;
    box-sizing:border-box;
    padding:3mm 18mm 3mm 18mm;
  ">
    <div style="border-top:0.5pt solid #bbb;margin-bottom:1.5mm;"></div>
    <div style="
      display:flex;
      justify-content:space-between;
      font-size:7pt;
      color:#555;
      margin-bottom:1.5mm;
      line-height:1.4;
    ">
      <span>${esc(docLabel)} &middot; maschinell erstellt</span>
      <span style="white-space:nowrap;color:#888;">
        Seite&nbsp;<span class="pageNumber"></span>&nbsp;von&nbsp;<span class="totalPages"></span>
      </span>
    </div>
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr 1fr;
      gap:4mm;
      font-size:6.5pt;
      color:#666;
      line-height:1.65;
    ">
      <div>${col1}</div>
      <div>${col2}</div>
      <div>${col3}</div>
    </div>
  </div>`;
}

// ── Header-Template (Logo, optional) ─────────────────────────────────────────
function buildHeaderTemplate(logoDataUrl, companyName = '') {
  const inner = logoDataUrl
    ? `<img src="${logoDataUrl}" style="max-height:14mm;max-width:50mm;object-fit:contain;display:block;">`
    : `<span style="font-size:9pt;font-weight:700;color:#111;">${esc(companyName)}</span>`;

  return `<div style="
    font-size:0;
    width:100%;
    display:flex;
    justify-content:flex-end;
    align-items:flex-end;
    box-sizing:border-box;
    padding:4mm 18mm 0 0;
  ">${inner}</div>`;
}

// ── CSS das Puppeteer injiziert ───────────────────────────────────────────────
const PUPPETEER_HIDE_CSS = `
  .toolbar,
  .no-print,
  .print-hint,
  [data-no-print] { display: none !important; }

  @page { margin: 0 !important; }
  .a4   { padding: 0 !important; }
`;

// ── renderPdf ─────────────────────────────────────────────────────────────────
async function renderPdf(printPath, opts = {}) {
  // ── Puppeteer-Check ──
  if (!puppeteer) {
    throw new Error(
      'PDF-Export nicht verfügbar: Puppeteer ist nicht installiert. ' +
      'Bitte "npm install puppeteer" im Backend-Ordner ausführen.'
    );
  }

  const { company = {}, docLabel = 'Dokument', showLogoHeader = false } = opts;

  const logoDataUrl    = showLogoHeader ? getLogoDataUrl() : null;
  const headerTemplate = (showLogoHeader && (logoDataUrl || company.name))
    ? buildHeaderTemplate(logoDataUrl, company.name)
    : '<div style="font-size:0;"></div>';

  const footerTemplate = buildFooterTemplate(company, docLabel);
  const margin         = (showLogoHeader && (logoDataUrl || company.name))
    ? MARGIN_WITH_HEADER
    : MARGIN;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.emulateMediaType('print');

    await page.goto(`${FRONTEND_URL}${printPath}`, {
      waitUntil: 'networkidle0',
      timeout:   30_000,
    });

    // Vue-Reaktivität abwarten
    await new Promise(r => setTimeout(r, 900));

    // Loading-State abwarten
    await page.waitForFunction(
      () => !document.querySelector('.state-screen'),
      { timeout: 10_000 }
    ).catch(() => {});

    // UI-Elemente ausblenden
    await page.addStyleTag({ content: PUPPETEER_HIDE_CSS });
    await new Promise(r => setTimeout(r, 100));

    return await page.pdf({
      format:              'A4',
      printBackground:     true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin,
    });

  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { renderPdf };
