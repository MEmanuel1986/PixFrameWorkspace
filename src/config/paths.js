/**
 * paths.js – Zentrale Pfad-Abstraktion für PixFrameWorkspace.
 *
 * GEÄNDERT: DB_FILE hinzugefügt, WORKSPACE_DIR für Electron-Kompatibilität.
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── Verzeichnis-Wurzeln ────────────────────────────────────────────────────
const BACKEND_DIR  = path.resolve(__dirname, '../..');
const ROOT_DIR     = path.resolve(BACKEND_DIR, '..');

// Workspace-Pfad: Vom Electron-Main-Process gesetzt, oder Fallback
const WORKSPACE_DIR = process.env.PIXFRAME_WORKSPACE || BACKEND_DIR;

const DATA_DIR     = path.join(WORKSPACE_DIR, 'data');
const UPLOADS_DIR  = path.join(WORKSPACE_DIR, 'uploads');
const BACKUPS_DIR  = path.join(WORKSPACE_DIR, 'backups');
const LOGS_DIR     = path.join(WORKSPACE_DIR, 'logs');

// ── Upload-Unterordner ─────────────────────────────────────────────────────
const LOGO_DIR      = path.join(UPLOADS_DIR, 'logo');
const RECEIPTS_DIR  = path.join(UPLOADS_DIR, 'receipts');
const CONTRACTS_DIR = path.join(UPLOADS_DIR, 'contracts');

// ── Datenbank ──────────────────────────────────────────────────────────────
const DB_FILE = path.join(DATA_DIR, 'pixframe.sqlite');

// ── Legacy (wird nur noch für Migration gebraucht) ─────────────────────────
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// ── Temp-Verzeichnis ───────────────────────────────────────────────────────
const TEMP_DIR = os.tmpdir();

// ── Verzeichnisse sicherstellen ────────────────────────────────────────────
[DATA_DIR, UPLOADS_DIR, BACKUPS_DIR, LOGS_DIR, LOGO_DIR, RECEIPTS_DIR, CONTRACTS_DIR]
  .forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

module.exports = {
  BACKEND_DIR,
  ROOT_DIR,
  WORKSPACE_DIR,
  DATA_DIR,
  UPLOADS_DIR,
  BACKUPS_DIR,
  LOGS_DIR,
  LOGO_DIR,
  RECEIPTS_DIR,
  CONTRACTS_DIR,
  DB_FILE,
  SETTINGS_FILE,
  TEMP_DIR,
};
