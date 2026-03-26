<template>
  <div :class="inline ? 'qim-inline-root' : 'modal-overlay'">
    <div :class="inline ? 'qim--inline' : 'modal modal-xl qim'">

      <!-- ── Header: Modal-Modus ── -->
      <div v-if="!inline" class="qim-header">
        <div>
          <h2 class="qim-title">{{ title }}</h2>
          <span v-if="subtitle" class="qim-sub">{{ subtitle }}</span>
        </div>
        <div class="qim-header-right">
          <div v-if="totals.total > 0" class="qim-live-total">
            <span class="qim-live-label">{{ isInvoice ? 'Rechnungsbetrag' : 'Angebotsbetrag' }}</span>
            <span class="qim-live-amount">{{ fmt(totals.total) }}</span>
          </div>
          <button class="btn btn-ghost btn-sm btn-icon" @click="$emit('close')">✕</button>
        </div>
      </div>

      <!-- ── Header: Inline-Modus (iqf-style, lila Gradient) ── -->
      <div v-else class="iqf-header">
        <div class="iqf-header-left">
          <div class="iqf-title">{{ title }}</div>
          <div v-if="subtitle" class="iqf-sub">{{ subtitle }}</div>
        </div>
        <div class="iqf-header-right">
          <div v-if="totals.total > 0" class="iqf-live-total">
            <span class="iqf-live-label">{{ isInvoice ? 'Rechnungsbetrag' : 'Angebotsbetrag' }}</span>
            <span class="iqf-live-amount">{{ fmt(totals.total) }}</span>
          </div>
          <button class="iqf-x" @click="$emit('close')">✕</button>
        </div>
      </div>

      <!-- ── 2-Spalten-Layout ── -->
      <div class="qim-layout">

        <!-- ═══ Linke Spalte: Auftragsübersicht ════════════════════════════ -->
        <div class="qim-sidebar">
          <div class="qim-sb-title">📁 Auftragsübersicht</div>

          <!-- Auftrag -->
          <div v-if="project" class="qim-sb-section">
            <div class="qim-sb-label">Auftrag</div>
            <div class="qim-sb-val qim-sb-occasion">{{ project.contractData?.occasion || project.projectName }}</div>
            <div class="qim-sb-row" v-if="project.booking">
              <span class="qim-sb-key">📅 Datum</span>
              <span>{{ fmtDate(project.booking) }}{{ project.bookingTime ? ' · ' + project.bookingTime : '' }}</span>
            </div>
            <div class="qim-sb-row" v-if="project.location">
              <span class="qim-sb-key">📍 Ort</span>
              <span>{{ project.location }}</span>
            </div>
            <div class="qim-sb-row" v-if="project.category">
              <span class="qim-sb-key">🏷 Kategorie</span>
              <span>{{ project.category }}</span>
            </div>
          </div>

          <!-- Kunde -->
          <div v-if="customer" class="qim-sb-section">
            <div class="qim-sb-label">Kunde</div>
            <div class="qim-sb-val">
              {{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}
            </div>
            <div v-if="customer.company" class="qim-sb-row">
              <span class="qim-sb-key">🏢</span>
              <span>{{ customer.company }}</span>
            </div>
            <div v-if="customer.email" class="qim-sb-row">
              <span class="qim-sb-key">✉️</span>
              <span class="qim-sb-email">{{ customer.email }}</span>
            </div>
            <div v-if="customer.phone" class="qim-sb-row">
              <span class="qim-sb-key">📞</span>
              <span>{{ customer.phone }}</span>
            </div>
          </div>

          <!-- Leistungen -->
          <div v-if="project && hasServices" class="qim-sb-section">
            <div class="qim-sb-label">Leistungen</div>
            <div class="qim-sb-chips">
              <span v-if="project.fotografie"        class="qim-sb-chip">📷 Fotografie</span>
              <span v-if="project.videografie"       class="qim-sb-chip">🎬 Videografie</span>
              <span v-if="project.glueckwunschkarten" class="qim-sb-chip">💌 Danksagungskarten</span>
              <span v-if="project.gettingReadyEr"    class="qim-sb-chip">💄 GR Er</span>
              <span v-if="project.gettingReadySie"   class="qim-sb-chip">💄 GR Sie</span>
              <span v-if="project.gettingReadyBeide" class="qim-sb-chip">💄 GR Beide</span>
            </div>
          </div>

          <!-- Honorar aus Auftrag -->
          <div v-if="project?.contractData?.pricingModel" class="qim-sb-section">
            <div class="qim-sb-label">Konditionen</div>
            <div class="qim-sb-row" v-if="project.contractData.pricingModel === 'hourly' && project.contractData.hourlyRate">
              <span class="qim-sb-key">💶 Stundensatz</span>
              <span class="qim-sb-val-inline">{{ project.contractData.hourlyRate }} €/h
                <span v-if="project.contractData.estimatedHours"> × {{ project.contractData.estimatedHours }} h</span>
              </span>
            </div>
            <div class="qim-sb-row" v-else-if="project.contractData.pricingModel === 'flat' && project.contractData.flatRate">
              <span class="qim-sb-key">📦 Pauschal</span>
              <span class="qim-sb-val-inline">{{ fmt(project.contractData.flatRate) }}</span>
            </div>
            <div class="qim-sb-row" v-if="project.contractData.depositAmount">
              <span class="qim-sb-key">💳 Anzahlung</span>
              <span class="qim-sb-val-inline">{{ fmt(project.contractData.depositAmount) }}</span>
            </div>
            <div class="qim-sb-row" v-if="project.contractData.paymentDueDays">
              <span class="qim-sb-key">⏱ Zahlungsziel</span>
              <span>{{ project.contractData.paymentDueDays }} Tage</span>
            </div>
          </div>



          <!-- Live-Zusammenfassung -->
          <div class="qim-sb-section qim-sb-summary">
            <div class="qim-sb-label">Dieses Dokument</div>
            <div class="qim-sb-sumrow">
              <span>Positionen</span>
              <span class="qim-sb-badge">{{ form.lineItems.length }}</span>
            </div>
            <div class="qim-sb-sumrow">
              <span>Netto</span>
              <span>{{ fmt(totals.subtotal) }}</span>
            </div>
            <template v-if="!isSmallBusiness">
              <div class="qim-sb-sumrow" v-for="g in totals.taxGroups" :key="g.rate">
                <span>USt. {{ g.rate }}%</span>
                <span>{{ fmt(g.amount) }}</span>
              </div>
            </template>
            <div class="qim-sb-sumrow qim-sb-total">
              <span>{{ isInvoice ? 'Gesamt' : 'Angebotsbetrag' }}</span>
              <span>{{ fmt(totals.total) }}</span>
            </div>
          </div>
        </div>

        <!-- ═══ Rechte Spalte: Formular ════════════════════════════════════ -->
        <div class="qim-body">

          <!-- Card: Basisdaten (kompakt) -->
          <div class="s-card">
            <div class="s-card-head">
              <span class="s-card-title">📋 Basisdaten</span>
            </div>
            <div class="s-card-body">
              <div class="form-group" style="margin-bottom:10px">
                <label>Titel
                  <span v-if="!props.editDoc" class="qim-auto-tag">automatisch</span>
                </label>
                <input v-model="form.name" type="text"
                  :placeholder="autoName || (isInvoice ? 'Rechnung' : 'Angebot')" />
              </div>
              <div class="form-row form-row-4">
                <div class="form-group">
                  <label>Ausstellungsdatum *</label>
                  <input v-model="form.issueDate" type="date" />
                </div>
                <div class="form-group" v-if="isInvoice">
                  <label>Zahlungsziel *</label>
                  <input v-model="form.dueDate" type="date" />
                </div>
                <div class="form-group" v-else>
                  <label>Gültig bis <span class="qim-auto-tag">+14 Tage</span></label>
                  <input v-model="form.deliveryDate" type="date" />
                </div>
                <div class="form-group">
                  <label>Leistungsdatum * <span class="lbl-hint">§14 UStG</span></label>
                  <input v-model="form.serviceDate" type="date" />
                </div>
                <div class="form-group">
                  <label>Zahlungsbedingungen</label>
                  <select v-model="form.paymentTerms">
                    <option value="14 Tage netto">14 Tage netto</option>
                    <option value="30 Tage netto">30 Tage netto</option>
                    <option value="Sofort zahlbar">Sofort zahlbar</option>
                    <option value="Vorauszahlung">Vorauszahlung</option>
                  </select>
                </div>
              </div>
              <div v-if="isInvoice && !correctionOf && !prefillFromQuote && !inline" style="margin-top:12px">
                <label class="qim-deposit-toggle" :class="{ active: form.isDeposit }" @click="form.isDeposit = !form.isDeposit">
                  <span class="qim-deposit-icon">{{ form.isDeposit ? '☑' : '☐' }}</span>
                  <span>
                    <strong>Anzahlungsrechnung</strong>
                    <span class="qim-deposit-hint"> — Teilzahlung, Auftrag gilt als bestätigt wenn bezahlt</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <!-- Card: Positionen — das Herzstück -->
          <div class="s-card">
            <div class="s-card-head">
              <span class="s-card-title">🧾 Positionen</span>
            </div>

            <!-- Schnellerfassung: Artikelkatalog + Manuell -->
            <div class="qim-quickadd-bar" v-if="!hideArticles">
              <div class="qim-quickadd-catalog">
                <span class="qim-quickadd-label">Aus Katalog</span>
                <select v-model="quickAddId" class="qim-catalog-sel" @change="addFromCatalog">
                  <option value="">— Artikel wählen und hinzufügen —</option>
                  <optgroup v-if="activeArticles.length" label="Artikelkatalog">
                    <option v-for="a in activeArticles" :key="a.id" :value="a.id">
                      {{ a.number ? a.number + ' – ' : '' }}{{ a.name }} · {{ fmt(a.priceNet) }}/{{ a.unit }}
                    </option>
                  </optgroup>
                </select>
              </div>
              <button class="btn btn-ghost btn-sm qim-btn-manual" @click="inline ? $emit('manual-add') : addEmptyLine()">
                ✏️ Manuell
              </button>
            </div>

            <!-- Positionstabelle -->
            <div class="qim-table-wrap">
              <table class="qim-table">
                <thead>
                  <tr>
                    <th class="col-nr">#</th>
                    <th>Bezeichnung</th>
                    <th class="col-num">Menge</th>
                    <th class="col-unit">Einheit</th>
                    <th class="col-num">€ netto</th>
                    <th v-if="!isSmallBusiness" class="col-tax">USt.</th>
                    <th class="col-disc">%</th>
                    <th class="col-total text-right">Gesamt</th>
                    <th class="col-del"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in form.lineItems" :key="item._key" class="qim-pos-row">
                    <td class="col-nr qim-pos-nr">{{ idx + 1 }}</td>
                    <td class="col-desc">
                      <input v-model="item.description" class="qim-inp" type="text" placeholder="Bezeichnung…" />
                      <input v-model="item.detail" class="qim-inp qim-inp-sm" type="text" placeholder="Details (optional)…" />
                    </td>
                    <td class="col-num">
                      <input v-model.number="item.quantity" class="qim-inp text-right" type="number" min="0.01" step="0.01" />
                    </td>
                    <td class="col-unit">
                      <select v-model="item.unit" class="qim-inp">
                        <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
                      </select>
                    </td>
                    <td class="col-num">
                      <input v-model.number="item.priceNet" class="qim-inp text-right" type="number" step="0.01" />
                    </td>
                    <td v-if="!isSmallBusiness" class="col-tax">
                      <select v-model.number="item.taxRate" class="qim-inp">
                        <option :value="0">0 %</option>
                        <option :value="7">7 %</option>
                        <option :value="19">19 %</option>
                      </select>
                    </td>
                    <td class="col-disc">
                      <input v-model.number="item.discount" class="qim-inp text-right" type="number" min="0" max="100" step="1" placeholder="0" />
                    </td>
                    <td class="col-total text-right qim-line-total"
                      :class="lineGross(item) < 0 ? 'text-danger' : ''">
                      {{ fmt(lineGross(item)) }}
                    </td>
                    <td class="col-del">
                      <button class="btn btn-ghost btn-sm btn-icon text-danger" @click="removeLine(idx)" title="Entfernen">✕</button>
                    </td>
                  </tr>
                  <tr v-if="!form.lineItems.length">
                    <td colspan="9" class="qim-empty-row">
                      Noch keine Positionen — Artikel aus Katalog wählen oder manuell hinzufügen.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Summenzeile unter Tabelle -->
            <div class="qim-table-footer">
              <div class="qim-discount-wrap">
                <label class="qim-discount-label">Gesamtrabatt</label>
                <div class="inp-unit-wrap qim-discount-inp">
                  <input v-model.number="form.discount" type="number" min="0" max="100" step="0.5" placeholder="0" />
                  <span class="inp-unit">%</span>
                </div>
              </div>
              <div class="qim-totals-box">
                <div class="qim-tot-row" v-if="form.discount > 0">
                  <span>Zwischensumme</span>
                  <span>{{ fmt(rawSubtotal) }}</span>
                </div>
                <div class="qim-tot-row" v-if="form.discount > 0">
                  <span>Rabatt {{ form.discount }}%</span>
                  <span class="text-danger">– {{ fmt(rawSubtotal * form.discount / 100) }}</span>
                </div>
                <div class="qim-tot-row">
                  <span>Netto gesamt</span>
                  <span>{{ fmt(totals.subtotal) }}</span>
                </div>
                <template v-if="!isSmallBusiness">
                  <div class="qim-tot-row" v-for="g in totals.taxGroups" :key="g.rate">
                    <span>USt. {{ g.rate }}% auf {{ fmt(g.base) }}</span>
                    <span>{{ fmt(g.amount) }}</span>
                  </div>
                </template>
                <div v-if="isSmallBusiness" class="qim-tot-row qim-tot-hint">
                  <span>Kein Steuerausweis · §19 UStG</span>
                </div>
                <div class="qim-tot-row qim-tot-grand">
                  <span>{{ isInvoice ? 'Rechnungsbetrag' : 'Angebotsbetrag' }}</span>
                  <span :class="totals.total < 0 ? 'text-danger' : 'text-primary-val'">{{ fmt(totals.total) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card: Rechnungsadresse (kollabierbar) -->
          <div class="s-card">
            <div class="s-card-head qim-addr-head" @click="addrOpen = !addrOpen" style="cursor:pointer;user-select:none">
              <span class="s-card-title">📍 Rechnungsadresse <span class="s-card-hint">(falls abweichend vom Kunden)</span></span>
              <div style="display:flex;align-items:center;gap:8px">
                <span v-if="form.billingAddress?.name" class="s-card-sub">{{ form.billingAddress.name }}</span>
                <span class="qim-chevron" :class="{ open: addrOpen }">›</span>
              </div>
            </div>
            <div v-show="addrOpen" class="s-card-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Name / Firma *</label>
                  <input v-model="form.billingAddress.name" type="text" />
                </div>
                <div class="form-group">
                  <label>USt-IdNr.</label>
                  <input v-model="form.billingAddress.vatId" type="text" placeholder="DE123456789" />
                </div>
              </div>
              <div class="form-group" style="margin-top:12px">
                <label>Straße &amp; Hausnummer</label>
                <input v-model="form.billingAddress.street" type="text" />
              </div>
              <div class="form-row" style="margin-top:12px; grid-template-columns:90px 1fr 1fr">
                <div class="form-group">
                  <label>PLZ</label>
                  <input v-model="form.billingAddress.zipCode" type="text" />
                </div>
                <div class="form-group">
                  <label>Stadt</label>
                  <input v-model="form.billingAddress.city" type="text" />
                </div>
                <div class="form-group">
                  <label>Land</label>
                  <input v-model="form.billingAddress.country" type="text" />
                </div>
              </div>
            </div>
          </div>

          <!-- Card: Texte (kollabierbar) -->
          <div class="s-card">
            <div class="s-card-head qim-addr-head" @click="texteOpen = !texteOpen" style="cursor:pointer;user-select:none">
              <span class="s-card-title">✍️ Texte</span>
              <span class="qim-chevron" :class="{ open: texteOpen }">›</span>
            </div>
            <div v-show="texteOpen" class="s-card-body">
              <div class="form-group">
                <label>Einleitungstext <span class="lbl-hint">über den Positionen</span></label>
                <textarea v-model="form.intro" rows="2"
                  :placeholder="isInvoice ? 'Ich berechne Ihnen für folgende erbrachte Leistungen:' : 'Ich unterbreite Ihnen folgendes Angebot:'">
                </textarea>
              </div>
              <div class="form-group" style="margin-top:12px">
                <label>Fußnotentext <span class="lbl-hint">unter den Positionen</span></label>
                <textarea v-model="form.footer" rows="2"
                  :placeholder="isInvoice ? 'Zahlbar innerhalb von 14 Tagen ohne Abzug.' : 'Das Angebot ist 30 Tage gültig.'">
                </textarea>
              </div>
              <div class="form-group" style="margin-top:12px">
                <label>Interne Notizen <span class="lbl-hint">nicht auf dem Dokument</span></label>
                <textarea v-model="form.notes" rows="1"></textarea>
              </div>
            </div>
          </div>

          <!-- §14 Hinweis -->
          <div class="qim-legal">
            <strong>§14 UStG Pflichtangaben:</strong>
            Ausstellungsdatum · fortlaufende Nummer · Name &amp; Adresse beider Parteien ·
            Leistungsdatum · Menge &amp; Art · Entgelt · Steuerbetrag (oder §19-Hinweis).
          </div>

          <div v-if="formError" class="form-error" style="margin:0 0 4px">{{ formError }}</div>
        </div><!-- /qim-body -->

      </div><!-- /qim-layout -->

      <!-- ── Footer: Modal-Modus ── -->
      <div v-if="!inline" class="modal-footer qim-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Abbrechen</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Wird gespeichert…' : saveLabel }}
        </button>
      </div>

      <!-- ── Footer: Inline-Modus (pp-foot style) ── -->
      <div v-else class="pp-foot" style="flex-wrap:wrap;gap:8px">
        <button class="btn btn-ghost btn-sm" @click="$emit('close')">Abbrechen</button>
        <div v-if="formError" style="flex:0 0 100%;color:var(--danger);font-size:12px">{{ formError }}</div>
        <button class="btn btn-sm btn-primary" :disabled="saving" @click="save">
          {{ saving ? '⏳ …' : saveLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useStore }    from '../stores/useStore'
import { useSettings } from '../stores/useSettings'

export default {
  name: 'QuoteInvoiceModal',
  emits: ['close', 'created', 'updated', 'manual-add'],
  props: {
    type:             { type: String,  default: 'quote' },
    project:          { type: Object,  default: null },
    customer:         { type: Object,  default: null },
    editDoc:          { type: Object,  default: null },
    reviseMode:       { type: Boolean, default: false },
    prefillFromQuote: { type: Object,  default: null },
    correctionOf:     { type: Object,  default: null },
    prefillItems:     { type: Array,   default: null },
    initialIsDeposit: { type: Boolean, default: false },
    inline:           { type: Boolean, default: false },
    injectItem:       { type: Object,  default: null },
    hideArticles:     { type: Boolean, default: false },
  },
  setup(props, { emit }) {
    const store    = useStore()
    const settings = useSettings()

    const addrOpen  = ref(false)
    const texteOpen = ref(false)

    const isInvoice       = computed(() => props.type === 'invoice' || !!props.prefillFromQuote || !!props.correctionOf)
    const hideArticles    = computed(() => props.hideArticles)
    const isSmallBusiness = computed(() => settings.settings?.company?.smallBusiness === true)
    const activeArticles  = computed(() => store.articles.filter(a => a.active !== false))
    const units = ['Stück','Stunde','Pauschal','Pauschale','Tag','Satz','km','Durchfahrt']

    // ── Sidebar helpers ───────────────────────────────────────────────────────
    const hasServices = computed(() => {
      const p = props.project
      return p && (p.fotografie || p.videografie || p.glueckwunschkarten ||
                   p.gettingReadyEr || p.gettingReadySie || p.gettingReadyBeide)
    })

    function fmtDate(iso) {
      if (!iso) return '—'
      return new Date(iso).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    }

    // ── Titles ────────────────────────────────────────────────────────────────
    const title = computed(() => {
      if (props.correctionOf)     return '🔧 Korrekturrechnung erstellen'
      if (props.prefillFromQuote) return '🧾 Rechnung aus Angebot'
      if (props.reviseMode)       return '📄 Neue Angebotsversion'
      if (props.editDoc)          return `✏️ ${isInvoice.value ? 'Rechnung' : 'Angebot'} bearbeiten`
      return isInvoice.value      ? '🧾 Neue Rechnung' : '📋 Neues Angebot'
    })
    const subtitle = computed(() => {
      const parts = []
      if (props.project?.projectName) parts.push(props.project.projectName)
      if (props.customer) {
        const n = `${props.customer.firstName||''} ${props.customer.lastName||''}`.trim() || props.customer.company
        if (n) parts.push(n)
      }
      return parts.join(' · ')
    })
    const saveLabel = computed(() => {
      if (props.correctionOf)     return 'Korrekturrechnung erstellen'
      if (props.prefillFromQuote) return 'Rechnung erstellen'
      if (props.reviseMode)       return 'Neue Version speichern'
      if (props.editDoc)          return 'Änderungen speichern'
      return isInvoice.value      ? 'Rechnung erstellen' : 'Angebot erstellen'
    })

    const autoName = computed(() => {
      if (props.editDoc) return ''
      if (props.correctionOf)     return `Korrektur zu ${props.correctionOf.documentNumber}`
      if (props.prefillFromQuote) return `Rechnung zu ${props.prefillFromQuote.documentNumber}`
      const proj = props.project?.projectName || ''
      const cu   = props.customer
      const name = cu ? (cu.lastName || cu.company || '').trim() : ''
      const suffix = [proj, name].filter(Boolean).join(' – ')
      if (!isInvoice.value) return suffix ? `Angebot ${suffix}` : 'Angebot'
      if (form.value?.isDeposit) return suffix ? `Anzahlungsrechnung ${suffix}` : 'Anzahlungsrechnung'
      return suffix ? `Schlussrechnung ${suffix}` : 'Rechnung'
    })

    // ── Build billing address ────────────────────────────────────────────────
    function billingFromCustomer() {
      const cu = props.customer
      if (!cu) return { name:'', street:'', zipCode:'', city:'', country:'Deutschland', vatId:'' }
      const name   = [cu.title, cu.firstName, cu.lastName].filter(Boolean).join(' ') || cu.company || ''
      const street = cu.street ? `${cu.street}${cu.houseNumber ? ' '+cu.houseNumber : ''}` : ''
      return { name, street, zipCode:cu.zipCode||'', city:cu.city||'', country:'Deutschland', vatId:cu.vatId||'' }
    }

    const today = new Date().toISOString().slice(0,10)
    const due14 = new Date(Date.now()+14*86400000).toISOString().slice(0,10)

    let keyCounter = 0
    function mkLine(d={}) {
      const defaultTax = isSmallBusiness.value ? 0 : 19
      return { _key:++keyCounter, articleId:d.articleId||null, description:d.description||'',
        detail:d.detail||'', quantity:d.quantity??1, unit:d.unit||'Pauschal',
        priceNet:d.priceNet??0, taxRate:d.taxRate??defaultTax, discount:d.discount??0 }
    }

    function buildForm() {
      if (props.editDoc) {
        return { ...props.editDoc,
          billingAddress: { ...props.editDoc.billingAddress },
          lineItems: (props.editDoc.lineItems||[]).map(i=>({...i, _key:++keyCounter})) }
      }
      if (props.prefillFromQuote) {
        const q = props.prefillFromQuote
        return { name:`Rechnung zu ${q.documentNumber}`, issueDate:today, dueDate:due14,
          serviceDate:q.serviceDate||'', deliveryDate:'', paymentTerms:q.paymentTerms||'14 Tage netto',
          billingAddress:{...q.billingAddress},
          lineItems:q.lineItems.map(i=>({...i, _key:++keyCounter})),
          discount:q.discount||0, intro:q.intro||'', footer:q.footer||'', notes:'' }
      }
      if (props.correctionOf) {
        const o = props.correctionOf
        // Korrektur: Originalbeträge beibehalten — User passt manuell an
        // (Negierung nur bei Stornorechnung, die vom Backend erstellt wird)
        const items = (o.lineItems||[]).map(i=>({...i, _key:++keyCounter}))
        return { name:`Korrektur zu ${o.documentNumber}`, issueDate:today, dueDate:due14,
          serviceDate:o.serviceDate||'', deliveryDate:'', paymentTerms:o.paymentTerms||'14 Tage netto',
          billingAddress:{...o.billingAddress}, lineItems:items, discount:0,
          intro:`Korrektur zur Rechnung ${o.documentNumber}`, footer:o.footer||'', notes:'' }
      }
      const prefilled = (props.prefillItems||[]).map(i=>mkLine(i))
      const expiry14 = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0,10) })()
      return { name:'', issueDate:today, dueDate:due14, deliveryDate:expiry14,
        serviceDate: props.project?.booking
          ? new Date(props.project.booking).toISOString().slice(0,10) : '',
        paymentTerms:'14 Tage netto', billingAddress:billingFromCustomer(),
        lineItems:prefilled, discount:0, isDeposit: props.initialIsDeposit || false,
        intro:settings.settings?.company?.invoiceIntro||'',
        footer:settings.settings?.company?.invoiceFooter||'', notes:'' }
    }

    const expiry14init = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0,10) })()
    const form = ref({ name:'', issueDate:today, dueDate:due14, deliveryDate:expiry14init, serviceDate:'',
      paymentTerms:'14 Tage netto',
      billingAddress:{name:'',street:'',zipCode:'',city:'',country:'Deutschland',vatId:''},
      lineItems:[], discount:0, isDeposit:false, intro:'', footer:'', notes:'' })

    // ── Line items ───────────────────────────────────────────────────────────
    const quickAddId = ref('')
    function addFromCatalog() {
      if (!quickAddId.value) return
      const a = store.articles.find(a => a.id === quickAddId.value)
      if (a) form.value.lineItems.push(mkLine({
        articleId:a.id, description:a.name, detail:a.description,
        quantity:1, unit:a.unit, priceNet:a.priceNet, taxRate:a.taxRate }))
      quickAddId.value = ''
    }

    // Inject externally-created line item (from manual popup in ProjectDetail)
    watch(() => props.injectItem, (item) => {
      if (!item) return
      form.value.lineItems.push(mkLine(item))
    })

    function addEmptyLine()  { form.value.lineItems.push(mkLine()) }
    function removeLine(idx) { form.value.lineItems.splice(idx, 1) }

    // ── Totals ───────────────────────────────────────────────────────────────
    function lineNet(item)   { return (Number(item.quantity)||0)*(Number(item.priceNet)||0)*(1-(Number(item.discount)||0)/100) }
    function lineGross(item) { return lineNet(item)*(1+(Number(item.taxRate)||0)/100) }
    const rawSubtotal = computed(() => form.value.lineItems.reduce((s,i)=>s+lineNet(i), 0))
    const totals = computed(() => {
      const taxMap = {}; let sub = 0
      for (const i of form.value.lineItems) {
        const net=lineNet(i); const rate=Number(i.taxRate)||0
        sub+=net
        if (!taxMap[rate]) taxMap[rate]={rate,base:0,amount:0}
        taxMap[rate].base+=net; taxMap[rate].amount+=net*rate/100
      }
      const od=(Number(form.value.discount)||0)/100
      if (od>0) { sub*=(1-od); for(const k of Object.keys(taxMap)){taxMap[k].base*=(1-od);taxMap[k].amount*=(1-od)} }
      const groups = isSmallBusiness.value ? [] : Object.values(taxMap).filter(g=>g.rate>0)
      return { subtotal:sub, taxGroups:groups, total:sub+groups.reduce((s,g)=>s+g.amount,0) }
    })

    function fmt(n) { return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n??0) }

    // ── Save ─────────────────────────────────────────────────────────────────
    const saving=ref(false), formError=ref('')
    function validate() {
      if (!form.value.name?.trim())        return 'Titel ist erforderlich.'
      if (!form.value.issueDate)           return 'Ausstellungsdatum ist erforderlich.'
      if (!form.value.isDeposit && !form.value.serviceDate?.trim()) return 'Leistungsdatum ist erforderlich (§14 UStG).'
      if (isInvoice.value && !form.value.dueDate) return 'Zahlungsziel ist erforderlich.'
      if (!form.value.lineItems.length)    return 'Mindestens eine Position erforderlich.'
      if (!form.value.billingAddress?.name?.trim()) return 'Rechnungsadresse (Name) ist erforderlich.'
      return null
    }
    async function save() {
      formError.value = validate() || ''
      if (formError.value) return
      saving.value = true
      try {
        const customerId = props.customer?.id || props.project?.customerId
          || props.editDoc?.customerId || props.prefillFromQuote?.customerId
          || props.correctionOf?.customerId
        const projectId = props.project?.id || props.editDoc?.projectId
          || props.prefillFromQuote?.projectId || props.correctionOf?.projectId || null
        const payload = {
          ...form.value,
          type: isInvoice.value ? 'invoice' : props.type,
          customerId, projectId,
          lineItems: form.value.lineItems.map(({_key,...rest})=>rest),
          paymentInfo: settings.settings?.company?.iban
            ? `${settings.settings.company.bankName||''} · IBAN: ${settings.settings.company.iban} · BIC: ${settings.settings.company.bic||''}`.trim()
            : '',
        }
        let result
        if (props.editDoc && !props.reviseMode)
          result = await store.editDocument(props.editDoc.id, payload), emit('updated', result)
        else if (props.reviseMode && props.editDoc)
          result = await store.reviseDocument(props.editDoc.id, payload), emit('created', result)
        else if (props.prefillFromQuote)
          result = await store.invoiceFromQuote(props.prefillFromQuote.id, payload), emit('created', result)
        else if (props.correctionOf)
          result = await store.correctInvoice(props.correctionOf.id, payload), emit('created', result)
        else
          result = await store.generateDocument(payload), emit('created', result)
        // Für 'created': kein 'close' emittieren — der @created-Handler übernimmt das Schließen
        // Nur bei 'updated' (Bearbeitung) schließen wir via 'close'
        if (props.editDoc && !props.reviseMode) emit('close')
      } catch (e) {
        formError.value = 'Fehler: ' + (e.response?.data?.error || e.message)
      } finally { saving.value = false }
    }

    watch(() => form.value?.isDeposit, () => {
      if (props.editDoc || props.prefillFromQuote || props.correctionOf) return
      const cur = form.value?.name || ''
      const looksAuto = !cur || cur.startsWith('Anzahlungsrechnung') || cur.startsWith('Schlussrechnung') || cur.startsWith('Rechnung')
      if (looksAuto) form.value.name = autoName.value
    })

    onMounted(async () => {
      await settings.fetchSettings()
      await store.fetchArticles()
      form.value = buildForm()
      if (props.initialIsDeposit) form.value.isDeposit = true
      if (!props.editDoc) form.value.name = autoName.value
      if (!props.editDoc && !props.prefillFromQuote && !props.correctionOf) {
        if (!form.value.intro  && settings.settings?.company?.invoiceIntro)
          form.value.intro  = settings.settings.company.invoiceIntro
        if (!form.value.footer && settings.settings?.company?.invoiceFooter)
          form.value.footer = settings.settings.company.invoiceFooter
      }
    })

    const inline = computed(() => props.inline)
    return {
      props, inline, form, isInvoice, isSmallBusiness, activeArticles, units,
      title, subtitle, saveLabel, autoName,
      addrOpen, texteOpen, hasServices, fmtDate,
      quickAddId, addFromCatalog, addEmptyLine, removeLine,
      lineNet, lineGross, rawSubtotal, totals, fmt,
      saving, formError, save,
    }
  }
}
</script>

