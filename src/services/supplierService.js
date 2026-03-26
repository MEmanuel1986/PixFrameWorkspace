'use strict';

const { BaseRepository } = require('./BaseRepository');
const { getSettings }     = require('./settingsService');
const counterService      = require('./counterService');

class SupplierService extends BaseRepository {
  constructor() {
    super('suppliers', 'sup', []);
  }

  _generateSupplierNumber() {
    const settings = getSettings();
    const schema   = settings.numberSchemas?.supplier || { format: 'L-{z,5}' };
    const counter  = counterService.next('supplier');

    if (schema.format) {
      const padMatch = schema.format.match(/\{z(?:j|m|t)?,(\d+)\}/i);
      const digits   = padMatch ? Number(padMatch[1]) : 5;
      return schema.format
        .replace(/\{z(?:j|m|t)?,\d+\}/gi, String(counter).padStart(digits, '0'))
        .replace(/\{z(?:j|m|t)?\}/gi, String(counter));
    }
    return `L-${String(counter).padStart(5, '0')}`;
  }

  // ── Öffentliche API ───────────────────────────────────────────────

  getAll()    { return this.findAll(); }
  getById(id) {
    const s = this.findById(id);
    if (!s) throw new Error(`Lieferant mit ID ${id} nicht gefunden`);
    return s;
  }

  search(q) {
    return super.search(q, ['company', 'supplier_number', 'contact_person']);
  }

  create(data) {
    data.supplierNumber = data.supplierNumber || this._generateSupplierNumber();
    return this.insert(data);
  }

  // update und delete werden von BaseRepository geerbt
}

module.exports = new SupplierService();
