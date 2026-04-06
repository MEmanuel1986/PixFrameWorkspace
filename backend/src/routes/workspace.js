'use strict';
/**
 * routes/workspace.js — API fuer Workspace-Verwaltung
 *
 * GET  /api/workspace/info          → Workspace-Infos
 * GET  /api/workspace/project-files → Dateien eines Projekts
 * POST /api/workspace/save-pdf      → PDF im Projektordner speichern
 */

const express = require('express');
const router  = express.Router();
const path    = require('path');
const workspaceService = require('../services/workspaceService');

function getDocumentService()  { return require('../services/documentService'); }
function getProjectService()   { return require('../services/projectService'); }
function getCustomerService()  { return require('../services/customerService'); }

// GET /api/workspace/info
router.get('/info', (req, res) => {
  try {
    res.json({ success: true, data: workspaceService.getWorkspaceInfo() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/workspace/project-files
router.get('/project-files', (req, res) => {
  try {
    const { customerNumber, projectId, subfolder = 'dokumente' } = req.query;
    if (!customerNumber || !projectId) {
      return res.status(400).json({ error: 'customerNumber und projectId sind Pflicht' });
    }
    const files = workspaceService.listProjectFiles(customerNumber, projectId, subfolder);
    res.json({ success: true, data: files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/workspace/save-pdf
router.post('/save-pdf', (req, res) => {
  try {
    const { apiPath, filename, pdfBase64 } = req.body;
    if (!apiPath || !pdfBase64) {
      return res.status(400).json({ error: 'apiPath und pdfBase64 sind Pflicht' });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const context = resolveProjectContext(apiPath);

    if (!context) {
      return res.json({ success: true, saved: false, reason: 'Kein Projektbezug' });
    }

    // Standardisierten Dateinamen erzeugen
    const standardName = context.standardFilename || filename || 'Dokument';
    const safeName = standardName + (standardName.endsWith('.pdf') ? '' : '.pdf');

    // Unterordner: Vertraege in vertraege/, alles andere in dokumente/
    const subfolder = context.subfolder || 'dokumente';

    const savedPath = workspaceService.savePdfToProject(
      pdfBuffer, context.customerNumber, context.projectId, safeName, subfolder
    );

    res.json({ success: true, saved: true, path: savedPath });
  } catch (e) {
    console.error('[workspace/save-pdf]', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * Gibt den Ordnernamen fuer ein Projekt zurueck.
 * Neue Projekte: Projektnummer (z.B. 'Proj-2026-04_00001')
 * Alte Projekte: aus projectFolderPath oder projectId als Fallback
 */
function getProjectFolderKey(project) {
  if (project.projectFolderPath) {
    return path.basename(project.projectFolderPath);
  }
  return project.projectNumber || project.id;
}

/**
 * Sanitize Kundenname fuer Dateinamen
 */
function sanitizeForFilename(str) {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').trim().replace(/\s+/g, '_');
}

/**
 * Extrahiert einen Query-Parameter aus einer URL/apiPath-Zeichenkette.
 * z.B. extractQueryParam('/api/pdf/agb?projectId=abc', 'projectId') => 'abc'
 */
function extractQueryParam(urlStr, key) {
  const qIdx = urlStr.indexOf('?');
  if (qIdx === -1) return null;
  const params = new URLSearchParams(urlStr.slice(qIdx));
  return params.get(key) || null;
}

/**
 * Kundennamen aus Customer-Objekt erzeugen
 */
function buildCustomerLabel(customer) {
  if (!customer) return '';
  const name = [customer.lastName, customer.firstName].filter(Boolean).join('_');
  return sanitizeForFilename(name || customer.company || '');
}

/**
 * Resolve-Funktion: Ermittelt Projekt-Kontext UND standardisierten Dateinamen
 * aus der API-URL.
 *
 * Gibt zurueck: { customerNumber, projectId, standardFilename, subfolder }
 */
function resolveProjectContext(apiPath) {
  try {
    // ── Dokumente (Angebote, Rechnungen) ──
    const docMatch = apiPath.match(/\/api\/pdf\/document\/(.+)/);
    if (docMatch) {
      const doc = getDocumentService().getDocumentById(docMatch[1]);
      if (doc?.projectId) {
        const project  = getProjectService().getProjectById(doc.projectId);
        const customer = getCustomerService().getCustomerById(project.customerId);
        const custLabel = buildCustomerLabel(customer);
        const docNum = doc.documentNumber || '';
        const folderKey = getProjectFolderKey(project);

        // Typ-Prefix bestimmen
        let prefix = 'Dokument';
        if (doc.type === 'quote')   prefix = 'Angebot';
        if (doc.type === 'invoice') {
          if (doc.docSubtype === 'cancellation') prefix = 'Storno';
          else if (doc.docSubtype === 'correction') prefix = 'Korrektur';
          else if (doc.isDeposit) prefix = 'Anzahlungsrechnung';
          else prefix = 'Rechnung';
        }

        // Standardname: Typ_Nummer_Kundenname
        const parts = [prefix, docNum, custLabel].filter(Boolean);
        return {
          customerNumber: customer.customerNumber,
          projectId: folderKey,
          standardFilename: parts.join('_'),
          subfolder: 'dokumente',
        };
      }
      return null;
    }

    // ── Shooting-Vertrag ──
    const contractMatch = apiPath.match(/\/api\/pdf\/contract\/(.+)/);
    if (contractMatch) {
      const project  = getProjectService().getProjectById(contractMatch[1]);
      const customer = getCustomerService().getCustomerById(project.customerId);
      const custLabel = buildCustomerLabel(customer);
      const contractNum = project.contractNumber || '';
      const folderKey = getProjectFolderKey(project);
      const parts = ['Vertrag', contractNum, custLabel].filter(Boolean);
      return {
        customerNumber: customer.customerNumber,
        projectId: folderKey,
        standardFilename: parts.join('_'),
        subfolder: 'vertraege',
      };
    }

    // ── ADV (Auftragsverarbeitung) ──
    const advMatch = apiPath.match(/\/api\/pdf\/adv\/(.+)/);
    if (advMatch) {
      const project  = getProjectService().getProjectById(advMatch[1]);
      const customer = getCustomerService().getCustomerById(project.customerId);
      const custLabel = buildCustomerLabel(customer);
      const folderKey = getProjectFolderKey(project);
      return {
        customerNumber: customer.customerNumber,
        projectId: folderKey,
        standardFilename: 'ADV_' + custLabel,
        subfolder: 'vertraege',
      };
    }

    // ── Vertragsnachtrag ──
    const addMatch = apiPath.match(/\/api\/pdf\/addendum\/([^/]+)\/(.+)/);
    if (addMatch) {
      const project  = getProjectService().getProjectById(addMatch[1]);
      const customer = getCustomerService().getCustomerById(project.customerId);
      const custLabel = buildCustomerLabel(customer);
      const folderKey = getProjectFolderKey(project);
      const addId = addMatch[2];
      // Nachtragsnummer aus dem Projekt laden
      const addenda = project.contractAddenda || [];
      const addIdx = addenda.findIndex(a => a.id === addId);
      const nrLabel = addIdx >= 0 ? 'N' + (addIdx + 1) : addId;
      return {
        customerNumber: customer.customerNumber,
        projectId: folderKey,
        standardFilename: 'Nachtrag_' + nrLabel + '_' + custLabel,
        subfolder: 'vertraege',
      };
    }

    // ── AGB mit Projektbezug ──
    const agbMatch = apiPath.match(/\/api\/pdf\/agb(?:\?|$)/);
    if (agbMatch) {
      const projectId = extractQueryParam(apiPath, 'projectId');
      if (projectId) {
        const project  = getProjectService().getProjectById(projectId);
        const customer = getCustomerService().getCustomerById(project.customerId);
        const custLabel = buildCustomerLabel(customer);
        const folderKey = getProjectFolderKey(project);
        return {
          customerNumber: customer.customerNumber,
          projectId: folderKey,
          standardFilename: 'AGB_' + custLabel,
          subfolder: 'vertraege',
        };
      }
      return null;
    }

    // ── DSGVO mit Projektbezug ──
    const dsgvoMatch = apiPath.match(/\/api\/pdf\/dsgvo(?:\?|$)/);
    if (dsgvoMatch) {
      const projectId = extractQueryParam(apiPath, 'projectId');
      if (projectId) {
        const project  = getProjectService().getProjectById(projectId);
        const customer = getCustomerService().getCustomerById(project.customerId);
        const custLabel = buildCustomerLabel(customer);
        const folderKey = getProjectFolderKey(project);
        return {
          customerNumber: customer.customerNumber,
          projectId: folderKey,
          standardFilename: 'DSGVO_' + custLabel,
          subfolder: 'vertraege',
        };
      }
      return null;
    }

    // ── ADV-Vertrag (statisch, ohne Projekt-ID in URL) ──
    const advVertragMatch = apiPath.match(/\/api\/pdf\/adv-vertrag(?:\?|$)/);
    if (advVertragMatch) {
      const projectId = extractQueryParam(apiPath, 'projectId');
      if (projectId) {
        const project  = getProjectService().getProjectById(projectId);
        const customer = getCustomerService().getCustomerById(project.customerId);
        const custLabel = buildCustomerLabel(customer);
        const folderKey = getProjectFolderKey(project);
        return {
          customerNumber: customer.customerNumber,
          projectId: folderKey,
          standardFilename: 'ADV-Vertrag_' + custLabel,
          subfolder: 'vertraege',
        };
      }
      return null;
    }

    // Kein Projektbezug erkannt
    return null;
  } catch (e) {
    console.warn('[workspace] resolveProjectContext:', e.message);
    return null;
  }
}

module.exports = router;
