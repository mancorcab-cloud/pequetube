import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Falten les variables VITE_SUPABASE_URL i VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY al fitxer .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
