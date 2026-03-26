<template>
  <div class="iqf">

    <!-- ── Header ── -->
    <div class="iqf-header">
      <div class="iqf-header-left">
        <div class="iqf-title">
          {{ reviseMode ? '📄 Neue Angebotsversion' : editDoc ? '✏️ Angebot bearbeiten' : '📋 Neues Angebot' }}
        </div>
        <div class="iqf-sub" v-if="subtitle">{{ subtitle }}</div>
      </div>
      <div class="iqf-header-right">
        <div v-if="totals.total > 0" class="iqf-live-total">
          <span class="iqf-live-label">Angebotsbetrag</span>
          <span class="iqf-live-amount">{{ fmt(totals.total) }}</span>
        </div>
        <span v-if="formError" class="iqf-error-tag">⚠ {{ formError }}</span>
        <button class="iqf-x" @click="$emit('cancel')">✕</button>
      </div>
    </div>

    <!-- ── 2-Spalten: Sidebar + Formular ── -->
    <div class="iqf-body">
      <div class="iqf-layout">

        <!-- ═══ Linke Spalte: Auftragsübersicht ═══════════════════════ -->
        <aside class="iqf-sidebar">
          <div class="iqf-sb-title">📁 Auftragsübersicht</div>

          <!-- Auftrag -->
          <div v-if="project" class="iqf-sb-section">
            <div class="iqf-sb-label">Auftrag</div>
            <div class="iqf-sb-occasion">{{ project.contractData?.occasion || project.projectName }}</div>
            <div class="iqf-sb-row" v-if="project.booking">
              <span class="iqf-sb-key">📅</span>
              <span>{{ fmtDate(project.booking) }}{{ project.bookingTime ? ' · ' + project.bookingTime : '' }}</span>
            </div>
            <div class="iqf-sb-row" v-if="project.location">
              <span class="iqf-sb-key">📍</span><span>{{ project.location }}</span>
            </div>
            <div class="iqf-sb-row" v-if="project.category">
              <span class="iqf-sb-key">🏷</span><span>{{ project.category }}</span>
            </div>
          </div>

          <!-- Kunde -->
          <div v-if="customer" class="iqf-sb-section">
            <div class="iqf-sb-label">Kunde</div>
            <div class="iqf-sb-val">
              {{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}
            </div>
            <div v-if="customer.company" class="iqf-sb-row">
              <span class="iqf-sb-key">🏢</span><span>{{ customer.company }}</span>
            </div>
            <div v-if="customer.email" class="iqf-sb-row">
              <span class="iqf-sb-key">✉️</span><span class="iqf-sb-email">{{ customer.email }}</span>
            </div>
            <div v-if="customer.phone" class="iqf-sb-row">
              <span class="iqf-sb-key">📞</span><span>{{ customer.phone }}</span>
            </div>
          </div>

          <!-- Leistungen -->
          <div v-if="hasServices" class="iqf-sb-section">
            <div class="iqf-sb-label">Leistungen</div>
            <div class="iqf-sb-chips">
              <span v-if="project.fotografie"          class="iqf-sb-chip">📷 Fotografie</span>
              <span v-if="project.videografie"         class="iqf-sb-chip">🎬 Videografie</span>
              <span v-if="project.glueckwunschkarten"  class="iqf-sb-chip">💌 Danksagungen</span>
              <span v-if="project.gettingReadyEr"      class="iqf-sb-chip">💄 GR Er</span>
              <span v-if="project.gettingReadySie"     class="iqf-sb-chip">💄 GR Sie</span>
              <span v-if="project.gettingReadyBeide"   class="iqf-sb-chip">💄 GR Beide</span>
            </div>
          </div>

          <!-- Konditionen aus Vertrag -->
          <div v-if="project?.contractData?.pricingModel" class="iqf-sb-section">
            <div class="iqf-sb-label">Konditionen</div>
            <template v-if="project.contractData.pricingModel === 'hourly' && project.contractData.hourlyRate">
              <div class="iqf-sb-row">
                <span class="iqf-sb-key">💶</span>
                <span class="iqf-sb-strong">
                  {{ project.contractData.hourlyRate }} €/h
                  <span v-if="project.contractData.estimatedHours"> × {{ project.contractData.estimatedHours }} h</span>
                </span>
              </div>
            </template>
            <template v-else-if="project.contractData.pricingModel === 'flat' && project.contractData.flatRate">
              <div class="iqf-sb-row">
                <span class="iqf-sb-key">📦</span>
                <span class="iqf-sb-strong">{{ fmt(project.contractData.flatRate) }} Pauschal</span>
              </div>
            </template>
            <div class="iqf-sb-row" v-if="project.contractData.depositAmount">
              <span class="iqf-sb-key">💳</span>
              <span>Anzahlung {{ fmt(project.contractData.depositAmount) }}</span>
            </div>
            <div class="iqf-sb-row" v-if="project.contractData.paymentDueDays">
              <span class="iqf-sb-key">⏱</span>
              <span>{{ project.contractData.paymentDueDays }} Tage Zahlungsziel</span>
            </div>
          </div>



          <!-- Live-Zusammenfassung -->
          <div class="iqf-sb-section iqf-sb-summary">
            <div class="iqf-sb-label">Dieses Angebot</div>
            <div class="iqf-sb-sumrow">
              <span>Positionen</span>
              <span class="iqf-sb-badge">{{ form.lineItems.length }}</span>
            </div>
            <div class="iqf-sb-sumrow">
              <span>Netto</span><span>{{ fmt(totals.subtotal) }}</span>
            </div>
            <template v-if="!isSmallBusiness">
              <div class="iqf-sb-sumrow" v-for="g in totals.taxGroups" :key="g.rate">
                <span>USt. {{ g.rate }}%</span><span>{{ fmt(g.amount) }}</span>
              </div>
            </template>
            <div class="iqf-sb-sumrow iqf-sb-total">
              <span>Angebotsbetrag</span><span>{{ fmt(totals.total) }}</span>
            </div>
          </div>
        </aside>

        <!-- ═══ Rechte Spalte: Formular ═══════════════════════════════ -->
        <div class="iqf-main">

          <!-- Basisdaten -->
          <div class="iqf-card">
            <div class="iqf-card-head"><span class="iqf-card-title">📋 Basisdaten</span></div>
            <div class="iqf-card-body">
              <div class="form-group" style="margin-bottom:10px">
                <label>
                  Titel
                  <span v-if="!editDoc" class="iqf-auto-tag">automatisch</span>
                </label>
                <input v-model="form.name" type="text" :placeholder="autoName || 'Angebot'" />
              </div>
              <div class="iqf-grid-4">
                <div class="form-group">
                  <label>Ausstellungsdatum *</label>
                  <input v-model="form.issueDate" type="date" />
                </div>
                <div class="form-group">
                  <label>Gültig bis <span class="iqf-auto-tag">+14 Tage</span></label>
                  <input v-model="form.deliveryDate" type="date" />
                </div>
                <div class="form-group">
                  <label>Leistungsdatum * <span class="iqf-warn-tag">§14 UStG</span></label>
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
            </div>
          </div>

          <!-- Positionen -->
          <div class="iqf-card">
            <div class="iqf-card-head">
              <span class="iqf-card-title">🧾 Positionen</span>
            </div>

            <!-- Schnellerfassung -->
            <div class="iqf-quickadd">
              <div class="iqf-quickadd-left">
                <span class="iqf-quickadd-label">Aus Katalog</span>
                <select v-model="quickAddId" class="iqf-catalog-sel" @change="addFromCatalog">
                  <option value="">— Artikel wählen und hinzufügen —</option>
                  <optgroup v-if="activeArticles.length" label="Artikelkatalog">
                    <option v-for="a in activeArticles" :key="a.id" :value="a.id">
                      {{ a.number ? a.number + ' – ' : '' }}{{ a.name }} · {{ fmt(a.priceNet) }}/{{ a.unit }}
                    </option>
                  </optgroup>
                </select>
              </div>
              <button class="btn btn-ghost btn-sm" @click="openManualPopup">✏️ Manuell</button>
            </div>

            <!-- Tabelle -->
            <div class="iqf-table-wrap">
              <table class="iqf-table">
                <thead>
                  <tr>
                    <th class="tcol-nr">#</th>
                    <th>Bezeichnung</th>
                    <th class="tcol-num">Menge</th>
                    <th class="tcol-unit">Einheit</th>
                    <th class="tcol-num">€ netto</th>
                    <th v-if="!isSmallBusiness" class="tcol-tax">USt.</th>
                    <th class="tcol-disc">%</th>
                    <th class="tcol-total text-right">Gesamt</th>
                    <th class="tcol-del"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in form.lineItems" :key="item._key" class="iqf-pos-row">
                    <td class="tcol-nr iqf-pos-nr">{{ idx + 1 }}</td>
                    <td class="tcol-desc">
                      <input v-model="item.description" class="iqf-inp" type="text" placeholder="Bezeichnung…" />
                      <input v-model="item.detail" class="iqf-inp iqf-inp-sm" type="text" placeholder="Details (optional)…" />
                    </td>
                    <td class="tcol-num">
                      <input v-model.number="item.quantity" class="iqf-inp text-right" type="number" min="0.01" step="0.01" />
                    </td>
                    <td class="tcol-unit">
                      <select v-model="item.unit" class="iqf-inp">
                        <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
                      </select>
                    </td>
                    <td class="tcol-num">
                      <input v-model.number="item.priceNet" class="iqf-inp text-right" type="number" step="0.01" />
                    </td>
                    <td v-if="!isSmallBusiness" class="tcol-tax">
                      <select v-model.number="item.taxRate" class="iqf-inp">
                        <option :value="0">0 %</option>
                        <option :value="7">7 %</option>
                        <option :value="19">19 %</option>
                      </select>
                    </td>
                    <td class="tcol-disc">
                      <input v-model.number="item.discount" class="iqf-inp text-right"
                        type="number" min="0" max="100" step="1" placeholder="0" />
                    </td>
                    <td class="tcol-total text-right iqf-line-total"
                      :class="lineGross(item) < 0 ? 'text-danger' : ''">
                      {{ fmt(lineGross(item)) }}
                    </td>
                    <td class="tcol-del">
                      <button class="btn btn-ghost btn-sm btn-icon text-danger"
                        @click="removeLine(idx)" title="Entfernen">✕</button>
                    </td>
                  </tr>
                  <tr v-if="!form.lineItems.length">
                    <td colspan="9" class="iqf-empty-row">
                      Noch keine Positionen — wähle einen Artikel aus dem Katalog oder füge Positionen manuell hinzu.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Summen direkt unter Tabelle -->
            <div class="iqf-totals-bar">
              <div class="iqf-discount-wrap">
                <label class="iqf-discount-label">Gesamtrabatt</label>
                <div class="iqf-discount-inp">
                  <input v-model.number="form.discount" type="number" min="0" max="100" step="0.5" placeholder="0" />
                  <span class="iqf-unit-suffix">%</span>
                </div>
              </div>
              <div class="iqf-totals-box">
                <div class="iqf-tot-row" v-if="form.discount > 0">
                  <span>Zwischensumme</span><span>{{ fmt(rawSubtotal) }}</span>
                </div>
                <div class="iqf-tot-row" v-if="form.discount > 0">
                  <span>Rabatt {{ form.discount }}%</span>
                  <span class="text-danger">– {{ fmt(rawSubtotal * form.discount / 100) }}</span>
                </div>
                <div class="iqf-tot-row">
                  <span>Netto gesamt</span><span>{{ fmt(totals.subtotal) }}</span>
                </div>
                <template v-if="!isSmallBusiness">
                  <div class="iqf-tot-row" v-for="g in totals.taxGroups" :key="g.rate">
                    <span>USt. {{ g.rate }}% auf {{ fmt(g.base) }}</span><span>{{ fmt(g.amount) }}</span>
                  </div>
                </template>
                <div v-if="isSmallBusiness" class="iqf-tot-row iqf-tot-hint">
                  <span>Kein Steuerausweis · §19 UStG</span>
                </div>
                <div class="iqf-tot-row iqf-tot-grand">
                  <span>Angebotsbetrag</span>
                  <span :class="totals.total < 0 ? 'text-danger' : 'iqf-total-accent'">
                    {{ fmt(totals.total) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Rechnungsadresse (kollabierbar) -->
          <div class="iqf-card">
            <div class="iqf-card-head iqf-card-toggle" @click="addrOpen = !addrOpen">
              <span class="iqf-card-title">📍 Rechnungsadresse <span class="iqf-hint-tag">(falls abweichend)</span></span>
              <div style="display:flex;align-items:center;gap:8px">
                <span v-if="form.billingAddress?.name" class="iqf-card-sub">{{ form.billingAddress.name }}</span>
                <span class="iqf-chevron" :class="{ open: addrOpen }">›</span>
              </div>
            </div>
            <div v-show="addrOpen" class="iqf-card-body">
              <div class="iqf-grid-2">
                <div class="form-group">
                  <label>Name / Firma *</label>
                  <input v-model="form.billingAddress.name" type="text" />
                </div>
                <div class="form-group">
                  <label>USt-IdNr.</label>
                  <input v-model="form.billingAddress.vatId" type="text" placeholder="DE123456789" />
                </div>
              </div>
              <div class="form-group" style="margin-top:10px">
                <label>Straße &amp; Hausnummer</label>
                <input v-model="form.billingAddress.street" type="text" />
              </div>
              <div class="iqf-grid-3addr" style="margin-top:10px">
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

          <!-- Texte (kollabierbar) -->
          <div class="iqf-card">
            <div class="iqf-card-head iqf-card-toggle" @click="texteOpen = !texteOpen">
              <span class="iqf-card-title">✍️ Einleitungs- &amp; Fußtext</span>
              <span class="iqf-chevron" :class="{ open: texteOpen }">›</span>
            </div>
            <div v-show="texteOpen" class="iqf-card-body">
              <div class="form-group">
                <label>Einleitungstext <span class="iqf-hint-tag">über den Positionen</span></label>
                <textarea v-model="form.intro" rows="2"
                  placeholder="Ich unterbreite Ihnen folgendes Angebot:"></textarea>
              </div>
              <div class="form-group" style="margin-top:10px">
                <label>Fußnotentext <span class="iqf-hint-tag">unter den Positionen</span></label>
                <textarea v-model="form.footer" rows="2"
                  placeholder="Das Angebot ist 30 Tage gültig."></textarea>
              </div>
              <div class="form-group" style="margin-top:10px">
                <label>Interne Notizen <span class="iqf-hint-tag">nicht auf dem Dokument</span></label>
                <textarea v-model="form.notes" rows="1"></textarea>
              </div>
            </div>
          </div>

        </div><!-- /iqf-main -->
      </div><!-- /iqf-layout -->
    </div><!-- /iqf-body -->

    <!-- ── Footer ── -->
    <div class="iqf-footer">
      <button class="btn btn-secondary" @click="$emit('cancel')">Abbrechen</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">
        {{ saving ? '⏳ Wird gespeichert…'
          : reviseMode ? 'Neue Version speichern'
          : editDoc   ? 'Änderungen speichern'
          : 'Angebot erstellen → Auftragsseite' }}
      </button>
    </div>

  </div>

  <!-- ══ Manuelle Position Popup ═══════════════════════════════════════════ -->
  <Teleport to="body">
    <div v-if="manualPopup" class="iqf-overlay" @click.self="manualPopup = false">
      <div class="iqf-mpop">
        <div class="iqf-mpop-head">
          <div>
            <div class="iqf-mpop-title">✏️ Manuelle Position</div>
            <div class="iqf-mpop-sub">Position wird direkt ins Angebot übernommen</div>
          </div>
          <button class="iqf-mpop-x" @click="manualPopup = false">✕</button>
        </div>
        <div class="iqf-mpop-body">
          <div class="iqf-mpop-row">
            <label class="iqf-mpop-lbl">Bezeichnung *</label>
            <input v-model="manualForm.description" class="iqf-mpop-inp" type="text"
              placeholder="z. B. Bildbearbeitung, Reisekostenpauschale…"
              @keydown.enter="saveManualLine" ref="manualDescInput" />
          </div>
          <div class="iqf-mpop-row">
            <label class="iqf-mpop-lbl">Details (optional)</label>
            <input v-model="manualForm.detail" class="iqf-mpop-inp" type="text"
              placeholder="Zusatzinfo für das Angebot" />
          </div>
          <div class="iqf-mpop-row2">
            <div class="iqf-mpop-row">
              <label class="iqf-mpop-lbl">Menge</label>
              <input v-model.number="manualForm.quantity" class="iqf-mpop-inp" type="number" min="0.01" step="0.01" />
            </div>
            <div class="iqf-mpop-row">
              <label class="iqf-mpop-lbl">Einheit</label>
              <select v-model="manualForm.unit" class="iqf-mpop-inp">
                <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
              </select>
            </div>
          </div>
          <div class="iqf-mpop-row2">
            <div class="iqf-mpop-row">
              <label class="iqf-mpop-lbl">€ netto (Einzelpreis)</label>
              <input v-model.number="manualForm.priceNet" class="iqf-mpop-inp" type="number" step="0.01" placeholder="0.00" />
            </div>
            <div class="iqf-mpop-row" v-if="!isSmallBusiness">
              <label class="iqf-mpop-lbl">USt. %</label>
              <select v-model.number="manualForm.taxRate" class="iqf-mpop-inp">
                <option :value="0">0 %</option>
                <option :value="7">7 %</option>
                <option :value="19">19 %</option>
              </select>
            </div>
            <div class="iqf-mpop-row">
              <label class="iqf-mpop-lbl">Rabatt %</label>
              <input v-model.number="manualForm.discount" class="iqf-mpop-inp" type="number" min="0" max="100" step="1" placeholder="0" />
            </div>
          </div>
          <div class="iqf-mpop-preview" v-if="manualForm.priceNet">
            <span class="iqf-mpop-prev-lbl">Zeilenbetrag brutto</span>
            <span class="iqf-mpop-prev-val">
              {{ new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(
                (manualForm.quantity||0) * (manualForm.priceNet||0) *
                (1-(manualForm.discount||0)/100) * (1+(manualForm.taxRate||0)/100)
              ) }}
            </span>
          </div>
        </div>
        <div class="iqf-mpop-foot">
          <button class="btn btn-ghost btn-sm" @click="manualPopup = false">Abbrechen</button>
          <button class="btn btn-primary btn-sm" @click="saveManualLine"
            :disabled="!manualForm.description.trim()">
            ✓ Position hinzufügen
          </button>
        </div>
      </div>
    </div>
  </Teleport>

</template>

<script>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useStore }    from '../stores/useStore'
import { useSettings } from '../stores/useSettings'

export default {
  name: 'InlineQuoteForm',
  emits: ['created', 'cancel'],
  props: {
    project:      { type: Object,  default: null },
    customer:     { type: Object,  default: null },
    editDoc:      { type: Object,  default: null },
    reviseMode:   { type: Boolean, default: false },
    prefillItems: { type: Array,   default: null },
  },
  setup(props, { emit }) {
    const store    = useStore()
    const settings = useSettings()

    const addrOpen  = ref(false)
    const texteOpen = ref(false)
    const saving    = ref(false)
    const formError = ref('')

    const isSmallBusiness = computed(() => settings.settings?.company?.smallBusiness === true)
    const activeArticles  = computed(() => store.articles.filter(a => a.active !== false))
    const units = ['Stück','Stunde','Pauschal','Pauschale','Tag','Satz','km','Durchfahrt']

    // ── Sidebar helpers ───────────────────────────────────────────────────
    const hasServices = computed(() => {
      const p = props.project
      return p && (p.fotografie || p.videografie || p.glueckwunschkarten ||
                   p.gettingReadyEr || p.gettingReadySie || p.gettingReadyBeide)
    })
    function fmtDate(iso) {
      if (!iso) return '—'
      return new Date(iso).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    }

    // ── Subtitle & Auto-Titel ─────────────────────────────────────────────
    const subtitle = computed(() => {
      const parts = []
      if (props.project?.projectName) parts.push(props.project.projectName)
      if (props.customer) {
        const n = `${props.customer.firstName||''} ${props.customer.lastName||''}`.trim()
                  || props.customer.company || ''
        if (n) parts.push(n)
      }
      return parts.join(' · ')
    })

    const autoName = computed(() => {
      if (props.editDoc && !props.reviseMode) return ''
      const proj = props.project?.projectName || ''
      const cu   = props.customer
      const name = cu ? (cu.lastName || cu.company || '').trim() : ''
      const suffix = [proj, name].filter(Boolean).join(' – ')
      return suffix ? `Angebot ${suffix}` : 'Angebot'
    })

    // ── Billing address aus Kunde ─────────────────────────────────────────
    function billingFromCustomer() {
      const cu = props.customer
      if (!cu) return { name:'', street:'', zipCode:'', city:'', country:'Deutschland', vatId:'' }
      const name   = [cu.title, cu.firstName, cu.lastName].filter(Boolean).join(' ') || cu.company || ''
      const street = cu.street ? `${cu.street}${cu.houseNumber ? ' '+cu.houseNumber : ''}` : ''
      return { name, street, zipCode:cu.zipCode||'', city:cu.city||'', country:'Deutschland', vatId:cu.vatId||'' }
    }

    // ── Form aufbauen ─────────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0,10)
    let keyCounter = 0
    function mkLine(d={}) {
      const defaultTax = isSmallBusiness.value ? 0 : 19
      return {
        _key: ++keyCounter,
        articleId:   d.articleId   || null,
        description: d.description || '',
        detail:      d.detail      || '',
        quantity:    d.quantity    ?? 1,
        unit:        d.unit        || 'Pauschal',
        priceNet:    d.priceNet    ?? 0,
        taxRate:     d.taxRate     ?? defaultTax,
        discount:    d.discount    ?? 0,
      }
    }

    function buildForm() {
      if (props.editDoc) {
        return {
          ...props.editDoc,
          billingAddress: { ...props.editDoc.billingAddress },
          lineItems: (props.editDoc.lineItems || []).map(i => ({ ...i, _key: ++keyCounter })),
        }
      }
      const prefilled = (props.prefillItems || []).map(i => mkLine(i))
      return {
        name:         '',
        issueDate:    today,
        deliveryDate: (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0,10) })(),
        serviceDate:  props.project?.booking
                        ? new Date(props.project.booking).toISOString().slice(0,10) : '',
        paymentTerms: '14 Tage netto',
        billingAddress: billingFromCustomer(),
        lineItems:    prefilled,
        discount:     0,
        intro:        settings.settings?.company?.invoiceIntro  || '',
        footer:       settings.settings?.company?.invoiceFooter || '',
        notes:        '',
      }
    }

    const form = ref({
      name: '', issueDate: today, deliveryDate: '', serviceDate: '',
      paymentTerms: '14 Tage netto',
      billingAddress: { name:'', street:'', zipCode:'', city:'', country:'Deutschland', vatId:'' },
      lineItems: [], discount: 0, intro: '', footer: '', notes: '',
    })

    // ── Positionen ────────────────────────────────────────────────────────
    const quickAddId = ref('')
    function addFromCatalog() {
      if (!quickAddId.value) return
      const a = store.articles.find(a => a.id === quickAddId.value)
      if (a) form.value.lineItems.push(mkLine({
        articleId: a.id, description: a.name, detail: a.description,
        quantity: 1, unit: a.unit, priceNet: a.priceNet, taxRate: a.taxRate,
      }))
      quickAddId.value = ''
    }
    function removeLine(idx) { form.value.lineItems.splice(idx, 1) }

    // ── Manuell-Position Popup ────────────────────────────────────────────
    const manualPopup     = ref(false)
    const manualDescInput = ref(null)
    const manualForm      = ref({ description: '', detail: '', quantity: 1, unit: 'Pauschal', priceNet: 0, taxRate: 19, discount: 0 })

    function openManualPopup() {
      const defaultTax = isSmallBusiness.value ? 0 : 19
      manualForm.value = { description: '', detail: '', quantity: 1, unit: 'Pauschal', priceNet: 0, taxRate: defaultTax, discount: 0 }
      manualPopup.value = true
      nextTick(() => manualDescInput.value?.focus())
    }

    function saveManualLine() {
      if (!manualForm.value.description.trim()) return
      form.value.lineItems.push(mkLine({ ...manualForm.value }))
      manualPopup.value = false
    }

    // ── Summen ────────────────────────────────────────────────────────────
    function lineNet(item) {
      return (Number(item.quantity)||0) * (Number(item.priceNet)||0) * (1 - (Number(item.discount)||0)/100)
    }
    function lineGross(item) {
      return lineNet(item) * (1 + (Number(item.taxRate)||0)/100)
    }
    const rawSubtotal = computed(() => form.value.lineItems.reduce((s,i) => s + lineNet(i), 0))
    const totals = computed(() => {
      const taxMap = {}; let sub = 0
      for (const i of form.value.lineItems) {
        const net = lineNet(i); const rate = Number(i.taxRate) || 0
        sub += net
        if (!taxMap[rate]) taxMap[rate] = { rate, base:0, amount:0 }
        taxMap[rate].base   += net
        taxMap[rate].amount += net * rate / 100
      }
      const od = (Number(form.value.discount)||0) / 100
      if (od > 0) {
        sub *= (1 - od)
        for (const k of Object.keys(taxMap)) {
          taxMap[k].base   *= (1 - od)
          taxMap[k].amount *= (1 - od)
        }
      }
      const groups = isSmallBusiness.value ? [] : Object.values(taxMap).filter(g => g.rate > 0)
      return { subtotal: sub, taxGroups: groups, total: sub + groups.reduce((s,g) => s + g.amount, 0) }
    })
    function fmt(n) {
      return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n ?? 0)
    }

    // ── Angebotsgültigkeit: 14 Tage nach Ausstellungsdatum wenn leer ────────
    function autoSetExpiry() {
      if (!form.value.deliveryDate && form.value.issueDate) {
        const d = new Date(form.value.issueDate)
        d.setDate(d.getDate() + 14)
        form.value.deliveryDate = d.toISOString().slice(0, 10)
      }
    }

    // ── Speichern ─────────────────────────────────────────────────────────
    function validate() {
      if (!form.value.name?.trim())               return 'Titel ist erforderlich.'
      if (!form.value.issueDate)                  return 'Ausstellungsdatum ist erforderlich.'
      if (!form.value.serviceDate?.trim())        return 'Leistungsdatum ist erforderlich (§14 UStG).'
      if (!form.value.lineItems.length)           return 'Mindestens eine Position erforderlich.'
      if (!form.value.billingAddress?.name?.trim()) return 'Rechnungsadresse (Name) ist erforderlich.'
      return null
    }

    async function save() {
      autoSetExpiry()
      formError.value = validate() || ''
      if (formError.value) return
      saving.value = true
      try {
        const customerId = props.customer?.id || props.project?.customerId
        const projectId  = props.project?.id  || null
        const payload = {
          ...form.value,
          type: 'quote',
          customerId, projectId,
          lineItems: form.value.lineItems.map(({ _key, ...rest }) => rest),
          paymentInfo: settings.settings?.company?.iban
            ? `${settings.settings.company.name||''} · ${settings.settings.company.bankName||''} · IBAN: ${settings.settings.company.iban} · BIC: ${settings.settings.company.bic||''}`.replace(/^\s*·\s*/, '').trim()
            : '',
        }
        let result
        if (props.editDoc && !props.reviseMode)
          result = await store.editDocument(props.editDoc.id, payload)
        else if (props.reviseMode && props.editDoc)
          result = await store.reviseDocument(props.editDoc.id, payload)
        else
          result = await store.generateDocument(payload)

        emit('created', result)
      } catch (e) {
        formError.value = 'Fehler: ' + (e.response?.data?.error || e.message)
      } finally {
        saving.value = false
      }
    }

    // ── Mount ─────────────────────────────────────────────────────────────
    onMounted(async () => {
      await settings.fetchSettings()
      await store.fetchArticles()
      form.value = buildForm()
      if (!props.editDoc || props.reviseMode) {
        form.value.name = autoName.value
      }
      if (!props.editDoc) {
        if (!form.value.intro  && settings.settings?.company?.invoiceIntro)
          form.value.intro  = settings.settings.company.invoiceIntro
        if (!form.value.footer && settings.settings?.company?.invoiceFooter)
          form.value.footer = settings.settings.company.invoiceFooter
      }
    })

    return {
      form, isSmallBusiness, activeArticles, units,
      subtitle, autoName, addrOpen, texteOpen,
      hasServices, fmtDate,
      editDoc: props.editDoc, reviseMode: props.reviseMode,
      quickAddId, addFromCatalog, removeLine,
      manualPopup, manualForm, manualDescInput, openManualPopup, saveManualLine,
      lineNet, lineGross, rawSubtotal, totals, fmt,
      saving, formError, save,
    }
  },
}
</script>

