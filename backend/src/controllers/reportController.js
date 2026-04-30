const supabase = require('../config/supabase');
const PDFDocument = require('pdfkit');

// 🧾 REPORTES EN PDF
const generateIncomeReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const { data: pagos, error } = await supabase
      .from('pagos')
      .select('fecha_pago, monto, descripcion, paciente_id, usuarios:paciente_id(nombre)')
      .gte('fecha_pago', start)
      .lte('fecha_pago', end)
      .order('fecha_pago');

    if (error) {
      return res.status(500).json({ message: 'Error al obtener datos', code: 'DATABASE_ERROR' });
    }

    // Crear PDF
    const doc = new PDFDocument();
    const filename = `reporte_ingresos_${start}_${end}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Encabezado
    doc.fontSize(20).text('REPORTE DE INGRESOS', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${start} - ${end}`, { align: 'center' });
    doc.moveDown(2);

    // Total
    const total = pagos?.reduce((sum, pago) => sum + parseFloat(pago.monto), 0) || 0;
    doc.fontSize(14).text(`Total Ingresos: $${total.toFixed(2)}`, { align: 'right' });
    doc.moveDown();

    // Tabla
    doc.fontSize(10);
    pagos?.forEach((pago, index) => {
      doc.text(`${index + 1}. ${pago.fecha_pago} - ${pago.usuarios?.nombre} - $${pago.monto} - ${pago.descripcion || 'Sin descripción'}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({
      message: 'Error al generar reporte',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const generatePatientsReport = async (req, res) => {
  try {
    const { data: pacientes, error } = await supabase
      .from('pacientes')
      .select('id, nombre, fecha_nacimiento, telefono, email, estado, creado_en')
      .order('creado_en', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener datos', code: 'DATABASE_ERROR' });
    }

    // Crear PDF
    const doc = new PDFDocument();
    const filename = 'reporte_pacientes.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Encabezado
    doc.fontSize(20).text('REPORTE DE PACIENTES', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total de pacientes: ${pacientes?.length || 0}`, { align: 'center' });
    doc.moveDown(2);

    // Tabla
    doc.fontSize(10);
    pacientes?.forEach((paciente, index) => {
      doc.text(`${index + 1}. ${paciente.nombre}`);
      doc.text(`   Estado: ${paciente.estado} | Teléfono: ${paciente.telefono || 'N/A'} | Email: ${paciente.email || 'N/A'}`);
      doc.text(`   Fecha nacimiento: ${paciente.fecha_nacimiento || 'N/A'} | Registrado: ${paciente.creado_en?.substring(0, 10)}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({
      message: 'Error al generar reporte',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const generateAppointmentsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const { data: citas, error } = await supabase
      .from('citas')
      .select('fecha, hora, estado, paciente_id, odontologo_id, notas, usuarios:paciente_id(nombre), usuarios:odontologo_id(nombre)')
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener datos', code: 'DATABASE_ERROR' });
    }

    // Crear PDF
    const doc = new PDFDocument();
    const filename = `reporte_citas_${start}_${end}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Encabezado
    doc.fontSize(20).text('HISTORIAL DE CITAS', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${start} - ${end}`, { align: 'center' });
    doc.moveDown(2);

    // Estadísticas
    const totalCitas = citas?.length || 0;
    const citasCompletadas = citas?.filter(c => c.estado === 'completada').length || 0;
    const citasPendientes = citas?.filter(c => c.estado === 'programada' || c.estado === 'confirmada').length || 0;

    doc.fontSize(12).text(`Total de citas: ${totalCitas}`);
    doc.text(`Completadas: ${citasCompletadas}`);
    doc.text(`Pendientes: ${citasPendientes}`);
    doc.moveDown();

    // Tabla
    doc.fontSize(10);
    citas?.forEach((cita, index) => {
      doc.text(`${index + 1}. ${cita.fecha} ${cita.hora}`);
      doc.text(`   Paciente: ${cita['usuarios:paciente_id']?.nombre || 'N/A'}`);
      doc.text(`   Odontólogo: ${cita['usuarios:odontologo_id']?.nombre || 'N/A'}`);
      doc.text(`   Estado: ${cita.estado} | Notas: ${cita.notas || 'Sin notas'}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({
      message: 'Error al generar reporte',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const generateAttendanceReport = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const { startDate, endDate } = req.query;
    const start = startDate || today;
    const end = endDate || today;

    const { data: asistencias, error } = await supabase
      .from('asistencia_practicante')
      .select('fecha, turno, check_in, check_out, actividad, estado, usuarios:practicante_id(nombre)')
      .eq('practicante_id', currentUserId)
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al generar reporte', error: error.message, code: 'DATABASE_ERROR' });
    }

    const doc = new PDFDocument();
    const filename = `reporte_asistencia_${start}_${end}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text('REPORTE DE ASISTENCIA', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${start} - ${end}`, { align: 'center' });
    doc.moveDown(2);

    const nombreUsuario = asistencias?.[0]?.usuarios?.nombre || 'Practicante';
    doc.fontSize(14).text(`Practicante: ${nombreUsuario}`);
    doc.moveDown();

    asistencias?.forEach((item, index) => {
      doc.fontSize(10).text(`${index + 1}. Fecha: ${item.fecha} | Turno: ${item.turno || 'N/A'}`);
      doc.text(`   Entrada: ${item.check_in || 'N/A'} | Salida: ${item.check_out || 'N/A'}`);
      doc.text(`   Actividad: ${item.actividad || 'N/A'} | Estado: ${item.estado || 'N/A'}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({
      message: 'Error al generar PDF',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const generateAccumulatedHoursReport = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const { startDate, endDate } = req.query;
    const start = startDate || today;
    const end = endDate || today;

    const { data: asistencias, error } = await supabase
      .from('asistencia_practicante')
      .select('fecha, check_in, check_out, usuarios:practicante_id(nombre)')
      .eq('practicante_id', currentUserId)
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al generar reporte de horas', error: error.message, code: 'DATABASE_ERROR' });
    }

    const totalHoras = asistencias?.reduce((sum, row) => {
      if (row.check_in && row.check_out) {
        return sum + ((new Date(row.check_out) - new Date(row.check_in)) / 3600000);
      }
      return sum;
    }, 0) || 0;

    const doc = new PDFDocument();
    const filename = `horas_acumuladas_${start}_${end}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text('REPORTE DE HORAS ACUMULADAS', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${start} - ${end}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(14).text(`Total de horas: ${totalHoras.toFixed(2)}`);
    doc.moveDown();

    asistencias?.forEach((item, index) => {
      const horas = item.check_in && item.check_out
        ? ((new Date(item.check_out) - new Date(item.check_in)) / 3600000).toFixed(2)
        : 'N/A';
      doc.fontSize(10).text(`${index + 1}. ${item.fecha} - Horas: ${horas}`);
      doc.text(`   Entrada: ${item.check_in || 'N/A'} | Salida: ${item.check_out || 'N/A'}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({
      message: 'Error al generar PDF',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const generateTodayAppointmentsReport = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: citas, error } = await supabase
      .from('citas')
      .select('fecha, hora, estado, paciente_id, odontologo_id, notas, usuarios:paciente_id(nombre), usuarios:odontologo_id(nombre)')
      .eq('fecha', today)
      .order('hora', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener datos', code: 'DATABASE_ERROR' });
    }

    const doc = new PDFDocument();
    const filename = `citas_hoy_${today}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text('CITAS DEL DÍA', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Fecha: ${today}`, { align: 'center' });
    doc.moveDown(2);

    if (!citas || citas.length === 0) {
      doc.fontSize(12).text('No hay citas agendadas para hoy.', { align: 'center' });
      doc.end();
      return;
    }

    doc.fontSize(10);
    citas.forEach((cita, index) => {
      doc.text(`${index + 1}. ${cita.hora} - Paciente: ${cita['usuarios:paciente_id']?.nombre || 'N/A'}`);
      doc.text(`   Odontólogo: ${cita['usuarios:odontologo_id']?.nombre || 'N/A'}`);
      doc.text(`   Estado: ${cita.estado}`);
      doc.text(`   Notas: ${cita.notas || 'Sin notas'}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({
      message: 'Error al generar reporte',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  generateIncomeReport,
  generatePatientsReport,
  generateAppointmentsReport,
  generateAttendanceReport,
  generateAccumulatedHoursReport,
  generateTodayAppointmentsReport,
};
