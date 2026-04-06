'use strict';
/**
 * FibuService – Finanzbuchhaltung (SQLite-basiert)
 *
 * Verwaltet drei Entitäten in separaten Tabellen:
 *  - expenses          (Betriebsausgaben)
 *  - mileage           (Fahrtenbuch)
 *  - external_invoices (Eingangsrechnungen)
 */

const { rowToCamel } = require('./BaseRepository');
const path = require('path');
const fs   = require('fs');

class FibuService {
  get db() {
    return require('../database/databaseService').connection;
  }

  // ── Kompatibilität: Gesamtes FiBu-Objekt zurückgeben ──────────────
  getAllFibu() {
    return {
      expenses:         this._allExpenses(),
      mileage:          this._allMileage(),
      externalInvoices: this._allExternalInvoices(),
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // EXPENSES
  // ════════════════════════════════════════════════════════════════════

  _allExpenses() {
    return this.db.prepare('SELECT * FROM expenses ORDER BY date DESC').all()
      .map(r => rowToCamel(r));
  }

  async createExpense(body, file) {
    const receiptPath = file ? await this._saveReceiptFile(file) : null;
    const id = 'exp_' + Date.now();

    this.db.prepare(`
      INSERT INTO expenses (id, date, category, description, invoice_number,
        amount, tax_rate, vendor, notes, receipt_path, created_at)
      VALUES (@id, @date, @category, @description, @invoice_number,
        @amount, @tax_rate, @vendor, @notes, @receipt_path, @created_at)
    `).run({
      id,
      date:           body.date || new Date().toISOString().slice(0, 10),
      category:       body.category || 'Sonstiges',
      description:    body.description || '',
      invoice_number: body.invoiceNumber || '',
      amount:         parseFloat(body.amount) || 0,
      tax_rate:       parseFloat(body.taxRate) || 0,
      vendor:         body.vendor || '',
      notes:          body.notes || '',
      receipt_path:   receiptPath,
      created_at:     new Date().toISOString(),
    });

    return rowToCamel(this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id));
  }

  async updateExpense(id, body, file) {
    const existing = this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!existing) throw new Error('Ausgabe nicht gefunden');

    const receiptPath = file ? await this._saveReceiptFile(file) : existing.receipt_path;

    this.db.prepare(`
      UPDATE expenses SET
        date = @date, category = @category, description = @description,
        invoice_number = @invoice_number, amount = @amount, tax_rate = @tax_rate,
        vendor = @vendor, notes = @notes, receipt_path = @receipt_path,
        updated_at = @updated_at
      WHERE id = @id
    `).run({
      id,
      date:           body.date || existing.date,
      category:       body.category || existing.category,
      description:    body.description ?? existing.description,
      invoice_number: body.invoiceNumber ?? existing.invoice_number,
      amount:         body.amount !== undefined ? parseFloat(body.amount) : existing.amount,
      tax_rate:       body.taxRate !== undefined ? parseFloat(body.taxRate) : existing.tax_rate,
      vendor:         body.vendor ?? existing.vendor,
      notes:          body.notes ?? existing.notes,
      receipt_path:   receiptPath,
      updated_at:     new Date().toISOString(),
    });

    return rowToCamel(this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id));
  }

  deleteExpense(id) {
    this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  }

  // ════════════════════════════════════════════════════════════════════
  // MILEAGE
  // ════════════════════════════════════════════════════════════════════

  _allMileage() {
    return this.db.prepare('SELECT * FROM mileage ORDER BY date DESC').all()
      .map(r => rowToCamel(r));
  }

  createMileage(body) {
    const id = 'km_' + Date.now();

    this.db.prepare(`
      INSERT INTO mileage (id, date, customer_id, customer_name, project_id,
        invoice_number, destination, purpose, km, source, created_at)
      VALUES (@id, @date, @customer_id, @customer_name, @project_id,
        @invoice_number, @destination, @purpose, @km, @source, @created_at)
    `).run({
      id,
      date:           body.date || new Date().toISOString().slice(0, 10),
      customer_id:    body.customerId || null,
      customer_name:  body.customerName || '',
      project_id:     body.projectId || null,
      invoice_number: body.invoiceNumber || '',
      destination:    body.destination || '',
      purpose:        body.purpose || '',
      km:             parseFloat(body.km) || 0,
      source:         body.source || 'manual',
      created_at:     new Date().toISOString(),
    });

    return rowToCamel(this.db.prepare('SELECT * FROM mileage WHERE id = ?').get(id));
  }

  updateMileage(id, body) {
    const existing = this.db.prepare('SELECT * FROM mileage WHERE id = ?').get(id);
    if (!existing) throw new Error('Fahrt nicht gefunden');

    this.db.prepare(`
      UPDATE mileage SET
        date = @date, customer_id = @customer_id, customer_name = @customer_name,
        project_id = @project_id, invoice_number = @invoice_number,
        destination = @destination, purpose = @purpose, km = @km, updated_at = @updated_at
      WHERE id = @id
    `).run({
      id,
      date:           body.date || existing.date,
      customer_id:    body.customerId ?? existing.customer_id,
      customer_name:  body.customerName ?? existing.customer_name,
      project_id:     body.projectId ?? existing.project_id,
      invoice_number: body.invoiceNumber ?? existing.invoice_number,
      destination:    body.destination ?? existing.destination,
      purpose:        body.purpose ?? existing.purpose,
      km:             body.km !== undefined ? parseFloat(body.km) : existing.km,
      updated_at:     new Date().toISOString(),
    });

    return rowToCamel(this.db.prepare('SELECT * FROM mileage WHERE id = ?').get(id));
  }

  deleteMileage(id) {
    this.db.prepare('DELETE FROM mileage WHERE id = ?').run(id);
  }

  // ════════════════════════════════════════════════════════════════════
  // EXTERNAL INVOICES
  // ════════════════════════════════════════════════════════════════════

  _allExternalInvoices() {
    return this.db.prepare('SELECT * FROM external_invoices ORDER BY date DESC').all()
      .map(r => rowToCamel(r));
  }

  async createExternalInvoice(body, file) {
    const receiptPath = file ? await this._saveReceiptFile(file) : null;
    const id = 'extinv_' + Date.now();

    this.db.prepare(`
      INSERT INTO external_invoices (id, date, vendor, invoice_number, category,
        description, amount_net, tax_rate, amount_gross, payment_status,
        paid_at, payment_method, notes, receipt_path, created_at)
      VALUES (@id, @date, @vendor, @invoice_number, @category,
        @description, @amount_net, @tax_rate, @amount_gross, @payment_status,
        @paid_at, @payment_method, @notes, @receipt_path, @created_at)
    `).run({
      id,
      date:           body.date || new Date().toISOString().slice(0, 10),
      vendor:         body.vendor || '',
      invoice_number: body.invoiceNumber || '',
      category:       body.category || 'Sonstiges',
      description:    body.description || '',
      amount_net:     parseFloat(body.amountNet) || 0,
      tax_rate:       parseFloat(body.taxRate) || 0,
      amount_gross:   parseFloat(body.amountGross) || 0,
      payment_status: body.paymentStatus || 'Offen',
      paid_at:        body.paidAt || null,
      payment_method: body.paymentMethod || '',
      notes:          body.notes || '',
      receipt_path:   receiptPath,
      created_at:     new Date().toISOString(),
    });

    return rowToCamel(this.db.prepare('SELECT * FROM external_invoices WHERE id = ?').get(id));
  }

  async updateExternalInvoice(id, body, file) {
    const existing = this.db.prepare('SELECT * FROM external_invoices WHERE id = ?').get(id);
    if (!existing) throw new Error('Eingangsrechnung nicht gefunden');

    const receiptPath = file ? await this._saveReceiptFile(file) : existing.receipt_path;

    this.db.prepare(`
      UPDATE external_invoices SET
        date = @date, vendor = @vendor, invoice_number = @invoice_number,
        category = @category, description = @description,
        amount_net = @amount_net, tax_rate = @tax_rate, amount_gross = @amount_gross,
        payment_status = @payment_status, paid_at = @paid_at,
        payment_method = @payment_method, notes = @notes,
        receipt_path = @receipt_path, updated_at = @updated_at
      WHERE id = @id
    `).run({
      id,
      date:           body.date || existing.date,
      vendor:         body.vendor ?? existing.vendor,
      invoice_number: body.invoiceNumber ?? existing.invoice_number,
      category:       body.category || existing.category,
      description:    body.description ?? existing.description,
      amount_net:     body.amountNet !== undefined ? parseFloat(body.amountNet) : existing.amount_net,
      tax_rate:       body.taxRate !== undefined ? parseFloat(body.taxRate) : existing.tax_rate,
      amount_gross:   body.amountGross !== undefined ? parseFloat(body.amountGross) : existing.amount_gross,
      payment_status: body.paymentStatus || existing.payment_status,
      paid_at:        body.paidAt !== undefined ? body.paidAt : existing.paid_at,
      payment_method: body.paymentMethod ?? existing.payment_method,
      notes:          body.notes ?? existing.notes,
      receipt_path:   receiptPath,
      updated_at:     new Date().toISOString(),
    });

    return rowToCamel(this.db.prepare('SELECT * FROM external_invoices WHERE id = ?').get(id));
  }

  deleteExternalInvoice(id) {
    this.db.prepare('DELETE FROM external_invoices WHERE id = ?').run(id);
  }

  // ── Receipt Upload ────────────────────────────────────────────────

  async _saveReceiptFile(file) {
    if (!file) return null;
    const appPaths = require('../config/paths');
    const receiptsDir = appPaths.BUCHHALTUNG_BELEGE_DIR;
    if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });
    const safeName = Date.now() + '_' + (file.name || 'receipt').replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = path.join(receiptsDir, safeName);
    await new Promise((resolve, reject) => file.mv(dest, err => err ? reject(err) : resolve()));
    return `/buchhaltung/belege/${safeName}`;
  }
}

module.exports = new FibuService();
