'use strict';
/**
 * paths.js — Zentrale Pfad-Abstraktion fuer PixFrameWorkspace v1.2.0
 *
 * WORKSPACE-AWARE:
 *   Wenn PIXFRAME_WORKSPACE gesetzt ist (z.B. durch Electron),
 *   liegen alle Daten dort. Sonst Default: PixFrame-Data/ neben backend/
 *
 * Ordnerstruktur:
 *   PixFrame-Data/
 *   ├── data/             ← SQLite-DB (pixframe.sqlite)
 *   ├── auftraege/        ← Projekte nach Kunde/Projekt
 *   │   └── K-00001/
 *   │       └── P-2026-03_00001/
 *   │           ├── dokumente/
 *   │           ├── medien/bilder/
 *   │           ├── medien/videos/
 *   │           ├── vertraege/
 *   │           └── korrespondenz/
 *   ├── buchhaltung/      ← FiBu-Belege, DATEV-Exporte
 *   │   └── belege/
 *   ├── uploads/          ← Logo, Kundenfotos
 *   ├── backups/
 *   └── logs/
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── Code-Verzeichnisse (read-only, evtl. im ASAR) ─────────────────────
const BACKEND_DIR = path.resolve(__dirname, '../..');
const ROOT_DIR    = path.resolve(BACKEND_DIR, '..');

// ── Workspace-Verzeichnis (read-write) ─────────────────────────────────
// Prioritaet:
//   1. PIXFRAME_WORKSPACE Umgebungsvariable (von Electron Prod-Mode gesetzt)
//   2. .workspace Datei im Projekt-Root (von Electron geschrieben)
//   3. Default: PixFrame-Data/ neben Projekt-Root
function resolveWorkspace() {
  // 1. Env-Variable (hoechste Prioritaet)
  if (process.env.PIXFRAME_WORKSPACE) return process.env.PIXFRAME_WORKSPACE;

  // 2. .workspace Datei im Projekt-Root
  const wsFile = path.join(ROOT_DIR, '.workspace');
  try {
    if (fs.existsSync(wsFile)) {
      const wsPath = fs.readFileSync(wsFile, 'utf-8').trim();
      if (wsPath && fs.existsSync(wsPath)) return wsPath;
    }
  } catch {}

  // 3. Default
  return path.join(ROOT_DIR, 'PixFrame-Data');
}

const WORKSPACE_DIR = resolveWorkspace();

// ── Hauptverzeichnisse ─────────────────────────────────────────────────
const DATA_DIR      = path.join(WORKSPACE_DIR, 'data');
const AUFTRAEGE_DIR = path.join(WORKSPACE_DIR, 'auftraege');
const UPLOADS_DIR   = path.join(WORKSPACE_DIR, 'uploads');
const BACKUPS_DIR   = path.join(WORKSPACE_DIR, 'backups');
const LOGS_DIR      = path.join(WORKSPACE_DIR, 'logs');
const BUCHHALTUNG_DIR       = path.join(WORKSPACE_DIR, 'buchhaltung');
const BUCHHALTUNG_BELEGE_DIR = path.join(BUCHHALTUNG_DIR, 'belege');

// ── Upload-Unterordner ─────────────────────────────────────────────────
const LOGO_DIR      = path.join(UPLOADS_DIR, 'logo');
const RECEIPTS_DIR  = path.join(UPLOADS_DIR, 'belege');
const CONTRACTS_DIR = path.join(UPLOADS_DIR, 'contracts');  // Legacy-Kompatibilitaet

// ── Temp-Verzeichnis ───────────────────────────────────────────────────
const TEMP_DIR = os.tmpdir();

// ── Basis-Verzeichnisse sicherstellen ──────────────────────────────────
[DATA_DIR, AUFTRAEGE_DIR, UPLOADS_DIR, BACKUPS_DIR, LOGS_DIR,
 LOGO_DIR, RECEIPTS_DIR, CONTRACTS_DIR,
 BUCHHALTUNG_DIR, BUCHHALTUNG_BELEGE_DIR]
  .forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

// ── Projekt-Ordner-Funktionen ──────────────────────────────────────────

/**
 * Gibt den Pfad zum Projektordner zurueck.
 * Schema: auftraege/K-00001/P-2026-03_00001/
 *
 * @param {string} customerNumber - z.B. 'K-00001'
 * @param {string} projectNumber  - z.B. 'P-2026-03/00001' (wird sanitized)
 * @returns {string} Absoluter Pfad
 */
function projectFolder(customerNumber, projectNumber) {
  const safeCustomer = sanitizeFolderName(customerNumber || 'unbekannt');
  const safeProject  = sanitizeFolderName(projectNumber  || 'kein-projekt');
  return path.join(AUFTRAEGE_DIR, safeCustomer, safeProject);
}

/**
 * Unterordner eines Projekts.
 */
function projectSubfolder(customerNumber, projectNumber, subfolder) {
  return path.join(projectFolder(customerNumber, projectNumber), subfolder);
}

/**
 * Erstellt die komplette Ordnerstruktur fuer ein Projekt.
 * @returns {string} Pfad zum Projektordner
 */
function ensureProjectFolders(customerNumber, projectNumber) {
  const base = projectFolder(customerNumber, projectNumber);
  const subs = [
    'dokumente',
    'medien',
    path.join('medien', 'bilder'),
    path.join('medien', 'videos'),
    'vertraege',
    'korrespondenz',
  ];
  for (const sub of subs) {
    const full = path.join(base, sub);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }
  return base;
}

/**
 * Sanitized einen String fuer Ordnernamen.
 * Ersetzt / \ : * ? " < > | und Leerzeichen durch _ oder -
 */
function sanitizeFolderName(name) {
  return String(name)
    .replace(/[\/\\:*?"<>|]/g, '_')  // Verbotene Zeichen
    .replace(/\s+/g, '_')            // Leerzeichen
    .replace(/__+/g, '_')            // Doppelte Unterstriche
    .replace(/^_|_$/g, '')           // Fuehrende/abschliessende _
    .slice(0, 100)                   // Max Laenge
    || 'unnamed';
}

module.exports = {
  // Verzeichnisse
  BACKEND_DIR,
  ROOT_DIR,
  WORKSPACE_DIR,
  DATA_DIR,
  AUFTRAEGE_DIR,
  UPLOADS_DIR,
  BACKUPS_DIR,
  LOGS_DIR,
  LOGO_DIR,
  RECEIPTS_DIR,
  CONTRACTS_DIR,
  BUCHHALTUNG_DIR,
  BUCHHALTUNG_BELEGE_DIR,
  TEMP_DIR,

  // Funktionen
  projectFolder,
  projectSubfolder,
  ensureProjectFolders,
  sanitizeFolderName,
};
