/**
 * pdfExport.js — PDF-Download fuer PixFrameWorkspace v1.1.0
 *
 * Primaer:  Electron IPC → main process → BrowserWindow.printToPDF
 * Fallback: Browser-Druckdialog (window.print) — nur ausserhalb Electron
 *
 * Kein Puppeteer, kein Backend-Rendering.
 */

import { API_BASE } from './api'

/**
 * Speichert ein PDF.
 *
 * In Electron: Generierung via IPC (verstecktes BrowserWindow + printToPDF)
 * Ohne Electron: Oeffnet den Browser-Druckdialog
 *
 * @param {string} apiPath  - z.B. '/api/pdf/document/abc123'
 * @param {string} filename - Dateiname ohne .pdf
 * @param {object} options  - { docLabel?, docType? }
 */
export async function downloadPdfFromBackend(apiPath, filename, options = {}) {
  // ── Electron: PDF via IPC generieren ──
  if (window.pixframe?.isElectron && window.pixframe?.generatePDF) {
    const buffer = await window.pixframe.generatePDF(apiPath, { ...options, filename })

    if (!buffer || !buffer.length) {
      throw new Error('Leerer PDF-Buffer')
    }

    // Buffer → Blob → Download
    const blob = new Blob([buffer], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const safe = sanitizeFilename(filename)
    a.href     = url
    a.download = `${safe}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return
  }

  // ── Kein Electron: Browser-Druckdialog ──
  printWithFilename(filename)
}

/**
 * Oeffnet den Browser-Druckdialog.
 * @param {string} filename
 */
export function printWithFilename(filename) {
  const safe = sanitizeFilename(filename)
  const orig = document.title
  document.title = safe
  window.print()
  setTimeout(() => { document.title = orig }, 3000)
}

/**
 * Compat-Shim: downloadPdfFromElement → printWithFilename
 */
export async function downloadPdfFromElement(element, filename) {
  printWithFilename(filename)
}

/**
 * Laedt ein Logo von einer URL und konvertiert es zu einem base64 Data-URL.
 */
export async function fetchLogoAsDataUrl(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload  = e => resolve(e.target.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────

function sanitizeFilename(filename) {
  return (filename || 'Dokument')
    .replace(/[^\w\-äöüÄÖÜß]/g, '_')
    .replace(/__+/g, '_')
    .slice(0, 120)
}
