'use strict';
/**
 * settingsService.js – SQLite Key-Value Store, v1.1.0
 *
 * Preis-Synchronisierung nutzt jetzt ARTICLE_RATE_MAP aus articleSeeds.js
 * (Single Source of Truth für Artikel-IDs und Settings-Felder).
 */

const path  = require('path');
const fs    = require('fs');
const paths = require('../config/paths');
const { ARTICLE_RATE_MAP } = require('../database/articleSeeds');

const LOGO_DIR = paths.LOGO_DIR;

class SettingsService {
  get db() {
    return require('../database/databaseService').connection;
  }

  get(key, defaultValue = null) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row) return defaultValue;
    try { return JSON.parse(row.value); }
    catch { return row.value; }
  }

  set(key, value) {
    this.db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    ).run(key, JSON.stringify(value), new Date().toISOString());
  }

  getAll() {
    const rows = this.db.prepare('SELECT key, value, updated_at FROM settings').all();
    const result = {};
    let latestUpdate = null;
    for (const row of rows) {
      try { result[row.key] = JSON.parse(row.value); }
      catch { result[row.key] = row.value; }
      if (!latestUpdate || row.updated_at > latestUpdate) latestUpdate = row.updated_at;
    }
    result.updatedAt = latestUpdate;
    return result;
  }

  updateAll(patch) {
    const now  = new Date().toISOString();
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    );

    this.db.transaction(() => {
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'updatedAt') continue;
        stmt.run(key, JSON.stringify(value), now);
      }
    })();

    // Artikelpreise synchronisieren wenn bookingTerms geändert
    if (patch.bookingTerms) {
      const current  = this.get('bookingTerms', {});
      const mergedBt = { ...current, ...patch.bookingTerms };
      this._syncArticlePrices(mergedBt);
    }

    return this.getAll();
  }

  // ── Logo ──────────────────────────────────────────────────────────

  saveLogo(file) {
    return new Promise((resolve, reject) => {
      const ext = path.extname(file.name).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.svg', '.webp'].includes(ext)) {
        return reject(new Error('Nur JPG, PNG, SVG oder WebP erlaubt'));
      }
      if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });
      fs.readdirSync(LOGO_DIR).forEach(f => fs.unlinkSync(path.join(LOGO_DIR, f)));
      const filename = `logo${ext}`;
      const dest     = path.join(LOGO_DIR, filename);
      file.mv(dest, (err) => {
        if (err) return reject(err);
        const logoUrl = `/uploads/logo/${filename}`;
        const company = this.get('company', {});
        company.logoUrl = logoUrl;
        this.set('company', company);
        resolve(logoUrl);
      });
    });
  }

  deleteLogo() {
    if (fs.existsSync(LOGO_DIR)) {
      fs.readdirSync(LOGO_DIR).forEach(f => fs.unlinkSync(path.join(LOGO_DIR, f)));
    }
    const company = this.get('company', {});
    delete company.logoUrl;
    this.set('company', company);
  }

  // ── Artikelpreise synchronisieren ─────────────────────────────────

  _syncArticlePrices(bt) {
    if (!bt) return;

    try {
      const now  = new Date().toISOString();
      const stmt = this.db.prepare(
        'UPDATE articles SET price_net = ?, updated_at = ? WHERE id = ?'
      );

      this.db.transaction(() => {
        for (const [artId, field] of Object.entries(ARTICLE_RATE_MAP)) {
          if (bt[field] != null) {
            stmt.run(Number(bt[field]), now, artId);
          }
        }
        // Sonderfall: km-Gutschrift = negativer Wert der km-Pauschale
        if (bt.defaultKmRate != null) {
          stmt.run(-Math.abs(Number(bt.defaultKmRate)), now, 'art-km-minus');
        }
      })();
    } catch (e) {
      console.error('[settingsService] syncArticlePrices error:', e.message);
    }
  }
}

const instance = new SettingsService();

module.exports = {
  getSettings:    () => instance.getAll(),
  updateSettings: (patch) => instance.updateAll(patch),
  saveLogo:       (file) => instance.saveLogo(file),
  deleteLogo:     () => instance.deleteLogo(),
  getSetting:     (key, def) => instance.get(key, def),
  setSetting:     (key, val) => instance.set(key, val),
};
