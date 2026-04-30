const supabase = require('../config/supabase');
const PDFDocument = require('pdfkit');

const normalizeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatCurrency = (value) => {
  return `$${normalizeAmount(value).toFixed(2)}`;
};

const createPayment = async (req, res) => {
  try {
    const { monto, descripcion, referencia, factura_numero, boleta_numero, estado = 'pagado', metodo = 'Yape', fecha_pago } = req.body;

    if (!monto) {
      return res.status(400).json({ message: 'El monto es requerido', code: 'MISSING_FIELDS' });
    }

    const payload = {
      paciente_id: req.user.id,
      monto: normalizeAmount(monto),
      descripcion: descripcion || null,
      referencia: referencia || null,
      factura_numero: factura_numero || null,
      boleta_numero: boleta_numero || null,
      estado,
      metodo,
      fecha_pago: fecha_pago || new Date().toISOString().split('T')[0],
      creado_en: new Date().toISOString(),
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
    const { patientId, status, startDate, endDate } = req.query;
    let query = supabase.from('pagos').select('id, fecha_pago, monto, estado, paciente_id, descripcion, metodo, referencia, factura_numero, boleta_numero, usuarios:paciente_id(nombre)');

    if (patientId) {
      query = query.eq('paciente_id', patientId);
    }

    if (status) {
      query = query.eq('estado', status);
    }

    if (startDate) {
      query = query.gte('fecha_pago', startDate);
    }

    if (endDate) {
      query = query.lte('fecha_pago', endDate);
    }

    const { data, error } = await query.order('fecha_pago', { ascending: false });

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
      .select('id, fecha_pago, monto, estado, descripcion, metodo, referencia, factura_numero, boleta_numero, usuarios:paciente_id(nombre)')
      .eq('paciente_id', patientId)
      .order('fecha_pago', { ascending: false });

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
      .select('id, fecha_pago, monto, estado, paciente_id, descripcion, metodo, referencia, factura_numero, boleta_numero, usuarios:paciente_id(nombre, correo)')
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

const generateCashBoxReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const { data: pagos, error } = await supabase
      .from('pagos')
      .select('id, fecha_pago, monto, estado, paciente_id, descripcion, metodo, referencia, factura_numero, boleta_numero, usuarios:paciente_id(nombre)')
      .gte('fecha_pago', start)
      .lte('fecha_pago', end)
      .order('fecha_pago', { ascending: true });

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
      doc.fontSize(10).text(`${index + 1}. Fecha: ${pago.fecha_pago || 'N/A'}`);
      doc.text(`   Paciente: ${pago.usuarios?.nombre || pago.paciente_id}`);
      doc.text(`   Monto: ${formatCurrency(pago.monto)} | Estado: ${pago.estado || 'N/A'} | Método: ${pago.metodo || 'N/A'}`);
      doc.text(`   Referencia: ${pago.referencia || 'N/A'} | Factura: ${pago.factura_numero || 'N/A'} | Boleta: ${pago.boleta_numero || 'N/A'}`);
      doc.text(`   Descripción: ${pago.descripcion || 'N/A'}`);
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
      .select('id, fecha_pago, monto, estado, paciente_id, descripcion, metodo, referencia, factura_numero, boleta_numero, usuarios:paciente_id(nombre, correo)')
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
    doc.fontSize(12).text(`Número de boleta: ${pago.boleta_numero || 'N/A'}`);
    doc.text(`Fecha de pago: ${pago.fecha_pago || 'N/A'}`);
    doc.text(`Paciente: ${pago.usuarios?.nombre || pago.paciente_id}`);
    doc.text(`Email: ${pago.usuarios?.correo || 'N/A'}`);
    doc.text(`Monto: ${formatCurrency(pago.monto)}`);
    doc.text(`Estado: ${pago.estado || 'N/A'}`);
    doc.text(`Método: ${pago.metodo || 'N/A'}`);
    doc.text(`Referencia: ${pago.referencia || 'N/A'}`);
    doc.text(`Factura: ${pago.factura_numero || 'N/A'}`);
    doc.moveDown();
    doc.fontSize(12).text('Descripción:');
    doc.fontSize(10).text(pago.descripcion || 'No hay descripción adicional.');
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
      .select('id, fecha_pago, monto, estado, paciente_id, descripcion, metodo, referencia, factura_numero, boleta_numero, usuarios:paciente_id(nombre, correo)')
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
    doc.fontSize(12).text(`Número de factura: ${pago.factura_numero || 'N/A'}`);
    doc.text(`Fecha de emisión: ${new Date().toISOString().split('T')[0]}`);
    doc.text(`Fecha de pago: ${pago.fecha_pago || 'N/A'}`);
    doc.text(`Paciente: ${pago.usuarios?.nombre || pago.paciente_id}`);
    doc.text(`Email: ${pago.usuarios?.correo || 'N/A'}`);
    doc.text(`Monto total: ${formatCurrency(pago.monto)}`);
    doc.text(`Estado: ${pago.estado || 'N/A'}`);
    doc.text(`Método: ${pago.metodo || 'N/A'}`);
    doc.text(`Referencia: ${pago.referencia || 'N/A'}`);
    doc.moveDown();
    doc.fontSize(12).text('Detalle del servicio:');
    doc.fontSize(10).text(pago.descripcion || 'No se proporcionó descripción.');
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
  generateCashBoxReport,
  generatePaymentReceipt,
  generateInvoiceReport,
};
