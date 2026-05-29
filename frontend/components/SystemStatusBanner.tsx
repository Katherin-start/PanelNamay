'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export default function SystemStatusBanner() {
  const [status, setStatus] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const health = await apiClient.getHealthCheck();
        setStatus(health);

        // Mostrar banner si hay problemas
        if (health.code === 'HEALTH_ERROR' || !health.storage?.chatFilesExiste) {
          setShowBanner(true);
        }
      } catch (error) {
        console.error('Error checking system status:', error);
      }
    };

    checkStatus();
    // Verificar cada minuto
    const interval = setInterval(checkStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!showBanner || !status) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg z-50">
      <div className="flex gap-3">
        <div className="flex-shrink-0 text-yellow-600">
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800">
            ⚠️ Problema de Configuración
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            {!status.storage?.chatFilesExiste
              ? '📦 Configurando bucket de almacenamiento...'
              : 'El sistema está intentando reconectarse.'}
          </p>
          <button
            onClick={async () => {
              await apiClient.initializeStorage();
              setShowBanner(false);
            }}
            className="text-sm font-medium text-yellow-600 hover:text-yellow-700 mt-2 underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
