// Supabase client initialization (requires global supabase object from CDN)
const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';
const db = typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const supabaseClient = db; // Mapping for legacy code

/**
 * 전역 제품 로딩 함수
 */
window.loadGlobalProducts = async function(catId) {
    const container = document.getElementById('productList');
    if (!container) return;

    container.innerHTML = '<div class="empty-state">데이터를 불러오는 중...</div>';

    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('category', catId);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state">해당 카테고리에 상품이 없습니다.</div>';
            return;
        }

        container.innerHTML = '';
        data.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.cssText = "background:#fff; border-radius:15px; border:1px solid #eee; overflow:hidden; transition: transform 0.3s ease;";
            
            card.innerHTML = `
                <a href="product-detail.html?id=${p.id}" style="text-decoration:none; color:inherit;">
                    <div class="product-img-wrapper" style="height:250px; background:url('${p.image_url}') center/contain no-repeat #f9f9f9; border-bottom:1px solid #eee;"></div>
                    <div style="padding:20px;">
                        <h4 style="margin-bottom:10px; font-weight:600; font-size:1rem; color:#333;">${p.name}</h4>
                        <p style="font-weight:700; color:var(--color-primary); font-size:1.1rem;">
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
    
    // Scroll to Top 버튼 노출 로직
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        scrollTopBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
    }
});

/**
 * 동적 GNB 렌더링 함수
 */
window.renderDynamicGnb = async function() {
    const gnbList = document.getElementById('gnbList');
    if (!gnbList) return;

    try {
        const { data: categories, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;

        const majors = categories.filter(c => c.is_major);
        let html = '';

        majors.forEach(m => {
            const subs = categories.filter(c => c.parent_id === m.id);
            if (subs.length > 0) {
                html += `
                    <li class="has-submenu">
                        <a href="category.html?code=${m.id}">${m.name}</a>
                        <ul class="submenu">
                            ${subs.map(s => `<li><a href="category.html?code=${s.id}">${s.name}</a></li>`).join('')}
                        </ul>
                    </li>
                `;
            } else {
                html += `<li><a href="category.html?code=${m.id}">${m.name}</a></li>`;
            }
        });
        
        // 할인상품 등 고정 메뉴가 필요한 경우 추가 가능
        // html += `<li><a href="discount.html">할인상품</a></li>`;

        gnbList.innerHTML = html;
    } catch (err) {
        console.error('Error rendering GNB:', err);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 동적 GNB 실행
    window.renderDynamicGnb();

    // 검색 버튼 전역 연동
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    if (headerSearchBtn) {
        headerSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.querySelector('.search-input');
            if (input && input.value) {
                alert('\"' + input.value + '\" 검색 기능은 개발 중입니다.');
            }
        });
    }

    // 채팅 관련 전역 로직
    const chatFab = document.getElementById('chatFab');
    const chatWindow = document.getElementById('chatWindow');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    
    if (chatFab && chatWindow && chatCloseBtn) {
        chatFab.onclick = () => chatWindow.style.display = 'flex';
        chatCloseBtn.onclick = () => chatWindow.style.display = 'none';
    }
});
