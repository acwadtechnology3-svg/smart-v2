import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || 'https://sxadrmfixlzsettqjntf.supabase.co'
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YWRybWZpeGx6c2V0dHFqbnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4OTU1NTgsImV4cCI6MjA4NTQ3MTU1OH0.25-kz7e05U_zvr0WuSs54lgOTJfD6C-gADIIdqQ_Qvs'

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (first 50 chars):', supabaseAnonKey.substring(0, 50));

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
    global: {
        headers: {
            'x-client-info': 'smartline-mobile-app',
        },
    },
})

console.log('✅ Supabase client initialized with Realtime enabled');
