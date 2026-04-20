// Supabase client initialization (requires global supabase object from CDN)
const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';
const db = typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const supabaseClient = db; // Mapping for legacy code

document.addEventListener('DOMContentLoaded', async () => {
    // 기본 슬라이드 데이터 (Supabase 연결 실패나 데이터 없을 때 폴백용)
    const fallbackSlides = [
        {
            title: "프리미엄 도서관 공간",
            desc: "공간의 가치를 높이는 프리미엄 도서관 가구 솔루션",
            imgUrl: "assets/hero_slide_1.png",
            link: "#"
        },
        {
            title: "스마트 시스템",
            desc: "효율적인 도서관 관리를 위한 RFID/EM 시스템",
            imgUrl: "assets/hero_slide_2.png",
            link: "#"
        },
        {
            title: "도서 보호/보수용품",
            desc: "소중한 도서를 오래도록 보존하는 최상의 선택",
            imgUrl: "assets/hero_slide_3.png",
            link: "#"
        },
        {
            title: "맞춤형 제작 가구",
            desc: "사용자 공간에 최적화된 맞춤형 솔루션",
            imgUrl: "assets/hero_slide_4.png",
            link: "#"
        },
        {
            title: "도서관의 모든 것",
            desc: "성장하는 도서관의 든든한 파트너 SG LIMU",
            imgUrl: "assets/hero_slide_5.png",
            link: "#"
        }
    ];

    const sliderContainer = document.getElementById('sliderContainer');
    const dotsContainer = document.getElementById('sliderDots');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    let currentSlide = 0;
    let slideInterval;
    const intervalTime = 5000; // 5 seconds

    // Supabase에서 배너/팝업 데이터 가져오기
    let slidesData = [];
    let popupsData = [];
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('banners').select('*').eq('is_active', true).order('display_order', { ascending: true }).order('created_at', { ascending: false });
            if (!error && data && data.length > 0) {
                slidesData = data.filter(b => b.type === 'slide').map(b => ({
                    imgUrl: b.image_url,
                    link: b.link_url || '#'
                }));
                popupsData = data.filter(b => b.type === 'popup');
            }
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
            // Create slide
            const slideEl = document.createElement('div');
            slideEl.className = `slide ${index === 0 ? 'active' : ''}`;
            
            // 링크가 '#'이 아니면 전체 슬라이드를 감싸는 a태그 적용, 아니면 단순 div 처리
            const hasLink = slide.link && slide.link !== '#';
            const imgEl = `<img src="${slide.imgUrl}" alt="Main Slide Banner" class="slide-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'1920\\' height=\\'1080\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%2334495e\\'/></svg>'">`;
            const contentEl = slide.title ? `
                <div class="slide-content">
                    <h2>${slide.title}</h2>
                    <p>${slide.desc}</p>
                </div>
            ` : ''; // DB에서 오는 배너는 title, desc가 없을 수 있음 (이미지로 대체 통일)

            if(hasLink) {
                slideEl.innerHTML = `<a href="${slide.link}" style="display:block; width:100%; height:100%;">${imgEl}${contentEl}</a>`;
            } else {
                slideEl.innerHTML = `${imgEl}${contentEl}`;
            }
            sliderContainer.appendChild(slideEl);

            // Create dot
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

    // 2. Scroll Logic for Right Banner
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const scrollBottomBtn = document.getElementById('scrollBottomBtn');

    scrollTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    scrollBottomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    });

    // Handle header visual state on scroll
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
        } else {
            header.style.boxShadow = 'none';
        }
    });

    // Initialize Sliders
    initSlider();

    // 팝업 띄우기 로직 (오늘 하루 보지 않기 쿠키 확인)
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

    popupsData.forEach((popup, index) => {
        const cookieName = `hide_popup_${popup.id}`;
        if (!getCookie(cookieName)) {
            // 팝업 생성
            const popupEl = document.createElement('div');
            popupEl.className = 'main-popup-layer';
            // 기본 스타일 (인라인 CSS)
            popupEl.style.position = 'fixed';
            popupEl.style.top = '100px';
            // 여러 개일 경우 위치 겹침 방지위해 레프트 오프셋 조정
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

            // 이벤트 할당
            document.getElementById(`close_popup_${popup.id}`).addEventListener('click', () => {
                const isChecked = document.getElementById(`nottoday_${popup.id}`).checked;
                if (isChecked) {
                    setCookie(cookieName, 'true', 1);
                }
                popupEl.style.display = 'none';
            });
        }
    });

    // 3. Product Tabs Logic
    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');

    tabItems.forEach(tab => {
        tab.addEventListener('click', async () => {
            // Remove active class from all
            tabItems.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // [동적 로딩] 탭 클릭 시 데이터가 없으면 로드
                const grid = document.getElementById(`grid-${targetId.split('-')[1]}`);
                if (grid && grid.children.length === 0) {
                    await loadBestProducts(targetId);
                }

                // Trigger reveal for cards in newly active tab with stagger
                targetContent.querySelectorAll('.product-card').forEach((card, index) => {
                    card.classList.remove('visible'); // Reset
                    setTimeout(() => {
                        card.classList.add('visible');
                    }, 50 + (index * 100)); // Staggered reveal
                });
            }
        });
    });

    // 3.1 Best Products Dynamic Loading Logic
    async function loadBestProducts(tabId) {
        const gridId = `grid-${tabId.split('-')[1]}`;
        const container = document.getElementById(gridId);
        if(!container || !supabaseClient) return;

        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">데이터를 불러오는 중...</div>';
        
        let query;
        if(tabId === 'tab-system') {
            // 시스템 관련 카테고리 (rfid_%, em_%, access_%)
            query = supabaseClient.from('products').select('*').or('category.ilike.rfid_%,category.ilike.em_%,category.ilike.access_%');
        } else if(tabId === 'tab-tape') {
            // 태그 및 테이프 (rfid_tag, em_tape)
            query = supabaseClient.from('products').select('*').or('category.eq.rfid_tag,category.eq.em_tape');
        } else if(tabId === 'tab-supplies') {
            // 용품 관련 (supplies_%)
            query = supabaseClient.from('products').select('*').ilike('category', 'supplies_%');
        } else {
            // 설치사례 또는 기본: best_product 태그 우선 노출
            query = supabaseClient.from('products').select('*').eq('category', 'best_product');
        }

        try {
            // 1. 우선적으로 'best_product' 카테고리가 있으면 먼저 가져오기 시도 (탭 무관 공통 베스트)
            let { data, error } = await query.order('created_at', { ascending: false }).limit(4);
            
            // 만약 탭 전용 데이터가 없으면 일반 'best_product'에서 가져오기
            if ((!data || data.length === 0) && tabId !== 'tab-cases') {
                const fallback = await supabaseClient.from('products').select('*').eq('category', 'best_product').limit(4);
                data = fallback.data;
                error = fallback.error;
            }
            if (error || !data || data.length === 0) {
                container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">등록된 제품이 없습니다.</div>';
                return;
            }

            container.innerHTML = '';
            data.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <a href="product-detail.html?id=${p.id}" style="display:block; text-decoration:none; color:inherit;">
                        <div class="product-img" style="background-image: url('${p.image_url}'); background-size: contain; background-repeat: no-repeat; background-position: center; border: 1px solid #eee;"></div>
                        <div class="product-info">
                            <span class="product-price" style="font-size:0.85rem; color:var(--color-primary); font-weight:700; display:block; margin-bottom:5px;">${p.price ? p.price.toLocaleString() + '원' : '가격문의'}</span>
                            <h4 style="font-weight:600; margin:0; font-size:1rem;">${p.name}</h4>
                        </div>
                    </a>
                `;
                container.appendChild(card);
            });
        } catch (e) {
            container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">로딩 실패</div>';
        }
    }

    // 초기 활성 탭 데이터 로드
    loadBestProducts('tab-system');

    // 4. Search Focus Logic
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const searchInput = document.querySelector('.search-input');
    const asideSearchBtn = document.querySelector('.search-btn-aside');

    if (headerSearchBtn) {
        headerSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchInput.focus();
        });
    }
    
    if (asideSearchBtn) {
        asideSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            setTimeout(() => {
                searchInput.focus();
            }, 500);
        });
    }

    // 6. Live Chat Widget Logic
    const chatFab = document.getElementById('chatFab');
    const chatWindow = document.getElementById('chatWindow');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatBody = document.getElementById('chatBody');

    function toggleChat() {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active')) {
            setTimeout(() => chatInput.focus(), 300);
        }
    }

    if (chatFab && chatCloseBtn) {
        chatFab.addEventListener('click', toggleChat);
        chatCloseBtn.addEventListener('click', toggleChat);
    }

    function sendChatMessage() {
        const text = chatInput.value.trim();
        if (text === '') return;

        // User message
        const userMsg = document.createElement('div');
        userMsg.className = 'message user-msg';
        userMsg.textContent = text;
        chatBody.appendChild(userMsg);

        chatInput.value = '';
        chatBody.scrollTop = chatBody.scrollHeight;

        // Auto reply after 1s
        setTimeout(() => {
            const sysMsg = document.createElement('div');
            sysMsg.className = 'message system-msg';
            sysMsg.innerHTML = "안녕하세요!<br>문의를 담당자에게 전달했습니다.<br>빠른 시일 내에 답변 드리겠습니다.";
            chatBody.appendChild(sysMsg);
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 1000);
    }

    if (chatSendBtn && chatInput) {
        chatSendBtn.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    // 7. Scroll Reveal Animation Logic
    const revealElements = document.querySelectorAll('.section-title, .product-tabs, .product-card');
    
    // Add base class immediately so they are hidden before scroll
    revealElements.forEach(el => el.classList.add('reveal-up'));

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add stagger effect based on element index in the viewport
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
});