<style scoped>
/* ── Wrapper ── */
.iqf {
  background: var(--surface);
  border-radius: var(--radius-xl, 14px);
  overflow: visible;
  border: 1px solid var(--border);
  box-shadow: 0 0 0 3px rgba(79,70,229,.07), 0 6px 24px rgba(0,0,0,.09);
}

/* ── Header ── */
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
.iqf-live-total { display: flex; flex-direction: column; align-items: flex-end; }
.iqf-live-label  { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; opacity: .75; }
.iqf-live-amount { font-size: 15px; font-weight: 800; }
.iqf-error-tag { font-size: 11.5px; color: #fca5a5; background: rgba(239,68,68,.2); border-radius: 6px; padding: 3px 10px; white-space: nowrap; }
.iqf-x {
  background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.25);
  color: white; width: 26px; height: 26px; border-radius: 50%;
  cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background .12s;
}
.iqf-x:hover { background: rgba(255,255,255,.28); }

/* ── Body (scrollable) ── */
.iqf-body { overflow: visible; }

/* ── 2-Spalten ── */
.iqf-layout {
  display: grid;
  grid-template-columns: 230px 1fr;
  align-items: stretch;
  min-height: 100%;
}

/* ── Sidebar ── */
.iqf-sidebar {
  background: var(--bg-alt, #f8fafc);
  border-right: 1px solid var(--border);
  padding: 16px 14px;
  display: flex; flex-direction: column; gap: 0;
  overflow-y: auto;
}
.iqf-sb-title {
  font-size: 9.5px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .8px; color: var(--text-muted); margin-bottom: 10px;
}
.iqf-sb-section { padding: 10px 0; border-bottom: 1px solid var(--border); }
.iqf-sb-section:last-child { border-bottom: none; }
.iqf-sb-label {
  font-size: 9px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .7px; color: var(--text-muted); margin-bottom: 5px;
}
.iqf-sb-occasion { font-size: 12.5px; font-weight: 700; color: var(--primary); margin-bottom: 4px; line-height: 1.3; }
.iqf-sb-val { font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.iqf-sb-strong { font-size: 12px; font-weight: 700; color: var(--text); }
.iqf-sb-row {
  display: flex; align-items: baseline; gap: 5px;
  font-size: 11px; color: var(--text-2); margin-top: 2px; line-height: 1.4;
}
.iqf-sb-key { color: var(--text-muted); font-size: 10.5px; flex-shrink: 0; }
.iqf-sb-email { word-break: break-all; }
.iqf-sb-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.iqf-sb-chip {
  font-size: 10px; padding: 1px 7px; border-radius: 99px;
  background: var(--primary-light); color: var(--primary);
  border: 1px solid rgba(99,102,241,.2); font-weight: 600;
}
.iqf-sb-notes {
  font-size: 11px; color: var(--text-2); line-height: 1.5;
  white-space: pre-wrap; max-height: 70px; overflow-y: auto;
}
/* Live-Summary */
.iqf-sb-summary {
  background: var(--surface); border-radius: var(--radius);
  padding: 8px 10px !important; margin-top: 4px;
}
.iqf-sb-sumrow {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11.5px; color: var(--text-2); padding: 2px 0;
  border-bottom: 1px solid var(--border);
}
.iqf-sb-sumrow:last-child { border-bottom: none; }
.iqf-sb-total { font-weight: 800; font-size: 12.5px; color: var(--text); padding-top: 4px; }
.iqf-sb-badge {
  background: var(--primary); color: white;
  font-size: 9.5px; font-weight: 700; border-radius: 99px; padding: 1px 7px;
}

/* ── Formular-Spalte ── */
.iqf-main {
  padding: 16px 20px;
  background: var(--bg-alt, #f8fafc);
  display: flex; flex-direction: column; gap: 12px;
}

/* ── Cards ── */
.iqf-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px); overflow: visible;
  box-shadow: 0 1px 4px rgba(0,0,0,.04); flex-shrink: 0;
}
.iqf-card-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 9px 14px; border-bottom: 1px solid var(--border); background: var(--surface);
}
.iqf-card-toggle { cursor: pointer; user-select: none; }
.iqf-card-toggle:hover { background: var(--bg-alt); }
.iqf-card-title { font-size: 12.5px; font-weight: 700; color: var(--text); }
.iqf-card-sub   { font-size: 11px; color: var(--text-muted); }
.iqf-card-body  { padding: 12px 14px; }

