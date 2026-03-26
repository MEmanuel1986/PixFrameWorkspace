'use strict';
/**
 * emailService.js
 * Business-Logik für den E-Mail-Versand.
 * Der Controller ist nur noch HTTP-Adapter — Logik lebt hier.
 */

const path = require('path');
const fs   = require('fs');

const paths = require('../config/paths');
const SETTINGS_PATH = paths.SETTINGS_FILE;

function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')); }
  catch { return {}; }
}

function buildTransporter(cfg) {
  let nodemailer;
  try { nodemailer = require('nodemailer'); }
  catch {
    throw new Error(
      'nodemailer ist nicht installiert. Bitte "npm install" im Backend-Ordner ausführen.'
    );
  }
  if (!cfg?.host) throw new Error('SMTP-Host nicht konfiguriert.');
  if (!cfg?.user) throw new Error('SMTP-Benutzer nicht konfiguriert.');
  if (!cfg?.pass) throw new Error('SMTP-Passwort nicht konfiguriert.');

  return nodemailer.createTransporter({
    host:   cfg.host,
    port:   cfg.port || 587,
    secure: cfg.secure || false,
    auth:   { user: cfg.user, pass: cfg.pass },
    tls:    { rejectUnauthorized: false },
  });
}

/**
 * Sendet eine E-Mail mit optionalem PDF-Anhang.
 * @param {{ to, subject, body, pdfBase64?, pdfFilename?, replyTo? }} opts
 */
async function sendEmail({ to, subject, body, pdfBase64, pdfFilename, replyTo }) {
  if (!to)      throw new Error('Empfänger (to) fehlt');
  if (!subject) throw new Error('Betreff (subject) fehlt');
  if (!body)    throw new Error('Nachrichtentext (body) fehlt');

  const settings   = readSettings();
  const cfg        = settings.emailConfig || {};
  const company    = settings.company || {};
  const transporter = buildTransporter(cfg);

  const fromName = cfg.fromName || company.name || 'PixFrameWorkspace';
  const fromAddr = cfg.fromEmail || cfg.user;

  const mailOptions = {
    from:    `"${fromName}" <${fromAddr}>`,
    to,
    replyTo: replyTo || fromAddr,
    subject,
    text:    body,
    html:    `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111">${body.replace(/\n/g,'<br>')}</div>`,
  };

  if (pdfBase64) {
    const safeFilename = (pdfFilename || 'Dokument.pdf')
      .replace(/[^a-z0-9äöüÄÖÜß_\-\.]/gi, '_');
    mailOptions.attachments = [{
      filename:    safeFilename,
      content:     Buffer.from(pdfBase64, 'base64'),
      contentType: 'application/pdf',
    }];
  }

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId };
}

/**
 * Sendet eine Test-Mail an die eigene Adresse.
 */
async function sendTestEmail() {
  const settings  = readSettings();
  const cfg       = settings.emailConfig || {};
  const company   = settings.company || {};
  const transporter = buildTransporter(cfg);

  const fromAddr = cfg.fromEmail || cfg.user;
  const fromName = cfg.fromName  || company.name || 'PixFrameWorkspace';

  await transporter.sendMail({
    from:    `"${fromName}" <${fromAddr}>`,
    to:      fromAddr,
    subject: `[PixFrameWorkspace] Test-Mail · ${new Date().toLocaleString('de-DE')}`,
    text:    `Die E-Mail-Konfiguration funktioniert.\n\nVon: ${fromAddr}\nHost: ${cfg.host}:${cfg.port || 587}`,
  });

  return { message: `Test-Mail an ${fromAddr} gesendet.` };
}

/**
 * Gibt die SMTP-Konfiguration ohne Passwort zurück.
 */
function getConfig() {
  const settings = readSettings();
  const cfg = { ...(settings.emailConfig || {}) };
  delete cfg.pass;
  return cfg;
}

module.exports = { sendEmail, sendTestEmail, getConfig };
