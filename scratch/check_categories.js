import { supabase } from '../supabase-client.js';

async function checkCategories() {
    const { data, error } = await supabase.from('site_configs').select('value').eq('key', 'site_categories').single();
    if (error) {
        console.error("Error:", error);
        return;
    }
    console.log(JSON.stringify(data.value, null, 2));
}

checkCategories();
