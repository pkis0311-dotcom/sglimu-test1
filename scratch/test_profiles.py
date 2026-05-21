import urllib.request
import json

SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co'
SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9'

req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/profiles?select=*&limit=5",
    headers={
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print("Success! Profiles:")
        print(html)
except Exception as e:
    print("Error querying profiles:", e)
