<template>
  <div v-if="loading" class="state-screen"><div class="state-icon">⏳</div><div>Nachtrag wird geladen…</div></div>
  <div v-else-if="error" class="state-screen state-error"><div class="state-icon">⚠️</div><div>{{ error }}</div></div>
  <template v-else>

    <!-- Logo-Header: ab Seite 2 oben rechts -->
    <header class="page-header-logo no-screen">
      <img v-if="settings.company?.logoUrl"
        :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
        crossorigin="anonymous"
        alt="Logo" />
      <div v-else class="page-header-logo-text">{{ settings.company.name }}</div>
    </header>
    <!-- Toolbar -->
    <div class="toolbar no-print">
      <div class="toolbar-left">
        <button class="btn-back" @click="goBack">← Zurück</button>
        <span class="toolbar-title">Nachtrag</span>
      </div>
      <div class="toolbar-right">
        <button class="btn-print" @click="downloadAddendumPDF" :disabled="pdfLoading">
          {{ pdfLoading ? '⏳ PDF wird erstellt…' : '💾 PDF speichern' }}
        </button>
      </div>
    </div>
    <!-- IT-Doku-style Druck-Hinweis -->

    <div v-if="isDraft" class="draft-wm" aria-hidden="true">ENTWURF</div>
    <!-- Fixed page footer -->
    <footer class="print-page-footer no-screen">
            <div class="ppf-main-row">
        <span class="ppf-machine">Vertragsnachtrag · maschinell erstellt</span>
        <span class="ppf-pagenum">Seite <span class="pp-cur"></span> von <span class="pp-tot"></span></span>
      </div>
      <div class="ppf-cols">
        <div class="ppf-col">
          <strong>{{ settings.company.name }}</strong><br />
          <span v-if="settings.company.owner">Inh. {{ settings.company.owner }}<br /></span>
          {{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}
          <span v-if="settings.company.website"><br />{{ settings.company.website }}</span>
          <span v-if="settings.company.email"><br />{{ settings.company.email }}</span>
        </div>
        <div class="ppf-col" v-if="settings.company.iban">
          <strong>{{ settings.company.bankName || 'Bankverbindung' }}</strong><br />
          IBAN {{ settings.company.iban }}<br />
          <span v-if="settings.company.bic">BIC {{ settings.company.bic }}</span>
        </div>
        <div class="ppf-col">
          <span v-if="settings.company.taxNumber">Steuernummer: {{ settings.company.taxNumber }}<br /></span>
          <span v-if="settings.company.vatId && !settings.company.smallBusiness">USt-IdNr.: {{ settings.company.vatId }}<br /></span>
          <span v-if="settings.company.smallBusiness"><em>Kleinunternehmer § 19 Abs. 1 UStG</em></span>
        </div>
      </div>
    </footer>
    <div class="pw">
      <div class="a4">
        <!-- Logo top-right -->
        <div class="top-bar">
          <div class="logo-area">
            <img v-if="settings.company?.logoUrl"
              :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
              crossorigin="anonymous" class="company-logo" alt="Logo" />
            <div v-else class="logo-fallback">
              <div class="logo-name">{{ settings.company.name }}</div>
            </div>
          </div>
        </div>
        <!-- Sender micro + recipient + meta -->
        <div class="addr-meta">
          <div class="addr-block">
            <div class="sender-micro">{{ settings.company.name }} · {{ settings.company.street }} · {{ settings.company.zipCode }} {{ settings.company.city }}</div>
            <div class="recipient" v-if="customer">
              <div v-if="customer.salutation" class="recip-sal">{{ customer.salutation }}</div>
              <div class="recip-name">{{ [customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}</div>
              <div v-if="customer.company">{{ customer.company }}</div>
              <div>{{ customer.street }} {{ customer.houseNumber }}</div>
              <div>{{ customer.zipCode }} {{ customer.city }}</div>
            </div>
          </div>
          <div class="meta-block">
            <table class="meta-table">
              <tbody>
                <tr v-if="project.contractNumber"><td class="ml">Vertrag-Nr.</td><td class="mv fw7">{{ project.contractNumber }}</td></tr>
                <tr v-if="addendum.addendumNumber"><td class="ml">Nachtrag-Nr.</td><td class="mv fw7">{{ addendum.addendumNumber }}</td></tr>
                <tr><td class="ml">Nachtrag vom</td><td class="mv">{{ fmtDate(addendum.date) }}</td></tr>
                <tr v-if="customer && customer.customerNumber"><td class="ml">Kunden-Nr.</td><td class="mv">{{ customer.customerNumber }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Title -->
        <div class="doc-title-block">
          <h1 class="doc-title">Vertragsnachtrag Nr. {{ addendumIndex + 1 }}</h1>
          <div class="doc-sub">Auftrag: {{ project.projectName }} · Ursprungsvertrag: {{ fmtDate(project.contractData?.signingDate || project.createdAt) }}</div>
        </div>
        <!-- §1 Parteien -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 1</div><h2 class="sh">Vertragsparteien</h2></div>
          <p class="p">Dieser Nachtrag wird vereinbart zwischen:</p>
          <div class="parties-grid mt-3">
            <div class="party-block">
              <div class="party-role">Auftragnehmer / Fotograf</div>
              <div class="party-name">{{ settings.company.name }}</div>
              <div class="party-line" v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div>
              <div class="party-line">{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
              <div class="party-tax" v-if="settings.company.taxNumber">StNr.: {{ settings.company.taxNumber }}</div>
            </div>
            <div class="party-und">und</div>
            <div class="party-block">
              <div class="party-role">Auftraggeber</div>
              <div class="party-name" v-if="customer">{{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}</div>
              <div class="party-company" v-if="customer?.company">{{ customer.company }}</div>
              <div class="party-line" v-if="customer">{{ customer.street }} {{ customer.houseNumber }}</div>
              <div class="party-line" v-if="customer">{{ customer.zipCode }} {{ customer.city }}</div>
            </div>
          </div>
        </div>
        <!-- §2 Präambel -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 2</div><h2 class="sh">Präambel</h2></div>
          <p class="p">Dieser Vertragsnachtrag ist rechtlich bindender Bestandteil des zwischen den oben genannten Parteien geschlossenen Fotografie- und Dienstleistungsvertrages zum Auftrag <strong>„{{ project.projectName }}"</strong>.</p>
          <p class="p mt-3">Alle Bestimmungen des ursprünglichen Vertrages behalten ihre Gültigkeit, soweit durch diesen Nachtrag nichts anderes geregelt wird. Im Falle von Widersprüchen geht dieser Nachtrag vor. Änderungen an diesem Nachtrag bedürfen ebenfalls der Schriftform.</p>
        </div>
        <!-- §3 Änderungen -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 3</div><h2 class="sh">{{ addendum.title || 'Vereinbarte Änderungen' }}</h2></div>
          <p class="p">Die Parteien vereinbaren folgende Änderungen zum Hauptvertrag:</p>
          <div class="infobox mt-3" style="white-space:pre-wrap;line-height:1.7">{{ addendum.content }}</div>
        </div>
        <!-- §4 Sonstiges -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 4</div><h2 class="sh">Sonstige Bestimmungen</h2></div>
          <p class="p">Dieser Nachtrag wird durch beiderseitige Unterschrift rechtswirksam. Die salvatorische Klausel des Hauptvertrages gilt entsprechend. Alle nicht ausdrücklich geänderten Vertragsbestandteile bleiben unverändert in Kraft.</p>
        </div>
        <!-- Signatures -->
        <div class="sig-note mt-6">Mit ihrer Unterschrift bestätigen beide Parteien, diesen Nachtrag gelesen und akzeptiert zu haben.</div>
        <div class="sig-grid mt-4">
          <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Ort, Datum, Unterschrift Auftragnehmer</div><div class="sig-pre">{{ settings.company.city }}, _______________</div></div>
          <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Ort, Datum, Unterschrift Auftraggeber</div></div>
        </div>
        <!-- Screen-only footer -->
        <footer class="screen-footer">
                    <div class="sf-cols">
            <div><strong>{{ settings.company.name }}</strong><br />{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}<span v-if="settings.company.website"><br />{{ settings.company.website }}</span><span v-if="settings.company.email"><br />{{ settings.company.email }}</span></div>
            <div v-if="settings.company.iban"><strong>{{ settings.company.bankName || 'Bank' }}</strong><br />IBAN {{ settings.company.iban }}<span v-if="settings.company.bic"><br />BIC {{ settings.company.bic }}</span></div>
            <div><span v-if="settings.company.taxNumber">Steuernummer: {{ settings.company.taxNumber }}<br /></span><span v-if="settings.company.smallBusiness"><em>Kleinunternehmer § 19 UStG</em></span></div>
          </div>
        </footer>
      </div>
    </div>
  </template>
</template>

<script>
import apiClient, { API_BASE } from '../services/api'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadPdfFromBackend, printWithFilename, fetchLogoAsDataUrl } from '../services/pdfExport.js'
const API = `${API_BASE}/api`
export default {
  name: 'AddendumPrint',
  setup() {
    const route=useRoute(),router=useRouter()
    function goBack(){window.history.length>1?router.back():window.close()}
    const logoDataUrl = ref(null)  // base64-eingebettetes Logo
        const loading=ref(true),error=ref(null),project=ref(null),customer=ref(null)
    const settings=ref({company:{}})
    const addendum=computed(()=>(project.value?.contractAddenda||[]).find(a=>a.id===route.params.addendumId)||{})
    const addendumIndex=computed(()=>Math.max(0,(project.value?.contractAddenda||[]).findIndex(a=>a.id===route.params.addendumId)))
    const isDraft=computed(()=>!addendum.value?.signedFile)
    function fmtDate(d){if(!d)return'—';if(/^\d{2}\.\d{2}\.\d{4}$/.test(String(d))){const[day,month,year]=String(d).split('.');return new Date(`${year}-${month}-${day}`).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}const p=new Date(d);if(isNaN(p))return String(d);return p.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}
    async function fetchAll(){
      try{
        const[pr,sr]=await Promise.all([fetch(`${API}/projects/${route.params.projectId}`),fetch(`${API}/settings`)])
        if(!pr.ok)throw new Error('Projekt nicht gefunden')
        project.value=(await pr.json()).data??{}
        settings.value=(await sr.json()).data??{}
        // Logo als base64 einbetten → im Druckdialog sofort verfügbar (kein Netzwerkaufruf)
        logoDataUrl.value = await fetchLogoAsDataUrl(
          settings.value?.company?.logoUrl
            ? `${API_BASE}${settings.value.company.logoUrl}`
            : null
        )
        if(project.value.customerId){const cr=await fetch(`${API}/customers/${project.value.customerId}`);if(cr.ok)customer.value=(await cr.json()).data??null}
      }catch(e){error.value='Fehler: '+e.message}finally{loading.value=false}
    }
    const pdfLoading = ref(false)

    function buildFilename() {
      const p = project.value, c = customer.value, add = addendum.value
      const num  = add?.addendumNumber || `Nachtrag_${(addendumIndex.value||0)+1}`
      const name = c ? (c.lastName || c.firstName || c.company || '') : ''
      return [num, name].filter(Boolean).join('_')
    }

    function printAddendum() {
      printWithFilename(buildFilename())
    }

    async function downloadAddendumPDF() {
      const el = document.querySelector('.a4')
      if (!el) { printWithFilename(buildFilename()); return }
      pdfLoading.value = true
      try { await downloadPdfFromBackend('/api/pdf/addendum/' + route.params.pid + '/' + route.params.aid, buildFilename()) }
      catch(e) { console.error('PDF-Fehler:', e) }
      finally { pdfLoading.value = false }
    }

    onMounted(async () => {
      await fetchAll()
      const action = route.query.action
      if (action === 'print' || action === 'download') {
        setTimeout(() => printAddendum(), 400)
      } else if (action === 'download') {
        setTimeout(() => downloadAddendumPDF(), 400)
      }
    })
    return{logoDataUrl,loading,error,project,customer,settings,addendum,addendumIndex,isDraft,fmtDate,printAddendum,downloadAddendumPDF,pdfLoading,goBack}
  }
}
</script>

<style>
@page { size: A4 portrait; margin: 14mm 18mm 28mm 18mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 9pt; color: #1a1a1a; background: #d8d8d8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media print { body { background: white; } }
.state-screen { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; gap:12px; font-size:15px; color:#555; }
.state-error { color:#c0392b; }
.state-icon { font-size:32px; }
.no-screen { display:none; }
@media print  { .no-print { display:none !important; } .no-screen { display:block !important; } }
@media screen { .no-screen { display:none !important; } }

/* ── Toolbar ── */
.toolbar { position:fixed; top:0; left:0; right:0; z-index:500; background:#111827; color:white; display:flex; justify-content:space-between; align-items:center; padding:11px 24px; gap:16px; box-shadow:0 2px 16px rgba(0,0,0,.4); }
.toolbar-left { display:flex; align-items:center; gap:14px; min-width:0; }
.toolbar-right { display:flex; align-items:center; gap:8px; }
.toolbar-title { font-size:13px; color:rgba(255,255,255,.8); font-weight:500; }
.btn-back { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); color:white; padding:6px 13px; border-radius:6px; cursor:pointer; font-size:12px; }
.btn-back:hover { background:rgba(255,255,255,.2); }
.btn-print { background:#2563eb; border:none; color:white; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; }
.btn-print:hover { background:#1d4ed8; }

/* Fixed footer - every page */
.print-page-footer { position:fixed; bottom:0; left:0; right:0; background:white; padding:0 18mm 5mm 18mm; z-index:100; }
.ppf-rule { border:none; border-top:0.5pt solid #ccc; margin-bottom:2.5mm; }
.ppf-main-row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2mm; }
.ppf-machine { font-size:6.5pt; color:#666; }
.ppf-pagenum { font-size:6.5pt; color:#888; white-space:nowrap; }
.pp-cur::before { content: counter(page); }
.pp-tot::before { content: counter(pages); }
.ppf-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; }
.ppf-col  { font-size:6.5pt; color:#666; line-height:1.6; }
.ppf-bold { font-weight:700; color:#333; }

/* Page wrap + A4 */
.pw  { padding:16px 0 40px; display:flex; flex-direction:column; align-items:center; gap:24px; }
@media print { .pw { padding:0; background:white; display:block; } }
.a4  { width:210mm; min-height:297mm; background:white; display:flex; flex-direction:column; }
@media screen { .a4 { padding:16mm 18mm 14mm; box-shadow:0 4px 32px rgba(0,0,0,.18); margin:0 auto; } }
@media print  { .a4 { width: auto; min-height:0; padding: 0; } }
.page-break { break-before: page; }

/* Logo + top bar (matches invoice/contract) */
.top-bar { display:flex; justify-content:flex-end; align-items:flex-start; margin-bottom:9mm; }
.logo-area { flex-shrink:0; max-width:62mm; text-align:right; }
.company-logo { max-width:60mm; max-height:28mm; object-fit:contain; display:block; margin-left:auto; }
.logo-fallback { text-align:right; }
.logo-name { font-size:14pt; font-weight:700; color:#111; }

/* Address block */
.addr-meta { display:flex; justify-content:space-between; gap:10mm; margin-bottom:9mm; }
.addr-block { min-width:78mm; max-width:88mm; }
.sender-micro { font-size:7pt; color:#888; border-bottom:0.4pt solid #bbb; padding-bottom:2px; margin-bottom:3.5mm; }
.recipient { line-height:1.7; font-size:10pt; }
.recip-sal { color:#444; font-size:9.5pt; }
.recip-name { font-weight:700; font-size:10.5pt; }
.meta-block { flex-shrink:0; }
.meta-table { border-collapse:collapse; }
.ml { font-size:7.5pt; color:#777; padding:1.5px 10px 1.5px 0; white-space:nowrap; vertical-align:top; }
.mv { font-size:8pt; color:#111; text-align:right; padding:1.5px 0; white-space:nowrap; }

/* Title block */
.doc-title-block { margin-bottom:6mm; padding-bottom:4mm; border-bottom:0.5pt solid #ccc; break-after:avoid; }
.doc-title { font-size:13pt; font-weight:700; color:#111; line-height:1.35; }
.doc-sub   { font-size:8.5pt; color:#666; margin-top:2px; }

/* Sections */
.section { margin-bottom:5mm; break-inside:avoid; }
.sh-row { display:flex; align-items:baseline; gap:3mm; margin-bottom:2.5mm; break-after:avoid; border-bottom:0.5pt solid #e0e0e0; padding-bottom:1.5mm; }
.sh-pill { font-size:7pt; font-weight:800; color:#4f46e5; background:rgba(79,70,229,.08); border:0.8pt solid rgba(79,70,229,.22); padding:1.5px 7px; border-radius:4px; white-space:nowrap; flex-shrink:0; }
.sh { font-size:9.5pt; font-weight:700; color:#111; flex:1; }
.p  { font-size:8.5pt; line-height:1.65; color:#1a1a1a; orphans:3; widows:3; }
.p + .p { margin-top:1.5mm; }
.mt-2{margin-top:1.5mm} .mt-3{margin-top:2mm} .mt-4{margin-top:3mm} .mt-6{margin-top:5mm}
.infobox { background:#f8f8f8; border:0.5pt solid #e0e0e0; border-left:2.5pt solid #4f46e5; border-radius:2px; padding:3mm 4mm; font-size:8.5pt; line-height:1.65; break-inside:avoid; }
.addendum-box { background:#f8faff; border:0.5pt solid #dbeafe; border-left:2.5pt solid #2563eb; border-radius:2px; padding:3mm 4mm; font-size:8.5pt; line-height:1.7; white-space:pre-wrap; break-inside:avoid; }
.sig-section { break-inside:avoid; margin-top:8mm; }
.sig-note    { font-size:7.5pt; color:#666; line-height:1.55; margin-bottom:5mm; }
.sig-grid    { display:grid; grid-template-columns:1fr 1fr; gap:14mm; }
.sig-block   { display:flex; flex-direction:column; }
.sig-line    { border-bottom:0.8pt solid #333; height:14mm; margin-bottom:2mm; }
.sig-label   { font-size:7pt; color:#888; }
.closing-rule { border:none; border-top:0.5pt solid #ccc; margin:4mm 0 3mm; }
.screen-footer { margin-top:auto; padding-top:5mm; }
.sf-rule { border:none; border-top:0.5pt solid #ccc; margin-bottom:3mm; }
.sf-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; }
.sf-cols > div { font-size:6.5pt; color:#666; line-height:1.65; }
.fc-bold { font-weight:700; color:#333; }
@media print { .screen-footer { display:none; } }
.draft-wm { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:88pt; font-weight:900; color:rgba(0,0,0,.04); pointer-events:none; white-space:nowrap; user-select:none; z-index:0; }
@media screen { .draft-wm { display:none; } }
.pdfloading { opacity:.6; }
.tbadge{font-size:11px;padding:3px 9px;border-radius:99px;font-weight:600}
.tbadge.draft{background:rgba(107,114,128,.12);color:#6b7280}
.tbadge.b2b{background:rgba(37,99,235,.1);color:#1d4ed8}
.tbadge.ads{background:rgba(234,179,8,.1);color:#92400e}

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