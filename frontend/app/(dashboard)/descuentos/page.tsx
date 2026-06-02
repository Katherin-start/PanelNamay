"use client";

import CreateDiscountForm from '@/components/discounts/CreateDiscountForm';
import AdminRequests from '@/components/discounts/AdminRequests';
import MyRequests from '@/components/discounts/MyRequests';
import { useAuth } from '@/context/AuthContext';

export default function DescuentosPage() {
  const { user } = useAuth();

  return (
    <div className="px-4 py-4 md:px-6 md:py-4">
      <div className="mx-auto max-w-6xl">
        {user?.rol === 'RECEPCIONISTA' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Nueva solicitud de descuento</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">Crea una nueva solicitud</h3>
                <p className="mt-1 text-sm text-slate-500">Selecciona los parámetros y envía la solicitud al administrador.</p>
              </div>
              <CreateDiscountForm className="bg-white p-0 shadow-none" />
            </div>

            <div>
              {/* Lista de solicitudes del propio usuario */}
              {/* @ts-ignore */}
              <MyRequests />
            </div>
          </div>
        )}
        {user?.rol === 'ADMINISTRADOR' && <AdminRequests />}
        {(!user || (user.rol !== 'RECEPCIONISTA' && user.rol !== 'ADMINISTRADOR')) && (
          <p>No tienes acceso a esta sección.</p>
        )}
      </div>
    </div>
  );
}
