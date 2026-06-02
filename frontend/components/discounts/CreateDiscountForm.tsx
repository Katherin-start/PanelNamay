'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

type Props = {
  className?: string;
  onSuccess?: () => void;
};

export default function CreateDiscountForm({ className, onSuccess }: Props) {
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'porcentaje',
    valor: '',
    fecha_inicio: '',
    fecha_fin: '',
    aplica_a: 'TODOS',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!form.nombre || !form.tipo || !form.valor || !form.fecha_inicio || !form.fecha_fin) {
      setMessage('Faltan campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        tipo: form.tipo,
        valor: Number(form.valor),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        aplica_a: form.aplica_a,
        estado: 'pendiente',
      };
      await apiClient.createDiscount(payload);
      setMessage('Solicitud de descuento enviada al administrador');
      setForm({ nombre: '', descripcion: '', tipo: 'porcentaje', valor: '', fecha_inicio: '', fecha_fin: '', aplica_a: 'TODOS' });
    } catch (err: any) {
      setMessage(err?.message ?? 'Error al crear la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className ?? 'max-w-xl bg-white p-6 rounded-lg shadow'}>
      <h3 className="text-lg font-semibold mb-4">Crear solicitud de descuento</h3>
      {/* Aplica a movido arriba y estilizado */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-slate-600 uppercase">Aplica a</label>
        <input
          name="aplica_a"
          value={form.aplica_a}
          onChange={handleChange}
          className="mt-1 block w-full border rounded px-3 py-2 bg-blue-50 text-sm uppercase"
        />
        <p className="text-xs text-gray-500 mt-1">Escribe 'TODOS' o lista roles separados por coma (EJ: CAJERO)</p>
      </div>
      {message && <div className="mb-3 text-sm text-gray-700">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre</label>
          <input name="nombre" value={form.nombre} onChange={handleChange} className="mt-1 block w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} className="mt-1 block w-full border rounded px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select name="tipo" value={form.tipo} onChange={handleChange} className="mt-1 block w-full border rounded px-3 py-2">
              <option value="porcentaje">Porcentaje</option>
              <option value="monto">Monto fijo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Valor</label>
            <input name="valor" type="number" min="0" step="0.01" value={form.valor} onChange={handleChange} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha inicio</label>
            <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha fin</label>
            <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
        </div>
        {/* 'Aplica a' moved above */}
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </div>
  );
}
