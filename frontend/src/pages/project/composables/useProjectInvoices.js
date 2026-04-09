/**
 * useProjectInvoices.js
 * Rechnungen, Anzahlung, Abrechnung, Zahlungs-Popup, Manuell-Popup.
 */
import { ref, computed } from 'vue'

export function useProjectInvoices(project, store, contractStore, invoiceStore, settingsData, isSmallBusiness, { projectDocuments, refreshDocs, onDocCreated, openPaymentPopupFn, quoteDoc, buildNRDescription }) {

  // ── Computed: Rechnungen ────────────────────────────────────────────────────
  const invoiceDoc = computed(() =>
    projectDocuments.value.find(d => d.type === 'invoice' && !d.docSubtype) || null,
  )
  const invoicePaid = computed(() => invoiceDoc.value?.status === 'Bezahlt')

  const allDepositInvoices = computed(() =>
    projectDocuments.value
      .filter(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf && d.isDeposit)
      .sort((a, b) => new Date(b.createdAt || b.issueDate) - new Date(a.createdAt || a.issueDate)),
  )
  const depositInvoice = computed(() => allDepositInvoices.value[0] || null)

  const finalInvoiceDoc = computed(() =>
    projectDocuments.value.find(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf && !d.isDeposit) || null,
  )
  const finalInvoicePaid = computed(() => finalInvoiceDoc.value?.status === 'Bezahlt')

  // ── Abrechnung (Positionsliste) ─────────────────────────────────────────────
  let abrKeyCounter = 0
  function mkAbrLine(d = {}) {
    const taxR = isSmallBusiness.value ? 0 : (d.taxRate ?? 19)
    return {
      _key: ++abrKeyCounter, description: d.description || '', detail: d.detail || '',
      quantity: d.quantity ?? 1, unit: d.unit || 'Pauschal',
      priceNet: d.priceNet ?? 0, taxRate: taxR, discount: d.discount ?? 0,
    }
  }

  const abrechnungItems = ref([])
  const abrQuickAddId   = ref('')
  const abrechnungKm    = ref({ total: 0, free: 0, rate: 0.30 })

  function abrLineNet(item) {
    return (Number(item.quantity) || 0) * (Number(item.priceNet) || 0) * (1 - (Number(item.discount) || 0) / 100)
  }

  const abrSubtotal = computed(() => abrechnungItems.value.reduce((s, i) => s + abrLineNet(i), 0))

  const abrTaxGroups = computed(() => {
    if (isSmallBusiness.value) return []
    const map = {}
    for (const i of abrechnungItems.value) {
      const net = abrLineNet(i); const rate = Number(i.taxRate) || 0
      if (!map[rate]) map[rate] = { rate, base: 0, amount: 0 }
      map[rate].base += net; map[rate].amount += net * rate / 100
    }
    return Object.values(map).filter(g => g.rate > 0)
  })

  const abrechnungTotal = computed(() => abrSubtotal.value + abrTaxGroups.value.reduce((s, g) => s + g.amount, 0))
  const abrechnungHasDeposit = computed(() => abrechnungItems.value.some(i => i._isDepositDeduction))
  const billingTotal = computed(() => abrechnungTotal.value)

  function abrAddFromCatalog() {
    if (!abrQuickAddId.value) return
    const a = store.articles.find(a => a.id === abrQuickAddId.value)
    if (a) abrechnungItems.value.push(mkAbrLine({ description: a.name, detail: a.description || '', quantity: 1, unit: a.unit || 'Pauschal', priceNet: a.priceNet, taxRate: a.taxRate }))
    abrQuickAddId.value = ''
  }

  function abrAddEmptyLine() { abrechnungItems.value.push(mkAbrLine()) }

  function prefillFromQuoteDoc() {
    if (!quoteDoc.value?.lineItems?.length) return
    abrechnungItems.value = quoteDoc.value.lineItems.map(i => mkAbrLine({ ...i, taxRate: isSmallBusiness.value ? 0 : (i.taxRate ?? 19) }))
  }

  function prefillFromContract() {
    const f  = contractStore.contractForm
    const cd = project.value?.contractData || f
    const p2 = project.value
    const occasion = f.occasion || p2?.projectName || ''
    const isB2B    = cd.clientIsCompany || false
    const items    = []

    if (f.pricingModel === 'hourly') {
      if (!isB2B) {
        const rP = cd.hourlyRatePhotoPrivat || settingsData.value?.bookingTerms?.hourlyRatePhotoPrivat || f.hourlyRate || 0
        const rV = cd.hourlyRateVideoPrivat || settingsData.value?.bookingTerms?.hourlyRateVideoPrivat || f.hourlyRate || 0
        const imgP = cd.imagePricePrivat || settingsData.value?.bookingTerms?.imagePricePrivat || 0
        if (p2?.fotografie) {
          const h = cd.estimatedHoursPhoto || f.estimatedHours || 0
          items.push({ articleId: 'ART-00001', description: occasion || 'Fotografie', detail: h ? `${h} h à ${rP} €/h` : '', quantity: h || 1, unit: 'Stunde', priceNet: rP, taxRate: 0 })
          const imgC = cd.imageCountPrivat || 0
          if (imgC > 0 && imgP > 0) items.push({ articleId: 'ART-00008', description: `Bildpaket Digital (${imgC} Bilder)`, detail: 'Bearbeitete Digitalfotos in Druckqualität', quantity: imgC, unit: 'Bild', priceNet: imgP, taxRate: 0 })
        }
        if (p2?.videografie) { const h = cd.estimatedHoursVideo || (p2?.fotografie ? 0 : f.estimatedHours) || 0; items.push({ articleId: 'ART-00003', description: 'Videografie', detail: h ? `${h} h à ${rV} €/h` : '', quantity: h || 1, unit: 'Stunde', priceNet: rV, taxRate: 0 }) }
      } else {
        const rPM = cd.hourlyRatePhotoB2B || settingsData.value?.bookingTerms?.hourlyRatePhotoB2B || 0
        const rPS = cd.hourlyRatePhotoSetup || settingsData.value?.bookingTerms?.hourlyRatePhotoSetup || 0
        const rVM = cd.hourlyRateVideoB2B || settingsData.value?.bookingTerms?.hourlyRateVideoB2B || 0
        const rVS = cd.hourlyRateVideoSetup || settingsData.value?.bookingTerms?.hourlyRateVideoSetup || 0
        const pP = cd.photoPhases || {}; const pV = cd.videoPhases || {}
        if (p2?.fotografie) { const sH = (pP.vorbereitung || 0) + (pP.abstimmung || 0); const mH = (pP.shooting || 0) + (pP.bearbeitung || 0); if (sH > 0) items.push({ articleId: 'ART-00010', description: 'Fotografie – Vorbereitung & Meetings', detail: `${sH} h à ${rPS} €/h`, quantity: sH, unit: 'Stunde', priceNet: rPS, taxRate: 0 }); if (mH > 0) items.push({ articleId: 'ART-00002', description: 'Fotografie – Shooting & Bildbearbeitung', detail: `${mH} h à ${rPM} €/h`, quantity: mH, unit: 'Stunde', priceNet: rPM, taxRate: 0 }) }
        if (p2?.videografie) { const sH = (pV.vorbereitung || 0) + (pV.abstimmung || 0); const mH = (pV.dreh || 0) + (pV.schnitt || 0); if (sH > 0) items.push({ articleId: 'ART-00011', description: 'Videografie – Vorbereitung & Meetings', detail: `${sH} h à ${rVS} €/h`, quantity: sH, unit: 'Stunde', priceNet: rVS, taxRate: 0 }); if (mH > 0) items.push({ articleId: 'ART-00004', description: 'Videografie – Dreh & Schnitt', detail: `${mH} h à ${rVM} €/h`, quantity: mH, unit: 'Stunde', priceNet: rVM, taxRate: 0 }) }
      }
    }
    if (f.pricingModel === 'flat' && f.flatRate) items.push({ articleId: 'ART-00017', description: occasion || 'Pauschale Arbeitsleistung', detail: f.flatRateIncludes || 'Pauschalpreis laut Vertrag', quantity: 1, unit: 'Pauschal', priceNet: f.flatRate, taxRate: 0 })
    if (isB2B && !cd.mediaIncluded) {
      const iC = cd.imageCountB2B || 0; const iP = cd.imagePriceB2B || 0
      if (iC > 0 && iP > 0) items.push({ articleId: 'ART-00007', description: `Bildpaket Digital (${iC} Bilder)`, detail: 'Bearbeitete Digitalfotos in Druckqualität', quantity: iC, unit: 'Bild', priceNet: iP, taxRate: 0 })
      const vC = cd.videoCount10min || 0; const vP = cd.videoPer10min || 0
      if (vC > 0 && vP > 0) items.push({ articleId: 'ART-00009', description: `Videoproduktion (${vC} × 10 min)`, detail: 'Fertig produziert inkl. Schnitt, Grading, Ton', quantity: vC, unit: 'Stück', priceNet: vP, taxRate: 0 })
    }
    const nrS = cd.usageRightsSurcharge || f.usageRightsSurcharge || 0
    if (nrS > 0) items.push({ articleId: 'ART-00012', description: 'Nutzungsrechte / Lizenz', detail: buildNRDescription(cd), quantity: 1, unit: 'Pauschal', priceNet: nrS, taxRate: 0 })
    if (items.length) abrechnungItems.value = items.map(i => mkAbrLine(i))
  }

  function addDepositDeductionLine() {
    const paidDeposits = allDepositInvoices.value.filter(d => d.status === 'Bezahlt')
    if (!paidDeposits.length) return
    const totalDeposit = paidDeposits.reduce((s, d) => s + (d.total || 0), 0)
    abrechnungItems.value.push(mkAbrLine({
      description: 'Abzüglich geleisteter Anzahlung',
      detail: paidDeposits.map(d => d.documentNumber).join(', '),
      quantity: 1, unit: 'Pauschal', priceNet: -totalDeposit,
      taxRate: isSmallBusiness.value ? 0 : 19, _isDepositDeduction: true,
    }))
  }

  function addKmLine() {
    const chargeable = Math.max(0, (abrechnungKm.value.total || 0) - (abrechnungKm.value.free || 0))
    if (!chargeable || !abrechnungKm.value.rate) return
    abrechnungItems.value.push(mkAbrLine({
      description: 'Anfahrt / Fahrtkosten',
      detail: `${abrechnungKm.value.total} km gesamt − ${abrechnungKm.value.free} km frei = ${chargeable} km × ${abrechnungKm.value.rate} €/km`,
      quantity: chargeable, unit: 'km', priceNet: abrechnungKm.value.rate,
      taxRate: isSmallBusiness.value ? 0 : 19,
    }))
    abrechnungKm.value = { total: 0, free: abrechnungKm.value.free, rate: abrechnungKm.value.rate }
  }

  const billing = ref({ hours: null, hourlyRate: null, km: 0, kmFree: 0, kmRate: 0.30, deductDeposit: false, extras: [] })
  const shootDone = computed(() => { if (!project.value?.booking) return false; return new Date(project.value.booking) < new Date() })

  // ── Deposit ─────────────────────────────────────────────────────────────────
  function openDepositInvoice() {
    const depAmount    = contractStore.contractForm.depositAmount
    const projectLabel = project.value?.projectName || project.value?.contractData?.occasion || ''
    const taxR         = isSmallBusiness.value ? 0 : 19
    invoiceStore.invoicePrefillItems = [{
      description: 'Anzahlung', detail: projectLabel ? ('Gemäß Vertrag – ' + projectLabel) : 'Gemäß Vertrag',
      quantity: 1, unit: 'Pauschal', priceNet: (depAmount && depAmount > 0) ? depAmount : 0, taxRate: taxR, discount: 0,
    }]
    invoiceStore.depositFormOpen = true
  }

  function confirmDepositNo() { invoiceStore.depositNoAgreement = true; store.updateProject(project.value.id, { depositNoAgreement: true }) }
  function resetDepositNoAgreement() { invoiceStore.depositNoAgreement = false; store.updateProject(project.value.id, { depositNoAgreement: false }) }

  // ── Billing Invoice (Schlussrechnung) ───────────────────────────────────────
  function openBillingInvoice() {
    const baseItems = []
    if (quoteDoc.value?.lineItems?.length) {
      quoteDoc.value.lineItems.forEach(i => baseItems.push({ ...i, taxRate: isSmallBusiness.value ? 0 : (i.taxRate ?? 19) }))
    } else {
      // Fallback: aus Vertrag/Anfrage (same logic as prefillFromContract, simplified)
      prefillFromContract()
      abrechnungItems.value.forEach(i => baseItems.push({ ...i }))
      abrechnungItems.value = [] // reset
    }
    // Anzahlungsabzug
    const paidDeposits = allDepositInvoices.value.filter(d => d.status === 'Bezahlt')
    if (paidDeposits.length) {
      const totalDep = paidDeposits.reduce((s, d) => s + (d.total || 0), 0)
      const depNrs   = paidDeposits.map(d => d.documentNumber).filter(Boolean).join(', ')
      const depTaxR  = isSmallBusiness.value ? 0 : (paidDeposits[0]?.lineItems?.[0]?.taxRate ?? 19)
      baseItems.push({ articleId: null, description: 'Abzüglich geleisteter Anzahlung', detail: depNrs ? `Rechnung(en): ${depNrs}` : '', quantity: 1, unit: 'Pauschal', priceNet: -Math.abs(totalDep), taxRate: depTaxR, discount: 0, _isDepositDeduction: true })
    }
    invoiceStore.invoicePrefillItems = baseItems.length ? baseItems : null
    invoiceStore.finalFormOpen = true
  }

  async function onFinalInvoiceCreated(doc) {
    onDocCreated(doc); await refreshDocs()
    const { nextTick } = await import('vue'); await nextTick()
    invoiceStore.finalFormOpen       = false
    invoiceStore.invoicePrefillItems = null
    const qoMain = document.querySelector('.qo-main')
    if (qoMain) qoMain.scrollTop = 0
  }

  async function onDepositInvoiceCreated(doc) {
    onDocCreated(doc); await refreshDocs()
    const { nextTick } = await import('vue'); await nextTick()
    invoiceStore.depositFormOpen     = false
    invoiceStore.invoicePrefillItems = null
    invoiceStore.depositManualItem   = null
    const qoMain = document.querySelector('.qo-main')
    if (qoMain) qoMain.scrollTop = 0
  }

  // ── Status changes ──────────────────────────────────────────────────────────
  async function markInvoicePaid() { if (invoiceDoc.value) openPaymentPopupFn(invoiceDoc.value.id, invoiceDoc.value.documentNumber || 'Rechnung') }
  async function markDepositPaid() { if (depositInvoice.value) openPaymentPopupFn(depositInvoice.value.id, depositInvoice.value.documentNumber || 'Anzahlungsrechnung') }
  async function markFinalPaid() { if (finalInvoiceDoc.value) openPaymentPopupFn(finalInvoiceDoc.value.id, finalInvoiceDoc.value.documentNumber || 'Schlussrechnung') }

  async function changeDepositStatus(doc, newStatus) {
    if (!newStatus || newStatus === doc.status) return
    if (newStatus === 'Bezahlt') { openPaymentPopupFn(doc.id, doc.documentNumber || 'Anzahlungsrechnung'); return }
    try { await store.setDocumentStatus(doc.id, newStatus); await refreshDocs() } catch (e) { console.error(e) }
  }

  async function changeFinalStatus(doc, newStatus) {
    if (!newStatus || newStatus === doc.status) return
    if (newStatus === 'Bezahlt') { openPaymentPopupFn(doc.id, doc.documentNumber || 'Schlussrechnung'); return }
    try { await store.setDocumentStatus(doc.id, newStatus); await refreshDocs() } catch (e) { console.error(e) }
  }

  async function reviseDepositInvoice(inv) { if (inv.status !== 'Entwurf') return; try { await store.reviseDocument(inv.id, {}); await refreshDocs() } catch (e) { console.error('Revision fehlgeschlagen:', e) } }
  async function reviseFinalInvoice(inv) { if (inv.status !== 'Entwurf') return; try { await store.reviseDocument(inv.id, {}); await refreshDocs() } catch (e) { console.error('Revision fehlgeschlagen:', e) } }

  async function cancelInvoice(invoiceId, reason = '') { try { await store.cancelInvoice(invoiceId, reason); await refreshDocs() } catch (e) { console.error('Storno fehlgeschlagen:', e) } }
  async function createCorrection(invoiceId, data = {}) { try { await store.correctInvoice(invoiceId, data); await refreshDocs() } catch (e) { console.error('Korrektur fehlgeschlagen:', e) } }
  async function onCorrectionCreated(doc) { onDocCreated(doc); await refreshDocs() }

  async function changeRelatedDocStatus(doc, newStatus) {
    if (!newStatus || newStatus === doc.status) return
    if (newStatus === 'Bezahlt') { openPaymentPopupFn(doc.id, doc.documentNumber || 'Korrekturrechnung'); return }
    try { await store.setDocumentStatus(doc.id, newStatus); await refreshDocs() } catch (e) { console.error(e) }
  }

  // ── Manuell-Popup ───────────────────────────────────────────────────────────
  const manualPopup  = ref(false)
  const manualTarget = ref(null)
  const manualForm   = ref({ description: '', detail: '', quantity: 1, unit: 'Pauschal', priceNet: 0, taxRate: 19, discount: 0 })
  const manualUnits  = ['Pauschal', 'Stunden', 'Tage', 'km', 'Seiten', 'Fotos', 'Stück', 'Lizenz', 'Monat']

  function openManualPopup(target) {
    manualTarget.value = target
    manualForm.value   = { description: '', detail: '', quantity: 1, unit: 'Pauschal', priceNet: 0, taxRate: 19, discount: 0 }
    manualPopup.value  = true
  }

  function saveManualLine() {
    if (!manualForm.value.description.trim()) return
    const item = { ...manualForm.value, _key: Date.now(), articleId: null }
    if (manualTarget.value === 'deposit') invoiceStore.depositManualItem = item
    else invoiceStore.finalManualItem = item
    manualPopup.value = false
  }

  // ── Zahlungs-Popup ──────────────────────────────────────────────────────────
  const paymentDocId = ref(null)

  function openPaymentPopup(docId, label) {
    paymentDocId.value           = docId
    invoiceStore.paymentDocLabel = label
    invoiceStore.paymentForm     = { paidAt: new Date().toISOString().slice(0, 10), paymentMethod: '' }
    invoiceStore.paymentError    = ''
    invoiceStore.paymentPopup    = true
  }

  async function confirmPayment() {
    if (!invoiceStore.paymentForm.paidAt) { invoiceStore.paymentError = 'Bitte Zahlungsdatum angeben.'; return }
    if (!invoiceStore.paymentForm.paymentMethod) { invoiceStore.paymentError = 'Bitte Zahlungsart auswählen.'; return }
    invoiceStore.paymentSaving = true; invoiceStore.paymentError = ''
    try {
      const paymentData = { paidAt: invoiceStore.paymentForm.paidAt, paymentMethod: invoiceStore.paymentForm.paymentMethod }
      await store.setDocumentStatus(paymentDocId.value, 'Bezahlt', paymentData)
      const paidDoc = store.documents.find(d => d.id === paymentDocId.value)
      if (paidDoc?.docSubtype === 'correction' && paidDoc?.correctionOf) {
        await store.setDocumentStatus(paidDoc.correctionOf, 'Bezahlt', paymentData)
      }
      await refreshDocs()
      invoiceStore.paymentPopup = false
    } catch (e) { invoiceStore.paymentError = e.message || 'Fehler beim Speichern.' }
    finally { invoiceStore.paymentSaving = false }
  }

  // ── Abschluss ───────────────────────────────────────────────────────────────
  const handoverDate = ref('')
  const handoverTime = ref('')
  const handoverNote = ref('')
  const doneNetRevenue = computed(() => {
    const paid = projectDocuments.value.filter(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf && d.status === 'Bezahlt')
    return paid.reduce((s, d) => s + (Number(d.total) || 0), 0)
  })

  async function saveHandover(date, time, note) {
    const d = date !== undefined ? date : handoverDate.value
    const t = time !== undefined ? time : handoverTime.value
    const n = note !== undefined ? note : handoverNote.value
    if (!d) return
    if (date !== undefined) { handoverDate.value = d; handoverTime.value = t; handoverNote.value = n }
    const dt  = d + (t ? 'T' + t : 'T00:00')
    const iso = new Date(dt).toISOString()
    await store.updateProject(project.value.id, { handoverAt: iso, handoverNote: n || '' })
    await refreshDocs()
  }

  async function clearHandover() {
    await store.updateProject(project.value.id, { handoverAt: null, handoverNote: '' })
    handoverDate.value = ''; handoverTime.value = ''; handoverNote.value = ''
    await refreshDocs()
  }

  return {
    invoiceDoc, invoicePaid, depositInvoice, finalInvoiceDoc, finalInvoicePaid, allDepositInvoices,
    billing, billingTotal, shootDone,
    abrechnungItems, abrechnungKm, abrQuickAddId,
    abrLineNet, abrSubtotal, abrTaxGroups, abrechnungTotal, abrechnungHasDeposit,
    mkAbrLine, abrAddFromCatalog, abrAddEmptyLine,
    prefillFromQuoteDoc, prefillFromContract, addDepositDeductionLine, addKmLine,
    openDepositInvoice, confirmDepositNo, resetDepositNoAgreement,
    openBillingInvoice, onFinalInvoiceCreated, onDepositInvoiceCreated,
    markInvoicePaid, markDepositPaid, markFinalPaid,
    changeDepositStatus, changeFinalStatus,
    reviseDepositInvoice, reviseFinalInvoice,
    cancelInvoice, createCorrection, onCorrectionCreated, changeRelatedDocStatus,
    manualPopup, manualForm, manualUnits, openManualPopup, saveManualLine,
    paymentDocId, openPaymentPopup, confirmPayment,
    handoverDate, handoverTime, handoverNote, doneNetRevenue,
    saveHandover, clearHandover,
  }
}
