// routes/quote.routes.js

const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quote.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

// GET /api/quotes/my-submitted (Lijst van eigen offertes)
router.get('/my-submitted', authenticateToken, quoteController.getMySubmittedQuotes);

// POST /api/quotes/:jobId (Nieuwe offerte indienen)
router.post('/:jobId', authenticateToken, quoteController.submitQuote);

// GET /api/quotes/:quoteId (Details van één offerte voor bewerken)
router.get('/:quoteId', authenticateToken, quoteController.getQuoteById);

// PUT /api/quotes/:quoteId (Offerte bijwerken)
router.put('/:quoteId', authenticateToken, quoteController.updateQuote);

// PUT /api/quotes/:quoteId/accept (Offerte accepteren)
router.put('/:quoteId/accept', authenticateToken, quoteController.acceptQuote);

module.exports = router;
