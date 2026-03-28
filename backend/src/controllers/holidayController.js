'use strict';
/**
 * holidayController.js — v85
 *
 * Feiertage (gesetzliche Feiertage):
 *   Quelle 1: feiertage-api.de    — kostenlos, JSON, kein Key
 *             Response: { "Neujahr": { "datum": "2026-01-01", "hinweis": "..." }, ... }
 *   Fallback:  Gauß-Osteralgorithmus (100% offline, immer korrekt)
 *
 * Schulferien:
 *   Quelle 1: openholidaysapi.org — EU-öffentlich, JSON, kein Key, menschlesbare Namen
 *             Response: [{ "startDate":"2026-02-23","endDate":"2026-02-28",
 *                          "name":[{"language":"DE","text":"Winterferien"}] }]
 *   Quelle 2: ferien-api.de       — Backup, JSON, kein Key
 *             Response: [{ "start":"2026-02-23T00:00","end":"2026-02-28T00:00",
 *                          "name":"winterferien","stateCode":"MV" }]
 *             WICHTIG: name ist Slug → wird zu lesbarem Namen gemappt
 *             WICHTIG: end ist inklusive (kein -1 nötig)
 *
 * Cache: SQLite-Tabelle holiday_cache (id TEXT PK, data TEXT, fetched_at TEXT)
 * TTL:   24h — nach Ablauf wird ein neuer API-Request ausgelöst.
 */

const https = require('https');
const http  = require('http');

const databaseService = require('../database/databaseService');

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h in ms

// ─── Slug → lesbarer Ferienname ──────────────────────────────────────────────
const FERIEN_SLUG_MAP = {
  winterferien:        'Winterferien',
  osterferien:         'Osterferien',
  pfingstferien:       'Pfingstferien',
  sommerferien:        'Sommerferien',
  herbstferien:        'Herbstferien',
  weihnachtsferien:    'Weihnachtsferien',
  fastenferien:        'Fastenferien',
  allerheiligenferien: 'Allerheiligenferien',
  beweglicheferientage:'Bewegliche Ferientage',
};

function slugToFerienName(slug) {
  if (!slug) return 'Schulferien';
  const base = slug.toLowerCase().split('-')[0];
  return FERIEN_SLUG_MAP[base] || (slug.charAt(0).toUpperCase() + slug.slice(1));
}

// ─── BL-Code → openholidaysapi subdivisionCode ───────────────────────────────
const OPEN_HOLIDAYS_CODE = {
  BW:'DE-BW',BY:'DE-BY',BE:'DE-BE',BB:'DE-BB',HB:'DE-HB',HH:'DE-HH',
  HE:'DE-HE',MV:'DE-MV',NI:'DE-NI',NW:'DE-NW',RP:'DE-RP',SL:'DE-SL',
  SN:'DE-SN',ST:'DE-ST',SH:'DE-SH',TH:'DE-TH',
};

// ─── Gauß-Osteralgorithmus (Fallback Feiertage, immer offline verfügbar) ─────
function easterDate(year) {
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
  const l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(year,month-1,day);
}
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function ymd(d){return d.toISOString().slice(0,10);}
function bussBettag(year){
  const nov23=new Date(year,10,23),dow=nov23.getDay();
  const back=(dow===3)?0:(dow<3?dow+4:dow-3);
  return ymd(new Date(year,10,23-back));
}

function computeFeiertageOffline(year, bundeslaender=[]) {
  const easter=easterDate(year);
  const sel=bundeslaender.map(b=>b.toUpperCase());
  const raw=[
    {date:`${year}-01-01`,name:'Neujahr',                         scope:'ALL'},
    {date:ymd(addDays(easter,-2)),name:'Karfreitag',               scope:'ALL'},
    {date:ymd(easter),            name:'Ostersonntag',             scope:['BB']},
    {date:ymd(addDays(easter,1)), name:'Ostermontag',              scope:'ALL'},
    {date:`${year}-05-01`,        name:'Tag der Arbeit',           scope:'ALL'},
    {date:ymd(addDays(easter,39)),name:'Christi Himmelfahrt',      scope:'ALL'},
    {date:ymd(addDays(easter,49)),name:'Pfingstsonntag',           scope:['BB']},
    {date:ymd(addDays(easter,50)),name:'Pfingstmontag',            scope:'ALL'},
    {date:`${year}-10-03`,        name:'Tag der deutschen Einheit',scope:'ALL'},
    {date:`${year}-12-25`,        name:'1. Weihnachtstag',         scope:'ALL'},
    {date:`${year}-12-26`,        name:'2. Weihnachtstag',         scope:'ALL'},
    {date:`${year}-01-06`,        name:'Heilige Drei Könige',      scope:['BW','BY','ST']},
    {date:`${year}-03-08`,        name:'Internationaler Frauentag',scope:['BE','MV']},
    {date:ymd(addDays(easter,60)),name:'Fronleichnam',             scope:['BW','BY','HE','NW','RP','SL']},
    {date:`${year}-08-15`,        name:'Mariä Himmelfahrt',        scope:['BY','SL']},
    {date:`${year}-09-20`,        name:'Weltkindertag',            scope:['TH']},
    {date:`${year}-10-31`,        name:'Reformationstag',          scope:['BB','HB','HH','MV','NI','SN','ST','SH','TH']},
    {date:`${year}-11-01`,        name:'Allerheiligen',            scope:['BW','BY','NW','RP','SL']},
    {date:bussBettag(year),       name:'Buß- und Bettag',          scope:['SN']},
  ];
  const seen=new Set(),result=[];
  for(const h of raw){
    const vis=h.scope==='ALL'||(Array.isArray(h.scope)&&(sel.length===0||h.scope.some(s=>sel.includes(s))));
    if(!vis)continue;
    const key=`${h.date}|${h.name}`;
    if(seen.has(key))continue;
    seen.add(key);
    result.push({ name:h.name, start:h.date, end:h.date });
  }
  return result.sort((a,b)=>a.start.localeCompare(b.start));
}