<style>

/* ════════════════════════════════════════════════════════
   INLINE-MODUS  (exakt wie InlineQuoteForm / .iqf)
   ════════════════════════════════════════════════════════ */

.qim-inline-root { display: contents; }

/* Äußere Hülle — 1:1 wie .iqf */
.qim--inline {
  background: var(--surface);
  border-radius: var(--radius-xl, 14px);
  overflow: visible;
  border: 1px solid var(--border);
  box-shadow: 0 0 0 3px rgba(79,70,229,.07), 0 6px 24px rgba(0,0,0,.09);
  display: flex; flex-direction: column;
  width: 100%;
}

/* Header — vollständig definiert (nicht auf ProjectDetail-CSS vertrauen) */
.iqf-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 14px 20px 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white; flex-shrink: 0;
}
.iqf-header-left  { flex: 1; min-width: 0; }
.iqf-header-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.iqf-title { font-size: 14px; font-weight: 700; }
.iqf-sub   { font-size: 11.5px; opacity: .72; margin-top: 2px; }
.iqf-live-total  { display: flex; flex-direction: column; align-items: flex-end; }
.iqf-live-label  { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; opacity: .75; }
.iqf-live-amount { font-size: 15px; font-weight: 800; }
.iqf-x {
  background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.25);
  color: white; width: 26px; height: 26px; border-radius: 50%;
  cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background .12s;
}
.iqf-x:hover { background: rgba(255,255,255,.28); }

