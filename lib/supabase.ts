import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// createBrowserClient stocke la session via les cookies du navigateur
// (et non localStorage), afin que le proxy serveur (proxy.ts) et les
// Route Handlers puissent lire la même session côté serveur.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)