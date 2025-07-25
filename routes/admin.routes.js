
// routes/admin.routes.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller.js');
const authenticateToken = require('../middleware/authenticateToken');

// --- OPENBARE ROUTES (voor setup) ---
router.get('/status', adminController.checkStatus);
router.post('/setup', adminController.setupAdmin);

// --- BEVEILIGDE ADMIN ROUTES ---
const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Toegang geweigerd. Adminrechten vereist.' });
    }
    next();
};

// Alle routes hieronder vereisen een geldige token en adminrechten
router.use(authenticateToken, adminMiddleware);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/approve', adminController.approveUser);
router.get('/companies', adminController.getAllCompanies); // <-- De nieuwe route

module.exports = router;
