// admin.js - Integrated Admin Script
// [MIGRATION] Switched from ES Module to Global Script for local file support.

let db;

document.addEventListener('DOMContentLoaded', async () => {
    // 0. DOM 요소가 제대로 잡혔는지 확인 (불필요 모달 에러 방지)
    const loginOverlay = document.getElementById('loginOverlay');
    if (!loginOverlay) {
        console.error("Critical: UI elements not found!");
        return;
    }

    if (typeof supabase === 'undefined') {
        console.error("Supabase library is not loaded. Please check your internet connection and ensure the CDN script is included in admin.html.");
        alert("Supabase 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.");
        return;
    }

    const { createClient } = supabase;
    const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';

    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 로그인 초기화
    try {
        await checkSession();
    } catch (e) {
        console.error("Session check failed", e);
        if(loginOverlay) loginOverlay.style.display = 'flex';
    }
});

// ==========================================
// 사이트 통합 카테고리 정의 및 레거시 데이터 매핑
// ==========================================
const LEGACY_ID_MAP = {
    'access_7000': 'access-cat-0', 'access_8000': 'access-cat-1', 'access_2203': 'access-cat-2', 'access_2204': 'access-cat-3',
    'discount_items': 'discount-cat-0', 'sign_date': 'sign-date-cat-0', 'sign_custom': 'sign-custom-cat-0', 'sterilizer_parts': 'sterilizer-cat-0',
    'fomus_shelf': 'fomus-cat-0', 'fomus_table': 'fomus-cat-1', 'fomus_chair': 'fomus-cat-2', 'fomus_etc': 'fomus-cat-3',
    'fursys_shelf': 'fursys-cat-0', 'fursys_table': 'fursys-cat-1', 'fursys_chair': 'fursys-cat-2', 'fursys_etc': 'fursys-cat-3',
    'koas_table': 'koas-cat-1', 'koas_etc': 'koas-cat-3'
};

const SITE_CATEGORIES = {
    'system': {
        icon: 'fa-server', label: '도서관리시스템',
        subs: [
            { id: 'rfid_tag', name: 'RFID > 태그 (TAG)' }, { id: 'rfid_anti', name: 'RFID > 분실 방지기' }, { id: 'rfid_reader', name: 'RFID > 리더기' }, { id: 'rfid_return', name: 'RFID > 대출 반납기' },
            { id: 'em_anti', name: 'EM > 분실 방지기' }, { id: 'em_gen', name: 'EM > 감응제거재생기' }, { id: 'em_tape', name: 'EM > 감응 테이프' },
            { id: 'access_7000', name: '출입관리 > TNH-7000A' }, { id: 'access_8000', name: '출입관리 > TNH-8000A' }, { id: 'access_2203', name: '출입관리 > EZ-2203AWG' }, { id: 'access_2204', name: '출입관리 > EZ-2204AWG' }
        ]
    },
    'supplies': {
        icon: 'fa-box-open', label: '도서관 용품',
        subs: [
            { id: 'supplies_arrange_keeper', name: '정리 > 키퍼' }, { id: 'supplies_arrange_label_color', name: '정리 > 색띠라벨' }, { id: 'supplies_arrange_label_paper', name: '정리 > 라벨용지' }, { id: 'supplies_arrange_etc', name: '정리 > 기타' },
            { id: 'supplies_protect_filmo', name: '보호 > 필모시리즈' }, { id: 'supplies_protect_glue', name: '보호 > 중성풀' }, { id: 'supplies_protect_tape', name: '보호 > 양면테이프' }, { id: 'supplies_protect_bookcover', name: '보호 > 북커버' },
            { id: 'supplies_lend_barcode', name: '대출 > 바코드' }, { id: 'supplies_lend_equip', name: '대출 > 카드프린터/기기' }, { id: 'supplies_lend_card', name: '대출 > 회원증카드' }, { id: 'supplies_lend_thermal', name: '대출 > 감열지' },
            { id: 'sterilizer_parts', name: '책소독기 소모품' }
        ]
    },
    'furniture': {
        icon: 'fa-chair', label: '도서관 가구',
        subs: [
            { id: 'koas_shelf', name: '코아스 > 서가' }, { id: 'koas_table', name: '코아스 > 테이블' }, { id: 'koas_chair', name: '코아스 > 의자' }, { id: 'koas_etc', name: '코아스 > 기타' },
            { id: 'fomus_shelf', name: '포머스 > 서가' }, { id: 'fomus_table', name: '포머스 > 테이블' }, { id: 'fomus_chair', name: '포머스 > 의자' }, { id: 'fomus_etc', name: '포머스 > 기타' },
            { id: 'fursys_shelf', name: '퍼시스 > 서가' }, { id: 'fursys_table', name: '퍼시스 > 테이블' }, { id: 'fursys_chair', name: '퍼시스 > 의자' }, { id: 'fursys_etc', name: '퍼시스 > 기타' }
        ]
    },
    'signage': {
        icon: 'fa-scroll', label: '사인물',
        subs: [
            { id: 'sign_class', name: '분류/대분류 표지판' }, { id: 'sign_board', name: '게시판/이용안내' }, { id: 'sign_date', name: '대출반납일력표' }, { id: 'sign_custom', name: '제작 사인물' }, { id: 'best_product', name: '메인 베스트 상품' }
        ]
    },
    'discount': {
        icon: 'fa-tags', label: '할인상품',
        subs: [ { id: 'discount_items', name: '할인상품 전체' } ]
    }
};

// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const emailInput = document.getElementById('adminEmail');
const passInput = document.getElementById('adminPassword');
const loginMessage = document.getElementById('loginMessage');
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const productTableBody = document.getElementById('productTableBody');
const addProductBtn = document.getElementById('addProductBtn');

const productModal = document.getElementById('productModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveProductBtn = document.getElementById('saveProductBtn');
const saveMsg = document.getElementById('saveMsg');
const modalTitle = document.getElementById('modalTitle');

const bannerModalOverlay = document.getElementById('bannerModal');
const addBannerBtn = document.getElementById('addBannerBtn');
const closeBannerModalBtn = document.getElementById('closeBannerModalBtn');
const cancelBannerModalBtn = document.getElementById('cancelBannerModalBtn');
const saveBannerBtn = document.getElementById('saveBannerBtn');
const bannerTableBody = document.getElementById('bannerTableBody');

const productIdInput = document.getElementById('productId');
const productNameInput = document.getElementById('productName');
const productCategoryInput = document.getElementById('productCategory');
const productPriceInput = document.getElementById('productPrice');
const productStockInput = document.getElementById('productStock');
const productDescInput = document.getElementById('productDesc');
const productImageFile = document.getElementById('productImageFile');
const productImageUrlInput = document.getElementById('productImageUrl');
const productImagePreview = document.getElementById('productImagePreview');

const bannerIdInput = document.getElementById('bannerId');
const bannerTypeInput = document.getElementById('bannerType');
const bannerIsActiveInput = document.getElementById('bannerIsActive');
const bannerLinkUrlInput = document.getElementById('bannerLinkUrl');
const bannerDisplayOrderInput = document.getElementById('bannerDisplayOrder');
const bannerImageFile = document.getElementById('bannerImageFile');
const bannerImageUrl = document.getElementById('bannerImageUrl');
const bannerImagePreview = document.getElementById('bannerImagePreview');
const saveBannerMsg = document.getElementById('saveBannerMsg');

let globalProducts = [];

// ==========================================
// 1. 로그인 및 세션 관리
// ==========================================
async function checkSession() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        if(loginOverlay) loginOverlay.style.display = 'none';
        initDashboard();
    } else {
        if(loginOverlay) loginOverlay.style.display = 'flex';
    }
}

if(loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passInput.value;
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) { loginMessage.textContent = '로그인 실패: ' + error.message; } else { checkSession(); }
    });
}
if(logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await db.auth.signOut();
        checkSession();
    });
}

// ==========================================
// 2. 탭 전환 로직
// ==========================================
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === target);
        });

        if (target === 'tab-products') fetchProducts();
        if (target === 'tab-orders') { 
            if(window.orderChart) window.orderChart.destroy();
            fetchOrderStats();
        }
        if (target === 'tab-inquiries') fetchInquiries();
        if (target === 'tab-banners') fetchBanners();
        if (target === 'tab-users') fetchUsers();
        if (target === 'tab-page-manage') initPageManageTab();
        if (target === 'tab-category-display') initCategoryDisplayTab();
    });
});
