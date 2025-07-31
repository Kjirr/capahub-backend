const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machine.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizePermission = require('../middleware/authorizePermission');

// Het beheren van machines is een administratieve taak.
// We beveiligen deze routes met de 'manage_admin' permissie.
const canManageAdmin = authorizePermission('manage_admin');

// Haal alle machines op
router.get('/', [authenticateToken, canManageAdmin], machineController.getMachines);

// Maak een nieuwe machine aan
router.post('/', [authenticateToken, canManageAdmin], machineController.createMachine);

// Werk een bestaande machine bij
router.put('/:machineId', [authenticateToken, canManageAdmin], machineController.updateMachine);

// Verwijder een machine
router.delete('/:machineId', [authenticateToken, canManageAdmin], machineController.deleteMachine);

module.exports = router;