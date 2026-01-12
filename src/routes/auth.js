const express = require('express');
const { loginAdmin, getStudentByMatric } = require('../controllers/authController');

const router = express.Router();

router.post('/login', loginAdmin);
router.get('/student', getStudentByMatric);

module.exports = router;