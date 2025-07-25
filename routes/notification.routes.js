// routes/notification.routes.js

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller.js');
const authenticateToken = require('../middleware/authenticateToken');

// GET /api/notifications (haalt alle notificaties op)
router.get('/', authenticateToken, notificationController.getNotifications);

// PUT /api/notifications/:id/read (markeert als gelezen)
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

module.exports = router;
