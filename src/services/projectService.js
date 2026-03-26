'use strict';
/**
 * ProjectService – SQLite-basiert
 *
 * FIX v1.1:
 *  - customerPhoto wird als JSON-Blob gespeichert/gelesen
 *  - _flattenForDb bereinigt alle verschachtelten Objekte sauber
 */

const { BaseRepository, generateId, rowToCamel } = require('./BaseRepository');
const logger = require('../utils/logger');

const PROJECT_JSON_FIELDS = [
  'contract_data', 'contract_addenda', 'signed_contracts',
  'anfrage_snapshot', 'customer_photo'
];

class ProjectService extends BaseRepository {
  constructor() {
    super('projects', 'projects', PROJECT_JSON_FIELDS);
  }

  _enrichProject(project) {
    if (!project) return null;

    const sdRows = this.db.prepare(
      'SELECT * FROM project_shooting_dates WHERE project_id = ? ORDER BY sort_order'
    ).all(project.id);
    project.shootingDates = sdRows.map(r => rowToCamel(r));

    const locRows = this.db.prepare(
      'SELECT * FROM project_locations WHERE project_id = ? ORDER BY sort_order'
    ).all(project.id);
    project.locations = locRows.map(r => rowToCamel(r));

    const teamRows = this.db.prepare(
      'SELECT * FROM project_team WHERE project_id = ? ORDER BY sort_order'
    ).all(project.id);
    project.team = teamRows.map(r => rowToCamel(r));

    // Budget-Objekt rekonstruieren
    project.budget = {
      estimatedAmount: project.budgetAmount ?? 0,
      currency: project.budgetCurrency || 'EUR',
    };
    delete project.budgetAmount;
    delete project.budgetCurrency;

    // Consultation-Objekt rekonstruieren
    project.consultation = {
      required:       project.consultationRequired,
      date:           project.consultationDate,
      notes:          project.consultationNotes || '',
      clientAccepted: project.consultationClientAccepted,
    };
    delete project.consultationRequired;
    delete project.consultationDate;
    delete project.consultationNotes;
    delete project.consultationClientAccepted;

    return project;
  }

  _syncChildren(projectId, data) {
    if (Array.isArray(data.shootingDates)) {
      this.db.prepare('DELETE FROM project_shooting_dates WHERE project_id = ?').run(projectId);
      const ins = this.db.prepare(`INSERT INTO project_shooting_dates (id, project_id, date, time, label, notes, sort_order) VALUES (@id, @project_id, @date, @time, @label, @notes, @sort_order)`);
      data.shootingDates.forEach((sd, i) => {
        ins.run({ id: sd.id || generateId('sd'), project_id: projectId, date: sd.date || '', time: sd.time || '00:00', label: sd.label || '', notes: sd.notes || '', sort_order: i });
      });
    }
    if (Array.isArray(data.locations)) {
      this.db.prepare('DELETE FROM project_locations WHERE project_id = ?').run(projectId);
      const ins = this.db.prepare(`INSERT INTO project_locations (id, project_id, name, category, notes, sort_order) VALUES (@id, @project_id, @name, @category, @notes, @sort_order)`);
      data.locations.forEach((loc, i) => {
        ins.run({ id: loc.id || generateId('loc'), project_id: projectId, name: loc.name || '', category: loc.category || '', notes: loc.notes || '', sort_order: i });
      });
    }
    if (Array.isArray(data.team)) {
      this.db.prepare('DELETE FROM project_team WHERE project_id = ?').run(projectId);
      const ins = this.db.prepare(`INSERT INTO project_team (id, project_id, name, role, sort_order) VALUES (@id, @project_id, @name, @role, @sort_order)`);
      data.team.forEach((t, i) => {
        const entry = typeof t === 'string' ? { name: t, role: '' } : t;
        ins.run({ id: entry.id || generateId('tm'), project_id: projectId, name: entry.name || '', role: entry.role || '', sort_order: i });
      });
    }
  }

