import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Null sampai .env.local diisi — halaman yang pakai harus handle null. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
