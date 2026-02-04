const { supabase } = require('../utils/database');

const createSession = async (req, res) => {
  try {
    const { course_id } = req.body;
    const adminId = req.adminId;

    if (!course_id) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    // Create timestamps VERY carefully
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600000); // Add exactly 1 hour in milliseconds

    // Format as ISO strings
    const startedAtISO = now.toISOString();
    const expiresAtISO = expiresAt.toISOString();

    console.log('Creating session:');
    console.log('  Now:', now);
    console.log('  Now ISO:', startedAtISO);
    console.log('  Expires At:', expiresAt);
    console.log('  Expires At ISO:', expiresAtISO);
    console.log('  Difference in ms:', expiresAt.getTime() - now.getTime());

    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .insert([{ 
        course_id, 
        admin_id: adminId, 
        started_at: startedAtISO, 
        expires_at: expiresAtISO, 
        status: 'active' 
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('Session created:', session);
    res.json({ success: true, message: 'Session created', data: session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: String(error) });
  }
};

const getActiveSessions = async (req, res) => {
  try {
    const adminId = req.adminId;
    const { data: sessions, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('admin_id', adminId)
      .eq('status', 'active');

    if (error) throw error;

    // Fetch courses separately
    const { data: courses } = await supabase.from('courses').select('*');
    
    const enriched = sessions?.map(s => ({
      ...s,
      courses: courses?.find(c => c.id === s.course_id)
    })) || [];

    res.json({ success: true, message: 'Sessions fetched', data: enriched });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: String(error) });
  }
};

// const endSession = async (req, res) => {
//   try {
//     const { session_id } = req.body;
//     const { data, error } = await supabase
//       .from('attendance_sessions')
//       .update({ status: 'ended' })
//       .eq('id', session_id)
//       .select()
//       .single();

//     if (error) throw error;
//     res.json({ success: true, message: 'Session ended', data });
//   } catch (error) {
//     console.error('End session error:', error);
//     res.status(500).json({ success: false, message: 'Server error', error: String(error) });
//   }
// };



const { createAttendanceArchive } = require('./archiveController');

const endSession = async (req, res) => {
  try {
    const { session_id } = req.body;

    // Get session and attendance records
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        courses (id, course_code, course_name)
      `)
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Get all records for this session
    const { data: records } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', session_id);

    // Update session status
    const { data: updated, error } = await supabase
      .from('attendance_sessions')
      .update({ status: 'ended' })
      .eq('id', session_id)
      .select()
      .single();

    if (error) throw error;

    // Create archive
    try {
      await createAttendanceArchive(session_id, session, records);
    } catch (archiveError) {
      console.error('Failed to create archive:', archiveError);
      // Don't fail the endpoint if archive fails
    }

    res.json({ success: true, message: 'Session ended', data: updated });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};



const getPublicActiveSessions = async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data: sessions, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('status', 'active')
      .gt('expires_at', now);

    if (error) throw error;

    // Fetch courses separately
    const { data: courses } = await supabase.from('courses').select('*');
    
    const enriched = sessions?.map(s => ({
      ...s,
      courses: courses?.find(c => c.id === s.course_id)
    })) || [];

    res.json({ success: true, message: 'Active sessions fetched', data: enriched });
  } catch (error) {
    console.error('Get public sessions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: String(error) });
  }
};

module.exports = { createSession, getActiveSessions, endSession, getPublicActiveSessions };
// module.exports = { createSession, getActiveSessions, endSession, getPublicActiveSessions };
