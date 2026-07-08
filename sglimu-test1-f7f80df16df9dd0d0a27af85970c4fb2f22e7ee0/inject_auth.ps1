$path = "c:\Users\park4\OneDrive\Desktop\test7\sglimu-test1"
# Include index.html this time
$files = Get-ChildItem -Path $path -Filter *.html | Where-Object { $_.Name -ne 'admin.html' }

$headPattern = '(?i)</head>'
$headReplace = "    <link rel=`"stylesheet`" href=`"auth.css`">`r`n    <script src=`"https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js`" integrity=`"sha384-l+xbElFSnPZ2rOaPrU//2Kes5Q39MW1SI6zWzwA88yCfL9Mi9SbpS7cwjLxS7fJ6`" crossorigin=`"anonymous`"></script>`r`n    <script src=`"https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js`"></script>`r`n</head>"

$userIconPattern = '(?i)<a href=`"#`"><i class=`"fa-regular fa-user`"></i></a>'
$userIconReplace = @"
                <div class="user-auth-wrap" id="userAuthWrap">
                    <button class="login-trigger-btn" id="loginTriggerBtn">
                        <i class="fa-regular fa-user"></i>
                        <span>로그인</span>
                    </button>
                </div>
"@

$bodyPattern = '(?i)</body>'
        </div>
    </div>
    <script type="module" src="auth.js"></script>
</body>
"@

foreach ($file in $files) {
    Write-Output "Processing $($file.Name)..."
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    
    # Check if Kakao SDK is already present
    if ($content -notmatch 't1\.kakaocdn\.net') {
        $content = [regex]::Replace($content, $headPattern, $headReplace)
        $content = [regex]::Replace($content, $userIconPattern, $userIconReplace)
        $content = [regex]::Replace($content, $bodyPattern, $bodyReplace)
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}
Write-Output "Global Auth Injection Done"
