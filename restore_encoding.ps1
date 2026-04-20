$htmlFiles = Get-ChildItem -Path . -Filter *.html
foreach ($file in $htmlFiles) {
    if ($file.Name -eq "index.html" -or $file.Name -eq "access.html") {
        continue
    }
    
    $path = $file.FullName
    try {
        # Read the corrupted file as UTF-8
        $corruptedText = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        
        # Unconditionally attempt recovery
        $bytes = [System.Text.Encoding]::GetEncoding(949).GetBytes($corruptedText)
        $recoveredText = [System.Text.Encoding]::UTF8.GetString($bytes)
        
        # Save back as UTF-8
        [System.IO.File]::WriteAllText($path, $recoveredText, [System.Text.Encoding]::UTF8)
        Write-Host "Restored: $($file.Name)"
    } catch {
        Write-Host "Error processing $($file.Name): $($_.Exception.Message)"
    }
}
