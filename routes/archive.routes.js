// routes/archive.routes.js

const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archive.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

router.get('/jobs', authenticateToken, archiveController.getArchivedJobs);

module.exports = router;