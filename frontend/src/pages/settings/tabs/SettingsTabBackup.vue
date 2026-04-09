<template>
  <div class="s-content">

    <!-- Manuelles Backup erstellen -->
    <div class="s-card">
      <div class="s-card-header">
        <span class="s-card-icon">💾</span>
        <h3 class="s-card-title">Backup erstellen</h3>
      </div>
      <div class="s-card-body">
        <p class="s-intro" style="margin-bottom:16px">
          Erstellt eine vollständige Datensicherung aller Daten sowie aller hochgeladenen Dateien.
          Das Backup wird als ZIP-Archiv im <code>backups/</code>-Ordner gespeichert.
          Es werden maximal 10 Backups aufbewahrt — das älteste wird automatisch gelöscht.
        </p>
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-primary" :disabled="backupCreating" @click="createBackup">
            <span v-if="backupCreating">⏳ Backup wird erstellt…</span>
            <span v-else>💾 Backup jetzt erstellen</span>
          </button>
          <span v-if="backupMsg" class="backup-msg" :class="backupMsgType">{{ backupMsg }}</span>
        </div>
      </div>
    </div>

    <!-- Backup-Liste -->
    <div class="s-card">
      <div class="s-card-header">
        <span class="s-card-icon">📂</span>
        <h3 class="s-card-title">Vorhandene Backups</h3>
        <span class="s-card-count" v-if="backupList.length">{{ backupList.length }} / 10</span>
      </div>
      <div class="s-card-body" style="padding:0">
        <div v-if="backupLoading" class="backup-loading">Lade Backup-Liste…</div>
        <div v-else-if="backupList.length === 0" class="backup-empty">
          Noch kein Backup vorhanden. Beim nächsten Backend-Start wird automatisch eines erstellt.
        </div>
        <table v-else class="backup-table">
          <thead><tr>
            <th>Dateiname</th><th>Datum &amp; Uhrzeit</th>
            <th style="text-align:right">Größe</th><th style="text-align:right">Aktionen</th>
          </tr></thead>
          <tbody>
            <tr v-for="bk in backupList" :key="bk.filename"
              :class="{ 'backup-row-auto': bk.filename.includes('_auto'), 'backup-row-prerestore': bk.filename.includes('_pre-restore') }">
              <td class="backup-name">
                <span class="backup-badge" v-if="bk.filename.includes('_auto')">Auto</span>
                <span class="backup-badge backup-badge-warn" v-if="bk.filename.includes('_pre-restore')">Pre-Restore</span>
                {{ bk.filename.replace(/^pixframe-backup-/, '').replace(/\.zip$/, '') }}
              </td>
              <td class="backup-date">{{ fmtBackupDate(bk.createdAt) }}</td>
              <td class="backup-size" style="text-align:right">{{ store.fmtFileSize(bk.size) }}</td>
              <td style="text-align:right">
                <div class="backup-actions">
                  <button class="btn btn-ghost btn-sm" @click="downloadBackup(bk.filename)" title="Herunterladen">⬇️</button>
                  <button class="btn btn-ghost btn-sm" :disabled="backupRestoring === bk.filename" @click="restoreBackup(bk.filename)" title="Wiederherstellen">
                    <span v-if="backupRestoring === bk.filename">⏳</span><span v-else>♻️</span>
                  </button>
                  <button class="btn btn-ghost btn-sm btn-danger" @click="deleteBackup(bk.filename)" title="Löschen">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Backup importieren -->
    <div class="s-card">
      <div class="s-card-header">
        <span class="s-card-icon">📥</span>
        <h3 class="s-card-title">Backup importieren</h3>
      </div>
      <div class="s-card-body">
        <p class="s-intro" style="margin-bottom:16px">
          Lade eine externe Backup-ZIP-Datei hoch, um Daten wiederherzustellen.
          <strong>Achtung:</strong> Alle aktuellen Daten werden überschrieben.
        </p>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <label class="btn btn-secondary" style="cursor:pointer">
            📁 Backup-ZIP auswählen…
            <input type="file" accept=".zip" style="display:none" ref="backupImportInput" @change="onBackupFileSelected" />
          </label>
          <span v-if="backupImportFile" class="backup-import-filename">{{ backupImportFile.name }}</span>
          <button v-if="backupImportFile" class="btn btn-primary" :disabled="backupImporting" @click="importBackup">
            <span v-if="backupImporting">⏳ Importiere…</span>
            <span v-else>↩️ Import starten</span>
          </button>
          <span v-if="backupImportMsg" class="backup-msg" :class="backupImportMsgType">{{ backupImportMsg }}</span>
        </div>
      </div>
    </div>

    <!-- Hinweis Auto-Backup -->
    <div class="s-card" style="background:var(--info-bg,#f0f6ff);border-color:var(--info-border,#bfdbfe)">
      <div class="s-card-body" style="display:flex;gap:12px;align-items:flex-start">
        <span style="font-size:20px">ℹ️</span>
        <div style="font-size:13px;color:var(--text);line-height:1.7">
          <strong>Automatisches Backup:</strong> Bei jedem Backend-Start wird automatisch ein Backup erstellt (erkennbar am Suffix <code>_auto</code>).
          Backups werden im Ordner <code>backend/backups/</code> gespeichert.
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
import apiClient from '../../../services/api'

