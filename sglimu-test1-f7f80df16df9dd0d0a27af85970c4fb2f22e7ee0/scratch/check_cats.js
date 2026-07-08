const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCategories() {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
checkCategories();
