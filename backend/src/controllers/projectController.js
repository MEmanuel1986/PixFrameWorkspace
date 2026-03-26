const projectService = require('../services/projectService');
const path           = require('path');
const fs             = require('fs');
const paths          = require('../config/paths');

const SETTINGS_FILE = paths.SETTINGS_FILE;

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')); }
  catch { return {}; }
}

function buildNumber(schema, counter) {
  const padded = String(counter).padStart(schema.digits || 5, '0');
  const now    = new Date();
  const parts  = [schema.prefix];
  const sep    = schema.separator ?? '-';
  if (schema.useYear)  parts.push(now.getFullYear());
  if (schema.useMonth) parts.push(String(now.getMonth() + 1).padStart(2, '0'));
  const inner  = schema.innerSeparator !== undefined ? schema.innerSeparator : '/';
  return `${parts.join(sep)}${inner}${padded}`;
}

function nextContractNumber() {
  const settings = loadSettings();
  const schema   = settings.numberSchemas?.contract || {
    prefix: 'V', separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true,
  };
  const all  = projectService.getAllProjects().filter(p => p.contractNumber);
  const nums = all.map(p => {
    const m = (p.contractNumber || '').match(/(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return buildNumber(schema, next);
}

function nextAddendumNumber(projectId) {
  const settings = loadSettings();
  const schema   = settings.numberSchemas?.addendum || {
    prefix: 'VN', separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true,
  };
  // Count all addenda across all projects that have an addendumNumber
  const allProjects = projectService.getAllProjects();
  const allAddenda  = allProjects.flatMap(p => p.contractAddenda || []);
  const nums = allAddenda
    .filter(a => a.addendumNumber)
    .map(a => {
      const m = (a.addendumNumber || '').match(/(\d+)$/);
      return m ? parseInt(m[1]) : 0;
    });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return buildNumber(schema, next);
}

class ProjectController {
  /**
   * GET /api/projects - Alle Projekte abrufen
   */
  async getAll(req, res, next) {
    try {
      const { status, type, search } = req.query;

      let projects;
      if (search) {
        projects = projectService.searchProjects(search);
      } else if (status) {
        projects = projectService.getProjectsByStatus(status);
      } else if (type) {
        projects = projectService.getProjectsByType(type);
      } else {
        projects = projectService.getAllProjects();
      }

      res.json({
        success: true,
        count: projects.length,
        data: projects,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/projects/:id - Ein Projekt abrufen
   */
  async getById(req, res, next) {
    try {
      const project = projectService.getProjectById(req.params.id);
      res.json({ success: true, data: project });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }

  /**
   * GET /api/projects/customer/:customerId - Alle Projekte eines Kunden
   */
  async getByCustomer(req, res, next) {
    try {
      const projects = projectService.getProjectsByCustomerId(req.params.customerId);
      res.json({
        success: true,
        count: projects.length,
        data: projects,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/projects - Neues Projekt erstellen
   */
  async create(req, res, next) {
    try {
      const project = projectService.createProject(req.body);
      res.status(201).json({ success: true, data: project });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * PUT /api/projects/:id - Projekt aktualisieren
   */
  async update(req, res, next) {
    try {
      const project = projectService.updateProject(req.params.id, req.body);
      res.json({ success: true, data: project });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * DELETE /api/projects/:id - Projekt löschen
   */
  async delete(req, res, next) {
    try {
      const result = projectService.deleteProject(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }

  // ─── Unterzeichnete Verträge ────────────────────────────────────

  /**
   * POST /api/projects/:id/contracts — Unterzeichneten Vertrag hochladen
   */
  async uploadSignedContract(req, res) {
    const path = require('path');
    const fs   = require('fs');
    const crypto = require('crypto');
      const uuidv4 = () => crypto.randomUUID();
    try {
      if (!req.files || !req.files.contract) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
      }
      const file     = req.files.contract;
      const ext      = path.extname(file.name).toLowerCase();
      const allowed  = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
      if (!allowed.includes(ext)) {
        return res.status(400).json({ error: `Nur ${allowed.join(', ')} erlaubt` });
      }
      if (file.size > 30 * 1024 * 1024) {
        return res.status(400).json({ error: 'Datei zu groß (max. 30 MB)' });
      }
      const projectId = req.params.id;
      const dir = path.join(paths.CONTRACTS_DIR, projectId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const id       = uuidv4();
      const safeName = id + ext;
      const dest     = path.join(dir, safeName);

      file.mv(dest, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        const entry = {
          id,
          originalName: file.name,
          url:          `/uploads/contracts/${projectId}/${safeName}`,
          size:         file.size,
          ext:          ext.replace('.', '').toUpperCase(),
          uploadedAt:   new Date().toISOString(),
        };
        // Persist entry in project
        const project = projectService.getProjectById(projectId);
        if (!project.signedContracts) project.signedContracts = [];
        project.signedContracts.push(entry);
        projectService.updateProject(projectId, { signedContracts: project.signedContracts });
        res.json({ success: true, data: entry });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * DELETE /api/projects/:id/contracts/:cid — Vertrag löschen
   */
  async deleteSignedContract(req, res) {
    const path = require('path');
    const fs   = require('fs');
    try {
      const { id, cid } = req.params;
      const project = projectService.getProjectById(id);
      const entry   = (project.signedContracts || []).find(c => c.id === cid);
      if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });

      // Delete file
      const filePath = path.join(paths.BACKEND_DIR, entry.url);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}

      // Remove from array
      project.signedContracts = project.signedContracts.filter(c => c.id !== cid);
      projectService.updateProject(id, { signedContracts: project.signedContracts });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/projects/:id/contracts/:cid/download — Vertrag herunterladen
   */
  async downloadSignedContract(req, res) {
    const path = require('path');
    const fs   = require('fs');
    try {
      const { id, cid } = req.params;
      const project = projectService.getProjectById(id);
      const entry   = (project.signedContracts || []).find(c => c.id === cid);
      if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });
      const filePath = path.join(paths.BACKEND_DIR, entry.url);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' });
      res.download(filePath, entry.originalName);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // ─── Unterzeichnete Nachträge ─────────────────────────────────────

  /**
   * POST /api/projects/:id/addenda/:addendumId/sign
   * Unterzeichneten Nachtrag hochladen
   */
  async uploadSignedAddendum(req, res) {
    const path   = require('path');
    const fs     = require('fs');
    const crypto = require('crypto');
    const uuidv4 = () => crypto.randomUUID();
    try {
      const { id, addendumId } = req.params;
      if (!req.files || !req.files.addendum) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen (Feldname: addendum)' });
      }
      const project = projectService.getProjectById(id);
      if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

      const addenda = project.contractAddenda || [];
      const idx     = addenda.findIndex(a => a.id === addendumId);
      if (idx === -1) return res.status(404).json({ error: 'Nachtrag nicht gefunden' });

      const file     = req.files.addendum;
      const ext      = path.extname(file.name).toLowerCase();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_äöüÄÖÜß ]/g,'_').replace(/\s+/g,'_');
      const dir      = path.join(paths.CONTRACTS_DIR, id, 'addenda', addendumId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const dest = path.join(dir, safeName);

      await new Promise((resolve, reject) =>
        file.mv(dest, e => e ? reject(e) : resolve())
      );

      const entry = {
        id:           uuidv4(),
        originalName: file.name,
        safeName,
        size:         file.size,
        ext:          ext.replace('.','').toUpperCase(),
        url:          `/uploads/contracts/${id}/addenda/${addendumId}/${safeName}`,
        uploadedAt:   new Date().toISOString(),
      };

      // Store on the addendum object
      addenda[idx] = { ...addenda[idx], signedFile: entry };
      projectService.updateProject(id, { contractAddenda: addenda });

      res.json({ success: true, data: entry });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * DELETE /api/projects/:id/addenda/:addendumId/sign
   */
  async deleteSignedAddendum(req, res) {
    const path = require('path');
    const fs   = require('fs');
    try {
      const { id, addendumId } = req.params;
      const project = projectService.getProjectById(id);
      const addenda = project.contractAddenda || [];
      const idx     = addenda.findIndex(a => a.id === addendumId);
      if (idx === -1) return res.status(404).json({ error: 'Nachtrag nicht gefunden' });

      const entry = addenda[idx].signedFile;
      if (entry) {
        const filePath = path.join(paths.BACKEND_DIR, entry.url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      addenda[idx] = { ...addenda[idx], signedFile: null };
      projectService.updateProject(id, { contractAddenda: addenda });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * GET /api/projects/:id/addenda/:addendumId/sign/download
   */
  async downloadSignedAddendum(req, res) {
    const path = require('path');
    const fs   = require('fs');
    try {
      const { id, addendumId } = req.params;
      const project = projectService.getProjectById(id);
      const add     = (project.contractAddenda || []).find(a => a.id === addendumId);
      if (!add || !add.signedFile) return res.status(404).json({ error: 'Kein unterzeichneter Nachtrag vorhanden' });
      const filePath = path.join(paths.BACKEND_DIR, add.signedFile.url);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' });
      res.download(filePath, add.signedFile.originalName);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // ─── Unterzeichnete Nachträge ─────────────────────────────────────────

  async uploadSignedAddendum(req, res) {
    const path   = require('path');
    const fs     = require('fs');
    const crypto = require('crypto');
    try {
      const { id, addendumId } = req.params;
      if (!req.files?.addendum) return res.status(400).json({ error: 'Keine Datei (Feld: addendum)' });
      const project = projectService.getProjectById(id);
      if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
      const addenda = project.contractAddenda || [];
      const idx = addenda.findIndex(a => a.id === addendumId);
      if (idx === -1) return res.status(404).json({ error: 'Nachtrag nicht gefunden' });

      const file     = req.files.addendum;
      const ext      = path.extname(file.name).toLowerCase();
      const safeName = `signed_${addendumId}${ext}`;
      const dir      = path.join(paths.CONTRACTS_DIR, id, 'addenda');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const dest = path.join(dir, safeName);
      await new Promise((resolve, reject) => file.mv(dest, e => e ? reject(e) : resolve()));

      const entry = {
        id:           crypto.randomUUID(),
        originalName: file.name,
        safeName,
        size:         file.size,
        ext:          ext.replace('.', '').toUpperCase(),
        url:          `/uploads/contracts/${id}/addenda/${safeName}`,
        uploadedAt:   new Date().toISOString(),
      };
      addenda[idx] = { ...addenda[idx], signedFile: entry };
      projectService.updateProject(id, { contractAddenda: addenda });
      res.json({ success: true, data: entry });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async deleteSignedAddendum(req, res) {
    const path = require('path');
    const fs   = require('fs');
    try {
      const { id, addendumId } = req.params;
      const project = projectService.getProjectById(id);
      const addenda = project.contractAddenda || [];
      const idx = addenda.findIndex(a => a.id === addendumId);
      if (idx === -1) return res.status(404).json({ error: 'Nachtrag nicht gefunden' });
      const entry = addenda[idx].signedFile;
      if (entry) {
        const fp = path.join(paths.BACKEND_DIR, entry.url);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      addenda[idx] = { ...addenda[idx], signedFile: null };
      projectService.updateProject(id, { contractAddenda: addenda });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async downloadSignedAddendum(req, res) {
    const path = require('path');
    const fs   = require('fs');
    try {
      const { id, addendumId } = req.params;
      const project = projectService.getProjectById(id);
      const add = (project.contractAddenda || []).find(a => a.id === addendumId);
      if (!add?.signedFile) return res.status(404).json({ error: 'Kein unterzeichneter Nachtrag' });
      const fp = path.join(paths.BACKEND_DIR, add.signedFile.url);
      if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Datei nicht gefunden' });
      res.download(fp, add.signedFile.originalName);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // ─── Nummernvergabe ──────────────────────────────────────────────

  /** GET /api/projects/next-contract-number */
  getNextContractNumber(req, res) {
    try {
      res.json({ success: true, data: { number: nextContractNumber() } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  /** GET /api/projects/next-addendum-number */
  getNextAddendumNumber(req, res) {
    try {
      res.json({ success: true, data: { number: nextAddendumNumber() } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  /** POST /api/projects/:id/customer-photo — Kundenfoto hochladen */
  async uploadCustomerPhoto(req, res) {
    const path   = require('path');
    const fs     = require('fs');
    const crypto = require('crypto');
    try {
      if (!req.files?.photo) {
        return res.status(400).json({ error: 'Keine Datei (Feld: photo)' });
      }
      const file    = req.files.photo;
      const ext     = path.extname(file.name).toLowerCase();
      const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      if (!allowed.includes(ext)) {
        return res.status(400).json({ error: `Nur Bilder erlaubt (${allowed.join(', ')})` });
      }
      if (file.size > 20 * 1024 * 1024) {
        return res.status(400).json({ error: 'Datei zu groß (max. 20 MB)' });
      }
      const projectId = req.params.id;
      const dir = path.join(paths.UPLOADS_DIR, 'customer-photos', projectId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const project = projectService.getProjectById(projectId);
      if (project?.customerPhoto?.url) {
        const oldPath = path.join(paths.BACKEND_DIR, project.customerPhoto.url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const id       = crypto.randomUUID();
      const safeName = id + ext;
      const dest     = path.join(dir, safeName);

      await new Promise((resolve, reject) => file.mv(dest, e => e ? reject(e) : resolve()));

      const entry = {
        id,
        originalName: file.name,
        url:          `/uploads/customer-photos/${projectId}/${safeName}`,
        uploadedAt:   new Date().toISOString(),
      };
      projectService.updateProject(projectId, { customerPhoto: entry });
      res.json({ success: true, data: entry });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  /** DELETE /api/projects/:id/customer-photo — Kundenfoto löschen */
  deleteCustomerPhoto(req, res) {
    const path = require('path');
    const fs   = require('fs');
    try {
      const projectId = req.params.id;
      const project   = projectService.getProjectById(projectId);
      if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
      if (project.customerPhoto?.url) {
        const filePath = path.join(paths.BACKEND_DIR, project.customerPhoto.url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      projectService.updateProject(projectId, { customerPhoto: null });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

}

module.exports = new ProjectController();
