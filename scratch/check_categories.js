const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCategories() {
    console.log('Fetching site_categories from site_configs...');
    const { data, error } = await supabase
        .from('site_configs')
        .select('value')
        .eq('key', 'site_categories')
        .single();
    
    if (error) {
        console.error('Error fetching categories:', error.message);
    } else {
        console.log('Categories data:');
        console.log(JSON.stringify(data.value, null, 2));
    }
}

checkCategories();
