'use strict';
/**
 * ArticleService – SQLite-basiert, v1.1.0
 *
 * Standardartikel (art-*) sind löschgeschützt.
 * Preise werden über settingsService.bookingTerms synchronisiert.
 */

const { BaseRepository }     = require('./BaseRepository');
const { getSettings }         = require('./settingsService');
const counterService          = require('./counterService');
const { PROTECTED_ARTICLE_IDS } = require('../database/articleSeeds');
const logger                  = require('../utils/logger');

class ArticleService extends BaseRepository {
  constructor() {
    super('articles', 'art', []);
  }

  _generateArticleNumber() {
    const settings = getSettings();
    const schema   = settings.numberSchemas?.article || { format: 'ART-{z,5}' };
    const counter  = counterService.next('article');

    if (schema.format) {
      const now  = new Date();
      const yyyy = String(now.getFullYear());
      const mm   = String(now.getMonth() + 1).padStart(2, '0');
      return schema.format
        .replace(/\{jjjj\}/gi, yyyy).replace(/\{jj\}/gi, yyyy.slice(2))
        .replace(/\{mm\}/gi, mm)
        .replace(/\{z,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
        .replace(/\{zj,(\d+)\}/gi, (_, d) => String(counter).padStart(Number(d), '0'))
        .replace(/\{z\}/gi, String(counter));
    }
    const padded = String(counter).padStart(schema.digits || 5, '0');
    return `${schema.prefix || 'ART'}${schema.separator ?? '-'}${padded}`;
  }

  // ── Öffentliche API ───────────────────────────────────────────────

  getAllArticles(filterFn = null) {
    const all = this.findAll();
    return filterFn ? all.filter(filterFn) : all;
  }

  getArticleById(id) {
    const a = this.findById(id);
    if (!a) throw new Error(`Artikel mit ID ${id} nicht gefunden`);
    return a;
  }

  createArticle(data) {
    const errors = [];
    if (!data.name || !data.name.trim())   errors.push('Bezeichnung ist erforderlich');
    if (data.priceNet == null || isNaN(Number(data.priceNet))) errors.push('Nettopreis ist erforderlich');
    if (!data.unit || !data.unit.trim())   errors.push('Einheit ist erforderlich');
    if (errors.length) throw new Error(errors.join(', '));

    if (!data.number || !data.number.trim()) {
      data.number = this._generateArticleNumber();
    }

    const created = this.insert(data);
    logger.info(`✅ Artikel erstellt: ${created.id} — ${created.number} ${created.name}`);
    return created;
  }

  updateArticle(id, data) {
    this.getArticleById(id);
    return this.update(id, data);
  }

  deleteArticle(id) {
    // ── Löschschutz für Standardartikel ──
    if (PROTECTED_ARTICLE_IDS.has(id)) {
      throw new Error('Standardartikel können nicht gelöscht werden. Du kannst sie in den Einstellungen anpassen.');
    }

    this.getArticleById(id);
    const result = this.delete(id);
    logger.info(`✅ Artikel gelöscht: ${id}`);
    return result;
  }

  searchArticles(query) {
    return this.search(query, ['name', 'number', 'description', 'category']);
  }

  /**
   * Gibt zurück ob ein Artikel ein geschützter Standardartikel ist.
   * Kann vom Frontend genutzt werden um den Löschen-Button auszublenden.
   */
  isProtected(id) {
    return PROTECTED_ARTICLE_IDS.has(id);
  }
}

module.exports = new ArticleService();
