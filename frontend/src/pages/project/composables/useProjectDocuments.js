/**
 * useProjectDocuments.js
 * Dokumentenliste, Modal, Drucken, ZUGFeRD, Detail-Ansicht.
 */
import { ref, computed } from 'vue'
import { downloadPdfFromBackend } from '../../../services/pdfExport.js'
import { generateZugferdXml, downloadZugferdXml } from '../../../services/zugferd.js'
import apiClient, { API_BASE } from '../../../services/api'

export function useProjectDocuments(project, customer, store, pdStore, contractStore, invoiceStore, quoteStore, router, route, { contractLocked, isStdDoc, stdDocPrintUrl, openContractPrint, openAddendumPrint }) {

  const projectDocuments = ref([])
  const docsModal        = ref(false)
  const detailDocId      = ref(null)

  // ── Erweiterte Dokumentenliste: Docs + Vertrag + Nachträge ──────────────────
  const allProjectDocs = computed(() => {
    const docs = [...(projectDocuments.value || [])]
    if (!project.value) return docs

    // Hauptvertrag + Generierungs-Versionen
    const cgv = contractStore.contractGeneratedVersions || []
    if (cgv.length > 0 || (contractStore.signedContracts || []).length > 0) {
      const cs = contractStore.contractStatus || 'Entwurf'
      const latestGen = cgv.length ? cgv[cgv.length - 1] : null
      docs.push({
        id: `__contract_${project.value.id}`,
        _isContract: true,
        _contractEditable: !contractLocked.value,
        _generatedVersions: cgv,
        _latestGenerated: latestGen?.generatedAt || null,
        name: `Vertrag · ${project.value.contractData?.occasion || project.value.projectName || 'Auftrag'}`,
        type: 'contract',
        status: cs,
        issueDate: latestGen?.generatedAt || project.value.createdAt || null,
        total: null,
        documentNumber: project.value.contractNumber || null,
      })
    }

    // Unterzeichnete Verträge als Anhänge
    for (const sc of contractStore.signedContracts || []) {
      docs.push({
        id: `__signed_${sc.id}`,
        _isAttachment: true,
        _attachmentLabel: 'Unterschriebener Vertrag',
        _downloadUrl: `${API_BASE}/api/projects/${project.value.id}/contracts/${sc.id}/download`,
        name: sc.originalName,
        type: 'attachment',
        status: 'Unterschrieben',
        issueDate: sc.uploadedAt,
        total: null,
        documentNumber: null,
        ext: sc.ext,
      })
    }

    // Nachträge
    for (const [i, add] of (contractStore.contractAddenda || []).entries()) {
      docs.push({
        id: `__addendum_${add.id}`,
        _isAddendum: true,
        _addendumId: add.id,
        name: add.title || `Nachtrag ${i + 1}`,
        type: 'addendum',
        status: add.signedFile ? 'Unterschrieben' : 'Entwurf',
        issueDate: add.date,
        total: null,
        documentNumber: add.addendumNumber || null,
      })
      if (add.signedFile) {
        docs.push({
          id: `__signed_add_${add.id}`,
          _isAttachment: true,
          _attachmentLabel: `Unterschr. ${add.title || `Nachtrag ${i + 1}`}`,
          _downloadUrl: `${API_BASE}/api/projects/${project.value.id}/addenda/${add.id}/sign/download`,
          name: add.signedFile.originalName,
          type: 'attachment',
          status: 'Unterschrieben',
          issueDate: add.signedFile.uploadedAt,
          total: null,
          documentNumber: null,
          ext: add.signedFile.ext,
        })
      }
    }

    return docs
  })

  const detailDocObj = computed(() =>
    detailDocId.value ? store.documents.find(d => d.id === detailDocId.value) || null : null,
  )

  async function openDocDetail(doc) {
    await store.fetchDocuments()
    detailDocId.value = typeof doc === 'string' ? doc : doc.id
  }

  async function refreshDocs() {
    await store.fetchDocuments()
    try {
      const docs = await store.fetchDocumentsByProject(route.params.id)
      if (docs) {
        projectDocuments.value = docs
        pdStore.projectDocuments = docs
        invoiceStore.loadFromDocs(docs)
        quoteStore.loadFromDocs(docs)
      }
    } catch (e) { console.error(e) }
    autoUpdateProjectStatus()
  }

  function onDocCreated(doc) {
    projectDocuments.value.unshift(doc)
    store.fetchDocuments()
    autoUpdateProjectStatus()
  }

  async function autoUpdateProjectStatus() {
    const p = project.value
    if (!p || p.status === 'Storniert') return
    const order   = ['Anfrage', 'Aktiv', 'Abgeliefert', 'Abgeschlossen']
    const currIdx = order.indexOf(p.status)

    const docs     = projectDocuments.value
    const invoices = docs.filter(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf)
    const depInv   = invoices.filter(d => d.isDeposit)
    const finalInv = invoices.filter(d => !d.isDeposit)

    const depositPaid = depInv.some(d => d.status === 'Bezahlt')
    const hasFinal    = finalInv.length > 0
    const finalPaid   = finalInv.some(d => d.status === 'Bezahlt')

    let target = null
    if (finalPaid)         target = 'Abgeschlossen'
    else if (hasFinal)     target = 'Abgeliefert'
    else if (depositPaid)  target = 'Aktiv'

    if (!target) return
    const targetIdx = order.indexOf(target)
    if (targetIdx <= currIdx) return

    try { await store.updateProject(p.id, { status: target }) }
    catch (e) { console.error('Status-Update fehlgeschlagen:', e) }
  }

  // ── PDF / Print ─────────────────────────────────────────────────────────────
  async function openPdfInViewer(apiPath) {
    if (window.pixframe?.generateAndOpenPDF) {
      try { await window.pixframe.generateAndOpenPDF(apiPath) }
      catch (e) {
        console.error('[PDF] Öffnen fehlgeschlagen:', e)
        const printPath = apiPath.replace(/^\/api\/pdf\//, '/print/')
        window.open(printPath, '_blank')
      }
    } else {
      const printPath = apiPath.replace(/^\/api\/pdf\//, '/print/')
      window.open(printPath, '_blank')
    }
  }

  function openDocOrStd(doc) {
    let url = null
    if (isStdDoc(doc)) {
      url = stdDocPrintUrl(doc)
    } else if (doc.type === 'invoice' || doc.type === 'quote') {
      url = router.resolve({ name: 'DocumentPrint', params: { id: doc.id } }).href
    }
    if (url) {
      window.open(url, '_blank')
      docsModal.value = false
    } else {
      docsModal.value = false
      openPrintView(doc)
    }
  }

  function openDocPrint(doc, action = null) {
    if (!action) {
      const url = router.resolve({ name: 'DocumentPrint', params: { id: doc.id } }).href
      window.open(url, '_blank')
      docsModal.value = false
      return
    }
    if (window.pixframe?.generateAndOpenPDF) {
      openPdfInViewer('/api/pdf/document/' + doc.id)
    } else {
      const filename = [doc.documentNumber, doc.customerName].filter(Boolean).join('_')
      downloadPdfFromBackend(`/api/pdf/document/${doc.id}`, filename)
        .catch(e => console.error('PDF-Fehler:', e))
    }
    docsModal.value = false
  }

  function openDocDownload(doc) { openDocPrint(doc, 'download') }

  function openPrintView(doc) {
    if (doc._isContract) {
      openContractPrint()
    } else if (doc._isAddendum) {
      openAddendumPrint(doc._addendumId)
    } else {
      openDocPrint(doc)
    }
  }

  function downloadDoc(doc) {
    if (doc.filePath) window.open(`${API_BASE}/${doc.filePath}`, '_blank')
  }

  function stdDocPrintUrlFn(doc) {
    const pid = project.value?.id
    const n = (doc.name || '').toLowerCase()
    if (n.includes('auftragsverarbeitungs') || n.includes('adv-auftrags')) return '/print/adv-vertrag'
    if (n.includes('adv') && n.includes('vertrag')) return '/print/adv-vertrag'
    if (n.includes('dsgvo') || n.includes('einwilligung')) return '/print/dsgvo'
    if (n.includes('adv') && pid) return `/print/adv/${pid}`
    if (n.includes('agb')) return '/print/agb'
    return null
  }

  function isStdDocFn(doc) {
    if (doc.type !== 'other') return false
    const n = (doc.name || '').toLowerCase()
    return n.includes('dsgvo') || n.includes('einwilligung') ||
           n.includes('adv') || n.includes('auftragsverarbeitungs') ||
           n.includes('agb')
  }

  async function downloadZugferdFromDoc(doc) {
    try {
      const [docRes, settingsRes] = await Promise.all([
        apiClient.get(`/documents/${doc.id}`),
        apiClient.get('/settings'),
      ])
      const fullDoc  = docRes.data?.data ?? docRes.data
      const settings = settingsRes.data?.data ?? settingsRes.data
      const custRes  = fullDoc.customerId ? await apiClient.get(`/customers/${fullDoc.customerId}`) : null
      const cust     = custRes?.data?.data ?? null
      const xml = generateZugferdXml(fullDoc, cust, settings, project.value)
      downloadZugferdXml(xml, fullDoc.documentNumber || doc.documentNumber)
    } catch (e) { console.error('ZUGFeRD Fehler:', e) }
  }

  return {
    projectDocuments, docsModal, detailDocId, detailDocObj,
    allProjectDocs,
    refreshDocs, onDocCreated, autoUpdateProjectStatus,
    openDocDetail,
    openPdfInViewer, openDocOrStd, openDocPrint, openDocDownload, openPrintView,
    downloadDoc, downloadZugferdFromDoc,
    isStdDoc: isStdDocFn, stdDocPrintUrl: stdDocPrintUrlFn,
  }
}
