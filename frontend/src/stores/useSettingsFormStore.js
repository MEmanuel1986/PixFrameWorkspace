import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSettings } from './useSettings'
import apiClient, { API_BASE } from '../services/api'
import { downloadPdfFromBackend } from '../services/pdfExport.js'

export const useSettingsFormStore = defineStore('settingsForm', () => {
  const settingsStore = useSettings()
  const route = useRoute()

  // ── Active Tab ──
  const activeTab = ref(route.query.tab || 'company')
  watch(() => route.query.tab, (t) => { if (t) activeTab.value = t })

  const openGroup = ref(null)

  function selectTab(id) {
    if (id) {
      activeTab.value = id
      openGroup.value = null
    }
  }

  const isSettingsTab = computed(() =>
    ['company', 'numbers', 'appearance', 'clauses', 'agb', 'dsgvo', 'adv', 'booking', 'calendar'].includes(activeTab.value)
  )

  // ── Form State ──
  const saving = ref(false)
  const saved = ref(false)

  const form = ref({
    numberSchemas: {
      customer: { prefix: 'K', separator: '-', digits: 5 },
      quote: { prefix: 'A', separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true },
      invoice: { prefix: 'RE', separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true },
      project: { format: 'Proj-{jjjj}-{mm}/{z,5}', start: 1 },
      delivery: { format: 'LS-{jjjj}-{mm}/{z,5}', start: 1 },
      article: { prefix: 'ART', separator: '-', digits: 5 },
      supplier: { format: 'L-{z,5}', start: 1 },
      contract: { prefix: 'V', separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true },
      addendum: { prefix: 'VN', separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true },
      correction: { prefix: 'KOR', separator: '-' },
      cancellation: { prefix: 'STORNO', separator: '-' },
    },
    company: {
      name: '', businessType: '', owner: '', taxNumber: '', vatId: '',
      smallBusiness: false, street: '', zipCode: '', city: '',
      phone: '', email: '', website: '',
      bankName: '', iban: '', bic: '',
      invoiceIntro: '', invoiceFooter: '', logoUrl: '',
    },
    bookingTerms: {
      depositRate: 20,
      requireConsultation: false,
      defaultHourlyRate: 250,
      defaultKmRate: 0.50,
      defaultKmFree: 30,
      usageRightsMode: 'simple',
      hourlyRatePhotoPrivat: 250,
      hourlyRatePhotoB2B: 200,
      hourlyRatePhotoSetup: 100,
      hourlyRateVideoPrivat: 250,
      hourlyRateVideoB2B: 200,
      hourlyRateVideoSetup: 100,
      imagePricePrivat: 40,
      imagePriceB2B: 60,
      videoPer10min: 1200,
      enabledPaymentMethods: ['Überweisung', 'Bar', 'PayPal', 'SEPA-Lastschrift', 'Vorkasse'],
      cancellationFees: [
        { daysBeforeEvent: 90, feePercent: 25, label: 'bis 90 Tage vor dem Termin' },
        { daysBeforeEvent: 60, feePercent: 50, label: 'bis 60 Tage vor dem Termin' },
        { daysBeforeEvent: 30, feePercent: 75, label: 'bis 30 Tage vor dem Termin' },
        { daysBeforeEvent: 14, feePercent: 90, label: 'bis 14 Tage vor dem Termin' },
        { daysBeforeEvent: 0, feePercent: 100, label: 'ab 14 Tage vor dem Termin oder Nichterscheinen' },
      ],
    },
    usageSurchargeMatrix: {
      regional: { '1 Jahr': 10, '2 Jahre': 15, '3 Jahre': 20, '5 Jahre': 25, 'unbegrenzt': 30 },
      national: { '1 Jahr': 20, '2 Jahre': 30, '3 Jahre': 40, '5 Jahre': 55, 'unbegrenzt': 75 },
      eu: { '1 Jahr': 35, '2 Jahre': 50, '3 Jahre': 65, '5 Jahre': 90, 'unbegrenzt': 120 },
      international: { '1 Jahr': 60, '2 Jahre': 85, '3 Jahre': 110, '5 Jahre': 150, 'unbegrenzt': 200 },
    },
    contractParagraphs: {
      leistungBoilerplate: '', verguetungHourlyNote: '', verguetungFlatNote: '',
      zahlungsverzug: '', anzahlungText: '', stornierungNote: '', fotografStorniertText: '',
      urheberrechtPrivat: '', urheberrechtKommerziell: '', urheberrechtBearbeitung: '',
      lieferungText: '', archivierungText: '', abnahmeText: '',
      haftungGrundsatz: '', haftungDatenverlust: '', haftungUnbeeinflusst: '',
      mitwirkungText: '', sonstigeText: '',
    },
    contractClauses: {
      archiveDuration: 3,
      archiveRawDuration: 1,
      minCopyrightDamagePercent: 100,
      equipmentDamageText: '',
      commercialSurchargeNote: '',
      specialClauses: [],
    },
    locale: 'de', currency: 'EUR',
    emailConfig: { host: '', port: 587, secure: false, user: '', pass: '', fromName: '', fromEmail: '' },
  })

  // ── Logo ──
  const fileInput = ref(null)
  const previewUrl = ref('')
  const logoUploading = ref(false)
  const logoError = ref('')
  const dragOver = ref(false)

  function triggerFileInput() { fileInput.value?.click() }
  function onFileSelected(e) { const f = e.target.files?.[0]; if (f) uploadLogo(f) }
  function onDrop(e) { dragOver.value = false; const f = e.dataTransfer.files?.[0]; if (f) uploadLogo(f) }

  async function uploadLogo(file) {
    logoError.value = ''; logoUploading.value = true
    previewUrl.value = URL.createObjectURL(file)
    try {
      const fd = new FormData(); fd.append('logo', file)
      const res = await apiClient.post('/settings/logo', fd)
      form.value.company.logoUrl = res.data.logoUrl
      previewUrl.value = `${API_BASE}${res.data.logoUrl}?t=${Date.now()}`
    } catch (e) {
      logoError.value = 'Upload fehlgeschlagen: ' + (e.response?.data?.error || e.message)
      previewUrl.value = ''
    } finally {
      logoUploading.value = false
    }
  }

  async function removeLogo() {
    try {
      await apiClient.delete('/settings/logo')
      previewUrl.value = ''; form.value.company.logoUrl = ''
    } catch (e) { logoError.value = 'Fehler: ' + e.message }
  }

  // ── Vertragsparagraphen (contractParagraphsList) ──
  const contractParagraphsList = ref([])
  const cpDirty = ref(false)
  let _cpIdCounter = 200

  function loadCpParagraphs() {
    const data = settingsStore.settings?.contractParagraphsList
    contractParagraphsList.value = Array.isArray(data) ? data.map(p => ({
      ...p, items: (p.items || []).map(it => ({ ...it }))
    })) : []
  }

  function addCpParagraph() {
    contractParagraphsList.value.push({ id: `cp_new_${++_cpIdCounter}`, title: '', items: [] })
    cpDirty.value = true
  }
  function deleteCpPara(idx) {
    if (!confirm(`Paragraph „${contractParagraphsList.value[idx].title || 'Ohne Titel'}" wirklich löschen?`)) return
    contractParagraphsList.value.splice(idx, 1); cpDirty.value = true
  }
  function moveCpPara(idx, dir) {
    const arr = contractParagraphsList.value; const dest = idx + dir
    if (dest < 0 || dest >= arr.length) return
    const tmp = arr[idx]; arr[idx] = arr[dest]; arr[dest] = tmp; cpDirty.value = true
  }
  function addCpItem(paraIdx) {
    const para = contractParagraphsList.value[paraIdx]
    if (!para.items) para.items = []
    para.items.push({ label: '', text: '' }); cpDirty.value = true
  }
  function deleteCpItem(paraIdx, itemIdx) {
    const para = contractParagraphsList.value[paraIdx]
    if (para.items) para.items.splice(itemIdx, 1); cpDirty.value = true
  }

  // ── AGB Paragraphen ──
  const agbParagraphs = ref([])
  const agbDirty = ref(false)
  let _agbIdCounter = 100

  function loadAgbParagraphs() {
    const data = settingsStore.settings?.agbParagraphs
    agbParagraphs.value = Array.isArray(data) ? data.map(p => ({ ...p })) : []
  }

  function addAgbParagraph() {
    agbParagraphs.value.push({ id: `agb_new_${++_agbIdCounter}`, title: '', content: '' })
    agbDirty.value = true
    setTimeout(() => {
      const list = document.querySelector('.agb-list')
      if (list) list.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 80)
  }
  function deleteAgbPara(idx) {
    if (!confirm(`§ ${idx + 1} „${agbParagraphs.value[idx].title || 'Ohne Titel'}" wirklich löschen?`)) return
    agbParagraphs.value.splice(idx, 1); agbDirty.value = true
  }
  function moveAgbPara(idx, dir) {
    const arr = agbParagraphs.value; const dest = idx + dir
    if (dest < 0 || dest >= arr.length) return
    const tmp = arr[idx]; arr[idx] = arr[dest]; arr[dest] = tmp; agbDirty.value = true
  }
  function addAgbItem(paraIdx) {
    const para = agbParagraphs.value[paraIdx]
    if (!para.items) para.items = []
    para.items.push(''); agbDirty.value = true
  }
  function deleteAgbItem(paraIdx, itemIdx) {
    const para = agbParagraphs.value[paraIdx]
    if (!para.items) return
    para.items.splice(itemIdx, 1); agbDirty.value = true
  }

  // ── DSGVO Paragraphen ──
  const dsgvoParagraphs = ref([])
  const dsgvoDirty = ref(false)
  let _dsgvoIdCounter = 300

  function loadDsgvoParagraphs() {
    const data = settingsStore.settings?.dsgvoParagraphs
    dsgvoParagraphs.value = Array.isArray(data) ? data.map(p => ({ ...p, items: [...(p.items || [])] })) : []
  }

  function addDsgvoParagraph() {
    dsgvoParagraphs.value.push({ id: `dsgvo_new_${++_dsgvoIdCounter}`, title: '', items: [] })
    dsgvoDirty.value = true
  }
  function deleteDsgvoPara(idx) {
    if (!confirm(`Abschnitt "${dsgvoParagraphs.value[idx].title || 'Ohne Titel'}" löschen?`)) return
    dsgvoParagraphs.value.splice(idx, 1); dsgvoDirty.value = true
  }
  function moveDsgvoPara(idx, dir) {
    const arr = dsgvoParagraphs.value; const dest = idx + dir
    if (dest < 0 || dest >= arr.length) return
    const tmp = arr[idx]; arr[idx] = arr[dest]; arr[dest] = tmp; dsgvoDirty.value = true
  }
  function addDsgvoItem(paraIdx) {
    const p = dsgvoParagraphs.value[paraIdx]
    if (!p.items) p.items = []
    p.items.push(''); dsgvoDirty.value = true
  }
  function deleteDsgvoItem(paraIdx, itemIdx) {
    dsgvoParagraphs.value[paraIdx].items?.splice(itemIdx, 1); dsgvoDirty.value = true
  }

  // ── ADV Paragraphen ──
  const advParagraphs = ref([])
  const advDirty = ref(false)
  let _advIdCounter = 400

  function loadAdvParagraphs() {
    const data = settingsStore.settings?.advParagraphs
    advParagraphs.value = Array.isArray(data) ? data.map(p => ({ ...p, items: [...(p.items || [])] })) : []
  }

  function addAdvParagraph() {
    advParagraphs.value.push({ id: `adv_new_${++_advIdCounter}`, title: '', items: [] })
    advDirty.value = true
  }
  function deleteAdvPara(idx) {
    if (!confirm(`Abschnitt "${advParagraphs.value[idx].title || 'Ohne Titel'}" löschen?`)) return
    advParagraphs.value.splice(idx, 1); advDirty.value = true
  }
  function moveAdvPara(idx, dir) {
    const arr = advParagraphs.value; const dest = idx + dir
    if (dest < 0 || dest >= arr.length) return
    const tmp = arr[idx]; arr[idx] = arr[dest]; arr[dest] = tmp; advDirty.value = true
  }
  function addAdvItem(paraIdx) {
    const p = advParagraphs.value[paraIdx]
    if (!p.items) p.items = []
    p.items.push(''); advDirty.value = true
  }
  function deleteAdvItem(paraIdx, itemIdx) {
    advParagraphs.value[paraIdx].items?.splice(itemIdx, 1); advDirty.value = true
  }

  // ── Shared Helpers ──
  function autoResizeAGB(e) {
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }

  function addCancellationTier() {
    form.value.bookingTerms.cancellationFees.push({
      daysBeforeEvent: 30, feePercent: 50, label: 'bis 30 Tage vor dem Termin'
    })
  }
  function removeCancellationTier(idx) {
    form.value.bookingTerms.cancellationFees.splice(idx, 1)
  }

  function buildFromFormat(fmt, key) {
    if (!fmt) return '—'
    const now = new Date()
    const yyyy = String(now.getFullYear())
    const yy = yyyy.slice(2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const n = form.value.numberSchemas[key]?.start ?? 1
    return fmt
      .replace(/\{jjjj\}/gi, yyyy)
      .replace(/\{jj\}/gi, yy)
      .replace(/\{mm\}/gi, mm)
      .replace(/\{tt\}/gi, dd)
      .replace(/\{datum\}/gi, `${dd}.${mm}.${yyyy}`)
      .replace(/\{z,(\d+)\}/gi, (_, d) => String(n).padStart(Number(d), '0'))
      .replace(/\{zj,(\d+)\}/gi, (_, d) => String(n).padStart(Number(d), '0'))
      .replace(/\{zm,(\d+)\}/gi, (_, d) => String(n).padStart(Number(d), '0'))
      .replace(/\{zt,(\d+)\}/gi, (_, d) => String(n).padStart(Number(d), '0'))
      .replace(/\{z\}/gi, String(n)).replace(/\{zj\}/gi, String(n))
      .replace(/\{zm\}/gi, String(n)).replace(/\{zt\}/gi, String(n))
  }

  function fmtFileSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function fmtDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  async function savePdf(apiPath, filename) {
    try {
      await downloadPdfFromBackend(apiPath, filename)
    } catch (e) {
      console.error('PDF-Fehler:', e)
    }
  }

  const theme = computed(() => settingsStore.theme)
  const applyTheme = (t) => settingsStore.setTheme(t)

  // ── Watchers for store → local paragraphs ──
  watch(() => settingsStore.settings?.contractParagraphsList, (val) => {
    if (val && !cpDirty.value) loadCpParagraphs()
  }, { immediate: true })

  watch(() => settingsStore.settings?.agbParagraphs, (val) => {
    if (val && !agbDirty.value) loadAgbParagraphs()
  }, { immediate: true })

  watch(() => settingsStore.settings?.dsgvoParagraphs, (val) => {
    if (val && !dsgvoDirty.value) loadDsgvoParagraphs()
  }, { immediate: true })

  watch(() => settingsStore.settings?.advParagraphs, (val) => {
    if (val && !advDirty.value) loadAdvParagraphs()
  }, { immediate: true })

  // ── Init: load settings from backend into form ──
  async function initForm() {
    try { await settingsStore.fetchSettings() } catch (e) { console.error("[Settings] Backend nicht erreichbar:", e.message) }

    const s = settingsStore.settings || {}
    form.value = {
      ...form.value, ...s,
      locale: s.locale || 'de', currency: s.currency || 'EUR',
      company: { ...form.value.company, ...(s.company || {}) },
      bookingTerms: {
        depositRate: s.bookingTerms?.depositRate ?? form.value.bookingTerms.depositRate,
        cancellationFees: s.bookingTerms?.cancellationFees?.length
          ? s.bookingTerms.cancellationFees.map(t => ({ ...t }))
          : form.value.bookingTerms.cancellationFees.map(t => ({ ...t })),
        requireConsultation: s.bookingTerms?.requireConsultation ?? false,
        defaultHourlyRate: s.bookingTerms?.defaultHourlyRate ?? 250,
        defaultKmRate: s.bookingTerms?.defaultKmRate ?? 0.50,
        defaultKmFree: s.bookingTerms?.defaultKmFree ?? 30,
        usageRightsMode: s.bookingTerms?.usageRightsMode ?? 'simple',
        hourlyRatePhotoPrivat: s.bookingTerms?.hourlyRatePhotoPrivat ?? 250,
        hourlyRatePhotoB2B: s.bookingTerms?.hourlyRatePhotoB2B ?? 200,
        hourlyRatePhotoSetup: s.bookingTerms?.hourlyRatePhotoSetup ?? 100,
        hourlyRateVideoPrivat: s.bookingTerms?.hourlyRateVideoPrivat ?? 250,
        hourlyRateVideoB2B: s.bookingTerms?.hourlyRateVideoB2B ?? 200,
        hourlyRateVideoSetup: s.bookingTerms?.hourlyRateVideoSetup ?? 100,
        imagePricePrivat: s.bookingTerms?.imagePricePrivat ?? 40,
        imagePriceB2B: s.bookingTerms?.imagePriceB2B ?? 60,
        videoPer10min: s.bookingTerms?.videoPer10min ?? 1200,
        enabledPaymentMethods: s.bookingTerms?.enabledPaymentMethods?.length
          ? s.bookingTerms.enabledPaymentMethods
          : ['Überweisung', 'Bar', 'PayPal', 'SEPA-Lastschrift', 'Vorkasse'],
      },
      usageSurchargeMatrix: {
        regional: { ...(s.usageSurchargeMatrix?.regional || {}) },
        national: { ...(s.usageSurchargeMatrix?.national || {}) },
        eu: { ...(s.usageSurchargeMatrix?.eu || {}) },
        international: { ...(s.usageSurchargeMatrix?.international || {}) },
      },
      contractParagraphs: { ...form.value.contractParagraphs, ...(s.contractParagraphs || {}) },
      contractClauses: {
        archiveDuration: s.contractClauses?.archiveDuration ?? 3,
        archiveRawDuration: s.contractClauses?.archiveRawDuration ?? 1,
        minCopyrightDamagePercent: s.contractClauses?.minCopyrightDamagePercent ?? 100,
        equipmentDamageText: s.contractClauses?.equipmentDamageText ?? '',
        commercialSurchargeNote: s.contractClauses?.commercialSurchargeNote ?? '',
        specialClauses: s.contractClauses?.specialClauses?.length
          ? s.contractClauses.specialClauses.map(cl => ({ ...cl }))
          : [],
      },
      numberSchemas: {
        customer: { ...form.value.numberSchemas.customer, ...(s.numberSchemas?.customer || {}) },
        quote: { ...form.value.numberSchemas.quote, ...(s.numberSchemas?.quote || {}) },
        invoice: { ...form.value.numberSchemas.invoice, ...(s.numberSchemas?.invoice || {}) },
        project: { ...form.value.numberSchemas.project, ...(s.numberSchemas?.project || {}) },
        delivery: { ...form.value.numberSchemas.delivery, ...(s.numberSchemas?.delivery || {}) },
        correction: { ...form.value.numberSchemas.correction, ...(s.numberSchemas?.correction || {}) },
        cancellation: { ...form.value.numberSchemas.cancellation, ...(s.numberSchemas?.cancellation || {}) },
        article: { ...form.value.numberSchemas.article, ...(s.numberSchemas?.article || {}) },
        supplier: { ...form.value.numberSchemas.supplier, ...(s.numberSchemas?.supplier || {}) },
        contract: { ...form.value.numberSchemas.contract, ...(s.numberSchemas?.contract || {}) },
        addendum: { ...form.value.numberSchemas.addendum, ...(s.numberSchemas?.addendum || {}) },
      },
      calendarSettings: {
        quoteFollowUpDays: s.calendarSettings?.quoteFollowUpDays ?? 14,
        bundeslaender: Array.isArray(s.calendarSettings?.bundeslaender) ? [...s.calendarSettings.bundeslaender] : ['MV'],
        ferienBundeslaender: Array.isArray(s.calendarSettings?.ferienBundeslaender) ? [...s.calendarSettings.ferienBundeslaender] : [],
      },
      emailConfig: {
        host: s.emailConfig?.host || '',
        port: s.emailConfig?.port || 587,
        secure: s.emailConfig?.secure ?? false,
        user: s.emailConfig?.user || '',
        pass: s.emailConfig?.pass || '',
        fromName: s.emailConfig?.fromName || '',
        fromEmail: s.emailConfig?.fromEmail || '',
      },
    }

    // Logo-Preview
    if (form.value.company.logoUrl && !previewUrl.value) {
      const logoCheckUrl = `${API_BASE}${form.value.company.logoUrl}?t=${Date.now()}`
      try {
        const check = await fetch(logoCheckUrl, { method: 'HEAD' })
        if (check.ok) {
          previewUrl.value = logoCheckUrl
        } else {
          logoError.value = '⚠ Logo-Datei nicht gefunden (wurde die App neu installiert?). Bitte Logo erneut hochladen.'
          form.value.company.logoUrl = ''
        }
      } catch {
        logoError.value = '⚠ Logo konnte nicht geprüft werden — Backend erreichbar?'
      }
    }
  }

  // ── Save All ──
  async function saveAll() {
    form.value.agbParagraphs = agbParagraphs.value
    form.value.contractParagraphsList = contractParagraphsList.value
    form.value.dsgvoParagraphs = dsgvoParagraphs.value
    form.value.advParagraphs = advParagraphs.value
    agbDirty.value = false
    cpDirty.value = false
    dsgvoDirty.value = false
    advDirty.value = false

    saving.value = true; saved.value = false
    try {
      await settingsStore.saveSettings(form.value)
      saved.value = true
      setTimeout(() => { saved.value = false }, 3000)
    } catch (e) { console.error(e) }
    finally { saving.value = false }
  }

  // ── Navigation Items ──
  const navItems = computed(() => [
    { id: 'company', icon: '🏢', label: 'Studio', count: null },
    { id: 'numbers', icon: '🔢', label: 'Nummernkreise', count: null },
    {
      group: 'auftrag', icon: '📋', label: 'Auftrag',
      children: [
        { id: 'booking', icon: '📋', label: 'Buchung & Storno', count: null },
        { id: 'calendar', icon: '📅', label: 'Kalender', count: null },
      ],
    },
    {
      group: 'recht', icon: '📝', label: 'Rechtsdoks',
      children: [
        { id: 'clauses', icon: '📝', label: 'Vertragswesen', count: null },
        { id: 'agb', icon: '§', label: 'AGB', count: agbParagraphs.value.length || null },
        { id: 'dsgvo', icon: '🔒', label: 'DSGVO', count: dsgvoParagraphs.value.length || null },
        { id: 'adv', icon: '📋', label: 'ADV-Vertrag', count: advParagraphs.value.length || null },
      ],
    },
    { id: 'email', icon: '✉️', label: 'E-Mail', count: null },
    { id: 'appearance', icon: '🎨', label: 'Darstellung', count: null },
    {
      group: 'system', icon: '⚙️', label: 'System',
      children: [
        { id: 'backup', icon: '💾', label: 'Backup', count: null },
        { id: 'update', icon: '🔄', label: 'Update', count: null },
        { id: 'system', icon: '⚙️', label: 'System', count: null },
      ],
    },
  ])

  const allTabs = computed(() => navItems.value.flatMap(
    item => item.children ? item.children : [item]
  ))

  // ── Constants ──
  const availablePaymentMethods = [
    { id: 'Überweisung', icon: '🏦', label: 'Überweisung' },
    { id: 'Bar', icon: '💵', label: 'Bar' },
    { id: 'EC-Karte', icon: '💳', label: 'EC-Karte' },
    { id: 'Kreditkarte', icon: '💳', label: 'Kreditkarte' },
    { id: 'PayPal', icon: '🅿️', label: 'PayPal' },
    { id: 'SEPA-Lastschrift', icon: '📄', label: 'SEPA-Lastschrift' },
    { id: 'Vorkasse', icon: '💰', label: 'Vorkasse' },
  ]

  const numTokens = [
    { token: '{jjjj}', label: 'Jahr (vierstellig)', hint: 'Beispiel: 2026' },
    { token: '{jj}', label: 'Jahr (zweistellig)', hint: 'Beispiel: 26' },
    { token: '{mm}', label: 'Monat', hint: 'Beispiel: 03' },
    { token: '{tt}', label: 'Tag', hint: 'Beispiel: 16' },
    { token: '{datum}', label: 'Komplettes Datum', hint: 'Beispiel: 16.03.2026' },
    { token: '{z,5}', label: 'Fortlaufender Zähler', hint: 'Stellen: {z,3}→001' },
    { token: '{zj,5}', label: 'Jahreszähler', hint: 'Zurückgesetzt jedes Jahr' },
    { token: '{zm,5}', label: 'Monatszähler', hint: 'Zurückgesetzt jeden Monat' },
    { token: '{zt,5}', label: 'Tageszähler', hint: 'Zurückgesetzt täglich' },
  ]

  const numSchemasDocs = [
    { key: 'project', label: 'Projektnummer', placeholder: 'Proj-{jjjj}-{mm}/{z,5}', hasStart: true },
    { key: 'quote', label: 'Angebotsnummer', placeholder: 'A-{jjjj}-{mm}/{z,5}', hasStart: true },
    { key: 'invoice', label: 'Rechnungsnummer', placeholder: 'RE-{jjjj}-{mm}/{z,5}', hasStart: true },
    { key: 'delivery', label: 'Lieferscheinnummer', placeholder: 'LS-{jjjj}-{mm}/{z,5}', hasStart: true },
    { key: 'contract', label: 'Vertragsnummer', placeholder: 'V-{jjjj}-{mm}/{z,5}', hasStart: false },
    { key: 'addendum', label: 'Nachtragnummer', placeholder: 'VN-{jjjj}-{mm}/{z,5}', hasStart: false },
  ]
  const numSchemasStamm = [
    { key: 'customer', label: 'Kundennummer', placeholder: 'K-{z,5}', hasStart: false },
    { key: 'supplier', label: 'Lieferantennummer', placeholder: 'L-{z,5}', hasStart: false },
    { key: 'article', label: 'Artikelnummer', placeholder: 'ART-{z,5}', hasStart: false },
  ]
  const numSchemasAbgeleitet = [
    { key: 'correction', label: 'Korrekturrechnung', hint: 'Wird automatisch aus der Originalnummer abgeleitet: KOR-RE-2026-03/00042' },
    { key: 'cancellation', label: 'Stornorechnung', hint: 'Wird automatisch aus der Originalnummer abgeleitet: STORNO-RE-2026-03/00042' },
  ]

  const bundeslaenderList = [
    { code: 'BW', label: 'Baden-Württemberg' },
    { code: 'BY', label: 'Bayern' },
    { code: 'BE', label: 'Berlin' },
    { code: 'BB', label: 'Brandenburg' },
    { code: 'HB', label: 'Bremen' },
    { code: 'HH', label: 'Hamburg' },
    { code: 'HE', label: 'Hessen' },
    { code: 'MV', label: 'Mecklenburg-Vorpommern' },
    { code: 'NI', label: 'Niedersachsen' },
    { code: 'NW', label: 'Nordrhein-Westfalen' },
    { code: 'RP', label: 'Rheinland-Pfalz' },
    { code: 'SL', label: 'Saarland' },
    { code: 'SN', label: 'Sachsen' },
    { code: 'ST', label: 'Sachsen-Anhalt' },
    { code: 'SH', label: 'Schleswig-Holstein' },
    { code: 'TH', label: 'Thüringen' },
  ]

  function toggleCalBl(code, field) {
    if (!form.value.calendarSettings) form.value.calendarSettings = {}
    const arr = Array.isArray(form.value.calendarSettings[field]) ? [...form.value.calendarSettings[field]] : []
    const idx = arr.indexOf(code)
    if (idx === -1) arr.push(code); else arr.splice(idx, 1)
    form.value.calendarSettings[field] = arr
  }

  function toggleCalBlSingle(code, field) {
    if (!form.value.calendarSettings) form.value.calendarSettings = {}
    if (!code) return
    form.value.calendarSettings[field] = [code]
  }

  return {
    // Tab navigation
    activeTab, openGroup, selectTab, isSettingsTab, navItems, allTabs,

    // Form
    form, saving, saved, saveAll, initForm,

    // Logo
    previewUrl, logoUploading, logoError, dragOver,
    uploadLogo, removeLogo,

    // Paragraphs
    contractParagraphsList, cpDirty, addCpParagraph, deleteCpPara, moveCpPara, addCpItem, deleteCpItem,
    agbParagraphs, agbDirty, addAgbParagraph, deleteAgbPara, moveAgbPara, addAgbItem, deleteAgbItem,
    dsgvoParagraphs, dsgvoDirty, addDsgvoParagraph, deleteDsgvoPara, moveDsgvoPara, addDsgvoItem, deleteDsgvoItem,
    advParagraphs, advDirty, addAdvParagraph, deleteAdvPara, moveAdvPara, addAdvItem, deleteAdvItem,
    autoResizeAGB,

    // Booking
    addCancellationTier, removeCancellationTier, availablePaymentMethods,

    // Numbers
    buildFromFormat, numTokens, numSchemasDocs, numSchemasStamm, numSchemasAbgeleitet,

    // Calendar
    bundeslaenderList, toggleCalBl, toggleCalBlSingle,

    // Theme
    theme, applyTheme,

    // Helpers
    fmtFileSize, fmtDate, savePdf,
  }
})
