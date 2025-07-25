// routes/marketplace.routes.js

const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplace.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

router.get('/jobs', authenticateToken, marketplaceController.getPublicJobs);

module.exports = router;