/**
 * useProjectHelpers.js
 * Reine Format-/Hilfsfunktionen ohne eigenen State.
 * Benötigt `project` (computed ref) für anyService / hasGettingReady.
 */
import { computed } from 'vue'

export function useProjectHelpers(project) {

  function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('de-DE') : '—'
  }

  function formatCurrency(n) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)
  }

  function formatDateTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function formatTime(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  function formatChangelogVal(val) {
    if (!val && val !== 0) return '—'
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
      return new Date(val).toLocaleDateString('de-DE')
    }
    return String(val)
  }

  function isExpired(d) { return d && new Date(d) < new Date() }

  function typeLabel(type) {
    return {
      contract: 'Vertrag', addendum: 'Nachtrag', attachment: 'Anhang',
      invoice: 'Rechnung', quote: 'Angebot', mood: 'Moodboard',
      reference: 'Referenz', other: 'Dokument', dsgvo: 'DSGVO', adv: 'ADV', agb: 'AGB',
    }[type] || type
  }

  function fmtFileSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function fmtDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const anyService = computed(() =>
    project.value && (
      project.value.fotografie || project.value.videografie ||
      project.value.glueckwunschkarten || project.value.gettingReady ||
      project.value.gettingReadyEr || project.value.gettingReadySie ||
      project.value.gettingReadyBeide
    ),
  )

  const hasGettingReady = computed(() =>
    project.value && (
      project.value.gettingReady || project.value.gettingReadyEr ||
      project.value.gettingReadySie || project.value.gettingReadyBeide
    ),
  )

  return {
    formatDate, formatCurrency, formatDateTime, formatTime, formatChangelogVal,
    isExpired, typeLabel, fmtFileSize, fmtDate,
    anyService, hasGettingReady,
  }
}
