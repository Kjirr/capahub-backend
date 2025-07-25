const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

// Route om de lijst van teamleden op te halen
router.get('/', authenticateToken, teamController.getTeamMembers);

// Route om een nieuw teamlid uit te nodigen
router.post('/invite', authenticateToken, teamController.inviteMember);

module.exports = router;