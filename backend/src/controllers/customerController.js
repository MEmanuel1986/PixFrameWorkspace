const customerService = require('../services/customerService');

class CustomerController {
  /**
   * GET /api/customers - Alle Kunden abrufen
   */
  async getAll(req, res, next) {
    try {
      const { type, search } = req.query;

      let customers;
      if (search) {
        customers = customerService.searchCustomers(search);
      } else if (type) {
        customers = customerService.getCustomersByType(type);
      } else {
        customers = customerService.getAllCustomers();
      }

      res.json({
        success: true,
        count: customers.length,
        data: customers,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/customers/:id - Einen Kunden abrufen
   */
  async getById(req, res, next) {
    try {
      const customer = customerService.getCustomerById(req.params.id);
      res.json({ success: true, data: customer });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }

  /**
   * POST /api/customers - Neuen Kunden erstellen
   */
  async create(req, res, next) {
    try {
      const customer = customerService.createCustomer(req.body);
      res.status(201).json({ success: true, data: customer });
    } catch (err) {
      console.error('[CustomerController.create]', err.message, '| body:', JSON.stringify(req.body));
      res.status(400).json({ error: err.message || 'Unbekannter Fehler beim Erstellen' });
    }
  }

  /**
   * PUT /api/customers/:id - Kunden aktualisieren
   */
  async update(req, res, next) {
    try {
      const customer = customerService.updateCustomer(req.params.id, req.body);
      res.json({ success: true, data: customer });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * DELETE /api/customers/:id - Kunden löschen
   */
  async delete(req, res, next) {
    try {
      const result = customerService.deleteCustomer(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }
}

module.exports = new CustomerController();