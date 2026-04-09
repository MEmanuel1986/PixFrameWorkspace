<template>
  <div class="s-content">

    <!-- Datenpfad -->
    <div class="s-card">
      <div class="s-card-header">
        <h3 class="s-card-title">📂 Datenpfad</h3>
        <p class="s-card-subtitle">Hier werden alle Daten, Aufträge, Backups und Medien gespeichert.</p>
      </div>
      <div class="s-card-body">
        <div class="sys-path-row">
          <div class="sys-path-label">Aktueller Pfad</div>
          <div class="sys-path-value">
            <code class="sys-path-code">{{ workspaceInfo.path || '—' }}</code>
            <button class="btn btn-xs btn-ghost" @click="openWorkspaceFolder" title="Ordner im Explorer öffnen">📂</button>
          </div>
        </div>

        <div class="sys-stats-grid" v-if="workspaceInfo.path">
          <div class="sys-stat">
            <div class="sys-stat-val">{{ workspaceInfo.kundenOrdner || 0 }}</div>
            <div class="sys-stat-lbl">Kunden-Ordner</div>
          </div>
          <div class="sys-stat">
            <div class="sys-stat-val">{{ workspaceInfo.gesamtDateien || 0 }}</div>
            <div class="sys-stat-lbl">Dateien gesamt</div>
          </div>
          <div class="sys-stat">
            <div class="sys-stat-val">{{ workspaceInfo.databaseDir ? '✅' : '—' }}</div>
            <div class="sys-stat-lbl">SQLite-DB</div>
          </div>
        </div>

        <div class="sys-dirs-list" v-if="workspaceInfo.path">
          <div class="sys-dir-row" v-for="dir in workspaceDirs" :key="dir.label">
            <span class="sys-dir-icon">{{ dir.icon }}</span>
            <span class="sys-dir-label">{{ dir.label }}</span>
            <code class="sys-dir-path">{{ dir.path }}</code>
            <button class="btn btn-xs btn-ghost" @click="openFolder(dir.fullPath)" title="Öffnen">📂</button>
          </div>
        </div>

        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-sm btn-secondary" @click="changeWorkspace" v-if="isElectron">
            📁 Datenpfad ändern
          </button>
          <button class="btn btn-sm btn-secondary" @click="loadWorkspaceInfo">
            🔄 Aktualisieren
          </button>
        </div>
      </div>
    </div>

    <!-- App-Info -->
    <div class="s-card">
      <div class="s-card-header">
        <h3 class="s-card-title">ℹ️ App-Info</h3>
      </div>
      <div class="s-card-body">
        <table class="sys-info-table">
          <tr><td class="sys-info-label">Version</td><td>{{ appVersion || '—' }}</td></tr>
          <tr><td class="sys-info-label">Node.js</td><td>{{ nodeVersion }}</td></tr>
          <tr><td class="sys-info-label">Electron</td><td>{{ isElectron ? '✅ Aktiv' : '❌ Standalone' }}</td></tr>
          <tr><td class="sys-info-label">PDF-Engine</td><td>{{ isElectron ? 'Electron printToPDF' : 'Browser-Druck' }}</td></tr>
          <tr><td class="sys-info-label">Datenbank</td><td>SQLite (WAL-Mode)</td></tr>
        </table>
      </div>
    </div>

    <!-- Datenbank-Reset -->
    <div class="s-card" style="border-color: #ef4444;">
      <div class="s-card-head">
        <span class="s-card-title" style="color: #ef4444;">⚠️ System zurücksetzen</span>
        <span class="s-card-sub">Datenbank und Projektordner auf Werkszustand zurücksetzen.</span>
      </div>
      <div class="s-card-body">
        <div class="reset-warning-box">
          <strong>Diese Aktion löscht unwiderruflich:</strong>
          <ul style="margin:8px 0 0 18px; font-size:13px; line-height:1.7;">
            <li>Alle Kunden (außer Demo-Kunde)</li>
            <li>Alle Projekte, Anfragen und Dokumente</li>
            <li>Alle Rechnungen, Angebote und Verträge</li>
            <li>Alle FiBu-Einträge</li>
            <li>Alle Dateien in den Projektordnern</li>
          </ul>
        </div>

        <div style="margin-top:16px;">
          <label style="font-size:13px; font-weight:600; display:block; margin-bottom:6px;">
            🔑 Service-Passwort
          </label>
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <input v-model="resetPassword" type="password" placeholder="Passwort eingeben"
              class="reset-pw-input" style="max-width:200px;" @keyup.enter="confirmReset" />
            <button class="btn btn-sm" style="background:#ef4444; color:white; border:none; padding:8px 18px; font-weight:700;"
              :disabled="!resetPassword || resetBusy" @click="confirmReset">
              {{ resetBusy ? 'Wird zurückgesetzt…' : '🗑 Zurücksetzen' }}
            </button>
          </div>
          <p v-if="resetError" class="hint danger" style="margin-top:8px;">{{ resetError }}</p>
          <p v-if="resetSuccess" class="hint" style="margin-top:8px; color:#16a34a; font-weight:600;">
            ✅ {{ resetSuccess }}
          </p>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
