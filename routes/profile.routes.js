// routes/profile.routes.js

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

// Route om het profiel op te halen: GET /api/profile
router.get('/', authenticateToken, profileController.getProfile);

// Route om het profiel bij te werken: PUT /api/profile
router.put('/', authenticateToken, profileController.updateProfile);

module.exports = router;
