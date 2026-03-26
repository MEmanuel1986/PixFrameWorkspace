'use strict';
const express           = require('express');
const holidayController = require('../controllers/holidayController');

const router = express.Router();

router.get('/ferien',    holidayController.getSchulferien.bind(holidayController));
router.get('/feiertage', holidayController.getFeiertage.bind(holidayController));
router.delete('/cache',  holidayController.clearCache.bind(holidayController));

module.exports = router;
