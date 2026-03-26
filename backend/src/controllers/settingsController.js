'use strict';
/**
 * settingsController.js — HTTP-Adapter.
 * Logik in services/settingsService.js.
 */

const settingsService = require('../services/settingsService');

const settingsController = {

  get(req, res) {
    try {
      res.json({ success: true, data: settingsService.getSettings() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  update(req, res) {
    try {
      const updated = settingsService.updateSettings(req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async uploadLogo(req, res) {
    try {
      if (!req.files?.logo) return res.status(400).json({ error: 'Keine Datei hochgeladen' });
      const logoUrl = await settingsService.saveLogo(req.files.logo);
      res.json({ success: true, logoUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  deleteLogo(req, res) {
    try {
      settingsService.deleteLogo();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = settingsController;
