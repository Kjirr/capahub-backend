const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

// --- TEAMLEDEN BEHEREN ---
router.get('/', authenticateToken, teamController.getTeamMembers);
router.post('/invite', authenticateToken, teamController.inviteMember);
router.post('/add-direct', [authenticateToken, authorizeRole('owner')], teamController.addMemberDirectly);
router.delete('/:memberId', [authenticateToken, authorizeRole('owner')], teamController.suspendMember);


// --- RECHTENBEHEER ---
// Haal alle beschikbare permissies op in het systeem
router.get(
    '/permissions/all', 
    authenticateToken, 
    teamController.getAllPermissions
);

// Haal de specifieke permissies van één teamlid op
router.get(
    '/:memberId/permissions',
    [authenticateToken, authorizeRole('owner')],
    teamController.getMemberPermissions
);

// Update de permissies voor een teamlid
router.put(
    '/:memberId/permissions',
    [authenticateToken, authorizeRole('owner')],
    teamController.updateMemberPermissions
);

module.exports = router;