'use strict';

const resetService = require('../services/resetService');

/**
 * POST /api/reset/execute
 * Führt den vollständigen Datenbank- und Workspace-Reset durch.
 */
exports.executeReset = (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Service-Passwort erforderlich.' });
    }

    const result = resetService.execute(password);

    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }

    res.json({
      message: 'Datenbank und Workspace erfolgreich zurückgesetzt.',
      stats: result.stats,
    });
  } catch (err) {
    res.status(500).json({ error: `Reset fehlgeschlagen: ${err.message}` });
  }
};

/**
 * POST /api/reset/validate
 * Prüft nur ob das Service-Passwort korrekt ist (ohne Reset).
 */
exports.validatePassword = (req, res) => {
  try {
    const { password } = req.body;
    const valid = resetService.validatePassword(password);
    res.json({ valid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
