import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://sxadrmfixlzsettqjntf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YWRybWZpeGx6c2V0dHFqbnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4OTU1NTgsImV4cCI6MjA4NTQ3MTU1OH0.25-kz7e05U_zvr0WuSs54lgOTJfD6C-gADIIdqQ_Qvs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
