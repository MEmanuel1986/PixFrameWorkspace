<template>
<div class="pipe-panel pipe-panel-lg" key="angebot">

          <!-- ── Inline-Formular: Neues Angebot / Neue Version ── -->
          <div class="pipe-transition">
            <div v-if="quoteStore.quoteFormOpen" key="quote-form">
              <InlineQuoteForm
                :project="project"
                :customer="customer"
                :edit-doc="quoteStore.quoteReviseDoc"
                :revise-mode="quoteStore.quoteReviseMode"
                :prefill-items="quoteStore.quotePrefillItems"
                @created="onInlineQuoteCreated"
                @cancel="quoteStore.quoteFormOpen = false; quoteStore.quoteReviseDoc = null; quoteStore.quoteReviseMode = false"
              />
            </div>

            <!-- ── Übersicht: bestehende Versionen ── -->
            <div v-else key="quote-overview">
              <div class="pp-head">
                <div style="display:flex;align-items:center;gap:8px">
                  <span>📋 Angebot</span>
                  <span v-if="!pdStore.requireConsult" class="pp-optional-tag">optional</span>
                  <span v-if="quoteStore.quoteDoc" class="badge"
                    :class="quoteStore.quoteDoc.status === 'Angenommen' ? 'badge-success' : 'badge-warning'"
                    style="font-size:10px">
                    {{ quoteStore.quoteDoc.status }}
                  </span>
                </div>
              </div>

              <div class="pp-body qo-body">
                <!-- 2-Spalten: Sidebar + Angebotsliste -->
                <div class="qo-layout">

                  <!-- ═══ Linke Spalte: Auftragsübersicht ═══════════════ -->
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
                      <div v-if="customer.company" class="qo-sb-row"><span class="qo-sb-key">🏢</span><span>{{ customer.company }}</span></div>
                      <div v-if="customer.email" class="qo-sb-row"><span class="qo-sb-key">✉️</span><span style="word-break:break-all">{{ customer.email }}</span></div>
                      <div v-if="customer.phone" class="qo-sb-row"><span class="qo-sb-key">📞</span><span>{{ customer.phone }}</span></div>
                    </div>

                    <div class="qo-sb-section" v-if="project.fotografie||project.videografie||project.glueckwunschkarten||project.gettingReadyEr||project.gettingReadySie||project.gettingReadyBeide">
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

                    <div v-if="project.contractData" class="qo-sb-section">
                      <div class="qo-sb-label">Honorar</div>
                      <template v-if="project.contractData.pricingModel === 'hourly' && project.contractData.hourlyRate">
                        <div class="qo-sb-row">
                          <span class="qo-sb-key">💰</span>
                          <span class="qo-sb-strong">{{ project.contractData.hourlyRate }} €/h<span v-if="project.contractData.estimatedHours"> × {{ project.contractData.estimatedHours }} h</span></span>
                        </div>
                      </template>
                      <template v-else-if="project.contractData.pricingModel === 'flat' && project.contractData.flatRate">
                        <div class="qo-sb-row"><span class="qo-sb-key">💰</span><span class="qo-sb-strong">{{ formatCurrency(project.contractData.flatRate) }} Pauschal</span></div>
                      </template>
                      <div class="qo-sb-row" v-if="project.contractData.depositAmount">
                        <span class="qo-sb-key">💶</span><span>Anzahlung {{ formatCurrency(project.contractData.depositAmount) }}</span>
                      </div>
                      <div class="qo-sb-row" v-if="project.contractData.paymentDueDays">
                        <span class="qo-sb-key">🗓</span><span>Zahlung in {{ project.contractData.paymentDueDays }} Tagen</span>
                      </div>
                    </div>

                    <!-- Änderungsprotokoll -->
                    <div v-if="pdStore.auftragChangelog.length" class="qo-sb-section">
                      <div class="qo-sb-label" style="display:flex;align-items:center;justify-content:space-between">
                        <span>🕐 Letzte Änderung</span>
                        <span class="qo-sb-count">{{ pdStore.auftragChangelog.length }}</span>
                      </div>
                      <!-- Nur neueste Änderung zeigen -->
                      <div class="acp-entry acp-entry-compact">
                        <div class="acp-ts">{{ formatDateTime(pdStore.auftragChangelogSorted[0].ts) }}</div>
                        <div class="acp-line">
                          <span class="acp-field">{{ pdStore.auftragChangelogSorted[0].label }}:</span>
                          <span class="acp-from">{{ formatChangelogVal(pdStore.auftragChangelogSorted[0].from) }}</span>
                          <span class="acp-arrow">→</span>
                          <span class="acp-to">{{ formatChangelogVal(pdStore.auftragChangelogSorted[0].to) }}</span>
                        </div>
                      </div>
                      <button class="acp-log-btn" @click="pdStore.showChangelogModal = true">
                        📋 Änderungslog ({{ pdStore.auftragChangelog.length }})
                      </button>
                    </div>

                    <div class="qo-sb-edit-wrap">
                      <button class="qo-sb-edit-btn" @click="openSidebarEdit">
                        ✏️ Auftrag anpassen
                      </button>
                    </div>
                  </aside>

                  <!-- ═══ Rechte Spalte: Angebotsliste ═══════════════════ -->
                  <div class="qo-main">
                    <!-- Noch kein Angebot -->
                    <div v-if="!quoteStore.quoteDoc" class="pp-hint pp-hint-info" style="margin:0">
                      Erstelle ein Angebot auf Basis der Auftragsdaten. Änderungswünsche lassen sich jederzeit
                      als neue Version anlegen — alle Versionen bleiben erhalten.
                    </div>

                    <!-- Angebots-Versionen -->
                    <div v-else class="quote-versions">
                      <div v-for="qv in quoteStore.allProjectQuotes" :key="qv.id" class="qv-row"
                        :class="{ 'qv-current': !qv.supersededBy, 'qv-old': !!qv.supersededBy }">

                        <!-- Obere Zeile: vN-Badge + Nummer + Betrag + Status-Tag + Datum -->
                        <div class="qv-top">
                          <span class="qv-vnum">v{{ qv.version || 1 }}</span>
                          <span class="qv-num">{{ qv.documentNumber }}</span>
                          <span class="qv-amount">{{ formatCurrency(qv.total) }}</span>
                          <span v-if="!qv.supersededBy" class="qv-version-tag qv-tag-current">Aktuell</span>
                          <span v-else class="qv-version-tag qv-tag-old">Verworfen</span>
                          <span class="qv-date">{{ formatDateTime(qv.issueDate || qv.createdAt) }}</span>
                        </div>

                        <!-- Untere Zeile: Status-Pills + Aktionen -->
                        <div class="qv-bottom">
                          <!-- Status-Pills: nur für aktuelle, nicht-finale Versionen -->
                          <div v-if="!qv.supersededBy && !['Angenommen','Abgelehnt','Ersetzt'].includes(qv.status)"
                            class="qv-status-pills">
                            <button
                              v-for="s in ['Entwurf','Versendet','Angenommen','Abgelehnt']" :key="s"
                              class="qv-pill"
                              :class="{
                                'qv-pill-active': qv.status === s,
                                'qv-pill-entwurf':    s === 'Entwurf',
                                'qv-pill-versendet':  s === 'Versendet',
                                'qv-pill-angenommen': s === 'Angenommen',
                                'qv-pill-abgelehnt':  s === 'Abgelehnt',
                              }"
                              :disabled="qv.status === s"
                              @click="changeQuoteStatus(qv, s)">
                              {{ s === 'Angenommen' ? '✓ ' + s : s === 'Abgelehnt' ? '✗ ' + s : s }}
                            </button>
                          </div>
                          <!-- Finaler Status oder alte Version: nur Badge -->
                          <span v-else-if="['Angenommen','Abgelehnt','Ersetzt'].includes(qv.status) || qv.supersededBy"
                            class="badge"
                            :class="qv.status === 'Angenommen' ? 'badge-success' : qv.status === 'Abgelehnt' ? 'badge-danger' : 'badge-neutral'"
                            style="font-size:10.5px">
                            {{ qv.status === 'Angenommen' ? '✓ ' + qv.status : qv.status === 'Abgelehnt' ? '✗ ' + qv.status : (qv.supersededBy ? 'Verworfen' : qv.status) }}
                          </span>

                          <!-- Aktionsbuttons -->
                          <div class="qv-actions">
                            <!-- Lupe: ALLE Versionen ansehen -->
                            <button class="btn btn-ghost btn-sm btn-icon" title="Anzeigen (neuer Tab)" @click="openDocPrint(qv)">🔍</button>

                            <!-- Drucken + Herunterladen: nur aktuelle Version -->
                            <template v-if="!qv.supersededBy">
                              <button class="btn btn-ghost btn-sm qv-action-print"
                                title="PDF öffnen — Status wird auf ›Versendet‹ gesetzt"
                                @click="printQuote(qv)">
                                📂 Öffnen
                              </button>
                              <button v-if="!['Angenommen','Abgelehnt','Ersetzt'].includes(qv.status)"
                                class="btn btn-ghost btn-sm qv-action-revise"
                                title="Neue Version erstellen — diese Version wird als ›Verworfen‹ markiert"
                                @click="openQuoteRevise(qv)">
                                ↩ Neue Version
                              </button>
                            </template>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div><!-- /qo-main -->

                </div><!-- /qo-layout -->
              </div>

              <div class="pp-foot" style="flex-wrap:wrap;gap:8px">
                <button v-if="!quoteStore.quoteDoc" class="btn btn-sm btn-primary"
                  @click="openQuoteFromProject()">
                  📋 Angebot erstellen
                </button>
                <button class="btn btn-sm btn-ghost" @click="navigate('vertrag')">
                  Überspringen → Vertrag
                </button>
              </div>
            </div>
          </div>

        </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useProjectDetailStore } from '../../stores/useProjectDetailStore'
