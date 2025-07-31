// routes/production.routes.js

const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizePermission = require('../middleware/authorizePermission'); // Nieuw
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

// Beveilig de productie-routes met de juiste permissie
const canManageProduction = authorizePermission('manage_production');

// --- NIEUWE ROUTE VOOR HET KANBAN BORD ---
router.get('/board-data', [authenticateToken, canManageProduction], productionController.getBoardData);


// --- Bestaande routes blijven bestaan, maar worden ook beveiligd ---
router.get('/my-productions', [authenticateToken, canManageProduction], productionController.getMyProductions);
router.post('/:jobId/steps', [authenticateToken, canManageProduction], productionController.addProductionStep);
router.put('/steps/:stepId', [authenticateToken, canManageProduction], productionController.updateProductionStepStatus);

module.exports = router;