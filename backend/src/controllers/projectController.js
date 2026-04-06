const projectService   = require('../services/projectService');
const settingsService  = require('../services/settingsService');
const customerService  = require('../services/customerService');
const workspaceService = require('../services/workspaceService');
const path           = require('path');
const fs             = require('fs');
const paths          = require('../config/paths');

function loadSettings() {
  try { return settingsService.getSettings(); }
  catch { return {}; }
}

/**
 * Loest den Projektordner-Schluessel auf.
 * Gibt { customerNumber, folderKey } zurueck oder null.
 */
function resolveProjectFolder(projectId) {
  try {
    const project  = projectService.getProjectById(projectId);
    if (!project) return null;
    const customer = customerService.getCustomerById(project.customerId);
    if (!customer) return null;
    const folderKey = project.projectFolderPath
      ? path.basename(project.projectFolderPath)
      : (project.projectNumber || project.id);
    return { customerNumber: customer.customerNumber, folderKey };
  } catch { return null; }
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
  async getAll(req, res, next) {
    try {
      const { status, type, search } = req.query;
      let projects;
      if (search)       projects = projectService.searchProjects(search);
      else if (status)  projects = projectService.getProjectsByStatus(status);
      else if (type)    projects = projectService.getProjectsByType(type);
      else              projects = projectService.getAllProjects();
      res.json({ success: true, count: projects.length, data: projects });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const project = projectService.getProjectById(req.params.id);
      res.json({ success: true, data: project });
    } catch (err) { res.status(404).json({ error: err.message }); }
  }

  async getByCustomer(req, res, next) {
    try {
      const projects = projectService.getProjectsByCustomerId(req.params.customerId);
      res.json({ success: true, count: projects.length, data: projects });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const project = projectService.createProject(req.body);
      res.status(201).json({ success: true, data: project });
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async update(req, res, next) {
    try {
      const project = projectService.updateProject(req.params.id, req.body);
      res.json({ success: true, data: project });
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async delete(req, res, next) {
    try {
      const result = projectService.deleteProject(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) { res.status(404).json({ error: err.message }); }
  }

  // ─── Unterzeichnete Vertraege ────────────────────────────────────

  async uploadSignedContract(req, res) {
    const crypto = require('crypto');
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
        return res.status(400).json({ error: 'Datei zu gross (max. 30 MB)' });
      }
      const projectId = req.params.id;
      const id        = crypto.randomUUID();
      const safeName  = 'Vertrag_unterschrieben_' + id.slice(0, 8) + ext;

      const pf = resolveProjectFolder(projectId);
      let dest;
      if (pf) {
        const folder = paths.projectSubfolder(pf.customerNumber, pf.folderKey, 'vertraege');
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        dest = path.join(folder, safeName);
      } else {
        const dir = path.join(paths.CONTRACTS_DIR, projectId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        dest = path.join(dir, safeName);
      }

      await new Promise((resolve, reject) =>
        file.mv(dest, e => e ? reject(e) : resolve())
      );

      const entry = {
        id,
        originalName: file.name,
        safeName,
        absolutePath: dest,
        url:          pf ? null : `/uploads/contracts/${projectId}/${safeName}`,
        size:         file.size,
        ext:          ext.replace('.', '').toUpperCase(),
        uploadedAt:   new Date().toISOString(),
      };
      const project = projectService.getProjectById(projectId);
      if (!project.signedContracts) project.signedContracts = [];
      project.signedContracts.push(entry);
      projectService.updateProject(projectId, { signedContracts: project.signedContracts });
      res.json({ success: true, data: entry });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async deleteSignedContract(req, res) {
    try {
      const { id, cid } = req.params;
      const project = projectService.getProjectById(id);
      const entry   = (project.signedContracts || []).find(c => c.id === cid);
      if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });
      const filePath = entry.absolutePath || (entry.url ? path.join(paths.BACKEND_DIR, entry.url) : null);
      try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      project.signedContracts = project.signedContracts.filter(c => c.id !== cid);
      projectService.updateProject(id, { signedContracts: project.signedContracts });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  async downloadSignedContract(req, res) {
    try {
      const { id, cid } = req.params;
      const project = projectService.getProjectById(id);
      const entry   = (project.signedContracts || []).find(c => c.id === cid);
      if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });
      const filePath = entry.absolutePath || (entry.url ? path.join(paths.BACKEND_DIR, entry.url) : null);
      if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' });
      res.download(filePath, entry.originalName);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }

  // ─── Unterzeichnete Nachtraege ─────────────────────────────────────────

  async uploadSignedAddendum(req, res) {
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
      const safeName = `Nachtrag_unterschrieben_${addendumId.slice(0, 8)}${ext}`;

      const pf = resolveProjectFolder(id);
      let dest;
      if (pf) {
        const folder = paths.projectSubfolder(pf.customerNumber, pf.folderKey, 'vertraege');
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        dest = path.join(folder, safeName);
      } else {
        const dir = path.join(paths.CONTRACTS_DIR, id, 'addenda');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        dest = path.join(dir, safeName);
      }
      await new Promise((resolve, reject) => file.mv(dest, e => e ? reject(e) : resolve()));

      const entry = {
        id:           crypto.randomUUID(),
        originalName: file.name,
        safeName,
        absolutePath: dest,
        size:         file.size,
        ext:          ext.replace('.', '').toUpperCase(),
        url:          pf ? null : `/uploads/contracts/${id}/addenda/${safeName}`,
        uploadedAt:   new Date().toISOString(),
      };
      addenda[idx] = { ...addenda[idx], signedFile: entry };
      projectService.updateProject(id, { contractAddenda: addenda });
      res.json({ success: true, data: entry });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async deleteSignedAddendum(req, res) {
    try {
      const { id, addendumId } = req.params;
      const project = projectService.getProjectById(id);
      const addenda = project.contractAddenda || [];
      const idx = addenda.findIndex(a => a.id === addendumId);
      if (idx === -1) return res.status(404).json({ error: 'Nachtrag nicht gefunden' });
      const entry = addenda[idx].signedFile;
      if (entry) {
        const fp = entry.absolutePath || (entry.url ? path.join(paths.BACKEND_DIR, entry.url) : null);
        if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      addenda[idx] = { ...addenda[idx], signedFile: null };
      projectService.updateProject(id, { contractAddenda: addenda });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async downloadSignedAddendum(req, res) {
    try {
      const { id, addendumId } = req.params;
      const project = projectService.getProjectById(id);
      const add = (project.contractAddenda || []).find(a => a.id === addendumId);
      if (!add?.signedFile) return res.status(404).json({ error: 'Kein unterzeichneter Nachtrag' });
      const fp = add.signedFile.absolutePath || (add.signedFile.url ? path.join(paths.BACKEND_DIR, add.signedFile.url) : null);
      if (!fp || !fs.existsSync(fp)) return res.status(404).json({ error: 'Datei nicht gefunden' });
      res.download(fp, add.signedFile.originalName);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // ─── Nummernvergabe ──────────────────────────────────────────────

  getNextContractNumber(req, res) {
    try {
      res.json({ success: true, data: { number: nextContractNumber() } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  getNextAddendumNumber(req, res) {
    try {
      res.json({ success: true, data: { number: nextAddendumNumber() } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // ─── Kundenfoto ──────────────────────────────────────────────────

  async uploadCustomerPhoto(req, res) {
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
        return res.status(400).json({ error: 'Datei zu gross (max. 20 MB)' });
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

  deleteCustomerPhoto(req, res) {
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