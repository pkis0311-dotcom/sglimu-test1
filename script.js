import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Slider Logic (Home Page Only)
    const fallbackSlides = [
        { title: "프리미엄 북엔드 시리즈", desc: "흔들림 없는 독서의 완성", imgUrl: "assets/hero_slide_1.png", link: "#" },
        { title: "모던 도서관 공간", desc: "공간을 가치있게 만드는 디자인", imgUrl: "assets/hero_slide_2.png", link: "#" },
        { title: "🎉 쇼핑몰 재오픈 기념! 🎉", desc: "지금만 누릴 수 있는 특별 할인", imgUrl: "assets/hero_slide_update_3.png", link: "#" }
    ];

    const sliderContainer = document.getElementById('sliderContainer');
    const dotsContainer = document.getElementById('sliderDots');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    let currentSlide = 0;
    let slideInterval;
    const intervalTime = 5000;

    let slidesData = [];
    let popupsData = [];

    // Search Logic (Global)
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const searchInput = document.querySelector('.search-input');
    const asideSearchBtn = document.querySelector('.search-btn-aside');

    // Pre-fill search input if on search page
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q && searchInput && window.location.pathname.includes('search.html')) {
        searchInput.value = q;
    }

    function performSearch() {
        const input = document.querySelector('.search-input');
        if (!input) return;
        const query = input.value.trim();
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        } else {
            input.focus();
        }
    }

    if (headerSearchBtn) {
        headerSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performSearch();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    if (asideSearchBtn) {
        asideSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.querySelector('.search-input');
            if (!input) return;
            if (window.scrollY < 100) {
                input.focus();
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => { input.focus(); }, 500);
            }
        });
    }

    // Banner & Popup Data Loading
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

    if (slidesData.length === 0) slidesData = fallbackSlides;

    function initSlider() {
        if (!sliderContainer || !dotsContainer) return;
        sliderContainer.innerHTML = '';
        dotsContainer.innerHTML = '';
        slidesData.forEach((slide, index) => {
            const slideEl = document.createElement('div');
            slideEl.className = `slide ${index === 0 ? 'active' : ''}`;
            const hasLink = slide.link && slide.link !== '#';
            const imgEl = `<img src="${slide.imgUrl}" alt="Main Slide Banner" class="slide-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'1920\\' height=\\'1080\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%2334495e\\'/></svg>'">`;
            const contentEl = slide.title ? `<div class="slide-content"><h2>${slide.title}</h2><p>${slide.desc}</p></div>` : '';
            if(hasLink) slideEl.innerHTML = `<a href="${slide.link}" style="display:block; width:100%; height:100%;">${imgEl}${contentEl}</a>`;
            else slideEl.innerHTML = `${imgEl}${contentEl}`;
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
        if (!slides.length) return;
        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');
        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    function nextSlide() { goToSlide(currentSlide + 1); }
    function prevSlide() { goToSlide(currentSlide - 1); }
    function startSlideShow() { slideInterval = setInterval(nextSlide, 5000); }
    function stopSlideShow() { clearInterval(slideInterval); }

    if (sliderContainer && dotsContainer && prevBtn && nextBtn) {
        initSlider();
        prevBtn.addEventListener('click', () => { stopSlideShow(); prevSlide(); startSlideShow(); });
        nextBtn.addEventListener('click', () => { stopSlideShow(); nextSlide(); startSlideShow(); });
        sliderContainer.addEventListener('mouseenter', stopSlideShow);
        sliderContainer.addEventListener('mouseleave', startSlideShow);
    }

    // Scroll Logic
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const scrollBottomBtn = document.getElementById('scrollBottomBtn');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }
    if (scrollBottomBtn) {
        scrollBottomBtn.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); });
    }

    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (header) {
            if (window.scrollY > 50) header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
            else header.style.boxShadow = 'none';
        }
    });

    // Popups
    function getCookie(name) {
        const matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)" ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }
    function setCookie(name, value, days) {
        let date = new Date(); date.setDate(date.getDate() + days);
        document.cookie = name + "=" + value + "; path=/; expires=" + date.toUTCString();
    }

    popupsData.forEach((popup, index) => {
        const cookieName = `hide_popup_${popup.id}`;
        if (!getCookie(cookieName)) {
            const popupEl = document.createElement('div');
            popupEl.className = 'main-popup-layer';
            popupEl.style.cssText = `position:fixed; top:100px; left:${100 + (index * 520)}px; width:450px; background:#fff; box-shadow:0 10px 30px rgba(0,0,0,0.3); z-index:9999; border-radius:8px; overflow:hidden;`;
            const linkStr = (popup.link_url && popup.link_url !== '#') ? `href="${popup.link_url}" target="_blank"` : '';
            const aTagStart = linkStr ? `<a ${linkStr} style="display:block;">` : '<div>';
            popupEl.innerHTML = `${aTagStart}<img src="${popup.image_url}" alt="Popup" style="width:100%; display:block; border-bottom:1px solid #eee;">${linkStr ? '</a>' : '</div>'}
                <div style="background:#f9f9f9; padding:10px; display:flex; justify-content:space-between; align-items:center; font-size:0.9rem;">
                    <label style="cursor:pointer; display:flex; align-items:center; gap:5px;"><input type="checkbox" id="nottoday_${popup.id}"> 오늘 하루 보지 않기</label>
                    <button id="close_popup_${popup.id}" style="border:none; background:transparent; cursor:pointer; font-weight:bold; color:#666;">닫기 <i class="fa-solid fa-xmark"></i></button>
                </div>`;
            document.body.appendChild(popupEl);
            document.getElementById(`close_popup_${popup.id}`).addEventListener('click', () => {
                if (document.getElementById(`nottoday_${popup.id}`).checked) setCookie(cookieName, 'true', 1);
                popupEl.style.display = 'none';
            });
        }
    });

    // Product Tabs
    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            tabItems.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetContent = document.getElementById(tab.getAttribute('data-tab'));
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.querySelectorAll('.product-card').forEach((card, i) => {
                    card.classList.remove('visible');
                    setTimeout(() => { card.classList.add('visible'); }, 50 + (i * 100));
                });
            }
        });
    });

    // Chat Widget
    const chatFab = document.getElementById('chatFab');
    const chatWindow = document.getElementById('chatWindow');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatBody = document.getElementById('chatBody');

    if (chatFab && chatWindow && chatCloseBtn) {
        chatFab.addEventListener('click', () => { chatWindow.classList.toggle('active'); if(chatWindow.classList.contains('active')) chatInput.focus(); });
        chatCloseBtn.addEventListener('click', () => { chatWindow.classList.remove('active'); });
    }

    if (chatSendBtn && chatInput && chatBody) {
        const sendMsg = () => {
            const text = chatInput.value.trim();
            if (!text) return;
            const msg = document.createElement('div'); msg.className = 'message user-msg'; msg.textContent = text;
            chatBody.appendChild(msg); chatInput.value = ''; chatBody.scrollTop = chatBody.scrollHeight;
            setTimeout(() => {
                const sys = document.createElement('div'); sys.className = 'message system-msg'; sys.innerHTML = "안녕하세요!<br>문의를 담당자에게 전달했습니다.";
                chatBody.appendChild(sys); chatBody.scrollTop = chatBody.scrollHeight;
            }, 1000);
        };
        chatSendBtn.addEventListener('click', sendMsg);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMsg(); });
    }

    // Scroll Reveal
    const revealElements = document.querySelectorAll('.section-title, .product-tabs, .product-card');
    revealElements.forEach(el => el.classList.add('reveal-up'));
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) { setTimeout(() => { entry.target.classList.add('visible'); }, 50); revealObserver.unobserve(entry.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    setTimeout(() => { revealElements.forEach(el => revealObserver.observe(el)); }, 100);
});
