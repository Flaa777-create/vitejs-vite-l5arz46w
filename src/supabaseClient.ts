import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jehhyflawpcyhurpbzli.supabase.co';
const supabaseAnonKey = 'sb_publishable_V3sV8TkNI0Tvch-iQj3tvw_6UKn0ICW';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
