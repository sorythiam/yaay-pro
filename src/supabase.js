import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcoolhvntgrhaznjljaz.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjb29saHZudGdyaGF6bmpsamF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NjMxMTcsImV4cCI6MjA5MzIzOTExN30.QHgcBo6psS40_KL82oAvCB7xKmefZJBsNywLMM4fJvQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
