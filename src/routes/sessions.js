const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { createSession, getActiveSessions, endSession } = require('../controllers/sessionController');

const router = express.Router();

router.post('/create', authMiddleware, createSession);
router.get('/active', authMiddleware, getActiveSessions);
router.post('/end', authMiddleware, endSession);

module.exports = router;