import apiClient from '../../../services/api'
import { API_BASE } from '../../../services/api'

export default {
  name: 'SettingsTabSystem',
  setup() {
    const store = useSettingsFormStore()

    const workspaceInfo = ref({})
    const appVersion = ref('')
    const isElectron = ref(!!window.pixframe?.isElectron)
    const nodeVersion = typeof process !== 'undefined' ? (process.versions?.node || '—') : '—'

    const workspaceDirs = computed(() => {
      const w = workspaceInfo.value
      if (!w.path) return []
      return [
        { icon: '📊', label: 'Datenbank', path: 'database/', fullPath: w.databaseDir },
        { icon: '📁', label: 'Aufträge', path: 'auftraege/', fullPath: w.auftraegeDir },
        { icon: '📤', label: 'Uploads', path: 'uploads/', fullPath: w.uploadsDir },
        { icon: '💾', label: 'Backups', path: 'backups/', fullPath: w.backupsDir },
      ].filter(d => d.fullPath)
    })

    async function loadWorkspaceInfo() {
      try {
        const res = await fetch(`${API_BASE}/api/workspace/info`)
        const json = await res.json()
        workspaceInfo.value = json.data || {}
      } catch (e) { console.warn('Workspace-Info nicht ladbar:', e.message) }
    }

    function openWorkspaceFolder() {
      if (window.pixframe?.openFolder && workspaceInfo.value.path)
        window.pixframe.openFolder(workspaceInfo.value.path)
    }

    function openFolder(folderPath) {
      if (window.pixframe?.openFolder && folderPath) window.pixframe.openFolder(folderPath)
    }

    async function changeWorkspace() {
      if (window.pixframe?.changeWorkspace) await window.pixframe.changeWorkspace()
    }

    if (window.pixframe?.getAppVersion) {
      window.pixframe.getAppVersion().then(v => { appVersion.value = v })
    }

    // ── Reset ──
    const resetPassword = ref('')
    const resetBusy = ref(false)
    const resetError = ref('')
    const resetSuccess = ref('')

    async function confirmReset() {
      resetError.value = ''; resetSuccess.value = ''
      if (!resetPassword.value) { resetError.value = 'Bitte Service-Passwort eingeben.'; return }
      if (!confirm('⚠️ ACHTUNG: Alle Daten werden unwiderruflich gelöscht!\n\nWirklich fortfahren?')) return
      resetBusy.value = true
      try {
        const { data } = await apiClient.post('/reset/execute', { password: resetPassword.value })
        resetSuccess.value = data.message +
          ` (${data.stats.before.customers} Kunden, ${data.stats.before.projects} Projekte, ${data.stats.before.documents} Dokumente gelöscht)`
        resetPassword.value = ''
      } catch (err) { resetError.value = err.response?.data?.error || err.message }
      finally { resetBusy.value = false }
    }

    onMounted(loadWorkspaceInfo)

    return {
      store, workspaceInfo, workspaceDirs, appVersion, isElectron, nodeVersion,
      loadWorkspaceInfo, openWorkspaceFolder, openFolder, changeWorkspace,
      resetPassword, resetBusy, resetError, resetSuccess, confirmReset,
    }
  }
}
</script>
