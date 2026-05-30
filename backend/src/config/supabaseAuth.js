const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error('Supabase URL or anon key no está configurado. Verifica .env en backend/');
}

const supabaseAuth = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = supabaseAuth;
