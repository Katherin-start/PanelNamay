'use client';

import { useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';

/**
 * Hook para inicializar el storage (no-op, mantenido por compatibilidad).
 */
export function useInitializeStorage() {
  useEffect(() => {
    // Hook de compatibilidad; la inicialización real la hace el backend.
  }, []);
}

/**
 * Hook para verificar la salud del sistema
 */
export function useHealthCheck() {
  const healthRef = useRef({
    database: 'unknown',
    storage: 'unknown',
    chatFilesExiste: false,
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const result = await apiClient.getHealthCheck();
        healthRef.current = {
          database: result.database || 'unknown',
          storage: result.storage?.conectado ? 'ok' : 'error',
          chatFilesExiste: result.storage?.chatFilesExiste ?? false,
        };
      } catch (error) {
        console.error('Error en health check:', error);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return healthRef.current;
}
