$TargetDir = "c:\\Users\\park4\\OneDrive\\Desktop\\test7\\sglimu-test1"
$NewFooterPath = Join-Path $TargetDir "scratch\\new_footer.txt"

# Read new footer as UTF-8
$NewFooter = [System.IO.File]::ReadAllText($NewFooterPath, [System.Text.Encoding]::UTF8)

$HtmlFiles = Get-ChildItem -Path $TargetDir -Filter "*.html"

Write-Host "Found $($HtmlFiles.Count) HTML files."

$Count = 0
foreach ($File in $HtmlFiles) {
    # Read HTML file as UTF-8
    $Content = [System.IO.File]::ReadAllText($File.FullName, [System.Text.Encoding]::UTF8)
    
    # regex match for <footer class="footer"> ... </footer>
    if ($Content -match '(?s)<footer class="footer">.*?</footer>') {
        $UpdatedContent = $Content -replace '(?s)<footer class="footer">.*?</footer>', $NewFooter
        # Write HTML file back as UTF-8 (without BOM, or standard UTF-8)
        $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($File.FullName, $UpdatedContent, $Utf8NoBom)
        Write-Host "Updated footer in $($File.Name)"
        $Count++
    } else {
        Write-Host "No footer found in $($File.Name)"
    }
}

Write-Host "Finished updating $Count files."
