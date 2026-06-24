$SUPABASE_URL = "https://xxvfgnoffomrhtxitqkj.supabase.co"
$API_KEY = "sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9"
$headers = @{ 
    "apikey" = $API_KEY
    "Authorization" = "Bearer $API_KEY"
}

try {
    $uri = "$SUPABASE_URL/rest/v1/orders?select=nonexistent"
    $res = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
} catch {
    Write-Host "Request Failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response Body: $body"
    }
}