import { useContractStore }      from '../../stores/useContractStore'
import { useInvoiceStore }       from '../../stores/useInvoiceStore'
import { useQuoteStore }         from '../../stores/useQuoteStore'
import InlineQuoteForm from '../../components/InlineQuoteForm.vue'

export default {
  name: 'ProjectPipelineAngebot',
  components: { InlineQuoteForm },
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
    function onInlineQuoteCreated(...args) { emit('call', 'onInlineQuoteCreated', args) }
    function changeQuoteStatus(...args) { emit('call', 'changeQuoteStatus', args) }
    function printQuote(...args) { emit('call', 'printQuote', args) }
    function downloadQuote(...args) { emit('call', 'downloadQuote', args) }
    function openQuoteRevise(...args) { emit('call', 'openQuoteRevise', args) }
    function openDocPrint(...args) { emit('call', 'openDocPrint', args) }
    function openSidebarEdit(...args) { emit('call', 'openSidebarEdit', args) }
    function formatChangelogVal(...args) { emit('call', 'formatChangelogVal', args) }

    function openQuoteFromProject(...args) { emit('call', 'openQuoteFromProject', args) }

    return {
      project, customer, customerName, settingsData,
      pdStore, contractStore, invoiceStore, quoteStore,
      formatDate, formatDateTime, fmtDate, formatCurrency, fmtFileSize,
      navigate, refresh,
      openQuoteFromProject,
      // action functions
      onInlineQuoteCreated,
      changeQuoteStatus,
      printQuote,
      downloadQuote,
      openQuoteRevise,
      openDocPrint,
      openSidebarEdit,
      formatChangelogVal,
    }
  },
}
</script>
