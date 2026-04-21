$gnb = @"
            <nav class="gnb">
                <ul>
                    <li class="has-submenu">
                        <a href="#">도서관리 시스템</a>
                        <ul class="submenu">
                            <li><a href="rfid.html">RFID시스템</a></li>
                            <li><a href="em.html">EM시스템</a></li>
                            <li><a href="access.html">출입관리시스템</a></li>
                        </ul>
                    </li>
                    <li class="has-submenu">
                        <a href="#">도서관 용품</a>
                        <ul class="submenu">
                            <li><a href="supplies-arrange.html">도서정리 용품</a></li>
                            <li><a href="supplies-protect.html">도서보호, 보수용품</a></li>
                            <li><a href="supplies-lend.html">대출용품</a></li>
                            <li><a href="sterilizer.html">책소독기</a></li>
                        </ul>
                    </li>
                    <li class="has-submenu">
                        <a href="#">도서관 가구</a>
                        <ul class="submenu">
                            <li><a href="furniture-koas.html">코아스</a></li>
                            <li><a href="furniture-fomus.html">포머스</a></li>
                            <li><a href="furniture-fursys.html">퍼시스</a></li>
                            <li><a href="furniture-custom.html">제작가구</a></li>
                        </ul>
                    </li>
                    <li class="has-submenu">
                        <a href="#">사인물</a>
                        <ul class="submenu">
                            <li><a href="sign-class.html">한국십진분류/대분류표지판</a></li>
                            <li><a href="sign-board.html">게시판/이용안내</a></li>
                            <li><a href="sign-date.html">대출반납일력표</a></li>
                            <li><a href="sign-custom.html">제작사인물</a></li>
                        </ul>
                    </li>
                    <li><a href="discount.html">할인상품</a></li>
                </ul>
            </nav>
"@

$template = @"
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} - SG LIMU</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="auth.css">
    <link rel="stylesheet" href="cart.css">
    <link rel="stylesheet" href="inquiry.css">
    <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .category-page { padding: 80px 0 100px; min-height: 800px; }
        .category-container { max-width: 1400px; margin: 0 auto; padding: 0 5%; }
        .category-header { text-align: center; margin-bottom: 60px; padding: 80px 5% 60px; background-color: var(--color-surface); border-radius: 20px; }
        .category-title { font-size: 2.5rem; font-weight: 700; margin-bottom: 20px; }
        .subcategory-nav { display: flex; justify-content: center; gap: 15px; margin-bottom: 50px; flex-wrap: wrap; }
        .subcategory-item { padding: 12px 30px; font-weight: 600; color: var(--color-text-light); background: #fff; border: 1px solid var(--color-border); border-radius: 30px; cursor: pointer; transition: var(--transition-smooth); }
        .subcategory-item.active { color: #fff; background: var(--color-primary); border-color: var(--color-primary); }
        .product-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; }
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 100px 0; color: #999; }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-container">
            <h1 class="logo"><a href="index.html">SG LIMU</a></h1>
            {{GNB}}
            <div class="header-utils">
                <div class="search-wrapper"><input type="text" class="search-input" placeholder="검색어를 입력하세요"><a href="#" class="search-btn" id="headerSearchBtn"><i class="fa-solid fa-magnifying-glass"></i></a></div>
                <div class="user-auth-wrap" id="userAuthWrap"><button class="login-trigger-btn" id="loginTriggerBtn"><i class="fa-regular fa-user"></i><span>로그인</span></button></div>
                <a href="#"><i class="fa-solid fa-cart-shopping"></i></a>
            </div>
        </div>
    </header>
    <main class="category-page">
        <div class="category-header">
            <h2 class="category-title">{{TITLE}}</h2>
            <p>{{DESC}}</p>
        </div>
        <div class="category-container">
            <ul class="subcategory-nav">{{SUBNAV}}</ul>
            <div class="product-list" id="productList"></div>
        </div>
    </main>
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-info">
                <p><strong>(주)에스지라이뮤</strong> | Tel : 1544-5703 | 팩스 : 051-518-5985 | E-Mail : limu101@nate.com</p>
                <p>Address : 부산광역시 금정구 중앙대로 2210번길 29-1 (두구동)</p>
                <p>대표자명 : 강인태 | 사업자번호 : 621-81-42086 | 통신판매업신고번호 : 제 2018-부산금정-0045호</p>
                <p class="copyright">Copyright(c)2023 www.sgperzoom.com. All right Reserved.</p>
            </div>
        </div>
    </footer>
    <aside class="right-fixed-banner">
        <ul class="banner-menu">
            <li><a href="#" class="banner-btn search-btn-aside" title="검색"><i class="fa-solid fa-magnifying-glass"></i></a></li>
            <li><a href="#" class="banner-btn" title="장바구니"><i class="fa-solid fa-cart-shopping"></i></a></li>
            <li><a href="#" class="banner-btn naver-talk" title="네이버톡톡"><i class="fa-solid fa-comment-dots"></i></a></li>
            <li class="scroll-btns"><button class="banner-btn scroll-top" id="scrollTopBtn"><i class="fa-solid fa-chevron-up"></i></button><button class="banner-btn scroll-bottom" id="scrollBottomBtn"><i class="fa-solid fa-chevron-down"></i></button></li>
        </ul>
    </aside>
    <div class="chat-widget"><button class="chat-fab" id="chatFab"><i class="fa-solid fa-comment-dots"></i></button><div class="chat-window" id="chatWindow"><div class="chat-header"><h5>실시간 상담</h5><button id="chatCloseBtn">&times;</button></div><div class="chat-body" id="chatBody"><div class="message system-msg">안녕하세요! 에스지라이뮤입니다. 무엇을 도와드릴까요?</div></div><div class="chat-input-area"><input type="text" id="chatInput" placeholder="메시지 입력..."><button id="chatSendBtn">전송</button></div></div></div>
    <div class="auth-overlay" id="authOverlay"><div class="auth-modal"><div class="auth-close" id="authClose">&times;</div><div class="auth-tabs"><div class="auth-tab active" data-target="loginPane">로그인</div><div class="auth-tab" data-target="signupPane">회원가입</div></div><div class="auth-content"><div class="auth-pane active" id="loginPane"><form id="loginForm"><input type="email" id="loginEmail" placeholder="이메일" required><input type="password" id="loginPassword" placeholder="비밀번호" required><button type="submit">로그인</button></form></div><div class="auth-pane" id="signupPane"><form id="signupForm"><input type="text" id="signupName" placeholder="이름" required><input type="email" id="signupEmail" placeholder="이메일" required><button type="submit">가입하기</button></form></div></div></div></div>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="script.js"></script><script src="cart.js"></script><script src="inquiry.js"></script><script src="auth.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const tabs = document.querySelectorAll('.subcategory-item');
            const pageId = '{{PAGEID}}';
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    // pageId-tabId 형식으로 상품 로딩 시도
                    window.loadGlobalProducts(pageId + '-' + tab.dataset.target);
                });
            });
            const firstTab = document.querySelector('.subcategory-item.active');
            if(firstTab) window.loadGlobalProducts(pageId + '-' + firstTab.dataset.target);
        });
    </script>
