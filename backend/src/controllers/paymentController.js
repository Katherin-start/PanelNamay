const supabase = require('../config/supabase');
const PDFDocument = require('pdfkit');
const { getIO } = require('../socket/chatSocket');

const normalizeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatCurrency = (value) => {
  return `$${normalizeAmount(value).toFixed(2)}`;
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

    const payload = {
      id_paciente: req.user.id,
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
    let query = supabase.from('pagos').select('*, pacientes:id_paciente(nombre)');

    if (patientId) {
      query = query.eq('id_paciente', patientId);
    }

    if (status) {
      query = query.eq('estado', status);
    }

    if (validationStatus) {
      query = query.eq('estado_validacion', validationStatus);
    }

    if (startDate) {
      query = query.gte('fecha', startDate);
    }

    if (endDate) {
      query = query.lte('fecha', endDate);
    }

    const { data, error } = await query.order('fecha', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener pagos', error: error.message, code: 'PAYMENT_LIST_ERROR' });
    }

    res.json({ code: 'PAYMENTS_LIST_SUCCESS', data: data || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getPaymentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { data, error } = await supabase
      .from('pagos')
      .select('*, pacientes:id_paciente(nombre)')
      .eq('id_paciente', patientId)
      .order('fecha', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener pagos del paciente', error: error.message, code: 'PAYMENT_BY_PATIENT_ERROR' });
    }

    res.json({ code: 'PAYMENTS_BY_PATIENT_SUCCESS', payments: data || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { data, error } = await supabase
      .from('pagos')
      .select('*, pacientes:id_paciente(nombre)')
      .eq('id', paymentId)
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al obtener detalle del pago', error: error.message, code: 'PAYMENT_DETAILS_ERROR' });
    }

    if (!data) {
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    res.json({ code: 'PAYMENT_DETAILS_SUCCESS', payment: data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
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
      if (data?.id_paciente) {
        io.to(`user_${data.id_paciente}`).emit('payment_validated', { payment: data });
      }
    } catch (e) {
      console.error('Error al propagar validación del pago:', e?.message || e);
    }

    res.json({ code: 'PAYMENT_VALIDATED', payment: data });
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
      if (data?.id_paciente) {
        io.to(`user_${data.id_paciente}`).emit('payment_qr_assigned', { payment: data });
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

    const { data: pagos, error } = await supabase
      .from('pagos')
      .select('id, fecha, monto, metodo_pago, estado, id_paciente, pacientes:id_paciente(nombre)')
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener datos', error: error.message, code: 'CASHBOX_REPORT_ERROR' });
    }

    const totalIngresos = (pagos || []).reduce((sum, pago) => sum + normalizeAmount(pago.monto), 0);
    const totalPagosRealizados = (pagos || []).filter(pago => ['pagado', 'completado'].includes((pago.estado || '').toLowerCase())).length;
    const totalPagosPendientes = (pagos || []).filter(pago => ['pendiente', 'por_pagar', 'no_pagado', 'pendiente_pago'].includes((pago.estado || '').toLowerCase())).length;

    const doc = new PDFDocument();
    const filename = `cierre_caja_${start}_${end}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
    doc.fontSize(20).text('CIERRE DE CAJA', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${start} - ${end}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(14).text(`Total ingresos: ${formatCurrency(totalIngresos)}`);
    doc.text(`Pagos realizados: ${totalPagosRealizados}`);
    doc.text(`Pagos pendientes: ${totalPagosPendientes}`);
    doc.moveDown();
    doc.fontSize(12).text('Detalle de pagos:');
    doc.moveDown();

    (pagos || []).forEach((pago, index) => {
      doc.fontSize(10).text(`${index + 1}. Fecha: ${pago.fecha || 'N/A'}`);
      doc.text(`   Paciente: ${pago.pacientes?.nombre || pago.id_paciente || 'N/A'}`);
      doc.text(`   Monto: ${formatCurrency(pago.monto)} | Estado: ${pago.estado || 'N/A'} | Método: ${pago.metodo_pago || 'N/A'}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al generar reporte', error: err.message, code: 'SERVER_ERROR' });
  }
};

const generatePaymentReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { data: pago, error } = await supabase
      .from('pagos')
      .select('id, fecha, monto, metodo_pago, estado, id_paciente, comprobante, pacientes:id_paciente(nombre)')
      .eq('id', paymentId)
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al obtener el pago', error: error.message, code: 'PAYMENT_RECEIPT_ERROR' });
    }

    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    const doc = new PDFDocument();
    const filename = `boleta_${paymentId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
    doc.fontSize(20).text('BOLETA DE PAGO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Fecha de pago: ${pago.fecha || 'N/A'}`);
    doc.text(`Paciente: ${pago.pacientes?.nombre || pago.id_paciente || 'N/A'}`);
    doc.text(`Monto: ${formatCurrency(pago.monto)}`);
    doc.text(`Estado: ${pago.estado || 'N/A'}`);
    doc.text(`Método: ${pago.metodo_pago || 'N/A'}`);
    doc.text(`Comprobante: ${pago.comprobante || 'N/A'}`);
    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al generar boleta', error: err.message, code: 'SERVER_ERROR' });
  }
};

const generateInvoiceReport = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { data: pago, error } = await supabase
      .from('pagos')
      .select('id, fecha, monto, metodo_pago, estado, id_paciente, comprobante, pacientes:id_paciente(nombre)')
      .eq('id', paymentId)
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al obtener el pago', error: error.message, code: 'PAYMENT_INVOICE_ERROR' });
    }

    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    const doc = new PDFDocument();
    const filename = `factura_${paymentId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
    doc.fontSize(20).text('FACTURA', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Fecha de emisión: ${new Date().toISOString().split('T')[0]}`);
    doc.text(`Fecha de pago: ${pago.fecha || 'N/A'}`);
    doc.text(`Paciente: ${pago.pacientes?.nombre || pago.id_paciente || 'N/A'}`);
    doc.text(`Monto total: ${formatCurrency(pago.monto)}`);
    doc.text(`Estado: ${pago.estado || 'N/A'}`);
    doc.text(`Método: ${pago.metodo_pago || 'N/A'}`);
    doc.text(`Comprobante: ${pago.comprobante || 'N/A'}`);
    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al generar factura', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  createPayment,
  listPayments,
  getPaymentsByPatient,
  getPaymentDetails,
  validatePayment,
  assignPaymentQr,
  generateCashBoxReport,
  generatePaymentReceipt,
  generateInvoiceReport,
};
