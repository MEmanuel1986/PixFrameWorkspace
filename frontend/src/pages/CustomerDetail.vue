<template>
  <div class="customer-detail">
    <router-link to="/customers" class="back-link">
      ← Kundenliste
    </router-link>

    <div v-if="loading" class="loading-state">⏳ Lädt...</div>
    <div v-else-if="!customer" class="empty-state"><h3>❌ Kunde nicht gefunden</h3></div>

    <div v-else class="akte">

      <!-- ━━━ Hero-Header ━━━ -->
      <div class="akte-hero">
        <div class="hero-avatar">{{ initials }}</div>
        <div class="hero-body">
          <div class="hero-name-row">
            <span v-if="customer.salutation || customer.title" class="hero-salutation">
              {{ [customer.salutation, customer.title].filter(Boolean).join(' ') }}
            </span>
            <h1 class="hero-name">{{ displayName }}</h1>
          </div>
          <p v-if="customer.company" class="hero-company">🏢 {{ customer.company }}</p>
          <div class="hero-pills">
            <a v-if="customer.email"  :href="`mailto:${customer.email}`"  class="hero-pill">✉ {{ customer.email }}</a>
            <a v-if="customer.phone"  :href="`tel:${customer.phone}`"     class="hero-pill">📞 {{ customer.phone }}</a>
            <span v-if="customer.city" class="hero-pill">📍 {{ [customer.zipCode, customer.city].filter(Boolean).join(' ') }}</span>
          </div>
        </div>
        <div class="hero-actions">
          <button class="btn btn-ghost btn-sm hero-edit-btn" @click="openEditModal">✏️ Bearbeiten</button>
        </div>
      </div>

      <!-- ━━━ KPI-Zeile ━━━ -->
      <div class="akte-kpis">
        <div class="akpi" @click="activeTab = 'projects'">
          <div class="akpi-val">{{ projects.length }}</div>
          <div class="akpi-lbl">Aufträge</div>
        </div>
        <div class="akpi" @click="activeTab = 'projects'">
          <div class="akpi-val">{{ quotes.length }}</div>
          <div class="akpi-lbl">Angebote</div>
        </div>
        <div class="akpi" @click="activeTab = 'projects'">
          <div class="akpi-val">{{ invoices.length }}</div>
          <div class="akpi-lbl">Rechnungen</div>
        </div>
        <div class="akpi akpi-amount">
          <div class="akpi-val">{{ formatCurrency(totalBetrag) }}</div>
          <div class="akpi-lbl">Betrag gesamt</div>
        </div>
      </div>

      <!-- ━━━ Tabs ━━━ -->
      <div class="akte-tabs">
        <button v-for="tab in tabs" :key="tab.id"
          class="akte-tab" :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id">
          {{ tab.icon }} {{ tab.label }}
          <span v-if="tabCount(tab.id) > 0" class="akte-tab-pill">{{ tabCount(tab.id) }}</span>
        </button>
      </div>

      <!-- ━━━ Tab: Kundendaten ━━━ -->
      <div v-if="activeTab === 'overview'" class="tab-panel">
        <div class="data-grid">

          <div class="data-card">
            <div class="dc-title">Kontakt</div>
            <div class="dc-row"><span>E-Mail</span>
              <a v-if="customer.email" :href="`mailto:${customer.email}`">{{ customer.email }}</a>
              <span v-else class="muted">—</span>
            </div>
            <div class="dc-row"><span>Telefon</span>
              <a v-if="customer.phone" :href="`tel:${customer.phone}`">{{ customer.phone }}</a>
              <span v-else class="muted">—</span>
            </div>
          </div>

          <div class="data-card">
            <div class="dc-title">Adresse</div>
            <div class="dc-row"><span>Straße</span>
              <span>{{ [customer.street, customer.houseNumber].filter(Boolean).join(' ') || '—' }}</span>
            </div>
            <div class="dc-row"><span>PLZ / Ort</span>
              <span>{{ [customer.zipCode, customer.city].filter(Boolean).join(' ') || '—' }}</span>
            </div>
          </div>

          <div class="data-card">
            <div class="dc-title">Steuer & Intern</div>
            <div class="dc-row"><span>Kd.-Nr.</span><span>{{ customer.customerNumber || '—' }}</span></div>
            <div class="dc-row"><span>USt-IdNr.</span><span>{{ customer.vatId || '—' }}</span></div>
            <div v-if="!customer.customerNumber && !customer.vatId" class="dc-row">
              <span class="muted">Keine Steuerdaten hinterlegt</span>
            </div>
          </div>

          <div v-if="customer.notes" class="data-card data-card-full">
            <div class="dc-title">Notizen</div>
            <p class="notes-text">{{ customer.notes }}</p>
          </div>

        </div>
      </div>

      <!-- ━━━ Tab: Aufträge ━━━ -->
      <div v-if="activeTab === 'projects'" class="tab-panel">
        <div class="tab-toolbar">
          <h2 class="tab-heading">Aufträge</h2>
          <button class="btn btn-primary btn-sm" @click="openNewProjectModal">+ Neuer Auftrag</button>
        </div>

        <div v-if="projects.length === 0" class="empty-state">
          <div style="font-size:40px;margin-bottom:12px">📭</div>
          <h3>Noch keine Aufträge</h3>
          <p>Lege den ersten Auftrag für {{ displayName }} an.</p>
          <button class="btn btn-primary" @click="openNewProjectModal">Ersten Auftrag anlegen</button>
        </div>

        <div v-else class="proj-accordion">
          <div v-for="proj in projects" :key="proj.id" class="proj-acc-item">

            <!-- Projekt-Header — klickbar → Auftragsseite -->
            <div class="proj-acc-header proj-acc-clickable" @click="goToProject(proj.id)">
              <div class="proj-acc-info">
                <span class="proj-acc-name">{{ proj.projectName }}</span>
                <span class="proj-acc-meta">
                  {{ proj.category }}
                  <template v-if="proj.booking"> · {{ formatDate(proj.booking) }}</template>
                  <template v-if="proj.location"> · {{ proj.location }}</template>
                </span>
              </div>
              <div class="proj-acc-right">
                <span class="badge" :class="`status-${(proj.status||'entwurf').toLowerCase()}`">{{ proj.status }}</span>
                <span v-if="proj.budget?.estimatedAmount" class="betrag-tag">{{ formatCurrency(proj.budget.estimatedAmount) }}</span>
                <span v-if="(docsByProject[proj.id]||[]).length" class="proj-acc-doccount">
                  {{ (docsByProject[proj.id]||[]).length }} Dok.
                </span>
                <button class="btn btn-ghost btn-sm btn-icon" title="Zum Auftrag" @click.stop="goToProject(proj.id)">→</button>
                <button class="btn btn-ghost btn-sm btn-icon" title="Dokumente anzeigen"
                  @click.stop="toggleProject(proj.id)">{{ expandedProjects.has(proj.id) ? '▲' : '▼' }}</button>
              </div>
            </div>

            <!-- Dokumente des Auftrags -->
            <div v-if="expandedProjects.has(proj.id)" class="proj-acc-body">
              <div v-if="!(docsByProject[proj.id]||[]).length" class="proj-acc-empty">
                Noch keine Dokumente für diesen Auftrag.
              </div>
              <table v-else class="proj-acc-table">
                <thead>
                  <tr><th>Name</th><th>Typ</th><th>Datum</th><th>Betrag</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="doc in (docsByProject[proj.id]||[])" :key="doc.id"
                    style="cursor:pointer" @click="openDocDetail(doc)">
                    <td class="fw-600">
                      {{ doc.name }}
                      <span v-if="doc.docSubtype==='correction'"  class="badge badge-warning" style="font-size:10px;margin-left:4px">Korrektur</span>
                      <span v-if="doc.docSubtype==='cancellation'" class="badge badge-danger"  style="font-size:10px;margin-left:4px">Storno</span>
                    </td>
                    <td><span class="badge badge-neutral">{{ typeLabel(doc.type) }}</span></td>
                    <td class="text-muted" style="font-size:12px">{{ formatDate(doc.issueDate || doc.createdAt) }}</td>
                    <td class="fw-600" style="font-size:13px"
                      :style="doc.total < 0 ? 'color:var(--danger)' : doc.total > 0 ? 'color:var(--primary-text)' : ''">
                      {{ doc.total != null && (doc.type==='quote'||doc.type==='invoice') ? formatCurrency(doc.total) : '—' }}
                    </td>
                    <td @click.stop>
                      <div class="td-actions">
                        <button class="btn btn-ghost btn-sm btn-icon" @click="openDocDetail(doc)">🔍</button>
                        <button v-if="doc.filePath" class="btn btn-ghost btn-sm btn-icon" @click="downloadDoc(doc)">⬇️</button>
                        <button class="btn btn-ghost btn-sm btn-icon" style="color:var(--danger)" @click.stop="deleteDoc(doc.id)">🗑️</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="proj-acc-actions">
                <button class="btn btn-ghost btn-sm" @click="openNewDoc(proj,'quote')">📋 + Angebot</button>
                <button class="btn btn-ghost btn-sm" @click="openNewDoc(proj,'invoice')">🧾 + Rechnung</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /akte -->

    <!-- ══════════════════════════════════════
         MODAL: Kunde bearbeiten (vollständig)
    ══════════════════════════════════════ -->
    <!-- Document Detail / Edit Modal -->
    <DocumentDetailModal
      v-if="detailDocId && detailDocObj"
      :doc="detailDocObj"
      :customer="customer"
      @close="detailDocId = null"
      @open-doc="openDocDetail"
      @created="doc => { allDocs.unshift(doc); detailDocId = null }"
      @updated="detailDocId = null"
    />

    <!-- Neues Angebot / Rechnung direkt am Auftrag -->
    <QuoteInvoiceModal
      v-if="newDocProjectId"
      :type="newDocType"
      :project-id="newDocProjectId"
      @close="newDocProjectId = null"
      @created="doc => { allDocs.unshift(doc); newDocProjectId = null }"
    />

    <div v-if="editModal" class="modal-overlay" @click.self="editModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>Kunde bearbeiten</h2>
          <button class="btn btn-ghost btn-sm btn-icon" @click="editModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row form-row-3">
            <div class="form-group">
              <label>Anrede</label>
              <select v-model="editForm.salutation">
                <option value="">— Keine —</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="Divers">Divers</option>
              </select>
            </div>
            <div class="form-group">
              <label>Titel</label>
              <select v-model="editForm.title">
                <option value="">— Kein Titel —</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
                <option value="Prof. Dr.">Prof. Dr.</option>
                <option value="Dipl.-Ing.">Dipl.-Ing.</option>
                <option value="M.A.">M.A.</option>
                <option value="M.Sc.">M.Sc.</option>
                <option value="B.A.">B.A.</option>
              </select>
            </div>
            <div></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Vorname *</label>
              <input v-model="editForm.firstName" type="text" />
            </div>
            <div class="form-group">
              <label>Nachname *</label>
              <input v-model="editForm.lastName" type="text" />
            </div>
          </div>
          <div class="form-group">
            <label>Unternehmen / Studio</label>
            <input v-model="editForm.company" type="text" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>E-Mail *</label>
              <input v-model="editForm.email" type="email" />
            </div>
            <div class="form-group">
              <label>Telefon</label>
              <input v-model="editForm.phone" type="tel" />
            </div>
          </div>
          <div class="form-section">Adresse</div>
          <div class="form-row" style="grid-template-columns:1fr 80px">
            <div class="form-group">
              <label>Straße</label>
              <input v-model="editForm.street" type="text" />
            </div>
            <div class="form-group">
              <label>Nr.</label>
              <input v-model="editForm.houseNumber" type="text" />
            </div>
          </div>
          <div class="form-row" style="grid-template-columns:90px 1fr">
            <div class="form-group">
              <label>PLZ</label>
              <input v-model="editForm.zipCode" type="text" />
            </div>
            <div class="form-group">
              <label>Stadt</label>
              <input v-model="editForm.city" type="text" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Kundennummer</label>
              <input v-model="editForm.customerNumber" type="text" placeholder="z.B. KD-0042" />
            </div>
            <div class="form-group">
              <label>USt-IdNr.</label>
              <input v-model="editForm.vatId" type="text" placeholder="DE123456789" />
            </div>
          </div>
          <div class="form-group">
            <label>Notizen</label>
            <textarea v-model="editForm.notes" rows="3"></textarea>
          </div>
          <div v-if="editError" class="form-error">{{ editError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="editModal = false">Abbrechen</button>
          <button class="btn btn-primary" @click="saveEdit" :disabled="editSaving">
            {{ editSaving ? 'Speichern…' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════
         MODAL: Neuer Auftrag (direkt, Kunde vorbelegt)
    ══════════════════════════════════════ -->
    <div v-if="projectModal" class="modal-overlay" @click.self="projectModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>Neuer Auftrag — <span style="font-weight:400;opacity:.8">{{ displayName }}</span></h2>
          <button class="btn btn-ghost btn-sm btn-icon" @click="projectModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Auftragsname *</label>
            <input v-model="projForm.projectName" type="text" placeholder="z.B. Schmidt Hochzeit 2025" autofocus />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Kategorie *</label>
              <select v-model="projForm.category">
                <option value="">— Bitte wählen —</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="projForm.status">
                <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label>Buchungsdatum *</label>
              <input v-model="projForm.booking" type="date" />
            </div>
            <div class="form-group">
              <label>Uhrzeit</label>
              <input v-model="projForm.bookingTime" type="time" />
            </div>
            <div class="form-group">
              <label>Buchungsdauer</label>
              <input v-model="projForm.bookingDuration" type="text" placeholder="z.B. 8 Stunden" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Lieferdatum</label>
              <input v-model="projForm.deliveryDate" type="date" />
            </div>
            <div class="form-group">
              <label>Veranstaltungsort / Location</label>
              <input v-model="projForm.location" type="text" placeholder="z.B. Schloss Neuschwanstein" />
            </div>
          </div>

          <div class="form-section">Leistungen</div>
          <div class="checkbox-grid">
            <label class="checkbox-item"><input type="checkbox" v-model="projForm.fotografie" /> 📷 Fotografie</label>
            <label class="checkbox-item"><input type="checkbox" v-model="projForm.videografie" /> 🎬 Videografie</label>
            <label class="checkbox-item"><input type="checkbox" v-model="projForm.glueckwunschkarten" /> 💌 Danksagungskarten</label>
            <label class="checkbox-item"><input type="checkbox" v-model="projForm.gettingReadyEr" /> 💄 Getting Ready Er</label>
            <label class="checkbox-item"><input type="checkbox" v-model="projForm.gettingReadySie" /> 💄 Getting Ready Sie</label>
            <label class="checkbox-item"><input type="checkbox" v-model="projForm.gettingReadyBeide" /> 💄 Getting Ready Beide</label>
          </div>

          <div class="form-section">Betrag & Info</div>
          <div class="form-row">
            <div class="form-group">
              <label>Betrag (EUR)</label>
              <input v-model.number="projForm.budget.estimatedAmount" type="number" min="0" placeholder="0" />
            </div>
            <div class="form-group">
              <label>Buchungsinfo / Anzahlung</label>
              <input v-model="projForm.bookingInfo" type="text" placeholder="z.B. Anzahlung 500 € am 01.01.2025" />
            </div>
          </div>
          <div class="form-group">
            <label>Notizen</label>
            <textarea v-model="projForm.notes" rows="2" placeholder="Interne Notizen…"></textarea>
          </div>
          <div v-if="projError" class="form-error">{{ projError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="projectModal = false">Abbrechen</button>
          <button class="btn btn-primary" @click="saveNewProject" :disabled="projSaving">
            {{ projSaving ? 'Erstellen…' : 'Auftrag erstellen' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import apiClient, { API_BASE } from '../services/api'
import { ref, computed, onMounted } from 'vue'
import { useStore }  from '../stores/useStore'
import { useRouter } from 'vue-router'
import { useRoute }  from 'vue-router'
import DocumentDetailModal  from '../components/DocumentDetailModal.vue'
import QuoteInvoiceModal    from '../components/QuoteInvoiceModal.vue'

export default {
  name: 'CustomerDetail',
  components: { DocumentDetailModal, QuoteInvoiceModal },
  setup() {
    const store  = useStore()
    const route  = useRoute()
    const router = useRouter()

    const detailDocId  = ref(null)
    const detailDocObj = computed(() =>
      detailDocId.value ? store.documents.find(d => d.id === detailDocId.value) || null : null
    )
    function openDocDetail(doc) {
      detailDocId.value = typeof doc === 'string' ? doc : doc.id
    }

    const loading   = ref(true)
    const activeTab = ref('overview')

    // ── Kunde ──
    const customer = computed(() =>
      store.customers.find(c => c.id === route.params.id) || null
    )

    const displayName = computed(() => {
      if (!customer.value) return ''
      return `${customer.value.firstName || ''} ${customer.value.lastName || ''}`.trim()
        || customer.value.company || '—'
    })

    const initials = computed(() => {
      if (!customer.value) return '?'
      const f = (customer.value.firstName || '').charAt(0).toUpperCase()
      const l = (customer.value.lastName  || '').charAt(0).toUpperCase()
      return (f + l) || (customer.value.company || '?').charAt(0).toUpperCase()
    })

    // ── Daten ──
    const projects = ref([])
    const allDocs  = ref([])

    // Group all docs by projectId for accordion display
    const docsByProject = computed(() => {
      const map = {}
      allDocs.value.forEach(d => {
        const pid = d.projectId || '__none__'
        if (!map[pid]) map[pid] = []
        map[pid].push(d)
      })
      return map
    })

    // Keep these for backward compat (akpi counters)
    const invoices  = computed(() => allDocs.value.filter(d => d.type === 'invoice'))
    const quotes    = computed(() => allDocs.value.filter(d => d.type === 'quote'))
    const totalBetrag = computed(() =>
      projects.value.reduce((s, p) => s + (p.budget?.estimatedAmount || 0), 0)
    )

    // Accordion state
    const expandedProjects = ref(new Set())
    function goToProject(id) { router.push('/projects/' + id) }
    function toggleProject(id) {
      const s = new Set(expandedProjects.value)
      s.has(id) ? s.delete(id) : s.add(id)
      expandedProjects.value = s
    }

    // New doc creation from project card
    const newDocProjectId = ref(null)
    const newDocType      = ref('quote')
    function openNewDoc(proj, type) {
      newDocProjectId.value = proj.id
      newDocType.value      = type
    }

    const tabs = [
      { id: 'overview',  icon: '📋', label: 'Kundendaten' },
      { id: 'projects',  icon: '📁', label: 'Aufträge' },
    ]

    function tabCount(id) {
      if (id === 'projects') return projects.value.length
      return 0
    }

    // ── Helpers ──
    function formatDate(d)   { return d ? new Date(d).toLocaleDateString('de-DE') : '—' }
    function formatCurrency(n) {
      return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n || 0)
    }
    function isExpired(d)    { return d && new Date(d) < new Date() }
    function typeLabel(type) {
      return { contract:'Vertrag', invoice:'Rechnung', quote:'Angebot', mood:'Moodboard', reference:'Referenz', other:'Sonstiges' }[type] || type
    }
    function projectName(id) {
      const p = projects.value.find(p => p.id === id)
      return p ? p.projectName : '—'
    }
    function downloadDoc(doc) { if (doc.filePath) window.open(`${API_BASE}/${doc.filePath}`, '_blank') }
    async function deleteDoc(id) {
      if (!confirm('Dokument wirklich löschen?')) return
      await store.deleteDocument(id)
      allDocs.value = allDocs.value.filter(d => d.id !== id)
    }

    // ── Edit Modal ──
    const editModal  = ref(false)
    const editSaving = ref(false)
    const editError  = ref('')
    const editForm   = ref({})

    function openEditModal() {
      editForm.value = {
        salutation: '', title: '', firstName: '', lastName: '', company: '',
        email: '', phone: '', street: '', houseNumber: '', zipCode: '', city: '',
        vatId: '', customerNumber: '', notes: '',
        ...customer.value
      }
      editError.value = ''
      editModal.value = true
    }

    async function saveEdit() {
      editError.value = ''
      if (!editForm.value.firstName?.trim()) { editError.value = 'Vorname ist erforderlich.'; return }
      if (!editForm.value.lastName?.trim())  { editError.value = 'Nachname ist erforderlich.'; return }
      if (!editForm.value.email?.trim())     { editError.value = 'E-Mail ist erforderlich.'; return }
      editSaving.value = true
      try {
        await store.updateCustomer(customer.value.id, editForm.value)
        editModal.value = false
      } catch (e) {
        editError.value = 'Fehler: ' + (e.response?.data?.error || e.message)
      } finally { editSaving.value = false }
    }

    // ── Neuer Auftrag Modal ──
    const projectModal = ref(false)
    const projSaving   = ref(false)
    const projError    = ref('')

    const categories    = ['Hochzeit','Portrait','Event','Produktfotografie','Familienshooting','Businessfotografie','Sonstiges']
    const statusOptions = ['Aktiv','Entwurf','Abgeliefert','Abgeschlossen','Storniert']

    const emptyProjForm = () => ({
      projectName: '', category: '', status: 'Aktiv',
      booking: '', bookingTime: '10:00', bookingDuration: '', deliveryDate: '', location: '',
      fotografie: false, videografie: false, glueckwunschkarten: false,
      gettingReady: false, gettingReadyEr: false, gettingReadySie: false, gettingReadyBeide: false,
      budget: { estimatedAmount: 0, currency: 'EUR' },
      bookingInfo: '', notes: '', description: '', team: [], documents: []
    })

    const projForm = ref(emptyProjForm())

    function openNewProjectModal() {
      projForm.value  = emptyProjForm()
      projError.value = ''
      projectModal.value = true
    }

    async function saveNewProject() {
      projError.value = ''
      if (!projForm.value.projectName) { projError.value = 'Auftragsname ist erforderlich.'; return }
      if (!projForm.value.category)    { projError.value = 'Bitte Kategorie wählen.'; return }
      if (!projForm.value.booking)     { projError.value = 'Buchungsdatum ist erforderlich.'; return }
      projSaving.value = true
      try {
        const payload = { ...projForm.value, customerId: customer.value.id }
        const created = await store.addProject(payload)
        projects.value = [created, ...projects.value]
        projectModal.value = false
        activeTab.value = 'projects'
      } catch (e) {
        projError.value = 'Fehler: ' + (e.response?.data?.error || e.message)
      } finally { projSaving.value = false }
    }

    // ── Init ──
    onMounted(async () => {
      loading.value = true
      await store.fetchCustomers()
      const cid = route.params.id
      try {
        const [p, d] = await Promise.all([
          store.fetchProjectsByCustomer(cid),
          store.fetchDocumentsByCustomer(cid)
        ])
        projects.value = p || []
        allDocs.value  = d || []
      } catch (e) { console.error(e) }
      finally { loading.value = false }
    })

    return {
      customer, displayName, initials, loading, activeTab, tabs, tabCount,
      projects, allDocs, invoices, quotes, totalBetrag,
      docsByProject, expandedProjects, goToProject, toggleProject,
      newDocProjectId, newDocType, openNewDoc,
      formatDate, formatCurrency, isExpired, typeLabel, projectName, downloadDoc, deleteDoc,
      detailDocId, detailDocObj, openDocDetail,
      editModal, editSaving, editError, editForm, openEditModal, saveEdit,
      projectModal, projSaving, projError, projForm,
      categories, statusOptions, openNewProjectModal, saveNewProject,
      router,
    }
  }
}
</script>

<style scoped>
.customer-detail { width: 100%; }

/* ── Back link ── */
.back-link {
  display: inline-flex; align-items: center; gap: 4px;
  color: var(--text-muted); font-size: 13px; text-decoration: none;
  margin-bottom: 18px; transition: color .14s;
}
.back-link svg { width: 14px; height: 14px; }
.back-link:hover { color: var(--primary-text); text-decoration: none; }

/* ── Hero ── */
.akte-hero {
  display: flex; align-items: flex-start; gap: 20px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: var(--radius-xl);
  padding: 24px 24px 22px;
  color: white;
  margin-bottom: 14px;
}

.hero-avatar {
  width: 56px; height: 56px; flex-shrink: 0;
  border-radius: 50%;
  background: rgba(255,255,255,.2);
  border: 2px solid rgba(255,255,255,.35);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; color: white;
}

.hero-body { flex: 1; min-width: 0; }

.hero-name-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.hero-salutation { font-size: 13px; opacity: .75; }
.hero-name { font-size: 22px; font-weight: 700; margin: 0; line-height: 1.2; }
.hero-company { font-size: 13px; opacity: .85; margin: 3px 0 10px; }

.hero-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.hero-pill {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 99px; padding: 3px 11px;
  font-size: 12px; color: rgba(255,255,255,.9);
  text-decoration: none; transition: background .12s;
}
.hero-pill:hover { background: rgba(255,255,255,.25); text-decoration: none; color: white; }

.hero-actions { flex-shrink: 0; }
.hero-edit-btn { color: rgba(255,255,255,.8) !important; border-color: rgba(255,255,255,.25) !important; background: rgba(255,255,255,.1) !important; }
.hero-edit-btn:hover { background: rgba(255,255,255,.2) !important; color: white !important; }

/* ── KPI row ── */
.akte-kpis {
  display: flex; gap: 10px; flex-wrap: wrap;
  margin-bottom: 14px;
}
.akpi {
  flex: 1; min-width: 90px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 14px 16px;
  text-align: center; cursor: pointer;
  transition: border-color .14s, box-shadow .14s;
  box-shadow: var(--shadow-sm);
}
.akpi:hover { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,70,229,.08); }
.akpi-val { font-size: 20px; font-weight: 700; color: var(--text); }
.akpi-lbl { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.akpi-amount .akpi-val { font-size: 16px; color: var(--primary-text); }

/* ── Tabs ── */
.akte-tabs {
  display: flex; gap: 0;
  border-bottom: 2px solid var(--border);
  margin-bottom: 18px; overflow-x: auto;
  scrollbar-width: none;
}
.akte-tabs::-webkit-scrollbar { display: none; }

.akte-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 18px;
  border: none; background: none;
  color: var(--text-muted); font-size: 13px; font-weight: 500;
  font-family: inherit; cursor: pointer;
  border-bottom: 2.5px solid transparent;
  margin-bottom: -2px; white-space: nowrap;
  transition: color .14s, border-color .14s;
}
.akte-tab:hover  { color: var(--text); }
.akte-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

.akte-tab-pill {
  background: var(--primary); color: white;
  font-size: 10px; font-weight: 700;
  padding: 1px 6px; border-radius: 10px;
}

/* ── Tab panel ── */
.tab-panel { padding-bottom: 40px; }

.tab-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.tab-heading { font-size: 16px; font-weight: 700; margin: 0; }

/* ── Kundendaten ── */
.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}
.data-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 16px 18px;
  box-shadow: var(--shadow-sm);
}
.data-card-full { grid-column: 1 / -1; }
.dc-title {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .7px; color: var(--text-muted);
  margin-bottom: 10px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.dc-row {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 12px; padding: 6px 0;
  border-bottom: 1px solid var(--border); font-size: 13px;
}
.dc-row:last-child { border-bottom: none; }
.dc-row > span:first-child { color: var(--text-muted); flex-shrink: 0; }
.dc-row > span:last-child, .dc-row > a, .dc-row > code { font-weight: 500; text-align: right; word-break: break-all; }
.dc-row a { color: var(--primary-text); text-decoration: none; }
.dc-row a:hover { text-decoration: underline; }
.muted { color: var(--text-muted); font-weight: 400 !important; }
.folder-path { font-family: monospace; font-size: 11px; background: var(--bg-alt); padding: 1px 5px; border-radius: 3px; }
.notes-text  { font-size: 13.5px; color: var(--text-2); line-height: 1.65; margin: 0; }

/* ── Auftragskarten ── */
.project-cards { display: flex; flex-direction: column; gap: 10px; }
.project-card {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 14px 16px;
  box-shadow: var(--shadow-sm); transition: border-color .14s;
}
.project-card:hover { border-color: var(--primary); }

.pc-left { flex: 1; min-width: 0; }
.pc-name { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.pc-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.pc-services { display: flex; gap: 5px; flex-wrap: wrap; }
.svc-badge {
  font-size: 11px; background: var(--bg-alt);
  border: 1px solid var(--border); border-radius: 99px;
  padding: 1px 8px; color: var(--text-2);
}

.pc-right {
  display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0;
}
.betrag-tag {
  font-size: 12px; font-weight: 700;
  color: var(--primary-text); background: var(--primary-light);
  padding: 2px 8px; border-radius: 10px;
}

/* ── Projekt-Accordion ── */
.proj-accordion { display: flex; flex-direction: column; gap: 8px; }
.proj-acc-item {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.proj-acc-clickable { cursor:pointer; }
.proj-acc-clickable:hover { background:var(--primary-light); }
.proj-acc-clickable:hover .proj-acc-name { color:var(--primary-text); }
.proj-acc-header {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 16px; cursor: pointer;
  transition: background .12s;
}
.proj-acc-header:hover { background: var(--primary-light); }
.proj-acc-arrow {
  font-size: 10px; color: var(--text-muted);
  transition: transform .18s; flex-shrink: 0;
}
.proj-acc-arrow.open { transform: rotate(90deg); }
.proj-acc-info { flex: 1; min-width: 0; }
.proj-acc-name { font-size: 14px; font-weight: 600; color: var(--text); display: block; }
.proj-acc-meta { font-size: 12px; color: var(--text-muted); }
.proj-acc-right {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}
.proj-acc-doccount {
  font-size: 11px; color: var(--text-muted);
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 99px; padding: 1px 8px;
}
.proj-acc-body {
  border-top: 1px solid var(--border);
  padding: 0 0 8px 0;
}
.proj-acc-empty {
  padding: 16px 20px;
  font-size: 13px; color: var(--text-muted); font-style: italic;
}
.proj-acc-table { width: 100%; border-collapse: collapse; }
.proj-acc-table th {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .04em; color: var(--text-muted);
  padding: 8px 14px; background: var(--bg-alt);
  border-bottom: 1px solid var(--border); text-align: left;
}
.proj-acc-table td {
  padding: 9px 14px; border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.proj-acc-table tbody tr:last-child td { border-bottom: none; }
.proj-acc-table tbody tr:hover { background: var(--primary-light); }
.proj-acc-actions {
  display: flex; gap: 8px; padding: 10px 14px 4px;
}
.billing-col-title {
  font-size: 14px; font-weight: 700; color: var(--text);
  margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
}
.bc-count {
  background: var(--bg-alt); border: 1px solid var(--border);
  font-size: 11px; color: var(--text-muted); font-weight: 600;
  padding: 1px 7px; border-radius: 10px;
}
.empty-inline { color: var(--text-muted); font-size: 13px; padding: 10px 0; }

@media (max-width: 800px) {
  .billing-grid { grid-template-columns: 1fr; }
  .akte-hero { flex-wrap: wrap; }
  .data-grid  { grid-template-columns: 1fr; }
}
</style>
