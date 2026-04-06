'use strict';
/**
 * DatabaseService – Zentraler SQLite-Zugang für PixFrame Workspace v1.1.0
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const logger   = require('../utils/logger');

const CURRENT_SCHEMA_VERSION = 2;

class DatabaseService {
  constructor() {
    this._db = null;
    this._dbPath = null;
  }

  initialize(workspacePath) {
    if (this._db) {
      logger.warn('⚠️  DB bereits initialisiert – verwende bestehende Verbindung.');
      return this._db;
    }

    const dataDir = path.join(workspacePath, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this._dbPath = path.join(dataDir, 'pixframe.sqlite');
    const isNew = !fs.existsSync(this._dbPath);

    this._db = new Database(this._dbPath);
    logger.info(`🗄️  SQLite geöffnet: ${this._dbPath} (${isNew ? 'NEU' : 'vorhanden'})`);

    this._setPragmas();

    if (isNew) {
      this._createSchema();
      this._seedDefaults();
      this._seedArticles();
    } else {
      this._migrate();
      this._ensureArticles();
    }

    logger.info('✅ Datenbank bereit.');
    return this._db;
  }

  get connection() {
    if (!this._db) throw new Error('DB nicht initialisiert. Zuerst initialize() aufrufen.');
    return this._db;
  }
  get db() { return this.connection; }
  get filePath() { return this._dbPath; }

  close() {
    if (!this._db) return;
    try {
      this._db.pragma('wal_checkpoint(TRUNCATE)');
      this._db.close();
      logger.info('🔒 Datenbank geschlossen.');
    } catch (err) {
      logger.error('❌ Fehler beim DB-Schließen:', err.message);
    } finally {
      this._db = null;
      this._dbPath = null;
    }
  }

  transaction(fn) { return this._db.transaction(fn)(); }

  // ── PRIVATE ───────────────────────────────────────────────────────

  _setPragmas() {
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('foreign_keys = ON');
    this._db.pragma('busy_timeout = 5000');
    this._db.pragma('synchronous = NORMAL');
    this._db.pragma('cache_size = -64000');
    this._db.pragma('temp_store = MEMORY');
  }

  _createSchema() {
    logger.info(`🏗️  Erstelle Schema v${CURRENT_SCHEMA_VERSION} ...`);
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    this._db.transaction(() => { this._db.exec(schemaSQL); })();
    logger.info('✅ Schema erstellt.');
  }

  _seedDefaults() {
    this._db.transaction(() => {
      const ins = this._db.prepare('INSERT OR IGNORE INTO counters (type, value) VALUES (?, ?)');
      for (const type of ['invoice', 'quote', 'customer', 'article', 'supplier', 'project']) {
        ins.run(type, 0);
      }
    })();
  }

  // ── Standardartikel automatisch anlegen ───────────────────────────

  _seedArticles() {
    const { STANDARD_ARTICLES } = require('./articleSeeds');
    const now = new Date().toISOString();

    logger.info(`🌱 Lege ${STANDARD_ARTICLES.length} Standardartikel an ...`);

    const ins = this._db.prepare(`
      INSERT OR IGNORE INTO articles
        (id, number, name, description, unit, price_net, tax_rate,
         category, active, auto_from_nr, created_at, updated_at)
      VALUES
        (@id, @number, @name, @description, @unit, @price_net, @tax_rate,
         @category, 1, @auto_from_nr, @created_at, @updated_at)
    `);

    this._db.transaction(() => {
      for (const a of STANDARD_ARTICLES) {
        ins.run({
          id:           a.id,
          number:       a.number,
          name:         a.name,
          description:  a.description,
          unit:         a.unit,
          price_net:    a.priceNet,
          tax_rate:     a.taxRate,
          category:     a.category,
          auto_from_nr: a.autoFromNR ? 1 : 0,
          created_at:   now,
          updated_at:   now,
        });
      }

      // Artikel-Counter auf höchste ART-Nummer setzen
      this._db.prepare(
        "INSERT OR REPLACE INTO counters (type, value) VALUES ('article', ?)"
      ).run(STANDARD_ARTICLES.length);
    })();

    logger.info(`✅ ${STANDARD_ARTICLES.length} Standardartikel angelegt, Counter = ${STANDARD_ARTICLES.length}`);
  }

  /**
   * Bei bestehendes DB: Fehlende Standardartikel nachträglich einfügen.
   * (Falls User z.B. ein altes Backup ohne alle 17 Artikel restored hat.)
   */
  _ensureArticles() {
    const { STANDARD_ARTICLES } = require('./articleSeeds');

    const existing = this._db.prepare('SELECT id FROM articles WHERE id LIKE ?').all('art-%');
    const existingIds = new Set(existing.map(r => r.id));

    const missing = STANDARD_ARTICLES.filter(a => !existingIds.has(a.id));
    if (missing.length === 0) return;

    const now = new Date().toISOString();
    const ins = this._db.prepare(`
      INSERT OR IGNORE INTO articles
        (id, number, name, description, unit, price_net, tax_rate,
         category, active, auto_from_nr, created_at, updated_at)
      VALUES
        (@id, @number, @name, @description, @unit, @price_net, @tax_rate,
         @category, 1, @auto_from_nr, @created_at, @updated_at)
    `);

    this._db.transaction(() => {
      for (const a of missing) {
        ins.run({
          id: a.id, number: a.number, name: a.name,
          description: a.description, unit: a.unit,
          price_net: a.priceNet, tax_rate: a.taxRate,
          category: a.category, auto_from_nr: a.autoFromNR ? 1 : 0,
          created_at: now, updated_at: now,
        });
      }
    })();

    logger.info(`🌱 ${missing.length} fehlende Standardartikel nachgetragen.`);
  }

  // ── Migrationen ───────────────────────────────────────────────────

  _migrate() {
    const v = this._getSchemaVersion();
    if (v >= CURRENT_SCHEMA_VERSION) {
      logger.info(`📊 Schema v${v} ist aktuell.`);
      return;
    }
    logger.info(`📊 Migration: v${v} → v${CURRENT_SCHEMA_VERSION}`);
    const migrations = {
      1: () => {
        // v1 → v2: Projektnummer-Spalte + Counter
        const cols = this._db.prepare("PRAGMA table_info('projects')").all().map(c => c.name);
        if (!cols.includes('project_number')) {
          this._db.exec('ALTER TABLE projects ADD COLUMN project_number TEXT');
          this._db.exec('CREATE INDEX IF NOT EXISTS idx_projects_number ON projects(project_number)');
          logger.info('  ➕ projects.project_number hinzugefügt');
        }
        this._db.prepare("INSERT OR IGNORE INTO counters (type, value) VALUES ('project', 0)").run();
      },
    };
    this._db.transaction(() => {
      for (let i = v; i < CURRENT_SCHEMA_VERSION; i++) {
        if (migrations[i]) { migrations[i](); }
        this._setSchemaVersion(i + 1);
      }
    })();
    logger.info(`✅ Migration → v${CURRENT_SCHEMA_VERSION}`);
  }

  _getSchemaVersion() {
    try {
      const row = this._db.prepare("SELECT value FROM _meta WHERE key = 'schema_version'").get();
      return row ? parseInt(row.value, 10) : 0;
    } catch { return 0; }
  }

  _setSchemaVersion(v) {
    this._db.prepare("INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)").run(String(v));
  }
}

module.exports = new DatabaseService();