/* Body-Wrapper — 1:1 wie .iqf-body */
.qim--inline .qim-layout {
  display: grid;
  grid-template-columns: 230px 1fr;
  align-items: stretch;
  overflow: visible !important;
}

/* Sidebar — 1:1 wie .iqf-sidebar */
.qim--inline .qim-sidebar {
  background: var(--bg-alt, #f8fafc) !important;
  border-right: 1px solid var(--border) !important;
  padding: 16px 14px !important;
  display: flex; flex-direction: column; gap: 0 !important;
  overflow: visible !important;
}
.qim--inline .qim-sb-title {
  font-size: 9.5px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .8px; color: var(--text-muted); margin-bottom: 10px;
}
.qim--inline .qim-sb-section {
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.qim--inline .qim-sb-section:last-child { border-bottom: none; }
.qim--inline .qim-sb-label {
  font-size: 9px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .7px; color: var(--text-muted); margin-bottom: 5px;
}
.qim--inline .qim-sb-val { font-size: 12px; font-weight: 600; color: var(--text); }
.qim--inline .qim-sb-occasion { font-size: 12.5px !important; font-weight: 700 !important; color: var(--primary) !important; margin-bottom: 4px; }
.qim--inline .qim-sb-val-inline { font-size: 12px; font-weight: 700; color: var(--text); }
.qim--inline .qim-sb-row { font-size: 11px; color: var(--text-2); margin-top: 2px; gap: 5px; }
.qim--inline .qim-sb-key { font-size: 10.5px; }
.qim--inline .qim-sb-chip {
  font-size: 10px; padding: 1px 7px; border-radius: 99px;
  background: var(--primary-light); color: var(--primary);
  border: 1px solid rgba(99,102,241,.2); font-weight: 600;
}
.qim--inline .qim-sb-notes { font-size: 11px; color: var(--text-2); line-height: 1.5; white-space: pre-wrap; max-height: 70px; overflow-y: auto; }
.qim--inline .qim-sb-summary { background: var(--surface) !important; border-radius: var(--radius); padding: 8px 10px !important; margin-top: 4px; }
.qim--inline .qim-sb-sumrow { font-size: 11.5px; padding: 2px 0; }
.qim--inline .qim-sb-total { font-weight: 800; font-size: 12.5px; padding-top: 4px; }
.qim--inline .qim-sb-badge { font-size: 9.5px; padding: 1px 7px; }

/* Formular-Body — 1:1 wie .iqf-main */
.qim--inline .qim-body {
  padding: 16px 20px !important;
  background: var(--bg-alt) !important;
  display: flex !important; flex-direction: column !important; gap: 12px !important;
  overflow: visible !important;
}

/* Cards — 1:1 wie .iqf-card */
.qim--inline .s-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px) !important;
  overflow: visible !important; /* override .s-card { overflow:hidden } */
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
  flex-shrink: 0;
}
.qim--inline .s-card-head {
  padding: 9px 14px !important;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.qim--inline .s-card-title { font-size: 12.5px; font-weight: 700; }
.qim--inline .s-card-body  { padding: 12px 14px !important; }

/* Form-Felder — 1:1 wie .iqf-main .form-group */
.qim--inline .form-group { display: flex; flex-direction: column; gap: 4px; }
.qim--inline .form-group label {
  font-size: 10.5px !important; font-weight: 600 !important;
  text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted) !important;
  display: block; margin-bottom: 0;
}
.qim--inline .form-group input,
.qim--inline .form-group select,
.qim--inline .form-group textarea {
  width: 100% !important; padding: 7px 9px !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius, 6px) !important;
  background: var(--surface) !important;
  color: var(--text) !important; font-size: 12.5px !important;
  font-family: inherit !important; min-height: 32px !important;
  box-sizing: border-box !important; transition: border-color .12s;
  box-shadow: none !important;
}
.qim--inline .form-group input:focus,
.qim--inline .form-group select:focus,
.qim--inline .form-group textarea:focus {
  outline: none !important; border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px rgba(79,70,229,.08) !important;
}
.qim--inline .form-group textarea { resize: vertical !important; min-height: 56px !important; }

