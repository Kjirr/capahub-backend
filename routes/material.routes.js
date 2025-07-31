const express = require('express');
const router = express.Router();
const materialController = require('../controllers/material.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizePermission = require('../middleware/authorizePermission'); // De nieuwe middleware

// We beveiligen alle routes in dit bestand met een check op het 'manage_materials' recht.

// Route om alle materialen van een bedrijf op te halen
router.get(
    '/',
    [authenticateToken, authorizePermission('manage_materials')],
    materialController.getMaterials
);

// Route om een nieuw materiaal aan te maken
router.post(
    '/',

    [authenticateToken, authorizePermission('manage_materials')],
    materialController.createMaterial
);

// Hier komen in de toekomst meer routes, bv. voor updaten en verwijderen
// router.put('/:materialId', ...);
// router.delete('/:materialId', ...);

module.exports = router;