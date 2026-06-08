'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  TagIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

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
  const [isError, setIsError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (!form.nombre || !form.tipo || !form.valor || !form.fecha_inicio || !form.fecha_fin) {
      setMessage('Faltan campos obligatorios');
      setIsError(true);
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
      setIsError(false);
      setForm({ nombre: '', descripcion: '', tipo: 'porcentaje', valor: '', fecha_inicio: '', fecha_fin: '', aplica_a: 'TODOS' });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage(err?.message ?? 'Error al crear la solicitud');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {message && (
          <div className={`flex items-center gap-2 p-3 text-sm font-medium animate-fade-in ${
            isError
              ? 'text-danger-700 bg-danger-50 border-l-2 border-danger-500'
              : 'text-success-700 bg-success-50 border-l-2 border-success-500'
          }`}>
            {isError ? (
              <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
            )}
            {message}
          </div>
        )}

        <div>
          <label className="label-base">Nombre <span className="text-namay-coral">*</span></label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: Descuento de limpieza dental"
            className="input-underline"
            required
          />
        </div>

        <div>
          <label className="label-base">Descripción</label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            rows={2}
            placeholder="Describe brevemente el descuento..."
            className="input-underline resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label-base">Tipo <span className="text-namay-coral">*</span></label>
            <select name="tipo" value={form.tipo} onChange={handleChange} className="input-underline bg-white">
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto">Monto fijo (S/.)</option>
            </select>
          </div>
          <div>
            <label className="label-base">Valor <span className="text-namay-coral">*</span></label>
            <div className="relative">
              <CurrencyDollarIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                name="valor"
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={handleChange}
                placeholder="0.00"
                className="input-underline pl-6 tabular"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label-base">Fecha inicio <span className="text-namay-coral">*</span></label>
            <div className="relative">
              <CalendarIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                name="fecha_inicio"
                type="date"
                value={form.fecha_inicio}
                onChange={handleChange}
                className="input-underline pl-6"
                required
              />
            </div>
          </div>
          <div>
            <label className="label-base">Fecha fin <span className="text-namay-coral">*</span></label>
            <div className="relative">
              <CalendarIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                name="fecha_fin"
                type="date"
                value={form.fecha_fin}
                onChange={handleChange}
                className="input-underline pl-6"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label-base">Aplica a</label>
          <input
            name="aplica_a"
            value={form.aplica_a}
            onChange={handleChange}
            placeholder="TODOS, CAJERO, ODONTOLOGO..."
            className="input-underline uppercase tracking-wide"
          />
          <p className="text-[11px] text-namay-steel/60 font-medium mt-2">
            Escribe <code className="px-1.5 py-0.5 bg-namay-cream text-namay-navy font-mono text-[10px]">TODOS</code> o lista roles separados por coma (EJ: CAJERO, RECEPCIONISTA)
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Enviando...
              </>
            ) : (
              'Enviar solicitud'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
