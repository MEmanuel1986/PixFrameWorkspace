<template>
  <div class="s-content">

    <!-- Studio-Identität -->
    <div class="s-card">
      <div class="s-card-head">
        <span class="s-card-title">Studio-Identität</span>
        <span class="s-card-sub">Name und Logo erscheinen auf Rechnungen und Angeboten</span>
      </div>
      <div class="s-card-body">
        <div class="logo-row">
          <div class="logo-drop"
            :class="{ over: store.dragOver, filled: store.previewUrl }"
            @click="triggerFileInput"
            @dragover.prevent="store.dragOver = true"
            @dragleave="store.dragOver = false"
            @drop.prevent="onDrop"
            :title="store.previewUrl ? 'Klicken zum Ersetzen' : 'Logo hier ablegen oder klicken'"
          >
            <img v-if="store.previewUrl" :src="store.previewUrl" class="logo-img" alt="Logo" />
            <div v-else class="logo-placeholder">
              <svg viewBox="0 0 40 40" fill="none" width="26" height="26">
                <rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" stroke-width="1.6"/>
                <circle cx="14" cy="18" r="3" stroke="currentColor" stroke-width="1.6"/>
                <path d="M4 27l8-6 6 5 5-4 9 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Logo</span>
              <span class="logo-fmt">PNG · JPG · SVG</span>
            </div>
            <input ref="fileInputEl" type="file" accept=".png,.jpg,.jpeg,.svg,.webp" style="display:none" @change="onFileSelected" />
          </div>
          <div class="logo-fields">
            <div class="fg">
              <label>Studioname / Firmenname *</label>
              <input v-model="store.form.company.name" type="text" placeholder="Mustermann Photography" class="input-lg" />
            </div>
            <div class="fg-row" style="margin-top:10px">
              <div class="fg">
                <label>Inhaber/in</label>
                <input v-model="store.form.company.owner" type="text" placeholder="Max Mustermann" />
              </div>
              <div class="fg">
                <label>Geschäftsform</label>
                <select v-model="store.form.company.businessType">
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
            <div v-if="store.previewUrl" style="margin-top:10px">
              <button class="btn btn-ghost btn-sm" @click.stop="store.removeLogo">🗑 Logo entfernen</button>
            </div>
            <p v-if="store.logoUploading" class="hint">⏳ Wird hochgeladen…</p>
            <p v-if="store.logoError" class="hint danger">{{ store.logoError }}</p>
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
            <input v-model="store.form.company.taxNumber" type="text" placeholder="12/345/67890" />
          </div>
          <div class="fg">
            <label>USt-IdNr.</label>
            <input v-model="store.form.company.vatId" type="text" placeholder="DE123456789"
              :disabled="store.form.company.smallBusiness" />
            <p v-if="store.form.company.smallBusiness" class="hint">Nicht nötig bei §19 UStG</p>
          </div>
        </div>
        <label class="chk-row" style="margin-top:14px">
          <input type="checkbox" v-model="store.form.company.smallBusiness" class="chk-box" />
          <div>
            <div class="toggle-label">Kleinunternehmer §19 UStG</div>
            <div class="hint">Keine Umsatzsteuer auf Rechnungen</div>
          </div>
        </label>
        <div v-if="store.form.company.smallBusiness" class="infobox" style="margin-top:12px">
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
            <input v-model="store.form.company.phone" type="tel" placeholder="+49 3821 123456" />
          </div>
          <div class="fg">
            <label>E-Mail</label>
            <input v-model="store.form.company.email" type="email" placeholder="info@studio.de" />
          </div>
        </div>
        <div class="fg" style="margin-top:12px">
          <label>Website</label>
          <input v-model="store.form.company.website" type="url" placeholder="https://www.studio.de" />
        </div>
        <div class="fg" style="margin-top:12px">
          <label>Straße & Hausnummer</label>
          <input v-model="store.form.company.street" type="text" placeholder="Musterstraße 12" />
        </div>
        <div class="fg-row" style="margin-top:12px;grid-template-columns:100px 1fr">
          <div class="fg">
            <label>PLZ</label>
            <input v-model="store.form.company.zipCode" type="text" placeholder="18311" />
          </div>
          <div class="fg">
            <label>Stadt</label>
            <input v-model="store.form.company.city" type="text" placeholder="Ribnitz-Damgarten" />
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
            <input v-model="store.form.company.bankName" type="text" placeholder="Sparkasse Rostock" />
          </div>
          <div class="fg">
            <label>BIC</label>
            <input v-model="store.form.company.bic" type="text" placeholder="NOLADE21ROK" />
          </div>
        </div>
        <div class="fg" style="margin-top:12px">
          <label>IBAN</label>
          <input v-model="store.form.company.iban" type="text" placeholder="DE12 3456 7890 1234 5678 90" />
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
          <textarea v-model="store.form.company.invoiceIntro" rows="2"
            placeholder="Ich berechne Ihnen folgende Leistungen:"></textarea>
        </div>
        <div class="fg" style="margin-top:12px">
          <label>Fußnotentext <span class="sub">(unter den Positionen)</span></label>
          <textarea v-model="store.form.company.invoiceFooter" rows="2"
            placeholder="Zahlbar innerhalb von 14 Tagen ohne Abzug."></textarea>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref } from 'vue'
import { useSettingsFormStore } from '../../../stores/useSettingsFormStore'

export default {
  name: 'SettingsTabCompany',
  setup() {
    const store = useSettingsFormStore()

    // Lokaler ref für das DOM file-input Element
    const fileInputEl = ref(null)

    function triggerFileInput() {
      fileInputEl.value?.click()
    }

    function onFileSelected(e) {
      const f = e.target.files?.[0]
      if (f) store.uploadLogo(f)
      // Input zurücksetzen damit derselbe File erneut gewählt werden kann
      if (fileInputEl.value) fileInputEl.value.value = ''
    }

    function onDrop(e) {
      store.dragOver = false
      const f = e.dataTransfer.files?.[0]
      if (f) store.uploadLogo(f)
    }

    return { store, fileInputEl, triggerFileInput, onFileSelected, onDrop }
  }
}
</script>
