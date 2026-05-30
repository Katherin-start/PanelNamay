const supabase = require('../config/supabase');

const initializeStorage = async (req, res) => {
  try {
    console.log('🔧 Inicializando Storage de Supabase...');
    
    const bucketName = 'chat-files';
    
    // Intentar obtener el bucket
    const { data: bucketData, error: getBucketError } = await supabase.storage.getBucket(bucketName);

    if (bucketData) {
      // El bucket ya existe
      console.log(`✅ Bucket ${bucketName} ya existe`);
      return res.json({ 
        code: 'SUCCESS',
        message: `Bucket ${bucketName} ya existe`,
        bucket: bucketData,
      });
    }

    // Si no existe o hubo un error, intentar crear el bucket de todas formas
    console.log(`📦 Bucket ${bucketName} no encontrado (detalle: ${getBucketError?.message || 'sin detalle'}). Intentando crearlo...`);

    const { data: createdBucket, error: createError } = await supabase.storage.createBucket(
      bucketName,
      { 
        public: true,
        fileSizeLimit: 20 * 1024 * 1024, // 20 MB
      }
    );

    if (createError) {
      console.error(`❌ Error al crear bucket: ${createError.message}`, createError);
      return res.status(500).json({
        code: 'BUCKET_CREATE_ERROR',
        message: `Error al crear bucket: ${createError.message}`,
        error: createError,
      });
    }

    console.log(`✅ Bucket ${bucketName} creado exitosamente`);
    return res.json({
      code: 'BUCKET_CREATED',
      message: `Bucket ${bucketName} creado exitosamente`,
      bucket: createdBucket,
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

    res.json({
      code: 'HEALTH_OK',
      message: 'Sistema operativo',
      database: 'conectado',
      storage: {
        conectado: true,
        buckets: buckets?.map(b => ({ name: b.name, public: b.public })) || [],
        chatFilesExiste: !!chatBucket,
        chatFilesPublico: chatBucket?.public ?? false,
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
