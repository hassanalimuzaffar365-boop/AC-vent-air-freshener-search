import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client, used only inside /api serverless functions.
 * Uses the service_role key (not the public anon key) because these
 * functions run on the server, never in the browser — the key stays
 * private as a Vercel environment variable.
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createClient(url, serviceKey);
}
