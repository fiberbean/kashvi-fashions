import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gbvmojlbihxqeiyditbd.supabase.co'

const supabaseAnonKey = 'sb_publishable_FrFCWBVO2YJTy6usqjkAPw_uYQLG6Fk'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)