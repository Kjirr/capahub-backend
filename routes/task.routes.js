// routes/task.routes.js

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

// GET /api/tasks/my-tasks
router.get('/my-tasks', authenticateToken, taskController.getMyAssignedTasks);

module.exports = router;
