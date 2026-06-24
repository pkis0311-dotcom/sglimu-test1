$TargetDir = "c:\\Users\\park4\\OneDrive\\Desktop\\test7\\sglimu-test1"

$NewFooter = @"
<footer class="footer">
        <div class="footer-container">
            <div class="footer-info">
                <p><strong>(주)에스지라이뮤</strong> &nbsp;|&nbsp; Tel : 1544-5703 &nbsp;|&nbsp; 팩스 : 051-518-5985 &nbsp;|&nbsp; 점심시간 (12:00~13:00) &nbsp;|&nbsp; E-Mail : limu101@nate.com &nbsp;|&nbsp; Address : 부산광역시 금정구 놀이마당로 29-1 (청룡동)</p>
                <p>대표자명 : 강인숙 &nbsp;|&nbsp; 개인정보취급담당자 : 강인숙 &nbsp;|&nbsp; 사업자번호 : 621-81-42086 &nbsp;|&nbsp; 통신판매업신고번호 : 제 2018-부산금정-0045호</p>
                <p class="copyright">Copyright(c)2026 www.sglimu.com. All right Reserved.</p>
            </div>
        </div>
    </footer>
"@

$HtmlFiles = Get-ChildItem -Path $TargetDir -Filter "*.html"

Write-Host "Found $($HtmlFiles.Count) HTML files."

$Count = 0
foreach ($File in $HtmlFiles) {
    $Content = [System.IO.File]::ReadAllText($File.FullName, [System.Text.Encoding]::UTF8)
    
    # regex match for <footer class="footer"> ... </footer>
    if ($Content -match '(?s)<footer class="footer">.*?</footer>') {
        $UpdatedContent = $Content -replace '(?s)<footer class="footer">.*?</footer>', $NewFooter
        [System.IO.File]::WriteAllText($File.FullName, $UpdatedContent, [System.Text.Encoding]::UTF8)
        Write-Host "Updated footer in $($File.Name)"
        $Count++
    } else {
        Write-Host "No footer found in $($File.Name)"
    }
}

Write-Host "Finished updating $Count files."
