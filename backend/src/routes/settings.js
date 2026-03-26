'use strict';
const express = require('express');
const ctrl    = require('../controllers/settingsController');
const router  = express.Router();

router.get('/',          ctrl.get);
router.put('/',          ctrl.update);
router.patch('/',        ctrl.update);
router.post('/logo',     ctrl.uploadLogo);
router.delete('/logo',   ctrl.deleteLogo);
// /pick-folder entfernt — gehört zur 🚧 System-Tab (Electron-Migration)

module.exports = router;