/* Schnellerfassung */
.qim--inline .qim-quickadd-bar { padding: 8px 14px !important; background: var(--bg-alt); border-bottom: 1px solid var(--border); }
.qim--inline .qim-quickadd-label { font-size: 10px; font-weight: 700; }
.qim--inline .qim-catalog-sel { padding: 5px 8px; font-size: 12px; }

/* Positionstabelle */
.qim--inline .qim-table { font-size: 12.5px; }
.qim--inline .qim-table thead th { padding: 6px 4px; font-size: 9px; font-weight: 700; letter-spacing: .5px; }
.qim--inline .qim-table td { padding: 3px 3px; }
.qim--inline .qim-inp { padding: 4px 5px; font-size: 12px; }
.qim--inline .qim-inp-sm { font-size: 10.5px; color: var(--text-muted); }
.qim--inline .qim-pos-nr { font-size: 10.5px; }
.qim--inline .qim-line-total { font-size: 12.5px; padding-top: 7px; }
.qim--inline .qim-empty-row { font-size: 12.5px; padding: 20px; }

/* Summen-Bar */
.qim--inline .qim-table-footer { padding: 12px 14px !important; }
.qim--inline .qim-totals-box { min-width: 240px; padding: 8px 12px; }
.qim--inline .qim-tot-row { font-size: 12px; padding: 3px 0; }
.qim--inline .qim-tot-grand { font-size: 13.5px; padding-top: 5px; }
.qim--inline .qim-discount-label { font-size: 11px; }
.qim--inline .qim-discount-inp input { font-size: 12.5px; min-height: 30px; }
.qim--inline .qim-legal { font-size: 11.5px; }
.qim--inline .qim-auto-tag { font-size: 9.5px; }

