const supabase = require('../config/supabase');
const PDFDocument = require('pdfkit');

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

const fmtDate = (str) => {
  if (!str) return 'N/A';
  try { return new Date(str).toLocaleDateString('es-PE'); } catch (_) { return String(str); }
};

const fmtMoney = (val) => `S/ ${(parseFloat(val) || 0).toFixed(2)}`;

const PDF_BRAND = {
  navy:  '#1D3557',
  coral: '#E63946',
  steel: '#457B9D',
  light: '#F1F4F9',
  white: '#FFFFFF',
  gray:  '#F8FAFC',
};

const buildPdfHeader = (doc, title, subtitle = '') => {
  const W = doc.page.width;
  doc.rect(0, 0, W, 78).fill(PDF_BRAND.navy);
  doc.fillColor(PDF_BRAND.white).font('Helvetica-Bold').fontSize(20)
     .text('DENTAL NAMAY', 50, 16, { lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor('#a8d8ea')
     .text('Centro Odontológico Profesional  ·  Lima, Perú', 50, 42, { lineBreak: false });
  doc.rect(0, 78, W, 4).fill(PDF_BRAND.coral);
  doc.rect(0, 82, W, 44).fill(PDF_BRAND.light);
  doc.fillColor(PDF_BRAND.navy).font('Helvetica-Bold').fontSize(15)
     .text(title, 0, 91, { align: 'center', width: W });
  if (subtitle) {
    doc.font('Helvetica').fontSize(9).fillColor(PDF_BRAND.steel)
       .text(subtitle, 0, 111, { align: 'center', width: W });
  }
  return 138;
};

const pdfTableHeader = (doc, y, cols) => {
  const W = doc.page.width - 100;
  doc.rect(50, y, W, 22).fill(PDF_BRAND.navy);
  doc.fillColor(PDF_BRAND.white).font('Helvetica-Bold').fontSize(8);
  cols.forEach(({ label, x, width }) => {
    doc.text(label, x, y + 7, { width, lineBreak: false });
  });
  return y + 22;
};

const pdfRow = (doc, y, cols, values, evenRow) => {
  const W = doc.page.width - 100;
  doc.rect(50, y, W, 20).fill(evenRow ? PDF_BRAND.gray : PDF_BRAND.white);
  doc.fillColor(PDF_BRAND.navy).font('Helvetica').fontSize(8);
  cols.forEach(({ x, width }, i) => {
    const val = values[i] ?? '—';
    if (typeof val === 'object' && val.color) {
      doc.fillColor(val.color).text(val.text, x, y + 6, { width, lineBreak: false });
      doc.fillColor(PDF_BRAND.navy);
    } else {
      doc.text(String(val), x, y + 6, { width, lineBreak: false });
    }
  });
  return y + 20;
};

const pdfFooter = (doc) => {
  const W = doc.page.width;
  const H = doc.page.height;
  doc.rect(0, H - 42, W, 42).fill(PDF_BRAND.navy);
  doc.fillColor(PDF_BRAND.white).font('Helvetica').fontSize(8)
     .text('Dental Namay — Este documento es generado automáticamente por el sistema.', 0, H - 28, { align: 'center', width: W });
};

// CSV sin paquetes externos
const buildCsv = (headers, rows) => {
  const escape = (v) => {
    const s = String(v ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
};

const sendCsv = (res, filename, headers, rows) => {
  const csv = buildCsv(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv); // BOM para Excel
};

// ──────────────────────────────────────────────────────────────
// REPORTE DE PACIENTES
// ──────────────────────────────────────────────────────────────

const generatePatientsReport = async (req, res) => {
  const { format = 'pdf' } = req.query;
  try {
    // Pacientes están en la tabla usuarios con rol PACIENTE
    const { data: rolData } = await supabase.from('roles').select('id').ilike('nombre', 'PACIENTE').maybeSingle();
    const rolId = rolData?.id ?? 6;

    const { data: rows, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, correo, dni, telefono, creado_en, activo')
      .eq('rol_id', rolId)
      .order('creado_en', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener pacientes', code: 'DATABASE_ERROR', error: error.message });
    }

    const pacientes = rows || [];
    const fecha = new Date().toLocaleDateString('es-PE');

    if (format === 'csv') {
      return sendCsv(res, 'reporte_pacientes.csv',
        ['#', 'Nombre', 'Apellido', 'Correo', 'DNI', 'Teléfono', 'Estado', 'Registrado'],
        pacientes.map((p, i) => [i + 1, p.nombre || '', p.apellido || '', p.correo || '',
          p.dni || '', p.telefono || '', p.activo ? 'Activo' : 'Inactivo', fmtDate(p.creado_en)])
      );
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_pacientes.pdf"');
    doc.pipe(res);

    let y = buildPdfHeader(doc, 'REPORTE DE PACIENTES', `${fecha}  ·  Total: ${pacientes.length} paciente(s)`);
    y += 18;

    const cols = [
      { label: '#',          x: 55,  width: 22  },
      { label: 'NOMBRE',     x: 82,  width: 130 },
      { label: 'CORREO',     x: 217, width: 155 },
      { label: 'TELÉFONO',   x: 377, width: 75  },
      { label: 'ESTADO',     x: 457, width: 65  },
    ];

    y = pdfTableHeader(doc, y, cols);

    pacientes.forEach((p, i) => {
      if (y > 730) { pdfFooter(doc); doc.addPage(); y = 50; }
      const estadoColor = p.activo ? '#16A34A' : '#B91C1C';
      y = pdfRow(doc, y, cols, [
        i + 1,
        `${p.nombre || ''} ${p.apellido || ''}`.trim() || 'N/A',
        p.correo || '—',
        p.telefono || '—',
        { text: p.activo ? 'ACTIVO' : 'INACTIVO', color: estadoColor },
      ], i % 2 === 0);
    });

    if (pacientes.length === 0) {
      doc.fillColor(PDF_BRAND.steel).font('Helvetica').fontSize(12)
         .text('Sin pacientes registrados', 0, y + 30, { align: 'center', width: doc.page.width });
    }

    pdfFooter(doc);
    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Error al generar reporte', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ──────────────────────────────────────────────────────────────
// REPORTE DE INGRESOS
// ──────────────────────────────────────────────────────────────

const generateIncomeReport = async (req, res) => {
  const { format = 'pdf' } = req.query;
  const start = req.query.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const end   = req.query.endDate   || new Date().toISOString().split('T')[0];
  try {
    const { data: rows, error } = await supabase
      .from('pagos')
      .select('id, fecha, monto, monto_final, descripcion, servicio, metodo_pago, estado')
      .gte('fecha', start)
      .lte('fecha', end)
      .in('estado', ['pagado', 'completado'])
      .order('fecha', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener pagos', code: 'DATABASE_ERROR', error: error.message });
    }

    const pagos  = rows || [];
    const total  = pagos.reduce((s, p) => s + (parseFloat(p.monto_final ?? p.monto) || 0), 0);
    const fecha  = new Date().toLocaleDateString('es-PE');

    if (format === 'csv') {
      return sendCsv(res, `reporte_ingresos_${start}_${end}.csv`,
        ['#', 'Fecha', 'Servicio/Descripción', 'Método', 'Monto (S/)', 'Estado'],
        pagos.map((p, i) => [i + 1, fmtDate(p.fecha),
          p.servicio || p.descripcion || 'Pago registrado',
          p.metodo_pago || '—',
          (parseFloat(p.monto_final ?? p.monto) || 0).toFixed(2),
          p.estado])
      );
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_ingresos_${start}_${end}.pdf"`);
    doc.pipe(res);

    let y = buildPdfHeader(doc, 'REPORTE DE INGRESOS',
      `Período: ${fmtDate(start)} al ${fmtDate(end)}  ·  Total: ${fmtMoney(total)}`);
    y += 18;

    const cols = [
      { label: '#',           x: 55,  width: 22  },
      { label: 'FECHA',       x: 82,  width: 70  },
      { label: 'SERVICIO',    x: 157, width: 185 },
      { label: 'MÉTODO',      x: 347, width: 70  },
      { label: 'TOTAL (S/)',  x: 422, width: 80  },
    ];

    y = pdfTableHeader(doc, y, cols);

    pagos.forEach((p, i) => {
      if (y > 730) { pdfFooter(doc); doc.addPage(); y = 50; }
      y = pdfRow(doc, y, cols, [
        i + 1,
        fmtDate(p.fecha),
        p.servicio || p.descripcion || 'Pago registrado',
        p.metodo_pago || '—',
        (parseFloat(p.monto_final ?? p.monto) || 0).toFixed(2),
      ], i % 2 === 0);
    });

    if (pagos.length === 0) {
      doc.fillColor(PDF_BRAND.steel).font('Helvetica').fontSize(12)
         .text('Sin ingresos en el período seleccionado', 0, y + 30, { align: 'center', width: doc.page.width });
    }

    // Totalizador
    y += 14;
    doc.rect(50, y, doc.page.width - 100, 28).fill(PDF_BRAND.navy);
    doc.fillColor(PDF_BRAND.white).font('Helvetica-Bold').fontSize(12)
       .text(`TOTAL INGRESOS: ${fmtMoney(total)}`, 0, y + 8, { align: 'center', width: doc.page.width });

    pdfFooter(doc);
    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Error al generar reporte', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ──────────────────────────────────────────────────────────────
// REPORTE DE CITAS
// ──────────────────────────────────────────────────────────────

const generateAppointmentsReport = async (req, res) => {
  const { format = 'pdf' } = req.query;
  const start = req.query.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const end   = req.query.endDate   || new Date().toISOString().split('T')[0];
  try {
    // Sin join doble — seleccionamos campos básicos de citas
    const { data: rows, error } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado, servicio, notas, id_paciente, id_odontologo')
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener citas', code: 'DATABASE_ERROR', error: error.message });
    }

    const citas = rows || [];
    const completadas = citas.filter(c => ['completada', 'atendida'].includes(c.estado)).length;
    const pendientes  = citas.filter(c => ['pendiente', 'programada', 'confirmada'].includes(c.estado)).length;
    const canceladas  = citas.filter(c => c.estado === 'cancelada' || c.estado === 'cancelado').length;
    const fecha = new Date().toLocaleDateString('es-PE');

    if (format === 'csv') {
      return sendCsv(res, `reporte_citas_${start}_${end}.csv`,
        ['#', 'Fecha', 'Hora', 'Servicio', 'Estado', 'Notas'],
        citas.map((c, i) => [i + 1, fmtDate(c.fecha), c.hora || '—',
          c.servicio || 'Consulta', c.estado || '—', c.notas || ''])
      );
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_citas_${start}_${end}.pdf"`);
    doc.pipe(res);

    let y = buildPdfHeader(doc, 'REPORTE DE CITAS',
      `Período: ${fmtDate(start)} al ${fmtDate(end)}  ·  Total: ${citas.length}`);
    y += 10;

    // Resumen rápido
    doc.rect(50, y, doc.page.width - 100, 34).fill(PDF_BRAND.light);
    doc.fillColor(PDF_BRAND.navy).font('Helvetica-Bold').fontSize(9)
       .text(`Completadas: ${completadas}`, 70, y + 10, { lineBreak: false });
    doc.fillColor('#B45309').text(`Pendientes: ${pendientes}`, 210, y + 10, { lineBreak: false });
    doc.fillColor('#B91C1C').text(`Canceladas: ${canceladas}`, 350, y + 10, { lineBreak: false });
    y += 44;

    const cols = [
      { label: '#',        x: 55,  width: 22  },
      { label: 'FECHA',    x: 82,  width: 70  },
      { label: 'HORA',     x: 157, width: 45  },
      { label: 'SERVICIO', x: 207, width: 165 },
      { label: 'ESTADO',   x: 377, width: 80  },
    ];

    y = pdfTableHeader(doc, y, cols);

    const estadoColor = (e) => {
      const s = (e || '').toLowerCase();
      if (['completada', 'atendida'].includes(s)) return '#16A34A';
      if (['cancelada', 'cancelado'].includes(s)) return '#B91C1C';
      if (['pendiente', 'programada'].includes(s)) return '#B45309';
      return PDF_BRAND.navy;
    };

    citas.forEach((c, i) => {
      if (y > 730) { pdfFooter(doc); doc.addPage(); y = 50; }
      y = pdfRow(doc, y, cols, [
        i + 1, fmtDate(c.fecha), c.hora || '—', c.servicio || 'Consulta dental',
        { text: (c.estado || '—').toUpperCase(), color: estadoColor(c.estado) },
      ], i % 2 === 0);
    });

    if (citas.length === 0) {
      doc.fillColor(PDF_BRAND.steel).font('Helvetica').fontSize(12)
         .text('Sin citas en el período seleccionado', 0, y + 30, { align: 'center', width: doc.page.width });
    }

    pdfFooter(doc);
    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Error al generar reporte', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ──────────────────────────────────────────────────────────────
// REPORTE FINANCIERO (balance ingresos + pagos pendientes)
// ──────────────────────────────────────────────────────────────

const generateFinancialReport = async (req, res) => {
  const { format = 'pdf' } = req.query;
  const start = req.query.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const end   = req.query.endDate   || new Date().toISOString().split('T')[0];
  try {
    const [pagosRes, pendientesRes] = await Promise.all([
      supabase.from('pagos').select('fecha, monto, monto_final, estado, metodo_pago')
        .gte('fecha', start).lte('fecha', end).in('estado', ['pagado', 'completado']),
      supabase.from('pagos').select('fecha, monto, monto_final, estado')
        .gte('fecha', start).lte('fecha', end).in('estado', ['pendiente', 'por_pagar']),
    ]);

    const pagos     = pagosRes.data    || [];
    const pendientes = pendientesRes.data || [];

    const totalIngresado = pagos.reduce((s, p) => s + (parseFloat(p.monto_final ?? p.monto) || 0), 0);
    const totalPendiente = pendientes.reduce((s, p) => s + (parseFloat(p.monto_final ?? p.monto) || 0), 0);

    // Ingresos por método de pago
    const porMetodo = pagos.reduce((map, p) => {
      const m = p.metodo_pago || 'Otro';
      map[m] = (map[m] || 0) + (parseFloat(p.monto_final ?? p.monto) || 0);
      return map;
    }, {});

    if (format === 'csv') {
      const rows = [
        ['RESUMEN', ''],
        ['Total ingresado', totalIngresado.toFixed(2)],
        ['Total pendiente', totalPendiente.toFixed(2)],
        ['', ''],
        ['POR MÉTODO DE PAGO', ''],
        ...Object.entries(porMetodo).map(([m, v]) => [m, v.toFixed(2)]),
      ];
      return sendCsv(res, `reporte_financiero_${start}_${end}.csv`, ['Concepto', 'Monto (S/)'], rows);
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_financiero_${start}_${end}.pdf"`);
    doc.pipe(res);

    const fecha = new Date().toLocaleDateString('es-PE');
    let y = buildPdfHeader(doc, 'REPORTE FINANCIERO', `Período: ${fmtDate(start)} al ${fmtDate(end)}  ·  ${fecha}`);
    y += 20;

    // Cards de resumen
    const cardW = (doc.page.width - 120) / 2;
    doc.rect(50, y, cardW, 60).fill(PDF_BRAND.navy);
    doc.fillColor(PDF_BRAND.white).font('Helvetica-Bold').fontSize(9)
       .text('TOTAL INGRESADO', 60, y + 10, { width: cardW - 20, lineBreak: false });
    doc.fontSize(20).text(fmtMoney(totalIngresado), 60, y + 26, { width: cardW - 20, lineBreak: false });
    doc.fontSize(8).fillColor('#a8d8ea').text('Pagos aceptados', 60, y + 48, { width: cardW - 20, lineBreak: false });

    const col2 = 50 + cardW + 20;
    doc.rect(col2, y, cardW, 60).fill('#FEF3C7');
    doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(9)
       .text('PENDIENTE DE COBRO', col2 + 10, y + 10, { width: cardW - 20, lineBreak: false });
    doc.fontSize(20).text(fmtMoney(totalPendiente), col2 + 10, y + 26, { width: cardW - 20, lineBreak: false });
    doc.fontSize(8).fillColor('#B45309').text('Pagos por confirmar', col2 + 10, y + 48, { width: cardW - 20, lineBreak: false });
    y += 80;

    // Ingresos por método de pago
    doc.fillColor(PDF_BRAND.navy).font('Helvetica-Bold').fontSize(11)
       .text('DESGLOSE POR MÉTODO DE PAGO', 50, y);
    y += 20;

    const metodoCols = [
      { label: 'MÉTODO',     x: 55,  width: 200 },
      { label: 'MONTO (S/)', x: 260, width: 120 },
      { label: '% DEL TOTAL', x: 385, width: 100 },
    ];
    y = pdfTableHeader(doc, y, metodoCols);

    Object.entries(porMetodo).forEach(([metodo, monto], i) => {
      if (y > 730) { pdfFooter(doc); doc.addPage(); y = 50; }
      const pct = totalIngresado > 0 ? ((monto / totalIngresado) * 100).toFixed(1) : '0.0';
      y = pdfRow(doc, y, metodoCols, [metodo, fmtMoney(monto), `${pct}%`], i % 2 === 0);
    });

    if (Object.keys(porMetodo).length === 0) {
      doc.fillColor(PDF_BRAND.steel).font('Helvetica').fontSize(12)
         .text('Sin datos en el período seleccionado', 0, y + 20, { align: 'center', width: doc.page.width });
    }

    pdfFooter(doc);
    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Error al generar reporte', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ──────────────────────────────────────────────────────────────
// REPORTE DE ASISTENCIA
// ──────────────────────────────────────────────────────────────

const generateAttendanceReport = async (req, res) => {
  const { format = 'pdf' } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const start = req.query.startDate || today;
  const end   = req.query.endDate   || today;
  const currentUserId = req.user.id;
  const currentRole   = (req.user.rol || '').toUpperCase();
  const isAdmin = ['ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO'].includes(currentRole);
  try {
    let query = supabase
      .from('asistencia_practicante')
      .select('fecha, turno, check_in, check_out, actividad, estado, practicante_id')
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: true });

    if (!isAdmin) query = query.eq('practicante_id', currentUserId);

    const { data: rows, error } = await query;

    if (error) {
      return res.status(500).json({ message: 'Error al generar reporte', error: error.message, code: 'DATABASE_ERROR' });
    }

    const asistencias = rows || [];
    const fecha = new Date().toLocaleDateString('es-PE');

    if (format === 'csv') {
      return sendCsv(res, `reporte_asistencia_${start}_${end}.csv`,
        ['#', 'Fecha', 'Turno', 'Entrada', 'Salida', 'Actividad', 'Estado'],
        asistencias.map((a, i) => [i + 1, fmtDate(a.fecha), a.turno || '—',
          a.check_in || '—', a.check_out || '—', a.actividad || '—', a.estado || '—'])
      );
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_asistencia_${start}_${end}.pdf"`);
    doc.pipe(res);

    let y = buildPdfHeader(doc, 'REPORTE DE ASISTENCIA',
      `Período: ${fmtDate(start)} al ${fmtDate(end)}  ·  ${asistencias.length} registro(s)`);
    y += 18;

    const cols = [
      { label: '#',         x: 55,  width: 22 },
      { label: 'FECHA',     x: 82,  width: 70 },
      { label: 'TURNO',     x: 157, width: 60 },
      { label: 'ENTRADA',   x: 222, width: 70 },
      { label: 'SALIDA',    x: 297, width: 70 },
      { label: 'ESTADO',    x: 372, width: 80 },
    ];

    y = pdfTableHeader(doc, y, cols);

    asistencias.forEach((a, i) => {
      if (y > 730) { pdfFooter(doc); doc.addPage(); y = 50; }
      y = pdfRow(doc, y, cols, [
        i + 1, fmtDate(a.fecha), a.turno || '—',
        a.check_in ? String(a.check_in).substring(11, 16) : '—',
        a.check_out ? String(a.check_out).substring(11, 16) : '—',
        a.estado || '—',
      ], i % 2 === 0);
    });

    if (asistencias.length === 0) {
      doc.fillColor(PDF_BRAND.steel).font('Helvetica').fontSize(12)
         .text('Sin registros en el período seleccionado', 0, y + 30, { align: 'center', width: doc.page.width });
    }

    pdfFooter(doc);
    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Error al generar PDF', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ──────────────────────────────────────────────────────────────
// REPORTE DE HORAS ACUMULADAS
// ──────────────────────────────────────────────────────────────

const generateAccumulatedHoursReport = async (req, res) => {
  const { format = 'pdf' } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const start = req.query.startDate || today;
  const end   = req.query.endDate   || today;
  const currentUserId = req.user.id;
  const currentRole   = (req.user.rol || '').toUpperCase();
  const isAdmin = ['ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO'].includes(currentRole);
  try {
    let query = supabase
      .from('asistencia_practicante')
      .select('fecha, check_in, check_out, turno, practicante_id')
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: true });

    if (!isAdmin) query = query.eq('practicante_id', currentUserId);

    const { data: rows, error } = await query;

    if (error) {
      return res.status(500).json({ message: 'Error al generar reporte de horas', error: error.message, code: 'DATABASE_ERROR' });
    }

    const asistencias = rows || [];
    const calcHoras = (a) => (a.check_in && a.check_out)
      ? ((new Date(a.check_out) - new Date(a.check_in)) / 3600000)
      : 0;

    const totalHoras = asistencias.reduce((s, a) => s + calcHoras(a), 0);

    if (format === 'csv') {
      return sendCsv(res, `reporte_horas_${start}_${end}.csv`,
        ['#', 'Fecha', 'Turno', 'Entrada', 'Salida', 'Horas'],
        asistencias.map((a, i) => [i + 1, fmtDate(a.fecha), a.turno || '—',
          a.check_in ? String(a.check_in).substring(11, 16) : '—',
          a.check_out ? String(a.check_out).substring(11, 16) : '—',
          calcHoras(a).toFixed(2)])
      );
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_horas_${start}_${end}.pdf"`);
    doc.pipe(res);

    let y = buildPdfHeader(doc, 'REPORTE DE HORAS ACUMULADAS',
      `Período: ${fmtDate(start)} al ${fmtDate(end)}  ·  Total: ${totalHoras.toFixed(2)} hrs`);
    y += 18;

    const cols = [
      { label: '#',        x: 55,  width: 22  },
      { label: 'FECHA',    x: 82,  width: 80  },
      { label: 'TURNO',    x: 167, width: 70  },
      { label: 'ENTRADA',  x: 242, width: 80  },
      { label: 'SALIDA',   x: 327, width: 80  },
      { label: 'HORAS',    x: 412, width: 60  },
    ];

    y = pdfTableHeader(doc, y, cols);

    asistencias.forEach((a, i) => {
      if (y > 730) { pdfFooter(doc); doc.addPage(); y = 50; }
      y = pdfRow(doc, y, cols, [
        i + 1, fmtDate(a.fecha), a.turno || '—',
        a.check_in ? String(a.check_in).substring(11, 16) : '—',
        a.check_out ? String(a.check_out).substring(11, 16) : '—',
        calcHoras(a).toFixed(2) + ' h',
      ], i % 2 === 0);
    });

    // Total
    y += 12;
    doc.rect(50, y, doc.page.width - 100, 28).fill(PDF_BRAND.navy);
    doc.fillColor(PDF_BRAND.white).font('Helvetica-Bold').fontSize(12)
       .text(`TOTAL HORAS: ${totalHoras.toFixed(2)} h`, 0, y + 8, { align: 'center', width: doc.page.width });

    pdfFooter(doc);
    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Error al generar PDF', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ──────────────────────────────────────────────────────────────
// REPORTE CITAS DE HOY (legacy)
// ──────────────────────────────────────────────────────────────

const generateTodayAppointmentsReport = async (req, res) => {
  const { format = 'pdf' } = req.query;
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: rows, error } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado, servicio, notas')
      .eq('fecha', today)
      .order('hora', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener datos', code: 'DATABASE_ERROR', error: error.message });
    }

    const citas = rows || [];

    if (format === 'csv') {
      return sendCsv(res, `citas_hoy_${today}.csv`,
        ['#', 'Hora', 'Servicio', 'Estado', 'Notas'],
        citas.map((c, i) => [i + 1, c.hora || '—', c.servicio || 'Consulta', c.estado || '—', c.notas || ''])
      );
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="citas_hoy_${today}.pdf"`);
    doc.pipe(res);

    let y = buildPdfHeader(doc, 'CITAS DEL DÍA',
      `Fecha: ${fmtDate(today)}  ·  Total: ${citas.length} cita(s)`);
    y += 18;

    const cols = [
      { label: '#',        x: 55,  width: 22  },
      { label: 'HORA',     x: 82,  width: 60  },
      { label: 'SERVICIO', x: 147, width: 200 },
      { label: 'ESTADO',   x: 352, width: 100 },
    ];

    y = pdfTableHeader(doc, y, cols);

    citas.forEach((c, i) => {
      if (y > 730) { pdfFooter(doc); doc.addPage(); y = 50; }
      y = pdfRow(doc, y, cols, [
        i + 1, c.hora || '—', c.servicio || 'Consulta dental',
        (c.estado || '—').toUpperCase(),
      ], i % 2 === 0);
    });

    if (citas.length === 0) {
      doc.fillColor(PDF_BRAND.steel).font('Helvetica').fontSize(12)
         .text('No hay citas agendadas para hoy', 0, y + 30, { align: 'center', width: doc.page.width });
    }

    pdfFooter(doc);
    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Error al generar reporte', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  generateIncomeReport,
  generatePatientsReport,
  generateAppointmentsReport,
  generateAttendanceReport,
  generateAccumulatedHoursReport,
  generateTodayAppointmentsReport,
  generateFinancialReport,
};
