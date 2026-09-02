import { supabase } from './supabase-client.js';

window.customerOrdersMap = {};

// 전전자 영수증/구매 확인증 모달 오픈 전역 헬퍼 함수
window.openOrderReceiptModal = function(order) {
    if (!order) {
        alert('주문 데이터 정보를 찾을 수 없습니다.');
        return;
    }
    
    let modal = document.getElementById('sgReceiptModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sgReceiptModal';
        modal.className = 'receipt-modal-overlay';
        modal.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:999999; justify-content:center; align-items:center; backdrop-filter:blur(3px);";
        modal.innerHTML = `
            <div class="receipt-modal-card" style="background:#fff; width:92%; max-width:440px; border-radius:16px; padding:28px 24px; box-shadow:0 15px 35px rgba(0,0,0,0.25); position:relative; font-family:'Pretendard', sans-serif; box-sizing:border-box;">
                <button onclick="document.getElementById('sgReceiptModal').style.display='none'" style="position:absolute; top:16px; right:18px; background:none; border:none; font-size:1.6rem; cursor:pointer; color:#888; line-height:1;">&times;</button>
                
                <div style="text-align:center; border-bottom:2px solid #111; padding-bottom:14px; margin-bottom:16px;">
                    <div style="font-size:0.75rem; color:#888; font-weight:700; letter-spacing:1.5px; margin-bottom:4px;">ELECTRONIC RECEIPT</div>
                    <h2 style="font-size:1.25rem; margin:0; color:#111; font-weight:800;">구매 영수증 / 거래 확인서</h2>
                    <div style="font-size:0.8rem; color:#666; margin-top:4px; font-weight:600;">(주)에스지라이뮤 | SG LIMU</div>
                </div>

                <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:9px; color:#333;">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:#777;">주문번호</span>
                        <strong id="rcptDisplayId" style="font-family:monospace; font-weight:bold; color:#111;">-</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:#777;">결제일시</span>
                        <span id="rcptDate" style="color:#333;">-</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:#777;">구매자</span>
                        <span id="rcptBuyer" style="font-weight:600;">-</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:#777;">결제수단</span>
                        <span id="rcptPayMethod" style="font-weight:600; color:#1a73e8;">-</span>
                    </div>
                    
                    <div style="border-top:1px dashed #ddd; margin:6px 0;"></div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#777;">주문상품</span>
                        <strong id="rcptProductName" style="max-width:230px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:right; color:#111;">-</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:#777;">수량</span>
                        <span id="rcptQty">-</span>
                    </div>

                    <div style="border-top:2px solid #111; margin:10px 0 4px 0;"></div>

                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:1.15rem; font-weight:800; color:#111;">
                        <span>총 결제금액</span>
                        <span id="rcptTotalPrice" style="color:#1a73e8;">-</span>
                    </div>
                    <div style="font-size:0.72rem; color:#888; text-align:right;">(부가가치세 포함)</div>
                </div>

                <div style="margin-top:22px; display:flex; gap:8px;">
                    <button onclick="window.print()" style="flex:1; padding:11px; background:#f5f7fa; border:1px solid #dcdfe6; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem; color:#333; display:flex; align-items:center; justify-content:center; gap:5px;"><i class="fa-solid fa-print"></i> 영수증 인쇄</button>
                    <button id="rcptBtnPg" style="flex:1; padding:11px; background:#1a73e8; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:5px;"><i class="fa-solid fa-file-invoice"></i> PG 전표 보기</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const displayId = order.id ? '#' + order.id.toString().substring(0, 8).toUpperCase() : '#N/A';
    const createdAt = order.created_at ? new Date(order.created_at).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR');
    
    let buyerName = '구매자';
    let payMethodName = '신용카드 (NICEPAY)';
    if (order.customer_name) {
        const parts = order.customer_name.split('||');
        buyerName = parts[0] || '구매자';
        if (parts.length > 1) {
            const m = parts[1];
            if (m === 'CARD') payMethodName = '신용카드 (NICEPAY)';
            else if (m === 'BANK') payMethodName = '계좌이체 (NICEPAY)';
            else if (m === 'DIRECT_BANK') payMethodName = '무통장 입금';
        }
    }

    let orderTid = order.tid || null;
    if (!orderTid && order.customer_name && order.customer_name.includes('||TID:')) {
        const match = order.customer_name.match(/\|\|TID:([^|]+)/);
        if (match) orderTid = match[1];
    }

    document.getElementById('rcptDisplayId').textContent = displayId;
    document.getElementById('rcptDate').textContent = createdAt;
    document.getElementById('rcptBuyer').textContent = buyerName;
    document.getElementById('rcptPayMethod').textContent = payMethodName;
    document.getElementById('rcptProductName').textContent = order.product_name || '주문 상품';
    document.getElementById('rcptQty').textContent = (order.quantity || 1) + '개';
    document.getElementById('rcptTotalPrice').textContent = (Number(order.total_price) || 0).toLocaleString() + '원';

    const btnPg = document.getElementById('rcptBtnPg');
    if (btnPg) {
        btnPg.onclick = () => {
            if (orderTid && !orderTid.startsWith('SG1142086m01260821152820')) {
                const url = `https://npg.nicepay.co.kr/issue/IssueLoader.do?TID=${encodeURIComponent(orderTid)}&type=0`;
                window.open(url, 'nicepayReceipt', 'width=460,height=680,scrollbars=yes,resizable=yes');
            } else {
                alert('현재 나이스페이 테스트 가맹점(MID: SG1142086m) 환경 결제 건입니다.\n실제 운영 PG 환경에서 카드 결제 진행 시 PG 매출전표가 바로 출력됩니다.');
                window.open('https://www.nicepay.co.kr/cs/transInfo/cardList.do', 'nicepayLookup', 'width=850,height=750,scrollbars=yes,resizable=yes');
            }
        };
    }

    modal.style.display = 'flex';
};

