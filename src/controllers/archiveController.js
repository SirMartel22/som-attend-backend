const { supabase } = require('../utils/database');
const ExcelJS = require('exceljs');

const createAttendanceArchive = async (sessionId, session, records) => {
  try {
    console.log('Creating archive for session:', sessionId);

    // Save archive metadata (WITHOUT the Excel file)
    const { data: archive, error } = await supabase
      .from('attendance_archives')
      .insert([
        {
          session_id: sessionId,
          course_id: session.course_id,
          course_code: session.courses?.course_code,
          course_name: session.courses?.course_name,
          date_taken: session.started_at,
          total_students: records?.length || 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Archive save error:', error);
      throw error;
    }

    console.log('Archive created:', archive.id);
    return archive;
  } catch (error) {
    console.error('Create archive error:', error);
    throw error;
  }
};

const getAttendanceArchives = async (req, res) => {
  try {
    const { data: archives, error } = await supabase
      .from('attendance_archives')
      .select('*')
      .order('date_taken', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      message: 'Archives fetched',
      data: archives || [],
    });
  } catch (error) {
    console.error('Get archives error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

const downloadArchiveExcel = async (req, res) => {
  try {
    const { archive_id } = req.params;

    // Get archive metadata
    const { data: archive, error } = await supabase
      .from('attendance_archives')
      .select('*')
      .eq('id', archive_id)
      .single();

    if (error || !archive) {
      return res.status(404).json({
        success: false,
        message: 'Archive not found',
      });
    }

    // Get the attendance records for this session
    const { data: records } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', archive.session_id)
      .order('marked_at', { ascending: true });

    // Generate Excel on-the-fly
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    // Add title
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = `${archive.course_code} - Attendance`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add course name
    worksheet.mergeCells('A2:D2');
    worksheet.getCell('A2').value = archive.course_name;
    worksheet.getCell('A2').font = { bold: true, size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Add date
    const dateStr = new Date(archive.date_taken).toLocaleString();
    worksheet.mergeCells('A3:D3');
    worksheet.getCell('A3').value = `Date: ${dateStr}`;
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    // Add headers
    const headerRow = worksheet.addRow(['S/N', 'Matric Number', 'Student Name', 'Time Marked']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    // Add records
    records?.forEach((record, index) => {
      const time = new Date(record.marked_at).toLocaleTimeString();
      worksheet.addRow([index + 1, record.matric_number, record.name, time]);
    });

    // Add summary
    const summaryRow = (records?.length || 0) + 6;
    worksheet.getCell(`A${summaryRow}`).value = 'Total Students:';
    worksheet.getCell(`A${summaryRow}`).font = { bold: true };
    worksheet.getCell(`B${summaryRow}`).value = records?.length || 0;

    // Set column widths
    worksheet.columns = [
      { width: 8 },
      { width: 18 },
      { width: 30 },
      { width: 18 },
    ];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Send file
    const fileName = `${archive.course_code}-${new Date(archive.date_taken).toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Download archive error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: String(error),
    });
  }
};

module.exports = { createAttendanceArchive, getAttendanceArchives, downloadArchiveExcel };