/* Deposit-Toggle */
.qim--inline .qim-deposit-toggle { font-size: 13px; }
.qim--inline .qim-deposit-hint   { font-size: 11.5px; }

/* Footer — 1:1 wie .iqf-footer */
.qim--inline .pp-foot {
  display: flex !important;
  justify-content: flex-end !important;
  gap: 10px !important;
  align-items: center !important;
  padding: 12px 20px !important;
  border-top: 1px solid var(--border) !important;
  background: var(--surface) !important;
  flex-shrink: 0 !important;
  flex-wrap: wrap !important;
}

/* Responsive */
@media (max-width: 700px) {
  .qim--inline .qim-layout { grid-template-columns: 1fr; }
  .qim--inline .qim-sidebar { border-right: none; border-bottom: 1px solid var(--border); }
}

/* ── Modal shell ── */
.qim {
  max-width: 1180px; width: 100%; max-height: 94vh;
  display: flex; flex-direction: column; overflow: hidden;
}
.qim-header {
  border-bottom: 1px solid var(--border); flex-shrink: 0;
  padding: 14px 20px;
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px;
}
.qim-title { font-size: 15px; font-weight: 700; margin: 0; color: var(--text); }
.qim-sub   { font-size: 12px; color: var(--text-muted); display: block; margin-top: 2px; }
.qim-header-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.qim-live-total { display: flex; flex-direction: column; align-items: flex-end; }
.qim-live-label  { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); }
.qim-live-amount { font-size: 16px; font-weight: 800; color: var(--primary); }

