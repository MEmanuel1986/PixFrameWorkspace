'use strict';
/**
 * electron/main.js - PixFrame Workspace Electron Main Process
 *
 * DEV-Modus (app.isPackaged === false):
 *   - Backend läuft extern via "node server.js" (eigener Prozess)
 *   - Frontend läuft extern via "vite dev" (eigener Prozess)
 *   - Electron öffnet nur ein BrowserWindow auf localhost:5173
 *   - Kein Native-Module-Konflikt (better-sqlite3 bleibt Node.js-kompiliert)
 *
 * PROD-Modus (gepackte App):
 *   - Express startet im Electron-Prozess
 *   - Vue-Build wird von Express ausgeliefert
 *   - better-sqlite3 muss für Electron kompiliert sein (electron-rebuild)
 */

const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Konfiguration ──────────────────────────────────────────────────────
const IS_DEV       = !app.isPackaged;
const BACKEND_PORT = 3001;
const VITE_DEV_URL = 'http://localhost:5173';

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
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// ── Workspace-Ordner auswählen ─────────────────────────────────────────
async function selectWorkspaceFolder(currentPath) {
  const result = await dialog.showOpenDialog({
    title: 'PixFrame Workspace-Ordner wählen',
    defaultPath: currentPath || app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Workspace hier anlegen',
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  return result.filePaths[0];
}

// ── Express-Server starten (NUR Produktion) ────────────────────────────
let expressServer = null;

function startExpressServer(workspacePath) {
  return new Promise((resolve, reject) => {
    try {
      process.env.PIXFRAME_WORKSPACE = workspacePath;
      process.env.PORT = String(BACKEND_PORT);
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = `http://localhost:${BACKEND_PORT}`;
      process.env.FRONTEND_URL = `http://localhost:${BACKEND_PORT}`;

      const backendDir = path.join(process.resourcesPath, 'backend');
      process.chdir(backendDir);

      const envFile = path.join(backendDir, '.env');
      if (fs.existsSync(envFile)) {
        require('dotenv').config({ path: envFile });
      }

      const server = require(path.join(backendDir, 'server.js'));
      expressServer = server;

      if (server && server.listening) {
        resolve(BACKEND_PORT);
      } else if (server && typeof server.on === 'function') {
        server.on('listening', () => resolve(BACKEND_PORT));
        server.on('error', reject);
      } else {
        resolve(BACKEND_PORT);
      }
    } catch (err) {
      reject(err);
    }
  });
}

// ── BrowserWindow ──────────────────────────────────────────────────────
let mainWindow = null;

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Externe Links im System-Browser öffnen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes('localhost')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // DevTools in Entwicklung
  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getIconPath() {
  const icons = {
    win32:  'icon.ico',
    darwin: 'icon.icns',
    linux:  'icon.png',
  };
  const iconName = icons[process.platform] || 'icon.png';
  const iconPath = path.join(__dirname, '..', 'assets', iconName);
  return fs.existsSync(iconPath) ? iconPath : undefined;
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

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('open-folder', (_, folderPath) => {
    shell.openPath(folderPath);
  });
}

// ── App Lifecycle ──────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    setupIPC();

    if (IS_DEV) {
      // ── DEV-Modus ──────────────────────────────────────────────
      // Backend + Frontend laufen extern (via concurrently).
      // Electron öffnet nur ein Fenster auf den Vite Dev Server.
      // Kein Express, kein better-sqlite3 im Electron-Prozess.
      console.log('🔧 Dev-Modus: Öffne Fenster auf', VITE_DEV_URL);
      createWindow(VITE_DEV_URL);

    } else {
      // ── PROD-Modus ─────────────────────────────────────────────
      // Workspace-Ordner ermitteln
      let config = loadWorkspaceConfig();
      let workspacePath = config?.workspacePath;

      if (!workspacePath || !fs.existsSync(workspacePath)) {
        workspacePath = await selectWorkspaceFolder();
        if (!workspacePath) {
          app.quit();
          return;
        }
        saveWorkspaceConfig({ workspacePath });
      }

      // Workspace-Unterordner sicherstellen
      const dirs = ['data', 'uploads', 'uploads/logo', 'backups', 'logs'];
      for (const dir of dirs) {
        const fullPath = path.join(workspacePath, dir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      }

      console.log(`📂 Workspace: ${workspacePath}`);

      // Express starten
      const port = await startExpressServer(workspacePath);
      console.log(`🚀 Express läuft auf Port ${port}`);

      createWindow(`http://localhost:${port}`);
    }

  } catch (err) {
    console.error('💥 Startfehler:', err);
    dialog.showErrorBox(
      'PixFrame - Startfehler',
      `Die App konnte nicht gestartet werden:\n\n${err.message}\n\nBitte prüfe den Workspace-Ordner und versuche es erneut.`
    );
    app.quit();
  }
});

// macOS: Fenster neu erstellen wenn Dock-Icon geklickt
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const url = IS_DEV ? VITE_DEV_URL : `http://localhost:${BACKEND_PORT}`;
    createWindow(url);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Graceful Shutdown (nur relevant in Prod)
app.on('before-quit', () => {
  if (!IS_DEV && expressServer) {
    console.log('🛑 App wird beendet ...');
    try {
      if (typeof expressServer.close === 'function') {
        expressServer.close();
      }
      const db = require(
        path.join(process.resourcesPath, 'backend', 'src', 'database', 'databaseService')
      );
      if (db && typeof db.close === 'function') {
        db.close();
      }
    } catch {}
  }
});