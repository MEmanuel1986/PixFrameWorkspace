<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Kunden</div>
        <div class="page-subtitle">{{ store.customers.length }} Kunden · Klicken zum Öffnen</div>
      </div>
      <button class="btn btn-primary" @click="openAddModal">+ Neuen Kunden anlegen</button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <div class="cust-searchbox">
          <span class="cust-search-icon">🔍</span>
          <input v-model="searchQuery" class="cust-search-inp"
            placeholder="Name, Kundennr., Unternehmen, Ort, E-Mail…"
            @keydown.escape="searchQuery = ''" />
          <button v-if="searchQuery" class="cust-search-clear" @click="searchQuery = ''">✕</button>
        </div>
        <span class="result-count">{{ filteredCustomers.length }} Einträge</span>
      </div>

      <div v-if="store.loading" class="loading-state">Kunden werden geladen…</div>
      <div v-else-if="filteredCustomers.length === 0" class="empty-state" style="padding:48px 24px">
        <h3>{{ searchQuery ? 'Kein Treffer' : 'Noch keine Kunden' }}</h3>
        <p>{{ searchQuery ? `Kein Ergebnis für „${searchQuery}"` : 'Lege deinen ersten Kunden an.' }}</p>
        <button v-if="!searchQuery" class="btn btn-primary" @click="openAddModal">Ersten Kunden anlegen</button>
      </div>

      <table v-else>
        <thead>
          <tr>
            <th class="sortable" @click="setSort('customerNumber')">Kd.-Nr. {{ si('customerNumber') }}</th>
            <th class="sortable" @click="setSort('lastName')">Name {{ si('lastName') }}</th>
            <th class="sortable" @click="setSort('company')">Unternehmen {{ si('company') }}</th>
            <th class="sortable" @click="setSort('city')">Ort {{ si('city') }}</th>
            <th>E-Mail</th>
            <th>Telefon</th>
            <th style="width:80px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filteredCustomers" :key="c.id" class="tr-link" @click="openCustomer(c.id)">
            <td><span class="num-badge">{{ c.customerNumber || '—' }}</span></td>
            <td>
              <div class="fw-600">{{ fullName(c) }}</div>
              <div v-if="c.title || c.salutation" class="text-muted" style="font-size:11px">
                {{ [c.salutation, c.title].filter(Boolean).join(' ') }}
              </div>
            </td>
            <td class="text-muted">{{ c.company || '—' }}</td>
            <td class="text-muted">{{ c.zipCode ? c.zipCode + ' ' : '' }}{{ c.city || '—' }}</td>
            <td>
              <a v-if="c.email" :href="`mailto:${c.email}`" @click.stop class="mail-link">{{ c.email }}</a>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="text-muted">{{ c.phone || '—' }}</td>
            <td @click.stop>
              <div class="td-actions">
                <button class="btn btn-ghost btn-sm btn-icon" @click="openCustomer(c.id)" title="Kundenseite öffnen">🔍</button>
                <button class="btn btn-ghost btn-sm btn-icon" @click="editCustomer(c)" title="Bearbeiten">✏️</button>
                <button class="btn btn-ghost btn-sm btn-icon text-danger" @click="confirmDelete(c)" title="Löschen">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ POPUP: Kunde anlegen / bearbeiten ══════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="modalOpen" class="cp-overlay" @click.self="closeModal">
        <div class="cp-dialog">
          <!-- Header -->
          <div class="cp-head">
            <div>
              <div class="cp-head-title">
                {{ editingCustomer ? '✏️ Kunde bearbeiten' : '👤 Neuen Kunden anlegen' }}
              </div>
              <div class="cp-head-sub" v-if="editingCustomer">
                {{ fullName(editingCustomer) }}
                <span v-if="editingCustomer.customerNumber" style="opacity:.6"> · {{ editingCustomer.customerNumber }}</span>
              </div>
              <div class="cp-head-sub" v-else>Vollständige Kontaktdaten eingeben</div>
            </div>
            <button class="cp-x" @click="closeModal">✕</button>
          </div>

          <!-- Body — kompaktes Raster wie Dashboard-Anfrage-Flow -->
          <div class="cp-body">

            <!-- Zeile 1: Anrede · Titel · Vorname · Nachname -->
            <div class="cp-row4">
              <div class="cp-fg">
                <label>Anrede</label>
                <select v-model="form.salutation" class="cp-inp">
                  <option value="">— Keine —</option>
                  <option>Herr</option><option>Frau</option><option>Divers</option>
                </select>
              </div>
              <div class="cp-fg">
                <label>Titel</label>
                <select v-model="form.title" class="cp-inp">
                  <option value="">— Kein —</option>
                  <option>Dr.</option><option>Prof.</option><option>Prof. Dr.</option>
                  <option>Dipl.-Ing.</option><option>M.A.</option><option>M.Sc.</option>
                </select>
              </div>
              <div class="cp-fg">
                <label>Vorname *</label>
                <input ref="firstNameInput" v-model="form.firstName" type="text"
                  class="cp-inp" placeholder="Max" />
              </div>
              <div class="cp-fg">
                <label>Nachname *</label>
                <input v-model="form.lastName" type="text" class="cp-inp" placeholder="Mustermann" />
              </div>
            </div>

            <!-- Zeile 2: Unternehmen · E-Mail · Telefon -->
            <div class="cp-row3">
              <div class="cp-fg">
                <label>Unternehmen / Studio</label>
                <input v-model="form.company" type="text" class="cp-inp" placeholder="Mustermann GmbH" />
              </div>
              <div class="cp-fg">
                <label>E-Mail *</label>
                <input v-model="form.email" type="email" class="cp-inp" placeholder="max@example.de" />
              </div>
              <div class="cp-fg">
                <label>Telefon</label>
                <input v-model="form.phone" type="tel" class="cp-inp" placeholder="+49 30 123456" />
              </div>
            </div>

            <!-- Zeile 3: Straße · Nr. · PLZ · Stadt -->
            <div class="cp-row-addr">
              <div class="cp-fg cp-addr-street">
                <label>Straße</label>
                <input v-model="form.street" type="text" class="cp-inp" placeholder="Musterstraße" />
              </div>
              <div class="cp-fg cp-addr-nr">
                <label>Nr.</label>
                <input v-model="form.houseNumber" type="text" class="cp-inp" placeholder="1a" />
              </div>
              <div class="cp-fg cp-addr-plz">
                <label>PLZ</label>
                <input v-model="form.zipCode" type="text" class="cp-inp" placeholder="10115" />
              </div>
              <div class="cp-fg cp-addr-city">
                <label>Stadt</label>
                <input v-model="form.city" type="text" class="cp-inp" placeholder="Berlin" />
              </div>
            </div>

            <!-- Zeile 4: Notizen (+ USt-IdNr. als optionales Feld) -->
            <div class="cp-row2">
              <div class="cp-fg">
                <label>Notizen</label>
                <textarea v-model="form.notes" class="cp-inp cp-textarea"
                  placeholder="Besonderheiten, Vorlieben, Empfehlung…" rows="3"></textarea>
              </div>
              <div class="cp-fg">
                <label>USt-IdNr. <span style="font-size:10px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted)">(B2B)</span></label>
                <input v-model="form.vatId" type="text" class="cp-inp" placeholder="DE123456789" />
              </div>
            </div>

            <div v-if="formError" class="cp-error">⚠ {{ formError }}</div>
          </div>

          <!-- Footer -->
          <div class="cp-foot">
            <button class="btn btn-secondary" @click="closeModal">Abbrechen</button>
            <button class="btn btn-primary" @click="saveCustomer" :disabled="saving">
              {{ saving ? '⏳ Speichern…' : editingCustomer ? 'Änderungen speichern' : 'Kunden anlegen' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Löschen-Bestätigung ── -->
    <Teleport to="body">
      <div v-if="deleteModal" class="cp-overlay" @click.self="deleteModal = false">
        <div class="cp-dialog cp-dialog-sm">
          <div class="cp-head cp-head-danger">
            <div class="cp-head-title">🗑 Kunde löschen</div>
            <button class="cp-x" @click="deleteModal = false">✕</button>
          </div>
          <div class="cp-body">
            <p>Soll <strong>{{ customerToDelete ? fullName(customerToDelete) : '' }}</strong> wirklich gelöscht werden?</p>
            <p class="text-muted" style="font-size:12.5px;margin-top:6px">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
          </div>
          <div class="cp-foot">
            <button class="btn btn-secondary" @click="deleteModal = false">Abbrechen</button>
            <button class="btn btn-danger" @click="removeCustomer">Endgültig löschen</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '../stores/useStore'

export default {
  name: 'Customers',
  setup() {
    const store  = useStore()
    const router = useRouter()

    function openCustomer(id) { router.push('/customers/' + id) }
    function fullName(c) {
      return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || '—'
    }

    // ── Search & Sort ──
    const searchQuery = ref('')
    const sortBy  = ref('lastName')
    const sortDir = ref('asc')

    const filteredCustomers = computed(() => {
      let list = [...store.customers]
      const q = searchQuery.value.trim().toLowerCase()
      if (q) {
        list = list.filter(c =>
          fullName(c).toLowerCase().includes(q) ||
          (c.customerNumber || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.city    || '').toLowerCase().includes(q) ||
          (c.email   || '').toLowerCase().includes(q) ||
          (c.phone   || '').toLowerCase().includes(q)
        )
      }
      list.sort((a, b) => {
        const va = (a[sortBy.value] || '').toLowerCase()
        const vb = (b[sortBy.value] || '').toLowerCase()
        return sortDir.value === 'asc' ? va.localeCompare(vb, 'de') : vb.localeCompare(va, 'de')
      })
      return list
    })

    function setSort(f) {
      if (sortBy.value === f) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
      else { sortBy.value = f; sortDir.value = 'asc' }
    }
    function si(f) {
      return sortBy.value !== f ? '↕' : sortDir.value === 'asc' ? '↑' : '↓'
    }

    // ── Modal ──
    const modalOpen       = ref(false)
    const editingCustomer = ref(null)
    const saving          = ref(false)
    const formError       = ref('')
    const firstNameInput  = ref(null)

    const emptyForm = () => ({
      salutation: '', title: '',
      firstName: '', lastName: '', company: '',
      email: '', phone: '',
      street: '', houseNumber: '', zipCode: '', city: '',
      vatId: '', notes: ''
    })
    const form = ref(emptyForm())

    async function openAddModal() {
      editingCustomer.value = null
      form.value = emptyForm()
      formError.value = ''
      modalOpen.value = true
      await nextTick()
      firstNameInput.value?.focus()
    }
    async function editCustomer(c) {
      editingCustomer.value = c
      form.value = { ...emptyForm(), ...c }
      formError.value = ''
      modalOpen.value = true
      await nextTick()
      firstNameInput.value?.focus()
    }
    function closeModal() { modalOpen.value = false }

    async function saveCustomer() {
      formError.value = ''
      if (!form.value.firstName?.trim()) { formError.value = 'Vorname ist erforderlich.'; return }
      if (!form.value.lastName?.trim())  { formError.value = 'Nachname ist erforderlich.'; return }
      if (!form.value.email?.trim())     { formError.value = 'E-Mail ist erforderlich.'; return }
      saving.value = true
      try {
        if (editingCustomer.value) await store.updateCustomer(editingCustomer.value.id, form.value)
        else                       await store.addCustomer(form.value)
        closeModal()
      } catch (e) {
        const detail = e.response?.data?.error || e.response?.data?.message || e.message
        formError.value = 'Fehler: ' + detail
        console.error('[Customer save]', e.response?.status, e.response?.data, e.message)
      } finally { saving.value = false }
    }

    // ── Delete ──
    const deleteModal      = ref(false)
    const customerToDelete = ref(null)
    function confirmDelete(c) { customerToDelete.value = c; deleteModal.value = true }
    async function removeCustomer() {
      if (!customerToDelete.value) return
      await store.deleteCustomer(customerToDelete.value.id)
      deleteModal.value = false
    }

    onMounted(() => store.fetchCustomers())

    return {
      store, searchQuery, filteredCustomers, setSort, si, fullName,
      openCustomer, firstNameInput,
      modalOpen, editingCustomer, saving, formError, form,
      openAddModal, editCustomer, closeModal, saveCustomer,
      deleteModal, customerToDelete, confirmDelete, removeCustomer
    }
  }
}
</script>

<style scoped>
.num-badge { font-family:monospace; font-size:12px; font-weight:600; color:var(--primary-text); background:var(--primary-light); border-radius:4px; padding:1px 6px; white-space:nowrap; }
.tr-link { cursor:pointer; }
.tr-link:hover td { background:var(--bg-alt); }
.mail-link { color:var(--primary-text); font-size:12.5px; }
.mail-link:hover { text-decoration:underline; }

/* Search box */
.cust-searchbox { display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:6px 12px; flex:1; max-width:480px; }
.cust-search-icon { font-size:14px; opacity:.5; flex-shrink:0; }
.cust-search-inp { flex:1; border:none; background:none; outline:none; font-size:13px; color:var(--text); font-family:inherit; }
.cust-search-inp::placeholder { color:var(--text-muted); }
.cust-search-clear { background:none; border:none; cursor:pointer; font-size:12px; color:var(--text-muted); padding:0 2px; }
.cust-search-clear:hover { color:var(--danger); }

/* Popup overlay */
.cp-overlay { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
.cp-dialog  { background:var(--surface); border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,.22); width:min(580px,96vw); overflow:hidden; display:flex; flex-direction:column; max-height:92vh; }
.cp-dialog-sm { max-width:420px; }

/* Header */
.cp-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:18px 22px 16px; background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%); color:white; flex-shrink:0; }
.cp-head-danger { background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%); }
.cp-head-title { font-size:15px; font-weight:700; }
.cp-head-sub   { font-size:11.5px; opacity:.75; margin-top:3px; }
.cp-x { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:white; width:28px; height:28px; border-radius:50%; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cp-x:hover { background:rgba(255,255,255,.25); }

/* Body */
.cp-body { padding:18px 22px; display:flex; flex-direction:column; gap:12px; overflow-y:auto; }
.cp-fg { display:flex; flex-direction:column; gap:4px; }
.cp-fg label { font-size:10.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.4px; }
.cp-inp { padding:8px 11px; border:1px solid var(--border); border-radius:7px; background:var(--surface); color:var(--text); font-size:13px; font-family:inherit; width:100%; box-sizing:border-box; transition:border-color .12s; }
.cp-inp:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 2.5px rgba(79,70,229,.12); }
.cp-textarea { resize:vertical; min-height:64px; }
.cp-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.cp-row3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
.cp-row4 { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; }
.cp-row-addr { display:grid; grid-template-columns:1fr 70px 90px 1fr; gap:12px; }
.cp-addr-street {} .cp-addr-nr {} .cp-addr-plz {} .cp-addr-city {}
.cp-error { padding:9px 12px; background:var(--danger-bg); border:1px solid var(--danger-border); border-radius:7px; color:var(--danger); font-size:12.5px; }

/* Footer */
.cp-foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 22px; border-top:1px solid var(--border); background:var(--bg-alt); flex-shrink:0; }
</style>
