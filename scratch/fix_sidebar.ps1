$path = "product-detail.html"
$content = Get-Content $path -Raw
$newSidebar = @"
    <aside class="right-fixed-banner">
        <ul class="banner-menu">
            <li><a href="#" class="banner-btn search-btn-aside" title="검색"><i class="fa-solid fa-magnifying-glass"></i><span class="tooltip">검색</span></a></li>
            <li><a href="#" class="banner-btn" title="주문배송"><i class="fa-solid fa-truck"></i><span class="tooltip">주문배송</span></a></li>
            <li><a href="#" class="banner-btn" title="장바구니"><i class="fa-solid fa-cart-shopping"></i><span class="tooltip">장바구니</span></a></li>
            <li><a href="#" class="banner-btn" title="관심상품"><i class="fa-regular fa-heart"></i><span class="tooltip">관심상품</span></a></li>
            <li><a href="#" class="banner-btn naver-talk" title="네이버톡톡"><i class="fa-solid fa-comment-dots"></i><span class="tooltip">네이버톡톡</span></a></li>
            <li class="scroll-btns">
                <button class="banner-btn scroll-top" id="scrollTopBtn" title="위로"><i class="fa-solid fa-chevron-up"></i></button>
                <button class="banner-btn scroll-bottom" id="scrollBottomBtn" title="아래로"><i class="fa-solid fa-chevron-down"></i></button>
            </li>
        </ul>
    </aside>
"@
# Replace the block from <aside... to </aside>
$content = $content -replace '(?s)<aside class="right-fixed-banner">.*?</aside>', $newSidebar
$content | Set-Content $path -Encoding UTF8
