/**
 * pdfExport.js
 * PDF-Download via Puppeteer-Backend (Option B).
 *
 * Der Express-Backend rendert die Print-Vue-Route mit Headless-Chrome
 * und gibt ein echtes, seitenkorrektes PDF zurück.
 *
 * Verwendung:
 *   downloadPdfFromBackend('/api/pdf/document/abc123', 'RE-2026-001_Mustermann')
 *   printWithFilename('RE-2026-001')  // Fallback: window.print() für Druckdialog
 */

import apiClient, { API_BASE } from './api'

/**
 * Lädt ein PDF vom Puppeteer-Backend herunter.
 *
 * @param {string} apiPath  - z.B. '/api/pdf/document/abc123'
 * @param {string} filename - Dateiname ohne .pdf
 */
export async function downloadPdfFromBackend(apiPath, filename) {
  try {
    const response = await fetch(`${API_BASE}${apiPath}`, {
      method: 'GET',
    })
    if (!response.ok) {
      throw new Error(`Server antwortete mit HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const safe = (filename || 'Dokument')
      .replace(/[^\w\-äöüÄÖÜß]/g, '_')
      .replace(/__+/g, '_')
      .slice(0, 120)
    a.href     = url
    a.download = `${safe}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('[pdfExport] Backend-Download fehlgeschlagen:', err)
    // Fallback auf Browser-Druckdialog
    printWithFilename(filename)
    throw err
  }
}

/**
 * Öffnet den Browser-Druckdialog (Fallback / Direktdruck).
 * @param {string} filename
 */
export function printWithFilename(filename) {
  const safe = (filename || 'Dokument')
    .replace(/[^a-z0-9äöüÄÖÜß_\-\s]/gi, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120)
  const orig = document.title
  document.title = safe
  window.print()
  setTimeout(() => { document.title = orig }, 3000)
}

/** Compat-Shim: downloadPdfFromElement → jetzt downloadPdfFromBackend */
export async function downloadPdfFromElement(element, filename) {
  printWithFilename(filename)
}

/**
 * Lädt ein Logo von einer URL und konvertiert es zu einem base64 Data-URL.
 * (Wird für die Browser-Vorschau benötigt.)
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