/* ── Grids ── */
.iqf-grid-2    { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.iqf-grid-3    { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.iqf-grid-4    { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
.iqf-grid-3addr{ display: grid; grid-template-columns: 80px 1fr 1fr; gap: 10px; }

/* ── Form groups im Formular ── */
.iqf-main .form-group { display: flex; flex-direction: column; gap: 4px; }
.iqf-main .form-group label {
  font-size: 10.5px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .4px; color: var(--text-muted);
}
.iqf-main .form-group input,
.iqf-main .form-group select,
.iqf-main .form-group textarea {
  width: 100%; padding: 7px 9px; border: 1px solid var(--border);
  border-radius: var(--radius, 6px); background: var(--surface);
  color: var(--text); font-size: 12.5px; font-family: inherit;
  min-height: 32px; box-sizing: border-box; transition: border-color .12s;
}
.iqf-main .form-group input:focus,
.iqf-main .form-group select:focus,
.iqf-main .form-group textarea:focus {
  outline: none; border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79,70,229,.08);
}
.iqf-main .form-group textarea { resize: vertical; min-height: 56px; }

/* ── Tags ── */
.iqf-auto-tag  { font-size: 9.5px; font-weight: 600; text-transform: uppercase; background: rgba(79,70,229,.1); color: var(--primary); border-radius: 10px; padding: 1px 6px; margin-left: 5px; vertical-align: middle; }
.iqf-warn-tag  { font-size: 9.5px; font-weight: 600; color: #b45309; background: #fef3c7; border-radius: 4px; padding: 1px 5px; margin-left: 4px; vertical-align: middle; }
.iqf-hint-tag  { font-size: 9.5px; font-weight: 400; color: var(--text-muted); text-transform: none; letter-spacing: 0; margin-left: 4px; }

/* ── Schnellerfassung ── */
.iqf-quickadd {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; background: var(--bg-alt);
  border-bottom: 1px solid var(--border); flex-wrap: wrap;
}
.iqf-quickadd-left  { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 160px; }
.iqf-quickadd-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted); white-space: nowrap; }
.iqf-catalog-sel {
  flex: 1; padding: 5px 8px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text); font-size: 12px; font-family: inherit; cursor: pointer;
}
.iqf-catalog-sel:focus { outline: none; border-color: var(--primary); }

