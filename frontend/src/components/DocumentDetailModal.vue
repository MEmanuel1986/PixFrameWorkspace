<template>
  <div class="modal-overlay">
    <div class="modal ddm">

      <!-- Header -->
      <div class="ddm-header">
        <div class="ddm-head-info">
          <div class="ddm-badges">
            <span class="badge" :class="typeClass">{{ typeLabel }}</span>
            <span class="badge" :class="statusClass(doc.status)">{{ doc.status }}</span>
            <span v-if="doc.docSubtype === 'correction'"  class="badge badge-warning">Korrektur</span>
            <span v-if="doc.docSubtype === 'cancellation'" class="badge badge-danger">Storno</span>
            <span v-if="(doc.version||1) > 1" class="badge badge-neutral">v{{ doc.version }}</span>
          </div>
          <div class="ddm-title">{{ doc.name }}</div>
          <div class="ddm-meta">
            <code class="ddm-docnum" v-if="doc.documentNumber">{{ doc.documentNumber }}</code>
            <span>{{ fmtDate(doc.issueDate) }}</span>
            <span v-if="doc.serviceDate"> · Leistung: {{ fmtDate(doc.serviceDate) }}</span>
            <span v-if="doc.dueDate && isInvoice" :class="isOverdue ? 'text-danger fw-600' : ''">
               · Fällig: {{ fmtDate(doc.dueDate) }}<span v-if="isOverdue"> ⚠</span>
            </span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm btn-icon ddm-close" @click="$emit('close')">✕</button>
      </div>

      <!-- Action bar -->
      <div class="ddm-actions">
        <!-- Quote actions -->
        <template v-if="isQuote">
          <button class="btn btn-primary btn-sm"
            :disabled="!!doc.supersededBy || doc.status === 'Storniert'"
            @click="mode='edit'">✏️ Bearbeiten</button>
          <button class="btn btn-secondary btn-sm"
            :disabled="!!doc.supersededBy || doc.status === 'Storniert'"
            @click="mode='revise'">📄 Neue Version</button>
          <button class="btn btn-sm" style="background:#059669;color:white;border-color:#059669"
            :disabled="!!doc.supersededBy || doc.status === 'Storniert'"
            @click="mode='invoice'">🧾 → Rechnung</button>
        </template>

        <!-- Invoice actions -->
        <template v-if="isInvoice">
          <button class="btn btn-primary btn-sm"
            :disabled="invoiceLocked || doc.status === 'Storniert'"
            :title="invoiceLocked ? 'Rechnung gesperrt — ab Versendet nicht mehr bearbeitbar (GoBD)' : ''"
            @click="mode='edit'">✏️ Bearbeiten</button>
          <span v-if="invoiceLocked && doc.status !== 'Storniert'" class="lock-hint">🔒 {{ doc.status }} — nur Korrektur möglich</span>
          <button class="btn btn-secondary btn-sm"
            :disabled="doc.status === 'Storniert'"
            @click="mode='correct'">🔧 Korrekturrechnung</button>
          <button class="btn btn-ghost btn-sm text-danger"
            :disabled="doc.status === 'Storniert'"
            @click="confirmCancel = true">🚫 Stornieren</button>
        </template>

        <!-- Refs -->
        <div class="ddm-refs">
          <span v-if="doc.quoteId" class="ddm-ref">
            Aus Angebot · <a href="#" @click.prevent="$emit('open-doc', doc.quoteId)">ansehen</a>
          </span>
          <span v-if="doc.correctionOf" class="ddm-ref">
            Korrektur zu · <a href="#" @click.prevent="$emit('open-doc', doc.correctionOf)">Original</a>
          </span>
          <span v-if="doc.supersededBy" class="ddm-ref ddm-ref-warn">
            ⚠ Ersetzt · <a href="#" @click.prevent="$emit('open-doc', doc.supersededBy)">neue Version</a>
          </span>
        </div>

        <!-- PDF / Druck (nur für Angebote + Rechnungen) -->
        <button v-if="isQuote || isInvoice"
          class="btn btn-sm ddm-print-btn"
          @click="openPrint"
          title="PDF herunterladen · bei Rechnungen auch ZUGFeRD XML verfügbar">
          📥 PDF
        </button>
        <!-- E-Mail senden -->
        <button v-if="isQuote || isInvoice"
          class="btn btn-sm ddm-email-btn"
          @click="showEmailModal = true"
          title="Per E-Mail senden">
          ✉️ Mail
        </button>
        <!-- ZUGFeRD hint badge (nur Rechnung) -->
        <span v-if="isInvoice" class="ddm-zugferd-hint" title="Auf der PDF-Seite ist der ZUGFeRD 2.3 XML-Export verfügbar (EU-konforme E-Rechnung)">⚡ E-Rech.</span>
        <!-- SendEmailModal -->
        <SendEmailModal
          v-if="showEmailModal"
          :doc="doc"
          :customer="currentCustomer"
          :project="currentProject"
          :settings="settings.settings"
          @close="showEmailModal = false"
        />

        <!-- Status selector -->
        <div class="ddm-status-group">
          <span class="ddm-status-lbl">Status</span>
          <select class="ddm-status-sel" :value="doc.status"
            :disabled="doc.status === 'Storniert'"
            @change="onStatusChange($event.target.value)">
            <option v-for="s in availableStatuses" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>

      <!-- Body -->
      <div class="ddm-body">
        <div class="ddm-cols">

          <!-- LEFT: addresses + dates -->
          <div class="ddm-left">

            <!-- Sender -->
            <div class="ddm-block" v-if="company.name">
              <div class="ddm-block-lbl">Von</div>
              <div class="ddm-addr">
                <div class="fw-600">{{ company.name }}</div>
                <div v-if="company.owner">{{ company.owner }}</div>
                <div v-if="company.street">{{ company.street }}</div>
                <div v-if="company.zipCode">{{ company.zipCode }} {{ company.city }}</div>
                <div v-if="company.vatId" class="text-muted" style="font-size:11.5px">USt-IdNr.: {{ company.vatId }}</div>
                <div v-if="company.taxNumber" class="text-muted" style="font-size:11.5px">St.-Nr.: {{ company.taxNumber }}</div>
                <div v-if="company.email" class="text-muted" style="font-size:11.5px">{{ company.email }}</div>
              </div>
            </div>

            <!-- Recipient -->
            <div class="ddm-block">
              <div class="ddm-block-lbl">An</div>
              <div class="ddm-addr" v-if="doc.billingAddress">
                <div class="fw-600">{{ doc.billingAddress.name }}</div>
                <div v-if="doc.billingAddress.street">{{ doc.billingAddress.street }}</div>
                <div>{{ doc.billingAddress.zipCode }} {{ doc.billingAddress.city }}</div>
                <div v-if="doc.billingAddress.country">{{ doc.billingAddress.country }}</div>
                <div v-if="doc.billingAddress.vatId" class="text-muted" style="font-size:11.5px">USt-IdNr.: {{ doc.billingAddress.vatId }}</div>
              </div>
              <div v-else class="text-muted">Keine Adresse hinterlegt</div>
            </div>

            <!-- Dates -->
            <div class="ddm-date-rows">
              <div class="ddm-dr"><span>Ausstellungsdatum</span><span>{{ fmtDate(doc.issueDate) }}</span></div>
              <div class="ddm-dr" v-if="doc.serviceDate"><span>Leistungsdatum</span><span>{{ fmtDate(doc.serviceDate) }}</span></div>
              <div class="ddm-dr" v-if="doc.dueDate && isInvoice">
                <span>Zahlungsziel</span>
                <span :class="isOverdue ? 'text-danger fw-600' : ''">{{ fmtDate(doc.dueDate) }}</span>
              </div>
              <div class="ddm-dr" v-if="doc.deliveryDate && isQuote"><span>Gültig bis</span><span>{{ fmtDate(doc.deliveryDate) }}</span></div>
              <div class="ddm-dr" v-if="doc.paymentTerms"><span>Zahlungsbedingungen</span><span>{{ doc.paymentTerms }}</span></div>
            </div>
          </div>

          <!-- RIGHT: line items + totals -->
          <div class="ddm-right">
            <div v-if="doc.intro" class="ddm-text">{{ doc.intro }}</div>

            <table class="ddm-table">
              <thead>
                <tr>
                  <th style="width:26px">#</th>
                  <th>Bezeichnung</th>
                  <th class="text-right" style="width:80px">Menge</th>
                  <th class="text-right" style="width:100px">Einzelpreis</th>
                  <th class="text-right" style="width:50px">USt.</th>
                  <th v-if="hasDiscounts" class="text-right" style="width:60px">Rabatt</th>
                  <th class="text-right" style="width:90px">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item,i) in doc.lineItems" :key="i">
                  <td class="text-muted" style="font-size:12px;text-align:center">{{ i+1 }}</td>
                  <td>
                    <div class="fw-600" :class="lineGross(item)<0?'text-danger':''">{{ item.description }}</div>
                    <div v-if="item.detail" class="text-muted" style="font-size:11.5px">{{ item.detail }}</div>
                  </td>
                  <td class="text-right text-muted">{{ item.quantity }} {{ item.unit }}</td>
                  <td class="text-right">{{ fmtPrice(item.priceNet) }}</td>
                  <td class="text-right text-muted">{{ item.taxRate }}%</td>
                  <td v-if="hasDiscounts" class="text-right text-muted">{{ item.discount ? item.discount+'%' : '—' }}</td>
                  <td class="text-right fw-600" :class="lineGross(item)<0?'text-danger':''">{{ fmtPrice(lineGross(item)) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="ddm-totals">
              <div class="ddm-tot" v-if="doc.discount > 0">
                <span>Gesamtrabatt {{ doc.discount }}%</span>
                <span class="text-danger">–{{ doc.discount }}%</span>
              </div>
              <div class="ddm-tot"><span>Netto gesamt</span><span>{{ fmtPrice(doc.subtotal) }}</span></div>
              <div class="ddm-tot" v-for="g in doc.taxGroups" :key="g.rate">
                <span>USt. {{ g.rate }}% auf {{ fmtPrice(g.base) }}</span>
                <span>{{ fmtPrice(g.amount) }}</span>
              </div>
              <div v-if="isSmallBusiness && (!doc.taxGroups || !doc.taxGroups.length)"
                class="ddm-tot ddm-tot-hint">
                <span>Kein Steuerausweis · Kleinunternehmer §19 UStG</span>
              </div>
              <div class="ddm-tot ddm-tot-grand">
                <span>{{ isInvoice ? 'Rechnungsbetrag' : 'Angebotsbetrag' }}</span>
                <span :class="doc.total < 0 ? 'text-danger' : 'text-primary-color'">{{ fmtPrice(doc.total) }}</span>
              </div>
            </div>

            <div v-if="doc.footer" class="ddm-text ddm-text-footer">{{ doc.footer }}</div>
            <div v-if="doc.paymentInfo && isInvoice" class="ddm-text ddm-text-bank">
              <strong>Bankverbindung:</strong> {{ doc.paymentInfo }}
            </div>
          </div>
        </div>

        <!-- Versionshistorie -->
        <div v-if="versions.length > 1" class="ddm-versions">
          <div class="ddm-block-lbl">Versionshistorie</div>
          <div class="ddm-ver-list">
            <div v-for="v in versions" :key="v.id"
              class="ddm-ver-item"
              :class="{ 'ddm-ver-current': v.id === doc.id }">
              <span class="ddm-ver-v">v{{ v.version || 1 }}</span>
              <code class="ddm-ver-num">{{ v.documentNumber }}</code>
              <span class="text-muted ddm-ver-date">{{ fmtDate(v.issueDate) }}</span>
              <span class="badge" :class="statusClass(v.status)">{{ v.status }}</span>
              <a v-if="v.id !== doc.id" href="#" class="ddm-ver-link" @click.prevent="$emit('open-doc', v.id)">ansehen</a>
              <span v-else class="text-muted" style="font-size:11px">← aktuell</span>
            </div>
          </div>
        </div>

        <!-- Zugehörige Rechnungen / Korrekturen -->
        <div v-if="related.length" class="ddm-versions">
          <div class="ddm-block-lbl">Zugehörige Dokumente</div>
          <div class="ddm-ver-list">
            <div v-for="r in related" :key="r.id" class="ddm-ver-item">
              <span class="badge" :class="typeClassFor(r.type)">{{ r.type === 'invoice' ? 'Rechnung' : 'Angebot' }}</span>
              <span v-if="r.docSubtype==='correction'" class="badge badge-warning">Korrektur</span>
              <span v-if="r.docSubtype==='cancellation'" class="badge badge-danger">Storno</span>
              <code class="ddm-ver-num">{{ r.documentNumber }}</code>
              <span class="text-muted ddm-ver-date">{{ fmtDate(r.issueDate) }}</span>
              <span class="badge" :class="statusClass(r.status)">{{ r.status }}</span>
              <a href="#" class="ddm-ver-link" @click.prevent="$emit('open-doc', r.id)">ansehen</a>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <span v-if="doc.notes" class="text-muted" style="font-size:12px;flex:1">Notiz: {{ doc.notes }}</span>
        <button class="btn btn-secondary" @click="$emit('close')">Schließen</button>
      </div>
    </div>

    <!-- Sub-modals -->
    <QuoteInvoiceModal v-if="mode==='edit'"
      :type="doc.type"
      :project="project" :customer="customer"
      :edit-doc="doc"
      @close="mode=null" @updated="onUpdated" />

    <QuoteInvoiceModal v-if="mode==='revise'"
      :type="doc.type"
      :project="project" :customer="customer"
      :edit-doc="doc" :revise-mode="true"
      @close="mode=null" @created="onCreated" />

    <QuoteInvoiceModal v-if="mode==='invoice'"
      type="invoice"
      :project="project" :customer="customer"
      :prefill-from-quote="doc"
      @close="mode=null" @created="onCreated" />

    <QuoteInvoiceModal v-if="mode==='correct'"
      type="invoice"
      :project="project" :customer="customer"
      :correction-of="doc"
      @close="mode=null" @created="onCreated" />

    <!-- Cancel confirm -->
    <div v-if="confirmCancel" class="modal-overlay" style="z-index:1100">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>Rechnung stornieren</h2>
          <button class="btn btn-ghost btn-sm btn-icon" @click="confirmCancel=false">✕</button>
        </div>
        <div class="modal-body">
          <p>Rechnung <strong>{{ doc.documentNumber }}</strong> wirklich stornieren?</p>
          <p class="text-muted" style="font-size:12.5px;margin-top:6px">
            Es wird automatisch eine Stornorechnung mit negierten Beträgen erstellt.
          </p>
          <div class="form-group" style="margin-top:14px">
            <label>Stornogrund <span style="font-weight:400;color:var(--text-muted)">(optional)</span></label>
            <input v-model="cancelReason" type="text" placeholder="z.B. Auftrag storniert auf Kundenwunsch" />
          </div>
          <div v-if="cancelError" class="form-error">{{ cancelError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="confirmCancel=false">Abbrechen</button>
          <button class="btn btn-danger" :disabled="cancelling" @click="doCancel">
            {{ cancelling ? 'Storniere…' : 'Stornieren & Stornorechnung erstellen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore }    from '../stores/useStore'
import { useSettings } from '../stores/useSettings'
import { useRouter }   from 'vue-router'
import QuoteInvoiceModal from './QuoteInvoiceModal.vue'
import SendEmailModal    from './SendEmailModal.vue'

export default {
  name: 'DocumentDetailModal',
  components: { QuoteInvoiceModal, SendEmailModal },
  emits: ['close', 'open-doc', 'updated'],
  props: {
    doc:      { type: Object,  required: true },
    project:  { type: Object,  default: null },
    customer: { type: Object,  default: null },
    allDocs:  { type: Array,   default: () => [] },
  },
  setup(props, { emit }) {
    const store    = useStore()
    const settings = useSettings()
    const router   = useRouter()

    function openPrint() {
      const url = router.resolve({ name: 'DocumentPrint', params: { id: props.doc.id } }).href
      window.open(url, '_blank')
    }

    const isQuote   = computed(() => props.doc.type === 'quote')
    const isInvoice = computed(() => props.doc.type === 'invoice')
    // Rechnung gesperrt ab "Versendet" (GoBD)
    const invoiceLocked = computed(() =>
      isInvoice.value && ['Versendet','Bezahlt','Überfällig','Storniert'].includes(props.doc.status)
    )
    const isSmallBusiness = computed(() => settings.settings?.company?.smallBusiness === true)
    const company   = computed(() => settings.settings?.company || {})

    const typeLabel     = computed(() => isQuote.value ? 'Angebot' : 'Rechnung')
    const typeClass     = computed(() => isQuote.value ? 'badge-info' : 'badge-success')
    const typeClassFor  = (t) => t === 'quote' ? 'badge-info' : 'badge-success'

    const quoteStatuses   = ['Entwurf','Versendet','Angenommen','Abgelehnt','Ersetzt']
    const invoiceStatuses = ['Entwurf','Versendet','Bezahlt','Überfällig','Storniert']
    const availableStatuses = computed(() => isInvoice.value ? invoiceStatuses : quoteStatuses)

    const STATUS_CLASS = {
      'Entwurf':    'badge-neutral',
      'Versendet':  'badge-info',
      'Angenommen': 'badge-success',
      'Bezahlt':    'badge-success',
      'Abgelehnt':  'badge-danger',
      'Ersetzt':    'badge-neutral',
      'Überfällig': 'badge-danger',
      'Storniert':  'badge-danger',
    }
    const statusClass = (s) => STATUS_CLASS[s] || 'badge-neutral'

    const isOverdue = computed(() =>
      props.doc.dueDate && new Date(props.doc.dueDate) < new Date() &&
      !['Bezahlt','Storniert'].includes(props.doc.status)
    )

    const hasDiscounts = computed(() =>
      props.doc.lineItems?.some(i => Number(i.discount) > 0)
    )

    // Versions = all docs in the same chain (parentId)
    const versions = computed(() => {
      const rootId = props.doc.parentId || props.doc.id
      return props.allDocs
        .filter(d => d.type === props.doc.type &&
          (d.id === rootId || d.parentId === rootId))
        .sort((a,b) => (a.version||1) - (b.version||1))
    })

    // Related docs (invoices from this quote, corrections, cancellations)
    const related = computed(() => {
      return props.allDocs.filter(d =>
        d.quoteId === props.doc.id ||
        d.correctionOf === props.doc.id
      )
    })

    function fmtDate(d) {
      return d ? new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'
    }
    function fmtPrice(n) {
      return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n ?? 0)
    }
    function lineNet(item) {
      return (Number(item.quantity)||0) * (Number(item.priceNet)||0) * (1-(Number(item.discount)||0)/100)
    }
    function lineGross(item) { return lineNet(item) * (1+(Number(item.taxRate)||0)/100) }

    async function onStatusChange(status) {
      await store.setDocumentStatus(props.doc.id, status)
      emit('updated')
    }

    // Mode-based sub-modal
    const mode = ref(null) // 'edit' | 'revise' | 'invoice' | 'correct'

    function onCreated(doc) { emit('updated'); mode.value = null; emit('open-doc', doc.id) }
    function onUpdated()    { emit('updated'); mode.value = null }

    // Cancel
    const confirmCancel = ref(false)
    const cancelReason  = ref('')
    const cancelling    = ref(false)
    const cancelError   = ref('')

    async function doCancel() {
      cancelling.value = true; cancelError.value = ''
      try {
        const res = await store.cancelInvoice(props.doc.id, cancelReason.value)
        confirmCancel.value = false
        emit('updated')
        emit('open-doc', res.cancelDoc.id)
        emit('close')
      } catch (e) { cancelError.value = 'Fehler: ' + (e.response?.data?.error || e.message) }
      finally { cancelling.value = false }
    }

    onMounted(() => settings.fetchSettings())

    return {
      isQuote, isInvoice, isSmallBusiness, company, invoiceLocked,
      typeLabel, typeClass, typeClassFor, statusClass, availableStatuses,
      isOverdue, hasDiscounts, versions, related,
      fmtDate, fmtPrice, lineNet, lineGross,
      onStatusChange, mode, onCreated, onUpdated,
      confirmCancel, cancelReason, cancelling, cancelError, doCancel,
      openPrint,
    }
  }
}
</script>

<style scoped>
.ddm { max-width: 1020px; width: 100%; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; }

/* Print button */
.ddm-print-btn {
  background: #f0fdf4; border: 1px solid #86efac; color: #166534;
  margin-left: auto; padding: 4px 12px;
  font-size: 12px; font-weight: 600;
  white-space: nowrap; flex-shrink: 0;
}
.ddm-print-btn:hover { background: #dcfce7; }
.ddm-email-btn {
  background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;
  border-radius: var(--radius); padding: 5px 11px; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all .12s;
}
.ddm-email-btn:hover { background: #dbeafe; }
.ddm-zugferd-hint {
  font-size: 10.5px; padding: 2px 7px; border-radius: 99px;
  background: rgba(5,150,105,.12); color: #6ee7b7;
  border: 1px solid rgba(5,150,105,.3); cursor: default;
  white-space: nowrap;
}

/* Header */
.ddm-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 16px 20px; border-bottom: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
}
.ddm-close  { flex-shrink: 0; margin-left: 12px; }
.ddm-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.ddm-title  { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.ddm-meta   { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12.5px; color: var(--text-muted); }
.ddm-docnum { font-family: monospace; color: var(--primary-text); background: var(--primary-light); border-radius: 4px; padding: 1px 6px; font-size: 12px; }

/* Action bar */
.ddm-actions {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 20px; background: var(--bg-alt);
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.ddm-refs      { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; flex: 1; }
.ddm-ref       { color: var(--text-muted); }
.ddm-ref a     { color: var(--primary-text); }
.ddm-ref-warn  { color: #b45309; }
.ddm-status-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.ddm-status-lbl   { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.ddm-status-sel   {
  padding: 4px 8px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text); font-size: 12.5px; font-family: inherit;
}

/* Body */
.ddm-body { flex: 1; min-height: 0; overflow-y: auto; }
.ddm-cols { display: grid; grid-template-columns: 220px 1fr; }

.ddm-left {
  padding: 16px; border-right: 1px solid var(--border);
  background: var(--bg-alt); display: flex; flex-direction: column; gap: 16px;
}
.ddm-right { padding: 16px 20px; }

.ddm-block-lbl {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .7px; color: var(--text-muted); margin-bottom: 8px;
}
.ddm-addr    { font-size: 13px; line-height: 1.75; color: var(--text); }
.ddm-date-rows { display: flex; flex-direction: column; gap: 3px; }
.ddm-dr      { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
.ddm-dr > span:first-child { color: var(--text-muted); white-space: nowrap; }
.ddm-dr > span:last-child  { font-weight: 500; text-align: right; }

/* Text blocks */
.ddm-text {
  font-size: 13px; color: var(--text-2); line-height: 1.65;
  padding: 10px 0; border-bottom: 1px solid var(--border); margin-bottom: 8px;
}
.ddm-text-footer { border-top: 1px solid var(--border); border-bottom: none; padding-top: 12px; margin-top: 8px; }
.ddm-text-bank   { font-size: 12px; color: var(--text-muted); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }

/* Table */
.ddm-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 4px; }
.ddm-table thead th {
  padding: 6px 6px; text-align: left; border-bottom: 1px solid var(--border);
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  color: var(--text-muted);
}
.ddm-table td { padding: 8px 6px; border-bottom: 1px solid var(--border); vertical-align: top; }
.ddm-table tr:last-child td { border-bottom: none; }

/* Totals */
.ddm-totals {
  margin-top: 8px; margin-left: auto; width: 300px;
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 12px 14px;
}
.ddm-tot {
  display: flex; justify-content: space-between; gap: 16px;
  padding: 4px 0; font-size: 13px; color: var(--text-2);
  border-bottom: 1px solid var(--border);
}
.ddm-tot:last-child  { border-bottom: none; }
.ddm-tot-grand { font-size: 15px; font-weight: 700; color: var(--text); padding-top: 8px; }
.ddm-tot-hint  { font-size: 11px; color: var(--text-muted); font-style: italic; }
.text-primary-color { color: var(--primary-text); }

/* Versions / Related */
.ddm-versions { padding: 14px 20px; border-top: 1px solid var(--border); background: var(--bg-alt); }
.ddm-ver-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.ddm-ver-item {
  display: flex; align-items: center; gap: 10px; font-size: 12.5px;
  padding: 6px 10px; border-radius: var(--radius);
  background: var(--surface); border: 1px solid var(--border);
}
.ddm-ver-current { border-color: var(--primary); background: var(--primary-light); }
.ddm-ver-v    { font-weight: 700; color: var(--primary-text); min-width: 22px; }
.ddm-ver-num  { font-family: monospace; color: var(--text-2); font-size: 12px; }
.ddm-ver-date { margin-right: auto; }
.ddm-ver-link { color: var(--primary-text); font-size: 12px; }

/* Modal footer */
.modal-footer { justify-content: space-between; flex-shrink: 0; }

.ddm-related  { border-top: 1px solid var(--border); }
.ddm-rel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px; padding: 12px 20px 16px;
}
.ddm-rel-card {
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 12px 14px; background: var(--surface);
  cursor: pointer; transition: box-shadow .14s, border-color .14s;
}
.ddm-rel-card:hover { box-shadow: var(--shadow-sm); border-color: var(--primary); }
.ddm-rel-correction   { border-left: 3px solid #d97706; }
.ddm-rel-cancellation { border-left: 3px solid var(--danger); }
.ddm-rel-invoice      { border-left: 3px solid var(--success); }
.ddm-rel-top  { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px; }
.ddm-rel-num  { font-family: monospace; font-weight: 700; font-size: 13px; color: var(--primary-text); margin-bottom: 6px; }
.ddm-rel-meta { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-muted); }
.ddm-rel-hint { font-size: 11px; margin-top: 8px; padding: 4px 8px; border-radius: 4px; }
.ddm-rel-hint-cancel { background: #fef2f2; color: var(--danger); }
.ddm-rel-hint-corr   { background: #fffbeb; color: #92400e; }

@media (max-width: 680px) {
  .ddm-cols { grid-template-columns: 1fr; }
  .ddm-left { border-right: none; border-bottom: 1px solid var(--border); }
  .ddm-totals { width: 100%; }
}
.lock-hint {
  font-size: 11.5px; color: #92400e;
  background: #fef3c7; border: 1px solid #fde68a;
  border-radius: 20px; padding: 2px 9px;
}
</style>
