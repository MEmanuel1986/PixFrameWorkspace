const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const os = require('os');
const path = require('path');
const config = require('./config');
const paths = require('./config/paths');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const customerRoutes = require('./routes/customers');
const projectRoutes = require('./routes/projects');
const documentRoutes = require('./routes/documents');
const settingsRoutes  = require('./routes/settings');
const fibuRoutes      = require('./routes/fibu');
const articleRoutes   = require('./routes/articles');
const holidayRoutes   = require('./routes/holidays');
const emailRoutes     = require('./routes/email');
const pdfRoutes       = require('./routes/pdf');
const backupRoutes    = require('./routes/backup');

const app = express();

// ━━━ Middleware ━━━
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(fileUpload({
  limits: { fileSize: config.MAX_FILE_SIZE },
  useTempFiles: true,
  tempFileDir: os.tmpdir(),
}));

// ━━━ Static Files ━━━
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  next()
}, express.static(paths.UPLOADS_DIR));

// ━━━ Logging ━━━
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ━━━ Health Check ━━━
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: config.APP_NAME,
    timestamp: new Date().toISOString(),
    version: '1.1.0',
  });
});

// ━━━ API Routes ━━━
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/settings',  settingsRoutes);
app.use('/api/fibu',      fibuRoutes);
app.use('/api/articles',  articleRoutes);
app.use('/api/holidays',  holidayRoutes);
app.use('/api/email',     emailRoutes);
app.use('/api/pdf',       pdfRoutes);
app.use('/api/backup',    backupRoutes);

// ━━━ 404 Handler ━━━
app.use((req, res) => {
  res.status(404).json({
    error: 'Route nicht gefunden',
    path: req.path,
    app: config.APP_NAME,
  });
});

// ━━━ Error Handler ━━━
app.use(errorHandler);

module.exports = app;
