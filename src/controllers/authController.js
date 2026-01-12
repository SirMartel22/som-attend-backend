const bcrypt = require('bcryptjs');
const { supabase } = require('../utils/database');
const { generateToken } = require('../utils/jwt');

const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const token = generateToken(admin.id, admin.username);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

const getStudentByMatric = async (req, res) => {
  try {
    const { matric_number } = req.query;

    if (!matric_number) {
      return res.status(400).json({
        success: false,
        message: 'Matric number is required',
      });
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('matric_number', matric_number)
      .single();

    if (error || !student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      message: 'Student found',
      data: student,
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

module.exports = { loginAdmin, getStudentByMatric };