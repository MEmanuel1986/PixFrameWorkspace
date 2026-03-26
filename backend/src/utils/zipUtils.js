'use strict';
/**
 * zipUtils.js
 * Plattformunabhängige ZIP-Operationen für Windows + macOS/Linux.
 *
 * Strategie:
 *   Erstellen: Node.js native (keine externen Tools, keine Shell-Aufrufe)
 *              zlib.createDeflateRaw + manuelle ZIP-Struktur via Buffer
 *              → Funktioniert überall, keine Pfadprobleme mit Leerzeichen
 *
 *   Entpacken: yauzl (bereits als Puppeteer-Dependency verfügbar)
 *              → Reines Node.js, kein unzip-Binary nötig
 *
 * Warum nicht execSync('zip'/'unzip')?
 *   - Pfade mit Leerzeichen (häufig auf macOS: /Users/name/My Documents/)
 *     erfordern sorgfältiges Quoting das in Shell-Strings fehleranfällig ist
 *   - 'zip' ist auf macOS standardmäßig vorhanden, aber auf einigen Linux-
 *     Systemen nicht (z.B. minimale Docker-Images)
 *   - PowerShell Compress-Archive ist sehr langsam bei vielen kleinen Dateien
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Hilfsfunktionen für ZIP-Format ────────────────────────────────────────────

function dosTime(date) {
  const d = date || new Date();
  return ((d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate()) << 16
       | (d.getHours() << 11 | d.getMinutes() << 5 | (d.getSeconds() >> 1));
}

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function writeUInt16LE(buf, val, offset) { buf[offset] = val & 0xFF; buf[offset + 1] = (val >> 8) & 0xFF; }
function writeUInt32LE(buf, val, offset) {
  buf[offset]     =  val         & 0xFF;
  buf[offset + 1] = (val >>  8)  & 0xFF;
  buf[offset + 2] = (val >> 16)  & 0xFF;
  buf[offset + 3] = (val >> 24)  & 0xFF;
}

/**
 * Erstellt ein ZIP-Archiv aus einem Verzeichnis.
 * Reines Node.js — kein Shell-Aufruf, kein externes Tool.
 *
 * @param {string} sourceDir  - Verzeichnis dessen Inhalt gezippt wird
 * @param {string} outputPath - Ausgabe-ZIP-Dateipfad
 */
