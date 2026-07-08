$SUPABASE_URL = "https://xxvfgnoffomrhtxitqkj.supabase.co"
$API_KEY = "sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9"
$headers = @{ 
    "apikey" = $API_KEY
    "Authorization" = "Bearer $API_KEY"
}

try {
    $uri = "$SUPABASE_URL/rest/v1/"
    $res = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    
    # Extract orders table schema
    $ordersSchema = $res.definitions.orders
    Write-Host "Orders Table Definition:"
    Write-Host ($ordersSchema | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "Request Failed: $($_.Exception.Message)"
}
