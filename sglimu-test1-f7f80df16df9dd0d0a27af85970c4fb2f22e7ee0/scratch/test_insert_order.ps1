$SUPABASE_URL = "https://xxvfgnoffomrhtxitqkj.supabase.co"
$API_KEY = "sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9"
$headers = @{ 
    "apikey" = $API_KEY
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Test standard fields in pure ASCII
$orderData = @{
    total_price = 50000
    status = "Pending"
    items = @(
        @{
            name = "Test Item"
            price = 50000
            qty = 1
        }
    )
} | ConvertTo-Json -Depth 5

try {
    $uri = "$SUPABASE_URL/rest/v1/orders"
    $res = Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body $orderData
    Write-Host "Insert Success! Returned:"
    Write-Host ($res | ConvertTo-Json)
    
    # Delete it immediately to clean up
    $insertedId = $res[0].id
    if ($insertedId) {
        $delUri = "$SUPABASE_URL/rest/v1/orders?id=eq.$insertedId"
        $delRes = Invoke-RestMethod -Uri $delUri -Headers $headers -Method Delete
        Write-Host "Cleanup deleted ID: $insertedId"
    }
} catch {
    Write-Host "Insert Failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response Body: $body"
    }
}
