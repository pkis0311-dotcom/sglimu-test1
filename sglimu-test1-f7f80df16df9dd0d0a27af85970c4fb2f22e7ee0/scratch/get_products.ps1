$headers = @{
    "apikey" = "sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9"
    "Authorization" = "Bearer sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9"
}
$uri = "https://xxvfgnoffomrhtxitqkj.supabase.co/rest/v1/products?select=id,name,image_url"
$response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
foreach ($p in $response) {
    Write-Host ("ID: {0} | Name: {1} | Image: {2}" -f $p.id, $p.name, $p.image_url)
}
