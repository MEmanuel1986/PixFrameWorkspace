<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2>✉️ Dokument per E-Mail senden</h2>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <!-- Fehler / Erfolg -->
        <div v-if="success" class="alert alert-success">
          ✅ E-Mail erfolgreich gesendet an <strong>{{ form.to }}</strong>
        </div>
        <div v-if="error" class="alert alert-error">⚠️ {{ error }}</div>
        <div v-if="!smtpConfigured" class="alert alert-warn">
          ⚙️ E-Mail-Versand nicht konfiguriert.
          <router-link to="/settings?tab=email" @click="$emit('close')">Jetzt einrichten →</router-link>
        </div>

        <div class="fg-row">
          <div class="fg" style="flex:2">
            <label>An (E-Mail-Adresse)</label>
            <input type="email" v-model="form.to" placeholder="kunde@example.com" />
          </div>
        </div>

        <div class="fg mt-3">
          <label>Betreff</label>
          <input type="text" v-model="form.subject" />
        </div>

        <div class="fg mt-3">
          <label>Nachricht</label>
          <textarea v-model="form.body" rows="7" style="min-height:140px;font-size:13px;line-height:1.6" />
        </div>

        <!-- PDF Anhang -->
        <div class="attach-row mt-3">
          <label class="chk">
            <input type="checkbox" v-model="attachPdf" :disabled="pdfLoading" />
            <span>📎 PDF-Anhang beifügen ({{ docLabel }})</span>
          </label>
          <span v-if="pdfLoading" class="attach-loading">⏳ PDF wird generiert…</span>
          <span v-if="pdfReady && !pdfLoading" class="attach-ready">✅ PDF bereit ({{ pdfSizeKb }} KB)</span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('close')" :disabled="sending">Abbrechen</button>
        <button class="btn btn-primary" @click="send"
          :disabled="sending || !form.to || !smtpConfigured">
          <span v-if="sending">⏳ Sendet…</span>
          <span v-else>✉️ Senden</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient, { API_BASE } from '../services/api'
import { ref, computed, onMounted, watch } from 'vue'
import { downloadPdfFromElement } from '../services/pdfExport.js'

const API = `${API_BASE}/api`