  _flattenForDb(data) {
    const flat = { ...data };

    // Budget → flache Spalten
    if (data.budget) {
      flat.budgetAmount   = data.budget.estimatedAmount ?? 0;
      flat.budgetCurrency = data.budget.currency || 'EUR';
      delete flat.budget;
    }

    // Consultation → flache Spalten
    if (data.consultation !== undefined) {
      const c = data.consultation || {};
      flat.consultationRequired       = c.required ?? null;
      flat.consultationDate           = c.date || null;
      flat.consultationNotes          = c.notes || '';
      flat.consultationClientAccepted = c.clientAccepted ?? null;
      delete flat.consultation;
    }

    // Child-Arrays entfernen (werden separat gespeichert)
    delete flat.shootingDates;
    delete flat.locations;
    delete flat.team;
    delete flat.documents;

    // customerPhoto bleibt – ist ein JSON-Feld, wird von BaseRepository
    // über _jsonFields automatisch stringifiziert.
    // Aber: wenn customerPhoto = null gesetzt wird (Löschung), muss es bleiben.

    return flat;
  }

  // ── Öffentliche API ───────────────────────────────────────────────

  getAllProjects() {
    return this.findAll().map(p => this._enrichProject(p));
  }

  getProjectById(id) {
    const project = this.findById(id);
    if (!project) throw new Error(`Auftrag mit ID ${id} nicht gefunden`);
    return this._enrichProject(project);
  }

  getProjectsByCustomerId(customerId) {
    const rows = this.db.prepare('SELECT * FROM projects WHERE customer_id = ?').all(customerId);
    return rows.map(r => rowToCamel(r, PROJECT_JSON_FIELDS)).map(p => this._enrichProject(p));
  }

  createProject(data) {
    const errors = [];
    if (!data.customerId)                     errors.push('Kunden-ID ist erforderlich');
    if (!data.projectName && !data.name)      errors.push('Projektname ist erforderlich');
    if (!data.category    && !data.type)       errors.push('Kategorie ist erforderlich');
    if (!data.booking     && !data.startDate)  errors.push('Buchungsdatum ist erforderlich');
    if (errors.length) throw new Error(errors.join(', '));

    if (!data.projectName) data.projectName = data.name;
    if (!data.category)    data.category = data.type;
    if (!data.booking)     data.booking = data.startDate;

    const flat = this._flattenForDb(data);
    const id = data.id || generateId('projects');

    this.db.transaction(() => {
      flat.id = id;
      this.insert(flat);
      this._syncChildren(id, data);
    })();

    const created = this.getProjectById(id);
    logger.info(`✅ Auftrag erstellt: ${created.id}`, created.projectName);
    return created;
  }

  updateProject(id, data) {
    this.getProjectById(id); // Existenz prüfen
    const flat = this._flattenForDb(data);

    this.db.transaction(() => {
      if (Object.keys(flat).length > 0) {
        this.update(id, flat);
      }
      this._syncChildren(id, data);
    })();

    const updated = this.getProjectById(id);
    logger.info(`✅ Auftrag aktualisiert: ${id}`);
    return updated;
  }

  deleteProject(id) {
    this.getProjectById(id);
    const result = this.delete(id);
    logger.info(`✅ Auftrag gelöscht: ${id}`);
    return result;
  }

  getProjectsByStatus(status) {
    const rows = this.db.prepare('SELECT * FROM projects WHERE status = ?').all(status);
    return rows.map(r => rowToCamel(r, PROJECT_JSON_FIELDS)).map(p => this._enrichProject(p));
  }

  getProjectsByType(type) {
    const rows = this.db.prepare('SELECT * FROM projects WHERE category = ?').all(type);
    return rows.map(r => rowToCamel(r, PROJECT_JSON_FIELDS)).map(p => this._enrichProject(p));
  }

  searchProjects(query) {
    const rows = this.db.prepare(`SELECT * FROM projects WHERE project_name LIKE @q OR description LIKE @q OR category LIKE @q`).all({ q: `%${query}%` });
    return rows.map(r => rowToCamel(r, PROJECT_JSON_FIELDS)).map(p => this._enrichProject(p));
  }
}

module.exports = new ProjectService();
