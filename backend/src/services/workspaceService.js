'use strict';
/**
 * workspaceService.js — Projekt-Ordner- und Dateiverwaltung
 *
 * Verantwortlich fuer:
 *   - Erstellen der Ordnerstruktur pro Projekt
 *   - Ablage von PDFs im Projektordner (dokumente/ oder vertraege/)
 *   - Ablage von Vertraegen (vertraege/)
 *   - Pfad-Lookup fuer Medien-Import (Vorbereitung)
 *
 * Ordnerstruktur:
 *   auftraege/K-00001/P-2026-03_00001/
 *     ├── dokumente/        ← Generierte PDFs (Angebote, Rechnungen)
 *     ├── medien/bilder/    ← Fotos (Medien-Import, spaeter)
 *     ├── medien/videos/    ← Videos (spaeter)
 *     ├── vertraege/        ← Vertraege, ADV, DSGVO, AGB, Nachtraege
 *     └── korrespondenz/    ← E-Mails, Anhaenge
 */

const path   = require('path');
const fs     = require('fs');
const paths  = require('../config/paths');
const logger = require('../utils/logger');

/**
 * Erstellt die Ordnerstruktur fuer ein Projekt und gibt den Pfad zurueck.
 * Wird beim Erstellen eines Projekts automatisch aufgerufen.
 *
 * @param {string} customerNumber - z.B. 'K-00001'
 * @param {string} projectId      - z.B. 'projects_47750842' (wird als Ordnername genutzt wenn keine projectNumber)
 * @param {string} projectName    - z.B. 'Hochzeit Mueller' (optional, fuer Logging)
 * @returns {string} Relativer Pfad zum Projektordner (relativ zu WORKSPACE_DIR)
 */
function initProjectFolder(customerNumber, projectId, projectName = '') {
  // Ordnername: projectId als Fallback (Anfragen haben noch keine Projektnummer)
  const folderName = projectId;
  const absPath = paths.ensureProjectFolders(customerNumber, folderName);
  const relPath = path.relative(paths.WORKSPACE_DIR, absPath);

  logger.info(`📁 Projektordner erstellt: ${relPath}`, projectName);
  return relPath;
}

/**
 * Speichert ein PDF im Projektordner.
 *
 * @param {Buffer} pdfBuffer      - Der PDF-Inhalt
 * @param {string} customerNumber - z.B. 'K-00001'
 * @param {string} projectId      - z.B. 'projects_47750842'
 * @param {string} filename       - z.B. 'Angebot_A-2026-03_00001_Emanuel.pdf'
 * @param {string} subfolder      - 'dokumente' (default) oder 'vertraege'
 * @returns {string} Absoluter Pfad zur gespeicherten Datei
 */
function savePdfToProject(pdfBuffer, customerNumber, projectId, filename, subfolder = 'dokumente') {
  if (!pdfBuffer || !customerNumber || !projectId) {
    logger.warn('[workspace] savePdfToProject: Fehlende Parameter');
    return null;
  }

  const safe = paths.sanitizeFolderName(filename.replace(/\.pdf$/i, '')) + '.pdf';
  const folder = paths.projectSubfolder(customerNumber, projectId, subfolder);

  // Ordner sicherstellen
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const filePath = path.join(folder, safe);

  // Falls Datei existiert: nicht ueberschreiben (GoBD)
  if (fs.existsSync(filePath)) {
    // Suffix anhaengen: _v2, _v3, etc.
    const base = safe.replace(/\.pdf$/i, '');
    let version = 2;
    let versionedPath;
    do {
      versionedPath = path.join(folder, `${base}_v${version}.pdf`);
      version++;
    } while (fs.existsSync(versionedPath));

    fs.writeFileSync(versionedPath, pdfBuffer);
    logger.info(`📄 PDF gespeichert: ${path.relative(paths.WORKSPACE_DIR, versionedPath)}`);
    return versionedPath;
  }

  fs.writeFileSync(filePath, pdfBuffer);
  logger.info(`📄 PDF gespeichert: ${path.relative(paths.WORKSPACE_DIR, filePath)}`);
  return filePath;
}

/**
 * Speichert eine Vertragsdatei im Projektordner unter vertraege/.
 *
 * @param {Buffer} fileBuffer
 * @param {string} customerNumber
 * @param {string} projectId
 * @param {string} filename
 * @returns {string} Absoluter Pfad
 */
function saveContractToProject(fileBuffer, customerNumber, projectId, filename) {
  const folder = paths.projectSubfolder(customerNumber, projectId, 'vertraege');
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const safe = paths.sanitizeFolderName(filename.replace(/\.[^.]+$/, ''))
    + path.extname(filename);
  const filePath = path.join(folder, safe);

  fs.writeFileSync(filePath, fileBuffer);
  logger.info(`📎 Vertrag gespeichert: ${path.relative(paths.WORKSPACE_DIR, filePath)}`);
  return filePath;
}

/**
 * Gibt den absoluten Pfad zum Projektordner zurueck.
 * Null wenn er nicht existiert.
 */
function getProjectFolderPath(customerNumber, projectId) {
  const absPath = paths.projectFolder(customerNumber, projectId);
  return fs.existsSync(absPath) ? absPath : null;
}

/**
 * Listet alle Dateien in einem Projekt-Unterordner.
 * @param {string} customerNumber
 * @param {string} projectId
 * @param {string} subfolder - 'dokumente', 'medien/bilder', 'vertraege', etc.
 * @returns {Array<{name, path, size, mtime}>}
 */
function listProjectFiles(customerNumber, projectId, subfolder) {
  const folder = paths.projectSubfolder(customerNumber, projectId, subfolder);
  if (!fs.existsSync(folder)) return [];

  return fs.readdirSync(folder)
    .filter(f => !f.startsWith('.'))
    .map(f => {
      const fp = path.join(folder, f);
      const stat = fs.statSync(fp);
      return {
        name: f,
        path: fp,
        relativePath: path.relative(paths.WORKSPACE_DIR, fp),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        isDirectory: stat.isDirectory(),
      };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));  // Neueste zuerst
}

/**
 * Gibt Workspace-Info zurueck (fuer Settings-UI).
 */
function getWorkspaceInfo() {
  const total = countFiles(paths.WORKSPACE_DIR);
  const auftraege = fs.existsSync(paths.AUFTRAEGE_DIR)
    ? fs.readdirSync(paths.AUFTRAEGE_DIR).filter(f => !f.startsWith('.')).length
    : 0;

  return {
    path: paths.WORKSPACE_DIR,
    auftraegeDir: paths.AUFTRAEGE_DIR,
    uploadsDir: paths.UPLOADS_DIR,
    backupsDir: paths.BACKUPS_DIR,
    databaseDir: paths.DATA_DIR,
    kundenOrdner: auftraege,
    gesamtDateien: total,
  };
}

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}

module.exports = {
  initProjectFolder,
  savePdfToProject,
  saveContractToProject,
  getProjectFolderPath,
  listProjectFiles,
  getWorkspaceInfo,
};