async function createZip(sourceDir, outputPath) {
  const entries = [];

  // Alle Dateien rekursiv sammeln
  function walkDir(dir, relBase) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const relPath  = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walkDir(fullPath, relPath);
      } else {
        entries.push({ fullPath, relPath });
      }
    }
  }
  walkDir(sourceDir, '');

  const localHeaders  = [];
  const centralDirs   = [];
  let   offset        = 0;
  const now           = new Date();
  const dosDateTime   = dosTime(now);

  for (const { fullPath, relPath } of entries) {
    const rawData      = fs.readFileSync(fullPath);
    const compressed   = zlib.deflateRawSync(rawData, { level: 6 });
    const crc          = crc32(rawData);
    const nameBytes    = Buffer.from(relPath, 'utf8');
    const methodBytes  = compressed.length < rawData.length ? compressed : rawData;
    const method       = compressed.length < rawData.length ? 8 : 0;
    const compData     = method === 8 ? compressed : rawData;

    // Local file header (30 bytes + name)
    const localHeader  = Buffer.alloc(30 + nameBytes.length);
    writeUInt32LE(localHeader,  0x04034B50,       0);  // signature
    writeUInt16LE(localHeader,  20,                4);  // version needed
    writeUInt16LE(localHeader,  0x0800,            6);  // flags (UTF-8)
    writeUInt16LE(localHeader,  method,            8);  // compression
    writeUInt32LE(localHeader,  dosDateTime,       10); // mod time+date
    writeUInt32LE(localHeader,  crc,               14); // CRC-32
    writeUInt32LE(localHeader,  compData.length,   18); // compressed size
    writeUInt32LE(localHeader,  rawData.length,    22); // uncompressed size
    writeUInt16LE(localHeader,  nameBytes.length,  26); // name length
    writeUInt16LE(localHeader,  0,                 28); // extra length
    nameBytes.copy(localHeader, 30);

    // Central directory entry
    const centralDir = Buffer.alloc(46 + nameBytes.length);
    writeUInt32LE(centralDir,   0x02014B50,       0);   // signature
    writeUInt16LE(centralDir,   20,                4);   // version made by
    writeUInt16LE(centralDir,   20,                6);   // version needed
    writeUInt16LE(centralDir,   0x0800,            8);   // flags
    writeUInt16LE(centralDir,   method,            10);  // compression
    writeUInt32LE(centralDir,   dosDateTime,       12);  // mod time+date
    writeUInt32LE(centralDir,   crc,               16);  // CRC-32
    writeUInt32LE(centralDir,   compData.length,   20);  // compressed size
    writeUInt32LE(centralDir,   rawData.length,    24);  // uncompressed size
    writeUInt16LE(centralDir,   nameBytes.length,  28);  // name length
    writeUInt16LE(centralDir,   0,                 30);  // extra length
    writeUInt16LE(centralDir,   0,                 32);  // comment length
    writeUInt16LE(centralDir,   0,                 34);  // disk start
    writeUInt16LE(centralDir,   0,                 36);  // int attributes
    writeUInt32LE(centralDir,   0,                 38);  // ext attributes
    writeUInt32LE(centralDir,   offset,            42);  // local header offset
    nameBytes.copy(centralDir,  46);

    localHeaders.push(localHeader, compData);
    centralDirs.push(centralDir);
    offset += localHeader.length + compData.length;
  }

  const cdBuf    = Buffer.concat(centralDirs);
  const eocd     = Buffer.alloc(22);
  const cdOffset = offset;

  writeUInt32LE(eocd, 0x06054B50,        0);  // EOCD signature
  writeUInt16LE(eocd, 0,                 4);  // disk number
  writeUInt16LE(eocd, 0,                 6);  // start disk
  writeUInt16LE(eocd, entries.length,    8);  // entries on disk
  writeUInt16LE(eocd, entries.length,   10);  // total entries
  writeUInt32LE(eocd, cdBuf.length,     12);  // central dir size
  writeUInt32LE(eocd, cdOffset,         16);  // central dir offset
  writeUInt16LE(eocd, 0,               20);   // comment length

  const outBuf = Buffer.concat([...localHeaders, cdBuf, eocd]);

  // Sicherstellen dass Ausgabeverzeichnis existiert
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outputPath, outBuf);
}

/**
 * Entpackt ein ZIP-Archiv mit yauzl (reines Node.js, kein unzip-Binary).
 * yauzl ist als Puppeteer-Dependency bereits verfügbar.
 *
 * @param {string} zipPath   - Pfad zur ZIP-Datei
 * @param {string} targetDir - Zielverzeichnis
 */
async function extractZip(zipPath, targetDir) {
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const yauzl = require('yauzl');

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.readEntry();

      zipfile.on('entry', entry => {
        const destPath = path.join(targetDir, entry.fileName);

        // BB-1: Path Traversal Guard — verhindert dass ein manipuliertes ZIP
        // Dateien außerhalb von targetDir schreibt (z.B. ../../backend/.env)
        const resolvedTarget = path.resolve(targetDir);
        const resolvedDest   = path.resolve(destPath);
        if (!resolvedDest.startsWith(resolvedTarget + path.sep)) {
          zipfile.readEntry(); // Eintrag überspringen
          return;
        }

        // Verzeichnis-Eintrag
        if (/\/$/.test(entry.fileName)) {
          fs.mkdirSync(destPath, { recursive: true });
          zipfile.readEntry();
          return;
        }

        // Datei-Eintrag
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        zipfile.openReadStream(entry, (err2, readStream) => {
          if (err2) return reject(err2);
          const ws = fs.createWriteStream(destPath);
          readStream.pipe(ws);
          ws.on('finish', () => zipfile.readEntry());
          ws.on('error', reject);
        });
      });

      zipfile.on('end',   resolve);
      zipfile.on('error', reject);
    });
  });
}

module.exports = { createZip, extractZip };
