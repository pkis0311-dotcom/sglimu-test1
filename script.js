import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // ---------------------------------------------------------
    // 1. Search Logic (Should run first to be robust)
    // ---------------------------------------------------------
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const searchInput = document.querySelector('.search-input');
    const asideSearchBtn = document.querySelector('.search-btn-aside');

    // Pre-fill search input if on search page
    const urlParams = new URLSearchParams(window.location.search);
    const currentQuery = urlParams.get('q');
    if (currentQuery && searchInput) {
        searchInput.value = currentQuery;
    }

    function performSearch() {
        // 현재 화면에 있는 검색창 중 실제 값이 입력된 것을 찾거나 첫 번째를 사용
        const input = document.querySelector('.search-input');
        const query = input ? input.value.trim() : '';
        
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        } else {
            // 입력값이 없거나 모바일처럼 입력창이 숨겨진 상태라면 검색 페이지로 이동
            window.location.href = 'search.html';
        }
    }

    // 모든 검색 버튼(헤더, 사이드바 등)에 이벤트 연결
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#headerSearchBtn, .search-btn, .search-btn-aside');
        if (btn) {
            e.preventDefault();
            performSearch();
        }
    });

    // 엔터키 지원
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('search-input')) {
            performSearch();
        }
    });
    
    if (asideSearchBtn) {
        asideSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            setTimeout(() => {
                if (searchInput) {
                    searchInput.focus();
                }
            }, 500);
        });
    }

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
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainGnb = document.getElementById('mainGnb');

    if (mobileMenuToggle && mainGnb) {
        mobileMenuToggle.addEventListener('click', () => {
            mainGnb.classList.toggle('active');
            const icon = mobileMenuToggle.querySelector('i');
            if (mainGnb.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-xmark');
            } else {
                icon.classList.replace('fa-xmark', 'fa-bars');
            }
        });

        // 모바일 서브메뉴 토글 (이벤트 위임)
        mainGnb.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const parentLi = e.target.closest('.has-submenu');
                if (parentLi && e.target.tagName === 'A' && e.target.getAttribute('href') === '#') {
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
                        <a href="#">${major.label}</a>
                        <ul class="submenu">
                            ${middlesHtml}
                        </ul>
                    `;
                } else {
                    li.innerHTML = `<a href="#">${major.label}</a>`;
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

            const { data: products, error } = await supabase.from('products').select('*').in('id', selectedIds);
            if (error) throw error;

            container.innerHTML = '';
            // 정렬 순서 유지
            const sortedProducts = selectedIds.map(id => products.find(p => p.id === id)).filter(p => p);
            
            sortedProducts.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card visible';
                card.style.cursor = 'pointer';
                card.onclick = () => window.location.href = 'product-detail.html?id=' + p.id;
                
                const priceStr = (!p.price || p.price === '전화문의') ? '전화문의' : Number(p.price).toLocaleString() + '원';
                card.innerHTML = `
                    <div class="product-img" style="background-image: url('${p.image_url || 'assets/no-image.png'}'); background-size: contain; background-repeat:no-repeat; background-position: center; border-bottom: 1px solid #eee; height: 250px;"></div>
                    <div class="product-info" style="text-align:center; padding:15px;">
                        <h4 style="margin-bottom:5px;">${p.name}</h4>
                        <p style="color:var(--color-primary); font-weight:bold;">${priceStr}</p>
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
