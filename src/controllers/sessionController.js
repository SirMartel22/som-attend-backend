const { supabase } = require('../utils/database');
const { createAttendanceArchive } = require('./archiveController');

const createSession = async (req, res) => {
  try {
    const { course_id, duration_minutes = 60 } = req.body; // Default to 60 minutes (1 hour)
    const adminId = req.adminId;

    if (!course_id) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    // Validate duration
    const validDurations = [1, 5, 10, 15, 30, 45, 60];
    if (!validDurations.includes(duration_minutes)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid duration. Must be one of: 1, 5, 10, 15, 30, 45, 60 minutes' 
      });
    }

    // Create timestamps with custom duration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (duration_minutes * 60000)); // Convert minutes to milliseconds

    // Format as ISO strings
    const startedAtISO = now.toISOString();
    const expiresAtISO = expiresAt.toISOString();

    console.log('Creating session:');
    console.log('  Now:', now);
    console.log('  Now ISO:', startedAtISO);
    console.log('  Duration:', duration_minutes, 'minutes');
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
        status: 'active',
        duration_minutes // Store duration for reference
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

// Helper function to automatically close expired sessions
const closeExpiredSessions = async () => {
  try {
    const now = new Date().toISOString();
    
    // Find all active sessions that have expired
    const { data: expiredSessions, error: fetchError } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        courses (id, course_code, course_name)
      `)
      .eq('status', 'active')
      .lt('expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired sessions:', fetchError);
      return;
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      return;
    }

    console.log(`Found ${expiredSessions.length} expired session(s) to close`);

    // Close each expired session
    for (const session of expiredSessions) {
      try {
        // Get attendance records for this session
        const { data: records } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('session_id', session.id);

        // Update session status to ended
        await supabase
          .from('attendance_sessions')
          .update({ status: 'ended' })
          .eq('id', session.id);

        // Create archive
        await createAttendanceArchive(session.id, session, records || []);
        
        console.log(`Automatically closed expired session: ${session.id}`);
      } catch (sessionError) {
        console.error(`Failed to close session ${session.id}:`, sessionError);
      }
    }
  } catch (error) {
    console.error('Error in closeExpiredSessions:', error);
  }
};

const getActiveSessions = async (req, res) => {
  try {
    const adminId = req.adminId;
    
    // First, close any expired sessions
    await closeExpiredSessions();
    
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
    // First, close any expired sessions
    await closeExpiredSessions();

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

module.exports = { createSession, getActiveSessions, endSession, getPublicActiveSessions, closeExpiredSessions };