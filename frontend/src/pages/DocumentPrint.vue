<template>
  <!-- Loading / Error States -->
  <div v-if="loading" class="state-screen">
    <div class="state-spinner">⏳</div>
    <div>Dokument wird geladen…</div>
  </div>
  <div v-else-if="error" class="state-screen state-error">
    <div class="state-spinner">⚠️</div>
    <div>{{ error }}</div>
  </div>

  <template v-else>


    <!-- ── ENTWURF-Wasserzeichen (position:fixed → jede Druckseite) ── -->
    <div v-if="doc.status === 'Entwurf'" class="draft-watermark" aria-hidden="true">ENTWURF</div>

    <!-- ── Logo-Header: erscheint ab Seite 2 oben rechts ── -->
    <header class="page-header-logo no-screen">
      <img v-if="settings.company?.logoUrl"
        :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
        crossorigin="anonymous"
        alt="Logo" />
      <div v-else class="page-header-logo-text">{{ settings.company.name }}</div>
    </header>

    <!-- ── Fixer Seitenfuß (position:fixed → erscheint auf jeder Druckseite) ── -->
    <footer class="print-page-footer">
      <div class="ppf-main-row">
        <span class="ppf-machine">Diese {{ doc?.type === 'invoice' ? 'Rechnung' : 'Angebot' }} wurde maschinell erstellt und ist ohne Unterschrift gültig.</span>
        <span class="ppf-pagenum">Seite <span class="pp-cur"></span> von <span class="pp-tot"></span></span>
      </div>
      <div class="ppf-cols">
        <div class="ppf-col">
          <span class="ppf-bold">{{ settings.company.name }}</span><br />
          <span v-if="settings.company.owner">Inh. {{ settings.company.owner }}<br /></span>
          {{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}
          <span v-if="settings.company.website"><br />{{ settings.company.website }}</span>
          <span v-if="settings.company.email"><br />{{ settings.company.email }}</span>
        </div>
        <div class="ppf-col">
          <span v-if="settings.company.bankName" class="ppf-bold">{{ settings.company.bankName }}</span><br />
          <span v-if="settings.company.iban">IBAN {{ settings.company.iban }}</span><br />
          <span v-if="settings.company.bic">BIC {{ settings.company.bic }}</span>
        </div>
        <div class="ppf-col">
          <span v-if="settings.company.taxNumber">Steuernummer: {{ settings.company.taxNumber }}<br /></span>
          <span v-if="settings.company.vatId && !settings.company.smallBusiness">USt-IdNr.: {{ settings.company.vatId }}<br /></span>
          <span v-if="settings.company.smallBusiness"><em>Kleinunternehmer § 19 Abs. 1 UStG</em></span>
        </div>
      </div>
    </footer>

    <!-- ── A4 Page ── -->
    <div class="page-wrap">
      <div class="a4">

        <!-- ─── TOP BAR: logo right only ─── -->
        <div class="top-bar">
          <div class="logo-area">
            <img
              v-if="settings.company?.logoUrl"
              :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
              crossorigin="anonymous"
              class="company-logo"
              alt="Logo"
            />
            <div v-else class="logo-fallback">
              <div class="logo-name">{{ settings.company.name }}</div>
            </div>
          </div>
        </div>

        <!-- ─── ADDRESS BLOCK + META TABLE ─── -->
        <div class="addr-meta-row">

          <!-- Recipient (DIN 5008 address window) -->
          <div class="addr-block">
            <div class="addr-sender-micro">
              {{ settings.company.name }} · {{ settings.company.street }} · {{ settings.company.zipCode }} {{ settings.company.city }}
            </div>
            <div class="addr-recipient" v-if="customer">
              <div class="addr-salutation" v-if="doc.billingAddress?.salutation || customer.salutation">{{ doc.billingAddress?.salutation || customer.salutation }}</div>
              <div class="addr-name">{{ doc.billingAddress?.name || ((customer.firstName || '') + ' ' + (customer.lastName || '')).trim() }}</div>
              <div v-if="doc.billingAddress?.company || customer.company">{{ doc.billingAddress?.company || customer.company }}</div>
              <div>{{ doc.billingAddress?.street || customer.street }}</div>
              <div>{{ (doc.billingAddress?.zipCode || customer.zipCode) }} {{ doc.billingAddress?.city || customer.city }}</div>
              <div v-if="(doc.billingAddress?.country || customer.country) && (doc.billingAddress?.country || customer.country) !== 'Deutschland'">{{ doc.billingAddress?.country || customer.country }}</div>
            </div>
          </div>

          <!-- Meta info right column -->
          <div class="meta-block">
            <table class="meta-table">
              <tbody>
                <tr>
                  <td class="meta-label">{{ isInvoice ? 'Rechnungsdatum' : 'Angebotsdatum' }}</td>
                  <td class="meta-value">{{ fmtDate(doc.issueDate) }}</td>
                </tr>
                <tr v-if="isInvoice && doc.dueDate">
                  <td class="meta-label">Fälligkeitsdatum</td>
                  <td class="meta-value" :class="{ 'overdue': isOverdue }">{{ fmtDate(doc.dueDate) }}</td>
                </tr>
                <tr v-if="!isInvoice && doc.expiresAt">
                  <td class="meta-label">Gültig bis</td>
                  <td class="meta-value">{{ fmtDate(doc.expiresAt) }}</td>
                </tr>
                <tr>
                  <td class="meta-label">{{ isInvoice ? 'Rechnungs-Nr.' : 'Angebots-Nr.' }}</td>
                  <td class="meta-value fw-700">{{ doc.documentNumber || '—' }}</td>
                </tr>
                <tr v-if="customer && customer.customerNumber">
                  <td class="meta-label">Kunden-Nr.</td>
                  <td class="meta-value">{{ customer.customerNumber }}</td>
                </tr>
                <tr v-if="customer && customer.phone">
                  <td class="meta-label">Tel.</td>
                  <td class="meta-value">{{ customer.phone }}</td>
                </tr>
                <tr v-if="customer && customer.email">
                  <td class="meta-label">E-Mail</td>
                  <td class="meta-value">{{ customer.email }}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        <!-- ─── DOCUMENT TITLE ─── -->
        <div class="doc-title-block">
          <h1 class="doc-title">
            {{ isInvoice ? 'Rechnungs-Nr.' : 'Angebots-Nr.' }}: {{ doc.documentNumber
            }}<span v-if="project"> · {{ project.projectName }}</span><span v-else-if="doc.name"> · {{ doc.name }}</span>
          </h1>
          <div class="doc-event-line" v-if="project && project.booking">
            vom {{ fmtDate(project.booking) }}<span v-if="project.bookingDuration"> · {{ project.bookingDuration }}</span>
          </div>
        </div>

        <!-- ─── SALUTATION + INTRO ─── -->
        <!-- ── Stornorechnung: Stornierungsgrund ── -->
        <div v-if="doc.docSubtype === 'cancellation'" class="storno-reason-block" style="margin-bottom:14px;padding:10px 14px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:4px">
          <div style="font-size:11pt;font-weight:700;color:#991b1b;margin-bottom:4px">Stornorechnung</div>
          <div style="font-size:10pt;color:#7f1d1d">{{ doc.intro }}</div>
          <div v-if="doc.notes" style="font-size:10pt;color:#7f1d1d;margin-top:4px">Grund: <strong>{{ doc.notes }}</strong></div>
        </div>
        <div class="intro-block">
          <div class="salutation" v-if="customer">
            {{ customer.salutation === 'Frau' ? 'Sehr geehrte Frau' : customer.salutation === 'Herr' ? 'Sehr geehrter Herr' : 'Sehr geehrte Damen und Herren' }}<span v-if="customer.salutation && customer.lastName"> {{ customer.lastName }},</span>
          </div>
          <div class="intro-text" v-if="settings.company.invoiceIntro">
            {{ settings.company.invoiceIntro }}
          </div>
          <div class="intro-text" v-else>
            hiermit {{ isInvoice ? 'berechnen wir Ihnen' : 'unterbreiten wir Ihnen unser Angebot für' }} folgende Leistungen:
          </div>
        </div>

        <!-- ─── LINE ITEMS TABLE ─── -->
        <div class="items-section">

          <!-- With line items -->
          <table v-if="hasLineItems" class="items-table">
            <thead>
              <tr>
                <th class="col-pos">Pos.</th>
                <th class="col-desc">Beschreibung</th>
                <th class="col-vat">USt.</th>
                <th class="col-qty">Menge</th>
                <th class="col-unit">Einheit</th>
                <th class="col-price">Einzelpreis</th>
                <th class="col-total">Gesamtpreis</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in doc.lineItems" :key="i">
                <td class="col-pos">{{ i + 1 }}.</td>
                <td class="col-desc">
                  <div class="item-header">
                    <span class="item-name">{{ item.name || item.description }}</span>
                  </div>
                  <div class="item-sku" v-if="item.articleId || item.sku">
                    Art.-Nr. {{ item.articleId || item.sku }}
                  </div>
                  <div class="item-detail" v-if="item.detail || item.notes">{{ item.detail || item.notes }}</div>
                </td>
                <td class="col-vat">{{ item.taxRate != null ? item.taxRate + ' %' : (item.vatRate != null ? item.vatRate + ' %' : (settings.company.smallBusiness ? '0 %' : '19 %')) }}</td>
                <td class="col-qty">{{ fmtNum(item.quantity ?? 1) }}</td>
                <td class="col-unit">{{ item.unit || 'Pauschal' }}</td>
                <td class="col-price">{{ fmtCurrency(item.priceNet ?? item.unitPrice ?? item.price) }}</td>
                                <td class="col-total fw-600">{{ fmtCurrency((item.quantity ?? 1) * (item.priceNet ?? item.unitPrice ?? item.price ?? 0) * (1 - (item.discount ?? 0) / 100)) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Fallback single line -->
          <table v-else class="items-table">
            <thead>
              <tr>
                <th class="col-pos">Pos.</th>
                <th class="col-desc">Beschreibung</th>
                <th class="col-vat">USt.</th>
                <th class="col-total">Betrag (netto)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="col-pos">1.</td>
                <td class="col-desc">
                  <div class="item-name">{{ doc.name }}</div>
                  <div class="item-detail" v-if="doc.notes">{{ doc.notes }}</div>
                </td>
                <td class="col-vat">{{ settings.company.smallBusiness ? '0 %' : '19 %' }}</td>
                <td class="col-total fw-600">
                  {{ settings.company.smallBusiness ? fmtCurrency(doc.total) : fmtCurrency((doc.total || 0) / 1.19) }}
                </td>
              </tr>
            </tbody>
          </table>

        </div>

        <!-- ─── TOTALS BLOCK ─── -->
        <div class="totals-section">
          <table class="totals-table">
            <tbody>
              <tr v-if="hasLineItems && doc.subtotal != null">
                <td class="tot-label">Gesamt netto</td>
                <td class="tot-value">{{ fmtCurrency(doc.subtotal) }}</td>
              </tr>
              <tr v-else-if="!hasLineItems && !settings.company.smallBusiness">
                <td class="tot-label">Gesamt netto</td>
                <td class="tot-value">{{ fmtCurrency((doc.total || 0) / 1.19) }}</td>
              </tr>
              <tr v-if="doc.discount && doc.discount > 0">
                <td class="tot-label">Rabatt</td>
                <td class="tot-value tot-discount">− {{ fmtCurrency(doc.discount) }}</td>
              </tr>
              <template v-if="hasLineItems && doc.taxGroups && doc.taxGroups.length">
                <tr v-for="tg in doc.taxGroups" :key="tg.rate">
                  <td class="tot-label">USt. {{ tg.rate }} %</td>
                  <td class="tot-value">{{ fmtCurrency(tg.amount) }}</td>
                </tr>
              </template>
              <template v-else-if="settings.company.smallBusiness">
                <tr>
                  <td class="tot-label">USt. 0 %</td>
                  <td class="tot-value">{{ fmtCurrency(0) }}</td>
                </tr>
              </template>
              <template v-else>
                <tr>
                  <td class="tot-label">USt. 19 %</td>
                  <td class="tot-value">{{ fmtCurrency((doc.total || 0) - (doc.total || 0) / 1.19) }}</td>
                </tr>
              </template>
              <tr class="tot-grand">
                <td class="tot-label">Gesamt brutto</td>
                <td class="tot-value">{{ fmtCurrency(doc.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ─── FOOTER NOTES ─── -->
        <div class="footer-text-block">
          <p v-if="isInvoice" class="footer-note">
            <template v-if="doc.serviceDate">Das Leistungsdatum entspricht dem {{ fmtDate(doc.serviceDate) }}.</template>
            <template v-else-if="project && project.booking">Das Leistungsdatum entspricht dem {{ fmtDate(project.booking) }}.</template>
            <template v-else>Das Leistungsdatum entspricht dem Rechnungsdatum, sofern nichts anderes erwähnt wird.</template>
          </p>
          <p v-if="isInvoice && doc.dueDate" class="footer-note">
            Bitte überweisen Sie den Betrag bis zum {{ fmtDate(doc.dueDate) }} auf das angegebene Bankkonto unter Angabe der Rechnungsnummer.
          </p>
          <p v-if="settings.company.smallBusiness" class="footer-note footer-italic">
            Als Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.
          </p>
          <p v-if="settings.company.invoiceFooter" class="footer-note">{{ settings.company.invoiceFooter }}</p>
          <p v-if="!isInvoice && doc.expiresAt" class="footer-note">Dieses Angebot ist gültig bis {{ fmtDate(doc.expiresAt) }}.</p>
          <!-- "maschinell erstellt" now in fixed page footer -->
        </div>

        <!-- ─── PAYMENT INFO (invoice only) ─── -->
        <div v-if="isInvoice && settings.company.iban" class="payment-block">
          <div class="payment-title">Bankverbindung</div>
          <table class="payment-table">
            <tbody>
              <tr>
                <td class="pay-label">Kontoinhaber</td>
                <td class="pay-value">{{ settings.company.owner || settings.company.name }}</td>
              </tr>
              <tr v-if="settings.company.name">
                <td class="pay-label">Unternehmen</td>
                <td class="pay-value">{{ settings.company.name }}</td>
              </tr>
              <tr v-if="settings.company.bankName">
                <td class="pay-label">Bank</td>
                <td class="pay-value">{{ settings.company.bankName }}</td>
              </tr>
              <tr>
                <td class="pay-label">IBAN</td>
                <td class="pay-value fw-600">{{ settings.company.iban }}</td>
              </tr>
              <tr v-if="settings.company.bic">
                <td class="pay-label">BIC</td>
                <td class="pay-value">{{ settings.company.bic }}</td>
              </tr>
              <tr>
                <td class="pay-label">Verwendungszweck</td>
                <td class="pay-value fw-600">{{ doc.documentNumber }} · {{ doc.name }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ─── Inline-Seitenfuß (nur Bildschirm, 1. Seite) ─── -->
        <footer class="inline-page-footer">
          <hr class="footer-rule" />
          <div class="footer-cols">
            <div class="footer-col">
              <div class="footer-col-title">{{ settings.company.name }}</div>
              <div v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div>
              <div>{{ settings.company.street }}</div>
              <div>{{ settings.company.zipCode }} {{ settings.company.city }}</div>
              <div v-if="settings.company.website">{{ settings.company.website }}</div>
              <div v-if="settings.company.email">{{ settings.company.email }}</div>
            </div>
            <div class="footer-col">
              <div class="footer-col-title">{{ settings.company.bankName || 'Bankverbindung' }}</div>
              <div v-if="settings.company.iban">IBAN {{ settings.company.iban }}</div>
              <div v-if="settings.company.bic">BIC {{ settings.company.bic }}</div>
            </div>
            <div class="footer-col">
              <div class="footer-col-title">Steuer &amp; Kontakt</div>
              <div v-if="settings.company.taxNumber">Steuernummer: {{ settings.company.taxNumber }}</div>
              <div v-if="settings.company.vatId && !settings.company.smallBusiness">USt-IdNr.: {{ settings.company.vatId }}</div>
              <div v-if="settings.company.phone">Tel: {{ settings.company.phone }}</div>
            </div>
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
import { generateZugferdXml, downloadZugferdXml } from '../services/zugferd.js'
import { downloadPdfFromBackend, printWithFilename, fetchLogoAsDataUrl } from '../services/pdfExport.js'

const API = `${API_BASE}/api`

export default {
  name: 'DocumentPrint',
  setup() {
    const route    = useRoute()
    const router   = useRouter()
    function goBack() { window.history.length > 1 ? router.back() : window.close() }
    const logoDataUrl = ref(null)  // base64-eingebettetes Logo
        const loading  = ref(true)
    const pdfLoading = ref(false)
    const error    = ref(null)
    const doc      = ref(null)
    const customer = ref(null)
    const project  = ref(null)
    const settings    = ref({ company: {} })

    const isInvoice    = computed(() => doc.value?.type === 'invoice')
    const isOverdue    = computed(() => {
      if (!doc.value?.dueDate) return false
      return new Date(doc.value.dueDate) < new Date()
    })
    const hasLineItems = computed(() =>
      Array.isArray(doc.value?.lineItems) && doc.value.lineItems.length > 0
    )

    function fmtDate(d) {
      if (!d) return '—'
      // ISO-Format (YYYY-MM-DD) direkt parsen; deutsches Format (DD.MM.YYYY) konvertieren
      let parsed
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(d))) {
        const [day, month, year] = String(d).split('.')
        parsed = new Date(`${year}-${month}-${day}`)
      } else {
        parsed = new Date(d)
      }
      if (isNaN(parsed)) return String(d)
      return parsed.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    function fmtCurrency(v) {
      if (v == null) return '—'
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)
    }
    function fmtNum(v) {
      if (v == null) return ''
      return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v)
    }

    /** PDF via Puppeteer-Backend herunterladen */
    async function downloadPDF() {
      const d    = doc.value
      const cust = customer.value
      const filename = [d?.documentNumber, cust?.lastName||cust?.firstName].filter(Boolean).join('_')
      pdfLoading.value = true
      try {
        await downloadPdfFromBackend(`/api/pdf/document/${route.params.id}`, filename)
      } catch (e) {
        console.error('[DocumentPrint] PDF-Download fehlgeschlagen:', e)
      } finally {
        pdfLoading.value = false
      }
    }

    /** Drucken via Browser-Druckdialog (Direktdruck) */
    function printDoc() {
      const d    = doc.value
      const cust = customer.value
      printWithFilename([d?.documentNumber, cust?.lastName||cust?.firstName].filter(Boolean).join('_'))
    }

    /** ZUGFeRD 2.3 / Factur-X MINIMUM XML generieren und herunterladen */
    function downloadZugferd() {
      if (!doc.value) return
      const xml = generateZugferdXml(doc.value, customer.value, settings.value, project.value)
      downloadZugferdXml(xml, doc.value.documentNumber)
    }

    async function fetchAll() {
      try {
        const [docRes, settingsRes] = await Promise.all([
          fetch(`${API}/documents/${route.params.id}`),
          fetch(`${API}/settings`),
        ])
        if (!docRes.ok) throw new Error('Dokument nicht gefunden (HTTP ' + docRes.status + ')')
        const docJson      = await docRes.json()
        const settingsJson = await settingsRes.json()
        doc.value      = docJson.data      ?? docJson
        settings.value = settingsJson.data ?? settingsJson
        // Logo als base64 einbetten → im Druckdialog sofort verfügbar (kein Netzwerkaufruf)
        logoDataUrl.value = await fetchLogoAsDataUrl(
          settings.value?.company?.logoUrl
            ? `${API_BASE}${settings.value.company.logoUrl}`
            : null
        )

        const [custRes, projRes] = await Promise.all([
          doc.value.customerId ? fetch(`${API}/customers/${doc.value.customerId}`) : Promise.resolve(null),
          doc.value.projectId  ? fetch(`${API}/projects/${doc.value.projectId}`)  : Promise.resolve(null),
        ])
        if (custRes?.ok) { const j = await custRes.json(); customer.value = j.data ?? j }
        if (projRes?.ok) { const j = await projRes.json(); project.value  = j.data ?? j }
      } catch (e) {
        error.value = 'Fehler beim Laden: ' + e.message
      } finally {
        loading.value = false
      }
    }

    onMounted(async () => {
      await fetchAll()
      // Auto-trigger: ?action=print oder ?action=download → direkt Druckdialog
      const action = route.query.action
      if (action === 'print' || action === 'download') {
        // 800ms Delay damit Vue das Dokument vollständig gerendert hat
        setTimeout(() => printDoc(), 800)
      }
    })

    return {
      logoDataUrl, loading, pdfLoading, error, doc, customer, project, settings, isInvoice, isOverdue, hasLineItems,
      fmtDate, fmtCurrency, fmtNum,
      downloadPDF, printDoc, downloadZugferd, goBack,
    }
  }
}
</script>

<style>
@page { size: A4 portrait; margin: 14mm 18mm 28mm 18mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 9pt; color: #1a1a1a; background: #e0e0e0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* States */
.state-screen { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; gap:12px; font-size:15px; color:#555; }
.state-error { color:#c0392b; } .state-spinner { font-size:32px; }

/* Toolbar */
.toolbar { position:fixed; top:0; left:0; right:0; z-index:500; background:#111827; color:white; display:flex; justify-content:space-between; align-items:center; padding:11px 24px; gap:16px; box-shadow:0 2px 16px rgba(0,0,0,.4); }
.toolbar-left { display:flex; align-items:center; gap:14px; min-width:0; }
.btn-back { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:white; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:13px; white-space:nowrap; flex-shrink:0; }
.btn-back:hover { background:rgba(255,255,255,.22); }
.toolbar-title { font-size:13px; color:rgba(255,255,255,.7); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.btn-print { background:#2563eb; border:none; color:white; padding:8px 20px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; white-space:nowrap; flex-shrink:0; }
.btn-print:hover { background:#1d4ed8; }
/* IT-Doku-style Druck-Hinweis */
.print-hint { background:#f0f7ff; border:1px solid #bfdbfe; border-radius:6px; padding:10px 18px; margin:0 20px 12px; font-size:13px; color:#1e3a5f; display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
.print-hint kbd { display:inline-block; background:#e8edf8; border:1px solid #b0bcd4; border-radius:4px; padding:2px 8px; font-family:'Courier New', monospace; font-size:12px; margin:0 2px; }
@media print { .print-hint { display:none; } }
.btn-pdf { background:#059669; border:none; color:white; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; white-space:nowrap; flex-shrink:0; transition:all .14s; }
.btn-pdf:hover { background:#047857; }
.btn-pdf:disabled { opacity:.6; cursor:wait; }
.toolbar-right { display:flex; align-items:center; gap:8px; }
.btn-xml { background:rgba(5,150,105,.2); border:1px solid rgba(5,150,105,.4); color:#6ee7b7; padding:7px 14px; border-radius:6px; cursor:pointer; font-size:12.5px; font-weight:600; }
.btn-xml:hover { background:rgba(5,150,105,.35); }
.tbadge { font-size:11px; padding:2px 8px; border-radius:99px; border:1px solid transparent; }
.tbadge.status-entwurf { background:rgba(107,114,128,.2); color:#9ca3af; border-color:rgba(107,114,128,.3); }
.tbadge.status-versendet { background:rgba(59,130,246,.2); color:#93c5fd; border-color:rgba(59,130,246,.3); }
.tbadge.status-bezahlt { background:rgba(5,150,105,.2); color:#6ee7b7; border-color:rgba(5,150,105,.3); }
.tbadge.status-storniert { background:rgba(239,68,68,.2); color:#fca5a5; border-color:rgba(239,68,68,.3); }

/* ENTWURF: position:fixed → jede Druckseite */
.draft-watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:90pt; font-weight:900; color:rgba(0,0,0,0.048); letter-spacing:12px; pointer-events:none; white-space:nowrap; user-select:none; z-index:0; }
@media screen { .draft-watermark { display:none; } }

/* Fixer Seitenfuß: position:fixed → jede Druckseite */
.print-page-footer { position:fixed; bottom:0; left:0; right:0; background:white; padding:0 20mm 5mm 20mm; z-index:100; }
.ppf-rule { border:none; border-top:0.5pt solid #aaa; margin-bottom:2.5mm; }
.ppf-main-row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2.5mm; }
.ppf-machine { font-size:7pt; color:#555; }
.ppf-pagenum { font-size:7pt; color:#888; white-space:nowrap; }
/* JS fills these via CSS counter trick or inline script */
.pp-cur::before { content: counter(page); }
.pp-tot::before { content: counter(pages); }
.ppf-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; }
.ppf-col  { font-size:6.5pt; color:#555; line-height:1.65; }
.ppf-bold { font-weight:700; color:#222; }
@media screen { .print-page-footer { display:none; } }

/* Seiten-Wrapper */
.page-wrap { padding:16px 0 40px; display:flex; justify-content:center; }
@media print { .no-print { display:none !important; } .page-wrap { padding:0; background:white; display:block; } }

/* A4 Blatt */
.a4 { width:210mm; min-height:297mm; background:white; padding:22mm 20mm 22mm 20mm; display:flex; flex-direction:column; }
@media screen { .a4 { box-shadow:0 4px 32px rgba(0,0,0,.18); margin:0 auto; } }
@media print  { .a4 { width: auto; min-height:0; padding: 0; } }

/* Inline-Footer (nur Bildschirm) */
.inline-page-footer { margin-top:auto; padding-top:5mm; }
.inline-page-footer { display:none; }

/* Logo-Bereich */
.top-bar { display:flex; justify-content:flex-end; align-items:flex-start; margin-bottom:7mm; }
.logo-area { flex-shrink:0; max-width:62mm; text-align:right; }
.company-logo { max-width:60mm; max-height:28mm; object-fit:contain; display:block; margin-left:auto; }
.logo-fallback { text-align:right; }
.logo-name { font-size:14pt; font-weight:700; color:#111; line-height:1.2; }

/* Adresse + Meta */
.addr-meta-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:7mm; gap:10mm; }
.addr-block { min-width:78mm; max-width:88mm; }
.addr-sender-micro { font-size:7pt; color:#888; border-bottom:0.4pt solid #bbb; padding-bottom:2px; margin-bottom:3.5mm; line-height:1.4; }
.addr-recipient { line-height:1.7; font-size:10pt; }
.addr-salutation { color:#444; font-size:9.5pt; }
.addr-name { font-weight:700; font-size:10.5pt; }
.meta-block { flex-shrink:0; }
.meta-table { border-collapse:collapse; }
.meta-label { font-size:7.5pt; color:#777; padding:1.5px 10px 1.5px 0; white-space:nowrap; vertical-align:top; }
.meta-value { font-size:8pt; color:#111; text-align:right; padding:1.5px 0; white-space:nowrap; }
.meta-value.overdue { color:#c0392b; font-weight:700; }
.fw-700 { font-weight:700; } .fw-600 { font-weight:600; }

/* Dokumenttitel */
.doc-title-block { margin-bottom:6mm; padding-bottom:4mm; border-bottom:0.5pt solid #ccc; break-after:avoid; }
.doc-title { font-size:13pt; font-weight:700; color:#111; line-height:1.35; }
.doc-event-line { font-size:8.5pt; color:#666; margin-top:2px; }

/* Intro */
.intro-block { margin-bottom:5mm; }
.salutation { font-size:9.5pt; margin-bottom:1.5mm; }
.intro-text { font-size:9pt; color:#333; }

/* Positions-Tabelle — Tabellenköpfe wiederholen sich auf jeder Seite */
.items-section { margin-bottom:0; flex:1; }
.items-table { width:100%; border-collapse:collapse; font-size:8.5pt; }
.items-table thead { display:table-header-group; }
.items-table thead tr { background:#f4f4f4; border-top:0.7pt solid #bbb; border-bottom:0.7pt solid #bbb; }
.items-table thead th { padding:3.5px 5px; font-weight:700; font-size:7.5pt; color:#222; text-align:left; }
.items-table tbody tr { border-bottom:0.4pt solid #e8e8e8; break-inside:avoid; }
.items-table tbody tr:last-child { border-bottom:0.8pt solid #bbb; }
.items-table tbody td { padding:4px 5px; vertical-align:top; }
.col-pos { width:8mm; color:#666; }
.col-vat { width:12mm; text-align:center; }
.col-qty { width:14mm; text-align:right; }
.col-unit { width:17mm; }
.col-price { width:23mm; text-align:right; }
.col-total { width:23mm; text-align:right; }
.item-name   { font-weight:600; color:#111; line-height:1.35; }
.item-detail { font-size:7.5pt; color:#555; margin-top:2px; white-space:pre-wrap; line-height:1.4; }
.item-sku    { font-size:7pt; color:#888; margin-top:3px; letter-spacing:0.1px; }

/* Summen */
.totals-section { display:flex; justify-content:flex-end; margin-top:2mm; margin-bottom:4mm; break-inside:avoid; }
.totals-table { border-collapse:collapse; min-width:68mm; }
.totals-table tbody tr { border-bottom:0.3pt solid #e5e5e5; }
.tot-label { padding:2.5px 14px 2.5px 0; font-size:8.5pt; color:#444; white-space:nowrap; }
.tot-value { padding:2.5px 0; font-size:8.5pt; color:#111; text-align:right; min-width:24mm; }
.tot-discount { color:#c0392b; }
.tot-grand .tot-label, .tot-grand .tot-value { font-size:10.5pt; font-weight:700; color:#111; padding-top:4px; padding-bottom:2px; border-top:1pt solid #111; border-bottom:none; }

/* Fußnotentexte */
.footer-text-block { margin-top:2mm; margin-bottom:3mm; display:flex; flex-direction:column; gap:1px; break-inside:avoid; }
.footer-note { font-size:7.5pt; color:#555; line-height:1.55; orphans:3; widows:3; }
.footer-italic { font-style:italic; }
.footer-machine { margin-top:3px; }

/* Zahlungsblock */
.payment-block { margin-bottom:4mm; padding:3.5mm 4.5mm; background:#f9f9f9; border:0.5pt solid #ddd; border-radius:3px; break-inside:avoid; }
.payment-title { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:2.5mm; }
.payment-table { border-collapse:collapse; width:100%; }
.pay-label { font-size:8pt; color:#777; padding:1.5px 12px 1.5px 0; white-space:nowrap; vertical-align:top; width:35mm; }
.pay-value { font-size:8.5pt; color:#111; padding:1.5px 0; }

/* ── Stornorechnung Grund ── */
.storno-reason-block { margin-bottom: 14px; padding: 10px 14px; background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 4px; }
.storno-reason-title { font-size: 11pt; font-weight: 700; color: #991b1b; margin-bottom: 4px; }
.storno-reason-text  { font-size: 10pt; color: #7f1d1d; }

/* ── Logo-Header ab Seite 2 ── */
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
.page-header-logo-text {
  font-size: 10pt;
  font-weight: 700;
  color: #111;
}

/* Seite 1: page-wrap überdeckt den fixed Logo-Header */
@media print {
  .page-wrap { position: relative; z-index: 250; }
}
</style>