/* ── Tabelle ── */
.iqf-table-wrap { overflow-x: auto; }
.iqf-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.iqf-table thead th {
  padding: 6px 4px; text-align: left; border-bottom: 1px solid var(--border);
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text-muted); background: var(--bg-alt);
}
.iqf-table tbody tr { border-bottom: 1px solid var(--border); }
.iqf-table tbody tr:last-child { border-bottom: none; }
.iqf-table td { padding: 3px 3px; vertical-align: top; }
.iqf-pos-row:hover { background: var(--bg-alt); }

.tcol-nr   { width: 24px; }
.tcol-num  { width: 68px; }
.tcol-unit { width: 84px; }
.tcol-tax  { width: 56px; }
.tcol-disc { width: 50px; }
.tcol-total{ width: 88px; }
.tcol-del  { width: 28px; }
.tcol-desc { min-width: 150px; }

.iqf-pos-nr    { color: var(--text-muted); font-size: 10.5px; text-align: center; padding-top: 8px; }
.iqf-line-total{ padding-right: 4px; padding-top: 7px; font-weight: 600; font-size: 12.5px; }
.iqf-empty-row { text-align: center; color: var(--text-muted); font-size: 12.5px; padding: 20px; }

.iqf-inp {
  width: 100%; padding: 4px 5px;
  border: 1px solid transparent; border-radius: 4px;
  background: transparent; color: var(--text); font-size: 12px; font-family: inherit;
}
.iqf-inp:hover { border-color: var(--border); background: var(--bg-alt); }
.iqf-inp:focus { outline: none; border-color: var(--primary); background: var(--surface); box-shadow: 0 0 0 2px rgba(79,70,229,.1); }
.iqf-inp.text-right { text-align: right; }
.iqf-inp-sm { font-size: 10.5px; color: var(--text-muted); margin-top: 2px; }

