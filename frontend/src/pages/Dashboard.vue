<template>
  <div class="dash">

    <!-- ── Greeting header ── -->
    <div class="dash-header">
      <div class="dash-greeting">
        <div class="greeting-text">{{ greeting }}</div>
        <div class="greeting-date">{{ todayFormatted }}</div>
      </div>
      <div class="dash-header-actions">
        <span class="app-version-badge">v1.0.0-beta.2</span>
        <button class="btn btn-primary" @click="openNewProject">
          <span style="font-size:16px;font-weight:300">+</span> Neue Anfrage
        </button>
      </div>
    </div>

    <!-- ── Umsatz-Chart (letzten 6 Monate) — VOR den KPIs ── -->
    <div class="revenue-chart-card" v-if="revenueChartData.length">
      <div class="rcc-header">
        <div class="rcc-title">📈 Umsatz letzte 6 Monate</div>
        <div class="rcc-total">{{ formatCurrency(revenueChartData.reduce((s,m) => s + m.amount, 0)) }} gesamt</div>
      </div>
      <div class="rcc-bars">
        <div v-for="m in revenueChartData" :key="m.label" class="rcc-bar-col">
          <div class="rcc-bar-wrap">
            <div class="rcc-bar-val" v-if="m.amount > 0">{{ formatCurrencyShort(m.amount) }}</div>
            <div class="rcc-bar-val rcc-bar-val--zero" v-else>—</div>
            <div
              class="rcc-bar"
              :style="{ height: m.heightPct + '%', background: m.barColor }"
              :title="m.label + ': ' + formatCurrency(m.amount)"
            ></div>
          </div>
          <div class="rcc-bar-lbl" :class="{ 'rcc-lbl-current': m.isCurrent }">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <!-- ── KPI strip ── -->
    <div class="kpi-strip">
      <div class="kpi-tile kpi-blue" @click="goFilter(null)">
        <div class="kpi-num">{{ store.projects.length }}</div>
        <div class="kpi-lbl">Aufträge gesamt</div>
      </div>
      <div class="kpi-tile kpi-amber" @click="goFilter('Anfrage')">
        <div class="kpi-num">{{ anfragenCount }}</div>
        <div class="kpi-lbl">Anfragen</div>
      </div>
      <div class="kpi-tile kpi-green" @click="goFilter('Aktiv')">
        <div class="kpi-num">{{ aktivCount }}</div>
        <div class="kpi-lbl">Aktive Aufträge</div>
      </div>
      <div class="kpi-tile kpi-violet" @click="goFilter('Abgeliefert')">
        <div class="kpi-num">{{ abgeliefertCount }}</div>
        <div class="kpi-lbl">Abgeliefert</div>
      </div>
      <div class="kpi-tile kpi-orange" @click="router.push('/documents?type=invoice&status=Offen')">
        <div class="kpi-num">{{ openInvoiceCount }}</div>
        <div class="kpi-lbl">Offene Rechnungen</div>
      </div>
      <div class="kpi-tile kpi-emerald">
        <div class="kpi-num">{{ formatCurrencyShort(paidThisMonth) }}</div>
        <div class="kpi-lbl">Bezahlt diesen Monat</div>
      </div>
    </div>

    <!-- ── Main content grid ── -->
    <div class="dash-grid">

      <!-- ── Left: Workflow stream ── -->
      <div class="stream-col">
        <!-- Filter bar -->
        <div class="stream-toolbar">
          <div class="stream-title">Laufende Aufträge</div>
          <div class="stream-filters">
            <button
              v-for="f in streamFilters" :key="f.value"
              class="sf-btn" :class="{ active: streamFilter === f.value }"
              @click="streamFilter = f.value">
              {{ f.label }}
              <span v-if="f.count > 0" class="sf-count">{{ f.count }}</span>
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="!initialized || store.loading" class="stream-empty">
          <div class="loading-spinner"></div>
          <span>Lädt...</span>
        </div>

        <!-- Empty -->
        <div v-else-if="initialized && filteredStream.length === 0" class="stream-empty">
          <div class="stream-empty-icon">📭</div>
          <div class="stream-empty-title">Keine Aufträge in dieser Ansicht</div>
          <p>{{ streamFilter === 'all' ? 'Noch keine Aufträge angelegt.' : 'Kein Auftrag mit diesem Status.' }}</p>
          <button class="btn btn-primary btn-sm" @click="openNewProject">Erste Anfrage anlegen</button>
        </div>

        <!-- Cards -->
        <div v-else-if="initialized" class="stream-list">
          <div
            v-for="p in filteredStream" :key="p.id"
            class="proj-card"
            :style="`--cat-color: ${catColor(p.category)}`"
            @click="router.push(`/projects/${p.id}`)">

            <!-- Category accent line -->
            <div class="proj-card-accent"></div>

            <div class="proj-card-body">
              <!-- Top row -->
              <div class="proj-card-top">
                <div class="proj-card-info">
                  <div class="proj-card-name">{{ p.projectName || p.contractData?.occasion || '—' }}</div>
                  <div class="proj-card-meta">
                    <span class="proj-customer">{{ customerName(p.customerId) }}</span>
                    <span class="proj-dot">·</span>
                    <span class="proj-cat">{{ p.category }}</span>
                    <span v-if="p.booking" class="proj-dot">·</span>
                    <span v-if="p.booking" class="proj-date">{{ formatDateShort(p.booking) }}</span>
                  </div>
                </div>
                <div class="proj-card-right">
                  <span class="badge" :class="statusBadgeClass(p.status)">{{ p.status }}</span>
                  <div v-if="p.budget?.estimatedAmount" class="proj-budget">
                    {{ formatCurrency(p.budget.estimatedAmount) }}
                  </div>
                </div>
              </div>

              <!-- Services chips -->
              <div class="proj-svc">
                <span v-if="p.fotografie"  class="svc-chip">📷 Foto</span>
                <span v-if="p.videografie" class="svc-chip">🎬 Video</span>
                <span v-if="p.glueckwunschkarten" class="svc-chip">💌 Karten</span>
                <span v-if="p.gettingReady||p.gettingReadyEr||p.gettingReadySie||p.gettingReadyBeide" class="svc-chip">💄 Getting Ready</span>
                <span v-if="p.location" class="svc-chip svc-chip-loc">📍 {{ p.location }}</span>
              </div>

              <!-- Pipeline progress -->
              <div class="proj-pipeline">
                <div
                  v-for="(step, i) in pipelineSteps" :key="step.key"
                  class="pipe-step"
                  :class="{
                    'pipe-done':    isPipeDone(p, i),
                    'pipe-current': isPipeCurrent(p, i),
                    'pipe-future':  isPipeFuture(p, i),
                  }"
                  :title="step.label">
                  <div class="pipe-dot"></div>
                  <div class="pipe-label">{{ step.short }}</div>
                </div>
                <div class="pipe-line"></div>
              </div>

              <!-- Bottom row: docs + deadline -->
              <div class="proj-card-footer">
                <div class="proj-docs">
                  <span v-if="projectDocCounts(p.id).quotes"  class="doc-chip doc-chip-quote">{{ projectDocCounts(p.id).quotes }} Angebot{{ projectDocCounts(p.id).quotes > 1 ? 'e' : '' }}</span>
                  <span v-if="projectDocCounts(p.id).invoices" class="doc-chip doc-chip-invoice">{{ projectDocCounts(p.id).invoices }} Rechnung{{ projectDocCounts(p.id).invoices > 1 ? 'en' : '' }}</span>
                  <span v-if="projectDocCounts(p.id).paid"     class="doc-chip doc-chip-paid">✓ Bezahlt</span>
                  <span v-if="!projectDocCounts(p.id).quotes && !projectDocCounts(p.id).invoices" class="doc-chip doc-chip-none">Noch kein Dokument</span>
                </div>
                <div v-if="p.deliveryDate" class="proj-delivery" :class="{ overdue: isOverdue(p.deliveryDate) }">
                  <span>📦</span> {{ isOverdue(p.deliveryDate) ? 'Überfällig' : 'Lieferung' }} {{ formatDateShort(p.deliveryDate) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Right panel ── -->
      <div class="panel-col">

        <!-- Open invoices -->
        <div class="side-card">
          <div class="side-card-head">
            <span class="side-card-title">🧾 Offene Rechnungen</span>
            <button class="side-card-link" @click="router.push('/documents?type=invoice')">Alle →</button>
          </div>
          <div v-if="openInvoices.length === 0" class="side-empty">Keine offenen Rechnungen 🎉</div>
          <div v-else class="inv-list">
            <div v-for="d in openInvoices.slice(0, 5)" :key="d.id" class="inv-row">
              <div class="inv-info">
                <div class="inv-num">{{ d.documentNumber || d.name }}</div>
                <div class="inv-customer">{{ customerByProject(d.projectId) }}</div>
              </div>
              <div class="inv-right">
                <div class="inv-amount">{{ formatCurrency(d.total || d.subtotal || 0) }}</div>
                <div class="inv-due" :class="{ overdue: isOverdue(d.dueDate) }">
                  {{ d.dueDate ? formatDateShort(d.dueDate) : '—' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Upcoming deadlines -->
        <div class="side-card">
          <div class="side-card-head">
            <span class="side-card-title">📅 Nächste Termine</span>
            <button class="side-card-link" @click="router.push('/projects')">Alle →</button>
          </div>
          <div v-if="upcomingBookings.length === 0" class="side-empty">Keine anstehenden Termine</div>
          <div v-else class="upcoming-list">
            <div v-for="p in upcomingBookings" :key="p.id" class="upcoming-row" @click="router.push(`/projects/${p.id}`)">
              <div class="upcoming-date-col">
                <div class="upcoming-day">{{ upcomingDay(p.booking) }}</div>
                <div class="upcoming-month">{{ upcomingMonth(p.booking) }}</div>
              </div>
              <div class="upcoming-info">
                <div class="upcoming-name">{{ p.projectName }}</div>
                <div class="upcoming-meta">
                  {{ customerName(p.customerId) }}
                  <span v-if="p.bookingTime"> · {{ p.bookingTime }} Uhr</span>
                  <span v-if="p.location"> · {{ p.location }}</span>
                </div>
              </div>
              <div :style="`width:8px;border-radius:99px;align-self:stretch;background:${catColor(p.category)};flex-shrink:0`"></div>
            </div>
          </div>
        </div>

        <!-- Recent activity / quick stats -->
        <div class="side-card">
          <div class="side-card-head">
            <span class="side-card-title">📊 Aufträge nach Status</span>
          </div>
          <div class="status-bars">
            <div v-for="s in statusBars" :key="s.label" class="status-bar-row">
              <div class="status-bar-label">{{ s.label }}</div>
              <div class="status-bar-track">
                <div class="status-bar-fill" :style="`width:${s.pct}%;background:${s.color}`"></div>
              </div>
              <div class="status-bar-count">{{ s.count }}</div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ── New Project Modal ── -->
    <NewAnfrageModal
      :show="newProjectOpen"
      :settings="dashboardSettings"
      @close="newProjectOpen = false"
      @created="newProjectOpen = false"
    />

    <!-- Doc detail modal -->
    <DocumentDetailModal
      v-if="detailDocObj"
      :doc="detailDocObj"
      @close="detailDocId = null"
      @updated="onDocUpdated"
    />


  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import apiClient from '../services/api'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from '../stores/useStore'
import NewAnfrageModal from '../components/NewAnfrageModal.vue'
import DocumentDetailModal from '../components/DocumentDetailModal.vue'

const PIPELINE_STEPS = [
  { key: 'anfrage',       short: 'Anfrage',    label: 'Anfrage eingegangen',  statuses: ['Anfrage'] },
  { key: 'termin',        short: 'Termin',      label: 'Termin vereinbart',    statuses: [] },
  { key: 'vertrag',       short: 'Vertrag',     label: 'Vertrag erstellt',     statuses: [] },
  { key: 'durchfuehrung', short: 'Shooting',    label: 'Durchführung',         statuses: ['Aktiv'] },
  { key: 'abrechnung',    short: 'Abrechnung',  label: 'Abrechnung',           statuses: ['Abgeliefert'] },
  { key: 'abschluss',     short: 'Abschluss',   label: 'Abgeschlossen',        statuses: ['Abgeschlossen'] },
]

const STATUS_ORDER = { Anfrage:0, Aktiv:2, Abgeliefert:3, Abgeschlossen:4, Storniert:-1 }

const CAT_COLORS = {
  Hochzeit: '#EC4899', Portrait: '#8B5CF6', Event: '#F59E0B',
  Produktfotografie: '#10B981', Businessfotografie: '#3B82F6',
  Familienshooting: '#F97316', Sonstiges: '#6B7280',
}

export default {
  name: 'Dashboard',
  components: { NewAnfrageModal, DocumentDetailModal },
  setup() {
    const router = useRouter()
    const route  = useRoute()
    const store  = useStore()

    // ── Greeting ──
    const greeting = computed(() => {
      const h = new Date().getHours()
      if (h < 12) return 'Guten Morgen 🌤'
      if (h < 18) return 'Guten Tag 👋'
      return 'Guten Abend 🌙'
    })
    const todayFormatted = computed(() =>
      new Date().toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    )

    // ── KPIs ──
    const anfragenCount   = computed(() => store.projects.filter(p => p.status === 'Anfrage').length)
    const aktivCount      = computed(() => store.projects.filter(p => p.status === 'Aktiv').length)
    const abgeliefertCount = computed(() => store.projects.filter(p => p.status === 'Abgeliefert').length)
    const openInvoiceCount = computed(() => store.documents.filter(d => d.type === 'invoice' && d.status === 'Offen').length)
    const paidThisMonth   = computed(() => {
      const now = new Date()
      return store.documents
        .filter(d => d.type === 'invoice' && d.status === 'Bezahlt' && d.updatedAt && new Date(d.updatedAt).getMonth() === now.getMonth())
        .reduce((s, d) => s + (d.total || d.subtotal || 0), 0)
    })

    // ── Stream filters ──
    const streamFilter = ref('active')
    const streamFilters = computed(() => [
      { value: 'active',  label: 'Laufend',      count: store.projects.filter(p => ['Anfrage','Aktiv','Abgeliefert'].includes(p.status)).length },
      { value: 'all',     label: 'Alle',          count: store.projects.length },
      { value: 'Anfrage', label: 'Anfragen',      count: anfragenCount.value },
      { value: 'Aktiv',   label: 'Aktiv',         count: aktivCount.value },
      { value: 'Abgeliefert', label: 'Abgeliefert', count: abgeliefertCount.value },
      { value: 'Abgeschlossen', label: 'Abgeschlossen', count: store.projects.filter(p => p.status === 'Abgeschlossen').length },
    ])

    const filteredStream = computed(() => {
      let ps = [...store.projects]
      if (streamFilter.value === 'active') ps = ps.filter(p => ['Anfrage','Aktiv','Abgeliefert'].includes(p.status))
      else if (streamFilter.value !== 'all') ps = ps.filter(p => p.status === streamFilter.value)
      return ps.sort((a, b) => {
        // Sort: Anfrage first, then Aktiv, then Abgeliefert, then by date
        const oa = STATUS_ORDER[a.status] ?? 99
        const ob = STATUS_ORDER[b.status] ?? 99
        if (oa !== ob) return oa - ob
        return new Date(a.booking || 0) - new Date(b.booking || 0)
      })
    })

    // ── Pipeline helpers ──
    const pipelineSteps = PIPELINE_STEPS
    function pipelineIndex(project) {
      const s = project.status
      if (s === 'Anfrage') return 0
      if (s === 'Aktiv') {
        const hasDocs = store.documents.some(d => d.projectId === project.id && (d.type === 'contract' || d.contractData))
        return hasDocs ? 2 : 1
      }
      if (s === 'Abgeliefert') return 4
      if (s === 'Abgeschlossen') return 5
      return 0
    }
    function isPipeDone(p, i)    { return i < pipelineIndex(p) }
    function isPipeCurrent(p, i) { return i === pipelineIndex(p) }
    function isPipeFuture(p, i)  { return i > pipelineIndex(p) }

    // ── Doc counts per project ──
    function projectDocCounts(projectId) {
      const docs = store.documents.filter(d => d.projectId === projectId)
      return {
        quotes:   docs.filter(d => d.type === 'quote').length,
        invoices: docs.filter(d => d.type === 'invoice').length,
        paid:     docs.some(d => d.type === 'invoice' && d.status === 'Bezahlt'),
      }
    }

    // ── Right panel ──
    const openInvoices = computed(() =>
      store.documents.filter(d => d.type === 'invoice' && d.status === 'Offen')
        .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
    )
    const upcomingBookings = computed(() => {
      const now = new Date()
      return store.projects
        .filter(p => p.booking && new Date(p.booking) >= now && ['Anfrage','Aktiv'].includes(p.status))
        .sort((a, b) => new Date(a.booking) - new Date(b.booking))
        .slice(0, 6)
    })
    const statusBars = computed(() => {
      const total = store.projects.length || 1
      const counts = { Anfrage: anfragenCount.value, Aktiv: aktivCount.value, Abgeliefert: abgeliefertCount.value, Abgeschlossen: store.projects.filter(p => p.status === 'Abgeschlossen').length }
      return [
        { label: 'Anfrage',      count: counts.Anfrage,      pct: Math.round(counts.Anfrage      / total * 100), color: '#0284C7' },
        { label: 'Aktiv',        count: counts.Aktiv,        pct: Math.round(counts.Aktiv        / total * 100), color: '#059669' },
        { label: 'Abgeliefert',  count: counts.Abgeliefert,  pct: Math.round(counts.Abgeliefert  / total * 100), color: '#7C3AED' },
        { label: 'Abgeschlossen',count: counts.Abgeschlossen,pct: Math.round(counts.Abgeschlossen/ total * 100), color: '#71717A' },
      ]
    })

    // ── BQ-2: Umsatz-Chart — letzte 6 Monate, bezahlte Rechnungen ──
    const revenueChartData = computed(() => {
      const now    = new Date()
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d    = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = d.getFullYear()
        const mon  = d.getMonth()
        const lbl  = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
        const amount = store.documents
          .filter(doc =>
            doc.type === 'invoice' &&
            (doc.status === 'Bezahlt' || doc.status === 'bezahlt') &&
            doc.paidAt
          )
          .reduce((sum, doc) => {
            const pd = new Date(doc.paidAt)
            if (pd.getFullYear() === year && pd.getMonth() === mon) {
              return sum + (doc.total || 0)
            }
            return sum
          }, 0)
        months.push({ label: lbl, amount, isCurrent: i === 0 })
      }
      const maxAmount = Math.max(...months.map(m => m.amount), 1)
      return months.map(m => ({
        ...m,
        heightPct: Math.max(m.amount > 0 ? 8 : 2, Math.round((m.amount / maxAmount) * 100)),
        barColor: m.amount === 0
          ? '#fca5a5'           // rot — kein Umsatz
          : m.isCurrent
            ? '#16a34a'         // kräftiges Grün — aktueller Monat
            : m.amount >= maxAmount * 0.7
              ? '#22c55e'       // Grün — starker Monat
              : '#86efac',      // helles Grün — normaler Monat
      }))
    })

    // ── Helpers ──
    function catColor(cat) { return CAT_COLORS[cat] || '#6B7280' }
    function statusBadgeClass(s) {
      return { Anfrage:'badge-anfrage', Aktiv:'badge-aktiv', Abgeliefert:'badge-abgeliefert', Abgeschlossen:'badge-abgeschlossen', Storniert:'badge-storniert' }[s] || 'badge-neutral'
    }
    function customerName(id) {
      const c = store.customers.find(c => c.id === id)
      return c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || '—' : '—'
    }
    function fullName(c) { return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || '—' }
    function customerByProject(projectId) {
      const p = store.projects.find(p => p.id === projectId)
      return p ? customerName(p.customerId) : '—'
    }
    function formatCurrency(n) { return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n || 0) }
    function formatCurrencyShort(n) {
      if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + ' k€'
      return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n || 0)
    }
    function formatDateShort(d) {
      return d ? new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'
    }
    function upcomingDay(d)   { return d ? new Date(d).toLocaleDateString('de-DE', { day:'2-digit' }) : '—' }
    function upcomingMonth(d) { return d ? new Date(d).toLocaleDateString('de-DE', { month:'short' }) : '' }
    function isOverdue(d)     { return d && new Date(d) < new Date() }

    function goFilter(status) {
      router.push(status ? `/projects?status=${status}` : '/projects')
    }

    // ── New project modal ──
    const newProjectOpen    = ref(false)
    const dashboardSettings = ref(null)
    const detailDocId           = ref(null)
    const detailDocObj          = computed(() => detailDocId.value ? store.documents.find(d => d.id === detailDocId.value) || null : null)

    function openNewProject() {
      newProjectOpen.value = true
    }

    function onDocUpdated() { store.fetchDocuments() }


    // initialized verhindert den Flicker-Effekt:
    // Beim ersten Render ist store.loading=false und store.projects=[] →
    // ohne dieses Flag würde kurz das "Keine Aufträge" Banner aufblitzen.
    const initialized = ref(false)

    onMounted(async () => {
      await Promise.all([store.fetchCustomers(), store.fetchSuppliers(), store.fetchProjects(), store.fetchDocuments()])
      try {
        const r = await apiClient.get('/settings')
        dashboardSettings.value = r.data?.data || r.data
      } catch(e) { console.error('Settings:', e) }
      initialized.value = true
    })

    return {
      store, router,
      greeting, todayFormatted,
      anfragenCount, aktivCount, abgeliefertCount, openInvoiceCount, paidThisMonth, revenueChartData,
      streamFilter, streamFilters, filteredStream,
      pipelineSteps, isPipeDone, isPipeCurrent, isPipeFuture,
      projectDocCounts, openInvoices, upcomingBookings, statusBars,
      catColor, statusBadgeClass, customerName, fullName, customerByProject,
      formatCurrency, formatCurrencyShort, formatDateShort,
      upcomingDay, upcomingMonth, isOverdue, goFilter,
      initialized,
      newProjectOpen, dashboardSettings, openNewProject,
      detailDocId, detailDocObj, onDocUpdated,
    }
  }
}
</script>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 20px; }

