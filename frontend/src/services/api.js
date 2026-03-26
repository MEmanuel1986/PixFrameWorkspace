import axios from 'axios'

// ── Zentrale Backend-URL ─────────────────────────────────────────────────────
// EINZIGE Stelle im gesamten Frontend wo der Backend-Host konfiguriert wird.
// Alle anderen Dateien importieren API_BASE aus dieser Datei.
export const API_BASE = 'http://localhost:3001'
const API_URL = `${API_BASE}/api`

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  // KEIN globaler Content-Type-Header: Axios setzt bei FormData automatisch
  // multipart/boundary — wird der Header explizit gesetzt, ignoriert
  // express-fileupload die Dateien und req.files bleibt leer.
})

// Request Interceptor — bei FormData den Content-Type-Header entfernen,
// damit der Browser den korrekten multipart/form-data; boundary=... selbst setzt.
apiClient.interceptors.request.use(config => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Response Interceptor
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 404) {
      console.error('Ressource nicht gefunden')
    } else if (error.response?.status === 400) {
      console.error('Validierungsfehler:', error.response.data)
    } else if (error.response?.status === 500) {
      console.error('Serverfehler')
    }
    return Promise.reject(error)
  }
)

export default apiClient
