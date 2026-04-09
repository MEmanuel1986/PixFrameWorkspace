<template>
  <div class="s-content">

    <div class="s-intro-banner">
      <div class="s-intro-icon">📅</div>
      <div>
        <div class="s-intro-title">Kalender-Einstellungen</div>
        <div class="s-intro-text">Diese Einstellungen gelten für die Kalenderansicht. Bundesländer und Ferien-Anzeige werden direkt im Kalender eingestellt.</div>
      </div>
      <router-link to="/calendar" class="btn btn-sm btn-primary" style="margin-left:auto;flex-shrink:0">📅 Zum Kalender</router-link>
    </div>

    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">Wiedervorlage Angebote</span>
        <span class="s-card-sub">Automatische Follow-up Erinnerung nach Angebotsversand</span>
      </div>
      <div class="s-card-body">
        <div class="fg-row">
          <div class="fg">
            <label>Tage bis zur Wiedervorlage</label>
            <div class="inp-unit-wrap">
              <input type="number" min="1" max="90" step="1"
                :value="store.form.calendarSettings?.quoteFollowUpDays ?? 14"
                @input="e => { if (!store.form.calendarSettings) store.form.calendarSettings = {}; store.form.calendarSettings.quoteFollowUpDays = parseInt(e.target.value) || 14 }" />
              <span class="inp-unit">Tage</span>
            </div>
            <span class="hint">Nach diesem Zeitraum erscheint im Kalender eine Wiedervorlage-Erinnerung beim Angebot (Status: Versendet)</span>
          </div>
        </div>
      </div>
    </div>

    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">🎉 Feiertage — Standard-Bundesländer</span>
        <span class="s-card-sub">Vorauswahl beim Öffnen des Kalenders</span>
      </div>
      <div class="s-card-body">
        <div class="fg" style="max-width:280px;margin-bottom:12px">
          <label>Schnellauswahl (ein Bundesland)</label>
          <select @change="e => { store.toggleCalBlSingle(e.target.value, 'bundeslaender') }">
            <option value="">— Auswahl unverändert lassen —</option>
            <option v-for="bl in store.bundeslaenderList" :key="bl.code" :value="bl.code">
              {{ bl.code }} – {{ bl.label }}
            </option>
          </select>
        </div>
        <div class="bl-grid">
          <label v-for="bl in store.bundeslaenderList" :key="bl.code" class="bl-label">
            <input type="checkbox" :value="bl.code"
              :checked="(store.form.calendarSettings?.bundeslaender || []).includes(bl.code)"
              @change="store.toggleCalBl(bl.code, 'bundeslaender')" />
            <span>{{ bl.code }} — {{ bl.label }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">🏫 Schulferien — Standard-Bundesländer</span>
        <span class="s-card-sub">Vorauswahl beim Öffnen des Kalenders</span>
      </div>
      <div class="s-card-body">
        <div class="fg" style="max-width:280px;margin-bottom:12px">
          <label>Schnellauswahl (ein Bundesland)</label>
          <select @change="e => { store.toggleCalBlSingle(e.target.value, 'ferienBundeslaender') }">
            <option value="">— Auswahl unverändert lassen —</option>
            <option v-for="bl in store.bundeslaenderList" :key="bl.code" :value="bl.code">
              {{ bl.code }} – {{ bl.label }}
            </option>
          </select>
        </div>
        <div class="bl-grid">
          <label v-for="bl in store.bundeslaenderList" :key="bl.code" class="bl-label">
            <input type="checkbox" :value="bl.code"
              :checked="(store.form.calendarSettings?.ferienBundeslaender || []).includes(bl.code)"
              @change="store.toggleCalBl(bl.code, 'ferienBundeslaender')" />
            <span>{{ bl.code }} — {{ bl.label }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Datenquellen + Cache -->
    <div class="s-card">
      <div class="s-card-head"><span class="s-card-title">🌐 Datenquellen & Cache</span></div>
      <div class="s-card-body" style="display:flex;flex-direction:column;gap:10px">
        <div class="infobox infobox-green" style="font-size:12.5px">
          <strong>🎉 Feiertage:</strong>
          <a href="https://feiertage-api.de" target="_blank" style="color:inherit;font-weight:600;margin-left:4px">feiertage-api.de</a>
          — offizielle kostenlose JSON-API · Offline-Fallback via eingebautem Gauß-Algorithmus
        </div>
        <div class="infobox infobox-blue" style="font-size:12.5px">
          <strong>🏫 Schulferien:</strong>
          <a href="https://ferien-api.de" target="_blank" style="color:inherit;font-weight:600;margin-left:4px">ferien-api.de</a>
          — kostenlose JSON-API für alle 16 Bundesländer · Fallback: schulferien.org iCal
        </div>
        <div class="infobox" style="font-size:12.5px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          Daten werden <strong>24h im Backend gecacht</strong>.
          <button class="btn btn-sm btn-ghost" @click="clearHolidayCache" :disabled="cacheClearLoading">
            {{ cacheClearLoading ? 'Wird geleert…' : '🗑 Cache leeren' }}
          </button>
          <span v-if="cacheClearMsg" style="color:var(--success);font-size:12px;font-weight:600">{{ cacheClearMsg }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref } from 'vue'
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
import apiClient from '../../../services/api'

export default {
  name: 'SettingsTabCalendar',
  setup() {
    const store = useSettingsFormStore()

    const cacheClearLoading = ref(false)
    const cacheClearMsg = ref('')

    async function clearHolidayCache() {
      cacheClearLoading.value = true; cacheClearMsg.value = ''
      try {
        await apiClient.delete('/holidays/cache')
        cacheClearMsg.value = '✓ Cache geleert'
        setTimeout(() => { cacheClearMsg.value = '' }, 3000)
      } catch { cacheClearMsg.value = 'Fehler beim Leeren' }
      finally { cacheClearLoading.value = false }
    }

    return { store, cacheClearLoading, cacheClearMsg, clearHolidayCache }
  }
}
</script>
