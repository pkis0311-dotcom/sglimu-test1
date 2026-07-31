$filePath = "c:\Users\park4\OneDrive\Desktop\sglimu-test1-74cb15a05cf7228d7666fb5324167b503300e79d\1\sglimu-test1\sglimu-test1-f7f80df16df9dd0d0a27af85970c4fb2f22e7ee0\style.css"
$lines = Get-Content $filePath -Encoding UTF8
$lineNum = 1
foreach ($line in $lines) {
    if ($line.Contains("product") -or $line.Contains("img") -or $line.Contains("image") -or $line.Contains("fit") -or $line.Contains("size")) {
        $trimmed = $line.Trim()
        Write-Host "Line $lineNum : $trimmed"
    }
    $lineNum++
}
