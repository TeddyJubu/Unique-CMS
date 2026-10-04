import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error("Database is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  }
  if (!client) client = createClient(url, serviceKey, { auth: { persistSession: false } });
  return client;
}
