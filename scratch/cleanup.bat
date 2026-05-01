@echo off
set KEY=sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9
set URL=https://xxvfgnoffomrhtxitqkj.supabase.co/rest/v1

echo Deleting fdsafsada...
curl -X DELETE -H "apikey: %KEY%" -H "Authorization: Bearer %KEY%" "%URL%/products?id=eq.e570f38a-ed40-4517-aebc-b4026d4db72b"

echo Deleting placeholder 2...
curl -X DELETE -H "apikey: %KEY%" -H "Authorization: Bearer %KEY%" "%URL%/products?id=eq.58c757bc-d816-40b7-a678-ce4566d4fddd"

echo Deleting placeholder 3...
curl -X DELETE -H "apikey: %KEY%" -H "Authorization: Bearer %KEY%" "%URL%/products?id=eq.e2ee582b-bbce-481e-ac85-899efb28ca01"

echo Deleting config display_koas-cat-0...
curl -X DELETE -H "apikey: %KEY%" -H "Authorization: Bearer %KEY%" "%URL%/site_configs?key=eq.display_koas-cat-0"

echo Cleanup done.
