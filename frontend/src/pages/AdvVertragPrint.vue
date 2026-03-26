<template>
  <div v-if="loading" class="state-screen"><div class="state-icon">⏳</div><div>Wird geladen…</div></div>
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
    <!-- IT-Doku-style Druck-Hinweis -->


    <footer class="pf no-screen">
      <hr class="pf-rule" />
      <div class="pf-top">
        <span class="pf-left">Auftragsverarbeitungsvertrag (Art. 28 DSGVO) · {{ settings.company.name }}</span>
        <span class="pf-right">Stand: {{ fmtDate(new Date().toISOString()) }}</span>
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
      <div class="a4" id="adv-print-area">

        <div class="letterhead">
          <div class="lh-left">
            <div class="lh-studio">{{ settings.company.name }}</div>
            <div class="lh-owner" v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div>
            <div class="lh-addr">{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
            <div class="lh-contact" v-if="settings.company.phone || settings.company.email">
              {{ [settings.company.phone, settings.company.email].filter(Boolean).join(' · ') }}
            </div>
          </div>
          <img v-if="settings.company?.logoUrl"
            :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
            crossorigin="anonymous"
            class="logo" alt="Logo" />
        </div>

        <hr class="title-rule" />
        <div class="doc-title-block">
          <h1 class="doc-title">Auftragsverarbeitungsvertrag</h1>
          <div class="doc-sub">gemäß Art. 28 DSGVO · Auftragnehmer: {{ settings.company.name }} · Stand: {{ fmtDate(new Date().toISOString()) }}</div>
        </div>

        <div class="agb-body">
          <div v-for="(para, pIdx) in advParagraphs" :key="para.id" class="agb-para">
            <div class="sh-row">
            <div class="sh-pill">{{ pIdx + 1 }}.</div>
            <h2 class="sh">{{ para.title }}</h2>
          </div>
            <ol class="para-items">
              <li v-for="(item, iIdx) in (para.items || [])" :key="iIdx" class="para-item">
                {{ item }}
              </li>
            </ol>
          </div>
          <div v-if="advParagraphs.length === 0" class="agb-empty">
            Noch keine Abschnitte vorhanden. Bitte in Einstellungen → ADV-Vertrag pflegen.
          </div>
        </div>

        <!-- Unterschriftenblock -->
        <hr class="closing-rule" />
        <div class="sig-section">
          <p class="sig-note">Dieser Vertrag wird durch beiderseitige Unterschrift wirksam.</p>
          <div class="sig-grid">
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">Ort, Datum · Auftragnehmer</div>
              <div class="sig-pre">{{ settings.company.owner || settings.company.name }}</div>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">Ort, Datum · Auftraggeber</div>
              <div class="sig-pre">Name / Firmenstempel</div>
            </div>
          </div>
        </div>

        <footer class="screen-footer">
                    <div class="footer-cols">
            <div class="footer-col">
              <div class="fc-bold">{{ settings.company.name }}</div>
              <div v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div>
              <div>{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
            </div>
            <div class="footer-col">
              <div v-if="settings.company.phone">{{ settings.company.phone }}</div>
              <div v-if="settings.company.email">{{ settings.company.email }}</div>
            </div>
            <div class="footer-col">
              <div v-if="settings.company.taxNumber">Steuernr.: {{ settings.company.taxNumber }}</div>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
const API = `${API_BASE}/api`
export default {
  name: 'AdvVertragPrint',
  setup() {
    const router = useRouter()
    const logoDataUrl = ref(null)  // base64-eingebettetes Logo
    const loading = ref(true)
    const error   = ref(null)
    const settings     = ref({ company: {} })
    const advParagraphs = ref([])
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
    function printPage() {
      const orig = document.title
      const name = (settings.value.company.name || 'Studio').replace(/[^a-z0-9äöüÄÖÜß\- ]/gi, '_')
      document.title = `ADV_Vertrag_${name}`
      window.print()
      setTimeout(() => { document.title = orig }, 2000)
    }
    function downloadPDF() { printPage() }
    async function fetchAll() {
      try {
        const sr = await fetch(`${API}/settings`)
        const sj = await sr.json()
        const s  = sj.data ?? sj
        settings.value     = s
        // Logo als base64 einbetten → im Druckdialog sofort verfügbar (kein Netzwerkaufruf)
        logoDataUrl.value = await fetchLogoAsDataUrl(
          settings.value?.company?.logoUrl
            ? `${API_BASE}${settings.value.company.logoUrl}`
            : null
        )
        advParagraphs.value = Array.isArray(s.advParagraphs) ? s.advParagraphs : []
      } catch (e) {
        error.value = 'Fehler: ' + e.message
      } finally {
        loading.value = false
      }
    }
    onMounted(fetchAll)
    return {logoDataUrl,  loading, error, settings, advParagraphs, goBack, fmtDate, printPage, downloadPDF }
  }
}
</script>

<style>
/* ═══════════════════════════════════════════════════════════════
   SHARED PRINT STYLES — gilt für alle Dokumente
   Einheitliche Optik: Vertrag · AGB · DSGVO · ADV-Vertrag
═══════════════════════════════════════════════════════════════ */

/* ── Reset & Base ── */
@page { size: A4 portrait; margin: 14mm 18mm 28mm 18mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  font-size: 9pt; color: #1a1a1a;
  background: #d8d8d8;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@media print { body { background: white; } }

/* ── State screens ── */
.state-screen { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; gap:12px; font-size:15px; color:#555; }
.state-error { color:#c0392b; }
.state-icon { font-size:32px; }

/* ── Toolbar ── */
.toolbar { position:fixed; top:0; left:0; right:0; z-index:500; background:#111827; color:white; display:flex; justify-content:space-between; align-items:center; padding:10px 24px; gap:12px; box-shadow:0 2px 16px rgba(0,0,0,.4); }
.toolbar-left, .toolbar-right { display:flex; align-items:center; gap:10px; }
.toolbar-title { font-size:13px; color:rgba(255,255,255,.8); font-weight:500; }
.toolbar-meta  { font-size:12px; color:rgba(255,255,255,.4); }
.btn-back  { background:rgba(255,255,255,.1);  border:1px solid rgba(255,255,255,.2); color:white; padding:6px 13px; border-radius:6px; cursor:pointer; font-size:12px; }
.btn-back:hover { background:rgba(255,255,255,.2); }
.btn-dl    { background:rgba(99,102,241,.2); border:1px solid rgba(99,102,241,.4); color:#c7d2fe; padding:7px 16px; border-radius:6px; cursor:pointer; font-size:12.5px; font-weight:600; }
.btn-dl:hover { background:rgba(99,102,241,.35); }
.btn-print { background:#4f46e5; border:none; color:white; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; }
.btn-print:hover { background:#4338ca; }
.btn-pdf   { background:#059669; border:none; color:white; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; }
.btn-adv   { background:rgba(99,102,241,.2); border:1px solid rgba(99,102,241,.4); color:#a5b4fc; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; text-decoration:none; }
.btn-blank { background:rgba(107,114,128,.15); border:1px solid rgba(107,114,128,.3); color:rgba(255,255,255,.7); padding:6px 14px; border-radius:6px; font-size:12px; font-weight:500; text-decoration:none; cursor:pointer; }

/* ── Print visibility ── */
.no-screen { display:none; }
@media screen { .no-screen { display:none !important; } }
@media print  { .no-print  { display:none !important; } .no-screen { display:block !important; } }

/* ── Fixer Seitenfuß ── */
.pf { position:fixed; bottom:0; left:0; right:0; background:white; padding:0 20mm 5mm 20mm; z-index:100; }
.pf-rule { border:none; border-top:0.5pt solid #ccc; margin-bottom:2.5mm; }
.pf-top  { display:flex; justify-content:space-between; margin-bottom:1.5mm; }
.pf-left, .pf-right { font-size:6.5pt; color:#888; }
.pf-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; }
.pf-col  { font-size:6.5pt; color:#666; line-height:1.6; }
.pf-col strong { color:#333; }

/* ── Seiten-Wrapper ── */
.page-wrap { padding:16px 0 40px; display:flex; flex-direction:column; align-items:center; gap:24px; }
.a4 {
  width: 210mm; min-height: 297mm;
  background: white;
  display: flex; flex-direction: column;
}
@media screen { .a4 { padding:16mm 18mm 14mm; box-shadow:0 4px 32px rgba(0,0,0,.18); margin:0 auto; } }
@media print  { .a4 { width: auto; min-height:0; padding: 0; } }
.page-break { break-before: page; }

/* ── Briefkopf ── */
.letterhead { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5mm; }
.lh-left  { flex:1; }
.lh-studio { font-size:11pt; font-weight:700; color:#111; }
.lh-owner  { font-size:8pt; color:#444; margin-top:0.5mm; }
.lh-addr   { font-size:7.5pt; color:#666; line-height:1.6; margin-top:0.5mm; }
.lh-contact{ font-size:7pt; color:#888; margin-top:1mm; }
.logo { max-width:52mm; max-height:24mm; object-fit:contain; display:block; }
.logo-text { font-size:12pt; font-weight:700; color:#111; text-align:right; }

/* ── Sender-Micro (kleine Absenderzeile über Empfänger) ── */
.sender-micro { font-size:7pt; color:#888; border-bottom:0.4pt solid #ccc; padding-bottom:2px; margin-bottom:3.5mm; line-height:1.4; }

/* ── Titelblock — EINHEITLICH für alle Dokumente ── */
.doc-title-block {
  margin-bottom: 6mm;
  padding-bottom: 4mm;
  border-bottom: 1pt solid #ddd;
  break-after: avoid;
}
.doc-title  { font-size: 15pt; font-weight: 800; color: #111; line-height: 1.3; }
.doc-sub    { font-size: 8.5pt; color: #666; margin-top: 2.5mm; font-style: italic; }
.doc-date   { font-size: 8pt; color: #888; }
.title-rule { border:none; border-top:1.5pt solid #111; margin-bottom:4mm; }

/* ── Sektionen — EINHEITLICH ── */
.section { margin-bottom: 5mm; break-inside: avoid; }

/* Abschnitts-Header: Pill + Titel + Trennlinie */
.sh-row {
  display: flex; align-items: baseline; gap: 3mm;
  margin-bottom: 2.5mm; break-after: avoid;
  border-bottom: 0.5pt solid #e0e0e0;
  padding-bottom: 1.5mm;
}
.sh-pill {
  font-size: 7pt; font-weight: 800;
  color: #4f46e5;
  background: rgba(79,70,229,.08);
  border: 0.8pt solid rgba(79,70,229,.22);
  padding: 1.5px 7px; border-radius: 4px;
  white-space: nowrap; flex-shrink: 0;
  letter-spacing: .02em;
}
.sh {
  font-size: 9.5pt; font-weight: 700;
  color: #111; flex: 1;
}

/* ── Absatztext ── */
.p { font-size: 8.5pt; line-height: 1.65; color: #1a1a1a; orphans: 3; widows: 3; }
.p + .p { margin-top: 1.5mm; }
.mt-2 { margin-top:1.5mm; } .mt-3 { margin-top:2mm; }
.mt-4 { margin-top:3mm; }   .mt-6 { margin-top:5mm; }
.hint-text { font-size:7.5pt; color:#777; font-style:italic; line-height:1.5; }

/* ── Listen — EINHEITLICH ── */
.ul-list { margin-left: 4mm; padding: 0; list-style: none; }
.ul-list li {
  font-size: 8.5pt; line-height: 1.65; color: #1a1a1a;
  padding-left: 4mm; position: relative; margin-bottom: 1mm;
}
.ul-list li::before { content: "•"; position: absolute; left: 0; color: #888; font-size: 8pt; }

/* ── Checkboxen / Auswahlzeilen ── */
.cb      { font-size: 11pt; min-width: 5mm; line-height: 1; flex-shrink: 0; }
.cb-list { display: flex; flex-direction: column; gap: 2.5mm; }
.cb-row  { display: flex; gap: 3mm; align-items: flex-start; font-size: 8.5pt; line-height: 1.6; }

/* ── Infoboxen ── */
.infobox {
  background: #f8f8f8;
  border: 0.5pt solid #e0e0e0;
  border-left: 2.5pt solid #4f46e5;
  border-radius: 2px;
  padding: 3mm 4mm;
  font-size: 8.5pt; line-height: 1.65;
  break-inside: avoid;
}
.infobox-blue { background: #f0f6ff; border-left-color: #2563eb; }
.infobox-warn { background: #fffbeb; border-left-color: #d97706; }

/* ── Detail-Tabelle ── */
.dt td { padding: 1.5px 0; font-size: 8.5pt; vertical-align: top; }
.dl { color: #777; min-width: 46mm; width: 46mm; }
.dv { font-weight: 600; color: #111; padding-left: 4mm; }

/* ── Parteien-Block ── */
.parties-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 5mm; margin-top: 3mm; break-inside: avoid; }
.party-block { padding: 3mm; background: #f9f9f9; border: 0.5pt solid #e8e8e8; border-radius: 2px; line-height: 1.65; font-size: 8.5pt; }
.party-role  { font-size: 7pt; color: #999; margin-bottom: 1.5mm; text-transform: uppercase; letter-spacing: .04em; }
.party-name  { font-size: 10pt; font-weight: 700; color: #111; margin-bottom: .5mm; }
.party-company { font-size: 8.5pt; font-weight: 600; color: #333; }
.party-line  { font-size: 8.5pt; color: #444; }
.party-tax   { font-size: 7.5pt; color: #aaa; }
.party-und   { align-self: center; font-style: italic; color: #bbb; font-size: 9pt; padding: 0 2mm; }

/* ── Stornotabelle ── */
.storno-table { width:100%; border-collapse:collapse; font-size:8pt; break-inside:avoid; }
.storno-table th { padding:2mm 3mm; background:#f4f4f4; border:0.5pt solid #e0e0e0; font-weight:700; text-align:left; }
.storno-table td { padding:1.5mm 3mm; border:0.5pt solid #e0e0e0; }
.storno-table tbody tr:nth-child(even) { background:#fafafa; }
.fee-col { text-align:right; font-weight:700; width:26mm; }

/* ── Servicezeilen ── */
.svc-list { display: flex; flex-direction: column; gap: 1.5mm; margin-top: 1.5mm; }
.svc-row  { display: flex; gap: 2.5mm; align-items: baseline; font-size: 8.5pt; }
.svc-det  { font-size: 7.5pt; color: #888; margin-left: 2mm; }

/* ── TOM Grid ── */
.tom-grid { display:grid; grid-template-columns:1fr 1fr; gap:2.5mm; break-inside:avoid; margin-top:2mm; }
.tom-item { background:#f9f9f9; border:0.5pt solid #e0e0e0; border-radius:2px; padding:2mm 3mm; break-inside:avoid; }
.tom-cat  { font-size:7.5pt; font-weight:700; color:#333; margin-bottom:1mm; }
.tom-text { font-size:7.5pt; color:#555; line-height:1.55; }

/* ── Unterschriften — EINHEITLICH ── */
.sig-section { break-inside: avoid; margin-top: 8mm; }
.sig-note    { font-size: 7.5pt; color: #666; line-height: 1.55; margin-bottom: 5mm; }
.sig-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; }
.sig-block   { display: flex; flex-direction: column; }
.sig-line    { border-bottom: 0.8pt solid #333; height: 14mm; margin-bottom: 2mm; }
.sig-label   { font-size: 7pt; color: #888; }
.sig-pre     { font-size: 7pt; color: #bbb; margin-top: 1mm; }

/* ── Trennlinie Schluss — EINHEITLICH ── */
.closing-rule { border: none; border-top: 0.5pt solid #ccc; margin: 4mm 0 3mm; }

/* ── Screen-Footer (inline, nur Bildschirm) ── */
.screen-footer { margin-top: auto; padding-top: 5mm; }
.sf-rule  { border: none; border-top: 0.5pt solid #ccc; margin-bottom: 3mm; }
.sf-cols  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5mm; }
.sf-cols > div, .footer-col { font-size: 6.5pt; color: #666; line-height: 1.65; }
.fc-bold  { font-weight: 700; color: #333; }
.footer-rule { border: none; border-top: 0.5pt solid #ccc; margin-bottom: 3mm; }
@media print { .screen-footer { display: none; } }

/* ── ENTWURF Wasserzeichen ── */
.draft-wm { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:88pt; font-weight:900; color:rgba(0,0,0,.04); letter-spacing:14px; pointer-events:none; white-space:nowrap; user-select:none; z-index:0; }
@media screen { .draft-wm { display:none; } }

/* ── ADV-spezifisch ── */
.agb-para  { margin-bottom: 4mm; break-inside: avoid; }
.para-items{ margin: 0; padding: 0; list-style: none; }
.para-item {
  font-size: 8.5pt; line-height: 1.65; color: #1a1a1a;
  padding: 1.5px 0 1.5px 4mm; orphans: 3; widows: 3; margin-bottom: 1mm;
}
.agb-empty { font-size: 9pt; color: #999; padding: 10mm 0; text-align: center; }

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