</body>
</html>
"@

$pages = @(
    [PSCustomObject]@{file="rfid.html"; title="RFID시스템"; id="rfid"; desc="스마트하고 체계적인 도서관 환경을 구축하는 RFID 솔루션입니다."; subs=@(@("cat-tag", "태그 (TAG)"), @("cat-anti", "분실방지기"), @("cat-reader", "리더기"), @("cat-return", "대출반납기"))},
    [PSCustomObject]@{file="em.html"; title="EM시스템"; id="em"; desc="보안과 경제성을 모두 잡은 전통적인 도서 분실 방지 EM 솔루션입니다."; subs=@(@("em-cat-0", "분실방지기"), @("em-cat-1", "감응제거재생기"), @("em-cat-2", "감응테이프"))},
    [PSCustomObject]@{file="access.html"; title="출입관리시스템"; id="access"; desc="스마트하고 체계적인 도서관 환경을 구축하는 출입관리 솔루션입니다."; subs=@(@("access-cat-0", "TNH-7000A"), @("access-cat-1", "TNH-8000A"), @("access-cat-2", "EZ-2203AWG"), @("access-cat-3", "EZ-2204AWG"))},
    [PSCustomObject]@{file="supplies-arrange.html"; title="도서정리 용품"; id="supplies-arrange"; desc="도서를 분류하고 정리하는데 필요한 필수 소모품들입니다."; subs=@(@("cat-0", "키퍼"), @("cat-1", "색띠라벨"), @("cat-2", "라벨용지"), @("cat-5", "북앤드"), @("cat-6", "기타"))},
    [PSCustomObject]@{file="supplies-protect.html"; title="도서보호, 보수용품"; id="supplies-protect"; desc="소중한 도서를 오래도록 보존하기 위한 보조 용품들입니다."; subs=@(@("supplies-protect-cat-0", "필모시리즈"), @("supplies-protect-cat-1", "중성풀"), @("supplies-protect-cat-2", "양면테이프"), @("supplies-protect-cat-3", "북커버"))},
    [PSCustomObject]@{file="supplies-lend.html"; title="대출용품"; id="supplies-lend"; desc="도서 대출 및 반납 처리에 필요한 용품들입니다."; subs=@(@("supplies-lend-cat-0", "바코드"), @("supplies-lend-cat-1", "카드프린터/기기"), @("supplies-lend-cat-2", "회원증카드"), @("supplies-lend-cat-3", "감열지"))},
    [PSCustomObject]@{file="furniture-koas.html"; title="코아스 가구"; id="koas"; desc="코아스의 프리미엄 도서관 가구 시리즈입니다."; subs=@(@("koas-cat-0", "서가"), @("koas-cat-1", "테이블"), @("koas-cat-2", "의자"), @("koas-cat-3", "기타"))},
    [PSCustomObject]@{file="furniture-fomus.html"; title="포머스 가구"; id="fomus"; desc="포머스의 실용적이고 현대적인 도서관 가구입니다."; subs=@(@("fomus-cat-0", "서가"), @("fomus-cat-1", "테이블"), @("fomus-cat-2", "의자"), @("fomus-cat-3", "기타"))},
    [PSCustomObject]@{file="furniture-fursys.html"; title="퍼시스 가구"; id="fursys"; desc="퍼시스의 스마트한 도서관 오피스 솔루션입니다."; subs=@(@("fursys-cat-0", "서가"), @("fursys-cat-1", "테이블"), @("fursys-cat-2", "의자"), @("fursys-cat-3", "기타"))},
    [PSCustomObject]@{file="furniture-custom.html"; title="제작가구"; id="furniture-custom"; desc="도서관 환경과 공간에 맞춰진 최적의 커스텀 가구입니다."; subs=@(@("furniture-custom-cat-0", "제작가구"))},
    [PSCustomObject]@{file="sign-class.html"; title="분류 표지판"; id="sign-class"; desc="도서관 분류 및 안내를 위한 디자인 사인물입니다."; subs=@(@("sign-class-cat-0", "한국십진분류/대분류표지판"))},
    [PSCustomObject]@{file="sign-board.html"; title="게시판"; id="sign-board"; desc="도서관 안내 및 공지를 위한 게시판 시스템입니다."; subs=@(@("sign-board-cat-0", "게시판/이용안내"))},
    [PSCustomObject]@{file="sign-date.html"; title="대출반납일력표"; id="sign-date"; desc="직관적으로 대출 및 반납 기한을 알려주는 도서관 전용 일력표입니다."; subs=@(@("sign-date-cat-0", "대출반납일력표"))},
    [PSCustomObject]@{file="sign-custom.html"; title="제작사인물"; id="sign-custom"; desc="도서관 브랜드와 인테리어에 맞게 제작되는 전용 사인물 시리즈입니다."; subs=@(@("sign-custom-cat-0", "제작사인물"))},
    [PSCustomObject]@{file="sterilizer.html"; title="책소독기"; id="sterilizer"; desc="소중한 도서를 청결하고 안전하게 보존하기 위한 책소독기 및 소모품입니다."; subs=@(@("sterilizer-cat-0", "책소독기/소모품"))},
    [PSCustomObject]@{file="discount.html"; title="할인상품"; id="discount"; desc="특별한 가격으로 만나보실 수 있는 좋은 기회의 할인 상품들입니다."; subs=@(@("discount-cat-0", "할인상품 전체"))}
)

foreach ($p in $pages) {
    $subnav = ""
    for ($i = 0; $i -lt $p.subs.Count; $i++) {
        $sid = $p.subs[$i][0]
        $sname = $p.subs[$i][1]
        $activeClass = if ($i -eq 0) { " active" } else { "" }
        $subnav += "        <li class=`"subcategory-item$activeClass`" data-target=`"$sid`">$sname</li>`n"
    }
    
    $content = $template.Replace("{{TITLE}}", $p.title).Replace("{{DESC}}", $p.desc).Replace("{{PAGEID}}", $p.id).Replace("{{GNB}}", $gnb).Replace("{{SUBNAV}}", $subnav)
    
    [System.IO.File]::WriteAllText("c:\Users\park4\OneDrive\Desktop\test7\$($p.file)", $content, [System.Text.Encoding]::UTF8)
    Write-Host "Restored: $($p.file)"
}

Write-Host "`nAll 16 pages have been restored successfully using PowerShell."
