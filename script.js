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

document.addEventListener('DOMContentLoaded', () => {
    // GNB 대분류 및 중간분류 클릭 기반 토글 로직
    const gnbItems = document.querySelectorAll('.gnb li.has-submenu, .gnb li.has-nested');
    
    gnbItems.forEach(item => {
        const link = item.querySelector('a');
        if (!link) return;

        link.addEventListener('click', (e) => {
            // 하위 메뉴가 있는 경우에만 처리
            const hasSub = item.classList.contains('has-submenu') || item.classList.contains('has-nested');
            if (hasSub) {
                // 현재 메뉴가 닫혀있다면 열기 (페이지 이동 방지)
                if (!item.classList.contains('is-open')) {
                    e.preventDefault();
                    e.stopPropagation();

                    // 같은 레벨의 다른 메뉴 닫기
                    const siblings = item.parentElement.querySelectorAll(':scope > li');
                    siblings.forEach(sib => sib.classList.remove('is-open'));

                    item.classList.add('is-open');
                } 
                // 이미 열려있다면 링크대로 이동 (default behavior)
            }
        });
    });

    // 외부 클릭 시 메뉴 닫기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.gnb')) {
            gnbItems.forEach(item => item.classList.remove('is-open'));
        }
    });

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
    
    // 모바일 지원 등을 위한 추가 초기화 로직이 필요하면 여기에 작성
});
