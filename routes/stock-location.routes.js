const express = require('express');
const router = express.Router();
const stockLocationController = require('../controllers/stock-location.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizePermission = require('../middleware/authorizePermission');

// Beveilig alle routes met de 'manage_warehouse' permissie
const canManageWarehouse = authorizePermission('manage_warehouse');

// --- BESTAANDE ROUTES ---
// Route om alle locaties van een bedrijf op te halen
router.get('/', [authenticateToken, canManageWarehouse], stockLocationController.getLocations);

// Route om een nieuwe locatie aan te maken
router.post('/', [authenticateToken, canManageWarehouse], stockLocationController.createLocation);


// --- NIEUWE ROUTE VOOR VOORRAADCORRECTIE ---
// Deze route past de voorraad van een specifiek materiaal op een specifieke locatie aan.
router.post('/inventory/correct', [authenticateToken, canManageWarehouse], stockLocationController.correctStock);


module.exports = router;