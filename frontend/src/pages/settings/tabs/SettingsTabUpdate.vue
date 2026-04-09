<template>
  <div class="s-content">

    <div class="s-card">
      <div class="s-card-header">
        <span class="s-card-icon">📦</span>
        <h3 class="s-card-title">Update installieren</h3>
      </div>
      <div class="s-card-body">
        <p class="s-intro" style="margin-bottom:16px">
          Wähle eine Update-ZIP-Datei aus. Vor der Installation wird automatisch ein
          Datensicherungs-Backup erstellt. Alle Code-Dateien werden aktualisiert —
          Daten, Uploads und Einstellungen bleiben unberührt.
        </p>

        <!-- Datei-Auswahl -->
        <div v-if="!updatePreview" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <label class="btn btn-secondary" style="cursor:pointer">
            📁 Update-ZIP auswählen…
            <input type="file" accept=".zip" style="display:none" ref="updateFileInput" @change="onUpdateFileSelected" />
          </label>
          <span v-if="updateFile" class="backup-import-filename">{{ updateFile.name }}</span>
          <button v-if="updateFile && !updatePreviewing" class="btn btn-primary" @click="previewUpdate">
            🔍 Vorschau laden
          </button>
          <span v-if="updatePreviewing" class="update-status">⏳ Lese Manifest…</span>
          <span v-if="updatePreviewErr" class="backup-msg backup-msg-err">✗ {{ updatePreviewErr }}</span>
        </div>

        <!-- Manifest-Vorschau -->
        <div v-if="updatePreview" class="update-manifest-card">
          <div class="update-manifest-header">
            <span class="update-version-badge">{{ updatePreview.version }}</span>
            <span class="update-manifest-title">{{ updatePreview.title }}</span>
          </div>
          <p v-if="updatePreview.description" class="update-manifest-desc">{{ updatePreview.description }}</p>
          <ul v-if="updatePreview.changes?.length" class="update-changes-list">
            <li v-for="ch in updatePreview.changes" :key="ch">{{ ch }}</li>
          </ul>
          <div class="update-manifest-meta" v-if="updatePreview.date">Veröffentlicht: {{ updatePreview.date }}</div>

          <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;align-items:center">
            <button class="btn btn-danger" :disabled="updateApplying" @click="applyUpdate">
              <span v-if="updateApplying">⏳ Update wird installiert…</span>
              <span v-else>🚀 Update jetzt installieren</span>
            </button>
            <button class="btn btn-ghost" :disabled="updateApplying" @click="resetUpdate">Abbrechen</button>
            <span v-if="updateApplyErr" class="backup-msg backup-msg-err">✗ {{ updateApplyErr }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Update läuft / Neustart -->
    <div v-if="updateApplying || updateRestarting" class="s-card update-progress-card">
      <div class="s-card-body" style="text-align:center;padding:32px">
        <div class="update-spinner">⚙️</div>
        <div v-if="updateApplying && !updateRestarting" style="margin-top:12px;font-weight:600">
          Update wird angewendet…
        </div>
        <div v-if="updateRestarting" style="margin-top:12px">
          <div style="font-weight:700;font-size:15px;margin-bottom:8px">
            ✅ Update installiert — Backend startet neu
          </div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
            Verbindung wird wiederhergestellt… ({{ updateRestartCountdown }}s)
          </div>
          <div class="update-health-bar">
            <div class="update-health-fill" :style="{ width: updateHealthPct + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="s-card" style="background:var(--info-bg,#f0f6ff);border-color:var(--info-border,#bfdbfe)">
      <div class="s-card-body" style="display:flex;gap:12px;align-items:flex-start">
        <span style="font-size:20px">ℹ️</span>
        <div style="font-size:13px;color:var(--text);line-height:1.7">
          <strong>Wichtig:</strong> Updates werden nur als offizielle <code>update-vXXX.zip</code>-Dateien geliefert.
          Vor jeder Installation wird automatisch ein <strong>Pre-Update-Backup</strong> erstellt.
          Nach dem Update startet das Backend automatisch neu.
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref } from 'vue'
import apiClient from '../../../services/api'

export default {
  name: 'SettingsTabUpdate',
  setup() {
    const updateFileInput = ref(null)
    const updateFile = ref(null)
    const updatePreview = ref(null)
    const updatePreviewing = ref(false)
    const updatePreviewErr = ref('')
    const updateApplying = ref(false)
    const updateApplyErr = ref('')
    const updateRestarting = ref(false)
    const updateRestartCountdown = ref(30)
    const updateHealthPct = ref(0)

    function onUpdateFileSelected(e) {
      updateFile.value = e.target.files[0] || null
      updatePreview.value = null; updatePreviewErr.value = ''; updateApplyErr.value = ''
    }

    function resetUpdate() {
      updateFile.value = null; updatePreview.value = null
      updatePreviewErr.value = ''; updateApplyErr.value = ''; updateRestarting.value = false
      if (updateFileInput.value) updateFileInput.value.value = ''
    }

    async function previewUpdate() {
      if (!updateFile.value) return
      updatePreviewing.value = true; updatePreviewErr.value = ''; updatePreview.value = null
      try {
        const fd = new FormData(); fd.append('update', updateFile.value)
        const r = await apiClient.post('/update/preview', fd)
        updatePreview.value = r.data.data
      } catch (e) { updatePreviewErr.value = e.response?.data?.error || e.message }
      finally { updatePreviewing.value = false }
    }

    async function applyUpdate() {
      if (!updateFile.value) return
      if (!confirm('Update jetzt installieren?\n\nEin Backup wird vor der Installation erstellt.')) return
      updateApplying.value = true; updateApplyErr.value = ''
      try {
        const fd = new FormData(); fd.append('update', updateFile.value)
        await apiClient.post('/update/apply', fd)
        updateRestarting.value = true; pollBackendRestart()
      } catch (e) {
        const isExpected = e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED' ||
          e.message?.includes('Network Error') || e.message?.includes('ERR_EMPTY_RESPONSE')
        if (isExpected) { updateRestarting.value = true; pollBackendRestart() }
        else { updateApplyErr.value = e.response?.data?.error || e.message; updateApplying.value = false }
      }
    }

    function pollBackendRestart() {
      updateHealthPct.value = 0; updateRestartCountdown.value = 30
      let elapsed = 0; const MAX = 40000
      const interval = setInterval(async () => {
        elapsed += 1000
        updateRestartCountdown.value = Math.max(0, Math.round((MAX - elapsed) / 1000))
        updateHealthPct.value = Math.min(95, Math.round((elapsed / MAX) * 100))
        try {
          await apiClient.get('/health')
          clearInterval(interval); updateHealthPct.value = 100
          setTimeout(() => location.reload(), 800)
        } catch { /* not ready */ }
        if (elapsed >= MAX) {
          clearInterval(interval)
          updateApplyErr.value = 'Backend antwortet nicht. Bitte manuell neu starten.'
          updateRestarting.value = false; updateApplying.value = false
        }
      }, 1000)
    }

    return {
      updateFileInput, updateFile, updatePreview, updatePreviewing, updatePreviewErr,
      updateApplying, updateApplyErr, updateRestarting, updateRestartCountdown, updateHealthPct,
      onUpdateFileSelected, resetUpdate, previewUpdate, applyUpdate,
    }
  }
}
</script>
