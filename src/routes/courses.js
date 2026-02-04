// FILE: src/routes/courses.js
// CREATE THIS NEW FILE

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAdminCourses, createCourse } = require('../controllers/courseController');

const router = express.Router();

// Get all courses (shared for all admins)
router.get('/my-courses', authMiddleware, getAdminCourses);

// Create a new course (admin only)
router.post('/create', authMiddleware, createCourse);

module.exports = router;