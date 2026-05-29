import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

/**
 * Hook que inicializa la configuración de Supabase Storage
 * Se ejecuta una sola vez al cargar la aplicación
 */
export function useInitializeStorage() {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;

    const initialize = async () => {
      try {
        console.log('🔧 Inicializando Supabase Storage...');
        const result = await apiClient.initializeStorage();
        console.log('✅ Storage inicializado:', result.message);
        hasInitialized.current = true;
      } catch (error) {
        console.error('⚠️ Error al inicializar Storage:', error);
        // Reintentar en 5 segundos
        setTimeout(initialize, 5000);
      }
    };

    initialize();
  }, []);
}

/**
 * Hook para verificar la salud del sistema
 */
export function useHealthCheck() {
  const [health, setHealth] = useRef({
    database: 'unknown',
    storage: 'unknown',
    chatFilesExiste: false,
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const result = await apiClient.getHealthCheck();
        setHealth.current = {
          database: result.database || 'unknown',
          storage: result.storage?.conectado ? 'ok' : 'error',
          chatFilesExiste: result.storage?.chatFilesExiste ?? false,
        };
      } catch (error) {
        console.error('Error en health check:', error);
      }
    };

    checkHealth();
    // Verificar cada 30 segundos
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return health.current;
}
