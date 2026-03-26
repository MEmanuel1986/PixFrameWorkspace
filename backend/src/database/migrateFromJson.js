'use strict';
/**
 * migrateFromJson.js – Einmalige Migration von JSON-Dateien nach SQLite
 *
 * FIX v1.1: Nummernkreise werden nach dem Import aus den tatsächlich
 * vorhandenen Datensätzen berechnet (nicht nur aus counters.json).
 */

const path   = require('path');
const fs     = require('fs');
const logger = require('../utils/logger');

function migrateFromJson(db, jsonDataDir) {
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('  JSON → SQLite Migration gestartet');
  logger.info(`  Quelle: ${jsonDataDir}`);
  logger.info('═══════════════════════════════════════════════════════');

  const stats = {
    customers: 0, suppliers: 0, articles: 0, projects: 0,
    shootingDates: 0, locations: 0, team: 0,
    documents: 0, lineItems: 0,
    expenses: 0, mileage: 0, externalInvoices: 0,
    counters: 0, settings: 0, holidays: 0,
  };

  function readJson(filename) {
    const filePath = path.join(jsonDataDir, filename);
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
    catch (err) { logger.warn(`⚠️  ${filename}: ${err.message}`); return null; }
  }

  function generateId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  const migrate = db.transaction(() => {

    // ─── 1. Kunden ──────────────────────────────────────────────────
    const customers = readJson('customers.json') || [];
    const insertCustomer = db.prepare(`
      INSERT OR IGNORE INTO customers
        (id, customer_number, salutation, title, first_name, last_name,
         company, email, phone, street, house_number, zip_code, city,
         vat_id, folder_path, notes, created_at, updated_at)
      VALUES
        (@id, @customer_number, @salutation, @title, @first_name, @last_name,
         @company, @email, @phone, @street, @house_number, @zip_code, @city,
         @vat_id, @folder_path, @notes, @created_at, @updated_at)
    `);
    for (const c of customers) {
      insertCustomer.run({
        id: c.id, customer_number: c.customerNumber || '',
        salutation: c.salutation || '', title: c.title || '',
        first_name: c.firstName || '', last_name: c.lastName || '',
        company: c.company || '', email: c.email || '',
        phone: c.phone || '', street: c.street || '',
        house_number: c.houseNumber || '', zip_code: c.zipCode || '',
        city: c.city || '', vat_id: c.vatId || '',
        folder_path: c.folderPath || '', notes: c.notes || '',
        created_at: c.createdAt || new Date().toISOString(),
        updated_at: c.updatedAt || new Date().toISOString(),
      });
      stats.customers++;
    }

    // ─── 2. Lieferanten ─────────────────────────────────────────────
    const suppliers = readJson('suppliers.json') || [];
    const insertSupplier = db.prepare(`
      INSERT OR IGNORE INTO suppliers
        (id, supplier_number, company, contact_person, email, phone,
         street, zip_code, city, country, vat_id, tax_number,
         iban, bic, bank_name, website, category, notes, created_at, updated_at)
      VALUES
        (@id, @supplier_number, @company, @contact_person, @email, @phone,
         @street, @zip_code, @city, @country, @vat_id, @tax_number,
         @iban, @bic, @bank_name, @website, @category, @notes, @created_at, @updated_at)
    `);
    for (const s of suppliers) {
      insertSupplier.run({
        id: s.id, supplier_number: s.supplierNumber || '',
        company: s.company || '', contact_person: s.contactPerson || '',
        email: s.email || '', phone: s.phone || '',
        street: s.street || '', zip_code: s.zipCode || '',
        city: s.city || '', country: s.country || 'Deutschland',
        vat_id: s.vatId || '', tax_number: s.taxNumber || '',
        iban: s.iban || '', bic: s.bic || '',
        bank_name: s.bankName || '', website: s.website || '',
        category: s.category || '', notes: s.notes || '',
        created_at: s.createdAt || new Date().toISOString(),
        updated_at: s.updatedAt || new Date().toISOString(),
      });
      stats.suppliers++;
    }

    // ─── 3. Artikel ─────────────────────────────────────────────────
    const articles = readJson('articles.json') || [];
    const insertArticle = db.prepare(`
      INSERT OR IGNORE INTO articles
        (id, number, name, description, unit, price_net, tax_rate,
         category, active, auto_from_nr, created_at, updated_at)
      VALUES
        (@id, @number, @name, @description, @unit, @price_net, @tax_rate,
         @category, @active, @auto_from_nr, @created_at, @updated_at)
    `);
    for (const a of articles) {
      insertArticle.run({
        id: a.id, number: a.number || '',
        name: a.name || '', description: a.description || '',
        unit: a.unit || 'Stück', price_net: a.priceNet ?? 0,
        tax_rate: a.taxRate ?? 0, category: a.category || '',
        active: a.active !== false ? 1 : 0,
        auto_from_nr: a.autoFromNR ? 1 : 0,
        created_at: a.createdAt || new Date().toISOString(),
        updated_at: a.updatedAt || new Date().toISOString(),
      });
      stats.articles++;
    }

    // ─── 4. Projekte ────────────────────────────────────────────────
    const projects = readJson('projects.json') || [];
    const insertProject = db.prepare(`
      INSERT OR IGNORE INTO projects
        (id, customer_id, project_name, category, status,
         booking, booking_time, booking_duration, booking_label, booking_info,
         location, fotografie, videografie, glueckwunschkarten,
         getting_ready, getting_ready_er, getting_ready_sie, getting_ready_beide,
         budget_amount, budget_currency, notes, project_folder_path,
         description, delivery_date, inquiry_date,
         contract_data, contract_status, contract_addenda, signed_contracts,
         consultation_required, consultation_date, consultation_notes,
         consultation_client_accepted, skip_quote, anfrage_snapshot,
         customer_photo, created_at, updated_at)
      VALUES
        (@id, @customer_id, @project_name, @category, @status,
         @booking, @booking_time, @booking_duration, @booking_label, @booking_info,
         @location, @fotografie, @videografie, @glueckwunschkarten,
         @getting_ready, @getting_ready_er, @getting_ready_sie, @getting_ready_beide,
         @budget_amount, @budget_currency, @notes, @project_folder_path,
         @description, @delivery_date, @inquiry_date,
         @contract_data, @contract_status, @contract_addenda, @signed_contracts,
         @consultation_required, @consultation_date, @consultation_notes,
         @consultation_client_accepted, @skip_quote, @anfrage_snapshot,
         @customer_photo, @created_at, @updated_at)
    `);

    const insertShootingDate = db.prepare(`
      INSERT INTO project_shooting_dates (id, project_id, date, time, label, notes, sort_order)
      VALUES (@id, @project_id, @date, @time, @label, @notes, @sort_order)
    `);
    const insertLocation = db.prepare(`
      INSERT INTO project_locations (id, project_id, name, category, notes, sort_order)
      VALUES (@id, @project_id, @name, @category, @notes, @sort_order)
    `);
    const insertTeam = db.prepare(`
      INSERT INTO project_team (id, project_id, name, role, sort_order)
      VALUES (@id, @project_id, @name, @role, @sort_order)
    `);

    for (const p of projects) {
      const consult = p.consultation || {};
      insertProject.run({
        id: p.id, customer_id: p.customerId,
        project_name: p.projectName || p.name || '', category: p.category || '',
        status: p.status || 'Anfrage',
        booking: p.booking || null, booking_time: p.bookingTime || '00:00',
        booking_duration: p.bookingDuration || '', booking_label: p.bookingLabel || '',
        booking_info: p.bookingInfo || '',
        location: typeof p.location === 'string' ? p.location : '',
        fotografie: p.fotografie ? 1 : 0, videografie: p.videografie ? 1 : 0,
        glueckwunschkarten: p.glueckwunschkarten ? 1 : 0,
        getting_ready: p.gettingReady ? 1 : 0,
        getting_ready_er: p.gettingReadyEr ? 1 : 0,
        getting_ready_sie: p.gettingReadySie ? 1 : 0,
        getting_ready_beide: p.gettingReadyBeide ? 1 : 0,
        budget_amount: p.budget?.estimatedAmount ?? 0,
        budget_currency: p.budget?.currency || 'EUR',
        notes: p.notes || '', project_folder_path: p.projectFolderPath || '',
        description: p.description || '',
        delivery_date: p.deliveryDate || null, inquiry_date: p.inquiryDate || null,
        contract_data: JSON.stringify(p.contractData || {}),
        contract_status: p.contractStatus || 'Entwurf',
        contract_addenda: JSON.stringify(p.contractAddenda || []),
        signed_contracts: JSON.stringify(p.signedContracts || []),
        consultation_required: consult.required != null ? (consult.required ? 1 : 0) : null,
        consultation_date: consult.date || null,
        consultation_notes: consult.notes || '',
        consultation_client_accepted: consult.clientAccepted != null ? (consult.clientAccepted ? 1 : 0) : null,
        skip_quote: p.skipQuote ? 1 : 0,
        anfrage_snapshot: JSON.stringify(p.anfrageSnapshot || {}),
        customer_photo: p.customerPhoto ? JSON.stringify(p.customerPhoto) : null,
        created_at: p.createdAt || new Date().toISOString(),
        updated_at: p.updatedAt || new Date().toISOString(),
      });
      stats.projects++;

      if (Array.isArray(p.shootingDates)) {
        p.shootingDates.forEach((sd, i) => {
          insertShootingDate.run({ id: sd.id || generateId('sd'), project_id: p.id, date: sd.date || '', time: sd.time || '00:00', label: sd.label || '', notes: sd.notes || '', sort_order: i });
          stats.shootingDates++;
        });
      }
      if (Array.isArray(p.locations)) {
        p.locations.forEach((loc, i) => {
          insertLocation.run({ id: loc.id || generateId('loc'), project_id: p.id, name: loc.name || '', category: loc.category || '', notes: loc.notes || '', sort_order: i });
          stats.locations++;
        });
      }
      if (Array.isArray(p.team)) {
        p.team.forEach((t, i) => {
          const entry = typeof t === 'string' ? { name: t, role: '' } : t;
          insertTeam.run({ id: entry.id || generateId('tm'), project_id: p.id, name: entry.name || '', role: entry.role || '', sort_order: i });
          stats.team++;
        });
      }
    }

    // ─── 5. Dokumente ───────────────────────────────────────────────
    const documents = readJson('documents.json') || [];
    const insertDocument = db.prepare(`
      INSERT OR IGNORE INTO documents
        (id, project_id, customer_id, type, doc_subtype, name, document_number,
         version, parent_id, superseded_by, is_deposit, quote_id, correction_of,
         issue_date, service_date, due_date, delivery_date,
         billing_address, subtotal, tax_groups, total, discount,
         intro, footer, notes, payment_terms, payment_info,
         status, paid_at, payment_method,
         file_path, file_size, file_mime_type,
         uploaded_at, expires_at, created_at, updated_at)
      VALUES
        (@id, @project_id, @customer_id, @type, @doc_subtype, @name, @document_number,
         @version, @parent_id, @superseded_by, @is_deposit, @quote_id, @correction_of,
         @issue_date, @service_date, @due_date, @delivery_date,
         @billing_address, @subtotal, @tax_groups, @total, @discount,
         @intro, @footer, @notes, @payment_terms, @payment_info,
         @status, @paid_at, @payment_method,
         @file_path, @file_size, @file_mime_type,
         @uploaded_at, @expires_at, @created_at, @updated_at)
    `);
    const insertLineItem = db.prepare(`
      INSERT INTO document_line_items
        (document_id, article_id, description, detail, quantity, unit,
         price_net, tax_rate, discount, sort_order)
      VALUES
        (@document_id, @article_id, @description, @detail, @quantity, @unit,
         @price_net, @tax_rate, @discount, @sort_order)
    `);

    for (const d of documents) {
      insertDocument.run({
        id: d.id, project_id: d.projectId || null, customer_id: d.customerId,
        type: d.type, doc_subtype: d.docSubtype || null,
        name: d.name || '', document_number: d.documentNumber || null,
        version: d.version || 1, parent_id: d.parentId || null,
        superseded_by: d.supersededBy || null, is_deposit: d.isDeposit ? 1 : 0,
        quote_id: d.quoteId || null, correction_of: d.correctionOf || null,
        issue_date: d.issueDate || null, service_date: d.serviceDate || null,
        due_date: d.dueDate || null, delivery_date: d.deliveryDate || null,
        billing_address: JSON.stringify(d.billingAddress || {}),
        subtotal: d.subtotal || 0, tax_groups: JSON.stringify(d.taxGroups || []),
        total: d.total || 0, discount: d.discount || 0,
        intro: d.intro || '', footer: d.footer || '', notes: d.notes || '',
        payment_terms: d.paymentTerms || '', payment_info: d.paymentInfo || '',
        status: d.status || 'Entwurf', paid_at: d.paidAt || null,
        payment_method: d.paymentMethod || null,
        file_path: d.filePath || null, file_size: d.metadata?.size || 0,
        file_mime_type: d.metadata?.mimeType || '',
        uploaded_at: d.uploadedAt || new Date().toISOString(),
        expires_at: d.expiresAt || null,
        created_at: d.createdAt || new Date().toISOString(),
        updated_at: d.updatedAt || new Date().toISOString(),
      });
      stats.documents++;

      if (Array.isArray(d.lineItems)) {
        d.lineItems.forEach((li, i) => {
          insertLineItem.run({
            document_id: d.id, article_id: li.articleId || null,
            description: li.description || '', detail: li.detail || '',
            quantity: li.quantity || 0, unit: li.unit || 'Stück',
            price_net: li.priceNet || 0, tax_rate: li.taxRate || 0,
            discount: li.discount || 0, sort_order: i,
          });
          stats.lineItems++;
        });
      }
    }

    // ─── 6. FiBu ────────────────────────────────────────────────────
    const fibu = readJson('fibu.json') || { expenses: [], mileage: [], externalInvoices: [] };

    const insertExpense = db.prepare(`INSERT OR IGNORE INTO expenses (id,date,category,description,invoice_number,amount,tax_rate,vendor,notes,receipt_path,created_at) VALUES (@id,@date,@category,@description,@invoice_number,@amount,@tax_rate,@vendor,@notes,@receipt_path,@created_at)`);
    for (const e of (fibu.expenses || [])) {
      insertExpense.run({ id: e.id, date: e.date, category: e.category || 'Sonstiges', description: e.description || '', invoice_number: e.invoiceNumber || '', amount: e.amount || 0, tax_rate: e.taxRate || 0, vendor: e.vendor || '', notes: e.notes || '', receipt_path: e.receiptPath || null, created_at: e.createdAt || new Date().toISOString() });
      stats.expenses++;
    }

    const insertMileage = db.prepare(`INSERT OR IGNORE INTO mileage (id,date,customer_id,customer_name,project_id,invoice_number,destination,purpose,km,source,created_at) VALUES (@id,@date,@customer_id,@customer_name,@project_id,@invoice_number,@destination,@purpose,@km,@source,@created_at)`);
    for (const m of (fibu.mileage || [])) {
      insertMileage.run({ id: m.id, date: m.date, customer_id: m.customerId || null, customer_name: m.customerName || '', project_id: m.projectId || null, invoice_number: m.invoiceNumber || '', destination: m.destination || '', purpose: m.purpose || '', km: m.km || 0, source: m.source || 'manual', created_at: m.createdAt || new Date().toISOString() });
      stats.mileage++;
    }

    const insertExtInv = db.prepare(`INSERT OR IGNORE INTO external_invoices (id,date,vendor,invoice_number,category,description,amount_net,tax_rate,amount_gross,payment_status,paid_at,payment_method,notes,receipt_path,created_at) VALUES (@id,@date,@vendor,@invoice_number,@category,@description,@amount_net,@tax_rate,@amount_gross,@payment_status,@paid_at,@payment_method,@notes,@receipt_path,@created_at)`);
    for (const ei of (fibu.externalInvoices || [])) {
      insertExtInv.run({ id: ei.id, date: ei.date, vendor: ei.vendor || '', invoice_number: ei.invoiceNumber || '', category: ei.category || 'Sonstiges', description: ei.description || '', amount_net: ei.amountNet || 0, tax_rate: ei.taxRate || 0, amount_gross: ei.amountGross || 0, payment_status: ei.paymentStatus || 'Offen', paid_at: ei.paidAt || null, payment_method: ei.paymentMethod || '', notes: ei.notes || '', receipt_path: ei.receiptPath || null, created_at: ei.createdAt || new Date().toISOString() });
      stats.externalInvoices++;
    }

    // ─── 7. Settings ────────────────────────────────────────────────
    const settings = readJson('settings.json');
    if (settings) {
      const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
      const updatedAt = settings.updatedAt || new Date().toISOString();
      for (const [key, val] of Object.entries(settings)) {
        if (key === 'updatedAt') continue;
        insertSetting.run(key, JSON.stringify(val), updatedAt);
        stats.settings++;
      }
    }

    // ─── 8. Holiday Cache ───────────────────────────────────────────
    const holidayDir = path.join(jsonDataDir, 'holiday_cache');
    if (fs.existsSync(holidayDir)) {
      const insertHoliday = db.prepare('INSERT OR REPLACE INTO holiday_cache (id, data, fetched_at) VALUES (?, ?, ?)');
      for (const file of fs.readdirSync(holidayDir).filter(f => f.endsWith('.json'))) {
        insertHoliday.run(path.basename(file, '.json'), fs.readFileSync(path.join(holidayDir, file), 'utf-8'), new Date().toISOString());
        stats.holidays++;
      }
    }

    // ═════════════════════════════════════════════════════════════════
    // FIX v1.1: Nummernkreise aus tatsächlich vorhandenen Daten berechnen
    // ═════════════════════════════════════════════════════════════════
    // counters.json enthält oft nur quote/invoice.
    // Kunden-, Artikel- und Lieferanten-Zähler müssen aus den
    // migrierten Nummern abgeleitet werden.

    function extractMaxCounter(rows, numberField) {
      let max = 0;
      for (const row of rows) {
        const num = row[numberField] || '';
        const match = num.match(/(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > max) max = n;
        }
      }
      return max;
    }

    const upsertCounter = db.prepare('INSERT OR REPLACE INTO counters (type, value) VALUES (?, ?)');

    // Kunden-Counter
    const allCustomers = db.prepare('SELECT customer_number FROM customers').all();
    const maxCustomer  = extractMaxCounter(allCustomers, 'customer_number');
    upsertCounter.run('customer', maxCustomer);
    logger.info(`  📊 Counter customer: ${maxCustomer} (aus ${allCustomers.length} Kunden)`);

    // Artikel-Counter
    const allArticles = db.prepare('SELECT number FROM articles').all();
    const maxArticle  = extractMaxCounter(allArticles, 'number');
    upsertCounter.run('article', maxArticle);
    logger.info(`  📊 Counter article: ${maxArticle} (aus ${allArticles.length} Artikeln)`);

    // Lieferanten-Counter
    const allSuppliers = db.prepare('SELECT supplier_number FROM suppliers').all();
    const maxSupplier  = extractMaxCounter(allSuppliers, 'supplier_number');
    upsertCounter.run('supplier', maxSupplier);
    logger.info(`  📊 Counter supplier: ${maxSupplier} (aus ${allSuppliers.length} Lieferanten)`);

    // Angebots-Counter
    const allQuotes = db.prepare("SELECT document_number FROM documents WHERE type = 'quote' AND doc_subtype IS NULL AND parent_id IS NULL").all();
    const maxQuote  = extractMaxCounter(allQuotes, 'document_number');
    // Nur überschreiben wenn höher als counters.json-Wert
    const countersJson = readJson('counters.json') || {};
    const quoteCounter = Math.max(maxQuote, countersJson.quote || 0);
    upsertCounter.run('quote', quoteCounter);
    logger.info(`  📊 Counter quote: ${quoteCounter}`);

    // Rechnungs-Counter
    const allInvoices = db.prepare("SELECT document_number FROM documents WHERE type = 'invoice' AND doc_subtype IS NULL AND parent_id IS NULL").all();
    const maxInvoice  = extractMaxCounter(allInvoices, 'document_number');
    const invoiceCounter = Math.max(maxInvoice, countersJson.invoice || 0);
    upsertCounter.run('invoice', invoiceCounter);
    logger.info(`  📊 Counter invoice: ${invoiceCounter}`);

    stats.counters = 5;
  });

  // ── Ausführen ─────────────────────────────────────────────────────
  try {
    migrate();
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  ✅ Migration erfolgreich!');
    logger.info(`  Kunden: ${stats.customers}  |  Artikel: ${stats.articles}  |  Lieferanten: ${stats.suppliers}`);
    logger.info(`  Projekte: ${stats.projects}  |  Dokumente: ${stats.documents} (${stats.lineItems} Positionen)`);
    logger.info(`  FiBu: ${stats.expenses} Ausgaben, ${stats.mileage} Fahrten, ${stats.externalInvoices} Eingangsr.`);
    logger.info(`  Settings: ${stats.settings} Keys  |  Holidays: ${stats.holidays}`);
    logger.info('═══════════════════════════════════════════════════════');
    return { success: true, stats };
  } catch (err) {
    logger.error('❌ Migration fehlgeschlagen (Rollback):', err.message);
    return { success: false, stats, error: err.message };
  }
}

module.exports = { migrateFromJson };
