import os

template = '''<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - SG LIMU</title>
    <meta name="description" content="{title}, 도서관용품, 도서관물품">
    <link rel="stylesheet" href="style.css">
    <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .category-page {{ padding: 80px 0 100px; min-height: 800px; }}
        .category-container {{ max-width: 1400px; margin: 0 auto; padding: 0 5%; }}
        .category-header {{ text-align: center; margin-bottom: 60px; padding: 100px 5% 60px; background-color: var(--color-surface); width: 100%; border-radius: 20px; }}
        .category-title {{ font-size: 2.5rem; color: var(--color-text); font-weight: 700; margin-bottom: 20px; }}
        .subcategory-nav {{ display: flex; justify-content: center; gap: 15px; margin-bottom: 50px; flex-wrap: wrap; }}
        .subcategory-item {{ padding: 12px 30px; font-size: 1.1rem; font-weight: 600; color: var(--color-text-light); background: #fff; border: 1px solid var(--color-border); border-radius: 30px; cursor: pointer; transition: var(--transition-smooth); }}
        .subcategory-item:hover, .subcategory-item.active {{ color: #fff; background: var(--color-primary); border-color: var(--color-primary); }}
        .product-list {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; }}
        .sub-content {{ display: none; animation: fadeIn 0.5s ease; }}
        .sub-content.active {{ display: block; }}
        @keyframes fadeIn {{ from {{ opacity: 0; transform: translateY(10px); }} to {{ opacity: 1; transform: translateY(0); }} }}
        .empty-state {{ grid-column: 1 / -1; text-align: center; padding: 100px 0; color: #999; }}
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
                    <a href="#" class="search-btn"><i class="fa-solid fa-magnifying-glass"></i></a>
                </div>
                <a href="#"><i class="fa-regular fa-user"></i></a>
                <a href="#"><i class="fa-solid fa-cart-shopping"></i></a>
            </div>
        </div>
    </header>

    <main class="category-page">
        <div class="category-header">
            <h2 class="category-title">{title}</h2>
            <p>{desc}</p>
        </div>

        <div class="category-container">
            <ul class="subcategory-nav" id="subCategoryNav">
                {tabs}
            </ul>

            <div id="product-container">
                <div class="product-list">
                    <div class="empty-state">상품을 불러오는 중입니다...</div>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer" style="padding:60px 0; margin-top:100px; border-top:1px solid #eee;">
        <div class="container" style="text-align:center; color:#888; font-size:0.9rem;">
            <p>&copy; 2026 SG LIMU. All Rights Reserved.</p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script type="module">
        import {{ createClient }} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
        const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        document.addEventListener('DOMContentLoaded', () => {{
            const navItems = document.querySelectorAll('.subcategory-item');
            
            navItems.forEach(item => {{
                item.addEventListener('click', () => {{
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                    loadProducts(item.dataset.target);
                }});
            }});

            if(navItems.length > 0) {{
                navItems[0].click();
            }}
        }});

        async function loadProducts(catId) {{
            const container = document.querySelector('.product-list');
            container.innerHTML = '<div class="empty-state">로딩 중...</div>';
            
            try {{
                const {{ data, error }} = await supabase
                    .from('products')
                    .select('*')
                    .eq('category', catId)
                    .order('created_at', {{ ascending: false }});

                if (error) throw error;
                if (!data || data.length === 0) {{
                    container.innerHTML = '<div class="empty-state">해당 카테고리에 등록된 상품이 없습니다.</div>';
                    return;
                }}

                container.innerHTML = '';
                data.forEach(p => {{
                    const card = document.createElement('div');
                    card.className = 'product-card visible';
                    card.style.cssText = "background:#fff; border-radius:15px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.05); transition:all 0.3s ease; border:1px solid #eee;";
                    const priceStr = p.price ? p.price.toLocaleString() + '원' : '가격문의';
                    card.innerHTML = `
                        <a href="product-detail.html?id=${{p.id}}">
                            <div style="height:280px; background-image:url('${{p.image_url}}'); background-size:contain; background-repeat:no-repeat; background-position:center; background-color:#f9f9f9;"></div>
                            <div style="padding:20px;">
                                <h4 style="font-size:1.1rem; margin-bottom:10px; color:#333;">${{p.name}}</h4>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-weight:700; color:var(--color-primary); font-size:1.2rem;">${{priceStr}}</span>
                                    <button style="color:#999;"><i class="fa-solid fa-cart-plus"></i></button>
                                </div>
                            </div>
                        </a>
                    `;
                    container.appendChild(card);
                }});
            }} catch (err) {{
                console.error(err);
                container.innerHTML = '<div class="empty-state">데이터를 가져오는데 오류가 발생했습니다.</div>';
            }
        }}
    </script>
</body>
</html>'''

