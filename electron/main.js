'use strict';
/**
 * electron/main.js - PixFrame Workspace Electron Main Process v1.1.0
 *
 * PDF-Generierung:
 *   Electron's printToPDF hat KEINE headerTemplate/footerTemplate.
 *   Stattdessen: Die Vue-Print-Views rendern Kopf-/Fusszeile selbst
 *   (position:fixed CSS → erscheint auf jeder Seite).
 *   Electron setzt nur die Seitenraender.
 */

const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

const IS_DEV       = !app.isPackaged;
const BACKEND_PORT = 3001;
const VITE_DEV_URL = 'http://localhost:5173';
const BACKEND_URL  = `http://localhost:${BACKEND_PORT}`;

// ── Workspace-Konfiguration ────────────────────────────────────────────
const CONFIG_DIR  = app.getPath('userData');
const CONFIG_FILE = path.join(CONFIG_DIR, 'workspace-config.json');

function loadWorkspaceConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveWorkspaceConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

  // .workspace Datei im Projekt-Root schreiben (fuer Backend in Dev-Mode)
  if (config.workspacePath) {
    const projectRoot = path.join(__dirname, '..');
    const wsFile = path.join(projectRoot, '.workspace');
    try { fs.writeFileSync(wsFile, config.workspacePath, 'utf-8'); }
    catch (e) { console.warn('[Config] .workspace schreiben fehlgeschlagen:', e.message); }
  }
}

