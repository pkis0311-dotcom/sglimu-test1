import { supabase } from './supabase-client.js';

let SITE_CATEGORIES = null;

document.addEventListener('DOMContentLoaded', async () => {
    // ---------------------------------------------------------
    // 0. Fetch Categories (Required for dynamic GNB and sub-nav)
    // ---------------------------------------------------------
    async function fetchSiteCategories() {
        try {
            const { data, error } = await supabase
                .from('site_configs')
                .select('value')
                .eq('key', 'site_categories')
                .single();
            
            if (!error && data) {
                SITE_CATEGORIES = data.value;
            }
        } catch (err) {
            console.error("Error fetching categories:", err);
        }
    }

    await fetchSiteCategories();

    // ---------------------------------------------------------
    // 1. Dynamic GNB Rendering
    // ---------------------------------------------------------
    function renderDynamicGNB() {
        const gnbContainer = document.querySelector('.gnb');
        if (!gnbContainer || !SITE_CATEGORIES) return;

        const ul = document.createElement('ul');
        
        // Link Mapping (based on existing structure)
        const linkMap = {
            'rfid': 'rfid.html',
            'em': 'em.html',
            'access': 'access.html',
            'arrange': 'supplies-arrange.html',
            'protect': 'supplies-protect.html',
            'lend': 'supplies-lend.html',
            'etc': 'sterilizer.html',
            'koas': 'furniture-koas.html',
            'fomus': 'furniture-fomus.html',
            'fursys': 'furniture-fursys.html',
            'custom': 'furniture-custom.html',
            'sign': 'sign-class.html'
        };

        for (const mKey in SITE_CATEGORIES) {
            if (mKey === 'discount') continue;

            const major = SITE_CATEGORIES[mKey];
            const li = document.createElement('li');
            
            const hasMiddles = major.middles && Object.keys(major.middles).length > 0;
            if (hasMiddles) {
                li.className = 'has-submenu';
                li.innerHTML = `<a href="#">${major.label}</a>`;
                
                const submenuUl = document.createElement('ul');
                submenuUl.className = 'submenu';
                
                for (const midKey in major.middles) {
                    const middle = major.middles[midKey];
                    const subLi = document.createElement('li');
                    
                    if (mKey === 'signage' && midKey === 'sign') {
                        middle.subs.forEach(sub => {
                            const ssLi = document.createElement('li');
                            let subLink = '#';
                            if (sub.id.includes('class')) subLink = 'sign-class.html';
                            else if (sub.id.includes('board')) subLink = 'sign-board.html';
                            else if (sub.id.includes('date')) subLink = 'sign-date.html';
                            else if (sub.id.includes('custom')) subLink = 'sign-custom.html';
                            
                            ssLi.innerHTML = `<a href="${subLink}">${sub.label}</a>`;
                            submenuUl.appendChild(ssLi);
                        });
                        continue;
                    }

                    let link = linkMap[midKey] || `${mKey}-${midKey}.html`;
                    subLi.innerHTML = `<a href="${link}">${middle.label}</a>`;
                    submenuUl.appendChild(subLi);
                }
                li.appendChild(submenuUl);
            } else {
                li.innerHTML = `<a href="${mKey}.html">${major.label}</a>`;
            }
            ul.appendChild(li);
        }

        if (SITE_CATEGORIES['discount']) {
            const discLi = document.createElement('li');
            discLi.innerHTML = `<a href="discount.html">${SITE_CATEGORIES['discount'].label}</a>`;
            ul.appendChild(discLi);
        }

        gnbContainer.innerHTML = '';
        gnbContainer.appendChild(ul);
    }

    renderDynamicGNB();

    // ---------------------------------------------------------
    // 1.5. Product Display Logic (Shared)
    // ---------------------------------------------------------
    async function loadDisplayProducts(containerId, displayKey) {
        const container = document.querySelector(`#${containerId} .product-list`);
        if(!container) return;

        const { data: configData } = await supabase.from('site_configs').select('value').eq('key', 'display_' + displayKey).single();
        const selectedIds = configData ? configData.value : [];

        if (!selectedIds || selectedIds.length === 0) {
            container.innerHTML = '<div style="grid-column: 1 / -1; padding: 50px; text-align: center; color: #999;">등록된 전시 상품이 없습니다. 관리자 사이트에서 배치해주세요.</div>';
            return;
        }

        const { data: products, error } = await supabase.from('products').select('*').in('id', selectedIds);
        if (error) return;

        container.innerHTML = '';
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
    }

    // Expose to window for page-specific scripts if needed
    window.loadDisplayProducts = loadDisplayProducts;

    // ---------------------------------------------------------
    // 2. Dynamic Sub-Category Nav (for Category Pages)
    // ---------------------------------------------------------
    function renderDynamicSubNav() {
        const subNav = document.getElementById('subCategoryNav');
        if (!subNav || !SITE_CATEGORIES) return;

        const currentPageId = window.CURRENT_PAGE_ID;
        if (!currentPageId) return;

        let currentMiddle = null;
        for (const mKey in SITE_CATEGORIES) {
            if (SITE_CATEGORIES[mKey].middles && SITE_CATEGORIES[mKey].middles[currentPageId]) {
                currentMiddle = SITE_CATEGORIES[mKey].middles[currentPageId];
                break;
            }
        }

        if (currentMiddle && currentMiddle.subs) {
            subNav.innerHTML = '';
            
            // Container to hold sub-contents if they are to be dynamic
            let subContentsWrapper = document.querySelector('.category-container');
            if (!subContentsWrapper) subContentsWrapper = document.querySelector('main');

            currentMiddle.subs.forEach(async (sub, index) => {
                const li = document.createElement('li');
                li.className = `subcategory-item ${index === 0 ? 'active' : ''}`;
                li.setAttribute('data-target', sub.id);
                li.textContent = sub.label;
                
                // Create sub-content div if it doesn't exist
                let targetContent = document.getElementById(sub.id);
                if (!targetContent) {
                    targetContent = document.createElement('div');
                    targetContent.id = sub.id;
                    targetContent.className = `sub-content ${index === 0 ? 'active' : ''}`;
                    targetContent.innerHTML = '<div class="product-list"></div>';
                    subContentsWrapper.appendChild(targetContent);
                }

                // Initial load for products
                const displayKey = currentPageId + '-' + sub.id;
                await loadDisplayProducts(sub.id, displayKey);

                li.addEventListener('click', () => {
                    document.querySelectorAll('.subcategory-item').forEach(n => n.classList.remove('active'));
                    document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));

                    li.classList.add('active');
                    const targetContent = document.getElementById(sub.id);
                    if (targetContent) {
                        targetContent.classList.add('active');
                        const cards = targetContent.querySelectorAll('.product-card');
                        cards.forEach((card, i) => {
                            card.classList.remove('visible');
                            setTimeout(() => card.classList.add('visible'), 50 + (i * 100));
                        });
                    }
                });
                subNav.appendChild(li);
            });
        }
    }

    renderDynamicSubNav();

    // ---------------------------------------------------------
    // 2.5. Dynamic Category Page Data (for Category Pages)
    // ---------------------------------------------------------
    async function renderCategoryPageData() {
        const currentPageId = window.CURRENT_PAGE_ID;
        if (!currentPageId) return;

        try {
            const { data: configData } = await supabase
                .from('site_configs')
                .select('value')
                .eq('key', 'pageData_' + currentPageId)
                .single();
            
            const data = configData ? configData.value : null;

            if (data) {
                if (data.description) {
                    const descElem = document.getElementById('dynamicDesc');
                    if (descElem) descElem.innerHTML = data.description.replace(/\n/g, '<br>');
                }
                if (data.mainImages && data.mainImages.length > 0) {
                    const mainImgElem = document.getElementById('mainImage');
                    if (mainImgElem) mainImgElem.src = data.mainImages[0];
                }
                if (data.detailImage || (data.detailImages && data.detailImages[0])) {
                    const detailImgElem = document.getElementById('dynamicDetailImg');
                    if (detailImgElem) detailImgElem.src = data.detailImage || data.detailImages[0];
                }
                if (data.specs && data.specs.length > 0) {
                    const specBody = document.getElementById('dynamicSpecTable');
                    if (specBody) {
                        specBody.innerHTML = '';
                        data.specs.forEach(s => {
                            specBody.innerHTML += `<tr><th style="background:#f9f9f9; width:25%; padding:12px; border:1px solid #ddd; text-align:left;">${s.key}</th><td style="padding:12px; border:1px solid #ddd;">${s.val}</td></tr>`;
                        });
                    }
                }
                if (data.features && data.features.length > 0) {
                    const featureContainer = document.getElementById('dynamicFeatures');
                    if (featureContainer) {
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
                }
            }
        } catch (e) {
            console.error("Supabase load error for " + currentPageId, e);
        }
    }

    renderCategoryPageData();

    // ---------------------------------------------------------
    // 3. Search Logic
    // ---------------------------------------------------------
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const searchInput = document.querySelector('.search-input');
    const asideSearchBtn = document.querySelector('.search-btn-aside');

    const urlParams = new URLSearchParams(window.location.search);
    const currentQuery = urlParams.get('q');
    if (currentQuery && searchInput) {
        searchInput.value = currentQuery;
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
            if (e.key === 'Enter') {
                performSearch();
            }
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
                if (searchInput) {
                    searchInput.focus();
                }
            }, 500);
        });
    }

    // ---------------------------------------------------------
    // 4. Slider Logic (Home Page Only)
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

        if (prevBtn) prevBtn.addEventListener('click', () => {
            stopSlideShow();
            prevSlide();
            startSlideShow();
        });

        if (nextBtn) nextBtn.addEventListener('click', () => {
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
    // 5. Scroll Logic
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
    // 6. Product Tabs Logic (Home Page Only)
    // ---------------------------------------------------------
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
                if (targetContent) {
                    targetContent.classList.add('active');
                    targetContent.querySelectorAll('.product-card').forEach((card, index) => {
                        card.classList.remove('visible');
                        setTimeout(() => {
                            card.classList.add('visible');
                        }, 50 + (index * 100));
                    });
                }
            });
        });
    }

    // ---------------------------------------------------------
    // 7. Live Chat Widget Logic
    // ---------------------------------------------------------
    const chatFab = document.getElementById('chatFab');
    const chatWindow = document.getElementById('chatWindow');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatBody = document.getElementById('chatBody');

    function toggleChat() {
        if (!chatWindow) return;
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active') && chatInput) {
            setTimeout(() => chatInput.focus(), 300);
        }
    }

    if (chatFab && chatCloseBtn) {
        chatFab.addEventListener('click', toggleChat);
        chatCloseBtn.addEventListener('click', toggleChat);
    }

    function sendChatMessage() {
        if (!chatInput || !chatBody) return;
        const text = chatInput.value.trim();
        if (text === '') return;

        const userMsg = document.createElement('div');
        userMsg.className = 'message user-msg';
        userMsg.textContent = text;
        chatBody.appendChild(userMsg);

        chatInput.value = '';
        chatBody.scrollTop = chatBody.scrollHeight;

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

    // ---------------------------------------------------------
    // 8. Scroll Reveal Animation Logic
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
});

