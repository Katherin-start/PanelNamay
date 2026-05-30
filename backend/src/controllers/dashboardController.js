const supabase = require('../config/supabase');

const formatCurrency = (value) => {
  const amount = parseFloat(value) || 0;
  return `$${amount.toFixed(2)}`;
};

// Normaliza nombres de rol: remueve diacríticos, espacios y pasa a mayúsculas
const normalizeRole = (raw) => {
  if (!raw) return '';
  try {
    return raw.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '').toUpperCase();
  } catch (e) {
    // Fallback simple
    return raw.toString().replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
  }
};

// 📊 DASHBOARD - Métricas y gráficos para administrador y odontólogo
const getDashboardMetrics = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error('getDashboardMetrics: req.user no está presente');
      return res.status(401).json({ message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
    }

    const currentUserId = req.user.id;
    const rawRole = req.user.rol || '';
    const userRole = normalizeRole(rawRole);
    console.log(`[DEBUG] getDashboardMetrics invoked by userId=${currentUserId}, roleRaw=${rawRole}, roleNorm=${userRole}`);
    const isOdontologo = userRole === 'ODONTOLOGO';
    const isRecepcionista = userRole === 'RECEPCIONISTA';
    const isPracticante = userRole === 'PRACTICANTE';
    const isCajero = userRole === 'CAJERO';
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const countPatientUsers = async () => {
      try {
        const { count, error } = await supabase
          .from('pacientes')
          .select('id', { count: 'exact', head: true });

        if (error) {
          console.log('Error al contar pacientes:', error);
          return 0;
        }

        console.log(`Total pacientes en tabla 'pacientes': ${count || 0}`);
        return count || 0;
      } catch (e) {
        console.log('Error en countPatientUsers:', e.message);
        return 0;
      }
    };

    const normalizeCitasRows = (rows = []) => (rows || []).map((cita) => ({
      ...cita,
      id_paciente: cita.id_paciente ?? cita.paciente_id,
      id_odontologo: cita.id_odontologo ?? cita.odontologo_id,
    }));

    const queryCitasForOdontologo = async (odontologoId, selectFields, applyFilters = (query) => query) => {
      const fieldSets = [
        {
          select: selectFields.map((field) => field
            .replace(/id_paciente/g, 'id_paciente')
            .replace(/id_odontologo/g, 'id_odontologo')).join(','),
          odontologoField: 'id_odontologo'
        },
        {
          select: selectFields.map((field) => field
            .replace(/id_paciente/g, 'paciente_id')
            .replace(/id_odontologo/g, 'odontologo_id')).join(','),
          odontologoField: 'odontologo_id'
        }
      ];

      for (const attempt of fieldSets) {
        try {
          let query = supabase.from('citas').select(attempt.select);
          query = query.eq(attempt.odontologoField, odontologoId);
          query = applyFilters(query);

          const { data, error } = await query;
          if (!error) {
            return { data: normalizeCitasRows(data || []), error: null };
          }

          console.log(`[DEBUG] queryCitasForOdontologo fallo con ${attempt.odontologoField}:`, error);
        } catch (e) {
          console.log(`[DEBUG] queryCitasForOdontologo excepción con ${attempt.odontologoField}:`, e.message);
        }
      }

      return { data: [], error: null };
    };

    const countOdontologoPacientes = async (odontologoId) => {
      try {
        console.log(`[DEBUG] Buscando pacientes para odontólogo: ${odontologoId}`);
        const { data: citas = [] } = await queryCitasForOdontologo(odontologoId, ['id_paciente']);

        if (!citas?.length) {
          console.log(`[DEBUG] No se encontraron citas para odontólogo ${odontologoId}, aplicando fallback a pacientes registrados`);
          return await countAllUsuariosPacientes();
        }

        console.log(`[DEBUG] Citas encontradas: ${citas.length}`);
        const pacientesUnicos = new Set(citas.map(c => c.id_paciente));
        console.log(`[DEBUG] Pacientes únicos del odontólogo ${odontologoId}: ${pacientesUnicos.size}`);
        return pacientesUnicos.size;
      } catch (e) {
        console.log('Error en countOdontologoPacientes:', e.message);
        return 0;
      }
    };

    const countAllUsuariosPacientes = async () => {
      try {
        const { data: usuarios = [], error } = await supabase
          .from('usuarios')
          .select('id, rol_id, roles:rol_id(id, nombre)');

        if (error) {
          console.log('Error al contar pacientes registrados desde usuarios:', error);
          return 0;
        }

        const pacientes = (usuarios || []).filter((usuario) => {
          const rolNombre = usuario.roles?.nombre || '';
          return /paciente|cliente/i.test(rolNombre) || usuario.rol_id == null;
        });

        console.log(`[DEBUG] Pacientes registrados en usuarios: ${pacientes.length}`);
        return pacientes.length;
      } catch (e) {
        console.log('Error en countAllUsuariosPacientes:', e.message);
        return 0;
      }
    };

    const countRecepcionistaPacientes = async () => {
      try {
        const countFromUsuarios = await countAllUsuariosPacientes();
        if (countFromUsuarios > 0) {
          console.log(`[DEBUG] Conteo de pacientes desde usuarios: ${countFromUsuarios}`);
          return countFromUsuarios;
        }

        console.log('[DEBUG] No hay pacientes registrados en usuarios, aplicando fallback a tabla pacientes');
        return await countPatientUsers();
      } catch (e) {
        console.log('Error en countRecepcionistaPacientes:', e.message);
        return 0;
      }
    };

    if (isOdontologo) {
      // Métricas específicas para odontólogo
      const [{ data: citasHoy = [] }, { data: tratamientosEnCurso = [] }, { data: citasAtendidas = [] }, { data: alertasControl = [] }] = await Promise.all([
        (async () => {
          const { data } = await queryCitasForOdontologo(currentUserId, ['id', 'fecha', 'hora', 'id_paciente', 'estado'], (query) =>
            query.eq('fecha', today).order('hora')
          );
          return { data };
        })(),

        supabase.from('tratamientos')
          .select('id, id_paciente, nombre, estado, fecha_inicio, fecha_fin, costo_total')
          .eq('id_odontologo', currentUserId)
          .eq('estado', 'en_curso')
          .order('fecha_inicio', { ascending: false }),

        (async () => {
          const { data } = await queryCitasForOdontologo(currentUserId, ['id_paciente'], (query) =>
            query.gte('fecha', thirtyDaysAgo.toISOString().split('T')[0]).in('estado', ['completada', 'atendida'])
          );
          return { data };
        })(),

        supabase.from('alertas_medicas')
          .select('id, paciente_id, tipo, titulo, descripcion, fecha_programada, prioridad, estado')
          .eq('estado', 'activa')
          .in('tipo', ['control', 'seguimiento'])
          .gte('fecha_programada', today)
          .lte(new Date(new Date().setDate(new Date().getDate() + 14)).toISOString())
          .order('fecha_programada', { ascending: true })
      ]);

      const pacientesAtendidos = new Set((citasAtendidas || []).map(cita => cita.id_paciente));
      const pacientesRequierenControl = (alertasControl || []).length;
      
      const pacientesEnTratamiento = new Set((tratamientosEnCurso || []).map(tratamiento => tratamiento.id_paciente));
      let totalPacientes = pacientesEnTratamiento.size;
      if (!totalPacientes) {
        console.log(`[ODONTOLOGO] No se encontraron pacientes en tratamiento activo, aplicando conteo por citas para odontólogo ${currentUserId}`);
        totalPacientes = await countOdontologoPacientes(currentUserId);
      }
      console.log(`[ODONTOLOGO] Resultado: ${totalPacientes} pacientes`);

      console.log(`[ODONTOLOGO] Pacientes atendidos: ${pacientesAtendidos.size}, Pacientes en tratamiento activo: ${pacientesEnTratamiento.size}, Total pacientes: ${totalPacientes}`);

      return res.json({
        code: 'DASHBOARD_SUCCESS',
        data: {
          pacientesAtendidos: pacientesAtendidos.size,
          totalPacientes,
          citasHoy: (citasHoy || []).length,
          tratamientosEnCurso: (tratamientosEnCurso || []).length,
          citasHoyDetalle: citasHoy || [],
          tratamientosEnCursoDetalle: tratamientosEnCurso || [],
          pacientesRequierenControl,
          alertasControl: alertasControl || [],
          resumen: {
            pacientesAtendidos: pacientesAtendidos.size,
            totalPacientes,
            citasHoy: (citasHoy || []).length,
            tratamientosEnCurso: (tratamientosEnCurso || []).length,
            pacientesRequierenControl
          }
        }
      });
    }

    if (isRecepcionista) {
      const [{ data: citasHoy = [] }, { data: pacientesReg = [] }, { data: odontologos = [] }, { data: pacienteEstados = [] }] = await Promise.all([
        supabase.from('citas')
          .select('id, fecha, hora, id_paciente, id_odontologo, estado, created_at')
          .eq('fecha', today)
          .order('hora'),

        supabase.from('usuarios')
          .select('id, nombre, correo, activo, creado_en, rol_id, roles:rol_id(id, nombre)')
          .order('creado_en', { ascending: false })
          .limit(20),

        supabase.from('usuarios')
          .select('id, nombre, rol_id, roles:rol_id(id, nombre)')
          .order('nombre', { ascending: true }),

        supabase.from('pacientes')
          .select('estado')
      ]);

      const citasPorOdontologo = {};
      const odontologoIds = new Set();
      citasHoy?.forEach(cita => {
        const odontologoId = cita.id_odontologo;
        odontologoIds.add(odontologoId);
        if (!citasPorOdontologo[odontologoId]) {
          citasPorOdontologo[odontologoId] = {
            odontologo_id: odontologoId,
            citas: [],
            total: 0
          };
        }
        citasPorOdontologo[odontologoId].citas.push(cita);
        citasPorOdontologo[odontologoId].total++;
      });

      const odontologosFiltrados = (odontologos || []).filter(o => (o.roles?.nombre || '').toUpperCase() === 'ODONTOLOGO' || false);
      const odontologoMap = new Map((odontologosFiltrados || []).map(o => [o.id, o]));
      const agendaPorOdontologo = Object.values(citasPorOdontologo).map(group => ({
        odontologo_id: group.odontologo_id,
        odontologo_nombre: odontologoMap.get(group.odontologo_id)?.nombre || 'Sin asignar',
        total: group.total,
        citas: group.citas
      }));

      const estadosPacientes = {};
      pacienteEstados?.forEach(item => {
        const estado = item.estado || 'desconocido';
        estadosPacientes[estado] = (estadosPacientes[estado] || 0) + 1;
      });

      const pacientesRegistrados = (pacientesReg || []).filter((usuario) => {
        const rolNombre = usuario.roles?.nombre || '';
        return /paciente|cliente/i.test(rolNombre) || usuario.rol_id == null;
      });
      
      console.log(`[RECEPCIONISTA] Llamando a countRecepcionistaPacientes`);
      const totalPacientes = await countRecepcionistaPacientes();
      console.log(`[RECEPCIONISTA] Resultado: ${totalPacientes} pacientes`);

      console.log(`[RECEPCIONISTA] Pacientes cargados: ${pacientesReg.length}, Filtrados: ${pacientesRegistrados.length}, Total por contador: ${totalPacientes}`);

      return res.json({
        code: 'DASHBOARD_SUCCESS',
        data: {
          citasHoy: (citasHoy || []).length,
          pacientesRegistradosRecientes: (pacientesRegistrados || []).slice(0, 20),
          totalPacientes,
          totalPacientesRegistrados: totalPacientes,
          agendaPorOdontologo,
          estadoPacientes: Object.entries(estadosPacientes).map(([estado, total]) => ({ estado, total })),
          resumen: {
            citasHoy: (citasHoy || []).length,
            totalPacientes,
            pacientesRegistrados: totalPacientes,
            odontologosActivos: agendaPorOdontologo.length
          }
        }
      });
    }

    if (isPracticante) {
      const [{ data: asistenciaHoy = null }, { count: diasAsistidos = 0 }, { data: turnosAsignados = [] }] = await Promise.all([
        supabase.from('asistencia_practicante')
          .select('id, fecha, turno, check_in, check_out, actividad, estado')
          .eq('practicante_id', currentUserId)
          .eq('fecha', today)
          .single(),

        supabase.from('asistencia_practicante')
          .select('id', { count: 'exact', head: true })
          .eq('practicante_id', currentUserId)
          .neq('check_in', null),

        supabase.from('asistencia_practicante')
          .select('id, fecha, turno, check_in, check_out, actividad, estado')
          .eq('practicante_id', currentUserId)
          .order('fecha', { ascending: false })
          .limit(30)
      ]);

      const horasTrabajadas = asistenciaHoy && asistenciaHoy.check_in && asistenciaHoy.check_out
        ? ((new Date(asistenciaHoy.check_out) - new Date(asistenciaHoy.check_in)) / 3600000)
        : 0;

      const actividadesDelDia = asistenciaHoy ? [{
        turno: asistenciaHoy.turno,
        actividad: asistenciaHoy.actividad,
        estado: asistenciaHoy.estado,
        check_in: asistenciaHoy.check_in,
        check_out: asistenciaHoy.check_out
      }] : [];

      return res.json({
        code: 'DASHBOARD_SUCCESS',
        data: {
          horasTrabajadas: Number(horasTrabajadas.toFixed(2)),
          diasAsistidos: diasAsistidos || 0,
          actividadesDelDia,
          turnosAsignados,
          resumen: {
            horasTrabajadas: Number(horasTrabajadas.toFixed(2)),
            diasAsistidos: diasAsistidos || 0,
            turnosAsignados: turnosAsignados.length
          }
        }
      });
    }

    if (isCajero) {
      const [
        pagosHoyRes,
        pagosRealizadosRes,
        pagosPendientesRes,
        tratamientosRes,
        pagosEfectuadosRes
      ] = await Promise.all([
        supabase.from('pagos')
          .select('id, fecha_pago, monto, estado, paciente_id, descripcion, metodo, referencia, factura_numero, boleta_numero, usuarios:paciente_id(nombre)')
          .eq('fecha_pago', today)
          .in('estado', ['pagado', 'completado'])
          .order('fecha_pago', { ascending: true }),
        supabase.from('pagos')
          .select('id, fecha_pago, monto, estado, paciente_id, descripcion, metodo, referencia, factura_numero, boleta_numero, usuarios:paciente_id(nombre)')
          .in('estado', ['pagado', 'completado'])
          .order('fecha_pago', { ascending: false })
          .limit(50),
        supabase.from('pagos')
          .select('id, fecha_pago, monto, estado, paciente_id, descripcion, metodo, referencia, usuarios:paciente_id(nombre)')
          .in('estado', ['pendiente', 'por_pagar', 'no_pagado', 'pendiente_pago'])
          .order('fecha_pago', { ascending: true })
          .limit(50),
        supabase.from('tratamientos')
          .select('id, paciente_id, nombre, estado, costo_total, saldo, abono, fecha_inicio, fecha_fin, usuarios:paciente_id(nombre, estado)')
          .in('estado', ['en_curso', 'pendiente'])
          .order('fecha_inicio', { ascending: false }),
        supabase.from('pagos')
          .select('paciente_id, monto, estado')
          .in('estado', ['pagado', 'completado'])
      ]);

      const pagosHoy = pagosHoyRes.data || [];
      const pagosRealizados = pagosRealizadosRes.data || [];
      const pagosPendientes = pagosPendientesRes.data || [];
      const tratamientosActivos = tratamientosRes.data || [];
      const pagosEfectuados = pagosEfectuadosRes.data || [];

      const pagosPorPaciente = pagosEfectuados.reduce((map, pago) => {
        const pacienteId = pago.paciente_id;
        const monto = parseFloat(pago.monto) || 0;
        map[pacienteId] = (map[pacienteId] || 0) + monto;
        return map;
      }, {});

      const pacientesConDeuda = tratamientosActivos.map(tratamiento => {
        const paciente = tratamiento.usuarios?.[0] || {};
        const costoTotal = parseFloat(tratamiento.costo_total || 0);
        const abono = parseFloat(tratamiento.abono || 0) || 0;
        const saldoTratamiento = tratamiento.saldo != null
          ? parseFloat(tratamiento.saldo || 0)
          : Math.max(0, costoTotal - abono);
        const pagadoPaciente = pagosPorPaciente[tratamiento.paciente_id] || 0;
        const deuda = Math.max(0, saldoTratamiento - pagadoPaciente);

        return {
          tratamiento_id: tratamiento.id,
          paciente_id: tratamiento.paciente_id,
          paciente_nombre: paciente.nombre || 'Paciente',
          estado: tratamiento.estado,
          tratamiento: tratamiento.nombre,
          fecha_inicio: tratamiento.fecha_inicio,
          fecha_fin: tratamiento.fecha_fin,
          costo_total: costoTotal,
          saldo: saldoTratamiento,
          pagado: pagadoPaciente,
          deuda,
          descripcion: tratamiento.descripcion || ''
        };
      }).filter(item => item.deuda > 0);

      const totalIngresosDia = pagosHoy.reduce((sum, pago) => sum + (parseFloat(pago.monto) || 0), 0);
      const totalPagosRealizados = pagosRealizados.length;
      const totalPagosPendientes = pagosPendientes.length;
      const totalDeuda = pacientesConDeuda.reduce((sum, item) => sum + item.deuda, 0);
      const totalTratamientosActivos = tratamientosActivos.length;

      return res.json({
        code: 'DASHBOARD_SUCCESS',
        data: {
          ingresosDia: totalIngresosDia,
          pagosRealizados: totalPagosRealizados,
          pagosPendientes: totalPagosPendientes,
          totalDeudaPacientes: totalDeuda,
          tratamientosActivos: totalTratamientosActivos,
          pagosHoyDetalle: pagosHoy,
          pagosRealizadosDetalle: pagosRealizados,
          pagosPendientesDetalle: pagosPendientes,
          pacientesConDeuda,
          resumen: {
            ingresosDia: totalIngresosDia,
            pagosRealizados: totalPagosRealizados,
            pagosPendientes: totalPagosPendientes,
            totalDeudaPacientes: totalDeuda
          }
        }
      });
    }

    // Métricas globales para administrador
    let pacientesPorDia = [];
    try {
      const { data: citasRecientes } = await supabase
        .from('citas')
        .select('fecha')
        .gte('fecha', thirtyDaysAgo.toISOString().split('T')[0]);

      const pacientesMap = {};
      citasRecientes?.forEach(cita => {
        const fecha = cita.fecha;
        pacientesMap[fecha] = (pacientesMap[fecha] || 0) + 1;
      });

      pacientesPorDia = Object.entries(pacientesMap).map(([fecha, total]) => ({
        fecha,
        total
      })).sort((a, b) => a.fecha.localeCompare(b.fecha));
    } catch (e) {
      console.log('Error en pacientes por día:', e.message);
    }

    let ingresosMensuales = {};
    try {
      const { data: ingresosPorMesData } = await supabase
        .from('pagos')
        .select('fecha_pago, monto')
        .gte('fecha_pago', sixMonthsAgo.toISOString().split('T')[0]);

      ingresosPorMesData?.forEach(pago => {
        const mes = pago.fecha_pago.substring(0, 7);
        ingresosMensuales[mes] = (ingresosMensuales[mes] || 0) + parseFloat(pago.monto || 0);
      });
    } catch (e) {
      console.log('Error en ingresos:', e.message);
    }

    let rendimientoOdontologo = [];
    try {
      const { data: citasOdontologo } = await supabase
        .from('citas')
        .select('id_odontologo')
        .gte('fecha', thirtyDaysAgo.toISOString().split('T')[0]);

      const rendimientoMap = {};
      citasOdontologo?.forEach(cita => {
        const id = cita.id_odontologo;
        if (!rendimientoMap[id]) {
          rendimientoMap[id] = { nombre: `Odontólogo ${id}`, citas_atendidas: 0 };
        }
        rendimientoMap[id].citas_atendidas++;
      });

      rendimientoOdontologo = Object.values(rendimientoMap)
        .sort((a, b) => b.citas_atendidas - a.citas_atendidas);
    } catch (e) {
      console.log('Error en rendimiento:', e.message);
    }

    let estadoClinica = [];
    try {
      const { data: pacientes } = await supabase
        .from('pacientes')
        .select('estado');

      const estadoMap = {};
      pacientes?.forEach(paciente => {
        const estado = paciente.estado || 'activo';
        estadoMap[estado] = (estadoMap[estado] || 0) + 1;
      });

      estadoClinica = Object.entries(estadoMap).map(([estado, total]) => ({
        estado,
        total
      }));
    } catch (e) {
      console.log('Error en estado clínica:', e.message);
    }

    let totalPacientesCount = 0;
    try {
      const { data: usuarios = [], error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, rol_id, roles:rol_id(id, nombre)');

      if (usuariosError) {
        throw usuariosError;
      }

      totalPacientesCount = (usuarios || []).filter((usuario) => {
        const rolNombre = usuario.roles?.nombre || '';
        return /paciente|cliente/i.test(rolNombre) || usuario.rol_id == null;
      }).length;
    } catch (e) {
      console.log('Error en conteo de pacientes por usuario/rol:', e.message);
    }

    let citasHoy = [];
    try {
      const { data: citas } = await supabase
        .from('citas')
        .select('hora, id_paciente, estado')
        .eq('fecha', today)
        .order('hora');

      citasHoy = citas || [];
    } catch (e) {
      console.log('Error en citas hoy:', e.message);
    }

    res.json({
      code: 'DASHBOARD_SUCCESS',
      data: {
        pacientesPorDia,
        ingresosPorMes: ingresosMensuales,
        rendimientoOdontologo,
        estadoClinica,
        citasHoy,
        totalPacientes: totalPacientesCount,
        resumen: {
          totalPacientes: totalPacientesCount,
          citasHoy: citasHoy.length,
          ingresosMesActual: ingresosMensuales[new Date().toISOString().substring(0, 7)] || 0
        }
      }
    });
  } catch (err) {
    console.error('Error general:', err);
    console.error(err.stack);
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      stack: err.stack,
      code: 'SERVER_ERROR'
    });
  }
};

