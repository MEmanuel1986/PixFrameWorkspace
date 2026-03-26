const express = require('express');
const customerController = require('../controllers/customerController');

const router = express.Router();

/**
 * ━━━ Customer Routes ━━━
 */
router.get('/', customerController.getAll.bind(customerController));
router.post('/', customerController.create.bind(customerController));
router.get('/:id', customerController.getById.bind(customerController));
router.put('/:id', customerController.update.bind(customerController));
router.delete('/:id', customerController.delete.bind(customerController));

module.exports = router;