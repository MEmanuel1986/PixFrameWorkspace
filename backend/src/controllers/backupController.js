'use strict';
/**
 * backupController.js
 * HTTP-Adapter für alle Backup-Endpunkte.
 *
 * GET  /api/backup/list           → Liste aller Backups
 * POST /api/backup/create         → Manuelles Backup erstellen
 * POST /api/backup/restore/:name  → Backup wiederherstellen
 * POST /api/backup/import         → Backup-ZIP hochladen + wiederherstellen
 * DELETE /api/backup/:name        → Einzelnes Backup löschen
 * GET  /api/backup/download/:name → Backup-ZIP herunterladen
 */

const path          = require('path');
const fs            = require('fs');
const paths         = require('../config/paths');
const backupService = require('../services/backupService');

const backupController = {

  // ── Liste ────────────────────────────────────────────────────────────────
  list(req, res) {
    try {
      const backups = backupService.listBackups();
      res.json({ success: true, data: backups });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // ── Manuelles Backup ─────────────────────────────────────────────────────
  async create(req, res) {
    try {
      const result = await backupService.createBackup();
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[backupController] create:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ── Wiederherstellen (aus vorhandenem Backup) ─────────────────────────────
  async restore(req, res) {
    try {
      const { filename } = req.params;
      const result = await backupService.restoreBackup(filename);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[backupController] restore:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ── Import (hochgeladene ZIP-Datei) ───────────────────────────────────────
  async importBackup(req, res) {
    try {
      if (!req.files?.backup) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
      }
      const file     = req.files.backup;
      const tempPath = file.tempFilePath || path.join(paths.TEMP_DIR, `upload_${Date.now()}.zip`);

      // Falls tempFilePath nicht gesetzt, Datei manuell speichern
      if (!file.tempFilePath) {
        await new Promise((resolve, reject) =>
          file.mv(tempPath, err => err ? reject(err) : resolve())
        );
      }

      const result = await backupService.restoreFromUpload(tempPath);

      // Temp-Datei aufräumen (falls wir sie selbst angelegt haben)
      try { if (!file.tempFilePath) fs.unlinkSync(tempPath); } catch {}

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[backupController] import:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ── Löschen ───────────────────────────────────────────────────────────────
  delete(req, res) {
    try {
      backupService.deleteBackup(req.params.filename);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // ── Download ──────────────────────────────────────────────────────────────
  download(req, res) {
    try {
      const { filename } = req.params;
      if (!filename.startsWith('pixframe-backup-') || !filename.endsWith('.zip')) {
        return res.status(400).json({ error: 'Ungültiger Dateiname' });
      }
      const filePath = path.join(paths.BACKUPS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Backup nicht gefunden' });
      }
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = backupController;
