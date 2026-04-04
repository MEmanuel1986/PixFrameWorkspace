<template>
<div class="pipe-panel pipe-panel-lg" key="anzahlung">

          <div class="pipe-transition">

            <!-- ══ FORMULAR-VIEW: Anzahlungsrechnung erstellen ══════════════ -->
            <div v-if="invoiceStore.depositFormOpen" key="deposit-form">
              <QuoteInvoiceModal
                :inline="true"
                type="invoice"
                :project="project"
                :customer="customer"
                :prefill-items="invoiceStore.invoicePrefillItems"
                :initial-is-deposit="true"
                :hide-articles="true"
                :inject-item="invoiceStore.depositManualItem"
                @manual-add="openManualPopup('deposit')"
                @close="invoiceStore.depositFormOpen = false; invoiceStore.invoicePrefillItems = null; invoiceStore.depositManualItem = null"
                @created="onDepositInvoiceCreated"
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
                :initial-is-deposit="true"
                @close="correctionTarget = null"
                @created="onCorrectionCreated"
              />
            </div>

            <!-- ══ ÜBERSICHT-VIEW: qo-layout (exakt wie Angebot) ══════════════ -->
            <div v-else key="deposit-overview">
              <div class="pp-head">
                <div style="display:flex;align-items:center;gap:8px">
                  <span>💶 Anzahlung</span>
                  <span v-if="invoiceStore.depositNoAgreement && !invoiceStore.depositInvoice" class="pp-optional-tag">übersprungen</span>
                  <span v-if="invoiceStore.depositInvoice" class="badge"
                    :class="invoiceStore.depositInvoice.status === 'Bezahlt' ? 'badge-success' : 'badge-warning'"
                    style="font-size:10px">
                    {{ invoiceStore.depositInvoice.status }}
                  </span>
                </div>
              </div>

              <div class="pp-body qo-body">
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

                  <!-- ═══ Rechte Spalte: Anzahlungsrechnungen ══════════════ -->
                  <div class="qo-main">

                    <!-- Keine Anzahlung vereinbart -->
                    <div v-if="invoiceStore.depositNoAgreement && !invoiceStore.allDepositInvoices.length" class="pp-hint pp-hint-info" style="margin:0 0 14px">
                      ℹ️ Keine Anzahlung vereinbart — Auftrag wird direkt mit der Schlussrechnung abgerechnet.
                      <button class="link-btn" style="display:block;margin-top:6px"
                        @click="resetDepositNoAgreement()">
                        ↩ Doch Anzahlungsrechnung erstellen
                      </button>
                    </div>

                    <!-- Noch keine Rechnung (und Anzahlung vereinbart) -->
                    <div v-else-if="!invoiceStore.allDepositInvoices.length" class="pp-hint pp-hint-info" style="margin:0 0 14px">
                      Noch keine Anzahlungsrechnung erstellt.
                    </div>

                    <!-- Rechnungs-Versionen (qv-row exakt wie Angebot) -->
                    <div v-if="invoiceStore.allDepositInvoices.length" class="quote-versions">
                      <div v-for="(inv, idx) in invoiceStore.allDepositInvoices" :key="inv.id" class="qv-row"
                        :class="{ 'qv-current': idx === 0, 'qv-old': idx > 0 }">

                        <!-- Top: Nummer + Betrag + Badge + Datum -->
                        <div class="qv-top">
                          <span class="qv-num">{{ inv.documentNumber }}</span>
                          <span class="qv-amount">{{ formatCurrency(inv.total) }}</span>
                          <span class="qv-vnum" style="font-size:10px;font-weight:700;background:var(--bg-alt);border:1px solid var(--border);border-radius:4px;padding:1px 5px;margin-right:4px">
                              v{{ invoiceStore.allDepositInvoices.length - idx }}
                            </span>
                            <span v-if="idx === 0" class="qv-version-tag qv-tag-current">Aktuell</span>
                          <span v-else class="qv-version-tag qv-tag-old">Verworfen</span>
                          <span class="qv-date">{{ formatDate(inv.issueDate) }}</span>
                        </div>
                        <!-- Zahlungsinfo wenn bezahlt -->
                        <div v-if="inv.status === 'Bezahlt' && (inv.paidAt || inv.paymentMethod)" class="qv-paid-info">
                          <span class="qv-paid-icon">✅</span>
                          <span v-if="inv.paidAt">{{ formatDate(inv.paidAt) }}</span>
                          <span v-if="inv.paymentMethod" class="qv-paid-method">· {{ inv.paymentMethod }}</span>
                        </div>

                        <!-- Bottom: Status-Pills + Aktionen -->
                        <div class="qv-bottom">
                          <!-- Status-Pills für aktuelle Rechnung -->
                          <template v-if="idx === 0">
                            <div v-if="!['Bezahlt','Storniert'].includes(inv.status)" class="qv-status-pills">
                              <button
                                v-for="s in ['Entwurf','Versendet','Bezahlt']" :key="s"
                                class="qv-pill"
                                :class="{
                                  'qv-pill-active': inv.status === s,
                                  'qv-pill-entwurf':    s === 'Entwurf',
                                  'qv-pill-versendet':  s === 'Versendet',
                                  'qv-pill-angenommen': s === 'Bezahlt',
                                }"
                                :disabled="inv.status === s"
                                @click="changeDepositStatus(inv, s)">
                                {{ s === 'Bezahlt' ? '✓ ' + s : s }}
                              </button>
                            </div>
                            <span v-else class="badge"
                              :class="inv.status === 'Bezahlt' ? 'badge-success' : 'badge-neutral'"
                              style="font-size:10.5px">
                              {{ inv.status === 'Bezahlt' ? '✓ ' + inv.status : inv.status }}
                            </span>
                          </template>
                          <!-- Aktionsbuttons -->
                          <div class="qv-actions">
                            <button class="btn btn-ghost btn-sm btn-icon" title="Ansehen" @click="openDocPrint(inv)">🔍</button>
                            <template v-if="idx === 0">
                              <button class="btn btn-ghost btn-sm qv-action-print"
                                @click="openDocPrint(inv, 'print')"
                                title="PDF öffnen">
                                📂 Öffnen
                              </button>
                              <button v-if="inv.status === 'Entwurf'"
                              class="btn btn-ghost btn-sm" @click="reviseDepositInvoice(inv)">
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
                            </template>
                          </div>
                        </div>

                        <!-- ── Zugehörige Korrekturen & Stornos ── -->
                        <div v-if="invoiceStore.depositRelated.filter(d => d.correctionOf === inv.id).length"
                          class="qv-related-docs">
                          <div class="qv-related-title">Zugehörige Dokumente</div>
                          <div v-for="rel in invoiceStore.depositRelated.filter(d => d.correctionOf === inv.id)"
                            :key="rel.id" class="qv-related-row">
                            <span class="badge" :class="rel.docSubtype === 'cancellation' ? 'badge-danger' : 'badge-neutral'"
                              style="font-size:10px;margin-right:6px">
                              {{ rel.docSubtype === 'cancellation' ? 'STORNO' : 'KORREKTUR' }}
                            </span>
                            <code class="doc-num">{{ rel.documentNumber }}</code>
                            <span class="qv-amount" style="margin-left:8px">{{ formatCurrency(rel.total) }}</span>
                            <span v-if="rel.docSubtype === 'cancellation' && rel.notes" class="text-muted" style="font-size:11px;margin-left:8px;font-style:italic">„{{ rel.notes }}"</span>
                            <!-- Status pills: Korrektur=Entwurf/Versendet/Bezahlt, Storno=Entwurf/Versendet -->
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
                              <button class="btn btn-ghost btn-sm qv-action-print" @click="openDocPrint(rel, 'print')" title="PDF öffnen">📂</button>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div><!-- /qo-main -->
                </div><!-- /qo-layout -->
              </div><!-- /pp-body -->

              <div class="pp-foot" style="flex-wrap:wrap;gap:8px">
                <!-- Keine Rechnung + nicht übersprungen -->
                <template v-if="!invoiceStore.allDepositInvoices.length && !invoiceStore.depositNoAgreement">
                  <button class="btn btn-sm btn-primary" @click="openDepositInvoice()">
                    💶 Anzahlungsrechnung erstellen
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="confirmDepositNo">
                    Ohne Anzahlung fortfahren →
                  </button>
                </template>

                <!-- Übersprungen, keine Rechnung -->
                <template v-else-if="!invoiceStore.allDepositInvoices.length && invoiceStore.depositNoAgreement">
                  <button class="btn btn-sm btn-primary" @click="openDepositInvoice()">
                    💶 Doch Anzahlungsrechnung erstellen
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="navigate('auftrag')">
                    Weiter: Durchführung →
                  </button>
                </template>

                <!-- Rechnung(en) vorhanden -->
                <template v-else>
                  <button v-if="invoiceStore.depositInvoice && invoiceStore.depositInvoice.status === 'Bezahlt'"
                    class="btn btn-sm btn-primary" @click="navigate('auftrag')">
                    Weiter: Durchführung →
                  </button>
                  <button v-if="invoiceStore.depositInvoice && invoiceStore.depositInvoice.status !== 'Bezahlt'"
                    class="btn btn-sm btn-primary" @click="markDepositPaid">
                    ✅ Als bezahlt markieren
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="openDepositInvoice()">
                    ＋ Weitere Anzahlungsrechnung
                  </button>
                </template>
              </div><!-- /pp-foot -->

            </div><!-- /deposit-overview -->
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
  name: 'ProjectPipelineAnzahlung',
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
      // Gibt die aktive (nicht stornierte) Korrekturrechnung zurück, falls vorhanden
      return invoiceStore.depositRelated?.find(d =>
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

    function resetDepositNoAgreement(...args) { emit('call', 'resetDepositNoAgreement', args) }
    function refresh()       { emit('refresh') }


    // ── Action-Funktionen → emit nach ProjectDetail ───────────────────────
    function changeDepositStatus(...args) { emit('call', 'changeDepositStatus', args) }
    function confirmDepositNo(...args) { emit('call', 'confirmDepositNo', args) }
    function markDepositPaid(...args) { emit('call', 'markDepositPaid', args) }
    function openDocPrint(...args) { emit('call', 'openDocPrint', args) }
    function reviseDepositInvoice(...args) { emit('call', 'reviseDepositInvoice', args) }
    function changeRelatedDocStatus(...args) { emit('call', 'changeRelatedDocStatus', args) }
    function openManualPopup(...args) { emit('call', 'openManualPopup', args) }
    function openSidebarEdit(...args) { emit('call', 'openSidebarEdit', args) }
    function refreshDocs(...args) { emit('call', 'refreshDocs', args) }
    function formatChangelogVal(...args) { emit('call', 'formatChangelogVal', args) }

    function openDepositInvoice(...args) { emit('call', 'openDepositInvoice', args) }
    function onDepositInvoiceCreated(...args) { emit('call', 'onDepositInvoiceCreated', args) }

    return {
      project, customer, customerName, settingsData,
      pdStore, contractStore, invoiceStore, quoteStore,
      formatDate, formatDateTime, fmtDate, formatCurrency, fmtFileSize,
      navigate, refresh,
      correctionTarget, stornoTarget, stornoReason, stornoSaving,
      openCorrection, openStorno, confirmStorno, activeCorrection, onCorrectionCreated,
      resetDepositNoAgreement,
      openDepositInvoice, onDepositInvoiceCreated,
      // action functions
      changeDepositStatus,
      confirmDepositNo,
      markDepositPaid,
      openDocPrint, changeRelatedDocStatus, reviseDepositInvoice,
      openManualPopup,
      openSidebarEdit,
      refreshDocs,
      formatChangelogVal,
    }
  },
}
</script>
