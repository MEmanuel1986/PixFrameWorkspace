<template>
<div class="pipe-panel" key="anfrage">
          <NewProjectForm
            mode="edit"
            :customer-name="customerName"
            :initial-data="pdStore.anfrageFormData"
            :settings="settingsData"
            :saving="pdStore.anfrageFormSaving"
            :locked="pdStore.anfrageLocked"
            @save="saveAnfrageForm"
            @cancel="pipelineOpen = null"
            @update:live="onHeroLive"
          />
        </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useProjectDetailStore } from '../../stores/useProjectDetailStore'
import { useContractStore }      from '../../stores/useContractStore'
import { useInvoiceStore }       from '../../stores/useInvoiceStore'
import { useQuoteStore }         from '../../stores/useQuoteStore'
import NewProjectForm from '../../components/NewProjectForm.vue'

export default {
  name: 'ProjectPipelineAnfrage',
  components: { NewProjectForm },
  emits: ['navigate', 'refresh', 'call'],
  setup(props, { emit }) {
    const pdStore       = useProjectDetailStore()
    const contractStore = useContractStore()
    const invoiceStore  = useInvoiceStore()
    const quoteStore    = useQuoteStore()

    // Core data — reaktiv aus Stores
    const project      = computed(() => pdStore.project)
    const customer     = computed(() => pdStore.customer)
    const customerName = computed(() => pdStore.customerName)
    const settingsData = computed(() => pdStore.settingsData)

    // Formatting helpers — inline damit keine Props nötig
    function formatDate(d) {
      return d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
    }
    function formatDateTime(d) {
      return d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
    }
    function fmtDate(d) { return formatDate(d) }
    function formatCurrency(n) {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n ?? 0)
    }
    function fmtFileSize(bytes) {
      if (!bytes) return ''
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
      return (bytes/(1024*1024)).toFixed(1) + ' MB'
    }

    function navigate(panel) { emit('navigate', panel) }
    function refresh()       { emit('refresh') }


    // ── Action-Funktionen → emit nach ProjectDetail ───────────────────────
    function saveAnfrageForm(...args) { emit('call', 'saveAnfrageForm', args) }
    function onHeroLive(...args) { emit('call', 'onHeroLive', args) }

    return {
      project, customer, customerName, settingsData,
      pdStore, contractStore, invoiceStore, quoteStore,
      formatDate, formatDateTime, fmtDate, formatCurrency, fmtFileSize,
      navigate, refresh,
      // action functions
      saveAnfrageForm,
      onHeroLive,
    }
  },
}
</script>
