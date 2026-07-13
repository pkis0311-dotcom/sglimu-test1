import urllib.request
import json

url = 'https://xxvfgnoffomrhtxitqkj.supabase.co/rest/v1/orders?select=*&limit=1'
headers = {
    'apikey': 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9',
    'Authorization': 'Bearer sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9'
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        data = json.loads(html)
        print("Success fetching orders:", data)
except Exception as e:
    print("Error fetching orders:", e)