window.openNicepayReceipt = function(tid, type = '0', createdAt = null, orderId = null) {
    if (orderId && window.customerOrdersMap && window.customerOrdersMap[orderId]) {
        window.openOrderReceiptModal(window.customerOrdersMap[orderId]);
    } else {
        window.openOrderReceiptModal({
            id: orderId,
            tid: tid,
            created_at: createdAt,
            product_name: '주문 상품',
            total_price: 0
        });
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // [신규] 상단 로고 이미지 하단 우측으로 이동 동적 처리 (사용자 요청으로 제거됨)
    // const footerContainer = document.querySelector('.footer-container');
    // if (footerContainer && !document.querySelector('.footer-logo')) {
    //     const footerLogo = document.createElement('div');
    //     footerLogo.className = 'footer-logo';
    //     footerLogo.innerHTML = `<img src="assets/logo.png" alt="에스지라이뮤">`;
    //     footerContainer.appendChild(footerLogo);
    // }

    // ---------------------------------------------------------
    // 1. Search Logic (Should run first to be robust)
    // ---------------------------------------------------------
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const searchInput = document.querySelector('.search-input');

    // Pre-fill search input if on search page
    const urlParams = new URLSearchParams(window.location.search);
    const currentQuery = urlParams.get('q');
    if (currentQuery && searchInput) {
        searchInput.value = currentQuery;
    }

    function performSearch() {
        const input = document.querySelector('.search-input');
        const query = input ? input.value.trim() : '';
        
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        } else {
            window.location.href = 'search.html';
        }
    }

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#headerSearchBtn, .search-btn');
        if (btn && !e.target.closest('.recent-btn-aside')) {
            e.preventDefault();
            performSearch();
        }
    });

    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('search-input')) {
            performSearch();
        }
    });

    // ---------------------------------------------------------
    // 1-0. Search Autocomplete / Suggestions Dropdown
    // ---------------------------------------------------------
    const searchWrapper = document.querySelector('.search-wrapper');
    let suggestionsContainer = null;
    if (searchWrapper) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'search-suggestions';
        searchWrapper.appendChild(suggestionsContainer);
    }

    let debounceTimer = null;
    let selectedIndex = -1;

    if (searchInput && suggestionsContainer) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = searchInput.value.trim();
            if (query.length < 1) {
                hideSuggestions();
                return;
            }
            debounceTimer = setTimeout(() => fetchSuggestions(query), 200);
        });

        // Close suggestions dropdown when user clicks outside
        document.addEventListener('click', (e) => {
            if (searchWrapper && !searchWrapper.contains(e.target)) {
                hideSuggestions();
            }
        });

        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            const list = suggestionsContainer.querySelectorAll('.suggestion-item');
            if (list.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % list.length;
                updateSelectedSuggestion(list);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + list.length) % list.length;
                updateSelectedSuggestion(list);
            } else if (e.key === 'Enter') {
                if (selectedIndex > -1 && list[selectedIndex]) {
                    e.preventDefault();
                    list[selectedIndex].click();
                }
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });
    }

    function updateSelectedSuggestion(list) {
        list.forEach((el, idx) => {
            el.classList.toggle('selected', idx === selectedIndex);
        });
    }

    function hideSuggestions() {
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('active');
            suggestionsContainer.innerHTML = '';
        }
        selectedIndex = -1;
    }

    // 연관 검색어 정의 맵
    const RELATED_KEYWORDS_MAP = {
        "스티커": ["라벨용지", "분류용 라벨", "라벨키퍼", "양면테이프", "DLS라벨"],
        "라벨용지": ["스티커", "분류용 라벨", "라벨키퍼", "바코드라벨", "책꽂이라벨"],
        "라벨": ["스티커", "라벨키퍼", "바코드라벨", "분류용 라벨", "책꽂이라벨"],
        "바코드": ["바코드라벨", "도서대출", "사서용 리더기"],
        "책꽂이": ["북엔드", "서가", "책꽂이라벨"],
        "북엔드": ["책꽂이", "서가", "다이나믹 책꽂이"],
        "도서정리": ["분류용 라벨", "라벨키퍼", "북엔드", "색띠라벨"],
        "도서관": ["도서대출", "도서반납기", "북엔드", "분류용 라벨", "책소독기"],
        "소독": ["책소독기", "살균 소모품", "도서 소독"],
        "살균": ["책소독기", "살균 소모품", "필터"],
        "책소독기": ["살균 소모품", "책소독기 필터", "도서관 소독"],
        "가구": ["서가", "테이블", "의자", "코아스", "포머스", "퍼시스"],
        "서가": ["코아스 서가", "포머스 서가", "테이블", "의자"],
        "분실방지": ["도서분실방지", "EM 감응테이프", "스피드게이트"]
    };

    function getExpandedKeywords(query) {
        const keywords = [query];
        const lowerQuery = query.toLowerCase();
        
        for (const [key, relatedList] of Object.entries(RELATED_KEYWORDS_MAP)) {
            if (lowerQuery.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerQuery)) {
                relatedList.forEach(item => {
                    if (!keywords.some(k => k.toLowerCase() === item.toLowerCase())) {
                        keywords.push(item);
                    }
                });
            }
        }
        return keywords;
    }

    async function fetchSuggestions(query) {
        if (!query) return;
        try {
            // 연관 검색어 확장
            const searchTerms = getExpandedKeywords(query);
            const orFilter = searchTerms.map(term => `name.ilike.%${term}%,description.ilike.%${term}%`).join(',');

            // Fetch up to 6 products matching the query
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, price, image_url, short_comment')
                .or(orFilter)
                .limit(6);

            if (error) throw error;

            if (!products || products.length === 0) {
                renderNoSuggestions();
                return;
            }

            renderSuggestions(products, query);
        } catch (err) {
            console.error('Suggestions error:', err);
        }
    }

    function renderNoSuggestions() {
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = '<div class="suggestion-no-results">검색 결과가 없습니다.</div>';
            suggestionsContainer.classList.add('active');
        }
    }

    function renderSuggestions(products, query) {
        if (!suggestionsContainer) return;
        suggestionsContainer.innerHTML = '';
        
        const titleEl = document.createElement('div');
        titleEl.className = 'suggestion-list-title';
        titleEl.textContent = '연관 추천 제품';
        suggestionsContainer.appendChild(titleEl);

        selectedIndex = -1;

        products.forEach(p => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.onclick = () => {
                window.location.href = `product-detail.html?id=${p.id}`;
            };

            const imgUrl = p.image_url || 'assets/no-image.png';
            const priceStr = (!p.price || p.price === '전화문의') ? '전화문의' : Number(p.price).toLocaleString() + '원';
            const description = p.short_comment || '';

            // Highlight query string in name and description
            const highlightedName = highlightKeyword((p.name || '').replace(/<[^>]*>/g, ''), query);
            const highlightedDesc = highlightKeyword(description, query);

            item.innerHTML = `
                <div class="suggestion-thumb" style="background-image: url('${imgUrl}');"></div>
                <div class="suggestion-info">
                    <div class="suggestion-name">${highlightedName}</div>
                    ${description ? `<div class="suggestion-desc">${highlightedDesc}</div>` : ''}
                    <div class="suggestion-price">${priceStr}</div>
                </div>
            `;
            suggestionsContainer.appendChild(item);
        });

        suggestionsContainer.classList.add('active');
    }

    function highlightKeyword(text, keyword) {
        if (!text) return '';
        // Escape special regex characters in keyword
        const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        return text.replace(regex, '<mark class="suggestion-keyword-highlight">$1</mark>');
    }

    // ---------------------------------------------------------
    // 1-1. Recently Viewed Products Logic
    // ---------------------------------------------------------
    (function initRecentProducts() {
        // Inject popup HTML if not exists
        if (!document.getElementById('recentWindow')) {
            const popupHtml = `
            <div class="chat-window" id="recentWindow" style="height: 450px; bottom: 80px; right: 80px; width: 320px; z-index:9999;">
                <div class="chat-header" style="background:#2980b9;">
                    <h4><i class="fa-solid fa-clock-rotate-left"></i> 최근 본 상품</h4>
                    <button class="chat-close" id="recentCloseBtn">&times;</button>
                </div>
                <div class="chat-body" id="recentBody" style="background:#f4f6f8; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; height:calc(100% - 50px);">
                    <!-- Items injected by JS -->
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', popupHtml);
        }

        const recentWindow = document.getElementById('recentWindow');
        const recentBody = document.getElementById('recentBody');
        const recentCloseBtn = document.getElementById('recentCloseBtn');

        function renderRecentItems() {
            let items = [];
            try {
                items = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
            } catch(e){}

            recentBody.innerHTML = '';
            if (items.length === 0) {
                recentBody.innerHTML = `
                    <div style="text-align:center; padding: 40px 0; color:#999;">
                        <i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:15px; color:#ddd;"></i>
                        <p>최근 본 상품이 없습니다.</p>
                    </div>`;
                return;
            }

            items.forEach(item => {
                const priceStr = (!item.price || item.price === '전화문의') ? '전화문의' : Number(item.price).toLocaleString() + '원';
                const el = document.createElement('div');
                el.style.cssText = "display:flex; background:#fff; padding:10px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); cursor:pointer; gap:10px; align-items:center; transition:transform 0.2s;";
                el.onmouseover = () => el.style.transform = 'translateY(-2px)';
                el.onmouseout = () => el.style.transform = 'translateY(0)';
                el.onclick = () => window.location.href = `product-detail.html?id=${item.id}`;
                
                el.innerHTML = `
                    <div style="width:60px; height:60px; border-radius:4px; background-image:url('${item.image}'); background-size:contain; background-repeat:no-repeat; background-position:center; flex-shrink:0; border:1px solid #eee;"></div>
                    <div style="flex-grow:1; overflow:hidden;">
                        <div style="font-size:0.9rem; font-weight:600; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;">${item.name}</div>
                        <div style="font-size:0.85rem; color:#2980b9; font-weight:bold;">${priceStr}</div>
                    </div>
                `;
                recentBody.appendChild(el);
            });
        }

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.recent-btn-aside');
            if (btn) {
                e.preventDefault();
                const isHidden = !recentWindow.classList.contains('active');
                
                // 다른 팝업 닫기
                const wishlistWindow = document.getElementById('wishlistWindow');
                if (wishlistWindow) wishlistWindow.classList.remove('active');
                const cartOverlay = document.getElementById('cartOverlay');
                if (cartOverlay) cartOverlay.classList.remove('open');

                if (isHidden) {
                    renderRecentItems();
                    recentWindow.classList.add('active');
                } else {
                    recentWindow.classList.remove('active');
                }
            }
        });

        if (recentCloseBtn) {
            recentCloseBtn.addEventListener('click', () => {
                recentWindow.classList.remove('active');
            });
        }
    })();

    // ---------------------------------------------------------
    // 1-2. Wishlist Logic
    // ---------------------------------------------------------
    (function initWishlistProducts() {
        if (!document.getElementById('wishlistWindow')) {
            const popupHtml = `
            <div class="chat-window" id="wishlistWindow" style="height: 450px; bottom: 80px; right: 80px; width: 320px; z-index:9999;">
                <div class="chat-header" style="background:#e74c3c;">
                    <h4><i class="fa-solid fa-heart"></i> 관심상품</h4>
                    <button class="chat-close" id="wishlistCloseBtn">&times;</button>
                </div>
                <div class="chat-body" id="wishlistBody" style="background:#f4f6f8; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; height:calc(100% - 50px);">
                    <!-- Items injected by JS -->
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', popupHtml);
        }

        const wishlistWindow = document.getElementById('wishlistWindow');
        const wishlistBody = document.getElementById('wishlistBody');
        const wishlistCloseBtn = document.getElementById('wishlistCloseBtn');

        function renderWishlistItems() {
            let items = [];
            try {
                items = JSON.parse(localStorage.getItem('wishlist') || '[]');
            } catch(e){}

            wishlistBody.innerHTML = '';
            if (items.length === 0) {
                wishlistBody.innerHTML = `
                    <div style="text-align:center; padding: 40px 0; color:#999;">
                        <i class="fa-regular fa-heart" style="font-size:3rem; margin-bottom:15px; color:#ddd;"></i>
                        <p>등록된 관심상품이 없습니다.</p>
                    </div>`;
                return;
            }

            items.forEach(item => {
                const priceStr = (!item.price || item.price === '전화문의') ? '전화문의' : Number(item.price).toLocaleString() + '원';
                const el = document.createElement('div');
                el.style.cssText = "display:flex; background:#fff; padding:10px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); cursor:pointer; gap:10px; align-items:center; transition:transform 0.2s; position:relative;";
                el.onmouseover = () => el.style.transform = 'translateY(-2px)';
                el.onmouseout = () => el.style.transform = 'translateY(0)';
                
                el.innerHTML = `
                    <div onclick="window.location.href='product-detail.html?id=${item.id}'" style="width:60px; height:60px; border-radius:4px; background-image:url('${item.image}'); background-size:contain; background-repeat:no-repeat; background-position:center; flex-shrink:0; border:1px solid #eee;"></div>
                    <div onclick="window.location.href='product-detail.html?id=${item.id}'" style="flex-grow:1; overflow:hidden;">
                        <div style="font-size:0.9rem; font-weight:600; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;">${item.name}</div>
                        <div style="font-size:0.85rem; color:#e74c3c; font-weight:bold;">${priceStr}</div>
                    </div>
                    <button class="remove-wish-btn" style="border:none; background:transparent; color:#ccc; cursor:pointer; padding:5px;"><i class="fa-solid fa-xmark"></i></button>
                `;

                // 개별 삭제 버튼 이벤트
                const removeBtn = el.querySelector('.remove-wish-btn');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    let currentList = JSON.parse(localStorage.getItem('wishlist') || '[]');
                    currentList = currentList.filter(w => w.id !== item.id);
                    localStorage.setItem('wishlist', JSON.stringify(currentList));
                    renderWishlistItems();
                    
                    // 상세페이지인 경우 하트 아이콘 해제
                    const btnWishlist = document.getElementById('btnWishlist');
                    if (btnWishlist && typeof product !== 'undefined' && product.id === item.id) {
                        const wishIcon = btnWishlist.querySelector('i');
                        if (wishIcon) {
                            wishIcon.classList.replace('fa-solid', 'fa-regular');
                            wishIcon.style.color = '';
                        }
                    }
                });

                wishlistBody.appendChild(el);
            });
        }

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.wishlist-btn-aside');
            if (btn) {
                e.preventDefault();
                // 창이 열려있지 않다면
                const isHidden = !wishlistWindow.classList.contains('active');
                
                // 다른 팝업 닫기
                const recentWindow = document.getElementById('recentWindow');
                if (recentWindow) recentWindow.classList.remove('active');
                const cartOverlay = document.getElementById('cartOverlay');
                if (cartOverlay) cartOverlay.classList.remove('open');

                if (isHidden) {
                    renderWishlistItems();
                    wishlistWindow.classList.add('active');
                } else {
                    wishlistWindow.classList.remove('active');
                }
            }
            
            // 최근 본 상품 버튼을 누르면 관심상품 창을 닫기
            if (e.target.closest('.recent-btn-aside')) {
                wishlistWindow.classList.remove('active');
            }
        });

        if (wishlistCloseBtn) {
            wishlistCloseBtn.addEventListener('click', () => {
                wishlistWindow.classList.remove('active');
            });
        }
    })();

    // ---------------------------------------------------------
    // 1-3. Order & Delivery Tracking Logic
    // ---------------------------------------------------------
    (function initOrderTracking() {
        if (!document.getElementById('orderTrackingWindow')) {
            const popupHtml = `
            <div class="chat-window" id="orderTrackingWindow" style="height: 450px; bottom: 80px; right: 80px; width: 340px; z-index:9999;">
                <div class="chat-header" style="background:#2c5f2d;">
                    <h4><i class="fa-solid fa-truck"></i> 주문/배송 조회</h4>
                    <button class="chat-close" id="orderTrackingCloseBtn">&times;</button>
                </div>
                <div class="chat-body" id="orderTrackingBody" style="background:#f4f6f8; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; height:calc(100% - 50px);">
                    <!-- Content will be injected by JS -->
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', popupHtml);
        }

        const trackingWindow = document.getElementById('orderTrackingWindow');
        const trackingBody = document.getElementById('orderTrackingBody');
        const trackingCloseBtn = document.getElementById('orderTrackingCloseBtn');

        async function renderTrackingContent() {
            trackingBody.innerHTML = '';
            
            // 1. 로그인 여부 확인
            let userProfile = null;
            if (window.supabase) {
                try {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) {
                        const { data: profile } = await window.supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', user.id)
                            .single();
                        userProfile = profile;
                    }
                } catch(e) {
                    console.error("Failed to check auth for tracking:", e);
                }
            }

            if (userProfile) {
                // 로그인 회원의 경우 자동 조회
                trackingBody.innerHTML = `
                    <div style="text-align:center; padding:10px 0; border-bottom:1px dashed #eee; margin-bottom:10px;">
                        <span style="font-size:0.9rem; font-weight:600; color:#555;"><b>${userProfile.full_name}</b> 님의 주문 내역</span>
                    </div>
                    <div id="trackingListContainer" style="display:flex; flex-direction:column; gap:10px;">
                        <div style="text-align:center; padding:30px 0; color:#999;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px;"></i><p>조회 중...</p></div>
                    </div>
                `;
                fetchAndRenderOrders(userProfile.full_name, userProfile.phone);
            } else {
                // 비로그인의 경우 조회 폼 제공
                trackingBody.innerHTML = `
                    <div style="background:#fff; padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:10px; margin-bottom:5px;">
                        <div style="font-size:0.9rem; font-weight:600; color:#333;">비회원 주문 조회</div>
                        <input type="text" id="trackNameInput" placeholder="주문자 이름" style="width:100%; height:36px; padding:0 10px; border:1px solid #ddd; border-radius:6px; outline:none; font-size:0.85rem;">
                        <input type="tel" id="trackPhoneInput" placeholder="연락처 (예: 010-1234-5678)" style="width:100%; height:36px; padding:0 10px; border:1px solid #ddd; border-radius:6px; outline:none; font-size:0.85rem;">
                        <button id="btnSearchTracking" style="width:100%; height:38px; background:#2c5f2d; color:#fff; border-radius:6px; font-weight:600; font-size:0.9rem; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
                            <i class="fa-solid fa-magnifying-glass"></i> 조회하기
                        </button>
                    </div>
                    <div id="trackingListContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
                `;

                const btnSearch = document.getElementById('btnSearchTracking');
                if (btnSearch) {
                    btnSearch.addEventListener('click', () => {
                        const name = document.getElementById('trackNameInput').value.trim();
                        const phone = document.getElementById('trackPhoneInput').value.trim();
                        if (!name || !phone) {
                            alert("이름과 연락처를 모두 입력해 주세요.");
                            return;
                        }
                        const listContainer = document.getElementById('trackingListContainer');
                        listContainer.innerHTML = `<div style="text-align:center; padding:30px 0; color:#999;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px;"></i><p>조회 중...</p></div>`;
                        fetchAndRenderOrders(name, phone);
                    });
                }
            }
        }

        async function fetchAndRenderOrders(name, phone) {
            const listContainer = document.getElementById('trackingListContainer');
            if (!listContainer) return;

            try {
                if (!window.supabase) {
                    throw new Error("Supabase client not loaded.");
                }

                const { data: allOrders, error } = await window.supabase
                    .from('orders')
                    .select('*')
                    .eq('customer_phone', phone)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // DB에는 customer_name이 "이름||결제수단||소속기관||품목JSON" 형식으로 저장되어 있을 수 있으므로
                // 이름 부분만 추출하여 입력받은 name과 대조합니다.
                const orders = (allOrders || []).filter(order => {
                    if (!order.customer_name) return false;
                    const parts = order.customer_name.split('||');
                    return parts[0] === name;
                });

                listContainer.innerHTML = '';

                if (!orders || orders.length === 0) {
                    listContainer.innerHTML = `
                        <div style="text-align:center; padding:40px 0; color:#999;">
                            <i class="fa-solid fa-circle-info" style="font-size:2.5rem; margin-bottom:12px; color:#ddd;"></i>
                            <p style="font-size:0.9rem;">주문 내역이 존재하지 않습니다.</p>
                        </div>`;
                    return;
                }

                orders.forEach(order => {
                    const priceStr = order.total_price.toLocaleString() + '원';
                    const dateObj = new Date(order.created_at);
                    const dateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth()+1).toString().padStart(2,'0')}-${dateObj.getDate().toString().padStart(2,'0')}`;
                    
                    // TID 추출 (order.tid 필드 또는 customer_name 내의 ||TID:... 파싱)
                    let orderTid = order.tid || null;
                    if (!orderTid && order.customer_name && order.customer_name.includes('||TID:')) {
                        const m = order.customer_name.match(/\|\|TID:([^|]+)/);
                        if (m) orderTid = m[1];
                    }

                    window.customerOrdersMap[order.id] = order;

                    // 결제완료(준비중/배송중/배송완료 등) 또는 카드/계좌이체 결제건은 영수증 버튼 무조건 생성!
                    const isPaid = order.status !== 'pending' && order.status !== '결제대기' && order.status !== 'cancel' && order.status !== '취소';
                    const isOnlinePay = order.customer_name && (order.customer_name.includes('||CARD||') || order.customer_name.includes('||BANK||'));

                    let receiptBtnHtml = '';
                    if (orderTid || isPaid || isOnlinePay) {
                        receiptBtnHtml = `<button onclick="openOrderReceiptModal(window.customerOrdersMap[${order.id}])" title="영수증 자동 확인/출력" style="background:#f0f7ff; border:1px solid #1a73e8; color:#1a73e8; font-size:0.75rem; padding:3px 8px; border-radius:4px; cursor:pointer; font-weight:bold; display:inline-flex; align-items:center; gap:3px;"><i class="fa-solid fa-receipt"></i> 영수증</button>`;
                    }

                    // 주문 상태 텍스트 및 스타일 결정
                    let statusLabel = '결제대기';
                    let statusColor = '#e67e22'; // orange
                    let statusBg = '#fdf2e9';

                    if (order.status === 'pending' || order.status === '결제대기') {
                        statusLabel = '결제대기';
                        statusColor = '#e67e22';
                        statusBg = '#fdf2e9';
                    } else if (order.status === '준비중' || order.status === '배송준비중') {
                        statusLabel = '배송준비중';
                        statusColor = '#2980b9'; // blue
                        statusBg = '#ebf5fb';
                    } else if (order.status === '배송중') {
                        statusLabel = '배송중';
                        statusColor = '#2c5f2d'; // green
                        statusBg = '#eaf2e8';
                    } else if (order.status === '배송완료') {
                        statusLabel = '배송완료';
                        statusColor = '#27ae60'; // bright green
                        statusBg = '#e8f8f5';
                    } else if (order.status === 'cancel' || order.status === '취소') {
                        statusLabel = '주문취소';
                        statusColor = '#7f8c8d'; // gray
                        statusBg = '#f2f4f4';
                    }

                    const card = document.createElement('div');
                    card.style.cssText = "background:#fff; padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:8px; border: 1px solid #f0f0f0;";
                    
                    let trackingHtml = '';
                    if (order.tracking_number) {
                        const courierName = order.delivery_company || '';
                        const searchQuery = courierName ? `${courierName} ${order.tracking_number}` : order.tracking_number;
                        const displayCourier = courierName ? `<span style="font-size:0.72rem; color:#7f8c8d; background:#f2f4f4; padding:2px 5px; border-radius:3px; margin-right:4px;">${courierName}</span>` : '';

                        trackingHtml = `
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #f0f0f0; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                                <span style="color:#666; display:flex; align-items:center;">
                                    ${displayCourier}
                                    <strong style="color:#2c3e50; font-family:monospace;">${order.tracking_number}</strong>
                                </span>
                                <a href="https://search.naver.com/search.naver?query=${encodeURIComponent(searchQuery)}" target="_blank" style="color:#3498db; text-decoration:none; font-weight:700; font-size:0.75rem; display: flex; align-items: center; gap: 3px;">
                                    배송조회 <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.7rem;"></i>
                                </a>
                            </div>
                        `;
                    }

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f7f7f7; padding-bottom:8px;">
                            <span style="font-size:0.78rem; color:#777; font-weight:600;">주문일: ${dateStr}</span>
                            <div style="display:flex; align-items:center; gap:6px;">
                                ${receiptBtnHtml}
                                <span style="font-size:0.75rem; font-weight:700; color:${statusColor}; background:${statusBg}; padding:2px 8px; border-radius:20px;">${statusLabel}</span>
                            </div>
                        </div>
                        <div style="font-size:0.9rem; font-weight:700; color:#333; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${order.product_name}">
                            ${order.product_name}
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; margin-top:2px;">
                            <span style="color:#666;">수량: ${order.quantity}개</span>
                            <span style="font-weight:700; color:var(--color-primary);">${priceStr}</span>
                        </div>
                        ${trackingHtml}
                    `;
                    listContainer.appendChild(card);
                });

            } catch (err) {
                console.error("Failed to fetch orders:", err);
                listContainer.innerHTML = `<div style="text-align:center; padding:30px 0; color:#e74c3c;"><p>조회 실패: ${err.message || '오류 발생'}</p></div>`;
            }
        }

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('a.banner-btn[title="주문배송"], a.banner-btn[title*="주문"]');
            if (btn) {
                e.preventDefault();
                const isHidden = !trackingWindow.classList.contains('active');
                
                // 다른 팝업(관심상품, 최근본상품, 장바구니 등) 닫기
                const recentWindow = document.getElementById('recentWindow');
                if (recentWindow) recentWindow.classList.remove('active');
                const wishlistWindow = document.getElementById('wishlistWindow');
                if (wishlistWindow) wishlistWindow.classList.remove('active');
                const cartOverlay = document.getElementById('cartOverlay');
                if (cartOverlay) cartOverlay.classList.remove('open');

                if (isHidden) {
                    renderTrackingContent();
                    trackingWindow.classList.add('active');
                } else {
                    trackingWindow.classList.remove('active');
                }
            }

            // 최근본상품이나 관심상품 버튼을 누르면 이 창을 닫기
            if (e.target.closest('.recent-btn-aside, .wishlist-btn-aside, .cart-btn-aside')) {
                trackingWindow.classList.remove('active');
            }
        });

        if (trackingCloseBtn) {
            trackingCloseBtn.addEventListener('click', () => {
                trackingWindow.classList.remove('active');
            });
        }
    })();

    // ---------------------------------------------------------
    // 2. Slider Logic (Home Page Only)
    // ---------------------------------------------------------
    const sliderContainer = document.getElementById('sliderContainer');
    const dotsContainer = document.getElementById('sliderDots');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (sliderContainer && dotsContainer && prevBtn && nextBtn) {
        const fallbackSlides = [
            {
                title: "프리미엄 북엔드 시리즈",
                desc: "흔들림 없는 독서의 완성",
                imgUrl: "assets/hero_slide_1.png",
                link: "#"
            },
            {
                title: "모던 도서관 공간",
                desc: "공간을 가치있게 만드는 디자인",
                imgUrl: "assets/hero_slide_2.png",
                link: "#"
            },
            {
                title: "🎉 쇼핑몰 재오픈 기념! 🎉",
                desc: "지금만 누릴 수 있는 특별 할인",
                imgUrl: "assets/hero_slide_update_3.png",
                link: "#"
            }
        ];

        let currentSlide = 0;
        let slideInterval;
        const intervalTime = 5000;

        let slidesData = [];
        let popupsData = [];
        try {
            const { data, error } = await supabase.from('banners').select('*').eq('is_active', true).order('display_order', { ascending: true }).order('created_at', { ascending: false });
            if (!error && data && data.length > 0) {
                slidesData = data.filter(b => b.type === 'slide').map(b => ({
                    imgUrl: b.image_url,
                    link: b.link_url || '#'
                }));
                popupsData = data.filter(b => b.type === 'popup');
            }
        } catch (err) {
            console.error("Banner fetch error", err);
        }

        if (slidesData.length === 0) {
            slidesData = fallbackSlides;
        }

        function initSlider() {
            sliderContainer.innerHTML = '';
            dotsContainer.innerHTML = '';

            slidesData.forEach((slide, index) => {
                const slideEl = document.createElement('div');
                slideEl.className = `slide ${index === 0 ? 'active' : ''}`;
                
                const hasLink = slide.link && slide.link !== '#';
                const imgEl = `<img src="${slide.imgUrl}" alt="Main Slide Banner" class="slide-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'1920\\' height=\\'1080\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%2334495e\\'/></svg>'">`;
                const contentEl = slide.title ? `
                    <div class="slide-content">
                        <h2>${slide.title}</h2>
                        <p>${slide.desc}</p>
                    </div>
                ` : '';

                if(hasLink) {
                    slideEl.innerHTML = `<a href="${slide.link}" style="display:block; width:100%; height:100%;">${imgEl}${contentEl}</a>`;
                } else {
                    slideEl.innerHTML = `${imgEl}${contentEl}`;
                }
                sliderContainer.appendChild(slideEl);

                const dotEl = document.createElement('div');
                dotEl.className = `dot ${index === 0 ? 'active' : ''}`;
                dotEl.addEventListener('click', () => goToSlide(index));
                dotsContainer.appendChild(dotEl);
            });

            startSlideShow();
        }

        function goToSlide(index) {
            const slides = document.querySelectorAll('.slide');
            const dots = document.querySelectorAll('.dot');
            if (slides.length === 0) return;
            
            slides[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');
            
            currentSlide = (index + slides.length) % slides.length;
            
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        }

        function nextSlide() {
            goToSlide(currentSlide + 1);
        }

        function prevSlide() {
            goToSlide(currentSlide - 1);
        }

        function startSlideShow() {
            slideInterval = setInterval(nextSlide, intervalTime);
        }

        function stopSlideShow() {
            clearInterval(slideInterval);
        }

        prevBtn.addEventListener('click', () => {
            stopSlideShow();
            prevSlide();
            startSlideShow();
        });

        nextBtn.addEventListener('click', () => {
            stopSlideShow();
            nextSlide();
            startSlideShow();
        });

        sliderContainer.addEventListener('mouseenter', stopSlideShow);
        sliderContainer.addEventListener('mouseleave', startSlideShow);

        initSlider();

        // Popups
        popupsData.forEach((popup, index) => {
            const cookieName = `hide_popup_${popup.id}`;
            if (!getCookie(cookieName)) {
                const popupEl = document.createElement('div');
                popupEl.className = 'main-popup-layer';
                popupEl.style.position = 'fixed';
                popupEl.style.top = '100px';
                popupEl.style.left = (100 + (index * 520)) + 'px'; 
                popupEl.style.width = '450px';
                popupEl.style.backgroundColor = '#fff';
                popupEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
                popupEl.style.zIndex = '9999';
                popupEl.style.borderRadius = '8px';
                popupEl.style.overflow = 'hidden';

                const linkStr = (popup.link_url && popup.link_url !== '#') ? `href="${popup.link_url}" target="_blank"` : '';
                const aTagStart = linkStr ? `<a ${linkStr} style="display:block;">` : '<div>';
                const aTagEnd = linkStr ? `</a>` : '</div>';

                popupEl.innerHTML = `
                    ${aTagStart}
                        <img src="${popup.image_url}" alt="Popup" style="width:100%; display:block; border-bottom:1px solid #eee;">
                    ${aTagEnd}
                    <div style="background:#f9f9f9; padding:10px; display:flex; justify-content:space-between; align-items:center; font-size:0.9rem;">
                        <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                            <input type="checkbox" id="nottoday_${popup.id}"> 오늘 하루 보지 않기
                        </label>
                        <button id="close_popup_${popup.id}" style="border:none; background:transparent; cursor:pointer; font-weight:bold; color:#666;">닫기 <i class="fa-solid fa-xmark"></i></button>
                    </div>
                `;
                document.body.appendChild(popupEl);

                document.getElementById(`close_popup_${popup.id}`).addEventListener('click', () => {
                    const isChecked = document.getElementById(`nottoday_${popup.id}`).checked;
                    if (isChecked) {
                        setCookie(cookieName, 'true', 1);
                    }
                    popupEl.style.display = 'none';
                });
            }
        });
    }

    // Cookie functions (outside of if block if needed elsewhere, but kept here for scope)
    function getCookie(name) {
        const matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }

    function setCookie(name, value, days) {
        let date = new Date();
        date.setDate(date.getDate() + days);
        document.cookie = name + "=" + value + "; path=/; expires=" + date.toUTCString();
    }

    // ---------------------------------------------------------
    // 3. Scroll Logic (Global)
    // ---------------------------------------------------------
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const scrollBottomBtn = document.getElementById('scrollBottomBtn');

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (scrollBottomBtn) {
        scrollBottomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        });
    }

    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (header) {
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
            } else {
                header.style.boxShadow = 'none';
            }
        }
    });

    // ---------------------------------------------------------
    // 3-1. Mobile Menu Logic
    // ---------------------------------------------------------
    const mobileMenuToggle = document.getElementById('mobileMenuToggle') || document.querySelector('.mobile-menu-toggle');
    const mainGnb = document.getElementById('mainGnb') || document.querySelector('.gnb');

    if (mobileMenuToggle && mainGnb) {
        mobileMenuToggle.addEventListener('click', () => {
            mainGnb.classList.toggle('active');
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                if (mainGnb.classList.contains('active')) {
                    icon.classList.replace('fa-bars', 'fa-xmark');
                } else {
                    icon.classList.replace('fa-xmark', 'fa-bars');
                }
            }
        });
    }

    if (mainGnb) {
        // 모바일 서브메뉴 토글 (이벤트 위임)
        mainGnb.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                const aTag = e.target.closest('a');
                if (!aTag) return;
                
                const parentLi = aTag.closest('.has-submenu');
                
                // 대분류 카테고리(하위 메뉴가 있는 최상위 항목) 클릭 시 아코디언 토글 및 링크 이동 방지
                if (parentLi && !aTag.closest('.submenu')) {
                    e.preventDefault();
                    parentLi.classList.toggle('active');
                }
            }
        });
    }

    // ---------------------------------------------------------
    // 4. Product Tabs Logic (Home Page Only)
    // ---------------------------------------------------------

    // [신규] 메인 홈페이지 베스트 상품 동적 구성 및 로드
    async function initDynamicBestProducts() {
        const tabContainer = document.getElementById('dynamic-best-tabs');
        const contentContainer = document.getElementById('dynamic-best-contents');
        if (!tabContainer || !contentContainer) return;

        try {
            // 1. 섹션 정보 가져오기
            const { data: configData, error } = await supabase.from('site_configs').select('value').eq('key', 'site_best_sections').single();
            const sections = (configData && configData.value) ? configData.value : [
                { id: 'home_best_rfid', label: 'RFID 시스템' },
                { id: 'home_best_supplies', label: '도서관 용품' },
                { id: 'home_best_furniture', label: '도서관 가구' },
                { id: 'home_best_sign', label: '사인물' }
            ];

            // 2. 탭 및 그리드 생성
            tabContainer.innerHTML = '';
            contentContainer.innerHTML = '';

            if (!Array.isArray(sections) || sections.length === 0) {
                tabContainer.innerHTML = '<div style="color:#999; font-size:0.9rem;">설정된 섹션이 없습니다.</div>';
                return;
            }

            sections.forEach((s, index) => {
                // 탭 버튼
                const btn = document.createElement('button');
                btn.className = `tab-item ${index === 0 ? 'active' : ''}`;
                btn.setAttribute('data-tab', `tab-${s.id}`);
                btn.textContent = s.label;
                btn.onclick = () => {
                    document.querySelectorAll('#dynamic-best-tabs .tab-item').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('#dynamic-best-contents .tab-content').forEach(c => c.classList.remove('active'));
                    btn.classList.add('active');
                    const target = document.getElementById(`tab-${s.id}`);
                    if (target) {
                        target.classList.add('active');
                        target.querySelectorAll('.product-card').forEach((card, idx) => {
                            card.classList.remove('visible');
                            setTimeout(() => card.classList.add('visible'), 50 + (idx * 100));
                        });
                    }
                };
                tabContainer.appendChild(btn);

                // 컨텐츠 (그리드)
                const content = document.createElement('div');
                content.id = `tab-${s.id}`;
                content.className = `tab-content ${index === 0 ? 'active' : ''}`;
                content.innerHTML = `<div class="product-grid" id="grid-${s.id}"><!-- Products will be loaded here --></div>`;
                contentContainer.appendChild(content);

                // 데이터 로드
                if (window.loadDisplayProducts) {
                    window.loadDisplayProducts(`grid-${s.id}`, s.id);
                }
            });
        } catch (err) {
            console.error("initDynamicBestProducts Error:", err);
        }
    }

    // ---------------------------------------------------------
    // 5. Live Chat Widget Logic (Global & Real-time)
    // ---------------------------------------------------------
    const chatWindow = document.getElementById('chatWindow');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatBody = document.getElementById('chatBody');

    // 1) 채팅 세션 및 유저 정보 가져오기
    async function getChatUserInfo() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            const user = session.user;
            // 우선 profiles 테이블에서 이름을 가져오고, 없으면 metadata에서 가져옴
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            const name = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '회원';
            return { id: user.id, name: name };
        } else {
            let guestId = localStorage.getItem('chat_session_id');
            if (!guestId) {
                guestId = 'guest_' + Math.random().toString(36).substring(2, 11);
                localStorage.setItem('chat_session_id', guestId);
            }
            return { id: guestId, name: 'Guest' };
        }
    }

    // 전역 변수로 현재 세션 정보 유지
    let currentChatUser = { id: '', name: 'Guest' };

    // 2) 채팅창 토글 및 내역 로드
    async function toggleChat() {
        if (!chatWindow) return;
        const isActive = chatWindow.classList.toggle('active');
        
        if (isActive) {
            currentChatUser = await getChatUserInfo();
            if (chatInput) setTimeout(() => chatInput.focus(), 300);
            await loadChatHistory();
            subscribeToChat();
        } else {
            unsubscribeFromChat();
        }
    }

    // 3) 대화 내역 불러오기
    async function loadChatHistory() {
        if (!chatBody) return;
        
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', currentChatUser.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('채팅 내역 로드 실패:', error);
            return;
        }

        chatBody.innerHTML = `<div class="message system-msg">안녕하세요 ${currentChatUser.name}님!<br>무엇을 도와드릴까요?</div>`;
        data.forEach(msg => {
            renderMessage(msg.message, msg.sender_role === 'customer' ? 'user' : 'system');
        });
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // 4) 메시지 렌더링 함수
    function renderMessage(text, type) {
        if (!chatBody) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type === 'user' ? 'user-msg' : 'system-msg'}`;
        msgDiv.textContent = text;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // 5) 실시간 메시지 구독
    let chatChannel = null;
    function subscribeToChat() {
        if (chatChannel) return;
        chatChannel = supabase
            .channel('chat_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${currentChatUser.id}`
            }, (payload) => {
                const newMsg = payload.new;
                if (newMsg.sender_role === 'admin') {
                    renderMessage(newMsg.message, 'system');
                }
            })
            .subscribe();
    }

    function unsubscribeFromChat() {
        if (chatChannel) {
            supabase.removeChannel(chatChannel);
            chatChannel = null;
        }
    }

    // 6) 메시지 전송
    async function sendChatMessage() {
        if (!chatInput || !chatBody) return;
        const text = chatInput.value.trim();
        if (text === '') return;

        // 화면에 즉시 표시
        renderMessage(text, 'user');
        chatInput.value = '';

        // DB 저장 (로그인 정보 반영)
        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                room_id: currentChatUser.id,
                sender_role: 'customer',
                sender_name: currentChatUser.name,
                message: text
            }]);

        if (error) {
            console.error('메시지 전송 실패:', error);
        }
    }

    // 트리거 설정
    const chatTriggers = document.querySelectorAll('.chat-trigger, #chatTriggerBtn');
    chatTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            toggleChat();
        });
    });

    if (chatCloseBtn) {
        chatCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleChat();
        });
    }

    if (chatSendBtn && chatInput) {
        chatSendBtn.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    // ---------------------------------------------------------
    // 6. Scroll Reveal Animation Logic (Global)
    // ---------------------------------------------------------
    const revealElements = document.querySelectorAll('.section-title, .product-tabs, .product-card');
    if (revealElements.length > 0) {
        revealElements.forEach(el => el.classList.add('reveal-up'));

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, 50);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        });

        setTimeout(() => {
            revealElements.forEach((el) => {
                revealObserver.observe(el);
            });
        }, 100);
    }

    // ---------------------------------------------------------
    // 7. Dynamic Category Navigation (GNB)
    // ---------------------------------------------------------
    async function initDynamicNav() {
        const gnbUl = document.querySelector('.gnb > ul');
        if (!gnbUl) return;

        try {
            // site_configs 테이블에서 카테고리 정보 로드
            const { data, error } = await supabase.from('site_configs').select('value').eq('key', 'site_categories').single();
            if (error || !data) {
                console.warn("Dynamic Nav: site_categories not found, using static menu.");
                return;
            }

            const categories = data.value;
            gnbUl.innerHTML = '';

            // 대분류 정렬 (order 기준)
            const sortedMajors = Object.keys(categories).sort((a, b) => 
                (categories[a].order || 0) - (categories[b].order || 0)
            );

            for (const mKey of sortedMajors) {
                const major = categories[mKey];
                const li = document.createElement('li');
                

                
                const middles = major.middles || {};
                const middleKeys = Object.keys(middles);
                
                if (middleKeys.length > 0) {
                    li.className = 'has-submenu';
                    
                    // 중간분류 정렬
                    const sortedMiddles = middleKeys.sort((a, b) => 
                        (middles[a].order || 0) - (middles[b].order || 0)
                    );

                    let middlesHtml = '';
                    for (const midKey of sortedMiddles) {
                        const middle = middles[midKey];
                        
                        // 기존 페이지 매핑 로직 (ID 기반)
                        // [수정] 카테고리 링크 결정 로직 고도화
                        let link = '#';
                        const lowerKey = midKey.toLowerCase();
                        
                        if (lowerKey === 'rfid') link = 'rfid.html';
                        else if (lowerKey === 'em') link = 'em.html';
                        else if (lowerKey.includes('arrange')) link = 'supplies-arrange.html';
                        else if (lowerKey.includes('protect')) link = 'supplies-protect.html';
                        else if (lowerKey.includes('lend')) link = 'supplies-lend.html';
                        else if (lowerKey === 'sterilizer' || lowerKey.includes('etc')) link = 'sterilizer.html';
                        else if (lowerKey === 'koas') link = 'furniture-koas.html';
                        else if (lowerKey === 'fomus') link = 'furniture-fomus.html';
                        else if (lowerKey === 'fursys') link = 'furniture-fursys.html';
                        else if (lowerKey === 'custom') link = 'furniture-custom.html';
                        else if (lowerKey === 'sign' || lowerKey.includes('class')) link = 'sign-class.html';
                        else if (lowerKey.includes('board')) link = 'sign-board.html';
                        else if (lowerKey.includes('date')) link = 'sign-date.html';
                        else if (lowerKey.includes('custom_sign')) link = 'sign-custom.html';
                        else {
                            // 등록되지 않은 새로운 카테고리인 경우 동적 페이지로 연결
                            link = `category.html?id=${midKey}`; 
                        }
                        
                        middlesHtml += `<li><a href="${link}">${middle.label}</a></li>`;
                    }

                    li.innerHTML = `
                        <a href="javascript:void(0);">${major.label}</a>
                        <ul class="submenu">
                            ${middlesHtml}
                        </ul>
                    `;
                } else {
                    // 하위 메뉴가 없는 경우 실제 카테고리 링크로 이동
                    li.innerHTML = `<a href="category.html?id=${mKey}">${major.label}</a>`;
                }
                gnbUl.appendChild(li);
            }
            
            // 할인상품 메뉴는 상단 루프에서 mKey === 'discount' 조건으로 처리됨

        } catch (err) {
            console.error("GNB Load Error:", err);
        }
    }

    initDynamicNav();

    // [신규] 검색창을 GNB(메뉴) 바로 뒤로 동적 이동시켜 완벽한 중앙 배치를 실현하는 로직
    (function moveSearchWrapper() {
        const searchWrapper = document.querySelector('.search-wrapper');
        const gnb = document.getElementById('mainGnb');
        if (searchWrapper && gnb) {
            gnb.parentNode.insertBefore(searchWrapper, gnb.nextSibling);
        }
    })();

    // ---------------------------------------------------------
    // 8. Global Product Loading Logic
    // ---------------------------------------------------------
    // [신규] description 태그에서 옵션(색상/사이즈)을 파싱하는 헬퍼 함수
    function parseProductOptions(product) {
        if (!product) return { colors: '', sizes: '' };
        let colors = product.colors || '';
        let sizes = product.sizes || '';
        
        // colors 컬럼이 없거나 비어있는 경우 description에서 파싱
        if (!colors && product.description) {
            const match = product.description.match(/\[\[C:(.*?)\]\]/);
            if (match) colors = match[1];
        }
        // sizes 컬럼이 없거나 비어있는 경우 description에서 파싱
        if (!sizes && product.description) {
            const match = product.description.match(/\[\[S:(.*?)\]\]/);
            if (match) sizes = match[1];
        }
        
        return { colors, sizes };
    }
    window.parseProductOptions = parseProductOptions;

    // [신규] 상품 카드 옵션(색상/사이즈) 표시 마크업 생성 함수
    function renderProductOptionsMarkup(colorsStr, sizesStr) {
        let html = '';
        
        // 색상 파싱 & 렌더링
        let colorHtml = '';
        if (colorsStr) {
            const colors = colorsStr.split(',').map(c => c.trim()).filter(c => c);
            if (colors.length > 0) {
                const colorMap = {
                    '블랙': '#000000', 'black': '#000000', '검정': '#000000', '검은색': '#000000',
                    '화이트': '#ffffff', 'white': '#ffffff', '흰색': '#ffffff', '하얀색': '#ffffff',
                    '그레이': '#808080', 'gray': '#808080', 'grey': '#808080', '회색': '#808080',
                    '실버': '#c0c0c0', 'silver': '#c0c0c0', '은색': '#c0c0c0',
                    '레드': '#e74c3c', 'red': '#e74c3c', '빨강': '#e74c3c', '빨간색': '#e74c3c',
                    '블루': '#3498db', 'blue': '#3498db', '파랑': '#3498db', '파란색': '#3498db',
                    '그린': '#2ecc71', 'green': '#2ecc71', '초록': '#2ecc71', '초록색': '#2ecc71',
                    '옐로우': '#f1c40f', 'yellow': '#f1c40f', '노랑': '#f1c40f', '노란색': '#f1c40f',
                    '오렌지': '#e67e22', 'orange': '#e67e22', '주황': '#e67e22', '주황색': '#e67e22',
                    '퍼플': '#9b59b6', 'purple': '#9b59b6', '보라': '#9b59b6', '보라색': '#9b59b6',
                    '핑크': '#e84393', 'pink': '#e84393', '분홍': '#e84393', '분홍색': '#e84393',
                    '브라운': '#8d6e63', 'brown': '#8d6e63', '갈색': '#8d6e63',
                    '베이지': '#f5f5dc', 'beige': '#f5f5dc',
                    '네이비': '#1b4f72', 'navy': '#1b4f72', '남색': '#1b4f72',
                    '골드': '#d4af37', 'gold': '#d4af37', '금색': '#d4af37',
                    '오크': '#c29b6f', 'oak': '#c29b6f',
                    '메이플': '#e1b885', 'maple': '#e1b885',
                    '월넛': '#5c4033', 'walnut': '#5c4033',
                    '옹이': '#d2b48c',
                    '아카시아': '#b8860b'
                };
                
                colorHtml += `<div class="card-color-chips" style="display:flex; gap:4px; align-items:center;">`;
                colors.forEach(c => {
                    const parts = c.split(':');
                    const cName = parts[0] || c;
                    const lowerC = cName.toLowerCase();
                    let bgColor = '#e0e0e0';
                    let isMapped = false;
                    
                    for (const key in colorMap) {
                        if (lowerC.includes(key)) {
                            bgColor = colorMap[key];
                            isMapped = true;
                            break;
                        }
                    }
                    
                    const borderStyle = (bgColor === '#ffffff' || bgColor === '#f5f5dc' || lowerC === '화이트' || lowerC === 'white') 
                        ? 'border: 1px solid #ccc;' 
                        : 'border: 1px solid transparent;';
                    
                    if (isMapped) {
                        colorHtml += `<span class="color-dot" title="${cName}" style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${bgColor}; ${borderStyle}"></span>`;
                    } else {
                        colorHtml += `<span class="color-text-chip" title="${cName}" style="font-size:0.7rem; background:#f1f3f5; color:#495057; border-radius:3px; padding:1px 4px; line-height:1; max-width:50px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${cName}</span>`;
                    }
                });
                colorHtml += `</div>`;
            }
        }
        
        // 사이즈 파싱 & 렌더링
        let sizeHtml = '';
        if (sizesStr) {
            const sizes = sizesStr.split(',').map(s => s.trim()).filter(s => s);
            if (sizes.length > 0) {
                sizeHtml += `<div class="card-size-chips" style="display:flex; gap:3px; align-items:center; flex-wrap:wrap;">`;
                sizes.forEach(s => {
                    const name = s.split(':')[0] || s;
                    sizeHtml += `<span class="size-chip" style="font-size:0.68rem; font-weight:600; color:#7f8c8d; border:1px solid #bdc3c7; border-radius:3px; padding:0px 4px; line-height:1.3; background:#fafafa;">${name}</span>`;
                });
                sizeHtml += `</div>`;
            }
        }
        
        if (colorHtml || sizeHtml) {
            html = `
                <div class="product-card-options" style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top:8px; flex-wrap:wrap; border-top:1px dashed #eee; padding-top:8px;">
                    ${colorHtml}
                    ${sizeHtml}
                </div>
            `;
        }
        
        return html;
    }
    window.renderProductOptionsMarkup = renderProductOptionsMarkup;

    // [신규 헬퍼] 상품 리스트 HTML 렌더링 함수 (중복 배제 및 캐싱 데이터 복원용)
    function renderProducts(container, products, configMap, selectedIds) {
        container.innerHTML = '';
        // 정렬 순서 유지
        const sortedProducts = selectedIds.map(id => products.find(p => p.id === id)).filter(p => p);
        
        sortedProducts.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card visible';
            card.style.cursor = 'pointer';
            card.onclick = () => window.location.href = 'product-detail.html?id=' + p.id;
            
            const pData = configMap['pageData_' + p.id];
            const displayImg = (pData && pData.mainImages && pData.mainImages.length > 0) ? pData.mainImages[0] : 'assets/no-image.png';
            
            const priceStr = (!p.price || p.price === '전화문의') ? '전화문의' : Number(p.price).toLocaleString() + '원';
            const commentHtml = p.short_comment ? `<p style="font-size:0.78rem; color:#888; margin:0 0 4px 0; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.short_comment}</p>` : '';
            const options = parseProductOptions(p);
            const optionsHtml = renderProductOptionsMarkup(options.colors, options.sizes);
            
            card.innerHTML = `
                <div class="product-img" style="background-image: url('${displayImg}'); background-size: contain; background-repeat:no-repeat; background-position: center; border-bottom: 1px solid #eee; height: 250px;"></div>
                <div class="product-info" style="text-align:center; padding:15px;">
                    <h4 style="margin-bottom:4px;">${p.name}</h4>
                    ${commentHtml}
                    <p style="color:var(--color-primary); font-weight:bold; margin:0;">${priceStr}</p>
                    ${optionsHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }

    // [최적화] 전시 상품 조회 로직 (브라우저 세션 캐시 탑재)
    window.loadDisplayProducts = async function(containerId, displayKey) {
        const container = document.querySelector(`#${containerId} .product-list`) || document.getElementById(containerId);
        if(!container) return;

        try {
            const { data: configData } = await supabase.from('site_configs').select('value').eq('key', 'display_' + displayKey).single();
            const selectedIds = configData ? configData.value : [];

            if (!selectedIds || selectedIds.length === 0) {
                container.innerHTML = '<div style="grid-column: 1 / -1; padding: 50px; text-align: center; color: #999;">등록된 전시 상품이 없습니다.</div>';
                return;
            }

            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, price, image_url, category, short_comment, description')
                .in('id', selectedIds);
            if (error) throw error;

            // Fetch site_configs for page data (mainImages)
            let configMap = {};
            try {
                const { data: configs } = await supabase.from('site_configs').select('key, value').in('key', selectedIds.map(id => 'pageData_' + id));
                if (configs) {
                    configs.forEach(c => {
                        configMap[c.key] = c.value;
                    });
                }
            } catch (err) {
                console.error("Error loading site configs for products", err);
            }

            renderProducts(container, products, configMap, selectedIds);
        } catch (err) {
            console.error("Load Products Error:", err);
        }
    };

    // ---------------------------------------------------------
    // 9. Dynamic Sub-Category Tabs (Category Pages) - [최적화 완료]
    // ---------------------------------------------------------
    async function initDynamicSubNav() {
        const subNav = document.getElementById('subCategoryNav');
        if (!subNav) return;

        const urlParams = new URLSearchParams(window.location.search);
        const pageId = urlParams.get('id') || window.CURRENT_PAGE_ID;
        
        if (!pageId) {
            console.warn("Dynamic SubNav: pageId not found.");
            return;
        }

        try {
            let siteCategories = null;
            const { data: catData } = await supabase.from('site_configs').select('value').eq('key', 'site_categories').single();
            if (catData) {
                siteCategories = catData.value;
            }

            if (!siteCategories) return;

            // 현재 페이지(중간분류) 찾기
            let currentMiddle = null;
            let targetMiddleId = pageId;

            // pageId가 대분류 ID(예: 'discount')인 경우 예외 처리
            if (siteCategories[pageId]) {
                const major = siteCategories[pageId];
                if (major.middles) {
                    const sortedMidKeys = Object.keys(major.middles).sort((a, b) => 
                        (major.middles[a].order || 0) - (major.middles[b].order || 0)
                    );
                    const firstMidKey = sortedMidKeys[0];
                    if (firstMidKey) {
                        currentMiddle = major.middles[firstMidKey];
                        targetMiddleId = firstMidKey;
                    }
                }
            } else {
                // pageId가 중간분류 ID인 경우
                for (const mKey in siteCategories) {
                    if (siteCategories[mKey].middles && siteCategories[mKey].middles[pageId]) {
                        currentMiddle = siteCategories[mKey].middles[pageId];
                        break;
                    }
                }
            }

            if (!currentMiddle || !currentMiddle.subs) return;
            
            const titleElem = document.querySelector('.category-title');
            if (titleElem) {
                const major = siteCategories[pageId];
                titleElem.textContent = major ? major.label : currentMiddle.label;
            }
            const headerDescElem = document.querySelector('.category-header p');
            if (headerDescElem) {
                const major = siteCategories[pageId];
                headerDescElem.textContent = `${major ? major.label : currentMiddle.label} 관련 정보를 확인하실 수 있습니다.`;
            }

            // 탭 초기화
            subNav.innerHTML = '';
            const sortedSubs = [...currentMiddle.subs].sort((a, b) => (a.order || 0) - (b.order || 0));

            // DOM 탭 및 서브컨텐츠 컨테이너를 동기(동시) 생성
            for (const [index, sub] of sortedSubs.entries()) {
                // 탭 생성
                const li = document.createElement('li');
                li.className = `subcategory-item ${index === 0 ? 'active' : ''}`;
                li.setAttribute('data-target', sub.id);
                li.textContent = sub.label;
                li.onclick = () => {
                    document.querySelectorAll('.subcategory-item').forEach(n => n.classList.remove('active'));
                    document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));

                    li.classList.add('active');
                    const targetContent = document.getElementById(sub.id);
                    if (targetContent) {
                        targetContent.classList.add('active');
                        targetContent.querySelectorAll('.product-card').forEach((card, i) => {
                            card.classList.remove('visible');
                            setTimeout(() => card.classList.add('visible'), 50 + (i * 100));
                        });
                    }
                };
                subNav.appendChild(li);

                // 컨텐츠 영역 생성
                let contentDiv = document.getElementById(sub.id);
                if (!contentDiv) {
                    contentDiv = document.createElement('div');
                    contentDiv.id = sub.id;
                    contentDiv.className = `sub-content ${index === 0 ? 'active' : ''}`;
                    contentDiv.innerHTML = '<div class="product-list"></div>';
                    subNav.parentElement.appendChild(contentDiv);
                } else {
                    contentDiv.classList.toggle('active', index === 0);
                }
            }

            // [병렬 핵심 최적화] Promise.all을 활용해 모든 소분류 상품 정보를 동시에 병렬 요청 로드
            const loadPromises = sortedSubs.map(sub => 
                window.loadDisplayProducts(sub.id, targetMiddleId + '-' + sub.id)
            );
            await Promise.all(loadPromises);

        } catch (err) {
            console.error("SubNav Load Error:", err);
        }
    }

    initDynamicSubNav();

    // ---------------------------------------------------------
    // 10. Dynamic Page Content (Description, Features, Specs)
    // ---------------------------------------------------------
    async function initDynamicPageContent() {
        const urlParams = new URLSearchParams(window.location.search);
        const pageId = urlParams.get('id') || window.CURRENT_PAGE_ID;
        if (!pageId) return;

        try {
            const { data: configData } = await supabase.from('site_configs').select('value').eq('key', 'pageData_' + pageId).single();
            if (!configData) return;
            const data = configData.value;

            // Description
            const descElem = document.getElementById('dynamicDesc');
            if (descElem && data.description) {
                descElem.innerHTML = data.description.replace(/\n/g, '<br>');
            }

            // Main Image
            const mainImgElem = document.getElementById('mainImage');
            if (mainImgElem && data.mainImages && data.mainImages.length > 0) {
                mainImgElem.src = data.mainImages[0];
            }

            // Detail Image
            const detailImgElem = document.getElementById('dynamicDetailImg');
            if (detailImgElem && (data.detailImage || (data.detailImages && data.detailImages[0]))) {
                detailImgElem.src = data.detailImage || data.detailImages[0];
            }

            // Specs
            const specBody = document.getElementById('dynamicSpecTable');
            if (specBody && data.specs && data.specs.length > 0) {
                specBody.innerHTML = '';
                const tc = data.tableColors || {
                    headerBg: data.specHeaderBg || '#f9f9f9',
                    headerColor: data.specHeaderColor || '#333333',
                    borderColor: data.specBorderColor || '#ddd',
                    cellBg: data.specCellBg || '#ffffff'
                };
                data.specs.forEach(s => {
                    const itemHeadBg = s.headBg || tc.headerBg;
                    const itemHeadColor = s.headColor || tc.headerColor;
                    const itemCellBg = s.cellBg || tc.cellBg;
                    specBody.innerHTML += `<tr><th style="background:${itemHeadBg} !important; color:${itemHeadColor} !important; width:25%; padding:12px; border:1px solid ${tc.borderColor} !important; text-align:left;">${s.key}</th><td style="padding:12px; background:${itemCellBg} !important; border:1px solid ${tc.borderColor} !important;">${s.val}</td></tr>`;
                });


            }


            // Features
            const featureContainer = document.getElementById('dynamicFeatures');
            if (featureContainer && data.features && data.features.length > 0) {
                featureContainer.innerHTML = '';
                data.features.forEach((feat, i) => {
                    const num = (i + 1).toString().padStart(2, '0');
                    featureContainer.innerHTML += `
                        <div class="feature-item" style="margin-bottom:20px; border-bottom:1px dashed #eee; padding-bottom:15px;">
                            <h5 style="font-size:1.1rem; color:#222; margin-bottom:8px; display:flex; align-items:center;">
                                <span style="display:inline-block; background:var(--color-primary); color:#fff; width:22px; height:22px; line-height:22px; text-align:center; border-radius:50%; margin-right:10px; font-size:0.75rem;">${num}</span>
                                ${feat.title}
                            </h5>
                            <p style="color:#666; line-height:1.6; padding-left:32px;">${feat.desc.replace(/\n/g, '<br>')}</p>
                        </div>
                    `;
                });
            }

        } catch (err) {
            console.error("Page Content Load Error:", err);
        }
    }

    initDynamicPageContent();

    // 베스트 상품 초기화 (전역 함수들이 모두 정의된 후 실행)
    if (typeof initDynamicBestProducts === 'function') {
        initDynamicBestProducts();
    }
});
