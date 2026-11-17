import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Creates a Supabase client for browser-side execution.
 * Utilizes public publishable key and adheres to Row Level Security.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase browser environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
