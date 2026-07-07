import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Supabase URL이 설정되지 않았습니다.");
  }

  if (!supabaseKey) {
    throw new Error("Supabase Key가 설정되지 않았습니다.");
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}