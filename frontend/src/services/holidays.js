import { API_BASE } from './api'
/**
 * holidays.js — v84
 *
 * Alle Feriendaten kommen vom Backend-Proxy.
 * Frontend hat KEINEN eigenen Gauß-Fallback mehr —
 * wenn Backend-API fehlschlägt, wird der Fehler als UI-Status angezeigt.
 *
 * Backend-Quellen:
 *   Feiertage:  feiertage-api.de   (Fallback: Gauß im Backend)
 *   Schulferien: openholidaysapi.org → ferien-api.de (kein Offline-Fallback)
 */

const API = `${API_BASE}/api`

// ─── In-Memory-Cache (Session-Scope, wird bei Reload geleert) ────────────────
const feiertageCache = new Map()
const ferienCache    = new Map()

function cacheKey(bundeslaender, years) {
  return `${[...bundeslaender].sort().join(',')}|${[...years].sort().join(',')}`
}

// ─── Feiertage laden ─────────────────────────────────────────────────────────
/**
 * Lädt Feiertage vom Backend.
 * @returns {Array<{date:string, name:string}>}  date = YYYY-MM-DD
 */
export async function fetchPublicHolidays(bundeslaender, years) {
  if (!bundeslaender.length || !years.length) return []
  const key = cacheKey(bundeslaender, years)
  if (feiertageCache.has(key)) return feiertageCache.get(key)

  try {
    const url = `${API}/holidays/feiertage?states=${bundeslaender.join(',')}&years=${years.join(',')}`
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    // Backend gibt { data: [{name, start, end}], sources: [...] }
    // Wir normalisieren auf {date, name} für publicHolidayOn()
    const data = (json.data || [])
      .map(h => ({ date: h.start || h.date || null, name: h.name }))
      .filter(h => h.date)
    feiertageCache.set(key, data)
    return data
  } catch(e) {
    console.warn('[holidays] Feiertage-Proxy fehlgeschlagen:', e.message)
    feiertageCache.set(key, [])
    return []
  }
}

// ─── Schulferien laden ────────────────────────────────────────────────────────
/**
 * Lädt Schulferien vom Backend.
 * @returns {Array<{name:string, start:string, end:string}>}  YYYY-MM-DD
 */
export async function fetchSchoolHolidays(bundeslaender, years) {
  if (!bundeslaender.length || !years.length) return []
  const key = cacheKey(bundeslaender, years)
  if (ferienCache.has(key)) return ferienCache.get(key)

  try {
    const url = `${API}/holidays/ferien?states=${bundeslaender.join(',')}&years=${years.join(',')}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const data = json.data || []
    // Fehler aus Backend durchreichen (Quelle 'none' bedeutet alle APIs ausgefallen)
    const hasError = json.errors?.length > 0 || (json.sources || []).includes('none')
    ferienCache.set(key, data)
    if (hasError && data.length === 0) {
      return { data: [], error: (json.errors || ['Schulferien-Datenquellen nicht erreichbar']).join('; ') }
    }
    return data
  } catch(e) {
    console.warn('[holidays] Schulferien-Proxy fehlgeschlagen:', e.message)
    ferienCache.set(key, [])
    return []
  }
}

/** Leert den Frontend-Cache (z.B. nach Bundesland-Wechsel) */
export function clearHolidayCache() {
  feiertageCache.clear()
  ferienCache.clear()
}

// ─── Bundesländer-Liste ───────────────────────────────────────────────────────
export const BUNDESLAENDER = [
  { code: 'BW', label: 'Baden-Württemberg',      region: 'Süd'      },
  { code: 'BY', label: 'Bayern',                 region: 'Süd'      },
  { code: 'BE', label: 'Berlin',                 region: 'Nord-Ost' },
  { code: 'BB', label: 'Brandenburg',            region: 'Nord-Ost' },
  { code: 'HB', label: 'Bremen',                 region: 'Nord'     },
  { code: 'HH', label: 'Hamburg',                region: 'Nord'     },
  { code: 'HE', label: 'Hessen',                 region: 'Mitte'    },
  { code: 'MV', label: 'Mecklenburg-Vorpommern', region: 'Nord-Ost' },
  { code: 'NI', label: 'Niedersachsen',          region: 'Nord'     },
  { code: 'NW', label: 'Nordrhein-Westfalen',    region: 'West'     },
  { code: 'RP', label: 'Rheinland-Pfalz',        region: 'West'     },
  { code: 'SL', label: 'Saarland',               region: 'West'     },
  { code: 'SN', label: 'Sachsen',                region: 'Ost'      },
  { code: 'ST', label: 'Sachsen-Anhalt',         region: 'Ost'      },
  { code: 'SH', label: 'Schleswig-Holstein',     region: 'Nord'     },
  { code: 'TH', label: 'Thüringen',              region: 'Ost'      },
]

export const BUNDESLAENDER_BY_REGION = BUNDESLAENDER.reduce((acc, bl) => {
  if (!acc[bl.region]) acc[bl.region] = []
  acc[bl.region].push(bl)
  return acc
}, {})
