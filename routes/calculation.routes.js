const express = require('express');
const router = express.Router();
const calculationController = require('../controllers/calculation.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const authorizePermission = require('../middleware/authorizePermission');

// De calculator is een premium feature. We gebruiken 'manage_admin' als tijdelijke
// placeholder voor een 'create_quotes' permissie die in een betaald plan zit.
const canCalculate = authorizePermission('manage_admin');

// De hoofdroute die een volledige offertecalculatie uitvoert
router.post('/run', [authenticateToken, canCalculate], calculationController.runCalculation);

module.exports = router;