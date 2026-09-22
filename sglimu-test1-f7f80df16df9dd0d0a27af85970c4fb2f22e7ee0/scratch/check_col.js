const https = require('https');

const url = 'https://xxvfgnoffomrhtxitqkj.supabase.co/rest/v1/products?select=id,name,price,original_price&limit=1';
const options = {
    headers: {
        'apikey': 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9',
        'Authorization': 'Bearer sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9'
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
    });
}).on('error', err => {
    console.error(err);
});
