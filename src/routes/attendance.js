const express = require('express');
const { markAttendance, getAttendanceRecords } = require('../controllers/attendanceController');

const router = express.Router();

router.post('/mark', markAttendance);
router.get('/records', getAttendanceRecords);

module.exports = router;