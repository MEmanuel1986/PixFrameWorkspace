/**
 * useProjectQuotes.js
 * Angebote: erstellen, revisieren, Status, Prefill, Drucken.
 */
import { computed } from 'vue'

export function useProjectQuotes(project, store, contractStore, quoteStore, settingsData, { projectDocuments, refreshDocs, openPdfInViewer, saveAnfrageSnapshot, pipelineOpen }) {

  const quoteDoc = computed(() => {
    const quotes = projectDocuments.value.filter(d => d.type === 'quote' && !d.docSubtype)
    if (!quotes.length) return null
    const accepted = quotes.find(d => d.status === 'Angenommen')
    if (accepted) return accepted
    return quotes.find(d => !d.supersededBy) || quotes[quotes.length - 1]
  })

  const allProjectQuotes = computed(() =>
    [...projectDocuments.value]
      .filter(d => d.type === 'quote' && !d.docSubtype)
      .sort((a, b) => {
        const vDiff = (b.version || 1) - (a.version || 1)
        if (vDiff !== 0) return vDiff
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      }),
  )

  // ── Prefill-Logik (aus Anfrage/Vertrag) ─────────────────────────────────────
  const quotePrefillItems = computed(() => {
    const p = project.value
    if (!p) return null
    const cd      = p.contractData || {}
    const isSmall = settingsData.value?.company?.smallBusiness || false
    const taxRate = isSmall ? 0 : 19
    const isB2B   = cd.clientIsCompany || false
    const occasion = cd.occasion || p.projectName || ''
    const items = []

    if (cd.pricingModel === 'hourly') {
      if (isB2B) {
        const pPhoto = cd.photoPhases || {}; const pVideo = cd.videoPhases || {}
        const rPM = cd.hourlyRatePhotoB2B || settingsData.value?.bookingTerms?.hourlyRatePhotoB2B || 0
        const rPS = cd.hourlyRatePhotoSetup || settingsData.value?.bookingTerms?.hourlyRatePhotoSetup || 0
        const rVM = cd.hourlyRateVideoB2B || settingsData.value?.bookingTerms?.hourlyRateVideoB2B || 0
        const rVS = cd.hourlyRateVideoSetup || settingsData.value?.bookingTerms?.hourlyRateVideoSetup || 0
        if (p.fotografie) {
          const sH = (pPhoto.vorbereitung || 0) + (pPhoto.abstimmung || 0)
          const mH = (pPhoto.shooting || 0) + (pPhoto.bearbeitung || 0)
          if (sH > 0) items.push({ articleId: 'ART-00010', description: 'Fotografie – Vorbereitung & Meetings', detail: `${sH} h à ${rPS} €/h (Rüstzeit)`, quantity: sH, unit: 'Stunde', priceNet: rPS, taxRate })
          if (mH > 0) items.push({ articleId: 'ART-00002', description: 'Fotografie – Shooting & Bildbearbeitung', detail: `${mH} h à ${rPM} €/h`, quantity: mH, unit: 'Stunde', priceNet: rPM, taxRate })
        }
        if (p.videografie) {
          const sH = (pVideo.vorbereitung || 0) + (pVideo.abstimmung || 0)
          const mH = (pVideo.dreh || 0) + (pVideo.schnitt || 0)
          if (sH > 0) items.push({ articleId: 'ART-00011', description: 'Videografie – Vorbereitung & Meetings', detail: `${sH} h à ${rVS} €/h (Rüstzeit)`, quantity: sH, unit: 'Stunde', priceNet: rVS, taxRate })
          if (mH > 0) items.push({ articleId: 'ART-00004', description: 'Videografie – Dreh & Schnitt', detail: `${mH} h à ${rVM} €/h`, quantity: mH, unit: 'Stunde', priceNet: rVM, taxRate })
        }
      } else {
        const rPP = cd.hourlyRatePhotoPrivat || settingsData.value?.bookingTerms?.hourlyRatePhotoPrivat || cd.hourlyRate || 0
        const rVP = cd.hourlyRateVideoPrivat || settingsData.value?.bookingTerms?.hourlyRateVideoPrivat || cd.hourlyRate || 0
        const imgPP = cd.imagePricePrivat || settingsData.value?.bookingTerms?.imagePricePrivat || 0
        if (p.fotografie) {
          const h = cd.estimatedHoursPhoto || cd.estimatedHours || 0
          if (h > 0 || rPP > 0) items.push({ articleId: 'ART-00001', description: 'Fotografie', detail: h ? `${h} h à ${rPP} €/h` : '', quantity: h || 1, unit: 'Stunde', priceNet: rPP, taxRate })
          const imgC = cd.imageCountPrivat || 0
          if (imgC > 0 && imgPP > 0) items.push({ articleId: 'ART-00008', description: `Bildpaket Digital (${imgC} Bilder)`, detail: 'Bearbeitete Digitalfotos in Druckqualität', quantity: imgC, unit: 'Bild', priceNet: imgPP, taxRate })
        }
        if (p.videografie) {
          const h = cd.estimatedHoursVideo || (p.fotografie ? 0 : cd.estimatedHours) || 0
          if (h > 0 || rVP > 0) items.push({ articleId: 'ART-00003', description: 'Videografie', detail: h ? `${h} h à ${rVP} €/h` : '', quantity: h || 1, unit: 'Stunde', priceNet: rVP, taxRate })
        }
      }
    }

    if (cd.pricingModel === 'flat' && cd.flatRate) {
      items.push({ articleId: 'ART-00017', description: occasion || 'Pauschale Arbeitsleistung', detail: cd.flatRateIncludes || 'Pauschalpreis laut Vereinbarung', quantity: 1, unit: 'Pauschal', priceNet: cd.flatRate, taxRate })
    }

    const imgCount = cd.imageCountB2B || 0; const imgPrice = cd.imagePriceB2B || settingsData.value?.bookingTerms?.imagePriceB2B || 0
    if (isB2B && !cd.mediaIncluded && imgCount > 0 && imgPrice > 0) {
      items.push({ articleId: 'ART-00007', description: `Bildpaket Digital (${imgCount} Bilder)`, detail: 'Bearbeitete Digitalfotos in Druckqualität', quantity: imgCount, unit: 'Bild', priceNet: imgPrice, taxRate })
    }
    const vidCount = cd.videoCount10min || 0; const vidPrice = cd.videoPer10min || settingsData.value?.bookingTerms?.videoPer10min || 0
    if (isB2B && !cd.mediaIncluded && vidCount > 0 && vidPrice > 0) {
      items.push({ articleId: 'ART-00009', description: `Videoproduktion (${vidCount} × 10 min)`, detail: 'Fertig produziert inkl. Schnitt, Grading, Ton', quantity: vidCount, unit: 'Stück', priceNet: vidPrice, taxRate })
    }
    const nrSurcharge = cd.usageRightsSurcharge || 0
    if (isB2B && nrSurcharge > 0) {
      items.push({ articleId: 'ART-00012', description: 'Nutzungsrechte / Lizenz', detail: 'Werbliche Nutzungsrechte gemäß Vereinbarung', quantity: 1, unit: 'Pauschal', priceNet: nrSurcharge, taxRate })
    }

    if (!isB2B) {
      if (p.glueckwunschkarten) items.push({ description: 'Danksagungskarten-Design', detail: '', quantity: 1, unit: 'Pauschal', priceNet: 0, taxRate })
      if (p.gettingReadyEr || p.gettingReadySie || p.gettingReadyBeide) {
        const who = [p.gettingReadySie && 'Braut', p.gettingReadyEr && 'Bräutigam', p.gettingReadyBeide && 'Beide'].filter(Boolean).join(' & ')
        items.push({ description: 'Getting Ready', detail: who, quantity: 1, unit: 'Pauschal', priceNet: 0, taxRate })
      }
    }

    return items.length ? items : null
  })

  // ── Status-Handling ─────────────────────────────────────────────────────────
  function changeQuoteStatus(doc, newStatus) {
    if (!newStatus || newStatus === doc.status) return
    if (!['Angenommen', 'Abgelehnt'].includes(newStatus)) {
      if (newStatus === 'Versendet') saveAnfrageSnapshot()
      store.setDocumentStatus(doc.id, newStatus).then(() => refreshDocs()).catch(console.error)
      return
    }
    quoteStore.quoteStatusConfirm = {
      show: true, doc, newStatus,
      variant:      newStatus === 'Angenommen' ? 'success' : 'danger',
      title:        newStatus === 'Angenommen' ? `Angebot ${doc.documentNumber} annehmen?` : `Angebot ${doc.documentNumber} ablehnen?`,
      sub:          newStatus === 'Angenommen'
        ? 'Der Auftrag gilt damit als vom Kunden bestätigt. Du kannst anschließend mit Vertrag und Anzahlung fortfahren.'
        : 'Das Angebot wird als abgelehnt markiert. Du kannst danach eine neue Version erstellen.',
      confirmLabel: newStatus === 'Angenommen' ? '✅ Ja, annehmen' : '❌ Ja, ablehnen',
    }
  }

  async function confirmQuoteStatusChange() {
    const { doc, newStatus } = quoteStore.quoteStatusConfirm
    quoteStore.quoteStatusConfirm.show = false
    await saveAnfrageSnapshot()
    try {
      await store.setDocumentStatus(doc.id, newStatus)
      await refreshDocs()
    } catch (e) { console.error('Status-Änderung fehlgeschlagen:', e) }
  }

  async function markQuoteAccepted(doc) {
    if (!doc) return
    try { await store.setDocumentStatus(doc.id, 'Angenommen'); await refreshDocs() }
    catch (e) { console.error(e) }
  }

  // ── Print / Open ────────────────────────────────────────────────────────────
  async function printQuote(qv) {
    if (!['Versendet', 'Angenommen', 'Abgelehnt', 'Ersetzt'].includes(qv.status)) {
      try {
        await store.setDocumentStatus(qv.id, 'Versendet')
        await saveAnfrageSnapshot()
        await refreshDocs()
      } catch (e) { console.error('printQuote Status-Fehler:', e) }
    }
    openPdfInViewer('/api/pdf/document/' + qv.id)
  }

  async function downloadQuote(qv) {
    if (!['Versendet', 'Angenommen', 'Abgelehnt', 'Ersetzt'].includes(qv.status)) {
      try {
        await store.setDocumentStatus(qv.id, 'Versendet')
        await saveAnfrageSnapshot()
        await refreshDocs()
      } catch (e) { console.error('downloadQuote Status-Fehler:', e) }
    }
    openPdfInViewer('/api/pdf/document/' + qv.id)
  }

  // ── Create / Revise ─────────────────────────────────────────────────────────
  function openQuoteFromProject() {
    quoteStore.quoteReviseDoc    = null
    quoteStore.quoteReviseMode   = false
    quoteStore.quotePrefillItems = quotePrefillItems.value
    quoteStore.quoteFormOpen     = true
    pipelineOpen.value = 'angebot'
  }

  function openQuoteRevise(doc) {
    quoteStore.quoteReviseDoc  = doc
    quoteStore.quoteReviseMode = true
    quoteStore.quoteFormOpen   = true
    pipelineOpen.value = 'angebot'
  }

  async function onInlineQuoteCreated(doc) {
    await refreshDocs()
    quoteStore.quoteReviseDoc    = null
    quoteStore.quoteReviseMode   = false
    quoteStore.quotePrefillItems = null
    quoteStore.quoteFormOpen     = false
    const { nextTick } = await import('vue')
    await nextTick()
    const qoMain = document.querySelector('.qo-main')
    if (qoMain) qoMain.scrollTop = 0
  }

  return {
    quoteDoc, allProjectQuotes, quotePrefillItems,
    changeQuoteStatus, confirmQuoteStatusChange, markQuoteAccepted,
    printQuote, downloadQuote,
    openQuoteFromProject, openQuoteRevise, onInlineQuoteCreated,
  }
}