async function selectWorkspaceFolder(currentPath) {
  const result = await dialog.showOpenDialog({
    title: 'PixFrame Workspace-Ordner waehlen',
    defaultPath: currentPath || app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Workspace hier anlegen',
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
}

// ── Express-Server (NUR Produktion) ────────────────────────────────────
let expressServer = null;

function startExpressServer(workspacePath) {
  return new Promise((resolve, reject) => {
    try {
      process.env.PIXFRAME_WORKSPACE = workspacePath;
      process.env.PORT = String(BACKEND_PORT);
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = BACKEND_URL;
      process.env.FRONTEND_URL = BACKEND_URL;

      const backendDir = path.join(process.resourcesPath, 'backend');
      process.chdir(backendDir);

      const envFile = path.join(backendDir, '.env');
      if (fs.existsSync(envFile)) require('dotenv').config({ path: envFile });

      const server = require(path.join(backendDir, 'server.js'));
      expressServer = server;
      if (server && server.listening) resolve(BACKEND_PORT);
      else if (server && typeof server.on === 'function') {
        server.on('listening', () => resolve(BACKEND_PORT));
        server.on('error', reject);
      } else resolve(BACKEND_PORT);
    } catch (err) { reject(err); }
  });
}

// ── BrowserWindow ──────────────────────────────────────────────────────
let mainWindow = null;

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1024, minHeight: 700,
    title: 'PixFrame Workspace',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadURL(url);
  mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.focus(); });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes('localhost')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    // Localhost-Fenster (Print-Views etc.) brauchen das Preload-Script
    // damit window.pixframe.generatePDF verfuegbar ist
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        }
      }
    };
  });

  if (IS_DEV) mainWindow.webContents.openDevTools({ mode: 'detach' });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function getIconPath() {
  const icons = { win32: 'icon.ico', darwin: 'icon.icns', linux: 'icon.png' };
  const iconName = icons[process.platform] || 'icon.png';
  const iconPath = path.join(__dirname, '..', 'assets', iconName);
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

// ═══════════════════════════════════════════════════════════════════════
// PDF-GENERIERUNG
// ═══════════════════════════════════════════════════════════════════════
//
// Electron's printToPDF unterstützt KEINE headerTemplate/footerTemplate.
// Stattdessen:
//   - Die Vue Print-Views rendern Kopf-/Fusszeile per HTML/CSS
//   - .print-page-footer { position:fixed; bottom:0 } → jede Seite
//   - .page-header-logo { position:fixed; top:0 } → jede Seite
//   - Electron setzt margins damit der Inhalt nicht mit Footer/Header kollidiert
//
// CSS das Electron injiziert:
//   - Versteckt UI-Elemente (Toolbar, Buttons)
//   - Setzt @page margin auf 0 (Electron margins uebernehmen)
//   - Setzt .a4 padding auf 0 (keine Doppel-Margins)
//   - Footer und Header bleiben SICHTBAR

const MM_TO_INCH = 1 / 25.4;

// CSS fuer PDF-Rendering (injiziert in die Print-Seite)
const PDF_INJECT_CSS = `
  /* UI-Elemente verstecken */
  .toolbar, .no-print, .print-hint, [data-no-print], .screen-footer {
    display: none !important;
  }

  /* Hintergrund weiss */
  html, body { background: white !important; margin: 0 !important; padding: 0 !important; }

  /* Page-Wrapper zuruecksetzen */
  .page-wrap { padding: 0 !important; margin: 0 !important; display: block !important; background: white !important; }

  /* A4-Container: BEHAELT sein Padding (= Seitenraender) */
  @page { margin: 0 !important; }
  .a4 {
    width: 100% !important;
    min-height: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    background: white !important;
    padding: 14mm 18mm 30mm 18mm !important;
  }

  .print-content {
    margin: 0 !important;
    box-shadow: none !important;
    width: 100% !important;
    background: white !important;
  }

  /* Footer + Header SICHTBAR (Vue rendert sie mit position:fixed) */
  .print-page-footer {
    display: block !important;
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    padding: 0 18mm 5mm 18mm !important;
    background: white !important;
  }
  .pf {
    display: block !important;
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    padding: 0 18mm 5mm 18mm !important;
    background: white !important;
  }
  .page-header-logo {
    display: block !important;
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    padding: 5mm 18mm 2mm !important;
    background: white !important;
  }

  /* Seitenzahlen via CSS Counter */
  .pp-cur::before { content: counter(page) !important; }
  .pp-tot::before { content: counter(pages) !important; }

  /* Tabellen-Seitenumbrueche */
  thead { display: table-header-group !important; }
  tfoot { display: table-footer-group !important; }
  tr { break-inside: avoid !important; }
  h1, h2, h3, h4, h5 { break-after: avoid !important; }
  p { orphans: 3; widows: 3; }

  .break-inside-avoid, .sig-block, .sig-grid, .party-block,
  .parties-grid, .payment-block, .totals-section, .totals-table,
  .infobox, .storno-table, .section {
    break-inside: avoid !important;
  }
  .doc-title-block, .sh-row { break-after: avoid !important; }
`;

function resolvePrintPath(apiPath) {
  // /api/pdf/document/abc → /print/document/abc
  return apiPath.replace(/^\/api\/pdf\//, '/print/');
}

async function generatePDF(apiPath) {
  const printPath = resolvePrintPath(apiPath);
  const baseUrl = IS_DEV ? VITE_DEV_URL : BACKEND_URL;

  console.log(`[PDF] Lade: ${baseUrl}${printPath}`);

  const win = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await win.loadURL(`${baseUrl}${printPath}`);

    // Vue-Rendering abwarten
    await new Promise(r => setTimeout(r, 1500));

    // Loading-State abwarten (max 10s)
    await win.webContents.executeJavaScript(`
      new Promise(resolve => {
        const check = () => {
          if (!document.querySelector('.state-screen')) return resolve();
          setTimeout(check, 200);
        };
        check();
        setTimeout(resolve, 10000);
      });
    `);

    // Print-CSS injizieren
    await win.webContents.insertCSS(PDF_INJECT_CSS);
    await new Promise(r => setTimeout(r, 200));

    // PDF generieren mit Electron's printToPDF
    // Margins auf 0 — die .a4-Klasse steuert Raender per CSS padding
    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        marginType: 'custom',
        top:    0,
        bottom: 0,
        left:   0,
        right:  0,
      },
    });

    console.log(`[PDF] Fertig: ${pdfBuffer.length} Bytes`);
    return Buffer.from(pdfBuffer);

  } finally {
    win.destroy();
  }
}