/* ── Header ── */
.dash-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.greeting-text { font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -.3px; }
.greeting-date { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.app-version-badge {
  font-family: monospace; font-size: 10px; font-weight: 700;
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 5px; padding: 2px 8px; color: var(--text-muted);
  letter-spacing: .3px; align-self: center;
}
.dash-header-actions { display: flex; gap: 10px; }

/* ── KPI Strip ── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
@media (max-width: 1100px) { .kpi-strip { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px)  { .kpi-strip { grid-template-columns: repeat(2, 1fr); } }

.kpi-tile {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
  cursor: pointer;
  transition: all .15s;
  box-shadow: var(--shadow-xs);
  position: relative; overflow: hidden;
}
.kpi-tile::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
}
.kpi-tile:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.kpi-num { font-size: 26px; font-weight: 800; line-height: 1.1; letter-spacing: -.5px; }
.kpi-lbl { font-size: 11.5px; font-weight: 500; color: var(--text-muted); margin-top: 4px; }

.kpi-blue    .kpi-num { color: #0284C7; } .kpi-blue::before    { background: #0284C7; }
.kpi-amber   .kpi-num { color: #D97706; } .kpi-amber::before   { background: #D97706; }
.kpi-green   .kpi-num { color: #059669; } .kpi-green::before   { background: #059669; }
.kpi-violet  .kpi-num { color: #7C3AED; } .kpi-violet::before  { background: #7C3AED; }
.kpi-orange  .kpi-num { color: #DC2626; } .kpi-orange::before  { background: #DC2626; }
.kpi-emerald .kpi-num { color: #065F46; } .kpi-emerald::before { background: #10B981; }

/* ── Main grid ── */
.dash-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1000px) {
  .dash-grid { grid-template-columns: 1fr; }
  .panel-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
}
@media (max-width: 640px) {
  .panel-col { grid-template-columns: 1fr; }
}