/* ── 2-Spalten-Layout ── */
.qim-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  flex: 1; min-height: 0; overflow: hidden;
}

/* ── Sidebar ── */
.qim-sidebar {
  background: var(--bg-alt);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 16px 14px;
  display: flex; flex-direction: column; gap: 0;
  flex-shrink: 0;
}
.qim-sb-title {
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px;
  color: var(--text-muted); margin-bottom: 12px;
}
.qim-sb-section {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.qim-sb-section:last-child { border-bottom: none; }
.qim-sb-label {
  font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .7px;
  color: var(--text-muted); margin-bottom: 6px;
}
.qim-sb-val {
  font-size: 12.5px; font-weight: 600; color: var(--text); margin-bottom: 4px;
  line-height: 1.4;
}
.qim-sb-occasion { font-size: 13px; font-weight: 700; color: var(--primary); }
.qim-sb-val-inline { font-size: 12px; font-weight: 700; color: var(--text); }
.qim-sb-row {
  display: flex; align-items: baseline; gap: 6px;
  font-size: 11.5px; color: var(--text-2); margin-top: 3px; line-height: 1.4;
}
.qim-sb-key { color: var(--text-muted); font-size: 11px; flex-shrink: 0; }
.qim-sb-email { word-break: break-all; }
.qim-sb-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.qim-sb-chip {
  font-size: 10.5px; padding: 2px 7px; border-radius: 99px;
  background: var(--primary-light); color: var(--primary);
  border: 1px solid rgba(99,102,241,.2); font-weight: 600;
}
.qim-sb-notes {
  font-size: 11.5px; color: var(--text-2); line-height: 1.5;
  white-space: pre-wrap; max-height: 80px; overflow-y: auto;
}
/* Live-Zusammenfassung */
.qim-sb-summary { background: var(--surface); border-radius: var(--radius); padding: 10px 12px !important; margin-top: 4px; }
.qim-sb-sumrow {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; color: var(--text-2); padding: 3px 0;
  border-bottom: 1px solid var(--border);
}
.qim-sb-sumrow:last-child { border-bottom: none; }
.qim-sb-total { font-weight: 800; font-size: 13px; color: var(--text); padding-top: 6px; }
.qim-sb-badge { background: var(--primary); color: white; font-size: 10px; font-weight: 700; border-radius: 99px; padding: 1px 7px; }

/* ── Scrollable form body ── */
.qim-body {
  flex: 1; min-height: 0; overflow-y: auto;
  padding: 16px 20px;
  background: var(--bg-alt);
  display: flex; flex-direction: column; gap: 12px;
}

/* ── Footer ── */
.qim-footer {
  border-top: 1px solid var(--border); flex-shrink: 0;
  padding: 12px 20px;
  display: flex; justify-content: flex-end; gap: 10px;
  background: var(--surface);
}

/* ── s-card ── */
.s-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px); overflow: hidden;
  box-shadow: var(--shadow-sm); flex-shrink: 0;
}
.s-card-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 16px; border-bottom: 1px solid var(--border);
  background: var(--surface); flex-wrap: wrap;
}
.s-card-title { font-size: 12.5px; font-weight: 700; color: var(--text); }
.s-card-sub   { font-size: 11.5px; color: var(--text-muted); }
.s-card-body  { padding: 14px 16px; }

