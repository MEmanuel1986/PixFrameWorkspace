/**
 * useProjectLoader.js
 * Kern-Setup: Stores, project, customer, settings, statische Konstanten.
 * Wird als Erstes initialisiert — alle anderen Composables erhalten diese Daten.
 */
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../../../stores/useStore'
import { useProjectDetailStore } from '../../../stores/useProjectDetailStore'
import { useContractStore } from '../../../stores/useContractStore'
import { useInvoiceStore } from '../../../stores/useInvoiceStore'
import { useQuoteStore } from '../../../stores/useQuoteStore'
import apiClient, { API_BASE } from '../../../services/api'

export function useProjectLoader() {

  const store         = useStore()
  const pdStore       = useProjectDetailStore()
  const contractStore = useContractStore()
  const invoiceStore  = useInvoiceStore()
  const quoteStore    = useQuoteStore()

  const route  = useRoute()
  const router = useRouter()

  const loading      = ref(true)
  const settingsData = ref(null)

  const project = computed(() =>
    store.projects.find(p => p.id === route.params.id) || null,
  )

  const customer = computed(() =>
    store.customers.find(c => c.id === project.value?.customerId) || null,
  )

  const customerName = computed(() => {
    if (!project.value?.customerId) return ''
    const c = store.customers.find(c => c.id === project.value.customerId)
    if (!c) return ''
    return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || ''
  })

  function goBack() { router.push('/') }

  function openProjectFolder(subfolder) {
    if (!window.pixframe?.openFolder || !project.value?.projectFolderPath) return
    fetch(`${API_BASE}/api/workspace/info`)
      .then(r => r.json())
      .then(json => {
        const wsPath = json.data?.path
        if (!wsPath) return
        let fullPath = wsPath + '/' + project.value.projectFolderPath
        if (subfolder) fullPath += '/' + subfolder
        window.pixframe.openFolder(fullPath.replace(/\//g, '\\'))
      })
      .catch(e => console.warn('Ordner öffnen fehlgeschlagen:', e))
  }

  async function loadSettings() {
    try {
      const res = await apiClient.get('/settings')
      settingsData.value     = res.data?.data || res.data
      contractStore.contractTemplate = settingsData.value?.contractTemplate || null
    } catch (e) { console.error('Settings laden fehlgeschlagen:', e) }
  }

  // ── Auto-Berechnung ─────────────────────────────────────────────────────────
  function calcAutoDeposit(base) {
    const rate = settingsData.value?.bookingTerms?.depositRate ?? 20
    if (!rate || !base) return null
    return Math.round(base * rate / 100 * 100) / 100
  }

  function calcAutoSurcharge(scope, duration) {
    const matrix = settingsData.value?.usageSurchargeMatrix
    if (!matrix || !scope || !duration) return 0
    return matrix[scope]?.[duration] ?? 0
  }

  const contractBase = computed(() => {
    const f = contractStore.contractForm
    if (f.pricingModel === 'hourly' && f.hourlyRate && f.estimatedHours)
      return f.hourlyRate * f.estimatedHours
    if (f.pricingModel === 'flat' && f.flatRate)
      return f.flatRate
    return null
  })

  const isSmallBusiness = computed(() => !!settingsData.value?.company?.smallBusiness)

  const activeArticles = computed(() => store.articles.filter(a => a.active !== false))

  const enabledPaymentMethods = computed(() => {
    const methods = settingsData.value?.bookingTerms?.enabledPaymentMethods
    const ALL = [
      { id: 'Überweisung',      icon: '🏦' },
      { id: 'Bar',              icon: '💵' },
      { id: 'EC-Karte',         icon: '💳' },
      { id: 'Kreditkarte',      icon: '💳' },
      { id: 'PayPal',           icon: '🅿️' },
      { id: 'SEPA-Lastschrift', icon: '📄' },
      { id: 'Vorkasse',         icon: '💰' },
    ]
    if (!methods?.length) return ALL
    return ALL.filter(m => methods.includes(m.id))
  })

  const categories    = ['Hochzeit', 'Portrait', 'Event', 'Produktfotografie', 'Familienshooting', 'Businessfotografie', 'Sonstiges']
  const statusOptions = ['Anfrage', 'Aktiv', 'Entwurf', 'Abgeliefert', 'Abgeschlossen', 'Storniert']

  return {
    // Stores
    store, pdStore, contractStore, invoiceStore, quoteStore,
    // Router
    route, router,
    // Core state
    loading, settingsData, project, customer, customerName,
    // Navigation
    goBack, openProjectFolder,
    // Settings helpers
    loadSettings, calcAutoDeposit, calcAutoSurcharge,
    contractBase, isSmallBusiness, activeArticles, enabledPaymentMethods,
    // Constants
    categories, statusOptions,
    // Re-export
    API_BASE,
  }
}
