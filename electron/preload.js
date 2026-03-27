'use strict';
/**
 * electron/preload.js - IPC Bridge fuer PixFrame Workspace
 *
 * Stellt sichere API-Methoden im Renderer-Prozess bereit
 * via window.pixframe (contextIsolation: true).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pixframe', {
  // Workspace
  getWorkspacePath: () => ipcRenderer.invoke('get-workspace-path'),
  changeWorkspace:  () => ipcRenderer.invoke('change-workspace'),

  // App-Info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isElectron:    true,

  // Native Funktionen
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // PDF-Generierung
  // apiPath: z.B. '/api/pdf/document/abc123'
  // options: { docLabel?, docType? }
  // Returns: ArrayBuffer (PDF)
  generatePDF: (apiPath, options) => ipcRenderer.invoke('generate-pdf', apiPath, options),
});
