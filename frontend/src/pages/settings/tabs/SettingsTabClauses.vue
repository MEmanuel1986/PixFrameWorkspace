<template>
  <div class="s-content">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <p class="s-intro" style="margin:0">Alle Rechtstexte des generierten Vertrags sind hier editierbar. Aenderungen gelten sofort fuer neu erstellte Vertraege. Platzhalter: <code>{studioName}</code>, <code>{archivDauer}</code>, <code>{minCopyrightDamage}</code> werden beim Drucken ersetzt.</p>
      <button class="btn btn-sm btn-secondary" style="flex-shrink:0" title="Blankovertrag als PDF speichern" @click="store.savePdf('/api/pdf/blank-contract', 'Blanko_Vertrag')">
        💾 Blankovertrag
      </button>
    </div>

    <!-- Zahlungsarten -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">💳 Zahlungsarten</span>
        <span class="s-card-sub">Welche Zahlungsarten stehen beim Erfassen eines Zahlungseingangs zur Auswahl?</span>
      </div>
      <div class="s-card-body">
        <div class="payment-methods-grid">
          <label v-for="m in store.availablePaymentMethods" :key="m.id"
            class="pm-check-label"
            :class="{ active: store.form.bookingTerms.enabledPaymentMethods.includes(m.id) }">
            <input type="checkbox" :value="m.id" v-model="store.form.bookingTerms.enabledPaymentMethods" style="display:none" />
            <span class="pm-check-icon">{{ m.icon }}</span>
            <span class="pm-check-name">{{ m.label }}</span>
            <span class="pm-check-tick">{{ store.form.bookingTerms.enabledPaymentMethods.includes(m.id) ? '✓' : '' }}</span>
          </label>
        </div>
        <p class="hint" style="margin-top:10px">Mindestens eine Zahlungsart muss aktiv sein.</p>
      </div>
    </div>

    <!-- Einfache Nutzungsrechte — Zuschlagstabelle -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">📊 Einfache Nutzungsrechte — Zuschlagstabelle</span>
        <span class="s-card-sub">Prozentzuschlag auf das Bildhonorar · nach Kategorie, Laufzeit und Gebiet</span>
      </div>
      <div class="s-card-body">
        <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:16px;line-height:1.6">
          Im einfachen Modell wird der Nutzungsrechtszuschlag als <strong>prozentualer Aufschlag</strong>
          auf das Bildhonorar berechnet. Mehrere Kategorien werden <strong>addiert</strong>.
          <br><code style="background:var(--bg-alt);padding:2px 8px;border-radius:4px;font-size:12px">
            NR-Zuschlag = Bildhonorar × (Kategorie₁% + Kategorie₂% + …)
          </code>
        </p>

        <div class="ur-ref-grid" style="grid-template-columns: repeat(2, 1fr)">
          <div class="ur-ref-block" v-for="cat in urCategories" :key="cat.key">
            <div class="ur-ref-title">{{ cat.icon }} {{ cat.title }}</div>
            <div class="ur-ref-desc">{{ cat.desc }}</div>
            <table class="ur-ref-table">
              <thead><tr>
                <th style="text-align:left;font-size:10px;color:var(--text-muted);padding-bottom:4px">Laufzeit</th>
                <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">Regional</th>
                <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">National</th>
                <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">International</th>
              </tr></thead>
              <tbody>
                <tr v-for="row in cat.rows" :key="row.label">
                  <td>{{ row.label }}</td>
                  <td class="ur-factor">{{ row.regional }} %</td>
                  <td class="ur-factor">{{ row.national }} %</td>
                  <td class="ur-factor">{{ row.international }} %</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="ur-example-box" style="margin-top:16px">
          <div class="ur-example-title">📊 Beispielrechnung</div>
          <p style="font-size:12px;color:var(--text-muted);margin:6px 0">
            Bildhonorar 1.000 € · Online/Social national 1 Jahr (20 %) + Print national 1 Jahr (25 %)<br>
            <strong>NR-Zuschlag = 1.000 € × (20 % + 25 %) = 450 €</strong> · Gesamtauftrag <strong>1.450 €</strong>
          </p>
        </div>

        <div class="infobox" style="margin-top:14px">
          ℹ️ Die Sätze sind Richtwerte für selbstständige Fotografen und Videografen — keine Rechtsberatung. Alle Werte können im Anfrageformular pro Auftrag angepasst werden.
        </div>
      </div>
    </div>

    <!-- designaustria Faktor-Referenz -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">📐 Nutzungsrechte-Kalkulator — Faktor-Referenz</span>
        <span class="s-card-sub">Nach Kalkulations-Richtlinien von designaustria · wird im B2B-Anfrageformular angewendet</span>
      </div>
      <div class="s-card-body">
        <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:16px;line-height:1.6">
          Das Nutzungshonorar wird aus dem Gestaltungshonorar multipliziert mit <strong>6 Faktoren</strong> berechnet:<br>
          <code style="background:var(--bg-alt);padding:2px 8px;border-radius:4px;font-size:12px">
            Nutzungshonorar = Gestaltungshonorar × Thema × Bedeutung × Gebiet × Zeitraum × Nutzungsart × Auftragsart
          </code>
        </p>
        <div class="ur-ref-grid">
          <div class="ur-ref-block" v-for="factor in daFactors" :key="factor.title">
            <div class="ur-ref-title">{{ factor.title }}</div>
            <div class="ur-ref-desc">{{ factor.desc }}</div>
            <table class="ur-ref-table"><tbody>
              <tr v-for="row in factor.rows" :key="row.label">
                <td class="ur-factor">{{ row.value }}</td><td>{{ row.label }}</td>
              </tr>
            </tbody></table>
            <div v-if="factor.note" class="ur-ref-note">{{ factor.note }}</div>
          </div>
        </div>
        <div class="ur-example-box">
          <div class="ur-example-title">📊 Beispielrechnung</div>
          <p style="font-size:12px;color:var(--text-muted);margin:6px 0">
            Produktfotografie (0,75) · Hauptelement (1,0) · National (1,0) · 1 Jahr (1,0) · Zweckgebunden (1,0) · Einzelauftrag (1,5)<br>
            <strong>Faktor = 0,75 × 1,0 × 1,0 × 1,0 × 1,0 × 1,5 = 1,125</strong><br>
            Bei einem Gestaltungshonorar von 800 € → Nutzungshonorar <strong>900 €</strong> · Gesamtauftrag <strong>1.700 €</strong>
          </p>
        </div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:12px">
          Quelle: <a href="https://nutzungsrechte.online" target="_blank" style="color:var(--primary)">nutzungsrechte.online</a>
          · Kalkulations-Richtlinien von designaustria · Diese Werte sind Richtwerte, keine Rechtsberatung.
        </p>
      </div>
    </div>

    <!-- Archivierung & Fristen -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">Archivierung & Fristen</span>
        <span class="s-card-sub">Steuerung der Platzhalter in den Paragraphen-Texten</span>
      </div>
      <div class="s-card-body">
        <div class="form-row">
          <div class="fg">
            <label>Archivierungsdauer Bearbeitete Bilder (Monate)</label>
            <input v-model.number="store.form.contractClauses.archiveDuration" type="number" min="1" max="36" step="1" />
            <span class="hint-inline">Beeinflusst den Platzhalter {archivDauer}</span>
          </div>
          <div class="fg">
            <label>Archivierungsdauer RAW-Dateien (Monate)</label>
            <input v-model.number="store.form.contractClauses.archiveRawDuration" type="number" min="0" max="12" step="1" />
            <span class="hint-inline">0 = keine Archivierung</span>
          </div>
          <div class="fg">
            <label>Mindestschadenspauschale Urheberrecht (% je Verstoss)</label>
            <div class="inp-unit-wrap">
              <input v-model.number="store.form.contractClauses.minCopyrightDamagePercent" type="number" min="50" max="300" step="25" />
              <span class="inp-unit">%</span>
            </div>
            <span class="hint-inline">Platzhalter {minCopyrightDamage} – Empfehlung: 100-200%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Ausrüstungsschadenklausel -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">Ausrüstungsschadenklausel</span>
        <span class="s-card-sub">Erscheint im Vertrag wenn im Auftrag aktiviert</span>
      </div>
      <div class="s-card-body">
        <div class="fg">
          <textarea v-model="store.form.contractClauses.equipmentDamageText" rows="4" class="para-ta"
            placeholder="Verursacht der Auftraggeber oder eine von ihm eingeladene Person schuldhaft einen Schaden..."></textarea>
        </div>
      </div>
    </div>

    <!-- Paragraphen-Texte -->
    <div class="s-intro-banner" style="margin-top:8px">
      <div class="s-intro-icon">§</div>
      <div>
        <div class="s-intro-title">Paragraphen-Texte</div>
        <div class="s-intro-text">Klausel-Texte für den generierten Vertrag. Platzhalter: <code>{studioName}</code>, <code>{archivDauer}</code>, <code>{minCopyrightDamage}</code>. Paragraphen können umbenannt, verschoben, neue Punkte hinzugefügt werden.</div>
      </div>
      <button class="btn btn-sm btn-primary" style="margin-left:auto;flex-shrink:0" @click="store.addCpParagraph">+ Paragraph</button>
    </div>

    <transition-group name="agb-list" tag="div" class="agb-list">
      <div v-for="(para, idx) in store.contractParagraphsList" :key="para.id" class="agb-para-card">
        <div class="agb-para-head">
          <span class="agb-para-num cp-para-num">{{ para.title.match(/^§\s*\d+/) ? para.title.match(/^§\s*[\d\/]+/)[0] : ('§' + (idx+1)) }}</span>
          <input v-model="para.title" class="agb-para-title-input" placeholder="Titel (z.B. § 3 Vergütung)"
            @input="store.cpDirty = true" />
          <div class="agb-para-actions">
            <button class="agb-btn" :disabled="idx === 0" @click="store.moveCpPara(idx,-1)" title="Nach oben">▲</button>
            <button class="agb-btn" :disabled="idx === store.contractParagraphsList.length-1" @click="store.moveCpPara(idx,1)" title="Nach unten">▼</button>
            <button class="agb-btn agb-btn-add" @click="store.addCpItem(idx)" title="Klausel-Text hinzufügen">+ Klausel</button>
            <button class="agb-btn agb-btn-del" @click="store.deleteCpPara(idx)" title="Paragraph löschen">✕ §</button>
          </div>
        </div>
        <div class="agb-items">
          <div v-for="(item, iIdx) in (para.items || [])" :key="iIdx" class="agb-item-row cp-item-row">
            <div class="cp-item-left">
              <input v-model="para.items[iIdx].label" class="cp-item-label-input"
                placeholder="Bezeichnung (z.B. Stundensatz-Hinweis)" @input="store.cpDirty = true" />
              <textarea v-model="para.items[iIdx].text" class="agb-item-ta cp-item-ta" rows="3"
                :placeholder="'Klauseltext für ' + (item.label || 'diesen Punkt') + '…'"
                @input="store.cpDirty = true; store.autoResizeAGB($event)"
                @focus="store.autoResizeAGB($event)" />
            </div>
            <button class="agb-item-del" @click="store.deleteCpItem(idx, iIdx)" title="Klausel löschen">✕</button>
          </div>
          <div v-if="!para.items || para.items.length === 0" class="agb-no-items">
            Noch keine Klauseln — klicke „+ Klausel"
          </div>
        </div>
      </div>
    </transition-group>

    <!-- Sondervereinbarungen -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">Vordefinierte Sondervereinbarungen</span>
        <span class="s-card-sub">Werden im Auftragsformular zur Auswahl angeboten</span>
      </div>
      <div class="s-card-body">
        <div v-for="(cl, idx) in store.form.contractClauses.specialClauses" :key="cl.id" class="clause-item">
          <div class="clause-header">
            <div class="fg" style="flex:1">
              <label>Titel</label>
              <input v-model="cl.title" type="text" placeholder="z.B. Reisekostenregelung" />
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding-top:18px">
              <label class="clause-default-label" :class="{ active: cl.defaultActive }"
                :title="cl.defaultActive ? 'Standardmäßig aktiv' : 'Klicken um als Standard zu setzen'">
                <input type="checkbox" v-model="cl.defaultActive" style="display:none" />
                {{ cl.defaultActive ? '★' : '☆' }}
              </label>
              <span style="font-size:9px;color:var(--text-muted);white-space:nowrap">Standard</span>
            </div>
            <button class="btn btn-ghost btn-sm text-danger" style="margin-top:18px" @click="store.form.contractClauses.specialClauses.splice(idx,1)">Entfernen</button>
          </div>
          <div class="fg" style="margin-top:8px">
            <label>Klauseltext</label>
            <textarea v-model="cl.text" rows="3" class="para-ta"></textarea>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px" @click="store.form.contractClauses.specialClauses.push({ id: 'sc_' + Date.now(), title: '', text: '', defaultActive: false })">
          + Neue Klausel
        </button>
      </div>
    </div>

  </div>
