<template>
<div class="pipe-panel pipe-panel-lg" key="vorgespräch">
          <div class="pp-head">
            <span>💬 Vorgespräch</span>
          </div>

          <!-- 2-Spalten: Auftragsübersicht + Formular -->
          <div class="pp-body qo-body" style="padding:0">
            <div class="qo-layout">

              <!-- ═══ Linke Spalte: Auftragsübersicht ═══ -->
              <aside class="qo-sidebar">
                <div class="qo-sb-title">📁 Auftragsübersicht</div>

                <div v-if="project" class="qo-sb-section">
                  <div class="qo-sb-label">Auftrag</div>
                  <div class="qo-sb-occasion">{{ project.contractData?.occasion || project.projectName }}</div>
                  <div class="qo-sb-row" v-if="project.booking">
                    <span class="qo-sb-key">📅</span>
                    <span>{{ formatDate(project.booking) }}{{ project.bookingTime ? ' · ' + project.bookingTime : '' }}</span>
                  </div>
                  <div class="qo-sb-row" v-if="project.location">
                    <span class="qo-sb-key">📍</span><span>{{ project.location }}</span>
                  </div>
                  <div class="qo-sb-row" v-if="project.category">
                    <span class="qo-sb-key">🏷</span><span>{{ project.category }}</span>
                  </div>
                </div>

                <div v-if="customer" class="qo-sb-section">
                  <div class="qo-sb-label">Kunde</div>
                  <div class="qo-sb-val">{{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}</div>
                  <div v-if="customer.company"  class="qo-sb-row"><span class="qo-sb-key">🏢</span><span>{{ customer.company }}</span></div>
                  <div v-if="customer.email"    class="qo-sb-row"><span class="qo-sb-key">✉️</span><span style="word-break:break-all">{{ customer.email }}</span></div>
                  <div v-if="customer.phone"    class="qo-sb-row"><span class="qo-sb-key">📞</span><span>{{ customer.phone }}</span></div>
                </div>

                <div class="qo-sb-section" v-if="project?.fotografie||project?.videografie||project?.glueckwunschkarten||project?.gettingReadyEr||project?.gettingReadySie||project?.gettingReadyBeide">
                  <div class="qo-sb-label">Leistungen</div>
                  <div class="qo-sb-chips">
                    <span v-if="project.fotografie"         class="qo-sb-chip">📷 Foto</span>
                    <span v-if="project.videografie"        class="qo-sb-chip">🎬 Video</span>
                    <span v-if="project.glueckwunschkarten" class="qo-sb-chip">💌 Karten</span>
                    <span v-if="project.gettingReadyEr"     class="qo-sb-chip">💄 GR Er</span>
                    <span v-if="project.gettingReadySie"    class="qo-sb-chip">💄 GR Sie</span>
                    <span v-if="project.gettingReadyBeide"  class="qo-sb-chip">💄 GR Beide</span>
                  </div>
                </div>

                <div class="qo-sb-edit-wrap">
                  <button class="qo-sb-edit-btn" @click="openSidebarEdit">✏️ Auftrag anpassen</button>
                </div>
              </aside>

              <!-- ═══ Rechte Spalte: Gesprächserfassung ═══ -->
              <div class="qo-main">
                <div v-if="pdStore.consultation.clientAccepted === false" class="pp-hint pp-hint-danger" style="margin-bottom:14px">
                  ❌ Kunde wurde abgelehnt. Der Auftrag kann nicht fortgesetzt werden.
                </div>
                <div v-else-if="pdStore.consultation.clientAccepted === true" class="pp-hint pp-hint-success" style="margin-bottom:14px">
                  ✅ Kunde angenommen — du kannst jetzt Angebot und Vertrag erstellen.
                </div>
                <div class="pp-hint pp-hint-info" style="margin-bottom:14px">
                  Führe das Vorgespräch durch und entscheide dann ob du den Auftrag annimmst.
                </div>

                <div style="display:flex;flex-direction:column;gap:12px">
                  <div class="fg">
                    <label>Termin Vorgespräch</label>
                    <input type="date" v-model="pdStore.consultation.date" />
                  </div>
                  <div class="fg">
                    <label>Notizen zum Gespräch</label>
                    <div class="pp-hint pp-hint-info" style="font-size:11px;padding:6px 10px;margin-bottom:6px">
                      💡 Werden beim Speichern mit Zeitstempel unter <strong>Notizen</strong> abgelegt.
                    </div>
                    <textarea v-model="pdStore.consultation.notes" rows="5"
                      placeholder="Eindrücke, Wünsche, Besonderheiten des Kunden…"
                      style="resize:vertical;width:100%;box-sizing:border-box"></textarea>
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn btn-sm"
                      :class="pdStore.consultation.clientAccepted === true ? 'btn-primary' : 'btn-ghost'"
                      @click="pdStore.consultation.clientAccepted = true; saveConsultation()">
                      ✅ Kunde annehmen
                    </button>
                    <button class="btn btn-sm"
                      :class="pdStore.consultation.clientAccepted === false ? 'btn-danger' : 'btn-ghost'"
                      @click="pdStore.consultation.clientAccepted = false; saveConsultation()">
                      ❌ Auftrag ablehnen
                    </button>
                    <button v-if="pdStore.consultation.clientAccepted !== null" class="btn btn-sm btn-ghost"
                      @click="pdStore.consultation.clientAccepted = null; saveConsultation()">
                      ↩ Zurücksetzen
                    </button>
                  </div>
                </div>
              </div><!-- /qo-main -->
            </div><!-- /qo-layout -->
          </div><!-- /pp-body -->

          <div class="pp-foot">
            <button class="btn btn-sm btn-ghost" :disabled="pdStore.consultSaving" @click="saveConsultation()">
              {{ pdStore.consultSaving ? '…' : '💾 Speichern' }}
            </button>
            <button v-if="pdStore.consultation.clientAccepted === true" class="btn btn-sm btn-primary" @click="navigate('angebot')">
              Weiter: Angebot →
            </button>
          </div>
        </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useProjectDetailStore } from '../../stores/useProjectDetailStore'
import { useContractStore }      from '../../stores/useContractStore'
import { useInvoiceStore }       from '../../stores/useInvoiceStore'
import { useQuoteStore }         from '../../stores/useQuoteStore'

export default {
  name: 'ProjectPipelineVorgespraech',
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
    function saveConsultation(...args) { emit('call', 'saveConsultation', args) }
    function openSidebarEdit(...args) { emit('call', 'openSidebarEdit', args) }

    return {
      project, customer, customerName, settingsData,
      pdStore, contractStore, invoiceStore, quoteStore,
      formatDate, formatDateTime, fmtDate, formatCurrency, fmtFileSize,
      navigate, refresh,
      // action functions
      saveConsultation,
      openSidebarEdit,
    }
  },
}
</script>
