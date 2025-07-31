const express = require('express');
const router = express.Router();
const finishingController = require('../controllers/finishing.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizePermission = require('../middleware/authorizePermission');

const canManageAdmin = authorizePermission('manage_admin');

router.get('/', [authenticateToken, canManageAdmin], finishingController.getFinishings);
router.post('/', [authenticateToken, canManageAdmin], finishingController.createFinishing);
router.put('/:finishingId', [authenticateToken, canManageAdmin], finishingController.updateFinishing);
router.delete('/:finishingId', [authenticateToken, canManageAdmin], finishingController.deleteFinishing);

module.exports = router;