<template>
  <div v-if="loading" class="state-screen"><div class="state-icon">⏳</div><div>ADV wird geladen…</div></div>
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
    <!-- IT-Doku-style Druck-Hinweis -->


    <!-- ENTWURF: position:fixed → JEDE Druckseite -->
    <div v-if="false" class="draft-watermark" aria-hidden="true">ENTWURF</div>

    <!-- Fixer Seitenfuß: position:fixed → JEDE Druckseite -->
    <footer class="print-page-footer no-screen">
      <div class="ppf-cols">
        <div class="ppf-col">
          <span class="ppf-bold">{{ settings.company.name }}</span>
          <span v-if="settings.company.owner"><br />Inh. {{ settings.company.owner }}</span><br />
          {{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}
          <span v-if="settings.company.website"><br />{{ settings.company.website }}</span>
          <span v-if="settings.company.email"><br />{{ settings.company.email }}</span>
        </div>
        <div class="ppf-col">
          <span v-if="settings.company.bankName" class="ppf-bold">{{ settings.company.bankName }}</span>
          <span v-if="settings.company.iban"><br />IBAN {{ settings.company.iban }}</span>
          <span v-if="settings.company.bic"><br />BIC {{ settings.company.bic }}</span>
        </div>
        <div class="ppf-col">
          <span v-if="settings.company.taxNumber">Steuernr.: {{ settings.company.taxNumber }}</span>
          <span v-if="settings.company.vatId && !settings.company.smallBusiness"><br />USt-IdNr.: {{ settings.company.vatId }}</span>
          <span v-if="settings.company.smallBusiness"><br /><em>Kleinunternehmer § 19 Abs. 1 UStG</em></span>
        </div>
      </div>
    </footer>

    <div class="print-content">

        <!-- Letterhead -->
        <div class="letterhead">
          <div class="letterhead-left">
            <div class="lh-studio">{{ settings.company.name }}</div>
            <div class="lh-detail">{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
            <div class="lh-detail" v-if="settings.company.email">{{ settings.company.email }}</div>
          </div>
          <img v-if="settings.company?.logoUrl"
            :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
            crossorigin="anonymous"
            class="logo" alt="Logo" />
        </div>
        <hr class="head-rule" />

        <h1 class="adv-title">Vereinbarung zur Auftragsverarbeitung</h1>
        <div class="adv-law">gemäß Art. 28 Datenschutz-Grundverordnung (DSGVO)</div>

        <div class="section">
          <h2 class="sh">Präambel</h2>
          <p>
            Diese Vereinbarung regelt die Verarbeitung personenbezogener Daten durch den Auftragnehmer im
            Auftrag des Auftraggebers im Rahmen des Fotoauftrags
            <strong>„{{ project.projectName }}"</strong> vom <strong>{{ fmtDate(project.booking) }}</strong>.
            Sie ergänzt den zugrundeliegenden Hauptvertrag und ist Bestandteil desselben.
          </p>
          <p class="mt-4">
            Die Parteien sind sich einig, dass soweit der Auftragnehmer zur Erfüllung des Hauptvertrags
            personenbezogene Daten des Auftraggebers oder von diesem beauftragter Personen verarbeitet,
            dies ausschließlich im Auftrag und nach Weisung des Auftraggebers erfolgt.
          </p>
        </div>

        <div class="section">
          <h2 class="sh">§ 1 Vertragsparteien</h2>
          <div class="parties-grid">
            <div class="party-block">
              <div class="party-role">Auftragsverarbeiter (Art. 4 Nr. 8 DSGVO)</div>
              <div class="party-name">{{ settings.company.name }}</div>
              <div v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div>
              <div>{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
              <div v-if="settings.company.email">{{ settings.company.email }}</div>
            </div>
            <div class="party-und">und</div>
            <div class="party-block">
              <div class="party-role">Verantwortlicher / Auftraggeber (Art. 4 Nr. 7 DSGVO)</div>
              <div class="party-name" v-if="customer">
                {{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}
              </div>
              <div v-if="customer && customer.company" class="party-company">{{ customer.company }}</div>
              <div v-if="customer">{{ customer.street }} {{ customer.houseNumber }}, {{ customer.zipCode }} {{ customer.city }}</div>
              <div v-if="customer && customer.email">{{ customer.email }}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="sh">§ 2 Gegenstand, Art, Zweck und Dauer der Verarbeitung</h2>
          <table class="detail-table mt-3">
            <tbody>
              <tr><td class="dl">Gegenstand</td><td class="dv">Fotografische und/oder videografische Dokumentation des Auftrags „{{ project.projectName }}"</td></tr>
              <tr><td class="dl">Art der Verarbeitung</td><td class="dv">Erhebung, Erfassung, Speicherung, Verarbeitung, Übermittlung und Bereitstellung personenbezogener Bild- und Videodaten</td></tr>
              <tr><td class="dl">Zweck</td><td class="dv">Erbringung der vertraglichen Fotodienstleistung; Lieferung des Bildmaterials an den Auftraggeber; ggf. Portfolioverwendung gem. Hauptvertrag</td></tr>
              <tr><td class="dl">Dauer</td><td class="dv">Entspricht der Laufzeit des Hauptvertrages; Rohdaten-Archivierung max. 3 Monate nach Termin</td></tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2 class="sh">§ 3 Art der personenbezogenen Daten und Kategorien betroffener Personen</h2>
          <p><strong>Verarbeitete Datenkategorien:</strong></p>
          <ul class="adv-list mt-2">
            <li>Bilddaten und Videoaufnahmen (Identifikationsmerkmal i.S.d. Art. 4 Nr. 1 DSGVO)</li>
            <li>Name und Kontaktdaten des Auftraggebers und ggf. weiterer abgebildeter Personen</li>
            <li>Metadaten der Aufnahmen (Ort, Uhrzeit, Kameradaten – keine Weitergabe)</li>
          </ul>
          <p class="mt-4"><strong>Kategorien betroffener Personen:</strong></p>
          <ul class="adv-list mt-2">
            <li>Auftraggeber und dessen Mitarbeitende / Familienangehörige</li>
            <li>Gäste und Teilnehmer der Veranstaltung, die abgelichtet werden</li>
          </ul>
          <p class="mt-4 hint-text">
            ⚠️ Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) – z. B. Gesundheitsdaten, religiöse
            Überzeugungen – werden im Rahmen dieses Auftrags nicht gezielt erhoben.
            Sollten solche Merkmale auf Bildern erkennbar sein, ist der Auftraggeber für die
            Einholung entsprechender Einwilligungen der abgebildeten Personen verantwortlich.
          </p>
        </div>

        <div class="section">
          <h2 class="sh">§ 4 Pflichten des Auftragsverarbeiters (Art. 28 Abs. 3 DSGVO)</h2>
          <p>Der Auftragsverarbeiter verpflichtet sich insbesondere:</p>
          <ul class="adv-list mt-2">
            <li>Daten ausschließlich auf dokumentierte Weisung des Auftraggebers zu verarbeiten (Art. 28 Abs. 3 lit. a DSGVO)</li>
            <li>zur Vertraulichkeit aller im Rahmen des Auftrags zugänglichen personenbezogenen Daten (Art. 28 Abs. 3 lit. b DSGVO)</li>
            <li>angemessene technische und organisatorische Maßnahmen (TOMs) zum Datenschutz umzusetzen (Art. 32 DSGVO)</li>
            <li>keine Subauftragnehmer ohne vorherige schriftliche Genehmigung des Auftraggebers einzusetzen (Art. 28 Abs. 2 DSGVO). Ausnahmen: Bildbearbeitungssoftware, verschlüsselte Cloud-Dienste im EWR</li>
            <li>den Auftraggeber bei der Erfüllung der Betroffenenrechte (Art. 15–22 DSGVO) zu unterstützen</li>
            <li>nach Abschluss des Auftrags alle Daten zu löschen oder zurückzugeben und bestehende Kopien zu vernichten, soweit keine gesetzliche Pflicht zur Aufbewahrung besteht</li>
          </ul>
        </div>

        <div class="section">
          <h2 class="sh">§ 5 Technische und organisatorische Maßnahmen (TOMs, Art. 32 DSGVO)</h2>
          <p>Der Auftragsverarbeiter trifft mindestens folgende Maßnahmen:</p>
          <div class="tom-grid mt-3">
            <div class="tom-item">
              <div class="tom-cat">Vertraulichkeit</div>
              <div class="tom-text">Zugriffskontrolle auf Speichermedien; passwortgeschützte Rechner und Mobilgeräte; verschlüsselte Übertragung bei Online-Galerien (HTTPS)</div>
            </div>
            <div class="tom-item">
              <div class="tom-cat">Integrität</div>
              <div class="tom-text">Mehrfach-Backup unmittelbar nach dem Shooting (mind. 2 physische Datenträger); Prüfsummen-Verifikation; keine Bildbearbeitung ohne Backup</div>
            </div>
            <div class="tom-item">
              <div class="tom-cat">Verfügbarkeit</div>
              <div class="tom-text">Regelmäßige Datensicherung; Nutzung von RAID-Systemen oder externen Backup-Speichern; Schutz vor physischem Datenverlust</div>
            </div>
            <div class="tom-item">
              <div class="tom-cat">Belastbarkeit</div>
              <div class="tom-text">Redundante Speicherung der Rohdaten für mind. 3 Monate nach Termin; Online-Galerie-Links mit Passwortschutz und zeitlicher Begrenzung</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="sh">§ 6 Subunternehmer (Art. 28 Abs. 4 DSGVO)</h2>
          <p>
            Der Einsatz von Subunternehmern (z. B. weiterer Fotografen, Videografen) bedarf der vorherigen
            schriftlichen Genehmigung des Auftraggebers. Bereits genehmigte Subunternehmer für diesen Auftrag:
          </p>
          <div v-if="project.team && project.team.length > 0" class="adv-team mt-3">
            <div v-for="m in project.team" :key="m.name" class="team-row">
              <span class="team-name">{{ m.name }}</span>
              <span class="team-role">· {{ m.role }}</span>
            </div>
          </div>
          <p v-else class="mt-3 hint-text">Keine weiteren Subunternehmer vorgesehen.</p>
          <p class="mt-4">
            Etwaige Subunternehmer werden durch den Auftragsverarbeiter schriftlich zur Einhaltung der
            datenschutzrechtlichen Anforderungen verpflichtet (Art. 28 Abs. 4 DSGVO).
          </p>
        </div>

        <div class="section">
          <h2 class="sh">§ 7 Haftung und Schadensersatz (Art. 82 DSGVO)</h2>
          <p>
            Verantwortlicher für die Verarbeitung personenbezogener Daten im Sinne der DSGVO ist der
            Auftraggeber. Der Auftragsverarbeiter haftet nach Art. 82 DSGVO nur, wenn er seinen
            spezifischen Pflichten aus dieser Vereinbarung schuldhaft nicht nachgekommen ist oder
            Weisungen des Auftraggebers missachtet hat.
          </p>
        </div>

        <div class="signature-row mt-6">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Ort, Datum, Unterschrift Auftragsverarbeiter</div>
            <div class="sig-prefill">{{ settings.company.city }}, {{ fmtDate(new Date().toISOString()) }}</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Ort, Datum, Unterschrift Verantwortlicher / Auftraggeber</div>
          </div>
        </div>

        <footer class="page-footer-inline">
                    <div class="footer-cols">
            <div class="footer-col"><div class="fc-title">{{ settings.company.name }}</div><div v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div><div>{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div></div>
            <div class="footer-col"><div v-if="settings.company.email">{{ settings.company.email }}</div><div v-if="settings.company.phone">{{ settings.company.phone }}</div></div>
            <div class="footer-col"><div v-if="settings.company.taxNumber">StNr.: {{ settings.company.taxNumber }}</div><div v-if="settings.company.vatId">USt-ID: {{ settings.company.vatId }}</div></div>
          </div>
        </footer>
    </div><!-- /print-content -->
  </template>
</template>

<script>
import apiClient, { API_BASE } from '../services/api'
import { downloadPdfFromBackend, printWithFilename, fetchLogoAsDataUrl } from '../services/pdfExport.js'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const API = `${API_BASE}/api`

export default {
  name: 'AdvPrint',
  setup() {
    const route    = useRoute()
    const router   = useRouter()
    const logoDataUrl = ref(null)  // base64-eingebettetes Logo
    const loading  = ref(true)
    const error    = ref(null)
    const project  = ref(null)
    const customer = ref(null)
    const settings = ref({ company: {} })

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

    async function fetchAll() {
      try {
        const [pr, sr] = await Promise.all([
          fetch(`${API}/projects/${route.params.projectId}`),
          fetch(`${API}/settings`),
        ])
        if (!pr.ok) throw new Error('Projekt nicht gefunden')
        const pj = await pr.json()
        const sj = await sr.json()
        project.value  = pj.data ?? pj
        settings.value = sj.data ?? sj
        // Logo als base64 einbetten → im Druckdialog sofort verfügbar (kein Netzwerkaufruf)
        logoDataUrl.value = await fetchLogoAsDataUrl(
          settings.value?.company?.logoUrl
            ? `${API_BASE}${settings.value.company.logoUrl}`
            : null
        )
        if (project.value.customerId) {
          const cr = await fetch(`${API}/customers/${project.value.customerId}`)
          if (cr.ok) { const j = await cr.json(); customer.value = j.data ?? j }
        }
      } catch (e) {
        error.value = 'Fehler: ' + e.message
      } finally {
        loading.value = false
      }
    }
    onMounted(fetchAll)
    return {logoDataUrl,  loading, error, project, customer, settings, fmtDate, goBack, window }
  }
}
</script>

<style>
@page { size: A4 portrait; margin: 14mm 18mm 28mm 18mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 9pt; color: #1a1a1a; background: #e0e0e0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media print { body { background: white; } }
.state-screen { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; gap:12px; font-size:15px; color:#555; }
.state-error { color:#c0392b; } .state-icon { font-size:32px; }
.toolbar { position:fixed; top:0; left:0; right:0; z-index:500; background:#111827; color:white; display:flex; justify-content:space-between; align-items:center; padding:10px 24px; gap:12px; box-shadow:0 2px 16px rgba(0,0,0,.4); }
.toolbar-left, .toolbar-right { display:flex; align-items:center; gap:10px; }
.btn-back { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:white; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; }
.btn-back:hover { background:rgba(255,255,255,.22); }
.toolbar-title { font-size:13px; color:rgba(255,255,255,.7); }
.adv-badge { font-size:11px; background:rgba(234,179,8,.2); color:#fbbf24; border:1px solid rgba(234,179,8,.3); padding:3px 8px; border-radius:99px; }
.btn-adv { background:rgba(99,102,241,.2); border:1px solid rgba(99,102,241,.4); color:#a5b4fc; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600; text-decoration:none; }
.btn-adv:hover { background:rgba(99,102,241,.35); }
.btn-print { background:#2563eb; border:none; color:white; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; }
.btn-print:hover { background:#1d4ed8; }
/* ENTWURF: position:fixed → JEDE Druckseite */
.draft-watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:90pt; font-weight:900; color:rgba(0,0,0,0.048); letter-spacing:12px; pointer-events:none; white-space:nowrap; user-select:none; z-index:0; }
@media screen { .draft-watermark { display:none; } }
/* Fixed page footer */
.no-screen { display: none; }
@media screen { .no-screen { display: none !important; } }
.print-page-footer { position:fixed; bottom:0; left:0; right:0; background:white; padding:0 20mm 5mm 20mm; z-index:100; }
.ppf-rule { border:none; border-top:0.5pt solid #bbb; margin-bottom:3mm; }
.ppf-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; }
.ppf-col  { font-size:6.5pt; color:#666; line-height:1.6; }
.ppf-bold { font-weight:700; color:#333; }
.ppf-right { text-align:right; } .ppf-center { text-align:center; }
@media screen { .print-page-footer { display:none; } }
/* Inhaltsbereich */
.print-content { width:210mm; min-height:297mm; background:white; margin:60px auto 40px; padding:16mm 18mm 38mm; display:flex; flex-direction:column; position:relative; }
@media screen { .print-content { box-shadow:0 4px 32px rgba(0,0,0,.18); } }
@media print { .no-print { display:none !important; } .no-screen { display:block !important; } .page-break { break-before:page; } .print-content { width:auto; min-height:0; margin:0; padding:0; box-shadow:none; } }
/* Inline-Footer (Bildschirm) */
.inline-page-footer { margin-top:auto; padding-top:5mm; }
@media print { .inline-page-footer { display:none; } }
/* Briefkopf */
.letterhead { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5mm; }
.letterhead-left { flex:1; }
.lh-studio { font-size:11pt; font-weight:700; color:#111; }
.lh-detail { font-size:7.5pt; color:#555; line-height:1.6; }
.logo { max-width:52mm; max-height:24mm; object-fit:contain; display:block; }
.head-rule { border:none; border-top:1pt solid #111; margin-bottom:5mm; }
.contract-title { font-size:13pt; font-weight:700; color:#111; margin-bottom:1mm; }
.contract-date  { font-size:8pt; color:#666; margin-bottom:5mm; }
.adv-title { font-size:13pt; font-weight:700; color:#111; margin-bottom:1mm; }
.adv-law   { font-size:8pt; color:#666; margin-bottom:5mm; }
/* Sektionen: kein Umbruch, Überschriften mit Inhalt */
.section { margin-bottom:5mm; break-inside:avoid; -webkit-column-break-inside:avoid; page-break-inside:avoid; }
.sh { font-size:9.5pt; font-weight:700; color:#111; margin-bottom:2mm; padding-bottom:1mm; border-bottom:0.5pt solid #e0e0e0; break-after:avoid; page-break-after:avoid; }
p { font-size:8.5pt; line-height:1.6; orphans:3; widows:3; }
.mt-2 { margin-top:1mm; } .mt-3 { margin-top:1.5mm; } .mt-4 { margin-top:2mm; } .mt-6 { margin-top:3mm; } .mt-8 { margin-top:4mm; }
/* Parteien */
.parties-grid { display:grid; grid-template-columns:1fr auto 1fr; gap:5mm; margin-top:3mm; break-inside:avoid; }
.party-block { line-height:1.65; font-size:8.5pt; }
.party-role { font-size:7.5pt; color:#777; margin-bottom:1mm; font-style:italic; }
.party-name { font-weight:700; font-size:9.5pt; }
.party-company { font-size:8pt; color:#333; }
.party-tax { font-size:7.5pt; color:#999; }
.party-und { align-self:center; font-style:italic; color:#555; font-size:8.5pt; padding:0 2mm; }
/* Tabellen */
.detail-table { border-collapse:collapse; width:100%; break-inside:avoid; }
.detail-table tr td { padding:1.5px 0; font-size:8.5pt; }
.dl { color:#555; min-width:46mm; width:46mm; vertical-align:top; }
.dv { font-weight:600; color:#111; }
/* Listen */
.service-list { display:flex; flex-direction:column; gap:1mm; margin-left:3mm; break-inside:avoid; }
.sl-row { display:flex; gap:2mm; align-items:baseline; font-size:8.5pt; }
.sl-detail { font-size:7.5pt; color:#666; margin-left:2mm; }
.checkbox-list { display:flex; flex-direction:column; gap:2mm; margin-left:2mm; break-inside:avoid; }
.cl-row { display:flex; gap:2.5mm; align-items:flex-start; font-size:8pt; line-height:1.5; }
.cb { font-size:10pt; min-width:5mm; line-height:1; margin-top:0.5pt; }
.obligation-list { margin-left:5mm; font-size:8.5pt; line-height:1.7; break-inside:avoid; }
.obligation-list li { margin-bottom:1mm; }
.adv-list { margin-left:5mm; font-size:8.5pt; line-height:1.7; break-inside:avoid; }
.adv-list li { margin-bottom:0.8mm; }
.dsgvo-list { margin-left:5mm; font-size:8.5pt; line-height:1.7; break-inside:avoid; }
.dsgvo-list li { margin-bottom:1mm; }
/* Boxen */
.custom-price-box { background:#f9f9f9; border:0.5pt solid #ccc; border-left:2pt solid #2563eb; border-radius:2px; padding:3mm 4mm; font-size:8.5pt; white-space:pre-wrap; line-height:1.6; break-inside:avoid; }
.commercial-box { background:#eff6ff; border:0.5pt solid #bfdbfe; border-left:2pt solid #2563eb; border-radius:2px; padding:2.5mm 3.5mm; font-size:8pt; line-height:1.55; break-inside:avoid; }
.equipment-damage-box { background:#fef2f2; border:0.5pt solid #fca5a5; border-left:2pt solid #dc2626; border-radius:2px; padding:2.5mm 3.5mm; font-size:8pt; line-height:1.6; white-space:pre-wrap; break-inside:avoid; }
.additional-notes { background:#fffbeb; border:0.5pt solid #e5c96a; border-left:2pt solid #d97706; border-radius:2px; padding:2.5mm 3.5mm; font-size:8pt; white-space:pre-wrap; break-inside:avoid; }
.addendum-content { background:#f8faff; border:0.5pt solid #dbeafe; border-left:2pt solid #2563eb; border-radius:2px; padding:3mm 4mm; font-size:8.5pt; line-height:1.7; white-space:pre-wrap; break-inside:avoid; }
.dsgvo-box { font-size:8.5pt; line-height:1.7; background:#f9f9f9; padding:2.5mm 3.5mm; border-left:2pt solid #bbb; break-inside:avoid; }
.dsgvo-intro { font-size:8.5pt; padding:2mm 3mm; background:#f5f5f5; border-radius:2px; margin-bottom:2mm; break-inside:avoid; }
.special-clause { font-size:8.5pt; line-height:1.55; }
.hint-text { font-size:7.5pt; color:#666; font-style:italic; line-height:1.5; }
/* Storno */
.storno-table { width:100%; border-collapse:collapse; font-size:8pt; break-inside:avoid; }
.storno-table th { padding:1.5mm 2.5mm; background:#f0f0f0; border:0.5pt solid #ccc; font-weight:700; text-align:left; }
.storno-table td { padding:1.5mm 2.5mm; border:0.5pt solid #ccc; }
.storno-table tbody tr:nth-child(even) { background:#fafafa; }
.fee-col { text-align:right; font-weight:700; width:25mm; }
/* TOMs */
.tom-grid { display:grid; grid-template-columns:1fr 1fr; gap:2mm; break-inside:avoid; }
.tom-item { background:#f9f9f9; border:0.5pt solid #ddd; border-radius:2px; padding:2mm 3mm; break-inside:avoid; }
.tom-cat { font-size:7.5pt; font-weight:700; color:#333; margin-bottom:1mm; }
.tom-text { font-size:7.5pt; color:#555; line-height:1.55; }
.adv-team { display:flex; flex-direction:column; gap:1mm; margin-left:3mm; }
.team-row { font-size:8.5pt; } .team-name { font-weight:600; } .team-role { color:#666; }
/* Unterschriften */
.sig-note { font-size:7.5pt; color:#444; line-height:1.5; }
.signature-row { display:grid; grid-template-columns:1fr 1fr; gap:12mm; margin-top:10mm; break-inside:avoid; }
.sig-line { border-bottom:0.8pt solid #111; height:12mm; margin-bottom:1.5mm; }
.sig-label { font-size:7pt; color:#666; }
.sig-prefill { font-size:7pt; color:#999; margin-top:0.8mm; }
/* Anhang */
.app-header { margin-bottom:2mm; }
.app-title { font-size:12pt; font-weight:700; color:#111; }
.app-sub { font-size:8pt; color:#666; margin-top:1mm; }
.footer-small { font-style:italic; font-size:6.5pt; }
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