// 🔔 NOTIFICACIONES - Alertas tipo WhatsApp
const getNotifications = async (req, res) => {
  try {
    const notifications = [];
    const currentUserId = req.user.id;
    const userRole = normalizeRole(req.user.rol);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: nuevosMensajes } = await supabase
      .from('mensajes')
      .select('id, mensaje, fecha, id_usuario, id_conversacion')
      .gte('fecha', yesterday.toISOString())
      .order('fecha', { ascending: false })
      .limit(40);

    nuevosMensajes?.forEach((msg) => {
      if (msg.id_usuario === currentUserId) {
        return;
      }

      notifications.push({
        id: `msg_${msg.id}`,
        type: 'chat',
        title: 'Nuevo mensaje',
        message: `Mensaje reciente: ${msg.mensaje.substring(0, 50)}...`,
        timestamp: msg.fecha,
        priority: 'medium',
      });
    });

    const { data: nuevasCitas } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado, id_paciente, id_odontologo, created_at, updated_at')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(30);

    nuevasCitas?.forEach(cita => {
      notifications.push({
        id: `cita_new_${cita.id}`,
        type: 'appointment',
        title: 'Nueva cita agendada',
        message: `Cita para ${cita.fecha} ${cita.hora} (${cita.estado})`,
        timestamp: cita.created_at,
        priority: 'high'
      });
    });

    const { data: citasCanceladas } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado, id_paciente, id_odontologo, updated_at')
      .eq('estado', 'cancelado')
      .gte('updated_at', yesterday.toISOString())
      .order('updated_at', { ascending: false })
      .limit(30);

    citasCanceladas?.forEach(cita => {
      notifications.push({
        id: `cita_cancel_${cita.id}`,
        type: 'appointment',
        title: 'Cita cancelada',
        message: `Cita cancelada para ${cita.fecha} ${cita.hora}`,
        timestamp: cita.updated_at,
        priority: 'high'
      });
    });

    const { data: cambiosCitas } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado, id_paciente, id_odontologo, updated_at')
      .neq('estado', 'cancelado')
      .gte('updated_at', yesterday.toISOString())
      .order('updated_at', { ascending: false })
      .limit(30);

    cambiosCitas?.forEach(cita => {
      notifications.push({
        id: `cita_update_${cita.id}`,
        type: 'appointment',
        title: 'Cambio en cita',
        message: `Cita modificada para ${cita.fecha} ${cita.hora} (${cita.estado})`,
        timestamp: cita.updated_at,
        priority: 'medium'
      });
    });

    if (userRole === 'RECEPCIONISTA') {
      const { data: nuevosPacientes } = await supabase
        .from('pacientes')
        .select('id, nombre, created_at')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      nuevosPacientes?.forEach(paciente => {
        notifications.push({
          id: `paciente_${paciente.id}`,
          type: 'patient',
          title: 'Nuevo paciente registrado',
          message: `${paciente.nombre} se registró en el sistema`,
          timestamp: paciente.created_at,
          priority: 'low'
        });
      });
    }

    if (userRole === 'PRACTICANTE') {
      const { data: asistenciaHoy } = await supabase
        .from('asistencia_practicante')
        .select('id, fecha, turno, check_in, check_out, actividad, estado')
        .eq('practicante_id', currentUserId)
        .eq('fecha', new Date().toISOString().split('T')[0])
        .single();

      const horaActual = new Date();
      if (asistenciaHoy) {
        if (!asistenciaHoy.check_in) {
          notifications.push({
            id: `reminder_checkin_${asistenciaHoy.id}`,
            type: 'attendance',
            title: 'Recordatorio de ingreso',
            message: `Marca entrada para tu turno de hoy (${asistenciaHoy.turno || 'sin turno asignado'})`,
            timestamp: new Date().toISOString(),
            priority: 'high'
          });
        }
        if (asistenciaHoy.check_in && !asistenciaHoy.check_out) {
          notifications.push({
            id: `reminder_checkout_${asistenciaHoy.id}`,
            type: 'attendance',
            title: 'Recordatorio de salida',
            message: 'No olvides registrar tu salida al finalizar tu turno.',
            timestamp: new Date().toISOString(),
            priority: 'medium'
          });
        }
      }
    }

    if (userRole === 'CAJERO') {
      const { data: pagosPendientes } = await supabase
        .from('pagos')
        .select('id, fecha_pago, monto, paciente_id, usuarios:paciente_id(nombre)')
        .in('estado', ['pendiente', 'por_pagar', 'no_pagado', 'pendiente_pago'])
        .lte('fecha_pago', new Date().toISOString().split('T')[0])
        .order('fecha_pago', { ascending: true })
        .limit(40);

      pagosPendientes?.forEach(pago => {
        notifications.push({
          id: `payment_pending_${pago.id}`,
          type: 'payment',
          title: 'Pago pendiente',
          message: `Pago pendiente de ${pago.usuarios?.nombre || pago.paciente_id} por $${parseFloat(pago.monto || 0).toFixed(2)}`,
          timestamp: new Date().toISOString(),
          priority: 'high'
        });
      });
    }

    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      code: 'NOTIFICATIONS_SUCCESS',
      notifications: notifications.slice(0, 50)
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error al obtener notificaciones',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

// 📌 ALERTAS DE CITAS - Próximas y no atendidas
const getAppointmentAlerts = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const isOdontologo = normalizeRole(req.user.rol) === 'ODONTOLOGO';
    const today = new Date().toISOString().split('T')[0];

    let citasProximas = [];
    try {
      let query = supabase
        .from('citas')
        .select('id, fecha, hora, id_paciente, estado, id_odontologo')
        .eq('fecha', today)
        .in('estado', ['programada', 'confirmada'])
        .order('hora');

      if (isOdontologo) {
        query = query.eq('id_odontologo', currentUserId);
      }

      const { data: citas } = await query;
      citasProximas = citas || [];
    } catch (e) {
      console.log('Error en citas próximas:', e.message);
    }

    let citasNoAtendidas = [];
    try {
      let query = supabase
        .from('citas')
        .select('id, fecha, hora, id_paciente, estado, id_odontologo')
        .lt('fecha', today)
        .in('estado', ['programada', 'confirmada'])
        .order('fecha', { ascending: false })
        .limit(20);

      if (isOdontologo) {
        query = query.eq('id_odontologo', currentUserId);
      }

      const { data: citas } = await query;
      citasNoAtendidas = citas || [];
    } catch (e) {
      console.log('Error en citas no atendidas:', e.message);
    }

    res.json({
      code: 'APPOINTMENT_ALERTS_SUCCESS',
      data: {
        citasProximas,
        citasNoAtendidas,
        resumen: {
          proximasHoy: citasProximas.length,
          noAtendidas: citasNoAtendidas.length
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

// 🔔 RECORDATORIOS DE SEGUIMIENTO
const getFollowUpReminders = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: reminders, error } = await supabase
      .from('alertas_medicas')
      .select('id, tipo, titulo, descripcion, fecha_programada, prioridad, paciente_id, estado')
      .eq('estado', 'activa')
      .in('tipo', ['seguimiento', 'control', 'recordatorio'])
      .gte('fecha_programada', today)
      .lte(nextWeek.toISOString())
      .order('fecha_programada', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener recordatorios', code: 'FOLLOWUP_ERROR' });
    }

    const urgent = reminders?.filter(r => r.prioridad === 'urgente' || r.prioridad === 'alta') || [];
    const normal = reminders?.filter(r => r.prioridad === 'media') || [];
    const low = reminders?.filter(r => r.prioridad === 'baja') || [];

    res.json({
      code: 'FOLLOWUPS_SUCCESS',
      reminders: {
        urgent,
        normal,
        low,
        all: reminders || []
      },
      summary: {
        total: reminders?.length || 0,
        urgent: urgent.length,
        normal: normal.length,
        low: low.length
      }
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const getAttendanceAlerts = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: asistenciaHoy, error: asistenciaError } = await supabase
      .from('asistencia_practicante')
      .select('id, fecha, turno, check_in, check_out, actividad, estado')
      .eq('practicante_id', currentUserId)
      .eq('fecha', today)
      .single();

    if (asistenciaError) {
      return res.status(500).json({ message: 'Error al obtener asistencia', error: asistenciaError.message, code: 'ATTENDANCE_ERROR' });
    }

    const alerts = [];
    if (!asistenciaHoy || !asistenciaHoy.check_in) {
      alerts.push({
        id: `alert_checkin_${today}`,
        type: 'checkin',
        title: 'Hora de ingreso',
        message: 'Marca tu entrada y comienza tu turno.',
        fecha: today,
        priority: 'high'
      });
    }
    if (asistenciaHoy && asistenciaHoy.check_in && !asistenciaHoy.check_out) {
      alerts.push({
        id: `alert_checkout_${today}`,
        type: 'checkout',
        title: 'Hora de salida',
        message: 'Recuerda registrar tu salida al finalizar el turno.',
        fecha: today,
        priority: 'medium'
      });
    }

    const { data: turnosAsignados = [] } = await supabase
      .from('turnos_practicantes')
      .select('id, nombre, hora_inicio, hora_fin, descripcion')
      .order('hora_inicio', { ascending: true });

    res.json({
      code: 'ATTENDANCE_ALERTS_SUCCESS',
      data: {
        alerts,
        turnosAsignados,
        asistenciaHoy: asistenciaHoy || null,
        resumen: {
          totalAlerts: alerts.length,
          turnosAsignados: turnosAsignados.length
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error al obtener alertas de asistencia',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  getDashboardMetrics,
  getNotifications,
  getAppointmentAlerts,
  getFollowUpReminders,
  getAttendanceAlerts,
};
