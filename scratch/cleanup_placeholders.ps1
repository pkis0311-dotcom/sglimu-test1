$URL = "https://xxvfgnoffomrhtxitqkj.supabase.co/rest/v1"
$KEY = "sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9"
$HEADERS = @{
    "apikey" = $KEY
    "Authorization" = "Bearer $KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# 1. Delete placeholder products
$productIds = @(
    "e570f38a-ed40-4517-aebc-b4026d4db72b",
    "58c757bc-d816-40b7-a678-ce4566d4fddd",
    "e2ee582b-bbce-481e-ac85-899efb28ca01"
)

foreach ($id in $productIds) {
    Write-Host "Deleting product: $id"
    try {
        Invoke-RestMethod -Uri "$URL/products?id=eq.$id" -Method Delete -Headers $HEADERS
    } catch {
        Write-Host "Failed to delete $id: $_"
    }
}

# 2. Delete site_configs
Write-Host "Deleting site_config: display_koas-cat-0"
try {
    Invoke-RestMethod -Uri "$URL/site_configs?key=eq.display_koas-cat-0" -Method Delete -Headers $HEADERS
} catch {
    Write-Host "Failed to delete config: $_"
}

Write-Host "Cleanup complete."
