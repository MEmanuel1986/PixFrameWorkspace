'use strict';
const express = require('express');
const ctrl    = require('../controllers/updateController');
const router  = express.Router();

router.post('/preview', ctrl.preview);
router.post('/apply',   ctrl.apply);

module.exports = router;
