<template>
  <div class="settings-page">

    <!-- ── Tab Bar (gruppiert) ── -->
    <div class="settings-tabbar">
      <nav class="settings-nav">

        <!-- Direkte Tabs (immer sichtbar) -->
        <template v-for="item in store.navItems" :key="item.id || item.group">

          <!-- Gruppe mit Dropdown -->
          <div v-if="item.children" class="s-group"
            :class="{ 'group-active': item.children.some(c => c.id === store.activeTab) }"
            @mouseenter="store.openGroup = item.group"
            @mouseleave="store.openGroup = null"
            @click="store.openGroup = store.openGroup === item.group ? null : item.group">

            <button class="s-tab s-group-btn"
              :class="{ active: item.children.some(c => c.id === store.activeTab) }">
              <span>{{ item.icon }}</span>
              <span>{{ item.label }}</span>
              <span v-if="item.children.some(c => c.id === store.activeTab)" class="s-active-child">
                · {{ item.children.find(c => c.id === store.activeTab)?.label }}
              </span>
              <span class="s-group-arrow" :class="{ open: store.openGroup === item.group }">›</span>
            </button>

            <!-- Dropdown -->
            <div v-show="store.openGroup === item.group" class="s-dropdown">
              <button v-for="child in item.children" :key="child.id"
                class="s-dropdown-item"
                :class="{ active: store.activeTab === child.id, disabled: child.disabled }"
                :disabled="child.disabled"
                @click.stop="store.selectTab(child.id)">
                <span class="s-dd-icon">{{ child.icon }}</span>
                <span>{{ child.label }}</span>
                <span v-if="child.count" class="s-tab-badge">{{ child.count }}</span>
              </button>
            </div>
          </div>

          <!-- Einfacher Tab -->
          <button v-else
            class="s-tab"
            :class="{ active: store.activeTab === item.id }"
            @click="store.selectTab(item.id)">
            <span>{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.count" class="s-tab-badge">{{ item.count }}</span>
          </button>

        </template>
      </nav>

      <transition name="fade-in">
        <div v-if="store.isSettingsTab" class="save-zone">
          <transition name="fade-in">
            <span v-if="store.saved" class="saved-msg">✓ Gespeichert</span>
          </transition>
          <button class="btn btn-primary btn-sm" :disabled="store.saving" @click="store.saveAll">
            {{ store.saving ? 'Speichern…' : 'Speichern' }}
          </button>
        </div>
      </transition>
    </div>

    <!-- ── Body ── -->
    <div class="settings-body">
      <component :is="currentTabComponent" />
    </div>
  </div>
</template>

<script>
import { computed, onMounted, watch } from 'vue'
import { useSettingsFormStore } from '../../stores/useSettingsFormStore'

import SettingsTabCompany from './tabs/SettingsTabCompany.vue'
import SettingsTabBooking from './tabs/SettingsTabBooking.vue'
import SettingsTabClauses from './tabs/SettingsTabClauses.vue'
import SettingsTabNumbers from './tabs/SettingsTabNumbers.vue'
import SettingsTabCalendar from './tabs/SettingsTabCalendar.vue'
import SettingsTabEmail from './tabs/SettingsTabEmail.vue'
import SettingsTabAppearance from './tabs/SettingsTabAppearance.vue'
import SettingsTabAgb from './tabs/SettingsTabAgb.vue'
import SettingsTabDsgvo from './tabs/SettingsTabDsgvo.vue'
import SettingsTabAdv from './tabs/SettingsTabAdv.vue'
import SettingsTabBackup from './tabs/SettingsTabBackup.vue'
import SettingsTabUpdate from './tabs/SettingsTabUpdate.vue'
import SettingsTabSystem from './tabs/SettingsTabSystem.vue'

const tabComponents = {
  company: SettingsTabCompany,
  booking: SettingsTabBooking,
  clauses: SettingsTabClauses,
  numbers: SettingsTabNumbers,
  calendar: SettingsTabCalendar,
  email: SettingsTabEmail,
  appearance: SettingsTabAppearance,
  agb: SettingsTabAgb,
  dsgvo: SettingsTabDsgvo,
  adv: SettingsTabAdv,
  backup: SettingsTabBackup,
  update: SettingsTabUpdate,
  system: SettingsTabSystem,
}

export default {
  name: 'SettingsPage',
  setup() {
    const store = useSettingsFormStore()

    const currentTabComponent = computed(() =>
      tabComponents[store.activeTab] || SettingsTabCompany
    )

    onMounted(() => {
      store.initForm()
    })

    return { store, currentTabComponent }
  }
}
</script>

<style>
/* ══ Settings Shared Styles (unscoped — used by all tab components) ══ */

/* ── Shell ── */
.settings-page {
  display: flex; flex-direction: column;
  height: calc(100vh - 52px);
  margin: -28px -32px;
  overflow: visible;
}

/* ── Tab bar ── */
.settings-tabbar {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 0 16px 0 8px; flex-shrink: 0; gap: 12px; min-height: 46px;
  position: sticky; top: 0; z-index: 100;
  overflow: visible;
}
.settings-nav {
  display: flex; align-items: stretch; flex: 1; min-width: 0;
  overflow: visible;
}
.s-tab {
  display: flex; align-items: center; gap: 5px;
  padding: 0 13px; height: 46px;
  border: none; background: none;
  font-size: 13px; font-weight: 500; font-family: inherit;
  color: var(--text-muted); cursor: pointer; white-space: nowrap;
  border-bottom: 2.5px solid transparent; margin-bottom: -1px;
  transition: color .14s, border-color .14s; flex-shrink: 0;
}
.s-tab:hover  { color: var(--text); }
.s-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
.s-tab-badge {
  background: var(--primary-light); color: var(--primary-text);
  font-size: 10px; font-weight: 700;
  padding: 1px 6px; border-radius: 10px; line-height: 1.4;
}
.s-group { position: relative; display: flex; align-items: stretch; }
.group-active > .s-group-btn { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
.s-active-child { font-size: 11px; color: var(--primary); opacity: .8; margin-left: 1px; }
.s-group-arrow {
  font-size: 14px; display: inline-block; transition: transform .18s;
  margin-left: 1px; opacity: .5; transform: rotate(90deg);
}
.s-group-arrow.open { transform: rotate(270deg); opacity: .8; }
.s-dropdown {
  position: absolute; top: calc(100% + 1px); left: 0;
  min-width: 180px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12); padding: 4px; z-index: 9999;
  animation: ddFadeIn .14s ease;
}
@keyframes ddFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.s-dropdown-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 12px; border: none; background: none; cursor: pointer;
  font-size: 13px; font-weight: 500; font-family: inherit;
  color: var(--text); border-radius: 6px; text-align: left;
  transition: background .1s, color .1s;
}
.s-dropdown-item:hover  { background: var(--hover-bg, rgba(79,70,229,.07)); color: var(--primary); }
.s-dropdown-item.active { background: var(--primary-light); color: var(--primary); font-weight: 600; }
.s-dropdown-item.disabled { opacity: .45; cursor: not-allowed; }
.s-dd-icon { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }

