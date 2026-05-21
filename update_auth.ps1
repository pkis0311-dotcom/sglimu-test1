$path = "c:\Users\park4\OneDrive\Desktop\test7\sglimu-test1"
$files = Get-ChildItem -Path $path -Filter *.html | Where-Object { $_.Name -ne 'admin.html' }

$templatePath = Join-Path $path "auth_template.txt"
$bodyReplace = [System.IO.File]::ReadAllText($templatePath, [System.Text.Encoding]::UTF8)

foreach ($file in $files) {
    Write-Output "Updating $($file.Name)..."
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    
    # regex replace from <!-- Auth Modal Overlay --> to </body>
    $content = [regex]::Replace($content, '(?s)<!-- Auth Modal Overlay -->.*?</body>', $bodyReplace)
    
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
}
Write-Output "Global Auth Modal Update Done (UTF-8 Enforced)"
