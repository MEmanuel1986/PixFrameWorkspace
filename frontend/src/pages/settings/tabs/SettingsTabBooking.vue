<template>
  <div class="s-content">

    <!-- Vorgespräch -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">💬 Vorgespräch</span>
        <span class="s-card-sub">Persönliches Kennenlernfgespräch vor der Auftragsannahme</span>
      </div>
      <div class="s-card-body">
        <label class="chk-row" style="margin-bottom:12px">
          <input type="checkbox" v-model="store.form.bookingTerms.requireConsultation" class="chk-box" />
          <div>
            <div class="toggle-label">
              Vorgespräch ist Pflicht
              <span v-if="store.form.bookingTerms.requireConsultation" class="badge badge-aktiv" style="margin-left:8px;font-size:10px">Aktiv</span>
              <span v-else class="badge badge-neutral" style="margin-left:8px;font-size:10px">Optional</span>
            </div>
            <div class="hint" style="margin-top:2px">
              Wenn aktiv: Jeder Auftrag enthält einen Vorgespräch-Schritt.
              Der Vertrag kann erst generiert werden wenn der Kunde im Vorgespräch angenommen wurde.
            </div>
          </div>
        </label>
        <div v-if="store.form.bookingTerms.requireConsultation" class="infobox infobox-yellow" style="margin-top:4px">
          ⚠️ Mit dieser Einstellung kannst du Anfragen ablehnen ohne einen Vertrag erstellen zu müssen.
          Der Auftragsfluss lautet: Anfrage → <strong>Vorgespräch → Annahme</strong> → Angebot → Vertrag → Anzahlung → Shooting → Abrechnung
        </div>
        <div v-else class="infobox infobox-blue" style="margin-top:4px">
          ℹ️ Das Vorgespräch ist optional. Du kannst es pro Auftrag manuell aktivieren.
          Auftragsfluss: Anfrage → Angebot → Vertrag → Anzahlung → Shooting → Abrechnung
        </div>
      </div>
    </div>

    <!-- Anzahlung -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">💰 Anzahlung</span>
        <span class="s-card-sub">Automatisch berechnet wenn ein Auftragsbudget eingetragen wird</span>
      </div>
      <div class="s-card-body">
        <div class="fg-row" style="align-items:flex-end;gap:16px">
          <div class="fg" style="max-width:200px">
            <label>Anzahlungssatz</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.depositRate"
                type="number" min="0" max="100" step="5" placeholder="20" />
              <span class="inp-unit">%</span>
            </div>
          </div>
          <div class="hint-inline" v-if="store.form.bookingTerms.depositRate > 0">
            Beispiel: Budget 2.000 € → Anzahlung
            <strong>{{ ((store.form.bookingTerms.depositRate / 100) * 2000).toFixed(2).replace('.', ',') }} €</strong>
          </div>
        </div>
        <p class="hint" style="margin-top:10px">
          Der berechnete Betrag wird beim Öffnen des Auftrags automatisch in das Anzahlungsfeld eingetragen
          und kann dort jederzeit manuell überschrieben werden.
        </p>
      </div>
    </div>

    <!-- Standard-Honorar & Reisekosten -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">⏱ Stundensätze & Standardpreise</span>
        <span class="s-card-sub">Werden automatisch in neue Aufträge übernommen und im Artikelstamm hinterlegt</span>
      </div>
      <div class="s-card-body">

        <div class="s-rates-section-label">📷 Fotografie</div>
        <div class="fg-row" style="flex-wrap:wrap;gap:12px;margin-bottom:16px">
          <div class="fg" style="max-width:180px">
            <label>Stundensatz Privat</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.hourlyRatePhotoPrivat" type="number" min="0" step="5" placeholder="250" />
              <span class="inp-unit">€/h</span>
            </div>
          </div>
          <div class="fg" style="max-width:180px">
            <label>Stundensatz B2B</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.hourlyRatePhotoB2B" type="number" min="0" step="5" placeholder="200" />
              <span class="inp-unit">€/h</span>
            </div>
          </div>
          <div class="fg" style="max-width:180px">
            <label>Rüstzeit B2B</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.hourlyRatePhotoSetup" type="number" min="0" step="5" placeholder="100" />
              <span class="inp-unit">€/h</span>
            </div>
            <span class="hint-inline">Vor-/Nachbereitung, Briefing, Meetings</span>
          </div>
          <div class="fg" style="max-width:180px">
            <label>Einzelbild Digital – Privat</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.imagePricePrivat" type="number" min="0" step="5" placeholder="40" />
              <span class="inp-unit">€</span>
            </div>
          </div>
          <div class="fg" style="max-width:180px">
            <label>Einzelbild Digital – B2B</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.imagePriceB2B" type="number" min="0" step="5" placeholder="60" />
              <span class="inp-unit">€</span>
            </div>
          </div>
        </div>

        <div class="s-rates-section-label">🎬 Videografie</div>
        <div class="fg-row" style="flex-wrap:wrap;gap:12px;margin-bottom:16px">
          <div class="fg" style="max-width:180px">
            <label>Stundensatz Privat</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.hourlyRateVideoPrivat" type="number" min="0" step="5" placeholder="250" />
              <span class="inp-unit">€/h</span>
            </div>
          </div>
          <div class="fg" style="max-width:180px">
            <label>Stundensatz B2B</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.hourlyRateVideoB2B" type="number" min="0" step="5" placeholder="200" />
              <span class="inp-unit">€/h</span>
            </div>
          </div>
          <div class="fg" style="max-width:180px">
            <label>Rüstzeit B2B</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.hourlyRateVideoSetup" type="number" min="0" step="5" placeholder="100" />
              <span class="inp-unit">€/h</span>
            </div>
            <span class="hint-inline">Vor-/Nachbereitung, Storyboard, Abnahmen</span>
          </div>
          <div class="fg" style="max-width:180px">
            <label>Video 10 Minuten (fertig)</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.videoPer10min" type="number" min="0" step="50" placeholder="1200" />
              <span class="inp-unit">€</span>
            </div>
          </div>
        </div>

        <div class="s-rates-section-label">🚗 Reisekosten</div>
        <div class="fg-row" style="flex-wrap:wrap;gap:12px">
          <div class="fg" style="max-width:180px">
            <label>Kilometerpauschale</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.defaultKmRate" type="number" min="0" step="0.01" placeholder="0.50" />
              <span class="inp-unit">€/km</span>
            </div>
          </div>
          <div class="fg" style="max-width:180px">
            <label>Freikilometer</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.bookingTerms.defaultKmFree" type="number" min="0" step="5" placeholder="30" />
              <span class="inp-unit">km</span>
            </div>
          </div>
        </div>
        <p class="hint" style="margin-top:10px">
          Diese Werte werden beim Öffnen eines Auftrags automatisch eingetragen und können jederzeit überschrieben werden.
        </p>
      </div>
    </div>

    <!-- Nutzungsrechts-Modell -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">©️ Nutzungsrechts-Modell</span>
        <span class="s-card-sub">Bestimmt welches Kalkulationsmodell im B2B-Anfrageformular angezeigt wird</span>
      </div>
      <div class="s-card-body">
        <div class="nr-mode-chips">
          <label class="nr-mode-chip" :class="{ active: store.form.bookingTerms.usageRightsMode === 'simple' }"
            @click="store.form.bookingTerms.usageRightsMode = 'simple'">
            <div class="nr-mode-icon">📊</div>
            <div class="nr-mode-content">
              <div class="nr-mode-title">Einfach (Kategorie-basiert)</div>
              <div class="nr-mode-desc">Prozentzuschlag nach Nutzungsart (Print, Online, TV, PR), Laufzeit und Gebiet. Schnell und intuitiv für die meisten B2B-Aufträge.</div>
            </div>
            <div class="nr-mode-check">{{ store.form.bookingTerms.usageRightsMode === 'simple' ? '✓' : '' }}</div>
          </label>
          <label class="nr-mode-chip" :class="{ active: store.form.bookingTerms.usageRightsMode === 'designaustria' }"
            @click="store.form.bookingTerms.usageRightsMode = 'designaustria'">
            <div class="nr-mode-icon">🧮</div>
            <div class="nr-mode-content">
              <div class="nr-mode-title">designaustria (Faktor-Multiplikation)</div>
              <div class="nr-mode-desc">6 unabhängige Faktoren (Thema, Bedeutung, Gebiet, Zeitraum, Nutzungsart, Auftragsart) nach Kalkulations-Richtlinien von designaustria. Granularer für komplexe Aufträge.</div>
            </div>
            <div class="nr-mode-check">{{ store.form.bookingTerms.usageRightsMode === 'designaustria' ? '✓' : '' }}</div>
          </label>
        </div>
      </div>
    </div>

    <!-- Stornogebühren -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">🚫 Stornogebühren-Staffel</span>
        <span class="s-card-sub">Erscheint im generierten Vertrag unter §4</span>
      </div>
      <div class="s-card-body">
        <p class="hint" style="margin-bottom:14px">
          Jede Zeile definiert eine Stufe. Der Satz gilt, wenn der Kunde
          <em>weniger als</em> die angegebenen Tage vor dem Termin storniert.
          Reihenfolge: höchste Tage zuerst.
        </p>

        <div class="cancellation-table">
          <div class="ct-header">
            <span>Tage vor Termin</span>
            <span>Gebühr (%)</span>
            <span>Bezeichnung (im Vertrag)</span>
            <span></span>
          </div>
          <div v-for="(tier, idx) in store.form.bookingTerms.cancellationFees" :key="idx" class="ct-row">
            <div class="fg">
              <input v-model.number="tier.daysBeforeEvent" type="number" min="0" step="1" placeholder="30" />
            </div>
            <div class="fg">
              <div class="inp-unit-wrap">
                <input v-model.number="tier.feePercent" type="number" min="0" max="100" step="5" placeholder="50" />
                <span class="inp-unit">%</span>
              </div>
            </div>
            <div class="fg ct-label-col">
              <input v-model="tier.label" type="text" placeholder="z.B. bis 30 Tage vor dem Termin" />
            </div>
            <button class="btn btn-ghost btn-sm btn-icon text-danger"
              @click="store.removeCancellationTier(idx)" title="Zeile löschen">🗑️</button>
          </div>
        </div>

        <button class="btn btn-ghost btn-sm" style="margin-top:10px"
          @click="store.addCancellationTier">+ Stufe hinzufügen</button>

        <div class="infobox" style="margin-top:14px">
          ℹ️ Die letzte Stufe (0 Tage) gilt üblicherweise für Nichterscheinen und sehr kurzfristige Stornos.
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'
export default {
  name: 'SettingsTabBooking',
  setup() { return { store: useSettingsFormStore() } }
}
</script>
