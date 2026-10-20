import { createClient } from '@supabase/supabase-js';

// Mesma conexão do farolfinance.html (chave anon, política farol_anon_all).
// Na Vercel dá para sobrescrever com VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://brdfotmskbhfomtehbsj.supabase.co';
const KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGZvdG1za2JoZm9tdGVoYnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzA2NjYsImV4cCI6MjA5NjMwNjY2Nn0.-ffGBSMYbvck2Zx5KbuTqdPFTXrdrzQIH4F_zApIAP0';

export const sb = createClient(URL, KEY);
