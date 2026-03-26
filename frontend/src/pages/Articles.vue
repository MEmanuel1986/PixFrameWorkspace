<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Leistungen & Artikel</div>
        <div class="page-subtitle">Leistungskatalog für Angebote und Rechnungen</div>
      </div>
      <button class="btn btn-primary" @click="openAddModal">+ Artikel anlegen</button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <div class="art-searchbox">
          <span class="art-search-icon">🔍</span>
          <input v-model="searchQuery" class="art-search-inp"
            placeholder="Bezeichnung, Nummer, Beschreibung, Kategorie…"
            @keydown.escape="searchQuery = ''" />
          <button v-if="searchQuery" class="art-search-clear" @click="searchQuery = ''">✕</button>
        </div>

        <!-- Kategorie-Filter als Tags -->
        <div class="filter-tags" v-if="categories.length">
          <span class="filter-tag" :class="{ active: filterCategory === '' }" @click="filterCategory = ''">Alle</span>
          <span
            v-for="cat in categories" :key="cat"
            class="filter-tag" :class="{ active: filterCategory === cat }"
            @click="filterCategory = cat"
          >{{ cat }}</span>
        </div>

        <button v-if="searchQuery || filterCategory" class="btn btn-ghost btn-sm" @click="resetFilter">× Zurücksetzen</button>
        <span class="result-count">{{ filteredArticles.length }} Einträge</span>
      </div>

      <div v-if="store.loading" class="loading-state">Artikel werden geladen…</div>
      <div v-else-if="filteredArticles.length === 0" class="empty-state" style="padding:48px 24px">
        <h3>Keine Artikel gefunden</h3>
        <p>{{ searchQuery || filterCategory ? 'Kein Treffer für diese Filter.' : 'Noch keine Artikel angelegt.' }}</p>
        <button v-if="!searchQuery && !filterCategory" class="btn btn-primary" @click="openAddModal">Ersten Artikel anlegen</button>
      </div>

      <table v-else>
        <thead>
          <tr>
            <th class="sortable" @click="setSort('number')">Nr. {{ si('number') }}</th>
            <th class="sortable" @click="setSort('name')">Bezeichnung {{ si('name') }}</th>
            <th>Einheit</th>
            <th class="sortable text-right" @click="setSort('priceNet')">Netto {{ si('priceNet') }}</th>
            <th class="text-right">USt.</th>
            <th class="text-right">Brutto</th>
            <th>Kategorie</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in filteredArticles" :key="a.id" :class="{ 'row-inactive': !a.active }">
            <td>
              <span class="num-badge">{{ a.number || '—' }}</span>
            </td>
            <td>
              <div class="fw-600">{{ a.name }}</div>
              <div v-if="a.description" class="text-muted desc-cell">{{ a.description }}</div>
            </td>
            <td class="text-muted">{{ a.unit }}</td>
            <td class="text-right fw-600" :class="a.priceNet < 0 ? 'text-danger' : 'text-success'">
              {{ formatPrice(a.priceNet) }}
            </td>
            <td class="text-right text-muted">{{ a.taxRate }}%</td>
            <td class="text-right fw-600" :class="grossPrice(a) < 0 ? 'text-danger' : 'text-success'">
              {{ formatPrice(grossPrice(a)) }}
            </td>
            <td>
              <span v-if="a.category" class="badge badge-primary">{{ a.category }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <div class="td-actions">
                <button class="btn btn-ghost btn-sm btn-icon" @click="editArticle(a)" title="Bearbeiten">✏️</button>
                <button class="btn btn-ghost btn-sm btn-icon" @click="duplicateArticle(a)" title="Duplizieren">📋</button>
                <button class="btn btn-ghost btn-sm btn-icon text-danger" @click="confirmDelete(a)" title="Löschen">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Popup: Anlegen / Bearbeiten ── -->
    <Teleport to="body">
      <div v-if="modalOpen" class="ap-overlay" @click.self="closeModal">
        <div class="ap-dialog">
          <div class="ap-head">
            <div>
              <div class="ap-head-title">{{ editingArticle ? "✏️ Artikel bearbeiten" : "📦 Neuen Artikel anlegen" }}</div>
              <div class="ap-head-sub">{{ editingArticle ? editingArticle.name : "Leistung oder Produkt im Katalog anlegen" }}</div>
            </div>
            <button class="ap-x" @click="closeModal">✕</button>
          </div>
          <div class="ap-body">

            <div class="ap-row2-3">
              <div class="ap-fg">
                <label>Nummer <span class="ap-hint">(auto wenn leer)</span></label>
                <input v-model="form.number" type="text" class="ap-inp" placeholder="z.B. ART-00001" />
              </div>
              <div class="ap-fg ap-span2">
                <label>Bezeichnung *</label>
                <input v-model="form.name" type="text" class="ap-inp" placeholder="z.B. Portraitshooting" />
              </div>
            </div>

            <div class="ap-fg">
              <label>Beschreibung <span class="ap-hint">(erscheint auf Dokumenten)</span></label>
              <textarea v-model="form.description" class="ap-inp ap-textarea" rows="3"
                placeholder="z.B. 1 Stunde Fotoshooting inkl. Bildbearbeitung…"></textarea>
            </div>

            <div class="ap-row3">
              <div class="ap-fg">
                <label>Einheit *</label>
                <select v-model="form.unit" class="ap-inp">
                  <option value="Stück">Stück</option>
                  <option value="Stunde">Stunde</option>
                  <option value="Pauschal">Pauschal</option>
                  <option value="Pauschale">Pauschale</option>
                  <option value="Durchfahrt">Durchfahrt</option>
                  <option value="km">km</option>
                  <option value="Tag">Tag</option>
                  <option value="Satz">Satz</option>
                </select>
              </div>
              <div class="ap-fg">
                <label>Kategorie</label>
                <input v-model="form.category" type="text" list="ap-cat-list" class="ap-inp" placeholder="z.B. Fotografie" />
                <datalist id="ap-cat-list">
                  <option v-for="cat in categories" :key="cat" :value="cat" />
                </datalist>
              </div>
              <div class="ap-fg">
                <label>Status</label>
                <select v-model="form.active" class="ap-inp">
                  <option :value="true">✅ Aktiv</option>
                  <option :value="false">⏸ Inaktiv</option>
                </select>
              </div>
            </div>

            <div class="ap-row3">
              <div class="ap-fg">
                <label>Nettopreis (€) *</label>
                <input v-model.number="form.priceNet" type="number" step="0.01" class="ap-inp" placeholder="0.00" />
              </div>
              <div class="ap-fg">
                <label>Umsatzsteuer</label>
                <select v-model.number="form.taxRate" class="ap-inp">
                  <option :value="0">0 %</option>
                  <option :value="7">7 %</option>
                  <option :value="19">19 %</option>
                </select>
              </div>
              <div class="ap-fg">
                <label>Bruttopreis</label>
                <div class="ap-computed">{{ formatPrice(parseFloat(calcGross)) }}</div>
              </div>
            </div>

            <div v-if="formError" class="ap-error">⚠ {{ formError }}</div>
          </div>
          <div class="ap-foot">
            <button class="btn btn-secondary" @click="closeModal">Abbrechen</button>
            <button class="btn btn-primary" :disabled="saving" @click="saveArticle">
              {{ saving ? "⏳ Speichern…" : (editingArticle ? "Änderungen speichern" : "Artikel anlegen") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Löschen bestätigen ── -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="ap-overlay" @click.self="deleteTarget = null">
        <div class="ap-dialog ap-dialog-sm">
          <div class="ap-head ap-head-danger">
            <div class="ap-head-title">🗑 Artikel löschen</div>
            <button class="ap-x" @click="deleteTarget = null">✕</button>
          </div>
          <div class="ap-body">
            <p>Soll <strong>{{ deleteTarget.name }}</strong> wirklich gelöscht werden?</p>
            <p class="text-muted" style="font-size:12.5px;margin-top:6px">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
          </div>
          <div class="ap-foot">
            <button class="btn btn-secondary" @click="deleteTarget = null">Abbrechen</button>
            <button class="btn btn-danger" @click="doDelete">Endgültig löschen</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '../stores/useStore'

export default {
  name: 'Articles',
  setup() {
    const store = useStore()

    const searchQuery    = ref('')
    const filterCategory = ref('')
    const sortKey        = ref('number')
    const sortDir        = ref('asc')

    const modalOpen      = ref(false)
    const editingArticle = ref(null)
    const deleteTarget   = ref(null)
    const saving         = ref(false)
    const formError      = ref('')

    const emptyForm = () => ({
      number: '', name: '', description: '',
      unit: 'Stück', category: '', active: true,
      priceNet: 0, taxRate: 0,
    })
    const form = ref(emptyForm())

    onMounted(() => store.fetchArticles())

    const categories = computed(() => {
      const set = new Set(store.articles.map(a => a.category).filter(Boolean))
      return [...set].sort()
    })

    const filteredArticles = computed(() => {
      let list = store.articles
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        list = list.filter(a =>
          (a.name        || '').toLowerCase().includes(q) ||
          (a.number      || '').toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q)
        )
      }
      if (filterCategory.value) {
        list = list.filter(a => a.category === filterCategory.value)
      }
      return [...list].sort((a, b) => {
        let va = a[sortKey.value] ?? ''
        let vb = b[sortKey.value] ?? ''
        if (typeof va === 'string') va = va.toLowerCase()
        if (typeof vb === 'string') vb = vb.toLowerCase()
        if (va < vb) return sortDir.value === 'asc' ? -1 : 1
        if (va > vb) return sortDir.value === 'asc' ? 1 : -1
        return 0
      })
    })

    function setSort(key) {
      if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
      else { sortKey.value = key; sortDir.value = 'asc' }
    }
    function si(key) { return sortKey.value === key ? (sortDir.value === 'asc' ? '↑' : '↓') : '' }

    function resetFilter() { searchQuery.value = ''; filterCategory.value = '' }

    function formatPrice(v) {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v ?? 0)
    }
    function grossPrice(a) { return Number(a.priceNet) * (1 + Number(a.taxRate) / 100) }

    const calcGross = computed(() =>
      (Number(form.value.priceNet) * (1 + Number(form.value.taxRate) / 100)).toFixed(2)
    )

    function openAddModal() {
      editingArticle.value = null
      form.value = emptyForm()
      formError.value = ''
      modalOpen.value = true
    }
    function editArticle(a) {
      editingArticle.value = a
      form.value = { ...a }
      formError.value = ''
      modalOpen.value = true
    }
    function duplicateArticle(a) {
      editingArticle.value = null
      form.value = { ...a, id: undefined, number: '', name: a.name + ' (Kopie)' }
      formError.value = ''
      modalOpen.value = true
    }
    function closeModal() { modalOpen.value = false; editingArticle.value = null }

    async function saveArticle() {
      formError.value = ''
      if (!form.value.name?.trim())  { formError.value = 'Bezeichnung ist erforderlich.'; return }
      if (!form.value.unit?.trim())  { formError.value = 'Einheit ist erforderlich.'; return }
      saving.value = true
      try {
        if (editingArticle.value) await store.updateArticle(editingArticle.value.id, form.value)
        else                      await store.addArticle(form.value)
        closeModal()
      } catch (e) {
        formError.value = e?.response?.data?.error || e.message || 'Fehler beim Speichern'
      } finally { saving.value = false }
    }

    function confirmDelete(a) { deleteTarget.value = a }
    async function doDelete() {
      if (!deleteTarget.value) return
      await store.deleteArticle(deleteTarget.value.id)
      deleteTarget.value = null
    }

    return {
      store, searchQuery, filterCategory, categories,
      filteredArticles, setSort, si, resetFilter,
      formatPrice, grossPrice, calcGross,
      modalOpen, editingArticle, form, formError, saving,
      openAddModal, editArticle, duplicateArticle, closeModal, saveArticle,
      deleteTarget, confirmDelete, doDelete,
    }
  }
}
</script>

