const { supabase } = require('../utils/database');
const { createAttendanceArchive } = require('../controllers/archiveController');

/**
 * Cron job to automatically close expired attendance sessions
 * Run this every 5-10 minutes using a cron scheduler or setInterval
 */
const closeExpiredSessionsCron = async () => {
  try {
    console.log('[CRON] Starting expired sessions check...');
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
      console.error('[CRON] Error fetching expired sessions:', fetchError);
      return;
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      console.log('[CRON] No expired sessions found');
      return;
    }

    console.log(`[CRON] Found ${expiredSessions.length} expired session(s) to close`);

    // Close each expired session
    for (const session of expiredSessions) {
      try {
        console.log(`[CRON] Processing session ${session.id}...`);
        
        // Get attendance records for this session
        const { data: records } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('session_id', session.id);

        console.log(`[CRON] Found ${records?.length || 0} attendance records`);

        // Update session status to ended
        const { error: updateError } = await supabase
          .from('attendance_sessions')
          .update({ status: 'ended' })
          .eq('id', session.id);

        if (updateError) {
          console.error(`[CRON] Error updating session ${session.id}:`, updateError);
          continue;
        }

        // Create archive
        await createAttendanceArchive(session.id, session, records || []);
        
        console.log(`[CRON] Successfully closed expired session: ${session.id} (Course: ${session.courses?.course_code})`);
      } catch (sessionError) {
        console.error(`[CRON] Failed to close session ${session.id}:`, sessionError);
      }
    }
    
    console.log('[CRON] Expired sessions check completed');
  } catch (error) {
    console.error('[CRON] Error in closeExpiredSessionsCron:', error);
  }
};

// If running as a standalone script
if (require.main === module) {
  console.log('Running expired sessions cleanup...');
  closeExpiredSessionsCron()
    .then(() => {
      console.log('Cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { closeExpiredSessionsCron };