<template>
  <div class="fibu-page">

    <!-- ── Tab Bar ── -->
    <div class="fibu-tabbar">
      <div class="fibu-tabs">
        <button v-for="t in tabs" :key="t.id" class="fb-tab"
          :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
          <span>{{ t.icon }}</span>
          <span>{{ t.label }}</span>
          <span v-if="t.badge" class="fb-badge">{{ t.badge }}</span>
        </button>
      </div>
      <div class="fibu-year-select">
        <label style="font-size:12px;color:var(--text-muted);margin-right:6px">Jahr</label>
        <select v-model="selectedYear" class="year-sel">
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
        <button class="btn btn-sm btn-primary" style="margin-left:10px"
          @click="openEarPrint">📊 EAR als PDF</button>
        <button class="btn btn-sm btn-secondary" style="margin-left:6px"
          @click="downloadDatev" title="DATEV CSV für Steuerberater exportieren">
          📤 DATEV CSV
        </button>
      </div>
    </div>

    <!-- ── KPI Summary Bar ── -->
    <div class="fibu-kpi-bar">
      <div class="fibu-kpi">
        <div class="fk-val text-success">{{ fmt(kpi.income) }}</div>
        <div class="fk-lbl">Einnahmen {{ selectedYear }}</div>
      </div>
      <div class="fibu-kpi-sep">−</div>
      <div class="fibu-kpi">
        <div class="fk-val text-danger">{{ fmt(kpi.expenses) }}</div>
        <div class="fk-lbl">Ausgaben {{ selectedYear }}</div>
      </div>
      <div class="fibu-kpi-sep">=</div>
      <div class="fibu-kpi">
        <div class="fk-val" :class="kpi.profit >= 0 ? 'text-success' : 'text-danger'">
          {{ fmt(kpi.profit) }}
        </div>
        <div class="fk-lbl">Überschuss {{ selectedYear }}</div>
      </div>
      <div class="fibu-kpi-sep" style="opacity:.3">·</div>
      <div class="fibu-kpi">
        <div class="fk-val">{{ kpi.km.toLocaleString('de-DE') }} km</div>
        <div class="fk-lbl">Dienst-Kilometer {{ selectedYear }}</div>
      </div>
    </div>

    <div class="fibu-body">

      <!-- ══ TAB: EINNAHMEN ══════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'income'" class="fb-content">
        <div class="fb-toolbar">
          <input v-model="incomeSearch" class="fb-search" placeholder="Suche Rechnung, Kunde, Nummer…" />
          <span class="fb-count">{{ filteredIncome.length }} Rechnungen</span>
        </div>

        <div class="fb-table-wrap">
          <table class="fb-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Rechnungs-Nr.</th>
                <th>Kunde</th>
                <th>Auftrag</th>
                <th class="text-right">Betrag (brutto)</th>
                <th>Status</th>
                <th>Bezahlt am</th>
                <th>Zahlungsart</th>
                <th>Notiz / Stornogrund</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in filteredIncome" :key="inv.id" class="fb-row"
                :class="{
                  'fb-row-correction': inv.docSubtype === 'correction',
                  'fb-row-storno': inv.docSubtype === 'cancellation',
                  'fb-row-replaced': !inv.docSubtype && correctedIds.has(inv.id)
                }">
                <td class="text-muted">{{ fmtDate(inv.issueDate) }}</td>
                <td>
                <code class="doc-num">{{ inv.documentNumber || '—' }}</code>
                <span v-if="inv.docSubtype === 'correction'" class="badge badge-neutral" style="font-size:9px;margin-left:4px">KOR</span>
                <span v-if="inv.docSubtype === 'cancellation'" class="badge badge-danger" style="font-size:9px;margin-left:4px">STORNO</span>
              </td>
                <td>{{ customerName(inv.customerId) }}</td>
                <td class="text-muted" style="font-size:11.5px">{{ projectName(inv.projectId) }}</td>
                <td class="text-right fw-700">{{ fmt(inv.total || 0) }}</td>
                <td>
                  <span class="badge" :class="inv.status === 'Bezahlt' ? 'badge-success' : inv.status === 'Storniert' ? 'badge-danger' : 'badge-warning'">
                    {{ inv.status }}
                  </span>
                </td>
                <td class="text-muted">{{ inv.paidAt ? fmtDate(inv.paidAt) : '—' }}</td>
                <td class="text-muted" style="font-size:11.5px">{{ inv.paymentMethod || '—' }}</td>
                <td class="text-muted" style="font-size:11.5px;font-style:italic">{{ inv.notes || '—' }}</td>
              </tr>
              <tr v-if="!filteredIncome.length">
                <td colspan="9" class="fb-empty">Keine Rechnungen im Jahr {{ selectedYear }}</td>
              </tr>
            </tbody>
            <tfoot v-if="filteredIncome.length">
              <tr class="fb-total-row">
                <td colspan="5" class="fw-700">Gesamt {{ selectedYear }}</td>
                <td class="text-right fw-700 text-success">{{ fmt(incomeTotal) }}</td>
                <td colspan="3"></td>
              </tr>
              <tr class="fb-total-row" style="opacity:.7">
                <td colspan="4">davon bezahlt</td>
                <td class="text-right fw-700">{{ fmt(incomePaid) }}</td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ══ TAB: AUSGABEN ══════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'expenses'" class="fb-content">
        <div class="fb-toolbar">
          <input v-model="expSearch" class="fb-search" placeholder="Suche Beschreibung, Kategorie, Rechnungs-Nr.…" />
          <span class="fb-count">{{ filteredExpenses.length }} Ausgaben</span>
          <button class="btn btn-primary btn-sm" @click="openExpenseForm(null)">+ Ausgabe erfassen</button>
        </div>

        <div class="fb-table-wrap">
          <table class="fb-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Kategorie</th>
                <th>Beschreibung</th>
                <th>Rechnungs-Nr.</th>
                <th>Lieferant</th>
                <th class="text-right">Betrag (brutto)</th>
                <th class="text-right">USt.</th>
                <th>Beleg</th>
                <th style="width:70px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="exp in filteredExpenses" :key="exp.id" class="fb-row">
                <td class="text-muted">{{ fmtDate(exp.date) }}</td>
                <td><span class="cat-badge">{{ exp.category }}</span></td>
                <td>{{ exp.description }}</td>
                <td><code v-if="exp.invoiceNumber" class="doc-num">{{ exp.invoiceNumber }}</code><span v-else class="text-muted">—</span></td>
                <td class="text-muted">{{ exp.vendor || '—' }}</td>
                <td class="text-right fw-700">{{ fmt(exp.amount) }}</td>
                <td class="text-right text-muted">{{ exp.taxRate > 0 ? exp.taxRate + '%' : '—' }}</td>
                <td>
                  <template v-if="exp.receiptPath">
                    <!-- BQ-1: Beleg-Vorschau — Bild-Thumbnail für JPG/PNG, Icon für PDF -->
                    <a :href="receiptUrl(exp.receiptPath)" target="_blank"
                       class="receipt-preview-link" :title="'Beleg öffnen: ' + exp.receiptPath">
                      <img
                        v-if="/\.(jpe?g|png|webp)$/i.test(exp.receiptPath)"
                        :src="receiptUrl(exp.receiptPath)"
                        class="receipt-thumb"
                        :alt="'Beleg ' + exp.description"
                        loading="lazy"
                        @error="$event.target.style.display='none'"
                      />
                      <span v-else class="receipt-pdf-icon">📄</span>
                    </a>
                  </template>
                  <span v-else class="text-muted" style="font-size:11px">—</span>
                </td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm btn-icon" @click="openExpenseForm(exp)" title="Bearbeiten">✏️</button>
                    <button class="btn btn-ghost btn-sm btn-icon text-danger" @click="deleteExpense(exp.id)" title="Löschen">🗑</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredExpenses.length">
                <td colspan="9" class="fb-empty">Keine Ausgaben im Jahr {{ selectedYear }}</td>
              </tr>
            </tbody>
            <tfoot v-if="filteredExpenses.length">
              <tr class="fb-total-row">
                <td colspan="5" class="fw-700">Gesamt {{ selectedYear }}</td>
                <td class="text-right fw-700 text-danger">{{ fmt(expensesTotal) }}</td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ══ TAB: EINGANGSRECHNUNGEN (BQ-7) ══════════════════════════════════ -->
      <div v-if="activeTab === 'extinv'" class="fb-content">
        <div class="fb-toolbar">
          <input v-model="extinvSearch" class="fb-search" placeholder="Suche Lieferant, Rechnungs-Nr., Beschreibung…" />
          <span class="fb-count">{{ filteredExtInv.length }} Rechnungen · {{ fmt(extinvTotal) }} brutto</span>
          <button class="btn btn-sm btn-primary" @click="openExtInvCreate">+ Eingangsrechnung</button>
        </div>

        <div v-if="filteredExtInv.length === 0" class="fb-empty">
          <div style="font-size:32px;margin-bottom:8px">📥</div>
          <div>Noch keine Eingangsrechnungen für {{ selectedYear }}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
            Lieferantenrechnungen manuell erfassen und optional das PDF anhängen.
          </div>
        </div>

        <div v-else class="fb-table-wrap">
          <table class="fb-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Lieferant</th>
                <th>Rechnungs-Nr.</th>
                <th>Kategorie</th>
                <th>Beschreibung</th>
                <th class="text-right">Netto</th>
                <th class="text-right">MwSt.</th>
                <th class="text-right fw-700">Brutto</th>
                <th>Status</th>
                <th>Beleg</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in filteredExtInv" :key="inv.id" class="fb-row">
                <td class="text-muted">{{ fmtDate(inv.date) }}</td>
                <td class="fw-600">{{ inv.vendor || '—' }}</td>
                <td><code class="doc-num">{{ inv.invoiceNumber || '—' }}</code></td>
                <td class="text-muted" style="font-size:11.5px">{{ inv.category }}</td>
                <td class="text-muted" style="font-size:11.5px">{{ inv.description || '—' }}</td>
                <td class="text-right text-muted">{{ fmt(inv.amountNet) }}</td>
                <td class="text-right text-muted" style="font-size:11px">{{ inv.taxRate }}%</td>
                <td class="text-right fw-700">{{ fmt(inv.amountGross) }}</td>
                <td>
                  <span class="badge"
                    :class="inv.paymentStatus === 'Bezahlt' ? 'badge-success' : 'badge-warning'">
                    {{ inv.paymentStatus }}
                  </span>
                </td>
                <td>
                  <template v-if="inv.receiptPath">
                    <a :href="receiptUrl(inv.receiptPath)" target="_blank"
                      style="font-size:18px;text-decoration:none;cursor:pointer"
                      :title="inv.receiptPath.endsWith('.pdf') ? 'PDF öffnen' : 'Bild öffnen'">
                      {{ inv.receiptPath.match(/\.(jpg|jpeg|png)$/i) ? '🖼' : '📄' }}
                    </a>
                  </template>
                  <span v-else class="text-muted" style="font-size:11px">—</span>
                </td>
                <td>
                  <div class="fb-row-actions">
                    <button class="fb-act-btn" @click="openExtInvEdit(inv)" title="Bearbeiten">✏️</button>
                    <button class="fb-act-btn danger" @click="deleteExtInv(inv.id)" title="Löschen">🗑</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ TAB: FAHRTENBUCH ══════════════════════════════════════════════ -->
      <div v-if="activeTab === 'mileage'" class="fb-content">
        <div class="fb-toolbar">
          <input v-model="kmSearch" class="fb-search" placeholder="Suche Kunde, Zweck, Rechnungsnr.…" />
          <span class="fb-count">{{ filteredMileage.length }} Fahrten · {{ kmTotal.toLocaleString('de-DE') }} km</span>
          <button class="btn btn-primary btn-sm" @click="openMileageForm(null)">+ Fahrt eintragen</button>
        </div>

        <div class="fb-table-wrap">
          <table class="fb-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Kunde</th>
                <th>Rechnungs-Nr.</th>
                <th>Ziel / Destination</th>
                <th>Zweck</th>
                <th class="text-right">km</th>
                <th style="width:50px">Quelle</th>
                <th style="width:70px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="km in filteredMileage" :key="km.id" class="fb-row">
                <td class="text-muted">{{ fmtDate(km.date) }}</td>
                <td>{{ km.customerName || '—' }}</td>
                <td><code v-if="km.invoiceNumber" class="doc-num">{{ km.invoiceNumber }}</code><span v-else class="text-muted">—</span></td>
                <td>{{ km.destination || '—' }}</td>
                <td class="text-muted" style="font-size:11.5px">{{ km.purpose || '—' }}</td>
                <td class="text-right fw-700">{{ km.km.toLocaleString('de-DE') }}</td>
                <td>
                  <span class="src-badge" :class="km.source === 'auto' ? 'src-auto' : 'src-manual'">
                    {{ km.source === 'auto' ? '⚡' : '✏️' }}
                  </span>
                </td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm btn-icon" @click="openMileageForm(km)" title="Bearbeiten">✏️</button>
                    <button class="btn btn-ghost btn-sm btn-icon text-danger" @click="deleteMileage(km.id)" title="Löschen">🗑</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredMileage.length">
                <td colspan="8" class="fb-empty">Keine Fahrten im Jahr {{ selectedYear }}</td>
              </tr>
            </tbody>
            <tfoot v-if="filteredMileage.length">
              <tr class="fb-total-row">
                <td colspan="5" class="fw-700">Gesamt {{ selectedYear }}</td>
                <td class="text-right fw-700">{{ kmTotal.toLocaleString('de-DE') }} km</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div><!-- /fibu-body -->

    <!-- ══ POPUP: Ausgabe erfassen / bearbeiten ══════════════════════════════ -->
    <Teleport to="body">
      <div v-if="expensePopup" class="fb-overlay" @click.self="expensePopup = false">
        <div class="fb-dialog">
          <div class="fb-dialog-head">
            <div>
              <div class="fb-dialog-title">{{ expenseForm.id ? '✏️ Ausgabe bearbeiten' : '➕ Ausgabe erfassen' }}</div>
              <div class="fb-dialog-sub">Betriebliche Ausgabe mit optionalem Beleg</div>
            </div>
            <button class="fb-dialog-x" @click="expensePopup = false">✕</button>
          </div>
          <div class="fb-dialog-body">
            <div class="fb-form-row2">
              <div class="fb-fg">
                <label>Datum *</label>
                <input v-model="expenseForm.date" type="date" class="fb-inp" />
              </div>
              <div class="fb-fg">
                <label>Kategorie *</label>
                <select v-model="expenseForm.category" class="fb-inp">
                  <option v-for="cat in expenseCategories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
            </div>
            <div class="fb-fg">
              <label>Beschreibung *</label>
              <input v-model="expenseForm.description" type="text" class="fb-inp"
                placeholder="z. B. Kameraakku, Adobe CC Abo, Fahrtkosten" />
            </div>
            <div class="fb-fg">
              <label>Rechnungs-Nr. des Lieferanten (optional)</label>
              <input v-model="expenseForm.invoiceNumber" type="text" class="fb-inp"
                placeholder="z. B. INV-2026-0042" />
            </div>
            <div class="fb-form-row2">
              <div class="fb-fg" style="position:relative">
                <label>Lieferant / Händler</label>
                <input v-model="expenseForm.vendor" type="text" class="fb-inp"
                  placeholder="Name, Nummer oder freier Text …"
                  @input="onVendorInput" @focus="showVendorDrop = true" @blur="hideVendorDrop"
                  autocomplete="off" />
                <div v-if="showVendorDrop && vendorSuggestions.length" class="vendor-drop">
                  <div v-for="s in vendorSuggestions" :key="s.id"
                    class="vendor-drop-item"
                    @mousedown.prevent="pickVendor(s)">
                    <code class="doc-num" style="font-size:10px;margin-right:6px">{{ s.supplierNumber }}</code>
                    {{ s.company }}
                    <span v-if="s.city" class="text-muted" style="font-size:11px;margin-left:4px">· {{ s.city }}</span>
                  </div>
                </div>
              </div>
              <div class="fb-fg">
                <label>Umsatzsteuer</label>
                <select v-model.number="expenseForm.taxRate" class="fb-inp" @change="recalcBrutto">
                  <option :value="0">0% (kein VSt-Abzug)</option>
                  <option :value="7">7%</option>
                  <option :value="19">19%</option>
                </select>
              </div>
            </div>
            <div class="fb-form-row2">
              <div class="fb-fg">
                <label>Nettobetrag (€) *</label>
                <input v-model.number="expenseForm.amountNet" type="number" min="0" step="0.01"
                  class="fb-inp" @input="recalcBrutto" />
              </div>
              <div class="fb-fg">
                <label>Betrag brutto</label>
                <div class="fb-computed" style="font-weight:700;color:var(--primary-text,#4f46e5)">
                  {{ expenseForm.amount > 0 ? fmt(expenseForm.amount) : '—' }}
                </div>
              </div>
            </div>
            <div class="fb-fg">
              <label>Notizen</label>
              <input v-model="expenseForm.notes" type="text" class="fb-inp"
                placeholder="Interne Notiz zum Beleg" />
            </div>
            <div class="fb-fg">
              <label>Beleg hochladen <span style="font-size:10px;color:var(--text-muted)">(PDF, JPG, PNG — max. 20 MB)</span></label>
              <div class="fb-file-zone" @click="$refs.receiptInput.click()"
                :class="{ 'has-file': receiptFile || expenseForm.receiptPath }">
                <input ref="receiptInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style="display:none"
                  @change="onReceiptSelected" />
                <span v-if="receiptFile">📎 {{ receiptFile.name }}</span>
                <span v-else-if="expenseForm.receiptPath">📎 Beleg vorhanden — klicken zum Ersetzen</span>
                <span v-else style="color:var(--text-muted)">Klicken oder Datei ablegen…</span>
              </div>
              <div v-if="expenseForm.receiptPath" style="display:flex;gap:8px;margin-top:6px">
                <a :href="receiptUrl(expenseForm.receiptPath)" target="_blank"
                  class="btn btn-ghost btn-sm" style="font-size:12px;text-decoration:none">
                  🔍 Beleg anzeigen
                </a>
                <button class="btn btn-ghost btn-sm" style="font-size:12px;color:var(--danger,#dc2626)"
                  @click="expenseForm.receiptPath = null; receiptFile = null">
                  🗑 Beleg entfernen
                </button>
              </div>
            </div>
            <div v-if="expenseError" class="fb-error">⚠ {{ expenseError }}</div>
          </div>
          <div class="fb-dialog-foot">
            <button class="btn btn-secondary" @click="expensePopup = false">Abbrechen</button>
            <button class="btn btn-primary" @click="saveExpense" :disabled="expenseSaving">
              {{ expenseSaving ? '⏳ Speichern…' : expenseForm.id ? 'Änderungen speichern' : 'Ausgabe speichern' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ POPUP: Fahrt eintragen ════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="mileagePopup" class="fb-overlay" @click.self="mileagePopup = false">
        <div class="fb-dialog">
          <div class="fb-dialog-head">
            <div>
              <div class="fb-dialog-title">{{ mileageForm.id ? '✏️ Fahrt bearbeiten' : '🚗 Fahrt eintragen' }}</div>
              <div class="fb-dialog-sub">Dienstliche Fahrt im Fahrtenbuch erfassen</div>
            </div>
            <button class="fb-dialog-x" @click="mileagePopup = false">✕</button>
          </div>
          <div class="fb-dialog-body">
            <div class="fb-form-row2">
              <div class="fb-fg">
                <label>Datum *</label>
                <input v-model="mileageForm.date" type="date" class="fb-inp" />
              </div>
              <div class="fb-fg">
                <label>Kilometer *</label>
                <div class="fb-inp-unit">
                  <input v-model.number="mileageForm.km" type="number" min="0" step="0.1" class="fb-inp" />
                  <span class="fb-unit">km</span>
                </div>
              </div>
            </div>
            <div class="fb-fg">
              <label>Kunde</label>
              <div class="fb-customer-row">
                <select v-model="mileageForm.customerId" class="fb-inp" @change="onMileageCustomerPick">
                  <option value="">— manuell eingeben —</option>
                  <option v-for="cu in customers" :key="cu.id" :value="cu.id">
                    {{ cu.firstName }} {{ cu.lastName }}{{ cu.company ? ' · ' + cu.company : '' }}
                  </option>
                </select>
              </div>
              <input v-if="!mileageForm.customerId" v-model="mileageForm.customerName"
                type="text" class="fb-inp" style="margin-top:6px"
                placeholder="Oder Kundenname manuell eingeben" />
            </div>
            <div class="fb-form-row2">
              <div class="fb-fg">
                <label>Rechnungs-Nr. (optional)</label>
                <input v-model="mileageForm.invoiceNumber" type="text" class="fb-inp"
                  placeholder="z. B. RE-2026-03/00001" />
              </div>
              <div class="fb-fg">
                <label>Ziel / Destination</label>
                <input v-model="mileageForm.destination" type="text" class="fb-inp"
                  placeholder="z. B. Schloss Neuschwanstein" />
              </div>
            </div>
            <div class="fb-fg">
              <label>Zweck / Anlass</label>
              <input v-model="mileageForm.purpose" type="text" class="fb-inp"
                placeholder="z. B. Hochzeitsreportage, Kundengespräch" />
            </div>
            <div v-if="mileageError" class="fb-error">⚠ {{ mileageError }}</div>
          </div>
          <div class="fb-dialog-foot">
            <button class="btn btn-secondary" @click="mileagePopup = false">Abbrechen</button>
            <button class="btn btn-primary" @click="saveMileage" :disabled="mileageSaving">
              {{ mileageSaving ? '⏳ Speichern…' : mileageForm.id ? 'Änderungen speichern' : 'Fahrt speichern' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ POPUP: EINGANGSRECHNUNG (BQ-7) ══════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="extinvPopup" class="fb-overlay" @click.self="extinvPopup = false">
        <div class="fb-dialog" style="max-width:560px">
          <div class="fb-dialog-head">
            <span>{{ extinvForm.id ? '✏️ Eingangsrechnung bearbeiten' : '📥 Eingangsrechnung erfassen' }}</span>
            <button class="fb-dialog-close" @click="extinvPopup = false">✕</button>
          </div>
          <div class="fb-dialog-body">

            <div class="fb-form-row2">
              <div class="fb-fg">
                <label>Datum *</label>
                <input v-model="extinvForm.date" type="date" class="fb-inp" />
              </div>
              <div class="fb-fg">
                <label>Status</label>
                <select v-model="extinvForm.paymentStatus" class="fb-inp">
                  <option value="Offen">Offen</option>
                  <option value="Bezahlt">Bezahlt</option>
                </select>
              </div>
            </div>

            <div class="fb-form-row2">
              <div class="fb-fg">
                <label>Lieferant *</label>
                <input v-model="extinvForm.vendor" type="text" class="fb-inp"
                  placeholder="z.B. Canon GmbH, Adobe" />
              </div>
              <div class="fb-fg">
                <label>Rechnungs-Nr. des Lieferanten</label>
                <input v-model="extinvForm.invoiceNumber" type="text" class="fb-inp"
                  placeholder="z.B. 2026-04711" />
              </div>
            </div>

            <div class="fb-fg">
              <label>Kategorie</label>
              <select v-model="extinvForm.category" class="fb-inp">
                <option v-for="cat in ['Kamera & Ausrüstung','Software & Lizenzen','Fahrtkosten',
                  'Büro & Bürobedarf','Marketing & Werbung','Weiterbildung','Versicherungen',
                  'Telefon & Internet','Abonnements','Bewirtung','Porto & Versand','Sonstiges']"
                  :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <div class="fb-fg">
              <label>Beschreibung</label>
              <input v-model="extinvForm.description" type="text" class="fb-inp"
                placeholder="z.B. Canon EOS R6 Mark II Kamera, Adobe CC Jahresabo" />
            </div>

            <div class="fb-form-row2">
              <div class="fb-fg">
                <label>Betrag netto (€)</label>
                <input v-model.number="extinvForm.amountNet" type="number" min="0" step="0.01"
                  class="fb-inp" @input="recalcExtBrutto" />
              </div>
              <div class="fb-fg">
                <label>MwSt.-Satz (%)</label>
                <select v-model.number="extinvForm.taxRate" class="fb-inp" @change="recalcExtBrutto">
                  <option :value="0">0% (§19 / Kleinunternehmer)</option>
                  <option :value="7">7%</option>
                  <option :value="19">19%</option>
                </select>
              </div>
            </div>

            <div class="fb-fg">
              <label>Betrag brutto (€)</label>
              <div class="fb-inp-unit">
                <input v-model.number="extinvForm.amountGross" type="number" min="0" step="0.01"
                  class="fb-inp" style="border-radius:var(--radius,6px) 0 0 var(--radius,6px)!important" />
                <span class="fb-unit">€</span>
              </div>
            </div>

            <div v-if="extinvForm.paymentStatus === 'Bezahlt'" class="fb-form-row2">
              <div class="fb-fg">
                <label>Bezahlt am</label>
                <input v-model="extinvForm.paidAt" type="date" class="fb-inp" />
              </div>
              <div class="fb-fg">
                <label>Zahlungsart</label>
                <select v-model="extinvForm.paymentMethod" class="fb-inp">
                  <option value="">— wählen —</option>
                  <option value="Überweisung">Überweisung</option>
                  <option value="Kreditkarte">Kreditkarte</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Lastschrift">Lastschrift</option>
                  <option value="Bar">Bar</option>
                </select>
              </div>
            </div>

            <!-- Beleg-Upload -->
            <div class="fb-fg">
              <label>Beleg (PDF / Bild)</label>
              <div v-if="extinvForm.receiptPath && !extinvFile" style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <a :href="receiptUrl(extinvForm.receiptPath)" target="_blank"
                  style="font-size:12px;color:var(--primary)">
                  {{ extinvForm.receiptPath.match(/\.(jpg|jpeg|png)$/i) ? '🖼 Vorschau' : '📄 PDF anzeigen' }}
                </a>
                <span style="font-size:11px;color:var(--text-muted)">· Neues hochladen überschreibt</span>
              </div>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                class="fb-inp" style="padding:4px"
                @change="e => extinvFile = e.target.files[0] || null" />
            </div>

            <div class="fb-fg">
              <label>Notizen</label>
              <input v-model="extinvForm.notes" type="text" class="fb-inp"
                placeholder="Optionale Anmerkungen" />
            </div>

            <div v-if="extinvError" class="fb-error">⚠ {{ extinvError }}</div>
          </div>
          <div class="fb-dialog-foot">
            <button class="btn btn-secondary" @click="extinvPopup = false">Abbrechen</button>
            <button class="btn btn-primary" @click="saveExtInv" :disabled="extinvSaving">
              {{ extinvSaving ? '⏳ Speichern…' : extinvForm.id ? 'Änderungen speichern' : 'Rechnung speichern' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '../stores/useStore'
import apiClient, { API_BASE } from '../services/api'
import { downloadPdfFromBackend } from '../services/pdfExport.js'

// API_BASE wird aus ../services/api importiert — keine lokale Überschreibung nötig.
function receiptUrl(path) { return path ? API_BASE + path : '#' }

const EXPENSE_CATS = [
  'Kamera & Ausrüstung','Software & Lizenzen','Fahrtkosten','Büro & Bürobedarf',
  'Marketing & Werbung','Weiterbildung','Versicherungen','Telefon & Internet',
  'Abonnements','Bewirtung','Porto & Versand','Sonstiges'
]

export default {
  name: 'FiBu',
  setup() {
    const store = useStore()

    const activeTab    = ref('income')
    const selectedYear = ref(new Date().getFullYear())
    const loading      = ref(false)

    // Data
    const expenses = ref([])
    const mileage  = ref([])

    // Search
    const incomeSearch = ref('')
    const expSearch    = ref('')
    const kmSearch     = ref('')

    // ── Helpers ──
    function fmtDate(d) {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    }
    function fmt(n) {
      return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n ?? 0)
    }
    function customerName(id) {
      if (!id) return '—'
      const c = store.customers.find(c => c.id === id)
      return c ? `${c.firstName} ${c.lastName}`.trim() || c.company || id : id
    }
    function projectName(id) {
      if (!id) return ''
      const p = store.projects.find(p => p.id === id)
      return p ? (p.contractData?.occasion || p.projectName || '') : ''
    }

    // ── Available years ──
    const availableYears = computed(() => {
      const years = new Set([new Date().getFullYear()])
      store.documents.forEach(d => { if (d.issueDate) years.add(new Date(d.issueDate).getFullYear()) })
      expenses.value.forEach(e => { if (e.date) years.add(new Date(e.date).getFullYear()) })
      mileage.value.forEach(m => { if (m.date) years.add(new Date(m.date).getFullYear()) })
      return [...years].sort((a,b) => b-a)
    })

    // ── Income (from invoices) ──
    // Alle Rechnungen für Tabellenanzeige (sortiert nach Datum)
    const allInvoicesDisplay = computed(() =>
      store.documents.filter(d =>
        d.type === 'invoice' &&
        d.issueDate && new Date(d.issueDate).getFullYear() === selectedYear.value
      ).sort((a, b) => (a.issueDate || '').localeCompare(b.issueDate || ''))
    )
    // IDs von Rechnungen die durch eine Korrektur ersetzt wurden
    const correctedIds = computed(() => {
      const ids = new Set()
      store.documents.forEach(d => {
        if (d.docSubtype === 'correction' && d.correctionOf) ids.add(d.correctionOf)
      })
      return ids
    })
    // Für Summenberechnung: Rechnungen zählen wenn sie NICHT durch Korrektur ersetzt wurden
    // Korrekturrechnungen und Stornos zählen immer (Storno hat negativen Betrag)
    const allInvoices = computed(() =>
      store.documents.filter(d => {
        if (d.type !== 'invoice') return false
        if (!d.issueDate || new Date(d.issueDate).getFullYear() !== selectedYear.value) return false
        // Normale Rechnung die durch Korrektur ersetzt wurde → nicht zählen
        if (!d.docSubtype && correctedIds.value.has(d.id)) return false
        // Stornos (cancellation) → zählen (negativer Betrag)
        // Korrekturen (correction) → zählen (ersetzen die Original-Rechnung)
        // Normale Rechnungen ohne Korrektur → zählen
        return true
      })
    )
    const filteredIncome = computed(() => {
      const q = incomeSearch.value.toLowerCase().trim()
      if (!q) return allInvoicesDisplay.value
      return allInvoicesDisplay.value.filter(d =>
        (d.documentNumber || '').toLowerCase().includes(q) ||
        customerName(d.customerId).toLowerCase().includes(q) ||
        projectName(d.projectId).toLowerCase().includes(q)
      )
    })
    const incomeTotal  = computed(() => allInvoices.value.reduce((s,d) => s + (d.total||0), 0))
    const incomePaid   = computed(() => allInvoices.value.filter(d => d.status === 'Bezahlt').reduce((s,d) => s + (d.total||0), 0))

    // ── Expenses ──
    const yearExpenses = computed(() =>
      expenses.value.filter(e => e.date && new Date(e.date).getFullYear() === selectedYear.value)
    )
    const filteredExpenses = computed(() => {
      const q = expSearch.value.toLowerCase().trim()
      if (!q) return yearExpenses.value
      return yearExpenses.value.filter(e =>
        (e.description||'').toLowerCase().includes(q) ||
        (e.category||'').toLowerCase().includes(q) ||
        (e.vendor||'').toLowerCase().includes(q) ||
        (e.invoiceNumber||'').toLowerCase().includes(q)
      )
    })
    const expensesTotal = computed(() => yearExpenses.value.reduce((s,e) => s + (e.amount||0), 0))

    // ── Mileage ──
    const yearMileage = computed(() =>
      mileage.value.filter(m => m.date && new Date(m.date).getFullYear() === selectedYear.value)
    )
    const filteredMileage = computed(() => {
      const q = kmSearch.value.toLowerCase().trim()
      if (!q) return yearMileage.value
      return yearMileage.value.filter(m =>
        (m.customerName||'').toLowerCase().includes(q) ||
        (m.invoiceNumber||'').toLowerCase().includes(q) ||
        (m.purpose||'').toLowerCase().includes(q) ||
        (m.destination||'').toLowerCase().includes(q)
      )
    })
    const kmTotal = computed(() => yearMileage.value.reduce((s,m) => s + (m.km||0), 0))

    // ── External Invoices (BQ-7) ──
    const externalInvoices = ref([])
    const extinvSearch     = ref('')
    const yearExtInv = computed(() =>
      externalInvoices.value.filter(e => e.date && new Date(e.date).getFullYear() === selectedYear.value)
    )
    const filteredExtInv = computed(() => {
      const q = extinvSearch.value.toLowerCase().trim()
      if (!q) return yearExtInv.value
      return yearExtInv.value.filter(e =>
        (e.vendor||'').toLowerCase().includes(q) ||
        (e.invoiceNumber||'').toLowerCase().includes(q) ||
        (e.description||'').toLowerCase().includes(q) ||
        (e.category||'').toLowerCase().includes(q)
      )
    })
    const extinvTotal = computed(() => yearExtInv.value.reduce((s,e) => s + (e.amountGross||0), 0))

    const extinvPopup   = ref(false)
    const extinvSaving  = ref(false)
    const extinvError   = ref('')
    const extinvFile    = ref(null)
    const emptyExtInv = () => ({
      id: null, date: new Date().toISOString().slice(0,10),
      vendor: '', invoiceNumber: '', category: 'Sonstiges',
      description: '', amountNet: 0, taxRate: 19, amountGross: 0,
      paymentStatus: 'Offen', paidAt: '', paymentMethod: '', notes: '',
      receiptPath: null,
    })
    const extinvForm = ref(emptyExtInv())

    function recalcExtBrutto() {
      const net  = Number(extinvForm.value.amountNet) || 0
      const rate = Number(extinvForm.value.taxRate)   || 0
      extinvForm.value.amountGross = Math.round(net * (1 + rate / 100) * 100) / 100
    }

    function openExtInvCreate() {
      extinvForm.value = emptyExtInv()
      extinvFile.value = null
      extinvError.value = ''
      extinvPopup.value = true
    }
    function openExtInvEdit(inv) {
      extinvForm.value = { ...inv, paidAt: inv.paidAt || '' }
      extinvFile.value = null
      extinvError.value = ''
      extinvPopup.value = true
    }

    async function saveExtInv() {
      if (!extinvForm.value.vendor.trim()) { extinvError.value = 'Lieferant ist erforderlich'; return }
      if (!extinvForm.value.amountGross)   { extinvError.value = 'Betrag ist erforderlich'; return }
      extinvSaving.value = true
      extinvError.value  = ''
      try {
        const fd = new FormData()
        const fields = ['date','vendor','invoiceNumber','category','description',
          'amountNet','taxRate','amountGross','paymentStatus','paidAt','paymentMethod','notes']
        fields.forEach(k => fd.append(k, extinvForm.value[k] ?? ''))
        if (extinvFile.value) fd.append('receipt', extinvFile.value)

        if (extinvForm.value.id) {
          const r = await apiClient.put(`/fibu/external-invoices/${extinvForm.value.id}`, fd,
            { headers: { 'Content-Type': 'multipart/form-data' } })
          const idx = externalInvoices.value.findIndex(e => e.id === extinvForm.value.id)
          if (idx !== -1) externalInvoices.value[idx] = r.data.data
        } else {
          const r = await apiClient.post('/fibu/external-invoices', fd,
            { headers: { 'Content-Type': 'multipart/form-data' } })
          externalInvoices.value.push(r.data.data)
        }
        extinvPopup.value = false
      } catch (e) {
        extinvError.value = 'Fehler: ' + (e.response?.data?.error || e.message)
      } finally { extinvSaving.value = false }
    }

    async function deleteExtInv(id) {
      if (!confirm('Eingangsrechnung wirklich löschen?')) return
      try {
        await apiClient.delete(`/fibu/external-invoices/${id}`)
        externalInvoices.value = externalInvoices.value.filter(e => e.id !== id)
      } catch (e) { alert('Fehler: ' + e.message) }
    }

    // ── KPI ──
    const kpi = computed(() => ({
      income:   incomeTotal.value,
      expenses: expensesTotal.value,
      profit:   incomeTotal.value - expensesTotal.value,
      km:       kmTotal.value,
    }))

    // ── Tabs ──
    const tabs = computed(() => [
      { id: 'income',   icon: '💰', label: 'Einnahmen',         badge: allInvoices.value.length || null },
      { id: 'expenses', icon: '🧾', label: 'Ausgaben',          badge: yearExpenses.value.length || null },
      { id: 'extinv',   icon: '📥', label: 'Eingangsrechnungen', badge: yearExtInv.value.length || null },
      { id: 'mileage',  icon: '🚗', label: 'Fahrtenbuch',       badge: yearMileage.value.length || null },
    ])

    // ── Load FiBu data ──
    async function loadFibu() {
      try {
        const r = await apiClient.get('/fibu')
        const d = r.data?.data || {}
        expenses.value         = d.expenses         || []
        mileage.value          = d.mileage          || []
        externalInvoices.value = d.externalInvoices || []
      } catch (e) { console.error('FiBu load error:', e) }
    }

    // ── Auto-sync paid invoices to mileage ──
    async function syncInvoiceMileage() {
      const paidInvoices = store.documents.filter(d =>
        d.type === 'invoice' && !d.docSubtype && d.status === 'Bezahlt' &&
        d.documentNumber
      )
      const existingInvoiceNums = new Set(mileage.value.filter(m => m.source === 'auto').map(m => m.invoiceNumber))
      
      for (const inv of paidInvoices) {
        if (existingInvoiceNums.has(inv.documentNumber)) continue
        // Get project location for destination
        const proj = store.projects.find(p => p.id === inv.projectId)
        if (!proj?.location && !proj?.booking) continue  // skip if no location info
        
        try {
          const entry = {
            date:          inv.issueDate || inv.createdAt?.slice(0,10) || new Date().toISOString().slice(0,10),
            customerId:    inv.customerId  || null,
            customerName:  customerName(inv.customerId),
            projectId:     inv.projectId  || null,
            invoiceNumber: inv.documentNumber,
            destination:   proj?.location || '',
            purpose:       proj?.contractData?.occasion || proj?.projectName || 'Fotografie-Auftrag',
            km:            0,   // User fills in manually
            source:        'auto',
          }
          const r = await apiClient.post('/fibu/mileage', entry)
          mileage.value.push(r.data.data)
        } catch (e) { console.warn('Mileage sync error:', e) }
      }
    }

    // ── Expense Form ──
    function recalcBrutto() {
      const net  = Number(expenseForm.value.amountNet) || 0
      const rate = Number(expenseForm.value.taxRate)   || 0
      expenseForm.value.amount = Math.round(net * (1 + rate / 100) * 100) / 100
    }
    
    const expensePopup   = ref(false)
    const expenseSaving  = ref(false)
    const expenseError   = ref('')
    const receiptFile    = ref(null)
    const expenseCategories = EXPENSE_CATS
    const emptyExpense = () => ({
      id: null, date: new Date().toISOString().slice(0,10),
      category: 'Kamera & Ausrüstung', description: '', vendor: '',
      invoiceNumber: '',
      amountNet: 0, amount: 0, taxRate: 19, notes: '', receiptPath: null,
    })
    const expenseForm = ref(emptyExpense())

    
    // Lieferant-Autocomplete
    const showVendorDrop    = ref(false)
    const vendorSuggestions = computed(() => {
      const q = (expenseForm.value.vendor || '').toLowerCase().trim()
      if (!q || q.length < 1) return store.suppliers.slice(0, 8)
      return store.suppliers.filter(s =>
        (s.company || '').toLowerCase().includes(q) ||
        (s.supplierNumber || '').toLowerCase().includes(q)
      ).slice(0, 8)
    })
    function onVendorInput()  { showVendorDrop.value = true }
    function hideVendorDrop() { setTimeout(() => { showVendorDrop.value = false }, 150) }
    function pickVendor(s)    { expenseForm.value.vendor = s.company; showVendorDrop.value = false }

    function openExpenseForm(exp) {
      if (exp) {
        const net = exp.taxRate > 0
          ? Math.round(exp.amount / (1 + exp.taxRate / 100) * 100) / 100
          : exp.amount
        expenseForm.value = { ...exp, amountNet: net }
      } else {
        expenseForm.value = emptyExpense()
      }
      receiptFile.value  = null
      expenseError.value = ''
      expensePopup.value = true
    }
    function onReceiptSelected(e) {
      receiptFile.value = e.target.files?.[0] || null
    }
    async function saveExpense() {
      expenseError.value = ''
      if (!expenseForm.value.description.trim()) { expenseError.value = 'Beschreibung erforderlich'; return }
      if (!expenseForm.value.amountNet && !expenseForm.value.amount) { expenseError.value = 'Betrag erforderlich'; return }
      expenseSaving.value = true
      try {
        const fd = new FormData()
        Object.entries(expenseForm.value).forEach(([k,v]) => { if (v != null) fd.append(k, v) })
        if (receiptFile.value) fd.append('receipt', receiptFile.value)
        if (expenseForm.value.id) {
          const r = await apiClient.put(`/fibu/expenses/${expenseForm.value.id}`, fd)
          const idx = expenses.value.findIndex(e => e.id === expenseForm.value.id)
          if (idx > -1) expenses.value[idx] = r.data.data
        } else {
          const r = await apiClient.post('/fibu/expenses', fd)
          expenses.value.push(r.data.data)
        }
        expensePopup.value = false
      } catch (e) { expenseError.value = 'Fehler: ' + (e.response?.data?.error || e.message) }
      finally { expenseSaving.value = false }
    }
    async function deleteExpense(id) {
      if (!confirm('Ausgabe löschen?')) return
      await apiClient.delete(`/fibu/expenses/${id}`)
      expenses.value = expenses.value.filter(e => e.id !== id)
    }

    // ── Mileage Form ──
    const mileagePopup  = ref(false)
    const mileageSaving = ref(false)
    const mileageError  = ref('')
    const customers     = computed(() => store.customers)
    const emptyMileage = () => ({
      id: null, date: new Date().toISOString().slice(0,10),
      customerId: '', customerName: '', projectId: null,
      invoiceNumber: '', destination: '', purpose: '', km: 0,
    })
    const mileageForm = ref(emptyMileage())

    function openMileageForm(km) {
      mileageForm.value  = km ? { ...km } : emptyMileage()
      mileageError.value = ''
      mileagePopup.value = true
    }
    function onMileageCustomerPick() {
      const cu = store.customers.find(c => c.id === mileageForm.value.customerId)
      if (cu) mileageForm.value.customerName = `${cu.firstName} ${cu.lastName}`.trim() || cu.company || ''
      else mileageForm.value.customerName = ''
    }
    async function saveMileage() {
      mileageError.value = ''
      if (!mileageForm.value.km)  { mileageError.value = 'Kilometer erforderlich'; return }
      mileageSaving.value = true
      try {
        const payload = { ...mileageForm.value, source: mileageForm.value.id ? mileageForm.value.source : 'manual' }
        if (mileageForm.value.id) {
          const r = await apiClient.put(`/fibu/mileage/${mileageForm.value.id}`, payload)
          const idx = mileage.value.findIndex(m => m.id === mileageForm.value.id)
          if (idx > -1) mileage.value[idx] = r.data.data
        } else {
          const r = await apiClient.post('/fibu/mileage', payload)
          mileage.value.push(r.data.data)
        }
        mileagePopup.value = false
      } catch (e) { mileageError.value = 'Fehler: ' + (e.response?.data?.error || e.message) }
      finally { mileageSaving.value = false }
    }
    async function deleteMileage(id) {
      if (!confirm('Fahrt löschen?')) return
      await apiClient.delete(`/fibu/mileage/${id}`)
      mileage.value = mileage.value.filter(m => m.id !== id)
    }

    // ── EAR Print ──
    // BQ-5: DATEV CSV-Export
    async function downloadDatev() {
      try {
        const url  = `${API_BASE}/api/fibu/datev-export?year=${selectedYear.value}`
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('Server-Fehler')
        const blob = await resp.blob()
        const a    = document.createElement('a')
        a.href     = URL.createObjectURL(blob)
        a.download = `DATEV_${selectedYear.value}_PixFrame.csv`
        a.click()
        URL.revokeObjectURL(a.href)
      } catch (e) {
        alert('DATEV-Export fehlgeschlagen: ' + e.message)
      }
    }

    function openEarPrint() {
      downloadPdfFromBackend(`/api/pdf/ear/${selectedYear.value}`, `EUER_${selectedYear.value}`)
        .catch(e => console.error('PDF-Fehler:', e))
    }

    onMounted(async () => {
      await Promise.all([store.fetchDocuments(), store.fetchProjects(), store.fetchCustomers()])
      await loadFibu()
      await syncInvoiceMileage()
    })

    return {
      activeTab, selectedYear, availableYears, tabs, loading,
      expenses, mileage, customers,
      incomeSearch, expSearch, kmSearch, extinvSearch,
      filteredIncome, filteredExpenses, filteredMileage, filteredExtInv,
      allInvoicesDisplay, correctedIds, incomeTotal, incomePaid, expensesTotal, kmTotal, extinvTotal, kpi,
      fmtDate, fmt, customerName, projectName,
      expensePopup, expenseSaving, expenseError, expenseForm, receiptFile,
      expenseCategories, openExpenseForm, onReceiptSelected, saveExpense, deleteExpense, receiptUrl,
      mileagePopup, mileageSaving, mileageError, mileageForm,
      openMileageForm, onMileageCustomerPick, saveMileage, deleteMileage,
      openEarPrint, downloadDatev,
      showVendorDrop, vendorSuggestions, onVendorInput, hideVendorDrop, pickVendor, recalcBrutto,
      externalInvoices, extinvPopup, extinvSaving, extinvError, extinvForm, extinvFile,
      openExtInvCreate, openExtInvEdit, saveExtInv, deleteExtInv, recalcExtBrutto,
    }
  }
}
</script>

<style scoped>
.fibu-page { display:flex; flex-direction:column; height:calc(100vh - 52px); margin:-28px -32px; overflow:hidden; }

/* Tab bar */
.fibu-tabbar { display:flex; align-items:center; justify-content:space-between; background:var(--surface); border-bottom:1px solid var(--border); padding:0 24px; flex-shrink:0; min-height:46px; position:sticky; top:0; z-index:10; }
.fibu-tabs   { display:flex; overflow-x:auto; scrollbar-width:none; }
.fb-tab { display:flex; align-items:center; gap:6px; padding:0 16px; height:46px; border:none; background:none; font-size:13px; font-weight:500; font-family:inherit; color:var(--text-muted); cursor:pointer; white-space:nowrap; border-bottom:2.5px solid transparent; margin-bottom:-1px; transition:color .14s,border-color .14s; }
.fb-tab:hover  { color:var(--text); }
.fb-tab.active { color:var(--primary); border-bottom-color:var(--primary); font-weight:600; }
.fb-badge { background:var(--primary-light); color:var(--primary-text); font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; }
.fibu-year-select { display:flex; align-items:center; flex-shrink:0; }
.year-sel { padding:5px 8px; border:1px solid var(--border); border-radius:var(--radius,6px); background:var(--surface); color:var(--text); font-size:13px; }

/* KPI Bar */
.fibu-kpi-bar { display:flex; align-items:center; gap:0; background:var(--surface); border-bottom:1px solid var(--border); padding:12px 28px; flex-shrink:0; flex-wrap:wrap; gap:8px; }
.fibu-kpi { display:flex; flex-direction:column; align-items:flex-start; min-width:140px; }
.fk-val { font-size:18px; font-weight:800; color:var(--text); line-height:1.2; }
.fk-lbl { font-size:10.5px; color:var(--text-muted); margin-top:2px; }
.fibu-kpi-sep { font-size:20px; color:var(--border); font-weight:300; padding:0 12px; }
.text-success { color:var(--success) !important; }
.text-danger  { color:var(--danger)  !important; }

/* Body */
.fibu-body { flex:1; overflow-y:auto; background:var(--bg); }
.fb-content { padding:20px 28px 40px; }

/* Toolbar */
.fb-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
.fb-search  { flex:1; min-width:200px; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius,6px); background:var(--surface); color:var(--text); font-size:13px; font-family:inherit; }
.fb-search:focus { outline:none; border-color:var(--primary); }
.fb-count   { font-size:12px; color:var(--text-muted); white-space:nowrap; }

/* Table */
.fb-table-wrap { overflow-x:auto; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg,12px); box-shadow:var(--shadow-sm); }
.fb-table { width:100%; border-collapse:collapse; font-size:13px; }
.fb-table thead th { padding:9px 12px; text-align:left; border-bottom:1px solid var(--border); font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted); background:var(--bg-alt); white-space:nowrap; }
.fb-table tbody td { padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:middle; }
.fb-table tbody tr:last-child td { border-bottom:none; }
.fb-row { transition:background .1s; cursor:default; }
.fb-row:hover { background:var(--bg-alt); }
.fb-empty { text-align:center; color:var(--text-muted); padding:32px; font-size:13px; }
.fb-empty div { margin-bottom:4px; }
.fb-total-row td { padding:10px 12px; background:var(--bg-alt); font-size:13px; border-top:2px solid var(--border); }
.doc-num { font-family:monospace; font-size:11px; background:var(--bg-alt); border:1px solid var(--border); border-radius:4px; padding:1px 6px; }
.cat-badge { display:inline-block; padding:2px 8px; background:rgba(79,70,229,.08); color:var(--primary-text); border-radius:99px; font-size:11px; font-weight:600; border:1px solid rgba(79,70,229,.15); }
.src-badge { font-size:13px; }
.fb-row-actions { display:flex; gap:4px; opacity:0; transition:opacity .15s; }
.fb-row:hover .fb-row-actions { opacity:1; }
.fb-act-btn { background:none; border:1px solid var(--border); border-radius:5px; padding:2px 7px; font-size:13px; cursor:pointer; color:var(--text-muted); transition:background .1s,color .1s; }
.fb-act-btn:hover { background:var(--primary-light); color:var(--primary); border-color:var(--primary); }
.fb-act-btn.danger:hover { background:#fee2e2; color:#dc2626; border-color:#dc2626; }
.fw-700 { font-weight:700; }
.text-right { text-align:right; }
.text-muted { color:var(--text-muted); }

/* Dialog */
.fb-overlay { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
.fb-dialog  { background:var(--surface); border-radius:var(--radius-xl,14px); box-shadow:0 24px 60px rgba(0,0,0,.22); width:min(560px,96vw); overflow:hidden; display:flex; flex-direction:column; max-height:90vh; }
.fb-dialog-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:18px 20px 14px; border-bottom:1px solid var(--border); background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%); color:white; }
.fb-dialog-title { font-size:14px; font-weight:700; }
.fb-dialog-sub   { font-size:11.5px; opacity:.75; margin-top:2px; }
.fb-dialog-x { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:white; width:26px; height:26px; border-radius:50%; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.fb-dialog-body { padding:16px 20px; display:flex; flex-direction:column; gap:12px; overflow-y:auto; }
.fb-dialog-foot { display:flex; justify-content:flex-end; gap:10px; padding:12px 20px; border-top:1px solid var(--border); background:var(--bg-alt); flex-shrink:0; }

/* Form elements in dialog */
.fb-fg { display:flex; flex-direction:column; gap:4px; }
.fb-fg label { font-size:10.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.4px; }
.fb-inp { padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius,6px); background:var(--surface); color:var(--text); font-size:13px; font-family:inherit; width:100%; box-sizing:border-box; }
.fb-inp:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 2px rgba(79,70,229,.1); }
.fb-form-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.fb-computed { padding:8px 10px; background:var(--bg-alt); border:1px dashed var(--border); border-radius:var(--radius,6px); font-size:13px; font-weight:700; color:var(--primary); }
.fb-inp-unit { display:flex; }
.fb-inp-unit .fb-inp { border-radius:var(--radius,6px) 0 0 var(--radius,6px); }
.fb-unit { padding:8px 10px; background:var(--bg-alt); border:1px solid var(--border); border-left:none; border-radius:0 var(--radius,6px) var(--radius,6px) 0; font-size:12px; color:var(--text-muted); white-space:nowrap; display:flex; align-items:center; }
.fb-file-zone { border:1.5px dashed var(--border); border-radius:var(--radius,6px); padding:12px; text-align:center; cursor:pointer; font-size:13px; color:var(--text-2); transition:border-color .12s; }
.fb-file-zone:hover, .fb-file-zone.has-file { border-color:var(--primary); background:var(--primary-light); }
.fb-receipt-link { color:var(--primary); text-decoration:underline; margin-left:6px; }
.fb-error { padding:8px 12px; background:var(--danger-bg); border:1px solid var(--danger-border); border-radius:var(--radius,6px); color:var(--danger); font-size:12.5px; }
.fb-customer-row { display:flex; gap:8px; }

