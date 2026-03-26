'use strict';
/**
 * fibuController.js — HTTP-Adapter für FiBu.
 * Logik in services/fibuService.js.
 */

const fibuService     = require('../services/fibuService');
const datevService    = require('../services/datevService');
const settingsService = require('../services/settingsService');
const documentService = require('../services/documentService');

const fibuController = {

  getAll(req, res) {
    try {
      res.json({ data: fibuService.getAllFibu() });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async createExpense(req, res) {
    try {
      const exp = await fibuService.createExpense(req.body, req.files?.receipt);
      res.json({ data: exp });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async updateExpense(req, res) {
    try {
      const exp = await fibuService.updateExpense(req.params.id, req.body, req.files?.receipt);
      res.json({ data: exp });
    } catch (e) {
      res.status(e.message.includes('nicht gefunden') ? 404 : 500).json({ error: e.message });
    }
  },

  deleteExpense(req, res) {
    try {
      fibuService.deleteExpense(req.params.id);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  createMileage(req, res) {
    try {
      const entry = fibuService.createMileage(req.body);
      res.json({ data: entry });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  updateMileage(req, res) {
    try {
      const entry = fibuService.updateMileage(req.params.id, req.body);
      res.json({ data: entry });
    } catch (e) {
      res.status(e.message.includes('nicht gefunden') ? 404 : 500).json({ error: e.message });
    }
  },

  deleteMileage(req, res) {
    try {
      fibuService.deleteMileage(req.params.id);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  // BQ-5: DATEV CSV-Export
  datevExport(req, res) {
    try {
      const year     = parseInt(req.query.year) || new Date().getFullYear();
      const fibu     = fibuService.getAllFibu();
      const settings = settingsService.getSettings();
      // Bezahlte Rechnungen (Haben-Seite) aus Dokumenten laden
      const invoices = documentService.getAllDocuments().filter(d =>
        d.type === 'invoice' &&
        (d.status === 'Bezahlt' || d.status === 'bezahlt') &&
        d.paidAt
      );
      const csv      = datevService.generateDatevCsv(fibu, settings, year, invoices);
      const filename = `DATEV_${year}_PixFrame.csv`;
      res.setHeader('Content-Type',        'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      // BOM für Excel-Kompatibilität
      res.end('\uFEFF' + csv);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  // BQ-7 — Eingangsrechnungen (Externer Rechnungsimport, Variante A)
  async createExternalInvoice(req, res) {
    try {
      const inv = await fibuService.createExternalInvoice(req.body, req.files?.receipt);
      res.json({ data: inv });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async updateExternalInvoice(req, res) {
    try {
      const inv = await fibuService.updateExternalInvoice(req.params.id, req.body, req.files?.receipt);
      res.json({ data: inv });
    } catch (e) {
      res.status(e.message.includes('nicht gefunden') ? 404 : 500).json({ error: e.message });
    }
  },

  deleteExternalInvoice(req, res) {
    try {
      fibuService.deleteExternalInvoice(req.params.id);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};

module.exports = fibuController;
