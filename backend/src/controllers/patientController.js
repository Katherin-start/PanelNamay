const supabase = require('../config/supabase');
const PDFDocument = require('pdfkit');

// 👥 GESTIÓN DE PACIENTES
const getPatients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, estado } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('pacientes')
      .select('id, nombre, dni, telefono, estado, created_at, foto_perfil', { count: 'exact' })
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

const createPatient = async (req, res) => {
  try {
    const { nombre, dni, telefono, fecha_nacimiento, direccion } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido', code: 'REQUIRED_FIELD' });
    }

    const payload = {
      nombre,
      dni: dni || null,
      telefono: telefono || null,
      fecha_nacimiento: fecha_nacimiento || null,
      direccion: direccion || null,
      estado: 'activo',
    };

    const { data, error } = await supabase.from('pacientes').insert([payload]).select('*').single();

    if (error) {
      return res.status(500).json({ message: 'Error al crear paciente', error: error.message, code: 'PATIENT_CREATE_ERROR' });
    }

    res.status(201).json({ code: 'PATIENT_CREATED', patient: data });
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

    // Intentar con diferentes tipos de ID
    let patient = null;
    
    // Intenta primero como UUID/texto
    const { data: p1, error: e1 } = await supabase
      .from('pacientes')
      .update({ estado })
      .filter('id', 'eq', id)
      .select('id, nombre, dni, telefono, estado')
      .single();

    if (e1) {
      // Si falla, intenta como número
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        const { data: p2, error: e2 } = await supabase
          .from('pacientes')
          .update({ estado })
          .eq('id', numId)
          .select('id, nombre, dni, telefono, estado')
          .single();
        
        if (e2) {
          return res.status(500).json({ message: 'Error al actualizar estado del paciente', code: 'UPDATE_ERROR', error: e2.message });
        }
        patient = p2;
      } else {
        return res.status(500).json({ message: 'Error al actualizar estado del paciente', code: 'UPDATE_ERROR', error: e1.message });
      }
    } else {
      patient = p1;
    }

    res.json({
      code: 'PATIENT_STATE_UPDATED',
      patient
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ❌ ELIMINAR PACIENTE (que es un usuario con rol_id = 6)
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'El ID del paciente es requerido', code: 'REQUIRED_FIELD' });
    }

    console.log(`[DELETE PATIENT] Iniciando eliminación de paciente/usuario con ID: ${id}`);

    // PASO 1: Obtener información del usuario (paciente) - debe tener rol_id = 6
    let usuarioInfo = null;
    const queryAttempts = [
      () => supabase.from('usuarios').select('id, nombre, rol_id').filter('id', 'eq', id),
      () => supabase.from('usuarios').select('id, nombre, rol_id').eq('id', parseInt(id, 10)),
    ];

    for (const query of queryAttempts) {
      try {
        const { data, error } = await query();
        if (data && data.length > 0) {
          const usuario = data[0];
          // Verificar que es paciente (rol_id = 6)
          if (usuario.rol_id === 6) {
            usuarioInfo = usuario;
            console.log(`[DELETE PATIENT] Usuario encontrado:`, usuarioInfo);
            break;
          } else {
            console.log(`[DELETE PATIENT] Usuario encontrado pero no es paciente (rol_id: ${usuario.rol_id})`);
          }
        }
      } catch (e) {
        console.log(`[DELETE PATIENT] Intento de búsqueda falló, intentando siguiente...`);
        continue;
      }
    }

    if (!usuarioInfo) {
      console.log(`[DELETE PATIENT] Paciente no encontrado con ID: ${id}`);
      return res.status(404).json({ message: 'Paciente no encontrado', code: 'PATIENT_NOT_FOUND' });
    }

    const actualId = usuarioInfo.id;
    const nombrePaciente = usuarioInfo.nombre;

    console.log(`[DELETE PATIENT] Eliminando registros relacionados para ID: ${actualId}`);

    // PASO 2: Eliminar registros relacionados en tablas que referencian al paciente
    // Nota: Estos registros pueden referenciar por ID o por otro campo
    
    try {
      await supabase.from('resenas').delete().filter('paciente_id', 'eq', actualId);
      console.log(`[DELETE PATIENT] Reseñas eliminadas`);
    } catch (e) {
      console.log(`[DELETE PATIENT] Sin reseñas para eliminar o error:`, e.message);
    }

    try {
      await supabase.from('accesos_historial').delete().filter('paciente_id', 'eq', actualId);
      console.log(`[DELETE PATIENT] Accesos al historial eliminados`);
    } catch (e) {
      console.log(`[DELETE PATIENT] Sin accesos para eliminar o error:`, e.message);
    }

    try {
      await supabase.from('citas').delete().filter('id_paciente', 'eq', actualId);
      console.log(`[DELETE PATIENT] Citas eliminadas`);
    } catch (e) {
      console.log(`[DELETE PATIENT] Sin citas para eliminar o error:`, e.message);
    }

    try {
      await supabase.from('tratamientos').delete().filter('paciente_id', 'eq', actualId);
      console.log(`[DELETE PATIENT] Tratamientos eliminados`);
    } catch (e) {
      console.log(`[DELETE PATIENT] Sin tratamientos para eliminar o error:`, e.message);
    }

    try {
      await supabase.from('pagos').delete().filter('id_paciente', 'eq', actualId);
      console.log(`[DELETE PATIENT] Pagos eliminados`);
    } catch (e) {
      console.log(`[DELETE PATIENT] Sin pagos para eliminar o error:`, e.message);
    }

    // PASO 3: Eliminar el usuario (paciente) de la tabla usuarios
    console.log(`[DELETE PATIENT] Eliminando usuario/paciente con ID: ${actualId}`);
    const { error: deleteError } = await supabase
      .from('usuarios')
      .delete()
      .filter('id', 'eq', actualId);

    if (deleteError) {
      console.error(`[DELETE PATIENT] Error al eliminar usuario:`, deleteError);
      return res.status(500).json({ 
        message: 'Error al eliminar paciente', 
        code: 'DELETE_ERROR', 
        error: deleteError.message 
      });
    }

    console.log(`[DELETE PATIENT] Paciente/usuario eliminado exitosamente`);
    res.json({
      code: 'PATIENT_DELETED',
      message: `Paciente ${nombrePaciente} y todos sus registros relacionados han sido eliminados correctamente`,
      patientId: actualId
    });
  } catch (err) {
    console.error('[DELETE PATIENT] Error en deletePatient:', err);
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

    // Verificar permisos: el solicitante puede ser:
    // - el propio paciente
    // - un administrador (rol_id 1)
    // - un odontólogo con acceso activo en accesos_historial
    const requesterId = req.user?.id;
    const requesterRolId = req.user?.rol_id;

    const isSelf = requesterId === paciente_id;
    const isAdmin = requesterRolId === 1;

    if (!isSelf && !isAdmin) {
      // Verificar si es odontólogo con acceso
      const { data: accessRows, error: accessError } = await supabase
        .from('accesos_historial')
        .select('id, activo')
        .eq('paciente_id', paciente_id)
        .eq('odontologo_id', requesterId)
        .eq('activo', true)
        .limit(1);

      if (accessError) {
        return res.status(500).json({ message: 'Error verificando permisos', code: 'ACCESS_CHECK_ERROR' });
      }

      if (!accessRows || accessRows.length === 0) {
        return res.status(403).json({ message: 'Acceso denegado al historial clínico', code: 'ACCESS_DENIED' });
      }
    }

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

// Otorgar acceso de un paciente a un odontólogo (solo el paciente o admin puede hacerlo)
const grantAccess = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const { odontologo_id } = req.body;
    const requesterId = req.user.id;
    const requesterRolId = req.user.rol_id;

    // Solo el paciente (dueño) o admin puede otorgar
    if (requesterId !== paciente_id && requesterRolId !== 1) {
      return res.status(403).json({ message: 'No autorizado para otorgar acceso', code: 'NOT_AUTHORIZED' });
    }

    if (!odontologo_id) {
      return res.status(400).json({ message: 'odontologo_id es requerido', code: 'MISSING_FIELD' });
    }

    const { data, error } = await supabase
      .from('accesos_historial')
      .upsert([
        { paciente_id, odontologo_id, otorgado_por: requesterId, activo: true, revocado_en: null }
      ], { onConflict: ['paciente_id', 'odontologo_id'] })
      .select('*');

    if (error) {
      return res.status(500).json({ message: 'Error al otorgar acceso', error: error.message, code: 'GRANT_ERROR' });
    }

    res.json({ code: 'ACCESS_GRANTED', access: data[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// Revocar acceso
const revokeAccess = async (req, res) => {
  try {
    const { paciente_id, odontologoId } = req.params;
    const requesterId = req.user.id;
    const requesterRolId = req.user.rol_id;

    if (requesterId !== paciente_id && requesterRolId !== 1) {
      return res.status(403).json({ message: 'No autorizado para revocar acceso', code: 'NOT_AUTHORIZED' });
    }

    const { data, error } = await supabase
      .from('accesos_historial')
      .update({ activo: false, revocado_en: new Date().toISOString() })
      .eq('paciente_id', paciente_id)
      .eq('odontologo_id', odontologoId)
      .select('*');

    if (error) {
      return res.status(500).json({ message: 'Error al revocar acceso', error: error.message, code: 'REVOKE_ERROR' });
    }

    res.json({ code: 'ACCESS_REVOKED', revoked: data[0] || null });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// Listar accesos para un paciente
const listAccesses = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const requesterId = req.user.id;
    const requesterRolId = req.user.rol_id;

    if (requesterId !== paciente_id && requesterRolId !== 1) {
      return res.status(403).json({ message: 'No autorizado para ver accesos', code: 'NOT_AUTHORIZED' });
    }

    const { data, error } = await supabase
      .from('accesos_historial')
      .select('id, odontologo_id, otorgado_por, otorgado_en, revocado_en, activo, odontologo:odontologo_id(id, nombre, apellido, foto_perfil)')
      .eq('paciente_id', paciente_id)
      .order('otorgado_en', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al listar accesos', error: error.message, code: 'LIST_ACCESS_ERROR' });
    }

    res.json({ code: 'ACCESSES_SUCCESS', accesses: data || [] });
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
  createPatient,
  updatePatientState,
  deletePatient,
  getTreatments,
  createTreatment,
  updateTreatment,
  getClinicalHistory,
  addClinicalRecord,
  generateClinicalHistoryPDF,
  generateTreatmentSummaryPDF,
  grantAccess,
  revokeAccess,
  listAccesses,
};
