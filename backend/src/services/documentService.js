'use strict';
/**
 * DocumentService – SQLite-basiert
 *
 * Verwaltet Angebote, Rechnungen, Korrekturen, Stornos.
 * GoBD-konform: Gesperrte Rechnungen können nur korrigiert/storniert werden.
 * LineItems in separater Tabelle mit Transaktion.
 */

const { BaseRepository, generateId, rowToCamel, dataToSnake } = require('./BaseRepository');
const { getSettings }  = require('./settingsService');
const counterService    = require('./counterService');
const logger            = require('../utils/logger');
const path              = require('path');
const fs                = require('fs');

const DOC_JSON_FIELDS = ['billing_address', 'tax_groups'];

class DocumentService extends BaseRepository {
  constructor() {
    super('documents', 'documents', DOC_JSON_FIELDS);
  }

  // ── Enrichment: LineItems anhängen ────────────────────────────────

  _enrichDocument(doc) {
    if (!doc) return null;

    const liRows = this.db.prepare(
      'SELECT * FROM document_line_items WHERE document_id = ? ORDER BY sort_order'
    ).all(doc.id);

    doc.lineItems = liRows.map(r => rowToCamel(r));

    // metadata-Objekt rekonstruieren (Kompatibilität)
    doc.metadata = {
      size:     doc.fileSize || 0,
      mimeType: doc.fileMimeType || '',
    };

    return doc;
  }

  // ── LineItems synchronisieren ─────────────────────────────────────

  _syncLineItems(documentId, lineItems) {
    if (!Array.isArray(lineItems)) return;

    this.db.prepare('DELETE FROM document_line_items WHERE document_id = ?').run(documentId);

    const ins = this.db.prepare(`
      INSERT INTO document_line_items
        (document_id, article_id, description, detail, quantity, unit,
         price_net, tax_rate, discount, sort_order)
      VALUES
        (@document_id, @article_id, @description, @detail, @quantity, @unit,
         @price_net, @tax_rate, @discount, @sort_order)
    `);

    lineItems.forEach((li, i) => {
      ins.run({
        document_id: documentId,
        article_id:  li.articleId || null,
        description: li.description || '',
        detail:      li.detail || '',
        quantity:    Number(li.quantity) || 0,
        unit:        li.unit || 'Stück',
        price_net:   Number(li.priceNet) || 0,
        tax_rate:    Number(li.taxRate) || 0,
        discount:    Number(li.discount) || 0,
        sort_order:  i,
      });
    });
  }

  // ── Nummernvergabe ────────────────────────────────────────────────

  _nextNumber(type) {
    const settings = getSettings();
    const schema   = settings.numberSchemas?.[type] || {
      format: type === 'invoice' ? 'RE-{jjjj}-{mm}/{z,5}' : 'A-{jjjj}-{mm}/{z,5}',
    };
    const counter = counterService.next(type);
    return this._buildNumber(schema, counter);
  }

