'use strict';
/**
 * CustomerService – SQLite-basiert
 *
 * Gleiche öffentliche API wie die alte JSON-Version.
 * Controller müssen nicht geändert werden.
 */

const { BaseRepository } = require('./BaseRepository');
const { getSettings }     = require('./settingsService');
const counterService      = require('./counterService');
const logger              = require('../utils/logger');

class CustomerService extends BaseRepository {
  constructor() {
    super('customers', 'customers', /* jsonFields */ []);
  }

  // ── Nummernvergabe ────────────────────────────────────────────────

  _generateCustomerNumber() {
    const settings = getSettings();
    const schema   = settings.numberSchemas?.customer || { format: 'K-{z,5}' };
    const counter  = counterService.next('customer');

    if (schema.format) {
      return this._buildFromFormat(schema.format, counter);
    }

    // Legacy-Fallback
    const padded = String(counter).padStart(schema.digits || 5, '0');
    const sep    = schema.separator ?? '-';
    return `${schema.prefix || 'K'}${sep}${padded}`;
  }

  _buildFromFormat(fmt, counter) {
    const now  = new Date();
    const yyyy = String(now.getFullYear());
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    return fmt
      .replace(/\{jjjj\}/gi, yyyy).replace(/\{jj\}/gi, yyyy.slice(2))
      .replace(/\{mm\}/gi, mm).replace(/\{tt\}/gi, dd)
      .replace(/\{z,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
      .replace(/\{zj,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
      .replace(/\{zm,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
      .replace(/\{zt,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
      .replace(/\{z\}/gi, String(counter));
  }

  // ── Öffentliche API (kompatibel mit CustomerController) ───────────

  getAllCustomers() {
    return this.findAll();
  }

  getCustomerById(id) {
    const c = this.findById(id);
    if (!c) throw new Error(`Kunde mit ID ${id} nicht gefunden`);
    return c;
  }

  createCustomer(data) {
    // Validierung
    const errors = [];
    if (!data.firstName || !data.firstName.trim()) errors.push('Vorname ist erforderlich');
    if (!data.lastName  || !data.lastName.trim())  errors.push('Nachname ist erforderlich');
    if (!data.email     || !data.email.trim())     errors.push('Email ist erforderlich');
    if (errors.length) throw new Error(errors.join(', '));

    if (!data.customerNumber || !data.customerNumber.trim()) {
      data.customerNumber = this._generateCustomerNumber();
    }

    const created = this.insert(data);
    logger.info(`✅ Kunde erstellt: ${created.id} — ${created.customerNumber}`);
    return created;
  }

  updateCustomer(id, data) {
    this.getCustomerById(id); // Existenz prüfen
    const updated = this.update(id, data);
    logger.info(`✅ Kunde aktualisiert: ${id}`);
    return updated;
  }

  deleteCustomer(id) {
    this.getCustomerById(id);
    const result = this.delete(id);
    logger.info(`✅ Kunde gelöscht: ${id}`);
    return result;
  }

  getCustomersByType(type) {
    return this.findByField('type', type);
  }

  searchCustomers(query) {
    return this.search(query, [
      'first_name', 'last_name', 'customer_number', 'company', 'email', 'city'
    ]);
  }
}

module.exports = new CustomerService();
