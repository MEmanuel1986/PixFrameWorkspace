<template>
  <div class="settings-page">

    <!-- ── Tab Bar (gruppiert) ── -->
    <div class="settings-tabbar">
      <nav class="settings-nav">

        <!-- Direkte Tabs (immer sichtbar) -->
        <template v-for="item in navItems" :key="item.id || item.group">

          <!-- Gruppe mit Dropdown -->
          <div v-if="item.children" class="s-group"
            :class="{ 'group-active': item.children.some(c => c.id === activeTab) }"
            @mouseenter="openGroup = item.group"
            @mouseleave="openGroup = null"
            @click="openGroup = openGroup === item.group ? null : item.group">

            <button class="s-tab s-group-btn"
              :class="{ active: item.children.some(c => c.id === activeTab) }">
              <span>{{ item.icon }}</span>
              <span>{{ item.label }}</span>
              <span v-if="item.children.some(c => c.id === activeTab)" class="s-active-child">
                · {{ item.children.find(c => c.id === activeTab)?.label }}
              </span>
              <span class="s-group-arrow" :class="{ open: openGroup === item.group }">›</span>
            </button>

            <!-- Dropdown -->
            <div v-show="openGroup === item.group" class="s-dropdown">
              <button v-for="child in item.children" :key="child.id"
                class="s-dropdown-item"
                :class="{ active: activeTab === child.id, disabled: child.disabled }"
                :disabled="child.disabled"
                @click.stop="selectTab(child.id)">
                <span class="s-dd-icon">{{ child.icon }}</span>
                <span>{{ child.label }}</span>
                <span v-if="child.count" class="s-tab-badge">{{ child.count }}</span>
              </button>
            </div>
          </div>

          <!-- Einfacher Tab -->
          <button v-else
            class="s-tab"
            :class="{ active: activeTab === item.id }"
            @click="selectTab(item.id)">
            <span>{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.count" class="s-tab-badge">{{ item.count }}</span>
          </button>

        </template>
      </nav>

      <transition name="fade-in">
        <div v-if="isSettingsTab" class="save-zone">
          <transition name="fade-in">
            <span v-if="saved" class="saved-msg">✓ Gespeichert</span>
          </transition>
          <button class="btn btn-primary btn-sm" :disabled="saving" @click="saveAll">
            {{ saving ? 'Speichern…' : 'Speichern' }}
          </button>
        </div>
      </transition>
    </div>

    <!-- ── Body ── -->
    <div class="settings-body">

      <!-- ════════════════════════════════
           Unternehmen
      ════════════════════════════════ -->
      <div v-if="activeTab === 'company'" class="s-content">

        <!-- Studio-Identität -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">Studio-Identität</span>
            <span class="s-card-sub">Name und Logo erscheinen auf Rechnungen und Angeboten</span>
          </div>
          <div class="s-card-body">
            <div class="logo-row">
              <div class="logo-drop"
                :class="{ over: dragOver, filled: previewUrl }"
                @click="triggerFileInput"
                @dragover.prevent="dragOver = true"
                @dragleave="dragOver = false"
                @drop.prevent="onDrop"
                :title="previewUrl ? 'Klicken zum Ersetzen' : 'Logo hier ablegen oder klicken'"
              >
                <img v-if="previewUrl" :src="previewUrl" class="logo-img" alt="Logo" />
                <div v-else class="logo-placeholder">
                  <svg viewBox="0 0 40 40" fill="none" width="26" height="26">
                    <rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" stroke-width="1.6"/>
                    <circle cx="14" cy="18" r="3" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M4 27l8-6 6 5 5-4 9 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>Logo</span>
                  <span class="logo-fmt">PNG · JPG · SVG</span>
                </div>
                <input ref="fileInput" type="file" accept=".png,.jpg,.jpeg,.svg,.webp" style="display:none" @change="onFileSelected" />
              </div>
              <div class="logo-fields">
                <div class="fg">
                  <label>Studioname / Firmenname *</label>
                  <input v-model="form.company.name" type="text" placeholder="Mustermann Photography" class="input-lg" />
                </div>
                <div class="fg-row" style="margin-top:10px">
                  <div class="fg">
                    <label>Inhaber/in</label>
                    <input v-model="form.company.owner" type="text" placeholder="Max Mustermann" />
                  </div>
                  <div class="fg">
                    <label>Geschäftsform</label>
                    <select v-model="form.company.businessType">
                      <option value="">— Bitte wählen —</option>
                      <option value="Einzelunternehmen">Einzelunternehmen</option>
                      <option value="Freiberufler">Freiberufler / Fotograf/in</option>
                      <option value="GbR">GbR</option>
                      <option value="UG">UG (haftungsbeschränkt)</option>
                      <option value="GmbH">GmbH</option>
                      <option value="GmbH & Co. KG">GmbH &amp; Co. KG</option>
                      <option value="OHG">OHG</option>
                      <option value="AG">AG</option>
                    </select>
                  </div>
                </div>
                <div v-if="previewUrl" style="margin-top:10px">
                  <button class="btn btn-ghost btn-sm" @click.stop="removeLogo">🗑 Logo entfernen</button>
                </div>
                <p v-if="logoUploading" class="hint">⏳ Wird hochgeladen…</p>
                <p v-if="logoError"     class="hint danger">{{ logoError }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Steuer -->
        <div class="s-card">
          <div class="s-card-head"><span class="s-card-title">Steuer</span></div>
          <div class="s-card-body">
            <div class="fg-row">
              <div class="fg">
                <label>Steuernummer</label>
                <input v-model="form.company.taxNumber" type="text" placeholder="12/345/67890" />
              </div>
              <div class="fg">
                <label>USt-IdNr.</label>
                <input v-model="form.company.vatId" type="text" placeholder="DE123456789"
                  :disabled="form.company.smallBusiness" />
                <p v-if="form.company.smallBusiness" class="hint">Nicht nötig bei §19 UStG</p>
              </div>
            </div>
            <label class="chk-row" style="margin-top:14px">
              <input type="checkbox" v-model="form.company.smallBusiness" class="chk-box" />
              <div>
                <div class="toggle-label">Kleinunternehmer §19 UStG</div>
                <div class="hint">Keine Umsatzsteuer auf Rechnungen</div>
              </div>
            </label>
            <div v-if="form.company.smallBusiness" class="infobox" style="margin-top:12px">
              ℹ️ Auf Rechnungen erscheint: <em>„Gemäß §19 UStG wird keine Umsatzsteuer berechnet."</em>
            </div>
          </div>
        </div>

        <!-- Kontakt & Adresse -->
        <div class="s-card">
          <div class="s-card-head"><span class="s-card-title">Kontakt & Adresse</span></div>
          <div class="s-card-body">
            <div class="fg-row">
              <div class="fg">
                <label>Telefon</label>
                <input v-model="form.company.phone" type="tel" placeholder="+49 3821 123456" />
              </div>
              <div class="fg">
                <label>E-Mail</label>
                <input v-model="form.company.email" type="email" placeholder="info@studio.de" />
              </div>
            </div>
            <div class="fg" style="margin-top:12px">
              <label>Website</label>
              <input v-model="form.company.website" type="url" placeholder="https://www.studio.de" />
            </div>
            <div class="fg" style="margin-top:12px">
              <label>Straße & Hausnummer</label>
              <input v-model="form.company.street" type="text" placeholder="Musterstraße 12" />
            </div>
            <div class="fg-row" style="margin-top:12px;grid-template-columns:100px 1fr">
              <div class="fg">
                <label>PLZ</label>
                <input v-model="form.company.zipCode" type="text" placeholder="18311" />
              </div>
              <div class="fg">
                <label>Stadt</label>
                <input v-model="form.company.city" type="text" placeholder="Ribnitz-Damgarten" />
              </div>
            </div>
          </div>
        </div>

        <!-- Bankverbindung -->
        <div class="s-card">
          <div class="s-card-head"><span class="s-card-title">Bankverbindung</span></div>
          <div class="s-card-body">
            <div class="fg-row">
              <div class="fg">
                <label>Bank</label>
                <input v-model="form.company.bankName" type="text" placeholder="Sparkasse Rostock" />
              </div>
              <div class="fg">
                <label>BIC</label>
                <input v-model="form.company.bic" type="text" placeholder="NOLADE21ROK" />
              </div>
            </div>
            <div class="fg" style="margin-top:12px">
              <label>IBAN</label>
              <input v-model="form.company.iban" type="text" placeholder="DE12 3456 7890 1234 5678 90" />
            </div>
          </div>
        </div>

        <!-- Rechnungstexte -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">Rechnungstexte</span>
            <span class="s-card-sub">Erscheinen automatisch auf Angeboten und Rechnungen</span>
          </div>
          <div class="s-card-body">
            <div class="fg">
              <label>Einleitungstext <span class="sub">(über den Positionen)</span></label>
              <textarea v-model="form.company.invoiceIntro" rows="2"
                placeholder="Ich berechne Ihnen folgende Leistungen:"></textarea>
            </div>
            <div class="fg" style="margin-top:12px">
              <label>Fußnotentext <span class="sub">(unter den Positionen)</span></label>
              <textarea v-model="form.company.invoiceFooter" rows="2"
                placeholder="Zahlbar innerhalb von 14 Tagen ohne Abzug."></textarea>
            </div>
          </div>
        </div>

      </div><!-- /company s-content -->


      <!-- ════════════════════════════════
           Buchungskonditionen
      ════════════════════════════════ -->
      <div v-if="activeTab === 'booking'" class="s-content">


        <!-- Vorgespräch -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">💬 Vorgespräch</span>
            <span class="s-card-sub">Persönliches Kennenlerngespräch vor der Auftragsannahme</span>
          </div>
          <div class="s-card-body">
            <label class="chk-row" style="margin-bottom:12px">
              <input type="checkbox" v-model="form.bookingTerms.requireConsultation" class="chk-box" />
              <div>
                <div class="toggle-label">
                  Vorgespräch ist Pflicht
                  <span v-if="form.bookingTerms.requireConsultation" class="badge badge-aktiv" style="margin-left:8px;font-size:10px">Aktiv</span>
                  <span v-else class="badge badge-neutral" style="margin-left:8px;font-size:10px">Optional</span>
                </div>
                <div class="hint" style="margin-top:2px">
                  Wenn aktiv: Jeder Auftrag enthält einen Vorgespräch-Schritt.
                  Der Vertrag kann erst generiert werden wenn der Kunde im Vorgespräch angenommen wurde.
                </div>
              </div>
            </label>
            <div v-if="form.bookingTerms.requireConsultation" class="infobox infobox-yellow" style="margin-top:4px">
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
                  <input v-model.number="form.bookingTerms.depositRate"
                    type="number" min="0" max="100" step="5" placeholder="20" />
                  <span class="inp-unit">%</span>
                </div>
              </div>
              <div class="hint-inline" v-if="form.bookingTerms.depositRate > 0">
                Beispiel: Budget 2.000 € → Anzahlung
                <strong>{{ ((form.bookingTerms.depositRate / 100) * 2000).toFixed(2).replace('.', ',') }} €</strong>
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
                  <input v-model.number="form.bookingTerms.hourlyRatePhotoPrivat" type="number" min="0" step="5" placeholder="250" />
                  <span class="inp-unit">€/h</span>
                </div>
              </div>
              <div class="fg" style="max-width:180px">
                <label>Stundensatz B2B</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.hourlyRatePhotoB2B" type="number" min="0" step="5" placeholder="200" />
                  <span class="inp-unit">€/h</span>
                </div>
              </div>
              <div class="fg" style="max-width:180px">
                <label>Rüstzeit B2B</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.hourlyRatePhotoSetup" type="number" min="0" step="5" placeholder="100" />
                  <span class="inp-unit">€/h</span>
                </div>
                <span class="hint-inline">Vor-/Nachbereitung, Briefing, Meetings</span>
              </div>
              <div class="fg" style="max-width:180px">
                <label>Einzelbild Digital – Privat</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.imagePricePrivat" type="number" min="0" step="5" placeholder="40" />
                  <span class="inp-unit">€</span>
                </div>
              </div>
              <div class="fg" style="max-width:180px">
                <label>Einzelbild Digital – B2B</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.imagePriceB2B" type="number" min="0" step="5" placeholder="60" />
                  <span class="inp-unit">€</span>
                </div>
              </div>
            </div>

            <div class="s-rates-section-label">🎬 Videografie</div>
            <div class="fg-row" style="flex-wrap:wrap;gap:12px;margin-bottom:16px">
              <div class="fg" style="max-width:180px">
                <label>Stundensatz Privat</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.hourlyRateVideoPrivat" type="number" min="0" step="5" placeholder="250" />
                  <span class="inp-unit">€/h</span>
                </div>
              </div>
              <div class="fg" style="max-width:180px">
                <label>Stundensatz B2B</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.hourlyRateVideoB2B" type="number" min="0" step="5" placeholder="200" />
                  <span class="inp-unit">€/h</span>
                </div>
              </div>
              <div class="fg" style="max-width:180px">
                <label>Rüstzeit B2B</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.hourlyRateVideoSetup" type="number" min="0" step="5" placeholder="100" />
                  <span class="inp-unit">€/h</span>
                </div>
                <span class="hint-inline">Vor-/Nachbereitung, Storyboard, Abnahmen</span>
              </div>
              <div class="fg" style="max-width:180px">
                <label>Video 10 Minuten (fertig)</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.videoPer10min" type="number" min="0" step="50" placeholder="1200" />
                  <span class="inp-unit">€</span>
                </div>
              </div>
            </div>

            <div class="s-rates-section-label">🚗 Reisekosten</div>
            <div class="fg-row" style="flex-wrap:wrap;gap:12px">
              <div class="fg" style="max-width:180px">
                <label>Kilometerpauschale</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.defaultKmRate" type="number" min="0" step="0.01" placeholder="0.50" />
                  <span class="inp-unit">€/km</span>
                </div>
              </div>
              <div class="fg" style="max-width:180px">
                <label>Freikilometer</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.bookingTerms.defaultKmFree" type="number" min="0" step="5" placeholder="30" />
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
              <label class="nr-mode-chip" :class="{ active: form.bookingTerms.usageRightsMode === 'simple' }"
                @click="form.bookingTerms.usageRightsMode = 'simple'">
                <div class="nr-mode-icon">📊</div>
                <div class="nr-mode-content">
                  <div class="nr-mode-title">Einfach (Kategorie-basiert)</div>
                  <div class="nr-mode-desc">Prozentzuschlag nach Nutzungsart (Print, Online, TV, PR), Laufzeit und Gebiet. Schnell und intuitiv für die meisten B2B-Aufträge.</div>
                </div>
                <div class="nr-mode-check">{{ form.bookingTerms.usageRightsMode === 'simple' ? '✓' : '' }}</div>
              </label>
              <label class="nr-mode-chip" :class="{ active: form.bookingTerms.usageRightsMode === 'designaustria' }"
                @click="form.bookingTerms.usageRightsMode = 'designaustria'">
                <div class="nr-mode-icon">🧮</div>
                <div class="nr-mode-content">
                  <div class="nr-mode-title">designaustria (Faktor-Multiplikation)</div>
                  <div class="nr-mode-desc">6 unabhängige Faktoren (Thema, Bedeutung, Gebiet, Zeitraum, Nutzungsart, Auftragsart) nach Kalkulations-Richtlinien von designaustria. Granularer für komplexe Aufträge.</div>
                </div>
                <div class="nr-mode-check">{{ form.bookingTerms.usageRightsMode === 'designaustria' ? '✓' : '' }}</div>
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
              <div v-for="(tier, idx) in form.bookingTerms.cancellationFees"
                   :key="idx" class="ct-row">
                <div class="fg">
                  <input v-model.number="tier.daysBeforeEvent" type="number"
                    min="0" step="1" placeholder="30" />
                </div>
                <div class="fg">
                  <div class="inp-unit-wrap">
                    <input v-model.number="tier.feePercent" type="number"
                      min="0" max="100" step="5" placeholder="50" />
                    <span class="inp-unit">%</span>
                  </div>
                </div>
                <div class="fg ct-label-col">
                  <input v-model="tier.label" type="text"
                    placeholder="z.B. bis 30 Tage vor dem Termin" />
                </div>
                <button class="btn btn-ghost btn-sm btn-icon text-danger"
                  @click="removeCancellationTier(idx)" title="Zeile löschen">🗑️</button>
              </div>
            </div>

            <button class="btn btn-ghost btn-sm" style="margin-top:10px"
              @click="addCancellationTier">+ Stufe hinzufügen</button>

            <div class="infobox" style="margin-top:14px">
              ℹ️ Die letzte Stufe (0 Tage) gilt üblicherweise für Nichterscheinen und sehr kurzfristige Stornos.
            </div>
          </div>
        </div>

      </div>


      <!-- ════════════════════════════════
           Vertragswesen
      ════════════════════════════════ -->
      <div v-if="activeTab === 'clauses'" class="s-content">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <p class="s-intro" style="margin:0">Alle Rechtstexte des generierten Vertrags sind hier editierbar. Aenderungen gelten sofort fuer neu erstellte Vertraege. Platzhalter: <code>{studioName}</code>, <code>{archivDauer}</code>, <code>{minCopyrightDamage}</code> werden beim Drucken ersetzt.</p>
          <button class="btn btn-sm btn-secondary" style="flex-shrink:0" title="Blankovertrag als PDF speichern" @click="savePdf('/api/pdf/blank-contract', 'Blanko_Vertrag')">
            💾 Blankovertrag
          </button>
        </div>

        <!-- Zahlungsarten (hier oben — war bisher unten) -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">💳 Zahlungsarten</span>
            <span class="s-card-sub">Welche Zahlungsarten stehen beim Erfassen eines Zahlungseingangs zur Auswahl?</span>
          </div>
          <div class="s-card-body">
            <div class="payment-methods-grid">
              <label v-for="m in availablePaymentMethods" :key="m.id"
                class="pm-check-label"
                :class="{ active: form.bookingTerms.enabledPaymentMethods.includes(m.id) }">
                <input type="checkbox"
                  :value="m.id"
                  v-model="form.bookingTerms.enabledPaymentMethods"
                  style="display:none" />
                <span class="pm-check-icon">{{ m.icon }}</span>
                <span class="pm-check-name">{{ m.label }}</span>
                <span class="pm-check-tick">{{ form.bookingTerms.enabledPaymentMethods.includes(m.id) ? '✓' : '' }}</span>
              </label>
            </div>
            <p class="hint" style="margin-top:10px">Mindestens eine Zahlungsart muss aktiv sein.</p>
          </div>
        </div>

        <!-- ── Nutzungsrechts-Referenz: Einfach (Kategorie-basiert) ── -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">📊 Einfache Nutzungsrechte — Zuschlagstabelle</span>
            <span class="s-card-sub">Prozentzuschlag auf das Bildhonorar · nach Kategorie, Laufzeit und Gebiet</span>
          </div>
          <div class="s-card-body">
            <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:16px;line-height:1.6">
              Im einfachen Modell wird der Nutzungsrechtszuschlag als <strong>prozentualer Aufschlag</strong>
              auf das Bildhonorar berechnet. Mehrere Kategorien werden <strong>addiert</strong>.
              Die Sätze richten sich nach Nutzungsart, Laufzeit und geografischem Gebiet:<br>
              <code style="background:var(--bg-alt);padding:2px 8px;border-radius:4px;font-size:12px">
                NR-Zuschlag = Bildhonorar × (Kategorie₁% + Kategorie₂% + …)
              </code>
            </p>

            <div class="ur-ref-grid" style="grid-template-columns: repeat(2, 1fr)">

              <!-- Print / OOH -->
              <div class="ur-ref-block">
                <div class="ur-ref-title">🖨 Print / OOH</div>
                <div class="ur-ref-desc">Anzeigen, Plakate, Kataloge, Außenwerbung, Verpackungen</div>
                <table class="ur-ref-table">
                  <thead><tr>
                    <th style="text-align:left;font-size:10px;color:var(--text-muted);padding-bottom:4px">Laufzeit</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">Regional</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">National</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">International</th>
                  </tr></thead>
                  <tbody>
                    <tr><td>1 Jahr</td>    <td class="ur-factor">15 %</td><td class="ur-factor">25 %</td><td class="ur-factor">40 %</td></tr>
                    <tr><td>2 Jahre</td>   <td class="ur-factor">22 %</td><td class="ur-factor">38 %</td><td class="ur-factor">60 %</td></tr>
                    <tr><td>Unbegrenzt</td><td class="ur-factor">35 %</td><td class="ur-factor">55 %</td><td class="ur-factor">80 %</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- Online / Social -->
              <div class="ur-ref-block">
                <div class="ur-ref-title">🌐 Online / Social</div>
                <div class="ur-ref-desc">Website, Social Media, Newsletter, Online-Anzeigen, Präsentationen</div>
                <table class="ur-ref-table">
                  <thead><tr>
                    <th style="text-align:left;font-size:10px;color:var(--text-muted);padding-bottom:4px">Laufzeit</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">Regional</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">National</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">International</th>
                  </tr></thead>
                  <tbody>
                    <tr><td>1 Jahr</td>    <td class="ur-factor">10 %</td><td class="ur-factor">20 %</td><td class="ur-factor">35 %</td></tr>
                    <tr><td>2 Jahre</td>   <td class="ur-factor">15 %</td><td class="ur-factor">30 %</td><td class="ur-factor">50 %</td></tr>
                    <tr><td>Unbegrenzt</td><td class="ur-factor">25 %</td><td class="ur-factor">45 %</td><td class="ur-factor">65 %</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- TV / Video -->
              <div class="ur-ref-block">
                <div class="ur-ref-title">📺 TV / Video</div>
                <div class="ur-ref-desc">TV-Werbespots, Streaming-Plattformen, Kino-Werbung, Video-on-Demand</div>
                <table class="ur-ref-table">
                  <thead><tr>
                    <th style="text-align:left;font-size:10px;color:var(--text-muted);padding-bottom:4px">Laufzeit</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">Regional</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">National</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">International</th>
                  </tr></thead>
                  <tbody>
                    <tr><td>1 Jahr</td>    <td class="ur-factor">30 %</td><td class="ur-factor">50 %</td> <td class="ur-factor">80 %</td></tr>
                    <tr><td>2 Jahre</td>   <td class="ur-factor">45 %</td><td class="ur-factor">70 %</td> <td class="ur-factor">110 %</td></tr>
                    <tr><td>Unbegrenzt</td><td class="ur-factor">60 %</td><td class="ur-factor">100 %</td><td class="ur-factor">150 %</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- PR / Redaktion -->
              <div class="ur-ref-block">
                <div class="ur-ref-title">📰 PR / Redaktion</div>
                <div class="ur-ref-desc">Pressemitteilungen, Jahresberichte, Mitarbeiterzeitschriften — kein direkter Werbecharakter</div>
                <table class="ur-ref-table">
                  <thead><tr>
                    <th style="text-align:left;font-size:10px;color:var(--text-muted);padding-bottom:4px">Laufzeit</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">Regional</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">National</th>
                    <th style="font-size:10px;color:var(--text-muted);padding-bottom:4px">International</th>
                  </tr></thead>
                  <tbody>
                    <tr><td>1 Jahr</td>    <td class="ur-factor">5 %</td> <td class="ur-factor">10 %</td><td class="ur-factor">18 %</td></tr>
                    <tr><td>2 Jahre</td>   <td class="ur-factor">8 %</td> <td class="ur-factor">15 %</td><td class="ur-factor">25 %</td></tr>
                    <tr><td>Unbegrenzt</td><td class="ur-factor">12 %</td><td class="ur-factor">22 %</td><td class="ur-factor">35 %</td></tr>
                  </tbody>
                </table>
              </div>

            </div>

            <!-- Beispielrechnung -->
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

        <!-- ── Nutzungsrechts-Referenz (designaustria-Modell) — hier oben ── -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">📐 Nutzungsrechte-Kalkulator — Faktor-Referenz</span>
            <span class="s-card-sub">Nach Kalkulations-Richtlinien von designaustria · wird im B2B-Anfrageformular angewendet</span>
          </div>
          <div class="s-card-body">
            <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:16px;line-height:1.6">
              Das Nutzungshonorar wird aus dem Gestaltungshonorar multipliziert mit
              <strong>6 Faktoren</strong> berechnet:<br>
              <code style="background:var(--bg-alt);padding:2px 8px;border-radius:4px;font-size:12px">
                Nutzungshonorar = Gestaltungshonorar × Thema × Bedeutung × Gebiet × Zeitraum × Nutzungsart × Auftragsart
              </code>
            </p>
            <div class="ur-ref-grid">
              <div class="ur-ref-block">
                <div class="ur-ref-title">Themenspezifisch</div>
                <div class="ur-ref-desc">Art des Auftrags / der Kommunikation</div>
                <table class="ur-ref-table">
                    <tbody>
                    <tr><td class="ur-factor">1,00</td><td>Branding, Packaging, Corporate Design</td></tr>
                  <tr><td class="ur-factor">0,75</td><td>Produkt-Werbung</td></tr>
                  <tr><td class="ur-factor">0,50</td><td>Unternehmenskommunikation</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="ur-ref-block">
                <div class="ur-ref-title">Bedeutungsspezifisch</div>
                <div class="ur-ref-desc">Stellenwert des Bildes in der Kommunikation</div>
                <table class="ur-ref-table">
                    <tbody>
                    <tr><td class="ur-factor">1,00</td><td>Hauptelement, Basisdesign</td></tr>
                  <tr><td class="ur-factor">0,75</td><td>Wichtiges Nebenelement</td></tr>
                  <tr><td class="ur-factor">0,50</td><td>Untergeordnetes Nebenelement</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="ur-ref-block">
                <div class="ur-ref-title">Kommunikations-/Nutzungsgebiet</div>
                <div class="ur-ref-desc">Geografischer Verbreitungsraum</div>
                <table class="ur-ref-table">
                    <tbody>
                    <tr><td class="ur-factor">0,50</td><td>Lokal (einzelner Standort)</td></tr>
                  <tr><td class="ur-factor">0,75</td><td>Regional (Bundesland, Tourismusregion)</td></tr>
                  <tr><td class="ur-factor">1,00</td><td>National (ein Staatsgebiet)</td></tr>
                  <tr><td class="ur-factor">1,50</td><td>Europaweit (inkl. Mittelmeer-Anrainer)</td></tr>
                  <tr><td class="ur-factor">2,00</td><td>Weltweit</td></tr>
                  </tbody>
                </table>
                <div class="ur-ref-note">Online-Nutzung gilt nicht automatisch als weltweit.</div>
              </div>
              <div class="ur-ref-block">
                <div class="ur-ref-title">Einsatz-/Nutzungszeitraum</div>
                <div class="ur-ref-desc">Zeitliche Beschränkung der Lizenz</div>
                <table class="ur-ref-table">
                    <tbody>
                    <tr><td class="ur-factor">0,75</td><td>Einmalige Nutzung (ein Event, eine Auflage)</td></tr>
                  <tr><td class="ur-factor">1,00</td><td>1 Jahr (Werbekampagne, Werbejahr)</td></tr>
                  <tr><td class="ur-factor">1,50</td><td>Dauernutzung (ohne zeitliche Beschränkung)</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="ur-ref-block">
                <div class="ur-ref-title">Nutzungsart</div>
                <div class="ur-ref-desc">Art der eingeräumten Rechte</div>
                <table class="ur-ref-table">
                    <tbody>
                    <tr><td class="ur-factor">0,00</td><td>Kein Nutzungsrecht</td></tr>
                  <tr><td class="ur-factor">1,00</td><td>Zweckgebundenes Werknutzungsrecht</td></tr>
                  <tr><td class="ur-factor">1,50</td><td>Werknutzungsrecht ohne Zweckbindung</td></tr>
                  <tr><td class="ur-factor">3,00</td><td>Daten-/Bearbeitungsrecht (inkl. Bearbeitung durch Dritte)</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="ur-ref-block">
                <div class="ur-ref-title">Auftragsart</div>
                <div class="ur-ref-desc">Art der Geschäftsbeziehung</div>
                <table class="ur-ref-table">
                    <tbody>
                    <tr><td class="ur-factor">0,75</td><td>Folgeauftrag (bekannter Kunde)</td></tr>
                  <tr><td class="ur-factor">1,00</td><td>Rahmenvereinbarung / Exklusiv-Betreuung</td></tr>
                  <tr><td class="ur-factor">1,50</td><td>Einzelauftrag (Erstauftrag)</td></tr>
                  </tbody>
                </table>
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

        <!-- ── Archivierung & Fristen ── -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">Archivierung & Fristen</span>
            <span class="s-card-sub">Steuerung der Platzhalter in den Paragraphen-Texten</span>
          </div>
          <div class="s-card-body">
            <div class="form-row">
              <div class="fg">
                <label>Archivierungsdauer Bearbeitete Bilder (Monate)</label>
                <input v-model.number="form.contractClauses.archiveDuration" type="number" min="1" max="36" step="1" />
                <span class="hint-inline">Beeinflusst den Platzhalter {archivDauer} in den Paragraphen-Texten</span>
              </div>
              <div class="fg">
                <label>Archivierungsdauer RAW-Dateien (Monate)</label>
                <input v-model.number="form.contractClauses.archiveRawDuration" type="number" min="0" max="12" step="1" />
                <span class="hint-inline">0 = keine Archivierung</span>
              </div>
              <div class="fg">
                <label>Mindestschadenspauschale Urheberrecht (% je Verstoss)</label>
                <div class="inp-unit-wrap">
                  <input v-model.number="form.contractClauses.minCopyrightDamagePercent" type="number" min="50" max="300" step="25" />
                  <span class="inp-unit">%</span>
                </div>
                <span class="hint-inline">Platzhalter {minCopyrightDamage} – Empfehlung: 100-200%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Ausruestungsschadenklausel ── -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">Ausruestungsschadenklausel</span>
            <span class="s-card-sub">Erscheint im Vertrag wenn im Auftrag aktiviert</span>
          </div>
          <div class="s-card-body">
            <div class="fg">
              <textarea v-model="form.contractClauses.equipmentDamageText" rows="4" class="para-ta"
                placeholder="Verursacht der Auftraggeber oder eine von ihm eingeladene Person schuldhaft einen Schaden..."></textarea>
            </div>
          </div>
        </div>

        <!-- ── Paragraphen-Texte (AGB-Style) ── -->
        <div class="s-intro-banner" style="margin-top:8px">
          <div class="s-intro-icon">§</div>
          <div>
            <div class="s-intro-title">Paragraphen-Texte</div>
            <div class="s-intro-text">Klausel-Texte für den generierten Vertrag. Platzhalter: <code>{studioName}</code>, <code>{archivDauer}</code>, <code>{minCopyrightDamage}</code>. Paragraphen können umbenannt, verschoben, neue Punkte hinzugefügt werden.</div>
          </div>
          <button class="btn btn-sm btn-primary" style="margin-left:auto;flex-shrink:0" @click="addCpParagraph">+ Paragraph</button>
        </div>

        <transition-group name="agb-list" tag="div" class="agb-list">
          <div v-for="(para, idx) in contractParagraphsList" :key="para.id" class="agb-para-card">

            <!-- Header -->
            <div class="agb-para-head">
              <span class="agb-para-num cp-para-num">{{ para.title.match(/^§\s*\d+/) ? para.title.match(/^§\s*[\d\/]+/)[0] : ('§' + (idx+1)) }}</span>
              <input
                v-model="para.title"
                class="agb-para-title-input"
                placeholder="Titel (z.B. § 3 Vergütung)"
                @input="cpDirty = true"
              />
              <div class="agb-para-actions">
                <button class="agb-btn" :disabled="idx === 0" @click="moveCpPara(idx,-1)" title="Nach oben">▲</button>
                <button class="agb-btn" :disabled="idx === contractParagraphsList.length-1" @click="moveCpPara(idx,1)" title="Nach unten">▼</button>
                <button class="agb-btn agb-btn-add" @click="addCpItem(idx)" title="Klausel-Text hinzufügen">+ Klausel</button>
                <button class="agb-btn agb-btn-del" @click="deleteCpPara(idx)" title="Paragraph löschen">✕ §</button>
              </div>
            </div>

            <!-- Labeled sub-items -->
            <div class="agb-items">
              <div v-for="(item, iIdx) in (para.items || [])" :key="iIdx" class="agb-item-row cp-item-row">
                <div class="cp-item-left">
                  <input
                    v-model="para.items[iIdx].label"
                    class="cp-item-label-input"
                    placeholder="Bezeichnung (z.B. Stundensatz-Hinweis)"
                    @input="cpDirty = true"
                  />
                  <textarea
                    v-model="para.items[iIdx].text"
                    class="agb-item-ta cp-item-ta"
                    rows="3"
                    :placeholder="'Klauseltext für ' + (item.label || 'diesen Punkt') + '…'"
                    @input="cpDirty = true; autoResizeAGB($event)"
                    @focus="autoResizeAGB($event)"
                  />
                </div>
                <button class="agb-item-del" @click="deleteCpItem(idx, iIdx)" title="Klausel löschen">✕</button>
              </div>
              <div v-if="!para.items || para.items.length === 0" class="agb-no-items">
                Noch keine Klauseln — klicke „+ Klausel"
              </div>
            </div>

          </div>
        </transition-group>

        <!-- ── Sondervereinbarungen ── -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">Vordefinierte Sondervereinbarungen</span>
            <span class="s-card-sub">Werden im Auftragsformular zur Auswahl angeboten</span>
          </div>
          <div class="s-card-body">
            <div v-for="(cl, idx) in form.contractClauses.specialClauses" :key="cl.id" class="clause-item">
              <div class="clause-header">
                <div class="fg" style="flex:1">
                  <label>Titel</label>
                  <input v-model="cl.title" type="text" placeholder="z.B. Reisekostenregelung" />
                </div>
                <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding-top:18px">
                  <label class="clause-default-label" :class="{ active: cl.defaultActive }"
                    :title="cl.defaultActive ? 'Standardmäßig aktiv — wird bei jedem neuen Vertrag vorausgewählt' : 'Klicken um als Standard zu setzen'">
                    <input type="checkbox" v-model="cl.defaultActive" style="display:none" />
                    {{ cl.defaultActive ? '★' : '☆' }}
                  </label>
                  <span style="font-size:9px;color:var(--text-muted);white-space:nowrap">Standard</span>
                </div>
                <button class="btn btn-ghost btn-sm text-danger" style="margin-top:18px" @click="form.contractClauses.specialClauses.splice(idx,1)">Entfernen</button>
              </div>
              <div class="fg" style="margin-top:8px">
                <label>Klauseltext</label>
                <textarea v-model="cl.text" rows="3" class="para-ta"></textarea>
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" style="margin-top:8px" @click="form.contractClauses.specialClauses.push({ id: 'sc_' + Date.now(), title: '', text: '', defaultActive: false })">
              + Neue Klausel
            </button>
          </div>
        </div>


      </div>


      <!-- ════════════════════════════════
           Nummernkreise
      ════════════════════════════════ -->
      <div v-if="activeTab === 'numbers'" class="s-content">
        <div class="s-intro-banner">
          <div class="s-intro-icon">🔢</div>
          <div>
            <div class="s-intro-title">Nummernkreise</div>
            <div class="s-intro-text">Nutze Platzhalter in der Formatvorlage. Die Vorschau aktualisiert sich live.</div>
          </div>
        </div>

        <!-- Token-Referenz-Leiste -->
        <div class="num-token-bar">
          <div v-for="t in numTokens" :key="t.token" class="num-token" :title="t.hint">
            <div class="num-token-label">{{ t.label }}</div>
            <code class="num-token-code">{{ t.token }}</code>
          </div>
        </div>

        <!-- Schemas -->
        <div class="num-group-label">📄 Dokumente</div>

        <div v-for="schema in numSchemasDocs" :key="schema.key" class="s-card num-schema-card">
          <div class="s-card-head">
            <span class="s-card-title">{{ schema.label }}</span>
            <code class="num-preview">{{ buildFromFormat(form.numberSchemas[schema.key]?.format, schema.key) }}</code>
          </div>
          <div class="s-card-body">
            <div class="num-format-row">
              <div class="fg" style="flex:1">
                <label>Formatvorlage</label>
                <input
                  v-model="form.numberSchemas[schema.key].format"
                  type="text"
                  class="num-format-input"
                  :placeholder="schema.placeholder"
                  spellcheck="false"
                />
              </div>
              <div class="fg num-start-field" v-if="schema.hasStart">
                <label>Startwert</label>
                <input v-model.number="form.numberSchemas[schema.key].start" type="number" min="1" style="width:80px" />
              </div>
            </div>
            <div class="num-hint" v-if="schema.locked">
              <span class="num-locked-icon">🔒</span> Nicht mehr änderbar — es existieren bereits Dokumente dieses Typs
            </div>
          </div>
        </div>

        <div class="num-group-label">👤 Stammdaten</div>

        <div v-for="schema in numSchemasStamm" :key="schema.key" class="s-card num-schema-card">
          <div class="s-card-head">
            <span class="s-card-title">{{ schema.label }}</span>
            <code class="num-preview">{{ buildFromFormat(form.numberSchemas[schema.key]?.format, schema.key) }}</code>
          </div>
          <div class="s-card-body">
            <div class="num-format-row">
              <div class="fg" style="flex:1">
                <label>Formatvorlage</label>
                <input
                  v-model="form.numberSchemas[schema.key].format"
                  type="text"
                  class="num-format-input"
                  :placeholder="schema.placeholder"
                  spellcheck="false"
                />
              </div>
              <div class="fg num-start-field" v-if="schema.hasStart">
                <label>Startwert</label>
                <input v-model.number="form.numberSchemas[schema.key].start" type="number" min="1" style="width:80px" />
              </div>
            </div>
            <div class="num-hint" v-if="schema.locked">
              <span class="num-locked-icon">🔒</span> Nicht mehr änderbar — es existieren bereits Einträge dieses Typs
            </div>
          </div>
        </div>

        <div class="num-group-label">↩ Abgeleitete Nummern</div>

        <div v-for="schema in numSchemasAbgeleitet" :key="schema.key" class="s-card num-schema-card">
          <div class="s-card-head">
            <span class="s-card-title">{{ schema.label }}</span>
            <code class="num-preview">
              {{ form.numberSchemas[schema.key]?.prefix }}{{ form.numberSchemas[schema.key]?.separator }}RE-2026-03/00042
            </code>
          </div>
          <div class="s-card-body">
            <div class="num-format-row">
              <div class="fg">
                <label>Präfix</label>
                <input v-model="form.numberSchemas[schema.key].prefix" type="text"
                  class="num-format-input" style="width:140px"
                  :placeholder="schema.key === 'correction' ? 'KOR' : 'STORNO'" />
              </div>
              <div class="fg">
                <label>Trennzeichen</label>
                <select v-model="form.numberSchemas[schema.key].separator" style="width:120px">
                  <option value="-">Bindestrich  —</option>
                  <option value="/">Schrägstrich  /</option>
                  <option value="_">Unterstrich  _</option>
                  <option value=" ">Leerzeichen</option>
                  <option value="">Keines</option>
                </select>
              </div>
            </div>
            <div class="num-hint">ℹ️ {{ schema.hint }}</div>
          </div>
        </div>

      

      </div><!-- /numbers tab -->

      <!-- ════════════════════════════════
           Kalender
      ════════════════════════════════ -->
      <div v-if="activeTab === 'calendar'" class="s-content">

        <div class="s-intro-banner">
          <div class="s-intro-icon">📅</div>
          <div>
            <div class="s-intro-title">Kalender-Einstellungen</div>
            <div class="s-intro-text">Diese Einstellungen gelten für die Kalenderansicht. Bundesländer und Ferien-Anzeige werden direkt im Kalender eingestellt.</div>
          </div>
          <router-link to="/calendar" class="btn btn-sm btn-primary" style="margin-left:auto;flex-shrink:0">📅 Zum Kalender</router-link>
        </div>

        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">Wiedervorlage Angebote</span>
            <span class="s-card-sub">Automatische Follow-up Erinnerung nach Angebotsversand</span>
          </div>
          <div class="s-card-body">
            <div class="fg-row">
              <div class="fg">
                <label>Tage bis zur Wiedervorlage</label>
                <div class="inp-unit-wrap">
                  <input type="number" min="1" max="90" step="1"
                    :value="form.calendarSettings?.quoteFollowUpDays ?? 14"
                    @input="e => { if (!form.calendarSettings) form.calendarSettings = {}; form.calendarSettings.quoteFollowUpDays = parseInt(e.target.value) || 14 }" />
                  <span class="inp-unit">Tage</span>
                </div>
                <span class="hint">Nach diesem Zeitraum erscheint im Kalender eine Wiedervorlage-Erinnerung beim Angebot (Status: Versendet)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">🎉 Feiertage — Standard-Bundesländer</span>
            <span class="s-card-sub">Vorauswahl beim Öffnen des Kalenders</span>
          </div>
          <div class="s-card-body">
            <div class="fg" style="max-width:280px;margin-bottom:12px">
              <label>Schnellauswahl (ein Bundesland)</label>
              <select @change="e => { toggleCalBlSingle(e.target.value, 'bundeslaender') }">
                <option value="">— Auswahl unverändert lassen —</option>
                <option v-for="bl in bundeslaenderList" :key="bl.code" :value="bl.code">
                  {{ bl.code }} – {{ bl.label }}
                </option>
              </select>
            </div>
            <div class="bl-grid">
              <label v-for="bl in bundeslaenderList" :key="bl.code" class="bl-label">
                <input type="checkbox" :value="bl.code"
                  :checked="(form.calendarSettings?.bundeslaender || []).includes(bl.code)"
                  @change="toggleCalBl(bl.code, 'bundeslaender')" />
                <span>{{ bl.code }} — {{ bl.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">🏫 Schulferien — Standard-Bundesländer</span>
            <span class="s-card-sub">Vorauswahl beim Öffnen des Kalenders</span>
          </div>
          <div class="s-card-body">
            <div class="fg" style="max-width:280px;margin-bottom:12px">
              <label>Schnellauswahl (ein Bundesland)</label>
              <select @change="e => { toggleCalBlSingle(e.target.value, 'ferienBundeslaender') }">
                <option value="">— Auswahl unverändert lassen —</option>
                <option v-for="bl in bundeslaenderList" :key="bl.code" :value="bl.code">
                  {{ bl.code }} – {{ bl.label }}
                </option>
              </select>
            </div>
            <div class="bl-grid">
              <label v-for="bl in bundeslaenderList" :key="bl.code" class="bl-label">
                <input type="checkbox" :value="bl.code"
                  :checked="(form.calendarSettings?.ferienBundeslaender || []).includes(bl.code)"
                  @change="toggleCalBl(bl.code, 'ferienBundeslaender')" />
                <span>{{ bl.code }} — {{ bl.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Datenquellen + Cache -->
        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">🌐 Datenquellen & Cache</span>
          </div>
          <div class="s-card-body" style="display:flex;flex-direction:column;gap:10px">
            <div class="infobox infobox-green" style="font-size:12.5px">
              <strong>🎉 Feiertage:</strong>
              <a href="https://feiertage-api.de" target="_blank" style="color:inherit;font-weight:600;margin-left:4px">feiertage-api.de</a>
              — offizielle kostenlose JSON-API · Offline-Fallback via eingebautem Gauß-Algorithmus
            </div>
            <div class="infobox infobox-blue" style="font-size:12.5px">
              <strong>🏫 Schulferien:</strong>
              <a href="https://ferien-api.de" target="_blank" style="color:inherit;font-weight:600;margin-left:4px">ferien-api.de</a>
              — kostenlose JSON-API für alle 16 Bundesländer · Fallback: schulferien.org iCal
            </div>
            <div class="infobox" style="font-size:12.5px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              Daten werden <strong>24h im Backend gecacht</strong>.
              <button class="btn btn-sm btn-ghost" @click="clearHolidayCache" :disabled="cacheClearLoading">
                {{ cacheClearLoading ? 'Wird geleert…' : '🗑 Cache leeren' }}
              </button>
              <span v-if="cacheClearMsg" style="color:var(--success);font-size:12px;font-weight:600">{{ cacheClearMsg }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- ════════════════════════════════
           E-Mail-Versand
      ════════════════════════════════ -->
      <div v-if="activeTab === 'email'" class="s-content">

        <div class="s-coming-soon-banner">
          <span class="s-csb-icon">🚧</span>
          <div>
            <div class="s-csb-title">E-Mail-Versand — in Entwicklung</div>
            <div class="s-csb-text">Die SMTP-Anbindung und der direkte Dokumentenversand aus PixFrameWorkspace werden in einer kommenden Version aktiviert. Die Konfiguration kann bereits vorbereitet werden.</div>
          </div>
        </div>

        <div class="s-intro-banner">
          <div class="s-intro-icon">✉️</div>
          <div>
            <div class="s-intro-title">E-Mail-Versand (SMTP)</div>
            <div class="s-intro-text">Konfiguriere deinen E-Mail-Account, um Rechnungen und Angebote direkt aus PixFrameWorkspace zu versenden. Funktioniert mit Gmail, Outlook, GMX, eigenen Servern usw.</div>
          </div>
        </div>

        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">SMTP-Verbindung</span>
          </div>
          <div class="s-card-body">
            <div class="fg-row">
              <div class="fg" style="flex:2">
                <label>SMTP-Host (Ausgangsserver)</label>
                <input type="text" v-model="form.emailConfig.host" placeholder="smtp.gmail.com" />
              </div>
              <div class="fg">
                <label>Port</label>
                <input type="number" v-model.number="form.emailConfig.port" placeholder="587" />
              </div>
              <div class="fg" style="flex:0">
                <label>SSL/TLS</label>
                <div class="toggle-row" style="margin-top:8px">
                  <button :class="['toggle', form.emailConfig.secure ? 'on':'']"
                    @click="form.emailConfig.secure = !form.emailConfig.secure">
                    <div class="toggle-knob"></div>
                  </button>
                  <span class="toggle-label">{{ form.emailConfig.secure ? 'SSL (Port 465)' : 'STARTTLS (Port 587)' }}</span>
                </div>
              </div>
            </div>
            <div class="fg-row mt-3">
              <div class="fg">
                <label>Benutzername (E-Mail-Adresse)</label>
                <input type="email" v-model="form.emailConfig.user" placeholder="victoria@domain.de" />
              </div>
              <div class="fg">
                <label>App-Passwort / SMTP-Passwort</label>
                <input type="password" v-model="form.emailConfig.pass" placeholder="••••••••••••" autocomplete="new-password" />
              </div>
            </div>
            <div class="fg-row mt-3">
              <div class="fg">
                <label>Absendername</label>
                <input type="text" v-model="form.emailConfig.fromName" :placeholder="form.company.name || 'Studio Name'" />
              </div>
              <div class="fg">
                <label>Absender-E-Mail (falls abweichend)</label>
                <input type="email" v-model="form.emailConfig.fromEmail" placeholder="wie Benutzername" />
              </div>
            </div>
          </div>
        </div>

        <div class="s-card">
          <div class="s-card-head">
            <span class="s-card-title">Test-Mail</span>
            <span class="s-card-sub">Sendet eine Test-Mail an die konfigurierte Absender-Adresse</span>
          </div>
          <div class="s-card-body" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <button class="btn btn-ghost" @click="sendTestMail" :disabled="emailTestLoading">
              {{ emailTestLoading ? '⏳ Sendet…' : '✉️ Test-Mail senden' }}
            </button>
            <span v-if="emailTestResult" :class="['infobox', emailTestResult.ok ? 'infobox-green' : 'infobox-red']" style="padding:6px 12px">
              {{ emailTestResult.message }}
            </span>
          </div>
        </div>

        <div class="infobox infobox-blue" style="font-size:12.5px">
          <strong>Hinweise:</strong><br>
          Gmail: App-Passwort unter Konto → Sicherheit → 2-Faktor → App-Passwörter erstellen.<br>
          GMX/WEB.DE: IMAP/SMTP aktivieren unter E-Mail-Einstellungen.<br>
          Eigener Server: Zugangsdaten vom Hosting-Anbieter verwenden.
        </div>

      </div>

      <!-- ════════════════════════════════
           Erscheinungsbild
      ════════════════════════════════ -->
      <div v-if="activeTab === 'appearance'" class="s-content">

        <div class="s-card">
          <div class="s-card-head"><span class="s-card-title">Farbmodus</span></div>
          <div class="s-card-body">
            <div class="appear-row">
              <div>
                <div class="appear-label">Hell / Dunkel</div>
                <div class="hint">Wechsel zwischen hellem und dunklem Interface</div>
              </div>
              <div class="theme-toggle">
                <button class="theme-btn" :class="{ active: theme === 'light' }" @click="applyTheme('light')">☀️ Hell</button>
                <button class="theme-btn" :class="{ active: theme === 'dark' }"  @click="applyTheme('dark')">🌙 Dunkel</button>
              </div>
            </div>


          </div>
        </div>

        <div class="s-card">
          <div class="s-card-head"><span class="s-card-title">Sprache & Region</span></div>
          <div class="s-card-body">
            <div class="fg-row">
              <div class="fg">
                <label>Sprache</label>
                <select v-model="form.locale">
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="en">🇬🇧 Englisch (bald verfügbar)</option>
                </select>
              </div>
              <div class="fg">
                <label>Währung</label>
                <select v-model="form.currency">
                  <option value="EUR">€ Euro</option>
                  <option value="CHF">₣ Schweizer Franken</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ AGB-Tab ══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'agb'" class="s-content">

        <div class="s-intro-banner">
          <div class="s-intro-icon">§</div>
          <div>
            <div class="s-intro-title">Allgemeine Geschäftsbedingungen</div>
            <div class="s-intro-text">Paragraphen und Unterpunkte sind vollständig editierbar. Nummern werden automatisch aus der Reihenfolge berechnet.</div>
          </div>
          <div style="display:flex;gap:8px;margin-left:auto;flex-shrink:0">
            <button class="btn btn-sm btn-secondary" title="AGB als PDF speichern" @click="savePdf('/api/pdf/agb', 'AGB')">
              💾 AGB als PDF
            </button>
            <button class="btn btn-sm btn-primary" @click="addAgbParagraph">+ Paragraph</button>
          </div>
        </div>

        <transition-group name="agb-list" tag="div" class="agb-list">
          <div v-for="(para, idx) in agbParagraphs" :key="para.id" class="agb-para-card">

            <!-- Paragraph header -->
            <div class="agb-para-head">
              <span class="agb-para-num">§ {{ idx + 1 }}</span>
              <input
                v-model="para.title"
                class="agb-para-title-input"
                placeholder="Titel des Paragraphen"
                @input="agbDirty = true"
              />
              <div class="agb-para-actions">
                <button class="agb-btn" :disabled="idx === 0" @click="moveAgbPara(idx,-1)" title="Nach oben">▲</button>
                <button class="agb-btn" :disabled="idx === agbParagraphs.length-1" @click="moveAgbPara(idx,1)" title="Nach unten">▼</button>
                <button class="agb-btn agb-btn-add" @click="addAgbItem(idx)" title="Unterpunkt hinzufügen">+ Punkt</button>
                <button class="agb-btn agb-btn-del" @click="deleteAgbPara(idx)" title="Paragraph löschen">✕ §</button>
              </div>
            </div>

            <!-- Sub-items -->
            <div class="agb-items">
              <div v-for="(item, iIdx) in (para.items || [])" :key="iIdx" class="agb-item-row">
                <span class="agb-item-num">{{ idx + 1 }}.{{ iIdx + 1 }}</span>
                <textarea
                  v-model="para.items[iIdx]"
                  class="agb-item-ta"
                  rows="2"
                  :placeholder="`Unterpunkt ${iIdx + 1}…`"
                  @input="agbDirty = true; autoResizeAGB($event)"
                  @focus="autoResizeAGB($event)"
                />
                <button class="agb-item-del" @click="deleteAgbItem(idx, iIdx)" title="Punkt löschen">✕</button>
              </div>
              <div v-if="!para.items || para.items.length === 0" class="agb-no-items">
                Noch keine Unterpunkte — klicke „+ Punkt"
              </div>
            </div>

          </div>
        </transition-group>

        <div v-if="agbParagraphs.length === 0" class="agb-empty">
          Noch keine Paragraphen. Klicke oben auf „+ Paragraph".
        </div>

      </div>

      <!-- ══ DSGVO-Tab ══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'dsgvo'" class="s-content">
        <div class="s-intro-banner">
          <div class="s-intro-icon">🔒</div>
          <div>
            <div class="s-intro-title">Datenschutzerklärung (DSGVO)</div>
            <div class="s-intro-text">Abschnitte und Unterpunkte sind vollständig editierbar. Wird als eigenständiges PDF-Dokument bereitgestellt.</div>
          </div>
          <div style="display:flex;gap:8px;margin-left:auto;flex-shrink:0">
            <button class="btn btn-sm btn-secondary" title="DSGVO als PDF speichern" @click="savePdf('/api/pdf/dsgvo', 'Datenschutzerklaerung')">
              💾 DSGVO als PDF
            </button>
            <button class="btn btn-sm btn-primary" @click="addDsgvoParagraph">+ Abschnitt</button>
          </div>
        </div>

        <transition-group name="agb-list" tag="div" class="agb-list">
          <div v-for="(para, idx) in dsgvoParagraphs" :key="para.id" class="agb-para-card">
            <div class="agb-para-head">
              <span class="agb-para-num">{{ idx + 1 }}.</span>
              <input v-model="para.title" class="agb-para-title-input" placeholder="Titel des Abschnitts" @input="dsgvoDirty = true" />
              <div class="agb-para-actions">
                <button class="agb-btn" :disabled="idx === 0" @click="moveDsgvoPara(idx,-1)">▲</button>
                <button class="agb-btn" :disabled="idx === dsgvoParagraphs.length-1" @click="moveDsgvoPara(idx,1)">▼</button>
                <button class="agb-btn agb-btn-add" @click="addDsgvoItem(idx)">+ Punkt</button>
                <button class="agb-btn agb-btn-del" @click="deleteDsgvoPara(idx)">✕</button>
              </div>
            </div>
            <div class="agb-items">
              <div v-for="(item, iIdx) in (para.items || [])" :key="iIdx" class="agb-item-row">
                <span class="agb-item-num">{{ idx + 1 }}.{{ iIdx + 1 }}</span>
                <textarea v-model="para.items[iIdx]" class="agb-item-ta" rows="2"
                  :placeholder="`Unterpunkt ${iIdx + 1}…`"
                  @input="dsgvoDirty = true; autoResizeAGB($event)"
                  @focus="autoResizeAGB($event)" />
                <button class="agb-item-del" @click="deleteDsgvoItem(idx, iIdx)">✕</button>
              </div>
              <div v-if="!para.items || para.items.length === 0" class="agb-no-items">Noch keine Unterpunkte — klicke „+ Punkt"</div>
            </div>
          </div>
        </transition-group>
        <div v-if="dsgvoParagraphs.length === 0" class="agb-empty">Noch keine Abschnitte. Klicke oben auf „+ Abschnitt".</div>
      </div>

      <!-- ══ ADV-Tab ══════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'adv'" class="s-content">
        <div class="s-intro-banner">
          <div class="s-intro-icon">📋</div>
          <div>
            <div class="s-intro-title">Auftragsverarbeitungsvertrag (ADV, Art. 28 DSGVO)</div>
            <div class="s-intro-text">Wird bei B2B-Aufträgen eingesetzt, wenn der Auftraggeber personenbezogene Daten zur Verfügung stellt. Inklusive Unterschriftenblock.</div>
          </div>
          <div style="display:flex;gap:8px;margin-left:auto;flex-shrink:0">
            <button class="btn btn-sm btn-secondary" title="ADV-Vertrag als PDF speichern" @click="savePdf('/api/pdf/adv-vertrag', 'ADV_Vertrag')">
              💾 ADV als PDF
            </button>
            <button class="btn btn-sm btn-primary" @click="addAdvParagraph">+ Abschnitt</button>
          </div>
        </div>

        <transition-group name="agb-list" tag="div" class="agb-list">
          <div v-for="(para, idx) in advParagraphs" :key="para.id" class="agb-para-card">
            <div class="agb-para-head">
              <span class="agb-para-num">{{ idx + 1 }}.</span>
              <input v-model="para.title" class="agb-para-title-input" placeholder="Titel des Abschnitts" @input="advDirty = true" />
              <div class="agb-para-actions">
                <button class="agb-btn" :disabled="idx === 0" @click="moveAdvPara(idx,-1)">▲</button>
                <button class="agb-btn" :disabled="idx === advParagraphs.length-1" @click="moveAdvPara(idx,1)">▼</button>
                <button class="agb-btn agb-btn-add" @click="addAdvItem(idx)">+ Punkt</button>
                <button class="agb-btn agb-btn-del" @click="deleteAdvPara(idx)">✕</button>
              </div>
            </div>
            <div class="agb-items">
              <div v-for="(item, iIdx) in (para.items || [])" :key="iIdx" class="agb-item-row">
                <span class="agb-item-num">{{ idx + 1 }}.{{ iIdx + 1 }}</span>
                <textarea v-model="para.items[iIdx]" class="agb-item-ta" rows="2"
                  :placeholder="`Unterpunkt ${iIdx + 1}…`"
                  @input="advDirty = true; autoResizeAGB($event)"
                  @focus="autoResizeAGB($event)" />
                <button class="agb-item-del" @click="deleteAdvItem(idx, iIdx)">✕</button>
              </div>
              <div v-if="!para.items || para.items.length === 0" class="agb-no-items">Noch keine Unterpunkte — klicke „+ Punkt"</div>
            </div>
          </div>
        </transition-group>
        <div v-if="advParagraphs.length === 0" class="agb-empty">Noch keine Abschnitte. Klicke oben auf „+ Abschnitt".</div>
      </div>

      <!-- ════════════════════════════════
           Backup
      ════════════════════════════════ -->
      <div v-if="activeTab === 'backup'" class="s-content">

        <!-- Manuelles Backup erstellen -->
        <div class="s-card">
          <div class="s-card-header">
            <span class="s-card-icon">💾</span>
            <h3 class="s-card-title">Backup erstellen</h3>
          </div>
          <div class="s-card-body">
            <p class="s-intro" style="margin-bottom:16px">
              Erstellt eine vollständige Datensicherung aller Daten (Kunden, Aufträge, Dokumente, Rechnungen,
              Verträge, FiBu, Einstellungen inkl. AGB/DSGVO/ADV) sowie aller hochgeladenen Dateien (Logo, Belege, Verträge).
              Das Backup wird als ZIP-Archiv im <code>backups/</code>-Ordner gespeichert.
              Es werden maximal 10 Backups aufbewahrt — das älteste wird automatisch gelöscht.
            </p>
            <div style="display:flex;align-items:center;gap:12px">
              <button class="btn btn-primary" :disabled="backupCreating" @click="createBackup">
                <span v-if="backupCreating">⏳ Backup wird erstellt…</span>
                <span v-else>💾 Backup jetzt erstellen</span>
              </button>
              <span v-if="backupMsg" class="backup-msg" :class="backupMsgType">{{ backupMsg }}</span>
            </div>
          </div>
        </div>

        <!-- Backup-Liste -->
        <div class="s-card">
          <div class="s-card-header">
            <span class="s-card-icon">📂</span>
            <h3 class="s-card-title">Vorhandene Backups</h3>
            <span class="s-card-count" v-if="backupList.length">{{ backupList.length }} / 10</span>
          </div>
          <div class="s-card-body" style="padding:0">
            <div v-if="backupLoading" class="backup-loading">Lade Backup-Liste…</div>
            <div v-else-if="backupList.length === 0" class="backup-empty">
              Noch kein Backup vorhanden. Beim nächsten Backend-Start wird automatisch eines erstellt.
            </div>
            <table v-else class="backup-table">
              <thead>
                <tr>
                  <th>Dateiname</th>
                  <th>Datum &amp; Uhrzeit</th>
                  <th style="text-align:right">Größe</th>
                  <th style="text-align:right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="bk in backupList" :key="bk.filename" :class="{ 'backup-row-auto': bk.filename.includes('_auto'), 'backup-row-prerestore': bk.filename.includes('_pre-restore') }">
                  <td class="backup-name">
                    <span class="backup-badge" v-if="bk.filename.includes('_auto')">Auto</span>
                    <span class="backup-badge backup-badge-warn" v-if="bk.filename.includes('_pre-restore')">Pre-Restore</span>
                    {{ bk.filename.replace(/^pixframe-backup-/, '').replace(/\.zip$/, '') }}
                  </td>
                  <td class="backup-date">{{ fmtBackupDate(bk.createdAt) }}</td>
                  <td class="backup-size" style="text-align:right">{{ fmtFileSize(bk.size) }}</td>
                  <td style="text-align:right">
                    <div class="backup-actions">
                      <button class="btn btn-ghost btn-sm" @click="downloadBackup(bk.filename)" title="Herunterladen">⬇️</button>
                      <button class="btn btn-ghost btn-sm" :disabled="backupRestoring === bk.filename" @click="restoreBackup(bk.filename)" title="Wiederherstellen">
                        <span v-if="backupRestoring === bk.filename">⏳</span>
                        <span v-else>♻️</span>
                      </button>
                      <button class="btn btn-ghost btn-sm btn-danger" @click="deleteBackup(bk.filename)" title="Löschen">🗑️</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Backup importieren -->
        <div class="s-card">
          <div class="s-card-header">
            <span class="s-card-icon">📥</span>
            <h3 class="s-card-title">Backup importieren</h3>
          </div>
          <div class="s-card-body">
            <p class="s-intro" style="margin-bottom:16px">
              Lade eine externe Backup-ZIP-Datei hoch, um Daten wiederherzustellen.
              <strong>Achtung:</strong> Alle aktuellen Daten werden überschrieben.
              Vor dem Import wird automatisch ein Sicherungs-Backup angelegt.
            </p>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <label class="btn btn-secondary" style="cursor:pointer">
                📁 Backup-ZIP auswählen…
                <input type="file" accept=".zip" style="display:none" ref="backupImportInput" @change="onBackupFileSelected" />
              </label>
              <span v-if="backupImportFile" class="backup-import-filename">{{ backupImportFile.name }}</span>
              <button v-if="backupImportFile" class="btn btn-primary" :disabled="backupImporting" @click="importBackup">
                <span v-if="backupImporting">⏳ Importiere…</span>
                <span v-else>↩️ Import starten</span>
              </button>
              <span v-if="backupImportMsg" class="backup-msg" :class="backupImportMsgType">{{ backupImportMsg }}</span>
            </div>
          </div>
        </div>

        <!-- Hinweis Auto-Backup -->
        <div class="s-card" style="background:var(--info-bg,#f0f6ff);border-color:var(--info-border,#bfdbfe)">
          <div class="s-card-body" style="display:flex;gap:12px;align-items:flex-start">
            <span style="font-size:20px">ℹ️</span>
            <div style="font-size:13px;color:var(--text);line-height:1.7">
              <strong>Automatisches Backup:</strong> Bei jedem Backend-Start wird automatisch ein Backup erstellt (erkennbar am Suffix <code>_auto</code>).
              Backups werden im Ordner <code>backend/backups/</code> gespeichert und können von dort auch manuell gesichert werden.
            </div>
          </div>
        </div>

      </div><!-- /backup tab -->

      <!-- ════════════════════════════════
           Update
      ════════════════════════════════ -->
      <div v-if="activeTab === 'update'" class="s-content">

        <!-- Schritt 1: ZIP hochladen + Vorschau -->
        <div class="s-card">
          <div class="s-card-header">
            <span class="s-card-icon">📦</span>
            <h3 class="s-card-title">Update installieren</h3>
          </div>
          <div class="s-card-body">
            <p class="s-intro" style="margin-bottom:16px">
              Wähle eine Update-ZIP-Datei aus. Vor der Installation wird automatisch ein
              Datensicherungs-Backup erstellt. Alle Code-Dateien werden aktualisiert —
              Daten, Uploads und Einstellungen bleiben unberührt.
            </p>

            <!-- Datei-Auswahl -->
            <div v-if="!updatePreview" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <label class="btn btn-secondary" style="cursor:pointer">
                📁 Update-ZIP auswählen…
                <input type="file" accept=".zip" style="display:none"
                  ref="updateFileInput" @change="onUpdateFileSelected" />
              </label>
              <span v-if="updateFile" class="backup-import-filename">{{ updateFile.name }}</span>
              <button v-if="updateFile && !updatePreviewing"
                class="btn btn-primary" @click="previewUpdate">
                🔍 Vorschau laden
              </button>
              <span v-if="updatePreviewing" class="update-status">⏳ Lese Manifest…</span>
              <span v-if="updatePreviewErr" class="backup-msg backup-msg-err">✗ {{ updatePreviewErr }}</span>
            </div>

            <!-- Manifest-Vorschau -->
            <div v-if="updatePreview" class="update-manifest-card">
              <div class="update-manifest-header">
                <span class="update-version-badge">{{ updatePreview.version }}</span>
                <span class="update-manifest-title">{{ updatePreview.title }}</span>
              </div>
              <p v-if="updatePreview.description" class="update-manifest-desc">{{ updatePreview.description }}</p>
              <ul v-if="updatePreview.changes?.length" class="update-changes-list">
                <li v-for="ch in updatePreview.changes" :key="ch">{{ ch }}</li>
              </ul>
              <div class="update-manifest-meta" v-if="updatePreview.date">
                Veröffentlicht: {{ updatePreview.date }}
              </div>

              <!-- Aktions-Buttons -->
              <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;align-items:center">
                <button class="btn btn-danger" :disabled="updateApplying" @click="applyUpdate">
                  <span v-if="updateApplying">⏳ Update wird installiert…</span>
                  <span v-else">🚀 Update jetzt installieren</span>
                </button>
                <button class="btn btn-ghost" :disabled="updateApplying" @click="resetUpdate">
                  Abbrechen
                </button>
                <span v-if="updateApplyErr" class="backup-msg backup-msg-err">✗ {{ updateApplyErr }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Schritt 2: Update läuft / Neustart -->
        <div v-if="updateApplying || updateRestarting" class="s-card update-progress-card">
          <div class="s-card-body" style="text-align:center;padding:32px">
            <div class="update-spinner">⚙️</div>
            <div v-if="updateApplying && !updateRestarting" style="margin-top:12px;font-weight:600">
              Update wird angewendet…
            </div>
            <div v-if="updateRestarting" style="margin-top:12px">
              <div style="font-weight:700;font-size:15px;margin-bottom:8px">
                ✅ Update installiert — Backend startet neu
              </div>
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
                Verbindung wird wiederhergestellt… ({{ updateRestartCountdown }}s)
              </div>
              <div class="update-health-bar">
                <div class="update-health-fill" :style="{ width: updateHealthPct + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Hinweis -->
        <div class="s-card" style="background:var(--info-bg,#f0f6ff);border-color:var(--info-border,#bfdbfe)">
          <div class="s-card-body" style="display:flex;gap:12px;align-items:flex-start">
            <span style="font-size:20px">ℹ️</span>
            <div style="font-size:13px;color:var(--text);line-height:1.7">
              <strong>Wichtig:</strong> Updates werden nur als offizielle <code>update-vXXX.zip</code>-Dateien geliefert.
              Vor jeder Installation wird automatisch ein <strong>Pre-Update-Backup</strong> erstellt.
              Nach dem Update startet das Backend automatisch neu — die Seite lädt sich selbst neu.
            </div>
          </div>
        </div>

      </div><!-- /update tab -->

      <!-- ════════════════════════════════
           System
      ════════════════════════════════ -->
      <div v-if="activeTab === 'system'" class="s-content">

        <!-- Datenpfad -->
        <div class="s-card">
          <div class="s-card-header">
            <h3 class="s-card-title">📂 Datenpfad</h3>
            <p class="s-card-subtitle">Hier werden alle Daten, Aufträge, Backups und Medien gespeichert.</p>
          </div>
          <div class="s-card-body">

            <div class="sys-path-row">
              <div class="sys-path-label">Aktueller Pfad</div>
              <div class="sys-path-value">
                <code class="sys-path-code">{{ workspaceInfo.path || '—' }}</code>
                <button class="btn btn-xs btn-ghost" @click="openWorkspaceFolder" title="Ordner im Explorer öffnen">📂</button>
              </div>
            </div>

            <div class="sys-stats-grid" v-if="workspaceInfo.path">
              <div class="sys-stat">
                <div class="sys-stat-val">{{ workspaceInfo.kundenOrdner || 0 }}</div>
                <div class="sys-stat-lbl">Kunden-Ordner</div>
              </div>
              <div class="sys-stat">
                <div class="sys-stat-val">{{ workspaceInfo.gesamtDateien || 0 }}</div>
                <div class="sys-stat-lbl">Dateien gesamt</div>
              </div>
              <div class="sys-stat">
                <div class="sys-stat-val">{{ workspaceInfo.databaseDir ? '✅' : '—' }}</div>
                <div class="sys-stat-lbl">SQLite-DB</div>
              </div>
            </div>

            <div class="sys-dirs-list" v-if="workspaceInfo.path">
              <div class="sys-dir-row" v-for="dir in workspaceDirs" :key="dir.label">
                <span class="sys-dir-icon">{{ dir.icon }}</span>
                <span class="sys-dir-label">{{ dir.label }}</span>
                <code class="sys-dir-path">{{ dir.path }}</code>
                <button class="btn btn-xs btn-ghost" @click="openFolder(dir.fullPath)" title="Öffnen">📂</button>
              </div>
            </div>

            <div style="margin-top:16px;display:flex;gap:8px">
              <button class="btn btn-sm btn-secondary" @click="changeWorkspace" v-if="isElectron">
                📁 Datenpfad ändern
              </button>
              <button class="btn btn-sm btn-secondary" @click="loadWorkspaceInfo">
                🔄 Aktualisieren
              </button>
            </div>

          </div>
        </div>

        <!-- App-Info -->
        <div class="s-card">
          <div class="s-card-header">
            <h3 class="s-card-title">ℹ️ App-Info</h3>
          </div>
          <div class="s-card-body">
            <table class="sys-info-table">
              <tr><td class="sys-info-label">Version</td><td>{{ appVersion || '—' }}</td></tr>
              <tr><td class="sys-info-label">Node.js</td><td>{{ nodeVersion }}</td></tr>
              <tr><td class="sys-info-label">Electron</td><td>{{ isElectron ? '✅ Aktiv' : '❌ Standalone' }}</td></tr>
              <tr><td class="sys-info-label">PDF-Engine</td><td>{{ isElectron ? 'Electron printToPDF' : 'Browser-Druck' }}</td></tr>
              <tr><td class="sys-info-label">Datenbank</td><td>SQLite (WAL-Mode)</td></tr>
            </table>
          </div>
        </div>

      </div><!-- /system tab -->

    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute }    from 'vue-router'
import { useSettings } from '../stores/useSettings'
import apiClient, { API_BASE } from '../services/api'
import { downloadPdfFromBackend } from '../services/pdfExport.js'

export default {
  name: 'Settings',
  setup() {
    // All possible payment methods
    const availablePaymentMethods = [
      { id: 'Überweisung',      icon: '🏦', label: 'Überweisung'      },
      { id: 'Bar',              icon: '💵', label: 'Bar'              },
      { id: 'EC-Karte',         icon: '💳', label: 'EC-Karte'         },
      { id: 'Kreditkarte',      icon: '💳', label: 'Kreditkarte'      },
      { id: 'PayPal',           icon: '🅿️', label: 'PayPal'           },
      { id: 'SEPA-Lastschrift', icon: '📄', label: 'SEPA-Lastschrift' },
      { id: 'Vorkasse',         icon: '💰', label: 'Vorkasse'         },
    ]

    const settingsStore = useSettings()
    const route         = useRoute()

    const activeTab = ref(route.query.tab || 'company')
    watch(() => route.query.tab, (t) => { if (t) activeTab.value = t })
    watch(activeTab, (t) => { if (t === 'backup') loadBackupList() })

    const saving = ref(false)
    const saved  = ref(false)

    // ── Backup ──────────────────────────────────────────────────────────────
    const backupList          = ref([])
    const backupLoading       = ref(false)
    const backupCreating      = ref(false)
    const backupRestoring     = ref(null)
    const backupMsg           = ref('')
    const backupMsgType       = ref('backup-msg-ok')
    const backupImportInput   = ref(null)
    const backupImportFile    = ref(null)
    const backupImporting     = ref(false)
    const backupImportMsg     = ref('')
    const backupImportMsgType = ref('backup-msg-ok')

    function fmtBackupDate(iso) {
      if (!iso) return '—'
      const d = new Date(iso)
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
           + ' · ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    }

    async function loadBackupList() {
      backupLoading.value = true
      try {
        const r = await apiClient.get('/backup/list')
        backupList.value = r.data.data || []
      } catch (e) {
        console.error('[Backup] Liste laden fehlgeschlagen:', e)
      } finally {
        backupLoading.value = false
      }
    }

    async function createBackup() {
      backupCreating.value = true
      backupMsg.value = ''
      try {
        await apiClient.post('/backup/create')
        backupMsg.value = '✓ Backup erfolgreich erstellt'
        backupMsgType.value = 'backup-msg-ok'
        await loadBackupList()
      } catch (e) {
        backupMsg.value = '✗ Fehler: ' + (e.response?.data?.error || e.message)
        backupMsgType.value = 'backup-msg-err'
      } finally {
        backupCreating.value = false
        setTimeout(() => { backupMsg.value = '' }, 4000)
      }
    }

    async function restoreBackup(filename) {
      if (!confirm('Backup wiederherstellen?\n\n"' + filename + '"\n\nAlle aktuellen Daten werden überschrieben.\nEin Pre-Restore-Backup wird automatisch angelegt.')) return
      backupRestoring.value = filename
      try {
        await apiClient.post('/backup/restore/' + encodeURIComponent(filename))
        alert('✓ Backup erfolgreich wiederhergestellt. Bitte Seite neu laden.')
        location.reload()
      } catch (e) {
        alert('✗ Fehler beim Wiederherstellen: ' + (e.response?.data?.error || e.message))
      } finally {
        backupRestoring.value = null
      }
    }

    async function deleteBackup(filename) {
      if (!confirm('Backup löschen?\n\n"' + filename + '"')) return
      try {
        await apiClient.delete('/backup/' + encodeURIComponent(filename))
        await loadBackupList()
      } catch (e) {
        alert('Fehler beim Löschen: ' + (e.response?.data?.error || e.message))
      }
    }

    function downloadBackup(filename) {
      const base = apiClient.defaults.baseURL || ''
      const url  = base + '/backup/download/' + encodeURIComponent(filename)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    function onBackupFileSelected(e) {
      backupImportFile.value = e.target.files[0] || null
      backupImportMsg.value  = ''
    }

    async function importBackup() {
      if (!backupImportFile.value) return
      if (!confirm('Backup importieren und alle aktuellen Daten überschreiben?\nEin Pre-Restore-Backup wird automatisch erstellt.')) return
      backupImporting.value  = true
      backupImportMsg.value  = ''
      try {
        const fd = new FormData()
        fd.append('backup', backupImportFile.value)
        await apiClient.post('/backup/import', fd)
        backupImportMsg.value     = '✓ Import erfolgreich. Seite wird neu geladen…'
        backupImportMsgType.value = 'backup-msg-ok'
        setTimeout(() => location.reload(), 1800)
      } catch (e) {
        backupImportMsg.value     = '✗ Fehler: ' + (e.response?.data?.error || e.message)
        backupImportMsgType.value = 'backup-msg-err'
      } finally {
        backupImporting.value = false
      }
    }


    // ── Update ──────────────────────────────────────────────────────────────
    const updateFileInput   = ref(null)
    const updateFile        = ref(null)
    const updatePreview     = ref(null)
    const updatePreviewing  = ref(false)
    const updatePreviewErr  = ref('')
    const updateApplying    = ref(false)
    const updateApplyErr    = ref('')
    const updateRestarting  = ref(false)
    const updateRestartCountdown = ref(30)
    const updateHealthPct   = ref(0)

    function onUpdateFileSelected(e) {
      updateFile.value       = e.target.files[0] || null
      updatePreview.value    = null
      updatePreviewErr.value = ''
      updateApplyErr.value   = ''
    }

    function resetUpdate() {
      updateFile.value       = null
      updatePreview.value    = null
      updatePreviewErr.value = ''
      updateApplyErr.value   = ''
      updateRestarting.value = false
      if (updateFileInput.value) updateFileInput.value.value = ''
    }

    async function previewUpdate() {
      if (!updateFile.value) return
      updatePreviewing.value  = true
      updatePreviewErr.value  = ''
      updatePreview.value     = null
      try {
        const fd = new FormData()
        fd.append('update', updateFile.value)
        const r = await apiClient.post('/update/preview', fd)
        updatePreview.value = r.data.data
      } catch (e) {
        updatePreviewErr.value = e.response?.data?.error || e.message
      } finally {
        updatePreviewing.value = false
      }
    }

    async function applyUpdate() {
      if (!updateFile.value) return
      if (!confirm('Update jetzt installieren?\n\nEin Backup wird vor der Installation erstellt.\nDas Backend startet danach automatisch neu.')) return
      updateApplying.value = true
      updateApplyErr.value = ''
      try {
        const fd = new FormData()
        fd.append('update', updateFile.value)
        await apiClient.post('/update/apply', fd)
        // Backend startet neu — wir pollen den Health-Endpoint
        updateRestarting.value = true
        pollBackendRestart()
      } catch (e) {
        // Wenn der Request abbricht weil Backend schon neustartet ist das normal
        const isExpectedDisconnect =
          e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED' ||
          e.message?.includes('Network Error') ||
          e.message?.includes('ERR_EMPTY_RESPONSE')
        if (isExpectedDisconnect) {
          updateRestarting.value = true
          pollBackendRestart()
        } else {
          updateApplyErr.value = e.response?.data?.error || e.message
          updateApplying.value = false
        }
      }
    }

    function pollBackendRestart() {
      updateHealthPct.value = 0
      updateRestartCountdown.value = 30
      let elapsed = 0
      const MAX = 40000 // 40 Sekunden max

      const interval = setInterval(async () => {
        elapsed += 1000
        updateRestartCountdown.value = Math.max(0, Math.round((MAX - elapsed) / 1000))
        updateHealthPct.value = Math.min(95, Math.round((elapsed / MAX) * 100))
        try {
          await apiClient.get('/health')
          // Backend ist wieder da!
          clearInterval(interval)
          updateHealthPct.value = 100
          setTimeout(() => location.reload(), 800)
        } catch {
          // noch nicht bereit
        }
        if (elapsed >= MAX) {
          clearInterval(interval)
          updateApplyErr.value = 'Backend antwortet nicht. Bitte manuell neu starten.'
          updateRestarting.value = false
          updateApplying.value   = false
        }
      }, 1000)
    }

    const theme  = computed(() => settingsStore.theme)

    // ── Navigations-Gruppen ──────────────────────────────────────────────────
    // Struktur: direkter Tab ({ id, icon, label, count })
    //           oder Gruppe ({ group, icon, label, children: [...] })
    const navItems = computed(() => [
      // ── Studio & Zahlen ───────────────────────────────────────────────────
      { id: 'company',    icon: '🏢', label: 'Studio',           count: null },
      { id: 'numbers',    icon: '🔢', label: 'Nummernkreise',    count: null },

      // ── Aufträge & Abrechnung ─────────────────────────────────────────────
      {
        group:    'auftrag',
        icon:     '📋',
        label:    'Auftrag',
        children: [
          { id: 'booking',  icon: '📋', label: 'Buchung & Storno', count: null },
          { id: 'calendar', icon: '📅', label: 'Kalender',         count: null },
        ],
      },

      // ── Rechtsdokumente ───────────────────────────────────────────────────
      {
        group:    'recht',
        icon:     '📝',
        label:    'Rechtsdoks',
        children: [
          { id: 'clauses', icon: '📝', label: 'Vertragswesen', count: null },
          { id: 'agb',     icon: '§',  label: 'AGB',           count: agbParagraphs.value.length || null },
          { id: 'dsgvo',   icon: '🔒', label: 'DSGVO',         count: dsgvoParagraphs.value.length || null },
          { id: 'adv',     icon: '📋', label: 'ADV-Vertrag',   count: advParagraphs.value.length || null },
        ],
      },

      // ── Kommunikation ─────────────────────────────────────────────────────
      { id: 'email',      icon: '✉️',  label: 'E-Mail',           count: null },

      // ── Darstellung ───────────────────────────────────────────────────────
      { id: 'appearance', icon: '🎨', label: 'Darstellung',       count: null },

      // ── System ────────────────────────────────────────────────────────────
      {
        group:    'system',
        icon:     '⚙️',
        label:    'System',
        children: [
          { id: 'backup', icon: '💾', label: 'Backup', count: null },
          { id: 'update', icon: '🔄', label: 'Update', count: null },
          { id: 'system', icon: '⚙️', label: 'System', count: null },
        ],
      },
    ])

    // Kompatibilität: allTabs für Code der darauf referenziert
    const allTabs = computed(() => navItems.value.flatMap(
      item => item.children ? item.children : [item]
    ))

    // Aktive Gruppe (Dropdown offen)
    const openGroup = ref(null)

    function selectTab(id) {
      if (id) {
        activeTab.value = id
        openGroup.value = null
      }
    }

    const isSettingsTab = computed(() =>
      ['company', 'numbers', 'appearance', 'clauses', 'agb', 'dsgvo', 'adv', 'booking', 'calendar'].includes(activeTab.value)
    )

    const form = ref({
      numberSchemas: {
        customer: { prefix: 'K',   separator: '-', digits: 5 },
        quote:    { prefix: 'A',   separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true },
        invoice:  { prefix: 'RE',  separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true },
        delivery: { format: 'LS-{jjjj}-{mm}/{z,5}', start: 1 },
        article:  { prefix: 'ART', separator: '-', digits: 5 },
        supplier: { format: 'L-{z,5}', start: 1 },
        contract: { prefix: 'V',   separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true },
        addendum: { prefix: 'VN',  separator: '-', innerSeparator: '/', digits: 5, useYear: true, useMonth: true },
        correction:   { prefix: 'KOR',    separator: '-' },
        cancellation: { prefix: 'STORNO', separator: '-' },
      },
      company: {
        name: '', businessType: '', owner: '', taxNumber: '', vatId: '',
        smallBusiness: false, street: '', zipCode: '', city: '',
        phone: '', email: '', website: '',
        bankName: '', iban: '', bic: '',
        invoiceIntro: '', invoiceFooter: '', logoUrl: '',
      },
      bookingTerms: {
        depositRate: 20,
        requireConsultation: false,
        defaultHourlyRate: 250,
        defaultKmRate: 0.50,
        defaultKmFree: 30,
        usageRightsMode: 'simple',
        hourlyRatePhotoPrivat: 250,
        hourlyRatePhotoB2B:    200,
        hourlyRatePhotoSetup:  100,
        hourlyRateVideoPrivat: 250,
        hourlyRateVideoB2B:    200,
        hourlyRateVideoSetup:  100,
        imagePricePrivat:      40,
        imagePriceB2B:         60,
        videoPer10min:         1200,
        enabledPaymentMethods: ['Überweisung', 'Bar', 'PayPal', 'SEPA-Lastschrift', 'Vorkasse'],
        cancellationFees: [
          { daysBeforeEvent: 90, feePercent: 25,  label: 'bis 90 Tage vor dem Termin' },
          { daysBeforeEvent: 60, feePercent: 50,  label: 'bis 60 Tage vor dem Termin' },
          { daysBeforeEvent: 30, feePercent: 75,  label: 'bis 30 Tage vor dem Termin' },
          { daysBeforeEvent: 14, feePercent: 90,  label: 'bis 14 Tage vor dem Termin' },
          { daysBeforeEvent: 0,  feePercent: 100, label: 'ab 14 Tage vor dem Termin oder Nichterscheinen' },
        ],
      },
      usageSurchargeMatrix: {
        regional:      {'1 Jahr': 10, '2 Jahre': 15, '3 Jahre': 20, '5 Jahre': 25, 'unbegrenzt': 30},
        national:      {'1 Jahr': 20, '2 Jahre': 30, '3 Jahre': 40, '5 Jahre': 55, 'unbegrenzt': 75},
        eu:            {'1 Jahr': 35, '2 Jahre': 50, '3 Jahre': 65, '5 Jahre': 90, 'unbegrenzt': 120},
        international: {'1 Jahr': 60, '2 Jahre': 85, '3 Jahre': 110, '5 Jahre': 150, 'unbegrenzt': 200},
      },
      contractParagraphs: {
        leistungBoilerplate: '', verguetungHourlyNote: '', verguetungFlatNote: '',
        zahlungsverzug: '', anzahlungText: '', stornierungNote: '', fotografStorniertText: '',
        urheberrechtPrivat: '', urheberrechtKommerziell: '', urheberrechtBearbeitung: '',
        lieferungText: '', archivierungText: '', abnahmeText: '',
        haftungGrundsatz: '', haftungDatenverlust: '', haftungUnbeeinflusst: '',
        mitwirkungText: '', sonstigeText: '',
      },
      contractClauses: {
        archiveDuration: 3,
        archiveRawDuration: 1,
        minCopyrightDamagePercent: 100,
        equipmentDamageText: '',
        commercialSurchargeNote: '',
        specialClauses: [],
      },
      locale: 'de', currency: 'EUR',
      emailConfig: { host:'', port:587, secure:false, user:'', pass:'', fromName:'', fromEmail:'' },
    })

    watch(() => settingsStore.settings?.contractParagraphsList, (val) => {
      if (val && !cpDirty.value) loadCpParagraphs()
    }, { immediate: true })

    watch(() => settingsStore.settings?.agbParagraphs, (val) => {
      if (val && !agbDirty.value) loadAgbParagraphs()
    }, { immediate: true })

    // ── Logo ── (muss VOR onMounted deklariert sein, damit der Hook darauf zugreifen kann)
    const fileInput     = ref(null)
    const previewUrl    = ref('')
    const logoUploading = ref(false)
    const logoError     = ref('')
    const dragOver      = ref(false)

    onMounted(async () => {
      try { await settingsStore.fetchSettings() } catch(e) { console.error("[Settings] Backend nicht erreichbar:", e.message) }
      loadBackupList()
      loadBackupList()
      const s = settingsStore.settings || {}
      form.value = {
        ...form.value, ...s,
        locale: s.locale || 'de', currency: s.currency || 'EUR',
        company: { ...form.value.company, ...(s.company || {}) },
        bookingTerms: {
          depositRate: s.bookingTerms?.depositRate ?? form.value.bookingTerms.depositRate,
          cancellationFees: s.bookingTerms?.cancellationFees?.length
            ? s.bookingTerms.cancellationFees.map(t => ({ ...t }))
            : form.value.bookingTerms.cancellationFees.map(t => ({ ...t })),
          requireConsultation: s.bookingTerms?.requireConsultation ?? false,
          defaultHourlyRate:   s.bookingTerms?.defaultHourlyRate   ?? 250,
          defaultKmRate:       s.bookingTerms?.defaultKmRate        ?? 0.50,
          defaultKmFree:       s.bookingTerms?.defaultKmFree        ?? 30,
          usageRightsMode:     s.bookingTerms?.usageRightsMode      ?? 'simple',
          hourlyRatePhotoPrivat: s.bookingTerms?.hourlyRatePhotoPrivat ?? 250,
          hourlyRatePhotoB2B:    s.bookingTerms?.hourlyRatePhotoB2B    ?? 200,
          hourlyRatePhotoSetup:  s.bookingTerms?.hourlyRatePhotoSetup  ?? 100,
          hourlyRateVideoPrivat: s.bookingTerms?.hourlyRateVideoPrivat ?? 250,
          hourlyRateVideoB2B:    s.bookingTerms?.hourlyRateVideoB2B    ?? 200,
          hourlyRateVideoSetup:  s.bookingTerms?.hourlyRateVideoSetup  ?? 100,
          imagePricePrivat:      s.bookingTerms?.imagePricePrivat      ?? 40,
          imagePriceB2B:         s.bookingTerms?.imagePriceB2B         ?? 60,
          videoPer10min:         s.bookingTerms?.videoPer10min          ?? 1200,
          enabledPaymentMethods: s.bookingTerms?.enabledPaymentMethods?.length
            ? s.bookingTerms.enabledPaymentMethods
            : ['Überweisung', 'Bar', 'PayPal', 'SEPA-Lastschrift', 'Vorkasse'],
        },
        usageSurchargeMatrix: {
          regional:      { ...(s.usageSurchargeMatrix?.regional      || {}) },
          national:      { ...(s.usageSurchargeMatrix?.national      || {}) },
          eu:            { ...(s.usageSurchargeMatrix?.eu            || {}) },
          international: { ...(s.usageSurchargeMatrix?.international || {}) },
        },
        contractParagraphs: { ...form.value.contractParagraphs, ...(s.contractParagraphs || {}) },
        contractClauses: {
          archiveDuration:              s.contractClauses?.archiveDuration              ?? 3,
          archiveRawDuration:           s.contractClauses?.archiveRawDuration           ?? 1,
          minCopyrightDamagePercent:    s.contractClauses?.minCopyrightDamagePercent    ?? 100,
          equipmentDamageText:          s.contractClauses?.equipmentDamageText          ?? '',
          commercialSurchargeNote:      s.contractClauses?.commercialSurchargeNote      ?? '',
          specialClauses: s.contractClauses?.specialClauses?.length
            ? s.contractClauses.specialClauses.map(cl => ({ ...cl }))
            : [],
        },
        numberSchemas: {
          customer:     { ...form.value.numberSchemas.customer,     ...(s.numberSchemas?.customer     || {}) },
          quote:        { ...form.value.numberSchemas.quote,        ...(s.numberSchemas?.quote        || {}) },
          invoice:      { ...form.value.numberSchemas.invoice,      ...(s.numberSchemas?.invoice      || {}) },
          delivery:     { ...form.value.numberSchemas.delivery,     ...(s.numberSchemas?.delivery     || {}) },
          correction:   { ...form.value.numberSchemas.correction,   ...(s.numberSchemas?.correction   || {}) },
          cancellation: { ...form.value.numberSchemas.cancellation, ...(s.numberSchemas?.cancellation || {}) },
          article:      { ...form.value.numberSchemas.article,      ...(s.numberSchemas?.article      || {}) },
          supplier:     { ...form.value.numberSchemas.supplier,     ...(s.numberSchemas?.supplier     || {}) },
          contract:     { ...form.value.numberSchemas.contract,     ...(s.numberSchemas?.contract     || {}) },
          addendum:     { ...form.value.numberSchemas.addendum,     ...(s.numberSchemas?.addendum     || {}) },
        },
        calendarSettings: {
          quoteFollowUpDays:   s.calendarSettings?.quoteFollowUpDays ?? 14,
          bundeslaender:       Array.isArray(s.calendarSettings?.bundeslaender) ? [...s.calendarSettings.bundeslaender] : ['MV'],
          ferienBundeslaender: Array.isArray(s.calendarSettings?.ferienBundeslaender) ? [...s.calendarSettings.ferienBundeslaender] : [],
        },
        emailConfig: {
          host:      s.emailConfig?.host      || '',
          port:      s.emailConfig?.port      || 587,
          secure:    s.emailConfig?.secure    ?? false,
          user:      s.emailConfig?.user      || '',
          pass:      s.emailConfig?.pass      || '',
          fromName:  s.emailConfig?.fromName  || '',
          fromEmail: s.emailConfig?.fromEmail || '',
        },
      }
      // Logo-Preview nach dem Befüllen von form setzen
      // Prüfen ob die Datei tatsächlich existiert (404 → Hinweis anzeigen)
      if (form.value.company.logoUrl && !previewUrl.value) {
        const logoCheckUrl = `${API_BASE}${form.value.company.logoUrl}?t=${Date.now()}`
        try {
          const check = await fetch(logoCheckUrl, { method: 'HEAD' })
          if (check.ok) {
            previewUrl.value = logoCheckUrl
          } else {
            logoError.value = '⚠ Logo-Datei nicht gefunden (wurde die App neu installiert?). Bitte Logo erneut hochladen.'
            form.value.company.logoUrl = ''
          }
        } catch {
          logoError.value = '⚠ Logo konnte nicht geprüft werden — Backend erreichbar?'
        }
      }
      loadWorkDir()
      loadPfsDataPath()
    })

    function triggerFileInput() { fileInput.value?.click() }
    function onFileSelected(e) { const f = e.target.files?.[0]; if (f) uploadLogo(f) }
    function onDrop(e) { dragOver.value = false; const f = e.dataTransfer.files?.[0]; if (f) uploadLogo(f) }

    async function uploadLogo(file) {
      logoError.value = ''; logoUploading.value = true
      previewUrl.value = URL.createObjectURL(file)
      try {
        const fd = new FormData(); fd.append('logo', file)
        const res = await apiClient.post('/settings/logo', fd)
        form.value.company.logoUrl = res.data.logoUrl
        previewUrl.value = `${API_BASE}${res.data.logoUrl}?t=${Date.now()}`
      } catch (e) {
        logoError.value = 'Upload fehlgeschlagen: ' + (e.response?.data?.error || e.message)
        previewUrl.value = ''
      } finally {
        logoUploading.value = false
        if (fileInput.value) fileInput.value.value = ''
      }
    }

    async function removeLogo() {
      try {
        await apiClient.delete('/settings/logo')
        previewUrl.value = ''; form.value.company.logoUrl = ''
      } catch (e) { logoError.value = 'Fehler: ' + e.message }
    }

    // ── Vertragsvorlage ──────────────────────────────────────────
    function fmtFileSize(bytes) {
      if (!bytes) return ''
      if (bytes < 1024)        return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
    function fmtDate(iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    // ── Number previews ──
    function buildFromFormat(fmt, key) {
      if (!fmt) return '—'
      const now  = new Date()
      const yyyy = String(now.getFullYear())
      const yy   = yyyy.slice(2)
      const mm   = String(now.getMonth() + 1).padStart(2, '0')
      const dd   = String(now.getDate()).padStart(2, '0')
      const n    = form.value.numberSchemas[key]?.start ?? 1
      return fmt
        .replace(/\{jjjj\}/gi, yyyy)
        .replace(/\{jj\}/gi,   yy)
        .replace(/\{mm\}/gi,   mm)
        .replace(/\{tt\}/gi,   dd)
        .replace(/\{datum\}/gi, `${dd}.${mm}.${yyyy}`)
        .replace(/\{z,(\d+)\}/gi,  (_, d) => String(n).padStart(Number(d), '0'))
        .replace(/\{zj,(\d+)\}/gi, (_, d) => String(n).padStart(Number(d), '0'))
        .replace(/\{zm,(\d+)\}/gi, (_, d) => String(n).padStart(Number(d), '0'))
        .replace(/\{zt,(\d+)\}/gi, (_, d) => String(n).padStart(Number(d), '0'))
        .replace(/\{z\}/gi, String(n)).replace(/\{zj\}/gi, String(n))
        .replace(/\{zm\}/gi, String(n)).replace(/\{zt\}/gi, String(n))
    }
    const numTokens = [
      { token: '{jjjj}',  label: 'Jahr (vierstellig)', hint: 'Beispiel: 2026' },
      { token: '{jj}',    label: 'Jahr (zweistellig)', hint: 'Beispiel: 26' },
      { token: '{mm}',    label: 'Monat',              hint: 'Beispiel: 03' },
      { token: '{tt}',    label: 'Tag',                hint: 'Beispiel: 16' },
      { token: '{datum}', label: 'Komplettes Datum',   hint: 'Beispiel: 16.03.2026' },
      { token: '{z,5}',   label: 'Fortlaufender Zähler', hint: 'Stellen: {z,3}→001' },
      { token: '{zj,5}',  label: 'Jahreszähler',       hint: 'Zurückgesetzt jedes Jahr' },
      { token: '{zm,5}',  label: 'Monatszähler',       hint: 'Zurückgesetzt jeden Monat' },
      { token: '{zt,5}',  label: 'Tageszähler',        hint: 'Zurückgesetzt täglich' },
    ]
    const numSchemasDocs = [
      { key: 'quote',    label: 'Angebotsnummer',   placeholder: 'A-{jjjj}-{mm}/{z,5}',   hasStart: true },
      { key: 'invoice',  label: 'Rechnungsnummer',  placeholder: 'RE-{jjjj}-{mm}/{z,5}',  hasStart: true },
      { key: 'delivery', label: 'Lieferscheinnummer', placeholder: 'LS-{jjjj}-{mm}/{z,5}', hasStart: true },
      { key: 'contract', label: 'Vertragsnummer',   placeholder: 'V-{jjjj}-{mm}/{z,5}',   hasStart: false },
      { key: 'addendum', label: 'Nachtragnummer',   placeholder: 'VN-{jjjj}-{mm}/{z,5}',  hasStart: false },
    ]
    const numSchemasStamm = [
      { key: 'customer', label: 'Kundennummer',     placeholder: 'K-{z,5}',    hasStart: false },
      { key: 'supplier', label: 'Lieferantennummer', placeholder: 'L-{z,5}',   hasStart: false },
      { key: 'article',  label: 'Artikelnummer',    placeholder: 'ART-{z,5}',  hasStart: false },
    ]
    // Storno & Korrektur: Präfix-basiert (werden aus Originalnummer abgeleitet)
    const numSchemasAbgeleitet = [
      { key: 'correction',   label: 'Korrekturrechnung', hint: 'Wird automatisch aus der Originalnummer abgeleitet: KOR-RE-2026-03/00042' },
      { key: 'cancellation', label: 'Stornorechnung',    hint: 'Wird automatisch aus der Originalnummer abgeleitet: STORNO-RE-2026-03/00042' },
    ]

    const previewCustomer = computed(() => buildFromFormat(form.value.numberSchemas.customer?.format, 'customer'))
    const previewArticle  = computed(() => buildFromFormat(form.value.numberSchemas.article?.format,  'article'))
    const previewQuote    = computed(() => buildFromFormat(form.value.numberSchemas.quote?.format,    'quote'))
    const previewInvoice  = computed(() => buildFromFormat(form.value.numberSchemas.invoice?.format,  'invoice'))
    const previewContract = computed(() => buildFromFormat(form.value.numberSchemas.contract?.format, 'contract'))
    const previewAddendum = computed(() => buildFromFormat(form.value.numberSchemas.addendum?.format, 'addendum'))

    const applyTheme = (t) => settingsStore.setTheme(t)

    async function saveAll() {
      // Always include current agbParagraphs + contractParagraphsList in save
      form.value.agbParagraphs           = agbParagraphs.value
      form.value.contractParagraphsList  = contractParagraphsList.value
      form.value.dsgvoParagraphs         = dsgvoParagraphs.value
      form.value.advParagraphs           = advParagraphs.value
      agbDirty.value = false
      cpDirty.value  = false
      dsgvoDirty.value = false
      advDirty.value   = false

      saving.value = true; saved.value = false
      try {
        await settingsStore.saveSettings(form.value)
        saved.value = true
        setTimeout(() => { saved.value = false }, 3000)
      } catch (e) { console.error(e) }
      finally { saving.value = false }
    }

    // ── Buchungskonditionen Helpers ──


    // ══ Vertragsparagraphen ═══════════════════════════════════════════════════
    const contractParagraphsList = ref([])
    const cpDirty                = ref(false)
    let _cpIdCounter             = 200

    function loadCpParagraphs() {
      const data = settingsStore.settings?.contractParagraphsList
      contractParagraphsList.value = Array.isArray(data) ? data.map(p => ({
        ...p,
        items: (p.items || []).map(it => ({ ...it }))
      })) : []
    }

    function addCpParagraph() {
      contractParagraphsList.value.push({
        id:    `cp_new_${++_cpIdCounter}`,
        title: '',
        items: [],
      })
      cpDirty.value = true
    }

    function deleteCpPara(idx) {
      if (!confirm(`Paragraph „${contractParagraphsList.value[idx].title || 'Ohne Titel'}" wirklich löschen?`)) return
      contractParagraphsList.value.splice(idx, 1)
      cpDirty.value = true
    }

    function moveCpPara(idx, dir) {
      const arr  = contractParagraphsList.value
      const dest = idx + dir
      if (dest < 0 || dest >= arr.length) return
      const tmp  = arr[idx]; arr[idx] = arr[dest]; arr[dest] = tmp
      cpDirty.value = true
    }

    function addCpItem(paraIdx) {
      const para = contractParagraphsList.value[paraIdx]
      if (!para.items) para.items = []
      para.items.push({ label: '', text: '' })
      cpDirty.value = true
    }

    function deleteCpItem(paraIdx, itemIdx) {
      const para = contractParagraphsList.value[paraIdx]
      if (para.items) para.items.splice(itemIdx, 1)
      cpDirty.value = true
    }

    // ══ AGB Paragraphen ═══════════════════════════════════════════════════
    const agbParagraphs = ref([])
    const agbDirty      = ref(false)
    let _agbIdCounter   = 100

    function loadAgbParagraphs() {
      const data = settingsStore.settings?.agbParagraphs
      agbParagraphs.value = Array.isArray(data) ? data.map(p => ({ ...p })) : []
    }

    function addAgbParagraph() {
      agbParagraphs.value.push({
        id:      `agb_new_${++_agbIdCounter}`,
        title:   '',
        content: '',
      })
      agbDirty.value = true
      // Scroll to bottom
      setTimeout(() => {
        const list = document.querySelector('.agb-list')
        if (list) list.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }

    function deleteAgbPara(idx) {
      if (!confirm(`§ ${idx + 1} „${agbParagraphs.value[idx].title || 'Ohne Titel'}" wirklich löschen?`)) return
      agbParagraphs.value.splice(idx, 1)
      agbDirty.value = true
    }

    function addAgbItem(paraIdx) {
      const para = agbParagraphs.value[paraIdx]
      if (!para.items) para.items = []
      para.items.push('')
      agbDirty.value = true
    }

    function deleteAgbItem(paraIdx, itemIdx) {
      const para = agbParagraphs.value[paraIdx]
      if (!para.items) return
      para.items.splice(itemIdx, 1)
      agbDirty.value = true
    }

    function autoResizeAGB(e) {
      const ta = e.target
      ta.style.height = 'auto'
      ta.style.height = ta.scrollHeight + 'px'
    }

    function moveAgbPara(idx, dir) {
      const arr  = agbParagraphs.value
      const dest = idx + dir
      if (dest < 0 || dest >= arr.length) return
      const tmp  = arr[idx]
      arr[idx]   = arr[dest]
      arr[dest]  = tmp
      agbDirty.value = true
    }

    // ══ DSGVO Paragraphen ════════════════════════════════════════════════════
    const dsgvoParagraphs = ref([])
    const dsgvoDirty      = ref(false)
    let _dsgvoIdCounter   = 300

    function loadDsgvoParagraphs() {
      const data = settingsStore.settings?.dsgvoParagraphs
      dsgvoParagraphs.value = Array.isArray(data) ? data.map(p => ({ ...p, items: [...(p.items||[])] })) : []
    }
    watch(() => settingsStore.settings?.dsgvoParagraphs, (val) => {
      if (val && !dsgvoDirty.value) loadDsgvoParagraphs()
    }, { immediate: true })

    function addDsgvoParagraph() {
      dsgvoParagraphs.value.push({ id: `dsgvo_new_${++_dsgvoIdCounter}`, title: '', items: [] })
      dsgvoDirty.value = true
    }
    function deleteDsgvoPara(idx) {
      if (!confirm(`Abschnitt "${dsgvoParagraphs.value[idx].title||'Ohne Titel'}" löschen?`)) return
      dsgvoParagraphs.value.splice(idx, 1); dsgvoDirty.value = true
    }
    function moveDsgvoPara(idx, dir) {
      const arr = dsgvoParagraphs.value; const dest = idx+dir
      if (dest<0||dest>=arr.length) return
      const tmp=arr[idx]; arr[idx]=arr[dest]; arr[dest]=tmp; dsgvoDirty.value=true
    }
    function addDsgvoItem(paraIdx) {
      const p = dsgvoParagraphs.value[paraIdx]
      if (!p.items) p.items=[]
      p.items.push(''); dsgvoDirty.value=true
    }
    function deleteDsgvoItem(paraIdx, itemIdx) {
      dsgvoParagraphs.value[paraIdx].items?.splice(itemIdx,1); dsgvoDirty.value=true
    }

    // ══ ADV Paragraphen ══════════════════════════════════════════════════════
    const advParagraphs = ref([])
    const advDirty      = ref(false)
    let _advIdCounter   = 400

    function loadAdvParagraphs() {
      const data = settingsStore.settings?.advParagraphs
      advParagraphs.value = Array.isArray(data) ? data.map(p => ({ ...p, items: [...(p.items||[])] })) : []
    }
    watch(() => settingsStore.settings?.advParagraphs, (val) => {
      if (val && !advDirty.value) loadAdvParagraphs()
    }, { immediate: true })

    function addAdvParagraph() {
      advParagraphs.value.push({ id: `adv_new_${++_advIdCounter}`, title: '', items: [] })
      advDirty.value = true
    }
    function deleteAdvPara(idx) {
      if (!confirm(`Abschnitt "${advParagraphs.value[idx].title||'Ohne Titel'}" löschen?`)) return
      advParagraphs.value.splice(idx, 1); advDirty.value = true
    }
    function moveAdvPara(idx, dir) {
      const arr = advParagraphs.value; const dest = idx+dir
      if (dest<0||dest>=arr.length) return
      const tmp=arr[idx]; arr[idx]=arr[dest]; arr[dest]=tmp; advDirty.value=true
    }
    function addAdvItem(paraIdx) {
      const p = advParagraphs.value[paraIdx]
      if (!p.items) p.items=[]
      p.items.push(''); advDirty.value=true
    }
    function deleteAdvItem(paraIdx, itemIdx) {
      advParagraphs.value[paraIdx].items?.splice(itemIdx,1); advDirty.value=true
    }

    function addCancellationTier() {
      form.value.bookingTerms.cancellationFees.push({
        daysBeforeEvent: 30, feePercent: 50, label: 'bis 30 Tage vor dem Termin'
      })
    }
    function removeCancellationTier(idx) {
      form.value.bookingTerms.cancellationFees.splice(idx, 1)
    }

    // ── Kalender Tab ─────────────────────────────────────────────────────
    const bundeslaenderList = [
      { code: 'BW', label: 'Baden-Württemberg' },
      { code: 'BY', label: 'Bayern' },
      { code: 'BE', label: 'Berlin' },
      { code: 'BB', label: 'Brandenburg' },
      { code: 'HB', label: 'Bremen' },
      { code: 'HH', label: 'Hamburg' },
      { code: 'HE', label: 'Hessen' },
      { code: 'MV', label: 'Mecklenburg-Vorpommern' },
      { code: 'NI', label: 'Niedersachsen' },
      { code: 'NW', label: 'Nordrhein-Westfalen' },
      { code: 'RP', label: 'Rheinland-Pfalz' },
      { code: 'SL', label: 'Saarland' },
      { code: 'SN', label: 'Sachsen' },
      { code: 'ST', label: 'Sachsen-Anhalt' },
      { code: 'SH', label: 'Schleswig-Holstein' },
      { code: 'TH', label: 'Thüringen' },
    ]

    function toggleCalBl(code, field) {
      if (!form.value.calendarSettings) form.value.calendarSettings = {}
      const arr = Array.isArray(form.value.calendarSettings[field]) ? [...form.value.calendarSettings[field]] : []
      const idx = arr.indexOf(code)
      if (idx === -1) arr.push(code)
      else arr.splice(idx, 1)
      form.value.calendarSettings[field] = arr
    }

    // Einzelauswahl per <select> (setzt genau ein Bundesland)
    function toggleCalBlSingle(code, field) {
      if (!form.value.calendarSettings) form.value.calendarSettings = {}
      if (!code) return
      form.value.calendarSettings[field] = [code]
    }

    // Feiertags-Cache leeren
    const cacheClearLoading = ref(false)
    const cacheClearMsg     = ref('')
    async function clearHolidayCache() {
      cacheClearLoading.value = true
      cacheClearMsg.value = ''
      try {
        await apiClient.delete('/holidays/cache')
        cacheClearMsg.value = '✓ Cache geleert'
        setTimeout(() => { cacheClearMsg.value = '' }, 3000)
      } catch (e) {
        cacheClearMsg.value = 'Fehler beim Leeren'
      } finally {
        cacheClearLoading.value = false
      }
    }

    // ── E-Mail Test ──────────────────────────────────────────────────────────
    const emailTestLoading = ref(false)
    const emailTestResult  = ref(null)
    async function sendTestMail() {
      emailTestLoading.value = true
      emailTestResult.value  = null
      try {
        // Fix: zuerst aktuelle SMTP-Einstellungen speichern,
        // damit der Backend-Test die Formular-Werte benutzt
        // (nicht veraltete Werte aus der Datei)
        await settingsStore.saveSettings(form.value)

        // Fix: relative URL statt hardcoded localhost verwenden
        const r = await apiClient.post('/email/test', {})
        emailTestResult.value = { ok: true, message: r.data?.message || 'Test-Mail gesendet!' }
      } catch(e) {
        const msg = e.response?.data?.error || e.message || 'Fehler beim Senden'
        emailTestResult.value = { ok: false, message: msg }
      } finally { emailTestLoading.value = false }
    }



    // ── PDF direkt speichern (Electron IPC) ──────────────────────────────────
    async function savePdf(apiPath, filename) {
      try {
        await downloadPdfFromBackend(apiPath, filename)
      } catch(e) {
        console.error('PDF-Fehler:', e)
      }
    }

    // ── Workspace / System ──────────────────────────────────────────────────
    const workspaceInfo = ref({})
    const appVersion = ref('')
    const isElectron = ref(!!window.pixframe?.isElectron)
    const nodeVersion = typeof process !== 'undefined' ? (process.versions?.node || '—') : '—'

    const workspaceDirs = computed(() => {
      const w = workspaceInfo.value
      if (!w.path) return []
      return [
        { icon: '📊', label: 'Datenbank',  path: 'database/',  fullPath: w.databaseDir },
        { icon: '📁', label: 'Aufträge',   path: 'auftraege/', fullPath: w.auftraegeDir },
        { icon: '📤', label: 'Uploads',    path: 'uploads/',   fullPath: w.uploadsDir },
        { icon: '💾', label: 'Backups',    path: 'backups/',   fullPath: w.backupsDir },
      ].filter(d => d.fullPath)
    })

    async function loadWorkspaceInfo() {
      try {
        const res = await fetch(`${API_BASE}/api/workspace/info`)
        const json = await res.json()
        workspaceInfo.value = json.data || {}
      } catch (e) {
        console.warn('Workspace-Info nicht ladbar:', e.message)
      }
    }

    function openWorkspaceFolder() {
      if (window.pixframe?.openFolder && workspaceInfo.value.path) {
        window.pixframe.openFolder(workspaceInfo.value.path)
      }
    }

    function openFolder(folderPath) {
      if (window.pixframe?.openFolder && folderPath) {
        window.pixframe.openFolder(folderPath)
      }
    }

    async function changeWorkspace() {
      if (window.pixframe?.changeWorkspace) {
        await window.pixframe.changeWorkspace()
      }
    }

    // App-Version laden
    if (window.pixframe?.getAppVersion) {
      window.pixframe.getAppVersion().then(v => { appVersion.value = v })
    }

    // Workspace-Info beim Tab-Wechsel laden
    watch(activeTab, (tab) => {
      if (tab === 'system') loadWorkspaceInfo()
    })

    // ── PFS-Data / NAS-Pfad ───────────────────────────────────────────────────
    return {
      availablePaymentMethods, savePdf,
      workspaceInfo, workspaceDirs, appVersion, isElectron, nodeVersion,
      loadWorkspaceInfo, openWorkspaceFolder, openFolder, changeWorkspace,

      activeTab, allTabs, navItems, openGroup, selectTab, isSettingsTab,

      form, saving, saved, theme, applyTheme, saveAll,
      addCancellationTier, removeCancellationTier,
      bundeslaenderList, toggleCalBl,
      emailTestLoading, emailTestResult, sendTestMail, toggleCalBlSingle,
      clearHolidayCache, cacheClearLoading, cacheClearMsg,
      previewCustomer, previewArticle, previewQuote, previewInvoice,
      previewContract, previewAddendum,
      fileInput, previewUrl, logoUploading, logoError, dragOver,
      triggerFileInput, onFileSelected, onDrop, removeLogo,
      fmtFileSize, fmtDate,
      agbParagraphs, agbDirty, addAgbParagraph, deleteAgbPara, moveAgbPara,
      addAgbItem, deleteAgbItem, autoResizeAGB,
      contractParagraphsList, cpDirty, addCpParagraph, deleteCpPara, moveCpPara,
      addCpItem, deleteCpItem,
      dsgvoParagraphs, dsgvoDirty, addDsgvoParagraph, deleteDsgvoPara, moveDsgvoPara, addDsgvoItem, deleteDsgvoItem,
      advParagraphs, advDirty, addAdvParagraph, deleteAdvPara, moveAdvPara, addAdvItem, deleteAdvItem,
      numTokens, numSchemasDocs, numSchemasStamm, numSchemasAbgeleitet, buildFromFormat,
      backupList, backupLoading, backupCreating, backupRestoring,
      backupMsg, backupMsgType, backupImportInput, backupImportFile,
      backupImporting, backupImportMsg, backupImportMsgType,
      fmtBackupDate, loadBackupList, createBackup, restoreBackup, deleteBackup, downloadBackup,
      onBackupFileSelected, importBackup,
      updateFileInput, updateFile, updatePreview, updatePreviewing, updatePreviewErr,
      updateApplying, updateApplyErr, updateRestarting, updateRestartCountdown, updateHealthPct,
      onUpdateFileSelected, resetUpdate, previewUpdate, applyUpdate
    }
  }
}
</script>

<style scoped>
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

/* ── Horizontale Nav ── */
.settings-nav {
  display: flex; align-items: stretch; flex: 1; min-width: 0;
  overflow: visible; /* WICHTIG: visible damit Dropdown nicht geclippt wird */
}

/* ── Basis-Tab ── */
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

/* ── Badge ── */
.s-tab-badge {
  background: var(--primary-light); color: var(--primary-text);
  font-size: 10px; font-weight: 700;
  padding: 1px 6px; border-radius: 10px; line-height: 1.4;
}

/* ── Gruppe ── */
.s-group {
  position: relative; display: flex; align-items: stretch;
}
.s-group-btn {
  /* erbt .s-tab — kein extra Styling nötig */
}
/* Gruppe aktiv (Kind-Tab ist aktiv) */
.group-active > .s-group-btn {
  color: var(--primary); border-bottom-color: var(--primary); font-weight: 600;
}
.s-active-child {
  font-size: 11px; color: var(--primary); opacity: .8; margin-left: 1px;
}

/* Pfeil-Indikator */
.s-group-arrow {
  font-size: 14px; display: inline-block;
  transition: transform .18s;
  margin-left: 1px; opacity: .5;
  transform: rotate(90deg);  /* › nach unten = ↓ */
}
.s-group-arrow.open { transform: rotate(270deg); opacity: .8; }

/* ── Dropdown ── */
.s-dropdown {
  position: absolute; top: calc(100% + 1px); left: 0;
  min-width: 180px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  padding: 4px;
  z-index: 9999;
  /* Schöner Einblend-Effekt */
  animation: ddFadeIn .14s ease;
}
@keyframes ddFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.s-dropdown-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 12px;
  border: none; background: none; cursor: pointer;
  font-size: 13px; font-weight: 500; font-family: inherit;
  color: var(--text); border-radius: 6px; text-align: left;
  transition: background .1s, color .1s;
}
.s-dropdown-item:hover  { background: var(--hover-bg, rgba(79,70,229,.07)); color: var(--primary); }
.s-dropdown-item.active { background: var(--primary-light); color: var(--primary); font-weight: 600; }
.s-dropdown-item.disabled { opacity: .45; cursor: not-allowed; }
.s-dd-icon { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }

/* ── Speichern-Zone ── */
.save-zone  { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.saved-msg  { font-size: 12px; color: var(--success); font-weight: 600; white-space: nowrap; }

.fade-in-enter-active, .fade-in-leave-active { transition: opacity .2s; }
.fade-in-enter-from,   .fade-in-leave-to     { opacity: 0; }

/* ── Body ── */
.settings-body { flex: 1; overflow-y: auto; overflow-x: visible; background: var(--bg); }

.s-content {
  padding: 24px 28px 60px;
  display: flex; flex-direction: column; gap: 14px;
}

.s-intro {
  font-size: 13px; color: var(--text-muted); line-height: 1.6;
  margin: 0;
}

.tab-flush { padding: 24px 28px 60px; }

/* ── Cards ── */
.s-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.s-card-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.s-card-title {
  font-size: 13px; font-weight: 700; color: var(--text);
}
.s-card-sub {
  font-size: 11.5px; color: var(--text-muted); font-weight: 400;
}
.s-card-body { padding: 18px; }

/* ── Form elements ── */
.fg { display: flex; flex-direction: column; gap: 5px; }
.fg label {
  font-size: 11.5px; font-weight: 600; color: var(--text-2);
  text-transform: uppercase; letter-spacing: .4px;
}
.fg input, .fg select, .fg textarea {
  padding: 8px 10px;
  border: 1px solid var(--border); border-radius: var(--radius, 6px);
  font-size: 13px; background: var(--surface); color: var(--text);
  font-family: inherit; transition: border-color .15s; width: 100%;
}
.fg input:focus, .fg select:focus, .fg textarea:focus {
  outline: none; border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79,70,229,.1);
}
.fg input:disabled { opacity: .45; cursor: not-allowed; background: var(--bg-alt); }
.fg textarea { resize: vertical; }
.input-lg { font-size: 15px !important; font-weight: 600 !important; }
.sub { font-size: 11px; color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0; }

.fg-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.fg-row-3 { grid-template-columns: 1fr 1fr 1fr; }
.fg-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

/* ── Logo ── */
.logo-row    { display: flex; gap: 18px; align-items: flex-start; }
.logo-fields { flex: 1; }

.logo-drop {
  width: 108px; min-width: 108px; height: 108px;
  border: 2px dashed var(--border); border-radius: 10px;
  cursor: pointer; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: var(--bg-alt);
  transition: border-color .15s, background .15s;
}
.logo-drop:hover, .logo-drop.over { border-color: var(--primary); background: var(--primary-light); }
.logo-drop.filled { border-style: solid; border-color: var(--border); background: var(--surface); }

.logo-img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
.logo-placeholder {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  color: var(--text-muted);
}
.logo-placeholder span { font-size: 11px; font-weight: 600; }
.logo-fmt { font-size: 10px !important; font-weight: 400 !important; opacity: .6; }

/* ── Hints ── */
.hint        { font-size: 11.5px; color: var(--text-muted); margin: 2px 0 0; }
.hint.danger { color: var(--danger); }

/* ── Toggle ── */
.toggle-row   { display: flex; align-items: flex-start; gap: 12px; }
.toggle       { width: 40px; min-width: 40px; height: 22px; border-radius: 11px; background: var(--border); border: none; position: relative; cursor: pointer; transition: background .2s; flex-shrink: 0; padding: 0; }
.toggle.on    { background: var(--primary); }
.toggle-knob  { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: white; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,.25); pointer-events: none; }
.toggle.on .toggle-knob { left: 21px; }
.toggle-label { font-size: 13px; font-weight: 600; color: var(--text); }

/* ── Checkbox rows (replacing slider toggles) ── */
.chk-row  { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; }
.chk-box  { width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0; accent-color: var(--primary); cursor: pointer; }

.infobox { padding: 10px 14px; border-radius: 6px; font-size: 12.5px; line-height: 1.6; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }

/* ── Nummernkreise: preview badge ── */
.num-preview {
  display: inline-flex; align-items: center;
  background: var(--primary-light); color: var(--primary-text);
  border: 1px solid rgba(79,70,229,.15);
  border-radius: 99px; padding: 3px 12px;
  font-size: 12px; font-weight: 700;
  font-family: 'Consolas', 'JetBrains Mono', monospace; letter-spacing: .3px;
}

.check-row { display: flex; gap: 20px; flex-wrap: wrap; }
.chk { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-2); cursor: pointer; }
.chk input { accent-color: var(--primary); width: 14px; height: 14px; }

/* ── Erscheinungsbild ── */
.appear-row  { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.appear-label { font-size: 13.5px; font-weight: 600; color: var(--text); }

.theme-toggle { display: flex; border: 1px solid var(--border); border-radius: var(--radius, 6px); overflow: hidden; }
.theme-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px; border: none;
  background: var(--surface); color: var(--text-2);
  font-size: 13px; font-weight: 500; font-family: inherit;
  cursor: pointer; transition: all .14s;
}
.theme-btn:first-child        { border-right: 1px solid var(--border); }
.theme-btn.active             { background: var(--primary); color: white; }
.theme-btn:hover:not(.active) { background: var(--bg-alt); color: var(--text); }

@media (max-width: 700px) {
  .fg-row, .fg-row-3, .fg-row-4 { grid-template-columns: 1fr 1fr; }
  .logo-row { flex-direction: column; }
}
@media (max-width: 500px) {
  .fg-row, .fg-row-3, .fg-row-4 { grid-template-columns: 1fr; }
}


/* ── Cancellation fee table ── */
.cancellation-table { display: flex; flex-direction: column; gap: 6px; }
.ct-header {
  display: grid; grid-template-columns: 130px 130px 1fr 36px;
  gap: 8px; padding: 0 4px;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text-muted);
}
.ct-row {
  display: grid; grid-template-columns: 130px 130px 1fr 36px;
  gap: 8px; align-items: center;
}
.ct-row .fg input { padding: 7px 10px; }
.ct-label-col input { width: 100%; }

.inp-unit-wrap { display: flex; align-items: center; }
.inp-unit-wrap input {
  flex: 1; border-radius: var(--radius, 6px) 0 0 var(--radius, 6px);
  border: 1px solid var(--border); padding: 7px 10px;
  background: var(--surface); color: var(--text);
  font-size: 13px; font-family: inherit;
}
.inp-unit-wrap input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
.inp-unit {
  padding: 7px 10px; background: var(--bg-alt);
  border: 1px solid var(--border); border-left: none;
  border-radius: 0 var(--radius, 6px) var(--radius, 6px) 0;
  font-size: 12px; color: var(--text-muted); white-space: nowrap;
}

.hint-inline { font-size: 13px; color: var(--text-2); }
.hint-inline strong { color: var(--primary-text); }


.clause-default-label {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: 1.5px solid var(--border);
  font-size: 16px; cursor: pointer;
  color: var(--text-muted); background: var(--surface);
  transition: all .12s;
}
.clause-default-label.active {
  color: #d97706; border-color: #f59e0b;
  background: #fffbeb;
}
.clause-default-label:hover { border-color: #f59e0b; color: #d97706; }
.clause-item {
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: 14px; margin-bottom: 12px; background: var(--bg-alt);
}
.clause-item:last-of-type { margin-bottom: 0; }
.clause-header { display: flex; gap: 12px; align-items: flex-start; }

/* ── Surcharge matrix ── */
.sm-wrap { overflow-x: auto; }
.surcharge-matrix { border-collapse: collapse; font-size: 12px; width: 100%; }
.surcharge-matrix th { padding: 6px 8px; background: var(--bg-alt); border: 1px solid var(--border); font-size: 11px; font-weight: 700; text-align: center; color: var(--text-muted); }
.surcharge-matrix td { border: 1px solid var(--border); padding: 4px; }
.sm-scope { font-size: 11.5px; font-weight: 600; color: var(--text-2); padding: 6px 10px !important; white-space: nowrap; background: var(--bg-alt); }
.sm-cell { display: flex; align-items: center; gap: 2px; justify-content: center; }
.sm-cell input { width: 52px; padding: 4px 6px; border: 1px solid var(--border); border-radius: 4px; font-size: 12px; text-align: right; background: var(--surface); color: var(--text); }
.sm-cell input:focus { outline: none; border-color: var(--primary); }
.sm-cell span { font-size: 11px; color: var(--text-muted); }

/* ── Para textarea ── */
.para-ta { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12.5px; font-family: inherit; color: var(--text); background: var(--surface); resize: vertical; line-height: 1.6; }
.para-ta:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,70,229,.07); }

/* ══ AGB Editor ════════════════════════════════════════════════════════════ */
.agb-list { display: flex; flex-direction: column; gap: 14px; }

.agb-para-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 10px);
  overflow: hidden;
  transition: box-shadow .15s;
}
.agb-para-card:hover { box-shadow: 0 2px 10px rgba(79,70,229,.08); }

.agb-para-head {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--bg-alt, #f8fafc);
  border-bottom: 1px solid var(--border);
}
.agb-para-num {
  font-size: 13px; font-weight: 800; color: var(--primary);
  background: var(--primary-light);
  border-radius: 6px; padding: 3px 9px;
  flex-shrink: 0; min-width: 38px; text-align: center;
}
.agb-para-title-input {
  flex: 1; border: none; background: transparent;
  font-size: 13.5px; font-weight: 700; color: var(--text);
  outline: none; padding: 4px 6px; border-radius: 4px;
  transition: background .12s;
}
.agb-para-title-input:focus { background: white; box-shadow: 0 0 0 2px rgba(79,70,229,.18); }
.agb-para-title-input::placeholder { color: var(--text-muted); font-weight: 400; }

.agb-para-actions { display: flex; gap: 4px; flex-shrink: 0; }
.agb-btn {
  background: none; border: 1px solid var(--border);
  border-radius: 5px; padding: 3px 8px;
  font-size: 11px; cursor: pointer; color: var(--text-2);
  transition: all .12s;
}
.agb-btn:hover:not(:disabled) { background: var(--bg-alt); border-color: var(--primary); color: var(--primary); }
.agb-btn:disabled { opacity: .35; cursor: default; }
.agb-btn-del:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

.agb-para-textarea {
  width: 100%; box-sizing: border-box;
  border: none; outline: none; resize: vertical;
  padding: 12px 14px;
  font-size: 13px; line-height: 1.65;
  color: var(--text); background: var(--surface);
  font-family: inherit; min-height: 120px;
}
.agb-para-textarea:focus { box-shadow: inset 0 0 0 2px rgba(79,70,229,.12); }

.agb-empty {
  text-align: center; padding: 40px;
  color: var(--text-muted); font-size: 13px;
  border: 2px dashed var(--border); border-radius: var(--radius-lg);
}

/* transition */
.agb-list-enter-active, .agb-list-leave-active { transition: all .2s ease; }
.agb-list-enter-from { opacity: 0; transform: translateY(-8px); }
.agb-list-leave-to   { opacity: 0; transform: translateX(20px); }


/* ══ Intro banner ════════════════════════════════════════════════════════════ */
.s-intro-banner {
  display: flex; align-items: flex-start; gap: 14px;
  background: var(--primary-light);
  border: 1px solid rgba(79,70,229,.18);
  border-radius: var(--radius-lg, 10px);
  padding: 14px 18px;
  margin-bottom: 18px;
}
.s-intro-icon {
  width: 36px; height: 36px; flex-shrink: 0;
  background: var(--primary); color: white;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 800;
}
.s-intro-title { font-size: 13.5px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.s-intro-text  { font-size: 12.5px; color: var(--text-2); line-height: 1.5; }

/* ══ Number group labels ═════════════════════════════════════════════════════ */
.num-group-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--text-muted);
  padding: 6px 2px 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px; margin-top: 4px;
}

/* ══ AGB sub-items ═══════════════════════════════════════════════════════════ */
.agb-items { padding: 10px 16px 14px; display: flex; flex-direction: column; gap: 6px; }

.agb-item-row {
  display: flex; align-items: flex-start; gap: 8px;
}
.agb-item-num {
  font-size: 11.5px; font-weight: 700; color: var(--primary);
  background: var(--primary-light); border-radius: 5px;
  padding: 4px 7px; flex-shrink: 0; margin-top: 6px;
  min-width: 36px; text-align: center;
}
.agb-item-ta {
  flex: 1; border: 1px solid var(--border);
  border-radius: var(--radius, 6px);
  padding: 7px 10px; font-size: 13px; line-height: 1.6;
  font-family: inherit; color: var(--text);
  resize: none; overflow: hidden; min-height: 36px;
  transition: border-color .12s;
  background: var(--surface);
}
.agb-item-ta:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(79,70,229,.12); }
.agb-item-del {
  background: none; border: 1px solid transparent;
  color: var(--text-muted); cursor: pointer;
  padding: 4px 7px; border-radius: 5px; font-size: 12px;
  margin-top: 6px; flex-shrink: 0;
  transition: all .12s;
}
.agb-item-del:hover { color: #ef4444; border-color: #ef4444; background: #fef2f2; }

.agb-btn-add { color: var(--primary) !important; border-color: rgba(79,70,229,.3) !important; }
.agb-btn-add:hover { background: var(--primary-light) !important; }

.agb-no-items {
  font-size: 12px; color: var(--text-muted);
  padding: 8px 4px; font-style: italic;
}


/* ══ Contract Paragraph labeled items ═══════════════════════════════════════ */
.cp-para-num { min-width: 52px; font-size: 11px; }

.cp-item-row { align-items: flex-start; }

.cp-item-left { flex: 1; display: flex; flex-direction: column; gap: 5px; }

.cp-item-label-input {
  border: 1px solid var(--border);
  border-radius: var(--radius, 6px);
  padding: 5px 10px; font-size: 12px; font-weight: 600;
  color: var(--primary); background: var(--primary-light);
  outline: none; transition: border-color .12s;
}
.cp-item-label-input:focus { border-color: var(--primary); background: white; }
.cp-item-label-input::placeholder { color: var(--text-muted); font-weight: 400; }

.cp-item-ta { min-height: 64px; }

.bl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.bl-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--text-2); cursor: pointer;
  padding: 4px 0;
}
.bl-label input { width: auto; flex-shrink: 0; accent-color: var(--primary); }
.bl-label:hover { color: var(--text); }

/* ══ Backup-Tab ═══════════════════════════════════════════════════════════ */
.backup-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
}
.backup-table th {
  padding: 9px 14px; background: var(--surface);
  border-bottom: 1.5px solid var(--border);
  text-align: left; font-size: 11.5px; font-weight: 600;
  color: var(--text-muted); white-space: nowrap;
}
.backup-table td {
  padding: 9px 14px; border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
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
.backup-badge-warn {
  background: rgba(217, 119, 6, .12); color: #92400e;
}
.backup-loading, .backup-empty {
  padding: 28px 16px; text-align: center;
  font-size: 13px; color: var(--text-muted);
}
.backup-msg {
  font-size: 13px; font-weight: 600;
}
.backup-msg-ok  { color: var(--success, #059669); }
.backup-msg-err { color: var(--danger,  #dc2626); }
.backup-import-filename {
  font-size: 12px; color: var(--text-muted); font-style: italic;
}
.s-card-count {
  margin-left: auto; font-size: 11px; color: var(--text-muted);
  background: var(--surface-alt, #f3f4f6);
  padding: 2px 8px; border-radius: 10px; font-weight: 600;
}

/* ══ Backup-Tab ═══════════════════════════════════════════════════════════ */
.backup-table { width:100%; border-collapse:collapse; font-size:13px; }
.backup-table th { padding:9px 14px; background:var(--surface); border-bottom:1.5px solid var(--border); text-align:left; font-size:11.5px; font-weight:600; color:var(--text-muted); white-space:nowrap; }
.backup-table td { padding:9px 14px; border-bottom:1px solid var(--border); vertical-align:middle; }
.backup-table tbody tr:last-child td { border-bottom:none; }
.backup-table tbody tr:hover { background:var(--hover-bg,rgba(0,0,0,.03)); }
.backup-name  { font-size:12px; color:var(--text); font-family:monospace; }
.backup-date  { font-size:12px; color:var(--text-muted); white-space:nowrap; }
.backup-size  { font-size:12px; color:var(--text-muted); white-space:nowrap; }
.backup-actions { display:flex; gap:4px; justify-content:flex-end; }
.backup-badge { display:inline-block; font-size:10px; font-weight:700; padding:1px 6px; border-radius:8px; margin-right:5px; background:var(--primary-light); color:var(--primary-text); }
.backup-badge-warn { background:rgba(217,119,6,.12); color:#92400e; }
.backup-loading, .backup-empty { padding:28px 16px; text-align:center; font-size:13px; color:var(--text-muted); }
.backup-msg { font-size:13px; font-weight:600; }
.backup-msg-ok  { color:var(--success,#059669); }
.backup-msg-err { color:var(--danger,#dc2626); }
.backup-import-filename { font-size:12px; color:var(--text-muted); font-style:italic; }
.s-card-count { margin-left:auto; font-size:11px; color:var(--text-muted); background:var(--surface-alt,#f3f4f6); padding:2px 8px; border-radius:10px; font-weight:600; }

/* ══ System-Tab ════════════════════════════════════════════════════════════ */
.sys-path-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-alt);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 12px;
}
.sys-path-label { font-size: 12px; color: var(--text-muted); min-width: 100px; flex-shrink: 0; }
.sys-path-value { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.sys-path-code {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  color: var(--text);
  background: var(--surface);
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.sys-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.sys-stat {
  text-align: center;
  padding: 12px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.sys-stat-val { font-size: 20px; font-weight: 800; color: var(--primary); }
.sys-stat-lbl { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.sys-dirs-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.sys-dir-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius);
  font-size: 13px;
}
.sys-dir-row:hover { background: var(--bg-alt); }
.sys-dir-icon { font-size: 14px; flex-shrink: 0; }
.sys-dir-label { font-weight: 600; min-width: 80px; color: var(--text); }
.sys-dir-path {
  font-family: monospace; font-size: 11.5px; color: var(--text-muted);
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.sys-info-table { width: 100%; border-collapse: collapse; }
.sys-info-table td { padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--border); }
.sys-info-table tr:last-child td { border-bottom: none; }
.sys-info-label { color: var(--text-muted); width: 140px; }

/* ── Zahlungsarten-Grid ── */
.payment-methods-grid {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.pm-check-label {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: var(--radius);
  border: 1.5px solid var(--border); cursor: pointer;
  background: var(--surface); transition: all .13s;
  user-select: none; min-width: 140px;
}
.pm-check-label:hover { border-color: var(--primary); }
.pm-check-label.active {
  background: var(--primary-light); border-color: var(--primary);
}
.pm-check-icon { font-size: 16px; }
.pm-check-name { font-size: 13px; font-weight: 600; flex: 1; }
.pm-check-tick { font-size: 12px; color: var(--primary); font-weight: 700; }

/* ── Coming-Soon Banner (E-Mail, System) ─────────────────── */
.s-coming-soon-banner {
  display: flex; align-items: flex-start; gap: 12px;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 16px;
}
.s-csb-icon  { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
.s-csb-title { font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 3px; }
.s-csb-text  { font-size: 12.5px; color: #78350f; line-height: 1.55; }

/* ── Nummernkreise Token-System ────────────────────── */
.num-token-bar {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 12px 14px; background: var(--bg-alt);
  border: 1px solid var(--border); border-radius: var(--radius);
  margin-bottom: 18px;
}
.num-token {
  display: flex; flex-direction: column; align-items: center;
  padding: 6px 10px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 6px;
  cursor: default; transition: border-color .15s;
  min-width: 90px;
}
.num-token:hover { border-color: var(--primary); }
.num-token-label { font-size: 10px; color: var(--text-muted); margin-bottom: 3px; text-align: center; }
.num-token-code  { font-size: 11px; font-weight: 700; color: var(--primary); font-family: monospace; }
.num-schema-card .s-card-body { padding-top: 10px; }
.num-format-row  { display: flex; gap: 12px; align-items: flex-end; }
.num-format-input { font-family: monospace; font-size: 13px; letter-spacing: .3px; }
.num-start-field { flex-shrink: 0; }
.num-hint { margin-top: 8px; font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; }
.num-locked-icon { font-size: 13px; }

/* ══ Update-Tab ════════════════════════════════════════════════════════════ */
.update-manifest-card {
  background: var(--surface-alt, #f8faff);
  border: 1.5px solid var(--primary-light, #c7d2fe);
  border-radius: 8px; padding: 18px 20px;
}
.update-manifest-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
}
.update-version-badge {
  background: var(--primary); color: white;
  font-size: 11px; font-weight: 800; padding: 3px 10px;
  border-radius: 20px; white-space: nowrap; letter-spacing: .04em;
}
.update-manifest-title {
  font-size: 15px; font-weight: 700; color: var(--text);
}
.update-manifest-desc {
  font-size: 13px; color: var(--text-muted); line-height: 1.65; margin-bottom: 10px;
}
.update-changes-list {
  margin: 0 0 10px 18px; padding: 0;
  font-size: 13px; color: var(--text); line-height: 1.8;
}
.update-manifest-meta {
  font-size: 11.5px; color: var(--text-muted); margin-top: 4px;
}
.update-progress-card { border-color: var(--primary-light, #c7d2fe); }
.update-spinner {
  font-size: 36px;
  animation: spin 2s linear infinite;
  display: inline-block;
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.update-health-bar {
  width: 100%; max-width: 320px; height: 6px;
  background: var(--border); border-radius: 3px;
  overflow: hidden; margin: 0 auto;
}
.update-health-fill {
  height: 100%; background: var(--primary);
  border-radius: 3px; transition: width .4s ease;
}
.update-status { font-size: 13px; color: var(--text-muted); font-style: italic; }

/* ── NR-Modell Auswahl ── */
.nr-mode-chips { display: flex; flex-direction: column; gap: 10px; }
.nr-mode-chip { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 9px; cursor: pointer; background: var(--surface); transition: all .14s; }
.nr-mode-chip:hover { border-color: var(--primary); background: var(--primary-light); }
.nr-mode-chip.active { border-color: var(--primary); background: var(--primary-light); }
.nr-mode-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
.nr-mode-content { flex: 1; }
.nr-mode-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.nr-mode-desc { font-size: 11.5px; color: var(--text-muted); line-height: 1.5; }
.nr-mode-check { font-size: 15px; color: var(--primary); font-weight: 700; flex-shrink: 0; }

/* ── Stundensatz-Abschnitt-Labels ── */
.s-rates-section-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .7px; color: var(--text-muted);
  padding: 4px 0 8px; margin-top: 8px;
  border-bottom: 1px solid var(--border); margin-bottom: 12px;
}
.s-rates-section-label:first-of-type { margin-top: 0; }

/* ── Nutzungsrechts-Referenz ── */
.ur-ref-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;
}
.ur-ref-block {
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 8px; padding: 12px 14px;
}
.ur-ref-title {
  font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 2px;
}
.ur-ref-desc {
  font-size: 11px; color: var(--text-muted); margin-bottom: 8px; font-style: italic;
}
.ur-ref-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.ur-ref-table tr + tr td { border-top: 1px solid var(--border); }
.ur-ref-table td { padding: 3px 4px; vertical-align: top; }
.ur-factor {
  font-weight: 800; color: var(--primary); width: 38px; font-variant-numeric: tabular-nums;
  font-family: monospace; font-size: 12px;
}
.ur-ref-note {
  font-size: 10.5px; color: var(--text-muted); margin-top: 6px;
  font-style: italic; border-top: 1px dashed var(--border); padding-top: 5px;
}
.ur-example-box {
  background: var(--primary-light); border: 1px solid rgba(79,70,229,.2);
  border-radius: 8px; padding: 12px 14px;
}
.ur-example-title { font-size: 12px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
@media (max-width: 700px) { .ur-ref-grid { grid-template-columns: 1fr; } }

</style>
