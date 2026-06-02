const supabase = require('../config/supabase');

const initializeStorage = async (req, res) => {
  try {
    console.log('🔧 Inicializando Storage de Supabase...');
    
    const bucketsToCreate = [
      { name: 'chat-files', size: 20 * 1024 * 1024 }, // 20 MB
      { name: 'profile-photos', size: 5 * 1024 * 1024 } // 5 MB
    ];

    const results = [];

    for (const bucket of bucketsToCreate) {
      try {
        // Intentar obtener el bucket
        const { data: bucketData, error: getBucketError } = await supabase.storage.getBucket(bucket.name);

        if (bucketData) {
          // El bucket ya existe
          console.log(`✅ Bucket ${bucket.name} ya existe`);
          results.push({
            name: bucket.name,
            status: 'exists',
            message: `Bucket ${bucket.name} ya existe`
          });
          continue;
        }

        // Si no existe, crear el bucket
        console.log(`📦 Creando bucket ${bucket.name}...`);

        const { data: createdBucket, error: createError } = await supabase.storage.createBucket(
          bucket.name,
          { 
            public: true,
            fileSizeLimit: bucket.size,
          }
        );

        if (createError) {
          console.error(`❌ Error al crear bucket ${bucket.name}: ${createError.message}`);
          results.push({
            name: bucket.name,
            status: 'error',
            message: `Error al crear: ${createError.message}`
          });
          continue;
        }

        console.log(`✅ Bucket ${bucket.name} creado exitosamente`);
        results.push({
          name: bucket.name,
          status: 'created',
          message: `Bucket ${bucket.name} creado exitosamente`
        });
      } catch (err) {
        console.error(`❌ Error procesando bucket ${bucket.name}:`, err);
        results.push({
          name: bucket.name,
          status: 'error',
          message: err.message
        });
      }
    }

    return res.json({
      code: 'STORAGE_INITIALIZED',
      message: 'Inicialización de storage completada',
      results
    });

  } catch (err) {
    console.error('❌ Error en initializeStorage:', err);
    res.status(500).json({
      code: 'INIT_ERROR',
      message: 'Error al inicializar storage',
      error: err.message,
    });
  }
};

const healthCheck = async (req, res) => {
  try {
    // Verificar conexión a Supabase
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    // Verificar buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      throw bucketsError;
    }

    const chatBucket = buckets?.find(b => b.name === 'chat-files');
    const profileBucket = buckets?.find(b => b.name === 'profile-photos');

    res.json({
      code: 'HEALTH_OK',
      message: 'Sistema operativo',
      database: 'conectado',
      storage: {
        conectado: true,
        buckets: buckets?.map(b => ({ name: b.name, public: b.public })) || [],
        chatFilesExiste: !!chatBucket,
        chatFilesPublico: chatBucket?.public ?? false,
        profilePhotosExiste: !!profileBucket,
        profilePhotosPublico: profileBucket?.public ?? false,
      },
    });
  } catch (err) {
    console.error('❌ Error en healthCheck:', err);
    res.status(500).json({
      code: 'HEALTH_ERROR',
      message: 'Error en verificación de salud',
      error: err.message,
    });
  }
};

module.exports = {
  initializeStorage,
  healthCheck,
};
