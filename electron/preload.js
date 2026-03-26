'use strict';
/**
 * electron/preload.js - IPC Bridge für PixFrame Workspace
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
});
