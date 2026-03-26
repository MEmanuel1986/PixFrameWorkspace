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

    <!-- Toolbar -->

    

    <!-- Fixed page footer -->
    <footer class="pf no-screen">
      <hr class="pf-rule" />
      <div class="pf-top">
        <span class="pf-left">Einnahmen-Ausgaben-Rechnung {{ year }} · {{ settings.company.name }}</span>
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

    <!-- A4 page -->
    <div class="page-wrap">
      <div class="a4">

        <!-- Letterhead -->
        <div class="letterhead">
          <div class="lh-left">
            <div class="lh-studio">{{ settings.company.name }}</div>
            <div class="lh-owner" v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div>
            <div class="lh-addr">{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
            <div class="lh-contact" v-if="settings.company.phone || settings.company.email">{{ [settings.company.phone, settings.company.email].filter(Boolean).join(' · ') }}</div>
          </div>
          <img v-if="settings.company?.logoUrl" :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`" crossorigin="anonymous" class="logo" alt="Logo" />
          <div v-else-if="settings.company.name" class="logo-text">{{ settings.company.name }}</div>
        </div>

        <hr class="title-rule" />
        <div class="doc-title-block">
          <h1 class="doc-title">Einnahmen-Ausgaben-Rechnung {{ year }}</h1>
          <div class="doc-sub">{{ settings.company.businessType }} · Steuernr.: {{ settings.company.taxNumber || '—' }} · Erstellt: {{ fmtDate(new Date().toISOString()) }}</div>
        </div>

        <!-- ── EINNAHMEN ── -->
        <div class="ear-section">
          <div class="ear-sec-head income-head">
            <div class="ear-sec-title">💰 Einnahmen</div>
            <div class="ear-sec-total">{{ fmtEur(incomeTotal) }}</div>
          </div>
          <table class="ear-table">
            <thead>
              <tr>
                <th>Datum</th><th>Rechnungs-Nr.</th><th>Kunde</th><th>Auftrag</th>
                <th class="tr">Betrag (brutto)</th><th>Status</th><th>Bezahlt am</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in invoices" :key="inv.id">
                <td>{{ fmtDate(inv.issueDate) }}</td>
                <td><code class="doc-num">{{ inv.documentNumber || '—' }}</code></td>
                <td>{{ customerName(inv.customerId) }}</td>
                <td class="muted">{{ projectName(inv.projectId) }}</td>
                <td class="tr fw7">{{ fmtEur(inv.total || 0) }}</td>
                <td><span class="status-dot" :class="inv.status === 'Bezahlt' ? 'paid' : 'open'">{{ inv.status }}</span></td>
                <td class="muted">{{ inv.paidAt ? fmtDate(inv.paidAt) : '—' }}</td>
              </tr>
              <tr v-if="!invoices.length">
                <td colspan="7" class="empty-row">Keine Rechnungen im Jahr {{ year }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="sum-row">
                <td colspan="4" class="fw7">Einnahmen gesamt {{ year }}</td>
                <td class="tr fw7 income-color">{{ fmtEur(incomeTotal) }}</td>
                <td colspan="2"></td>
              </tr>
              <tr class="sum-row sub-row">
                <td colspan="4">davon bezahlt</td>
                <td class="tr">{{ fmtEur(incomePaid) }}</td>
                <td colspan="2"></td>
              </tr>
              <tr class="sum-row sub-row" v-if="settings.company.smallBusiness">
                <td colspan="4">Umsatzsteuer (Kleinunternehmer § 19 UStG)</td>
                <td class="tr">0,00 €</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- ── AUSGABEN ── -->
        <div class="ear-section">
          <div class="ear-sec-head expense-head">
            <div class="ear-sec-title">🧾 Ausgaben</div>
            <div class="ear-sec-total">{{ fmtEur(expensesTotal) }}</div>
          </div>

          <!-- Ausgaben nach Kategorie gruppiert -->
          <div v-for="(group, cat) in expensesByCategory" :key="cat" class="exp-group">
            <div class="exp-group-head">{{ cat }}</div>
            <table class="ear-table">
              <thead>
                <tr><th>Datum</th><th>Beschreibung</th><th>Lieferant</th><th class="tr">Betrag (brutto)</th><th class="tr">USt.</th><th class="tr">Netto</th></tr>
              </thead>
              <tbody>
                <tr v-for="exp in group" :key="exp.id">
                  <td>{{ fmtDate(exp.date) }}</td>
                  <td>{{ exp.description }}</td>
                  <td class="muted">{{ exp.vendor || '—' }}</td>
                  <td class="tr fw7">{{ fmtEur(exp.amount) }}</td>
                  <td class="tr muted">{{ exp.taxRate > 0 ? exp.taxRate + '%' : '—' }}</td>
                  <td class="tr">{{ exp.taxRate > 0 ? fmtEur(exp.amount / (1 + exp.taxRate/100)) : fmtEur(exp.amount) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="sum-row sub-row">
                  <td colspan="3">{{ cat }} gesamt</td>
                  <td class="tr">{{ fmtEur(group.reduce((s,e) => s + e.amount, 0)) }}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <table class="ear-table" style="margin-top:4mm">
            <tfoot>
              <tr class="sum-row">
                <td colspan="3" class="fw7">Ausgaben gesamt {{ year }}</td>
                <td class="tr fw7 expense-color">{{ fmtEur(expensesTotal) }}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- ── ÜBERSCHUSS ── -->
        <div class="ear-result">
          <div class="ear-result-grid">
            <div class="ear-result-row">
              <span>Einnahmen gesamt</span>
              <span class="income-color fw7">{{ fmtEur(incomeTotal) }}</span>
            </div>
            <div class="ear-result-row">
              <span>Ausgaben gesamt</span>
              <span class="expense-color fw7">− {{ fmtEur(expensesTotal) }}</span>
            </div>
            <div class="ear-result-divider"></div>
            <div class="ear-result-row ear-result-final">
              <span>Überschuss / Gewinn {{ year }}</span>
              <span :class="profit >= 0 ? 'income-color' : 'expense-color'">{{ fmtEur(profit) }}</span>
            </div>
            <div class="ear-result-row sub-row" v-if="settings.company.smallBusiness">
              <span>Hinweis: Kleinunternehmer gem. § 19 UStG — keine Umsatzsteuer</span>
              <span></span>
            </div>
          </div>
        </div>

        <!-- ── FAHRTENBUCH ── -->
        <div class="ear-section" v-if="mileageEntries.length">
          <div class="ear-sec-head km-head">
            <div class="ear-sec-title">🚗 Fahrtenbuch {{ year }}</div>
            <div class="ear-sec-total">{{ totalKm.toLocaleString('de-DE') }} km</div>
          </div>
          <table class="ear-table">
            <thead>
              <tr><th>Datum</th><th>Kunde</th><th>Rechnungs-Nr.</th><th>Ziel</th><th>Zweck</th><th class="tr">km</th></tr>
            </thead>
            <tbody>
              <tr v-for="m in mileageEntries" :key="m.id">
                <td>{{ fmtDate(m.date) }}</td>
                <td>{{ m.customerName || '—' }}</td>
                <td><code v-if="m.invoiceNumber" class="doc-num">{{ m.invoiceNumber }}</code><span v-else class="muted">—</span></td>
                <td class="muted">{{ m.destination || '—' }}</td>
                <td class="muted" style="font-size:7.5pt">{{ m.purpose || '—' }}</td>
                <td class="tr fw7">{{ m.km.toLocaleString('de-DE') }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="sum-row">
                <td colspan="5" class="fw7">Dienstkilometer gesamt {{ year }}</td>
                <td class="tr fw7">{{ totalKm.toLocaleString('de-DE') }} km</td>
              </tr>
              <tr class="sum-row sub-row">
                <td colspan="5">Pauschale {{ fmtEur(kmRate) }}/km (steuerlich absetzbar)</td>
                <td class="tr">{{ fmtEur(totalKm * kmRate) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Schlusszeile -->
        <div class="ear-footer-note">
          <hr class="closing-rule" />
          <p>Diese Einnahmen-Ausgaben-Rechnung wurde maschinell aus dem Buchhaltungssystem von <strong>{{ settings.company.name }}</strong> erstellt.</p>
          <p class="ear-place-date">{{ settings.company.city }}, {{ fmtDate(new Date().toISOString()) }}</p>
        </div>

        <footer class="screen-footer">
                    <div class="sf-cols">
            <div><div class="fc-bold">{{ settings.company.name }}</div><div v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div><div>{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div></div>
            <div><div v-if="settings.company.phone">{{ settings.company.phone }}</div><div v-if="settings.company.email">{{ settings.company.email }}</div></div>
            <div><div v-if="settings.company.taxNumber">Steuernr.: {{ settings.company.taxNumber }}</div><div v-if="settings.company.vatId && !settings.company.smallBusiness">USt-IdNr.: {{ settings.company.vatId }}</div><div v-if="settings.company.smallBusiness"><em>Kleinunternehmer § 19 UStG</em></div></div>
          </div>
        </footer>
      </div>
    </div>
  </template>
</template>

<script>
import apiClient, { API_BASE } from '../services/api'
import { downloadPdfFromBackend, printWithFilename, fetchLogoAsDataUrl } from '../services/pdfExport.js'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const API = `${API_BASE}/api`

export default {
  name: 'EarPrint',
  setup() {
    const route   = useRoute()
    const router  = useRouter()
    const year    = parseInt(route.params.year) || new Date().getFullYear()
    const logoDataUrl = ref(null)  // base64-eingebettetes Logo
    const loading = ref(true)
    const error   = ref(null)
    const settings  = ref({ company: {} })
    const documents = ref([])
    const customers = ref([])
    const projects  = ref([])
    const fibu      = ref({ expenses: [], mileage: [] })

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
    function fmtEur(n)  { return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n ?? 0) }

    function customerName(id) {
      const c = customers.value.find(c => c.id === id)
      return c ? `${c.firstName} ${c.lastName}`.trim() || c.company || id : (id || '—')
    }
    function projectName(id) {
      const p = projects.value.find(p => p.id === id)
      return p ? (p.contractData?.occasion || p.projectName || '') : ''
    }

    // IDs von Rechnungen die durch Korrektur ersetzt wurden
    const correctedIds = computed(() => {
      const ids = new Set()
      documents.value.forEach(d => {
        if (d.docSubtype === 'correction' && d.correctionOf) ids.add(d.correctionOf)
      })
      return ids
    })
    // Alle Rechnungen für Tabelle (inkl. Korrekturen/Stornos)
    const invoices = computed(() =>
      documents.value.filter(d =>
        d.type === 'invoice' &&
        d.issueDate && new Date(d.issueDate).getFullYear() === year
      ).sort((a,b) => (a.issueDate||'').localeCompare(b.issueDate||''))
    )
    // Nur relevante für Summe: ohne ersetzte Originalrechnungen
    // Summe: Originalrechnungen die durch Korrektur ersetzt wurden zählen NICHT
    const incomeTotal  = computed(() =>
      invoices.value
        .filter(d => !(!d.docSubtype && correctedIds.value.has(d.id)))
        .reduce((s,d) => s + (d.total||0), 0)
    )
    const incomePaid   = computed(() =>
      invoices.value
        .filter(d => d.status === 'Bezahlt' && !(!d.docSubtype && correctedIds.value.has(d.id)))
        .reduce((s,d) => s + (d.total||0), 0)
    )

    const yearExpenses = computed(() =>
      fibu.value.expenses.filter(e => e.date && new Date(e.date).getFullYear() === year)
        .sort((a,b) => (a.date||'').localeCompare(b.date||''))
    )
    const expensesTotal = computed(() => yearExpenses.value.reduce((s,e) => s + (e.amount||0), 0))
    const expensesByCategory = computed(() => {
      const map = {}
      yearExpenses.value.forEach(e => {
        if (!map[e.category]) map[e.category] = []
        map[e.category].push(e)
      })
      return map
    })

    const mileageEntries = computed(() =>
      fibu.value.mileage.filter(m => m.date && new Date(m.date).getFullYear() === year)
        .sort((a,b) => (a.date||'').localeCompare(b.date||''))
    )
    const totalKm = computed(() => mileageEntries.value.reduce((s,m) => s + (m.km||0), 0))
    // BQ-4: km-Pauschale aus Einstellungen, Fallback auf gesetzlichen Wert 0,30 €/km
    const kmRate  = computed(() => settings.value?.bookingTerms?.defaultKmRate ?? 0.30)
    const profit  = computed(() => incomeTotal.value - expensesTotal.value)

    function printPage() {
      const orig = document.title
      document.title = `EAR_${year}_${(settings.value.company.name||'Studio').replace(/[^a-z0-9äöüÄÖÜß\- ]/gi,'_')}`
      window.print()
      setTimeout(() => { document.title = orig }, 2000)
    }

    async function fetchAll() {
      try {
        const [sr, dr, cr, pr, fr] = await Promise.all([
          fetch(`${API}/settings`),
          fetch(`${API}/documents`),
          fetch(`${API}/customers`),
          fetch(`${API}/projects`),
          fetch(`${API}/fibu`),
        ])
        settings.value  = (await sr.json()).data ?? await sr.json()

        // Logo als base64 einbetten → im Druckdialog sofort verfügbar (kein Netzwerkaufruf)
        logoDataUrl.value = await fetchLogoAsDataUrl(
          settings.value?.company?.logoUrl
            ? `${API_BASE}${settings.value.company.logoUrl}`
            : null
        )
        const dj = await dr.json(); documents.value = Array.isArray(dj.data) ? dj.data : (dj.data?.documents || [])
        const cj = await cr.json(); customers.value = Array.isArray(cj.data) ? cj.data : []
        const pj = await pr.json(); projects.value  = Array.isArray(pj.data) ? pj.data : []
        const fj = await fr.json(); fibu.value       = fj.data || { expenses:[], mileage:[] }
      } catch (e) { error.value = 'Fehler: ' + e.message }
      finally { loading.value = false }
    }

    onMounted(fetchAll)
    return {logoDataUrl,  year, loading, error, settings, invoices, correctedIds, incomeTotal, incomePaid, yearExpenses, expensesTotal, expensesByCategory, mileageEntries, kmRate, totalKm, profit, fmtDate, fmtEur, customerName, projectName, goBack, printPage }
  }
}
</script>

<style>
@page { size: A4 portrait; margin: 14mm 18mm 28mm 18mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI','Helvetica Neue',Arial,sans-serif; font-size: 9pt; color: #1a1a1a; background: #d8d8d8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media print { body { background: white; } }
.state-screen { display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:12px;font-size:15px;color:#555; }
.state-error { color:#c0392b; } .state-icon { font-size:32px; }
.toolbar { position:fixed;top:0;left:0;right:0;z-index:500;background:#111827;color:white;display:flex;justify-content:space-between;align-items:center;padding:10px 24px;gap:12px;box-shadow:0 2px 16px rgba(0,0,0,.4); }
.toolbar-left,.toolbar-right { display:flex;align-items:center;gap:10px; }
.btn-back  { background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:white;padding:6px 13px;border-radius:6px;cursor:pointer;font-size:12px; }
.btn-print { background:#4f46e5;border:none;color:white;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600; }
.toolbar-title { font-size:13px;color:rgba(255,255,255,.8);font-weight:500; }
.toolbar-meta  { font-size:12px;color:rgba(255,255,255,.4); }
.pf { position:fixed;bottom:0;left:0;right:0;background:white;padding:0 20mm 4mm 20mm;z-index:100; }
.pf-rule { border:none;border-top:0.5pt solid #ccc;margin-bottom:2.5mm; }
.pf-top  { display:flex;justify-content:space-between;margin-bottom:1.5mm; }
.pf-left,.pf-right { font-size:6.5pt;color:#888; }
.pf-cols { display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm; }
.pf-col  { font-size:6.5pt;color:#666;line-height:1.6; }
.pf-col strong { color:#333; }
.no-screen { display:none; }
@media screen { .no-screen { display:none; } }
@media print  { .no-print { display:none !important; } .no-screen { display:block !important; } .page-wrap { padding:0;background:white; } }
.page-wrap { padding:16px 0 40px;display:flex;flex-direction:column;align-items:center; }
.a4 { width:210mm;min-height:297mm;background:white;display:flex;flex-direction:column; }
@media screen { .a4 { padding:14mm 16mm 12mm;box-shadow:0 4px 32px rgba(0,0,0,.18);margin:0 auto; } }
@media print  { .a4 { width: auto; min-height:0; padding: 0; } }
.letterhead { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4mm; }
.lh-left { flex:1; }
.lh-studio { font-size:11pt;font-weight:700;color:#111; }
.lh-owner  { font-size:8pt;color:#444; }
.lh-addr   { font-size:7.5pt;color:#666;line-height:1.6; }
.lh-contact{ font-size:7pt;color:#888;margin-top:1mm; }
.logo { max-width:48mm;max-height:20mm;object-fit:contain; }
.logo-text { font-size:11pt;font-weight:700;color:#111;text-align:right; }
.title-rule { border:none;border-top:1.5pt solid #111;margin-bottom:3mm; }
.doc-title-block { margin-bottom:5mm;padding-bottom:3mm;border-bottom:1pt solid #ddd; }
.doc-title { font-size:14pt;font-weight:800;color:#111; }
.doc-sub   { font-size:8pt;color:#666;margin-top:2mm;font-style:italic; }
/* Sections */
.ear-section { margin-bottom:5mm;break-inside:avoid; }
.ear-sec-head { display:flex;justify-content:space-between;align-items:center;padding:2.5mm 3mm;border-radius:2px;margin-bottom:2mm; }
.ear-sec-title { font-size:9.5pt;font-weight:700;color:#fff; }
.ear-sec-total { font-size:11pt;font-weight:800;color:#fff; }
.income-head  { background:#059669; }
.expense-head { background:#dc2626; }
.km-head      { background:#2563eb; }
.income-color  { color:#059669; }
.expense-color { color:#dc2626; }
/* Tables */
.ear-table { width:100%;border-collapse:collapse;font-size:8pt; }
.ear-table thead th { padding:2mm 2.5mm;background:#f4f4f4;border-bottom:0.8pt solid #ccc;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#555;text-align:left; }
.ear-table tbody td { padding:1.8mm 2.5mm;border-bottom:0.4pt solid #eee;vertical-align:top; }
.ear-table tbody tr:last-child td { border-bottom:none; }
.sum-row td { padding:2mm 2.5mm;background:#f9f9f9;border-top:1pt solid #ccc;font-size:8pt; }
.sub-row td { background:#fafafa;font-size:7.5pt;color:#555;border-top:none !important; }
.exp-group { margin-bottom:2mm; }
.exp-group-head { font-size:8pt;font-weight:700;color:#333;padding:1.5mm 2.5mm;background:#f0f0f0;border-left:2pt solid #6366f1; }
.doc-num { font-family:monospace;font-size:7pt;background:#f0f0f0;padding:1px 4px;border-radius:2px; }
.tr  { text-align:right; }
.fw7 { font-weight:700; }
.muted { color:#777; }
.empty-row { text-align:center;color:#999;padding:5mm;font-style:italic; }
/* Result box */
.ear-result { background:#f9f9f9;border:0.8pt solid #e0e0e0;border-radius:3px;padding:4mm;margin-bottom:5mm;break-inside:avoid; }
.ear-result-grid { display:flex;flex-direction:column;gap:2mm; }
.ear-result-row { display:flex;justify-content:space-between;font-size:9pt; }
.ear-result-divider { border-top:1pt solid #ccc;margin:1mm 0; }
.ear-result-final { font-size:11pt;font-weight:800; }
/* Footer */
.ear-footer-note { margin-top:4mm;break-inside:avoid; }
.closing-rule { border:none;border-top:0.5pt solid #ccc;margin-bottom:3mm; }
.ear-footer-note p { font-size:7.5pt;color:#555;line-height:1.6; }
.ear-place-date { font-size:7.5pt;color:#777;margin-top:2mm; }
.screen-footer { margin-top:auto;padding-top:5mm; }
.sf-rule  { border:none;border-top:0.5pt solid #ccc;margin-bottom:3mm; }
.sf-cols  { display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm; }
.sf-cols>div { font-size:6.5pt;color:#666;line-height:1.65; }
.fc-bold  { font-weight:700;color:#333; }
@media print { .screen-footer { display:none; } }
.status-dot { font-size:7pt;padding:1px 5px;border-radius:99px;font-weight:600; }
.status-dot.paid { background:rgba(5,150,105,.15);color:#065f46; }
.status-dot.open { background:rgba(234,179,8,.15);color:#92400e; }
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
