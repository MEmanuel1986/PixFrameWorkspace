const svc = require('../services/documentService');

class DocumentController {
  async getAll(req, res, next) {
    try {
      const { type, search } = req.query;
      const docs = search ? svc.searchDocuments(search) : type ? svc.getDocumentsByType(type) : svc.getAllDocuments();
      res.json({ success: true, count: docs.length, data: docs });
    } catch (e) { next(e); }
  }
  async getById(req, res) {
    try { res.json({ success: true, data: svc.getDocumentById(req.params.id) }); }
    catch (e) { res.status(404).json({ error: e.message }); }
  }
  async getByCustomer(req, res, next) {
    try { const d = svc.getDocumentsByCustomerId(req.params.customerId); res.json({ success: true, count: d.length, data: d }); }
    catch (e) { next(e); }
  }
  async getByProject(req, res, next) {
    try { const d = svc.getDocumentsByProjectId(req.params.projectId); res.json({ success: true, count: d.length, data: d }); }
    catch (e) { next(e); }
  }

  // POST /api/documents/generate
  async generate(req, res) {
    try { res.status(201).json({ success: true, data: svc.createQuoteOrInvoice(req.body) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  }

  // PUT /api/documents/:id/edit  (Entwurf bearbeiten)
  async editDoc(req, res) {
    try { res.json({ success: true, data: svc.updateQuoteOrInvoice(req.params.id, req.body) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  }

  // POST /api/documents/:id/revise
  async revise(req, res) {
    try { res.status(201).json({ success: true, data: svc.reviseDocument(req.params.id, req.body) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  }

  // POST /api/documents/:id/invoice
  async invoiceFromQuote(req, res) {
    try { res.status(201).json({ success: true, data: svc.invoiceFromQuote(req.params.id, req.body) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  }

  // POST /api/documents/:id/correct
  async correct(req, res) {
    try { res.status(201).json({ success: true, data: svc.correctInvoice(req.params.id, req.body) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  }

  // POST /api/documents/:id/cancel
  async cancel(req, res) {
    try { res.status(201).json({ success: true, data: svc.cancelInvoice(req.params.id, req.body.reason) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  }

  // PATCH /api/documents/:id/status
  async setStatus(req, res) {
    try {
      const { status, paidAt, paymentMethod } = req.body
      res.json({ success: true, data: svc.updateStatus(req.params.id, status, { paidAt, paymentMethod }) });
    }
    catch (e) { res.status(400).json({ error: e.message }); }
  }

  async create(req, res) {
    try { res.status(201).json({ success: true, data: svc.createDocument(req.body, req.files?.document || null) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  }
  async update(req, res) {
    try { res.json({ success: true, data: svc.updateDocument(req.params.id, req.body) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  }
  async delete(req, res) {
    try { res.json({ success: true, data: svc.deleteDocument(req.params.id) }); }
    catch (e) { res.status(404).json({ error: e.message }); }
  }
}

module.exports = new DocumentController();
