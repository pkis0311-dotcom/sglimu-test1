const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9'; // test_supabase.js에 적혀있던 키 사용
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkOrdersSchema() {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) {
        console.error('Error fetching orders:', error);
    } else {
        console.log('Orders row sample:', data);
    }
}
checkOrdersSchema();
