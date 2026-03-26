require('dotenv').config();

const paths = require('./paths');

module.exports = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Pfade (absolut, plattformunabhängig via paths.js)
  DATA_DIR:    paths.DATA_DIR,
  UPLOADS_DIR: paths.UPLOADS_DIR,
  BACKUPS_DIR: paths.BACKUPS_DIR,

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Frontend URL (für Puppeteer)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Datengrenzen
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILE_SIZE_MB: 50,

  // Datenbank (später für SQL)
  DATABASE_URL: process.env.DATABASE_URL || null,

  // App Name
  APP_NAME: 'PixFrameWorkspace',
};