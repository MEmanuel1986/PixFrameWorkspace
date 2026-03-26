const fs    = require('fs');
const path  = require('path');
const paths = require('../config/paths');

// Pfad aus zentralem paths-Modul — funktioniert auf Windows + macOS unabhängig
// vom Arbeitsverzeichnis beim Start (cwd)
const logDir = paths.LOGS_DIR;
// Verzeichnis wird bereits in paths.js sichergestellt

const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logEntry, data || '');

  // Speichern in Datei
  const logFile = path.join(logDir, `pixframeworkspace-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, `${logEntry} ${data ? JSON.stringify(data) : ''}\n`);
};

module.exports = {
  info: (msg, data) => log('INFO', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  debug: (msg, data) => log('DEBUG', msg, data),
};