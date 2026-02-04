const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { createSession, getActiveSessions, endSession, getPublicActiveSessions } = require('../controllers/sessionController');

const router = express.Router();


// Admin routes
router.post('/create', authMiddleware, createSession);
router.get('/active', authMiddleware, getActiveSessions);
router.post('/end', authMiddleware, endSession);

//public route for students to see active sessions
router.get('/public-active', getPublicActiveSessions);

module.exports = router;