export default {
  name: 'SettingsTabBackup',
  setup() {
    const store = useSettingsFormStore()

    const backupList = ref([])
    const backupLoading = ref(false)
    const backupCreating = ref(false)
    const backupRestoring = ref(null)
    const backupMsg = ref('')
    const backupMsgType = ref('backup-msg-ok')
    const backupImportInput = ref(null)
    const backupImportFile = ref(null)
    const backupImporting = ref(false)
    const backupImportMsg = ref('')
    const backupImportMsgType = ref('backup-msg-ok')

    function fmtBackupDate(iso) {
      if (!iso) return '—'
      const d = new Date(iso)
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' · ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    }

    async function loadBackupList() {
      backupLoading.value = true
      try {
        const r = await apiClient.get('/backup/list')
        backupList.value = r.data.data || []
      } catch (e) { console.error('[Backup] Liste laden fehlgeschlagen:', e) }
      finally { backupLoading.value = false }
    }

    async function createBackup() {
      backupCreating.value = true; backupMsg.value = ''
      try {
        await apiClient.post('/backup/create')
        backupMsg.value = '✓ Backup erfolgreich erstellt'; backupMsgType.value = 'backup-msg-ok'
        await loadBackupList()
      } catch (e) {
        backupMsg.value = '✗ Fehler: ' + (e.response?.data?.error || e.message); backupMsgType.value = 'backup-msg-err'
      } finally { backupCreating.value = false; setTimeout(() => { backupMsg.value = '' }, 4000) }
    }

    async function restoreBackup(filename) {
      if (!confirm('Backup wiederherstellen?\n\n"' + filename + '"\n\nAlle aktuellen Daten werden überschrieben.')) return
      backupRestoring.value = filename
      try {
        await apiClient.post('/backup/restore/' + encodeURIComponent(filename))
        alert('✓ Backup erfolgreich wiederhergestellt. Bitte Seite neu laden.')
        location.reload()
      } catch (e) { alert('✗ Fehler: ' + (e.response?.data?.error || e.message)) }
      finally { backupRestoring.value = null }
    }

    async function deleteBackup(filename) {
      if (!confirm('Backup löschen?\n\n"' + filename + '"')) return
      try { await apiClient.delete('/backup/' + encodeURIComponent(filename)); await loadBackupList() }
      catch (e) { alert('Fehler: ' + (e.response?.data?.error || e.message)) }
    }

    function downloadBackup(filename) {
      const base = apiClient.defaults.baseURL || ''
      const a = document.createElement('a')
      a.href = base + '/backup/download/' + encodeURIComponent(filename)
      a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a)
    }

    function onBackupFileSelected(e) { backupImportFile.value = e.target.files[0] || null; backupImportMsg.value = '' }

    async function importBackup() {
      if (!backupImportFile.value) return
      if (!confirm('Backup importieren und alle aktuellen Daten überschreiben?')) return
      backupImporting.value = true; backupImportMsg.value = ''
      try {
        const fd = new FormData(); fd.append('backup', backupImportFile.value)
        await apiClient.post('/backup/import', fd)
        backupImportMsg.value = '✓ Import erfolgreich. Seite wird neu geladen…'
        backupImportMsgType.value = 'backup-msg-ok'
        setTimeout(() => location.reload(), 1800)
      } catch (e) {
        backupImportMsg.value = '✗ Fehler: ' + (e.response?.data?.error || e.message)
        backupImportMsgType.value = 'backup-msg-err'
      } finally { backupImporting.value = false }
    }

    onMounted(loadBackupList)

    return {
      store, backupList, backupLoading, backupCreating, backupRestoring,
      backupMsg, backupMsgType, backupImportInput, backupImportFile,
      backupImporting, backupImportMsg, backupImportMsgType,
      fmtBackupDate, loadBackupList, createBackup, restoreBackup, deleteBackup,
      downloadBackup, onBackupFileSelected, importBackup,
    }
  }
}
</script>