// ─── SQLite Cache ─────────────────────────────────────────────────────────────
// Cache-ID-Schema: "feiertag_MV_2026" / "ferien_MV_2026"
// Identisch zu den alten Dateinamen — kein Datenverlust beim Upgrade.

function cacheId(type, state, year) {
  return `${type}_${state.toUpperCase()}_${year}`;
}

function readCache(id) {
  try {
    const row = databaseService.db
      .prepare('SELECT data, fetched_at FROM holiday_cache WHERE id = ?')
      .get(id);
    if (!row) return null;
    if (Date.now() - new Date(row.fetched_at).getTime() > CACHE_TTL) return null;
    return JSON.parse(row.data);
  } catch { return null; }
}

function writeCache(id, data) {
  try {
    databaseService.db
      .prepare('INSERT OR REPLACE INTO holiday_cache (id, data, fetched_at) VALUES (?, ?, ?)')
      .run(id, JSON.stringify(data), new Date().toISOString());
  } catch(e) {
    console.warn('[holidays] SQLite Cache-Schreiben fehlgeschlagen:', e.message);
  }
}

// ─── HTTP fetch (kein npm nötig) ─────────────────────────────────────────────
function fetchJSON(url, timeout=8000) {
  return new Promise((resolve,reject) => {
    const mod=url.startsWith('https')?https:http;
    const req=mod.get(url,{headers:{'Accept':'application/json','User-Agent':'PixFrameWorkspace/1.0'}},res => {
      if (res.statusCode>=300&&res.statusCode<400&&res.headers.location)
        return fetchJSON(res.headers.location,timeout).then(resolve).catch(reject);
      if (res.statusCode!==200)
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      const chunks=[];
      res.on('data',c=>chunks.push(c));
      res.on('end',()=>{
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch(e){ reject(new Error('JSON parse: '+e.message)); }
      });
      res.on('error',reject);
    });
    req.setTimeout(timeout,()=>{req.destroy();reject(new Error(`Timeout nach ${timeout}ms`));});
    req.on('error',reject);
  });
}

// ─── Feiertage laden ─────────────────────────────────────────────────────────
async function loadFeiertageForStateYear(state, year) {
  const id = cacheId('feiertag', state, year);
  const cached = readCache(id);
  if (cached) return { data: cached, source: 'cache' };

  // Quelle 1: feiertage-api.de
  try {
    const url = `https://feiertages-api.de/api/?jahr=${year}&nur_land=${state.toUpperCase()}`;
    const json = await fetchJSON(url, 6000);
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      const data = Object.entries(json)
        .map(([name,val]) => ({ name, start: val.datum, end: val.datum }))
        .filter(h => h.start && /^\d{4}-\d{2}-\d{2}$/.test(h.start))
        .sort((a,b) => a.start.localeCompare(b.start));
      if (data.length > 0) {
        writeCache(id, data);
        return { data, source: 'feiertage-api.de' };
      }
    }
    throw new Error('Leere Antwort von feiertage-api.de');
  } catch(e) {
    console.warn(`[holidays] feiertage-api.de ${state}/${year} fehlgeschlagen: ${e.message}`);
  }

  // Fallback: Gauß-Offline (wird NICHT gecacht — nächste Anfrage versucht API erneut)
  const data = computeFeiertageOffline(year, [state]);
  return { data, source: 'offline-gauss' };
}

