$keywords = @("3M라벨키퍼", "책꽂이라벨", "라벨키퍼")
$rootDir = "c:\Users\park4\OneDrive\Desktop\sglimu-test1-74cb15a05cf7228d7666fb5324167b503300e79d\1\sglimu-test1\sglimu-test1-f7f80df16df9dd0d0a27af85970c4fb2f22e7ee0"

Get-ChildItem -Path $rootDir -Include *.html, *.js, *.css -Recurse | ForEach-Object {
    $file = $_
    $lines = Get-Content $file.FullName -Encoding UTF8
    $lineNum = 1
    foreach ($line in $lines) {
        foreach ($kw in $keywords) {
            if ($line -like "*$kw*") {
                $relative = Resolve-Path $file.FullName -Relative
                Write-Output "$relative:$lineNum | $kw | $($line.Trim())"
            }
        }
        $lineNum++
    }
}