/* Korrekturrechnungen und Stornos in EAR-Tabelle */
.fb-row-correction td,
.fb-row-storno td { opacity: 0.55; }
/* Durch Korrektur ersetzte Original-Rechnungen: durchgestrichen */
.fb-row-replaced td { opacity: 0.4; text-decoration: line-through; color: var(--text-muted); }


/* Lieferant Autocomplete */
.vendor-drop { position:absolute; z-index:200; top:100%; left:0; right:0;
  background:var(--surface); border:1px solid var(--border); border-radius:var(--radius);
  box-shadow:0 8px 24px rgba(0,0,0,.12); max-height:200px; overflow-y:auto; margin-top:2px; }
.vendor-drop-item { padding:8px 12px; font-size:12.5px; cursor:pointer; display:flex; align-items:center; }
.vendor-drop-item:hover { background:var(--bg-alt); }

/* ── BQ-1: Beleg-Vorschau ── */
.receipt-preview-link {
  display: inline-flex; align-items: center; text-decoration: none;
}
.receipt-thumb {
  width: 36px; height: 36px; object-fit: cover;
  border-radius: 4px; border: 1px solid var(--border);
  cursor: pointer; transition: transform .15s, box-shadow .15s;
}
.receipt-thumb:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}
.receipt-pdf-icon {
  font-size: 22px; cursor: pointer;
  opacity: .75; transition: opacity .15s;
}
.receipt-pdf-icon:hover { opacity: 1; }
</style>
