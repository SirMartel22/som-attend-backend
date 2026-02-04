const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAttendanceArchives, downloadArchiveExcel } = require('../controllers/archiveController');

const router = express.Router();

router.get('/list', authMiddleware, getAttendanceArchives);
router.get('/download/:archive_id', authMiddleware, downloadArchiveExcel);

module.exports = router;