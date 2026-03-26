'use strict';
const express         = require('express');
const emailController = require('../controllers/emailController');

const router = express.Router();

router.post('/send',  emailController.sendEmail.bind(emailController));
router.post('/test',  emailController.testEmail.bind(emailController));
router.get('/config', emailController.getConfig.bind(emailController));

module.exports = router;
