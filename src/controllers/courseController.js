// FILE: src/controllers/courseController.js
// CREATE THIS NEW FILE

const { supabase } = require('../utils/database');

const getAdminCourses = async (req, res) => {
  try {
    // Get ALL courses (shared across all admins)
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch courses',
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Courses fetched',
      data: courses || [],
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

const createCourse = async (req, res) => {
  try {
    const { course_code, course_name } = req.body;

    if (!course_code || !course_name) {
      return res.status(400).json({
        success: false,
        message: 'Course code and name are required',
      });
    }

    const { data: course, error } = await supabase
      .from('courses')
      .insert([
        {
          course_code,
          course_name,
          admin_id: null, // Courses are shared, not tied to one admin
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create course',
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Course created',
      data: course,
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

module.exports = { getAdminCourses, createCourse };