/* ── Stream col ── */
.stream-col { display: flex; flex-direction: column; gap: 12px; }
.stream-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.stream-title { font-size: 15px; font-weight: 700; color: var(--text); }
.stream-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
.sf-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 12px; border-radius: 99px; border: 1px solid var(--border);
  font-size: 12px; font-weight: 500; cursor: pointer;
  background: var(--surface); color: var(--text-2); font-family: inherit;
  transition: all .12s;
}
.sf-btn:hover  { border-color: var(--primary); color: var(--primary-text); }
.sf-btn.active { background: var(--primary-light); border-color: var(--primary); color: var(--primary-text); font-weight: 600; }
.sf-count { font-size: 10px; background: currentColor; color: var(--surface); padding: 0 5px; border-radius: 99px; opacity: .8; }
.sf-btn.active .sf-count { background: var(--primary); color: white; opacity: 1; }

/* ── Empty stream ── */
.stream-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 20px; text-align: center; }
.stream-empty-icon  { font-size: 40px; }
.stream-empty-title { font-size: 16px; font-weight: 600; color: var(--text-2); }
.stream-empty p     { font-size: 13.5px; color: var(--text-muted); }
.stream-list { display: flex; flex-direction: column; gap: 10px; }

/* ── Project card ── */
.proj-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  display: flex; overflow: hidden;
  cursor: pointer;
  transition: all .15s;
  box-shadow: var(--shadow-xs);
}
.proj-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); border-color: rgba(99,102,241,.2); }
.proj-card-accent { width: 4px; flex-shrink: 0; background: var(--cat-color, #6B7280); }
.proj-card-body { flex: 1; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }

.proj-card-top { display: flex; align-items: flex-start; gap: 12px; }
.proj-card-info { flex: 1; min-width: 0; }
.proj-card-name { font-size: 14.5px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.proj-card-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.proj-customer  { font-weight: 600; color: var(--text-2); }
.proj-dot       { opacity: .4; }
.proj-cat, .proj-date { }
.proj-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.proj-budget    { font-size: 14px; font-weight: 800; color: var(--text); }

/* ── Services chips ── */
.proj-svc       { display: flex; gap: 5px; flex-wrap: wrap; }
.svc-chip {
  font-size: 11px; font-weight: 500; color: var(--text-2);
  background: var(--bg-alt); border: 1px solid var(--border);
  padding: 2px 8px; border-radius: 99px;
}
.svc-chip-loc { color: var(--text-muted); }

/* ── Pipeline ── */
.proj-pipeline {
  display: flex; align-items: flex-start; gap: 0;
  position: relative; padding: 4px 0 0;
}
.pipe-line {
  position: absolute; top: 12px; left: 12px; right: 12px; height: 2px;
  background: var(--border); z-index: 0;
}
.pipe-step {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  position: relative; z-index: 1;
}
.pipe-dot {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid var(--border); background: var(--surface);
  transition: all .2s;
}
.pipe-label { font-size: 9.5px; color: var(--text-muted); text-align: center; white-space: nowrap; }
.pipe-done    .pipe-dot { background: var(--success); border-color: var(--success); }
.pipe-current .pipe-dot { background: var(--primary); border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.2); }
.pipe-current .pipe-label { color: var(--primary-text); font-weight: 700; }
.pipe-done    .pipe-label { color: var(--success); }

/* ── Card footer ── */
.proj-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.proj-docs { display: flex; gap: 5px; flex-wrap: wrap; }
.doc-chip { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 99px; border: 1px solid; }
.doc-chip-quote   { background: #F0F9FF; color: #0284C7; border-color: #BAE6FD; }
.doc-chip-invoice { background: #FFF7ED; color: #C2410C; border-color: #FED7AA; }
.doc-chip-paid    { background: #ECFDF5; color: #059669; border-color: #6EE7B7; }
.doc-chip-none    { background: var(--bg-alt); color: var(--text-muted); border-color: var(--border); }
.proj-delivery    { font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.proj-delivery.overdue { color: var(--danger); font-weight: 600; }

/* ── Side panel ── */
.panel-col { display: flex; flex-direction: column; gap: 14px; }
.side-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden;
  box-shadow: var(--shadow-xs);
}
.side-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.side-card-title { font-size: 13px; font-weight: 700; color: var(--text); }
.side-card-link { background: none; border: none; font-size: 12px; color: var(--primary-text); cursor: pointer; font-family: inherit; padding: 0; }
.side-card-link:hover { text-decoration: underline; }
.side-empty { padding: 20px 16px; font-size: 12.5px; color: var(--text-muted); text-align: center; }

/* ── Invoice list ── */
.inv-list { }
.inv-row { display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border); gap: 10px; }
.inv-row:last-child { border-bottom: none; }
.inv-info { flex: 1; min-width: 0; }
.inv-num { font-size: 12.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.inv-customer { font-size: 11.5px; color: var(--text-muted); }
.inv-right { text-align: right; flex-shrink: 0; }
.inv-amount { font-size: 13px; font-weight: 700; color: var(--text); }
.inv-due { font-size: 11px; color: var(--text-muted); }
.inv-due.overdue { color: var(--danger); font-weight: 600; }

/* ── Upcoming list ── */
.upcoming-list { }
.upcoming-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background .1s; }
.upcoming-row:last-child { border-bottom: none; }
.upcoming-row:hover { background: var(--bg-alt); }
.upcoming-date-col { text-align: center; width: 36px; flex-shrink: 0; }
.upcoming-day   { font-size: 17px; font-weight: 800; color: var(--text); line-height: 1.1; }
.upcoming-month { font-size: 10px; text-transform: uppercase; color: var(--text-muted); letter-spacing: .5px; }
.upcoming-info  { flex: 1; min-width: 0; }
.upcoming-name  { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upcoming-meta  { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }

/* ── Status bars ── */
.status-bars { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.status-bar-row { display: flex; align-items: center; gap: 10px; }
.status-bar-label { font-size: 12px; color: var(--text-2); min-width: 90px; }
.status-bar-track { flex: 1; height: 6px; background: var(--bg-alt); border-radius: 99px; overflow: hidden; }
.status-bar-fill  { height: 100%; border-radius: 99px; transition: width .5s ease; min-width: 4px; }
.status-bar-count { font-size: 12px; font-weight: 700; color: var(--text); min-width: 18px; text-align: right; }

/* ── Loading spinner ── */
.loading-spinner {
  width: 28px; height: 28px; border: 2.5px solid var(--border);
  border-top-color: var(--primary); border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── New project modal link ── */
.link-btn { background: none; border: none; color: var(--primary-text); cursor: pointer; font-family: inherit; font-size: inherit; text-decoration: underline; }

/* ── BQ-2: Revenue Chart ── */
.revenue-chart-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;
}
.rcc-header {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 14px;
}
.rcc-title  { font-size: 13px; font-weight: 700; color: var(--text); }
.rcc-total  { font-size: 12px; color: var(--text-muted); }
.rcc-bars   { display: flex; gap: 8px; align-items: flex-end; height: 110px; }
.rcc-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
.rcc-bar-wrap { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; width: 100%; }
.rcc-bar-val { font-size: 9px; color: var(--text-muted); text-align: center; line-height: 1.2; }
.rcc-bar-val--zero { color: #ef4444; font-size: 10px; }
.rcc-bar {
  width: 100%; min-height: 3px; border-radius: 4px 4px 0 0;
  background: var(--primary-light);
  transition: height .3s ease;
}
.rcc-bar-lbl { font-size: 10px; color: var(--text-muted); text-align: center; }
.rcc-lbl-current { color: var(--primary); font-weight: 700; }

</style>
