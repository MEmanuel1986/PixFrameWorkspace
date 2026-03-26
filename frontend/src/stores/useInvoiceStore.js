/**
 * useInvoiceStore.js
 * 
 * State für Anzahlungs- und Schlussrechnungen in ProjectDetail.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useInvoiceStore = defineStore('invoice', () => {

  // ── Deposit Invoice ────────────────────────────────────────
  const depositInvoice      = ref(null)
  const allDepositInvoices  = ref([])
  const depositFormOpen     = ref(false)
  const depositNoAgreement  = ref(false)
  const depositNextInvoice  = ref(false)
  const depositRelated      = ref([])
  const finalRelated        = ref([])
  const depositManualItem   = ref(null)

  // ── Final Invoice ──────────────────────────────────────────
  const finalInvoiceDoc     = ref(null)
  const allFinalInvoices    = ref([])   // ← fehlte: war nie deklariert → ReferenceError beim ersten Aufruf
  const finalInvoicePaid    = ref(false)
  const finalFormOpen       = ref(false)
  const finalManualItem     = ref(null)

  // ── General Invoice Modal ──────────────────────────────────
  const invoiceModal        = ref(false)
  const invoicePrefillItems = ref(null)
  const invoiceDoc          = ref(null)

  // ── Payment Popup ──────────────────────────────────────────
  const paymentPopup    = ref(false)
  const paymentDocLabel = ref('')
  const paymentForm     = ref({ date: '', method: '' })
  const paymentSaving   = ref(false)
  const paymentError    = ref('')

  // ── Load from documents list ───────────────────────────────
  function loadFromDocs(docs) {
    const invoices = docs.filter(d =>
      d.type === 'invoice' && !d.docSubtype && !d.correctionOf
    )
    const deposits = invoices.filter(d => d.isDeposit)
    const finals   = invoices.filter(d => !d.isDeposit)

    allDepositInvoices.value = [...deposits].reverse()
    depositInvoice.value     = deposits[deposits.length - 1] || null
    allFinalInvoices.value   = [...finals].reverse()
    finalInvoiceDoc.value    = finals[finals.length - 1]     || null
    finalInvoicePaid.value   = finalInvoiceDoc.value?.status === 'Bezahlt'
    invoiceDoc.value         = invoices[invoices.length - 1] || null

    // Korrekturen + Stornos transitiv ermitteln
    const allRelated = docs.filter(d => d.type === 'invoice' && d.correctionOf)

    // Direkte Korrekturen/Stornos auf Deposits
    const depositIds = new Set(deposits.map(d => d.id))
    const directDeposit = allRelated.filter(d => depositIds.has(d.correctionOf))

    // Transitive: Stornos deren correctionOf eine Korrektur ist, die wiederum auf ein Deposit zeigt
    const depositCorrIds = new Set(directDeposit.map(d => d.id))
    const transitiveDeposit = allRelated.filter(d => depositCorrIds.has(d.correctionOf))

    depositRelated.value = [...directDeposit, ...transitiveDeposit]

    // Gleiche Logik für Finals
    const finalIds = new Set(finals.map(d => d.id))
    const directFinal = allRelated.filter(d => finalIds.has(d.correctionOf))
    const finalCorrIds = new Set(directFinal.map(d => d.id))
    const transitiveFinal = allRelated.filter(d => finalCorrIds.has(d.correctionOf))

    finalRelated.value = [...directFinal, ...transitiveFinal]
  }

  function reset() {
    depositInvoice.value     = null
    allDepositInvoices.value = []
    depositFormOpen.value    = false
    depositNoAgreement.value = false
    finalInvoiceDoc.value    = null
    finalFormOpen.value      = false
    invoiceModal.value       = false
    invoicePrefillItems.value = null
  }

  return {
    depositInvoice, allDepositInvoices, depositFormOpen,
    depositNoAgreement, depositNextInvoice, depositRelated, finalRelated, depositManualItem,
    finalInvoiceDoc, allFinalInvoices, finalInvoicePaid, finalFormOpen, finalManualItem,
    invoiceModal, invoicePrefillItems, invoiceDoc,
    paymentPopup, paymentDocLabel, paymentForm, paymentSaving, paymentError,
    loadFromDocs, reset,
  }
})
