import { createClient } from '@supabase/supabase-js'

// Kuhaon niya ang URL ug Key gikan sa imong .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Maghimo siya og client (connection) nga pwede nimo gamiton sa tibuok project
export const supabase = createClient(supabaseUrl, supabaseAnonKey)