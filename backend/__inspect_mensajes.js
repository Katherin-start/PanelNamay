const supabase = require('./src/config/supabase');

(async () => {
  try {
    const { data, error } = await supabase.from('mensajes').select('*').limit(1);
    console.log(JSON.stringify({ data, error }, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
