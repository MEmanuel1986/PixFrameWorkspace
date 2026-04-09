/**
 * useProjectEdit.js
 * Inline-Edit, Sidebar-Edit, Hero-Live-Preview, Änderungsprotokoll.
 */
import { ref, reactive, computed, watch } from 'vue'

export function useProjectEdit(project, store, contractStore, settingsData) {

  // ── Inline Edit ─────────────────────────────────────────────────────────────
  const editing    = ref(false)
  const editModal  = ref(false) // backward compat
  const editSaving = ref(false)
  const editError  = ref('')
  const editForm   = ref({})

  function startInlineEdit() {
    editing.value = true
    setTimeout(() => {
      const el = document.querySelector('.npf')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function cancelInlineEdit() {
    editing.value = false
    editError.value = ''
  }

  async function saveInlineEdit(payload) {
    editSaving.value = true
    try {
      const pData = payload?.project || payload
      await store.updateProject(project.value.id, pData)
      if (payload?.contractData) {
        await store.updateProject(project.value.id, { contractData: payload.contractData })
        Object.assign(contractStore.contractForm, payload.contractData)
      }
      editing.value = false
    } catch (e) {
      console.error('Speichern fehlgeschlagen:', e)
    } finally { editSaving.value = false }
  }

  function openEditModal() {
    editForm.value = {
      ...project.value,
      booking:         (project.value.booking      || '').slice(0, 10),
      deliveryDate:    (project.value.deliveryDate  || '').slice(0, 10),
      bookingDuration: project.value.bookingDuration || '',
      budget:          { ...(project.value.budget || { estimatedAmount: 0, currency: 'EUR' }) },
    }
    editError.value = ''
    editModal.value = true
  }

  async function saveEdit() {
    editError.value = ''
    if (!editForm.value.projectName?.trim()) { editError.value = 'Auftragsname ist erforderlich.'; return }
    editSaving.value = true
    try {
      await store.updateProject(project.value.id, editForm.value)
      editModal.value = false
    } catch (e) {
      editError.value = 'Fehler: ' + (e.response?.data?.error || e.message)
    } finally { editSaving.value = false }
  }

  // ── Hero Live Preview ───────────────────────────────────────────────────────
  const heroLive = ref({ projectName: '', booking: '', bookingTime: '', location: '' })
  function onHeroLive(data) { Object.assign(heroLive.value, data) }

  // ── Änderungsprotokoll ──────────────────────────────────────────────────────
  const auftragChangelog   = ref([])
  const showChangelogModal = ref(false)

  const auftragChangelogSorted = computed(() =>
    [...auftragChangelog.value].sort((a, b) => new Date(b.ts) - new Date(a.ts)),
  )

  const changelogGrouped = computed(() => {
    const groups = {}
    for (const entry of auftragChangelogSorted.value) {
      const d = new Date(entry.ts)
      const label = d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      if (!groups[label]) groups[label] = []
      groups[label].push(entry)
    }
    return groups
  })

  // ── Sidebar Edit ────────────────────────────────────────────────────────────
  const DE_MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                     'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

  function buildAutoOccasion(category, bookingIso) {
    if (!category || !bookingIso) return ''
    const d    = new Date(bookingIso)
    const date = `${d.getDate()}. ${DE_MONTHS[d.getMonth()]} ${d.getFullYear()}`
    const map  = {
      'Hochzeit':           `Hochzeit am ${date}`,
      'Portrait':           `Portrait-Shooting am ${date}`,
      'Babybauch':          `Babybauch-Shooting am ${date}`,
      'Newborn':            `Newborn-Shooting am ${date}`,
      'Event':              `Event am ${date}`,
      'Produktfotografie':  `Produktfotografie am ${date}`,
      'Familienshooting':   `Familien-Shooting am ${date}`,
      'Businessfotografie': `Business-Fotografie am ${date}`,
      'Sonstiges':          `Fotografie am ${date}`,
    }
    return map[category] || `${category} am ${date}`
  }

  const sidebarEdit = reactive({
    show: false, saving: false,
    occasionAutoSet: true,
    form: {
      occasion: '', booking: '', bookingTime: '', location: '', category: '',
      notes: '', pricingModel: 'flat', hourlyRate: null, estimatedHours: null,
      flatRate: null, depositAmount: null, paymentDueDays: 14,
    },
  })

  watch(() => sidebarEdit.form.category, (newCat) => {
    if (sidebarEdit.occasionAutoSet) {
      sidebarEdit.form.occasion = buildAutoOccasion(newCat, sidebarEdit.form.booking)
    }
  })
  watch(() => sidebarEdit.form.booking, (newDate) => {
    if (sidebarEdit.occasionAutoSet) {
      sidebarEdit.form.occasion = buildAutoOccasion(sidebarEdit.form.category, newDate)
    }
  })

  function openSidebarEdit() {
    const p  = project.value
    const cd = p.contractData || contractStore.contractForm || {}
    sidebarEdit.occasionAutoSet = true
    sidebarEdit.form = {
      occasion:       cd.occasion || p.projectName || '',
      booking:        (p.booking || '').slice(0, 10),
      bookingTime:    p.bookingTime || '',
      bookingLabel:   p.bookingLabel || '',
      shootingDates:  Array.isArray(p.shootingDates) ? JSON.parse(JSON.stringify(p.shootingDates)) : [],
      location:       p.location || '',
      locations:      Array.isArray(p.locations) ? p.locations : [],
      skipQuote:      p.skipQuote ?? true,
      category:       p.category || '',
      notes:          p.notes || '',
      pricingModel:   cd.pricingModel || 'flat',
      hourlyRate:     cd.hourlyRate || null,
      estimatedHours: cd.estimatedHours || null,
      flatRate:       cd.flatRate || null,
      depositAmount:  cd.depositAmount || null,
      paymentDueDays: cd.paymentDueDays || 14,
    }
    sidebarEdit.show = true
  }

  function buildChangelogEntries(f) {
    const p   = project.value
    const cd  = p.contractData || {}
    const now = new Date().toISOString()
    const entries = []

    function entry(label, oldVal, newVal) {
      if (String(oldVal ?? '') !== String(newVal ?? '') && (oldVal || newVal)) {
        entries.push({ ts: now, label, from: oldVal ?? '', to: newVal ?? '' })
      }
    }

    entry('Anlass',        cd.occasion || p.projectName, f.occasion)
    entry('Kategorie',     p.category,                   f.category)
    entry('Buchungsdatum', p.booking?.slice(0, 10),      f.booking)
    entry('Uhrzeit',       p.bookingTime,                f.bookingTime)
    entry('Location',      p.location,                   f.location)
    entry('Locations',     JSON.stringify(p.locations),   JSON.stringify(f.locations))
    entry('Angebot skip',  p.skipQuote,                  f.skipQuote)
    entry('Notizen',       p.notes,                      f.notes)
    entry('Preismodell',   cd.pricingModel,              f.pricingModel)
    entry('Stundensatz',   cd.hourlyRate,                f.hourlyRate)
    entry('Est. Stunden',  cd.estimatedHours,            f.estimatedHours)
    entry('Pauschalpreis', cd.flatRate,                  f.flatRate)
    entry('Anzahlung',     cd.depositAmount,             f.depositAmount)
    entry('Zahlungsziel',  cd.paymentDueDays,            f.paymentDueDays)
    return entries
  }

  async function saveSidebarEdit() {
    sidebarEdit.saving = true
    try {
      const f = sidebarEdit.form
      const newContractData = {
        ...(project.value.contractData || {}),
        ...contractStore.contractForm,
        occasion:       f.occasion,
        pricingModel:   f.pricingModel,
        hourlyRate:     f.hourlyRate,
        estimatedHours: f.estimatedHours,
        flatRate:       f.flatRate,
        depositAmount:  f.depositAmount,
        paymentDueDays: f.paymentDueDays,
      }

      const newEntries    = buildChangelogEntries(f)
      const existingLog   = project.value.auftragChangelog || []
      const updatedChangelog = newEntries.length ? [...existingLog, ...newEntries] : existingLog

      await store.updateProject(project.value.id, {
        projectName:      f.occasion || project.value.projectName,
        booking:          f.booking,
        bookingTime:      f.bookingTime,
        bookingLabel:     f.bookingLabel || '',
        shootingDates:    f.shootingDates || [],
        location:         f.location,
        locations:        f.locations || [],
        skipQuote:        f.skipQuote ?? true,
        category:         f.category,
        notes:            f.notes,
        contractData:     newContractData,
        auftragChangelog: updatedChangelog,
      })
      auftragChangelog.value = updatedChangelog
      Object.assign(contractStore.contractForm, newContractData)
      sidebarEdit.show = false
    } catch (e) { console.error('Sidebar save failed:', e) }
    finally { sidebarEdit.saving = false }
  }

  return {
    // Inline Edit
    editing, editModal, editSaving, editError, editForm,
    startInlineEdit, cancelInlineEdit, saveInlineEdit, openEditModal, saveEdit,
    // Hero Live
    heroLive, onHeroLive,
    // Changelog
    auftragChangelog, showChangelogModal, auftragChangelogSorted, changelogGrouped,
    // Sidebar Edit
    sidebarEdit, openSidebarEdit, saveSidebarEdit,
  }
}
