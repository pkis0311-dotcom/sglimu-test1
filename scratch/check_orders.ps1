$SUPABASE_URL = "https://xxvfgnoffomrhtxitqkj.supabase.co"
$API_KEY = "sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9"
$headers = @{ 
    "apikey" = $API_KEY
    "Authorization" = "Bearer $API_KEY" 
}

try {
    $uri = "$SUPABASE_URL/rest/v1/orders?select=*&limit=1"
    $res = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    Write-Host "Orders Table exists and is accessible. Result: $res" -ForegroundColor Green
} catch {
    Write-Host "Orders Table Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response Body: $body" -ForegroundColor Yellow
    }
}
