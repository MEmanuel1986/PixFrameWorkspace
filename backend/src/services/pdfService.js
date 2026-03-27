'use strict';
/**
 * pdfService.js — Stub fuer PixFrameWorkspace v1.1.0
 *
 * PDF-Generierung laeuft jetzt ueber Electron (IPC → BrowserWindow.printToPDF).
 * Diese Datei existiert nur noch damit der pdfController nicht crasht.
 * Die Backend-API-Endpunkte geben einen hilfreichen Fehler zurueck.
 */

async function renderPdf(printPath, opts = {}) {
  throw new Error(
    'PDF-Export laeuft jetzt ueber die Electron Desktop-App. ' +
    'Bitte nutze den PDF-Download-Button in der App.'
  );
}

module.exports = { renderPdf };