  _buildNumber(schema, counter) {
    if (schema.format) {
      const now  = new Date();
      const yyyy = String(now.getFullYear());
      const mm   = String(now.getMonth() + 1).padStart(2, '0');
      const dd   = String(now.getDate()).padStart(2, '0');
      return schema.format
        .replace(/\{jjjj\}/gi, yyyy).replace(/\{jj\}/gi, yyyy.slice(2))
        .replace(/\{mm\}/gi, mm).replace(/\{tt\}/gi, dd)
        .replace(/\{datum\}/gi, `${dd}.${mm}.${yyyy}`)
        .replace(/\{z,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
        .replace(/\{zj,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
        .replace(/\{zm,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
        .replace(/\{zt,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
        .replace(/\{z\}/gi, String(counter));
    }
    // Legacy
    const padded = String(counter).padStart(schema.digits || 5, '0');
    const parts  = [schema.prefix];
    const sep    = schema.separator ?? '-';
    if (schema.useYear)  parts.push(new Date().getFullYear());
    if (schema.useMonth) parts.push(String(new Date().getMonth() + 1).padStart(2, '0'));
    const inner = schema.innerSeparator !== undefined ? schema.innerSeparator : '/';
    return `${parts.join(sep)}${inner}${padded}`;
  }

  _derivedNumber(originalNumber, subtype) {
    const settings = getSettings();
    const key      = subtype === 'cancellation' ? 'cancellation' : 'correction';
    const defaults = { prefix: subtype === 'cancellation' ? 'STORNO' : 'KOR', separator: '-' };
    const schema   = settings.numberSchemas?.[key] || defaults;
    return `${schema.prefix}${schema.separator ?? '-'}${originalNumber}`;
  }

  // ── Summenberechnung ──────────────────────────────────────────────

  _calcTotals(lineItems = [], overallDiscount = 0) {
    let subtotal = 0;
    const taxMap = {};
    for (const item of lineItems) {
      const qty   = Number(item.quantity) || 0;
      const price = Number(item.priceNet) || 0;
      const disc  = Number(item.discount) || 0;
      const rate  = Number(item.taxRate)  || 0;
      const net   = qty * price * (1 - disc / 100);
      subtotal   += net;
      if (!taxMap[rate]) taxMap[rate] = { rate, base: 0, amount: 0 };
      taxMap[rate].base   += net;
      taxMap[rate].amount += net * rate / 100;
    }
    const f = overallDiscount > 0 ? (1 - overallDiscount / 100) : 1;
    if (f < 1) {
      subtotal *= f;
      for (const k of Object.keys(taxMap)) {
        taxMap[k].base   *= f;
        taxMap[k].amount *= f;
      }
    }
    const taxGroups = Object.values(taxMap);
    const total     = subtotal + taxGroups.reduce((s, g) => s + g.amount, 0);
    return { subtotal, taxGroups, total };
  }

  // ── Hilfsmethode: Flat-Daten für DB vorbereiten ───────────────────

  _flattenForDb(data) {
    const flat = { ...data };
    // lineItems werden separat gespeichert
    delete flat.lineItems;
    // metadata → flache Felder
    if (data.metadata) {
      flat.fileSize     = data.metadata.size || 0;
      flat.fileMimeType = data.metadata.mimeType || '';
      delete flat.metadata;
    }
    return flat;
  }

  // ── Öffentliche API ───────────────────────────────────────────────

  getAllDocuments() {
    return this.findAll().map(d => this._enrichDocument(d));
  }

  getById(id) {
    return this._enrichDocument(this.findById(id));
  }

  getDocumentById(id) {
    const d = this._enrichDocument(this.findById(id));
    if (!d) throw new Error(`Dokument mit ID ${id} nicht gefunden`);
    return d;
  }

  getDocumentsByCustomerId(id) {
    const rows = this.db.prepare('SELECT * FROM documents WHERE customer_id = ?').all(id);
    return rows.map(r => this._enrichDocument(rowToCamel(r, DOC_JSON_FIELDS)));
  }

  getDocumentsByProjectId(id) {
    const rows = this.db.prepare('SELECT * FROM documents WHERE project_id = ?').all(id);
    return rows.map(r => this._enrichDocument(rowToCamel(r, DOC_JSON_FIELDS)));
  }

  getDocumentsByType(type) {
    const rows = this.db.prepare('SELECT * FROM documents WHERE type = ?').all(type);
    return rows.map(r => this._enrichDocument(rowToCamel(r, DOC_JSON_FIELDS)));
  }

  searchDocuments(q) {
    const rows = this.db.prepare(`
      SELECT * FROM documents WHERE name LIKE @q OR document_number LIKE @q
    `).all({ q: `%${q}%` });
    return rows.map(r => this._enrichDocument(rowToCamel(r, DOC_JSON_FIELDS)));
  }

  // ── Neues Angebot / Rechnung ──────────────────────────────────────

  createQuoteOrInvoice(data) {
    if (!data.customerId) throw new Error('Kunden-ID ist erforderlich');
    if (!data.name)       throw new Error('Dokumentname ist erforderlich');
    if (!data.type)       throw new Error('Dokumenttyp ist erforderlich');
    if (!['quote', 'invoice'].includes(data.type)) throw new Error('Typ muss quote oder invoice sein');

    data.documentNumber = data.documentNumber || this._nextNumber(data.type);
    data.issueDate      = data.issueDate || new Date().toISOString().slice(0, 10);
    data.version        = 1;
    data.parentId       = null;
    data.supersededBy   = null;

    const tots = this._calcTotals(data.lineItems, data.discount);
    Object.assign(data, tots);

    const id   = generateId('documents');
    const flat = this._flattenForDb(data);

    this.db.transaction(() => {
      flat.id = id;
      this.insert(flat);
      this._syncLineItems(id, data.lineItems);
    })();

    const created = this.getDocumentById(id);
    logger.info(`✅ ${data.type === 'invoice' ? 'Rechnung' : 'Angebot'} erstellt: ${created.documentNumber}`);
    return created;
  }

  // ── Angebot/Rechnung bearbeiten ───────────────────────────────────

  updateQuoteOrInvoice(id, data) {
    const orig = this.getDocumentById(id);

    if (orig.type === 'invoice') {
      const LOCKED = ['Versendet', 'Bezahlt', 'Überfällig', 'Storniert'];
      if (LOCKED.includes(orig.status)) {
        throw new Error(`Rechnung im Status "${orig.status}" kann nicht bearbeitet werden. Bitte Korrekturrechnung erstellen.`);
      }
    }
    if (orig.type === 'quote' && ['Angenommen', 'Abgelehnt', 'Ersetzt'].includes(orig.status)) {
      throw new Error(`Angebot im Status "${orig.status}" kann nicht mehr bearbeitet werden.`);
    }

    const tots = this._calcTotals(data.lineItems || orig.lineItems, data.discount ?? orig.discount);
    Object.assign(data, tots);

    const flat = this._flattenForDb(data);

    this.db.transaction(() => {
      this.update(id, flat);
      if (data.lineItems) this._syncLineItems(id, data.lineItems);
    })();

    return this.getDocumentById(id);
  }

  // ── Neue Version ──────────────────────────────────────────────────

  reviseDocument(id, data) {
    const orig = this.getDocumentById(id);
    if (!['quote', 'invoice'].includes(orig.type)) throw new Error('Nur Angebote und Rechnungen können überarbeitet werden');
    if (orig.docSubtype)           throw new Error('Korrekturrechnungen/Stornos können nicht überarbeitet werden');
    if (orig.status !== 'Entwurf') throw new Error('Neue Versionen nur im Entwurfsstatus möglich');
    if (orig.supersededBy)         throw new Error('Dieses Dokument wurde bereits ersetzt');

    const parentId   = orig.parentId || orig.id;
    const newVersion = (orig.version || 1) + 1;

    const revData = {
      ...orig,
      ...data,
      version:        newVersion,
      parentId,
      supersededBy:   null,
      documentNumber: `${(orig.parentId ? orig.documentNumber.split('-v')[0] : orig.documentNumber)}-v${newVersion}`,
      issueDate:      data.issueDate || new Date().toISOString().slice(0, 10),
      status:         'Entwurf',
    };

    const tots = this._calcTotals(revData.lineItems, revData.discount);
    Object.assign(revData, tots);

    const newId = generateId('documents');
    const flat  = this._flattenForDb(revData);

    this.db.transaction(() => {
      flat.id = newId;
      delete flat.createdAt;
      delete flat.updatedAt;
      this.insert(flat);
      this._syncLineItems(newId, revData.lineItems);
      // Original als ersetzt markieren
      this.update(id, { supersededBy: newId, status: 'Ersetzt' });
    })();

    const newDoc = this.getDocumentById(newId);
    logger.info(`✅ Dokument v${newVersion} erstellt: ${newDoc.documentNumber}`);
    return newDoc;
  }

  // ── Rechnung aus Angebot ──────────────────────────────────────────

  invoiceFromQuote(quoteId, overrides = {}) {
    const quote = this.getDocumentById(quoteId);
    if (quote.type !== 'quote') throw new Error('Nur Angebote können in Rechnungen umgewandelt werden');

    const today = new Date().toISOString().slice(0, 10);
    const due14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    const invData = {
      customerId:     quote.customerId,
      projectId:      quote.projectId,
      name:           overrides.name || `Rechnung zu ${quote.documentNumber}`,
      type:           'invoice',
      lineItems:      JSON.parse(JSON.stringify(quote.lineItems)),
      discount:       quote.discount,
      billingAddress: quote.billingAddress,
      serviceDate:    quote.serviceDate,
      intro:          quote.intro,
      footer:         quote.footer,
      paymentTerms:   quote.paymentTerms || '14 Tage netto',
      paymentInfo:    quote.paymentInfo,
      notes:          '',
      ...overrides,
      issueDate:      overrides.issueDate || today,
      dueDate:        overrides.dueDate || due14,
      documentNumber: this._nextNumber('invoice'),
      quoteId,
      version: 1, parentId: null, supersededBy: null,
      status: 'Entwurf',
    };

    const tots = this._calcTotals(invData.lineItems, invData.discount);
    Object.assign(invData, tots);

    const newId = generateId('documents');
    const flat  = this._flattenForDb(invData);

    this.db.transaction(() => {
      flat.id = newId;
      this.insert(flat);
      this._syncLineItems(newId, invData.lineItems);
      this.update(quoteId, { status: 'Angenommen' });
    })();

    const invoice = this.getDocumentById(newId);
    logger.info(`✅ Rechnung aus Angebot: ${invoice.documentNumber}`);
    return invoice;
  }

  // ── Korrekturrechnung ─────────────────────────────────────────────

  correctInvoice(invoiceId, data) {
    const orig = this.getDocumentById(invoiceId);
    if (orig.type !== 'invoice') throw new Error('Nur Rechnungen können korrigiert werden');

    const negated = JSON.parse(JSON.stringify(orig.lineItems)).map(i => ({
      ...i, priceNet: -(Math.abs(Number(i.priceNet))),
    }));

    const corrData = {
      customerId:     orig.customerId,
      projectId:      orig.projectId,
      name:           data.name || `Korrektur zu ${orig.documentNumber}`,
      type:           'invoice',
      docSubtype:     'correction',
      correctionOf:   invoiceId,
      lineItems:      data.lineItems || negated,
      discount:       data.discount ?? 0,
      billingAddress: orig.billingAddress,
      serviceDate:    orig.serviceDate,
      paymentTerms:   orig.paymentTerms,
      paymentInfo:    orig.paymentInfo,
      intro:          data.intro || `Korrektur zur Rechnung ${orig.documentNumber}`,
      footer:         data.footer || orig.footer,
      notes:          data.notes || '',
      documentNumber: this._derivedNumber(orig.documentNumber, 'correction'),
      issueDate:      data.issueDate || new Date().toISOString().slice(0, 10),
      status:         'Entwurf',
      version: 1, parentId: null, supersededBy: null,
    };

    const tots = this._calcTotals(corrData.lineItems, corrData.discount);
    Object.assign(corrData, tots);

    const newId = generateId('documents');
    const flat  = this._flattenForDb(corrData);

    this.db.transaction(() => {
      flat.id = newId;
      this.insert(flat);
      this._syncLineItems(newId, corrData.lineItems);
    })();

    const correction = this.getDocumentById(newId);
    logger.info(`✅ Korrekturrechnung: ${correction.documentNumber}`);
    return correction;
  }

  // ── Stornorechnung ────────────────────────────────────────────────

  cancelInvoice(invoiceId, reason = '') {
    const orig = this.getDocumentById(invoiceId);
    if (orig.type !== 'invoice')     throw new Error('Nur Rechnungen können storniert werden');
    if (orig.status === 'Storniert') throw new Error('Bereits storniert');

    const negated = JSON.parse(JSON.stringify(orig.lineItems)).map(i => ({
      ...i, priceNet: -(Math.abs(Number(i.priceNet))),
    }));

    const cancelData = {
      customerId:     orig.customerId,
      projectId:      orig.projectId,
      name:           `Stornorechnung zu ${orig.documentNumber}`,
      type:           'invoice',
      docSubtype:     'cancellation',
      correctionOf:   invoiceId,
      lineItems:      negated,
      discount:       0,
      billingAddress: orig.billingAddress,
      serviceDate:    orig.serviceDate,
      paymentTerms:   orig.paymentTerms,
      paymentInfo:    orig.paymentInfo,
      intro:          reason ? `Stornierung wegen: ${reason}` : `Stornierung der Rechnung ${orig.documentNumber}`,
      footer:         orig.footer,
      notes:          reason,
      documentNumber: this._derivedNumber(orig.documentNumber, 'cancellation'),
      issueDate:      new Date().toISOString().slice(0, 10),
      status:         'Versendet',
      version: 1, parentId: null, supersededBy: null,
    };

    const tots = this._calcTotals(cancelData.lineItems, 0);
    Object.assign(cancelData, tots);

    const newId = generateId('documents');
    const flat  = this._flattenForDb(cancelData);

    let cancelDoc;
    this.db.transaction(() => {
      flat.id = newId;
      this.insert(flat);
      this._syncLineItems(newId, cancelData.lineItems);
      this.update(invoiceId, { status: 'Storniert', supersededBy: newId });
    })();

    cancelDoc = this.getDocumentById(newId);
    logger.info(`✅ Stornorechnung: ${cancelDoc.documentNumber}`);
    return { cancelDoc, originalId: invoiceId };
  }

  // ── Status ändern ─────────────────────────────────────────────────

  updateStatus(id, status, extra = {}) {
    this.getDocumentById(id);
    const patch = { status };
    if (extra.paidAt)        patch.paidAt        = extra.paidAt;
    if (extra.paymentMethod) patch.paymentMethod = extra.paymentMethod;
    return this.update(id, patch);
  }

  // ── Einfaches Dokument (Datei-Upload) ─────────────────────────────

  createDocument(data, uploadedFile = null) {
    if (!data.customerId) throw new Error('Kunden-ID ist erforderlich');
    if (!data.name)       throw new Error('Dokumentname ist erforderlich');
    if (!data.type)       throw new Error('Dokumenttyp ist erforderlich');

    if (uploadedFile) {
      data.filePath     = uploadedFile.path || null;
      data.fileSize     = uploadedFile.size || 0;
      data.fileMimeType = uploadedFile.mimetype || '';
    }

    const flat = this._flattenForDb(data);
    const id   = generateId('documents');

    this.db.transaction(() => {
      flat.id = id;
      this.insert(flat);
      if (data.lineItems) this._syncLineItems(id, data.lineItems);
    })();

    const created = this.getDocumentById(id);
    logger.info(`✅ Dokument erstellt: ${created.id}`);
    return created;
  }

  updateDocument(id, data) {
    this.getDocumentById(id);

    if (data.lineItems) {
      const tots = this._calcTotals(data.lineItems, data.discount);
      Object.assign(data, tots);
    }

    const flat = this._flattenForDb(data);

    this.db.transaction(() => {
      this.update(id, flat);
      if (data.lineItems) this._syncLineItems(id, data.lineItems);
    })();

    return this.getDocumentById(id);
  }

  deleteDocument(id) {
    const doc = this.getDocumentById(id);
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }
    // CASCADE löscht LineItems automatisch
    return this.delete(id);
  }
}

module.exports = new DocumentService();
