import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://hvmhbwhshzbmkgwdznji.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bWhid2hzaHpibWtnd2R6bmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODk4NTAsImV4cCI6MjEwNTE2NTg1MH0.4crdwa5GfTM441gyIIZPydm9B2Y-YzAS-g2Q18C1yrI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
