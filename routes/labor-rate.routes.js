const express = require('express');
const router = express.Router();
const laborRateController = require('../controllers/labor-rate.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizePermission = require('../middleware/authorizePermission');

const canManageAdmin = authorizePermission('manage_admin');

router.get('/', [authenticateToken, canManageAdmin], laborRateController.getLaborRates);
router.post('/', [authenticateToken, canManageAdmin], laborRateController.createLaborRate);
router.put('/:rateId', [authenticateToken, canManageAdmin], laborRateController.updateLaborRate);
router.delete('/:rateId', [authenticateToken, canManageAdmin], laborRateController.deleteLaborRate);

module.exports = router;