</template>

<script>
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'

export default {
  name: 'SettingsTabClauses',
  setup() {
    const store = useSettingsFormStore()

    // Static reference data for NR tables
    const urCategories = [
      { key: 'print', icon: '🖨', title: 'Print / OOH', desc: 'Anzeigen, Plakate, Kataloge, Außenwerbung, Verpackungen',
        rows: [
          { label: '1 Jahr', regional: 15, national: 25, international: 40 },
          { label: '2 Jahre', regional: 22, national: 38, international: 60 },
          { label: 'Unbegrenzt', regional: 35, national: 55, international: 80 },
        ] },
      { key: 'online', icon: '🌐', title: 'Online / Social', desc: 'Website, Social Media, Newsletter, Online-Anzeigen, Präsentationen',
        rows: [
          { label: '1 Jahr', regional: 10, national: 20, international: 35 },
          { label: '2 Jahre', regional: 15, national: 30, international: 50 },
          { label: 'Unbegrenzt', regional: 25, national: 45, international: 65 },
        ] },
      { key: 'tv', icon: '📺', title: 'TV / Video', desc: 'TV-Werbespots, Streaming-Plattformen, Kino-Werbung, Video-on-Demand',
        rows: [
          { label: '1 Jahr', regional: 30, national: 50, international: 80 },
          { label: '2 Jahre', regional: 45, national: 70, international: 110 },
          { label: 'Unbegrenzt', regional: 60, national: 100, international: 150 },
        ] },
      { key: 'pr', icon: '📰', title: 'PR / Redaktion', desc: 'Pressemitteilungen, Jahresberichte, Mitarbeiterzeitschriften — kein direkter Werbecharakter',
        rows: [
          { label: '1 Jahr', regional: 5, national: 10, international: 18 },
          { label: '2 Jahre', regional: 8, national: 15, international: 25 },
          { label: 'Unbegrenzt', regional: 12, national: 22, international: 35 },
        ] },
    ]

    const daFactors = [
      { title: 'Themenspezifisch', desc: 'Art des Auftrags / der Kommunikation', rows: [
        { value: '1,00', label: 'Branding, Packaging, Corporate Design' },
        { value: '0,75', label: 'Produkt-Werbung' },
        { value: '0,50', label: 'Unternehmenskommunikation' },
      ] },
      { title: 'Bedeutungsspezifisch', desc: 'Stellenwert des Bildes in der Kommunikation', rows: [
        { value: '1,00', label: 'Hauptelement, Basisdesign' },
        { value: '0,75', label: 'Wichtiges Nebenelement' },
        { value: '0,50', label: 'Untergeordnetes Nebenelement' },
      ] },
      { title: 'Kommunikations-/Nutzungsgebiet', desc: 'Geografischer Verbreitungsraum', note: 'Online-Nutzung gilt nicht automatisch als weltweit.', rows: [
        { value: '0,50', label: 'Lokal (einzelner Standort)' },
        { value: '0,75', label: 'Regional (Bundesland, Tourismusregion)' },
        { value: '1,00', label: 'National (ein Staatsgebiet)' },
        { value: '1,50', label: 'Europaweit (inkl. Mittelmeer-Anrainer)' },
        { value: '2,00', label: 'Weltweit' },
      ] },
      { title: 'Einsatz-/Nutzungszeitraum', desc: 'Zeitliche Beschränkung der Lizenz', rows: [
        { value: '0,75', label: 'Einmalige Nutzung (ein Event, eine Auflage)' },
        { value: '1,00', label: '1 Jahr (Werbekampagne, Werbejahr)' },
        { value: '1,50', label: 'Dauernutzung (ohne zeitliche Beschränkung)' },
      ] },
      { title: 'Nutzungsart', desc: 'Art der eingeräumten Rechte', rows: [
        { value: '0,00', label: 'Kein Nutzungsrecht' },
        { value: '1,00', label: 'Zweckgebundenes Werknutzungsrecht' },
        { value: '1,50', label: 'Werknutzungsrecht ohne Zweckbindung' },
        { value: '3,00', label: 'Daten-/Bearbeitungsrecht (inkl. Bearbeitung durch Dritte)' },
      ] },
      { title: 'Auftragsart', desc: 'Art der Geschäftsbeziehung', rows: [
        { value: '0,75', label: 'Folgeauftrag (bekannter Kunde)' },
        { value: '1,00', label: 'Rahmenvereinbarung / Exklusiv-Betreuung' },
        { value: '1,50', label: 'Einzelauftrag (Erstauftrag)' },
      ] },
    ]

    return { store, urCategories, daFactors }
  }
}
</script>
