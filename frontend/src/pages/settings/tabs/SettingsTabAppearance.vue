<template>
  <div class="s-content">
    <div class="s-card">
      <div class="s-card-head"><span class="s-card-title">Farbmodus</span></div>
      <div class="s-card-body">
        <div class="appear-row">
          <div>
            <div class="appear-label">Hell / Dunkel</div>
            <div class="hint">Wechsel zwischen hellem und dunklem Interface</div>
          </div>
          <div class="theme-toggle">
            <button class="theme-btn" :class="{ active: store.theme === 'light' }" @click="store.applyTheme('light')">☀️ Hell</button>
            <button class="theme-btn" :class="{ active: store.theme === 'dark' }"  @click="store.applyTheme('dark')">🌙 Dunkel</button>
          </div>
        </div>
      </div>
    </div>

    <div class="s-card">
      <div class="s-card-head"><span class="s-card-title">Sprache & Region</span></div>
      <div class="s-card-body">
        <div class="fg-row">
          <div class="fg">
            <label>Sprache</label>
            <select v-model="store.form.locale">
              <option value="de">🇩🇪 Deutsch</option>
              <option value="en">🇬🇧 Englisch (bald verfügbar)</option>
            </select>
          </div>
          <div class="fg">
            <label>Währung</label>
            <select v-model="store.form.currency">
              <option value="EUR">€ Euro</option>
              <option value="CHF">₣ Schweizer Franken</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
export default {
  name: 'SettingsTabAppearance',
  setup() {
    return { store: useSettingsFormStore() }
  }
}
</script>
