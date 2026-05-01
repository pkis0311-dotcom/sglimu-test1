// Supabase client initialization (requires global supabase object from CDN)
const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';
const db = typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const supabaseClient = db; // Mapping for legacy code

/**
 * 전역 제품 로딩 함수
 * DB의 products 테이블에서 category 필드가 catId와 일치하는 상품을 가져옵니다.
 */
window.loadGlobalProducts = async function(catId) {
    const container = document.getElementById('productList');
    if (!container) return;

    container.innerHTML = '<div class="empty-state">데이터를 불러오는 중...</div>';

    try {
        if (!supabaseClient) throw new Error('Supabase client not initialized');

        // 찾을 후보군 목록 생성
        const candidates = [
            catId, 
            catId.replace(/-/g, '_'), 
            catId.replace(/_/g, '-')
        ];
        
        // 중복 제거
        const uniqueCandidates = [...new Set(candidates)];
        
        // 1. products 테이블의 category 컬럼에서 검색
        let { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .in('category', uniqueCandidates);

        if (error) throw error;

        // 2. 결과가 없으면 site_configs 매핑 확인 (display_ 접두사)
        if (!data || data.length === 0) {
            // site_configs에서 display_{catId} 또는 display_{다른 후보} 검색
            const configKeys = uniqueCandidates.map(c => 'display_' + c);
            
            const { data: configRows } = await supabaseClient
                .from('site_configs')
                .select('key, value')
                .in('key', configKeys);
            
            if (configRows && configRows.length > 0) {
                // 첫 번째로 발견된 유효한 매핑 상품 ID들을 가져옴
                const productIds = configRows[0].value;
                if (productIds && productIds.length > 0) {
                    const { data: mappedProducts, error: mapError } = await supabaseClient
                        .from('products')
                        .select('*')
                        .in('id', productIds);
                    
                    if (!mapError) data = mappedProducts;
                }
            }
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state">해당 카테고리에 상품이 없습니다.</div>';
            return;
        }

        container.innerHTML = '';
        data.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.cssText = "background:#fff; border-radius:15px; border:1px solid #eee; overflow:hidden; transition: transform 0.3s ease; cursor:pointer;";
            
            card.innerHTML = `
                <a href="product-detail.html?id=${p.id}" style="text-decoration:none; color:inherit;">
                    <div class="product-img-wrapper" style="height:250px; background:url('${p.image_url || 'assets/no-img.png'}') center/contain no-repeat #f9f9f9; border-bottom:1px solid #eee;"></div>
                    <div style="padding:20px;">
                        <h4 style="margin-bottom:10px; font-weight:600; font-size:1rem; color:#333;">${p.name}</h4>
                        <p style="font-weight:700; color:#3498db; font-size:1.1rem;">
                            ${p.price && p.price !== '전화문의' ? (typeof p.price === 'number' ? p.price.toLocaleString() + '원' : p.price) : '가격문의'}
                        </p>
                    </div>
                </a>
            `;
            
            card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-5px)');
            card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
            
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading products:', err);
        container.innerHTML = '<div class="empty-state" style="color:red;">데이터 로드 중 오류가 발생했습니다.</div>';
    }
};

window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (header) {
        header.classList.toggle('scrolled', window.scrollY > 50);
    }
    
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        scrollTopBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
    }
});

/**
 * 정적 GNB를 사용하므로 동적 렌더링은 비활성화하거나 로깅만 남깁니다.
 */
/**
 * 데이터베이스의 카테고리 정보를 조회하여 메뉴(GNB)를 동적으로 렌더링합니다.
 */
