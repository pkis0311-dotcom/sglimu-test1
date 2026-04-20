$template = @"
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} - 에스지라이뮤</title>
    <meta name="description" content="{{TITLE}}, 도서관용품, 도서관물품, 프리미엄 도서관 쇼핑몰">
    <link rel="stylesheet" href="style.css">
    <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .category-page { padding: 120px 5% 100px; max-width: 1400px; margin: 0 auto; min-height: 800px; }
        .category-header { text-align: center; margin-bottom: 60px; }
        .category-title { font-size: 2.5rem; color: var(--color-text); font-weight: 700; margin-bottom: 20px; }
        .subcategory-nav { display: flex; justify-content: center; gap: 15px; margin-bottom: 50px; flex-wrap: wrap; }
        .subcategory-item { padding: 12px 30px; font-size: 1.1rem; font-weight: 600; color: var(--color-text-light); background: #fff; border: 1px solid var(--color-border); border-radius: 30px; cursor: pointer; transition: var(--transition-smooth); }
        .subcategory-item:hover, .subcategory-item.active { color: #fff; background: var(--color-primary); border-color: var(--color-primary); }
        .product-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; }
        .sub-content { display: none; animation: fadeIn 0.5s ease; }
        .sub-content.active { display: block; }
    </style>
    <link rel="stylesheet" href="cart.css">
    <link rel="stylesheet" href="inquiry.css">
    <link rel="stylesheet" href="auth.css">
</head>
<body>
    <header class="header">
        <div class="header-container">
            <h1 class="logo"><a href="index.html">SG LIMU</a></h1>
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
            <div class="header-utils">
                <div class="search-wrapper">
                    <input type="text" class="search-input" placeholder="검색어를 입력하세요">
                    <a href="#" class="search-btn" id="headerSearchBtn"><i class="fa-solid fa-magnifying-glass"></i></a>
                </div>
                <div class="user-auth-wrap" id="userAuthWrap">
                    <button class="login-trigger-btn" id="loginTriggerBtn"><i class="fa-regular fa-user"></i> <span>로그인</span></button>
                </div>
                <a href="#"><i class="fa-solid fa-cart-shopping"></i></a>
            </div>
        </div>
    </header>

    <main class="category-page">
        <div class="category-header">
            <h2 class="category-title">{{TITLE}}</h2>
            <p>{{TITLE}} 카테고리의 다양한 제품을 만나보세요.</p>
        </div>
        <ul class="subcategory-nav" id="subCategoryNav">
{{SUBNAV}}
        </ul>
{{SUBCONTENTS}}

        <section class="dynamic-detail-section" style="margin-top: 80px; border-top: 1px solid #eee; padding-top: 60px;">
            <div class="category-header" style="margin-bottom: 40px;">
                <h2 class="category-title" style="font-size: 2rem;">상세 정보</h2>
                <p id="dynamicDesc">관리자 페이지에서 등록한 정보가 이 곳에 표시됩니다.</p>
            </div>
            <div class="detail-content-wrapper" style="max-width: 1000px; margin: 0 auto;">
                <div class="main-image-container" style="text-align: center; margin-bottom: 50px;">
                    <img src="" id="mainImage" alt="대표이미지" style="max-width: 400px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); display:none;">
                </div>
                <div class="info-text-box" style="background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                    <h4 style="border-bottom: 2px solid var(--color-primary); padding-bottom: 10px; margin-bottom: 30px; font-size: 1.3rem;">FEATURES</h4>
                    <div class="detail-features" id="dynamicFeatures"></div>
                    <h4 style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; margin-top: 40px; font-size: 1.3rem;">SPECIFICATIONS</h4>
                    <table class="spec-table" style="width: 100%; border-collapse: collapse;"><tbody id="dynamicSpecTable"></tbody></table>
                    <div class="detail-image-full" style="margin-top: 50px; text-align: center;"><img src="" id="dynamicDetailImg" style="max-width: 100%; border-radius: 5px;"></div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="footer-container">
            <div class="footer-info">
                <p><strong>(주)에스지라이뮤</strong> &nbsp;|&nbsp; Tel : 1544-5703 &nbsp;|&nbsp; Fax : 051-518-5985 &nbsp;|&nbsp; E-Mail : limu101@nate.com</p>
                <p>Address : 부산광역시 금정구 중앙대로 1879번길 29 (311호)</p>
                <p>대표이사 : 강인한 &nbsp;|&nbsp; 사업자번호 : 621-81-42086 &nbsp;|&nbsp; 통신판매업신고번호 : 제2018-부산금정-0045호</p>
                <p class="copyright">Copyright(c)2023 www.sgperzoom.com. All right Reserved.</p>
            </div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="script.js"></script>
    <script>
        const { createClient } = supabase;
        const db = createClient('https://xxvfgnoffomrhtxitqkj.supabase.co', 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9');
        const CURRENT_PAGE_ID = '{{PAGEID}}'; 

        document.addEventListener('DOMContentLoaded', async () => {
            const subNavItems = document.querySelectorAll('.subcategory-item');
            const subContents = document.querySelectorAll('.sub-content');
            subNavItems.forEach(item => {
                item.addEventListener('click', () => {
                    subNavItems.forEach(n => n.classList.remove('active'));
                    subContents.forEach(c => c.classList.remove('active'));
                    item.classList.add('active');
                    const targetId = item.getAttribute('data-target');
                    const targetContent = document.getElementById(targetId);
                    if(targetContent) targetContent.classList.add('active');
                });
            });
            async function loadDisplayProducts(containerId, displayKey) {
                const container = document.querySelector(`#${containerId} .product-list`);
                if(!container) return;
                const { data: configData } = await db.from('site_configs').select('value').eq('key', 'display_' + displayKey).single();
                const selectedIds = configData ? configData.value : [];
                if (selectedIds.length === 0) {
                    container.innerHTML = '<div style="grid-column: 1 / -1; padding: 50px; text-align: center; color: #999;">등록된 제품이 없습니다.</div>';
                    return;
                }
                const { data: products } = await db.from('products').select('*').in('id', selectedIds);
                if (!products) return;
                container.innerHTML = '';
                const sortedProducts = selectedIds.map(id => products.find(p => p.id === id)).filter(p => p);
                sortedProducts.forEach(p => {
                    const card = document.createElement('div');
                    card.className = 'product-card visible';
                    card.onclick = () => window.location.href = 'product-detail.html?id=' + p.id;
                    card.innerHTML = `<div class="product-img" style="background-image: url('${p.image_url || 'assets/no-image.png'}'); background-size: contain; background-repeat:no-repeat; background-position: center; height: 250px;"></div><div class="product-info" style="text-align:center; padding:15px;"><h4 style="margin-bottom:5px;">${p.name}</h4><p style="color:var(--color-primary); font-weight:bold;">${p.price === '전화문의' ? '전화문의' : Number(p.price).toLocaleString() + '원'}</p></div>`;
                    container.appendChild(card);
                });
            }
            const subItems = document.querySelectorAll('.subcategory-item');
            for (const item of subItems) {
                const targetId = item.getAttribute('data-target');
                await loadDisplayProducts(targetId, CURRENT_PAGE_ID + '-' + targetId);
            }
            const { data: configData } = await db.from('site_configs').select('value').eq('key', 'pageData_' + CURRENT_PAGE_ID).single();
            if(configData && configData.value) {
                const d = configData.value;
                if(d.description) document.getElementById('dynamicDesc').innerHTML = d.description.replace(/\\n/g, '<br>');
                if(d.mainImages && d.mainImages[0]) {
                    const img = document.getElementById('mainImage');
                    img.src = d.mainImages[0];
                    img.style.display = 'inline-block';
                }
                if(d.detailImage) document.getElementById('dynamicDetailImg').src = d.detailImage;
                if(d.specs) document.getElementById('dynamicSpecTable').innerHTML = d.specs.map(s => `<tr><th style="background:#f9f9f9; width:25%; padding:12px; border:1px solid #ddd; text-align:left;">${s.key}</th><td style="padding:12px; border:1px solid #ddd;">${s.val}</td></tr>`).join('');
                if(d.features) document.getElementById('dynamicFeatures').innerHTML = d.features.map((f, i) => `<div class="feature-item" style="margin-bottom:20px; border-bottom:1px dashed #eee; padding-bottom:15px;"><h5 style="font-size:1.1rem; color:#222; margin-bottom:8px; display:flex; align-items:center;"><span style="display:inline-block; background:var(--color-primary); color:#fff; width:22px; height:22px; line-height:22px; text-align:center; border-radius:50%; margin-right:10px; font-size:0.75rem;">${(i+1).toString().padStart(2,'0')}</span>${f.title}</h5><p style="color:#666; line-height:1.6; padding-left:32px;">${f.desc.replace(/\\n/g, '<br>')}</p></div>`).join('');
            }
        });
    </script>
    <script src="cart.js"></script>
    <script type="module" src="inquiry.js"></script>
    <script type="module" src="auth.js"></script>
</body>
</html>
"@

$pages = @(
    [PSCustomObject]@{file="rfid.html"; title="RFID시스템"; id="rfid"; subs=@(@("cat-tag", "태그 (TAG)"), @("cat-anti", "분실방지기"), @("cat-reader", "리더기"), @("cat-return", "대출반납기"))},
    [PSCustomObject]@{file="em.html"; title="EM시스템"; id="em"; subs=@(@("em-cat-0", "분실방지기"), @("em-cat-1", "감응제거재생기"), @("em-cat-2", "감응테이프"))},
    [PSCustomObject]@{file="sterilizer.html"; title="책소독기"; id="sterilizer"; subs=@(@("sterilizer-cat-0", "소모품/기타"))},
    [PSCustomObject]@{file="supplies-arrange.html"; title="도서정리 용품"; id="supplies-arrange"; subs=@(@("supplies-arrange-cat-0", "키퍼"), @("supplies-arrange-cat-1", "색띠라벨"), @("supplies-arrange-cat-2", "라벨용지"), @("supplies-arrange-cat-3", "장갑"), @("supplies-arrange-cat-4", "도장"), @("supplies-arrange-cat-5", "북앤드"), @("supplies-arrange-cat-6", "기타"))},
    [PSCustomObject]@{file="supplies-protect.html"; title="도서보호, 보수용품"; id="supplies-protect"; subs=@(@("supplies-protect-cat-0", "필모시리즈"), @("supplies-protect-cat-1", "중성풀"), @("supplies-protect-cat-2", "양면테이프"), @("supplies-protect-cat-3", "북커버"))},
    [PSCustomObject]@{file="supplies-lend.html"; title="대출용품"; id="supplies-lend"; subs=@(@("supplies-lend-cat-0", "바코드"), @("supplies-lend-cat-1", "카드프린터/기기"), @("supplies-lend-cat-2", "회원증카드"), @("supplies-lend-cat-3", "감열지"))},
    [PSCustomObject]@{file="furniture-koas.html"; title="코아스"; id="koas"; subs=@(@("koas-cat-0", "서가"), @("koas-cat-1", "테이블"), @("koas-cat-2", "의자"), @("koas-cat-3", "기타"))},
    [PSCustomObject]@{file="furniture-fomus.html"; title="포머스"; id="fomus"; subs=@(@("fomus-cat-0", "서가"), @("fomus-cat-1", "테이블"), @("fomus-cat-2", "의자"), @("fomus-cat-3", "기타"))},
    [PSCustomObject]@{file="furniture-fursys.html"; title="퍼시스"; id="fursys"; subs=@(@("fursys-cat-0", "서가"), @("fursys-cat-1", "테이블"), @("fursys-cat-2", "의자"), @("fursys-cat-3", "기타"))},
    [PSCustomObject]@{file="furniture-custom.html"; title="제작가구"; id="furniture-custom"; subs=@(@("furniture-custom-cat-0", "제작가구"))},
    [PSCustomObject]@{file="sign-class.html"; title="분류/대분류 표지판"; id="sign-class"; subs=@(@("sign-class-cat-0", "분류/대분류 표지판"))},
    [PSCustomObject]@{file="sign-board.html"; title="게시판/이용안내"; id="sign-board"; subs=@(@("sign-board-cat-0", "게시판/이용안내"))},
    [PSCustomObject]@{file="sign-date.html"; title="대출반납일력표"; id="sign-date"; subs=@(@("sign-date-cat-0", "대출반납일력표"))},
    [PSCustomObject]@{file="sign-custom.html"; title="제작사인물"; id="sign-custom"; subs=@(@("sign-custom-cat-0", "제작사인물"))},
    [PSCustomObject]@{file="discount.html"; title="할인상품"; id="discount"; subs=@(@("discount-cat-0", "할인상품 전체"))}
)

foreach ($p in $pages) {
    $subnav = ""
    $subcontents = ""
    for ($i = 0; $i -lt $p.subs.Count; $i++) {
        $sid = $p.subs[$i][0]
        $sname = $p.subs[$i][1]
        $activeClass = if ($i -eq 0) { " active" } else { "" }
        $subnav += "        <li class=`"subcategory-item$activeClass`" data-target=`"$sid`">$sname</li>`n"
        $subcontents += "        <div id=`"$sid`" class=`"sub-content$activeClass`"><div class=`"product-list`"></div></div>`n"
    }
    
    $c = $template.Replace("{{TITLE}}", $p.title).Replace("{{PAGEID}}", $p.id).Replace("{{SUBNAV}}", $subnav).Replace("{{SUBCONTENTS}}", $subcontents)
    [System.IO.File]::WriteAllText($p.file, $c, [System.Text.Encoding]::UTF8)
    Write-Host "Restored: $($p.file)"
}
