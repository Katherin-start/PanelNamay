"use client";

import CreateDiscountForm from '@/components/discounts/CreateDiscountForm';
import AdminRequests from '@/components/discounts/AdminRequests';
import MyRequests from '@/components/discounts/MyRequests';
import { useAuth } from '@/context/AuthContext';

export default function DescuentosPage() {
  const { user } = useAuth();

  return (
    <div className="px-4 py-4 md:px-6 md:py-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {user?.rol === 'RECEPCIONISTA' && (
          <>
            <CreateDiscountForm />
            <div className="mt-4">
              {/* Lista de solicitudes del propio usuario */}
              {/* @ts-ignore */}
              <MyRequests />
            </div>
          </>
        )}
        {user?.rol === 'ADMINISTRADOR' && <AdminRequests />}
        {(!user || (user.rol !== 'RECEPCIONISTA' && user.rol !== 'ADMINISTRADOR')) && (
          <p>No tienes acceso a esta sección.</p>
        )}
      </div>
    </div>
  );
}
