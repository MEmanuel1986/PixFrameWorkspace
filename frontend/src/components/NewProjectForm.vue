<template>
  <div class="npf">

    <!-- ── Header ── -->
    <div class="npf-header">
      <div class="npf-header-left">
        <div class="npf-title">{{ mode === 'create' ? 'Neuer Auftrag' : 'Anfrage bearbeiten' }}</div>
        <div class="npf-sub" v-if="customerName">für {{ customerName }}</div>
      </div>
      <div class="npf-header-right">
        <span v-if="error" class="npf-error">⚠ {{ error }}</span>
        <button class="npf-x" @click="$emit('cancel')">✕</button>
      </div>
    </div>

    <!-- ── Gesperrt-Banner ── -->
    <div v-if="locked" class="npf-locked-banner">
      🔒 Anfrage eingefroren — Angebot wurde bereits versendet. Änderungen über <strong>Angebot → ✏️ Auftrag anpassen</strong>.
    </div>

    <!-- ── Body: 2-Spalten-Layout ── -->
    <div class="npf-body">
      <fieldset :disabled="locked" style="border:none;padding:0;margin:0;min-width:0;display:contents">
      <div class="npf-layout">

        <!-- ─── Linke Spalte ──────────────────────────────────────────── -->
        <div class="npf-main">

          <!-- Anlass -->
          <div class="form-group">
            <label>Anlass / Auftragsbezeichnung</label>
            <input v-model="contract.occasion" type="text"
              placeholder="z.B. Hochzeit am 14. Juni 2026"
              @input="form.projectName = contract.occasion"
              class="npf-input-lg" ref="nameInput" />
          </div>

          <!-- Kategorie · Status · Anfrage -->
          <div class="npf-grid-3">
            <div class="form-group">
              <label>Kategorie *</label>
              <select v-model="form.category">
                <option value="">— Bitte wählen —</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="form.status">
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Anfrage eingegangen</label>
              <input v-model="form.inquiryDate" type="date" />
            </div>
          </div>

          <!-- Shooting-Termine (mehrere) -->
          <div class="form-group">
            <label style="display:flex;align-items:center;justify-content:space-between">
              <span>Shooting-Termin(e) *</span>
              <button type="button" class="npf-loc-add-btn" @click.prevent="addShootingDate">+ Termin</button>
            </label>

            <!-- Erster / Haupt-Termin (= booking / bookingTime) -->
            <div class="npf-shoot-row npf-shoot-primary">
              <span class="npf-shoot-badge">Haupt</span>
              <input v-model="form.booking" type="date" required @change="onBookingDateChange"
                class="npf-shoot-date" placeholder="Datum *" />
              <input v-model="form.bookingTime" type="time" class="npf-shoot-time" />
              <input v-model="form.bookingLabel" type="text" class="npf-shoot-label"
                placeholder="z.B. Zeremonie" />
            </div>

            <!-- Weitere Termine -->
            <div v-for="(sd, idx) in form.shootingDates" :key="sd.id" class="npf-shoot-row">
              <span class="npf-shoot-num">{{ idx + 2 }}</span>
              <input v-model="sd.date" type="date" class="npf-shoot-date" />
              <input v-model="sd.time" type="time" class="npf-shoot-time" />
              <input v-model="sd.label" type="text" class="npf-shoot-label"
                placeholder="z.B. Getting Ready, Feier…" />
              <button type="button" class="npf-loc-del" @click.prevent="removeShootingDate(idx)" title="Entfernen">✕</button>
            </div>
          </div>

          <!-- Locations (mehrere) + Lieferdatum -->
          <div class="npf-grid-2">
            <div class="form-group">
              <label style="display:flex;align-items:center;justify-content:space-between">
                <span>Locations / Veranstaltungsorte</span>
                <button type="button" class="npf-loc-add-btn" @click.prevent="addLocation">+ Ort</button>
              </label>

              <!-- Location-Liste -->
              <div v-if="form.locations.length === 0" class="npf-loc-empty">
                Noch kein Ort — klicke "+ Ort"
              </div>
              <div v-for="(loc, idx) in form.locations" :key="loc.id" class="npf-loc-row">
                <select v-model="loc.category" class="npf-loc-cat">
                  <option value="">— Kategorie —</option>
                  <option v-for="cat in locationCategories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
                <input
                  v-model="loc.name"
                  type="text"
                  list="location-suggestions"
                  placeholder="Ort / Name…"
                  class="npf-loc-name"
                  autocomplete="off"
                />
                <button type="button" class="npf-loc-del" @click.prevent="removeLocation(idx)" title="Entfernen">✕</button>
              </div>

              <datalist id="location-suggestions">
                <option value="Studio" />
                <option value="Outdoor" />
                <option value="Stadtpark Rostock" />
                <option value="Warnemünde Strand" />
                <option value="Rosengarten Rostock" />
                <option value="IGA-Park Rostock" />
                <option value="Schloss Gelbensande" />
                <option value="Gut Hohen Luckow" />
                <option value="Strandpromenade Warnemünde" />
                <option value="Kirchdorf Poel" />
                <option value="Fischland-Darß-Zingst" />
                <option value="Hafen Rostock" />
                <option value="Alter Friedhof Rostock" />
                <option value="Botanischer Garten Rostock" />
                <option value="Rügen" />
                <option value="Usedom" />
                <option value="Beim Kunden" />
              </datalist>
            </div>
            <div class="form-group">
              <label>
                Lieferdatum
                <span v-if="deliveryAutoSet" class="npf-auto-tag">6 Wochen</span>
              </label>
              <input v-model="form.deliveryDate" type="date" @change="deliveryAutoSet = false" />
            </div>
          </div>

          <!-- Angebot gewünscht -->
          <div class="npf-skip-quote-row">
            <label class="npf-svc-chip" :class="{ active: !form.skipQuote }" style="gap:8px">
              <input type="checkbox" :checked="!form.skipQuote"
                @change="form.skipQuote = !$event.target.checked"
                style="display:none" />
              {{ !form.skipQuote ? '☑' : '☐' }} Angebot gewünscht
            </label>
            <span class="npf-skip-quote-hint">Standardmäßig kein Angebot (Direktauftrag). Aktivieren wenn ein Angebot erstellt werden soll.</span>
          </div>

          <!-- ── Trennlinie Honorar ── -->
          <div class="npf-divider">
            <span>Honorar &amp; Konditionen</span>
          </div>

          <!-- Kundenstatus + Leistungen -->
          <div class="npf-grid-2">
            <div class="form-group">
              <label>Kundenstatus</label>
              <div class="npf-chip-row">
                <label class="npf-svc-chip" :class="{ active: !contract.clientIsCompany }" @click="contract.clientIsCompany = false">
                  👤 Privatkunde
                </label>
                <label class="npf-svc-chip" :class="{ active: contract.clientIsCompany }" @click="contract.clientIsCompany = true">
                  🏢 B2B
                </label>
              </div>
            </div>
            <div class="form-group">
              <label>Leistungen</label>
              <div class="npf-service-chips">
                <label class="npf-svc-chip" :class="{ active: form.fotografie }">
                  <input type="checkbox" v-model="form.fotografie" style="display:none" />
                  📷 Fotografie
                </label>
                <label class="npf-svc-chip" :class="{ active: form.videografie }">
                  <input type="checkbox" v-model="form.videografie" style="display:none" />
                  🎬 Videografie
                </label>
                <template v-if="!contract.clientIsCompany">
                  <label class="npf-svc-chip" :class="{ active: form.glueckwunschkarten }">
                    <input type="checkbox" v-model="form.glueckwunschkarten" style="display:none" />
                    💌 Danksagung
                  </label>
                  <label class="npf-svc-chip" :class="{ active: form.gettingReadyEr }">
                    <input type="checkbox" v-model="form.gettingReadyEr" style="display:none" />
                    💄 GR Er
                  </label>
                  <label class="npf-svc-chip" :class="{ active: form.gettingReadySie }">
                    <input type="checkbox" v-model="form.gettingReadySie" style="display:none" />
                    💄 GR Sie
                  </label>
                  <label class="npf-svc-chip" :class="{ active: form.gettingReadyBeide }">
                    <input type="checkbox" v-model="form.gettingReadyBeide" style="display:none" />
                    💄 GR Beide
                  </label>
                </template>
              </div>
            </div>
          </div>

          <!-- Preismodell -->
          <div class="form-group">
            <label>Preismodell</label>
            <div class="npf-chip-row">
              <label class="npf-svc-chip" :class="{ active: contract.pricingModel === 'hourly' }">
                <input type="radio" v-model="contract.pricingModel" value="hourly" style="display:none" />⏱ Stunden
              </label>
              <label class="npf-svc-chip" :class="{ active: contract.pricingModel === 'flat' }">
                <input type="radio" v-model="contract.pricingModel" value="flat" style="display:none" />📦 Pauschal
              </label>
            </div>
          </div>

          <!-- Bilder & Videos inklusive (B2B) -->
          <div class="form-group"
            v-if="contract.clientIsCompany">
            <label class="npf-checkbox-label">
              <input type="checkbox" v-model="contract.mediaIncluded" />
              Bilder &amp; Videos im Preis enthalten
              <span class="npf-rate-hint">(Bildpreis aus Summe, NR-Zuschlag bleibt)</span>
              <span v-if="contract.mediaIncluded && (b2bImageBase + b2bVideoBase) > 0"
                style="margin-left:6px;font-size:11px;color:#065f46;font-weight:600">
                − {{ fmt(b2bImageBase + b2bVideoBase) }}
              </span>
            </label>
          </div>

          <!-- Honorarfelder je Preismodell -->

          <!-- B2B + Stunden: Phasen-Kalkulator -->
          <template v-if="contract.clientIsCompany && contract.pricingModel === 'hourly'">

            <!-- ── FOTOGRAFIE-PHASEN ── -->
            <template v-if="form.fotografie">
              <div class="npf-divider" style="margin-top:8px">
                <span>📷 Fotografie — Stunden nach Phasen</span>
              </div>
              <div class="npf-b2b-phases">
                <div class="npf-grid-2" style="margin-bottom:10px">
                  <div class="form-group">
                    <label>Stundensatz Foto <span class="npf-rate-hint">(Shooting + Bearbeitung)</span></label>
                    <div class="inp-unit-wrap">
                      <input v-model.number="contract.hourlyRatePhotoB2B" type="number" min="0" step="5" placeholder="200" />
                      <span class="inp-unit">€/h</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Rüstzeit Foto <span class="npf-rate-hint">(Vorbereitung + Meetings)</span></label>
                    <div class="inp-unit-wrap">
                      <input v-model.number="contract.hourlyRatePhotoSetup" type="number" min="0" step="5" placeholder="100" />
                      <span class="inp-unit">€/h</span>
                    </div>
                  </div>
                </div>
                <div class="npf-phase-grid">
                  <div class="npf-phase-row npf-phase-setup" v-for="ph in [
                    {key:'vorbereitung', label:'Vorbereitung / Konzeption', hint:'Briefing, Moodboard, Recherche — Rüstzeitsatz'},
                    {key:'abstimmung',   label:'Abstimmung / Meetings',    hint:'Kundenkommunikation, Feedback-Runden — Rüstzeitsatz'},
                  ]" :key="ph.key">
                    <div class="npf-phase-info">
                      <span class="npf-phase-label">{{ ph.label }}</span>
                      <span class="npf-phase-hint">{{ ph.hint }}</span>
                    </div>
                    <div class="inp-unit-wrap" style="max-width:110px">
                      <input v-model.number="contract.photoPhases[ph.key]" type="number" min="0" step="0.5" placeholder="0" />
                      <span class="inp-unit">h</span>
                    </div>
                    <span class="npf-phase-net npf-phase-net--setup">{{ fmt((contract.photoPhases[ph.key]||0) * (contract.hourlyRatePhotoSetup||0)) }}</span>
                  </div>
                  <div class="npf-phase-row" v-for="ph in [
                    {key:'shooting',     label:'Shooting',                 hint:'Aufnahmetag(e) vor Ort'},
                    {key:'bearbeitung',  label:'Bildbearbeitung',          hint:'Selektion, Retusche, Galerie — größter Block'},
                  ]" :key="ph.key">
                    <div class="npf-phase-info">
                      <span class="npf-phase-label">{{ ph.label }}</span>
                      <span class="npf-phase-hint">{{ ph.hint }}</span>
                    </div>
                    <div class="inp-unit-wrap" style="max-width:110px">
                      <input v-model.number="contract.photoPhases[ph.key]" type="number" min="0" step="0.5" placeholder="0" />
                      <span class="inp-unit">h</span>
                    </div>
                    <span class="npf-phase-net">{{ fmt((contract.photoPhases[ph.key]||0) * (contract.hourlyRatePhotoB2B||0)) }}</span>
                  </div>
                  <div class="npf-phase-total">
                    <span>Stunden-Summe Fotografie</span>
                    <span class="npf-phase-total-h">{{ photoHoursTotal }} h</span>
                    <span class="npf-phase-total-val">{{ fmt(b2bPhotoNet) }}</span>
                  </div>
                </div>
                <!-- Bilder-Inputs -->
                <div class="npf-grid-2" style="margin-top:10px">
                  <div class="form-group">
                    <label>Anzahl Bilder (digital, B2B)</label>
                    <div class="inp-unit-wrap">
                      <input v-model.number="contract.imageCountB2B" type="number" min="0" step="1" placeholder="0" />
                      <span class="inp-unit" style="font-size:10px">Stück</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Bildpreis B2B</label>
                    <div class="inp-unit-wrap">
                      <input v-model.number="contract.imagePriceB2B" type="number" min="0" step="5" placeholder="60" />
                      <span class="inp-unit">€</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- ── VIDEOGRAFIE-PHASEN ── -->
            <template v-if="form.videografie">
              <div class="npf-divider" style="margin-top:12px">
                <span>🎬 Videografie — Stunden nach Phasen</span>
              </div>
              <div class="npf-b2b-phases">
                <div class="npf-grid-2" style="margin-bottom:10px">
                  <div class="form-group">
                    <label>Stundensatz Video <span class="npf-rate-hint">(Dreh + Schnitt)</span></label>
                    <div class="inp-unit-wrap">
                      <input v-model.number="contract.hourlyRateVideoB2B" type="number" min="0" step="5" placeholder="200" />
                      <span class="inp-unit">€/h</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Rüstzeit Video <span class="npf-rate-hint">(Konzeption + Meetings)</span></label>
                    <div class="inp-unit-wrap">
                      <input v-model.number="contract.hourlyRateVideoSetup" type="number" min="0" step="5" placeholder="100" />
                      <span class="inp-unit">€/h</span>
                    </div>
                  </div>
                </div>
                <div class="npf-phase-grid">
                  <div class="npf-phase-row npf-phase-setup" v-for="ph in [
                    {key:'vorbereitung', label:'Vorbereitung / Konzeption', hint:'Konzept, Storyboard, Planung — Rüstzeitsatz'},
                    {key:'abstimmung',   label:'Abstimmung / Meetings',    hint:'Kundenkommunikation, Abnahmen — Rüstzeitsatz'},
                  ]" :key="ph.key">
                    <div class="npf-phase-info">
                      <span class="npf-phase-label">{{ ph.label }}</span>
                      <span class="npf-phase-hint">{{ ph.hint }}</span>
                    </div>
                    <div class="inp-unit-wrap" style="max-width:110px">
                      <input v-model.number="contract.videoPhases[ph.key]" type="number" min="0" step="0.5" placeholder="0" />
                      <span class="inp-unit">h</span>
                    </div>
                    <span class="npf-phase-net npf-phase-net--setup">{{ fmt((contract.videoPhases[ph.key]||0) * (contract.hourlyRateVideoSetup||0)) }}</span>
                  </div>
                  <div class="npf-phase-row" v-for="ph in [
                    {key:'dreh',   label:'Dreh',                     hint:'Drehtag(e) vor Ort'},
                    {key:'schnitt',label:'Schnitt / Nachbearbeitung', hint:'Schnitt, Grading, Ton, Render — größter Block'},
                  ]" :key="ph.key">
                    <div class="npf-phase-info">
                      <span class="npf-phase-label">{{ ph.label }}</span>
                      <span class="npf-phase-hint">{{ ph.hint }}</span>
                    </div>
                    <div class="inp-unit-wrap" style="max-width:110px">
                      <input v-model.number="contract.videoPhases[ph.key]" type="number" min="0" step="0.5" placeholder="0" />
                      <span class="inp-unit">h</span>
                    </div>
                    <span class="npf-phase-net">{{ fmt((contract.videoPhases[ph.key]||0) * (contract.hourlyRateVideoB2B||0)) }}</span>
                  </div>
                  <div class="npf-phase-total">
                    <span>Stunden-Summe Videografie</span>
                    <span class="npf-phase-total-h">{{ videoHoursTotal }} h</span>
                    <span class="npf-phase-total-val">{{ fmt(b2bVideoNet) }}</span>
                  </div>
                </div>
                <!-- Video-Inputs -->
                <div class="npf-grid-2" style="margin-top:10px">
                  <div class="form-group">
                    <label>Anzahl Videos (10 min)</label>
                    <div class="inp-unit-wrap">
                      <input v-model.number="contract.videoCount10min" type="number" min="0" step="1" placeholder="0" />
                      <span class="inp-unit" style="font-size:10px">Stück</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Videopreis (10 min)</label>
                    <div class="inp-unit-wrap">
                      <input v-model.number="contract.videoPer10min" type="number" min="0" step="50" placeholder="1200" />
                      <span class="inp-unit">€</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- ── Bilder & Videos inklusive Toggle ── -->
            <div class="form-group npf-media-included-toggle"
              v-if="(form.fotografie && contract.imageCountB2B > 0) || (form.videografie && contract.videoCount10min > 0)"
              style="margin-top:4px">
              <label class="npf-usage-toggle" :class="{ active: contract.mediaIncluded }"
                @click="contract.mediaIncluded = !contract.mediaIncluded">
                <span class="npf-usage-toggle-box">{{ contract.mediaIncluded ? '☑' : '☐' }}</span>
                <span>Bilder &amp; Videos im Preis enthalten</span>
                <span class="npf-toggle-hint">(Bildpreis aus Summe, NR-Zuschlag bleibt)</span>
                <span v-if="contract.mediaIncluded && (b2bImageBase + b2bVideoBase) > 0"
                  class="npf-usage-badge" style="background:rgba(5,150,105,.15);color:#065f46;border-color:rgba(5,150,105,.3)">
                  − {{ fmt(b2bImageBase + b2bVideoBase) }} aus Summe
                </span>
              </label>
            </div>

            <!-- ── NUTZUNGSRECHTE (Modus aus Einstellungen) ── -->
            <div class="npf-divider" style="margin-top:12px">
              <span>Werbliche Nutzungsrechte</span>
            </div>

            <!-- Aktivierungs-Toggle -->
            <div class="form-group">
              <label class="npf-usage-toggle" :class="{ active: contract.usageRights.enabled }"
                @click="contract.usageRights.enabled = !contract.usageRights.enabled">
                <span class="npf-usage-toggle-box">{{ contract.usageRights.enabled ? '☑' : '☐' }}</span>
                <span>Nutzungsrechtszuschlag berechnen</span>
                <span v-if="contract.usageRights.enabled && (b2bImageNR + b2bVideoNR) > 0" class="npf-usage-badge">
                  + {{ fmt(b2bImageNR + b2bVideoNR) }}
                </span>
              </label>
              <div class="npf-usage-method-hint">
                <template v-if="nrMode === 'simple'">
                  Prozentzuschlag auf Bild-/Videopreise nach Nutzungsart, Laufzeit und Gebiet
                </template>
                <template v-else>
                  Nach Kalkulations-Richtlinien von designaustria · Faktor-Multiplikation auf Bild-/Videopreise
                </template>
              </div>
            </div>

            <template v-if="contract.usageRights.enabled">

              <!-- ── SIMPLE MODE ── -->
              <template v-if="nrMode === 'simple'">
                <div class="form-group">
                  <label style="display:flex;align-items:center;gap:6px">
                    Nutzungsarten
                    <span class="npf-usage-badge" v-if="simpleNrPercent > 0">+{{ simpleNrPercent }}%</span>
                  </label>
                  <div class="npf-simple-nr-grid">
                    <label v-for="cat in simpleNrCategories" :key="cat.key"
                      class="npf-snr-chip"
                      :class="{ active: contract.simpleNr.categories.includes(cat.key) }"
                      @click="toggleSimpleNrCat(cat.key)">
                      <span class="npf-snr-icon">{{ cat.icon }}</span>
                      <span class="npf-snr-name">{{ cat.label }}</span>
                      <span class="npf-snr-desc">{{ cat.desc }}</span>
                      <!-- Hover-Tooltip -->
                      <span class="npf-info-icon" style="margin-left:auto;margin-top:2px" @click.stop>ℹ
                        <span class="npf-tooltip" style="width:220px">
                          <strong>{{ cat.label }}</strong><br>{{ cat.tooltip }}
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <div class="npf-grid-2" v-if="contract.simpleNr.categories.length > 0">
                  <div class="form-group">
                    <label>Laufzeit</label>
                    <select v-model="contract.simpleNr.duration">
                      <option value="1 Jahr">1 Jahr</option>
                      <option value="2 Jahre">2 Jahre</option>
                      <option value="unbegrenzt">Unbegrenzt / Buyout</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Geltungsbereich</label>
                    <select v-model="contract.simpleNr.scope">
                      <option value="regional">Regional</option>
                      <option value="national">National (D/AT/CH)</option>
                      <option value="international">International / Global</option>
                    </select>
                  </div>
                </div>

                <div class="npf-simple-nr-summary" v-if="simpleNrPercent > 0 && (b2bImageBase + b2bVideoBase) > 0">
                  <div class="npf-snr-sum-row">
                    <span>Bild-/Videosumme</span>
                    <span>{{ fmt(b2bImageBase + b2bVideoBase) }}</span>
                  </div>
                  <div class="npf-snr-sum-row">
                    <span>NR-Zuschlag ({{ simpleNrPercent }}%)</span>
                    <span class="text-warning">+ {{ fmt(b2bImageNR + b2bVideoNR) }}</span>
                  </div>
                </div>
              </template>

              <!-- ── DESIGNAUSTRIA MODE ── -->
              <template v-else>
                <div class="npf-usage-group-label">Allgemeine Faktoren</div>
                <div class="npf-grid-2">
                  <div class="form-group">
                    <label class="npf-usage-factor-label">
                      Themenspezifisch
                      <span class="npf-info-icon">ℹ<span class="npf-tooltip"><strong>Thema des Auftrags:</strong><br><b>Branding / CD (1,0)</b> — Logo, CI, Verpackung<br><b>Produkt-Werbung (0,75)</b> — Kampagnen, Anzeigen<br><b>Unternehmenskommunikation (0,5)</b> — Berichte, intern</span></span>
                    </label>
                    <div class="npf-factor-chips">
                      <label v-for="o in [{v:1.0,l:'Branding / CD'},{v:0.75,l:'Produkt-Werbung'},{v:0.5,l:'Unternehmenskomm.'}]"
                        :key="o.v" class="npf-fchip" :class="{ active: contract.usageRights.thema === o.v }"
                        @click="contract.usageRights.thema = o.v">
                        <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span>
                        <span class="npf-fchip-label">{{ o.l }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="npf-usage-factor-label">
                      Bedeutungsspezifisch
                      <span class="npf-info-icon">ℹ<span class="npf-tooltip"><strong>Stellenwert des Bildes:</strong><br><b>Hauptelement (1,0)</b><br><b>Wichtiges Neben-el. (0,75)</b><br><b>Untergeordnet (0,5)</b></span></span>
                    </label>
                    <div class="npf-factor-chips">
                      <label v-for="o in [{v:1.0,l:'Hauptelement'},{v:0.75,l:'Wichtiges Neben-el.'},{v:0.5,l:'Untergeordnet'}]"
                        :key="o.v" class="npf-fchip" :class="{ active: contract.usageRights.bedeutung === o.v }"
                        @click="contract.usageRights.bedeutung = o.v">
                        <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span>
                        <span class="npf-fchip-label">{{ o.l }}</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div class="npf-usage-group-label">Auftragsspezifische Faktoren</div>
                <div class="npf-grid-2">
                  <div class="form-group">
                    <label class="npf-usage-factor-label">Kommunikations-/Nutzungsgebiet<span class="npf-info-icon">ℹ<span class="npf-tooltip"><b>Lokal (0,5)</b> · <b>Regional (0,75)</b> · <b>National (1,0)</b> · <b>Europaweit (1,5)</b> · <b>Weltweit (2,0)</b></span></span></label>
                    <div class="npf-factor-chips">
                      <label v-for="o in [{v:0.5,l:'Lokal'},{v:0.75,l:'Regional'},{v:1.0,l:'National'},{v:1.5,l:'Europaweit'},{v:2.0,l:'Weltweit'}]"
                        :key="o.v" class="npf-fchip" :class="{ active: contract.usageRights.gebiet === o.v }"
                        @click="contract.usageRights.gebiet = o.v">
                        <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span>
                        <span class="npf-fchip-label">{{ o.l }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="npf-usage-factor-label">Einsatz-/Nutzungszeitraum<span class="npf-info-icon">ℹ<span class="npf-tooltip"><b>Einmalig (0,75)</b> · <b>1 Jahr (1,0)</b> · <b>Dauernutzung (1,5)</b></span></span></label>
                    <div class="npf-factor-chips">
                      <label v-for="o in [{v:0.75,l:'Einmalig'},{v:1.0,l:'1 Jahr'},{v:1.5,l:'Dauernutzung'}]"
                        :key="o.v" class="npf-fchip" :class="{ active: contract.usageRights.zeitraum === o.v }"
                        @click="contract.usageRights.zeitraum = o.v">
                        <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span>
                        <span class="npf-fchip-label">{{ o.l }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="npf-usage-factor-label">Nutzungsart<span class="npf-info-icon">ℹ<span class="npf-tooltip"><b>Kein Recht (0)</b> · <b>Zweckgebunden (1,0)</b> · <b>Ohne Zweckbindung (1,5)</b> · <b>Bearbeitungsrecht (3,0)</b></span></span></label>
                    <div class="npf-factor-chips">
                      <label v-for="o in [{v:0,l:'Kein Recht'},{v:1.0,l:'Zweckgebunden'},{v:1.5,l:'Ohne Zweckbindung'},{v:3.0,l:'Bearbeitungsrecht'}]"
                        :key="o.v" class="npf-fchip" :class="{ active: contract.usageRights.nutzungsart === o.v }"
                        @click="contract.usageRights.nutzungsart = o.v">
                        <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span>
                        <span class="npf-fchip-label">{{ o.l }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="npf-usage-factor-label">Auftragsart<span class="npf-info-icon">ℹ<span class="npf-tooltip"><b>Folgeauftrag (0,75)</b> · <b>Rahmenvereinbarung (1,0)</b> · <b>Einzelauftrag (1,5)</b></span></span></label>
                    <div class="npf-factor-chips">
                      <label v-for="o in [{v:0.75,l:'Folgeauftrag'},{v:1.0,l:'Rahmenvereinbarung'},{v:1.5,l:'Einzelauftrag'}]"
                        :key="o.v" class="npf-fchip" :class="{ active: contract.usageRights.auftragsart === o.v }"
                        @click="contract.usageRights.auftragsart = o.v">
                        <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span>
                        <span class="npf-fchip-label">{{ o.l }}</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div class="npf-simple-nr-summary" v-if="usageMultiplier > 0 && (b2bImageBase + b2bVideoBase) > 0">
                  <div class="npf-snr-sum-row">
                    <span>Bild-/Videosumme</span><span>{{ fmt(b2bImageBase + b2bVideoBase) }}</span>
                  </div>
                  <div class="npf-snr-sum-row">
                    <span>NR-Zuschlag (× {{ usageMultiplier.toFixed(3) }})</span>
                    <span class="text-warning">+ {{ fmt(b2bImageNR + b2bVideoNR) }}</span>
                  </div>
                </div>
              </template>

            </template>

            <!-- ── KALKULATIONSSUMMEN (nach NR) ── -->
            <template v-if="form.fotografie && (photoHoursTotal > 0 || contract.imageCountB2B > 0)">
              <div class="npf-b2b-formula" style="margin-top:12px">
                <span class="npf-formula-label">Fotografie-Summe</span>
                <div class="npf-formula-lines">
                  <div v-if="photoHoursTotal > 0" class="npf-formula-line">
                    <span class="npf-fl-desc">Stunden</span>
                    <span class="npf-fl-calc">{{ photoHoursTotal }} h × {{ fmt(contract.hourlyRatePhotoB2B||0) }}</span>
                    <span class="npf-fl-val">{{ fmt(b2bPhotoNet) }}</span>
                  </div>
                  <div v-if="b2bImageBase > 0 && !contract.mediaIncluded" class="npf-formula-line">
                    <span class="npf-fl-desc">Bilder</span>
                    <span class="npf-fl-calc">{{ contract.imageCountB2B }} × {{ fmt(contract.imagePriceB2B||0) }}</span>
                    <span class="npf-fl-val">{{ fmt(b2bImageBase) }}</span>
                  </div>
                  <div v-if="b2bImageBase > 0 && contract.mediaIncluded" class="npf-formula-line" style="color:var(--text-muted);font-style:italic">
                    <span class="npf-fl-desc">Bilder</span>
                    <span class="npf-fl-calc">{{ contract.imageCountB2B }} Stück · inklusive</span>
                    <span class="npf-fl-val" style="text-decoration:line-through;opacity:.5">{{ fmt(b2bImageBase) }}</span>
                  </div>
                  <div v-if="b2bImageNR > 0" class="npf-formula-line npf-formula-line--nr">
                    <span class="npf-fl-desc">NR-Zuschlag</span>
                    <span class="npf-fl-calc" v-if="nrMode === 'simple'">{{ fmt(b2bImageBase) }} × {{ simpleNrPercent }}%</span>
                    <span class="npf-fl-calc" v-else>{{ fmt(b2bImageBase) }} × {{ usageMultiplier.toFixed(3) }}</span>
                    <span class="npf-fl-val">+ {{ fmt(b2bImageNR) }}</span>
                  </div>
                  <div class="npf-formula-line npf-formula-total">
                    <span class="npf-fl-desc">Fotografie gesamt</span>
                    <span class="npf-fl-calc"></span>
                    <span class="npf-fl-val">{{ fmt(b2bPhotoTotal) }}</span>
                  </div>
                </div>
              </div>
            </template>

            <template v-if="form.videografie && (videoHoursTotal > 0 || contract.videoCount10min > 0)">
              <div class="npf-b2b-formula" style="margin-top:8px">
                <span class="npf-formula-label">Videografie-Summe</span>
                <div class="npf-formula-lines">
                  <div v-if="videoHoursTotal > 0" class="npf-formula-line">
                    <span class="npf-fl-desc">Stunden</span>
                    <span class="npf-fl-calc">{{ videoHoursTotal }} h × {{ fmt(contract.hourlyRateVideoB2B||0) }}</span>
                    <span class="npf-fl-val">{{ fmt(b2bVideoNet) }}</span>
                  </div>
                  <div v-if="b2bVideoBase > 0 && !contract.mediaIncluded" class="npf-formula-line">
                    <span class="npf-fl-desc">Videos</span>
                    <span class="npf-fl-calc">{{ contract.videoCount10min }} × {{ fmt(contract.videoPer10min||0) }}</span>
                    <span class="npf-fl-val">{{ fmt(b2bVideoBase) }}</span>
                  </div>
                  <div v-if="b2bVideoBase > 0 && contract.mediaIncluded" class="npf-formula-line" style="color:var(--text-muted);font-style:italic">
                    <span class="npf-fl-desc">Videos</span>
                    <span class="npf-fl-calc">{{ contract.videoCount10min }} Stück · inklusive</span>
                    <span class="npf-fl-val" style="text-decoration:line-through;opacity:.5">{{ fmt(b2bVideoBase) }}</span>
                  </div>
                  <div v-if="b2bVideoNR > 0" class="npf-formula-line npf-formula-line--nr">
                    <span class="npf-fl-desc">NR-Zuschlag</span>
                    <span class="npf-fl-calc" v-if="nrMode === 'simple'">{{ fmt(b2bVideoBase) }} × {{ simpleNrPercent }}%</span>
                    <span class="npf-fl-calc" v-else>{{ fmt(b2bVideoBase) }} × {{ usageMultiplier.toFixed(3) }}</span>
                    <span class="npf-fl-val">+ {{ fmt(b2bVideoNR) }}</span>
                  </div>
                  <div class="npf-formula-line npf-formula-total">
                    <span class="npf-fl-desc">Videografie gesamt</span>
                    <span class="npf-fl-calc"></span>
                    <span class="npf-fl-val">{{ fmt(b2bVideoTotal) }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Gesamtübersicht -->
            <div class="npf-b2b-summary" v-if="b2bSubtotal > 0">
              <div class="npf-b2b-sum-row" v-if="b2bPhotoTotal > 0">
                <span>📷 Fotografie<span v-if="contract.mediaIncluded && b2bImageBase > 0" style="font-size:10px;color:var(--text-muted);margin-left:4px">(Bilder inkl.)</span></span>
                <span>{{ fmt(b2bPhotoTotal) }}</span>
              </div>
              <div class="npf-b2b-sum-row" v-if="b2bVideoTotal > 0">
                <span>🎬 Videografie<span v-if="contract.mediaIncluded && b2bVideoBase > 0" style="font-size:10px;color:var(--text-muted);margin-left:4px">(Videos inkl.)</span></span>
                <span>{{ fmt(b2bVideoTotal) }}</span>
              </div>
              <div class="npf-b2b-sum-total">
                <span>Teilsumme Leistungen (netto)</span>
                <span>{{ fmt(b2bSubtotal) }}</span>
              </div>
            </div>

          </template>

          <!-- Privat + Stunden: aufgeschlüsselt nach gewählten Leistungen -->
          <div v-else-if="contract.pricingModel === 'hourly'">

            <!-- Fotografie -->
            <template v-if="form.fotografie">
              <div class="npf-divider" style="margin-top:8px">
                <span>📷 Fotografie</span>
              </div>
              <div class="npf-grid-3">
                <div class="form-group">
                  <label>Stundensatz</label>
                  <div class="inp-unit-wrap">
                    <input v-model.number="contract.hourlyRatePhotoPrivat" type="number" min="0" step="5" placeholder="250" />
                    <span class="inp-unit">€/h</span>
                  </div>
                </div>
                <div class="form-group">
                  <label>Geplante Stunden</label>
                  <input v-model.number="contract.estimatedHoursPhoto" type="number" min="0" step="0.5" placeholder="8" />
                </div>
                <div class="form-group">
                  <label>Summe</label>
                  <div class="npf-computed" v-if="(contract.hourlyRatePhotoPrivat||0) * (contract.estimatedHoursPhoto||0) > 0">
                    {{ fmt((contract.hourlyRatePhotoPrivat||0) * (contract.estimatedHoursPhoto||0)) }}
                  </div>
                  <div class="npf-computed-empty" v-else>Stunden × Satz</div>
                </div>
              </div>
              <!-- Bilder im Stundensatz enthalten – kein separates Bildanzahl-Feld -->
            </template>

            <!-- Videografie -->
            <template v-if="form.videografie">
              <div class="npf-divider" style="margin-top:10px">
                <span>🎬 Videografie</span>
              </div>
              <div class="npf-grid-3">
                <div class="form-group">
                  <label>Stundensatz</label>
                  <div class="inp-unit-wrap">
                    <input v-model.number="contract.hourlyRateVideoPrivat" type="number" min="0" step="5" placeholder="250" />
                    <span class="inp-unit">€/h</span>
                  </div>
                </div>
                <div class="form-group">
                  <label>Geplante Stunden</label>
                  <input v-model.number="contract.estimatedHoursVideo" type="number" min="0" step="0.5" placeholder="8" />
                </div>
                <div class="form-group">
                  <label>Summe</label>
                  <div class="npf-computed" v-if="(contract.hourlyRateVideoPrivat||0) * (contract.estimatedHoursVideo||0) > 0">
                    {{ fmt((contract.hourlyRateVideoPrivat||0) * (contract.estimatedHoursVideo||0)) }}
                  </div>
                  <div class="npf-computed-empty" v-else>Stunden × Satz</div>
                </div>
              </div>
            </template>

            <!-- Gesamtübersicht -->
            <div class="npf-b2b-summary" style="margin-top:10px"
              v-if="privatHoursTotal > 0 || ((contract.imageCountPrivat||0) > 0)">
              <div class="npf-b2b-sum-row" v-if="privatPhotoNet > 0">
                <span>📷 Fotografie ({{ contract.estimatedHoursPhoto || 0 }} h)</span>
                <span>{{ fmt(privatPhotoNet) }}</span>
              </div>
              <!-- Bilder im Stundensatz enthalten: kein separater Posten -->
              <div class="npf-b2b-sum-row" v-if="privatVideoNet > 0">
                <span>🎬 Videografie ({{ contract.estimatedHoursVideo || 0 }} h)</span>
                <span>{{ fmt(privatVideoNet) }}</span>
              </div>
              <div class="npf-b2b-sum-total">
                <span>Gesamtbetrag (netto)</span>
                <span>{{ fmt(privatTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- Pauschal: Privat + B2B -->
          <template v-else-if="contract.pricingModel === 'flat'">

            <!-- Pauschalbetrag + Leistungsbeschreibung -->
            <div class="npf-grid-2">
              <div class="form-group">
                <label>Pauschalbetrag (€ netto)</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="contract.flatRate" type="number" min="0" step="50" placeholder="2000" />
                  <span class="inp-unit">€</span>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>Enthaltene Leistungen</label>
              <textarea v-model="contract.flatRateIncludes" rows="3"
                placeholder="z.B. Ganztägiges Shooting (bis 8h), vollständige Bildbearbeitung, Online-Galerie mit 300+ Fotos, Lieferung als JPEG-Download in Druckqualität …" />
              <div class="npf-flat-hint">Erscheint im Vertrag unter Leistungsumfang</div>
            </div>

            <!-- B2B: Bilder/Videos + Nutzungsrechte auf die Liefermenge -->
            <template v-if="contract.clientIsCompany">
              <div class="npf-divider" style="margin-top:10px">
                <span>🖼 Liefermenge & Nutzungsrechte</span>
              </div>

              <div class="npf-grid-2">
                <div class="form-group" v-if="form.fotografie">
                  <label>Anzahl Bilder (digital, B2B)</label>
                  <div class="inp-unit-wrap">
                    <input v-model.number="contract.imageCountB2B" type="number" min="0" step="1" placeholder="0" />
                    <span class="inp-unit" style="font-size:10px">Stück</span>
                  </div>
                </div>
                <div class="form-group" v-if="form.fotografie">
                  <label>Bildpreis B2B</label>
                  <div class="inp-unit-wrap">
                    <input v-model.number="contract.imagePriceB2B" type="number" min="0" step="5" placeholder="60" />
                    <span class="inp-unit">€</span>
                  </div>
                </div>
                <div class="form-group" v-if="form.videografie">
                  <label>Anzahl Videos (10 min)</label>
                  <div class="inp-unit-wrap">
                    <input v-model.number="contract.videoCount10min" type="number" min="0" step="1" placeholder="0" />
                    <span class="inp-unit" style="font-size:10px">Stück</span>
                  </div>
                </div>
                <div class="form-group" v-if="form.videografie">
                  <label>Videopreis (10 min)</label>
                  <div class="inp-unit-wrap">
                    <input v-model.number="contract.videoPer10min" type="number" min="0" step="50" placeholder="1200" />
                    <span class="inp-unit">€</span>
                  </div>
                </div>
              </div>

              <!-- Toggle: Bilder & Videos im Preis enthalten (Pauschal B2B) -->
              <div class="form-group npf-media-included-toggle"
                v-if="(form.fotografie && contract.imageCountB2B > 0) || (form.videografie && contract.videoCount10min > 0)">
                <label class="npf-usage-toggle" :class="{ active: contract.mediaIncluded }"
                  @click="contract.mediaIncluded = !contract.mediaIncluded">
                  <span class="npf-usage-toggle-box">{{ contract.mediaIncluded ? '☑' : '☐' }}</span>
                  <span>Bilder & Videos im Preis enthalten</span>
                  <span class="npf-toggle-hint">(Bildpreis aus Summe, NR-Zuschlag bleibt)</span>
                  <span v-if="contract.mediaIncluded && (b2bImageBase + b2bVideoBase) > 0"
                    class="npf-usage-badge" style="background:rgba(5,150,105,.15);color:#065f46;border-color:rgba(5,150,105,.3)">
                    − {{ fmt(b2bImageBase + b2bVideoBase) }} aus Summe
                  </span>
                </label>
              </div>

              <!-- NR-Aktivierungs-Toggle -->
              <div class="form-group">
                <label class="npf-usage-toggle" :class="{ active: contract.usageRights.enabled }"
                  @click="contract.usageRights.enabled = !contract.usageRights.enabled">
                  <span class="npf-usage-toggle-box">{{ contract.usageRights.enabled ? '☑' : '☐' }}</span>
                  <span>Nutzungsrechtszuschlag auf Bild-/Videopreise</span>
                  <span v-if="contract.usageRights.enabled && (b2bImageNR + b2bVideoNR) > 0" class="npf-usage-badge">
                    + {{ fmt(b2bImageNR + b2bVideoNR) }}
                  </span>
                </label>
              </div>

              <template v-if="contract.usageRights.enabled">
                <!-- Simple NR -->
                <template v-if="nrMode === 'simple'">
                  <div class="form-group">
                    <label style="display:flex;align-items:center;gap:6px">
                      Nutzungsarten
                      <span class="npf-usage-badge" v-if="simpleNrPercent > 0">+{{ simpleNrPercent }}%</span>
                    </label>
                    <div class="npf-simple-nr-grid">
                      <label v-for="cat in simpleNrCategories" :key="cat.key"
                        class="npf-snr-chip" :class="{ active: contract.simpleNr.categories.includes(cat.key) }"
                        @click="toggleSimpleNrCat(cat.key)">
                        <span class="npf-snr-icon">{{ cat.icon }}</span>
                        <span class="npf-snr-name">{{ cat.label }}</span>
                        <span class="npf-snr-desc">{{ cat.desc }}</span>
                        <span class="npf-info-icon" style="margin-left:auto" @click.stop>ℹ
                          <span class="npf-tooltip" style="width:220px"><strong>{{ cat.label }}</strong><br>{{ cat.tooltip }}</span>
                        </span>
                      </label>
                    </div>
                  </div>
                  <div class="npf-grid-2" v-if="contract.simpleNr.categories.length > 0">
                    <div class="form-group">
                      <label>Laufzeit</label>
                      <select v-model="contract.simpleNr.duration">
                        <option value="1 Jahr">1 Jahr</option>
                        <option value="2 Jahre">2 Jahre</option>
                        <option value="unbegrenzt">Unbegrenzt / Buyout</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Geltungsbereich</label>
                      <select v-model="contract.simpleNr.scope">
                        <option value="regional">Regional</option>
                        <option value="national">National (D/AT/CH)</option>
                        <option value="international">International / Global</option>
                      </select>
                    </div>
                  </div>
                </template>
                <!-- designaustria NR (kompakt, gleiche Chips) -->
                <template v-else>
                  <div class="npf-usage-group-label">Allgemeine Faktoren</div>
                  <div class="npf-grid-2">
                    <div class="form-group">
                      <label class="npf-usage-factor-label">Themenspezifisch<span class="npf-info-icon">ℹ<span class="npf-tooltip">Branding/CD 1,0 · Produkt-Werbung 0,75 · Unternehmenskomm. 0,5</span></span></label>
                      <div class="npf-factor-chips">
                        <label v-for="o in [{v:1.0,l:'Branding'},{v:0.75,l:'Produkt'},{v:0.5,l:'Unternehmenskomm.'}]" :key="o.v"
                          class="npf-fchip" :class="{ active: contract.usageRights.thema === o.v }" @click="contract.usageRights.thema = o.v">
                          <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span><span class="npf-fchip-label">{{ o.l }}</span>
                        </label>
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="npf-usage-factor-label">Bedeutung<span class="npf-info-icon">ℹ<span class="npf-tooltip">Hauptelement 1,0 · Wichtiges Neben-el. 0,75 · Untergeordnet 0,5</span></span></label>
                      <div class="npf-factor-chips">
                        <label v-for="o in [{v:1.0,l:'Hauptelement'},{v:0.75,l:'Neben-el.'},{v:0.5,l:'Untergeordnet'}]" :key="o.v"
                          class="npf-fchip" :class="{ active: contract.usageRights.bedeutung === o.v }" @click="contract.usageRights.bedeutung = o.v">
                          <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span><span class="npf-fchip-label">{{ o.l }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="npf-usage-group-label">Auftragsspezifische Faktoren</div>
                  <div class="npf-grid-2">
                    <div class="form-group">
                      <label class="npf-usage-factor-label">Nutzungsgebiet<span class="npf-info-icon">ℹ<span class="npf-tooltip">Lokal 0,5 · Regional 0,75 · National 1,0 · Europaweit 1,5 · Weltweit 2,0</span></span></label>
                      <div class="npf-factor-chips">
                        <label v-for="o in [{v:0.5,l:'Lokal'},{v:0.75,l:'Regional'},{v:1.0,l:'National'},{v:1.5,l:'Europaweit'},{v:2.0,l:'Weltweit'}]" :key="o.v"
                          class="npf-fchip" :class="{ active: contract.usageRights.gebiet === o.v }" @click="contract.usageRights.gebiet = o.v">
                          <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span><span class="npf-fchip-label">{{ o.l }}</span>
                        </label>
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="npf-usage-factor-label">Zeitraum<span class="npf-info-icon">ℹ<span class="npf-tooltip">Einmalig 0,75 · 1 Jahr 1,0 · Dauernutzung 1,5</span></span></label>
                      <div class="npf-factor-chips">
                        <label v-for="o in [{v:0.75,l:'Einmalig'},{v:1.0,l:'1 Jahr'},{v:1.5,l:'Dauernutzung'}]" :key="o.v"
                          class="npf-fchip" :class="{ active: contract.usageRights.zeitraum === o.v }" @click="contract.usageRights.zeitraum = o.v">
                          <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span><span class="npf-fchip-label">{{ o.l }}</span>
                        </label>
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="npf-usage-factor-label">Nutzungsart<span class="npf-info-icon">ℹ<span class="npf-tooltip">Kein Recht 0 · Zweckgebunden 1,0 · Ohne Zweckbindung 1,5 · Bearbeitungsrecht 3,0</span></span></label>
                      <div class="npf-factor-chips">
                        <label v-for="o in [{v:0,l:'Kein Recht'},{v:1.0,l:'Zweckgebunden'},{v:1.5,l:'Ohne Zweckb.'},{v:3.0,l:'Bearbeitungsrecht'}]" :key="o.v"
                          class="npf-fchip" :class="{ active: contract.usageRights.nutzungsart === o.v }" @click="contract.usageRights.nutzungsart = o.v">
                          <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span><span class="npf-fchip-label">{{ o.l }}</span>
                        </label>
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="npf-usage-factor-label">Auftragsart<span class="npf-info-icon">ℹ<span class="npf-tooltip">Folgeauftrag 0,75 · Rahmenvereinbarung 1,0 · Einzelauftrag 1,5</span></span></label>
                      <div class="npf-factor-chips">
                        <label v-for="o in [{v:0.75,l:'Folgeauftrag'},{v:1.0,l:'Rahmenvereinb.'},{v:1.5,l:'Einzelauftrag'}]" :key="o.v"
                          class="npf-fchip" :class="{ active: contract.usageRights.auftragsart === o.v }" @click="contract.usageRights.auftragsart = o.v">
                          <span class="npf-fchip-factor">{{ o.v.toFixed(2) }}</span><span class="npf-fchip-label">{{ o.l }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- NR-Zusammenfassung -->
                <div class="npf-simple-nr-summary" v-if="(b2bImageNR + b2bVideoNR) > 0">
                  <div class="npf-snr-sum-row">
                    <span>Bild-/Videosumme</span>
                    <span>{{ fmt(b2bImageBase + b2bVideoBase) }}</span>
                  </div>
                  <div class="npf-snr-sum-row">
                    <span>NR-Zuschlag<template v-if="nrMode === 'simple'"> (+{{ simpleNrPercent }}%)</template><template v-else> (× {{ usageMultiplier.toFixed(3) }})</template></span>
                    <span class="text-warning">+ {{ fmt(b2bImageNR + b2bVideoNR) }}</span>
                  </div>
                </div>
              </template>

              <!-- Pauschale + NR Gesamtübersicht -->
              <div class="npf-b2b-summary" v-if="contract.flatRate || b2bImageBase > 0 || b2bVideoBase > 0">
                <div class="npf-b2b-sum-row" v-if="contract.flatRate">
                  <span>Pauschalbetrag Arbeitsleistung</span>
                  <span>{{ fmt(contract.flatRate) }}</span>
                </div>
                <div class="npf-b2b-sum-row" v-if="b2bImageBase > 0 && !contract.mediaIncluded">
                  <span>Bildpaket ({{ contract.imageCountB2B }} × {{ fmt(contract.imagePriceB2B||0) }})</span>
                  <span>{{ fmt(b2bImageBase) }}</span>
                </div>
                <div class="npf-b2b-sum-row" v-if="b2bImageBase > 0 && contract.mediaIncluded" style="color:var(--text-muted);font-style:italic">
                  <span>Bildpaket ({{ contract.imageCountB2B }} Stück · inklusive)</span>
                  <span style="text-decoration:line-through;opacity:.5">{{ fmt(b2bImageBase) }}</span>
                </div>
                <div class="npf-b2b-sum-row" v-if="b2bVideoBase > 0 && !contract.mediaIncluded">
                  <span>Videopaket ({{ contract.videoCount10min }} × {{ fmt(contract.videoPer10min||0) }})</span>
                  <span>{{ fmt(b2bVideoBase) }}</span>
                </div>
                <div class="npf-b2b-sum-row" v-if="b2bVideoBase > 0 && contract.mediaIncluded" style="color:var(--text-muted);font-style:italic">
                  <span>Videopaket ({{ contract.videoCount10min }} Stück · inklusive)</span>
                  <span style="text-decoration:line-through;opacity:.5">{{ fmt(b2bVideoBase) }}</span>
                </div>
                <div class="npf-b2b-sum-row text-warning" v-if="(b2bImageNR + b2bVideoNR) > 0">
                  <span>NR-Zuschlag Bild-/Videorechte</span>
                  <span>+ {{ fmt(b2bImageNR + b2bVideoNR) }}</span>
                </div>
                <div class="npf-b2b-sum-total">
                  <span>Gesamtpauschale (netto)</span>
                  <span>{{ fmt((contract.flatRate || 0)
                    + (contract.mediaIncluded ? 0 : b2bImageBase)
                    + (contract.mediaIncluded ? 0 : b2bVideoBase)
                    + b2bImageNR + b2bVideoNR) }}</span>
                </div>
              </div>
            </template>

          </template>

          <!-- Anzahlung · Zahlungsziel · Lieferzeit -->
          <div class="npf-grid-3">
            <div class="form-group">
              <label>Anzahlung (€)</label>
              <input v-model.number="contract.depositAmount" type="number" min="0" step="10" placeholder="0" />
              <div v-if="autoDeposit !== null && autoDeposit !== contract.depositAmount" class="npf-autofill-row">
                <span>{{ depositRate }}% = {{ fmt(autoDeposit) }}</span>
                <button class="npf-autofill-btn" @click.prevent="contract.depositAmount = autoDeposit">↩</button>
              </div>
            </div>
            <div class="form-group">
              <label>Zahlungsziel (Tage)</label>
              <input v-model.number="contract.paymentDueDays" type="number" min="7" max="60" step="7" placeholder="14" />
            </div>
            <div class="form-group">
              <label>Lieferzeit (Wochen)</label>
              <input v-model="contract.deliveryWeeks" type="text" placeholder="4–8" />
            </div>
          </div>

        </div><!-- /npf-main -->

        <!-- ─── Rechte Spalte: Notizen ──────────────────────────────── -->
        <div class="npf-aside">
          <div class="form-group npf-notes-group">
            <label>Notizen &amp; Besonderheiten</label>
            <textarea v-model="form.notes"
              placeholder="Familiäre Zusammenhänge, besondere Wünsche, Hinweise zum Kunden, Parksituation, Ansprechpartner vor Ort…" />
          </div>
        </div>

      </div><!-- /npf-layout -->
      </fieldset>
    </div><!-- /npf-body -->

    <!-- ── Footer ── -->
    <div class="npf-footer">
      <button class="btn btn-secondary" @click="$emit('cancel')">
        {{ locked ? 'Schließen' : 'Abbrechen' }}
      </button>
      <button v-if="!locked" class="btn btn-primary" @click="submit" :disabled="saving">
        {{ saving ? '⏳ Speichern…' : mode === 'create' ? 'Auftrag anlegen → Auftragsseite' : '💾 Speichern' }}
      </button>
    </div>

  </div>
</template>

<script>
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'

export default {
  name: 'NewProjectForm',
  props: {
    mode:         { type: String,  default: 'create' },
    customerName: { type: String,  default: '' },
    initialData:  { type: Object,  default: null },
    settings:     { type: Object,  default: null },
    saving:       { type: Boolean, default: false },
    locked:       { type: Boolean, default: false },
  },
  emits: ['save', 'cancel', 'update:live'],
  setup(props, { emit }) {
    const nameInput = ref(null)

    const categories = ['Hochzeit','Portrait','Event','Produktfotografie','Familienshooting','Businessfotografie','Sonstiges']
    const statuses   = ['Anfrage','Aktiv','Abgeliefert','Abgeschlossen','Storniert']

    const error           = ref('')
    const deliveryAutoSet = ref(false)

    // ── Project fields ──────────────────────────────────────────────────────
    const locationCategories = [
      'Trauung', 'Kirche', 'Standesamt', 'Hotel', 'Feier', 'Getting Ready',
      'Studio', 'Outdoor', 'Sonstiges'
    ]

    const form = reactive({
      projectName: '', category: '', status: 'Anfrage',
      inquiryDate: new Date().toISOString().slice(0, 10),
      booking: '', bookingTime: '', bookingDuration: '', bookingLabel: '',
      shootingDates: [],   // [{ id, date, time, label }] — weitere Termine nach Haupt-Termin
      deliveryDate: '', location: '',
      locations: [],   // [{ id, name, category }]
      skipQuote: true,   // Standard: kein Angebot (direkter Auftrag)
      fotografie: false, videografie: false, glueckwunschkarten: false,
      gettingReady: false, gettingReadyEr: false, gettingReadySie: false, gettingReadyBeide: false,
      budget: { estimatedAmount: 0, currency: 'EUR' },
      bookingInfo: '', notes: '', description: '', team: [], documents: [],
    })

    function addLocation() {
      form.locations.push({ id: 'loc_' + Date.now(), name: '', category: '' })
    }
    function removeLocation(idx) {
      form.locations.splice(idx, 1)
    }

    function addShootingDate() {
      form.shootingDates.push({ id: 'sd_' + Date.now(), date: '', time: '', label: '' })
    }
    function removeShootingDate(idx) {
      form.shootingDates.splice(idx, 1)
    }

    // ── Contract fields ─────────────────────────────────────────────────────
    const contract = reactive({
      occasion: '', pricingModel: 'hourly',
      hourlyRate: null, estimatedHours: null,   // Fallback / Rückwärtskompatibilität
      // Privat — aufgeschlüsselt nach Leistung
      hourlyRatePhotoPrivat: null,
      hourlyRateVideoPrivat: null,
      estimatedHoursPhoto:   null,
      estimatedHoursVideo:   null,
      imageCountPrivat:      0,
      imagePricePrivat:      null,
      flatRate: null, flatRateIncludes: '', customPriceText: '',
      depositAmount: null, paymentDueDays: 14, deliveryWeeks: '4–8',
      publicationPermission: 'conditional', clientIsCompany: false,
      usageType: 'private', commercialPurpose: '',
      usageLicenseDuration: 'unbegrenzt', usageLicenseScope: 'national',
      usageLicenseSurchargePercent: 0,
      // Nutzungsrechts-Kalkulator (designaustria-Modell, multiplikativ)
      usageRights: {
        enabled:     false,   // Matrix aktiv?
        thema:       0.75,    // Themenspezifisch
        bedeutung:   1.0,     // Bedeutungsspezifisch
        gebiet:      1.0,     // Kommunikations-/Nutzungsgebiet
        zeitraum:    1.0,     // Einsatz-/Nutzungszeitraum
        nutzungsart: 1.0,     // Nutzungsart
        auftragsart: 1.5,     // Auftragsart
      },
      usageRightsSurcharge: 0, // berechneter Zuschlag in €
      equipmentDamageClause: false, selectedSpecialClauses: [], customSpecialClauses: '',
      // ── B2B-Kalkulation ─────────────────────────────────────────────────
      hourlyRatePhotoB2B: null,
      hourlyRatePhotoSetup: null,   // Rüstzeit Foto B2B
      hourlyRateVideoB2B: null,
      hourlyRateVideoSetup: null,   // Rüstzeit Video B2B
      photoPhases: { vorbereitung: 0, abstimmung: 0, shooting: 0, bearbeitung: 0 },
      videoPhases: { vorbereitung: 0, abstimmung: 0, dreh: 0, schnitt: 0 },
      imageCountB2B:   0,
      videoCount10min: 0,
      imagePriceB2B:   null,
      videoPer10min:   null,
      mediaIncluded:   false,  // Bilder & Videos im Preis enthalten (B2B)
      // ── Simple NR ───────────────────────────────────────────────────────
      simpleNr: {
        categories: [],       // ['print','online','tv','pr']
        duration:   '1 Jahr', // '1 Jahr' | '2 Jahre' | 'unbegrenzt'
        scope:      'national', // 'regional' | 'national' | 'international'
      },
    })

    // ── Auto: Lieferdatum ───────────────────────────────────────────────────
    function onBookingDateChange() {
      if (!form.booking) return
      const d = new Date(form.booking)
      d.setDate(d.getDate() + 42)
      form.deliveryDate = d.toISOString().slice(0, 10)
      deliveryAutoSet.value = true
    }

    // Auto-Generierung Anlass deaktiviert — Nutzer befüllt das Feld selbst

    // ── Populate (edit mode) ────────────────────────────────────────────────
    function populate() {
      const d = props.initialData
      if (!d) return
      const pf = ['projectName','category','status','inquiryDate','booking','bookingTime',
        'bookingDuration','bookingLabel','shootingDates','deliveryDate','location','locations','skipQuote',
        'fotografie','videografie',
        'glueckwunschkarten','gettingReady','gettingReadyEr','gettingReadySie',
        'gettingReadyBeide','bookingInfo','notes','description']
      pf.forEach(k => { if (d[k] !== undefined) form[k] = d[k] })
      if (d.budget) form.budget.estimatedAmount = d.budget.estimatedAmount || 0
      if (d.booking)      form.booking      = (d.booking      || '').slice(0, 10)
      if (d.deliveryDate) form.deliveryDate = (d.deliveryDate || '').slice(0, 10)
      if (d.inquiryDate)  form.inquiryDate  = (d.inquiryDate  || '').slice(0, 10)
      const cd = d.contractData || {}
      const cf = ['occasion','pricingModel','hourlyRate','estimatedHours','flatRate',
        'flatRateIncludes','customPriceText','depositAmount','paymentDueDays','deliveryWeeks',
        'publicationPermission','clientIsCompany','usageType','commercialPurpose',
        'usageLicenseDuration','usageLicenseScope','usageLicenseSurchargePercent',
        'equipmentDamageClause','selectedSpecialClauses','customSpecialClauses',
        'usageRightsSurcharge',
        'hourlyRatePhotoB2B','hourlyRatePhotoSetup','hourlyRateVideoB2B','hourlyRateVideoSetup',
        'hourlyRatePhotoPrivat','hourlyRateVideoPrivat',
        'estimatedHoursPhoto','estimatedHoursVideo','imageCountPrivat','imagePricePrivat',
        'imageCountB2B','videoCount10min','imagePriceB2B','videoPer10min','mediaIncluded']
      cf.forEach(k => { if (cd[k] !== undefined) contract[k] = cd[k] })
      if (cd.usageRights)  Object.assign(contract.usageRights,  cd.usageRights)
      if (cd.photoPhases)  Object.assign(contract.photoPhases,  cd.photoPhases)
      if (cd.videoPhases)  Object.assign(contract.videoPhases,  cd.videoPhases)
      if (cd.simpleNr)     Object.assign(contract.simpleNr,     cd.simpleNr)
      if (contract.occasion) form.projectName = contract.occasion
    }

    onMounted(() => {
      populate()
      const bt = props.settings?.bookingTerms
      if (contract.hourlyRate === null) {
        const rate = bt?.defaultHourlyRate
        if (rate != null) contract.hourlyRate = rate
      }
      // Privat-Stundensätze + Bildpreis vorbelegen
      if (contract.hourlyRatePhotoPrivat === null && bt?.hourlyRatePhotoPrivat != null)
        contract.hourlyRatePhotoPrivat = bt.hourlyRatePhotoPrivat
      if (contract.hourlyRateVideoPrivat === null && bt?.hourlyRateVideoPrivat != null)
        contract.hourlyRateVideoPrivat = bt.hourlyRateVideoPrivat
      if (contract.imagePricePrivat === null && bt?.imagePricePrivat != null)
        contract.imagePricePrivat = bt.imagePricePrivat
      // B2B-Stundensätze + Preise vorbelegen
      if (contract.hourlyRatePhotoB2B === null && bt?.hourlyRatePhotoB2B != null)
        contract.hourlyRatePhotoB2B = bt.hourlyRatePhotoB2B
      if (contract.hourlyRatePhotoSetup === null && bt?.hourlyRatePhotoSetup != null)
        contract.hourlyRatePhotoSetup = bt.hourlyRatePhotoSetup
      if (contract.hourlyRateVideoB2B === null && bt?.hourlyRateVideoB2B != null)
        contract.hourlyRateVideoB2B = bt.hourlyRateVideoB2B
      if (contract.hourlyRateVideoSetup === null && bt?.hourlyRateVideoSetup != null)
        contract.hourlyRateVideoSetup = bt.hourlyRateVideoSetup
      if (contract.imagePriceB2B === null && bt?.imagePriceB2B != null)
        contract.imagePriceB2B = bt.imagePriceB2B
      if (contract.videoPer10min === null && bt?.videoPer10min != null)
        contract.videoPer10min = bt.videoPer10min
      nextTick(() => nameInput.value?.focus())
    })

    watch(() => props.settings?.bookingTerms, (bt) => {
      if (!bt) return
      if (contract.hourlyRate === null && bt.defaultHourlyRate != null)
        contract.hourlyRate = bt.defaultHourlyRate
      if (contract.hourlyRatePhotoPrivat === null && bt.hourlyRatePhotoPrivat != null)
        contract.hourlyRatePhotoPrivat = bt.hourlyRatePhotoPrivat
      if (contract.hourlyRateVideoPrivat === null && bt.hourlyRateVideoPrivat != null)
        contract.hourlyRateVideoPrivat = bt.hourlyRateVideoPrivat
      if (contract.imagePricePrivat === null && bt.imagePricePrivat != null)
        contract.imagePricePrivat = bt.imagePricePrivat
      if (contract.hourlyRatePhotoB2B === null && bt.hourlyRatePhotoB2B != null)
        contract.hourlyRatePhotoB2B = bt.hourlyRatePhotoB2B
      if (contract.hourlyRateVideoB2B === null && bt.hourlyRateVideoB2B != null)
        contract.hourlyRateVideoB2B = bt.hourlyRateVideoB2B
      if (contract.imagePriceB2B === null && bt.imagePriceB2B != null)
        contract.imagePriceB2B = bt.imagePriceB2B
      if (contract.videoPer10min === null && bt.videoPer10min != null)
        contract.videoPer10min = bt.videoPer10min
    }, { deep: true })

    // Live-Update: Hero-Banner spiegelt Formulardaten
    function emitLive() {
      emit('update:live', {
        projectName: contract.occasion || form.projectName,
        booking:     form.booking,
        bookingTime: form.bookingTime,
        location:    form.location,
      })
    }
    watch([() => contract.occasion, () => form.booking, () => form.bookingTime, () => form.location], emitLive)

    // ── Computed ────────────────────────────────────────────────────────────
    const depositRate = computed(() => props.settings?.bookingTerms?.depositRate ?? 20)

    // ── NR-Modus aus Settings ────────────────────────────────────────────
    const nrMode = computed(() =>
      props.settings?.bookingTerms?.usageRightsMode || 'simple'
    )

    // ── Simple NR — Zuschlagstabelle ─────────────────────────────────────
    const SIMPLE_NR_RATES = {
      // [Kategorie]: { [Laufzeit]: { [Scope]: Prozentzuschlag } }
      print:  { '1 Jahr': { regional: 15, national: 25, international: 40 },
                '2 Jahre': { regional: 22, national: 38, international: 60 },
                'unbegrenzt': { regional: 35, national: 55, international: 80 } },
      online: { '1 Jahr': { regional: 10, national: 20, international: 35 },
                '2 Jahre': { regional: 15, national: 30, international: 50 },
                'unbegrenzt': { regional: 25, national: 45, international: 65 } },
      tv:     { '1 Jahr': { regional: 30, national: 50, international: 80 },
                '2 Jahre': { regional: 45, national: 70, international: 110 },
                'unbegrenzt': { regional: 60, national: 100, international: 150 } },
      pr:     { '1 Jahr': { regional: 5,  national: 10, international: 18 },
                '2 Jahre': { regional: 8,  national: 15, international: 25 },
                'unbegrenzt': { regional: 12, national: 22, international: 35 } },
    }

    const simpleNrCategories = [
      { key: 'print',  icon: '🖨', label: 'Print / OOH',    desc: 'Anzeigen, Plakate, Kataloge',
        tooltip: 'Klassische Printwerbung: Zeitungsanzeigen, Plakate, Außenwerbung (Out-of-Home), Kataloge, Flyer, Verpackungen.' },
      { key: 'online', icon: '🌐', label: 'Online / Social', desc: 'Website, Social Media, Newsletter',
        tooltip: 'Digitale Nutzung: Unternehmenswebsite, Social-Media-Kanäle, Newsletter, Online-Werbeanzeigen, Präsentationen.' },
      { key: 'tv',     icon: '📺', label: 'TV / Video',      desc: 'Spots, Streaming, Kino',
        tooltip: 'Bewegtbild-Nutzung: TV-Werbespots, Streaming-Plattformen, Kino-Werbung, Video-on-Demand.' },
      { key: 'pr',     icon: '📰', label: 'PR / Redaktion',  desc: 'Presse, Jahresberichte',
        tooltip: 'Redaktionelle Nutzung: Pressemitteilungen, Jahresberichte, Geschäftsberichte, Mitarbeiterzeitschriften. Geringste Zuschläge da kein direkter Werbecharakter.' },
    ]

    const simpleNrPercent = computed(() => {
      if (!contract.usageRights?.enabled || nrMode.value !== 'simple') return 0
      if (!contract.simpleNr.categories.length) return 0
      const dur   = contract.simpleNr.duration
      const scope = contract.simpleNr.scope
      return contract.simpleNr.categories.reduce((sum, cat) => {
        return sum + (SIMPLE_NR_RATES[cat]?.[dur]?.[scope] ?? 0)
      }, 0)
    })

    function toggleSimpleNrCat(key) {
      const idx = contract.simpleNr.categories.indexOf(key)
      if (idx === -1) contract.simpleNr.categories.push(key)
      else contract.simpleNr.categories.splice(idx, 1)
    }

    // ── Nutzungsrechts-Faktor (muss VOR den B2B-Computeds stehen) ────────
    const usageMultiplier = computed(() => {
      if (!contract.clientIsCompany || !contract.usageRights.enabled) return 0
      const u = contract.usageRights
      return u.thema * u.bedeutung * u.gebiet * u.zeitraum * u.nutzungsart * u.auftragsart
    })

    // ── B2B-Phasenstunden Totals ─────────────────────────────────────────
    const photoHoursTotal = computed(() =>
      Object.values(contract.photoPhases).reduce((s, v) => s + (Number(v) || 0), 0)
    )
    const videoHoursTotal = computed(() =>
      Object.values(contract.videoPhases).reduce((s, v) => s + (Number(v) || 0), 0)
    )
    // Stunden-Summen — Rüstzeitsatz für Vorbereitung+Abstimmung, Hauptsatz für Shooting+Bearbeitung/Dreh+Schnitt
    const b2bPhotoNet = computed(() => {
      const setup = (contract.photoPhases.vorbereitung||0) + (contract.photoPhases.abstimmung||0)
      const main  = (contract.photoPhases.shooting||0)     + (contract.photoPhases.bearbeitung||0)
      return setup * (contract.hourlyRatePhotoSetup || 0) + main * (contract.hourlyRatePhotoB2B || 0)
    })
    const b2bVideoNet = computed(() => {
      const setup = (contract.videoPhases.vorbereitung||0) + (contract.videoPhases.abstimmung||0)
      const main  = (contract.videoPhases.dreh||0)         + (contract.videoPhases.schnitt||0)
      return setup * (contract.hourlyRateVideoSetup || 0) + main * (contract.hourlyRateVideoB2B || 0)
    })
    // Bild-/Video-Basissummen (ohne NR-Faktor)
    const b2bImageBase = computed(() =>
      (contract.imageCountB2B || 0) * (contract.imagePriceB2B || 0)
    )
    const b2bVideoBase = computed(() =>
      (contract.videoCount10min || 0) * (contract.videoPer10min || 0)
    )
    // NR-Zuschlag: Basis × NR-Faktor (additiv auf die Basis)
    // nrFactor: abstrakter Faktor für beide Modi
    // Simple: Prozentsatz / 100 → additiver Anteil auf Basis
    // designaustria: usageMultiplier direkt
    const nrFactor = computed(() => {
      if (!contract.usageRights?.enabled) return 0
      if (nrMode.value === 'simple') return simpleNrPercent.value / 100
      return usageMultiplier.value
    })
    const b2bImageNR = computed(() => b2bImageBase.value * nrFactor.value)
    const b2bVideoNR = computed(() => b2bVideoBase.value * nrFactor.value)
    // Gesamt je Sparte: Stunden + Basis + NR-Zuschlag
    const b2bPhotoTotal = computed(() =>
      // Wenn mediaIncluded: Bildpreis raus, NR-Zuschlag bleibt
      b2bPhotoNet.value + (contract.mediaIncluded ? 0 : b2bImageBase.value) + b2bImageNR.value
    )
    const b2bVideoTotal = computed(() =>
      // Wenn mediaIncluded: Videopreis raus, NR-Zuschlag bleibt
      b2bVideoNet.value + (contract.mediaIncluded ? 0 : b2bVideoBase.value) + b2bVideoNR.value
    )
    // Rückwärtskompatibilität (werden in return-Statement mitexportiert)
    const b2bImageNet        = b2bImageBase
    const b2bVideoProductNet = b2bVideoBase
    const b2bSubtotal = computed(() => {
      let total = 0
      if (contract.clientIsCompany && contract.pricingModel === 'hourly') {
        if (form.fotografie)  total += b2bPhotoTotal.value
        if (form.videografie) total += b2bVideoTotal.value
      }
      return total
    })

    // ── Privat-Stunden Computeds ─────────────────────────────────────────
    const privatPhotoNet = computed(() =>
      (contract.estimatedHoursPhoto || 0) * (contract.hourlyRatePhotoPrivat || 0)
    )
    const privatVideoNet = computed(() =>
      (contract.estimatedHoursVideo || 0) * (contract.hourlyRateVideoPrivat || 0)
    )
    const privatImageNet = computed(() => 0)  // Bilder im Stundensatz enthalten
    const privatHoursTotal = computed(() =>
      (contract.estimatedHoursPhoto || 0) + (contract.estimatedHoursVideo || 0)
    )
    const privatTotal = computed(() =>
      privatPhotoNet.value + privatVideoNet.value
      // privatImageNet entfernt: Bilder im Stundensatz enthalten
    )

    const autoBase = computed(() => {
      if (contract.clientIsCompany && contract.pricingModel === 'hourly') {
        const total = b2bSubtotal.value
        if (total > 0) return total
      }
      if (!contract.clientIsCompany && contract.pricingModel === 'hourly') {
        const total = privatTotal.value
        if (total > 0) return total
        // Fallback: altes einfaches hourlyRate × estimatedHours
        if (contract.hourlyRate && contract.estimatedHours)
          return contract.hourlyRate * contract.estimatedHours
      }
      if (contract.pricingModel === 'flat' && contract.flatRate)
        return contract.flatRate
      return null
    })

    // ── Nutzungsrechts-Kalkulator (designaustria-Modell, multiplikativ) ────
    // Formel: Nutzungshonorar = Gestaltungshonorar × Thema × Bedeutung
    //         × Gebiet × Zeitraum × Nutzungsart × Auftragsart
    // (usageMultiplier bereits oben deklariert)

    const usageSurchargeAbs = computed(() => {
      // Im B2B-Stunden-Modus ist der NR-Zuschlag bereits in b2bImageNR / b2bVideoNR
      // eingerechnet — hier darf er NICHT nochmal aufgeschlagen werden.
      if (contract.clientIsCompany && contract.pricingModel === 'hourly') return 0
      if (!autoBase.value || !usageMultiplier.value) return 0
      return Math.round(autoBase.value * usageMultiplier.value * 100) / 100
    })

    const autoTotal = computed(() => {
      if (!autoBase.value) return null
      return autoBase.value + usageSurchargeAbs.value
    })

    const autoDeposit = computed(() => {
      if (!autoTotal.value) return null
      return Math.round(autoTotal.value * depositRate.value / 100 * 100) / 100
    })

    function fmt(n) {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)
    }

    // ── Submit ──────────────────────────────────────────────────────────────
    function submit() {
      error.value = ''
      if (!form.category) { error.value = 'Kategorie erforderlich'; return }
      if (!form.booking)  { error.value = 'Buchungsdatum erforderlich'; return }
      form.projectName = contract.occasion || form.projectName || ''
      if (!form.projectName.trim()) { error.value = 'Bitte Anlass / Auftragsbezeichnung eingeben'; return }
      if (!form.budget.estimatedAmount && autoTotal.value) form.budget.estimatedAmount = autoTotal.value
      else if (!form.budget.estimatedAmount && autoBase.value) form.budget.estimatedAmount = autoBase.value
      // NR-Zuschlag korrekt speichern:
      // B2B+Stunden: steckt in b2bImageNR + b2bVideoNR (usageSurchargeAbs ist dort 0)
      // Alle anderen Modi: usageSurchargeAbs
      contract.usageRightsSurcharge = (contract.clientIsCompany && contract.pricingModel === 'hourly')
        ? (b2bImageNR.value + b2bVideoNR.value)
        : usageSurchargeAbs.value
      // Rückwärtskompatibilität: location als erster Locations-Eintrag oder leer
      if (form.locations.length > 0 && !form.location) {
        form.location = form.locations.map(l => l.name).filter(Boolean).join(', ')
      }
      emit('save', { project: { ...form }, contractData: { ...contract } })
    }

    return {
      nameInput, form, contract, categories, statuses,
      locationCategories, addLocation, removeLocation,
      error, deliveryAutoSet,
      onBookingDateChange, depositRate, autoBase, autoDeposit, fmt, submit,
      addShootingDate, removeShootingDate,
      usageSurchargeAbs, autoTotal, usageMultiplier,
      photoHoursTotal, videoHoursTotal, b2bPhotoNet, b2bVideoNet,
      b2bImageNet, b2bVideoProductNet, b2bSubtotal,
      b2bPhotoTotal, b2bVideoTotal,
      b2bImageBase, b2bVideoBase, b2bImageNR, b2bVideoNR, nrFactor,
      nrMode, simpleNrPercent, simpleNrCategories, toggleSimpleNrCat,
      privatPhotoNet, privatVideoNet, privatImageNet, privatHoursTotal, privatTotal,
    }
  }
}
</script>

<style scoped>
.npf {
  background: var(--surface);
  border-radius: var(--radius-xl, 14px);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: 0 0 0 3px rgba(79,70,229,.07), 0 6px 24px rgba(0,0,0,.09);
}

/* ── Header ── */
.npf-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 16px 22px 14px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
}
.npf-header-left  { flex: 1; min-width: 0; }
.npf-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.npf-title { font-size: 15px; font-weight: 700; }
.npf-sub   { font-size: 12px; opacity: .72; margin-top: 3px; }
.npf-error { font-size: 11.5px; color: #fca5a5; background: rgba(239,68,68,.18); border-radius: 6px; padding: 3px 10px; white-space: nowrap; }
.npf-x {
  background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.25);
  color: white; width: 28px; height: 28px; border-radius: 50%;
  cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background .12s;
}
.npf-x:hover { background: rgba(255,255,255,.28); }

/* ── Body ── */
.npf-body { /* max-height removed — panel context fills naturally */ }

/* ── 2-Spalten-Layout ── */
.npf-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  align-items: stretch;
}
.npf-main {
  padding: 20px 22px;
  display: flex; flex-direction: column; gap: 16px;
  border-right: 1px solid var(--border);
}
.npf-aside {
  padding: 20px 20px;
  background: var(--bg-alt, #f8fafc);
  display: flex; flex-direction: column;
}
.npf-notes-group {
  flex: 1; display: flex; flex-direction: column; gap: 6px;
}
.npf-notes-group textarea {
  flex: 1; min-height: 180px; resize: none;
  font-size: 13px; line-height: 1.6; color: var(--text-2);
}

/* ── Trennlinie ── */
.npf-divider {
  display: flex; align-items: center; gap: 10px;
  color: var(--text-muted); font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .8px;
  margin: 2px 0 -2px;
}
.npf-divider::before,
.npf-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

/* ── Grids ── */
.npf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.npf-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.npf-chip-row { display: flex; gap: 7px; flex-wrap: wrap; }

/* ── Chips ── */
.npf-service-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.npf-svc-chip {
  padding: 6px 13px; border-radius: 99px;
  font-size: 12.5px; font-weight: 600;
  border: 1.5px solid var(--border); background: var(--surface); color: var(--text-2);
  cursor: pointer; transition: all .12s;
}
.npf-svc-chip.active { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
.npf-svc-chip:hover  { border-color: var(--primary); }

/* ── Honorar helpers ── */
.inp-unit-wrap { display: flex; align-items: center; }
.inp-unit-wrap input { flex: 1; border-radius: var(--radius,6px) 0 0 var(--radius,6px) !important; }
.inp-unit { padding: 0 10px; background: var(--bg-alt); border: 1px solid var(--border); border-left: none; border-radius: 0 var(--radius,6px) var(--radius,6px) 0; font-size: 12px; color: var(--text-muted); white-space: nowrap; display:flex; align-items:center; height:36px; }
.npf-computed       { padding: 9px 12px; background: var(--primary-light); border-radius: var(--radius,6px); font-weight: 700; font-size: 14px; color: var(--primary); }
.npf-computed-empty { padding: 9px 12px; background: var(--bg-alt); border-radius: var(--radius,6px); border: 1px dashed var(--border); font-size: 12px; color: var(--text-muted); }
.npf-autofill-row { display: flex; align-items: center; gap: 8px; margin-top: 5px; font-size: 12px; color: var(--text-muted); }
.npf-autofill-btn { background: none; border: 1px dashed rgba(79,70,229,.4); border-radius: var(--radius,6px); padding: 2px 8px; font-size: 11px; cursor: pointer; color: var(--primary); }
.npf-autofill-btn:hover { background: var(--primary-light); }

/* ── Auto tag ── */
.npf-auto-tag { font-size: 10px; font-weight: 600; background: #fef3c7; color: #92400e; border-radius: 99px; padding: 1px 7px; margin-left: 6px; vertical-align: middle; }

/* Responsive */
@media (max-width: 720px) {
  .npf-layout { grid-template-columns: 1fr; }
  .npf-main  { border-right: none; border-bottom: 1px solid var(--border); }
  .npf-aside { background: var(--surface); }
  .npf-notes-group textarea { min-height: 100px; }
}
@media (max-width: 860px) { .npf-grid-3 { grid-template-columns: 1fr 1fr; } }
@media (max-width: 580px) {
  .npf-grid-2, .npf-grid-3 { grid-template-columns: 1fr; }
  .npf-main  { padding: 14px 14px; }
  .npf-aside { padding: 14px 14px; }
  .npf-header { padding: 13px 14px 11px; }
  .npf-footer { padding: 12px 14px; }
}

/* ── Name input ── */
.npf-input-lg { font-size: 15px !important; font-weight: 600 !important; padding: 10px 12px !important; }

/* ── Footer ── */
.npf-footer {
  display: flex; justify-content: flex-end; gap: 10px; align-items: center;
  padding: 13px 22px;
  border-top: 1px solid var(--border);
  background: var(--bg-alt, #f8fafc);
}

/* ── Anfrage gesperrt Banner ── */
.npf-locked-banner {
  margin: 0 18px 0;
  padding: 10px 14px;
  background: var(--warning-bg, #fffbeb);
  border: 1px solid var(--warning-border, #fcd34d);
  border-radius: var(--radius);
  font-size: 12.5px;
  color: var(--warning, #92400e);
  line-height: 1.5;
}
/* Dim locked form fields */
fieldset[disabled] {
  opacity: .65;
  pointer-events: none;
}


/* ── B2B Phasen-Kalkulator ── */
.npf-b2b-phases { margin-bottom: 4px; }
.npf-b2b-rate-row {
  display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
}
.npf-b2b-rate-row label { font-size: 12px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
.npf-phase-grid { display: flex; flex-direction: column; gap: 0; }
.npf-phase-row {
  display: grid; grid-template-columns: 1fr 110px 90px;
  align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 6px;
  transition: background .1s;
}
.npf-phase-row:hover { background: var(--bg-alt); }
.npf-phase-row:last-of-type { border-bottom: 1px solid var(--border); margin-bottom: 4px; }
.npf-phase-info { display: flex; flex-direction: column; }
.npf-phase-label { font-size: 13px; font-weight: 600; color: var(--text); }
.npf-phase-hint  { font-size: 10.5px; color: var(--text-muted); font-style: italic; }
.npf-phase-net   { font-size: 12px; font-weight: 700; color: var(--primary); text-align: right; font-variant-numeric: tabular-nums; }
.npf-phase-total {
  display: grid; grid-template-columns: 1fr 110px 90px;
  align-items: center; gap: 8px;
  padding: 7px 10px;
  background: var(--primary-light); border-radius: 6px; margin-top: 4px;
}
.npf-phase-total span:first-child { font-size: 12px; font-weight: 700; color: var(--primary); }
.npf-phase-total-h   { font-size: 12px; font-weight: 700; color: var(--primary); text-align: right; }
.npf-phase-total-val { font-size: 13px; font-weight: 800; color: var(--primary); text-align: right; font-variant-numeric: tabular-nums; }
/* B2B Gesamtübersicht */
.npf-b2b-summary {
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 8px; padding: 12px 14px; margin-top: 10px;
  display: flex; flex-direction: column; gap: 5px;
}
.npf-b2b-sum-row {
  display: flex; justify-content: space-between;
  font-size: 12.5px; color: var(--text-muted);
}
.npf-b2b-sum-total {
  display: flex; justify-content: space-between;
  border-top: 1.5px solid var(--border); padding-top: 7px; margin-top: 3px;
  font-size: 14px; font-weight: 800; color: var(--text);
}

.npf-phase-row.npf-phase-setup { background: #fafaf0; border-color: #e5e7b0; }
.npf-phase-net--setup { color: #854d0e; }
.npf-flat-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; font-style: italic; }

/* ── Simple NR Chips ── */
.npf-simple-nr-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 5px;
}
.npf-snr-chip {
  display: flex; flex-direction: column; gap: 2px;
  border: 1.5px solid var(--border); border-radius: 8px;
  padding: 9px 11px; cursor: pointer; position: relative;
  background: var(--surface); transition: all .13s;
}
.npf-snr-chip:hover  { border-color: var(--primary); background: var(--primary-light); }
.npf-snr-chip.active { border-color: var(--primary); background: var(--primary-light); }
.npf-snr-icon { font-size: 17px; margin-bottom: 2px; }
.npf-snr-name { font-size: 12.5px; font-weight: 700; color: var(--text); }
.npf-snr-desc { font-size: 11px; color: var(--text-muted); }
.npf-simple-nr-summary {
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 7px; padding: 9px 12px; margin-top: 8px;
  display: flex; flex-direction: column; gap: 4px;
}
.npf-snr-sum-row {
  display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-muted);
}

/* ── B2B-Phasen-Kalkulator ── */
.npf-b2b-phases { margin-bottom: 4px; }
.npf-b2b-rate-row {
  display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
  font-size: 12.5px; font-weight: 600; color: var(--text);
}
.npf-phase-grid { display: flex; flex-direction: column; gap: 6px; }
.npf-phase-row {
  display: grid; grid-template-columns: 1fr 110px 100px;
  align-items: center; gap: 8px;
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 7px; padding: 7px 10px;
}
.npf-phase-info { display: flex; flex-direction: column; gap: 1px; }
.npf-phase-label { font-size: 12.5px; font-weight: 600; color: var(--text); }
.npf-phase-hint  { font-size: 10.5px; color: var(--text-muted); font-style: italic; }
.npf-phase-net   { font-size: 12px; font-weight: 700; color: var(--primary); text-align: right; }
.npf-phase-total {
  display: grid; grid-template-columns: 1fr 110px 100px;
  align-items: center; gap: 8px;
  border-top: 2px solid var(--border); padding: 6px 10px 2px;
  font-size: 12.5px; font-weight: 700; color: var(--text);
}
.npf-phase-total-h   { font-size: 12px; color: var(--text-muted); text-align: center; }
.npf-phase-total-val { font-size: 13px; font-weight: 800; color: var(--primary); text-align: right; }
/* B2B Gesamtübersicht */
.npf-b2b-summary {
  background: var(--bg-alt); border: 1.5px solid var(--primary-light);
  border-radius: 9px; padding: 12px 14px; margin-top: 10px;
  display: flex; flex-direction: column; gap: 5px;
}
.npf-b2b-sum-row {
  display: flex; justify-content: space-between; font-size: 12.5px;
  color: var(--text-muted);
}
.npf-b2b-sum-total {
  display: flex; justify-content: space-between;
  border-top: 1px solid var(--border); padding-top: 7px; margin-top: 3px;
  font-size: 14px; font-weight: 800; color: var(--text);
}
/* Unterblock Bilder/Videos + Formel */
.npf-b2b-sub-block {
  background: rgba(99,102,241,.04); border: 1px dashed rgba(99,102,241,.2);
  border-radius: 7px; padding: 10px 12px; margin-top: 8px;
}
.npf-b2b-formula {
  margin-top: 8px; padding-top: 8px;
  border-top: 1px solid var(--border);
}
.npf-formula-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text-muted); display: block; margin-bottom: 5px;
}
.npf-formula-lines { display: flex; flex-direction: column; gap: 3px; }
.npf-formula-line {
  display: grid; grid-template-columns: 110px 1fr 90px;
  align-items: center; gap: 6px; font-size: 12px; padding: 3px 0;
}
.npf-fl-desc { font-weight: 600; color: var(--text); }
.npf-fl-calc { color: var(--text-muted); font-family: monospace; font-size: 11px; }
.npf-fl-val  { text-align: right; font-weight: 700; color: var(--text); }
.npf-formula-line--nr .npf-fl-val { color: #b45309; }
.npf-formula-total {
  border-top: 1px solid var(--border); margin-top: 3px; padding-top: 5px;
}
.npf-formula-total .npf-fl-desc { color: var(--primary); font-weight: 700; }
.npf-formula-total .npf-fl-val  { color: var(--primary); font-size: 13px; font-weight: 800; }

/* ── Nutzungsrechts-Kalkulator (designaustria-Modell) ── */
.npf-toggle-hint { font-size: 10px; color: var(--text-muted); margin-left: 4px; }
.npf-rate-hint { font-size: 10px; color: var(--text-muted); font-weight: 400; }
.npf-checkbox-label { display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; }
.npf-checkbox-label input[type="checkbox"] { width:14px; height:14px; cursor:pointer; flex-shrink:0; }
.npf-media-included-toggle .npf-usage-toggle { border-color: rgba(5,150,105,.3); background: rgba(5,150,105,.04); }
.npf-media-included-toggle .npf-usage-toggle.active { background: rgba(5,150,105,.08); border-color: rgba(5,150,105,.4); }

.npf-usage-toggle {
  display: inline-flex; align-items: center; gap: 8px;
  cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text);
  padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;
  background: var(--surface); transition: all .15s; user-select: none;
}
.npf-usage-toggle:hover  { border-color: var(--primary); background: var(--primary-light); }
.npf-usage-toggle.active { border-color: var(--primary); background: var(--primary-light); }
.npf-usage-toggle-box { font-size: 15px; }
.npf-usage-method-hint {
  font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 4px;
}
.npf-usage-badge {
  font-size: 11px; font-weight: 700; padding: 2px 9px;
  background: #fef3c7; color: #92400e;
  border: 1px solid #fcd34d; border-radius: 99px; margin-left: 4px;
}
.npf-usage-group-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .7px; color: var(--text-muted);
  padding: 8px 0 4px; margin-top: 4px;
  border-bottom: 1px solid var(--border); margin-bottom: 10px;
}
/* Faktor-Label mit Info-Icon */
.npf-usage-factor-label {
  display: flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600;
}
.npf-info-icon {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--primary-light); color: var(--primary);
  font-size: 10px; font-weight: 700; cursor: help;
  font-style: normal; flex-shrink: 0;
}
.npf-info-icon:hover .npf-tooltip { opacity: 1; pointer-events: auto; transform: translateY(0); }
.npf-tooltip {
  position: absolute; left: 50%; top: calc(100% + 6px);
  transform: translateX(-50%) translateY(-4px);
  background: #1e293b; color: #f1f5f9;
  border-radius: 8px; padding: 10px 13px;
  font-size: 12px; font-weight: 400; line-height: 1.6;
  width: 260px; z-index: 9999;
  opacity: 0; pointer-events: none;
  transition: opacity .18s, transform .18s;
  box-shadow: 0 8px 24px rgba(0,0,0,.2);
  white-space: normal; text-align: left;
}
.npf-tooltip::before {
  content: ''; position: absolute; top: -5px; left: 50%; transform: translateX(-50%);
  border: 5px solid transparent; border-top: none;
  border-bottom-color: #1e293b;
}
/* Faktor-Chips */
.npf-factor-chips {
  display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;
}
.npf-fchip {
  display: flex; flex-direction: column; align-items: center;
  border: 1.5px solid var(--border); border-radius: 7px;
  padding: 5px 9px; cursor: pointer; min-width: 72px;
  background: var(--surface); transition: all .13s; user-select: none;
}
.npf-fchip:hover  { border-color: var(--primary); background: var(--primary-light); }
.npf-fchip.active { border-color: var(--primary); background: var(--primary-light); }
.npf-fchip-factor {
  font-size: 13px; font-weight: 800; color: var(--primary);
  font-variant-numeric: tabular-nums;
}
.npf-fchip-label  { font-size: 10.5px; color: var(--text-muted); text-align: center; }
/* Zusammenfassung */
.npf-usage-summary {
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 8px; padding: 12px 14px; margin-top: 8px;
  display: flex; flex-direction: column; gap: 6px;
}
.npf-usage-sum-row {
  display: flex; justify-content: space-between; align-items: flex-start;
  font-size: 13px; color: var(--text-muted);
}
.npf-usage-sum-formula {
  font-size: 11px; font-family: monospace; flex-wrap: wrap; gap: 4px;
}
.npf-usage-factor-val { color: var(--text); text-align: right; }
.npf-usage-sum-total {
  border-top: 1px solid var(--border); padding-top: 6px; margin-top: 2px;
  font-weight: 700; font-size: 14px; color: var(--text);
}
.text-warning { color: #b45309; }

/* ── Multi-Shooting-Termine ── */
.npf-shoot-row {
  display: flex; gap: 6px; align-items: center; margin-bottom: 6px;
}
.npf-shoot-primary { background: var(--primary-light, #ede9fe); border-radius: 6px; padding: 4px 6px; }
.npf-shoot-badge {
  flex-shrink: 0; font-size: 10px; font-weight: 700; padding: 2px 7px;
  background: var(--primary); color: #fff; border-radius: 99px; white-space: nowrap;
}
.npf-shoot-num {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
  background: var(--bg-alt); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: var(--text-muted);
}
.npf-shoot-date  { flex: 0 0 140px; font-size: 13px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }
.npf-shoot-time  { flex: 0 0 90px;  font-size: 13px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }
.npf-shoot-label { flex: 1;         font-size: 13px; padding: 5px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }

/* ── Multi-Location ── */
.npf-loc-empty {
  font-size: 12px; color: var(--text-muted); font-style: italic;
  padding: 6px 0;
}
.npf-loc-row {
  display: flex; gap: 6px; align-items: center; margin-bottom: 6px;
}
.npf-loc-cat {
  flex: 0 0 140px; font-size: 12px; padding: 5px 8px;
  border: 1px solid var(--border); border-radius: 6px;
  background: var(--surface); color: var(--text);
}
.npf-loc-name {
  flex: 1; font-size: 13px; padding: 5px 10px;
  border: 1px solid var(--border); border-radius: 6px;
  background: var(--surface); color: var(--text);
}
.npf-loc-del {
  flex-shrink: 0; width: 26px; height: 26px;
  border: 1px solid var(--border); border-radius: 6px;
  background: none; color: var(--text-muted); cursor: pointer; font-size: 11px;
}
.npf-loc-del:hover { background: var(--danger-light, #fee2e2); color: var(--danger, #dc2626); }
.npf-loc-add-btn {
  font-size: 11px; padding: 2px 8px; border-radius: 6px;
  border: 1px solid var(--primary); background: none;
  color: var(--primary); cursor: pointer; font-weight: 600;
}
.npf-loc-add-btn:hover { background: var(--primary-light); }
.npf-skip-quote-row {
  display: flex; align-items: center; gap: 12px; margin-top: 6px; flex-wrap: wrap;
}
.npf-skip-quote-hint {
  font-size: 12px; color: var(--text-muted); font-style: italic;
}

</style>
