import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
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

    async function fetchSuggestions(query) {
        if (!query) return;
        try {
            // Fetch up to 6 products matching the query
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, price, image_url, short_comment')
                .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
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
            const highlightedName = highlightKeyword(p.name, query);
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
                    <div style="width:60px; height:60px; border-radius:4px; background-image:url('${item.image}'); background-size:cover; background-position:center; flex-shrink:0; border:1px solid #eee;"></div>
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
                    <div onclick="window.location.href='product-detail.html?id=${item.id}'" style="width:60px; height:60px; border-radius:4px; background-image:url('${item.image}'); background-size:cover; background-position:center; flex-shrink:0; border:1px solid #eee;"></div>
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
                
                // 최상위 카테고리이면서 하위 메뉴가 있는 경우에만 아코디언 동작 및 링크 이동 방지
                if (parentLi && parentLi.parentElement === mainGnb.querySelector('ul')) {
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
                
                // 할인상품(discount)은 대분류 자체를 링크로 처리 (서브메뉴 생략)
                if (mKey === 'discount') {
                    li.innerHTML = `<a href="category.html?id=discount">${major.label}</a>`;
                    gnbUl.appendChild(li);
                    continue;
                }
                
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
                .select('id, name, price, image_url, category, short_comment, colors, sizes')
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
                const optionsHtml = renderProductOptionsMarkup(p.colors, p.sizes);
                
                card.innerHTML = `
                    <div class="product-img" style="background-image: url('${displayImg}'); background-size: cover; background-repeat:no-repeat; background-position: center; border-bottom: 1px solid #eee; height: 250px;"></div>
                    <div class="product-info" style="text-align:center; padding:15px;">
                        <h4 style="margin-bottom:4px;">${p.name}</h4>
                        ${commentHtml}
                        <p style="color:var(--color-primary); font-weight:bold; margin:0;">${priceStr}</p>
                        ${optionsHtml}
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (err) {
            console.error("Load Products Error:", err);
        }
    };

    // ---------------------------------------------------------
    // 9. Dynamic Sub-Category Tabs (Category Pages)
    // ---------------------------------------------------------
    async function initDynamicSubNav() {
        const subNav = document.getElementById('subCategoryNav');
        if (!subNav) return;

        // CURRENT_PAGE_ID는 각 html의 스크립트에서 전역 변수로 정의되어 있어야 합니다.
        // [수정] URL 파라미터가 있으면 우선 사용, 없으면 전역 변수 사용
        const urlParams = new URLSearchParams(window.location.search);
        const pageId = urlParams.get('id') || window.CURRENT_PAGE_ID;
        
        if (!pageId) {
            console.warn("Dynamic SubNav: pageId not found.");
            return;
        }

        try {
            const { data: catData } = await supabase.from('site_configs').select('value').eq('key', 'site_categories').single();
            if (!catData) return;
            const siteCategories = catData.value;

            // 현재 페이지(중간분류) 찾기
            let currentMiddle = null;
            for (const mKey in siteCategories) {
                if (siteCategories[mKey].middles && siteCategories[mKey].middles[pageId]) {
                    currentMiddle = siteCategories[mKey].middles[pageId];
                    break;
                }
            }

            if (!currentMiddle || !currentMiddle.subs) return;
            
            // [추가] 헤더 타이틀 동적 변경
            const titleElem = document.querySelector('.category-title');
            if (titleElem && currentMiddle.label) {
                titleElem.textContent = currentMiddle.label;
            }
            const headerDescElem = document.querySelector('.category-header p');
            if (headerDescElem && currentMiddle.label) {
                headerDescElem.textContent = `${currentMiddle.label} 관련 정보를 확인하실 수 있습니다.`;
            }

            // 탭 초기화
            subNav.innerHTML = '';
            
            const detailSection = document.querySelector('.dynamic-detail-section');
            const sortedSubs = [...currentMiddle.subs].sort((a, b) => (a.order || 0) - (b.order || 0));

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

                // 컨텐츠 영역 생성 (없을 경우만)
                let contentDiv = document.getElementById(sub.id);
                if (!contentDiv) {
                    contentDiv = document.createElement('div');
                    contentDiv.id = sub.id;
                    contentDiv.className = `sub-content ${index === 0 ? 'active' : ''}`;
                    contentDiv.innerHTML = '<div class="product-list"></div>';
                    // subNav의 부모(container)에 추가
                    subNav.parentElement.appendChild(contentDiv);
                } else {
                    contentDiv.classList.toggle('active', index === 0);
                }

                // 상품 로드
                await window.loadDisplayProducts(sub.id, pageId + '-' + sub.id);
            }

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
                data.specs.forEach(s => {
                    specBody.innerHTML += `<tr><th style="background:#f9f9f9; width:25%; padding:12px; border:1px solid #ddd; text-align:left;">${s.key}</th><td style="padding:12px; border:1px solid #ddd;">${s.val}</td></tr>`;
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
