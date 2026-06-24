import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const isValidUrl = (s: string) => { try { new URL(s); return true } catch { return false } }

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}
if (!isValidUrl(url)) {
  throw new Error(`VITE_SUPABASE_URL is not a valid URL: "${url}"\nIt should look like https://xxxxxxxxxxxx.supabase.co`)
}

export const supabase = createClient(url, key)
