const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizePermission = require('../middleware/authorizePermission');

// We beveiligen alle leverancier-routes met de 'manage_purchasing' permissie
const canManagePurchasing = authorizePermission('manage_purchasing');

// Route om alle leveranciers van een bedrijf op te halen
router.get('/', [authenticateToken, canManagePurchasing], supplierController.getSuppliers);

// Route om een nieuwe leverancier aan te maken
router.post('/', [authenticateToken, canManagePurchasing], supplierController.createSupplier);

module.exports = router;