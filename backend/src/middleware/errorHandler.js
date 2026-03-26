const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error('Error occurred', err.message);

  const status = err.status || 500;
  const message = err.message || 'Interner Serverfehler';

  res.status(status).json({
    error: message,
    status,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};