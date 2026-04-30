'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@/types';
import { apiClient } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiClient.getUsers();
        setUsers(data);
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de usuarios del sistema
          </p>
        </div>
        {/* Aquí puedes agregar un botón para crear nuevo usuario */}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle className="text-lg">{user.nombre}</CardTitle>
              <CardDescription>
                {user.email} • {user.rol}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p>Estado: <span className={`font-medium ${user.estado === 'activo' ? 'text-green-600' : 'text-red-600'}`}>
                  {user.estado}
                </span></p>
                <p>Registrado: {new Date(user.creado_en).toLocaleDateString()}</p>
                <p>Último acceso: {user.ultimo_acceso ? new Date(user.ultimo_acceso).toLocaleDateString() : 'Nunca'}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}