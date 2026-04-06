'use strict';

const router = require('express').Router();
const resetController = require('../controllers/resetController');

// POST /api/reset/execute – Vollständiger Reset
router.post('/execute', resetController.executeReset);

// POST /api/reset/validate – Passwort prüfen (ohne Reset)
router.post('/validate', resetController.validatePassword);

module.exports = router;