window.renderDynamicGnb = async function() {
    const gnbUl = document.querySelector('.gnb > ul');
    if (!gnbUl) return;

    try {
        if (!supabaseClient) throw new Error('Supabase client not initialized');

        // 1. 카테고리 데이터 가져오기
        const { data: categories, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;
        if (!categories || categories.length === 0) {
            console.log('No dynamic categories found. Using existing static menu.');
            return; 
        }

        // 2. 메뉴 구조 생성
        let gnbHtml = '';
        const majors = categories.filter(c => c.is_major);

        majors.forEach(m => {
            const subs = categories.filter(c => c.parent_id === m.id);
            
            if (subs.length > 0) {
                gnbHtml += `
                    <li class="has-submenu">
                        <a href="#">${m.name}</a>
                        <ul class="submenu">
                            ${subs.map(s => `<li><a href="${s.id}.html">${s.name}</a></li>`).join('')}
                        </ul>
                    </li>
                `;
            } else {
                // 하위 메뉴가 없는 경우 (예: 할인상품)
                gnbHtml += `<li><a href="${m.id}.html">${m.name}</a></li>`;
            }
        });

        // 3. GNB 업데이트
        gnbUl.innerHTML = gnbHtml;
        console.log('Dynamic GNB rendered successfully.');

    } catch (err) {
        console.error('Dynamic GNB rendering failed:', err);
        // 실패 시 기존 HTML에 하드코딩된 정적 메뉴가 유지되므로 추가 조치 불요
    }
};

/**
 * 카테고리 상세 페이지의 본문 탭(3단계 소분류)을 동적으로 렌더링합니다.
 */
window.renderCategoryTabs = async function() {
    const tabContainer = document.getElementById('dynamicTabContainer');
    if (!tabContainer) return; // 탭 컨테이너가 없는 페이지는 건너뜀

    // 1. 현재 페이지의 카테고리 ID 파악 (예: rfid.html -> rfid)
    const urlParts = window.location.pathname.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'index.html';
    const pageId = fileName.replace('.html', '') || 'rfid';

    try {
        if (!supabaseClient) throw new Error('Supabase client not initialized');

        // 2. 해당 페이지ID를 부모로 가진 3단계 소분류 가져오기
        const { data: tabs, error } = await supabaseClient
            .from('categories')
            .select('*')
            .eq('parent_id', pageId)
            .order('display_order', { ascending: true });

        if (error) throw error;
        if (!tabs || tabs.length === 0) {
            console.log('No dynamic tabs found for this category:', pageId);
            return;
        }

        // 3. 탭 HTML 생성
        let tabHtml = '<ul class="subcategory-nav">';
        tabs.forEach((tab, index) => {
            const isActive = index === 0 ? 'active' : '';
            tabHtml += `<li class="subcategory-item ${isActive}" onclick="loadGlobalProducts('${tab.id}'); setActiveTab(this)">${tab.name}</li>`;
        });
        tabHtml += '</ul>';

        tabContainer.innerHTML = tabHtml;
        console.log('Dynamic tabs rendered for:', pageId);
        
        // 4. 첫 번째 탭의 상품 로드
        if (tabs.length > 0 && typeof window.loadGlobalProducts === 'function') {
            window.loadGlobalProducts(tabs[0].id);
        }

    } catch (err) {
        console.error('Dynamic tabs rendering failed:', err);
    }
};

/**
 * 탭 클릭 시 활성화 스타일 변경
 */
window.setActiveTab = function(el) {
    const liList = el.parentElement.querySelectorAll('.subcategory-item');
    liList.forEach(li => li.classList.remove('active'));
    el.classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
    // 동적 GNB 실행
    window.renderDynamicGnb();
    
    // 카테고리 본문 탭 실행
    window.renderCategoryTabs();

    // 헤더 검색 기능
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    if (headerSearchBtn) {
        headerSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.querySelector('.search-input');
            if (input && input.value) {
                alert('"' + input.value + '" 검색 기능은 개발 중입니다.');
            }
        });
    }

    // 채팅 위젯
    const chatFab = document.getElementById('chatFab');
    const chatWindow = document.getElementById('chatWindow');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    
    if (chatFab && chatWindow && chatCloseBtn) {
        chatFab.onclick = () => chatWindow.style.display = 'flex';
        chatCloseBtn.onclick = () => chatWindow.style.display = 'none';
    }
});
