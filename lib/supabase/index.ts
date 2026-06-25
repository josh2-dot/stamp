// Re-export each client from its own file. Importing from a specific path
// (e.g. "@/lib/supabase/browser") is preferred so the bundler can't accidentally
// pull server-only code into client bundles.
export { createBrowserSupabase } from "./browser";
export { createServerSupabase } from "./server";
export { createAdminSupabase } from "./admin";
