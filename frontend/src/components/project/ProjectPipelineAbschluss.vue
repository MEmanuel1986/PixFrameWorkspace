<template>
<div class="pipe-panel pipe-panel-lg" key="done">

          <div class="pp-head">
            <span>✅ Abschluss</span>
          </div>

          <!-- 2-Spalten-Layout -->
          <div class="pp-body qo-body" style="padding:0">
            <div class="qo-layout">

              <!-- ═══ Linke Spalte: Abgabe-Dokumentation ══════════════ -->
              <div class="qo-main" style="grid-column:1;grid-row:1">

                <!-- Status-Hinweis -->
                <div v-if="pdStore.finalInvoicePaid" class="pp-hint pp-hint-success" style="margin:0 0 16px">
                  ✅ Abgeschlossen — Schlussrechnung bezahlt.
                </div>
                <div v-else-if="invoiceStore.finalInvoiceDoc" class="pp-hint pp-hint-warn" style="margin:0 0 16px">
                  ⏳ Schlussrechnung noch nicht bezahlt.
                </div>
                <div class="pp-hint pp-hint-info" style="margin:0 0 16px">
                  Noch keine Schlussrechnung erstellt.
                </div>

                <!-- Abgabe dokumentieren -->
                <div class="done-section">
                  <div class="done-section-title">📦 Abgabe an Kunden</div>

                  <div v-if="project?.handoverAt" class="done-handover-stamp">
                    <span class="done-handover-icon">✓</span>
                    <div>
                      <div class="done-handover-date">{{ formatDateTime(project.handoverAt) }}</div>
                      <div v-if="project.pdStore.handoverNote" class="done-handover-note">{{ project.pdStore.handoverNote }}</div>
                    </div>
                    <button class="btn btn-ghost btn-sm" style="margin-left:auto" @click="clearHandover">✕</button>
                  </div>

                  <div v-else class="done-handover-form">
                    <div class="done-form-row">
                      <div class="done-form-group">
                        <label>Datum</label>
                        <input v-model="localHandoverDate" type="date" class="done-inp" />
                      </div>
                      <div class="done-form-group">
                        <label>Uhrzeit</label>
                        <input v-model="localHandoverTime" type="time" class="done-inp" />
                      </div>
                    </div>
                    <div class="done-form-group" style="margin-top:8px">
                      <label>Notiz (optional)</label>
                      <input v-model="localHandoverNote" type="text" class="done-inp" placeholder="z. B. per WeTransfer übergeben" />
                    </div>
                    <button class="btn btn-sm btn-primary" style="margin-top:10px" @click="saveHandover && saveHandover(localHandoverDate, localHandoverTime, localHandoverNote)"
                      :disabled="!pdStore.handoverDate">
                      📦 Abgabe jetzt dokumentieren
                    </button>
                  </div>
                </div>

                <!-- Schlussrechnung Status -->
                <div v-if="invoiceStore.finalInvoiceDoc" class="done-section" style="margin-top:16px">
                  <div class="done-section-title">🧾 Schlussrechnung</div>
                  <div class="done-inv-row">
                    <span class="done-inv-num">{{ invoiceStore.finalInvoiceDoc.documentNumber }}</span>
                    <span class="done-inv-amt">{{ formatCurrency(invoiceStore.finalInvoiceDoc.total) }}</span>
                    <span class="badge" :class="invoiceStore.finalInvoiceDoc.status === 'Bezahlt' ? 'badge-success' : 'badge-warning'">
                      {{ invoiceStore.finalInvoiceDoc.status }}
                    </span>
                  </div>
                </div>

              </div><!-- /qo-main -->

              <!-- ═══ Rechte Spalte: Statistik ══════════════════════ -->
              <aside class="qo-sidebar" style="grid-column:2;grid-row:1">
                <div class="qo-sb-title">📊 Auftragsstatistik</div>

                <div class="qo-sb-section">
                  <div class="qo-sb-label">Auftrag</div>
                  <div class="qo-sb-occasion">{{ project?.contractData?.occasion || project?.projectName }}</div>
                  <div class="qo-sb-row" v-if="project?.booking">
                    <span class="qo-sb-key">📅</span>
                    <span>{{ formatDate(project.booking) }}</span>
                  </div>
                  <div class="qo-sb-row" v-if="project?.status">
                    <span class="qo-sb-key">🏷</span>
                    <span>{{ project.status }}</span>
                  </div>
                </div>

                <div class="qo-sb-section">
                  <div class="qo-sb-label">Finanzen</div>
                  <div v-if="quoteStore.quoteDoc" class="qo-sb-row">
                    <span class="qo-sb-key">📋</span>
                    <span>Angebotswert: <strong>{{ formatCurrency(quoteStore.quoteDoc.total) }}</strong></span>
                  </div>
                  <div v-for="dep in invoiceStore.allDepositInvoices" :key="dep.id" class="qo-sb-row">
                    <span class="qo-sb-key">💶</span>
                    <span>Anzahlung: <strong>{{ formatCurrency(dep.total) }}</strong>
                      <span class="badge" :class="dep.status==='Bezahlt'?'badge-success':'badge-neutral'" style="font-size:9px;margin-left:4px">{{ dep.status }}</span>
                    </span>
                  </div>
                  <div v-if="invoiceStore.finalInvoiceDoc" class="qo-sb-row">
                    <span class="qo-sb-key">🧾</span>
                    <span>Schlussrechnung: <strong>{{ formatCurrency(invoiceStore.finalInvoiceDoc.total) }}</strong></span>
                  </div>
                  <div v-if="pdStore.doneNetRevenue > 0" class="qo-sb-row" style="border-top:1px solid var(--border);padding-top:6px;margin-top:4px">
                    <span class="qo-sb-key">💰</span>
                    <span><strong style="color:var(--primary)">Gesamt: {{ formatCurrency(pdStore.doneNetRevenue) }}</strong></span>
                  </div>
                </div>

                <div class="qo-sb-section">
                  <div class="qo-sb-label">Zeitraum</div>
                  <div class="qo-sb-row" v-if="project?.createdAt">
                    <span class="qo-sb-key">🗓</span>
                    <span>Erstellt: {{ formatDate(project.createdAt) }}</span>
                  </div>
                  <div class="qo-sb-row" v-if="project?.booking">
                    <span class="qo-sb-key">📸</span>
                    <span>Shooting: {{ formatDate(project.booking) }}</span>
                  </div>
                  <div class="qo-sb-row" v-if="project?.handoverAt">
                    <span class="qo-sb-key">📦</span>
                    <span>Abgabe: {{ formatDate(project.handoverAt) }}</span>
                  </div>
                </div>

              </aside>

            </div><!-- /qo-layout -->
          </div><!-- /pp-body -->

          <div class="iqf-footer">
            <button class="btn btn-secondary" @click="navigate(null)">Schließen</button>
            <button v-if="invoiceStore.finalInvoiceDoc && !pdStore.finalInvoicePaid" class="btn btn-primary" @click="markFinalPaid">
              💶 Als bezahlt markieren
            </button>
            <button v-if="!invoiceStore.finalInvoiceDoc" class="btn btn-secondary" @click="navigate('abrechnung')">
              ← Zur Abrechnung
            </button>
          </div>

        </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useProjectDetailStore } from '../../stores/useProjectDetailStore'
