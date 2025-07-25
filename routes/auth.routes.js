const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const adminLoginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: 'Te veel inlogpogingen.' });
router.post('/login', (req, res, next) => { (req.body.email && req.body.email.toLowerCase() === ADMIN_EMAIL) ? adminLoginLimiter(req, res, next) : next(); }, authController.login);
router.post('/register', authController.register);
module.exports = router;