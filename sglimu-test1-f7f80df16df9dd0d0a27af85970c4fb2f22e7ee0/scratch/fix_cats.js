const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const categories = [
    {id:'signage', name:'사인물'},
    {id:'sign-class', name:'분류/세분류 안내판'},
    {id:'sign-board', name:'현판/안내판'},
    {id:'sign-date', name:'대출반납일력표'},
    {id:'sign-custom', name:'주문제작 사인물'},
    {id:'furniture', name:'도서관 가구'},
    {id:'furniture-koas', name:'코아스'},
    {id:'furniture-fomus', name:'포머스'},
    {id:'furniture-fursys', name:'퍼시스'},
    {id:'furniture-custom', name:'주문제작 가구'},
    {id:'rfid', name:'RFID 자동화 시스템'},
    {id:'em', name:'EM 보안시스템'},
    {id:'supplies', name:'도서관 용품'},
    {id:'supplies-arrange', name:'정리용품'},
    {id:'supplies-protect', name:'보수용품'},
    {id:'supplies-lend', name:'대출용품'},
    {id:'sterilizer', name:'책 소독기'},
    {id:'discount', name:'할인상품'}
];

async function fix() {
    for (const cat of categories) {
        const { error } = await supabase.from('categories').update({ name: cat.name }).eq('id', cat.id);
        if (error) console.error('Error updating', cat.id, error);
        else console.log('Successfully updated', cat.id);
    }
}
fix();
