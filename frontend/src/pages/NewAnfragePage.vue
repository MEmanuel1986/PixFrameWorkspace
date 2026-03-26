<template>
  <div class="nap-page">

    <!-- Hero: wie ProjectDetail, aber für neue Anfrage -->
    <div class="nap-hero">
      <div class="nap-hero-main">
        <div class="nap-hero-top">
          <a class="nap-back-link" href="#" @click.prevent="goBack">
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Dashboard
          </a>
          <span class="nap-badge">Neue Anfrage</span>
        </div>
        <h1 class="nap-title">{{ liveData.projectName || 'Neue Anfrage' }}</h1>
        <div class="nap-meta">
          <span v-if="customerName">👤 {{ customerName }}</span>
          <span v-if="liveData.booking">
            &nbsp;·&nbsp;📅 {{ formatDate(liveData.booking) }}
            <span v-if="liveData.bookingTime">&nbsp;·&nbsp;🕐 {{ liveData.bookingTime }}</span>
          </span>
          <span v-if="liveData.location">&nbsp;·&nbsp;📍 {{ liveData.location }}</span>
        </div>
      </div>
    </div>

    <!-- Anfrage-Formular -->
    <div class="nap-form-wrap">
      <div v-if="error" class="nap-error">⚠ {{ error }}</div>
      <NewProjectForm
        mode="create"
        :customer-name="customerName"
        :settings="settingsData"
        :saving="saving"
        @save="handleSave"
        @cancel="goBack"
        @update:live="onLive"
      />
    </div>

  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore }    from '../stores/useStore'
import { useSettings } from '../stores/useSettings'
import NewProjectForm  from '../components/NewProjectForm.vue'

export default {
  name: 'NewAnfragePage',
  components: { NewProjectForm },
  setup() {
    const route    = useRoute()
    const router   = useRouter()
    const store    = useStore()
    const settings = useSettings()

    const saving = ref(false)
    const error  = ref('')
    const liveData = ref({ projectName: '', booking: '', bookingTime: '', location: '' })

    // Kundendaten aus Query-Parameter
    const customerId = computed(() => route.query.customerId || null)
    const customerName = computed(() => {
      if (!customerId.value) return ''
      const c = store.customers.find(c => c.id === customerId.value)
      if (!c) return ''
      return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || ''
    })

    const settingsData = computed(() => settings.settings || {})

    function formatDate(d) {
      if (!d) return ''
      return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    function onLive(data) { Object.assign(liveData.value, data) }

    function goBack() { router.push('/') }

    async function handleSave({ project: pData, contractData }) {
      if (!customerId.value) { error.value = 'Kein Kunde ausgewählt.'; return }
      saving.value = true
      error.value  = ''
      try {
        const payload = {
          ...pData,
          customerId: customerId.value,
          status: 'Anfrage',
        }
        const created = await store.addProject(payload)
        // Kontraktdaten sofort mitnehmen falls ausgefüllt
        if (contractData && (contractData.occasion || contractData.hourlyRate || contractData.flatRate)) {
          await store.updateProject(created.id, { contractData })
        }
        router.push(`/projects/${created.id}`)
      } catch (e) {
        error.value = 'Fehler beim Anlegen: ' + e.message
      } finally {
        saving.value = false
      }
    }

    onMounted(async () => {
      if (store.customers.length === 0) await store.fetchCustomers()
      if (!settings.settings) await settings.fetchSettings()
    })

    return {
      customerName, settingsData, saving, error, liveData,
      formatDate, onLive, goBack, handleSave,
    }
  }
}
</script>

<style scoped>
.nap-page { min-height: 100vh; background: var(--bg); }

/* ── Hero (spiegelt proj-hero) ── */
.nap-hero {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  padding: 20px 24px 22px;
  color: white;
}
.nap-hero-top {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.nap-back-link {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; color: rgba(255,255,255,.55); text-decoration: none;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
  border-radius: 6px; padding: 4px 10px; transition: all .14s;
}
.nap-back-link:hover { color: white; background: rgba(255,255,255,.16); text-decoration: none; }
.nap-badge {
  font-size: 10.5px; font-weight: 700;
  background: rgba(255,255,255,.15); color: rgba(255,255,255,.9);
  border-radius: 99px; padding: 3px 10px;
}
.nap-title {
  font-size: 22px; font-weight: 800; color: white; margin: 0 0 6px;
  line-height: 1.2;
}
.nap-meta {
  font-size: 13px; color: rgba(255,255,255,.65);
  display: flex; flex-wrap: wrap; gap: 2px; align-items: center;
}

/* ── Form wrapper ── */
.nap-form-wrap {
  max-width: 1100px; margin: 24px auto; padding: 0 16px 40px;
}
.nap-error {
  margin-bottom: 12px; padding: 10px 14px;
  background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;
  font-size: 13px; color: #991b1b;
}
</style>