/* ── Form helpers ── */
.qim .form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 0; }
.qim .form-group label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .4px; color: var(--text-muted); display: block; margin-bottom: 0;
}
.qim .form-group input,
.qim .form-group select,
.qim .form-group textarea {
  display: block !important; width: 100% !important;
  padding: 7px 10px !important; border: 1px solid var(--border) !important;
  border-radius: var(--radius, 6px) !important; background: var(--surface) !important;
  color: var(--text) !important; font-size: 13px !important; font-family: inherit !important;
  line-height: 1.4 !important; min-height: 34px !important;
  box-sizing: border-box !important; transition: border-color .12s, box-shadow .12s;
}
.qim .form-group input:focus,
.qim .form-group select:focus,
.qim .form-group textarea:focus {
  outline: none !important; border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px rgba(79,70,229,.08) !important;
}
.qim .form-group textarea { resize: vertical !important; min-height: 64px !important; }
.qim .form-group select   { cursor: pointer !important; }
.qim .lbl-hint {
  font-size: 10px; font-weight: 400; text-transform: none; letter-spacing: 0;
  color: #b45309; background: #fef3c7; border-radius: 4px; padding: 1px 5px; margin-left: 4px;
}

/* ── Schnellerfassung-Bar ── */
.qim-quickadd-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; background: var(--bg-alt); border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.qim-quickadd-catalog { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; }
.qim-quickadd-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted); white-space: nowrap; }
.qim-catalog-sel {
  flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text); font-size: 12.5px; font-family: inherit; cursor: pointer;
}
.qim-catalog-sel:focus { outline: none; border-color: var(--primary); }
.qim-btn-manual { flex-shrink: 0; }

