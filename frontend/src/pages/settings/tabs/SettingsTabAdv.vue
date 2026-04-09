<template>
  <div class="s-content">
    <div class="s-intro-banner">
      <div class="s-intro-icon">📋</div>
      <div>
        <div class="s-intro-title">Auftragsverarbeitungsvertrag (ADV, Art. 28 DSGVO)</div>
        <div class="s-intro-text">Wird bei B2B-Aufträgen eingesetzt, wenn der Auftraggeber personenbezogene Daten zur Verfügung stellt. Inklusive Unterschriftenblock.</div>
      </div>
      <div style="display:flex;gap:8px;margin-left:auto;flex-shrink:0">
        <button class="btn btn-sm btn-secondary" title="ADV-Vertrag als PDF speichern" @click="store.savePdf('/api/pdf/adv-vertrag', 'ADV_Vertrag')">
          💾 ADV als PDF
        </button>
        <button class="btn btn-sm btn-primary" @click="store.addAdvParagraph">+ Abschnitt</button>
      </div>
    </div>

    <transition-group name="agb-list" tag="div" class="agb-list">
      <div v-for="(para, idx) in store.advParagraphs" :key="para.id" class="agb-para-card">
        <div class="agb-para-head">
          <span class="agb-para-num">{{ idx + 1 }}.</span>
          <input v-model="para.title" class="agb-para-title-input" placeholder="Titel des Abschnitts" @input="store.advDirty = true" />
          <div class="agb-para-actions">
            <button class="agb-btn" :disabled="idx === 0" @click="store.moveAdvPara(idx,-1)">▲</button>
            <button class="agb-btn" :disabled="idx === store.advParagraphs.length-1" @click="store.moveAdvPara(idx,1)">▼</button>
            <button class="agb-btn agb-btn-add" @click="store.addAdvItem(idx)">+ Punkt</button>
            <button class="agb-btn agb-btn-del" @click="store.deleteAdvPara(idx)">✕</button>
          </div>
        </div>
        <div class="agb-items">
          <div v-for="(item, iIdx) in (para.items || [])" :key="iIdx" class="agb-item-row">
            <span class="agb-item-num">{{ idx + 1 }}.{{ iIdx + 1 }}</span>
            <textarea v-model="para.items[iIdx]" class="agb-item-ta" rows="2"
              :placeholder="`Unterpunkt ${iIdx + 1}…`"
              @input="store.advDirty = true; store.autoResizeAGB($event)"
              @focus="store.autoResizeAGB($event)" />
            <button class="agb-item-del" @click="store.deleteAdvItem(idx, iIdx)">✕</button>
          </div>
          <div v-if="!para.items || para.items.length === 0" class="agb-no-items">Noch keine Unterpunkte — klicke „+ Punkt"</div>
        </div>
      </div>
    </transition-group>
    <div v-if="store.advParagraphs.length === 0" class="agb-empty">Noch keine Abschnitte. Klicke oben auf „+ Abschnitt".</div>
  </div>
</template>

<script>
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
export default {
  name: 'SettingsTabAdv',
  setup() { return { store: useSettingsFormStore() } }
}
</script>
