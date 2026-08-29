import { createClient } from "@supabase/supabase-js";

// Server-side client using the service role key (never expose this to the browser)
export function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
