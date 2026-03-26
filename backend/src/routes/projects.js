const express = require('express');
const projectController = require('../controllers/projectController');

const router = express.Router();

/**
 * ━━━ Number generation (must come BEFORE /:id routes) ━━━
 */
router.get('/next-contract-number', projectController.getNextContractNumber.bind(projectController));
router.get('/next-addendum-number', projectController.getNextAddendumNumber.bind(projectController));

/**
 * ━━━ Project CRUD ━━━
 */
router.get('/',     projectController.getAll.bind(projectController));
router.post('/',    projectController.create.bind(projectController));
router.get('/customer/:customerId', projectController.getByCustomer.bind(projectController));
router.get('/:id',  projectController.getById.bind(projectController));
router.put('/:id',  projectController.update.bind(projectController));
router.delete('/:id', projectController.delete.bind(projectController));

// ─── Signed Contracts ───
router.post('/:id/contracts',              projectController.uploadSignedContract.bind(projectController));
router.delete('/:id/contracts/:cid',       projectController.deleteSignedContract.bind(projectController));
router.get('/:id/contracts/:cid/download', projectController.downloadSignedContract.bind(projectController));

// ─── Signed Addenda ───
router.post('/:id/addenda/:addendumId/sign',         projectController.uploadSignedAddendum.bind(projectController));
router.delete('/:id/addenda/:addendumId/sign',       projectController.deleteSignedAddendum.bind(projectController));
router.get('/:id/addenda/:addendumId/sign/download', projectController.downloadSignedAddendum.bind(projectController));

// ─── Customer Photo ───
router.post('/:id/customer-photo',   projectController.uploadCustomerPhoto.bind(projectController));
router.delete('/:id/customer-photo', projectController.deleteCustomerPhoto.bind(projectController));

// ─── SD-Karten Import ───

module.exports = router;
