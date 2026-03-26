const svc = require('../services/supplierService');

module.exports = {
  async getAll(req, res) {
    try {
      const q = req.query.q;
      const data = q ? svc.search(q) : svc.getAll();
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
  async getById(req, res) {
    try {
      const s = svc.getById(req.params.id);
      if (!s) return res.status(404).json({ error: 'Nicht gefunden' });
      res.json({ success: true, data: s });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
  async create(req, res) {
    try { res.status(201).json({ success: true, data: svc.create(req.body) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  },
  async update(req, res) {
    try { res.json({ success: true, data: svc.update(req.params.id, req.body) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  },
  async delete(req, res) {
    try { svc.delete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  },
};
