'use strict';
/**
 * resetService.js – Datenbank- und Workspace-Reset (geschützt durch Service-Passwort)
 *
 * Das Service-Passwort ist das heutige Datum rückwärts:
 *   05.04. → "4050"   |   12.11. → "1112"   |   01.01. → "0101"
 *
 * BEHALTEN: settings, articles, _meta (Vertragstexte, AGB, DSGVO, Paragrafen)
 * GELÖSCHT: Kunden (bis auf Demo), Projekte, Dokumente, FiBu, Counters (Reset)
 */

const fs   = require('fs');
const path = require('path');
const paths = require('../config/paths');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ResetService {
  get db() {
    return require('../database/databaseService').connection;
  }

  /**
   * Generiert das heutige Service-Passwort.
   * 05.04. → Monat "04" reversed = "40", Tag "05" reversed = "50" → "4050"
   */
  _generateTodayPassword() {
    const now   = new Date();
    const day   = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const reversedMonth = month.split('').reverse().join('');
    const reversedDay   = day.split('').reverse().join('');
    return reversedMonth + reversedDay;
  }

  /**
   * Prüft ob das eingegebene Passwort korrekt ist.
   */
  validatePassword(inputPassword) {
    const expected = this._generateTodayPassword();
    return String(inputPassword).trim() === expected;
  }

  /**
   * Führt den vollständigen Reset durch.
   * @returns {{ success: boolean, stats?: object, error?: string }}
   */
  execute(password) {
    if (!this.validatePassword(password)) {
      return { success: false, error: 'Ungültiges Service-Passwort.' };
    }

    const stats = { before: {}, after: {} };

    try {
      // ── Vorher-Statistik ──
      stats.before = this._countAll();

      // ── Datenbank-Reset in einer Transaktion ──
      this.db.transaction(() => {
        // 1. Dokument-Positionen löschen
        this.db.exec('DELETE FROM document_line_items');

        // 2. Dokumente löschen
        this.db.exec('DELETE FROM documents');

        // 3. Projekt-Kinder löschen (CASCADE sollte greifen, sicherheitshalber explizit)
        this.db.exec('DELETE FROM project_shooting_dates');
        this.db.exec('DELETE FROM project_locations');
        this.db.exec('DELETE FROM project_team');

        // 4. Projekte löschen
        this.db.exec('DELETE FROM projects');

        // 5. Alle Kunden löschen
        this.db.exec('DELETE FROM customers');

        // 6. FiBu leeren
        this.db.exec('DELETE FROM expenses');
        this.db.exec('DELETE FROM mileage');
        this.db.exec('DELETE FROM external_invoices');

        // 7. Holiday-Cache leeren
        this.db.exec('DELETE FROM holiday_cache');

        // 8. Counters zurücksetzen
        this.db.exec('UPDATE counters SET value = 0');

        // 9. Demo-Kunde anlegen
        this._insertDemoCustomer();

        // 10. Customer-Counter auf 1 setzen (1 Kunde existiert)
        this.db.prepare("UPDATE counters SET value = 1 WHERE type = 'customer'").run();
      })();

      // ── Workspace-Ordner leeren ──
      this._cleanWorkspaceFolders();

      // ── Nachher-Statistik ──
      stats.after = this._countAll();

      logger.info('🔄 Datenbank-Reset erfolgreich durchgeführt.');
      return { success: true, stats };

    } catch (err) {
      logger.error('❌ Reset fehlgeschlagen:', err.message);
      return { success: false, error: `Reset fehlgeschlagen: ${err.message}` };
    }
  }

  /**
   * Demo-Kunde anlegen (K-00001, Marie Mustermann).
   */
  _insertDemoCustomer() {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO customers
        (id, customer_number, salutation, title, first_name, last_name,
         company, email, phone, street, house_number, zip_code, city,
         vat_id, folder_path, notes, created_at, updated_at)
      VALUES
        (@id, @customer_number, @salutation, @title, @first_name, @last_name,
         @company, @email, @phone, @street, @house_number, @zip_code, @city,
         @vat_id, @folder_path, @notes, @created_at, @updated_at)
    `).run({
      id:              uuidv4(),
      customer_number: 'K-00001',
      salutation:      'Frau',
      title:           '',
      first_name:      'Marie',
      last_name:       'Mustermann',
      company:         '',
      email:           'marie.mustermann@beispiel.de',
      phone:           '+49 170 1234567',
      street:          'Musterstraße',
      house_number:    '42',
      zip_code:        '18055',
      city:            'Rostock',
      vat_id:          '',
      folder_path:     '',
      notes:           'Demo-Kunde (automatisch erstellt beim System-Reset)',
      created_at:      now,
      updated_at:      now,
    });
  }

  /**
   * Workspace-Ordner leeren: auftraege/, buchhaltung/belege/
   */
  _cleanWorkspaceFolders() {
    const foldersToClean = [
      paths.AUFTRAEGE_DIR,
      paths.BUCHHALTUNG_BELEGE_DIR,
    ];

    for (const dir of foldersToClean) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
      logger.info(`🧹 Ordner geleert: ${dir} (${entries.length} Einträge)`);
    }
  }

  /**
   * Zählt alle relevanten Tabellen für Vorher/Nachher-Statistik.
   */
  _countAll() {
    const tables = [
      'customers', 'projects', 'documents', 'document_line_items',
      'project_shooting_dates', 'project_locations', 'project_team',
      'expenses', 'mileage', 'external_invoices',
    ];
    const counts = {};
    for (const t of tables) {
      try {
        const row = this.db.prepare(`SELECT COUNT(*) as cnt FROM ${t}`).get();
        counts[t] = row.cnt;
      } catch { counts[t] = 0; }
    }
    return counts;
  }
}

module.exports = new ResetService();
