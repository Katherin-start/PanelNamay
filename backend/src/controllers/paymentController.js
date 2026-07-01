const supabase = require('../config/supabase');
const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');
const { getIO } = require('../socket/chatSocket');

const normalizeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const buildPatientReference = (patientId) => {
  if (!patientId) return {};
  if (isUuid(patientId)) {
    return { id_paciente_uuid: patientId };
  }

  const parsedId = Number(patientId);
  if (Number.isInteger(parsedId) && parsedId > 0) {
    return { id_paciente: parsedId };
  }

  return { id_paciente_uuid: patientId };
};

const formatCurrency = (value) => {
  return `S/ ${normalizeAmount(value).toFixed(2)}`;
};

// ─────────────────────────────────────────────────────────────────
// PDF DESIGN HELPERS — Dental Namay
// ─────────────────────────────────────────────────────────────────

const PDF_BRAND = {
  primary:    '#1e3a5f',
  accent:     '#2980b9',
  accentLight:'#d6eaf8',
  success:    '#1a7a4a',
  successBg:  '#d4efdf',
  pending:    '#856404',
  pendingBg:  '#fff3cd',
  text:       '#1a1a2e',
  textSub:    '#4a5568',
  border:     '#a9cce3',
  divider:    '#cbd5e0',
  white:      '#ffffff',
};

const pdfFormatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (_) { return String(dateStr); }
};

const drawPdfHeader = (doc, docType, docNumber) => {
  const W = doc.page.width;
  const M = 50;

  doc.rect(0, 0, W, 90).fill(PDF_BRAND.primary);

  doc.fillColor(PDF_BRAND.white)
     .font('Helvetica-Bold')
     .fontSize(26)
     .text('DENTAL NAMAY', M, 16, { lineBreak: false });

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#a8d8ea')
     .text('Centro Odontologico Profesional', M, 48, { lineBreak: false });

  doc.fontSize(8)
     .fillColor('#7fb3d3')
     .text('RUC: 20601234567  |  Lima, Peru', M, 62, { lineBreak: false });

  // Decorative circles (tooth motif) — top right
  const cx = W - 70, cy = 45;
  doc.circle(cx, cy - 16, 14).fill('#a8d8ea');
  doc.circle(cx - 12, cy + 4, 9).fill('#a8d8ea');
  doc.circle(cx + 12, cy + 4, 9).fill('#a8d8ea');

  doc.rect(0, 90, W, 5).fill(PDF_BRAND.accent);

  doc.rect(0, 95, W, 44).fill(PDF_BRAND.accentLight);
  doc.fillColor(PDF_BRAND.primary)
     .font('Helvetica-Bold')
     .fontSize(20)
     .text(docType, 0, 108, { align: 'center', width: W });

  if (docNumber) {
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor(PDF_BRAND.textSub)
       .text(`N\xB0 ${docNumber}`, W - 160, 112, { lineBreak: false, width: 110, align: 'right' });
  }

  return 156;
};

const drawPdfFooter = (doc) => {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 50;
  doc.rect(0, H - 58, W, 58).fill(PDF_BRAND.primary);
  doc.fillColor(PDF_BRAND.white)
     .font('Helvetica-Bold')
     .fontSize(9)
     .text('DENTAL NAMAY — Centro Odontologico Profesional', M, H - 46, { align: 'center', width: W - M * 2 });
  doc.font('Helvetica')
     .fontSize(8)
     .fillColor('#a8d8ea')
     .text('Este comprobante es valido para fines tributarios y contables.', M, H - 33, { align: 'center', width: W - M * 2 });
  doc.fillColor('#7fb3d3')
     .fontSize(7)
     .text('Gracias por su preferencia', M, H - 20, { align: 'center', width: W - M * 2 });
};

const drawPdfHRule = (doc, y, color) => {
  const c = color || PDF_BRAND.divider;
  doc.save()
     .moveTo(50, y)
     .lineTo(doc.page.width - 50, y)
     .strokeColor(c)
     .lineWidth(0.8)
     .stroke()
     .restore();
};

const drawPdfStatusBadge = (doc, estado, x, y) => {
  const e = (estado || '').toLowerCase();
  let bg, fg, label;
  if (['pagado', 'completado', 'aprobado'].includes(e)) {
    bg = PDF_BRAND.successBg; fg = PDF_BRAND.success; label = 'PAGADO';
  } else if (['cancelado', 'rechazado'].includes(e)) {
    bg = '#fde8e8'; fg = '#b91c1c'; label = 'CANCELADO';
  } else {
    bg = PDF_BRAND.pendingBg; fg = PDF_BRAND.pending; label = (estado || 'PENDIENTE').toUpperCase();
  }
  doc.roundedRect(x, y, 120, 24, 3).fill(bg);
  doc.fillColor(fg)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text(label, x + 10, y + 7, { width: 100, lineBreak: false });
};

