// routes/production.routes.js

const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

// GET /api/productions/my-productions (de lijst)
router.get('/my-productions', authenticateToken, productionController.getMyProductions);

// POST /api/productions/:jobId/steps (stap toevoegen)
router.post('/:jobId/steps', authenticateToken, productionController.addProductionStep);

// PUT /api/productions/steps/:stepId (stap status wijzigen)
router.put('/steps/:stepId', authenticateToken, productionController.updateProductionStepStatus);

module.exports = router;
