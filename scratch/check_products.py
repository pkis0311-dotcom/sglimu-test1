import requests
import json

SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co'
SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9'

def list_products():
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    url = f"{SUPABASE_URL}/rest/v1/products?select=*"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        products = response.json()
        for p in products:
            if '샘플' in p.get('name', '') or 'sample' in p.get('name', '').lower():
                print(json.dumps(p, indent=2, ensure_ascii=False))
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    list_products()