// ─── Schulferien laden ────────────────────────────────────────────────────────
async function loadFerienForStateYear(state, year) {
  const id = cacheId('ferien', state, year);
  const cached = readCache(id);
  if (cached) return { data: cached, source: 'cache' };

  // Quelle 1: openholidaysapi.org
  try {
    const code = OPEN_HOLIDAYS_CODE[state.toUpperCase()];
    if (!code) throw new Error(`Kein OpenHolidays-Code für Bundesland: ${state}`);
    const from = `${year}-01-01`, to = `${year}-12-31`;
    const url = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${from}&validTo=${to}&subdivisionCode=${code}`;
    const json = await fetchJSON(url, 8000);
    if (Array.isArray(json) && json.length > 0) {
      const data = json.map(h => {
        const nameObj = (h.name||[]).find(n => n.language === 'DE') || (h.name||[])[0] || {};
        return { name: nameObj.text || 'Schulferien', start: h.startDate || null, end: h.endDate || null };
      }).filter(h => h.start && h.end).sort((a,b) => a.start.localeCompare(b.start));
      if (data.length > 0) {
        writeCache(id, data);
        return { data, source: 'openholidaysapi.org' };
      }
    }
    throw new Error('Leere Antwort von openholidaysapi.org');
  } catch(e) {
    console.warn(`[holidays] openholidaysapi.org ${state}/${year} fehlgeschlagen: ${e.message}`);
  }

  // Quelle 2: ferien-api.de (Backup)
  try {
    const url = `https://ferien-api.de/api/v1/holidays/${state.toUpperCase()}/${year}`;
    const json = await fetchJSON(url, 8000);
    if (Array.isArray(json) && json.length > 0) {
      const data = json.map(h => ({
        name:  slugToFerienName(h.name || h.slug || ''),
        start: h.start ? h.start.slice(0,10) : null,
        end:   h.end   ? h.end.slice(0,10)   : null,
      })).filter(h => h.start && h.end).sort((a,b) => a.start.localeCompare(b.start));
      if (data.length > 0) {
        writeCache(id, data);
        return { data, source: 'ferien-api.de' };
      }
    }
    throw new Error('Leere Antwort von ferien-api.de');
  } catch(e) {
    console.warn(`[holidays] ferien-api.de ${state}/${year} fehlgeschlagen: ${e.message}`);
  }

  return { data: [], source: 'none', error: `Schulferien ${state}/${year} nicht verfügbar (beide APIs nicht erreichbar)` };
}

// ─── Controller ──────────────────────────────────────────────────────────────
class HolidayController {

  /**
   * GET /api/holidays/ferien?states=MV,SH&years=2025,2026
   */
  async getSchulferien(req, res) {
    try {
      const states = (req.query.states || 'MV').toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
      const years  = (req.query.years  || String(new Date().getFullYear())).split(',')
        .map(y => parseInt(y)).filter(y => y > 2020 && y < 2035);
      if (!states.length || !years.length) return res.json({ data: [], sources: [] });

      const tasks   = states.flatMap(s => years.map(y => loadFerienForStateYear(s, y)));
      const results = await Promise.allSettled(tasks);

      const seen = new Set(), merged = [], sources = new Set(), errors = [];
      for (const r of results) {
        if (r.status !== 'fulfilled') { errors.push(r.reason?.message || 'Unbekannter Fehler'); continue; }
        const { data, source, error } = r.value;
        if (source) sources.add(source);
        if (error)  errors.push(error);
        for (const ev of data) {
          const key = `${(ev.name||'').toLowerCase().replace(/\s/g,'')}|${(ev.start||'').slice(0,7)}|${(ev.end||'').slice(0,7)}`;
          if (!seen.has(key)) { seen.add(key); merged.push(ev); }
        }
      }
      merged.sort((a,b) => (a.start||'').localeCompare(b.start||''));
      res.json({ data: merged, sources: [...sources], errors: errors.length ? errors : undefined });

    } catch(e) {
      console.error('[holidays] getSchulferien Fehler:', e.message);
      res.status(500).json({ error: e.message, data: [] });
    }
  }

  /**
   * GET /api/holidays/feiertage?states=MV,SH&years=2025,2026
   */
  async getFeiertage(req, res) {
    try {
      const states = (req.query.states || 'MV').toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
      const years  = (req.query.years  || String(new Date().getFullYear())).split(',')
        .map(y => parseInt(y)).filter(y => y > 2020 && y < 2035);
      if (!states.length || !years.length) return res.json({ data: [], sources: [] });

      const tasks   = states.flatMap(s => years.map(y => loadFeiertageForStateYear(s, y)));
      const results = await Promise.allSettled(tasks);

      const seen = new Set(), merged = [], sources = new Set();
      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        const { data, source } = r.value;
        if (source) sources.add(source);
        for (const ev of data) {
          const key = `${(ev.name||'').toLowerCase().replace(/\s/g,'')}|${ev.start||''}`;
          if (!seen.has(key)) { seen.add(key); merged.push(ev); }
        }
      }
      merged.sort((a,b) => (a.start||'').localeCompare(b.start||''));
      res.json({ data: merged, sources: [...sources] });

    } catch(e) {
      console.error('[holidays] getFeiertage Fehler:', e.message);
      res.status(500).json({ error: e.message, data: [] });
    }
  }

  /**
   * DELETE /api/holidays/cache — Cache leeren für Neu-Fetch
   */
  clearCache(req, res) {
    try {
      const info = databaseService.db
        .prepare('DELETE FROM holiday_cache')
        .run();
      res.json({ deleted: info.changes, message: `${info.changes} Cache-Einträge gelöscht` });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = new HolidayController();