// ── PDF Auto-Save im Projektordner ─────────────────────────────────────
async function savePdfToProjectFolder(apiPath, pdfBuffer, filename) {
  try {
    const { net } = require('electron');
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    const response = await net.fetch(`${BACKEND_URL}/api/workspace/save-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiPath, filename, pdfBase64 }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.saved) {
        console.log(`[PDF] Auto-Save: ${result.path}`);
        return result.path;  // Absoluten Pfad zurueckgeben
      }
    }
    return null;
  } catch (e) {
    // Nicht kritisch — PDF wird trotzdem dem User zum Download gegeben
    console.warn('[PDF] Auto-Save fehlgeschlagen:', e.message);
    return null;
  }
}

// ── Workspace-Migration ────────────────────────────────────────────────
// Findet alle Verzeichnisse die PixFrame-Daten enthalten
function findDataSources(configuredPath) {
  const sources = [];

  // 1. Konfigurierter Workspace-Pfad (PixFrame-Data/)
  if (configuredPath && fs.existsSync(configuredPath)) {
    const hasContent = ['database', 'auftraege', 'uploads', 'backups', 'data']
      .some(d => fs.existsSync(path.join(configuredPath, d)));
    if (hasContent) {
      sources.push({ path: configuredPath, type: 'workspace' });
    }
  }

  // 2. Legacy: backend/data/ (alte Standalone-Installation)
  const legacyBackendData = path.join(app.getAppPath(), 'backend', 'data');
  if (fs.existsSync(legacyBackendData) &&
      fs.existsSync(path.join(legacyBackendData, 'pixframe.sqlite'))) {
    // Nur wenn nicht schon als workspace erfasst
    if (!sources.some(s => s.path === path.dirname(legacyBackendData))) {
      sources.push({ path: path.dirname(legacyBackendData), type: 'legacy-backend' });
    }
  }

  // 3. Default: PixFrame-Data/ neben Projekt-Root
  const defaultWs = path.join(app.getAppPath(), 'PixFrame-Data');
  if (fs.existsSync(defaultWs) && !sources.some(s => s.path === defaultWs)) {
    const hasContent = ['database', 'auftraege', 'uploads', 'backups']
      .some(d => fs.existsSync(path.join(defaultWs, d)));
    if (hasContent) {
      sources.push({ path: defaultWs, type: 'default' });
    }
  }

  return sources;
}

// Kopiert alle Daten von Quellverzeichnissen in den neuen Workspace
async function migrateWorkspaceData(sources, newPath) {
  // Zielordner sicherstellen
  const targetDirs = ['data', 'auftraege', 'uploads', 'uploads/logo',
                      'uploads/belege', 'uploads/contracts', 'backups', 'logs'];
  for (const d of targetDirs) {
    const full = path.join(newPath, d);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }

  for (const source of sources) {
    console.log(`[Migration] Quelle: ${source.path} (${source.type})`);

    if (source.type === 'legacy-backend') {
      // backend/data/pixframe.sqlite → newPath/data/
      const oldDb = path.join(source.path, 'data', 'pixframe.sqlite');
      const newDb = path.join(newPath, 'data', 'pixframe.sqlite');
      if (copySqliteDb(oldDb, newDb)) {
        console.log(`[Migration] DB kopiert: ${newDb}`);
      }
      // backend/uploads → uploads/
      copyDirRecursive(path.join(source.path, 'uploads'), path.join(newPath, 'uploads'));
      // backend/backups → backups/
      copyDirRecursive(path.join(source.path, 'backups'), path.join(newPath, 'backups'));
      // backend/logs → logs/
      copyDirRecursive(path.join(source.path, 'logs'), path.join(newPath, 'logs'));
    } else {
      // workspace/default → alles 1:1 kopieren
      const dirsToSync = ['data', 'database', 'auftraege', 'uploads', 'backups', 'logs'];
      // DB aus data/ oder database/ kopieren
      for (const dbDir of ['data', 'database']) {
        const oldDataDb = path.join(source.path, dbDir, 'pixframe.sqlite');
        if (fs.existsSync(oldDataDb)) {
          const newDb = path.join(newPath, 'data', 'pixframe.sqlite');
          if (copySqliteDb(oldDataDb, newDb)) {
            console.log(`[Migration] DB kopiert (aus ${dbDir}/): ${newDb}`);
          }
          break;
        }
      }
      for (const d of dirsToSync) {
        copyDirRecursive(path.join(source.path, d), path.join(newPath, d));
      }
    }
  }

  console.log(`[Migration] Abgeschlossen: ${newPath}`);
}

// Kopiert SQLite DB + WAL/SHM Dateien
function copySqliteDb(srcDb, destDb) {
  if (!fs.existsSync(srcDb)) return false;
  if (fs.existsSync(destDb)) return false;  // Nicht ueberschreiben

  fs.copyFileSync(srcDb, destDb);
  // WAL und SHM Dateien mitkopieren (falls vorhanden)
  for (const ext of ['-wal', '-shm']) {
    const src = srcDb + ext;
    if (fs.existsSync(src)) fs.copyFileSync(src, destDb + ext);
  }
  return true;
}

// Rekursive Verzeichniskopie (ueberspringt existierende Dateien)
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      // Nicht ueberschreiben wenn Ziel existiert
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

// ── IPC Handler ────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('get-workspace-path', () => {
    const config = loadWorkspaceConfig();
    return config ? config.workspacePath : null;
  });

  ipcMain.handle('change-workspace', async () => {
    const config = loadWorkspaceConfig();
    const oldPath = config?.workspacePath || null;
    const newPath = await selectWorkspaceFolder(oldPath);
    if (!newPath) return null;
    if (oldPath && newPath === oldPath) return oldPath;

    // Bestehende Daten suchen (alte Workspace-Quellen)
    const sourceDirs = findDataSources(oldPath);

    if (sourceDirs.length > 0) {
      // Nutzer fragen ob Daten verschoben werden sollen
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Daten verschieben', 'Nur Pfad aendern', 'Abbrechen'],
        defaultId: 0,
        cancelId: 2,
        title: 'Datenpfad aendern',
        message: 'Sollen die bestehenden Daten in den neuen Ordner verschoben werden?',
        detail: `Aktuell: ${sourceDirs.map(s => s.path).join(', ')}\nNeu: ${newPath}\n\nEmpfohlen: "Daten verschieben" — damit gehen keine Auftraege, PDFs oder die Datenbank verloren.`,
      });

      if (response === 2) return null;  // Abbrechen

      if (response === 0) {
        // Daten verschieben
        try {
          await migrateWorkspaceData(sourceDirs, newPath);
          console.log(`[Workspace] Daten verschoben nach: ${newPath}`);
        } catch (err) {
          dialog.showErrorBox('Migration fehlgeschlagen',
            `Die Daten konnten nicht verschoben werden:\n\n${err.message}\n\nDer alte Pfad bleibt aktiv.`);
          return null;
        }
      }
    }

    saveWorkspaceConfig({ workspacePath: newPath });

    if (IS_DEV) {
      // Dev-Mode: Gesamten Prozess beenden (concurrently startet alles neu)
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['OK'],
        title: 'Datenpfad geaendert',
        message: 'Der Datenpfad wurde geaendert.',
        detail: `Neuer Pfad: ${newPath}\n\nDie App wird jetzt beendet. Bitte starte sie mit "npm run dev" neu.`,
      });
      process.exit(0);
    } else {
      // Prod-Mode: App normal neu starten
      app.relaunch();
      app.exit(0);
    }
    return newPath;
  });

  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('open-folder', (_, folderPath) => shell.openPath(folderPath));

  // ── PDF-Generierung ──
  ipcMain.handle('generate-pdf', async (_event, apiPath, options) => {
    console.log(`[PDF] Generiere: ${apiPath}`);
    try {
      const buffer = await generatePDF(apiPath, options || {});

      // Auto-Save: PDF im Projektordner ablegen (fire-and-forget)
      savePdfToProjectFolder(apiPath, buffer, options?.filename || '')
        .catch(e => console.warn('[PDF] Auto-Save fehlgeschlagen:', e.message));

      return buffer;
    } catch (err) {
      console.error('[PDF] Fehler:', err.message);
      throw err;
    }
  });

  // ── PDF erzeugen → speichern → im System-Viewer oeffnen ──
  ipcMain.handle('generate-and-open-pdf', async (_event, apiPath, options) => {
    console.log(`[PDF] Erzeugen + Oeffnen: ${apiPath}`);
    try {
      const buffer = await generatePDF(apiPath, options || {});

      // Im Projektordner speichern (NICHT fire-and-forget, wir brauchen den Pfad)
      const savedPath = await savePdfToProjectFolder(apiPath, buffer, options?.filename || '');

      if (savedPath) {
        // Im Standard-PDF-Viewer oeffnen
        console.log(`[PDF] Oeffne: ${savedPath}`);
        shell.openPath(savedPath);
        return { savedPath, opened: true };
      }

      // Fallback: Kein Projektbezug — als temp-Datei speichern und oeffnen
      const tmpDir = require('os').tmpdir();
      const tmpName = (options?.filename || 'PixFrame_Dokument').replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df\-_ ]/g, '') + '.pdf';
      const tmpPath = path.join(tmpDir, tmpName);
      fs.writeFileSync(tmpPath, buffer);
      console.log(`[PDF] Oeffne (temp): ${tmpPath}`);
      shell.openPath(tmpPath);
      return { savedPath: tmpPath, opened: true };

    } catch (err) {
      console.error('[PDF] Erzeugen + Oeffnen Fehler:', err.message);
      throw err;
    }
  });
}

// ── App Lifecycle ──────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    setupIPC();

    if (IS_DEV) {
      console.log('Dev-Modus: Oeffne Fenster auf', VITE_DEV_URL);
      createWindow(VITE_DEV_URL);
    } else {
      let config = loadWorkspaceConfig();
      let workspacePath = config?.workspacePath;

      if (!workspacePath || !fs.existsSync(workspacePath)) {
        workspacePath = await selectWorkspaceFolder();
        if (!workspacePath) { app.quit(); return; }
        saveWorkspaceConfig({ workspacePath });
      }

      const dirs = ['data', 'uploads', 'uploads/logo', 'backups', 'logs'];
      for (const dir of dirs) {
        const fp = path.join(workspacePath, dir);
        if (!fs.existsSync(fp)) fs.mkdirSync(fp, { recursive: true });
      }

      console.log(`Workspace: ${workspacePath}`);
      const port = await startExpressServer(workspacePath);
      console.log(`Express laeuft auf Port ${port}`);
      createWindow(`http://localhost:${port}`);
    }
  } catch (err) {
    console.error('Startfehler:', err);
    dialog.showErrorBox('PixFrame - Startfehler',
      `Die App konnte nicht gestartet werden:\n\n${err.message}`);
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(IS_DEV ? VITE_DEV_URL : BACKEND_URL);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (!IS_DEV && expressServer) {
    try {
      if (typeof expressServer.close === 'function') expressServer.close();
      const db = require(path.join(process.resourcesPath, 'backend', 'src', 'database', 'databaseService'));
      if (db && typeof db.close === 'function') db.close();
    } catch {}
  }
});
