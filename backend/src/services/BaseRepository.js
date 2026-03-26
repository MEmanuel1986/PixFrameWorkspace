'use strict';
/**
 * BaseRepository – Gemeinsame Logik für alle SQLite-Repositories
 *
 * FIX v1.1:
 *  - Spalten-Filter: Nur bekannte DB-Spalten landen im SQL (verhindert "no such column")
 *  - undefined → null Konvertierung (better-sqlite3 wirft TypeError bei undefined)
 */

const crypto = require('crypto');

function generateId(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnake(str) {
  return str.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}

const BOOLEAN_FIELDS = new Set([
  'active', 'auto_from_nr', 'fotografie', 'videografie',
  'glueckwunschkarten', 'getting_ready', 'getting_ready_er',
  'getting_ready_sie', 'getting_ready_beide', 'skip_quote',
  'is_deposit', 'consultation_required', 'consultation_client_accepted',
]);

function rowToCamel(row, jsonFields = []) {
  if (!row) return null;
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamel(key);
    if (jsonFields.includes(key) && typeof value === 'string') {
      try { result[camelKey] = JSON.parse(value); }
      catch { result[camelKey] = value; }
    } else if (typeof value === 'number' && BOOLEAN_FIELDS.has(key)) {
      result[camelKey] = value === 1;
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

function dataToSnake(data, jsonFields = []) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = toSnake(key);

    // ── FIX: undefined → null (better-sqlite3 wirft TypeError bei undefined) ──
    if (value === undefined) {
      result[snakeKey] = null;
      continue;
    }

    if (jsonFields.includes(snakeKey) && typeof value === 'object' && value !== null) {
      result[snakeKey] = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      result[snakeKey] = value ? 1 : 0;
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

class BaseRepository {
  constructor(tableName, idPrefix, jsonFields = []) {
    this._tableName  = tableName;
    this._idPrefix   = idPrefix;
    this._jsonFields = jsonFields;
    this._stmtCache  = new Map();
    this._columns    = null;  // Lazy-loaded column set
  }

  get db() {
    return require('../database/databaseService').connection;
  }

  _stmt(key, sql) {
    if (!this._stmtCache.has(key)) {
      this._stmtCache.set(key, this.db.prepare(sql));
    }
    return this._stmtCache.get(key);
  }

  clearCache() {
    this._stmtCache.clear();
    this._columns = null;
  }

  // ── FIX: Spalten-Whitelist aus DB laden ───────────────────────────
  // Verhindert "table X has no column named Y" wenn Frontend
  // unbekannte Felder schickt (z.B. customerPhoto vor Schema-Update)

  _getValidColumns() {
    if (!this._columns) {
      const rows = this.db.prepare(`PRAGMA table_info(${this._tableName})`).all();
      this._columns = new Set(rows.map(r => r.name));
    }
    return this._columns;
  }

  /**
   * Filtert ein snake_case-Objekt auf bekannte Spalten.
   * Unbekannte Keys werden still ignoriert.
   */
  _filterToValidColumns(snakeData) {
    const valid  = this._getValidColumns();
    const result = {};
    for (const [key, value] of Object.entries(snakeData)) {
      if (valid.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  // ── Basis-CRUD ────────────────────────────────────────────────────

  findAll() {
    const rows = this._stmt('findAll', `SELECT * FROM ${this._tableName}`).all();
    return rows.map(r => rowToCamel(r, this._jsonFields));
  }

  findById(id) {
    const row = this._stmt('findById', `SELECT * FROM ${this._tableName} WHERE id = ?`).get(id);
    return rowToCamel(row, this._jsonFields);
  }

  insert(data) {
    const id  = data.id || generateId(this._idPrefix);
    const now = new Date().toISOString();

    const snakeData = dataToSnake({
      ...data,
      id,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    }, this._jsonFields);

    // ── FIX: Nur bekannte Spalten einfügen ──
    const filtered     = this._filterToValidColumns(snakeData);
    const keys         = Object.keys(filtered);
    const placeholders = keys.map(k => '@' + k).join(', ');
    const sql          = `INSERT INTO ${this._tableName} (${keys.join(', ')}) VALUES (${placeholders})`;

    this.db.prepare(sql).run(filtered);
    return this.findById(id);
  }

  update(id, data) {
    const now       = new Date().toISOString();
    const snakeData = dataToSnake({ ...data, updatedAt: now }, this._jsonFields);

    delete snakeData.id;
    delete snakeData.created_at;

    // ── FIX: Nur bekannte Spalten updaten ──
    const filtered = this._filterToValidColumns(snakeData);

    if (Object.keys(filtered).length === 0) return this.findById(id);

    const sets = Object.keys(filtered).map(k => `${k} = @${k}`).join(', ');
    const sql  = `UPDATE ${this._tableName} SET ${sets} WHERE id = @_id`;

    this.db.prepare(sql).run({ ...filtered, _id: id });
    return this.findById(id);
  }

  delete(id) {
    const result = this._stmt('delete', `DELETE FROM ${this._tableName} WHERE id = ?`).run(id);
    return { success: result.changes > 0, id };
  }

  search(query, fields) {
    const where = fields.map(f => `${f} LIKE @q`).join(' OR ');
    const sql   = `SELECT * FROM ${this._tableName} WHERE ${where}`;
    const rows  = this.db.prepare(sql).all({ q: `%${query}%` });
    return rows.map(r => rowToCamel(r, this._jsonFields));
  }

  findByField(field, value) {
    const col  = toSnake(field);
    const sql  = `SELECT * FROM ${this._tableName} WHERE ${col} = ?`;
    const rows = this.db.prepare(sql).all(value);
    return rows.map(r => rowToCamel(r, this._jsonFields));
  }
}

module.exports = {
  BaseRepository,
  generateId,
  toCamel,
  toSnake,
  rowToCamel,
  dataToSnake,
};