<style scoped>
/* Search */
.art-searchbox { display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 12px;flex:1;max-width:480px; }
.art-search-icon { font-size:14px;opacity:.5;flex-shrink:0; }
.art-search-inp { flex:1;border:none;background:none;outline:none;font-size:13px;color:var(--text);font-family:inherit; }
.art-search-inp::placeholder { color:var(--text-muted); }
.art-search-clear { background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-muted);padding:0 2px; }
.art-search-clear:hover { color:var(--danger); }
/* Popup */
.ap-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px; }
.ap-dialog  { background:var(--surface);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.22);width:min(560px,96vw);overflow:hidden;display:flex;flex-direction:column;max-height:92vh; }
.ap-dialog-sm { max-width:420px; }
.ap-head { display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 22px 16px;background:linear-gradient(135deg,#059669 0%,#047857 100%);color:white;flex-shrink:0; }
.ap-head-danger { background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%); }
.ap-head-title { font-size:15px;font-weight:700; }
.ap-head-sub   { font-size:11.5px;opacity:.75;margin-top:3px; }
.ap-x { background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.ap-x:hover { background:rgba(255,255,255,.25); }
.ap-body { padding:18px 22px;display:flex;flex-direction:column;gap:12px;overflow-y:auto; }
.ap-fg { display:flex;flex-direction:column;gap:4px; }
.ap-fg label { font-size:10.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px; }
.ap-inp { padding:8px 11px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:13px;font-family:inherit;width:100%;box-sizing:border-box;transition:border-color .12s; }
.ap-inp:focus { outline:none;border-color:#059669;box-shadow:0 0 0 2.5px rgba(5,150,105,.12); }
.ap-textarea { resize:vertical;min-height:70px; }
.ap-row2-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px; }
.ap-row3   { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px; }
.ap-span2  { grid-column:span 2; }
.ap-hint   { font-size:10px;color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0; }
.ap-computed { padding:8px 11px;background:var(--bg-alt);border:1px dashed var(--border);border-radius:7px;font-size:13px;font-weight:700;color:#059669; }
.ap-error  { padding:9px 12px;background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:7px;color:var(--danger);font-size:12.5px; }
.ap-foot   { display:flex;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid var(--border);background:var(--bg-alt);flex-shrink:0; }
<style scoped>
.row-inactive { opacity: 0.42; }
.desc-cell    { font-size: 11.5px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.num-badge    { font-family: 'Consolas', monospace; font-size: 12px; font-weight: 600; color: var(--primary-text); background: var(--primary-light); border-radius: 4px; padding: 1px 6px; letter-spacing: .3px; }
.label-hint   { font-size: 11px; color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0; }
.text-right   { text-align: right; }
</style>
