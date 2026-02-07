import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Simple validation to prevent crashes if env vars are missing/invalid
const isValidUrl = (url: string) => {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};

// Singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
    if (supabaseInstance) return supabaseInstance;

    if (!isValidUrl(supabaseUrl) || !supabaseKey) {
        console.warn('Supabase credentials missing or invalid. Please check .env.local');
        return null;
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
};
