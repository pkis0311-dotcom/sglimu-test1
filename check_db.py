import requests
import json

SUPABASE_URL = "https://xxvfgnoffomrhtxitqkj.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9"

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
}

def check_products():
    url = f"{SUPABASE_URL}/rest/v1/products?select=category"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        products = response.json()
        categories = set(p['category'] for p in products if p.get('category'))
        print("--- Unique Categories ---")
        for cat in sorted(list(categories)):
            print(cat)
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    check_products()
