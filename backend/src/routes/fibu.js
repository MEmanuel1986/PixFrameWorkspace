'use strict';

const express        = require('express');
const router         = express.Router();
const fibuController = require('../controllers/fibuController');

// Kein multer — express-fileupload ist global in app.js registriert
// und stellt req.files bereit

router.get('/',                             fibuController.getAll);
router.post('/expenses',                    fibuController.createExpense);
router.put('/expenses/:id',                 fibuController.updateExpense);
router.delete('/expenses/:id',              fibuController.deleteExpense);
router.post('/mileage',                     fibuController.createMileage);
router.put('/mileage/:id',                  fibuController.updateMileage);
router.delete('/mileage/:id',               fibuController.deleteMileage);

router.get('/datev-export',               fibuController.datevExport);  // BQ-5

// BQ-7 — Eingangsrechnungen
router.post('/external-invoices',          fibuController.createExternalInvoice);
router.put('/external-invoices/:id',       fibuController.updateExternalInvoice);
router.delete('/external-invoices/:id',    fibuController.deleteExternalInvoice);

module.exports = router;
