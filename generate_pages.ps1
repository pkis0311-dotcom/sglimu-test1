$template = Get-Content -Raw -Encoding UTF8 "rfid.html"

# Category IDs mapping to match admin.js and folder structure
$categories = @{
    "em"               = @{ title="EM시스템"; desc="가장 확실한 도서 분실 방지 시스템입니다."; subs=@("분실 방지기", "감응제거재생기", "감응 테이프") }
    "supplies-arrange" = @{ title="도서정리 용품"; desc="도서관의 체계적인 정리를 위한 필수 용품입니다."; subs=@("키퍼", "색띠라벨", "라벨용지", "장갑", "도장", "북앤드", "기타") }
    "supplies-protect" = @{ title="도서보호, 보수용품"; desc="소중한 도서를 오래 보관하기 위한 보조 용품입니다."; subs=@("필모시리즈", "중성풀", "양면테이프", "북커버") }
    "supplies-lend"    = @{ title="대출용품"; desc="도서 대출 및 반납 처리에 필요한 용품입니다."; subs=@("바코드", "(카드프린터/카드리본/소모품)", "회원증카드", "감열지") }
    "sterilizer"       = @{ title="책소독기"; desc="안전한 독서 환경을 위한 책소독기 및 소모품입니다."; subs=@("소모품") }
    "furniture-koas"   = @{ title="코아스 가구"; desc="내구성과 디자인이 뛰어난 코아스 브랜드입니다."; subs=@("서가", "테이블", "의자", "기타"); pageId="koas" }
    "furniture-fomus"  = @{ title="포머스 가구"; desc="도서관에 최적화된 포머스 브랜드 가구입니다."; subs=@("서가", "테이블", "의자", "기타"); pageId="fomus" }
    "furniture-fursys" = @{ title="퍼시스 가구"; desc="인체공학적 설계가 돋보이는 퍼시스 가구입니다."; subs=@("서가", "테이블", "의자", "기타"); pageId="fursys" }
}

foreach ($fileName in $categories.Keys) {
    $data = $categories[$fileName]
    $title = $data.title
    $desc = $data.desc
    $subs = $data.subs
    $pageId = if ($data.pageId) { $data.pageId } else { $fileName }
    
    $header_html  = "<main class=""category-page"">`n"
    $header_html += "        <div class=""category-header"">`n"
    $header_html += "            <h2 class=""category-title"">$title</h2>`n"
    $header_html += "            <p>$desc</p>`n"
    $header_html += "        </div>`n`n"
    $header_html += "        <div class=""category-container"">`n"
    $header_html += "            <ul class=""subcategory-nav"" id=""subCategoryNav"">`n"
    
    for ($i=0; $i -lt $subs.Length; $i++) {
        $sub = $subs[$i]
        $active = if ($i -eq 0) { " active" } else { "" }
        $header_html += "                <li class=""subcategory-item$active"" data-target=""cat-$i"">$sub</li>`n"
    }
    $header_html += "            </ul>`n`n"
    
    for ($i=0; $i -lt $subs.Length; $i++) {
        $sub = $subs[$i]
        $active = if ($i -eq 0) { " active" } else { "" }
        $header_html += "            <div id=""cat-$i"" class=""sub-content$active"">`n"
        $header_html += "                <div class=""product-list"">`n"
        $header_html += "                    <div class=""product-card visible"">`n"
        $header_html += "                        <div class=""product-img"" style=""background-image: url('assets/public_library.png'); background-size: cover; background-position: center;""></div>`n"
        $header_html += "                        <div class=""product-info"">`n"
        $header_html += "                            <h4>$sub 샘플상품</h4>`n"
        $header_html += "                        </div>`n"
        $header_html += "                    </div>`n"
        $header_html += "                </div>`n"
        $header_html += "            </div>`n`n"
    }
    
    $header_html += "        </div>`n"
    $header_html += "    </main>"
    
    $content = $template -replace '<title>.*?<', "<title>$title - 에스지라이뮤<"
    $content = $content -replace '(?s)<main class="category-page">.*?</main>', $header_html
    
    # Supabase Migration: Ensure CURRENT_PAGE_ID is correctly set (handles both single and double quotes)
    $content = $content -replace 'const CURRENT_PAGE_ID = [''"].*?[''"];', "const CURRENT_PAGE_ID = '$pageId';"
    
    # Save with UTF-8 to prevent encoding issues with Korean text
    $outputPath = Join-Path $PSScriptRoot "$fileName.html"
    [System.IO.File]::WriteAllText($outputPath, $content, [System.Text.Encoding]::UTF8)
}

Write-Output "Successfully generated $($categories.Count) HTML files with Supabase logic."