pages = [
    {"file": "rfid.html", "title": "RFID시스템", "desc": "스마트하고 체계적인 도서관 환경을 구축하는 RFID 솔루션입니다.", "tabs": '<li class="subcategory-item active" data-target="rfid-cat-tag">태그 (TAG)</li><li class="subcategory-item" data-target="rfid-cat-anti">분실방지기</li><li class="subcategory-item" data-target="rfid-cat-reader">리더기</li><li class="subcategory-item" data-target="rfid-cat-return">대출반납기</li>'},
    {"file": "em.html", "title": "EM시스템", "desc": "전통적이지만 확실한 보안, 도서 분실 방지를 위한 EM 솔루션입니다.", "tabs": '<li class="subcategory-item active" data-target="em-cat-0">분실방지기</li><li class="subcategory-item" data-target="em-cat-1">감응제거재생기</li><li class="subcategory-item" data-target="em-cat-2">감응 테이프</li>'},
    {"file": "supplies-arrange.html", "title": "도서정리 용품", "desc": "도서를 빛나게 관리하고 체계적으로 정리하는 필수 용품입니다.", "tabs": '<li class="subcategory-item active" data-target="supplies-arrange-cat-0">정리 > 스티커</li><li class="subcategory-item" data-target="supplies-arrange-cat-1">정리 > 색깔라벨</li><li class="subcategory-item" data-target="supplies-arrange-cat-2">정리 > 라벨용지</li><li class="subcategory-item" data-target="supplies-arrange-cat-3">정리 > 장갑</li><li class="subcategory-item" data-target="supplies-arrange-cat-4">정리 > 인장</li><li class="subcategory-item" data-target="supplies-arrange-cat-5">정리 > 북앤드</li><li class="subcategory-item" data-target="supplies-arrange-cat-6">정리 > 기타</li>'},
    {"file": "supplies-protect.html", "title": "도서보호, 보수용품", "desc": "소중한 도서를 오래도록 보존하기 위한 보호/보수 특화 제품입니다.", "tabs": '<li class="subcategory-item active" data-target="supplies-protect-cat-0">보호 > 키모시리즈</li><li class="subcategory-item" data-target="supplies-protect-cat-1">보호 > 중성풀</li><li class="subcategory-item" data-target="supplies-protect-cat-2">보호 > 양면테이프</li><li class="subcategory-item" data-target="supplies-protect-cat-3">보호 > 북커버</li>'},
    {"file": "supplies-lend.html", "title": "대출용품", "desc": "원활한 도서 대출 및 반납 관리를 위한 전문 용품입니다.", "tabs": '<li class="subcategory-item active" data-target="supplies-lend-cat-0">대출 > 바코드</li><li class="subcategory-item" data-target="supplies-lend-cat-1">대출 > 카드프린터 기기</li><li class="subcategory-item" data-target="supplies-lend-cat-2">대출 > 회원증카드</li><li class="subcategory-item" data-target="supplies-lend-cat-3">대출 > 감열지</li>'},
    {"file": "sterilizer.html", "title": "책소독기", "desc": "도서관 이용자의 건강을 지키는 쾌적한 위생 솔루션입니다.", "tabs": '<li class="subcategory-item active" data-target="sterilizer-cat-0">책소독기 소모품</li>'},
    {"file": "furniture-koas.html", "title": "코아스 가구", "desc": "공간의 가치를 높이는 프리미엄 도서관 가구, 코아스 시리즈입니다.", "tabs": '<li class="subcategory-item active" data-target="koas-cat-0">서가</li><li class="subcategory-item" data-target="koas-cat-1">테이블</li><li class="subcategory-item" data-target="koas-cat-2">의자</li><li class="subcategory-item" data-target="koas-cat-3">기타</li>'},
    {"file": "furniture-fomus.html", "title": "포머스 가구", "desc": "실용성과 디자인이 조화로운 도서관 가구, 포머스 시리즈입니다.", "tabs": '<li class="subcategory-item active" data-target="fomus-cat-0">서가</li><li class="subcategory-item" data-target="fomus-cat-1">테이블</li><li class="subcategory-item" data-target="fomus-cat-2">의자</li><li class="subcategory-item" data-target="fomus-cat-3">기타</li>'},
    {"file": "furniture-fursys.html", "title": "퍼시스 가구", "desc": "한국인의 체형에 꼭 맞는 앞선 감각의 퍼시스 도서관 가구입니다.", "tabs": '<li class="subcategory-item active" data-target="fursys-cat-0">서가</li><li class="subcategory-item" data-target="fursys-cat-1">테이블</li><li class="subcategory-item" data-target="fursys-cat-2">의자</li><li class="subcategory-item" data-target="fursys-cat-3">기타</li>'},
    {"file": "furniture-custom.html", "title": "제작가구", "desc": "어떤 공간이든 맞춤형으로 최적화해 드리는 고유의 제작 가구 솔루션입니다.", "tabs": '<li class="subcategory-item active" data-target="custom-cat-0">제작가구 전체</li>'},
    {"file": "sign-class.html", "title": "대분류 표지판", "desc": "도서관 이용자가 원하는 책을 빠르게 찾을 수 있도록 돕는 대분류 표지판입니다.", "tabs": '<li class="subcategory-item active" data-target="sign-class-cat-0">분류/대분류 표지판</li>'},
    {"file": "sign-board.html", "title": "게시판/이용안내", "desc": "질서 있고 세련된 정보 전달을 위한 도서관 전문 게시판입니다.", "tabs": '<li class="subcategory-item active" data-target="sign-board-cat-0">게시판/이용안내</li>'},
    {"file": "sign-date.html", "title": "대출반납일력표", "desc": "매일의 반납일을 정확하고 깔끔하게 안내하는 도서관 일력표입니다.", "tabs": '<li class="subcategory-item active" data-target="sign-date-cat-0">대출반납일력표</li>'},
    {"file": "sign-custom.html", "title": "제작 사인물", "desc": "도서관의 아이덴티티를 살려주는 세련된 디자인의 제작 사인물입니다.", "tabs": '<li class="subcategory-item active" data-target="sign-custom-cat-0">제작 사인물</li>'},
    {"file": "discount.html", "title": "할인상품", "desc": "특별한 혜택으로 만나는 실속 있는 상품들을 놓치지 마세요.", "tabs": '<li class="subcategory-item active" data-target="discount-cat-0">할인상품 전체</li>'}
]

for p in pages:
    content = template.format(title=p["title"], desc=p["desc"], tabs=p["tabs"])
    with open(p["file"], "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Restored: {p['file']}")
