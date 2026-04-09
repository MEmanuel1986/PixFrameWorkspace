<template>
  <div class="s-content">

    <div class="s-intro-banner">
      <div class="s-intro-icon">§</div>
      <div>
        <div class="s-intro-title">Allgemeine Geschäftsbedingungen</div>
        <div class="s-intro-text">Paragraphen und Unterpunkte sind vollständig editierbar. Nummern werden automatisch aus der Reihenfolge berechnet.</div>
      </div>
      <div style="display:flex;gap:8px;margin-left:auto;flex-shrink:0">
        <button class="btn btn-sm btn-secondary" title="AGB als PDF speichern" @click="store.savePdf('/api/pdf/agb', 'AGB')">
          💾 AGB als PDF
        </button>
        <button class="btn btn-sm btn-primary" @click="store.addAgbParagraph">+ Paragraph</button>
      </div>
    </div>

    <transition-group name="agb-list" tag="div" class="agb-list">
      <div v-for="(para, idx) in store.agbParagraphs" :key="para.id" class="agb-para-card">
        <div class="agb-para-head">
          <span class="agb-para-num">§ {{ idx + 1 }}</span>
          <input v-model="para.title" class="agb-para-title-input" placeholder="Titel des Paragraphen"
            @input="store.agbDirty = true" />
          <div class="agb-para-actions">
            <button class="agb-btn" :disabled="idx === 0" @click="store.moveAgbPara(idx,-1)" title="Nach oben">▲</button>
            <button class="agb-btn" :disabled="idx === store.agbParagraphs.length-1" @click="store.moveAgbPara(idx,1)" title="Nach unten">▼</button>
            <button class="agb-btn agb-btn-add" @click="store.addAgbItem(idx)" title="Unterpunkt hinzufügen">+ Punkt</button>
            <button class="agb-btn agb-btn-del" @click="store.deleteAgbPara(idx)" title="Paragraph löschen">✕ §</button>
          </div>
        </div>
        <div class="agb-items">
          <div v-for="(item, iIdx) in (para.items || [])" :key="iIdx" class="agb-item-row">
            <span class="agb-item-num">{{ idx + 1 }}.{{ iIdx + 1 }}</span>
            <textarea v-model="para.items[iIdx]" class="agb-item-ta" rows="2"
              :placeholder="`Unterpunkt ${iIdx + 1}…`"
              @input="store.agbDirty = true; store.autoResizeAGB($event)"
              @focus="store.autoResizeAGB($event)" />
            <button class="agb-item-del" @click="store.deleteAgbItem(idx, iIdx)" title="Punkt löschen">✕</button>
          </div>
          <div v-if="!para.items || para.items.length === 0" class="agb-no-items">
            Noch keine Unterpunkte — klicke „+ Punkt"
          </div>
        </div>
      </div>
    </transition-group>

    <div v-if="store.agbParagraphs.length === 0" class="agb-empty">
      Noch keine Paragraphen. Klicke oben auf „+ Paragraph".
    </div>

  </div>
</template>

<script>
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
export default {
  name: 'SettingsTabAgb',
  setup() {
    return { store: useSettingsFormStore() }
  }
}
</script>
