<template>
  <div>
    <!-- ── Page Header – identisch mit Customers.vue ── -->
    <div class="page-header">
      <div>
        <div class="page-title">Lieferanten</div>
        <div class="page-subtitle">{{ store.suppliers.length }} Lieferanten · Klicken zum Öffnen</div>
      </div>
      <button class="btn btn-primary" @click="openAddModal">+ Lieferant anlegen</button>
    </div>

    <!-- ── Tabelle – identische Card-Struktur wie Customers.vue ── -->
    <div class="table-container">
      <div class="table-toolbar">
        <div class="cust-searchbox">
          <span class="cust-search-icon">🔍</span>
          <input v-model="search" class="cust-search-inp"
            placeholder="Firma, Nummer, Kategorie, Ort …"
            @keydown.escape="search = ''" />
          <button v-if="search" class="cust-search-clear" @click="search = ''">✕</button>
        </div>
        <span class="result-count">{{ filtered.length }} Einträge</span>
      </div>

      <div v-if="store.loading" class="loading-state">Lieferanten werden geladen…</div>
      <div v-else-if="filtered.length === 0" class="empty-state" style="padding:48px 24px">
        <h3>{{ search ? 'Kein Treffer' : 'Noch keine Lieferanten' }}</h3>
        <p>{{ search ? `Kein Ergebnis für „${search}"` : 'Lege deinen ersten Lieferanten an.' }}</p>
        <button v-if="!search" class="btn btn-primary" @click="openAddModal">Ersten Lieferanten anlegen</button>
      </div>

      <table v-else>
        <thead>
          <tr>
            <th class="sortable" @click="setSort('supplierNumber')">Lief.-Nr. {{ si('supplierNumber') }}</th>
            <th class="sortable" @click="setSort('company')">Firma {{ si('company') }}</th>
            <th class="sortable" @click="setSort('contactPerson')">Ansprechpartner {{ si('contactPerson') }}</th>
            <th>Kategorie</th>
            <th class="sortable" @click="setSort('city')">Ort {{ si('city') }}</th>
            <th>E-Mail</th>
            <th>Telefon</th>
            <th style="width:90px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filtered" :key="s.id" class="tr-link" @click="openEdit(s)">
            <td><span class="num-badge">{{ s.supplierNumber || '—' }}</span></td>
            <td class="fw-600">{{ s.company || '—' }}</td>
            <td class="text-muted">{{ s.contactPerson || '—' }}</td>
            <td>
              <span v-if="s.category" class="badge badge-neutral" style="font-size:10px">{{ s.category }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="text-muted">{{ s.zipCode ? s.zipCode + ' ' : '' }}{{ s.city || '—' }}</td>
            <td>
              <a v-if="s.email" :href="`mailto:${s.email}`" @click.stop class="mail-link">{{ s.email }}</a>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="text-muted">{{ s.phone || '—' }}</td>
            <td @click.stop>
              <div class="td-actions">
                <button class="btn btn-ghost btn-sm btn-icon" @click="openEdit(s)" title="Bearbeiten">✏️</button>
                <button class="btn btn-ghost btn-sm btn-icon text-danger" @click="confirmDelete(s)" title="Löschen">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Anlegen / Bearbeiten Modal ── -->
    <Teleport to="body">
      <div v-if="modalOpen" class="cp-overlay" @click.self="closeModal">
        <div class="cp-dialog">

          <!-- Header -->
          <div class="cp-head">
            <div>
              <div class="cp-head-title">
                {{ editing ? '✏️ Lieferant bearbeiten' : '🏭 Neuen Lieferanten anlegen' }}
              </div>
              <div class="cp-head-sub" v-if="editing">
                {{ editing.company }}
                <span v-if="editing.supplierNumber" style="opacity:.6"> · {{ editing.supplierNumber }}</span>
              </div>
              <div class="cp-head-sub" v-else>Kontakt- und Bankdaten eingeben</div>
            </div>
            <button class="cp-x" @click="closeModal">✕</button>
          </div>

          <!-- Body -->
          <div class="cp-body">

            <!-- Zeile 1: Firma · Kategorie -->
            <div class="cp-row2">
              <div class="cp-fg">
                <label>Firma *</label>
                <input ref="companyInput" v-model="form.company" type="text" class="cp-inp" placeholder="Firmenname" />
              </div>
              <div class="cp-fg">
                <label>Kategorie</label>
                <input v-model="form.category" type="text" list="sup-categories"
                  class="cp-inp" placeholder="Kategorie wählen oder eingeben …" autocomplete="off" />
                <datalist id="sup-categories">
                  <option value="Equipment & Kamera">Equipment &amp; Kamera</option>
                  <option value="Licht & Zubehör">Licht &amp; Zubehör</option>
                  <option value="Druckerei & Labor">Druckerei &amp; Labor</option>
                  <option value="Software & Lizenzen">Software &amp; Lizenzen</option>
                  <option value="Strom & Energie">Strom &amp; Energie</option>
                  <option value="Fahrzeug & Transport">Fahrzeug &amp; Transport</option>
                  <option value="Büro & Verbrauch">Büro &amp; Verbrauch</option>
                  <option value="Studio & Location">Studio &amp; Location</option>
                  <option value="Musik & Lizenzen">Musik &amp; Lizenzen</option>
                  <option value="Catering & Verpflegung">Catering &amp; Verpflegung</option>
                  <option value="Marketing & Werbung">Marketing &amp; Werbung</option>
                  <option value="Versicherung">Versicherung</option>
                  <option value="Steuer & Buchhaltung">Steuer &amp; Buchhaltung</option>
                  <option value="Weiterbildung">Weiterbildung</option>
                  <option value="Sonstiges">Sonstiges</option>
                  <option v-for="cat in customCategories" :key="cat" :value="cat">{{ cat }}</option>
                </datalist>
              </div>
            </div>

            <!-- Zeile 2: Ansprechpartner · E-Mail · Telefon -->
            <div class="cp-row3">
              <div class="cp-fg">
                <label>Ansprechpartner</label>
                <input v-model="form.contactPerson" type="text" class="cp-inp" placeholder="Vor- und Nachname" />
              </div>
              <div class="cp-fg">
                <label>E-Mail</label>
                <input v-model="form.email" type="email" class="cp-inp" placeholder="info@firma.de" />
              </div>
              <div class="cp-fg">
                <label>Telefon</label>
                <input v-model="form.phone" type="tel" class="cp-inp" placeholder="+49 30 123456" />
              </div>
            </div>

            <!-- Zeile 3: Straße · PLZ · Stadt -->
            <div class="cp-row-addr">
              <div class="cp-fg cp-addr-street">
                <label>Straße</label>
                <input v-model="form.street" type="text" class="cp-inp" placeholder="Musterstraße" />
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

            <!-- Zeile 4: USt-IdNr. · Steuernummer · Website -->
            <div class="cp-row3">
              <div class="cp-fg">
                <label>USt-IdNr.</label>
                <input v-model="form.vatId" type="text" class="cp-inp" placeholder="DE123456789" />
              </div>
              <div class="cp-fg">
                <label>Steuernummer</label>
                <input v-model="form.taxNumber" type="text" class="cp-inp" />
              </div>
              <div class="cp-fg">
                <label>Website</label>
                <input v-model="form.website" type="text" class="cp-inp" placeholder="www.firma.de" />
              </div>
            </div>

            <!-- Zeile 5: IBAN · BIC · Bank -->
            <div class="cp-row3">
              <div class="cp-fg">
                <label>IBAN</label>
                <input v-model="form.iban" type="text" class="cp-inp" placeholder="DE89 3704 0044 …" />
              </div>
              <div class="cp-fg">
                <label>BIC</label>
                <input v-model="form.bic" type="text" class="cp-inp" />
              </div>
              <div class="cp-fg">
                <label>Bank</label>
                <input v-model="form.bankName" type="text" class="cp-inp" />
              </div>
            </div>

            <!-- Zeile 6: Notizen -->
            <div class="cp-fg">
              <label>Notizen</label>
              <textarea v-model="form.notes" class="cp-inp cp-textarea"
                placeholder="Interne Anmerkungen, Lieferbedingungen …" rows="3"></textarea>
            </div>

            <div v-if="formError" class="cp-error">⚠ {{ formError }}</div>
          </div>

          <!-- Footer -->
          <div class="cp-foot">
            <button class="btn btn-secondary" @click="closeModal">Abbrechen</button>
            <button class="btn btn-primary" @click="save" :disabled="saving">
              {{ saving ? '⏳ Speichern…' : editing ? 'Änderungen speichern' : 'Lieferanten anlegen' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Löschen Bestätigung ── -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="cp-overlay" @click.self="deleteTarget = null">
        <div class="cp-dialog cp-dialog-sm">
          <div class="cp-head cp-head-danger">
            <div>
              <div class="cp-head-title">🗑️ Lieferant löschen</div>
              <div class="cp-head-sub">{{ deleteTarget.company }}</div>
            </div>
            <button class="cp-x" @click="deleteTarget = null">✕</button>
          </div>
          <div class="cp-body">
            <p style="font-size:13.5px">
              Lieferant <strong>{{ deleteTarget.company }}</strong>
              <span v-if="deleteTarget.supplierNumber" class="text-muted"> ({{ deleteTarget.supplierNumber }})</span>
              wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
          <div class="cp-foot">
            <button class="btn btn-secondary" @click="deleteTarget = null">Abbrechen</button>
            <button class="btn btn-danger" @click="removeSupplier">Endgültig löschen</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, nextTick } from 'vue'
import { useStore } from '../stores/useStore'

const EMPTY = () => ({
  company: '', contactPerson: '', category: '', email: '', phone: '',
  street: '', zipCode: '', city: '', country: 'Deutschland',
  vatId: '', taxNumber: '', iban: '', bic: '', bankName: '', website: '', notes: '',
})

export default {
  name: 'Suppliers',
  setup() {
    const store   = useStore()
    const search  = ref('')
    const sortCol = ref('company')
    const sortDir = ref('asc')

    // ── Search & Sort ──
    const filtered = computed(() => {
      const q = search.value.toLowerCase().trim()
      let list = [...store.suppliers]
      if (q) list = list.filter(s =>
        (s.company        || '').toLowerCase().includes(q) ||
        (s.supplierNumber || '').toLowerCase().includes(q) ||
        (s.contactPerson  || '').toLowerCase().includes(q) ||
        (s.city           || '').toLowerCase().includes(q) ||
        (s.category       || '').toLowerCase().includes(q) ||
        (s.email          || '').toLowerCase().includes(q)
      )
      list.sort((a, b) => {
        const av = (a[sortCol.value] || '').toLowerCase()
        const bv = (b[sortCol.value] || '').toLowerCase()
        return sortDir.value === 'asc' ? av.localeCompare(bv, 'de') : bv.localeCompare(av, 'de')
      })
      return list
    })

    function setSort(col) {
      if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
      else { sortCol.value = col; sortDir.value = 'asc' }
    }
    function si(col) {
      return sortCol.value !== col ? '↕' : sortDir.value === 'asc' ? '↑' : '↓'
    }

    // Eigene (nicht vordefinierte) Kategorien aus bestehenden Lieferanten
    const DEFAULT_CATEGORIES = [
      'Equipment & Kamera','Licht & Zubehör','Druckerei & Labor',
      'Software & Lizenzen','Strom & Energie','Fahrzeug & Transport',
      'Büro & Verbrauch','Studio & Location','Musik & Lizenzen',
      'Catering & Verpflegung','Marketing & Werbung','Versicherung',
      'Steuer & Buchhaltung','Weiterbildung','Sonstiges',
    ]
    const customCategories = computed(() => {
      const cats = new Set(store.suppliers.map(s => s.category).filter(Boolean))
      DEFAULT_CATEGORIES.forEach(c => cats.delete(c))
      return [...cats]
    })

    // ── Modal ──
    const modalOpen    = ref(false)
    const editing      = ref(null)
    const form         = ref(EMPTY())
    const formError    = ref('')
    const saving       = ref(false)
    const deleteTarget = ref(null)
    const companyInput = ref(null)

    async function openAddModal() {
      editing.value   = null
      form.value      = EMPTY()
      formError.value = ''
      modalOpen.value = true
      await nextTick()
      companyInput.value?.focus()
    }
    async function openEdit(s) {
      editing.value   = s
      form.value      = { ...s }
      formError.value = ''
      modalOpen.value = true
      await nextTick()
      companyInput.value?.focus()
    }
    function closeModal() { modalOpen.value = false }

    async function save() {
      if (!form.value.company.trim()) {
        formError.value = 'Firma ist ein Pflichtfeld.'
        return
      }
      saving.value    = true
      formError.value = ''
      try {
        if (editing.value)
          await store.updateSupplier(editing.value.id, form.value)
        else
          await store.addSupplier(form.value)
        closeModal()
      } catch(e) {
        const detail = e.response?.data?.error || e.response?.data?.message || e.message
        formError.value = 'Fehler: ' + detail
      } finally {
        saving.value = false
      }
    }

    function confirmDelete(s)  { deleteTarget.value = s }
    async function removeSupplier() {
      await store.deleteSupplier(deleteTarget.value.id)
      deleteTarget.value = null
    }

    return {
      store, search, filtered, sortCol, sortDir, setSort, si, customCategories,
      modalOpen, editing, form, formError, saving, deleteTarget, companyInput,
      openAddModal, openEdit, closeModal, save, confirmDelete, removeSupplier,
    }
  }
}
</script>

<style scoped>
/* ── Tabellen-Badges (wie Customers.vue) ── */
.num-badge  { font-family:monospace; font-size:12px; font-weight:600; color:var(--primary-text); background:var(--primary-light); border-radius:4px; padding:1px 6px; white-space:nowrap; }
.tr-link    { cursor:pointer; }
.tr-link:hover td { background:var(--bg-alt); }
.mail-link  { color:var(--primary-text); font-size:12.5px; }
.mail-link:hover { text-decoration:underline; }
.td-actions { display:flex; gap:4px; }

/* ── Suchfeld (aus global.css übernommen, identisch mit Customers) ── */
.cust-searchbox  { display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:6px 12px; flex:1; max-width:480px; }
.cust-search-icon  { font-size:14px; opacity:.5; flex-shrink:0; }
.cust-search-inp   { flex:1; border:none; background:none; outline:none; font-size:13px; color:var(--text); font-family:inherit; }
.cust-search-inp::placeholder { color:var(--text-muted); }
.cust-search-clear { background:none; border:none; cursor:pointer; font-size:12px; color:var(--text-muted); padding:0 2px; }
.cust-search-clear:hover { color:var(--danger); }

/* ── Modal – exakt wie Customers.vue ── */
.cp-overlay   { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
.cp-dialog    { background:var(--surface); border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,.22); width:min(620px,96vw); overflow:hidden; display:flex; flex-direction:column; max-height:92vh; }
.cp-dialog-sm { max-width:440px; }

/* Header */
.cp-head       { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:18px 22px 16px; background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%); color:white; flex-shrink:0; }
.cp-head-danger { background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%); }
.cp-head-title  { font-size:15px; font-weight:700; }
.cp-head-sub    { font-size:11.5px; opacity:.75; margin-top:3px; }
.cp-x           { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:white; width:28px; height:28px; border-radius:50%; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cp-x:hover     { background:rgba(255,255,255,.25); }

/* Body */
.cp-body { padding:18px 22px; display:flex; flex-direction:column; gap:12px; overflow-y:auto; }
.cp-fg   { display:flex; flex-direction:column; gap:4px; }
.cp-fg label { font-size:10.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.4px; }
.cp-inp  { padding:8px 11px; border:1px solid var(--border); border-radius:7px; background:var(--surface); color:var(--text); font-size:13px; font-family:inherit; width:100%; box-sizing:border-box; transition:border-color .12s; }
.cp-inp:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 2.5px rgba(79,70,229,.12); }
.cp-textarea  { resize:vertical; min-height:64px; }
.cp-row2     { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.cp-row3     { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
.cp-row-addr { display:grid; grid-template-columns:1fr 90px 1fr; gap:12px; }
.cp-error    { padding:9px 12px; background:var(--danger-bg,#fef2f2); border:1px solid var(--danger-border,#fecaca); border-radius:7px; color:var(--danger,#dc2626); font-size:12.5px; }

/* Footer */
.cp-foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 22px; border-top:1px solid var(--border); background:var(--bg-alt); flex-shrink:0; }
</style>
