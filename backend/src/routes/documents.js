const express = require('express');
const ctrl    = require('../controllers/documentController');
const router  = express.Router();

// Collection + special POST routes BEFORE /:id
router.get('/',                      ctrl.getAll.bind(ctrl));
router.post('/generate',             ctrl.generate.bind(ctrl));
router.post('/',                     ctrl.create.bind(ctrl));

// Specific GET sub-collections BEFORE /:id
router.get('/customer/:customerId',  ctrl.getByCustomer.bind(ctrl));
router.get('/project/:projectId',    ctrl.getByProject.bind(ctrl));

// Actions on a specific document
router.put('/:id/edit',              ctrl.editDoc.bind(ctrl));
router.post('/:id/revise',           ctrl.revise.bind(ctrl));
router.post('/:id/invoice',          ctrl.invoiceFromQuote.bind(ctrl));
router.post('/:id/correct',          ctrl.correct.bind(ctrl));
router.post('/:id/cancel',           ctrl.cancel.bind(ctrl));
router.patch('/:id/status',          ctrl.setStatus.bind(ctrl));

// CRUD
router.get('/:id',                   ctrl.getById.bind(ctrl));
router.put('/:id',                   ctrl.update.bind(ctrl));
router.delete('/:id',                ctrl.delete.bind(ctrl));

module.exports = router;