/* ── Summen-Bar ── */
.iqf-totals-bar {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 12px 14px; border-top: 1px solid var(--border); flex-wrap: wrap;
}
.iqf-discount-wrap { display: flex; align-items: center; gap: 8px; padding-top: 3px; }
.iqf-discount-label { font-size: 11px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
.iqf-discount-inp {
  display: flex; align-items: center; width: 100px;
}
.iqf-discount-inp input {
  flex: 1; padding: 6px 8px; border: 1px solid var(--border);
  border-radius: var(--radius, 6px) 0 0 var(--radius, 6px);
  background: var(--surface); color: var(--text); font-size: 12.5px;
  font-family: inherit; min-height: 30px;
}
.iqf-discount-inp input:focus { outline: none; border-color: var(--primary); }
.iqf-unit-suffix {
  padding: 6px 8px; background: var(--bg-alt);
  border: 1px solid var(--border); border-left: none;
  border-radius: 0 var(--radius, 6px) var(--radius, 6px) 0;
  font-size: 12px; color: var(--text-muted);
}
.iqf-totals-box {
  min-width: 240px; background: var(--bg-alt);
  border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 12px;
}
.iqf-tot-row {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 3px 0; font-size: 12px; color: var(--text-2); border-bottom: 1px solid var(--border);
}
.iqf-tot-row:last-child { border-bottom: none; }
.iqf-tot-grand { font-size: 13.5px; font-weight: 800; color: var(--text); padding-top: 5px; }
.iqf-tot-hint  { font-size: 10.5px; color: var(--text-muted); font-style: italic; }
.iqf-total-accent { color: var(--primary); font-weight: 800; }

/* ── Chevron ── */
.iqf-chevron { font-size: 17px; color: var(--text-muted); transition: transform .18s; }
.iqf-chevron.open { transform: rotate(90deg); }

/* ── Footer ── */
.iqf-footer {
  display: flex; justify-content: flex-end; gap: 10px; align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
}

/* Responsive */
@media (max-width: 700px) {
  .iqf-layout { grid-template-columns: 1fr; }
  .iqf-sidebar { border-right: none; border-bottom: 1px solid var(--border); }
  .iqf-grid-3, .iqf-grid-2 { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .iqf-grid-3 { grid-template-columns: 1fr 1fr; }
  .iqf-grid-4 { grid-template-columns: 1fr 1fr; }
}

/* ══ Manuell-Position Popup ══════════════════════════════════════════════ */
.iqf-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.iqf-mpop {
  background: var(--surface);
  border-radius: var(--radius-xl, 14px);
  box-shadow: 0 24px 60px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.1);
  width: min(480px, 96vw);
  overflow: hidden;
  display: flex; flex-direction: column;
}
.iqf-mpop-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
}
.iqf-mpop-title { font-size: 14px; font-weight: 700; }
.iqf-mpop-sub   { font-size: 11.5px; opacity: .75; margin-top: 2px; }
.iqf-mpop-x {
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
  color: white; width: 26px; height: 26px; border-radius: 50%;
  cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background .12s;
}
.iqf-mpop-x:hover { background: rgba(255,255,255,.3); }
.iqf-mpop-body {
  padding: 16px 20px;
  display: flex; flex-direction: column; gap: 11px;
  max-height: 65vh; overflow-y: auto;
}
.iqf-mpop-row  { display: flex; flex-direction: column; gap: 4px; }
.iqf-mpop-row2 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.iqf-mpop-lbl {
  font-size: 10.5px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .4px;
}
.iqf-mpop-inp {
  padding: 7px 10px; border-radius: var(--radius, 6px);
  border: 1.5px solid var(--border); background: var(--surface);
  font-size: 13px; color: var(--text); width: 100%; box-sizing: border-box;
  font-family: inherit; transition: border-color .12s;
}
.iqf-mpop-inp:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(99,102,241,.12); }
.iqf-mpop-preview {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: rgba(99,102,241,.06);
  border: 1px solid rgba(99,102,241,.18); border-radius: var(--radius);
}
.iqf-mpop-prev-lbl { font-size: 11.5px; color: var(--text-muted); }
.iqf-mpop-prev-val { font-size: 15px; font-weight: 800; color: var(--primary); }
.iqf-mpop-foot {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-alt);
}

</style>
