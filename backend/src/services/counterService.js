'use strict';
/**
 * CounterService – Atomare Nummernkreise (GoBD-konform)
 *
 * Ersetzt counters.json. Nutzt SQLite-Transaktionen statt File-Locking.
 * Ein einzelnes UPDATE + SELECT in einer Transaktion = garantiert kein
 * doppelter Zählerstand, auch bei parallelen Requests.
 */

class CounterService {
  get db() {
    return require('../database/databaseService').connection;
  }

  /**
   * Inkrementiert den Zähler für einen Typ atomar und gibt den neuen Wert zurück.
   * @param {string} type – 'invoice', 'quote', 'customer', 'article', 'supplier'
   * @returns {number}
   */
  next(type) {
    // Alles in einer Transaktion = ACID
    const result = this.db.transaction(() => {
      // Sicherstellen dass der Counter existiert
      this.db.prepare(
        'INSERT OR IGNORE INTO counters (type, value) VALUES (?, 0)'
      ).run(type);

      // Atomar inkrementieren
      this.db.prepare(
        'UPDATE counters SET value = value + 1 WHERE type = ?'
      ).run(type);

      // Neuen Wert lesen
      const row = this.db.prepare(
        'SELECT value FROM counters WHERE type = ?'
      ).get(type);

      return row.value;
    })();

    return result;
  }

  /**
   * Aktuellen Zählerstand lesen (ohne Inkrementierung).
   */
  current(type) {
    const row = this.db.prepare('SELECT value FROM counters WHERE type = ?').get(type);
    return row ? row.value : 0;
  }

  /**
   * Zähler auf einen bestimmten Wert setzen (für Migration / Reset).
   */
  set(type, value) {
    this.db.prepare(
      'INSERT OR REPLACE INTO counters (type, value) VALUES (?, ?)'
    ).run(type, value);
  }

  /**
   * Alle Zähler als Objekt { type: value, ... }
   */
  getAll() {
    const rows = this.db.prepare('SELECT type, value FROM counters').all();
    const result = {};
    for (const row of rows) {
      result[row.type] = row.value;
    }
    return result;
  }
}

module.exports = new CounterService();