export default {
  name: 'SendEmailModal',
  props: {
    doc:      { type: Object, default: null },
    customer: { type: Object, default: null },
    project:  { type: Object, default: null },
    settings: { type: Object, default: () => ({}) },
    /** Function that returns the DOM element to render as PDF */
    getPdfElement: { type: Function, default: null },
  },
  emits: ['close'],
  setup(props) {
    const form    = ref({ to: '', subject: '', body: '' })
    const sending = ref(false)
    const success = ref(false)
    const error   = ref(null)

    const attachPdf  = ref(true)
    const pdfBase64  = ref(null)
    const pdfLoading = ref(false)
    const pdfReady   = ref(false)

    const smtpConfigured = ref(false)

    const docLabel = computed(() => props.doc?.documentNumber || 'Dokument')
    const pdfSizeKb = computed(() => pdfBase64.value
      ? Math.round(pdfBase64.value.length * 0.75 / 1024)
      : 0
    )

    function buildDefaultBody() {
      const co   = props.settings?.company || {}
      const cust = props.customer
      const doc  = props.doc
      const salutation = cust?.salutation
        ? `${cust.salutation} ${cust.lastName || ''}`
        : (cust?.firstName ? `${cust.firstName}` : 'Kunden')

      let docType = 'Dokument'
      if (doc?.type === 'invoice') docType = doc.isDeposit ? 'Anzahlungsrechnung' : 'Rechnung'
      if (doc?.type === 'quote')   docType = 'Angebot'

      return `Sehr geehrte/r ${salutation.trim()},

anbei erhalten Sie ${doc?.documentNumber ? `die ${docType} ${doc.documentNumber}` : `Ihr ${docType}`}${props.project?.projectName ? ` für das Projekt „${props.project.projectName}"` : ''}.

Bei Fragen stehe ich Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
${co.owner || co.name || ''}`
    }

    async function generatePdf() {
      if (!props.getPdfElement) return
      pdfLoading.value = true
      pdfBase64.value  = null
      pdfReady.value   = false
      try {
        const el = props.getPdfElement()
        if (!el) return
        const { downloadPdfFromElement: dl } = await import('../services/pdfExport.js')
        // Capture as base64
        // html2pdf.js für PDF-Anhang im E-Mail (einziger verbleibender CDN-Einsatz)
        const html2pdf = await new Promise((res, rej) => {
          if (window.html2pdf) return res(window.html2pdf)
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          s.onload = () => res(window.html2pdf)
          s.onerror = () => rej(new Error('CDN nicht erreichbar'))
          document.head.appendChild(s)
        })
        const pdf = html2pdf().set({
          margin: [10,15,15,15], image:{type:'jpeg',quality:.97},
          html2canvas:{scale:2,useCORS:true,windowWidth:794},
          jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
          pagebreak:{mode:['css','legacy'],avoid:'.section'},
        }).from(el)
        const blob = await pdf.outputPdf('blob')
        const reader = new FileReader()
        reader.onload = (e) => {
          pdfBase64.value = e.target.result.split(',')[1]
          pdfReady.value  = true
        }
        reader.readAsDataURL(blob)
      } catch(e) {
        console.error('PDF generation failed:', e)
      } finally {
        pdfLoading.value = false
      }
    }

    async function send() {
      error.value   = null
      success.value = false
      sending.value = true
      try {
        const payload = {
          to:       form.value.to,
          subject:  form.value.subject,
          body:     form.value.body,
        }
        if (attachPdf.value && pdfBase64.value) {
          payload.pdfBase64  = pdfBase64.value
          payload.pdfFilename = (props.doc?.documentNumber || 'Dokument').replace(/[^\w\-]/g,'_') + '.pdf'
        }
        const res = await fetch(`${API}/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler beim Senden')
        success.value = true
      } catch(e) {
        error.value = e.message
      } finally {
        sending.value = false
      }
    }

    async function checkSmtp() {
      try {
        const r = await fetch(`${API}/email/config`)
        const d = await r.json()
        smtpConfigured.value = !!(d.data?.host && d.data?.user)
      } catch { smtpConfigured.value = false }
    }

    onMounted(async () => {
      await checkSmtp()
      // Pre-fill
      if (props.customer?.email) form.value.to = props.customer.email
      const doc = props.doc
      const docType = doc?.type === 'invoice'
        ? (doc.isDeposit ? 'Anzahlungsrechnung' : 'Rechnung')
        : 'Angebot'
      form.value.subject = [
        docType,
        doc?.documentNumber,
        props.project?.projectName ? `· ${props.project.projectName}` : '',
        '·',
        (props.settings?.company?.name || ''),
      ].filter(Boolean).join(' ')
      form.value.body = buildDefaultBody()
      if (attachPdf.value) await generatePdf()
    })

    watch(attachPdf, async (v) => {
      if (v && !pdfBase64.value) await generatePdf()
    })

    return {
      form, sending, success, error,
      attachPdf, pdfLoading, pdfReady, pdfSizeKb,
      smtpConfigured, docLabel, send,
    }
  }
}
</script>

<style scoped>
.alert { padding: 10px 14px; border-radius: var(--radius); font-size: 13px; margin-bottom: 12px; }
.alert-success { background: var(--success-bg); color: var(--success); border: 1px solid var(--success-border); }
.alert-error   { background: var(--danger-bg);  color: var(--danger);  border: 1px solid var(--danger-border); }
.alert-warn    { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border); }
.alert a { color: inherit; font-weight: 700; }
.attach-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.attach-loading { font-size: 12.5px; color: var(--text-muted); }
.attach-ready   { font-size: 12.5px; color: var(--success); }
</style>
