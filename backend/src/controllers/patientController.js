const supabase = require('../config/supabase');
const PDFDocument = require('pdfkit');

// 👥 GESTIÓN DE PACIENTES
const getPatients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, estado } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('pacientes')
      .select('id, nombre, correo, telefono, estado, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('nombre', `%${search}%`);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data: patients, error, count } = await query;

    if (error) {
      return res.status(500).json({ message: 'Error al obtener pacientes', code: 'PATIENTS_ERROR', error: error.message });
    }

    res.json({
      code: 'PATIENTS_SUCCESS',
      patients: patients || [],
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const updatePatientState = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ message: 'El estado es requerido', code: 'REQUIRED_FIELD' });
    }

    const { data: patient, error } = await supabase
      .from('pacientes')
      .update({ estado })
      .eq('id', id)
      .select('id, nombre, correo, telefono, estado')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al actualizar estado del paciente', code: 'UPDATE_ERROR', error: error.message });
    }

    res.json({
      code: 'PATIENT_STATE_UPDATED',
      patient
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// 🩺 GESTIÓN DE TRATAMIENTOS
const getTreatments = async (req, res) => {
  try {
    const { paciente_id, estado, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tratamientos')
      .select('id, paciente_id, odontologo_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, costo_total, notas, created_at')
      .order('fecha_inicio', { ascending: false })
      .range(offset, offset + limit - 1);

    if (paciente_id) {
      query = query.eq('paciente_id', paciente_id);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data: treatments, error, count } = await query;

    if (error) {
      return res.status(500).json({ message: 'Error al obtener tratamientos', code: 'TREATMENTS_ERROR', error: error.message });
    }

    res.json({
      code: 'TREATMENTS_SUCCESS',
      treatments: treatments || [],
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const createTreatment = async (req, res) => {
  try {
    const { paciente_id, nombre, descripcion, costo_total, notas } = req.body;
    const odontologo_id = req.user.id;

    const { data: treatment, error } = await supabase
      .from('tratamientos')
      .insert([{
        paciente_id,
        odontologo_id,
        nombre,
        descripcion,
        costo_total,
        notas,
        estado: 'en_curso'
      }])
      .select('id, paciente_id, odontologo_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, costo_total, notas, created_at')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al crear tratamiento', code: 'CREATE_ERROR', error: error.message });
    }

    res.status(201).json({
      code: 'TREATMENT_CREATED',
      treatment
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const updateTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: treatment, error } = await supabase
      .from('tratamientos')
      .update(updates)
      .eq('id', id)
      .select('id, paciente_id, odontologo_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, costo_total, notas, created_at')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al actualizar tratamiento', code: 'UPDATE_ERROR', error: error.message });
    }

    res.json({
      code: 'TREATMENT_UPDATED',
      treatment
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// 📋 HISTORIAL CLÍNICO
const getClinicalHistory = async (req, res) => {
  try {
    const { paciente_id } = req.params;

    const { data: history, error } = await supabase
      .from('historial_clinico')
      .select('id, fecha, tipo, descripcion, diagnostico, tratamiento, medicamentos, notas, archivos, odontologo_id, created_at')
      .eq('paciente_id', paciente_id)
      .order('fecha', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener historial', code: 'HISTORY_ERROR', error: error.message });
    }

    res.json({
      code: 'HISTORY_SUCCESS',
      history: history || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const addClinicalRecord = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const { tipo, descripcion, diagnostico, tratamiento, medicamentos, notas, archivos } = req.body;
    const odontologo_id = req.user.id;

    const { data: record, error } = await supabase
      .from('historial_clinico')
      .insert([{
        paciente_id,
        odontologo_id,
        tipo,
        descripcion,
        diagnostico,
        tratamiento,
        medicamentos,
        notas,
        archivos: archivos || []
      }])
      .select('id, fecha, tipo, descripcion, diagnostico, tratamiento, medicamentos, notas, archivos, odontologo_id, created_at')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al agregar registro', code: 'RECORD_ERROR', error: error.message });
    }

    res.status(201).json({
      code: 'RECORD_ADDED',
      record
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// 🧾 REPORTE PDF DE HISTORIAL CLÍNICO
const generateClinicalHistoryPDF = async (req, res) => {
  try {
    const { paciente_id } = req.params;

    const { data: paciente, error: pacienteError } = await supabase
      .from('pacientes')
      .select('id, nombre, correo, telefono, estado, created_at')
      .eq('id', paciente_id)
      .single();

    if (pacienteError || !paciente) {
      return res.status(404).json({ message: 'Paciente no encontrado', code: 'PATIENT_NOT_FOUND' });
    }

    const { data: history, error: historyError } = await supabase
      .from('historial_clinico')
      .select('id, fecha, tipo, descripcion, diagnostico, tratamiento, medicamentos, notas, archivos, odontologo_id, created_at')
      .eq('paciente_id', paciente_id)
      .order('fecha', { ascending: false });

    if (historyError) {
      return res.status(500).json({ message: 'Error al obtener historial', code: 'HISTORY_ERROR', error: historyError.message });
    }

    const doc = new PDFDocument();
    const filename = `historial_clinico_${paciente.nombre.replace(/\s+/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.fontSize(20).text('HISTORIAL CLÍNICO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Paciente: ${paciente.nombre}`, { align: 'center' });
    doc.fontSize(12).text(`Email: ${paciente.correo || 'N/A'}`, { align: 'center' });
    doc.text(`Teléfono: ${paciente.telefono || 'N/A'}`, { align: 'center' });
    doc.text(`Estado del paciente: ${paciente.estado || 'N/A'}`, { align: 'center' });
    doc.text(`Registrado: ${paciente.created_at?.substring(0, 10)}`, { align: 'center' });
    doc.moveDown(2);

    if (history && history.length > 0) {
      history.forEach((record, index) => {
        doc.fontSize(14).text(`${index + 1}. ${record.tipo.toUpperCase()} - ${record.fecha}`, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Descripción: ${record.descripcion}`);
        if (record.diagnostico) doc.text(`Diagnóstico: ${record.diagnostico}`);
        if (record.tratamiento) doc.text(`Tratamiento: ${record.tratamiento}`);
        if (record.medicamentos) doc.text(`Medicamentos: ${record.medicamentos}`);
        if (record.notas) doc.text(`Notas: ${record.notas}`);
        doc.text(`Odontólogo: ${record.odontologo_id || 'N/A'}`);
        doc.moveDown();
      });
    } else {
      doc.fontSize(12).text('No hay registros clínicos para este paciente.', { align: 'center' });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al generar PDF', error: err.message, code: 'PDF_ERROR' });
  }
};

const generateTreatmentSummaryPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: treatment, error: treatmentError } = await supabase
      .from('tratamientos')
      .select('id, paciente_id, odontologo_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, costo_total, notas, created_at')
      .eq('id', id)
      .single();

    if (treatmentError || !treatment) {
      return res.status(404).json({ message: 'Tratamiento no encontrado', code: 'TREATMENT_NOT_FOUND' });
    }

    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id, nombre, correo, telefono')
      .eq('id', treatment.paciente_id)
      .single();

    const filename = `resumen_tratamiento_${treatment.id}.pdf`;
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text('RESUMEN DE TRATAMIENTO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Paciente: ${paciente?.nombre || 'N/A'}`, { align: 'center' });
    doc.fontSize(12).text(`Email: ${paciente?.correo || 'N/A'}`, { align: 'center' });
    doc.text(`Teléfono: ${paciente?.telefono || 'N/A'}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).text(`Tratamiento: ${treatment.nombre}`);
    doc.text(`Estado: ${treatment.estado}`);
    doc.text(`Fecha inicio: ${treatment.fecha_inicio || 'N/A'}`);
    doc.text(`Fecha fin: ${treatment.fecha_fin || 'N/A'}`);
    doc.text(`Costo total: $${treatment.costo_total || 0}`);
    doc.moveDown(1);

    if (treatment.descripcion) doc.text(`Descripción: ${treatment.descripcion}`);
    if (treatment.notas) doc.text(`Notas: ${treatment.notas}`);

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al generar PDF', error: err.message, code: 'PDF_ERROR' });
  }
};

module.exports = {
  getPatients,
  updatePatientState,
  getTreatments,
  createTreatment,
  updateTreatment,
  getClinicalHistory,
  addClinicalRecord,
  generateClinicalHistoryPDF,
  generateTreatmentSummaryPDF,
};