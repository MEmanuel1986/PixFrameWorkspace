<template>
<div class="pipe-panel pipe-panel-lg" key="abrechnung">

          <div class="pipe-transition">

            <!-- ══ FORMULAR-VIEW: Schlussrechnung erstellen ══════════════════ -->
            <div v-if="invoiceStore.finalFormOpen" key="final-form">
              <QuoteInvoiceModal
                :inline="true"
                type="invoice"
                :project="project"
                :customer="customer"
                :prefill-items="invoiceStore.invoicePrefillItems"
                :inject-item="invoiceStore.finalManualItem"
                @manual-add="openManualPopup('final')"
                @close="invoiceStore.finalFormOpen = false; invoiceStore.invoicePrefillItems = null; invoiceStore.finalManualItem = null"
                @created="onFinalInvoiceCreated"
              />
            </div>

            <!-- ══ KORREKTUR-FORMULAR ════════════════════════════════════════ -->
            <div v-else-if="correctionTarget" key="correction-form">
              <div class="iqf-header">
                <div class="iqf-header-left">
                  <div class="iqf-title">✏️ Korrekturrechnung erstellen</div>
                  <div class="iqf-sub" v-if="correctionTarget">
                    zu {{ correctionTarget.documentNumber }}
                  </div>
                </div>
              </div>
              <QuoteInvoiceModal
                :inline="true"
                type="invoice"
                :project="project"
                :customer="customer"
                :correction-of="correctionTarget"
                @close="correctionTarget = null"
                @created="onCorrectionCreated"
              />
            </div>

            <!-- ══ ÜBERSICHT-VIEW ════════════════════════════════════════════ -->
            <div v-else key="abrechnung-overview">
              <div class="pp-head">
                <div style="display:flex;align-items:center;gap:8px">
                  <span>🧾 Schlussrechnung</span>
                  <span v-if="invoiceStore.finalInvoiceDoc" class="badge"
                    :class="invoiceStore.finalInvoiceDoc.status === 'Bezahlt' ? 'badge-success' : 'badge-warning'"
                    style="font-size:10px">
                    {{ invoiceStore.finalInvoiceDoc.status }}
                  </span>
                </div>
              </div>

              <div class="pp-body qo-body" style="padding:0">
                <div class="qo-layout">

                  <!-- ═══ Linke Spalte: Auftragsübersicht ═══════════════ -->
                  <aside class="qo-sidebar" style="grid-column:2;grid-row:1">
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
                    </div>

                    <div v-if="customer" class="qo-sb-section">
                      <div class="qo-sb-label">Kunde</div>
                      <div class="qo-sb-val">{{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}</div>
                      <div v-if="customer.email" class="qo-sb-row"><span class="qo-sb-key">✉️</span><span style="word-break:break-all">{{ customer.email }}</span></div>
                      <div v-if="customer.phone" class="qo-sb-row"><span class="qo-sb-key">📞</span><span>{{ customer.phone }}</span></div>
                    </div>

                    <div v-if="quoteStore.quoteDoc" class="qo-sb-section">
                      <div class="qo-sb-label">Angebot</div>
                      <div class="qo-sb-row"><span class="qo-sb-key">📋</span><span class="qo-sb-strong">{{ quoteStore.quoteDoc.documentNumber }}</span></div>
                      <div class="qo-sb-row"><span class="qo-sb-key">💰</span><span>{{ formatCurrency(quoteStore.quoteDoc.total) }}</span></div>
                    </div>

                    <div v-if="invoiceStore.allDepositInvoices.length" class="qo-sb-section">
                      <div class="qo-sb-label">Anzahlung(en)</div>
                      <div v-for="dep in invoiceStore.allDepositInvoices" :key="dep.id" class="qo-sb-row">
                        <span class="qo-sb-key">💶</span>
                        <span :class="dep.status === 'Bezahlt' ? 'qo-sb-strong' : ''">
                          {{ formatCurrency(dep.total) }}
                          <span class="badge" :class="dep.status === 'Bezahlt' ? 'badge-success' : 'badge-neutral'" style="font-size:9px;margin-left:4px">{{ dep.status }}</span>
                        </span>
                      </div>
                    </div>

                    <div class="qo-sb-edit-wrap">
                      <button class="qo-sb-edit-btn" @click="openSidebarEdit">
                        ✏️ Auftrag anpassen
                      </button>
                    </div>
                  </aside>

                  <!-- ═══ Rechte Spalte: Schlussrechnungs-Liste ══════════ -->
                  <div class="qo-main" style="grid-column:1;grid-row:1">

                    <!-- Noch keine Schlussrechnung -->
                    <div v-if="!invoiceStore.finalInvoiceDoc" class="pp-hint pp-hint-info" style="margin:0 0 14px">
                      Erstelle die Schlussrechnung für diesen Auftrag.
                    </div>

                    <!-- Schlussrechnung vorhanden: qv-row wie Anzahlung -->
                    <!-- Schlussrechnung vorhanden: Liste aller Versionen -->
                    <div v-else class="quote-versions">
                      <div v-for="(inv, idx) in invoiceStore.allFinalInvoices" :key="inv.id" class="qv-row"
                        :class="{ 'qv-current': idx === 0, 'qv-old': idx > 0 }">

                        <div class="qv-top">
                          <span class="qv-vnum" style="font-size:10px;font-weight:700;background:var(--bg-alt);border:1px solid var(--border);border-radius:4px;padding:1px 5px;margin-right:4px">
                            v{{ invoiceStore.allFinalInvoices.length - idx }}
                          </span>
                          <span class="qv-num">{{ inv.documentNumber }}</span>
                          <span class="qv-amount">{{ formatCurrency(inv.total) }}</span>
                          <span v-if="idx === 0" class="qv-version-tag qv-tag-current">Aktuell</span>
                          <span v-else class="qv-version-tag qv-tag-old">Verworfen</span>
                          <span class="qv-date">{{ formatDate(inv.issueDate) }}</span>
                        </div>

                        <div v-if="inv.status === 'Bezahlt' && (inv.paidAt || inv.paymentMethod)" class="qv-paid-info">
                          <span class="qv-paid-icon">✅</span>
                          <span v-if="inv.paidAt">{{ formatDate(inv.paidAt) }}</span>
                          <span v-if="inv.paymentMethod" class="qv-paid-method">· {{ inv.paymentMethod }}</span>
                        </div>

                        <div class="qv-bottom">
                          <template v-if="idx === 0">
                            <div v-if="!['Bezahlt','Storniert'].includes(inv.status)" class="qv-status-pills">
                              <button v-for="s in ['Entwurf','Versendet','Bezahlt']" :key="s"
                                class="qv-pill"
                                :class="{
                                  'qv-pill-active':     inv.status === s,
                                  'qv-pill-entwurf':    s === 'Entwurf',
                                  'qv-pill-versendet':  s === 'Versendet',
                                  'qv-pill-angenommen': s === 'Bezahlt',
                                }"
                                :disabled="inv.status === s"
                                @click="changeFinalStatus(inv, s)">
                                {{ s === 'Bezahlt' ? '✓ ' + s : s }}
                              </button>
                            </div>
                            <span v-else class="badge"
                              :class="inv.status === 'Bezahlt' ? 'badge-success' : 'badge-neutral'"
                              style="font-size:10.5px">
                              {{ inv.status === 'Bezahlt' ? '✓ ' + inv.status : inv.status }}
                            </span>

                            <div class="qv-actions">
                              <button class="btn btn-ghost btn-sm btn-icon" title="Anzeigen (neuer Tab)" @click="openDocPrint(inv)">🔍</button>
                              <button class="btn btn-ghost btn-sm qv-action-print" title="Drucken"
                                @click="openDocPrint(inv, 'print')">📥 Drucken / Herunterladen</button>
                              <button v-if="inv.status === 'Entwurf'"
                                class="btn btn-ghost btn-sm" @click="reviseFinalInvoice(inv)">
                                ↩ Neue Version
                              </button>
                              <button v-if="!['Storniert'].includes(inv.status)"
                                class="btn btn-ghost btn-sm" title="Korrekturrechnung erstellen"
                                @click="openCorrection(inv)">
                                ✏️ Korrektur
                              </button>
                              <button v-if="!['Storniert'].includes(inv.status)"
                                class="btn btn-ghost btn-sm btn-danger-ghost"
                                :title="activeCorrection(inv) ? 'Korrekturrechnung stornieren' : 'Stornorechnung erstellen'"
                                @click="openStorno(activeCorrection(inv) || inv)">
                                🚫 Storno
                              </button>
                            </div>
                          </template>
                          <span v-else class="badge badge-neutral" style="font-size:10.5px">{{ inv.status }}</span>
                        </div>

                        <!-- ── Zugehörige Korrekturen & Stornos ── -->
                        <div v-if="invoiceStore.finalRelated.filter(d => d.correctionOf === inv.id).length"
                          class="qv-related-docs">
                          <div class="qv-related-title">Zugehörige Dokumente</div>
                          <div v-for="rel in invoiceStore.finalRelated.filter(d => d.correctionOf === inv.id)"
                            :key="rel.id" class="qv-related-row">
                            <span class="badge" :class="rel.docSubtype === 'cancellation' ? 'badge-danger' : 'badge-neutral'"
                              style="font-size:10px;margin-right:6px">
                              {{ rel.docSubtype === 'cancellation' ? 'STORNO' : 'KORREKTUR' }}
                            </span>
                            <code class="doc-num">{{ rel.documentNumber }}</code>
                            <span class="qv-amount" style="margin-left:8px">{{ formatCurrency(rel.total) }}</span>
                            <span v-if="rel.docSubtype === 'cancellation' && rel.notes" class="text-muted" style="font-size:11px;margin-left:8px;font-style:italic">„{{ rel.notes }}"</span>
                            <div v-if="!['Bezahlt','Storniert'].includes(rel.status)" class="qv-status-pills" style="margin-left:10px">
                              <button v-for="s in rel.docSubtype === 'correction' ? ['Entwurf','Versendet','Bezahlt'] : ['Entwurf','Versendet']"
                                :key="s" class="qv-pill"
                                :class="{ 'qv-pill-active': rel.status === s, 'qv-pill-entwurf': s==='Entwurf', 'qv-pill-versendet': s==='Versendet', 'qv-pill-angenommen': s==='Bezahlt' }"
                                :disabled="rel.status === s"
                                @click="changeRelatedDocStatus(rel, s)">
                                {{ s === 'Bezahlt' ? '✓ ' + s : s }}
                              </button>
                            </div>
                            <span v-else class="badge" :class="rel.status === 'Bezahlt' ? 'badge-success' : 'badge-neutral'"
                              style="font-size:9px;margin-left:10px">{{ rel.status }}</span>
                            <div class="qv-actions" style="margin-left:auto">
                              <button class="btn btn-ghost btn-sm btn-icon" @click="openDocPrint(rel)">🔍</button>
                              <button class="btn btn-ghost btn-sm qv-action-print" @click="openDocPrint(rel, 'print')">📥</button>
                              <button class="btn btn-ghost btn-sm qv-action-download" @click="openDocPrint(rel, 'download')">📥</button>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>


                  </div><!-- /qo-main -->
                </div><!-- /qo-layout -->
              </div><!-- /pp-body -->

              <div class="pp-foot" style="flex-wrap:wrap;gap:8px">
                <button v-if="!invoiceStore.finalInvoiceDoc" class="btn btn-sm btn-primary" @click="openBillingInvoice()">
                  🧾 Schlussrechnung erstellen
                </button>
              </div>

            </div><!-- /abrechnung-overview -->

          </div>

        </div>
    <!-- ── Stornorechnung bestätigen ── -->
    <Teleport to="body">
      <div v-if="stornoTarget" class="qsc-overlay" @click.self="stornoTarget = null">
        <div class="qsc-dialog" style="max-width:440px">
          <div class="qsc-dialog-head">
            <span>🚫 Stornorechnung erstellen</span>
            <button class="qsc-form-x" @click="stornoTarget = null">✕</button>
          </div>
          <div class="qsc-form-body">
            <div class="pp-hint pp-hint-warn" style="margin-bottom:12px">
              Die Originalrechnung <strong>{{ stornoTarget.documentNumber }}</strong>
              über <strong>{{ formatCurrency(stornoTarget.total) }}</strong> wird storniert
              und erhält den Status „Storniert". Die Stornorechnung gleicht den Betrag mit
              negativen Positionen aus.
            </div>
            <div class="fg">
              <label>Stornierungsgrund (optional)</label>
              <input v-model="stornoReason" type="text" class="fg"
                style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius)"
                placeholder="z. B. Kundenrücktritt, Fehler in Rechnung…" />
            </div>
          </div>
          <div class="qsc-actions">
            <button class="btn btn-secondary btn-sm" @click="stornoTarget = null">Abbrechen</button>
            <button class="btn btn-danger btn-sm" @click="confirmStorno" :disabled="stornoSaving">
              {{ stornoSaving ? '⏳ Wird storniert…' : '🚫 Storno bestätigen' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
</template><script>
import { computed, ref } from 'vue'
import { useProjectDetailStore } from '../../stores/useProjectDetailStore'
import { useContractStore }      from '../../stores/useContractStore'
import { useInvoiceStore }       from '../../stores/useInvoiceStore'
import { useQuoteStore }         from '../../stores/useQuoteStore'
import QuoteInvoiceModal from '../../components/QuoteInvoiceModal.vue'

export default {
  name: 'ProjectPipelineAbrechnung',
  components: { QuoteInvoiceModal },
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
    function activeCorrection(inv) {
      return invoiceStore.finalRelated?.find(d =>
        d.correctionOf === inv.id &&
        d.docSubtype === 'correction' &&
        d.status !== 'Storniert'
      ) || null
    }
    async function onCorrectionCreated(doc) {
      // Nach Speichern: Formular schließen dann Docs neu laden
      correctionTarget.value = null
      emit('call', 'onCorrectionCreated', [doc])
      emit('refresh')
    }
    // ── Korrektur / Storno state ──────────────────────────────────────
    const correctionTarget = ref(null)
    const stornoTarget     = ref(null)
    const stornoReason     = ref('')
    const stornoSaving     = ref(false)

    function openCorrection(inv) {
      correctionTarget.value = inv
    }
    function openStorno(inv) {
      stornoTarget.value = inv
      stornoReason.value = ''
    }
    async function confirmStorno() {
      stornoSaving.value = true
      try {
        emit('call', 'cancelInvoice', [stornoTarget.value.id, stornoReason.value])
        stornoTarget.value = null
      } finally {
        stornoSaving.value = false
      }
    }

    function refresh()       { emit('refresh') }


    // ── Action-Funktionen → emit nach ProjectDetail ───────────────────────
    function openBillingInvoice(...args) { emit('call', 'openBillingInvoice', args) }
    function onFinalInvoiceCreated(...args) { emit('call', 'onFinalInvoiceCreated', args) }
    function changeFinalStatus(...args) { emit('call', 'changeFinalStatus', args) }
    function openDocPrint(...args) { emit('call', 'openDocPrint', args) }
    function reviseFinalInvoice(...args) { emit('call', 'reviseFinalInvoice', args) }
    function changeRelatedDocStatus(...args) { emit('call', 'changeRelatedDocStatus', args) }
    function openManualPopup(...args) { emit('call', 'openManualPopup', args) }
    function openSidebarEdit(...args) { emit('call', 'openSidebarEdit', args) }

    return {
      project, customer, customerName, settingsData,
      pdStore, contractStore, invoiceStore, quoteStore,
      formatDate, formatDateTime, fmtDate, formatCurrency, fmtFileSize,
      navigate, refresh,
      correctionTarget, stornoTarget, stornoReason, stornoSaving,
      openCorrection, openStorno, confirmStorno, activeCorrection, onCorrectionCreated,
      // action functions
      openBillingInvoice,
      onFinalInvoiceCreated,
      changeFinalStatus,
      openDocPrint, changeRelatedDocStatus, reviseFinalInvoice,
      openManualPopup,
      openSidebarEdit,
    }
  },
}
</script>
