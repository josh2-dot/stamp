import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser/client-component Supabase client. Anon key + RLS.
 * Safe to import from "use client" components.
 */
export function createBrowserSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true },
  });
}
