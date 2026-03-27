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
    return { action: 'allow' };
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
  .toolbar, .no-print, .print-hint, [data-no-print] {
    display: none !important;
  }

  /* Electron-Margins uebernehmen - kein doppeltes Margin/Padding */
  @page { margin: 0 !important; }
  .a4 { padding: 0 !important; }
  .page-wrap { padding: 0 !important; margin: 0 !important; }
  .print-content { padding: 0 !important; margin: 0 !important; }

  /* Footer + Header SICHTBAR lassen (Vue rendert sie) */
  .print-page-footer { display: block !important; }
  .pf { display: block !important; }
  .page-header-logo { display: block !important; }
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
    // Margins in Zoll (inches) — Electron API erwartet inches
    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        marginType: 'custom',
        top:    14 * MM_TO_INCH,     // 14mm oben
        bottom: 28 * MM_TO_INCH,     // 28mm unten (Platz fuer Footer)
        left:   18 * MM_TO_INCH,     // 18mm links
        right:  18 * MM_TO_INCH,     // 18mm rechts
      },
    });

    console.log(`[PDF] Fertig: ${pdfBuffer.length} Bytes`);
    return Buffer.from(pdfBuffer);

  } finally {
    win.destroy();
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
    const newPath = await selectWorkspaceFolder(config?.workspacePath);
    if (newPath) {
      saveWorkspaceConfig({ workspacePath: newPath });
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
      return buffer;
    } catch (err) {
      console.error('[PDF] Fehler:', err.message);
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
