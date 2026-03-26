/**
 * server.js – PixFrame Workspace Backend
 *
 * GEÄNDERT: SQLite-Initialisierung VOR dem App-Import.
 * Reihenfolge ist entscheidend:
 *   1. Workspace-Pfad setzen
 *   2. Datenbank initialisieren
 *   3. Optionale JSON → SQLite Migration
 *   4. Express-App starten (importiert Services die DB brauchen)
 *   5. Graceful Shutdown
 */

const path   = require('path');
const fs     = require('fs');
const config = require('./src/config');
const paths  = require('./src/config/paths');

// ─── 1. Workspace-Pfad ──────────────────────────────────────────────────
const WORKSPACE_PATH = process.env.PIXFRAME_WORKSPACE || path.resolve(__dirname);
console.log(`📂 Workspace: ${WORKSPACE_PATH}`);

// ─── 2. Datenbank initialisieren ────────────────────────────────────────
const databaseService = require('./src/database/databaseService');
databaseService.initialize(WORKSPACE_PATH);

// ─── 3. Einmalige JSON-Migration ───────────────────────────────────────
// Prüft ob alte JSON-Daten vorhanden UND die DB noch leer ist.
// Läuft nur EINMAL beim allerersten Start nach dem Update.
const oldDataDir = paths.DATA_DIR;
const oldCustomersJson = path.join(oldDataDir, 'customers.json');

if (fs.existsSync(oldCustomersJson)) {
  const count = databaseService.db.prepare('SELECT COUNT(*) as cnt FROM customers').get().cnt;

  if (count === 0) {
    console.log('🔄 Alte JSON-Daten gefunden – starte einmalige Migration ...');
    const { migrateFromJson } = require('./src/database/migrateFromJson');
    const result = migrateFromJson(databaseService.db, oldDataDir);

    if (result.success) {
      // JSON-Dateien archivieren (nicht löschen!)
      const archiveDir = path.join(oldDataDir, '_migrated_json');
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

      const jsonFiles = ['customers.json', 'projects.json', 'documents.json',
        'articles.json', 'suppliers.json', 'fibu.json', 'counters.json', 'settings.json'];

      for (const file of jsonFiles) {
        const src = path.join(oldDataDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(archiveDir, file));
          fs.unlinkSync(src);
        }
      }

      // Holiday-Cache auch archivieren
      const holidayDir = path.join(oldDataDir, 'holiday_cache');
      if (fs.existsSync(holidayDir)) {
        const archiveHoliday = path.join(archiveDir, 'holiday_cache');
        if (!fs.existsSync(archiveHoliday)) fs.mkdirSync(archiveHoliday, { recursive: true });
        for (const f of fs.readdirSync(holidayDir)) {
          fs.copyFileSync(path.join(holidayDir, f), path.join(archiveHoliday, f));
        }
        fs.rmSync(holidayDir, { recursive: true, force: true });
      }

      console.log('✅ JSON-Dateien nach /data/_migrated_json/ archiviert.');
    }
  }
}

// ─── 4. Express-App starten ─────────────────────────────────────────────
// WICHTIG: Erst NACH der DB-Initialisierung importieren!
// Die Services greifen beim Import auf die DB zu.
const app           = require('./src/app');
const backupService = require('./src/services/backupService');

const PORT = process.env.PORT || config.PORT;

const server = app.listen(PORT, () => {
  console.log(`
================================================
  PixFrameWorkspace Backend läuft
  http://localhost:${PORT}
  🗄️  DB: ${databaseService.filePath}
================================================
  `);

  // Auto-Backup (im Hintergrund)
  backupService.createAutoBackup().then(() => {
    console.log('  Auto-Backup erstellt.');
  }).catch(() => {});
});

// ─── 5. Graceful Shutdown ───────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n🛑 ${signal} empfangen – fahre herunter ...`);
  server.close(() => {
    console.log('   HTTP-Server gestoppt');
    databaseService.close();
    console.log('   Datenbank geschlossen');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️  Erzwinge Shutdown nach 10s');
    databaseService.close();
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  databaseService.close();
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});

module.exports = server;