.save-zone  { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.saved-msg  { font-size: 12px; color: var(--success); font-weight: 600; white-space: nowrap; }
.fade-in-enter-active, .fade-in-leave-active { transition: opacity .2s; }
.fade-in-enter-from,   .fade-in-leave-to     { opacity: 0; }

/* ── Body ── */
.settings-body { flex: 1; overflow-y: auto; overflow-x: visible; background: var(--bg); }
.s-content { padding: 24px 28px 60px; display: flex; flex-direction: column; gap: 14px; }
.s-intro { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin: 0; }

/* ── Cards ── */
.s-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px); overflow: hidden; box-shadow: var(--shadow-sm);
}
.s-card-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 18px 12px; border-bottom: 1px solid var(--border); background: var(--surface);
}
.s-card-title { font-size: 13px; font-weight: 700; color: var(--text); }
.s-card-sub { font-size: 11.5px; color: var(--text-muted); font-weight: 400; }
.s-card-body { padding: 18px; }
.s-card-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px 12px; border-bottom: 1px solid var(--border); }
.s-card-icon { font-size: 18px; }
.s-card-count { font-size: 11px; color: var(--text-muted); margin-left: auto; }
.s-card-subtitle { font-size: 11.5px; color: var(--text-muted); margin: 0; }

/* ── Form elements ── */
.fg { display: flex; flex-direction: column; gap: 5px; }
.fg label {
  font-size: 11.5px; font-weight: 600; color: var(--text-2);
  text-transform: uppercase; letter-spacing: .4px;
}
.fg input, .fg select, .fg textarea {
  padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius, 6px);
  font-size: 13px; background: var(--surface); color: var(--text);
  font-family: inherit; transition: border-color .15s; width: 100%;
}
.fg input:focus, .fg select:focus, .fg textarea:focus {
  outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,70,229,.1);
}
.fg input:disabled { opacity: .45; cursor: not-allowed; background: var(--bg-alt); }
.fg textarea { resize: vertical; }
.input-lg { font-size: 15px !important; font-weight: 600 !important; }
.sub { font-size: 11px; color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0; }
.fg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fg-row-3 { grid-template-columns: 1fr 1fr 1fr; }
.fg-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.mt-3 { margin-top: 12px; }

