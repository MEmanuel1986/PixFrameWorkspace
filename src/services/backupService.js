'use strict';
/**
 * backupService.js – SQLite-aware Backup & Restore
 *
 * Änderungen gegenüber der alten Version:
 *  - Backup enthält jetzt pixframe.sqlite statt JSON-Dateien
 *  - SQLite-Backup via .backup() API (konsistenter Snapshot, kein WAL-Lock)
 *  - Restore schließt DB, ersetzt Datei, öffnet DB neu
 *  - Uploads (Logo, Belege, Verträge) werden weiterhin einbezogen
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');
const paths = require('../config/paths');
const { createZip, extractZip } = require('../utils/zipUtils');

const MAX_BACKUPS = 10;

// ── Hilfsfunktionen ────────────────────────────────────────────────────────

function timestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`
       + `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function backupFilename(label = '') {
  const sfx = label ? `_${label}` : '';
  return `pixframe-backup-${timestamp()}${sfx}.zip`;
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function removeDirSafe(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── Staging-Verzeichnis bauen ──────────────────────────────────────────────

function buildStagingDir() {
  const databaseService = require('../database/databaseService');
  const stagingDir = path.join(os.tmpdir(), `pixframe_backup_${Date.now()}`);
  fs.mkdirSync(stagingDir, { recursive: true });

  // 1. SQLite-Datenbank sicher kopieren (WAL-Checkpoint + Copy)
  const dataStaging = path.join(stagingDir, 'data');
  fs.mkdirSync(dataStaging);

  const dbPath = databaseService.filePath;
  if (dbPath && fs.existsSync(dbPath)) {
    // VACUUM INTO erstellt eine konsistente Kopie ohne WAL-Abhängigkeit
    const backupDbPath = path.join(dataStaging, 'pixframe.sqlite');
    try {
      databaseService.db.exec(`VACUUM INTO '${backupDbPath.replace(/'/g, "''")}'`);
    } catch {
      // Fallback: WAL-Checkpoint + einfache Kopie
      try { databaseService.db.pragma('wal_checkpoint(TRUNCATE)'); } catch {}
      fs.copyFileSync(dbPath, backupDbPath);
    }
  }

  // 2. Uploads (Logo, Belege, Verträge)
  const uploadsStaging = path.join(stagingDir, 'uploads');
  for (const sub of ['logo', 'receipts', 'contracts', 'contract-template', 'customer-photos']) {
    const srcSub = path.join(paths.UPLOADS_DIR, sub);
    if (fs.existsSync(srcSub)) {
      copyDirRecursive(srcSub, path.join(uploadsStaging, sub));
    }
  }

  // 3. Manifest
  const manifest = {
    version:    '2',                            // v2 = SQLite-basiert
    format:     'sqlite',
    createdAt:  new Date().toISOString(),
    platform:   os.platform(),
    files: {
      data:    fs.existsSync(dataStaging) ? fs.readdirSync(dataStaging) : [],
      uploads: fs.existsSync(uploadsStaging) ? fs.readdirSync(uploadsStaging) : [],
    },
  };
  fs.writeFileSync(
    path.join(stagingDir, 'pixframe-manifest.json'),
    JSON.stringify(manifest, null, 2), 'utf-8'
  );

  return stagingDir;
}

function pruneOldBackups() {
  if (!fs.existsSync(paths.BACKUPS_DIR)) return;
  const files = fs.readdirSync(paths.BACKUPS_DIR)
    .filter(f => f.startsWith('pixframe-backup-') && f.endsWith('.zip'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(paths.BACKUPS_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const old of files.slice(MAX_BACKUPS)) {
    try { fs.unlinkSync(path.join(paths.BACKUPS_DIR, old.name)); }
    catch (e) { console.warn(`[backup] Konnte ${old.name} nicht löschen:`, e.message); }
  }
}

// ── Öffentliche API ────────────────────────────────────────────────────────

async function createBackup(label = '') {
  if (!fs.existsSync(paths.BACKUPS_DIR)) fs.mkdirSync(paths.BACKUPS_DIR, { recursive: true });

  const filename   = backupFilename(label);
  const outputPath = path.join(paths.BACKUPS_DIR, filename);
  const stagingDir = buildStagingDir();

  try {
    await createZip(stagingDir, outputPath);
  } finally {
    removeDirSafe(stagingDir);
  }

  pruneOldBackups();
  const size = fs.statSync(outputPath).size;
  console.log(`[backup] Backup erstellt: ${filename} (${Math.round(size / 1024)} KB)`);
  return { filename, path: outputPath, size };
}

async function createAutoBackup() {
  try { await createBackup('auto'); }
  catch (err) { console.warn('[backup] Auto-Backup fehlgeschlagen:', err.message); }
}

function listBackups() {
  if (!fs.existsSync(paths.BACKUPS_DIR)) return [];
  return fs.readdirSync(paths.BACKUPS_DIR)
    .filter(f => f.startsWith('pixframe-backup-') && f.endsWith('.zip'))
    .map(f => {
      const stat = fs.statSync(path.join(paths.BACKUPS_DIR, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function deleteBackup(filename) {
  if (!filename.startsWith('pixframe-backup-') || !filename.endsWith('.zip')) {
    throw new Error('Ungültiger Dateiname');
  }
  const filePath = path.join(paths.BACKUPS_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error('Backup nicht gefunden');
  fs.unlinkSync(filePath);
}

/**
 * Restore – unterstützt sowohl v1 (JSON) als auch v2 (SQLite) Backups.
 */
