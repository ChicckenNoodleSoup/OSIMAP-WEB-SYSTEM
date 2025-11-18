import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

// Create a single Supabase client instance for the entire application
// This prevents multiple GoTrueClient instances and ensures consistent auth state
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

