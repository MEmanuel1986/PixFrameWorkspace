'use strict';
/**
 * pdfService.js — PDF-Generierung für PixFrameWorkspace v1.1.0
 *
 * Primär: Electron BrowserWindow + printToPDF (Prod-Modus)
 * Fallback: Puppeteer (Dev-Modus / standalone ohne Electron)
 *
 * Die Footer/Header-Templates sind identisch — beide nutzen
 * Chromiums DevTools Protocol (CDP) unter der Haube.
 */

const fs   = require('fs');
const path = require('path');
const paths = require('../config/paths');

const FRONTEND_URL = require('../config').FRONTEND_URL;

// ── Engine Detection ──────────────────────────────────────────────────────────
let electronAvailable = false;
let BrowserWindow = null;

try {
  const electron = require('electron');
  BrowserWindow = electron.BrowserWindow;
  electronAvailable = !!BrowserWindow;
} catch {
  electronAvailable = false;
}

let puppeteer = null;
if (!electronAvailable) {
  try {
    puppeteer = require('puppeteer');
  } catch {}
}

const ENGINE = electronAvailable ? 'electron' : (puppeteer ? 'puppeteer' : 'none');
console.log(`📄 PDF-Engine: ${ENGINE}`);

// ── Margins (mm → inches für Electron, mm-Strings für Puppeteer) ──────────────
const MM_TO_INCH = 1 / 25.4;

const MARGIN_MM = { top: 14, right: 18, bottom: 28, left: 18 };
const MARGIN_HEADER_MM = { top: 22, right: 18, bottom: 28, left: 18 };

function toInches(mm) {
  return { top: mm.top * MM_TO_INCH, right: mm.right * MM_TO_INCH, bottom: mm.bottom * MM_TO_INCH, left: mm.left * MM_TO_INCH };
}

function toMmStrings(mm) {
  return { top: `${mm.top}mm`, right: `${mm.right}mm`, bottom: `${mm.bottom}mm`, left: `${mm.left}mm` };
}

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

// ── Header-Template ───────────────────────────────────────────────────────────
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

// ── CSS Injection (identisch für beide Engines) ───────────────────────────────
const PRINT_HIDE_CSS = `
  .toolbar, .no-print, .print-hint, [data-no-print] { display: none !important; }
  @page { margin: 0 !important; }
  .a4   { padding: 0 !important; }
`;

// ── Electron Engine ───────────────────────────────────────────────────────────
async function renderWithElectron(printPath, opts) {
  const { company = {}, docLabel = 'Dokument', showLogoHeader = false } = opts;

  const logoDataUrl    = showLogoHeader ? getLogoDataUrl() : null;
  const headerTemplate = (showLogoHeader && (logoDataUrl || company.name))
    ? buildHeaderTemplate(logoDataUrl, company.name)
    : '<div style="font-size:0;"></div>';
  const footerTemplate = buildFooterTemplate(company, docLabel);
  const marginMM       = (showLogoHeader && (logoDataUrl || company.name))
    ? MARGIN_HEADER_MM : MARGIN_MM;
  const margins        = toInches(marginMM);

  const win = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await win.loadURL(`${FRONTEND_URL}${printPath}`);

    // Vue-Reaktivitaet abwarten
    await new Promise(r => setTimeout(r, 1200));

    // Loading-State abwarten
    await win.webContents.executeJavaScript(`
      new Promise(resolve => {
        const check = () => {
          if (!document.querySelector('.state-screen')) return resolve();
          setTimeout(check, 200);
        };
        check();
        setTimeout(resolve, 10000);
      });
    `);

    // UI-Elemente ausblenden
    await win.webContents.insertCSS(PRINT_HIDE_CSS);
    await new Promise(r => setTimeout(r, 100));

    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margins: {
        marginType: 'custom',
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right,
      },
    });

    return Buffer.from(pdfBuffer);

  } finally {
    win.destroy();
  }
}

// ── Puppeteer Engine (Fallback fuer Dev/Standalone) ───────────────────────────
async function renderWithPuppeteer(printPath, opts) {
  if (!puppeteer) {
    throw new Error(
      'PDF-Export nicht verfuegbar: Weder Electron noch Puppeteer gefunden. ' +
      'Im Dev-Modus: npm install puppeteer im Backend-Ordner.'
    );
  }

  const { company = {}, docLabel = 'Dokument', showLogoHeader = false } = opts;

  const logoDataUrl    = showLogoHeader ? getLogoDataUrl() : null;
  const headerTemplate = (showLogoHeader && (logoDataUrl || company.name))
    ? buildHeaderTemplate(logoDataUrl, company.name)
    : '<div style="font-size:0;"></div>';
  const footerTemplate = buildFooterTemplate(company, docLabel);
  const margin         = toMmStrings(
    (showLogoHeader && (logoDataUrl || company.name)) ? MARGIN_HEADER_MM : MARGIN_MM
  );

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
      timeout: 30_000,
    });

    await new Promise(r => setTimeout(r, 900));

    await page.waitForFunction(
      () => !document.querySelector('.state-screen'),
      { timeout: 10_000 }
    ).catch(() => {});

    await page.addStyleTag({ content: PRINT_HIDE_CSS });
    await new Promise(r => setTimeout(r, 100));

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin,
    });

  } finally {
    if (browser) await browser.close();
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
async function renderPdf(printPath, opts = {}) {
  if (electronAvailable) {
    return renderWithElectron(printPath, opts);
  }
  return renderWithPuppeteer(printPath, opts);
}

module.exports = { renderPdf };