<template>
  <div v-if="loading" class="state-screen"><div class="state-icon">⏳</div><div>Blankovertrag wird geladen…</div></div>
  <div v-else-if="error"  class="state-screen state-error"><div class="state-icon">⚠️</div><div>{{ error }}</div></div>

  <template v-else>

    <!-- Logo-Header: ab Seite 2 oben rechts -->
    <header class="page-header-logo no-screen">
      <img v-if="settings.company?.logoUrl"
        :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
        crossorigin="anonymous"
        alt="Logo" />
      <div v-else class="page-header-logo-text">{{ settings.company.name }}</div>
    </header>
    <!-- ── Toolbar ── -->
    <!-- IT-Doku-style Druck-Hinweis -->


    <!-- Fixer Seitenfuß: erscheint auf jeder Druckseite -->
    <footer class="pf no-screen">
      <hr class="pf-rule" />
      <div class="pf-top">
        <span>Fotografie- und Dienstleistungsvertrag · maschinell erstellt · ohne Unterschrift nicht gültig</span>
      </div>
      <div class="pf-cols">
        <div class="pf-col">
          <strong>{{ settings.company.name }}</strong><br />
          <span v-if="settings.company.owner">Inh. {{ settings.company.owner }}<br /></span>
          {{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}
          <span v-if="settings.company.website"><br />{{ settings.company.website }}</span>
          <span v-if="settings.company.email"><br />{{ settings.company.email }}</span>
        </div>
        <div class="pf-col">
          <span v-if="settings.company.bankName"><strong>{{ settings.company.bankName }}</strong><br /></span>
          <span v-if="settings.company.iban">IBAN {{ settings.company.iban }}<br /></span>
          <span v-if="settings.company.bic">BIC {{ settings.company.bic }}</span>
        </div>
        <div class="pf-col">
          <span v-if="settings.company.taxNumber">Steuernr.: {{ settings.company.taxNumber }}<br /></span>
          <span v-if="settings.company.vatId && !settings.company.smallBusiness">USt-IdNr.: {{ settings.company.vatId }}<br /></span>
          <span v-if="settings.company.smallBusiness"><em>Kleinunternehmer § 19 Abs. 1 UStG</em></span>
        </div>
      </div>
    </footer>

    <div class="page-wrap">
      <div class="a4">

        <!-- Briefkopf -->
        <div class="letterhead">
          <div class="lh-left">
            <div class="lh-studio">{{ settings.company.name }}</div>
            <div class="lh-detail" v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div>
            <div class="lh-detail">{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
            <div class="lh-detail" v-if="settings.company.phone || settings.company.email">
              {{ [settings.company.phone, settings.company.email].filter(Boolean).join(' · ') }}
            </div>
          </div>
          <img v-if="settings.company?.logoUrl"
            :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
            crossorigin="anonymous"
            class="logo" alt="Logo" />
        </div>
        <hr class="head-rule" />

        <h1 class="ct">Fotografie- und Dienstleistungsvertrag</h1>
        <div class="ct-sub">Vertragsangebot vom: <span class="fill-line-inline" style="min-width:40mm">{{ fmtDate(new Date().toISOString()) }}</span></div>

        <!-- § 1 Vertragsparteien -->
        <div class="section">
          <h2 class="sh">§ 1 Vertragsparteien</h2>
          <p>Dieser Vertrag wird geschlossen zwischen:</p>
          <div class="parties-grid">
            <div class="party-block">
              <div class="party-role">Auftragnehmer / Fotograf</div>
              <div class="party-name">{{ settings.company.name }}</div>
              <div v-if="settings.company.owner" class="party-line">Inh. {{ settings.company.owner }}</div>
              <div class="party-line">{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
              <div class="party-line" v-if="settings.company.taxNumber">StNr.: {{ settings.company.taxNumber }}</div>
            </div>
            <div class="party-und">und</div>
            <div class="party-block">
              <div class="party-role">Auftraggeber</div>
              <FillField v-model="f.customerName" :edit="editMode" label="Name / Firma" />
              <FillField v-model="f.customerStreet" :edit="editMode" label="Straße, Hausnummer" />
              <FillField v-model="f.customerCity" :edit="editMode" label="PLZ Ort" />
              <FillField v-model="f.customerPhone" :edit="editMode" label="Telefon" small />
              <FillField v-model="f.customerEmail" :edit="editMode" label="E-Mail" small />
            </div>
          </div>
          <p class="mt-4">Im Folgenden werden Auftragnehmer und Auftraggeber gemeinsam als „Parteien" bezeichnet.</p>
        </div>

        <!-- § 2 Leistungsgegenstand -->
        <div class="section">
          <h2 class="sh">§ 2 Leistungsgegenstand und Termin</h2>
          <p>Der Auftragnehmer erbringt fotografische und/oder videografische Dienstleistungen gemäß:</p>
          <table class="detail-table mt-4">
            <tbody>
              <tr><td class="dl">Anlass / Projekt</td><td><FillField v-model="f.occasion" :edit="editMode" /></td></tr>
              <tr><td class="dl">Datum</td><td><FillField v-model="f.date" :edit="editMode" /></td></tr>
              <tr><td class="dl">Beginn (Uhrzeit)</td><td><FillField v-model="f.time" :edit="editMode" /></td></tr>
              <tr><td class="dl">Voraussichtl. Dauer</td><td><FillField v-model="f.duration" :edit="editMode" /></td></tr>
              <tr><td class="dl">Veranstaltungsort</td><td><FillField v-model="f.location" :edit="editMode" /></td></tr>
            </tbody>
          </table>
          <div class="service-checks mt-4">
            <label class="sc"><input type="checkbox" v-model="f.svc_foto" :disabled="!editMode" /> Fotografie</label>
            <label class="sc"><input type="checkbox" v-model="f.svc_video" :disabled="!editMode" /> Videografie</label>
            <label class="sc"><input type="checkbox" v-model="f.svc_gr" :disabled="!editMode" /> Getting Ready</label>
            <label class="sc"><input type="checkbox" v-model="f.svc_cards" :disabled="!editMode" /> Glückwunschkarten</label>
          </div>
        </div>

        <!-- § 3 Vergütung -->
        <div class="section">
          <h2 class="sh">§ 3 Vergütung</h2>
          <div class="pricing-options">
            <label class="pr-opt" :class="{ selected: f.pricingModel === 'hourly' }">
              <input type="radio" v-model="f.pricingModel" value="hourly" :disabled="!editMode" />
              <span class="pr-label">Stundenweise</span>
              <span class="pr-rate">Stundensatz: <FillField v-model="f.hourlyRate" :edit="editMode" inline style="min-width:24mm" /> €/h</span>
              <span class="pr-rate">Geplante Stunden: <FillField v-model="f.hours" :edit="editMode" inline style="min-width:16mm" /> h</span>
            </label>
            <label class="pr-opt" :class="{ selected: f.pricingModel === 'flat' }">
              <input type="radio" v-model="f.pricingModel" value="flat" :disabled="!editMode" />
              <span class="pr-label">Pauschalpreis</span>
              <span class="pr-rate">Pauschale: <FillField v-model="f.flatRate" :edit="editMode" inline style="min-width:28mm" /> € netto</span>
            </label>
            <label class="pr-opt" :class="{ selected: f.pricingModel === 'custom' }">
              <input type="radio" v-model="f.pricingModel" value="custom" :disabled="!editMode" />
              <span class="pr-label">Individuelle Vereinbarung</span>
              <span class="pr-rate"><FillField v-model="f.customPrice" :edit="editMode" inline style="min-width:80mm" /></span>
            </label>
          </div>
          <p class="mt-4">
            Die Rechnung ist innerhalb von <FillField v-model="f.paymentDays" :edit="editMode" inline style="min-width:12mm" default="14" /> Tagen
            ab Rechnungsdatum ohne Abzug zu begleichen.
            <span v-if="settings.company.smallBusiness"> Als Kleinunternehmer i.S.d. § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.</span>
          </p>
        </div>

        <!-- § 4 Anzahlung -->
        <div class="section">
          <h2 class="sh">§ 4 Anzahlung und Stornierung</h2>
          <p>
            Vereinbart wird eine Anzahlung in Höhe von <FillField v-model="f.deposit" :edit="editMode" inline style="min-width:28mm" /> €
            zur verbindlichen Reservierung des Termins. Sie ist binnen 14 Tagen fällig und nicht erstattungsfähig.
          </p>
          <p class="mt-4">
            Bei Stornierung durch den Auftraggeber gelten die Stornierungsbedingungen gemäß den AGB des Auftragnehmers.
            Bei Stornierung durch den Auftragnehmer aus wichtigem Grund wird die Anzahlung vollständig zurückerstattet.
          </p>
        </div>

        <!-- § 5 Veröffentlichungsrecht -->
        <div class="section">
          <h2 class="sh">§ 5 Urheberrecht und Nutzungsrechte</h2>
          <p>
            Sämtliche Aufnahmen unterliegen dem Urheberrecht des Auftragnehmers.
            Der Auftraggeber erhält ein einfaches Nutzungsrecht für die vereinbarte Nutzungsart.
          </p>
          <div class="pub-checks mt-4">
            <div class="pub-label">Veröffentlichungsrecht des Auftragnehmers (Werbezwecke, Portfolio):</div>
            <label class="sc"><input type="radio" v-model="f.publication" value="allowed" :disabled="!editMode" /> Gestattet</label>
            <label class="sc"><input type="radio" v-model="f.publication" value="conditional" :disabled="!editMode" /> Nach Absprache</label>
            <label class="sc"><input type="radio" v-model="f.publication" value="denied" :disabled="!editMode" /> Nicht gestattet</label>
          </div>
          <p class="mt-4">
            Jegliche nachträgliche Bearbeitung des Bildmaterials durch den Auftraggeber ist ohne schriftliche Zustimmung untersagt.
            Rohdaten (RAW-Dateien) werden nicht herausgegeben.
          </p>
        </div>

        <!-- § 6 Lieferung -->
        <div class="section">
          <h2 class="sh">§ 6 Lieferung und Archivierung</h2>
          <p>
            Die bearbeiteten Bilder werden innerhalb von <FillField v-model="f.delivery" :edit="editMode" inline style="min-width:16mm" default="6–8" /> Wochen
            nach dem Termin als digitale Dateien übergeben. Rohdaten werden
            <FillField v-model="f.archiveDuration" :edit="editMode" inline style="min-width:12mm" default="3" /> Monate archiviert,
            danach besteht kein Anspruch auf erneute Lieferung.
          </p>
        </div>

        <!-- § 7 Haftung -->
        <div class="section">
          <h2 class="sh">§ 7 Haftung</h2>
          <p>
            Der Auftragnehmer haftet nur bei Vorsatz und grober Fahrlässigkeit, bei leichter Fahrlässigkeit
            begrenzt auf das vereinbarte Honorar. Bei vollständigem technischem Datenverlust trotz angemessener
            Sicherungsmaßnahmen ist die Haftung auf das Honorar begrenzt.
          </p>
        </div>

        <!-- § 8 DSGVO -->
        <div class="section">
          <h2 class="sh">§ 8 Datenschutz (DSGVO)</h2>
          <p>
            Die Speicherung personenbezogener Daten erfolgt ausschließlich zur Auftragsabwicklung (Art. 6 Abs. 1 lit. b DSGVO).
            Es obliegt dem Auftraggeber, Teilnehmer über die Anfertigung von Aufnahmen zu informieren und
            Einwilligungen einzuholen (§ 22 KUG). Der Auftraggeber bestätigt, die DSGVO-Datenschutzerklärung
            des Auftragnehmers zur Kenntnis genommen zu haben.
          </p>
        </div>

        <!-- § 9 Sonstiges -->
        <div class="section">
          <h2 class="sh">§ 9 Sonstige Bestimmungen</h2>
          <p>
            Mündliche Nebenabreden bestehen nicht. Änderungen bedürfen der Schriftform.
            Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen unberührt.
            Es gilt deutsches Recht. Die AGB des Auftragnehmers sind Bestandteil dieses Vertrages.
          </p>
          <div class="mt-4" v-if="f.specialNotes || editMode">
            <strong>Besondere Vereinbarungen:</strong>
            <FillField v-model="f.specialNotes" :edit="editMode" multiline style="min-height:12mm;width:100%" />
          </div>
        </div>

        <!-- Unterschriften -->
        <div class="sig-note mt-6">
          Mit ihrer Unterschrift bestätigen beide Parteien, diesen Vertrag und die AGB gelesen und akzeptiert zu haben.
          Vertragsangebot gültig 14 Tage ab Unterschrift des Auftragnehmers.
        </div>
        <div class="sig-row mt-8">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Ort, Datum, Unterschrift Auftragnehmer</div>
            <div class="sig-pre">{{ settings.company.city }}, _______________</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Ort, Datum, Unterschrift Auftraggeber</div>
          </div>
        </div>

        <!-- Screen-only footer -->
        <footer class="screen-footer mt-auto">
                    <div class="footer-cols">
            <div class="footer-col">
              <div class="fc-bold">{{ settings.company.name }}</div>
              <div v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div>
              <div>{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
            </div>
            <div class="footer-col">
              <div v-if="settings.company.iban">IBAN: {{ settings.company.iban }}</div>
              <div v-if="settings.company.bic">BIC: {{ settings.company.bic }}</div>
            </div>
            <div class="footer-col">
              <div v-if="settings.company.taxNumber">Steuernr.: {{ settings.company.taxNumber }}</div>
              <div v-if="settings.company.vatId && !settings.company.smallBusiness">USt-IdNr.: {{ settings.company.vatId }}</div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  </template>
</template>

<script>
import apiClient, { API_BASE } from '../services/api'
import { downloadPdfFromBackend, printWithFilename, fetchLogoAsDataUrl } from '../services/pdfExport.js'
import { ref, onMounted, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'

const API = `${API_BASE}/api`

// ── Inline fill-field component ──
const FillField = defineComponent({
  name: 'FillField',
  props: {
    modelValue: { type: String, default: '' },
    edit: { type: Boolean, default: false },
    label: { type: String, default: '' },
    small: { type: Boolean, default: false },
    inline: { type: Boolean, default: false },
    multiline: { type: Boolean, default: false },
    default: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const logoDataUrl = ref(null)  // base64-eingebettetes Logo
    const val = ref(props.modelValue || props.default || '')
    return () => {
      if (props.multiline) {
        return h('textarea', {
          class: ['fill-textarea', props.edit ? 'fill-editable' : 'fill-print'],
          value: val.value || '',
          placeholder: props.label || '…',
          readonly: !props.edit,
          onInput: e => { val.value = e.target.value; emit('update:modelValue', val.value) },
        })
      }
      if (props.edit) {
        return h('input', {
          class: ['fill-input', props.inline ? 'fill-inline' : 'fill-block', props.small ? 'fill-small' : ''],
          type: 'text',
          value: val.value,
          placeholder: props.label || '___________',
          onInput: e => { val.value = e.target.value; emit('update:modelValue', val.value) },
        })
      }
      // Print mode: show value or empty underline (no label placeholder)
      return h('span', {
        class: ['fill-line', props.inline ? 'fill-line-inline' : 'fill-line-block', props.small ? 'fill-small' : ''],
      }, val.value || '')
    }
  }
})

export default {
  name: 'BlankContractPrint',
  components: { FillField },
  setup() {
    const router  = useRouter()
    const loading = ref(true)
    const error   = ref(null)
    const settings = ref({ company: {} })
    const editMode = ref(false)

    const f = ref({
      // Auftraggeber
      customerName: '', customerStreet: '', customerCity: '', customerPhone: '', customerEmail: '',
      // Auftrag
      occasion: '', date: '', time: '', duration: '', location: '',
      svc_foto: true, svc_video: false, svc_gr: false, svc_cards: false,
      // Preis
      pricingModel: 'hourly', hourlyRate: '', hours: '', flatRate: '', customPrice: '',
      paymentDays: '14', deposit: '',
      // Rechte
      publication: 'conditional',
      // Lieferung
      delivery: '6–8', archiveDuration: '3',
      // Sonstiges
      specialNotes: '',
    })

    function goBack() { window.history.length > 1 ? router.back() : window.close() }

    function fmtDate(d) {
      if (!d) return '—'
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(d))) {
        const [day, month, year] = String(d).split('.')
        return new Date(`${year}-${month}-${day}`).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
      }
      const parsed = new Date(d)
      if (isNaN(parsed)) return String(d)
      return parsed.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    }

    function printContract() {
      const orig = document.title
      document.title = `Blankovertrag_${(settings.value.company.name || 'Studio').replace(/[^a-z0-9äöüÄÖÜß_\- ]/gi, '')}`
      window.print()
      setTimeout(() => { document.title = orig }, 2000)
    }

    async function fetchAll() {
      try {
        const sr = await fetch(`${API}/settings`)
        const sj = await sr.json()
        settings.value = sj.data ?? sj
        // Logo als base64 einbetten → im Druckdialog sofort verfügbar (kein Netzwerkaufruf)
        logoDataUrl.value = await fetchLogoAsDataUrl(
          settings.value?.company?.logoUrl
            ? `${API_BASE}${settings.value.company.logoUrl}`
            : null
        )
      } catch(e) {
        error.value = 'Fehler: ' + e.message
      } finally {
        loading.value = false
      }
    }

    onMounted(fetchAll)
    return {logoDataUrl,  loading, error, settings, editMode, f, goBack, fmtDate, printContract }
  }
}
</script>

<style>
@page { size: A4 portrait; margin: 22mm 18mm 28mm 18mm; }
@page :first { margin-top: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 9pt; color: #1a1a1a; background: #e0e0e0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.state-screen { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; gap:12px; font-size:15px; color:#555; }
.state-error { color:#c0392b; } .state-icon { font-size:32px; }

/* Toolbar */
.toolbar { position:fixed; top:0; left:0; right:0; z-index:500; background:#111827; color:white; display:flex; justify-content:space-between; align-items:center; padding:11px 24px; gap:16px; box-shadow:0 2px 16px rgba(0,0,0,.4); }
.toolbar-left, .toolbar-right { display:flex; align-items:center; gap:10px; }
.btn-back { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:white; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:13px; }
.btn-back:hover { background:rgba(255,255,255,.22); }
.toolbar-title { font-size:13px; color:rgba(255,255,255,.85); font-weight:500; }
.edit-hint { font-size:11.5px; color:rgba(255,255,255,.4); }
.toggle-edit { font-size:12px; color:rgba(255,255,255,.65); background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.2); padding:6px 14px; border-radius:6px; cursor:pointer; user-select:none; }
.toggle-edit.active { background:rgba(234,179,8,.2); color:#fcd34d; border-color:rgba(234,179,8,.4); }
.btn-print { background:#2563eb; border:none; color:white; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; }
.btn-print:hover { background:#1d4ed8; }

/* Fixer Seitenfuß */
.pf { position:fixed; bottom:0; left:0; right:0; background:white; padding:0 20mm 4mm 20mm; z-index:100; }
.pf-rule { border:none; border-top:0.5pt solid #bbb; margin-bottom:2mm; }
.pf-top { display:flex; justify-content:space-between; margin-bottom:1.5mm; font-size:6.5pt; color:#777; }
.pf-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; }
.pf-col  { font-size:6.5pt; color:#555; line-height:1.55; }
.no-screen { display:none; }
@media screen { .no-screen { display:none !important; } }
@media print  { .no-print { display:none !important; } .no-screen { display:block; } .page-wrap { padding:0; background:white; } }

/* Page */
.page-wrap { padding:16px 0 40px; display:flex; flex-direction:column; align-items:center; gap:22px; }
.a4 { width:210mm; min-height:297mm; background:white; padding:0 0 8mm 0; display:flex; flex-direction:column; }
@media screen { .a4 { padding:14mm 18mm 10mm; box-shadow:0 4px 32px rgba(0,0,0,.18); margin:0 auto; } }
@media print  { .a4 { width: auto; min-height:0; padding: 0; } }

/* Briefkopf */
.letterhead { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4mm; }
.lh-left { flex:1; }
.lh-studio { font-size:11pt; font-weight:700; color:#111; }
.lh-detail { font-size:7.5pt; color:#555; line-height:1.6; }
.logo { max-width:52mm; max-height:22mm; object-fit:contain; display:block; }
.head-rule { border:none; border-top:1pt solid #111; margin-bottom:4mm; }
.ct { font-size:13pt; font-weight:700; color:#111; margin-bottom:1.5mm; }
.ct-sub { font-size:8pt; color:#666; margin-bottom:5mm; }

/* Sektionen */
.section { margin-bottom:4.5mm; break-inside:avoid; page-break-inside:avoid; }
.sh { font-size:9.5pt; font-weight:700; color:#111; margin-bottom:2mm; padding-bottom:1mm; border-bottom:0.5pt solid #e0e0e0; break-after:avoid; }
p { font-size:8.5pt; line-height:1.6; orphans:3; widows:3; }
.mt-4 { margin-top:2mm; } .mt-6 { margin-top:3mm; } .mt-8 { margin-top:4mm; } .mt-auto { margin-top:auto; }

/* Parties */
.parties-grid { display:grid; grid-template-columns:1fr auto 1fr; gap:5mm; margin-top:3mm; break-inside:avoid; }
.party-block { line-height:1.65; font-size:8.5pt; }
.party-role { font-size:7.5pt; color:#777; margin-bottom:1.5mm; font-style:italic; }
.party-name { font-weight:700; font-size:9.5pt; }
.party-line { font-size:8.5pt; }
.party-und  { align-self:center; font-style:italic; color:#555; font-size:8.5pt; padding:0 2mm; }

/* Detail table */
.detail-table { border-collapse:collapse; width:100%; }
.detail-table td { padding:2px 4px; font-size:8.5pt; }
.dl { color:#555; min-width:42mm; width:42mm; vertical-align:top; }

/* Services checkboxes */
.service-checks, .pub-checks { display:flex; gap:6mm; flex-wrap:wrap; align-items:center; }
.sc { display:flex; align-items:center; gap:2mm; font-size:8.5pt; cursor:pointer; }
.sc input { accent-color:#2563eb; }
.pub-label { font-size:8pt; color:#555; margin-right:4mm; }

/* Pricing options */
.pricing-options { display:flex; flex-direction:column; gap:2mm; margin-top:2mm; }
.pr-opt { display:flex; align-items:center; gap:4mm; font-size:8.5pt; padding:2mm 3mm; border:0.5pt solid #e0e0e0; border-radius:2px; cursor:pointer; flex-wrap:wrap; }
.pr-opt.selected { background:#eff6ff; border-color:#bfdbfe; }
.pr-opt input[type=radio] { accent-color:#2563eb; flex-shrink:0; }
.pr-label { font-weight:600; min-width:36mm; }
.pr-rate  { font-size:8pt; color:#444; display:flex; align-items:center; gap:2mm; }

/* Fill fields */
.fill-input, .fill-textarea {
  border: none; border-bottom: 0.8pt solid #111;
  background: #f0f7ff; padding: 1px 3px;
  font-family: inherit; font-size: 8.5pt; color: #111;
  outline: none; border-radius: 0;
}
.fill-input:focus, .fill-textarea:focus { background: #dbeafe; border-bottom-color: #2563eb; }
.fill-block  { display: block; width: 100%; margin-top: 1px; }
.fill-inline { display: inline; }
.fill-small  { font-size: 8pt; }
.fill-textarea { display:block; width:100%; resize:vertical; min-height:10mm; line-height:1.55; }

/* Print mode fill fields — shown as underlines */
.fill-line { display: inline-block; border-bottom: 0.8pt solid #111; min-width: 44mm; color: #111; }
.fill-line-inline { display: inline; border-bottom: 0.8pt solid #111; padding: 0 2mm; min-width: 24mm; }
.fill-line-block  { display: block; border-bottom: 0.8pt solid #111; width: 100%; min-height: 5mm; margin-top: 1px; color: #111; }

/* Print mode: active inputs look like fill lines, no browser chrome */
@media print {
  /* Inputs in edit mode → underline style */
  .fill-input, .fill-block, .fill-inline {
    border: none !important; border-bottom: 0.8pt solid #111 !important;
    outline: none !important; background: transparent !important;
    box-shadow: none !important; border-radius: 0 !important;
    -webkit-appearance: none; appearance: none;
  }
  .fill-input::placeholder, .fill-textarea::placeholder { color: transparent !important; }
  .fill-textarea.fill-editable {
    border: 0.8pt solid #ddd !important; background: transparent !important;
    resize: none !important; outline: none !important;
  }
  /* Checkboxes: sauber als Kästchen, kein Browser-Styling */
  input[type="checkbox"] {
    -webkit-appearance: none; appearance: none;
    width: 3mm; height: 3mm; border: 0.7pt solid #333;
    display: inline-block; vertical-align: middle; flex-shrink: 0;
    margin-right: 1mm; position: relative; border-radius: 0.5px;
  }
  input[type="checkbox"]:checked::after {
    content: '✓'; position: absolute; top: -1px; left: 0.2mm;
    font-size: 6pt; font-weight: 700; color: #111; line-height: 1;
  }
  /* Radio-Buttons: als Kreise */
  input[type="radio"] {
    -webkit-appearance: none; appearance: none;
    width: 3mm; height: 3mm; border: 0.7pt solid #333; border-radius: 50%;
    display: inline-block; vertical-align: middle; flex-shrink: 0;
    margin-right: 1mm; position: relative;
  }
  input[type="radio"]:checked::after {
    content: ''; position: absolute; top: 0.5mm; left: 0.5mm;
    width: 1.5mm; height: 1.5mm; border-radius: 50%; background: #111;
  }
  /* Pricing options: nur gewählte Option anzeigen */
  .pr-opt { border: none !important; background: none !important; padding: 2px 0 !important; box-shadow: none !important; }
  .pr-opt:not(.selected) { display: none !important; }
  /* Toggle-edit label: ausblenden */
  .toggle-edit, .edit-hint { display: none !important; }
}

/* Unterschriften */
.sig-note { font-size:7.5pt; color:#444; line-height:1.5; }
.sig-row  { display:grid; grid-template-columns:1fr 1fr; gap:12mm; break-inside:avoid; }
.sig-line { border-bottom:0.8pt solid #111; height:12mm; margin-bottom:1.5mm; }
.sig-label{ font-size:7pt; color:#666; }
.sig-pre  { font-size:7pt; color:#999; margin-top:0.8mm; }

/* Screen footer */
.screen-footer { padding-top:5mm; }
.footer-rule { border:none; border-top:0.5pt solid #bbb; margin-bottom:3mm; }
.footer-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; }
.footer-col  { font-size:6.5pt; color:#666; line-height:1.65; }
.fc-bold     { font-weight:700; color:#333; }
@media print { .screen-footer { display:none; } }
.print-hint { background:#f0f7ff; border:1px solid #bfdbfe; border-radius:6px; padding:10px 18px; margin:0 20px 12px; font-size:13px; color:#1e3a5f; }
.print-hint kbd { display:inline-block; background:#e8edf8; border:1px solid #b0bcd4; border-radius:4px; padding:2px 8px; font-family:'Courier New', monospace; font-size:12px; margin:0 2px; }
@media print { .print-hint { display:none !important; } }

/* Logo-Header ab Seite 2 */
.page-header-logo {
  position: fixed;
  top: 0; right: 0;
  padding: 5mm 18mm 2mm;
  z-index: 200;
  background: white;
}
.page-header-logo img {
  max-height: 14mm;
  max-width: 50mm;
  object-fit: contain;
  display: block;
  margin-left: auto;
}
.page-header-logo-text { font-size: 10pt; font-weight: 700; color: #111; }
@media print { .page-wrap { position: relative; z-index: 250; } }
</style>
