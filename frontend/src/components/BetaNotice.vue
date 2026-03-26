<template>
  <Teleport to="body">
    <Transition name="beta-fade">
      <div v-if="visible" class="beta-overlay" @click.self="dismiss">
        <div class="beta-dialog">
          <div class="beta-head">
            <div class="beta-head-icon">🧪</div>
            <div>
              <div class="beta-title">PixFrameWorkspace — Beta</div>
              <div class="beta-version">v1.0.0-beta.2</div>
            </div>
          </div>

          <div class="beta-body">
            <p class="beta-intro">
              Vielen Dank fürs Testen! Diese Version ist eine <strong>geschlossene Beta</strong> —
              die Kernfunktionen laufen stabil, aber einige Bereiche sind noch in Entwicklung.
            </p>

            <div class="beta-section">
              <div class="beta-section-title">✅ Voll funktionsfähig</div>
              <ul class="beta-list">
                <li>Auftragsverwaltung & 7-Stufen-Pipeline</li>
                <li>Kundenverwaltung & Lieferanten</li>
                <li>Verträge, Angebote, Rechnungen (GoBD-konform)</li>
                <li>Finanzbuchhaltung & DATEV-Export</li>
                <li>Backup- & Update-System</li>
              </ul>
            </div>

            <div class="beta-section">
              <div class="beta-section-title">⚠️ Bekannte Einschränkungen</div>
              <ul class="beta-list beta-list--warn">
                <li><strong>PDF-Druck:</strong> Gelegentliche Darstellungsfehler bei komplexen Layouts — bitte nach dem ersten Druck prüfen</li>
                <li><strong>E-Mail-Versand:</strong> SMTP-Konfiguration vorhanden, Versand noch nicht aktiv</li>
                <li><strong>Kalender:</strong> Termine werden angezeigt, manuelle Eingabe und Bearbeitung noch eingeschränkt</li>
                <li><strong>UI-Details:</strong> Vereinzelte Darstellungsprobleme auf sehr kleinen Bildschirmen</li>
              </ul>
            </div>

            <div class="beta-feedback">
              <span class="beta-feedback-icon">📬</span>
              <span>
                Bugs und Feedback bitte an:
                <a href="mailto:markus.emanuel@gmail.com" class="beta-mail">markus.emanuel@gmail.com</a>
              </span>
            </div>
          </div>

          <div class="beta-foot">
            <label class="beta-no-show">
              <input type="checkbox" v-model="dontShowAgain" />
              <span>Nicht mehr anzeigen</span>
            </label>
            <button class="btn btn-primary btn-sm" @click="dismiss">
              Verstanden — Los geht's
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'pixframe_beta_dismissed'

export default {
  name: 'BetaNotice',
  setup() {
    const visible       = ref(false)
    const dontShowAgain = ref(false)

    onMounted(() => {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (!dismissed) {
        setTimeout(() => { visible.value = true }, 600)
      }
    })

    function dismiss() {
      if (dontShowAgain.value) {
        localStorage.setItem(STORAGE_KEY, '1')
      }
      visible.value = false
    }

    return { visible, dontShowAgain, dismiss }
  }
}
</script>

<style scoped>
.beta-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.beta-dialog {
  background: var(--surface); border-radius: 16px;
  box-shadow: 0 32px 80px rgba(0,0,0,.28);
  width: min(540px, 96vw); overflow: hidden;
  display: flex; flex-direction: column; max-height: 90vh;
}
.beta-head {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px 18px;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  color: white; flex-shrink: 0;
}
.beta-head-icon { font-size: 32px; line-height: 1; }
.beta-title   { font-size: 17px; font-weight: 800; letter-spacing: -.3px; }
.beta-version {
  font-family: monospace; font-size: 11px; margin-top: 3px;
  background: rgba(255,255,255,.15); border-radius: 4px;
  padding: 1px 8px; display: inline-block; color: rgba(255,255,255,.9);
}
.beta-body {
  padding: 20px 24px; overflow-y: auto; display: flex;
  flex-direction: column; gap: 14px;
}
.beta-intro { font-size: 13.5px; line-height: 1.6; color: var(--text); margin: 0; }
.beta-section { background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 8px; padding: 12px 14px; }
.beta-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text-muted); margin-bottom: 8px; }
.beta-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 5px; }
.beta-list li { font-size: 13px; line-height: 1.5; color: var(--text-2); }
.beta-list--warn li { color: var(--text); }
.beta-feedback {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; background: var(--bg-alt);
  border: 1px solid var(--border); border-radius: 8px;
  font-size: 13px; color: var(--text-2);
}
.beta-feedback-icon { font-size: 18px; flex-shrink: 0; }
.beta-mail { color: var(--primary-text); font-weight: 600; text-decoration: none; }
.beta-mail:hover { text-decoration: underline; }
.beta-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; border-top: 1px solid var(--border);
  background: var(--bg-alt); flex-shrink: 0; gap: 12px;
}
.beta-no-show {
  display: flex; align-items: center; gap: 7px;
  font-size: 12.5px; color: var(--text-muted); cursor: pointer; user-select: none;
}
.beta-no-show input { cursor: pointer; }

.beta-fade-enter-active { transition: opacity .25s, transform .25s; }
.beta-fade-leave-active { transition: opacity .2s, transform .2s; }
.beta-fade-enter-from   { opacity: 0; transform: scale(.96); }
.beta-fade-leave-to     { opacity: 0; transform: scale(.98); }
</style>
