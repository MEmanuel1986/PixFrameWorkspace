/**
 * useProjectDetailStore.js
 * 
 * Zentraler State für ProjectDetail.vue und zukünftige Sub-Komponenten.
 * 
 * Enthält:
 *  - Kerndata: project, customer, loading
 *  - Pipeline-Navigation: pipelineOpen
 *  - Dokumente: projectDocuments, allProjectDocs
 *  - Changelog: auftragChangelog
 *  - Notizen: projectNotes
 *  - Settings-Daten: settingsData
 * 
 * Wird von ProjectDetail.vue über useProjectDetailStore() instanziiert
 * und kann später an Sub-Komponenten per provide/inject weitergegeben werden.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStore } from './useStore'
import apiClient from '../services/api'

export const useProjectDetailStore = defineStore('projectDetail', () => {
  const globalStore = useStore()

  // ── Core Data ──────────────────────────────────────────────
  const projectId       = ref(null)
  const loading         = ref(true)
  const error           = ref(null)
  const settingsData    = ref(null)

  // ── Pipeline Navigation ────────────────────────────────────
  const pipelineOpen    = ref(null)

  // ── Dokumente ──────────────────────────────────────────────
  const projectDocuments = ref([])

  // ── Changelog ─────────────────────────────────────────────
  const auftragChangelog = ref([])

  // ── Projektnotizen ─────────────────────────────────────────
  const projectNotes     = ref([])

  // ── Kundenfoto ─────────────────────────────────────────────
  const heroLive         = ref(null)

  // ── Anfrage ────────────────────────────────────────────────
  const anfrageFormData   = ref(null)
  const anfrageFormSaving = ref(false)
  const anfrageLocked     = ref(false)

  // ── Vorgespräch ────────────────────────────────────────────
  const consultation  = ref({ date: '', notes: '', clientAccepted: null })
  const consultSaving = ref(false)

  // ── Changelog ─────────────────────────────────────────────
  const showChangelogModal = ref(false)

  // ── Abschluss ─────────────────────────────────────────────
  const handoverDate   = ref('')
  const handoverTime   = ref('')
  const handoverNote   = ref('')
  const doneNetRevenue = ref(0)
  const finalInvoicePaid = ref(false)

  // ── Pipeline: requireConsult ───────────────────────────────
  const requireConsult = ref(false)

  // ── Computed: auftragChangelogSorted ──────────────────────
  const auftragChangelogSorted = computed(() =>
    [...auftragChangelog.value].sort((a, b) =>
      new Date(b.ts || b.at || 0) - new Date(a.ts || a.at || 0)
    )
  )

  // ── Computed: project aus globalStore ─────────────────────
  const project = computed(() =>
    globalStore.projects.find(p => p.id === projectId.value) || null
  )

  const customer = computed(() => {
    if (!project.value?.customerId) return null
    return globalStore.customers.find(c => c.id === project.value.customerId) || null
  })

  const customerName = computed(() => {
    if (!customer.value) return ''
    return [customer.value.firstName, customer.value.lastName]
      .filter(Boolean).join(' ') || customer.value.company || ''
  })

  // ── Load Settings ──────────────────────────────────────────
  async function loadSettings() {
    try {
      const r = await apiClient.get('/settings')
      settingsData.value = r.data?.data ?? r.data
    } catch (e) {
      console.error('[ProjectDetailStore] loadSettings:', e)
    }
  }

  // ── Load Docs ──────────────────────────────────────────────
  async function refreshDocs() {
    if (!projectId.value) return
    try {
      const docs = await globalStore.fetchDocumentsByProject(projectId.value)
      projectDocuments.value = docs || []
    } catch (e) {
      console.error('[ProjectDetailStore] refreshDocs:', e)
    }
  }

  // ── Initialize for a given project ID ─────────────────────
  async function init(id, initialPipelineOpen = null) {
    projectId.value   = id
    loading.value     = true
    error.value       = null
    pipelineOpen.value = initialPipelineOpen

    try {
      await Promise.all([
        globalStore.fetchProjects(),
        globalStore.fetchCustomers(),
        loadSettings(),
        globalStore.fetchArticles(),
      ])
      await refreshDocs()

      // Load project-specific state
      const p = project.value
      if (p) {
        auftragChangelog.value = p.auftragChangelog || []
        projectNotes.value     = p.projectNotes     || []
      }
    } catch (e) {
      error.value = e.message
      console.error('[ProjectDetailStore] init:', e)
    } finally {
      loading.value = false
    }
  }

  // ── Reset (cleanup on unmount) ─────────────────────────────
  function reset() {
    projectId.value       = null
    loading.value         = true
    error.value           = null
    pipelineOpen.value    = null
    projectDocuments.value = []
    auftragChangelog.value = []
    projectNotes.value     = []
    heroLive.value         = null
    settingsData.value     = null
  }

  return {
    // state
    projectId, loading, error, settingsData,
    pipelineOpen, projectDocuments,
    auftragChangelog, projectNotes, heroLive,
    // anfrage
    anfrageFormData, anfrageFormSaving, anfrageLocked,
    // vorgespräch
    consultation, consultSaving,
    // changelog
    showChangelogModal,
    // abschluss
    handoverDate, handoverTime, handoverNote, doneNetRevenue, finalInvoicePaid,
    // pipeline
    requireConsult,
    // computed
    project, customer, customerName, auftragChangelogSorted,
    // actions
    init, reset, refreshDocs, loadSettings,
  }
})
