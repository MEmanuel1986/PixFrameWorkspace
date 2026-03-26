'use strict';
/**
 * pdfController.js — PDF-Download-Endpunkte
 *
 * Lädt Firmendaten aus settings.json und übergibt sie an renderPdf(),
 * sodass der Puppeteer footerTemplate auf jeder Seite korrekte Daten zeigt.
 */

const { renderPdf }   = require('../services/pdfService');
const settingsService = require('../services/settingsService');

function getCompany() {
  try { return settingsService.getSettings().company || {}; }
  catch { return {}; }
}

async function sendPdf(res, printPath, filename, opts = {}) {
  try {
    const buffer = await renderPdf(printPath, {
      company:        getCompany(),
      docLabel:       opts.docLabel       || 'Dokument',
      showLogoHeader: opts.showLogoHeader || false,
    });

    const safe = (filename || 'Dokument')
      .replace(/[^\w\-äöüÄÖÜß]/g, '_').replace(/__+/g, '_').slice(0, 120);

    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.pdf"`);
    res.setHeader('Content-Length',      buffer.length);
    res.end(buffer);
  } catch (err) {
    console.error('[pdfController]', err.message);
    res.status(500).json({ error: 'PDF-Generierung fehlgeschlagen', detail: err.message });
  }
}

exports.document = async (req, res) => {
  const { id } = req.params;
  let filename = req.query.filename || `Dokument_${id}`;
  let docLabel = 'Dokument';
  try {
    const DocumentService = require('../services/documentService');
    const doc = DocumentService.getById(id);
    if (doc) {
      filename = [doc.documentNumber, doc.customerName].filter(Boolean).join('_') || filename;
      if      (doc.docSubtype === 'cancellation') docLabel = 'Stornorechnung';
      else if (doc.docSubtype === 'correction')   docLabel = 'Korrekturrechnung';
      else if (doc.isDeposit)                     docLabel = 'Anzahlungsrechnung';
      else if (doc.type === 'invoice')            docLabel = 'Rechnung';
      else if (doc.type === 'quote')              docLabel = 'Angebot';
    }
  } catch {}
  await sendPdf(res, `/print/document/${id}`, filename, { docLabel });
};

exports.contract = async (req, res) => {
  const { projectId } = req.params;
  const { filename = `Vertrag_${projectId}` } = req.query;
  await sendPdf(res, `/print/contract/${projectId}`, filename, {
    docLabel: 'Fotografie- und Dienstleistungsvertrag', showLogoHeader: true,
  });
};

exports.adv = async (req, res) => {
  const { projectId } = req.params;
  const { filename = `ADV_${projectId}` } = req.query;
  await sendPdf(res, `/print/adv/${projectId}`, filename, {
    docLabel: 'Auftragsverarbeitungsvertrag (ADV)',
  });
};

exports.addendum = async (req, res) => {
  const { pid, aid } = req.params;
  const { filename = `Nachtrag_${pid}` } = req.query;
  await sendPdf(res, `/print/addendum/${pid}/${aid}`, filename, {
    docLabel: 'Nachtrag zum Fotografie- und Dienstleistungsvertrag',
  });
};

exports.agb = async (req, res) => {
  await sendPdf(res, '/print/agb', 'AGB', {
    docLabel: 'Allgemeine Geschäftsbedingungen',
  });
};

exports.dsgvo = async (req, res) => {
  await sendPdf(res, '/print/dsgvo', 'Datenschutzerklaerung', {
    docLabel: 'Datenschutzerklärung',
  });
};

exports.advVertrag = async (req, res) => {
  await sendPdf(res, '/print/adv-vertrag', 'ADV_Vertrag', {
    docLabel: 'Auftragsverarbeitungsvertrag',
  });
};

exports.ear = async (req, res) => {
  const { year } = req.params;
  await sendPdf(res, `/print/ear/${year}`, `EUER_${year}`, {
    docLabel: `Einnahmen-Ausgaben-Rechnung ${year}`,
  });
};

exports.blankContract = async (req, res) => {
  await sendPdf(res, '/print/blank-contract', 'Blanko_Vertrag', {
    docLabel: 'Fotografie- und Dienstleistungsvertrag (Blanko)', showLogoHeader: true,
  });
};
