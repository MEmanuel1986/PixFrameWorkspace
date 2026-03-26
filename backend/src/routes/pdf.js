/**
 * routes/pdf.js
 * PDF-Download-Routen für alle Dokument-Typen.
 * Eingebunden in app.js unter /api/pdf
 */

const express = require('express')
const ctrl    = require('../controllers/pdfController')
const router  = express.Router()

// Dokumente (Rechnungen, Angebote)
router.get('/document/:id',          ctrl.document)

// Vertragstypen
router.get('/contract/:projectId',   ctrl.contract)
router.get('/adv/:projectId',        ctrl.adv)
router.get('/addendum/:pid/:aid',    ctrl.addendum)

// Statische Dokumente
router.get('/agb',                   ctrl.agb)
router.get('/dsgvo',                 ctrl.dsgvo)
router.get('/adv-vertrag',           ctrl.advVertrag)
router.get('/blank-contract',        ctrl.blankContract)

// Finanzen
router.get('/ear/:year',             ctrl.ear)

module.exports = router
