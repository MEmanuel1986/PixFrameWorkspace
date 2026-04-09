/**
 * useProjectContract.js
 * Vertrag CRUD, Nachträge, Signierung, Print, Status.
 */
import { computed } from 'vue'
import { downloadPdfFromBackend } from '../../../services/pdfExport.js'
import apiClient, { API_BASE } from '../../../services/api'

export function useProjectContract(project, customer, store, contractStore, settingsData, { projectDocuments, openPdfInViewer, refreshDocs }) {

  const contractLocked = computed(() =>
    contractStore.contractStatus === 'Unterschrieben',
  )
  const contractStatusClass = computed(() => ({
    'Entwurf':        'badge-neutral',
    'Verschickt':     'badge-info',
    'Unterschrieben': 'badge-success',
  }[contractStore.contractStatus] || 'badge-neutral'))

  const contractHasData = computed(() => !!(project.value?.contractCreated))

  // ── Vertrag-Formular öffnen ─────────────────────────────────────────────────
  function openContractForm() {
    contractStore.contractFormIsNew = !contractStore.contractHasData
    const p = project.value

    if (!contractStore.contractHasData) {
      if (p) {
        contractStore.contractForm.fotografie         = p.fotografie         || false
        contractStore.contractForm.videografie        = p.videografie        || false
        contractStore.contractForm.glueckwunschkarten = p.glueckwunschkarten || false
        contractStore.contractForm.gettingReadyEr     = p.gettingReadyEr     || false
        contractStore.contractForm.gettingReadySie    = p.gettingReadySie    || false
        contractStore.contractForm.gettingReadyBeide  = p.gettingReadyBeide  || false
      }
      const activeClauses = (settingsData.value?.contractClauses?.specialClauses || [])
        .filter(cl => cl.defaultActive)
        .map(cl => cl.id)
      contractStore.contractForm.selectedSpecialClauses = activeClauses
    } else {
      const cd = p?.contractData || {}
      contractStore.contractForm.fotografie         = cd.fotografie         != null ? cd.fotografie         : (p?.fotografie         || false)
      contractStore.contractForm.videografie        = cd.videografie        != null ? cd.videografie        : (p?.videografie        || false)
      contractStore.contractForm.glueckwunschkarten = cd.glueckwunschkarten != null ? cd.glueckwunschkarten : (p?.glueckwunschkarten || false)
      contractStore.contractForm.gettingReadyEr     = cd.gettingReadyEr     != null ? cd.gettingReadyEr     : (p?.gettingReadyEr     || false)
      contractStore.contractForm.gettingReadySie    = cd.gettingReadySie    != null ? cd.gettingReadySie    : (p?.gettingReadySie    || false)
      contractStore.contractForm.gettingReadyBeide  = cd.gettingReadyBeide  != null ? cd.gettingReadyBeide  : (p?.gettingReadyBeide  || false)
    }
    contractStore.contractFormOpen = true
  }

  // ── Vertrag speichern ───────────────────────────────────────────────────────
  async function saveContractData() {
    contractStore.contractSaving = true
    contractStore.contractSaved  = false
    try {
      let contractNumber = project.value.contractNumber
      if (!contractNumber) {
        const nr = await apiClient.get('/projects/next-contract-number')
        contractNumber = nr.data?.number || null
      }
      await store.updateProject(project.value.id, {
        contractData:    { ...contractStore.contractForm },
        contractCreated: true,
        ...(contractNumber && !project.value.contractNumber ? { contractNumber } : {}),
      })
      if (contractNumber) project.value.contractNumber = contractNumber

      const existingVersions = contractStore.contractGeneratedVersions || []
      const newVersion = {
        id:          `cv_${Date.now()}`,
        savedAt:     new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        label:       'v' + (existingVersions.length + 1),
      }
      contractStore.contractGeneratedVersions = [...existingVersions, newVersion]
      await store.updateProject(project.value.id, {
        contractGeneratedVersions: contractStore.contractGeneratedVersions,
      })
      contractStore.contractSaved = true
      setTimeout(() => { contractStore.contractSaved = false }, 2500)

      if (existingVersions.length > 0) {
        contractStore.contractStatus = 'Entwurf'
        await store.updateProject(project.value.id, { contractStatus: 'Entwurf' })
      }

      // Erstmalig: AGB, DSGVO, ADV automatisch anlegen
      if (existingVersions.length === 0) {
        const today = new Date().toISOString().slice(0, 10)
        const stdDocs = [
          { name: 'AGB' },
          { name: 'DSGVO-Einwilligungserklärung' },
          { name: 'ADV-Auftragsverarbeitungsvertrag' },
        ]
        for (const d of stdDocs) {
          try {
            await store.addDocument({
              projectId:  project.value.id,
              customerId: project.value.customerId,
              type:       'other',
              name:       d.name,
              status:     'Aktiv',
              issueDate:  today,
            })
          } catch (e) { console.warn(`Vertragsdokument "${d.name}" konnte nicht angelegt werden:`, e) }
        }
        try {
          const docs = await store.fetchDocumentsByProject(project.value.id)
          projectDocuments.value = docs || []
        } catch (e) { console.warn('Docs reload failed:', e) }

        if (window.pixframe?.generatePDF) {
          const pid = project.value.id
          window.pixframe.generatePDF(`/api/pdf/agb?projectId=${pid}`).catch(() => {})
          window.pixframe.generatePDF(`/api/pdf/dsgvo?projectId=${pid}`).catch(() => {})
          window.pixframe.generatePDF(`/api/pdf/adv/${pid}`).catch(() => {})
        }
      }

      contractStore.contractFormOpen = false
    } catch (e) { console.error(e) }
    finally { contractStore.contractSaving = false }
  }

  async function saveContractStatus() {
    try { await store.updateProject(project.value.id, { contractStatus: contractStore.contractStatus }) }
    catch (e) { console.error(e) }
  }

  // ── Nachträge ───────────────────────────────────────────────────────────────
  async function saveAddendum() {
    if (!contractStore.addendumDraft.title.trim() || !contractStore.addendumDraft.content.trim()) return
    contractStore.addendumSaving = true
    try {
      let addendumNumber = null
      try { const nr = await apiClient.get('/projects/next-addendum-number'); addendumNumber = nr.data?.number || null } catch {}

      const newAdd = {
        id:             `add_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        addendumNumber,
        title:          contractStore.addendumDraft.title.trim(),
        date:           contractStore.addendumDraft.date,
        content:        contractStore.addendumDraft.content.trim(),
        addStatus:      'Entwurf',
        createdAt:      new Date().toISOString(),
      }
      const updated = [...contractStore.contractAddenda, newAdd]
      await store.updateProject(project.value.id, { contractAddenda: updated })
      contractStore.contractAddenda = updated
      contractStore.addendumDraft   = { title: '', date: new Date().toISOString().slice(0, 10), content: '', addStatus: 'Entwurf' }
      contractStore.addendaFormOpen = false
    } catch (e) { console.error(e) }
    finally { contractStore.addendumSaving = false }
  }

  async function deleteAddendum(addId) {
    if (!confirm('Nachtrag wirklich löschen?')) return
    const updated = contractStore.contractAddenda.filter(a => a.id !== addId)
    await store.updateProject(project.value.id, { contractAddenda: updated })
    contractStore.contractAddenda = updated
  }

  async function setAddendumStatus(add, newStatus) {
    const idx = contractStore.contractAddenda.findIndex(a => a.id === add.id)
    if (idx === -1) return
    contractStore.contractAddenda[idx] = { ...contractStore.contractAddenda[idx], addStatus: newStatus }
    await store.updateProject(project.value.id, { contractAddenda: contractStore.contractAddenda })
  }

  // ── Upload / Signierung ─────────────────────────────────────────────────────
  async function uploadSignedContract(e) {
    const file = e.target.files?.[0]
    if (!file) return
    contractStore.signedError = ''
    contractStore.signedUploading = true
    try {
      const fd = new FormData(); fd.append('contract', file)
      const res = await fetch(`${API_BASE}/api/projects/${project.value.id}/contracts`, { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Upload fehlgeschlagen')
      contractStore.signedContracts.push(j.data)
      if (contractStore.contractStatus !== 'Unterschrieben') {
        contractStore.contractStatus = 'Unterschrieben'
        await store.updateProject(project.value.id, { contractStatus: 'Unterschrieben' })
      }
    } catch (err) { contractStore.signedError = err.message }
    finally { contractStore.signedUploading = false; e.target.value = '' }
  }

  async function deleteSignedContract(cid) {
    if (!confirm('Vertrag wirklich löschen?')) return
    try {
      await fetch(`${API_BASE}/api/projects/${project.value.id}/contracts/${cid}`, { method: 'DELETE' })
      contractStore.signedContracts = contractStore.signedContracts.filter(c => c.id !== cid)
    } catch (e) { contractStore.signedError = e.message }
  }

  async function uploadSignedAddendum(e, addendumId) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const fd = new FormData(); fd.append('addendum', file)
      const res = await fetch(`${API_BASE}/api/projects/${project.value.id}/addenda/${addendumId}/sign`, { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Upload fehlgeschlagen')
      const idx = contractStore.contractAddenda.findIndex(a => a.id === addendumId)
      if (idx !== -1) {
        contractStore.contractAddenda[idx] = { ...contractStore.contractAddenda[idx], signedFile: j.data, addStatus: 'Unterschrieben' }
        await store.updateProject(project.value.id, { contractAddenda: contractStore.contractAddenda })
      }
    } catch (err) { console.error('Nachtrag-Upload Fehler:', err) }
    finally { e.target.value = '' }
  }

  async function deleteSignedAddendum(addendumId) {
    if (!confirm('Unterzeichneten Nachtrag wirklich löschen?')) return
    try {
      await fetch(`${API_BASE}/api/projects/${project.value.id}/addenda/${addendumId}/sign`, { method: 'DELETE' })
      const idx = contractStore.contractAddenda.findIndex(a => a.id === addendumId)
      if (idx !== -1) contractStore.contractAddenda[idx] = { ...contractStore.contractAddenda[idx], signedFile: null }
    } catch (err) { console.error(err) }
  }

  // ── Print / Download ────────────────────────────────────────────────────────
  function openContractPrint(autoAction = false) {
    if (!project.value) return
    if (!autoAction) {
      window.open(`/print/contract/${project.value.id}`, '_blank')
      return
    }
    if (window.pixframe?.generateAndOpenPDF) {
      openPdfInViewer('/api/pdf/contract/' + project.value.id)
    } else {
      const p = project.value; const cu = customer.value
      const filename = [p?.contractNumber || 'Vertrag', p?.category, cu?.lastName || cu?.company || ''].filter(Boolean).join('_')
      downloadPdfFromBackend(`/api/pdf/contract/${project.value.id}`, filename).catch(e => console.error('PDF-Fehler:', e))
    }
  }

  async function printContract() {
    if (contractStore.contractStatus === 'Entwurf') {
      contractStore.contractStatus = 'Verschickt'
      await saveContractStatus()
    }
    openContractPrint('download')
  }

  async function downloadContract() {
    if (contractStore.contractStatus === 'Entwurf') {
      contractStore.contractStatus = 'Verschickt'
      await saveContractStatus()
    }
    openContractPrint('download')
  }

  function openAdvPrint() {
    if (!project.value) return
    if (window.pixframe?.generateAndOpenPDF) {
      openPdfInViewer('/api/pdf/adv/' + project.value.id)
    } else {
      const cu = customer.value
      const filename = 'ADV_' + (cu?.lastName || cu?.company || project.value.id)
      downloadPdfFromBackend(`/api/pdf/adv/${project.value.id}`, filename).catch(e => console.error('PDF-Fehler:', e))
    }
  }

  function openAddendumPrint(addendumId, autoAction = false) {
    if (!project.value) return
    if (!autoAction) { window.open(`/print/addendum/${project.value.id}/${addendumId}`, '_blank'); return }
    if (window.pixframe?.generateAndOpenPDF) {
      openPdfInViewer('/api/pdf/addendum/' + project.value.id + '/' + addendumId)
    } else {
      const filename = 'Nachtrag_' + (project.value.contractNumber || project.value.id)
      downloadPdfFromBackend(`/api/pdf/addendum/${project.value.id}/${addendumId}`, filename).catch(e => console.error('PDF-Fehler:', e))
    }
  }

  async function printAddendum(add) {
    if ((add.addStatus || 'Entwurf') === 'Entwurf') await setAddendumStatus(add, 'Verschickt')
    openAddendumPrint(add.id, 'download')
  }

  async function downloadAddendum(add) {
    if ((add.addStatus || 'Entwurf') === 'Entwurf') await setAddendumStatus(add, 'Verschickt')
    openAddendumPrint(add.id, 'download')
  }

  return {
    contractLocked, contractStatusClass, contractHasData,
    openContractForm, saveContractData, saveContractStatus,
    saveAddendum, deleteAddendum, setAddendumStatus,
    uploadSignedContract, deleteSignedContract,
    uploadSignedAddendum, deleteSignedAddendum,
    openContractPrint, printContract, downloadContract,
    openAdvPrint, openAddendumPrint, printAddendum, downloadAddendum,
  }
}
