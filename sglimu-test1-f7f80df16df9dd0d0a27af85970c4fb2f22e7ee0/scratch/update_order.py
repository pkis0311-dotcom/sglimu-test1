import urllib.request
import json

url = 'https://xxvfgnoffomrhtxitqkj.supabase.co/rest/v1/orders?id=eq.51'
payload = {
    'customer_name': '박||CARD||1111||[{"id":"60136f01-0ea1-41b3-8e68-6a5a31bac42c","name":"스티커","qty":1}]||TID:SG1142086m012608211528205100'
}

req = urllib.request.Request(url, headers={
    'apikey': 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9',
    'Authorization': 'Bearer sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}, data=json.dumps(payload).encode('utf-8'), method='PATCH')

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print('Successfully updated Order 51 TID!')
        print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print('Error:', e)
