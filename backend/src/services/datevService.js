'use strict';
/**
 * datevService.js
 * BQ-5: DATEV Buchungsexport (CSV) aus den FiBu-Daten.
 *
 * Exportiert DREI Buchungstypen:
 *   HABEN — Einnahmen (bezahlte Rechnungen aus documents.json)
 *   SOLL  — Ausgaben (expenses aus fibu.json)
 *   SOLL  — Fahrtkosten (mileage aus fibu.json, bewertet mit km-Pauschale)
 *
 * Format: DATEV Buchungsexport CSV (SKR03, UTF-8 mit BOM)
 * Kontenrahmen SKR03 (typisch Kleinunternehmer/Freiberufler Fotografie):
 *   8200 — Erlöse §19 UStG (Kleinunternehmer, steuerfrei)
 *   8400 — Erlöse 19% USt
 *   8300 — Erlöse 7% USt
 *   1800 — Bank
 *   1200 — Kasse
 *   0480 — Werkzeuge/Geräte (Kamera, Equipment)
 *   4822 — Lizenzen/Software
 *   4670 — Reisekosten/Fahrtkosten
 *   4930 — Büromaterial
 *   4610 — Werbekosten
 *   4360 — Versicherungen
 *   4920 — Telefon/Internet
 *   4800 — Fortbildung
 *   4980 — Sonstige Betriebsausgaben
 */

const EXPENSE_ACCOUNTS = {
  'Kamera & Ausrüstung':   '0480',
  'Software & Lizenzen':   '4822',
  'Fahrtkosten':           '4670',
  'Büro & Bürobedarf':     '4930',
  'Marketing & Werbung':   '4610',
  'Versicherung':          '4360',
  'Telefon & Internet':    '4920',
  'Weiterbildung':         '4800',
  'Sonstiges':             '4980',
};

// Erlös-Konto je Steuersatz (SKR03)
function erloeKonto(isSmall, taxRate) {
  if (isSmall) return '8200';           // §19 UStG
  if (taxRate === 19) return '8400';
  if (taxRate === 7)  return '8300';
  return '8200';                         // Fallback steuerfrei
}

function fmtDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

function fmtAmt(v) {
  return Number(v || 0).toFixed(2).replace('.', ',');
}

function csvRow(fields) {
  return fields.map(f => {
    const s = String(f ?? '');
    return (s.includes(';') || s.includes('"') || s.includes('\n'))
      ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';');
}

// DATEV Leerfelder — wir nutzen 43 Spalten, Rest leer
const EMPTY = new Array(30).fill('');

/**
 * Generiert DATEV-CSV.
 *
 * @param {object} fibu      - { expenses: [], mileage: [] }
 * @param {object} settings  - Einstellungen (bookingTerms, company)
 * @param {number} year      - Filterjahr
 * @param {Array}  invoices  - Bezahlte Rechnungen aus documents.json
 * @returns {string}         - CSV-String (ohne BOM — BOM fügt Controller hinzu)
 */
function generateDatevCsv(fibu, settings, year, invoices = []) {
  const kmRate  = settings?.bookingTerms?.defaultKmRate ?? 0.30;
  const isSmall = !!settings?.company?.smallBusiness;

  const inYear = d => d && new Date(d).getFullYear() === year;

  const rows = [];

  // ── DATEV-Header ──────────────────────────────────────────────────────────
  rows.push(csvRow([
    'Umsatz (ohne Soll/Haben-Kz)',
    'Soll/Haben-Kennzeichen',
    'WKZ Umsatz',
    'Kurs',
    'Basis-Umsatz',
    'WKZ Basis-Umsatz',
    'Konto',
    'Gegenkonto (ohne BU-Schlüssel)',
    'BU-Schlüssel',
    'Belegdatum',
    'Belegfeld 1',
    'Buchungstext',
    'EU-Land u. UStID',
    'EU-Steuersatz',
    ...EMPTY.slice(0, 15),
    'Steuersatz',
    'Land',
  ]));

  // ── HABEN: Bezahlte Rechnungen (Einnahmen) ────────────────────────────────
  for (const inv of invoices) {
    const paidDate = inv.paidAt || inv.issueDate;
    if (!inYear(paidDate)) continue;
    if (!inv.total || inv.total <= 0) continue;

    // Brutto-Betrag der Rechnung
    const amount  = inv.total;
    // Hauptsteuersatz der Rechnung ermitteln
    const taxRate = inv.taxGroups?.[0]?.rate
      ?? (isSmall ? 0 : 19);
    const konto   = erloeKonto(isSmall, taxRate);
    const buKey   = isSmall ? '' : (taxRate === 19 ? '9' : taxRate === 7 ? '8' : '');
    const text    = [inv.documentNumber, inv.customerName || inv.name]
      .filter(Boolean).join(' / ').slice(0, 60);
    const belegnr = inv.documentNumber || inv.id?.slice(-8) || '';
    const steuer  = isSmall ? '' : String(taxRate);

    rows.push(csvRow([
      fmtAmt(amount),
      'H',          // HABEN — Einnahme
      'EUR',
      '', '', '',
      konto,        // Erlöskonto (8200/8400/8300)
      '1800',       // Gegenkonto: Bank
      buKey,
      fmtDate(paidDate),
      belegnr,
      text,
      '', '',
      ...EMPTY.slice(0, 15),
      steuer,
      '',
    ]));
  }

  // ── SOLL: Ausgaben (Betriebsausgaben) ────────────────────────────────────
  for (const exp of (fibu.expenses || [])) {
    if (!inYear(exp.date)) continue;
    if (!exp.amount || exp.amount <= 0) continue;

    const konto   = EXPENSE_ACCOUNTS[exp.category] || '4980';
    const taxRate = Number(exp.taxRate) || 0;
    const buKey   = isSmall ? '' : (taxRate === 19 ? '9' : taxRate === 7 ? '8' : '');
    const steuer  = isSmall ? '' : String(taxRate);
    const text    = [exp.description, exp.vendor].filter(Boolean).join(' / ').slice(0, 60);
    const belegnr = exp.invoiceNumber || exp.id?.slice(-8) || '';

    rows.push(csvRow([
      fmtAmt(exp.amount),
      'S',          // SOLL — Ausgabe
      'EUR',
      '', '', '',
      konto,
      '1800',       // Gegenkonto: Bank
      buKey,
      fmtDate(exp.date),
      belegnr,
      text,
      '', '',
      ...EMPTY.slice(0, 15),
      steuer,
      '',
    ]));
  }

  // ── SOLL: Fahrtkosten (km × Pauschale) ───────────────────────────────────
  for (const km of (fibu.mileage || [])) {
    if (!inYear(km.date)) continue;
    const amount = (km.km || 0) * kmRate;
    if (amount <= 0) continue;

    const text    = [`Fahrt: ${km.destination || ''}`, km.customerName]
      .filter(Boolean).join(' / ').slice(0, 60);
    const belegnr = km.invoiceNumber || km.id?.slice(-8) || '';

    rows.push(csvRow([
      fmtAmt(amount),
      'S',          // SOLL — Fahrtkosten
      'EUR',
      '', '', '',
      '4670',       // Reisekosten
      '1800',       // Bank
      '',
      fmtDate(km.date),
      belegnr,
      text,
      '', '',
      ...EMPTY.slice(0, 15),
      '',
      '',
    ]));
  }

  return rows.join('\r\n');
}

module.exports = { generateDatevCsv };
