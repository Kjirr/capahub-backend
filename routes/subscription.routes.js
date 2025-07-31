const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');

// Route voor een eigenaar om een "dummy" abonnement te starten
router.post(
    '/start-dummy-plan', 
    [authenticateToken, authorizeRole('owner')], 
    subscriptionController.startDummyPlan
);

// Hier komt later de route voor de Stripe webhook
// router.post('/stripe-webhook', ...);

module.exports = router;