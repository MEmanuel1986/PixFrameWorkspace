<template>
  <Teleport to="body">
    <transition name="na-fade">
      <div v-if="show" class="na-overlay">
        <div class="na-modal" @click.stop>

          <!-- ══ SCHRITT 1: Kundenauswahl ══════════════════════════════════════ -->
          <template v-if="step === 'pick'">
            <div class="na-head">
              <div class="na-title">
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="opacity:.5">
                  <circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Kunde für neue Anfrage wählen
              </div>
              <button class="na-close" @click="$emit('close')" title="Schließen">✕</button>
            </div>

            <!-- Suchzeile + Button ───────────────────────────────────────── -->
            <div class="na-search-area">
              <div class="na-search-wrap">
                <svg class="na-search-icon" viewBox="0 0 20 20" fill="none" width="15" height="15">
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                <input
                  ref="searchInput"
                  v-model="customerQuery"
                  class="na-search"
                  type="text"
                  placeholder="Name, Vorname, Kundennummer, Firma oder E-Mail…"
                  @keydown.escape="$emit('close')"
                  @keydown.down.prevent="arrowMove(1)"
                  @keydown.up.prevent="arrowMove(-1)"
                  @keydown.enter.prevent="selectHighlighted"
                />
                <span v-if="customerQuery" class="na-search-count">
                  {{ filteredCustomers.length }}&thinsp;/&thinsp;{{ store.customers.length }}
                </span>
                <button v-if="customerQuery" class="na-search-clear" @click="customerQuery = ''; searchInput?.focus()">✕</button>
              </div>
              <button class="na-btn-new-cust" @click="step = 'new-customer'">
                <span class="na-btn-new-plus">+</span>
                Neuen Kunden anlegen
              </button>
            </div>

            <!-- Spalten-Header ──────────────────────────────────────────── -->
            <div class="na-list-header">
              <div class="na-col-name">Kunde</div>
              <div class="na-col-contact">Kontakt</div>
              <div class="na-col-location">Ort</div>
              <div class="na-col-count">Aufträge</div>
            </div>

            <!-- Kundenliste ─────────────────────────────────────────────── -->
            <div class="na-list" ref="listEl">
              <template v-if="filteredCustomers.length > 0">
                <div
                  v-for="(c, i) in filteredCustomers"
                  :key="c.id"
                  class="na-customer-row"
                  :class="{ 'na-highlighted': i === highlightIdx }"
                  @click="pickCustomer(c)"
                  @mouseenter="highlightIdx = i"
                >
                  <!-- Avatar -->
                  <div class="na-cust-avatar" :style="avatarStyle(c)">{{ initials(c) }}</div>

                  <!-- Name + Kundennummer -->
                  <div class="na-col-name">
                    <div class="na-cust-name">{{ fullName(c) }}</div>
                    <div class="na-cust-sub">
                      <span v-if="c.customerNumber" class="na-meta-chip">{{ c.customerNumber }}</span>
                      <span v-if="c.company" class="na-cust-company">{{ c.company }}</span>
                    </div>
                  </div>

                  <!-- Kontakt -->
                  <div class="na-col-contact">
                    <div v-if="c.email" class="na-cust-email">{{ c.email }}</div>
                    <div v-if="c.phone" class="na-cust-phone">{{ c.phone }}</div>
                  </div>

                  <!-- Ort -->
                  <div class="na-col-location">
                    <span v-if="c.city">{{ c.zipCode ? c.zipCode + ' ' : '' }}{{ c.city }}</span>
                    <span v-else class="na-col-empty">—</span>
                  </div>

                  <!-- Auftragszähler -->
                  <div class="na-col-count">
                    <span v-if="projectCount(c.id) > 0" class="na-proj-badge">
                      {{ projectCount(c.id) }}
                    </span>
                    <span v-else class="na-col-empty">—</span>
                  </div>

                  <!-- Pfeil -->
                  <svg viewBox="0 0 16 16" fill="none" width="12" height="12" class="na-row-arrow">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </template>

              <div v-else class="na-list-empty">
                <svg viewBox="0 0 24 24" fill="none" width="32" height="32" style="opacity:.18">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <div>Kein Treffer für <strong>„{{ customerQuery }}"</strong></div>
                <button class="btn btn-sm btn-primary" @click="step = 'new-customer'">+ Neuen Kunden anlegen</button>
              </div>
            </div>

            <div class="na-foot">
              <span class="na-foot-hint">{{ store.customers.length }} Kunden · Pfeiltasten + Enter</span>
              <button class="btn btn-ghost btn-sm" @click="$emit('close')">Abbrechen</button>
            </div>
          </template>


          <!-- ══ SCHRITT 1b: Neuen Kunden anlegen ══════════════════════════ -->
          <template v-else-if="step === 'new-customer'">
            <div class="na-head">
              <div class="na-title">
                <button class="na-back-btn" @click="step = 'pick'" title="Zurück">‹</button>
                Neuen Kunden anlegen
              </div>
              <button class="na-close" @click="$emit('close')">✕</button>
            </div>

            <div class="na-body-form">

              <!-- Zeile 1: Anrede · Titel · Vorname · Nachname -->
              <div class="na-fg-row na-fg-row-4">
                <div class="na-fg">
                  <label>Anrede</label>
                  <select v-model="newCust.salutation">
                    <option value="">— Keine —</option>
                    <option>Herr</option><option>Frau</option><option>Divers</option>
                  </select>
                </div>
                <div class="na-fg">
                  <label>Titel</label>
                  <select v-model="newCust.title">
                    <option value="">— Kein —</option>
                    <option>Dr.</option><option>Prof.</option><option>Prof. Dr.</option>
                  </select>
                </div>
                <div class="na-fg">
                  <label>Vorname *</label>
                  <input ref="firstNameInput" v-model="newCust.firstName" type="text" placeholder="Max" />
                </div>
                <div class="na-fg">
                  <label>Nachname *</label>
                  <input v-model="newCust.lastName" type="text" placeholder="Mustermann" />
                </div>
              </div>

              <!-- Zeile 2: Firma · E-Mail · Telefon -->
              <div class="na-fg-row na-fg-row-3">
                <div class="na-fg">
                  <label>Unternehmen / Studio</label>
                  <input v-model="newCust.company" type="text" placeholder="Mustermann Photography GmbH" />
                </div>
                <div class="na-fg">
                  <label>E-Mail *</label>
                  <input v-model="newCust.email" type="email" placeholder="max@example.de" />
                </div>
                <div class="na-fg">
                  <label>Telefon</label>
                  <input v-model="newCust.phone" type="tel" placeholder="+49 30 123456" />
                </div>
              </div>

              <!-- Zeile 3: Straße · Nr · PLZ · Stadt -->
              <div class="na-fg-row na-fg-row-addr">
                <div class="na-fg">
                  <label>Straße</label>
                  <input v-model="newCust.street" type="text" placeholder="Musterstraße" />
                </div>
                <div class="na-fg na-fg-nr">
                  <label>Nr.</label>
                  <input v-model="newCust.houseNumber" type="text" placeholder="1a" />
                </div>
                <div class="na-fg na-fg-plz">
                  <label>PLZ</label>
                  <input v-model="newCust.zipCode" type="text" placeholder="10115" />
                </div>
                <div class="na-fg">
                  <label>Stadt</label>
                  <input v-model="newCust.city" type="text" placeholder="Berlin" />
                </div>
              </div>

              <!-- Zeile 4: Notizen -->
              <div class="na-fg">
                <label>Notizen</label>
                <textarea v-model="newCust.notes" rows="2" placeholder="Besonderheiten, Vorlieben, Ansprechpartner…"></textarea>
              </div>

              <div v-if="custError" class="na-error">⚠ {{ custError }}</div>
            </div>

            <div class="na-foot">
              <button class="btn btn-ghost btn-sm" @click="step = 'pick'">← Zurück</button>
              <button class="btn btn-primary btn-sm" @click="saveNewCustomer" :disabled="custSaving">
                {{ custSaving ? '⏳ Speichern…' : 'Kunde anlegen & Anfrage öffnen →' }}
              </button>
            </div>
          </template>

        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStore }  from '../stores/useStore'

