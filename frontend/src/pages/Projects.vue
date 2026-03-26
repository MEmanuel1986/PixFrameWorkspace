<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Aufträge</div>
        <div class="page-subtitle">Übersicht über alle Aufträge</div>
      </div>
      <button class="btn btn-primary" @click="openAddModal">+ Neuer Auftrag</button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <SearchBar v-model="searchQuery" placeholder="Auftrag oder Kunde suchen…" />
        <div class="filter-tags">
          <span v-for="f in statusFilters" :key="f.value"
            class="filter-tag" :class="{ active: activeFilter === f.value }"
            @click="activeFilter = f.value">
            {{ f.label }}
          </span>
        </div>
        <span class="result-count">{{ filteredProjects.length }} Einträge</span>
      </div>

      <div v-if="store.loading" class="loading-state">⏳ Lädt...</div>
      <div v-else-if="filteredProjects.length === 0" class="empty-state" style="padding:40px">
        <h3>Keine Aufträge gefunden</h3>
        <p>{{ searchQuery || activeFilter ? 'Keine Treffer für diese Filter.' : 'Noch keine Aufträge vorhanden.' }}</p>
        <button v-if="!searchQuery && !activeFilter" class="btn btn-primary" @click="openAddModal">Erstes Auftrag anlegen</button>
      </div>

      <table v-else>
        <thead>
          <tr>
            <th>Status</th>
            <th class="sortable" @click="setSort('projectName')">Auftragsname {{ sortIcon('projectName') }}</th>
            <th>Kategorie</th>
            <th class="sortable" @click="setSort('booking')">Buchungsdatum {{ sortIcon('booking') }}</th>
            <th>Kunde</th>
            <th>Leistungen</th>
            <th>Betrag</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filteredProjects" :key="p.id"
            class="project-row" @click="navigateTo(p)">
            <td>
              <span class="badge" :class="`status-${p.status.toLowerCase()}`">{{ p.status }}</span>
            </td>
            <td class="fw-600">{{ p.projectName }}</td>
            <td>{{ p.category }}</td>
            <td>{{ formatDate(p.booking) }}</td>
            <td>{{ customerName(p.customerId) }}</td>
            <td>
              <span class="svc-icons">
                <span v-if="p.fotografie"  title="Fotografie">📷</span>
                <span v-if="p.videografie" title="Videografie">🎬</span>
                <span v-if="p.glueckwunschkarten" title="Glückwunschkarten">💌</span>
                <span v-if="p.gettingReady || p.gettingReadyEr || p.gettingReadySie || p.gettingReadyBeide" title="Getting Ready">💄</span>
              </span>
            </td>
            <td class="text-right fw-600" :style="p.budget?.estimatedAmount ? 'color:var(--primary)' : ''">
              {{ p.budget?.estimatedAmount ? formatCurrency(p.budget.estimatedAmount) : '—' }}
            </td>
            <td>
              <div class="td-actions" @click.stop>
                <button class="btn btn-ghost btn-sm btn-icon" @click="editProject(p)" title="Bearbeiten">✏️</button>
                <button class="btn btn-ghost btn-sm btn-icon" @click="confirmDelete(p)" title="Löschen" style="color:var(--danger)">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal: Auftrag anlegen/bearbeiten -->
    <div v-if="modalOpen" class="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>{{ editingProject ? 'Auftrag bearbeiten' : 'Neuer Auftrag' }}</h2>
          <button class="btn btn-ghost btn-sm btn-icon" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Auftragsname *</label>
            <input v-model="form.projectName" type="text" placeholder="z.B. Schmidt Hochzeit 2025" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Kunde *</label>
              <select v-model="form.customerId">
                <option value="">— Bitte wählen —</option>
                <option v-for="c in store.customers" :key="c.id" :value="c.id">
                  {{ c.firstName }} {{ c.lastName }}{{ c.company ? ` (${c.company})` : '' }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Kategorie *</label>
              <select v-model="form.category">
                <option value="">— Bitte wählen —</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label>Buchungsdatum *</label>
              <input v-model="form.booking" type="date" />
            </div>
            <div class="form-group">
              <label>Uhrzeit</label>
              <input v-model="form.bookingTime" type="time" />
            </div>
            <div class="form-group">
              <label>Buchungsdauer</label>
              <input v-model="form.bookingDuration" type="text" placeholder="z.B. 8 Stunden" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Status</label>
              <select v-model="form.status">
                <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Veranstaltungsort / Location</label>
              <input v-model="form.location" type="text" placeholder="z.B. Schloss Neuschwanstein, München" />
            </div>
          </div>

          <div class="section-divider">Leistungen</div>
          <div class="checkbox-grid">
            <label class="checkbox-item"><input type="checkbox" v-model="form.fotografie" /> 📷 Fotografie</label>
            <label class="checkbox-item"><input type="checkbox" v-model="form.videografie" /> 🎬 Videografie</label>
            <label class="checkbox-item"><input type="checkbox" v-model="form.glueckwunschkarten" /> 💌 Danksagungskarten</label>
            <label class="checkbox-item"><input type="checkbox" v-model="form.gettingReadyEr" /> 💄 Getting Ready Er</label>
            <label class="checkbox-item"><input type="checkbox" v-model="form.gettingReadySie" /> 💄 Getting Ready Sie</label>
            <label class="checkbox-item"><input type="checkbox" v-model="form.gettingReadyBeide" /> 💄 Getting Ready Beide</label>
          </div>

          <div class="section-divider">Betrag & Info</div>
          <div class="form-row">
            <div class="form-group">
              <label>Betrag (EUR)</label>
              <input v-model.number="form.budget.estimatedAmount" type="number" min="0" placeholder="0" />
            </div>
            <div class="form-group">
              <label>Lieferdatum</label>
              <input v-model="form.deliveryDate" type="date" />
            </div>
          </div>
          <div class="form-group">
            <label>Buchungsinfo / Anzahlung</label>
            <input v-model="form.bookingInfo" type="text" placeholder="z.B. Anzahlung 500 EUR erhalten am 01.01.2025" />
          </div>
          <div class="form-group">
            <label>Notizen</label>
            <textarea v-model="form.notes" placeholder="Interne Notizen..."></textarea>
          </div>
          <div v-if="formError" class="form-error">{{ formError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Abbrechen</button>
          <button class="btn btn-primary" @click="saveProject" :disabled="saving">
            {{ saving ? 'Speichern...' : (editingProject ? 'Speichern' : 'Erstellen') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Löschen -->
    <div v-if="deleteModal" class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>Auftrag löschen</h2>
          <button class="btn btn-ghost btn-sm btn-icon" @click="deleteModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p>Projekt <strong>{{ projectToDelete?.projectName }}</strong> wirklich löschen?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="deleteModal = false">Abbrechen</button>
          <button class="btn btn-danger" @click="deleteProject">Löschen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SearchBar from '../components/SearchBar.vue'
import { useStore } from '../stores/useStore'

export default {
  name: 'Projects',
  components: { SearchBar },
  setup() {
    const store  = useStore()
    const router = useRouter()
    const route  = useRoute()

    const searchQuery  = ref('')
    const activeFilter = ref('')
    const sortBy  = ref('booking')
    const sortDir = ref('desc')

    const statusFilters = [
      { value: '', label: 'Alle' },
      { value: 'Anfrage', label: 'Anfrage' },
      { value: 'Aktiv', label: 'Aktiv' },
      { value: 'Entwurf', label: 'Entwurf' },
      { value: 'Abgeliefert', label: 'Abgeliefert' },
      { value: 'Abgeschlossen', label: 'Abgeschlossen' },
    ]

    const categories = ['Hochzeit','Portrait','Event','Produktfotografie','Familienshooting','Businessfotografie','Sonstiges']
    const statusOptions = ['Anfrage','Aktiv','Entwurf','Abgeliefert','Abgeschlossen','Storniert']

    const filteredProjects = computed(() => {
      let list = [...store.projects]
      if (activeFilter.value) list = list.filter(p => p.status === activeFilter.value)
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase()
        list = list.filter(p =>
          (p.projectName || '').toLowerCase().includes(q) ||
          (p.location    || '').toLowerCase().includes(q) ||
          customerName(p.customerId).toLowerCase().includes(q)
        )
      }
      list.sort((a, b) => {
        const va = (a[sortBy.value] || '').toLowerCase()
        const vb = (b[sortBy.value] || '').toLowerCase()
        return sortDir.value === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      })
      return list
    })

    function navigateTo(p) {
      router.push(`/projects/${p.id}`)
    }

    function setSort(f) {
      if (sortBy.value === f) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
      else { sortBy.value = f; sortDir.value = 'asc' }
    }

    function sortIcon(f) {
      if (sortBy.value !== f) return '↕'
      return sortDir.value === 'asc' ? '↑' : '↓'
    }

    function customerName(id) {
      const c = store.customers.find(c => c.id === id)
      if (!c) return '—'
      return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || '—'
    }

    function formatDate(d) {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('de-DE')
    }

    function formatCurrency(n) {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
    }

    // Modal
    const modalOpen      = ref(false)
    const editingProject = ref(null)
    const saving         = ref(false)
    const formError      = ref('')

    const emptyForm = () => ({
      customerId: '', projectName: '', category: '', status: 'Aktiv',
      booking: '', bookingTime: '10:00', bookingDuration: '', location: '',
      fotografie: false, videografie: false, glueckwunschkarten: false,
      gettingReady: false, gettingReadyEr: false, gettingReadySie: false, gettingReadyBeide: false,
      budget: { estimatedAmount: 0, currency: 'EUR' },
      deliveryDate: '', bookingInfo: '', notes: '', description: '', team: [], documents: []
    })

    const form = ref(emptyForm())

    function openAddModal() {
      editingProject.value = null
      form.value = emptyForm()
      formError.value = ''
      modalOpen.value = true
    }

    function editProject(p) {
      editingProject.value = p
      form.value = { ...emptyForm(), ...p, booking: (p.booking||'').slice(0,10), deliveryDate: (p.deliveryDate||'').slice(0,10), budget: { ...p.budget } }
      formError.value = ''
      modalOpen.value = true
    }

    function closeModal() { modalOpen.value = false }

    async function saveProject() {
      formError.value = ''
      if (!form.value.customerId)  { formError.value = 'Bitte Kunden wählen.'; return }
      if (!form.value.projectName) { formError.value = 'Auftragsname ist erforderlich.'; return }
      if (!form.value.category)    { formError.value = 'Bitte Kategorie wählen.'; return }
      if (!form.value.booking)     { formError.value = 'Buchungsdatum ist erforderlich.'; return }
      saving.value = true
      try {
        if (editingProject.value) await store.updateProject(editingProject.value.id, form.value)
        else await store.addProject(form.value)
        closeModal()
      } catch (e) {
        formError.value = 'Fehler: ' + (e.response?.data?.error || e.message)
      } finally { saving.value = false }
    }

    const deleteModal      = ref(false)
    const projectToDelete  = ref(null)

    function confirmDelete(p) { projectToDelete.value = p; deleteModal.value = true }

    async function deleteProject() {
      if (!projectToDelete.value) return
      await store.deleteProject(projectToDelete.value.id)
      deleteModal.value = false
    }

    onMounted(() => {
      store.fetchProjects()
      store.fetchCustomers()
      if (route.query.status) activeFilter.value = route.query.status
    })

    watch(() => route.query.status, (val) => {
      activeFilter.value = val || ''
    })

    return {
      store, searchQuery, activeFilter, statusFilters, filteredProjects, setSort, sortIcon,
      categories, statusOptions, customerName, formatDate, formatCurrency,
      navigateTo,
      modalOpen, editingProject, saving, formError, form,
      openAddModal, editProject, closeModal, saveProject,
      deleteModal, projectToDelete, confirmDelete, deleteProject
    }
  }
}
</script>

<style scoped>
.result-count  { margin-left: auto; font-size: 12px; color: var(--text-muted); }
.svc-icons     { display: flex; gap: 4px; font-size: 15px; }
.project-row   { cursor: pointer; transition: background .12s; }
.project-row:hover { background: var(--primary-light); }
</style>
