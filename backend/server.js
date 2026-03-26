/**
 * server.js – PixFrame Workspace Backend v1.1.0
 *
 * Funktioniert sowohl standalone (node server.js) als auch
 * eingebettet in Electron (require('./server.js')).
 *
 * Reihenfolge:
 *   1. Workspace-Pfad setzen
 *   2. Datenbank initialisieren
 *   3. Optionale JSON → SQLite Migration
 *   4. Express-App starten
 *   5. In Produktion: Vue-Build ausliefern
 *   6. Graceful Shutdown
 */

const path   = require('path');
const fs     = require('fs');
const config = require('./src/config');
const paths  = require('./src/config/paths');

// ─── 1. Workspace-Pfad ──────────────────────────────────────────────────
// Electron setzt PIXFRAME_WORKSPACE vor dem require.
// Standalone: Default = aktuelles Verzeichnis
const WORKSPACE_PATH = process.env.PIXFRAME_WORKSPACE || path.resolve(__dirname);
console.log(`📂 Workspace: ${WORKSPACE_PATH}`);

// ─── 2. Datenbank initialisieren ────────────────────────────────────────
const databaseService = require('./src/database/databaseService');
databaseService.initialize(WORKSPACE_PATH);

// ─── 3. Einmalige JSON-Migration ───────────────────────────────────────
const oldDataDir = paths.DATA_DIR;
const oldCustomersJson = path.join(oldDataDir, 'customers.json');

if (fs.existsSync(oldCustomersJson)) {
  const count = databaseService.db.prepare('SELECT COUNT(*) as cnt FROM customers').get().cnt;

  if (count === 0) {
    console.log('🔄 Alte JSON-Daten gefunden – starte einmalige Migration ...');
    const { migrateFromJson } = require('./src/database/migrateFromJson');
    const result = migrateFromJson(databaseService.db, oldDataDir);

    if (result.success) {
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
const app           = require('./src/app');
const backupService = require('./src/services/backupService');

// ─── 5. In Produktion: Vue-Build ausliefern ─────────────────────────────
// Wenn frontend/dist/ existiert, liefert Express das SPA aus.
// In Entwicklung (Vite Dev Server) wird dieser Block übersprungen.
const frontendDist = path.join(paths.ROOT_DIR, 'frontend', 'dist');
if (fs.existsSync(frontendDist) && fs.existsSync(path.join(frontendDist, 'index.html'))) {
  const express = require('express');

  // Statische Assets
  app.use(express.static(frontendDist, { index: false }));

  // SPA Fallback: Alle nicht-API Routen → index.html
  app.get('*', (req, res, next) => {
    // API-Routen und Uploads nicht abfangen
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });

  console.log('🖥️  Vue-Build wird ausgeliefert aus:', frontendDist);
}

const PORT = process.env.PORT || config.PORT;

const server = app.listen(PORT, () => {
  console.log(`
================================================
  PixFrameWorkspace Backend läuft
  http://localhost:${PORT}
  🗄️  DB: ${databaseService.filePath}
================================================
  `);

  backupService.createAutoBackup().then(() => {
    console.log('  Auto-Backup erstellt.');
  }).catch(() => {});
});

// ─── 6. Graceful Shutdown ───────────────────────────────────────────────
// Funktioniert sowohl standalone (SIGTERM/SIGINT) als auch in Electron
// (Electron ruft process.exit auf, was die 'exit' Handler triggert)
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
