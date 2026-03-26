'use strict';
/**
 * emailController.js — HTTP-Adapter, keine Business-Logik.
 * Alle Logik lebt in services/emailService.js.
 */

const emailService = require('../services/emailService');

class EmailController {

  async sendEmail(req, res) {
    try {
      const result = await emailService.sendEmail(req.body || {});
      res.json({ success: true, ...result });
    } catch (e) {
      console.error('[email] Send error:', e.message);
      res.status(e.message.includes('fehlt') ? 400 : 500).json({ error: e.message });
    }
  }

  async testEmail(req, res) {
    try {
      const result = await emailService.sendTestEmail();
      res.json({ success: true, ...result });
    } catch (e) {
      console.error('[email] Test error:', e.message);
      res.status(500).json({ error: e.message });
    }
  }

  getConfig(req, res) {
    try {
      res.json({ data: emailService.getConfig() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = new EmailController();
