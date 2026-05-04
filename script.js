import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // ---------------------------------------------------------
    // 1. Search Logic
    // ---------------------------------------------------------
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const searchInput = document.querySelector('.search-input');
    const asideSearchBtn = document.querySelector('.search-btn-aside');

    if (searchInput) {
        const urlParams = new URLSearchParams(window.location.search);
        const currentQuery = urlParams.get('q');
        if (currentQuery) searchInput.value = currentQuery;
    }

    function performSearch() {
        if (!searchInput) return;
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        } else {
            searchInput.focus();
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => { if (searchInput) searchInput.focus(); }, 500);
        });
    }

    // ---------------------------------------------------------
    // 2. Mobile Menu Logic
    // ---------------------------------------------------------
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const mobileNavList = document.getElementById('mobileNavList');
    const desktopGnb = document.querySelector('.gnb > ul');

    if (mobileMenuToggle && mobileMenuOverlay && mobileMenuClose && mobileNavList && desktopGnb) {
        mobileNavList.innerHTML = desktopGnb.innerHTML;

        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        mobileMenuClose.addEventListener('click', () => {
            mobileMenuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        mobileMenuOverlay.addEventListener('click', (e) => {
            if (e.target === mobileMenuOverlay) {
                mobileMenuOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        const mobileNavItems = mobileNavList.querySelectorAll('.has-submenu');
        mobileNavItems.forEach(item => {
            const link = item.querySelector('a');
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-chevron-down';
            icon.style.marginLeft = 'auto';
            icon.style.transition = 'transform 0.3s';
            link.appendChild(icon);

            link.addEventListener('click', (e) => {
                e.preventDefault();
                item.classList.toggle('open');
                icon.style.transform = item.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        });
    }

    // ---------------------------------------------------------
    // 3. Product Loading & Tab Logic (Home Page Only)
    // ---------------------------------------------------------
    async function loadCategoryProducts(category, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            let dbCategory = '';
            if (category === 'rfid') dbCategory = '도서관리 시스템';
            if (category === 'supplies') dbCategory = '도서관 용품';
            if (category === 'furniture') dbCategory = '도서관 가구';
            if (category === 'sign') dbCategory = '사인물';

            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .eq('category_major', dbCategory)
                .limit(8);

            if (error) throw error;

            container.innerHTML = '';
            if (products && products.length > 0) {
                products.forEach(p => {
                    const card = document.createElement('div');
                    card.className = 'product-card visible';
                    card.style.cursor = 'pointer';
                    card.onclick = () => window.location.href = `product-detail.html?id=${p.id}`;
                    
                    const priceStr = (!p.price || p.price === '전화문의') ? '전화문의' : Number(p.price).toLocaleString() + '원';
                    
                    card.innerHTML = `
                        <div class="product-img" style="background-image: url('${p.image_url || 'assets/no-image.png'}'); background-size: contain; background-repeat:no-repeat; background-position: center; height: 250px; border-bottom: 1px solid #eee;"></div>
                        <div class="product-info" style="padding: 15px; text-align: center;">
                            <h4 style="font-size: 1.1rem; margin-bottom: 8px;">${p.name}</h4>
                            <p style="color: var(--color-primary); font-weight: bold;">${priceStr}</p>
                        </div>
                    `;
                    container.appendChild(card);
                });
            } else {
                container.innerHTML = '<p class="no-data" style="grid-column: 1/-1; text-align: center; padding: 50px; color: #999;">등록된 상품이 없습니다.</p>';
            }
        } catch (err) {
            console.error(`Error loading products for ${category}:`, err);
        }
    }

    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabItems.length > 0) {
        tabItems.forEach(tab => {
            tab.addEventListener('click', () => {
                tabItems.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const targetId = tab.getAttribute('data-tab');
                const targetContent = document.getElementById(targetId);
                if (targetContent) targetContent.classList.add('active');
            });
        });

        // Initial load
        loadCategoryProducts('rfid', 'grid-rfid');
        loadCategoryProducts('supplies', 'grid-supplies');
        loadCategoryProducts('furniture', 'grid-furniture');
        loadCategoryProducts('sign', 'grid-sign');
    }

    // ---------------------------------------------------------
    // 4. Hero Slider Logic (Home Page Only)
    // ---------------------------------------------------------
    const sliderContainer = document.getElementById('sliderContainer');
    const dotsContainer = document.getElementById('sliderDots');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (sliderContainer && dotsContainer && prevBtn && nextBtn) {
        const fallbackSlides = [
            { title: "프리미엄 북엔드 시리즈", desc: "흔들림 없는 독서의 완성", imgUrl: "assets/hero_slide_1.png", link: "#" },
            { title: "모던 도서관 공간", desc: "공간을 가치있게 만드는 디자인", imgUrl: "assets/hero_slide_2.png", link: "#" }
        ];

        let currentSlide = 0;
        let slideInterval;
        let slidesData = [];
        
        try {
            const { data, error } = await supabase.from('banners').select('*').eq('is_active', true).eq('type', 'slide').order('display_order', { ascending: true });
            if (!error && data && data.length > 0) {
                slidesData = data.map(b => ({ title: b.title, desc: b.description, imgUrl: b.image_url, link: b.link_url || '#' }));
            }
        } catch (err) {}

        if (slidesData.length === 0) slidesData = fallbackSlides;

        function initSlider() {
            sliderContainer.innerHTML = '';
            dotsContainer.innerHTML = '';
            slidesData.forEach((slide, index) => {
                const slideEl = document.createElement('div');
                slideEl.className = `slide ${index === 0 ? 'active' : ''}`;
                slideEl.innerHTML = `
                    <img src="${slide.imgUrl}" alt="Main Slide" class="slide-img">
                    <div class="slide-content">
                        <h2>${slide.title || ''}</h2>
                        <p>${slide.desc || ''}</p>
                    </div>
                `;
                sliderContainer.appendChild(slideEl);
                const dot = document.createElement('div');
                dot.className = `dot ${index === 0 ? 'active' : ''}`;
                dot.onclick = () => goToSlide(index);
                dotsContainer.appendChild(dot);
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

        function startSlideShow() { slideInterval = setInterval(() => goToSlide(currentSlide + 1), 5000); }
        prevBtn.onclick = () => { clearInterval(slideInterval); goToSlide(currentSlide - 1); startSlideShow(); };
        nextBtn.onclick = () => { clearInterval(slideInterval); goToSlide(currentSlide + 1); startSlideShow(); };
        initSlider();
    }

    // ---------------------------------------------------------
    // 5. Scroll & Global Logic
    // ---------------------------------------------------------
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        scrollTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (header) header.style.boxShadow = window.scrollY > 50 ? '0 4px 20px rgba(0,0,0,0.05)' : 'none';
    });

    // ---------------------------------------------------------
    // 6. Live Chat Widget
    // ---------------------------------------------------------
    const chatFab = document.getElementById('chatFab');
    const chatWindow = document.getElementById('chatWindow');
    if (chatFab && chatWindow) {
        chatFab.onclick = () => chatWindow.classList.toggle('active');
        document.getElementById('chatCloseBtn').onclick = () => chatWindow.classList.remove('active');
    }
});
