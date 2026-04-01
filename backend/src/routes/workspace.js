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

    const safeName = (filename || 'Dokument') + (filename?.endsWith('.pdf') ? '' : '.pdf');
    const savedPath = workspaceService.savePdfToProject(
      pdfBuffer, context.customerNumber, context.projectId, safeName
    );

    res.json({ success: true, saved: true, path: savedPath });
  } catch (e) {
    console.error('[workspace/save-pdf]', e.message);
    res.status(500).json({ error: e.message });
  }
});

function resolveProjectContext(apiPath) {
  try {
    const docMatch = apiPath.match(/\/api\/pdf\/document\/(.+)/);
    if (docMatch) {
      const doc = getDocumentService().getDocumentById(docMatch[1]);
      if (doc?.projectId) {
        const project  = getProjectService().getProjectById(doc.projectId);
        const customer = getCustomerService().getCustomerById(project.customerId);
        return { customerNumber: customer.customerNumber, projectId: doc.projectId };
      }
      return null;
    }

    const contractMatch = apiPath.match(/\/api\/pdf\/contract\/(.+)/);
    if (contractMatch) {
      const project  = getProjectService().getProjectById(contractMatch[1]);
      const customer = getCustomerService().getCustomerById(project.customerId);
      return { customerNumber: customer.customerNumber, projectId: project.id };
    }

    const advMatch = apiPath.match(/\/api\/pdf\/adv\/(.+)/);
    if (advMatch) {
      const project  = getProjectService().getProjectById(advMatch[1]);
      const customer = getCustomerService().getCustomerById(project.customerId);
      return { customerNumber: customer.customerNumber, projectId: project.id };
    }

    const addMatch = apiPath.match(/\/api\/pdf\/addendum\/([^/]+)\/(.+)/);
    if (addMatch) {
      const project  = getProjectService().getProjectById(addMatch[1]);
      const customer = getCustomerService().getCustomerById(project.customerId);
      return { customerNumber: customer.customerNumber, projectId: project.id };
    }

    // agb, dsgvo, adv-vertrag, blank-contract, ear → kein Projektbezug
    return null;
  } catch (e) {
    console.warn('[workspace] resolveProjectContext:', e.message);
    return null;
  }
}

module.exports = router;
