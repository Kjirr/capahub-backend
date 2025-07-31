const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchase-order.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizePermission = require('../middleware/authorizePermission');

// Beveilig alle routes met de 'manage_purchasing' permissie
const canManagePurchasing = authorizePermission('manage_purchasing');

// --- BESTAANDE ROUTES ---
router.get('/', [authenticateToken, canManagePurchasing], purchaseOrderController.getPurchaseOrders);
router.get('/:poId', [authenticateToken, canManagePurchasing], purchaseOrderController.getPurchaseOrderById);
router.post('/', [authenticateToken, canManagePurchasing], purchaseOrderController.createPurchaseOrder);
router.put('/:poId/status', [authenticateToken, canManagePurchasing], purchaseOrderController.updatePurchaseOrderStatus);

// --- NIEUWE ROUTE ---
// Route om de inkooporder via e-mail te versturen
router.post('/:poId/send', [authenticateToken, canManagePurchasing], purchaseOrderController.sendPurchaseOrder);


module.exports = router;