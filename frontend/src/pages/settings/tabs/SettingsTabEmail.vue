<template>
  <div class="s-content">

    <div class="s-coming-soon-banner">
      <span class="s-csb-icon">🚧</span>
      <div>
        <div class="s-csb-title">E-Mail-Versand — in Entwicklung</div>
        <div class="s-csb-text">Die SMTP-Anbindung und der direkte Dokumentenversand aus PixFrameWorkspace werden in einer kommenden Version aktiviert. Die Konfiguration kann bereits vorbereitet werden.</div>
      </div>
    </div>

    <div class="s-intro-banner">
      <div class="s-intro-icon">✉️</div>
      <div>
        <div class="s-intro-title">E-Mail-Versand (SMTP)</div>
        <div class="s-intro-text">Konfiguriere deinen E-Mail-Account, um Rechnungen und Angebote direkt aus PixFrameWorkspace zu versenden. Funktioniert mit Gmail, Outlook, GMX, eigenen Servern usw.</div>
      </div>
    </div>

    <div class="s-card">
      <div class="s-card-head"><span class="s-card-title">SMTP-Verbindung</span></div>
      <div class="s-card-body">
        <div class="fg-row">
          <div class="fg" style="flex:2">
            <label>SMTP-Host (Ausgangsserver)</label>
            <input type="text" v-model="store.form.emailConfig.host" placeholder="smtp.gmail.com" />
          </div>
          <div class="fg">
            <label>Port</label>
            <input type="number" v-model.number="store.form.emailConfig.port" placeholder="587" />
          </div>
          <div class="fg" style="flex:0">
            <label>SSL/TLS</label>
            <div class="toggle-row" style="margin-top:8px">
              <button :class="['toggle', store.form.emailConfig.secure ? 'on':'']"
                @click="store.form.emailConfig.secure = !store.form.emailConfig.secure">
                <div class="toggle-knob"></div>
              </button>
              <span class="toggle-label">{{ store.form.emailConfig.secure ? 'SSL (Port 465)' : 'STARTTLS (Port 587)' }}</span>
            </div>
          </div>
        </div>
        <div class="fg-row mt-3">
          <div class="fg">
            <label>Benutzername (E-Mail-Adresse)</label>
            <input type="email" v-model="store.form.emailConfig.user" placeholder="victoria@domain.de" />
          </div>
          <div class="fg">
            <label>App-Passwort / SMTP-Passwort</label>
            <input type="password" v-model="store.form.emailConfig.pass" placeholder="••••••••••••" autocomplete="new-password" />
          </div>
        </div>
        <div class="fg-row mt-3">
          <div class="fg">
            <label>Absendername</label>
            <input type="text" v-model="store.form.emailConfig.fromName" :placeholder="store.form.company.name || 'Studio Name'" />
          </div>
          <div class="fg">
            <label>Absender-E-Mail (falls abweichend)</label>
            <input type="email" v-model="store.form.emailConfig.fromEmail" placeholder="wie Benutzername" />
          </div>
        </div>
      </div>
    </div>

    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">Test-Mail</span>
        <span class="s-card-sub">Sendet eine Test-Mail an die konfigurierte Absender-Adresse</span>
      </div>
      <div class="s-card-body" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button class="btn btn-ghost" @click="sendTestMail" :disabled="emailTestLoading">
          {{ emailTestLoading ? '⏳ Sendet…' : '✉️ Test-Mail senden' }}
        </button>
        <span v-if="emailTestResult" :class="['infobox', emailTestResult.ok ? 'infobox-green' : 'infobox-red']" style="padding:6px 12px">
          {{ emailTestResult.message }}
        </span>
      </div>
    </div>

    <div class="infobox infobox-blue" style="font-size:12.5px">
      <strong>Hinweise:</strong><br>
      Gmail: App-Passwort unter Konto → Sicherheit → 2-Faktor → App-Passwörter erstellen.<br>
      GMX/WEB.DE: IMAP/SMTP aktivieren unter E-Mail-Einstellungen.<br>
      Eigener Server: Zugangsdaten vom Hosting-Anbieter verwenden.
    </div>

  </div>
</template>

<script>
import { ref } from 'vue'
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
import { useSettings } from '../../../stores/useSettings'
import apiClient from '../../../services/api'

export default {
  name: 'SettingsTabEmail',
  setup() {
    const store = useSettingsFormStore()
    const settingsStore = useSettings()

    const emailTestLoading = ref(false)
    const emailTestResult = ref(null)

    async function sendTestMail() {
      emailTestLoading.value = true
      emailTestResult.value = null
      try {
        await settingsStore.saveSettings(store.form)
        const r = await apiClient.post('/email/test', {})
        emailTestResult.value = { ok: true, message: r.data?.message || 'Test-Mail gesendet!' }
      } catch (e) {
        const msg = e.response?.data?.error || e.message || 'Fehler beim Senden'
        emailTestResult.value = { ok: false, message: msg }
      } finally { emailTestLoading.value = false }
    }

    return { store, emailTestLoading, emailTestResult, sendTestMail }
  }
}
</script>