/* ── Positions table ── */
.qim-table-wrap { overflow-x: auto; }
.qim-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.qim-table thead th {
  padding: 7px 5px; text-align: left; border-bottom: 1px solid var(--border);
  font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  color: var(--text-muted); background: var(--bg-alt);
}
.qim-table tbody tr   { border-bottom: 1px solid var(--border); }
.qim-table tbody tr:last-child { border-bottom: none; }
.qim-table td { padding: 4px 3px; vertical-align: top; }
.qim-pos-row:hover { background: var(--bg-alt); }

.col-nr   { width: 26px; }
.col-num  { width: 72px; }
.col-unit { width: 86px; }
.col-tax  { width: 58px; }
.col-disc { width: 52px; }
.col-total{ width: 90px; }
.col-del  { width: 28px; }
.col-desc { min-width: 160px; }

.qim-pos-nr     { color: var(--text-muted); font-size: 11px; text-align: center; padding-top: 8px; }
.qim-line-total { padding-right: 4px; padding-top: 8px; font-weight: 600; font-size: 13px; }
.qim-empty-row  { text-align: center; color: var(--text-muted); font-size: 13px; padding: 24px; }

.qim-inp {
  width: 100%; padding: 5px 5px;
  border: 1px solid transparent; border-radius: 4px;
  background: transparent; color: var(--text); font-size: 12.5px; font-family: inherit;
}
.qim-inp:hover  { border-color: var(--border); background: var(--bg-alt); }
.qim-inp:focus  { outline: none; border-color: var(--primary); background: var(--surface); box-shadow: 0 0 0 2px rgba(79,70,229,.1); }
.qim-inp.text-right { text-align: right; }
.qim-inp-sm { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

/* ── Table footer: Rabatt + Summen ── */
.qim-table-footer {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
  padding: 14px 16px; border-top: 1px solid var(--border); flex-wrap: wrap;
}
.qim-discount-wrap { display: flex; align-items: center; gap: 10px; padding-top: 4px; }
.qim-discount-label { font-size: 11.5px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
.qim-discount-inp { width: 110px; }
.qim-discount-inp input {
  border: 1px solid var(--border) !important; border-radius: var(--radius) 0 0 var(--radius) !important;
  padding: 7px 10px !important; font-size: 13px !important; background: var(--surface) !important;
  font-family: inherit; flex: 1; min-height: 34px !important;
}
.qim-discount-inp input:focus { outline: none !important; border-color: var(--primary) !important; }

.qim-totals-box {
  min-width: 260px; background: var(--bg-alt);
  border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px;
}
.qim-tot-row {
  display: flex; justify-content: space-between; gap: 16px;
  padding: 4px 0; font-size: 12.5px; color: var(--text-2);
  border-bottom: 1px solid var(--border);
}
.qim-tot-row:last-child { border-bottom: none; }
.qim-tot-grand { font-size: 14px; font-weight: 800; color: var(--text); padding-top: 6px; }
.qim-tot-hint  { font-size: 11px; color: var(--text-muted); font-style: italic; }
.text-primary-val { color: var(--primary); font-weight: 800; }

/* ── Chevron ── */
.qim-chevron { font-size: 18px; color: var(--text-muted); transition: transform .18s; }
.qim-chevron.open { transform: rotate(90deg); }

/* ── Legal hint ── */
.qim-legal {
  padding: 10px 14px;
  background: #fffbeb; color: #92400e;
  border: 1px solid #fde68a; border-radius: var(--radius);
  font-size: 11.5px; line-height: 1.6; flex-shrink: 0;
}

/* ── inp-unit ── */
.qim .inp-unit-wrap { display: flex; align-items: center; }
.qim .inp-unit-wrap input { border-radius: var(--radius) 0 0 var(--radius); flex: 1; }
.qim .inp-unit {
  padding: 7px 10px; background: var(--bg-alt);
  border: 1px solid var(--border); border-left: none;
  border-radius: 0 var(--radius) var(--radius) 0;
  font-size: 12.5px; color: var(--text-muted);
}

/* ── Anzahlungs-Toggle ── */
.qim-deposit-toggle {
  display: flex; align-items: flex-start; gap: 8px; cursor: pointer;
  padding: 9px 12px; border-radius: var(--radius);
  border: 1.5px solid var(--border); background: var(--surface);
  font-size: 13px; transition: border-color .15s, background .15s; user-select: none;
}
.qim-deposit-toggle:hover  { border-color: var(--primary); background: var(--primary-light); }
.qim-deposit-toggle.active { border-color: var(--primary); background: var(--primary-light); }
.qim-deposit-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; color: var(--primary); }
.qim-deposit-hint { color: var(--text-muted); font-size: 11.5px; }

.qim-auto-tag {
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px;
  padding: 1px 6px; border-radius: 10px; margin-left: 6px; vertical-align: middle;
  background: rgba(79,70,229,.1); color: var(--primary);
}

/* ── Responsive: schmale Fenster ── */
@media (max-width: 780px) {
  .qim-layout { grid-template-columns: 1fr; }
  .qim-sidebar { border-right: none; border-bottom: 1px solid var(--border); max-height: 200px; overflow-y: auto; }
}

.s-card-hint {
  font-size: 11px; font-weight: 400;
  color: var(--text-muted); margin-left: 4px;
}

/* ── Form rows ── */
.form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-row-3 { grid-template-columns: 1fr 1fr 1fr; }
.form-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
</style>
