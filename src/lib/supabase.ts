import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kiyphmqhqjnxjbwrptdu.supabase.co'
const supabaseKey = 'sb_publishable_wPMSIwKaDXUj0Wyp9z2W8g_scckp1_V'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { params: { eventsPerSecond: 10 } },
})

