/**
 * useProjectAnfrage.js
 * Anfrage-Formular, Anfrage-Snapshot, Vorgespräch.
 */
import { ref, computed } from 'vue'

export function useProjectAnfrage(project, store, contractStore, quoteStore, settingsData, { projectNotes, pipelineOpen, requireConsultSetting }) {

  const anfrageFormSaving = ref(false)

  const anfrageFormData = computed(() => {
    if (!project.value) return null
    const snap = project.value.anfrageSnapshot
    if (snap) {
      return { ...project.value, ...snap, contractData: snap.contractData || {} }
    }
    return { ...project.value, contractData: { ...contractStore.contractForm } }
  })

  const anfrageLocked = computed(() =>
    quoteStore.allProjectQuotes.some(q =>
      ['Versendet', 'Angenommen', 'Abgelehnt', 'Ersetzt'].includes(q.status),
    ),
  )

  async function saveAnfrageSnapshot() {
    if (!project.value || project.value.anfrageSnapshot) return
    const snap = {
      booking:            project.value.booking,
      bookingTime:        project.value.bookingTime,
      location:           project.value.location,
      locations:          project.value.locations || [],
      skipQuote:          project.value.skipQuote ?? true,
      category:           project.value.category,
      notes:              project.value.notes,
      projectName:        project.value.projectName,
      fotografie:         project.value.fotografie,
      videografie:        project.value.videografie,
      glueckwunschkarten: project.value.glueckwunschkarten,
      gettingReadyEr:     project.value.gettingReadyEr,
      gettingReadySie:    project.value.gettingReadySie,
      gettingReadyBeide:  project.value.gettingReadyBeide,
      contractData:       { ...contractStore.contractForm },
      inquiryDate:        project.value.inquiryDate,
      status:             project.value.status,
    }
    await store.updateProject(project.value.id, { anfrageSnapshot: snap })
    project.value.anfrageSnapshot = snap
  }

  async function saveAnfrageForm({ project: pData, contractData }) {
    anfrageFormSaving.value = true
    try {
      const updatedPData = {
        ...pData,
        projectName: contractData?.occasion?.trim() || pData.projectName || project.value.projectName,
      }
      await store.updateProject(project.value.id, updatedPData)
      await store.updateProject(project.value.id, { contractData })
      Object.assign(contractStore.contractForm, contractData)
      const savedProject = store.projects.find(pr => pr.id === project.value.id)
      if (savedProject) {
        contractStore.contractForm.fotografie         = savedProject.fotografie         || false
        contractStore.contractForm.videografie        = savedProject.videografie        || false
        contractStore.contractForm.glueckwunschkarten = savedProject.glueckwunschkarten || false
        contractStore.contractForm.gettingReadyEr     = savedProject.gettingReadyEr     || false
        contractStore.contractForm.gettingReadySie    = savedProject.gettingReadySie    || false
        contractStore.contractForm.gettingReadyBeide  = savedProject.gettingReadyBeide  || false
      }
      const rawNotes = pData.notes?.trim()
      if (rawNotes) {
        const note = {
          id: `pn_${Date.now()}`, text: rawNotes, source: 'anfrage',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }
        const updatedNotes = [...(projectNotes.value || []).filter(n => n.source !== 'anfrage'), note]
        projectNotes.value = updatedNotes
        await store.updateProject(project.value.id, { projectNotes: updatedNotes })
      }
      if (requireConsultSetting.value) {
        pipelineOpen.value = 'vorgespräch'
      } else if (!project.value?.skipQuote) {
        pipelineOpen.value = 'angebot'
      } else {
        pipelineOpen.value = 'vertrag'
      }
    } catch (e) { console.error(e) }
    finally { anfrageFormSaving.value = false }
  }

  // ── Vorgespräch ─────────────────────────────────────────────────────────────
  const consultation  = ref({ date: '', notes: '', clientAccepted: null })
  const consultSaving = ref(false)
  const requireConsult = computed(() => settingsData.value?.bookingTerms?.requireConsultation === true)

  async function saveConsultation() {
    consultSaving.value = true
    try {
      await store.updateProject(project.value.id, { consultation: consultation.value })
      const noteText = consultation.value.notes?.trim()
      if (noteText) {
        const existing = projectNotes.value.find(n => n.source === 'vorgespräch')
        const note = {
          id:        existing?.id || `pn_vg_${Date.now()}`,
          text:      noteText,
          source:    'vorgespräch',
          label:     `💬 Vorgespräch${consultation.value.date ? ' · ' + new Date(consultation.value.date).toLocaleDateString('de-DE') : ''}`,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const updatedNotes = [...projectNotes.value.filter(n => n.source !== 'vorgespräch'), note]
        projectNotes.value = updatedNotes
        await store.updateProject(project.value.id, { projectNotes: updatedNotes })
      }
      await store.fetchProjects()
    } catch (e) { console.error(e) }
    finally { consultSaving.value = false }
  }

  return {
    anfrageFormData, anfrageFormSaving, anfrageLocked,
    saveAnfrageForm, saveAnfrageSnapshot,
    consultation, consultSaving, requireConsult, saveConsultation,
  }
}
