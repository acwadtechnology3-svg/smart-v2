import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

// Ensure we are using the Service Role Key for backend operations
if (!process.env.SUPABASE_SERVICE_KEY) {
    console.warn("WARNING: Using Anon Key. RLS policies might block backend operations. Please add SUPABASE_SERVICE_KEY to .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
