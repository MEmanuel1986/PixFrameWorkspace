<template>
  <div class="cal-page">

    <!-- ─── Toolbar ─────────────────────────────────────────────────────── -->
    <div class="cal-toolbar">
      <div class="cal-nav">
        <button class="cal-nav-btn" @click="navPrev">◀</button>
        <div class="cal-month-label" @click="goToday" title="Heute anzeigen">
          {{ navLabel }}
        </div>
        <button class="cal-nav-btn" @click="navNext">▶</button>
        <button class="cal-today-btn" @click="goToday">Heute</button>
      </div>

      <div class="cal-view-switcher">
        <button :class="['cvs-btn', { active: view === 'month' }]" @click="view = 'month'">Monat</button>
        <button :class="['cvs-btn', { active: view === 'week' }]" @click="switchToWeek()">Woche</button>
        <button :class="['cvs-btn', { active: view === 'day' }]" @click="setDayView(selectedDay || todayISO)">Tag</button>
      </div>

      <div class="cal-filters">
        <button v-for="f in eventFilters" :key="f.key"
          :class="['cf-btn', { active: activeFilters.includes(f.key) }]"
          @click="toggleFilter(f.key)"
          :style="activeFilters.includes(f.key) ? `background:${f.bg};color:${f.color};border-color:${f.borderColor}` : ''">
          <span class="cf-dot" :style="`background:${f.color}`"></span>
          {{ f.label }}
        </button>
      </div>

      <button class="cal-add-btn" @click="openEventModal()">
        + Termin
      </button>
      <button class="cal-export-btn" @click="exportIcal" title="Alle sichtbaren Termine als .ics exportieren">
        📅 iCal
      </button>
    </div>

    <!-- ─── Region-Panel Button Row ───────────────────────────────────────── -->
    <div class="cal-region-bar">
      <!-- Feiertage Button -->
      <button
        :class="['crb-btn', { 'crb-btn--active': showFeiertagePanel }]"
        @click="showFeiertagePanel = !showFeiertagePanel; showFerienPanel = false">
        <span class="crb-icon">🎉</span>
        <span class="crb-label">Feiertage</span>
        <span v-if="selectedBundeslaender.length" class="crb-count">{{ selectedBundeslaender.length }} Land</span>
        <span class="crb-caret">{{ showFeiertagePanel ? '▲' : '▼' }}</span>
      </button>

      <!-- Schulferien Button -->
      <button
        :class="['crb-btn', 'crb-btn--ferien', { 'crb-btn--active': showFerienPanel }]"
        @click="showFerienPanel = !showFerienPanel; showFeiertagePanel = false">
        <span class="crb-icon">🏫</span>
        <span class="crb-label">Schulferien</span>
        <span v-if="selectedFerienBundeslaender.length" class="crb-count crb-count--ferien">{{ selectedFerienBundeslaender.length }} Land</span>
        <span v-if="ferienLoading" class="crb-spinner"></span>
        <span v-else-if="ferienError" class="crb-err-dot" :title="'Fehler: ' + ferienError">!</span>
        <span v-else class="crb-caret">{{ showFerienPanel ? '▲' : '▼' }}</span>
      </button>

      <!-- Status-Badges aktiver Auswahl -->
      <div class="crb-active-badges">
        <span v-for="code in selectedBundeslaender" :key="`ft-${code}`" class="crb-badge crb-badge--feiertag">
          🎉 {{ code }}
          <button class="crb-badge-del" @click="removeBundesland(code, 'feiertag')">×</button>
        </span>
        <span v-for="code in selectedFerienBundeslaender" :key="`sf-${code}`" class="crb-badge crb-badge--ferien">
          🏫 {{ code }}
          <button class="crb-badge-del" @click="removeBundesland(code, 'ferien')">×</button>
        </span>
      </div>
    </div>

    <!-- ─── Feiertage-Panel ──────────────────────────────────────────────── -->
    <transition name="panel-slide">
      <div v-if="showFeiertagePanel" class="bl-panel bl-panel--feiertag">
        <div class="bl-panel-header">
          <span class="bl-panel-title">🎉 Bundesländer für Feiertage</span>
          <div class="bl-panel-actions">
            <button class="bl-action-btn" @click="selectAllBundeslaender('feiertag')">Alle</button>
            <button class="bl-action-btn" @click="clearAllBundeslaender('feiertag')">Keine</button>
            <button class="bl-panel-close" @click="showFeiertagePanel = false">✕</button>
          </div>
        </div>
        <div class="bl-panel-body">
          <div v-for="(group, region) in BUNDESLAENDER_BY_REGION" :key="region" class="bl-region-group">
            <div class="bl-region-label">{{ region }}</div>
            <div class="bl-region-items">
              <label
                v-for="bl in group" :key="bl.code"
                :class="['bl-item', { 'bl-item--active': selectedBundeslaender.includes(bl.code) }]">
                <input type="checkbox" :value="bl.code" v-model="selectedBundeslaender"
                  @change="onBundeslaendChange" style="display:none" />
                <span class="bl-item-check">{{ selectedBundeslaender.includes(bl.code) ? '✓' : '' }}</span>
                <span class="bl-item-code">{{ bl.code }}</span>
                <span class="bl-item-name">{{ bl.label }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ─── Schulferien-Panel ────────────────────────────────────────────── -->
    <transition name="panel-slide">
      <div v-if="showFerienPanel" class="bl-panel bl-panel--ferien">
        <div class="bl-panel-header">
          <span class="bl-panel-title">🏫 Bundesländer für Schulferien</span>
          <div class="bl-panel-actions">
            <button class="bl-action-btn" @click="selectAllBundeslaender('ferien')">Alle</button>
            <button class="bl-action-btn" @click="clearAllBundeslaender('ferien')">Keine</button>
            <button class="bl-panel-close" @click="showFerienPanel = false">✕</button>
          </div>
        </div>
        <div class="bl-panel-body">
          <div v-for="(group, region) in BUNDESLAENDER_BY_REGION" :key="region" class="bl-region-group">
            <div class="bl-region-label">{{ region }}</div>
            <div class="bl-region-items">
              <label
                v-for="bl in group" :key="bl.code"
                :class="['bl-item', 'bl-item--ferien', { 'bl-item--active': selectedFerienBundeslaender.includes(bl.code) }]">
                <input type="checkbox" :value="bl.code" v-model="selectedFerienBundeslaender"
                  @change="onFerienChange" style="display:none" />
                <span class="bl-item-check">{{ selectedFerienBundeslaender.includes(bl.code) ? '✓' : '' }}</span>
                <span class="bl-item-code">{{ bl.code }}</span>
                <span class="bl-item-name">{{ bl.label }}</span>
              </label>
            </div>
          </div>
        </div>
        <div v-if="ferienLoading" class="bl-panel-loading">
          <span class="loading-dots">Schulferien werden geladen<span class="ld">.</span><span class="ld">.</span><span class="ld">.</span></span>
        </div>
        <div v-if="ferienError && !ferienLoading" class="bl-panel-error">
          ⚠️ {{ ferienError }}
        </div>
      </div>
    </transition>

    <!-- ─── Month View ───────────────────────────────────────────────────── -->
    <div v-if="view === 'month'" class="cal-grid-wrap">
      <!-- Weekday headers -->
      <div class="cal-grid-head">
        <div v-for="wd in ['Mo','Di','Mi','Do','Fr','Sa','So']" :key="wd" class="cgh-cell">{{ wd }}</div>
      </div>

      <!-- Day grid -->
      <div class="cal-grid-body">
        <div
          v-for="day in calDays" :key="day.iso"
          :class="[
            'cal-day',
            { 'cal-day--other': !day.currentMonth },
            { 'cal-day--today': day.isToday },
            { 'cal-day--weekend': day.isWeekend },
            { 'cal-day--holiday': day.holiday },
            { 'cal-day--ferien': day.ferien && activeFilters.includes('ferien') },
            { 'cal-day--selected': selectedDay === day.iso },
          ]"
          @click="selectDay(day)"
        >
          <!-- Day number -->
          <div class="cd-num-row">
            <span class="cd-num">{{ day.day }}</span>
            <span v-if="day.holiday && activeFilters.includes('feiertag')"
              class="cd-holiday-label">{{ day.holiday }}</span>
            <span v-else-if="day.ferien && activeFilters.includes('ferien') && !day.holiday"
              class="cd-ferien-label">{{ day.ferien }}</span>
          </div>

          <!-- Events -->
          <div class="cd-events">
            <div
              v-for="ev in getEventsForDay(day.iso).slice(0, maxEventsPerDay)"
              :key="ev.id"
              :class="['cd-ev', `cd-ev--${ev.type}`]"
              :style="`background:${ev.bg};color:${ev.color};border-left-color:${ev.borderColor}`"
              :title="ev.title + (ev.subtitle ? ' · ' + ev.subtitle : '')"
              @click.stop="selectEvent(ev, day.iso)"
            >
              <span class="cd-ev-dot" :style="`background:${ev.borderColor}`"></span>
              <span class="cd-ev-text">{{ ev.shortTitle }}</span>
            </div>
            <div v-if="getEventsForDay(day.iso).length > maxEventsPerDay"
              class="cd-ev-more"
              @click.stop="selectedDay = day.iso; showDayDetail = true">
              +{{ getEventsForDay(day.iso).length - maxEventsPerDay }} weitere
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Week View ─────────────────────────────────────────────────────── -->
    <div v-else-if="view === 'week'" class="cal-week-wrap">

      <!-- Day headers -->
      <div class="wk-header">
        <div class="wk-gutter"></div>
        <div v-for="day in weekDays" :key="day.iso"
          :class="['wk-head-cell', { 'wkh-today': day.isToday, 'wkh-weekend': day.isWeekend }]"
          @click="setDayView(day.iso)">
          <div class="wkh-wd">{{ day.wdShort }}</div>
          <div :class="['wkh-num', { 'wkh-num--today': day.isToday }]">{{ day.day }}</div>
          <div v-if="day.holiday && activeFilters.includes('feiertag')" class="wkh-badge wkh-badge--feiertag">{{ day.holiday }}</div>
          <div v-else-if="day.ferien && activeFilters.includes('ferien')" class="wkh-badge wkh-badge--ferien">{{ day.ferien }}</div>
        </div>
      </div>

      <!-- All-day / multi-day banner row (immer sichtbar) -->
      <div class="wk-allday-row">
        <div class="wk-gutter wk-gutter--label">Ganztag</div>
        <div v-for="day in weekDays" :key="`ad-${day.iso}`" class="wk-allday-col">
          <div v-for="ev in getEventsForDay(day.iso).filter(e => e.allDay)"
            :key="ev.id"
            class="wk-allday-ev"
            :style="`background:${ev.bg};border-left:3px solid ${ev.borderColor};color:${ev.color}`"
            @click.stop="selectEvent(ev, day.iso)">
            {{ ev.shortTitle }}
          </div>
        </div>
      </div>

      <!-- Time grid -->
      <div class="wk-grid-scroll">
        <div class="wk-grid">
          <!-- Hour labels -->
          <div class="wk-hours">
            <div v-for="h in timeGridHours" :key="h" class="wk-hour-label">{{ h }}:00</div>
          </div>
          <!-- Day columns -->
          <div v-for="day in weekDays" :key="`wg-${day.iso}`"
            :class="['wk-day-col', { 'wk-col--today': day.isToday, 'wk-col--weekend': day.isWeekend }]"
            @click="openEventModal(day.iso)">
            <!-- Hour lines -->
            <div v-for="h in timeGridHours" :key="`hl-${h}`" class="wk-hour-line"></div>
            <!-- Timed events -->
            <div v-for="ev in getTimedEventsForDay(day.iso)" :key="ev.id"
              class="wk-ev"
              :style="timeEventStyle(ev)"
              @click.stop="selectEvent(ev, day.iso)">
              <div class="wk-ev-title">{{ ev.shortTitle }}</div>
              <div v-if="ev.timeLabel" class="wk-ev-time">{{ ev.timeLabel }}</div>
            </div>
            <!-- Now indicator -->
            <div v-if="day.isToday" class="wk-now-line" :style="`top:${nowLineTop}px`">
              <div class="wk-now-dot"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Week event list below grid -->
      <div class="wk-event-list">
        <div class="wel-title">Termine dieser Woche</div>
        <div v-if="weekAllEvents.length === 0" class="wel-empty">Keine Termine in dieser Woche.</div>
        <div v-for="day in weekDays" :key="`wel-${day.iso}`">
          <template v-if="getEventsForDay(day.iso).length">
            <div class="wel-day-label">{{ day.wdShort }}, {{ fmtDate(day.iso) }}</div>
            <div v-for="ev in getEventsForDay(day.iso)" :key="ev.id"
              class="wel-ev"
              :style="`border-left:3px solid ${ev.borderColor}`"
              @click="selectEvent(ev, day.iso)">
              <span class="wel-ev-icon">{{ ev.icon }}</span>
              <div class="wel-ev-body">
                <div class="wel-ev-title">{{ ev.title }}</div>
                <div class="wel-ev-meta">
                  <span v-if="ev.timeLabel">🕐 {{ ev.timeLabel }}</span>
                  <span v-if="ev.location">📍 {{ ev.location }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

    </div>

    <!-- ─── Day View ───────────────────────────────────────────────────────── -->
    <div v-else-if="view === 'day'" class="cal-day-wrap">

      <!-- Day header -->
      <div class="dv-header">
        <button class="cal-nav-btn" @click="prevDay">◀</button>
        <div :class="['dv-title', { 'dv-title--today': dayViewObj?.isToday }]">
          {{ formatDayFull(dayViewDate) }}
          <span v-if="dayViewObj?.holiday" class="dv-badge dv-badge--feiertag">🎉 {{ dayViewObj.holiday }}</span>
          <span v-else-if="dayViewObj?.ferien" class="dv-badge dv-badge--ferien">🏫 {{ dayViewObj.ferien }}</span>
        </div>
        <button class="cal-nav-btn" @click="nextDay">▶</button>
        <button class="btn btn-sm btn-primary" style="margin-left:auto" @click="openEventModal(dayViewDate)">+ Termin</button>
      </div>

      <!-- All-day banner -->
      <div v-if="getEventsForDay(dayViewDate).some(e => e.allDay)" class="dv-allday">
        <div class="dv-allday-label">Ganztag</div>
        <div v-for="ev in getEventsForDay(dayViewDate).filter(e => e.allDay)" :key="ev.id"
          class="dv-allday-ev"
          :style="`background:${ev.bg};border-left:3px solid ${ev.borderColor};color:${ev.color}`">
          <span>{{ ev.icon }}</span> {{ ev.title }}
        </div>
      </div>

      <!-- Time grid -->
      <div class="dv-grid-scroll">
        <div class="dv-grid">
          <div class="dv-hours">
            <div v-for="h in timeGridHours" :key="h" class="dv-hour-label">{{ h }}:00</div>
          </div>
          <div class="dv-col" @click="openEventModal(dayViewDate)">
            <div v-for="h in timeGridHours" :key="`dhl-${h}`" class="dv-hour-line"></div>
            <div v-for="ev in getTimedEventsForDay(dayViewDate)" :key="ev.id"
              class="dv-ev"
              :style="timeEventStyle(ev)"
              @click.stop="selectEvent(ev, dayViewDate)">
              <div class="dv-ev-header">
                <span class="dv-ev-icon">{{ ev.icon }}</span>
                <span class="dv-ev-title">{{ ev.title }}</span>
              </div>
              <div v-if="ev.timeLabel" class="dv-ev-time">{{ ev.timeLabel }}</div>
              <div v-if="ev.location" class="dv-ev-loc">📍 {{ ev.location }}</div>
              <div v-if="ev.description" class="dv-ev-desc">{{ ev.description }}</div>
            </div>
            <!-- Now line -->
            <div v-if="dayViewObj?.isToday" class="wk-now-line" :style="`top:${nowLineTop}px`">
              <div class="wk-now-dot"></div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ─── Legend (nur Monatsansicht) ─────────────────────────────────────── -->
    <div v-if="view === 'month'" class="cal-legend">
      <div v-for="f in eventFilters" :key="`leg-${f.key}`" class="leg-item">
        <span class="leg-dot" :style="`background:${f.color}`"></span>
        <span class="leg-lbl">{{ f.label }}</span>
      </div>
    </div>

    <!-- ─── Day Detail Popover ────────────────────────────────────────────── -->
    <transition name="pop-fade">
      <div v-if="showDayDetail && selectedDay" class="day-popover-overlay" @click.self="closeDayDetail">
        <div class="day-popover">
          <div class="dp-header">
            <div class="dp-date">{{ formatDayFull(selectedDay) }}</div>
            <div class="dp-actions">
              <button class="btn btn-sm btn-ghost" @click="openEventModal(selectedDay)">+ Termin</button>
              <button class="dp-close" @click="closeDayDetail">✕</button>
            </div>
          </div>
          <div class="dp-body">
            <div v-if="getEventsForDay(selectedDay).length === 0" class="dp-empty">
              Keine Einträge für diesen Tag.
            </div>
            <div v-for="ev in getEventsForDay(selectedDay)" :key="ev.id"
              :class="['dp-ev', `dp-ev--${ev.type}`]"
              :style="`border-left:3px solid ${ev.borderColor}`">
              <div class="dp-ev-header">
                <span class="dp-ev-icon">{{ ev.icon }}</span>
                <span class="dp-ev-title">{{ ev.title }}</span>
                <button v-if="ev.absenceId"
                  class="dp-ev-del" @click="deleteEvent(ev.absenceId)"
                  title="Termin löschen">🗑</button>
                <button v-if="ev.absenceId"
                  class="dp-ev-edit" @click="editEvent(ev.absenceId)"
                  title="Termin bearbeiten">✏️</button>
              </div>
              <div v-if="ev.subtitle" class="dp-ev-sub">{{ ev.subtitle }}</div>
              <div v-if="ev.note" class="dp-ev-note">{{ ev.note }}</div>
              <div class="dp-ev-actions">
                <router-link v-if="ev.projectId" :to="`/projects/${ev.projectId}`"
                  class="dp-link" @click="closeDayDetail">→ Auftrag öffnen</router-link>
                <router-link v-if="ev.docId" :to="`/documents`"
                  class="dp-link" @click="closeDayDetail">→ Dokument öffnen</router-link>
              </div>
            </div>
            <!-- Holiday info -->
            <div v-if="getDayObj(selectedDay)?.holiday && activeFilters.includes('feiertag')"
              class="dp-holiday">
              🎉 {{ getDayObj(selectedDay).holiday }} (Feiertag)
            </div>
            <div v-if="getDayObj(selectedDay)?.ferien && activeFilters.includes('ferien')"
              class="dp-ferien">
              🏫 {{ getDayObj(selectedDay).ferien }} (Schulferien)
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ─── Termin-Modal ─────────────────────────────────────────────────── -->
    <transition name="pop-fade">
      <div v-if="showEventModal" class="modal-overlay" @click.self="closeEventModal">
        <div class="modal modal--event">
          <div class="modal-header">
            <div class="modal-header-left">
              <span class="modal-type-icon">{{ EVENT_TYPE_ICONS[eventForm.type] || '📌' }}</span>
              <h2>{{ eventForm.id ? 'Termin bearbeiten' : 'Neuer Termin' }}</h2>
            </div>
            <button class="modal-close" @click="closeEventModal">✕</button>
          </div>
          <div class="modal-body">

            <!-- Typ -->
            <div class="ev-type-grid">
              <button v-for="t in EVENT_TYPES" :key="t.value"
                :class="['ev-type-btn', { active: eventForm.type === t.value }]"
                :style="eventForm.type === t.value ? `background:${t.bg};color:${t.color};border-color:${t.borderColor}` : ''"
                @click="eventForm.type = t.value">
                <span class="ev-type-icon">{{ t.icon }}</span>
                <span class="ev-type-label">{{ t.label }}</span>
              </button>
            </div>

            <!-- Titel -->
            <div class="fg mt-3">
              <label>Titel <span class="req">*</span></label>
              <input type="text" v-model="eventForm.title"
                :placeholder="EVENT_TYPE_PLACEHOLDER[eventForm.type] || 'Titel des Termins'"
                class="inp-title" />
            </div>

            <!-- Datum Von / Bis -->
            <div class="fg-row mt-3">
              <div class="fg">
                <label>Von</label>
                <input type="date" v-model="eventForm.startDate" @change="syncEndDate" />
              </div>
              <div class="fg">
                <label>Bis (inkl.)</label>
                <input type="date" v-model="eventForm.endDate" />
              </div>
            </div>

            <!-- Uhrzeit (nur wenn nicht Ganztag/Mehrtägig) -->
            <div class="fg-row mt-2" v-if="!eventIsMultiDay">
              <div class="fg">
                <label>Von Uhrzeit</label>
                <input type="time" v-model="eventForm.startTime" />
              </div>
              <div class="fg">
                <label>Bis Uhrzeit</label>
                <input type="time" v-model="eventForm.endTime" />
              </div>
            </div>
            <div v-if="eventIsMultiDay" class="hint mt-1" style="font-size:11.5px">
              Mehrtägige Termine werden ganztägig angezeigt.
            </div>

            <!-- Ort -->
            <div class="fg mt-3">
              <label>Ort (optional)</label>
              <input type="text" v-model="eventForm.location"
                placeholder="z.B. Konferenzraum A, Messe Hamburg…" />
            </div>

            <!-- Beschreibung -->
            <div class="fg mt-3">
              <label>Beschreibung (optional)</label>
              <textarea v-model="eventForm.description" rows="3"
                placeholder="Notizen, Agenda, Kontaktpersonen…"></textarea>
            </div>

          </div>
          <div class="modal-footer">
            <button v-if="eventForm.id" class="btn btn-danger-ghost" @click="deleteEvent(eventForm.id); closeEventModal()">
              Löschen
            </button>
            <div style="flex:1"></div>
            <button class="btn btn-ghost" @click="closeEventModal">Abbrechen</button>
            <button class="btn btn-primary" @click="saveEvent" :disabled="!eventForm.startDate || !eventForm.title.trim()">
              {{ eventForm.id ? 'Speichern' : 'Erstellen' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script>
import apiClient, { API_BASE } from '../services/api'
import { ref, computed, onMounted } from 'vue'
import { useStore } from '../stores/useStore'
import { useSettings } from '../stores/useSettings'
import {
  fetchPublicHolidays,
  fetchSchoolHolidays,
  BUNDESLAENDER,
  BUNDESLAENDER_BY_REGION,
  clearHolidayCache,
} from '../services/holidays.js'

const API = `${API_BASE}/api`

// ─── Color palette per event type ─────────────────────────────────────────
const TYPE_STYLE = {
  'termin':        { bg: '#ECFDF5', color: '#059669', borderColor: '#34D399', icon: '📸' },
  'abgabe':        { bg: '#FFFBEB', color: '#D97706', borderColor: '#FBBF24', icon: '⏰' },
  'quote-sent':    { bg: '#EFF6FF', color: '#2563EB', borderColor: '#93C5FD', icon: '📋' },
  'followup':      { bg: '#F5F3FF', color: '#7C3AED', borderColor: '#C4B5FD', icon: '🔔' },
  'invoice-sent':  { bg: '#ECFDF5', color: '#059669', borderColor: '#6EE7B7', icon: '🧾' },
  'invoice-due':   { bg: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5', icon: '💰' },
  'deposit-sent':  { bg: '#ECFDF5', color: '#047857', borderColor: '#6EE7B7', icon: '💳' },
  'deposit-due':   { bg: '#FFF7ED', color: '#C2410C', borderColor: '#FED7AA', icon: '⚡' },
  'urlaub':        { bg: '#ECFEFF', color: '#0891B2', borderColor: '#67E8F9', icon: '🏖️' },
  'krank':         { bg: '#FEF2F2', color: '#B91C1C', borderColor: '#FCA5A5', icon: '🤒' },
  'frei':          { bg: '#F3F4F6', color: '#6B7280', borderColor: '#D1D5DB', icon: '💼' },
  'meeting':       { bg: '#EEF2FF', color: '#4F46E5', borderColor: '#818CF8', icon: '🤝' },
  'messe':         { bg: '#FFF7ED', color: '#EA580C', borderColor: '#FB923C', icon: '🏛️' },
  'event':         { bg: '#FDF4FF', color: '#9333EA', borderColor: '#D8B4FE', icon: '🎭' },
}

// ─── Event type config for modal ──────────────────────────────────────────
const EVENT_TYPES = [
  { value: 'urlaub',   label: 'Urlaub',       icon: '🏖️', bg: '#ECFEFF', color: '#0891B2', borderColor: '#67E8F9' },
  { value: 'krank',    label: 'Krank',         icon: '🤒', bg: '#FEF2F2', color: '#B91C1C', borderColor: '#FCA5A5' },
  { value: 'frei',     label: 'Frei',          icon: '💼', bg: '#F3F4F6', color: '#6B7280', borderColor: '#D1D5DB' },
  { value: 'meeting',  label: 'Besprechung',   icon: '🤝', bg: '#EEF2FF', color: '#4F46E5', borderColor: '#818CF8' },
  { value: 'messe',    label: 'Messe / Event', icon: '🏛️', bg: '#FFF7ED', color: '#EA580C', borderColor: '#FB923C' },
  { value: 'event',    label: 'Sonstiges',     icon: '🎭', bg: '#FDF4FF', color: '#9333EA', borderColor: '#D8B4FE' },
]
const EVENT_TYPE_ICONS    = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t.icon]))
const EVENT_TYPE_PLACEHOLDER = {
  urlaub:  'z.B. Familienurlaub, Kurzurlaub…',
  krank:   'z.B. Krankschreibung…',
  frei:    'z.B. Brückentag, persönlicher Tag…',
  meeting: 'z.B. Jahresplanung, Kundengespräch…',
  messe:   'z.B. photokina 2026, Hochzeitsmesse…',
  event:   'Terminbezeichnung…',
}

// ─── Time grid ─────────────────────────────────────────────────────────────
const TIME_GRID_START = 6   // 06:00
const TIME_GRID_END   = 22  // 22:00
const TIME_GRID_HOURS = Array.from({ length: TIME_GRID_END - TIME_GRID_START }, (_, i) => i + TIME_GRID_START)
const HOUR_HEIGHT_PX  = 56  // px per hour

function makeEventStyle(type) {
  return TYPE_STYLE[type] || { bg: '#F3F4F6', color: '#6B7280', borderColor: '#D1D5DB', icon: '📌' }
}

function toISO(d) {
  if (!d) return null
  const x = new Date(d)
  if (isNaN(x)) return null
  return x.toISOString().slice(0, 10)
}

function dateRange(startISO, endISO) {
  const dates = []
  let cur = new Date(startISO)
  const end = new Date(endISO)
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export default {
  name: 'Calendar',
  setup() {
    const store    = useStore()
    const settings = useSettings()

    // ── State ──────────────────────────────────────────────────────────────
    const today   = new Date()
    const curYear  = ref(today.getFullYear())
    const curMonth = ref(today.getMonth())   // 0-indexed
    const view         = ref('month')
    const dayViewDate  = ref(null)    // YYYY-MM-DD for day view
    const weekAnchor   = ref(null)    // Monday ISO of currently shown week

    const selectedDay    = ref(null)
    const showDayDetail  = ref(false)
    const showEventModal = ref(false)
    const eventForm      = ref({
      id: null, type: 'meeting',
      title: '', startDate: '', endDate: '',
      startTime: '', endTime: '',
      location: '', description: '',
    })

    // ── Calendar settings (persisted in settings store) ───────────────────
    const calSettings = computed(() => settings.settings?.calendarSettings || {})

    const selectedBundeslaender = ref([])
    const selectedFerienBundeslaender = ref([])
    const showFeiertagePanel = ref(false)
    const showFerienPanel    = ref(false)

    const publicHolidays  = ref([])   // { date, name }[]
    const schoolHolidays  = ref([])   // { name, start, end }[]
    const ferienLoading   = ref(false)
    const ferienError     = ref(null)
    const calendarEvents  = ref([])   // Absences from settings

    // ── Event filters ──────────────────────────────────────────────────────
    const eventFilters = [
      { key: 'termin',       label: 'Shooting-Termin',  color: '#059669', bg: '#ECFDF5', borderColor: '#34D399' },
      { key: 'abgabe',       label: 'Abgabe-Deadline',  color: '#D97706', bg: '#FFFBEB', borderColor: '#FBBF24' },
      { key: 'quote',        label: 'Angebote',         color: '#2563EB', bg: '#EFF6FF', borderColor: '#93C5FD' },
      { key: 'invoice',      label: 'Rechnungen',       color: '#DC2626', bg: '#FEF2F2', borderColor: '#FCA5A5' },
      { key: 'absence',      label: 'Eigene Termine',   color: '#4F46E5', bg: '#EEF2FF', borderColor: '#818CF8' },
      { key: 'feiertag',     label: 'Feiertage',        color: '#CA8A04', bg: '#FFFBEB', borderColor: '#FDE68A' },
      { key: 'ferien',       label: 'Schulferien',      color: '#7C3AED', bg: '#F5F3FF', borderColor: '#C4B5FD' },
    ]
    const activeFilters = ref(['termin','abgabe','quote','invoice','absence','feiertag','ferien'])
    const maxEventsPerDay = 4

    function toggleFilter(key) {
      const i = activeFilters.value.indexOf(key)
      if (i === -1) activeFilters.value.push(key)
      else activeFilters.value.splice(i, 1)
    }

    // ── Month navigation ───────────────────────────────────────────────────
    const monthLabel = computed(() => {
      const d = new Date(curYear.value, curMonth.value, 1)
      return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    })

    function prevMonth() {
      const wasYear = curYear.value
      if (curMonth.value === 0) { curYear.value--; curMonth.value = 11 }
      else curMonth.value--
      if (curYear.value !== wasYear) clearHolidayCache()
      reloadHolidays()
    }
    function nextMonth() {
      const wasYear = curYear.value
      if (curMonth.value === 11) { curYear.value++; curMonth.value = 0 }
      else curMonth.value++
      if (curYear.value !== wasYear) clearHolidayCache()
      reloadHolidays()
    }
    // BQ-3: iCal Export — generiert eine .ics Datei aus allen sichtbaren Terminen
    function exportIcal() {
      const events = allEvents.value
      if (!events.length) { alert('Keine Termine zum Exportieren.'); return }

      function icsDate(dateStr, timeStr, allDay) {
        const d = new Date(dateStr + (timeStr && !allDay ? 'T' + timeStr + ':00' : 'T00:00:00'))
        if (allDay) return dateStr.replace(/-/g, '')
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      }

      function esc(s) { return String(s || '').replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n') }

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PixFrameWorkspace//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:PixFrame Termine',
        'X-WR-TIMEZONE:Europe/Berlin',
      ]

      for (const ev of events) {
        const uid  = `${ev.id}@pixframe`
        const now  = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        const dtStart = ev.allDay
          ? `DTSTART;VALUE=DATE:${icsDate(ev.date, null, true)}`
          : `DTSTART:${icsDate(ev.date, ev.startTime, false)}`
        const dtEnd = ev.allDay
          ? `DTEND;VALUE=DATE:${icsDate(ev.date, null, true)}`
          : `DTEND:${icsDate(ev.date, ev.endTime || ev.startTime, false)}`
        const summary = esc(ev.title || ev.shortTitle || 'Termin')
        const desc  = esc([ev.subtitle, ev.note].filter(Boolean).join(' | '))

        lines.push('BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${now}Z`,
          dtStart, dtEnd,
          `SUMMARY:${summary}`,
          desc ? `DESCRIPTION:${desc}` : null,
          'END:VEVENT'
        ).filter(Boolean)
      }
      lines.push('END:VCALENDAR')

      const blob = new Blob([lines.flat().filter(Boolean).join('\r\n')], { type: 'text/calendar;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'pixframe-termine.ics'
      a.click()
      URL.revokeObjectURL(url)
    }

    function goToday() {
      const t = new Date()
      curYear.value  = t.getFullYear()
      curMonth.value = t.getMonth()
      weekAnchor.value = null
      if (view.value === 'day') dayViewDate.value = toISO(t)
    }

    // ── Calendar grid computation ──────────────────────────────────────────
    const calDays = computed(() => {
      const firstOfMonth = new Date(curYear.value, curMonth.value, 1)
      const lastOfMonth  = new Date(curYear.value, curMonth.value + 1, 0)

      // Monday-first: day 0=Sun → offset 6; Mon → 0; Tue → 1 etc.
      const startDow = (firstOfMonth.getDay() + 6) % 7
      const start = new Date(firstOfMonth)
      start.setDate(start.getDate() - startDow)

      const days = []
      const todayISO = toISO(today)

      let cur = new Date(start)
      // Always show 6 rows × 7 = 42 cells
      for (let i = 0; i < 42; i++) {
        const iso = toISO(cur)
        const dow = cur.getDay() // 0=Sun
        days.push({
          iso,
          day:          cur.getDate(),
          currentMonth: cur.getMonth() === curMonth.value,
          isToday:      iso === todayISO,
          isWeekend:    dow === 0 || dow === 6,
          holiday:      publicHolidayOn(iso),
          ferien:       schoolHolidayOn(iso),
        })
        cur.setDate(cur.getDate() + 1)
      }
      return days
    })

    // ── Week view ──────────────────────────────────────────────────────────
    const weekDays = computed(() => {
      // Use weekAnchor if set, otherwise derive from selectedDay or current month
      const base = weekAnchor.value
        ? new Date(weekAnchor.value)
        : (selectedDay.value ? new Date(selectedDay.value) : new Date(curYear.value, curMonth.value, 1))
      const dow = (base.getDay() + 6) % 7  // 0=Mon
      const mon = new Date(base)
      mon.setDate(mon.getDate() - dow)
      const todayISO = toISO(today)
      const days = []
      const WDS = ['Mo','Di','Mi','Do','Fr','Sa','So']
      for (let i = 0; i < 7; i++) {
        const d = new Date(mon)
        d.setDate(d.getDate() + i)
        const iso = toISO(d)
        days.push({
          iso,
          day:      d.getDate(),
          wdShort:  WDS[i],
          isToday:  iso === todayISO,
          isWeekend: i >= 5,
          holiday:  publicHolidayOn(iso),
          ferien:   schoolHolidayOn(iso),
        })
      }
      return days
    })

    // ── Holiday helpers ────────────────────────────────────────────────────
    function publicHolidayOn(iso) {
      if (!activeFilters.value.includes('feiertag')) return null
      const h = publicHolidays.value.find(h => (h.date || h.start) === iso)
      return h ? h.name : null
    }
    function schoolHolidayOn(iso) {
      if (!activeFilters.value.includes('ferien')) return null
      const f = schoolHolidays.value.find(f => iso >= f.start && iso <= f.end)
      return f ? f.name : null
    }

    function getDayObj(iso) {
      return calDays.value.find(d => d.iso === iso) || null
    }

    // ── Build events from store ────────────────────────────────────────────
    const allEvents = computed(() => {
      const events = []

      // Projects → Termin, Abgabe
      for (const proj of store.projects) {
        const cust = store.customers.find(c => c.id === proj.customerId)
        const custLabel = cust
          ? (cust.lastName || cust.firstName || cust.company || '')
          : ''
        const label = proj.projectName

        if (activeFilters.value.includes('termin') && proj.booking) {
          const s = makeEventStyle('termin')
          // bookingTime aus Auftrag nutzen; Fallback 09:00 für Zeitraster-Anzeige
          const rawTime = proj.bookingTime || ''
          // Normalize: "10:30 Uhr" → "10:30", "1030" → "10:30"
          const timeMatch = rawTime.match(/(\d{1,2})[:\s]?(\d{2})/)
          const startTime = timeMatch
            ? `${String(parseInt(timeMatch[1])).padStart(2,'0')}:${timeMatch[2]}`
            : '09:00'
          // Dauer: bookingDuration in Stunden, default 1h
          const durH = proj.bookingDuration ? parseFloat(proj.bookingDuration) : 1
          const [sh, sm] = startTime.split(':').map(Number)
          const endTotalMin = sh * 60 + sm + Math.round(durH * 60)
          const endTime = `${String(Math.floor(endTotalMin/60)).padStart(2,'0')}:${String(endTotalMin%60).padStart(2,'0')}`
          events.push({
            id: `termin-${proj.id}`,
            date: toISO(proj.booking),
            type: 'termin',
            title: `📸 ${label}`,
            shortTitle: label,
            subtitle: [proj.category, proj.location].filter(Boolean).join(' · '),
            note: proj.bookingTime ? `${proj.bookingTime} Uhr` : '',
            startTime,
            endTime,
            timeLabel: `${startTime}–${endTime}`,
            allDay: false,
            projectId: proj.id,
            ...s,
          })
        }

        if (activeFilters.value.includes('abgabe') && proj.deliveryDate) {
          const s = makeEventStyle('abgabe')
          events.push({
            id: `delivery-${proj.id}`,
            date: toISO(proj.deliveryDate),
            type: 'abgabe',
            title: `⏰ Abgabe: ${label}`,
            shortTitle: `Abgabe: ${custLabel || label}`,
            subtitle: proj.category,
            allDay: true,
            projectId: proj.id,
            ...s,
          })
        }
      }

      // Documents → Angebote, Rechnungen
      for (const doc of store.documents) {
        const proj = store.projects.find(p => p.id === doc.projectId)
        const projName = proj?.projectName || doc.name || ''
        const cust = store.customers.find(c => c.id === doc.customerId)
        const custLabel = cust ? (cust.lastName || cust.firstName || '') : ''

        // Quote events
        if (doc.type === 'quote') {
          if (activeFilters.value.includes('quote') && doc.issueDate) {
            // Sent
            if (['Versendet','Angenommen','Abgelehnt'].includes(doc.status)) {
              const s = makeEventStyle('quote-sent')
              events.push({
                id: `qs-${doc.id}`,
                date: toISO(doc.issueDate),
                type: 'quote-sent',
                title: `📋 ${doc.documentNumber}`,
                shortTitle: doc.documentNumber,
                subtitle: `Angebot versendet · ${projName}`,
                allDay: true,
                docId: doc.id,
                projectId: doc.projectId,
                ...s,
              })

              // Wiedervorlage (follow-up)
              const followDays = settings.settings?.calendarSettings?.quoteFollowUpDays ?? 14
              if (doc.status === 'Versendet' && followDays > 0) {
                const fu = new Date(doc.issueDate)
                fu.setDate(fu.getDate() + followDays)
                const fuISO = fu.toISOString().slice(0, 10)
                const sf = makeEventStyle('followup')
                events.push({
                  id: `qf-${doc.id}`,
                  date: fuISO,
                  type: 'followup',
                  title: `🔔 Wiedervorlage: ${doc.documentNumber}`,
                  shortTitle: `WV: ${custLabel || projName}`,
                  subtitle: `Nachfassen Angebot · ${projName}`,
                  note: `Angebot versandt am ${fmtDate(doc.issueDate)} — nach ${followDays} Tagen nachfassen`,
                  allDay: true,
                  docId: doc.id,
                  projectId: doc.projectId,
                  ...sf,
                })
              }
            }

            // Ablauf / Gültig bis
            if (doc.expiresAt && doc.status === 'Versendet') {
              const s = makeEventStyle('abgabe')
              events.push({
                id: `qe-${doc.id}`,
                date: toISO(doc.expiresAt),
                type: 'abgabe',
                title: `📋 Angebot läuft ab: ${doc.documentNumber}`,
                shortTitle: `Ablauf Angebot`,
                subtitle: projName,
                allDay: true,
                docId: doc.id,
                ...s,
              })
            }
          }
        }

        // Invoice events
        if (doc.type === 'invoice') {
          const isDeposit = !!doc.isDeposit

          if (activeFilters.value.includes('invoice')) {
            // Issue date
            if (doc.issueDate) {
              const type = isDeposit ? 'deposit-sent' : 'invoice-sent'
              const s = makeEventStyle(type)
              events.push({
                id: `is-${doc.id}`,
                date: toISO(doc.issueDate),
                type,
                title: isDeposit ? `💳 Anzahlung ${doc.documentNumber}` : `🧾 ${doc.documentNumber}`,
                shortTitle: doc.documentNumber,
                subtitle: `${isDeposit ? 'Anzahlungsrechnung' : 'Rechnung'} · ${projName}`,
                allDay: true,
                docId: doc.id,
                projectId: doc.projectId,
                ...s,
              })
            }
            // Due date
            if (doc.dueDate && !['Bezahlt','Storniert'].includes(doc.status)) {
              const type = isDeposit ? 'deposit-due' : 'invoice-due'
              const s = makeEventStyle(type)
              events.push({
                id: `id-${doc.id}`,
                date: toISO(doc.dueDate),
                type,
                title: isDeposit ? `⚡ Fälligkeit Anzahlung ${doc.documentNumber}` : `💰 Fälligkeit ${doc.documentNumber}`,
                shortTitle: `Fälligkeit ${doc.documentNumber}`,
                subtitle: projName,
                allDay: true,
                docId: doc.id,
                projectId: doc.projectId,
                ...s,
              })
            }
          }
        }
      }

      // Absences
      if (activeFilters.value.includes('absence')) {
        for (const abs of calendarEvents.value) {
          const s = makeEventStyle(abs.type)
          const label = abs.title || { urlaub: '🏖️ Urlaub', krank: '🤒 Krank', frei: '💼 Frei', meeting: '🤝 Besprechung', messe: '🏛️ Messe', event: '🎭 Termin' }[abs.type] || abs.type
          const dates = abs.endDate
            ? dateRange(abs.startDate, abs.endDate)
            : [abs.startDate]
          for (const d of dates) {
            events.push({
              id: `abs-${abs.id}-${d}`,
              date: d,
              type: abs.type,
              title: `${label}${abs.note ? ': ' + abs.note : ''}`,
              shortTitle: label,
              note: abs.note || abs.description || '',
              location: abs.location || '',
              description: abs.description || '',
              timeLabel: (abs.startTime && abs.endTime) ? `${abs.startTime}–${abs.endTime}` : (abs.startTime || ''),
              startTime: abs.startTime || null,
              endTime: abs.endTime || null,
              allDay: !abs.startTime || abs.startDate !== abs.endDate,
              absenceId: abs.id,
              ...s,
            })
          }
        }
      }

      return events
    })

    // ── Get events for a specific day ──────────────────────────────────────
    function getEventsForDay(iso) {
      return allEvents.value.filter(e => e.date === iso)
    }

    // ── Holidays loading ───────────────────────────────────────────────────
    function getYears() {
      // Immer Vorjahr + aktuelles + Folgejahr – deckt jahresübergreifende Ferien ab
      return [curYear.value - 1, curYear.value, curYear.value + 1]
    }

    async function loadPublicHolidays() {
      if (!selectedBundeslaender.value.length) { publicHolidays.value = []; return }
      const data = await fetchPublicHolidays(selectedBundeslaender.value, getYears())
      publicHolidays.value = data
    }

    async function loadSchoolHolidays() {
      if (!selectedFerienBundeslaender.value.length) { schoolHolidays.value = []; return }
      ferienLoading.value = true
      ferienError.value   = null
      try {
        const result = await fetchSchoolHolidays(selectedFerienBundeslaender.value, getYears())
        if (Array.isArray(result)) {
          schoolHolidays.value = result
          if (result.length === 0 && selectedFerienBundeslaender.value.length > 0) {
            ferienError.value = 'Keine Schulferien geladen — APIs nicht erreichbar'
          }
        } else {
          schoolHolidays.value = result.data || []
          ferienError.value = result.error || 'Schulferien-APIs nicht erreichbar'
        }
      } catch (e) {
        ferienError.value    = 'Fehler: ' + e.message
        schoolHolidays.value = []
      } finally {
        ferienLoading.value = false
      }
    }

    function reloadHolidays() {
      loadPublicHolidays()
      if (selectedFerienBundeslaender.value.length > 0) loadSchoolHolidays()
    }

    function onBundeslaendChange() {
      clearHolidayCache()
      loadPublicHolidays()
      persistCalSettings()
    }
    function onFerienChange() {
      clearHolidayCache()
      loadSchoolHolidays()
      persistCalSettings()
    }

    function removeBundesland(code, type) {
      if (type === 'feiertag') {
        selectedBundeslaender.value = selectedBundeslaender.value.filter(c => c !== code)
        loadPublicHolidays()
      } else {
        selectedFerienBundeslaender.value = selectedFerienBundeslaender.value.filter(c => c !== code)
        loadSchoolHolidays()
      }
      persistCalSettings()
    }

    function selectAllBundeslaender(type) {
      const all = BUNDESLAENDER.map(b => b.code)
      if (type === 'feiertag') { selectedBundeslaender.value = all; loadPublicHolidays() }
      else { selectedFerienBundeslaender.value = all; loadSchoolHolidays() }
      persistCalSettings()
    }

    function clearAllBundeslaender(type) {
      if (type === 'feiertag') { selectedBundeslaender.value = []; publicHolidays.value = [] }
      else { selectedFerienBundeslaender.value = []; schoolHolidays.value = [] }
      persistCalSettings()
    }

    // ── Persist settings ──────────────────────────────────────────────────
    async function persistCalSettings() {
      try {
        await fetch(`${API}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...settings.settings,
            calendarSettings: {
              ...(settings.settings?.calendarSettings || {}),
              bundeslaender: selectedBundeslaender.value,
              ferienBundeslaender: selectedFerienBundeslaender.value,
              quoteFollowUpDays: settings.settings?.calendarSettings?.quoteFollowUpDays ?? 14,
            },
            calendarEvents: calendarEvents.value,
          }),
        })
        settings.reload && await settings.reload()
      } catch (e) { console.error('Settings save error:', e) }
    }

    // ── Absence CRUD ──────────────────────────────────────────────────────
    function openAbsenceModal(preDate = null) {
      absenceForm.value = {
        id: null,
        type: 'urlaub',
        startDate: preDate || toISO(today),
        endDate:   preDate || toISO(today),
        note: '',
      }
      showAbsenceModal.value = true
    }
    function closeAbsenceModal() {
      showAbsenceModal.value = false
    }
    async function saveAbsence() {
      const form = absenceForm.value
      if (!form.startDate) return
      if (!form.endDate) form.endDate = form.startDate
      const entry = {
        id:        form.id || `abs_${Date.now()}`,
        type:      form.type,
        startDate: form.startDate,
        endDate:   form.endDate,
        note:      form.note,
      }
      if (form.id) {
        const idx = calendarEvents.value.findIndex(e => e.id === form.id)
        if (idx !== -1) calendarEvents.value[idx] = entry
      } else {
        calendarEvents.value.push(entry)
      }
      closeAbsenceModal()
      await persistCalSettings()
    }
    async function deleteAbsence(id) {
      if (!confirm('Eintrag wirklich löschen?')) return
      calendarEvents.value = calendarEvents.value.filter(e => e.id !== id)
      await persistCalSettings()
    }

    // ── Week navigation ───────────────────────────────────────────────────────
    function getWeekMonday(iso) {
      const d = new Date(iso)
      const dow = (d.getDay() + 6) % 7
      d.setDate(d.getDate() - dow)
      return toISO(d)
    }

    function prevWeek() {
      const anchor = weekAnchor.value || getWeekMonday(toISO(new Date(curYear.value, curMonth.value, 1)))
      const d = new Date(anchor)
      d.setDate(d.getDate() - 7)
      weekAnchor.value = toISO(d)
      // Sync curYear/curMonth to middle of new week (Thursday)
      const thu = new Date(d)
      thu.setDate(thu.getDate() + 3)
      curYear.value  = thu.getFullYear()
      curMonth.value = thu.getMonth()
    }

    function nextWeek() {
      const anchor = weekAnchor.value || getWeekMonday(toISO(new Date(curYear.value, curMonth.value, 1)))
      const d = new Date(anchor)
      d.setDate(d.getDate() + 7)
      weekAnchor.value = toISO(d)
      const thu = new Date(d)
      thu.setDate(thu.getDate() + 3)
      curYear.value  = thu.getFullYear()
      curMonth.value = thu.getMonth()
    }

    // ── Context-aware navigation ───────────────────────────────────────────────
    const navLabel = computed(() => {
      if (view.value === 'week') {
        const days = weekDays.value
        if (!days.length) return ''
        const first = days[0], last = days[6]
        const fd = new Date(first.iso), ld = new Date(last.iso)
        const sameMonth = fd.getMonth() === ld.getMonth()
        if (sameMonth) {
          return fd.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
            .replace(/(\d+)\.\s(\w+)\s(\d+)/, `${fd.getDate()}. – ${ld.getDate()}. $2 $3`)
        }
        const fs = fd.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
        const ls = ld.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
        return `${fs} – ${ls}`
      }
      if (view.value === 'day') {
        return dayViewDate.value ? formatDayFull(dayViewDate.value) : ''
      }
      return monthLabel.value
    })

    function navPrev() {
      if (view.value === 'week') { prevWeek(); return }
      if (view.value === 'day')  { prevDay();  return }
      prevMonth()
    }
    function navNext() {
      if (view.value === 'week') { nextWeek(); return }
      if (view.value === 'day')  { nextDay();  return }
      nextMonth()
    }
    function switchToWeek() {
      const anchor = selectedDay.value || dayViewDate.value || toISO(today)
      weekAnchor.value = getWeekMonday(anchor)
      const thu = new Date(weekAnchor.value)
      thu.setDate(thu.getDate() + 3)
      curYear.value  = thu.getFullYear()
      curMonth.value = thu.getMonth()
      view.value = 'week'
    }

    // ── Day view navigation ────────────────────────────────────────────────
    const todayISO = toISO(today)

    function setDayView(iso) {
      if (!iso) return
      dayViewDate.value = iso
      const d = new Date(iso)
      curYear.value  = d.getFullYear()
      curMonth.value = d.getMonth()
      view.value = 'day'
    }
    function prevDay() {
      if (!dayViewDate.value) return
      const d = new Date(dayViewDate.value)
      d.setDate(d.getDate() - 1)
      dayViewDate.value = toISO(d)
    }
    function nextDay() {
      if (!dayViewDate.value) return
      const d = new Date(dayViewDate.value)
      d.setDate(d.getDate() + 1)
      dayViewDate.value = toISO(d)
    }
    const dayViewObj = computed(() => {
      if (!dayViewDate.value) return null
      return calDays.value.find(d => d.iso === dayViewDate.value) || null
    })

    // ── Time grid helpers ─────────────────────────────────────────────────
    const timeGridHours = TIME_GRID_HOURS

    function timeToMinutes(t) {
      if (!t) return null
      const [h, m] = t.split(':').map(Number)
      return h * 60 + (m || 0)
    }

    function timeEventStyle(ev) {
      const gridStart = TIME_GRID_START * 60  // in minutes
      const gridEnd   = TIME_GRID_END   * 60
      const totalMin  = gridEnd - gridStart
      const startMin  = timeToMinutes(ev.startTime)
      const endMin    = timeToMinutes(ev.endTime)
      if (startMin === null) return ''
      const clampStart = Math.max(startMin, gridStart)
      const clampEnd   = endMin ? Math.min(endMin, gridEnd) : clampStart + 60
      const top    = (clampStart - gridStart) / 60 * HOUR_HEIGHT_PX
      const height = Math.max((clampEnd - clampStart) / 60 * HOUR_HEIGHT_PX, 24)
      return `position:absolute;top:${top}px;height:${height}px;` +
             `background:${ev.bg};border-left:3px solid ${ev.borderColor};color:${ev.color};` +
             `left:4px;right:4px;border-radius:5px;overflow:hidden;padding:3px 6px;` +
             `font-size:11px;cursor:pointer;z-index:2;`
    }

    function getTimedEventsForDay(iso) {
      return allEvents.value.filter(e => e.date === iso && !e.allDay && e.startTime)
    }

    const nowLineTop = computed(() => {
      const now = new Date()
      const min = now.getHours() * 60 + now.getMinutes()
      const gridStart = TIME_GRID_START * 60
      return Math.max(0, (min - gridStart) / 60 * HOUR_HEIGHT_PX)
    })

    const weekAllDayEvents = computed(() => {
      return weekDays.value.flatMap(d => allEvents.value.filter(e => e.date === d.iso && e.allDay))
    })
    const weekAllEvents = computed(() => {
      return weekDays.value.flatMap(d => allEvents.value.filter(e => e.date === d.iso))
    })

    // ── Event modal (replaces absence modal) ────────────────────────────────
    const eventIsMultiDay = computed(() => {
      return eventForm.value.startDate && eventForm.value.endDate &&
             eventForm.value.startDate !== eventForm.value.endDate
    })

    function openEventModal(preDate = null) {
      const d = preDate || toISO(today)
      eventForm.value = {
        id: null, type: 'meeting',
        title: '', startDate: d, endDate: d,
        startTime: '', endTime: '',
        location: '', description: '',
      }
      showEventModal.value = true
    }
    function closeEventModal() {
      showEventModal.value = false
    }
    function syncEndDate() {
      if (!eventForm.value.endDate || eventForm.value.endDate < eventForm.value.startDate) {
        eventForm.value.endDate = eventForm.value.startDate
      }
    }
    function editEvent(id) {
      const ev = calendarEvents.value.find(e => e.id === id)
      if (!ev) return
      eventForm.value = {
        id: ev.id,
        type:        ev.type || 'event',
        title:       ev.title || '',
        startDate:   ev.startDate || '',
        endDate:     ev.endDate   || ev.startDate || '',
        startTime:   ev.startTime || '',
        endTime:     ev.endTime   || '',
        location:    ev.location  || '',
        description: ev.description || ev.note || '',
      }
      showEventModal.value = true
    }
    async function saveEvent() {
      const form = eventForm.value
      if (!form.startDate || !form.title.trim()) return
      const entry = {
        id:          form.id || `evt_${Date.now()}`,
        type:        form.type,
        title:       form.title.trim(),
        startDate:   form.startDate,
        endDate:     form.endDate || form.startDate,
        startTime:   form.startTime || null,
        endTime:     form.endTime   || null,
        location:    form.location  || '',
        description: form.description || '',
      }
      if (form.id) {
        const idx = calendarEvents.value.findIndex(e => e.id === form.id)
        if (idx !== -1) calendarEvents.value[idx] = entry
      } else {
        calendarEvents.value.push(entry)
      }
      closeEventModal()
      await persistCalSettings()
    }
    async function deleteEvent(id) {
      if (!confirm('Termin wirklich löschen?')) return
      calendarEvents.value = calendarEvents.value.filter(e => e.id !== id)
      await persistCalSettings()
    }

    // ── Day selection ─────────────────────────────────────────────────────
    function selectDay(day) {
      selectedDay.value = day.iso
      showDayDetail.value = true
    }
    function closeDayDetail() {
      showDayDetail.value = false
    }
    function selectEvent(ev, dayISO) {
      selectedDay.value = dayISO
      showDayDetail.value = true
    }

    // ── Format helpers ─────────────────────────────────────────────────────
    function fmtDate(iso) {
      if (!iso) return '—'
      return new Date(iso).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    }
    function formatDayFull(iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
    }

    // ── Init ──────────────────────────────────────────────────────────────
    onMounted(async () => {
      try {
        await store.fetchProjects()
        await store.fetchDocuments()
        await store.fetchCustomers()
      } catch(e) { console.error('[Calendar] Store-Daten:', e.message) }

      try {
        // Load settings
        await settings.fetchSettings()
      const cs = settings.settings?.calendarSettings || {}
      // Use saved selection or fall back to defaults from settings
      selectedBundeslaender.value = Array.isArray(cs.bundeslaender) && cs.bundeslaender.length > 0
        ? cs.bundeslaender
        : (cs.defaultBundesland ? [cs.defaultBundesland] : ['MV'])
      selectedFerienBundeslaender.value = Array.isArray(cs.ferienBundeslaender) && cs.ferienBundeslaender.length > 0
        ? cs.ferienBundeslaender
        : (cs.defaultFerienBundesland ? [cs.defaultFerienBundesland] : [])
      calendarEvents.value              = Array.isArray(settings.settings?.calendarEvents) ? settings.settings.calendarEvents : []

        loadPublicHolidays()
        if (selectedFerienBundeslaender.value.length > 0) await loadSchoolHolidays()
      } catch(e) { console.error('[Calendar] Settings/Holidays:', e.message) }
    })

    return {
      // calendar state
      curYear, curMonth, view, calDays, weekDays, monthLabel,
      prevMonth, nextMonth, goToday,
      // events
      allEvents, getEventsForDay, maxEventsPerDay,
      // filters
      eventFilters, activeFilters, toggleFilter,
      // selection
      selectedDay, showDayDetail, selectDay, closeDayDetail, selectEvent,
      getDayObj, formatDayFull,
      // holidays
      BUNDESLAENDER, BUNDESLAENDER_BY_REGION,
      selectedBundeslaender, selectedFerienBundeslaender,
      showFeiertagePanel, showFerienPanel,
      publicHolidays, schoolHolidays, ferienLoading, ferienError,
      onBundeslaendChange, onFerienChange,
      removeBundesland, selectAllBundeslaender, clearAllBundeslaender,
      // day view
      dayViewDate, dayViewObj, setDayView, prevDay, nextDay, todayISO,
      weekAnchor, prevWeek, nextWeek, switchToWeek,
      navLabel, navPrev, navNext,
      // time grid
      timeGridHours, timeEventStyle, getTimedEventsForDay, nowLineTop,
      weekAllDayEvents, weekAllEvents,
      // event modal
      showEventModal, eventForm, eventIsMultiDay,
      EVENT_TYPES, EVENT_TYPE_ICONS, EVENT_TYPE_PLACEHOLDER,
      openEventModal, closeEventModal, syncEndDate, editEvent, saveEvent, deleteEvent,
      // helpers
      fmtDate,
    }
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   CALENDAR — Design-System-konformes Layout
   Topbar: 52px | Cal-Page füllt restliche Höhe ohne zu scrollen
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Page ────────────────────────────────────────────────────────────────── */
.cal-page {
  display: flex; flex-direction: column;
  height: calc(100vh - 52px);
  overflow: hidden;
  background: var(--bg);
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.cal-toolbar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0 10px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: nowrap;
}

/* Nav: ◀ Label ▶ Heute */
.cal-nav { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.cal-nav-btn {
  width: 28px; height: 28px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: var(--surface);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: var(--text-2); transition: all .12s;
}
.cal-nav-btn:hover { background: var(--bg-alt); border-color: var(--primary); color: var(--primary); }

.cal-month-label {
  font-size: 14px; font-weight: 700; color: var(--text);
  min-width: 210px; text-align: center; cursor: pointer;
  letter-spacing: -.3px; white-space: nowrap;
  padding: 4px 8px; border-radius: var(--radius-sm);
  transition: color .12s;
}
.cal-month-label:hover { color: var(--primary); }

.cal-today-btn {
  padding: 4px 10px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: var(--surface);
  font-size: 12px; font-weight: 600; color: var(--text-2);
  cursor: pointer; font-family: inherit; transition: all .12s;
}
.cal-today-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }

/* Divider */
.cal-toolbar-sep {
  width: 1px; height: 22px; background: var(--border); flex-shrink: 0;
}

/* View switcher */
.cal-view-switcher {
  display: flex; border: 1px solid var(--border);
  border-radius: var(--radius-sm); overflow: hidden; flex-shrink: 0;
}
.cvs-btn {
  padding: 5px 12px; background: var(--surface);
  border: none; border-right: 1px solid var(--border);
  font-size: 12px; font-weight: 600; color: var(--text-muted);
  cursor: pointer; font-family: inherit; transition: all .12s;
}
.cvs-btn:last-child { border-right: none; }
.cvs-btn:hover { background: var(--bg-alt); color: var(--text); }
.cvs-btn.active { background: var(--primary); color: white; }

/* Filters — compact pill-row */
.cal-filters {
  display: flex; gap: 4px; flex: 1; flex-wrap: nowrap; overflow-x: auto;
  scrollbar-width: none;
}
.cal-filters::-webkit-scrollbar { display: none; }
.cf-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 9px; border: 1px solid var(--border);
  border-radius: 99px; background: var(--surface-2);
  font-size: 11px; font-weight: 600; color: var(--text-2);
  cursor: pointer; font-family: inherit; transition: all .12s;
  white-space: nowrap; flex-shrink: 0;
}
.cf-btn:hover { border-color: var(--primary-text); color: var(--primary-text); }
.cf-btn.active { font-weight: 700; }
.cf-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* + Termin */
.cal-add-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; background: var(--primary);
  color: white; border: none; border-radius: var(--radius-sm);
  font-size: 12.5px; font-weight: 700; cursor: pointer;
  font-family: inherit; transition: background .12s; flex-shrink: 0;
}
.cal-add-btn:hover { background: var(--primary-hover); }

/* ── Region bar ──────────────────────────────────────────────────────────── */
.cal-region-bar {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 6px 0; border-bottom: 1px solid var(--border);
  background: var(--surface-2); flex-shrink: 0;
}
.crb-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: var(--surface);
  font-size: 11.5px; font-weight: 600; color: var(--text-2);
  cursor: pointer; font-family: inherit; transition: all .12s;
}
.crb-btn:hover { border-color: var(--warning); color: var(--text); }
.crb-btn--ferien:hover { border-color: var(--primary); }
.crb-btn--active { border-color: var(--warning); background: var(--warning-bg); color: var(--text); }
.crb-btn--ferien.crb-btn--active { border-color: var(--primary); background: var(--primary-light); }
.crb-icon { font-size: 13px; }
.crb-label { font-size: 11.5px; }
.crb-count {
  font-size: 10px; font-weight: 700; padding: 1px 5px;
  background: var(--warning); color: white; border-radius: 99px;
}
.crb-count--ferien { background: var(--primary); }
.crb-caret { font-size: 9px; color: var(--text-muted); }
.crb-err-dot {
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--danger); color: white;
  font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.crb-spinner {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--primary);
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.crb-active-badges { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
.crb-badge {
  display: flex; align-items: center; gap: 4px;
  padding: 2px 7px; border-radius: 99px;
  font-size: 10.5px; font-weight: 600;
}
.crb-badge--feiertag { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border); }
.crb-badge--ferien   { background: var(--primary-light); color: var(--primary-text); border: 1px solid rgba(99,102,241,.25); }
.crb-badge-del { background: none; border: none; cursor: pointer; color: inherit; opacity: .6; font-size: 12px; padding: 0 1px; }
.crb-badge-del:hover { opacity: 1; }

/* ── BL Panels ───────────────────────────────────────────────────────────── */
.bl-panel {
  border-bottom: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}
.bl-panel--feiertag { border-left: 3px solid var(--warning); }
.bl-panel--ferien   { border-left: 3px solid var(--primary); }

.bl-panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px 7px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.bl-panel-title { font-size: 12px; font-weight: 700; color: var(--text); }
.bl-panel-actions { display: flex; align-items: center; gap: 5px; }
.bl-action-btn {
  padding: 2px 9px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: none;
  font-size: 11px; cursor: pointer; color: var(--text-2);
  font-family: inherit; transition: all .12s;
}
.bl-action-btn:hover { border-color: var(--primary); color: var(--primary-text); }
.bl-panel-close {
  background: none; border: none; cursor: pointer;
  font-size: 13px; color: var(--text-muted); padding: 2px 5px;
  border-radius: var(--radius-sm);
}
.bl-panel-close:hover { color: var(--text); background: var(--bg-alt); }
.bl-panel-body { padding: 10px 14px; display: flex; gap: 18px; flex-wrap: wrap; }
.bl-region-group { min-width: 140px; }
.bl-region-label {
  font-size: 9.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; color: var(--text-muted);
  margin-bottom: 5px; padding-bottom: 3px;
  border-bottom: 1px solid var(--border);
}
.bl-region-items { display: flex; flex-direction: column; gap: 1px; }
.bl-item {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 7px; border-radius: var(--radius-sm);
  cursor: pointer; transition: background .1s;
  border: 1px solid transparent;
}
.bl-item:hover { background: var(--bg-alt); }
.bl-item--active { background: var(--warning-bg); border-color: var(--warning-border); }
.bl-item--ferien.bl-item--active { background: var(--primary-light); border-color: rgba(99,102,241,.2); }
.bl-item-check {
  width: 15px; height: 15px; flex-shrink: 0;
  border: 1.5px solid var(--border); border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800; color: white;
  transition: all .1s;
}
.bl-item--active .bl-item-check { background: var(--warning); border-color: var(--warning); }
.bl-item--ferien.bl-item--active .bl-item-check { background: var(--primary); border-color: var(--primary); }
.bl-item-code { font-size: 10.5px; font-weight: 700; color: var(--text-muted); min-width: 24px; font-family: 'DM Mono', monospace; }
.bl-item--active .bl-item-code { color: var(--warning); }
.bl-item--ferien.bl-item--active .bl-item-code { color: var(--primary-text); }
.bl-item-name { font-size: 12px; color: var(--text-2); font-weight: 500; white-space: nowrap; }
.bl-item--active .bl-item-name { color: var(--text); font-weight: 600; }

.bl-panel-loading { padding: 8px 14px; font-size: 12px; color: var(--primary-text); border-top: 1px solid var(--border); background: var(--primary-light); }
.bl-panel-error   { padding: 8px 14px; font-size: 12px; color: var(--danger); border-top: 1px solid var(--danger-border); background: var(--danger-bg); }
.loading-dots { display: inline-flex; }
.ld { animation: blink 1.2s infinite; }
.ld:nth-child(2) { animation-delay: .2s; }
.ld:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%,80%,100% { opacity:.2; } 40% { opacity:1; } }

/* Panel slide */
.panel-slide-enter-active { transition: max-height .18s ease, opacity .12s; overflow: hidden; }
.panel-slide-leave-active { transition: max-height .13s ease, opacity .1s; overflow: hidden; }
.panel-slide-enter-from, .panel-slide-leave-to { max-height: 0; opacity: 0; }
.panel-slide-enter-to, .panel-slide-leave-from { max-height: 500px; opacity: 1; }

/* ═══════════════════════════════════════════════════════════════════════════
   MONTH VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
.cal-grid-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.cal-grid-head {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--border);
  background: var(--surface-2); flex-shrink: 0;
}
.cgh-cell {
  padding: 5px 8px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--text-muted); text-align: center;
}

.cal-grid-body {
  display: grid; grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  flex: 1;
  border-left: 1px solid var(--border);
  overflow: hidden;
}
.cal-day {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 4px 6px;
  cursor: pointer; transition: background .1s;
  display: flex; flex-direction: column; gap: 2px;
  position: relative; overflow: hidden;
}
.cal-day:hover { background: var(--bg-alt); }
.cal-day--other { opacity: .35; pointer-events: none; }
.cal-day--today { background: var(--primary-light); }
.cal-day--today:hover { filter: brightness(.97); }
.cal-day--weekend:not(.cal-day--today) { background: var(--surface-2); }
.cal-day--holiday { background: #FFFBEB; }
.cal-day--ferien { background: rgba(99,102,241,.04) !important; }
.cal-day--selected { outline: 2px solid var(--primary); outline-offset: -2px; }

.cd-num-row { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.cd-num {
  font-size: 11.5px; font-weight: 700; color: var(--text-2);
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; flex-shrink: 0;
}
.cal-day--today .cd-num { background: var(--primary); color: white; }
.cd-holiday-label {
  font-size: 8.5px; font-weight: 700; color: var(--warning);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
}
.cd-ferien-label {
  font-size: 8.5px; font-weight: 600; color: var(--primary-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
}
.cd-events { display: flex; flex-direction: column; gap: 1px; flex: 1; overflow: hidden; }
.cd-ev {
  padding: 1px 5px; border-radius: 3px;
  font-size: 10px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 3px;
  transition: filter .1s; white-space: nowrap; overflow: hidden;
}
.cd-ev:hover { filter: brightness(.93); }
.cd-ev-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.cd-ev-text { overflow: hidden; text-overflow: ellipsis; }
.cd-ev-more {
  font-size: 9.5px; color: var(--text-muted); font-weight: 600;
  padding: 1px 5px; cursor: pointer; text-align: center;
}
.cd-ev-more:hover { color: var(--primary-text); }

/* Legend (nur Monatsansicht) */
.cal-legend {
  display: flex; gap: 10px; flex-wrap: wrap;
  padding: 6px 0; border-top: 1px solid var(--border);
  background: var(--surface-2); flex-shrink: 0;
}
.leg-item { display: flex; align-items: center; gap: 5px; }
.leg-dot { width: 8px; height: 8px; border-radius: 50%; }
.leg-lbl { font-size: 11px; color: var(--text-2); font-weight: 500; }

/* ═══════════════════════════════════════════════════════════════════════════
   WEEK VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
.cal-week-wrap {
  flex: 1; overflow: hidden;
  display: flex; flex-direction: column;
}

/* Day header row */
.wk-header {
  display: grid; grid-template-columns: 44px repeat(7, 1fr);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0; z-index: 4;
}
.wk-gutter { width: 44px; flex-shrink: 0; }
.wk-head-cell {
  padding: 7px 4px 6px; text-align: center; cursor: pointer;
  border-right: 1px solid var(--border); border-left: 1px solid transparent;
  transition: background .1s;
}
.wk-head-cell:last-child { border-right: none; }
.wk-head-cell:hover { background: var(--bg-alt); }
.wkh-today { background: var(--primary-light); }
.wkh-weekend { background: var(--surface-2); }
.wkh-wd { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); }
.wkh-num {
  font-size: 16px; font-weight: 800; color: var(--text); line-height: 1.25;
  width: 28px; height: 28px; margin: 1px auto;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.wkh-num--today { background: var(--primary); color: white; }
.wkh-badge {
  font-size: 8.5px; font-weight: 600; padding: 1px 4px;
  border-radius: 99px; margin-top: 2px; display: inline-block;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 96%;
}
.wkh-badge--feiertag { background: var(--warning-bg); color: var(--warning); }
.wkh-badge--ferien   { background: var(--primary-light); color: var(--primary-text); }

/* All-day row (always visible) */
.wk-allday-row {
  display: grid; grid-template-columns: 44px repeat(7, 1fr);
  border-bottom: 2px solid var(--border);
  background: var(--surface-2);
  flex-shrink: 0; min-height: 26px;
}
.wk-gutter--label {
  display: flex; align-items: center; justify-content: flex-end;
  padding-right: 5px; padding-bottom: 2px;
  font-size: 8.5px; font-weight: 700; text-transform: uppercase;
  color: var(--text-muted); letter-spacing: .06em; line-height: 1;
}
.wk-allday-col {
  border-right: 1px solid var(--border);
  padding: 2px 2px 2px 3px;
  display: flex; flex-direction: column; gap: 1px;
  min-height: 26px;
}
.wk-allday-col:last-child { border-right: none; }
.wk-allday-ev {
  font-size: 9.5px; font-weight: 600; padding: 1px 4px;
  border-radius: 3px; cursor: pointer; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
  transition: filter .1s;
}
.wk-allday-ev:hover { filter: brightness(.9); }

/* Time grid */
.wk-grid-scroll {
  flex: 1; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: var(--border) transparent;
}
.wk-grid {
  display: grid;
  grid-template-columns: 44px repeat(7, 1fr);
  position: relative;
}
.wk-hours { z-index: 2; background: var(--surface); border-right: 1px solid var(--border); }
.wk-hour-label {
  height: 56px;
  font-size: 9.5px; color: var(--text-muted);
  display: flex; align-items: flex-start;
  padding: 3px 5px 0;
  font-family: 'DM Mono', monospace;
  border-bottom: 1px solid var(--border);
}
.wk-day-col {
  position: relative; border-right: 1px solid var(--border);
  cursor: pointer; transition: background .1s;
}
.wk-day-col:last-child { border-right: none; }
.wk-day-col:hover { background: rgba(99,102,241,.025); }
.wk-col--today { background: rgba(99,102,241,.04); }
.wk-col--weekend { background: rgba(0,0,0,.015); }
.wk-hour-line { height: 56px; border-bottom: 1px solid var(--border); }
.wk-ev { transition: filter .12s, box-shadow .12s; }
.wk-ev:hover { filter: brightness(.91); box-shadow: 0 2px 8px rgba(0,0,0,.12); }
.wk-ev-title { font-weight: 700; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wk-ev-time  { font-size: 9.5px; opacity: .8; margin-top: 1px; }

/* Now line */
.wk-now-line {
  position: absolute; left: 0; right: 0; height: 2px;
  background: var(--danger); z-index: 3; pointer-events: none;
}
.wk-now-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--danger);
  position: absolute; left: -4px; top: -3px;
}

/* Week event list (unterhalb Zeitraster) */
.wk-event-list {
  flex-shrink: 0; border-top: 2px solid var(--border);
  background: var(--surface); max-height: 130px; overflow-y: auto;
  padding: 6px 10px;
  scrollbar-width: thin;
}
.wel-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; color: var(--text-muted); margin-bottom: 5px;
}
.wel-empty { font-size: 12px; color: var(--text-muted); padding: 4px 0; }
.wel-day-label {
  font-size: 10.5px; font-weight: 700; color: var(--text-2);
  margin-top: 6px; margin-bottom: 3px;
}
.wel-ev {
  display: flex; align-items: flex-start; gap: 7px;
  padding: 4px 7px; margin-bottom: 2px;
  border-radius: var(--radius-sm); cursor: pointer;
  background: var(--surface-2); border-left: 3px solid var(--border);
  transition: background .1s;
}
.wel-ev:hover { background: var(--bg-alt); }
.wel-ev-icon { font-size: 13px; flex-shrink: 0; padding-top: 1px; }
.wel-ev-body { flex: 1; min-width: 0; }
.wel-ev-title { font-size: 12px; font-weight: 600; color: var(--text); }
.wel-ev-meta { display: flex; gap: 8px; font-size: 10.5px; color: var(--text-muted); margin-top: 1px; flex-wrap: wrap; }

/* ═══════════════════════════════════════════════════════════════════════════
   DAY VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
.cal-day-wrap {
  flex: 1; overflow: hidden; display: flex; flex-direction: column;
}
.dv-header {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
}
.dv-title {
  font-size: 14px; font-weight: 700; color: var(--text);
  flex: 1; text-align: center;
  display: flex; align-items: center; justify-content: center; gap: 7px; flex-wrap: wrap;
}
.dv-title--today { color: var(--primary); }
.dv-badge {
  font-size: 9.5px; font-weight: 600; padding: 2px 7px;
  border-radius: 99px; border: 1px solid transparent;
}
.dv-badge--feiertag { background: var(--warning-bg); color: var(--warning); border-color: var(--warning-border); }
.dv-badge--ferien   { background: var(--primary-light); color: var(--primary-text); }

.dv-allday {
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
  padding: 5px 10px; border-bottom: 1px solid var(--border);
  background: var(--surface-2); flex-shrink: 0;
}
.dv-allday-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: .06em; margin-right: 2px; }
.dv-allday-ev { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 3px; cursor: pointer; white-space: nowrap; }

.dv-grid-scroll { flex: 1; overflow-y: auto; scrollbar-width: thin; }
.dv-grid { display: grid; grid-template-columns: 44px 1fr; position: relative; }
.dv-hours { background: var(--surface); border-right: 1px solid var(--border); z-index: 2; }
.dv-hour-label {
  height: 56px; font-size: 9.5px; color: var(--text-muted);
  display: flex; align-items: flex-start; padding: 3px 5px 0;
  font-family: 'DM Mono', monospace; border-bottom: 1px solid var(--border);
}
.dv-col { position: relative; min-height: calc(56px * 16); cursor: pointer; }
.dv-hour-line { height: 56px; border-bottom: 1px solid var(--border); }
.dv-ev {
  position: absolute; left: 8px; right: 8px;
  border-radius: var(--radius-sm); padding: 5px 8px;
  cursor: pointer; transition: filter .12s, box-shadow .12s; z-index: 2;
}
.dv-ev:hover { filter: brightness(.92); box-shadow: 0 3px 12px rgba(0,0,0,.14); }
.dv-ev-header { display: flex; align-items: center; gap: 5px; margin-bottom: 2px; }
.dv-ev-icon  { font-size: 14px; }
.dv-ev-title { font-size: 13px; font-weight: 700; }
.dv-ev-time  { font-size: 11px; opacity: .8; margin-bottom: 2px; }
.dv-ev-loc   { font-size: 11px; opacity: .75; }
.dv-ev-desc  { font-size: 11px; opacity: .7; margin-top: 3px; white-space: pre-wrap; }

/* ═══════════════════════════════════════════════════════════════════════════
   DAY DETAIL POPOVER
   ═══════════════════════════════════════════════════════════════════════════ */
.day-popover-overlay {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.35); backdrop-filter: blur(2px);
}
.day-popover {
  background: var(--surface); border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg); width: 380px; max-width: calc(100vw - 32px);
  max-height: 80vh; overflow-y: auto;
}
.dp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 12px; border-bottom: 1px solid var(--border);
}
.dp-date { font-size: 14px; font-weight: 700; color: var(--text); }
.dp-actions { display: flex; align-items: center; gap: 6px; }
.dp-close { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--text-muted); padding: 2px 6px; }
.dp-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 7px; }
.dp-empty { font-size: 12.5px; color: var(--text-muted); padding: 8px 0; text-align: center; }
.dp-ev {
  padding: 8px 10px; border-radius: var(--radius);
  background: var(--surface-2); border-left: 3px solid var(--border);
}
.dp-ev-header { display: flex; align-items: center; gap: 7px; }
.dp-ev-icon  { font-size: 15px; }
.dp-ev-title { font-size: 13px; font-weight: 700; color: var(--text); flex: 1; }
.dp-ev-del, .dp-ev-edit {
  background: none; border: none; cursor: pointer;
  font-size: 13px; opacity: .5; transition: opacity .1s; padding: 1px;
}
.dp-ev-del:hover, .dp-ev-edit:hover { opacity: 1; }
.dp-ev-sub  { font-size: 11.5px; color: var(--text-2); margin-top: 3px; }
.dp-ev-note { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; font-style: italic; }
.dp-ev-actions { margin-top: 6px; }
.dp-link { font-size: 11.5px; color: var(--primary-text); font-weight: 600; }
.dp-holiday { padding: 6px 9px; background: var(--warning-bg); color: var(--warning); border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; }
.dp-ferien  { padding: 6px 9px; background: var(--primary-light); color: var(--primary-text); border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; }

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL (Termin)
   ═══════════════════════════════════════════════════════════════════════════ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,.4); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.modal {
  background: var(--surface); border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg); width: 100%; max-width: 520px;
  max-height: calc(100vh - 48px); overflow-y: auto;
}
.modal--event { max-width: 560px; }
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 14px; border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--surface); z-index: 1;
}
.modal-header-left { display: flex; align-items: center; gap: 9px; }
.modal-type-icon { font-size: 20px; }
.modal-header h2 { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
.modal-close { background: none; border: none; cursor: pointer; font-size: 18px; color: var(--text-muted); padding: 2px 6px; }
.modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 0; }
.modal-footer {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 20px 16px; border-top: 1px solid var(--border);
  position: sticky; bottom: 0; background: var(--surface);
}

/* Event type picker */
.ev-type-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 6px; margin-bottom: 4px;
}
.ev-type-btn {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 9px 6px; border: 1.5px solid var(--border);
  border-radius: var(--radius); background: var(--surface-2);
  cursor: pointer; transition: all .12s; font-family: inherit;
}
.ev-type-btn:hover { border-color: var(--primary); background: var(--primary-light); }
.ev-type-btn.active { border-width: 2px; }
.ev-type-icon  { font-size: 18px; line-height: 1; }
.ev-type-label { font-size: 11px; font-weight: 600; color: var(--text-2); }
.ev-type-btn.active .ev-type-label { color: inherit; }

/* Form fields */
.fg { display: flex; flex-direction: column; gap: 4px; }
.fg label { font-size: 11.5px; font-weight: 700; color: var(--text-2); }
.fg input, .fg select, .fg textarea {
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 7px 10px; font-family: inherit; font-size: 13px;
  background: var(--surface); color: var(--text);
  transition: border-color .12s;
}
.fg input:focus, .fg select:focus, .fg textarea:focus {
  outline: none; border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(99,102,241,.12);
}
.fg textarea { resize: vertical; min-height: 70px; }
.fg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.inp-title { font-size: 14px; font-weight: 600; }
.req { color: var(--danger); font-size: 12px; }
.hint { font-size: 11px; color: var(--text-muted); }

/* Buttons */
.btn {
  padding: 7px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  font-family: inherit; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .12s; background: var(--surface); color: var(--text);
}
.btn:hover { background: var(--bg-alt); }
.btn-primary { background: var(--primary); color: white; border-color: var(--primary); }
.btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }
.btn-ghost { background: none; border-color: transparent; }
.btn-ghost:hover { background: var(--bg-alt); border-color: var(--border); }
.btn-sm { padding: 4px 10px; font-size: 11.5px; }
.btn-danger-ghost { background: none; border: 1px solid var(--danger-border); color: var(--danger); border-radius: var(--radius-sm); padding: 7px 14px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; transition: all .12s; }
.btn-danger-ghost:hover { background: var(--danger-bg); }

/* Pop-fade */
.pop-fade-enter-active { transition: opacity .15s, transform .15s; }
.pop-fade-leave-active { transition: opacity .1s, transform .1s; }
.pop-fade-enter-from, .pop-fade-leave-to { opacity: 0; transform: scale(.97); }

/* BQ-3: iCal Export Button */
.cal-export-btn {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text-muted); cursor: pointer;
  font-size: 12px; font-weight: 500; font-family: inherit;
  transition: background .14s, color .14s;
}
.cal-export-btn:hover { background: var(--hover-bg, rgba(79,70,229,.07)); color: var(--primary); }
</style>