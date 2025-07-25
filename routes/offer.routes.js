// routes/offer.routes.js

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offer.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

// GET /api/offers/my-offers (de lijst)
router.get('/my-offers', authenticateToken, offerController.getMyOffers);

// POST /api/offers (nieuw aanbod)
router.post('/', authenticateToken, offerController.createOffer);

// GET /api/offers/:id (details van één aanbod)
router.get('/:id', authenticateToken, offerController.getOfferById);

// PUT /api/offers/:id (aanbod bijwerken)
router.put('/:id', authenticateToken, offerController.updateOffer);

// DELETE /api/offers/:id (aanbod verwijderen)
router.delete('/:id', authenticateToken, offerController.deleteOffer);

module.exports = router;
