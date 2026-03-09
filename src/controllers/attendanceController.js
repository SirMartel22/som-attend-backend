const { supabase } = require('../utils/database');
const { closeExpiredSessions } = require('./sessionController');

const markAttendance = async (req, res) => {
  try {
    const { session_id, matric_number } = req.body;

    if (!session_id || !matric_number) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and matric number are required',
      });
    }

    // First, close any expired sessions
    await closeExpiredSessions();

    // Check if session is still active
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    console.log('Checking session expiry:');
    console.log('  Now:', new Date().toISOString());
    console.log('  Expires At:', session.expires_at);
    console.log('  Session Status:', session.status);

    // Check if session is active (it should have been closed if expired)
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Attendance session is not active or has expired',
      });
    }

    // Get student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('matric_number', matric_number)
      .single();

    if (studentError || !student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if already marked
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', session_id)
      .eq('student_id', student.id)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student in this session',
      });
    }

    // Mark attendance
    const now_iso = new Date().toISOString();
    const { data: record, error: recordError } = await supabase
      .from('attendance_records')
      .insert([
        {
          session_id,
          student_id: student.id,
          matric_number: student.matric_number,
          name: student.name,
          marked_at: now_iso,
        },
      ])
      .select()
      .single();

    if (recordError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to mark attendance',
        error: recordError.message,
      });
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:marked', {
        session_id,
        student: {
          matric_number: student.matric_number,
          name: student.name,
        },
        marked_at: record.marked_at,
      });
    }

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: record,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

const getAttendanceRecords = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', session_id)
      .order('marked_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch records',
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Records fetched',
      data: records,
    });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

module.exports = { markAttendance, getAttendanceRecords };