<template>
  <div class="s-content">
    <div class="s-intro-banner">
      <div class="s-intro-icon">🔒</div>
      <div>
        <div class="s-intro-title">Datenschutzerklärung (DSGVO)</div>
        <div class="s-intro-text">Abschnitte und Unterpunkte sind vollständig editierbar. Wird als eigenständiges PDF-Dokument bereitgestellt.</div>
      </div>
      <div style="display:flex;gap:8px;margin-left:auto;flex-shrink:0">
        <button class="btn btn-sm btn-secondary" title="DSGVO als PDF speichern" @click="store.savePdf('/api/pdf/dsgvo', 'Datenschutzerklaerung')">
          💾 DSGVO als PDF
        </button>
        <button class="btn btn-sm btn-primary" @click="store.addDsgvoParagraph">+ Abschnitt</button>
      </div>
    </div>

    <transition-group name="agb-list" tag="div" class="agb-list">
      <div v-for="(para, idx) in store.dsgvoParagraphs" :key="para.id" class="agb-para-card">
        <div class="agb-para-head">
          <span class="agb-para-num">{{ idx + 1 }}.</span>
          <input v-model="para.title" class="agb-para-title-input" placeholder="Titel des Abschnitts" @input="store.dsgvoDirty = true" />
          <div class="agb-para-actions">
            <button class="agb-btn" :disabled="idx === 0" @click="store.moveDsgvoPara(idx,-1)">▲</button>
            <button class="agb-btn" :disabled="idx === store.dsgvoParagraphs.length-1" @click="store.moveDsgvoPara(idx,1)">▼</button>
            <button class="agb-btn agb-btn-add" @click="store.addDsgvoItem(idx)">+ Punkt</button>
            <button class="agb-btn agb-btn-del" @click="store.deleteDsgvoPara(idx)">✕</button>
          </div>
        </div>
        <div class="agb-items">
          <div v-for="(item, iIdx) in (para.items || [])" :key="iIdx" class="agb-item-row">
            <span class="agb-item-num">{{ idx + 1 }}.{{ iIdx + 1 }}</span>
            <textarea v-model="para.items[iIdx]" class="agb-item-ta" rows="2"
              :placeholder="`Unterpunkt ${iIdx + 1}…`"
              @input="store.dsgvoDirty = true; store.autoResizeAGB($event)"
              @focus="store.autoResizeAGB($event)" />
            <button class="agb-item-del" @click="store.deleteDsgvoItem(idx, iIdx)">✕</button>
          </div>
          <div v-if="!para.items || para.items.length === 0" class="agb-no-items">Noch keine Unterpunkte — klicke „+ Punkt"</div>
        </div>
      </div>
    </transition-group>
    <div v-if="store.dsgvoParagraphs.length === 0" class="agb-empty">Noch keine Abschnitte. Klicke oben auf „+ Abschnitt".</div>
  </div>
</template>

<script>
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
export default {
  name: 'SettingsTabDsgvo',
  setup() { return { store: useSettingsFormStore() } }
}
</script>