/* ── Logo ── */
.logo-row    { display: flex; gap: 18px; align-items: flex-start; }
.logo-fields { flex: 1; }
.logo-drop {
  width: 108px; min-width: 108px; height: 108px;
  border: 2px dashed var(--border); border-radius: 10px; cursor: pointer; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: var(--bg-alt); transition: border-color .15s, background .15s;
}
.logo-drop:hover, .logo-drop.over { border-color: var(--primary); background: var(--primary-light); }
.logo-drop.filled { border-style: solid; border-color: var(--border); background: var(--surface); }
.logo-img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
.logo-placeholder { display: flex; flex-direction: column; align-items: center; gap: 5px; color: var(--text-muted); }
.logo-placeholder span { font-size: 11px; font-weight: 600; }
.logo-fmt { font-size: 10px !important; font-weight: 400 !important; opacity: .6; }

/* ── Hints / Infobox ── */
.hint        { font-size: 11.5px; color: var(--text-muted); margin: 2px 0 0; }
.hint.danger { color: var(--danger); }
.hint-inline { font-size: 13px; color: var(--text-2); }
.hint-inline strong { color: var(--primary-text); }
.infobox { padding: 10px 14px; border-radius: 6px; font-size: 12.5px; line-height: 1.6; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.infobox-yellow { background: #fffbeb; color: #92400e; border-color: #fde68a; }
.infobox-blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.infobox-green { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
.infobox-red { background: #fef2f2; color: #991b1b; border-color: #fecaca; }

/* ── Toggle / Checkbox ── */
.toggle-row   { display: flex; align-items: flex-start; gap: 12px; }
.toggle       { width: 40px; min-width: 40px; height: 22px; border-radius: 11px; background: var(--border); border: none; position: relative; cursor: pointer; transition: background .2s; flex-shrink: 0; padding: 0; }
.toggle.on    { background: var(--primary); }
.toggle-knob  { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: white; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,.25); pointer-events: none; }
.toggle.on .toggle-knob { left: 21px; }
.toggle-label { font-size: 13px; font-weight: 600; color: var(--text); }
.chk-row  { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; }
.chk-box  { width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0; accent-color: var(--primary); cursor: pointer; }

/* ── Input unit wrap ── */
.inp-unit-wrap { display: flex; align-items: center; }
.inp-unit-wrap input {
  flex: 1; border-radius: var(--radius, 6px) 0 0 var(--radius, 6px);
  border: 1px solid var(--border); padding: 7px 10px;
  background: var(--surface); color: var(--text); font-size: 13px; font-family: inherit;
}
.inp-unit-wrap input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
.inp-unit {
  padding: 7px 10px; background: var(--bg-alt);
  border: 1px solid var(--border); border-left: none;
  border-radius: 0 var(--radius, 6px) var(--radius, 6px) 0;
  font-size: 12px; color: var(--text-muted); white-space: nowrap;
}

/* ── Rates section label ── */
.s-rates-section-label { font-size: 12px; font-weight: 700; color: var(--text-2); margin-bottom: 6px; }

/* ── NR mode chips ── */
.nr-mode-chips { display: flex; flex-direction: column; gap: 10px; }
.nr-mode-chip {
  display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px;
  border: 2px solid var(--border); border-radius: var(--radius-lg, 10px);
  cursor: pointer; transition: all .14s; background: var(--surface);
}
.nr-mode-chip.active { border-color: var(--primary); background: var(--primary-light); }
.nr-mode-chip:hover:not(.active) { border-color: rgba(79,70,229,.3); }
.nr-mode-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.nr-mode-content { flex: 1; }
.nr-mode-title { font-size: 13.5px; font-weight: 700; color: var(--text); }
.nr-mode-desc { font-size: 12px; color: var(--text-muted); margin-top: 3px; line-height: 1.5; }
.nr-mode-check { font-size: 16px; font-weight: 700; color: var(--primary); flex-shrink: 0; width: 20px; text-align: center; }

/* ── Cancellation fee table ── */
.cancellation-table { display: flex; flex-direction: column; gap: 6px; }
.ct-header {
  display: grid; grid-template-columns: 130px 130px 1fr 36px; gap: 8px; padding: 0 4px;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted);
}
.ct-row { display: grid; grid-template-columns: 130px 130px 1fr 36px; gap: 8px; align-items: center; }
.ct-row .fg input { padding: 7px 10px; }
.ct-label-col input { width: 100%; }

/* ── Payment methods grid ── */
.payment-methods-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.pm-check-label {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  border: 1.5px solid var(--border); border-radius: 8px; cursor: pointer;
  transition: all .12s; font-size: 13px;
}
.pm-check-label.active { border-color: var(--primary); background: var(--primary-light); }
.pm-check-label:hover:not(.active) { border-color: rgba(79,70,229,.3); }
.pm-check-icon { font-size: 15px; }
.pm-check-name { font-weight: 500; }
.pm-check-tick { font-size: 14px; color: var(--primary); font-weight: 700; width: 16px; text-align: center; }

/* ── Clause items ── */
.clause-default-label {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px; border: 1.5px solid var(--border);
  font-size: 16px; cursor: pointer; color: var(--text-muted); background: var(--surface); transition: all .12s;
}
.clause-default-label.active { color: #d97706; border-color: #f59e0b; background: #fffbeb; }
.clause-default-label:hover { border-color: #f59e0b; color: #d97706; }
.clause-item {
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: 14px; margin-bottom: 12px; background: var(--bg-alt);
}
.clause-item:last-of-type { margin-bottom: 0; }
.clause-header { display: flex; gap: 12px; align-items: flex-start; }
.para-ta {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius);
  font-size: 12.5px; font-family: inherit; color: var(--text); background: var(--surface);
  resize: vertical; line-height: 1.6;
}
.para-ta:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,70,229,.07); }

/* ── AGB Editor ── */
.agb-list { display: flex; flex-direction: column; gap: 14px; }
.agb-para-card {
  border: 1px solid var(--border); border-radius: var(--radius-lg, 10px);
  overflow: hidden; transition: box-shadow .15s;
}
.agb-para-card:hover { box-shadow: 0 2px 10px rgba(79,70,229,.08); }
.agb-para-head {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: var(--bg-alt, #f8fafc); border-bottom: 1px solid var(--border);
}
.agb-para-num {
  font-size: 13px; font-weight: 800; color: var(--primary);
  background: var(--primary-light); border-radius: 6px; padding: 3px 9px;
  flex-shrink: 0; min-width: 38px; text-align: center;
}
.agb-para-title-input {
  flex: 1; border: none; background: transparent;
  font-size: 13.5px; font-weight: 700; color: var(--text);
  outline: none; padding: 4px 6px; border-radius: 4px; transition: background .12s;
}
.agb-para-title-input:focus { background: white; box-shadow: 0 0 0 2px rgba(79,70,229,.18); }
.agb-para-title-input::placeholder { color: var(--text-muted); font-weight: 400; }
.agb-para-actions { display: flex; gap: 4px; flex-shrink: 0; }
.agb-btn {
  background: none; border: 1px solid var(--border); border-radius: 5px; padding: 3px 8px;
  font-size: 11px; cursor: pointer; color: var(--text-2); transition: all .12s;
}
.agb-btn:hover:not(:disabled) { background: var(--bg-alt); border-color: var(--primary); color: var(--primary); }
.agb-btn:disabled { opacity: .35; cursor: default; }
.agb-btn-del:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
.agb-btn-add { color: var(--primary) !important; border-color: rgba(79,70,229,.3) !important; }
.agb-btn-add:hover { background: var(--primary-light) !important; }
.agb-items { padding: 10px 16px 14px; display: flex; flex-direction: column; gap: 6px; }
.agb-item-row { display: flex; align-items: flex-start; gap: 8px; }
.agb-item-num {
  font-size: 11.5px; font-weight: 700; color: var(--primary);
  background: var(--primary-light); border-radius: 5px;
  padding: 4px 7px; flex-shrink: 0; margin-top: 6px; min-width: 36px; text-align: center;
}
.agb-item-ta {
  flex: 1; border: 1px solid var(--border); border-radius: var(--radius, 6px);
  padding: 7px 10px; font-size: 13px; line-height: 1.6; font-family: inherit; color: var(--text);
  resize: none; overflow: hidden; min-height: 36px; transition: border-color .12s; background: var(--surface);
}
.agb-item-ta:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(79,70,229,.12); }
.agb-item-del {
  background: none; border: 1px solid transparent; color: var(--text-muted); cursor: pointer;
  padding: 4px 7px; border-radius: 5px; font-size: 12px; margin-top: 6px; flex-shrink: 0; transition: all .12s;
}
.agb-item-del:hover { color: #ef4444; border-color: #ef4444; background: #fef2f2; }
.agb-no-items { font-size: 12px; color: var(--text-muted); padding: 8px 4px; font-style: italic; }
.agb-empty {
  text-align: center; padding: 40px; color: var(--text-muted); font-size: 13px;
  border: 2px dashed var(--border); border-radius: var(--radius-lg);
}
.agb-list-enter-active, .agb-list-leave-active { transition: all .2s ease; }
.agb-list-enter-from { opacity: 0; transform: translateY(-8px); }
.agb-list-leave-to   { opacity: 0; transform: translateX(20px); }

/* ── Contract Paragraph labeled items ── */
.cp-para-num { min-width: 52px; font-size: 11px; }
.cp-item-row { align-items: flex-start; }
.cp-item-left { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.cp-item-label-input {
  border: 1px solid var(--border); border-radius: var(--radius, 6px);
  padding: 5px 10px; font-size: 12px; font-weight: 600;
  color: var(--primary); background: var(--primary-light); outline: none; transition: border-color .12s;
}
.cp-item-label-input:focus { border-color: var(--primary); background: white; }
.cp-item-label-input::placeholder { color: var(--text-muted); font-weight: 400; }
.cp-item-ta { min-height: 64px; }

/* ── Intro banner ── */
.s-intro-banner {
  display: flex; align-items: flex-start; gap: 14px;
  background: var(--primary-light); border: 1px solid rgba(79,70,229,.18);
  border-radius: var(--radius-lg, 10px); padding: 14px 18px; margin-bottom: 18px;
}
.s-intro-icon {
  width: 36px; height: 36px; flex-shrink: 0;
  background: var(--primary); color: white; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800;
}
.s-intro-title { font-size: 13.5px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.s-intro-text  { font-size: 12.5px; color: var(--text-2); line-height: 1.5; }

/* ── Coming soon banner ── */
.s-coming-soon-banner {
  display: flex; align-items: flex-start; gap: 14px;
  background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-lg, 10px);
  padding: 14px 18px; margin-bottom: 14px;
}
.s-csb-icon { font-size: 22px; flex-shrink: 0; }
.s-csb-title { font-size: 13.5px; font-weight: 700; color: #92400e; }
.s-csb-text { font-size: 12.5px; color: #78350f; line-height: 1.5; margin-top: 2px; }

/* ── Number schemas ── */
.num-preview {
  display: inline-flex; align-items: center;
  background: var(--primary-light); color: var(--primary-text);
  border: 1px solid rgba(79,70,229,.15); border-radius: 99px; padding: 3px 12px;
  font-size: 12px; font-weight: 700; font-family: 'Consolas', 'JetBrains Mono', monospace; letter-spacing: .3px;
}
.num-token-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.num-token { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.num-token-label { font-size: 10px; color: var(--text-muted); }
.num-token-code { font-size: 11px; font-weight: 700; background: var(--bg-alt); padding: 2px 8px; border-radius: 4px; }
.num-group-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  color: var(--text-muted); padding: 6px 2px 4px; border-bottom: 1px solid var(--border);
  margin-bottom: 12px; margin-top: 4px;
}
.num-schema-card { margin-bottom: 10px; }
.num-format-row { display: flex; gap: 12px; align-items: flex-end; }
.num-format-input { font-family: 'Consolas', 'JetBrains Mono', monospace !important; font-size: 13px !important; letter-spacing: .3px; }
.num-start-field { flex-shrink: 0; }
.num-hint { font-size: 11.5px; color: var(--text-muted); margin-top: 8px; display: flex; align-items: center; gap: 5px; }
.num-locked-icon { font-size: 13px; }

/* ── Erscheinungsbild ── */
.appear-row  { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.appear-label { font-size: 13.5px; font-weight: 600; color: var(--text); }
.theme-toggle { display: flex; border: 1px solid var(--border); border-radius: var(--radius, 6px); overflow: hidden; }
.theme-btn {
  display: flex; align-items: center; gap: 6px; padding: 8px 20px; border: none;
  background: var(--surface); color: var(--text-2); font-size: 13px; font-weight: 500;
  font-family: inherit; cursor: pointer; transition: all .14s;
}
.theme-btn:first-child { border-right: 1px solid var(--border); }
.theme-btn.active { background: var(--primary); color: white; }
.theme-btn:hover:not(.active) { background: var(--bg-alt); color: var(--text); }

/* ── Bundesländer grid ── */
.bl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
.bl-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--text-2); cursor: pointer; padding: 4px 0;
}
.bl-label input { width: auto; flex-shrink: 0; accent-color: var(--primary); }
.bl-label:hover { color: var(--text); }

/* ── Usage Rights reference grid ── */
.ur-ref-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.ur-ref-block { border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: var(--bg-alt); }
.ur-ref-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.ur-ref-desc { font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4; }
.ur-ref-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.ur-ref-table td { padding: 4px 6px; border-bottom: 1px solid var(--border); }
.ur-ref-table thead th { padding: 4px 6px; }
.ur-factor { font-weight: 700; color: var(--primary); text-align: center; white-space: nowrap; }
.ur-ref-note { font-size: 11px; color: var(--text-muted); margin-top: 6px; font-style: italic; }
.ur-example-box { background: var(--bg-alt); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
.ur-example-title { font-size: 12px; font-weight: 700; color: var(--text); }

/* ── Backup tab ── */
.backup-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.backup-table th {
  padding: 9px 14px; background: var(--surface); border-bottom: 1.5px solid var(--border);
  text-align: left; font-size: 11.5px; font-weight: 600; color: var(--text-muted); white-space: nowrap;
}
.backup-table td { padding: 9px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.backup-table tbody tr:last-child td { border-bottom: none; }
.backup-table tbody tr:hover { background: var(--hover-bg, rgba(0,0,0,.03)); }
.backup-name  { font-size: 12px; color: var(--text); font-family: monospace; }
.backup-date  { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.backup-size  { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.backup-actions { display: flex; gap: 4px; justify-content: flex-end; }
.backup-badge {
  display: inline-block; font-size: 10px; font-weight: 700;
  padding: 1px 6px; border-radius: 8px; margin-right: 5px;
  background: var(--primary-light); color: var(--primary-text);
}
.backup-badge-warn { background: rgba(217, 119, 6, .12); color: #92400e; }
.backup-loading, .backup-empty {
  padding: 28px 16px; text-align: center; font-size: 13px; color: var(--text-muted);
}
.backup-msg { font-size: 13px; font-weight: 600; }
.backup-msg-ok  { color: var(--success, #059669); }
.backup-msg-err { color: var(--danger,  #dc2626); }
.backup-import-filename { font-size: 12px; color: var(--text-muted); font-style: italic; }

/* ── Update tab ── */
.update-manifest-card { border: 1px solid var(--border); border-radius: 10px; padding: 18px; background: var(--bg-alt); margin-top: 16px; }
.update-manifest-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.update-version-badge { background: var(--primary); color: white; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; }
.update-manifest-title { font-size: 15px; font-weight: 700; }
.update-manifest-desc { font-size: 13px; color: var(--text-2); margin-bottom: 10px; }
.update-changes-list { margin: 10px 0; padding-left: 20px; font-size: 13px; line-height: 1.7; }
.update-manifest-meta { font-size: 12px; color: var(--text-muted); }
.update-status { font-size: 13px; color: var(--text-muted); }
.update-progress-card { border-color: var(--primary); }
.update-spinner { font-size: 32px; animation: spin 1.5s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.update-health-bar { height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; max-width: 300px; margin: 0 auto; }
.update-health-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width .3s; }

/* ── System tab ── */
.sys-path-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.sys-path-label { font-size: 12px; font-weight: 600; color: var(--text-muted); min-width: 100px; }
.sys-path-value { display: flex; align-items: center; gap: 8px; }
.sys-path-code { font-size: 12px; background: var(--bg-alt); padding: 4px 10px; border-radius: 4px; }
.sys-stats-grid { display: flex; gap: 20px; margin-bottom: 16px; }
.sys-stat { text-align: center; }
.sys-stat-val { font-size: 18px; font-weight: 800; color: var(--primary); }
.sys-stat-lbl { font-size: 11px; color: var(--text-muted); }
.sys-dirs-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.sys-dir-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.sys-dir-icon { font-size: 14px; }
.sys-dir-label { font-weight: 600; min-width: 80px; }
.sys-dir-path { font-size: 11px; color: var(--text-muted); background: var(--bg-alt); padding: 2px 6px; border-radius: 3px; }
.sys-info-table { font-size: 13px; }
.sys-info-table td { padding: 6px 12px; }
.sys-info-label { font-weight: 600; color: var(--text-muted); min-width: 120px; }
.reset-warning-box {
  background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
  padding: 14px 18px; font-size: 13px; color: #991b1b;
}
.reset-pw-input {
  padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: 13px; font-family: inherit;
}

/* ── Responsive ── */
@media (max-width: 700px) {
  .fg-row, .fg-row-3, .fg-row-4, .form-row { grid-template-columns: 1fr 1fr; }
  .logo-row { flex-direction: column; }
  .ur-ref-grid { grid-template-columns: 1fr; }
}
@media (max-width: 500px) {
  .fg-row, .fg-row-3, .fg-row-4, .form-row { grid-template-columns: 1fr; }
}
</style>
