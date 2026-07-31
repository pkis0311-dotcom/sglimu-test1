# Search git commits for scratch/site_configs.json versions
$commits = git log --oneline --format="%H %s"
foreach ($line in $commits) {
    $parts = $line -split " ", 2
    $sha = $parts[0]
    $msg = $parts[1]
    
    # Try to get site_configs.json from this commit
    try {
        $content = git show "${sha}:sglimu-test1-f7f80df16df9dd0d0a27af85970c4fb2f22e7ee0/scratch/site_configs.json" 2>$null
        if ($content) {
            $json = ConvertFrom-Json ($content -join "`n")
            $keyCount = $json.value.Count
            $pageDataKeys = $json.value | Where-Object { $_.key -like "pageData_*" }
            Write-Output "Commit $sha ($msg) -> Total Keys: $keyCount, pageData Keys: $($pageDataKeys.Count)"
        }
    } catch {
        # File might not exist in this commit
    }
}
