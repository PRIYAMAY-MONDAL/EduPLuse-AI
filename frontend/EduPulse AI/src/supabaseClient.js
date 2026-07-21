import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://patmdttqtlostxpanxyw.supabase.co';
const SUPABASE_ANON_KEY ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdG1kdHRxdGxvc3R4cGFueHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1Njk5NzcsImV4cCI6MjEwMDE0NTk3N30.sQitg1pPJIXK4xeWO1IYWOD-Jy-DGtypdUk2x3YvIts';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);