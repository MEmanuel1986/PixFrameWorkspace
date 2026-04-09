<template>
  <div class="s-content">
    <div class="s-intro-banner">
      <div class="s-intro-icon">🔢</div>
      <div>
        <div class="s-intro-title">Nummernkreise</div>
        <div class="s-intro-text">Nutze Platzhalter in der Formatvorlage. Die Vorschau aktualisiert sich live.</div>
      </div>
    </div>

    <!-- Token-Referenz-Leiste -->
    <div class="num-token-bar">
      <div v-for="t in store.numTokens" :key="t.token" class="num-token" :title="t.hint">
        <div class="num-token-label">{{ t.label }}</div>
        <code class="num-token-code">{{ t.token }}</code>
      </div>
    </div>

    <!-- Schemas -->
    <div class="num-group-label">📄 Dokumente</div>

    <div v-for="schema in store.numSchemasDocs" :key="schema.key" class="s-card num-schema-card">
      <div class="s-card-head">
        <span class="s-card-title">{{ schema.label }}</span>
        <code class="num-preview">{{ store.buildFromFormat(store.form.numberSchemas[schema.key]?.format, schema.key) }}</code>
      </div>
      <div class="s-card-body">
        <div class="num-format-row">
          <div class="fg" style="flex:1">
            <label>Formatvorlage</label>
            <input v-model="store.form.numberSchemas[schema.key].format" type="text"
              class="num-format-input" :placeholder="schema.placeholder" spellcheck="false" />
          </div>
          <div class="fg num-start-field" v-if="schema.hasStart">
            <label>Startwert</label>
            <input v-model.number="store.form.numberSchemas[schema.key].start" type="number" min="1" style="width:80px" />
          </div>
        </div>
        <div class="num-hint" v-if="schema.locked">
          <span class="num-locked-icon">🔒</span> Nicht mehr änderbar — es existieren bereits Dokumente dieses Typs
        </div>
      </div>
    </div>

    <div class="num-group-label">👤 Stammdaten</div>

    <div v-for="schema in store.numSchemasStamm" :key="schema.key" class="s-card num-schema-card">
      <div class="s-card-head">
        <span class="s-card-title">{{ schema.label }}</span>
        <code class="num-preview">{{ store.buildFromFormat(store.form.numberSchemas[schema.key]?.format, schema.key) }}</code>
      </div>
      <div class="s-card-body">
        <div class="num-format-row">
          <div class="fg" style="flex:1">
            <label>Formatvorlage</label>
            <input v-model="store.form.numberSchemas[schema.key].format" type="text"
              class="num-format-input" :placeholder="schema.placeholder" spellcheck="false" />
          </div>
          <div class="fg num-start-field" v-if="schema.hasStart">
            <label>Startwert</label>
            <input v-model.number="store.form.numberSchemas[schema.key].start" type="number" min="1" style="width:80px" />
          </div>
        </div>
        <div class="num-hint" v-if="schema.locked">
          <span class="num-locked-icon">🔒</span> Nicht mehr änderbar — es existieren bereits Einträge dieses Typs
        </div>
      </div>
    </div>

    <div class="num-group-label">↩ Abgeleitete Nummern</div>

    <div v-for="schema in store.numSchemasAbgeleitet" :key="schema.key" class="s-card num-schema-card">
      <div class="s-card-head">
        <span class="s-card-title">{{ schema.label }}</span>
        <code class="num-preview">
          {{ store.form.numberSchemas[schema.key]?.prefix }}{{ store.form.numberSchemas[schema.key]?.separator }}RE-2026-03/00042
        </code>
      </div>
      <div class="s-card-body">
        <div class="num-format-row">
          <div class="fg">
            <label>Präfix</label>
            <input v-model="store.form.numberSchemas[schema.key].prefix" type="text"
              class="num-format-input" style="width:140px"
              :placeholder="schema.key === 'correction' ? 'KOR' : 'STORNO'" />
          </div>
          <div class="fg">
            <label>Trennzeichen</label>
            <select v-model="store.form.numberSchemas[schema.key].separator" style="width:120px">
              <option value="-">Bindestrich  —</option>
              <option value="/">Schrägstrich  /</option>
              <option value="_">Unterstrich  _</option>
              <option value=" ">Leerzeichen</option>
              <option value="">Keines</option>
            </select>
          </div>
        </div>
        <div class="num-hint">ℹ️ {{ schema.hint }}</div>
      </div>
    </div>

  </div>
</template>

<script>
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
export default {
  name: 'SettingsTabNumbers',
  setup() {
    return { store: useSettingsFormStore() }
  }
}
</script>
