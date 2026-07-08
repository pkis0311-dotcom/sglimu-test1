
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkConfigs() {
    const { data, error } = await supabase.from('site_configs').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Site Configs:', JSON.stringify(data, null, 2));
}

checkConfigs();
