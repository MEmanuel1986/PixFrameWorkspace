/**
 * useProjectPipeline.js
 * Pipeline-Navigation, Workflow-Steps, handlePipelineCall-Dispatcher.
 */
import { ref, computed, watch } from 'vue'

export function useProjectPipeline(project, route, contractStore, { customerName, formatDate, heroLive, projectDocuments, quoteDoc, requireConsult, consultation, shootDone }) {

  const pipelineOpen = ref(route.query.new === '1' ? 'anfrage' : null)

  // heroLive zurücksetzen wenn Anfrage-Formular geschlossen wird
  watch(pipelineOpen, (v) => {
    if (!v || v !== 'anfrage') heroLive.value = { projectName: '', booking: '', bookingTime: '', location: '' }
  })

  function handleStepClick(stepId) {
    if (pipelineOpen.value !== stepId) pipelineOpen.value = stepId
  }

  const workflowSteps = computed(() => {
    const p = project.value
    const docs     = projectDocuments.value
    const invoices = docs.filter(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf)
    const depInv   = invoices.filter(d => d.isDeposit)
    const finalInv = invoices.filter(d => !d.isDeposit)

    const hasBooking    = !!p?.booking
    const quoteAccepted = quoteDoc.value?.status === 'Angenommen'
    const hasSigned     = contractStore.contractStatus === 'Unterschrieben'
    const quoteStepDone = p?.skipQuote || quoteAccepted || hasSigned

    const depositPaid   = depInv.some(d => d.status === 'Bezahlt')
    const afterShoot    = shootDone.value
    const hasFinal      = finalInv.length > 0
    const finalPaid     = finalInv.some(d => d.status === 'Bezahlt')

    const consultRequired   = requireConsult.value
    const consultDone       = consultation.value.clientAccepted === true
    const consultDeclined   = consultation.value.clientAccepted === false
    const consultDoneOrSkip = consultDone || !consultRequired

    const steps = []
    steps.push({ id: 'anfrage', icon: '📥', label: 'Anfrage', hint: customerName.value || 'Kundendaten', done: hasBooking && !!p?.category, current: !hasBooking || !p?.category })

    if (consultRequired) {
      steps.push({
        id: 'vorgespräch', icon: consultDeclined ? '❌' : '💬', label: 'Vorgespräch',
        hint: consultDeclined ? 'Abgelehnt' : consultDone ? (consultation.value.date ? new Date(consultation.value.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Angenommen') : consultation.value.date ? 'Termin ' + new Date(consultation.value.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : 'ausstehend',
        done: consultDone, current: hasBooking && !!p?.category && !consultDone && !consultDeclined, declined: consultDeclined,
      })
    }

    if (!p?.skipQuote) {
      steps.push({ id: 'angebot', icon: '📋', label: 'Angebot', hint: quoteAccepted ? (quoteDoc.value?.documentNumber || 'Angenommen') : quoteDoc.value ? quoteDoc.value.status : 'optional', done: quoteStepDone, current: consultDoneOrSkip && hasBooking && !!p?.category && !quoteStepDone })
    }

    steps.push({ id: 'vertrag', icon: '📝', label: 'Vertrag', hint: hasSigned ? (p?.contractNumber || 'Unterschrieben') : contractStore.contractStatus || 'Entwurf', done: hasSigned, current: quoteStepDone && !hasSigned })
    steps.push({ id: 'anzahlung', icon: '💶', label: 'Anzahlung', hint: depositPaid ? 'Bezahlt → Aktiv' : depInv.length > 0 ? (depInv[0].documentNumber || 'Offen') : 'ausstehend', done: depositPaid, current: hasSigned && !depositPaid })
    steps.push({ id: 'auftrag', icon: '📸', label: 'Bearbeitung', comingSoon: true, hint: afterShoot ? 'Erledigt' : hasBooking ? formatDate(p.booking) : '—', done: afterShoot, current: depositPaid && !afterShoot })
    steps.push({ id: 'abrechnung', icon: '🧾', label: 'Abrechnung', hint: hasFinal ? (finalInv[0].documentNumber || 'Erstellt') : 'Schlussrechnung', done: hasFinal, current: afterShoot && !hasFinal })
    steps.push({ id: 'done', icon: '✅', label: 'Abschluss', hint: finalPaid ? 'Bezahlt' : hasFinal ? 'Zahlung offen' : '—', done: finalPaid, current: hasFinal && !finalPaid })

    return steps
  })

  // ── Pipeline-Dispatcher ─────────────────────────────────────────────────────
  // `actions` wird von außen injiziert (alle Funktionen aus allen Composables)
  let _actions = {}
  function registerActions(actions) { _actions = actions }

  async function handlePipelineCall(fnName, args = []) {
    const fn = _actions[fnName]
    if (fn) await fn(...args)
    else console.warn('[ProjectDetail] Unknown pipeline action:', fnName)
  }

  return {
    pipelineOpen, workflowSteps,
    handleStepClick, handlePipelineCall, registerActions,
  }
}