const drawPdfPaymentContent = async (doc, pago, pacienteNombre, docType, docNumber) => {
  const W = doc.page.width;
  const M = 50;
  const colW = (W - M * 2 - 16) / 2;

  let y = drawPdfHeader(doc, docType, docNumber);

  // Emission date
  doc.fillColor(PDF_BRAND.textSub)
     .font('Helvetica')
     .fontSize(8)
     .text(`Emitido el: ${pdfFormatDate(new Date().toISOString())}`, M, y + 3, { align: 'right', width: W - M * 2 });

  y += 20;
  drawPdfHRule(doc, y);
  y += 14;

  // Patient box (left)
  doc.rect(M, y, colW, 76).fill(PDF_BRAND.accentLight);
  doc.rect(M, y, colW, 22).fill(PDF_BRAND.accent);
  doc.fillColor(PDF_BRAND.white)
     .font('Helvetica-Bold')
     .fontSize(8)
     .text('DATOS DEL PACIENTE', M + 8, y + 7, { width: colW - 16, lineBreak: false });
  doc.fillColor(PDF_BRAND.text)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text(pacienteNombre || 'Paciente no registrado', M + 8, y + 28, { width: colW - 16, lineBreak: false });
  doc.fillColor(PDF_BRAND.textSub)
     .font('Helvetica')
     .fontSize(7)
     .text(`ID: ${String(pago.id_paciente_uuid || 'N/A').substring(0, 22)}`, M + 8, y + 46, { width: colW - 16, lineBreak: false });

  // Payment details box (right)
  const col2X = M + colW + 16;
  doc.rect(col2X, y, colW, 76).fill(PDF_BRAND.accentLight);
  doc.rect(col2X, y, colW, 22).fill(PDF_BRAND.accent);
  doc.fillColor(PDF_BRAND.white)
     .font('Helvetica-Bold')
     .fontSize(8)
     .text('DETALLES DEL DOCUMENTO', col2X + 8, y + 7, { width: colW - 16, lineBreak: false });

  const detRows = [
    ['Fecha de pago:', pdfFormatDate(pago.fecha)],
    ['Metodo de pago:', pago.metodo_pago || 'N/A'],
    ['Estado:', (pago.estado || 'N/A').toUpperCase()],
  ];
  detRows.forEach(([lbl, val], i) => {
    const ry = y + 28 + i * 16;
    doc.fillColor(PDF_BRAND.textSub).font('Helvetica-Bold').fontSize(8)
       .text(lbl, col2X + 8, ry, { width: 82, lineBreak: false });
    doc.fillColor(PDF_BRAND.text).font('Helvetica').fontSize(8)
       .text(val, col2X + 92, ry, { width: colW - 100, lineBreak: false });
  });

  y += 90;
  drawPdfHRule(doc, y);
  y += 14;

  // Services table header
  doc.rect(M, y, W - M * 2, 24).fill(PDF_BRAND.primary);
  doc.fillColor(PDF_BRAND.white)
     .font('Helvetica-Bold')
     .fontSize(9)
     .text('DESCRIPCION DEL SERVICIO', M + 10, y + 8, { width: 320, lineBreak: false });
  doc.text('MONTO', W - 120, y + 8, { width: 70, align: 'right', lineBreak: false });
  y += 24;

  // Service row
  doc.rect(M, y, W - M * 2, 32).fill('#f8fafc');
  doc.fillColor(PDF_BRAND.text)
     .font('Helvetica')
     .fontSize(10)
     .text('Atencion odontologica profesional', M + 10, y + 10, { width: 320, lineBreak: false });
  doc.font('Helvetica-Bold')
     .fontSize(10)
     .text(formatCurrency(pago.monto), W - 120, y + 10, { width: 70, align: 'right', lineBreak: false });
  y += 32;

  drawPdfHRule(doc, y, PDF_BRAND.accent);

  // Total row
  doc.rect(M, y + 1, W - M * 2, 38).fill(PDF_BRAND.primary);
  doc.fillColor(PDF_BRAND.white)
     .font('Helvetica-Bold')
     .fontSize(13)
     .text('TOTAL A PAGAR', M + 10, y + 12, { width: 220, lineBreak: false });
  doc.fontSize(16)
     .text(formatCurrency(pago.monto), W - 140, y + 10, { width: 90, align: 'right', lineBreak: false });
  y += 52;

  // Status badge
  drawPdfStatusBadge(doc, pago.estado, M, y);
  y += 38;

  // Comprobante image
  if (pago.comprobante) {
    try {
      const response = await fetch(pago.comprobante);
      if (response.ok) {
        const imageData = Buffer.from(await response.arrayBuffer());
        drawPdfHRule(doc, y);
        y += 10;
        doc.fillColor(PDF_BRAND.textSub)
           .font('Helvetica-Bold')
           .fontSize(9)
           .text('COMPROBANTE DE PAGO ADJUNTO', M, y);
        y += 16;
        doc.image(imageData, M, y, { fit: [W - M * 2, 200], align: 'center' });
        y += 210;
      }
    } catch (err) {
      console.warn('No se pudo embeber imagen de comprobante en PDF:', err?.message || err);
    }
  }

  // Note
  drawPdfHRule(doc, y + 4);
  doc.fillColor(PDF_BRAND.textSub)
     .font('Helvetica')
     .fontSize(8)
     .text(
       'Este documento acredita el pago realizado ante Dental Namay. Conservelo para sus registros.',
       M, y + 14,
       { align: 'center', width: W - M * 2 }
     );

  drawPdfFooter(doc);
};

const getStoragePathFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/payment-proofs\/(.+?)(\?|$)/i);
  if (match && match[1]) {
    return `payment-proofs/${decodeURIComponent(match[1])}`;
  }
  return null;
};

const deletePaymentProofFile = async (url) => {
  const filePath = getStoragePathFromUrl(url);
  if (!filePath) return false;
  const { error } = await supabase.storage.from('payment-proofs').remove([filePath]);
  return !error;
};

// 🔐 Helper: Validar token desde query params o headers (para descargas de PDF)
const validateTokenFromQueryOrHeader = (req) => {
  // Intenta obtener token de header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Intenta obtener token de query parameter
  if (req.query.token) {
    return req.query.token;
  }
  
  // Intenta obtener token de req.user (si fue establecido por middleware)
  if (req.user) {
    return 'user_authenticated';
  }
  
  return null;
};

const createPayment = async (req, res) => {
  try {
    const {
      monto,
      metodo_pago,
      metodo,
      estado = 'pagado',
      fecha,
      fecha_pago,
      descuento_id,
      servicio,
      descripcion,
      id_cita,
      qr_imagen,
    } = req.body;

    if (!monto) {
      return res.status(400).json({ message: 'El monto es requerido', code: 'MISSING_FIELDS' });
    }

    const normalizedMonto = normalizeAmount(monto);
    let descuentoData = null;
    let monto_descuento = 0;
    let monto_final = normalizedMonto;

    if (descuento_id) {
      const { data: discount, error: discountError } = await supabase
        .from('descuentos')
        .select('*')
        .eq('id', descuento_id)
        .single();

      if (discountError || !discount) {
        return res.status(400).json({ message: 'Descuento no encontrado', code: 'DISCOUNT_NOT_FOUND' });
      }

      const today = new Date().toISOString().split('T')[0];
      if (discount.estado !== 'aprobado' || !discount.activo || discount.fecha_inicio > today || discount.fecha_fin < today) {
        return res.status(400).json({ message: 'El descuento no está vigente o no es aplicable', code: 'DISCOUNT_NOT_VALID' });
      }

      if (discount.aplica_a && discount.aplica_a !== 'TODOS') {
        const allowedRoles = discount.aplica_a.split(',').map((item) => item.trim().toUpperCase());
        if (!allowedRoles.includes(req.user?.rol?.toUpperCase() || '')) {
          return res.status(403).json({ message: 'No tienes permiso para aplicar este descuento', code: 'DISCOUNT_NOT_ALLOWED' });
        }
      }

      const valor = Number(discount.valor) || 0;
      monto_descuento = discount.tipo === 'porcentaje'
        ? Math.min(Number((normalizedMonto * (valor / 100)).toFixed(2)), normalizedMonto)
        : Math.min(valor, normalizedMonto);
      monto_final = Number((normalizedMonto - monto_descuento).toFixed(2));
      descuentoData = discount;
    }

    const patientReference = buildPatientReference(req.user.id);

    const payload = {
      ...patientReference,
      id_cita: id_cita || null,
      monto: normalizedMonto,
      monto_descuento,
      monto_final,
      descuento_id: descuentoData?.id || null,
      descuento_nombre: descuentoData?.nombre || null,
      descuento_tipo: descuentoData?.tipo || null,
      descuento_valor: descuentoData?.valor || null,
      metodo_pago: metodo_pago || metodo || 'Yape',
      estado,
      estado_validacion: 'POR_CONFIRMAR',
      fecha: fecha || fecha_pago || new Date().toISOString().split('T')[0],
      servicio: servicio ?? null,
      descripcion: descripcion ?? null,
      qr_imagen: qr_imagen || null,
    };

    const { data, error } = await supabase.from('pagos').insert([payload]).select('*').single();

    if (error) {
      return res.status(500).json({ message: 'Error al registrar pago', error: error.message, code: 'PAYMENT_CREATION_ERROR' });
    }

    res.status(201).json({ code: 'PAYMENT_CREATED', payment: data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const listPayments = async (req, res) => {
  try {
    const { patientId, status, validationStatus, startDate, endDate } = req.query;
    
    console.log('[listPayments] Iniciando consulta con parámetros:', { patientId, status, validationStatus, startDate, endDate });

    let query = supabase
      .from('pagos')
      .select('*');

    // Aplicar filtro por paciente si se proporciona
    if (patientId) {
      console.log('[listPayments] Filtrando por paciente:', patientId);
      query = query.eq('id_paciente_uuid', patientId);
    }

    // Aplicar otros filtros
    if (status) {
      console.log('[listPayments] Filtrando por estado:', status);
      query = query.eq('estado', status);
    }

    if (validationStatus) {
      console.log('[listPayments] Filtrando por estado_validacion:', validationStatus);
      query = query.eq('estado_validacion', validationStatus);
    }

    if (startDate) {
      console.log('[listPayments] Filtrando desde fecha:', startDate);
      query = query.gte('fecha', startDate);
    }

    if (endDate) {
      console.log('[listPayments] Filtrando hasta fecha:', endDate);
      query = query.lte('fecha', endDate);
    }

    // Ejecutar query
    const { data, error } = await query.order('fecha', { ascending: false });

    if (error) {
      console.error('[listPayments] Error en Supabase:', error);
      return res.status(500).json({
        message: 'Error al obtener pagos',
        error: error.message,
        code: 'PAYMENT_LIST_ERROR',
        details: error.details || null
      });
    }

    // Enriquecer con nombre del paciente desde la tabla usuarios
    const payments = data || [];
    const uuids = [...new Set(payments.map(p => p.id_paciente_uuid).filter(Boolean))];
    let userMap = {};
    if (uuids.length > 0) {
      const { data: users } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido')
        .in('id', uuids);
      (users || []).forEach(u => {
        userMap[u.id] = `${u.nombre || ''} ${u.apellido || ''}`.trim();
      });
    }

    const enriched = payments.map(p => ({
      ...p,
      paciente_nombre: p.paciente_nombre || userMap[p.id_paciente_uuid] || null,
    }));

    console.log('[listPayments] Consulta exitosa. Pagos encontrados:', enriched.length);
    res.json({ code: 'PAYMENTS_LIST_SUCCESS', data: enriched });
  } catch (err) {
    console.error('[listPayments] Error inesperado:', err);
    res.status(500).json({ 
      message: 'Error interno', 
      error: err.message, 
      code: 'SERVER_ERROR',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const getPaymentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('[getPaymentsByPatient] Obteniendo pagos del paciente:', patientId);

    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('id_paciente_uuid', patientId)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('[getPaymentsByPatient] Error en Supabase:', error);
      return res.status(500).json({ 
        message: 'Error al obtener pagos del paciente', 
        error: error.message, 
        code: 'PAYMENT_BY_PATIENT_ERROR',
        details: error.details || null
      });
    }

    console.log('[getPaymentsByPatient] Pagos encontrados:', data?.length || 0);
    res.json({ code: 'PAYMENTS_BY_PATIENT_SUCCESS', payments: data || [] });
  } catch (err) {
    console.error('[getPaymentsByPatient] Error inesperado:', err);
    res.status(500).json({ 
      message: 'Error interno', 
      error: err.message, 
      code: 'SERVER_ERROR',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    console.log('[getPaymentDetails] Obteniendo detalles del pago:', paymentId);

    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error('[getPaymentDetails] Error en Supabase:', error);
      return res.status(500).json({ 
        message: 'Error al obtener detalle del pago', 
        error: error.message, 
        code: 'PAYMENT_DETAILS_ERROR',
        details: error.details || null
      });
    }

    if (!data) {
      console.warn('[getPaymentDetails] Pago no encontrado:', paymentId);
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    console.log('[getPaymentDetails] Detalles obtenidos exitosamente');
    res.json({ code: 'PAYMENT_DETAILS_SUCCESS', payment: data });
  } catch (err) {
    console.error('[getPaymentDetails] Error inesperado:', err);
    res.status(500).json({ 
      message: 'Error interno', 
      error: err.message, 
      code: 'SERVER_ERROR',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const validatePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { estado_validacion } = req.body;

    if (!estado_validacion) {
      return res.status(400).json({ message: 'estado_validacion es requerido', code: 'MISSING_VALIDATION_STATUS' });
    }

    const normalizedStatus = String(estado_validacion).trim().toUpperCase();
    if (!['POR_CONFIRMAR', 'APROBADO', 'RECHAZADO'].includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Estado de validación inválido', code: 'INVALID_VALIDATION_STATUS' });
    }

    const { data: existingPayment } = await supabase
      .from('pagos')
      .select('comprobante')
      .eq('id', paymentId)
      .single();

    const updates = {
      estado_validacion: normalizedStatus,
      validado_por: normalizedStatus === 'POR_CONFIRMAR' ? null : req.user.id,
      fecha_validacion: normalizedStatus === 'POR_CONFIRMAR' ? null : new Date().toISOString(),
    };

    if (normalizedStatus === 'APROBADO') {
      updates.estado = 'pagado';
    } else if (normalizedStatus === 'RECHAZADO') {
      updates.estado = 'rechazado';
    } else {
      updates.estado = 'pendiente';
    }

    const { data, error } = await supabase
      .from('pagos')
      .update(updates)
      .eq('id', paymentId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al actualizar validación del pago', error: error.message, code: 'PAYMENT_VALIDATION_ERROR' });
    }

    let validationData = data;
    if (existingPayment?.comprobante && normalizedStatus !== 'POR_CONFIRMAR') {
      try {
        const removed = await deletePaymentProofFile(existingPayment.comprobante);
        if (removed) {
          await supabase.from('pagos').update({ comprobante: null }).eq('id', paymentId);
          validationData = { ...validationData, comprobante: null };
        }
      } catch (cleanupErr) {
        console.warn('No se pudo eliminar el comprobante tras validar el pago:', cleanupErr?.message || cleanupErr);
      }
    }

    // Si el pago pertenece a una cita, actualizar estado de la cita
    try {
      if (data?.id_cita) {
        const citaUpdates = {};
        if (normalizedStatus === 'APROBADO') citaUpdates.estado = 'confirmada';
        else if (normalizedStatus === 'RECHAZADO') citaUpdates.estado = 'pendiente';

        if (Object.keys(citaUpdates).length > 0) {
          await supabase.from('citas').update(citaUpdates).eq('id', data.id_cita);
        }
      }

      // Notificar via socket: recepcionistas y paciente
      const io = getIO();
      const { data: recpRole } = await supabase.from('roles').select('id').eq('nombre', 'RECEPCIONISTA').single();
      if (recpRole?.id) {
        const { data: recps } = await supabase.from('usuarios').select('id').eq('rol_id', recpRole.id).eq('activo', true);
        (recps || []).forEach((r) => io.to(`user_${r.id}`).emit('payment_validated', { payment: data }));
      }

      // Notificar al paciente
      const patientId = data?.id_paciente || data?.id_paciente_uuid;
      if (patientId) {
        io.to(`user_${patientId}`).emit('payment_validated', { payment: data });
      }
    } catch (e) {
      console.error('Error al propagar validación del pago:', e?.message || e);
    }

    res.json({ code: 'PAYMENT_VALIDATED', payment: validationData });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const deletePaymentProof = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { data: payment, error: paymentError } = await supabase
      .from('pagos')
      .select('id, comprobante')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    if (!payment.comprobante) {
      return res.status(400).json({ message: 'No hay comprobante para eliminar', code: 'NO_PROOF_TO_DELETE' });
    }

    const removed = await deletePaymentProofFile(payment.comprobante);
    if (!removed) {
      return res.status(500).json({ message: 'No se pudo eliminar el comprobante del storage', code: 'STORAGE_DELETE_ERROR' });
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from('pagos')
      .update({ comprobante: null })
      .eq('id', payment.id)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Error al actualizar el pago', error: updateError.message, code: 'PAYMENT_UPDATE_ERROR' });
    }

    res.json({ code: 'PAYMENT_PROOF_DELETED', payment: updatedPayment });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const assignPaymentQr = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { qr_imagen } = req.body;
    let qrUrl = qr_imagen || null;

    if (req.file) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Solo se permiten imágenes JPEG, PNG, WebP o GIF', code: 'INVALID_FILE_TYPE' });
      }

      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `qr_${paymentId}_${Date.now()}.${fileExt}`;
      const filePath = `payment-qrs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-qr')
        .upload(filePath, req.file.buffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        return res.status(500).json({ message: 'Error al subir imagen QR', error: uploadError.message, code: 'UPLOAD_ERROR' });
      }

      const { data: publicUrlData } = supabase.storage
        .from('payment-qr')
        .getPublicUrl(filePath);

      qrUrl = publicUrlData?.publicUrl || null;
    }

    if (!qrUrl) {
      return res.status(400).json({ message: 'Se requiere qr_imagen o archivo QR', code: 'MISSING_QR_IMAGE' });
    }

    const { data, error } = await supabase
      .from('pagos')
      .update({ qr_imagen: qrUrl })
      .eq('id', paymentId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al asignar QR', error: error.message, code: 'PAYMENT_QR_ASSIGN_ERROR' });
    }

    // Notificar al paciente que hay un QR asignado
    try {
      const io = getIO();
      const patientId = data?.id_paciente || data?.id_paciente_uuid;
      if (patientId) {
        io.to(`user_${patientId}`).emit('payment_qr_assigned', { payment: data });
      }
    } catch (e) {
      console.error('Error notificando QR al paciente:', e?.message || e);
    }

    res.json({ code: 'PAYMENT_QR_ASSIGNED', payment: data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const generateCashBoxReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    console.log('[generateCashBoxReport] Generando reporte del período:', { start, end });

    const { data: pagos, error } = await supabase
      .from('pagos')
      .select('id, fecha, monto, metodo_pago, estado, id_paciente_uuid')
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: true });

    if (error) {
      console.error('[generateCashBoxReport] Error en Supabase:', error);
      return res.status(500).json({ 
        message: 'Error al obtener datos', 
        error: error.message, 
        code: 'CASHBOX_REPORT_ERROR' 
      });
    }

    const totalIngresos = (pagos || []).reduce((sum, pago) => sum + normalizeAmount(pago.monto), 0);
    const totalPagosRealizados = (pagos || []).filter(pago => ['pagado', 'completado'].includes((pago.estado || '').toLowerCase())).length;
    const totalPagosPendientes = (pagos || []).filter(pago => ['pendiente', 'por_pagar', 'no_pagado', 'pendiente_pago'].includes((pago.estado || '').toLowerCase())).length;

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const filename = `cierre_caja_${start}_${end}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    const W = doc.page.width;
    const M = 50;

    let y = drawPdfHeader(doc, 'CIERRE DE CAJA', null);

    doc.fillColor(PDF_BRAND.textSub)
       .font('Helvetica')
       .fontSize(9)
       .text(`Periodo: ${pdfFormatDate(start)} — ${pdfFormatDate(end)}`, M, y + 2, { align: 'center', width: W - M * 2 });
    y += 20;
    drawPdfHRule(doc, y);
    y += 14;

    // Summary boxes
    const boxW = Math.floor((W - M * 2 - 20) / 3);
    const summaryItems = [
      { label: 'TOTAL INGRESOS', value: formatCurrency(totalIngresos), color: PDF_BRAND.success },
      { label: 'PAGOS REALIZADOS', value: String(totalPagosRealizados), color: PDF_BRAND.accent },
      { label: 'PAGOS PENDIENTES', value: String(totalPagosPendientes), color: PDF_BRAND.pending },
    ];

    summaryItems.forEach((item, i) => {
      const bx = M + i * (boxW + 10);
      doc.rect(bx, y, boxW, 60).fill(PDF_BRAND.accentLight);
      doc.rect(bx, y, boxW, 22).fill(PDF_BRAND.primary);
      doc.fillColor(PDF_BRAND.white).font('Helvetica-Bold').fontSize(7)
         .text(item.label, bx + 6, y + 8, { width: boxW - 12, align: 'center', lineBreak: false });
      doc.fillColor(item.color).font('Helvetica-Bold').fontSize(15)
         .text(item.value, bx + 6, y + 32, { width: boxW - 12, align: 'center', lineBreak: false });
    });
    y += 74;

    drawPdfHRule(doc, y);
    y += 14;

    // Table header
    doc.rect(M, y, W - M * 2, 24).fill(PDF_BRAND.primary);
    doc.fillColor(PDF_BRAND.white).font('Helvetica-Bold').fontSize(8);
    doc.text('#',        M + 6,   y + 8, { width: 22,  lineBreak: false });
    doc.text('Fecha',   M + 30,  y + 8, { width: 70,  lineBreak: false });
    doc.text('Paciente',M + 108, y + 8, { width: 130, lineBreak: false });
    doc.text('Metodo',  M + 246, y + 8, { width: 70,  lineBreak: false });
    doc.text('Estado',  M + 324, y + 8, { width: 70,  lineBreak: false });
    doc.text('Monto',   M + 402, y + 8, { width: 70,  align: 'right', lineBreak: false });
    y += 24;

    (pagos || []).forEach((pago, index) => {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }
      const rowBg = index % 2 === 0 ? '#f0f6fc' : PDF_BRAND.white;
      doc.rect(M, y, W - M * 2, 20).fill(rowBg);
      const pid = String(pago.id_paciente || pago.id_paciente_uuid || 'N/A').substring(0, 18);
      doc.fillColor(PDF_BRAND.text).font('Helvetica').fontSize(8);
      doc.text(String(index + 1), M + 6,   y + 6, { width: 22,  lineBreak: false });
      doc.text(pago.fecha || 'N/A', M + 30, y + 6, { width: 70,  lineBreak: false });
      doc.text(pid,               M + 108, y + 6, { width: 130, lineBreak: false });
      doc.text(pago.metodo_pago || 'N/A', M + 246, y + 6, { width: 70, lineBreak: false });
      doc.text(pago.estado || 'N/A',      M + 324, y + 6, { width: 70, lineBreak: false });
      doc.font('Helvetica-Bold')
         .text(formatCurrency(pago.monto), M + 402, y + 6, { width: 70, align: 'right', lineBreak: false });
      y += 20;
    });

    drawPdfHRule(doc, y + 1, PDF_BRAND.accent);
    doc.rect(M, y + 2, W - M * 2, 34).fill(PDF_BRAND.primary);
    doc.fillColor(PDF_BRAND.white).font('Helvetica-Bold').fontSize(12)
       .text('TOTAL GENERAL', M + 10, y + 11, { width: 250, lineBreak: false });
    doc.fontSize(14)
       .text(formatCurrency(totalIngresos), M + 402, y + 9, { width: 70, align: 'right', lineBreak: false });
    y += 34;

    drawPdfFooter(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al generar reporte', error: err.message, code: 'SERVER_ERROR' });
  }
};

const generatePaymentReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Validar token desde header o query
    const token = validateTokenFromQueryOrHeader(req);
    if (!token && !req.user) {
      console.warn('[generatePaymentReceipt] Acceso denegado: token requerido');
      return res.status(401).json({ 
        message: 'Acceso denegado. Token requerido.', 
        code: 'UNAUTHORIZED' 
      });
    }
    
    console.log('[generatePaymentReceipt] Generando boleta para pago:', paymentId);

    const { data: pago, error } = await supabase
      .from('pagos')
      .select('id, fecha, monto, metodo_pago, estado, id_paciente_uuid, comprobante')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error('[generatePaymentReceipt] Error en Supabase:', error);
      return res.status(500).json({
        message: 'Error al obtener el pago',
        error: error.message,
        code: 'PAYMENT_RECEIPT_ERROR'
      });
    }

    if (!pago) {
      console.warn('[generatePaymentReceipt] Pago no encontrado:', paymentId);
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    // Obtener nombre del paciente
    let pacienteNombre = null;
    const patientIdReceipt = pago.id_paciente_uuid;
    if (patientIdReceipt) {
      try {
        const { data: pac } = await supabase.from('usuarios').select('nombre, apellido').eq('id', patientIdReceipt).maybeSingle();
        if (pac) pacienteNombre = [pac.nombre, pac.apellido].filter(Boolean).join(' ');
      } catch (_) {}
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const filename = `boleta_${paymentId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    const docNum = `B-${String(pago.id).substring(0, 8).toUpperCase()}`;
    await drawPdfPaymentContent(doc, pago, pacienteNombre, 'BOLETA DE PAGO', docNum);

    doc.end();

    if (pago.comprobante) {
      deletePaymentProofFile(pago.comprobante)
        .then(async (deleted) => {
          if (deleted) {
            await supabase.from('pagos').update({ comprobante: null }).eq('id', pago.id);
          }
        })
        .catch((err) => console.warn('Error limpiando comprobante tras emisión de boleta:', err?.message || err));
    }
  } catch (err) {
    console.error('[generatePaymentReceipt] Error inesperado:', err);
    res.status(500).json({ message: 'Error al generar boleta', error: err.message, code: 'SERVER_ERROR' });
  }
};

const generateInvoiceReport = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Validar token desde header o query
    const token = validateTokenFromQueryOrHeader(req);
    if (!token && !req.user) {
      console.warn('[generateInvoiceReport] Acceso denegado: token requerido');
      return res.status(401).json({ 
        message: 'Acceso denegado. Token requerido.', 
        code: 'UNAUTHORIZED' 
      });
    }
    
    console.log('[generateInvoiceReport] Generando factura para pago:', paymentId);

    const { data: pago, error } = await supabase
      .from('pagos')
      .select('id, fecha, monto, metodo_pago, estado, id_paciente_uuid, comprobante')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error('[generateInvoiceReport] Error en Supabase:', error);
      return res.status(500).json({
        message: 'Error al obtener el pago',
        error: error.message,
        code: 'PAYMENT_INVOICE_ERROR'
      });
    }

    if (!pago) {
      console.warn('[generateInvoiceReport] Pago no encontrado:', paymentId);
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    // Obtener nombre del paciente
    let pacienteNombreInv = null;
    const patientIdInv = pago.id_paciente_uuid;
    if (patientIdInv) {
      try {
        const { data: pac } = await supabase.from('usuarios').select('nombre, apellido').eq('id', patientIdInv).maybeSingle();
        if (pac) pacienteNombreInv = [pac.nombre, pac.apellido].filter(Boolean).join(' ');
      } catch (_) {}
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const filename = `factura_${paymentId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    const invDocNum = `F-${String(pago.id).substring(0, 8).toUpperCase()}`;
    await drawPdfPaymentContent(doc, pago, pacienteNombreInv, 'FACTURA', invDocNum);

    doc.end();

    if (pago.comprobante) {
      deletePaymentProofFile(pago.comprobante)
        .then(async (deleted) => {
          if (deleted) {
            await supabase.from('pagos').update({ comprobante: null }).eq('id', pago.id);
          }
        })
        .catch((err) => console.warn('Error limpiando comprobante tras emisión de factura:', err?.message || err));
    }
  } catch (err) {
    console.error('[generateInvoiceReport] Error inesperado:', err);
    res.status(500).json({ message: 'Error al generar factura', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getPendingValidationPayments = async (req, res) => {
  try {
    console.log('[getPendingValidationPayments] Buscando pagos con comprobantes pendientes de validación');

    const { data, error } = await supabase
      .from('pagos')
      .select('id, id_cita, monto, metodo_pago, estado, estado_validacion, fecha, comprobante, id_paciente_uuid')
      .eq('estado_validacion', 'POR_CONFIRMAR')
      .not('comprobante', 'is', null)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('[getPendingValidationPayments] Error en Supabase:', error);
      return res.status(500).json({ 
        message: 'Error al obtener comprobantes pendientes', 
        error: error.message, 
        code: 'PENDING_VALIDATION_ERROR' 
      });
    }

    console.log('[getPendingValidationPayments] Pagos encontrados:', data?.length || 0);
    res.json({ code: 'PENDING_VALIDATION_SUCCESS', payments: data || [] });
  } catch (err) {
    console.error('[getPendingValidationPayments] Error inesperado:', err);
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// 🎫 CONFIRMAR PAGO Y GENERAR FACTURA - Usado por CAJERO desde dashboard
const confirmPaymentAndGenerateInvoice = async (req, res) => {
  try {
    const { paymentId } = req.params;
    console.log('[confirmPaymentAndGenerateInvoice] Confirmando y generando factura para pago:', paymentId);

    // Obtener datos del pago
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('id, fecha, monto, metodo_pago, estado, id_paciente_uuid, comprobante, estado_validacion, id_cita')
      .eq('id', paymentId)
      .single();

    if (pagoError || !pago) {
      console.error('[confirmPaymentAndGenerateInvoice] Pago no encontrado:', pagoError);
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    // Actualizar estado del pago a APROBADO
    const { data: updatedPago, error: updateError } = await supabase
      .from('pagos')
      .update({
        estado_validacion: 'APROBADO',
        estado: 'pagado',
        validado_por: req.user.id,
        fecha_validacion: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[confirmPaymentAndGenerateInvoice] Error actualizando pago:', updateError);
      return res.status(500).json({ 
        message: 'Error al confirmar pago', 
        error: updateError.message, 
        code: 'PAYMENT_UPDATE_ERROR' 
      });
    }

    // Si el pago pertenece a una cita, actualizar estado de la cita
    if (pago.id_cita) {
      try {
        await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', pago.id_cita);
        console.log('[confirmPaymentAndGenerateInvoice] Cita actualizada a confirmada');
      } catch (citaError) {
        console.warn('[confirmPaymentAndGenerateInvoice] Error actualizando cita:', citaError?.message);
      }
    }

    // Obtener ID del paciente (puede ser UUID o numeric)
    const patientId = pago.id_paciente_uuid || pago.id_paciente;

    // Obtener nombre del paciente
    let pacienteNombreConfirm = null;
    if (patientId) {
      try {
        const { data: pac } = await supabase.from('usuarios').select('nombre, apellido').eq('id', patientId).maybeSingle();
        if (pac) pacienteNombreConfirm = [pac.nombre, pac.apellido].filter(Boolean).join(' ');
      } catch (_) {}
    }

    // Generar factura en PDF (en memoria)
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const buffers = [];
    
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);
        
        // Subir PDF a Storage (opcional, para guardar historial)
        const fileName = `factura_${paymentId}_${Date.now()}.pdf`;
        const filePath = `invoices/${fileName}`;
        
        let invoiceUrl = null;
        try {
          const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(filePath, pdfBuffer, {
              cacheControl: '3600',
              contentType: 'application/pdf',
            });

          if (!uploadError) {
            const { data: publicUrlData } = await supabase.storage
              .from('invoices')
              .getPublicUrl(filePath);
            invoiceUrl = publicUrlData?.publicUrl || publicUrlData?.publicURL || null;
            console.log('[confirmPaymentAndGenerateInvoice] Factura guardada en storage:', invoiceUrl);
          }
        } catch (storageError) {
          console.warn('[confirmPaymentAndGenerateInvoice] Error guardando factura en storage:', storageError?.message);
        }

        // Notificar al paciente vía Socket.IO
        try {
          const io = getIO();
          if (io && patientId) {
            io.to(`user_${patientId}`).emit('payment_approved_invoice_generated', {
              payment: updatedPago,
              invoice_url: invoiceUrl,
              message: 'Tu pago ha sido confirmado. Aquí está tu factura.',
              timestamp: new Date().toISOString(),
            });
            console.log('[confirmPaymentAndGenerateInvoice] Notificación enviada al paciente:', patientId);
          }
        } catch (socketError) {
          console.error('[confirmPaymentAndGenerateInvoice] Error notificando al paciente:', socketError?.message);
        }

        // Retornar respuesta con link a descarga
        res.json({
          code: 'PAYMENT_APPROVED_INVOICE_GENERATED',
          payment: updatedPago,
          invoice_url: invoiceUrl,
          message: 'Pago confirmado y factura generada exitosamente'
        });
      } catch (err) {
        console.error('[confirmPaymentAndGenerateInvoice] Error procesando PDF:', err);
        res.status(500).json({ 
          message: 'Error al generar factura', 
          error: err.message, 
          code: 'PDF_GENERATION_ERROR' 
        });
      }
    });

    // Generar contenido de la factura con diseño profesional Dental Namay
    const confirmDocNum = `F-${String(updatedPago.id).substring(0, 8).toUpperCase()}`;
    await drawPdfPaymentContent(doc, updatedPago, pacienteNombreConfirm, 'FACTURA', confirmDocNum);
    doc.end();

  } catch (err) {
    console.error('[confirmPaymentAndGenerateInvoice] Error inesperado:', err);
    res.status(500).json({ 
      message: 'Error interno', 
      error: err.message, 
      code: 'SERVER_ERROR' 
    });
  }
};

// Proxy: descarga el comprobante desde Supabase storage (con service key) y lo sirve al browser
const servePaymentProof = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const { data: payment, error } = await supabase
      .from('pagos')
      .select('id, comprobante')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    if (!payment.comprobante) {
      return res.status(404).json({ message: 'Sin comprobante', code: 'NO_PROOF' });
    }

    const comprobanteUrl = payment.comprobante;

    // Extraer la ruta relativa dentro del bucket 'payment-proofs'
    // Formato Supabase: .../storage/v1/object/public/payment-proofs/<filePath>
    const marker = '/storage/v1/object/public/payment-proofs/';
    const markerIdx = comprobanteUrl.indexOf(marker);

    let filePath = null;
    if (markerIdx !== -1) {
      filePath = decodeURIComponent(comprobanteUrl.slice(markerIdx + marker.length));
    }

    if (!filePath) {
      // Fallback: intentar descargar la URL directamente
      const fetchRes = await fetch(comprobanteUrl);
      if (!fetchRes.ok) {
        return res.status(502).json({ message: 'No se puede acceder al comprobante', code: 'PROOF_FETCH_ERROR' });
      }
      const buf = await fetchRes.buffer();
      res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'max-age=3600');
      return res.send(buf);
    }

    // Descargar con service role key (funciona aunque el bucket sea privado)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('payment-proofs')
      .download(filePath);

    if (downloadError) {
      console.error('[servePaymentProof] Error descargando de Supabase storage:', downloadError.message);
      return res.status(500).json({ message: 'Error descargando comprobante', error: downloadError.message, code: 'STORAGE_DOWNLOAD_ERROR' });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
    const contentTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    const contentType = contentTypes[ext] || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="comprobante_${paymentId}.${ext}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[servePaymentProof] Error:', err.message);
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  createPayment,
  listPayments,
  getPaymentsByPatient,
  getPaymentDetails,
  validatePayment,
  deletePaymentProof,
  assignPaymentQr,
  generateCashBoxReport,
  generatePaymentReceipt,
  generateInvoiceReport,
  getPendingValidationPayments,
  confirmPaymentAndGenerateInvoice,
  servePaymentProof,
};
