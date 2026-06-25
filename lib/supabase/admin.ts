import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Service-role Supabase client. NEVER expose to the browser.
 * Use only inside `/app/api/**` route handlers for trusted writes.
 */
export function createAdminSupabase() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin client");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
