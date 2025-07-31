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

router.use(authenticateToken, adminMiddleware);

// Hoofd admin routes
router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/approve', adminController.approveUser);
router.get('/companies', adminController.getAllCompanies);

// Routes voor abonnementenbeheer
router.get('/plans', adminController.getPlans);
router.get('/permissions', adminController.getPermissions);
router.put('/plans/:planId/permissions', adminController.updatePlanPermissions);

// --- NIEUW: Routes voor Dashboard Data ---
router.get('/dashboard/pending-users', adminController.getPendingUsers);
router.get('/dashboard/recent-companies', adminController.getRecentCompanies);


module.exports = router;