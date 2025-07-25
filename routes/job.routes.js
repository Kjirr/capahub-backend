// routes/job.routes.js

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller.js');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

logger.debug(`Route-bestand geladen: ${__filename}`);

// POST /api/jobs (nieuwe opdracht aanmaken)
router.post('/', authenticateToken, jobController.createJob);

// GET /api/jobs/my-jobs (lijst van eigen opdrachten)
router.get('/my-jobs', authenticateToken, jobController.getMyJobs);

// GET /api/jobs/:id (details van één specifieke opdracht)
router.get('/:id', authenticateToken, jobController.getJobById);

// PUT /api/jobs/:id (een opdracht bijwerken)
router.put('/:id', authenticateToken, jobController.updateJob);

// DELETE /api/jobs/:id (een opdracht verwijderen)
router.delete('/:id', authenticateToken, jobController.deleteJob);

// PUT /api/jobs/:id/assign (een opdracht toewijzen)
router.put('/:id/assign', authenticateToken, jobController.assignJobToSelf);

module.exports = router;
