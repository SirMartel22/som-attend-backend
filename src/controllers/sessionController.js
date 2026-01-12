const { supabase } = require('../utils/database');

const createSession = async (req, res) => {
  try {
    const { course_id } = req.body;
    const adminId = req.adminId;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .insert([
        {
          course_id,
          admin_id: adminId,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create session',
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Session created',
      data: session,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

const getActiveSessions = async (req, res) => {
  try {
    const adminId = req.adminId;

    const { data: sessions, error } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        courses (id, course_code, course_name)
      `)
      .eq('admin_id', adminId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch sessions',
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Sessions fetched',
      data: sessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

const endSession = async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .update({ status: 'ended' })
      .eq('id', session_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to end session',
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Session ended',
      data: session,
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

module.exports = { createSession, getActiveSessions, endSession };