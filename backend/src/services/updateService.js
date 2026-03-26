'use strict';
/**
 * updateService.js
 * Anwendung von PixFrameWorkspace-Updates via ZIP-Archiv.
 *
 * Update-ZIP Struktur:
 *   update-manifest.json        ← Pflicht: Version, Beschreibung, Änderungen
 *   backend/src/**              ← Backend-Quellcode
 *   backend/server.js           ← Optional
 *   backend/package.json        ← Optional (löst npm install aus)
 *   frontend/src/**             ← Frontend-Quellcode
 *   frontend/index.html         ← Optional
 *   frontend/package.json       ← Optional (löst npm install aus)
 *   win/**, mac/**              ← Optionale Start-Skripte
 *
 * Geschützte Pfade (werden NIE überschrieben):
 *   backend/data/
 *   backend/uploads/
 *   backend/backups/
 *   backend/logs/
 *   backend/.env
 *   backend/node_modules/
 *   frontend/node_modules/
 *   frontend/dist/
 *
 * Ablauf:
 *   1. ZIP validieren (Manifest vorhanden?)
 *   2. Datensicherung (via backupService)
 *   3. ZIP in Temp entpacken
 *   4. Dateien kopieren (geschützte Pfade überspringen)
 *   5. npm install falls package.json geändert wurde
 *   6. Neustart triggern (Dateiänderungen → nodemon + exit(0) als Fallback)
 */

const path           = require('path');
const fs             = require('fs');
const os             = require('os');
const { execSync }   = require('child_process');       // nur für npm install
const { extractZip } = require('../utils/zipUtils');     // ZIP: plattformunabhängig
const paths          = require('../config/paths');
const backupService  = require('./backupService');

// ── Geschützte Pfade (relativ zum Projekt-Root) ────────────────────────────
const PROTECTED = [
  'backend/data',
  'backend/uploads',
  'backend/backups',
  'backend/logs',
  'backend/.env',
  'backend/node_modules',
  'frontend/node_modules',
  'frontend/dist',
];

// ── Hilfsfunktionen ────────────────────────────────────────────────────────

/**
 * Prüft ob ein Dateipfad (relativ zum Projekt-Root) geschützt ist.
 */
function isProtected(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return PROTECTED.some(p => normalized === p || normalized.startsWith(p + '/'));
}

/**
 * Kopiert alle Dateien aus srcDir nach destDir, überspringt geschützte Pfade.
 */
function applyFiles(srcDir, destDir) {
  const copied  = [];
  const skipped = [];

  function walk(dir, relBase) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      const srcPath  = path.join(dir, entry.name);
      const destPath = path.join(destDir, relPath);

      if (isProtected(relPath)) {
        skipped.push(relPath);
        continue;
      }

      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
        walk(srcPath, relPath);
      } else {
        const destParent = path.dirname(destPath);
        if (!fs.existsSync(destParent)) fs.mkdirSync(destParent, { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        copied.push(relPath);
      }
    }
  }

  walk(srcDir, '');
  return { copied, skipped };
}

/**
 * Führt npm install im angegebenen Verzeichnis aus (bei package.json-Änderungen).
 */
function npmInstall(dir) {
  console.log(`[update] npm install in ${dir}...`);
  execSync('npm install --loglevel=error', { cwd: dir, stdio: 'pipe' });
  console.log(`[update] npm install abgeschlossen`);
}

// ── Öffentliche API ────────────────────────────────────────────────────────

/**
 * Liest das Manifest aus einem Update-ZIP (ohne vollständiges Entpacken).
 * @param {string} zipPath
 * @returns {object} manifest
 */
async function readManifest(zipPath) {
  const tempDir = path.join(os.tmpdir(), `pixframe_manifest_${Date.now()}`);
  try {
    await extractZip(zipPath, tempDir);
    const manifestPath = path.join(tempDir, 'update-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Kein gültiges Update-Paket: update-manifest.json fehlt');
    }
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

/**
 * Wendet ein Update-ZIP an.
 *
 * @param {string} zipPath - Pfad zur Update-ZIP-Datei
 * @returns {Promise<{ manifest, copied, skipped, npmInstalled }>}
 */
async function applyUpdate(zipPath) {
  const ROOT_DIR   = paths.BACKEND_DIR.replace(/[\\/]backend$/, '');
  const extractDir = path.join(os.tmpdir(), `pixframe_update_${Date.now()}`);

  // 1. Entpacken
  console.log('[update] Entpacke Update-ZIP...');
  await extractZip(zipPath, extractDir);

  // 2. Manifest lesen + validieren
  const manifestPath = path.join(extractDir, 'update-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
    throw new Error('Kein gültiges Update-Paket: update-manifest.json fehlt');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`[update] Manifest gelesen: ${manifest.version} — ${manifest.title}`);

  // 3. Datensicherung
  console.log('[update] Erstelle Pre-Update-Backup...');
  await backupService.createBackup('pre-update');

  // 4. Dateien anwenden
  console.log('[update] Kopiere Update-Dateien...');
  const { copied, skipped } = applyFiles(extractDir, ROOT_DIR);
  console.log(`[update] ${copied.length} Dateien kopiert, ${skipped.length} übersprungen`);

  // 5. npm install falls package.json geändert
  const npmInstalled = [];
  const backendPkg   = path.join(ROOT_DIR, 'backend', 'package.json');
  const frontendPkg  = path.join(ROOT_DIR, 'frontend', 'package.json');

  if (copied.includes('backend/package.json') && fs.existsSync(backendPkg)) {
    npmInstall(path.join(ROOT_DIR, 'backend'));
    npmInstalled.push('backend');
  }
  if (copied.includes('frontend/package.json') && fs.existsSync(frontendPkg)) {
    npmInstall(path.join(ROOT_DIR, 'frontend'));
    npmInstalled.push('frontend');
  }

  // 6. Aufräumen
  try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch {}

  return { manifest, copied, skipped, npmInstalled };
}

module.exports = { readManifest, applyUpdate };
