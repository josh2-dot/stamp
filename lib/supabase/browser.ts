import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser/client-component Supabase client. Anon key + RLS.
 *
 * IMPORTANT: must use createBrowserClient from @supabase/ssr, not the vanilla
 * createClient from @supabase/supabase-js. The vanilla client stores sessions
 * in localStorage by default — which the server-side middleware (which reads
 * cookies) can't see. Result: sign-in appears to succeed, but middleware
 * treats every subsequent request as unauthenticated and bounces the user
 * back to /login.
 *
 * @supabase/ssr's createBrowserClient writes the session to cookies via
 * document.cookie, matching what createServerClient reads via next/headers.
 * Both sides stay in sync without any extra wiring.
 *
 * Safe to import from "use client" components.
 */
export function createBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