async function restoreBackup(filename) {
  if (!filename.startsWith('pixframe-backup-') || !filename.endsWith('.zip')) {
    throw new Error('Ungültiger Dateiname');
  }

  const zipPath = path.join(paths.BACKUPS_DIR, filename);
  if (!fs.existsSync(zipPath)) throw new Error('Backup-Datei nicht gefunden');

  // 1. Pre-Restore-Sicherung
  console.log('[backup] Erstelle Pre-Restore-Backup...');
  await createBackup('pre-restore');

  // 2. Entpacken
  const extractDir = path.join(os.tmpdir(), `pixframe_restore_${Date.now()}`);
  try {
    await extractZip(zipPath, extractDir);

    // 3. Manifest prüfen
    const manifestPath = path.join(extractDir, 'pixframe-manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error('Kein gültiges PixFrame-Backup (manifest fehlt)');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const databaseService = require('../database/databaseService');

    if (manifest.format === 'sqlite' || manifest.version === '2') {
      // ── v2: SQLite-Restore ──────────────────────────────────────
      const backupDb = path.join(extractDir, 'data', 'pixframe.sqlite');
      if (!fs.existsSync(backupDb)) throw new Error('SQLite-Datei im Backup nicht gefunden');

      const dbPath = databaseService.filePath;
      // DB schließen, ersetzen, neu öffnen
      databaseService.close();
      fs.copyFileSync(backupDb, dbPath);
      // WAL- und SHM-Dateien entfernen (gehören zur alten DB-Session)
      for (const ext of ['-wal', '-shm']) {
        const f = dbPath + ext;
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      // DB neu initialisieren (WORKSPACE_PATH aus dem DB-Pfad ableiten)
      const workspacePath = path.resolve(path.dirname(dbPath), '..');
      databaseService.initialize(workspacePath);
      console.log('[backup] SQLite-Datenbank wiederhergestellt');

    } else {
      // ── v1: Legacy JSON-Restore + Import ────────────────────────
      const dataDir = path.join(extractDir, 'data');
      if (fs.existsSync(dataDir)) {
        // JSON-Dateien temporär nach data/ kopieren und Migration starten
        const tempJsonDir = path.join(os.tmpdir(), `pixframe_json_import_${Date.now()}`);
        fs.mkdirSync(tempJsonDir, { recursive: true });
        for (const file of fs.readdirSync(dataDir)) {
          if (file.endsWith('.json')) {
            fs.copyFileSync(path.join(dataDir, file), path.join(tempJsonDir, file));
          }
        }
        // Alle Daten in DB löschen und neu importieren
        const { migrateFromJson } = require('../database/migrateFromJson');
        // Tabellen leeren
        databaseService.db.exec(`
          DELETE FROM document_line_items;
          DELETE FROM documents;
          DELETE FROM project_shooting_dates;
          DELETE FROM project_locations;
          DELETE FROM project_team;
          DELETE FROM projects;
          DELETE FROM customers;
          DELETE FROM suppliers;
          DELETE FROM articles;
          DELETE FROM expenses;
          DELETE FROM mileage;
          DELETE FROM external_invoices;
          DELETE FROM counters;
          DELETE FROM settings;
          DELETE FROM holiday_cache;
        `);
        migrateFromJson(databaseService.db, tempJsonDir);
        removeDirSafe(tempJsonDir);
        console.log('[backup] Legacy-JSON-Daten importiert');
      }
    }

    // 4. Uploads zurückspielen (identisch für v1 und v2)
    const uploadsDir = path.join(extractDir, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      copyDirRecursive(uploadsDir, paths.UPLOADS_DIR);
      console.log('[backup] Uploads wiederhergestellt');
    }

    console.log(`[backup] Restore abgeschlossen: ${filename}`);
    return { success: true, filename };

  } finally {
    removeDirSafe(extractDir);
  }
}

async function restoreFromUpload(tempFilePath) {
  if (!fs.existsSync(tempFilePath)) throw new Error('Upload-Datei nicht gefunden');
  const filename = `pixframe-backup-${timestamp()}_uploaded.zip`;
  const destPath = path.join(paths.BACKUPS_DIR, filename);
  fs.copyFileSync(tempFilePath, destPath);
  return restoreBackup(filename);
}

module.exports = {
  createBackup,
  createAutoBackup,
  listBackups,
  deleteBackup,
  restoreBackup,
  restoreFromUpload,
};
