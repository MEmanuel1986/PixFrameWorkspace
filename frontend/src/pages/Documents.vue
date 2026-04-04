<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Dokumente</div>
        <div class="page-subtitle">Angebote, Rechnungen, Verträge und Dateien</div>
      </div>
      <button class="btn btn-primary" @click="openUploadModal">+ Dokument hochladen</button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <SearchBar v-model="searchQuery" placeholder="Dokument, Nummer, Kunde…" />
        <div class="filter-tags">
          <span v-for="f in typeFilters" :key="f.value"
            class="filter-tag" :class="{ active: activeFilter === f.value }"
            @click="activeFilter = f.value">{{ f.label }}</span>
        </div>
        <button v-if="searchQuery || activeFilter" class="btn btn-ghost btn-sm"
          @click="searchQuery=''; activeFilter=''">× Reset</button>
        <span class="result-count">{{ filtered.length }} Einträge</span>
      </div>

      <div v-if="store.loading" class="loading-state">⏳ Lädt…</div>

      <div v-else-if="!filtered.length" class="empty-state" style="padding:48px 24px">
        <h3>Keine Dokumente gefunden</h3>
        <p>{{ searchQuery || activeFilter ? 'Kein Treffer für diese Filter.' : 'Noch keine Dokumente vorhanden.' }}</p>
        <button v-if="!searchQuery && !activeFilter" class="btn btn-primary" @click="openUploadModal">Erstes Dokument anlegen</button>
      </div>

      <table v-else>
        <thead>
          <tr>
            <th style="width:120px">Nummer</th>
            <th>Name</th>
            <th style="width:110px">Typ</th>
            <th>Kunde</th>
            <th style="width:100px">Datum</th>
            <th style="width:100px">Fällig/Gültig</th>
            <th style="width:90px" class="text-right">Betrag</th>
            <th style="width:100px">Status</th>
            <th style="width:100px">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in filtered" :key="doc.id"
            class="doc-row"
            :class="{ 'row-superseded': !!doc.supersededBy, 'row-cancelled': doc.status==='Storniert' }"
            @click="openDocPdf(doc)">
            <td>
              <code class="num-badge" v-if="doc.documentNumber">{{ doc.documentNumber }}</code>
              <span v-else class="text-muted" style="font-size:11px">—</span>
            </td>
            <td>
              <div class="fw-600">{{ doc.name }}</div>
              <div v-if="doc.notes" class="text-muted" style="font-size:11.5px">{{ doc.notes }}</div>
              <!-- Sub-type chips -->
              <div style="display:flex;gap:4px;margin-top:2px">
                <span v-if="doc.docSubtype==='correction'"  class="badge badge-warning" style="font-size:10px">Korrektur</span>
                <span v-if="doc.docSubtype==='cancellation'" class="badge badge-danger"  style="font-size:10px">Storno</span>
                <span v-if="doc.quoteId"    class="badge badge-neutral" style="font-size:10px">aus Angebot</span>
                <span v-if="doc.supersededBy" class="badge badge-neutral" style="font-size:10px;opacity:.6">ersetzt</span>
                <span v-if="(doc.version||1) > 1" class="badge badge-neutral" style="font-size:10px">v{{ doc.version }}</span>
              </div>
            </td>
            <td>
              <span class="badge"
                :class="doc.docSubtype==='cancellation' ? 'badge-danger'
                      : doc.docSubtype==='correction'   ? 'badge-warning'
                      : typeBadge(doc.type)">
                {{ doc.docSubtype==='cancellation' ? 'Storno'
                 : doc.docSubtype==='correction'   ? 'Korrektur'
                 : typeLabel(doc.type) }}
              </span>
            </td>
            <td class="text-muted">{{ customerName(doc.customerId) }}</td>
            <td class="text-muted">{{ fmtDate(doc.issueDate || doc.uploadedAt || doc.createdAt) }}</td>
            <td>
              <span v-if="doc.dueDate && doc.type==='invoice'"
                :class="isOverdue(doc) ? 'text-danger fw-600' : 'text-muted'">
                {{ fmtDate(doc.dueDate) }}
              </span>
              <span v-else-if="doc.expiresAt"
                :class="isExpired(doc.expiresAt) ? 'text-danger' : 'text-muted'">
                {{ fmtDate(doc.expiresAt) }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="text-right fw-600"
              :class="doc.total < 0 ? 'text-danger' : doc.total > 0 ? '' : 'text-muted'">
              {{ doc.total != null && (doc.type==='quote'||doc.type==='invoice')
                  ? fmtPrice(doc.total) : '—' }}
            </td>
            <td><span class="badge" :class="statusBadge(doc.status)">{{ doc.status || '—' }}</span></td>
            <td @click.stop>
              <div class="td-actions">
                <!-- 🔍 Anzeigen im neuen Tab -->
                <button v-if="doc.type==='invoice'||doc.type==='quote'"
                  class="btn btn-ghost btn-sm btn-icon" @click="openDocPdf(doc)" title="Anzeigen (neuer Tab)">🔍</button>
                <button v-else-if="doc.filePath"
                  class="btn btn-ghost btn-sm btn-icon" @click="download(doc)" title="Datei öffnen">🔍</button>
                <!-- 📥 Drucken / Als PDF speichern (ein Button) -->
                <button v-if="doc.type==='invoice'||doc.type==='quote'"
                  class="btn btn-ghost btn-sm btn-icon" @click="printDoc(doc)"
                  title="Drucken / Als PDF speichern">📥</button>
                <button v-else-if="doc.filePath"
                  class="btn btn-ghost btn-sm btn-icon" @click="download(doc)" title="Herunterladen">📥</button>
                <!-- 📄 E-Rechnung ZUGFeRD -->
                <button v-if="doc.type==='invoice'"
                  class="btn btn-ghost btn-sm btn-icon" @click="downloadZugferdDoc(doc)"
                  title="E-Rechnung (ZUGFeRD XML) herunterladen">📄</button>
                <!-- 📁 Ordner öffnen (nur wenn Auftragsbezug) -->
                <button v-if="doc.projectId"
                  class="btn btn-ghost btn-sm btn-icon" @click="openDocFolder(doc)"
                  title="Dokumenten-Ordner öffnen">📁</button>
                <button class="btn btn-ghost btn-sm btn-icon text-danger" @click="confirmDeleteDoc(doc)" title="Löschen">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Upload Modal (simple docs) -->
    <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal=false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>Dokument hochladen</h2>
          <button class="btn btn-ghost btn-sm btn-icon" @click="showUploadModal=false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name *</label>
            <input v-model="uForm.name" type="text" placeholder="z.B. Vertrag Hochzeit Müller" autofocus />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Typ *</label>
              <select v-model="uForm.type">
                <option value="">— Bitte wählen —</option>
                <option v-for="t in uploadTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Kunde *</label>
              <select v-model="uForm.customerId">
                <option value="">— Bitte wählen —</option>
                <option v-for="c in store.customers" :key="c.id" :value="c.id">{{ fullName(c) }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Auftrag <span style="font-weight:400;color:var(--text-muted);font-size:11px">(optional)</span></label>
            <select v-model="uForm.projectId">
              <option value="">— Kein Auftrag —</option>
              <option v-for="p in projectsForCustomer" :key="p.id" :value="p.id">{{ p.projectName }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Ablaufdatum <span style="font-weight:400;color:var(--text-muted);font-size:11px">(optional)</span></label>
              <input v-model="uForm.expiresAt" type="date" />
            </div>
            <div class="form-group">
              <label>Datei hochladen</label>
              <input type="file" @change="onFile" accept=".pdf,.doc,.docx,.jpg,.png" />
            </div>
          </div>
          <div class="form-group">
            <label>Notizen</label>
            <textarea v-model="uForm.notes" placeholder="Interne Anmerkungen…"></textarea>
          </div>
          <div v-if="uError" class="form-error">{{ uError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showUploadModal=false">Abbrechen</button>
          <button class="btn btn-primary" :disabled="uSaving" @click="saveUpload">
            {{ uSaving ? 'Lädt hoch…' : 'Hochladen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="delDoc" class="modal-overlay" @click.self="delDoc=null">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>Dokument löschen</h2>
          <button class="btn btn-ghost btn-sm btn-icon" @click="delDoc=null">✕</button>
        </div>
        <div class="modal-body">
          <p>Dokument <strong>{{ delDoc.name }}</strong> wirklich löschen?</p>
          <p class="text-muted" style="font-size:12.5px;margin-top:6px">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="delDoc=null">Abbrechen</button>
          <button class="btn btn-danger" @click="deleteDoc">Löschen</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import apiClient, { API_BASE } from '../services/api'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { generateZugferdXml, downloadZugferdXml } from '../services/zugferd.js'
import SearchBar          from '../components/SearchBar.vue'
import { useStore }       from '../stores/useStore'

export default {
  name: 'Documents',
  components: { SearchBar },
  setup() {
    const store = useStore()
    const route  = useRoute()
    const router = useRouter()

    const searchQuery  = ref('')
    const activeFilter = ref('')

    const typeFilters = [
      { value:'',          label:'Alle' },
      { value:'quote',     label:'Angebote' },
      { value:'invoice',   label:'Rechnungen' },
      { value:'contract',  label:'Verträge' },
      { value:'mood',      label:'Moodboards' },
      { value:'reference', label:'Referenzen' },
      { value:'other',     label:'Sonstiges' },
    ]
    const uploadTypes = typeFilters.slice(1)

    const filtered = computed(() => {
      let list = store.documents
      if (activeFilter.value) list = list.filter(d => d.type === activeFilter.value)
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase()
        list = list.filter(d =>
          (d.name           || '').toLowerCase().includes(q) ||
          (d.documentNumber || '').toLowerCase().includes(q) ||
          (d.notes          || '').toLowerCase().includes(q) ||
          customerName(d.customerId).toLowerCase().includes(q)
        )
      }
      // Sort: newest first
      return [...list].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
    })

    function fullName(c) {
      return `${c.firstName||''} ${c.lastName||''}`.trim() || c.company || '—'
    }
    function customerName(id) {
      const c = store.customers.find(c => c.id === id)
      return c ? fullName(c) : '—'
    }
    function typeLabel(t) {
      return { contract:'Vertrag', invoice:'Rechnung', quote:'Angebot', mood:'Moodboard', reference:'Referenz', other:'Sonstiges' }[t] || t
    }
    function typeBadge(t) {
      return { contract:'badge-info', invoice:'badge-success', quote:'badge-warning', mood:'badge-primary', reference:'badge-neutral', other:'badge-neutral' }[t] || 'badge-neutral'
    }
    const STATUS_CLASS = {
      'Entwurf':'badge-neutral','Versendet':'badge-info','Angenommen':'badge-success',
      'Bezahlt':'badge-success','Abgelehnt':'badge-danger','Ersetzt':'badge-neutral',
      'Überfällig':'badge-danger','Storniert':'badge-danger',
    }
    function statusBadge(s) { return STATUS_CLASS[s] || 'badge-neutral' }
    function fmtDate(d) {
      return d ? new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'
    }
    function fmtPrice(n) {
      return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n ?? 0)
    }
    function isOverdue(doc) {
      return doc.dueDate && new Date(doc.dueDate) < new Date() && !['Bezahlt','Storniert'].includes(doc.status)
    }
    function isExpired(d) { return d && new Date(d) < new Date() }
    function download(doc) {
      if (doc.filePath) window.open(`${API_BASE}/${doc.filePath}`, '_blank')
    }

    // 🔍 Anzeigen — öffnet reines A4-PDF im neuen Tab (Toolbar entfernt)
    function openDocPdf(doc) {
      const url = router.resolve({ name: 'DocumentPrint', params: { id: doc.id } }).href
      window.open(url, '_blank')
    }

    // 📥 Drucken — neuer Tab öffnet sich + Browser-Druckdialog startet automatisch
    function printDoc(doc) {
      const url = router.resolve({ name: 'DocumentPrint', params: { id: doc.id }, query: { action: 'print' } }).href
      window.open(url, '_blank')
    }

    // 📁 Ordner öffnen — öffnet den Projektordner/dokumente/ im Explorer
    function openDocFolder(doc) {
      if (!window.pixframe?.openFolder || !doc.projectId) return
      const project = store.projects.find(p => p.id === doc.projectId)
      if (!project?.projectFolderPath) return
      fetch(`${API_BASE}/api/workspace/info`)
        .then(r => r.json())
        .then(json => {
          const wsPath = json.data?.path
          if (!wsPath) return
          const fullPath = wsPath + '/' + project.projectFolderPath + '/dokumente'
          window.pixframe.openFolder(fullPath.replace(/\//g, '\\'))
        })
        .catch(e => console.warn('Ordner öffnen fehlgeschlagen:', e))
    }

    // 📄 E-Rechnung ZUGFeRD — direkt aus Store generieren, kein neuer Tab nötig
    async function downloadZugferdDoc(doc) {
      try {
        // Lade Dokument-Details, Kunde und Settings direkt
        const [docRes, settingsRes] = await Promise.all([
          apiClient.get(`/documents/${doc.id}`),
          apiClient.get('/settings'),
        ])
        const fullDoc  = docRes.data?.data ?? docRes.data
        const settings = settingsRes.data?.data ?? settingsRes.data
        const custRes  = fullDoc.customerId
          ? await apiClient.get(`/customers/${fullDoc.customerId}`)
          : null
        const customer = custRes?.data?.data ?? custRes?.data ?? null
        const projRes  = fullDoc.projectId
          ? await apiClient.get(`/projects/${fullDoc.projectId}`)
          : null
        const project  = projRes?.data?.data ?? projRes?.data ?? null
        const xml = generateZugferdXml(fullDoc, customer, settings, project)
        downloadZugferdXml(xml, fullDoc.documentNumber || doc.documentNumber)
      } catch(e) {
        console.error('ZUGFeRD Fehler:', e)
      }
    }

    // ── Detail Modal ────────────────────────────────────────────────────
    const detailProject = computed(() => {
      const doc = currentDetailDoc.value
      return doc?.projectId ? store.projects.find(p => p.id === doc.projectId) || null : null
    })
    const detailCustomer = computed(() => {
      const doc = currentDetailDoc.value
      return doc?.customerId ? store.customers.find(c => c.id === doc.customerId) || null : null
    })



    // ── Upload Modal ────────────────────────────────────────────────────
    const showUploadModal = ref(false)
    const uSaving = ref(false)
    const uError  = ref('')
    const selFile = ref(null)
    const uForm   = ref({ name:'', type:'', customerId:'', projectId:'', expiresAt:'', notes:'' })

    const projectsForCustomer = computed(() =>
      uForm.value.customerId
        ? store.projects.filter(p => p.customerId === uForm.value.customerId)
        : []
    )

    function openUploadModal() {
      uForm.value = { name:'', type:'', customerId:'', projectId:'', expiresAt:'', notes:'' }
      uError.value = ''; selFile.value = null; showUploadModal.value = true
    }
    function onFile(e) { selFile.value = e.target.files[0] || null }

    async function saveUpload() {
      uError.value = ''
      if (!uForm.value.name.trim())  { uError.value = 'Name ist erforderlich.'; return }
      if (!uForm.value.type)         { uError.value = 'Typ ist erforderlich.'; return }
      if (!uForm.value.customerId)   { uError.value = 'Kunde ist erforderlich.'; return }
      uSaving.value = true
      try {
        await store.addDocument(uForm.value, selFile.value)
        showUploadModal.value = false
        await store.fetchDocuments()
      } catch (e) { uError.value = 'Fehler: ' + (e.message || 'Unbekannt') }
      finally { uSaving.value = false }
    }

    // ── Delete ──────────────────────────────────────────────────────────
    const delDoc = ref(null)
    function confirmDeleteDoc(doc) { delDoc.value = doc }
    async function deleteDoc() {
      if (!delDoc.value) return
      await store.deleteDocument(delDoc.value.id)
      delDoc.value = null
    }

    onMounted(() => {
      store.fetchDocuments()
      store.fetchCustomers()
      store.fetchProjects()
      // ?type=quote / ?type=invoice aus URL übernehmen
      if (route.query.type) activeFilter.value = route.query.type
    })

    // Wenn User über Hamburger-Menü zwischen Angeboten/Rechnungen wechselt
    watch(() => route.query.type, (val) => {
      activeFilter.value = val || ''
    })

    return {
      store, searchQuery, activeFilter, typeFilters, uploadTypes, filtered,
      fullName, customerName, typeLabel, typeBadge, statusBadge,
      fmtDate, fmtPrice, isOverdue, isExpired, download,
      openDocPdf, printDoc, openDocFolder, downloadZugferdDoc,
      showUploadModal, uSaving, uError, uForm, selFile, projectsForCustomer,
      openUploadModal, onFile, saveUpload,
      delDoc, confirmDeleteDoc, deleteDoc,
    }
  }
}
</script>

<style scoped>
.doc-row { cursor: pointer; transition: background .12s; }
.doc-row:hover { background: var(--primary-light); }
.row-superseded td { opacity: .55; }
.row-cancelled  td { opacity: .45; text-decoration: line-through; }
.row-cancelled .badge, .row-superseded .badge, .row-cancelled .num-badge { text-decoration: none; }
.num-badge {
  font-family: monospace; font-size: 11.5px; font-weight: 700;
  color: var(--primary-text); background: var(--primary-light);
  border-radius: 4px; padding: 2px 6px;
}
</style>