// Deterministisch reproduzierbare Farbe aus String
const AVATAR_COLORS = [
  ['#6366f1','#eef2ff'], ['#8b5cf6','#f5f3ff'], ['#ec4899','#fdf2f8'],
  ['#f59e0b','#fffbeb'], ['#10b981','#ecfdf5'], ['#3b82f6','#eff6ff'],
  ['#ef4444','#fef2f2'], ['#06b6d4','#ecfeff'],
]
function avatarColor(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export default {
  name: 'NewAnfrageModal',
  props: {
    show: { type: Boolean, default: false },
  },
  emits: ['close', 'created'],
  setup(props, { emit }) {
    const store  = useStore()
    const router = useRouter()

    const step           = ref('pick')
    const customerQuery  = ref('')
    const highlightIdx   = ref(0)
    const searchInput    = ref(null)
    const firstNameInput = ref(null)
    const listEl         = ref(null)
    const creating       = ref(false)



    watch(() => props.show, (v) => {
      if (v) {
        step.value          = 'pick'
        customerQuery.value = ''
        highlightIdx.value  = 0
        custError.value     = ''
        creating.value      = false
        nextTick(() => searchInput.value?.focus())
      }
    })

    watch(step, (v) => {
      if (v === 'new-customer')  nextTick(() => firstNameInput.value?.focus())
    })

    // ── Helpers ──────────────────────────────────────────────────────────
    function fullName(c) {
      return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || '—'
    }
    function initials(c) {
      const f = c.firstName?.[0] || ''
      const l = c.lastName?.[0]  || ''
      return (f + l).toUpperCase() || (c.company?.[0]?.toUpperCase() || '?')
    }
    function avatarStyle(c) {
      const [bg, color] = avatarColor(fullName(c))
      return { background: bg, color }
    }
    function projectCount(id) {
      return store.projects.filter(p => p.customerId === id).length
    }

    // ── Filter + keyboard nav ─────────────────────────────────────────────
    const filteredCustomers = computed(() => {
      const q = customerQuery.value.toLowerCase().trim()
      if (!q) return store.customers
      return store.customers.filter(c =>
        fullName(c).toLowerCase().includes(q) ||
        (c.customerNumber || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      )
    })
    watch(filteredCustomers, () => { highlightIdx.value = 0 })
    function arrowMove(dir) {
      const max = filteredCustomers.value.length - 1
      highlightIdx.value = Math.max(0, Math.min(max, highlightIdx.value + dir))
    }
    function selectHighlighted() {
      const c = filteredCustomers.value[highlightIdx.value]
      if (c) pickCustomer(c)
    }

    // ── Kunde wählen → direkt Projekt anlegen → Auftragsseite ──────────
    async function pickCustomer(c) {
      if (creating.value) return
      creating.value = true
      try {
        const today = new Date().toISOString().slice(0, 10)
        const project = await store.addProject({
          customerId:  c.id,
          status:      'Anfrage',
          projectName: 'Neue Anfrage',
          category:    'Sonstiges',
          booking:     today,
        })
        await router.push({ path: `/projects/${project.id}`, query: { new: '1' } })
        emit('close')
      } catch (e) {
        console.error('Projekt anlegen fehlgeschlagen:', e)
        creating.value = false
      }
    }

    // ── Neuen Kunden anlegen ──────────────────────────────────────────────
    const emptyNewCust = () => ({
      salutation: '', title: '',
      firstName: '', lastName: '', company: '',
      email: '', phone: '',
      street: '', houseNumber: '', zipCode: '', city: '',
      vatId: '', notes: ''
    })
    const newCust    = ref(emptyNewCust())
    const custError  = ref('')
    const custSaving = ref(false)

    async function saveNewCustomer() {
      custError.value = ''
      if (!newCust.value.firstName.trim()) { custError.value = 'Vorname ist erforderlich.'; return }
      if (!newCust.value.lastName.trim())  { custError.value = 'Nachname ist erforderlich.'; return }
      if (!newCust.value.email.trim())     { custError.value = 'E-Mail ist erforderlich.'; return }
      custSaving.value = true
      try {
        const created = await store.addCustomer({ ...newCust.value })
        newCust.value  = emptyNewCust()
        pickCustomer(created)
      } catch (e) {
        custError.value = e.message || 'Fehler beim Speichern.'
      } finally {
        custSaving.value = false
      }
    }

    return {
      store, step, customerQuery, highlightIdx, searchInput, firstNameInput, listEl, creating,
      filteredCustomers, fullName, initials, avatarStyle, projectCount,
      arrowMove, selectHighlighted, pickCustomer,
      newCust, custError, custSaving, saveNewCustomer,
    }
  }
}
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────────────────── */
.na-overlay {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,.52);
  display: flex; align-items: center; justify-content: center;
  padding: 24px 16px;
}
.na-modal {
  background: var(--surface, #fff);
  border-radius: 16px;
  box-shadow: 0 32px 100px rgba(0,0,0,.25), 0 2px 8px rgba(0,0,0,.08);
  width: min(900px, 92vw);
  max-height: 88vh;
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.na-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border, #e4e4e0);
  flex-shrink: 0;
}
.na-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 700; color: var(--text, #18181b);
}
.na-back-btn {
  background: none; border: none; cursor: pointer;
  font-size: 22px; color: var(--text-muted); line-height: 1;
  padding: 0 2px; transition: color .12s;
}
.na-back-btn:hover { color: var(--primary); }
.na-close {
  width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid var(--border); background: var(--bg-alt, #f7f7f5);
  cursor: pointer; font-size: 12px; color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  transition: background .12s, color .12s; flex-shrink: 0;
}
.na-close:hover { background: var(--border); color: var(--text); }

/* ── Suchzeile ───────────────────────────────────────────────────────────── */
.na-search-area {
  display: flex; align-items: stretch;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.na-search-wrap {
  flex: 1; display: flex; align-items: center; gap: 9px;
  padding: 11px 16px;
  border-right: 1px solid var(--border);
}
.na-search-icon { flex-shrink: 0; color: var(--text-muted); }
.na-search {
  flex: 1; border: none; outline: none;
  font-size: 13.5px; font-family: inherit; color: var(--text);
  background: transparent;
}
.na-search::placeholder { color: var(--text-muted); }
.na-search-count { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.na-search-clear {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  border: none; background: var(--border); color: var(--text-muted);
  font-size: 9px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .1s;
}
.na-search-clear:hover { background: var(--text-muted); color: #fff; }
.na-btn-new-cust {
  display: flex; align-items: center; gap: 8px;
  padding: 0 20px;
  background: none; border: none; cursor: pointer;
  font-size: 12.5px; font-weight: 600; font-family: inherit;
  color: #16a34a; white-space: nowrap;
  transition: background .1s;
}
.na-btn-new-cust:hover { background: #f0fdf4; }
.na-btn-new-plus {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  background: #dcfce7; color: #16a34a; border: 1.5px dashed #86efac;
  font-size: 15px; font-weight: 300; line-height: 1;
  display: flex; align-items: center; justify-content: center;
}

/* ── Spalten-Header ──────────────────────────────────────────────────────── */
.na-list-header {
  display: grid;
  grid-template-columns: 1fr 1fr 160px 72px 20px;
  align-items: center;
  gap: 0 12px;
  padding: 6px 16px 6px 62px; /* 62px = avatar width + gap */
  background: var(--bg-alt, #f7f7f5);
  border-bottom: 1px solid var(--border);
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .6px; color: var(--text-muted);
  flex-shrink: 0;
}

/* ── Kundenliste ─────────────────────────────────────────────────────────── */
.na-list { overflow-y: auto; flex: 1; min-height: 0; }
.na-list-empty {
  padding: 40px 24px; text-align: center;
  font-size: 13px; color: var(--text-muted);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}

.na-customer-row {
  display: grid;
  grid-template-columns: 34px 1fr 1fr 160px 72px 20px;
  align-items: center;
  gap: 0 12px;
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background .1s;
}
.na-customer-row:last-child { border-bottom: none; }
.na-highlighted, .na-customer-row:hover { background: var(--primary-light, #eef2ff); }

.na-cust-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  font-size: 11px; font-weight: 800; letter-spacing: -.3px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.na-col-name  { min-width: 0; }
.na-cust-name { font-size: 13.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.na-cust-sub  { display: flex; align-items: center; gap: 5px; margin-top: 2px; }
.na-cust-company { font-size: 11.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.na-meta-chip {
  font-size: 9.5px; font-weight: 700; font-family: var(--font-mono, monospace);
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 4px; padding: 1px 5px; color: var(--text-2); white-space: nowrap; flex-shrink: 0;
}
.na-col-contact { min-width: 0; }
.na-cust-email { font-size: 12px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.na-cust-phone { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.na-col-location { font-size: 12px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.na-col-count { text-align: center; }
.na-col-empty { color: var(--border); font-size: 13px; }
.na-proj-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 22px; border-radius: 99px;
  background: var(--primary-light); color: var(--primary);
  font-size: 11px; font-weight: 800; padding: 0 5px;
}
.na-row-arrow { opacity: .2; flex-shrink: 0; }
.na-customer-row:hover .na-row-arrow { opacity: .5; }

/* ── Footer ──────────────────────────────────────────────────────────────── */
.na-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-alt);
  flex-shrink: 0; gap: 12px;
}
.na-foot-hint { font-size: 11px; color: var(--text-muted); }

/* ── Neuer Kunde: Formular ───────────────────────────────────────────────── */
.na-body-form {
  flex: 1; overflow-y: auto; min-height: 0;
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 14px;
}
.na-fg { display: flex; flex-direction: column; gap: 4px; }
.na-fg label { font-size: 11.5px; font-weight: 600; color: var(--text-2); }
.na-fg input, .na-fg select, .na-fg textarea {
  font-size: 13px; font-family: inherit;
  padding: 8px 10px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text); outline: none; transition: border-color .12s;
  width: 100%; box-sizing: border-box;
}
.na-fg input:focus, .na-fg select:focus, .na-fg textarea:focus {
  border-color: var(--primary);
}
.na-fg-row { display: grid; gap: 12px; }
.na-fg-row-4   { grid-template-columns: 120px 120px 1fr 1fr; }
.na-fg-row-3   { grid-template-columns: 1fr 1fr 1fr; }
.na-fg-row-addr { grid-template-columns: 1fr 70px 90px 1fr; }
.na-fg-nr   { }
.na-fg-plz  { }
.na-form-section {
  font-size: 10.5px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .7px; color: var(--text-muted);
  padding-top: 4px; border-top: 1px solid var(--border);
}
.na-error {
  padding: 9px 12px; background: #fef2f2; border: 1px solid #fca5a5;
  border-radius: 8px; font-size: 12.5px; color: #991b1b;
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 700px) {
  .na-list-header { display: none; }
  .na-customer-row { grid-template-columns: 34px 1fr auto 20px; }
  .na-col-contact, .na-col-location { display: none; }
  .na-fg-row-4   { grid-template-columns: 1fr 1fr; }
  .na-fg-row-3   { grid-template-columns: 1fr 1fr; }
  .na-fg-row-addr { grid-template-columns: 1fr 70px; }
}

/* ── Transition ──────────────────────────────────────────────────────────── */
.na-fade-enter-active { transition: opacity .17s, transform .17s; }
.na-fade-leave-active { transition: opacity .11s, transform .11s; }
.na-fade-enter-from, .na-fade-leave-to { opacity: 0; transform: scale(.97) translateY(6px); }
</style>