import { useContractStore }      from '../../stores/useContractStore'
import { useInvoiceStore }       from '../../stores/useInvoiceStore'
import { useQuoteStore }         from '../../stores/useQuoteStore'

export default {
  name: 'ProjectPipelineAbschluss',
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

    // Abschluss: lokale Refs für v-model (pdStore hält den master state)
    const localHandoverDate = ref(pdStore.handoverDate)
    const localHandoverTime = ref(pdStore.handoverTime)
    const localHandoverNote = ref(pdStore.handoverNote)
    watch(() => pdStore.handoverDate, v => { localHandoverDate.value = v || '' })
    watch(() => pdStore.handoverTime, v => { localHandoverTime.value = v || '' })
    watch(() => pdStore.handoverNote, v => { localHandoverNote.value = v || '' })


    // ── Action-Funktionen → emit nach ProjectDetail ───────────────────────
    function saveHandover(...args) { emit('call', 'saveHandover', args) }
    function clearHandover(...args) { emit('call', 'clearHandover', args) }
    function markFinalPaid(...args) { emit('call', 'markFinalPaid', args) }


    return {
      project, customer, customerName, settingsData,
      pdStore, contractStore, invoiceStore, quoteStore,
      formatDate, formatDateTime, fmtDate, formatCurrency, fmtFileSize,
      navigate, refresh,
      saveHandover,
      clearHandover,
      markFinalPaid,
      localHandoverDate, localHandoverTime, localHandoverNote,
    }
  },
}
</script>
