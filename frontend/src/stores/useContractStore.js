/**
 * useContractStore.js
 * 
 * State für den Vertragsbereich in ProjectDetail.
 * Enthält: contractForm, contractStatus, signedContracts, addenda, generatedVersions.
 * 
 * Abhängig von useProjectDetailStore (braucht project, settingsData).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStore } from './useStore'
import apiClient from '../services/api'

export const useContractStore = defineStore('contract', () => {
  const globalStore = useStore()

  // ── Contract Form ──────────────────────────────────────────
  const contractFormOpen   = ref(false)
  const contractFormIsNew  = ref(true)
  const contractForm = ref({
    pricingModel: 'hourly',
    occasion: '', hourlyRate: null, estimatedHours: null,
    flatRate: null, flatRateIncludes: '', customPriceText: '',
    depositAmount: null, paymentDueDays: 14, deliveryWeeks: '4–8',
    publicationPermission: 'conditional', additionalNotes: '',
    clientIsCompany: false,
    fotografie: false, videografie: false, glueckwunschkarten: false,
    gettingReadyEr: false, gettingReadySie: false, gettingReadyBeide: false,
    usageType: 'private', commercialPurpose: '',
    usageLicenseDuration: 'unbegrenzt', usageLicenseScope: 'national',
    usageLicenseSurchargePercent: 0,
    equipmentDamageClause: false,
    selectedSpecialClauses: [], customSpecialClauses: '',
  })
  const contractSaving  = ref(false)
  const contractSaved   = ref(false)

  // ── Contract Status ────────────────────────────────────────
  const contractStatus  = ref('Entwurf')
  const contractLocked  = computed(() =>
    contractStatus.value === 'Unterschrieben' &&
    (signedContracts.value || []).length > 0
  )
  const contractStatusClass = computed(() => ({
    'badge-neutral':  contractStatus.value === 'Entwurf',
    'badge-warning':  contractStatus.value === 'Verschickt',
    'badge-success':  contractStatus.value === 'Unterschrieben',
  }))
  const contractHasData = computed(() => !!contractGeneratedVersions.value?.length)

  // ── Signed Contracts ───────────────────────────────────────
  const signedContracts  = ref([])
  const signedUploading  = ref(false)
  const signedError      = ref('')

  // ── Addenda ────────────────────────────────────────────────
  const contractAddenda  = ref([])
  const addendaFormOpen  = ref(false)
  const addendumSaving   = ref(false)
  const addendumDraft    = ref({
    title: '', date: new Date().toISOString().slice(0, 10),
    content: '', addStatus: 'Entwurf',
  })

  // ── Generated Versions ─────────────────────────────────────
  const contractGeneratedVersions = ref([])

  // ── Templates ─────────────────────────────────────────────
  const contractTemplate = ref(null)
  const showDataSheet    = ref(false)

  // ── Load state from project ────────────────────────────────
  function loadFromProject(project, settingsData) {
    contractStatus.value             = project.contractStatus || 'Entwurf'
    signedContracts.value            = project.signedContracts || []
    contractAddenda.value            = project.contractAddenda || []
    contractGeneratedVersions.value  = project.contractGeneratedVersions || []

    const cd = project.contractData
    const p  = project

    if (cd) {
      contractForm.value = {
        pricingModel:          cd.pricingModel          || 'hourly',
        occasion:              cd.occasion              || '',
        hourlyRate:            cd.hourlyRate            ?? null,
        estimatedHours:        cd.estimatedHours        ?? null,
        flatRate:              cd.flatRate              ?? null,
        flatRateIncludes:      cd.flatRateIncludes      || '',
        customPriceText:       cd.customPriceText       || '',
        depositAmount:         cd.depositAmount         ?? null,
        paymentDueDays:        cd.paymentDueDays        ?? 14,
        deliveryWeeks:         cd.deliveryWeeks         || '4–8',
        publicationPermission: cd.publicationPermission || 'conditional',
        additionalNotes:       cd.additionalNotes       || '',
        clientIsCompany:       cd.clientIsCompany       || false,
        fotografie:         cd.fotografie         != null ? cd.fotografie         : (p.fotografie         || false),
        videografie:        cd.videografie        != null ? cd.videografie        : (p.videografie        || false),
        glueckwunschkarten: cd.glueckwunschkarten != null ? cd.glueckwunschkarten : (p.glueckwunschkarten || false),
        gettingReadyEr:     cd.gettingReadyEr     != null ? cd.gettingReadyEr     : (p.gettingReadyEr     || false),
        gettingReadySie:    cd.gettingReadySie    != null ? cd.gettingReadySie    : (p.gettingReadySie    || false),
        gettingReadyBeide:  cd.gettingReadyBeide  != null ? cd.gettingReadyBeide  : (p.gettingReadyBeide  || false),
        usageType:             cd.usageType             || 'private',
        commercialPurpose:     cd.commercialPurpose     || '',
        usageLicenseDuration:  cd.usageLicenseDuration  || 'unbegrenzt',
        usageLicenseScope:     cd.usageLicenseScope     || 'national',
        usageLicenseSurchargePercent: cd.usageLicenseSurchargePercent ?? 0,
        equipmentDamageClause: cd.equipmentDamageClause || false,
        selectedSpecialClauses: cd.selectedSpecialClauses || [],
        customSpecialClauses:  cd.customSpecialClauses  || '',
      }
    } else {
      // Neues Projekt — Leistungen aus Anfrage vorbelegen
      contractForm.value.fotografie         = p.fotografie         || false
      contractForm.value.videografie        = p.videografie        || false
      contractForm.value.glueckwunschkarten = p.glueckwunschkarten || false
      contractForm.value.gettingReadyEr     = p.gettingReadyEr     || false
      contractForm.value.gettingReadySie    = p.gettingReadySie    || false
      contractForm.value.gettingReadyBeide  = p.gettingReadyBeide  || false
    }

    // Stundensatz aus Settings wenn nicht gesetzt
    if (!contractForm.value.hourlyRate && settingsData?.bookingTerms?.defaultHourlyRate) {
      contractForm.value.hourlyRate = settingsData.bookingTerms.defaultHourlyRate
    }
  }

  // ── Reset ──────────────────────────────────────────────────
  function reset() {
    contractFormOpen.value  = false
    contractFormIsNew.value = true
    contractStatus.value    = 'Entwurf'
    signedContracts.value   = []
    contractAddenda.value   = []
    contractGeneratedVersions.value = []
    contractTemplate.value  = null
  }

  return {
    contractFormOpen, contractFormIsNew, contractForm,
    contractSaving, contractSaved,
    contractStatus, contractStatusClass, contractLocked, contractHasData,
    signedContracts, signedUploading, signedError,
    contractAddenda, addendaFormOpen, addendumSaving, addendumDraft,
    contractGeneratedVersions, contractTemplate, showDataSheet,
    loadFromProject, reset,
  }
})
