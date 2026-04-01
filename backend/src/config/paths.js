/**
 * paths.js — Zentrale Pfad-Abstraktion für PixFrameWorkspace v1.1.0
 *
 * WORKSPACE-AWARE:
 *   Wenn PIXFRAME_WORKSPACE gesetzt ist (z.B. durch Electron),
 *   liegen alle Daten dort. Sonst Default: backend/
 *
 * Code-Pfade (BACKEND_DIR, ROOT_DIR) bleiben immer relativ zum Code,
 * auch innerhalb eines Electron ASAR-Archivs.
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── Code-Verzeichnisse (read-only, evtl. im ASAR) ─────────────────────
const BACKEND_DIR = path.resolve(__dirname, '../..');   // backend/
const ROOT_DIR    = path.resolve(BACKEND_DIR, '..');    // Projekt-Root

// ── Workspace-Verzeichnis (read-write, IMMER auf Dateisystem) ──────────
// Electron setzt PIXFRAME_WORKSPACE BEVOR server.js geladen wird.
// Standalone: Default = backend/ (bisheriges Verhalten)
const WORKSPACE_DIR = process.env.PIXFRAME_WORKSPACE || BACKEND_DIR;

// ── Daten-Verzeichnisse (im Workspace) ─────────────────────────────────
const DATA_DIR     = path.join(WORKSPACE_DIR, 'data');
const UPLOADS_DIR  = path.join(WORKSPACE_DIR, 'uploads');
const BACKUPS_DIR  = path.join(WORKSPACE_DIR, 'backups');
const LOGS_DIR     = path.join(WORKSPACE_DIR, 'logs');

// ── Upload-Unterordner ─────────────────────────────────────────────────
const LOGO_DIR      = path.join(UPLOADS_DIR, 'logo');
const RECEIPTS_DIR  = path.join(UPLOADS_DIR, 'receipts');
const CONTRACTS_DIR = path.join(UPLOADS_DIR, 'contracts');

// ── Temp-Verzeichnis ───────────────────────────────────────────────────
const TEMP_DIR = os.tmpdir();

// ── Verzeichnisse sicherstellen ────────────────────────────────────────
[DATA_DIR, UPLOADS_DIR, BACKUPS_DIR, LOGS_DIR, LOGO_DIR, RECEIPTS_DIR, CONTRACTS_DIR]
  .forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

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
  TEMP_DIR,
};
