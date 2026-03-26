import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/global.css'
import './styles/print-override.css'
import { useSettings } from './stores/useSettings'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Globaler Fehler-Handler: verhindert dass unbehandelte Fehler die router-view töten
app.config.errorHandler = (err, instance, info) => {
  console.error('[PixFrame] Vue-Fehler:', err, '\nKomponente:', instance?.$options?.name, '\nInfo:', info)
  // Fehler nicht weiter werfen → Rendering bleibt intakt
}

// Globaler Promise-Fehler-Handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('[PixFrame] Unhandled Promise Rejection:', event.reason)
  event.preventDefault()
})

// Theme vor dem Mount initialisieren
const settingsStore = useSettings()
settingsStore.initTheme()

app.mount('#app')
