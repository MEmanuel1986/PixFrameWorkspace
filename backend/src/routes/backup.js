'use strict';
const express = require('express');
const ctrl    = require('../controllers/backupController');
const router  = express.Router();

router.get('/list',                ctrl.list);
router.post('/create',             ctrl.create);
router.post('/restore/:filename',  ctrl.restore);
router.post('/import',             ctrl.importBackup);
router.delete('/:filename',        ctrl.delete);
router.get('/download/:filename',  ctrl.download);

module.exports = router;
