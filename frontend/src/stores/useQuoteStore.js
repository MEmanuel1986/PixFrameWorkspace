/**
 * useQuoteStore.js
 * 
 * State für den Angebots-Bereich in ProjectDetail.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useQuoteStore = defineStore('quote', () => {

  // ── Quote Documents ────────────────────────────────────────
  const quoteDoc          = ref(null)
  const allProjectQuotes  = ref([])

  // ── Form State ─────────────────────────────────────────────
  const quoteFormOpen     = ref(false)
  const quoteReviseMode   = ref(false)
  const quoteReviseDoc    = ref(null)
  const quotePrefillItems = ref(null)

  // ── Status Confirmation ────────────────────────────────────
  const quoteStatusConfirm = ref({
    show: false, doc: null, newStatus: '', variant: 'success',
    title: '', sub: '', confirmLabel: '',
  })

  // ── Load from documents list ───────────────────────────────
  function loadFromDocs(docs) {
    const quotes = docs
      .filter(d => d.type === 'quote' && !d.docSubtype)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

    allProjectQuotes.value = quotes
    // Current quote = last non-superseded
    quoteDoc.value = quotes.filter(q => !q.supersededBy).pop() || quotes[quotes.length - 1] || null
  }

  function reset() {
    quoteDoc.value          = null
    allProjectQuotes.value  = []
    quoteFormOpen.value     = false
    quoteReviseMode.value   = false
    quoteReviseDoc.value    = null
    quotePrefillItems.value = null
  }

  return {
    quoteDoc, allProjectQuotes,
    quoteFormOpen, quoteReviseMode, quoteReviseDoc, quotePrefillItems,
    quoteStatusConfirm,
    loadFromDocs, reset,
  }
})
