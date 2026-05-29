const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or key no está configurado. Verifica .env en backend/');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
